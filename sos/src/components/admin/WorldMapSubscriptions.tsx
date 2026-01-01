/**
 * WorldMapSubscriptions - Carte mondiale interactive des abonnements
 * Visualisation par pays avec différentes métriques
 */

import React, { useState, useMemo } from 'react';
import { cn } from '../../utils/cn';
import {
  Globe,
  Users,
  DollarSign,
  Scale,
  Briefcase,
  TrendingUp,
  Info,
  X
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface CountryData {
  code: string;
  name: string;
  subscriptions: number;
  mrrEur: number;
  lawyers: number;
  expats: number;
  trials: number;
  active: number;
}

type MetricType = 'subscriptions' | 'mrr' | 'lawyers' | 'expats' | 'trials';

interface WorldMapSubscriptionsProps {
  data: CountryData[];
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const METRICS: { id: MetricType; label: string; icon: React.ReactNode; color: string; suffix: string }[] = [
  { id: 'subscriptions', label: 'Abonnements', icon: <Users className="w-4 h-4" />, color: 'indigo', suffix: '' },
  { id: 'mrr', label: 'MRR', icon: <DollarSign className="w-4 h-4" />, color: 'emerald', suffix: '€' },
  { id: 'lawyers', label: 'Avocats', icon: <Scale className="w-4 h-4" />, color: 'red', suffix: '' },
  { id: 'expats', label: 'Expatriés', icon: <Briefcase className="w-4 h-4" />, color: 'blue', suffix: '' },
  { id: 'trials', label: 'Essais', icon: <TrendingUp className="w-4 h-4" />, color: 'amber', suffix: '' },
];

// Simplified world map paths (ISO 3166-1 alpha-2 codes)
// This is a simplified version - in production you'd use a proper GeoJSON
const COUNTRY_PATHS: Record<string, { path: string; cx: number; cy: number }> = {
  // Europe
  FR: { path: 'M480,180 L500,175 L510,190 L505,210 L485,215 L470,200 Z', cx: 490, cy: 195 },
  DE: { path: 'M510,165 L530,160 L540,180 L530,195 L510,190 Z', cx: 520, cy: 177 },
  GB: { path: 'M455,155 L475,150 L480,170 L465,180 L450,170 Z', cx: 465, cy: 165 },
  ES: { path: 'M450,210 L485,205 L490,235 L455,240 L445,225 Z', cx: 467, cy: 222 },
  IT: { path: 'M515,200 L535,195 L545,230 L525,245 L510,220 Z', cx: 525, cy: 217 },
  PT: { path: 'M435,215 L450,210 L455,235 L440,240 Z', cx: 445, cy: 225 },
  BE: { path: 'M490,170 L505,168 L507,180 L492,182 Z', cx: 498, cy: 175 },
  NL: { path: 'M495,158 L510,155 L512,168 L497,170 Z', cx: 503, cy: 162 },
  CH: { path: 'M505,190 L520,188 L522,200 L507,202 Z', cx: 513, cy: 195 },
  AT: { path: 'M530,185 L550,183 L552,198 L532,200 Z', cx: 541, cy: 191 },
  PL: { path: 'M545,160 L575,155 L580,180 L550,185 Z', cx: 562, cy: 170 },
  SE: { path: 'M530,100 L550,95 L555,145 L535,150 Z', cx: 542, cy: 122 },
  NO: { path: 'M510,85 L530,80 L535,130 L515,135 Z', cx: 522, cy: 107 },
  DK: { path: 'M510,145 L525,142 L527,158 L512,160 Z', cx: 518, cy: 151 },
  FI: { path: 'M565,90 L590,85 L595,130 L570,135 Z', cx: 580, cy: 107 },
  IE: { path: 'M435,160 L455,155 L458,175 L438,180 Z', cx: 446, cy: 167 },
  GR: { path: 'M555,220 L575,215 L580,245 L560,250 Z', cx: 567, cy: 232 },
  CZ: { path: 'M535,175 L555,172 L557,188 L537,190 Z', cx: 546, cy: 181 },
  RO: { path: 'M565,195 L595,190 L600,215 L570,220 Z', cx: 582, cy: 205 },
  HU: { path: 'M545,190 L565,187 L568,205 L548,208 Z', cx: 556, cy: 197 },

  // North America
  US: { path: 'M120,180 L280,170 L290,260 L130,270 Z', cx: 200, cy: 220 },
  CA: { path: 'M100,100 L300,90 L310,170 L110,180 Z', cx: 200, cy: 135 },
  MX: { path: 'M130,270 L200,265 L210,320 L140,325 Z', cx: 170, cy: 295 },

  // South America
  BR: { path: 'M250,340 L340,330 L350,450 L260,460 Z', cx: 300, cy: 395 },
  AR: { path: 'M240,450 L290,445 L295,550 L245,555 Z', cx: 267, cy: 500 },
  CL: { path: 'M225,450 L240,448 L245,560 L230,562 Z', cx: 235, cy: 505 },
  CO: { path: 'M220,320 L260,315 L265,370 L225,375 Z', cx: 242, cy: 345 },
  PE: { path: 'M210,370 L250,365 L255,420 L215,425 Z', cx: 232, cy: 395 },

  // Africa
  MA: { path: 'M445,245 L480,240 L485,280 L450,285 Z', cx: 465, cy: 262 },
  DZ: { path: 'M480,240 L530,235 L535,290 L485,295 Z', cx: 507, cy: 265 },
  TN: { path: 'M520,235 L540,232 L542,260 L522,263 Z', cx: 531, cy: 247 },
  EG: { path: 'M555,255 L595,250 L600,300 L560,305 Z', cx: 577, cy: 277 },
  NG: { path: 'M495,330 L535,325 L540,370 L500,375 Z', cx: 517, cy: 350 },
  ZA: { path: 'M540,450 L590,445 L595,510 L545,515 Z', cx: 567, cy: 480 },
  KE: { path: 'M580,360 L610,355 L615,400 L585,405 Z', cx: 597, cy: 380 },
  SN: { path: 'M420,320 L445,317 L448,345 L423,348 Z', cx: 434, cy: 332 },
  CI: { path: 'M455,340 L480,337 L483,370 L458,373 Z', cx: 469, cy: 355 },

  // Middle East
  AE: { path: 'M640,280 L670,277 L673,305 L643,308 Z', cx: 656, cy: 292 },
  SA: { path: 'M600,270 L660,265 L665,330 L605,335 Z', cx: 632, cy: 300 },
  IL: { path: 'M575,260 L590,258 L592,285 L577,287 Z', cx: 583, cy: 272 },
  TR: { path: 'M565,205 L620,200 L625,230 L570,235 Z', cx: 595, cy: 217 },

  // Asia
  IN: { path: 'M680,270 L740,265 L750,360 L690,365 Z', cx: 715, cy: 315 },
  CN: { path: 'M720,180 L820,170 L830,280 L730,290 Z', cx: 775, cy: 225 },
  JP: { path: 'M840,200 L870,195 L875,250 L845,255 Z', cx: 857, cy: 225 },
  KR: { path: 'M825,210 L845,207 L848,240 L828,243 Z', cx: 836, cy: 225 },
  SG: { path: 'M755,355 L770,353 L772,368 L757,370 Z', cx: 763, cy: 361 },
  HK: { path: 'M795,285 L810,283 L812,298 L797,300 Z', cx: 803, cy: 291 },
  TH: { path: 'M755,300 L780,297 L783,345 L758,348 Z', cx: 769, cy: 322 },
  VN: { path: 'M780,290 L800,287 L803,350 L783,353 Z', cx: 791, cy: 320 },
  ID: { path: 'M760,370 L840,365 L845,400 L765,405 Z', cx: 802, cy: 385 },
  PH: { path: 'M810,310 L835,307 L838,360 L813,363 Z', cx: 824, cy: 335 },
  MY: { path: 'M755,345 L790,342 L793,370 L758,373 Z', cx: 774, cy: 357 },

  // Oceania
  AU: { path: 'M780,430 L880,420 L890,520 L790,530 Z', cx: 835, cy: 475 },
  NZ: { path: 'M900,510 L930,505 L935,560 L905,565 Z', cx: 917, cy: 535 },

  // Russia & Central Asia
  RU: { path: 'M580,80 L850,70 L860,170 L590,180 Z', cx: 720, cy: 125 },
};

// Country names in French
const COUNTRY_NAMES_FR: Record<string, string> = {
  FR: 'France', DE: 'Allemagne', GB: 'Royaume-Uni', ES: 'Espagne', IT: 'Italie',
  PT: 'Portugal', BE: 'Belgique', NL: 'Pays-Bas', CH: 'Suisse', AT: 'Autriche',
  PL: 'Pologne', SE: 'Suède', NO: 'Norvège', DK: 'Danemark', FI: 'Finlande',
  IE: 'Irlande', GR: 'Grèce', CZ: 'Tchéquie', RO: 'Roumanie', HU: 'Hongrie',
  US: 'États-Unis', CA: 'Canada', MX: 'Mexique',
  BR: 'Brésil', AR: 'Argentine', CL: 'Chili', CO: 'Colombie', PE: 'Pérou',
  MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie', EG: 'Égypte', NG: 'Nigeria',
  ZA: 'Afrique du Sud', KE: 'Kenya', SN: 'Sénégal', CI: 'Côte d\'Ivoire',
  AE: 'Émirats Arabes Unis', SA: 'Arabie Saoudite', IL: 'Israël', TR: 'Turquie',
  IN: 'Inde', CN: 'Chine', JP: 'Japon', KR: 'Corée du Sud', SG: 'Singapour',
  HK: 'Hong Kong', TH: 'Thaïlande', VN: 'Vietnam', ID: 'Indonésie', PH: 'Philippines',
  MY: 'Malaisie', AU: 'Australie', NZ: 'Nouvelle-Zélande', RU: 'Russie'
};

// ============================================================================
// COMPONENT
// ============================================================================

export const WorldMapSubscriptions: React.FC<WorldMapSubscriptionsProps> = ({
  data,
  className
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('subscriptions');
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);

  // Create a map of country code to data
  const countryDataMap = useMemo(() => {
    const map = new Map<string, CountryData>();
    data.forEach(d => map.set(d.code, d));
    return map;
  }, [data]);

  // Get max value for color scaling
  const maxValue = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => {
      switch (selectedMetric) {
        case 'subscriptions': return d.subscriptions;
        case 'mrr': return d.mrrEur;
        case 'lawyers': return d.lawyers;
        case 'expats': return d.expats;
        case 'trials': return d.trials;
        default: return 0;
      }
    }));
  }, [data, selectedMetric]);

  // Get value for a country
  const getValue = (countryCode: string): number => {
    const countryData = countryDataMap.get(countryCode);
    if (!countryData) return 0;
    switch (selectedMetric) {
      case 'subscriptions': return countryData.subscriptions;
      case 'mrr': return countryData.mrrEur;
      case 'lawyers': return countryData.lawyers;
      case 'expats': return countryData.expats;
      case 'trials': return countryData.trials;
      default: return 0;
    }
  };

  // Get color intensity based on value
  const _getColorIntensity = (value: number): string => {
    if (value === 0) return 'fill-gray-200';
    const ratio = value / maxValue;
    const metric = METRICS.find(m => m.id === selectedMetric);
    const color = metric?.color || 'indigo';

    if (ratio > 0.8) return `fill-${color}-700`;
    if (ratio > 0.6) return `fill-${color}-600`;
    if (ratio > 0.4) return `fill-${color}-500`;
    if (ratio > 0.2) return `fill-${color}-400`;
    return `fill-${color}-300`;
  };

  // Get inline style for color (fallback for dynamic colors)
  const getColorStyle = (value: number): React.CSSProperties => {
    if (value === 0) return { fill: '#e5e7eb' };
    const ratio = value / maxValue;
    const metric = METRICS.find(m => m.id === selectedMetric);

    const colorMaps: Record<string, string[]> = {
      indigo: ['#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5'],
      emerald: ['#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669'],
      red: ['#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626'],
      blue: ['#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb'],
      amber: ['#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706'],
    };

    const colors = colorMaps[metric?.color || 'indigo'];
    const index = Math.min(Math.floor(ratio * 5), 4);
    return { fill: colors[index] };
  };

  const currentMetric = METRICS.find(m => m.id === selectedMetric)!;

  // Top countries for the selected metric
  const topCountries = useMemo(() => {
    return [...data]
      .sort((a, b) => {
        const aVal = getValue(a.code);
        const bVal = getValue(b.code);
        return bVal - aVal;
      })
      .slice(0, 10);
  }, [data, selectedMetric]);

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Vue mondiale des abonnements
          </h3>
        </div>

        {/* Metric Selector */}
        <div className="flex flex-wrap gap-2">
          {METRICS.map(metric => (
            <button
              key={metric.id}
              onClick={() => setSelectedMetric(metric.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors',
                selectedMetric === metric.id
                  ? `bg-${metric.color}-100 text-${metric.color}-700 ring-2 ring-${metric.color}-500`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
              style={selectedMetric === metric.id ? {
                backgroundColor: metric.color === 'indigo' ? '#e0e7ff' :
                                 metric.color === 'emerald' ? '#d1fae5' :
                                 metric.color === 'red' ? '#fee2e2' :
                                 metric.color === 'blue' ? '#dbeafe' :
                                 '#fef3c7',
                color: metric.color === 'indigo' ? '#4338ca' :
                       metric.color === 'emerald' ? '#047857' :
                       metric.color === 'red' ? '#b91c1c' :
                       metric.color === 'blue' ? '#1d4ed8' :
                       '#b45309'
              } : undefined}
            >
              {metric.icon}
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Map */}
        <div className="flex-1 p-4 min-h-[400px] relative">
          <svg
            viewBox="0 0 960 600"
            className="w-full h-full"
            style={{ maxHeight: '500px' }}
          >
            {/* Background */}
            <rect x="0" y="0" width="960" height="600" fill="#f8fafc" />

            {/* Ocean */}
            <rect x="0" y="0" width="960" height="600" fill="#e0f2fe" opacity="0.5" />

            {/* Countries */}
            {Object.entries(COUNTRY_PATHS).map(([code, { path }]) => {
              const value = getValue(code);
              const isHovered = hoveredCountry === code;
              const hasData = value > 0;

              return (
                <g key={code}>
                  <path
                    d={path}
                    style={getColorStyle(value)}
                    stroke={isHovered ? '#1f2937' : '#9ca3af'}
                    strokeWidth={isHovered ? 2 : 0.5}
                    className={cn(
                      'transition-all duration-200 cursor-pointer',
                      hasData && 'hover:opacity-80'
                    )}
                    onMouseEnter={() => setHoveredCountry(code)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    onClick={() => {
                      const countryData = countryDataMap.get(code);
                      if (countryData) setSelectedCountry(countryData);
                    }}
                  />
                </g>
              );
            })}

            {/* Labels for countries with data */}
            {Object.entries(COUNTRY_PATHS).map(([code, { cx, cy }]) => {
              const value = getValue(code);
              if (value === 0) return null;

              return (
                <g key={`label-${code}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={Math.max(8, Math.min(20, 8 + (value / maxValue) * 12))}
                    fill="white"
                    stroke={currentMetric.color === 'indigo' ? '#4f46e5' :
                            currentMetric.color === 'emerald' ? '#10b981' :
                            currentMetric.color === 'red' ? '#ef4444' :
                            currentMetric.color === 'blue' ? '#3b82f6' :
                            '#f59e0b'}
                    strokeWidth="2"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredCountry(code)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    onClick={() => {
                      const countryData = countryDataMap.get(code);
                      if (countryData) setSelectedCountry(countryData);
                    }}
                  />
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="bold"
                    fill="#1f2937"
                    className="pointer-events-none"
                  >
                    {value > 999 ? `${(value/1000).toFixed(1)}k` : value}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover Tooltip */}
          {hoveredCountry && countryDataMap.get(hoveredCountry) && (
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-10">
              <div className="font-semibold text-gray-900">
                {COUNTRY_NAMES_FR[hoveredCountry] || hoveredCountry}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {currentMetric.label}: {getValue(hoveredCountry).toLocaleString()}{currentMetric.suffix}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 rounded-lg p-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Intensité:</span>
              <div className="flex">
                {[0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
                  <div
                    key={i}
                    className="w-6 h-4"
                    style={getColorStyle(ratio * maxValue)}
                  />
                ))}
              </div>
              <span className="text-gray-500">Max: {maxValue.toLocaleString()}{currentMetric.suffix}</span>
            </div>
          </div>
        </div>

        {/* Side Panel - Top Countries */}
        <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Top 10 pays - {currentMetric.label}
          </h4>

          <div className="space-y-2">
            {topCountries.map((country, index) => {
              const value = getValue(country.code);
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

              return (
                <div
                  key={country.code}
                  className="cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
                  onClick={() => setSelectedCountry(country)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-4">{index + 1}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {COUNTRY_NAMES_FR[country.code] || country.code}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {value.toLocaleString()}{currentMetric.suffix}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: currentMetric.color === 'indigo' ? '#6366f1' :
                                        currentMetric.color === 'emerald' ? '#10b981' :
                                        currentMetric.color === 'red' ? '#ef4444' :
                                        currentMetric.color === 'blue' ? '#3b82f6' :
                                        '#f59e0b'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {data.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucune donnée disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Country Detail Modal */}
      {selectedCountry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-gray-900">
                {COUNTRY_NAMES_FR[selectedCountry.code] || selectedCountry.code}
              </h3>
              <button
                onClick={() => setSelectedCountry(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-lg p-3">
                  <div className="text-xs text-indigo-600 mb-1">Total Abonnements</div>
                  <div className="text-2xl font-bold text-indigo-700">{selectedCountry.subscriptions}</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <div className="text-xs text-emerald-600 mb-1">MRR</div>
                  <div className="text-2xl font-bold text-emerald-700">{selectedCountry.mrrEur.toLocaleString()}€</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-red-500" />
                    Avocats
                  </span>
                  <span className="font-semibold">{selectedCountry.lawyers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-500" />
                    Expatriés Aidants
                  </span>
                  <span className="font-semibold">{selectedCountry.expats}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    En essai
                  </span>
                  <span className="font-semibold">{selectedCountry.trials}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-500" />
                    Actifs (payants)
                  </span>
                  <span className="font-semibold">{selectedCountry.active}</span>
                </div>
              </div>

              {/* Distribution bar */}
              {selectedCountry.subscriptions > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Répartition</div>
                  <div className="h-3 rounded-full overflow-hidden flex">
                    <div
                      className="bg-red-500"
                      style={{ width: `${(selectedCountry.lawyers / selectedCountry.subscriptions) * 100}%` }}
                      title="Avocats"
                    />
                    <div
                      className="bg-blue-500"
                      style={{ width: `${(selectedCountry.expats / selectedCountry.subscriptions) * 100}%` }}
                      title="Expatriés"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Avocats: {((selectedCountry.lawyers / selectedCountry.subscriptions) * 100).toFixed(0)}%</span>
                    <span>Expatriés: {((selectedCountry.expats / selectedCountry.subscriptions) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setSelectedCountry(null)}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldMapSubscriptions;
