// Configuration centralisée pour le système d'activité des prestataires
export const PROVIDER_ACTIVITY_CONFIG = {
  // Délais d'inactivité (en minutes)
  INACTIVITY_WARNING_MINUTES: 60,        // ✅ FIX: 1 heure au lieu de 15 min
  INACTIVITY_AUTO_OFFLINE_MINUTES: 120,  // ✅ FIX: 2 heures au lieu de 60 min

  // Intervalles de rappels (en minutes) - après le premier avertissement
  REMINDER_MODAL_INTERVAL_MINUTES: 30,   // ✅ FIX: Rappel popup toutes les 30 min
  SOUND_INTERVAL_MINUTES: 15,            // ✅ FIX: Son toutes les 15 min
  VOICE_INTERVAL_MINUTES: 30,            // ✅ FIX: Voix toutes les 30 min
  
  // Intervalles de mise à jour (en minutes)
  ACTIVITY_UPDATE_INTERVAL_MINUTES: 3,
  
  // Debounce pour les événements (en millisecondes)
  EVENT_DEBOUNCE_MS: 2000,
  
  // Clés localStorage
  DISABLE_REMINDER_TODAY_KEY: 'disableReminderToday',
  LAST_REMINDER_DATE_KEY: 'lastReminderDate',
  
  // Préférences notifications
  SOUND_ENABLED_KEY: 'soundEnabled',
  VOICE_ENABLED_KEY: 'voiceEnabled',
  MODAL_ENABLED_KEY: 'modalEnabled',
} as const;

// Convertir minutes en millisecondes
export const toMs = (minutes: number) => minutes * 60 * 1000;
