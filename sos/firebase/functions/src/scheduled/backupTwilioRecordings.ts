/**
 * Scheduled Job pour sauvegarder les recordings Twilio
 *
 * Les recordings Twilio expirent après 30 jours par défaut.
 * Ce job télécharge les recordings et les sauvegarde dans Firebase Storage
 * pour une conservation à long terme.
 *
 * Exécute quotidiennement pour traiter les recordings des 7 derniers jours
 * (avec une marge de sécurité avant expiration).
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import fetch from 'node-fetch';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Nombre de jours max avant expiration (Twilio = 30 jours)
  TWILIO_EXPIRATION_DAYS: 30,
  // Nombre de jours de sécurité (backup avant ce délai)
  SAFETY_MARGIN_DAYS: 7,
  // Nombre de recordings à traiter par exécution
  BATCH_SIZE: 20,
  // Dossier de destination dans Firebase Storage
  STORAGE_PATH: 'call_recordings_backup',
  // Durée max d'exécution (en secondes)
  TIMEOUT_SECONDS: 540, // 9 minutes
  // Retry configuration
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000, // 1 seconde, puis 2s, 4s (exponential)
  RETRY_BATCH_SIZE: 10 // Nombre de recordings failed à retenter par exécution
};

// ============================================================================
// TYPES
// ============================================================================

interface CallRecording {
  id: string;
  sessionId: string;
  recordingSid: string;
  recordingUrl: string;
  recordingDuration?: number;
  recordingStatus: string;
  conferenceSid?: string;
  callSid?: string;
  createdAt: FirebaseFirestore.Timestamp;
  // Backup fields
  backupUrl?: string;
  backupPath?: string;
  backedUpAt?: FirebaseFirestore.Timestamp;
  backupStatus?: 'pending' | 'completed' | 'failed' | 'permanent_failure';
  backupError?: string;
  // Retry tracking
  backupAttempts?: number;
  lastBackupAttempt?: FirebaseFirestore.Timestamp;
  backupErrors?: string[];
  nextRetryAfter?: FirebaseFirestore.Timestamp;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDb = () => admin.firestore();
const getStorage = () => admin.storage().bucket();

/**
 * Pause l'exécution pour un délai donné
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calcule le délai de retry avec backoff exponentiel
 */
function calculateRetryDelay(attempt: number): number {
  return CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Calcule la date du prochain retry
 */
function calculateNextRetryTime(attempt: number): Date {
  // Délai progressif: 5min, 30min, 2h
  const delays = [5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000];
  const delayMs = delays[Math.min(attempt, delays.length - 1)];
  return new Date(Date.now() + delayMs);
}

/**
 * Récupère les credentials Twilio depuis les variables d'environnement
 */
function getTwilioCredentials(): { accountSid: string; authToken: string } {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  return { accountSid, authToken };
}

/**
 * Télécharge un recording depuis Twilio avec retry automatique
 */
async function downloadRecording(recordingUrl: string, maxRetries: number = 3): Promise<Buffer> {
  const { accountSid, authToken } = getTwilioCredentials();

  // Twilio recording URLs peuvent être relatives ou absolues
  let fullUrl = recordingUrl;
  if (!recordingUrl.startsWith('http')) {
    fullUrl = `https://api.twilio.com${recordingUrl}`;
  }

  // Ajouter .mp3 pour obtenir le format audio
  if (!fullUrl.includes('.mp3') && !fullUrl.includes('.wav')) {
    fullUrl = `${fullUrl}.mp3`;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateRetryDelay(attempt - 1);
        logger.info(`[TwilioBackup] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
        await sleep(delay);
      }

      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        }
      });

      if (!response.ok) {
        // 404 = recording déjà expiré, ne pas retry
        if (response.status === 404) {
          throw new Error(`Recording not found (expired?): ${response.status}`);
        }
        // 429 = rate limit, attendre plus longtemps
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          logger.warn(`[TwilioBackup] Rate limited, waiting ${retryAfter}s`);
          await sleep(retryAfter * 1000);
          continue;
        }
        throw new Error(`Failed to download recording: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Ne pas retry pour les erreurs permanentes (404)
      if (lastError.message.includes('not found') || lastError.message.includes('expired')) {
        throw lastError;
      }

      logger.warn(`[TwilioBackup] Download attempt ${attempt + 1} failed: ${lastError.message}`);
    }
  }

  throw lastError || new Error('Download failed after all retries');
}

/**
 * Upload un fichier vers Firebase Storage
 */
async function uploadToStorage(
  buffer: Buffer,
  path: string,
  metadata: Record<string, string>
): Promise<string> {
  const bucket = getStorage();
  const file = bucket.file(path);

  await file.save(buffer, {
    metadata: {
      contentType: 'audio/mpeg',
      metadata
    }
  });

  // Générer une URL signée valide 10 ans (pour accès long terme)
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000 // 10 ans
  });

  return signedUrl;
}

