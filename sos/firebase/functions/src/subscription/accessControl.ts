/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SOS-Expat AI Access Control Functions
 * Fonctions de vérification d'accès IA pour prestataires
 *
 * P0 FIX: Utilisation des constantes centralisées
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import {
  SubscriptionStatus,
  SubscriptionTier,
  DEFAULT_TRIAL_CONFIG,
  DEFAULT_GRACE_PERIOD_DAYS,
  FAIR_USE_LIMIT,
  QUOTA_WARNING_THRESHOLD
} from './constants';

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

// Lazy db initialization
const getDb = () => {
  ensureInitialized();
  return admin.firestore();
};

// Re-export types from constants for backward compatibility
export type { SubscriptionStatus, SubscriptionTier };

/**
 * Reason why AI access was denied
 */
export type AiAccessDeniedReason =
  | 'no_subscription'
  | 'subscription_expired'
  | 'subscription_canceled'
  | 'payment_failed'
  | 'quota_exhausted'
  | 'trial_expired'
  | 'trial_calls_exhausted';

/**
 * Result of AI access check
 */
export interface AiAccessCheckResult {
  allowed: boolean;
  reason?: AiAccessDeniedReason;
  currentUsage: number;
  limit: number; // -1 pour illimite
  remaining: number; // -1 pour illimite
  isInTrial: boolean;
  trialDaysRemaining?: number;
  trialCallsRemaining?: number;
  subscriptionStatus: string;
  canUpgrade: boolean;
  suggestedPlan?: string;
  isForcedAccess?: boolean;
  forcedAccessNote?: string;
}

/**
 * Result of incrementing AI usage
 */
export interface AiUsageIncrementResult {
  success: boolean;
  newUsage: number;
  limit: number;
  remaining: number;
  quotaWarning?: 'approaching_limit' | 'limit_reached';
  quotaWarningMessage?: string;
}

/**
 * Subscription details response
 */
export interface SubscriptionDetailsResult {
  subscription: any | null;
  plan: any | null;
  usage: any;
  invoices: any[];
  canCancel: boolean;
  cancelAtPeriodEnd: boolean;
  nextBillingDate: Date | null;
}

/**
 * Forced access check result
 */
export interface ForcedAccessResult {
  hasForcedAccess: boolean;
  reason?: 'admin_granted' | 'free_trial_until';
  expiresAt?: Date;
  grantedBy?: string;
  note?: string;
}

// ============================================================================
// CONSTANTS (importées depuis constants.ts - P0 FIX)
// Les constantes DEFAULT_GRACE_PERIOD_DAYS, FAIR_USE_LIMIT, QUOTA_WARNING_THRESHOLD
// sont maintenant importées depuis ./constants.ts
// ============================================================================

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Recupere la configuration du trial depuis Firestore
 * P0 FIX: Utilise DEFAULT_TRIAL_CONFIG importé au lieu de valeurs hardcodées
 */
async function getTrialConfig(): Promise<{ durationDays: number; maxAiCalls: number; isEnabled: boolean }> {
  const settingsDoc = await getDb().doc('settings/subscription').get();
  if (!settingsDoc.exists || !settingsDoc.data()?.trial) {
    return { ...DEFAULT_TRIAL_CONFIG };
  }
  return settingsDoc.data()!.trial;
}

/**
 * P2 FIX: Recupere la periode de grace configurable depuis Firestore
 * Permet de configurer la grace period depuis la console admin
 */
async function getGracePeriodDays(): Promise<number> {
  const settingsDoc = await getDb().doc('settings/subscription').get();
  if (!settingsDoc.exists) {
    return DEFAULT_GRACE_PERIOD_DAYS;
  }
  return settingsDoc.data()?.gracePeriodDays ?? DEFAULT_GRACE_PERIOD_DAYS;
}

/**
 * Recupere un plan d'abonnement par son ID
 */
async function getSubscriptionPlan(planId: string): Promise<any | null> {
  const planDoc = await getDb().doc(`subscription_plans/${planId}`).get();
  if (!planDoc.exists) return null;
  return { id: planDoc.id, ...planDoc.data() };
}

/**
 * Calcule le nombre de jours entre deux dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine le plan suggere pour upgrade
 */
function getSuggestedUpgradePlan(currentTier: SubscriptionTier, providerType: string): string | undefined {
  const tierOrder: SubscriptionTier[] = ['trial', 'basic', 'standard', 'pro', 'unlimited'];
  const currentIndex = tierOrder.indexOf(currentTier);

  if (currentIndex < tierOrder.length - 1) {
    const nextTier = tierOrder[currentIndex + 1];
    return `${providerType}_${nextTier}`;
  }

  return undefined;
}

// ============================================================================
// INTERNAL HELPER: CHECK FORCED ACCESS
// ============================================================================

/**
 * Verifie si un admin a force l'acces IA pour un provider
 * - forcedAiAccess=true dans users → bypass toutes restrictions
 * - freeTrialUntil si defini et non expire → acces gratuit jusqu'a cette date
 */
export async function checkForcedAccess(providerId: string): Promise<ForcedAccessResult> {
  const userDoc = await getDb().doc(`users/${providerId}`).get();

  if (!userDoc.exists) {
    return { hasForcedAccess: false };
  }

  const userData = userDoc.data()!;
  const now = new Date();

  // Verifier forcedAiAccess (ou forceAiAccess pour compatibilite)
  if (userData.forcedAiAccess === true || userData.forceAiAccess === true) {
    return {
      hasForcedAccess: true,
      reason: 'admin_granted',
      grantedBy: userData.freeAccessGrantedBy || userData.forcedAccessGrantedBy || 'admin',
      note: userData.freeAccessNote || userData.forcedAccessNote || 'Acces gratuit accorde par administrateur'
    };
  }

  // Verifier freeTrialUntil
  if (userData.freeTrialUntil) {
    const freeTrialUntil = userData.freeTrialUntil.toDate ? userData.freeTrialUntil.toDate() : new Date(userData.freeTrialUntil);

    if (freeTrialUntil > now) {
      return {
        hasForcedAccess: true,
        reason: 'free_trial_until',
        expiresAt: freeTrialUntil,
        grantedBy: userData.freeTrialGrantedBy || 'admin',
        note: userData.freeTrialNote || `Essai gratuit jusqu'au ${freeTrialUntil.toLocaleDateString('fr-FR')}`
      };
    }
  }

  return { hasForcedAccess: false };
}

