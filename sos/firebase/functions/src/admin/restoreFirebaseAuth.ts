/**
 * Fonctions de restauration Firebase Auth depuis les backups
 *
 * Permet de restaurer les utilisateurs depuis les backups JSON
 * créés par backupAuth.ts
 *
 * IMPORTANT: Ces fonctions sont critiques et nécessitent
 * une authentification admin stricte.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import * as crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  BACKUP_COLLECTION: 'auth_backups',
  STORAGE_PATH: 'auth_backups',
  MAX_USERS_PER_BATCH: 100,
  TIMEOUT_SECONDS: 540
};

// ============================================================================
// TYPES
// ============================================================================

interface AuthBackupRecord {
  uid: string;
  email?: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  disabled: boolean;
  providerData: Array<{
    providerId: string;
    uid: string;
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
  }>;
  customClaims?: Record<string, unknown>;
  creationTime?: string;
  lastSignInTime?: string;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
    lastRefreshTime?: string;
  };
}

interface RestoreOptions {
  backupId: string;
  dryRun?: boolean;
  filterByUids?: string[];
  skipExisting?: boolean;
  restoreCustomClaims?: boolean;
}

interface RestoreResult {
  success: boolean;
  dryRun: boolean;
  totalInBackup: number;
  processed: number;
  created: number;
  skipped: number;
  failed: number;
  errors: Array<{ uid: string; email?: string; error: string }>;
  executionTimeMs: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDb = () => admin.firestore();
const getStorage = () => admin.storage().bucket();

/**
 * Vérifie si l'utilisateur est admin
 */
