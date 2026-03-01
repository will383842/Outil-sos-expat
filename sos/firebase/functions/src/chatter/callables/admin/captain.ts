/**
 * Admin Captain Chatter Callables
 *
 * Admin-only functions for managing captain chatters.
 * Region: us-central1 (affiliate/marketing region)
 *
 * ## Captain Lifecycle
 *
 * **Promotion**: Manual admin action only (`adminPromoteToCaptain`).
 *   No automatic criteria — admin decides based on recruits, engagement, quality.
 *
 * **Monthly Reset** (1st of month, 00:05 UTC via `resetCaptainMonthly`):
 *   1. Calculate best tier from `captainMonthlyTeamCalls` (Bronze→Diamant)
 *   2. Pay tier bonus commission if any tier reached
 *   3. Pay quality bonus if: (10+ active N1 recruits AND $100+ team commissions) OR admin override
 *   4. Archive monthly stats to `captain_monthly_archives`
 *   5. Reset `captainMonthlyTeamCalls: 0` and `captainCurrentTier: null`
 *   NOTE: Reset does NOT revoke captain status — captain stays captain even with 0 calls.
 *
 * **Demotion/Revocation**: Manual admin action only (`adminRevokeCaptain`).
 *   - Deletes all `captain*` fields via FieldValue.delete()
 *   - Sends notification + creates audit log
 *   - There is NO automatic demotion. A captain remains captain indefinitely.
 *
 * **Tier Bonus Levels** (configurable in admin_config/chatter_config):
 *   Bronze: 20 calls → $25 | Argent: 50 → $50 | Or: 100 → $100
 *   Platine: 200 → $200 | Diamant: 400 → $400
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { chatterAdminConfig as adminConfig } from "../../../lib/functionConfigs";
import { Chatter } from "../../types";

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
// HELPERS
// ============================================================================

function timestampToString(ts: unknown): string {
  if (!ts) return "";
  if (typeof ts === "object" && ts !== null && "toDate" in ts && typeof (ts as any).toDate === "function") {
    return (ts as any).toDate().toISOString();
  }
  if (typeof ts === "object" && ts !== null && "_seconds" in ts) {
    return new Date((ts as any)._seconds * 1000).toISOString();
  }
  if (ts instanceof Date) return ts.toISOString();
  return String(ts);
}

/**
 * Maps French tier names (stored in Firestore) to lowercase English keys (used by frontend).
 */
