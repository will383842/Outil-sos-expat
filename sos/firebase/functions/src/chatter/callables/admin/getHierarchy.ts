/**
 * adminGetChatterHierarchy - Returns the full chatter hierarchy with stats for admin console
 *
 * Builds a tree structure: Captains → assigned chatters → N1 referrals → N2 referrals
 * Calculates global stats, per-captain stats, per-chatter stats
 * Identifies orphans (no captain), root chatters (no recruitedBy)
 * Generates alerts (inactive, empty teams, unbalanced teams)
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { chatterAdminConfig } from "../../../lib/functionConfigs";

// ============================================================================
// INITIALIZATION
// ============================================================================

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

function getDb() {
  ensureInitialized();
  return getFirestore();
}

async function verifyAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const uid = request.auth.uid;
  const role = request.auth.token?.role as string | undefined;
  if (role === "admin" || role === "superadmin") return uid;

  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists || !["admin", "superadmin"].includes(userDoc.data()?.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
  return uid;
}

// ============================================================================
// TYPES
// ============================================================================

interface ChatterTreeNode {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  role?: string;
  lastLoginAt: string | null;
  recruitedBy: string | null;
  recruitedByName: string | null;
  captainId: string | null;
  captainName: string | null;
  totalEarned: number;
  availableBalance: number;
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
  qualifiedReferralsCount: number;
  referralsN2Count: number;
  registeredAt: string | null;
  children: ChatterTreeNode[];
}

interface CaptainTeamStats {
  totalMembers: number;
  activeMembers: number;
  percentActive: number;
  connectedLast7d: number;
  connectedLast30d: number;
  percentConnected7d: number;
  totalTeamEarnings: number;
  monthlyTeamCalls: number;
  tier: string | null;
}

interface CaptainTeam {
  captain: ChatterTreeNode;
  members: ChatterTreeNode[];
  stats: CaptainTeamStats;
}

interface HierarchyAlert {
  type: "inactive_7d" | "inactive_30d" | "orphan" | "empty_team" | "unbalanced_team" | "no_referrals";
  severity: "warning" | "danger" | "info";
  chatterId: string;
  chatterName: string;
  captainId?: string;
  captainName?: string;
  message: string;
}

interface GlobalStats {
  totalChatters: number;
  totalCaptains: number;
  totalActive: number;
  totalInactive: number;
  percentActive: number;
  totalBanned: number;
  totalSuspended: number;
  connectedLast7d: number;
  connectedLast30d: number;
  percentConnected7d: number;
  percentConnected30d: number;
  totalOrphans: number;
  totalWithoutParent: number;
  totalEarningsAllTime: number;
}

interface GetChatterHierarchyResponse {
  globalStats: GlobalStats;
  captainTeams: CaptainTeam[];
  orphans: ChatterTreeNode[];
  alerts: HierarchyAlert[];
}

// ============================================================================
// HELPERS
// ============================================================================

/** Convert Firestore Timestamp or similar to Date */
function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (ts._seconds) return new Date(ts._seconds * 1000);
  if (ts instanceof Date) return ts;
  return null;
}

function toISOString(ts: any): string | null {
  const d = toDate(ts);
  return d ? d.toISOString() : null;
}

// ============================================================================
// CLOUD FUNCTION
// ============================================================================

