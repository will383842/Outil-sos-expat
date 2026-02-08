import { useState, useEffect, useRef, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { PROVIDER_ACTIVITY_CONFIG, toMs } from '../config/providerActivityConfig';
import { playAvailabilityReminder } from '../notificationsonline/playAvailabilityReminder';
import type { ReminderState, ProviderActivityPreferences } from '../types/providerActivity';

// Type de rappel : 'first' = T+60 (informatif), 'second' = T+120 (avertissement)
export type ReminderType = 'first' | 'second';

interface UseProviderReminderSystemProps {
  userId: string;
  isOnline: boolean;
  isProvider: boolean;
  lastActivity: Date;
  preferredLanguage?: string;
}

export const useProviderReminderSystem = ({
  userId,
  isOnline,
  isProvider,
  lastActivity,
  preferredLanguage = 'en',
}: UseProviderReminderSystemProps) => {
  const [showModal, setShowModal] = useState(false);
  const [reminderType, setReminderType] = useState<ReminderType>('first');
  const [reminderState, setReminderState] = useState<ReminderState>({
    lastSoundPlayed: null,
    lastVoicePlayed: null,
    lastModalShown: null,
    reminderDisabledToday: false,
  });

  // Track si le premier rappel (T+60) a été montré
  const firstReminderShownRef = useRef(false);

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Charger les préférences depuis localStorage
  const getPreferences = useCallback((): ProviderActivityPreferences => {
    return {
      soundEnabled: localStorage.getItem(PROVIDER_ACTIVITY_CONFIG.SOUND_ENABLED_KEY) !== 'false',
      voiceEnabled: localStorage.getItem(PROVIDER_ACTIVITY_CONFIG.VOICE_ENABLED_KEY) !== 'false',
      modalEnabled: localStorage.getItem(PROVIDER_ACTIVITY_CONFIG.MODAL_ENABLED_KEY) !== 'false',
    };
  }, []);

  // Vérifier si les rappels sont désactivés aujourd'hui
  const checkReminderDisabledToday = useCallback((): boolean => {
    const disabledDate = localStorage.getItem(PROVIDER_ACTIVITY_CONFIG.LAST_REMINDER_DATE_KEY);
    if (!disabledDate) return false;

    const today = new Date().toDateString();
    return disabledDate === today;
  }, []);

  // Calculer le temps d'inactivité en minutes
  const getInactivityMinutes = useCallback((): number => {
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    return Math.floor(diffMs / 60000);
  }, [lastActivity]);

  // Use ref to track reminder state without causing re-renders in useCallback
  const reminderStateRef = useRef(reminderState);
  reminderStateRef.current = reminderState;

  // Vérifier si on doit afficher un rappel
  const checkAndTriggerReminder = useCallback(() => {
    const inactivityMinutes = getInactivityMinutes();

    if (!isOnline || !isProvider) {
      return;
    }
    if (checkReminderDisabledToday()) {
      return;
    }

    const preferences = getPreferences();
    const now = new Date();
    const currentState = reminderStateRef.current;

    // T+120 : Deuxième rappel avec avertissement (prioritaire)
    if (inactivityMinutes >= PROVIDER_ACTIVITY_CONFIG.SECOND_REMINDER_MINUTES) {
      // Jouer le son si activé et pas joué récemment
      if (
        preferences.soundEnabled &&
        (!currentState.lastSoundPlayed ||
          now.getTime() - currentState.lastSoundPlayed.getTime() >= toMs(PROVIDER_ACTIVITY_CONFIG.SOUND_INTERVAL_MINUTES))
      ) {
        playAvailabilityReminder('sound', {
          enableSound: preferences.soundEnabled,
          enableVoice: preferences.voiceEnabled,
          enableModal: preferences.modalEnabled,
        }, preferredLanguage);
        setReminderState(prev => ({ ...prev, lastSoundPlayed: now }));
      }

      // Jouer la voix si activé et pas joué récemment
      if (
        preferences.voiceEnabled &&
        (!currentState.lastVoicePlayed ||
          now.getTime() - currentState.lastVoicePlayed.getTime() >= toMs(PROVIDER_ACTIVITY_CONFIG.VOICE_INTERVAL_MINUTES))
      ) {
        playAvailabilityReminder('voice', {
          enableSound: preferences.soundEnabled,
          enableVoice: preferences.voiceEnabled,
          enableModal: preferences.modalEnabled,
        }, preferredLanguage);
        setReminderState(prev => ({ ...prev, lastVoicePlayed: now }));
      }

      // Afficher le modal si activé et pas affiché récemment
      if (
        preferences.modalEnabled &&
        (!currentState.lastModalShown ||
          now.getTime() - currentState.lastModalShown.getTime() >= toMs(PROVIDER_ACTIVITY_CONFIG.REMINDER_MODAL_INTERVAL_MINUTES))
      ) {
        setReminderType('second');
        setShowModal(true);
        setReminderState(prev => ({ ...prev, lastModalShown: now }));
      }
    }
    // T+60 : Premier rappel informatif
    else if (inactivityMinutes >= PROVIDER_ACTIVITY_CONFIG.FIRST_REMINDER_MINUTES && !firstReminderShownRef.current) {
      // Jouer le son pour le premier rappel
      if (preferences.soundEnabled) {
        playAvailabilityReminder('sound', {
          enableSound: preferences.soundEnabled,
          enableVoice: preferences.voiceEnabled,
          enableModal: preferences.modalEnabled,
        }, preferredLanguage);
        setReminderState(prev => ({ ...prev, lastSoundPlayed: now }));
      }

      // Afficher le modal informatif
      if (preferences.modalEnabled) {
        setReminderType('first');
        setShowModal(true);
        setReminderState(prev => ({ ...prev, lastModalShown: now }));
        firstReminderShownRef.current = true;
      }
    }
    // Note: reminderState removed from deps - using ref to read current state without causing recreation
  }, [isOnline, isProvider, getInactivityMinutes, getPreferences, preferredLanguage, checkReminderDisabledToday]);

  // Handler pour fermer le modal (rester en ligne)
  const handleClose = useCallback(() => {
    setShowModal(false);
    // Annuler le timeout de mise hors ligne automatique
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }
    setReminderState(prev => ({
      ...prev,
      lastSoundPlayed: new Date(),
      lastVoicePlayed: new Date(),
      lastModalShown: new Date(),
    }));
  }, []);

  // Handler pour passer hors ligne
  // ✅ BUG FIX: Attendre que l'action async termine AVANT de fermer le modal
  // + Ajouter feedback d'erreur à l'utilisateur
  const handleGoOffline = useCallback(async () => {
    // Annuler le timeout de mise hors ligne automatique EN PREMIER
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }

    try {
      const setProviderOffline = httpsCallable(functions, 'setProviderOffline');
      await setProviderOffline({ userId });
      // Fermer le modal APRÈS succès
      setShowModal(false);
    } catch (error) {
      console.error('[ReminderSystem] Error setting provider offline:', error);
      // ✅ BUG FIX: Afficher feedback d'erreur à l'utilisateur
      // On ferme quand même le modal mais on alerte l'utilisateur
      setShowModal(false);
      // Utiliser alert temporairement - idéalement utiliser un toast/snackbar
      setTimeout(() => {
        alert('Erreur lors de la mise hors ligne. Le système réessaiera automatiquement.');
      }, 100);
    }
  }, [userId]);

  // Handler pour désactiver les rappels aujourd'hui
  const handleDisableToday = useCallback(() => {
    const today = new Date().toDateString();
    localStorage.setItem(PROVIDER_ACTIVITY_CONFIG.LAST_REMINDER_DATE_KEY, today);
    setShowModal(false);
    // Annuler le timeout de mise hors ligne automatique
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }
  }, []);

  // Reset le flag du premier rappel quand l'activité reprend
  useEffect(() => {
    // Si l'inactivité repasse sous 30 min, on reset le flag du premier rappel
    const inactivityMinutes = getInactivityMinutes();
    if (inactivityMinutes < PROVIDER_ACTIVITY_CONFIG.FIRST_REMINDER_MINUTES) {
      firstReminderShownRef.current = false;
    }
  }, [lastActivity, getInactivityMinutes]);

  // Vérifier périodiquement l'inactivité
  useEffect(() => {
    if (!isOnline || !isProvider) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Vérifier immédiatement
    checkAndTriggerReminder();

    // Puis vérifier toutes les minutes
    checkIntervalRef.current = setInterval(checkAndTriggerReminder, 60000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isOnline, isProvider, checkAndTriggerReminder]);

  // Timeout automatique: mise hors ligne si pas de réponse au popup
  // Seulement pour le deuxième rappel (T+120) → mise hors ligne à T+130 (10 min après)
  useEffect(() => {
    if (showModal && isOnline && isProvider && reminderType === 'second') {
      // Démarrer le timeout de 10 minutes (T+70)
      const timeoutMs = toMs(PROVIDER_ACTIVITY_CONFIG.POPUP_AUTO_OFFLINE_TIMEOUT_MINUTES);

      popupTimeoutRef.current = setTimeout(async () => {
        try {
          const setProviderOffline = httpsCallable(functions, 'setProviderOffline');
          await setProviderOffline({ userId });
          // ✅ BUG FIX: Fermer le modal APRÈS succès
          setShowModal(false);
        } catch (error) {
          console.error('[ReminderSystem] Error auto-setting provider offline:', error);
          // En cas d'erreur, fermer quand même le modal (le backend schedulé prendra le relais)
          setShowModal(false);
        }
      }, timeoutMs);

      return () => {
        if (popupTimeoutRef.current) {
          clearTimeout(popupTimeoutRef.current);
          popupTimeoutRef.current = null;
        }
      };
    }
  }, [showModal, isOnline, isProvider, userId, reminderType]);

  return {
    showModal,
    reminderType,
    handleClose,
    handleGoOffline,
    handleDisableToday,
    inactivityMinutes: getInactivityMinutes(),
  };
};
