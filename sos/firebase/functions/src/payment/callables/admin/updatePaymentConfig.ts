/**
 * Admin Callable: Update Payment Configuration
 *
 * Updates the payment system configuration.
 * Admin access required. All changes are logged.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { PaymentConfig, DEFAULT_PAYMENT_CONFIG } from '../../types';
import { adminConfig } from '../../../lib/functionConfigs';

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Verify that the request is from an admin user
 */
async function verifyAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const uid = request.auth.uid;

  // Check custom claims first (faster)
  const role = request.auth.token?.role as string | undefined;
  if (role === 'admin' || role === 'dev') {
    return uid;
  }

  // Fall back to Firestore check
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || !['admin', 'dev'].includes(userDoc.data()?.role)) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  return uid;
}

/**
 * Input for updating payment config
 */
interface UpdatePaymentConfigInput {
  paymentMode?: 'manual' | 'automatic' | 'hybrid';
  autoPaymentThreshold?: number;
  minimumWithdrawal?: number;
  maximumWithdrawal?: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  validationPeriodDays?: number;
  autoPaymentDelayHours?: number;
  maxRetries?: number;
  retryDelayMinutes?: number;
  notifyOnRequest?: boolean;
  notifyOnCompletion?: boolean;
  notifyOnFailure?: boolean;
  adminEmails?: string[];
  wiseEnabled?: boolean;
  flutterwaveEnabled?: boolean;
}

/**
 * Update Payment Configuration
 *
 * Allows admin to update payment system settings.
 * All updates are audited and logged.
 */
export const adminUpdatePaymentConfig = onCall(
  { ...adminConfig, memory: '256MiB', timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();
    const input = request.data as UpdatePaymentConfigInput;

    if (!input || Object.keys(input).length === 0) {
      throw new HttpsError('invalid-argument', 'No updates provided');
    }

    try {
      logger.info('[adminUpdatePaymentConfig] Updating config', {
        adminId,
        updates: Object.keys(input),
      });

      // Allowed fields that can be updated
      const allowedFields: (keyof UpdatePaymentConfigInput)[] = [
        'paymentMode',
        'autoPaymentThreshold',
        'minimumWithdrawal',
        'maximumWithdrawal',
        'dailyLimit',
        'monthlyLimit',
        'validationPeriodDays',
        'autoPaymentDelayHours',
        'maxRetries',
        'retryDelayMinutes',
        'notifyOnRequest',
        'notifyOnCompletion',
        'notifyOnFailure',
        'adminEmails',
        'wiseEnabled',
        'flutterwaveEnabled',
      ];

      // Build sanitized updates
      const sanitizedUpdates: Record<string, unknown> = {};
      const changedFields: string[] = [];

      for (const field of allowedFields) {
        if (input[field] !== undefined) {
          // Validate specific fields
          if (field === 'paymentMode') {
            if (!['manual', 'automatic', 'hybrid'].includes(input[field] as string)) {
              throw new HttpsError('invalid-argument', `Invalid paymentMode: ${input[field]}`);
            }
          }

          if (field === 'autoPaymentThreshold' || field === 'minimumWithdrawal' ||
              field === 'maximumWithdrawal' || field === 'dailyLimit' ||
              field === 'monthlyLimit') {
            const value = input[field] as number;
            if (typeof value !== 'number' || value < 0) {
              throw new HttpsError('invalid-argument', `Invalid ${field}: must be a positive number`);
            }
          }

          if (field === 'validationPeriodDays' || field === 'autoPaymentDelayHours' ||
              field === 'maxRetries' || field === 'retryDelayMinutes') {
            const value = input[field] as number;
            if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
              throw new HttpsError('invalid-argument', `Invalid ${field}: must be a positive integer`);
            }
          }

          if (field === 'adminEmails') {
            const emails = input[field] as string[];
            if (!Array.isArray(emails)) {
              throw new HttpsError('invalid-argument', 'adminEmails must be an array');
            }
            for (const email of emails) {
              if (typeof email !== 'string' || !email.includes('@')) {
                throw new HttpsError('invalid-argument', `Invalid email: ${email}`);
              }
            }
          }

          sanitizedUpdates[field] = input[field];
          changedFields.push(field);
        }
      }

      if (changedFields.length === 0) {
        throw new HttpsError('invalid-argument', 'No valid fields to update');
      }

      // Add metadata
      sanitizedUpdates.updatedAt = new Date().toISOString();
      sanitizedUpdates.updatedBy = adminId;

      const configRef = db.collection('config').doc('payment_config');
      const configDoc = await configRef.get();

      // Store previous values for audit
      const previousConfig = configDoc.exists ? configDoc.data() as PaymentConfig : null;

      // Merge with existing or create new
      if (configDoc.exists) {
        await configRef.update(sanitizedUpdates);
      } else {
        await configRef.set({
          ...DEFAULT_PAYMENT_CONFIG,
          ...sanitizedUpdates,
        });
      }

      // Log audit entry
      const auditRef = db.collection('payment_audit_logs').doc();
      await auditRef.set({
        id: auditRef.id,
        action: 'config_update',
        actorId: adminId,
        actorType: 'admin',
        timestamp: Timestamp.now(),
        details: {
          changedFields,
          previousValues: previousConfig
            ? changedFields.reduce((acc, field) => {
                acc[field] = previousConfig[field as keyof PaymentConfig];
                return acc;
              }, {} as Record<string, unknown>)
            : null,
          newValues: changedFields.reduce((acc, field) => {
            acc[field] = sanitizedUpdates[field];
            return acc;
          }, {} as Record<string, unknown>),
        },
      });

      logger.info('[adminUpdatePaymentConfig] Config updated successfully', {
        adminId,
        changedFields,
        auditLogId: auditRef.id,
      });

      return {
        success: true,
        message: `Payment configuration updated: ${changedFields.join(', ')}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('[adminUpdatePaymentConfig] Error updating config', {
        adminId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to update payment configuration');
    }
  }
);
