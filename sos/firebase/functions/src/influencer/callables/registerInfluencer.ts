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
import { BACKLINK_ENGINE_WEBHOOK_SECRET } from "../../lib/secrets";

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
import { checkReferralFraud } from "../../affiliate/utils/fraudDetection";
import { notifyBacklinkEngineUserRegistered } from "../../Webhooks/notifyBacklinkEngine";

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
    region: "europe-west2",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: true,
    secrets: [BACKLINK_ENGINE_WEBHOOK_SECRET],
  },
  async (request): Promise<RegisterInfluencerResponse> => {
    const startTime = Date.now();
    // Firebase Admin is initialized globally in index.ts

    // 1. Check authentication
    if (!request.auth) {
      logger.error("[registerInfluencer] ❌ UNAUTHENTICATED", {
        timestamp: new Date().toISOString(),
        hasAuth: !!request.auth
      });
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // 2. Validate input
    const input = request.data as RegisterInfluencerInput;

    logger.info("[registerInfluencer] 🔵 DÉBUT INSCRIPTION", {
      timestamp: new Date().toISOString(),
      userId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      country: input.country,
      language: input.language,
      platformsCount: input.platforms?.length || 0,
      dataKeys: Object.keys(input)
    });

    // Names validation (reasonable limits, not too strict)
    if (!input.firstName || !input.lastName) {
      throw new HttpsError("invalid-argument", "First name and last name are required");
    }
    if (input.firstName.trim().length < 2 || input.firstName.trim().length > 50) {
      throw new HttpsError("invalid-argument", "First name must be between 2 and 50 characters");
    }
    if (input.lastName.trim().length < 2 || input.lastName.trim().length > 50) {
      throw new HttpsError("invalid-argument", "Last name must be between 2 and 50 characters");
    }

    // Email validation (simple but effective)
    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new HttpsError("invalid-argument", "Valid email is required");
    }

    // Phone validation (optional, but check format if provided)
    if (input.phone) {
      const phoneLength = input.phone.replace(/\D/g, '').length;
      if (phoneLength < 8 || phoneLength > 15) {
        throw new HttpsError("invalid-argument", "Phone number format is invalid (must be 8-15 digits)");
      }
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

    // Validate interventionCountries if provided
    if (input.interventionCountries && input.interventionCountries.length > 0) {
      for (const countryCode of input.interventionCountries) {
        if (!countryCode || countryCode.length !== 2) {
          throw new HttpsError("invalid-argument", `Invalid country code in interventionCountries: ${countryCode}`);
        }
      }
    }

    // Bio validation (max length to prevent abuse)
    if (input.bio && input.bio.length > 1000) {
      throw new HttpsError("invalid-argument", "Bio must be less than 1000 characters");
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
        // (frontend creates users doc with role='influencer' before calling this function)
        if (userData?.isInfluencer === true || existingRole === "influencer") {
          // Let it fall through to existing influencer check below
        } else if (existingRole && existingRole !== "client") {
          // Generic block for any other role (blogger, groupAdmin, etc.)
          throw new HttpsError(
            "permission-denied",
            "Vous avez déjà un compte avec un autre rôle. Veuillez créer un nouveau compte pour devenir influenceur."
          );
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

      // 7. Find recruiter if recruitment code provided
      let recruitedBy: string | null = null;
      let recruitedByCode: string | null = null;

      if (input.recruiterCode) {
        // Enforce 30-day attribution window if capturedAt is provided
        let referralExpired = false;
        if (input.referralCapturedAt) {
          const capturedDate = new Date(input.referralCapturedAt);
          const windowMs = 30 * 24 * 60 * 60 * 1000; // 30 days
          if (Date.now() - capturedDate.getTime() > windowMs) {
            logger.warn("[registerInfluencer] Recruitment code expired (>30 days)", {
              code: input.recruiterCode,
              capturedAt: input.referralCapturedAt,
            });
            referralExpired = true;
          }
        }

        if (!referralExpired) {
          const recruiterQuery = await db
            .collection("influencers")
            .where("affiliateCodeRecruitment", "==", input.recruiterCode.toUpperCase())
            .where("status", "==", "active")
            .limit(1)
            .get();

          if (!recruiterQuery.empty) {
            recruitedBy = recruiterQuery.docs[0].id;
            recruitedByCode = input.recruiterCode.toUpperCase();
          }
        }
      }

      // 7a. Self-referral guard
      if (recruitedBy && recruitedBy === userId) {
        logger.warn("[registerInfluencer] Self-referral detected, ignoring recruitment code", {
          userId,
          code: input.recruiterCode,
        });
        recruitedBy = null;
        recruitedByCode = null;
      }

      // 7b. Anti-fraud check (disposable emails, same IP, suspicious patterns)
      const fraudResult = await checkReferralFraud(
        recruitedBy || userId,
        input.email.toLowerCase(),
        request.rawRequest?.ip || null,
        null
      );
      if (!fraudResult.allowed) {
        logger.warn("[registerInfluencer] Fraud check blocked registration", {
          userId,
          email: input.email,
          riskScore: fraudResult.riskScore,
          issues: fraudResult.issues,
          blockReason: fraudResult.blockReason,
        });
        throw new HttpsError("permission-denied", fraudResult.blockReason || "Registration blocked by fraud detection");
      }

      // 8. Generate affiliate codes
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
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
        country: input.country.toUpperCase(),
        language: input.language,
        additionalLanguages: input.additionalLanguages || [],
        platforms: input.platforms,
        ...(input.bio?.trim() ? { bio: input.bio.trim() } : {}),
        communitySize: input.communitySize,
        ...(input.communityNiche?.trim() ? { communityNiche: input.communityNiche.trim() } : {}),
        interventionCountries: input.interventionCountries || [],
        socialLinks: input.socialLinks,

        status: "active", // Directly active - no quiz required
        affiliateCodeClient,
        affiliateCodeRecruitment,

        // Level system (aligned with Chatter)
        level: 1,
        levelProgress: 0,
        currentStreak: 0,
        bestStreak: 0,
        monthlyTopMultiplier: 1.0,
        monthlyTopMultiplierMonth: null,

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

        // Recruitment tracking
        recruitedBy,
        recruitedByCode,
        recruitedAt: recruitedBy ? now : null,

        // V2: Captured rates (frozen at registration)
        capturedRates,
        totalWithdrawn: 0,

        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        lastActivityDate: null,

        // ✅ TRACKING CGU - Preuve légale d'acceptation (eIDAS/RGPD)
        termsAccepted: input.acceptTerms ?? true,
        termsAcceptedAt: input.termsAcceptedAt || now.toDate().toISOString(),
        termsVersion: input.termsVersion || "3.0",
        termsType: input.termsType || "terms_influencers",
        termsAcceptanceMeta: input.termsAcceptanceMeta || {
          userAgent: request.rawRequest?.headers?.["user-agent"] || "unknown",
          language: input.language || "en",
          timestamp: Date.now(),
          acceptanceMethod: "checkbox_click",
          ipHash: hashIP(request.rawRequest?.ip || "unknown"),
        },
      };

      // 10. Create user document and influencer document in transaction
      logger.info("[registerInfluencer] 📝 DÉBUT TRANSACTION FIRESTORE", {
        timestamp: new Date().toISOString(),
        userId,
        email: input.email,
        collections: ["influencers", "users", "influencer_affiliate_clicks"],
        elapsedSinceStart: Date.now() - startTime
      });

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

        // ✅ Track registration click (harmonized with Blogger pattern)
        const ip = request.rawRequest?.ip || "unknown";
        const clickRef = db.collection("influencer_affiliate_clicks").doc();
        transaction.set(clickRef, {
          id: clickRef.id,
          influencerCode: recruitedBy ? recruitedByCode : affiliateCodeClient,
          influencerId: recruitedBy || userId,
          linkType: recruitedBy ? ("recruitment" as const) : ("client" as const),
          landingPage: "/devenir-influenceur",
          ipHash: hashIP(ip),
          converted: true,
          conversionId: userId,
          conversionType: "signup",
          clickedAt: now,
          convertedAt: now,
        });

        // Create recruitment tracking document if recruited
        if (recruitedBy) {
          const windowEnd = new Date();
          windowEnd.setMonth(windowEnd.getMonth() + config.recruitmentWindowMonths);
          const recruitTrackingRef = db.collection("influencer_recruited_influencers").doc();
          transaction.set(recruitTrackingRef, {
            id: recruitTrackingRef.id,
            recruiterId: recruitedBy,
            recruitedId: userId,
            recruitedEmail: input.email.toLowerCase(),
            recruitedName: `${input.firstName.trim()} ${input.lastName.trim()}`,
            recruitmentCode: recruitedByCode,
            recruitedAt: now,
            commissionWindowEnd: Timestamp.fromDate(windowEnd),
            commissionPaid: false,
            commissionId: null,
            commissionPaidAt: null,
          });
        }
      });

      logger.info("[registerInfluencer] ✅ TRANSACTION FIRESTORE RÉUSSIE", {
        timestamp: new Date().toISOString(),
        userId,
        email: input.email,
        duration: Date.now() - startTime
      });

      logger.info("[registerInfluencer] ✅ INSCRIPTION TERMINÉE", {
        timestamp: new Date().toISOString(),
        influencerId: userId,
        email: input.email,
        country: input.country,
        affiliateCodeClient,
        affiliateCodeRecruitment,
        totalDuration: Date.now() - startTime
      });

      // ✅ NOUVEAU : Notify Backlink Engine to stop prospecting campaigns
      await notifyBacklinkEngineUserRegistered({
        email: input.email.toLowerCase(),
        userId,
        userType: "influencer",
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
        metadata: {
          country: input.country,
          language: input.language,
          source: "registerInfluencer",
        },
      }).catch((err) => {
        logger.warn("[registerInfluencer] Failed to notify Backlink Engine", { error: err });
      });

      return {
        success: true,
        influencerId: userId,
        affiliateCodeClient,
        affiliateCodeRecruitment,
        message: "Registration successful. Your account is now active!",
      };
    } catch (error) {
      logger.error("[registerInfluencer] ❌ ERREUR INSCRIPTION", {
        timestamp: new Date().toISOString(),
        userId,
        email: input?.email,
        errorType: error?.constructor?.name,
        errorCode: (error as any)?.code,
        errorMessage: (error as Error)?.message,
        errorStack: (error as Error)?.stack,
        duration: Date.now() - startTime,
        isHttpsError: error instanceof HttpsError
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to register influencer");
    }
  }
);
