/**
 * Monitoring Fonctionnel (Synthetics) - SOS-Expat
 *
 * Vérifie que les parcours critiques fonctionnent réellement :
 * - Inscription client/prestataire possible
 * - Formulaires critiques fonctionnels
 * - Réservation possible
 * - Paiement fonctionnel
 * - Tracking (Meta Pixel, Google Ads) opérationnel
 *
 * Ces checks détectent les problèmes AVANT que les clients ne s'en plaignent.
 *
 * @version 1.0.0
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logger as functionsLogger } from 'firebase-functions';
import { ADMIN_ALERT_EMAILS } from '../lib/constants';
// fetch is available natively in Node.js 22 - no import needed

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // URLs à vérifier (remplacer par vos URLs de production)
  PRODUCTION_URL: process.env.PRODUCTION_URL || 'https://sos-expat.com',

  // Seuils d'alerte
  THRESHOLDS: {
    // Funnel inscription
    SIGNUP_FUNNEL_DROP_PERCENT: 30,     // Alerter si >30% abandons
    SIGNUP_CONVERSION_MIN: 10,          // Min 10% conversion inscriptions

    // Réservations
    BOOKING_FUNNEL_DROP_PERCENT: 40,    // Alerter si >40% abandons
    ZERO_BOOKINGS_HOURS: 48,            // Alerter si 0 réservations en 48h

    // Formulaires
    FORM_ERROR_RATE_PERCENT: 5,         // Alerter si >5% erreurs formulaires

    // Tracking
    TRACKING_GAP_HOURS: 24,             // Alerter si aucun event tracking en 24h
    META_CAPI_QUALITY_MIN: 50,          // Score qualité CAPI minimum

    // Temps de réponse
    RESPONSE_TIME_MS: 5000,             // Alerter si page > 5s
  },

  ALERTS_COLLECTION: 'functional_alerts',
  METRICS_COLLECTION: 'functional_metrics',
  ALERT_EMAILS: ADMIN_ALERT_EMAILS
};

// ============================================================================
// TYPES
// ============================================================================

type FunctionalAlertSeverity = 'warning' | 'critical' | 'emergency';
type FunctionalAlertCategory =
  | 'signup_funnel'
  | 'booking_funnel'
  | 'payment_flow'
  | 'form_errors'
  | 'tracking'
  | 'availability'
  | 'performance';

interface FunctionalAlert {
  id: string;
  severity: FunctionalAlertSeverity;
  category: FunctionalAlertCategory;
  title: string;
  message: string;
  impact: string;           // Impact business estimé
  suggestedAction: string;  // Action suggérée
  metadata?: Record<string, unknown>;
  createdAt: FirebaseFirestore.Timestamp;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: FirebaseFirestore.Timestamp;
  resolved: boolean;
  resolvedAt?: FirebaseFirestore.Timestamp;
}

// Note: FunnelMetrics and FormMetrics interfaces removed as they were unused
// They can be added back when needed for more detailed metrics tracking

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const db = () => admin.firestore();

async function createFunctionalAlert(
  severity: FunctionalAlertSeverity,
  category: FunctionalAlertCategory,
  title: string,
  message: string,
  impact: string,
  suggestedAction: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const alertId = `func_alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const alert: FunctionalAlert = {
    id: alertId,
    severity,
    category,
    title,
    message,
    impact,
    suggestedAction,
    metadata,
    createdAt: admin.firestore.Timestamp.now(),
    acknowledged: false,
    resolved: false
  };

  await db().collection(CONFIG.ALERTS_COLLECTION).doc(alertId).set(alert);

  // Aussi dans system_alerts pour monitoring unifié
  await db().collection('system_alerts').add({
    ...alert,
    source: 'functional_monitoring'
  });

  // Envoyer notification email pour alertes critiques
  if (severity === 'critical' || severity === 'emergency') {
    await sendAlertEmail(alert);
    await sendSlackAlert(alert);
  }

  functionsLogger.warn(`[FunctionalMonitoring] ${severity} alert: ${title}`);

  return alertId;
}

async function sendAlertEmail(alert: FunctionalAlert): Promise<void> {
  try {
    await db().collection('mail').add({
      to: CONFIG.ALERT_EMAILS,
      template: {
        name: 'functional_alert',
        data: {
          severity: alert.severity,
          category: alert.category,
          title: alert.title,
          message: alert.message,
          impact: alert.impact,
          suggestedAction: alert.suggestedAction,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    functionsLogger.error('[FunctionalMonitoring] Failed to send email alert:', error);
  }
}

async function sendSlackAlert(alert: FunctionalAlert): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const severityEmoji: Record<string, string> = {
    warning: '⚠️',
    critical: '🔴',
    emergency: '🚨'
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color: alert.severity === 'emergency' ? '#9c27b0' : alert.severity === 'critical' ? '#f44336' : '#ff9800',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${severityEmoji[alert.severity]} ${alert.title}`,
                emoji: true
              }
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: alert.message }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Impact:*\n${alert.impact}` },
                { type: 'mrkdwn', text: `*Action:*\n${alert.suggestedAction}` }
              ]
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `*Category:* ${alert.category} | *Time:* ${new Date().toISOString()}`
                }
              ]
            }
          ]
        }]
      })
    });
  } catch (error) {
    functionsLogger.error('[FunctionalMonitoring] Failed to send Slack alert:', error);
  }
}

// ============================================================================
// FUNNEL MONITORING
// ============================================================================

/**
 * Vérifie le funnel d'inscription (client & prestataire)
 */
