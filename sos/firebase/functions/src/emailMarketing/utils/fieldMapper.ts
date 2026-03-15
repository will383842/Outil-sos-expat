import * as admin from "firebase-admin";
import { generateUnsubscribeToken } from "../../notificationPipeline/providers/email/zohoSmtp";
import { EMAIL_PASS } from "../../lib/secrets";
// import { getLanguageCode } from "../config";

const UNSUBSCRIBE_FUNCTION_URL =
  "https://europe-west1-sos-urgently-ac307.cloudfunctions.net/emailUnsubscribe";

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

  // URLs (10)
  fields.AFFILIATE_LINK = `https://sos-expat.com/ref/${userId}`;
  fields.PROFILE_URL = `https://sos-expat.com/profile/edit`;
  fields.DASHBOARD_URL = "https://sos-expat.com/dashboard";
  fields.TRUSTPILOT_URL = "https://www.trustpilot.com/review/sos-expat.com";
  fields.HELP_URL = "https://sos-expat.com/centre-aide";
  fields.ARTICLE_URL = "https://sos-expat.com/centre-aide";
  fields.KYC_URL = "https://sos-expat.com/dashboard/kyc";
  fields.INVOICE_URL = "https://sos-expat.com/dashboard";
  fields.RETRY_URL = "https://sos-expat.com/dashboard";
  // Unsubscribe URL (HMAC-signed token for RFC 8058 compliance)
  try {
    const email = userData.email || "";
    if (email) {
      const secret = EMAIL_PASS.value();
      const token = generateUnsubscribeToken(email, secret);
      fields.UNSUBSCRIBE_URL = `${UNSUBSCRIBE_FUNCTION_URL}?token=${encodeURIComponent(token)}&lang=${(userData.language || "en").toLowerCase()}`;
    } else {
      fields.UNSUBSCRIBE_URL = "https://sos-expat.com/contact";
    }
  } catch {
    // Secret not available (emulator/dev) — fallback
    fields.UNSUBSCRIBE_URL = "https://sos-expat.com/contact";
  }

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
  fields.STARS = fields.RATING_STARS; // alias used in some provider templates
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
  fields.SUPPORT_URL = "https://sos-expat.com/contact";

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

  // Commission referral (used in client & provider templates) — stored in cents
  fields.COMMISSION_REFERRAL = formatUsd(userData.commissionReferral || userData.referralCommission || 500);

  // Average earning per call (provider campaigns)
  const totalCalls = userData.totalCalls || 0;
  const totalEarnings = userData.totalEarnings || 0;
  fields.AVG_EARNING_PER_CALL = totalCalls > 0
    ? `$${(totalEarnings / totalCalls / 100).toFixed(2)}`
    : "$0";

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

/**
 * Map chatter document to MailWizz custom fields for transactional emails.
 * These fields correspond to [VARIABLE] placeholders in chatter email templates.
 */
