/**
 * Telegram Usage Monitor
 *
 * Scheduled function quotidienne (9h Paris) qui:
 * 1. Compte les subscribers Telegram actifs (toutes collections)
 * 2. Déclenche des alertes si seuils dépassés (500/800/1000)
 * 3. Nettoie les vieux messages de la queue (> 7 jours)
 */

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { TELEGRAM_BOT_TOKEN } from '../../lib/secrets';
import { sendTelegramMessageDirect } from '../providers/telegramBot';
import {
  QUEUE_COLLECTION,
  SUBSCRIBER_STATS_DOC,
  SUBSCRIBER_THRESHOLDS,
  CLEANUP_RETENTION_DAYS,
  AlertLevel,
  TelegramSubscriberStats,
} from './types';

const LOG_PREFIX = '[TelegramMonitor]';

/** Chat ID admin pour les alertes — lu depuis la config Telegram */
async function getAdminChatId(): Promise<string | null> {
  const db = admin.firestore();
  const configDoc = await db
    .collection('telegram_admin_config')
    .doc('settings')
    .get();

  if (!configDoc.exists) return null;
  return configDoc.data()?.recipientChatId || null;
}

// ============================================================================
// SUBSCRIBER COUNTING
// ============================================================================

async function countSubscribers(db: admin.firestore.Firestore): Promise<{
  total: number;
  breakdown: TelegramSubscriberStats['breakdown'];
}> {
  // Count telegram_id across all affiliate collections + admin config
  // Using where(field, '>', '') instead of '!= null' to avoid composite index requirement (W8)
  const collections = [
    { name: 'chatters', field: 'telegram_id' },
    { name: 'influencers', field: 'telegram_id' },
    { name: 'bloggers', field: 'telegram_id' },
    { name: 'group_admins', field: 'telegram_id' },
  ];

  const breakdown: NonNullable<TelegramSubscriberStats['breakdown']> = {
    chatters: 0,
    influencers: 0,
    bloggers: 0,
    groupAdmins: 0,
    admin: 0,
  };

  const breakdownKeys: (keyof typeof breakdown)[] = [
    'chatters',
    'influencers',
    'bloggers',
    'groupAdmins',
  ];

  // Run all counts in parallel
  const countPromises = collections.map(async ({ name, field }, i) => {
    try {
      // Two separate queries: one for active status, count those with telegram_id
      // Using where(field, '>', 0) for numeric telegram_id (more index-friendly than '!= null')
      const snap = await db
        .collection(name)
        .where('status', '==', 'active')
        .where(field, '>', 0)
        .count()
        .get();
      breakdown[breakdownKeys[i]] = snap.data().count;
    } catch (err) {
      // Collection may not exist or field may not be indexed — count as 0
      logger.warn(`${LOG_PREFIX} Could not count ${name}:`, err);
    }
  });

  await Promise.all(countPromises);

  // Count admin chat IDs (telegram_admin_config)
  const adminConfig = await db
    .collection('telegram_admin_config')
    .doc('settings')
    .get();
  if (adminConfig.exists && adminConfig.data()?.recipientChatId) {
    breakdown.admin = 1;
  }

  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  return { total, breakdown };
}

// ============================================================================
// ALERTING
// ============================================================================

function determineAlertLevel(subscriberCount: number): AlertLevel {
  if (subscriberCount >= SUBSCRIBER_THRESHOLDS.EMERGENCY) return 'emergency';
  if (subscriberCount >= SUBSCRIBER_THRESHOLDS.CRITICAL) return 'critical';
  if (subscriberCount >= SUBSCRIBER_THRESHOLDS.WARNING) return 'warning';
  return 'none';
}

