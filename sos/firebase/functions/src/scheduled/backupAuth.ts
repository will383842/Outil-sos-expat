/**
 * Scheduled Job pour sauvegarder les utilisateurs Firebase Auth
 *
 * Firebase Auth ne dispose pas de backup automatique intégré.
 * Ce job exporte régulièrement les données utilisateurs vers Firestore
 * et/ou Cloud Storage pour permettre une restauration en cas de problème.
 *
 * Exécute hebdomadairement le dimanche à 3h du matin.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Nombre d'utilisateurs par batch (max Firebase Admin = 1000)
  BATCH_SIZE: 1000,
  // Collection de backup
  BACKUP_COLLECTION: 'auth_backups',
  // Durée de rétention des backups (jours)
  RETENTION_DAYS: 90,
  // Storage path pour les backups complets
  STORAGE_PATH: 'auth_backups'
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

interface BackupMetadata {
  id: string;
  createdAt: FirebaseFirestore.Timestamp;
  totalUsers: number;
  batchCount: number;
  status: 'in_progress' | 'completed' | 'failed';
  errorMessage?: string;
  storageUrl?: string;
  completedAt?: FirebaseFirestore.Timestamp;
  executionTimeMs?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convertit un UserRecord en format sérialisable
 */
function serializeUser(user: admin.auth.UserRecord): AuthBackupRecord {
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    photoURL: user.photoURL,
    phoneNumber: user.phoneNumber,
    disabled: user.disabled,
    providerData: user.providerData.map(provider => ({
      providerId: provider.providerId,
      uid: provider.uid,
      displayName: provider.displayName,
      email: provider.email,
      phoneNumber: provider.phoneNumber,
      photoURL: provider.photoURL
    })),
    customClaims: user.customClaims,
    creationTime: user.metadata.creationTime,
    lastSignInTime: user.metadata.lastSignInTime,
    metadata: {
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
      lastRefreshTime: user.metadata.lastRefreshTime || undefined
    }
  };
}

/**
 * Liste tous les utilisateurs par batch
 */
async function* listAllUsers(): AsyncGenerator<admin.auth.UserRecord[], void, unknown> {
  let pageToken: string | undefined;

  do {
    const listResult = await admin.auth().listUsers(CONFIG.BATCH_SIZE, pageToken);
    yield listResult.users;
    pageToken = listResult.pageToken;
  } while (pageToken);
}

// ============================================================================
// MAIN SCHEDULED FUNCTION
// ============================================================================

/**
 * Backup hebdomadaire des utilisateurs Firebase Auth
 * Exécute tous les dimanches à 3h du matin
 */
export const backupFirebaseAuth = onSchedule(
  {
    schedule: '0 3 * * 0', // Dimanche 3h
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 540
  },
  async () => {
    logger.info('[AuthBackup] Starting weekly auth backup...');

    const db = admin.firestore();
    const storage = admin.storage().bucket();
    const startTime = Date.now();

    // Créer le document de métadonnées
    const backupId = `auth_backup_${new Date().toISOString().split('T')[0]}`;
    const metadataRef = db.collection(CONFIG.BACKUP_COLLECTION).doc(backupId);

    const metadata: BackupMetadata = {
      id: backupId,
      createdAt: admin.firestore.Timestamp.now(),
      totalUsers: 0,
      batchCount: 0,
      status: 'in_progress'
    };

    await metadataRef.set(metadata);

    try {
      const allUsers: AuthBackupRecord[] = [];
      let batchCount = 0;

      // Collecter tous les utilisateurs
      for await (const userBatch of listAllUsers()) {
        batchCount++;
        const serializedBatch = userBatch.map(serializeUser);
        allUsers.push(...serializedBatch);

        logger.info(`[AuthBackup] Processed batch ${batchCount}, total users: ${allUsers.length}`);
      }

      // Sauvegarder dans Cloud Storage (JSON complet)
      const storagePath = `${CONFIG.STORAGE_PATH}/${backupId}.json`;
      const file = storage.file(storagePath);

      await file.save(JSON.stringify(allUsers, null, 2), {
        metadata: {
          contentType: 'application/json',
          metadata: {
            backupId,
            userCount: String(allUsers.length),
            createdAt: new Date().toISOString()
          }
        }
      });

      // Générer URL signée (valide 90 jours)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000
      });

      // Sauvegarder aussi un résumé dans Firestore (sans données sensibles)
      const summary = {
        totalUsers: allUsers.length,
        verifiedEmails: allUsers.filter(u => u.emailVerified).length,
        disabledAccounts: allUsers.filter(u => u.disabled).length,
        withPhoneNumber: allUsers.filter(u => u.phoneNumber).length,
        providers: {
          password: allUsers.filter(u => u.providerData.some(p => p.providerId === 'password')).length,
          google: allUsers.filter(u => u.providerData.some(p => p.providerId === 'google.com')).length,
          phone: allUsers.filter(u => u.providerData.some(p => p.providerId === 'phone')).length
        }
      };

      // Mettre à jour les métadonnées
      await metadataRef.update({
        status: 'completed',
        totalUsers: allUsers.length,
        batchCount,
        storageUrl: signedUrl,
        summary,
        completedAt: admin.firestore.Timestamp.now(),
        executionTimeMs: Date.now() - startTime
      });

      // Log dans system_logs
      await db.collection('system_logs').add({
        type: 'auth_backup',
        backupId,
        userCount: allUsers.length,
        success: true,
        executionTimeMs: Date.now() - startTime,
        createdAt: admin.firestore.Timestamp.now()
      });

      logger.info(`[AuthBackup] Completed. Backed up ${allUsers.length} users in ${Date.now() - startTime}ms`);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[AuthBackup] Failed:', err);

      await metadataRef.update({
        status: 'failed',
        errorMessage: err.message,
        completedAt: admin.firestore.Timestamp.now(),
        executionTimeMs: Date.now() - startTime
      });

      // Log l'erreur
      await db.collection('system_logs').add({
        type: 'auth_backup',
        backupId,
        success: false,
        error: err.message,
        createdAt: admin.firestore.Timestamp.now()
      });

      throw error;
    }
  }
);