async function checkSignupFunnel(): Promise<void> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  const timestamp24h = admin.firestore.Timestamp.fromDate(twentyFourHoursAgo);

  try {
    // Récupérer les events d'inscription des dernières 24h
    const signupEvents = await db().collection('analytics_events')
      .where('eventType', 'in', ['page_view_signup', 'signup_form_start', 'signup_form_submit', 'signup_success'])
      .where('timestamp', '>=', timestamp24h)
      .get();

    const counts: Record<string, number> = {
      page_view_signup: 0,
      signup_form_start: 0,
      signup_form_submit: 0,
      signup_success: 0
    };

    signupEvents.docs.forEach(doc => {
      const eventType = doc.data().eventType;
      if (counts[eventType] !== undefined) {
        counts[eventType]++;
      }
    });

    // Aussi vérifier les vraies inscriptions dans la collection users
    const newUsers = await db().collection('users')
      .where('createdAt', '>=', timestamp24h)
      .count()
      .get();

    const actualSignups = newUsers.data().count;

    // Calculer le taux de conversion
    const conversionRate = counts.page_view_signup > 0
      ? (actualSignups / counts.page_view_signup) * 100
      : 0;

    // Calculer le taux d'abandon du formulaire
    const formDropOffRate = counts.signup_form_start > 0
      ? ((counts.signup_form_start - counts.signup_form_submit) / counts.signup_form_start) * 100
      : 0;

    // Alertes
    if (formDropOffRate > CONFIG.THRESHOLDS.SIGNUP_FUNNEL_DROP_PERCENT) {
      await createFunctionalAlert(
        'critical',
        'signup_funnel',
        'Abandon élevé du formulaire d\'inscription',
        `${formDropOffRate.toFixed(1)}% des utilisateurs abandonnent le formulaire d'inscription (seuil: ${CONFIG.THRESHOLDS.SIGNUP_FUNNEL_DROP_PERCENT}%).`,
        'Perte potentielle de nouveaux clients/prestataires. Impact direct sur la croissance.',
        'Vérifier le formulaire d\'inscription pour bugs, erreurs de validation, ou problèmes UX. Tester sur mobile.',
        {
          formStarts: counts.signup_form_start,
          formSubmits: counts.signup_form_submit,
          dropOffRate: formDropOffRate,
          actualSignups
        }
      );
    }

    // Vérifier si 0 inscriptions en 24h (si normalement il y en a)
    if (actualSignups === 0 && counts.page_view_signup > 10) {
      await createFunctionalAlert(
        'emergency',
        'signup_funnel',
        'ZÉRO inscription en 24h malgré du trafic',
        `Aucune inscription réussie alors que ${counts.page_view_signup} visiteurs ont vu la page d'inscription.`,
        'Blocage total des inscriptions = perte de 100% des nouveaux utilisateurs potentiels.',
        'URGENT: Vérifier immédiatement le processus d\'inscription. Tester manuellement. Vérifier Firebase Auth, Firestore, et les règles de sécurité.',
        {
          pageViews: counts.page_view_signup,
          formStarts: counts.signup_form_start,
          formSubmits: counts.signup_form_submit,
          actualSignups: 0
        }
      );
    }

    // Sauvegarder les métriques
    await db().collection(CONFIG.METRICS_COLLECTION).add({
      type: 'signup_funnel',
      timestamp: admin.firestore.Timestamp.now(),
      period: '24h',
      metrics: {
        pageViews: counts.page_view_signup,
        formStarts: counts.signup_form_start,
        formSubmits: counts.signup_form_submit,
        actualSignups,
        conversionRate,
        formDropOffRate
      }
    });

    functionsLogger.info('[FunctionalMonitoring] Signup funnel check completed', {
      actualSignups,
      conversionRate: `${conversionRate.toFixed(1)}%`,
      dropOffRate: `${formDropOffRate.toFixed(1)}%`
    });

  } catch (error) {
    functionsLogger.error('[FunctionalMonitoring] Signup funnel check failed:', error);
  }
}

