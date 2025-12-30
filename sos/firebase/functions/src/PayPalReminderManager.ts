/**
 * PayPalReminderManager.ts
 *
 * Gestionnaire des rappels pour les providers PayPal qui n'ont pas encore
 * connecte leur compte PayPal.
 *
 * FONCTIONNEMENT:
 * - Les providers dans les pays PayPal-only ne sont PAS visibles sur la plateforme
 *   tant qu'ils n'ont pas connecte leur compte PayPal
 * - Ce gestionnaire envoie des rappels progressifs pour les inciter a se connecter
 * - Les rappels sont envoyes a intervalles croissants (1j, 3j, 7j, 14j, 30j)
 * - Apres 5 rappels, le provider est marque comme "inactive" mais peut toujours se connecter
 *
 * INTEGRATION:
 * - Trigger: onProviderCreated cree une entree dans paypal_reminder_queue
 * - Ce manager traite la queue quotidiennement
 * - Quand le provider connecte PayPal, il devient visible automatiquement
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// Configuration des rappels PayPal
export const PAYPAL_REMINDER_CONFIG = {
  // Intervalles en heures pour chaque rappel
  INTERVALS_HOURS: [24, 72, 168, 336, 720], // 1j, 3j, 7j, 14j, 30j
  MAX_REMINDERS: 5,
  MIN_INTERVAL_HOURS: 20, // Minimum entre deux rappels
};

// Types
interface PayPalReminderQueue {
  id?: string;
  userId: string;
  email: string;
  providerType: string;
  country: string;
  reminderNumber: number;
  scheduledFor: admin.firestore.Timestamp;
  status: "pending" | "sent" | "cancelled" | "completed";
  sentAt?: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
}

interface ProviderData {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  type?: string;
  preferredLanguage?: string;
  paypalAccountStatus?: string;
  paypalMerchantId?: string;
  paypalOnboardingComplete?: boolean;
  paypalRemindersCount?: number;
  paypalLastReminderAt?: admin.firestore.Timestamp;
  isVisible?: boolean;
  createdAt?: admin.firestore.Timestamp;
}

/**
 * Classe de gestion des rappels PayPal
 */
export class PayPalReminderManager {
  private db: admin.firestore.Firestore;

  constructor(db?: admin.firestore.Firestore) {
    this.db = db || admin.firestore();
  }

