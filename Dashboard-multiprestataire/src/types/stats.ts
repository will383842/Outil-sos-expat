/**
 * Provider Stats Types for Dashboard Multiprestataire
 * Mirrors the provider_stats collection structure from SOS
 */
import { Timestamp } from 'firebase/firestore';
import type { ProviderType } from './provider';

/**
 * Monthly stats for a single provider
 * Collection: provider_stats
 * Document ID: {providerId}_YYYY-MM
 */
export interface ProviderMonthlyStats {
  /** ID du document: "{providerId}_YYYY-MM" */
  id: string;

  /** ID du prestataire */
  providerId: string;

  /** Type de prestataire */
  providerType: ProviderType;

  /** Mois au format "YYYY-MM" */
  month: string;

  // Hours online
  hoursOnline: number;
  hoursOnlineTarget: number;
  hoursCompliant: boolean;

  // Calls
  callsReceived: number;
  callsAnswered: number;
  callsMissed: number;
  missedCallsTarget: number;
  missedCallsCompliant: boolean;

  // Duration
  totalCallDuration: number; // seconds
  avgCallDuration: number; // seconds

  // Compliance
  isCompliant: boolean;

  // Denormalized provider info
  providerName: string;
  providerEmail: string;

  // Timestamps
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * Default configuration for stats targets
 */
export const PROVIDER_STATS_CONFIG = {
  HOURS_ONLINE_TARGET: 50,
  MISSED_CALLS_TARGET: 3,
} as const;

/**
 * Aggregated stats for the agency (all providers combined)
 */
export interface AgencyStats {
  month: string;
  totalProviders: number;
  activeProviders: number;
  compliantProviders: number;
  nonCompliantProviders: number;
  complianceRate: number;
  totalHoursOnline: number;
  avgHoursOnline: number;
  totalCallsReceived: number;
  totalCallsAnswered: number;
  totalCallsMissed: number;
  avgMissedCalls: number;
  totalCallDuration: number;
  avgCallDuration: number;
}

/**
 * Stats row for display in tables
 */
export interface ProviderStatsRow {
  id: string;
  providerId: string;
  providerType: ProviderType;
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
 * Filter options for stats queries
 */
export interface StatsFilters {
  month: string;
  providerType: ProviderType | 'all';
  compliance: 'all' | 'compliant' | 'non-compliant';
  searchTerm: string;
}

/**
 * Sort options
 */
export type StatsSortField =
  | 'providerName'
  | 'hoursOnline'
  | 'callsMissed'
  | 'callsReceived'
  | 'avgCallDuration'
  | 'isCompliant';

/**
 * Convert Firestore stats to row format
 */
export function toStatsRow(stats: ProviderMonthlyStats): ProviderStatsRow {
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

/**
 * Calculate agency-level stats from individual provider stats
 */
export function aggregateAgencyStats(
  providerStats: ProviderMonthlyStats[],
  month: string
): AgencyStats {
  const activeStats = providerStats.filter((s) => s.month === month);
  const totalProviders = activeStats.length;

  if (totalProviders === 0) {
    return {
      month,
      totalProviders: 0,
      activeProviders: 0,
      compliantProviders: 0,
      nonCompliantProviders: 0,
      complianceRate: 0,
      totalHoursOnline: 0,
      avgHoursOnline: 0,
      totalCallsReceived: 0,
      totalCallsAnswered: 0,
      totalCallsMissed: 0,
      avgMissedCalls: 0,
      totalCallDuration: 0,
      avgCallDuration: 0,
    };
  }

  const compliantProviders = activeStats.filter((s) => s.isCompliant).length;
  const totalHoursOnline = activeStats.reduce((sum, s) => sum + s.hoursOnline, 0);
  const totalCallsReceived = activeStats.reduce((sum, s) => sum + s.callsReceived, 0);
  const totalCallsAnswered = activeStats.reduce((sum, s) => sum + s.callsAnswered, 0);
  const totalCallsMissed = activeStats.reduce((sum, s) => sum + s.callsMissed, 0);
  const totalCallDuration = activeStats.reduce((sum, s) => sum + s.totalCallDuration, 0);

  return {
    month,
    totalProviders,
    activeProviders: activeStats.filter((s) => s.hoursOnline > 0).length,
    compliantProviders,
    nonCompliantProviders: totalProviders - compliantProviders,
    complianceRate: (compliantProviders / totalProviders) * 100,
    totalHoursOnline,
    avgHoursOnline: totalHoursOnline / totalProviders,
    totalCallsReceived,
    totalCallsAnswered,
    totalCallsMissed,
    avgMissedCalls: totalCallsMissed / totalProviders,
    totalCallDuration,
    avgCallDuration: totalCallsAnswered > 0 ? totalCallDuration / totalCallsAnswered : 0,
  };
}
