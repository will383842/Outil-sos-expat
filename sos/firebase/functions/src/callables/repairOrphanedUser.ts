/**
 * Callable: repairOrphanedUser
 *
 * Repairs orphaned user accounts where Firebase Auth exists but users/{uid} document doesn't.
 * This can happen if registration was interrupted or if Firestore rules blocked the write.
 *
 * The function checks for existing profile documents (chatters, sos_profiles) and
 * creates the missing users document with the correct role.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface RepairResult {
  success: boolean;
  repaired: boolean;
  role?: string;
  message: string;
}

export const repairOrphanedUser = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 30,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "https://ia.sos-expat.com",
      "https://outil-sos-expat.pages.dev",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
  },
  async (request): Promise<RepairResult> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();
    const auth = getAuth();

    try {
      // 2. Check if users document already exists
      const userDoc = await db.collection("users").doc(userId).get();

      if (userDoc.exists) {
        logger.info("[repairOrphanedUser] User document already exists", { userId });
        return {
          success: true,
          repaired: false,
          role: userDoc.data()?.role,
          message: "User document already exists",
        };
      }

      // 3. Get Firebase Auth user data
      let authUser;
      try {
        authUser = await auth.getUser(userId);
      } catch (authError) {
        logger.error("[repairOrphanedUser] Failed to get auth user", { userId, authError });
        throw new HttpsError("not-found", "Auth user not found");
      }

      const now = Timestamp.now();
      const email = authUser.email || "";
      const displayName = authUser.displayName || "";
      const [firstName, ...lastNameParts] = displayName.split(" ");
      const lastName = lastNameParts.join(" ");

      // 4. Check for existing chatter profile
      const chatterDoc = await db.collection("chatters").doc(userId).get();

      if (chatterDoc.exists) {
        const chatterData = chatterDoc.data();

        // Create users document with chatter role
        await db.collection("users").doc(userId).set({
          uid: userId,
          email: chatterData?.email || email,
          emailLower: (chatterData?.email || email).toLowerCase(),
          firstName: chatterData?.firstName || firstName || "",
          lastName: chatterData?.lastName || lastName || "",
          fullName: `${chatterData?.firstName || firstName} ${chatterData?.lastName || lastName}`.trim(),
          displayName: `${chatterData?.firstName || firstName} ${chatterData?.lastName || lastName}`.trim(),
          role: "chatter",
          isChatter: true,
          // AUDIT-FIX m1: Default to "active" (pending_quiz removed — quiz no longer exists)
          chatterStatus: chatterData?.status || "active",
          profilePhoto: chatterData?.photoUrl || authUser.photoURL || "/default-avatar.png",
          photoURL: chatterData?.photoUrl || authUser.photoURL || "/default-avatar.png",
          avatar: chatterData?.photoUrl || authUser.photoURL || "/default-avatar.png",
          isVerified: authUser.emailVerified,
          isVerifiedEmail: authUser.emailVerified,
          isActive: true,
          isApproved: false,
          approvalStatus: "pending",
          isVisible: false,
          // Telegram onboarding fields (may need completion)
          hasTelegram: chatterData?.hasTelegram || false,
          telegramOnboardingCompleted: chatterData?.telegramOnboardingCompleted || false,
          createdAt: chatterData?.createdAt || now,
          updatedAt: now,
          lastLoginAt: now,
          repairedAt: now,
          repairReason: "orphaned_chatter_account",
        });

        logger.info("[repairOrphanedUser] Repaired chatter account", {
          userId,
          email: chatterData?.email || email,
        });

        return {
          success: true,
          repaired: true,
          role: "chatter",
          message: "Chatter account repaired successfully",
        };
      }

      // 5. Check for existing sos_profiles (lawyer/expat)
      const sosProfileDoc = await db.collection("sos_profiles").doc(userId).get();

      if (sosProfileDoc.exists) {
        const sosData = sosProfileDoc.data();
        const role = sosData?.type || sosData?.role || "expat";

        // Create users document with lawyer/expat role
        await db.collection("users").doc(userId).set({
          uid: userId,
          email: sosData?.email || email,
          emailLower: (sosData?.email || email).toLowerCase(),
          firstName: sosData?.firstName || firstName || "",
          lastName: sosData?.lastName || lastName || "",
          fullName: sosData?.fullName || `${sosData?.firstName || firstName} ${sosData?.lastName || lastName}`.trim(),
          displayName: sosData?.displayName || sosData?.fullName || displayName,
          role: role,
          profilePhoto: sosData?.profilePhoto || authUser.photoURL || "/default-avatar.png",
          photoURL: sosData?.photoURL || authUser.photoURL || "/default-avatar.png",
          avatar: sosData?.avatar || authUser.photoURL || "/default-avatar.png",
          isVerified: authUser.emailVerified,
          isVerifiedEmail: authUser.emailVerified,
          isActive: sosData?.isActive !== false,
          isApproved: sosData?.isApproved || false,
          approvalStatus: sosData?.approvalStatus || "pending",
          isVisible: sosData?.isVisible || false,
          createdAt: sosData?.createdAt || now,
          updatedAt: now,
          lastLoginAt: now,
          repairedAt: now,
          repairReason: "orphaned_provider_account",
        });

        logger.info("[repairOrphanedUser] Repaired provider account", {
          userId,
          role,
          email: sosData?.email || email,
        });

        return {
          success: true,
          repaired: true,
          role: role,
          message: `${role} account repaired successfully`,
        };
      }

      // 6. No profile found - create minimal client account
      // This allows the user to at least access the platform
      await db.collection("users").doc(userId).set({
        uid: userId,
        email: email,
        emailLower: email.toLowerCase(),
        firstName: firstName || "",
        lastName: lastName || "",
        fullName: displayName || "",
        displayName: displayName || "",
        role: "client",
        profilePhoto: authUser.photoURL || "/default-avatar.png",
        photoURL: authUser.photoURL || "/default-avatar.png",
        avatar: authUser.photoURL || "/default-avatar.png",
        isVerified: authUser.emailVerified,
        isVerifiedEmail: authUser.emailVerified,
        isActive: true,
        isApproved: true,
        approvalStatus: "approved",
        isVisible: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        repairedAt: now,
        repairReason: "orphaned_account_no_profile",
      });

      logger.info("[repairOrphanedUser] Created fallback client account", {
        userId,
        email,
      });

      return {
        success: true,
        repaired: true,
        role: "client",
        message: "Account created as client (no existing profile found)",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[repairOrphanedUser] Error", { userId, error });
      throw new HttpsError("internal", "Failed to repair user account");
    }
  }
);
