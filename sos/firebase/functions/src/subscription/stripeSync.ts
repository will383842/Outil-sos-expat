/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SOS-Expat Stripe Subscription Sync
 * Synchronisation des plans d'abonnement avec Stripe
 *
 * Ce module gere:
 * - La creation automatique des produits et prix Stripe
 * - La mise a jour des prix existants
 * - La desactivation des plans
 *
 * Toutes les fonctions sont reservees aux administrateurs
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { logError } from '../utils/logs/logError';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Lazy Stripe initialization
let stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripe) {
    const secretKey =
      process.env.STRIPE_SECRET_KEY_LIVE ||
      process.env.STRIPE_SECRET_KEY_TEST ||
      process.env.STRIPE_SECRET_KEY ||
      '';
    if (!secretKey) {
      throw new Error('Stripe secret key not configured');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }
  return stripe;
}

// Lazy db initialization
const getDb = () => admin.firestore();

// ============================================================================
// TYPES
// ============================================================================

type Currency = 'EUR' | 'USD';
type ProviderType = 'lawyer' | 'expat_aidant';
type SubscriptionTier = 'trial' | 'basic' | 'standard' | 'pro' | 'unlimited';

// Supported languages for translations
type SupportedLanguage = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'hi' | 'ar' | 'ch';

// Multilingual text structure for all 9 languages
type MultilingualText = {
  [key in SupportedLanguage]: string;
};

interface PlanPricing {
  EUR: number;
  USD: number;
}

interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  providerType: ProviderType;
  name: MultilingualText;
  description: MultilingualText;
  pricing: PlanPricing;
  annualPricing?: PlanPricing;
  annualDiscountPercent?: number;
  aiCallsLimit: number;
  stripePriceId?: { EUR: string; USD: string };
  stripePriceIdAnnual?: { EUR: string; USD: string };
  stripeProductId?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

interface SyncReport {
  created: { products: number; prices: number };
  updated: { products: number; prices: number };
  errors: string[];
}

interface StripeSyncLog {
  action: 'sync' | 'update_prices' | 'deactivate';
  planId?: string;
  details: Record<string, any>;
  success: boolean;
  error?: string;
  adminId: string;
  timestamp: admin.firestore.Timestamp;
}

// Default annual discount
const DEFAULT_ANNUAL_DISCOUNT_PERCENT = 20;

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
 * Calculate annual price with discount
 */
function calculateAnnualPrice(
  monthlyPrice: number,
  discountPercent: number = DEFAULT_ANNUAL_DISCOUNT_PERCENT
): number {
  const yearlyTotal = monthlyPrice * 12;
  const discount = yearlyTotal * (discountPercent / 100);
  return Math.round((yearlyTotal - discount) * 100) / 100;
}

/**
 * Log sync operation to stripe_sync_logs collection
 */
async function logSyncOperation(log: StripeSyncLog): Promise<void> {
  try {
    await getDb().collection('stripe_sync_logs').add(log);
    console.log(`[StripeSyncLog] ${log.action} - ${log.success ? 'SUCCESS' : 'FAILED'}`, log.details);
  } catch (error) {
    console.error('Failed to log sync operation:', error);
  }
}

/**
 * Find existing Stripe product by planId in metadata
 */
async function findExistingProduct(planId: string): Promise<Stripe.Product | null> {
  try {
    const stripeClient = getStripe();
    const products = await stripeClient.products.search({
      query: `metadata['planId']:'${planId}'`,
      limit: 1,
    });
    return products.data.length > 0 ? products.data[0] : null;
  } catch (error) {
    console.error(`Error searching for product with planId ${planId}:`, error);
    return null;
  }
}

/**
 * Find existing Stripe prices for a product
 */
async function findExistingPrices(
  productId: string,
  currency: Currency,
  interval: 'month' | 'year'
): Promise<Stripe.Price | null> {
  try {
    const stripeClient = getStripe();
    const prices = await stripeClient.prices.list({
      product: productId,
      currency: currency.toLowerCase(),
      type: 'recurring',
      active: true,
      limit: 10,
    });

    return (
      prices.data.find(
        (price) => price.recurring?.interval === interval && price.active
      ) || null
    );
  } catch (error) {
    console.error(`Error finding prices for product ${productId}:`, error);
    return null;
  }
}

// ============================================================================
// 1. SYNC SUBSCRIPTION PLANS TO STRIPE
// ============================================================================

