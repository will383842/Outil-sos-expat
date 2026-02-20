/**
 * deploy-by-batch.js
 * Déploie les Firebase Functions par lots avec gestion de quota par région.
 *
 * Quota Cloud Run CPU (observé en pratique) :
 *   europe-west1 / europe-west2 : batch 5 OK
 *   europe-west3 : batch 1 requis (quota plus serré)
 *
 * Usage : node deploy-by-batch.js
 */

const { execFileSync } = require('child_process');
const FIREBASE_DIR = '/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase';
const PROJECT = 'sos-urgently-ac307';

// Taille de lot par région (déterminée empiriquement)
const BATCH_SIZE_BY_REGION = {
  'europe-west1': 10,
  'europe-west2': 10,
  'europe-west3': 3,   // testé OK: 3✅ 4❌ (quota error récurrent 2026-02-19)
};
const DEFAULT_BATCH_SIZE = 5;

// Délai entre lots (en ms) par région
const DELAY_BY_REGION = {
  'europe-west1': 10 * 1000,   // 10s
  'europe-west2': 10 * 1000,   // 10s
  'europe-west3': 30 * 1000,   // 30s
};
const DEFAULT_DELAY = 15 * 1000;

// Délai supplémentaire après une erreur quota avant de retenter
const QUOTA_ERROR_WAIT_MS = 2 * 60 * 1000; // 2 minutes
const MAX_RETRIES_ON_QUOTA = 2;

