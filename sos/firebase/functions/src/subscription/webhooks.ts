/**
 * SOS-Expat Subscription Webhook Handlers
 * Handlers pour les webhooks Stripe liés aux abonnements
 *
 * Ce fichier gère tous les événements webhook Stripe pour:
 * - Création/modification/suppression d'abonnements
 * - Facturation et paiements
 * - Fin de période d'essai
 */

import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { logger } from 'firebase-functions';

// ============================================================================
// TYPES
// ============================================================================

export type SubscriptionTier = 'trial' | 'basic' | 'standard' | 'pro' | 'unlimited';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'paused';

interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  aiCallsLimit: number;
  pricing: { EUR: number; USD: number };
}

interface SubscriptionLogEntry {
  providerId: string;
  action: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  stripeEventId?: string;
  stripeEventType?: string;
  metadata?: Record<string, unknown>;
  createdAt: FirebaseFirestore.Timestamp;
}

interface WebhookContext {
  eventId: string;
  eventType: string;
  retryCount?: number;
}

// ============================================================================
// LAZY INITIALIZATIONS
// ============================================================================

const getDb = () => admin.firestore();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Récupère le plan d'abonnement par son ID
 * @internal Utilisé par getSubscriptionPlanByPriceId comme fallback
 */
async function _getSubscriptionPlan(planId: string): Promise<SubscriptionPlan | null> {
  const planDoc = await getDb().doc(`subscription_plans/${planId}`).get();
  if (!planDoc.exists) return null;
  return { id: planDoc.id, ...planDoc.data() } as SubscriptionPlan;
}

// Export for potential external use
export const getSubscriptionPlan = _getSubscriptionPlan;

/**
 * Récupère le plan d'abonnement par le priceId Stripe
 */
async function getSubscriptionPlanByPriceId(stripePriceId: string): Promise<SubscriptionPlan | null> {
  // Chercher dans les prix mensuels EUR
  let snapshot = await getDb().collection('subscription_plans')
    .where('stripePriceId.EUR', '==', stripePriceId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as SubscriptionPlan;
  }

  // Chercher dans les prix mensuels USD
  snapshot = await getDb().collection('subscription_plans')
    .where('stripePriceId.USD', '==', stripePriceId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as SubscriptionPlan;
  }

  // Chercher dans les prix annuels EUR
  snapshot = await getDb().collection('subscription_plans')
    .where('stripePriceIdAnnual.EUR', '==', stripePriceId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as SubscriptionPlan;
  }

  // Chercher dans les prix annuels USD
  snapshot = await getDb().collection('subscription_plans')
    .where('stripePriceIdAnnual.USD', '==', stripePriceId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as SubscriptionPlan;
  }

  return null;
}

/**
 * Mappe le status Stripe vers notre status interne
 */
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'unpaid':
      return 'past_due';
    case 'incomplete':
    case 'incomplete_expired':
      return 'expired';
    case 'paused':
      return 'paused';
    default:
      return 'expired';
  }
}

/**
 * Récupère les informations du provider
 */
async function getProviderInfo(providerId: string): Promise<{
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  language: string;
} | null> {
  // Essayer d'abord dans providers
  let doc = await getDb().doc(`providers/${providerId}`).get();
  if (doc.exists) {
    const data = doc.data()!;
    return {
      email: data.email || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      language: data.language || data.preferredLanguage || 'en'
    };
  }

  // Sinon dans users
  doc = await getDb().doc(`users/${providerId}`).get();
  if (doc.exists) {
    const data = doc.data()!;
    return {
      email: data.email || '',
      firstName: data.firstName || data.name?.split(' ')[0] || '',
      lastName: data.lastName || data.name?.split(' ').slice(1).join(' ') || '',
      displayName: data.displayName || data.name || '',
      language: data.language || data.preferredLanguage || data.lang || 'en'
    };
  }

  return null;
}

/**
 * Log une action d'abonnement pour audit
 */
async function logSubscriptionAction(entry: Omit<SubscriptionLogEntry, 'createdAt'>): Promise<void> {
  try {
    await getDb().collection('subscription_logs').add({
      ...entry,
      createdAt: admin.firestore.Timestamp.now()
    });
    logger.info(`[SubscriptionLog] ${entry.action} for provider ${entry.providerId}`);
  } catch (error) {
    logger.error('[SubscriptionLog] Failed to log action:', error);
  }
}

/**
 * Enqueue un événement de notification via le pipeline existant
 */
async function enqueueNotification(params: {
  eventId: string;
  providerId: string;
  email: string;
  locale: string;
  vars?: Record<string, string | number | boolean | null | undefined>;
}): Promise<void> {
  try {
    const { eventId, providerId, email, locale, vars } = params;

    await getDb().collection('message_events').add({
      eventId,
      locale,
      to: { email },
      context: {
        user: {
          uid: providerId,
          email
        }
      },
      vars: vars || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`[Notification] Enqueued ${eventId} for ${providerId}`);
  } catch (error) {
    logger.error('[Notification] Failed to enqueue:', error);
  }
}

/**
 * Envoie un email direct via Zoho SMTP (fallback)
 * @internal Utilisé comme fallback si le notification pipeline échoue
 */
async function _sendDirectEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  try {
    // Utiliser le mail_queue existant pour envoyer via le système
    await getDb().collection('mail_queue').add({
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || params.html.replace(/<[^>]*>/g, ''),
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now()
    });
    logger.info(`[DirectEmail] Queued email to ${params.to}`);
  } catch (error) {
    logger.error('[DirectEmail] Failed to queue:', error);
  }
}

// Export for potential external use
export const sendDirectEmail = _sendDirectEmail;

/**
 * Récupère la configuration de trial
 */
async function getTrialConfig(): Promise<{ durationDays: number; maxAiCalls: number; isEnabled: boolean }> {
  const settingsDoc = await getDb().doc('settings/subscription').get();
  if (!settingsDoc.exists || !settingsDoc.data()?.trial) {
    return { durationDays: 30, maxAiCalls: 3, isEnabled: true };
  }
  return settingsDoc.data()!.trial;
}

/**
 * Compare deux tiers pour déterminer upgrade/downgrade
 * Retourne: 1 = upgrade, -1 = downgrade, 0 = same
 */
function compareTiers(oldTier: SubscriptionTier, newTier: SubscriptionTier): number {
  const tierOrder: Record<SubscriptionTier, number> = {
    'trial': 0,
    'basic': 1,
    'standard': 2,
    'pro': 3,
    'unlimited': 4
  };
  return Math.sign(tierOrder[newTier] - tierOrder[oldTier]);
}

// ============================================================================
// IDEMPOTENCY HELPER
// ============================================================================

/**
 * Vérifie si un événement Stripe a déjà été traité (déduplication)
 * UNIFIED: Uses same collection as index.ts (processed_webhook_events)
 * @returns true si l'événement a déjà été traité, false sinon
 */
async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  // Use the same collection as index.ts for consistency
  const processedRef = getDb().collection('processed_webhook_events').doc(eventId);
  const doc = await processedRef.get();
  return doc.exists;
}

/**
 * Marque un événement Stripe comme traité
 * UNIFIED: Uses same collection as index.ts with TTL
 */