/**
 * Vérifie le funnel de réservation
 */
async function checkBookingFunnel(): Promise<void> {
  const fortyEightHoursAgo = new Date();
  fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
  const timestamp48h = admin.firestore.Timestamp.fromDate(fortyEightHoursAgo);

  try {
    // Vérifier les réservations réelles
    const recentBookings = await db().collection('bookings')
      .where('createdAt', '>=', timestamp48h)
      .get();

    const completedBookings = recentBookings.docs.filter(doc =>
      doc.data().status === 'confirmed' || doc.data().status === 'completed'
    );

    const failedBookings = recentBookings.docs.filter(doc =>
      doc.data().status === 'failed' || doc.data().status === 'cancelled_error'
    );

    // Vérifier aussi les call_sessions pour les appels
    const recentCalls = await db().collection('call_sessions')
      .where('createdAt', '>=', timestamp48h)
      .get();

    const totalBookings = completedBookings.length + recentCalls.docs.filter(d =>
      d.data().status === 'completed'
    ).length;

    // Alerte si zéro réservation
    if (totalBookings === 0) {
      // Vérifier s'il y a eu du trafic
      const searchViews = await db().collection('analytics_events')
        .where('eventType', '==', 'provider_search')
        .where('timestamp', '>=', timestamp48h)
        .count()
        .get();

      if (searchViews.data().count > 20) {
        await createFunctionalAlert(
          'emergency',
          'booking_funnel',
          'ZÉRO réservation en 48h malgré des recherches',
          `Aucune réservation confirmée alors que ${searchViews.data().count} recherches ont été effectuées.`,
          'Blocage total du chiffre d\'affaires. Perte de revenus estimée: 100% du CA normal.',
          'URGENT: Vérifier le processus de réservation complet. Tester le paiement. Vérifier la disponibilité des prestataires.',
          {
            searches: searchViews.data().count,
            completedBookings: 0,
            period: '48h'
          }
        );
      }
    }

    // Vérifier le taux d'échec
    const failureRate = recentBookings.size > 0
      ? (failedBookings.length / recentBookings.size) * 100
      : 0;

    if (failureRate > CONFIG.THRESHOLDS.BOOKING_FUNNEL_DROP_PERCENT && recentBookings.size >= 5) {
      await createFunctionalAlert(
        'critical',
        'booking_funnel',
        'Taux d\'échec de réservation élevé',
        `${failureRate.toFixed(1)}% des réservations échouent (${failedBookings.length}/${recentBookings.size}).`,
        'Perte directe de ventes. Les clients peuvent partir chez un concurrent.',
        'Analyser les raisons d\'échec. Vérifier les intégrations paiement et la disponibilité prestataires.',
        {
          total: recentBookings.size,
          failed: failedBookings.length,
          failureRate
        }
      );
    }

    functionsLogger.info('[FunctionalMonitoring] Booking funnel check completed', {
      totalBookings,
      failedBookings: failedBookings.length,
      failureRate: `${failureRate.toFixed(1)}%`
    });

  } catch (error) {
    functionsLogger.error('[FunctionalMonitoring] Booking funnel check failed:', error);
  }
}

// ============================================================================
// FORM MONITORING
// ============================================================================

/**
 * Vérifie les erreurs de formulaires
 */
