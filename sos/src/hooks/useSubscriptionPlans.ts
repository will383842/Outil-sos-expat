/**
 * useSubscriptionPlans Hook
 * Gestion des plans d'abonnement disponibles avec pattern SWR-like
 *
 * @description Hook React pour charger et manipuler les plans d'abonnement, avec:
 * - Écoute temps réel Firestore des plans
 * - Cache automatique et helpers de recherche
 * - Recommandation de plan intelligente
 * - Support des types de prestataires (lawyer, expat_aidant)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  SubscriptionPlan,
  SubscriptionTier,
  ProviderType,
  DEFAULT_AI_CALLS_LIMIT
} from '../types/subscription';
import {
  getSubscriptionPlans,
  subscribeToPlans
} from '../services/subscription/subscriptionService';

// ============================================================================
// TYPES
// ============================================================================

interface UseSubscriptionPlansReturn {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: Error | null;

  // Helpers
  getPlanById: (id: string) => SubscriptionPlan | undefined;
  getPlanByTier: (tier: SubscriptionTier) => SubscriptionPlan | undefined;
  getRecommendedPlan: () => SubscriptionPlan;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

// Tier de plan recommandé par défaut
const RECOMMENDED_TIER: SubscriptionTier = 'standard';

// Ordre des tiers pour la recommandation fallback
const TIER_ORDER: SubscriptionTier[] = ['basic', 'standard', 'pro', 'unlimited'];

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

interface CacheEntry {
  data: SubscriptionPlan[];
  timestamp: number;
}

const plansCache = new Map<ProviderType, CacheEntry>();

function getCachedPlans(providerType: ProviderType): SubscriptionPlan[] | null {
  const entry = plansCache.get(providerType);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
  if (isExpired) {
    plansCache.delete(providerType);
    return null;
  }

  return entry.data;
}

function setCachedPlans(providerType: ProviderType, plans: SubscriptionPlan[]): void {
  plansCache.set(providerType, {
    data: plans,
    timestamp: Date.now()
  });
}

// ============================================================================
// DEFAULT FALLBACK PLAN
// ============================================================================

/**
 * Crée un plan par défaut en cas d'absence de plans dans Firestore
 * Utilisé pour éviter les erreurs quand la base n'est pas initialisée
 */
