/**
 * =============================================================================
 * TANSTACK QUERY - Configuration du QueryClient
 * =============================================================================
 *
 * Configuration centralisée pour React Query avec:
 * - Cache intelligent
 * - Retry automatique
 * - Stale time optimisé
 * - Garbage collection
 *
 * =============================================================================
 */

import { QueryClient } from "@tanstack/react-query";

// =============================================================================
// CONFIGURATION PAR DÉFAUT
// =============================================================================

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_GC_TIME = 30 * 60 * 1000; // 30 minutes
const MAX_RETRIES = 2;

// =============================================================================
// QUERY CLIENT SINGLETON
// =============================================================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Données considérées fraîches pendant 5 minutes
      staleTime: DEFAULT_STALE_TIME,

      // Garder en cache pendant 30 minutes après le dernier usage
      gcTime: DEFAULT_GC_TIME,

      // Retry automatique avec backoff exponentiel
      retry: (failureCount, error) => {
        // Ne pas retry sur les erreurs 4xx (sauf 429 rate limit)
        if (error instanceof Error && error.message.includes("4")) {
          const is429 = error.message.includes("429");
          return is429 && failureCount < MAX_RETRIES;
        }
        return failureCount < MAX_RETRIES;
      },

      // Refetch quand la fenêtre reprend le focus
      refetchOnWindowFocus: true,

      // Refetch quand la connexion réseau revient
      refetchOnReconnect: true,

      // Ne pas refetch automatiquement au mount si les données sont fraîches
      refetchOnMount: true,
    },
    mutations: {
      // Retry les mutations une fois en cas d'erreur réseau
      retry: 1,

      // Callback global pour les erreurs de mutation
      onError: (error) => {
        if (import.meta.env.DEV) {
          console.error("[Mutation Error]", error);
        }
      },
    },
  },
});

// =============================================================================
// QUERY KEYS - Clés centralisées pour le cache
// =============================================================================

export const queryKeys = {
  // Utilisateurs
  users: {
    all: ["users"] as const,
    detail: (id: string) => ["users", id] as const,
    byEmail: (email: string) => ["users", "email", email] as const,
  },

  // Providers (prestataires)
  providers: {
    all: ["providers"] as const,
    detail: (id: string) => ["providers", id] as const,
    byType: (type: string) => ["providers", "type", type] as const,
    stats: (id: string) => ["providers", id, "stats"] as const,
  },

  // Bookings (dossiers)
  bookings: {
    all: ["bookings"] as const,
    list: (filters?: Record<string, unknown>) => ["bookings", "list", filters] as const,
    detail: (id: string) => ["bookings", id] as const,
    byProvider: (providerId: string) => ["bookings", "provider", providerId] as const,
    byStatus: (status: string) => ["bookings", "status", status] as const,
    recent: (limit: number) => ["bookings", "recent", limit] as const,
  },

  // Conversations
  conversations: {
    all: ["conversations"] as const,
    detail: (id: string) => ["conversations", id] as const,
    messages: (conversationId: string) => ["conversations", conversationId, "messages"] as const,
    byBooking: (bookingId: string) => ["conversations", "booking", bookingId] as const,
  },

  // Country configs
  countryConfigs: {
    all: ["countryConfigs"] as const,
    detail: (code: string) => ["countryConfigs", code] as const,
  },

  // Stats et analytics
  stats: {
    dashboard: ["stats", "dashboard"] as const,
    provider: (providerId: string) => ["stats", "provider", providerId] as const,
    ai: ["stats", "ai"] as const,
  },
} as const;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Invalide toutes les queries d'une entité
 */
export function invalidateEntity(entity: keyof typeof queryKeys) {
  const keys = queryKeys[entity];
  if ("all" in keys) {
    queryClient.invalidateQueries({ queryKey: keys.all });
  }
}

/**
 * Précharge une query pour améliorer l'UX
 */
export async function prefetchQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
) {
  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: DEFAULT_STALE_TIME,
  });
}

/**
 * Reset complet du cache (utile après déconnexion)
 */
export function clearAllCache() {
  queryClient.clear();
}
