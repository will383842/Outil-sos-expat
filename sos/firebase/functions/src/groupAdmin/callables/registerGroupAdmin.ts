/**
 * Callable: registerGroupAdmin
 *
 * Registers a new GroupAdmin (Group/Community Administrator) in the system.
 * Creates GroupAdmin profile with active status (no quiz required).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { BACKLINK_ENGINE_WEBHOOK_SECRET } from "../../lib/secrets";

import {
  GroupAdmin,
  RegisterGroupAdminRequest,
  RegisterGroupAdminResponse,
  SupportedGroupAdminLanguage,
  GroupType,
  GroupSizeTier,
} from "../types";
import { areNewRegistrationsEnabled, getGroupAdminConfig } from "../groupAdminConfig";
import { checkReferralFraud } from "../../affiliate/utils/fraudDetection";
import { hashIP } from "../../chatter/utils";
import { notifyBacklinkEngineUserRegistered } from "../../Webhooks/notifyBacklinkEngine";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Supported languages validation (must match app navigation languages)
const VALID_LANGUAGES: SupportedGroupAdminLanguage[] = [
  "fr", "en", "es", "pt", "ar", "de", "it", "nl", "zh"
];

// Valid group types
const VALID_GROUP_TYPES: GroupType[] = [
  "travel", "expat", "digital_nomad", "immigration", "relocation",
  "language", "country_specific", "profession", "family", "student",
  "retirement", "other",
  "affiliation", "press", "media", "lawyers", "translators", "movers",
  "real_estate", "insurance", "finance", "healthcare", "education"
];

// Valid group sizes
const VALID_GROUP_SIZES: GroupSizeTier[] = [
  "lt1k", "1k-5k", "5k-10k", "10k-25k", "25k-50k", "50k-100k", "gt100k"
];

/**
 * Generate a guaranteed-unique affiliate code for GroupAdmin.
 * P1 FIX: Uses a suffix derived from the user's UID (globally unique) to avoid
 * Firestore collision-check queries entirely. No retry loop needed.
 */
function generateAffiliateCode(firstName: string, uid: string, isRecruitment: boolean = false): string {
  const prefix = isRecruitment ? "REC-GROUP-" : "GROUP-";
  const cleanName = firstName.replace(/[^a-zA-Z]/g, "").toUpperCase().substring(0, 4);
  // Take last 6 chars of UID (base36-like, already unique per user)
  const uidSuffix = uid.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `${prefix}${cleanName}${uidSuffix}`;
}

/**
 * Validate group/community URL (any valid http/https URL)
 */
function isValidGroupUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const registerGroupAdmin = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
    secrets: [BACKLINK_ENGINE_WEBHOOK_SECRET],
  },
  async (request): Promise<RegisterGroupAdminResponse> => {
    const startTime = Date.now();
    // Firebase Admin is initialized globally in index.ts

    // 1. Check authentication
    if (!request.auth) {
      logger.error("[registerGroupAdmin] ❌ UNAUTHENTICATED", {
        timestamp: new Date().toISOString(),
        hasAuth: !!request.auth
      });
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // 2. Validate input
    const input = request.data as RegisterGroupAdminRequest;

    logger.info("[registerGroupAdmin] 🔵 DÉBUT INSCRIPTION", {
      timestamp: new Date().toISOString(),
      userId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      groupName: input.groupName,
      groupType: input.groupType,
      groupCountry: input.groupCountry,
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

    // Validate group info
    if (!input.groupUrl || !isValidGroupUrl(input.groupUrl)) {
      throw new HttpsError("invalid-argument", "Valid group or community URL is required");
    }

    if (!input.groupName || input.groupName.length < 3) {
      throw new HttpsError("invalid-argument", "Group name is required (min 3 characters)");
    }

    if (!input.groupType || !VALID_GROUP_TYPES.includes(input.groupType)) {
      throw new HttpsError("invalid-argument", "Valid group type is required");
    }

    if (!input.groupSize || !VALID_GROUP_SIZES.includes(input.groupSize)) {
      throw new HttpsError("invalid-argument", "Valid group size is required");
    }

    if (!input.groupCountry || input.groupCountry.length !== 2) {
      throw new HttpsError("invalid-argument", "Valid group country code is required");
    }

    if (!input.groupLanguage || !VALID_LANGUAGES.includes(input.groupLanguage)) {
      throw new HttpsError("invalid-argument", "Valid group language is required");
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
      // 3. Check registrations enabled
      if (!await areNewRegistrationsEnabled()) {
        throw new HttpsError("failed-precondition", "New registrations are currently disabled");
      }

      // 4. Check if user already has a role that conflicts
      const existingUser = await db.collection("users").doc(userId).get();

      if (existingUser.exists) {
        const userData = existingUser.data();
        const existingRole = userData?.role as string | undefined;

        // Check for conflicting roles
        if (existingRole === "lawyer") {
          throw new HttpsError(
            "permission-denied",
            "Les avocats ne peuvent pas s'inscrire comme admin de groupe."
          );
        }

        if (existingRole === "expat") {
          throw new HttpsError(
            "permission-denied",
            "Les expatriés aidants ne peuvent pas s'inscrire comme admin de groupe."
          );
        }

        if (existingRole === "admin") {
          throw new HttpsError(
            "permission-denied",
            "Les administrateurs système ne peuvent pas s'inscrire comme admin de groupe."
          );
        }

        if (existingRole === "chatter") {
          throw new HttpsError(
            "permission-denied",
            "Les chatters ne peuvent pas s'inscrire comme admin de groupe. Veuillez créer un nouveau compte."
          );
        }

        if (existingRole === "influencer") {
          throw new HttpsError(
            "permission-denied",
            "Les influenceurs ne peuvent pas s'inscrire comme admin de groupe. Veuillez créer un nouveau compte."
          );
        }

        // (frontend creates users doc with role='groupAdmin' before calling this function)
        if (userData?.isGroupAdmin === true || existingRole === "groupAdmin") {
          // Already a GroupAdmin, let it fall through to existing check
        } else if (existingRole && existingRole !== "client") {
          throw new HttpsError(
            "permission-denied",
            "Vous avez déjà un compte avec un autre rôle."
          );
        }
      }

      // 5. Check for existing GroupAdmin
      const existingGroupAdmin = await db.collection("group_admins").doc(userId).get();

      if (existingGroupAdmin.exists) {
        const existingData = existingGroupAdmin.data() as GroupAdmin;

        if (existingData.status !== "banned") {
          return {
            success: true,
            groupAdminId: userId,
            affiliateCodeClient: existingData.affiliateCodeClient,
            affiliateCodeRecruitment: existingData.affiliateCodeRecruitment,
          };
        } else {
          throw new HttpsError("permission-denied", "This account has been blocked");
        }
      }

      // 6. Check for duplicate email
      const emailQuery = await db
        .collection("group_admins")
        .where("email", "==", input.email.toLowerCase())
        .limit(1)
        .get();

      if (!emailQuery.empty) {
        throw new HttpsError("already-exists", "A GroupAdmin with this email already exists");
      }

      // 7. Check for duplicate group URL
      const groupUrlQuery = await db
        .collection("group_admins")
        .where("groupUrl", "==", input.groupUrl)
        .limit(1)
        .get();

      if (!groupUrlQuery.empty) {
        throw new HttpsError("already-exists", "This group/community is already registered");
      }

      // 8. Load config (used for attribution window + recruitment record)
      const config = await getGroupAdminConfig();

      // 9. Find recruiter if recruitment code provided
      let recruitedBy: string | null = null;
      let recruitedByCode: string | null = null;

      if (input.recruitmentCode) {
        // Enforce attribution window from config (default 30 days)
        let referralExpired = false;
        if (input.referralCapturedAt) {
          const capturedDate = new Date(input.referralCapturedAt);
          const windowMs = config.attributionWindowDays * 24 * 60 * 60 * 1000;
          if (Date.now() - capturedDate.getTime() > windowMs) {
            logger.warn("[registerGroupAdmin] Recruitment code expired", {
              code: input.recruitmentCode,
              capturedAt: input.referralCapturedAt,
              windowDays: config.attributionWindowDays,
            });
            referralExpired = true;
          }
        }

        if (!referralExpired) {
          const recruiterQuery = await db
            .collection("group_admins")
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

      // 9a. Self-referral guard
      if (recruitedBy && recruitedBy === userId) {
        logger.warn("[registerGroupAdmin] Self-referral detected, ignoring recruitment code", {
          userId,
          code: input.recruitmentCode,
        });
        recruitedBy = null;
        recruitedByCode = null;
      }

      // 9b. Anti-fraud check (disposable emails, same IP, suspicious patterns)
      const fraudResult = await checkReferralFraud(
        recruitedBy || userId,
        input.email.toLowerCase(),
        request.rawRequest?.ip || null,
        null
      );
      if (!fraudResult.allowed) {
        logger.warn("[registerGroupAdmin] Fraud check blocked registration", {
          userId,
          email: input.email,
          riskScore: fraudResult.riskScore,
          issues: fraudResult.issues,
          blockReason: fraudResult.blockReason,
        });
        throw new HttpsError("permission-denied", fraudResult.blockReason || "Registration blocked by fraud detection");
      }

      // 10. Generate unique affiliate codes
      // P1 FIX: UID-based suffix guarantees uniqueness — no Firestore collision checks needed
      const affiliateCodeClient = generateAffiliateCode(input.firstName, userId, false);
      const affiliateCodeRecruitment = generateAffiliateCode(input.firstName, userId, true);

      // 11. Create GroupAdmin document
      const now = Timestamp.now();
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

      const groupAdmin: GroupAdmin = {
        id: userId,
        email: input.email.toLowerCase(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
        country: input.country.toUpperCase(),
        language: input.language,
        additionalLanguages: input.additionalLanguages || [],

        groupUrl: input.groupUrl,
        groupName: input.groupName.trim(),
        groupType: input.groupType,
        groupSize: input.groupSize,
        groupCountry: input.groupCountry.toUpperCase(),
        groupLanguage: input.groupLanguage,
        ...(input.groupDescription?.trim() ? { groupDescription: input.groupDescription.trim() } : {}),
        isGroupVerified: false,
        isVisible: false,

        status: "active",

        affiliateCodeClient,
        affiliateCodeRecruitment,

        totalEarned: 0,
        availableBalance: 0,
        pendingBalance: 0,
        validatedBalance: 0,
        totalWithdrawn: 0,

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

        currentStreak: 0,
        bestStreak: 0,
        lastActivityDate: null,
        badges: [],

        recruitedBy,
        recruitedByCode,
        recruitedAt: recruitedBy ? now : null,

        preferredPaymentMethod: null,
        paymentDetails: null,
        pendingWithdrawalId: null,

        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,

        // ✅ TRACKING CGU - Preuve légale d'acceptation (eIDAS/RGPD)
        termsAccepted: input.acceptTerms ?? true,
        termsAcceptedAt: input.termsAcceptedAt || now.toDate().toISOString(),
        termsVersion: input.termsVersion || "3.0",
        termsType: input.termsType || "terms_group_admins",
        termsAcceptanceMeta: input.termsAcceptanceMeta || {
          userAgent: request.rawRequest?.headers?.["user-agent"] || "unknown",
          language: input.language || "en",
          timestamp: Date.now(),
          acceptanceMethod: "checkbox_click",
          ipHash: hashIP(request.rawRequest?.ip || "unknown"),
        },
      };

      // 12. Create documents in transaction
      logger.info("[registerGroupAdmin] 📝 DÉBUT TRANSACTION FIRESTORE", {
        timestamp: new Date().toISOString(),
        userId,
        email: input.email,
        collections: ["group_admins", "users", "group_admin_recruited_admins"],
        elapsedSinceStart: Date.now() - startTime
      });

      await db.runTransaction(async (transaction) => {
        // Create GroupAdmin
        const groupAdminRef = db.collection("group_admins").doc(userId);
        transaction.set(groupAdminRef, groupAdmin);

        // Create/Update user document
        const userRef = db.collection("users").doc(userId);
        const userDoc = await transaction.get(userRef);

        if (userDoc.exists) {
          transaction.update(userRef, {
            role: "groupAdmin",
            isGroupAdmin: true,
            groupAdminStatus: "active",
            updatedAt: now,
          });
        } else {
          transaction.set(userRef, {
            email: input.email.toLowerCase(),
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            role: "groupAdmin",
            isGroupAdmin: true,
            groupAdminStatus: "active",
            createdAt: now,
            updatedAt: now,
          });
        }

        // ✅ Track registration click (ALWAYS, even for direct signups)
        const clickRef = db.collection("group_admin_clicks").doc();
        transaction.set(clickRef, {
          id: clickRef.id,
          groupAdminId: recruitedBy || userId,
          affiliateCode: recruitedBy ? recruitedByCode : affiliateCodeClient,
          clickType: recruitedBy ? ("recruitment" as const) : ("client" as const),
          ipHash: hashIP(request.rawRequest?.ip || "unknown"),
          converted: true,
          conversionId: userId,
          createdAt: now,
        });

        // Track recruitment if from recruiter
        if (recruitedBy && recruitedByCode) {
          const recruitRef = db.collection("group_admin_recruited_admins").doc();
          const commissionWindowEnd = new Date();
          commissionWindowEnd.setMonth(commissionWindowEnd.getMonth() + config.recruitmentWindowMonths);

          transaction.set(recruitRef, {
            id: recruitRef.id,
            recruiterId: recruitedBy,
            recruitedId: userId,
            recruitedEmail: input.email.toLowerCase(),
            recruitedName: `${input.firstName} ${input.lastName}`,
            recruitedGroupName: input.groupName,
            recruitmentCode: recruitedByCode,
            recruitedAt: now,
            commissionWindowEnd: Timestamp.fromDate(commissionWindowEnd),
            commissionPaid: false,
          });
        }
      });

      logger.info("[registerGroupAdmin] ✅ TRANSACTION FIRESTORE RÉUSSIE", {
        timestamp: new Date().toISOString(),
        userId,
        email: input.email,
        duration: Date.now() - startTime
      });

      logger.info("[registerGroupAdmin] ✅ INSCRIPTION TERMINÉE", {
        timestamp: new Date().toISOString(),
        groupAdminId: userId,
        email: input.email,
        groupName: input.groupName,
        groupType: input.groupType,
        affiliateCodeClient,
        affiliateCodeRecruitment,
        recruitedBy,
        totalDuration: Date.now() - startTime
      });

      // ✅ NOUVEAU : Notify Backlink Engine to stop prospecting campaigns
      await notifyBacklinkEngineUserRegistered({
        email: input.email.toLowerCase(),
        userId,
        userType: "group_admin",
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
        metadata: {
          country: input.country,
          language: input.language,
          groupName: input.groupName,
          groupType: input.groupType,
          source: "registerGroupAdmin",
        },
      }).catch((err) => {
        logger.warn("[registerGroupAdmin] Failed to notify Backlink Engine", { error: err });
      });

      return {
        success: true,
        groupAdminId: userId,
        affiliateCodeClient,
        affiliateCodeRecruitment,
      };
    } catch (error) {
      logger.error("[registerGroupAdmin] ❌ ERREUR INSCRIPTION", {
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

      throw new HttpsError("internal", "Failed to register GroupAdmin");
    }
  }
);
