// src/hooks/useAutoSuspendRealtime.ts
// Hook pour suspendre automatiquement les listeners Firestore après inactivité
// Économie estimée: ~90% des lectures quand l'onglet est ouvert mais inactif
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutoSuspendRealtimeOptions {
  /** Délai d'inactivité avant suspension (ms). Défaut: 5 minutes */
  inactivityDelay?: number;
  /** Activer/désactiver la fonctionnalité. Défaut: true */
  enabled?: boolean;
  /** Callback appelé quand le temps réel est suspendu */
  onSuspend?: () => void;
  /** Callback appelé quand le temps réel reprend */
  onResume?: () => void;
}

interface UseAutoSuspendRealtimeReturn {
  /** true si le temps réel est actif, false si suspendu */
  isRealtimeActive: boolean;
  /** true si suspendu pour cause d'inactivité */
  isSuspendedDueToInactivity: boolean;
  /** Forcer la reprise du temps réel */
  resumeRealtime: () => void;
  /** Forcer la suspension du temps réel */
  suspendRealtime: () => void;
  /** Temps restant avant suspension (en secondes) */
  timeUntilSuspend: number;
}

const DEFAULT_INACTIVITY_DELAY = 5 * 60 * 1000; // 5 minutes

/**
 * Hook pour suspendre automatiquement les listeners Firestore après inactivité.
 *
 * Usage:
 * ```tsx
 * const { isRealtimeActive, isSuspendedDueToInactivity, resumeRealtime } = useAutoSuspendRealtime();
 *
 * useEffect(() => {
 *   if (!isRealtimeActive) return; // Ne pas créer de listener si suspendu
 *
 *   const unsubscribe = onSnapshot(query, callback);
 *   return () => unsubscribe();
 * }, [isRealtimeActive]);
 * ```
 */
export function useAutoSuspendRealtime(
  options: UseAutoSuspendRealtimeOptions = {}
): UseAutoSuspendRealtimeReturn {
  const {
    inactivityDelay = DEFAULT_INACTIVITY_DELAY,
    enabled = true,
    onSuspend,
    onResume,
  } = options;

  const [isRealtimeActive, setIsRealtimeActive] = useState(true);
  const [isSuspendedDueToInactivity, setIsSuspendedDueToInactivity] = useState(false);
  const [timeUntilSuspend, setTimeUntilSuspend] = useState(inactivityDelay / 1000);

  const lastActivityRef = useRef(Date.now());
  const suspendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Réinitialiser le timer d'inactivité
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setTimeUntilSuspend(inactivityDelay / 1000);

    // Si suspendu pour inactivité, reprendre automatiquement
    if (isSuspendedDueToInactivity) {
      setIsRealtimeActive(true);
      setIsSuspendedDueToInactivity(false);
      onResume?.();
      console.log('🟢 [AutoSuspend] Temps réel repris (activité détectée)');
    }

    // Réinitialiser le timeout de suspension
    if (suspendTimeoutRef.current) {
      clearTimeout(suspendTimeoutRef.current);
    }

    if (enabled) {
      suspendTimeoutRef.current = setTimeout(() => {
        setIsRealtimeActive(false);
        setIsSuspendedDueToInactivity(true);
        onSuspend?.();
        console.log('🔴 [AutoSuspend] Temps réel suspendu (inactivité)');
      }, inactivityDelay);
    }
  }, [enabled, inactivityDelay, isSuspendedDueToInactivity, onResume, onSuspend]);

  // Forcer la reprise
  const resumeRealtime = useCallback(() => {
    setIsRealtimeActive(true);
    setIsSuspendedDueToInactivity(false);
    resetInactivityTimer();
    onResume?.();
    console.log('🟢 [AutoSuspend] Temps réel repris (manuel)');
  }, [resetInactivityTimer, onResume]);

  // Forcer la suspension
  const suspendRealtime = useCallback(() => {
    setIsRealtimeActive(false);
    setIsSuspendedDueToInactivity(false); // Pas dû à l'inactivité, manuel
    if (suspendTimeoutRef.current) {
      clearTimeout(suspendTimeoutRef.current);
    }
    onSuspend?.();
    console.log('🔴 [AutoSuspend] Temps réel suspendu (manuel)');
  }, [onSuspend]);

  // Écouter les événements d'activité
  useEffect(() => {
    if (!enabled) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    // Throttle pour éviter trop d'appels
    let lastCall = 0;
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastCall > 1000) { // Max 1 fois par seconde
        lastCall = now;
        resetInactivityTimer();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, throttledReset, { passive: true });
    });

    // Écouter aussi la visibilité de la page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page redevient visible, reprendre si suspendu
        if (isSuspendedDueToInactivity) {
          resumeRealtime();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialiser le timer
    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledReset);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (suspendTimeoutRef.current) {
        clearTimeout(suspendTimeoutRef.current);
      }
    };
  }, [enabled, resetInactivityTimer, isSuspendedDueToInactivity, resumeRealtime]);

  // Countdown timer
  useEffect(() => {
    if (!enabled || !isRealtimeActive) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, Math.ceil((inactivityDelay - elapsed) / 1000));
      setTimeUntilSuspend(remaining);
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [enabled, isRealtimeActive, inactivityDelay]);

  return {
    isRealtimeActive,
    isSuspendedDueToInactivity,
    resumeRealtime,
    suspendRealtime,
    timeUntilSuspend,
  };
}

export default useAutoSuspendRealtime;
