// Configuration centralisée pour le système d'activité des prestataires
export const PROVIDER_ACTIVITY_CONFIG = {
  // Délais d'inactivité (en minutes)
  FIRST_REMINDER_MINUTES: 30,            // T+30: Premier rappel informatif
  SECOND_REMINDER_MINUTES: 60,           // T+60: Deuxième rappel avec avertissement
  INACTIVITY_AUTO_OFFLINE_MINUTES: 90,   // T+90: Mise hors ligne forcée par le backend (fallback, toutes les 15min)

  // Timeout du popup avant mise hors ligne automatique (en minutes)
  POPUP_AUTO_OFFLINE_TIMEOUT_MINUTES: 10, // T+70: 10 min après le popup T+60

  // Intervalles de rappels (en minutes) - si le prestataire ferme le popup sans action
  REMINDER_MODAL_INTERVAL_MINUTES: 30,   // Rappel popup toutes les 30 min
  SOUND_INTERVAL_MINUTES: 15,            // Son toutes les 15 min
  VOICE_INTERVAL_MINUTES: 30,            // Voix toutes les 30 min

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