export const adminGetChatterHierarchy = onCall(
  { ...chatterAdminConfig, memory: "512MiB", cpu: 0.5, timeoutSeconds: 60 },
  async (request): Promise<GetChatterHierarchyResponse> => {
    const adminUid = await verifyAdmin(request);
    const db = getDb();

    logger.info("adminGetChatterHierarchy called", { adminUid });

    // 1. Fetch ALL chatters
    const chattersSnap = await db.collection("chatters").get();
    const chattersMap = new Map<string, any>();
    const allChatters: any[] = [];

    chattersSnap.docs.forEach((doc) => {
      const data = { id: doc.id, ...doc.data() };
      chattersMap.set(doc.id, data);
      allChatters.push(data);
    });

    logger.info(`Fetched ${allChatters.length} chatters`);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Helper to build a tree node
    function toTreeNode(c: any): ChatterTreeNode {
      const recruitedByData = c.recruitedBy ? chattersMap.get(c.recruitedBy) : null;
      const captainData = c.captainId ? chattersMap.get(c.captainId) : null;
      return {
        id: c.id,
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        email: c.email || "",
        status: c.status || "unknown",
        role: c.role,
        lastLoginAt: toISOString(c.lastLoginAt),
        recruitedBy: c.recruitedBy || null,
        recruitedByName: recruitedByData
          ? `${recruitedByData.firstName || ""} ${recruitedByData.lastName || ""}`.trim()
          : null,
        captainId: c.captainId || null,
        captainName: captainData
          ? `${captainData.firstName || ""} ${captainData.lastName || ""}`.trim()
          : null,
        totalEarned: c.totalEarned || 0,
        availableBalance: c.availableBalance || 0,
        affiliateCodeClient: c.affiliateCodeClient || "",
        affiliateCodeRecruitment: c.affiliateCodeRecruitment || "",
        qualifiedReferralsCount: c.qualifiedReferralsCount || 0,
        referralsN2Count: c.referralsN2Count || 0,
        registeredAt: toISOString(c.registeredAt || c.createdAt),
        children: [],
      };
    }

    // 2. Build parent→children map
    const childrenMap = new Map<string, string[]>();
    allChatters.forEach((c) => {
      if (c.recruitedBy) {
        const existing = childrenMap.get(c.recruitedBy) || [];
        existing.push(c.id);
        childrenMap.set(c.recruitedBy, existing);
      }
    });

    // Build tree recursively (max depth 3 for safety)
    function buildTree(chatterId: string, depth: number = 0): ChatterTreeNode {
      const chatter = chattersMap.get(chatterId);
      if (!chatter) return toTreeNode({ id: chatterId });
      const node = toTreeNode(chatter);
      if (depth < 3) {
        const childIds = childrenMap.get(chatterId) || [];
        node.children = childIds.map((cid) => buildTree(cid, depth + 1));
      }
      return node;
    }

    // 3. Identify captains and their teams
    const captains = allChatters.filter((c) => c.role === "captainChatter");
    const captainTeams: CaptainTeam[] = [];

    for (const captain of captains) {
      // Members assigned to this captain
      const members = allChatters.filter(
        (c) => c.captainId === captain.id && c.id !== captain.id
      );
      const memberNodes = members.map((m) => buildTree(m.id, 0));

      const activeMembers = members.filter((m) => m.status === "active");
      const connected7d = members.filter((m) => {
        const d = toDate(m.lastLoginAt);
        return d && d >= sevenDaysAgo;
      });
      const connected30d = members.filter((m) => {
        const d = toDate(m.lastLoginAt);
        return d && d >= thirtyDaysAgo;
      });

      captainTeams.push({
        captain: buildTree(captain.id, 0),
        members: memberNodes,
        stats: {
          totalMembers: members.length,
          activeMembers: activeMembers.length,
          percentActive:
            members.length > 0
              ? Math.round((activeMembers.length / members.length) * 100)
              : 0,
          connectedLast7d: connected7d.length,
          connectedLast30d: connected30d.length,
          percentConnected7d:
            members.length > 0
              ? Math.round((connected7d.length / members.length) * 100)
              : 0,
          totalTeamEarnings: members.reduce(
            (sum, m) => sum + (m.totalEarned || 0),
            0
          ),
          monthlyTeamCalls: captain.captainMonthlyTeamCalls || 0,
          tier: captain.captainCurrentTier || null,
        },
      });
    }

    // Sort by team size desc
    captainTeams.sort((a, b) => b.stats.totalMembers - a.stats.totalMembers);

    // 4. Identify orphans (no captainId assigned, not a captain themselves)
    const captainIds = new Set(captains.map((c) => c.id));
    const orphanChatters = allChatters.filter(
      (c) => !c.captainId && !captainIds.has(c.id) && c.status !== "banned"
    );
    const orphanNodes = orphanChatters.map((c) => buildTree(c.id, 0));

    // 5. Calculate global stats
    const activeChatters = allChatters.filter((c) => c.status === "active");
    const bannedChatters = allChatters.filter((c) => c.status === "banned");
    const suspendedChatters = allChatters.filter((c) => c.status === "suspended");
    const allConnected7d = allChatters.filter((c) => {
      const d = toDate(c.lastLoginAt);
      return d && d >= sevenDaysAgo;
    });
    const allConnected30d = allChatters.filter((c) => {
      const d = toDate(c.lastLoginAt);
      return d && d >= thirtyDaysAgo;
    });
    const withoutParent = allChatters.filter((c) => !c.recruitedBy);

    const globalStats: GlobalStats = {
      totalChatters: allChatters.length,
      totalCaptains: captains.length,
      totalActive: activeChatters.length,
      totalInactive: allChatters.length - activeChatters.length,
      percentActive:
        allChatters.length > 0
          ? Math.round((activeChatters.length / allChatters.length) * 100)
          : 0,
      totalBanned: bannedChatters.length,
      totalSuspended: suspendedChatters.length,
      connectedLast7d: allConnected7d.length,
      connectedLast30d: allConnected30d.length,
      percentConnected7d:
        allChatters.length > 0
          ? Math.round((allConnected7d.length / allChatters.length) * 100)
          : 0,
      percentConnected30d:
        allChatters.length > 0
          ? Math.round((allConnected30d.length / allChatters.length) * 100)
          : 0,
      totalOrphans: orphanChatters.length,
      totalWithoutParent: withoutParent.length,
      totalEarningsAllTime: allChatters.reduce(
        (sum, c) => sum + (c.totalEarned || 0),
        0
      ),
    };

    // 6. Generate alerts
    const alerts: HierarchyAlert[] = [];

    // Inactive alerts
    for (const c of activeChatters) {
      const d = toDate(c.lastLoginAt);
      const chatterName = `${c.firstName || ""} ${c.lastName || ""}`.trim();
      const captainData = c.captainId ? chattersMap.get(c.captainId) : null;

      if (!d || d < thirtyDaysAgo) {
        alerts.push({
          type: "inactive_30d",
          severity: "danger",
          chatterId: c.id,
          chatterName,
          captainId: c.captainId || undefined,
          captainName: captainData
            ? `${captainData.firstName} ${captainData.lastName}`.trim()
            : undefined,
          message: `Inactif depuis ${
            d
              ? Math.round((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000)) + " jours"
              : "toujours"
          }`,
        });
      } else if (d < sevenDaysAgo) {
        alerts.push({
          type: "inactive_7d",
          severity: "warning",
          chatterId: c.id,
          chatterName,
          captainId: c.captainId || undefined,
          captainName: captainData
            ? `${captainData.firstName} ${captainData.lastName}`.trim()
            : undefined,
          message: `Inactif depuis ${Math.round(
            (now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000)
          )} jours`,
        });
      }
    }

    // Orphan alerts
    for (const c of orphanChatters) {
      if (c.status === "active") {
        alerts.push({
          type: "orphan",
          severity: "info",
          chatterId: c.id,
          chatterName: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
          message: "Aucun capitaine assign\u00e9",
        });
      }
    }

    // Empty captain teams
    for (const team of captainTeams) {
      if (team.stats.totalMembers === 0) {
        alerts.push({
          type: "empty_team",
          severity: "warning",
          chatterId: team.captain.id,
          chatterName: `${team.captain.firstName} ${team.captain.lastName}`.trim(),
          message: "Capitaine sans aucun membre dans son \u00e9quipe",
        });
      }
    }

    // Sort alerts: danger first, then warning, then info
    const severityOrder: Record<string, number> = { danger: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

    // Limit alerts to 100 most important
    const limitedAlerts = alerts.slice(0, 100);

    logger.info("adminGetChatterHierarchy complete", {
      totalChatters: allChatters.length,
      totalCaptains: captains.length,
      totalOrphans: orphanChatters.length,
      totalAlerts: limitedAlerts.length,
    });

    return {
      globalStats,
      captainTeams,
      orphans: orphanNodes,
      alerts: limitedAlerts,
    };
  }
);
