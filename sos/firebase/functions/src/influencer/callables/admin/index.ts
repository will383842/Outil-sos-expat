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
  InfluencerCommissionRule,
  InfluencerRateHistoryEntry,
  InfluencerAntiFraudConfig,
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
  updateCommissionRules,
  getRateHistory,
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
    region: "europe-west2",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: true,
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
    region: "europe-west2",
    memory: "512MiB",
    timeoutSeconds: 60,
    cors: true,
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
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 60,
    cors: true,
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
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
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

    if (!status || !["active", "suspended", "banned"].includes(status)) {
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
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
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
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
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
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
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
// V2: UPDATE COMMISSION RULES
// ============================================================================

export const adminUpdateCommissionRules = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request): Promise<{ success: boolean; config: InfluencerConfig }> => {
    ensureInitialized();
    const adminId = await checkAdmin(request.auth);

    const { rules, reason } = request.data as {
      rules: InfluencerCommissionRule[];
      reason: string;
    };

    if (!rules || !Array.isArray(rules)) {
      throw new HttpsError("invalid-argument", "Rules array is required");
    }

    if (!reason || reason.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Reason for change is required");
    }

    // Validate rules
    for (const rule of rules) {
      if (!rule.id || !rule.type) {
        throw new HttpsError("invalid-argument", "Each rule must have id and type");
      }
      if (rule.calculationType === "percentage" || rule.calculationType === "hybrid") {
        if (rule.percentageRate < 0 || rule.percentageRate > 1) {
          throw new HttpsError("invalid-argument", "Percentage rate must be between 0 and 1");
        }
      }
      if (rule.fixedAmount < 0) {
        throw new HttpsError("invalid-argument", "Fixed amount cannot be negative");
      }
    }

    try {
      const config = await updateCommissionRules(rules, adminId, reason.trim());

      logger.info("[adminUpdateCommissionRules] Rules updated", {
        adminId,
        rulesCount: rules.length,
        reason: reason.trim(),
      });

      return { success: true, config };
    } catch (error) {
      logger.error("[adminUpdateCommissionRules] Error", { error });
      throw new HttpsError("internal", "Failed to update commission rules");
    }
  }
);

// ============================================================================
// V2: GET RATE HISTORY
// ============================================================================

export const adminGetRateHistory = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request): Promise<{ history: InfluencerRateHistoryEntry[] }> => {
    ensureInitialized();
    await checkAdmin(request.auth);

    const { limit: historyLimit } = request.data as { limit?: number };

    try {
      const history = await getRateHistory(historyLimit || 20);

      // Convert Timestamps for JSON serialization
      const serializedHistory = history.map((entry) => ({
        ...entry,
        changedAt: entry.changedAt?.toDate?.()?.toISOString() || "",
      }));

      return { history: serializedHistory as unknown as InfluencerRateHistoryEntry[] };
    } catch (error) {
      logger.error("[adminGetRateHistory] Error", { error });
      throw new HttpsError("internal", "Failed to get rate history");
    }
  }
);

// ============================================================================
// V2: UPDATE ANTI-FRAUD CONFIG
// ============================================================================

export const adminUpdateAntiFraudConfig = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
  },
  async (request): Promise<{ success: boolean; config: InfluencerConfig }> => {
    ensureInitialized();
    const adminId = await checkAdmin(request.auth);

    const { antiFraud } = request.data as {
      antiFraud: InfluencerAntiFraudConfig;
    };

    if (!antiFraud) {
      throw new HttpsError("invalid-argument", "Anti-fraud config is required");
    }

    try {
      const config = await updateInfluencerConfig({ antiFraud }, adminId);
      clearInfluencerConfigCache();

      logger.info("[adminUpdateAntiFraudConfig] Anti-fraud config updated", {
        adminId,
        enabled: antiFraud.enabled,
      });

      return { success: true, config };
    } catch (error) {
      logger.error("[adminUpdateAntiFraudConfig] Error", { error });
      throw new HttpsError("internal", "Failed to update anti-fraud config");
    }
  }
);

// ============================================================================
// GET INFLUENCER LEADERBOARD (ADMIN VERSION - FULL DATA)
// ============================================================================

export const adminGetInfluencerLeaderboard = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    timeoutSeconds: 30,
    cors: true,
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

// ============================================================================
// EXPORT INFLUENCERS TO CSV
// ============================================================================

