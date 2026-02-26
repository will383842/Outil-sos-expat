/**
 * ProviderEarningsService.ts
 *
 * Service de gestion des revenus pour les prestataires.
 * Fournit les APIs pour le dashboard earnings.
 *
 * Fonctionnalités:
 * - Résumé des gains (total, en attente, disponible)
 * - Historique des transactions
 * - Statistiques mensuelles/hebdomadaires
 * - Historique des virements
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { ALLOWED_ORIGINS } from "./lib/functionConfigs";

// Types
interface EarningsSummary {
  totalEarnings: number;
  totalEarningsFormatted: string;
  pendingEarnings: number;
  pendingEarningsFormatted: string;
  availableBalance: number;
  availableBalanceFormatted: string;
  totalPayouts: number; // P1 FIX: Montant total déjà versé
  totalPayoutsFormatted: string;
  reservedAmount: number; // P1 FIX: Montant réservé (disputes)
  reservedAmountFormatted: string;
  // Montant en attente de KYC (pending_transfers avec status pending_kyc)
  pendingKycAmount: number;
  pendingKycAmountFormatted: string;
  totalCalls: number;
  successfulCalls: number;
  averageEarningPerCall: number;
  currency: string;
  lastUpdated: string;
  // Statut KYC du provider
  kycComplete: boolean;
}

interface Transaction {
  id: string;
  type: "earning" | "payout" | "adjustment" | "refund";
  amount: number;
  amountFormatted: string;
  currency: string;
  status: string;
  description: string;
  callSessionId?: string;
  clientName?: string;
  duration?: number;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface MonthlyStats {
  month: string;
  year: number;
  totalEarnings: number;
  totalCalls: number;
  averagePerCall: number;
  currency: string;
}

interface PayoutHistory {
  id: string;
  amount: number;
  amountFormatted: string;
  currency: string;
  status: string;
  stripePayoutId?: string;
  arrivalDate?: string;
  createdAt: string;
}

/**
 * Service principal des earnings
 */
export class ProviderEarningsService {
  private db: admin.firestore.Firestore;

  constructor(db?: admin.firestore.Firestore) {
    this.db = db || admin.firestore();
  }

