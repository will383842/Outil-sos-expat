/**
 * Affiliate Fraud Detection
 *
 * Detects suspicious patterns in affiliate referrals:
 * - Same IP registrations
 * - Rapid signup patterns
 * - Disposable email domains
 * - Device fingerprint matching
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { AntiFraudSettings, AffiliateFraudAlert } from "../types";

/**
 * Fraud check result
 */
export interface FraudCheckResult {
  /** Whether the action is allowed */
  allowed: boolean;

  /** Risk score (0-100) */
  riskScore: number;

  /** Detected issues */
  issues: FraudIssue[];

  /** Should this trigger an alert */
  shouldAlert: boolean;

  /** Reason for blocking (if blocked) */
  blockReason?: string;
}

/**
 * Individual fraud issue
 */
export interface FraudIssue {
  type:
    | "same_ip"
    | "rapid_signups"
    | "disposable_email"
    | "suspicious_pattern"
    | "device_fingerprint"
    | "rate_limit";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  data?: Record<string, unknown>;
}

/**
 * Default anti-fraud settings
 */
const DEFAULT_SETTINGS: AntiFraudSettings = {
  requireEmailVerification: true,
  minAccountAgeDays: 0,
  maxReferralsPerDay: 50,
  blockSameIPReferrals: true,
  blockedEmailDomains: [
    "tempmail.com",
    "throwaway.email",
    "guerrillamail.com",
    "10minutemail.com",
    "mailinator.com",
    "yopmail.com",
    "fakeinbox.com",
    "trashmail.com",
  ],
  maxSignupsPerIPPerHour: 10,
  autoFlagThreshold: 5,
};

/**
 * Run fraud checks on a referral
 */
export async function checkReferralFraud(
  affiliateId: string,
  refereeEmail: string,
  refereeIp: string | null,
  deviceFingerprint: string | null,
  settings?: Partial<AntiFraudSettings>
): Promise<FraudCheckResult> {
  const config: AntiFraudSettings = { ...DEFAULT_SETTINGS, ...settings };
  const issues: FraudIssue[] = [];
  let riskScore = 0;

  try {
    const db = getFirestore();
    const now = Timestamp.now();

    // 1. Check disposable email domain
    const emailDomain = refereeEmail.split("@")[1]?.toLowerCase();
    if (emailDomain && config.blockedEmailDomains.includes(emailDomain)) {
      issues.push({
        type: "disposable_email",
        severity: "high",
        description: `Disposable email domain detected: ${emailDomain}`,
        data: { domain: emailDomain },
      });
      riskScore += 40;
    }

    // 2. Check for common disposable email patterns
    if (emailDomain && isLikelyDisposableEmail(emailDomain)) {
      issues.push({
        type: "disposable_email",
        severity: "medium",
        description: `Suspicious email domain pattern: ${emailDomain}`,
        data: { domain: emailDomain },
      });
      riskScore += 20;
    }

    // 3. Check same IP referrals
    if (refereeIp && config.blockSameIPReferrals) {
      // Get affiliate's known IPs
      const affiliateDoc = await db.collection("users").doc(affiliateId).get();
      const affiliateData = affiliateDoc.data();

      if (affiliateData?.lastKnownIPs?.includes(refereeIp)) {
        issues.push({
          type: "same_ip",
          severity: "high",
          description: "Referral from same IP as affiliate",
          data: { ip: maskIP(refereeIp) },
        });
        riskScore += 50;
      }

      // Check recent referrals from same IP
      const oneHourAgo = new Date(now.toMillis() - 60 * 60 * 1000);
      const recentFromIP = await db
        .collection("users")
        .where("referredByUserId", "==", affiliateId)
        .where("createdAt", ">=", Timestamp.fromDate(oneHourAgo))
        .get();

      const sameIPCount = recentFromIP.docs.filter(
        (doc) => doc.data().signupIP === refereeIp
      ).length;

      if (sameIPCount >= config.maxSignupsPerIPPerHour) {
        issues.push({
          type: "rate_limit",
          severity: "critical",
          description: `Too many signups from same IP (${sameIPCount} in 1 hour)`,
          data: { count: sameIPCount, limit: config.maxSignupsPerIPPerHour },
        });
        riskScore += 60;
      }
    }

    // 4. Check rapid signup pattern
    const oneDayAgo = new Date(now.toMillis() - 24 * 60 * 60 * 1000);
    const recentReferrals = await db
      .collection("users")
      .where("referredByUserId", "==", affiliateId)
      .where("createdAt", ">=", Timestamp.fromDate(oneDayAgo))
      .get();

    if (recentReferrals.size >= config.maxReferralsPerDay) {
      issues.push({
        type: "rapid_signups",
        severity: "high",
        description: `Too many referrals today (${recentReferrals.size} of ${config.maxReferralsPerDay} max)`,
        data: { count: recentReferrals.size, limit: config.maxReferralsPerDay },
      });
      riskScore += 30;
    }

    // 5. Check device fingerprint (if available)
    if (deviceFingerprint) {
      const sameFingerprint = recentReferrals.docs.filter(
        (doc) => doc.data().deviceFingerprint === deviceFingerprint
      );

      if (sameFingerprint.length >= 2) {
        issues.push({
          type: "device_fingerprint",
          severity: "high",
          description: `Multiple referrals from same device (${sameFingerprint.length})`,
          data: { count: sameFingerprint.length },
        });
        riskScore += 40;
      }
    }

    // 6. Check suspicious email patterns (similar emails)
    const suspiciousPatterns = checkSuspiciousEmailPatterns(
      refereeEmail,
      recentReferrals.docs.map((d) => d.data().email)
    );
    if (suspiciousPatterns.length > 0) {
      issues.push({
        type: "suspicious_pattern",
        severity: "medium",
        description: `Suspicious email pattern detected`,
        data: { patterns: suspiciousPatterns },
      });
      riskScore += 25;
    }

    // Calculate final result
    const shouldBlock = riskScore >= 80;
    const shouldAlert =
      riskScore >= 50 || issues.some((i) => i.severity === "critical");

    // Auto-flag affiliate if threshold reached
    if (shouldAlert) {
      await updateAffiliateRiskScore(db, affiliateId, riskScore, issues);
    }

    return {
      allowed: !shouldBlock,
      riskScore: Math.min(100, riskScore),
      issues,
      shouldAlert,
      blockReason: shouldBlock
        ? issues.find((i) => i.severity === "critical")?.description ||
          "High fraud risk detected"
        : undefined,
    };
  } catch (error) {
    logger.error("[FraudDetection] Error during fraud check", {
      error,
      affiliateId,
      refereeEmail,
    });

    // On error, allow but flag for review
    return {
      allowed: true,
      riskScore: 0,
      issues: [
        {
          type: "suspicious_pattern",
          severity: "low",
          description: "Fraud check failed - manual review recommended",
        },
      ],
      shouldAlert: true,
    };
  }
}

