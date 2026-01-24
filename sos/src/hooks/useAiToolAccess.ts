/**
 * useAiToolAccess Hook
 * Vérifie l'accès à l'outil IA et fournit une action pour y accéder directement
 *
 * Usage:
 * - hasAccess: true si l'utilisateur peut utiliser l'outil IA
 * - accessAiTool: fonction pour ouvrir directement l'outil IA (génère token SSO)
 * - redirectToSubscription: redirige vers la page des plans d'abonnement
 *
 * Logique d'accès:
 * - canMakeAiCall (abonnement actif, trial actif avec quota)
 * - OU forcedAIAccess (accès forcé par admin)
 */

import { useState, useCallback, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { functions, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useAiQuota } from './useAiQuota';
import { useLocaleNavigate } from '../multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '../multilingual-system/core/routing/localeRoutes';
import { useApp } from '../contexts/AppContext';

// ============================================================================
// TYPES
// ============================================================================

interface GenerateOutilTokenResponse {
  success: boolean;
  token: string;
  expiresIn: number;
}

interface UseAiToolAccessReturn {
  /** L'utilisateur a-t-il accès à l'outil IA? */
  hasAccess: boolean;
  /** Chargement en cours */
  isLoading: boolean;
  /** Accès en cours à l'outil (génération token) */
  isAccessing: boolean;
  /** Erreur éventuelle */
  error: string | null;
  /** L'utilisateur a-t-il un accès forcé (admin override)? */
  hasForcedAccess: boolean;
  /** Ouvre directement l'outil IA via SSO */
  accessAiTool: () => Promise<void>;
  /** Redirige vers la page d'abonnement */
  redirectToSubscription: () => void;
  /** Action intelligente: accès si autorisé, sinon redirection abonnement */
  handleAiToolClick: () => Promise<void>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OUTIL_BASE_URL = import.meta.env.VITE_OUTIL_BASE_URL || 'https://ia.sos-expat.com';

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useAiToolAccess(): UseAiToolAccessReturn {
  const { user } = useAuth();
  const { canMakeAiCall, loading: quotaLoading } = useAiQuota();
  const navigate = useLocaleNavigate();
  const { language } = useApp();

  // State
  const [hasForcedAccess, setHasForcedAccess] = useState(false);
  const [forcedAccessLoading, setForcedAccessLoading] = useState(true);
  const [isAccessing, setIsAccessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get translated subscription plans route
  const langCode = (language || 'fr') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const subscriptionPlansRoute = `/${getTranslatedRouteSlug('dashboard-subscription-plans' as RouteKey, langCode)}`;

  // Load forced access flag from sos_profiles
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      setHasForcedAccess(false);
      setForcedAccessLoading(false);
      return;
    }

    let isMounted = true;

    const loadForcedAccess = async () => {
      try {
        const profileDoc = await getDoc(doc(db, 'sos_profiles', uid));
        if (!isMounted) return;

        if (profileDoc.exists()) {
          const data = profileDoc.data();
          setHasForcedAccess(data?.forcedAIAccess === true);
        } else {
          setHasForcedAccess(false);
        }
      } catch (err) {
        console.warn('[useAiToolAccess] Error loading forced access:', err);
        setHasForcedAccess(false);
      } finally {
        if (isMounted) {
          setForcedAccessLoading(false);
        }
      }
    };

    loadForcedAccess();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Computed: has access = canMakeAiCall OR forcedAIAccess
  const hasAccess = canMakeAiCall || hasForcedAccess;
  const isLoading = quotaLoading || forcedAccessLoading;

  // Action: Open AI tool directly via SSO
  // P1 FIX: Open window synchronously to avoid popup blocker, then redirect
  const accessAiTool = useCallback(async () => {
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setIsAccessing(true);
    setError(null);

    // P1 FIX: Open window IMMEDIATELY (synchronously) to avoid popup blocker
    // The window is opened with a loading page, then redirected after token is generated
    const newWindow = window.open('about:blank', '_blank', 'noopener');

    if (!newWindow) {
      // Popup was blocked - fallback to redirect in same tab
      console.warn('[useAiToolAccess] Popup blocked, will redirect in same tab');
    }

    try {
      const generateToken = httpsCallable<{ asProviderId?: string }, GenerateOutilTokenResponse>(
        functions,
        'generateOutilToken'
      );

      const result = await generateToken({});

      if (result.data.success && result.data.token) {
        const ssoUrl = `${OUTIL_BASE_URL}/auth?token=${encodeURIComponent(result.data.token)}`;

        if (newWindow) {
          // Redirect the already-opened window to SSO URL
          newWindow.location.href = ssoUrl;
        } else {
          // Fallback: redirect current tab (popup was blocked)
          window.location.href = ssoUrl;
        }
      } else {
        // Close the blank window if token failed
        newWindow?.close();
        throw new Error('Token non reçu');
      }
    } catch (err) {
      // Close the blank window on error
      newWindow?.close();

      console.error('[useAiToolAccess] SSO Error:', err);
      const firebaseError = err as { code?: string; message?: string };

      if (firebaseError.code === 'functions/permission-denied') {
        setError(firebaseError.message || 'Accès refusé');
      } else if (firebaseError.code === 'functions/resource-exhausted') {
        setError('Quota épuisé');
      } else {
        setError('Erreur de connexion à l\'outil IA');
      }
    } finally {
      setIsAccessing(false);
    }
  }, [user?.uid]);

  // Action: Redirect to subscription plans
  const redirectToSubscription = useCallback(() => {
    navigate(subscriptionPlansRoute);
  }, [navigate, subscriptionPlansRoute]);

  // Smart action: access if allowed, otherwise redirect to subscription
  // NOTE: This action does NOT wait for loading - it acts immediately based on current state
  // If data is still loading, it defaults to opening the AI tool directly
  const handleAiToolClick = useCallback(async () => {
    // If we already know access is granted, open directly
    if (hasAccess) {
      await accessAiTool();
      return;
    }

    // If loading, optimistically try to open (token generation will validate on backend)
    if (isLoading) {
      console.log('[useAiToolAccess] Still loading, attempting optimistic access...');
      await accessAiTool();
      return;
    }

    // No access and not loading = definitely no access, redirect to subscription
    redirectToSubscription();
  }, [isLoading, hasAccess, accessAiTool, redirectToSubscription]);

  return {
    hasAccess,
    isLoading,
    isAccessing,
    error,
    hasForcedAccess,
    accessAiTool,
    redirectToSubscription,
    handleAiToolClick,
  };
}

export default useAiToolAccess;
