/**
 * Telegram Daily Report Scheduled Function
 *
 * Sends a daily summary report to administrators via Telegram at 20:00 Paris time.
 *
 * Report includes:
 * - Daily revenue (CA) from payments
 * - SOS Expat commission (20% of revenue)
 * - Number of new user registrations
 * - Number of completed calls
 *
 * Schedule: Every day at 19:00 UTC (20:00 Paris in winter, 21:00 in summer with DST)
 * Using timeZone: "Europe/Paris" ensures correct local time handling.
 */

import * as admin from 'firebase-admin';
import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { TELEGRAM_BOT_TOKEN } from '../../lib/secrets';
import { telegramNotificationService } from '../TelegramNotificationService';
import { DailyReportVars } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = '[TelegramDailyReport]';

/** Commission rate for SOS Expat (20%) */
const COMMISSION_RATE = 0.20;

/** Paris timezone for date calculations */
const PARIS_TIMEZONE = 'Europe/Paris';

/** Check if running during deployment analysis (no actual Firebase context) */
const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

let _initialized = false;

/**
 * Ensure Firebase Admin is initialized before accessing Firestore
 */
function ensureInitialized(): void {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

/**
 * Get Firestore instance with lazy initialization
 */
function getDb(): admin.firestore.Firestore {
  ensureInitialized();
  return admin.firestore();
}

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Get the start and end of today in Paris timezone
 * Returns timestamps for querying Firestore
 */
function getTodayBoundsParis(): { startOfDay: Date; endOfDay: Date } {
  const now = new Date();

  // Get current date parts in Paris timezone
  const parisDateStr = now.toLocaleDateString('en-CA', {
    timeZone: PARIS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Create start of day in Paris (midnight)
  // We use a trick: create the date string and parse it as Paris time
  const startOfDayParis = new Date(`${parisDateStr}T00:00:00`);

  // Adjust for Paris timezone offset
  // Get the offset in minutes for Paris at that date
  const parisOffset = getTimezoneOffsetMinutes(startOfDayParis, PARIS_TIMEZONE);
  const localOffset = startOfDayParis.getTimezoneOffset();
  const offsetDiff = localOffset - parisOffset;

  // Apply offset to get correct UTC time
  const startOfDay = new Date(startOfDayParis.getTime() + offsetDiff * 60 * 1000);

  // End of day is start + 24 hours
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  return { startOfDay, endOfDay };
}

/**
 * Get timezone offset in minutes for a specific timezone
 */
function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
  // Create a date string in the target timezone
  const tzDateStr = date.toLocaleString('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Parse it back
  const [datePart, timePart] = tzDateStr.split(', ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);

  // Create a date in local time with those values
  const tzDate = new Date(year, month - 1, day, hour, minute, second);

  // The difference in minutes between local time interpretation and UTC
  return (date.getTime() - tzDate.getTime()) / (60 * 1000);
}

/**
 * Format date in Paris timezone (DD/MM/YYYY)
 */
function formatDateParis(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleDateString('fr-FR', {
    timeZone: PARIS_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format time in Paris timezone (HH:MM)
 */
function formatTimeParis(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleTimeString('fr-FR', {
    timeZone: PARIS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// DATA AGGREGATION FUNCTIONS
// ============================================================================

/**
 * Count users created today
 */
async function countUsersCreatedToday(
  db: admin.firestore.Firestore,
  startOfDay: Date,
  endOfDay: Date
): Promise<number> {
  try {
    const startTimestamp = admin.firestore.Timestamp.fromDate(startOfDay);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);

    // Query users collection
    const usersSnapshot = await db
      .collection('users')
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<', endTimestamp)
      .count()
      .get();

    const usersCount = usersSnapshot.data().count;

    // Also check sos_profiles for providers registered today
    const profilesSnapshot = await db
      .collection('sos_profiles')
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<', endTimestamp)
      .count()
      .get();

    const profilesCount = profilesSnapshot.data().count;

    // Return the higher of the two (to avoid double counting)
    // In practice, users and sos_profiles may overlap
    const total = Math.max(usersCount, profilesCount);

    logger.info(`${LOG_PREFIX} Users created today: ${total} (users: ${usersCount}, profiles: ${profilesCount})`);
    return total;
  } catch (error) {
    logger.error(`${LOG_PREFIX} Error counting users:`, error);
    return 0;
  }
}

/**
 * Count call sessions completed today
 */
async function countCallsCompletedToday(
  db: admin.firestore.Firestore,
  startOfDay: Date,
  endOfDay: Date
): Promise<number> {
  try {
    const startTimestamp = admin.firestore.Timestamp.fromDate(startOfDay);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);

    // Query call_sessions with status 'completed' and endedAt in today's range
    const callsSnapshot = await db
      .collection('call_sessions')
      .where('status', '==', 'completed')
      .where('endedAt', '>=', startTimestamp)
      .where('endedAt', '<', endTimestamp)
      .count()
      .get();

    const count = callsSnapshot.data().count;
    logger.info(`${LOG_PREFIX} Calls completed today: ${count}`);
    return count;
  } catch (error) {
    logger.error(`${LOG_PREFIX} Error counting calls:`, error);
    return 0;
  }
}

/**
 * Sum payments received today
 * Returns total amount in euros
 */
async function sumPaymentsReceivedToday(
  db: admin.firestore.Firestore,
  startOfDay: Date,
  endOfDay: Date
): Promise<number> {
  try {
    const startTimestamp = admin.firestore.Timestamp.fromDate(startOfDay);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);

    // Query payments with status 'succeeded' or 'paid' created today
    const paymentsSnapshot = await db
      .collection('payments')
      .where('status', 'in', ['succeeded', 'paid', 'completed'])
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<', endTimestamp)
      .get();

    let totalAmount = 0;

    for (const doc of paymentsSnapshot.docs) {
      const data = doc.data();

      // Get amount - handle different field names and formats
      let amount = 0;

      if (typeof data.amount === 'number') {
        amount = data.amount;
      } else if (typeof data.totalAmount === 'number') {
        amount = data.totalAmount;
      } else if (typeof data.amountTotal === 'number') {
        amount = data.amountTotal;
      }

      // Check if amount is in cents (Stripe convention)
      // If amount > 10000, assume it's in cents
      if (amount > 10000) {
        amount = amount / 100;
      }

      totalAmount += amount;
    }

    logger.info(`${LOG_PREFIX} Payments received today: ${totalAmount.toFixed(2)} EUR (${paymentsSnapshot.size} transactions)`);
    return totalAmount;
  } catch (error) {
    logger.error(`${LOG_PREFIX} Error summing payments:`, error);
    return 0;
  }
}

// ============================================================================
// CONFIG CHECK
// ============================================================================

/**
 * Check if daily report is enabled in Telegram config
 */
async function isDailyReportEnabled(db: admin.firestore.Firestore): Promise<boolean> {
  try {
    const configDoc = await db
      .collection('telegram_admin_config')
      .doc('settings')
      .get();

    if (!configDoc.exists) {
      logger.warn(`${LOG_PREFIX} Config document not found, daily report disabled`);
      return false;
    }

    const config = configDoc.data();
    const enabled = config?.notifications?.dailyReport === true;

    logger.info(`${LOG_PREFIX} Daily report enabled: ${enabled}`);
    return enabled;
  } catch (error) {
    logger.error(`${LOG_PREFIX} Error checking config:`, error);
    return false;
  }
}

// ============================================================================
// SCHEDULED FUNCTION
// ============================================================================

/**
 * Telegram Daily Report Scheduled Function
 *
 * Runs every day at 20:00 Paris time (19:00 UTC in winter).
 * Aggregates daily statistics and sends a summary via Telegram.
 */
export const telegramDailyReport = onSchedule(
  {
    region: 'europe-west3',
    schedule: '0 19 * * *', // 19:00 UTC = 20:00 Paris (winter) or 21:00 Paris (summer)
    timeZone: 'Europe/Paris', // This ensures the schedule respects Paris DST
    memory: '256MiB',
    cpu: 0.083,
    timeoutSeconds: 120,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (_event: ScheduledEvent) => {
    const startTime = Date.now();
    logger.info(`${LOG_PREFIX} Starting daily report generation...`);

    try {
      const db = getDb();

      // 1. Check if daily report is enabled in config
      const enabled = await isDailyReportEnabled(db);
      if (!enabled) {
        logger.info(`${LOG_PREFIX} Daily report is disabled, skipping`);
        return;
      }

      // 2. Get today's date bounds in Paris timezone
      const { startOfDay, endOfDay } = getTodayBoundsParis();
      logger.info(`${LOG_PREFIX} Querying data for:`, {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
      });

      // 3. Aggregate today's data in parallel
      const [registrationCount, callCount, totalPayments] = await Promise.all([
        countUsersCreatedToday(db, startOfDay, endOfDay),
        countCallsCompletedToday(db, startOfDay, endOfDay),
        sumPaymentsReceivedToday(db, startOfDay, endOfDay),
      ]);

      // 4. Calculate commission (20%)
      const commission = totalPayments * COMMISSION_RATE;

      // 5. Build template variables
      const now = new Date();
      const variables: DailyReportVars = {
        DATE: formatDateParis(now),
        DAILY_CA: totalPayments.toFixed(2),
        DAILY_COMMISSION: commission.toFixed(2),
        REGISTRATION_COUNT: registrationCount.toString(),
        CALL_COUNT: callCount.toString(),
        TIME: formatTimeParis(now),
      };

      logger.info(`${LOG_PREFIX} Report variables:`, variables);

      // 6. Send notification via TelegramNotificationService
      const success = await telegramNotificationService.sendNotification('daily_report', variables);

      // 7. Log execution result
      const executionTime = Date.now() - startTime;

      if (success) {
        logger.info(`${LOG_PREFIX} Daily report sent successfully in ${executionTime}ms`);

        // Log to system_logs for monitoring
        await db.collection('system_logs').add({
          type: 'telegram_daily_report',
          success: true,
          data: variables,
          executionTimeMs: executionTime,
          createdAt: admin.firestore.Timestamp.now(),
        });
      } else {
        logger.error(`${LOG_PREFIX} Failed to send daily report`);

        // Log error to system_logs
        await db.collection('system_logs').add({
          type: 'telegram_daily_report',
          success: false,
          data: variables,
          error: 'Notification service returned false',
          executionTimeMs: executionTime,
          createdAt: admin.firestore.Timestamp.now(),
        });
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`${LOG_PREFIX} Error generating daily report:`, error);

      // Log error to system_logs
      try {
        const db = getDb();
        await db.collection('system_logs').add({
          type: 'telegram_daily_report',
          success: false,
          error: errorMessage,
          executionTimeMs: executionTime,
          createdAt: admin.firestore.Timestamp.now(),
        });
      } catch (logError) {
        logger.error(`${LOG_PREFIX} Failed to log error:`, logError);
      }

      // Re-throw to mark function as failed
      throw error;
    }
  }
);
