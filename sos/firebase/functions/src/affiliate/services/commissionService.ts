/**
 * Commission Service
 *
 * Core service for creating and managing affiliate commissions.
 * Handles:
 * - Commission creation with proper calculation
 * - Balance updates (atomic transactions)
 * - Duplicate prevention
 * - Hold period management
 */

import {
  getFirestore,
  Timestamp,
  FieldValue,
  Transaction,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  AffiliateCommission,
  CommissionActionType,
  CommissionStatus,
  CapturedRates,
  CommissionRule,
} from "../types";
import {
  calculateCommission,
  shouldCreateCommission,
  getBaseAmountForRule,
  formatCents,
} from "../utils/commissionCalculator";
import { getAffiliateConfigCached } from "../utils/configService";

/**
 * Input for creating a commission
 */
export interface CreateCommissionInput {
  /** Action type */
  type: CommissionActionType;

  /** Affiliate who will earn the commission */
  referrerId: string;

  /** User who generated the commission */
  refereeId: string;

  /** Source document reference */
  source: {
    id: string;
    type: "call_session" | "payment" | "subscription" | "user";
    details?: Record<string, unknown>;
  };

  /** Amounts for commission calculation */
  amounts: {
    connectionFee?: number;
    totalAmount?: number;
    firstMonth?: number;
    annualValue?: number;
  };

  /** Context for condition checking */
  context?: {
    isEmailVerified?: boolean;
    accountAgeDays?: number;
    callDuration?: number;
    providerType?: "lawyer" | "expat";
    isFirstCall?: boolean;
    callsThisMonth?: number;
    lifetimeCommissions?: number;
    planType?: string;
    isFirstSubscription?: boolean;
    renewalMonth?: number;
    isKYCComplete?: boolean;
    hasFirstCall?: boolean;
  };

  /** Override rule (for manual adjustments) */
  overrideRule?: CommissionRule;

  /** Override amount (for manual adjustments) */
  overrideAmount?: number;

  /** Description */
  description?: string;
}

/**
 * Result of commission creation
 */
export interface CreateCommissionResult {
  success: boolean;
  commissionId?: string;
  amount?: number;
  error?: string;
  reason?: string;
}

/**
 * Create a commission for an affiliate
 */
