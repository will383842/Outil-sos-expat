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
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
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
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
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
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
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
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
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
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
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
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
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
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
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
