/**
 * Système de Dunning - Retry automatique des paiements échoués
 * SOS-Expat Platform
 *
 * STRATÉGIE DE DUNNING:
 * - J+1: Premier retry + Email "Problème de paiement"
 * - J+3: Deuxième retry + Email "Action requise"
 * - J+5: Troisième retry + Email "Dernière tentative"
 * - J+7: Suspension du compte + Email "Compte suspendu"
 */

import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import Stripe from 'stripe';

// Secrets Firebase
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');

// Stripe client initialized lazily
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(STRIPE_SECRET_KEY.value(), {
      apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
    });
  }
  return stripeClient;
}

// Lazy initialization to prevent deployment timeout
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

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

// ============================================================================
// TYPES
// ============================================================================

export interface DunningRecord {
  id?: string;
  userId: string;
  subscriptionId: string;
  stripeSubscriptionId: string;
  stripeInvoiceId: string;
  originalFailureDate: FirebaseFirestore.Timestamp;
  retryCount: number;
  lastRetryDate?: FirebaseFirestore.Timestamp;
  nextRetryDate: FirebaseFirestore.Timestamp;
  status: 'pending' | 'retrying' | 'recovered' | 'suspended' | 'canceled';
  lastError?: string;
  emailsSent: string[]; // IDs des emails envoyés
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface DunningEmailTemplate {
  type: 'payment_failed' | 'action_required' | 'final_attempt' | 'account_suspended';
  subject: string;
  templateId: string; // Pour SendGrid/Mailchimp
  dayOffset: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const DUNNING_CONFIG = {
  maxRetries: 3,
  retrySchedule: [1, 3, 5], // Jours après l'échec initial
  suspensionDay: 7,
  gracePeriodDays: 3, // Période de grâce après suspension avant annulation
};

export const DUNNING_EMAILS: DunningEmailTemplate[] = [
  {
    type: 'payment_failed',
    subject: '[SOS-Expat] Problème avec votre paiement',
    templateId: 'dunning_payment_failed',
    dayOffset: 1,
  },
  {
    type: 'action_required',
    subject: '[SOS-Expat] Action requise - Mise à jour de paiement',
    templateId: 'dunning_action_required',
    dayOffset: 3,
  },
  {
    type: 'final_attempt',
    subject: '[SOS-Expat] Dernière tentative de paiement',
    templateId: 'dunning_final_attempt',
    dayOffset: 5,
  },
  {
    type: 'account_suspended',
    subject: '[SOS-Expat] Votre compte a été suspendu',
    templateId: 'dunning_suspended',
    dayOffset: 7,
  },
];

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Crée un enregistrement de dunning après un échec de paiement
 */
export async function createDunningRecord(
  userId: string,
  stripeSubscriptionId: string,
  stripeInvoiceId: string
): Promise<string> {
  const now = admin.firestore.Timestamp.now();
  const nextRetryDate = calculateNextRetryDate(0);

  const dunningRecord: Omit<DunningRecord, 'id'> = {
    userId,
    subscriptionId: userId, // Dans notre système, subscriptionId = userId
    stripeSubscriptionId,
    stripeInvoiceId,
    originalFailureDate: now,
    retryCount: 0,
    nextRetryDate: admin.firestore.Timestamp.fromDate(nextRetryDate),
    status: 'pending',
    emailsSent: [],
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await getDb().collection('dunning_records').add(dunningRecord);

  logger.info('[Dunning] Record créé:', {
    dunningId: docRef.id,
    userId,
    stripeInvoiceId,
    nextRetryDate: nextRetryDate.toISOString(),
  });

  return docRef.id;
}

/**
 * Calcule la prochaine date de retry basée sur le nombre de tentatives
 */
function calculateNextRetryDate(retryCount: number): Date {
  const daysOffset = DUNNING_CONFIG.retrySchedule[retryCount] || DUNNING_CONFIG.suspensionDay;
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + daysOffset);
  nextDate.setHours(10, 0, 0, 0); // Retry à 10h du matin
  return nextDate;
}

/**
 * Tente de relancer le paiement d'une facture
 */
export async function retryPayment(dunningRecord: DunningRecord): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    logger.info('[Dunning] Tentative de retry:', {
      dunningId: dunningRecord.id,
      invoiceId: dunningRecord.stripeInvoiceId,
      retryCount: dunningRecord.retryCount + 1,
    });

    // Récupérer la facture
    const invoice = await getStripe().invoices.retrieve(dunningRecord.stripeInvoiceId);

    // Vérifier si la facture est toujours impayée
    if (invoice.status === 'paid') {
      logger.info('[Dunning] Facture déjà payée:', dunningRecord.stripeInvoiceId);
      return { success: true };
    }

    if (invoice.status !== 'open') {
      return {
        success: false,
        error: `Invoice status invalid: ${invoice.status}`,
      };
    }

    // Tenter le paiement avec idempotency key
    await getStripe().invoices.pay(dunningRecord.stripeInvoiceId, {}, {
      idempotencyKey: `dunning-retry-${dunningRecord.id}-${dunningRecord.retryCount + 1}`,
    });

    logger.info('[Dunning] Paiement réussi:', dunningRecord.stripeInvoiceId);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Dunning] Échec retry:', {
      dunningId: dunningRecord.id,
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}

