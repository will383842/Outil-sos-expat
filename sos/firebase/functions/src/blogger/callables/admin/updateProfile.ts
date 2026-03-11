/**
 * adminUpdateBloggerProfile - Admin callable to update a blogger's profile
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { affiliateAdminConfig } from "../../../lib/functionConfigs";

async function checkAdmin(uid: string): Promise<void> {
  const db = getFirestore();
  const adminDoc = await db.collection("admins").doc(uid).get();
  if (adminDoc.exists) return;
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

interface AdminUpdateBloggerProfileInput {
  bloggerId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  language?: string;
  blogUrl?: string;
  blogName?: string;
  blogLanguage?: string;
  blogCountry?: string;
  blogTheme?: string;
  blogTraffic?: string;
  adminNotes?: string;
}

export const adminUpdateBloggerProfile = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; message: string }> => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    const adminId = request.auth.uid;
    await checkAdmin(adminId);

    const db = getFirestore();
    const input = request.data as AdminUpdateBloggerProfileInput;

    if (!input.bloggerId) {
      throw new HttpsError("invalid-argument", "bloggerId is required");
    }

    try {
      const ref = db.collection("bloggers").doc(input.bloggerId);
      const doc = await ref.get();
      if (!doc.exists) throw new HttpsError("not-found", "Blogger not found");

      const allowedFields: (keyof AdminUpdateBloggerProfileInput)[] = [
        "firstName", "lastName", "email", "phone", "country", "language",
        "blogUrl", "blogName", "blogLanguage", "blogCountry", "blogTheme", "blogTraffic",
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
        await db.collection("users").doc(input.bloggerId).update(userUpdates);
      }

      await db.collection("admin_audit_logs").add({
        action: "blogger_profile_updated",
        targetId: input.bloggerId,
        targetType: "blogger",
        performedBy: adminId,
        timestamp: Timestamp.now(),
        details: { updatedFields: Object.keys(updates).filter(k => k !== "updatedAt") },
      });

      logger.info("[adminUpdateBloggerProfile] Profile updated", {
        bloggerId: input.bloggerId,
        updatedFields: Object.keys(updates),
        adminId,
      });

      return {
        success: true,
        message: `Profile updated: ${Object.keys(updates).filter(k => k !== "updatedAt").join(", ")}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateBloggerProfile] Error", { bloggerId: input.bloggerId, error });
      throw new HttpsError("internal", "Failed to update blogger profile");
    }
  }
);
