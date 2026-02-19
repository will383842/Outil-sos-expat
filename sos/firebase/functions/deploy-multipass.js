/**
 * deploy-multipass.js
 * Déploie TOUTES les Firebase Functions en plusieurs passes avec délais.
 * Chaque passe déploie les fonctions manquées par la passe précédente (quota libéré).
 * Usage : node deploy-multipass.js
 */

const { execFileSync } = require('child_process');
const BASH = 'C:/Program Files/Git/bin/bash.exe';
const FIREBASE_DIR = '/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase';
const PROJECT = 'sos-urgently-ac307';
const NB_PASSES = 4;
const DELAY_BETWEEN_PASSES_MS = 12 * 60 * 1000; // 12 minutes

function bash(cmd, timeout = 600000) {
  return execFileSync(BASH, ['-c', cmd], {
    stdio: 'pipe',
    timeout,
    maxBuffer: 50 * 1024 * 1024
  }).toString();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function countInOutput(output, keyword) {
  return (output.match(new RegExp(keyword, 'g')) || []).length;
}

async function deployAll() {
  log('=== DÉPLOIEMENT MULTI-PASSES ===');
  log(`${NB_PASSES} passes × ${DELAY_BETWEEN_PASSES_MS / 60000} min de pause`);
  log('');

  let totalSuccess = 0;
  let totalQuotaErrors = 0;

  for (let pass = 1; pass <= NB_PASSES; pass++) {
    log(`\n╔══════════════════════════════╗`);
    log(`║   PASSE ${pass}/${NB_PASSES} — DÉPLOIEMENT COMPLET   ║`);
    log(`╚══════════════════════════════╝`);

    const cmd = `cd ${FIREBASE_DIR} && FUNCTIONS_DISCOVERY_TIMEOUT=60 firebase deploy --only functions --project ${PROJECT} --force 2>&1`;

    try {
      const output = bash(cmd, 30 * 60 * 1000); // 30 min max par passe

      const success = countInOutput(output, 'Successful');
      const quota = countInOutput(output, 'Quota exceeded');
      const created = countInOutput(output, 'creating Node');
      const updated = countInOutput(output, 'updating Node');

      totalSuccess += success;
      totalQuotaErrors += quota;

      log(`✅ Passe ${pass} terminée :`);
      log(`   - Créées  : ${created}`);
      log(`   - Mises à jour : ${updated}`);
      log(`   - Succès total : ${success}`);
      log(`   - Erreurs quota : ${quota}`);

      if (quota === 0) {
        log(`🎉 Aucune erreur quota ! Déploiement complet.`);
        break;
      }

    } catch (err) {
      const output = (err.stdout || Buffer.alloc(0)).toString();
      const success = countInOutput(output, 'Successful');
      const quota = countInOutput(output, 'Quota exceeded');
      const created = countInOutput(output, 'creating Node');
      const updated = countInOutput(output, 'updating Node');

      totalSuccess += success;
      totalQuotaErrors += quota;

      log(`⚠️  Passe ${pass} avec erreurs :`);
      log(`   - Créées  : ${created}`);
      log(`   - Mises à jour : ${updated}`);
      log(`   - Succès : ${success}`);
      log(`   - Erreurs quota : ${quota}`);
      log(`   - Message : ${err.message.slice(0, 150)}`);
    }

    if (pass < NB_PASSES) {
      log(`\n⏳ Pause ${DELAY_BETWEEN_PASSES_MS / 60000} min avant passe ${pass + 1}...`);
      await sleep(DELAY_BETWEEN_PASSES_MS);
    }
  }

  log(`\n╔══════════════════════════════╗`);
  log(`║        RÉSULTAT FINAL        ║`);
  log(`╚══════════════════════════════╝`);
  log(`✅ Total succès cumulés  : ${totalSuccess}`);
  log(`❌ Total erreurs quota   : ${totalQuotaErrors}`);
  if (totalQuotaErrors > 0) {
    log(`💡 Des erreurs quota persistent → augmenter quota GCP`);
  } else {
    log(`🎉 TOUTES LES FONCTIONS DÉPLOYÉES !`);
  }
}

deployAll().catch(err => {
  console.error('ERREUR FATALE:', err.message);
  process.exit(1);
});
