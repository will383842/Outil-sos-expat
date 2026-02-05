/**
 * =============================================================================
 * HOOKS - Export centralisé de tous les hooks
 * =============================================================================
 */

// Hooks d'authentification et contexte
export { useAuthUser } from "./useAuthUser";
export { useProvider } from "./useProvider";

// Hooks de données Firestore
export {
  useFirestoreDocument,
  useFirestoreCollection,
  useFirestoreRealtime,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  useProviderBookings,
  useAllBookings,
  useBooking,
  useProviders,
  useBookingConversations,
  useConversationMessages,
  type FirestoreDocument,
  type QueryOptions,
  type Booking,
  type Provider,
  type Conversation,
  type Message,
} from "./useFirestoreQuery";

// Note: useSubscription est maintenant fourni par UnifiedUserContext

// Hooks de configuration
export { useCountryConfig } from "./useCountryConfig";

// Hooks de pagination
export {
  usePagination,
  useLocalPagination,
  type PaginationFilter,
  type UsePaginationOptions,
  type UsePaginationReturn,
} from "./usePagination";

// Hooks de filtres
export {
  useFilters,
  useStatusFilter,
  useBookingFilters,
  useProviderFilters,
  type FilterValue,
  type FilterDefinition,
  type UseFiltersOptions,
  type UseFiltersReturn,
  type BookingFiltersValues,
  type ProviderFiltersValues,
} from "./useFilters";

// Hooks de recherche
export { useSearch } from "./useSearch";

// Hooks de chat
export { useStreamingChat } from "./useStreamingChat";

// Hooks responsive et media queries
export {
  useMediaQuery,
  useBreakpoint,
  useIsMobile,
  useIsTabletOrBelow,
  usePrefersReducedMotion,
  usePrefersDarkMode,
  usePrefersHighContrast,
  useOrientation,
  BREAKPOINTS,
  type Breakpoint,
  type BreakpointResult,
  type Orientation,
} from "./useMediaQuery";

// Hooks de notifications
export {
  useUnreadMessages,
  useNewAIResponses,
  type UnreadMessagesResult,
} from "./useUnreadMessages";

// Multi-provider notifications
export { useSiblingStatusNotifications } from "./useSiblingStatusNotifications";

