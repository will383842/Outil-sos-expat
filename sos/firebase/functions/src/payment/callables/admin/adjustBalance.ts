/**
 * Admin Callable: Adjust Balance
 *
 * Allows admins to manually credit or debit an affiliate's balance.
 * Creates a full audit trail for every adjustment.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
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
 * Input for adjusting a user's balance
 */
interface AdjustBalanceInput {
  userId: string;
  userType: 'chatter' | 'influencer' | 'blogger' | 'group_admin' | 'affiliate';
  amount: number; // cents — positive = credit, negative = debit
  reason: string;
  reference?: string; // optional external reference
}

/** Map userType to Firestore collection name */
const USER_TYPE_COLLECTION_MAP: Record<AdjustBalanceInput['userType'], string> = {
  chatter: 'chatters',
  influencer: 'influencers',
  blogger: 'bloggers',
  group_admin: 'group_admins',
  affiliate: 'users', // affiliates are stored in the users collection
};

const VALID_USER_TYPES = Object.keys(USER_TYPE_COLLECTION_MAP) as AdjustBalanceInput['userType'][];
const MAX_AMOUNT_CENTS = 1_000_000; // $10,000
const MIN_REASON_LENGTH = 10;

/**
 * Adjust Balance
 *
 * Manually credits or debits an affiliate's available balance.
 * Positive amount = credit, negative amount = debit.
 * Debits cannot bring the balance below zero.
 */
export const adminAdjustBalance = onCall(
  { ...adminConfig, memory: '256MiB', timeoutSeconds: 30 },
  async (request): Promise<{
    success: boolean;
    message: string;
    previousBalance: number;
    newBalance: number;
    auditId: string;
  }> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();
    const input = request.data as AdjustBalanceInput;

    // ── Input Validation ──────────────────────────────────────────────

    if (!input?.userId || typeof input.userId !== 'string') {
      throw new HttpsError('invalid-argument', 'userId is required');
    }

    if (!input.userType || !VALID_USER_TYPES.includes(input.userType)) {
      throw new HttpsError(
        'invalid-argument',
        `userType must be one of: ${VALID_USER_TYPES.join(', ')}`
      );
    }

    if (typeof input.amount !== 'number' || input.amount === 0 || !Number.isInteger(input.amount)) {
      throw new HttpsError('invalid-argument', 'amount must be a non-zero integer (cents)');
    }

    if (Math.abs(input.amount) > MAX_AMOUNT_CENTS) {
      throw new HttpsError(
        'invalid-argument',
        `amount cannot exceed ${MAX_AMOUNT_CENTS} cents ($${MAX_AMOUNT_CENTS / 100})`
      );
    }

    if (!input.reason || typeof input.reason !== 'string' || input.reason.trim().length < MIN_REASON_LENGTH) {
      throw new HttpsError(
        'invalid-argument',
        `reason is required and must be at least ${MIN_REASON_LENGTH} characters`
      );
    }

    const { userId, userType, amount, reason, reference } = input;
    const collection = USER_TYPE_COLLECTION_MAP[userType];

    try {
      logger.info('[adminAdjustBalance] Adjusting balance', {
        adminId,
        userId,
        userType,
        amount,
        direction: amount > 0 ? 'credit' : 'debit',
      });

      const userRef = db.collection(collection).doc(userId);
      let auditId = '';
      let previousBalance = 0;
      let newBalance = 0;

      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new HttpsError(
            'not-found',
            `User not found in ${collection} collection`
          );
        }

        const userData = userDoc.data()!;
        const currentBalance = typeof userData.availableBalance === 'number'
          ? userData.availableBalance
          : 0;

        // Prevent negative balance on debit
        if (amount < 0 && currentBalance + amount < 0) {
          throw new HttpsError(
            'failed-precondition',
            `Insufficient balance. Current: ${currentBalance} cents ($${(currentBalance / 100).toFixed(2)}), ` +
            `debit: ${Math.abs(amount)} cents ($${(Math.abs(amount) / 100).toFixed(2)})`
          );
        }

        previousBalance = currentBalance;
        newBalance = currentBalance + amount;

        // Update balance
        transaction.update(userRef, {
          availableBalance: FieldValue.increment(amount),
        });

        // Create audit log
        const auditRef = db.collection('payment_audit_logs').doc();
        auditId = auditRef.id;

        transaction.set(auditRef, {
          id: auditRef.id,
          action: 'balance_adjusted',
          actorId: adminId,
          actorType: 'admin',
          targetId: userId,
          targetType: userType,
          timestamp: Timestamp.now(),
          details: {
            amount,
            direction: amount > 0 ? 'credit' : 'debit',
            reason: reason.trim(),
            reference: reference || null,
            previousBalance,
            newBalance,
          },
        });
      });

      const direction = amount > 0 ? 'credited' : 'debited';
      const absAmount = Math.abs(amount);

      logger.info('[adminAdjustBalance] Balance adjusted successfully', {
        adminId,
        userId,
        userType,
        amount,
        previousBalance,
        newBalance,
        auditId,
      });

      return {
        success: true,
        message: `Successfully ${direction} $${(absAmount / 100).toFixed(2)} (${absAmount} cents) for ${userType} ${userId}`,
        previousBalance,
        newBalance,
        auditId,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('[adminAdjustBalance] Error', {
        adminId,
        userId,
        userType,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to adjust balance');
    }
  }
);