function getCaptainTierKey(tierName: string | null | undefined): string {
  if (!tierName) return "bronze";
  const map: Record<string, string> = {
    Bronze: "bronze",
    Argent: "silver",
    Or: "gold",
    Platine: "platinum",
    Diamant: "diamond",
  };
  return map[tierName] || tierName.toLowerCase();
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

    const data = request.data as { chatterId?: string; captainId?: string };
    const chatterId = data.chatterId || data.captainId;
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
      isRead: false,
      createdAt: Timestamp.now(),
    });

    // Audit trail
    await db.collection("admin_audit_logs").add({
      action: "captain_promoted",
      targetId: chatterId,
      targetType: "chatter",
      performedBy: request.auth.uid,
      timestamp: Timestamp.now(),
      details: { previousRole: chatter.role || "chatter" },
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

    const data = request.data as { chatterId?: string; captainId?: string };
    const chatterId = data.chatterId || data.captainId;
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

    // Archive current month stats before revoking (so in-progress month data is not lost)
    const now = Timestamp.now();
    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const archiveId = `${chatterId}_${monthKey}_revoked`;
    const teamCalls = chatter.captainMonthlyTeamCalls || 0;
    if (teamCalls > 0) {
      await db.collection("captain_monthly_archives").doc(archiveId).set({
        captainId: chatterId,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        teamCalls,
        tierName: chatter.captainCurrentTier || "Aucun",
        tierReached: chatter.captainCurrentTier || null,
        tierBonus: 0,
        bonusAmount: 0,
        qualityBonusPaid: false,
        qualityBonusAmount: 0,
        qualityBonusCriteriaMet: false,
        qualityBonusAdminOverride: false,
        activeN1Count: 0,
        monthlyTeamCommissions: 0,
        revokedAt: now,
        createdAt: now,
      });
    }

    await chatterRef.update({
      role: FieldValue.delete(),
      captainPromotedAt: FieldValue.delete(),
      captainPromotedBy: FieldValue.delete(),
      captainMonthlyTeamCalls: FieldValue.delete(),
      captainCurrentTier: FieldValue.delete(),
      captainQualityBonusEnabled: FieldValue.delete(),
      updatedAt: now,
    });

    // Create notification
    await db.collection("chatter_notifications").add({
      chatterId,
      type: "captain_revoked",
      title: "Statut capitaine r\u00e9voqu\u00e9",
      message: "Votre statut de Capitaine Chatter a \u00e9t\u00e9 r\u00e9voqu\u00e9 par l'administration.",
      isRead: false,
      createdAt: Timestamp.now(),
    });

    // Audit trail
    await db.collection("admin_audit_logs").add({
      action: "captain_revoked",
      targetId: chatterId,
      targetType: "chatter",
      performedBy: request.auth.uid,
      timestamp: Timestamp.now(),
      details: {},
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

    const data = request.data as { chatterId?: string; captainId?: string; enabled: boolean };
    const chatterId = data.chatterId || data.captainId;
    if (!chatterId || data.enabled === undefined) {
      throw new HttpsError("invalid-argument", "chatterId/captainId and enabled are required");
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
      captainQualityBonusEnabled: data.enabled,
      updatedAt: Timestamp.now(),
    });

    // Audit trail
    await db.collection("admin_audit_logs").add({
      action: "captain_quality_bonus_toggled",
      targetId: chatterId,
      targetType: "chatter",
      performedBy: request.auth.uid,
      timestamp: Timestamp.now(),
      details: { enabled: data.enabled },
    });

    logger.info("[adminToggleCaptainQualityBonus] Quality bonus toggled", {
      chatterId,
      enabled: data.enabled,
      toggledBy: request.auth.uid,
    });

    return { success: true, enabled: data.enabled };
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

    const {
      page = 1,
      limit = 20,
      country,
      tier,
      search,
      includeStats = false,
    } = (request.data || {}) as {
      page?: number;
      limit?: number;
      country?: string;
      tier?: string;
      search?: string;
      includeStats?: boolean;
    };

    const db = getDb();

    // Get all captains
    const captainsQuery = await db
      .collection("chatters")
      .where("role", "==", "captainChatter")
      .get();

    // Build enriched captain list
    const allCaptains = [];
    for (const doc of captainsQuery.docs) {
      const captain = doc.data() as Chatter;

      // Count active N1 recruits
      const n1Query = await db
        .collection("chatters")
        .where("recruitedBy", "==", doc.id)
        .where("status", "==", "active")
        .get();

      // Count active N2 recruits
      let n2Count = 0;
      for (const n1Doc of n1Query.docs) {
        const n2Query = await db
          .collection("chatters")
          .where("recruitedBy", "==", n1Doc.id)
          .where("status", "==", "active")
          .get();
        n2Count += n2Query.size;
      }

      const tierKey = getCaptainTierKey(captain.captainCurrentTier);

      allCaptains.push({
        id: doc.id,
        firstName: captain.firstName,
        lastName: captain.lastName,
        email: captain.email,
        country: captain.country,
        tier: tierKey,
        n1Count: n1Query.size,
        n2Count,
        monthlyTeamCalls: captain.captainMonthlyTeamCalls || 0,
        totalEarnings: captain.totalEarned || 0,
        qualityBonusEnabled: captain.captainQualityBonusEnabled || false,
        assignedCountries: captain.captainAssignedCountries || [],
        assignedLanguages: captain.captainAssignedLanguages || [],
        createdAt: timestampToString(captain.createdAt),
        promotedAt: timestampToString(captain.captainPromotedAt),
      });
    }

    // Apply filters
    let filtered = allCaptains;

    if (country) {
      filtered = filtered.filter((c) => c.country === country);
    }
    if (tier) {
      filtered = filtered.filter((c) => c.tier === tier);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.firstName?.toLowerCase().includes(q) ||
          c.lastName?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;

    // Pagination
    const startIdx = (page - 1) * limit;
    const paginated = filtered.slice(startIdx, startIdx + limit);

    // Compute stats if requested (first page)
    let stats;
    if (includeStats) {
      // Count unique countries from all active chatters for coverage ratio
      const allChattersQuery = await db
        .collection("chatters")
        .where("status", "==", "active")
        .select("country")
        .get();

      const allCountries = new Set(
        allChattersQuery.docs.map((d) => d.data().country).filter(Boolean)
      );

      const captainCountries = new Set(
        allCaptains.map((c) => c.country).filter(Boolean)
      );

      const tierDistribution: Record<string, number> = {};
      let totalN1 = 0;
      let totalCalls = 0;
      for (const c of allCaptains) {
        tierDistribution[c.tier] = (tierDistribution[c.tier] || 0) + 1;
        totalN1 += c.n1Count;
        totalCalls += c.monthlyTeamCalls;
      }

      stats = {
        totalCaptains: allCaptains.length,
        countriesCovered: captainCountries.size,
        totalCountries: allCountries.size,
        avgN1PerCaptain: allCaptains.length > 0 ? totalN1 / allCaptains.length : 0,
        avgTeamCalls: allCaptains.length > 0 ? totalCalls / allCaptains.length : 0,
        tierDistribution,
      };
    }

    return {
      captains: paginated,
      total,
      page,
      limit,
      ...(stats ? { stats } : {}),
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

    // Get ALL N1 recruits (any status) for count + active count
    const n1AllQuery = await db
      .collection("chatters")
      .where("recruitedBy", "==", captainId)
      .get();

    const n1Recruits = n1AllQuery.docs.map((doc) => {
      const d = doc.data() as Chatter;
      return {
        id: doc.id,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        country: d.country,
        status: d.status || "pending",
        totalCalls: (d as any).totalCallCount || 0,
        totalEarned: d.totalEarned || 0,
        recruitedAt: timestampToString(d.createdAt),
      };
    });
    const n1Active = n1Recruits.filter((r) => r.status === "active").length;

    // Get ALL N2 recruits (any status)
    const n2Recruits: typeof n1Recruits = [];
    for (const n1Doc of n1AllQuery.docs) {
      const n2Query = await db
        .collection("chatters")
        .where("recruitedBy", "==", n1Doc.id)
        .get();

      for (const n2Doc of n2Query.docs) {
        const d = n2Doc.data() as Chatter;
        n2Recruits.push({
          id: n2Doc.id,
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          country: d.country,
          status: d.status || "pending",
          totalCalls: (d as any).totalCallCount || 0,
          totalEarned: d.totalEarned || 0,
          recruitedAt: timestampToString(d.createdAt),
        });
      }
    }
    const n2Active = n2Recruits.filter((r) => r.status === "active").length;

    // Get ALL captain commissions for financial aggregation
    const allCommissions = await db
      .collection("chatter_commissions")
      .where("chatterId", "==", captainId)
      .where("type", "in", ["captain_call", "captain_tier_bonus", "captain_quality_bonus"])
      .get();

    // Aggregate by month and compute totals
    const monthlyMap: Record<string, { n1: number; n2: number; quality: number; total: number }> = {};
    let totalCaptainEarnings = 0;
    let totalN1Commissions = 0;
    let totalN2Commissions = 0;
    let totalQualityBonuses = 0;
    let totalTeamCalls = 0;

    for (const doc of allCommissions.docs) {
      const comm = doc.data();
      const amount = comm.amount || 0;
      const createdAt = comm.createdAt;

      let date: Date;
      if (createdAt?.toDate) {
        date = createdAt.toDate();
      } else if (createdAt?._seconds) {
        date = new Date(createdAt._seconds * 1000);
      } else {
        continue;
      }

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { n1: 0, n2: 0, quality: 0, total: 0 };
      }

      monthlyMap[monthKey].total += amount;
      totalCaptainEarnings += amount;

      if (comm.type === "captain_call") {
        totalTeamCalls++;
        if (comm.metadata?.level === "n2") {
          monthlyMap[monthKey].n2 += amount;
          totalN2Commissions += amount;
        } else {
          // Default to N1 for captain_call
          monthlyMap[monthKey].n1 += amount;
          totalN1Commissions += amount;
        }
      } else if (comm.type === "captain_quality_bonus" || comm.type === "captain_tier_bonus") {
        monthlyMap[monthKey].quality += amount;
        totalQualityBonuses += amount;
      }
    }

    const monthlyCommissions = Object.entries(monthlyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, d]) => ({
        month,
        n1Commissions: d.n1,
        n2Commissions: d.n2,
        qualityBonus: d.quality,
        totalAmount: d.total,
      }));

    // Balances from chatter doc
    const availableBalance = (captain as any).availableBalance || 0;
    const pendingBalance = (captain as any).pendingBalance || 0;

    // Fetch monthly archives
    const archivesQuery = await db
      .collection("captain_monthly_archives")
      .where("captainId", "==", captainId)
      .orderBy("createdAt", "desc")
      .limit(24)
      .get();

    const archives = archivesQuery.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        month: d.month,
        year: d.year,
        teamCalls: d.teamCalls || 0,
        tierName: d.tierName || "Aucun",
        tierBonus: d.tierBonus || 0,
        qualityBonusPaid: d.qualityBonusPaid || false,
        qualityBonusAmount: d.qualityBonusAmount || 0,
        bonusAmount: d.bonusAmount || 0,
        activeN1Count: d.activeN1Count || 0,
        revokedAt: d.revokedAt ? timestampToString(d.revokedAt) : null,
        createdAt: timestampToString(d.createdAt),
      };
    });

    return {
      id: captainId,
      firstName: captain.firstName,
      lastName: captain.lastName,
      email: captain.email,
      phone: (captain as any).phone || "",
      country: captain.country,
      tier: getCaptainTierKey(captain.captainCurrentTier),
      qualityBonusEnabled: captain.captainQualityBonusEnabled || false,
      promotedAt: timestampToString(captain.captainPromotedAt),
      createdAt: timestampToString(captain.createdAt),
      // Network stats
      n1Count: n1Recruits.length,
      n2Count: n2Recruits.length,
      n1Active,
      n2Active,
      totalTeamCalls,
      monthlyTeamCalls: captain.captainMonthlyTeamCalls || 0,
      // Financial
      totalCaptainEarnings,
      totalN1Commissions,
      totalN2Commissions,
      totalQualityBonuses,
      availableBalance,
      pendingBalance,
      // Recruits
      n1Recruits,
      n2Recruits,
      // Monthly history (aggregated)
      monthlyCommissions,
      // Coverage
      assignedCountries: captain.captainAssignedCountries || [],
      assignedLanguages: captain.captainAssignedLanguages || [],
      // Affiliate codes
      affiliateCodeClient: captain.affiliateCodeClient || "",
      affiliateCodeRecruitment: captain.affiliateCodeRecruitment || "",
      // Monthly archives
      archives,
    };
  }
);

