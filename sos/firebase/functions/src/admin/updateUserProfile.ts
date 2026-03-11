/**
 * adminUpdateUserProfile - Admin callable to update a general user's profile
 * Supports: client, lawyer, expat roles
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { adminConfig } from "../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) initializeApp();
}

async function assertAdmin(uid: string, token?: Record<string, unknown>): Promise<void> {
  const tokenRole = token?.role as string | undefined;
  if (tokenRole === "admin") return;
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

const VALID_ROLES = ["client", "lawyer", "expat"];

interface AdminUpdateUserProfileInput {
  userId: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phoneCountryCode?: string;
  country?: string;
  currentCountry?: string;
  languages?: string[];
  adminNotes?: string;
}

export const adminUpdateUserProfile = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
    const adminId = request.auth.uid;
    await assertAdmin(adminId, request.auth.token as Record<string, unknown>);

    const db = getFirestore();
    const input = request.data as AdminUpdateUserProfileInput;

    if (!input.userId) throw new HttpsError("invalid-argument", "userId is required");
    if (!input.role || !VALID_ROLES.includes(input.role)) {
      throw new HttpsError("invalid-argument", `role must be one of: ${VALID_ROLES.join(", ")}`);
    }

    try {
      const userRef = db.collection("users").doc(input.userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) throw new HttpsError("not-found", "User not found");

      const allowedFields: (keyof AdminUpdateUserProfileInput)[] = [
        "firstName", "lastName", "email", "phone", "phoneCountryCode",
        "country", "currentCountry", "languages", "adminNotes",
      ];

      const updates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (input[field] !== undefined) updates[field] = input[field];
      }

      if (Object.keys(updates).length === 0) {
        throw new HttpsError("invalid-argument", "No fields to update");
      }

      // Build fullName if name fields changed
      if (updates.firstName || updates.lastName) {
        const existing = userDoc.data() || {};
        const fn = (updates.firstName as string) || existing.firstName || "";
        const ln = (updates.lastName as string) || existing.lastName || "";
        updates.fullName = `${fn} ${ln}`.trim();
      }

      updates.updatedAt = Timestamp.now();
      await userRef.update(updates);

      // For lawyers/expats, also sync to sos_profiles
      if (input.role === "lawyer" || input.role === "expat") {
        const profileRef = db.collection("sos_profiles").doc(input.userId);
        const profileDoc = await profileRef.get();
        if (profileDoc.exists) {
          const profileUpdates: Record<string, unknown> = {};
          if (updates.firstName) profileUpdates.firstName = updates.firstName;
          if (updates.lastName) profileUpdates.lastName = updates.lastName;
          if (updates.fullName) profileUpdates.fullName = updates.fullName;
          if (updates.email) profileUpdates.email = updates.email;
          if (updates.phone) profileUpdates.phone = updates.phone;
          if (updates.phoneCountryCode) profileUpdates.phoneCountryCode = updates.phoneCountryCode;
          if (updates.country) profileUpdates.country = updates.country;
          if (updates.languages) profileUpdates.languages = updates.languages;
          if (Object.keys(profileUpdates).length > 0) {
            profileUpdates.updatedAt = Timestamp.now();
            await profileRef.update(profileUpdates);
          }
        }
      }

      await db.collection("admin_audit_logs").add({
        action: "user_profile_updated",
        targetId: input.userId,
        targetType: input.role,
        performedBy: adminId,
        timestamp: Timestamp.now(),
        details: { updatedFields: Object.keys(updates).filter(k => k !== "updatedAt" && k !== "fullName") },
      });

      logger.info("[adminUpdateUserProfile] Profile updated", {
        userId: input.userId,
        role: input.role,
        updatedFields: Object.keys(updates),
        adminId,
      });

      return {
        success: true,
        message: `Profile updated: ${Object.keys(updates).filter(k => k !== "updatedAt" && k !== "fullName").join(", ")}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateUserProfile] Error", { userId: input.userId, error });
      throw new HttpsError("internal", "Failed to update user profile");
    }
  }
);