/**
 * Check if an email domain looks like a disposable email
 */
function isLikelyDisposableEmail(domain: string): boolean {
  const suspiciousPatterns = [
    /^temp/i,
    /^fake/i,
    /^trash/i,
    /^junk/i,
    /^spam/i,
    /mail\.tm$/i,
    /mail\.gw$/i,
    /\d{3,}\.com$/,
    /^[a-z]{10,}\.com$/,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(domain));
}

/**
 * Check for suspicious email patterns among referrals
 */
function checkSuspiciousEmailPatterns(
  newEmail: string,
  recentEmails: string[]
): string[] {
  const patterns: string[] = [];

  const newPrefix = newEmail.split("@")[0].toLowerCase();
  const newDomain = newEmail.split("@")[1].toLowerCase();

  for (const email of recentEmails) {
    if (!email) continue;

    const prefix = email.split("@")[0].toLowerCase();
    const domain = email.split("@")[1]?.toLowerCase();

    // Check if same domain
    if (domain === newDomain && domain !== "gmail.com" && domain !== "yahoo.com") {
      patterns.push(`same_domain:${domain}`);
    }

    // Check if similar prefix (e.g., user1@, user2@)
    const similarity = calculateSimilarity(prefix, newPrefix);
    if (similarity > 0.8) {
      patterns.push(`similar_prefix:${prefix}~${newPrefix}`);
    }

    // Check sequential numbers
    if (hasSequentialNumbers(prefix, newPrefix)) {
      patterns.push(`sequential:${prefix}→${newPrefix}`);
    }
  }

  return [...new Set(patterns)]; // Remove duplicates
}

/**
 * Calculate string similarity (Levenshtein-based)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (longer.length === 0) return 1;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check for sequential numbers in prefixes
 */
