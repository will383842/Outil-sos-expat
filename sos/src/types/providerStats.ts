/**
 * providerStats.ts
 *
 * Types TypeScript pour le suivi des performances des prestataires (frontend).
 */

import { Timestamp } from 'firebase/firestore';

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
  createdAt: Timestamp | Date;

  /** Date de dernière mise à jour */
  updatedAt: Timestamp | Date;
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
 * Options de filtre pour la page admin
 */
export interface ProviderStatsFilters {
  /** Mois sélectionné au format "YYYY-MM" */
  month: string;

  /** Filtrer par type de prestataire */
  providerType: ProviderStatsType | 'all';

  /** Filtrer par conformité */
  compliance: 'all' | 'compliant' | 'non-compliant';

  /** Recherche par nom ou email */
  searchTerm: string;
}

/**
 * Options de tri pour la page admin
 */
export type ProviderStatsSortField =
  | 'providerName'
  | 'hoursOnline'
  | 'callsMissed'
  | 'callsReceived'
  | 'avgCallDuration'
  | 'isCompliant';

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

/**
 * Ligne de stats pour affichage dans le tableau admin
 * (version simplifiée avec dates converties)
 */
export interface ProviderStatsRow {
  id: string;
  providerId: string;
  providerType: ProviderStatsType;
  providerName: string;
  providerEmail: string;
  month: string;
  hoursOnline: number;
  hoursOnlineTarget: number;
  hoursCompliant: boolean;
  callsReceived: number;
  callsAnswered: number;
  callsMissed: number;
  missedCallsTarget: number;
  missedCallsCompliant: boolean;
  totalCallDuration: number;
  avgCallDuration: number;
  isCompliant: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Convertit un ProviderMonthlyStats en ProviderStatsRow
 */
export function toProviderStatsRow(stats: ProviderMonthlyStats): ProviderStatsRow {
  return {
    ...stats,
    createdAt: stats.createdAt instanceof Date
      ? stats.createdAt
      : (stats.createdAt as Timestamp).toDate(),
    updatedAt: stats.updatedAt instanceof Date
      ? stats.updatedAt
      : (stats.updatedAt as Timestamp).toDate(),
  };
}