async function checkFormErrors(): Promise<void> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  const timestamp24h = admin.firestore.Timestamp.fromDate(twentyFourHoursAgo);

  try {
    // Récupérer les erreurs de formulaires loggées
    const formErrors = await db().collection('form_errors')
      .where('timestamp', '>=', timestamp24h)
      .get();

    // Grouper par formulaire
    const errorsByForm: Record<string, { errors: number; errorTypes: Record<string, number> }> = {};

    formErrors.docs.forEach(doc => {
      const data = doc.data();
      const formName = data.formName || 'unknown';

      if (!errorsByForm[formName]) {
        errorsByForm[formName] = { errors: 0, errorTypes: {} };
      }

      errorsByForm[formName].errors++;
      const errorType = data.errorType || 'unknown';
      errorsByForm[formName].errorTypes[errorType] =
        (errorsByForm[formName].errorTypes[errorType] || 0) + 1;
    });

    // Récupérer les soumissions réussies pour calculer le taux d'erreur
    const formSubmissions = await db().collection('analytics_events')
      .where('eventType', '==', 'form_submit')
      .where('timestamp', '>=', timestamp24h)
      .get();

    const submissionsByForm: Record<string, number> = {};
    formSubmissions.docs.forEach(doc => {
      const formName = doc.data().formName || 'unknown';
      submissionsByForm[formName] = (submissionsByForm[formName] || 0) + 1;
    });

    // Alerter pour les formulaires avec taux d'erreur élevé
    for (const [formName, data] of Object.entries(errorsByForm)) {
      const submissions = submissionsByForm[formName] || data.errors; // Si pas de tracking, utiliser errors comme base
      const errorRate = (data.errors / (submissions + data.errors)) * 100;

      if (errorRate > CONFIG.THRESHOLDS.FORM_ERROR_RATE_PERCENT && data.errors >= 5) {
        const topErrors = Object.entries(data.errorTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type, count]) => `${type}: ${count}`)
          .join(', ');

        await createFunctionalAlert(
          'critical',
          'form_errors',
          `Erreurs élevées sur le formulaire "${formName}"`,
          `Taux d'erreur de ${errorRate.toFixed(1)}% (${data.errors} erreurs). Erreurs fréquentes: ${topErrors}`,
          `Les utilisateurs ne peuvent pas compléter le formulaire ${formName}. Impact sur conversions.`,
          `Vérifier la validation du formulaire ${formName}. Tester les cas limites. Vérifier les règles Firestore.`,
          {
            formName,
            errors: data.errors,
            submissions,
            errorRate,
            errorTypes: data.errorTypes
          }
        );
      }
    }

    functionsLogger.info('[FunctionalMonitoring] Form errors check completed', {
      totalErrors: formErrors.size,
      formsWithErrors: Object.keys(errorsByForm).length
    });

  } catch (error) {
    functionsLogger.error('[FunctionalMonitoring] Form errors check failed:', error);
  }
}

// ============================================================================
// TRACKING MONITORING
// ============================================================================

/**
 * Vérifie que le tracking Meta/Google fonctionne
 */
async function checkTrackingHealth(): Promise<void> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  const timestamp24h = admin.firestore.Timestamp.fromDate(twentyFourHoursAgo);

  try {
    // Vérifier les événements CAPI Meta
    const capiEvents = await db().collection('capi_events')
      .where('trackedAt', '>=', timestamp24h)
      .get();

    const hasCapiEvents = capiEvents.size > 0;

    // Calculer le score de qualité moyen
    const qualityScores = capiEvents.docs
      .map(doc => doc.data().qualityScore || 0)
      .filter(score => score > 0);

    const avgQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 0;

    // Vérifier les conversions tracées (Purchase, Lead, etc.)
    const conversionEvents = capiEvents.docs.filter(doc => {
      const eventType = doc.data().eventType;
      return ['Purchase', 'Lead', 'CompleteRegistration', 'InitiateCheckout'].includes(eventType);
    });

    // Alerte si pas d'événements CAPI
    if (!hasCapiEvents) {
      // Vérifier s'il y a du trafic
      const pageViews = await db().collection('analytics_events')
        .where('eventType', '==', 'page_view')
        .where('timestamp', '>=', timestamp24h)
        .count()
        .get();

      if (pageViews.data().count > 50) {
        await createFunctionalAlert(
          'critical',
          'tracking',
          'Tracking Meta CAPI inactif',
          `Aucun événement CAPI Meta enregistré en 24h malgré ${pageViews.data().count} pages vues.`,
          'Les conversions ne sont pas envoyées à Meta. Impact sur l\'optimisation des publicités et le ROAS.',
          'Vérifier la configuration du Meta Pixel et CAPI. Vérifier les tokens d\'accès Meta. Tester un événement manuellement.',
          {
            pageViews: pageViews.data().count,
            capiEvents: 0
          }
        );
      }
    }

    // Alerte si score qualité trop bas
    if (avgQualityScore > 0 && avgQualityScore < CONFIG.THRESHOLDS.META_CAPI_QUALITY_MIN) {
      await createFunctionalAlert(
        'warning',
        'tracking',
        'Score de qualité Meta CAPI bas',
        `Score moyen de qualité: ${avgQualityScore.toFixed(0)}/100 (minimum recommandé: ${CONFIG.THRESHOLDS.META_CAPI_QUALITY_MIN}).`,
        'Les données envoyées à Meta manquent d\'informations. Cela réduit l\'efficacité du ciblage publicitaire.',
        'Enrichir les événements avec email hashé, téléphone, nom. Vérifier que les users sont connectés au moment des conversions.',
        {
          avgQualityScore,
          totalEvents: capiEvents.size,
          conversionEvents: conversionEvents.length
        }
      );
    }

    // Vérifier les événements Google Ads (via analytics_events)
    const googleEvents = await db().collection('analytics_events')
      .where('eventType', 'in', ['gtag_conversion', 'google_ads_conversion'])
      .where('timestamp', '>=', timestamp24h)
      .get();

    // Alerte si pas d'événements Google avec du trafic
    if (googleEvents.size === 0 && capiEvents.size > 0) {
      await createFunctionalAlert(
        'warning',
        'tracking',
        'Tracking Google Ads potentiellement inactif',
        `Aucun événement de conversion Google Ads tracé en 24h alors que Meta CAPI fonctionne.`,
        'Les conversions Google ne sont pas trackées. Impact sur l\'optimisation des campagnes Google Ads.',
        'Vérifier l\'intégration gtag. Vérifier le consent mode. Tester une conversion manuellement.',
        {
          googleEvents: 0,
          metaEvents: capiEvents.size
        }
      );
    }

    // Sauvegarder métriques tracking
    await db().collection(CONFIG.METRICS_COLLECTION).add({
      type: 'tracking_health',
      timestamp: admin.firestore.Timestamp.now(),
      period: '24h',
      metrics: {
        metaCapi: {
          totalEvents: capiEvents.size,
          conversions: conversionEvents.length,
          avgQualityScore
        },
        googleAds: {
          totalEvents: googleEvents.size
        }
      }
    });

    functionsLogger.info('[FunctionalMonitoring] Tracking health check completed', {
      metaCapiEvents: capiEvents.size,
      avgQualityScore: avgQualityScore.toFixed(0),
      googleAdsEvents: googleEvents.size
    });

  } catch (error) {
    functionsLogger.error('[FunctionalMonitoring] Tracking health check failed:', error);
  }
}

