/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SOS-Expat Subscription Admin Functions
 * Fonctions d'administration pour gerer les abonnements IA des prestataires
 *
 * Toutes les fonctions requierent role='admin' dans les custom claims ou Firestore
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { MailwizzAPI } from '../emailMarketing/utils/mailwizz';
import { getLanguageCode } from '../emailMarketing/config';
import {
  adminForceAccessSchema,
  adminChangePlanSchema,
  adminResetQuotaSchema,
  validateInput,
} from './validation';
// P0 FIX: Use centralized secrets
import { getStripeSecretKey, getStripeMode } from '../lib/secrets';

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

// Lazy Stripe initialization - P0 FIX: Use centralized secrets
let stripe: Stripe | null = null;
function getStripe(): Stripe {
  ensureInitialized();
  if (!stripe) {
    const secretKey = getStripeSecretKey();
    if (!secretKey) {
      throw new Error('Stripe secret key not configured');
    }
    console.log(`🔑 adminFunctions: Stripe initialized in ${getStripeMode().toUpperCase()} mode`);
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });
  }
  return stripe;
}

// Lazy db initialization
const getDb = () => {
  ensureInitialized();
  return admin.firestore();
};

// ============================================================================
// TYPES
// ============================================================================

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'paused';

interface AdminActionLog {
  adminId: string;
  action: string;
  targetId: string;
  targetType: 'provider' | 'subscription' | 'plan' | 'system';
  details: Record<string, any>;
  timestamp: admin.firestore.Timestamp;
  success: boolean;
  error?: string;
}

interface SubscriptionPlan {
  id: string;
  tier: string;
  providerType: 'lawyer' | 'expat_aidant';
  pricing: { EUR: number; USD: number };
  annualPricing?: { EUR: number; USD: number };
  aiCallsLimit: number;
  stripePriceId: { EUR: string; USD: string };
  stripePriceIdAnnual?: { EUR: string; USD: string };
  isActive: boolean;
  name?: Record<string, string>;
  description?: Record<string, string>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verifie si l'utilisateur est admin (via custom claims OU Firestore role)
 */
async function isAdmin(context: functions.https.CallableContext): Promise<boolean> {
  if (!context.auth) return false;

  // Check custom claims first (faster)
  if (context.auth.token.admin === true || context.auth.token.role === 'admin') {
    return true;
  }

  // Fallback: check Firestore user document
  try {
    const userDoc = await getDb().collection('users').doc(context.auth.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData?.role === 'admin' || userData?.isAdmin === true;
    }
  } catch (e) {
    console.error('Error checking admin in Firestore:', e);
  }

  return false;
}

/**
 * Log une action admin dans la collection admin_actions
 */
async function logAdminAction(
  adminId: string,
  action: string,
  targetId: string,
  targetType: AdminActionLog['targetType'],
  details: Record<string, any>,
  success: boolean,
  error?: string
): Promise<void> {
  const logEntry: AdminActionLog = {
    adminId,
    action,
    targetId,
    targetType,
    details,
    timestamp: admin.firestore.Timestamp.now(),
    success,
    error: error || undefined,
  };

  try {
    await getDb().collection('admin_actions').add(logEntry);
    console.log(`[AdminAction] ${action} on ${targetType}/${targetId} by ${adminId} - ${success ? 'SUCCESS' : 'FAILED'}`);
  } catch (logError) {
    console.error('Failed to log admin action:', logError);
  }
}

/**
 * Recupere le plan d'abonnement par ID
 */
async function getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const planDoc = await getDb().doc(`subscription_plans/${planId}`).get();
  if (!planDoc.exists) return null;
  return { id: planDoc.id, ...planDoc.data() } as SubscriptionPlan;
}

/**
 * Envoie un email transactionnel au provider
 */
async function sendProviderEmail(
  providerId: string,
  templateBase: string,
  customFields: Record<string, string>
): Promise<void> {
  try {
    const providerDoc = await getDb().collection('users').doc(providerId).get();
    if (!providerDoc.exists) {
      console.warn(`Provider not found for email: ${providerId}`);
      return;
    }

    const provider = providerDoc.data();
    const lang = getLanguageCode(
      provider?.language || provider?.preferredLanguage || provider?.lang || 'en'
    );

    const mailwizz = new MailwizzAPI();
    await mailwizz.sendTransactional({
      to: provider?.email || '',
      template: `${templateBase}_${lang}`,
      customFields: {
        FNAME: provider?.firstName || provider?.name || '',
        ...customFields,
      },
    });

    console.log(`Email sent to provider ${providerId}: ${templateBase}`);
  } catch (emailError) {
    console.error(`Failed to send email to provider ${providerId}:`, emailError);
    // Ne pas throw - l'email est secondaire
  }
}