async function markEventAsProcessed(eventId: string, eventType: string): Promise<void> {
  // Use the same collection as index.ts for consistency
  const processedRef = getDb().collection('processed_webhook_events').doc(eventId);
  await processedRef.set({
    eventId,
    eventType,
    processedAt: admin.firestore.Timestamp.now(),
    // TTL for cleanup (30 days from now) - same as index.ts
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Handler pour customer.subscription.created
 * - Crée le document dans subscriptions/{providerId}
 * - Initialise ai_usage/{providerId} avec quota du plan
 * - Envoie email de bienvenue
 * - Logger dans subscription_logs
 */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check - évite le traitement multiple du même événement
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleSubscriptionCreated] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  const providerId = subscription.metadata?.providerId;

  if (!providerId) {
    logger.error('[handleSubscriptionCreated] No providerId in metadata');
    return;
  }

  logger.info(`[handleSubscriptionCreated] Processing for provider: ${providerId}`);

  const now = admin.firestore.Timestamp.now();
  const db = getDb();

  try {
    // Récupérer le plan depuis le priceId
    const priceId = subscription.items.data[0]?.price.id;
    const plan = priceId ? await getSubscriptionPlanByPriceId(priceId) : null;
    const planId = subscription.metadata?.planId || plan?.id || 'unknown';
    const tier = plan?.tier || 'basic';
    const aiCallsLimit = plan?.aiCallsLimit ?? 5;

    // Déterminer la période de facturation
    const priceInterval = subscription.items.data[0]?.price.recurring?.interval;
    const billingPeriod = priceInterval === 'year' ? 'yearly' : 'monthly';

    // Créer/mettre à jour le document subscription
    const subscriptionData = {
      providerId,
      planId,
      tier,
      status: mapStripeStatus(subscription.status),
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currency: subscription.currency?.toUpperCase() || 'EUR',
      billingPeriod,
      currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
      currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: null,
      trialStartedAt: subscription.trial_start
        ? admin.firestore.Timestamp.fromMillis(subscription.trial_start * 1000)
        : null,
      trialEndsAt: subscription.trial_end
        ? admin.firestore.Timestamp.fromMillis(subscription.trial_end * 1000)
        : null,
      aiCallsLimit,
      aiAccessEnabled: true,
      createdAt: now,
      updatedAt: now
    };

    await db.doc(`subscriptions/${providerId}`).set(subscriptionData);
    logger.info(`[handleSubscriptionCreated] Created subscription document for ${providerId}`);

    // Initialiser ai_usage avec le quota du plan
    const aiUsageData = {
      providerId,
      subscriptionId: providerId,
      currentPeriodCalls: 0,
      trialCallsUsed: 0,
      totalCallsAllTime: 0,
      aiCallsLimit,
      currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
      currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
      createdAt: now,
      updatedAt: now
    };

    await db.doc(`ai_usage/${providerId}`).set(aiUsageData, { merge: true });
    logger.info(`[handleSubscriptionCreated] Initialized AI usage for ${providerId} with limit ${aiCallsLimit}`);

    // Réactiver le profil public du prestataire (si précédemment masqué suite à annulation)
    const sosProfileRef = db.doc(`sos_profiles/${providerId}`);
    const sosProfileDoc = await sosProfileRef.get();
    if (sosProfileDoc.exists) {
      const profileData = sosProfileDoc.data();
      // Réactiver seulement si le profil était masqué à cause d'une annulation d'abonnement
      if (profileData?.hiddenReason === 'subscription_canceled' || profileData?.isActive === false) {
        await sosProfileRef.update({
          isVisible: true,
          isActive: true,
          hiddenReason: admin.firestore.FieldValue.delete(),
          hiddenAt: admin.firestore.FieldValue.delete(),
          reactivatedAt: now,
          updatedAt: now
        });
        logger.info(`[handleSubscriptionCreated] Reactivated sos_profile for ${providerId}`);
      }
    }

    // Logger l'action
    await logSubscriptionAction({
      providerId,
      action: 'subscription_created',
      newState: subscriptionData,
      stripeEventId: context?.eventId,
      stripeEventType: context?.eventType,
      metadata: {
        planId,
        tier,
        aiCallsLimit,
        billingPeriod
      }
    });

    // Envoyer email de bienvenue
    const providerInfo = await getProviderInfo(providerId);
    if (providerInfo?.email) {
      await enqueueNotification({
        eventId: 'subscription.created.welcome',
        providerId,
        email: providerInfo.email,
        locale: providerInfo.language,
        vars: {
          FNAME: providerInfo.firstName || providerInfo.displayName,
          PLAN_NAME: tier,
          AI_CALLS_LIMIT: aiCallsLimit === -1 ? 'Illimite' : aiCallsLimit.toString(),
          BILLING_PERIOD: billingPeriod === 'yearly' ? 'Annuel' : 'Mensuel',
          DASHBOARD_URL: 'https://sos-expat.com/dashboard/subscription'
        }
      });
      logger.info(`[handleSubscriptionCreated] Welcome email queued for ${providerId}`);
    }

    // Marquer l'événement comme traité après succès
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleSubscriptionCreated] Completed for provider: ${providerId}`);
  } catch (error) {
    logger.error(`[handleSubscriptionCreated] Error for ${providerId}:`, error);
    throw error;
  }
}

/**
 * Handler pour customer.subscription.updated
 * - Détecter les changements (plan, status, cancel_at_period_end)
 * - Si upgrade: appliquer nouveau quota immédiatement
 * - Si downgrade: marquer pour application à la fin de période
 * - Si cancel_at_period_end=true: marquer annulation programmée
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleSubscriptionUpdated] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  const providerId = subscription.metadata?.providerId;

  if (!providerId) {
    logger.error('[handleSubscriptionUpdated] No providerId in metadata');
    return;
  }

  logger.info(`[handleSubscriptionUpdated] Processing for provider: ${providerId}`);

  const now = admin.firestore.Timestamp.now();
  const db = getDb();

  try {
    // Récupérer l'état précédent
    const existingDoc = await db.doc(`subscriptions/${providerId}`).get();
    const previousState = existingDoc.exists ? existingDoc.data() : null;
    const previousTier = (previousState?.tier as SubscriptionTier) || 'basic';
    const previousStatus = previousState?.status;
    const previousCancelAtPeriodEnd = previousState?.cancelAtPeriodEnd;

    // Récupérer le nouveau plan
    const priceId = subscription.items.data[0]?.price.id;
    const plan = priceId ? await getSubscriptionPlanByPriceId(priceId) : null;
    const planId = subscription.metadata?.planId || plan?.id || previousState?.planId || 'unknown';
    const newTier = plan?.tier || (previousTier as SubscriptionTier);
    const newAiCallsLimit = plan?.aiCallsLimit ?? previousState?.aiCallsLimit ?? 5;
    const newStatus = mapStripeStatus(subscription.status);

    // Détecter le type de changement
    const tierChange = compareTiers(previousTier, newTier);
    const isUpgrade = tierChange > 0;
    const isDowngrade = tierChange < 0;
    const statusChanged = previousStatus !== newStatus;
    const cancelScheduleChanged = previousCancelAtPeriodEnd !== subscription.cancel_at_period_end;

    // Préparer les mises à jour
    const updates: Record<string, unknown> = {
      status: newStatus,
      stripePriceId: priceId,
      currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
      currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? admin.firestore.Timestamp.fromMillis(subscription.canceled_at * 1000)
        : null,
      updatedAt: now
    };

    // Gérer les changements de plan
    if (isUpgrade) {
      // Upgrade: appliquer immédiatement le nouveau quota
      updates.planId = planId;
      updates.tier = newTier;
      updates.aiCallsLimit = newAiCallsLimit;
      updates.aiAccessEnabled = true;
      updates.pendingDowngrade = null;

      // Mettre à jour ai_usage avec le nouveau quota immédiatement
      await db.doc(`ai_usage/${providerId}`).update({
        aiCallsLimit: newAiCallsLimit,
        updatedAt: now
      });

      logger.info(`[handleSubscriptionUpdated] Upgrade applied: ${previousTier} -> ${newTier}`);

    } else if (isDowngrade) {
      // Downgrade: marquer pour application à la fin de période
      updates.pendingDowngrade = {
        planId,
        tier: newTier,
        aiCallsLimit: newAiCallsLimit,
        effectiveAt: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000)
      };

      logger.info(`[handleSubscriptionUpdated] Downgrade scheduled: ${previousTier} -> ${newTier} at period end`);

    } else if (tierChange === 0 && plan) {
      // Même tier, mettre à jour quand même si nécessaire
      updates.planId = planId;
      updates.tier = newTier;
    }

    // Gérer cancel_at_period_end
    if (cancelScheduleChanged) {
      if (subscription.cancel_at_period_end) {
        updates.scheduledCancellationAt = admin.firestore.Timestamp.fromMillis(
          subscription.current_period_end * 1000
        );
        logger.info(`[handleSubscriptionUpdated] Cancellation scheduled for period end`);
      } else {
        updates.scheduledCancellationAt = admin.firestore.FieldValue.delete();
        logger.info(`[handleSubscriptionUpdated] Cancellation reverted`);
      }
    }

    // Appliquer les mises à jour
    await db.doc(`subscriptions/${providerId}`).update(updates);

    // Mettre à jour ai_usage pour la période courante
    await db.doc(`ai_usage/${providerId}`).update({
      currentPeriodStart: admin.firestore.Timestamp.fromMillis(subscription.current_period_start * 1000),
      currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
      updatedAt: now
    });

    // Logger l'action
    await logSubscriptionAction({
      providerId,
      action: 'subscription_updated',
      previousState: previousState || undefined,
      newState: updates,
      stripeEventId: context?.eventId,
      stripeEventType: context?.eventType,
      metadata: {
        isUpgrade,
        isDowngrade,
        statusChanged,
        cancelScheduleChanged,
        previousTier,
        newTier
      }
    });

    // Envoyer des notifications selon le type de changement
    const providerInfo = await getProviderInfo(providerId);
    if (providerInfo?.email) {
      if (isUpgrade) {
        await enqueueNotification({
          eventId: 'subscription.upgraded',
          providerId,
          email: providerInfo.email,
          locale: providerInfo.language,
          vars: {
            FNAME: providerInfo.firstName,
            OLD_PLAN: previousTier,
            NEW_PLAN: newTier,
            AI_CALLS_LIMIT: newAiCallsLimit === -1 ? 'Illimite' : newAiCallsLimit.toString()
          }
        });
      } else if (isDowngrade) {
        await enqueueNotification({
          eventId: 'subscription.downgrade_scheduled',
          providerId,
          email: providerInfo.email,
          locale: providerInfo.language,
          vars: {
            FNAME: providerInfo.firstName,
            OLD_PLAN: previousTier,
            NEW_PLAN: newTier,
            EFFECTIVE_DATE: new Date(subscription.current_period_end * 1000).toLocaleDateString(providerInfo.language || 'fr-FR')
          }
        });
      } else if (cancelScheduleChanged && subscription.cancel_at_period_end) {
        await enqueueNotification({
          eventId: 'subscription.cancellation_scheduled',
          providerId,
          email: providerInfo.email,
          locale: providerInfo.language,
          vars: {
            FNAME: providerInfo.firstName,
            PLAN_NAME: newTier,
            END_DATE: new Date(subscription.current_period_end * 1000).toLocaleDateString(providerInfo.language || 'fr-FR'),
            REACTIVATE_URL: 'https://sos-expat.com/dashboard/subscription'
          }
        });
      }
    }

    // Marquer l'événement comme traité après succès
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleSubscriptionUpdated] Completed for provider: ${providerId}`);
  } catch (error) {
    logger.error(`[handleSubscriptionUpdated] Error for ${providerId}:`, error);
    throw error;
  }
}

