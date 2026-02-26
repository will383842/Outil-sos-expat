/**
 * Admin Callable: Get Payment Configuration
 *
 * Retrieves the current payment system configuration.
 * Admin access required.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
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
  if (role === 'admin') {
    return uid;
  }

  // Fall back to Firestore check
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  return uid;
}

/**
 * Get Payment Configuration
 *
 * Returns the current payment system configuration including:
 * - Payment mode (manual, automatic, hybrid)
 * - Thresholds and limits
 * - Timing settings
 * - Provider settings
 */
export const adminGetPaymentConfig = onCall(
  { ...adminConfig, memory: '256MiB', timeoutSeconds: 30 },
  async (request): Promise<{ config: PaymentConfig }> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();

    try {
      logger.info('[adminGetPaymentConfig] Fetching config', { adminId });

      const configDoc = await db.collection('config').doc('payment_config').get();

      if (!configDoc.exists) {
        // Return defaults if not initialized
        logger.info('[adminGetPaymentConfig] Config not found, returning defaults');

        const defaultConfig: PaymentConfig = {
          ...DEFAULT_PAYMENT_CONFIG,
          updatedAt: new Date().toISOString(),
          updatedBy: 'system',
        };

        return { config: defaultConfig };
      }

      const config = configDoc.data() as PaymentConfig;

      logger.info('[adminGetPaymentConfig] Config fetched successfully', {
        adminId,
        paymentMode: config.paymentMode,
        wiseEnabled: config.wiseEnabled,
        flutterwaveEnabled: config.flutterwaveEnabled,
      });

      return { config };
    } catch (error) {
      logger.error('[adminGetPaymentConfig] Error fetching config', {
        adminId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to fetch payment configuration');
    }
  }
);
