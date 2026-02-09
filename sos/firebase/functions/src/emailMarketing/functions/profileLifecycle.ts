import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { MailwizzAPI } from "../utils/mailwizz";
import { logGA4Event } from "../utils/analytics";
import { getLanguageCode } from "../config";

/**
 * FUNCTION 8: Handle Profile Completion
 * Trigger: onUpdate on users/{userId} when profileCompleted changes to true
 */
export const handleProfileCompleted = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "europe-west3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;

    if (!before || !after) {
      return;
    }

    // Only process when profileCompleted changes from false/undefined to true
    if ((!before.profileCompleted || before.profileCompleted === false) && after.profileCompleted === true) {
      try {
        const mailwizz = new MailwizzAPI();

        // Update MailWizz subscriber
        await mailwizz.updateSubscriber(userId, {
          PROFILE_STATUS: "profile_complete",
        });

        // Stop welcome autoresponder sequence
        await mailwizz.stopAutoresponders(userId, "profile_completed");

        // Send profile completion email
        const lang = getLanguageCode(
          after.language || after.preferredLanguage || after.lang || "en"
        );
        try {
          await mailwizz.sendTransactional({
            to: after.email || userId,
            template: `TR_${after.role === "provider" ? "PRO" : "CLI"}_profile-completed_${lang}`,
            customFields: {
              FNAME: after.firstName || "",
            },
          });
        } catch (emailError) {
          console.error(`❌ Error sending profile completion email:`, emailError);
        }

        // Log GA4 event
        await logGA4Event("profile_completed", {
          user_id: userId,
          role: after.role || "client",
        });

        console.log(`✅ Profile completed for user: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error in handleProfileCompleted for ${userId}:`, error);
        await logGA4Event("profile_completion_error", {
          user_id: userId,
          error: error.message || "Unknown error",
        });
      }
    }
  }
);

/**
 * FUNCTION 11: Handle User Login
 * Trigger: onUpdate on users/{userId} when lastLoginAt is set for first time
 */
export const handleUserLogin = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "europe-west3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;

    if (!before || !after) {
      return;
    }

    // Detect first login: lastLoginAt didn't exist before but exists now
    const isFirstLogin = !before.lastLoginAt && after.lastLoginAt;

    if (isFirstLogin) {
      try {
        const mailwizz = new MailwizzAPI();

        // Update MailWizz LAST_LOGIN field
        const loginDate = after.lastLoginAt instanceof admin.firestore.Timestamp
          ? after.lastLoginAt.toDate().toISOString()
          : after.lastLoginAt?.toISOString?.() || new Date().toISOString();

        await mailwizz.updateSubscriber(userId, {
          LAST_LOGIN: loginDate,
        });

        // Stop welcome autoresponder sequence on first login
        await mailwizz.stopAutoresponders(userId, "first_login");

        // Log GA4 event
        await logGA4Event("user_first_login", {
          user_id: userId,
          role: after.role || "client",
        });

        console.log(`✅ First login detected for user: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error in handleUserLogin for ${userId}:`, error);
        await logGA4Event("user_login_error", {
          user_id: userId,
          error: error.message || "Unknown error",
        });
      }
    } else if (after.lastLoginAt) {
      // Update last login even if not first login
      try {
        const mailwizz = new MailwizzAPI();
        const loginDate = after.lastLoginAt instanceof admin.firestore.Timestamp
          ? after.lastLoginAt.toDate().toISOString()
          : after.lastLoginAt?.toISOString?.() || new Date().toISOString();

        await mailwizz.updateSubscriber(userId, {
          LAST_LOGIN: loginDate,
        });
      } catch (error) {
        console.error(`❌ Error updating last login:`, error);
      }
    }
  }
);

/**
 * FUNCTION 12: Handle Provider Online Status
 * Trigger: onUpdate on users/{userId} when onlineStatus or isOnline changes
 */
