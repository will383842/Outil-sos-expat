/**
 * adminUpdateGroupAdminProfile - Admin callable to update a group admin's profile
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { affiliateAdminConfig } from "../../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) initializeApp();
}

async function verifyAdmin(userId: string, authToken?: Record<string, unknown>): Promise<void> {
  const tokenRole = authToken?.role as string | undefined;
  if (tokenRole === "admin") return;
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

interface AdminUpdateGroupAdminProfileInput {
  groupAdminId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  language?: string;
  groupName?: string;
  groupUrl?: string;
  groupType?: string;
  groupSize?: string;
  groupCountry?: string;
  groupLanguage?: string;
  adminNotes?: string;
}

export const adminUpdateGroupAdminProfile = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    const adminId = request.auth.uid;
    await verifyAdmin(adminId, request.auth.token as Record<string, unknown>);

    const db = getFirestore();
    const input = request.data as AdminUpdateGroupAdminProfileInput;

    if (!input.groupAdminId) {
      throw new HttpsError("invalid-argument", "groupAdminId is required");
    }

    try {
      const ref = db.collection("group_admins").doc(input.groupAdminId);
      const doc = await ref.get();
      if (!doc.exists) throw new HttpsError("not-found", "Group admin not found");

      const allowedFields: (keyof AdminUpdateGroupAdminProfileInput)[] = [
        "firstName", "lastName", "email", "phone", "country", "language",
        "groupName", "groupUrl", "groupType", "groupSize", "groupCountry", "groupLanguage",
        "adminNotes",
      ];

      const updates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (input[field] !== undefined) updates[field] = input[field];
      }

      if (Object.keys(updates).length === 0) {
        throw new HttpsError("invalid-argument", "No fields to update");
      }

      updates.updatedAt = Timestamp.now();
      await ref.update(updates);

      // Sync shared fields to users collection
      const userUpdates: Record<string, unknown> = {};
      if (updates.firstName) userUpdates.firstName = updates.firstName;
      if (updates.lastName) userUpdates.lastName = updates.lastName;
      if (updates.email) userUpdates.email = updates.email;
      if (updates.phone) userUpdates.phone = updates.phone;
      if (updates.country) userUpdates.country = updates.country;
      if (Object.keys(userUpdates).length > 0) {
        userUpdates.updatedAt = Timestamp.now();
        await db.collection("users").doc(input.groupAdminId).update(userUpdates);
      }

      await db.collection("admin_audit_logs").add({
        action: "group_admin_profile_updated",
        targetId: input.groupAdminId,
        targetType: "groupAdmin",
        performedBy: adminId,
        timestamp: Timestamp.now(),
        details: { updatedFields: Object.keys(updates).filter(k => k !== "updatedAt") },
      });

      logger.info("[adminUpdateGroupAdminProfile] Profile updated", {
        groupAdminId: input.groupAdminId,
        updatedFields: Object.keys(updates),
        adminId,
      });

      return {
        success: true,
        message: `Profile updated: ${Object.keys(updates).filter(k => k !== "updatedAt").join(", ")}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateGroupAdminProfile] Error", { groupAdminId: input.groupAdminId, error });
      throw new HttpsError("internal", "Failed to update group admin profile");
    }
  }
);
