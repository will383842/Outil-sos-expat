/**
 * =============================================================================
 * USE FILTERS HOOK - Gestion des filtres avec persistance URL
 * =============================================================================
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

// =============================================================================
// TYPES
// =============================================================================

export type FilterValue = string | string[] | boolean | number | null;

export interface FilterDefinition {
  /** Clé du filtre */
  key: string;
  /** Valeur par défaut */
  defaultValue: FilterValue;
  /** Persister dans l'URL */
  persistInUrl?: boolean;
  /** Fonction de transformation pour l'URL */
  serialize?: (value: FilterValue) => string;
  /** Fonction de parsing depuis l'URL */
  deserialize?: (value: string) => FilterValue;
}

export interface UseFiltersOptions<T extends Record<string, FilterValue>> {
  /** Définitions des filtres */
  filters: FilterDefinition[];
  /** Persister les filtres dans l'URL (défaut: true) */
  persistInUrl?: boolean;
  /** Callback quand les filtres changent */
  onChange?: (filters: T) => void;
}

export interface UseFiltersReturn<T extends Record<string, FilterValue>> {
  /** Valeurs actuelles des filtres */
  values: T;
  /** Met à jour un filtre */
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Met à jour plusieurs filtres */
  setFilters: (updates: Partial<T>) => void;
  /** Réinitialise un filtre à sa valeur par défaut */
  resetFilter: (key: keyof T) => void;
  /** Réinitialise tous les filtres */
  resetAll: () => void;
  /** Vérifie si des filtres sont actifs (différents des valeurs par défaut) */
  hasActiveFilters: boolean;
  /** Nombre de filtres actifs */
  activeFiltersCount: number;
  /** Liste des clés de filtres actifs */
  activeFilterKeys: (keyof T)[];
}

// =============================================================================
// HELPERS
// =============================================================================

function defaultSerialize(value: FilterValue): string {
  if (value === null) return "";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}

function defaultDeserialize(
  value: string,
  defaultValue: FilterValue
): FilterValue {
  if (value === "") return null;

  // Détecter le type à partir de la valeur par défaut
  if (Array.isArray(defaultValue)) {
    return value.split(",").filter(Boolean);
  }
  if (typeof defaultValue === "boolean") {
    return value === "true";
  }
  if (typeof defaultValue === "number") {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }
  return value;
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

export function useFilters<T extends Record<string, FilterValue>>(
  options: UseFiltersOptions<T>
): UseFiltersReturn<T> {
  const { filters, persistInUrl = true, onChange } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  // Construire les valeurs par défaut
  const defaultValues = useMemo(() => {
    const defaults: Record<string, FilterValue> = {};
    filters.forEach((f) => {
      defaults[f.key] = f.defaultValue;
    });
    return defaults as T;
  }, [filters]);

  // Initialiser les valeurs depuis l'URL ou les défauts
  const getInitialValues = useCallback((): T => {
    const values: Record<string, FilterValue> = {};

    filters.forEach((f) => {
      const shouldPersist = f.persistInUrl ?? persistInUrl;
      const urlValue = shouldPersist ? searchParams.get(f.key) : null;

      if (urlValue !== null) {
        const deserialize = f.deserialize ?? ((v: string) => defaultDeserialize(v, f.defaultValue));
        values[f.key] = deserialize(urlValue);
      } else {
        values[f.key] = f.defaultValue;
      }
    });

    return values as T;
  }, [filters, persistInUrl, searchParams]);

  const [values, setValues] = useState<T>(getInitialValues);

  // Synchroniser avec l'URL quand les filtres changent
  const syncToUrl = useCallback(
    (newValues: T) => {
      if (!persistInUrl) return;

      const newParams = new URLSearchParams(searchParams);

      filters.forEach((f) => {
        const shouldPersist = f.persistInUrl ?? persistInUrl;
        if (!shouldPersist) return;

        const value = newValues[f.key as keyof T];
        const serialize = f.serialize ?? defaultSerialize;
        const serialized = serialize(value);

        // Ne pas mettre les valeurs par défaut dans l'URL
        const defaultSerialized = serialize(f.defaultValue);
        if (serialized === defaultSerialized || serialized === "") {
          newParams.delete(f.key);
        } else {
          newParams.set(f.key, serialized);
        }
      });

      setSearchParams(newParams, { replace: true });
    },
    [filters, persistInUrl, searchParams, setSearchParams]
  );

  // Mettre à jour un filtre
  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setValues((prev) => {
        const newValues = { ...prev, [key]: value };
        syncToUrl(newValues);
        onChange?.(newValues);
        return newValues;
      });
    },
    [syncToUrl, onChange]
  );

  // Mettre à jour plusieurs filtres
  const setFiltersMultiple = useCallback(
    (updates: Partial<T>) => {
      setValues((prev) => {
        const newValues = { ...prev, ...updates };
        syncToUrl(newValues);
        onChange?.(newValues);
        return newValues;
      });
    },
    [syncToUrl, onChange]
  );

  // Réinitialiser un filtre
  const resetFilter = useCallback(
    (key: keyof T) => {
      const filterDef = filters.find((f) => f.key === key);
      if (filterDef) {
        setFilter(key, filterDef.defaultValue as T[keyof T]);
      }
    },
    [filters, setFilter]
  );

  // Réinitialiser tous les filtres
  const resetAll = useCallback(() => {
    setValues(defaultValues);
    syncToUrl(defaultValues);
    onChange?.(defaultValues);
  }, [defaultValues, syncToUrl, onChange]);

  // Calculer les filtres actifs
  const activeFilterKeys = useMemo(() => {
    return Object.keys(values).filter((key) => {
      const currentValue = values[key as keyof T];
      const defaultValue = defaultValues[key as keyof T];

      // Comparer les valeurs
      if (Array.isArray(currentValue) && Array.isArray(defaultValue)) {
        return JSON.stringify(currentValue) !== JSON.stringify(defaultValue);
      }
      return currentValue !== defaultValue;
    }) as (keyof T)[];
  }, [values, defaultValues]);

  const hasActiveFilters = activeFilterKeys.length > 0;
  const activeFiltersCount = activeFilterKeys.length;

  // Écouter les changements d'URL (navigation arrière/avant)
  useEffect(() => {
    if (persistInUrl) {
      const newValues = getInitialValues();
      setValues(newValues);
    }
  }, [searchParams, persistInUrl, getInitialValues]);

  return {
    values,
    setFilter,
    setFilters: setFiltersMultiple,
    resetFilter,
    resetAll,
    hasActiveFilters,
    activeFiltersCount,
    activeFilterKeys,
  };
}