function hasSequentialNumbers(prefix1: string, prefix2: string): boolean {
  const num1 = prefix1.match(/\d+$/);
  const num2 = prefix2.match(/\d+$/);

  if (!num1 || !num2) return false;

  const base1 = prefix1.replace(/\d+$/, "");
  const base2 = prefix2.replace(/\d+$/, "");

  if (base1 !== base2) return false;

  const n1 = parseInt(num1[0], 10);
  const n2 = parseInt(num2[0], 10);

  return Math.abs(n1 - n2) === 1;
}

/**
 * Mask IP address for logging
 */
function maskIP(ip: string): string {
  if (!ip) return "unknown";
  const parts = ip.split(".");
  if (parts.length !== 4) return ip.substring(0, 8) + "***";
  return `${parts[0]}.${parts[1]}.***.***`;
}

/**
 * Update affiliate's risk score and create alert if needed
 */
async function updateAffiliateRiskScore(
  db: FirebaseFirestore.Firestore,
  affiliateId: string,
  riskScore: number,
  issues: FraudIssue[]
): Promise<void> {
  const userRef = db.collection("users").doc(affiliateId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) return;

  const userData = userDoc.data()!;
  const currentAlertCount = userData.affiliateFraudAlertCount || 0;
  const newAlertCount = currentAlertCount + 1;

  // Update user document
  await userRef.update({
    affiliateFraudAlertCount: newAlertCount,
    lastFraudCheckScore: riskScore,
    lastFraudCheckAt: Timestamp.now(),
    ...(riskScore >= 80 && { affiliateStatus: "flagged" }),
  });

  // Create fraud alert
  const alert: Omit<AffiliateFraudAlert, "id"> = {
    type: issues[0]?.type || "suspicious_pattern",
    severity: riskScore >= 80 ? "critical" : riskScore >= 50 ? "high" : "medium",
    affiliateId,
    affiliateEmail: userData.email || "unknown",
    affiliateCode: userData.affiliateCode || userData.affiliateCodeClient || null,
    details: {
      description: issues.map((i) => i.description).join("; "),
    },
    status: "pending",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await db.collection("affiliate_fraud_alerts").add(alert);

  // Also write to centralized fraud_alerts collection for cross-system visibility
  const centralAlertRef = db.collection("fraud_alerts").doc();
  await centralAlertRef.set({
    id: centralAlertRef.id,
    userId: affiliateId,
    email: userData.email || "unknown",
    source: "affiliate_referral",
    flags: issues.map((i) => i.type),
    severity: alert.severity,
    details: {
      riskScore,
      affiliateCode: userData.affiliateCode || userData.affiliateCodeClient || null,
      issues: issues.map((i) => ({
        type: i.type,
        severity: i.severity,
        description: i.description,
      })),
      alertCount: newAlertCount,
    },
    status: "pending",
    resolvedBy: null,
    resolvedAt: null,
    resolution: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  logger.warn("[FraudDetection] Created fraud alert", {
    affiliateId,
    centralAlertId: centralAlertRef.id,
    riskScore,
    alertCount: newAlertCount,
  });
}

/**
 * Get pending fraud alerts count
 */
export async function getPendingFraudAlertsCount(): Promise<number> {
  const db = getFirestore();
  const snapshot = await db
    .collection("affiliate_fraud_alerts")
    .where("status", "==", "pending")
    .count()
    .get();

  return snapshot.data().count;
}

/**
 * Resolve a fraud alert
 */
export async function resolveFraudAlert(
  alertId: string,
  action: "blocked" | "warned" | "cleared",
  resolvedBy: string,
  notes: string
): Promise<void> {
  const db = getFirestore();
  const alertRef = db.collection("affiliate_fraud_alerts").doc(alertId);

  await alertRef.update({
    status: "resolved",
    resolution: {
      action,
      resolvedBy,
      resolvedAt: Timestamp.now(),
      notes,
    },
    updatedAt: Timestamp.now(),
  });

  // If blocked, update affiliate status
  if (action === "blocked") {
    const alertDoc = await alertRef.get();
    const alertData = alertDoc.data() as AffiliateFraudAlert;

    await db.collection("users").doc(alertData.affiliateId).update({
      affiliateStatus: "suspended",
      affiliateAdminNotes: FieldValue.arrayUnion(
        `Suspended on ${new Date().toISOString()}: ${notes}`
      ),
    });
  }

  logger.info("[FraudDetection] Resolved fraud alert", {
    alertId,
    action,
    resolvedBy,
  });
}
