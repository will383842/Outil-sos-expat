/**
 * Unified Commission Writer
 *
 * Creates, cancels, and releases commissions in the unified `commissions` collection.
 * Handles anti-duplicate checks, atomic balance updates, and notification dispatch.
 *
 * All amounts in CENTS (USD).
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  UnifiedCommission,
  CommissionType,
  CommissionStatus,
} from "./types";

// ============================================================================
// ANTI-DUPLICATE WINDOW
// ============================================================================

const DUPLICATE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// ============================================================================
// CREATE COMMISSION
// ============================================================================

export interface CreateCommissionInput {
  // WHO EARNS
  referrerId: string;
  referrerRole: string;
  referrerCode: string;

  // WHO TRIGGERED
  refereeId: string;
  refereeRole: string;

  // TYPE
  type: CommissionType;
  subType?: string;

  // SOURCE
  sourceId?: string;
  sourceType?: string;

  // AMOUNT CALCULATION
  planId: string;
  planVersion: number;
  calculationType: "fixed" | "percentage" | "locked_rate";
  baseAmount?: number;
  rateApplied?: number;
  lockedRateUsed?: boolean;
  multiplierApplied?: number;
  promoMultiplierApplied?: number;
  amount: number;
  currency?: string;

  // STATUS
  status?: CommissionStatus;
  /** Hours to hold before releasing (0 = immediately available) */
  holdHours?: number;
}

/**
 * Create a unified commission document.
 *
 * - Anti-duplicate: checks (referrerId + sourceId + type + subType) within 30 minutes
 * - Atomic balance updates on the referrer's user doc
 * - Returns the created commission ID
 */
export async function createUnifiedCommission(
  input: CreateCommissionInput
): Promise<{ commissionId: string; commission: UnifiedCommission }> {
  validateCreateInput(input);

  const db = getFirestore();
  const now = Timestamp.now();

  // Anti-duplicate check
  if (input.sourceId) {
    const isDuplicate = await checkDuplicate(
      db,
      input.referrerId,
      input.sourceId,
      input.type,
      input.subType
    );
    if (isDuplicate) {
      throw new Error(
        `Duplicate commission: ${input.type}/${input.subType || ""} for referrer ${input.referrerId} ` +
        `and source ${input.sourceId} already exists within the last 30 minutes`
      );
    }
  }

  // Determine initial status and holdUntil
  const holdHours = input.holdHours ?? 0;
  let status: CommissionStatus;
  let holdUntil: Timestamp | undefined;

  if (input.status) {
    status = input.status;
  } else if (holdHours > 0) {
    status = "held";
    holdUntil = Timestamp.fromMillis(now.toMillis() + holdHours * 60 * 60 * 1000);
  } else {
    status = "available";
  }

  // Build the commission document
  const docRef = db.collection("commissions").doc();
  const commission: UnifiedCommission = {
    id: docRef.id,
    referrerId: input.referrerId,
    referrerRole: input.referrerRole,
    referrerCode: input.referrerCode,
    refereeId: input.refereeId,
    refereeRole: input.refereeRole,
    type: input.type,
    subType: input.subType,
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    planId: input.planId,
    planVersion: input.planVersion,
    calculationType: input.calculationType,
    baseAmount: input.baseAmount,
    rateApplied: input.rateApplied,
    lockedRateUsed: input.lockedRateUsed,
    multiplierApplied: input.multiplierApplied,
    promoMultiplierApplied: input.promoMultiplierApplied,
    amount: input.amount,
    currency: input.currency || "USD",
    status,
    holdUntil,
    createdAt: now,
    ...(status === "available" ? { availableAt: now } : {}),
    ...(status === "held" ? { validatedAt: now } : {}),
  };

  // Atomic write: commission + balance update in a batch
  const batch = db.batch();

  // 1. Create commission document
  batch.set(docRef, commission);

  // 2. Update referrer balances
  const userRef = db.collection("users").doc(input.referrerId);
  const balanceUpdate: Record<string, unknown> = {
    totalEarned: FieldValue.increment(input.amount),
  };

  if (status === "held") {
    balanceUpdate.pendingBalance = FieldValue.increment(input.amount);
  } else if (status === "available") {
    balanceUpdate.availableBalance = FieldValue.increment(input.amount);
  }

  batch.update(userRef, balanceUpdate);

  await batch.commit();

  logger.info(
    `Commission created: ${commission.id} | ${input.type}/${input.subType || "-"} | ` +
    `${input.amount}¢ → ${input.referrerId} (${status})`
  );

  // Dispatch notification (non-blocking)
  import("./notificationDispatcher")
    .then(({ dispatchCommissionNotification }) => dispatchCommissionNotification(commission))
    .catch((err) => logger.warn("Notification dispatch import failed", { error: String(err) }));

  return { commissionId: docRef.id, commission };
}

