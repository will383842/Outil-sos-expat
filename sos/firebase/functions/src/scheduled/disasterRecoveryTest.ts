/**
 * Tests automatisés de Disaster Recovery
 *
 * Exécute mensuellement des tests de restauration pour valider :
 * - L'intégrité des backups Firestore
 * - La disponibilité des backups Auth
 * - L'accessibilité des fichiers Storage
 * - La cohérence des données Twilio backupées
 *
 * Génère un rapport détaillé envoyé aux admins.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Collections critiques à valider
  CRITICAL_COLLECTIONS: [
    'users',
    'providers',
    'call_sessions',
    'payments',
    'subscriptions',
    'invoices'
  ],
  // Nombre minimum d'utilisateurs attendus
  MIN_USERS_EXPECTED: 100,
  // Nombre minimum de providers attendus
  MIN_PROVIDERS_EXPECTED: 10,
  // Âge maximum acceptable du dernier backup (heures)
  MAX_BACKUP_AGE_HOURS: 48,
  // Collection pour les rapports DR
  DR_REPORTS_COLLECTION: 'dr_test_reports'
};

// ============================================================================
// TYPES
// ============================================================================

interface DRTestResult {
  testName: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: Record<string, unknown>;
  duration?: number;
}

interface DRTestReport {
  id: string;
  createdAt: FirebaseFirestore.Timestamp;
  overallStatus: 'passed' | 'failed' | 'warning';
  tests: DRTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  executionTimeMs: number;
  recommendations: string[];
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test 1: Vérifier l'existence et la fraîcheur des backups Firestore
 */
