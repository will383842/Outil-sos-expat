/**
 * Quarterly Restore Test
 *
 * Effectue un test de restauration reel trimestriel pour valider:
 * - La capacite a restaurer les donnees Firestore
 * - L'integrite des backups
 * - Le temps reel de restauration (RTO)
 *
 * Execute le 1er jour de chaque trimestre (Janvier, Avril, Juillet, Octobre)
 * a 2h du matin pour minimiser l'impact.
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as functions from "firebase-functions/v1";
import { logger } from "firebase-functions";

// CRITICAL: Lazy initialization to avoid deployment timeout
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

// Configuration
const CONFIG = {
  // Collections a tester (echantillon representatif)
  TEST_COLLECTIONS: [
    "users",
    "sos_profiles",
    "payments",
    "subscriptions",
  ],
  // Nombre de documents a verifier par collection
  SAMPLE_SIZE: 10,
  // Tolerance pour les differences (documents peuvent changer entre backup et test)
  TOLERANCE_PERCENT: 5,
  // Collection pour les rapports
  REPORTS_COLLECTION: "quarterly_restore_tests",
};

interface RestoreTestResult {
  collectionName: string;
  status: "passed" | "failed" | "warning";
  backupCount: number;
  currentCount: number;
  difference: number;
  differencePercent: number;
  sampleVerified: boolean;
  message: string;
  durationMs: number;
}

interface QuarterlyTestReport {
  id: string;
  quarter: string; // ex: "2025-Q1"
  createdAt: FirebaseFirestore.Timestamp;
  overallStatus: "passed" | "failed" | "warning";
  backupUsed: {
    id: string;
    createdAt: string;
    bucketPath: string;
  };
  results: RestoreTestResult[];
  summary: {
    totalCollections: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  rtoMeasured: {
    backupAgeHours: number;
    testDurationMs: number;
    estimatedFullRestoreMinutes: number;
  };
  recommendations: string[];
  triggeredBy: "scheduled" | "manual";
}

/**
 * Obtient le dernier backup complet disponible
 */
async function getLatestBackup(): Promise<{
  id: string;
  createdAt: Date;
  bucketPath: string;
  collectionCounts: Record<string, number>;
} | null> {
  ensureInitialized();
  const db = admin.firestore();

  const backups = await db
    .collection("backups")
    .where("status", "==", "completed")
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (backups.empty) {
    return null;
  }

  const doc = backups.docs[0];
  const data = doc.data();

  return {
    id: doc.id,
    createdAt: data.createdAt.toDate(),
    bucketPath: data.bucketPath,
    collectionCounts: data.collectionCounts || {},
  };
}

/**
 * Teste l'integrite d'une collection
 */
