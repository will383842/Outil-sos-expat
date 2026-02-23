/**
 * Update Blogger Profile Callable
 *
 * Allows bloggers to update their profile information.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  UpdateBloggerProfileInput,
  Blogger,
  SupportedBloggerLanguage,
  BlogTheme,
  BlogTrafficTier,
  BloggerPaymentMethod,
} from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// ============================================================================
// VALIDATION
// ============================================================================

const SUPPORTED_LANGUAGES: SupportedBloggerLanguage[] = [
  "fr", "en", "es", "pt", "ar", "de", "it", "nl", "zh",
];

const BLOG_THEMES: BlogTheme[] = [
  "expatriation", "travel", "legal", "finance", "lifestyle",
  "tech", "family", "career", "education", "other",
];

const BLOG_TRAFFIC_TIERS: BlogTrafficTier[] = [
  "lt1k", "1k-5k", "5k-10k", "10k-50k", "50k-100k", "gt100k",
];

const PAYMENT_METHODS: BloggerPaymentMethod[] = ["wise", "mobile_money"];

function validateInput(input: UpdateBloggerProfileInput): void {
  // Validate optional fields if provided
  if (input.additionalLanguages) {
    for (const lang of input.additionalLanguages) {
      if (!SUPPORTED_LANGUAGES.includes(lang)) {
        throw new HttpsError("invalid-argument", `Invalid language: ${lang}`);
      }
    }
  }

  if (input.blogTheme && !BLOG_THEMES.includes(input.blogTheme)) {
    throw new HttpsError("invalid-argument", "Invalid blog theme");
  }

  if (input.blogTraffic && !BLOG_TRAFFIC_TIERS.includes(input.blogTraffic)) {
    throw new HttpsError("invalid-argument", "Invalid blog traffic tier");
  }

  if (input.preferredPaymentMethod && !PAYMENT_METHODS.includes(input.preferredPaymentMethod)) {
    throw new HttpsError("invalid-argument", "Invalid payment method");
  }

  if (input.blogUrl) {
    try {
      new URL(input.blogUrl);
    } catch {
      throw new HttpsError("invalid-argument", "Invalid blog URL format");
    }
  }

  // Validate payment details if provided
  if (input.paymentDetails) {
    validatePaymentDetails(input.paymentDetails);
  }
}

function validatePaymentDetails(details: UpdateBloggerProfileInput["paymentDetails"]): void {
  if (!details) return;

  switch (details.type) {
    case "wise":
      if (!details.email?.trim()) {
        throw new HttpsError("invalid-argument", "Wise email is required");
      }
      if (!details.accountHolderName?.trim()) {
        throw new HttpsError("invalid-argument", "Account holder name is required");
      }
      break;

    case "mobile_money":
      if (!details.phoneNumber?.trim()) {
        throw new HttpsError("invalid-argument", "Phone number is required for Mobile Money");
      }
      if (!details.provider) {
        throw new HttpsError("invalid-argument", "Mobile Money provider is required");
      }
      if (!details.country?.trim()) {
        throw new HttpsError("invalid-argument", "Country is required for Mobile Money");
      }
      break;

    default:
      throw new HttpsError("invalid-argument", "Invalid payment details type");
  }
}

// ============================================================================
// CALLABLE
// ============================================================================

export const updateBloggerProfile = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as UpdateBloggerProfileInput;

    // 2. Validate input
    validateInput(input);

    const db = getFirestore();

    try {
      // 3. Get blogger profile
      const bloggerRef = db.collection("bloggers").doc(uid);
      const bloggerDoc = await bloggerRef.get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("not-found", "Blogger profile not found");
      }

      const blogger = bloggerDoc.data() as Blogger;

      // 4. Check status
      if (blogger.status === "banned") {
        throw new HttpsError("permission-denied", "Your account has been banned");
      }

      // 5. Build update object
      const updates: Partial<Blogger> = {
        updatedAt: Timestamp.now(),
      };

      // Update allowed fields
      if (input.phone !== undefined) {
        updates.phone = input.phone?.trim() || undefined;
      }

      if (input.country) {
        updates.country = input.country.trim();
      }

      if (input.additionalLanguages !== undefined) {
        updates.additionalLanguages = input.additionalLanguages;
      }

      if (input.bio !== undefined) {
        updates.bio = input.bio?.trim() || undefined;
      }

      if (input.photoUrl !== undefined) {
        updates.photoUrl = input.photoUrl?.trim() || undefined;
      }

      // Blog-specific fields
      if (input.blogUrl) {
        // Check if new URL is already taken by another blogger
        const urlQuery = await db
          .collection("bloggers")
          .where("blogUrl", "==", input.blogUrl.toLowerCase().trim())
          .limit(1)
          .get();

        if (!urlQuery.empty && urlQuery.docs[0].id !== uid) {
          throw new HttpsError("already-exists", "This blog URL is already registered");
        }

        updates.blogUrl = input.blogUrl.toLowerCase().trim();
      }

      if (input.blogName) {
        updates.blogName = input.blogName.trim();
      }

      if (input.blogDescription !== undefined) {
        updates.blogDescription = input.blogDescription?.trim() || undefined;
      }

      if (input.blogTheme) {
        updates.blogTheme = input.blogTheme;
      }

      if (input.blogTraffic) {
        updates.blogTraffic = input.blogTraffic;
      }

      // Payment fields
      if (input.preferredPaymentMethod !== undefined) {
        updates.preferredPaymentMethod = input.preferredPaymentMethod;
      }

      if (input.paymentDetails !== undefined) {
        updates.paymentDetails = input.paymentDetails;
      }

      // 6. Update profile
      await bloggerRef.update(updates);

      logger.info("[updateBloggerProfile] Profile updated", {
        bloggerId: uid,
        updatedFields: Object.keys(updates).filter(k => k !== "updatedAt"),
      });

      return {
        success: true,
        message: "Profile updated successfully",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[updateBloggerProfile] Error", { uid, error });
      throw new HttpsError("internal", "Failed to update profile");
    }
  }
);
