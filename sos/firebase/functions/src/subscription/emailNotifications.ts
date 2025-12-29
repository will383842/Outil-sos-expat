/**
 * SOS-Expat Subscription Email Notifications
 * Fonctions d'envoi d'emails automatiques pour les abonnements
 *
 * Ce module gère toutes les notifications email liées aux abonnements:
 * - Bienvenue/creation d'abonnement
 * - Renouvellement
 * - Alertes quota (80%, 100%)
 * - Echec de paiement
 * - Annulation
 * - Fin de trial
 * - Expiration
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

// ============================================================================
// TYPES
// ============================================================================

export interface SendSubscriptionEmailParams {
  providerId: string;
  templateId: string; // ex: 'subscription.welcome'
  variables: Record<string, string>;
  priority?: 'high' | 'normal';
}

export interface SubscriptionData {
  providerId: string;
  planId: string;
  tier: string;
  status: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: FirebaseFirestore.Timestamp;
  currentPeriodEnd?: FirebaseFirestore.Timestamp;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: FirebaseFirestore.Timestamp;
  trialEndsAt?: FirebaseFirestore.Timestamp;
}

export interface SubscriptionPlanData {
  tier: string;
  aiCallsLimit: number;
  pricing?: { EUR: number; USD: number };
  name?: Record<string, string>;
}

export interface InvoiceData {
  id: string;
  amountPaid?: number;
  amountDue?: number;
  currency?: string;
  hostedInvoiceUrl?: string;
  invoicePdfUrl?: string;
  periodStart?: FirebaseFirestore.Timestamp;
  periodEnd?: FirebaseFirestore.Timestamp;
}

export interface ProviderData {
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  language?: string;
  preferredLanguage?: string;
  lang?: string;
  notificationPreferences?: {
    email?: boolean;
    subscriptionEmails?: boolean;
  };
}

export interface EmailLogEntry {
  providerId: string;
  templateId: string;
  eventId: string;
  email: string;
  locale: string;
  variables: Record<string, string>;
  priority: 'high' | 'normal';
  status: 'queued' | 'sent' | 'failed';
  error?: string;
  createdAt: FirebaseFirestore.Timestamp;
  sentAt?: FirebaseFirestore.Timestamp;
}

type Lang = 'fr-FR' | 'en';

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

const getDb = () => admin.firestore();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Resout la langue preferee du provider
 */
function resolveLang(input?: string): Lang {
  if (!input) return 'en';
  const s = String(input).toLowerCase();
  return s.startsWith('fr') ? 'fr-FR' : 'en';
}

/**
 * Recupere les informations du provider depuis Firestore
 */
async function getProviderData(providerId: string): Promise<ProviderData | null> {
  const db = getDb();

  // Essayer d'abord dans providers
  let doc = await db.doc(`providers/${providerId}`).get();
  if (doc.exists) {
    return doc.data() as ProviderData;
  }

  // Essayer dans users
  doc = await db.doc(`users/${providerId}`).get();
  if (doc.exists) {
    return doc.data() as ProviderData;
  }

  // Essayer dans sos_profiles
  doc = await db.doc(`sos_profiles/${providerId}`).get();
  if (doc.exists) {
    return doc.data() as ProviderData;
  }

  return null;
}

/**
 * Verifie les preferences de notification du provider
 */
function shouldSendEmail(provider: ProviderData): boolean {
  // Verifier les preferences de notification
  const prefs = provider.notificationPreferences;

  // Si les preferences ne sont pas definies, envoyer par defaut
  if (!prefs) return true;

  // Verifier les preferences email generales
  if (prefs.email === false) return false;

  // Verifier les preferences specifiques aux emails d'abonnement
  if (prefs.subscriptionEmails === false) return false;

  return true;
}

/**
 * Detecte la langue preferee du provider
 */
function getProviderLocale(provider: ProviderData): Lang {
  return resolveLang(
    provider.language || provider.preferredLanguage || provider.lang
  );
}

/**
 * Recupere le nom d'affichage du provider
 */
function getProviderFirstName(provider: ProviderData): string {
  return provider.firstName || provider.displayName?.split(' ')[0] || 'Cher client';
}

