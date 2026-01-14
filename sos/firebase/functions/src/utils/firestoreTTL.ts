/**
 * Firestore TTL Configuration
 *
 * Configure les délais de rétention (TTL) pour les différentes collections.
 * Firestore supprime automatiquement les documents quand le champ `expireAt`
 * dépasse la date courante.
 *
 * IMPORTANT: Pour activer le TTL automatique, configurez la TTL policy dans
 * la console Firebase ou via firebase.json:
 *
 * Dans firestore.indexes.json, ajoutez:
 * {
 *   "fieldOverrides": [
 *     {
 *       "collectionGroup": "error_logs",
 *       "fieldPath": "expireAt",
 *       "ttl": true
 *     },
 *     ...
 *   ]
 * }
 */

import * as admin from 'firebase-admin';

// Configuration des TTL par collection (en jours)
export const TTL_CONFIG = {
  // Logs d'erreurs - supprimés après 30 jours
  error_logs: {
    ttlDays: 30,
    field: 'expireAt'
  },

  // Tasks des agents terminées - supprimées après 7 jours
  agent_tasks: {
    ttlDays: 7,
    field: 'expireAt',
    // Seulement pour les tasks terminées (COMPLETED, FAILED, CANCELLED)
    onlyTerminalStatus: true
  },

  // Logs système - supprimés après 14 jours
  system_logs: {
    ttlDays: 14,
    field: 'expireAt'
  },

  // Logs de cleanup - supprimés après 7 jours
  agent_cleanup_logs: {
    ttlDays: 7,
    field: 'expireAt'
  },

  // Notifications lues - supprimées après 30 jours
  notifications: {
    ttlDays: 30,
    field: 'expireAt',
    // Seulement pour les notifications lues
    onlyRead: true
  },

  // Sessions expirées - supprimées après 7 jours
  user_sessions: {
    ttlDays: 7,
    field: 'expireAt'
  },

  // Rate limit records - supprimés après 24 heures
  rate_limits: {
    ttlDays: 1,
    field: 'expireAt'
  },

  // Cache temporaire - supprimé après 1 jour
  cache: {
    ttlDays: 1,
    field: 'expireAt'
  },

  // Connection logs - logins, logouts, API access, admin actions
  // Supprimés après 90 jours (conformité RGPD)
  connection_logs: {
    ttlDays: 90,
    field: 'expireAt'
  },

  // Ultra debug logs - supprimés après 7 jours
  // ÉCONOMIE: ~20€/mois sur le stockage Firestore
  ultra_debug_logs: {
    ttlDays: 7,
    field: 'expireAt'
  },

  // Production logs - supprimés après 7 jours
  production_logs: {
    ttlDays: 7,
    field: 'expireAt'
  },

  // Notification logs - supprimés après 14 jours
  notification_logs: {
    ttlDays: 14,
    field: 'expireAt'
  }
} as const;

export type TTLCollection = keyof typeof TTL_CONFIG;

/**
 * Calcule la date d'expiration basée sur la configuration TTL
 *
 * @param collection - Nom de la collection
 * @param baseDate - Date de référence (défaut: maintenant)
 * @returns Timestamp Firestore pour expiration
 */
export function calculateExpireAt(
  collection: TTLCollection,
  baseDate: Date = new Date()
): admin.firestore.Timestamp {
  const config = TTL_CONFIG[collection];
  const expireDate = new Date(baseDate.getTime() + config.ttlDays * 24 * 60 * 60 * 1000);
  return admin.firestore.Timestamp.fromDate(expireDate);
}

/**
 * Ajoute le champ expireAt à des données de document
 *
 * @param collection - Nom de la collection
 * @param data - Données du document
 * @returns Données avec expireAt ajouté
 */
export function withTTL<T extends Record<string, unknown>>(
  collection: TTLCollection,
  data: T
): T & { expireAt: admin.firestore.Timestamp } {
  return {
    ...data,
    expireAt: calculateExpireAt(collection)
  };
}

/**
 * Crée les données TTL à merger avec un document existant
 *
 * @param collection - Nom de la collection
 * @returns Objet avec seulement le champ expireAt
 */
export function getTTLData(collection: TTLCollection): { expireAt: admin.firestore.Timestamp } {
  return {
    expireAt: calculateExpireAt(collection)
  };
}

/**
 * Met à jour l'expiration d'un document (étend le TTL)
 *
 * @param docRef - Référence du document
 * @param collection - Nom de la collection
 */
export async function extendTTL(
  docRef: admin.firestore.DocumentReference,
  collection: TTLCollection
): Promise<void> {
  await docRef.update({
    expireAt: calculateExpireAt(collection)
  });
}

/**
 * Configuration pour firestore.indexes.json
 * À copier dans le fichier de configuration Firebase
 */
export const FIRESTORE_TTL_INDEXES = {
  fieldOverrides: [
    {
      collectionGroup: 'error_logs',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    },
    {
      collectionGroup: 'agent_tasks',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    },
    {
      collectionGroup: 'system_logs',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    },
    {
      collectionGroup: 'agent_cleanup_logs',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    },
    {
      collectionGroup: 'notifications',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    },
    {
      collectionGroup: 'user_sessions',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    },
    {
      collectionGroup: 'rate_limits',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    },
    {
      collectionGroup: 'cache',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    },
    {
      collectionGroup: 'connection_logs',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    },
    {
      collectionGroup: 'ultra_debug_logs',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    },
    {
      collectionGroup: 'production_logs',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    },
    {
      collectionGroup: 'notification_logs',
      fieldPath: 'expireAt',
      ttl: true,
      indexes: []
    }
  ]
};

/**
 * Helper pour les écritures de logs d'erreur avec TTL
 */
export function createErrorLogData(
  data: Record<string, unknown>
): Record<string, unknown> & { expireAt: admin.firestore.Timestamp; timestamp: admin.firestore.FieldValue } {
  return {
    ...data,
    expireAt: calculateExpireAt('error_logs'),
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  };
}

/**
 * Helper pour les écritures de system_logs avec TTL
 */
export function createSystemLogData(
  type: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  return {
    type,
    ...data,
    expireAt: calculateExpireAt('system_logs'),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

/**
 * Helper pour les écritures de agent_tasks avec TTL
 * Le TTL est ajouté seulement quand la task est terminée
 */
export function createAgentTaskTTLUpdate(
  status: string
): { expireAt?: admin.firestore.Timestamp } {
  const terminalStatuses = ['COMPLETED', 'FAILED', 'CANCELLED'];

  if (terminalStatuses.includes(status)) {
    return {
      expireAt: calculateExpireAt('agent_tasks')
    };
  }

  return {};
}

/**
 * Vérifie si un document a expiré (pour debug/vérification)
 */
export function isExpired(expireAt: admin.firestore.Timestamp | undefined): boolean {
  if (!expireAt) return false;
  return expireAt.toMillis() < Date.now();
}

/**
 * Retourne le nombre de jours restants avant expiration
 */
export function daysUntilExpiration(expireAt: admin.firestore.Timestamp | undefined): number | null {
  if (!expireAt) return null;
  const diff = expireAt.toMillis() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

// Export par défaut
export const FirestoreTTL = {
  config: TTL_CONFIG,
  calculateExpireAt,
  withTTL,
  getTTLData,
  extendTTL,
  createErrorLogData,
  createSystemLogData,
  createAgentTaskTTLUpdate,
  isExpired,
  daysUntilExpiration,
  indexes: FIRESTORE_TTL_INDEXES
};

export default FirestoreTTL;
