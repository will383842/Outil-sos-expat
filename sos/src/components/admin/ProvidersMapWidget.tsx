// src/components/admin/ProvidersMapWidget.tsx
// Widget carte géographique des prestataires par pays/région
// =============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Globe,
  Users,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// Types
interface ProviderLocation {
  country: string;
  city?: string;
  total: number;
  online: number;
  offline: number;
  busy: number;
  lawyers: number;
  expats: number;
}

interface ProvidersMapWidgetProps {
  compact?: boolean;
}

// Mapping des codes pays vers noms et coordonnées (pour future intégration carte)
const COUNTRY_DATA: Record<string, { name: string; flag: string }> = {
  'France': { name: 'France', flag: '🇫🇷' },
  'FR': { name: 'France', flag: '🇫🇷' },
  'Germany': { name: 'Allemagne', flag: '🇩🇪' },
  'DE': { name: 'Allemagne', flag: '🇩🇪' },
  'Spain': { name: 'Espagne', flag: '🇪🇸' },
  'ES': { name: 'Espagne', flag: '🇪🇸' },
  'Italy': { name: 'Italie', flag: '🇮🇹' },
  'IT': { name: 'Italie', flag: '🇮🇹' },
  'United Kingdom': { name: 'Royaume-Uni', flag: '🇬🇧' },
  'GB': { name: 'Royaume-Uni', flag: '🇬🇧' },
  'UK': { name: 'Royaume-Uni', flag: '🇬🇧' },
  'Portugal': { name: 'Portugal', flag: '🇵🇹' },
  'PT': { name: 'Portugal', flag: '🇵🇹' },
  'Belgium': { name: 'Belgique', flag: '🇧🇪' },
  'BE': { name: 'Belgique', flag: '🇧🇪' },
  'Switzerland': { name: 'Suisse', flag: '🇨🇭' },
  'CH': { name: 'Suisse', flag: '🇨🇭' },
  'Netherlands': { name: 'Pays-Bas', flag: '🇳🇱' },
  'NL': { name: 'Pays-Bas', flag: '🇳🇱' },
  'Austria': { name: 'Autriche', flag: '🇦🇹' },
  'AT': { name: 'Autriche', flag: '🇦🇹' },
  'Morocco': { name: 'Maroc', flag: '🇲🇦' },
  'MA': { name: 'Maroc', flag: '🇲🇦' },
  'Tunisia': { name: 'Tunisie', flag: '🇹🇳' },
  'TN': { name: 'Tunisie', flag: '🇹🇳' },
  'Algeria': { name: 'Algérie', flag: '🇩🇿' },
  'DZ': { name: 'Algérie', flag: '🇩🇿' },
  'Senegal': { name: 'Sénégal', flag: '🇸🇳' },
  'SN': { name: 'Sénégal', flag: '🇸🇳' },
  'Ivory Coast': { name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  'CI': { name: 'Côte d\'Ivoire', flag: '🇨🇮' },
  'United States': { name: 'États-Unis', flag: '🇺🇸' },
  'US': { name: 'États-Unis', flag: '🇺🇸' },
  'USA': { name: 'États-Unis', flag: '🇺🇸' },
  'Canada': { name: 'Canada', flag: '🇨🇦' },
  'CA': { name: 'Canada', flag: '🇨🇦' },
  'Brazil': { name: 'Brésil', flag: '🇧🇷' },
  'BR': { name: 'Brésil', flag: '🇧🇷' },
  'India': { name: 'Inde', flag: '🇮🇳' },
  'IN': { name: 'Inde', flag: '🇮🇳' },
  'China': { name: 'Chine', flag: '🇨🇳' },
  'CN': { name: 'Chine', flag: '🇨🇳' },
  'Japan': { name: 'Japon', flag: '🇯🇵' },
  'JP': { name: 'Japon', flag: '🇯🇵' },
  'Australia': { name: 'Australie', flag: '🇦🇺' },
  'AU': { name: 'Australie', flag: '🇦🇺' },
  'Russia': { name: 'Russie', flag: '🇷🇺' },
  'RU': { name: 'Russie', flag: '🇷🇺' },
  'Unknown': { name: 'Inconnu', flag: '🌍' },
};

const getCountryInfo = (country: string | undefined): { name: string; flag: string } => {
  if (!country) return { name: 'Inconnu', flag: '🌍' };
  return COUNTRY_DATA[country] || { name: country, flag: '🌍' };
};

const ProvidersMapWidget: React.FC<ProvidersMapWidgetProps> = ({ compact = false }) => {
  const [locations, setLocations] = useState<ProviderLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [sortBy, setSortBy] = useState<'total' | 'online' | 'name'>('online');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const providersQuery = query(
      collection(db, 'sos_profiles'),
      where('type', 'in', ['lawyer', 'expat'])
    );

    const unsubscribe = onSnapshot(
      providersQuery,
      (snapshot) => {
        if (!mountedRef.current) return;

        const providers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as any[];

        // Grouper par pays
        const locationMap = new Map<string, ProviderLocation>();

        providers.forEach((provider) => {
          const country = provider.country || 'Unknown';

          if (!locationMap.has(country)) {
            locationMap.set(country, {
              country,
              total: 0,
              online: 0,
              offline: 0,
              busy: 0,
              lawyers: 0,
              expats: 0,
            });
          }

          const loc = locationMap.get(country)!;
          loc.total++;

          if (provider.isOnline && provider.availability === 'available') {
            loc.online++;
          } else if (provider.isOnline && provider.availability === 'busy') {
            loc.busy++;
          } else {
            loc.offline++;
          }

          if (provider.type === 'lawyer') {
            loc.lawyers++;
          } else {
            loc.expats++;
          }
        });

        setLocations(Array.from(locationMap.values()));
        setIsLoading(false);
      },
      (error) => {
        if (!mountedRef.current) return;
        console.error('Erreur ProvidersMapWidget:', error);
        setIsLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Trier les locations
  const sortedLocations = useMemo(() => {
    return [...locations].sort((a, b) => {
      switch (sortBy) {
        case 'online':
          return (b.online + b.busy) - (a.online + a.busy);
        case 'total':
          return b.total - a.total;
        case 'name':
          return getCountryInfo(a.country).name.localeCompare(getCountryInfo(b.country).name);
        default:
          return 0;
      }
    });
  }, [locations, sortBy]);

  // Statistiques globales
  const globalStats = useMemo(() => {
    return locations.reduce(
      (acc, loc) => ({
        total: acc.total + loc.total,
        online: acc.online + loc.online,
        busy: acc.busy + loc.busy,
        offline: acc.offline + loc.offline,
        countries: acc.countries + 1,
      }),
      { total: 0, online: 0, busy: 0, offline: 0, countries: 0 }
    );
  }, [locations]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Globe className="mr-2 text-blue-600" size={20} />
            Répartition géographique
          </h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {globalStats.countries} pays | {globalStats.online + globalStats.busy} en ligne
            </span>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Stats globales */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{globalStats.countries}</div>
              <div className="text-xs text-gray-500">Pays</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{globalStats.online}</div>
              <div className="text-xs text-gray-500">En ligne</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{globalStats.busy}</div>
              <div className="text-xs text-gray-500">En appel</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">{globalStats.offline}</div>
              <div className="text-xs text-gray-500">Hors ligne</div>
            </div>
          </div>

          {/* Contrôles de tri */}
          <div className="px-4 py-2 border-b border-gray-200 flex items-center space-x-2">
            <span className="text-sm text-gray-500">Trier par:</span>
            <button
              onClick={() => setSortBy('online')}
              className={`px-3 py-1 text-xs rounded-full ${
                sortBy === 'online'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              En ligne
            </button>
            <button
              onClick={() => setSortBy('total')}
              className={`px-3 py-1 text-xs rounded-full ${
                sortBy === 'total'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1 text-xs rounded-full ${
                sortBy === 'name'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Nom
            </button>
          </div>

          {/* Liste des pays */}
          <div className="max-h-80 overflow-y-auto">
            {sortedLocations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MapPin className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>Aucun prestataire trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sortedLocations.map((location) => {
                  const countryInfo = getCountryInfo(location.country);
                  const onlinePercent = location.total > 0
                    ? Math.round(((location.online + location.busy) / location.total) * 100)
                    : 0;

                  return (
                    <div
                      key={location.country}
                      className="px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{countryInfo.flag}</span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {countryInfo.name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-2">
                              <span>{location.lawyers} avocat(s)</span>
                              <span>•</span>
                              <span>{location.expats} expatrié(s)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {/* Barre de progression */}
                          <div className="w-24 hidden sm:block">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                                style={{ width: `${onlinePercent}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 text-center mt-1">
                              {onlinePercent}% actifs
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="flex items-center text-green-600">
                              <Wifi size={14} className="mr-1" />
                              {location.online}
                            </span>
                            {location.busy > 0 && (
                              <span className="flex items-center text-orange-600">
                                <Users size={14} className="mr-1" />
                                {location.busy}
                              </span>
                            )}
                            <span className="flex items-center text-gray-400">
                              <WifiOff size={14} className="mr-1" />
                              {location.offline}
                            </span>
                          </div>

                          {/* Total */}
                          <div className="bg-gray-100 px-3 py-1 rounded-full">
                            <span className="font-medium text-gray-700">{location.total}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer avec visualisation */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                <TrendingUp size={14} className="inline mr-1" />
                Top: {sortedLocations[0]?.country && getCountryInfo(sortedLocations[0].country).name}
              </span>
              <span>
                Mise à jour en temps réel
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProvidersMapWidget;
