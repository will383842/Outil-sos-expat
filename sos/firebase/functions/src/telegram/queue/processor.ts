/**
 * Telegram Queue Processor
 *
 * Scheduled function (every minute, maxInstances: 1) qui traite les messages
 * de la queue `telegram_message_queue` et les envoie via l'API Telegram.
 *
 * Architecture clé: un seul processeur = pas de problème de rate limit distribué.
 * Traite les messages "realtime" en priorité, puis "campaign".
 *
 * Protections production:
 * - Récupération des messages bloqués en "sending" (crash recovery)
 * - Claim atomique via transaction (anti double-fire Cloud Scheduler)
 * - Exponential backoff (5s, 10s, 20s) + dead letter après 3 échecs
 */

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { TELEGRAM_BOT_TOKEN } from '../../lib/secrets';
import { sendTelegramMessageDirect } from '../providers/telegramBot';
import {
  QUEUE_COLLECTION,
  RATE_MONITOR_COLLECTION,
  BATCH_SIZE,
  SEND_DELAY_MS,
  RETRY_BACKOFF_BASE_S,
  QUEUE_DEPTH_ALERT_THRESHOLD,
  QueuedTelegramMessage,
} from './types';

const LOG_PREFIX = '[TelegramQueueProcessor]';

/** Durée max en ms avant de considérer un message "sending" comme bloqué */
const STUCK_SENDING_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

// ============================================================================
// HELPERS
// ============================================================================

function getParisHour(): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hourPart = parts.find((p) => p.type === 'hour');
  return (hourPart?.value || '00').padStart(2, '0');
}

function getParisDateKey(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // YYYY-MM-DD (en-CA format)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// STUCK MESSAGE RECOVERY (C2 fix)
// ============================================================================

async function recoverStuckMessages(db: admin.firestore.Firestore): Promise<number> {
  const stuckCutoff = admin.firestore.Timestamp.fromMillis(
    Date.now() - STUCK_SENDING_TIMEOUT_MS
  );

  const stuckSnap = await db
    .collection(QUEUE_COLLECTION)
    .where('status', '==', 'sending')
    .where('createdAt', '<', stuckCutoff)
    .limit(10)
    .get();

  if (stuckSnap.empty) return 0;

  const batch = db.batch();
  for (const doc of stuckSnap.docs) {
    batch.update(doc.ref, { status: 'pending' });
  }
  await batch.commit();

  logger.warn(
    `${LOG_PREFIX} Recovered ${stuckSnap.size} stuck 'sending' messages back to 'pending'`
  );
  return stuckSnap.size;
}

// ============================================================================
// RATE MONITOR UPDATE
// ============================================================================

async function updateRateMonitor(
  db: admin.firestore.Firestore,
  sentCount: number,
  failedCount: number,
  batchDurationMs: number
): Promise<void> {
  const dateKey = getParisDateKey();
  const hour = getParisHour();
  const minuteRate =
    batchDurationMs > 0
      ? Math.round((sentCount / (batchDurationMs / 60000)) * 100) / 100
      : sentCount;

  const monitorRef = db.collection(RATE_MONITOR_COLLECTION).doc(dateKey);

  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(monitorRef);

      if (doc.exists) {
        const data = doc.data()!;
        const currentPeak = data.peakMinuteRate || 0;
        tx.update(monitorRef, {
          totalSent: admin.firestore.FieldValue.increment(sentCount),
          totalFailed: admin.firestore.FieldValue.increment(failedCount),
          peakMinuteRate: minuteRate > currentPeak ? minuteRate : currentPeak,
          [`hourlyCounts.${hour}`]: admin.firestore.FieldValue.increment(sentCount),
          lastUpdatedAt: admin.firestore.Timestamp.now(),
        });
      } else {
        tx.set(monitorRef, {
          totalSent: sentCount,
          totalFailed: failedCount,
          totalQueued: 0,
          peakMinuteRate: minuteRate,
          hourlyCounts: { [hour]: sentCount },
          lastUpdatedAt: admin.firestore.Timestamp.now(),
        });
      }
    });
  } catch (err) {
    logger.warn(`${LOG_PREFIX} Failed to update rate monitor:`, err);
  }
}

// ============================================================================
// QUEUE DEPTH CHECK
// ============================================================================

