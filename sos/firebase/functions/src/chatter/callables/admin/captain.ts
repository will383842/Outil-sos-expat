/**
 * Admin Captain Chatter Callables
 *
 * Admin-only functions for managing captain chatters.
 * Region: us-central1 (affiliate/marketing region)
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { chatterAdminConfig as adminConfig } from "../../../lib/functionConfigs";
import { Chatter, ChatterConfig, DEFAULT_CHATTER_CONFIG } from "../../types";
import { getChatterConfig } from "../../chatterConfig";

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

function getDb() {
  ensureInitialized();
  return getFirestore();
}

// ============================================================================
// ADMIN AUTH HELPER
// ============================================================================

async function verifyAdmin(uid: string): Promise<void> {
  const db = getDb();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "User not found");
  }
  const userData = userDoc.data()!;
  if (userData.role !== "admin" && userData.role !== "superadmin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

// ============================================================================
// 1. PROMOTE TO CAPTAIN
// ============================================================================

export const adminPromoteToCaptain = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    await verifyAdmin(request.auth.uid);

    const { chatterId } = request.data as { chatterId: string };
    if (!chatterId) {
      throw new HttpsError("invalid-argument", "chatterId is required");
    }

    const db = getDb();
    const chatterRef = db.collection("chatters").doc(chatterId);
    const chatterDoc = await chatterRef.get();

    if (!chatterDoc.exists) {
      throw new HttpsError("not-found", "Chatter not found");
    }

    const chatter = chatterDoc.data() as Chatter;
    if (chatter.role === "captainChatter") {
      throw new HttpsError("already-exists", "Chatter is already a captain");
    }

    await chatterRef.update({
      role: "captainChatter",
      captainPromotedAt: Timestamp.now(),
      captainPromotedBy: request.auth.uid,
      captainMonthlyTeamCalls: 0,
      captainCurrentTier: null,
      captainQualityBonusEnabled: false,
      updatedAt: Timestamp.now(),
    });

    // Create notification
    await db.collection("chatter_notifications").add({
      chatterId,
      type: "captain_promoted",
      title: "Promotion Capitaine !",
      message: "F\u00e9licitations ! Vous avez \u00e9t\u00e9 promu Capitaine Chatter. Vous recevrez des commissions sur les appels de votre \u00e9quipe.",
      read: false,
      createdAt: Timestamp.now(),
    });

    logger.info("[adminPromoteToCaptain] Chatter promoted to captain", {
      chatterId,
      promotedBy: request.auth.uid,
    });

    return { success: true, message: "Chatter promoted to captain" };
  }
);

// ============================================================================
// 2. REVOKE CAPTAIN
// ============================================================================

export const adminRevokeCaptain = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    await verifyAdmin(request.auth.uid);

    const { chatterId } = request.data as { chatterId: string };
    if (!chatterId) {
      throw new HttpsError("invalid-argument", "chatterId is required");
    }

    const db = getDb();
    const chatterRef = db.collection("chatters").doc(chatterId);
    const chatterDoc = await chatterRef.get();

    if (!chatterDoc.exists) {
      throw new HttpsError("not-found", "Chatter not found");
    }

    const chatter = chatterDoc.data() as Chatter;
    if (chatter.role !== "captainChatter") {
      throw new HttpsError("failed-precondition", "Chatter is not a captain");
    }

    await chatterRef.update({
      role: FieldValue.delete(),
      captainPromotedAt: FieldValue.delete(),
      captainPromotedBy: FieldValue.delete(),
      captainMonthlyTeamCalls: FieldValue.delete(),
      captainCurrentTier: FieldValue.delete(),
      captainQualityBonusEnabled: FieldValue.delete(),
      updatedAt: Timestamp.now(),
    });

    // Create notification
    await db.collection("chatter_notifications").add({
      chatterId,
      type: "captain_revoked",
      title: "Statut capitaine r\u00e9voqu\u00e9",
      message: "Votre statut de Capitaine Chatter a \u00e9t\u00e9 r\u00e9voqu\u00e9 par l'administration.",
      read: false,
      createdAt: Timestamp.now(),
    });

    logger.info("[adminRevokeCaptain] Captain status revoked", {
      chatterId,
      revokedBy: request.auth.uid,
    });

    return { success: true, message: "Captain status revoked" };
  }
);

// ============================================================================
// 3. TOGGLE QUALITY BONUS
// ============================================================================

export const adminToggleCaptainQualityBonus = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    await verifyAdmin(request.auth.uid);

    const { chatterId, enabled } = request.data as { chatterId: string; enabled: boolean };
    if (!chatterId || enabled === undefined) {
      throw new HttpsError("invalid-argument", "chatterId and enabled are required");
    }

    const db = getDb();
    const chatterRef = db.collection("chatters").doc(chatterId);
    const chatterDoc = await chatterRef.get();

    if (!chatterDoc.exists) {
      throw new HttpsError("not-found", "Chatter not found");
    }

    const chatter = chatterDoc.data() as Chatter;
    if (chatter.role !== "captainChatter") {
      throw new HttpsError("failed-precondition", "Chatter is not a captain");
    }

    await chatterRef.update({
      captainQualityBonusEnabled: enabled,
      updatedAt: Timestamp.now(),
    });

    logger.info("[adminToggleCaptainQualityBonus] Quality bonus toggled", {
      chatterId,
      enabled,
      toggledBy: request.auth.uid,
    });

    return { success: true, enabled };
  }
);

// ============================================================================
// 4. GET CAPTAINS LIST
// ============================================================================

export const adminGetCaptainsList = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    await verifyAdmin(request.auth.uid);

    const db = getDb();

    const captainsQuery = await db
      .collection("chatters")
      .where("role", "==", "captainChatter")
      .get();

    const captains = [];
    for (const doc of captainsQuery.docs) {
      const captain = doc.data() as Chatter;

      // Count N1 recruits
      const n1Query = await db
        .collection("chatters")
        .where("recruitedBy", "==", doc.id)
        .where("status", "==", "active")
        .get();

      // Count N2 recruits
      let n2Count = 0;
      for (const n1Doc of n1Query.docs) {
        const n2Query = await db
          .collection("chatters")
          .where("recruitedBy", "==", n1Doc.id)
          .where("status", "==", "active")
          .get();
        n2Count += n2Query.size;
      }

      captains.push({
        id: doc.id,
        firstName: captain.firstName,
        lastName: captain.lastName,
        email: captain.email,
        country: captain.country,
        photoUrl: captain.photoUrl,
        captainPromotedAt: captain.captainPromotedAt,
        captainMonthlyTeamCalls: captain.captainMonthlyTeamCalls || 0,
        captainCurrentTier: captain.captainCurrentTier,
        captainQualityBonusEnabled: captain.captainQualityBonusEnabled || false,
        n1Count: n1Query.size,
        n2Count,
        totalEarned: captain.totalEarned,
      });
    }

    // Group by country
    const byCountry: Record<string, typeof captains> = {};
    for (const captain of captains) {
      const country = captain.country || "Unknown";
      if (!byCountry[country]) byCountry[country] = [];
      byCountry[country].push(captain);
    }

    return {
      captains,
      byCountry,
      totalCaptains: captains.length,
      countriesCovered: Object.keys(byCountry).length,
    };
  }
);

// ============================================================================
// 5. GET CAPTAIN DETAIL
// ============================================================================

export const adminGetCaptainDetail = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    await verifyAdmin(request.auth.uid);

    const { captainId } = request.data as { captainId: string };
    if (!captainId) {
      throw new HttpsError("invalid-argument", "captainId is required");
    }

    const db = getDb();
    const captainDoc = await db.collection("chatters").doc(captainId).get();

    if (!captainDoc.exists) {
      throw new HttpsError("not-found", "Captain not found");
    }

    const captain = captainDoc.data() as Chatter;
    if (captain.role !== "captainChatter") {
      throw new HttpsError("failed-precondition", "Chatter is not a captain");
    }

    // Get N1 recruits with stats
    const n1Query = await db
      .collection("chatters")
      .where("recruitedBy", "==", captainId)
      .where("status", "==", "active")
      .get();

    const n1Recruits = n1Query.docs.map((doc) => {
      const data = doc.data() as Chatter;
      return {
        id: doc.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        totalCallCount: data.totalCallCount || 0,
        totalEarned: data.totalEarned || 0,
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
          email: data.email,
          totalCallCount: data.totalCallCount || 0,
          totalEarned: data.totalEarned || 0,
          recruitedVia: n1Doc.id,
          createdAt: data.createdAt,
        });
      }
    }

    // Get captain_call commissions this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const commissionsQuery = await db
      .collection("chatter_commissions")
      .where("chatterId", "==", captainId)
      .where("type", "==", "captain_call")
      .where("createdAt", ">=", Timestamp.fromDate(monthStart))
      .get();

    const monthlyCommissions = commissionsQuery.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get archives
    const archivesQuery = await db
      .collection("captain_monthly_archives")
      .where("captainId", "==", captainId)
      .orderBy("createdAt", "desc")
      .limit(12)
      .get();

    const archives = archivesQuery.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Load config for tier info
    let config: ChatterConfig;
    try {
      config = await getChatterConfig();
    } catch {
      config = DEFAULT_CHATTER_CONFIG;
    }

    const tiers = config.captainTiers || DEFAULT_CHATTER_CONFIG.captainTiers!;

    return {
      captain: {
        id: captainId,
        firstName: captain.firstName,
        lastName: captain.lastName,
        email: captain.email,
        country: captain.country,
        photoUrl: captain.photoUrl,
        captainPromotedAt: captain.captainPromotedAt,
        captainMonthlyTeamCalls: captain.captainMonthlyTeamCalls || 0,
        captainCurrentTier: captain.captainCurrentTier,
        captainQualityBonusEnabled: captain.captainQualityBonusEnabled || false,
        totalEarned: captain.totalEarned,
      },
      n1Recruits,
      n2Recruits,
      monthlyCommissions,
      archives,
      tiers,
    };
  }
);

// ============================================================================
// 6. GET CAPTAIN PAYMENT SUMMARY
// ============================================================================

export const adminGetCaptainPaymentSummary = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    await verifyAdmin(request.auth.uid);

    const db = getDb();

    // Get all captain_call commissions this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const commissionsQuery = await db
      .collection("chatter_commissions")
      .where("type", "in", ["captain_call", "captain_tier_bonus", "captain_quality_bonus"])
      .where("createdAt", ">=", Timestamp.fromDate(monthStart))
      .where("status", "!=", "cancelled")
      .get();

    // Group by captain
    const byCaptain: Record<string, {
      captainCallTotal: number;
      captainCallCount: number;
      tierBonus: number;
      qualityBonus: number;
    }> = {};

    for (const doc of commissionsQuery.docs) {
      const data = doc.data();
      const id = data.chatterId;
      if (!byCaptain[id]) {
        byCaptain[id] = { captainCallTotal: 0, captainCallCount: 0, tierBonus: 0, qualityBonus: 0 };
      }
      if (data.type === "captain_call") {
        byCaptain[id].captainCallTotal += data.amount;
        byCaptain[id].captainCallCount += 1;
      } else if (data.type === "captain_tier_bonus") {
        byCaptain[id].tierBonus += data.amount;
      } else if (data.type === "captain_quality_bonus") {
        byCaptain[id].qualityBonus += data.amount;
      }
    }

    // Get captain names
    const summary = [];
    for (const [captainId, stats] of Object.entries(byCaptain)) {
      const captainDoc = await db.collection("chatters").doc(captainId).get();
      const captain = captainDoc.exists ? captainDoc.data() as Chatter : null;

      summary.push({
        captainId,
        firstName: captain?.firstName || "Unknown",
        lastName: captain?.lastName || "",
        country: captain?.country || "",
        ...stats,
        total: stats.captainCallTotal + stats.tierBonus + stats.qualityBonus,
      });
    }

    summary.sort((a, b) => b.total - a.total);

    return {
      summary,
      grandTotal: summary.reduce((sum, s) => sum + s.total, 0),
      totalCaptainCalls: summary.reduce((sum, s) => sum + s.captainCallCount, 0),
    };
  }
);

// ============================================================================
// 7. EXPORT CAPTAIN CSV
// ============================================================================

export const adminExportCaptainCSV = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    await verifyAdmin(request.auth.uid);

    const db = getDb();

    const captainsQuery = await db
      .collection("chatters")
      .where("role", "==", "captainChatter")
      .get();

    const rows: string[] = [];
    rows.push("ID,Pr\u00e9nom,Nom,Email,Pays,Promu le,Appels \u00e9quipe mois,Palier,Bonus qualit\u00e9,Total gagn\u00e9");

    for (const doc of captainsQuery.docs) {
      const c = doc.data() as Chatter;
      const promotedAt = c.captainPromotedAt
        ? new Date((c.captainPromotedAt as Timestamp).toMillis()).toISOString().split("T")[0]
        : "";
      rows.push(
        [
          doc.id,
          c.firstName,
          c.lastName,
          c.email,
          c.country || "",
          promotedAt,
          c.captainMonthlyTeamCalls || 0,
          c.captainCurrentTier || "",
          c.captainQualityBonusEnabled ? "Oui" : "Non",
          ((c.totalEarned || 0) / 100).toFixed(2),
        ].join(",")
      );
    }

    return { csv: "\uFEFF" + rows.join("\n") };
  }
);
