/**
 * Register Blogger Callable
 *
 * Handles new blogger registration with:
 * - Blog-specific fields validation
 * - Definitive role acknowledgment check
 * - Blocking if already chatter/influencer/provider
 * - Direct activation (no quiz required)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { BACKLINK_ENGINE_WEBHOOK_SECRET } from "../../lib/secrets";
import {
  RegisterBloggerInput,
  RegisterBloggerResponse,
  Blogger,
  BloggerStatus,
  SupportedBloggerLanguage,
  BlogTheme,
  BlogTrafficTier,
} from "../types";
import { getBloggerConfigCached } from "../utils/bloggerConfigService";
import { generateBloggerAffiliateCodes } from "../utils/bloggerCodeGenerator";
import { checkReferralFraud } from "../../affiliate/utils/fraudDetection";
import { hashIP } from "../../chatter/utils";
import { notifyBacklinkEngineUserRegistered } from "../../Webhooks/notifyBacklinkEngine";
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

function validateInput(input: RegisterBloggerInput): void {
  // Names validation (reasonable limits, not too strict)
  if (!input.firstName?.trim()) {
    throw new HttpsError("invalid-argument", "First name is required");
  }
  if (input.firstName.trim().length < 2 || input.firstName.trim().length > 50) {
    throw new HttpsError("invalid-argument", "First name must be between 2 and 50 characters");
  }
  if (!input.lastName?.trim()) {
    throw new HttpsError("invalid-argument", "Last name is required");
  }
  if (input.lastName.trim().length < 2 || input.lastName.trim().length > 50) {
    throw new HttpsError("invalid-argument", "Last name must be between 2 and 50 characters");
  }

  // Email validation (simple but effective)
  if (!input.email?.trim()) {
    throw new HttpsError("invalid-argument", "Email is required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new HttpsError("invalid-argument", "Valid email format is required");
  }

  // Phone validation (optional, but check format if provided)
  if (input.phone) {
    const phoneLength = input.phone.replace(/\D/g, '').length;
    if (phoneLength < 8 || phoneLength > 15) {
      throw new HttpsError("invalid-argument", "Phone number format is invalid (must be 8-15 digits)");
    }
  }

  if (!input.country?.trim()) {
    throw new HttpsError("invalid-argument", "Country is required");
  }
  if (input.country.length !== 2) {
    throw new HttpsError("invalid-argument", "Country must be a valid 2-letter code");
  }

  if (!input.language || !SUPPORTED_LANGUAGES.includes(input.language)) {
    throw new HttpsError("invalid-argument", "Valid language is required");
  }

  // Blog-specific fields (REQUIRED for bloggers)
  if (!input.blogUrl?.trim()) {
    throw new HttpsError("invalid-argument", "Blog URL is required");
  }

  // Blog URL format validation: must be a valid http(s) URL
  const trimmedBlogUrl = input.blogUrl.trim();
  if (!/^https?:\/\//i.test(trimmedBlogUrl)) {
    throw new HttpsError(
      "invalid-argument",
      "Blog URL must start with http:// or https://"
    );
  }
  try {
    new URL(trimmedBlogUrl);
  } catch {
    throw new HttpsError("invalid-argument", "Blog URL format is invalid");
  }

  if (!input.blogName?.trim()) {
    throw new HttpsError("invalid-argument", "Blog name is required");
  }
  if (!input.blogLanguage || !SUPPORTED_LANGUAGES.includes(input.blogLanguage)) {
    throw new HttpsError("invalid-argument", "Valid blog language is required");
  }
  if (!input.blogCountry?.trim()) {
    throw new HttpsError("invalid-argument", "Blog target country is required");
  }
  if (!input.blogTheme || !BLOG_THEMES.includes(input.blogTheme)) {
    throw new HttpsError("invalid-argument", "Valid blog theme is required");
  }
  if (!input.blogTraffic || !BLOG_TRAFFIC_TIERS.includes(input.blogTraffic)) {
    throw new HttpsError("invalid-argument", "Valid blog traffic estimate is required");
  }

  // Definitive role acknowledgment (REQUIRED)
  if (!input.definitiveRoleAcknowledged) {
    throw new HttpsError(
      "invalid-argument",
      "You must acknowledge that the blogger role is definitive and cannot be changed"
    );
  }

}

// ============================================================================
// CALLABLE
// ============================================================================

export const registerBlogger = onCall(
  {
    region: "europe-west2",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
    secrets: [BACKLINK_ENGINE_WEBHOOK_SECRET],
  },
  async (request): Promise<RegisterBloggerResponse> => {
    const startTime = Date.now();

    // 1. Check authentication
    if (!request.auth) {
      logger.error("[registerBlogger] ❌ UNAUTHENTICATED", {
        timestamp: new Date().toISOString(),
        hasAuth: !!request.auth
      });
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const uid = request.auth.uid;
    const input = request.data as RegisterBloggerInput;

    logger.info("[registerBlogger] 🔵 DÉBUT INSCRIPTION", {
      timestamp: new Date().toISOString(),
      userId: uid,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      country: input.country,
      language: input.language,
      blogUrl: input.blogUrl,
      dataKeys: Object.keys(input)
    });

    // 2. Validate input
    validateInput(input);

    const db = getFirestore();

    try {
      // 3. Check config
      const config = await getBloggerConfigCached();

      if (!config.isSystemActive) {
        throw new HttpsError("failed-precondition", "Blogger system is currently inactive");
      }

      if (!config.newRegistrationsEnabled) {
        throw new HttpsError("failed-precondition", "New blogger registrations are currently closed");
      }

      // 4. Check if user already has a blogger profile
      const existingBlogger = await db.collection("bloggers").doc(uid).get();
      if (existingBlogger.exists) {
        throw new HttpsError("already-exists", "You are already registered as a blogger");
      }

      // 5. IMPORTANT: Check if user is already a chatter, influencer, or provider
      // Bloggers CANNOT be chatters, influencers, or providers (definitive role)
      const [chatterDoc, influencerDoc, providerDoc] = await Promise.all([
        db.collection("chatters").doc(uid).get(),
        db.collection("influencers").doc(uid).get(),
        db.collection("providers").doc(uid).get(),
      ]);

      if (chatterDoc.exists) {
        throw new HttpsError(
          "failed-precondition",
          "You cannot become a blogger because you are already registered as a chatter"
        );
      }

      if (influencerDoc.exists) {
        throw new HttpsError(
          "failed-precondition",
          "You cannot become a blogger because you are already registered as an influencer"
        );
      }

      if (providerDoc.exists) {
        throw new HttpsError(
          "failed-precondition",
          "You cannot become a blogger because you are already registered as a provider"
        );
      }

      // 6. Check if blog URL is already registered by another blogger
      const blogUrlQuery = await db
        .collection("bloggers")
        .where("blogUrl", "==", input.blogUrl.toLowerCase().trim())
        .limit(1)
        .get();

      if (!blogUrlQuery.empty) {
        throw new HttpsError(
          "already-exists",
          "This blog URL is already registered by another blogger"
        );
      }

      // 7. Find recruiter if recruitment code provided
      let recruitedBy: string | null = null;
      let recruitedByCode: string | null = null;

      if (input.recruiterCode) {
        let referralExpired = false;
        if (input.referralCapturedAt) {
          const capturedDate = new Date(input.referralCapturedAt);
          const windowMs = 30 * 24 * 60 * 60 * 1000; // 30 days
          if (Date.now() - capturedDate.getTime() > windowMs) {
            logger.warn("[registerBlogger] Recruitment code expired (>30 days)", {
              code: input.recruiterCode,
              capturedAt: input.referralCapturedAt,
            });
            referralExpired = true;
          }
        }

        if (!referralExpired) {
          const recruiterQuery = await db
            .collection("bloggers")
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
      if (recruitedBy && recruitedBy === uid) {
        logger.warn("[registerBlogger] Self-referral detected, ignoring recruitment code", {
          uid,
          code: input.recruiterCode,
        });
        recruitedBy = null;
        recruitedByCode = null;
      }

      // 7b. Anti-fraud check (disposable emails, same IP, suspicious patterns)
      const fraudResult = await checkReferralFraud(
        recruitedBy || uid,
        input.email.toLowerCase(),
        request.rawRequest?.ip || null,
        null
      );
      if (!fraudResult.allowed) {
        logger.warn("[registerBlogger] Fraud check blocked registration", {
          uid,
          email: input.email,
          riskScore: fraudResult.riskScore,
          issues: fraudResult.issues,
          blockReason: fraudResult.blockReason,
        });
        throw new HttpsError("permission-denied", fraudResult.blockReason || "Registration blocked by fraud detection");
      }

      // 8. Generate affiliate codes
      const { affiliateCodeClient, affiliateCodeRecruitment } =
        await generateBloggerAffiliateCodes(input.firstName);

      // 8. Create blogger profile
      const now = Timestamp.now();
      const currentMonth = new Date().toISOString().slice(0, 7);

      const blogger: Blogger = {
        id: uid,
        email: input.email.toLowerCase().trim(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
        photoUrl: undefined,
        country: input.country.trim(),
        language: input.language,
        additionalLanguages: input.additionalLanguages || [],
        ...(input.bio?.trim() ? { bio: input.bio.trim() } : {}),

        // Blog-specific fields
        blogUrl: input.blogUrl.toLowerCase().trim(),
        blogName: input.blogName.trim(),
        blogLanguage: input.blogLanguage,
        blogCountry: input.blogCountry.trim(),
        blogTheme: input.blogTheme,
        blogTraffic: input.blogTraffic,
        ...(input.blogDescription?.trim() ? { blogDescription: input.blogDescription.trim() } : {}),

        // Status - ACTIVE immediately (no quiz required)
        status: "active" as BloggerStatus,
        adminNotes: undefined,
        suspensionReason: undefined,

        // Definitive role acknowledgment
        definitiveRoleAcknowledged: true,
        definitiveRoleAcknowledgedAt: now,

        // Affiliate codes
        affiliateCodeClient,
        affiliateCodeRecruitment,

        // Balances (all start at 0)
        totalEarned: 0,
        availableBalance: 0,
        pendingBalance: 0,
        validatedBalance: 0,
        totalWithdrawn: 0,

        // Statistics
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

        // Gamification (simplified)
        currentStreak: 0,
        bestStreak: 0,
        lastActivityDate: null,
        badges: [],

        // Payment details
        preferredPaymentMethod: null,
        paymentDetails: null,
        pendingWithdrawalId: null,

        // Recruitment tracking
        recruitedBy,
        recruitedByCode,
        recruitedAt: recruitedBy ? now : null,

        // Timestamps
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,

        // ✅ TRACKING CGU - Preuve légale d'acceptation (eIDAS/RGPD)
        termsAccepted: input.acceptTerms ?? true,
        termsAcceptedAt: input.termsAcceptedAt || now.toDate().toISOString(),
        termsVersion: input.termsVersion || "3.0",
        termsType: input.termsType || "terms_bloggers",
        termsAcceptanceMeta: input.termsAcceptanceMeta || {
          userAgent: request.rawRequest?.headers?.["user-agent"] || "unknown",
          language: input.language || "en",
          timestamp: Date.now(),
          acceptanceMethod: "checkbox_click",
          ipHash: hashIP(request.rawRequest?.ip || "unknown"),
        },
      };

      // 9. Save blogger profile + update users doc (in transaction for consistency)
      logger.info("[registerBlogger] 📝 DÉBUT TRANSACTION FIRESTORE", {
        timestamp: new Date().toISOString(),
        userId: uid,
        email: input.email,
        collections: ["bloggers", "users", "blogger_notifications"],
        elapsedSinceStart: Date.now() - startTime
      });

      await db.runTransaction(async (transaction) => {
        const bloggerRef = db.collection("bloggers").doc(uid);
        transaction.set(bloggerRef, blogger);

        // Update users/{uid} with blogger role (matching chatter/influencer pattern)
        const userRef = db.collection("users").doc(uid);
        const userDoc = await transaction.get(userRef);

        if (userDoc.exists) {
          transaction.update(userRef, {
            role: "blogger",
            isBlogger: true,
            bloggerStatus: "active",
            affiliateCodeClient,
            affiliateCodeRecruitment,
            updatedAt: now,
          });
        } else {
          transaction.set(userRef, {
            email: input.email.toLowerCase().trim(),
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            role: "blogger",
            isBlogger: true,
            bloggerStatus: "active",
            affiliateCodeClient,
            affiliateCodeRecruitment,
            createdAt: now,
            updatedAt: now,
          });
        }

        // ✅ Track registration click (INSIDE transaction)
        const clickRef = db.collection("blogger_affiliate_clicks").doc();
        transaction.set(clickRef, {
          id: clickRef.id,
          bloggerCode: recruitedBy ? recruitedByCode : affiliateCodeClient,
          bloggerId: recruitedBy || uid,
          linkType: recruitedBy ? "recruitment" as const : "client" as const,
          landingPage: "/devenir-blogueur",
          ipHash: hashIP(request.rawRequest?.ip || "unknown"),
          converted: true,
          conversionId: uid,
          conversionType: "blogger_signup" as const,
          clickedAt: now,
          convertedAt: now,
        });

        // ✅ Track recruitment (INSIDE transaction)
        if (recruitedBy) {
          const windowEnd = new Date();
          windowEnd.setMonth(windowEnd.getMonth() + config.recruitmentWindowMonths);
          const recruitTrackingRef = db.collection("blogger_recruited_bloggers").doc();
          transaction.set(recruitTrackingRef, {
            id: recruitTrackingRef.id,
            recruiterId: recruitedBy,
            recruitedId: uid,
            recruitedEmail: input.email.toLowerCase().trim(),
            recruitedName: `${input.firstName.trim()} ${input.lastName.trim()}`,
            recruitmentCode: recruitedByCode,
            recruitedAt: now,
            commissionWindowEnd: Timestamp.fromDate(windowEnd),
            commissionPaid: false,
            commissionId: null,
            commissionPaidAt: null,
          });
        }

        // 10. Create welcome notification (INSIDE transaction)
        const notifRef = db.collection("blogger_notifications").doc();
        transaction.set(notifRef, {
          id: notifRef.id,
          bloggerId: uid,
          type: "system",
          title: "Bienvenue dans le programme Blogueurs SOS-Expat !",
          titleTranslations: {
            en: "Welcome to the SOS-Expat Blogger Program!",
            es: "¡Bienvenido al Programa de Bloggers de SOS-Expat!",
            pt: "Bem-vindo ao Programa de Blogueiros SOS-Expat!",
          },
          message: `Félicitations ${input.firstName} ! Votre compte blogueur est maintenant actif. Découvrez vos outils de promotion et commencez à gagner des commissions dès aujourd'hui.`,
          messageTranslations: {
            en: `Congratulations ${input.firstName}! Your blogger account is now active. Discover your promotion tools and start earning commissions today.`,
          },
          actionUrl: "/blogger/tableau-de-bord",
          isRead: false,
          emailSent: false,
          createdAt: now,
        });
      });

      logger.info("[registerBlogger] ✅ TRANSACTION FIRESTORE RÉUSSIE", {
        timestamp: new Date().toISOString(),
        userId: uid,
        email: input.email,
        duration: Date.now() - startTime
      });

      logger.info("[registerBlogger] ✅ INSCRIPTION TERMINÉE", {
        timestamp: new Date().toISOString(),
        bloggerId: uid,
        email: input.email,
        blogUrl: input.blogUrl,
        affiliateCodeClient,
        affiliateCodeRecruitment,
        totalDuration: Date.now() - startTime
      });

      // ✅ NOUVEAU : Notify Backlink Engine to stop prospecting campaigns
      await notifyBacklinkEngineUserRegistered({
        email: input.email.toLowerCase(),
        userId: uid,
        userType: "blogger",
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
        metadata: {
          country: input.country,
          language: input.language,
          blogUrl: input.blogUrl,
          source: "registerBlogger",
        },
      }).catch((err) => {
        logger.warn("[registerBlogger] Failed to notify Backlink Engine", { error: err });
      });

      return {
        success: true,
        bloggerId: uid,
        affiliateCodeClient,
        affiliateCodeRecruitment,
        message: "Inscription réussie ! Votre compte blogueur est maintenant actif.",
      };
    } catch (error) {
      logger.error("[registerBlogger] ❌ ERREUR INSCRIPTION", {
        timestamp: new Date().toISOString(),
        userId: uid,
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

      throw new HttpsError("internal", "Failed to register blogger");
    }
  }
);