export const adminExportInfluencers = onCall(
  {
    region: "europe-west2",
    memory: "512MiB",
    timeoutSeconds: 120,
    cors: true,
  },
  async (request): Promise<{ csv: string; count: number }> => {
    ensureInitialized();
    await checkAdmin(request.auth);

    const db = getFirestore();
    const input = request.data as {
      status?: string;
      country?: string;
      language?: string;
      search?: string;
    };

    const { status, country, language, search } = input;

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

      query = query.orderBy("createdAt", "desc");
      const snapshot = await query.get();

      let influencers = snapshot.docs.map((doc) => doc.data() as Influencer);

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        influencers = influencers.filter(
          (i) =>
            i.email.toLowerCase().includes(searchLower) ||
            i.firstName.toLowerCase().includes(searchLower) ||
            i.lastName.toLowerCase().includes(searchLower) ||
            i.affiliateCodeClient?.toLowerCase().includes(searchLower)
        );
      }

      // Build CSV
      const headers = [
        "ID",
        "Email",
        "Prénom",
        "Nom",
        "Statut",
        "Pays",
        "Langue",
        "Code Affilié",
        "Clients Référés",
        "Providers Recrutés",
        "Total Gagné ($)",
        "Solde Disponible ($)",
        "Date Inscription",
      ];

      const rows = influencers.map((i) => [
        i.id,
        i.email,
        i.firstName,
        i.lastName,
        i.status,
        i.country || "",
        i.language || "",
        i.affiliateCodeClient || "",
        i.totalClients?.toString() || "0",
        i.totalRecruits?.toString() || "0",
        ((i.totalEarned || 0) / 100).toFixed(2),
        ((i.availableBalance || 0) / 100).toFixed(2),
        i.createdAt?.toDate?.()?.toISOString()?.split("T")[0] || "",
      ]);

      // Escape CSV values
      const escapeCSV = (value: string) => {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map((row) => row.map(escapeCSV).join(",")),
      ].join("\n");

      logger.info("[adminExportInfluencers] Export completed", {
        count: influencers.length,
        filters: { status, country, language, search: !!search },
      });

      return { csv: csvContent, count: influencers.length };
    } catch (error) {
      logger.error("[adminExportInfluencers] Error", { error });
      throw new HttpsError("internal", "Failed to export influencers");
    }
  }
);

// ============================================================================
// BULK ACTIONS ON INFLUENCERS
// ============================================================================

export const adminBulkInfluencerAction = onCall(
  {
    region: "europe-west2",
    memory: "512MiB",
    timeoutSeconds: 120,
    cors: true,
  },
  async (request): Promise<{ success: boolean; processed: number; failed: number; message: string }> => {
    ensureInitialized();
    const adminId = await checkAdmin(request.auth);

    const db = getFirestore();
    const { influencerIds, action, reason } = request.data as {
      influencerIds: string[];
      action: "suspend" | "activate" | "email";
      reason?: string;
    };

    if (!influencerIds || !Array.isArray(influencerIds) || influencerIds.length === 0) {
      throw new HttpsError("invalid-argument", "Influencer IDs array is required");
    }

    if (!action || !["suspend", "activate", "email"].includes(action)) {
      throw new HttpsError("invalid-argument", "Valid action is required (suspend, activate, email)");
    }

    if (influencerIds.length > 100) {
      throw new HttpsError("invalid-argument", "Maximum 100 influencers can be processed at once");
    }

    try {
      let processed = 0;
      let failed = 0;
      const now = Timestamp.now();
      const batch = db.batch();

      for (const influencerId of influencerIds) {
        try {
          const influencerRef = db.collection("influencers").doc(influencerId);
          const influencerDoc = await influencerRef.get();

          if (!influencerDoc.exists) {
            failed++;
            continue;
          }

          // influencerDoc data is available if needed for future use
          // const influencer = influencerDoc.data() as Influencer;

          switch (action) {
            case "suspend":
              batch.update(influencerRef, {
                status: "suspended",
                suspensionReason: reason || "Bulk suspension by admin",
                adminNotes: `SUSPENDED by admin ${adminId} on ${now.toDate().toISOString()}`,
                updatedAt: now,
              });
              // Create notification
              const suspendNotifRef = db.collection("influencer_notifications").doc();
              batch.set(suspendNotifRef, {
                id: suspendNotifRef.id,
                influencerId,
                type: "system",
                title: "Compte suspendu",
                message: reason || "Votre compte a été suspendu par l'administration.",
                isRead: false,
                emailSent: false,
                createdAt: now,
              });
              processed++;
              break;

            case "activate":
              batch.update(influencerRef, {
                status: "active",
                suspensionReason: null,
                adminNotes: `ACTIVATED by admin ${adminId} on ${now.toDate().toISOString()}`,
                updatedAt: now,
              });
              // Create notification
              const activateNotifRef = db.collection("influencer_notifications").doc();
              batch.set(activateNotifRef, {
                id: activateNotifRef.id,
                influencerId,
                type: "system",
                title: "Compte réactivé",
                message: "Votre compte influenceur a été réactivé. Vous pouvez à nouveau gagner des commissions.",
                isRead: false,
                emailSent: false,
                createdAt: now,
              });
              processed++;
              break;

            case "email":
              // Create notification to be sent by email
              const emailNotifRef = db.collection("influencer_notifications").doc();
              batch.set(emailNotifRef, {
                id: emailNotifRef.id,
                influencerId,
                type: "promo",
                title: "Message de l'équipe SOS-Expat",
                message: reason || "Nouveau message de l'équipe SOS-Expat.",
                isRead: false,
                emailSent: false,
                sendEmail: true,
                createdAt: now,
              });
              processed++;
              break;
          }
        } catch {
          failed++;
        }
      }

      await batch.commit();

      logger.info("[adminBulkInfluencerAction] Bulk action completed", {
        adminId,
        action,
        requested: influencerIds.length,
        processed,
        failed,
      });

      return {
        success: true,
        processed,
        failed,
        message: `Action "${action}" completed: ${processed} processed, ${failed} failed`,
      };
    } catch (error) {
      logger.error("[adminBulkInfluencerAction] Error", { error });
      throw new HttpsError("internal", "Failed to perform bulk action");
    }
  }
);