// ============================================================================
// CLOUD FUNCTION: CHECK AI ACCESS
// ============================================================================

/**
 * Verifie si le provider peut utiliser l'IA
 * Retourne les details complets sur l'etat de l'acces
 */
export const checkAiAccess = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Verification de l'authentification
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Le providerId peut etre fourni (pour admin) ou utiliser l'uid de l'appelant
    const providerId = data?.providerId || context.auth.uid;

    try {
      // 1. Verifier l'acces force (bypass toutes restrictions)
      const forcedAccess = await checkForcedAccess(providerId);

      if (forcedAccess.hasForcedAccess) {
        const usageDoc = await getDb().doc(`ai_usage/${providerId}`).get();
        const usage = usageDoc.exists ? usageDoc.data()! : { currentPeriodCalls: 0, trialCallsUsed: 0 };

        return {
          allowed: true,
          currentUsage: usage.currentPeriodCalls || 0,
          limit: -1, // illimite
          remaining: -1,
          isInTrial: false,
          subscriptionStatus: 'forced_access',
          canUpgrade: false,
          isForcedAccess: true,
          forcedAccessNote: forcedAccess.note
        } as AiAccessCheckResult;
      }

      // 2. Recuperer les donnees en parallele
      const [subDoc, usageDoc, trialConfig, gracePeriodDays] = await Promise.all([
        getDb().doc(`subscriptions/${providerId}`).get(),
        getDb().doc(`ai_usage/${providerId}`).get(),
        getTrialConfig(),
        getGracePeriodDays()
      ]);

      const usage = usageDoc.exists
        ? usageDoc.data()!
        : { currentPeriodCalls: 0, trialCallsUsed: 0, totalCallsAllTime: 0 };

      // 3. Pas d'abonnement
      if (!subDoc.exists) {
        return {
          allowed: false,
          reason: 'no_subscription',
          currentUsage: 0,
          limit: 0,
          remaining: 0,
          isInTrial: false,
          subscriptionStatus: 'none',
          canUpgrade: true,
          suggestedPlan: 'basic'
        } as AiAccessCheckResult;
      }

      const subscription = subDoc.data()!;
      const status = subscription.status as SubscriptionStatus;
      const now = new Date();

      // P2 FIX: Check if AI access has been explicitly disabled (payment failures, admin action)
      if (subscription.aiAccessEnabled === false || subscription.aiAccessSuspended === true) {
        return {
          allowed: false,
          reason: 'payment_failed' as AiAccessDeniedReason,
          currentUsage: usage.currentPeriodCalls || 0,
          limit: 0,
          remaining: 0,
          isInTrial: false,
          subscriptionStatus: status,
          canUpgrade: false // Must resolve payment issue first
        } as AiAccessCheckResult;
      }

      // 4. Verification du statut TRIALING
      if (status === 'trialing') {
        const trialEndsAt = subscription.trialEndsAt?.toDate ? subscription.trialEndsAt.toDate() : null;
        const trialExpired = trialEndsAt && now > trialEndsAt;
        const trialCallsUsed = usage.trialCallsUsed || 0;
        const trialCallsExhausted = trialCallsUsed >= trialConfig.maxAiCalls;

        const trialDaysRemaining = trialEndsAt
          ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
          : 0;
        const trialCallsRemaining = Math.max(0, trialConfig.maxAiCalls - trialCallsUsed);

        if (trialExpired) {
          return {
            allowed: false,
            reason: 'trial_expired',
            currentUsage: trialCallsUsed,
            limit: trialConfig.maxAiCalls,
            remaining: 0,
            isInTrial: true,
            trialDaysRemaining: 0,
            trialCallsRemaining: 0,
            subscriptionStatus: status,
            canUpgrade: true,
            suggestedPlan: getSuggestedUpgradePlan('trial', subscription.providerType || 'lawyer')
          } as AiAccessCheckResult;
        }

        if (trialCallsExhausted) {
          return {
            allowed: false,
            reason: 'trial_calls_exhausted' as AiAccessDeniedReason,
            currentUsage: trialCallsUsed,
            limit: trialConfig.maxAiCalls,
            remaining: 0,
            isInTrial: true,
            trialDaysRemaining,
            trialCallsRemaining: 0,
            subscriptionStatus: status,
            canUpgrade: true,
            suggestedPlan: getSuggestedUpgradePlan('trial', subscription.providerType || 'lawyer')
          } as AiAccessCheckResult;
        }

        // Trial valide
        return {
          allowed: true,
          currentUsage: trialCallsUsed,
          limit: trialConfig.maxAiCalls,
          remaining: trialCallsRemaining,
          isInTrial: true,
          trialDaysRemaining,
          trialCallsRemaining,
          subscriptionStatus: status,
          canUpgrade: true,
          suggestedPlan: getSuggestedUpgradePlan('trial', subscription.providerType || 'lawyer')
        } as AiAccessCheckResult;
      }

      // 5. Verification du statut ACTIVE
      if (status === 'active') {
        const plan = await getSubscriptionPlan(subscription.planId);
        const limit = plan?.aiCallsLimit ?? 0;
        const currentPeriodCalls = usage.currentPeriodCalls || 0;

        // Plan illimite (fair use)
        if (limit === -1) {
          const remaining = FAIR_USE_LIMIT - currentPeriodCalls;
          return {
            allowed: currentPeriodCalls < FAIR_USE_LIMIT,
            reason: currentPeriodCalls >= FAIR_USE_LIMIT ? 'quota_exhausted' : undefined,
            currentUsage: currentPeriodCalls,
            limit: -1,
            remaining: remaining > 0 ? remaining : 0,
            isInTrial: false,
            subscriptionStatus: status,
            canUpgrade: false // Deja au max
          } as AiAccessCheckResult;
        }

        // Plan avec limite
        const remaining = Math.max(0, limit - currentPeriodCalls);
        const quotaExhausted = currentPeriodCalls >= limit;

        return {
          allowed: !quotaExhausted,
          reason: quotaExhausted ? 'quota_exhausted' : undefined,
          currentUsage: currentPeriodCalls,
          limit,
          remaining,
          isInTrial: false,
          subscriptionStatus: status,
          canUpgrade: subscription.tier !== 'unlimited',
          suggestedPlan: quotaExhausted
            ? getSuggestedUpgradePlan(subscription.tier as SubscriptionTier, subscription.providerType || 'lawyer')
            : undefined
        } as AiAccessCheckResult;
      }

      // 6. Verification du statut PAST_DUE (grace period)
      if (status === 'past_due') {
        // Utiliser pastDueSince si disponible, sinon fallback sur updatedAt
        const pastDueSince = subscription.pastDueSince?.toDate
          ? subscription.pastDueSince.toDate()
          : (subscription.updatedAt?.toDate ? subscription.updatedAt.toDate() : now);
        const daysPastDue = daysBetween(pastDueSince, now);

        // Grace period (configurable, defaut 7 jours)
        if (daysPastDue < gracePeriodDays) {
          const plan = await getSubscriptionPlan(subscription.planId);
          const limit = plan?.aiCallsLimit ?? 0;
          const currentPeriodCalls = usage.currentPeriodCalls || 0;
          const remaining = limit === -1 ? -1 : Math.max(0, limit - currentPeriodCalls);

          return {
            allowed: true,
            currentUsage: currentPeriodCalls,
            limit,
            remaining,
            isInTrial: false,
            subscriptionStatus: status,
            canUpgrade: false // Doit d'abord regulariser
          } as AiAccessCheckResult;
        }

        // Grace period expiree
        return {
          allowed: false,
          reason: 'payment_failed',
          currentUsage: usage.currentPeriodCalls || 0,
          limit: 0,
          remaining: 0,
          isInTrial: false,
          subscriptionStatus: status,
          canUpgrade: false
        } as AiAccessCheckResult;
      }

      // 7. Verification des autres statuts (canceled, expired, paused)
      if (status === 'canceled') {
        // Verifier si acces jusqu'a fin de periode
        const periodEnd = subscription.currentPeriodEnd?.toDate ? subscription.currentPeriodEnd.toDate() : null;

        if (periodEnd && now < periodEnd && !subscription.canceledAt) {
          const plan = await getSubscriptionPlan(subscription.planId);
          const limit = plan?.aiCallsLimit ?? 0;
          const currentPeriodCalls = usage.currentPeriodCalls || 0;
          const remaining = limit === -1 ? -1 : Math.max(0, limit - currentPeriodCalls);

          return {
            allowed: currentPeriodCalls < (limit === -1 ? FAIR_USE_LIMIT : limit),
            currentUsage: currentPeriodCalls,
            limit,
            remaining,
            isInTrial: false,
            subscriptionStatus: status,
            canUpgrade: true,
            suggestedPlan: getSuggestedUpgradePlan('trial', subscription.providerType || 'lawyer')
          } as AiAccessCheckResult;
        }

        return {
          allowed: false,
          reason: 'subscription_canceled',
          currentUsage: usage.currentPeriodCalls || 0,
          limit: 0,
          remaining: 0,
          isInTrial: false,
          subscriptionStatus: status,
          canUpgrade: true,
          suggestedPlan: getSuggestedUpgradePlan('trial', subscription.providerType || 'lawyer')
        } as AiAccessCheckResult;
      }

      // P0 FIX: Ajout de 'suspended' aux statuts bloquants
      if (status === 'expired' || status === 'paused' || status === 'suspended') {
        return {
          allowed: false,
          reason: status === 'suspended' ? 'payment_failed' : 'subscription_expired',
          currentUsage: usage.currentPeriodCalls || 0,
          limit: 0,
          remaining: 0,
          isInTrial: false,
          subscriptionStatus: status,
          canUpgrade: status !== 'suspended', // Doit d'abord régulariser le paiement si suspendu
          suggestedPlan: getSuggestedUpgradePlan('trial', subscription.providerType || 'lawyer')
        } as AiAccessCheckResult;
      }

      // 8. Cas par defaut (ne devrait pas arriver)
      return {
        allowed: false,
        reason: 'no_subscription',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        isInTrial: false,
        subscriptionStatus: status || 'unknown',
        canUpgrade: true
      } as AiAccessCheckResult;

    } catch (error: any) {
      console.error('Error checking AI access:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to check AI access');
    }
  });

