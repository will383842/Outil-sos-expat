/**
 * =============================================================================
 * USE SEARCH HOOK - Recherche avec debounce
 * =============================================================================
 */

import { useState, useMemo, useCallback, useEffect } from "react";

interface UseSearchOptions<T> {
  /** Champs dans lesquels chercher */
  searchFields: (keyof T)[];
  /** Délai de debounce en ms (défaut: 300) */
  debounceMs?: number;
  /** Recherche insensible à la casse (défaut: true) */
  caseInsensitive?: boolean;
}

interface UseSearchReturn<T> {
  /** Terme de recherche actuel */
  searchTerm: string;
  /** Terme de recherche après debounce */
  debouncedSearchTerm: string;
  /** Met à jour le terme de recherche */
  setSearchTerm: (term: string) => void;
  /** Efface la recherche */
  clearSearch: () => void;
  /** Données filtrées */
  filteredData: T[];
  /** Indique si une recherche est active */
  isSearching: boolean;
}

/**
 * Hook de recherche avec debounce et filtrage automatique
 */
export function useSearch<T extends Record<string, unknown>>(
  data: T[],
  options: UseSearchOptions<T>
): UseSearchReturn<T> {
  const { searchFields, debounceMs = 300, caseInsensitive = true } = options;

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce du terme de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  // Filtrage des données
  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return data;
    }

    const term = caseInsensitive
      ? debouncedSearchTerm.toLowerCase()
      : debouncedSearchTerm;

    return data.filter((item) => {
      return searchFields.some((field) => {
        const value = item[field];
        if (value == null) return false;

        const stringValue = String(value);
        const compareValue = caseInsensitive
          ? stringValue.toLowerCase()
          : stringValue;

        return compareValue.includes(term);
      });
    });
  }, [data, debouncedSearchTerm, searchFields, caseInsensitive]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  }, []);

  const isSearching = searchTerm.trim().length > 0;

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch,
    filteredData,
    isSearching,
  };
}

export default useSearch;
