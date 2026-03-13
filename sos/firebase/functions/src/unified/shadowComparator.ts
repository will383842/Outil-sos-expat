/**
 * Shadow Comparator
 *
 * Compares commissions created by the OLD system with what the NEW unified
 * system would have created (shadow mode). Logs discrepancies to Firestore
 * for analysis before cutover.
 *
 * Collection: shadow_comparison_results/{id}
 *
 * This is a diagnostic tool. It has NO impact on production commissions.
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { ShadowResult } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface ShadowComparisonResult {
  id?: string;
  /** Source event type */
  eventType: "call_completed" | "user_registered" | "provider_registered" | "subscription";
  /** Source event ID (e.g., callSessionId, userId) */
  sourceId: string;
  /** When the comparison was made */
  timestamp: Timestamp;

  /** What the unified system calculated (shadow) */
  shadow: {
    commissions: Array<{
      referrerId: string;
      type: string;
      subType?: string;
      amount: number;
    }>;
    totalAmount: number;
    discountApplied?: number;
  };

  /** What the legacy system actually did (from legacy handler results) */
  legacy: {
    handlerResults: Record<string, string>;
  };

  /** Comparison verdict */
  verdict: "match" | "mismatch" | "shadow_only" | "legacy_only" | "error";
  /** Details about any differences */
  differences?: string[];
}

// ============================================================================
// COMPARE AND LOG
// ============================================================================

/**
 * Compare shadow results with legacy handler results and log the comparison.
 *
 * @param eventType - The type of event being compared
 * @param sourceId - The source event ID (e.g., callSession.id)
 * @param shadowResult - What the unified system calculated
 * @param legacyResults - Status of each legacy handler (from consolidated trigger)
 */
export async function compareShadowResults(
  eventType: ShadowComparisonResult["eventType"],
  sourceId: string,
  shadowResult: ShadowResult | null,
  legacyResults: Record<string, string>
): Promise<void> {
  try {
    const db = getFirestore();
    const differences: string[] = [];

    // Determine verdict
    let verdict: ShadowComparisonResult["verdict"];

    if (!shadowResult || shadowResult.commissions.length === 0) {
      // Shadow produced nothing
      const anyLegacyOk = Object.values(legacyResults).some((r) => r === "ok");
      verdict = anyLegacyOk ? "legacy_only" : "match";
      if (anyLegacyOk) {
        differences.push("Shadow produced 0 commissions but legacy handlers ran successfully");
      }
    } else {
      // Shadow produced commissions
      const anyLegacyError = Object.values(legacyResults).some((r) => r.startsWith("error:"));
      if (anyLegacyError) {
        differences.push("Legacy handlers had errors — comparison may be incomplete");
      }

      // We can't know exactly what legacy produced without reading legacy collections,
      // so we just log what shadow produced for manual comparison
      verdict = "shadow_only"; // Until we can read legacy collections for comparison

      for (const comm of shadowResult.commissions) {
        differences.push(
          `Shadow: ${comm.type}${comm.subType ? `/${comm.subType}` : ""} → ${comm.referrerId} = ${comm.amount}¢`
        );
      }
    }

    const comparison: ShadowComparisonResult = {
      eventType,
      sourceId,
      timestamp: Timestamp.now(),
      shadow: {
        commissions: shadowResult?.commissions || [],
        totalAmount: shadowResult?.totalAmount || 0,
        discountApplied: shadowResult?.discountApplied,
      },
      legacy: {
        handlerResults: legacyResults,
      },
      verdict,
      differences: differences.length > 0 ? differences : undefined,
    };

    await db.collection("shadow_comparison_results").add(comparison);

    // Structured logging for Cloud Logging queries
    logger.info("[SHADOW] Comparison logged", {
      eventType,
      sourceId,
      verdict,
      shadowCommissions: shadowResult?.commissions.length || 0,
      shadowTotal: shadowResult?.totalAmount || 0,
      legacyHandlers: Object.keys(legacyResults).length,
      legacyErrors: Object.values(legacyResults).filter((r) => r.startsWith("error:")).length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[SHADOW] Failed to log comparison: ${msg}`);
    // Never crash the caller
  }
}

// ============================================================================
// QUERY HELPERS — For admin dashboard
// ============================================================================

/**
 * Get recent shadow comparison results for analysis.
 */
export async function getShadowComparisons(options?: {
  eventType?: string;
  verdict?: string;
  limit?: number;
}): Promise<ShadowComparisonResult[]> {
  const db = getFirestore();
  let query: FirebaseFirestore.Query = db.collection("shadow_comparison_results");

  if (options?.eventType) {
    query = query.where("eventType", "==", options.eventType);
  }
  if (options?.verdict) {
    query = query.where("verdict", "==", options.verdict);
  }

  query = query.orderBy("timestamp", "desc").limit(options?.limit || 50);

  const snap = await query.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ShadowComparisonResult);
}

/**
 * Get shadow comparison stats for a time range.
 */
export async function getShadowStats(
  since: Date
): Promise<{
  total: number;
  matches: number;
  mismatches: number;
  shadowOnly: number;
  legacyOnly: number;
  errors: number;
}> {
  const db = getFirestore();
  const sinceTs = Timestamp.fromDate(since);

  const snap = await db
    .collection("shadow_comparison_results")
    .where("timestamp", ">=", sinceTs)
    .get();

  const stats = {
    total: snap.size,
    matches: 0,
    mismatches: 0,
    shadowOnly: 0,
    legacyOnly: 0,
    errors: 0,
  };

  for (const doc of snap.docs) {
    const data = doc.data() as ShadowComparisonResult;
    switch (data.verdict) {
      case "match": stats.matches++; break;
      case "mismatch": stats.mismatches++; break;
      case "shadow_only": stats.shadowOnly++; break;
      case "legacy_only": stats.legacyOnly++; break;
      case "error": stats.errors++; break;
    }
  }

  return stats;
}