/**
 * Synchronise tous les plans d'abonnement avec Stripe
 * - Cree les produits manquants
 * - Cree les prix mensuels et annuels pour EUR et USD
 * - Met a jour Firestore avec les IDs Stripe
 */
export const syncSubscriptionPlansToStripe = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onCall(async (_data, context) => {
    // Verification admin
    if (!(await isAdmin(context))) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;
    const report: SyncReport = {
      created: { products: 0, prices: 0 },
      updated: { products: 0, prices: 0 },
      errors: [],
    };

    try {
      const db = getDb();
      const stripeClient = getStripe();

      // 1. Lire tous les plans depuis subscription_plans
      const plansSnapshot = await db.collection('subscription_plans').get();

      if (plansSnapshot.empty) {
        await logSyncOperation({
          action: 'sync',
          details: { message: 'No subscription plans found' },
          success: false,
          error: 'No plans found',
          adminId,
          timestamp: admin.firestore.Timestamp.now(),
        });
        return {
          success: false,
          message: 'Aucun plan d\'abonnement trouve',
          report,
        };
      }

      console.log(`[syncSubscriptionPlansToStripe] Found ${plansSnapshot.size} plans to sync`);

      // 2. Pour chaque plan
      for (const planDoc of plansSnapshot.docs) {
        const plan = planDoc.data() as SubscriptionPlan;
        const planId = planDoc.id;

        try {
          console.log(`[syncSubscriptionPlansToStripe] Processing plan: ${planId}`);

          // 2a. Verifier si le produit Stripe existe (via metadata.planId)
          let product = await findExistingProduct(planId);

          // 2b. Si non: creer le produit
          if (!product) {
            console.log(`[syncSubscriptionPlansToStripe] Creating new product for plan: ${planId}`);
            product = await stripeClient.products.create({
              name: `SOS Expat - ${plan.name?.en || planId}`,
              description: plan.description?.en || `Subscription plan ${plan.tier}`,
              metadata: {
                planId: planId,
                tier: plan.tier,
                providerType: plan.providerType,
                aiCallsLimit: String(plan.aiCallsLimit),
              },
            });
            report.created.products++;
            console.log(`[syncSubscriptionPlansToStripe] Product created: ${product.id}`);
          } else {
            console.log(`[syncSubscriptionPlansToStripe] Product exists: ${product.id}`);
            report.updated.products++;
          }

          // Calculer les prix annuels
          const discountPercent = plan.annualDiscountPercent ?? DEFAULT_ANNUAL_DISCOUNT_PERCENT;
          const annualPricingEUR =
            plan.annualPricing?.EUR ?? calculateAnnualPrice(plan.pricing.EUR, discountPercent);
          const annualPricingUSD =
            plan.annualPricing?.USD ?? calculateAnnualPrice(plan.pricing.USD, discountPercent);

          // 2c. Pour chaque devise (EUR, USD)
          const currencies: Currency[] = ['EUR', 'USD'];
          const priceIds: { EUR: string; USD: string } = { EUR: '', USD: '' };
          const priceIdsAnnual: { EUR: string; USD: string } = { EUR: '', USD: '' };

          for (const currency of currencies) {
            const monthlyAmount =
              currency === 'EUR' ? plan.pricing.EUR : plan.pricing.USD;
            const annualAmount =
              currency === 'EUR' ? annualPricingEUR : annualPricingUSD;

            // Verifier si le prix mensuel existe
            let monthlyPrice = await findExistingPrices(product.id, currency, 'month');

            if (!monthlyPrice) {
              console.log(
                `[syncSubscriptionPlansToStripe] Creating monthly ${currency} price for ${planId}`
              );
              monthlyPrice = await stripeClient.prices.create({
                product: product.id,
                currency: currency.toLowerCase(),
                unit_amount: Math.round(monthlyAmount * 100),
                recurring: { interval: 'month' },
                metadata: {
                  planId: planId,
                  currency: currency,
                  period: 'monthly',
                },
                nickname: `${plan.name?.en || planId} - Monthly ${currency}`,
              });
              report.created.prices++;
              console.log(`[syncSubscriptionPlansToStripe] Monthly price created: ${monthlyPrice.id}`);
            } else {
              report.updated.prices++;
            }
            priceIds[currency] = monthlyPrice.id;

            // Creer aussi le prix annuel avec discount
            let yearlyPrice = await findExistingPrices(product.id, currency, 'year');

            if (!yearlyPrice) {
              console.log(
                `[syncSubscriptionPlansToStripe] Creating yearly ${currency} price for ${planId}`
              );
              yearlyPrice = await stripeClient.prices.create({
                product: product.id,
                currency: currency.toLowerCase(),
                unit_amount: Math.round(annualAmount * 100),
                recurring: { interval: 'year' },
                metadata: {
                  planId: planId,
                  currency: currency,
                  period: 'yearly',
                  discountPercent: String(discountPercent),
                },
                nickname: `${plan.name?.en || planId} - Yearly ${currency}`,
              });
              report.created.prices++;
              console.log(`[syncSubscriptionPlansToStripe] Yearly price created: ${yearlyPrice.id}`);
            } else {
              report.updated.prices++;
            }
            priceIdsAnnual[currency] = yearlyPrice.id;
          }

          // 2d. Mettre a jour subscription_plans/{planId} avec les IDs
          await db.doc(`subscription_plans/${planId}`).update({
            stripeProductId: product.id,
            stripePriceId: priceIds,
            stripePriceIdAnnual: priceIdsAnnual,
            updatedAt: admin.firestore.Timestamp.now(),
          });

          console.log(`[syncSubscriptionPlansToStripe] Plan ${planId} synced successfully`);
        } catch (planError: any) {
          const errorMessage = `Error syncing plan ${planId}: ${planError.message}`;
          console.error(errorMessage, planError);
          report.errors.push(errorMessage);
          await logError('stripeSync:syncPlan', planError);
        }
      }

      // 3. Retourner un rapport
      await logSyncOperation({
        action: 'sync',
        details: {
          productsCreated: report.created.products,
          productsUpdated: report.updated.products,
          pricesCreated: report.created.prices,
          pricesUpdated: report.updated.prices,
          errors: report.errors.length,
        },
        success: report.errors.length === 0,
        error: report.errors.length > 0 ? report.errors.join('; ') : undefined,
        adminId,
        timestamp: admin.firestore.Timestamp.now(),
      });

      console.log('[syncSubscriptionPlansToStripe] Sync completed:', report);

      return {
        success: report.errors.length === 0,
        message:
          report.errors.length === 0
            ? 'Synchronisation reussie'
            : `Synchronisation terminee avec ${report.errors.length} erreur(s)`,
        report,
      };
    } catch (error: any) {
      await logError('stripeSync:syncSubscriptionPlansToStripe', error);
      await logSyncOperation({
        action: 'sync',
        details: { error: error.message },
        success: false,
        error: error.message,
        adminId,
        timestamp: admin.firestore.Timestamp.now(),
      });
      console.error('[syncSubscriptionPlansToStripe] Fatal error:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Sync failed');
    }
  });

