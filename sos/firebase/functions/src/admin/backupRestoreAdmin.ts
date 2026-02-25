/**
 * Admin Backup & Restore Functions
 *
 * Permet aux admins de:
 * - Lister les backups disponibles (Firestore, Auth, Storage)
 * - Restaurer depuis une date spécifique
 * - Choisir les éléments à restaurer
 * - Prévisualiser avant restauration
 */

import * as functions from "firebase-functions/v1";
// Gen2 imports removed - adminGetRestoreConfirmationCode moved to restoreConfirmationCode.ts
import * as admin from "firebase-admin";
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

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

// ============================================================================
// CONFIGURATION - Rétention différenciée
// ============================================================================

export const BACKUP_CONFIG = {
  // Rétention standard (données générales) - restauration opérationnelle
  STANDARD_RETENTION_DAYS: 30,
  // Rétention étendue (données financières, comptables) - conformité légale
  // France/UE: 10 ans minimum pour documents comptables
  // Note: Les archives financières sont conservées INDEFINIMENT
  FINANCIAL_RETENTION_DAYS: 3650, // 10 ans, mais ne jamais supprimer automatiquement
  // Collections critiques (restauration prioritaire)
  CRITICAL_COLLECTIONS: [
    "users",
    "sos_profiles",
    "call_sessions",
    "payments",
    "subscriptions",
  ],
  // Collections financières (rétention 90j)
  FINANCIAL_COLLECTIONS: [
    "payments",
    "invoices",
    "invoice_records",
    "admin_invoices",
    "transfers",
    "pending_transfers",
    "refunds",
    "disputes",
    "journal_entries",
    "tax_filings",
    "subscriptions",
  ],
  // Collections pouvant être restaurées
  RESTORABLE_COLLECTIONS: [
    "users",
    "sos_profiles",
    "call_sessions",
    "payments",
    "subscriptions",
    "invoices",
    "invoice_records",
    "reviews",
    "notifications",
    "faqs",
    "help_articles",
    "legal_documents",
    "country_settings",
    "admin_config",
    "coupons",
  ],
};

// ============================================================================
// TYPES
// ============================================================================

interface BackupInfo {
  id: string;
  type: "firestore" | "auth" | "storage";
  createdAt: string;
  status: "completed" | "failed" | "in_progress";
  totalDocuments?: number;
  bucketPath?: string;
  checksum?: string;
  backupType?: string;
  collections?: Record<string, number>;
}

interface RestoreOptions {
  backupId: string;
  backupType: "firestore" | "auth";
  collections?: string[]; // Si vide = tout restaurer
  dryRun?: boolean; // Prévisualisation sans modification
  mergeMode?: "overwrite" | "merge" | "skip_existing";
}

interface RestoreResult {
  success: boolean;
  backupId: string;
  collectionsRestored: string[];
  documentsProcessed: number;
  documentsCreated: number;
  documentsUpdated: number;
  documentsSkipped: number;
  errors: Array<{ collection: string; error: string }>;
  dryRun: boolean;
  executionTimeMs: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function isAdmin(uid: string): Promise<boolean> {
  const userDoc = await getDb().collection("users").doc(uid).get();
  const userData = userDoc.data();
  return userData?.role === "admin" || userData?.role === "dev";
}

/**
 * Liste les backups Firestore disponibles
 */
async function listFirestoreBackups(limit: number = 50): Promise<BackupInfo[]> {
  const db = getDb();

  const backups = await db
    .collection("backups")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return backups.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: "firestore" as const,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.timestamp?.toString(),
      status: data.status || "completed",
      totalDocuments: data.totalDocuments,
      bucketPath: data.bucketPath,
      checksum: data.checksum,
      backupType: data.backupType, // morning, midday, evening
      collections: data.collectionCounts,
    };
  });
}

/**
 * Liste les backups Auth disponibles
 */
async function listAuthBackups(limit: number = 20): Promise<BackupInfo[]> {
  const db = getDb();

  const backups = await db
    .collection("auth_backups")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return backups.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      type: "auth" as const,
      createdAt: data.createdAt?.toDate?.()?.toISOString(),
      status: data.status || "completed",
      totalDocuments: data.totalUsers,
    };
  });
}

/**
 * Obtient les counts actuels des collections
 */