/**
 * Nettoie les anciens backups (après 90 jours)
 * Exécute le 1er de chaque mois à 4h
 */
export const cleanupOldAuthBackups = onSchedule(
  {
    schedule: '0 4 1 * *', // 1er du mois à 4h
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '256MiB'
  },
  async () => {
    logger.info('[AuthBackup] Starting cleanup of old backups...');

    const db = admin.firestore();
    const storage = admin.storage().bucket();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.RETENTION_DAYS);

    try {
      // Trouver les backups anciens
      const oldBackups = await db.collection(CONFIG.BACKUP_COLLECTION)
        .where('createdAt', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
        .get();

      let deletedCount = 0;

      for (const doc of oldBackups.docs) {
        // Supprimer le fichier Storage
        try {
          const storagePath = `${CONFIG.STORAGE_PATH}/${doc.id}.json`;
          await storage.file(storagePath).delete();
        } catch (storageError) {
          logger.warn(`[AuthBackup] Could not delete storage file for ${doc.id}:`, storageError);
        }

        // Supprimer le document Firestore
        await doc.ref.delete();
        deletedCount++;
      }

      logger.info(`[AuthBackup] Cleanup completed. Deleted ${deletedCount} old backups.`);

      // Log
      await db.collection('system_logs').add({
        type: 'auth_backup_cleanup',
        deletedCount,
        createdAt: admin.firestore.Timestamp.now()
      });

    } catch (error) {
      logger.error('[AuthBackup] Cleanup failed:', error);
      throw error;
    }
  }
);

/**
 * Admin callable pour déclencher un backup manuel
 */
export const triggerAuthBackup = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
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
    const storage = admin.storage().bucket();
    const startTime = Date.now();

    const backupId = `auth_backup_manual_${Date.now()}`;

    try {
      const allUsers: AuthBackupRecord[] = [];

      for await (const userBatch of listAllUsers()) {
        allUsers.push(...userBatch.map(serializeUser));
      }

      // Sauvegarder
      const storagePath = `${CONFIG.STORAGE_PATH}/${backupId}.json`;
      const file = storage.file(storagePath);

      await file.save(JSON.stringify(allUsers, null, 2), {
        metadata: {
          contentType: 'application/json',
          metadata: { backupId, userCount: String(allUsers.length) }
        }
      });

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000
      });

      // Créer le document de métadonnées
      await db.collection(CONFIG.BACKUP_COLLECTION).doc(backupId).set({
        id: backupId,
        createdAt: admin.firestore.Timestamp.now(),
        totalUsers: allUsers.length,
        status: 'completed',
        storageUrl: signedUrl,
        manual: true,
        triggeredBy: context.auth.uid,
        executionTimeMs: Date.now() - startTime
      });

      // Log admin audit
      await db.collection('admin_audit_logs').add({
        action: 'MANUAL_AUTH_BACKUP',
        adminId: context.auth.uid,
        targetId: backupId,
        metadata: { userCount: allUsers.length },
        createdAt: admin.firestore.Timestamp.now()
      });

      return {
        success: true,
        backupId,
        userCount: allUsers.length,
        downloadUrl: signedUrl,
        executionTimeMs: Date.now() - startTime
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[AuthBackup] Manual backup failed:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Admin callable pour lister les backups disponibles
 */
export const listAuthBackups = functions
  .region('europe-west1')
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

    try {
      const backups = await admin.firestore()
        .collection(CONFIG.BACKUP_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      return {
        backups: backups.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
          completedAt: doc.data().completedAt?.toDate?.()?.toISOString()
        }))
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new functions.https.HttpsError('internal', err.message);
    }
  });