/**
 * Met à jour le statut d'un enregistrement de dunning
 */
export async function updateDunningStatus(
  dunningId: string,
  updates: Partial<DunningRecord>
): Promise<void> {
  await getDb().collection('dunning_records').doc(dunningId).update({
    ...updates,
    updatedAt: admin.firestore.Timestamp.now(),
  });
}

/**
 * Envoie un email de dunning
 */
async function sendDunningEmail(
  userId: string,
  emailType: DunningEmailTemplate['type']
): Promise<string | null> {
  try {
    // Récupérer les infos utilisateur
    const userDoc = await getDb().collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.email) {
      logger.warn('[Dunning] Pas d\'email pour user:', userId);
      return null;
    }

    const template = DUNNING_EMAILS.find(e => e.type === emailType);
    if (!template) return null;

    // Créer l'entrée dans mail_queue pour envoi par Cloud Function dédiée
    const emailDoc = await getDb().collection('mail_queue').add({
      to: userData.email,
      template: template.templateId,
      subject: template.subject,
      data: {
        userName: userData.displayName || userData.firstName || 'Cher client',
        updatePaymentUrl: 'https://sos-urgently-ac307.web.app/dashboard/subscription',
      },
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
    });

    logger.info('[Dunning] Email queued:', {
      emailId: emailDoc.id,
      type: emailType,
      userId,
    });

    return emailDoc.id;
  } catch (error) {
    logger.error('[Dunning] Erreur envoi email:', error);
    return null;
  }
}

/**
 * Suspend un abonnement après échec des retries
 */
