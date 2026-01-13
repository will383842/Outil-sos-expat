/**
 * SOS-Expat Subscription Cancellation Functions
 * Gestion de l'annulation et de la reactivation des abonnements providers
 *
 * Fonctions:
 * - cancelSubscription: Annule l'abonnement a la fin de la periode
 * - reactivateSubscription: Reactive un abonnement annule avant la fin de periode
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { MailwizzAPI } from '../emailMarketing/utils/mailwizz';
import { getLanguageCode, SUPPORTED_LANGUAGES, SupportedLanguage } from '../emailMarketing/config';

// Lazy initialization pattern to prevent deployment timeout
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
let stripe: Stripe | null = null;
function getStripe(): Stripe {
  ensureInitialized();
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    if (!secretKey) {
      throw new Error('Stripe secret key not configured');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });
  }
  return stripe;
}

// Lazy Firestore initialization
const getDb = () => {
  ensureInitialized();
  return admin.firestore();
};

// ============================================================================
// TYPES
// ============================================================================

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'paused';

interface SubscriptionData {
  providerId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  canceledAt: FirebaseFirestore.Timestamp | null;
  cancelReason?: string;
  currentPeriodEnd: FirebaseFirestore.Timestamp;
  planId: string;
  tier: string;
  currency: string;
  currentPeriodAmount: number;
  billingPeriod: 'monthly' | 'yearly';
}

interface ProviderData {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  language?: string;
  preferredLanguage?: string;
  lang?: string;
}

// ============================================================================
// EMAIL TEMPLATES (9 languages)
// ============================================================================

const CANCELLATION_EMAIL_TEMPLATES: Record<SupportedLanguage, {
  subject: string;
  accessUntilMessage: string;
  resubscribeMessage: string;
  greeting: string;
  confirmationMessage: string;
  whatHappensNext: string;
  featuresList: string[];
  ctaText: string;
  supportMessage: string;
}> = {
  fr: {
    subject: '[SOS-Expat] Confirmation d\'annulation de votre abonnement',
    accessUntilMessage: 'Vous garderez l\'acces a votre abonnement jusqu\'au {date}.',
    resubscribeMessage: 'Vous pouvez vous reabonner a tout moment avant cette date.',
    greeting: 'Bonjour {name},',
    confirmationMessage: 'Nous confirmons l\'annulation de votre abonnement SOS-Expat.',
    whatHappensNext: 'Ce qui va se passer:',
    featuresList: [
      'Votre acces reste actif jusqu\'a la fin de votre periode actuelle',
      'Aucun prelevement supplementaire ne sera effectue',
      'Vous pouvez vous reabonner a tout moment'
    ],
    ctaText: 'Se reabonner',
    supportMessage: 'Des questions? Notre equipe support est la pour vous aider.'
  },
  en: {
    subject: '[SOS-Expat] Subscription Cancellation Confirmation',
    accessUntilMessage: 'You will keep access to your subscription until {date}.',
    resubscribeMessage: 'You can resubscribe at any time before this date.',
    greeting: 'Hello {name},',
    confirmationMessage: 'We confirm the cancellation of your SOS-Expat subscription.',
    whatHappensNext: 'What happens next:',
    featuresList: [
      'Your access remains active until the end of your current period',
      'No additional charges will be made',
      'You can resubscribe at any time'
    ],
    ctaText: 'Resubscribe',
    supportMessage: 'Questions? Our support team is here to help.'
  },
  es: {
    subject: '[SOS-Expat] Confirmacion de cancelacion de suscripcion',
    accessUntilMessage: 'Mantendras acceso a tu suscripcion hasta el {date}.',
    resubscribeMessage: 'Puedes volver a suscribirte en cualquier momento antes de esta fecha.',
    greeting: 'Hola {name},',
    confirmationMessage: 'Confirmamos la cancelacion de tu suscripcion SOS-Expat.',
    whatHappensNext: 'Que pasara a continuacion:',
    featuresList: [
      'Tu acceso permanece activo hasta el final de tu periodo actual',
      'No se realizaran cargos adicionales',
      'Puedes volver a suscribirte en cualquier momento'
    ],
    ctaText: 'Volver a suscribirme',
    supportMessage: 'Preguntas? Nuestro equipo de soporte esta aqui para ayudarte.'
  },
  de: {
    subject: '[SOS-Expat] Bestatigung der Abo-Kundigung',
    accessUntilMessage: 'Sie behalten den Zugang zu Ihrem Abonnement bis zum {date}.',
    resubscribeMessage: 'Sie konnen sich jederzeit vor diesem Datum wieder anmelden.',
    greeting: 'Hallo {name},',
    confirmationMessage: 'Wir bestatigen die Kundigung Ihres SOS-Expat-Abonnements.',
    whatHappensNext: 'Was als nachstes passiert:',
    featuresList: [
      'Ihr Zugang bleibt bis zum Ende Ihres aktuellen Zeitraums aktiv',
      'Es werden keine weiteren Gebuhren erhoben',
      'Sie konnen sich jederzeit wieder anmelden'
    ],
    ctaText: 'Wieder abonnieren',
    supportMessage: 'Fragen? Unser Support-Team ist fur Sie da.'
  },
  pt: {
    subject: '[SOS-Expat] Confirmacao de cancelamento de assinatura',
    accessUntilMessage: 'Voce mantera acesso a sua assinatura ate {date}.',
    resubscribeMessage: 'Voce pode se reinscrever a qualquer momento antes desta data.',
    greeting: 'Ola {name},',
    confirmationMessage: 'Confirmamos o cancelamento da sua assinatura SOS-Expat.',
    whatHappensNext: 'O que acontece em seguida:',
    featuresList: [
      'Seu acesso permanece ativo ate o final do periodo atual',
      'Nenhuma cobranca adicional sera feita',
      'Voce pode se reinscrever a qualquer momento'
    ],
    ctaText: 'Reassinar',
    supportMessage: 'Duvidas? Nossa equipe de suporte esta aqui para ajudar.'
  },
  ru: {
    subject: '[SOS-Expat] Podtverzhdenie otmeny podpiski',
    accessUntilMessage: 'Vy sokhranite dostup k podpiske do {date}.',
    resubscribeMessage: 'Vy mozhete povtorno podpisatsya v lyuboe vremya do etoy daty.',
    greeting: 'Zdravstvuyte {name},',
    confirmationMessage: 'My podtverzhdaem otmenu vashey podpiski SOS-Expat.',
    whatHappensNext: 'Chto budet dalshe:',
    featuresList: [
      'Vash dostup ostaetsya aktivnym do kontsa tekushchego perioda',
      'Dopolnitelnaya plata ne budet vzimat\'sya',
      'Vy mozhete podpisatsya povtorno v lyuboe vremya'
    ],
    ctaText: 'Podpisatsya snova',
    supportMessage: 'Voprosy? Nasha sluzhba podderzhki gotova pomoch.'
  },
  hi: {
    subject: '[SOS-Expat] Subscription Radd Ki Pushti',
    accessUntilMessage: 'Aap {date} tak apni subscription ka access rakh sakenge.',
    resubscribeMessage: 'Aap is tarikh se pehle kabhi bhi phir se subscribe kar sakte hain.',
    greeting: 'Namaste {name},',
    confirmationMessage: 'Hum aapki SOS-Expat subscription ki cancellation ki pushti karte hain.',
    whatHappensNext: 'Aage kya hoga:',
    featuresList: [
      'Aapka access vartaman avadhi ke ant tak saktiy rahega',
      'Koi atirikt shulk nahi liya jayega',
      'Aap kabhi bhi phir se subscribe kar sakte hain'
    ],
    ctaText: 'Phir se Subscribe Karen',
    supportMessage: 'Prashn? Hamari support team aapki madad ke liye yahan hai.'
  },
  ar: {
    subject: '[SOS-Expat] Taakeed Ilghaa Al-Ishtirak',
    accessUntilMessage: 'Satahfaz bi-wusool ila ishtirakak hatta {date}.',
    resubscribeMessage: 'Yumkinak iaadat al-ishtirak fi ay waqt qabl hadha al-tarikh.',
    greeting: 'Marhaba {name},',
    confirmationMessage: 'Nuakkid ilghaa ishtirakak fi SOS-Expat.',
    whatHappensNext: 'Ma sayahduth baaad:',
    featuresList: [
      'Sayabqa wusoolak nashitan hatta nihayat al-fatra al-haliya',
      'Lan yatim akhth ay rusum idafiya',
      'Yumkinak iaadat al-ishtirak fi ay waqt'
    ],
    ctaText: 'Iaadat Al-Ishtirak',
    supportMessage: 'Asilah? Fariq al-daam hunna li-musaadatak.'
  },
  zh: {
    subject: '[SOS-Expat] Dingyue Quxiao Queren',
    accessUntilMessage: 'Nin jiang baochi fangwen quan zhi {date}.',
    resubscribeMessage: 'Nin keyi zai ci riqi zhiqian suishi chongxin dingyue.',
    greeting: 'Nin hao {name},',
    confirmationMessage: 'Women queren ninde SOS-Expat dingyue yi quxiao.',
    whatHappensNext: 'Jie xia lai hui fasheng shenme:',
    featuresList: [
      'Ninde fangwen quan jiang baochi zhidao dangqian zhouqi jieshu',
      'Jiang bu hui shoqu renhei eiwai feiyong',
      'Nin keyi suishi chongxin dingyue'
    ],
    ctaText: 'Chongxin Dingyue',
    supportMessage: 'You wenti? Women de zhichi tuandui suishi wei nin fuwu.'
  }
};

const REACTIVATION_EMAIL_TEMPLATES: Record<SupportedLanguage, {
  subject: string;
  greeting: string;
  confirmationMessage: string;
  continuedAccessMessage: string;
  nextBillingMessage: string;
  ctaText: string;
  supportMessage: string;
}> = {
  fr: {
    subject: '[SOS-Expat] Votre abonnement a ete reactive',
    greeting: 'Bonjour {name},',
    confirmationMessage: 'Bonne nouvelle! Votre abonnement SOS-Expat a ete reactive avec succes.',
    continuedAccessMessage: 'Vous continuez a beneficier de tous les avantages de votre abonnement sans interruption.',
    nextBillingMessage: 'Votre prochain prelevement aura lieu le {date}.',
    ctaText: 'Acceder a mon compte',
    supportMessage: 'Merci de votre confiance!'
  },
  en: {
    subject: '[SOS-Expat] Your subscription has been reactivated',
    greeting: 'Hello {name},',
    confirmationMessage: 'Great news! Your SOS-Expat subscription has been successfully reactivated.',
    continuedAccessMessage: 'You will continue to enjoy all the benefits of your subscription without interruption.',
    nextBillingMessage: 'Your next billing will be on {date}.',
    ctaText: 'Access my account',
    supportMessage: 'Thank you for your trust!'
  },
  es: {
    subject: '[SOS-Expat] Tu suscripcion ha sido reactivada',
    greeting: 'Hola {name},',
    confirmationMessage: 'Buenas noticias! Tu suscripcion SOS-Expat ha sido reactivada exitosamente.',
    continuedAccessMessage: 'Continuaras disfrutando de todos los beneficios de tu suscripcion sin interrupcion.',
    nextBillingMessage: 'Tu proximo cargo sera el {date}.',
    ctaText: 'Acceder a mi cuenta',
    supportMessage: 'Gracias por tu confianza!'
  },
  de: {
    subject: '[SOS-Expat] Ihr Abonnement wurde reaktiviert',
    greeting: 'Hallo {name},',
    confirmationMessage: 'Gute Neuigkeiten! Ihr SOS-Expat-Abonnement wurde erfolgreich reaktiviert.',
    continuedAccessMessage: 'Sie geniessen weiterhin alle Vorteile Ihres Abonnements ohne Unterbrechung.',
    nextBillingMessage: 'Ihre nachste Abbuchung erfolgt am {date}.',
    ctaText: 'Auf mein Konto zugreifen',
    supportMessage: 'Vielen Dank fur Ihr Vertrauen!'
  },
  pt: {
    subject: '[SOS-Expat] Sua assinatura foi reativada',
    greeting: 'Ola {name},',
    confirmationMessage: 'Otimas noticias! Sua assinatura SOS-Expat foi reativada com sucesso.',
    continuedAccessMessage: 'Voce continuara aproveitando todos os beneficios da sua assinatura sem interrupcao.',
    nextBillingMessage: 'Sua proxima cobranca sera em {date}.',
    ctaText: 'Acessar minha conta',
    supportMessage: 'Obrigado pela confianca!'
  },
  ru: {
    subject: '[SOS-Expat] Vasha podpiska byla reaktivirovana',
    greeting: 'Zdravstvuyte {name},',
    confirmationMessage: 'Otlichnye novosti! Vasha podpiska SOS-Expat byla uspeshno reaktivirovana.',
    continuedAccessMessage: 'Vy prodolzhaete polzovatsya vsemi preimushchestvami podpiski bez pereryva.',
    nextBillingMessage: 'Sleduyushchiy platezh budet {date}.',
    ctaText: 'Voyti v akkaunt',
    supportMessage: 'Spasibo za doveriye!'
  },
  hi: {
    subject: '[SOS-Expat] Aapki Subscription Punah Sakriy Ho Gayi',
    greeting: 'Namaste {name},',
    confirmationMessage: 'Acchi khabar! Aapki SOS-Expat subscription safaltapurvak punah sakriy ho gayi hai.',
    continuedAccessMessage: 'Aap bina kisi rukavat ke apni subscription ke sabhi laabhon ka anand lete rahenge.',
    nextBillingMessage: 'Aapka agla billing {date} ko hoga.',
    ctaText: 'Mere account mein pravesh karen',
    supportMessage: 'Aapke vishwas ke liye dhanyavad!'
  },
  ar: {
    subject: '[SOS-Expat] Tam Iaadat Tafeel Ishtirakak',
    greeting: 'Marhaba {name},',
    confirmationMessage: 'Akhbar saara! Tam iaadat tafeel ishtirakak fi SOS-Expat binajah.',
    continuedAccessMessage: 'Satastamirr fi al-tamattue bi-jamee mazaya ishtirakak duna inqitaa.',
    nextBillingMessage: 'Mawid al-fatora al-qadima huwa {date}.',
    ctaText: 'Al-dakhool ila hesabi',
    supportMessage: 'Shukran li-thiqatak!'
  },
  zh: {
    subject: '[SOS-Expat] Ninde Dingyue Yi Chongxin Jihuo',
    greeting: 'Nin hao {name},',
    confirmationMessage: 'Hao xiaoxi! Ninde SOS-Expat dingyue yi chenggong chongxin jihuo.',
    continuedAccessMessage: 'Nin jiang jixu bujian duan di xiangshou dingyue de suoyou youhui.',
    nextBillingMessage: 'Ninde xia ci jizhang riqi shi {date}.',
    ctaText: 'Fangwen wo de zhanghu',
    supportMessage: 'Ganxie ninde xinren!'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get provider's preferred language
 */
