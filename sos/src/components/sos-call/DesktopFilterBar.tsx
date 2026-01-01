import React, { useState, useRef, useEffect } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Search,
  ChevronDown,
  X,
  MapPin,
  Globe,
  Users,
  Scale,
  Wifi,
  WifiOff,
  RotateCcw,
  Check,
} from "lucide-react";

// ========================================
// Types
// ========================================
interface DesktopFilterBarProps {
  // Stats
  onlineCount: number;
  totalExperts: number;

  // Search
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchSuggestions: string[];
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;

  // Filters
  selectedType: "all" | "lawyer" | "expat";
  onTypeChange: (type: "all" | "lawyer" | "expat") => void;

  selectedCountryCode: string;
  onCountryChange: (code: string) => void;
  countryOptions: { code: string; label: string }[];

  selectedLanguageCodes: string[];
  onLanguageToggle: (code: string) => void;
  languageOptions: { code: string; label: string }[];

  statusFilter: "all" | "online" | "offline";
  onStatusChange: (status: "all" | "online" | "offline") => void;

  // Reset
  onResetFilters: () => void;
  activeFiltersCount: number;
}

// ========================================
// Dropdown Component
// ========================================
const FilterDropdown: React.FC<{
  label: React.ReactNode;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
  hasValue?: boolean;
  badge?: number;
}> = ({ label, icon, isOpen, onToggle, onClose, children, hasValue, badge }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={onToggle}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
          transition-all duration-200 whitespace-nowrap
          ${hasValue
            ? "bg-red-500/20 text-red-300 border border-red-400/40"
            : "bg-white/8 text-gray-300 border border-white/15 hover:bg-white/12 hover:border-white/25"
          }
        `}
      >
        {icon}
        <span className="max-w-[120px] truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[220px] max-h-[320px] overflow-auto bg-gray-900 border border-white/20 rounded-2xl shadow-2xl shadow-black/50 py-2">
          {children}
        </div>
      )}
    </div>
  );
};

// ========================================
// Main Component
// ========================================
const DesktopFilterBar: React.FC<DesktopFilterBarProps> = ({
  onlineCount,
  totalExperts,
  searchQuery,
  onSearchChange,
  searchSuggestions,
  showSuggestions,
  onShowSuggestionsChange,
  selectedType,
  onTypeChange,
  selectedCountryCode,
  onCountryChange,
  countryOptions,
  selectedLanguageCodes,
  onLanguageToggle,
  languageOptions,
  statusFilter,
  onStatusChange,
  onResetFilters,
  activeFiltersCount,
}) => {
  const intl = useIntl();
  const [openDropdown, setOpenDropdown] = useState<"type" | "country" | "language" | "status" | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        onShowSuggestionsChange(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onShowSuggestionsChange]);

  const getTypeLabel = () => {
    switch (selectedType) {
      case "lawyer": return <FormattedMessage id="filter.lawyer" defaultMessage="Avocats" />;
      case "expat": return <FormattedMessage id="filter.expat" defaultMessage="Expatriés" />;
      default: return <FormattedMessage id="filter.all" defaultMessage="Tous" />;
    }
  };

  const getTypeIcon = () => {
    switch (selectedType) {
      case "lawyer": return <Scale className="w-4 h-4" />;
      case "expat": return <Globe className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const _getStatusIcon = () => {
    switch (statusFilter) {
      case "online": return <Wifi className="w-4 h-4 text-green-400" />;
      case "offline": return <WifiOff className="w-4 h-4 text-orange-400" />;
      default: return <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />;
    }
  };

  const _getStatusLabel = () => {
    switch (statusFilter) {
      case "online": return <FormattedMessage id="status.online" defaultMessage="En ligne" />;
      case "offline": return <FormattedMessage id="status.offline" defaultMessage="Hors ligne" />;
      default: return <FormattedMessage id="status.all" defaultMessage="Tous" />;
    }
  };

  const getCountryLabel = () => {
    if (selectedCountryCode === "all") {
      return <FormattedMessage id="country.allCountries" defaultMessage="Tous les pays" />;
    }
    return countryOptions.find(c => c.code === selectedCountryCode)?.label || selectedCountryCode;
  };

  const getLanguageLabel = () => {
    if (selectedLanguageCodes.length === 0) {
      return <FormattedMessage id="language.all" defaultMessage="Toutes" />;
    }
    if (selectedLanguageCodes.length === 1) {
      return languageOptions.find(l => l.code === selectedLanguageCodes[0])?.label || selectedLanguageCodes[0];
    }
    return `${selectedLanguageCodes.length} langues`;
  };

  return (
    <div className="hidden lg:block relative z-30">
      {/* Main Filter Bar - Single Row */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3">
        <div className="flex items-center gap-3">
          {/* Stats Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-green-400 font-bold text-sm">{onlineCount}</span>
            <span className="text-gray-500 text-sm">/</span>
            <span className="text-gray-300 text-sm">{totalExperts}</span>
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-white/10" />

          {/* Search Input */}
          <div ref={searchRef} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onShowSuggestionsChange(true);
              }}
              onFocus={() => onShowSuggestionsChange(true)}
              placeholder={intl.formatMessage({ id: "search.placeholder", defaultMessage: "Rechercher..." })}
              className="w-full pl-9 pr-8 py-2 bg-white/8 border border-white/15 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange("");
                  onShowSuggestionsChange(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Search Suggestions */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-gray-900 border border-white/20 rounded-xl shadow-2xl shadow-black/50 py-2 max-h-48 overflow-auto">
                {searchSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSearchChange(suggestion);
                      onShowSuggestionsChange(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-white/10" />

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2">
            {/* Type Dropdown */}
            <FilterDropdown
              label={getTypeLabel()}
              icon={getTypeIcon()}
              isOpen={openDropdown === "type"}
              onToggle={() => setOpenDropdown(openDropdown === "type" ? null : "type")}
              onClose={() => setOpenDropdown(null)}
              hasValue={selectedType !== "all"}
            >
              {[
                { value: "all" as const, icon: <Users className="w-4 h-4" />, label: <FormattedMessage id="filter.all" defaultMessage="Tous les experts" /> },
                { value: "lawyer" as const, icon: <Scale className="w-4 h-4" />, label: <FormattedMessage id="filter.lawyer" defaultMessage="Avocats" /> },
                { value: "expat" as const, icon: <Globe className="w-4 h-4" />, label: <FormattedMessage id="filter.expat" defaultMessage="Expatriés" /> },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onTypeChange(option.value);
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    selectedType === option.value
                      ? "bg-red-500/20 text-red-300"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {option.icon}
                  <span className="flex-1 text-left">{option.label}</span>
                  {selectedType === option.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </FilterDropdown>

            {/* Country Dropdown */}
            <FilterDropdown
              label={getCountryLabel()}
              icon={<MapPin className="w-4 h-4" />}
              isOpen={openDropdown === "country"}
              onToggle={() => setOpenDropdown(openDropdown === "country" ? null : "country")}
              onClose={() => setOpenDropdown(null)}
              hasValue={selectedCountryCode !== "all"}
            >
              <button
                onClick={() => {
                  onCountryChange("all");
                  setOpenDropdown(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  selectedCountryCode === "all"
                    ? "bg-red-500/20 text-red-300"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="flex-1 text-left"><FormattedMessage id="country.allCountries" defaultMessage="Tous les pays" /></span>
                {selectedCountryCode === "all" && <Check className="w-4 h-4" />}
              </button>
              <div className="h-px bg-white/10 my-1" />
              {countryOptions.slice(0, 20).map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    onCountryChange(country.code);
                    setOpenDropdown(null);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    selectedCountryCode === country.code
                      ? "bg-red-500/20 text-red-300"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <img
                    src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                    alt=""
                    className="w-5 h-3.5 object-cover rounded-sm"
                  />
                  <span className="flex-1 text-left truncate">{country.label}</span>
                  {selectedCountryCode === country.code && <Check className="w-4 h-4" />}
                </button>
              ))}
            </FilterDropdown>

            {/* Language Dropdown (Multi-select) */}
            <FilterDropdown
              label={getLanguageLabel()}
              icon={<Globe className="w-4 h-4" />}
              isOpen={openDropdown === "language"}
              onToggle={() => setOpenDropdown(openDropdown === "language" ? null : "language")}
              onClose={() => setOpenDropdown(null)}
              hasValue={selectedLanguageCodes.length > 0}
              badge={selectedLanguageCodes.length > 1 ? selectedLanguageCodes.length : undefined}
            >
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <FormattedMessage id="language.selectMultiple" defaultMessage="Sélection multiple" />
              </div>
              {languageOptions.slice(0, 15).map((lang) => {
                const isSelected = selectedLanguageCodes.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    onClick={() => onLanguageToggle(lang.code)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      isSelected
                        ? "bg-purple-500/20 text-purple-300"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected ? "bg-purple-500 border-purple-500" : "border-gray-500"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="flex-1 text-left">{lang.label}</span>
                  </button>
                );
              })}
            </FilterDropdown>

            {/* Status Toggle Buttons */}
            <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
              <button
                onClick={() => onStatusChange("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === "all"
                    ? "bg-white/15 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <FormattedMessage id="status.all" defaultMessage="Tous" />
              </button>
              <button
                onClick={() => onStatusChange("online")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  statusFilter === "online"
                    ? "bg-green-500/20 text-green-400"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <FormattedMessage id="status.online" defaultMessage="En ligne" />
              </button>
              <button
                onClick={() => onStatusChange("offline")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  statusFilter === "offline"
                    ? "bg-orange-500/20 text-orange-400"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <WifiOff className="w-3.5 h-3.5" />
                <FormattedMessage id="status.offline" defaultMessage="Hors ligne" />
              </button>
            </div>
          </div>

          {/* Reset Button */}
          {activeFiltersCount > 0 && (
            <>
              <div className="w-px h-8 bg-white/10" />
              <button
                onClick={onResetFilters}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                title={intl.formatMessage({ id: "filters.reset", defaultMessage: "Réinitialiser" })}
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden xl:inline"><FormattedMessage id="filters.reset" defaultMessage="Réinitialiser" /></span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Filters Chips */}
      {(selectedCountryCode !== "all" || selectedLanguageCodes.length > 0 || selectedType !== "all" || statusFilter !== "all") && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            <FormattedMessage id="filters.active" defaultMessage="Filtres actifs :" />
          </span>

          {selectedType !== "all" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-500/20 text-slate-300 rounded-full text-xs font-medium">
              {selectedType === "lawyer" ? <Scale className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              {selectedType === "lawyer" ? "Avocats" : "Expatriés"}
              <button onClick={() => onTypeChange("all")} className="hover:text-white ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedCountryCode !== "all" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
              <MapPin className="w-3 h-3" />
              {countryOptions.find(c => c.code === selectedCountryCode)?.label}
              <button onClick={() => onCountryChange("all")} className="hover:text-white ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedLanguageCodes.map(code => (
            <span key={code} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium">
              <Globe className="w-3 h-3" />
              {languageOptions.find(l => l.code === code)?.label}
              <button onClick={() => onLanguageToggle(code)} className="hover:text-white ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {statusFilter !== "all" && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              statusFilter === "online"
                ? "bg-green-500/20 text-green-300"
                : "bg-orange-500/20 text-orange-300"
            }`}>
              {statusFilter === "online" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {statusFilter === "online" ? "En ligne" : "Hors ligne"}
              <button onClick={() => onStatusChange("all")} className="hover:text-white ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default DesktopFilterBar;
