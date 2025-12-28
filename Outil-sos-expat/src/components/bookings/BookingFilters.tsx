/**
 * =============================================================================
 * BOOKING FILTERS - Barre de filtres pour les listes de dossiers
 * Recherche, filtres par statut/type avec toggle avancé
 * =============================================================================
 */

import { Search, Filter, X } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useLanguage } from "../../hooks/useLanguage";

// =============================================================================
// TYPES
// =============================================================================

export type StatusFilter = "all" | "pending" | "in_progress" | "completed" | "cancelled";
export type TypeFilter = "all" | "lawyer" | "expat";

export interface BookingFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (type: TypeFilter) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFiltersCount: number;
  onReset: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BookingFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  showFilters,
  onToggleFilters,
  activeFiltersCount,
  onReset,
}: BookingFiltersProps) {
  const { t } = useLanguage({ mode: "provider" });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder={t("provider:dossiers.search")}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        {/* Bouton filtres */}
        <Button
          variant="outline"
          onClick={onToggleFilters}
          className={`inline-flex items-center gap-2 ${
            showFilters || activeFiltersCount > 0
              ? "border-red-500 text-red-600 bg-red-50 hover:bg-red-100"
              : "border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          {t("common:actions.filters")}
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filtres etendus */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 items-end">
          {/* Filtre statut */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("provider:dossiers.filters.status")}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="all">{t("provider:dossiers.filters.all")}</option>
              <option value="pending">{t("common:status.pending")}</option>
              <option value="in_progress">{t("common:status.inProgress")}</option>
              <option value="completed">{t("common:status.completed")}</option>
              <option value="cancelled">{t("common:status.cancelled")}</option>
            </select>
          </div>

          {/* Filtre type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t("provider:dossiers.filters.type")}
            </label>
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value as TypeFilter)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="all">{t("provider:dossiers.filters.all")}</option>
              <option value="lawyer">{t("provider:dossiers.filters.lawyer")}</option>
              <option value="expat">{t("provider:dossiers.filters.expat")}</option>
            </select>
          </div>

          {/* Reset filtres */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              {t("common:actions.reset")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook utilitaire pour calculer le nombre de filtres actifs
 */
export function useActiveFiltersCount(
  statusFilter: StatusFilter,
  typeFilter: TypeFilter
): number {
  return (statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);
}

export default BookingFilters;
