/**
 * Callable: createPartner
 *
 * Admin-only callable that creates a new partner account.
 * Creates Firebase Auth user, users/ doc, partners/ doc,
 * ensures partner_config exists, and optionally sends credentials.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  type Partner,
  type CreatePartnerInput,
  DEFAULT_PARTNER_CONFIG,
  PARTNER_CONSTANTS,
} from "../types";
import {
  validateEmail,
  validateWebsiteUrl,
  validateAffiliateCode,
  validateLanguage,
  validateCategory,
  validateTrafficTier,
  isEmailTaken,
  isAffiliateCodeTaken,
  isWebsiteUrlTaken,
} from "../utils/partnerValidation";
import { partnerAdminConfig } from "../../lib/functionConfigs";
import { sendZoho } from "../../notificationPipeline/providers/email/zohoSmtp";
import { generateWelcomeEmail } from "../../email/welcomeTemplates";
import { EMAIL_SECRETS } from "../../lib/secrets";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const createPartner = onCall(
  {
    ...partnerAdminConfig,
    timeoutSeconds: 60,
    secrets: [...EMAIL_SECRETS],
  },
  async (request) => {
    ensureInitialized();

    // 1. Admin check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    if (request.auth.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const adminUid = request.auth.uid;
    const db = getFirestore();
    const input = request.data as CreatePartnerInput;

    // 2. Validate input
    if (!input.email || !validateEmail(input.email)) {
      throw new HttpsError("invalid-argument", "Valid email is required");
    }
    if (!input.firstName?.trim() || input.firstName.trim().length < 2) {
      throw new HttpsError("invalid-argument", "First name is required (min 2 chars)");
    }
    if (!input.lastName?.trim() || input.lastName.trim().length < 2) {
      throw new HttpsError("invalid-argument", "Last name is required (min 2 chars)");
    }
    if (!input.affiliateCode || !validateAffiliateCode(input.affiliateCode)) {
      throw new HttpsError(
        "invalid-argument",
        "Affiliate code must be 3-20 uppercase alphanumeric characters"
      );
    }
    if (!input.websiteUrl || !validateWebsiteUrl(input.websiteUrl)) {
      throw new HttpsError("invalid-argument", "Valid website URL is required");
    }
    if (!input.websiteName?.trim()) {
      throw new HttpsError("invalid-argument", "Website name is required");
    }
    if (!input.websiteCategory || !validateCategory(input.websiteCategory)) {
      throw new HttpsError("invalid-argument", "Valid website category is required");
    }
    if (!input.language || !validateLanguage(input.language)) {
      throw new HttpsError("invalid-argument", "Valid language is required");
    }
    if (!input.country || input.country.length !== 2) {
      throw new HttpsError("invalid-argument", "Valid 2-letter country code is required");
    }
    if (input.websiteTraffic && !validateTrafficTier(input.websiteTraffic)) {
      throw new HttpsError("invalid-argument", "Invalid traffic tier");
    }
    if (typeof input.commissionPerCallLawyer !== "number" || input.commissionPerCallLawyer < 0) {
      throw new HttpsError("invalid-argument", "commissionPerCallLawyer must be a non-negative number");
    }
    if (typeof input.commissionPerCallExpat !== "number" || input.commissionPerCallExpat < 0) {
      throw new HttpsError("invalid-argument", "commissionPerCallExpat must be a non-negative number");
    }

    try {
      // 3. Uniqueness checks
      const emailTaken = await isEmailTaken(input.email);
      if (emailTaken) {
        throw new HttpsError("already-exists", "This email is already used by an existing account");
      }

      const codeTaken = await isAffiliateCodeTaken(input.affiliateCode);
      if (codeTaken) {
        throw new HttpsError("already-exists", "This affiliate code is already taken");
      }

      const providerCodeTaken = await isAffiliateCodeTaken(`PROV-${input.affiliateCode.toUpperCase().trim()}`);
      if (providerCodeTaken) {
        throw new HttpsError("already-exists", "The derived provider recruitment code is already taken");
      }

      const websiteTaken = await isWebsiteUrlTaken(input.websiteUrl);
      if (websiteTaken) {
        throw new HttpsError("already-exists", "This website URL is already registered");
      }

      // 4. Create Firebase Auth user (without password)
      const displayName = `${input.firstName.trim()} ${input.lastName.trim()}`;
      const userRecord = await getAuth().createUser({
        email: input.email.toLowerCase().trim(),
        emailVerified: false,
        disabled: false,
        displayName,
      });
      const uid = userRecord.uid;

      // 5. Set custom claims
      await getAuth().setCustomUserClaims(uid, { role: "partner" });

      const now = Timestamp.now();
      const normalizedCode = input.affiliateCode.toUpperCase().trim();
      const affiliateCodeProvider = `PROV-${normalizedCode}`;
      const normalizedUrl = input.websiteUrl.toLowerCase().trim().replace(/\/+$/, "");
      const affiliateLink = `${PARTNER_CONSTANTS.AFFILIATE_BASE_URL}?ref=${normalizedCode}`;

      // 6. Create users/{uid}
      const userDoc = {
        email: input.email.toLowerCase().trim(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: "partner",
        affiliateCode: normalizedCode,
        affiliateCodeProvider,
        createdAt: now,
        updatedAt: now,
      };

      // 7. Create partners/{uid}
      const partner: Partner = {
        id: uid,
        email: input.email.toLowerCase().trim(),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim(),
        country: input.country.toUpperCase(),
        language: input.language,

        websiteUrl: normalizedUrl,
        websiteName: input.websiteName.trim(),
        websiteDescription: input.websiteDescription?.trim(),
        websiteCategory: input.websiteCategory,
        websiteTraffic: input.websiteTraffic,

        status: "active",
        isVisible: false,

        affiliateCode: normalizedCode,
        affiliateCodeProvider,
        affiliateLink,

        commissionConfig: {
          commissionPerCallLawyer: input.commissionPerCallLawyer,
          commissionPerCallExpat: input.commissionPerCallExpat,
          usePercentage: input.usePercentage ?? false,
          commissionPercentage: input.commissionPercentage,
          holdPeriodDays: PARTNER_CONSTANTS.DEFAULT_HOLD_PERIOD_DAYS,
          releaseDelayHours: PARTNER_CONSTANTS.DEFAULT_RELEASE_DELAY_HOURS,
          minimumCallDuration: PARTNER_CONSTANTS.DEFAULT_MIN_CALL_DURATION,
        },

        // Discount for partner's community (configured by admin)
        ...(input.discountType && input.discountValue ? {
          discountConfig: {
            isActive: true,
            type: input.discountType,
            value: input.discountValue,
            maxDiscountCents: input.discountMaxCents,
            label: input.discountLabel,
            expiresAt: null,
          },
        } : {}),

        totalEarned: 0,
        availableBalance: 0,
        pendingBalance: 0,
        validatedBalance: 0,
        totalWithdrawn: 0,

        totalClicks: 0,
        totalClients: 0,
        totalCalls: 0,
        totalCommissions: 0,
        conversionRate: 0,
        currentMonthStats: {
          clicks: 0,
          clients: 0,
          calls: 0,
          earnings: 0,
          month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
        },

        preferredPaymentMethod: null,
        pendingWithdrawalId: null,

        contactName: input.contactName?.trim(),
        contactEmail: input.contactEmail?.trim(),
        companyName: input.companyName?.trim(),
        vatNumber: input.vatNumber?.trim(),

        contractStartDate: now,
        contractEndDate: null,
        contractNotes: input.contractNotes?.trim(),

        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
        createdBy: adminUid,

        termsAccepted: true,
        termsAcceptedAt: now.toDate().toISOString(),
        termsVersion: "1.0",
        termsType: "terms_partner",
        termsAffiliateVersion: "1.0",
        termsAffiliateType: "terms_affiliate",
      };

      // 8. Write to Firestore in a batch
      const batch = db.batch();
      batch.set(db.collection("users").doc(uid), userDoc);
      batch.set(db.collection("partners").doc(uid), partner);

      // Reserve affiliate codes (client + provider)
      batch.set(db.collection("affiliate_codes").doc(normalizedCode), {
        code: normalizedCode,
        userId: uid,
        userType: "partner",
        createdAt: now,
      });
      batch.set(db.collection("affiliate_codes").doc(affiliateCodeProvider), {
        code: affiliateCodeProvider,
        userId: uid,
        userType: "partner",
        codeType: "provider_recruitment",
        createdAt: now,
      });

      await batch.commit();

      // 9. Ensure partner_config/current exists
      const configDoc = await db.collection("partner_config").doc("current").get();
      if (!configDoc.exists) {
        await db.collection("partner_config").doc("current").set({
          ...DEFAULT_PARTNER_CONFIG,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 10. Send credentials if requested
      let resetLink: string | undefined;
      if (input.sendCredentials) {
        try {
          resetLink = await getAuth().generatePasswordResetLink(input.email.toLowerCase().trim());
          const { subject, html, text } = generateWelcomeEmail(
            "partner",
            input.firstName.trim(),
            input.language
          );
          await sendZoho(input.email.toLowerCase().trim(), subject, html, text);
        } catch (emailError) {
          logger.warn("[createPartner] Failed to send credentials email", {
            partnerId: uid,
            error: emailError instanceof Error ? emailError.message : String(emailError),
          });
          // Don't fail the creation if email fails
        }
      }

      // 11. Create welcome notification
      const notifRef = db.collection("partner_notifications").doc();
      await notifRef.set({
        id: notifRef.id,
        partnerId: uid,
        type: "system_announcement",
        title: "Welcome to the Partner Program!",
        titleTranslations: {
          fr: "Bienvenue dans le Programme Partenaire !",
          en: "Welcome to the Partner Program!",
          es: "Bienvenido al Programa de Socios!",
          de: "Willkommen im Partner-Programm!",
        },
        message: `Your partner account has been created. Your affiliate code is ${normalizedCode}.`,
        messageTranslations: {
          fr: `Votre compte partenaire a ete cree. Votre code affilie est ${normalizedCode}.`,
          en: `Your partner account has been created. Your affiliate code is ${normalizedCode}.`,
          es: `Su cuenta de socio ha sido creada. Su codigo de afiliado es ${normalizedCode}.`,
          de: `Ihr Partnerkonto wurde erstellt. Ihr Affiliate-Code ist ${normalizedCode}.`,
        },
        data: { affiliateCode: normalizedCode, affiliateCodeProvider, affiliateLink },
        isRead: false,
        createdAt: now,
      });

      logger.info("[createPartner] Partner created successfully", {
        partnerId: uid,
        affiliateCode: normalizedCode,
        affiliateCodeProvider,
        createdBy: adminUid,
      });

      return {
        success: true,
        partnerId: uid,
        affiliateCode: normalizedCode,
        affiliateCodeProvider,
        affiliateLink,
        ...(resetLink && { resetLink }),
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;

      logger.error("[createPartner] Error", { error });
      throw new HttpsError("internal", "Failed to create partner");
    }
  }
);