async function checkQueueDepth(db: admin.firestore.Firestore): Promise<void> {
  const pendingSnapshot = await db
    .collection(QUEUE_COLLECTION)
    .where('status', '==', 'pending')
    .count()
    .get();

  const depth = pendingSnapshot.data().count;

  if (depth > QUEUE_DEPTH_ALERT_THRESHOLD) {
    // Check if an unacknowledged alert already exists (avoid spam — I6 fix)
    const existingAlert = await db
      .collection('system_alerts')
      .where('category', '==', 'system')
      .where('title', '>=', 'Telegram queue depth:')
      .where('title', '<', 'Telegram queue depth;')
      .where('acknowledged', '==', false)
      .limit(1)
      .get();

    if (!existingAlert.empty) {
      logger.warn(`${LOG_PREFIX} Queue depth ${depth} — alert already exists, skipping`);
      return;
    }

    logger.error(
      `${LOG_PREFIX} ALERT: Queue depth ${depth} exceeds threshold ${QUEUE_DEPTH_ALERT_THRESHOLD}`
    );

    await db.collection('system_alerts').add({
      severity: 'warning',
      category: 'system',
      title: `Telegram queue depth: ${depth} messages pending`,
      description: `La queue Telegram a ${depth} messages en attente (seuil: ${QUEUE_DEPTH_ALERT_THRESHOLD}). Vérifier le processor et l'API Telegram.`,
      acknowledged: false,
      createdAt: admin.firestore.Timestamp.now(),
    });
  }
}

// ============================================================================
// ATOMIC CLAIM (C4 fix — anti double-fire)
// ============================================================================

async function claimMessage(
  db: admin.firestore.Firestore,
  docRef: admin.firestore.DocumentReference
): Promise<boolean> {
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const status = snap.data()?.status;
      if (status !== 'pending' && status !== 'failed') {
        throw new Error('already_claimed');
      }
      tx.update(docRef, { status: 'sending' });
    });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'already_claimed') {
      logger.info(`${LOG_PREFIX} Message ${docRef.id} already claimed, skipping`);
    } else {
      logger.warn(`${LOG_PREFIX} Failed to claim message ${docRef.id}:`, err);
    }
    return false;
  }
}

// ============================================================================
// PROCESS SINGLE MESSAGE
// ============================================================================

async function processMessage(
  db: admin.firestore.Firestore,
  docId: string,
  message: QueuedTelegramMessage
): Promise<boolean> {
  const docRef = db.collection(QUEUE_COLLECTION).doc(docId);

  // Atomic claim (prevents duplicate processing on double-fire)
  const claimed = await claimMessage(db, docRef);
  if (!claimed) return false;

  const result = await sendTelegramMessageDirect(message.chatId, message.text, {
    parseMode: message.parseMode,
    disableNotification: message.disableNotification,
    disableWebPagePreview: message.disableWebPagePreview,
  });

  if (result.ok) {
    await docRef.update({
      status: 'sent',
      processedAt: admin.firestore.Timestamp.now(),
      error: admin.firestore.FieldValue.delete(),
    });
    return true;
  }

  // Failed — decide retry or dead letter
  const newRetryCount = message.retryCount + 1;

  if (newRetryCount >= message.maxRetries) {
    logger.error(
      `${LOG_PREFIX} Message ${docId} dead after ${newRetryCount} retries: ${result.error}`
    );
    await docRef.update({
      status: 'dead',
      retryCount: newRetryCount,
      error: result.error || 'Unknown error',
      processedAt: admin.firestore.Timestamp.now(),
    });
    return false;
  }

  // Schedule retry with exponential backoff (5s, 10s, 20s)
  const backoffSeconds = RETRY_BACKOFF_BASE_S * Math.pow(2, message.retryCount);
  const nextRetryAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + backoffSeconds * 1000
  );

  logger.warn(
    `${LOG_PREFIX} Message ${docId} failed (attempt ${newRetryCount}/${message.maxRetries}), retry in ${backoffSeconds}s: ${result.error}`
  );

  await docRef.update({
    status: 'failed',
    retryCount: newRetryCount,
    error: result.error || 'Unknown error',
    nextRetryAt,
  });

  return false;
}

// ============================================================================
// MAIN PROCESSOR FUNCTION
// ============================================================================

