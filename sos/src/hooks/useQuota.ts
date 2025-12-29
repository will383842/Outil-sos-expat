/**
 * useQuota Hook
 * Gestion des quotas d'utilisation IA avec pattern SWR-like
 *
 * @description Hook React pour gérer les quotas d'appels IA, avec:
 * - Écoute temps réel Firestore de l'utilisation
 * - Calcul automatique des limites et pourcentages
 * - Vérification d'accès et incrémentation d'usage
 * - Nettoyage des listeners sur unmount
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/useAuth';
import {
  AiUsage,
  QuotaCheckResult,
  DEFAULT_AI_CALLS_LIMIT
} from '../types/subscription';
import {
  getAiUsage,
  subscribeToAiUsage,
  checkAiQuota,
  recordAiCall,
  getSubscription
} from '../services/subscription/subscriptionService';

// ============================================================================
// TYPES
// ============================================================================

interface UseQuotaReturn {
  // État
  currentUsage: number;
  limit: number; // -1 = illimité
  remaining: number; // -1 = illimité
  percentUsed: number;
  isLoading: boolean;

  // Dérivés
  isUnlimited: boolean;
  isExhausted: boolean;
  isNearLimit: boolean; // >= 80%

  // Actions
  checkAccess: () => Promise<QuotaCheckResult>;
  incrementUsage: () => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NEAR_LIMIT_THRESHOLD = 0.8; // 80%
const UNLIMITED_VALUE = -1;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calcule le pourcentage d'utilisation
 */
function calculatePercentUsed(currentUsage: number, limit: number): number {
  // Si illimité, retourner 0%
  if (limit === UNLIMITED_VALUE) return 0;

  // Si limite est 0, retourner 100% si usage > 0
  if (limit === 0) return currentUsage > 0 ? 100 : 0;

  // Calcul normal avec cap à 100%
  const percent = (currentUsage / limit) * 100;
  return Math.min(100, Math.round(percent * 100) / 100); // Arrondi à 2 décimales
}

/**
 * Calcule le nombre restant
 */
function calculateRemaining(currentUsage: number, limit: number): number {
  // Si illimité, retourner -1
  if (limit === UNLIMITED_VALUE) return UNLIMITED_VALUE;

  // Calcul normal avec minimum 0
  return Math.max(0, limit - currentUsage);
}

/**
 * Vérifie si l'utilisation est épuisée
 */
function checkIsExhausted(currentUsage: number, limit: number): boolean {
  // Si illimité, jamais épuisé
  if (limit === UNLIMITED_VALUE) return false;

  return currentUsage >= limit;
}

/**
 * Vérifie si proche de la limite (>= 80%)
 */
