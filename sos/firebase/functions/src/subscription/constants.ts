/**
 * SOS-Expat Subscription Constants
 * Fichier centralisé pour toutes les constantes du système d'abonnement
 *
 * P0 FIX: Centralisation des valeurs hardcodées
 * Ces valeurs sont les defaults utilisés si Firestore settings n'existe pas
 */

// ============================================================================
// SUBSCRIPTION STATUS TYPES (source unique de vérité)
// ============================================================================

/**
 * Tous les statuts possibles d'un abonnement
 * P0 FIX: Ajout de 'suspended' qui était utilisé mais non typé
 */
export const SUBSCRIPTION_STATUSES = [
  'trialing',   // En période d'essai
  'active',     // Abonnement actif et payé
  'past_due',   // Paiement en retard (grace period)
  'canceled',   // Annulé (accès jusqu'à fin période)
  'expired',    // Expiré (plus d'accès)
  'paused',     // Mis en pause
  'suspended'   // Suspendu (après 7j past_due)
] as const;

export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

export const SUBSCRIPTION_TIERS = ['trial', 'basic', 'standard', 'pro', 'unlimited'] as const;
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

// ============================================================================
// TRIAL CONFIGURATION (defaults)
// ============================================================================

/**
 * Configuration par défaut de la période d'essai
 * Utilisé si settings/subscription.trial n'existe pas dans Firestore
 */
export const DEFAULT_TRIAL_CONFIG = {
  durationDays: 30,    // Durée de l'essai en jours
  maxAiCalls: 3,       // Nombre max d'appels IA pendant l'essai
  isEnabled: true      // Activer/désactiver l'essai gratuit
} as const;

// ============================================================================
// QUOTA AND LIMITS
// ============================================================================

/**
 * Période de grâce pour les paiements en retard (past_due)
 * Après cette période, l'abonnement passe en 'suspended' et l'accès est coupé
 */
export const DEFAULT_GRACE_PERIOD_DAYS = 7;

/**
 * Limite fair use pour les plans illimités (-1)
 * Même les plans "illimités" ont une limite raisonnable
 */
export const FAIR_USE_LIMIT = 500;

/**
 * Seuil d'alerte quota (80%)
 * Envoie une notification quand ce seuil est atteint
 */
export const QUOTA_WARNING_THRESHOLD = 0.8;

// ============================================================================
// AI CALLS LIMITS PAR TIER
// ============================================================================

/**
 * Limites d'appels IA par tier
 * -1 = illimité (avec fair use limit)
 */
export const AI_CALLS_LIMIT_BY_TIER: Record<SubscriptionTier, number> = {
  trial: 3,       // 3 appels max pendant l'essai
  basic: 5,       // 5 appels/mois
  standard: 15,   // 15 appels/mois
  pro: 30,        // 30 appels/mois
  unlimited: -1   // Illimité (fair use: 500/mois)
};

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/**
 * TTL du cache pour les webhooks (30 minutes)
 * Les mappings de prix sont très stables
 */
export const WEBHOOK_CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * TTL du cache pour les plans frontend (24 heures)
 */
export const PLANS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * TTL du cache pour la config trial (1 heure)
 */
export const TRIAL_CONFIG_CACHE_TTL_MS = 60 * 60 * 1000;

// ============================================================================
// PRICING DEFAULTS
// ============================================================================

export const DEFAULT_ANNUAL_DISCOUNT_PERCENT = 20;

// ============================================================================
// APP URLS (P2 FIX: Centralized URLs instead of hardcoding)
// ============================================================================

/**
 * URL de base de l'application
 * Utilise APP_URL en production, fallback sur sos-expat.com
 */
export const getAppBaseUrl = (): string => {
  const appUrl = process.env.APP_URL || 'https://sos-expat.com';
  try {
    // Validate URL format
    new URL(appUrl);
    return appUrl.replace(/\/$/, ''); // Remove trailing slash
  } catch {
    return 'https://sos-expat.com';
  }
};

/**
 * URLs centralisées de l'application
 * P2 FIX: Évite la duplication de strings dans le codebase
 */
