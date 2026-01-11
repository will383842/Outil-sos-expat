import { useEffect, useRef, useCallback, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { PROVIDER_ACTIVITY_CONFIG, toMs } from '../config/providerActivityConfig';
import type { ActivityEvent } from '../types/providerActivity';

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
  const lastActivityRef = useRef<Date>(new Date());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🔒 Gestion de l'état de visibilité de l'onglet
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const pauseInactivityCheck = useRef(false);

  // Fonction pour mettre à jour l'activité dans Firebase
  const updateActivityInFirebase = useCallback(async () => {
    if (!isOnline || !isProvider) return;

    try {
      const updateProviderActivity = httpsCallable(functions, 'updateProviderActivity');
      await updateProviderActivity({ userId });
      // ✅ P0 FIX: Remove verbose logging to reduce console spam
    } catch (error) {
      // Only log errors, not routine updates
      console.error('[ActivityTracker] Error updating activity:', error);
    }
  }, [userId, isOnline, isProvider]);

  // Gérer les événements d'activité avec debounce
  const handleActivity = useCallback((event: Event) => {
    if (!isOnline || !isProvider) return;

    const activityEvent: ActivityEvent = {
      type: event.type as ActivityEvent['type'],
      timestamp: new Date(),
    };

    lastActivityRef.current = activityEvent.timestamp;

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
        // L'onglet redevient visible → reset le timer d'inactivité
        pauseInactivityCheck.current = false;
        lastActivityRef.current = new Date();
        // ✅ P0 FIX: Remove verbose logging
      } else {
        // L'onglet passe en arrière-plan → pause le tracking d'inactivité
        pauseInactivityCheck.current = true;
        // ✅ P0 FIX: Remove verbose logging
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
    updateIntervalRef.current = setInterval(
      updateActivityInFirebase,
      toMs(PROVIDER_ACTIVITY_CONFIG.ACTIVITY_UPDATE_INTERVAL_MINUTES)
    );

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isOnline, isProvider, updateActivityInFirebase]);

  return {
    lastActivity: lastActivityRef.current,
    isTabVisible,
    isInactivityPaused: pauseInactivityCheck.current,
  };
};
