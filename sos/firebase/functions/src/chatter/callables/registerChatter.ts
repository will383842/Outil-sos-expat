/**
 * Callable: registerChatter
 *
 * Registers a new chatter in the system.
 * Creates chatter profile with ACTIVE status immediately (no quiz required).
 * Generates affiliate codes at registration.
 * Also creates/updates user document if needed.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Chatter,
  RegisterChatterInput,
  RegisterChatterResponse,
  SupportedChatterLanguage,
  ChatterPlatform,
} from "../types";
import { getChatterConfigCached, areRegistrationsEnabled, isCountrySupported, hashIP } from "../utils";
import {
  performFraudCheck,
  storeRegistrationIP,
  flagForManualReview,
} from "../antiFraud";
import {
  generateChatterClientCode,
  generateChatterRecruitmentCode,
} from "../utils/chatterCodeGenerator";

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

export const registerChatter = onCall(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: [
      "https://sos-expat.com",
      "https://www.sos-expat.com",
      "https://ia.sos-expat.com",
      "https://outil-sos-expat.pages.dev",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
  },
  async (request): Promise<RegisterChatterResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // 2. Validate input
    const input = request.data as RegisterChatterInput;

    if (!input.firstName || !input.lastName) {
      throw new HttpsError("invalid-argument", "First name and last name are required");
    }

    if (!input.email || !input.email.includes("@")) {
      throw new HttpsError("invalid-argument", "Valid email is required");
    }

    if (!input.country || input.country.length !== 2) {
      throw new HttpsError("invalid-argument", "Valid country code is required");
    }

    // interventionCountries is now optional - defaults to user's country if not provided

    if (!input.language || !VALID_LANGUAGES.includes(input.language)) {
      throw new HttpsError("invalid-argument", "Valid language is required");
    }

    // Validate platforms if provided (optional field)
    if (input.platforms && input.platforms.length > 0) {
      for (const platform of input.platforms) {
        if (!VALID_PLATFORMS.includes(platform)) {
          throw new HttpsError("invalid-argument", `Invalid platform: ${platform}`);
        }
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
      const config = await getChatterConfigCached();

      if (!areRegistrationsEnabled(config)) {
        throw new HttpsError("failed-precondition", "New registrations are currently disabled");
      }

      // 4. Check country support
      if (!isCountrySupported(input.country, config)) {
        throw new HttpsError(
          "failed-precondition",
          `Country ${input.country} is not currently supported`
        );
      }

      // 5. CRITICAL: Check if user already has another role (lawyer, expat, client, admin)
      // Chatters must be NEW accounts - existing users cannot become chatters
      const existingUser = await db.collection("users").doc(userId).get();

      if (existingUser.exists) {
        const userData = existingUser.data();
        const existingRole = userData?.role as string | undefined;

        // Block if user has any existing role
        if (existingRole === "lawyer") {
          throw new HttpsError(
            "permission-denied",
            "Les avocats ne peuvent pas s'inscrire comme chatter. Veuillez créer un nouveau compte."
          );
        }

        if (existingRole === "expat") {
          throw new HttpsError(
            "permission-denied",
            "Les expatriés aidants ne peuvent pas s'inscrire comme chatter. Veuillez créer un nouveau compte."
          );
        }

        if (existingRole === "admin") {
          throw new HttpsError(
            "permission-denied",
            "Les administrateurs ne peuvent pas s'inscrire comme chatter."
          );
        }

        if (existingRole === "client") {
          // Check if user has any bookings or calls
          const bookingsQuery = await db
            .collection("calls")
            .where("clientId", "==", userId)
            .limit(1)
            .get();

          if (!bookingsQuery.empty) {
            throw new HttpsError(
              "permission-denied",
              "Les clients ayant déjà utilisé la plateforme ne peuvent pas devenir chatter. Veuillez créer un nouveau compte."
            );
          }

          // Also check booking_requests
          const requestsQuery = await db
            .collection("booking_requests")
            .where("clientId", "==", userId)
            .limit(1)
            .get();

          if (!requestsQuery.empty) {
            throw new HttpsError(
              "permission-denied",
              "Les clients ayant déjà effectué une réservation ne peuvent pas devenir chatter. Veuillez créer un nouveau compte."
            );
          }
        }

        // If user exists but has isChatter already, check that
        if (userData?.isChatter === true) {
          // Let it fall through to existing chatter check below
        } else if (existingRole && existingRole !== "client") {
          // Generic block for any other role
          throw new HttpsError(
            "permission-denied",
            "Vous avez déjà un compte avec un autre rôle. Les chatters doivent avoir un compte dédié."
          );
        }
      }

      // 6. Check for existing chatter
      const existingChatter = await db.collection("chatters").doc(userId).get();

      if (existingChatter.exists) {
        const existingData = existingChatter.data() as Chatter;

        // If already registered, return existing data
        if (existingData.status !== "banned") {
          return {
            success: true,
            chatterId: userId,
            message: "Chatter already registered",
          };
        } else {
          throw new HttpsError("permission-denied", "This account has been banned");
        }
      }

      // 7. Check for duplicate email
      const emailQuery = await db
        .collection("chatters")
        .where("email", "==", input.email.toLowerCase())
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        throw new HttpsError("already-exists", "A chatter with this email already exists");
      }

      // 8. Find recruiter FIRST (needed for fraud check)
      let recruitedBy: string | null = null;
      let recruitedByCode: string | null = null;

      if (input.recruitmentCode) {
        // Enforce 30-day attribution window if capturedAt is provided
        let referralExpired = false;
        if (input.referralCapturedAt) {
          const capturedDate = new Date(input.referralCapturedAt);
          const windowMs = 30 * 24 * 60 * 60 * 1000; // 30 days
          if (Date.now() - capturedDate.getTime() > windowMs) {
            logger.warn("[registerChatter] Recruitment code expired (>30 days)", {
              code: input.recruitmentCode,
              capturedAt: input.referralCapturedAt,
            });
            referralExpired = true;
          }
        }

        if (!referralExpired) {
          const recruiterQuery = await db
            .collection("chatters")
            .where("affiliateCodeRecruitment", "==", input.recruitmentCode.toUpperCase())
            .where("status", "==", "active")
            .limit(1)
            .get();

          if (!recruiterQuery.empty) {
            recruitedBy = recruiterQuery.docs[0].id;
            recruitedByCode = input.recruitmentCode.toUpperCase();
          }
        }
      }

      // 9. ENHANCED FRAUD CHECK using new anti-fraud system
      const ip = request.rawRequest?.ip || "unknown";
      const fraudResult = await performFraudCheck({
        ip,
        email: input.email,
        referrerId: recruitedBy || undefined,
        userId,
      });

      if (fraudResult.shouldBlock) {
        logger.warn("[registerChatter] Blocked by fraud detection", {
          userId,
          email: input.email,
          flags: fraudResult.flags,
          severity: fraudResult.severity,
        });
        throw new HttpsError(
          "permission-denied",
          "Registration blocked. Please contact support if this is an error."
        );
      }

      // Flag for manual review if needed (but don't block)
      if (fraudResult.requiresManualReview) {
        await flagForManualReview(userId, fraudResult.flags, fraudResult.severity, {
          email: input.email,
          country: input.country,
          recruitedBy,
        });
      }

      // 10. Generate affiliate codes IMMEDIATELY (no quiz required)
      const now = Timestamp.now();
      const affiliateCodeClient = await generateChatterClientCode(
        input.firstName,
        input.email
      );
      const affiliateCodeRecruitment = generateChatterRecruitmentCode(affiliateCodeClient);

      logger.info("[registerChatter] Generated affiliate codes", {
        userId,
        affiliateCodeClient,
        affiliateCodeRecruitment,
      });

      // 11. Create chatter document with ACTIVE status
      const chatter: Chatter = {
        id: userId,
        email: input.email.toLowerCase(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim(),
        country: input.country.toUpperCase(),
        interventionCountries: input.interventionCountries?.map((c) => c.toUpperCase()) || [input.country.toUpperCase()],
        language: input.language,
        additionalLanguages: input.additionalLanguages || [],
        platforms: input.platforms ?? [],
        bio: input.bio?.trim(),

        status: "active", // Direct activation - no quiz required
        level: 1,
        levelProgress: 0,

        // Codes generated immediately at registration
        affiliateCodeClient,
        affiliateCodeRecruitment,

        totalEarned: 0,
        availableBalance: 0,
        pendingBalance: 0,
        validatedBalance: 0,

        totalClients: 0,
        totalRecruits: 0,
        totalCommissions: 0,
        commissionsByType: {
          client_referral: { count: 0, amount: 0 },
          recruitment: { count: 0, amount: 0 },
          bonus: { count: 0, amount: 0 },
        },

        currentStreak: 0,
        bestStreak: 0,
        lastActivityDate: null,
        badges: [],
        currentMonthRank: null,
        bestRank: null,

        // Monthly top multiplier (reward for top 3)
        monthlyTopMultiplier: 1.0, // No bonus by default
        monthlyTopMultiplierMonth: null,

        zoomMeetingsAttended: 0,
        lastZoomAttendance: null,

        quizAttempts: 0,
        lastQuizAttempt: null,
        quizPassedAt: null,

        preferredPaymentMethod: null,
        paymentDetails: null,
        pendingWithdrawalId: null,

        recruitedBy,
        recruitedByCode,
        recruitedAt: recruitedBy ? now : null,
        recruiterCommissionPaid: false,

        // Referral N2 system fields (parrainNiveau2Id calculated in onChatterCreated trigger)
        parrainNiveau2Id: null,
        qualifiedReferralsCount: 0,
        referralsN2Count: 0,
        referralEarnings: 0,
        referralToClientRatio: 0,
        threshold10Reached: false,
        threshold50Reached: false,
        tierBonusesPaid: [],

        // NEW SIMPLIFIED COMMISSION SYSTEM (2026)
        totalClientCalls: 0,
        isActivated: false,
        activatedAt: null,
        activationBonusPaid: false,

        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,

        // ✅ TRACKING CGU - Preuve légale d'acceptation (eIDAS/RGPD)
        termsAccepted: input.acceptTerms ?? true,
        termsAcceptedAt: input.termsAcceptedAt || now.toDate().toISOString(),
        termsVersion: input.termsVersion || "3.0",
        termsType: input.termsType || "terms_chatters",
        termsAcceptanceMeta: input.termsAcceptanceMeta || {
          userAgent: request.rawRequest?.headers?.['user-agent'] || "unknown",
          language: input.language || "en",
          timestamp: Date.now(),
          acceptanceMethod: "checkbox_click",
          ipAddress: request.rawRequest?.ip || "unknown",
        },
      };

      // 12. Create user document and chatter document in transaction
      // IMPORTANT: Chatters get a dedicated role, not shared with other roles
      await db.runTransaction(async (transaction) => {
        // Create chatter
        const chatterRef = db.collection("chatters").doc(userId);
        transaction.set(chatterRef, chatter);

        // Create user document with CHATTER role (not client)
        const userRef = db.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (userDoc.exists) {
          // This should only happen if user passed all role checks above
          // Update to chatter role - ACTIVE immediately
          transaction.update(userRef, {
            role: "chatter",
            isChatter: true,
            chatterStatus: "active",
            affiliateCodeClient,
            affiliateCodeRecruitment,
            updatedAt: now,
          });
        } else {
          // Create NEW user document with chatter role - ACTIVE immediately
          transaction.set(userRef, {
            email: input.email.toLowerCase(),
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            role: "chatter",
            isChatter: true,
            chatterStatus: "active",
            affiliateCodeClient,
            affiliateCodeRecruitment,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Track registration click if from recruitment
        if (input.recruitmentCode && recruitedBy) {
          const clickRef = db.collection("chatter_affiliate_clicks").doc();
          transaction.set(clickRef, {
            id: clickRef.id,
            chatterCode: recruitedByCode,
            chatterId: recruitedBy,
            linkType: "recruitment",
            landingPage: "/chatter/register",
            ipHash: hashIP(ip),
            converted: true,
            conversionId: userId,
            conversionType: "chatter_signup",
            clickedAt: now,
            convertedAt: now,
          });
        }
      });

      // Store IP address for anti-fraud tracking (in separate collection for privacy)
      await storeRegistrationIP(userId, ip, input.email);

      logger.info("[registerChatter] Chatter registered", {
        chatterId: userId,
        email: input.email,
        country: input.country,
        recruitedBy,
      });

      return {
        success: true,
        chatterId: userId,
        affiliateCodeClient,
        affiliateCodeRecruitment,
        message: "Registration successful. Your account is now active!",
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[registerChatter] Error", { userId, error });
      throw new HttpsError("internal", "Failed to register chatter");
    }
  }
);
