// firebase/functions/src/createAndScheduleCallFunction.ts - Version avec planification directe
import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { createCallSession } from './callScheduler';
import { logError } from './utils/logs/logError';
import * as admin from 'firebase-admin';
import { stripeManager } from './StripeManager';
// P0 FIX: Import scheduleCallTaskWithIdempotence pour planifier avec vérification des doublons
import { scheduleCallTaskWithIdempotence } from './lib/tasks';
// Production logger
import { logger as prodLogger } from './utils/productionLogger';
// P0 FIX: Import decryptPhoneNumber for SMS notifications
import { decryptPhoneNumber } from './utils/encryption';
// Import pricing service to calculate provider earnings
import { getServiceAmounts } from './services/pricingService';
// P0 FIX: Import setProviderBusy to reserve provider immediately after payment
// AUDIT FIX: Import setProviderAvailable to release provider on error after reservation
import { setProviderBusy, setProviderAvailable } from './callables/providerStatusManager';
// P0 FIX: Import secrets from centralized secrets.ts - NEVER call defineSecret() here!
import {
  ENCRYPTION_KEY,
  STRIPE_SECRET_KEY_TEST,
  STRIPE_SECRET_KEY_LIVE,
  TASKS_AUTH_SECRET,
  OUTIL_SYNC_API_KEY,
  getOutilIngestEndpoint,
} from './lib/secrets';
// P3 FIX: Import country utils for converting ISO codes to full names
import { getCountryName } from './utils/countryUtils';
import { ALLOWED_ORIGINS } from "./lib/functionConfigs";
import { checkRateLimit, RATE_LIMITS } from "./lib/rateLimiter";

// ✅ Interface corrigée pour correspondre exactement aux données frontend
interface CreateCallRequest {
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  paymentIntentId: string;
  amount: number; // Montant total du paiement
  currency?: 'EUR' | 'USD' | 'eur' | 'usd'; // Devise du paiement
  delayMinutes?: number; // ✅ Garde le champ pour compatibilité mais ne l'utilise plus
  clientLanguages?: string[];
  providerLanguages?: string[];
  clientWhatsapp?: string;
  callSessionId?: string;
  // P0 FIX: Booking form data for SMS notifications
  bookingTitle?: string;
  bookingDescription?: string;
  clientCurrentCountry?: string;
  clientFirstName?: string;
  clientNationality?: string;
}

/**
 * Valide et retourne un numéro de téléphone au format E164
 * @param phone Le numéro de téléphone à valider
 * @param who Indique si c'est le numéro du provider ou du client (pour les messages d'erreur)
 * @returns Le numéro validé
 * @throws Error si le numéro n'est pas valide
 */
export function assertE164(phone: string, who: 'provider' | 'client') {
  if (!/^\+[1-9]\d{8,14}$/.test(phone || '')) throw new Error(`Invalid ${who} phone: ${phone}`);
  return phone;
}

/**
 * Convertit les codes langue ISO en noms complets
 */
const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
  ar: 'العربية',
  hi: 'हिन्दी',
  ch: '中文',
  zh: '中文',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  tr: 'Türkçe',
  ja: '日本語',
  ko: '한국어',
};

function formatLanguages(languages: string[]): string {
  if (!languages || languages.length === 0) return 'Non spécifié';
  return languages
    .map(code => LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase())
    .join(', ');
}

/**
 * Retourne le symbole de devise approprié
 */
function getCurrencySymbol(currency: string): string {
  const currencyLower = currency?.toLowerCase() || 'eur';
  return currencyLower === 'usd' ? '$' : '€';
}

/**
 * Calcule les gains du prestataire (montant total - frais de mise en relation)
 */
async function calculateProviderEarnings(
  serviceType: string,
  currency: 'eur' | 'usd' = 'eur'
): Promise<{ providerEarnings: number; currencySymbol: string }> {
  try {
    // Convert serviceType (lawyer_call/expat_call) to pricing key (lawyer/expat)
    const pricingKey = serviceType === 'lawyer_call' ? 'lawyer' : 'expat';
    const serviceConfig = await getServiceAmounts(pricingKey as 'lawyer' | 'expat', currency);

    return {
      providerEarnings: serviceConfig.providerAmount,
      currencySymbol: getCurrencySymbol(currency),
    };
  } catch (error) {
    console.error('Error calculating provider earnings:', error);
    // Fallback values based on default pricing
    const defaultEarnings = serviceType === 'lawyer_call' ? 30 : 10;
    return {
      providerEarnings: defaultEarnings,
      currencySymbol: '€',
    };
  }
}

/**
 * ✅ Cloud Function RECTIFIÉE - Crée l'appel SANS planification
 * La planification sera gérée par le webhook Stripe à +5 min
 */