export async function createCommission(
  input: CreateCommissionInput
): Promise<CreateCommissionResult> {
  const db = getFirestore();

  try {
    // 1. Get affiliate config
    const config = await getAffiliateConfigCached();

    if (!config.isSystemActive) {
      logger.info("[CommissionService] System is inactive, skipping commission");
      return { success: false, reason: "Affiliate system is inactive" };
    }

    // 2. Get referrer and referee data
    const [referrerDoc, refereeDoc] = await Promise.all([
      db.collection("users").doc(input.referrerId).get(),
      db.collection("users").doc(input.refereeId).get(),
    ]);

    if (!referrerDoc.exists) {
      logger.warn("[CommissionService] Referrer not found", {
        referrerId: input.referrerId,
      });
      return { success: false, error: "Referrer not found" };
    }

    if (!refereeDoc.exists) {
      logger.warn("[CommissionService] Referee not found", {
        refereeId: input.refereeId,
      });
      return { success: false, error: "Referee not found" };
    }

    const referrerData = referrerDoc.data()!;
    const refereeData = refereeDoc.data()!;

    // 3. Check if referrer has affiliate status
    if (referrerData.affiliateStatus === "suspended") {
      logger.info("[CommissionService] Referrer is suspended", {
        referrerId: input.referrerId,
      });
      return { success: false, reason: "Referrer account is suspended" };
    }

    // 4. Check for duplicate (same source)
    if (input.source.id) {
      const duplicateCheck = await db
        .collection("affiliate_commissions")
        .where("referrerId", "==", input.referrerId)
        .where("refereeId", "==", input.refereeId)
        .where("type", "==", input.type)
        .where("sourceId", "==", input.source.id)
        .limit(1)
        .get();

      if (!duplicateCheck.empty) {
        logger.info("[CommissionService] Duplicate commission detected", {
          referrerId: input.referrerId,
          refereeId: input.refereeId,
          type: input.type,
          sourceId: input.source.id,
        });
        return { success: false, reason: "Commission already exists for this action" };
      }
    }

    // 5. Get commission rule (use override or fetch from config)
    let rule: CommissionRule;
    if (input.overrideRule) {
      rule = input.overrideRule;
    } else if (input.type === "manual_adjustment") {
      // Manual adjustments need override
      return { success: false, error: "Manual adjustments require overrideRule or overrideAmount" };
    } else {
      const ruleKey = input.type as keyof typeof config.commissionRules;
      rule = config.commissionRules[ruleKey];
    }

    // 6. Check conditions
    if (input.type !== "manual_adjustment") {
      const conditionCheck = shouldCreateCommission(rule, input.context || {});
      if (!conditionCheck.allowed) {
        logger.info("[CommissionService] Conditions not met", {
          type: input.type,
          reason: conditionCheck.reason,
        });
        return { success: false, reason: conditionCheck.reason };
      }
    }

    // 7. Get captured rates (frozen at signup)
    const capturedRates: CapturedRates | undefined = referrerData.capturedRates;

    // 8. Calculate commission amount
    let amount: number;
    let calculationType = rule.type;
    let baseAmount: number | null = null;
    let rateApplied: number | null = null;
    let fixedAmount: number | null = null;
    let calculationDetails: string;

    if (input.overrideAmount !== undefined) {
      // Manual override
      amount = input.overrideAmount;
      calculationDetails = `Ajustement manuel: ${formatCents(amount)}`;
    } else {
      // Calculate based on rule
      const baseAmountForCalc = getBaseAmountForRule(rule, input.amounts);
      const calcResult = calculateCommission(rule, baseAmountForCalc, capturedRates, input.type);

      if (!calcResult.success) {
        logger.warn("[CommissionService] Calculation failed", {
          error: calcResult.error,
        });
        return { success: false, error: calcResult.error };
      }

      amount = calcResult.amount;
      calculationType = calcResult.calculationType;
      baseAmount = calcResult.baseAmount;
      rateApplied = calcResult.rateApplied;
      fixedAmount = calcResult.fixedAmount;
      calculationDetails = calcResult.calculationDetails;
    }

    // 9. Skip if amount is 0
    if (amount <= 0) {
      logger.info("[CommissionService] Commission amount is 0, skipping", {
        type: input.type,
      });
      return { success: false, reason: "Commission amount would be 0" };
    }

    // 10. Determine status based on hold period
    const holdPeriodHours = config.withdrawal.holdPeriodHours;
    const now = Timestamp.now();
    const availableAt =
      holdPeriodHours > 0
        ? Timestamp.fromDate(new Date(now.toMillis() + holdPeriodHours * 60 * 60 * 1000))
        : now;
    const status: CommissionStatus = holdPeriodHours > 0 ? "pending" : "available";

    // 11. Create commission document
    const commission: Omit<AffiliateCommission, "id"> = {
      referrerId: input.referrerId,
      referrerEmail: referrerData.email,
      referrerAffiliateCode: referrerData.affiliateCode,
      refereeId: input.refereeId,
      refereeEmail: refereeData.email,
      type: input.type,
      sourceId: input.source.id,
      sourceType: input.source.type,
      sourceDetails: input.source.details as AffiliateCommission["sourceDetails"],
      calculationType,
      baseAmount,
      rateApplied,
      fixedAmount,
      amount,
      currency: "USD",
      calculationDetails,
      status,
      availableAt,
      payoutId: null,
      paidAt: null,
      description: input.description || getDefaultDescription(input.type),
      createdAt: now,
      updatedAt: now,
    };

    // 12. Execute transaction: create commission + update balances
    const commissionRef = db.collection("affiliate_commissions").doc();

    await db.runTransaction(async (transaction: Transaction) => {
      // Create commission
      transaction.set(commissionRef, { ...commission, id: commissionRef.id });

      // Update referrer balances
      const balanceUpdate: Record<string, FieldValue | number> = {
        totalEarned: FieldValue.increment(amount),
        "affiliateStats.totalCommissions": FieldValue.increment(1),
        updatedAt: now,
      };

      if (status === "pending") {
        balanceUpdate.pendingBalance = FieldValue.increment(amount);
      } else {
        balanceUpdate.availableBalance = FieldValue.increment(amount);
      }

      // Update stats by type
      const statKey = getStatKeyForType(input.type);
      if (statKey) {
        balanceUpdate[`affiliateStats.byType.${statKey}.count`] = FieldValue.increment(1);
        balanceUpdate[`affiliateStats.byType.${statKey}.amount`] = FieldValue.increment(amount);
      }

      transaction.update(referrerDoc.ref, balanceUpdate);
    });

    logger.info("[CommissionService] Commission created successfully", {
      commissionId: commissionRef.id,
      referrerId: input.referrerId,
      refereeId: input.refereeId,
      type: input.type,
      amount,
      status,
    });

    return {
      success: true,
      commissionId: commissionRef.id,
      amount,
    };
  } catch (error) {
    logger.error("[CommissionService] Error creating commission", {
      error,
      input,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Release pending commissions that have passed their hold period
 */
export async function releasePendingCommissions(): Promise<{
  released: number;
  failed: number;
}> {
  const db = getFirestore();
  const now = Timestamp.now();

  try {
    // Find pending commissions where availableAt has passed
    const pendingQuery = await db
      .collection("affiliate_commissions")
      .where("status", "==", "pending")
      .where("availableAt", "<=", now)
      .limit(500)
      .get();

    if (pendingQuery.empty) {
      logger.info("[CommissionService] No pending commissions to release");
      return { released: 0, failed: 0 };
    }

    let released = 0;
    let failed = 0;

    // Process in batches to avoid transaction limits
    const batch = db.batch();
    const userUpdates: Map<string, number> = new Map();

    for (const doc of pendingQuery.docs) {
      try {
        const commission = doc.data() as AffiliateCommission;

        // Update commission status
        batch.update(doc.ref, {
          status: "available",
          updatedAt: now,
        });

        // Accumulate user balance updates
        const currentAmount = userUpdates.get(commission.referrerId) || 0;
        userUpdates.set(commission.referrerId, currentAmount + commission.amount);

        released++;
      } catch (err) {
        logger.error("[CommissionService] Error processing commission", {
          commissionId: doc.id,
          error: err,
        });
        failed++;
      }
    }

    // Commit commission updates
    await batch.commit();

    // Update user balances
    for (const [userId, amount] of userUpdates) {
      await db
        .collection("users")
        .doc(userId)
        .update({
          pendingBalance: FieldValue.increment(-amount),
          availableBalance: FieldValue.increment(amount),
          updatedAt: now,
        });
    }

    logger.info("[CommissionService] Released pending commissions", {
      released,
      failed,
      usersUpdated: userUpdates.size,
    });

    return { released, failed };
  } catch (error) {
    logger.error("[CommissionService] Error releasing commissions", { error });
    throw error;
  }
}

/**
 * Cancel a commission (admin action)
 */
export async function cancelCommission(
  commissionId: string,
  cancelledBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const commissionRef = db.collection("affiliate_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as AffiliateCommission;

    if (commission.status === "cancelled") {
      return { success: false, error: "Commission already cancelled" };
    }

    if (commission.status === "paid") {
      return { success: false, error: "Cannot cancel a paid commission" };
    }

    const now = Timestamp.now();

    await db.runTransaction(async (transaction: Transaction) => {
      // Update commission
      transaction.update(commissionRef, {
        status: "cancelled",
        cancellationReason: reason,
        cancelledBy,
        cancelledAt: now,
        updatedAt: now,
      });

      // Update user balances
      const userRef = db.collection("users").doc(commission.referrerId);

      const balanceUpdate: Record<string, FieldValue | Timestamp> = {
        updatedAt: now,
      };

      if (commission.status === "pending") {
        balanceUpdate.pendingBalance = FieldValue.increment(-commission.amount);
      } else {
        balanceUpdate.availableBalance = FieldValue.increment(-commission.amount);
      }

      // Don't decrease totalEarned - it's a lifetime counter

      transaction.update(userRef, balanceUpdate);
    });

    logger.info("[CommissionService] Commission cancelled", {
      commissionId,
      cancelledBy,
      reason,
    });

    return { success: true };
  } catch (error) {
    logger.error("[CommissionService] Error cancelling commission", {
      commissionId,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Adjust commission amount (admin action)
 */
export async function adjustCommissionAmount(
  commissionId: string,
  newAmount: number,
  adjustedBy: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const commissionRef = db.collection("affiliate_commissions").doc(commissionId);
    const commissionDoc = await commissionRef.get();

    if (!commissionDoc.exists) {
      return { success: false, error: "Commission not found" };
    }

    const commission = commissionDoc.data() as AffiliateCommission;

    if (commission.status === "paid") {
      return { success: false, error: "Cannot adjust a paid commission" };
    }

    if (commission.status === "cancelled") {
      return { success: false, error: "Cannot adjust a cancelled commission" };
    }

    const difference = newAmount - commission.amount;
    const now = Timestamp.now();

    await db.runTransaction(async (transaction: Transaction) => {
      // Update commission
      transaction.update(commissionRef, {
        amount: newAmount,
        calculationDetails: `${commission.calculationDetails} → Ajusté à ${formatCents(newAmount)} (${reason})`,
        adminNotes: `Ajusté par ${adjustedBy}: ${reason}`,
        updatedAt: now,
      });

      // Update user balances
      const userRef = db.collection("users").doc(commission.referrerId);

      const balanceUpdate: Record<string, FieldValue | Timestamp> = {
        totalEarned: FieldValue.increment(difference),
        updatedAt: now,
      };

      if (commission.status === "pending") {
        balanceUpdate.pendingBalance = FieldValue.increment(difference);
      } else {
        balanceUpdate.availableBalance = FieldValue.increment(difference);
      }

      transaction.update(userRef, balanceUpdate);
    });

    logger.info("[CommissionService] Commission adjusted", {
      commissionId,
      oldAmount: commission.amount,
      newAmount,
      adjustedBy,
      reason,
    });

    return { success: true };
  } catch (error) {
    logger.error("[CommissionService] Error adjusting commission", {
      commissionId,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get default description for commission type
 */
function getDefaultDescription(type: CommissionActionType): string {
  switch (type) {
    case "referral_signup":
      return "Commission sur inscription filleul";
    case "referral_first_call":
      return "Commission sur premier appel filleul";
    case "referral_recurring_call":
      return "Commission sur appel filleul";
    case "referral_subscription":
      return "Commission sur abonnement filleul";
    case "referral_subscription_renewal":
      return "Commission sur renouvellement abonnement";
    case "referral_provider_validated":
      return "Bonus prestataire validé";
    case "manual_adjustment":
      return "Ajustement manuel";
    default:
      return "Commission affiliation";
  }
}

/**
 * Get stat key for commission type
 */
function getStatKeyForType(type: CommissionActionType): string | null {
  switch (type) {
    case "referral_signup":
      return "signup";
    case "referral_first_call":
      return "firstCall";
    case "referral_recurring_call":
      return "recurringCall";
    case "referral_subscription":
      return "subscription";
    case "referral_subscription_renewal":
      return "renewal";
    case "referral_provider_validated":
      return "providerBonus";
    default:
      return null;
  }
}
