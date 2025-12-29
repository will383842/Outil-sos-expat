/**
 * =============================================================================
 * USE PAGINATION HOOK - Pagination Firestore avec curseurs
 * =============================================================================
 */

import { useState, useCallback, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryConstraint,
  DocumentData,
  QueryDocumentSnapshot,
  Firestore,
  where,
  WhereFilterOp,
} from "firebase/firestore";
import { DEFAULT_PAGE_SIZE } from "../lib/constants";

// =============================================================================
// TYPES
// =============================================================================

export interface PaginationFilter {
  field: string;
  operator: WhereFilterOp;
  value: unknown;
}

export interface UsePaginationOptions {
  /** Instance Firestore */
  db: Firestore;
  /** Nom de la collection */
  collectionName: string;
  /** Champ pour le tri */
  orderByField?: string;
  /** Direction du tri */
  orderDirection?: "asc" | "desc";
  /** Nombre d'éléments par page */
  pageSize?: number;
  /** Filtres initiaux */
  initialFilters?: PaginationFilter[];
}

export interface UsePaginationReturn<T> {
  /** Données de la page actuelle */
  data: T[];
  /** Chargement en cours */
  loading: boolean;
  /** Erreur éventuelle */
  error: string | null;
  /** Page actuelle (1-indexed) */
  currentPage: number;
  /** Plus de données disponibles */
  hasMore: boolean;
  /** Nombre total estimé de pages */
  totalPages: number | null;
  /** Charger la première page */
  loadFirstPage: () => Promise<void>;
  /** Charger la page suivante */
  loadNextPage: () => Promise<void>;
  /** Charger la page précédente */
  loadPrevPage: () => Promise<void>;
  /** Aller à une page spécifique (si possible) */
  goToPage: (page: number) => Promise<void>;
  /** Rafraîchir la page actuelle */
  refresh: () => Promise<void>;
  /** Mettre à jour les filtres */
  setFilters: (filters: PaginationFilter[]) => void;
  /** Réinitialiser la pagination */
  reset: () => void;
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

export function usePagination<T extends DocumentData = DocumentData>(
  options: UsePaginationOptions
): UsePaginationReturn<T> {
  const {
    db,
    collectionName,
    orderByField = "createdAt",
    orderDirection = "desc",
    pageSize = DEFAULT_PAGE_SIZE,
    initialFilters = [],
  } = options;

  // État
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<PaginationFilter[]>(initialFilters);

  // Curseurs pour la navigation
  const [cursors, setCursors] = useState<QueryDocumentSnapshot[]>([]);
  const [firstDoc, setFirstDoc] = useState<QueryDocumentSnapshot | null>(null);

  // Construire les contraintes de requête
  const buildConstraints = useCallback(
    (cursor?: QueryDocumentSnapshot): QueryConstraint[] => {
      const constraints: QueryConstraint[] = [];

      // Ajouter les filtres
      filters.forEach((f) => {
        constraints.push(where(f.field, f.operator, f.value));
      });

      // Tri
      constraints.push(orderBy(orderByField, orderDirection));

      // Limite
      constraints.push(limit(pageSize + 1)); // +1 pour détecter s'il y a plus

      // Curseur si fourni
      if (cursor) {
        constraints.push(startAfter(cursor));
      }

      return constraints;
    },
    [filters, orderByField, orderDirection, pageSize]
  );

  // Charger une page
  const loadPage = useCallback(
    async (cursor?: QueryDocumentSnapshot, pageNum: number = 1) => {
      setLoading(true);
      setError(null);

      try {
        const constraints = buildConstraints(cursor);
        const q = query(collection(db, collectionName), ...constraints);
        const snapshot = await getDocs(q);

        const docs = snapshot.docs;
        const hasMoreData = docs.length > pageSize;

        // Retirer le doc supplémentaire utilisé pour détecter "hasMore"
        const pageData = hasMoreData ? docs.slice(0, -1) : docs;

        // Mapper les données
        const items = pageData.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as unknown as T[];

        setData(items);
        setHasMore(hasMoreData);
        setCurrentPage(pageNum);

        // Sauvegarder les curseurs
        if (pageData.length > 0) {
          if (pageNum === 1) {
            setFirstDoc(pageData[0]);
            setCursors([pageData[pageData.length - 1]]);
          } else {
            // Ajouter le dernier doc comme curseur pour la page suivante
            setCursors((prev) => {
              const newCursors = [...prev];
              newCursors[pageNum - 1] = pageData[pageData.length - 1];
              return newCursors;
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur de chargement";
        setError(message);
        console.error("[usePagination] Erreur:", err);
      } finally {
        setLoading(false);
      }
    },
    [db, collectionName, buildConstraints, pageSize]
  );

  // Charger la première page
  const loadFirstPage = useCallback(async () => {
    setCursors([]);
    setFirstDoc(null);
    await loadPage(undefined, 1);
  }, [loadPage]);

  // Charger la page suivante
  const loadNextPage = useCallback(async () => {
    if (!hasMore || loading) return;

    const lastCursor = cursors[currentPage - 1];
    if (lastCursor) {
      await loadPage(lastCursor, currentPage + 1);
    }
  }, [hasMore, loading, cursors, currentPage, loadPage]);

  // Charger la page précédente
  const loadPrevPage = useCallback(async () => {
    if (currentPage <= 1 || loading) return;

    if (currentPage === 2) {
      // Retour à la première page
      await loadFirstPage();
    } else {
      // Utiliser le curseur de la page précédente
      const prevCursor = cursors[currentPage - 3]; // -3 car on veut la page avant la précédente
      if (prevCursor) {
        await loadPage(prevCursor, currentPage - 1);
      }
    }
  }, [currentPage, loading, cursors, loadFirstPage, loadPage]);

  // Aller à une page spécifique
  const goToPage = useCallback(
    async (page: number) => {
      if (page < 1 || loading) return;

      if (page === 1) {
        await loadFirstPage();
        return;
      }

      // On peut seulement aller aux pages déjà visitées
      const cursor = cursors[page - 2];
      if (cursor) {
        await loadPage(cursor, page);
      }
    },
    [loading, cursors, loadFirstPage, loadPage]
  );

  // Rafraîchir la page actuelle
  const refresh = useCallback(async () => {
    if (currentPage === 1) {
      await loadFirstPage();
    } else {
      const cursor = cursors[currentPage - 2];
      if (cursor) {
        await loadPage(cursor, currentPage);
      }
    }
  }, [currentPage, cursors, loadFirstPage, loadPage]);

  // Réinitialiser
  const reset = useCallback(() => {
    setData([]);
    setCurrentPage(1);
    setHasMore(true);
    setCursors([]);
    setFirstDoc(null);
    setError(null);
  }, []);

  // Mettre à jour les filtres (reset automatique)
  const updateFilters = useCallback((newFilters: PaginationFilter[]) => {
    setFilters(newFilters);
    // Reset sera effectué automatiquement au prochain loadFirstPage
  }, []);

  // Estimation du nombre total de pages (null si inconnu)
  const totalPages = useMemo(() => {
    if (!hasMore && currentPage > 0) {
      return currentPage;
    }
    return null;
  }, [hasMore, currentPage]);

  return {
    data,
    loading,
    error,
    currentPage,
    hasMore,
    totalPages,
    loadFirstPage,
    loadNextPage,
    loadPrevPage,
    goToPage,
    refresh,
    setFilters: updateFilters,
    reset,
  };
}

// =============================================================================
// HOOK SIMPLIFIÉ POUR PAGINATION LOCALE
// =============================================================================

interface UseLocalPaginationOptions<T> {
  /** Toutes les données */
  data: T[];
  /** Nombre d'éléments par page */
  pageSize?: number;
}

interface UseLocalPaginationReturn<T> {
  /** Données de la page actuelle */
  pageData: T[];
  /** Page actuelle (1-indexed) */
  currentPage: number;
  /** Nombre total de pages */
  totalPages: number;
  /** Aller à la page suivante */
  nextPage: () => void;
  /** Aller à la page précédente */
  prevPage: () => void;
  /** Aller à une page spécifique */
  goToPage: (page: number) => void;
  /** Est-ce la première page */
  isFirstPage: boolean;
  /** Est-ce la dernière page */
  isLastPage: boolean;
}

/**
 * Hook pour paginer des données déjà chargées en mémoire
 */
export function useLocalPagination<T>(
  options: UseLocalPaginationOptions<T>
): UseLocalPaginationReturn<T> {
  const { data, pageSize = DEFAULT_PAGE_SIZE } = options;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Réinitialiser à la page 1 si les données changent
  const validPage = Math.min(currentPage, totalPages);
  if (validPage !== currentPage) {
    setCurrentPage(validPage);
  }

  const startIndex = (validPage - 1) * pageSize;
  const pageData = data.slice(startIndex, startIndex + pageSize);

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 1));
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  return {
    pageData,
    currentPage: validPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    isFirstPage: validPage === 1,
    isLastPage: validPage === totalPages,
  };
}

export default usePagination;