/**
 * Handler pour customer.subscription.deleted
 * - Mettre status='canceled' dans Firestore
 * - Couper accès IA (aiAccessEnabled=false)
 * - Envoyer email de fin d'abonnement
 * - Retour au plan gratuit (trial avec 0 appels restants)
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleSubscriptionDeleted] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  const providerId = subscription.metadata?.providerId;

  if (!providerId) {
    logger.error('[handleSubscriptionDeleted] No providerId in metadata');
    return;
  }

  logger.info(`[handleSubscriptionDeleted] Processing for provider: ${providerId}`);

  const now = admin.firestore.Timestamp.now();
  const db = getDb();

  try {
    // Récupérer l'état précédent pour le log
    const existingDoc = await db.doc(`subscriptions/${providerId}`).get();
    const previousState = existingDoc.exists ? existingDoc.data() : null;

    // Récupérer la config trial
    const trialConfig = await getTrialConfig();

    // Mettre à jour le document subscription - retour au plan trial
    const updates = {
      status: 'canceled' as SubscriptionStatus,
      tier: 'trial' as SubscriptionTier,
      planId: 'trial',
      aiAccessEnabled: false,
      aiCallsLimit: 0, // 0 appels restants
      canceledAt: admin.firestore.Timestamp.fromMillis(
        (subscription.canceled_at || Date.now() / 1000) * 1000
      ),
      cancelAtPeriodEnd: false,
      pendingDowngrade: null,
      scheduledCancellationAt: null,
      previousSubscription: {
        planId: previousState?.planId,
        tier: previousState?.tier,
        canceledAt: now,
        reason: subscription.cancellation_details?.reason || 'unknown'
      },
      updatedAt: now
    };

    await db.doc(`subscriptions/${providerId}`).update(updates);
    logger.info(`[handleSubscriptionDeleted] Set status to canceled for ${providerId}`);

    // Mettre à jour ai_usage - couper l'accès
    await db.doc(`ai_usage/${providerId}`).update({
      aiCallsLimit: 0,
      currentPeriodCalls: 0,
      trialCallsUsed: trialConfig.maxAiCalls, // Marquer trial comme épuisé
      updatedAt: now
    });
    logger.info(`[handleSubscriptionDeleted] Disabled AI access for ${providerId}`);

    // Masquer le profil public du prestataire (évite les pages 404 dans les listings/sitemaps)
    const sosProfileRef = db.doc(`sos_profiles/${providerId}`);
    const sosProfileDoc = await sosProfileRef.get();
    if (sosProfileDoc.exists) {
      await sosProfileRef.update({
        isVisible: false,
        isActive: false,
        hiddenReason: 'subscription_canceled',
        hiddenAt: now,
        updatedAt: now
      });
      logger.info(`[handleSubscriptionDeleted] Hidden sos_profile for ${providerId}`);
    }

    // Logger l'action
    await logSubscriptionAction({
      providerId,
      action: 'subscription_deleted',
      previousState: previousState || undefined,
      newState: updates,
      stripeEventId: context?.eventId,
      stripeEventType: context?.eventType,
      metadata: {
        cancellationReason: subscription.cancellation_details?.reason,
        previousTier: previousState?.tier
      }
    });

    // Envoyer email de fin d'abonnement
    const providerInfo = await getProviderInfo(providerId);
    if (providerInfo?.email) {
      await enqueueNotification({
        eventId: 'subscription.ended',
        providerId,
        email: providerInfo.email,
        locale: providerInfo.language,
        vars: {
          FNAME: providerInfo.firstName,
          PLAN_NAME: previousState?.tier || 'unknown',
          RESUBSCRIBE_URL: 'https://sos-expat.com/dashboard/subscription/plans',
          FEEDBACK_URL: 'https://sos-expat.com/feedback'
        }
      });
      logger.info(`[handleSubscriptionDeleted] End of subscription email queued for ${providerId}`);
    }

    // Marquer l'événement comme traité après succès
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleSubscriptionDeleted] Completed for provider: ${providerId}`);
  } catch (error) {
    logger.error(`[handleSubscriptionDeleted] Error for ${providerId}:`, error);
    throw error;
  }
}

/**
 * Handler pour customer.subscription.trial_will_end
 * - Envoyer email rappel fin d'essai (3 jours avant)
 */
