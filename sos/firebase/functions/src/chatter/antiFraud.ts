/**
 * Chatter Anti-Fraud System
 *
 * Comprehensive fraud detection for the chatter program:
 * - IP-based fraud detection (multiple accounts from same IP)
 * - Disposable email detection
 * - Circular referral detection
 * - Rapid signup detection
 * - Activation bonus tracking (2nd call requirement)
 *
 * CRITICAL COMMISSION RULES:
 * - NO commission at signup ($0)
 * - NO commission at quiz ($0)
 * - NO commission at 1st call ($0)
 * - $5 ACTIVATION BONUS paid ONLY after 2nd client call
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import * as crypto from "crypto";

import { Chatter, ChatterNotification } from "./types";
import { createCommission } from "./services/chatterCommissionService";

// ============================================================================
// TYPES
// ============================================================================

export interface IPFraudResult {
  isValid: boolean;
  reason?: string;
  accountCount?: number;
}

export interface FraudCheckResult {
  passed: boolean;
  flags: string[];
  severity: "low" | "medium" | "high" | "critical";
  shouldBlock: boolean;
  requiresManualReview: boolean;
}

export interface RapidSignupResult {
  isValid: boolean;
  count: number;
  timeWindowHours: number;
}

export interface ActivationBonusResult {
  bonusPaid: boolean;
  commissionId?: string;
  callCount: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Activation bonus amount in cents ($5) */
export const ACTIVATION_BONUS_AMOUNT = 500;

/** Number of calls required to trigger activation bonus */
export const CALLS_REQUIRED_FOR_ACTIVATION = 2;

/** Maximum accounts per IP within 24 hours */
const MAX_ACCOUNTS_PER_IP_24H = 3;

/** Maximum accounts per IP within 7 days */
const MAX_ACCOUNTS_PER_IP_7D = 5;

/** Maximum rapid signups per referrer in 24 hours */
const MAX_RAPID_SIGNUPS_24H = 10;

/** Maximum rapid signups per referrer in 1 hour (very suspicious) */
const MAX_RAPID_SIGNUPS_1H = 5;

/**
 * Extended list of disposable email domains
 * These are commonly used for fraudulent signups
 */