async function verifyAdmin(context: functions.https.CallableContext): Promise<string> {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userDoc = await getDb().collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();

  if (userData?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  return context.auth.uid;
}

/**
 * Télécharge et parse le fichier de backup depuis Storage
 */
async function downloadBackup(backupId: string): Promise<AuthBackupRecord[]> {
  const storagePath = `${CONFIG.STORAGE_PATH}/${backupId}.json`;
  const file = getStorage().file(storagePath);

  const [exists] = await file.exists();
  if (!exists) {
    throw new functions.https.HttpsError('not-found', `Backup file not found: ${storagePath}`);
  }

  const [contents] = await file.download();
  const users = JSON.parse(contents.toString('utf-8')) as AuthBackupRecord[];

  return users;
}

/**
 * Vérifie si un utilisateur existe déjà
 */
async function userExists(uid: string): Promise<boolean> {
  try {
    await admin.auth().getUser(uid);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calcule le checksum d'un backup
 */
function calculateChecksum(data: AuthBackupRecord[]): string {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

// ============================================================================
// MAIN RESTORE FUNCTIONS
// ============================================================================

/**
 * Restaure les utilisateurs Firebase Auth depuis un backup
 *
 * Options:
 * - backupId: ID du backup à restaurer
 * - dryRun: true pour simuler sans créer les utilisateurs
 * - filterByUids: liste d'UIDs spécifiques à restaurer
 * - skipExisting: true pour ignorer les utilisateurs existants
 * - restoreCustomClaims: true pour restaurer les custom claims
 */
export const restoreFirebaseAuth = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: CONFIG.TIMEOUT_SECONDS, memory: '1GB' })
  .https.onCall(async (data: RestoreOptions, context): Promise<RestoreResult> => {
    const startTime = Date.now();
    const adminId = await verifyAdmin(context);

    const {
      backupId,
      dryRun = false,
      filterByUids,
      skipExisting = true,
      restoreCustomClaims = true
    } = data;

    if (!backupId) {
      throw new functions.https.HttpsError('invalid-argument', 'backupId is required');
    }

    logger.info(`[AuthRestore] Starting restore from backup ${backupId}`, {
      dryRun,
      skipExisting,
      restoreCustomClaims,
      adminId
    });

    const result: RestoreResult = {
      success: false,
      dryRun,
      totalInBackup: 0,
      processed: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      executionTimeMs: 0
    };

    try {
      // Vérifier que le backup existe dans Firestore
      const backupDoc = await getDb().collection(CONFIG.BACKUP_COLLECTION).doc(backupId).get();
      if (!backupDoc.exists) {
        throw new functions.https.HttpsError('not-found', `Backup metadata not found: ${backupId}`);
      }

      const backupMetadata = backupDoc.data();
      if (backupMetadata?.status !== 'completed') {
        throw new functions.https.HttpsError('failed-precondition', `Backup status is ${backupMetadata?.status}, expected 'completed'`);
      }

      // Télécharger le backup
      logger.info(`[AuthRestore] Downloading backup file...`);
      const users = await downloadBackup(backupId);
      result.totalInBackup = users.length;

      // Filtrer si nécessaire
      let usersToRestore = users;
      if (filterByUids && filterByUids.length > 0) {
        usersToRestore = users.filter(u => filterByUids.includes(u.uid));
        logger.info(`[AuthRestore] Filtered to ${usersToRestore.length} users`);
      }

      // Calculer le checksum pour audit
      const checksum = calculateChecksum(usersToRestore);
      logger.info(`[AuthRestore] Backup checksum: ${checksum}`);

      // Traiter les utilisateurs
      for (const user of usersToRestore) {
        result.processed++;

        try {
          // Vérifier si l'utilisateur existe
          const exists = await userExists(user.uid);

          if (exists && skipExisting) {
            result.skipped++;
            continue;
          }

          if (exists && !skipExisting) {
            // Supprimer l'utilisateur existant pour le recréer
            if (!dryRun) {
              await admin.auth().deleteUser(user.uid);
            }
          }

          if (!dryRun) {
            // Créer l'utilisateur avec les données du backup
            const createRequest: admin.auth.CreateRequest = {
              uid: user.uid,
              email: user.email,
              emailVerified: user.emailVerified,
              displayName: user.displayName,
              photoURL: user.photoURL,
              phoneNumber: user.phoneNumber,
              disabled: user.disabled
            };

            // Ne pas inclure les valeurs undefined
            Object.keys(createRequest).forEach(key => {
              if ((createRequest as Record<string, unknown>)[key] === undefined) {
                delete (createRequest as Record<string, unknown>)[key];
              }
            });

            await admin.auth().createUser(createRequest);

            // Restaurer les custom claims si demandé
            if (restoreCustomClaims && user.customClaims) {
              await admin.auth().setCustomUserClaims(user.uid, user.customClaims);
            }
          }

          result.created++;
          logger.info(`[AuthRestore] ${dryRun ? '[DRY-RUN] ' : ''}Created user ${user.uid} (${user.email})`);

        } catch (error: unknown) {
          result.failed++;
          const err = error instanceof Error ? error : new Error(String(error));
          result.errors.push({
            uid: user.uid,
            email: user.email,
            error: err.message
          });
          logger.error(`[AuthRestore] Failed to restore user ${user.uid}:`, err.message);
        }

        // Log progression tous les 50 utilisateurs
        if (result.processed % 50 === 0) {
          logger.info(`[AuthRestore] Progress: ${result.processed}/${usersToRestore.length}`);
        }
      }

      result.success = result.failed === 0;
      result.executionTimeMs = Date.now() - startTime;

      // Logger l'action admin
      await getDb().collection('admin_audit_logs').add({
        action: 'RESTORE_FIREBASE_AUTH',
        adminId,
        backupId,
        dryRun,
        result: {
          totalInBackup: result.totalInBackup,
          processed: result.processed,
          created: result.created,
          skipped: result.skipped,
          failed: result.failed
        },
        checksum,
        createdAt: admin.firestore.Timestamp.now()
      });

      // Créer une alerte si des erreurs
      if (result.failed > 0) {
        await getDb().collection('system_alerts').add({
          type: 'auth_restore_errors',
          severity: 'warning',
          message: `Auth restore completed with ${result.failed} errors`,
          metadata: { backupId, errors: result.errors.slice(0, 10) },
          acknowledged: false,
          createdAt: admin.firestore.Timestamp.now()
        });
      }

      logger.info(`[AuthRestore] Completed`, result);

      return result;

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[AuthRestore] Fatal error:', err);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Liste les backups disponibles pour restauration avec validation
 */
export const listRestorableAuthBackups = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    await verifyAdmin(context);

    try {
      const backups = await getDb()
        .collection(CONFIG.BACKUP_COLLECTION)
        .where('status', '==', 'completed')
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get();

      const results = await Promise.all(
        backups.docs.map(async (doc) => {
          const data = doc.data();

          // Vérifier si le fichier existe encore
          const storagePath = `${CONFIG.STORAGE_PATH}/${doc.id}.json`;
          const file = getStorage().file(storagePath);
          const [exists] = await file.exists();

          return {
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString(),
            totalUsers: data.totalUsers,
            status: data.status,
            fileExists: exists,
            summary: data.summary,
            manual: data.manual || false,
            triggeredBy: data.triggeredBy
          };
        })
      );

      return {
        backups: results.filter(b => b.fileExists)
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Valide un backup avant restauration (sans créer d'utilisateurs)
 */
export const validateAuthBackup = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onCall(async (data: { backupId: string }, context) => {
    await verifyAdmin(context);

    const { backupId } = data;
    if (!backupId) {
      throw new functions.https.HttpsError('invalid-argument', 'backupId is required');
    }

    try {
      // Télécharger et analyser
      const users = await downloadBackup(backupId);
      const checksum = calculateChecksum(users);

      // Statistiques
      const stats = {
        totalUsers: users.length,
        withEmail: users.filter(u => u.email).length,
        withPhone: users.filter(u => u.phoneNumber).length,
        verified: users.filter(u => u.emailVerified).length,
        disabled: users.filter(u => u.disabled).length,
        withCustomClaims: users.filter(u => u.customClaims && Object.keys(u.customClaims).length > 0).length,
        roles: {
          admin: users.filter(u => u.customClaims?.role === 'admin').length,
          dev: users.filter(u => u.customClaims?.role === 'dev').length,
          provider: users.filter(u => u.customClaims?.role === 'provider').length,
          client: users.filter(u => u.customClaims?.role === 'client').length
        },
        providers: {
          password: users.filter(u => u.providerData?.some(p => p.providerId === 'password')).length,
          google: users.filter(u => u.providerData?.some(p => p.providerId === 'google.com')).length,
          phone: users.filter(u => u.providerData?.some(p => p.providerId === 'phone')).length
        }
      };

      // Vérifier combien existent déjà
      let existingCount = 0;
      const sampleSize = Math.min(100, users.length);
      const sample = users.slice(0, sampleSize);

      for (const user of sample) {
        if (await userExists(user.uid)) {
          existingCount++;
        }
      }

      const estimatedExisting = Math.round((existingCount / sampleSize) * users.length);

      return {
        valid: true,
        backupId,
        checksum,
        stats,
        existingUsers: {
          sampled: sampleSize,
          existingInSample: existingCount,
          estimatedTotal: estimatedExisting
        }
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Restaure un utilisateur spécifique depuis un backup
 */
export const restoreSingleUser = functions
  .region('europe-west1')
  .https.onCall(async (data: { backupId: string; uid: string; force?: boolean }, context) => {
    const adminId = await verifyAdmin(context);

    const { backupId, uid, force = false } = data;

    if (!backupId || !uid) {
      throw new functions.https.HttpsError('invalid-argument', 'backupId and uid are required');
    }

    try {
      // Télécharger le backup
      const users = await downloadBackup(backupId);
      const user = users.find(u => u.uid === uid);

      if (!user) {
        throw new functions.https.HttpsError('not-found', `User ${uid} not found in backup`);
      }

      // Vérifier si existe
      const exists = await userExists(uid);
      if (exists && !force) {
        throw new functions.https.HttpsError(
          'already-exists',
          `User ${uid} already exists. Use force=true to overwrite`
        );
      }

      if (exists) {
        await admin.auth().deleteUser(uid);
      }

      // Créer l'utilisateur
      const createRequest: admin.auth.CreateRequest = {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        disabled: user.disabled
      };

      // Nettoyer les undefined
      Object.keys(createRequest).forEach(key => {
        if ((createRequest as Record<string, unknown>)[key] === undefined) {
          delete (createRequest as Record<string, unknown>)[key];
        }
      });

      await admin.auth().createUser(createRequest);

      // Restaurer les claims
      if (user.customClaims) {
        await admin.auth().setCustomUserClaims(uid, user.customClaims);
      }

      // Audit log
      await getDb().collection('admin_audit_logs').add({
        action: 'RESTORE_SINGLE_USER',
        adminId,
        backupId,
        targetId: uid,
        targetEmail: user.email,
        forced: force && exists,
        createdAt: admin.firestore.Timestamp.now()
      });

      logger.info(`[AuthRestore] Single user restored: ${uid} (${user.email})`);

      return {
        success: true,
        uid,
        email: user.email,
        customClaims: user.customClaims
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`[AuthRestore] Failed to restore user ${uid}:`, err);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', err.message);
    }
  });
