/**
 * Admin Callable — Manual Commission Adjustment
 *
 * Allows an admin to create a manual commission adjustment (credit or debit)
 * for any affiliate user. Used for corrections, bonuses, or penalty deductions.
 *
 * Region: us-central1 (affiliate region)
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions/v2";
import { affiliateAdminConfig } from "../../lib/functionConfigs";
import { createUnifiedCommission } from "../commissionWriter";

function ensureInitialized() {
  if (!getApps().length) initializeApp();
}

async function assertAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const uid = request.auth.uid;
  const role = request.auth.token?.role as string | undefined;
  if (role === "admin") return uid;

  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  return uid;
}

/**
 * Create a manual commission adjustment.
 *
 * @param userId - Target affiliate user
 * @param amount - Amount in cents (positive = credit, negative = debit)
 * @param reason - Mandatory explanation for the adjustment
 */
export const adminManualAdjustment = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 60 },
  async (request) => {
    ensureInitialized();
    const adminId = await assertAdmin(request);

    const { userId, amount, reason } = request.data as {
      userId: string;
      amount: number;
      reason: string;
    };

    // Validation
    if (!userId || typeof userId !== "string") {
      throw new HttpsError("invalid-argument", "userId is required");
    }
    if (typeof amount !== "number" || amount === 0) {
      throw new HttpsError("invalid-argument", "amount must be a non-zero number (cents)");
    }
    if (Math.abs(amount) > 100000) {
      throw new HttpsError("invalid-argument", "amount cannot exceed $1000 (100000 cents)");
    }
    if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
      throw new HttpsError("invalid-argument", "reason is required (min 5 characters)");
    }

    const db = getFirestore();

    // Load target user
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", `User ${userId} not found`);
    }
    const userData = userSnap.data()!;
    const userRole = (userData.affiliateRole || userData.role || "unknown") as string;

    if (amount > 0) {
      // CREDIT: Create a manual_adjustment commission
      const result = await createUnifiedCommission({
        referrerId: userId,
        referrerRole: userRole,
        referrerCode: (userData.affiliateCode || userData.affiliateCodeClient || "ADMIN") as string,
        refereeId: adminId,
        refereeRole: "admin",
        type: "manual_adjustment",
        subType: "admin_credit",
        sourceId: `admin_${adminId}_${Date.now()}`,
        sourceType: "admin_adjustment",
        planId: "admin_manual",
        planVersion: 0,
        calculationType: "fixed",
        amount,
        holdHours: 0, // Immediately available
      });

      // Log audit
      await db.collection("admin_actions").add({
        action: "manual_adjustment_credit",
        adminId,
        targetUserId: userId,
        amount,
        reason: reason.trim(),
        commissionId: result.commissionId,
        createdAt: Timestamp.now(),
      });

      logger.info(`[adminManualAdjustment] Credit ${amount}¢ to ${userId} by admin ${adminId}: ${reason}`);

      return {
        success: true,
        type: "credit",
        commissionId: result.commissionId,
        amount,
      };
    } else {
      // DEBIT: Deduct from available balance directly
      const debitAmount = Math.abs(amount);
      const currentBalance = (userData.availableBalance || 0) as number;

      if (debitAmount > currentBalance) {
        throw new HttpsError(
          "failed-precondition",
          `Insufficient balance: user has ${currentBalance}¢, debit is ${debitAmount}¢`
        );
      }

      // Atomic debit
      await db.collection("users").doc(userId).update({
        availableBalance: FieldValue.increment(-debitAmount),
        totalEarned: FieldValue.increment(-debitAmount),
      });

      // Log audit
      await db.collection("admin_actions").add({
        action: "manual_adjustment_debit",
        adminId,
        targetUserId: userId,
        amount: -debitAmount,
        reason: reason.trim(),
        createdAt: Timestamp.now(),
      });

      logger.info(`[adminManualAdjustment] Debit ${debitAmount}¢ from ${userId} by admin ${adminId}: ${reason}`);

      return {
        success: true,
        type: "debit",
        amount: -debitAmount,
      };
    }
  }
);