// ============================================================================
// 2. UPDATE STRIPE PRICES
// ============================================================================

/**
 * Met a jour les prix d'un plan existant
 * - Archive les anciens prix
 * - Cree de nouveaux prix
 * - Met a jour les abonnements existants (optionnel)
 */
export const updateStripePrices = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onCall(
    async (
      data: {
        planId: string;
        newPricing: PlanPricing;
        newAnnualPricing?: PlanPricing;
        updateExistingSubscriptions?: boolean;
      },
      context
    ) => {
      // Verification admin
      if (!(await isAdmin(context))) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
      }

      const adminId = context.auth!.uid;
      const { planId, newPricing, newAnnualPricing, updateExistingSubscriptions = false } = data;

      if (!planId || !newPricing) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'planId and newPricing are required'
        );
      }

      try {
        const db = getDb();
        const stripeClient = getStripe();

        // Recuperer le plan actuel
        const planDoc = await db.doc(`subscription_plans/${planId}`).get();
        if (!planDoc.exists) {
          throw new functions.https.HttpsError('not-found', `Plan ${planId} not found`);
        }

        const plan = planDoc.data() as SubscriptionPlan;
        const oldPricing = plan.pricing;
        const productId = plan.stripeProductId;

        if (!productId) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            `Plan ${planId} has no Stripe product. Run syncSubscriptionPlansToStripe first.`
          );
        }

        console.log(`[updateStripePrices] Updating prices for plan ${planId}`);
        console.log(`[updateStripePrices] Old pricing:`, oldPricing);
        console.log(`[updateStripePrices] New pricing:`, newPricing);

        const archivedPrices: string[] = [];
        const newPriceIds: { EUR: string; USD: string } = { EUR: '', USD: '' };
        const newAnnualPriceIds: { EUR: string; USD: string } = { EUR: '', USD: '' };

        const currencies: Currency[] = ['EUR', 'USD'];

        for (const currency of currencies) {
          const newMonthlyAmount = newPricing[currency];
          const oldPriceId = plan.stripePriceId?.[currency];

          // Archive l'ancien prix mensuel s'il existe
          if (oldPriceId) {
            try {
              await stripeClient.prices.update(oldPriceId, { active: false });
              archivedPrices.push(oldPriceId);
              console.log(`[updateStripePrices] Archived old monthly price: ${oldPriceId}`);
            } catch (archiveError) {
              console.warn(`[updateStripePrices] Could not archive price ${oldPriceId}:`, archiveError);
            }
          }

          // Creer le nouveau prix mensuel
          const newMonthlyPrice = await stripeClient.prices.create({
            product: productId,
            currency: currency.toLowerCase(),
            unit_amount: Math.round(newMonthlyAmount * 100),
            recurring: { interval: 'month' },
            metadata: {
              planId: planId,
              currency: currency,
              period: 'monthly',
              previousPriceId: oldPriceId || '',
            },
            nickname: `${plan.name?.en || planId} - Monthly ${currency}`,
          });
          newPriceIds[currency] = newMonthlyPrice.id;
          console.log(`[updateStripePrices] Created new monthly price: ${newMonthlyPrice.id}`);

          // Prix annuel
          const discountPercent = plan.annualDiscountPercent ?? DEFAULT_ANNUAL_DISCOUNT_PERCENT;
          const newAnnualAmount =
            newAnnualPricing?.[currency] ??
            calculateAnnualPrice(newMonthlyAmount, discountPercent);
          const oldAnnualPriceId = plan.stripePriceIdAnnual?.[currency];

          // Archive l'ancien prix annuel s'il existe
          if (oldAnnualPriceId) {
            try {
              await stripeClient.prices.update(oldAnnualPriceId, { active: false });
              archivedPrices.push(oldAnnualPriceId);
              console.log(`[updateStripePrices] Archived old annual price: ${oldAnnualPriceId}`);
            } catch (archiveError) {
              console.warn(
                `[updateStripePrices] Could not archive annual price ${oldAnnualPriceId}:`,
                archiveError
              );
            }
          }

          // Creer le nouveau prix annuel
          const newAnnualPrice = await stripeClient.prices.create({
            product: productId,
            currency: currency.toLowerCase(),
            unit_amount: Math.round(newAnnualAmount * 100),
            recurring: { interval: 'year' },
            metadata: {
              planId: planId,
              currency: currency,
              period: 'yearly',
              discountPercent: String(discountPercent),
              previousPriceId: oldAnnualPriceId || '',
            },
            nickname: `${plan.name?.en || planId} - Yearly ${currency}`,
          });
          newAnnualPriceIds[currency] = newAnnualPrice.id;
          console.log(`[updateStripePrices] Created new annual price: ${newAnnualPrice.id}`);
        }

        // Mettre a jour Firestore
        const updateData: Record<string, any> = {
          pricing: newPricing,
          stripePriceId: newPriceIds,
          stripePriceIdAnnual: newAnnualPriceIds,
          updatedAt: admin.firestore.Timestamp.now(),
        };

        if (newAnnualPricing) {
          updateData.annualPricing = newAnnualPricing;
        }

        await db.doc(`subscription_plans/${planId}`).update(updateData);

        // Optionnel: Mettre a jour les abonnements existants
        let updatedSubscriptions = 0;
        if (updateExistingSubscriptions) {
          console.log('[updateStripePrices] Updating existing subscriptions...');

          // Trouver tous les abonnements avec ce plan
          const subscriptionsSnapshot = await db
            .collection('subscriptions')
            .where('planId', '==', planId)
            .where('status', 'in', ['active', 'trialing'])
            .get();

          for (const subDoc of subscriptionsSnapshot.docs) {
            try {
              const sub = subDoc.data();
              const stripeSubId = sub.stripeSubscriptionId;
              const currency = (sub.currency as Currency) || 'EUR';
              const billingPeriod = sub.billingPeriod || 'monthly';

              if (!stripeSubId) continue;

              // Recuperer l'abonnement Stripe
              const stripeSubscription = await stripeClient.subscriptions.retrieve(stripeSubId);
              const itemId = stripeSubscription.items.data[0]?.id;

              if (!itemId) continue;

              // Determiner le nouveau prix
              const newPriceId =
                billingPeriod === 'yearly'
                  ? newAnnualPriceIds[currency]
                  : newPriceIds[currency];

              // Mettre a jour l'abonnement Stripe
              await stripeClient.subscriptions.update(stripeSubId, {
                items: [{ id: itemId, price: newPriceId }],
                proration_behavior: 'create_prorations',
              });

              // Mettre a jour Firestore
              await db.doc(`subscriptions/${subDoc.id}`).update({
                stripePriceId: newPriceId,
                currentPeriodAmount:
                  billingPeriod === 'yearly'
                    ? newAnnualPricing?.[currency] ??
                      calculateAnnualPrice(newPricing[currency])
                    : newPricing[currency],
                updatedAt: admin.firestore.Timestamp.now(),
              });

              updatedSubscriptions++;
              console.log(`[updateStripePrices] Updated subscription ${subDoc.id}`);
            } catch (subError) {
              console.error(`[updateStripePrices] Error updating subscription ${subDoc.id}:`, subError);
            }
          }
        }

        // Log de l'operation
        await logSyncOperation({
          action: 'update_prices',
          planId,
          details: {
            oldPricing,
            newPricing,
            newAnnualPricing,
            archivedPrices,
            newPriceIds,
            newAnnualPriceIds,
            updatedSubscriptions,
          },
          success: true,
          adminId,
          timestamp: admin.firestore.Timestamp.now(),
        });

        console.log(`[updateStripePrices] Successfully updated prices for plan ${planId}`);

        return {
          success: true,
          message: `Prix mis a jour pour le plan ${planId}`,
          archivedPrices,
          newPriceIds,
          newAnnualPriceIds,
          updatedSubscriptions,
        };
      } catch (error: any) {
        await logError('stripeSync:updateStripePrices', error);
        await logSyncOperation({
          action: 'update_prices',
          planId,
          details: { error: error.message },
          success: false,
          error: error.message,
          adminId,
          timestamp: admin.firestore.Timestamp.now(),
        });
        console.error('[updateStripePrices] Error:', error);
        throw new functions.https.HttpsError('internal', error.message || 'Price update failed');
      }
    }
  );

