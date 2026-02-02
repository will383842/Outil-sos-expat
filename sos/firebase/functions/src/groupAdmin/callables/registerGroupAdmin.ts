/**
 * Callable: registerGroupAdmin
 *
 * Registers a new GroupAdmin (Facebook Group Administrator) in the system.
 * Creates GroupAdmin profile with active status (no quiz required).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  GroupAdmin,
  RegisterGroupAdminRequest,
  RegisterGroupAdminResponse,
  SupportedGroupAdminLanguage,
  GroupType,
  GroupSizeTier,
} from "../types";
import { areNewRegistrationsEnabled, getGroupAdminConfig } from "../groupAdminConfig";

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

/**
 * Generate unique affiliate code for GroupAdmin
 */
function generateAffiliateCode(firstName: string, isRecruitment: boolean = false): string {
  const prefix = isRecruitment ? "REC-GROUP-" : "GROUP-";
  const cleanName = firstName.replace(/[^a-zA-Z]/g, "").toUpperCase().substring(0, 6);
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${cleanName}${randomSuffix}`;
}

/**
 * Validate Facebook group URL
 */
function isValidFacebookGroupUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === "www.facebook.com" || parsed.hostname === "facebook.com") &&
      (parsed.pathname.includes("/groups/") || parsed.pathname.startsWith("/groups/"))
    );
  } catch {
    return false;
  }
}

export const registerGroupAdmin = onCall(
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
  async (request): Promise<RegisterGroupAdminResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // 2. Validate input
    const input = request.data as RegisterGroupAdminRequest;

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

    // Validate group info
    if (!input.groupUrl || !isValidFacebookGroupUrl(input.groupUrl)) {
      throw new HttpsError("invalid-argument", "Valid Facebook group URL is required");
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

        if (userData?.isGroupAdmin === true) {
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

        if (existingData.status !== "blocked") {
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
        throw new HttpsError("already-exists", "This Facebook group is already registered");
      }

      // 8. Find recruiter if recruitment code provided
      let recruitedBy: string | null = null;
      let recruitedByCode: string | null = null;

      if (input.recruitmentCode) {
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

      // 9. Generate unique affiliate codes
      let affiliateCodeClient = generateAffiliateCode(input.firstName, false);
      let affiliateCodeRecruitment = generateAffiliateCode(input.firstName, true);

      // Ensure codes are unique
      const codeCheckClient = await db
        .collection("group_admins")
        .where("affiliateCodeClient", "==", affiliateCodeClient)
        .limit(1)
        .get();

      if (!codeCheckClient.empty) {
        affiliateCodeClient = generateAffiliateCode(input.firstName + Date.now(), false);
      }

      const codeCheckRecruitment = await db
        .collection("group_admins")
        .where("affiliateCodeRecruitment", "==", affiliateCodeRecruitment)
        .limit(1)
        .get();

      if (!codeCheckRecruitment.empty) {
        affiliateCodeRecruitment = generateAffiliateCode(input.firstName + Date.now(), true);
      }

      // 10. Create GroupAdmin document
      const now = Timestamp.now();
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

      const groupAdmin: GroupAdmin = {
        id: userId,
        email: input.email.toLowerCase(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim(),
        country: input.country.toUpperCase(),
        language: input.language,
        additionalLanguages: input.additionalLanguages || [],

        groupUrl: input.groupUrl,
        groupName: input.groupName.trim(),
        groupType: input.groupType,
        groupSize: input.groupSize,
        groupCountry: input.groupCountry.toUpperCase(),
        groupLanguage: input.groupLanguage,
        groupDescription: input.groupDescription?.trim(),
        isGroupVerified: false,

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
      };

      // 11. Create documents in transaction
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

        // Track recruitment if from recruiter
        if (recruitedBy && recruitedByCode) {
          const config = await getGroupAdminConfig();
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

          // Track click conversion
          const clickRef = db.collection("group_admin_clicks").doc();
          transaction.set(clickRef, {
            id: clickRef.id,
            groupAdminId: recruitedBy,
            affiliateCode: recruitedByCode,
            clickType: "recruitment",
            ipHash: "registration",
            converted: true,
            conversionId: userId,
            createdAt: now,
          });
        }
      });

      logger.info("[registerGroupAdmin] GroupAdmin registered", {
        groupAdminId: userId,
        email: input.email,
        groupName: input.groupName,
        groupType: input.groupType,
        recruitedBy,
      });

      return {
        success: true,
        groupAdminId: userId,
        affiliateCodeClient,
        affiliateCodeRecruitment,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[registerGroupAdmin] Error", { userId, error });
      throw new HttpsError("internal", "Failed to register GroupAdmin");
    }
  }
);
