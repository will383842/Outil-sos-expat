/**
 * UnclaimedFundsManager.ts
 *
 * SIMPLIFIE pour Direct Charges:
 * Avec les Direct Charges, l'argent va directement au provider lors du paiement.
 * Il n'y a donc plus de "fonds non reclames" chez la plateforme.
 *
 * Ce fichier ne conserve que:
 * - La logique de remboursement si l'appel n'a pas eu lieu
 * - Le suivi des remboursements effectues
 *
 * SUPPRIME (plus necessaire avec Direct Charges):
 * - Logique de fonds en escrow chez la plateforme
 * - Rappels KYC pour reclamer les fonds
 * - Fonction schedulee quotidienne
 * - Gestion des fonds expires
 */

import * as admin from "firebase-admin";
import Stripe from "stripe";
// P1-13: Sync atomique payments <-> call_sessions
import { syncPaymentStatus } from "./utils/paymentSync";
// P0 FIX: Use centralized secrets instead of process.env
import { getStripeSecretKey as getCentralizedStripeKey, getStripeMode } from "./lib/secrets";

// Configuration Stripe - initialisee a la demande pour eviter les erreurs au chargement
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = getCentralizedStripeKey();
    if (!key) {
      throw new Error("Stripe secret key not configured");
    }
    console.log(`🔑 UnclaimedFundsManager: Stripe initialized in ${getStripeMode().toUpperCase()} mode`);
    stripeInstance = new Stripe(key, { apiVersion: "2023-10-16" as Stripe.LatestApiVersion });
  }
  return stripeInstance;
}

// Configuration simplifiee
export const REFUND_CONFIG = {
  // Duree minimum pour considerer un appel comme "effectue" (2 minutes)
  MIN_CALL_DURATION_SECONDS: 120,

  // Statuts de remboursement
  STATUS: {
    PENDING: "pending",
    PROCESSED: "processed",
    FAILED: "failed",
  },

  // Raisons de remboursement
  REASONS: {
    CALL_NOT_COMPLETED: "call_not_completed",
    CALL_CANCELLED: "call_cancelled",
    TECHNICAL_ISSUE: "technical_issue",
    PROVIDER_NO_SHOW: "provider_no_show",
    TRANSFER_FAILED: "transfer_failed",
  },
};

// Types
interface RefundRecord {
  id?: string;
  paymentIntentId: string;
  chargeId?: string;
  callSessionId: string;

  // Montants
  amount: number;
  currency: string;

  // Parties
  clientId: string;
  providerId: string;

  // Statut
  status: string;
  reason: string;
  reasonDetails?: string;

  // Stripe
  stripeRefundId?: string;

  // Dates
  createdAt: admin.firestore.Timestamp;
  processedAt?: admin.firestore.Timestamp;
  failedAt?: admin.firestore.Timestamp;
  errorMessage?: string;
}

/**
 * Gestionnaire simplifie pour les remboursements
 * Utilise uniquement pour les appels qui n'ont pas eu lieu
 */
export class RefundManager {
  protected db: admin.firestore.Firestore;

  constructor(db?: admin.firestore.Firestore) {
    this.db = db || admin.firestore();
  }

