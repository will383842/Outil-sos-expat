/**
 * Callable: getCaptainDashboard
 *
 * Returns dashboard data for a captain chatter.
 * Includes:
 * - N1 recruits with monthly call stats
 * - N2 recruits with monthly call stats
 * - Monthly team calls counter and tier progression
 * - Captain commission history
 * - Monthly archives
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";

import { Chatter, DEFAULT_CHATTER_CONFIG } from "../types";
import { getChatterConfigCached } from "../utils";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function ensureInitialized() {
  if (!IS_DEPLOYMENT_ANALYSIS && !getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// CALLABLE
// ============================================================================

export const getCaptainDashboard = onCall(
  {
    region: "us-central1",
    memory: "512MiB",
    cpu: 1,
    timeoutSeconds: 60,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 5,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    ensureInitialized();
    const db = getFirestore();
    const uid = request.auth.uid;

    // Get chatter doc
    const chatterDoc = await db.collection("chatters").doc(uid).get();
    if (!chatterDoc.exists) {
      throw new HttpsError("not-found", "Chatter not found");
    }

    const chatter = chatterDoc.data() as Chatter;
    if (chatter.role !== "captainChatter") {
      throw new HttpsError("permission-denied", "Not a captain chatter");
    }

    // Load config
    const config = await getChatterConfigCached();
    const tiers = config.captainTiers || DEFAULT_CHATTER_CONFIG.captainTiers!;

    // Month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Get N1 recruits
    const n1Query = await db
      .collection("chatters")
      .where("recruitedBy", "==", uid)
      .where("status", "==", "active")
      .get();

    const n1Recruits = n1Query.docs.map((doc) => {
      const data = doc.data() as Chatter;
      return {
        id: doc.id,
        firstName: data.firstName,
        lastName: data.lastName,
        photoUrl: data.photoUrl,
        country: data.country,
        totalCallCount: (data as any).totalCallCount || 0,
        createdAt: data.createdAt,
      };
    });

    // Get N2 recruits
    const n2Recruits = [];
    for (const n1Doc of n1Query.docs) {
      const n2Query = await db
        .collection("chatters")
        .where("recruitedBy", "==", n1Doc.id)
        .where("status", "==", "active")
        .get();

      for (const n2Doc of n2Query.docs) {
        const data = n2Doc.data() as Chatter;
        n2Recruits.push({
          id: n2Doc.id,
          firstName: data.firstName,
          lastName: data.lastName,
          photoUrl: data.photoUrl,
          country: data.country,
          totalCallCount: (data as any).totalCallCount || 0,
          recruitedVia: n1Doc.id,
          createdAt: data.createdAt,
        });
      }
    }

    // Get captain_call commissions this month
    const monthlyCommissionsQuery = await db
      .collection("chatter_commissions")
      .where("chatterId", "==", uid)
      .where("type", "==", "captain_call")
      .where("createdAt", ">=", Timestamp.fromDate(monthStart))
      .orderBy("createdAt", "desc")
      .get();

    const monthlyCommissions = monthlyCommissionsQuery.docs.map((doc) => ({
      id: doc.id,
      amount: doc.data().amount,
      description: doc.data().description,
      status: doc.data().status,
      sourceDetails: doc.data().sourceDetails,
      createdAt: doc.data().createdAt,
    }));

    // Get recent captain commissions (all types, last 50)
    const recentCommissionsQuery = await db
      .collection("chatter_commissions")
      .where("chatterId", "==", uid)
      .where("type", "in", ["captain_call", "captain_tier_bonus", "captain_quality_bonus"])
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const recentCommissions = recentCommissionsQuery.docs.map((doc) => ({
      id: doc.id,
      type: doc.data().type,
      amount: doc.data().amount,
      description: doc.data().description,
      status: doc.data().status,
      createdAt: doc.data().createdAt,
    }));

    // Get archives
    const archivesQuery = await db
      .collection("captain_monthly_archives")
      .where("captainId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(12)
      .get();

    const archives = archivesQuery.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate tier progression
    const teamCalls = chatter.captainMonthlyTeamCalls || 0;
    const sortedTiers = [...tiers].sort((a, b) => a.minCalls - b.minCalls);
    let currentTier = null;
    let nextTier = null;

    for (let i = 0; i < sortedTiers.length; i++) {
      if (teamCalls >= sortedTiers[i].minCalls) {
        currentTier = sortedTiers[i];
        nextTier = sortedTiers[i + 1] || null;
      }
    }

    if (!currentTier && sortedTiers.length > 0) {
      nextTier = sortedTiers[0];
    }

    // Quality bonus criteria check
    const qualityMinRecruits = config.captainQualityBonusMinRecruits ?? DEFAULT_CHATTER_CONFIG.captainQualityBonusMinRecruits!;
    const qualityMinCommissions = config.captainQualityBonusMinCommissions ?? DEFAULT_CHATTER_CONFIG.captainQualityBonusMinCommissions!;
    const activeN1Count = n1Query.size; // Already fetched above
    const monthlyTeamCommissions = monthlyCommissions.reduce(
      (sum, c) => sum + (c.amount || 0), 0
    );

    const criteriaMet = activeN1Count >= qualityMinRecruits && monthlyTeamCommissions >= qualityMinCommissions;
    const adminOverride = chatter.captainQualityBonusEnabled === true;

    return {
      captainInfo: {
        captainPromotedAt: chatter.captainPromotedAt,
        captainMonthlyTeamCalls: teamCalls,
        captainQualityBonusEnabled: adminOverride,
      },
      qualityBonusStatus: {
        activeN1Count,
        minRecruits: qualityMinRecruits,
        monthlyTeamCommissions,
        minCommissions: qualityMinCommissions,
        criteriaMet,
        adminOverride,
        qualified: criteriaMet || adminOverride,
        bonusAmount: config.captainQualityBonusAmount || DEFAULT_CHATTER_CONFIG.captainQualityBonusAmount!,
      },
      tierProgression: {
        currentTier: currentTier ? { name: currentTier.name, bonus: currentTier.bonus } : null,
        nextTier: nextTier ? { name: nextTier.name, minCalls: nextTier.minCalls, bonus: nextTier.bonus } : null,
        callsToNext: nextTier ? Math.max(0, nextTier.minCalls - teamCalls) : 0,
        progressPercent: nextTier ? Math.min(100, Math.round((teamCalls / nextTier.minCalls) * 100)) : 100,
      },
      n1Recruits,
      n2Recruits,
      monthlyCommissions,
      recentCommissions,
      archives,
      tiers,
    };
  }
);