  /**
   * Récupère le résumé des gains pour un provider
   * CPU OPTIMIZATION: Added .limit() to prevent full collection scans
   * For providers with very high call volumes, consider using pre-aggregated stats instead
   */
  async getEarningsSummary(providerId: string): Promise<EarningsSummary> {
    console.log("📊 [EARNINGS] Getting summary for provider:", providerId);

    // CPU OPTIMIZATION: Limit queries to prevent excessive CPU usage
    // 2000 sessions should cover ~3-4 years for most providers at 2 calls/day
    const QUERY_LIMIT = 2000;

    try {
      // Récupérer les sessions avec paiement capturé (with limit)
      const sessionsSnapshot = await this.db
        .collection("call_sessions")
        .where("providerId", "==", providerId)
        .where("payment.status", "in", ["captured", "succeeded"])
        .orderBy("completedAt", "desc")
        .limit(QUERY_LIMIT)
        .get();

      let totalEarnings = 0;
      let totalCalls = 0;
      let successfulCalls = 0;

      sessionsSnapshot.docs.forEach((doc) => {
        const session = doc.data();
        totalCalls++;

        if (session.payment?.providerAmount) {
          // providerAmount est en unité principale (euros)
          totalEarnings += session.payment.providerAmount;
          successfulCalls++;
        }
      });

      // Récupérer les ajustements (disputes perdues, etc.) - CPU OPTIMIZED with limit
      const adjustmentsSnapshot = await this.db
        .collection("provider_balance_adjustments")
        .where("providerId", "==", providerId)
        .limit(500) // Most providers have <100 adjustments
        .get();

      let adjustmentsTotal = 0;
      adjustmentsSnapshot.docs.forEach((doc) => {
        const adjustment = doc.data();
        adjustmentsTotal += adjustment.amount || 0;
      });

      // Récupérer les transferts en attente (paiements autorisés mais pas encore capturés)
      // CPU OPTIMIZED: Pending transfers should be few (< 50 at any time)
      const pendingTransfersSnapshot = await this.db
        .collection("call_sessions")
        .where("providerId", "==", providerId)
        .where("payment.status", "==", "authorized")
        .limit(100)
        .get();

      let pendingEarnings = 0;
      pendingTransfersSnapshot.docs.forEach((doc) => {
        const session = doc.data();
        if (session.payment?.providerAmount) {
          pendingEarnings += session.payment.providerAmount;
        }
      });

      // ===== P1 FIX: Calculer les payouts déjà effectués =====
      // Récupérer les transferts/payouts déjà envoyés au provider
      // CPU OPTIMIZED with limit
      const payoutsSnapshot = await this.db
        .collection("transfers")
        .where("providerId", "==", providerId)
        .where("status", "in", ["succeeded", "paid", "completed"])
        .limit(QUERY_LIMIT)
        .get();

      let totalPayouts = 0;
      payoutsSnapshot.docs.forEach((doc) => {
        const transfer = doc.data();
        // Les montants peuvent être en cents ou en euros selon la source
        const amountInEuros = transfer.amountEuros ?? (transfer.amount ? transfer.amount / 100 : 0);
        totalPayouts += amountInEuros;
      });

      // Récupérer également les PayPal payouts - CPU OPTIMIZED
      const paypalPayoutsSnapshot = await this.db
        .collection("paypal_payouts")
        .where("providerId", "==", providerId)
        .where("status", "in", ["SUCCESS", "PENDING", "UNCLAIMED"])
        .limit(QUERY_LIMIT)
        .get();

      paypalPayoutsSnapshot.docs.forEach((doc) => {
        const payout = doc.data();
        totalPayouts += payout.amount || 0;
      });

      // Récupérer les montants réservés (disputes en cours) - CPU OPTIMIZED
      // Active disputes should be very few at any time
      const reservedSnapshot = await this.db
        .collection("provider_balance_adjustments")
        .where("providerId", "==", providerId)
        .where("type", "==", "dispute_reserve")
        .where("status", "==", "active")
        .limit(50)
        .get();

      let reservedAmount = 0;
      reservedSnapshot.docs.forEach((doc) => {
        const reserve = doc.data();
        reservedAmount += Math.abs(reserve.amount || 0);
      });

      // ===== PENDING KYC: Montant en attente de vérification d'identité =====
      // Ces montants seront transférés automatiquement quand le provider complète son KYC
      const pendingKycSnapshot = await this.db
        .collection("pending_transfers")
        .where("providerId", "==", providerId)
        .where("status", "==", "pending_kyc")
        .limit(100)
        .get();

      let pendingKycAmount = 0;
      pendingKycSnapshot.docs.forEach((doc) => {
        const transfer = doc.data();
        // providerAmount est en centimes dans pending_transfers
        pendingKycAmount += (transfer.providerAmount || 0) / 100;
      });

      // ===== PAYPAL PENDING: Montants PayPal en attente de vérification email =====
      const paypalPendingSnapshot = await this.db
        .collection("paypal_orders")
        .where("providerId", "==", providerId)
        .where("payoutPendingVerification", "==", true)
        .limit(100)
        .get();

      paypalPendingSnapshot.docs.forEach((doc) => {
        const order = doc.data();
        // providerAmount est déjà en euros dans paypal_orders
        pendingKycAmount += order.providerAmount || 0;
      });

      // Aussi ajouter les payouts PayPal échoués
      const failedPayoutsSnapshot = await this.db
        .collection("failed_payouts_alerts")
        .where("providerId", "==", providerId)
        .where("status", "==", "failed")
        .limit(100)
        .get();

      failedPayoutsSnapshot.docs.forEach((doc) => {
        const alert = doc.data();
        // amount est en euros
        pendingKycAmount += alert.amount || 0;
      });

      // Récupérer le statut KYC du provider (Stripe + PayPal)
      const providerDoc = await this.db.collection("users").doc(providerId).get();
      const providerData = providerDoc.data();
      const stripeKycComplete = providerData?.chargesEnabled === true;
      const paypalVerified = providerData?.paypalEmailVerified === true;
      const kycComplete = stripeKycComplete || paypalVerified;

      // Calculer le solde disponible correctement:
      // totalEarnings - payouts déjà effectués + adjustments - montants réservés
      const availableBalance = totalEarnings - totalPayouts + adjustmentsTotal - reservedAmount;
      const averageEarningPerCall = successfulCalls > 0 ? totalEarnings / successfulCalls : 0;

      const summary: EarningsSummary = {
        totalEarnings,
        totalEarningsFormatted: this.formatCurrency(totalEarnings, "EUR"),
        pendingEarnings,
        pendingEarningsFormatted: this.formatCurrency(pendingEarnings, "EUR"),
        availableBalance: Math.max(0, availableBalance), // Ne pas afficher de solde négatif
        availableBalanceFormatted: this.formatCurrency(Math.max(0, availableBalance), "EUR"),
        totalPayouts,
        totalPayoutsFormatted: this.formatCurrency(totalPayouts, "EUR"),
        reservedAmount,
        reservedAmountFormatted: this.formatCurrency(reservedAmount, "EUR"),
        pendingKycAmount,
        pendingKycAmountFormatted: this.formatCurrency(pendingKycAmount, "EUR"),
        totalCalls,
        successfulCalls,
        averageEarningPerCall: Math.round(averageEarningPerCall * 100) / 100,
        currency: "EUR",
        lastUpdated: new Date().toISOString(),
        kycComplete,
      };

      console.log("✅ [EARNINGS] Summary calculated:", summary);
      return summary;
    } catch (error) {
      console.error("❌ [EARNINGS] Error getting summary:", error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des transactions
   */
  async getTransactionHistory(
    providerId: string,
    options: {
      limit?: number;
      startAfter?: string;
      type?: string;
    } = {}
  ): Promise<{
    transactions: Transaction[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    console.log("📜 [EARNINGS] Getting transaction history for:", providerId);

    const limit = options.limit || 20;
    const transactions: Transaction[] = [];

    try {
      // Récupérer les sessions (earnings)
      let sessionsQuery = this.db
        .collection("call_sessions")
        .where("providerId", "==", providerId)
        .where("payment.status", "in", ["captured", "succeeded", "refunded"])
        .orderBy("completedAt", "desc")
        .limit(limit);

      if (options.startAfter) {
        const startDoc = await this.db.collection("call_sessions").doc(options.startAfter).get();
        if (startDoc.exists) {
          sessionsQuery = sessionsQuery.startAfter(startDoc);
        }
      }

      const sessionsSnapshot = await sessionsQuery.get();

      for (const doc of sessionsSnapshot.docs) {
        const session = doc.data();
        const isRefunded = session.payment?.status === "refunded";

        transactions.push({
          id: doc.id,
          type: isRefunded ? "refund" : "earning",
          amount: isRefunded ? -(session.payment?.providerAmount || 0) : (session.payment?.providerAmount || 0),
          amountFormatted: this.formatCurrency(
            isRefunded ? -(session.payment?.providerAmount || 0) : (session.payment?.providerAmount || 0),
            session.payment?.currency || "EUR"
          ),
          currency: session.payment?.currency || "EUR",
          status: session.payment?.status || "unknown",
          description: isRefunded
            ? `Remboursement - Appel du ${this.formatDate(session.completedAt)}`
            : `Appel du ${this.formatDate(session.completedAt)}`,
          callSessionId: doc.id,
          clientName: session.clientName || "Client",
          duration: session.duration,
          createdAt: session.completedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      }

      // Récupérer les ajustements
      const adjustmentsSnapshot = await this.db
        .collection("provider_balance_adjustments")
        .where("providerId", "==", providerId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      for (const doc of adjustmentsSnapshot.docs) {
        const adjustment = doc.data();

        transactions.push({
          id: doc.id,
          type: "adjustment",
          amount: adjustment.amount,
          amountFormatted: this.formatCurrency(adjustment.amount, adjustment.currency || "EUR"),
          currency: adjustment.currency || "EUR",
          status: "completed",
          description: adjustment.description || "Ajustement",
          createdAt: adjustment.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          metadata: {
            reason: adjustment.type,
            disputeId: adjustment.disputeId,
          },
        });
      }

      // Trier par date
      transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Limiter et déterminer si plus de résultats
      const limitedTransactions = transactions.slice(0, limit);
      const hasMore = transactions.length > limit;
      const nextCursor = hasMore ? limitedTransactions[limitedTransactions.length - 1]?.id : undefined;

      return {
        transactions: limitedTransactions,
        hasMore,
        nextCursor,
      };
    } catch (error) {
      console.error("❌ [EARNINGS] Error getting transactions:", error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques mensuelles
   */
  async getMonthlyStats(
    providerId: string,
    months: number = 12
  ): Promise<MonthlyStats[]> {
    console.log("📈 [EARNINGS] Getting monthly stats for:", providerId);

    try {
      const stats: MonthlyStats[] = [];
      const now = new Date();

      // Récupérer toutes les sessions des X derniers mois
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const sessionsSnapshot = await this.db
        .collection("call_sessions")
        .where("providerId", "==", providerId)
        .where("payment.status", "in", ["captured", "succeeded"])
        .where("completedAt", ">=", startDate)
        .get();

      // Grouper par mois
      const monthlyData: Record<string, { earnings: number; calls: number }> = {};

      sessionsSnapshot.docs.forEach((doc) => {
        const session = doc.data();
        const completedAt = session.completedAt?.toDate?.() || new Date();
        const monthKey = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, "0")}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { earnings: 0, calls: 0 };
        }

        monthlyData[monthKey].earnings += session.payment?.providerAmount || 0;
        monthlyData[monthKey].calls += 1;
      });

      // Créer les stats pour chaque mois (même les mois sans données)
      for (let i = 0; i < months; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const data = monthlyData[monthKey] || { earnings: 0, calls: 0 };

        stats.push({
          month: this.getMonthName(date.getMonth()),
          year: date.getFullYear(),
          totalEarnings: data.earnings,
          totalCalls: data.calls,
          averagePerCall: data.calls > 0 ? Math.round((data.earnings / data.calls) * 100) / 100 : 0,
          currency: "EUR",
        });
      }

      return stats.reverse(); // Du plus ancien au plus récent
    } catch (error) {
      console.error("❌ [EARNINGS] Error getting monthly stats:", error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des virements (payouts)
   */
  async getPayoutHistory(
    providerId: string,
    limit: number = 10
  ): Promise<PayoutHistory[]> {
    console.log("💸 [EARNINGS] Getting payout history for:", providerId);

    try {
      // Récupérer les transferts réussis
      const transfersSnapshot = await this.db
        .collection("transfers")
        .where("providerId", "==", providerId)
        .where("status", "==", "succeeded")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      const payouts: PayoutHistory[] = [];

      transfersSnapshot.docs.forEach((doc) => {
        const transfer = doc.data();

        payouts.push({
          id: doc.id,
          amount: transfer.amountEuros || transfer.amount / 100,
          amountFormatted: this.formatCurrency(transfer.amountEuros || transfer.amount / 100, transfer.currency || "EUR"),
          currency: transfer.currency || "EUR",
          status: transfer.status,
          stripePayoutId: transfer.stripePayoutId,
          arrivalDate: transfer.arrivalDate?.toDate?.()?.toISOString(),
          createdAt: transfer.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });

      return payouts;
    } catch (error) {
      console.error("❌ [EARNINGS] Error getting payout history:", error);
      throw error;
    }
  }

  /**
   * P0-3 FIX: Débite le solde du provider lors d'un remboursement
   * Crée un enregistrement dans provider_balance_adjustments avec un montant négatif
   */
  async deductProviderBalance(params: {
    providerId: string;
    amount: number;
    currency: string;
    reason: string;
    chargeId?: string;
    callSessionId?: string;
    refundId?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const { providerId, amount, currency, reason, chargeId, callSessionId, refundId, metadata } = params;

    console.log(`💸 [EARNINGS] P0-3 FIX: Deducting ${amount} ${currency} from provider ${providerId}`);

    try {
      const now = admin.firestore.Timestamp.now();

      // Créer un ajustement négatif (débit)
      const adjustmentRef = await this.db.collection("provider_balance_adjustments").add({
        providerId,
        type: "refund", // P0-3: Type spécifique pour les remboursements
        amount: -Math.abs(amount), // Toujours négatif pour un débit
        currency: currency.toUpperCase(),
        status: "applied", // Appliqué immédiatement
        reason,
        description: `Remboursement: ${reason}`,
        chargeId: chargeId || null,
        callSessionId: callSessionId || null,
        refundId: refundId || null,
        metadata: metadata || {},
        createdAt: now,
        appliedAt: now,
      });

      console.log(`✅ [EARNINGS] P0-3 FIX: Balance adjustment created: ${adjustmentRef.id}`);

      // Logger pour audit
      await this.db.collection("provider_balance_audit").add({
        providerId,
        action: "refund_deduction",
        adjustmentId: adjustmentRef.id,
        amount: -Math.abs(amount),
        currency: currency.toUpperCase(),
        chargeId,
        callSessionId,
        refundId,
        createdAt: now,
      });

      return adjustmentRef.id;
    } catch (error) {
      console.error(`❌ [EARNINGS] P0-3 FIX: Error deducting balance:`, error);
      throw error;
    }
  }

  /**
   * Helpers
   */
  private formatCurrency(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
    });
    return formatter.format(amount);
  }

  private formatDate(timestamp: admin.firestore.Timestamp | undefined): string {
    if (!timestamp) return "Date inconnue";
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  private getMonthName(monthIndex: number): string {
    const months = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
    ];
    return months[monthIndex];
  }
}

// ====== CLOUD FUNCTIONS ======

/**
 * Récupère le résumé des earnings pour le provider connecté
 */
export const getProviderEarningsSummary = onCall(
  { region: "europe-west1", cpu: 0.083, cors: ALLOWED_ORIGINS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const providerId = request.auth.uid;
    const service = new ProviderEarningsService();

    try {
      const summary = await service.getEarningsSummary(providerId);
      return { success: true, data: summary };
    } catch (error) {
      console.error("Error getting earnings summary:", error);
      throw new HttpsError("internal", "Failed to get earnings summary");
    }
  }
);

/**
 * Récupère l'historique des transactions
 */
export const getProviderTransactions = onCall(
  { region: "europe-west1", cpu: 0.083, cors: ALLOWED_ORIGINS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const providerId = request.auth.uid;
    const { limit, startAfter, type } = request.data || {};

    const service = new ProviderEarningsService();

    try {
      const result = await service.getTransactionHistory(providerId, {
        limit: limit || 20,
        startAfter,
        type,
      });
      return { success: true, ...result };
    } catch (error) {
      console.error("Error getting transactions:", error);
      throw new HttpsError("internal", "Failed to get transactions");
    }
  }
);

/**
 * Récupère les statistiques mensuelles
 */
export const getProviderMonthlyStats = onCall(
  { region: "europe-west1", cpu: 0.083, cors: ALLOWED_ORIGINS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const providerId = request.auth.uid;
    const { months } = request.data || {};

    const service = new ProviderEarningsService();

    try {
      const stats = await service.getMonthlyStats(providerId, months || 12);
      return { success: true, data: stats };
    } catch (error) {
      console.error("Error getting monthly stats:", error);
      throw new HttpsError("internal", "Failed to get monthly stats");
    }
  }
);

/**
 * Récupère l'historique des virements
 */
export const getProviderPayoutHistory = onCall(
  { region: "europe-west1", cpu: 0.083, cors: ALLOWED_ORIGINS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const providerId = request.auth.uid;
    const { limit } = request.data || {};

    const service = new ProviderEarningsService();

    try {
      const payouts = await service.getPayoutHistory(providerId, limit || 10);
      return { success: true, data: payouts };
    } catch (error) {
      console.error("Error getting payout history:", error);
      throw new HttpsError("internal", "Failed to get payout history");
    }
  }
);

/**
 * Récupère toutes les données du dashboard en une seule requête
 */
export const getProviderDashboard = onCall(
  { region: "europe-west1", cpu: 0.083, cors: ALLOWED_ORIGINS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const providerId = request.auth.uid;
    const service = new ProviderEarningsService();

    try {
      const [summary, transactions, monthlyStats, payouts] = await Promise.all([
        service.getEarningsSummary(providerId),
        service.getTransactionHistory(providerId, { limit: 5 }),
        service.getMonthlyStats(providerId, 6),
        service.getPayoutHistory(providerId, 5),
      ]);

      return {
        success: true,
        data: {
          summary,
          recentTransactions: transactions.transactions,
          monthlyStats,
          recentPayouts: payouts,
        },
      };
    } catch (error) {
      console.error("Error getting provider dashboard:", error);
      throw new HttpsError("internal", "Failed to get dashboard data");
    }
  }
);

/**
 * Admin: Récupère les earnings d'un provider spécifique
 */
export const adminGetProviderEarnings = onCall(
  { region: "europe-west1", cpu: 0.083, cors: ALLOWED_ORIGINS },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Vérifier le rôle admin
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || userData.role !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can access this");
    }

    const { providerId } = request.data;
    if (!providerId) {
      throw new HttpsError("invalid-argument", "providerId is required");
    }

    const service = new ProviderEarningsService();

    try {
      const [summary, transactions, monthlyStats, payouts] = await Promise.all([
        service.getEarningsSummary(providerId),
        service.getTransactionHistory(providerId, { limit: 20 }),
        service.getMonthlyStats(providerId, 12),
        service.getPayoutHistory(providerId, 20),
      ]);

      return {
        success: true,
        providerId,
        data: {
          summary,
          transactions: transactions.transactions,
          monthlyStats,
          payouts,
        },
      };
    } catch (error) {
      console.error("Error getting provider earnings (admin):", error);
      throw new HttpsError("internal", "Failed to get provider earnings");
    }
  }
);