// ============================================================================
// 1. ADMIN FORCE AI ACCESS
// ============================================================================

/**
 * Force ou revoque l'acces IA gratuit pour un provider
 * Bypass les restrictions d'abonnement
 */
export const adminForceAiAccess = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Verification admin
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;

    // Validation with Zod
    const { providerId, enabled, durationDays, note } = validateInput(adminForceAccessSchema, data);

    try {
      const userRef = getDb().doc(`users/${providerId}`);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await logAdminAction(adminId, 'adminForceAiAccess', providerId, 'provider', { enabled, error: 'not_found' }, false, 'Provider not found');
        throw new functions.https.HttpsError('not-found', 'Provider not found');
      }

      const now = admin.firestore.Timestamp.now();
      const updateData: Record<string, any> = {
        forcedAiAccess: enabled,
        updatedAt: now,
      };

      if (enabled) {
        updateData.freeAccessGrantedBy = adminId;
        updateData.freeAccessGrantedAt = now;
        updateData.freeAccessNote = note || 'Acces gratuit accorde par administrateur';

        // Si durationDays est specifie, calculer freeTrialUntil
        if (durationDays && durationDays > 0) {
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + durationDays);
          updateData.freeTrialUntil = admin.firestore.Timestamp.fromDate(trialEnd);
        } else {
          // Acces illimite
          updateData.freeTrialUntil = null;
        }
      } else {
        updateData.freeAccessRevokedBy = adminId;
        updateData.freeAccessRevokedAt = now;
        updateData.forcedAiAccess = false;
      }

      await userRef.update(updateData);

      await logAdminAction(
        adminId,
        'adminForceAiAccess',
        providerId,
        'provider',
        { enabled, durationDays, note },
        true
      );

      console.log(`[adminForceAiAccess] ${enabled ? 'Granted' : 'Revoked'} for provider ${providerId} by admin ${adminId}`);

      return {
        success: true,
        providerId,
        forcedAiAccess: enabled,
        freeTrialUntil: enabled && durationDays ? updateData.freeTrialUntil : null,
        message: enabled
          ? `Acces IA gratuit accorde${durationDays ? ` pour ${durationDays} jours` : ' (illimite)'}`
          : 'Acces IA gratuit revoque',
      };
    } catch (error: any) {
      if (!(error instanceof functions.https.HttpsError)) {
        await logAdminAction(adminId, 'adminForceAiAccess', providerId, 'provider', { enabled }, false, error.message);
      }
      console.error('Error in adminForceAiAccess:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to update access');
    }
  });

// ============================================================================
// 2. ADMIN RESET QUOTA
// ============================================================================

/**
 * Reset le quota d'appels IA pour un provider
 */
export const adminResetQuota = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;

    // Validation with Zod
    const { providerId } = validateInput(adminResetQuotaSchema, data);

    try {
      const usageRef = getDb().doc(`ai_usage/${providerId}`);
      const usageDoc = await usageRef.get();

      const now = admin.firestore.Timestamp.now();
      const previousCalls = usageDoc.exists ? (usageDoc.data()?.currentPeriodCalls || 0) : 0;

      await usageRef.set({
        currentPeriodCalls: 0,
        lastResetAt: now,
        lastResetBy: adminId,
        updatedAt: now,
      }, { merge: true });

      await logAdminAction(
        adminId,
        'adminResetQuota',
        providerId,
        'provider',
        { previousCalls, newCalls: 0 },
        true
      );

      console.log(`[adminResetQuota] Reset quota for provider ${providerId}: ${previousCalls} -> 0`);

      // Recuperer le nouvel etat
      const updatedDoc = await usageRef.get();
      const updatedData = updatedDoc.data() || {};

      return {
        success: true,
        providerId,
        previousCalls,
        currentPeriodCalls: 0,
        resetAt: now.toDate().toISOString(),
        usage: {
          currentPeriodCalls: updatedData.currentPeriodCalls || 0,
          currentPeriodStart: updatedData.currentPeriodStart?.toDate?.() || null,
          currentPeriodEnd: updatedData.currentPeriodEnd?.toDate?.() || null,
          totalCallsAllTime: updatedData.totalCallsAllTime || 0,
        },
      };
    } catch (error: any) {
      await logAdminAction(adminId, 'adminResetQuota', providerId, 'provider', {}, false, error.message);
      console.error('Error in adminResetQuota:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to reset quota');
    }
  });