const DISPOSABLE_EMAIL_DOMAINS = [
  // Popular temporary email services
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "temp-mail.net",
  "throwaway.email",
  "throwawaymail.com",
  "guerrillamail.com",
  "guerrillamail.org",
  "guerrillamail.net",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillmail.com",
  "10minutemail.com",
  "10minutemail.net",
  "10minmail.com",
  "10min.email",
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "mailinator2.com",
  "mailinater.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "fakeinbox.com",
  "trashmail.com",
  "trashmail.net",
  "trashmail.org",
  "trashmail.me",
  "getnada.com",
  "nada.email",
  "sharklasers.com",
  "dispostable.com",
  "mailnesia.com",
  "tempr.email",
  "discard.email",
  "discardmail.com",
  "spambox.us",
  "spamfree24.org",
  "spamgourmet.com",
  "mytrashmail.com",
  "mt2009.com",
  "thankyou2010.com",
  "spam4.me",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam.la",
  "bumpymail.com",
  "bobmail.info",
  "chammy.info",
  "devnullmail.com",
  "letthemeatspam.com",
  "safetymail.info",
  "spamherelots.com",
  "spaml.com",
  "spamoff.de",
  "spamobox.com",
  "spamspot.com",
  "tempemail.net",
  "tempinbox.com",
  "tempmail.it",
  "wegwerfmail.de",
  "wegwerfmail.net",
  "wegwerfmail.org",
  "wh4f.org",
  "willselfdestruct.com",
  "willhackforfood.biz",
  "emailondeck.com",
  "anonymbox.com",
  "anonymouse.org",
  "emailfake.com",
  "fakemailgenerator.com",
  "fakemail.fr",
  "jetable.org",
  "kasmail.com",
  "link2mail.net",
  "mailcatch.com",
  "maildrop.cc",
  "mailexpire.com",
  "mailnull.com",
  "mailzilla.org",
  "messagebeamer.de",
  "mintemail.com",
  "mohmal.com",
  "mvrht.com",
  "nervmich.net",
  "nervtmich.net",
  "oneoffemail.com",
  "orangatango.com",
  "pjjkp.com",
  "proxymail.eu",
  "rcpt.at",
  "rejectmail.com",
  "rtrtr.com",
  "s0ny.net",
  "smellfear.com",
  "snakemail.com",
  "sofort-mail.de",
  "sogetthis.com",
  "spamex.com",
  "spamfree.eu",
  "spamobox.com",
  "tempail.com",
  "tempalias.com",
  "tempe-mail.com",
  "tempemail.biz",
  "tempinbox.co.uk",
  "tempmail2.com",
  "tempmailaddress.com",
  "temporarioemail.com.br",
  "temporaryemail.net",
  "temporaryforwarding.com",
  "throwam.com",
  "tittbit.in",
  "trash2009.com",
  "trashemail.de",
  "trashmail.at",
  "trashmailer.com",
  "trashymail.com",
  "turual.com",
  "twinmail.de",
  "uggsrock.com",
  "upliftnow.com",
  "viditag.com",
  "veryrealemail.com",
  "whatpaas.com",
  "whyspam.me",
  "xemaps.com",
  "xmaily.com",
  "xoxy.net",
  "yepmail.net",
  "ypmail.webarnak.fr.eu.org",
  "za.com",
  "zehnminuten.de",
  "zehnminutenmail.de",
  "zippymail.info",
  "zoaxe.com",
  "zoemail.net",
  // Russian disposable domains
  "mailru.com",
  "mail-temp.com",
  // Additional common ones
  "getairmail.com",
  "getonemail.com",
  "20minutemail.com",
  "20minutemail.it",
  "33mail.com",
  "dropmail.me",
  "emailtemporaire.fr",
  "emailtemporaire.net",
  "emkei.cz",
  "harakirimail.com",
  "incognitomail.com",
  "incognitomail.net",
  "inboxalias.com",
  "mailcatch.com",
  "mailsac.com",
  "otherinbox.com",
  "receiveee.com",
  "spamdecoy.net",
  "spamewok.com",
  "tempsky.com",
  "thankyou2010.com",
  "throwawayemailaddress.com",
  "trash-mail.de",
  "trashmailgenerator.de",
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Hash an IP address for privacy-preserving storage
 */
export function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * Normalize IP address for comparison
 */
function normalizeIP(ip: string): string {
  // Handle IPv6-mapped IPv4 addresses
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }
  return ip;
}

// ============================================================================
// CHECK FOR MULTIPLE ACCOUNTS FROM SAME IP
// ============================================================================

/**
 * Check for fraud based on IP address
 * Detects multiple account registrations from the same IP
 *
 * @param ip - The IP address to check
 * @param userId - The current user ID (to exclude from count)
 * @returns IPFraudResult with validity and reason
 */
export async function checkIPFraud(
  ip: string,
  userId: string
): Promise<IPFraudResult> {
  const db = getFirestore();
  const normalizedIP = normalizeIP(ip);
  const ipHash = hashIP(normalizedIP);

  try {
    // Check registrations in the last 24 hours
    const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Query chatter_ip_registry for same IP in last 24 hours
    const recentQuery = await db
      .collection("chatter_ip_registry")
      .where("ipHash", "==", ipHash)
      .where("registeredAt", ">=", oneDayAgo)
      .get();

    // Filter out current user
    const recentAccounts = recentQuery.docs.filter(
      (doc) => doc.data().chatterId !== userId
    );

    if (recentAccounts.length >= MAX_ACCOUNTS_PER_IP_24H) {
      logger.warn("[checkIPFraud] Multiple accounts from same IP in 24h", {
        ipHash,
        count: recentAccounts.length,
        userId,
      });
      return {
        isValid: false,
        reason: `Too many accounts (${recentAccounts.length}) registered from this IP in the last 24 hours`,
        accountCount: recentAccounts.length,
      };
    }

    // Also check 7-day window for slower fraud attempts
    const weekQuery = await db
      .collection("chatter_ip_registry")
      .where("ipHash", "==", ipHash)
      .where("registeredAt", ">=", sevenDaysAgo)
      .get();

    const weekAccounts = weekQuery.docs.filter(
      (doc) => doc.data().chatterId !== userId
    );

    if (weekAccounts.length >= MAX_ACCOUNTS_PER_IP_7D) {
      logger.warn("[checkIPFraud] Multiple accounts from same IP in 7 days", {
        ipHash,
        count: weekAccounts.length,
        userId,
      });
      return {
        isValid: false,
        reason: `Too many accounts (${weekAccounts.length}) registered from this IP in the last 7 days`,
        accountCount: weekAccounts.length,
      };
    }

    return {
      isValid: true,
      accountCount: weekAccounts.length,
    };
  } catch (error) {
    logger.error("[checkIPFraud] Error checking IP fraud", { ipHash, userId, error });
    // On error, don't block but flag for review
    return {
      isValid: true,
      reason: "IP check failed - flagged for manual review",
    };
  }
}