  /**
   * Traite tous les rappels PayPal en attente
   */
  async processPayPalReminders(): Promise<{
    processed: number;
    sent: number;
    skipped: number;
    errors: number;
  }> {
    console.log("[PAYPAL_REMINDER] Debut du traitement des rappels PayPal");

    const stats = { processed: 0, sent: 0, skipped: 0, errors: 0 };
    const now = admin.firestore.Timestamp.now();

    try {
      // Recuperer les rappels en attente dont la date est passee
      const pendingReminders = await this.db
        .collection("paypal_reminder_queue")
        .where("status", "==", "pending")
        .where("scheduledFor", "<=", now)
        .limit(100)
        .get();

      console.log(`[PAYPAL_REMINDER] ${pendingReminders.size} rappels a traiter`);

      for (const doc of pendingReminders.docs) {
        stats.processed++;
        const reminder = { id: doc.id, ...doc.data() } as PayPalReminderQueue;

        try {
          // Verifier si le provider a deja connecte PayPal
          const providerDoc = await this.getProviderDocument(reminder.userId);
          const providerData = providerDoc?.data() as ProviderData | undefined;

          if (!providerData) {
            console.log(`[PAYPAL_REMINDER] Provider non trouve: ${reminder.userId}`);
            await doc.ref.update({ status: "cancelled" });
            stats.skipped++;
            continue;
          }

          // Si le provider a deja connecte PayPal, annuler le rappel
          if (providerData.paypalOnboardingComplete || providerData.paypalMerchantId) {
            console.log(`[PAYPAL_REMINDER] Provider deja connecte: ${reminder.userId}`);
            await doc.ref.update({ status: "completed" });
            stats.skipped++;
            continue;
          }

          // Envoyer le rappel
          await this.sendReminder(reminder, providerData);
          stats.sent++;

          // Programmer le prochain rappel si pas au maximum
          if (reminder.reminderNumber < PAYPAL_REMINDER_CONFIG.MAX_REMINDERS) {
            await this.scheduleNextReminder(reminder);
          }

        } catch (error) {
          console.error(`[PAYPAL_REMINDER] Erreur pour ${reminder.userId}:`, error);
          stats.errors++;
          await doc.ref.update({
            status: "pending", // Garder pending pour retry
            lastError: error instanceof Error ? error.message : "Unknown error",
            lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      console.log(`[PAYPAL_REMINDER] Termine: ${JSON.stringify(stats)}`);

      // Creer une alerte admin si des rappels ont ete envoyes
      if (stats.sent > 0) {
        await this.createAdminAlert(stats);
      }

      return stats;

    } catch (error) {
      console.error("[PAYPAL_REMINDER] Erreur globale:", error);
      throw error;
    }
  }

  /**
   * Recupere le document provider (lawyers ou expats)
   */
  private async getProviderDocument(
    userId: string
  ): Promise<admin.firestore.DocumentSnapshot | null> {
    // Essayer d'abord lawyers
    const lawyerDoc = await this.db.collection("lawyers").doc(userId).get();
    if (lawyerDoc.exists) return lawyerDoc;

    // Puis expats
    const expatDoc = await this.db.collection("expats").doc(userId).get();
    if (expatDoc.exists) return expatDoc;

    // Enfin sos_profiles
    const profileDoc = await this.db.collection("sos_profiles").doc(userId).get();
    if (profileDoc.exists) return profileDoc;

    return null;
  }

  /**
   * Envoie un rappel au provider
   */
  private async sendReminder(
    reminder: PayPalReminderQueue,
    providerData: ProviderData
  ): Promise<void> {
    console.log(`[PAYPAL_REMINDER] Envoi rappel #${reminder.reminderNumber} a: ${reminder.userId}`);

    // Determiner le template selon le numero de rappel
    let templateId: string;
    let priority: "low" | "medium" | "high";

    if (reminder.reminderNumber === 1) {
      templateId = "paypal.reminder.first";
      priority = "medium";
    } else if (reminder.reminderNumber <= 3) {
      templateId = "paypal.reminder.followup";
      priority = "medium";
    } else {
      templateId = "paypal.reminder.urgent";
      priority = "high";
    }

    // Calculer le nombre de jours depuis l'inscription
    const createdAt = providerData.createdAt?.toDate() || new Date();
    const daysSinceSignup = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Creer l'evenement de notification
    const eventId = `paypal_reminder_${reminder.userId}_${reminder.reminderNumber}_${Date.now()}`;

    await this.db.collection("message_events").add({
      eventId,
      templateId,
      locale: providerData.preferredLanguage || "fr",
      to: {
        email: reminder.email,
        userId: reminder.userId,
      },
      context: {
        user: {
          firstName: providerData.firstName || providerData.name?.split(" ")[0] || "",
          lastName: providerData.lastName || "",
          displayName: providerData.fullName || providerData.name || reminder.email,
          email: reminder.email,
        },
      },
      vars: {
        FIRST_NAME: providerData.firstName || providerData.name?.split(" ")[0] || "",
        LAST_NAME: providerData.lastName || "",
        DISPLAY_NAME: providerData.fullName || providerData.name || reminder.email,
        REMINDER_NUMBER: reminder.reminderNumber,
        DAYS_SINCE_SIGNUP: daysSinceSignup,
        PROVIDER_TYPE: reminder.providerType,
        ONBOARDING_LINK: `https://sos-expat.com/dashboard/paypal-connect?provider=${reminder.userId}`,
        COUNTRY: reminder.country,
      },
      priority,
      dedupeKey: `paypal_reminder_${reminder.userId}_${reminder.reminderNumber}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Creer une notification in-app
    await this.db.collection("notifications").add({
      userId: reminder.userId,
      type: "paypal_connection_reminder",
      title: reminder.reminderNumber === 1
        ? "Connectez votre compte PayPal"
        : reminder.reminderNumber <= 3
          ? "Rappel: Connexion PayPal requise"
          : "Action urgente: Connexion PayPal",
      message: reminder.reminderNumber <= 3
        ? "Pour etre visible sur la plateforme et recevoir des paiements, " +
          "veuillez connecter votre compte PayPal."
        : "Votre profil n'est pas visible car vous n'avez pas connecte PayPal. " +
          "Connectez-vous maintenant pour commencer a recevoir des clients.",
      data: {
        action: "connect_paypal",
        reminderNumber: reminder.reminderNumber,
        priority,
      },
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mettre a jour le rappel comme envoye
    await this.db.collection("paypal_reminder_queue").doc(reminder.id!).update({
      status: "sent",
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mettre a jour le provider
    const collectionName = reminder.providerType === "lawyer" ? "lawyers" : "expats";
    const updateData = {
      paypalRemindersCount: reminder.reminderNumber,
      paypalLastReminderAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await this.db.collection(collectionName).doc(reminder.userId).update(updateData);
    await this.db.collection("sos_profiles").doc(reminder.userId).update(updateData);

    // Log d'audit
    await this.db.collection("paypal_reminders_log").add({
      userId: reminder.userId,
      reminderNumber: reminder.reminderNumber,
      templateId,
      success: true,
      providerType: reminder.providerType,
      country: reminder.country,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[PAYPAL_REMINDER] Rappel #${reminder.reminderNumber} envoye a: ${reminder.userId}`);
  }

  /**
   * Programme le prochain rappel
   */
  private async scheduleNextReminder(currentReminder: PayPalReminderQueue): Promise<void> {
    const nextReminderNumber = currentReminder.reminderNumber + 1;

    if (nextReminderNumber > PAYPAL_REMINDER_CONFIG.MAX_REMINDERS) {
      console.log(`[PAYPAL_REMINDER] Maximum de rappels atteint pour: ${currentReminder.userId}`);
      return;
    }

    // Calculer la date du prochain rappel
    const intervalHours = PAYPAL_REMINDER_CONFIG.INTERVALS_HOURS[nextReminderNumber - 1] || 720;
    const nextDate = new Date(Date.now() + intervalHours * 60 * 60 * 1000);

    await this.db.collection("paypal_reminder_queue").add({
      userId: currentReminder.userId,
      email: currentReminder.email,
      providerType: currentReminder.providerType,
      country: currentReminder.country,
      reminderNumber: nextReminderNumber,
      scheduledFor: admin.firestore.Timestamp.fromDate(nextDate),
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `[PAYPAL_REMINDER] Rappel #${nextReminderNumber} programme pour ${currentReminder.userId} ` +
      `dans ${intervalHours} heures`
    );
  }

  /**
   * Cree une alerte admin
   */
  private async createAdminAlert(stats: {
    processed: number;
    sent: number;
    skipped: number;
    errors: number;
  }): Promise<void> {
    await this.db.collection("admin_alerts").add({
      type: "paypal_reminders_sent",
      priority: stats.errors > 0 ? "high" : "low",
      title: "Rappels PayPal envoyes",
      message: `${stats.sent} rappels PayPal envoyes aujourd'hui. ` +
        `Traites: ${stats.processed}, Ignores: ${stats.skipped}, Erreurs: ${stats.errors}`,
      data: stats,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Annule tous les rappels en attente pour un provider
   * (a appeler quand le provider connecte son PayPal)
   */
  async cancelPendingReminders(userId: string): Promise<number> {
    const pendingReminders = await this.db
      .collection("paypal_reminder_queue")
      .where("userId", "==", userId)
      .where("status", "==", "pending")
      .get();

    const batch = this.db.batch();
    pendingReminders.docs.forEach((doc) => {
      batch.update(doc.ref, { status: "cancelled" });
    });

    await batch.commit();

    console.log(`[PAYPAL_REMINDER] ${pendingReminders.size} rappels annules pour: ${userId}`);
    return pendingReminders.size;
  }

  /**
   * Recupere les statistiques des rappels PayPal
   */
  async getPayPalReminderStats(): Promise<{
    pendingReminders: number;
    sentToday: number;
    providersWithoutPayPal: number;
    recentReminders: any[];
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Rappels en attente
    const pendingSnapshot = await this.db
      .collection("paypal_reminder_queue")
      .where("status", "==", "pending")
      .count()
      .get();

    // Rappels envoyes aujourd'hui
    const sentTodaySnapshot = await this.db
      .collection("paypal_reminder_queue")
      .where("status", "==", "sent")
      .where("sentAt", ">=", admin.firestore.Timestamp.fromDate(todayStart))
      .count()
      .get();

    // Providers PayPal sans connexion
    const lawyersSnapshot = await this.db
      .collection("lawyers")
      .where("paymentGateway", "==", "paypal")
      .where("paypalOnboardingComplete", "==", false)
      .count()
      .get();

    const expatsSnapshot = await this.db
      .collection("expats")
      .where("paymentGateway", "==", "paypal")
      .where("paypalOnboardingComplete", "==", false)
      .count()
      .get();

    // 20 derniers rappels
    const recentRemindersSnapshot = await this.db
      .collection("paypal_reminders_log")
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();

    return {
      pendingReminders: pendingSnapshot.data().count,
      sentToday: sentTodaySnapshot.data().count,
      providersWithoutPayPal: lawyersSnapshot.data().count + expatsSnapshot.data().count,
      recentReminders: recentRemindersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
    };
  }
}

// ============================================================================
// CLOUD FUNCTIONS
// ============================================================================

/**
 * Fonction scheduled pour traiter les rappels PayPal quotidiennement
 * Execute a 10h00 UTC+1 (Paris) chaque jour
 */
export const scheduledPayPalReminders = onSchedule(
  {
    schedule: "0 10 * * *",
    timeZone: "Europe/Paris",
    region: "europe-west1",
    memory: "256MiB", // OPTIMIZED: Reduced from 512MiB - simple queries
    timeoutSeconds: 300,
  },
  async () => {
    console.log("[PAYPAL_REMINDER] Execution scheduled demarree");
    const manager = new PayPalReminderManager();
    const stats = await manager.processPayPalReminders();
    console.log("[PAYPAL_REMINDER] Execution terminee:", stats);
  }
);

/**
 * Fonction callable pour declencher manuellement les rappels (admin seulement)
 */
export const triggerPayPalReminders = onCall(
  {
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (request) => {
    // Verifier les permissions admin
    const auth = request.auth;
    if (!auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(auth.uid).get();
    const userData = userDoc.data();

    if (!userData || !["admin", "dev"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    console.log(`[PAYPAL_REMINDER] Declenchement manuel par: ${auth.uid}`);

    const manager = new PayPalReminderManager(db);
    const stats = await manager.processPayPalReminders();

    return {
      success: true,
      stats,
      triggeredBy: auth.uid,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Fonction callable pour obtenir les statistiques des rappels PayPal
 */
export const getPayPalReminderStatus = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
  },
  async (request) => {
    // Verifier les permissions admin
    const auth = request.auth;
    if (!auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(auth.uid).get();
    const userData = userDoc.data();

    if (!userData || !["admin", "dev"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const manager = new PayPalReminderManager(db);
    const stats = await manager.getPayPalReminderStats();

    return {
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * Fonction appelee quand un provider connecte son PayPal
 * Annule les rappels en attente et rend le provider visible
 */
export async function onPayPalConnected(
  userId: string,
  paypalMerchantId: string
): Promise<void> {
  console.log(`[PAYPAL_REMINDER] PayPal connecte pour: ${userId}`);

  const db = admin.firestore();
  const manager = new PayPalReminderManager(db);

  // Annuler les rappels en attente
  const cancelled = await manager.cancelPendingReminders(userId);

  // Mettre a jour le provider comme visible
  const updateData = {
    paypalMerchantId,
    paypalOnboardingComplete: true,
    paypalPaymentsReceivable: true,
    paypalAccountStatus: "connected",
    isVisible: true, // LE PROVIDER DEVIENT VISIBLE
    isPaymentAccountRequired: false,
    paymentAccountRequiredReason: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Mettre a jour toutes les collections
  const batch = db.batch();

  batch.update(db.collection("sos_profiles").doc(userId), updateData);

  // Determiner la collection
  const lawyerDoc = await db.collection("lawyers").doc(userId).get();
  if (lawyerDoc.exists) {
    batch.update(db.collection("lawyers").doc(userId), updateData);
  } else {
    batch.update(db.collection("expats").doc(userId), updateData);
  }

  batch.update(db.collection("users").doc(userId), updateData);

  await batch.commit();

  // Log d'audit
  await db.collection("paypal_account_logs").add({
    userId,
    paypalMerchantId,
    action: "connected",
    cancelledReminders: cancelled,
    message: "Provider PayPal connected, now visible on platform",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Notification de succes
  await db.collection("notifications").add({
    userId,
    type: "paypal_connected",
    title: "Compte PayPal connecte",
    message: "Votre compte PayPal est maintenant connecte. " +
      "Votre profil est desormais visible sur la plateforme et vous pouvez recevoir des paiements.",
    data: {
      paypalMerchantId,
      action: "view_dashboard",
    },
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[PAYPAL_REMINDER] Provider ${userId} est maintenant visible`);
}
