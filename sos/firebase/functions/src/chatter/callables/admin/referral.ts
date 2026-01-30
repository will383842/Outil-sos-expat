/**
 * Admin Callables: Referral System
 *
 * Admin functions for managing the 2-level referral system:
 * - Get referral stats
 * - View referral tree
 * - Manage early adopters
 * - Handle fraud alerts
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { adminConfig } from "../../../lib/functionConfigs";

import {
  Chatter,
  ChatterEarlyAdopterCounter,
  ChatterReferralCommission,
  ChatterReferralFraudAlert,
} from "../../types";
import {
  reviewFraudAlert,
} from "../../services/chatterReferralFraudService";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// ADMIN: GET REFERRAL STATS
// ============================================================================

interface GetReferralStatsResponse {
  totalParrains: number;
  totalFilleulsN1: number;
  totalFilleulsN2: number;
  totalQualifiedFilleuls: number;
  totalReferralEarnings: number;
  totalReferralCommissions: number;
  earlyAdopterCount: number;
  pendingFraudAlerts: number;
  topParrains: Array<{
    id: string;
    email: string;
    name: string;
    qualifiedFilleulsCount: number;
    referralEarnings: number;
  }>;
}

export const adminGetReferralStats = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<GetReferralStatsResponse> => {
    ensureInitialized();

    // Verify admin auth
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // TODO: Check admin role from custom claims
    // if (!request.auth.token.admin) {
    //   throw new HttpsError("permission-denied", "Admin access required");
    // }

    const db = getFirestore();

    try {
      // Get chatters with referral stats
      const chattersQuery = await db.collection("chatters").get();

      let totalParrains = 0;
      let totalFilleulsN1 = 0;
      let totalFilleulsN2 = 0;
      let totalQualifiedFilleuls = 0;
      let totalReferralEarnings = 0;
      let earlyAdopterCount = 0;

      const parrainsList: Array<{
        id: string;
        email: string;
        name: string;
        qualifiedFilleulsCount: number;
        referralEarnings: number;
      }> = [];

      for (const doc of chattersQuery.docs) {
        const chatter = doc.data() as Chatter;

        if (chatter.recruitedBy) {
          totalFilleulsN1++;
        }
        if (chatter.parrainNiveau2Id) {
          totalFilleulsN2++;
        }
        if (chatter.threshold50Reached) {
          totalQualifiedFilleuls++;
        }
        if (chatter.isEarlyAdopter) {
          earlyAdopterCount++;
        }

        const referralEarnings = chatter.referralEarnings || 0;
        totalReferralEarnings += referralEarnings;

        const qualifiedCount = chatter.qualifiedReferralsCount || 0;
        if (qualifiedCount > 0 || referralEarnings > 0) {
          totalParrains++;
          parrainsList.push({
            id: doc.id,
            email: chatter.email,
            name: `${chatter.firstName} ${chatter.lastName}`,
            qualifiedFilleulsCount: qualifiedCount,
            referralEarnings,
          });
        }
      }

      // Get commission count
      const commissionsQuery = await db
        .collection("chatter_referral_commissions")
        .count()
        .get();
      const totalReferralCommissions = commissionsQuery.data().count;

      // Get pending fraud alerts count
      const fraudAlertsQuery = await db
        .collection("chatter_referral_fraud_alerts")
        .where("status", "==", "pending")
        .count()
        .get();
      const pendingFraudAlerts = fraudAlertsQuery.data().count;

      // Sort parrains by referral earnings and take top 10
      parrainsList.sort((a, b) => b.referralEarnings - a.referralEarnings);
      const topParrains = parrainsList.slice(0, 10);

      return {
        totalParrains,
        totalFilleulsN1,
        totalFilleulsN2,
        totalQualifiedFilleuls,
        totalReferralEarnings,
        totalReferralCommissions,
        earlyAdopterCount,
        pendingFraudAlerts,
        topParrains,
      };
    } catch (error) {
      logger.error("[adminGetReferralStats] Error", { error });
      throw new HttpsError("internal", "Failed to get referral stats");
    }
  }
);

// ============================================================================
// ADMIN: GET REFERRAL TREE
// ============================================================================

interface GetReferralTreeInput {
  chatterId: string;
  maxDepth?: number;
}

interface ReferralTreeNode {
  id: string;
  email: string;
  name: string;
  level: number;
  clientEarnings: number;
  referralEarnings: number;
  isQualified: boolean;
  isEarlyAdopter: boolean;
  filleuls: ReferralTreeNode[];
}

interface GetReferralTreeResponse {
  root: ReferralTreeNode;
  totalNodes: number;
}

export const adminGetReferralTree = onCall(
  { ...adminConfig, timeoutSeconds: 120 },
  async (request): Promise<GetReferralTreeResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as GetReferralTreeInput;
    const maxDepth = input.maxDepth || 3;
    const db = getFirestore();

    try {
      // Helper to build tree recursively
      async function buildTree(chatterId: string, depth: number): Promise<ReferralTreeNode | null> {
        if (depth > maxDepth) return null;

        const chatterDoc = await db.collection("chatters").doc(chatterId).get();
        if (!chatterDoc.exists) return null;

        const chatter = chatterDoc.data() as Chatter;

        const node: ReferralTreeNode = {
          id: chatterId,
          email: chatter.email,
          name: `${chatter.firstName} ${chatter.lastName}`,
          level: depth,
          clientEarnings: chatter.totalEarned - (chatter.referralEarnings || 0),
          referralEarnings: chatter.referralEarnings || 0,
          isQualified: chatter.threshold50Reached || false,
          isEarlyAdopter: chatter.isEarlyAdopter || false,
          filleuls: [],
        };

        // Get filleuls
        const filleulsQuery = await db
          .collection("chatters")
          .where("recruitedBy", "==", chatterId)
          .get();

        for (const filleulDoc of filleulsQuery.docs) {
          const filleulNode = await buildTree(filleulDoc.id, depth + 1);
          if (filleulNode) {
            node.filleuls.push(filleulNode);
          }
        }

        return node;
      }

      const root = await buildTree(input.chatterId, 0);
      if (!root) {
        throw new HttpsError("not-found", "Chatter not found");
      }

      // Count total nodes
      function countNodes(node: ReferralTreeNode): number {
        return 1 + node.filleuls.reduce((sum, child) => sum + countNodes(child), 0);
      }

      return {
        root,
        totalNodes: countNodes(root),
      };
    } catch (error) {
      logger.error("[adminGetReferralTree] Error", { error });
      throw new HttpsError("internal", "Failed to get referral tree");
    }
  }
);

// ============================================================================
// ADMIN: GET EARLY ADOPTERS
// ============================================================================

interface GetEarlyAdoptersInput {
  country?: string;
  limit?: number;
}

interface GetEarlyAdoptersResponse {
  counters: Array<{
    countryCode: string;
    countryName: string;
    currentCount: number;
    maxEarlyAdopters: number;
    remainingSlots: number;
    isOpen: boolean;
  }>;
  earlyAdopters: Array<{
    id: string;
    email: string;
    name: string;
    country: string;
    earlyAdopterDate: string;
    referralEarnings: number;
    qualifiedFilleulsCount: number;
  }>;
}

export const adminGetEarlyAdopters = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<GetEarlyAdoptersResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as GetEarlyAdoptersInput;
    const db = getFirestore();

    try {
      // Get counters
      let countersQuery = db.collection("chatter_early_adopter_counters");
      if (input.country) {
        countersQuery = countersQuery.where("countryCode", "==", input.country) as any;
      }

      const countersSnapshot = await countersQuery.get();
      const counters = countersSnapshot.docs.map((doc) => {
        const data = doc.data() as ChatterEarlyAdopterCounter;
        return {
          countryCode: data.countryCode,
          countryName: data.countryName,
          currentCount: data.currentCount,
          maxEarlyAdopters: data.maxEarlyAdopters,
          remainingSlots: data.remainingSlots,
          isOpen: data.isOpen,
        };
      });

      // Get early adopters
      let adoptersQuery = db
        .collection("chatters")
        .where("isEarlyAdopter", "==", true)
        .orderBy("earlyAdopterDate", "desc");

      if (input.country) {
        adoptersQuery = adoptersQuery.where("earlyAdopterCountry", "==", input.country);
      }

      const adoptersSnapshot = await adoptersQuery.limit(input.limit || 100).get();
      const earlyAdopters = adoptersSnapshot.docs.map((doc) => {
        const chatter = doc.data() as Chatter;
        return {
          id: doc.id,
          email: chatter.email,
          name: `${chatter.firstName} ${chatter.lastName}`,
          country: chatter.earlyAdopterCountry || chatter.country,
          earlyAdopterDate: chatter.earlyAdopterDate?.toDate().toISOString() || "",
          referralEarnings: chatter.referralEarnings || 0,
          qualifiedFilleulsCount: chatter.qualifiedReferralsCount || 0,
        };
      });

      return { counters, earlyAdopters };
    } catch (error) {
      logger.error("[adminGetEarlyAdopters] Error", { error });
      throw new HttpsError("internal", "Failed to get early adopters");
    }
  }
);

// ============================================================================
// ADMIN: UPDATE EARLY ADOPTER QUOTA
// ============================================================================

interface UpdateEarlyAdopterQuotaInput {
  countryCode: string;
  newMaxEarlyAdopters: number;
}

export const adminUpdateEarlyAdopterQuota = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as UpdateEarlyAdopterQuotaInput;
    const db = getFirestore();

    try {
      const counterRef = db.collection("chatter_early_adopter_counters").doc(input.countryCode);
      const counterDoc = await counterRef.get();

      if (!counterDoc.exists) {
        // Create new counter
        const counter: ChatterEarlyAdopterCounter = {
          countryCode: input.countryCode,
          countryName: input.countryCode, // Should be updated with actual name
          maxEarlyAdopters: input.newMaxEarlyAdopters,
          currentCount: 0,
          remainingSlots: input.newMaxEarlyAdopters,
          isOpen: true,
          earlyAdopterIds: [],
          updatedAt: Timestamp.now(),
        };
        await counterRef.set(counter);
      } else {
        const current = counterDoc.data() as ChatterEarlyAdopterCounter;
        const newRemaining = input.newMaxEarlyAdopters - current.currentCount;

        await counterRef.update({
          maxEarlyAdopters: input.newMaxEarlyAdopters,
          remainingSlots: Math.max(0, newRemaining),
          isOpen: newRemaining > 0,
          updatedAt: Timestamp.now(),
        });
      }

      logger.info("[adminUpdateEarlyAdopterQuota] Quota updated", {
        countryCode: input.countryCode,
        newMax: input.newMaxEarlyAdopters,
      });

      return { success: true };
    } catch (error) {
      logger.error("[adminUpdateEarlyAdopterQuota] Error", { error });
      throw new HttpsError("internal", "Failed to update quota");
    }
  }
);

// ============================================================================
// ADMIN: INITIALIZE ALL EARLY ADOPTER COUNTERS
// ============================================================================

// All supported countries - GLOBAL (All continents)
const SUPPORTED_PIONEER_COUNTRIES: Array<{ code: string; name: string }> = [
  // ========== AFRICA (34 countries) ==========
  // Francophone
  { code: "SN", name: "Senegal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "CM", name: "Cameroon" },
  { code: "ML", name: "Mali" },
  { code: "BF", name: "Burkina Faso" },
  { code: "TG", name: "Togo" },
  { code: "BJ", name: "Benin" },
  { code: "NE", name: "Niger" },
  { code: "GN", name: "Guinea" },
  { code: "GA", name: "Gabon" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "DR Congo" },
  { code: "MG", name: "Madagascar" },
  { code: "MU", name: "Mauritius" },
  { code: "MA", name: "Morocco" },
  { code: "TN", name: "Tunisia" },
  { code: "DZ", name: "Algeria" },
  // Anglophone
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "TZ", name: "Tanzania" },
  { code: "UG", name: "Uganda" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "ZM", name: "Zambia" },
  { code: "RW", name: "Rwanda" },
  { code: "MW", name: "Malawi" },
  { code: "BW", name: "Botswana" },
  { code: "NA", name: "Namibia" },
  { code: "GM", name: "Gambia" },
  { code: "SL", name: "Sierra Leone" },
  { code: "LR", name: "Liberia" },
  { code: "ET", name: "Ethiopia" },
  { code: "EG", name: "Egypt" },

  // ========== EUROPE (25 countries) ==========
  { code: "FR", name: "France" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "PL", name: "Poland" },
  { code: "RO", name: "Romania" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "GR", name: "Greece" },
  { code: "CZ", name: "Czech Republic" },
  { code: "HU", name: "Hungary" },
  { code: "UA", name: "Ukraine" },
  { code: "RU", name: "Russia" },
  { code: "TR", name: "Turkey" },
  { code: "RS", name: "Serbia" },
  { code: "HR", name: "Croatia" },

  // ========== AMERICAS (20 countries) ==========
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "CO", name: "Colombia" },
  { code: "CL", name: "Chile" },
  { code: "PE", name: "Peru" },
  { code: "VE", name: "Venezuela" },
  { code: "EC", name: "Ecuador" },
  { code: "GT", name: "Guatemala" },
  { code: "CU", name: "Cuba" },
  { code: "DO", name: "Dominican Republic" },
  { code: "HT", name: "Haiti" },
  { code: "BO", name: "Bolivia" },
  { code: "PY", name: "Paraguay" },
  { code: "UY", name: "Uruguay" },
  { code: "PA", name: "Panama" },
  { code: "CR", name: "Costa Rica" },
  { code: "JM", name: "Jamaica" },

  // ========== ASIA (25 countries) ==========
  { code: "CN", name: "China" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "PH", name: "Philippines" },
  { code: "MY", name: "Malaysia" },
  { code: "SG", name: "Singapore" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "IL", name: "Israel" },
  { code: "LB", name: "Lebanon" },
  { code: "JO", name: "Jordan" },
  { code: "IQ", name: "Iraq" },
  { code: "IR", name: "Iran" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "NP", name: "Nepal" },
  { code: "LK", name: "Sri Lanka" },
  { code: "MM", name: "Myanmar" },
  { code: "KH", name: "Cambodia" },

  // ========== OCEANIA (5 countries) ==========
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "FJ", name: "Fiji" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "NC", name: "New Caledonia" },
];

const DEFAULT_PIONEER_SLOTS = 50;

interface InitializeCountersResponse {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  countries: string[];
}

export const adminInitializeAllEarlyAdopterCounters = onCall(
  { ...adminConfig, timeoutSeconds: 120 },
  async (request): Promise<InitializeCountersResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const db = getFirestore();
    const result: InitializeCountersResponse = {
      success: true,
      created: 0,
      updated: 0,
      skipped: 0,
      countries: [],
    };

    try {
      const batch = db.batch();

      for (const country of SUPPORTED_PIONEER_COUNTRIES) {
        const counterRef = db.collection("chatter_early_adopter_counters").doc(country.code);
        const counterDoc = await counterRef.get();

        if (!counterDoc.exists) {
          // Create new counter
          const counter: ChatterEarlyAdopterCounter = {
            countryCode: country.code,
            countryName: country.name,
            maxEarlyAdopters: DEFAULT_PIONEER_SLOTS,
            currentCount: 0,
            remainingSlots: DEFAULT_PIONEER_SLOTS,
            isOpen: true,
            earlyAdopterIds: [],
            updatedAt: Timestamp.now(),
          };
          batch.set(counterRef, counter);
          result.created++;
          result.countries.push(country.code);
        } else {
          // Update country name if needed, but don't reset counters
          const existing = counterDoc.data() as ChatterEarlyAdopterCounter;
          if (existing.countryName !== country.name) {
            batch.update(counterRef, { countryName: country.name });
            result.updated++;
          } else {
            result.skipped++;
          }
        }
      }

      await batch.commit();

      logger.info("[adminInitializeAllEarlyAdopterCounters] Completed", {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
      });

      return result;
    } catch (error) {
      logger.error("[adminInitializeAllEarlyAdopterCounters] Error", { error });
      throw new HttpsError("internal", "Failed to initialize counters");
    }
  }
);

// ============================================================================
// ADMIN: GET REFERRAL FRAUD ALERTS
// ============================================================================

interface GetFraudAlertsInput {
  status?: "pending" | "confirmed" | "dismissed" | "resolved";
  severity?: "low" | "medium" | "high" | "critical";
  limit?: number;
}

interface GetFraudAlertsResponse {
  alerts: ChatterReferralFraudAlert[];
  totalCount: number;
}

export const adminGetReferralFraudAlerts = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<GetFraudAlertsResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as GetFraudAlertsInput;
    const db = getFirestore();

    try {
      let query: FirebaseFirestore.Query = db
        .collection("chatter_referral_fraud_alerts")
        .orderBy("createdAt", "desc");

      if (input.status) {
        query = query.where("status", "==", input.status);
      }
      if (input.severity) {
        query = query.where("severity", "==", input.severity);
      }

      const snapshot = await query.limit(input.limit || 50).get();
      const alerts = snapshot.docs.map((doc) => doc.data() as ChatterReferralFraudAlert);

      // Get total count
      const countQuery = await db
        .collection("chatter_referral_fraud_alerts")
        .where("status", "==", input.status || "pending")
        .count()
        .get();

      return {
        alerts,
        totalCount: countQuery.data().count,
      };
    } catch (error) {
      logger.error("[adminGetReferralFraudAlerts] Error", { error });
      throw new HttpsError("internal", "Failed to get fraud alerts");
    }
  }
);

// ============================================================================
// ADMIN: REVIEW FRAUD ALERT
// ============================================================================

interface ReviewFraudAlertInput {
  alertId: string;
  status: "confirmed" | "dismissed" | "resolved";
  actionTaken?: "none" | "warning_sent" | "suspended" | "banned";
  reviewNotes?: string;
}

export const adminReviewFraudAlert = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as ReviewFraudAlertInput;

    try {
      const result = await reviewFraudAlert(input.alertId, {
        status: input.status,
        actionTaken: input.actionTaken,
        reviewedBy: request.auth.uid,
        reviewNotes: input.reviewNotes,
      });

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to review alert");
      }

      return { success: true };
    } catch (error) {
      logger.error("[adminReviewFraudAlert] Error", { error });
      throw new HttpsError("internal", "Failed to review fraud alert");
    }
  }
);

// ============================================================================
// ADMIN: GET REFERRAL COMMISSIONS
// ============================================================================

interface GetReferralCommissionsInput {
  parrainId?: string;
  filleulId?: string;
  type?: ChatterReferralCommission["type"];
  status?: string;
  limit?: number;
  offset?: number;
}

interface GetReferralCommissionsResponse {
  commissions: ChatterReferralCommission[];
  totalCount: number;
  hasMore: boolean;
}

export const adminGetReferralCommissions = onCall(
  { ...adminConfig, memory: "256MiB", timeoutSeconds: 60 },
  async (request): Promise<GetReferralCommissionsResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const input = request.data as GetReferralCommissionsInput;
    const db = getFirestore();
    const limit = input.limit || 50;
    const offset = input.offset || 0;

    try {
      let query: FirebaseFirestore.Query = db
        .collection("chatter_referral_commissions")
        .orderBy("createdAt", "desc");

      if (input.parrainId) {
        query = query.where("parrainId", "==", input.parrainId);
      }
      if (input.filleulId) {
        query = query.where("filleulId", "==", input.filleulId);
      }
      if (input.type) {
        query = query.where("type", "==", input.type);
      }
      if (input.status) {
        query = query.where("status", "==", input.status);
      }

      const snapshot = await query.limit(limit + 1).offset(offset).get();

      const hasMore = snapshot.docs.length > limit;
      const commissions = snapshot.docs
        .slice(0, limit)
        .map((doc) => doc.data() as ChatterReferralCommission);

      // Get total count
      const countSnapshot = await db.collection("chatter_referral_commissions").count().get();

      return {
        commissions,
        totalCount: countSnapshot.data().count,
        hasMore,
      };
    } catch (error) {
      logger.error("[adminGetReferralCommissions] Error", { error });
      throw new HttpsError("internal", "Failed to get referral commissions");
    }
  }
);
