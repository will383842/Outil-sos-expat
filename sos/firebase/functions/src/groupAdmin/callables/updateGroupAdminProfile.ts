/**
 * Callable: updateGroupAdminProfile
 *
 * Updates a GroupAdmin's profile information.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  GroupAdmin,
  GroupAdminUpdate,
  SupportedGroupAdminLanguage,
  GroupType,
  GroupSizeTier,
  GroupAdminPaymentMethod,
  GroupAdminPaymentDetails,
} from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// Supported languages validation
const VALID_LANGUAGES: SupportedGroupAdminLanguage[] = [
  "fr", "en", "es", "pt", "ar", "de", "it", "nl", "zh"
];

// Valid group types
const VALID_GROUP_TYPES: GroupType[] = [
  "travel", "expat", "digital_nomad", "immigration", "relocation",
  "language", "country_specific", "profession", "family", "student",
  "retirement", "other"
];

// Valid group sizes
const VALID_GROUP_SIZES: GroupSizeTier[] = [
  "lt1k", "1k-5k", "5k-10k", "10k-25k", "25k-50k", "50k-100k", "gt100k"
];

// Valid payment methods
const VALID_PAYMENT_METHODS: GroupAdminPaymentMethod[] = [
  "wise", "mobile_money", "bank_transfer"
];

interface UpdateProfileInput {
  // Personal info
  firstName?: string;
  lastName?: string;
  phone?: string;
  photoUrl?: string;
  country?: string;
  language?: SupportedGroupAdminLanguage;
  additionalLanguages?: SupportedGroupAdminLanguage[];

  // Group info (limited updates - URL cannot be changed)
  groupName?: string;
  groupType?: GroupType;
  groupSize?: GroupSizeTier;
  groupCountry?: string;
  groupLanguage?: SupportedGroupAdminLanguage;
  groupDescription?: string;

  // Payment info
  preferredPaymentMethod?: GroupAdminPaymentMethod;
  paymentDetails?: GroupAdminPaymentDetails;
}

export const updateGroupAdminProfile = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
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
    const input = request.data as UpdateProfileInput;

    try {
      // 2. Get existing GroupAdmin
      const groupAdminDoc = await db.collection("group_admins").doc(userId).get();

      if (!groupAdminDoc.exists) {
        throw new HttpsError("not-found", "GroupAdmin profile not found");
      }

      const currentProfile = groupAdminDoc.data() as GroupAdmin;

      // Check status
      if (currentProfile.status === "banned") {
        throw new HttpsError("permission-denied", "Your account has been banned");
      }

      // 3. Build update object with validation
      const updates: GroupAdminUpdate = {
        updatedAt: Timestamp.now(),
      };

      // Personal info validations
      if (input.firstName !== undefined) {
        if (!input.firstName || input.firstName.length < 2) {
          throw new HttpsError("invalid-argument", "First name must be at least 2 characters");
        }
        updates.firstName = input.firstName.trim();
      }

      if (input.lastName !== undefined) {
        if (!input.lastName || input.lastName.length < 2) {
          throw new HttpsError("invalid-argument", "Last name must be at least 2 characters");
        }
        updates.lastName = input.lastName.trim();
      }

      if (input.phone !== undefined) {
        updates.phone = input.phone?.trim() || undefined;
      }

      if (input.photoUrl !== undefined) {
        updates.photoUrl = input.photoUrl || undefined;
      }

      if (input.country !== undefined) {
        if (input.country.length !== 2) {
          throw new HttpsError("invalid-argument", "Country must be a 2-letter code");
        }
        updates.country = input.country.toUpperCase();
      }

      if (input.language !== undefined) {
        if (!VALID_LANGUAGES.includes(input.language)) {
          throw new HttpsError("invalid-argument", `Invalid language: ${input.language}`);
        }
        updates.language = input.language;
      }

      if (input.additionalLanguages !== undefined) {
        for (const lang of input.additionalLanguages) {
          if (!VALID_LANGUAGES.includes(lang)) {
            throw new HttpsError("invalid-argument", `Invalid language: ${lang}`);
          }
        }
        updates.additionalLanguages = input.additionalLanguages;
      }

      // Group info validations
      if (input.groupName !== undefined) {
        if (!input.groupName || input.groupName.length < 3) {
          throw new HttpsError("invalid-argument", "Group name must be at least 3 characters");
        }
        updates.groupName = input.groupName.trim();
      }

      if (input.groupType !== undefined) {
        if (!VALID_GROUP_TYPES.includes(input.groupType)) {
          throw new HttpsError("invalid-argument", `Invalid group type: ${input.groupType}`);
        }
        updates.groupType = input.groupType;
      }

      if (input.groupSize !== undefined) {
        if (!VALID_GROUP_SIZES.includes(input.groupSize)) {
          throw new HttpsError("invalid-argument", `Invalid group size: ${input.groupSize}`);
        }
        updates.groupSize = input.groupSize;
      }

      if (input.groupCountry !== undefined) {
        if (input.groupCountry.length !== 2) {
          throw new HttpsError("invalid-argument", "Group country must be a 2-letter code");
        }
        updates.groupCountry = input.groupCountry.toUpperCase();
      }

      if (input.groupLanguage !== undefined) {
        if (!VALID_LANGUAGES.includes(input.groupLanguage)) {
          throw new HttpsError("invalid-argument", `Invalid group language: ${input.groupLanguage}`);
        }
        updates.groupLanguage = input.groupLanguage;
      }

      if (input.groupDescription !== undefined) {
        updates.groupDescription = input.groupDescription?.trim() || undefined;
      }

      // Payment info validations
      if (input.preferredPaymentMethod !== undefined) {
        if (input.preferredPaymentMethod && !VALID_PAYMENT_METHODS.includes(input.preferredPaymentMethod)) {
          throw new HttpsError("invalid-argument", `Invalid payment method: ${input.preferredPaymentMethod}`);
        }
        updates.preferredPaymentMethod = input.preferredPaymentMethod || null;
      }

      if (input.paymentDetails !== undefined) {
        // Validate payment details based on type
        if (input.paymentDetails) {
          const details = input.paymentDetails;

          switch (details.type) {
            case "wise":
              if (!details.email || !details.accountHolderName || !details.currency) {
                throw new HttpsError("invalid-argument", "Wise requires email, account holder name, and currency");
              }
              break;
            case "mobile_money":
              if (!details.provider || !details.phoneNumber || !details.country) {
                throw new HttpsError("invalid-argument", "Mobile Money requires provider, phone number, and country");
              }
              break;
            case "bank_transfer":
              if (!details.accountHolderName || !details.bankName || !details.accountNumber || !details.country) {
                throw new HttpsError("invalid-argument", "Bank transfer requires account holder, bank name, account number, and country");
              }
              break;
            default:
              throw new HttpsError("invalid-argument", "Invalid payment details type");
          }
        }
        updates.paymentDetails = input.paymentDetails || null;
      }

      // 4. Apply updates
      if (Object.keys(updates).length > 1) { // More than just updatedAt
        await groupAdminDoc.ref.update(updates);

        // Also update user document if name changed
        if (updates.firstName || updates.lastName) {
          const userUpdates: Record<string, unknown> = { updatedAt: Timestamp.now() };
          if (updates.firstName) userUpdates.firstName = updates.firstName;
          if (updates.lastName) userUpdates.lastName = updates.lastName;
          await db.collection("users").doc(userId).update(userUpdates);
        }

        logger.info("[updateGroupAdminProfile] Profile updated", {
          groupAdminId: userId,
          updatedFields: Object.keys(updates).filter((k) => k !== "updatedAt"),
        });

        return {
          success: true,
          message: "Profile updated successfully",
        };
      }

      return {
        success: true,
        message: "No changes to update",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[updateGroupAdminProfile] Error", { userId, error });
      throw new HttpsError("internal", "Failed to update profile");
    }
  }
);