async function getCurrentCollectionCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  for (const collection of BACKUP_CONFIG.RESTORABLE_COLLECTIONS) {
    try {
      const snapshot = await admin
        .firestore()
        .collection(collection)
        .count()
        .get();
      counts[collection] = snapshot.data().count;
    } catch {
      counts[collection] = -1;
    }
  }

  return counts;
}

// ============================================================================
// ADMIN CALLABLE FUNCTIONS
// ============================================================================

/**
 * Liste tous les backups disponibles pour l'interface admin
 */
export const adminListBackups = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 60, memory: "128MB" })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    if (!(await isAdmin(context.auth.uid))) {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    try {
      const limit = data?.limit || 30;

      // Récupérer les backups en parallèle
      const [firestoreBackups, authBackups, currentCounts] = await Promise.all([
        listFirestoreBackups(limit),
        listAuthBackups(limit),
        getCurrentCollectionCounts(),
      ]);

      // Grouper par date pour faciliter la sélection
      const backupsByDate: Record<string, { firestore: BackupInfo[]; auth: BackupInfo[] }> = {};

      for (const backup of firestoreBackups) {
        const date = backup.createdAt?.split("T")[0] || "unknown";
        if (!backupsByDate[date]) {
          backupsByDate[date] = { firestore: [], auth: [] };
        }
        backupsByDate[date].firestore.push(backup);
      }

      for (const backup of authBackups) {
        const date = backup.createdAt?.split("T")[0] || "unknown";
        if (!backupsByDate[date]) {
          backupsByDate[date] = { firestore: [], auth: [] };
        }
        backupsByDate[date].auth.push(backup);
      }

      return {
        success: true,
        backupsByDate,
        firestoreBackups,
        authBackups,
        currentState: {
          collectionCounts: currentCounts,
          timestamp: new Date().toISOString(),
        },
        config: {
          standardRetentionDays: BACKUP_CONFIG.STANDARD_RETENTION_DAYS,
          financialRetentionDays: BACKUP_CONFIG.FINANCIAL_RETENTION_DAYS,
          restorableCollections: BACKUP_CONFIG.RESTORABLE_COLLECTIONS,
          criticalCollections: BACKUP_CONFIG.CRITICAL_COLLECTIONS,
        },
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[AdminBackup] Failed to list backups:", err);
      throw new functions.https.HttpsError("internal", err.message);
    }
  });

/**
 * Prévisualise une restauration (dry run)
 */
