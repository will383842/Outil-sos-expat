/**
 * processUnclaimedFunds.ts
 *
 * Gestion des fonds non réclamés pour les prestataires n'ayant pas complété leur KYC.
 *
 * Workflow:
 * 1. Un paiement est effectué mais le prestataire n'a pas complété son KYC
 * 2. Les fonds sont conservés dans pending_transfers avec status='pending_kyc'
 * 3. Cette fonction schedulée s'exécute quotidiennement et:
 *    - Envoie des rappels à 7j, 30j, 60j, 90j, 120j, 150j
 *    - Après 180 jours, transfère les fonds à SOS Expat (forfeiture)
 *
 * Base légale: CGV Article 8.6-8.9 (acceptées par le prestataire à l'inscription)
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logError } from "../utils/logs/logError";

// CRITICAL: Lazy initialization to avoid deployment timeout
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

// Configuration
const UNCLAIMED_FUNDS_CONFIG = {
  // Délais de rappel en jours depuis la création du pending_transfer
  REMINDER_DAYS: [7, 30, 60, 90, 120, 150],

  // Délai de forfeiture en jours
  FORFEITURE_DAYS: 180,

  // Délai de réclamation exceptionnelle (après forfeiture)
  EXCEPTIONAL_CLAIM_DAYS: 365, // 12 mois après les 180 jours

  // Frais de traitement en cas de réclamation acceptée (20%)
  EXCEPTIONAL_CLAIM_FEE_PERCENT: 20,

  // Collections
  COLLECTIONS: {
    PENDING_TRANSFERS: "pending_transfers",
    FORFEITED_FUNDS: "forfeited_funds",
    UNCLAIMED_FUNDS_LOG: "unclaimed_funds_log",
    MESSAGE_EVENTS: "message_events",
    ADMIN_ALERTS: "admin_alerts",
    INAPP_NOTIFICATIONS: "inapp_notifications",
  },

  // Statuts
  STATUS: {
    PENDING_KYC: "pending_kyc",
    REMINDER_SENT: "reminder_sent",
    FORFEITED: "forfeited",
    CLAIMED_AFTER_FORFEITURE: "claimed_after_forfeiture",
  },
};

// Types
interface PendingTransfer {
  id: string;
  paymentIntentId: string;
  providerId: string;
  providerStripeAccountId: string | null;
  clientId: string;
  callSessionId: string | null;
  amount: number; // en centimes (total)
  providerAmount: number; // en centimes (part prestataire)
  commissionAmount: number; // en centimes (commission SOS)
  currency: string;
  status: string;
  reason: string;
  createdAt: admin.firestore.Timestamp;
  processedAt?: admin.firestore.Timestamp;
  transferId?: string;
  errorMessage?: string;
  retryCount?: number;
  // Champs ajoutés pour le suivi des rappels
  remindersSent?: number[];
  lastReminderAt?: admin.firestore.Timestamp;
  forfeitedAt?: admin.firestore.Timestamp;
}

interface ProviderInfo {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  preferredLanguage?: string;
  providerType: "lawyer" | "expat";
}

interface ProcessResult {
  reminders: {
    sent: number;
    failed: number;
  };
  forfeitures: {
    processed: number;
    amount: number;
    failed: number;
  };
}

/**
 * Classe principale de gestion des fonds non réclamés
 */
export class UnclaimedFundsProcessor {
  private db: admin.firestore.Firestore;

  constructor(db?: admin.firestore.Firestore) {
    this.db = db || admin.firestore();
  }

