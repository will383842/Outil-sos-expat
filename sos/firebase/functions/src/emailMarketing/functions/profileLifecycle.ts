import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { MailwizzAPI } from "../utils/mailwizz";
import { logGA4Event } from "../utils/analytics";
import { getLanguageCode } from "../config";

/**
 * FUNCTION 8: Handle Profile Completion
 * Trigger: onUpdate on users/{userId} when profileCompleted changes to true
 */
export async function profileCompletedHandler(event: any) {
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

export const handleProfileCompleted = onDocumentUpdated(
  { document: "users/{userId}", region: "europe-west3", cpu: 0.083 },
  profileCompletedHandler
);

/**
 * FUNCTION 11: Handle User Login
 * Trigger: onUpdate on users/{userId} when lastLoginAt is set for first time
 */
export async function userLoginHandler(event: any) {
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

export const handleUserLogin = onDocumentUpdated(
  { document: "users/{userId}", region: "europe-west3", cpu: 0.083 },
  userLoginHandler
);

/**
 * FUNCTION 12: Handle Provider Online Status
 * Trigger: onUpdate on users/{userId} when onlineStatus or isOnline changes
 */
export async function providerOnlineStatusHandler(event: any) {
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

        const lang = getLanguageCode(
          after.language || after.preferredLanguage || after.lang || "en"
        );

        // First time ever going online (no prior record of being online)
        const isFirstOnline = afterOnline && !before.hasBeenOnline && !before.firstOnlineAt;
        if (isFirstOnline) {
          try {
            await mailwizz.sendTransactional({
              to: after.email || userId,
              template: `TR_PRO_first-online_${lang}`,
              customFields: {
                FNAME: after.firstName || "",
                DASHBOARD_URL: "https://sos-expat.com/dashboard",
              },
            });
            // Mark as having been online to prevent re-sending on future reconnects
            // Write doesn't trigger this block again: beforeOnline===afterOnline===true on next event
            await admin.firestore().collection("users").doc(userId).update({
              hasBeenOnline: true,
              firstOnlineAt: admin.firestore.FieldValue.serverTimestamp(),
            }).catch((e) => console.error(`❌ Error setting hasBeenOnline:`, e));
            console.log(`✅ First online email sent: ${userId}`);
          } catch (emailError) {
            console.error(`❌ Error sending first-online email:`, emailError);
          }
        } else if (afterOnline && !beforeOnline) {
          // Coming back online (not first time)
          try {
            await mailwizz.sendTransactional({
              to: after.email || userId,
              template: `TR_PRO_back-online_${lang}`,
              customFields: {
                FNAME: after.firstName || "",
                DASHBOARD_URL: "https://sos-expat.com/dashboard",
              },
            });
            console.log(`✅ Back online email sent: ${userId}`);
          } catch (emailError) {
            console.error(`❌ Error sending back-online email:`, emailError);
          }
        }

        console.log(`✅ Provider online status updated: ${userId} (${afterOnline ? "online" : "offline"})`);
      } catch (error: any) {
        console.error(`❌ Error in handleProviderOnlineStatus for ${userId}:`, error);
      }
    }
}

export const handleProviderOnlineStatus = onDocumentUpdated(
  { document: "users/{userId}", region: "europe-west3", cpu: 0.083 },
  providerOnlineStatusHandler
);

/**
 * FUNCTION 13: Handle KYC Verification
 * Trigger: onUpdate on users/{userId} when kycStatus changes to 'verified'
 */
