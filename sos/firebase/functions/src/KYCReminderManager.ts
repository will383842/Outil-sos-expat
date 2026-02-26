/**
 * KYCReminderManager.ts
 * Gestionnaire des rappels KYC pour les prestataires
 *
 * Envoie des rappels automatiques aux prestataires qui n'ont pas complété
 * leur onboarding Stripe Connect (KYC).
 *
 * Intervalles de rappel:
 * - Rappel 1: 24h après création du compte
 * - Rappel 2: 72h (3 jours)
 * - Rappel 3: 7 jours
 * - Rappel 4: 14 jours
 * - Rappel 5: 30 jours (dernier rappel)
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

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

// Configuration des rappels
const REMINDER_CONFIG = {
  // Délais en heures depuis la création du compte
  INTERVALS_HOURS: [24, 72, 168, 336, 720], // 1j, 3j, 7j, 14j, 30j

  // Nombre maximum de rappels
  MAX_REMINDERS: 5,

  // Délai minimum entre deux rappels (en heures)
  MIN_INTERVAL_HOURS: 20,

  // Statuts KYC considérés comme incomplets
  INCOMPLETE_STATUSES: ["not_started", "pending", "incomplete", "in_progress"],

  // Collections à vérifier
  PROVIDER_COLLECTIONS: ["lawyers", "expats"],
};

// Types
interface ProviderKYCData {
  id: string;
  collection: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  preferredLanguage?: string;
  kycStatus?: string;
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  createdAt?: admin.firestore.Timestamp;
  kycRemindersSent?: number;
  lastKycReminderAt?: admin.firestore.Timestamp;
}

interface ReminderResult {
  providerId: string;
  email: string;
  reminderNumber: number;
  success: boolean;
  error?: string;
}

/**
 * Classe principale de gestion des rappels KYC
 */
export class KYCReminderManager {
  private db: admin.firestore.Firestore;

  constructor(db?: admin.firestore.Firestore) {
    this.db = db || admin.firestore();
  }

