/**
 * Callable: registerInfluencer
 *
 * Registers a new influencer in the system.
 * Creates influencer profile with 'active' status (no quiz required).
 * Generates affiliate codes immediately.
 *
 * IMPORTANT: A user cannot be both influencer AND chatter.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Influencer,
  RegisterInfluencerInput,
  RegisterInfluencerResponse,
  SupportedInfluencerLanguage,
  InfluencerPlatform,
} from "../types";
import {
  getInfluencerConfigCached,
  areRegistrationsEnabled,
  generateClientCode,
  generateRecruitmentCode,
  hashIP,
  captureCurrentRates,
} from "../utils";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// Supported languages validation
const VALID_LANGUAGES: SupportedInfluencerLanguage[] = [
  "fr", "en", "es", "pt", "ar", "de", "it", "nl", "zh"
];

// Valid platforms
const VALID_PLATFORMS: InfluencerPlatform[] = [
  "facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube",
  "whatsapp", "telegram", "snapchat", "reddit", "discord", "blog",
  "website", "forum", "podcast", "newsletter", "other"
];

export const registerInfluencer = onCall(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: true,
  },
  async (request): Promise<RegisterInfluencerResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // 2. Validate input
    const input = request.data as RegisterInfluencerInput;

    if (!input.firstName || !input.lastName) {
      throw new HttpsError("invalid-argument", "First name and last name are required");
    }

    if (!input.email || !input.email.includes("@")) {
      throw new HttpsError("invalid-argument", "Valid email is required");
    }

    if (!input.country || input.country.length !== 2) {
      throw new HttpsError("invalid-argument", "Valid country code is required");
    }

    if (!input.language || !VALID_LANGUAGES.includes(input.language)) {
      throw new HttpsError("invalid-argument", "Valid language is required");
    }

    if (!input.platforms || input.platforms.length === 0) {
      throw new HttpsError("invalid-argument", "At least one platform is required");
    }

    // Validate platforms
    for (const platform of input.platforms) {
      if (!VALID_PLATFORMS.includes(platform)) {
        throw new HttpsError("invalid-argument", `Invalid platform: ${platform}`);
      }
    }

    // Validate additional languages if provided
    if (input.additionalLanguages) {
      for (const lang of input.additionalLanguages) {
        if (!VALID_LANGUAGES.includes(lang)) {
          throw new HttpsError("invalid-argument", `Invalid language: ${lang}`);
        }
      }
    }

    try {
      // 3. Get config and check registrations enabled
      const config = await getInfluencerConfigCached();

      if (!areRegistrationsEnabled(config)) {
        throw new HttpsError("failed-precondition", "New registrations are currently disabled");
      }

      // 4. CRITICAL: Check if user already has another role
      const existingUser = await db.collection("users").doc(userId).get();

      if (existingUser.exists) {
        const userData = existingUser.data();
        const existingRole = userData?.role as string | undefined;

        // Block if user is a lawyer or expat (provider)
        if (existingRole === "lawyer") {
          throw new HttpsError(
            "permission-denied",
            "Les avocats ne peuvent pas s'inscrire comme influenceur. Veuillez créer un nouveau compte."
          );
        }

        if (existingRole === "expat") {
          throw new HttpsError(
            "permission-denied",
            "Les expatriés aidants ne peuvent pas s'inscrire comme influenceur. Veuillez créer un nouveau compte."
          );
        }

        if (existingRole === "admin") {
          throw new HttpsError(
            "permission-denied",
            "Les administrateurs ne peuvent pas s'inscrire comme influenceur."
          );
        }

        // CRITICAL: Block if user is already a chatter
        if (existingRole === "chatter" || userData?.isChatter === true) {
          throw new HttpsError(
            "permission-denied",
            "Les chatters ne peuvent pas devenir influenceur. Les deux rôles sont mutuellement exclusifs."
          );
        }

        // Check if already an influencer
        if (userData?.isInfluencer === true) {
          // Let it fall through to existing influencer check below
        } else if (existingRole === "client") {
          // Check if client has any calls (if so, block)
          const callsQuery = await db
            .collection("calls")
            .where("clientId", "==", userId)
            .limit(1)
            .get();

          if (!callsQuery.empty) {
            throw new HttpsError(
              "permission-denied",
              "Les clients ayant déjà utilisé la plateforme ne peuvent pas devenir influenceur. Veuillez créer un nouveau compte."
            );
          }
        }
      }

      // 5. Check for existing influencer
      const existingInfluencer = await db.collection("influencers").doc(userId).get();

      if (existingInfluencer.exists) {
        const existingData = existingInfluencer.data() as Influencer;

        // If already registered, return existing data
        if (existingData.status !== "banned") {
          return {
            success: true,
            influencerId: userId,
            affiliateCodeClient: existingData.affiliateCodeClient,
            affiliateCodeRecruitment: existingData.affiliateCodeRecruitment,
            message: "Influencer already registered",
          };
        } else {
          throw new HttpsError("permission-denied", "This account has been banned");
        }
      }

      // 6. Check for duplicate email
      const emailQuery = await db
        .collection("influencers")
        .where("email", "==", input.email.toLowerCase())
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        throw new HttpsError("already-exists", "An influencer with this email already exists");
      }

      // 7. Generate affiliate codes
      const affiliateCodeClient = await generateClientCode(input.firstName);
      const affiliateCodeRecruitment = generateRecruitmentCode(affiliateCodeClient);

      // 8. V2: Capture current rates (frozen at registration)
      const capturedRates = captureCurrentRates(config);

      // 9. Create influencer document
      const now = Timestamp.now();
      const currentMonth = now.toDate().toISOString().substring(0, 7);

      const influencer: Influencer = {
        id: userId,
        email: input.email.toLowerCase(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim(),
        country: input.country.toUpperCase(),
        language: input.language,
        additionalLanguages: input.additionalLanguages || [],
        platforms: input.platforms,
        bio: input.bio?.trim(),
        communitySize: input.communitySize,
        communityNiche: input.communityNiche?.trim(),
        socialLinks: input.socialLinks,

        status: "active", // Directly active - no quiz required
        affiliateCodeClient,
        affiliateCodeRecruitment,

        totalEarned: 0,
        availableBalance: 0,
        pendingBalance: 0,
        validatedBalance: 0,

        totalClients: 0,
        totalRecruits: 0,
        totalCommissions: 0,
        currentMonthStats: {
          clients: 0,
          recruits: 0,
          earnings: 0,
          month: currentMonth,
        },
        currentMonthRank: null,
        bestRank: null,

        preferredPaymentMethod: null,
        paymentDetails: null,
        pendingWithdrawalId: null,

        // V2: Captured rates (frozen at registration)
        capturedRates,
        totalWithdrawn: 0,

        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        lastActivityDate: null,
      };

      // 10. Create user document and influencer document in transaction
      await db.runTransaction(async (transaction) => {
        // Create influencer
        const influencerRef = db.collection("influencers").doc(userId);
        transaction.set(influencerRef, influencer);

        // Create/update user document with INFLUENCER role
        const userRef = db.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (userDoc.exists) {
          // Update to influencer role
          transaction.update(userRef, {
            role: "influencer",
            isInfluencer: true,
            updatedAt: now,
          });
        } else {
          // Create NEW user document with influencer role
          transaction.set(userRef, {
            email: input.email.toLowerCase(),
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            role: "influencer",
            isInfluencer: true,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Track registration click
        const ip = request.rawRequest?.ip || "unknown";
        const clickRef = db.collection("influencer_affiliate_clicks").doc();
        transaction.set(clickRef, {
          id: clickRef.id,
          influencerCode: affiliateCodeClient,
          influencerId: userId,
          linkType: "client",
          landingPage: "/devenir-influenceur",
          ipHash: hashIP(ip),
          converted: true,
          conversionId: userId,
          conversionType: "signup",
          clickedAt: now,
          convertedAt: now,
        });
      });

      logger.info("[registerInfluencer] Influencer registered", {
        influencerId: userId,
        email: input.email,
        country: input.country,
        affiliateCodeClient,
      });

      return {
        success: true,
        influencerId: userId,
        affiliateCodeClient,
        affiliateCodeRecruitment,
        message: "Registration successful. Your account is now active!",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[registerInfluencer] Error", { userId, error });
      throw new HttpsError("internal", "Failed to register influencer");
    }
  }
);