// ============================================================================
// CHECK FOR DISPOSABLE EMAIL DOMAINS
// ============================================================================

/**
 * Check if an email uses a disposable/temporary email domain
 *
 * @param email - The email address to check
 * @returns true if the email domain is disposable
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes("@")) {
    return true; // Invalid email format
  }

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return true;
  }

  // Direct match
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return true;
  }

  // Check subdomains (e.g., "sub.tempmail.com")
  for (const disposableDomain of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith(`.${disposableDomain}`)) {
      return true;
    }
  }

  // Check for common patterns in disposable emails
  const suspiciousPatterns = [
    /^temp/i,
    /^trash/i,
    /^fake/i,
    /^spam/i,
    /^disposable/i,
    /^throwaway/i,
    /^10min/i,
    /^guerrilla/i,
    /^mailinator/i,
    /^yopmail/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(domain)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// CHECK FOR CIRCULAR REFERRALS
// ============================================================================

/**
 * Check for circular referrals (A refers B who refers A, or longer chains)
 * Prevents referral fraud where users create circular referral chains
 *
 * @param referrerId - The ID of the potential referrer
 * @param newUserId - The ID of the new user being referred
 * @returns true if a circular referral is detected
 */
export async function checkCircularReferral(
  referrerId: string,
  newUserId: string
): Promise<boolean> {
  const db = getFirestore();
  const MAX_DEPTH = 10; // Check up to 10 levels deep

  try {
    // Edge case: self-referral
    if (referrerId === newUserId) {
      logger.warn("[checkCircularReferral] Self-referral attempt", {
        referrerId,
        newUserId,
      });
      return true;
    }

    // Walk up the referral chain from the referrer
    const visited = new Set<string>();
    let currentId: string | null = referrerId;

    for (let depth = 0; depth < MAX_DEPTH; depth++) {
      if (!currentId || visited.has(currentId)) {
        break;
      }

      visited.add(currentId);

      // Check if current node is the new user (would create a loop)
      if (currentId === newUserId) {
        logger.warn("[checkCircularReferral] Circular referral detected", {
          referrerId,
          newUserId,
          depth,
          chain: Array.from(visited),
        });
        return true;
      }

      // Get the referrer of the current chatter
      const chatterDoc = await db.collection("chatters").doc(currentId).get();
      if (!chatterDoc.exists) {
        break;
      }

      const chatter = chatterDoc.data() as Chatter;
      currentId = chatter.recruitedBy;
    }

    return false;
  } catch (error) {
    logger.error("[checkCircularReferral] Error", { referrerId, newUserId, error });
    // On error, don't block but let manual review handle it
    return false;
  }
}

// ============================================================================
// CHECK FOR SUSPICIOUS RAPID SIGNUPS
// ============================================================================

/**
 * Check for suspicious rapid signups under a referrer
 * Detects patterns where many users sign up under the same referrer quickly
 *
 * @param referrerId - The ID of the referrer to check
 * @returns RapidSignupResult with validity, count, and time window
 */
