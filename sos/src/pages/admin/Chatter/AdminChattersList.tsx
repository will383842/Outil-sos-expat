/**
 * AdminChattersList - Admin page for managing chatters worldwide
 * Enhanced for international scale: 197 countries, 9 languages
 * Features: Country filter, export, bulk actions, statistics
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsWest2, functions } from "@/config/firebase";
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Filter,
  ChevronRight,
  Star,
  Flame,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Globe,
  Languages,
  TrendingUp,
  DollarSign,
  UserPlus,
  MoreVertical,
  Ban,
  Play,
  Pause,
  Mail,
  X,
  Check,
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

// Countries list (ISO 3166-1) - comprehensive list for 197+ countries
const COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' }, { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua' },
  { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' }, { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' }, { code: 'BE', name: 'Belgium' }, { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' }, { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia' }, { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' }, { code: 'CV', name: 'Cabo Verde' }, { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' }, { code: 'CA', name: 'Canada' }, { code: 'CF', name: 'Central African Rep.' },
  { code: 'TD', name: 'Chad' }, { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' }, { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'DR Congo' }, { code: 'CR', name: 'Costa Rica' }, { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czechia' }, { code: 'DK', name: 'Denmark' }, { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Rep.' }, { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' }, { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Eq. Guinea' },
  { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' }, { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' }, { code: 'FJ', name: 'Fiji' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' }, { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' }, { code: 'DE', name: 'Germany' }, { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' }, { code: 'GD', name: 'Grenada' }, { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' }, { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' }, { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' }, { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' }, { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' }, { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' }, { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' }, { code: 'KI', name: 'Kiribati' }, { code: 'KP', name: 'North Korea' },
  { code: 'KR', name: 'South Korea' }, { code: 'KW', name: 'Kuwait' }, { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' }, { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' }, { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' }, { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' }, { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' }, { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' }, { code: 'MR', name: 'Mauritania' }, { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' }, { code: 'FM', name: 'Micronesia' }, { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' }, { code: 'MN', name: 'Mongolia' }, { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' }, { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' }, { code: 'NR', name: 'Nauru' }, { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' }, { code: 'NZ', name: 'New Zealand' }, { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' }, { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' }, { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' }, { code: 'PA', name: 'Panama' }, { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' }, { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts' }, { code: 'LC', name: 'Saint Lucia' }, { code: 'VC', name: 'Saint Vincent' },
  { code: 'WS', name: 'Samoa' }, { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'São Tomé' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' }, { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' }, { code: 'ZA', name: 'South Africa' }, { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' }, { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' }, { code: 'SE', name: 'Sweden' }, { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' }, { code: 'TW', name: 'Taiwan' }, { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' }, { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' }, { code: 'TO', name: 'Tonga' }, { code: 'TT', name: 'Trinidad' },
  { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turkey' }, { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' }, { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'UAE' }, { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' }, { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican' }, { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' },
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

interface Chatter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  level: number;
  totalEarned: number;
  totalClients: number;
  totalRecruits: number;
  currentStreak: number;
  country?: string;
  language?: string;
  createdAt: string;
  isFeatured?: boolean;
  isVisible?: boolean;
}

interface ChatterListResponse {
  chatters: Chatter[];
  total: number;
  page: number;
  limit: number;
  stats?: {
    totalActive: number;
    totalPending: number;
    totalSuspended: number;
    totalEarnings: number;
    newThisMonth: number;
    topCountries: Array<{ country: string; count: number }>;
  };
}

type StatusFilter = 'all' | 'active' | 'pending' | 'quiz_required' | 'suspended' | 'banned';

const AdminChattersList: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  // State
  const [chatters, setChatters] = useState<Chatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [featuredLoading, setFeaturedLoading] = useState<string | null>(null);
  const [visibilityLoading, setVisibilityLoading] = useState<Map<string, boolean>>(new Map());

  const toggleFeatured = async (id: string, current: boolean) => {
    setFeaturedLoading(id);
    try {
      const fn = httpsCallable(functions, 'setProviderBadge');
      await fn({ providerId: id, isFeatured: !current });
      setChatters((prev) => prev.map((c) => c.id === id ? { ...c, isFeatured: !current } : c));
      toast.success(!current ? 'Badge attribué ✓' : 'Badge retiré');
    } catch {
      toast.error('Erreur lors de la mise à jour du badge');
    } finally {
      setFeaturedLoading(null);
    }
  };
  const [stats, setStats] = useState<ChatterListResponse['stats']>();

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  const limit = 20;

  // Fetch chatters
  const fetchChatters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetChattersList = httpsCallable<any, ChatterListResponse>(
        functionsWest2,
        'adminGetChattersList'
      );

      const result = await adminGetChattersList({
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        country: countryFilter === 'all' ? undefined : countryFilter,
        language: languageFilter === 'all' ? undefined : languageFilter,
        search: searchQuery || undefined,
        includeStats: page === 1,
      });

      setChatters(result.data.chatters);
      setTotal(result.data.total);
      if (result.data.stats) {
        setStats(result.data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching chatters:', err);
      setError(err.message || 'Failed to load chatters');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, countryFilter, languageFilter, searchQuery]);

  useEffect(() => {
    fetchChatters();
  }, [page, statusFilter, countryFilter, languageFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchChatters();
      } else {
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Format amount
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
      case 'quiz_required':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
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
      case 'pending':
      case 'quiz_required':
        return <Clock className="w-4 h-4" />;
      case 'suspended':
      case 'banned':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Get level name
  const getLevelName = (level: number) => {
    const levels: Record<number, string> = {
      1: 'Bronze',
      2: 'Silver',
      3: 'Gold',
      4: 'Platinum',
      5: 'Diamond',
    };
    return levels[level] || 'Unknown';
  };

  // Get country name
  const getCountryName = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country?.name || code;
  };

  const handleToggleVisibility = useCallback(async (chatterId: string, currentVisible: boolean) => {
    setVisibilityLoading(prev => new Map(prev).set(chatterId, true));
    try {
      const fn = httpsCallable(functionsWest2, 'adminToggleChatterVisibility');
      await fn({ chatterId, isVisible: !currentVisible });
      setChatters(prev => prev.map(c => c.id === chatterId ? { ...c, isVisible: !currentVisible } : c));
      toast.success(!currentVisible ? 'Chatter visible dans le répertoire' : 'Chatter masqué du répertoire');
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      toast.error('Erreur lors de la mise à jour de la visibilité');
    } finally {
      setVisibilityLoading(prev => { const m = new Map(prev); m.delete(chatterId); return m; });
    }
  }, []);

  // Export to CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const adminExportChatters = httpsCallable<any, { csv: string }>(
        functionsWest2,
        'adminExportChatters'
      );

      const result = await adminExportChatters({
        status: statusFilter === 'all' ? undefined : statusFilter,
        country: countryFilter === 'all' ? undefined : countryFilter,
        language: languageFilter === 'all' ? undefined : languageFilter,
        search: searchQuery || undefined,
      });

      // Download CSV
      const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `chatters_export_${new Date().toISOString().split('T')[0]}.csv`;
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
      const adminBulkChatterAction = httpsCallable(functionsWest2, 'adminBulkChatterAction');
      await adminBulkChatterAction({
        chatterIds: Array.from(selectedIds),
        action,
      });

      setSelectedIds(new Set());
      setShowBulkActions(false);
      fetchChatters();
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
    if (selectedIds.size === chatters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(chatters.map(c => c.id)));
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
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
            <FormattedMessage id="admin.chatters.title" defaultMessage="Gestion des Chatters" />
          </h1>
          <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="admin.chatters.subtitle"
              defaultMessage="{count} chatters dans {countries} pays"
              values={{ count: total, countries: stats?.topCountries?.length || 0 }}
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
              <FormattedMessage id="admin.chatters.export" defaultMessage="Exporter CSV" />
            </span>
          </button>
          <button
            onClick={fetchChatters}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  <FormattedMessage id="admin.chatters.stats.active" defaultMessage="Actifs" />
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {stats.totalActive}
                </p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  <FormattedMessage id="admin.chatters.stats.pending" defaultMessage="En attente" />
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {stats.totalPending}
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
                  <FormattedMessage id="admin.chatters.stats.newMonth" defaultMessage="Nouveaux (mois)" />
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {stats.newThisMonth}
                </p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  <FormattedMessage id="admin.chatters.stats.suspended" defaultMessage="Suspendus" />
                </p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {stats.totalSuspended}
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
                  <FormattedMessage id="admin.chatters.stats.earnings" defaultMessage="Total versé" />
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
              placeholder={intl.formatMessage({ id: 'admin.chatters.search', defaultMessage: 'Rechercher par nom, email, code...' })}
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
                <option value="all">{intl.formatMessage({ id: 'admin.chatters.filter.all', defaultMessage: 'Tous statuts' })}</option>
                <option value="active">{intl.formatMessage({ id: 'admin.chatters.filter.active', defaultMessage: 'Actifs' })}</option>
                <option value="pending">{intl.formatMessage({ id: 'admin.chatters.filter.pending', defaultMessage: 'En attente' })}</option>
                <option value="quiz_required">{intl.formatMessage({ id: 'admin.chatters.filter.quizRequired', defaultMessage: 'Quiz requis' })}</option>
                <option value="suspended">{intl.formatMessage({ id: 'admin.chatters.filter.suspended', defaultMessage: 'Suspendus' })}</option>
                <option value="banned">{intl.formatMessage({ id: 'admin.chatters.filter.banned', defaultMessage: 'Bannis' })}</option>
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
                <option value="all">{intl.formatMessage({ id: 'admin.chatters.filter.allCountries', defaultMessage: 'Tous les pays' })}</option>
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
                <option value="all">{intl.formatMessage({ id: 'admin.chatters.filter.allLanguages', defaultMessage: 'Toutes langues' })}</option>
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
                id="admin.chatters.bulkSelected"
                defaultMessage="{count} chatter(s) sélectionné(s)"
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
                <FormattedMessage id="admin.chatters.bulk.activate" defaultMessage="Activer" />
              </button>
              <button
                onClick={() => handleBulkAction('suspend')}
                disabled={bulkActionLoading}
                className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
              >
                <Pause className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.bulk.suspend" defaultMessage="Suspendre" />
              </button>
              <button
                onClick={() => handleBulkAction('email')}
                disabled={bulkActionLoading}
                className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
              >
                <Mail className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.bulk.email" defaultMessage="Envoyer email" />
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

      {/* Directory info banner */}
      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
        Activez la visibilité de chaque chatter pour qu'il apparaisse sur{' '}
        <a href="/nos-chatters" target="_blank" className="underline font-medium">la page répertoire publique</a>.
        {' '}La page doit aussi être activée dans <strong>Configuration</strong>.
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Chatters List */}
          <div className={`${UI.card} overflow-hidden`}>
            {chatters.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="admin.chatters.empty" defaultMessage="Aucun chatter trouvé" />
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
                          checked={selectedIds.size === chatters.length && chatters.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                        />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Chatter
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                        <FormattedMessage id="admin.chatters.col.country" defaultMessage="Pays" />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <FormattedMessage id="admin.chatters.col.status" defaultMessage="Statut" />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                        <FormattedMessage id="admin.chatters.col.level" defaultMessage="Niveau" />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                        <FormattedMessage id="admin.chatters.col.earnings" defaultMessage="Gains" />
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                        <FormattedMessage id="admin.chatters.col.conversions" defaultMessage="Conv." />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Répertoire</th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {chatters.map((chatter) => (
                      <tr
                        key={chatter.id}
                        className={`hover:bg-gray-50 dark:hover:bg-white/5 ${
                          selectedIds.has(chatter.id) ? 'bg-red-50 dark:bg-red-900/10' : ''
                        }`}
                      >
                        <td className="px-3 sm:px-4 py-3 sm:py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(chatter.id)}
                            onChange={() => toggleSelection(chatter.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                          />
                        </td>
                        <td
                          className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap cursor-pointer"
                          onClick={() => navigate(`/admin/chatters/${chatter.id}`)}
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                              {chatter.firstName?.[0]}{chatter.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                {chatter.firstName} {chatter.lastName}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">
                                {chatter.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">{chatter.country ? getFlagEmoji(chatter.country) : '🌍'}</span>
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {chatter.country ? getCountryName(chatter.country) : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(chatter.status)}`}>
                            {getStatusIcon(chatter.status)}
                            <span className="hidden sm:inline">{chatter.status}</span>
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                              {getLevelName(chatter.level)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                          <span className="font-medium text-green-600 dark:text-green-400 text-sm">
                            {formatAmount(chatter.totalEarned)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-xs sm:text-sm">
                            <span className="text-gray-900 dark:text-white">{chatter.totalClients}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span className="text-gray-600 dark:text-gray-400">{chatter.totalRecruits}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {visibilityLoading.get(chatter.id) ? (
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                          ) : (
                            <button
                              onClick={() => handleToggleVisibility(chatter.id, chatter.isVisible ?? false)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                chatter.isVisible ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                              title={chatter.isVisible ? 'Masquer du répertoire' : 'Afficher dans le répertoire'}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                chatter.isVisible ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); void toggleFeatured(chatter.id, !!chatter.isFeatured); }}
                              disabled={featuredLoading === chatter.id}
                              title={chatter.isFeatured ? 'Retirer le badge Recommandé' : 'Attribuer le badge Recommandé'}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            >
                              {featuredLoading === chatter.id
                                ? <span className="animate-spin inline-block w-3 h-3 border border-current rounded-full border-t-transparent" />
                                : <Star className={`w-4 h-4 ${chatter.isFeatured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                              }
                            </button>
                            <button
                              onClick={() => navigate(`/admin/chatters/${chatter.id}`)}
                              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                            </button>
                          </div>
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
                  id="admin.chatters.pagination"
                  defaultMessage="Page {page} sur {total} ({count} chatters)"
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

export default AdminChattersList;
