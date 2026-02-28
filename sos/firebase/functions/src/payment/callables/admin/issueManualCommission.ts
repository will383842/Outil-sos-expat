/**
 * Admin Callable: Issue Manual Commission
 *
 * Allows admins to manually credit a commission to an affiliate.
 * Creates the commission document + updates balance + audit log.
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
 * Input for issuing a manual commission
 */
interface IssueManualCommissionInput {
  userId: string;
  userType: 'chatter' | 'influencer' | 'blogger' | 'group_admin';
  amount: number; // positive, in cents
  reason: string;
  reference?: string;
}

const USER_TYPE_COLLECTION_MAP: Record<string, string> = {
  chatter: 'chatters',
  influencer: 'influencers',
  blogger: 'bloggers',
  group_admin: 'group_admins',
};

const USER_TYPE_COMMISSION_COLLECTION_MAP: Record<string, string> = {
  chatter: 'chatter_commissions',
  influencer: 'influencer_commissions',
  blogger: 'blogger_commissions',
  group_admin: 'group_admin_commissions',
};

/**
 * Issue Manual Commission
 *
 * Creates a commission document and credits the user's available balance.
 * The commission is immediately marked as 'available' (skips validation period).
 */
export const adminIssueManualCommission = onCall(
  { ...adminConfig, memory: '256MiB', timeoutSeconds: 30 },
  async (request): Promise<{
    success: boolean;
    message: string;
    commissionId: string;
    newBalance: number;
  }> => {
    ensureInitialized();
    const adminId = await verifyAdmin(request);

    const db = getFirestore();
    const input = request.data as IssueManualCommissionInput;

    // Validate inputs
    if (!input?.userId || typeof input.userId !== 'string') {
      throw new HttpsError('invalid-argument', 'User ID is required');
    }

    const validUserTypes = ['chatter', 'influencer', 'blogger', 'group_admin'];
    if (!input.userType || !validUserTypes.includes(input.userType)) {
      throw new HttpsError('invalid-argument', `Invalid userType. Must be one of: ${validUserTypes.join(', ')}`);
    }

    if (!input.amount || typeof input.amount !== 'number' || input.amount <= 0 || !Number.isInteger(input.amount)) {
      throw new HttpsError('invalid-argument', 'Amount must be a positive integer (cents)');
    }

    if (input.amount > 1000000) {
      throw new HttpsError('invalid-argument', 'Amount cannot exceed $10,000 (1000000 cents)');
    }

    if (!input.reason || typeof input.reason !== 'string' || input.reason.trim().length < 10) {
      throw new HttpsError('invalid-argument', 'Reason must be at least 10 characters');
    }

    const { userId, userType, amount, reason, reference } = input;
    const collection = USER_TYPE_COLLECTION_MAP[userType];
    const commissionCollection = USER_TYPE_COMMISSION_COLLECTION_MAP[userType];

    try {
      logger.info('[adminIssueManualCommission] Issuing commission', {
        adminId,
        userId,
        userType,
        amount,
      });

      const now = Timestamp.now();
      const commissionRef = db.collection(commissionCollection).doc();

      // Run in transaction for atomicity
      const result = await db.runTransaction(async (transaction) => {
        const userRef = db.collection(collection).doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new HttpsError('not-found', `${userType} not found: ${userId}`);
        }

        const userData = userDoc.data()!;
        const currentBalance = typeof userData.availableBalance === 'number'
          ? userData.availableBalance : 0;
        const newBalance = currentBalance + amount;

        // Build commission document matching the specific type interface
        let commissionData: Record<string, unknown>;
        const adminSource = `admin_${adminId}_${Date.now()}`;
        const desc = `Manual commission: ${reason}`;

        if (userType === 'chatter') {
          commissionData = {
            id: commissionRef.id,
            chatterId: userId,
            type: 'manual_adjustment',
            sourceId: adminSource,
            sourceType: 'bonus',
            sourceDetails: { adminId, reason, reference: reference || null },
            baseAmount: amount,
            amount,
            currency: 'USD',
            calculationDetails: `Manual commission by admin: $${(amount / 100).toFixed(2)}`,
            status: 'available',
            validatedAt: now,
            availableAt: now,
            withdrawalId: null,
            paidAt: null,
            description: desc,
            createdAt: now,
            updatedAt: now,
            chatterEmail: userData.email || '',
            chatterCode: userData.affiliateCodeClient || '',
            levelBonus: 1.0,
            top3Bonus: 1.0,
            zoomBonus: 1.0,
            streakBonus: 1.0,
            monthlyTopMultiplier: 1.0,
          };
        } else if (userType === 'influencer') {
          commissionData = {
            id: commissionRef.id,
            influencerId: userId,
            type: 'manual_adjustment',
            sourceId: adminSource,
            sourceType: null,
            sourceDetails: { adminId, reason, reference: reference || null },
            baseAmount: amount,
            amount,
            currency: 'USD',
            calculationDetails: `Manual commission by admin: $${(amount / 100).toFixed(2)}`,
            status: 'available',
            validatedAt: now,
            availableAt: now,
            withdrawalId: null,
            paidAt: null,
            description: desc,
            createdAt: now,
            updatedAt: now,
            influencerEmail: userData.email || '',
            influencerCode: userData.affiliateCodeClient || '',
            levelBonus: 1.0,
            top3Bonus: 1.0,
            streakBonus: 1.0,
            monthlyTopMultiplier: 1.0,
          };
        } else if (userType === 'blogger') {
          commissionData = {
            id: commissionRef.id,
            bloggerId: userId,
            type: 'manual_adjustment',
            sourceId: adminSource,
            sourceType: null,
            amount,
            currency: 'USD',
            status: 'available',
            validatedAt: now,
            availableAt: now,
            withdrawalId: null,
            paidAt: null,
            description: desc,
            createdAt: now,
            updatedAt: now,
            bloggerEmail: userData.email || '',
            bloggerCode: userData.affiliateCodeClient || '',
          };
        } else {
          // group_admin — uses different schema (sourceClientId/sourceCallId/sourceRecruitId)
          commissionData = {
            id: commissionRef.id,
            groupAdminId: userId,
            type: 'manual_adjustment',
            amount,
            originalAmount: amount,
            currency: 'USD',
            status: 'available',
            description: desc,
            createdAt: now,
            sourceClientId: null,
            sourceCallId: null,
            sourceRecruitId: adminSource,
            validatedAt: now,
            availableAt: now,
          };
        }

        transaction.set(commissionRef, commissionData);

        // Update user balance
        transaction.update(userRef, {
          availableBalance: FieldValue.increment(amount),
          totalEarned: FieldValue.increment(amount),
          updatedAt: now,
        });

        // Create audit log
        const auditRef = db.collection('payment_audit_logs').doc();
        transaction.set(auditRef, {
          id: auditRef.id,
          action: 'manual_commission_issued',
          actorId: adminId,
          actorType: 'admin',
          targetId: userId,
          targetType: userType,
          timestamp: now,
          details: {
            commissionId: commissionRef.id,
            amount,
            reason,
            reference: reference || null,
            previousBalance: currentBalance,
            newBalance,
          },
        });

        return { newBalance, commissionId: commissionRef.id };
      });

      logger.info('[adminIssueManualCommission] Commission issued', {
        adminId,
        userId,
        userType,
        amount,
        commissionId: result.commissionId,
        newBalance: result.newBalance,
      });

      return {
        success: true,
        message: `Commission of $${(amount / 100).toFixed(2)} issued to ${userType} ${userId}`,
        commissionId: result.commissionId,
        newBalance: result.newBalance,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('[adminIssueManualCommission] Error', {
        adminId,
        userId,
        userType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HttpsError('internal', 'Failed to issue manual commission');
    }
  }
);