// ============================================================================
// CLOUD FUNCTION: INCREMENT AI USAGE
// ============================================================================

/**
 * Incremente le compteur d'utilisation IA apres un appel reussi
 * Verifie si le quota est atteint et envoie une alerte si necessaire
 */
export const incrementAiUsage = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Verification de l'authentification
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = data?.providerId || context.auth.uid;

    try {
      const now = admin.firestore.Timestamp.now();

      // Recuperer les donnees necessaires
      const [subDoc, usageDoc, trialConfig] = await Promise.all([
        getDb().doc(`subscriptions/${providerId}`).get(),
        getDb().doc(`ai_usage/${providerId}`).get(),
        getTrialConfig()
      ]);

      const subscription = subDoc.exists ? subDoc.data()! : null;
      const isInTrial = subscription?.status === 'trialing';

      // Creer ou mettre a jour le document d'usage
      const usageRef = getDb().doc(`ai_usage/${providerId}`);

      if (!usageDoc.exists) {
        // Creer le document d'usage s'il n'existe pas
        await usageRef.set({
          providerId,
          subscriptionId: providerId,
          currentPeriodCalls: isInTrial ? 0 : 1,
          trialCallsUsed: isInTrial ? 1 : 0,
          totalCallsAllTime: 1,
          currentPeriodStart: now,
          currentPeriodEnd: now,
          lastCallAt: now,
          updatedAt: now
        });

        const limit = isInTrial ? trialConfig.maxAiCalls : 0;
        return {
          success: true,
          newUsage: 1,
          limit,
          remaining: Math.max(0, limit - 1)
        } as AiUsageIncrementResult;
      }

      // Mettre a jour le compteur existant
      const usage = usageDoc.data()!;
      let newUsage: number;
      let limit: number;

      if (isInTrial) {
        // Incrementer les appels trial
        await usageRef.update({
          trialCallsUsed: admin.firestore.FieldValue.increment(1),
          totalCallsAllTime: admin.firestore.FieldValue.increment(1),
          lastCallAt: now,
          updatedAt: now
        });

        newUsage = (usage.trialCallsUsed || 0) + 1;
        limit = trialConfig.maxAiCalls;
      } else {
        // Incrementer les appels de la periode
        await usageRef.update({
          currentPeriodCalls: admin.firestore.FieldValue.increment(1),
          totalCallsAllTime: admin.firestore.FieldValue.increment(1),
          lastCallAt: now,
          updatedAt: now
        });

        newUsage = (usage.currentPeriodCalls || 0) + 1;

        // Recuperer la limite du plan
        if (subscription?.planId) {
          const plan = await getSubscriptionPlan(subscription.planId);
          limit = plan?.aiCallsLimit ?? 0;
        } else {
          limit = 0;
        }
      }

      const remaining = limit === -1 ? -1 : Math.max(0, limit - newUsage);

      // Verifier les seuils d'alerte
      let quotaWarning: 'approaching_limit' | 'limit_reached' | undefined;
      let quotaWarningMessage: string | undefined;

      if (limit > 0) {
        const usagePercent = newUsage / limit;

        if (newUsage >= limit) {
          quotaWarning = 'limit_reached';
          quotaWarningMessage = `Vous avez atteint votre limite de ${limit} appels IA ce mois-ci. Passez a un plan superieur pour continuer.`;

          // Envoyer une notification (async, ne pas attendre)
          sendQuotaAlert(providerId, 'limit_reached', newUsage, limit).catch(console.error);
        } else if (usagePercent >= QUOTA_WARNING_THRESHOLD) {
          quotaWarning = 'approaching_limit';
          quotaWarningMessage = `Vous avez utilise ${newUsage}/${limit} appels IA (${Math.round(usagePercent * 100)}%). Pensez a passer a un plan superieur.`;

          // Envoyer une notification si c'est exactement le seuil (80%)
          if (Math.abs(usagePercent - QUOTA_WARNING_THRESHOLD) < 0.05) {
            sendQuotaAlert(providerId, 'approaching_limit', newUsage, limit).catch(console.error);
          }
        }
      }

      return {
        success: true,
        newUsage,
        limit,
        remaining,
        quotaWarning,
        quotaWarningMessage
      } as AiUsageIncrementResult;

    } catch (error: any) {
      console.error('Error incrementing AI usage:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to increment usage');
    }
  });

