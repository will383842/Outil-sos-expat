import { useState, useEffect, useRef, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { PROVIDER_ACTIVITY_CONFIG, toMs } from '../config/providerActivityConfig';
import { playAvailabilityReminder } from '../notificationsonline/playAvailabilityReminder';
import type { ReminderState, ProviderActivityPreferences } from '../types/providerActivity';

// Type de rappel : 'first' = T+30 (informatif), 'second' = T+60 (avertissement)
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

  // Track si le premier rappel (T+30) a été montré
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

  // Vérifier si on doit afficher un rappel
  const checkAndTriggerReminder = useCallback(() => {
    if (!isOnline || !isProvider) return;
    if (checkReminderDisabledToday()) return;

    const inactivityMinutes = getInactivityMinutes();
    const preferences = getPreferences();
    const now = new Date();

    // T+60 : Deuxième rappel avec avertissement (prioritaire)
    if (inactivityMinutes >= PROVIDER_ACTIVITY_CONFIG.SECOND_REMINDER_MINUTES) {
      // Jouer le son si activé et pas joué récemment
      if (
        preferences.soundEnabled &&
        (!reminderState.lastSoundPlayed ||
          now.getTime() - reminderState.lastSoundPlayed.getTime() >= toMs(PROVIDER_ACTIVITY_CONFIG.SOUND_INTERVAL_MINUTES))
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
        (!reminderState.lastVoicePlayed ||
          now.getTime() - reminderState.lastVoicePlayed.getTime() >= toMs(PROVIDER_ACTIVITY_CONFIG.VOICE_INTERVAL_MINUTES))
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
        (!reminderState.lastModalShown ||
          now.getTime() - reminderState.lastModalShown.getTime() >= toMs(PROVIDER_ACTIVITY_CONFIG.REMINDER_MODAL_INTERVAL_MINUTES))
      ) {
        setReminderType('second');
        setShowModal(true);
        setReminderState(prev => ({ ...prev, lastModalShown: now }));
      }
    }
    // T+30 : Premier rappel informatif
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
  }, [isOnline, isProvider, getInactivityMinutes, getPreferences, reminderState, preferredLanguage, checkReminderDisabledToday]);

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
  const handleGoOffline = useCallback(async () => {
    setShowModal(false);
    // Annuler le timeout de mise hors ligne automatique
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }
    try {
      const setProviderOffline = httpsCallable(functions, 'setProviderOffline');
      await setProviderOffline({ userId });
    } catch (error) {
      console.error('Error setting provider offline:', error);
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
  // Seulement pour le deuxième rappel (T+60) → mise hors ligne à T+70 (10 min après)
  useEffect(() => {
    if (showModal && isOnline && isProvider && reminderType === 'second') {
      // Démarrer le timeout de 10 minutes (T+70)
      const timeoutMs = toMs(PROVIDER_ACTIVITY_CONFIG.POPUP_AUTO_OFFLINE_TIMEOUT_MINUTES);
      popupTimeoutRef.current = setTimeout(async () => {
        console.warn(`Popup timeout: mise hors ligne automatique après ${PROVIDER_ACTIVITY_CONFIG.POPUP_AUTO_OFFLINE_TIMEOUT_MINUTES} minutes sans réponse`);
        setShowModal(false);
        try {
          const setProviderOffline = httpsCallable(functions, 'setProviderOffline');
          await setProviderOffline({ userId });
        } catch (error) {
          console.error('Error auto-setting provider offline:', error);
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