// ============================================================================
// 6. EXPORT CAPTAIN CSV
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

    // Helper to escape CSV field (wrap in quotes if contains comma, quote, or newline)
    const esc = (val: string | number): string => {
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows: string[] = [];
    rows.push("ID,Pr\u00e9nom,Nom,Email,Pays,Promu le,Appels \u00e9quipe mois,Palier,Bonus qualit\u00e9,Total gagn\u00e9");

    for (const doc of captainsQuery.docs) {
      const c = doc.data() as Chatter;
      const promotedAt = c.captainPromotedAt
        ? new Date((c.captainPromotedAt as Timestamp).toMillis()).toISOString().split("T")[0]
        : "";

      // Sum captain-only commissions for accurate "Total gagné"
      const captainCommissionsQuery = await db
        .collection("chatter_commissions")
        .where("chatterId", "==", doc.id)
        .where("type", "in", ["captain_call", "captain_tier_bonus", "captain_quality_bonus"])
        .get();
      const captainTotalEarned = captainCommissionsQuery.docs.reduce(
        (sum, d) => sum + (d.data().amount || 0), 0
      );

      rows.push(
        [
          esc(doc.id),
          esc(c.firstName),
          esc(c.lastName),
          esc(c.email),
          esc(c.country || ""),
          esc(promotedAt),
          esc(c.captainMonthlyTeamCalls || 0),
          esc(c.captainCurrentTier || ""),
          esc(c.captainQualityBonusEnabled ? "Oui" : "Non"),
          esc((captainTotalEarned / 100).toFixed(2)),
        ].join(",")
      );
    }

    return { csv: "\uFEFF" + rows.join("\n") };
  }
);

