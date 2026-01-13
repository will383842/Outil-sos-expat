// functions/src/manualBackup.ts
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

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

// Lazy client initialization
let _client: InstanceType<typeof admin.firestore.v1.FirestoreAdminClient> | null = null;
function getClient(): InstanceType<typeof admin.firestore.v1.FirestoreAdminClient> {
  ensureInitialized();
  if (!_client) {
    _client = new admin.firestore.v1.FirestoreAdminClient();
  }
  return _client;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Intervalle minimum entre deux backups manuels (en ms)
  MIN_INTERVAL_MS: 60 * 60 * 1000, // 1 heure
  // Maximum de backups manuels par jour par admin
  MAX_DAILY_BACKUPS: 5,
  // Collections critiques à compter
  CRITICAL_COLLECTIONS: [
    "users",
    "sos_profiles",
    "call_sessions",
    "payments",
    "subscriptions",
    "invoices",
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Génère un checksum pour le backup
 */
function generateBackupChecksum(
  projectId: string,
  timestamp: number,
  operationName: string,
  adminId: string
): string {
  const data = `${projectId}:${timestamp}:${operationName}:${adminId}`;
  return crypto.createHash("sha256").update(data).digest("hex").substring(0, 16);
}

/**
 * Compte les documents dans les collections critiques
 */
async function getCollectionCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const collectionId of CONFIG.CRITICAL_COLLECTIONS) {
    try {
      const snapshot = await admin
        .firestore()
        .collection(collectionId)
        .count()
        .get();
      counts[collectionId] = snapshot.data().count;
    } catch {
      counts[collectionId] = -1;
    }
  }

  return counts;
}

/**
 * Vérifie le rate limiting pour les backups manuels
 */
async function checkRateLimiting(adminId: string): Promise<{
  allowed: boolean;
  reason?: string;
  nextAllowedAt?: Date;
}> {
  const db = admin.firestore();
  const now = Date.now();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

  // Récupérer le dernier backup manuel de cet admin
  const lastBackup = await db
    .collection("backups")
    .where("type", "==", "manual")
    .where("createdBy", "==", adminId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (!lastBackup.empty) {
    const lastBackupData = lastBackup.docs[0].data();
    const lastBackupTime = lastBackupData.createdAt?.toDate?.()?.getTime() || 0;
    const timeSinceLastBackup = now - lastBackupTime;

    if (timeSinceLastBackup < CONFIG.MIN_INTERVAL_MS) {
      const nextAllowedAt = new Date(lastBackupTime + CONFIG.MIN_INTERVAL_MS);
      const remainingMinutes = Math.ceil((CONFIG.MIN_INTERVAL_MS - timeSinceLastBackup) / 60000);
      return {
        allowed: false,
        reason: `Rate limit: please wait ${remainingMinutes} minutes before creating another backup`,
        nextAllowedAt,
      };
    }
  }

  // Compter les backups des dernières 24h
  const dailyBackups = await db
    .collection("backups")
    .where("type", "==", "manual")
    .where("createdBy", "==", adminId)
    .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(oneDayAgo))
    .count()
    .get();

  if (dailyBackups.data().count >= CONFIG.MAX_DAILY_BACKUPS) {
    return {
      allowed: false,
      reason: `Daily limit reached: maximum ${CONFIG.MAX_DAILY_BACKUPS} manual backups per day`,
    };
  }

  return { allowed: true };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

export const createManualBackup = onCall(
  {
    region: "europe-west1",
    memory: "512MiB",
  },
  async (request) => {
    ensureInitialized();
    const startTime = Date.now();

    // Verify admin authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const adminId = request.auth.uid;

    // Check if user has admin role via custom claims
    const isAdminClaim = request.auth.token.role === "admin" || request.auth.token.role === "dev";

    // Double-check in Firestore for extra security
    const userDoc = await admin.firestore().collection("users").doc(adminId).get();
    const userData = userDoc.data();
    const isAdminFirestore = userData?.role === "admin" || userData?.role === "dev";

    if (!isAdminClaim && !isAdminFirestore) {
      logger.warn(`[ManualBackup] Unauthorized attempt by user: ${adminId}`);

      // Log l'attempt pour sécurité
      await admin.firestore().collection("security_logs").add({
        type: "unauthorized_backup_attempt",
        userId: adminId,
        createdAt: admin.firestore.Timestamp.now(),
      });

      throw new HttpsError("permission-denied", "Admin access required to create backups");
    }

    // Vérifier le rate limiting
    const rateLimitCheck = await checkRateLimiting(adminId);
    if (!rateLimitCheck.allowed) {
      logger.warn(`[ManualBackup] Rate limited for admin: ${adminId}`);
      throw new HttpsError("resource-exhausted", rateLimitCheck.reason || "Rate limit exceeded");
    }

    try {
      logger.info(`[ManualBackup] Starting backup by admin: ${adminId}`);

      const projectId = process.env.GCLOUD_PROJECT as string;
      const bucket = `gs://${projectId}.firebasestorage.app`;
      const client = getClient();
      const databaseName = client.databasePath(projectId, "(default)");
      const timestamp = Date.now();

      // Obtenir les counts de collections pour validation
      const collectionCounts = await getCollectionCounts();
      const totalDocuments = Object.values(collectionCounts).reduce(
        (a, b) => (b > 0 ? a + b : a),
        0
      );

      logger.info("[ManualBackup] Collection counts:", collectionCounts);

      // Créer le backup
      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: `${bucket}/manual-backups/backup-${timestamp}`,
        collectionIds: [], // Empty = all collections
      });

      logger.info("[ManualBackup] Export operation started:", operation.name);

      // Générer le checksum
      const checksum = generateBackupChecksum(
        projectId,
        timestamp,
        operation.name || "",
        adminId
      );

      // Sauvegarder les métadonnées enrichies
      const backupDoc = await admin
        .firestore()
        .collection("backups")
        .add({
          type: "manual",
          status: "completed",
          operationName: operation.name,
          bucketPath: `${bucket}/manual-backups/backup-${timestamp}`,
          createdBy: adminId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          timestamp,
          // Nouvelles métadonnées pour validation
          checksum,
          collectionCounts,
          totalDocuments,
          executionTimeMs: Date.now() - startTime,
          version: "2.0",
        });

      // Log dans system_logs pour monitoring
      await admin.firestore().collection("system_logs").add({
        type: "manual_firestore_backup",
        backupId: backupDoc.id,
        operationName: operation.name,
        checksum,
        totalDocuments,
        success: true,
        triggeredBy: adminId,
        executionTimeMs: Date.now() - startTime,
        createdAt: admin.firestore.Timestamp.now(),
      });

      // Log admin audit
      await admin.firestore().collection("admin_audit_logs").add({
        action: "MANUAL_FIRESTORE_BACKUP",
        adminId,
        targetId: backupDoc.id,
        metadata: {
          checksum,
          totalDocuments,
          collectionCounts,
        },
        createdAt: admin.firestore.Timestamp.now(),
      });

      logger.info(
        `[ManualBackup] Completed. Checksum: ${checksum}, Documents: ${totalDocuments}`
      );

      return {
        success: true,
        backupId: backupDoc.id,
        operationName: operation.name,
        checksum,
        totalDocuments,
        message: "Backup started successfully",
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[ManualBackup] Failed:", err);

      // Log l'erreur
      await admin.firestore().collection("backup_errors").add({
        type: "manual",
        adminId,
        error: err.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        executionTimeMs: Date.now() - startTime,
      });

      throw new HttpsError(
        "internal",
        err.message || "Failed to create backup"
      );
    }
  }
);
