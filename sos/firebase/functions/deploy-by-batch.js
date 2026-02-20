/**
 * deploy-by-batch.js
 * Déploie les Firebase Functions par lots avec gestion de quota par région.
 * Utilise spawn (async) pour éviter les hangs de execSync sur Windows.
 *
 * Usage : node deploy-by-batch.js [west1] [west2] [west3]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FIREBASE_DIR = path.resolve(__dirname, '..');
const PROJECT = 'sos-urgently-ac307';
// Si un filtre de région est passé en arg, utiliser un log dédié
const regionArg = process.argv.slice(2).join('-') || 'all';
const LOG_FILE = path.join(__dirname, `deploy-${regionArg}.log`);

// Taille de lot par région
const BATCH_SIZE_BY_REGION = {
  'europe-west1': 5,
  'europe-west2': 3,     // réduit à 3 pour éviter quota exceeded
  'europe-west3': 3,
};
const DEFAULT_BATCH_SIZE = 3;

// Délai entre lots (en ms) par région
const DELAY_BY_REGION = {
  'europe-west1': 15_000,
  'europe-west2': 60_000,  // 60s repos pour west2
  'europe-west3': 30_000,
};
const DEFAULT_DELAY = 15_000;

const QUOTA_ERROR_WAIT_MS = 2 * 60_000;
const MAX_RETRIES_ON_QUOTA = 10;  // retry jusqu'à complétion
const DEPLOY_TIMEOUT_MS = 15 * 60_000; // 15 min par lot

// Chemin vers firebase-tools
const FIREBASE_CLI = path.join(
  process.env.APPDATA || '',
  'npm/node_modules/firebase-tools/lib/bin/firebase.js'
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  const now = new Date();
  const ts = now.toLocaleTimeString('fr-FR', { hour12: false });
  const line = `[${ts}] ${msg}`;
  // N'écrire QUE dans le fichier log — stdout bloque quand le pipe est plein en background
  fs.appendFileSync(LOG_FILE, line + '\n');
}

/** Run a command with spawn + timeout, returns stdout as string */
function runAsync(args, timeout = DEPLOY_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    const child = spawn(process.execPath, args, {
      cwd: FIREBASE_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
      // On Windows, also try taskkill to kill the process tree
      try {
        spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { windowsHide: true });
      } catch (_) { /* ignore */ }
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        reject(new Error(`TIMEOUT after ${timeout / 1000}s`));
      } else if (code !== 0) {
        const err = new Error(`Exit code ${code}`);
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      } else {
        resolve(stdout);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function firebaseList() {
  const output = await runAsync(
    [FIREBASE_CLI, 'functions:list', '--project', PROJECT, '--json'],
    120_000
  );
  const parsed = JSON.parse(output);
  return parsed.result || parsed;
}

async function firebaseDeploy(functionNames) {
  const onlyArg = functionNames.map(fn => `functions:${fn}`).join(',');
  return runAsync(
    [FIREBASE_CLI, 'deploy', '--only', onlyArg, '--project', PROJECT, '--force'],
    DEPLOY_TIMEOUT_MS
  );
}

// === MAIN ===
async function main() {
  fs.writeFileSync(LOG_FILE, '');

  log('Récupération de la liste des fonctions...');
  const functions = await firebaseList();
  log(`Total fonctions détectées : ${functions.length}`);

  // Grouper par région
  const byRegion = {};
  for (const fn of functions) {
    const region = fn.region || 'europe-west1';
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(fn.id);
  }

  for (const [region, fns] of Object.entries(byRegion)) {
    const batchSize = BATCH_SIZE_BY_REGION[region] || DEFAULT_BATCH_SIZE;
    log(`  ${region} : ${fns.length} fonctions (batch=${batchSize})`);
  }

  // Ordre de déploiement : west3 → west2 → west1
  const regionFilter = process.argv.slice(2);
  const regionOrder = ['europe-west3', 'europe-west2', 'europe-west1'];
  const orderedRegions = [
    ...regionOrder.filter(r => byRegion[r]),
    ...Object.keys(byRegion).filter(r => !regionOrder.includes(r)),
  ].filter(r => regionFilter.length === 0 || regionFilter.some(f => r.includes(f)));

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const startTime = Date.now();

  for (const region of orderedRegions) {
    const fns = byRegion[region];
    const batchSize = BATCH_SIZE_BY_REGION[region] || DEFAULT_BATCH_SIZE;
    const delay = DELAY_BY_REGION[region] || DEFAULT_DELAY;

    const batches = [];
    for (let i = 0; i < fns.length; i += batchSize) {
      batches.push(fns.slice(i, i + batchSize));
    }

    log(`\n${'═'.repeat(60)}`);
    log(`RÉGION ${region} : ${fns.length} fonctions → ${batches.length} lots de ${batchSize}`);
    log(`${'═'.repeat(60)}`);

    let regionSuccess = 0;
    let regionFailed = 0;
    let regionSkipped = 0;

    for (let i = 0; i < batches.length; i++) {
      let activeBatch = [...batches[i]];
      const preview = activeBatch.join(', ');
      log(`\n  LOT ${i + 1}/${batches.length} [${region}] : ${preview}`);

      let attempts = 0;
      let deployed = false;

      while (attempts <= MAX_RETRIES_ON_QUOTA && !deployed && activeBatch.length > 0) {
        if (attempts > 0) {
          log(`  ↻ Retry ${attempts}/${MAX_RETRIES_ON_QUOTA} (attente ${QUOTA_ERROR_WAIT_MS / 1000}s)...`);
          await sleep(QUOTA_ERROR_WAIT_MS);
        }

        let output = '';
        let failed = false;
        try {
          output = await firebaseDeploy(activeBatch);
        } catch (err) {
          output = (err.stdout || '') + (err.stderr || '') + (err.message || '');
          failed = true;
        }

        const successCount = (output.match(/Successful update operation/g) || []).length;
        const isQuota = /quota exceeded/i.test(output);
        const isTimeout = /TIMEOUT/i.test(output);
        const isNoMatch = output.includes('No function matches the filter');

        regionSuccess += successCount;

        if (successCount === activeBatch.length) {
          // Tout a réussi
          log(`  ✅ ${successCount}/${activeBatch.length} déployées`);
          deployed = true;

        } else if (isTimeout) {
          log(`  ⏱  Timeout (${successCount}/${activeBatch.length} ok)`);
          if (attempts < MAX_RETRIES_ON_QUOTA) {
            attempts++;
            continue;
          }
          log(`  ❌ Max retries timeout — on continue`);
          regionFailed += (activeBatch.length - successCount);
          deployed = true;

        } else if (isQuota) {
          log(`  ⚠️  Quota (${successCount}/${activeBatch.length} ok)`);
          if (attempts < MAX_RETRIES_ON_QUOTA) {
            attempts++;
            continue;
          }
          log(`  ❌ Max retries quota — on continue`);
          regionFailed += (activeBatch.length - successCount);
          deployed = true;

        } else if (isNoMatch) {
          const noMatchRe = /No function matches the filter: [^:]+:(\S+)/g;
          const deleted = [...output.matchAll(noMatchRe)].map(m => m[1]);
          if (deleted.length > 0) {
            log(`  ⏭  Obsolètes ignorées (${deleted.length}) : ${deleted.join(', ')}`);
            regionSkipped += deleted.length;
            activeBatch = activeBatch.filter(fn => !deleted.includes(fn));
            continue;
          }
          regionFailed += (activeBatch.length - successCount);
          deployed = true;

        } else if (failed && successCount < activeBatch.length) {
          // Autre erreur — retry
          log(`  ❌ Erreur (${successCount}/${activeBatch.length} ok) — retry...`);
          if (attempts < MAX_RETRIES_ON_QUOTA) {
            attempts++;
            continue;
          }
          log(`  ❌ Max retries — on continue`);
          regionFailed += (activeBatch.length - successCount);
          deployed = true;

        } else {
          log(`  ✅ ${successCount}/${activeBatch.length} déployées`);
          deployed = true;
        }
        attempts++;
      }

      if (activeBatch.length === 0) {
        log(`  ⏭  Lot vide (fonctions obsolètes) — ignoré`);
      }

      if (i < batches.length - 1) {
        log(`  ⏳ Pause ${delay / 1000}s...`);
        await sleep(delay);
      }
    }

    log(`\n  ${region} : ✅ ${regionSuccess} ok, ❌ ${regionFailed} err, ⏭ ${regionSkipped} skip`);
    totalSuccess += regionSuccess;
    totalFailed += regionFailed;
    totalSkipped += regionSkipped;

    if (region !== orderedRegions[orderedRegions.length - 1]) {
      log(`\n⏸  Pause 30s entre régions...`);
      await sleep(30_000);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 60_000);
  log(`\n${'═'.repeat(60)}`);
  log(`DÉPLOIEMENT TERMINÉ en ${elapsed} minutes`);
  log(`✅ Succès  : ${totalSuccess} / ${totalSuccess + totalFailed}`);
  log(`❌ Échecs  : ${totalFailed}`);
  log(`⏭  Ignorées : ${totalSkipped}`);
  log(`${'═'.repeat(60)}`);
}

main().catch(err => {
  log(`ERREUR FATALE: ${err.message}`);
  process.exit(1);
});