export function mapChatterToMailWizzFields(
  chatterData: admin.firestore.DocumentData,
  chatterId: string
): Record<string, string> {
  const fields: Record<string, string> = {
    EMAIL: chatterData.email || "",
    FNAME: chatterData.firstName || chatterData.name?.split(" ")[0] || "",
    LNAME: chatterData.lastName || chatterData.name?.split(" ").slice(1).join(" ") || "",
  };

  // Chatter affiliate link — LINK is the primary, AFFILIATE_LINK is an alias for shared templates
  fields.LINK = chatterData.affiliateLink || `https://sos-expat.com/ref/${chatterId}`;
  fields.AFFILIATE_LINK = fields.LINK; // alias so viral block works with both [LINK] and [AFFILIATE_LINK]
  fields.DASHBOARD_URL = "https://sos-expat.com/chatter/tableau-de-bord";
  fields.QR_CODE_URL = chatterData.qrCodeUrl || chatterData.affiliateLink || `https://sos-expat.com/ref/${chatterId}`;

  // Commission rates (from lockedRates or plan defaults) — always in USD
  const rates = chatterData.lockedRates || chatterData.commissionRates || {};
  fields.COMMISSION_CLIENT_LAWYER = formatUsd(rates.commissionClientLawyer || rates.client_lawyer || 1000);
  fields.COMMISSION_CLIENT_EXPAT = formatUsd(rates.commissionClientExpat || rates.client_expat || 300);
  fields.COMMISSION_N1 = formatUsd(rates.commissionN1 || rates.n1_call || 100);
  fields.COMMISSION_N2 = formatUsd(rates.commissionN2 || rates.n2_call || 50);
  fields.COMMISSION_PROVIDER = formatUsd(rates.commissionProvider || rates.provider_call || 500);

  // Balances & earnings (stored in cents)
  fields.AVAILABLE_BALANCE = formatUsd(chatterData.availableBalance || 0);
  fields.TOTAL_EARNED = formatUsd(chatterData.totalEarned || 0);
  fields.MONTHLY_EARNINGS = formatUsd(chatterData.monthlyEarnings || 0);

  // Team & ranking
  fields.TEAM_SIZE = (chatterData.teamSize || chatterData.totalRecruits || 0).toString();
  fields.RANK = (chatterData.rank || chatterData.leaderboardPosition || "-").toString();
  fields.LEVEL_NAME = chatterData.levelName || chatterData.tier || "Starter";
  fields.CURRENT_STREAK = (chatterData.currentStreak || chatterData.streak || 0).toString();

  // Last commission (populated per-event)
  fields.LAST_COMMISSION_AMOUNT = "";
  fields.LAST_COMMISSION_TYPE = "";

  // Recruit info (populated per-event)
  fields.NEW_RECRUIT_NAME = "";

  // Withdrawal info (populated per-event)
  fields.WITHDRAWAL_AMOUNT = "";
  fields.WITHDRAWAL_FEE = "$3";
  fields.WITHDRAWAL_THRESHOLD = "$30";

  // Registration info
  const createdAt = chatterData.createdAt?.toDate?.() ||
    (chatterData.createdAt instanceof admin.firestore.Timestamp ? chatterData.createdAt.toDate() : null);
  const daysSinceReg = createdAt
    ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  fields.DAYS_SINCE_REGISTRATION = daysSinceReg.toString();

  // Calculated fields for campaign templates
  const totalEarnedCents = chatterData.totalEarned || 0;
  fields.AVG_EARNINGS_PER_DAY = daysSinceReg > 0
    ? formatUsd(Math.round(totalEarnedCents / daysSinceReg))
    : "$0";

  // Projected earnings based on recruit count
  const avgCommPerRecruit = (chatterData.avgCommissionPerRecruit || 500); // cents/month
  fields.PROJECTED_3_RECRUITS = formatUsd(avgCommPerRecruit * 3);
  fields.PROJECTED_10_RECRUITS = formatUsd(avgCommPerRecruit * 10);

  // Inactive recruit info (populated per-event in campaigns)
  fields.INACTIVE_RECRUIT_NAME = "";
  fields.INACTIVE_RECRUIT_DAYS = "";

  // Unsubscribe URL (HMAC-signed token for RFC 8058 compliance)
  try {
    const email = chatterData.email || "";
    if (email) {
      const secret = EMAIL_PASS.value();
      const token = generateUnsubscribeToken(email, secret);
      fields.UNSUBSCRIBE_URL = `${UNSUBSCRIBE_FUNCTION_URL}?token=${encodeURIComponent(token)}&lang=${(chatterData.language || "en").toLowerCase()}`;
    } else {
      fields.UNSUBSCRIBE_URL = "https://sos-expat.com/contact";
    }
  } catch {
    fields.UNSUBSCRIBE_URL = "https://sos-expat.com/contact";
  }

  return fields;
}

/**
 * Format cents amount to USD string (e.g. 1000 → "$10")
 */
function formatUsd(cents: number): string {
  if (!cents || cents === 0) return "$0";
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