function bash(cmd, timeout = 600000) {
  const BASH = 'C:/Program Files/Git/bin/bash.exe';
  return execFileSync(BASH, ['-c', cmd], {
    stdio: 'pipe',
    timeout,
    maxBuffer: 50 * 1024 * 1024,
  }).toString();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// === 1. Récupérer la liste des fonctions déployées ===
log('Récupération de la liste des fonctions...');
const raw = bash(`cd ${FIREBASE_DIR} && firebase functions:list --project ${PROJECT} --json 2>/dev/null`);
const parsed = JSON.parse(raw);
const functions = parsed.result || parsed;

log(`Total fonctions détectées : ${functions.length}`);

// === 2. Grouper par région ===
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

// === 3. Ordre de déploiement : west3 → west2 → west1 ===
// Filtre optionnel via arg CLI : node deploy-by-batch.js west1 west2
const regionFilter = process.argv.slice(2);
const regionOrder = ['europe-west3', 'europe-west2', 'europe-west1'];
const orderedRegions = [
  ...regionOrder.filter(r => byRegion[r]),
  ...Object.keys(byRegion).filter(r => !regionOrder.includes(r)),
].filter(r => regionFilter.length === 0 || regionFilter.some(f => r.includes(f)));

// === 4. Déployer région par région ===
async function deployRegion(region, fns) {
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
    // Copie mutable du lot courant (on peut retirer les fonctions supprimées)
    let activeBatch = [...batches[i]];
    const preview = activeBatch.slice(0, 3).join(', ') + (activeBatch.length > 3 ? `...+${activeBatch.length - 3}` : '');

    log(`\n  LOT ${i + 1}/${batches.length} [${region}] : ${preview}`);

    let attempts = 0;
    let deployed = false;

    while (attempts <= MAX_RETRIES_ON_QUOTA && !deployed && activeBatch.length > 0) {
      if (attempts > 0) {
        log(`  ↻ Retry ${attempts}/${MAX_RETRIES_ON_QUOTA} après erreur quota (attente ${QUOTA_ERROR_WAIT_MS / 1000}s)...`);
        await sleep(QUOTA_ERROR_WAIT_MS);
      }

      const onlyArg = activeBatch.map(fn => `functions:${fn}`).join(',');
      const cmd = `cd ${FIREBASE_DIR} && firebase deploy --only "${onlyArg}" --project ${PROJECT} --force 2>&1`;

      try {
        const output = bash(cmd, 600000);
        const successCount = (output.match(/Successful update operation/g) || []).length;
        const quotaErrors = (output.match(/Quota exceeded/g) || []).length;

        if (quotaErrors > 0 && successCount < activeBatch.length) {
          log(`  ⚠️  ${successCount}/${activeBatch.length} succès, ${quotaErrors} quota errors`);
          regionFailed += (activeBatch.length - successCount);
          regionSuccess += successCount;
          deployed = true; // on continue quand même
        } else {
          log(`  ✅ ${successCount}/${activeBatch.length} déployées`);
          regionSuccess += successCount;
          deployed = true;
        }
      } catch (err) {
        const msg = (err.stdout || err.stderr || err.message || '').toString();
        const quotaErrors = (msg.match(/Quota exceeded/g) || []).length;
        const successCount = (msg.match(/Successful update operation/g) || []).length;

        regionSuccess += successCount;

        // Cas 1 : erreur quota → retry
        if (quotaErrors > 0) {
          log(`  ⚠️  Quota error (${successCount} succès, ${quotaErrors} quota errors)`);
          if (attempts < MAX_RETRIES_ON_QUOTA) {
            attempts++;
            continue;
          } else {
            log(`  ❌ Max retries atteint — on continue avec le lot suivant`);
            regionFailed += (activeBatch.length - successCount);
            deployed = true;
          }

        // Cas 2 : "No function matches" → fonctions supprimées du code → les ignorer et réessayer sans elles
        } else if (msg.includes('No function matches the filter')) {
          const noMatchRe = /No function matches the filter: [^:]+:(\S+)/g;
          const deleted = [...msg.matchAll(noMatchRe)].map(m => m[1]);
          if (deleted.length > 0) {
            log(`  ⏭  Fonctions obsolètes ignorées (${deleted.length}) : ${deleted.join(', ')}`);
            regionSkipped += deleted.length;
            activeBatch = activeBatch.filter(fn => !deleted.includes(fn));
            // On retry sans ces fonctions (ne pas incrémenter attempts)
            continue;
          } else {
            log(`  ❌ Erreur "No function matches" non parseable : ${msg.slice(0, 300)}`);
            regionFailed += (activeBatch.length - successCount);
            deployed = true;
          }

        // Cas 3 : autre erreur
        } else {
          log(`  ❌ Erreur : ${msg.slice(0, 300)}`);
          regionFailed += (activeBatch.length - successCount);
          deployed = true;
        }
      }
      attempts++;
    }

    if (activeBatch.length === 0) {
      log(`  ⏭  Lot vide après suppression des fonctions obsolètes — ignoré`);
    }

    // Pause entre lots (sauf dernier)
    if (i < batches.length - 1) {
      log(`  ⏳ Pause ${delay / 1000}s...`);
      await sleep(delay);
    }
  }

  log(`\n  ${region} terminé : ✅ ${regionSuccess} succès, ❌ ${regionFailed} échecs, ⏭ ${regionSkipped} ignorées`);
  return { regionSuccess, regionFailed, regionSkipped };
}

async function deployAll() {
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const startTime = Date.now();

  for (const region of orderedRegions) {
    const fns = byRegion[region];
    const { regionSuccess, regionFailed, regionSkipped } = await deployRegion(region, fns);
    totalSuccess += regionSuccess;
    totalFailed += regionFailed;
    totalSkipped += regionSkipped;

    // Pause entre régions
    if (region !== orderedRegions[orderedRegions.length - 1]) {
      log(`\n⏸  Pause 30s entre régions...`);
      await sleep(30 * 1000);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 60000);
  log(`\n${'═'.repeat(60)}`);
  log(`DÉPLOIEMENT TERMINÉ en ${elapsed} minutes`);
  log(`✅ Succès  : ${totalSuccess} / ${totalSuccess + totalFailed}`);
  log(`❌ Échecs  : ${totalFailed}`);
  log(`⏭  Ignorées : ${totalSkipped} (fonctions supprimées du code)`);
  log(`${'═'.repeat(60)}`);
}

deployAll().catch(err => {
  console.error('ERREUR FATALE:', err);
  process.exit(1);
});