  /**
   * Traitement principal - appelé quotidiennement
   */
  async process(): Promise<ProcessResult> {
    console.log("🔔 [UNCLAIMED_FUNDS] Starting daily processing");

    const result: ProcessResult = {
      reminders: { sent: 0, failed: 0 },
      forfeitures: { processed: 0, amount: 0, failed: 0 },
    };

    try {
      // 1. Récupérer tous les pending_transfers en attente de KYC
      const pendingTransfers = await this.getPendingTransfers();
      console.log(`📋 [UNCLAIMED_FUNDS] Found ${pendingTransfers.length} pending transfers`);

      const now = Date.now();

      for (const transfer of pendingTransfers) {
        const createdAt = transfer.createdAt.toMillis();
        const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

        // 2. Vérifier si on doit envoyer un rappel
        const reminderResult = await this.checkAndSendReminder(transfer, daysSinceCreation);
        if (reminderResult.sent) {
          result.reminders.sent++;
        } else if (reminderResult.failed) {
          result.reminders.failed++;
        }

        // 3. Vérifier si on doit effectuer la forfeiture (180 jours)
        if (daysSinceCreation >= UNCLAIMED_FUNDS_CONFIG.FORFEITURE_DAYS) {
          const forfeitResult = await this.processForfeiture(transfer);
          if (forfeitResult.success) {
            result.forfeitures.processed++;
            result.forfeitures.amount += transfer.providerAmount;
          } else {
            result.forfeitures.failed++;
          }
        }
      }

      console.log("✅ [UNCLAIMED_FUNDS] Processing complete:", result);

      // Créer une alerte admin si des forfeitures ont eu lieu
      if (result.forfeitures.processed > 0) {
        await this.createAdminAlert(
          "unclaimed_funds_forfeited",
          "Fonds non réclamés acquis",
          `${result.forfeitures.processed} transfert(s) non réclamé(s) ont été acquis pour un total de ${(result.forfeitures.amount / 100).toFixed(2)} EUR.`,
          "medium",
          { ...result }
        );
      }

      return result;
    } catch (error) {
      console.error("❌ [UNCLAIMED_FUNDS] Error during processing:", error);
      await logError("UnclaimedFundsProcessor:process", error);
      throw error;
    }
  }

