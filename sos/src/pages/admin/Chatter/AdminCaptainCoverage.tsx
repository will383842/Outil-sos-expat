/**
 * AdminCaptainCoverage - Global coverage matrix for Captain Chatters
 * Shows which countries have captains assigned (explicit + own country)
 * Shows language coverage across captains
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from "@/config/firebase";
import toast from 'react-hot-toast';
import {
  Globe,
  Crown,
  Languages,
  Loader2,
  RefreshCw,
  Search,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
};

interface CoverageCaptain {
  id: string;
  firstName: string;
  lastName: string;
  country: string;
  assignedCountries: string[];
  assignedLanguages: string[];
  n1Count: number;
  monthlyTeamCalls: number;
}

interface CoverageData {
  captains: CoverageCaptain[];
  countryMap: Record<string, Array<{ id: string; firstName: string; lastName: string; country: string }>>;
  languageMap: Record<string, Array<{ id: string; firstName: string; lastName: string }>>;
  totalCaptains: number;
  coveredCountries: number;
  coveredLanguages: number;
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Francais', en: 'English', es: 'Espanol', de: 'Deutsch',
  pt: 'Portugues', ru: 'Russkij', ar: 'Arabi', zh: 'Zhongwen', hi: 'Hindi',
};

const AdminCaptainCoverage: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'countries' | 'languages'>('countries');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<void, CoverageData>(functionsAffiliate, 'adminGetCaptainCoverageMap');
      const result = await fn();
      setData(result.data);
    } catch (err: any) {
      console.error('Coverage map error:', err);
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter countries by search
  const filteredCountries = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data.countryMap);
    if (!search.trim()) return entries.sort((a, b) => b[1].length - a[1].length);
    const q = search.toLowerCase();
    return entries.filter(([cc]) => cc.toLowerCase().includes(q)).sort((a, b) => b[1].length - a[1].length);
  }, [data, search]);

  // Filter languages
  const filteredLanguages = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.languageMap).sort((a, b) => b[1].length - a[1].length);
  }, [data]);

  // Uncovered captains (no assigned countries)
  const uncoveredCaptains = useMemo(() => {
    if (!data) return [];
    return data.captains.filter(c => c.assignedCountries.length === 0);
  }, [data]);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/admin/chatters/captains')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <FormattedMessage id="admin.captainCoverage.back" defaultMessage="Retour aux capitaines" />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-6 h-6 text-blue-500" />
              <FormattedMessage id="admin.captainCoverage.title" defaultMessage="Couverture mondiale Capitaines" />
            </h1>
          </div>
          <button onClick={fetchData} className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`${UI.card} p-4 text-center`}>
              <Crown className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-gray-900 dark:text-white">{data.totalCaptains}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.captainCoverage.totalCaptains" defaultMessage="Capitaines" />
              </p>
            </div>
            <div className={`${UI.card} p-4 text-center`}>
              <Globe className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-gray-900 dark:text-white">{data.coveredCountries}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.captainCoverage.coveredCountries" defaultMessage="Pays couverts" />
              </p>
            </div>
            <div className={`${UI.card} p-4 text-center`}>
              <Languages className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-gray-900 dark:text-white">{data.coveredLanguages}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.captainCoverage.coveredLanguages" defaultMessage="Langues couvertes" />
              </p>
            </div>
            <div className={`${UI.card} p-4 text-center`}>
              <Users className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{uncoveredCaptains.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="admin.captainCoverage.unassigned" defaultMessage="Non assignes" />
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className={`${UI.card} p-6 text-center`}>
            <p className="text-red-500">{error}</p>
          </div>
        ) : data && (
          <>
            {/* Tab selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setTab('countries')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === 'countries'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Globe className="w-4 h-4 inline mr-1.5" />
                <FormattedMessage id="admin.captainCoverage.tab.countries" defaultMessage="Par pays" />
                <span className="ml-1.5 text-xs opacity-70">({data.coveredCountries})</span>
              </button>
              <button
                onClick={() => setTab('languages')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === 'languages'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                }`}
              >
                <Languages className="w-4 h-4 inline mr-1.5" />
                <FormattedMessage id="admin.captainCoverage.tab.languages" defaultMessage="Par langue" />
                <span className="ml-1.5 text-xs opacity-70">({data.coveredLanguages})</span>
              </button>
            </div>

            {tab === 'countries' && (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'admin.captainCoverage.searchCountry', defaultMessage: 'Filtrer par code pays...' })}
                    className="w-full pl-10 pr-3 py-2 text-sm bg-white/80 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Country Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredCountries.map(([cc, captains]) => (
                    <div key={cc} className={`${UI.card} p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getFlagEmoji(cc)}</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{cc}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          captains.length > 0
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        }`}>
                          {captains.length > 0 ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {captains.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {captains.map(cap => (
                          <button
                            key={cap.id}
                            onClick={() => navigate(`/admin/chatters/captains/${cap.id}`)}
                            className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-xs transition-colors"
                          >
                            <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300 truncate">
                              {cap.firstName} {cap.lastName}
                            </span>
                            {cap.country && cap.country !== cc && (
                              <span className="text-gray-400 ml-auto flex-shrink-0">{getFlagEmoji(cap.country)}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'languages' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredLanguages.map(([lang, captains]) => (
                  <div key={lang} className={`${UI.card} p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {LANGUAGE_LABELS[lang] || lang}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400">
                        {captains.length} cap.
                      </span>
                    </div>
                    <div className="space-y-1">
                      {captains.map(cap => (
                        <button
                          key={cap.id}
                          onClick={() => navigate(`/admin/chatters/captains/${cap.id}`)}
                          className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-xs transition-colors"
                        >
                          <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300 truncate">
                            {cap.firstName} {cap.lastName}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unassigned Captains */}
            {uncoveredCaptains.length > 0 && (
              <div className={`${UI.card} p-4 sm:p-6`}>
                <h3 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <FormattedMessage
                    id="admin.captainCoverage.unassignedTitle"
                    defaultMessage="Capitaines sans pays assignes ({count})"
                    values={{ count: uncoveredCaptains.length }}
                  />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {uncoveredCaptains.map(cap => (
                    <button
                      key={cap.id}
                      onClick={() => navigate(`/admin/chatters/captains/${cap.id}`)}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors text-left"
                    >
                      <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {cap.firstName} {cap.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {cap.country ? `${getFlagEmoji(cap.country)} ${cap.country}` : '-'} · {cap.n1Count} N1
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCaptainCoverage;