export async function checkRapidSignups(
  referrerId: string
): Promise<RapidSignupResult> {
  const db = getFirestore();

  try {
    // Check signups in the last hour (very suspicious if high)
    const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

    // Count signups under this referrer in the last hour
    const hourlyQuery = await db
      .collection("chatters")
      .where("recruitedBy", "==", referrerId)
      .where("createdAt", ">=", oneHourAgo)
      .get();

    if (hourlyQuery.size >= MAX_RAPID_SIGNUPS_1H) {
      logger.warn("[checkRapidSignups] Very rapid signups detected", {
        referrerId,
        count: hourlyQuery.size,
        timeWindowHours: 1,
      });
      return {
        isValid: false,
        count: hourlyQuery.size,
        timeWindowHours: 1,
      };
    }

    // Count signups in the last 24 hours
    const dailyQuery = await db
      .collection("chatters")
      .where("recruitedBy", "==", referrerId)
      .where("createdAt", ">=", oneDayAgo)
      .get();

    if (dailyQuery.size >= MAX_RAPID_SIGNUPS_24H) {
      logger.warn("[checkRapidSignups] Rapid signups detected", {
        referrerId,
        count: dailyQuery.size,
        timeWindowHours: 24,
      });
      return {
        isValid: false,
        count: dailyQuery.size,
        timeWindowHours: 24,
      };
    }

    return {
      isValid: true,
      count: dailyQuery.size,
      timeWindowHours: 24,
    };
  } catch (error) {
    logger.error("[checkRapidSignups] Error", { referrerId, error });
    return {
      isValid: true,
      count: 0,
      timeWindowHours: 24,
    };
  }
}

// ============================================================================
// MAIN FRAUD CHECK FUNCTION
// ============================================================================

/**
 * Perform comprehensive fraud check for chatter registration
 *
 * @param data - Registration data to check
 * @returns FraudCheckResult with pass/fail status and flags
 */
export async function performFraudCheck(data: {
  ip: string;
  email: string;
  referrerId?: string;
  userId: string;
}): Promise<FraudCheckResult> {
  const flags: string[] = [];
  let severity: "low" | "medium" | "high" | "critical" = "low";
  let shouldBlock = false;
  let requiresManualReview = false;

  try {
    // 1. Check disposable email
    if (isDisposableEmail(data.email)) {
      flags.push("disposable_email");
      severity = "high";
      shouldBlock = true;
      logger.warn("[performFraudCheck] Disposable email detected", {
        email: data.email,
        userId: data.userId,
      });
    }

    // 2. Check IP fraud
    const ipResult = await checkIPFraud(data.ip, data.userId);
    if (!ipResult.isValid) {
      flags.push("multiple_accounts_same_ip");
      severity = severity === "low" ? "high" : severity;
      shouldBlock = true;
      logger.warn("[performFraudCheck] IP fraud detected", {
        reason: ipResult.reason,
        userId: data.userId,
      });
    }

    // 3. Check circular referral (if referrer provided)
    if (data.referrerId) {
      const isCircular = await checkCircularReferral(data.referrerId, data.userId);
      if (isCircular) {
        flags.push("circular_referral");
        severity = "critical";
        shouldBlock = true;
        logger.warn("[performFraudCheck] Circular referral detected", {
          referrerId: data.referrerId,
          userId: data.userId,
        });
      }

      // 4. Check rapid signups under referrer
      const rapidResult = await checkRapidSignups(data.referrerId);
      if (!rapidResult.isValid) {
        flags.push("rapid_signups_under_referrer");
        severity = severity === "low" ? "medium" : severity;
        requiresManualReview = true;
        logger.warn("[performFraudCheck] Rapid signups detected", {
          referrerId: data.referrerId,
          count: rapidResult.count,
          timeWindowHours: rapidResult.timeWindowHours,
        });
      }
    }

    // 5. Check for suspicious email patterns
    if (data.email && data.referrerId) {
      const emailSuspicious = await checkEmailPatternFraud(
        data.email,
        data.referrerId
      );
      if (emailSuspicious) {
        flags.push("suspicious_email_pattern");
        severity = severity === "low" ? "medium" : severity;
        requiresManualReview = true;
      }
    }

    const passed = flags.length === 0;

    logger.info("[performFraudCheck] Check completed", {
      userId: data.userId,
      passed,
      flags,
      severity,
      shouldBlock,
    });

    return {
      passed,
      flags,
      severity,
      shouldBlock,
      requiresManualReview,
    };
  } catch (error) {
    logger.error("[performFraudCheck] Error during fraud check", {
      userId: data.userId,
      error,
    });
    // On error, don't block but flag for review
    return {
      passed: true,
      flags: ["fraud_check_error"],
      severity: "low",
      shouldBlock: false,
      requiresManualReview: true,
    };
  }
}