// ============================================================================
// MAIN SCHEDULED FUNCTION
// ============================================================================

/**
 * Job quotidien pour sauvegarder les recordings Twilio
 * Exécute tous les jours à 2h du matin (heure de Paris)
 */
export const backupTwilioRecordings = onSchedule(
  {
    schedule: '0 2 * * *', // Tous les jours à 2h
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: CONFIG.TIMEOUT_SECONDS
  },
  async () => {
    logger.info('[TwilioBackup] Starting daily recording backup...');

    const db = getDb();
    const now = new Date();
    const startTime = Date.now();

    // Calculer la date limite (recordings créés il y a plus de X jours mais pas encore backupés)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.SAFETY_MARGIN_DAYS);

    // Date minimum (ne pas traiter les recordings trop vieux, probablement déjà expirés)
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - CONFIG.TWILIO_EXPIRATION_DAYS + 3);

    try {
      // Récupérer les recordings à sauvegarder
      const recordingsQuery = await db.collection('call_recordings')
        .where('recordingStatus', '==', 'completed')
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(cutoffDate))
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(minDate))
        .orderBy('createdAt', 'asc')
        .limit(CONFIG.BATCH_SIZE)
        .get();

      // Filtrer ceux qui n'ont pas encore été backupés
      const recordingsToBackup = recordingsQuery.docs.filter(doc => {
        const data = doc.data();
        return !data.backupUrl && data.backupStatus !== 'completed';
      });

      if (recordingsToBackup.length === 0) {
        logger.info('[TwilioBackup] No recordings to backup');
        return;
      }

      logger.info(`[TwilioBackup] Found ${recordingsToBackup.length} recordings to backup`);

      let successCount = 0;
      let failCount = 0;

      for (const doc of recordingsToBackup) {
        // Vérifier le timeout
        if (Date.now() - startTime > (CONFIG.TIMEOUT_SECONDS - 60) * 1000) {
          logger.warn('[TwilioBackup] Approaching timeout, stopping batch');
          break;
        }

        const recording = { id: doc.id, ...doc.data() } as CallRecording;

        try {
          logger.info(`[TwilioBackup] Processing recording ${recording.recordingSid}`);

          // Télécharger le recording
          const audioBuffer = await downloadRecording(recording.recordingUrl);

          // Construire le chemin de stockage
          const timestamp = recording.createdAt.toDate();
          const year = timestamp.getFullYear();
          const month = String(timestamp.getMonth() + 1).padStart(2, '0');
          const day = String(timestamp.getDate()).padStart(2, '0');
          const storagePath = `${CONFIG.STORAGE_PATH}/${year}/${month}/${day}/${recording.recordingSid}.mp3`;

          // Upload vers Firebase Storage
          const backupUrl = await uploadToStorage(audioBuffer, storagePath, {
            recordingSid: recording.recordingSid,
            sessionId: recording.sessionId || '',
            originalUrl: recording.recordingUrl,
            duration: String(recording.recordingDuration || 0),
            backedUpAt: now.toISOString()
          });

          // Mettre à jour le document Firestore
          await doc.ref.update({
            backupUrl,
            backupPath: storagePath,
            backedUpAt: admin.firestore.Timestamp.now(),
            backupStatus: 'completed'
          });

          successCount++;
          logger.info(`[TwilioBackup] Successfully backed up recording ${recording.recordingSid}`);

        } catch (error: unknown) {
          failCount++;
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error(`[TwilioBackup] Failed to backup recording ${recording.recordingSid}:`, err);

          const currentAttempts = (recording.backupAttempts || 0) + 1;
          const isExpired = err.message.includes('not found') || err.message.includes('expired');
          const isPermanentFailure = currentAttempts >= CONFIG.MAX_RETRIES || isExpired;

          // Collecter l'historique des erreurs
          const errorHistory = recording.backupErrors || [];
          errorHistory.push(`[${new Date().toISOString()}] ${err.message}`);

          // Marquer selon le nombre de tentatives
          await doc.ref.update({
            backupStatus: isPermanentFailure ? 'permanent_failure' : 'failed',
            backupError: err.message,
            backupAttempts: currentAttempts,
            backupErrors: errorHistory.slice(-5), // Garder les 5 dernières erreurs
            lastBackupAttempt: admin.firestore.Timestamp.now(),
            nextRetryAfter: isPermanentFailure
              ? null
              : admin.firestore.Timestamp.fromDate(calculateNextRetryTime(currentAttempts))
          });

          if (isPermanentFailure) {
            logger.error(`[TwilioBackup] Permanent failure for ${recording.recordingSid} after ${currentAttempts} attempts`);
          }
        }
      }

      // Log des statistiques
      await db.collection('system_logs').add({
        type: 'twilio_backup',
        success: successCount,
        failed: failCount,
        total: recordingsToBackup.length,
        createdAt: admin.firestore.Timestamp.now()
      });

      logger.info(`[TwilioBackup] Completed. Success: ${successCount}, Failed: ${failCount}`);

    } catch (error) {
      logger.error('[TwilioBackup] Fatal error:', error);
      throw error;
    }
  }
);