// ============================================================================
// 3. ADMIN CHANGE PLAN
// ============================================================================

/**
 * Change le plan d'abonnement d'un provider
 * immediate=true: changement immediat avec prorata
 * immediate=false: programmé à la fin de la période
 */
export const adminChangePlan = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;

    // Validation with Zod
    const { providerId, newPlanId, immediate } = validateInput(adminChangePlanSchema, data);

    try {
      // Verifier que le nouveau plan existe
      const newPlan = await getSubscriptionPlan(newPlanId);
      if (!newPlan || !newPlan.isActive) {
        throw new functions.https.HttpsError('not-found', 'Plan not found or inactive');
      }

      // Recuperer l'abonnement actuel
      const subDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists || !subDoc.data()?.stripeSubscriptionId) {
        throw new functions.https.HttpsError('not-found', 'No active subscription found');
      }

      const subData = subDoc.data()!;
      const currency = (subData.currency as 'EUR' | 'USD') || 'EUR';
      const oldPlanId = subData.planId;

      // Recuperer l'abonnement Stripe
      const stripeSubscription = await getStripe().subscriptions.retrieve(subData.stripeSubscriptionId);
      const subscriptionItemId = stripeSubscription.items.data[0]?.id;

      if (!subscriptionItemId) {
        throw new functions.https.HttpsError('internal', 'No subscription item found');
      }

      // Preparer la mise a jour Stripe
      const priceId = newPlan.stripePriceId[currency];
      if (!priceId) {
        throw new functions.https.HttpsError('invalid-argument', `No price configured for ${currency}`);
      }

      if (immediate) {
        // Changement immediat avec prorata
        await getStripe().subscriptions.update(
          subData.stripeSubscriptionId,
          {
            items: [{
              id: subscriptionItemId,
              price: priceId,
            }],
            proration_behavior: 'create_prorations',
            metadata: {
              planId: newPlanId,
              changedBy: adminId,
              changedAt: new Date().toISOString(),
            },
          }
        );
      } else {
        // Programmer le changement a la fin de la periode
        // Pour changer le plan a la fin de la periode, on utilise update avec proration 'none'
        // et on stocke l'info dans les metadata + Firestore
        await getStripe().subscriptions.update(
          subData.stripeSubscriptionId,
          {
            cancel_at_period_end: false,
            metadata: {
              scheduledPlanId: newPlanId,
              scheduledPriceId: priceId,
              scheduledBy: adminId,
              scheduledAt: new Date().toISOString(),
              scheduledChangeDate: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            },
          }
        );
      }

      // Mettre a jour Firestore
      const now = admin.firestore.Timestamp.now();
      await getDb().doc(`subscriptions/${providerId}`).update({
        ...(immediate ? {
          planId: newPlanId,
          tier: newPlan.tier,
          stripePriceId: priceId,
          currentPeriodAmount: newPlan.pricing[currency],
        } : {
          scheduledPlanId: newPlanId,
          scheduledPlanChange: true,
        }),
        lastModifiedBy: adminId,
        updatedAt: now,
      });

      // Logger dans subscription_logs
      await getDb().collection('subscription_logs').add({
        providerId,
        action: 'plan_changed',
        oldPlanId,
        newPlanId,
        immediate,
        changedBy: adminId,
        timestamp: now,
        stripeSubscriptionId: subData.stripeSubscriptionId,
      });

      await logAdminAction(
        adminId,
        'adminChangePlan',
        providerId,
        'subscription',
        { oldPlanId, newPlanId, immediate },
        true
      );

      // Envoyer notification au provider
      await sendProviderEmail(providerId, 'TR_PRV_subscription-plan-changed', {
        OLD_PLAN: oldPlanId,
        NEW_PLAN: newPlanId,
        CHANGE_DATE: immediate ? 'immediatement' : 'a la fin de votre periode',
        NEW_PRICE: `${newPlan.pricing[currency]} ${currency}`,
      });

      console.log(`[adminChangePlan] Changed plan for ${providerId}: ${oldPlanId} -> ${newPlanId} (immediate: ${immediate})`);

      return {
        success: true,
        providerId,
        oldPlanId,
        newPlanId,
        immediate,
        effectiveDate: immediate
          ? new Date().toISOString()
          : new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      };
    } catch (error: any) {
      await logAdminAction(adminId, 'adminChangePlan', providerId, 'subscription', { newPlanId, immediate }, false, error.message);
      console.error('Error in adminChangePlan:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to change plan');
    }
  });