export const handleProviderOnlineStatus = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "europe-west3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;
    console.log(`🔍 [Debug] handleProviderOnlineStatus triggered for ${userId}`);

    if (!before || !after) {
      console.log(`⚠️ [Debug] Missing before/after data for ${userId}`);
      return;
    }

    // Only process for providers
    if (after.role !== "provider" && after.role !== "lawyer") {
      console.log(`ℹ️ [Debug] Skipping user ${userId} - Role is '${after.role}', expected 'provider' or 'lawyer'`);
      return;
    }

    const beforeOnline = before.isOnline || before.onlineStatus === true;
    const afterOnline = after.isOnline || after.onlineStatus === true;

    console.log(`🔍 [Debug] Status check for ${userId}: Before=${beforeOnline}, After=${afterOnline}`);

    // Only process when online status changes
    if (beforeOnline !== afterOnline) {
      try {
        const mailwizz = new MailwizzAPI();

        // Update MailWizz ONLINE_STATUS field
        await mailwizz.updateSubscriber(userId, {
          EMAIL: after.email,
          IS_ONLINE: afterOnline ? "online" : "offline",
          ONLINE_STATUS: afterOnline ? "online" : "offline",
        });

        // Stop autoresponders if user goes online (user is active now)
        if (afterOnline) {
          await mailwizz.stopAutoresponders(userId, "provider_went_online");
        }

        // Log GA4 event
        await logGA4Event("provider_online_status_changed", {
          user_id: userId,
          online_status: afterOnline ? "online" : "offline",
        });

        console.log(`✅ Provider online status updated: ${userId} (${afterOnline ? "online" : "offline"})`);
      } catch (error: any) {
        console.error(`❌ Error in handleProviderOnlineStatus for ${userId}:`, error);
      }
    }
  }
);

/**
 * FUNCTION 13: Handle KYC Verification
 * Trigger: onUpdate on users/{userId} when kycStatus changes to 'verified'
 */
export const handleKYCVerification = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "europe-west3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;

    if (!before || !after) {
      return;
    }

    // Only process when KYC status changes to 'verified'
    if (before.kycStatus !== "verified" && after.kycStatus === "verified") {
      try {
        const mailwizz = new MailwizzAPI();

        // Update MailWizz KYC_STATUS field
        await mailwizz.updateSubscriber(userId, {
          KYC_STATUS: "verified",
        });

        // Stop KYC reminder autoresponder
        await mailwizz.stopAutoresponders(userId, "kyc_verified");

        // Send verification confirmation email
        const lang = getLanguageCode(
          after.language || after.preferredLanguage || after.lang || "en"
        );
        try {
          await mailwizz.sendTransactional({
            to: after.email || userId,
            template: `TR_${after.role === "provider" ? "PRO" : "CLI"}_kyc-verified_${lang}`,
            customFields: {
              FNAME: after.firstName || "",
            },
          });
        } catch (emailError) {
          console.error(`❌ Error sending KYC verification email:`, emailError);
        }

        // Log GA4 event
        await logGA4Event("kyc_verified", {
          user_id: userId,
          role: after.role || "client",
        });

        console.log(`✅ KYC verified for user: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error in handleKYCVerification for ${userId}:`, error);
        await logGA4Event("kyc_verification_error", {
          user_id: userId,
          error: error.message || "Unknown error",
        });
      }
    }
  }
);

/**
 * FUNCTION 14: Handle PayPal Configuration
 * Trigger: onUpdate on users/{userId} when paypalEmail is set
 */
export const handlePayPalConfiguration = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "europe-west3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;

    if (!before || !after) {
      return;
    }

    // Only process when paypalEmail is set for the first time
    if (!before.paypalEmail && after.paypalEmail) {
      try {
        const mailwizz = new MailwizzAPI();

        // Update MailWizz PAYPAL_EMAIL field
        await mailwizz.updateSubscriber(userId, {
          PAYPAL_EMAIL: after.paypalEmail,
          PAYPAL_STATUS: "paypal_ok",
        });

        // Stop PayPal setup reminder autoresponder
        await mailwizz.stopAutoresponders(userId, "paypal_configured");

        // Send configuration confirmation email
        const lang = getLanguageCode(
          after.language || after.preferredLanguage || after.lang || "en"
        );
        try {
          await mailwizz.sendTransactional({
            to: after.email || userId,
            template: `TR_${after.role === "provider" ? "PRO" : "CLI"}_paypal-configured_${lang}`,
            customFields: {
              FNAME: after.firstName || "",
            },
          });
        } catch (emailError) {
          console.error(`❌ Error sending PayPal configuration email:`, emailError);
        }

        // Log GA4 event
        await logGA4Event("paypal_configured", {
          user_id: userId,
          role: after.role || "client",
        });

        console.log(`✅ PayPal configured for user: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error in handlePayPalConfiguration for ${userId}:`, error);
        await logGA4Event("paypal_configuration_error", {
          user_id: userId,
          error: error.message || "Unknown error",
        });
      }
    }
  }
);