  /**
   * Récupère les pending_transfers en attente de KYC
   */
  private async getPendingTransfers(): Promise<PendingTransfer[]> {
    const snapshot = await this.db
      .collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.PENDING_TRANSFERS)
      .where("status", "==", UNCLAIMED_FUNDS_CONFIG.STATUS.PENDING_KYC)
      .orderBy("createdAt", "asc")
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PendingTransfer[];
  }

  /**
   * Vérifie et envoie un rappel si nécessaire
   */
  private async checkAndSendReminder(
    transfer: PendingTransfer,
    daysSinceCreation: number
  ): Promise<{ sent: boolean; failed: boolean }> {
    const remindersSent = transfer.remindersSent || [];

    // Trouver le prochain rappel à envoyer
    for (const reminderDay of UNCLAIMED_FUNDS_CONFIG.REMINDER_DAYS) {
      if (daysSinceCreation >= reminderDay && !remindersSent.includes(reminderDay)) {
        try {
          // Récupérer les infos du prestataire
          const providerInfo = await this.getProviderInfo(transfer.providerId);

          if (!providerInfo) {
            console.warn(`[UNCLAIMED_FUNDS] Provider ${transfer.providerId} not found`);
            return { sent: false, failed: true };
          }

          // Envoyer le rappel
          await this.sendReminder(transfer, providerInfo, reminderDay, daysSinceCreation);

          // Mettre à jour le pending_transfer
          await this.db
            .collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.PENDING_TRANSFERS)
            .doc(transfer.id)
            .update({
              remindersSent: admin.firestore.FieldValue.arrayUnion(reminderDay),
              lastReminderAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

          // Log
          await this.logAction(transfer, "reminder_sent", {
            reminderDay,
            email: providerInfo.email,
          });

          console.log(
            `📧 [UNCLAIMED_FUNDS] Reminder sent for day ${reminderDay} to ${providerInfo.email}`
          );

          return { sent: true, failed: false };
        } catch (error) {
          console.error(`❌ [UNCLAIMED_FUNDS] Failed to send reminder:`, error);
          await logError("UnclaimedFundsProcessor:sendReminder", error);
          return { sent: false, failed: true };
        }
      }
    }

    return { sent: false, failed: false };
  }

  /**
   * Récupère les informations du prestataire
   */
  private async getProviderInfo(providerId: string): Promise<ProviderInfo | null> {
    // Essayer d'abord dans users
    const userDoc = await this.db.collection("users").doc(providerId).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      return {
        email: data?.email || "",
        firstName: data?.firstName,
        lastName: data?.lastName,
        displayName: data?.displayName,
        preferredLanguage: data?.preferredLanguage || data?.language || "en",
        providerType: data?.role === "lawyer" ? "lawyer" : "expat",
      };
    }

    // Essayer dans lawyers
    const lawyerDoc = await this.db.collection("lawyers").doc(providerId).get();
    if (lawyerDoc.exists) {
      const data = lawyerDoc.data();
      return {
        email: data?.email || "",
        firstName: data?.firstName,
        lastName: data?.lastName,
        displayName: data?.displayName,
        preferredLanguage: data?.preferredLanguage || data?.language || "en",
        providerType: "lawyer",
      };
    }

    // Essayer dans expats
    const expatDoc = await this.db.collection("expats").doc(providerId).get();
    if (expatDoc.exists) {
      const data = expatDoc.data();
      return {
        email: data?.email || "",
        firstName: data?.firstName,
        lastName: data?.lastName,
        displayName: data?.displayName,
        preferredLanguage: data?.preferredLanguage || data?.language || "en",
        providerType: "expat",
      };
    }

    return null;
  }

  /**
   * Envoie un rappel au prestataire
   */
  private async sendReminder(
    transfer: PendingTransfer,
    providerInfo: ProviderInfo,
    reminderDay: number,
    daysSinceCreation: number
  ): Promise<void> {
    const daysRemaining = UNCLAIMED_FUNDS_CONFIG.FORFEITURE_DAYS - daysSinceCreation;
    const amount = transfer.providerAmount / 100;

    // Déterminer l'urgence du rappel
    let eventId: string;
    if (reminderDay <= 30) {
      eventId = "unclaimed_funds.reminder.initial";
    } else if (reminderDay <= 90) {
      eventId = "unclaimed_funds.reminder.followup";
    } else {
      eventId = "unclaimed_funds.reminder.urgent";
    }

    // Créer l'événement de notification email
    await this.db.collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.MESSAGE_EVENTS).add({
      eventId,
      locale: providerInfo.preferredLanguage || "en",
      to: {
        email: providerInfo.email,
      },
      context: {
        user: {
          uid: transfer.providerId,
          email: providerInfo.email,
          preferredLanguage: providerInfo.preferredLanguage || "en",
        },
      },
      vars: {
        FIRST_NAME: providerInfo.firstName || providerInfo.displayName || "Provider",
        LAST_NAME: providerInfo.lastName || "",
        AMOUNT: amount.toFixed(2),
        CURRENCY: transfer.currency.toUpperCase(),
        DAYS_REMAINING: daysRemaining,
        REMINDER_NUMBER: UNCLAIMED_FUNDS_CONFIG.REMINDER_DAYS.indexOf(reminderDay) + 1,
        TOTAL_REMINDERS: UNCLAIMED_FUNDS_CONFIG.REMINDER_DAYS.length,
        KYC_LINK: `https://sos-expat.com/dashboard/kyc?provider=${transfer.providerId}`,
        FORFEITURE_DATE: this.getForfeitureDate(transfer.createdAt),
        PROVIDER_TYPE: providerInfo.providerType,
      },
      uid: transfer.providerId,
      dedupeKey: `unclaimed_funds_reminder_${transfer.id}_${reminderDay}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notification in-app
    await this.db.collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.INAPP_NOTIFICATIONS).add({
      uid: transfer.providerId,
      type: "unclaimed_funds_reminder",
      title:
        providerInfo.preferredLanguage === "fr"
          ? "Fonds en attente - Action requise"
          : "Pending funds - Action required",
      message:
        providerInfo.preferredLanguage === "fr"
          ? `Vous avez ${amount.toFixed(2)} ${transfer.currency.toUpperCase()} en attente. Complétez votre KYC dans les ${daysRemaining} jours pour recevoir vos fonds.`
          : `You have ${amount.toFixed(2)} ${transfer.currency.toUpperCase()} pending. Complete your KYC within ${daysRemaining} days to receive your funds.`,
      read: false,
      pendingTransferId: transfer.id,
      amount: transfer.providerAmount,
      daysRemaining,
      actionUrl: "/dashboard/kyc",
      priority: reminderDay >= 120 ? "high" : "medium",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Calcule la date de forfeiture
   */
  private getForfeitureDate(createdAt: admin.firestore.Timestamp): string {
    const date = new Date(createdAt.toMillis());
    date.setDate(date.getDate() + UNCLAIMED_FUNDS_CONFIG.FORFEITURE_DAYS);
    return date.toISOString().split("T")[0];
  }

  /**
   * Traite la forfeiture (acquisition des fonds par SOS Expat)
   */
  private async processForfeiture(
    transfer: PendingTransfer
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`💰 [UNCLAIMED_FUNDS] Processing forfeiture for transfer ${transfer.id}`);

    try {
      const batch = this.db.batch();

      // 1. Mettre à jour le pending_transfer
      const transferRef = this.db
        .collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.PENDING_TRANSFERS)
        .doc(transfer.id);

      batch.update(transferRef, {
        status: UNCLAIMED_FUNDS_CONFIG.STATUS.FORFEITED,
        forfeitedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Créer un enregistrement dans forfeited_funds
      const forfeitedRef = this.db
        .collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.FORFEITED_FUNDS)
        .doc();

      batch.set(forfeitedRef, {
        originalPendingTransferId: transfer.id,
        paymentIntentId: transfer.paymentIntentId,
        providerId: transfer.providerId,
        clientId: transfer.clientId,
        callSessionId: transfer.callSessionId,
        amount: transfer.providerAmount, // Montant acquis (part prestataire)
        currency: transfer.currency,
        originalCreatedAt: transfer.createdAt,
        forfeitedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "forfeited",
        legalBasis: "CGV Article 8.6-8.9 - Fonds non réclamés après 180 jours",
        remindersSent: transfer.remindersSent || [],
        // Pour les réclamations exceptionnelles
        exceptionalClaimDeadline: this.getExceptionalClaimDeadline(),
        exceptionalClaimStatus: "eligible",
      });

      await batch.commit();

      // 3. Notifier le prestataire de la forfeiture
      const providerInfo = await this.getProviderInfo(transfer.providerId);
      if (providerInfo) {
        await this.sendForfeitureNotification(transfer, providerInfo);
      }

      // 4. Log l'action
      await this.logAction(transfer, "forfeited", {
        amount: transfer.providerAmount,
        forfeitedFundsId: forfeitedRef.id,
      });

      console.log(`✅ [UNCLAIMED_FUNDS] Forfeiture complete for ${transfer.id}`);

      return { success: true };
    } catch (error) {
      console.error(`❌ [UNCLAIMED_FUNDS] Forfeiture failed for ${transfer.id}:`, error);
      await logError("UnclaimedFundsProcessor:forfeiture", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Calcule la date limite de réclamation exceptionnelle
   */
  private getExceptionalClaimDeadline(): admin.firestore.Timestamp {
    const date = new Date();
    date.setDate(date.getDate() + UNCLAIMED_FUNDS_CONFIG.EXCEPTIONAL_CLAIM_DAYS);
    return admin.firestore.Timestamp.fromDate(date);
  }

  /**
   * Envoie une notification de forfeiture
   */
  private async sendForfeitureNotification(
    transfer: PendingTransfer,
    providerInfo: ProviderInfo
  ): Promise<void> {
    const amount = transfer.providerAmount / 100;

    // Email
    await this.db.collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.MESSAGE_EVENTS).add({
      eventId: "unclaimed_funds.forfeited",
      locale: providerInfo.preferredLanguage || "en",
      to: {
        email: providerInfo.email,
      },
      context: {
        user: {
          uid: transfer.providerId,
          email: providerInfo.email,
          preferredLanguage: providerInfo.preferredLanguage || "en",
        },
      },
      vars: {
        FIRST_NAME: providerInfo.firstName || providerInfo.displayName || "Provider",
        AMOUNT: amount.toFixed(2),
        CURRENCY: transfer.currency.toUpperCase(),
        EXCEPTIONAL_CLAIM_DEADLINE: this.getExceptionalClaimDeadline()
          .toDate()
          .toISOString()
          .split("T")[0],
        EXCEPTIONAL_CLAIM_FEE: UNCLAIMED_FUNDS_CONFIG.EXCEPTIONAL_CLAIM_FEE_PERCENT,
        CONTACT_LINK: "https://sos-expat.com/contact",
      },
      uid: transfer.providerId,
      dedupeKey: `unclaimed_funds_forfeited_${transfer.id}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notification in-app
    await this.db.collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.INAPP_NOTIFICATIONS).add({
      uid: transfer.providerId,
      type: "unclaimed_funds_forfeited",
      title:
        providerInfo.preferredLanguage === "fr"
          ? "Fonds non réclamés - Déchéance"
          : "Unclaimed funds - Forfeiture",
      message:
        providerInfo.preferredLanguage === "fr"
          ? `Conformément aux CGU Article 8.6-8.9, vos fonds de ${amount.toFixed(2)} ${transfer.currency.toUpperCase()} non réclamés après 180 jours ont été acquis par la plateforme. Vous pouvez soumettre une réclamation exceptionnelle dans les 12 mois.`
          : `In accordance with Terms Article 8.6-8.9, your unclaimed funds of ${amount.toFixed(2)} ${transfer.currency.toUpperCase()} after 180 days have been acquired by the platform. You may submit an exceptional claim within 12 months.`,
      read: false,
      pendingTransferId: transfer.id,
      amount: transfer.providerAmount,
      priority: "high",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Log une action dans la collection de logs
   */
  private async logAction(
    transfer: PendingTransfer,
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    await this.db.collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.UNCLAIMED_FUNDS_LOG).add({
      pendingTransferId: transfer.id,
      providerId: transfer.providerId,
      action,
      details,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Crée une alerte admin
   */
  private async createAdminAlert(
    type: string,
    title: string,
    message: string,
    priority: "low" | "medium" | "high" | "critical",
    details?: Record<string, unknown>
  ): Promise<void> {
    await this.db.collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.ADMIN_ALERTS).add({
      type,
      title,
      message,
      priority,
      details,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Traite une réclamation exceptionnelle
   */
  async processExceptionalClaim(
    forfeitedFundsId: string,
    claimReason: "medical_incapacity" | "force_majeure" | "platform_error",
    supportingDocuments: string[],
    adminUserId: string
  ): Promise<{
    success: boolean;
    refundAmount?: number;
    processingFee?: number;
    error?: string;
  }> {
    console.log(`🔄 [UNCLAIMED_FUNDS] Processing exceptional claim for ${forfeitedFundsId}`);

    try {
      const forfeitedDoc = await this.db
        .collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.FORFEITED_FUNDS)
        .doc(forfeitedFundsId)
        .get();

      if (!forfeitedDoc.exists) {
        return { success: false, error: "Forfeited funds record not found" };
      }

      const data = forfeitedDoc.data();
      if (!data) {
        return { success: false, error: "No data found" };
      }

      // Vérifier si encore éligible
      if (data.exceptionalClaimStatus !== "eligible") {
        return { success: false, error: "Claim no longer eligible" };
      }

      const deadline = data.exceptionalClaimDeadline?.toDate();
      if (deadline && new Date() > deadline) {
        return { success: false, error: "Exceptional claim deadline has passed" };
      }

      // Calculer le montant après frais
      const originalAmount = data.amount;
      const processingFee = Math.round(
        (originalAmount * UNCLAIMED_FUNDS_CONFIG.EXCEPTIONAL_CLAIM_FEE_PERCENT) / 100
      );
      const refundAmount = originalAmount - processingFee;

      // Mettre à jour le record
      await forfeitedDoc.ref.update({
        exceptionalClaimStatus: "approved",
        claimReason,
        supportingDocuments,
        claimProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        claimProcessedBy: adminUserId,
        refundAmount,
        processingFee,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Créer un pending_transfer pour le remboursement
      await this.db.collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.PENDING_TRANSFERS).add({
        paymentIntentId: data.paymentIntentId,
        providerId: data.providerId,
        clientId: data.clientId,
        callSessionId: data.callSessionId,
        amount: refundAmount,
        providerAmount: refundAmount,
        commissionAmount: 0,
        currency: data.currency,
        status: "pending_kyc",
        reason: "exceptional_claim_refund",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        originalForfeitedFundsId: forfeitedFundsId,
        claimReason,
      });

      // Log
      await this.db.collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.UNCLAIMED_FUNDS_LOG).add({
        forfeitedFundsId,
        providerId: data.providerId,
        action: "exceptional_claim_approved",
        details: {
          claimReason,
          originalAmount,
          processingFee,
          refundAmount,
          processedBy: adminUserId,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `✅ [UNCLAIMED_FUNDS] Exceptional claim approved. Refund: ${refundAmount / 100} EUR`
      );

      return {
        success: true,
        refundAmount,
        processingFee,
      };
    } catch (error) {
      console.error("❌ [UNCLAIMED_FUNDS] Error processing exceptional claim:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Récupère les statistiques des fonds non réclamés
   */
  async getStats(): Promise<{
    pendingCount: number;
    pendingAmount: number;
    forfeitedCount: number;
    forfeitedAmount: number;
    pendingByAge: Record<string, number>;
  }> {
    const [pendingSnapshot, forfeitedSnapshot] = await Promise.all([
      this.db
        .collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.PENDING_TRANSFERS)
        .where("status", "==", UNCLAIMED_FUNDS_CONFIG.STATUS.PENDING_KYC)
        .get(),
      this.db
        .collection(UNCLAIMED_FUNDS_CONFIG.COLLECTIONS.FORFEITED_FUNDS)
        .where("status", "==", "forfeited")
        .get(),
    ]);

    let pendingAmount = 0;
    const pendingByAge: Record<string, number> = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "91-120": 0,
      "121-150": 0,
      "151-180": 0,
    };

    const now = Date.now();
    pendingSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      pendingAmount += data.providerAmount || 0;

      const createdAt = data.createdAt?.toMillis() || now;
      const days = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

      if (days <= 30) pendingByAge["0-30"]++;
      else if (days <= 60) pendingByAge["31-60"]++;
      else if (days <= 90) pendingByAge["61-90"]++;
      else if (days <= 120) pendingByAge["91-120"]++;
      else if (days <= 150) pendingByAge["121-150"]++;
      else pendingByAge["151-180"]++;
    });

    let forfeitedAmount = 0;
    forfeitedSnapshot.docs.forEach((doc) => {
      forfeitedAmount += doc.data().amount || 0;
    });

    return {
      pendingCount: pendingSnapshot.size,
      pendingAmount: pendingAmount / 100,
      forfeitedCount: forfeitedSnapshot.size,
      forfeitedAmount: forfeitedAmount / 100,
      pendingByAge,
    };
  }
}

// ====== FONCTION SCHEDULÉE ======

/**
 * Fonction Cloud schedulée pour traiter les fonds non réclamés
 * S'exécute tous les jours à 6h00 (heure de Paris)
 */
export const scheduledProcessUnclaimedFunds = onSchedule(
  {
    schedule: "0 6 * * *", // Tous les jours à 6h00
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 540, // 9 minutes max
  },
  async () => {
    ensureInitialized();
    console.log("🕐 [SCHEDULED] Starting daily unclaimed funds processing");

    try {
      const processor = new UnclaimedFundsProcessor();
      const result = await processor.process();

      console.log("🕐 [SCHEDULED] Unclaimed funds processing completed:", result);

      // Résumé quotidien pour l'admin
      if (result.reminders.sent > 0 || result.forfeitures.processed > 0) {
        await admin.firestore().collection("admin_alerts").add({
          type: "unclaimed_funds_daily_summary",
          priority: "low",
          title: "Résumé quotidien - Fonds non réclamés",
          message: `Rappels envoyés: ${result.reminders.sent}, Forfeitures: ${result.forfeitures.processed} (${(result.forfeitures.amount / 100).toFixed(2)} EUR)`,
          details: result,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("💥 [SCHEDULED] Unclaimed funds processing failed:", error);

      await admin.firestore().collection("admin_alerts").add({
        type: "unclaimed_funds_processing_failed",
        priority: "critical",
        title: "Erreur traitement fonds non réclamés",
        message: `Le job quotidien a échoué: ${error instanceof Error ? error.message : "Unknown error"}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

// Export de la config pour tests
export { UNCLAIMED_FUNDS_CONFIG };