// ============================================================================
// 4. ADMIN CANCEL SUBSCRIPTION
// ============================================================================

/**
 * Annule l'abonnement d'un provider
 * immediate=true: annulation immediate
 * immediate=false: cancel_at_period_end=true
 */
export const adminCancelSubscription = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;
    const { providerId, immediate = false, reason } = data as {
      providerId: string;
      immediate?: boolean;
      reason?: string;
    };

    if (!providerId) {
      throw new functions.https.HttpsError('invalid-argument', 'providerId is required');
    }

    try {
      const subDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists || !subDoc.data()?.stripeSubscriptionId) {
        throw new functions.https.HttpsError('not-found', 'No active subscription found');
      }

      const subData = subDoc.data()!;
      const stripeSubscriptionId = subData.stripeSubscriptionId;

      const now = admin.firestore.Timestamp.now();
      let canceledAt: Date;

      if (immediate) {
        // Annulation immediate
        await getStripe().subscriptions.cancel(stripeSubscriptionId, {
          prorate: true, // Remboursement prorata
        });

        canceledAt = new Date();

        await getDb().doc(`subscriptions/${providerId}`).update({
          status: 'canceled',
          cancelAtPeriodEnd: false,
          canceledAt: now,
          canceledBy: adminId,
          cancelReason: reason || 'admin_canceled',
          updatedAt: now,
        });
      } else {
        // Annulation a la fin de la periode
        await getStripe().subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            cancel_reason: reason || 'admin_canceled',
            canceled_by: adminId,
          },
        });

        const subscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
        canceledAt = new Date(subscription.current_period_end * 1000);

        await getDb().doc(`subscriptions/${providerId}`).update({
          cancelAtPeriodEnd: true,
          canceledAt: now,
          canceledBy: adminId,
          cancelReason: reason || 'admin_canceled',
          updatedAt: now,
        });
      }

      // Logger dans subscription_logs
      await getDb().collection('subscription_logs').add({
        providerId,
        action: 'subscription_canceled',
        immediate,
        reason: reason || 'admin_canceled',
        canceledBy: adminId,
        timestamp: now,
        stripeSubscriptionId,
        effectiveCancelDate: admin.firestore.Timestamp.fromDate(canceledAt),
      });

      await logAdminAction(
        adminId,
        'adminCancelSubscription',
        providerId,
        'subscription',
        { immediate, reason, stripeSubscriptionId },
        true
      );

      // Envoyer email au provider
      await sendProviderEmail(providerId, 'TR_PRV_subscription-canceled', {
        CANCEL_DATE: canceledAt.toLocaleDateString('fr-FR'),
        REASON: reason || 'Annulation par administrateur',
        IMMEDIATE: immediate ? 'oui' : 'non',
      });

      console.log(`[adminCancelSubscription] Canceled subscription for ${providerId} (immediate: ${immediate})`);

      return {
        success: true,
        providerId,
        immediate,
        effectiveCancelDate: canceledAt.toISOString(),
        reason: reason || 'admin_canceled',
      };
    } catch (error: any) {
      await logAdminAction(adminId, 'adminCancelSubscription', providerId, 'subscription', { immediate, reason }, false, error.message);
      console.error('Error in adminCancelSubscription:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to cancel subscription');
    }
  });

// ============================================================================
// 5. ADMIN GET SUBSCRIPTION STATS
// ============================================================================

/**
 * Recupere les statistiques globales des abonnements
 */