// ============================================================================
// 7. ASSIGN CAPTAIN COUNTRIES & LANGUAGES
// ============================================================================

export const adminAssignCaptainCoverage = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    await verifyAdmin(request.auth.uid);

    const { captainId, countries, languages } = request.data as {
      captainId?: string;
      countries?: string[];
      languages?: string[];
    };

    if (!captainId) {
      throw new HttpsError("invalid-argument", "captainId is required");
    }
    if (!countries && !languages) {
      throw new HttpsError("invalid-argument", "countries or languages is required");
    }

    const db = getDb();
    const chatterRef = db.collection("chatters").doc(captainId);
    const chatterDoc = await chatterRef.get();

    if (!chatterDoc.exists) {
      throw new HttpsError("not-found", "Chatter not found");
    }
    const chatter = chatterDoc.data() as Chatter;
    if (chatter.role !== "captainChatter") {
      throw new HttpsError("failed-precondition", "Chatter is not a captain");
    }

    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() };
    if (countries !== undefined) {
      updateData.captainAssignedCountries = countries;
    }
    if (languages !== undefined) {
      updateData.captainAssignedLanguages = languages;
    }

    await chatterRef.update(updateData);

    // Audit trail
    await db.collection("admin_audit_logs").add({
      action: "captain_coverage_updated",
      targetId: captainId,
      targetType: "chatter",
      performedBy: request.auth.uid,
      timestamp: Timestamp.now(),
      details: { countries, languages },
    });

    logger.info("[adminAssignCaptainCoverage] Coverage updated", {
      captainId,
      countries,
      languages,
      updatedBy: request.auth.uid,
    });

    return { success: true, countries, languages };
  }
);