export const createAndScheduleCallHTTPS = onCall(
  {
    region: 'europe-west1',
    memory: '256MiB',
    cpu: 0.083,
    maxInstances: 3,
    minInstances: 1,
    concurrency: 1,
    timeoutSeconds: 90, // P1-2 FIX 2026-02-23: 60→90s — 10+ Firestore writes + Cloud Tasks scheduling
    cors: ALLOWED_ORIGINS,
    // Secrets: encryption + Stripe + Cloud Tasks + Outil sync
    secrets: [ENCRYPTION_KEY, STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE, TASKS_AUTH_SECRET, OUTIL_SYNC_API_KEY],
  },
  async (request: CallableRequest<CreateCallRequest>) => {
    const requestId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    prodLogger.info('CALL_SCHEDULE_START', `[${requestId}] Creating and scheduling call`, {
      requestId,
      providerId: request.data?.providerId,
      clientId: request.data?.clientId,
      serviceType: request.data?.serviceType,
      paymentIntentId: request.data?.paymentIntentId,
      callSessionId: request.data?.callSessionId,
      amount: request.data?.amount,
    });

    // AUDIT FIX: Track if provider was marked busy, to release on error
    let providerMarkedBusy = false;
    let reservedProviderId: string | null = null;

    try {
      // ========================================
      // 1. VALIDATION DE L'AUTHENTIFICATION
      // ========================================
      if (!request.auth) {
        prodLogger.error('CALL_SCHEDULE_AUTH_ERROR', `[${requestId}] Authentication missing`, { requestId });
        console.error(`❌ [${requestId}] Authentification manquante`);
        throw new HttpsError(
          'unauthenticated',
          'Authentification requise pour créer un appel.'
        );
      }

      const userId = request.auth.uid;
      console.log(`✅ [${requestId}] Utilisateur authentifié: ${userId.substring(0, 8)}...`);

      await checkRateLimit(userId, "createAndScheduleCall", RATE_LIMITS.CREATE_CALL);

      // ========================================
      // 2. VALIDATION DES DONNÉES DÉTAILLÉE
      // ========================================
      console.log(`🔍 [${requestId}] Données reçues:`, {
        providerId: request.data?.providerId ? request.data.providerId.substring(0, 8) + '...' : 'MANQUANT',
        clientId: request.data?.clientId ? request.data.clientId.substring(0, 8) + '...' : 'MANQUANT',
        providerPhone: request.data?.providerPhone ? '✅ Fourni' : '❌ MANQUANT',
        clientPhone: request.data?.clientPhone ? '✅ Fourni' : '❌ MANQUANT',
        serviceType: request.data?.serviceType || 'MANQUANT',
        providerType: request.data?.providerType || 'MANQUANT',
        paymentIntentId: request.data?.paymentIntentId ? '✅ Fourni' : '❌ MANQUANT',
        amount: request.data?.amount || 'MANQUANT',
        clientWhatsapp: request.data?.clientWhatsapp ? '✅ Fourni' : 'Non fourni (optionnel)',
        delayMinutes: request.data?.delayMinutes || 5
      });

      const {
        providerId,
        clientId,
        providerPhone,
        clientPhone,
        serviceType,
        providerType,
        paymentIntentId,
        amount,
        currency: requestCurrency, // Devise du paiement (EUR ou USD)
        callSessionId,
        delayMinutes = 5, // ✅ Garde pour compatibilité mais ne sera plus utilisé
        clientLanguages,
        providerLanguages,
        clientWhatsapp,
        // P0 FIX: Booking form data for SMS notifications
        bookingTitle,
        bookingDescription,
        clientCurrentCountry,
        clientFirstName,
        clientNationality} = request.data;

      // Normaliser la devise (eur ou usd, minuscule)
      const currency = (requestCurrency?.toLowerCase() || 'eur') as 'eur' | 'usd';

      // ✅ Évite l'avertissement TypeScript 6133 (variable assigned but never used)
      void delayMinutes;

      // ✅ VALIDATION CHAMP PAR CHAMP avec messages d'erreur spécifiques
      const missingFields = [];

      if (!providerId) {
        missingFields.push('providerId');
      }
      if (!clientId) {
        missingFields.push('clientId');
      }
      if (!providerPhone) {
        missingFields.push('providerPhone');
      }
      if (!clientPhone) {
        missingFields.push('clientPhone');
      }
      if (!serviceType) {
        missingFields.push('serviceType');
      }
      if (!providerType) {
        missingFields.push('providerType');
      }
      if (!paymentIntentId) {
        missingFields.push('paymentIntentId');
      }
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        missingFields.push('amount (doit être un nombre positif)');
      }

      if (missingFields.length > 0) {
        console.error(`❌ [${requestId}] Champs manquants:`, missingFields);
        throw new HttpsError(
          'invalid-argument',
          `Données requises manquantes pour créer l'appel: ${missingFields.join(', ')}`
        );
      }

      console.log(`✅ [${requestId}] Tous les champs requis sont présents`);

      // ========================================
      // 3. VALIDATION DES PERMISSIONS
      // ========================================
      if (userId !== clientId) {
        console.error(`❌ [${requestId}] Permission refusée: userId=${userId.substring(0, 8)}... != clientId=${clientId.substring(0, 8)}...`);
        throw new HttpsError(
          'permission-denied',
          'Vous ne pouvez créer un appel que pour votre propre compte.'
        );
      }

      console.log(`✅ [${requestId}] Permissions validées`);

      // ========================================
      // 3.5 P2-3 FIX: VALIDATION CLIENT/PROVIDER EXIST
      // 🚀 PERF: Lectures parallèles (gain ~100-200ms)
      // ========================================
      const db = admin.firestore();

      // Paralléliser les lectures provider et client
      const [providerDoc, clientDoc] = await Promise.all([
        db.collection('sos_profiles').doc(providerId).get(),
        db.collection('users').doc(clientId).get(),
      ]);

      // Valider provider
      if (!providerDoc.exists) {
        console.error(`❌ [${requestId}] Provider not found: ${providerId.substring(0, 8)}...`);
        throw new HttpsError(
          'not-found',
          'Le prestataire sélectionné n\'existe pas ou n\'est plus disponible.'
        );
      }
      const providerData = providerDoc.data();
      if (!providerData?.isActive || providerData?.status === 'banned') {
        console.error(`❌ [${requestId}] Provider inactive or banned: ${providerId.substring(0, 8)}...`);
        throw new HttpsError(
          'failed-precondition',
          'Le prestataire sélectionné n\'est pas disponible actuellement.'
        );
      }
      // m2 AUDIT FIX: Check provider online/availability status before scheduling call
      // P0 FIX: Only reject for offline status here. The 'busy' check is handled atomically
      // by setProviderBusy() via Firestore transaction (prevents race conditions).
      // Previously, this pre-check rejected 'busy' providers which caused false rejections
      // when the same client's booking flow had already reserved the provider.
      if (providerData?.isOnline === false) {
        console.error(`❌ [${requestId}] Provider is offline: ${providerId.substring(0, 8)}...`);
        throw new HttpsError(
          'failed-precondition',
          'Le prestataire n\'est pas disponible actuellement. Veuillez réessayer plus tard.'
        );
      }
      if (providerData?.availability === 'offline') {
        console.error(`❌ [${requestId}] Provider unavailable (offline): ${providerId.substring(0, 8)}...`);
        throw new HttpsError(
          'failed-precondition',
          'Le prestataire est actuellement hors ligne.'
        );
      }
      if (providerData?.availability === 'busy') {
        // Log but don't reject — setProviderBusy() transaction handles this atomically
        console.warn(`⚠️ [${requestId}] Provider appears busy (${providerData.busyReason || 'unknown'}), deferring to atomic reservation`);
      }
      console.log(`✅ [${requestId}] Provider exists and is active`);

      // Valider client
      if (!clientDoc.exists) {
        console.error(`❌ [${requestId}] Client not found: ${clientId.substring(0, 8)}...`);
        throw new HttpsError(
          'not-found',
          'Votre compte utilisateur est introuvable.'
        );
      }
      console.log(`✅ [${requestId}] Client exists`);

      // ========================================
      // 4. VALIDATION DES TYPES DE SERVICE
      // ========================================
      const allowedServiceTypes = ['lawyer_call', 'expat_call'];
      const allowedProviderTypes = ['lawyer', 'expat'];

      if (!allowedServiceTypes.includes(serviceType)) {
        console.error(`❌ [${requestId}] Type de service invalide:`, serviceType);
        throw new HttpsError(
          'invalid-argument',
          `Type de service invalide. Types autorisés: ${allowedServiceTypes.join(', ')}`
        );
      }

      if (!allowedProviderTypes.includes(providerType)) {
        console.error(`❌ [${requestId}] Type de prestataire invalide:`, providerType);
        throw new HttpsError(
          'invalid-argument',
          `Type de prestataire invalide. Types autorisés: ${allowedProviderTypes.join(', ')}`
        );
      }

      console.log(`✅ [${requestId}] Types de service validés`);

      // ========================================
      // 5. VALIDATION DES MONTANTS EN EUROS
      // ========================================
      if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        console.error(`❌ [${requestId}] Montant invalide:`, { amount, type: typeof amount });
        throw new HttpsError(
          'invalid-argument',
          `Montant invalide: ${amount} (type: ${typeof amount})`
        );
      }

      if (amount > 500) {
        console.error(`❌ [${requestId}] Montant trop élevé:`, amount);
        throw new HttpsError(
          'invalid-argument',
          'Montant maximum de 500€ dépassé.'
        );
      }

      if (amount < 0.50) {
        console.error(`❌ [${requestId}] Montant trop faible:`, amount);
        throw new HttpsError(
          'invalid-argument',
          'Montant minimum de 0.50€ requis.'
        );
      }

      // ✅ Validation cohérence montant/service avec tolérance élargie
      const expectedAmountEuros = serviceType === 'lawyer_call' ? 49 : 19;
      const tolerance = 15; // 15€ de tolérance
      
      if (Math.abs(amount - expectedAmountEuros) > tolerance) {
        console.warn(`⚠️ [${requestId}] Montant inhabituel: reçu ${amount}€, attendu ${expectedAmountEuros}€ pour ${serviceType}`);
        // ✅ Ne pas bloquer, juste logger pour audit
      }

      console.log(`✅ [${requestId}] Montant validé: ${amount}€`);

      // ========================================
      // 6. VALIDATION DES NUMÉROS DE TÉLÉPHONE AVEC assertE164
      // ========================================
      try {
        // Utilisation de la nouvelle fonction assertE164 pour valider les numéros
        const validatedProviderPhone = assertE164(providerPhone, 'provider');
        const validatedClientPhone = assertE164(clientPhone, 'client');

        if (validatedProviderPhone === validatedClientPhone) {
          console.error(`❌ [${requestId}] Numéros identiques:`, { providerPhone: validatedProviderPhone, clientPhone: validatedClientPhone });
          throw new HttpsError(
            'invalid-argument',
            'Les numéros du prestataire et du client doivent être différents.'
          );
        }

        console.log(`✅ [${requestId}] Numéros de téléphone validés avec assertE164`);
      } catch (phoneError) {
        console.error(`❌ [${requestId}] Erreur validation numéro:`, phoneError);
        throw new HttpsError(
          'invalid-argument',
          phoneError instanceof Error ? phoneError.message : 'Numéro de téléphone invalide. Format requis: +33XXXXXXXXX'
        );
      }

      // ========================================
      // 7. VALIDATION DU PAYMENT INTENT (format + vérification Stripe)
      // ========================================
      if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
        console.error(`❌ [${requestId}] PaymentIntent ID invalide:`, paymentIntentId);
        throw new HttpsError(
          'invalid-argument',
          'PaymentIntent ID invalide ou manquant.'
        );
      }

      // P0-3 AUDIT FIX: Verify PaymentIntent exists in Stripe and matches expected amount
      // Without this check, an attacker could send a fabricated paymentIntentId and get a free call
      try {
        const pi = await stripeManager.retrievePaymentIntent(paymentIntentId);
        const piStatus = pi.status;
        const piAmount = pi.amount; // in cents

        // Payment must be authorized (succeeded or requires_capture)
        if (!['succeeded', 'requires_capture', 'processing'].includes(piStatus)) {
          console.error(`❌ [${requestId}] PaymentIntent not authorized: status=${piStatus}`);
          throw new HttpsError(
            'failed-precondition',
            'Le paiement n\'a pas été autorisé. Veuillez réessayer.'
          );
        }

        // Verify amount matches (convert amount from euros to cents for comparison)
        const expectedCents = Math.round(amount * 100);
        if (Math.abs(piAmount - expectedCents) > 100) { // 1€ tolerance for rounding
          console.error(`❌ [${requestId}] PaymentIntent amount mismatch: stripe=${piAmount} vs expected=${expectedCents}`);
          throw new HttpsError(
            'invalid-argument',
            'Le montant du paiement ne correspond pas.'
          );
        }

        console.log(`✅ [${requestId}] PaymentIntent vérifié via Stripe: status=${piStatus}, amount=${piAmount}`);
      } catch (stripeError) {
        if (stripeError instanceof HttpsError) throw stripeError;
        console.error(`❌ [${requestId}] Stripe PaymentIntent verification failed:`, stripeError);
        throw new HttpsError(
          'failed-precondition',
          'Impossible de vérifier le paiement. Veuillez réessayer.'
        );
      }

      // ========================================
      // 8. RÉSERVER LE PROVIDER (ATOMIQUE — ANTI DOUBLE-BOOKING)
      // ========================================
      // P1-1 FIX: setProviderBusy AVANT createCallSession pour éliminer la race condition.
      // La transaction Firestore dans setProviderBusy garantit qu'un seul booking
      // peut réserver le provider à la fois. Si le provider est déjà busy,
      // on refuse le booking AVANT de créer la session ou planifier l'appel.
      // Générer un callSessionId si non fourni par le frontend
      const effectiveCallSessionId = callSessionId || admin.firestore().collection('call_sessions').doc().id;
      console.log(`🔶 [${requestId}] Réservation atomique du provider ${providerId}...`);
      const busyResult = await setProviderBusy(providerId, effectiveCallSessionId, 'pending_call');

      if (!busyResult.success) {
        console.error(`❌ [${requestId}] Cannot reserve provider: ${busyResult.error}`);
        throw new HttpsError(
          'failed-precondition',
          'Le prestataire n\'est pas disponible actuellement. Veuillez réessayer.'
        );
      }

      if (busyResult.message === 'Provider already busy') {
        console.error(`❌ [${requestId}] Provider already busy for another call`);
        throw new HttpsError(
          'failed-precondition',
          'Le prestataire est actuellement en appel. Veuillez réessayer dans quelques minutes.'
        );
      }

      console.log(`✅ [${requestId}] Provider ${providerId} réservé (pending_call)`);
      // AUDIT FIX: Track successful reservation for cleanup on error
      providerMarkedBusy = true;
      reservedProviderId = providerId;

      // ========================================
      // 8.1 CRÉATION DE LA SESSION D'APPEL
      // ========================================
      console.log(`📞 [${requestId}] Création session d'appel initiée`);
      console.log(`👥 [${requestId}] Client: ${clientId.substring(0, 8)}... → Provider: ${providerId.substring(0, 8)}...`);
      console.log(`💰 [${requestId}] Montant: ${amount}€ pour service ${serviceType}`);
      console.log(`💳 [${requestId}] PaymentIntent: ${paymentIntentId}`);

      const callSession = await createCallSession({
        providerId,
        clientId,
        providerPhone,
        clientPhone,
        sessionId: effectiveCallSessionId,
        clientWhatsapp: clientWhatsapp || clientPhone,
        serviceType,
        providerType,
        paymentIntentId,
        amount,
        requestId,
        clientLanguages: clientLanguages || ['fr'],
        providerLanguages: providerLanguages || ['fr'],
        providerCountry: providerData?.country || '',
      });

      console.log(`✅ [${requestId}] Session d'appel créée avec succès - ID: ${callSession.id}`);

      // ========================================
      // 9. ÉCRITURE VERS LA COLLECTION PAYMENTS
      // ========================================
      try {
        console.log(`💾 [${requestId}] Écriture vers collection payments - PaymentIntent: ${paymentIntentId}`);
        
        await admin.firestore()
          .collection('payments')
          .doc(paymentIntentId) // l'ID du PaymentIntent passé par le front
          .set({ 
            callSessionId: callSession.id, 
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            // Ajout d'informations contextuelles utiles
            amount: amount,
            serviceType: serviceType,
            clientId: clientId,
            providerId: providerId,
            status: 'call_session_created',
            requestId: requestId
          }, { merge: true });

        console.log(`✅ [${requestId}] Écriture payments réussie - Lien créé: ${paymentIntentId} → ${callSession.id}`);
      } catch (paymentsError) {
        console.error(`❌ [${requestId}] Erreur écriture payments:`, paymentsError);
        // On ne fait pas échouer la fonction pour autant, juste un warning
        console.warn(`⚠️ [${requestId}] Session créée mais lien payments échoué - webhook pourra toujours fonctionner`);
      }

      // ========================================
      // 9. PLANIFICATION DE L'APPEL VIA CLOUD TASKS
      // ========================================
      // P0 FIX: Planifier l'appel ICI (pas via webhook) car avec capture_method=manual,
      // l'événement payment_intent.succeeded n'arrive qu'APRÈS capture (trop tard!)
      const CALL_DELAY_SECONDS = 240; // 4 minutes

      console.log(`\n`);
      console.log(`=======================================================================`);
      console.log(`📅 [createAndScheduleCall][${requestId}] ========== CLOUD TASKS SCHEDULING ==========`);
      console.log(`=======================================================================`);
      console.log(`📅 [${requestId}] CallSessionId: ${callSession.id}`);
      console.log(`📅 [${requestId}] Session status: ${callSession.status}`);
      console.log(`📅 [${requestId}] Delay: ${CALL_DELAY_SECONDS}s (${CALL_DELAY_SECONDS/60} minutes)`);
      console.log(`📅 [${requestId}] PaymentIntentId: ${paymentIntentId}`);
      console.log(`📅 [${requestId}] ProviderId: ${providerId}`);
      console.log(`📅 [${requestId}] ClientId: ${clientId}`);
      console.log(`📅 [${requestId}] ServiceType: ${serviceType}`);
      console.log(`📅 [${requestId}] Timestamp: ${new Date().toISOString()}`);

      try {
        console.log(`\n📅 [${requestId}] Calling scheduleCallTaskWithIdempotence...`);
        // Utiliser la version avec idempotence pour éviter les doublons
        const schedulingResult = await scheduleCallTaskWithIdempotence(
          callSession.id,
          CALL_DELAY_SECONDS,
          admin.firestore()
        );

        if (schedulingResult.skipped) {
          console.log(`⚠️ [${requestId}] Scheduling SKIPPED!`);
          console.log(`⚠️ [${requestId}] Reason: ${schedulingResult.reason}`);
          console.log(`⚠️ [${requestId}] Existing taskId: ${schedulingResult.taskId || 'none'}`);
        } else {
          console.log(`\n=======================================================================`);
          console.log(`✅ [createAndScheduleCall][${requestId}] ========== SCHEDULING SUCCESS ==========`);
          console.log(`✅ [${requestId}] Cloud Task ID: ${schedulingResult.taskId}`);
          console.log(`✅ [${requestId}] Call will trigger at: ${new Date(Date.now() + CALL_DELAY_SECONDS * 1000).toISOString()}`);
          console.log(`=======================================================================\n`);
        }
      } catch (scheduleError) {
        console.error(`❌ [${requestId}] Erreur planification Cloud Task:`, scheduleError);
        // CRITICAL: scheduling failure = call will never happen, throw to fail the function
        // The payment is only authorized (capture_method=manual), not captured yet
        throw new HttpsError(
          'internal',
          'Erreur lors de la planification de l\'appel. Veuillez réessayer.',
          { requestId, scheduleError: String(scheduleError) }
        );
      }

      // ========================================
      // 10. P0 FIX: ENVOI DES NOTIFICATIONS SMS + SYNC OUTIL
      // ========================================
      // CRITICAL: Ce code était auparavant dans stripeWebhook.payment_intent.succeeded
      // Mais avec capture_method=manual, cet événement ne se déclenche JAMAIS
      // (il ne se déclenche qu'après capture, qui arrive APRÈS l'appel terminé)
      console.log(`\n`);
      console.log(`=======================================================================`);
      console.log(`📨 [createAndScheduleCall][${requestId}] ========== NOTIFICATIONS ==========`);
      console.log(`=======================================================================`);
      console.log(`📨 [${requestId}] STEP N1: Starting notification flow...`);
      console.log(`📨 [${requestId}]   - callSessionId: ${callSession.id}`);
      console.log(`📨 [${requestId}]   - providerId: ${providerId}`);
      console.log(`📨 [${requestId}]   - clientId: ${clientId}`);
      console.log(`📨 [${requestId}]   - serviceType: ${serviceType}`);

      try {
        // Get client and provider data for notifications
        console.log(`📨 [${requestId}] STEP N2: Fetching client/provider data...`);
        const clientData = clientDoc.data();
        const providerDocData = providerData; // Already fetched earlier
        console.log(`📨 [${requestId}]   - clientData: ${clientData ? 'EXISTS' : 'NULL'}`);
        console.log(`📨 [${requestId}]   - providerDocData: ${providerDocData ? 'EXISTS' : 'NULL'}`);
        console.log(`📨 [${requestId}]   - clientData.country: ${clientData?.country || 'NOT_SET'}`);
        console.log(`📨 [${requestId}]   - clientData.firstName: ${clientData?.firstName || 'NOT_SET'}`);
        console.log(`📨 [${requestId}]   - clientData.displayName: ${clientData?.displayName || 'NOT_SET'}`);

        // Decrypt phone numbers (they may be encrypted for GDPR)
        console.log(`📨 [${requestId}] STEP N3: Decrypting phone numbers...`);
        console.log(`📨 [${requestId}]   - providerPhone raw: ${providerPhone ? providerPhone.substring(0, 10) + '...' : 'NULL'}`);
        console.log(`📨 [${requestId}]   - clientPhone raw: ${clientPhone ? clientPhone.substring(0, 10) + '...' : 'NULL'}`);
        console.log(`📨 [${requestId}]   - providerPhone encrypted? ${providerPhone?.startsWith('enc:') || false}`);
        console.log(`📨 [${requestId}]   - clientPhone encrypted? ${clientPhone?.startsWith('enc:') || false}`);

        let decryptedProviderPhone = providerPhone;
        let decryptedClientPhone = clientPhone;

        try {
          if (providerPhone.startsWith('enc:')) {
            decryptedProviderPhone = decryptPhoneNumber(providerPhone);
            console.log(`📨 [${requestId}]   ✅ Provider phone decrypted: ${decryptedProviderPhone.slice(0, 5)}***`);
          } else {
            console.log(`📨 [${requestId}]   ℹ️ Provider phone not encrypted, using as-is`);
          }
          if (clientPhone.startsWith('enc:')) {
            decryptedClientPhone = decryptPhoneNumber(clientPhone);
            console.log(`📨 [${requestId}]   ✅ Client phone decrypted: ${decryptedClientPhone.slice(0, 5)}***`);
          } else {
            console.log(`📨 [${requestId}]   ℹ️ Client phone not encrypted, using as-is`);
          }
        } catch (decryptError) {
          console.warn(`⚠️ [${requestId}] Phone decryption failed, using original:`, decryptError);
          console.warn(`⚠️ [${requestId}]   Error type: ${decryptError?.constructor?.name}`);
          console.warn(`⚠️ [${requestId}]   Error message: ${decryptError instanceof Error ? decryptError.message : String(decryptError)}`);
        }

        console.log(`📨 [${requestId}] STEP N4: Building notification context...`);
        const scheduledTime = new Date(Date.now() + CALL_DELAY_SECONDS * 1000);
        const language = clientLanguages?.[0] || 'fr';
        const clientName = clientData?.displayName || clientData?.firstName || 'Client';
        const providerName = providerDocData?.displayName || providerDocData?.firstName || 'Expert';
        const clientEmail = clientData?.email || '';
        const providerEmail = providerDocData?.email || '';
        // P0 FIX: Use actual booking form data for SMS notifications instead of hardcoded values
        const title = bookingTitle || (serviceType === 'lawyer_call' ? 'Consultation avocat' : 'Consultation expat');
        const description = bookingDescription || `${title} - ${serviceType}`;
        // FIX: Use CLIENT's selected intervention country first (what they typed in "Où avez-vous besoin d'aide?")
        // clientCurrentCountry IS the intervention country selected in the booking form — NOT the client's residence
        // Provider's country is a fallback only when the client didn't fill the field
        // P3 FIX: Convert ISO code to full country name for SMS readability and IA sync consistency
        const rawInterventionCountry = clientCurrentCountry || providerDocData?.country || 'N/A';
        const interventionCountry = getCountryName(rawInterventionCountry) || rawInterventionCountry;
        const clientDisplayName = clientFirstName || clientData?.firstName || clientName;

        console.log(`📨 [${requestId}]   - scheduledTime: ${scheduledTime.toISOString()}`);
        console.log(`📨 [${requestId}]   - language: ${language}`);
        console.log(`📨 [${requestId}]   - clientName: ${clientName}`);
        console.log(`📨 [${requestId}]   - clientCountry: ${clientData?.country || 'N/A'}`);
        console.log(`📨 [${requestId}]   - providerName: ${providerName}`);
        console.log(`📨 [${requestId}]   - clientEmail: ${clientEmail ? clientEmail.substring(0, 5) + '***' : 'NOT_SET'}`);
        console.log(`📨 [${requestId}]   - providerEmail: ${providerEmail ? providerEmail.substring(0, 5) + '***' : 'NOT_SET'}`);
        console.log(`📨 [${requestId}]   - title: ${title}`);

        // Create message_events for client
        console.log(`📨 [${requestId}] STEP N5: Creating CLIENT message_event...`);
        console.log(`📨 [${requestId}]   - clientId: ${clientId || 'NOT_SET'}`);
        console.log(`📨 [${requestId}]   - clientEmail: ${clientEmail ? 'SET' : 'NOT_SET'}`);
        console.log(`📨 [${requestId}]   - Will create event? ${!!(clientId || clientEmail)}`);

        // FIX: Isolated try-catch — client notification failure must NOT block provider SMS
        try {
          if (clientId || clientEmail) {
            const clientEventData = {
              eventId: 'call.scheduled.client',
              locale: language,
              to: {
                uid: clientId || null,
                email: clientEmail || null,
                phone: decryptedClientPhone || null,
              },
              context: {
                callSessionId: callSession.id,
                title,
                scheduledTime: scheduledTime.toISOString(),
                providerName,
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            console.log(`📨 [${requestId}]   Client event data prepared:`);
            console.log(`📨 [${requestId}]     - eventId: ${clientEventData.eventId}`);
            console.log(`📨 [${requestId}]     - locale: ${clientEventData.locale}`);
            console.log(`📨 [${requestId}]     - to.uid: ${clientEventData.to.uid}`);
            console.log(`📨 [${requestId}]     - to.phone: ${clientEventData.to.phone ? clientEventData.to.phone.substring(0, 5) + '***' : 'NULL'}`);
            console.log(`📨 [${requestId}]     - context.title: ${clientEventData.context.title}`);
            console.log(`📨 [${requestId}]   Writing to Firestore message_events...`);

            const clientEventRef = await db.collection('message_events').add(clientEventData);
            console.log(`✅ [${requestId}] CLIENT notification created: ${clientEventRef.id}`);
            console.log(`✅ [${requestId}]   → NOTE: inapp=true only (no SMS/email/push for client)`);
          } else {
            console.log(`⚠️ [${requestId}] SKIPPING client notification - no clientId or email`);
          }
        } catch (clientNotifError) {
          console.error(`⚠️ [${requestId}] CLIENT notification failed (non-blocking - provider SMS will still be sent):`, clientNotifError);
        }

        // Create message_events for provider - ONLY SMS with booking details
        console.log(`📨 [${requestId}] STEP N6: Creating PROVIDER message_event (SMS enabled)...`);
        console.log(`📨 [${requestId}]   - providerId: ${providerId || 'NOT_SET'}`);
        console.log(`📨 [${requestId}]   - providerEmail: ${providerEmail ? 'SET' : 'NOT_SET'}`);
        console.log(`📨 [${requestId}]   - decryptedProviderPhone: ${decryptedProviderPhone ? decryptedProviderPhone.substring(0, 5) + '***' : 'NOT_SET'}`);
        console.log(`📨 [${requestId}]   - Will create event? ${!!(providerId || providerEmail)}`);

        // Calculate provider earnings for SMS - use actual currency from payment
        const { providerEarnings, currencySymbol } = await calculateProviderEarnings(serviceType, currency);
        console.log(`📨 [${requestId}]   - providerEarnings: ${providerEarnings}${currencySymbol} (currency: ${currency.toUpperCase()})`);

        if (providerId || providerEmail) {
          // P0 FIX: Use booking_paid_provider template which has SMS enabled
          // Template variables: {{client.firstName}}, {{request.country}}, {{request.title}},
          //                     {{request.description}}, {{booking.amount}}, {{booking.currency}}
          const providerEventData = {
            eventId: 'booking_paid_provider',  // Changed from call.scheduled.provider (sms:false) to booking_paid_provider (sms:true)
            locale: language,
            to: {
              uid: providerId || null,
              email: providerEmail || null,
              phone: decryptedProviderPhone || null,
            },
            context: {
              callSessionId: callSession.id,
              // Structured context to match SMS template variables
              client: {
                firstName: clientDisplayName,
                name: clientDisplayName,
                nationality: clientNationality || 'N/A',
              },
              request: {
                country: interventionCountry,
                title: title,
                description: description,
              },
              booking: {
                amount: amount || 0,
                currency: currency.toUpperCase(),  // Actual currency from payment (EUR or USD)
              },
              // Provider earnings info for SMS
              earnings: {
                amount: providerEarnings,
                symbol: currencySymbol,
                formatted: `${providerEarnings}${currencySymbol}`,
              },
              // Legacy flat fields for inapp compatibility
              clientName: clientDisplayName,
              clientCountry: interventionCountry,
              clientLanguage: language,
              clientLanguages: clientLanguages || [language],
              clientLanguagesFormatted: formatLanguages(clientLanguages || [language]),
              providerEarnings,
              currencySymbol,
              title,
              description,
              scheduledTime: scheduledTime.toISOString(),
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          console.log(`📨 [${requestId}]   Provider event data prepared (with booking details):`);
          console.log(`📨 [${requestId}]     - eventId: ${providerEventData.eventId} (SMS ENABLED)`);
          console.log(`📨 [${requestId}]     - locale: ${providerEventData.locale}`);
          console.log(`📨 [${requestId}]     - to.uid: ${providerEventData.to.uid}`);
          console.log(`📨 [${requestId}]     - to.phone: ${providerEventData.to.phone ? providerEventData.to.phone.substring(0, 5) + '***' : 'NULL'}`);
          console.log(`📨 [${requestId}]     - context.client.firstName: ${providerEventData.context.client.firstName} (from booking form: ${!!clientFirstName})`);
          console.log(`📨 [${requestId}]     - context.client.nationality: ${providerEventData.context.client.nationality} (from booking form: ${!!clientNationality})`);
          console.log(`📨 [${requestId}]     - context.request.country: ${providerEventData.context.request.country} (from booking form: ${!!clientCurrentCountry})`);
          console.log(`📨 [${requestId}]     - context.request.title: ${providerEventData.context.request.title} (from booking form: ${!!bookingTitle})`);
          console.log(`📨 [${requestId}]     - context.request.description: ${providerEventData.context.request.description} (from booking form: ${!!bookingDescription})`);
          console.log(`📨 [${requestId}]     - context.clientLanguages: ${JSON.stringify(providerEventData.context.clientLanguages)}`);
          console.log(`📨 [${requestId}]     - context.booking.amount: ${providerEventData.context.booking.amount}`);
          console.log(`📨 [${requestId}]     - context.booking.currency: ${providerEventData.context.booking.currency}`);
          console.log(`📨 [${requestId}]   Writing to Firestore message_events...`);

          const providerEventRef = await db.collection('message_events').add(providerEventData);
          console.log(`✅ [${requestId}] PROVIDER notification created: ${providerEventRef.id}`);
          console.log(`✅ [${requestId}]   → SMS will be sent: "Client: ${providerEventData.context.client.firstName} (${providerEventData.context.request.country}) - ${providerEventData.context.booking.amount}${providerEventData.context.booking.currency}"`);
          console.log(`✅ [${requestId}]   → Inapp notification will also appear in dashboard`);
        } else {
          console.log(`⚠️ [${requestId}] SKIPPING provider notification - no providerId or email`);
        }

        // Sync to Outil-sos-expat (non-blocking)
        console.log(`📨 [${requestId}] Syncing to Outil IA...`);
        // P0 FIX: Trim secret value to remove trailing CRLF
        const outilApiKey = OUTIL_SYNC_API_KEY.value().trim();
        if (outilApiKey) {
          const OUTIL_INGEST_ENDPOINT = getOutilIngestEndpoint();

          // Fetch provider AI access info from users/{providerId}
          let providerForcedAIAccess = false;
          let providerFreeTrialUntil: string | null = null;
          let providerSubscriptionStatus: string | undefined;
          let providerHasActiveSubscription = false;
          try {
            const providerUserDoc = await db.collection('users').doc(providerId).get();
            if (providerUserDoc.exists) {
              const providerUserData = providerUserDoc.data();
              // AAA profiles (test/demo accounts) always get AI access after payment
              const isAAA = providerId.startsWith('aaa_') || providerUserData?.isAAA === true;
              providerForcedAIAccess = isAAA || providerUserData?.forcedAIAccess === true;
              providerFreeTrialUntil = providerUserData?.freeTrialUntil?.toDate?.()?.toISOString() || null;
              providerSubscriptionStatus = providerUserData?.subscriptionStatus;
              providerHasActiveSubscription = providerUserData?.hasActiveSubscription === true;
              console.log(`🔑 [${requestId}] Provider AI access info: isAAA=${isAAA}, forcedAIAccess=${providerForcedAIAccess}, subscriptionStatus=${providerSubscriptionStatus}`);
            } else {
              // AAA profiles without a user doc still get AI access
              if (providerId.startsWith('aaa_')) {
                providerForcedAIAccess = true;
                console.log(`🔑 [${requestId}] AAA provider without user doc — forcing AI access`);
              }
            }
          } catch (accessError) {
            console.warn(`⚠️ [${requestId}] Failed to get provider AI access info:`, accessError);
          }

          // P0 FIX: Use real booking form data instead of defaults
          const outilPayload = {
            clientFirstName: clientDisplayName,
            clientLastName: clientData?.lastName || '',
            clientName: clientDisplayName,
            clientEmail: clientEmail,
            clientPhone: decryptedClientPhone,
            clientWhatsapp: clientWhatsapp || decryptedClientPhone,  // Required by schema
            clientCurrentCountry: interventionCountry,
            clientNationality: clientNationality || '',
            clientLanguages: clientLanguages || [language],
            title,
            description,
            serviceType,
            priority: 'medium',  // Must be: low, medium, high, urgent, critical
            providerId,
            providerType,
            providerName,
            providerCountry: providerDocData?.country || '',
            providerEmail,
            // Provider AI access info for Outil to decide whether to generate AI response
            forcedAIAccess: providerForcedAIAccess,
            freeTrialUntil: providerFreeTrialUntil,
            subscriptionStatus: providerSubscriptionStatus,
            hasActiveSubscription: providerHasActiveSubscription,
            source: 'sos-expat-app',
            externalId: callSession.id,
            metadata: {
              clientId,
              sosBookingId: callSession.id,
              providerEmail,
              providerPhone: decryptedProviderPhone,
              providerLanguages: providerLanguages || ['fr'],
              originalServiceType: serviceType,
              paymentIntentId,
              amount,
              createdAt: new Date().toISOString(),
              // P0 FIX: Include booking form data for audit
              bookingTitle,
              bookingDescription,
              clientCurrentCountry,
              clientNationality,
            },
          };

          // Non-blocking fetch with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          try {
            const response = await fetch(OUTIL_INGEST_ENDPOINT, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': outilApiKey,
              },
              body: JSON.stringify(outilPayload),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              const result = await response.json() as { bookingId?: string };
              console.log(`✅ [${requestId}] Outil sync successful - bookingId: ${result.bookingId}`);
            } else {
              console.warn(`⚠️ [${requestId}] Outil sync failed: HTTP ${response.status}`);
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              console.warn(`⚠️ [${requestId}] Outil sync timeout after 10s`);
            } else {
              console.warn(`⚠️ [${requestId}] Outil sync error:`, fetchError);
            }
          }
        } else {
          console.warn(`⚠️ [${requestId}] OUTIL_SYNC_API_KEY not configured - skipping sync`);
        }

        console.log(`✅ [${requestId}] Notifications and sync completed`);
        console.log(`=======================================================================\n`);

      } catch (notifError) {
        // Non-blocking: notifications are not critical
        console.error(`⚠️ [${requestId}] Notification error (non-critical):`, notifError);
      }

      // Calculer l'heure de programmation
      const theoreticalScheduledTime = new Date(Date.now() + (CALL_DELAY_SECONDS * 1000));

      // ========================================
      // 10. RÉPONSE DE SUCCÈS
      // ========================================
      const response = {
        success: true,
        sessionId: callSession.id,
        callSessionId: callSession.id,
        status: callSession.status,
        scheduledFor: theoreticalScheduledTime.toISOString(), // ✅ Théorique - sera confirmé par webhook
        scheduledForReadable: theoreticalScheduledTime.toLocaleString('fr-FR', {
          timeZone: 'Europe/Paris',
          dateStyle: 'short',
          timeStyle: 'short'
        }),
        message: `Session d'appel créée et planifiée dans 4 minutes.`,
        amount: amount, // ✅ Retourner en euros
        serviceType,
        providerType,
        requestId,
        paymentIntentId,
        delayMinutes: 4, // 240 secondes = 4 minutes
        timestamp: new Date().toISOString(),
        // P0 FIX: Planification directe (pas via webhook)
        schedulingMethod: 'cloud_tasks_direct',
        note: 'L\'appel sera automatiquement déclenché dans 4 minutes via Cloud Tasks'
      };

      // Log de succès
      prodLogger.info('CALL_SCHEDULE_SUCCESS', `[${requestId}] Call session created and scheduled`, {
        requestId,
        sessionId: response.sessionId,
        status: response.status,
        amount: response.amount,
        paymentIntentId,
        schedulingMethod: response.schedulingMethod,
        delayMinutes: 4,
      });

      console.log(`🎉 [${requestId}] Réponse envoyée:`, {
        sessionId: response.sessionId,
        status: response.status,
        scheduledFor: response.scheduledFor,
        amount: response.amount,
        schedulingMethod: response.schedulingMethod
      });

      return response;

    } catch (error: unknown) {
      // Log d'erreur
      prodLogger.error('CALL_SCHEDULE_ERROR', `[${requestId}] Call scheduling failed`, {
        requestId,
        providerId: request.data?.providerId,
        clientId: request.data?.clientId,
        paymentIntentId: request.data?.paymentIntentId,
        error: error instanceof Error ? error.message : String(error),
      });

      // ========================================
      // 11. GESTION D'ERREURS COMPLÈTE
      // ========================================
      const errorDetails = {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        stack: error instanceof Error ? error.stack : undefined,
        requestData: {
          providerId: request.data?.providerId?.substring(0, 8) + '...' || 'undefined',
          clientId: request.data?.clientId?.substring(0, 8) + '...' || 'undefined',
          serviceType: request.data?.serviceType,
          amount: request.data?.amount,
          amountType: typeof request.data?.amount,
          paymentIntentId: request.data?.paymentIntentId,
          hasAuth: !!request.auth,
          delayMinutes: request.data?.delayMinutes,
          hasProviderPhone: !!request.data?.providerPhone,
          hasClientPhone: !!request.data?.clientPhone,
          providerPhoneLength: request.data?.providerPhone?.length || 0,
          clientPhoneLength: request.data?.clientPhone?.length || 0},
        userAuth: request.auth?.uid?.substring(0, 8) + '...' || 'not-authenticated',
        timestamp: new Date().toISOString(),
        newFlow: 'stripe_webhook_scheduling' // ✅ Indiquer le nouveau flux dans les logs d'erreur
      };

      // Log détaillé de l'erreur
      await logError('createCallSession:error', errorDetails);

      console.error(`❌ [${requestId}] Erreur lors de la création de session:`, {
        error: errorDetails.error,
        errorType: errorDetails.errorType,
        serviceType: request.data?.serviceType,
        amount: request.data?.amount,
        hasProviderPhone: errorDetails.requestData.hasProviderPhone,
        hasClientPhone: errorDetails.requestData.hasClientPhone,
        newFlow: errorDetails.newFlow
      });

      // ========================================
      // 11.1 AUDIT FIX: LIBÉRATION DU PROVIDER SI MARQUÉ BUSY
      // ========================================
      // Si le provider a été réservé (setProviderBusy success) mais qu'une erreur
      // est survenue ensuite (createCallSession, Cloud Tasks, etc.), on le libère
      // pour éviter qu'il reste bloqué busy indéfiniment
      if (providerMarkedBusy && reservedProviderId) {
        try {
          console.log(`🔓 [${requestId}] Libération du provider ${reservedProviderId} suite à l'échec...`);
          await setProviderAvailable(reservedProviderId, 'error_recovery');
          console.log(`✅ [${requestId}] Provider ${reservedProviderId} libéré avec succès`);
        } catch (releaseError) {
          console.error(`⚠️ [${requestId}] Impossible de libérer le provider:`, releaseError);
          // Le cron checkProviderInactivity le libérera sous 15 minutes max
        }
      }

      // ========================================
      // 11.2 ANNULATION AUTOMATIQUE DU PAIEMENT EN CAS D'ÉCHEC
      // ========================================
      const paymentIntentId = request.data?.paymentIntentId;
      if (paymentIntentId && paymentIntentId.startsWith('pi_')) {
        try {
          console.log(`💳 [${requestId}] Annulation du PaymentIntent suite à l'échec: ${paymentIntentId}`);
          await stripeManager.cancelPayment(
            paymentIntentId,
            `Échec création session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            requestId
          );
          console.log(`✅ [${requestId}] PaymentIntent annulé avec succès - Argent libéré pour le client`);
        } catch (cancelError) {
          console.error(`⚠️ [${requestId}] Impossible d'annuler le PaymentIntent:`, cancelError);
          // On continue quand même pour retourner l'erreur originale
          // Le paiement expirera automatiquement sous 7 jours
        }
      }

      // Si c'est déjà une HttpsError Firebase, la relancer telle quelle
      if (error instanceof HttpsError) {
        throw error;
      }

      // Pour les autres types d'erreurs, les wrapper dans HttpsError
      if (error instanceof Error) {
        // Erreurs spécifiques selon le message
        if (error.message.includes('payment') || error.message.includes('PaymentIntent')) {
          throw new HttpsError(
            'failed-precondition',
            'Erreur liée au paiement. Vérifiez que le paiement a été validé.'
          );
        }
        
        if (error.message.includes('provider') || error.message.includes('client')) {
          throw new HttpsError(
            'not-found',
            'Prestataire ou client introuvable. Vérifiez les identifiants.'
          );
        }

        if (error.message.includes('session') || error.message.includes('call')) {
          throw new HttpsError(
            'internal',
            'Erreur lors de la création de la session d\'appel. Service temporairement indisponible.'
          );
        }

        if (error.message.includes('phone') || error.message.includes('téléphone')) {
          throw new HttpsError(
            'invalid-argument',
            error.message
          );
        }
      }

      // Erreur générique pour tout le reste
      throw new HttpsError(
        'internal',
        'Erreur interne lors de la création de la session d\'appel. Veuillez réessayer dans quelques instants.'
      );
    }
  }
);