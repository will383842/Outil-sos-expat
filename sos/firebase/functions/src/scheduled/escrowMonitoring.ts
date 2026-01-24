/**
 * escrowMonitoring.ts
 *
 * Fonction scheduled pour surveiller et gérer les escrows (pending_transfers & failed_payouts_alerts)
 *
 * GARDE-FOUS IMPLÉMENTÉS:
 * 1. Alerte si le total des escrows dépasse un seuil (1000€)
 * 2. Rappels KYC agressifs (J+1, J+7, J+30, J+90)
 * 3. Escalade admin après 6 mois sans KYC (PAS de remboursement - service rendu)
 * 4. Vérification du solde Stripe avant tout payout
 *
 * Exécution: Tous les jours à 8h00 UTC
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { logError } from "../utils/logs/logError";
import { defineSecret } from "firebase-functions/params";

// Secrets Stripe pour vérifier le solde
const STRIPE_SECRET_KEY_LIVE = defineSecret("STRIPE_SECRET_KEY_LIVE");
const STRIPE_SECRET_KEY_TEST = defineSecret("STRIPE_SECRET_KEY_TEST");

// Configuration des seuils
const ESCROW_CONFIG = {
  // Alerte si escrow total > ce montant (en EUR)
  ALERT_THRESHOLD_EUR: 1000,

  // Seuils de rappel KYC (en jours)
  KYC_REMINDER_DAYS: [1, 7, 30, 90],

  // Après ce nombre de jours sans KYC, alerte admin pour suivi manuel
  // NOTE: PAS de remboursement auto car le service (appel) a été rendu
  ESCALATION_AFTER_DAYS: 180, // 6 mois - alerte admin seulement

  // Minimum à garder sur Stripe pour les escrows (buffer de sécurité)
  STRIPE_BALANCE_BUFFER_EUR: 500,
};

interface EscrowStats {
  stripe: {
    pendingCount: number;
    pendingAmountEur: number;
    oldestPendingDays: number;
  };
  paypal: {
    failedCount: number;
    failedAmountEur: number;
    oldestFailedDays: number;
  };
  totalEscrowEur: number;
  providersWithPendingKyc: string[];
}

/**
 * Calcule les statistiques des escrows
 */
async function getEscrowStats(db: admin.firestore.Firestore): Promise<EscrowStats> {
  const now = new Date();

  // Stripe pending_transfers
  const stripePendingSnap = await db
    .collection("pending_transfers")
    .where("status", "==", "pending_kyc")
    .get();

  let stripePendingAmount = 0;
  let oldestStripeDays = 0;
  const providersWithPending = new Set<string>();

  stripePendingSnap.forEach((doc) => {
    const data = doc.data();
    stripePendingAmount += (data.providerAmount || 0) / 100; // centimes → EUR
    providersWithPending.add(data.providerId);

    const createdAt = data.createdAt?.toDate?.();
    if (createdAt) {
      const daysSinceCreated = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreated > oldestStripeDays) {
        oldestStripeDays = daysSinceCreated;
      }
    }
  });

  // PayPal failed_payouts_alerts
  const paypalFailedSnap = await db
    .collection("failed_payouts_alerts")
    .where("status", "in", ["pending", "failed", "max_retries_reached"])
    .get();

  let paypalFailedAmount = 0;
  let oldestPaypalDays = 0;

  paypalFailedSnap.forEach((doc) => {
    const data = doc.data();
    paypalFailedAmount += data.amount || 0;
    providersWithPending.add(data.providerId);

    const createdAt = data.createdAt?.toDate?.();
    if (createdAt) {
      const daysSinceCreated = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreated > oldestPaypalDays) {
        oldestPaypalDays = daysSinceCreated;
      }
    }
  });

  return {
    stripe: {
      pendingCount: stripePendingSnap.size,
      pendingAmountEur: stripePendingAmount,
      oldestPendingDays: oldestStripeDays,
    },
    paypal: {
      failedCount: paypalFailedSnap.size,
      failedAmountEur: paypalFailedAmount,
      oldestFailedDays: oldestPaypalDays,
    },
    totalEscrowEur: stripePendingAmount + paypalFailedAmount,
    providersWithPendingKyc: Array.from(providersWithPending),
  };
}