function getProviderLanguage(provider: ProviderData): SupportedLanguage {
  const lang = provider.language || provider.preferredLanguage || provider.lang || 'en';
  const normalizedLang = lang.toLowerCase() as SupportedLanguage;

  if (SUPPORTED_LANGUAGES.includes(normalizedLang)) {
    return normalizedLang;
  }
  return 'en';
}

/**
 * Format date according to locale
 */
function formatDate(date: Date, lang: SupportedLanguage): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  const localeMap: Record<SupportedLanguage, string> = {
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
    de: 'de-DE',
    pt: 'pt-PT',
    ru: 'ru-RU',
    hi: 'hi-IN',
    ar: 'ar-SA',
    zh: 'zh-CN'
  };

  return date.toLocaleDateString(localeMap[lang], options);
}

/**
 * Send cancellation confirmation email
 */
async function sendCancellationEmail(
  provider: ProviderData,
  endDate: Date,
  reason?: string
): Promise<void> {
  try {
    const lang = getProviderLanguage(provider);
    const template = CANCELLATION_EMAIL_TEMPLATES[lang];
    const formattedDate = formatDate(endDate, lang);
    const name = provider.displayName || provider.firstName || 'Provider';

    const mailwizz = new MailwizzAPI();

    // Try to use MailWizz transactional email
    await mailwizz.sendTransactional({
      to: provider.email,
      template: `TR_PRV_subscription-canceled_${getLanguageCode(lang)}`,
      customFields: {
        FNAME: name,
        END_DATE: formattedDate,
        CANCEL_REASON: reason || '',
        ACCESS_UNTIL_MSG: template.accessUntilMessage.replace('{date}', formattedDate),
        RESUBSCRIBE_URL: 'https://sos-expat.com/dashboard/subscription/plans',
      },
    });

    console.log(`[CancelSubscription] Cancellation email sent to ${provider.email} (${lang})`);
  } catch (error) {
    console.error('[CancelSubscription] Failed to send cancellation email:', error);
    // Don't throw - email failure shouldn't block the cancellation
  }
}