/**
 * Envoie une alerte de quota (notification in-app)
 */
async function sendQuotaAlert(
  providerId: string,
  alertType: 'approaching_limit' | 'limit_reached',
  currentUsage: number,
  limit: number
): Promise<void> {
  try {
    const now = admin.firestore.Timestamp.now();

    await getDb().collection('notifications').add({
      userId: providerId,
      type: alertType === 'limit_reached' ? 'quota_exhausted' : 'quota_warning',
      title: alertType === 'limit_reached'
        ? 'Quota IA atteint'
        : 'Quota IA bientot atteint',
      message: alertType === 'limit_reached'
        ? `Vous avez utilise vos ${limit} appels IA ce mois-ci.`
        : `Vous avez utilise ${currentUsage}/${limit} appels IA (${Math.round((currentUsage / limit) * 100)}%).`,
      data: {
        currentUsage,
        limit,
        alertType
      },
      read: false,
      createdAt: now
    });

    console.log(`Quota alert sent to provider ${providerId}: ${alertType}`);
  } catch (error) {
    console.error('Error sending quota alert:', error);
  }
}

// ============================================================================
// CLOUD FUNCTION: GET SUBSCRIPTION DETAILS
// ============================================================================

/**
 * Retourne les details complets de l'abonnement d'un provider
 */
export const getSubscriptionDetails = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Verification de l'authentification
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = data?.providerId || context.auth.uid;

    try {
      // Recuperer toutes les donnees en parallele
      const [subDoc, usageDoc, invoicesSnapshot, trialConfig] = await Promise.all([
        getDb().doc(`subscriptions/${providerId}`).get(),
        getDb().doc(`ai_usage/${providerId}`).get(),
        getDb().collection('invoices')
          .where('providerId', '==', providerId)
          .orderBy('createdAt', 'desc')
          .limit(12) // 12 dernieres factures (1 an)
          .get(),
        getTrialConfig()
      ]);

      // Preparer l'usage
      const usage = usageDoc.exists
        ? {
            ...usageDoc.data(),
            currentPeriodStart: usageDoc.data()?.currentPeriodStart?.toDate?.() || null,
            currentPeriodEnd: usageDoc.data()?.currentPeriodEnd?.toDate?.() || null,
            lastCallAt: usageDoc.data()?.lastCallAt?.toDate?.() || null,
            updatedAt: usageDoc.data()?.updatedAt?.toDate?.() || null
          }
        : {
            providerId,
            subscriptionId: providerId,
            currentPeriodCalls: 0,
            trialCallsUsed: 0,
            totalCallsAllTime: 0,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            lastCallAt: null,
            updatedAt: null
          };

      // Preparer les factures
      const invoices = invoicesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          periodStart: data.periodStart?.toDate?.() || null,
          periodEnd: data.periodEnd?.toDate?.() || null,
          dueDate: data.dueDate?.toDate?.() || null,
          paidAt: data.paidAt?.toDate?.() || null,
          createdAt: data.createdAt?.toDate?.() || null
        };
      });

      // Pas d'abonnement
      if (!subDoc.exists) {
        return {
          subscription: null,
          plan: null,
          usage,
          invoices,
          canCancel: false,
          cancelAtPeriodEnd: false,
          nextBillingDate: null,
          trialConfig
        } as SubscriptionDetailsResult & { trialConfig: typeof trialConfig };
      }

      const subscriptionData = subDoc.data()!;

      // Convertir les timestamps en dates
      const subscription = {
        ...subscriptionData,
        trialStartedAt: subscriptionData.trialStartedAt?.toDate?.() || null,
        trialEndsAt: subscriptionData.trialEndsAt?.toDate?.() || null,
        currentPeriodStart: subscriptionData.currentPeriodStart?.toDate?.() || null,
        currentPeriodEnd: subscriptionData.currentPeriodEnd?.toDate?.() || null,
        canceledAt: subscriptionData.canceledAt?.toDate?.() || null,
        createdAt: subscriptionData.createdAt?.toDate?.() || null,
        updatedAt: subscriptionData.updatedAt?.toDate?.() || null
      };

      // Recuperer le plan
      const plan = subscriptionData.planId
        ? await getSubscriptionPlan(subscriptionData.planId)
        : null;

      // Determiner si peut annuler
      const canCancel = ['active', 'trialing', 'past_due'].includes(subscriptionData.status)
        && !subscriptionData.cancelAtPeriodEnd;

      // Prochaine date de facturation
      const nextBillingDate = subscriptionData.cancelAtPeriodEnd
        ? null
        : subscription.currentPeriodEnd;

      return {
        subscription,
        plan,
        usage,
        invoices,
        canCancel,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
        nextBillingDate,
        trialConfig
      } as SubscriptionDetailsResult & { trialConfig: typeof trialConfig };

    } catch (error: any) {
      console.error('Error getting subscription details:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to get subscription details');
    }
  });