// ============================================================================
// CANCEL COMMISSION
// ============================================================================

/**
 * Cancel a commission.
 * - Cannot cancel a "paid" commission
 * - Decrements the appropriate balance on the referrer
 */
export async function cancelCommission(
  commissionId: string,
  reason: string
): Promise<void> {
  if (!commissionId) throw new Error("commissionId is required");
  if (!reason) throw new Error("reason is required");

  const db = getFirestore();
  const docRef = db.collection("commissions").doc(commissionId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      throw new Error(`Commission ${commissionId} not found`);
    }

    const commission = snap.data() as UnifiedCommission;

    if (commission.status === "paid") {
      throw new Error(`Cannot cancel commission ${commissionId}: already paid`);
    }

    if (commission.status === "cancelled") {
      throw new Error(`Commission ${commissionId} is already cancelled`);
    }

    // Decrement the appropriate balance
    const userRef = db.collection("users").doc(commission.referrerId);
    const balanceUpdate: Record<string, unknown> = {
      totalEarned: FieldValue.increment(-commission.amount),
    };

    if (commission.status === "held" || commission.status === "pending" || commission.status === "validated") {
      balanceUpdate.pendingBalance = FieldValue.increment(-commission.amount);
    } else if (commission.status === "available") {
      balanceUpdate.availableBalance = FieldValue.increment(-commission.amount);
    }

    tx.update(docRef, {
      status: "cancelled",
      cancelledAt: Timestamp.now(),
      cancelReason: reason,
    });

    tx.update(userRef, balanceUpdate);
  });

  logger.info(`Commission ${commissionId} cancelled: ${reason}`);
}

// ============================================================================
// RELEASE HELD COMMISSION
// ============================================================================

/**
 * Release a held commission to available.
 * Transfers amount from pendingBalance to availableBalance.
 */
export async function releaseHeldCommission(
  commissionId: string
): Promise<void> {
  if (!commissionId) throw new Error("commissionId is required");

  const db = getFirestore();
  const docRef = db.collection("commissions").doc(commissionId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      throw new Error(`Commission ${commissionId} not found`);
    }

    const commission = snap.data() as UnifiedCommission;

    if (commission.status !== "held") {
      throw new Error(
        `Cannot release commission ${commissionId}: status is "${commission.status}", expected "held"`
      );
    }

    const userRef = db.collection("users").doc(commission.referrerId);

    tx.update(docRef, {
      status: "available",
      availableAt: Timestamp.now(),
    });

    tx.update(userRef, {
      pendingBalance: FieldValue.increment(-commission.amount),
      availableBalance: FieldValue.increment(commission.amount),
    });
  });

  logger.info(`Commission ${commissionId} released from held → available`);
}

// ============================================================================
// BATCH RELEASE — Release all held commissions past their holdUntil
// ============================================================================

/**
 * Release all held commissions whose holdUntil has passed.
 * Designed to be called by a scheduled function.
 *
 * @param batchSize - Max commissions to process per invocation
 * @returns Number of commissions released
 */