export const adminGetSubscriptionStats = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;

    try {
      const db = getDb();

      // Compter par statut
      const subscriptionsSnapshot = await db.collection('subscriptions').get();

      const statusCounts: Record<SubscriptionStatus, number> = {
        active: 0,
        trialing: 0,
        past_due: 0,
        canceled: 0,
        expired: 0,
        paused: 0,
      };

      const planCounts: Record<string, number> = {};
      let totalMonthlyRevenue = 0;
      let canceledLastMonth = 0;
      let activeLastMonth = 0;

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      subscriptionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const status = (data.status as SubscriptionStatus) || 'expired';

        // Comptage par statut
        if (statusCounts[status] !== undefined) {
          statusCounts[status]++;
        }

        // Comptage par plan
        const planId = data.planId || 'unknown';
        planCounts[planId] = (planCounts[planId] || 0) + 1;

        // Revenue mensuel estime (abonnements actifs)
        if (status === 'active' && data.currentPeriodAmount) {
          const amount = data.billingPeriod === 'yearly'
            ? data.currentPeriodAmount / 12
            : data.currentPeriodAmount;
          totalMonthlyRevenue += amount;
        }

        // Calcul du churn rate
        const createdAt = data.createdAt?.toDate?.();
        const canceledAt = data.canceledAt?.toDate?.();

        if (createdAt && createdAt < oneMonthAgo && status !== 'canceled') {
          activeLastMonth++;
        }

        if (canceledAt && canceledAt > oneMonthAgo) {
          canceledLastMonth++;
        }
      });

      // Churn rate = (canceled in period / active at start of period) * 100
      const churnRate = activeLastMonth > 0
        ? Math.round((canceledLastMonth / activeLastMonth) * 10000) / 100
        : 0;

      // Recuperer les plans pour les noms
      const plansSnapshot = await db.collection('subscription_plans').get();
      const planNames: Record<string, string> = {};
      plansSnapshot.forEach((doc) => {
        const data = doc.data();
        planNames[doc.id] = data.name?.fr || data.tier || doc.id;
      });

      // Formater les comptages par plan avec les noms
      const planCountsWithNames: Array<{ planId: string; name: string; count: number }> = [];
      for (const [planId, count] of Object.entries(planCounts)) {
        planCountsWithNames.push({
          planId,
          name: planNames[planId] || planId,
          count,
        });
      }
      planCountsWithNames.sort((a, b) => b.count - a.count);

      await logAdminAction(adminId, 'adminGetSubscriptionStats', 'system', 'system', {}, true);

      return {
        success: true,
        stats: {
          byStatus: statusCounts,
          byPlan: planCountsWithNames,
          totalSubscriptions: subscriptionsSnapshot.size,
          activeSubscriptions: statusCounts.active + statusCounts.trialing,
          monthlyRecurringRevenue: Math.round(totalMonthlyRevenue * 100) / 100,
          annualRecurringRevenue: Math.round(totalMonthlyRevenue * 12 * 100) / 100,
          churnRate,
          canceledLastMonth,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      await logAdminAction(adminId, 'adminGetSubscriptionStats', 'system', 'system', {}, false, error.message);
      console.error('Error in adminGetSubscriptionStats:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to get stats');
    }
  });

// ============================================================================
// 6. ADMIN SYNC STRIPE PRICES
// ============================================================================

/**
 * Synchronise les plans Firestore avec Stripe
 * Cree les produits/prix manquants dans Stripe
 */