// ============================================================================
// AVAILABILITY MONITORING
// ============================================================================

/**
 * Vérifie que les prestataires sont disponibles pour les clients
 */
async function checkProviderAvailability(): Promise<void> {
  try {
    // Vérifier les prestataires actifs
    const activeProviders = await db().collection('users')
      .where('role', '==', 'provider')
      .where('status', '==', 'active')
      .where('isAvailable', '==', true)
      .count()
      .get();

    const availableCount = activeProviders.data().count;

    // Alerte si très peu de prestataires disponibles
    if (availableCount < 3) {
      await createFunctionalAlert(
        'warning',
        'availability',
        'Très peu de prestataires disponibles',
        `Seulement ${availableCount} prestataire(s) disponible(s) actuellement.`,
        'Les clients risquent de ne pas trouver de prestataires. Cela peut augmenter le taux de rebond.',
        'Contacter les prestataires inactifs. Vérifier les disponibilités. Recruter de nouveaux prestataires si nécessaire.',
        { availableProviders: availableCount }
      );
    }

    // Vérifier si des prestataires populaires sont indisponibles
    const topProviders = await db().collection('users')
      .where('role', '==', 'provider')
      .where('rating', '>=', 4.5)
      .orderBy('rating', 'desc')
      .limit(10)
      .get();

    const unavailableTopProviders = topProviders.docs.filter(doc => {
      const data = doc.data();
      return data.isAvailable === false || data.status !== 'active';
    });

    if (unavailableTopProviders.length >= 5) {
      await createFunctionalAlert(
        'warning',
        'availability',
        'Prestataires top-rated indisponibles',
        `${unavailableTopProviders.length}/10 des meilleurs prestataires sont indisponibles.`,
        'Les clients peuvent être déçus de ne pas pouvoir réserver les prestataires bien notés.',
        'Contacter ces prestataires pour comprendre pourquoi ils sont indisponibles. Mettre en avant d\'autres bons prestataires.',
        {
          topProvidersTotal: topProviders.size,
          unavailable: unavailableTopProviders.length
        }
      );
    }

    functionsLogger.info('[FunctionalMonitoring] Provider availability check completed', {
      availableProviders: availableCount
    });

  } catch (error) {
    functionsLogger.error('[FunctionalMonitoring] Provider availability check failed:', error);
  }
}

// ============================================================================
// PAYMENT FLOW HEALTH
// ============================================================================

/**
 * Vérifie que le flux de paiement fonctionne de bout en bout
 * Couvre Stripe ET PayPal
 */