export const APP_URLS = {
  /** URL de base */
  get BASE() { return getAppBaseUrl(); },

  /** Dashboard subscription */
  get SUBSCRIPTION_DASHBOARD() { return `${getAppBaseUrl()}/dashboard/subscription`; },

  /** Page des plans */
  get PLANS() { return `${getAppBaseUrl()}/dashboard/subscription/plans`; },

  /** Page de paiement */
  get PAYMENT() { return `${getAppBaseUrl()}/dashboard/subscription/payment`; },

  /** Page feedback */
  get FEEDBACK() { return `${getAppBaseUrl()}/feedback`; },

  /** Page de mise à jour carte */
  get UPDATE_CARD() { return `${getAppBaseUrl()}/dashboard/subscription/payment-method`; },

  /** Portail client Stripe */
  get BILLING_PORTAL() { return `${getAppBaseUrl()}/dashboard/subscription/billing`; },

  /** Page de support */
  get SUPPORT() { return `${getAppBaseUrl()}/support`; }
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Vérifie si un statut est valide
 */
export function isValidSubscriptionStatus(status: string): status is SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(status as SubscriptionStatus);
}

/**
 * Vérifie si un tier est valide
 */
export function isValidSubscriptionTier(tier: string): tier is SubscriptionTier {
  return SUBSCRIPTION_TIERS.includes(tier as SubscriptionTier);
}

/**
 * Retourne la limite d'appels IA pour un tier
 */
export function getAiCallsLimitForTier(tier: SubscriptionTier): number {
  return AI_CALLS_LIMIT_BY_TIER[tier] ?? 0;
}

/**
 * Vérifie si un statut permet l'accès IA
 */
export function isStatusAllowingAccess(status: SubscriptionStatus): boolean {
  return ['trialing', 'active', 'past_due'].includes(status);
}

/**
 * Vérifie si un statut nécessite une action utilisateur
 */
export function isStatusRequiringAction(status: SubscriptionStatus): boolean {
  return ['past_due', 'canceled', 'expired', 'suspended'].includes(status);
}

// ============================================================================
// P2 FIX: FIRESTORE INDEXES DOCUMENTATION
// These indexes are required for optimal query performance
// Deploy with: firebase deploy --only firestore:indexes
// ============================================================================

/**
 * Required Firestore composite indexes for the subscription system.
 *
 * Add these to firestore.indexes.json:
 *
 * ```json
 * {
 *   "indexes": [
 *     {
 *       "collectionGroup": "subscriptions",
 *       "queryScope": "COLLECTION",
 *       "fields": [
 *         { "fieldPath": "status", "order": "ASCENDING" },
 *         { "fieldPath": "pastDueSince", "order": "ASCENDING" }
 *       ]
 *     },
 *     {
 *       "collectionGroup": "subscriptions",
 *       "queryScope": "COLLECTION",
 *       "fields": [
 *         { "fieldPath": "stripeSubscriptionId", "order": "ASCENDING" }
 *       ]
 *     },
 *     {
 *       "collectionGroup": "ai_usage",
 *       "queryScope": "COLLECTION",
 *       "fields": [
 *         { "fieldPath": "currentPeriodEnd", "order": "ASCENDING" },
 *         { "fieldPath": "providerId", "order": "ASCENDING" }
 *       ]
 *     },
 *     {
 *       "collectionGroup": "processed_webhook_events",
 *       "queryScope": "COLLECTION",
 *       "fields": [
 *         { "fieldPath": "expiresAt", "order": "ASCENDING" }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export const REQUIRED_FIRESTORE_INDEXES = [
  {
    collection: 'subscriptions',
    fields: ['status', 'pastDueSince'],
    description: 'Query past_due subscriptions for grace period enforcement'
  },
  {
    collection: 'subscriptions',
    fields: ['stripeSubscriptionId'],
    description: 'Lookup subscription by Stripe subscription ID'
  },
  {
    collection: 'ai_usage',
    fields: ['currentPeriodEnd', 'providerId'],
    description: 'Query AI usage records for quota alerts and reset'
  },
  {
    collection: 'processed_webhook_events',
    fields: ['expiresAt'],
    description: 'TTL cleanup of processed webhook events'
  }
] as const;