// ============================================================================
// 8. TRANSFER CHATTERS BETWEEN CAPTAINS
// ============================================================================

export const adminTransferChatters = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }
    await verifyAdmin(request.auth.uid);

    const { chatterIds, fromCaptainId, toCaptainId } = request.data as {
      chatterIds: string[];
      fromCaptainId: string;
      toCaptainId: string;
    };

    if (!chatterIds?.length || !fromCaptainId || !toCaptainId) {
      throw new HttpsError("invalid-argument", "chatterIds, fromCaptainId, and toCaptainId are required");
    }
    if (fromCaptainId === toCaptainId) {
      throw new HttpsError("invalid-argument", "Source and target captain must be different");
    }

    const db = getDb();

    // Verify both are captains
    const [fromDoc, toDoc] = await Promise.all([
      db.collection("chatters").doc(fromCaptainId).get(),
      db.collection("chatters").doc(toCaptainId).get(),
    ]);

    if (!fromDoc.exists || (fromDoc.data() as Chatter).role !== "captainChatter") {
      throw new HttpsError("failed-precondition", "Source is not a captain");
    }
    if (!toDoc.exists || (toDoc.data() as Chatter).role !== "captainChatter") {
      throw new HttpsError("failed-precondition", "Target is not a captain");
    }

    const now = Timestamp.now();
    let transferred = 0;
    const errors: string[] = [];

    for (const chatterId of chatterIds) {
      try {
        const chatterDoc = await db.collection("chatters").doc(chatterId).get();
        if (!chatterDoc.exists) {
          errors.push(`${chatterId}: not found`);
          continue;
        }
        const chatter = chatterDoc.data() as Chatter;
        if (chatter.recruitedBy !== fromCaptainId) {
          errors.push(`${chatterId}: not recruited by source captain`);
          continue;
        }

        await db.collection("chatters").doc(chatterId).update({
          recruitedBy: toCaptainId,
          updatedAt: now,
        });
        transferred++;
      } catch (err) {
        errors.push(`${chatterId}: ${(err as Error).message}`);
      }
    }

    // Audit trail
    await db.collection("admin_audit_logs").add({
      action: "captain_chatters_transferred",
      performedBy: request.auth.uid,
      timestamp: now,
      details: {
        fromCaptainId,
        toCaptainId,
        chatterIds,
        transferred,
        errors,
      },
    });

    logger.info("[adminTransferChatters] Transfer complete", {
      fromCaptainId,
      toCaptainId,
      requested: chatterIds.length,
      transferred,
      errors: errors.length,
    });

    return { success: true, transferred, errors };
  }
);