export async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleTrialWillEnd] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  const providerId = subscription.metadata?.providerId;

  if (!providerId) {
    logger.error('[handleTrialWillEnd] No providerId in metadata');
    return;
  }

  logger.info(`[handleTrialWillEnd] Processing for provider: ${providerId}`);

  const db = getDb();

  try {
    // Calculer les jours restants
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : new Date();
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Récupérer les infos d'usage
    const usageDoc = await db.doc(`ai_usage/${providerId}`).get();
    const usageData = usageDoc.exists ? usageDoc.data() : { trialCallsUsed: 0 };
    const trialCallsUsed = usageData?.trialCallsUsed || 0;

    // Récupérer le plan actuel
    const subDoc = await db.doc(`subscriptions/${providerId}`).get();
    const subData = subDoc.exists ? subDoc.data() : null;
    const planId = subData?.planId || 'trial';

    // Logger l'action
    await logSubscriptionAction({
      providerId,
      action: 'trial_ending_reminder',
      stripeEventId: context?.eventId,
      stripeEventType: context?.eventType,
      metadata: {
        daysRemaining,
        trialEnd: trialEnd.toISOString(),
        trialCallsUsed
      }
    });

    // Envoyer email de rappel
    const providerInfo = await getProviderInfo(providerId);
    if (providerInfo?.email) {
      // Récupérer la config trial pour le nombre max d'appels
      const trialConfig = await getTrialConfig();

      await enqueueNotification({
        eventId: 'subscription.trial_ending',
        providerId,
        email: providerInfo.email,
        locale: providerInfo.language,
        vars: {
          FNAME: providerInfo.firstName,
          DAYS_REMAINING: daysRemaining.toString(),
          TRIAL_END_DATE: trialEnd.toLocaleDateString(providerInfo.language || 'fr-FR'),
          PLAN_NAME: planId,
          AI_CALLS_USED: trialCallsUsed.toString(),
          AI_CALLS_LIMIT: trialConfig.maxAiCalls.toString(),
          UPGRADE_URL: 'https://sos-expat.com/dashboard/subscription/plans'
        }
      });

      logger.info(`[handleTrialWillEnd] Trial ending email sent to ${providerId} (${daysRemaining} days left)`);
    }

    // Marquer l'événement comme traité après succès
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleTrialWillEnd] Completed for provider: ${providerId}`);
  } catch (error) {
    logger.error(`[handleTrialWillEnd] Error for ${providerId}:`, error);
    throw error;
  }
}

/**
 * Handler pour invoice.paid
 * - Mettre à jour currentPeriodStart/End
 * - Reset quota mensuel à 0
 * - Envoyer email confirmation renouvellement
 * - Logger paiement
 */
export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleInvoicePaid] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  if (!invoice.subscription) {
    logger.info('[handleInvoicePaid] No subscription on invoice, skipping');
    return;
  }

  // Récupérer l'abonnement pour avoir le providerId
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id;

  logger.info(`[handleInvoicePaid] Processing invoice ${invoice.id} for subscription ${subscriptionId}`);

  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  try {
    // Trouver le document subscription par stripeSubscriptionId
    const subsSnapshot = await db.collection('subscriptions')
      .where('stripeSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (subsSnapshot.empty) {
      logger.warn(`[handleInvoicePaid] No subscription found for ${subscriptionId}`);
      return;
    }

    const subDoc = subsSnapshot.docs[0];
    const providerId = subDoc.id;
    const subData = subDoc.data();

    // Déterminer si c'est un renouvellement (pas la première facture)
    const isRenewal = invoice.billing_reason === 'subscription_cycle';

    // Mettre à jour le document subscription
    const updates: Record<string, unknown> = {
      status: 'active' as SubscriptionStatus,
      currentPeriodStart: admin.firestore.Timestamp.fromMillis(invoice.period_start * 1000),
      currentPeriodEnd: admin.firestore.Timestamp.fromMillis(invoice.period_end * 1000),
      lastPaymentAt: now,
      lastPaymentAmount: (invoice.amount_paid || 0) / 100,
      lastPaymentCurrency: (invoice.currency || 'eur').toUpperCase(),
      updatedAt: now
    };

    // Appliquer le downgrade programmé si c'est un renouvellement
    if (isRenewal && subData.pendingDowngrade) {
      const downgrade = subData.pendingDowngrade;
      updates.planId = downgrade.planId;
      updates.tier = downgrade.tier;
      updates.aiCallsLimit = downgrade.aiCallsLimit;
      updates.pendingDowngrade = admin.firestore.FieldValue.delete();
      logger.info(`[handleInvoicePaid] Applied pending downgrade: ${downgrade.tier}`);
    }

    await db.doc(`subscriptions/${providerId}`).update(updates);

    // Reset quota mensuel dans ai_usage
    const aiCallsLimit = updates.aiCallsLimit ?? subData.aiCallsLimit ?? 5;
    await db.doc(`ai_usage/${providerId}`).update({
      currentPeriodCalls: 0,
      aiCallsLimit,
      currentPeriodStart: admin.firestore.Timestamp.fromMillis(invoice.period_start * 1000),
      currentPeriodEnd: admin.firestore.Timestamp.fromMillis(invoice.period_end * 1000),
      updatedAt: now
    });
    logger.info(`[handleInvoicePaid] Reset AI usage quota for ${providerId}`);

    // Stocker la facture
    await db.collection('invoices').doc(invoice.id).set({
      stripeInvoiceId: invoice.id,
      providerId,
      subscriptionId: providerId,
      amountDue: (invoice.amount_due || 0) / 100,
      amountPaid: (invoice.amount_paid || 0) / 100,
      currency: (invoice.currency || 'eur').toUpperCase(),
      status: 'paid',
      billingReason: invoice.billing_reason,
      periodStart: admin.firestore.Timestamp.fromMillis(invoice.period_start * 1000),
      periodEnd: admin.firestore.Timestamp.fromMillis(invoice.period_end * 1000),
      dueDate: invoice.due_date
        ? admin.firestore.Timestamp.fromMillis(invoice.due_date * 1000)
        : null,
      paidAt: now,
      invoicePdfUrl: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      createdAt: now
    });
    logger.info(`[handleInvoicePaid] Stored invoice ${invoice.id}`);

    // Marquer dunning comme récupéré si existant
    try {
      const { markDunningRecovered } = await import('../subscriptions/dunning');
      await markDunningRecovered(invoice.id);
      logger.info(`[handleInvoicePaid] Dunning recovered for invoice ${invoice.id}`);
    } catch {
      // Pas de dunning record, c'est normal
    }

    // Logger l'action
    await logSubscriptionAction({
      providerId,
      action: 'invoice_paid',
      stripeEventId: context?.eventId,
      stripeEventType: context?.eventType,
      metadata: {
        invoiceId: invoice.id,
        amount: (invoice.amount_paid || 0) / 100,
        currency: invoice.currency,
        billingReason: invoice.billing_reason,
        isRenewal
      }
    });

    // Envoyer email de confirmation
    const providerInfo = await getProviderInfo(providerId);
    if (providerInfo?.email) {
      if (isRenewal) {
        await enqueueNotification({
          eventId: 'subscription.renewed',
          providerId,
          email: providerInfo.email,
          locale: providerInfo.language,
          vars: {
            FNAME: providerInfo.firstName,
            PLAN_NAME: subData.tier,
            AMOUNT: ((invoice.amount_paid || 0) / 100).toFixed(2),
            CURRENCY: (invoice.currency || 'eur').toUpperCase(),
            NEXT_BILLING_DATE: new Date(invoice.period_end * 1000).toLocaleDateString(providerInfo.language || 'fr-FR'),
            INVOICE_URL: invoice.hosted_invoice_url || '',
            AI_CALLS_LIMIT: aiCallsLimit === -1 ? 'Illimite' : aiCallsLimit.toString()
          }
        });
        logger.info(`[handleInvoicePaid] Renewal confirmation email queued for ${providerId}`);
      } else {
        await enqueueNotification({
          eventId: 'subscription.payment_confirmed',
          providerId,
          email: providerInfo.email,
          locale: providerInfo.language,
          vars: {
            FNAME: providerInfo.firstName,
            PLAN_NAME: subData.tier,
            AMOUNT: ((invoice.amount_paid || 0) / 100).toFixed(2),
            CURRENCY: (invoice.currency || 'eur').toUpperCase(),
            INVOICE_URL: invoice.hosted_invoice_url || ''
          }
        });
        logger.info(`[handleInvoicePaid] Payment confirmation email queued for ${providerId}`);
      }
    }

    // Marquer l'événement comme traité après succès
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleInvoicePaid] Completed for provider: ${providerId}`);
  } catch (error) {
    logger.error(`[handleInvoicePaid] Error:`, error);
    throw error;
  }
}