async function sendAlertIfNeeded(
  db: admin.firestore.Firestore,
  subscriberCount: number,
  alertLevel: AlertLevel,
  breakdown: TelegramSubscriberStats['breakdown']
): Promise<void> {
  if (alertLevel === 'none') return;

  const adminChatId = await getAdminChatId();
  if (!adminChatId) {
    logger.warn(`${LOG_PREFIX} No admin chat ID configured, cannot send alert`);
    return;
  }

  const emoji = alertLevel === 'emergency' ? '🚨' : alertLevel === 'critical' ? '⚠️' : '📊';
  const action =
    alertLevel === 'emergency'
      ? '→ *ACTION REQUISE*: Contacter @BotFather pour passer en mode broadcast (> 1000 subscribers)'
      : alertLevel === 'critical'
        ? '→ Préparer la migration vers broadcast mode'
        : '→ Monitorer la croissance';

  const breakdownText = breakdown
    ? `\nChatters: ${breakdown.chatters}\nInfluencers: ${breakdown.influencers}\nBloggers: ${breakdown.bloggers}\nGroup Admins: ${breakdown.groupAdmins}\nAdmin: ${breakdown.admin}`
    : '';

  const message = `${emoji} *Telegram Subscriber Alert*

Niveau: *${alertLevel.toUpperCase()}*
Total subscribers: *${subscriberCount}*
${breakdownText}

Seuils: Warning ${SUBSCRIBER_THRESHOLDS.WARNING} | Critical ${SUBSCRIBER_THRESHOLDS.CRITICAL} | Emergency ${SUBSCRIBER_THRESHOLDS.EMERGENCY}

${action}`;

  // Send directly (not via queue — this IS the monitoring system) — wrapped in try/catch (W6)
  try {
    await sendTelegramMessageDirect(adminChatId, message, { parseMode: 'Markdown' });
  } catch (err) {
    logger.error(`${LOG_PREFIX} Failed to send alert via Telegram:`, err);
  }

  // Also create a system_alerts doc
  await db.collection('system_alerts').add({
    severity: alertLevel,
    category: 'system',
    title: `Telegram subscribers: ${subscriberCount} (${alertLevel})`,
    description: `${subscriberCount} subscribers Telegram actifs. ${action}`,
    acknowledged: false,
    createdAt: admin.firestore.Timestamp.now(),
  });
}

// ============================================================================
// QUEUE CLEANUP (W5 — improved scaling with loop)
// ============================================================================

async function cleanupOldMessages(db: admin.firestore.Firestore): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_RETENTION_DAYS);
  const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);

  let totalDeleted = 0;
  const BATCH_LIMIT = 500;
  const MAX_ITERATIONS = 10; // Safety cap: 5000 docs max per run (within 120s timeout)

  for (const status of ['sent', 'dead'] as const) {
    let iterations = 0;
    let hasMore = true;

    while (hasMore && iterations < MAX_ITERATIONS) {
      const oldMessages = await db
        .collection(QUEUE_COLLECTION)
        .where('status', '==', status)
        .where('createdAt', '<', cutoffTimestamp)
        .limit(BATCH_LIMIT)
        .get();

      if (oldMessages.empty) {
        hasMore = false;
        break;
      }

      const batch = db.batch();
      for (const doc of oldMessages.docs) {
        batch.delete(doc.ref);
      }
      await batch.commit();
      totalDeleted += oldMessages.size;
      iterations++;

      if (oldMessages.size < BATCH_LIMIT) {
        hasMore = false;
      }
    }
  }

  return totalDeleted;
}

// ============================================================================
// MAIN MONITOR FUNCTION
// ============================================================================

export const monitorTelegramUsage = onSchedule(
  {
    region: 'europe-west3',
    schedule: '0 9 * * *', // 9h Paris every day
    timeZone: 'Europe/Paris',
    memory: '128MiB',
    cpu: 0.083,
    timeoutSeconds: 120,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async () => {
    logger.info(`${LOG_PREFIX} Starting daily Telegram usage monitoring...`);

    try {
      const db = admin.firestore();

      // 1. Count subscribers
      const { total, breakdown } = await countSubscribers(db);
      const alertLevel = determineAlertLevel(total);

      logger.info(
        `${LOG_PREFIX} Subscriber count: ${total} (level: ${alertLevel})`,
        breakdown
      );

      // 2. Save stats
      const stats: TelegramSubscriberStats = {
        totalActiveSubscribers: total,
        alertLevel,
        lastCountedAt: admin.firestore.Timestamp.now(),
        breakdown,
      };

      try {
        await db.doc(SUBSCRIBER_STATS_DOC).set(stats);
      } catch (err) {
        logger.error(`${LOG_PREFIX} Failed to save subscriber stats:`, err);
      }

      // 3. Alert if needed
      try {
        await sendAlertIfNeeded(db, total, alertLevel, breakdown);
      } catch (err) {
        logger.error(`${LOG_PREFIX} Failed to send alert:`, err);
      }

      // 4. Cleanup old queue messages
      try {
        const deletedCount = await cleanupOldMessages(db);
        if (deletedCount > 0) {
          logger.info(`${LOG_PREFIX} Cleaned up ${deletedCount} old queue messages`);
        }
      } catch (err) {
        logger.error(`${LOG_PREFIX} Failed to cleanup old messages:`, err);
      }

      logger.info(`${LOG_PREFIX} Daily monitoring complete.`);
    } catch (err) {
      logger.error(`${LOG_PREFIX} Fatal error in daily monitor:`, err);
    }
  }
);