async function checkPaymentFlowHealth(): Promise<void> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  const timestamp24h = admin.firestore.Timestamp.fromDate(twentyFourHoursAgo);

  try {
    // Vérifier le flux complet: initiation → tentative → succès
    const checkoutStarts = await db().collection('analytics_events')
      .where('eventType', '==', 'checkout_start')
      .where('timestamp', '>=', timestamp24h)
      .count()
      .get();

    // ========== STRIPE ==========
    const stripePayments = await db().collection('payments')
      .where('createdAt', '>=', timestamp24h)
      .get();

    const stripeSuccessful = stripePayments.docs.filter(doc => {
      const status = doc.data().status;
      return status === 'succeeded' || status === 'captured';
    });

    const stripeFailed = stripePayments.docs.filter(doc => {
      const status = doc.data().status;
      return status === 'failed' || status === 'canceled';
    });

    // ========== PAYPAL ==========
    const paypalOrders = await db().collection('paypal_orders')
      .where('createdAt', '>=', timestamp24h)
      .get();

    const paypalSuccessful = paypalOrders.docs.filter(doc => {
      const status = doc.data().status;
      return status === 'COMPLETED' || status === 'APPROVED';
    });

    const paypalFailed = paypalOrders.docs.filter(doc => {
      const status = doc.data().status;
      return status === 'FAILED' || status === 'VOIDED';
    });

    // ========== TOTAUX COMBINÉS ==========
    const successfulPayments = [...stripeSuccessful, ...paypalSuccessful];
    const failedPayments = [...stripeFailed, ...paypalFailed];
    const allPaymentAttempts = stripePayments.size + paypalOrders.size;

    // Calculer le taux de conversion checkout → paiement réussi
    const checkoutToPaymentRate = checkoutStarts.data().count > 0
      ? (successfulPayments.length / checkoutStarts.data().count) * 100
      : 0;

    // Alerte si taux de conversion checkout très bas
    if (checkoutToPaymentRate < 20 && checkoutStarts.data().count >= 10) {
      await createFunctionalAlert(
        'critical',
        'payment_flow',
        'Faible conversion checkout → paiement',
        `Seulement ${checkoutToPaymentRate.toFixed(1)}% des checkouts aboutissent à un paiement (${successfulPayments.length}/${checkoutStarts.data().count}).`,
        'Perte majeure de revenus. Les clients abandonnent au moment de payer.',
        'Analyser où les clients abandonnent. Vérifier les erreurs de paiement. Tester le flux de paiement complet sur mobile et desktop.',
        {
          checkoutStarts: checkoutStarts.data().count,
          paymentAttempts: allPaymentAttempts,
          successful: successfulPayments.length,
          failed: failedPayments.length,
          stripe: { successful: stripeSuccessful.length, failed: stripeFailed.length },
          paypal: { successful: paypalSuccessful.length, failed: paypalFailed.length },
          conversionRate: checkoutToPaymentRate
        }
      );
    }

    // Alerte spécifique si UN des gateways a 100% d'échec (l'autre fonctionne)
    if (stripeFailed.length > 0 && stripeSuccessful.length === 0 && paypalSuccessful.length > 0) {
      await createFunctionalAlert(
        'emergency',
        'payment_flow',
        'Stripe complètement en échec',
        `Tous les paiements Stripe échouent (${stripeFailed.length} échecs) alors que PayPal fonctionne (${paypalSuccessful.length} succès).`,
        'Les clients qui choisissent Stripe ne peuvent pas payer. Perte de CA estimée: 50%+',
        'URGENT: Vérifier l\'intégration Stripe. Vérifier les clés API. Consulter le dashboard Stripe pour les erreurs.',
        {
          stripeFailed: stripeFailed.length,
          stripeSuccessful: 0,
          paypalSuccessful: paypalSuccessful.length
        }
      );
    }

    if (paypalFailed.length > 0 && paypalSuccessful.length === 0 && stripeSuccessful.length > 0) {
      await createFunctionalAlert(
        'emergency',
        'payment_flow',
        'PayPal complètement en échec',
        `Tous les paiements PayPal échouent (${paypalFailed.length} échecs) alors que Stripe fonctionne (${stripeSuccessful.length} succès).`,
        'Les clients qui choisissent PayPal ne peuvent pas payer. Perte de CA estimée: 30-50%',
        'URGENT: Vérifier l\'intégration PayPal. Vérifier les credentials. Consulter le dashboard PayPal pour les erreurs.',
        {
          paypalFailed: paypalFailed.length,
          paypalSuccessful: 0,
          stripeSuccessful: stripeSuccessful.length
        }
      );
    }

    // Analyser les raisons d'échec
    if (failedPayments.length >= 3) {
      const failureReasons: Record<string, number> = {};
      failedPayments.forEach(doc => {
        const reason = doc.data().failureReason || doc.data().error?.code || 'unknown';
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      });

      const topReason = Object.entries(failureReasons)
        .sort((a, b) => b[1] - a[1])[0];

      if (topReason && topReason[1] >= 3) {
        await createFunctionalAlert(
          'warning',
          'payment_flow',
          'Pattern d\'échec de paiement détecté',
          `Raison d'échec récurrente: "${topReason[0]}" (${topReason[1]} fois en 24h).`,
          'Un problème systématique empêche certains paiements.',
          `Investiguer la cause "${topReason[0]}". Vérifier la configuration Stripe/PayPal. Contacter le support si nécessaire.`,
          {
            failedPayments: failedPayments.length,
            topReason: topReason[0],
            topReasonCount: topReason[1],
            allReasons: failureReasons
          }
        );
      }
    }

    // Vérifier les commissions prestataires
    const pendingCommissions = await db().collection('commissions')
      .where('status', '==', 'pending')
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
      .count()
      .get();

    if (pendingCommissions.data().count > 10) {
      await createFunctionalAlert(
        'warning',
        'payment_flow',
        'Commissions prestataires en retard',
        `${pendingCommissions.data().count} commissions sont en attente depuis plus de 7 jours.`,
        'Les prestataires ne sont pas payés à temps. Risque de perte de confiance et de départ.',
        'Vérifier le processus de paiement des commissions. Lancer les paiements en retard. Investiguer les blocages.',
        { pendingCommissions: pendingCommissions.data().count }
      );
    }

    functionsLogger.info('[FunctionalMonitoring] Payment flow check completed', {
      checkoutStarts: checkoutStarts.data().count,
      successfulPayments: successfulPayments.length,
      failedPayments: failedPayments.length
    });

  } catch (error) {
    functionsLogger.error('[FunctionalMonitoring] Payment flow check failed:', error);
  }
}

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