/**
 * Handler pour invoice.payment_failed
 * - Mettre status='past_due'
 * - Envoyer email urgent avec lien update carte
 * - Après 7 jours: couper accès IA
 * - Logger échec
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleInvoicePaymentFailed] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  if (!invoice.subscription) {
    logger.info('[handleInvoicePaymentFailed] No subscription on invoice, skipping');
    return;
  }

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id;

  logger.info(`[handleInvoicePaymentFailed] Processing invoice ${invoice.id} for subscription ${subscriptionId}`);

  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  try {
    // Trouver le document subscription
    const subsSnapshot = await db.collection('subscriptions')
      .where('stripeSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (subsSnapshot.empty) {
      logger.warn(`[handleInvoicePaymentFailed] No subscription found for ${subscriptionId}`);
      return;
    }

    const subDoc = subsSnapshot.docs[0];
    const providerId = subDoc.id;
    const subData = subDoc.data();

    // Calculer le nombre de jours depuis l'échec initial
    const failureDate = subData.firstPaymentFailureAt?.toDate() || new Date();
    const daysSinceFirstFailure = Math.floor(
      (Date.now() - failureDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Déterminer si on doit couper l'accès (après 7 jours)
    const shouldDisableAccess = daysSinceFirstFailure >= 7;

    // Mettre à jour le document subscription
    const updates: Record<string, unknown> = {
      status: 'past_due' as SubscriptionStatus,
      lastPaymentFailedAt: now,
      lastPaymentFailureReason: invoice.last_finalization_error?.message || 'Payment failed',
      updatedAt: now
    };

    // Marquer la première date d'échec si pas encore définie
    if (!subData.firstPaymentFailureAt) {
      updates.firstPaymentFailureAt = now;
    }

    // Couper l'accès après 7 jours
    if (shouldDisableAccess) {
      updates.aiAccessEnabled = false;
      logger.info(`[handleInvoicePaymentFailed] Disabling AI access for ${providerId} (${daysSinceFirstFailure} days since first failure)`);
    }

    await db.doc(`subscriptions/${providerId}`).update(updates);

    // Mettre à jour ai_usage si accès coupé
    if (shouldDisableAccess) {
      await db.doc(`ai_usage/${providerId}`).update({
        aiCallsLimit: 0,
        updatedAt: now
      });
    }

    // Créer un record de dunning
    try {
      const { createDunningRecord } = await import('../subscriptions/dunning');
      await createDunningRecord(providerId, subscriptionId, invoice.id);
      logger.info(`[handleInvoicePaymentFailed] Dunning record created for ${providerId}`);
    } catch (dunningError) {
      logger.error(`[handleInvoicePaymentFailed] Failed to create dunning record:`, dunningError);
    }

    // Logger l'échec
    await logSubscriptionAction({
      providerId,
      action: 'invoice_payment_failed',
      stripeEventId: context?.eventId,
      stripeEventType: context?.eventType,
      metadata: {
        invoiceId: invoice.id,
        amount: (invoice.amount_due || 0) / 100,
        currency: invoice.currency,
        attemptCount: invoice.attempt_count,
        daysSinceFirstFailure,
        accessDisabled: shouldDisableAccess,
        errorMessage: invoice.last_finalization_error?.message
      }
    });

    // Envoyer email urgent
    const providerInfo = await getProviderInfo(providerId);
    if (providerInfo?.email) {
      const eventId = shouldDisableAccess
        ? 'subscription.access_suspended'
        : 'subscription.payment_failed';

      await enqueueNotification({
        eventId,
        providerId,
        email: providerInfo.email,
        locale: providerInfo.language,
        vars: {
          FNAME: providerInfo.firstName,
          PLAN_NAME: subData.tier,
          AMOUNT: ((invoice.amount_due || 0) / 100).toFixed(2),
          CURRENCY: (invoice.currency || 'eur').toUpperCase(),
          UPDATE_CARD_URL: 'https://sos-expat.com/dashboard/subscription/payment',
          INVOICE_URL: invoice.hosted_invoice_url || '',
          DAYS_UNTIL_SUSPENSION: shouldDisableAccess ? '0' : String(7 - daysSinceFirstFailure),
          ATTEMPT_NUMBER: (invoice.attempt_count || 1).toString()
        }
      });

      logger.info(`[handleInvoicePaymentFailed] ${shouldDisableAccess ? 'Access suspended' : 'Payment failed'} email queued for ${providerId}`);
    }

    // Marquer l'événement comme traité après succès
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleInvoicePaymentFailed] Completed for provider: ${providerId}`);
  } catch (error) {
    logger.error(`[handleInvoicePaymentFailed] Error:`, error);
    throw error;
  }
}

// ============================================================================
// ADDITIONAL WEBHOOK HANDLERS
// ============================================================================

/**
 * Handler pour customer.subscription.paused
 * - Mettre status='paused' dans Firestore
 * - Désactiver temporairement l'accès IA
 * - Envoyer email de notification
 */
