/**
 * Tax Filing Reminders Scheduled Function
 *
 * Runs daily to check for upcoming tax filing deadlines
 * and sends reminder notifications at J-30, J-7, J-1
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { TaxFiling, TaxFilingStatus, FILING_TYPE_CONFIGS } from './types';
import { ADMIN_ALERT_EMAILS } from '../lib/constants';

const db = getFirestore();

// ============================================================================
// CONFIGURATION
// ============================================================================

const REMINDER_CONFIG = {
  notifyEmails: ADMIN_ALERT_EMAILS,
  reminderDays: [30, 7, 1, 0, -1], // Days before/after due date
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate days until due date
 */
function daysUntilDue(dueDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get reminder key for a given day count
 */
function getReminderKey(daysUntil: number): string | null {
  if (daysUntil === 30) return 'sent30Days';
  if (daysUntil === 7) return 'sent7Days';
  if (daysUntil === 1) return 'sent1Day';
  if (daysUntil === 0) return 'sentDueDay';
  if (daysUntil < 0) return 'sentOverdue';
  return null;
}

/**
 * Send notification email for filing reminder
 */
async function sendReminderNotification(
  filing: TaxFiling & { id: string },
  reminderType: 'upcoming' | 'due' | 'overdue',
  daysUntil: number
): Promise<void> {
  const config = FILING_TYPE_CONFIGS[filing.type];

  // Create notification document for email system
  const notificationData = {
    type: 'tax_filing_reminder',
    filingId: filing.id,
    filingType: filing.type,
    filingTypeName: config.nameFr,
    period: filing.period,
    dueDate: filing.dueDate,
    daysUntil,
    reminderType,
    summary: {
      totalTaxDue: filing.summary.totalTaxDue,
      netTaxPayable: filing.summary.netTaxPayable,
    },
    status: filing.status,
    recipients: REMINDER_CONFIG.notifyEmails,
    createdAt: Timestamp.now(),
    sent: false,
  };

  await db.collection('tax_filing_notifications').add(notificationData);

  // Log the reminder
  logger.info(`Tax filing reminder sent`, {
    filingId: filing.id,
    type: filing.type,
    period: filing.period,
    reminderType,
    daysUntil,
  });
}

// ============================================================================
// SCHEDULED FUNCTION
// ============================================================================

/**
 * Daily scheduled function to check and send filing reminders
 * Runs every day at 9:00 AM Europe/Tallinn
 */
export const sendFilingReminders = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'Europe/Tallinn',
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (_event: ScheduledEvent) => {
    logger.info('Starting tax filing reminders check');

    try {
      // Query all non-completed filings
      const filingsRef = db.collection('tax_filings');
      const activeStatuses: TaxFilingStatus[] = ['DRAFT', 'PENDING_REVIEW'];

      const snapshot = await filingsRef
        .where('status', 'in', activeStatuses)
        .get();

      logger.info(`Found ${snapshot.size} active tax filings to check`);

      let remindersCount = 0;

      for (const doc of snapshot.docs) {
        const filing = { id: doc.id, ...doc.data() } as TaxFiling & { id: string };
        const dueDate = filing.dueDate.toDate();
        const days = daysUntilDue(dueDate);

        // Check each reminder threshold
        for (const threshold of REMINDER_CONFIG.reminderDays) {
          // Check if we should send this reminder
          const reminderKey = getReminderKey(threshold) as keyof typeof filing.reminders | null;
          if (!reminderKey) continue;

          // Skip if already sent
          if (filing.reminders[reminderKey]) continue;

          // Check if we've reached this threshold
          if (days <= threshold && days > threshold - 1) {
            const reminderType = threshold > 0 ? 'upcoming' : threshold === 0 ? 'due' : 'overdue';

            await sendReminderNotification(filing, reminderType, days);

            // Mark reminder as sent
            await doc.ref.update({
              [`reminders.${reminderKey}`]: true,
              updatedAt: Timestamp.now(),
            });

            remindersCount++;
          }
        }

        // Check for overdue filings (past due date)
        if (days < 0 && !filing.reminders.sentOverdue) {
          await sendReminderNotification(filing, 'overdue', days);

          await doc.ref.update({
            'reminders.sentOverdue': true,
            updatedAt: Timestamp.now(),
          });

          remindersCount++;
        }
      }

      logger.info(`Tax filing reminders completed`, {
        filingsChecked: snapshot.size,
        remindersSent: remindersCount,
      });
    } catch (error) {
      logger.error('Error sending tax filing reminders:', error);
      throw error;
    }
  });

/**
 * HTTP endpoint to manually trigger reminder check
 * Useful for testing or manual runs
 */
export const triggerFilingReminders = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Check admin claim
    const customClaims = request.auth.token;
    if (!customClaims.admin && !customClaims.superAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    logger.info('Manual tax filing reminders trigger by:', request.auth.uid);

    try {
      const filingsRef = db.collection('tax_filings');
      const activeStatuses: TaxFilingStatus[] = ['DRAFT', 'PENDING_REVIEW'];

      const snapshot = await filingsRef
        .where('status', 'in', activeStatuses)
        .get();

      const results: Array<{
        filingId: string;
        type: string;
        period: string;
        daysUntilDue: number;
        reminderSent: boolean;
        reminderType?: string;
      }> = [];

      for (const doc of snapshot.docs) {
        const filing = { id: doc.id, ...doc.data() } as TaxFiling & { id: string };
        const dueDate = filing.dueDate.toDate();
        const days = daysUntilDue(dueDate);

        let reminderSent = false;
        let reminderType: string | undefined;

        // Check each reminder threshold
        for (const threshold of REMINDER_CONFIG.reminderDays) {
          const reminderKey = getReminderKey(threshold) as keyof typeof filing.reminders | null;
          if (!reminderKey) continue;

          if (filing.reminders[reminderKey]) continue;

          if (days <= threshold && days > threshold - 1) {
            reminderType = threshold > 0 ? 'upcoming' : threshold === 0 ? 'due' : 'overdue';

            await sendReminderNotification(filing, reminderType as 'upcoming' | 'due' | 'overdue', days);

            await doc.ref.update({
              [`reminders.${reminderKey}`]: true,
              updatedAt: Timestamp.now(),
            });

            reminderSent = true;
            break;
          }
        }

        // Check for overdue
        if (days < 0 && !filing.reminders.sentOverdue && !reminderSent) {
          reminderType = 'overdue';
          await sendReminderNotification(filing, 'overdue', days);

          await doc.ref.update({
            'reminders.sentOverdue': true,
            updatedAt: Timestamp.now(),
          });

          reminderSent = true;
        }

        results.push({
          filingId: filing.id,
          type: filing.type,
          period: filing.period,
          daysUntilDue: days,
          reminderSent,
          reminderType,
        });
      }

      return {
        success: true,
        filingsChecked: results.length,
        remindersSent: results.filter(r => r.reminderSent).length,
        results,
      };

    } catch (error) {
      logger.error('Error in manual reminder trigger:', error);
      throw new HttpsError('internal', `Failed to check reminders: ${error}`);
    }
  });
