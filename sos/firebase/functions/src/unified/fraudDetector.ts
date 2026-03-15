/**
 * Unified Fraud Detector
 *
 * Detects suspicious commission patterns. NEVER blocks commissions —
 * only flags them for review.
 *
 * Risk levels:
 *   - high: Commission placed in "held" + fraud_alerts doc created
 *   - medium: Logged, commission proceeds normally
 *   - low/none: No action
 *
 * Design: fail-open (if detection fails, commission proceeds)
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

// ============================================================================
// TYPES
// ============================================================================

export type FraudRiskLevel = "none" | "low" | "medium" | "high";

export interface FraudCheckResult {
  riskLevel: FraudRiskLevel;
  reasons: string[];
  /** If high risk, commission should be held */
  shouldHold: boolean;
}

export interface FraudCheckInput {
  /** The user earning the commission */
  referrerId: string;
  referrerEmail: string;
  /** The user who triggered the commission */
  refereeId: string;
  refereeEmail?: string;
  /** Commission details */
  type: string;
  amount: number;
  /** IP addresses if available */
  referrerIp?: string;
  refereeIp?: string;
}

// ============================================================================
// DISPOSABLE EMAIL DOMAINS (top providers)
// ============================================================================

const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", "guerrillamail.com", "mailinator.com", "throwaway.email",
  "yopmail.com", "10minutemail.com", "trashmail.com", "fakeinbox.com",
  "sharklasers.com", "guerrillamailblock.com", "grr.la", "dispostable.com",
  "maildrop.cc", "temp-mail.org", "getnada.com", "mohmal.com",
]);

// ============================================================================
// MAIN CHECK
// ============================================================================

/**
 * Run all fraud checks on a potential commission.
 * Returns combined risk level and reasons.
 *
 * IMPORTANT: This function NEVER throws. On error, returns low risk.
 */
export async function checkFraud(input: FraudCheckInput): Promise<FraudCheckResult> {
  const reasons: string[] = [];

  try {
    // Check 1: Self-referral (same userId)
    if (input.referrerId === input.refereeId) {
      reasons.push("self_referral_same_user");
    }

    // Check 2: Same email
    if (
      input.referrerEmail &&
      input.refereeEmail &&
      input.referrerEmail.toLowerCase() === input.refereeEmail.toLowerCase()
    ) {
      reasons.push("self_referral_same_email");
    }

    // Check 3: Same IP
    if (input.referrerIp && input.refereeIp && input.referrerIp === input.refereeIp) {
      reasons.push("same_ip_address");
    }

    // Check 4: Disposable email
    if (input.refereeEmail) {
      const domain = input.refereeEmail.split("@")[1]?.toLowerCase();
      if (domain && DISPOSABLE_DOMAINS.has(domain)) {
        reasons.push("disposable_email");
      }
    }

    // Check 5: Rate limiting (max 20 commissions/hour for same referrer)
    const isRateLimited = await checkRateLimit(input.referrerId);
    if (isRateLimited) {
      reasons.push("rate_limit_exceeded");
    }

    // Check 6: Circular referral
    const isCircular = await checkCircularReferral(input.referrerId, input.refereeId);
    if (isCircular) {
      reasons.push("circular_referral");
    }

    // Determine risk level
    const riskLevel = computeRiskLevel(reasons);

    // If high risk, create fraud alert
    if (riskLevel === "high") {
      await createFraudAlert(input, reasons);
    } else if (riskLevel === "medium") {
      logger.warn(`Medium fraud risk for ${input.referrerId}: ${reasons.join(", ")}`);
    }

    return {
      riskLevel,
      reasons,
      shouldHold: riskLevel === "high",
    };
  } catch (err) {
    // Fail-open: on error, allow the commission
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Fraud check failed (fail-open): ${msg}`);
    return { riskLevel: "low", reasons: ["check_error"], shouldHold: false };
  }
}

/**
 * Simple self-referral check (synchronous, no Firestore).
 * Used as a fast guard before the full fraud check.
 */
export function isSelfReferral(
  referrerId: string,
  refereeId: string,
  providerId?: string
): boolean {
  if (referrerId === refereeId) return true;
  if (providerId && referrerId === providerId) return true;
  return false;
}

// ============================================================================
// INDIVIDUAL CHECKS
// ============================================================================

const MAX_COMMISSIONS_PER_HOUR = 20;

async function checkRateLimit(referrerId: string): Promise<boolean> {
  try {
    const db = getFirestore();
    const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

    const snap = await db
      .collection("commissions")
      .where("referrerId", "==", referrerId)
      .where("createdAt", ">=", oneHourAgo)
      .limit(MAX_COMMISSIONS_PER_HOUR + 1)
      .get();

    return snap.size > MAX_COMMISSIONS_PER_HOUR;
  } catch {
    return false; // fail-open
  }
}

async function checkCircularReferral(
  referrerId: string,
  refereeId: string
): Promise<boolean> {
  try {
    const db = getFirestore();
    const visited = new Set<string>([refereeId]);
    let currentId = referrerId;
    const MAX_DEPTH = 10;

    for (let i = 0; i < MAX_DEPTH; i++) {
      if (visited.has(currentId)) return true;
      visited.add(currentId);

      const userSnap = await db.collection("users").doc(currentId).get();
      if (!userSnap.exists) return false;

      const data = userSnap.data()!;
      const nextId = (data.referredByUserId ||
        data.referredByChatterId ||
        data.referredByInfluencerId ||
        data.referredByBlogger ||
        data.referredByGroupAdmin) as string | undefined;

      if (!nextId) return false;
      currentId = nextId;
    }

    return false;
  } catch {
    return false; // fail-open
  }
}

// ============================================================================
// RISK COMPUTATION
// ============================================================================

function computeRiskLevel(reasons: string[]): FraudRiskLevel {
  if (reasons.length === 0) return "none";

  // High risk: self-referral, circular, or rate limit exceeded
  const highRiskReasons = ["self_referral_same_user", "self_referral_same_email", "circular_referral", "rate_limit_exceeded"];
  if (reasons.some((r) => highRiskReasons.includes(r))) return "high";

  // Medium risk: same IP
  const mediumRiskReasons = ["same_ip_address"];
  if (reasons.some((r) => mediumRiskReasons.includes(r))) return "medium";

  // Low risk: disposable email, check errors
  return "low";
}

// ============================================================================
// FRAUD ALERT CREATION
// ============================================================================

async function createFraudAlert(
  input: FraudCheckInput,
  reasons: string[]
): Promise<void> {
  try {
    const db = getFirestore();
    await db.collection("fraud_alerts").add({
      referrerId: input.referrerId,
      referrerEmail: input.referrerEmail,
      refereeId: input.refereeId,
      refereeEmail: input.refereeEmail || null,
      commissionType: input.type,
      amount: input.amount,
      reasons,
      riskLevel: "high",
      status: "pending_review",
      createdAt: Timestamp.now(),
    });

    logger.warn(
      `FRAUD ALERT: ${reasons.join(", ")} | referrer=${input.referrerId} referee=${input.refereeId}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to create fraud alert: ${msg}`);
  }
}
