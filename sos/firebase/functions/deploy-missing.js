/**
 * deploy-missing.js
 * Déploie les fonctions Firebase qui existent dans firebase functions:list
 * mais pas encore en Cloud Run (batch=1, une par une).
 *
 * Usage: node deploy-missing.js [west1|west2|west3]
 */

const { execFileSync } = require('child_process');
const FIREBASE_DIR = '/c/Users/willi/Documents/Projets/VS_CODE/sos-expat-project/sos/firebase';
const PROJECT = 'sos-urgently-ac307';
const BASH = 'C:/Program Files/Git/bin/bash.exe';

const DELAY_BETWEEN_DEPLOYS_MS = 20 * 1000; // 20s entre chaque fonction
const DEPLOY_TIMEOUT_MS = 900000; // 15 min max par fonction

function bash(cmd, timeout = DEPLOY_TIMEOUT_MS) {
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

// Fonctions manquantes identifiées le 2026-02-20
const MISSING_FUNCTIONS = {
  'europe-west1': [
    'acknowledgeAlert',
    'adminAcknowledgeDispute',
    'adminAddDisputeNote',
    'adminAssignDispute',
    'adminCancelSubscription',
    'adminChangePlan',
    'adminCheckRestoreStatus',
    'adminCreateManualBackup',
    'adminDeleteBackup',
    'adminForceAiAccess',
    'adminForceRetryDLQEvent',
    'adminGetDisputeDetails',
    'adminGetDLQStats',
    'adminGetProviderSubscriptionHistory',
    'adminGetSubscriptionStats',
    'adminListBackups',
    'adminListGcpBackups',
    'adminPreviewRestore',
    'adminResetQuota',
    'adminRestoreAuth',
    'adminRestoreFirestore',
    'adminSyncStripePrices',
    'cancelSubscription',
    'checkAiAccess',
    'checkAndIncrementAiUsage',
    'checkLowProviderAvailability',
    'configureStorageLifecycle',
    'createAnnualStripePrices',
    'createMonthlyStripePrices',
    'deleteBackup',
    'enableStorageVersioning',
    'exportCollectionToJson',
    'generateEncryptionKey',
    'getActiveAlerts',
    'getCostMetrics',
    'getEncryptionStatus',
    'getFunctionalAlerts',
    'getFunctionalHealthSummary',
    'getMyDataAccessHistory',
    'getPaymentAlerts',
    'getPaymentMetrics',
    'getProviderAvailabilityStats',
    'getSecretsRestoreGuide',
    'getStorageConfig',
    'getSubscriptionDetails',
    'getSystemHealthSummary',
    'getUserAuditTrail',
    'importCollectionFromBackup',
    'importCollectionFromJson',
    'incrementAiUsage',
    'listAuthBackups',
    'listAvailableBackups',
    'listDRReports',
    'listGDPRRequests',
    'listRestorableAuthBackups',
    'listRestoreTestReports',
    'listSecretsAudits',
    'logConnectionV1',
    'migratePhoneEncryption',
    'onSubscriptionPlanPricingUpdate',
    'onUserDeletedConnectionLog',
    'onUserSignIn',
    'processGDPRRequest',
    'reactivateSubscription',
    'requestAccountDeletion',
    'requestDataExport',
    'resolveFunctionalAlert',
    'resolvePaymentAlert',
    'restoreCollectionDocuments',
    'restoreFirebaseAuth',
    'restoreFromBackup',
    'restoreSingleUser',
    'runDRTestManual',
    'runRestoreTestManual',
    'subscriptionCancel',
    'subscriptionCheckQuota',
    'subscriptionCreate',
    'subscriptionInitializePlans',
    'subscriptionMigrateTo9Languages',
    'subscriptionPortal',
    'subscriptionReactivate',
    'subscriptionRecordCall',
    'subscriptionSetFreeAccess',
    'subscriptionUpdate',
    'syncSubscriptionPlansToStripe',
    'triggerAuthBackup',
    'triggerFunctionalCheck',
    'triggerSecretsAudit',
    'updateConsentPreferences',
    'validateAuthBackup',
    'verifyCollectionIntegrity',
  ],
  'europe-west2': [
    'adminGetBloggerConfigHistory',
    'adminGetChatterConfigHistory',
    'adminGetGroupAdminConfigHistory',
    'getGroupAdminRecruits',
  ],
  'europe-west3': [
    'sendChatterDripMessages',
  ],
};

async function deployAll() {
  const regionFilter = process.argv.slice(2);
  const regionOrder = ['europe-west3', 'europe-west2', 'europe-west1'];

  let totalSuccess = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  for (const region of regionOrder) {
    const fns = MISSING_FUNCTIONS[region];
    if (!fns || fns.length === 0) continue;
    if (regionFilter.length > 0 && !regionFilter.some(f => region.includes(f))) continue;

    log(`\n${'═'.repeat(60)}`);
    log(`RÉGION ${region} : ${fns.length} fonctions manquantes (batch=1)`);
    log(`${'═'.repeat(60)}`);

    let regionSuccess = 0;
    let regionFailed = 0;

    for (let i = 0; i < fns.length; i++) {
      const fn = fns[i];
      log(`\n  [${i + 1}/${fns.length}] ${fn}`);

      const cmd = `cd ${FIREBASE_DIR} && firebase deploy --only "functions:${fn}" --project ${PROJECT} --force 2>&1`;

      try {
        const output = bash(cmd);
        const success = output.includes('Successful update operation') || output.includes('Successful create operation');
        const quotaError = output.includes('Quota exceeded');

        if (success) {
          log(`  ✅ Déployée`);
          regionSuccess++;
        } else if (quotaError) {
          log(`  ⚠️  Quota exceeded — pause 2 min puis retry...`);
          await sleep(2 * 60 * 1000);

          try {
            const output2 = bash(cmd);
            if (output2.includes('Successful') ) {
              log(`  ✅ Déployée (retry)`);
              regionSuccess++;
            } else {
              log(`  ❌ Échec après retry: ${output2.slice(-300)}`);
              regionFailed++;
            }
          } catch (retryErr) {
            log(`  ❌ Échec retry: ${(retryErr.message || '').slice(0, 300)}`);
            regionFailed++;
          }
        } else {
          log(`  ❌ Échec: ${output.slice(-500)}`);
          regionFailed++;
        }
      } catch (err) {
        const msg = (err.stdout || err.stderr || err.message || '').toString();
        if (msg.includes('Quota exceeded')) {
          log(`  ⚠️  Quota exceeded — pause 2 min puis retry...`);
          await sleep(2 * 60 * 1000);
          try {
            const output2 = bash(cmd);
            if (output2.includes('Successful')) {
              log(`  ✅ Déployée (retry)`);
              regionSuccess++;
            } else {
              log(`  ❌ Échec après retry`);
              regionFailed++;
            }
          } catch (retryErr) {
            log(`  ❌ Échec retry: ${(retryErr.message || '').slice(0, 300)}`);
            regionFailed++;
          }
        } else if (msg.includes('No function matches')) {
          log(`  ⏭  Fonction non trouvée dans le code — ignorée`);
        } else if (msg.includes('ETIMEDOUT') || msg.includes('SPAWNKILL')) {
          log(`  ❌ Timeout — pause 1 min...`);
          regionFailed++;
          await sleep(60 * 1000);
        } else {
          log(`  ❌ Erreur: ${msg.slice(-500)}`);
          regionFailed++;
        }
      }

      // Pause entre fonctions (sauf dernière)
      if (i < fns.length - 1) {
        log(`  ⏳ Pause ${DELAY_BETWEEN_DEPLOYS_MS / 1000}s...`);
        await sleep(DELAY_BETWEEN_DEPLOYS_MS);
      }
    }

    log(`\n  ${region} terminé : ✅ ${regionSuccess} succès, ❌ ${regionFailed} échecs`);
    totalSuccess += regionSuccess;
    totalFailed += regionFailed;
  }

  const elapsed = Math.round((Date.now() - startTime) / 60000);
  log(`\n${'═'.repeat(60)}`);
  log(`DÉPLOIEMENT TERMINÉ en ${elapsed} minutes`);
  log(`✅ Succès : ${totalSuccess} / ${totalSuccess + totalFailed}`);
  log(`❌ Échecs : ${totalFailed}`);
  log(`${'═'.repeat(60)}`);
}

deployAll().catch(err => {
  console.error('ERREUR FATALE:', err);
  process.exit(1);
});