/**
 * Send reactivation confirmation email
 */
async function sendReactivationEmail(
  provider: ProviderData,
  nextBillingDate: Date
): Promise<void> {
  try {
    const lang = getProviderLanguage(provider);
    const formattedDate = formatDate(nextBillingDate, lang);
    const name = provider.displayName || provider.firstName || 'Provider';

    const mailwizz = new MailwizzAPI();

    await mailwizz.sendTransactional({
      to: provider.email,
      template: `TR_PRV_subscription-reactivated_${getLanguageCode(lang)}`,
      customFields: {
        FNAME: name,
        NEXT_BILLING_DATE: formattedDate,
        DASHBOARD_URL: 'https://sos-expat.com/dashboard',
      },
    });

    console.log(`[CancelSubscription] Reactivation email sent to ${provider.email} (${lang})`);
  } catch (error) {
    console.error('[CancelSubscription] Failed to send reactivation email:', error);
    // Don't throw - email failure shouldn't block the reactivation
  }
}

/**
 * Log subscription action to subscription_logs collection
 */
async function logSubscriptionAction(
  providerId: string,
  action: 'canceled' | 'reactivated',
  details: Record<string, unknown>
): Promise<void> {
  try {
    await getDb().collection('subscription_logs').add({
      providerId,
      action,
      details,
      createdAt: admin.firestore.Timestamp.now(),
    });
    console.log(`[CancelSubscription] Logged ${action} action for provider ${providerId}`);
  } catch (error) {
    console.error('[CancelSubscription] Failed to log subscription action:', error);
    // Don't throw - logging failure shouldn't block the action
  }
}