/**
 * Job pour retenter les backups en échec
 * Exécute toutes les 4 heures
 */
export const retryFailedTwilioBackups = onSchedule(
  {
    // OPTIMIZED: Changed from every 4 hours to every 6 hours to reduce invocations by 33%
    // Previous: 6 invocations/day → Now: 4 invocations/day
    schedule: '0 */6 * * *', // Toutes les 6 heures
    timeZone: 'Europe/Paris',
    region: 'europe-west1',
    memory: '512MiB', // Keep 512MiB - downloads audio files
    timeoutSeconds: CONFIG.TIMEOUT_SECONDS
  },
  async () => {
    logger.info('[TwilioBackup] Starting retry of failed backups...');

    const db = getDb();
    const now = admin.firestore.Timestamp.now();
    const startTime = Date.now();

    try {
      // Récupérer les recordings en échec éligibles pour retry
      const failedRecordings = await db.collection('call_recordings')
        .where('backupStatus', '==', 'failed')
        .where('nextRetryAfter', '<=', now)
        .orderBy('nextRetryAfter', 'asc')
        .limit(CONFIG.RETRY_BATCH_SIZE)
        .get();

      if (failedRecordings.empty) {
        logger.info('[TwilioBackup] No failed recordings eligible for retry');
        return;
      }

      logger.info(`[TwilioBackup] Found ${failedRecordings.size} recordings to retry`);

      let successCount = 0;
      let failCount = 0;

      for (const doc of failedRecordings.docs) {
        // Vérifier le timeout
        if (Date.now() - startTime > (CONFIG.TIMEOUT_SECONDS - 60) * 1000) {
          logger.warn('[TwilioBackup] Approaching timeout, stopping retry batch');
          break;
        }

        const recording = { id: doc.id, ...doc.data() } as CallRecording;

        try {
          logger.info(`[TwilioBackup] Retrying recording ${recording.recordingSid} (attempt ${(recording.backupAttempts || 0) + 1})`);

          // Télécharger le recording
          const audioBuffer = await downloadRecording(recording.recordingUrl);

          // Construire le chemin de stockage
          const timestamp = recording.createdAt.toDate();
          const year = timestamp.getFullYear();
          const month = String(timestamp.getMonth() + 1).padStart(2, '0');
          const day = String(timestamp.getDate()).padStart(2, '0');
          const storagePath = `${CONFIG.STORAGE_PATH}/${year}/${month}/${day}/${recording.recordingSid}.mp3`;

          // Upload vers Firebase Storage
          const backupUrl = await uploadToStorage(audioBuffer, storagePath, {
            recordingSid: recording.recordingSid,
            sessionId: recording.sessionId || '',
            originalUrl: recording.recordingUrl,
            duration: String(recording.recordingDuration || 0),
            backedUpAt: new Date().toISOString(),
            retriedAfterFailure: 'true'
          });

          // Mettre à jour le document Firestore
          await doc.ref.update({
            backupUrl,
            backupPath: storagePath,
            backedUpAt: admin.firestore.Timestamp.now(),
            backupStatus: 'completed',
            backupError: admin.firestore.FieldValue.delete(),
            nextRetryAfter: admin.firestore.FieldValue.delete()
          });

          successCount++;
          logger.info(`[TwilioBackup] Retry successful for ${recording.recordingSid}`);

        } catch (error: unknown) {
          failCount++;
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error(`[TwilioBackup] Retry failed for ${recording.recordingSid}:`, err);

          const currentAttempts = (recording.backupAttempts || 0) + 1;
          const isExpired = err.message.includes('not found') || err.message.includes('expired');
          const isPermanentFailure = currentAttempts >= CONFIG.MAX_RETRIES || isExpired;

          const errorHistory = recording.backupErrors || [];
          errorHistory.push(`[${new Date().toISOString()}] Retry: ${err.message}`);

          await doc.ref.update({
            backupStatus: isPermanentFailure ? 'permanent_failure' : 'failed',
            backupError: err.message,
            backupAttempts: currentAttempts,
            backupErrors: errorHistory.slice(-5),
            lastBackupAttempt: admin.firestore.Timestamp.now(),
            nextRetryAfter: isPermanentFailure
              ? admin.firestore.FieldValue.delete()
              : admin.firestore.Timestamp.fromDate(calculateNextRetryTime(currentAttempts))
          });
        }
      }

      // Log des statistiques de retry
      await db.collection('system_logs').add({
        type: 'twilio_backup_retry',
        success: successCount,
        failed: failCount,
        total: failedRecordings.size,
        createdAt: admin.firestore.Timestamp.now()
      });

      // Créer une alerte si trop d'échecs permanents
      if (failCount > 0) {
        const permanentFailures = await db.collection('call_recordings')
          .where('backupStatus', '==', 'permanent_failure')
          .count()
          .get();

        if (permanentFailures.data().count > 10) {
          await db.collection('system_alerts').add({
            type: 'twilio_backup_failures',
            severity: 'warning',
            message: `${permanentFailures.data().count} recordings have permanently failed backup`,
            acknowledged: false,
            createdAt: admin.firestore.Timestamp.now()
          });
        }
      }

      logger.info(`[TwilioBackup] Retry completed. Success: ${successCount}, Failed: ${failCount}`);

    } catch (error) {
      logger.error('[TwilioBackup] Retry job fatal error:', error);
      throw error;
    }
  }
);