// ============================================================================
// INTERNAL FUNCTION: CHECK AI ACCESS (for use by other cloud functions)
// ============================================================================

/**
 * Version interne de checkAiAccess pour utilisation par d'autres fonctions
 * Ne necessite pas de contexte d'authentification
 */
export async function checkAiAccessInternal(providerId: string): Promise<AiAccessCheckResult> {
  // 1. Verifier l'acces force
  const forcedAccess = await checkForcedAccess(providerId);

  if (forcedAccess.hasForcedAccess) {
    const usageDoc = await getDb().doc(`ai_usage/${providerId}`).get();
    const usage = usageDoc.exists ? usageDoc.data()! : { currentPeriodCalls: 0 };

    return {
      allowed: true,
      currentUsage: usage.currentPeriodCalls || 0,
      limit: -1,
      remaining: -1,
      isInTrial: false,
      subscriptionStatus: 'forced_access',
      canUpgrade: false,
      isForcedAccess: true,
      forcedAccessNote: forcedAccess.note
    };
  }

  // 2. Recuperer les donnees
  const [subDoc, usageDoc, trialConfig, gracePeriodDays] = await Promise.all([
    getDb().doc(`subscriptions/${providerId}`).get(),
    getDb().doc(`ai_usage/${providerId}`).get(),
    getTrialConfig(),
    getGracePeriodDays()
  ]);

  const usage = usageDoc.exists
    ? usageDoc.data()!
    : { currentPeriodCalls: 0, trialCallsUsed: 0 };

  // 3. Pas d'abonnement
  if (!subDoc.exists) {
    return {
      allowed: false,
      reason: 'no_subscription',
      currentUsage: 0,
      limit: 0,
      remaining: 0,
      isInTrial: false,
      subscriptionStatus: 'none',
      canUpgrade: true
    };
  }

  const subscription = subDoc.data()!;
  const status = subscription.status as SubscriptionStatus;
  const now = new Date();

  // P2 FIX: Check if AI access has been explicitly disabled
  if (subscription.aiAccessEnabled === false || subscription.aiAccessSuspended === true) {
    return {
      allowed: false,
      reason: 'payment_failed',
      currentUsage: usage.currentPeriodCalls || 0,
      limit: 0,
      remaining: 0,
      isInTrial: false,
      subscriptionStatus: status,
      canUpgrade: false
    };
  }

  // 4. Trial
  if (status === 'trialing') {
    const trialEndsAt = subscription.trialEndsAt?.toDate ? subscription.trialEndsAt.toDate() : null;
    const trialExpired = trialEndsAt && now > trialEndsAt;
    const trialCallsUsed = usage.trialCallsUsed || 0;
    const trialCallsExhausted = trialCallsUsed >= trialConfig.maxAiCalls;

    if (trialExpired || trialCallsExhausted) {
      return {
        allowed: false,
        reason: trialExpired ? 'trial_expired' : 'trial_calls_exhausted' as AiAccessDeniedReason,
        currentUsage: trialCallsUsed,
        limit: trialConfig.maxAiCalls,
        remaining: 0,
        isInTrial: true,
        subscriptionStatus: status,
        canUpgrade: true
      };
    }

    return {
      allowed: true,
      currentUsage: trialCallsUsed,
      limit: trialConfig.maxAiCalls,
      remaining: trialConfig.maxAiCalls - trialCallsUsed,
      isInTrial: true,
      subscriptionStatus: status,
      canUpgrade: true
    };
  }

  // 5. Active
  if (status === 'active') {
    const plan = await getSubscriptionPlan(subscription.planId);
    const limit = plan?.aiCallsLimit ?? 0;
    const currentPeriodCalls = usage.currentPeriodCalls || 0;

    if (limit === -1) {
      return {
        allowed: currentPeriodCalls < FAIR_USE_LIMIT,
        reason: currentPeriodCalls >= FAIR_USE_LIMIT ? 'quota_exhausted' : undefined,
        currentUsage: currentPeriodCalls,
        limit: -1,
        remaining: -1,
        isInTrial: false,
        subscriptionStatus: status,
        canUpgrade: false
      };
    }

    return {
      allowed: currentPeriodCalls < limit,
      reason: currentPeriodCalls >= limit ? 'quota_exhausted' : undefined,
      currentUsage: currentPeriodCalls,
      limit,
      remaining: Math.max(0, limit - currentPeriodCalls),
      isInTrial: false,
      subscriptionStatus: status,
      canUpgrade: subscription.tier !== 'unlimited'
    };
  }

  // 6. Past due (grace period)
  if (status === 'past_due') {
    // Utiliser pastDueSince si disponible, sinon fallback sur updatedAt
    const pastDueSince = subscription.pastDueSince?.toDate
      ? subscription.pastDueSince.toDate()
      : (subscription.updatedAt?.toDate ? subscription.updatedAt.toDate() : now);
    const daysPastDue = daysBetween(pastDueSince, now);

    if (daysPastDue < gracePeriodDays) {
      const plan = await getSubscriptionPlan(subscription.planId);
      const limit = plan?.aiCallsLimit ?? 0;
      const currentPeriodCalls = usage.currentPeriodCalls || 0;

      return {
        allowed: true,
        currentUsage: currentPeriodCalls,
        limit,
        remaining: limit === -1 ? -1 : Math.max(0, limit - currentPeriodCalls),
        isInTrial: false,
        subscriptionStatus: status,
        canUpgrade: false
      };
    }

    return {
      allowed: false,
      reason: 'payment_failed',
      currentUsage: usage.currentPeriodCalls || 0,
      limit: 0,
      remaining: 0,
      isInTrial: false,
      subscriptionStatus: status,
      canUpgrade: false
    };
  }

  // 7. Autres statuts
  return {
    allowed: false,
    reason: status === 'canceled' ? 'subscription_canceled' : 'subscription_expired',
    currentUsage: usage.currentPeriodCalls || 0,
    limit: 0,
    remaining: 0,
    isInTrial: false,
    subscriptionStatus: status,
    canUpgrade: true
  };
}