async function suspendSubscription(dunningRecord: DunningRecord): Promise<void> {
  try {
    // Mettre à jour le statut dans Firestore
    await getDb().collection('subscriptions').doc(dunningRecord.userId).update({
      status: 'suspended',
      suspendedAt: admin.firestore.Timestamp.now(),
      suspensionReason: 'payment_failed',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Envoyer email de suspension
    await sendDunningEmail(dunningRecord.userId, 'account_suspended');

    // Mettre à jour le dunning record
    await updateDunningStatus(dunningRecord.id!, {
      status: 'suspended',
      emailsSent: [...dunningRecord.emailsSent, 'account_suspended'],
    });

    logger.info('[Dunning] Abonnement suspendu:', {
      userId: dunningRecord.userId,
      subscriptionId: dunningRecord.stripeSubscriptionId,
    });
  } catch (error) {
    logger.error('[Dunning] Erreur suspension:', error);
    throw error;
  }
}

/**
 * Marque un dunning comme récupéré (paiement réussi)
 */
export async function markDunningRecovered(
  stripeInvoiceId: string
): Promise<void> {
  const snapshot = await getDb()
    .collection('dunning_records')
    .where('stripeInvoiceId', '==', stripeInvoiceId)
    .where('status', 'in', ['pending', 'retrying'])
    .limit(1)
    .get();

  if (snapshot.empty) return;

  const doc = snapshot.docs[0];
  await doc.ref.update({
    status: 'recovered',
    updatedAt: admin.firestore.Timestamp.now(),
  });

  // Réactiver l'abonnement si suspendu
  const dunningRecord = doc.data() as DunningRecord;
  const subscriptionDoc = await getDb()
    .collection('subscriptions')
    .doc(dunningRecord.userId)
    .get();

  if (subscriptionDoc.exists && subscriptionDoc.data()?.status === 'suspended') {
    await subscriptionDoc.ref.update({
      status: 'active',
      suspendedAt: admin.firestore.FieldValue.delete(),
      suspensionReason: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }

  logger.info('[Dunning] Récupéré:', { dunningId: doc.id, invoiceId: stripeInvoiceId });
}

// ============================================================================
// SCHEDULED FUNCTION - Processeur de Dunning
// ============================================================================

/**
 * Cloud Function schedulée pour traiter la queue de dunning
 * S'exécute toutes les heures
 */
export const processDunningQueue = onSchedule(
  {
    // OPTIMIZED: Changed from 1 hour to 2 hours to reduce invocations by 50%
    // Previous: 24 invocations/day → Now: 12 invocations/day
    schedule: 'every 2 hours',
    region: 'europe-west1',
    timeZone: 'Europe/Paris',
    secrets: [STRIPE_SECRET_KEY],
    memory: '256MiB', // Reduced from 512MiB - only queries Firestore and calls Stripe
    timeoutSeconds: 300,
  },
  async () => {
    logger.info('[Dunning] Démarrage du traitement de la queue');

    const now = admin.firestore.Timestamp.now();

    // Récupérer les dunning records à traiter
    const snapshot = await getDb()
      .collection('dunning_records')
      .where('status', 'in', ['pending', 'retrying'])
      .where('nextRetryDate', '<=', now)
      .limit(50) // Traiter par batch
      .get();

    if (snapshot.empty) {
      logger.info('[Dunning] Aucun record à traiter');
      return;
    }

    logger.info('[Dunning] Records à traiter:', snapshot.size);

    for (const doc of snapshot.docs) {
      const record = { id: doc.id, ...doc.data() } as DunningRecord;

      try {
        // Vérifier si on doit suspendre
        if (record.retryCount >= DUNNING_CONFIG.maxRetries) {
          await suspendSubscription(record);
          continue;
        }

        // Déterminer l'email à envoyer
        const emailType = DUNNING_EMAILS[record.retryCount]?.type;
        if (emailType && !record.emailsSent.includes(emailType)) {
          const emailId = await sendDunningEmail(record.userId, emailType);
          if (emailId) {
            record.emailsSent.push(emailType);
          }
        }

        // Tenter le retry
        await updateDunningStatus(record.id!, { status: 'retrying' });
        const result = await retryPayment(record);

        if (result.success) {
          // Paiement réussi
          await updateDunningStatus(record.id!, {
            status: 'recovered',
            lastRetryDate: admin.firestore.Timestamp.now(),
          });

          // Réactiver l'abonnement
          await getDb().collection('subscriptions').doc(record.userId).update({
            status: 'active',
            aiCallsUsed: 0, // Reset du compteur
            updatedAt: admin.firestore.Timestamp.now(),
          });

          logger.info('[Dunning] Paiement récupéré:', record.id);
        } else {
          // Échec - programmer prochain retry
          const nextRetryCount = record.retryCount + 1;
          const nextRetryDate = calculateNextRetryDate(nextRetryCount);

          await updateDunningStatus(record.id!, {
            status: 'pending',
            retryCount: nextRetryCount,
            lastRetryDate: admin.firestore.Timestamp.now(),
            nextRetryDate: admin.firestore.Timestamp.fromDate(nextRetryDate),
            lastError: result.error,
            emailsSent: record.emailsSent,
          });

          logger.info('[Dunning] Retry échoué, prochain retry:', {
            dunningId: record.id,
            nextRetryCount,
            nextRetryDate: nextRetryDate.toISOString(),
          });
        }
      } catch (error) {
        logger.error('[Dunning] Erreur traitement record:', {
          dunningId: record.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('[Dunning] Traitement terminé');
  }
);

// ============================================================================
// HELPER EXPORTS
// ============================================================================

export { STRIPE_SECRET_KEY };