/**
 * Log un envoi d'email dans email_logs
 */
async function logEmailSent(params: Omit<EmailLogEntry, 'createdAt'>): Promise<string> {
  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  const logEntry: EmailLogEntry = {
    ...params,
    createdAt: now,
  };

  const docRef = await db.collection('email_logs').add(logEntry);
  logger.info(`[EmailNotifications] Email logged: ${docRef.id}`, {
    providerId: params.providerId,
    templateId: params.templateId,
    status: params.status,
  });

  return docRef.id;
}

/**
 * Recupere le plan d'abonnement
 */
async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlanData | null> {
  const doc = await getDb().doc(`subscription_plans/${planId}`).get();
  if (!doc.exists) return null;
  return doc.data() as SubscriptionPlanData;
}

/**
 * Genere l'URL de base de l'application
 */
function getAppUrl(): string {
  return process.env.APP_URL || 'https://sos-expat.com';
}

// ============================================================================
// FONCTION PRINCIPALE - sendSubscriptionEmail
// ============================================================================

/**
 * Helper principal pour envoyer un email de notification d'abonnement
 *
 * @param params - Parametres de l'email
 * @returns Promise<boolean> - true si l'email a ete envoye avec succes
 */
export async function sendSubscriptionEmail(
  params: SendSubscriptionEmailParams
): Promise<boolean> {
  const { providerId, templateId, variables, priority = 'normal' } = params;

  logger.info(`[EmailNotifications] Sending email: ${templateId} to provider ${providerId}`);

  try {
    const db = getDb();

    // 1. Recuperer le provider depuis Firestore
    const provider = await getProviderData(providerId);
    if (!provider) {
      logger.warn(`[EmailNotifications] Provider not found: ${providerId}`);
      return false;
    }

    // 2. Verifier que le provider a un email
    if (!provider.email) {
      logger.warn(`[EmailNotifications] Provider has no email: ${providerId}`);
      return false;
    }

    // 3. Verifier les preferences de notification
    if (!shouldSendEmail(provider)) {
      logger.info(`[EmailNotifications] Email notifications disabled for provider: ${providerId}`);
      await logEmailSent({
        providerId,
        templateId,
        eventId: templateId,
        email: provider.email,
        locale: getProviderLocale(provider),
        variables,
        priority,
        status: 'failed',
        error: 'Notification preferences disabled',
      });
      return false;
    }

    // 4. Detecter la langue preferee
    const locale = getProviderLocale(provider);

    // 5. Creer un document dans message_events pour declencher le pipeline
    const messageEvent = {
      eventId: templateId,
      locale,
      to: {
        email: provider.email,
      },
      context: {
        user: {
          uid: providerId,
          email: provider.email,
          preferredLanguage: locale,
        },
      },
      vars: {
        ...variables,
        FNAME: variables.firstName || getProviderFirstName(provider),
      },
      priority,
      source: 'subscription_email_notifications',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('message_events').add(messageEvent);

    // 6. Log l'envoi
    await logEmailSent({
      providerId,
      templateId,
      eventId: templateId,
      email: provider.email,
      locale,
      variables,
      priority,
      status: 'queued',
    });

    logger.info(`[EmailNotifications] Email queued successfully: ${templateId} to ${provider.email}`);
    return true;
  } catch (error) {
    logger.error(`[EmailNotifications] Error sending email ${templateId} to ${providerId}:`, error);

    // Log l'erreur
    try {
      await logEmailSent({
        providerId,
        templateId,
        eventId: templateId,
        email: 'unknown',
        locale: 'en',
        variables,
        priority,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      logger.error('[EmailNotifications] Failed to log email error:', logError);
    }

    return false;
  }
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Notifie le provider de la creation de son abonnement
 *
 * @param subscription - Donnees de l'abonnement
 * @param plan - Donnees du plan
 */
export async function notifySubscriptionCreated(
  subscription: SubscriptionData,
  plan: SubscriptionPlanData
): Promise<boolean> {
  const { providerId } = subscription;

  logger.info(`[EmailNotifications] notifySubscriptionCreated for ${providerId}`);

  // Recuperer le provider pour le firstName
  const provider = await getProviderData(providerId);
  const firstName = provider ? getProviderFirstName(provider) : 'Cher client';

  // Determiner le prix et la devise
  const currency = 'EUR'; // Par defaut
  const price = plan.pricing?.[currency] || 0;

  // Determiner le nom du plan localise
  const locale = provider ? getProviderLocale(provider) : 'en';
  const planName = plan.name?.[locale.substring(0, 2)] || plan.tier || subscription.planId;

  // Determiner la limite d'appels
  const aiCallsLimit = plan.aiCallsLimit === -1 ? 'Illimite' : String(plan.aiCallsLimit);

  return sendSubscriptionEmail({
    providerId,
    templateId: 'subscription.welcome',
    variables: {
      firstName,
      planName,
      aiCallsLimit,
      price: price.toFixed(2),
      currency,
      dashboardUrl: `${getAppUrl()}/dashboard/subscription`,
    },
    priority: 'high',
  });
}

/**
 * Notifie le provider du renouvellement de son abonnement
 *
 * @param subscription - Donnees de l'abonnement
 * @param invoice - Donnees de la facture
 */
export async function notifySubscriptionRenewed(
  subscription: SubscriptionData,
  invoice: InvoiceData
): Promise<boolean> {
  const { providerId } = subscription;

  logger.info(`[EmailNotifications] notifySubscriptionRenewed for ${providerId}`);

  // Recuperer le provider et le plan
  const provider = await getProviderData(providerId);
  const firstName = provider ? getProviderFirstName(provider) : 'Cher client';

  const plan = await getSubscriptionPlan(subscription.planId);
  const locale = provider ? getProviderLocale(provider) : 'en';
  const planName = plan?.name?.[locale.substring(0, 2)] || plan?.tier || subscription.planId;

  // Formater le montant
  const amount = ((invoice.amountPaid || 0) / 100).toFixed(2);
  const currency = (invoice.currency || 'eur').toUpperCase();

  return sendSubscriptionEmail({
    providerId,
    templateId: 'subscription.renewed',
    variables: {
      firstName,
      planName,
      amount,
      currency,
      invoiceUrl: invoice.hostedInvoiceUrl || `${getAppUrl()}/dashboard/invoices`,
      nextBillingDate: subscription.currentPeriodEnd
        ? subscription.currentPeriodEnd.toDate().toLocaleDateString(locale)
        : '',
    },
    priority: 'normal',
  });
}

/**
 * Notifie le provider d'une alerte de quota (80% ou 100%)
 *
 * @param providerId - ID du provider
 * @param usage - Nombre d'appels utilises
 * @param limit - Limite d'appels
 * @param threshold - Seuil d'alerte (80 ou 100)
 */
export async function notifyQuotaAlert(
  providerId: string,
  usage: number,
  limit: number,
  threshold: 80 | 100
): Promise<boolean> {
  logger.info(`[EmailNotifications] notifyQuotaAlert for ${providerId}: ${usage}/${limit} (${threshold}%)`);

  const db = getDb();

  // Verifier qu'on n'a pas deja envoye cette alerte ce mois-ci
  const usageDoc = await db.doc(`ai_usage/${providerId}`).get();
  if (usageDoc.exists) {
    const usageData = usageDoc.data();

    if (threshold === 80 && usageData?.quotaAlert80Sent === true) {
      logger.info(`[EmailNotifications] Quota 80% alert already sent for ${providerId}`);
      return false;
    }

    if (threshold === 100 && usageData?.quotaAlert100Sent === true) {
      logger.info(`[EmailNotifications] Quota 100% alert already sent for ${providerId}`);
      return false;
    }
  }

  // Recuperer le provider
  const provider = await getProviderData(providerId);
  const firstName = provider ? getProviderFirstName(provider) : 'Cher client';

  // Determiner le template
  const templateId = threshold === 80
    ? 'subscription.quota_80'
    : 'subscription.quota_exhausted';

  // Calculer les statistiques
  const remaining = Math.max(0, limit - usage);
  const usagePercent = Math.round((usage / limit) * 100);

  // Envoyer l'email
  const sent = await sendSubscriptionEmail({
    providerId,
    templateId,
    variables: {
      firstName,
      currentUsage: String(usage),
      quotaLimit: String(limit),
      remaining: String(remaining),
      usagePercent: String(usagePercent),
      upgradeUrl: `${getAppUrl()}/dashboard/subscription/plans`,
    },
    priority: threshold === 100 ? 'high' : 'normal',
  });

  // Marquer l'alerte comme envoyee dans ai_usage
  if (sent) {
    const now = admin.firestore.Timestamp.now();
    const updateField = threshold === 80
      ? { quotaAlert80Sent: true, quotaAlert80SentAt: now }
      : { quotaAlert100Sent: true, quotaAlert100SentAt: now };

    await db.doc(`ai_usage/${providerId}`).update({
      ...updateField,
      updatedAt: now,
    });

    logger.info(`[EmailNotifications] Quota ${threshold}% alert flag set for ${providerId}`);
  }

  return sent;
}

/**
 * Notifie le provider d'un echec de paiement
 *
 * @param subscription - Donnees de l'abonnement
 * @param invoice - Donnees de la facture
 * @param attempt - Numero de tentative (1, 2, 3...)
 */
export async function notifyPaymentFailed(
  subscription: SubscriptionData,
  invoice: InvoiceData,
  attempt: number
): Promise<boolean> {
  const { providerId } = subscription;

  logger.info(`[EmailNotifications] notifyPaymentFailed for ${providerId} (attempt ${attempt})`);

  // Recuperer le provider
  const provider = await getProviderData(providerId);
  const firstName = provider ? getProviderFirstName(provider) : 'Cher client';

  // Determiner le template selon le nombre de tentatives
  // - attempt 1-2: notification standard
  // - attempt >= 3 ou 7 jours passes: notification finale
  const isFinalNotice = attempt >= 3;
  const templateId = isFinalNotice
    ? 'subscription.payment_failed_final'
    : 'subscription.payment_failed';

  // Calculer les jours restants avant suspension
  let daysRemaining = 7;
  if (subscription.currentPeriodEnd) {
    const periodEnd = subscription.currentPeriodEnd.toDate();
    const now = new Date();
    daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Formater le montant
  const amount = ((invoice.amountDue || 0) / 100).toFixed(2);
  const currency = (invoice.currency || 'eur').toUpperCase();

  return sendSubscriptionEmail({
    providerId,
    templateId,
    variables: {
      firstName,
      amount,
      currency,
      attemptNumber: String(attempt),
      daysRemaining: String(daysRemaining),
      updatePaymentUrl: `${getAppUrl()}/dashboard/subscription/payment`,
      invoiceUrl: invoice.hostedInvoiceUrl || '',
    },
    priority: 'high',
  });
}

/**
 * Notifie le provider de l'annulation de son abonnement
 *
 * @param subscription - Donnees de l'abonnement
 */
export async function notifySubscriptionCanceled(
  subscription: SubscriptionData
): Promise<boolean> {
  const { providerId } = subscription;

  logger.info(`[EmailNotifications] notifySubscriptionCanceled for ${providerId}`);

  // Recuperer le provider
  const provider = await getProviderData(providerId);
  const firstName = provider ? getProviderFirstName(provider) : 'Cher client';

  // Determiner la date de fin
  const locale = provider ? getProviderLocale(provider) : 'en';
  let endDate = '';
  if (subscription.currentPeriodEnd) {
    endDate = subscription.currentPeriodEnd.toDate().toLocaleDateString(locale);
  } else if (subscription.canceledAt) {
    endDate = subscription.canceledAt.toDate().toLocaleDateString(locale);
  }

  return sendSubscriptionEmail({
    providerId,
    templateId: 'subscription.canceled',
    variables: {
      firstName,
      endDate,
      reactivateUrl: `${getAppUrl()}/dashboard/subscription`,
      feedbackUrl: `${getAppUrl()}/feedback`,
    },
    priority: 'normal',
  });
}

/**
 * Notifie le provider que son essai gratuit se termine bientot (3 jours avant)
 *
 * @param subscription - Donnees de l'abonnement
 */
export async function notifyTrialEnding(
  subscription: SubscriptionData
): Promise<boolean> {
  const { providerId } = subscription;

  logger.info(`[EmailNotifications] notifyTrialEnding for ${providerId}`);

  // Recuperer le provider
  const provider = await getProviderData(providerId);
  const firstName = provider ? getProviderFirstName(provider) : 'Cher client';

  // Calculer la date de fin du trial
  const locale = provider ? getProviderLocale(provider) : 'en';
  let trialEndDate = '';
  let daysRemaining = 0;

  if (subscription.trialEndsAt) {
    const trialEnd = subscription.trialEndsAt.toDate();
    trialEndDate = trialEnd.toLocaleDateString(locale);

    const now = new Date();
    daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Recuperer l'usage du trial
  const usageDoc = await getDb().doc(`ai_usage/${providerId}`).get();
  const trialCallsUsed = usageDoc.exists ? (usageDoc.data()?.trialCallsUsed || 0) : 0;

  // Recuperer la config trial
  const settingsDoc = await getDb().doc('settings/subscription').get();
  const trialMaxCalls = settingsDoc.exists
    ? (settingsDoc.data()?.trial?.maxAiCalls || 3)
    : 3;

  return sendSubscriptionEmail({
    providerId,
    templateId: 'subscription.trial_ending',
    variables: {
      firstName,
      trialEndDate,
      daysRemaining: String(daysRemaining),
      trialCallsUsed: String(trialCallsUsed),
      trialCallsLimit: String(trialMaxCalls),
      plansUrl: `${getAppUrl()}/dashboard/subscription/plans`,
    },
    priority: 'high',
  });
}

/**
 * Notifie le provider que son abonnement a expire
 *
 * @param subscription - Donnees de l'abonnement
 */
export async function notifySubscriptionExpired(
  subscription: SubscriptionData
): Promise<boolean> {
  const { providerId } = subscription;

  logger.info(`[EmailNotifications] notifySubscriptionExpired for ${providerId}`);

  // Recuperer le provider et le plan
  const provider = await getProviderData(providerId);
  const firstName = provider ? getProviderFirstName(provider) : 'Cher client';

  const plan = await getSubscriptionPlan(subscription.planId);
  const locale = provider ? getProviderLocale(provider) : 'en';
  const planName = plan?.name?.[locale.substring(0, 2)] || plan?.tier || subscription.planId;

  return sendSubscriptionEmail({
    providerId,
    templateId: 'subscription.expired',
    variables: {
      firstName,
      planName,
      resubscribeUrl: `${getAppUrl()}/dashboard/subscription/plans`,
      contactUrl: `${getAppUrl()}/contact`,
    },
    priority: 'normal',
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Notifie le provider d'une mise a niveau reussie
 *
 * @param subscription - Donnees de l'abonnement
 * @param oldPlan - Ancien plan
 * @param newPlan - Nouveau plan
 */
export async function notifySubscriptionUpgraded(
  subscription: SubscriptionData,
  oldPlan: SubscriptionPlanData,
  newPlan: SubscriptionPlanData
): Promise<boolean> {
  const { providerId } = subscription;

  logger.info(`[EmailNotifications] notifySubscriptionUpgraded for ${providerId}`);

  // Recuperer le provider
  const provider = await getProviderData(providerId);
  const firstName = provider ? getProviderFirstName(provider) : 'Cher client';

  const locale = provider ? getProviderLocale(provider) : 'en';
  const oldPlanName = oldPlan.name?.[locale.substring(0, 2)] || oldPlan.tier;
  const newPlanName = newPlan.name?.[locale.substring(0, 2)] || newPlan.tier;

  const newAiCallsLimit = newPlan.aiCallsLimit === -1 ? 'Illimite' : String(newPlan.aiCallsLimit);

  return sendSubscriptionEmail({
    providerId,
    templateId: 'subscription.upgraded',
    variables: {
      firstName,
      oldPlanName,
      newPlanName,
      aiCallsLimit: newAiCallsLimit,
      dashboardUrl: `${getAppUrl()}/dashboard/subscription`,
    },
    priority: 'normal',
  });
}

/**
 * Notifie le provider d'une retrograde programmee
 *
 * @param subscription - Donnees de l'abonnement
 * @param oldPlan - Ancien plan
 * @param newPlan - Nouveau plan
 */
export async function notifySubscriptionDowngradeScheduled(
  subscription: SubscriptionData,
  oldPlan: SubscriptionPlanData,
  newPlan: SubscriptionPlanData
): Promise<boolean> {
  const { providerId } = subscription;

  logger.info(`[EmailNotifications] notifySubscriptionDowngradeScheduled for ${providerId}`);

  // Recuperer le provider
  const provider = await getProviderData(providerId);
  const firstName = provider ? getProviderFirstName(provider) : 'Cher client';

  const locale = provider ? getProviderLocale(provider) : 'en';
  const oldPlanName = oldPlan.name?.[locale.substring(0, 2)] || oldPlan.tier;
  const newPlanName = newPlan.name?.[locale.substring(0, 2)] || newPlan.tier;

  const effectiveDate = subscription.currentPeriodEnd
    ? subscription.currentPeriodEnd.toDate().toLocaleDateString(locale)
    : '';

  return sendSubscriptionEmail({
    providerId,
    templateId: 'subscription.downgrade_scheduled',
    variables: {
      firstName,
      oldPlanName,
      newPlanName,
      effectiveDate,
      dashboardUrl: `${getAppUrl()}/dashboard/subscription`,
    },
    priority: 'normal',
  });
}

/**
 * Notifie le provider de la reactivation de son abonnement
 *
 * @param subscription - Donnees de l'abonnement
 */
export async function notifySubscriptionReactivated(
  subscription: SubscriptionData
): Promise<boolean> {
  const { providerId } = subscription;

  logger.info(`[EmailNotifications] notifySubscriptionReactivated for ${providerId}`);

  // Recuperer le provider et le plan
  const provider = await getProviderData(providerId);
  const firstName = provider ? getProviderFirstName(provider) : 'Cher client';

  const plan = await getSubscriptionPlan(subscription.planId);
  const locale = provider ? getProviderLocale(provider) : 'en';
  const planName = plan?.name?.[locale.substring(0, 2)] || plan?.tier || subscription.planId;

  const aiCallsLimit = plan?.aiCallsLimit === -1 ? 'Illimite' : String(plan?.aiCallsLimit || 0);

  return sendSubscriptionEmail({
    providerId,
    templateId: 'subscription.reactivated',
    variables: {
      firstName,
      planName,
      aiCallsLimit,
      dashboardUrl: `${getAppUrl()}/dashboard/subscription`,
    },
    priority: 'normal',
  });
}

/**
 * Notifie le provider de la suspension de son compte
 *
 * @param subscription - Donnees de l'abonnement
 * @param reason - Raison de la suspension
 */
export async function notifyAccountSuspended(
  subscription: SubscriptionData,
  reason: string = 'payment_failed'
): Promise<boolean> {
  const { providerId } = subscription;

  logger.info(`[EmailNotifications] notifyAccountSuspended for ${providerId} (reason: ${reason})`);

  // Recuperer le provider
  const provider = await getProviderData(providerId);
  const firstName = provider ? getProviderFirstName(provider) : 'Cher client';

  return sendSubscriptionEmail({
    providerId,
    templateId: 'subscription.account_suspended',
    variables: {
      firstName,
      reason,
      reactivateUrl: `${getAppUrl()}/dashboard/subscription/payment`,
      supportUrl: `${getAppUrl()}/contact`,
    },
    priority: 'high',
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export const subscriptionEmailNotifications = {
  sendSubscriptionEmail,
  notifySubscriptionCreated,
  notifySubscriptionRenewed,
  notifyQuotaAlert,
  notifyPaymentFailed,
  notifySubscriptionCanceled,
  notifyTrialEnding,
  notifySubscriptionExpired,
  notifySubscriptionUpgraded,
  notifySubscriptionDowngradeScheduled,
  notifySubscriptionReactivated,
  notifyAccountSuspended,
};