/**
 * Check for suspicious email patterns (e.g., email1@domain, email2@domain from same referrer)
 */
async function checkEmailPatternFraud(
  email: string,
  referrerId: string
): Promise<boolean> {
  const db = getFirestore();

  try {
    const emailParts = email.split("@");
    if (emailParts.length !== 2) return false;

    const domain = emailParts[1].toLowerCase();
    const localPart = emailParts[0].toLowerCase();

    // Get other signups under this referrer
    const referralsQuery = await db
      .collection("chatters")
      .where("recruitedBy", "==", referrerId)
      .limit(50)
      .get();

    let sameDomainCount = 0;
    let similarLocalCount = 0;

    // Remove trailing numbers for comparison (email1, email2, email3)
    const baseLocalPart = localPart.replace(/\d+$/, "");

    for (const doc of referralsQuery.docs) {
      const chatter = doc.data() as Chatter;
      const existingEmail = chatter.email.toLowerCase();
      const existingParts = existingEmail.split("@");

      if (existingParts.length !== 2) continue;

      const existingDomain = existingParts[1];
      const existingLocal = existingParts[0];
      const existingBaseLocal = existingLocal.replace(/\d+$/, "");

      // Count same domain
      if (existingDomain === domain) {
        sameDomainCount++;
      }

      // Count similar local parts (email1, email2 pattern)
      if (existingBaseLocal === baseLocalPart && existingLocal !== localPart) {
        similarLocalCount++;
      }
    }

    // Suspicious if many referrals from same domain
    if (sameDomainCount >= 5) {
      logger.warn("[checkEmailPatternFraud] Many emails from same domain", {
        domain,
        count: sameDomainCount,
        referrerId,
      });
      return true;
    }

    // Very suspicious if incremental emails (email1, email2, email3)
    if (similarLocalCount >= 2) {
      logger.warn("[checkEmailPatternFraud] Incremental email pattern detected", {
        baseLocal: baseLocalPart,
        count: similarLocalCount,
        referrerId,
      });
      return true;
    }

    return false;
  } catch (error) {
    logger.error("[checkEmailPatternFraud] Error", { email, referrerId, error });
    return false;
  }
}

// ============================================================================
// IP REGISTRY FUNCTIONS
// ============================================================================

/**
 * Store IP address at registration (in separate collection for privacy)
 */
export async function storeRegistrationIP(
  chatterId: string,
  ip: string,
  email: string
): Promise<void> {
  const db = getFirestore();
  const normalizedIP = normalizeIP(ip);
  const ipHash = hashIP(normalizedIP);

  try {
    await db.collection("chatter_ip_registry").add({
      chatterId,
      ipHash,
      emailDomain: email.split("@")[1]?.toLowerCase() || "unknown",
      registeredAt: Timestamp.now(),
      // We don't store the actual IP, only the hash
    });

    logger.info("[storeRegistrationIP] IP stored", {
      chatterId,
      ipHash,
    });
  } catch (error) {
    logger.error("[storeRegistrationIP] Error storing IP", {
      chatterId,
      error,
    });
    // Don't throw - this is not critical
  }
}

// ============================================================================
// FLAG SUSPICIOUS ACCOUNTS FOR MANUAL REVIEW
// ============================================================================

/**
 * Flag an account for manual review by admin
 */
export async function flagForManualReview(
  chatterId: string,
  flags: string[],
  severity: string,
  details?: Record<string, unknown>
): Promise<void> {
  const db = getFirestore();

  try {
    await db.collection("chatter_fraud_reviews").add({
      chatterId,
      flags,
      severity,
      details: details || {},
      status: "pending",
      createdAt: Timestamp.now(),
      reviewedAt: null,
      reviewedBy: null,
      resolution: null,
    });

    logger.info("[flagForManualReview] Account flagged", {
      chatterId,
      flags,
      severity,
    });
  } catch (error) {
    logger.error("[flagForManualReview] Error flagging account", {
      chatterId,
      error,
    });
  }
}

