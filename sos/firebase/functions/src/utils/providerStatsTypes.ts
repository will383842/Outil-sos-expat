/**
 * providerStatsTypes.ts
 *
 * Types TypeScript pour le suivi des performances des prestataires.
 * Utilisé par les fonctions d'agrégation et les callables admin.
 */

import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';

/**
 * Type de prestataire pour les stats
 */
export type ProviderStatsType = 'lawyer' | 'expat';

/**
 * Interface pour les statistiques mensuelles d'un prestataire
 * Collection: provider_stats
 * Document ID: {providerId}_YYYY-MM
 */
export interface ProviderMonthlyStats {
  /** ID du document: "{providerId}_YYYY-MM" */
  id: string;

  /** ID du prestataire */
  providerId: string;

  /** Type de prestataire */
  providerType: ProviderStatsType;

  /** Mois au format "YYYY-MM" */
  month: string;

  // ========== HEURES EN LIGNE ==========

  /** Total heures en ligne ce mois (calculé à partir des sessions) */
  hoursOnline: number;

  /** Minimum requis d'heures en ligne par mois */
  hoursOnlineTarget: number;

  /** true si hoursOnline >= hoursOnlineTarget */
  hoursCompliant: boolean;

  // ========== APPELS ==========

  /** Nombre total d'appels reçus ce mois */
  callsReceived: number;

  /** Nombre d'appels répondus */
  callsAnswered: number;

  /** Nombre d'appels manqués (provider no_answer) */
  callsMissed: number;

  /** Maximum autorisé d'appels manqués par mois */
  missedCallsTarget: number;

  /** true si callsMissed <= missedCallsTarget */
  missedCallsCompliant: boolean;

  // ========== DURÉES ==========

  /** Durée totale des appels en secondes */
  totalCallDuration: number;

  /** Durée moyenne des appels en secondes */
  avgCallDuration: number;

  // ========== CONFORMITÉ ==========

  /** Conformité globale: hoursCompliant && missedCallsCompliant */
  isCompliant: boolean;

  // ========== INFO PROVIDER (dénormalisé pour affichage) ==========

  /** Nom complet du prestataire */
  providerName: string;

  /** Email du prestataire */
  providerEmail: string;

  // ========== TIMESTAMPS ==========

  /** Date de création du document */
  createdAt: AdminTimestamp;

  /** Date de dernière mise à jour */
  updatedAt: AdminTimestamp;
}

/**
 * Configuration par défaut pour les stats
 */
export const PROVIDER_STATS_CONFIG = {
  /** Minimum d'heures en ligne requis par mois */
  HOURS_ONLINE_TARGET: 50,

  /** Maximum d'appels manqués autorisé par mois */
  MISSED_CALLS_TARGET: 3,
} as const;

/**
 * Actions trackées dans provider_status_logs
 */
export type ProviderStatusAction =
  | 'SET_BUSY'
  | 'SET_AVAILABLE'
  | 'SET_OFFLINE'
  | 'RESTORE_OFFLINE'
  | 'SET_BUSY_BY_SIBLING'
  | 'RELEASE_FROM_SIBLING_BUSY';

/**
 * Interface pour les logs de statut provider
 * Collection: provider_status_logs
 */
export interface ProviderStatusLog {
  providerId: string;
  action: ProviderStatusAction;
  previousStatus: 'available' | 'busy' | 'offline';
  newStatus: 'available' | 'busy' | 'offline';
  callSessionId?: string;
  reason?: string;
  wasOfflineBeforeCall?: boolean;
  timestamp: AdminTimestamp;
}

/**
 * Interface pour une session en ligne calculée
 */
export interface OnlineSession {
  providerId: string;
  startTime: AdminTimestamp;
  endTime: AdminTimestamp | null;
  durationSeconds: number;
}

/**
 * Paramètres pour la requête getProviderStats
 */
export interface GetProviderStatsParams {
  /** Mois au format "YYYY-MM" (défaut: mois courant) */
  month?: string;

  /** Filtrer par type de prestataire */
  providerType?: ProviderStatsType | 'all';

  /** Filtrer par conformité */
  compliance?: 'all' | 'compliant' | 'non-compliant';

  /** Recherche par nom ou email */
  search?: string;

  /** Champ de tri */
  sortBy?: 'providerName' | 'hoursOnline' | 'callsMissed' | 'callsReceived' | 'avgCallDuration';

  /** Direction du tri */
  sortDir?: 'asc' | 'desc';

  /** Taille de page */
  pageSize?: number;

  /** Offset pour pagination */
  offset?: number;
}

/**
 * Réponse de getProviderStats
 */
export interface GetProviderStatsResponse {
  success: boolean;
  stats: ProviderMonthlyStats[];
  total: number;
  month: string;
  error?: string;
}

/**
 * Résumé des stats pour le dashboard
 */
export interface ProviderStatsSummary {
  month: string;
  totalProviders: number;
  compliantProviders: number;
  nonCompliantProviders: number;
  complianceRate: number;
  avgHoursOnline: number;
  avgMissedCalls: number;
  totalCallsReceived: number;
  totalCallsAnswered: number;
  totalCallsMissed: number;
}
