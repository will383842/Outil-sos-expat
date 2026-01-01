/**
 * Configuration des seuils pour le monitoring des appels (AdminCalls)
 * Tous les seuils sont centralisés ici pour faciliter les ajustements
 */

export const CALLS_CONFIG = {
  // Seuils d'alerte
  alerts: {
    /** Délai en ms avant qu'un appel soit considéré comme bloqué (5 minutes) */
    stuckCallThreshold: 5 * 60 * 1000,
    /** Latence max en ms avant alerte qualité réseau (300ms) */
    maxLatency: 300,
    /** Nombre max d'appels simultanés avant alerte surcharge système */
    maxConcurrentCalls: 30,
  },

  // Paramètres de rafraîchissement
  refresh: {
    /** Intervalle de rafraîchissement santé système en ms (30 secondes) */
    systemHealthInterval: 30000,
  },

  // Paramètres de requête Firestore
  firestore: {
    /** Limite de sessions d'appel à charger */
    liveCallsLimit: 50,
    /** Nombre max d'alertes à conserver */
    maxAlerts: 10,
  },

  // Seuils de qualité audio
  audioQuality: {
    poor: 1,
    fair: 2,
    good: 3,
    excellent: 4,
  },
} as const;

export type CallsConfig = typeof CALLS_CONFIG;
