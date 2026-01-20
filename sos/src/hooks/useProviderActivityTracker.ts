import { useEffect, useRef, useCallback, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { PROVIDER_ACTIVITY_CONFIG, toMs } from '../config/providerActivityConfig';
import type { ActivityEvent } from '../types/providerActivity';

// Clé localStorage pour persister lastActivity
const LAST_ACTIVITY_KEY = 'provider_last_activity';

// ✅ BUG FIX: Configuration pour retry logic avec exponential backoff
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000; // 1 seconde initial

// Helper pour retry avec exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = BASE_RETRY_DELAY_MS
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Ne pas retry si c'est une erreur d'authentification ou de permission
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (
          message.includes('unauthenticated') ||
          message.includes('permission') ||
          message.includes('not-found')
        ) {
          throw error;
        }
      }

      // Si c'est le dernier essai, throw l'erreur
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculer le délai avec exponential backoff (1s, 2s, 4s)
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[ActivityTracker] ⚠️ Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// Charger lastActivity depuis localStorage (survit aux navigations/refresh)
const loadLastActivity = (): Date => {
  try {
    const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (stored) {
      const date = new Date(parseInt(stored, 10));
      // Vérifier que la date est valide et pas trop vieille (max 24h)
      if (!isNaN(date.getTime()) && Date.now() - date.getTime() < 24 * 60 * 60 * 1000) {
        console.log('[ActivityTracker] ✅ Loaded lastActivity from localStorage:', date.toISOString());
        return date;
      }
    }
  } catch (e) {
    console.error('[ActivityTracker] Error loading lastActivity:', e);
  }
  console.log('[ActivityTracker] 🆕 No stored lastActivity, using current time');
  return new Date();
};

// Sauvegarder lastActivity dans localStorage
const saveLastActivity = (date: Date) => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, date.getTime().toString());
  } catch (e) {
    console.error('[ActivityTracker] Error saving lastActivity:', e);
  }
};

interface UseProviderActivityTrackerProps {
  userId: string;
  isOnline: boolean;
  isProvider: boolean;
}

export const useProviderActivityTracker = ({
  userId,
  isOnline,
  isProvider,
}: UseProviderActivityTrackerProps) => {
  // ✅ CRITICAL FIX: Load lastActivity from localStorage to survive page navigation
  const [lastActivity, setLastActivity] = useState<Date>(() => loadLastActivity());
  const lastActivityRef = useRef<Date>(lastActivity); // Keep ref for debounce callback
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🔒 Gestion de l'état de visibilité de l'onglet
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const pauseInactivityCheck = useRef(false);

  // Fonction pour mettre à jour l'activité dans Firebase
  // ✅ BUG FIX: Ajout de retry logic avec exponential backoff pour plus de fiabilité
  const updateActivityInFirebase = useCallback(async () => {
    if (!isOnline || !isProvider) return;

    try {
      await retryWithBackoff(async () => {
        const updateProviderActivity = httpsCallable(functions, 'updateProviderActivity');
        await updateProviderActivity({ userId });
      });
      // ✅ P0 FIX: Remove verbose logging to reduce console spam
    } catch (error) {
      // Only log errors after all retries have failed
      console.error('[ActivityTracker] ❌ Error updating activity (all retries failed):', error);
    }
  }, [userId, isOnline, isProvider]);

  // Gérer les événements d'activité avec debounce
  const handleActivity = useCallback((event: Event) => {
    if (!isOnline || !isProvider) return;

    const activityEvent: ActivityEvent = {
      type: event.type as ActivityEvent['type'],
      timestamp: new Date(),
    };

    // ✅ CRITICAL FIX: Update both ref (for callbacks) AND state (for re-renders)
    lastActivityRef.current = activityEvent.timestamp;
    setLastActivity(activityEvent.timestamp);

    // ✅ CRITICAL FIX: Persist to localStorage to survive page navigation
    saveLastActivity(activityEvent.timestamp);

    // Debounce pour éviter trop de mises à jour
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // ✅ P0 FIX: Debounce avec mise à jour Firebase après le délai
    debounceTimerRef.current = setTimeout(() => {
      // Mettre à jour Firebase après le debounce (évite les appels trop fréquents)
      if (!pauseInactivityCheck.current) {
        updateActivityInFirebase();
      }
    }, PROVIDER_ACTIVITY_CONFIG.EVENT_DEBOUNCE_MS);
  }, [isOnline, isProvider, updateActivityInFirebase]);

  // 🔒 Gestion de la visibilité de l'onglet (tab en arrière-plan)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsTabVisible(isVisible);

      if (isVisible) {
        // L'onglet redevient visible → reprendre le tracking d'inactivité
        pauseInactivityCheck.current = false;
        // ✅ CRITICAL FIX: Do NOT reset lastActivity here!
        // The inactivity timer should CONTINUE even when tab is hidden.
        // lastActivity will only be reset when user actually interacts (click, scroll, etc.)
        // This ensures a provider who is AFK for 40min will still trigger the reminder modal.
      } else {
        // L'onglet passe en arrière-plan → pause le tracking d'inactivité
        pauseInactivityCheck.current = true;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Setup des listeners d'événements
  useEffect(() => {
    if (!isOnline || !isProvider) return;

    const events = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isOnline, isProvider, handleActivity]);

  // Mise à jour périodique dans Firebase
  useEffect(() => {
    if (!isOnline || !isProvider) {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      return;
    }

    // Première mise à jour immédiate
    updateActivityInFirebase();

    // Puis mise à jour toutes les X minutes
    // ✅ BUG FIX: Vérifier pauseInactivityCheck pour ne PAS mettre à jour
    // l'activité quand l'onglet est en arrière-plan. Sinon, un prestataire
    // qui minimise son navigateur continuerait à être marqué "actif" et
    // ne serait JAMAIS mis hors ligne automatiquement.
    updateIntervalRef.current = setInterval(
      () => {
        if (!pauseInactivityCheck.current) {
          updateActivityInFirebase();
        }
      },
      toMs(PROVIDER_ACTIVITY_CONFIG.ACTIVITY_UPDATE_INTERVAL_MINUTES)
    );

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isOnline, isProvider, updateActivityInFirebase]);

  return {
    // ✅ CRITICAL FIX: Return state (reactive) instead of ref (non-reactive)
    lastActivity,
    isTabVisible,
    isInactivityPaused: pauseInactivityCheck.current,
  };
};
