/**
 * Callable: getPaymentConfig (public)
 *
 * Returns public payment configuration (minimum withdrawal, enabled status, currency).
 * Available to any authenticated user (no admin check).
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { PAYMENT_FUNCTIONS_REGION } from '../../configs/callRegion';
import { ALLOWED_ORIGINS } from '../../lib/functionConfigs';

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface GetPaymentConfigOutput {
  success: boolean;
  config: {
    minimumWithdrawalAmount: number;
    withdrawalsEnabled: boolean;
    currency: string;
  };
}

export const getPaymentConfig = onCall(
  {
    region: PAYMENT_FUNCTIONS_REGION,
    memory: '512MiB',  // FIX: 256MiB caused OOM at startup (firebase-admin overhead)
    cpu: 0.5,  // FIX: memory > 256MiB requires cpu >= 0.5
    maxInstances: 3,  // Limit vCPU usage in europe-west3
    timeoutSeconds: 15,
    cors: ALLOWED_ORIGINS,
  },
  async (request: CallableRequest): Promise<GetPaymentConfigOutput> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    try {
      const db = getFirestore();
      const configDoc = await db.collection('config').doc('payment_config').get();

      if (!configDoc.exists) {
        return {
          success: true,
          config: {
            minimumWithdrawalAmount: 3000,
            withdrawalsEnabled: true,
            currency: 'USD',
          },
        };
      }

      const data = configDoc.data()!;

      return {
        success: true,
        config: {
          minimumWithdrawalAmount: data.minimumWithdrawalAmount ?? 3000,
          withdrawalsEnabled: data.withdrawalsEnabled ?? true,
          currency: data.currency ?? 'USD',
        },
      };
    } catch (error) {
      logger.error('[getPaymentConfig] Error', {
        userId: request.auth.uid,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to fetch payment configuration');
    }
  }
);
