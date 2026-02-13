/**
 * Callable: updateInfluencerProfile
 *
 * Updates an influencer's profile information and settings.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Influencer,
  UpdateInfluencerProfileInput,
  SupportedInfluencerLanguage,
  InfluencerPlatform,
  InfluencerPaymentMethod,
} from "../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// Validation constants
const VALID_LANGUAGES: SupportedInfluencerLanguage[] = [
  "fr", "en", "es", "pt", "ar", "de", "it", "nl", "zh"
];

const VALID_PLATFORMS: InfluencerPlatform[] = [
  "facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube",
  "whatsapp", "telegram", "snapchat", "reddit", "discord", "blog",
  "website", "forum", "podcast", "newsletter", "other"
];

const VALID_PAYMENT_METHODS: InfluencerPaymentMethod[] = [
  "wise", "bank_transfer"
];

export const updateInfluencerProfile = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // 2. Validate input
    const input = request.data as UpdateInfluencerProfileInput;

    if (input.additionalLanguages) {
      for (const lang of input.additionalLanguages) {
        if (!VALID_LANGUAGES.includes(lang)) {
          throw new HttpsError("invalid-argument", `Invalid language: ${lang}`);
        }
      }
    }

    if (input.platforms) {
      if (input.platforms.length === 0) {
        throw new HttpsError("invalid-argument", "At least one platform is required");
      }
      for (const platform of input.platforms) {
        if (!VALID_PLATFORMS.includes(platform)) {
          throw new HttpsError("invalid-argument", `Invalid platform: ${platform}`);
        }
      }
    }

    if (input.preferredPaymentMethod && !VALID_PAYMENT_METHODS.includes(input.preferredPaymentMethod)) {
      throw new HttpsError("invalid-argument", "Invalid payment method");
    }

    if (input.country && input.country.length !== 2) {
      throw new HttpsError("invalid-argument", "Invalid country code");
    }

    try {
      // 3. Get current influencer data
      const influencerRef = db.collection("influencers").doc(userId);
      const influencerDoc = await influencerRef.get();

      if (!influencerDoc.exists) {
        throw new HttpsError("not-found", "Influencer profile not found");
      }

      const influencer = influencerDoc.data() as Influencer;

      // 4. Check status
      if (influencer.status === "banned") {
        throw new HttpsError("permission-denied", "Account is banned");
      }

      // 5. Build update object
      const updates: Partial<Influencer> = {
        updatedAt: Timestamp.now(),
      };

      if (input.phone !== undefined) {
        updates.phone = input.phone?.trim();
      }

      if (input.country !== undefined) {
        updates.country = input.country.toUpperCase();
      }

      if (input.additionalLanguages !== undefined) {
        updates.additionalLanguages = input.additionalLanguages;
      }

      if (input.platforms !== undefined) {
        updates.platforms = input.platforms;
      }

      if (input.bio !== undefined) {
        updates.bio = input.bio?.trim();
      }

      if (input.photoUrl !== undefined) {
        updates.photoUrl = input.photoUrl;
      }

      if (input.communitySize !== undefined) {
        updates.communitySize = input.communitySize;
      }

      if (input.communityNiche !== undefined) {
        updates.communityNiche = input.communityNiche?.trim();
      }

      if (input.socialLinks !== undefined) {
        updates.socialLinks = input.socialLinks;
      }

      if (input.preferredPaymentMethod !== undefined) {
        updates.preferredPaymentMethod = input.preferredPaymentMethod;
      }

      if (input.paymentDetails !== undefined) {
        // Validate payment details match the payment method
        if (input.paymentDetails && input.preferredPaymentMethod) {
          if (input.paymentDetails.type !== input.preferredPaymentMethod) {
            throw new HttpsError(
              "invalid-argument",
              "Payment details type must match preferred payment method"
            );
          }
        }
        updates.paymentDetails = input.paymentDetails;
      }

      // 6. Apply updates
      await influencerRef.update(updates);

      logger.info("[updateInfluencerProfile] Profile updated", {
        influencerId: userId,
        updatedFields: Object.keys(updates),
      });

      return {
        success: true,
        message: "Profile updated successfully",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[updateInfluencerProfile] Error", { userId, error });
      throw new HttpsError("internal", "Failed to update profile");
    }
  }
);