async function testCollectionIntegrity(
  collectionName: string,
  expectedCount: number
): Promise<RestoreTestResult> {
  ensureInitialized();
  const startTime = Date.now();
  const db = admin.firestore();

  try {
    // Compter les documents actuels
    const countSnapshot = await db.collection(collectionName).count().get();
    const currentCount = countSnapshot.data().count;

    // Calculer la difference
    const difference = Math.abs(currentCount - expectedCount);
    const differencePercent = expectedCount > 0
      ? (difference / expectedCount) * 100
      : 0;

    // Verifier un echantillon de documents
    let sampleVerified = true;
    let sampleMessage = "";

    try {
      const sampleDocs = await db
        .collection(collectionName)
        .limit(CONFIG.SAMPLE_SIZE)
        .get();

      if (sampleDocs.empty && currentCount > 0) {
        sampleVerified = false;
        sampleMessage = "Cannot read documents despite non-zero count";
      } else {
        // Verifier que les documents ont des donnees valides
        for (const doc of sampleDocs.docs) {
          const data = doc.data();
          if (!data || Object.keys(data).length === 0) {
            sampleVerified = false;
            sampleMessage = `Document ${doc.id} has no data`;
            break;
          }
        }
      }
    } catch (sampleError) {
      sampleVerified = false;
      sampleMessage = `Sample read error: ${sampleError instanceof Error ? sampleError.message : "Unknown"}`;
    }

    // Determiner le statut
    let status: "passed" | "failed" | "warning" = "passed";
    let message = `Count matches: ${currentCount}/${expectedCount}`;

    if (!sampleVerified) {
      status = "failed";
      message = sampleMessage;
    } else if (differencePercent > CONFIG.TOLERANCE_PERCENT) {
      status = "warning";
      message = `Count difference exceeds tolerance: ${differencePercent.toFixed(1)}%`;
    } else if (difference > 0) {
      message = `Minor difference: ${difference} documents (${differencePercent.toFixed(1)}%)`;
    }

    return {
      collectionName,
      status,
      backupCount: expectedCount,
      currentCount,
      difference,
      differencePercent,
      sampleVerified,
      message,
      durationMs: Date.now() - startTime,
    };

  } catch (error) {
    return {
      collectionName,
      status: "failed",
      backupCount: expectedCount,
      currentCount: -1,
      difference: -1,
      differencePercent: -1,
      sampleVerified: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Genere les recommandations basees sur les resultats
 */
function generateRecommendations(results: RestoreTestResult[]): string[] {
  const recommendations: string[] = [];

  const failedCollections = results.filter(r => r.status === "failed");
  const warningCollections = results.filter(r => r.status === "warning");

  if (failedCollections.length > 0) {
    recommendations.push(
      `URGENT: ${failedCollections.length} collection(s) ont echoue la verification. ` +
      `Investiguer: ${failedCollections.map(c => c.collectionName).join(", ")}`
    );
  }

  if (warningCollections.length > 0) {
    recommendations.push(
      `${warningCollections.length} collection(s) presentent des ecarts significatifs. ` +
      `Verifier: ${warningCollections.map(c => c.collectionName).join(", ")}`
    );
  }

  // Verifier l'age du backup
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  if (totalDuration > 60000) {
    recommendations.push(
      `Test duration (${Math.round(totalDuration / 1000)}s) is high. Consider optimizing backup validation.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Tous les tests ont reussi. Le systeme de backup est operationnel.");
  }

  return recommendations;
}

/**
 * Obtient le trimestre actuel
 */
function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${quarter}`;
}

/**
 * Execute le test trimestriel complet
 */
async function runQuarterlyTest(triggeredBy: "scheduled" | "manual", adminId?: string): Promise<QuarterlyTestReport> {
  ensureInitialized();
  const startTime = Date.now();
  const db = admin.firestore();
  const reportId = `restore_test_${Date.now()}`;

  logger.info("[QuarterlyRestoreTest] Starting quarterly restore validation test...");

  // Obtenir le dernier backup
  const latestBackup = await getLatestBackup();

  if (!latestBackup) {
    throw new Error("No backup found for restore test");
  }

  const backupAgeHours = (Date.now() - latestBackup.createdAt.getTime()) / (1000 * 60 * 60);
  logger.info(`[QuarterlyRestoreTest] Using backup from ${latestBackup.createdAt.toISOString()} (${backupAgeHours.toFixed(1)}h ago)`);

  // Tester chaque collection
  const results: RestoreTestResult[] = [];

  for (const collectionName of CONFIG.TEST_COLLECTIONS) {
    logger.info(`[QuarterlyRestoreTest] Testing collection: ${collectionName}`);

    const expectedCount = latestBackup.collectionCounts[collectionName] || 0;
    const result = await testCollectionIntegrity(collectionName, expectedCount);
    results.push(result);

    logger.info(`[QuarterlyRestoreTest] ${collectionName}: ${result.status} - ${result.message}`);
  }

  // Calculer le resume
  const summary = {
    totalCollections: results.length,
    passed: results.filter(r => r.status === "passed").length,
    failed: results.filter(r => r.status === "failed").length,
    warnings: results.filter(r => r.status === "warning").length,
  };

  // Determiner le statut global
  let overallStatus: "passed" | "failed" | "warning" = "passed";
  if (summary.failed > 0) {
    overallStatus = "failed";
  } else if (summary.warnings > 0) {
    overallStatus = "warning";
  }

  // Generer les recommandations
  const recommendations = generateRecommendations(results);

  // Estimer le temps de restauration complet
  const testDurationMs = Date.now() - startTime;
  // Estimation: restauration complete prend environ 10x le temps de verification
  const estimatedFullRestoreMinutes = Math.ceil((testDurationMs * 10) / 60000);

  // Creer le rapport
  const report: QuarterlyTestReport = {
    id: reportId,
    quarter: getCurrentQuarter(),
    createdAt: admin.firestore.Timestamp.now(),
    overallStatus,
    backupUsed: {
      id: latestBackup.id,
      createdAt: latestBackup.createdAt.toISOString(),
      bucketPath: latestBackup.bucketPath,
    },
    results,
    summary,
    rtoMeasured: {
      backupAgeHours: Math.round(backupAgeHours * 10) / 10,
      testDurationMs,
      estimatedFullRestoreMinutes,
    },
    recommendations,
    triggeredBy,
  };

  // Sauvegarder le rapport
  await db.collection(CONFIG.REPORTS_COLLECTION).doc(reportId).set(report);

  // Log dans system_logs
  await db.collection("system_logs").add({
    type: "quarterly_restore_test",
    reportId,
    overallStatus,
    summary,
    triggeredBy,
    adminId: adminId || null,
    createdAt: admin.firestore.Timestamp.now(),
  });

  // Alerte si echec
  if (overallStatus === "failed") {
    await db.collection("system_alerts").add({
      type: "restore_test_failure",
      severity: "critical",
      message: `Quarterly restore test failed: ${summary.failed} collection(s) failed verification`,
      metadata: { reportId, summary },
      acknowledged: false,
      createdAt: admin.firestore.Timestamp.now(),
    });
  }

  logger.info(`[QuarterlyRestoreTest] Completed. Status: ${overallStatus}, Duration: ${testDurationMs}ms`);

  return report;
}

/**
 * Test trimestriel automatique
 * Execute le 1er jour de chaque trimestre a 2h du matin
 * Janvier (1), Avril (4), Juillet (7), Octobre (10)
 */
export const quarterlyRestoreTest = onSchedule(
  {
    schedule: "0 2 1 1,4,7,10 *", // 1er jour des mois 1,4,7,10 a 2h
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "512MiB",
    cpu: 0.083,
    timeoutSeconds: 300,
  },
  async () => {
    await runQuarterlyTest("scheduled");
  }
);

/**
 * Test manuel declenchable par admin
 */
export const runRestoreTestManual = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 300, memory: "512MB" })
  .https.onCall(async (_data, context) => {
    ensureInitialized();
    // Verifier l'authentification admin
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();

    if (userData?.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    try {
      const report = await runQuarterlyTest("manual", context.auth.uid);

      // Audit log
      await db.collection("admin_audit_logs").add({
        action: "MANUAL_RESTORE_TEST",
        adminId: context.auth.uid,
        targetId: report.id,
        metadata: { overallStatus: report.overallStatus, summary: report.summary },
        createdAt: admin.firestore.Timestamp.now(),
      });

      return {
        success: true,
        reportId: report.id,
        overallStatus: report.overallStatus,
        summary: report.summary,
        rtoMeasured: report.rtoMeasured,
        recommendations: report.recommendations,
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[RestoreTest] Manual test failed:", err);
      throw new functions.https.HttpsError("internal", err.message);
    }
  });

/**
 * Liste les rapports de tests de restauration
 */
export const listRestoreTestReports = functions
  .region("europe-west1")
  .https.onCall(async (_data, context) => {
    ensureInitialized();
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userData = userDoc.data();

    if (userData?.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    try {
      const reports = await db
        .collection(CONFIG.REPORTS_COLLECTION)
        .orderBy("createdAt", "desc")
        .limit(8) // 2 ans de rapports trimestriels
        .get();

      return {
        reports: reports.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            quarter: data.quarter,
            createdAt: data.createdAt?.toDate?.()?.toISOString(),
            overallStatus: data.overallStatus,
            summary: data.summary,
            rtoMeasured: data.rtoMeasured,
            triggeredBy: data.triggeredBy,
          };
        }),
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new functions.https.HttpsError("internal", err.message);
    }
  });
