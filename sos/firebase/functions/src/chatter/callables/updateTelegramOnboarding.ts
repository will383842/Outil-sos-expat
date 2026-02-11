/**
 * Callable: updateTelegramOnboarding
 *
 * Updates the Telegram onboarding status for a chatter.
 * Called after the user completes the mandatory Telegram step.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

interface TelegramOnboardingInput {
  hasTelegram: boolean;
}

interface TelegramOnboardingOutput {
  success: boolean;
  message: string;
}

export const updateTelegramOnboarding = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
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
  async (request): Promise<TelegramOnboardingOutput> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // 2. Validate input
    const input = request.data as TelegramOnboardingInput;

    if (typeof input?.hasTelegram !== "boolean") {
      throw new HttpsError("invalid-argument", "hasTelegram must be a boolean");
    }

    try {
      // 3. Verify user exists and is a chatter
      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      if (userData?.role !== "chatter") {
        throw new HttpsError("permission-denied", "Only chatters can complete Telegram onboarding");
      }

      // 4. Check if already completed (prevent duplicate calls)
      if (userData?.telegramOnboardingCompleted === true) {
        logger.info("[updateTelegramOnboarding] Already completed", { userId });
        return {
          success: true,
          message: "Telegram onboarding already completed",
        };
      }

      // 5. Prepare update data
      const now = Timestamp.now();
      const updateData = {
        hasTelegram: input.hasTelegram,
        telegramOnboardingCompleted: true,
        telegramOnboardingAt: now,
        updatedAt: now,
      };

      // 6. Update users document
      await db.collection("users").doc(userId).update(updateData);

      // 7. Also update chatters document if it exists
      const chatterDoc = await db.collection("chatters").doc(userId).get();
      if (chatterDoc.exists) {
        await db.collection("chatters").doc(userId).update(updateData);
      }

      logger.info("[updateTelegramOnboarding] Completed", {
        userId,
        hasTelegram: input.hasTelegram,
      });

      return {
        success: true,
        message: input.hasTelegram
          ? "Welcome! You're eligible for the $50 bonus."
          : "Onboarding completed. You can add Telegram later.",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[updateTelegramOnboarding] Error", { userId, error });
      throw new HttpsError("internal", "Failed to complete Telegram onboarding");
    }
  }
);
