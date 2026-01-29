/**
 * AdminInfluencersList - Admin page for managing influencers worldwide
 * Features: Country filter, export, bulk actions, statistics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Users,
  Search,
  Filter,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Globe,
  Languages,
  DollarSign,
  UserPlus,
  X,
  Play,
  Pause,
  Mail,
  Megaphone,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
} as const;

// Countries list
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
  { code: 'AR', name: 'Argentina' }, { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' }, { code: 'BR', name: 'Brazil' }, { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' }, { code: 'CO', name: 'Colombia' },
  { code: 'CZ', name: 'Czechia' }, { code: 'DK', name: 'Denmark' }, { code: 'EG', name: 'Egypt' },
  { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' }, { code: 'HU', name: 'Hungary' }, { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' }, { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' }, { code: 'JP', name: 'Japan' }, { code: 'KE', name: 'Kenya' },
  { code: 'KR', name: 'South Korea' }, { code: 'MA', name: 'Morocco' }, { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' }, { code: 'NZ', name: 'New Zealand' }, { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' }, { code: 'PK', name: 'Pakistan' }, { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' }, { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' }, { code: 'SA', name: 'Saudi Arabia' }, { code: 'SG', name: 'Singapore' },
  { code: 'ZA', name: 'South Africa' }, { code: 'ES', name: 'Spain' }, { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' }, { code: 'TH', name: 'Thailand' }, { code: 'TR', name: 'Turkey' },
  { code: 'AE', name: 'UAE' }, { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' },
  { code: 'VN', name: 'Vietnam' },
].sort((a, b) => a.name.localeCompare(b.name));

// Supported languages
const LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ru', name: 'Русский' },
  { code: 'pt', name: 'Português' },
  { code: 'ch', name: '中文' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
];

interface Influencer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  totalEarned: number;
  totalClientsReferred: number;
  totalProvidersRecruited: number;
  country?: string;
  language?: string;
  platforms?: string[];
  communitySize?: number;
  createdAt: string;
}

interface InfluencerListResponse {
  influencers: Influencer[];
  total: number;
  page: number;
  limit: number;
  stats?: {
    totalActive: number;
    totalSuspended: number;
    totalEarnings: number;
    newThisMonth: number;
  };
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'banned';

const AdminInfluencersList: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const functions = getFunctions(undefined, 'europe-west1');

  // State
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<InfluencerListResponse['stats']>();

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  const limit = 20;

  // Fetch influencers
  const fetchInfluencers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetInfluencersList = httpsCallable<any, InfluencerListResponse>(
        functions,
        'adminGetInfluencersList'
      );

      const result = await adminGetInfluencersList({
        offset: (page - 1) * limit, // Convert page to offset for backend
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        country: countryFilter === 'all' ? undefined : countryFilter,
        language: languageFilter === 'all' ? undefined : languageFilter,
        search: searchQuery || undefined,
        includeStats: page === 1,
      });

      setInfluencers(result.data.influencers);
      setTotal(result.data.total);
      if (result.data.stats) {
        setStats(result.data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching influencers:', err);
      setError(err.message || 'Failed to load influencers');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, countryFilter, languageFilter, searchQuery, functions]);

  useEffect(() => {
    fetchInfluencers();
  }, [page, statusFilter, countryFilter, languageFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchInfluencers();
      } else {
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Format amount
  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'suspended':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'banned':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'suspended':
        return <Clock className="w-4 h-4" />;
      case 'banned':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Get country name
  const getCountryName = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country?.name || code;
  };

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const adminExportInfluencers = httpsCallable<any, { csv: string }>(
        functions,
        'adminExportInfluencers'
      );

      const result = await adminExportInfluencers({
        status: statusFilter === 'all' ? undefined : statusFilter,
        country: countryFilter === 'all' ? undefined : countryFilter,
        language: languageFilter === 'all' ? undefined : languageFilter,
        search: searchQuery || undefined,
      });

      // Download CSV
      const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `influencers_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: 'suspend' | 'activate' | 'email') => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    try {
      const adminBulkInfluencerAction = httpsCallable(functions, 'adminBulkInfluencerAction');
      await adminBulkInfluencerAction({
        influencerIds: Array.from(selectedIds),
        action,
      });

      setSelectedIds(new Set());
      fetchInfluencers();
    } catch (err: any) {
      console.error('Bulk action error:', err);
      setError(err.message || 'Bulk action failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all on page
  const toggleSelectAll = () => {
    if (selectedIds.size === influencers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(influencers.map(i => i.id)));
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <Megaphone className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
              <FormattedMessage id="admin.influencers.title" defaultMessage="Gestion des Influenceurs" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.influencers.subtitle"
                defaultMessage="{count} influenceurs enregistrés"
                values={{ count: total }}
              />
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                <FormattedMessage id="admin.influencers.export" defaultMessage="Exporter CSV" />
              </span>
            </button>
            <button
              onClick={fetchInfluencers}
              className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
              </span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.influencers.stats.active" defaultMessage="Actifs" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.totalActive}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.influencers.stats.suspended" defaultMessage="Suspendus" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.totalSuspended}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.influencers.stats.newMonth" defaultMessage="Nouveaux (mois)" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.newThisMonth}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.influencers.stats.earnings" defaultMessage="Total versé" />
                  </p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                    {formatAmount(stats.totalEarnings)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={`${UI.card} p-3 sm:p-4`}>
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search Row */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.influencers.search', defaultMessage: 'Rechercher par nom, email, code...' })}
                className={`${UI.input} pl-10 text-sm sm:text-base`}
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className={`${UI.select} text-sm flex-1 sm:flex-none`}
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.influencers.filter.all', defaultMessage: 'Tous statuts' })}</option>
                  <option value="active">{intl.formatMessage({ id: 'admin.influencers.filter.active', defaultMessage: 'Actifs' })}</option>
                  <option value="suspended">{intl.formatMessage({ id: 'admin.influencers.filter.suspended', defaultMessage: 'Suspendus' })}</option>
                  <option value="banned">{intl.formatMessage({ id: 'admin.influencers.filter.banned', defaultMessage: 'Bannis' })}</option>
                </select>
              </div>

              {/* Country Filter */}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className={`${UI.select} text-sm flex-1 sm:flex-none`}
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.influencers.filter.allCountries', defaultMessage: 'Tous les pays' })}</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Language Filter */}
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <Languages className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                  className={`${UI.select} text-sm flex-1 sm:flex-none`}
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.influencers.filter.allLanguages', defaultMessage: 'Toutes langues' })}</option>
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className={`${UI.card} p-3 sm:p-4 bg-red-50 dark:bg-red-900/20`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                <FormattedMessage
                  id="admin.influencers.bulkSelected"
                  defaultMessage="{count} influenceur(s) sélectionné(s)"
                  values={{ count: selectedIds.size }}
                />
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionLoading}
                  className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                >
                  <Play className="w-4 h-4" />
                  <FormattedMessage id="admin.influencers.bulk.activate" defaultMessage="Activer" />
                </button>
                <button
                  onClick={() => handleBulkAction('suspend')}
                  disabled={bulkActionLoading}
                  className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                >
                  <Pause className="w-4 h-4" />
                  <FormattedMessage id="admin.influencers.bulk.suspend" defaultMessage="Suspendre" />
                </button>
                <button
                  onClick={() => handleBulkAction('email')}
                  disabled={bulkActionLoading}
                  className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                >
                  <Mail className="w-4 h-4" />
                  <FormattedMessage id="admin.influencers.bulk.email" defaultMessage="Envoyer email" />
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20`}>
            <p className="text-red-600 dark:text-red-400 text-sm sm:text-base">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Influencers List */}
            <div className={`${UI.card} overflow-hidden`}>
              {influencers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="admin.influencers.empty" defaultMessage="Aucun influenceur trouvé" />
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                      <tr>
                        <th className="px-3 sm:px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === influencers.length && influencers.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                          />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Influenceur
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                          <FormattedMessage id="admin.influencers.col.country" defaultMessage="Pays" />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <FormattedMessage id="admin.influencers.col.status" defaultMessage="Statut" />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                          <FormattedMessage id="admin.influencers.col.earnings" defaultMessage="Gains" />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                          <FormattedMessage id="admin.influencers.col.referrals" defaultMessage="Réf." />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {influencers.map((influencer) => (
                        <tr
                          key={influencer.id}
                          className={`hover:bg-gray-50 dark:hover:bg-white/5 ${
                            selectedIds.has(influencer.id) ? 'bg-red-50 dark:bg-red-900/10' : ''
                          }`}
                        >
                          <td className="px-3 sm:px-4 py-3 sm:py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(influencer.id)}
                              onChange={() => toggleSelection(influencer.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                            />
                          </td>
                          <td
                            className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap cursor-pointer"
                            onClick={() => navigate(`/admin/influencers/${influencer.id}`)}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                                {influencer.firstName?.[0]}{influencer.lastName?.[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                  {influencer.firstName} {influencer.lastName}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">
                                  {influencer.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg">{influencer.country ? getFlagEmoji(influencer.country) : '🌍'}</span>
                              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                {influencer.country ? getCountryName(influencer.country) : '-'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(influencer.status)}`}>
                              {getStatusIcon(influencer.status)}
                              <span className="hidden sm:inline">{influencer.status}</span>
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                            <span className="font-medium text-green-600 dark:text-green-400 text-sm">
                              {formatAmount(influencer.totalEarned)}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                            <div className="text-xs sm:text-sm">
                              <span className="text-gray-900 dark:text-white">{influencer.totalClientsReferred}</span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="text-gray-600 dark:text-gray-400">{influencer.totalProvidersRecruited}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => navigate(`/admin/influencers/${influencer.id}`)}
                              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="admin.influencers.pagination"
                    defaultMessage="Page {page} sur {total} ({count} influenceurs)"
                    values={{ page, total: totalPages, count: total }}
                  />
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    «
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <FormattedMessage id="common.previous" defaultMessage="Préc." />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <FormattedMessage id="common.next" defaultMessage="Suiv." />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

// Helper function to get country flag emoji from ISO code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default AdminInfluencersList;