// ============================================================================
// CANCEL SUBSCRIPTION (Enhanced)
// ============================================================================

/**
 * Cancel subscription at period end
 * - Marks subscription to cancel at the end of the current billing period
 * - Sends confirmation email with end date
 * - Logs the action
 *
 * @param data.reason - Optional reason for cancellation
 */
export const cancelSubscription = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;
    const { reason } = data as { reason?: string };

    try {
      const db = getDb();

      // 2. Check if user is a provider
      const providerDoc = await db.doc(`providers/${providerId}`).get();
      if (!providerDoc.exists) {
        // Try users collection as fallback
        const userDoc = await db.doc(`users/${providerId}`).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'provider') {
          throw new functions.https.HttpsError(
            'permission-denied',
            'Only providers can cancel subscriptions'
          );
        }
      }

      // 3. Get active subscription from Firestore
      const subDoc = await db.doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No subscription found');
      }

      const subData = subDoc.data() as SubscriptionData;

      // 4. Verify there's an active subscription to cancel
      if (!subData.stripeSubscriptionId) {
        throw new functions.https.HttpsError('not-found', 'No active subscription found');
      }

      if (subData.status === 'canceled' || subData.status === 'expired') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Subscription is already canceled or expired'
        );
      }

      if (subData.cancelAtPeriodEnd) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Subscription is already scheduled for cancellation'
        );
      }

      // 5. Call Stripe API to cancel at period end
      const stripeSubscription = await getStripe().subscriptions.update(
        subData.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
          metadata: {
            cancelReason: reason || 'user_requested',
            canceledBy: 'provider',
            canceledAt: new Date().toISOString()
          }
        }
      );

      const now = admin.firestore.Timestamp.now();

      // 6. Update Firestore subscriptions/{providerId}
      await db.doc(`subscriptions/${providerId}`).update({
        cancelAtPeriodEnd: true,
        canceledAt: now,
        cancelReason: reason || 'user_requested',
        updatedAt: now
      });

      // 7. Get provider data for email
      const providerData = providerDoc.exists
        ? providerDoc.data() as ProviderData
        : (await db.doc(`users/${providerId}`).get()).data() as ProviderData;

      // 8. Send cancellation confirmation email
      const endDate = new Date(stripeSubscription.current_period_end * 1000);
      await sendCancellationEmail(providerData, endDate, reason);

      // 9. Log the action
      await logSubscriptionAction(providerId, 'canceled', {
        stripeSubscriptionId: subData.stripeSubscriptionId,
        reason: reason || 'user_requested',
        currentPeriodEnd: endDate.toISOString(),
        tier: subData.tier,
        planId: subData.planId
      });

      console.log(`[CancelSubscription] Subscription canceled for provider ${providerId}, ends ${endDate.toISOString()}`);

      return {
        success: true,
        message: 'Subscription will be canceled at the end of the current period',
        currentPeriodEnd: endDate.toISOString(),
        cancelAtPeriodEnd: true
      };
    } catch (error: unknown) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('[CancelSubscription] Error canceling subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription';
      throw new functions.https.HttpsError('internal', errorMessage);
    }
  });