/**
 * Version interne de incrementAiUsage pour utilisation par d'autres fonctions
 */
export async function incrementAiUsageInternal(providerId: string): Promise<AiUsageIncrementResult> {
  const now = admin.firestore.Timestamp.now();

  const [subDoc, usageDoc, trialConfig] = await Promise.all([
    getDb().doc(`subscriptions/${providerId}`).get(),
    getDb().doc(`ai_usage/${providerId}`).get(),
    getTrialConfig()
  ]);

  const subscription = subDoc.exists ? subDoc.data()! : null;
  const isInTrial = subscription?.status === 'trialing';

  const usageRef = getDb().doc(`ai_usage/${providerId}`);

  if (!usageDoc.exists) {
    await usageRef.set({
      providerId,
      subscriptionId: providerId,
      currentPeriodCalls: isInTrial ? 0 : 1,
      trialCallsUsed: isInTrial ? 1 : 0,
      totalCallsAllTime: 1,
      currentPeriodStart: now,
      currentPeriodEnd: now,
      lastCallAt: now,
      updatedAt: now
    });

    const limit = isInTrial ? trialConfig.maxAiCalls : 0;
    return {
      success: true,
      newUsage: 1,
      limit,
      remaining: Math.max(0, limit - 1)
    };
  }

  const usage = usageDoc.data()!;
  let newUsage: number;
  let limit: number;

  if (isInTrial) {
    await usageRef.update({
      trialCallsUsed: admin.firestore.FieldValue.increment(1),
      totalCallsAllTime: admin.firestore.FieldValue.increment(1),
      lastCallAt: now,
      updatedAt: now
    });

    newUsage = (usage.trialCallsUsed || 0) + 1;
    limit = trialConfig.maxAiCalls;
  } else {
    await usageRef.update({
      currentPeriodCalls: admin.firestore.FieldValue.increment(1),
      totalCallsAllTime: admin.firestore.FieldValue.increment(1),
      lastCallAt: now,
      updatedAt: now
    });

    newUsage = (usage.currentPeriodCalls || 0) + 1;

    if (subscription?.planId) {
      const plan = await getSubscriptionPlan(subscription.planId);
      limit = plan?.aiCallsLimit ?? 0;
    } else {
      limit = 0;
    }
  }

  const remaining = limit === -1 ? -1 : Math.max(0, limit - newUsage);

  let quotaWarning: 'approaching_limit' | 'limit_reached' | undefined;
  let quotaWarningMessage: string | undefined;

  if (limit > 0) {
    const usagePercent = newUsage / limit;

    if (newUsage >= limit) {
      quotaWarning = 'limit_reached';
      quotaWarningMessage = `Limite de ${limit} appels IA atteinte.`;
      sendQuotaAlert(providerId, 'limit_reached', newUsage, limit).catch(console.error);
    } else if (usagePercent >= QUOTA_WARNING_THRESHOLD) {
      quotaWarning = 'approaching_limit';
      quotaWarningMessage = `${newUsage}/${limit} appels IA utilises.`;
    }
  }

  return {
    success: true,
    newUsage,
    limit,
    remaining,
    quotaWarning,
    quotaWarningMessage
  };
}

// ============================================================================
// P0 FIX: ATOMIC CHECK AND INCREMENT AI USAGE
// Résout la race condition entre checkAiAccess et incrementAiUsage
// ============================================================================

/**
 * Result of atomic check and increment operation
 */
export interface AtomicAiUsageResult {
  allowed: boolean;
  recorded: boolean;
  newUsage: number;
  limit: number;
  remaining: number;
  reason?: AiAccessDeniedReason;
  quotaWarning?: 'approaching_limit' | 'limit_reached';
  quotaWarningMessage?: string;
  isInTrial: boolean;
  subscriptionStatus: string;
}

/**
 * P0 FIX: Vérifie ET incrémente le quota IA de manière ATOMIQUE
 *
 * Cette fonction utilise une transaction Firestore pour garantir que:
 * 1. Le check du quota et l'incrément sont atomiques
 * 2. Deux appels concurrents ne peuvent pas dépasser le quota
 * 3. Le quota est vérifié AVANT l'incrément dans la même transaction
 *
 * IMPORTANT: Utilisez cette fonction au lieu de checkAiAccess + incrementAiUsage séparés
 *
 * @param providerId - ID du prestataire
 * @returns Promise<AtomicAiUsageResult> - Résultat atomique (allowed + recorded ou denied)
 */