/**
 * Envoie les rappels KYC aux providers qui n'ont pas complété leur KYC
 */
async function sendKycReminders(db: admin.firestore.Firestore): Promise<number> {
  const now = new Date();
  let remindersSent = 0;

  // Récupérer les pending_transfers groupés par provider
  const pendingSnap = await db.collection("pending_transfers").where("status", "==", "pending_kyc").get();

  const providerPendingMap = new Map<
    string,
    { totalAmount: number; oldestDate: Date; count: number }
  >();

  pendingSnap.forEach((doc) => {
    const data = doc.data();
    const providerId = data.providerId;
    const createdAt = data.createdAt?.toDate?.() || now;
    const amount = (data.providerAmount || 0) / 100;

    if (!providerPendingMap.has(providerId)) {
      providerPendingMap.set(providerId, {
        totalAmount: 0,
        oldestDate: createdAt,
        count: 0,
      });
    }

    const entry = providerPendingMap.get(providerId)!;
    entry.totalAmount += amount;
    entry.count++;
    if (createdAt < entry.oldestDate) {
      entry.oldestDate = createdAt;
    }
  });

  // Faire la même chose pour PayPal
  const paypalSnap = await db
    .collection("failed_payouts_alerts")
    .where("status", "in", ["pending", "failed", "max_retries_reached"])
    .get();

  paypalSnap.forEach((doc) => {
    const data = doc.data();
    const providerId = data.providerId;
    const createdAt = data.createdAt?.toDate?.() || now;
    const amount = data.amount || 0;

    if (!providerPendingMap.has(providerId)) {
      providerPendingMap.set(providerId, {
        totalAmount: 0,
        oldestDate: createdAt,
        count: 0,
      });
    }

    const entry = providerPendingMap.get(providerId)!;
    entry.totalAmount += amount;
    entry.count++;
    if (createdAt < entry.oldestDate) {
      entry.oldestDate = createdAt;
    }
  });

  // Pour chaque provider avec des paiements en attente
  for (const [providerId, data] of providerPendingMap.entries()) {
    const daysSinceOldest = Math.floor(
      (now.getTime() - data.oldestDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Vérifier si on doit envoyer un rappel
    const shouldRemind = ESCROW_CONFIG.KYC_REMINDER_DAYS.some((days) => {
      // Rappel le jour exact + une marge de 1 jour pour les jobs quotidiens
      return daysSinceOldest >= days && daysSinceOldest < days + 2;
    });

    if (shouldRemind) {
      // Vérifier si on n'a pas déjà envoyé ce rappel
      const lastReminderSnap = await db
        .collection("kyc_reminders")
        .where("providerId", "==", providerId)
        .where("dayMilestone", "==", daysSinceOldest)
        .limit(1)
        .get();

      if (lastReminderSnap.empty) {
        // Récupérer les infos du provider
        const providerDoc = await db.collection("users").doc(providerId).get();
        const providerData = providerDoc.data();

        if (providerData) {
          // Créer une notification in-app
          await db.collection("inapp_notifications").add({
            uid: providerId,
            type: "kyc_reminder",
            title: "Action requise: Configurez vos paiements",
            message: `Vous avez ${data.count} paiement(s) en attente pour un total de ${data.totalAmount.toFixed(2)}€. Complétez votre KYC pour recevoir ces fonds.`,
            priority: daysSinceOldest >= 30 ? "high" : "medium",
            pendingAmount: data.totalAmount,
            pendingCount: data.count,
            daysSinceOldest,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Enregistrer le rappel pour ne pas le renvoyer
          await db.collection("kyc_reminders").add({
            providerId,
            dayMilestone: daysSinceOldest,
            pendingAmount: data.totalAmount,
            pendingCount: data.count,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // TODO: Envoyer aussi un email si on a l'adresse
          // await sendKycReminderEmail(providerData.email, data);

          remindersSent++;
          console.log(
            `📧 [ESCROW] KYC reminder sent to ${providerId} (day ${daysSinceOldest}, ${data.totalAmount}€)`
          );
        }
      }
    }
  }

  return remindersSent;
}

/**
 * Escalade les escrows très anciens (> 6 mois) pour suivi admin
 *
 * IMPORTANT: PAS de remboursement automatique !
 * Le service (appel) a été rendu, donc le client ne doit PAS être remboursé.
 * L'argent appartient au provider, il est juste en attente de son KYC.
 *
 * Cette fonction:
 * - Crée des alertes admin pour suivi manuel
 * - Envoie des rappels KYC plus agressifs au provider
 * - Marque les escrows comme "escalated" pour visibilité
 */
async function escalateOldEscrows(db: admin.firestore.Firestore): Promise<number> {
  const now = new Date();
  const cutoffDate = new Date(
    now.getTime() - ESCROW_CONFIG.ESCALATION_AFTER_DAYS * 24 * 60 * 60 * 1000
  );
  let escalationsProcessed = 0;

  // Stripe pending_transfers > 6 mois (non encore escaladés)
  const oldStripePending = await db
    .collection("pending_transfers")
    .where("status", "==", "pending_kyc")
    .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
    .get();

  for (const doc of oldStripePending.docs) {
    const data = doc.data();

    // Vérifier si déjà escaladé (éviter les alertes en double)
    if (data.escalatedAt) continue;

    try {
      // Marquer comme escaladé (PAS de changement de status)
      await doc.ref.update({
        escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
        escalationReason: `KYC not completed after ${ESCROW_CONFIG.ESCALATION_AFTER_DAYS} days`,
      });

      // Créer une alerte admin pour suivi manuel
      await db.collection("admin_alerts").add({
        type: "escrow_old_pending_kyc",
        priority: "high",
        title: "Escrow ancien - KYC non complété (Stripe)",
        message: `Le provider ${data.providerId} n'a pas complété son KYC Stripe depuis ${ESCROW_CONFIG.ESCALATION_AFTER_DAYS} jours. ` +
          `${(data.providerAmount / 100).toFixed(2)}€ en attente. ` +
          `ACTION: Contacter le provider pour compléter son KYC.`,
        pendingTransferId: doc.id,
        providerId: data.providerId,
        clientId: data.clientId,
        amount: data.providerAmount / 100,
        currency: data.currency || "EUR",
        paymentIntentId: data.paymentIntentId,
        callSessionId: data.callSessionId,
        daysSincePayment: ESCROW_CONFIG.ESCALATION_AFTER_DAYS,
        read: false,
        requiresAction: true,
        actionType: "contact_provider_for_kyc", // PAS de remboursement
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Notification urgente au provider
      await db.collection("inapp_notifications").add({
        uid: data.providerId,
        type: "kyc_urgent",
        title: "URGENT: Paiement en attente depuis 6 mois",
        message: `Vous avez ${(data.providerAmount / 100).toFixed(2)}€ en attente depuis plus de 6 mois. ` +
          `Complétez votre configuration Stripe pour recevoir cet argent. ` +
          `Contactez le support si vous avez besoin d'aide.`,
        priority: "critical",
        pendingAmount: data.providerAmount / 100,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      escalationsProcessed++;
      console.log(`⚠️ [ESCROW] Escalated old pending_transfer ${doc.id} (${(data.providerAmount / 100).toFixed(2)}€)`);
    } catch (error) {
      console.error(`❌ [ESCROW] Error escalating ${doc.id}:`, error);
      await logError("escrowMonitoring:escalateOldEscrows:stripe", error);
    }
  }

  // PayPal failed_payouts > 6 mois (non encore escaladés)
  const oldPaypalFailed = await db
    .collection("failed_payouts_alerts")
    .where("status", "in", ["pending", "failed", "max_retries_reached"])
    .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
    .get();

  for (const doc of oldPaypalFailed.docs) {
    const data = doc.data();

    // Vérifier si déjà escaladé
    if (data.escalatedAt) continue;

    try {
      await doc.ref.update({
        escalatedAt: admin.firestore.FieldValue.serverTimestamp(),
        escalationReason: `KYC not completed after ${ESCROW_CONFIG.ESCALATION_AFTER_DAYS} days`,
      });

      await db.collection("admin_alerts").add({
        type: "escrow_old_pending_kyc_paypal",
        priority: "high",
        title: "Escrow ancien - KYC PayPal non complété",
        message: `Le provider ${data.providerId} n'a pas complété son KYC PayPal depuis ${ESCROW_CONFIG.ESCALATION_AFTER_DAYS} jours. ` +
          `${data.amount.toFixed(2)}€ en attente. ` +
          `ACTION: Contacter le provider pour compléter son onboarding PayPal.`,
        failedPayoutAlertId: doc.id,
        providerId: data.providerId,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency || "EUR",
        callSessionId: data.callSessionId,
        daysSincePayment: ESCROW_CONFIG.ESCALATION_AFTER_DAYS,
        read: false,
        requiresAction: true,
        actionType: "contact_provider_for_kyc", // PAS de remboursement
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Notification urgente au provider
      await db.collection("inapp_notifications").add({
        uid: data.providerId,
        type: "kyc_urgent",
        title: "URGENT: Paiement PayPal en attente depuis 6 mois",
        message: `Vous avez ${data.amount.toFixed(2)}€ en attente depuis plus de 6 mois. ` +
          `Complétez votre configuration PayPal pour recevoir cet argent. ` +
          `Contactez le support si vous avez besoin d'aide.`,
        priority: "critical",
        pendingAmount: data.amount,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      escalationsProcessed++;
      console.log(`⚠️ [ESCROW] Escalated old PayPal failed_payout ${doc.id} (${data.amount.toFixed(2)}€)`);
    } catch (error) {
      console.error(`❌ [ESCROW] Error escalating PayPal ${doc.id}:`, error);
      await logError("escrowMonitoring:escalateOldEscrows:paypal", error);
    }
  }

  return escalationsProcessed;
}

/**
 * Vérifie le solde Stripe et alerte si insuffisant pour couvrir les escrows
 */
async function checkStripeBalance(
  db: admin.firestore.Firestore,
  escrowStats: EscrowStats
): Promise<{ adequate: boolean; balance: number; required: number }> {
  try {
    const stripeMode = process.env.STRIPE_MODE || "test";
    const stripeKey =
      stripeMode === "live"
        ? process.env.STRIPE_SECRET_KEY_LIVE
        : process.env.STRIPE_SECRET_KEY_TEST;

    if (!stripeKey) {
      console.warn("⚠️ [ESCROW] Stripe key not available for balance check");
      return { adequate: true, balance: 0, required: 0 };
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const balance = await stripe.balance.retrieve();

    // Trouver le solde EUR disponible
    const eurBalance = balance.available.find((b) => b.currency === "eur");
    const availableEur = (eurBalance?.amount || 0) / 100;

    const requiredAmount =
      escrowStats.stripe.pendingAmountEur + ESCROW_CONFIG.STRIPE_BALANCE_BUFFER_EUR;

    const isAdequate = availableEur >= requiredAmount;

    if (!isAdequate) {
      await db.collection("admin_alerts").add({
        type: "stripe_balance_insufficient",
        priority: "critical",
        title: "URGENT: Solde Stripe insuffisant pour escrows",
        message:
          `Le solde Stripe disponible (${availableEur.toFixed(2)}€) est inférieur au montant requis ` +
          `(${requiredAmount.toFixed(2)}€ = ${escrowStats.stripe.pendingAmountEur.toFixed(2)}€ escrow + ${ESCROW_CONFIG.STRIPE_BALANCE_BUFFER_EUR}€ buffer). ` +
          `NE PAS FAIRE DE PAYOUT jusqu'à résolution.`,
        availableBalance: availableEur,
        requiredBalance: requiredAmount,
        escrowAmount: escrowStats.stripe.pendingAmountEur,
        bufferAmount: ESCROW_CONFIG.STRIPE_BALANCE_BUFFER_EUR,
        read: false,
        requiresAction: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.error(
        `🚨 [ESCROW] CRITICAL: Stripe balance (${availableEur}€) < required (${requiredAmount}€)`
      );
    }

    return {
      adequate: isAdequate,
      balance: availableEur,
      required: requiredAmount,
    };
  } catch (error) {
    console.error("❌ [ESCROW] Error checking Stripe balance:", error);
    await logError("escrowMonitoring:checkStripeBalance", error);
    return { adequate: true, balance: 0, required: 0 }; // Ne pas bloquer en cas d'erreur
  }
}

/**
 * Fonction scheduled principale - exécutée tous les jours à 8h00 UTC
 */
export const escrowMonitoringDaily = onSchedule(
  {
    schedule: "0 8 * * *", // Tous les jours à 8h00 UTC
    timeZone: "UTC",
    region: "europe-west1",
    secrets: [STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST],
  },
  async () => {
    console.log("🔍 [ESCROW] Starting daily escrow monitoring...");

    const db = admin.firestore();

    try {
      // 1. Calculer les statistiques
      const stats = await getEscrowStats(db);
      console.log("📊 [ESCROW] Stats:", JSON.stringify(stats, null, 2));

      // 2. Alerte si escrow total > seuil
      if (stats.totalEscrowEur > ESCROW_CONFIG.ALERT_THRESHOLD_EUR) {
        await db.collection("admin_alerts").add({
          type: "escrow_threshold_exceeded",
          priority: "high",
          title: "Seuil d'escrow dépassé",
          message:
            `Le total des escrows (${stats.totalEscrowEur.toFixed(2)}€) dépasse le seuil de ${ESCROW_CONFIG.ALERT_THRESHOLD_EUR}€. ` +
            `Stripe: ${stats.stripe.pendingCount} pending (${stats.stripe.pendingAmountEur.toFixed(2)}€), ` +
            `PayPal: ${stats.paypal.failedCount} failed (${stats.paypal.failedAmountEur.toFixed(2)}€).`,
          totalEscrow: stats.totalEscrowEur,
          threshold: ESCROW_CONFIG.ALERT_THRESHOLD_EUR,
          stripeStats: stats.stripe,
          paypalStats: stats.paypal,
          providersAffected: stats.providersWithPendingKyc.length,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`⚠️ [ESCROW] Alert: escrow ${stats.totalEscrowEur}€ > threshold ${ESCROW_CONFIG.ALERT_THRESHOLD_EUR}€`);
      }

      // 3. Vérifier le solde Stripe
      const balanceCheck = await checkStripeBalance(db, stats);
      console.log("💰 [ESCROW] Stripe balance check:", balanceCheck);

      // 4. Envoyer les rappels KYC
      const remindersSent = await sendKycReminders(db);
      console.log(`📧 [ESCROW] KYC reminders sent: ${remindersSent}`);

      // 5. Escalader les escrows anciens (> 6 mois) - PAS de remboursement
      // Le service a été rendu, l'argent appartient au provider
      const escalationsTriggered = await escalateOldEscrows(db);
      console.log(`⚠️ [ESCROW] Old escrows escalated: ${escalationsTriggered}`);

      // 6. Sauvegarder le rapport quotidien
      await db.collection("escrow_reports").add({
        date: admin.firestore.FieldValue.serverTimestamp(),
        stats,
        balanceCheck,
        remindersSent,
        escalationsTriggered, // PAS refundsTriggered
        config: ESCROW_CONFIG,
      });

      console.log("✅ [ESCROW] Daily monitoring completed successfully");
    } catch (error) {
      console.error("❌ [ESCROW] Error in daily monitoring:", error);
      await logError("escrowMonitoringDaily", error);

      // Alerte en cas d'échec du monitoring
      await db.collection("admin_alerts").add({
        type: "escrow_monitoring_failed",
        priority: "critical",
        title: "ERREUR: Monitoring escrow échoué",
        message: `Le monitoring quotidien des escrows a échoué: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: error instanceof Error ? error.message : "Unknown",
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

/**
 * Fonction callable pour vérifier manuellement les escrows (admin)
 */
export const checkEscrowStatus = async (
  db?: admin.firestore.Firestore
): Promise<EscrowStats & { balanceCheck: { adequate: boolean; balance: number; required: number } }> => {
  const database = db || admin.firestore();
  const stats = await getEscrowStats(database);
  const balanceCheck = await checkStripeBalance(database, stats);

  return {
    ...stats,
    balanceCheck,
  };
};
