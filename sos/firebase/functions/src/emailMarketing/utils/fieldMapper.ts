import * as admin from "firebase-admin";
// import { getLanguageCode } from "../config";

/**
 * Map Firebase user document to MailWizz custom fields format
 * Handles all 61 custom fields as specified in the documentation
 */
export function mapUserToMailWizzFields(
  userData: admin.firestore.DocumentData,
  userId: string
): Record<string, string> {
  // Base fields
  // Note: MailWizz API requires field names in UPPERCASE (EMAIL, FNAME, LNAME, etc.)
  const fields: Record<string, string> = {
    EMAIL: userData.email || "", // Required: UPPERCASE field name
    FNAME: userData.firstName || userData.name?.split(" ")[0] || "",
    LNAME: userData.lastName || userData.name?.split(" ").slice(1).join(" ") || "",
  };

  // User information fields (20)
  fields.ROLE = mapRole(userData.role);
  fields.PAYMENT_METHOD = userData.paymentMethod || "stripe";
  fields.ACTIVITY_STATUS = mapActivityStatus(userData);
  fields.KYC_STATUS = mapKycStatus(userData.kycStatus);
  fields.PAYPAL_STATUS = userData.paypalStatus || userData.paypalEmail ? "paypal_ok" : "paypal_pending";
  fields.IS_ONLINE = userData.isOnline ? "online" : "offline";
  fields.ACCOUNT_STATUS = mapAccountStatus(userData);
  fields.LANGUAGE = (userData.language || userData.preferredLanguage || userData.lang || "en").toLowerCase();
  fields.PROFILE_STATUS = userData.profileCompleted ? "profile_complete" : "profile_incomplete";
  fields.VIP_STATUS = userData.vipStatus || userData.isVip ? "vip" : "no";
  fields.IS_BLOCKED = userData.isBanned || userData.isBlocked ? "yes" : "no";
  fields.PAYMENT_TYPE = userData.paymentMethod || "stripe";
  fields.PROVIDER_TYPE = userData.role === "lawyer" ? "lawyer" : userData.role === "expat" ? "expat" : "";
  fields.PHONE = userData.phone || userData.phoneNumber || "";
  fields.COUNTRY = userData.country || userData.currentCountry || userData.currentPresenceCountry || "";
  fields.ROLE_NAME = userData.role || "client";
  
  // Profile completion percentage (estimated)
  const completionFields = [
    userData.firstName, userData.lastName, userData.email,
    userData.bio, userData.profilePhoto, userData.country
  ];
  const completedFields = completionFields.filter(Boolean).length;
  fields.PROFILE_COMPLETION = `${Math.round((completedFields / completionFields.length) * 100)}%`;
  
  // Dates
  fields.CREATED_AT = userData.createdAt?.toDate?.()?.toISOString() || 
                      (userData.createdAt instanceof admin.firestore.Timestamp ? userData.createdAt.toDate().toISOString() : "") ||
                      new Date().toISOString();
  
  fields.LAST_LOGIN = userData.lastLoginAt?.toDate?.()?.toISOString() || 
                      (userData.lastLoginAt instanceof admin.firestore.Timestamp ? userData.lastLoginAt.toDate().toISOString() : "") ||
                      "";
  
  fields.LAST_ACTIVITY = userData.lastActivityAt?.toDate?.()?.toISOString() || 
                         (userData.lastActivityAt instanceof admin.firestore.Timestamp ? userData.lastActivityAt.toDate().toISOString() : "") ||
                         fields.CREATED_AT;

  // URLs (9)
  fields.AFFILIATE_LINK = `https://sos-expat.com/ref/${userId}`;
  fields.PROFILE_URL = `https://sos-expat.com/profile/${userId}`;
  fields.DASHBOARD_URL = "https://sos-expat.com/dashboard";
  fields.TRUSTPILOT_URL = "https://www.trustpilot.com/review/sos-expat.com";
  fields.HELP_URL = "https://sos-expat.com/help";
  fields.ARTICLE_URL = "https://sos-expat.com/articles";
  fields.KYC_URL = `https://sos-expat.com/kyc/${userId}`;
  fields.INVOICE_URL = `https://sos-expat.com/invoices/${userId}`;
  fields.RETRY_URL = "https://sos-expat.com/billing/retry";

  // Statistics (10)
  fields.TOTAL_CALLS = (userData.totalCalls || 0).toString();
  fields.TOTAL_EARNINGS = (userData.totalEarnings || 0).toString();
  fields.AVG_RATING = (userData.averageRating || userData.rating || 0).toString();
  fields.MISSED_CALLS = (userData.missedCalls || 0).toString();
  fields.WEEKLY_CALLS = (userData.weeklyCalls || 0).toString();
  fields.WEEKLY_EARNINGS = (userData.weeklyEarnings || 0).toString();
  fields.MONTHLY_CALLS = (userData.monthlyCalls || 0).toString();
  fields.MONTHLY_EARNINGS = (userData.monthlyEarnings || 0).toString();
  fields.RATING_STARS = (userData.averageRating || userData.rating || 0).toString();
  fields.THRESHOLD = (userData.payoutThreshold || 50).toString();

  // Dynamic content fields (14) - These are usually populated per-email
  // Initialized with empty strings, will be filled when sending emails
  fields.EXPERT_NAME = "";
  fields.CLIENT_NAME = userData.firstName || "";
  fields.AMOUNT = "0";
  fields.DURATION = "0";
  fields.RATING = "";
  fields.COMMENT = "";
  fields.REASON = "";
  fields.SERVICE = "";
  fields.CATEGORY = "";
  fields.CURRENCY = "EUR";
  fields.REVIEW_TEXT = "";
  fields.YEARS = (userData.yearsOfExperience || userData.yearsAsExpat || 0).toString();
  fields.STRIPE_ACCOUNT_ID = userData.stripeAccountId || "";
  fields.PAYPAL_EMAIL = userData.paypalEmail || "";

  // Stats supplémentaires (6)
  fields.TOTAL_CLIENTS = (userData.totalClients || 0).toString();
  fields.ONLINE_HOURS = (userData.onlineHours || userData.monthlyOnlineHours || 0).toString();
  fields.CALLS_TREND = userData.callsTrend || userData.callsTrendPercent || "0%";
  fields.EARNINGS_TREND = userData.earningsTrend || userData.earningsTrendPercent || "0%";
  fields.AVG_DURATION = (userData.avgCallDuration || userData.averageCallDuration || 0).toString();
  fields.NB_CALLS = (userData.totalCalls || 0).toString(); // alias TOTAL_CALLS
  fields.MONTH = new Date().toLocaleString("en", { month: "long" });

  // URLs supplémentaires (1)
  fields.SUPPORT_URL = "https://sos-expat.com/support";

  // Gamification (5)
  fields.MILESTONE_TYPE = "";
  fields.MILESTONE_VALUE = "";
  fields.BADGE_NAME = "";
  fields.BADGE_ICON = userData.lastBadgeIcon || "";
  fields.BADGE_DESCRIPTION = userData.lastBadgeDescription || "";

  // Referral (2)
  fields.REFERRAL_NAME = "";
  fields.BONUS_AMOUNT = "";

  // Potentiel
  fields.POTENTIAL_EARNINGS = (userData.potentialEarnings || 0).toString();

  // Remove empty fields that shouldn't be sent
  const cleanedFields: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    cleanedFields[key] = value || "";
  }

  return cleanedFields;
}

