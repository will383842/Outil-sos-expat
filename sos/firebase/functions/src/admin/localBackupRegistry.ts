/**
 * Local Backup Registry
 *
 * Enregistre les sauvegardes locales effectuées sur le PC de l'admin
 * dans Firestore pour les afficher dans la console d'administration.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

// CRITICAL: Lazy initialization
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
// TYPES
// ============================================================================

interface LocalBackupRecord {
  id?: string;
  backupDate: string; // ISO date string
  backupPath: string; // Local path on PC
  machineName: string; // Computer name
  status: "completed" | "failed" | "partial";
  sizeMB: number;
  components: {
    firestore: boolean;
    storage: boolean;
    auth: boolean;
    secrets: boolean;
    rules: boolean;
    code: boolean;
  };
  stats?: {
    firestoreCollections?: number;
    firestoreDocuments?: number;
    storageFiles?: number;
    authUsers?: number;
  };
  error?: string;
  createdAt: admin.firestore.Timestamp;
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Enregistre un backup local dans Firestore
 * Appelé par le script PowerShell après chaque backup
 */
export const registerLocalBackup = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    const db = getDb();

    // Vérifier l'authentification admin (optionnel, peut être appelé par script)
    // Si appelé par script sans auth, on vérifie un token secret
    const data = request.data;

    if (!data.backupDate || !data.backupPath) {
      throw new HttpsError("invalid-argument", "backupDate and backupPath are required");
    }

    const record: LocalBackupRecord = {
      backupDate: data.backupDate,
      backupPath: data.backupPath,
      machineName: data.machineName || "unknown",
      status: data.status || "completed",
      sizeMB: data.sizeMB || 0,
      components: {
        firestore: data.components?.firestore ?? false,
        storage: data.components?.storage ?? false,
        auth: data.components?.auth ?? false,
        secrets: data.components?.secrets ?? false,
        rules: data.components?.rules ?? false,
        code: data.components?.code ?? false,
      },
      stats: data.stats || {},
      error: data.error,
      createdAt: admin.firestore.Timestamp.now(),
    };

    try {
      const docRef = await db.collection("local_backups").add(record);

      logger.info("Local backup registered", {
        id: docRef.id,
        backupDate: record.backupDate,
        backupPath: record.backupPath,
        sizeMB: record.sizeMB,
      });

      return {
        success: true,
        id: docRef.id,
        message: "Backup enregistré avec succès",
      };
    } catch (error) {
      logger.error("Failed to register local backup", { error });
      throw new HttpsError("internal", "Failed to register backup");
    }
  }
);

/**
 * Liste les backups locaux enregistrés
 * Pour afficher dans la console admin
 */
export const listLocalBackups = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    const db = getDb();

    // Vérifier que l'utilisateur est admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const token = request.auth.token;
    if (token.role !== "admin" && !token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    try {
      const snapshot = await db
        .collection("local_backups")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();

      const backups = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        success: true,
        backups,
        count: backups.length,
      };
    } catch (error) {
      logger.error("Failed to list local backups", { error });
      throw new HttpsError("internal", "Failed to list backups");
    }
  }
);

/**
 * Supprime un enregistrement de backup local
 * (ne supprime pas les fichiers, juste l'entrée Firestore)
 */
export const deleteLocalBackupRecord = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    const db = getDb();

    // Vérifier que l'utilisateur est admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const token = request.auth.token;
    if (token.role !== "admin" && !token.admin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { backupId } = request.data;
    if (!backupId) {
      throw new HttpsError("invalid-argument", "backupId is required");
    }

    try {
      await db.collection("local_backups").doc(backupId).delete();

      return {
        success: true,
        message: "Backup record deleted",
      };
    } catch (error) {
      logger.error("Failed to delete local backup record", { error, backupId });
      throw new HttpsError("internal", "Failed to delete backup record");
    }
  }
);