// ============================================================================
// 9. GET CAPTAIN COVERAGE MAP (for admin matrix view)
// ============================================================================

export const adminGetCaptainCoverageMap = onCall(
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
      .where("status", "==", "active")
      .get();

    // Build country → captains mapping
    const countryMap: Record<string, Array<{
      id: string;
      firstName: string;
      lastName: string;
      country: string;
    }>> = {};

    // Build language → captains mapping
    const languageMap: Record<string, Array<{
      id: string;
      firstName: string;
      lastName: string;
    }>> = {};

    const captainsList: Array<{
      id: string;
      firstName: string;
      lastName: string;
      country: string;
      assignedCountries: string[];
      assignedLanguages: string[];
      n1Count: number;
      monthlyTeamCalls: number;
    }> = [];

    for (const doc of captainsQuery.docs) {
      const c = doc.data() as Chatter;
      const assignedCountries = c.captainAssignedCountries || [];
      const assignedLanguages = c.captainAssignedLanguages || [];

      // Count N1 for this captain
      const n1Query = await db
        .collection("chatters")
        .where("recruitedBy", "==", doc.id)
        .where("status", "==", "active")
        .get();

      const captainEntry = {
        id: doc.id,
        firstName: c.firstName,
        lastName: c.lastName,
        country: c.country || "",
        assignedCountries,
        assignedLanguages,
        n1Count: n1Query.size,
        monthlyTeamCalls: c.captainMonthlyTeamCalls || 0,
      };
      captainsList.push(captainEntry);

      // Map assigned countries
      for (const cc of assignedCountries) {
        if (!countryMap[cc]) countryMap[cc] = [];
        countryMap[cc].push({
          id: doc.id,
          firstName: c.firstName,
          lastName: c.lastName,
          country: c.country || "",
        });
      }

      // Also map the captain's own country if not already assigned
      if (c.country && !assignedCountries.includes(c.country)) {
        if (!countryMap[c.country]) countryMap[c.country] = [];
        countryMap[c.country].push({
          id: doc.id,
          firstName: c.firstName,
          lastName: c.lastName,
          country: c.country,
        });
      }

      // Map assigned languages
      for (const lang of assignedLanguages) {
        if (!languageMap[lang]) languageMap[lang] = [];
        languageMap[lang].push({
          id: doc.id,
          firstName: c.firstName,
          lastName: c.lastName,
        });
      }
    }

    return {
      captains: captainsList,
      countryMap,
      languageMap,
      totalCaptains: captainsList.length,
      coveredCountries: Object.keys(countryMap).length,
      coveredLanguages: Object.keys(languageMap).length,
    };
  }
);