/**
 * Map Firebase role to MailWizz role format
 */
function mapRole(role?: string): string {
  if (!role) return "client";
  const normalized = role.toLowerCase();
  if (normalized === "lawyer" || normalized === "expat") {
    return normalized;
  }
  return "client";
}

/**
 * Map Firebase activity status to MailWizz format
 */
function mapActivityStatus(userData: any): string {
  if (userData.activityStatus) {
    return userData.activityStatus;
  }
  if (!userData.lastLoginAt && !userData.lastActivityAt) {
    return "never_connected";
  }
  // Check if inactive (30 days)
  const lastActivity = userData.lastActivityAt?.toDate?.() || 
                       (userData.lastActivityAt instanceof admin.firestore.Timestamp ? userData.lastActivityAt.toDate() : null) ||
                       userData.lastLoginAt?.toDate?.() ||
                       (userData.lastLoginAt instanceof admin.firestore.Timestamp ? userData.lastLoginAt.toDate() : null);
  
  if (lastActivity) {
    const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity > 30) {
      return "inactive";
    }
  }
  
  return userData.isActive !== false ? "active" : "inactive";
}

/**
 * Map Firebase KYC status to MailWizz format
 */
function mapKycStatus(kycStatus?: string): string {
  if (!kycStatus) return "kyc_pending";
  const normalized = kycStatus.toLowerCase();
  
  if (normalized.includes("verified") || normalized === "verified") {
    return "kyc_verified";
  }
  if (normalized.includes("rejected") || normalized === "rejected") {
    return "kyc_rejected";
  }
  if (normalized.includes("submitted") || normalized === "submitted" || normalized.includes("review")) {
    return "kyc_submitted";
  }
  
  return "kyc_pending";
}

/**
 * Map Firebase account status to MailWizz format
 */
function mapAccountStatus(userData: any): string {
  if (userData.isBanned || userData.isBlocked) {
    return "blocked";
  }
  if (userData.reactivated || userData.accountStatus === "reactivated") {
    return "reactivated";
  }
  return "normal";
}


