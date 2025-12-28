// Configuration centralisée pour le système d'activité des prestataires
export const PROVIDER_ACTIVITY_CONFIG = {
  // Délais d'inactivité (en minutes)
  INACTIVITY_WARNING_MINUTES: 15,
  INACTIVITY_AUTO_OFFLINE_MINUTES: 60,
  
  // Intervalles de rappels (en minutes)
  REMINDER_MODAL_INTERVAL_MINUTES: 15,
  SOUND_INTERVAL_MINUTES: 30,
  VOICE_INTERVAL_MINUTES: 60,
  
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