// ============================================================================
// ACTIVATION BONUS SYSTEM
// ============================================================================

/**
 * Track call count per chatter for activation bonus
 * Collection: chatter_call_counts/{chatterId}
 */
interface ChatterCallCount {
  chatterId: string;
  callCount: number;
  firstCallAt: Timestamp | null;
  secondCallAt: Timestamp | null;
  activationBonusPaid: boolean;
  activationBonusCommissionId: string | null;
  lastCallAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Increment call count for a chatter
 * Called when a completed call is attributed to a chatter
 */
export async function incrementChatterCallCount(
  chatterId: string,
  callSessionId: string
): Promise<{ callCount: number; isSecondCall: boolean }> {
  const db = getFirestore();
  const countRef = db.collection("chatter_call_counts").doc(chatterId);
  const now = Timestamp.now();

  try {
    const result = await db.runTransaction(async (transaction) => {
      const countDoc = await transaction.get(countRef);

      let newCallCount: number;
      let isSecondCall = false;

      if (!countDoc.exists) {
        // First call ever
        newCallCount = 1;
        transaction.set(countRef, {
          chatterId,
          callCount: 1,
          firstCallAt: now,
          secondCallAt: null,
          activationBonusPaid: false,
          activationBonusCommissionId: null,
          lastCallAt: now,
          updatedAt: now,
        } as ChatterCallCount);
      } else {
        const data = countDoc.data() as ChatterCallCount;
        newCallCount = data.callCount + 1;
        isSecondCall = newCallCount === CALLS_REQUIRED_FOR_ACTIVATION;

        const updates: Partial<ChatterCallCount> = {
          callCount: newCallCount,
          lastCallAt: now,
          updatedAt: now,
        };

        if (isSecondCall) {
          updates.secondCallAt = now;
        }

        transaction.update(countRef, updates);
      }

      return { callCount: newCallCount, isSecondCall };
    });

    logger.info("[incrementChatterCallCount] Call count updated", {
      chatterId,
      callSessionId,
      callCount: result.callCount,
      isSecondCall: result.isSecondCall,
    });

    return result;
  } catch (error) {
    logger.error("[incrementChatterCallCount] Error", {
      chatterId,
      callSessionId,
      error,
    });
    return { callCount: 0, isSecondCall: false };
  }
}

/**
 * Check if activation bonus should be paid and pay it
 * Called after incrementing call count
 *
 * CRITICAL: This pays the $5 activation bonus to the REFERRER (recruiter)
 * when their recruited chatter completes their 2nd client call
 */
export async function checkAndPayActivationBonus(
  chatterId: string,
  referrerId: string
): Promise<ActivationBonusResult> {
  const db = getFirestore();

  try {
    // Get call count record
    const countDoc = await db
      .collection("chatter_call_counts")
      .doc(chatterId)
      .get();

    if (!countDoc.exists) {
      return {
        bonusPaid: false,
        callCount: 0,
      };
    }

    const countData = countDoc.data() as ChatterCallCount;

    // Check if already paid
    if (countData.activationBonusPaid) {
      logger.info("[checkAndPayActivationBonus] Bonus already paid", {
        chatterId,
        referrerId,
      });
      return {
        bonusPaid: false,
        callCount: countData.callCount,
      };
    }

    // Check if enough calls
    if (countData.callCount < CALLS_REQUIRED_FOR_ACTIVATION) {
      return {
        bonusPaid: false,
        callCount: countData.callCount,
      };
    }

    // Get chatter data for notification
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) {
      logger.error("[checkAndPayActivationBonus] Chatter not found", {
        chatterId,
      });
      return {
        bonusPaid: false,
        callCount: countData.callCount,
      };
    }

    const chatter = chatterDoc.data() as Chatter;

    // Check referrer exists and is active
    const referrerDoc = await db.collection("chatters").doc(referrerId).get();
    if (!referrerDoc.exists) {
      logger.warn("[checkAndPayActivationBonus] Referrer not found", {
        chatterId,
        referrerId,
      });
      return {
        bonusPaid: false,
        callCount: countData.callCount,
      };
    }

    const referrer = referrerDoc.data() as Chatter;
    if (referrer.status !== "active") {
      logger.warn("[checkAndPayActivationBonus] Referrer not active", {
        chatterId,
        referrerId,
        referrerStatus: referrer.status,
      });
      return {
        bonusPaid: false,
        callCount: countData.callCount,
      };
    }

    // Create the activation bonus commission for the REFERRER
    const commissionResult = await createCommission({
      chatterId: referrerId, // Commission goes to the referrer
      type: "recruitment",
      source: {
        id: chatterId,
        type: "user",
        details: {
          providerId: chatterId,
          providerEmail: chatter.email,
          providerType: "expat",
          bonusType: "activation_bonus",
          bonusReason: `Activation bonus - ${chatter.firstName} completed 2nd client call`,
        },
      },
      baseAmount: ACTIVATION_BONUS_AMOUNT,
      description: `Bonus d'activation - ${chatter.firstName} ${chatter.lastName.charAt(0)}. a apporte son 2eme client`,
      skipFraudCheck: true, // Skip fraud check for system-generated bonus
    });

    if (!commissionResult.success) {
      logger.error("[checkAndPayActivationBonus] Failed to create commission", {
        chatterId,
        referrerId,
        error: commissionResult.error,
      });
      return {
        bonusPaid: false,
        callCount: countData.callCount,
      };
    }

    // Mark bonus as paid
    await db.collection("chatter_call_counts").doc(chatterId).update({
      activationBonusPaid: true,
      activationBonusCommissionId: commissionResult.commissionId,
      updatedAt: Timestamp.now(),
    });

    // Also update the chatter's recruiterCommissionPaid flag
    await db.collection("chatters").doc(chatterId).update({
      recruiterCommissionPaid: true,
      updatedAt: Timestamp.now(),
    });

    // Send notification to referrer
    await createActivationBonusNotification(
      db,
      referrerId,
      chatter,
      commissionResult.commissionId!,
      commissionResult.amount!
    );

    logger.info("[checkAndPayActivationBonus] Activation bonus paid", {
      chatterId,
      referrerId,
      commissionId: commissionResult.commissionId,
      amount: commissionResult.amount,
    });

    return {
      bonusPaid: true,
      commissionId: commissionResult.commissionId,
      callCount: countData.callCount,
    };
  } catch (error) {
    logger.error("[checkAndPayActivationBonus] Error", {
      chatterId,
      referrerId,
      error,
    });
    return {
      bonusPaid: false,
      callCount: 0,
    };
  }
}

/**
 * Create notification for activation bonus
 */
async function createActivationBonusNotification(
  db: FirebaseFirestore.Firestore,
  referrerId: string,
  recruitedChatter: Chatter,
  commissionId: string,
  amount: number
): Promise<void> {
  const notificationRef = db.collection("chatter_notifications").doc();

  const notification: ChatterNotification = {
    id: notificationRef.id,
    chatterId: referrerId,
    type: "commission_earned",
    title: "Bonus d'activation recu !",
    titleTranslations: {
      en: "Activation bonus received!",
      es: "Bono de activacion recibido!",
      pt: "Bonus de ativacao recebido!",
    },
    message: `Votre filleul ${recruitedChatter.firstName} ${recruitedChatter.lastName.charAt(0)}. a apporte son 2eme client ! Vous recevez $${(amount / 100).toFixed(2)}.`,
    messageTranslations: {
      en: `Your recruit ${recruitedChatter.firstName} ${recruitedChatter.lastName.charAt(0)}. brought their 2nd client! You receive $${(amount / 100).toFixed(2)}.`,
    },
    actionUrl: "/chatter/dashboard",
    isRead: false,
    emailSent: false,
    data: {
      commissionId,
      amount,
    },
    createdAt: Timestamp.now(),
  };

  await notificationRef.set(notification);
}

/**
 * Get call count for a chatter
 */
export async function getChatterCallCount(chatterId: string): Promise<number> {
  const db = getFirestore();

  try {
    const countDoc = await db
      .collection("chatter_call_counts")
      .doc(chatterId)
      .get();

    if (!countDoc.exists) {
      return 0;
    }

    return (countDoc.data() as ChatterCallCount).callCount;
  } catch (error) {
    logger.error("[getChatterCallCount] Error", { chatterId, error });
    return 0;
  }
}
