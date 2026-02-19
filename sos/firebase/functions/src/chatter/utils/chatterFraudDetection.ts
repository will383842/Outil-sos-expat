/**
 * Chatter Fraud Detection
 *
 * Detects and prevents fraudulent activities in the chatter system:
 * - Self-referrals
 * - Multiple accounts
 * - Suspicious patterns
 * - Click fraud
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import * as crypto from "crypto";

// Blocked email domains (disposable/temporary email services)
const BLOCKED_EMAIL_DOMAINS = [
  "tempmail.com",
  "throwaway.email",
  "guerrillamail.com",
  "10minutemail.com",
  "mailinator.com",
  "yopmail.com",
  "temp-mail.org",
  "fakeinbox.com",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
  "dispostable.com",
  "mailnesia.com",
  "tempr.email",
];

export interface FraudCheckResult {
  passed: boolean;
  flags: string[];
  severity: "low" | "medium" | "high" | "critical";
  shouldBlock: boolean;
  details: Record<string, unknown>;
}

/**
 * Hash an IP address for privacy-preserving storage
 */
export function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * Check if email domain is blocked
 */
export function isEmailDomainBlocked(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return true;
  return BLOCKED_EMAIL_DOMAINS.includes(domain);
}

/**
 * Comprehensive fraud check for new chatter registration
 */
export async function checkChatterRegistrationFraud(
  email: string,
  ip: string,
  recruitmentCode?: string
): Promise<FraudCheckResult> {
  const db = getFirestore();
  const flags: string[] = [];
  let severity: "low" | "medium" | "high" | "critical" = "low";

  // 1. Check email domain
  if (isEmailDomainBlocked(email)) {
    flags.push("blocked_email_domain");
    severity = "high";
  }

  // 2. Check for duplicate IP in recent registrations
  const ipHash = hashIP(ip);
  const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

  const recentRegistrationsQuery = await db
    .collection("chatter_affiliate_clicks")
    .where("ipHash", "==", ipHash)
    .where("converted", "==", true)
    .where("clickedAt", ">=", oneDayAgo)
    .get();

  if (recentRegistrationsQuery.size > 2) {
    flags.push("multiple_registrations_same_ip");
    severity = severity === "low" ? "medium" : severity;
  }

  // 3. Check for self-referral attempt
  if (recruitmentCode) {
    const chatterQuery = await db
      .collection("chatters")
      .where("affiliateCodeRecruitment", "==", recruitmentCode.toUpperCase())
      .limit(1)
      .get();

    if (!chatterQuery.empty) {
      const chatter = chatterQuery.docs[0].data();
      if (chatter.email.toLowerCase() === email.toLowerCase()) {
        flags.push("self_referral_attempt");
        severity = "critical";
      }
    }
  }

  // 4. Check for existing account with same email
  const existingChatter = await db
    .collection("chatters")
    .where("email", "==", email.toLowerCase())
    .limit(1)
    .get();

  if (!existingChatter.empty) {
    flags.push("duplicate_email");
    severity = "high";
  }

  const result: FraudCheckResult = {
    passed: flags.length === 0,
    flags,
    severity,
    shouldBlock: severity === "high" || severity === "critical",
    details: {
      emailDomain: email.split("@")[1],
      ipHash,
      recentSameIPRegistrations: recentRegistrationsQuery.size,
    },
  };

  if (!result.passed) {
    logger.warn("[checkChatterRegistrationFraud] Fraud flags detected", {
      email,
      flags,
      severity,
    });
  }

  return result;
}

/**
 * Check for commission fraud patterns
 */
