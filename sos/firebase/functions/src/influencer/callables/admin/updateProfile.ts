/**
 * adminUpdateInfluencerProfile - Admin callable to update an influencer's profile
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { affiliateAdminConfig } from "../../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) initializeApp();
}

async function checkAdmin(auth: { uid: string } | undefined): Promise<string> {
  if (!auth) throw new HttpsError("unauthenticated", "Authentication required");
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  return auth.uid;
}

interface AdminUpdateInfluencerProfileInput {
  influencerId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  language?: string;
  platforms?: string[];
  communitySize?: number;
  niche?: string;
  adminNotes?: string;
}

export const adminUpdateInfluencerProfile = onCall(
  { ...affiliateAdminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();
    const adminId = await checkAdmin(request.auth);
    const db = getFirestore();
    const input = request.data as AdminUpdateInfluencerProfileInput;

    if (!input.influencerId) {
      throw new HttpsError("invalid-argument", "influencerId is required");
    }

    try {
      const ref = db.collection("influencers").doc(input.influencerId);
      const doc = await ref.get();
      if (!doc.exists) throw new HttpsError("not-found", "Influencer not found");

      const allowedFields: (keyof AdminUpdateInfluencerProfileInput)[] = [
        "firstName", "lastName", "email", "phone", "country", "language",
        "platforms", "communitySize", "niche", "adminNotes",
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
        await db.collection("users").doc(input.influencerId).update(userUpdates);
      }

      await db.collection("admin_audit_logs").add({
        action: "influencer_profile_updated",
        targetId: input.influencerId,
        targetType: "influencer",
        performedBy: adminId,
        timestamp: Timestamp.now(),
        details: { updatedFields: Object.keys(updates).filter(k => k !== "updatedAt") },
      });

      logger.info("[adminUpdateInfluencerProfile] Profile updated", {
        influencerId: input.influencerId,
        updatedFields: Object.keys(updates),
        adminId,
      });

      return {
        success: true,
        message: `Profile updated: ${Object.keys(updates).filter(k => k !== "updatedAt").join(", ")}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateInfluencerProfile] Error", { influencerId: input.influencerId, error });
      throw new HttpsError("internal", "Failed to update influencer profile");
    }
  }
);