  /**
   * Traite un remboursement pour un appel non effectue
   *
   * Avec Direct Charges, le remboursement doit etre fait sur le compte du provider
   * car c'est la que le paiement a ete effectue.
   */
  async processRefundForUncompletedCall(data: {
    paymentIntentId: string;
    chargeId?: string;
    callSessionId: string;
    amount: number;
    currency: string;
    clientId: string;
    providerId: string;
    providerStripeAccountId: string;
    reason: string;
    reasonDetails?: string;
  }): Promise<{ success: boolean; refundId?: string; error?: string }> {
    console.log("[REFUND] Processing refund for uncompleted call:", data.callSessionId);

    try {
      // Verifier que l'appel n'a vraiment pas eu lieu
      const sessionDoc = await this.db.collection("call_sessions").doc(data.callSessionId).get();
      const sessionData = sessionDoc.data();

      if (!sessionData) {
        console.error("[REFUND] Session not found:", data.callSessionId);
        return { success: false, error: "Session not found" };
      }

      const callDuration = sessionData.duration || 0;
      const callCompleted = callDuration >= REFUND_CONFIG.MIN_CALL_DURATION_SECONDS;

      if (callCompleted) {
        console.warn("[REFUND] Call was completed, no refund allowed:", data.callSessionId);
        return { success: false, error: "Call was completed - refund not allowed" };
      }

      // Creer l'enregistrement de remboursement
      const refundRecord: Omit<RefundRecord, "id"> = {
        paymentIntentId: data.paymentIntentId,
        chargeId: data.chargeId,
        callSessionId: data.callSessionId,
        amount: data.amount,
        currency: data.currency,
        clientId: data.clientId,
        providerId: data.providerId,
        status: REFUND_CONFIG.STATUS.PENDING,
        reason: data.reason,
        reasonDetails: data.reasonDetails,
        createdAt: admin.firestore.Timestamp.now(),
      };

      const refundDocRef = await this.db.collection("refunds").add(refundRecord);
      console.log("[REFUND] Refund record created:", refundDocRef.id);

      // Effectuer le remboursement via Stripe
      // Avec Direct Charges, on doit specifier le compte connecte
      try {
        const refund = await getStripe().refunds.create(
          {
            payment_intent: data.paymentIntentId,
            amount: data.amount,
            reason: "requested_by_customer",
            metadata: {
              callSessionId: data.callSessionId,
              refundRecordId: refundDocRef.id,
              reason: data.reason,
            },
          },
          {
            stripeAccount: data.providerStripeAccountId,
          }
        );

        // Mettre a jour l'enregistrement avec le succes
        await refundDocRef.update({
          status: REFUND_CONFIG.STATUS.PROCESSED,
          stripeRefundId: refund.id,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // P1-13 FIX: Sync atomique payments <-> call_sessions
        await syncPaymentStatus(this.db, data.paymentIntentId, data.callSessionId, {
          status: "refunded",
          refundedAt: admin.firestore.FieldValue.serverTimestamp(),
          refundReason: data.reason,
          refundId: refund.id,
        });

        console.log("[REFUND] Refund successful:", refund.id);

        return { success: true, refundId: refund.id };
      } catch (stripeError) {
        console.error("[REFUND] Stripe refund failed:", stripeError);

        // Mettre a jour l'enregistrement avec l'echec
        await refundDocRef.update({
          status: REFUND_CONFIG.STATUS.FAILED,
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
          errorMessage: stripeError instanceof Error ? stripeError.message : "Unknown error",
        });

        // Creer une alerte admin
        await this.createAdminAlert({
          type: "refund_failed",
          callSessionId: data.callSessionId,
          amount: data.amount,
          currency: data.currency,
          error: stripeError instanceof Error ? stripeError.message : "Unknown error",
        });

        return {
          success: false,
          error: stripeError instanceof Error ? stripeError.message : "Stripe refund failed",
        };
      }
    } catch (error) {
      console.error("[REFUND] Error processing refund:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Verifie si un appel est eligible pour un remboursement
   */
  async isEligibleForRefund(callSessionId: string): Promise<{
    eligible: boolean;
    reason?: string;
  }> {
    try {
      const sessionDoc = await this.db.collection("call_sessions").doc(callSessionId).get();
      const sessionData = sessionDoc.data();

      if (!sessionData) {
        return { eligible: false, reason: "Session not found" };
      }

      // Deja rembourse?
      if (sessionData.payment?.refunded) {
        return { eligible: false, reason: "Already refunded" };
      }

      // Appel complete?
      const callDuration = sessionData.duration || 0;
      if (callDuration >= REFUND_CONFIG.MIN_CALL_DURATION_SECONDS) {
        return { eligible: false, reason: "Call was completed" };
      }

      return { eligible: true };
    } catch (error) {
      console.error("[REFUND] Error checking eligibility:", error);
      return { eligible: false, reason: "Error checking eligibility" };
    }
  }

  /**
   * Cree une alerte admin
   */
  private async createAdminAlert(data: {
    type: string;
    callSessionId: string;
    amount: number;
    currency: string;
    error?: string;
  }): Promise<void> {
    await this.db.collection("admin_alerts").add({
      type: data.type,
      priority: "high",
      title: "Echec de remboursement",
      message: `Remboursement de ${(data.amount / 100).toFixed(2)} ${data.currency.toUpperCase()} echoue pour la session ${data.callSessionId}`,
      callSessionId: data.callSessionId,
      amount: data.amount,
      currency: data.currency,
      error: data.error,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

// Export pour retrocompatibilite (sera supprime dans une future version)
export class UnclaimedFundsManager extends RefundManager {
  constructor(db?: admin.firestore.Firestore) {
    super(db);
    console.warn(
      "[DEPRECATED] UnclaimedFundsManager est deprecie. " +
      "Utilisez RefundManager a la place. " +
      "Avec les Direct Charges, il n'y a plus de fonds non reclames."
    );
  }

  /**
   * Enregistre un transfert echoue pour suivi (retrocompatibilite)
   * Avec Direct Charges, les transferts echoues sont geres par Stripe/le provider
   * Cette methode cree juste un log pour le tracking admin
   */
  async registerUnclaimedFund(data: {
    paymentIntentId: string;
    chargeId?: string;
    callSessionId: string;
    totalAmount: number;
    providerAmount: number;
    platformAmount: number;
    currency: string;
    clientId: string;
    providerId: string;
    reason: string;
    reasonDetails?: string;
  }): Promise<void> {
    console.log("[UNCLAIMED] Registering failed transfer for tracking:", data.callSessionId);

    // Avec Direct Charges, on ne garde qu'un log pour le tracking admin
    // L'argent est deja chez le provider, donc pas de "unclaimed funds"
    await this.db.collection("failed_transfers_log").add({
      ...data,
      type: "transfer_failed",
      note: "Direct Charges - tracking only, funds are on provider account",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Creer une alerte admin
    await this.db.collection("admin_alerts").add({
      type: "transfer_failed",
      priority: "medium",
      title: "Transfert echoue",
      message: `Transfert de ${(data.providerAmount / 100).toFixed(2)} ${data.currency.toUpperCase()} echoue pour la session ${data.callSessionId}`,
      callSessionId: data.callSessionId,
      providerId: data.providerId,
      amount: data.providerAmount,
      currency: data.currency,
      reason: data.reason,
      reasonDetails: data.reasonDetails,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

// Export de la config pour retrocompatibilite
export const UNCLAIMED_FUNDS_CONFIG = {
  REASONS: REFUND_CONFIG.REASONS,
  STATUS: REFUND_CONFIG.STATUS,
};