function checkIsNearLimit(currentUsage: number, limit: number): boolean {
  // Si illimité, jamais proche de la limite
  if (limit === UNLIMITED_VALUE) return false;

  // Si limite est 0, considéré comme proche
  if (limit === 0) return true;

  return (currentUsage / limit) >= NEAR_LIMIT_THRESHOLD;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useQuota(): UseQuotaReturn {
  const { user } = useAuth();

  // State
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [quotaResult, setQuotaResult] = useState<QuotaCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs pour éviter les race conditions
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Subscribe to real-time usage updates
  useEffect(() => {
    if (!user?.uid) {
      setUsage(null);
      setQuotaResult(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const uid = user.uid;
    const unsubscribe = subscribeToAiUsage(uid, async (aiUsage) => {
      if (!isMounted.current) return;

      setUsage(aiUsage);

      // Refresh quota check when usage changes
      try {
        const result = await checkAiQuota(uid);
        if (isMounted.current) {
          setQuotaResult(result);
        }
      } catch (err) {
        console.error('[useQuota] Failed to check quota:', err);
      }

      setIsLoading(false);
    });

    // Initial quota check
    checkAiQuota(uid)
      .then((result) => {
        if (isMounted.current) {
          setQuotaResult(result);
        }
      })
      .catch((err) => {
        console.error('[useQuota] Initial quota check failed:', err);
      });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  // ============================================================================
  // COMPUTED VALUES (MEMOIZED)
  // ============================================================================

  const currentUsage = useMemo(() => {
    return quotaResult?.currentUsage ?? 0;
  }, [quotaResult]);

  const limit = useMemo(() => {
    return quotaResult?.limit ?? 0;
  }, [quotaResult]);

  const remaining = useMemo(() => {
    return calculateRemaining(currentUsage, limit);
  }, [currentUsage, limit]);

  const percentUsed = useMemo(() => {
    return calculatePercentUsed(currentUsage, limit);
  }, [currentUsage, limit]);

  const isUnlimited = useMemo(() => {
    return limit === UNLIMITED_VALUE;
  }, [limit]);

  const isExhausted = useMemo(() => {
    // Également vérifier la raison du quota check
    if (quotaResult?.reason === 'quota_exhausted' ||
        quotaResult?.reason === 'trial_calls_exhausted') {
      return true;
    }
    return checkIsExhausted(currentUsage, limit);
  }, [quotaResult, currentUsage, limit]);

  const isNearLimit = useMemo(() => {
    return checkIsNearLimit(currentUsage, limit);
  }, [currentUsage, limit]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Vérifie si l'utilisateur a accès aux appels IA
   * Retourne un résultat détaillé avec la raison si bloqué
   */
  const checkAccess = useCallback(async (): Promise<QuotaCheckResult> => {
    if (!user?.uid) {
      return {
        allowed: false,
        reason: 'no_subscription',
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        isInTrial: false
      };
    }

    try {
      const result = await checkAiQuota(user.uid);

      if (isMounted.current) {
        setQuotaResult(result);
      }

      return result;
    } catch (err) {
      console.error('[useQuota] checkAccess failed:', err);

      // Retourner un résultat de blocage en cas d'erreur
      return {
        allowed: false,
        reason: 'no_subscription',
        currentUsage: currentUsage,
        limit: limit,
        remaining: remaining,
        isInTrial: false
      };
    }
  }, [user?.uid, currentUsage, limit, remaining]);

  /**
   * Incrémente l'utilisation après un appel IA réussi
   * Note: Cette méthode est généralement appelée côté serveur (Cloud Functions)
   * mais peut être utilisée côté client pour certains cas d'usage
   */
  const incrementUsage = useCallback(async (): Promise<void> => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    // Vérifier d'abord si l'utilisateur a le droit
    const accessCheck = await checkAccess();
    if (!accessCheck.allowed) {
      throw new Error(`Access denied: ${accessCheck.reason}`);
    }

    try {
      // Récupérer l'abonnement pour le contexte
      const subscription = await getSubscription(user.uid);

      // Enregistrer l'appel
      await recordAiCall(user.uid, {
        providerId: user.uid,
        subscriptionId: subscription?.id || user.uid,
        callType: 'chat',
        provider: 'claude',
        model: 'claude-3-sonnet',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        success: true,
        durationMs: 0
      });

      // Le listener Firestore mettra à jour l'usage automatiquement
    } catch (err) {
      console.error('[useQuota] incrementUsage failed:', err);
      throw err;
    }
  }, [user?.uid, checkAccess]);

  /**
   * Rafraîchit manuellement les données de quota
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!user?.uid) return;

    setIsLoading(true);

    try {
      const [aiUsage, quotaCheck] = await Promise.all([
        getAiUsage(user.uid),
        checkAiQuota(user.uid)
      ]);

      if (isMounted.current) {
        setUsage(aiUsage);
        setQuotaResult(quotaCheck);
      }
    } catch (err) {
      console.error('[useQuota] refresh failed:', err);
      throw err;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [user?.uid]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // État
    currentUsage,
    limit,
    remaining,
    percentUsed,
    isLoading,

    // Dérivés
    isUnlimited,
    isExhausted,
    isNearLimit,

    // Actions
    checkAccess,
    incrementUsage,

    // Refresh
    refresh
  };
}

export default useQuota;
