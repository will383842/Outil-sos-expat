/**
 * Cleanup Orphaned Sessions & Busy Providers
 *
 * P0 FIX 2026-02-02: Version améliorée avec annulation RÉELLE des paiements
 *
 * Cette fonction scheduled nettoie:
 * 1. Les sessions d'appel orphelines (stuck en pending/connecting) avec paiement autorisé
 *    → Annule RÉELLEMENT l'autorisation Stripe/PayPal (pas juste Firestore)
 * 2. Les prestataires stuck en statut "busy" sans session active
 *    → Les remet en "available"
 *
 * SÉCURITÉS ANTI-CONFLIT:
 * - Ne touche JAMAIS aux sessions "active" ou "both_connected" (appel en cours)
 * - Vérifie qu'il n'y a pas de conférence Twilio active
 * - Vérifie le statut réel du paiement via API Stripe/PayPal avant d'annuler
 * - Timeout de 1 heure basé sur payment.authorizedAt (pas sur l'heure du cleanup)
 *
 * Exécution: Toutes les heures (pour réactivité client)
 */

import * as scheduler from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { logError } from '../utils/logs/logError';
import { logCallRecord } from '../utils/logs/logCallRecord';
import { setProviderAvailable } from '../callables/providerStatusManager';
import { syncPaymentStatus } from '../utils/paymentSync';
// P0 FIX: Import secrets from centralized secrets.ts
import {
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  STRIPE_MODE, // Note: This is a defineString, not a secret
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
} from '../lib/secrets';

// Seuils de timeout (en millisecondes)
const THRESHOLDS = {
  // P0 FIX 2026-02-02: Paiements autorisés depuis plus de 1 heure sans appel démarré
  PAYMENT_AUTHORIZED_TIMEOUT: 60 * 60 * 1000, // 1 heure
  // Sessions en "pending" depuis plus de 60 minutes (backup)
  SESSION_PENDING_TIMEOUT: 60 * 60 * 1000,
  // Sessions en "connecting" depuis plus de 45 minutes
  SESSION_CONNECTING_TIMEOUT: 45 * 60 * 1000,
  // Prestataires "busy" depuis plus de 2 heures sans session active
  PROVIDER_BUSY_TIMEOUT: 2 * 60 * 60 * 1000,
} as const;

// Statuts de session qui indiquent que l'appel n'a PAS démarré (safe to cancel)
const SAFE_TO_CANCEL_STATUSES = [
  'pending',
  'provider_connecting',
  'client_connecting',
  'both_connecting',
  'failed',
  'cancelled',
];

// Statuts de session qui indiquent un appel EN COURS (NE PAS TOUCHER!)
const ACTIVE_CALL_STATUSES = [
  'active',
  'both_connected',
  'in_progress',
];

/**
 * Get Stripe instance based on mode
 */