export async function checkCommissionFraud(
  chatterId: string,
  clientId: string,
  clientEmail: string,
  ip?: string
): Promise<FraudCheckResult> {
  const db = getFirestore();
  const flags: string[] = [];
  let severity: "low" | "medium" | "high" | "critical" = "low";

  // 1. Get chatter data
  const chatterDoc = await db.collection("chatters").doc(chatterId).get();
  if (!chatterDoc.exists) {
    return {
      passed: false,
      flags: ["chatter_not_found"],
      severity: "critical",
      shouldBlock: true,
      details: {},
    };
  }

  const chatter = chatterDoc.data()!;

  // 2. Check for same email domain pattern
  const chatterDomain = chatter.email.split("@")[1];
  const clientDomain = clientEmail.split("@")[1];

  if (chatterDomain === clientDomain) {
    flags.push("same_email_domain");
    severity = "medium";
  }

  // 3. Check for rapid commission generation
  const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

  const recentCommissionsQuery = await db
    .collection("chatter_commissions")
    .where("chatterId", "==", chatterId)
    .where("type", "==", "client_referral")
    .where("createdAt", ">=", oneHourAgo)
    .get();

  if (recentCommissionsQuery.size > 10) {
    flags.push("rapid_commission_generation");
    severity = severity === "low" ? "medium" : severity;
  }

  // 4. Check for same IP if available
  if (ip) {
    const ipHash = hashIP(ip);
    const chatterIpDoc = await db
      .collection("chatter_affiliate_clicks")
      .where("chatterId", "==", chatterId)
      .where("ipHash", "==", ipHash)
      .where("converted", "==", false)
      .limit(1)
      .get();

    if (!chatterIpDoc.empty) {
      flags.push("same_ip_as_chatter_click");
      severity = "high";
    }
  }

  // 5. Check for patterns in client emails
  const commissionsWithSimilarEmails = await db
    .collection("chatter_commissions")
    .where("chatterId", "==", chatterId)
    .where("type", "==", "client_referral")
    .limit(50)
    .get();

  const emailPrefixes = new Set<string>();
  commissionsWithSimilarEmails.docs.forEach((doc) => {
    const email = doc.data().sourceDetails?.clientEmail;
    if (email) {
      const prefix = email.split("@")[0].replace(/\d+$/, ""); // Remove trailing numbers
      emailPrefixes.add(prefix);
    }
  });

  // If many emails have same prefix pattern, flag it
  const clientPrefix = clientEmail.split("@")[0].replace(/\d+$/, "");
  const matchingPrefixes = Array.from(emailPrefixes).filter((p) =>
    p.includes(clientPrefix) || clientPrefix.includes(p)
  );

  if (matchingPrefixes.length > 3) {
    flags.push("similar_email_pattern");
    severity = severity === "low" ? "medium" : severity;
  }

  const result: FraudCheckResult = {
    passed: flags.length === 0,
    flags,
    severity,
    shouldBlock: severity === "high",
    details: {
      chatterEmail: chatter.email,
      clientEmail,
      recentCommissionsCount: recentCommissionsQuery.size,
    },
  };

  if (!result.passed) {
    logger.warn("[checkCommissionFraud] Fraud flags detected", {
      chatterId,
      clientId,
      flags,
      severity,
    });

    // Record fraud alert for review
    if (severity !== "low") {
      await recordFraudAlert(chatterId, chatter.email, flags, severity, result.details);
    }
  }

  return result;
}

/**
 * Record a fraud alert for admin review
 * Writes to both the chatter-specific and centralized fraud_alerts collections
 */
async function recordFraudAlert(
  chatterId: string,
  chatterEmail: string,
  flags: string[],
  severity: "low" | "medium" | "high" | "critical",
  details: Record<string, unknown>
): Promise<void> {
  const db = getFirestore();

  try {
    // Write to chatter-specific collection
    await db.collection("chatter_fraud_alerts").add({
      chatterId,
      chatterEmail,
      flags,
      severity,
      details,
      status: "pending",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Also write to centralized fraud_alerts collection for cross-system visibility
    const centralAlertRef = db.collection("fraud_alerts").doc();
    await centralAlertRef.set({
      id: centralAlertRef.id,
      userId: chatterId,
      email: chatterEmail,
      source: "chatter_commission",
      flags,
      severity,
      details,
      status: "pending",
      resolvedBy: null,
      resolvedAt: null,
      resolution: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    logger.warn("[recordFraudAlert] Fraud alert recorded", {
      centralAlertId: centralAlertRef.id,
      chatterId,
      flags,
      severity,
    });
  } catch (error) {
    logger.error("[recordFraudAlert] Failed to record alert", {
      chatterId,
      error,
    });
  }
}

/**
 * Check if chatter should be auto-suspended based on fraud patterns
 */
export async function checkAutoSuspension(chatterId: string): Promise<{
  shouldSuspend: boolean;
  reason: string | null;
}> {
  const db = getFirestore();

  // Count recent fraud alerts
  const oneWeekAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentAlertsQuery = await db
    .collection("chatter_fraud_alerts")
    .where("chatterId", "==", chatterId)
    .where("createdAt", ">=", oneWeekAgo)
    .get();

  const highSeverityCount = recentAlertsQuery.docs.filter(
    (doc) => doc.data().severity === "high" || doc.data().severity === "critical"
  ).length;

  if (highSeverityCount >= 3) {
    return {
      shouldSuspend: true,
      reason: `Multiple high-severity fraud alerts (${highSeverityCount}) in the past week`,
    };
  }

  if (recentAlertsQuery.size >= 10) {
    return {
      shouldSuspend: true,
      reason: `Excessive fraud alerts (${recentAlertsQuery.size}) in the past week`,
    };
  }

  return {
    shouldSuspend: false,
    reason: null,
  };
}

/**
 * Rate limit click tracking to prevent abuse
 */
export async function checkClickRateLimit(
  chatterId: string,
  ipHash: string
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const db = getFirestore();
  const oneMinuteAgo = Timestamp.fromMillis(Date.now() - 60 * 1000);

  // Check clicks from same IP in last minute
  const recentClicksQuery = await db
    .collection("chatter_affiliate_clicks")
    .where("ipHash", "==", ipHash)
    .where("clickedAt", ">=", oneMinuteAgo)
    .get();

  if (recentClicksQuery.size >= 10) {
    return {
      allowed: false,
      reason: "Too many clicks from same IP",
    };
  }

  // Check total clicks for chatter in last minute
  const chatterClicksQuery = await db
    .collection("chatter_affiliate_clicks")
    .where("chatterId", "==", chatterId)
    .where("clickedAt", ">=", oneMinuteAgo)
    .get();

  if (chatterClicksQuery.size >= 50) {
    return {
      allowed: false,
      reason: "Chatter click rate exceeded",
    };
  }

  return { allowed: true };
}
