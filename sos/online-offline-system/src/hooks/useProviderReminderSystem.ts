import { useState, useEffect, useRef, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { PROVIDER_ACTIVITY_CONFIG, toMs } from '../config/providerActivityConfig';
import { playAvailabilityReminder } from '../notificationsonline/playAvailabilityReminder';
import type { ReminderState, ProviderActivityPreferences } from '../types/providerActivity';

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
  const [reminderState, setReminderState] = useState<ReminderState>({
    lastSoundPlayed: null,
    lastVoicePlayed: null,
    lastModalShown: null,
    reminderDisabledToday: false,
  });

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

    // Si inactif depuis plus de 15 minutes
    if (inactivityMinutes >= PROVIDER_ACTIVITY_CONFIG.INACTIVITY_WARNING_MINUTES) {
      const now = new Date();

      // Jouer le son si activé et pas joué récemment
      if (
        preferences.soundEnabled &&
        (!reminderState.lastSoundPlayed ||
          now.getTime() - reminderState.lastSoundPlayed.getTime() >= toMs(PROVIDER_ACTIVITY_CONFIG.SOUND_INTERVAL_MINUTES))
      ) {
        playAvailabilityReminder('sound', preferredLanguage);
        setReminderState(prev => ({ ...prev, lastSoundPlayed: now }));
      }

      // Jouer la voix si activé et pas joué récemment
      if (
        preferences.voiceEnabled &&
        (!reminderState.lastVoicePlayed ||
          now.getTime() - reminderState.lastVoicePlayed.getTime() >= toMs(PROVIDER_ACTIVITY_CONFIG.VOICE_INTERVAL_MINUTES))
      ) {
        playAvailabilityReminder('voice', preferredLanguage);
        setReminderState(prev => ({ ...prev, lastVoicePlayed: now }));
      }

      // Afficher le modal si activé et pas affiché récemment
      if (
        preferences.modalEnabled &&
        (!reminderState.lastModalShown ||
          now.getTime() - reminderState.lastModalShown.getTime() >= toMs(PROVIDER_ACTIVITY_CONFIG.REMINDER_MODAL_INTERVAL_MINUTES))
      ) {
        setShowModal(true);
        setReminderState(prev => ({ ...prev, lastModalShown: now }));
      }
    }
  }, [isOnline, isProvider, getInactivityMinutes, getPreferences, reminderState, preferredLanguage, checkReminderDisabledToday]);

  // Handler pour fermer le modal (rester en ligne)
  const handleClose = useCallback(() => {
    setShowModal(false);
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
  }, []);

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

  return {
    showModal,
    handleClose,
    handleGoOffline,
    handleDisableToday,
    inactivityMinutes: getInactivityMinutes(),
  };
};