// =============================================================================
// HOOK SIMPLIFIÉ POUR UN SEUL FILTRE DE STATUT
// =============================================================================

interface UseStatusFilterOptions {
  /** Valeur par défaut */
  defaultValue?: string;
  /** Clé URL */
  urlKey?: string;
  /** Persister dans l'URL */
  persistInUrl?: boolean;
}

interface UseStatusFilterReturn {
  status: string;
  setStatus: (status: string) => void;
  isAll: boolean;
  reset: () => void;
}

/**
 * Hook simplifié pour un filtre de statut unique
 */
export function useStatusFilter(
  options: UseStatusFilterOptions = {}
): UseStatusFilterReturn {
  const { defaultValue = "all", urlKey = "status", persistInUrl = true } = options;

  const { values, setFilter, resetFilter } = useFilters({
    filters: [{ key: urlKey, defaultValue, persistInUrl }],
  });

  return {
    status: (values[urlKey] as string) || defaultValue,
    setStatus: (status: string) => setFilter(urlKey, status),
    isAll: values[urlKey] === "all" || values[urlKey] === defaultValue,
    reset: () => resetFilter(urlKey),
  };
}

// =============================================================================
// HOOK POUR FILTRES DE DOSSIERS
// =============================================================================

export interface BookingFiltersValues {
  status: string;
  priority: string;
  provider: string;
  dateRange: string;
}

const BOOKING_FILTERS: FilterDefinition[] = [
  { key: "status", defaultValue: "all" },
  { key: "priority", defaultValue: "all" },
  { key: "provider", defaultValue: "all" },
  { key: "dateRange", defaultValue: "all" },
];

/**
 * Hook pré-configuré pour les filtres de dossiers
 */
export function useBookingFilters() {
  return useFilters<BookingFiltersValues>({
    filters: BOOKING_FILTERS,
    persistInUrl: true,
  });
}

// =============================================================================
// HOOK POUR FILTRES DE PRESTATAIRES
// =============================================================================

export interface ProviderFiltersValues {
  type: string;
  country: string;
  status: string;
}

const PROVIDER_FILTERS: FilterDefinition[] = [
  { key: "type", defaultValue: "all" },
  { key: "country", defaultValue: "all" },
  { key: "status", defaultValue: "all" },
];

/**
 * Hook pré-configuré pour les filtres de prestataires
 */
export function useProviderFilters() {
  return useFilters<ProviderFiltersValues>({
    filters: PROVIDER_FILTERS,
    persistInUrl: true,
  });
}

export default useFilters;
