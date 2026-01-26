/**
 * ============================================================================
 * HOOK - useLandingData
 * ============================================================================
 *
 * Récupère les données d'une landing page depuis Firebase Firestore.
 * Utilise React Query pour le caching et la gestion d'état.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebase';
import type { LandingData, RouteParams } from '../types';

/**
 * Construit l'ID du document Firestore à partir des paramètres de route
 * Format: country_lang_service_specialty
 * Ex: de_fr_lawyers_family-law
 */
function buildDocumentId(params: RouteParams): string {
  const lang = params.lang || 'fr';
  const country = params.country || '';
  const service = params.service || 'services';
  const specialty = params.specialty || '';

  const parts = [country, lang, service];
  if (specialty) {
    parts.push(specialty);
  }

  return parts.filter(Boolean).join('_');
}

/**
 * Récupère les données d'une landing page depuis Firestore
 */
async function fetchLandingData(documentId: string): Promise<LandingData> {
  const docRef = doc(db, 'landings', documentId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Landing page not found: ${documentId}`);
  }

  return docSnap.data() as LandingData;
}

export interface UseLandingDataOptions {
  /** Durée avant que les données soient considérées périmées (ms) */
  staleTime?: number;
  /** Durée de conservation en cache (ms) */
  cacheTime?: number;
  /** Activer/désactiver le fetch */
  enabled?: boolean;
}

export interface UseLandingDataResult {
  data: LandingData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
}

/**
 * Hook principal pour récupérer une landing page
 *
 * @param params - Paramètres de route (lang, country, service, specialty)
 * @param options - Options de configuration React Query
 *
 * @example
 * ```tsx
 * const { lang, country, service } = useParams();
 * const { data, isLoading, error } = useLandingData({ lang, country, service });
 *
 * if (isLoading) return <PageLoader />;
 * if (error) return <ErrorPage />;
 *
 * return <LandingPage data={data} />;
 * ```
 */
export function useLandingData(
  params: RouteParams,
  options: UseLandingDataOptions = {}
): UseLandingDataResult {
  const {
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 30 * 60 * 1000, // 30 minutes
    enabled = true,
  } = options;

  const documentId = buildDocumentId(params);

  const query = useQuery({
    queryKey: ['landing', documentId],
    queryFn: () => fetchLandingData(documentId),
    staleTime,
    gcTime: cacheTime,
    enabled: enabled && Boolean(documentId),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

/**
 * Hook pour précharger une landing page
 * Utile pour le prefetch au survol d'un lien
 */
export function usePrefetchLanding() {
  const queryClient = useQueryClient();

  const prefetch = (params: RouteParams) => {
    const documentId = buildDocumentId(params);

    queryClient.prefetchQuery({
      queryKey: ['landing', documentId],
      queryFn: () => fetchLandingData(documentId),
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetch };
}