function getStripeInstance(): Stripe {
  const mode = STRIPE_MODE.value() || 'test';
  const secretKey = mode === 'live'
    ? STRIPE_SECRET_KEY_LIVE.value()
    : STRIPE_SECRET_KEY_TEST.value();

  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

/**
 * Get Twilio client
 */
function getTwilioClient() {
  const accountSid = TWILIO_ACCOUNT_SID.value();
  const authToken = TWILIO_AUTH_TOKEN.value();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require('twilio');
  return twilio(accountSid, authToken);
}

/**
 * Vérifie s'il y a une conférence Twilio active pour cette session
 */
async function hasActiveTwilioConference(
  conferenceName: string | undefined
): Promise<boolean> {
  if (!conferenceName) return false;

  try {
    const twilioClient = getTwilioClient();
    const conferences = await twilioClient.conferences.list({
      friendlyName: conferenceName,
      status: 'in-progress',
      limit: 1,
    });

    return conferences.length > 0;
  } catch (error) {
    console.error(`❌ Erreur vérification conférence Twilio ${conferenceName}:`, error);
    // En cas d'erreur, on ne touche pas (sécurité)
    return true;
  }
}

/**
 * Annule un paiement Stripe (libère les fonds bloqués sur la carte client)
 */
async function cancelStripePayment(
  paymentIntentId: string,
  sessionId: string,
  db: admin.firestore.Firestore
): Promise<{ success: boolean; error?: string }> {
  try {
    const stripe = getStripeInstance();

    // Vérifier le statut réel du PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'requires_capture') {
      // L'autorisation est toujours active - l'annuler
      console.log(`💳 [CLEANUP] Annulation Stripe PaymentIntent: ${paymentIntentId}`);

      await stripe.paymentIntents.cancel(paymentIntentId, {
        cancellation_reason: 'abandoned',
      });

      // Mettre à jour Firestore via syncPaymentStatus
      await syncPaymentStatus(db, paymentIntentId, sessionId, {
        status: 'cancelled',
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        refundReason: 'orphaned_session_cleanup_1h_timeout',
        cancelledBy: 'cleanup_orphaned_sessions',
      });

      return { success: true };
    } else if (paymentIntent.status === 'canceled') {
      console.log(`ℹ️ [CLEANUP] PaymentIntent ${paymentIntentId} déjà annulé`);
      return { success: true };
    } else if (paymentIntent.status === 'succeeded') {
      console.log(`⚠️ [CLEANUP] PaymentIntent ${paymentIntentId} déjà capturé - ne pas annuler`);
      return { success: false, error: 'already_captured' };
    } else {
      console.log(`⚠️ [CLEANUP] PaymentIntent ${paymentIntentId} statut inattendu: ${paymentIntent.status}`);
      return { success: false, error: `unexpected_status_${paymentIntent.status}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [CLEANUP] Erreur annulation Stripe ${paymentIntentId}:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Annule (void) une autorisation PayPal (libère les fonds bloqués)
 */
async function voidPayPalAuthorization(
  orderId: string,
  sessionId: string,
  db: admin.firestore.Firestore
): Promise<{ success: boolean; error?: string }> {
  try {
    // Import dynamique pour éviter les dépendances circulaires
    const { PayPalManager } = await import('../PayPalManager');
    const paypalManager = new PayPalManager();

    console.log(`💳 [CLEANUP] Void PayPal autorisation pour ordre: ${orderId}`);

    const voidResult = await paypalManager.voidAuthorization(
      orderId,
      'orphaned_session_cleanup_1h_timeout'
    );

    if (voidResult.success) {
      // syncPaymentVoided est appelé dans voidAuthorization, mais on s'assure que Firestore est à jour
      await db.collection('call_sessions').doc(sessionId).update({
        'payment.status': 'voided',
        'payment.voidedAt': admin.firestore.FieldValue.serverTimestamp(),
        'payment.refundReason': 'orphaned_session_cleanup_1h_timeout',
        'payment.cancelledBy': 'cleanup_orphaned_sessions',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } else {
      // Vérifier si déjà void ou capturé
      if (voidResult.status === 'ALREADY_VOIDED') {
        console.log(`ℹ️ [CLEANUP] PayPal ordre ${orderId} déjà annulé`);
        return { success: true };
      } else if (voidResult.status === 'ALREADY_CAPTURED') {
        console.log(`⚠️ [CLEANUP] PayPal ordre ${orderId} déjà capturé - ne pas annuler`);
        return { success: false, error: 'already_captured' };
      }

      return { success: false, error: voidResult.message || voidResult.status };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [CLEANUP] Erreur void PayPal ${orderId}:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Traite une session orpheline avec paiement autorisé
 */
async function processOrphanedSession(
  doc: admin.firestore.QueryDocumentSnapshot,
  db: admin.firestore.Firestore,
  now: number,
  results: {
    sessionsCleanedCount: number;
    paymentsRefundedCount: number;
    providersCleanedCount: number;
    errorCount: number;
  }
): Promise<void> {
  const session = doc.data();
  const sessionId = doc.id;
  const paymentStatus = session.payment?.status;
  const sessionStatus = session.status;

  // Calculer l'âge de la session
  const createdAt = session.metadata?.createdAt?.toMillis?.() || session.createdAt?.toMillis?.() || now;
  const ageMinutes = Math.round((now - createdAt) / 60000);

  console.log(`\n🔍 [CLEANUP] Évaluation session ${sessionId}:`);
  console.log(`   Status session: ${sessionStatus}`);
  console.log(`   Status paiement: ${paymentStatus}`);
  console.log(`   Age: ${ageMinutes} minutes`);

  // ========== SÉCURITÉ 1: Ne JAMAIS toucher aux appels actifs ==========
  if (ACTIVE_CALL_STATUSES.includes(sessionStatus)) {
    console.log(`   ✓ SKIP: Appel en cours (status: ${sessionStatus})`);
    return;
  }

  // ========== SÉCURITÉ 2: Vérifier s'il y a une conférence Twilio active ==========
  const conferenceName = session.conference?.name || session.conference?.friendlyName;
  if (conferenceName) {
    const hasActiveConference = await hasActiveTwilioConference(conferenceName);
    if (hasActiveConference) {
      console.log(`   ✓ SKIP: Conférence Twilio active (${conferenceName})`);
      return;
    }
  }

  // ========== SÉCURITÉ 3: Vérifier que le paiement est bien autorisé (non capturé) ==========
  if (paymentStatus !== 'authorized' && paymentStatus !== 'pending') {
    console.log(`   ✓ SKIP: Paiement pas en statut authorized/pending (status: ${paymentStatus})`);
    // Quand même marquer la session comme failed si elle est orpheline
    if (SAFE_TO_CANCEL_STATUSES.includes(sessionStatus) && ageMinutes > 60) {
      await doc.ref.update({
        status: 'failed',
        failedReason: 'orphaned_session_cleanup',
        'metadata.updatedAt': admin.firestore.Timestamp.now(),
      });
      results.sessionsCleanedCount++;
    }
    return;
  }

  // ========== SÉCURITÉ 4: Vérifier l'âge du paiement (1 heure minimum) ==========
  const authorizedAt = session.payment?.authorizedAt?.toMillis?.() || createdAt;
  const paymentAgeMinutes = Math.round((now - authorizedAt) / 60000);

  if (paymentAgeMinutes < 60) {
    console.log(`   ✓ SKIP: Paiement trop récent (${paymentAgeMinutes} min < 60 min)`);
    return;
  }

  console.log(`   ⚠️ Session orpheline détectée - paiement autorisé depuis ${paymentAgeMinutes} min`);

  // ========== ANNULATION DU PAIEMENT ==========
  const isPayPal = session.payment?.gateway === 'paypal' || !!session.payment?.paypalOrderId;
  let paymentCancelResult: { success: boolean; error?: string };

  if (isPayPal) {
    // PayPal: void l'autorisation
    const paypalOrderId = session.payment?.paypalOrderId;
    if (paypalOrderId) {
      console.log(`   💳 Void PayPal autorisation: ${paypalOrderId}`);
      paymentCancelResult = await voidPayPalAuthorization(paypalOrderId, sessionId, db);
    } else {
      console.warn(`   ⚠️ PayPal: pas de paypalOrderId trouvé`);
      paymentCancelResult = { success: false, error: 'no_paypal_order_id' };
    }
  } else {
    // Stripe: cancel le PaymentIntent
    const paymentIntentId = session.payment?.intentId || session.paymentId;
    if (paymentIntentId) {
      console.log(`   💳 Cancel Stripe PaymentIntent: ${paymentIntentId}`);
      paymentCancelResult = await cancelStripePayment(paymentIntentId, sessionId, db);
    } else {
      console.warn(`   ⚠️ Stripe: pas de paymentIntentId trouvé`);
      paymentCancelResult = { success: false, error: 'no_payment_intent_id' };
    }
  }

  // ========== MISE À JOUR DE LA SESSION ==========
  const updateData: Record<string, unknown> = {
    status: 'failed',
    failedReason: 'orphaned_session_cleanup_1h_timeout',
    'metadata.updatedAt': admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (paymentCancelResult.success) {
    updateData['payment.status'] = isPayPal ? 'voided' : 'cancelled';
    updateData['payment.refundReason'] = 'orphaned_session_cleanup_1h_timeout';
    updateData['payment.cancelledAt'] = admin.firestore.FieldValue.serverTimestamp();
    updateData['payment.cancelledBy'] = 'cleanup_orphaned_sessions';
    results.paymentsRefundedCount++;
    console.log(`   ✅ Paiement ${isPayPal ? 'void' : 'annulé'} avec succès`);
  } else {
    updateData['payment.cancellationError'] = paymentCancelResult.error;
    console.log(`   ❌ Échec annulation paiement: ${paymentCancelResult.error}`);
    results.errorCount++;
  }

  await doc.ref.update(updateData);
  results.sessionsCleanedCount++;

  // ========== LIBÉRER LE PRESTATAIRE ==========
  const providerId = session.metadata?.providerId || session.providerId;
  if (providerId) {
    try {
      console.log(`   🔄 Libération du prestataire: ${providerId}`);
      await setProviderAvailable(providerId, 'orphaned_session_cleanup');
      results.providersCleanedCount++;
      console.log(`   ✅ Prestataire ${providerId} remis en available`);
    } catch (providerError) {
      console.error(`   ❌ Erreur libération prestataire ${providerId}:`, providerError);
    }
  }

  // ========== LOG D'AUDIT ==========
  await logCallRecord({
    callId: sessionId,
    status: 'session_cleanup_orphaned_with_refund',
    retryCount: 0,
    additionalData: {
      previousStatus: sessionStatus,
      previousPaymentStatus: paymentStatus,
      newPaymentStatus: paymentCancelResult.success ? (isPayPal ? 'voided' : 'cancelled') : paymentStatus,
      paymentAgeMinutes,
      sessionAgeMinutes: ageMinutes,
      gateway: isPayPal ? 'paypal' : 'stripe',
      paymentCancelSuccess: paymentCancelResult.success,
      paymentCancelError: paymentCancelResult.error,
      providerId,
      reason: 'payment_authorized_timeout_1h',
    },
  });

  console.log(`   ✅ Session ${sessionId} nettoyée`);
}

export const cleanupOrphanedSessions = scheduler.onSchedule(
  {
    // P0 FIX 2026-02-02: Exécution toutes les heures (pas 1×/jour)
    // Pour réactivité: client remboursé max 2h après paiement si appel jamais démarré
    schedule: '0 * * * *', // Toutes les heures à minute 0
    timeZone: 'Europe/Paris',
    region: 'europe-west3',
    memory: '512MiB', // Plus de mémoire pour les appels API
    timeoutSeconds: 300, // 5 minutes max
    // P0 FIX: Secrets nécessaires pour Stripe, PayPal et Twilio
    // Note: STRIPE_MODE is a defineString (env var), not a secret - don't include it here
    secrets: [
      STRIPE_SECRET_KEY_TEST,
      STRIPE_SECRET_KEY_LIVE,
      PAYPAL_CLIENT_ID,
      PAYPAL_CLIENT_SECRET,
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
    ],
  },
  async () => {
    console.log('\n' + '='.repeat(70));
    console.log('🧹 [CLEANUP] Démarrage nettoyage sessions orphelines et prestataires busy');
    console.log('='.repeat(70));

    const db = admin.firestore();
    const now = Date.now();

    const results = {
      sessionsCleanedCount: 0,
      paymentsRefundedCount: 0,
      providersCleanedCount: 0,
      errorCount: 0,
    };

    // ===================================================================
    // PARTIE 1: Sessions avec paiement AUTORISÉ depuis > 1 heure
    // C'est le cas critique: paiement bloqué mais appel jamais démarré
    // ===================================================================

    console.log('\n📋 PARTIE 1: Sessions avec paiement autorisé > 1 heure');
    console.log('-'.repeat(50));

    try {
      const paymentCutoff = admin.firestore.Timestamp.fromMillis(
        now - THRESHOLDS.PAYMENT_AUTHORIZED_TIMEOUT
      );

      // Requête 1: Sessions avec payment.status = "authorized" et payment.authorizedAt < cutoff
      const authorizedSessions = await db
        .collection('call_sessions')
        .where('payment.status', '==', 'authorized')
        .where('payment.authorizedAt', '<', paymentCutoff)
        .limit(50)
        .get();

      console.log(`Found ${authorizedSessions.size} sessions with authorized payments > 1h`);

      for (const doc of authorizedSessions.docs) {
        try {
          await processOrphanedSession(doc, db, now, results);
        } catch (sessionError) {
          results.errorCount++;
          await logError(`cleanupOrphanedSessions:authorized:${doc.id}`, sessionError);
        }
      }

      // Requête 2: P0 FIX 2026-02-04 - Backup for Stripe payments without authorizedAt field
      // Sessions Stripe created before 2026-02-04 don't have payment.authorizedAt set
      // This query uses metadata.createdAt as fallback to find old authorized payments
      const stripeBackupSessions = await db
        .collection('call_sessions')
        .where('payment.status', '==', 'authorized')
        .where('payment.gateway', '==', 'stripe')
        .where('metadata.createdAt', '<', paymentCutoff)
        .limit(50)
        .get();

      console.log(`Found ${stripeBackupSessions.size} Stripe sessions with authorized payment > 1h (backup for missing authorizedAt)`);

      for (const doc of stripeBackupSessions.docs) {
        try {
          // Skip if already processed by query 1 (has authorizedAt and was already processed)
          const sessionData = doc.data();
          if (sessionData.payment?.authorizedAt) {
            console.log(`   SKIP ${doc.id}: already has authorizedAt (handled by query 1)`);
            continue;
          }
          await processOrphanedSession(doc, db, now, results);
        } catch (sessionError) {
          results.errorCount++;
          await logError(`cleanupOrphanedSessions:stripeBackup:${doc.id}`, sessionError);
        }
      }

      // Requête 3: Backup - Sessions "pending" anciennes (au cas où authorizedAt manque)
      const pendingCutoff = admin.firestore.Timestamp.fromMillis(
        now - THRESHOLDS.SESSION_PENDING_TIMEOUT
      );

      const pendingSessions = await db
        .collection('call_sessions')
        .where('status', '==', 'pending')
        .where('metadata.createdAt', '<', pendingCutoff)
        .limit(50)
        .get();

      console.log(`Found ${pendingSessions.size} pending sessions > 60min (backup query)`);

      for (const doc of pendingSessions.docs) {
        try {
          await processOrphanedSession(doc, db, now, results);
        } catch (sessionError) {
          results.errorCount++;
          await logError(`cleanupOrphanedSessions:pending:${doc.id}`, sessionError);
        }
      }

      // Requête 3: Sessions en "connecting" depuis trop longtemps
      const connectingCutoff = admin.firestore.Timestamp.fromMillis(
        now - THRESHOLDS.SESSION_CONNECTING_TIMEOUT
      );

      const connectingStatuses = ['provider_connecting', 'client_connecting', 'both_connecting'];

      for (const status of connectingStatuses) {
        const connectingSessions = await db
          .collection('call_sessions')
          .where('status', '==', status)
          .where('metadata.createdAt', '<', connectingCutoff)
          .limit(20)
          .get();

        console.log(`Found ${connectingSessions.size} sessions in ${status} > 45min`);

        for (const doc of connectingSessions.docs) {
          try {
            await processOrphanedSession(doc, db, now, results);
          } catch (sessionError) {
            results.errorCount++;
            await logError(`cleanupOrphanedSessions:${status}:${doc.id}`, sessionError);
          }
        }
      }
    } catch (sessionsError) {
      console.error('❌ Erreur nettoyage sessions:', sessionsError);
      await logError('cleanupOrphanedSessions:sessions', sessionsError);
    }

    // ===================================================================
    // PARTIE 2: Prestataires stuck en "busy" sans session active
    // ===================================================================

    console.log('\n📋 PARTIE 2: Prestataires stuck en busy > 2 heures');
    console.log('-'.repeat(50));

    try {
      const busyCutoff = admin.firestore.Timestamp.fromMillis(
        now - THRESHOLDS.PROVIDER_BUSY_TIMEOUT
      );

      // Trouver les prestataires en "busy" depuis trop longtemps
      const busyProviders = await db
        .collection('sos_profiles')
        .where('availability', '==', 'busy')
        .where('busySince', '<', busyCutoff)
        .limit(50)
        .get();

      console.log(`Found ${busyProviders.size} providers busy > 2 hours`);

      for (const doc of busyProviders.docs) {
        try {
          const providerData = doc.data();
          const providerId = doc.id;
          const busyMinutes = providerData.busySince
            ? Math.round((now - providerData.busySince.toMillis()) / 60000)
            : 0;

          console.log(`\n🔍 Évaluation prestataire ${providerId} - busy depuis: ${busyMinutes}min`);

          // Vérifier si le prestataire a une session active
          const currentSessionId = providerData.currentCallSessionId;

          if (currentSessionId) {
            // Vérifier si la session existe et est vraiment active
            const sessionDoc = await db
              .collection('call_sessions')
              .doc(currentSessionId)
              .get();

            if (sessionDoc.exists) {
              const sessionData = sessionDoc.data();
              const sessionStatus = sessionData?.status || '';

              // Vérifier aussi s'il y a une conférence Twilio active
              const conferenceName = sessionData?.conference?.name;
              const hasActiveConference = conferenceName
                ? await hasActiveTwilioConference(conferenceName)
                : false;

              if (ACTIVE_CALL_STATUSES.includes(sessionStatus) || hasActiveConference) {
                console.log(`   ✓ SKIP: Session active (${sessionStatus}) ou conférence Twilio active`);
                continue;
              }
            }
          }

          // Pas de session active, libérer le prestataire
          console.log(`   🔄 Libération du prestataire ${providerId} (pas de session active)`);

          await setProviderAvailable(providerId, 'busy_timeout_cleanup');

          // Log d'audit
          await db.collection('provider_status_logs').add({
            providerId,
            action: 'CLEANUP_BUSY_TIMEOUT',
            previousStatus: 'busy',
            newStatus: 'available',
            busyMinutes,
            sessionId: currentSessionId || null,
            reason: 'busy_timeout_exceeded_2h',
            timestamp: admin.firestore.Timestamp.now(),
          });

          results.providersCleanedCount++;
          console.log(`   ✅ Prestataire ${providerId} remis en available`);
        } catch (providerError) {
          results.errorCount++;
          await logError(`cleanupOrphanedSessions:busyProvider:${doc.id}`, providerError);
        }
      }
    } catch (providersError) {
      console.error('❌ Erreur nettoyage prestataires busy:', providersError);
      await logError('cleanupOrphanedSessions:providers', providersError);
    }

    // ===================================================================
    // RAPPORT FINAL
    // ===================================================================

    console.log('\n' + '='.repeat(70));
    console.log('🧹 [CLEANUP] RAPPORT FINAL');
    console.log('='.repeat(70));
    console.log(`   Sessions nettoyées:    ${results.sessionsCleanedCount}`);
    console.log(`   Paiements remboursés:  ${results.paymentsRefundedCount}`);
    console.log(`   Prestataires libérés:  ${results.providersCleanedCount}`);
    console.log(`   Erreurs:               ${results.errorCount}`);
    console.log('='.repeat(70) + '\n');

    // Créer une alerte admin si des actions ont été prises
    if (results.sessionsCleanedCount > 0 || results.paymentsRefundedCount > 0 || results.providersCleanedCount > 0) {
      await db.collection('admin_alerts').add({
        type: 'cleanup_orphaned_sessions',
        priority: results.paymentsRefundedCount > 0 ? 'high' : 'medium',
        title: '🧹 Nettoyage sessions orphelines',
        message: `Sessions: ${results.sessionsCleanedCount}, Paiements remboursés: ${results.paymentsRefundedCount}, Prestataires libérés: ${results.providersCleanedCount}`,
        results,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log pour monitoring
      await db.collection('system_logs').add({
        type: 'cleanup_orphaned_sessions',
        ...results,
        timestamp: admin.firestore.Timestamp.now(),
      });
    }
  }
);