export async function handleSubscriptionPaused(
  subscription: Stripe.Subscription,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleSubscriptionPaused] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  const providerId = subscription.metadata?.providerId;

  if (!providerId) {
    logger.error('[handleSubscriptionPaused] No providerId in metadata');
    return;
  }

  logger.info(`[handleSubscriptionPaused] Processing for provider: ${providerId}`);

  const now = admin.firestore.Timestamp.now();
  const db = getDb();

  try {
    // Récupérer l'état précédent pour le log
    const existingDoc = await db.doc(`subscriptions/${providerId}`).get();
    const previousState = existingDoc.exists ? existingDoc.data() : null;

    // Mettre à jour le document subscription
    const updates = {
      status: 'paused' as SubscriptionStatus,
      aiAccessEnabled: false,
      pausedAt: now,
      updatedAt: now
    };

    await db.doc(`subscriptions/${providerId}`).update(updates);
    logger.info(`[handleSubscriptionPaused] Set status to paused for ${providerId}`);

    // Mettre à jour ai_usage - désactiver temporairement l'accès
    await db.doc(`ai_usage/${providerId}`).update({
      updatedAt: now
    });

    // Logger l'action
    await logSubscriptionAction({
      providerId,
      action: 'subscription_paused',
      previousState: previousState || undefined,
      newState: updates,
      stripeEventId: context?.eventId,
      stripeEventType: context?.eventType
    });

    // Envoyer email de notification
    const providerInfo = await getProviderInfo(providerId);
    if (providerInfo?.email) {
      await enqueueNotification({
        eventId: 'subscription.paused',
        providerId,
        email: providerInfo.email,
        locale: providerInfo.language,
        vars: {
          FNAME: providerInfo.firstName,
          PLAN_NAME: previousState?.tier || 'unknown',
          RESUME_URL: 'https://sos-expat.com/dashboard/subscription'
        }
      });
      logger.info(`[handleSubscriptionPaused] Pause notification email queued for ${providerId}`);
    }

    // Marquer l'événement comme traité après succès
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleSubscriptionPaused] Completed for provider: ${providerId}`);
  } catch (error) {
    logger.error(`[handleSubscriptionPaused] Error for ${providerId}:`, error);
    throw error;
  }
}

/**
 * Handler pour customer.subscription.resumed
 * - Mettre status='active' dans Firestore
 * - Réactiver l'accès IA
 * - Envoyer email de confirmation
 */
export async function handleSubscriptionResumed(
  subscription: Stripe.Subscription,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleSubscriptionResumed] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  const providerId = subscription.metadata?.providerId;

  if (!providerId) {
    logger.error('[handleSubscriptionResumed] No providerId in metadata');
    return;
  }

  logger.info(`[handleSubscriptionResumed] Processing for provider: ${providerId}`);

  const now = admin.firestore.Timestamp.now();
  const db = getDb();

  try {
    // Récupérer l'état précédent pour le log
    const existingDoc = await db.doc(`subscriptions/${providerId}`).get();
    const previousState = existingDoc.exists ? existingDoc.data() : null;

    // Mettre à jour le document subscription
    const updates = {
      status: mapStripeStatus(subscription.status),
      aiAccessEnabled: true,
      pausedAt: admin.firestore.FieldValue.delete(),
      updatedAt: now
    };

    await db.doc(`subscriptions/${providerId}`).update(updates);
    logger.info(`[handleSubscriptionResumed] Resumed subscription for ${providerId}`);

    // Logger l'action
    await logSubscriptionAction({
      providerId,
      action: 'subscription_resumed',
      previousState: previousState || undefined,
      newState: updates,
      stripeEventId: context?.eventId,
      stripeEventType: context?.eventType
    });

    // Envoyer email de confirmation
    const providerInfo = await getProviderInfo(providerId);
    if (providerInfo?.email) {
      await enqueueNotification({
        eventId: 'subscription.resumed',
        providerId,
        email: providerInfo.email,
        locale: providerInfo.language,
        vars: {
          FNAME: providerInfo.firstName,
          PLAN_NAME: previousState?.tier || 'unknown',
          AI_CALLS_LIMIT: previousState?.aiCallsLimit === -1 ? 'Illimite' : (previousState?.aiCallsLimit || 5).toString(),
          DASHBOARD_URL: 'https://sos-expat.com/dashboard'
        }
      });
      logger.info(`[handleSubscriptionResumed] Resume notification email queued for ${providerId}`);
    }

    // Marquer l'événement comme traité après succès
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleSubscriptionResumed] Completed for provider: ${providerId}`);
  } catch (error) {
    logger.error(`[handleSubscriptionResumed] Error for ${providerId}:`, error);
    throw error;
  }
}

/**
 * Handler pour invoice.created
 * - Stocker la facture en attente
 * - Logger pour audit
 */
export async function handleInvoiceCreated(
  invoice: Stripe.Invoice,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleInvoiceCreated] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  if (!invoice.subscription) {
    logger.info('[handleInvoiceCreated] No subscription on invoice, skipping');
    return;
  }

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id;

  logger.info(`[handleInvoiceCreated] Processing invoice ${invoice.id} for subscription ${subscriptionId}`);

  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  try {
    // Trouver le document subscription par stripeSubscriptionId
    const subsSnapshot = await db.collection('subscriptions')
      .where('stripeSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (subsSnapshot.empty) {
      logger.warn(`[handleInvoiceCreated] No subscription found for ${subscriptionId}`);
      return;
    }

    const subDoc = subsSnapshot.docs[0];
    const providerId = subDoc.id;

    // Stocker la facture avec status draft/open
    await db.collection('invoices').doc(invoice.id).set({
      stripeInvoiceId: invoice.id,
      providerId,
      subscriptionId: providerId,
      amountDue: (invoice.amount_due || 0) / 100,
      amountPaid: 0,
      currency: (invoice.currency || 'eur').toUpperCase(),
      status: invoice.status || 'draft',
      billingReason: invoice.billing_reason,
      periodStart: invoice.period_start
        ? admin.firestore.Timestamp.fromMillis(invoice.period_start * 1000)
        : null,
      periodEnd: invoice.period_end
        ? admin.firestore.Timestamp.fromMillis(invoice.period_end * 1000)
        : null,
      dueDate: invoice.due_date
        ? admin.firestore.Timestamp.fromMillis(invoice.due_date * 1000)
        : null,
      invoicePdfUrl: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      createdAt: now
    });

    logger.info(`[handleInvoiceCreated] Stored draft invoice ${invoice.id} for ${providerId}`);

    // Logger l'action
    await logSubscriptionAction({
      providerId,
      action: 'invoice_created',
      stripeEventId: context?.eventId,
      stripeEventType: context?.eventType,
      metadata: {
        invoiceId: invoice.id,
        amount: (invoice.amount_due || 0) / 100,
        currency: invoice.currency,
        status: invoice.status
      }
    });

    // Marquer l'événement comme traité après succès
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleInvoiceCreated] Completed for provider: ${providerId}`);
  } catch (error) {
    logger.error(`[handleInvoiceCreated] Error:`, error);
    throw error;
  }
}

/**
 * Handler pour payment_method.attached / payment_method.updated
 * - Logger la mise à jour de méthode de paiement
 * - Envoyer notification si nécessaire
 */
export async function handlePaymentMethodUpdated(
  paymentMethod: Stripe.PaymentMethod,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handlePaymentMethodUpdated] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  const customerId = typeof paymentMethod.customer === 'string'
    ? paymentMethod.customer
    : paymentMethod.customer?.id;

  if (!customerId) {
    logger.info('[handlePaymentMethodUpdated] No customer on payment method, skipping');
    return;
  }

  logger.info(`[handlePaymentMethodUpdated] Processing payment method ${paymentMethod.id} for customer ${customerId}`);

  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  try {
    // Trouver le document subscription par stripeCustomerId
    const subsSnapshot = await db.collection('subscriptions')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (subsSnapshot.empty) {
      logger.warn(`[handlePaymentMethodUpdated] No subscription found for customer ${customerId}`);
      return;
    }

    const subDoc = subsSnapshot.docs[0];
    const providerId = subDoc.id;
    const subData = subDoc.data();

    // Mettre à jour les infos de carte dans subscription
    const card = paymentMethod.card;
    if (card) {
      await db.doc(`subscriptions/${providerId}`).update({
        paymentMethod: {
          type: paymentMethod.type,
          cardBrand: card.brand,
          cardLast4: card.last4,
          cardExpMonth: card.exp_month,
          cardExpYear: card.exp_year,
          updatedAt: now
        },
        updatedAt: now
      });
      logger.info(`[handlePaymentMethodUpdated] Updated payment method info for ${providerId}`);
    }

    // Logger l'action
    await logSubscriptionAction({
      providerId,
      action: 'payment_method_updated',
      stripeEventId: context?.eventId,
      stripeEventType: context?.eventType,
      metadata: {
        paymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        cardBrand: card?.brand,
        cardLast4: card?.last4
      }
    });

    // Si l'abonnement était en past_due, envoyer notification
    if (subData.status === 'past_due') {
      const providerInfo = await getProviderInfo(providerId);
      if (providerInfo?.email) {
        await enqueueNotification({
          eventId: 'subscription.payment_method_updated',
          providerId,
          email: providerInfo.email,
          locale: providerInfo.language,
          vars: {
            FNAME: providerInfo.firstName,
            CARD_BRAND: card?.brand?.toUpperCase() || 'Card',
            CARD_LAST4: card?.last4 || '****'
          }
        });
        logger.info(`[handlePaymentMethodUpdated] Payment method update notification queued for ${providerId}`);
      }
    }

    // Marquer l'événement comme traité après succès
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handlePaymentMethodUpdated] Completed for provider: ${providerId}`);
  } catch (error) {
    logger.error(`[handlePaymentMethodUpdated] Error:`, error);
    throw error;
  }
}