// ============================================================================
// REACTIVATE SUBSCRIPTION
// ============================================================================

/**
 * Reactivate a subscription that was scheduled for cancellation
 * - Removes the cancel_at_period_end flag
 * - Sends confirmation email
 * - Logs the action
 */
export const reactivateSubscription = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // 1. Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;

    try {
      const db = getDb();

      // 2. Check if user is a provider
      const providerDoc = await db.doc(`providers/${providerId}`).get();
      if (!providerDoc.exists) {
        const userDoc = await db.doc(`users/${providerId}`).get();
        if (!userDoc.exists || userDoc.data()?.role !== 'provider') {
          throw new functions.https.HttpsError(
            'permission-denied',
            'Only providers can reactivate subscriptions'
          );
        }
      }

      // 3. Get subscription from Firestore
      const subDoc = await db.doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No subscription found');
      }

      const subData = subDoc.data() as SubscriptionData;

      // 4. Verify subscription can be reactivated
      if (!subData.stripeSubscriptionId) {
        throw new functions.https.HttpsError('not-found', 'No active subscription found');
      }

      if (subData.status === 'canceled' || subData.status === 'expired') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Subscription has already ended. Please create a new subscription.'
        );
      }

      if (!subData.cancelAtPeriodEnd) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Subscription is not scheduled for cancellation'
        );
      }

      // 5. Call Stripe API to reactivate
      const stripeSubscription = await getStripe().subscriptions.update(
        subData.stripeSubscriptionId,
        {
          cancel_at_period_end: false,
          metadata: {
            reactivatedAt: new Date().toISOString(),
            reactivatedBy: 'provider'
          }
        }
      );

      const now = admin.firestore.Timestamp.now();

      // 6. Update Firestore
      await db.doc(`subscriptions/${providerId}`).update({
        cancelAtPeriodEnd: false,
        canceledAt: null,
        cancelReason: null,
        status: 'active',
        updatedAt: now
      });

      // 7. Get provider data for email
      const providerData = providerDoc.exists
        ? providerDoc.data() as ProviderData
        : (await db.doc(`users/${providerId}`).get()).data() as ProviderData;

      // 8. Send reactivation confirmation email
      const nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);
      await sendReactivationEmail(providerData, nextBillingDate);

      // 9. Log the action
      await logSubscriptionAction(providerId, 'reactivated', {
        stripeSubscriptionId: subData.stripeSubscriptionId,
        nextBillingDate: nextBillingDate.toISOString(),
        tier: subData.tier,
        planId: subData.planId
      });

      console.log(`[CancelSubscription] Subscription reactivated for provider ${providerId}`);

      return {
        success: true,
        message: 'Subscription has been successfully reactivated',
        nextBillingDate: nextBillingDate.toISOString(),
        status: 'active'
      };
    } catch (error: unknown) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('[CancelSubscription] Error reactivating subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reactivate subscription';
      throw new functions.https.HttpsError('internal', errorMessage);
    }
  });