export const adminSyncStripePrices = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;

    try {
      const db = getDb();
      const stripeClient = getStripe();

      // Recuperer tous les plans actifs
      const plansSnapshot = await db.collection('subscription_plans')
        .where('isActive', '==', true)
        .get();

      if (plansSnapshot.empty) {
        return { success: false, message: 'No active plans found' };
      }

      const results: Array<{
        planId: string;
        action: 'created' | 'updated' | 'skipped';
        monthlyPrices?: { EUR: string; USD: string };
        annualPrices?: { EUR: string; USD: string };
        productId?: string;
        error?: string;
      }> = [];

      for (const planDoc of plansSnapshot.docs) {
        const plan = planDoc.data();
        const planId = planDoc.id;

        try {
          let productId: string | undefined;
          const hasMonthlyPrices = plan.stripePriceId?.EUR && plan.stripePriceId?.USD;
          const hasAnnualPrices = plan.stripePriceIdAnnual?.EUR && plan.stripePriceIdAnnual?.USD;

          // Si le plan a deja des prix, recuperer le produit
          if (hasMonthlyPrices) {
            try {
              const existingPrice = await stripeClient.prices.retrieve(plan.stripePriceId.EUR);
              productId = existingPrice.product as string;
            } catch {
              // Prix invalide, on va le recreer
            }
          }

          // Creer le produit si necessaire
          if (!productId) {
            const product = await stripeClient.products.create({
              name: `${plan.name?.fr || planId} - ${plan.providerType === 'lawyer' ? 'Avocat' : 'Expatrie'}`,
              description: plan.description?.fr || `Plan ${plan.tier}`,
              metadata: {
                planId,
                providerType: plan.providerType,
                tier: plan.tier,
              },
            });
            productId = product.id;
          }

          const updates: Record<string, any> = {
            updatedAt: admin.firestore.Timestamp.now(),
          };

          // Creer les prix mensuels si manquants
          if (!hasMonthlyPrices && plan.pricing) {
            const monthlyEUR = await stripeClient.prices.create({
              product: productId,
              unit_amount: Math.round(plan.pricing.EUR * 100),
              currency: 'eur',
              recurring: { interval: 'month' },
              metadata: { planId, billingPeriod: 'monthly' },
              nickname: `${plan.name?.fr || planId} - Mensuel EUR`,
            });

            const monthlyUSD = await stripeClient.prices.create({
              product: productId,
              unit_amount: Math.round(plan.pricing.USD * 100),
              currency: 'usd',
              recurring: { interval: 'month' },
              metadata: { planId, billingPeriod: 'monthly' },
              nickname: `${plan.name?.fr || planId} - Mensuel USD`,
            });

            updates.stripePriceId = { EUR: monthlyEUR.id, USD: monthlyUSD.id };
          }

          // Creer les prix annuels si manquants
          if (!hasAnnualPrices && plan.pricing) {
            const annualDiscount = plan.annualDiscountPercent || 20;
            const annualEURAmount = plan.annualPricing?.EUR || Math.round(plan.pricing.EUR * 12 * (1 - annualDiscount / 100) * 100) / 100;
            const annualUSDAmount = plan.annualPricing?.USD || Math.round(plan.pricing.USD * 12 * (1 - annualDiscount / 100) * 100) / 100;

            const annualEUR = await stripeClient.prices.create({
              product: productId,
              unit_amount: Math.round(annualEURAmount * 100),
              currency: 'eur',
              recurring: { interval: 'year' },
              metadata: { planId, billingPeriod: 'yearly', discountPercent: String(annualDiscount) },
              nickname: `${plan.name?.fr || planId} - Annuel EUR`,
            });

            const annualUSD = await stripeClient.prices.create({
              product: productId,
              unit_amount: Math.round(annualUSDAmount * 100),
              currency: 'usd',
              recurring: { interval: 'year' },
              metadata: { planId, billingPeriod: 'yearly', discountPercent: String(annualDiscount) },
              nickname: `${plan.name?.fr || planId} - Annuel USD`,
            });

            updates.stripePriceIdAnnual = { EUR: annualEUR.id, USD: annualUSD.id };
            updates.annualPricing = { EUR: annualEURAmount, USD: annualUSDAmount };
          }

          // Mettre a jour Firestore si des modifications
          if (Object.keys(updates).length > 1) {
            await db.doc(`subscription_plans/${planId}`).update(updates);

            results.push({
              planId,
              action: 'created',
              productId,
              monthlyPrices: updates.stripePriceId,
              annualPrices: updates.stripePriceIdAnnual,
            });
          } else {
            results.push({
              planId,
              action: 'skipped',
              productId,
            });
          }
        } catch (planError: any) {
          results.push({
            planId,
            action: 'skipped',
            error: planError.message,
          });
        }
      }

      const created = results.filter((r) => r.action === 'created').length;
      const skipped = results.filter((r) => r.action === 'skipped').length;
      const errors = results.filter((r) => r.error).length;

      await logAdminAction(adminId, 'adminSyncStripePrices', 'system', 'system', {
        created,
        skipped,
        errors,
      }, true);

      console.log(`[adminSyncStripePrices] Synced: ${created} created, ${skipped} skipped, ${errors} errors`);

      return {
        success: true,
        message: `Synchronisation terminee: ${created} crees, ${skipped} ignores, ${errors} erreurs`,
        results,
      };
    } catch (error: any) {
      await logAdminAction(adminId, 'adminSyncStripePrices', 'system', 'system', {}, false, error.message);
      console.error('Error in adminSyncStripePrices:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to sync prices');
    }
  });