export const adminPreviewRestore = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 120, memory: "256MB" })
  .https.onCall(async (data: RestoreOptions, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    if (!(await isAdmin(context.auth.uid))) {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    const { backupId, backupType, collections } = data;

    if (!backupId || !backupType) {
      throw new functions.https.HttpsError("invalid-argument", "backupId and backupType required");
    }

    try {
      const db = getDb();

      if (backupType === "firestore") {
        // Récupérer les infos du backup
        const backupDoc = await db.collection("backups").doc(backupId).get();
        if (!backupDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Backup not found");
        }

        const backupData = backupDoc.data()!;
        const collectionCounts = backupData.collectionCounts || {};

        // Comparer avec l'état actuel
        const currentCounts = await getCurrentCollectionCounts();

        const preview = {
          backupId,
          backupDate: backupData.createdAt?.toDate?.()?.toISOString(),
          backupType: backupData.backupType,
          totalDocumentsInBackup: backupData.totalDocuments,
          collectionsToRestore: collections || Object.keys(collectionCounts),
          comparison: {} as Record<string, { backup: number; current: number; diff: number }>,
        };

        for (const col of preview.collectionsToRestore) {
          preview.comparison[col] = {
            backup: collectionCounts[col] || 0,
            current: currentCounts[col] || 0,
            diff: (collectionCounts[col] || 0) - (currentCounts[col] || 0),
          };
        }

        return {
          success: true,
          preview,
          warnings: preview.collectionsToRestore
            .filter(col => preview.comparison[col]?.diff < 0)
            .map(col => `${col}: ${Math.abs(preview.comparison[col].diff)} documents seront supprimés`),
        };

      } else if (backupType === "auth") {
        const backupDoc = await db.collection("auth_backups").doc(backupId).get();
        if (!backupDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Auth backup not found");
        }

        const backupData = backupDoc.data()!;

        // Compter les utilisateurs actuels
        let currentUserCount = 0;
        let pageToken: string | undefined;
        do {
          const listResult = await admin.auth().listUsers(1000, pageToken);
          currentUserCount += listResult.users.length;
          pageToken = listResult.pageToken;
        } while (pageToken);

        return {
          success: true,
          preview: {
            backupId,
            backupDate: backupData.createdAt?.toDate?.()?.toISOString(),
            usersInBackup: backupData.totalUsers,
            currentUsers: currentUserCount,
            diff: backupData.totalUsers - currentUserCount,
          },
          warnings: backupData.totalUsers < currentUserCount
            ? [`${currentUserCount - backupData.totalUsers} utilisateurs créés après ce backup ne seront pas affectés`]
            : [],
        };
      }

      throw new functions.https.HttpsError("invalid-argument", "Invalid backup type");

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[AdminBackup] Preview failed:", err);
      throw new functions.https.HttpsError("internal", err.message);
    }
  });

// adminGetRestoreConfirmationCode moved to ./restoreConfirmationCode.ts for faster cold start

/**
 * Exécute une restauration Firestore via l'API importDocuments
 * Importe les données depuis un backup GCS dans la base actuelle
 *
 * SÉCURITÉ:
 * - Nécessite un code de confirmation
 * - Crée automatiquement un backup "pre-restore" pour rollback
 */
export const adminRestoreFirestore = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onCall(async (data: {
    backupId: string;
    bucketPath: string;
    collections?: string[];
    confirmationCode?: string;
    expectedCode?: string;
    skipPreRestoreBackup?: boolean; // Pour les tests uniquement
  }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    if (!(await isAdmin(context.auth.uid))) {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    const { backupId, bucketPath, collections, confirmationCode, expectedCode, skipPreRestoreBackup } = data;
    const db = getDb();

    if (!backupId || !bucketPath) {
      throw new functions.https.HttpsError("invalid-argument", "backupId and bucketPath required");
    }

    // SÉCURITÉ: Vérification du code de confirmation
    if (!confirmationCode || !expectedCode || confirmationCode !== expectedCode) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Code de confirmation invalide. La restauration a été annulée pour des raisons de sécurité."
      );
    }

    try {
      // SÉCURITÉ: Créer un backup "pre-restore" pour permettre le rollback
      let preRestoreBackupId: string | null = null;
      let preRestoreBackupPath: string | null = null;

      if (!skipPreRestoreBackup) {
        logger.info("[AdminRestore] Creating pre-restore backup for safety...");

        const client = new admin.firestore.v1.FirestoreAdminClient();
        const projectId = process.env.GCLOUD_PROJECT || "sos-urgently-ac307";
        const databaseName = client.databasePath(projectId, "(default)");
        const bucket = `gs://${projectId}.firebasestorage.app`;
        const timestamp = Date.now();
        preRestoreBackupPath = `${bucket}/pre-restore-backups/pre-restore-${timestamp}`;

        const [preRestoreOp] = await client.exportDocuments({
          name: databaseName,
          outputUriPrefix: preRestoreBackupPath,
          // Exporter uniquement les collections qui vont être restaurées
          collectionIds: collections && collections.length > 0 ? collections : [],
        });

        // Sauvegarder les métadonnées du backup pre-restore
        const preRestoreDoc = await db.collection("backups").add({
          type: "pre-restore",
          backupType: "pre-restore",
          status: "completed",
          operationName: preRestoreOp.name,
          bucketPath: preRestoreBackupPath,
          createdBy: context.auth.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          timestamp,
          description: `Backup automatique avant restauration du backup ${backupId}`,
          relatedRestoreBackupId: backupId,
          containsFinancialData: true, // Ne jamais supprimer
          retentionDays: 90, // Garder 90 jours minimum
        });

        preRestoreBackupId = preRestoreDoc.id;
        logger.info(`[AdminRestore] Pre-restore backup created: ${preRestoreBackupId}`);
      }

      // Log l'action admin AVANT l'exécution
      const auditRef = await db.collection("admin_audit_logs").add({
        action: "RESTORE_FIRESTORE_INITIATED",
        adminId: context.auth.uid,
        metadata: {
          backupId,
          bucketPath,
          collections,
          preRestoreBackupId,
          preRestoreBackupPath,
          confirmationCodeUsed: confirmationCode,
        },
        createdAt: admin.firestore.Timestamp.now(),
        status: "in_progress",
      });

      // Créer une alerte système pour informer les autres admins
      await db.collection("system_alerts").add({
        type: "restore_in_progress",
        severity: "warning",
        message: `Restauration Firestore en cours par admin ${context.auth.uid}`,
        metadata: { backupId, collections, preRestoreBackupId },
        acknowledged: false,
        createdAt: admin.firestore.Timestamp.now(),
      });

      logger.info(`[AdminRestore] Firestore import initiated by ${context.auth.uid}`, {
        backupId,
        bucketPath,
        collections,
        preRestoreBackupId,
      });

      // Utiliser l'API Firestore Admin pour importer
      const client = new admin.firestore.v1.FirestoreAdminClient();
      const projectId = process.env.GCLOUD_PROJECT || "sos-urgently-ac307";
      const databaseName = client.databasePath(projectId, "(default)");

      // Lancer l'import (opération asynchrone longue)
      const [operation] = await client.importDocuments({
        name: databaseName,
        inputUriPrefix: bucketPath,
        // Si collections spécifiées, filtrer
        collectionIds: collections && collections.length > 0 ? collections : [],
      });

      logger.info(`[AdminRestore] Import operation started:`, {
        operationName: operation.name,
        metadata: operation.metadata,
      });

      // Mettre à jour l'audit log avec l'opération
      await auditRef.update({
        status: "import_started",
        operationName: operation.name,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Créer un document de suivi pour cette restauration
      const restoreTrackingRef = await db.collection("restore_operations").add({
        backupId,
        bucketPath,
        collections: collections || "all",
        operationName: operation.name,
        status: "in_progress",
        initiatedBy: context.auth.uid,
        auditLogId: auditRef.id,
        preRestoreBackupId, // Pour pouvoir faire un rollback
        preRestoreBackupPath,
        createdAt: admin.firestore.Timestamp.now(),
      });

      return {
        success: true,
        message: "Restauration lancée avec succès",
        operationName: operation.name,
        trackingId: restoreTrackingRef.id,
        auditLogId: auditRef.id,
        preRestoreBackupId, // L'admin peut utiliser ce backup pour revenir en arrière
        estimatedTime: "L'opération peut prendre plusieurs minutes selon la taille des données",
        rollbackInfo: preRestoreBackupId
          ? `Un backup de sécurité a été créé (ID: ${preRestoreBackupId}). Vous pouvez l'utiliser pour annuler cette restauration si nécessaire.`
          : null,
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[AdminRestore] Failed:", err);

      // Log l'échec
      await db.collection("system_alerts").add({
        type: "restore_failed",
        severity: "critical",
        message: `Échec de la restauration Firestore: ${err.message}`,
        acknowledged: false,
        createdAt: admin.firestore.Timestamp.now(),
      });

      throw new functions.https.HttpsError("internal", err.message);
    }
  });

/**
 * Vérifie le statut d'une opération de restauration en cours
 * Utilise le tracking Firestore pour suivre la progression
 */
export const adminCheckRestoreStatus = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 60, memory: "128MB" })
  .https.onCall(async (data: { trackingId?: string; operationName?: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    if (!(await isAdmin(context.auth.uid))) {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    const { trackingId, operationName } = data;
    if (!trackingId && !operationName) {
      throw new functions.https.HttpsError("invalid-argument", "trackingId or operationName required");
    }

    try {
      const db = getDb();

      // Récupérer le document de tracking
      let trackingDoc;
      if (trackingId) {
        trackingDoc = await db.collection("restore_operations").doc(trackingId).get();
      } else {
        const query = await db
          .collection("restore_operations")
          .where("operationName", "==", operationName)
          .limit(1)
          .get();
        trackingDoc = query.docs[0];
      }

      if (!trackingDoc || !trackingDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Restore operation not found");
      }

      const trackingData = trackingDoc.data()!;

      // Si déjà terminé, retourner le statut
      if (trackingData.status === "completed" || trackingData.status === "failed") {
        return {
          success: true,
          done: true,
          status: trackingData.status,
          error: trackingData.error || null,
          completedAt: trackingData.completedAt?.toDate?.()?.toISOString(),
        };
      }

      // L'opération est en cours - vérifier si elle dépasse le timeout estimé
      const createdAt = trackingData.createdAt?.toDate?.();
      const elapsedMinutes = createdAt
        ? Math.floor((Date.now() - createdAt.getTime()) / 60000)
        : 0;

      // Si plus de 30 minutes, considérer comme potentiellement terminé ou échoué
      if (elapsedMinutes > 30) {
        return {
          success: true,
          done: false,
          status: "in_progress",
          message: `L'opération dure depuis ${elapsedMinutes} minutes. Vérifiez les logs GCP si nécessaire.`,
          operationName: trackingData.operationName,
          elapsedMinutes,
        };
      }

      return {
        success: true,
        done: false,
        status: "in_progress",
        message: `L'opération est en cours depuis ${elapsedMinutes} minute(s)...`,
        operationName: trackingData.operationName,
        elapsedMinutes,
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[AdminRestore] Status check failed:", err);
      throw new functions.https.HttpsError("internal", err.message);
    }
  });

/**
 * Restaure les utilisateurs Firebase Auth depuis un backup
 */
export const adminRestoreAuth = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 540, memory: "1GB" })
  .https.onCall(async (data: { backupId: string; uids?: string[]; dryRun?: boolean }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    if (!(await isAdmin(context.auth.uid))) {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    const { backupId, uids, dryRun = false } = data;
    const db = getDb();
    const storage = admin.storage().bucket();
    const startTime = Date.now();

    try {
      // Log l'action
      const auditRef = await db.collection("admin_audit_logs").add({
        action: "RESTORE_AUTH_INITIATED",
        adminId: context.auth.uid,
        metadata: { backupId, uidsCount: uids?.length, dryRun },
        createdAt: admin.firestore.Timestamp.now(),
        status: "in_progress",
      });

      // Récupérer le fichier de backup
      const storagePath = `auth_backups/${backupId}.json`;
      const file = storage.file(storagePath);

      const [exists] = await file.exists();
      if (!exists) {
        throw new functions.https.HttpsError("not-found", "Backup file not found in storage");
      }

      const [contents] = await file.download();
      const users = JSON.parse(contents.toString());

      const result: RestoreResult = {
        success: true,
        backupId,
        collectionsRestored: ["auth"],
        documentsProcessed: 0,
        documentsCreated: 0,
        documentsUpdated: 0,
        documentsSkipped: 0,
        errors: [],
        dryRun,
        executionTimeMs: 0,
      };

      // Filtrer par UIDs si spécifié
      const usersToRestore = uids
        ? users.filter((u: { uid: string }) => uids.includes(u.uid))
        : users;

      for (const userData of usersToRestore) {
        result.documentsProcessed++;

        if (dryRun) {
          // En dry run, on vérifie juste si l'utilisateur existe
          try {
            await admin.auth().getUser(userData.uid);
            result.documentsSkipped++; // Existe déjà
          } catch {
            result.documentsCreated++; // Serait créé
          }
          continue;
        }

        try {
          // Vérifier si l'utilisateur existe
          try {
            await admin.auth().getUser(userData.uid);
            // Utilisateur existe, mettre à jour les claims si nécessaire
            if (userData.customClaims) {
              await admin.auth().setCustomUserClaims(userData.uid, userData.customClaims);
              result.documentsUpdated++;
            } else {
              result.documentsSkipped++;
            }
          } catch {
            // Utilisateur n'existe pas, le recréer
            await admin.auth().createUser({
              uid: userData.uid,
              email: userData.email,
              emailVerified: userData.emailVerified,
              displayName: userData.displayName,
              photoURL: userData.photoURL,
              phoneNumber: userData.phoneNumber,
              disabled: userData.disabled,
            });

            // Restaurer les custom claims
            if (userData.customClaims) {
              await admin.auth().setCustomUserClaims(userData.uid, userData.customClaims);
            }
            result.documentsCreated++;
          }
        } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          result.errors.push({ collection: "auth", error: `${userData.uid}: ${err.message}` });
        }
      }

      result.executionTimeMs = Date.now() - startTime;

      // Mettre à jour l'audit log
      await auditRef.update({
        status: "completed",
        result,
        completedAt: admin.firestore.Timestamp.now(),
      });

      logger.info(`[AdminRestore] Auth restore completed`, result);

      return result;

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[AdminRestore] Auth restore failed:", err);
      throw new functions.https.HttpsError("internal", err.message);
    }
  });

/**
 * Crée un backup manuel immédiat
 */
export const adminCreateManualBackup = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 300, memory: "256MB" })
  .https.onCall(async (data: { includeAuth?: boolean; description?: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    if (!(await isAdmin(context.auth.uid))) {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    const { includeAuth = false, description } = data;
    const db = getDb();
    const startTime = Date.now();

    try {
      const client = new admin.firestore.v1.FirestoreAdminClient();
      const projectId = process.env.GCLOUD_PROJECT as string;
      const bucket = `gs://${projectId}.firebasestorage.app`;
      const databaseName = client.databasePath(projectId, "(default)");
      const timestamp = Date.now();

      // Log l'action
      await db.collection("admin_audit_logs").add({
        action: "MANUAL_BACKUP_CREATED",
        adminId: context.auth.uid,
        metadata: { includeAuth, description },
        createdAt: admin.firestore.Timestamp.now(),
      });

      // Créer le backup Firestore
      const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix: `${bucket}/manual-backups/admin-${timestamp}`,
        collectionIds: [],
      });

      // Obtenir les counts
      const collectionCounts = await getCurrentCollectionCounts();
      const totalDocuments = Object.values(collectionCounts).reduce(
        (a, b) => (b > 0 ? a + b : a),
        0
      );

      // Sauvegarder les métadonnées
      const backupDoc = await db.collection("backups").add({
        type: "manual",
        backupType: "admin",
        status: "completed",
        operationName: operation.name,
        bucketPath: `${bucket}/manual-backups/admin-${timestamp}`,
        createdBy: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp,
        description,
        collectionCounts,
        totalDocuments,
        includeAuth,
        executionTimeMs: Date.now() - startTime,
        retentionDays: BACKUP_CONFIG.STANDARD_RETENTION_DAYS,
      });

      return {
        success: true,
        backupId: backupDoc.id,
        operationName: operation.name,
        totalDocuments,
        collectionCounts,
        executionTimeMs: Date.now() - startTime,
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[AdminBackup] Manual backup failed:", err);
      throw new functions.https.HttpsError("internal", err.message);
    }
  });

/**
 * Supprime un backup (admin uniquement)
 */
export const adminDeleteBackup = functions
  .region("europe-west1")
  .https.onCall(async (data: { backupId: string; backupType: "firestore" | "auth" }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    if (!(await isAdmin(context.auth.uid))) {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    const { backupId, backupType } = data;
    const db = getDb();

    try {
      const collection = backupType === "auth" ? "auth_backups" : "backups";

      // Vérifier que le backup existe
      const doc = await db.collection(collection).doc(backupId).get();
      if (!doc.exists) {
        throw new functions.https.HttpsError("not-found", "Backup not found");
      }

      // Log l'action
      await db.collection("admin_audit_logs").add({
        action: "BACKUP_DELETED",
        adminId: context.auth.uid,
        metadata: { backupId, backupType },
        createdAt: admin.firestore.Timestamp.now(),
      });

      // Supprimer le document (le fichier Storage sera nettoyé par le cleanup job)
      await doc.ref.delete();

      return { success: true, backupId };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("[AdminBackup] Delete backup failed:", err);
      throw new functions.https.HttpsError("internal", err.message);
    }
  });

/**
 * Liste les backups GCP natifs (PITR)
 */
export const adminListGcpBackups = functions
  .region("europe-west1")
  .runWith({ timeoutSeconds: 60 })
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }

    if (!(await isAdmin(context.auth.uid))) {
      throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }

    try {
      // Cette fonction retourne les instructions pour lister les backups GCP
      // Car l'API Firestore Admin v1 pour listBackups nécessite des permissions spéciales
      return {
        success: true,
        message: "Use gcloud command to list GCP backups",
        command: "gcloud firestore backups list --project=sos-urgently-ac307",
        note: "GCP backups are managed automatically with 98-day retention",
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new functions.https.HttpsError("internal", err.message);
    }
  });