export async function checkAndIncrementAiUsageAtomic(providerId: string): Promise<AtomicAiUsageResult> {
  const db = getDb();

  // 1. Vérifier d'abord l'accès forcé (pas besoin de transaction)
  const forcedAccess = await checkForcedAccess(providerId);

  if (forcedAccess.hasForcedAccess) {
    // Accès forcé: incrémenter sans vérification de quota
    const usageRef = db.doc(`ai_usage/${providerId}`);
    const now = admin.firestore.Timestamp.now();

    await usageRef.set({
      currentPeriodCalls: admin.firestore.FieldValue.increment(1),
      totalCallsAllTime: admin.firestore.FieldValue.increment(1),
      lastCallAt: now,
      updatedAt: now
    }, { merge: true });

    const usageDoc = await usageRef.get();
    const usage = usageDoc.data() || { currentPeriodCalls: 1 };

    return {
      allowed: true,
      recorded: true,
      newUsage: usage.currentPeriodCalls || 1,
      limit: -1,
      remaining: -1,
      isInTrial: false,
      subscriptionStatus: 'forced_access'
    };
  }

  // 2. Récupérer la config trial (peut être mis en cache)
  const trialConfig = await getTrialConfig();
  const gracePeriodDays = await getGracePeriodDays();

  // 3. Transaction atomique: check + increment
  return db.runTransaction(async (transaction) => {
    const subRef = db.doc(`subscriptions/${providerId}`);
    const usageRef = db.doc(`ai_usage/${providerId}`);

    // Lire les documents dans la transaction
    const [subDoc, usageDoc] = await Promise.all([
      transaction.get(subRef),
      transaction.get(usageRef)
    ]);

    const now = new Date();
    const firestoreNow = admin.firestore.Timestamp.now();

    // Pas d'abonnement
    if (!subDoc.exists) {
      return {
        allowed: false,
        recorded: false,
        newUsage: 0,
        limit: 0,
        remaining: 0,
        reason: 'no_subscription' as AiAccessDeniedReason,
        isInTrial: false,
        subscriptionStatus: 'none'
      };
    }

    const subscription = subDoc.data()!;
    const status = subscription.status as SubscriptionStatus;

    // Vérifier si l'accès est explicitement désactivé
    if (subscription.aiAccessEnabled === false || subscription.aiAccessSuspended === true) {
      return {
        allowed: false,
        recorded: false,
        newUsage: 0,
        limit: 0,
        remaining: 0,
        reason: 'payment_failed' as AiAccessDeniedReason,
        isInTrial: false,
        subscriptionStatus: status
      };
    }

    // Préparer les données d'usage
    const usage = usageDoc.exists
      ? usageDoc.data()!
      : { currentPeriodCalls: 0, trialCallsUsed: 0, totalCallsAllTime: 0 };

    // ========== TRIALING ==========
    if (status === 'trialing') {
      const trialEndsAt = subscription.trialEndsAt?.toDate ? subscription.trialEndsAt.toDate() : null;
      const trialExpired = trialEndsAt && now >= trialEndsAt;
      const trialCallsUsed = usage.trialCallsUsed || 0;

      if (trialExpired) {
        return {
          allowed: false,
          recorded: false,
          newUsage: trialCallsUsed,
          limit: trialConfig.maxAiCalls,
          remaining: 0,
          reason: 'trial_expired' as AiAccessDeniedReason,
          isInTrial: true,
          subscriptionStatus: status
        };
      }

      // P0 FIX: Vérifier AVANT l'incrément
      if (trialCallsUsed >= trialConfig.maxAiCalls) {
        return {
          allowed: false,
          recorded: false,
          newUsage: trialCallsUsed,
          limit: trialConfig.maxAiCalls,
          remaining: 0,
          reason: 'trial_calls_exhausted' as AiAccessDeniedReason,
          isInTrial: true,
          subscriptionStatus: status
        };
      }

      // OK: Incrémenter atomiquement
      const newTrialUsage = trialCallsUsed + 1;
      const updateData = {
        providerId,
        subscriptionId: providerId,
        trialCallsUsed: newTrialUsage,
        totalCallsAllTime: (usage.totalCallsAllTime || 0) + 1,
        lastCallAt: firestoreNow,
        updatedAt: firestoreNow
      };

      if (usageDoc.exists) {
        transaction.update(usageRef, updateData);
      } else {
        transaction.set(usageRef, {
          ...updateData,
          currentPeriodCalls: 0,
          currentPeriodStart: firestoreNow,
          currentPeriodEnd: firestoreNow
        });
      }

      const remaining = Math.max(0, trialConfig.maxAiCalls - newTrialUsage);
      return {
        allowed: true,
        recorded: true,
        newUsage: newTrialUsage,
        limit: trialConfig.maxAiCalls,
        remaining,
        isInTrial: true,
        subscriptionStatus: status,
        quotaWarning: newTrialUsage >= trialConfig.maxAiCalls ? 'limit_reached' : undefined,
        quotaWarningMessage: newTrialUsage >= trialConfig.maxAiCalls
          ? `Vous avez utilisé vos ${trialConfig.maxAiCalls} appels d'essai.`
          : undefined
      };
    }

    // ========== ACTIVE ==========
    if (status === 'active') {
      // Récupérer la limite du plan (hors transaction car read-only)
      const plan = subscription.planId
        ? await getSubscriptionPlan(subscription.planId)
        : null;
      const limit = plan?.aiCallsLimit ?? 0;
      const currentPeriodCalls = usage.currentPeriodCalls || 0;

      // Plan illimité (fair use)
      if (limit === -1) {
        if (currentPeriodCalls >= FAIR_USE_LIMIT) {
          return {
            allowed: false,
            recorded: false,
            newUsage: currentPeriodCalls,
            limit: -1,
            remaining: 0,
            reason: 'quota_exhausted' as AiAccessDeniedReason,
            isInTrial: false,
            subscriptionStatus: status
          };
        }

        // OK: Incrémenter
        const newUsage = currentPeriodCalls + 1;
        const updateData = {
          currentPeriodCalls: newUsage,
          totalCallsAllTime: (usage.totalCallsAllTime || 0) + 1,
          lastCallAt: firestoreNow,
          updatedAt: firestoreNow
        };

        if (usageDoc.exists) {
          transaction.update(usageRef, updateData);
        } else {
          transaction.set(usageRef, {
            providerId,
            subscriptionId: providerId,
            ...updateData,
            trialCallsUsed: 0,
            currentPeriodStart: firestoreNow,
            currentPeriodEnd: firestoreNow
          });
        }

        return {
          allowed: true,
          recorded: true,
          newUsage,
          limit: -1,
          remaining: Math.max(0, FAIR_USE_LIMIT - newUsage),
          isInTrial: false,
          subscriptionStatus: status
        };
      }

      // Plan avec limite fixe
      // P0 FIX: Vérifier AVANT l'incrément
      if (currentPeriodCalls >= limit) {
        return {
          allowed: false,
          recorded: false,
          newUsage: currentPeriodCalls,
          limit,
          remaining: 0,
          reason: 'quota_exhausted' as AiAccessDeniedReason,
          isInTrial: false,
          subscriptionStatus: status
        };
      }

      // OK: Incrémenter atomiquement
      const newUsage = currentPeriodCalls + 1;
      const updateData = {
        currentPeriodCalls: newUsage,
        totalCallsAllTime: (usage.totalCallsAllTime || 0) + 1,
        lastCallAt: firestoreNow,
        updatedAt: firestoreNow
      };

      if (usageDoc.exists) {
        transaction.update(usageRef, updateData);
      } else {
        transaction.set(usageRef, {
          providerId,
          subscriptionId: providerId,
          ...updateData,
          trialCallsUsed: 0,
          currentPeriodStart: firestoreNow,
          currentPeriodEnd: firestoreNow
        });
      }

      const remaining = Math.max(0, limit - newUsage);
      const usagePercent = newUsage / limit;

      let quotaWarning: 'approaching_limit' | 'limit_reached' | undefined;
      let quotaWarningMessage: string | undefined;

      if (newUsage >= limit) {
        quotaWarning = 'limit_reached';
        quotaWarningMessage = `Vous avez atteint votre limite de ${limit} appels IA ce mois-ci.`;
        // Envoyer alerte async (hors transaction)
        sendQuotaAlert(providerId, 'limit_reached', newUsage, limit).catch(console.error);
      } else if (usagePercent >= QUOTA_WARNING_THRESHOLD) {
        quotaWarning = 'approaching_limit';
        quotaWarningMessage = `Vous avez utilisé ${newUsage}/${limit} appels IA (${Math.round(usagePercent * 100)}%).`;
      }

      return {
        allowed: true,
        recorded: true,
        newUsage,
        limit,
        remaining,
        isInTrial: false,
        subscriptionStatus: status,
        quotaWarning,
        quotaWarningMessage
      };
    }

    // ========== PAST_DUE (grace period) ==========
    if (status === 'past_due') {
      const pastDueSince = subscription.pastDueSince?.toDate
        ? subscription.pastDueSince.toDate()
        : (subscription.updatedAt?.toDate ? subscription.updatedAt.toDate() : now);
      const daysPastDue = daysBetween(pastDueSince, now);

      if (daysPastDue >= gracePeriodDays) {
        return {
          allowed: false,
          recorded: false,
          newUsage: usage.currentPeriodCalls || 0,
          limit: 0,
          remaining: 0,
          reason: 'payment_failed' as AiAccessDeniedReason,
          isInTrial: false,
          subscriptionStatus: status
        };
      }

      // Grace period: autoriser mais avec les limites du plan
      const plan = subscription.planId
        ? await getSubscriptionPlan(subscription.planId)
        : null;
      const limit = plan?.aiCallsLimit ?? 0;
      const currentPeriodCalls = usage.currentPeriodCalls || 0;

      if (limit !== -1 && currentPeriodCalls >= limit) {
        return {
          allowed: false,
          recorded: false,
          newUsage: currentPeriodCalls,
          limit,
          remaining: 0,
          reason: 'quota_exhausted' as AiAccessDeniedReason,
          isInTrial: false,
          subscriptionStatus: status
        };
      }

      // OK: Incrémenter
      const newUsage = currentPeriodCalls + 1;
      const updateData = {
        currentPeriodCalls: newUsage,
        totalCallsAllTime: (usage.totalCallsAllTime || 0) + 1,
        lastCallAt: firestoreNow,
        updatedAt: firestoreNow
      };

      if (usageDoc.exists) {
        transaction.update(usageRef, updateData);
      } else {
        transaction.set(usageRef, {
          providerId,
          subscriptionId: providerId,
          ...updateData,
          trialCallsUsed: 0,
          currentPeriodStart: firestoreNow,
          currentPeriodEnd: firestoreNow
        });
      }

      return {
        allowed: true,
        recorded: true,
        newUsage,
        limit,
        remaining: limit === -1 ? -1 : Math.max(0, limit - newUsage),
        isInTrial: false,
        subscriptionStatus: status
      };
    }

    // ========== Autres statuts (canceled, expired, paused, suspended) ==========
    const reason: AiAccessDeniedReason =
      status === 'canceled' ? 'subscription_canceled' :
      status === 'suspended' ? 'payment_failed' :
      'subscription_expired';

    return {
      allowed: false,
      recorded: false,
      newUsage: usage.currentPeriodCalls || 0,
      limit: 0,
      remaining: 0,
      reason,
      isInTrial: false,
      subscriptionStatus: status
    };
  });
}

/**
 * Cloud Function exposant checkAndIncrementAiUsageAtomic
 * P0 FIX: Nouvelle fonction atomique pour remplacer check + increment séparés
 */
export const checkAndIncrementAiUsage = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const providerId = data?.providerId || context.auth.uid;

    try {
      return await checkAndIncrementAiUsageAtomic(providerId);
    } catch (error: any) {
      console.error('Error in checkAndIncrementAiUsage:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to check and increment AI usage');
    }
  });
