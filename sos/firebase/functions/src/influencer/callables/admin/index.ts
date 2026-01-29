/**
 * Admin Callables for Influencer System
 *
 * Administrative functions for managing influencers.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Influencer,
  InfluencerCommission,
  InfluencerWithdrawal,
  InfluencerReferral,
  InfluencerConfig,
  AdminGetInfluencersListInput,
  AdminGetInfluencersListResponse,
  AdminGetInfluencerDetailResponse,
  AdminProcessInfluencerWithdrawalInput,
  AdminUpdateInfluencerStatusInput,
} from "../../types";
import {
  getInfluencerConfigCached,
  updateInfluencerConfig,
  clearInfluencerConfigCache,
} from "../../utils";
import {
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal,
  failWithdrawal,
  getPendingWithdrawals,
} from "../../services";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Check if user is admin
 */
async function checkAdmin(auth: { uid: string } | undefined): Promise<string> {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const db = getFirestore();
  const userDoc = await db.collection("users").doc(auth.uid).get();

  if (!userDoc.exists || userDoc.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  return auth.uid;
}

// ============================================================================
// LIST INFLUENCERS
// ============================================================================

export const adminGetInfluencersList = onCall(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (request): Promise<AdminGetInfluencersListResponse> => {
    ensureInitialized();
    await checkAdmin(request.auth);

    const db = getFirestore();
    const input = request.data as AdminGetInfluencersListInput;

    const {
      status,
      country,
      language,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      limit = 50,
      offset = 0,
    } = input;

    try {
      let query = db.collection("influencers") as FirebaseFirestore.Query;

      // Apply filters
      if (status) {
        query = query.where("status", "==", status);
      }

      if (country) {
        query = query.where("country", "==", country.toUpperCase());
      }

      if (language) {
        query = query.where("language", "==", language);
      }

      // Apply sorting
      query = query.orderBy(sortBy, sortOrder);

      // Get total count (without pagination)
      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;

      // Apply pagination
      if (offset > 0) {
        const offsetSnapshot = await query.limit(offset).get();
        if (offsetSnapshot.docs.length > 0) {
          const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
          query = query.startAfter(lastDoc);
        }
      }

      query = query.limit(limit + 1);

      const snapshot = await query.get();

      let influencers = snapshot.docs.slice(0, limit).map((doc) => {
        const data = doc.data() as Influencer;
        return {
          id: data.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          country: data.country,
          status: data.status,
          totalEarned: data.totalEarned,
          totalClients: data.totalClients,
          totalRecruits: data.totalRecruits,
          currentMonthRank: data.currentMonthRank,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });

      // Apply search filter (client-side for text search)
      if (search) {
        const searchLower = search.toLowerCase();
        influencers = influencers.filter(
          (i) =>
            i.email.toLowerCase().includes(searchLower) ||
            i.firstName.toLowerCase().includes(searchLower) ||
            i.lastName.toLowerCase().includes(searchLower)
        );
      }

      return {
        influencers,
        total,
        hasMore: snapshot.docs.length > limit,
      };
    } catch (error) {
      logger.error("[adminGetInfluencersList] Error", { error });
      throw new HttpsError("internal", "Failed to get influencers list");
    }
  }
);

// ============================================================================
// GET INFLUENCER DETAIL
// ============================================================================

export const adminGetInfluencerDetail = onCall(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (request): Promise<AdminGetInfluencerDetailResponse> => {
    ensureInitialized();
    await checkAdmin(request.auth);

    const db = getFirestore();
    const { influencerId } = request.data as { influencerId: string };

    if (!influencerId) {
      throw new HttpsError("invalid-argument", "Influencer ID is required");
    }

    try {
      // Get influencer
      const influencerDoc = await db.collection("influencers").doc(influencerId).get();

      if (!influencerDoc.exists) {
        throw new HttpsError("not-found", "Influencer not found");
      }

      const influencer = influencerDoc.data() as Influencer;

      // Get commissions
      const commissionsQuery = await db
        .collection("influencer_commissions")
        .where("influencerId", "==", influencerId)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();

      const commissions = commissionsQuery.docs.map((doc) => {
        const data = doc.data() as InfluencerCommission;
        return {
          ...data,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });

      // Get withdrawals
      const withdrawalsQuery = await db
        .collection("influencer_withdrawals")
        .where("influencerId", "==", influencerId)
        .orderBy("requestedAt", "desc")
        .limit(50)
        .get();

      const withdrawals = withdrawalsQuery.docs.map((doc) => {
        const data = doc.data() as InfluencerWithdrawal;
        return {
          ...data,
          requestedAt: data.requestedAt.toDate().toISOString(),
        };
      });

      // Get referrals
      const referralsQuery = await db
        .collection("influencer_referrals")
        .where("influencerId", "==", influencerId)
        .orderBy("recruitedAt", "desc")
        .limit(50)
        .get();

      const referrals = referralsQuery.docs.map((doc) => {
        const data = doc.data() as InfluencerReferral;
        return {
          ...data,
          recruitedAt: data.recruitedAt.toDate().toISOString(),
        };
      });

      return {
        influencer,
        commissions,
        withdrawals,
        referrals,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("[adminGetInfluencerDetail] Error", { influencerId, error });
      throw new HttpsError("internal", "Failed to get influencer details");
    }
  }
);

// ============================================================================
// PROCESS WITHDRAWAL
// ============================================================================

export const adminProcessInfluencerWithdrawal = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();
    const adminId = await checkAdmin(request.auth);

    const input = request.data as AdminProcessInfluencerWithdrawalInput;
    const { withdrawalId, action, reason, paymentReference, notes } = input;

    if (!withdrawalId) {
      throw new HttpsError("invalid-argument", "Withdrawal ID is required");
    }

    if (!action) {
      throw new HttpsError("invalid-argument", "Action is required");
    }

    try {
      let result: { success: boolean; error?: string };

      switch (action) {
        case "approve":
          result = await approveWithdrawal(withdrawalId, adminId, notes);
          break;
        case "reject":
          if (!reason) {
            throw new HttpsError("invalid-argument", "Reason is required for rejection");
          }
          result = await rejectWithdrawal(withdrawalId, adminId, reason);
          break;
        case "complete":
          result = await completeWithdrawal(withdrawalId, paymentReference);
          break;
        case "fail":
          if (!reason) {
            throw new HttpsError("invalid-argument", "Reason is required for failure");
          }
          result = await failWithdrawal(withdrawalId, reason);
          break;
        default:
          throw new HttpsError("invalid-argument", `Invalid action: ${action}`);
      }

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to process withdrawal");
      }

      logger.info("[adminProcessInfluencerWithdrawal] Withdrawal processed", {
        withdrawalId,
        action,
        adminId,
      });

      return {
        success: true,
        message: `Withdrawal ${action}d successfully`,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("[adminProcessInfluencerWithdrawal] Error", { withdrawalId, action, error });
      throw new HttpsError("internal", "Failed to process withdrawal");
    }
  }
);

// ============================================================================
// UPDATE INFLUENCER STATUS
// ============================================================================

export const adminUpdateInfluencerStatus = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    ensureInitialized();
    const adminId = await checkAdmin(request.auth);

    const db = getFirestore();
    const input = request.data as AdminUpdateInfluencerStatusInput;
    const { influencerId, status, reason } = input;

    if (!influencerId) {
      throw new HttpsError("invalid-argument", "Influencer ID is required");
    }

    if (!status || !["active", "suspended", "blocked"].includes(status)) {
      throw new HttpsError("invalid-argument", "Valid status is required");
    }

    if (!reason) {
      throw new HttpsError("invalid-argument", "Reason is required");
    }

    try {
      const influencerRef = db.collection("influencers").doc(influencerId);
      const influencerDoc = await influencerRef.get();

      if (!influencerDoc.exists) {
        throw new HttpsError("not-found", "Influencer not found");
      }

      const now = Timestamp.now();

      await influencerRef.update({
        status,
        suspensionReason: status !== "active" ? reason : null,
        adminNotes: `${status.toUpperCase()} by admin ${adminId} on ${now.toDate().toISOString()}: ${reason}`,
        updatedAt: now,
      });

      // Create notification
      const notificationRef = db.collection("influencer_notifications").doc();
      await notificationRef.set({
        id: notificationRef.id,
        influencerId,
        type: "system",
        title: status === "active" ? "Compte réactivé" : `Compte ${status}`,
        message: reason,
        isRead: false,
        emailSent: false,
        createdAt: now,
      });

      logger.info("[adminUpdateInfluencerStatus] Status updated", {
        influencerId,
        status,
        adminId,
      });

      return {
        success: true,
        message: `Influencer status updated to ${status}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("[adminUpdateInfluencerStatus] Error", { influencerId, error });
      throw new HttpsError("internal", "Failed to update status");
    }
  }
);

// ============================================================================
// GET PENDING WITHDRAWALS
// ============================================================================

export const adminGetPendingInfluencerWithdrawals = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<{ withdrawals: InfluencerWithdrawal[] }> => {
    ensureInitialized();
    await checkAdmin(request.auth);

    try {
      const withdrawals = await getPendingWithdrawals(100);
      return { withdrawals };
    } catch (error) {
      logger.error("[adminGetPendingInfluencerWithdrawals] Error", { error });
      throw new HttpsError("internal", "Failed to get pending withdrawals");
    }
  }
);

// ============================================================================
// GET/UPDATE CONFIG
// ============================================================================

export const adminGetInfluencerConfig = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<{ config: InfluencerConfig }> => {
    ensureInitialized();
    await checkAdmin(request.auth);

    try {
      const config = await getInfluencerConfigCached();
      return { config };
    } catch (error) {
      logger.error("[adminGetInfluencerConfig] Error", { error });
      throw new HttpsError("internal", "Failed to get config");
    }
  }
);

export const adminUpdateInfluencerConfig = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<{ success: boolean; config: InfluencerConfig }> => {
    ensureInitialized();
    const adminId = await checkAdmin(request.auth);

    const { updates } = request.data as {
      updates: Partial<Omit<InfluencerConfig, "id" | "updatedAt" | "updatedBy">>;
    };

    if (!updates || Object.keys(updates).length === 0) {
      throw new HttpsError("invalid-argument", "Updates are required");
    }

    try {
      const config = await updateInfluencerConfig(updates, adminId);
      clearInfluencerConfigCache();

      logger.info("[adminUpdateInfluencerConfig] Config updated", {
        adminId,
        updates: Object.keys(updates),
      });

      return { success: true, config };
    } catch (error) {
      logger.error("[adminUpdateInfluencerConfig] Error", { error });
      throw new HttpsError("internal", "Failed to update config");
    }
  }
);

// ============================================================================
// GET INFLUENCER LEADERBOARD (ADMIN VERSION - FULL DATA)
// ============================================================================

export const adminGetInfluencerLeaderboard = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<{
    rankings: Array<{
      rank: number;
      influencerId: string;
      influencerName: string;
      email: string;
      country: string;
      monthlyEarnings: number;
      monthlyClients: number;
      monthlyRecruits: number;
    }>;
    month: string;
  }> => {
    ensureInitialized();
    await checkAdmin(request.auth);

    const db = getFirestore();
    const { month } = request.data as { month?: string };

    const targetMonth = month || new Date().toISOString().substring(0, 7);

    try {
      const influencersQuery = await db
        .collection("influencers")
        .where("status", "==", "active")
        .where("currentMonthStats.month", "==", targetMonth)
        .orderBy("currentMonthStats.earnings", "desc")
        .limit(50)
        .get();

      const rankings = influencersQuery.docs
        .map((doc, index) => {
          const influencer = doc.data() as Influencer;
          return {
            rank: index + 1,
            influencerId: influencer.id,
            influencerName: `${influencer.firstName} ${influencer.lastName}`,
            email: influencer.email,
            country: influencer.country,
            monthlyEarnings: influencer.currentMonthStats?.earnings || 0,
            monthlyClients: influencer.currentMonthStats?.clients || 0,
            monthlyRecruits: influencer.currentMonthStats?.recruits || 0,
          };
        })
        .filter((r) => r.monthlyEarnings > 0);

      return { rankings, month: targetMonth };
    } catch (error) {
      logger.error("[adminGetInfluencerLeaderboard] Error", { error });
      throw new HttpsError("internal", "Failed to get leaderboard");
    }
  }
);
