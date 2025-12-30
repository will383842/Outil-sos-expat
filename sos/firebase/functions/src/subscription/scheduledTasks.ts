/**
 * SOS-Expat Subscription Scheduled Tasks
 * Tâches planifiées pour la gestion des abonnements IA
 *
 * SCHEDULE:
 * - resetMonthlyQuotas: 1er du mois à 00:01 UTC
 * - checkPastDueSubscriptions: tous les jours à 09:00 UTC
 * - sendQuotaAlerts: tous les jours à 10:00 UTC
 * - cleanupExpiredTrials: tous les jours à 02:00 UTC
 */

import * as admin from 'firebase-admin';
import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';
import { MailwizzAPI } from '../emailMarketing/utils/mailwizz';
import { getLanguageCode, MAILWIZZ_API_KEY_SECRET } from '../emailMarketing/config';

// Secrets
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');

// Lazy Firestore initialization
const getDb = () => admin.firestore();

// ============================================================================
// TYPES
// ============================================================================

interface AiUsageDoc {
  providerId: string;
  subscriptionId: string;
  currentPeriodCalls: number;
  currentPeriodStart: FirebaseFirestore.Timestamp;
  currentPeriodEnd: FirebaseFirestore.Timestamp;
  trialCallsUsed?: number;
  totalCallsAllTime?: number;
  lastCallAt?: FirebaseFirestore.Timestamp;
  quotaAlert80Sent?: boolean;
  quotaAlert100Sent?: boolean;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface SubscriptionDoc {
  providerId: string;
  planId: string;
  tier: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'suspended' | 'paused';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  trialStartedAt?: FirebaseFirestore.Timestamp;
  trialEndsAt?: FirebaseFirestore.Timestamp;
  trialCallsUsed?: number;
  currentPeriodStart: FirebaseFirestore.Timestamp;
  currentPeriodEnd: FirebaseFirestore.Timestamp;
  pastDueSince?: FirebaseFirestore.Timestamp;
  reminderSent3Days?: boolean;
  lastReminderAt?: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface SubscriptionPlanDoc {
  tier: string;
  aiCallsLimit: number;
  isActive: boolean;
}

interface UserDoc {
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  language?: string;
  preferredLanguage?: string;
  lang?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Récupère les informations utilisateur pour l'envoi d'emails
 */
async function getUserInfo(userId: string): Promise<UserDoc | null> {
  try {
    // Try users collection first
    let userDoc = await getDb().collection('users').doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data() as UserDoc;
    }

    // Fallback to providers collection
    userDoc = await getDb().collection('providers').doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data() as UserDoc;
    }

    return null;
  } catch (error) {
    logger.error(`[ScheduledTasks] Error fetching user info for ${userId}:`, error);
    return null;
  }
}

/**
 * Récupère la limite d'appels IA pour un plan
 */
async function getPlanAiLimit(planId: string): Promise<number> {
  try {
    const planDoc = await getDb().doc(`subscription_plans/${planId}`).get();
    if (!planDoc.exists) {
      logger.warn(`[ScheduledTasks] Plan not found: ${planId}`);
      return 0;
    }
    const planData = planDoc.data() as SubscriptionPlanDoc;
    return planData.aiCallsLimit ?? 0;
  } catch (error) {
    logger.error(`[ScheduledTasks] Error fetching plan ${planId}:`, error);
    return 0;
  }
}

/**
 * Envoie un email transactionnel via Mailwizz
 */
async function sendEmail(
  email: string,
  templateId: string,
  customFields: Record<string, string>
): Promise<boolean> {
  try {
    const mailwizz = new MailwizzAPI();
    await mailwizz.sendTransactional({
      to: email,
      template: templateId,
      customFields,
    });
    logger.info(`[ScheduledTasks] Email sent: ${templateId} to ${email}`);
    return true;
  } catch (error) {
    logger.error(`[ScheduledTasks] Failed to send email ${templateId} to ${email}:`, error);
    return false;
  }
}

// ============================================================================
// 1. RESET MONTHLY QUOTAS
// Scheduled: 1st of each month at 00:01 UTC
// ============================================================================

export const resetMonthlyQuotas = onSchedule(
  {
    schedule: '1 0 1 * *', // Minute 1, Hour 0, Day 1 of month
    region: 'europe-west1',
    timeZone: 'UTC',
    secrets: [MAILWIZZ_API_KEY_SECRET],
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes
  },
  async (_event: ScheduledEvent) => {
    logger.info('[resetMonthlyQuotas] Starting monthly quota reset...');

    const db = getDb();
    const now = admin.firestore.Timestamp.now();
    const nowDate = now.toDate();

    // Calculate new period dates
    const newPeriodStart = now;
    const newPeriodEnd = new Date(nowDate);
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
    newPeriodEnd.setDate(1);
    newPeriodEnd.setHours(0, 0, 0, 0);
    const newPeriodEndTimestamp = admin.firestore.Timestamp.fromDate(newPeriodEnd);

    // Query all ai_usage documents where currentPeriodEnd < now
    const usageSnapshot = await db
      .collection('ai_usage')
      .where('currentPeriodEnd', '<', now)
      .get();

    if (usageSnapshot.empty) {
      logger.info('[resetMonthlyQuotas] No ai_usage documents to reset');
      return;
    }

    logger.info(`[resetMonthlyQuotas] Found ${usageSnapshot.size} documents to process`);

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    const docs = usageSnapshot.docs;
    let processedCount = 0;
    let resetCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + batchSize);

      for (const doc of chunk) {
        const usageData = doc.data() as AiUsageDoc;
        const providerId = usageData.providerId || doc.id;

        try {
          // Get corresponding subscription
          const subDoc = await db.doc(`subscriptions/${providerId}`).get();

          if (!subDoc.exists) {
            logger.warn(`[resetMonthlyQuotas] No subscription found for provider: ${providerId}`);
            skippedCount++;
            continue;
          }

          const subscription = subDoc.data() as SubscriptionDoc;

          // Only reset if subscription is active
          if (subscription.status !== 'active') {
            logger.info(`[resetMonthlyQuotas] Skipping inactive subscription: ${providerId} (status: ${subscription.status})`);
            skippedCount++;
            continue;
          }

          // Reset quota
          batch.update(doc.ref, {
            currentPeriodCalls: 0,
            currentPeriodStart: newPeriodStart,
            currentPeriodEnd: newPeriodEndTimestamp,
            quotaAlert80Sent: false,
            quotaAlert100Sent: false,
            updatedAt: now,
          });

          // Log the reset
          const logRef = db.collection('quota_reset_logs').doc();
          batch.set(logRef, {
            providerId,
            subscriptionId: providerId,
            previousPeriodCalls: usageData.currentPeriodCalls,
            previousPeriodStart: usageData.currentPeriodStart,
            previousPeriodEnd: usageData.currentPeriodEnd,
            newPeriodStart: newPeriodStart,
            newPeriodEnd: newPeriodEndTimestamp,
            resetAt: now,
          });

          resetCount++;
        } catch (error) {
          logger.error(`[resetMonthlyQuotas] Error processing provider ${providerId}:`, error);
          skippedCount++;
        }

        processedCount++;
      }

      await batch.commit();
      logger.info(`[resetMonthlyQuotas] Batch committed: ${chunk.length} documents`);
    }

