/**
 * Partner Commission Service
 *
 * Handles commission creation, validation, and balance updates.
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import type { Partner, PartnerCommission, PartnerCommissionStatus } from "../types";

const db = () => getFirestore();

interface CreateCommissionInput {
  partnerId: string;
  partnerCode: string;
  partnerEmail: string;
  type: "client_referral" | "manual_adjustment";
  sourceId: string | null;
  sourceType: "call_session" | null;
  sourceDetails?: PartnerCommission["sourceDetails"];
  amount: number;
  description: string;
}

/**
 * Create a new commission and update partner balances atomically
 */
export async function createPartnerCommission(input: CreateCommissionInput): Promise<string> {
  const firestore = db();
  const commissionRef = firestore.collection("partner_commissions").doc();
  const partnerRef = firestore.collection("partners").doc(input.partnerId);

  const now = Timestamp.now();
  const commission: PartnerCommission = {
    id: commissionRef.id,
    partnerId: input.partnerId,
    partnerCode: input.partnerCode,
    partnerEmail: input.partnerEmail,
    type: input.type,
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    sourceDetails: input.sourceDetails,
    amount: input.amount,
    currency: "USD",
    description: input.description,
    status: "pending",
    validatedAt: null,
    availableAt: null,
    withdrawalId: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await firestore.runTransaction(async (txn) => {
    const partnerDoc = await txn.get(partnerRef);
    if (!partnerDoc.exists) {
      throw new Error(`Partner ${input.partnerId} not found`);
    }

    txn.set(commissionRef, commission);

    txn.update(partnerRef, {
      pendingBalance: FieldValue.increment(input.amount),
      totalEarned: FieldValue.increment(input.amount),
      totalCommissions: FieldValue.increment(1),
      "currentMonthStats.earnings": FieldValue.increment(input.amount),
      "currentMonthStats.calls": FieldValue.increment(input.type === "client_referral" ? 1 : 0),
      updatedAt: now,
    });
  });

  logger.info(`[PartnerCommission] Created commission ${commissionRef.id}`, {
    partnerId: input.partnerId,
    amount: input.amount,
    type: input.type,
  });

  return commissionRef.id;
}

/**
 * Transition commission status and update balances
 */
export async function updateCommissionStatus(
  commissionId: string,
  newStatus: PartnerCommissionStatus,
  adminNotes?: string
): Promise<void> {
  const firestore = db();
  const commissionRef = firestore.collection("partner_commissions").doc(commissionId);

  await firestore.runTransaction(async (txn) => {
    const commDoc = await txn.get(commissionRef);
    if (!commDoc.exists) throw new Error(`Commission ${commissionId} not found`);

    const commission = commDoc.data() as PartnerCommission;
    const partnerRef = firestore.collection("partners").doc(commission.partnerId);
    const now = Timestamp.now();
    const updates: Record<string, unknown> = { status: newStatus, updatedAt: now };

    if (newStatus === "validated" && commission.status === "pending") {
      updates.validatedAt = now;
      txn.update(partnerRef, {
        pendingBalance: FieldValue.increment(-commission.amount),
        validatedBalance: FieldValue.increment(commission.amount),
        updatedAt: now,
      });
    } else if (newStatus === "available" && commission.status === "validated") {
      updates.availableAt = now;
      txn.update(partnerRef, {
        validatedBalance: FieldValue.increment(-commission.amount),
        availableBalance: FieldValue.increment(commission.amount),
        updatedAt: now,
      });
    } else if (newStatus === "cancelled") {
      updates.cancellationReason = adminNotes || "Cancelled";
      updates.cancelledAt = now;
      // Reverse from whichever balance it was in
      const balanceField =
        commission.status === "pending" ? "pendingBalance" :
        commission.status === "validated" ? "validatedBalance" :
        commission.status === "available" ? "availableBalance" : null;

      if (balanceField) {
        txn.update(partnerRef, {
          [balanceField]: FieldValue.increment(-commission.amount),
          totalEarned: FieldValue.increment(-commission.amount),
          totalCommissions: FieldValue.increment(-1),
          updatedAt: now,
        });
      }
    }

    if (adminNotes) updates.adminNotes = adminNotes;
    txn.update(commissionRef, updates);
  });
}

/**
 * Check if a commission already exists for this source
 */
export async function isDuplicateCommission(
  partnerId: string,
  sourceId: string,
  type: string
): Promise<boolean> {
  const snap = await db().collection("partner_commissions")
    .where("partnerId", "==", partnerId)
    .where("sourceId", "==", sourceId)
    .where("type", "==", type)
    .limit(1)
    .get();

  return !snap.empty;
}

/**
 * Calculate commission amount based on partner config
 */
export function calculateCommissionAmount(
  partner: Partner,
  providerType: "lawyer" | "expat",
  callPrice?: number
): number {
  const config = partner.commissionConfig;

  if (config.usePercentage && config.commissionPercentage && callPrice) {
    return Math.round(callPrice * config.commissionPercentage / 100);
  }

  return providerType === "lawyer"
    ? config.commissionPerCallLawyer
    : config.commissionPerCallExpat;
}
