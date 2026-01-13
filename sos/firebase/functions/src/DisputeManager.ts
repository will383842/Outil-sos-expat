/**
 * DisputeManager.ts
 * Gestionnaire des notifications de litiges Stripe (charge.dispute.*)
 *
 * IMPORTANT: Avec les Direct Charges, les disputes sont gérées directement
 * par Stripe sur le compte du provider. Ce gestionnaire ne fait que:
 * - Recevoir les webhooks de disputes (informatif)
 * - Notifier le provider qu'une dispute a été ouverte
 * - Logger les événements pour suivi
 *
 * La plateforme n'a plus à gérer les fonds en cas de dispute.
 */

import * as admin from "firebase-admin";
import Stripe from "stripe";

// Types simplifiés pour les disputes (tracking uniquement)
export interface DisputeRecord {
  id: string;
  stripeDisputeId: string;
  chargeId: string;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
  reason: string;
  status: DisputeStatus;

  // Relations
  callSessionId: string | null;
  clientId: string | null;
  providerId: string | null;
  providerStripeAccountId: string | null;

  // Dates
  createdAt: admin.firestore.FieldValue | Date;
  updatedAt: admin.firestore.FieldValue | Date;
  evidenceDueBy: Date | null;
  closedAt: Date | null;

  // Résolution
  outcome: DisputeOutcome | null;
  networkReasonCode: string | null;

  // Historique
  statusHistory: StatusHistoryEntry[];
}

export type DisputeStatus =
  | "warning_needs_response"
  | "warning_under_review"
  | "warning_closed"
  | "needs_response"
  | "under_review"
  | "won"
  | "lost";

export type DisputeOutcome = "won" | "lost" | "withdrawn";

export interface StatusHistoryEntry {
  status: DisputeStatus;
  timestamp: Date;
  reason?: string;
}

// Raisons de dispute Stripe
const DISPUTE_REASON_LABELS: Record<string, string> = {
  duplicate: "Paiement en double",
  fraudulent: "Fraude suspectée",
  subscription_canceled: "Abonnement annulé",
  product_unacceptable: "Service non conforme",
  product_not_received: "Service non reçu",
  unrecognized: "Transaction non reconnue",
  credit_not_processed: "Remboursement non traité",
  general: "Motif général",
  incorrect_account_details: "Détails du compte incorrects",
  insufficient_funds: "Fonds insuffisants",
  bank_cannot_process: "Banque ne peut pas traiter",
  debit_not_authorized: "Débit non autorisé",
  customer_initiated: "Initié par le client",
};

/**
 * Classe de gestion des notifications de disputes
 * Note: Avec les Direct Charges, les disputes sont le problème du provider
 */
export class DisputeManager {
  private db: admin.firestore.Firestore;
  private stripe: Stripe;

  constructor(db: admin.firestore.Firestore, stripe: Stripe) {
    this.db = db;
    this.stripe = stripe;
  }

  /**
   * Gère l'événement charge.dispute.created
   * Enregistre le litige et notifie le provider
   */
  async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    console.log("[DISPUTE_CREATED] Processing dispute:", dispute.id);