    logger.info(`[resetMonthlyQuotas] Completed: ${resetCount} reset, ${skippedCount} skipped out of ${processedCount} processed`);
  }
);

// ============================================================================
// 2. CHECK PAST DUE SUBSCRIPTIONS
// Scheduled: Every day at 09:00 UTC
// ============================================================================

export const checkPastDueSubscriptions = onSchedule(
  {
    schedule: '0 9 * * *', // Hour 9, Every day
    region: 'europe-west1',
    timeZone: 'UTC',
    secrets: [MAILWIZZ_API_KEY_SECRET],
    memory: '256MiB', // OPTIMIZED: Reduced from 512MiB - simple queries
    timeoutSeconds: 300,
  },
  async (_event: ScheduledEvent) => {
    logger.info('[checkPastDueSubscriptions] Starting past_due subscriptions check...');

    const db = getDb();
    const now = admin.firestore.Timestamp.now();
    const nowDate = now.toDate();

    // Calculate date thresholds
    const threeDaysAgo = new Date(nowDate);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const sevenDaysAgo = new Date(nowDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Query subscriptions with status='past_due'
    const pastDueSnapshot = await db
      .collection('subscriptions')
      .where('status', '==', 'past_due')
      .get();

    if (pastDueSnapshot.empty) {
      logger.info('[checkPastDueSubscriptions] No past_due subscriptions found');
      return;
    }

    logger.info(`[checkPastDueSubscriptions] Found ${pastDueSnapshot.size} past_due subscriptions`);

    let suspendedCount = 0;
    let reminderCount = 0;
    let errorCount = 0;

    const batch = db.batch();

    for (const doc of pastDueSnapshot.docs) {
      const subscription = doc.data() as SubscriptionDoc;
      const providerId = subscription.providerId || doc.id;

      try {
        // Determine when the subscription became past_due
        const pastDueSince = subscription.pastDueSince?.toDate() || subscription.updatedAt?.toDate() || nowDate;

        // Get user info for email
        const userInfo = await getUserInfo(providerId);
        const email = userInfo?.email;
        const firstName = userInfo?.firstName || userInfo?.displayName || 'Cher client';
        const lang = getLanguageCode(userInfo?.language || userInfo?.preferredLanguage || userInfo?.lang);

        // Check if past_due for more than 7 days -> Suspend
        if (pastDueSince <= sevenDaysAgo) {
          logger.info(`[checkPastDueSubscriptions] Suspending subscription: ${providerId} (past_due since ${pastDueSince.toISOString()})`);

          // Update subscription to suspended
          batch.update(doc.ref, {
            status: 'suspended',
            suspendedAt: now,
            suspensionReason: 'payment_failed_7_days',
            updatedAt: now,
          });

          // Cut AI access by updating ai_usage
          const usageRef = db.doc(`ai_usage/${providerId}`);
          batch.update(usageRef, {
            aiAccessSuspended: true,
            suspendedAt: now,
            updatedAt: now,
          });

          // Send final suspension email
          if (email) {
            await sendEmail(email, `TR_PRV_subscription-suspended_${lang}`, {
              FNAME: firstName,
              REACTIVATE_URL: 'https://sos-expat.com/dashboard/subscription',
            });
          }

          suspendedCount++;
        }
        // Check if past_due for more than 3 days -> Send reminder
        else if (pastDueSince <= threeDaysAgo) {
          logger.info(`[checkPastDueSubscriptions] Sending reminder for: ${providerId} (past_due since ${pastDueSince.toISOString()})`);

          // Check if we already sent a 3-day reminder
          const reminderSent = subscription.reminderSent3Days === true;

          if (!reminderSent && email) {
            await sendEmail(email, `TR_PRV_subscription-payment-reminder_${lang}`, {
              FNAME: firstName,
              DAYS_REMAINING: '4',
              UPDATE_PAYMENT_URL: 'https://sos-expat.com/dashboard/subscription',
            });

            // Mark reminder as sent
            batch.update(doc.ref, {
              reminderSent3Days: true,
              lastReminderAt: now,
              updatedAt: now,
            });

            reminderCount++;
          }
        }
      } catch (error) {
        logger.error(`[checkPastDueSubscriptions] Error processing subscription ${providerId}:`, error);
        errorCount++;
      }
    }

    await batch.commit();

    logger.info(`[checkPastDueSubscriptions] Completed: ${suspendedCount} suspended, ${reminderCount} reminders sent, ${errorCount} errors`);
  }
);

// ============================================================================
// 3. SEND QUOTA ALERTS
// Scheduled: Every day at 10:00 UTC
// ============================================================================

export const sendQuotaAlerts = onSchedule(
  {
    schedule: '0 10 * * *', // Hour 10, Every day
    region: 'europe-west1',
    timeZone: 'UTC',
    secrets: [MAILWIZZ_API_KEY_SECRET],
    memory: '256MiB', // OPTIMIZED: Reduced from 512MiB - simple queries
    timeoutSeconds: 300,
  },
  async (_event: ScheduledEvent) => {
    logger.info('[sendQuotaAlerts] Starting quota alerts check...');

    const db = getDb();
    const now = admin.firestore.Timestamp.now();

    // Get all ai_usage documents - OPTIMISÉ: select() pour ne charger que les champs nécessaires
    const usageSnapshot = await db.collection('ai_usage')
      .select('providerId', 'currentPeriodCalls', 'currentPeriodEnd', 'alert80SentAt', 'alert100SentAt')
      .get();

    if (usageSnapshot.empty) {
      logger.info('[sendQuotaAlerts] No ai_usage documents found');
      return;
    }

    logger.info(`[sendQuotaAlerts] Checking ${usageSnapshot.size} usage documents`);

    let alert80Count = 0;
    let alert100Count = 0;
    let errorCount = 0;

    const batch = db.batch();

    for (const doc of usageSnapshot.docs) {
      const usageData = doc.data() as AiUsageDoc;
      const providerId = usageData.providerId || doc.id;

      try {
        // Get subscription to get plan info
        const subDoc = await db.doc(`subscriptions/${providerId}`).get();
        if (!subDoc.exists) continue;

        const subscription = subDoc.data() as SubscriptionDoc;

        // Skip non-active subscriptions
        if (subscription.status !== 'active') continue;

        // Get plan limit
        const aiLimit = await getPlanAiLimit(subscription.planId);

        // Skip unlimited plans (-1) or invalid limits
        if (aiLimit <= 0) continue;

        const currentUsage = usageData.currentPeriodCalls || 0;
        const usagePercent = (currentUsage / aiLimit) * 100;

        // Get user info for email
        const userInfo = await getUserInfo(providerId);
        const email = userInfo?.email;
        const firstName = userInfo?.firstName || userInfo?.displayName || 'Cher client';
        const lang = getLanguageCode(userInfo?.language || userInfo?.preferredLanguage || userInfo?.lang);

        // Check 100% quota exhausted
        if (usagePercent >= 100 && !usageData.quotaAlert100Sent) {
          logger.info(`[sendQuotaAlerts] Quota exhausted for ${providerId}: ${currentUsage}/${aiLimit} (${usagePercent.toFixed(1)}%)`);

          if (email) {
            await sendEmail(email, `TR_PRV_quota-exhausted_${lang}`, {
              FNAME: firstName,
              CURRENT_USAGE: currentUsage.toString(),
              QUOTA_LIMIT: aiLimit.toString(),
              UPGRADE_URL: 'https://sos-expat.com/dashboard/subscription/plans',
            });
          }

          batch.update(doc.ref, {
            quotaAlert100Sent: true,
            quotaAlert100SentAt: now,
            updatedAt: now,
          });

          alert100Count++;
        }
        // Check 80% quota warning
        else if (usagePercent >= 80 && usagePercent < 100 && !usageData.quotaAlert80Sent) {
          logger.info(`[sendQuotaAlerts] 80% quota alert for ${providerId}: ${currentUsage}/${aiLimit} (${usagePercent.toFixed(1)}%)`);

          if (email) {
            await sendEmail(email, `TR_PRV_quota-80-percent_${lang}`, {
              FNAME: firstName,
              CURRENT_USAGE: currentUsage.toString(),
              QUOTA_LIMIT: aiLimit.toString(),
              REMAINING: (aiLimit - currentUsage).toString(),
              USAGE_PERCENT: Math.round(usagePercent).toString(),
              UPGRADE_URL: 'https://sos-expat.com/dashboard/subscription/plans',
            });
          }

          batch.update(doc.ref, {
            quotaAlert80Sent: true,
            quotaAlert80SentAt: now,
            updatedAt: now,
          });

          alert80Count++;
        }
      } catch (error) {
        logger.error(`[sendQuotaAlerts] Error processing usage for ${providerId}:`, error);
        errorCount++;
      }
    }

    await batch.commit();

    logger.info(`[sendQuotaAlerts] Completed: ${alert80Count} 80% alerts, ${alert100Count} 100% alerts, ${errorCount} errors`);
  }
);

// ============================================================================
// 4. CLEANUP EXPIRED TRIALS
// Scheduled: Every day at 02:00 UTC
// ============================================================================

export const cleanupExpiredTrials = onSchedule(
  {
    schedule: '0 2 * * *', // Hour 2, Every day
    region: 'europe-west1',
    timeZone: 'UTC',
    secrets: [MAILWIZZ_API_KEY_SECRET, STRIPE_SECRET_KEY],
    memory: '256MiB', // OPTIMIZED: Reduced from 512MiB - simple queries
    timeoutSeconds: 300,
  },
  async (_event: ScheduledEvent) => {
    logger.info('[cleanupExpiredTrials] Starting expired trials cleanup...');

    const db = getDb();
    const now = admin.firestore.Timestamp.now();

    // Query subscriptions where status='trialing' and trialEndsAt < now
    const expiredTrialsSnapshot = await db
      .collection('subscriptions')
      .where('status', '==', 'trialing')
      .where('trialEndsAt', '<', now)
      .get();

    if (expiredTrialsSnapshot.empty) {
      logger.info('[cleanupExpiredTrials] No expired trials found');
      return;
    }

    logger.info(`[cleanupExpiredTrials] Found ${expiredTrialsSnapshot.size} expired trials`);

    let expiredCount = 0;
    let errorCount = 0;

    const batch = db.batch();

    for (const doc of expiredTrialsSnapshot.docs) {
      const subscription = doc.data() as SubscriptionDoc;
      const providerId = subscription.providerId || doc.id;

      try {
        // Check for any successful invoice payments
        const invoicesSnapshot = await db
          .collection('invoices')
          .where('providerId', '==', providerId)
          .where('status', '==', 'paid')
          .limit(1)
          .get();

        const hasPaidInvoice = !invoicesSnapshot.empty;

        if (hasPaidInvoice) {
          // They have paid - this shouldn't happen, but update to active
          logger.info(`[cleanupExpiredTrials] Trial ${providerId} has paid invoice - updating to active`);
          batch.update(doc.ref, {
            status: 'active',
            updatedAt: now,
          });
        } else {
          // No payment - expire the trial
          logger.info(`[cleanupExpiredTrials] Expiring trial: ${providerId}`);

          // Update subscription status to expired
          batch.update(doc.ref, {
            status: 'expired',
            expiredAt: now,
            expiredReason: 'trial_ended_no_payment',
            updatedAt: now,
          });

          // Cut AI access
          const usageRef = db.doc(`ai_usage/${providerId}`);
          const usageDoc = await usageRef.get();
          if (usageDoc.exists) {
            batch.update(usageRef, {
              aiAccessSuspended: true,
              suspendedAt: now,
              suspendedReason: 'trial_expired',
              updatedAt: now,
            });
          }

          // Send trial ended email
          const userInfo = await getUserInfo(providerId);
          const email = userInfo?.email;
          const firstName = userInfo?.firstName || userInfo?.displayName || 'Cher client';
          const lang = getLanguageCode(userInfo?.language || userInfo?.preferredLanguage || userInfo?.lang);

          if (email) {
            await sendEmail(email, `TR_PRV_trial-ended_${lang}`, {
              FNAME: firstName,
              SUBSCRIBE_URL: 'https://sos-expat.com/dashboard/subscription/plans',
              TRIAL_CALLS_USED: (subscription.trialCallsUsed || 0).toString(),
            });
          }

          // Log the expiration
          const logRef = db.collection('trial_expiration_logs').doc();
          batch.set(logRef, {
            providerId,
            trialStartedAt: subscription.trialStartedAt,
            trialEndsAt: subscription.trialEndsAt,
            expiredAt: now,
            hasStripeSubscription: !!subscription.stripeSubscriptionId,
          });

          expiredCount++;
        }
      } catch (error) {
        logger.error(`[cleanupExpiredTrials] Error processing trial ${providerId}:`, error);
        errorCount++;
      }
    }

    await batch.commit();

    logger.info(`[cleanupExpiredTrials] Completed: ${expiredCount} trials expired, ${errorCount} errors`);
  }
);

// ============================================================================
// 5. CLEANUP EXPIRED TTL DOCUMENTS
// Scheduled: Every day at 03:00 UTC
// Cleans up processed_webhook_events and rate_limits with expired TTL
// ============================================================================

export const cleanupExpiredDocuments = onSchedule(
  {
    schedule: '0 3 * * *', // Hour 3, Every day
    region: 'europe-west1',
    timeZone: 'UTC',
    memory: '256MiB', // OPTIMIZED: Reduced from 512MiB - simple cleanup queries
    timeoutSeconds: 300,
  },
  async (_event: ScheduledEvent) => {
    logger.info('[cleanupExpiredDocuments] Starting TTL cleanup...');

    const db = getDb();
    const now = admin.firestore.Timestamp.now();

    let totalDeleted = 0;
    let errorCount = 0;

    // ========================================
    // 1. Cleanup processed_webhook_events
    // ========================================
    try {
      const webhookEventsSnapshot = await db
        .collection('processed_webhook_events')
        .where('expiresAt', '<', now)
        .limit(500) // Process in batches
        .get();

      if (!webhookEventsSnapshot.empty) {
        const batch = db.batch();
        webhookEventsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        totalDeleted += webhookEventsSnapshot.size;
        logger.info(`[cleanupExpiredDocuments] Deleted ${webhookEventsSnapshot.size} expired webhook events`);
      }
    } catch (error) {
      logger.error('[cleanupExpiredDocuments] Error cleaning webhook events:', error);
      errorCount++;
    }

    // ========================================
    // 2. Cleanup rate_limits (older than 2 hours)
    // ========================================
    try {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      const rateLimitsSnapshot = await db
        .collection('rate_limits')
        .where('windowStart', '<', twoHoursAgo)
        .limit(500)
        .get();

      if (!rateLimitsSnapshot.empty) {
        const batch = db.batch();
        rateLimitsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        totalDeleted += rateLimitsSnapshot.size;
        logger.info(`[cleanupExpiredDocuments] Deleted ${rateLimitsSnapshot.size} expired rate limits`);
      }
    } catch (error) {
      logger.error('[cleanupExpiredDocuments] Error cleaning rate limits:', error);
      errorCount++;
    }

    // ========================================
    // 3. Cleanup old subscription_logs (older than 90 days)
    // ========================================
    try {
      const ninetyDaysAgo = admin.firestore.Timestamp.fromMillis(
        Date.now() - 90 * 24 * 60 * 60 * 1000
      );
      const logsSnapshot = await db
        .collection('subscription_logs')
        .where('createdAt', '<', ninetyDaysAgo)
        .limit(500)
        .get();

      if (!logsSnapshot.empty) {
        const batch = db.batch();
        logsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        totalDeleted += logsSnapshot.size;
        logger.info(`[cleanupExpiredDocuments] Deleted ${logsSnapshot.size} old subscription logs`);
      }
    } catch (error) {
      logger.error('[cleanupExpiredDocuments] Error cleaning subscription logs:', error);
      errorCount++;
    }

    // ========================================
    // 4. Cleanup old quota_reset_logs (older than 60 days)
    // ========================================
    try {
      const sixtyDaysAgo = admin.firestore.Timestamp.fromMillis(
        Date.now() - 60 * 24 * 60 * 60 * 1000
      );
      const quotaLogsSnapshot = await db
        .collection('quota_reset_logs')
        .where('resetAt', '<', sixtyDaysAgo)
        .limit(500)
        .get();

      if (!quotaLogsSnapshot.empty) {
        const batch = db.batch();
        quotaLogsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        totalDeleted += quotaLogsSnapshot.size;
        logger.info(`[cleanupExpiredDocuments] Deleted ${quotaLogsSnapshot.size} old quota reset logs`);
      }
    } catch (error) {
      logger.error('[cleanupExpiredDocuments] Error cleaning quota logs:', error);
      errorCount++;
    }

    logger.info(`[cleanupExpiredDocuments] Completed: ${totalDeleted} documents deleted, ${errorCount} errors`);
  }
);

// ============================================================================
// EXPORTS FOR INDEX
// ============================================================================

// All functions are exported individually for use in index.ts