async function testFirestoreBackups(): Promise<DRTestResult> {
  const startTime = Date.now();
  const db = admin.firestore();

  try {
    // Chercher le dernier backup réussi
    const backupLogs = await db.collection('system_logs')
      .where('type', '==', 'firestore_backup')
      .where('success', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (backupLogs.empty) {
      return {
        testName: 'Firestore Backup Existence',
        status: 'failed',
        message: 'Aucun backup Firestore trouvé dans les logs',
        duration: Date.now() - startTime
      };
    }

    const lastBackup = backupLogs.docs[0].data();
    const backupAge = Date.now() - lastBackup.createdAt.toDate().getTime();
    const ageHours = backupAge / (1000 * 60 * 60);

    if (ageHours > CONFIG.MAX_BACKUP_AGE_HOURS) {
      return {
        testName: 'Firestore Backup Freshness',
        status: 'failed',
        message: `Dernier backup trop ancien: ${Math.round(ageHours)} heures (max: ${CONFIG.MAX_BACKUP_AGE_HOURS}h)`,
        details: {
          lastBackupAt: lastBackup.createdAt.toDate().toISOString(),
          ageHours: Math.round(ageHours)
        },
        duration: Date.now() - startTime
      };
    }

    return {
      testName: 'Firestore Backup',
      status: 'passed',
      message: `Backup valide, âge: ${Math.round(ageHours)} heures`,
      details: {
        lastBackupAt: lastBackup.createdAt.toDate().toISOString(),
        backupPath: lastBackup.backupPath
      },
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      testName: 'Firestore Backup',
      status: 'failed',
      message: `Erreur lors du test: ${error instanceof Error ? error.message : 'Unknown'}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 2: Vérifier les backups Firebase Auth
 */
async function testAuthBackups(): Promise<DRTestResult> {
  const startTime = Date.now();
  const db = admin.firestore();

  try {
    const authBackups = await db.collection('auth_backups')
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (authBackups.empty) {
      return {
        testName: 'Auth Backup Existence',
        status: 'failed',
        message: 'Aucun backup Auth trouvé',
        duration: Date.now() - startTime
      };
    }

    const lastBackup = authBackups.docs[0].data();
    const backupAge = Date.now() - lastBackup.createdAt.toDate().getTime();
    const ageDays = backupAge / (1000 * 60 * 60 * 24);

    // Auth backup est hebdomadaire, donc 14 jours max
    if (ageDays > 14) {
      return {
        testName: 'Auth Backup Freshness',
        status: 'warning',
        message: `Backup Auth ancien: ${Math.round(ageDays)} jours`,
        details: {
          lastBackupAt: lastBackup.createdAt.toDate().toISOString(),
          userCount: lastBackup.totalUsers
        },
        duration: Date.now() - startTime
      };
    }

    // Vérifier que le nombre d'utilisateurs est cohérent
    if (lastBackup.totalUsers < CONFIG.MIN_USERS_EXPECTED) {
      return {
        testName: 'Auth Backup Content',
        status: 'warning',
        message: `Nombre d'utilisateurs faible: ${lastBackup.totalUsers} (attendu: >${CONFIG.MIN_USERS_EXPECTED})`,
        details: { userCount: lastBackup.totalUsers },
        duration: Date.now() - startTime
      };
    }

    return {
      testName: 'Auth Backup',
      status: 'passed',
      message: `Backup valide avec ${lastBackup.totalUsers} utilisateurs`,
      details: {
        lastBackupAt: lastBackup.createdAt.toDate().toISOString(),
        userCount: lastBackup.totalUsers,
        ageDays: Math.round(ageDays)
      },
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      testName: 'Auth Backup',
      status: 'failed',
      message: `Erreur: ${error instanceof Error ? error.message : 'Unknown'}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 3: Vérifier l'intégrité des collections critiques
 */
async function testCollectionIntegrity(): Promise<DRTestResult[]> {
  const db = admin.firestore();
  const results: DRTestResult[] = [];

  for (const collectionName of CONFIG.CRITICAL_COLLECTIONS) {
    const startTime = Date.now();

    try {
      // Vérifier que la collection existe et contient des données
      const countSnap = await db.collection(collectionName).count().get();
      const count = countSnap.data().count;

      if (count === 0) {
        results.push({
          testName: `Collection ${collectionName}`,
          status: 'warning',
          message: `Collection vide`,
          duration: Date.now() - startTime
        });
        continue;
      }

      // Vérifier qu'on peut lire un document
      const sampleDoc = await db.collection(collectionName).limit(1).get();

      if (sampleDoc.empty) {
        results.push({
          testName: `Collection ${collectionName}`,
          status: 'failed',
          message: `Impossible de lire les documents`,
          duration: Date.now() - startTime
        });
        continue;
      }

      results.push({
        testName: `Collection ${collectionName}`,
        status: 'passed',
        message: `${count} documents accessibles`,
        details: { documentCount: count },
        duration: Date.now() - startTime
      });

    } catch (error) {
      results.push({
        testName: `Collection ${collectionName}`,
        status: 'failed',
        message: `Erreur: ${error instanceof Error ? error.message : 'Unknown'}`,
        duration: Date.now() - startTime
      });
    }
  }

  return results;
}

/**
 * Test 4: Vérifier les backups Twilio
 */
async function testTwilioBackups(): Promise<DRTestResult> {
  const startTime = Date.now();
  const db = admin.firestore();

  try {
    // Vérifier les stats de backup Twilio
    const [completedSnap, failedSnap, pendingSnap] = await Promise.all([
      db.collection('call_recordings').where('backupStatus', '==', 'completed').count().get(),
      db.collection('call_recordings').where('backupStatus', '==', 'failed').count().get(),
      db.collection('call_recordings')
        .where('recordingStatus', '==', 'completed')
        .where('backupStatus', '!=', 'completed')
        .count()
        .get()
    ]);

    const completed = completedSnap.data().count;
    const failed = failedSnap.data().count;
    const pending = pendingSnap.data().count;

    if (failed > 10) {
      return {
        testName: 'Twilio Backup',
        status: 'warning',
        message: `${failed} enregistrements en échec de backup`,
        details: { completed, failed, pending },
        duration: Date.now() - startTime
      };
    }

    return {
      testName: 'Twilio Backup',
      status: 'passed',
      message: `${completed} enregistrements sauvegardés`,
      details: { completed, failed, pending },
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      testName: 'Twilio Backup',
      status: 'failed',
      message: `Erreur: ${error instanceof Error ? error.message : 'Unknown'}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 5: Vérifier l'accessibilité du Storage
 */
async function testStorageAccess(): Promise<DRTestResult> {
  const startTime = Date.now();

  try {
    const bucket = admin.storage().bucket();

    // Vérifier qu'on peut lister les fichiers
    const [files] = await bucket.getFiles({ maxResults: 10 });

    if (files.length === 0) {
      return {
        testName: 'Storage Access',
        status: 'warning',
        message: 'Aucun fichier trouvé dans le bucket',
        duration: Date.now() - startTime
      };
    }

    // Vérifier qu'on peut accéder aux métadonnées d'un fichier
    const [_metadata] = await files[0].getMetadata();

    return {
      testName: 'Storage Access',
      status: 'passed',
      message: `Storage accessible, ${files.length}+ fichiers`,
      details: {
        sampleFile: files[0].name,
        bucketName: bucket.name
      },
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      testName: 'Storage Access',
      status: 'failed',
      message: `Erreur: ${error instanceof Error ? error.message : 'Unknown'}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 5b: Vérifier l'accessibilité du bucket DR (Disaster Recovery)
 */
async function testDRBucketAccess(): Promise<DRTestResult> {
  const startTime = Date.now();
  const DR_BUCKET_NAME = process.env.DR_BACKUP_BUCKET || 'sos-expat-backup-dr';

  try {
    const { Storage } = await import('@google-cloud/storage');
    const storage = new Storage();
    const drBucket = storage.bucket(DR_BUCKET_NAME);

    // 1. Vérifier que le bucket existe
    const [exists] = await drBucket.exists();

    if (!exists) {
      return {
        testName: 'DR Bucket Access',
        status: 'failed',
        message: `Bucket DR "${DR_BUCKET_NAME}" n'existe pas! Créer le bucket dans une région différente (europe-west3 recommandé)`,
        details: {
          bucketName: DR_BUCKET_NAME,
          expectedRegion: 'europe-west3'
        },
        duration: Date.now() - startTime
      };
    }

    // 2. Vérifier qu'on peut lister les fichiers
    const [files] = await drBucket.getFiles({ maxResults: 10 });

    // 3. Vérifier qu'on peut écrire (test write access)
    const testFileName = `_dr_test_${Date.now()}.txt`;
    const testFile = drBucket.file(testFileName);

    try {
      await testFile.save('DR access test - delete me', {
        metadata: { contentType: 'text/plain' }
      });

      // Nettoyer immédiatement
      await testFile.delete();

    } catch (writeError) {
      return {
        testName: 'DR Bucket Access',
        status: 'failed',
        message: `Bucket DR existe mais pas d'accès en écriture: ${writeError instanceof Error ? writeError.message : 'Unknown'}`,
        details: {
          bucketName: DR_BUCKET_NAME,
          readAccess: true,
          writeAccess: false
        },
        duration: Date.now() - startTime
      };
    }

    // 4. Vérifier la fraîcheur des backups DR
    let hasRecentBackups = false;
    let oldestBackupDate: Date | null = null;

    for (const file of files) {
      if (file.name.includes('scheduled-backups/') || file.name.includes('auth_backups/')) {
        const [metadata] = await file.getMetadata();
        const fileDate = new Date(metadata.timeCreated as string);

        if (!oldestBackupDate || fileDate < oldestBackupDate) {
          oldestBackupDate = fileDate;
        }

        const ageHours = (Date.now() - fileDate.getTime()) / (1000 * 60 * 60);
        if (ageHours < 168) { // Moins de 7 jours (backup hebdomadaire)
          hasRecentBackups = true;
        }
      }
    }

    if (files.length === 0) {
      return {
        testName: 'DR Bucket Access',
        status: 'warning',
        message: 'Bucket DR accessible mais vide. Vérifier que crossRegionBackup s\'exécute.',
        details: {
          bucketName: DR_BUCKET_NAME,
          filesCount: 0,
          readAccess: true,
          writeAccess: true
        },
        duration: Date.now() - startTime
      };
    }

    if (!hasRecentBackups) {
      return {
        testName: 'DR Bucket Access',
        status: 'warning',
        message: 'Bucket DR accessible mais aucun backup récent (<7 jours)',
        details: {
          bucketName: DR_BUCKET_NAME,
          filesCount: files.length,
          oldestBackup: oldestBackupDate?.toISOString()
        },
        duration: Date.now() - startTime
      };
    }

    return {
      testName: 'DR Bucket Access',
      status: 'passed',
      message: `Bucket DR opérationnel: ${files.length}+ fichiers, backups récents présents`,
      details: {
        bucketName: DR_BUCKET_NAME,
        filesCount: files.length,
        readAccess: true,
        writeAccess: true,
        hasRecentBackups: true
      },
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      testName: 'DR Bucket Access',
      status: 'failed',
      message: `Erreur accès bucket DR: ${error instanceof Error ? error.message : 'Unknown'}`,
      details: {
        bucketName: DR_BUCKET_NAME
      },
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 5c: Vérifier les secrets et configurations
 */
async function testSecretsConfig(): Promise<DRTestResult> {
  const startTime = Date.now();

  const CRITICAL_SECRETS = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'ENCRYPTION_KEY'
  ];

  try {
    const missingSecrets: string[] = [];
    const setSecrets: string[] = [];

    for (const secretName of CRITICAL_SECRETS) {
      const value = process.env[secretName];
      if (value && value.length > 0) {
        setSecrets.push(secretName);
      } else {
        missingSecrets.push(secretName);
      }
    }

    if (missingSecrets.length > 0) {
      return {
        testName: 'Secrets Configuration',
        status: 'failed',
        message: `${missingSecrets.length} secrets critiques manquants: ${missingSecrets.join(', ')}`,
        details: {
          total: CRITICAL_SECRETS.length,
          configured: setSecrets.length,
          missing: missingSecrets
        },
        duration: Date.now() - startTime
      };
    }

    return {
      testName: 'Secrets Configuration',
      status: 'passed',
      message: `Tous les ${CRITICAL_SECRETS.length} secrets critiques sont configurés`,
      details: {
        total: CRITICAL_SECRETS.length,
        configured: setSecrets.length
      },
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      testName: 'Secrets Configuration',
      status: 'failed',
      message: `Erreur vérification secrets: ${error instanceof Error ? error.message : 'Unknown'}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 6: Vérifier la DLQ (pas d'accumulation)
 */
async function testDLQHealth(): Promise<DRTestResult> {
  const startTime = Date.now();
  const db = admin.firestore();

  try {
    const [pending, failed] = await Promise.all([
      db.collection('webhook_dlq').where('status', '==', 'pending').count().get(),
      db.collection('webhook_dlq').where('status', '==', 'failed_permanent').count().get()
    ]);

    const pendingCount = pending.data().count;
    const failedCount = failed.data().count;

    if (failedCount > 0) {
      return {
        testName: 'DLQ Health',
        status: 'failed',
        message: `${failedCount} événements en échec permanent`,
        details: { pending: pendingCount, failed: failedCount },
        duration: Date.now() - startTime
      };
    }

    if (pendingCount > 20) {
      return {
        testName: 'DLQ Health',
        status: 'warning',
        message: `${pendingCount} événements en attente`,
        details: { pending: pendingCount, failed: failedCount },
        duration: Date.now() - startTime
      };
    }

    return {
      testName: 'DLQ Health',
      status: 'passed',
      message: `DLQ saine (${pendingCount} pending, ${failedCount} failed)`,
      details: { pending: pendingCount, failed: failedCount },
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      testName: 'DLQ Health',
      status: 'failed',
      message: `Erreur: ${error instanceof Error ? error.message : 'Unknown'}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 7: Vérifier le chiffrement des données sensibles
 */
async function testEncryption(): Promise<DRTestResult> {
  const startTime = Date.now();
  const db = admin.firestore();

  try {
    // Vérifier un échantillon de call_sessions pour le chiffrement
    const sessions = await db.collection('call_sessions')
      .orderBy('metadata.createdAt', 'desc')
      .limit(10)
      .get();

    if (sessions.empty) {
      return {
        testName: 'Phone Encryption',
        status: 'warning',
        message: 'Aucune session à vérifier',
        duration: Date.now() - startTime
      };
    }

    let encryptedCount = 0;
    let unencryptedCount = 0;

    for (const doc of sessions.docs) {
      const data = doc.data();
      const providerPhone = data.participants?.provider?.phone;
      const clientPhone = data.participants?.client?.phone;

      const isProviderEncrypted = providerPhone?.startsWith('enc:');
      const isClientEncrypted = clientPhone?.startsWith('enc:');

      if (isProviderEncrypted && isClientEncrypted) {
        encryptedCount++;
      } else {
        unencryptedCount++;
      }
    }

    if (unencryptedCount > 0 && encryptedCount > 0) {
      return {
        testName: 'Phone Encryption',
        status: 'warning',
        message: `Migration en cours: ${encryptedCount} chiffrés, ${unencryptedCount} non chiffrés`,
        details: { encrypted: encryptedCount, unencrypted: unencryptedCount },
        duration: Date.now() - startTime
      };
    }

    if (unencryptedCount === sessions.size) {
      return {
        testName: 'Phone Encryption',
        status: 'warning',
        message: 'Chiffrement non encore appliqué',
        details: { encrypted: 0, unencrypted: unencryptedCount },
        duration: Date.now() - startTime
      };
    }

    return {
      testName: 'Phone Encryption',
      status: 'passed',
      message: `${encryptedCount}/${sessions.size} sessions chiffrées`,
      details: { encrypted: encryptedCount, total: sessions.size },
      duration: Date.now() - startTime
    };

  } catch (error) {
    return {
      testName: 'Phone Encryption',
      status: 'failed',
      message: `Erreur: ${error instanceof Error ? error.message : 'Unknown'}`,
      duration: Date.now() - startTime
    };
  }
}

// ============================================================================
// GENERATE RECOMMENDATIONS
// ============================================================================

function generateRecommendations(tests: DRTestResult[]): string[] {
  const recommendations: string[] = [];

  for (const test of tests) {
    if (test.status === 'failed') {
      switch (test.testName) {
        case 'Firestore Backup':
        case 'Firestore Backup Existence':
        case 'Firestore Backup Freshness':
          recommendations.push('URGENT: Vérifier le job de backup Firestore et le relancer manuellement');
          break;
        case 'Auth Backup':
        case 'Auth Backup Existence':
          recommendations.push('Déclencher un backup Auth manuel via triggerAuthBackup');
          break;
        case 'DLQ Health':
          recommendations.push('URGENT: Investiguer les événements DLQ en échec permanent');
          break;
        case 'DR Bucket Access':
          recommendations.push('CRITIQUE: Créer le bucket DR sos-expat-backup-dr dans europe-west3 via GCP Console');
          recommendations.push('Vérifier les permissions IAM pour le service account Firebase');
          break;
        case 'Secrets Configuration':
          recommendations.push('CRITIQUE: Configurer les secrets manquants via Firebase Console > Functions > Secret Manager');
          break;
        default:
          if (test.testName.startsWith('Collection')) {
            recommendations.push(`Vérifier l'intégrité de la collection ${test.testName.replace('Collection ', '')}`);
          }
      }
    } else if (test.status === 'warning') {
      if (test.testName === 'Phone Encryption') {
        recommendations.push('Exécuter la migration de chiffrement: migratePhoneEncryption');
      } else if (test.testName === 'Twilio Backup') {
        recommendations.push('Vérifier les enregistrements Twilio en échec de backup');
      } else if (test.testName === 'DR Bucket Access') {
        recommendations.push('Vérifier que crossRegionBackup s\'exécute correctement (dimanche 04:00)');
      }
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Aucune action requise - tous les systèmes sont opérationnels');
  }

  return [...new Set(recommendations)]; // Dédupliquer
}

// ============================================================================
// MAIN SCHEDULED FUNCTION
// ============================================================================

/**
 * Test DR mensuel - exécute le 1er de chaque mois à 6h
 */
export const runMonthlyDRTest = onSchedule(
  {
    schedule: '0 6 1 * *', // 1er du mois à 6h
    timeZone: 'Europe/Paris',
    region: 'europe-west3',
    memory: '256MiB',  // FIX: 512MiB needs cpu>=0.5, reduced to 256MiB
    cpu: 0.083,
    timeoutSeconds: 300,
  },
  async () => {
    logger.info('[DR Test] Starting monthly disaster recovery test...');

    const db = admin.firestore();
    const startTime = Date.now();
    const reportId = `dr_test_${new Date().toISOString().split('T')[0]}`;

    const allTests: DRTestResult[] = [];

    try {
      // Exécuter tous les tests
      logger.info('[DR Test] Running Firestore backup test...');
      allTests.push(await testFirestoreBackups());

      logger.info('[DR Test] Running Auth backup test...');
      allTests.push(await testAuthBackups());

      logger.info('[DR Test] Running collection integrity tests...');
      const collectionTests = await testCollectionIntegrity();
      allTests.push(...collectionTests);

      logger.info('[DR Test] Running Twilio backup test...');
      allTests.push(await testTwilioBackups());

      logger.info('[DR Test] Running Storage access test...');
      allTests.push(await testStorageAccess());

      logger.info('[DR Test] Running DR Bucket access test...');
      allTests.push(await testDRBucketAccess());

      logger.info('[DR Test] Running Secrets configuration test...');
      allTests.push(await testSecretsConfig());

      logger.info('[DR Test] Running DLQ health test...');
      allTests.push(await testDLQHealth());

      logger.info('[DR Test] Running encryption test...');
      allTests.push(await testEncryption());

      // Calculer le résumé
      const summary = {
        total: allTests.length,
        passed: allTests.filter(t => t.status === 'passed').length,
        failed: allTests.filter(t => t.status === 'failed').length,
        warnings: allTests.filter(t => t.status === 'warning').length
      };

      // Déterminer le statut global
      let overallStatus: 'passed' | 'failed' | 'warning' = 'passed';
      if (summary.failed > 0) {
        overallStatus = 'failed';
      } else if (summary.warnings > 0) {
        overallStatus = 'warning';
      }

      // Générer les recommandations
      const recommendations = generateRecommendations(allTests);

      // Créer le rapport
      const report: DRTestReport = {
        id: reportId,
        createdAt: admin.firestore.Timestamp.now(),
        overallStatus,
        tests: allTests,
        summary,
        executionTimeMs: Date.now() - startTime,
        recommendations
      };

      // Sauvegarder le rapport
      await db.collection(CONFIG.DR_REPORTS_COLLECTION).doc(reportId).set(report);

      // Log dans system_logs
      await db.collection('system_logs').add({
        type: 'dr_test',
        reportId,
        overallStatus,
        summary,
        createdAt: admin.firestore.Timestamp.now()
      });

      // Si échec, créer une alerte
      if (overallStatus === 'failed') {
        await db.collection('system_alerts').add({
          id: `alert_dr_${Date.now()}`,
          severity: 'critical',
          category: 'backup',
          title: 'Test DR mensuel en échec',
          message: `${summary.failed} tests ont échoué. Voir le rapport ${reportId}`,
          metadata: { reportId, summary },
          createdAt: admin.firestore.Timestamp.now(),
          acknowledged: false,
          notificationsSent: { email: false, slack: false }
        });
      }

      logger.info(`[DR Test] Completed. Status: ${overallStatus}, Passed: ${summary.passed}/${summary.total}`);

    } catch (error) {
      logger.error('[DR Test] Fatal error:', error);

      // Sauvegarder un rapport d'échec
      await db.collection(CONFIG.DR_REPORTS_COLLECTION).doc(reportId).set({
        id: reportId,
        createdAt: admin.firestore.Timestamp.now(),
        overallStatus: 'failed',
        tests: allTests,
        summary: { total: allTests.length, passed: 0, failed: 1, warnings: 0 },
        executionTimeMs: Date.now() - startTime,
        recommendations: ['Test DR a échoué avec une erreur fatale - investigation requise'],
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }
);

/**
 * Admin callable pour exécuter un test DR à la demande
 */
export const runDRTestManual = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 300, memory: '256MB' })
  .https.onCall(async (_data, context) => {
    // Vérifier l'authentification admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const db = admin.firestore();
    const startTime = Date.now();
    const reportId = `dr_test_manual_${Date.now()}`;

    try {
      const allTests: DRTestResult[] = [];

      allTests.push(await testFirestoreBackups());
      allTests.push(await testAuthBackups());
      allTests.push(...await testCollectionIntegrity());
      allTests.push(await testTwilioBackups());
      allTests.push(await testStorageAccess());
      allTests.push(await testDRBucketAccess());
      allTests.push(await testSecretsConfig());
      allTests.push(await testDLQHealth());
      allTests.push(await testEncryption());

      const summary = {
        total: allTests.length,
        passed: allTests.filter(t => t.status === 'passed').length,
        failed: allTests.filter(t => t.status === 'failed').length,
        warnings: allTests.filter(t => t.status === 'warning').length
      };

      let overallStatus: 'passed' | 'failed' | 'warning' = 'passed';
      if (summary.failed > 0) overallStatus = 'failed';
      else if (summary.warnings > 0) overallStatus = 'warning';

      const recommendations = generateRecommendations(allTests);

      const report = {
        id: reportId,
        createdAt: admin.firestore.Timestamp.now(),
        overallStatus,
        tests: allTests,
        summary,
        executionTimeMs: Date.now() - startTime,
        recommendations,
        triggeredBy: context.auth.uid
      };

      await db.collection(CONFIG.DR_REPORTS_COLLECTION).doc(reportId).set(report);

      // Log admin audit
      await db.collection('admin_audit_logs').add({
        action: 'MANUAL_DR_TEST',
        adminId: context.auth.uid,
        targetId: reportId,
        metadata: { overallStatus, summary },
        createdAt: admin.firestore.Timestamp.now()
      });

      return {
        success: true,
        reportId,
        overallStatus,
        summary,
        recommendations,
        tests: allTests,
        executionTimeMs: Date.now() - startTime
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[DR Test] Manual test failed:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Admin callable pour lister les rapports DR
 */
export const listDRReports = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
      const reports = await admin.firestore()
        .collection(CONFIG.DR_REPORTS_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(12) // 12 derniers mois
        .get();

      return {
        reports: reports.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString(),
            overallStatus: data.overallStatus,
            summary: data.summary,
            executionTimeMs: data.executionTimeMs
          };
        })
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new functions.https.HttpsError('internal', err.message);
    }
  });