// ============================================================================
// PAYOUT & REFUND HANDLERS
// ============================================================================

/**
 * Handler pour payout.failed
 * - Logger l'échec du payout
 * - Notifier l'admin
 */
export async function handlePayoutFailed(
  payout: Stripe.Payout,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handlePayoutFailed] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  logger.error(`[handlePayoutFailed] Payout ${payout.id} failed: ${payout.failure_message}`);

  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  try {
    // Logger l'échec dans payout_logs
    await db.collection('payout_logs').add({
      stripePayoutId: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency?.toUpperCase(),
      status: 'failed',
      failureCode: payout.failure_code,
      failureMessage: payout.failure_message,
      destination: payout.destination,
      createdAt: now
    });

    // Notifier les admins
    await db.collection('admin_alerts').add({
      type: 'payout_failed',
      severity: 'high',
      message: `Payout ${payout.id} échoué: ${payout.failure_message}`,
      data: {
        payoutId: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        failureCode: payout.failure_code,
        failureMessage: payout.failure_message
      },
      read: false,
      createdAt: now
    });

    // Marquer l'événement comme traité
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handlePayoutFailed] Completed for payout: ${payout.id}`);
  } catch (error) {
    logger.error(`[handlePayoutFailed] Error:`, error);
    throw error;
  }
}

/**
 * Handler pour refund.failed
 * - Logger l'échec du remboursement
 * - Notifier le client et l'admin
 */
export async function handleRefundFailed(
  refund: Stripe.Refund,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleRefundFailed] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  logger.error(`[handleRefundFailed] Refund ${refund.id} failed: ${refund.failure_reason}`);

  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  try {
    // Trouver le paiement original
    const chargeId = typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;

    // Mettre à jour le document de remboursement s'il existe
    if (chargeId) {
      const refundQuery = await db.collection('refunds')
        .where('stripeChargeId', '==', chargeId)
        .limit(1)
        .get();

      if (!refundQuery.empty) {
        const refundDoc = refundQuery.docs[0];
        await refundDoc.ref.update({
          status: 'failed',
          failureReason: refund.failure_reason,
          updatedAt: now
        });
      }
    }

    // Logger l'échec
    await db.collection('refund_logs').add({
      stripeRefundId: refund.id,
      stripeChargeId: chargeId,
      amount: refund.amount / 100,
      currency: refund.currency?.toUpperCase(),
      status: 'failed',
      failureReason: refund.failure_reason,
      createdAt: now
    });

    // Notifier les admins
    await db.collection('admin_alerts').add({
      type: 'refund_failed',
      severity: 'high',
      message: `Remboursement ${refund.id} échoué: ${refund.failure_reason}`,
      data: {
        refundId: refund.id,
        chargeId,
        amount: refund.amount / 100,
        currency: refund.currency,
        failureReason: refund.failure_reason
      },
      read: false,
      createdAt: now
    });

    // Marquer l'événement comme traité
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleRefundFailed] Completed for refund: ${refund.id}`);
  } catch (error) {
    logger.error(`[handleRefundFailed] Error:`, error);
    throw error;
  }
}

/**
 * Handler pour payment_intent.payment_failed
 * - Logger l'échec du paiement
 * - Notifier le client
 */
export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handlePaymentIntentFailed] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  const lastError = paymentIntent.last_payment_error;
  logger.error(`[handlePaymentIntentFailed] PaymentIntent ${paymentIntent.id} failed: ${lastError?.message}`);

  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  try {
    // Extraire l'ID client des metadata
    const clientId = paymentIntent.metadata?.clientId || paymentIntent.metadata?.userId;
    const callId = paymentIntent.metadata?.callId;

    // Logger l'échec
    await db.collection('payment_failures').add({
      stripePaymentIntentId: paymentIntent.id,
      clientId,
      callId,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency?.toUpperCase(),
      errorCode: lastError?.code,
      errorMessage: lastError?.message,
      errorType: lastError?.type,
      declineCode: lastError?.decline_code,
      createdAt: now
    });

    // Notifier le client si identifié
    if (clientId) {
      const clientDoc = await db.doc(`users/${clientId}`).get();
      if (clientDoc.exists) {
        const clientData = clientDoc.data()!;

        await enqueueNotification({
          eventId: 'payment.failed',
          providerId: clientId,
          email: clientData.email,
          locale: clientData.language || clientData.preferredLanguage || 'en',
          vars: {
            FNAME: clientData.firstName || clientData.displayName || '',
            AMOUNT: (paymentIntent.amount / 100).toFixed(2),
            CURRENCY: paymentIntent.currency?.toUpperCase() || 'EUR',
            ERROR_MESSAGE: lastError?.message || 'Payment failed',
            RETRY_URL: 'https://sos-expat.com/dashboard/payments'
          }
        });
      }
    }

    // Marquer l'événement comme traité
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handlePaymentIntentFailed] Completed for payment intent: ${paymentIntent.id}`);
  } catch (error) {
    logger.error(`[handlePaymentIntentFailed] Error:`, error);
    throw error;
  }
}

// ============================================================================
// PAYMENT ACTION REQUIRED HANDLER
// ============================================================================

/**
 * Handler pour invoice.payment_action_required
 * - Envoyer email urgent avec lien de confirmation 3D Secure
 * - Ce cas se produit quand la banque exige une authentification supplémentaire (SCA)
 */
export async function handleInvoicePaymentActionRequired(
  invoice: Stripe.Invoice,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleInvoicePaymentActionRequired] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  if (!invoice.subscription) {
    logger.info('[handleInvoicePaymentActionRequired] No subscription on invoice, skipping');
    return;
  }

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id;

  logger.info(`[handleInvoicePaymentActionRequired] Processing invoice ${invoice.id} for subscription ${subscriptionId}`);

  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  try {
    // Trouver le document subscription
    const subsSnapshot = await db.collection('subscriptions')
      .where('stripeSubscriptionId', '==', subscriptionId)
      .limit(1)
      .get();

    if (subsSnapshot.empty) {
      logger.warn(`[handleInvoicePaymentActionRequired] No subscription found for ${subscriptionId}`);
      return;
    }

    const subDoc = subsSnapshot.docs[0];
    const providerId = subDoc.id;
    const subData = subDoc.data();

    // Mettre à jour le document subscription pour indiquer l'action requise
    await db.doc(`subscriptions/${providerId}`).update({
      paymentActionRequired: true,
      paymentActionRequiredAt: now,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      updatedAt: now
    });

    // Logger l'action
    await logSubscriptionAction({
      providerId,
      action: 'payment_action_required',
      stripeEventId: context?.eventId,
      stripeEventType: context?.eventType,
      metadata: {
        invoiceId: invoice.id,
        amount: (invoice.amount_due || 0) / 100,
        currency: invoice.currency,
        hostedInvoiceUrl: invoice.hosted_invoice_url
      }
    });

    // Envoyer email urgent avec lien 3D Secure
    const providerInfo = await getProviderInfo(providerId);
    if (providerInfo?.email) {
      await enqueueNotification({
        eventId: 'subscription.payment_action_required',
        providerId,
        email: providerInfo.email,
        locale: providerInfo.language,
        vars: {
          FNAME: providerInfo.firstName,
          PLAN_NAME: subData.tier,
          AMOUNT: ((invoice.amount_due || 0) / 100).toFixed(2),
          CURRENCY: (invoice.currency || 'eur').toUpperCase(),
          CONFIRM_PAYMENT_URL: invoice.hosted_invoice_url || 'https://sos-expat.com/dashboard/subscription/payment',
          DEADLINE_HOURS: '24'
        }
      });

      logger.info(`[handleInvoicePaymentActionRequired] 3D Secure action required email queued for ${providerId}`);
    }

    // Marquer l'événement comme traité après succès
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleInvoicePaymentActionRequired] Completed for provider: ${providerId}`);
  } catch (error) {
    logger.error(`[handleInvoicePaymentActionRequired] Error:`, error);
    throw error;
  }
}

