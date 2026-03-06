/**
 * Admin — Issue Manual Commission
 *
 * Creates a manual commission adjustment (positive or negative).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";
import { createPartnerCommission } from "../../services/partnerCommissionService";
import type { Partner } from "../../types";

interface ManualCommissionInput {
  partnerId: string;
  amount: number; // cents, can be negative
  description: string;
  adminNotes?: string;
}

export const adminIssueManualCommission = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; commissionId: string }> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const adminId = request.auth!.uid;
    const input = request.data as ManualCommissionInput;

    if (!input?.partnerId) {
      throw new HttpsError("invalid-argument", "partnerId is required");
    }
    if (typeof input.amount !== "number" || input.amount === 0) {
      throw new HttpsError("invalid-argument", "amount must be a non-zero number (cents)");
    }
    if (!input.description || input.description.trim().length < 3) {
      throw new HttpsError("invalid-argument", "description is required (min 3 characters)");
    }

    try {
      // Verify partner exists
      const partnerDoc = await db.collection("partners").doc(input.partnerId).get();
      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner not found");
      }

      const partner = partnerDoc.data() as Partner;

      const commissionId = await createPartnerCommission({
        partnerId: input.partnerId,
        partnerCode: partner.affiliateCode,
        partnerEmail: partner.email,
        type: "manual_adjustment",
        sourceId: null,
        sourceType: null,
        amount: input.amount,
        description: `[Manual] ${input.description.trim()}${input.adminNotes ? ` — Notes: ${input.adminNotes}` : ""}`,
      });

      // Audit log
      await db.collection("admin_audit_logs").add({
        action: "partner_manual_commission",
        targetId: input.partnerId,
        targetType: "partner",
        performedBy: adminId,
        timestamp: Timestamp.now(),
        details: {
          commissionId,
          amount: input.amount,
          description: input.description,
          adminNotes: input.adminNotes || null,
        },
      });

      logger.info("[adminIssueManualCommission] Commission created", {
        partnerId: input.partnerId,
        commissionId,
        amount: input.amount,
        adminId,
      });

      return { success: true, commissionId };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminIssueManualCommission] Error", { error });
      throw new HttpsError("internal", "Failed to issue manual commission");
    }
  }
);