  /**
   * Exécute le processus de rappel KYC
   * Appelé par la fonction schedulée
   */
  async processKYCReminders(): Promise<{
    processed: number;
    sent: number;
    skipped: number;
    errors: number;
    results: ReminderResult[];
  }> {
    console.log("🔔 [KYC_REMINDER] Starting KYC reminder process");

    const results: ReminderResult[] = [];
    let processed = 0;
    let sent = 0;
    let skipped = 0;
    let errors = 0;

    // Parcourir chaque collection de prestataires
    for (const collection of REMINDER_CONFIG.PROVIDER_COLLECTIONS) {
      console.log(`📂 [KYC_REMINDER] Processing collection: ${collection}`);

      const providers = await this.getProvidersNeedingReminder(collection);
      console.log(`👥 [KYC_REMINDER] Found ${providers.length} providers needing reminder in ${collection}`);

      for (const provider of providers) {
        processed++;

        try {
          const result = await this.processProviderReminder(provider);
          results.push(result);

          if (result.success) {
            sent++;
          } else {
            skipped++;
          }
        } catch (error) {
          errors++;
          results.push({
            providerId: provider.id,
            email: provider.email,
            reminderNumber: (provider.kycRemindersSent || 0) + 1,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          console.error(`❌ [KYC_REMINDER] Error processing ${provider.id}:`, error);
        }
      }
    }

    console.log(`🔔 [KYC_REMINDER] Process complete:`, {
      processed,
      sent,
      skipped,
      errors,
    });

    return { processed, sent, skipped, errors, results };
  }

  /**
   * Récupère les prestataires nécessitant un rappel KYC
   */
  private async getProvidersNeedingReminder(collection: string): Promise<ProviderKYCData[]> {
    const providers: ProviderKYCData[] = [];

    // Query: KYC non complété ET moins de MAX_REMINDERS envoyés
    const snapshot = await this.db
      .collection(collection)
      .where("stripeOnboardingComplete", "!=", true)
      .get();

    const now = Date.now();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Vérifier le statut KYC
      const kycStatus = data.kycStatus || "not_started";
      if (!REMINDER_CONFIG.INCOMPLETE_STATUSES.includes(kycStatus)) {
        continue;
      }

      // Vérifier si email existe
      if (!data.email) {
        continue;
      }

      // Vérifier le nombre de rappels déjà envoyés
      const remindersSent = data.kycRemindersSent || 0;
      if (remindersSent >= REMINDER_CONFIG.MAX_REMINDERS) {
        continue;
      }

      // Vérifier le délai depuis la création
      const createdAt = data.createdAt?.toMillis() || now;
      const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

      // Déterminer si c'est le bon moment pour le prochain rappel
      const nextReminderIndex = remindersSent;
      const requiredHours = REMINDER_CONFIG.INTERVALS_HOURS[nextReminderIndex];

      if (!requiredHours || hoursSinceCreation < requiredHours) {
        continue;
      }

      // Vérifier le délai minimum depuis le dernier rappel
      if (data.lastKycReminderAt) {
        const lastReminderTime = data.lastKycReminderAt.toMillis();
        const hoursSinceLastReminder = (now - lastReminderTime) / (1000 * 60 * 60);

        if (hoursSinceLastReminder < REMINDER_CONFIG.MIN_INTERVAL_HOURS) {
          continue;
        }
      }

      providers.push({
        id: doc.id,
        collection,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        displayName: data.displayName,
        preferredLanguage: data.preferredLanguage || data.language || "en",
        kycStatus,
        stripeAccountId: data.stripeAccountId,
        stripeOnboardingComplete: data.stripeOnboardingComplete,
        createdAt: data.createdAt,
        kycRemindersSent: remindersSent,
        lastKycReminderAt: data.lastKycReminderAt,
      });
    }

    return providers;
  }

  /**
   * Traite le rappel pour un prestataire spécifique
   */
  private async processProviderReminder(provider: ProviderKYCData): Promise<ReminderResult> {
    const reminderNumber = (provider.kycRemindersSent || 0) + 1;

    console.log(`📧 [KYC_REMINDER] Sending reminder #${reminderNumber} to ${provider.email}`);

    try {
      // Créer l'événement de message pour le pipeline de notification
      await this.createReminderNotification(provider, reminderNumber);

      // Mettre à jour le compteur de rappels
      await this.updateProviderReminderStatus(provider, reminderNumber);

      // Logger l'envoi
      await this.logReminder(provider, reminderNumber, true);

      console.log(`✅ [KYC_REMINDER] Reminder #${reminderNumber} sent to ${provider.email}`);

      return {
        providerId: provider.id,
        email: provider.email,
        reminderNumber,
        success: true,
      };
    } catch (error) {
      console.error(`❌ [KYC_REMINDER] Failed to send reminder to ${provider.email}:`, error);

      await this.logReminder(provider, reminderNumber, false, error);

      return {
        providerId: provider.id,
        email: provider.email,
        reminderNumber,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Crée un événement de notification pour le rappel KYC
   */
  private async createReminderNotification(
    provider: ProviderKYCData,
    reminderNumber: number
  ): Promise<void> {
    const eventId = this.getEventIdForReminder(reminderNumber);

    // Générer le lien d'onboarding
    const onboardingLink = `https://sos-expat.com/dashboard/kyc?provider=${provider.id}`;

    await this.db.collection("message_events").add({
      eventId,
      locale: provider.preferredLanguage || "en",
      to: {
        email: provider.email,
      },
      context: {
        user: {
          uid: provider.id,
          email: provider.email,
          preferredLanguage: provider.preferredLanguage || "en",
        },
      },
      vars: {
        FIRST_NAME: provider.firstName || provider.displayName || "Provider",
        LAST_NAME: provider.lastName || "",
        DISPLAY_NAME: provider.displayName || provider.firstName || "Provider",
        REMINDER_NUMBER: reminderNumber,
        ONBOARDING_LINK: onboardingLink,
        PROVIDER_TYPE: provider.collection === "lawyers" ? "lawyer" : "expat",
        DAYS_SINCE_SIGNUP: this.getDaysSinceSignup(provider),
      },
      uid: provider.id,
      dedupeKey: `kyc_reminder_${provider.id}_${reminderNumber}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Détermine l'eventId en fonction du numéro de rappel
   */
  private getEventIdForReminder(reminderNumber: number): string {
    // Utiliser des templates différents selon l'urgence
    if (reminderNumber === 1) {
      return "kyc.reminder.first";
    } else if (reminderNumber <= 3) {
      return "kyc.reminder.followup";
    } else {
      return "kyc.reminder.urgent";
    }
  }

  /**
   * Calcule le nombre de jours depuis l'inscription
   */
  private getDaysSinceSignup(provider: ProviderKYCData): number {
    if (!provider.createdAt) return 0;
    const now = Date.now();
    const createdAt = provider.createdAt.toMillis();
    return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  }

  /**
   * Met à jour le statut de rappel du prestataire
   */
  private async updateProviderReminderStatus(
    provider: ProviderKYCData,
    reminderNumber: number
  ): Promise<void> {
    await this.db
      .collection(provider.collection)
      .doc(provider.id)
      .update({
        kycRemindersSent: reminderNumber,
        lastKycReminderAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Aussi mettre à jour dans users si existe
    try {
      await this.db.collection("users").doc(provider.id).update({
        kycRemindersSent: reminderNumber,
        lastKycReminderAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {
      // Ignorer si le doc users n'existe pas
    }
  }

  /**
   * Log le rappel dans la collection kyc_reminders_log
   */
  private async logReminder(
    provider: ProviderKYCData,
    reminderNumber: number,
    success: boolean,
    error?: unknown
  ): Promise<void> {
    await this.db.collection("kyc_reminders_log").add({
      providerId: provider.id,
      providerCollection: provider.collection,
      email: provider.email,
      reminderNumber,
      success,
      error: error instanceof Error ? error.message : error ? String(error) : null,
      kycStatus: provider.kycStatus,
      stripeAccountId: provider.stripeAccountId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

// ====== FONCTION SCHEDULÉE ======

/**
 * Fonction Cloud schedulée pour envoyer les rappels KYC
 * S'exécute tous les jours à 10h00 (heure de Paris)
 */
export const scheduledKYCReminders = onSchedule(
  {
    schedule: "0 10 * * *", // Tous les jours à 10h00
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB", // OPTIMIZED: Reduced from 512MiB - simple queries
    cpu: 0.083,
    timeoutSeconds: 300, // 5 minutes max
  },
  async () => {
    console.log("🕐 [SCHEDULED] Starting daily KYC reminder job");

    try {
      // Initialiser Firebase si nécessaire
      ensureInitialized();

      const manager = new KYCReminderManager();
      const result = await manager.processKYCReminders();

      console.log("🕐 [SCHEDULED] KYC reminder job completed:", result);

      // Créer une alerte admin si des rappels ont été envoyés
      if (result.sent > 0) {
        await admin.firestore().collection("admin_alerts").add({
          type: "kyc_reminders_sent",
          priority: "low",
          title: "Rappels KYC envoyés",
          message: `${result.sent} rappel(s) KYC envoyé(s) sur ${result.processed} prestataire(s) traité(s).`,
          details: {
            processed: result.processed,
            sent: result.sent,
            skipped: result.skipped,
            errors: result.errors,
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("💥 [SCHEDULED] KYC reminder job failed:", error);

      // Alerte admin en cas d'erreur
      await admin.firestore().collection("admin_alerts").add({
        type: "kyc_reminders_failed",
        priority: "high",
        title: "Erreur rappels KYC",
        message: `Le job de rappels KYC a échoué: ${error instanceof Error ? error.message : "Unknown error"}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);

// ====== FONCTION CALLABLE POUR TEST/ADMIN ======

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { ALLOWED_ORIGINS } from "./lib/functionConfigs";

/**
 * Fonction callable pour déclencher manuellement les rappels KYC
 * Réservée aux admins
 */
export const triggerKYCReminders = onCall(
  {
    region: "europe-west3",
    cors: ALLOWED_ORIGINS,
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 300,
  },
  async (request) => {
    ensureInitialized();
    // Vérifier l'authentification
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Vérifier le rôle admin
    const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || userData.role !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can trigger KYC reminders");
    }

    console.log(`🔧 [MANUAL] KYC reminders triggered by admin: ${request.auth.uid}`);

    const manager = new KYCReminderManager();
    const result = await manager.processKYCReminders();

    return {
      success: true,
      ...result,
    };
  }
);

/**
 * Fonction callable pour voir le statut KYC des prestataires
 */
export const getKYCReminderStatus = onCall(
  {
    region: "europe-west3",
    cors: ALLOWED_ORIGINS,
    cpu: 0.083,
  },
  async (request) => {
    ensureInitialized();
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Vérifier le rôle admin
    const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || userData.role !== "admin") {
      throw new HttpsError("permission-denied", "Only admins can view KYC status");
    }

    const db = admin.firestore();
    const stats = {
      lawyers: { total: 0, incomplete: 0, complete: 0 },
      expats: { total: 0, incomplete: 0, complete: 0 },
      recentReminders: [] as any[],
    };

    // Stats lawyers - OPTIMISÉ: select() pour ne charger que le champ nécessaire
    const lawyersSnapshot = await db.collection("lawyers").select("stripeOnboardingComplete").get();
    stats.lawyers.total = lawyersSnapshot.size;
    lawyersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.stripeOnboardingComplete) {
        stats.lawyers.complete++;
      } else {
        stats.lawyers.incomplete++;
      }
    });

    // Stats expats - OPTIMISÉ: select() pour ne charger que le champ nécessaire
    const expatsSnapshot = await db.collection("expats").select("stripeOnboardingComplete").get();
    stats.expats.total = expatsSnapshot.size;
    expatsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.stripeOnboardingComplete) {
        stats.expats.complete++;
      } else {
        stats.expats.incomplete++;
      }
    });

    // Derniers rappels
    const recentReminders = await db
      .collection("kyc_reminders_log")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    stats.recentReminders = recentReminders.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return stats;
  }
);