// ============================================================================
// PAUSE SUBSCRIPTION
// ============================================================================

/**
 * Pause a subscription (if supported by the plan)
 * - Pauses the subscription in Stripe
 * - Updates Firestore with paused status
 * - Disables AI access temporarily
 */
export const pauseSubscription = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;

    try {
      const db = getDb();

      // Get subscription
      const subDoc = await db.doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No subscription found');
      }

      const subData = subDoc.data() as SubscriptionData;

      if (!subData.stripeSubscriptionId) {
        throw new functions.https.HttpsError('not-found', 'No active subscription found');
      }

      if (subData.status !== 'active') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Cannot pause subscription with status: ${subData.status}`
        );
      }

      // Pause subscription in Stripe
      await getStripe().subscriptions.update(
        subData.stripeSubscriptionId,
        {
          pause_collection: {
            behavior: 'mark_uncollectible'
          },
          metadata: {
            pausedAt: new Date().toISOString(),
            pausedBy: 'provider'
          }
        }
      );

      const now = admin.firestore.Timestamp.now();

      // Update Firestore
      await db.doc(`subscriptions/${providerId}`).update({
        status: 'paused' as SubscriptionStatus,
        aiAccessEnabled: false,
        pausedAt: now,
        updatedAt: now
      });

      // Log the action
      await logSubscriptionAction(providerId, 'canceled', {
        action: 'paused',
        stripeSubscriptionId: subData.stripeSubscriptionId,
        tier: subData.tier,
        planId: subData.planId
      });

      console.log(`[PauseSubscription] Subscription paused for provider ${providerId}`);

      return {
        success: true,
        message: 'Subscription has been paused',
        status: 'paused'
      };
    } catch (error: unknown) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('[PauseSubscription] Error pausing subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to pause subscription';
      throw new functions.https.HttpsError('internal', errorMessage);
    }
  });

// ============================================================================
// RESUME SUBSCRIPTION
// ============================================================================

/**
 * Resume a paused subscription
 * - Resumes the subscription in Stripe
 * - Updates Firestore with active status
 * - Re-enables AI access
 */
export const resumeSubscription = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = context.auth.uid;

    try {
      const db = getDb();

      // Get subscription
      const subDoc = await db.doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No subscription found');
      }

      const subData = subDoc.data() as SubscriptionData;

      if (!subData.stripeSubscriptionId) {
        throw new functions.https.HttpsError('not-found', 'No active subscription found');
      }

      if (subData.status !== 'paused') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Subscription is not paused. Current status: ${subData.status}`
        );
      }

      // Resume subscription in Stripe
      const stripeSubscription = await getStripe().subscriptions.update(
        subData.stripeSubscriptionId,
        {
          pause_collection: null as unknown as Stripe.SubscriptionUpdateParams.PauseCollection,
          metadata: {
            resumedAt: new Date().toISOString(),
            resumedBy: 'provider'
          }
        }
      );

      const now = admin.firestore.Timestamp.now();

      // Update Firestore
      await db.doc(`subscriptions/${providerId}`).update({
        status: 'active' as SubscriptionStatus,
        aiAccessEnabled: true,
        pausedAt: admin.firestore.FieldValue.delete(),
        updatedAt: now
      });

      // Log the action
      await logSubscriptionAction(providerId, 'reactivated', {
        action: 'resumed',
        stripeSubscriptionId: subData.stripeSubscriptionId,
        tier: subData.tier,
        planId: subData.planId
      });

      console.log(`[ResumeSubscription] Subscription resumed for provider ${providerId}`);

      return {
        success: true,
        message: 'Subscription has been resumed',
        status: 'active',
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString()
      };
    } catch (error: unknown) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('[ResumeSubscription] Error resuming subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to resume subscription';
      throw new functions.https.HttpsError('internal', errorMessage);
    }
  });

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CANCELLATION_EMAIL_TEMPLATES,
  REACTIVATION_EMAIL_TEMPLATES,
  sendCancellationEmail,
  sendReactivationEmail,
  logSubscriptionAction
};