    try {
      // Récupérer les informations de la charge
      const charge = await this.getChargeDetails(dispute.charge as string);

      // Extraire les métadonnées
      const metadata = charge?.metadata || {};
      const callSessionId = metadata.callSessionId || null;
      const clientId = metadata.clientId || null;
      const providerId = metadata.providerId || null;

      // Récupérer le compte provider si disponible
      let providerStripeAccountId: string | null = null;
      if (charge?.payment_intent) {
        const piId = typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent.id;

        // Avec Direct Charges, le on_behalf_of contient le compte provider
        const pi = await this.stripe.paymentIntents.retrieve(piId);
        if (pi.on_behalf_of) {
          providerStripeAccountId = typeof pi.on_behalf_of === "string"
            ? pi.on_behalf_of
            : pi.on_behalf_of.id;
        }
      }

      // Créer l'enregistrement de dispute (tracking uniquement)
      const disputeRecord: DisputeRecord = {
        id: dispute.id,
        stripeDisputeId: dispute.id,
        chargeId: typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id,
        paymentIntentId: charge?.payment_intent
          ? (typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id)
          : null,
        amount: dispute.amount,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status as DisputeStatus,

        callSessionId,
        clientId,
        providerId,
        providerStripeAccountId,

        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        evidenceDueBy: dispute.evidence_details?.due_by
          ? new Date(dispute.evidence_details.due_by * 1000)
          : null,
        closedAt: null,

        outcome: null,
        networkReasonCode: dispute.network_reason_code || null,

        statusHistory: [{
          status: dispute.status as DisputeStatus,
          timestamp: new Date(),
          reason: "Dispute créée",
        }],
      };

      // Sauvegarder dans Firestore
      await this.db.collection("disputes").doc(dispute.id).set(disputeRecord);

      console.log("[DISPUTE_CREATED] Dispute saved to Firestore:", dispute.id);

      // Mettre à jour la session d'appel si liée
      if (callSessionId) {
        await this.updateCallSessionDispute(callSessionId, dispute.id, "created");
      }

      // Notifier le provider (c'est maintenant son problème avec Direct Charges)
      if (providerId) {
        await this.notifyProviderOfDispute(providerId, disputeRecord);
      }

      // Créer une alerte admin (pour info uniquement)
      await this.createDisputeAlert(disputeRecord);

      console.log("[DISPUTE_CREATED] Processing complete for:", dispute.id);

    } catch (error) {
      console.error("[DISPUTE_CREATED] Error processing dispute:", error);
      throw error;
    }
  }

  /**
   * Gère l'événement charge.dispute.updated
   * Met à jour l'état du litige pour tracking
   */
  async handleDisputeUpdated(dispute: Stripe.Dispute): Promise<void> {
    console.log("[DISPUTE_UPDATED] Processing update for:", dispute.id);

    try {
      const disputeRef = this.db.collection("disputes").doc(dispute.id);
      const disputeDoc = await disputeRef.get();

      if (!disputeDoc.exists) {
        console.log("[DISPUTE_UPDATED] Dispute not found, creating new record");
        await this.handleDisputeCreated(dispute);
        return;
      }

      const existingData = disputeDoc.data() as DisputeRecord;
      const statusHistory = existingData.statusHistory || [];

      // Ajouter le nouveau statut à l'historique si différent
      if (existingData.status !== dispute.status) {
        statusHistory.push({
          status: dispute.status as DisputeStatus,
          timestamp: new Date(),
          reason: "Mise à jour automatique Stripe",
        });
      }

      // Mettre à jour le document
      await disputeRef.update({
        status: dispute.status,
        evidenceDueBy: dispute.evidence_details?.due_by
          ? new Date(dispute.evidence_details.due_by * 1000)
          : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory,
      });

      console.log("[DISPUTE_UPDATED] Dispute updated:", dispute.id, "Status:", dispute.status);

    } catch (error) {
      console.error("[DISPUTE_UPDATED] Error updating dispute:", error);
      throw error;
    }
  }

  /**
   * Gère l'événement charge.dispute.closed
   * Enregistre la résolution et notifie le provider
   */
  async handleDisputeClosed(dispute: Stripe.Dispute): Promise<void> {
    console.log("[DISPUTE_CLOSED] Processing closure for:", dispute.id);

    try {
      const disputeRef = this.db.collection("disputes").doc(dispute.id);
      const disputeDoc = await disputeRef.get();

      if (!disputeDoc.exists) {
        console.log("[DISPUTE_CLOSED] Dispute not found, creating record");
        await this.handleDisputeCreated(dispute);
      }

      const existingData = (disputeDoc.data() as DisputeRecord) || {};
      const statusHistory = existingData.statusHistory || [];

      // Déterminer l'issue
      const outcome: DisputeOutcome = dispute.status === "won"
        ? "won"
        : dispute.status === "lost"
          ? "lost"
          : "withdrawn";

      statusHistory.push({
        status: dispute.status as DisputeStatus,
        timestamp: new Date(),
        reason: `Dispute fermée - ${outcome}`,
      });

      // Mettre à jour le document
      await disputeRef.update({
        status: dispute.status,
        outcome,
        closedAt: new Date(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory,
      });

      // Mettre à jour la session d'appel si liée
      if (existingData.callSessionId) {
        await this.updateCallSessionDispute(
          existingData.callSessionId,
          dispute.id,
          outcome === "won" ? "resolved_won" : "resolved_lost"
        );
      }

      // Notifier le provider du résultat
      if (existingData.providerId) {
        await this.notifyProviderOfDisputeResolution(
          existingData.providerId,
          dispute.id,
          outcome,
          existingData
        );
      }

      // Créer une alerte admin (pour info)
      await this.createDisputeClosureAlert(dispute.id, outcome, existingData);

      console.log("[DISPUTE_CLOSED] Dispute closed:", dispute.id, "Outcome:", outcome);

    } catch (error) {
      console.error("[DISPUTE_CLOSED] Error closing dispute:", error);
      throw error;
    }
  }

  /**
   * Récupère les détails d'une charge Stripe
   */
  private async getChargeDetails(chargeId: string): Promise<Stripe.Charge | null> {
    try {
      return await this.stripe.charges.retrieve(chargeId);
    } catch (error) {
      console.error("Error retrieving charge:", chargeId, error);
      return null;
    }
  }

  /**
   * Met à jour la session d'appel avec les infos de dispute
   */
  private async updateCallSessionDispute(
    callSessionId: string,
    disputeId: string,
    status: string
  ): Promise<void> {
    try {
      await this.db.collection("call_sessions").doc(callSessionId).update({
        "dispute.id": disputeId,
        "dispute.status": status,
        "dispute.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Updated call_session with dispute info:", callSessionId);
    } catch (error) {
      console.error("Error updating call_session with dispute:", error);
    }
  }

  /**
   * Récupère la locale préférée du provider
   */
  private async getProviderLocale(providerId: string): Promise<string> {
    try {
      const providerDoc = await this.db.doc(`providers/${providerId}`).get();
      if (providerDoc.exists) {
        const data = providerDoc.data();
        return data?.language || data?.preferredLanguage || data?.lang || 'fr-FR';
      }
      return 'fr-FR';
    } catch {
      return 'fr-FR';
    }
  }

  /**
   * Notifie le provider qu'une dispute a été ouverte sur son compte
   * IMPORTANT: Avec les Direct Charges, c'est le provider qui doit gérer la dispute
   */
  private async notifyProviderOfDispute(
    providerId: string,
    disputeRecord: DisputeRecord
  ): Promise<void> {
    try {
      const locale = await this.getProviderLocale(providerId);
      await this.db.collection("notifications").add({
        userId: providerId,
        type: "dispute_opened",
        title: "Litige ouvert sur votre compte",
        message: `Un client a ouvert un litige de ${(disputeRecord.amount / 100).toFixed(2)} ${disputeRecord.currency.toUpperCase()}. ` +
          `Raison: ${DISPUTE_REASON_LABELS[disputeRecord.reason] || disputeRecord.reason}. ` +
          `Vous devez répondre via votre dashboard Stripe avant le ${disputeRecord.evidenceDueBy?.toLocaleDateString(locale) || "N/A"}.`,
        data: {
          disputeId: disputeRecord.id,
          amount: disputeRecord.amount,
          currency: disputeRecord.currency,
          reason: disputeRecord.reason,
          evidenceDueBy: disputeRecord.evidenceDueBy,
          callSessionId: disputeRecord.callSessionId,
        },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Notified provider of dispute:", providerId);
    } catch (error) {
      console.error("Error notifying provider of dispute:", error);
    }
  }

  /**
   * Notifie le provider de la résolution de la dispute
   */
  private async notifyProviderOfDisputeResolution(
    providerId: string,
    disputeId: string,
    outcome: DisputeOutcome,
    disputeData: DisputeRecord
  ): Promise<void> {
    try {
      const outcomeMessages = {
        won: "Bonne nouvelle ! Le litige a été résolu en votre faveur.",
        lost: "Le litige a été résolu en faveur du client. Le montant a été débité de votre compte Stripe.",
        withdrawn: "Le client a retiré sa demande de litige.",
      };

      await this.db.collection("notifications").add({
        userId: providerId,
        type: "dispute_resolved",
        title: `Litige ${outcome === "won" ? "gagné" : outcome === "lost" ? "perdu" : "retiré"}`,
        message: outcomeMessages[outcome],
        data: {
          disputeId,
          outcome,
          amount: disputeData.amount,
          currency: disputeData.currency,
          callSessionId: disputeData.callSessionId,
        },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Notified provider of dispute resolution:", providerId, outcome);
    } catch (error) {
      console.error("Error notifying provider of dispute resolution:", error);
    }
  }

  /**
   * Crée une alerte admin pour tracking (informatif uniquement)
   */
  private async createDisputeAlert(disputeRecord: DisputeRecord): Promise<void> {
    try {
      await this.db.collection("admin_alerts").add({
        type: "dispute_created",
        priority: "medium", // Réduit de "high" car ce n'est plus notre problème financier
        title: "Nouveau litige Stripe (Direct Charge)",
        message: `Un litige de ${(disputeRecord.amount / 100).toFixed(2)} ${disputeRecord.currency.toUpperCase()} ` +
          `a été ouvert sur le compte du provider. ` +
          `Raison: ${DISPUTE_REASON_LABELS[disputeRecord.reason] || disputeRecord.reason}. ` +
          `Note: Avec les Direct Charges, le provider gère la dispute directement.`,
        disputeId: disputeRecord.id,
        amount: disputeRecord.amount,
        reason: disputeRecord.reason,
        providerId: disputeRecord.providerId,
        providerStripeAccountId: disputeRecord.providerStripeAccountId,
        callSessionId: disputeRecord.callSessionId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Created admin alert for dispute:", disputeRecord.id);
    } catch (error) {
      console.error("Error creating dispute alert:", error);
    }
  }

  /**
   * Crée une alerte admin lors de la clôture d'une dispute (informatif)
   */
  private async createDisputeClosureAlert(
    disputeId: string,
    outcome: DisputeOutcome,
    disputeData: DisputeRecord
  ): Promise<void> {
    try {
      const outcomeLabels = {
        won: "GAGNE",
        lost: "PERDU",
        withdrawn: "RETIRE",
      };

      await this.db.collection("admin_alerts").add({
        type: "dispute_closed",
        priority: "low", // Réduit car ce n'est plus notre problème financier
        title: `Litige fermé - ${outcomeLabels[outcome]}`,
        message: `Le litige de ${(disputeData.amount / 100).toFixed(2)} ${disputeData.currency.toUpperCase()} ` +
          `a été ${outcome === "won" ? "gagné par le provider" : outcome === "lost" ? "perdu par le provider" : "retiré par le client"}. ` +
          `Note: Impact financier géré directement sur le compte Stripe du provider.`,
        disputeId,
        outcome,
        amount: disputeData.amount,
        providerId: disputeData.providerId,
        callSessionId: disputeData.callSessionId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Created closure alert for dispute:", disputeId);
    } catch (error) {
      console.error("Error creating closure alert:", error);
    }
  }
}

// Export des fonctions de handler pour utilisation dans index.ts
export async function handleDisputeCreated(
  dispute: Stripe.Dispute,
  db: admin.firestore.Firestore,
  stripe: Stripe
): Promise<void> {
  const manager = new DisputeManager(db, stripe);
  await manager.handleDisputeCreated(dispute);
}

export async function handleDisputeUpdated(
  dispute: Stripe.Dispute,
  db: admin.firestore.Firestore,
  stripe: Stripe
): Promise<void> {
  const manager = new DisputeManager(db, stripe);
  await manager.handleDisputeUpdated(dispute);
}

export async function handleDisputeClosed(
  dispute: Stripe.Dispute,
  db: admin.firestore.Firestore,
  stripe: Stripe
): Promise<void> {
  const manager = new DisputeManager(db, stripe);
  await manager.handleDisputeClosed(dispute);
}

// ============================================================================
// ADMIN CALLABLE FUNCTIONS (P0 FIX)
// ============================================================================

import * as functions from 'firebase-functions/v1';

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

// Lazy Stripe initialization
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
  ensureInitialized();
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY || '';
    if (!secretKey) {
      throw new Error('Stripe secret key not configured');
    }
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });
  }
  return stripeInstance;
}

// Lazy db initialization
const getDb = () => {
  ensureInitialized();
  return admin.firestore();
};

/**
 * Check if user is admin (via custom claims OR Firestore role)
 */
async function isAdmin(context: functions.https.CallableContext): Promise<boolean> {
  if (!context.auth) return false;

  if (context.auth.token.admin === true || context.auth.token.role === 'admin') {
    return true;
  }

  try {
    const userDoc = await getDb().collection('users').doc(context.auth.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData?.role === 'admin' || userData?.isAdmin === true;
    }
  } catch (e) {
    console.error('Error checking admin in Firestore:', e);
  }

  return false;
}

/**
 * Admin: Add a note to a dispute
 * P0 FIX: Allows admin to add internal notes without direct Firestore write
 */
export const adminAddDisputeNote = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;
    const { disputeId, note } = data as {
      disputeId: string;
      note: string;
    };

    if (!disputeId || !note) {
      throw new functions.https.HttpsError('invalid-argument', 'disputeId and note are required');
    }

    try {
      const disputeRef = getDb().doc(`disputes/${disputeId}`);
      const disputeDoc = await disputeRef.get();

      if (!disputeDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Dispute not found');
      }

      const existingData = disputeDoc.data() as DisputeRecord;
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Add note to timeline
      const timeline = existingData.statusHistory || [];
      timeline.push({
        status: existingData.status,
        timestamp: new Date(),
        reason: `Note admin: ${note}`,
      });

      // Add to internal notes array
      const internalNotes = (existingData as any).internalNotes || [];
      internalNotes.push({
        author: adminId,
        content: note,
        createdAt: new Date().toISOString(),
      });

      await disputeRef.update({
        statusHistory: timeline,
        internalNotes,
        updatedAt: now,
      });

      console.log(`[adminAddDisputeNote] Note added to dispute ${disputeId} by admin ${adminId}`);

      return {
        success: true,
        disputeId,
        message: 'Note added successfully',
      };
    } catch (error: any) {
      console.error('Error adding dispute note:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to add note');
    }
  });

/**
 * Admin: Acknowledge a dispute
 * Marks the dispute as seen by admin
 */
export const adminAcknowledgeDispute = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;
    const { disputeId } = data as { disputeId: string };

    if (!disputeId) {
      throw new functions.https.HttpsError('invalid-argument', 'disputeId is required');
    }

    try {
      const disputeRef = getDb().doc(`disputes/${disputeId}`);
      const disputeDoc = await disputeRef.get();

      if (!disputeDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Dispute not found');
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

      await disputeRef.update({
        isAcknowledged: true,
        acknowledgedAt: now,
        acknowledgedBy: adminId,
        updatedAt: now,
      });

      console.log(`[adminAcknowledgeDispute] Dispute ${disputeId} acknowledged by admin ${adminId}`);

      return {
        success: true,
        disputeId,
        message: 'Dispute acknowledged',
      };
    } catch (error: any) {
      console.error('Error acknowledging dispute:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to acknowledge');
    }
  });

/**
 * Admin: Assign a dispute to an admin
 */
export const adminAssignDispute = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const currentAdminId = context.auth!.uid;
    const { disputeId, assigneeId } = data as {
      disputeId: string;
      assigneeId: string;
    };

    if (!disputeId || !assigneeId) {
      throw new functions.https.HttpsError('invalid-argument', 'disputeId and assigneeId are required');
    }

    try {
      const disputeRef = getDb().doc(`disputes/${disputeId}`);
      const disputeDoc = await disputeRef.get();

      if (!disputeDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Dispute not found');
      }

      // Verify assignee is admin
      const assigneeDoc = await getDb().doc(`users/${assigneeId}`).get();
      if (!assigneeDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Assignee not found');
      }
      const assigneeData = assigneeDoc.data();
      if (assigneeData?.role !== 'admin' && !assigneeData?.isAdmin) {
        throw new functions.https.HttpsError('invalid-argument', 'Assignee must be an admin');
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

      await disputeRef.update({
        adminAssignee: assigneeId,
        assignedAt: now,
        assignedBy: currentAdminId,
        updatedAt: now,
      });

      console.log(`[adminAssignDispute] Dispute ${disputeId} assigned to ${assigneeId} by ${currentAdminId}`);

      return {
        success: true,
        disputeId,
        assigneeId,
        message: 'Dispute assigned successfully',
      };
    } catch (error: any) {
      console.error('Error assigning dispute:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to assign');
    }
  });

/**
 * Admin: Get dispute details with Stripe data
 * Fetches fresh data from Stripe and combines with Firestore
 */
export const adminGetDisputeDetails = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { disputeId } = data as { disputeId: string };

    if (!disputeId) {
      throw new functions.https.HttpsError('invalid-argument', 'disputeId is required');
    }

    try {
      const disputeRef = getDb().doc(`disputes/${disputeId}`);
      const disputeDoc = await disputeRef.get();

      if (!disputeDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Dispute not found');
      }

      const firestoreData = disputeDoc.data() as DisputeRecord;
      let stripeData = null;

      // Try to get fresh data from Stripe
      if (firestoreData.stripeDisputeId) {
        try {
          stripeData = await getStripe().disputes.retrieve(firestoreData.stripeDisputeId);
        } catch (stripeError) {
          console.warn('Could not fetch Stripe dispute:', stripeError);
        }
      }

      // Get related call session
      let callSession = null;
      if (firestoreData.callSessionId) {
        const sessionDoc = await getDb().doc(`call_sessions/${firestoreData.callSessionId}`).get();
        if (sessionDoc.exists) {
          callSession = { id: sessionDoc.id, ...sessionDoc.data() };
        }
      }

      // Get provider info
      let provider = null;
      if (firestoreData.providerId) {
        const providerDoc = await getDb().doc(`users/${firestoreData.providerId}`).get();
        if (providerDoc.exists) {
          const pd = providerDoc.data();
          provider = {
            id: firestoreData.providerId,
            name: pd?.displayName || pd?.firstName + ' ' + pd?.lastName,
            email: pd?.email,
          };
        }
      }

      // Get client info
      let client = null;
      if (firestoreData.clientId) {
        const clientDoc = await getDb().doc(`users/${firestoreData.clientId}`).get();
        if (clientDoc.exists) {
          const cd = clientDoc.data();
          client = {
            id: firestoreData.clientId,
            name: cd?.displayName || cd?.firstName + ' ' + cd?.lastName,
            email: cd?.email,
          };
        }
      }

      return {
        success: true,
        dispute: {
          ...firestoreData,
          id: disputeId,
        },
        stripeData,
        callSession,
        provider,
        client,
      };
    } catch (error: any) {
      console.error('Error getting dispute details:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to get details');
    }
  });
