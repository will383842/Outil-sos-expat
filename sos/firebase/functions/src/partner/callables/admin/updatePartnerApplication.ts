/**
 * Admin — Update Partner Application
 *
 * Changes application status (pending -> contacted -> accepted/rejected).
 * Adds reviewedBy + reviewedAt.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";
import type { PartnerApplication } from "../../types";

interface UpdateApplicationInput {
  applicationId: string;
  status: "pending" | "contacted" | "accepted" | "rejected";
  adminNotes?: string;
}

export const adminUpdatePartnerApplication = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; message: string }> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const adminId = request.auth!.uid;
    const input = request.data as UpdateApplicationInput;

    if (!input?.applicationId) {
      throw new HttpsError("invalid-argument", "applicationId is required");
    }

    const validStatuses = ["pending", "contacted", "accepted", "rejected"];
    if (!input.status || !validStatuses.includes(input.status)) {
      throw new HttpsError("invalid-argument", `status must be one of: ${validStatuses.join(", ")}`);
    }

    try {
      const appRef = db.collection("partner_applications").doc(input.applicationId);
      const appDoc = await appRef.get();

      if (!appDoc.exists) {
        throw new HttpsError("not-found", "Application not found");
      }

      const currentApp = appDoc.data() as PartnerApplication;
      const previousStatus = currentApp.status;
      const now = Timestamp.now();

      // Validate transitions
      const validTransitions: Record<string, string[]> = {
        pending: ["contacted", "accepted", "rejected"],
        contacted: ["accepted", "rejected", "pending"],
        accepted: ["rejected"], // can still reject after acceptance if not yet converted
        rejected: ["pending", "contacted"], // can re-open
      };

      if (!validTransitions[previousStatus]?.includes(input.status)) {
        throw new HttpsError(
          "failed-precondition",
          `Cannot transition from "${previousStatus}" to "${input.status}"`
        );
      }

      const updateData: Record<string, unknown> = {
        status: input.status,
        reviewedBy: adminId,
        reviewedAt: now,
        updatedAt: now,
      };

      if (input.adminNotes !== undefined) {
        updateData.adminNotes = input.adminNotes;
      }

      await appRef.update(updateData);

      // Audit log
      await db.collection("admin_audit_logs").add({
        action: "partner_application_updated",
        targetId: input.applicationId,
        targetType: "partner_application",
        performedBy: adminId,
        timestamp: now,
        details: {
          previousStatus,
          newStatus: input.status,
          adminNotes: input.adminNotes || null,
        },
      });

      logger.info("[adminUpdatePartnerApplication] Application updated", {
        applicationId: input.applicationId,
        previousStatus,
        newStatus: input.status,
        adminId,
      });

      return {
        success: true,
        message: `Application status updated to ${input.status}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdatePartnerApplication] Error", { error });
      throw new HttpsError("internal", "Failed to update partner application");
    }
  }
);