// ============================================================================
// 3. DEACTIVATE STRIPE PLAN
// ============================================================================

/**
 * Desactive un plan d'abonnement
 * - Archive le produit Stripe
 * - Met isActive=false dans Firestore
 */
export const deactivateStripePlan = functions
  .region('europe-west1')
  .https.onCall(async (data: { planId: string }, context) => {
    // Verification admin
    if (!(await isAdmin(context))) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;
    const { planId } = data;

    if (!planId) {
      throw new functions.https.HttpsError('invalid-argument', 'planId is required');
    }

    try {
      const db = getDb();
      const stripeClient = getStripe();

      // Recuperer le plan
      const planDoc = await db.doc(`subscription_plans/${planId}`).get();
      if (!planDoc.exists) {
        throw new functions.https.HttpsError('not-found', `Plan ${planId} not found`);
      }

      const plan = planDoc.data() as SubscriptionPlan;
      const productId = plan.stripeProductId;

      console.log(`[deactivateStripePlan] Deactivating plan ${planId}`);

      // Archive le produit Stripe s'il existe
      if (productId) {
        try {
          await stripeClient.products.update(productId, {
            active: false,
            metadata: {
              planId: planId,
              tier: plan.tier,
              providerType: plan.providerType,
              deactivatedAt: new Date().toISOString(),
              deactivatedBy: adminId,
            },
          });
          console.log(`[deactivateStripePlan] Stripe product ${productId} archived`);
        } catch (stripeError: any) {
          console.warn(
            `[deactivateStripePlan] Could not archive Stripe product ${productId}:`,
            stripeError.message
          );
          // Continuer meme si l'archivage Stripe echoue
        }

        // Archive aussi tous les prix associes
        const prices = await stripeClient.prices.list({
          product: productId,
          active: true,
        });

        for (const price of prices.data) {
          try {
            await stripeClient.prices.update(price.id, { active: false });
            console.log(`[deactivateStripePlan] Price ${price.id} archived`);
          } catch (priceError) {
            console.warn(`[deactivateStripePlan] Could not archive price ${price.id}:`, priceError);
          }
        }
      }

      // Mettre isActive=false dans Firestore
      await db.doc(`subscription_plans/${planId}`).update({
        isActive: false,
        deactivatedAt: admin.firestore.Timestamp.now(),
        deactivatedBy: adminId,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Verifier s'il y a des abonnements actifs sur ce plan
      const activeSubscriptions = await db
        .collection('subscriptions')
        .where('planId', '==', planId)
        .where('status', 'in', ['active', 'trialing'])
        .limit(100)
        .get();

      const affectedSubscriptions = activeSubscriptions.size;

      if (affectedSubscriptions > 0) {
        console.warn(
          `[deactivateStripePlan] Warning: ${affectedSubscriptions} active subscriptions still on plan ${planId}`
        );
      }

      // Log de l'operation
      await logSyncOperation({
        action: 'deactivate',
        planId,
        details: {
          productId,
          affectedSubscriptions,
        },
        success: true,
        adminId,
        timestamp: admin.firestore.Timestamp.now(),
      });

      console.log(`[deactivateStripePlan] Plan ${planId} deactivated successfully`);

      return {
        success: true,
        message: `Plan ${planId} desactive`,
        productId,
        affectedSubscriptions,
        warning:
          affectedSubscriptions > 0
            ? `Attention: ${affectedSubscriptions} abonnement(s) actif(s) sur ce plan. Ils continueront jusqu'a leur prochaine renouvellement.`
            : undefined,
      };
    } catch (error: any) {
      await logError('stripeSync:deactivateStripePlan', error);
      await logSyncOperation({
        action: 'deactivate',
        planId,
        details: { error: error.message },
        success: false,
        error: error.message,
        adminId,
        timestamp: admin.firestore.Timestamp.now(),
      });
      console.error('[deactivateStripePlan] Error:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Deactivation failed');
    }
  });

// ============================================================================
// 4. REACTIVATE STRIPE PLAN (Bonus)
// ============================================================================

/**
 * Reactive un plan d'abonnement desactive
 * - Reactive le produit Stripe
 * - Met isActive=true dans Firestore
 */
export const reactivateStripePlan = functions
  .region('europe-west1')
  .https.onCall(async (data: { planId: string }, context) => {
    // Verification admin
    if (!(await isAdmin(context))) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const adminId = context.auth!.uid;
    const { planId } = data;

    if (!planId) {
      throw new functions.https.HttpsError('invalid-argument', 'planId is required');
    }

    try {
      const db = getDb();
      const stripeClient = getStripe();

      // Recuperer le plan
      const planDoc = await db.doc(`subscription_plans/${planId}`).get();
      if (!planDoc.exists) {
        throw new functions.https.HttpsError('not-found', `Plan ${planId} not found`);
      }

      const plan = planDoc.data() as SubscriptionPlan;
      const productId = plan.stripeProductId;

      console.log(`[reactivateStripePlan] Reactivating plan ${planId}`);

      // Reactiver le produit Stripe s'il existe
      if (productId) {
        try {
          await stripeClient.products.update(productId, {
            active: true,
          });
          console.log(`[reactivateStripePlan] Stripe product ${productId} reactivated`);
        } catch (stripeError: any) {
          console.warn(
            `[reactivateStripePlan] Could not reactivate Stripe product ${productId}:`,
            stripeError.message
          );
        }

        // Reactiver aussi les prix actuels
        const priceIds = [
          plan.stripePriceId?.EUR,
          plan.stripePriceId?.USD,
          plan.stripePriceIdAnnual?.EUR,
          plan.stripePriceIdAnnual?.USD,
        ].filter(Boolean) as string[];

        for (const priceId of priceIds) {
          try {
            await stripeClient.prices.update(priceId, { active: true });
            console.log(`[reactivateStripePlan] Price ${priceId} reactivated`);
          } catch (priceError) {
            console.warn(`[reactivateStripePlan] Could not reactivate price ${priceId}:`, priceError);
          }
        }
      }

      // Mettre isActive=true dans Firestore
      await db.doc(`subscription_plans/${planId}`).update({
        isActive: true,
        reactivatedAt: admin.firestore.Timestamp.now(),
        reactivatedBy: adminId,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Log de l'operation
      await logSyncOperation({
        action: 'sync', // Using 'sync' for reactivation
        planId,
        details: {
          action: 'reactivate',
          productId,
        },
        success: true,
        adminId,
        timestamp: admin.firestore.Timestamp.now(),
      });

      console.log(`[reactivateStripePlan] Plan ${planId} reactivated successfully`);

      return {
        success: true,
        message: `Plan ${planId} reactive`,
        productId,
      };
    } catch (error: any) {
      await logError('stripeSync:reactivateStripePlan', error);
      console.error('[reactivateStripePlan] Error:', error);
      throw new functions.https.HttpsError('internal', error.message || 'Reactivation failed');
    }
  });