function createDefaultPlan(providerType: ProviderType, tier: SubscriptionTier): SubscriptionPlan {
  const isLawyer = providerType === 'lawyer';

  const pricing = {
    basic: { EUR: isLawyer ? 14 : 9, USD: isLawyer ? 19 : 9 },
    standard: { EUR: isLawyer ? 39 : 14, USD: isLawyer ? 49 : 17 },
    pro: { EUR: isLawyer ? 69 : 24, USD: isLawyer ? 79 : 29 },
    unlimited: { EUR: isLawyer ? 119 : 39, USD: isLawyer ? 139 : 49 }
  };

  const tierPricing = pricing[tier as keyof typeof pricing] || pricing.standard;

  return {
    id: `${providerType}_${tier}`,
    tier,
    providerType,
    name: {
      fr: tier.charAt(0).toUpperCase() + tier.slice(1),
      en: tier.charAt(0).toUpperCase() + tier.slice(1),
      es: tier.charAt(0).toUpperCase() + tier.slice(1),
      de: tier.charAt(0).toUpperCase() + tier.slice(1),
      pt: tier.charAt(0).toUpperCase() + tier.slice(1),
      ru: tier.charAt(0).toUpperCase() + tier.slice(1),
      hi: tier.charAt(0).toUpperCase() + tier.slice(1),
      ar: tier.charAt(0).toUpperCase() + tier.slice(1),
      ch: tier.charAt(0).toUpperCase() + tier.slice(1)
    },
    description: {
      fr: `Plan ${tier} pour ${isLawyer ? 'avocats' : 'expat aidants'}`,
      en: `${tier} plan for ${isLawyer ? 'lawyers' : 'expat helpers'}`,
      es: `Plan ${tier} para ${isLawyer ? 'abogados' : 'ayudantes expatriados'}`,
      de: `${tier} Plan für ${isLawyer ? 'Anwälte' : 'Expat-Helfer'}`,
      pt: `Plano ${tier} para ${isLawyer ? 'advogados' : 'ajudantes de expatriados'}`,
      ru: `${tier} план для ${isLawyer ? 'юристов' : 'помощников экспатов'}`,
      hi: `${isLawyer ? 'वकीलों' : 'एक्सपैट हेल्पर्स'} के लिए ${tier} योजना`,
      ar: `خطة ${tier} لـ ${isLawyer ? 'المحامين' : 'مساعدي المغتربين'}`,
      ch: `${isLawyer ? '律师' : '外派助手'}的${tier}计划`
    },
    pricing: tierPricing,
    aiCallsLimit: DEFAULT_AI_CALLS_LIMIT[tier],
    features: [
      {
        key: 'ai_access',
        name: {
          fr: 'Accès IA',
          en: 'AI Access',
          es: 'Acceso IA',
          de: 'KI-Zugang',
          pt: 'Acesso IA',
          ru: 'Доступ к ИИ',
          hi: 'एआई एक्सेस',
          ar: 'الوصول إلى الذكاء الاصطناعي',
          ch: 'AI访问'
        },
        included: true
      }
    ],
    stripePriceId: {
      EUR: `price_${providerType}_${tier}_eur`,
      USD: `price_${providerType}_${tier}_usd`
    },
    isActive: true,
    sortOrder: TIER_ORDER.indexOf(tier),
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useSubscriptionPlans(providerType: ProviderType): UseSubscriptionPlansReturn {
  // State
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs pour éviter les race conditions
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Subscribe to real-time plans updates
  useEffect(() => {
    if (!providerType) {
      setPlans([]);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cachedPlans = getCachedPlans(providerType);
    if (cachedPlans && cachedPlans.length > 0) {
      setPlans(cachedPlans);
      setIsLoading(false);
      // Continue to subscribe for real-time updates
    } else {
      setIsLoading(true);
    }

    setError(null);

    const unsubscribe = subscribeToPlans(providerType, (loadedPlans) => {
      if (!isMounted.current) return;

      if (loadedPlans.length > 0) {
        // Sort by sortOrder
        const sortedPlans = [...loadedPlans].sort((a, b) => a.sortOrder - b.sortOrder);
        setCachedPlans(providerType, sortedPlans);
        setPlans(sortedPlans);
      } else {
        // Si pas de plans dans Firestore, créer des plans par défaut
        const defaultPlans = TIER_ORDER
          .filter(tier => tier !== 'trial')
          .map(tier => createDefaultPlan(providerType, tier));
        setPlans(defaultPlans);
      }

      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [providerType]);

  // ============================================================================
  // HELPERS (MEMOIZED)
  // ============================================================================

  /**
   * Récupère un plan par son ID
   */
  const getPlanById = useCallback((id: string): SubscriptionPlan | undefined => {
    return plans.find(plan => plan.id === id);
  }, [plans]);

  /**
   * Récupère un plan par son tier
   */
  const getPlanByTier = useCallback((tier: SubscriptionTier): SubscriptionPlan | undefined => {
    return plans.find(plan => plan.tier === tier);
  }, [plans]);

  /**
   * Retourne le plan recommandé
   * Par défaut: Standard (meilleur rapport qualité/prix)
   * Fallback: Le premier plan disponible
   */
  const getRecommendedPlan = useCallback((): SubscriptionPlan => {
    // Essayer d'abord le tier recommandé
    const recommendedPlan = plans.find(plan => plan.tier === RECOMMENDED_TIER);
    if (recommendedPlan) return recommendedPlan;

    // Fallback: parcourir les tiers dans l'ordre et retourner le premier disponible
    for (const tier of TIER_ORDER) {
      const plan = plans.find(p => p.tier === tier);
      if (plan) return plan;
    }

    // Dernier fallback: créer un plan standard par défaut
    return createDefaultPlan(providerType, RECOMMENDED_TIER);
  }, [plans, providerType]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    plans,
    isLoading,
    error,

    // Helpers
    getPlanById,
    getPlanByTier,
    getRecommendedPlan
  };
}

export default useSubscriptionPlans;
