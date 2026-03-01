/**
 * AdminCaptainsList - Admin page for managing Captain Chatters
 * Captains are top-tier chatters who lead recruitment networks (N1/N2)
 * Features: Country filter, search, tier display, quality bonus toggle, CSV export
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from "@/config/firebase";
import toast from 'react-hot-toast';
import {
  Crown,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Download,
  Globe,
  Users,
  TrendingUp,
  Shield,
  Star,
  Phone,
  CheckCircle,
  AlertTriangle,
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

// Countries list (ISO 3166-1)
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
  { code: 'CD', name: 'DR Congo' }, { code: 'CR', name: 'Costa Rica' }, { code: 'CI', name: "Cote d'Ivoire" },
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
  { code: 'WS', name: 'Samoa' }, { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'Sao Tome' },
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

// Captain tier definitions
const CAPTAIN_TIERS: Record<string, { label: string; color: string; icon: string }> = {
  bronze: { label: 'Bronze', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: '' },
  silver: { label: 'Silver', color: 'bg-gray-200 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300', icon: '' },
  gold: { label: 'Gold', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '' },
  platinum: { label: 'Platinum', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: '' },
  diamond: { label: 'Diamond', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: '' },
};

interface Captain {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country?: string;
  tier: string;
  n1Count: number;
  n2Count: number;
  monthlyTeamCalls: number;
  totalEarnings: number;
  qualityBonusEnabled: boolean;
  createdAt: string;
  promotedAt?: string;
}

interface CaptainsListResponse {
  captains: Captain[];
  total: number;
  page: number;
  limit: number;
  stats?: {
    totalCaptains: number;
    countriesCovered: number;
    totalCountries: number;
    avgN1PerCaptain: number;
    avgTeamCalls: number;
    tierDistribution: Record<string, number>;
  };
}

// Helper function to get country flag emoji from ISO code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Get country name from code
function getCountryName(code: string): string {
  const country = COUNTRIES.find(c => c.code === code);
  return country?.name || code;
}

const AdminCaptainsList: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  // State
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<CaptainsListResponse['stats']>();
  const [qualityBonusLoading, setQualityBonusLoading] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Column sorting (client-side on current page)
  type SortField = 'n1Count' | 'n2Count' | 'monthlyTeamCalls' | 'totalEarnings' | 'name';
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedCaptains = useMemo(() => {
    if (!sortField) return captains;
    return [...captains].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`); break;
        case 'n1Count': cmp = a.n1Count - b.n1Count; break;
        case 'n2Count': cmp = a.n2Count - b.n2Count; break;
        case 'monthlyTeamCalls': cmp = a.monthlyTeamCalls - b.monthlyTeamCalls; break;
        case 'totalEarnings': cmp = a.totalEarnings - b.totalEarnings; break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [captains, sortField, sortDir]);

  const limit = 20;

  // Fetch captains
  const fetchCaptains = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetCaptainsList = httpsCallable<any, CaptainsListResponse>(
        functionsAffiliate,
        'adminGetCaptainsList'
      );

      const result = await adminGetCaptainsList({
        page,
        limit,
        country: countryFilter === 'all' ? undefined : countryFilter,
        tier: tierFilter === 'all' ? undefined : tierFilter,
        search: searchQuery || undefined,
        includeStats: page === 1,
      });

      setCaptains(result.data.captains);
      setTotal(result.data.total);
      if (result.data.stats) {
        setStats(result.data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching captains:', err);
      setError(err.message || 'Failed to load captains');
    } finally {
      setLoading(false);
    }
  }, [page, countryFilter, tierFilter, searchQuery]);

  useEffect(() => {
    fetchCaptains();
  }, [page, countryFilter, tierFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchCaptains();
      } else {
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Format amount (USD cents to dollars)
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Toggle quality bonus
  const handleToggleQualityBonus = useCallback(async (captainId: string, currentValue: boolean) => {
    setQualityBonusLoading(captainId);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminToggleCaptainQualityBonus');
      await fn({ captainId, enabled: !currentValue });
      setCaptains(prev =>
        prev.map(c => c.id === captainId ? { ...c, qualityBonusEnabled: !currentValue } : c)
      );
      toast.success(
        !currentValue
          ? intl.formatMessage({ id: 'admin.captains.qualityBonus.enabled', defaultMessage: 'Bonus qualite active' })
          : intl.formatMessage({ id: 'admin.captains.qualityBonus.disabled', defaultMessage: 'Bonus qualite desactive' })
      );
    } catch (err: any) {
      console.error('Failed to toggle quality bonus:', err);
      toast.error(intl.formatMessage({ id: 'admin.captains.qualityBonus.error', defaultMessage: 'Erreur lors de la mise a jour' }));
    } finally {
      setQualityBonusLoading(null);
    }
  }, [intl]);

  // Export CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const adminExportCaptainCSV = httpsCallable<any, { csv: string }>(
        functionsAffiliate,
        'adminExportCaptainCSV'
      );

      const result = await adminExportCaptainCSV({
        country: countryFilter === 'all' ? undefined : countryFilter,
        tier: tierFilter === 'all' ? undefined : tierFilter,
        search: searchQuery || undefined,
      });

      // Download CSV with BOM for Excel UTF-8 compatibility
      // Backend already includes BOM (\uFEFF) for Excel UTF-8 compatibility
      const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `captains_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(intl.formatMessage({ id: 'admin.captains.export.success', defaultMessage: 'Export CSV telecharge' }));
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Get tier display info
  const getTierInfo = (tier: string) => {
    return CAPTAIN_TIERS[tier] || CAPTAIN_TIERS['bronze'];
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
              <FormattedMessage id="admin.captains.title" defaultMessage="Captain Chatters" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.captains.subtitle"
                defaultMessage="{count} capitaines dans {countries} pays"
                values={{ count: total, countries: stats?.countriesCovered || 0 }}
              />
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/admin/chatters/captains/coverage')}
              className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">
                <FormattedMessage id="admin.captains.coverageMap" defaultMessage="Couverture" />
              </span>
            </button>
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
                <FormattedMessage id="admin.captains.export" defaultMessage="Exporter CSV" />
              </span>
            </button>
            <button
              onClick={fetchCaptains}
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
            {/* Total Captains */}
            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.captains.stats.total" defaultMessage="Capitaines" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.totalCaptains}
                  </p>
                </div>
              </div>
            </div>

            {/* Countries Covered */}
            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.captains.stats.countries" defaultMessage="Pays couverts" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.countriesCovered}
                    <span className="text-xs sm:text-sm font-normal text-gray-400 ml-1">/ {stats.totalCountries}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Avg N1 per Captain */}
            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.captains.stats.avgN1" defaultMessage="Moy. N1/Capt." />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.avgN1PerCaptain.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            {/* Avg Team Calls */}
            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.captains.stats.avgCalls" defaultMessage="Moy. appels/equipe" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.avgTeamCalls.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Tier Distribution */}
            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.captains.stats.topTier" defaultMessage="Gold+" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {(stats.tierDistribution['gold'] || 0) +
                     (stats.tierDistribution['platinum'] || 0) +
                     (stats.tierDistribution['diamond'] || 0)}
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
                placeholder={intl.formatMessage({ id: 'admin.captains.search', defaultMessage: 'Rechercher par nom, email...' })}
                className={`${UI.input} pl-10 text-sm sm:text-base`}
              />
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              {/* Country Filter */}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select
                  value={countryFilter}
                  onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}
                  className={`${UI.select} text-sm flex-1 sm:flex-none`}
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.captains.filter.allCountries', defaultMessage: 'Tous les pays' })}</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Tier Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
                <select
                  value={tierFilter}
                  onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
                  className={`${UI.select} text-sm flex-1 sm:flex-none`}
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.captains.filter.allTiers', defaultMessage: 'Tous les tiers' })}</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                  <option value="diamond">Diamond</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-sm sm:text-base">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Captains Table */}
            <div className={`${UI.card} overflow-hidden`}>
              {captains.length === 0 ? (
                <div className="p-8 text-center">
                  <Crown className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="admin.captains.empty" defaultMessage="Aucun capitaine trouve" />
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                      <tr>
                        <th
                          className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                          onClick={() => handleSort('name')}
                        >
                          <span className="inline-flex items-center gap-1">
                            <FormattedMessage id="admin.captains.col.captain" defaultMessage="Capitaine" />
                            {sortField === 'name' && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                          </span>
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                          <FormattedMessage id="admin.captains.col.country" defaultMessage="Pays" />
                        </th>
                        <th
                          className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                          onClick={() => handleSort('n1Count')}
                        >
                          <span className="inline-flex items-center gap-1 justify-center">
                            <FormattedMessage id="admin.captains.col.n1" defaultMessage="N1" />
                            {sortField === 'n1Count' && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                          </span>
                        </th>
                        <th
                          className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                          onClick={() => handleSort('n2Count')}
                        >
                          <span className="inline-flex items-center gap-1 justify-center">
                            <FormattedMessage id="admin.captains.col.n2" defaultMessage="N2" />
                            {sortField === 'n2Count' && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                          </span>
                        </th>
                        <th
                          className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                          onClick={() => handleSort('monthlyTeamCalls')}
                        >
                          <span className="inline-flex items-center gap-1 justify-center">
                            <FormattedMessage id="admin.captains.col.teamCalls" defaultMessage="Appels equipe/mois" />
                            {sortField === 'monthlyTeamCalls' && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                          </span>
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <FormattedMessage id="admin.captains.col.tier" defaultMessage="Tier" />
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                          <FormattedMessage id="admin.captains.col.qualityBonus" defaultMessage="Bonus Q." />
                        </th>
                        <th
                          className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200"
                          onClick={() => handleSort('totalEarnings')}
                        >
                          <span className="inline-flex items-center gap-1 justify-end">
                            <FormattedMessage id="admin.captains.col.earnings" defaultMessage="Total gagné" />
                            {sortField === 'totalEarnings' && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                          </span>
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                          {/* Action column */}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {sortedCaptains.map((captain) => {
                        const tierInfo = getTierInfo(captain.tier);
                        return (
                          <tr
                            key={captain.id}
                            onClick={() => navigate(`/admin/chatters/captains/${captain.id}`)}
                            className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            {/* Captain Name */}
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="relative">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                                    {captain.firstName?.[0]}{captain.lastName?.[0]}
                                  </div>
                                  <Crown className="absolute -top-1 -right-1 w-3.5 h-3.5 text-yellow-500 drop-shadow" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                    {captain.firstName} {captain.lastName}
                                  </p>
                                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">
                                    {captain.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Country */}
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                              <div className="flex items-center gap-1.5">
                                <span className="text-lg">{captain.country ? getFlagEmoji(captain.country) : ''}</span>
                                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                  {captain.country ? getCountryName(captain.country) : '-'}
                                </span>
                              </div>
                            </td>

                            {/* N1 Count */}
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                              <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                                {captain.n1Count}
                              </span>
                            </td>

                            {/* N2 Count */}
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center hidden md:table-cell">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {captain.n2Count}
                              </span>
                            </td>

                            {/* Monthly Team Calls */}
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center hidden lg:table-cell">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {captain.monthlyTeamCalls}
                              </span>
                            </td>

                            {/* Tier Badge */}
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${tierInfo.color}`}>
                                <Star className="w-3 h-3" />
                                {tierInfo.label}
                              </span>
                            </td>

                            {/* Quality Bonus Toggle */}
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center hidden lg:table-cell">
                              {qualityBonusLoading === captain.id ? (
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleToggleQualityBonus(captain.id, captain.qualityBonusEnabled);
                                  }}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none mx-auto ${
                                    captain.qualityBonusEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                  }`}
                                  title={captain.qualityBonusEnabled
                                    ? intl.formatMessage({ id: 'admin.captains.qualityBonus.disable', defaultMessage: 'Desactiver bonus qualite' })
                                    : intl.formatMessage({ id: 'admin.captains.qualityBonus.enable', defaultMessage: 'Activer bonus qualite' })
                                  }
                                >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                    captain.qualityBonusEnabled ? 'translate-x-6' : 'translate-x-1'
                                  }`} />
                                </button>
                              )}
                            </td>

                            {/* Team Earnings */}
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                              <span className="font-medium text-green-600 dark:text-green-400 text-sm">
                                {formatAmount(captain.totalEarnings)}
                              </span>
                            </td>

                            {/* Navigate */}
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                            </td>
                          </tr>
                        );
                      })}
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
                    id="admin.captains.pagination"
                    defaultMessage="Page {page} sur {total} ({count} capitaines)"
                    values={{ page, total: totalPages, count: total }}
                  />
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    &laquo;
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`${UI.button.secondary} px-2 sm:px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <FormattedMessage id="common.previous" defaultMessage="Prec." />
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
                    &raquo;
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

export default AdminCaptainsList;