// ============================================================================
// 7. ADMIN GET PROVIDER SUBSCRIPTION HISTORY
// ============================================================================

/**
 * Recupere l'historique complet des abonnements d'un provider
 */
export const adminGetProviderSubscriptionHistory = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;
    const { providerId } = data as { providerId: string };

    if (!providerId) {
      throw new functions.https.HttpsError('invalid-argument', 'providerId is required');
    }

    try {
      const db = getDb();

      // Recuperer l'abonnement actuel
      const subDoc = await db.doc(`subscriptions/${providerId}`).get();
      const currentSubscription = subDoc.exists ? { id: subDoc.id, ...subDoc.data() } : null;

      // Recuperer l'historique des logs
      const logsSnapshot = await db.collection('subscription_logs')
        .where('providerId', '==', providerId)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

      const logs = logsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
      }));

      // Recuperer les factures
      const invoicesSnapshot = await db.collection('invoices')
        .where('providerId', '==', providerId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const invoices = invoicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        paidAt: doc.data().paidAt?.toDate?.()?.toISOString() || null,
      }));

      // Recuperer l'usage AI
      const usageDoc = await db.doc(`ai_usage/${providerId}`).get();
      const aiUsage = usageDoc.exists ? usageDoc.data() : null;

      // Recuperer les records de dunning (si applicable)
      const dunningSnapshot = await db.collection('subscription_dunning')
        .where('userId', '==', providerId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const dunningRecords = dunningSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Recuperer les actions admin sur ce provider
      const adminActionsSnapshot = await db.collection('admin_actions')
        .where('targetId', '==', providerId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      const adminActions = adminActionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null,
      }));

      await logAdminAction(adminId, 'adminGetProviderSubscriptionHistory', providerId, 'provider', {}, true);

      return {
        success: true,
        providerId,
        currentSubscription,
        subscriptionLogs: logs,
        invoices,
        aiUsage,
        dunningRecords,
        adminActions,
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      await logAdminAction(adminId, 'adminGetProviderSubscriptionHistory', providerId, 'provider', {}, false, error.message);
      console.error('Error in adminGetProviderSubscriptionHistory:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Failed to get history');
    }
  });

// ============================================================================
// 8. ADMIN PAUSE SUBSCRIPTION (P0 FIX)
// ============================================================================

/**
 * Met en pause l'abonnement d'un provider
 * L'acces IA est desactive mais l'abonnement n'est pas annule
 */
export const adminPauseSubscription = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;
    const { providerId, reason } = data as {
      providerId: string;
      reason?: string;
    };

    if (!providerId) {
      throw new functions.https.HttpsError('invalid-argument', 'providerId is required');
    }

    try {
      const subDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No subscription found');
      }

      const subData = subDoc.data()!;
      if (subData.status === 'paused') {
        throw new functions.https.HttpsError('failed-precondition', 'Subscription is already paused');
      }

      const now = admin.firestore.Timestamp.now();

      // Si l'abonnement a un stripeSubscriptionId, mettre en pause sur Stripe
      if (subData.stripeSubscriptionId) {
        try {
          await getStripe().subscriptions.update(subData.stripeSubscriptionId, {
            pause_collection: {
              behavior: 'keep_as_draft', // Pas de facturation pendant la pause
            },
            metadata: {
              paused_by: adminId,
              paused_at: new Date().toISOString(),
              pause_reason: reason || 'admin_paused',
            },
          });
        } catch (stripeError: any) {
          console.warn('Stripe pause failed, continuing with Firestore update:', stripeError.message);
        }
      }

      // Mettre a jour Firestore
      await getDb().doc(`subscriptions/${providerId}`).update({
        status: 'paused',
        pausedAt: now,
        pausedBy: adminId,
        pauseReason: reason || 'admin_paused',
        previousStatus: subData.status,
        updatedAt: now,
      });

      // Logger dans subscription_logs
      await getDb().collection('subscription_logs').add({
        providerId,
        action: 'subscription_paused',
        reason: reason || 'admin_paused',
        pausedBy: adminId,
        timestamp: now,
        stripeSubscriptionId: subData.stripeSubscriptionId || null,
      });

      await logAdminAction(
        adminId,
        'adminPauseSubscription',
        providerId,
        'subscription',
        { reason, stripeSubscriptionId: subData.stripeSubscriptionId },
        true
      );

      // Envoyer email au provider
      await sendProviderEmail(providerId, 'TR_PRV_subscription-paused', {
        PAUSE_DATE: new Date().toLocaleDateString('fr-FR'),
        REASON: reason || 'Mise en pause par administrateur',
      });

      console.log(`[adminPauseSubscription] Paused subscription for ${providerId}`);

      return {
        success: true,
        providerId,
        status: 'paused',
        pausedAt: now.toDate().toISOString(),
        reason: reason || 'admin_paused',
      };
    } catch (error: any) {
      if (!(error instanceof functions.https.HttpsError)) {
        await logAdminAction(adminId, 'adminPauseSubscription', providerId, 'subscription', { reason }, false, error.message);
      }
      console.error('Error in adminPauseSubscription:', error);
      throw error instanceof functions.https.HttpsError
        ? error
        : new functions.https.HttpsError('internal', error.message || 'Failed to pause subscription');
    }
  });