/**
 * Callable function pour déclencher manuellement un backup (Admin)
 */
export const triggerTwilioBackup = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Vérifier l'authentification admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { recordingId, forceAll } = data as { recordingId?: string; forceAll?: boolean };

    try {
      const db = getDb();

      if (recordingId) {
        // Backup d'un recording spécifique
        const recordingDoc = await db.collection('call_recordings').doc(recordingId).get();

        if (!recordingDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Recording not found');
        }

        const recording = { id: recordingDoc.id, ...recordingDoc.data() } as CallRecording;

        if (!recording.recordingUrl) {
          throw new functions.https.HttpsError('failed-precondition', 'No recording URL available');
        }

        // Télécharger et uploader
        const audioBuffer = await downloadRecording(recording.recordingUrl);

        const timestamp = recording.createdAt.toDate();
        const year = timestamp.getFullYear();
        const month = String(timestamp.getMonth() + 1).padStart(2, '0');
        const day = String(timestamp.getDate()).padStart(2, '0');
        const storagePath = `${CONFIG.STORAGE_PATH}/${year}/${month}/${day}/${recording.recordingSid}.mp3`;

        const backupUrl = await uploadToStorage(audioBuffer, storagePath, {
          recordingSid: recording.recordingSid,
          sessionId: recording.sessionId || '',
          originalUrl: recording.recordingUrl,
          duration: String(recording.recordingDuration || 0),
          backedUpAt: new Date().toISOString()
        });

        await recordingDoc.ref.update({
          backupUrl,
          backupPath: storagePath,
          backedUpAt: admin.firestore.Timestamp.now(),
          backupStatus: 'completed'
        });

        // Log l'action admin
        await db.collection('admin_audit_logs').add({
          action: 'MANUAL_TWILIO_BACKUP',
          adminId: context.auth.uid,
          targetId: recordingId,
          targetType: 'call_recording',
          createdAt: admin.firestore.Timestamp.now()
        });

        return { success: true, backupUrl, message: `Recording ${recordingId} backed up successfully` };

      } else if (forceAll) {
        // Compter les recordings en attente
        const pendingCount = await db.collection('call_recordings')
          .where('recordingStatus', '==', 'completed')
          .where('backupStatus', '!=', 'completed')
          .count()
          .get();

        // Log l'action admin
        await db.collection('admin_audit_logs').add({
          action: 'TRIGGER_MASS_TWILIO_BACKUP',
          adminId: context.auth.uid,
          metadata: { pendingCount: pendingCount.data().count },
          createdAt: admin.firestore.Timestamp.now()
        });

        return {
          success: true,
          message: `Backup job will process ${pendingCount.data().count} recordings. Check system logs for progress.`
        };
      }

      throw new functions.https.HttpsError('invalid-argument', 'Specify recordingId or forceAll=true');

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[Admin] Trigger backup failed:', err);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Callable function pour obtenir les stats de backup (Admin)
 */
export const getTwilioBackupStats = functions
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
      const db = getDb();

      // Compter les recordings par statut
      const [completedSnap, pendingSnap, failedSnap, totalSnap] = await Promise.all([
        db.collection('call_recordings').where('backupStatus', '==', 'completed').count().get(),
        db.collection('call_recordings')
          .where('recordingStatus', '==', 'completed')
          .where('backupStatus', '!=', 'completed')
          .count()
          .get(),
        db.collection('call_recordings').where('backupStatus', '==', 'failed').count().get(),
        db.collection('call_recordings').where('recordingStatus', '==', 'completed').count().get()
      ]);

      // Calculer les recordings proches de l'expiration
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - (CONFIG.TWILIO_EXPIRATION_DAYS - 5));

      const expiringSnap = await db.collection('call_recordings')
        .where('recordingStatus', '==', 'completed')
        .where('backupStatus', '!=', 'completed')
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(expirationDate))
        .count()
        .get();

      return {
        total: totalSnap.data().count,
        backed_up: completedSnap.data().count,
        pending: pendingSnap.data().count,
        failed: failedSnap.data().count,
        expiring_soon: expiringSnap.data().count,
        config: {
          expiration_days: CONFIG.TWILIO_EXPIRATION_DAYS,
          safety_margin_days: CONFIG.SAFETY_MARGIN_DAYS,
          batch_size: CONFIG.BATCH_SIZE
        }
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[Admin] Get backup stats failed:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });
