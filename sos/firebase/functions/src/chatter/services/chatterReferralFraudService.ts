/**
 * Chatter Referral Fraud Service
 *
 * Anti-fraud detection specifically for the referral system:
 * - Referral to client earnings ratio monitoring
 * - Circular referral detection
 * - Multiple account detection
 * - Suspicious activity patterns
 */

import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  Chatter,
  ChatterReferralFraudAlert,
  ChatterReferralFraudAlertType,
  REFERRAL_CONFIG,
} from "../types";
import { getClientEarnings } from "./chatterReferralService";

// ============================================================================
// REFERRAL TO CLIENT RATIO
// ============================================================================

/**
 * Update the referral to client earnings ratio for a chatter
 * Returns the new ratio
 */
export async function updateReferralToClientRatio(chatterId: string): Promise<number> {
  const db = getFirestore();

  try {
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) return 0;

    const chatter = chatterDoc.data() as Chatter;
    const clientEarnings = getClientEarnings(chatter);
    const referralEarnings = chatter.referralEarnings || 0;

    // Avoid division by zero
    const ratio = clientEarnings > 0 ? referralEarnings / clientEarnings : 0;

    // Update the ratio
    await db.collection("chatters").doc(chatterId).update({
      referralToClientRatio: ratio,
      updatedAt: Timestamp.now(),
    });

    return ratio;
  } catch (error) {
    logger.error("[updateReferralToClientRatio] Error", { chatterId, error });
    return 0;
  }
}

/**
 * Check if a chatter has a suspicious high referral to client ratio
 */
export async function checkHighRatioChatter(chatterId: string): Promise<{
  isHighRatio: boolean;
  ratio: number;
  shouldAlert: boolean;
  shouldBlock: boolean;
}> {
  const db = getFirestore();
  const result = {
    isHighRatio: false,
    ratio: 0,
    shouldAlert: false,
    shouldBlock: false,
  };

  try {
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) return result;

    const chatter = chatterDoc.data() as Chatter;
    const clientEarnings = getClientEarnings(chatter);
    const referralEarnings = chatter.referralEarnings || 0;

    // Need some minimum earnings to evaluate
    if (clientEarnings < 1000 && referralEarnings < 1000) {
      return result; // Not enough data
    }

    result.ratio = clientEarnings > 0 ? referralEarnings / clientEarnings : referralEarnings > 0 ? 999 : 0;
    result.isHighRatio = result.ratio > REFERRAL_CONFIG.FRAUD.MAX_REFERRAL_TO_CLIENT_RATIO;

    if (result.isHighRatio) {
      // Create alert if ratio exceeds 2:1
      result.shouldAlert = true;
      // Block if ratio exceeds 5:1 (very suspicious)
      result.shouldBlock = result.ratio > 5;

      if (result.shouldAlert) {
        await createReferralFraudAlert({
          chatterId,
          alertType: "high_ratio",
          severity: result.shouldBlock ? "critical" : result.ratio > 3 ? "high" : "medium",
          details: `Referral to client earnings ratio of ${result.ratio.toFixed(2)}:1 exceeds threshold`,
          evidence: {
            ratio: result.ratio,
            referralEarnings,
            clientEarnings,
          },
          recommendedAction: result.shouldBlock ? "suspend" : "review",
        });
      }
    }

    return result;
  } catch (error) {
    logger.error("[checkHighRatioChatter] Error", { chatterId, error });
    return result;
  }
}

// ============================================================================
// CIRCULAR REFERRAL DETECTION
// ============================================================================

/**
 * Detect if a referral would create a circular chain
 * Example: A refers B, B refers C, C tries to refer A = circular
 */
export async function detectCircularReferral(
  parrainId: string,
  potentialFilleulId: string
): Promise<{
  isCircular: boolean;
  chain: string[];
}> {
  const db = getFirestore();
  const result = { isCircular: false, chain: [] as string[] };

  try {
    // Build chain from filleul back to root
    const visited = new Set<string>();
    let currentId: string | null = parrainId;
    const chain: string[] = [potentialFilleulId, parrainId];

    // Walk up the referral chain from the parrain
    for (let depth = 0; depth < REFERRAL_CONFIG.FRAUD.CIRCULAR_DETECTION_DEPTH; depth++) {
      if (!currentId || visited.has(currentId)) break;
      visited.add(currentId);

      const chatterDoc = await db.collection("chatters").doc(currentId).get();
      if (!chatterDoc.exists) break;

      const chatter = chatterDoc.data() as Chatter;
      currentId = chatter.recruitedBy;

      if (currentId) {
        chain.push(currentId);

        // Check if we've looped back to the potential filleul
        if (currentId === potentialFilleulId) {
          result.isCircular = true;
          result.chain = chain;
          break;
        }
      }
    }

    // Also check the other direction: if potentialFilleul's chain leads to parrain
    if (!result.isCircular) {
      const reverseVisited = new Set<string>();
      let reverseId: string | null = potentialFilleulId;
      const reverseChain: string[] = [parrainId, potentialFilleulId];

      for (let depth = 0; depth < REFERRAL_CONFIG.FRAUD.CIRCULAR_DETECTION_DEPTH; depth++) {
        if (!reverseId || reverseVisited.has(reverseId)) break;
        reverseVisited.add(reverseId);

        const chatterDoc = await db.collection("chatters").doc(reverseId).get();
        if (!chatterDoc.exists) break;

        const chatter = chatterDoc.data() as Chatter;
        reverseId = chatter.recruitedBy;

        if (reverseId) {
          reverseChain.push(reverseId);

          // Check if we've reached the parrain
          if (reverseId === parrainId) {
            result.isCircular = true;
            result.chain = reverseChain;
            break;
          }
        }
      }
    }

    if (result.isCircular) {
      logger.warn("[detectCircularReferral] Circular referral detected", {
        parrainId,
        potentialFilleulId,
        chain: result.chain,
      });
    }

    return result;
  } catch (error) {
    logger.error("[detectCircularReferral] Error", { parrainId, potentialFilleulId, error });
    return result;
  }
}

// ============================================================================
// MULTIPLE ACCOUNT DETECTION
// ============================================================================

/**
 * Detect if a chatter might have multiple accounts based on IP hash
 */
export async function detectMultipleAccounts(
  chatterId: string,
  ipHash: string
): Promise<{
  isMultiple: boolean;
  relatedAccounts: string[];
}> {
  const db = getFirestore();
  const result = { isMultiple: false, relatedAccounts: [] as string[] };

  try {
    if (!ipHash) return result;

    // Look for other chatters with same IP in registration clicks
    const clicksQuery = await db
      .collection("chatter_affiliate_clicks")
      .where("ipHash", "==", ipHash)
      .where("conversionType", "==", "chatter_signup")
      .limit(10)
      .get();

    const relatedIds = new Set<string>();

    for (const clickDoc of clicksQuery.docs) {
      const click = clickDoc.data();
      if (click.conversionId && click.conversionId !== chatterId) {
        relatedIds.add(click.conversionId);
      }
    }

    // Also check chatters directly (if we store IP hash at registration)
    // This would require adding ipHash field to Chatter, which we might do later

    if (relatedIds.size > 0) {
      result.isMultiple = true;
      result.relatedAccounts = Array.from(relatedIds);

      // Create alert
      await createReferralFraudAlert({
        chatterId,
        alertType: "multiple_accounts",
        severity: relatedIds.size >= 3 ? "high" : "medium",
        details: `Potential multiple accounts detected. ${relatedIds.size} other accounts share same IP hash.`,
        evidence: {
          relatedAccountIds: result.relatedAccounts,
          ipHash,
        },
        recommendedAction: relatedIds.size >= 3 ? "suspend" : "review",
      });
    }

    return result;
  } catch (error) {
    logger.error("[detectMultipleAccounts] Error", { chatterId, error });
    return result;
  }
}

// ============================================================================
// RAPID REFERRAL DETECTION
// ============================================================================

/**
 * Check if a chatter is gaining referrals too quickly (suspicious)
 */
export async function checkRapidReferrals(chatterId: string): Promise<{
  isSuspicious: boolean;
  referralCount: number;
  timeWindowHours: number;
}> {
  const db = getFirestore();
  const result = { isSuspicious: false, referralCount: 0, timeWindowHours: 24 };

  try {
    // Count referrals in the last 24 hours
    const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

    const referralsQuery = await db
      .collection("chatters")
      .where("recruitedBy", "==", chatterId)
      .where("createdAt", ">=", oneDayAgo)
      .get();

    result.referralCount = referralsQuery.size;
    result.isSuspicious = result.referralCount > REFERRAL_CONFIG.FRAUD.MAX_REFERRALS_PER_DAY;

    if (result.isSuspicious) {
      await createReferralFraudAlert({
        chatterId,
        alertType: "rapid_referrals",
        severity: result.referralCount > 20 ? "critical" : "high",
        details: `${result.referralCount} new referrals in the last 24 hours exceeds limit of ${REFERRAL_CONFIG.FRAUD.MAX_REFERRALS_PER_DAY}`,
        evidence: {
          referralCount: result.referralCount,
          timeWindowHours: 24,
        },
        recommendedAction: result.referralCount > 20 ? "suspend" : "review",
      });
    }

    return result;
  } catch (error) {
    logger.error("[checkRapidReferrals] Error", { chatterId, error });
    return result;
  }
}

// ============================================================================
// FRAUD ALERT MANAGEMENT
// ============================================================================

interface CreateFraudAlertInput {
  chatterId: string;
  alertType: ChatterReferralFraudAlertType;
  severity: "low" | "medium" | "high" | "critical";
  details: string;
  evidence: ChatterReferralFraudAlert["evidence"];
  recommendedAction: ChatterReferralFraudAlert["recommendedAction"];
}

/**
 * Create a referral fraud alert
 */
export async function createReferralFraudAlert(
  input: CreateFraudAlertInput
): Promise<string | null> {
  const db = getFirestore();

  try {
    // Get chatter info
    const chatterDoc = await db.collection("chatters").doc(input.chatterId).get();
    if (!chatterDoc.exists) return null;

    const chatter = chatterDoc.data() as Chatter;

    // Check for existing similar alert in the last 24 hours (avoid duplicates)
    const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const existingQuery = await db
      .collection("chatter_referral_fraud_alerts")
      .where("chatterId", "==", input.chatterId)
      .where("alertType", "==", input.alertType)
      .where("status", "==", "pending")
      .where("createdAt", ">=", oneDayAgo)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      // Update existing alert instead of creating a new one
      const existingAlert = existingQuery.docs[0];
      await existingAlert.ref.update({
        details: input.details,
        evidence: input.evidence,
        severity: input.severity,
        updatedAt: Timestamp.now(),
      });
      return existingAlert.id;
    }

    // Create new alert
    const alertRef = db.collection("chatter_referral_fraud_alerts").doc();
    const alert: ChatterReferralFraudAlert = {
      id: alertRef.id,
      chatterId: input.chatterId,
      chatterEmail: chatter.email,
      chatterName: `${chatter.firstName} ${chatter.lastName}`,
      alertType: input.alertType,
      severity: input.severity,
      status: "pending",
      details: input.details,
      evidence: input.evidence,
      recommendedAction: input.recommendedAction,
      createdAt: Timestamp.now(),
    };

    await alertRef.set(alert);

    // Also write to centralized fraud_alerts collection for cross-system visibility
    try {
      const centralAlertRef = db.collection("fraud_alerts").doc();
      await centralAlertRef.set({
        id: centralAlertRef.id,
        userId: input.chatterId,
        email: chatter.email,
        source: "chatter_referral",
        flags: [input.alertType],
        severity: input.severity,
        details: {
          alertType: input.alertType,
          description: input.details,
          evidence: input.evidence,
          recommendedAction: input.recommendedAction,
          chatterName: `${chatter.firstName} ${chatter.lastName}`,
        },
        status: "pending",
        resolvedBy: null,
        resolvedAt: null,
        resolution: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (centralError) {
      // Don't fail the main alert if centralized write fails
      logger.error("[createReferralFraudAlert] Failed to write centralized alert", { error: centralError });
    }

    logger.warn("[createReferralFraudAlert] Alert created", {
      alertId: alertRef.id,
      chatterId: input.chatterId,
      alertType: input.alertType,
      severity: input.severity,
    });

    return alertRef.id;
  } catch (error) {
    logger.error("[createReferralFraudAlert] Error", { input, error });
    return null;
  }
}

/**
 * Review and update a fraud alert
 */
export async function reviewFraudAlert(
  alertId: string,
  reviewData: {
    status: "confirmed" | "dismissed" | "resolved";
    actionTaken?: "none" | "warning_sent" | "suspended" | "banned";
    reviewedBy: string;
    reviewNotes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const db = getFirestore();

  try {
    const alertRef = db.collection("chatter_referral_fraud_alerts").doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      return { success: false, error: "Alert not found" };
    }

    const alert = alertDoc.data() as ChatterReferralFraudAlert;

    await alertRef.update({
      status: reviewData.status,
      actionTaken: reviewData.actionTaken || "none",
      reviewedBy: reviewData.reviewedBy,
      reviewNotes: reviewData.reviewNotes,
      reviewedAt: Timestamp.now(),
    });

    // Apply action if needed
    if (reviewData.actionTaken === "suspended" || reviewData.actionTaken === "banned") {
      await db.collection("chatters").doc(alert.chatterId).update({
        status: reviewData.actionTaken === "banned" ? "banned" : "suspended",
        adminNotes: FieldValue.arrayUnion(
          `${reviewData.actionTaken === "banned" ? "Banned" : "Suspended"} for referral fraud: ${alert.alertType} (${new Date().toISOString()})`
        ),
        updatedAt: Timestamp.now(),
      });
    }

    logger.info("[reviewFraudAlert] Alert reviewed", {
      alertId,
      status: reviewData.status,
      actionTaken: reviewData.actionTaken,
    });

    return { success: true };
  } catch (error) {
    logger.error("[reviewFraudAlert] Error", { alertId, error });
    return { success: false, error: "Failed to review alert" };
  }
}

/**
 * Get pending fraud alerts for admin review
 */
export async function getPendingFraudAlerts(
  options: {
    severity?: "low" | "medium" | "high" | "critical";
    limit?: number;
  } = {}
): Promise<ChatterReferralFraudAlert[]> {
  const db = getFirestore();

  try {
    let query = db
      .collection("chatter_referral_fraud_alerts")
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc");

    if (options.severity) {
      query = query.where("severity", "==", options.severity);
    }

    const snapshot = await query.limit(options.limit || 50).get();

    return snapshot.docs.map((doc) => doc.data() as ChatterReferralFraudAlert);
  } catch (error) {
    logger.error("[getPendingFraudAlerts] Error", { error });
    return [];
  }
}

// ============================================================================
// COMPREHENSIVE FRAUD CHECK
// ============================================================================

/**
 * Run all fraud checks for a chatter (called periodically or on suspicious activity).
 * Includes: ratio check, rapid referrals, circular referral, and multiple accounts.
 */
export async function runComprehensiveFraudCheck(
  chatterId: string,
  context?: { parrainId?: string; ipHash?: string }
): Promise<{
  hasIssues: boolean;
  issues: string[];
  shouldSuspend: boolean;
}> {
  const result = {
    hasIssues: false,
    issues: [] as string[],
    shouldSuspend: false,
  };

  const startMs = Date.now();

  try {
    // 1. Check high ratio
    const ratioResult = await checkHighRatioChatter(chatterId);
    if (ratioResult.isHighRatio) {
      result.hasIssues = true;
      result.issues.push(`High referral ratio: ${ratioResult.ratio.toFixed(2)}:1`);
      if (ratioResult.shouldBlock) {
        result.shouldSuspend = true;
      }
    }

    // 2. Check rapid referrals
    const rapidResult = await checkRapidReferrals(chatterId);
    if (rapidResult.isSuspicious) {
      result.hasIssues = true;
      result.issues.push(`Rapid referrals: ${rapidResult.referralCount} in ${rapidResult.timeWindowHours}h`);
      if (rapidResult.referralCount > 20) {
        result.shouldSuspend = true;
      }
    }

    // 3. Circular referral detection (if parrain context provided)
    if (context?.parrainId) {
      const circularResult = await detectCircularReferral(context.parrainId, chatterId);
      if (circularResult.isCircular) {
        result.hasIssues = true;
        result.shouldSuspend = true;
        result.issues.push(`Circular referral chain: ${circularResult.chain.join(" → ")}`);
      }
    }

    // 4. Multiple accounts detection (if IP hash provided)
    if (context?.ipHash) {
      const multiResult = await detectMultipleAccounts(chatterId, context.ipHash);
      if (multiResult.isMultiple) {
        result.hasIssues = true;
        result.issues.push(`Multiple accounts (${multiResult.relatedAccounts.length}) sharing IP`);
        if (multiResult.relatedAccounts.length >= 3) {
          result.shouldSuspend = true;
        }
      }
    }

    // 5. Update ratio in database
    await updateReferralToClientRatio(chatterId);

    // Structured audit log
    const durationMs = Date.now() - startMs;
    if (result.hasIssues) {
      logger.warn("[runComprehensiveFraudCheck] Issues detected", {
        chatterId,
        hasIssues: result.hasIssues,
        shouldSuspend: result.shouldSuspend,
        issueCount: result.issues.length,
        issues: result.issues,
        durationMs,
      });
    } else {
      logger.info("[runComprehensiveFraudCheck] Clean", {
        chatterId,
        durationMs,
      });
    }

    return result;
  } catch (error) {
    logger.error("[runComprehensiveFraudCheck] Error", { chatterId, error });
    return result;
  }
}
