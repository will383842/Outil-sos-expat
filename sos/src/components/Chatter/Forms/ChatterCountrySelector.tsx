/**
 * ChatterCountrySelector - Country selection for chatter intervention zones
 * Allows chatters to select 1-5 countries where they want to interact
 * Uses the country rotation system (90% threshold cycling)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Globe,
  Search,
  Check,
  AlertCircle,
  Loader2,
  Info,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl transition-all",
  },
} as const;

interface AvailableCountry {
  code: string;
  name: string;
  timesAssigned: number;
}

interface ChatterCountrySelectorProps {
  onSubmit: (countryCodes: string[]) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  maxSelection?: number;
  minSelection?: number;
}

const ChatterCountrySelector: React.FC<ChatterCountrySelectorProps> = ({
  onSubmit,
  loading = false,
  error,
  maxSelection = 5,
  minSelection = 1,
}) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<AvailableCountry[]>([]);
  const [cycleInfo, setCycleInfo] = useState<{
    currentCycle: number;
    totalCountries: number;
    assignedCount: number;
    percentAssigned: number;
  } | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch available countries
  const fetchAvailableCountries = useCallback(async () => {
    setLoadingCountries(true);
    setFetchError(null);

    try {
      const functions = getFunctions(undefined, 'europe-west1');
      const getAvailableCountriesForChatter = httpsCallable(
        functions,
        'getAvailableCountriesForChatter'
      );

      const result = await getAvailableCountriesForChatter();
      const data = result.data as {
        success: boolean;
        countries: AvailableCountry[];
        currentCycle: number;
        totalCountries: number;
        assignedCount: number;
        percentAssigned: number;
      };

      if (data.success) {
        setAvailableCountries(data.countries);
        setCycleInfo({
          currentCycle: data.currentCycle,
          totalCountries: data.totalCountries,
          assignedCount: data.assignedCount,
          percentAssigned: data.percentAssigned,
        });
      } else {
        setFetchError(intl.formatMessage({
          id: 'chatter.countries.fetchError',
          defaultMessage: 'Impossible de charger les pays disponibles'
        }));
      }
    } catch (err) {
      console.error('Error fetching countries:', err);
      setFetchError(intl.formatMessage({
        id: 'chatter.countries.fetchError',
        defaultMessage: 'Impossible de charger les pays disponibles'
      }));
    } finally {
      setLoadingCountries(false);
    }
  }, [intl]);

  useEffect(() => {
    fetchAvailableCountries();
  }, [fetchAvailableCountries]);

  // Filter countries by search (accent-insensitive)
  const filteredCountries = availableCountries.filter(country => {
    const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const query = strip(searchQuery);
    return strip(country.name).includes(query) || country.code.toLowerCase().includes(query);
  });

  // Toggle country selection
  const toggleCountry = (code: string) => {
    setSelectedCountries(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      }
      if (prev.length >= maxSelection) {
        return prev;
      }
      return [...prev, code];
    });
  };

  // Handle submit
  const handleSubmit = async () => {
    if (selectedCountries.length < minSelection || selectedCountries.length > maxSelection) {
      return;
    }
    await onSubmit(selectedCountries);
  };

  // Get country emoji flag
  const getFlag = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  if (loadingCountries) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          <FormattedMessage id="chatter.countries.loading" defaultMessage="Chargement des pays..." />
        </p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 dark:text-red-400 mb-4">{fetchError}</p>
        <button
          onClick={fetchAvailableCountries}
          className={`${UI.button.secondary} px-6 py-3 flex items-center gap-2`}
        >
          <RefreshCw className="w-4 h-4" />
          <FormattedMessage id="chatter.countries.retry" defaultMessage="Réessayer" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className={`${UI.card} p-4`}>
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm dark:text-gray-300">
              <FormattedMessage
                id="chatter.countries.info"
                defaultMessage="Sélectionnez de {min} à {max} pays où vous souhaitez interagir avec les clients. Une fois un pays sélectionné dans un cycle, il ne sera plus disponible jusqu'au prochain cycle."
                values={{ min: minSelection, max: maxSelection }}
              />
            </p>
            {cycleInfo && (
              <p className="text-xs dark:text-gray-400 mt-2">
                <FormattedMessage
                  id="chatter.countries.cycleInfo"
                  defaultMessage="Cycle actuel: {cycle} • {available} pays disponibles sur {total} ({percent}% assignés)"
                  values={{
                    cycle: cycleInfo.currentCycle,
                    available: cycleInfo.totalCountries - cycleInfo.assignedCount,
                    total: cycleInfo.totalCountries,
                    percent: cycleInfo.percentAssigned.toFixed(1)
                  }}
                />
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`${UI.input} pl-10`}
          placeholder={intl.formatMessage({
            id: 'chatter.countries.search',
            defaultMessage: 'Rechercher un pays...'
          })}
        />
      </div>

      {/* Selected Countries Summary */}
      {selectedCountries.length > 0 && (
        <div className={`${UI.card} p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="text-sm dark:text-gray-300 font-medium">
              <FormattedMessage
                id="chatter.countries.selected"
                defaultMessage="Pays sélectionnés ({count}/{max})"
                values={{ count: selectedCountries.length, max: maxSelection }}
              />
            </span>
          </div>
          <div className="flex gap-2">
            {selectedCountries.map(code => {
              const country = availableCountries.find(c => c.code === code);
              return (
                <button
                  key={code}
                  onClick={() => toggleCountry(code)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                  <span>{getFlag(code)}</span>
                  <span>{country?.name || code}</span>
                  <span className="text-white/70">×</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Country Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2">
        {filteredCountries.length === 0 ? (
          <div className="col-span-full py-8 text-center dark:text-gray-400">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>
              <FormattedMessage
                id="chatter.countries.noResults"
                defaultMessage="Aucun pays trouvé"
              />
            </p>
          </div>
        ) : (
          filteredCountries.map(country => {
            const isSelected = selectedCountries.includes(country.code);
            const isDisabled = !isSelected && selectedCountries.length >= maxSelection;

            return (
              <button
                key={country.code}
                onClick={() => toggleCountry(country.code)}
                disabled={isDisabled}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                  ${isSelected
                    ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500 dark:border-red-400'
                    : 'bg-white/50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-red-300 dark:hover:border-red-500/50'
                  }
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <span className="text-2xl">{getFlag(country.code)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isSelected ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {country.name}
                  </p>
                  <p className="text-xs dark:text-gray-400">
                    {country.code}
                    {country.timesAssigned > 0 && (
                      <span className="ml-1">
                        • <FormattedMessage
                          id="chatter.countries.timesAssigned"
                          defaultMessage="{count}x assigné"
                          values={{ count: country.timesAssigned }}
                        />
                      </span>
                    )}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={loading || selectedCountries.length < minSelection || selectedCountries.length > maxSelection}
        className={`${UI.button.primary} w-full py-4 flex items-center justify-center gap-2`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <FormattedMessage id="chatter.countries.submitting" defaultMessage="Enregistrement..." />
          </>
        ) : (
          <>
            <Check className="w-5 h-5" />
            <FormattedMessage
              id="chatter.countries.submit"
              defaultMessage="Confirmer ma sélection ({count} pays)"
              values={{ count: selectedCountries.length }}
            />
          </>
        )}
      </button>

      {/* Validation Hint */}
      {selectedCountries.length < minSelection && (
        <p className="text-sm dark:text-red-400">
          <FormattedMessage
            id="chatter.countries.minHint"
            defaultMessage="Sélectionnez au moins {min} pays"
            values={{ min: minSelection }}
          />
        </p>
      )}
    </div>
  );
};

export default ChatterCountrySelector;
