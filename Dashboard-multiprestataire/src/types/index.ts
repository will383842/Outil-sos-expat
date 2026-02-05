/**
 * Type exports for Dashboard Multiprestataire
 */

// Provider types
export type {
  ProviderType,
  AvailabilityStatus,
  ProviderSummary,
  Provider,
  AgencyManager,
} from './provider';

export { normalizeProvider, toProviderSummary } from './provider';

// Stats types
export type {
  ProviderMonthlyStats,
  AgencyStats,
  ProviderStatsRow,
  StatsFilters,
  StatsSortField,
} from './stats';

export {
  PROVIDER_STATS_CONFIG,
  toStatsRow,
  aggregateAgencyStats,
} from './stats';

// Booking types
export type {
  BookingRequest,
  BookingCategory,
} from './booking';

export {
  FIVE_MINUTES,
  TWENTY_FOUR_HOURS,
  classifyBooking,
  SERVICE_TYPE_LABELS,
  BOOKING_STATUS_LABELS,
} from './booking';

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'agency_manager' | 'admin';
  linkedProviderIds: string[];
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}
