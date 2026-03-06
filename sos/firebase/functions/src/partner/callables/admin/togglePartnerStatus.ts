/**
 * Admin — Toggle Partner Status
 *
 * Changes partner status: active / suspended / banned.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";

interface ToggleStatusInput {
  partnerId: string;
  status: "active" | "suspended" | "banned";
  suspensionReason?: string;
}

export const adminTogglePartnerStatus = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; message: string }> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const adminId = request.auth!.uid;
    const input = request.data as ToggleStatusInput;

    if (!input?.partnerId) {
      throw new HttpsError("invalid-argument", "partnerId is required");
    }

    const validStatuses = ["active", "suspended", "banned"];
    if (!input.status || !validStatuses.includes(input.status)) {
      throw new HttpsError("invalid-argument", `status must be one of: ${validStatuses.join(", ")}`);
    }

    if ((input.status === "suspended" || input.status === "banned") && !input.suspensionReason) {
      throw new HttpsError("invalid-argument", "suspensionReason is required when suspending or banning");
    }

    try {
      const partnerRef = db.collection("partners").doc(input.partnerId);
      const partnerDoc = await partnerRef.get();

      if (!partnerDoc.exists) {
        throw new HttpsError("not-found", "Partner not found");
      }

      const previousStatus = partnerDoc.data()?.status;
      const now = Timestamp.now();

      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: now,
      };

      if (input.suspensionReason) {
        updateData.suspensionReason = input.suspensionReason;
      }

      // Clear suspension reason when reactivating
      if (input.status === "active") {
        updateData.suspensionReason = null;
      }

      // If suspending/banning, also hide the partner
      if (input.status !== "active") {
        updateData.isVisible = false;
      }

      // Append to adminNotes
      const existingNotes = partnerDoc.data()?.adminNotes || "";
      const noteEntry = `[${now.toDate().toISOString()}] Status: ${previousStatus} -> ${input.status} by ${adminId}${input.suspensionReason ? `: ${input.suspensionReason}` : ""}`;
      updateData.adminNotes = existingNotes
        ? `${existingNotes}\n${noteEntry}`
        : noteEntry;

      await partnerRef.update(updateData);

      // Audit log
      await db.collection("admin_audit_logs").add({
        action: "partner_status_changed",
        targetId: input.partnerId,
        targetType: "partner",
        performedBy: adminId,
        timestamp: now,
        details: {
          previousStatus,
          newStatus: input.status,
          reason: input.suspensionReason || null,
        },
      });

      logger.info("[adminTogglePartnerStatus] Status updated", {
        partnerId: input.partnerId,
        previousStatus,
        newStatus: input.status,
        adminId,
      });

      return {
        success: true,
        message: `Partner status updated to ${input.status}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminTogglePartnerStatus] Error", { error });
      throw new HttpsError("internal", "Failed to update partner status");
    }
  }
);
