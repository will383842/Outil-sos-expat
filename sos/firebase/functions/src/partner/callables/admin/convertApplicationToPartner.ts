/**
 * Admin — Convert Application to Partner
 *
 * Verifies application status is "accepted", creates Firebase Auth user,
 * users/ doc, partners/ doc, and updates application with convertedToPartnerId.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { logger } from "firebase-functions/v2";
import { partnerAdminConfig } from "../../../lib/functionConfigs";
import { getPartnerConfig } from "../../services/partnerConfigService";
import {
  validateAffiliateCode,
  isAffiliateCodeTaken,
} from "../../utils/partnerValidation";
import { sendZoho } from "../../../notificationPipeline/providers/email/zohoSmtp";
import { generateWelcomeEmail } from "../../../email/welcomeTemplates";
import { EMAIL_SECRETS } from "../../../lib/secrets";
import type { Partner, PartnerApplication, PartnerCommissionConfig } from "../../types";
import { PARTNER_CONSTANTS } from "../../types";

interface ConvertApplicationInput {
  applicationId: string;
  affiliateCode: string;
  commissionPerCallLawyer: number;
  commissionPerCallExpat: number;
  usePercentage?: boolean;
  commissionPercentage?: number;
  holdPeriodDays?: number;
  releaseDelayHours?: number;
  minimumCallDuration?: number;
  contractNotes?: string;
  contactName?: string;
  contactEmail?: string;
  companyName?: string;
  vatNumber?: string;
  sendCredentials?: boolean;
}

export const adminConvertApplicationToPartner = onCall(
  { ...partnerAdminConfig, timeoutSeconds: 60, secrets: [...EMAIL_SECRETS] },
  async (request): Promise<{ success: boolean; partnerId: string }> => {
    if (request.auth?.token?.role !== "admin") {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();
    const adminId = request.auth!.uid;
    const input = request.data as ConvertApplicationInput;

    if (!input?.applicationId) {
      throw new HttpsError("invalid-argument", "applicationId is required");
    }
    if (!input.affiliateCode) {
      throw new HttpsError("invalid-argument", "affiliateCode is required");
    }
    if (typeof input.commissionPerCallLawyer !== "number" || input.commissionPerCallLawyer < 0) {
      throw new HttpsError("invalid-argument", "commissionPerCallLawyer must be a non-negative number");
    }
    if (typeof input.commissionPerCallExpat !== "number" || input.commissionPerCallExpat < 0) {
      throw new HttpsError("invalid-argument", "commissionPerCallExpat must be a non-negative number");
    }

    try {
      // 1. Verify application exists and is accepted
      const appRef = db.collection("partner_applications").doc(input.applicationId);
      const appDoc = await appRef.get();

      if (!appDoc.exists) {
        throw new HttpsError("not-found", "Application not found");
      }

      const application = appDoc.data() as PartnerApplication;

      if (application.status !== "accepted") {
        throw new HttpsError(
          "failed-precondition",
          `Application must be in "accepted" status. Current status: "${application.status}"`
        );
      }

      if (application.convertedToPartnerId) {
        throw new HttpsError(
          "already-exists",
          `Application already converted to partner: ${application.convertedToPartnerId}`
        );
      }

      // 2. Validate affiliate code
      const normalizedCode = input.affiliateCode.toUpperCase().trim();
      if (!validateAffiliateCode(normalizedCode)) {
        throw new HttpsError(
          "invalid-argument",
          "affiliateCode must be 3-20 alphanumeric characters (A-Z, 0-9)"
        );
      }

      const codeTaken = await isAffiliateCodeTaken(normalizedCode);
      if (codeTaken) {
        throw new HttpsError("already-exists", `Affiliate code "${normalizedCode}" is already taken`);
      }

      // 3. Check email uniqueness in partners collection
      const emailSnap = await db
        .collection("partners")
        .where("email", "==", application.email.toLowerCase().trim())
        .limit(1)
        .get();

      if (!emailSnap.empty) {
        throw new HttpsError("already-exists", `A partner with email "${application.email}" already exists`);
      }

      // 4. Create Firebase Auth user
      const displayName = `${application.firstName} ${application.lastName}`;
      const userRecord = await getAuth().createUser({
        email: application.email.toLowerCase().trim(),
        emailVerified: false,
        disabled: false,
        displayName,
      });
      const uid = userRecord.uid;

      // 5. Set custom claims
      await getAuth().setCustomUserClaims(uid, { role: "partner" });

      // 6. Get global config for defaults
      const globalConfig = await getPartnerConfig();

      // 7. Build commission config
      const commissionConfig: PartnerCommissionConfig = {
        commissionPerCallLawyer: input.commissionPerCallLawyer,
        commissionPerCallExpat: input.commissionPerCallExpat,
        usePercentage: input.usePercentage ?? false,
        commissionPercentage: input.commissionPercentage,
        holdPeriodDays: input.holdPeriodDays ?? globalConfig.defaultHoldPeriodDays,
        releaseDelayHours: input.releaseDelayHours ?? globalConfig.defaultReleaseDelayHours,
        minimumCallDuration: input.minimumCallDuration ?? globalConfig.defaultMinimumCallDuration,
      };

      // 8. Build docs
      const now = Timestamp.now();
      const normalizedUrl = application.websiteUrl.toLowerCase().trim().replace(/\/+$/, "");
      const affiliateLink = `${PARTNER_CONSTANTS.AFFILIATE_BASE_URL}?ref=${normalizedCode}`;

      const userDoc = {
        email: application.email.toLowerCase().trim(),
        firstName: application.firstName,
        lastName: application.lastName,
        role: "partner",
        affiliateCode: normalizedCode,
        createdAt: now,
        updatedAt: now,
      };

      const partner: Partner = {
        id: uid,
        email: application.email.toLowerCase().trim(),
        firstName: application.firstName,
        lastName: application.lastName,
        phone: application.phone || "",
        country: application.country,
        language: application.language,

        websiteUrl: normalizedUrl,
        websiteName: application.websiteName,
        websiteDescription: application.websiteDescription || "",
        websiteCategory: application.websiteCategory,
        websiteTraffic: application.websiteTraffic,

        status: "active",
        isVisible: false,

        affiliateCode: normalizedCode,
        affiliateLink,

        commissionConfig,

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

        contactName: input.contactName,
        contactEmail: input.contactEmail,
        companyName: input.companyName,
        vatNumber: input.vatNumber,
        contractNotes: input.contractNotes,

        contractStartDate: now,
        contractEndDate: null,

        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
        createdBy: adminId,

        termsAccepted: true,
        termsAcceptedAt: now.toDate().toISOString(),
        termsVersion: "1.0",
        termsType: "terms_partner",
        termsAffiliateVersion: "1.0",
        termsAffiliateType: "terms_affiliate",
      };

      // 9. Atomic batch: users/ + partners/ + affiliate_codes + update application
      const batch = db.batch();
      batch.set(db.collection("users").doc(uid), userDoc);
      batch.set(db.collection("partners").doc(uid), partner);
      batch.set(db.collection("affiliate_codes").doc(normalizedCode), {
        code: normalizedCode,
        userId: uid,
        userType: "partner",
        createdAt: now,
      });
      batch.update(appRef, {
        convertedToPartnerId: uid,
        updatedAt: now,
      });

      await batch.commit();

      // 10. Send credentials if requested
      if (input.sendCredentials !== false) {
        try {
          await getAuth().generatePasswordResetLink(application.email.toLowerCase().trim());
          const { subject, html, text } = generateWelcomeEmail(
            "partner",
            application.firstName,
            application.language
          );
          await sendZoho(application.email.toLowerCase().trim(), subject, html, text);
        } catch (emailError) {
          logger.warn("[adminConvertApplicationToPartner] Failed to send credentials email", {
            partnerId: uid,
            error: emailError instanceof Error ? emailError.message : String(emailError),
          });
        }
      }

      // 11. Audit log
      await db.collection("admin_audit_logs").add({
        action: "partner_application_converted",
        targetId: input.applicationId,
        targetType: "partner_application",
        performedBy: adminId,
        timestamp: now,
        details: {
          partnerId: uid,
          affiliateCode: normalizedCode,
          applicationEmail: application.email,
        },
      });

      logger.info("[adminConvertApplicationToPartner] Application converted", {
        applicationId: input.applicationId,
        partnerId: uid,
        affiliateCode: normalizedCode,
        adminId,
      });

      return { success: true, partnerId: uid };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminConvertApplicationToPartner] Error", { error });
      throw new HttpsError("internal", "Failed to convert application to partner");
    }
  }
);
