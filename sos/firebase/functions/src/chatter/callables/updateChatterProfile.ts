/**
 * Callable: updateChatterProfile
 *
 * Updates chatter profile information.
 * Some fields are restricted (status, level, codes, balances).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Chatter,
  UpdateChatterProfileInput,
  SupportedChatterLanguage,
  ChatterPlatform,
} from "../types";
import { getChatterConfigCached, isCountrySupported } from "../utils";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// Supported languages validation
const VALID_LANGUAGES: SupportedChatterLanguage[] = [
  "fr", "en", "es", "pt", "ar", "de", "it", "nl", "zh"
];

// Valid platforms
const VALID_PLATFORMS: ChatterPlatform[] = [
  "facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube",
  "whatsapp", "telegram", "snapchat", "reddit", "discord", "blog",
  "website", "forum", "other"
];

export const updateChatterProfile = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
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
    const input = request.data as UpdateChatterProfileInput;

    if (!input || Object.keys(input).length === 0) {
      throw new HttpsError("invalid-argument", "No fields to update");
    }

    // Validate specific fields
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

    try {
      // 3. Get chatter data
      const chatterDoc = await db.collection("chatters").doc(userId).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter profile not found");
      }

      const chatter = chatterDoc.data() as Chatter;

      // 4. Check status (suspended/banned chatters can't update)
      if (chatter.status === "banned") {
        throw new HttpsError("permission-denied", "Account is banned");
      }

      // 5. Get config for validation
      const config = await getChatterConfigCached();

      // 6. Validate country if being updated
      if (input.country && !isCountrySupported(input.country, config)) {
        throw new HttpsError(
          "invalid-argument",
          `Country ${input.country} is not currently supported`
        );
      }

      // Validate intervention countries
      if (input.interventionCountries) {
        if (input.interventionCountries.length === 0) {
          throw new HttpsError(
            "invalid-argument",
            "At least one intervention country is required"
          );
        }
        for (const country of input.interventionCountries) {
          if (!isCountrySupported(country, config)) {
            throw new HttpsError(
              "invalid-argument",
              `Country ${country} is not currently supported`
            );
          }
        }
      }

      // 7. Build update object (only allowed fields)
      const updates: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      if (input.phone !== undefined) {
        updates.phone = input.phone?.trim() || null;
      }

      if (input.country) {
        updates.country = input.country.toUpperCase();
      }

      if (input.interventionCountries) {
        updates.interventionCountries = input.interventionCountries.map((c) =>
          c.toUpperCase()
        );
      }

      if (input.additionalLanguages) {
        updates.additionalLanguages = input.additionalLanguages;
      }

      if (input.platforms) {
        updates.platforms = input.platforms;
      }

      if (input.bio !== undefined) {
        updates.bio = input.bio?.trim() || null;
      }

      if (input.photoUrl !== undefined) {
        // Validate URL format
        if (input.photoUrl && !isValidUrl(input.photoUrl)) {
          throw new HttpsError("invalid-argument", "Invalid photo URL");
        }
        updates.photoUrl = input.photoUrl || null;
      }

      if (input.preferredPaymentMethod) {
        if (!["wise", "mobile_money", "bank_transfer"].includes(input.preferredPaymentMethod)) {
          throw new HttpsError("invalid-argument", "Invalid payment method");
        }
        updates.preferredPaymentMethod = input.preferredPaymentMethod;
      }

      if (input.paymentDetails) {
        // Validate payment details
        validatePaymentDetails(input.paymentDetails);
        updates.paymentDetails = input.paymentDetails;
      }

      // 8. Update chatter
      await db.collection("chatters").doc(userId).update(updates);

      logger.info("[updateChatterProfile] Profile updated", {
        chatterId: userId,
        updatedFields: Object.keys(updates).filter((k) => k !== "updatedAt"),
      });

      return {
        success: true,
        message: "Profile updated successfully",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[updateChatterProfile] Error", { userId, error });
      throw new HttpsError("internal", "Failed to update profile");
    }
  }
);

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate payment details structure
 */
function validatePaymentDetails(details: UpdateChatterProfileInput["paymentDetails"]): void {
  if (!details) return;

  switch (details.type) {
    case "wise":
      if (!details.email || !details.currency || !details.accountHolderName) {
        throw new HttpsError(
          "invalid-argument",
          "Wise requires email, currency, and account holder name"
        );
      }
      break;

    case "mobile_money":
      if (!details.provider || !details.phoneNumber || !details.country) {
        throw new HttpsError(
          "invalid-argument",
          "Mobile Money requires provider, phone number, and country"
        );
      }
      break;

    case "bank_transfer":
      if (!details.bankName || !details.accountHolderName || !details.accountNumber) {
        throw new HttpsError(
          "invalid-argument",
          "Bank transfer requires bank name, account holder name, and account number"
        );
      }
      break;

    default:
      throw new HttpsError("invalid-argument", "Invalid payment details type");
  }
}