export async function releaseExpiredHeldCommissions(
  batchSize = 100
): Promise<number> {
  const db = getFirestore();
  const now = Timestamp.now();

  const query = db
    .collection("commissions")
    .where("status", "==", "held")
    .where("holdUntil", "<=", now)
    .limit(batchSize);

  const snap = await query.get();
  if (snap.empty) return 0;

  let released = 0;

  for (const doc of snap.docs) {
    try {
      await releaseHeldCommission(doc.id);
      released++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to release commission ${doc.id}: ${message}`);
    }
  }

  logger.info(`Released ${released}/${snap.size} expired held commissions`);
  return released;
}

// ============================================================================
// MARK COMMISSION AS PAID
// ============================================================================

/**
 * Mark a commission as paid (after withdrawal is processed).
 */
export async function markCommissionPaid(
  commissionId: string,
  payoutId: string
): Promise<void> {
  if (!commissionId) throw new Error("commissionId is required");
  if (!payoutId) throw new Error("payoutId is required");

  const db = getFirestore();
  const docRef = db.collection("commissions").doc(commissionId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      throw new Error(`Commission ${commissionId} not found`);
    }

    const commission = snap.data() as UnifiedCommission;

    if (commission.status !== "available") {
      throw new Error(
        `Cannot mark commission ${commissionId} as paid: status is "${commission.status}", expected "available"`
      );
    }

    tx.update(docRef, {
      status: "paid",
      paidAt: Timestamp.now(),
      payoutId,
    });

    // Decrement available balance (already deducted by withdrawal system)
    // Note: The withdrawal system handles the balance deduction.
    // This just updates the commission status for tracking.
  });

  logger.info(`Commission ${commissionId} marked as paid (payout: ${payoutId})`);
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get all commissions for a referrer, ordered by creation date.
 */
export async function getCommissionsByReferrer(
  referrerId: string,
  options?: {
    status?: CommissionStatus;
    type?: CommissionType;
    limit?: number;
    startAfter?: Timestamp;
  }
): Promise<UnifiedCommission[]> {
  const db = getFirestore();
  let query: FirebaseFirestore.Query = db
    .collection("commissions")
    .where("referrerId", "==", referrerId);

  if (options?.status) {
    query = query.where("status", "==", options.status);
  }

  if (options?.type) {
    query = query.where("type", "==", options.type);
  }

  query = query.orderBy("createdAt", "desc");

  if (options?.startAfter) {
    query = query.startAfter(options.startAfter);
  }

  query = query.limit(options?.limit ?? 50);

  const snap = await query.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as UnifiedCommission);
}

/**
 * Get commission summary for a referrer (totals by status).
 */
export async function getCommissionSummary(
  referrerId: string
): Promise<{
  totalEarned: number;
  pendingBalance: number;
  availableBalance: number;
  paidTotal: number;
  cancelledTotal: number;
  commissionCount: number;
}> {
  const db = getFirestore();
  const snap = await db
    .collection("commissions")
    .where("referrerId", "==", referrerId)
    .get();

  let totalEarned = 0;
  let pendingBalance = 0;
  let availableBalance = 0;
  let paidTotal = 0;
  let cancelledTotal = 0;

  for (const doc of snap.docs) {
    const c = doc.data() as UnifiedCommission;
    switch (c.status) {
      case "held":
      case "pending":
      case "validated":
        pendingBalance += c.amount;
        totalEarned += c.amount;
        break;
      case "available":
        availableBalance += c.amount;
        totalEarned += c.amount;
        break;
      case "paid":
        paidTotal += c.amount;
        totalEarned += c.amount;
        break;
      case "cancelled":
        cancelledTotal += c.amount;
        break;
    }
  }

  return {
    totalEarned,
    pendingBalance,
    availableBalance,
    paidTotal,
    cancelledTotal,
    commissionCount: snap.size,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function validateCreateInput(input: CreateCommissionInput): void {
  if (!input.referrerId) throw new Error("referrerId is required");
  if (!input.referrerRole) throw new Error("referrerRole is required");
  if (!input.referrerCode) throw new Error("referrerCode is required");
  if (!input.refereeId) throw new Error("refereeId is required");
  if (!input.refereeRole) throw new Error("refereeRole is required");
  if (!input.type) throw new Error("type is required");
  if (!input.planId) throw new Error("planId is required");
  if (typeof input.planVersion !== "number") throw new Error("planVersion must be a number");
  if (!input.calculationType) throw new Error("calculationType is required");
  if (typeof input.amount !== "number" || input.amount < 0) {
    throw new Error("amount must be a non-negative number");
  }
  if (input.status && input.holdHours && input.holdHours > 0) {
    throw new Error("Cannot specify both status and holdHours — use one or the other");
  }
}

async function checkDuplicate(
  db: FirebaseFirestore.Firestore,
  referrerId: string,
  sourceId: string,
  type: CommissionType,
  subType?: string
): Promise<boolean> {
  const windowStart = Timestamp.fromMillis(Date.now() - DUPLICATE_WINDOW_MS);

  let query: FirebaseFirestore.Query = db
    .collection("commissions")
    .where("referrerId", "==", referrerId)
    .where("sourceId", "==", sourceId)
    .where("type", "==", type)
    .where("createdAt", ">=", windowStart)
    .limit(1);

  const snap = await query.get();
  if (snap.empty) return false;

  // If subType matters, check it on the returned doc
  if (subType) {
    const doc = snap.docs[0].data() as UnifiedCommission;
    return doc.subType === subType;
  }

  return true;
}