export async function kycVerificationHandler(event: any) {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;

    if (!before || !after) {
      return;
    }

    const lang = getLanguageCode(
      after.language || after.preferredLanguage || after.lang || "en"
    );
    const rolePrefix = after.role === "provider" || after.role === "lawyer" ? "PRO" : "CLI";
    const kycUrl = `https://sos-expat.com/kyc/${userId}`;

    // KYC verified
    if (before.kycStatus !== "verified" && after.kycStatus === "verified") {
      try {
        const mailwizz = new MailwizzAPI();

        await mailwizz.updateSubscriber(userId, { KYC_STATUS: "verified" });
        await mailwizz.stopAutoresponders(userId, "kyc_verified");

        await mailwizz.sendTransactional({
          to: after.email || userId,
          template: `TR_${rolePrefix}_kyc-verified_${lang}`,
          customFields: { FNAME: after.firstName || "" },
        });

        await logGA4Event("kyc_verified", { user_id: userId, role: after.role || "client" });
        console.log(`✅ KYC verified for user: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error in kycVerificationHandler (verified) for ${userId}:`, error);
      }
    }

    // KYC submitted (documents received — awaiting review)
    if (before.kycStatus !== "kyc_submitted" && after.kycStatus === "kyc_submitted") {
      try {
        const mailwizz = new MailwizzAPI();

        await mailwizz.updateSubscriber(userId, { KYC_STATUS: "kyc_submitted" });

        // Email to provider: documents received
        await mailwizz.sendTransactional({
          to: after.email || userId,
          template: `TR_${rolePrefix}_kyc-documents-received_${lang}`,
          customFields: { FNAME: after.firstName || "" },
        }).catch((e) => console.error(`❌ kyc-documents-received email error:`, e));

        // Email to provider: KYC request / next steps
        await mailwizz.sendTransactional({
          to: after.email || userId,
          template: `TR_${rolePrefix}_kyc-request_${lang}`,
          customFields: {
            FNAME: after.firstName || "",
            KYC_URL: kycUrl,
          },
        }).catch((e) => console.error(`❌ kyc-request email error:`, e));

        await logGA4Event("kyc_submitted", { user_id: userId });
        console.log(`✅ KYC submitted emails sent: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error in kycVerificationHandler (submitted) for ${userId}:`, error);
      }
    }

    // KYC info missing
    if (before.kycStatus !== "kyc_info_missing" && after.kycStatus === "kyc_info_missing") {
      try {
        const mailwizz = new MailwizzAPI();

        await mailwizz.updateSubscriber(userId, { KYC_STATUS: "kyc_info_missing" });

        await mailwizz.sendTransactional({
          to: after.email || userId,
          template: `TR_${rolePrefix}_kyc-info-missing_${lang}`,
          customFields: {
            FNAME: after.firstName || "",
            KYC_URL: kycUrl,
          },
        });

        await logGA4Event("kyc_info_missing", { user_id: userId });
        console.log(`✅ KYC info missing email sent: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error in kycVerificationHandler (info_missing) for ${userId}:`, error);
      }
    }

    // KYC rejected
    if (before.kycStatus !== "kyc_rejected" && after.kycStatus === "kyc_rejected") {
      try {
        const mailwizz = new MailwizzAPI();

        await mailwizz.updateSubscriber(userId, { KYC_STATUS: "kyc_rejected" });

        await mailwizz.sendTransactional({
          to: after.email || userId,
          template: `TR_${rolePrefix}_kyc-rejected_${lang}`,
          customFields: {
            FNAME: after.firstName || "",
            KYC_URL: kycUrl,
            REASON: after.kycRejectionReason || after.rejectionReason || "",
          },
        });

        await logGA4Event("kyc_rejected", { user_id: userId });
        console.log(`✅ KYC rejected email sent: ${userId}`);
      } catch (error: any) {
        console.error(`❌ Error in kycVerificationHandler (rejected) for ${userId}:`, error);
      }
    }
}

export const handleKYCVerification = onDocumentUpdated(
  { document: "users/{userId}", region: "europe-west3", cpu: 0.083 },
  kycVerificationHandler
);

/**
 * FUNCTION 14: Handle PayPal Configuration
 * Trigger: onUpdate on users/{userId} when paypalEmail is set
 */
export async function paypalConfigurationHandler(event: any) {
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

export const handlePayPalConfiguration = onDocumentUpdated(
  { document: "users/{userId}", region: "europe-west3", cpu: 0.083 },
  paypalConfigurationHandler
);

/**
 * FUNCTION: Handle Account Status Changes (blocked / reactivated)
 * Trigger: onUpdate on users/{userId} when accountStatus changes
 */
export async function accountStatusHandler(event: any) {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const userId = event.params.userId;

  if (!before || !after) return;

  const lang = getLanguageCode(
    after.language || after.preferredLanguage || after.lang || "en"
  );

  const wasBlocked = before.accountStatus === "blocked" || before.isBanned || before.isBlocked;
  const isBlocked = after.accountStatus === "blocked" || after.isBanned || after.isBlocked;

  // Account blocked
  if (!wasBlocked && isBlocked) {
    try {
      const mailwizz = new MailwizzAPI();

      await mailwizz.updateSubscriber(userId, { ACCOUNT_STATUS: "blocked", IS_BLOCKED: "yes" });

      await mailwizz.sendTransactional({
        to: after.email || userId,
        template: `TR_PRO_account-blocked_${lang}`,
        customFields: {
          FNAME: after.firstName || "",
          SUPPORT_URL: "https://sos-expat.com/support",
          REASON: after.blockReason || after.banReason || "",
        },
      });

      await logGA4Event("account_blocked_email_sent", { user_id: userId });
      console.log(`✅ Account blocked email sent: ${userId}`);
    } catch (error: any) {
      console.error(`❌ Error in accountStatusHandler (blocked) for ${userId}:`, error);
    }
  }

  // Account reactivated (was blocked → now normal)
  if (wasBlocked && !isBlocked && after.accountStatus === "normal") {
    try {
      const mailwizz = new MailwizzAPI();

      await mailwizz.updateSubscriber(userId, { ACCOUNT_STATUS: "reactivated", IS_BLOCKED: "no" });

      await mailwizz.sendTransactional({
        to: after.email || userId,
        template: `TR_PRO_account-reactivated_${lang}`,
        customFields: {
          FNAME: after.firstName || "",
          DASHBOARD_URL: "https://sos-expat.com/dashboard",
        },
      });

      await logGA4Event("account_reactivated_email_sent", { user_id: userId });
      console.log(`✅ Account reactivated email sent: ${userId}`);
    } catch (error: any) {
      console.error(`❌ Error in accountStatusHandler (reactivated) for ${userId}:`, error);
    }
  }
}

export const handleAccountStatus = onDocumentUpdated(
  { document: "users/{userId}", region: "europe-west3", cpu: 0.083 },
  accountStatusHandler
);

