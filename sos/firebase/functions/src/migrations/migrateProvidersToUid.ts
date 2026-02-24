/**
 * =============================================================================
 * MIGRATION: Migrate providers to use UID as document ID
 * =============================================================================
 *
 * Ce script migre les providers existants dans Outil-sos-expat pour utiliser
 * le Firebase UID comme document ID au lieu de l'ID auto-généré ou Laravel ID.
 *
 * USAGE:
 * - Déployer: firebase deploy --only functions:migrateProvidersToUid
 * - Exécuter: Appeler la fonction depuis la console Firebase ou via HTTP
 *
 * SÉCURITÉ:
 * - Nécessite les droits admin pour exécuter
 * - Fait un dry-run par défaut (preview=true)
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

// Lazy initialization pattern to avoid initialization during deployment analysis
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

// Firestore reference getter (lazy)
function getDb() {
  ensureInitialized();
  return admin.firestore();
}

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: {
    id: string;
    email?: string;
    status: "migrated" | "skipped" | "error";
    reason?: string;
    newId?: string;
  }[];
}

interface MigrationRequest {
  preview?: boolean; // If true, don't actually migrate, just show what would happen
  limit?: number; // Limit number of providers to process
}

/**
 * Migration function to convert providers to use UID as document ID
 */
export const migrateProvidersToUid = onCall(
  {
    region: "europe-west1",
    timeoutSeconds: 540, // 9 minutes
    memory: "1GiB",
    cpu: 0.083,
  },
  async (request: CallableRequest<MigrationRequest>): Promise<MigrationResult> => {
    // Check if user is admin
    if (!request.auth?.token?.admin && request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const preview = request.data?.preview !== false; // Default to preview mode
    const limit = request.data?.limit || 1000;

    logger.info("[migrateProvidersToUid] Starting migration", { preview, limit });

    const result: MigrationResult = {
      total: 0,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    try {
      // Get all providers
      const providersSnapshot = await getDb()
        .collection("providers")
        .limit(limit)
        .get();

      result.total = providersSnapshot.size;
      logger.info(`[migrateProvidersToUid] Found ${result.total} providers`);

      for (const providerDoc of providersSnapshot.docs) {
        const currentId = providerDoc.id;
        const data = providerDoc.data();
        const email = data.email?.toLowerCase();

        try {
          // Check if already using UID as ID
          if (data.sosProfileId === currentId) {
            result.skipped++;
            result.details.push({
              id: currentId,
              email,
              status: "skipped",
              reason: "Already using UID as ID",
            });
            continue;
          }

          // If sosProfileId exists, use it as the new ID
          let newId = data.sosProfileId;

          // If no sosProfileId, try to find user by email
          if (!newId && email) {
            const usersSnapshot = await getDb()
              .collection("users")
              .where("emailLower", "==", email)
              .limit(1)
              .get();

            if (!usersSnapshot.empty) {
              newId = usersSnapshot.docs[0].id;
            }
          }

          // If still no newId, skip
          if (!newId) {
            result.skipped++;
            result.details.push({
              id: currentId,
              email,
              status: "skipped",
              reason: "Could not determine UID (no sosProfileId and user not found)",
            });
            continue;
          }

          // Check if document with newId already exists
          if (newId !== currentId) {
            const existingDoc = await getDb().collection("providers").doc(newId).get();
            if (existingDoc.exists) {
              result.skipped++;
              result.details.push({
                id: currentId,
                email,
                status: "skipped",
                reason: `Document with UID ${newId} already exists`,
                newId,
              });
              continue;
            }
          }

          // Perform migration (unless preview mode)
          if (!preview) {
            // Create new document with UID as ID
            await getDb().collection("providers").doc(newId).set({
              ...data,
              sosProfileId: newId,
              migratedFrom: currentId,
              migratedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Delete old document (only if different ID)
            if (currentId !== newId) {
              await getDb().collection("providers").doc(currentId).delete();
            }
          }

          result.migrated++;
          result.details.push({
            id: currentId,
            email,
            status: "migrated",
            newId,
          });

        } catch (error) {
          result.errors++;
          result.details.push({
            id: currentId,
            email,
            status: "error",
            reason: error instanceof Error ? error.message : "Unknown error",
          });
          logger.error(`[migrateProvidersToUid] Error migrating ${currentId}:`, error);
        }
      }

      logger.info("[migrateProvidersToUid] Migration completed", {
        preview,
        total: result.total,
        migrated: result.migrated,
        skipped: result.skipped,
        errors: result.errors,
      });

      return result;

    } catch (error) {
      logger.error("[migrateProvidersToUid] Migration failed:", error);
      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "Migration failed"
      );
    }
  }
);
