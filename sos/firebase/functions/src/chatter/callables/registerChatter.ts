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
import { BACKLINK_ENGINE_WEBHOOK_SECRET } from "../../lib/secrets";

import {
  Chatter,
  RegisterChatterInput,
  RegisterChatterResponse,
  SupportedChatterLanguage,
  ChatterPlatform,
} from "../types";
import { getChatterConfigCached, areRegistrationsEnabled, isCountrySupported, hashIP } from "../utils";
import { checkReferralFraud } from "../../affiliate/utils/fraudDetection";
import { detectCircularReferral, runComprehensiveFraudCheck } from "../services/chatterReferralFraudService";
import {
  generateChatterClientCode,
  generateChatterRecruitmentCode,
} from "../utils/chatterCodeGenerator";
import { notifyBacklinkEngineUserRegistered } from "../../Webhooks/notifyBacklinkEngine";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";
import { checkRateLimit, RATE_LIMITS } from "../../lib/rateLimiter";

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
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    maxInstances: 2,
    cors: ALLOWED_ORIGINS,
    secrets: [BACKLINK_ENGINE_WEBHOOK_SECRET],
  },
  async (request): Promise<RegisterChatterResponse> => {
    const startTime = Date.now();
    // Firebase Admin is initialized globally in index.ts

    // 1. Check authentication
    if (!request.auth) {
      logger.error("[registerChatter] ❌ UNAUTHENTICATED", {
        timestamp: new Date().toISOString(),
        hasAuth: !!request.auth
      });
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    await checkRateLimit(userId, "registerChatter", RATE_LIMITS.REGISTRATION);

    const db = getFirestore();

    // 2. Validate input
    const input = request.data as RegisterChatterInput;

    logger.info("[registerChatter] 🔵 DÉBUT INSCRIPTION", {
      timestamp: new Date().toISOString(),
      userId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      country: input.country,
      language: input.language,
      hasPhone: !!input.phone,
      interventionCountriesCount: input.interventionCountries?.length || 0,
      platformsCount: input.platforms?.length || 0,
      additionalLanguagesCount: input.additionalLanguages?.length || 0,
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

    // interventionCountries is now optional - defaults to user's country if not provided
    // Validate interventionCountries if provided
    if (input.interventionCountries && input.interventionCountries.length > 0) {
      for (const countryCode of input.interventionCountries) {
        if (!countryCode || countryCode.length !== 2) {
          throw new HttpsError("invalid-argument", `Invalid country code in interventionCountries: ${countryCode}`);
        }
      }
    }

    if (!input.language || !VALID_LANGUAGES.includes(input.language)) {
      throw new HttpsError("invalid-argument", "Valid language is required");
    }

    // Bio validation (max length to prevent abuse)
    if (input.bio && input.bio.length > 1000) {
      throw new HttpsError("invalid-argument", "Bio must be less than 1000 characters");
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

        // If user exists but has isChatter already or role is already 'chatter'
        // (frontend creates users doc with role='chatter' before calling this function)
        if (userData?.isChatter === true || existingRole === "chatter") {
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

      // 7. Check for duplicate email (P2-01: cross-role check)
      const emailQuery = await db
        .collection("chatters")
        .where("email", "==", input.email.toLowerCase())
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        throw new HttpsError("already-exists", "A chatter with this email already exists");
      }

      // P2-01 FIX: Also check if email is used by another user account (cross-role)
      const usersEmailQuery = await db
        .collection("users")
        .where("email", "==", input.email.toLowerCase())
        .limit(1)
        .get();

      if (!usersEmailQuery.empty) {
        const existingUserDoc = usersEmailQuery.docs[0];
        if (existingUserDoc.id !== userId) {
          throw new HttpsError("already-exists", "This email is already used by another account");
        }
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
            const recruiterId = recruiterQuery.docs[0].id;

            // SECURITY: Block self-referral to prevent fraudulent commission generation
            if (recruiterId === userId) {
              logger.warn("[registerChatter] Self-recruitment attempt blocked", {
                userId,
                code: input.recruitmentCode,
              });
              // Silently ignore the referral code (don't block registration)
            } else {
              // P2-02 FIX: Check for circular referral chain before accepting
              try {
                const circularCheck = await detectCircularReferral(recruiterId, userId);
                if (circularCheck.isCircular) {
                  logger.warn("[registerChatter] Circular referral detected, ignoring code", {
                    userId,
                    recruiterId,
                    chain: circularCheck.chain,
                  });
                  // Silently ignore the referral code (don't block registration)
                } else {
                  recruitedBy = recruiterId;
                  recruitedByCode = input.recruitmentCode.toUpperCase();
                }
              } catch (circularError) {
                // If circular check fails, still accept the referral (don't block registration)
                logger.warn("[registerChatter] Circular check failed, accepting referral", {
                  error: circularError instanceof Error ? circularError.message : String(circularError),
                });
                recruitedBy = recruiterId;
                recruitedByCode = input.recruitmentCode.toUpperCase();
              }
            }
          }
        }
      }

      // 9. LIGHTWEIGHT FRAUD CHECK (same as influencer/blogger/groupAdmin)
      // Wrapped in try-catch: fraud check must NEVER block registration
      let fraudResult: { allowed: boolean; riskScore: number; issues: Array<{ type: string; severity: string; description: string }>; shouldAlert: boolean; blockReason?: string } = {
        allowed: true, riskScore: 0, issues: [], shouldAlert: false,
      };
      try {
        fraudResult = await checkReferralFraud(
          recruitedBy || userId,
          input.email,
          request.rawRequest?.ip || null,
          null
        );
      } catch (fraudError) {
        logger.warn("[registerChatter] Fraud check failed, continuing registration", {
          errorMessage: fraudError instanceof Error ? fraudError.message : String(fraudError),
          userId,
        });
      }

      if (!fraudResult.allowed) {
        logger.warn("[registerChatter] Blocked by fraud detection", {
          userId,
          email: input.email,
          riskScore: fraudResult.riskScore,
          issues: fraudResult.issues,
          blockReason: fraudResult.blockReason,
        });
        throw new HttpsError(
          "permission-denied",
          fraudResult.blockReason || "Registration blocked by fraud detection"
        );
      }

      // Write fraud alert for medium-risk registrations (not blocked, but flagged)
      if (fraudResult.riskScore > 30 && fraudResult.issues.length > 0) {
        logger.warn("[registerChatter] Fraud risk detected, writing alert", {
          email: input.email,
          riskScore: fraudResult.riskScore,
          issues: fraudResult.issues.map((i) => i.type),
          country: input.country,
          recruitedBy,
        });

        // Write to centralized fraud_alerts collection for admin visibility
        try {
          const alertRef = db.collection("fraud_alerts").doc();
          await alertRef.set({
            id: alertRef.id,
            userId,
            email: input.email,
            source: "chatter_registration_referral",
            flags: fraudResult.issues.map((i) => i.type),
            severity: fraudResult.riskScore >= 50 ? "high" : "medium",
            details: {
              riskScore: fraudResult.riskScore,
              issues: fraudResult.issues.map((i) => ({
                type: i.type,
                severity: i.severity,
                description: i.description,
              })),
              country: input.country,
              recruitedBy,
              recruitmentCode: input.recruitmentCode || null,
            },
            status: "pending",
            resolvedBy: null,
            resolvedAt: null,
            resolution: null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        } catch (alertError) {
          // Don't block registration if alert writing fails
          console.warn("[registerChatter] Failed to write fraud alert", String(alertError));
        }
      }

      // 10. Generate affiliate codes IMMEDIATELY (no quiz required)
      const now = Timestamp.now();
      const affiliateCodeClient = await generateChatterClientCode(
        input.firstName,
        input.email
      );
      const affiliateCodeRecruitment = generateChatterRecruitmentCode(affiliateCodeClient);

      console.log("[registerChatter] STEP 10: Codes generated", JSON.stringify({
        userId, affiliateCodeClient, affiliateCodeRecruitment, elapsed: Date.now() - startTime,
      }));

      // 11. Create chatter document with ACTIVE status
      console.log("[registerChatter] STEP 11: Creating chatter object...");
      const chatter: Chatter = {
        id: userId,
        email: input.email.toLowerCase(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}), // Only include phone if provided
        country: input.country.toUpperCase(),
        interventionCountries: input.interventionCountries?.map((c) => c.toUpperCase()) || [input.country.toUpperCase()],
        language: input.language,
        additionalLanguages: input.additionalLanguages || [],
        platforms: input.platforms ?? [],
        ...(input.bio?.trim() ? { bio: input.bio.trim() } : {}), // Only include bio if provided

        status: "active", // Direct activation - no quiz required
        isVisible: false,
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
        termsAffiliateVersion: input.termsAffiliateVersion || "1.0",
        termsAffiliateType: input.termsAffiliateType || "terms_affiliate",
        termsAcceptanceMeta: input.termsAcceptanceMeta || {
          userAgent: request.rawRequest?.headers?.['user-agent'] || "unknown",
          language: input.language || "en",
          timestamp: Date.now(),
          acceptanceMethod: "checkbox_click",
          ipHash: hashIP(request.rawRequest?.ip || "unknown"),
        },

        // P2-05 FIX: Store IP hash for multi-account fraud detection
        registrationIpHash: hashIP(request.rawRequest?.ip || "unknown"),
      };

      // 12. Create user document and chatter document in transaction
      console.log("[registerChatter] STEP 11b: Chatter object created OK, elapsed:", Date.now() - startTime);
      console.log("[registerChatter] STEP 12: Starting Firestore transaction...");

      await db.runTransaction(async (transaction) => {
        console.log("[registerChatter] STEP 12a: Inside transaction");
        // IMPORTANT: All reads MUST come before all writes in Firestore transactions
        const chatterRef = db.collection("chatters").doc(userId);
        const userRef = db.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        // Now do all writes
        transaction.set(chatterRef, chatter);

        if (userDoc.exists) {
          // This should only happen if user passed all role checks above
          // Update to chatter role - ACTIVE immediately
          transaction.update(userRef, {
            role: "chatter",
            isChatter: true,
            chatterStatus: "active",
            affiliateCodeClient,
            affiliateCodeRecruitment,
            telegramOnboardingCompleted: false,
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
            telegramOnboardingCompleted: false,
            createdAt: now,
            updatedAt: now,
          });
        }

        // ✅ Track registration click (ALWAYS, even for direct signups)
        const clickRef = db.collection("chatter_affiliate_clicks").doc();
        transaction.set(clickRef, {
          id: clickRef.id,
          chatterCode: recruitedBy ? recruitedByCode : affiliateCodeClient,
          chatterId: recruitedBy || userId,
          linkType: recruitedBy ? ("recruitment" as const) : ("client" as const),
          landingPage: "/chatter/register",
          ipHash: hashIP(request.rawRequest?.ip || "unknown"),
          converted: true,
          conversionId: userId,
          conversionType: "chatter_signup",
          clickedAt: now,
          convertedAt: now,
        });

        // Create recruitment tracking document (for harmonized $5 commission system)
        if (input.recruitmentCode && recruitedBy) {
          const windowEnd = new Date();
          windowEnd.setMonth(windowEnd.getMonth() + config.recruitmentWindowMonths);
          const recruitTrackingRef = db.collection("chatter_recruited_chatters").doc();
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

      console.log("[registerChatter] STEP 12b: Transaction SUCCESS, elapsed:", Date.now() - startTime);

      // P2-03 FIX: Run comprehensive fraud check post-registration (non-blocking)
      if (recruitedBy) {
        runComprehensiveFraudCheck(userId, {
          parrainId: recruitedBy,
          ipHash: hashIP(request.rawRequest?.ip || "unknown"),
        }).catch((err) => {
          logger.warn("[registerChatter] Post-registration fraud check failed", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      console.log("[registerChatter] STEP 13: INSCRIPTION TERMINÉE", JSON.stringify({
        chatterId: userId,
        email: input.email,
        affiliateCodeClient,
        totalDuration: Date.now() - startTime,
      }));

      // ✅ NOUVEAU : Notify Backlink Engine to stop prospecting campaigns
      await notifyBacklinkEngineUserRegistered({
        email: input.email.toLowerCase(),
        userId,
        userType: "chatter",
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim(),
        metadata: {
          country: input.country,
          language: input.language,
          source: "registerChatter",
        },
      }).catch((err) => {
        logger.warn("[registerChatter] Failed to notify Backlink Engine", { error: err });
        // Don't fail registration if webhook fails
      });

      return {
        success: true,
        chatterId: userId,
        affiliateCodeClient,
        affiliateCodeRecruitment,
        message: "Registration successful. Your account is now active!",
      };
    } catch (error) {
      // Use console.error to avoid firebase-functions logger serialization crash
      const errMsg = error instanceof Error ? error.message : String(error);
      const errCode = (error as any)?.code;
      const errStack = error instanceof Error ? error.stack?.substring(0, 500) : undefined;
      console.error("[registerChatter] ❌ ERREUR INSCRIPTION", JSON.stringify({
        timestamp: new Date().toISOString(),
        userId,
        email: input?.email,
        errorType: error?.constructor?.name,
        errorCode: errCode,
        errorMessage: errMsg,
        errorStack: errStack,
        duration: Date.now() - startTime,
        isHttpsError: error instanceof HttpsError,
      }));

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to register chatter: " + errMsg);
    }
  }
);
