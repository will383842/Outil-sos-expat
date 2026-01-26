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
    // NOTE: We don't use 'noopener' because we need to write content to the new window
    // and redirect it after token generation. Security is maintained because we only
    // redirect to our own domain (OUTIL_BASE_URL).
    const newWindow = window.open('about:blank', '_blank');

    // Track if window is usable (not blocked and we can write to it)
    let windowUsable = false;

    if (!newWindow) {
      // Popup was blocked - fallback to redirect in same tab
      console.warn('[useAiToolAccess] Popup blocked, will redirect in same tab');
    } else {
      // P2 FIX: Write a loading page instead of blank to improve UX
      // Check if we can actually write to the window (some browsers may block this)
      try {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Connexion à l'Outil IA...</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                }
                .spinner {
                  width: 50px;
                  height: 50px;
                  border: 4px solid rgba(255,255,255,0.3);
                  border-top-color: white;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                }
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
                h2 { margin-top: 20px; font-weight: 500; }
                p { opacity: 0.8; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <h2>Connexion en cours...</h2>
              <p>Vous allez être redirigé vers l'Outil IA SOS Expat</p>
            </body>
          </html>
        `);
        newWindow.document.close();
        windowUsable = true;
      } catch (writeError) {
        console.warn('[useAiToolAccess] Cannot write to popup window:', writeError);
        // Close the unusable window, will fall back to current tab redirect
        try { newWindow.close(); } catch { /* ignore */ }
      }
    }

    try {
      const generateToken = httpsCallable<{ asProviderId?: string }, GenerateOutilTokenResponse>(
        functions,
        'generateOutilToken'
      );

      const result = await generateToken({});

      if (result.data.success && result.data.token) {
        const ssoUrl = `${OUTIL_BASE_URL}/auth?token=${encodeURIComponent(result.data.token)}`;

        if (newWindow && windowUsable && !newWindow.closed) {
          // Redirect the already-opened window to SSO URL
          try {
            newWindow.location.href = ssoUrl;
          } catch (redirectError) {
            console.warn('[useAiToolAccess] Cannot redirect popup, falling back:', redirectError);
            try { newWindow.close(); } catch { /* ignore */ }
            // Fallback: open in new tab using a link click
            const link = document.createElement('a');
            link.href = ssoUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } else {
          // Fallback: open in new tab using a link click (more reliable than location.href)
          // This preserves the current tab and opens in a new one
          const link = document.createElement('a');
          link.href = ssoUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        // Close the blank window if token failed
        if (newWindow && !newWindow.closed) {
          try { newWindow.close(); } catch { /* ignore */ }
        }
        throw new Error('Token non reçu');
      }
    } catch (err) {
      console.error('[useAiToolAccess] SSO Error:', err);
      const firebaseError = err as { code?: string; message?: string };

      let errorMessage = 'Erreur de connexion à l\'outil IA';

      if (firebaseError.code === 'functions/permission-denied') {
        errorMessage = firebaseError.message || 'Accès refusé. Veuillez vérifier votre abonnement.';
      } else if (firebaseError.code === 'functions/resource-exhausted') {
        errorMessage = 'Quota IA épuisé. Veuillez mettre à niveau votre abonnement.';
      } else if (firebaseError.code === 'functions/unauthenticated') {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      } else if (firebaseError.code === 'functions/internal') {
        errorMessage = 'Erreur serveur. Veuillez réessayer dans quelques instants.';
      }

      setError(errorMessage);

      // P2 FIX: Show error in popup window instead of just closing it
      if (newWindow && windowUsable && !newWindow.closed) {
        try {
          // Clear existing content and write error page
          newWindow.document.open();
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Erreur - Outil IA</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    color: white;
                    text-align: center;
                    padding: 20px;
                  }
                  .icon { font-size: 48px; margin-bottom: 20px; }
                  h2 { margin: 10px 0; font-weight: 500; }
                  p { opacity: 0.9; font-size: 14px; max-width: 400px; }
                  button {
                    margin-top: 20px;
                    padding: 12px 24px;
                    background: white;
                    color: #f5576c;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                    font-weight: 600;
                  }
                  button:hover { opacity: 0.9; }
                </style>
              </head>
              <body>
                <div class="icon">⚠️</div>
                <h2>Impossible d'accéder à l'Outil IA</h2>
                <p>${errorMessage}</p>
                <button onclick="window.close()">Fermer</button>
              </body>
            </html>
          `);
          newWindow.document.close();
        } catch {
          // If writing fails, just close the window
          try { newWindow.close(); } catch { /* ignore */ }
        }
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