/**
 * Vérification fonctionnelle complète - 2x par jour
 * Vérifie tous les parcours critiques
 */
export const runFunctionalHealthCheck = onSchedule(
  {
    schedule: '0 9,18 * * *', // 9h et 18h Paris
    region: 'europe-west3',
    timeZone: 'Europe/Paris',
    memory: '512MiB',
    timeoutSeconds: 300
  },
  async () => {
    functionsLogger.info('[FunctionalMonitoring] Starting comprehensive functional check...');

    try {
      await Promise.all([
        checkSignupFunnel(),
        checkBookingFunnel(),
        checkFormErrors(),
        checkTrackingHealth(),
        checkProviderAvailability(),
        checkPaymentFlowHealth()
      ]);

      functionsLogger.info('[FunctionalMonitoring] Functional check completed successfully');
    } catch (error) {
      functionsLogger.error('[FunctionalMonitoring] Functional check failed:', error);
    }
  }
);

/**
 * Vérification critique rapide - toutes les 4h
 * Vérifie uniquement les fonctions les plus critiques (paiement, réservation)
 */
export const runCriticalFunctionalCheck = onSchedule(
  {
    schedule: '0 */4 * * *', // Toutes les 4 heures
    region: 'europe-west3',
    timeZone: 'Europe/Paris',
    memory: '256MiB',
    timeoutSeconds: 120
  },
  async () => {
    functionsLogger.info('[FunctionalMonitoring] Starting critical check...');

    try {
      await Promise.all([
        checkBookingFunnel(),
        checkPaymentFlowHealth()
      ]);

      functionsLogger.info('[FunctionalMonitoring] Critical check completed');
    } catch (error) {
      functionsLogger.error('[FunctionalMonitoring] Critical check failed:', error);
    }
  }
);

/**
 * Nettoyage des anciennes alertes et métriques
 */
export const cleanupFunctionalData = onSchedule(
  {
    schedule: '0 4 * * 0', // Dimanche 4h
    region: 'europe-west3',
    timeZone: 'Europe/Paris',
    memory: '256MiB'
  },
  async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      // Supprimer les anciennes alertes résolues
      const oldAlerts = await db().collection(CONFIG.ALERTS_COLLECTION)
        .where('resolved', '==', true)
        .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .limit(500)
        .get();

      if (!oldAlerts.empty) {
        const batch = db().batch();
        oldAlerts.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        functionsLogger.info(`[FunctionalMonitoring] Cleaned ${oldAlerts.size} old alerts`);
      }

      // Garder 60 jours de métriques
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const oldMetrics = await db().collection(CONFIG.METRICS_COLLECTION)
        .where('timestamp', '<', admin.firestore.Timestamp.fromDate(sixtyDaysAgo))
        .limit(500)
        .get();

      if (!oldMetrics.empty) {
        const batch = db().batch();
        oldMetrics.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        functionsLogger.info(`[FunctionalMonitoring] Cleaned ${oldMetrics.size} old metrics`);
      }

    } catch (error) {
      functionsLogger.error('[FunctionalMonitoring] Cleanup failed:', error);
    }
  }
);