// ============================================================================
// 9. ADMIN RESUME SUBSCRIPTION (P0 FIX)
// ============================================================================

/**
 * Reprend un abonnement en pause
 */
export const adminResumeSubscription = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!await isAdmin(context)) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;
    const { providerId, note } = data as {
      providerId: string;
      note?: string;
    };

    if (!providerId) {
      throw new functions.https.HttpsError('invalid-argument', 'providerId is required');
    }

    try {
      const subDoc = await getDb().doc(`subscriptions/${providerId}`).get();
      if (!subDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No subscription found');
      }

      const subData = subDoc.data()!;
      if (subData.status !== 'paused') {
        throw new functions.https.HttpsError('failed-precondition', 'Subscription is not paused');
      }

      const now = admin.firestore.Timestamp.now();
      const newStatus = subData.previousStatus || 'active';

      // Si l'abonnement a un stripeSubscriptionId, reprendre sur Stripe
      if (subData.stripeSubscriptionId) {
        try {
          await getStripe().subscriptions.update(subData.stripeSubscriptionId, {
            pause_collection: null, // Reprendre la facturation
            metadata: {
              resumed_by: adminId,
              resumed_at: new Date().toISOString(),
            },
          });
        } catch (stripeError: any) {
          console.warn('Stripe resume failed, continuing with Firestore update:', stripeError.message);
        }
      }

      // Mettre a jour Firestore
      await getDb().doc(`subscriptions/${providerId}`).update({
        status: newStatus,
        resumedAt: now,
        resumedBy: adminId,
        resumeNote: note || null,
        pausedAt: admin.firestore.FieldValue.delete(),
        pausedBy: admin.firestore.FieldValue.delete(),
        pauseReason: admin.firestore.FieldValue.delete(),
        previousStatus: admin.firestore.FieldValue.delete(),
        updatedAt: now,
      });

      // Logger dans subscription_logs
      await getDb().collection('subscription_logs').add({
        providerId,
        action: 'subscription_resumed',
        newStatus,
        note: note || null,
        resumedBy: adminId,
        timestamp: now,
        stripeSubscriptionId: subData.stripeSubscriptionId || null,
      });

      await logAdminAction(
        adminId,
        'adminResumeSubscription',
        providerId,
        'subscription',
        { newStatus, note, stripeSubscriptionId: subData.stripeSubscriptionId },
        true
      );

      // Envoyer email au provider
      await sendProviderEmail(providerId, 'TR_PRV_subscription-resumed', {
        RESUME_DATE: new Date().toLocaleDateString('fr-FR'),
        NEW_STATUS: newStatus,
      });

      console.log(`[adminResumeSubscription] Resumed subscription for ${providerId} -> ${newStatus}`);

      return {
        success: true,
        providerId,
        status: newStatus,
        resumedAt: now.toDate().toISOString(),
      };
    } catch (error: any) {
      if (!(error instanceof functions.https.HttpsError)) {
        await logAdminAction(adminId, 'adminResumeSubscription', providerId, 'subscription', { note }, false, error.message);
      }
      console.error('Error in adminResumeSubscription:', error);
      throw error instanceof functions.https.HttpsError
        ? error
        : new functions.https.HttpsError('internal', error.message || 'Failed to resume subscription');
    }
  });