// ============================================================================
// DISPUTE HANDLERS
// ============================================================================

/**
 * Handler pour charge.dispute.created
 * - Créer un document dispute
 * - Notifier l'admin
 * - Logger pour audit
 */
export async function handleDisputeCreated(
  dispute: Stripe.Dispute,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleDisputeCreated] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  logger.warn(`[handleDisputeCreated] Dispute ${dispute.id} created for charge ${dispute.charge}`);

  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  try {
    const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;

    // Créer le document dispute
    await db.collection('disputes').doc(dispute.id).set({
      stripeDisputeId: dispute.id,
      stripeChargeId: chargeId,
      amount: dispute.amount / 100,
      currency: dispute.currency?.toUpperCase(),
      reason: dispute.reason,
      status: dispute.status,
      evidenceDueBy: dispute.evidence_details?.due_by
        ? admin.firestore.Timestamp.fromMillis(dispute.evidence_details.due_by * 1000)
        : null,
      isChargeRefundable: dispute.is_charge_refundable,
      createdAt: now,
      updatedAt: now
    });

    // Trouver la transaction originale pour lier au client/provider
    const paymentQuery = await db.collection('payments')
      .where('stripeChargeId', '==', chargeId)
      .limit(1)
      .get();

    let clientId: string | null = null;
    let providerId: string | null = null;

    if (!paymentQuery.empty) {
      const paymentData = paymentQuery.docs[0].data();
      clientId = paymentData.clientId;
      providerId = paymentData.providerId;

      // Mettre à jour le paiement avec le dispute
      await paymentQuery.docs[0].ref.update({
        hasDispute: true,
        disputeId: dispute.id,
        disputeStatus: dispute.status,
        updatedAt: now
      });
    }

    // Notifier les admins (haute priorité)
    await db.collection('admin_alerts').add({
      type: 'dispute_created',
      severity: 'critical',
      message: `Nouveau litige (${dispute.reason}) - ${dispute.amount / 100} ${dispute.currency?.toUpperCase()}`,
      data: {
        disputeId: dispute.id,
        chargeId,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        reason: dispute.reason,
        clientId,
        providerId,
        evidenceDueBy: dispute.evidence_details?.due_by
      },
      read: false,
      createdAt: now
    });

    // Logger l'action
    await db.collection('dispute_logs').add({
      stripeDisputeId: dispute.id,
      action: 'created',
      chargeId,
      amount: dispute.amount / 100,
      reason: dispute.reason,
      status: dispute.status,
      clientId,
      providerId,
      stripeEventId: context?.eventId,
      createdAt: now
    });

    // Marquer l'événement comme traité
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleDisputeCreated] Completed for dispute: ${dispute.id}`);
  } catch (error) {
    logger.error(`[handleDisputeCreated] Error:`, error);
    throw error;
  }
}

/**
 * Handler pour charge.dispute.closed
 * - Mettre à jour le document dispute
 * - Notifier l'admin du résultat
 * - Logger pour audit
 */
export async function handleDisputeClosed(
  dispute: Stripe.Dispute,
  context?: WebhookContext
): Promise<void> {
  // Idempotency check
  if (context?.eventId) {
    if (await isEventAlreadyProcessed(context.eventId)) {
      logger.info(`[handleDisputeClosed] Event ${context.eventId} already processed, skipping`);
      return;
    }
  }

  logger.info(`[handleDisputeClosed] Dispute ${dispute.id} closed with status: ${dispute.status}`);

  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  try {
    const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id;

    // Mettre à jour le document dispute
    await db.collection('disputes').doc(dispute.id).update({
      status: dispute.status,
      closedAt: now,
      updatedAt: now
    });

    // Déterminer le résultat
    const isWon = dispute.status === 'won';
    const isLost = dispute.status === 'lost';
    const resultText = isWon ? 'gagné' : isLost ? 'perdu' : dispute.status;

    // Mettre à jour le paiement lié
    const paymentQuery = await db.collection('payments')
      .where('stripeChargeId', '==', chargeId)
      .limit(1)
      .get();

    if (!paymentQuery.empty) {
      await paymentQuery.docs[0].ref.update({
        disputeStatus: dispute.status,
        disputeClosedAt: now,
        updatedAt: now
      });
    }

    // Notifier les admins
    await db.collection('admin_alerts').add({
      type: 'dispute_closed',
      severity: isLost ? 'high' : 'medium',
      message: `Litige ${dispute.id} ${resultText} - ${dispute.amount / 100} ${dispute.currency?.toUpperCase()}`,
      data: {
        disputeId: dispute.id,
        chargeId,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
        result: resultText
      },
      read: false,
      createdAt: now
    });

    // Logger l'action
    await db.collection('dispute_logs').add({
      stripeDisputeId: dispute.id,
      action: 'closed',
      chargeId,
      amount: dispute.amount / 100,
      reason: dispute.reason,
      status: dispute.status,
      result: resultText,
      stripeEventId: context?.eventId,
      createdAt: now
    });

    // Marquer l'événement comme traité
    if (context?.eventId) {
      await markEventAsProcessed(context.eventId, context.eventType);
    }

    logger.info(`[handleDisputeClosed] Completed for dispute: ${dispute.id} (${resultText})`);
  } catch (error) {
    logger.error(`[handleDisputeClosed] Error:`, error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const webhookHandlers = {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleSubscriptionPaused,
  handleSubscriptionResumed,
  handleTrialWillEnd,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleInvoicePaymentActionRequired,
  handleInvoiceCreated,
  handlePaymentMethodUpdated,
  handlePayoutFailed,
  handleRefundFailed,
  handlePaymentIntentFailed,
  handleDisputeCreated,
  handleDisputeClosed
};