export const processTelegramQueue = onSchedule(
  {
    region: 'europe-west3',
    schedule: '*/5 * * * *', // Every 5 minutes (optimized from every minute - saves ~80% invocations)
    timeZone: 'Europe/Paris',
    memory: '256MiB',
    timeoutSeconds: 120, // Increased to process larger batches per run
    maxInstances: 1,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async () => {
    const startTime = Date.now();
    logger.info(`${LOG_PREFIX} Starting queue processing...`);

    try {
      const db = admin.firestore();

      // 0. Recover messages stuck in 'sending' from a previous crash
      try {
        await recoverStuckMessages(db);
      } catch (err) {
        logger.warn(`${LOG_PREFIX} Failed to recover stuck messages (non-fatal):`, err);
      }

      // 1. Fetch pending messages (sorted by createdAt, priority handled client-side)
      const pendingQuery = db
        .collection(QUEUE_COLLECTION)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'asc')
        .limit(BATCH_SIZE);

      // Also fetch failed messages ready for retry
      const retryQuery = db
        .collection(QUEUE_COLLECTION)
        .where('status', '==', 'failed')
        .where('nextRetryAt', '<=', admin.firestore.Timestamp.now())
        .orderBy('nextRetryAt', 'asc')
        .limit(Math.floor(BATCH_SIZE / 5)); // Reserve ~5 slots for retries

      const [pendingSnap, retrySnap] = await Promise.all([
        pendingQuery.get(),
        retryQuery.get(),
      ]);

      // Merge: retries first (they've waited), then pending sorted by priority
      const allDocs: { id: string; data: QueuedTelegramMessage }[] = [];

      for (const doc of retrySnap.docs) {
        allDocs.push({ id: doc.id, data: doc.data() as QueuedTelegramMessage });
      }

      // Sort pending: realtime before campaign
      const pendingDocs = pendingSnap.docs.map((doc) => ({
        id: doc.id,
        data: doc.data() as QueuedTelegramMessage,
      }));
      pendingDocs.sort((a, b) => {
        if (a.data.priority === 'realtime' && b.data.priority === 'campaign') return -1;
        if (a.data.priority === 'campaign' && b.data.priority === 'realtime') return 1;
        return 0; // Keep createdAt order from query
      });

      for (const doc of pendingDocs) {
        if (allDocs.length >= BATCH_SIZE) break;
        allDocs.push(doc);
      }

      if (allDocs.length === 0) {
        logger.info(`${LOG_PREFIX} No messages to process.`);
        return;
      }

      logger.info(
        `${LOG_PREFIX} Processing ${allDocs.length} messages (${retrySnap.size} retries, ${pendingSnap.size} pending)`
      );

      // 2. Process each message sequentially with delay
      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < allDocs.length; i++) {
        const doc = allDocs[i];
        try {
          const success = await processMessage(db, doc.id, doc.data);
          if (success) sentCount++;
          else failedCount++;
        } catch (err) {
          logger.error(`${LOG_PREFIX} Error processing message ${doc.id}:`, err);
          failedCount++;
          // Mark as failed for retry
          try {
            await db.collection(QUEUE_COLLECTION).doc(doc.id).update({
              status: 'failed',
              retryCount: (doc.data.retryCount || 0) + 1,
              error: err instanceof Error ? err.message : 'Processing error',
              nextRetryAt: admin.firestore.Timestamp.fromMillis(
                Date.now() + RETRY_BACKOFF_BASE_S * 1000
              ),
            });
          } catch (innerErr) {
            logger.error(`${LOG_PREFIX} Failed to mark message ${doc.id} as failed:`, innerErr);
          }
        }

        // Delay between sends to respect Telegram rate limits
        if (i < allDocs.length - 1) {
          await sleep(SEND_DELAY_MS);
        }
      }

      const durationMs = Date.now() - startTime;

      logger.info(
        `${LOG_PREFIX} Batch complete: ${sentCount} sent, ${failedCount} failed in ${durationMs}ms`
      );

      // 3. Update rate monitor
      await updateRateMonitor(db, sentCount, failedCount, durationMs);

      // 4. Check queue depth for alerting
      try {
        await checkQueueDepth(db);
      } catch (err) {
        logger.warn(`${LOG_PREFIX} Failed to check queue depth (non-fatal):`, err);
      }
    } catch (err) {
      logger.error(`${LOG_PREFIX} Fatal error in queue processor:`, err);
    }
  }
);
