/**
 * =============================================================================
 * PROVIDER FILTERS - Barre de filtres pour la liste des prestataires
 * =============================================================================
 */

import { Search, Filter, X } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export type TypeFilter = "all" | "lawyer" | "expat";
export type AccessFilter = "all" | "with" | "without";

export interface ProviderFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (type: TypeFilter) => void;
  accessFilter: AccessFilter;
  onAccessFilterChange: (access: AccessFilter) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  onReset: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProviderFilters({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  accessFilter,
  onAccessFilterChange,
  showFilters,
  onToggleFilters,
  onReset,
}: ProviderFiltersProps) {
  const hasActiveFilters = typeFilter !== "all" || accessFilter !== "all";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, pays..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bouton filtres */}
        <button
          onClick={onToggleFilters}
          className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            showFilters || hasActiveFilters
              ? "border-red-500 text-red-600 bg-red-50"
              : "border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtres
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-red-600 text-white rounded-full">
              {(typeFilter !== "all" ? 1 : 0) + (accessFilter !== "all" ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filtres etendus */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 items-end">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value as TypeFilter)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="all">Tous</option>
              <option value="lawyer">Avocats</option>
              <option value="expat">Expatries</option>
            </select>
          </div>

          {/* Acces outil */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Acces outil
            </label>
            <select
              value={accessFilter}
              onChange={(e) => onAccessFilterChange(e.target.value as AccessFilter)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="all">Tous</option>
              <option value="with">Avec acces</option>
              <option value="without">Sans acces</option>
            </select>
          </div>

          {/* Bouton reset */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Reinitialiser
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ProviderFilters;