// ============================================================================
// ADMIN CALLABLE FUNCTIONS
// ============================================================================

/**
 * Obtenir les alertes fonctionnelles actives
 */
export const getFunctionalAlerts = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { resolved = false, limit = 50 } = data as { resolved?: boolean; limit?: number };

    try {
      const alerts = await db().collection(CONFIG.ALERTS_COLLECTION)
        .where('resolved', '==', resolved)
        .orderBy('createdAt', 'desc')
        .limit(Math.min(limit, 100))
        .get();

      return {
        success: true,
        alerts: alerts.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString(),
          acknowledgedAt: doc.data().acknowledgedAt?.toDate?.()?.toISOString(),
          resolvedAt: doc.data().resolvedAt?.toDate?.()?.toISOString()
        })),
        count: alerts.size
      };
    } catch (error) {
      throw new functions.https.HttpsError('internal', 'Failed to get alerts');
    }
  });

/**
 * Résoudre une alerte fonctionnelle
 */
export const resolveFunctionalAlert = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { alertId, resolution } = data as { alertId: string; resolution?: string };

    if (!alertId) {
      throw new functions.https.HttpsError('invalid-argument', 'alertId is required');
    }

    try {
      await db().collection(CONFIG.ALERTS_COLLECTION).doc(alertId).update({
        resolved: true,
        resolvedAt: admin.firestore.Timestamp.now(),
        resolvedBy: context.auth.uid,
        resolution: resolution || 'Resolved by admin'
      });

      return { success: true };
    } catch (error) {
      throw new functions.https.HttpsError('internal', 'Failed to resolve alert');
    }
  });

/**
 * Obtenir le résumé de santé fonctionnelle
 */
export const getFunctionalHealthSummary = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    try {
      // Alertes actives par catégorie
      const activeAlerts = await db().collection(CONFIG.ALERTS_COLLECTION)
        .where('resolved', '==', false)
        .get();

      const alertsByCategory: Record<string, number> = {};
      const alertsBySeverity: Record<string, number> = { warning: 0, critical: 0, emergency: 0 };

      activeAlerts.docs.forEach(doc => {
        const data = doc.data();
        alertsByCategory[data.category] = (alertsByCategory[data.category] || 0) + 1;
        alertsBySeverity[data.severity] = (alertsBySeverity[data.severity] || 0) + 1;
      });

      // Dernières métriques par type
      const metricTypes = ['signup_funnel', 'tracking_health'];
      const latestMetrics: Record<string, unknown> = {};

      for (const type of metricTypes) {
        const metric = await db().collection(CONFIG.METRICS_COLLECTION)
          .where('type', '==', type)
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        if (!metric.empty) {
          latestMetrics[type] = {
            ...metric.docs[0].data().metrics,
            timestamp: metric.docs[0].data().timestamp?.toDate?.()?.toISOString()
          };
        }
      }

      // Déterminer le statut global
      let healthStatus: 'healthy' | 'warning' | 'critical' | 'emergency' = 'healthy';
      if (alertsBySeverity.emergency > 0) healthStatus = 'emergency';
      else if (alertsBySeverity.critical > 0) healthStatus = 'critical';
      else if (alertsBySeverity.warning > 0) healthStatus = 'warning';

      return {
        status: healthStatus,
        totalActiveAlerts: activeAlerts.size,
        alertsByCategory,
        alertsBySeverity,
        latestMetrics,
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new functions.https.HttpsError('internal', 'Failed to get health summary');
    }
  });

/**
 * Déclencher manuellement une vérification fonctionnelle
 */
export const triggerFunctionalCheck = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    // Vérifier que c'est un admin
    const userDoc = await db().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { checkType = 'all' } = data as { checkType?: 'all' | 'critical' | 'signup' | 'booking' | 'tracking' | 'payment' };

    try {
      switch (checkType) {
        case 'signup':
          await checkSignupFunnel();
          break;
        case 'booking':
          await checkBookingFunnel();
          break;
        case 'tracking':
          await checkTrackingHealth();
          break;
        case 'payment':
          await checkPaymentFlowHealth();
          break;
        case 'critical':
          await Promise.all([checkBookingFunnel(), checkPaymentFlowHealth()]);
          break;
        default:
          await Promise.all([
            checkSignupFunnel(),
            checkBookingFunnel(),
            checkFormErrors(),
            checkTrackingHealth(),
            checkProviderAvailability(),
            checkPaymentFlowHealth()
          ]);
      }

      return { success: true, checkType };
    } catch (error) {
      throw new functions.https.HttpsError('internal', 'Check failed');
    }
  });
