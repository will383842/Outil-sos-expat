/**
 * =============================================================================
 * BOOKINGS COMPONENTS - Barrel export
 * Composants pour la gestion et l'affichage des dossiers/bookings
 * =============================================================================
 */

// Components
export { BookingCard } from "./BookingCard";
export type { BookingCardProps, BookingCardData } from "./BookingCard";

export { BookingFilters, useActiveFiltersCount } from "./BookingFilters";
export type {
  BookingFiltersProps,
  StatusFilter,
  TypeFilter,
} from "./BookingFilters";

export { ClientInfoPanel } from "./ClientInfoPanel";
export type { ClientInfoPanelProps, BookingData } from "./ClientInfoPanel";

export { StatusActions } from "./StatusActions";
export type { StatusActionsProps } from "./StatusActions";

export { BookingStats, useBookingStats } from "./BookingStats";
export type { BookingStatsProps, BookingStatsData } from "./BookingStats";
