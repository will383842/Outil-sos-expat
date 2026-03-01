/**
 * AdminCaptainDetail - Admin page for viewing and managing a single Captain Chatter
 * Shows captain info, N1/N2 recruits, monthly commissions, tier progression
 * Actions: toggle quality bonus, revoke captain status
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from "@/config/firebase";
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Crown,
  Users,
  Star,
  Shield,
  Phone,
  Mail,
  Globe,
  Calendar,
  TrendingUp,
  Wallet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronRight,
  Award,
  BarChart3,
  UserMinus,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Clock,
  FileText,
  Languages,
  MapPin,
  Save,
  Edit2,
  ArrowRightLeft,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
    success: "bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all",
    warning: "bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-xl transition-all",
  },
} as const;

// Captain tier definitions — based on monthly team calls (aligned with backend captainTiers)
const CAPTAIN_TIERS = [
  { key: 'bronze', label: 'Bronze', color: 'from-amber-400 to-amber-600', textColor: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', minCalls: 20 },
  { key: 'silver', label: 'Silver', color: 'from-gray-300 to-gray-500', textColor: 'text-gray-600 dark:text-gray-300', bgColor: 'bg-gray-200 dark:bg-gray-700/50', minCalls: 50 },
  { key: 'gold', label: 'Gold', color: 'from-yellow-400 to-yellow-600', textColor: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', minCalls: 100 },
  { key: 'platinum', label: 'Platinum', color: 'from-blue-400 to-blue-600', textColor: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', minCalls: 200 },
  { key: 'diamond', label: 'Diamond', color: 'from-purple-400 to-purple-600', textColor: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', minCalls: 400 },
];

// Supported languages
const LANGUAGES = [
  { code: 'fr', label: 'Francais' }, { code: 'en', label: 'English' },
  { code: 'es', label: 'Espanol' }, { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Portugues' }, { code: 'ru', label: 'Russkij' },
  { code: 'ar', label: 'Arabi' }, { code: 'zh', label: 'Zhongwen' },
  { code: 'hi', label: 'Hindi' },
];

// Top countries (most common for expats)
const TOP_COUNTRIES = [
  { code: 'FR', name: 'France' }, { code: 'US', name: 'USA' }, { code: 'GB', name: 'UK' },
  { code: 'DE', name: 'Germany' }, { code: 'ES', name: 'Spain' }, { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' }, { code: 'BR', name: 'Brazil' }, { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' }, { code: 'JP', name: 'Japan' }, { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' }, { code: 'BE', name: 'Belgium' }, { code: 'CH', name: 'Switzerland' },
  { code: 'PT', name: 'Portugal' }, { code: 'SE', name: 'Sweden' }, { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' }, { code: 'FI', name: 'Finland' }, { code: 'PL', name: 'Poland' },
  { code: 'RU', name: 'Russia' }, { code: 'MX', name: 'Mexico' }, { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' }, { code: 'CO', name: 'Colombia' }, { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' }, { code: 'KE', name: 'Kenya' }, { code: 'MA', name: 'Morocco' },
  { code: 'TN', name: 'Tunisia' }, { code: 'SN', name: 'Senegal' }, { code: 'CI', name: "Cote d'Ivoire" },
  { code: 'CM', name: 'Cameroon' }, { code: 'DZ', name: 'Algeria' }, { code: 'EG', name: 'Egypt' },
  { code: 'TH', name: 'Thailand' }, { code: 'VN', name: 'Vietnam' }, { code: 'PH', name: 'Philippines' },
  { code: 'KR', name: 'South Korea' }, { code: 'AE', name: 'UAE' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'TR', name: 'Turkey' }, { code: 'IL', name: 'Israel' }, { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' }, { code: 'ID', name: 'Indonesia' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' }, { code: 'AT', name: 'Austria' }, { code: 'CZ', name: 'Czechia' },
].sort((a, b) => a.name.localeCompare(b.name));

interface Recruit {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country?: string;
  status: string;
  totalCalls: number;
  totalEarned: number;
  recruitedAt: string;
}

interface MonthlyCommission {
  month: string;
  n1Commissions: number;
  n2Commissions: number;
  qualityBonus: number;
  totalAmount: number;
}

interface CaptainArchive {
  id: string;
  month: number;
  year: number;
  teamCalls: number;
  tierName: string;
  tierBonus: number;
  qualityBonusPaid: boolean;
  qualityBonusAmount: number;
  bonusAmount: number;
  activeN1Count: number;
  revokedAt: string | null;
  createdAt: string;
}

interface CaptainDetailData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  tier: string;
  qualityBonusEnabled: boolean;
  promotedAt: string;
  createdAt: string;
  // Network stats
  n1Count: number;
  n2Count: number;
  n1Active: number;
  n2Active: number;
  totalTeamCalls: number;
  monthlyTeamCalls: number;
  // Financial
  totalCaptainEarnings: number;
  totalN1Commissions: number;
  totalN2Commissions: number;
  totalQualityBonuses: number;
  availableBalance: number;
  pendingBalance: number;
  // Coverage
  assignedCountries?: string[];
  assignedLanguages?: string[];
  // Recruits
  n1Recruits: Recruit[];
  n2Recruits: Recruit[];
  // Monthly history
  monthlyCommissions: MonthlyCommission[];
  // Archives
  archives?: CaptainArchive[];
  // Affiliate codes
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
}

type TabId = 'n1' | 'n2' | 'commissions' | 'archives';

// Helper function to get country flag emoji from ISO code
function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const AdminCaptainDetail: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { captainId } = useParams<{ captainId: string }>();

  const [captain, setCaptain] = useState<CaptainDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('n1');
  const [actionLoading, setActionLoading] = useState(false);
  const [qualityBonusLoading, setQualityBonusLoading] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [editCountries, setEditCountries] = useState<string[]>([]);
  const [editLanguages, setEditLanguages] = useState<string[]>([]);
  const [showCoverageEdit, setShowCoverageEdit] = useState(false);
  // Transfer state
  const [selectedForTransfer, setSelectedForTransfer] = useState<Set<string>>(new Set());
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // Fetch captain detail
  const fetchCaptain = useCallback(async () => {
    if (!captainId) return;

    setLoading(true);
    setError(null);

    try {
      const adminGetCaptainDetail = httpsCallable<{ captainId: string }, CaptainDetailData>(
        functionsAffiliate,
        'adminGetCaptainDetail'
      );

      const result = await adminGetCaptainDetail({ captainId });
      setCaptain(result.data);
    } catch (err: any) {
      console.error('Error fetching captain detail:', err);
      setError(err.message || 'Failed to load captain');
    } finally {
      setLoading(false);
    }
  }, [captainId]);

  useEffect(() => {
    fetchCaptain();
  }, [captainId]);

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
  const handleToggleQualityBonus = async () => {
    if (!captainId || !captain) return;

    setQualityBonusLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminToggleCaptainQualityBonus');
      await fn({ captainId, enabled: !captain.qualityBonusEnabled });

      setCaptain(prev => prev ? { ...prev, qualityBonusEnabled: !prev.qualityBonusEnabled } : null);
      toast.success(
        !captain.qualityBonusEnabled
          ? intl.formatMessage({ id: 'admin.captainDetail.qualityBonus.enabled', defaultMessage: 'Bonus qualite active' })
          : intl.formatMessage({ id: 'admin.captainDetail.qualityBonus.disabled', defaultMessage: 'Bonus qualite desactive' })
      );
    } catch (err: any) {
      console.error('Failed to toggle quality bonus:', err);
      toast.error(err.message || 'Erreur lors de la mise a jour');
    } finally {
      setQualityBonusLoading(false);
    }
  };

  // Revoke captain status
  const handleRevoke = async () => {
    if (!captainId) return;

    setActionLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminRevokeCaptain');
      await fn({ captainId });

      toast.success(intl.formatMessage({ id: 'admin.captainDetail.revoked', defaultMessage: 'Statut capitaine revoque' }));
      navigate('/admin/chatters/captains');
    } catch (err: any) {
      console.error('Failed to revoke captain:', err);
      toast.error(err.message || 'Erreur lors de la revocation');
    } finally {
      setActionLoading(false);
      setRevokeConfirm(false);
    }
  };

  // Transfer chatters to another captain
  const handleTransfer = async () => {
    if (!captainId || !transferTargetId || selectedForTransfer.size === 0) return;
    setTransferLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminTransferChatters');
      const result = await fn({
        chatterIds: Array.from(selectedForTransfer),
        fromCaptainId: captainId,
        toCaptainId: transferTargetId,
      });
      const data = result.data as { transferred: number; errors: string[] };
      toast.success(intl.formatMessage(
        { id: 'admin.captainDetail.transfer.success', defaultMessage: '{count} chatters transferes' },
        { count: data.transferred }
      ));
      setSelectedForTransfer(new Set());
      setTransferTargetId('');
      setShowTransfer(false);
      fetchCaptain(); // Refresh data
    } catch (err: any) {
      console.error('Transfer error:', err);
      toast.error(err.message || 'Erreur de transfert');
    } finally {
      setTransferLoading(false);
    }
  };

  // Save coverage (countries + languages)
  const handleSaveCoverage = async () => {
    if (!captainId) return;
    setCoverageLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminAssignCaptainCoverage');
      await fn({ captainId, countries: editCountries, languages: editLanguages });
      setCaptain(prev => prev ? { ...prev, assignedCountries: editCountries, assignedLanguages: editLanguages } : null);
      setShowCoverageEdit(false);
      toast.success(intl.formatMessage({ id: 'admin.captainDetail.coverage.saved', defaultMessage: 'Couverture mise a jour' }));
    } catch (err: any) {
      console.error('Failed to save coverage:', err);
      toast.error(err.message || 'Erreur');
    } finally {
      setCoverageLoading(false);
    }
  };

  // Open coverage editor with current values
  const openCoverageEdit = () => {
    setEditCountries(captain?.assignedCountries || []);
    setEditLanguages(captain?.assignedLanguages || []);
    setShowCoverageEdit(true);
  };

  // Get tier info
  const getTierInfo = (tierKey: string) => {
    return CAPTAIN_TIERS.find(t => t.key === tierKey) || CAPTAIN_TIERS[0];
  };

  // Get tier progression percentage — based on monthly team calls (not N1 count)
  const getTierProgress = (tierKey: string, monthlyTeamCalls: number) => {
    const currentTierIndex = CAPTAIN_TIERS.findIndex(t => t.key === tierKey);
    const nextTier = CAPTAIN_TIERS[currentTierIndex + 1];

    if (!nextTier) return 100; // Already at max tier

    const currentMin = CAPTAIN_TIERS[currentTierIndex].minCalls;
    const nextMin = nextTier.minCalls;
    const progress = ((monthlyTeamCalls - currentMin) / (nextMin - currentMin)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  // Get status color for recruits
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'suspended':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'banned':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Tabs configuration
  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'n1',
      label: intl.formatMessage({ id: 'admin.captainDetail.tab.n1', defaultMessage: 'Recrues N1' }),
      icon: <Users className="w-4 h-4" />,
      count: captain?.n1Count,
    },
    {
      id: 'n2',
      label: intl.formatMessage({ id: 'admin.captainDetail.tab.n2', defaultMessage: 'Recrues N2' }),
      icon: <Users className="w-4 h-4" />,
      count: captain?.n2Count,
    },
    {
      id: 'commissions',
      label: intl.formatMessage({ id: 'admin.captainDetail.tab.commissions', defaultMessage: 'Commissions mensuelles' }),
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'archives',
      label: intl.formatMessage({ id: 'admin.captainDetail.tab.archives', defaultMessage: 'Archives' }),
      icon: <FileText className="w-4 h-4" />,
      count: captain?.archives?.length,
    },
  ];

  // Loading state
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error || !captain) {
    return (
      <AdminLayout>
        <div className="p-4 sm:p-6 space-y-6">
          <button
            onClick={() => navigate('/admin/chatters/captains')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <FormattedMessage id="admin.captainDetail.backToList" defaultMessage="Retour aux capitaines" />
          </button>

          <div className={`${UI.card} p-8 text-center`}>
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{error || 'Captain not found'}</p>
            <button
              onClick={fetchCaptain}
              className={`${UI.button.secondary} px-4 py-2 mt-4 inline-flex items-center gap-2`}
            >
              <RefreshCw className="w-4 h-4" />
              <FormattedMessage id="common.retry" defaultMessage="Reessayer" />
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const tierInfo = getTierInfo(captain.tier);
  const tierProgress = getTierProgress(captain.tier, captain.monthlyTeamCalls);
  const currentTierIndex = CAPTAIN_TIERS.findIndex(t => t.key === captain.tier);
  const nextTier = CAPTAIN_TIERS[currentTierIndex + 1];

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/admin/chatters/captains')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <FormattedMessage id="admin.captainDetail.backToList" defaultMessage="Retour aux capitaines" />
        </button>

        {/* Captain Header */}
        <div className={`${UI.card} p-4 sm:p-6`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Captain Identity */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${tierInfo.color} flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg`}>
                  {captain.firstName?.[0]}{captain.lastName?.[0]}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                  <Crown className="w-4 h-4 text-yellow-800" />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {captain.firstName} {captain.lastName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${tierInfo.bgColor} ${tierInfo.textColor}`}>
                    <Star className="w-3.5 h-3.5" />
                    Captain {tierInfo.label}
                  </span>
                  {captain.country && (
                    <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="text-base">{getFlagEmoji(captain.country)}</span>
                      {captain.country}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <FormattedMessage
                    id="admin.captainDetail.promotedAt"
                    defaultMessage="Promu capitaine le {date}"
                    values={{ date: new Date(captain.promotedAt).toLocaleDateString(intl.locale) }}
                  />
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchCaptain}
                className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Quality Bonus Toggle */}
              <button
                onClick={handleToggleQualityBonus}
                disabled={qualityBonusLoading}
                className={`${captain.qualityBonusEnabled ? UI.button.success : UI.button.secondary} px-4 py-2 flex items-center gap-2 text-sm`}
              >
                {qualityBonusLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : captain.qualityBonusEnabled ? (
                  <ToggleRight className="w-4 h-4" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                <FormattedMessage
                  id="admin.captainDetail.qualityBonus"
                  defaultMessage="Bonus qualite"
                />
              </button>

              {/* Revoke Captain */}
              {!revokeConfirm ? (
                <button
                  onClick={() => setRevokeConfirm(true)}
                  className={`${UI.button.danger} px-4 py-2 flex items-center gap-2 text-sm`}
                >
                  <UserMinus className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    <FormattedMessage id="admin.captainDetail.revoke" defaultMessage="Revoquer" />
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRevoke}
                    disabled={actionLoading}
                    className={`${UI.button.danger} px-4 py-2 flex items-center gap-2 text-sm`}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <FormattedMessage id="admin.captainDetail.confirmRevoke" defaultMessage="Confirmer" />
                  </button>
                  <button
                    onClick={() => setRevokeConfirm(false)}
                    className={`${UI.button.secondary} px-3 py-2 text-sm`}
                  >
                    <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">N1</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1">
              {captain.n1Count}
              <span className="text-xs font-normal text-green-500 ml-1">({captain.n1Active} actifs)</span>
            </p>
          </div>

          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">N2</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1">
              {captain.n2Count}
              <span className="text-xs font-normal text-green-500 ml-1">({captain.n2Active} actifs)</span>
            </p>
          </div>

          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Appels/mois</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1">
              {captain.monthlyTeamCalls}
            </p>
          </div>

          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Total gagne</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400 mt-1">
              {formatAmount(captain.totalCaptainEarnings)}
            </p>
          </div>

          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Disponible</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1">
              {formatAmount(captain.availableBalance)}
            </p>
          </div>

          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">En attente</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
              {formatAmount(captain.pendingBalance)}
            </p>
          </div>
        </div>

        {/* Tier Progression */}
        <div className={`${UI.card} p-4 sm:p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              <FormattedMessage id="admin.captainDetail.tierProgression" defaultMessage="Progression de tier" />
            </h3>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${tierInfo.bgColor} ${tierInfo.textColor}`}>
              <Star className="w-4 h-4" />
              {tierInfo.label}
            </span>
          </div>

          {/* Tier gauge */}
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="relative">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${tierInfo.color} rounded-full transition-all duration-500`}
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
              {/* Tier markers */}
              <div className="flex justify-between mt-1">
                {CAPTAIN_TIERS.map((tier, index) => {
                  const isActive = index <= currentTierIndex;
                  const isCurrent = index === currentTierIndex;
                  return (
                    <div
                      key={tier.key}
                      className={`flex flex-col items-center ${isCurrent ? 'font-bold' : ''}`}
                    >
                      <div className={`w-3 h-3 rounded-full border-2 ${
                        isActive
                          ? `bg-gradient-to-r ${tier.color} border-white dark:border-gray-800`
                          : 'bg-gray-300 dark:bg-gray-600 border-gray-200 dark:border-gray-700'
                      }`} />
                      <span className={`text-xs mt-1 hidden sm:inline ${
                        isActive ? tier.textColor : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {tier.label}
                      </span>
                      <span className={`text-xs ${
                        isActive ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {tier.minCalls}+
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next tier info */}
            {nextTier && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="admin.captainDetail.nextTier"
                  defaultMessage="Prochain tier: {tier} (encore {remaining} appels requis)"
                  values={{
                    tier: nextTier.label,
                    remaining: Math.max(0, nextTier.minCalls - captain.monthlyTeamCalls),
                  }}
                />
              </p>
            )}
            {!nextTier && (
              <p className="text-sm text-purple-500 dark:text-purple-400 font-medium">
                <FormattedMessage
                  id="admin.captainDetail.maxTier"
                  defaultMessage="Tier maximum atteint !"
                />
              </p>
            )}
          </div>

          {/* Commission Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                <FormattedMessage id="admin.captainDetail.commN1" defaultMessage="Commissions N1" />
              </p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {formatAmount(captain.totalN1Commissions)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                <FormattedMessage id="admin.captainDetail.commN2" defaultMessage="Commissions N2" />
              </p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {formatAmount(captain.totalN2Commissions)}
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                <FormattedMessage id="admin.captainDetail.qualityBonuses" defaultMessage="Bonus qualite" />
              </p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatAmount(captain.totalQualityBonuses)}
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Codes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Contact Info */}
          <div className={`${UI.card} p-4 sm:p-6`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="admin.captainDetail.contact" defaultMessage="Contact" />
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 text-sm truncate">{captain.email}</span>
              </div>
              {captain.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm">{captain.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  {captain.country ? `${getFlagEmoji(captain.country)} ${captain.country}` : '-'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  <FormattedMessage
                    id="admin.captainDetail.memberSince"
                    defaultMessage="Membre depuis {date}"
                    values={{ date: new Date(captain.createdAt).toLocaleDateString(intl.locale) }}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Affiliate Codes */}
          <div className={`${UI.card} p-4 sm:p-6`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="admin.captainDetail.codes" defaultMessage="Codes affilies" />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Code Client</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400 break-all">
                  {captain.affiliateCodeClient || '-'}
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Code Recrutement</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400 break-all">
                  {captain.affiliateCodeRecruitment || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coverage — Countries & Languages */}
        <div className={`${UI.card} p-4 sm:p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              <FormattedMessage id="admin.captainDetail.coverage.title" defaultMessage="Couverture pays & langues" />
            </h3>
            {!showCoverageEdit ? (
              <button onClick={openCoverageEdit} className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}>
                <Edit2 className="w-3.5 h-3.5" />
                <FormattedMessage id="common.edit" defaultMessage="Modifier" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCoverage}
                  disabled={coverageLoading}
                  className={`${UI.button.success} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                >
                  {coverageLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <FormattedMessage id="common.save" defaultMessage="Enregistrer" />
                </button>
                <button onClick={() => setShowCoverageEdit(false)} className={`${UI.button.secondary} px-3 py-1.5 text-sm`}>
                  <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
                </button>
              </div>
            )}
          </div>

          {!showCoverageEdit ? (
            /* Read mode */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  <FormattedMessage id="admin.captainDetail.coverage.countries" defaultMessage="Pays assignes" />
                </p>
                {(captain.assignedCountries?.length || 0) > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {captain.assignedCountries!.map(cc => (
                      <span key={cc} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-medium">
                        {getFlagEmoji(cc)} {cc}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    <FormattedMessage id="admin.captainDetail.coverage.none" defaultMessage="Aucun" />
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" />
                  <FormattedMessage id="admin.captainDetail.coverage.languages" defaultMessage="Langues assignees" />
                </p>
                {(captain.assignedLanguages?.length || 0) > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {captain.assignedLanguages!.map(lang => {
                      const l = LANGUAGES.find(l => l.code === lang);
                      return (
                        <span key={lang} className="inline-flex items-center px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-medium">
                          {l?.label || lang}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    <FormattedMessage id="admin.captainDetail.coverage.none" defaultMessage="Aucun" />
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Edit mode */
            <div className="space-y-4">
              {/* Countries multi-select */}
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                  <FormattedMessage id="admin.captainDetail.coverage.selectCountries" defaultMessage="Pays (cliquer pour ajouter/retirer)" />
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  {TOP_COUNTRIES.map(c => {
                    const isSelected = editCountries.includes(c.code);
                    return (
                      <button
                        key={c.code}
                        onClick={() => setEditCountries(prev =>
                          isSelected ? prev.filter(x => x !== c.code) : [...prev, c.code]
                        )}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                        }`}
                      >
                        {getFlagEmoji(c.code)} {c.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-1">{editCountries.length} <FormattedMessage id="admin.captainDetail.coverage.selected" defaultMessage="selectionnes" /></p>
              </div>
              {/* Languages multi-select */}
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                  <FormattedMessage id="admin.captainDetail.coverage.selectLanguages" defaultMessage="Langues" />
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map(l => {
                    const isSelected = editLanguages.includes(l.code);
                    return (
                      <button
                        key={l.code}
                        onClick={() => setEditLanguages(prev =>
                          isSelected ? prev.filter(x => x !== l.code) : [...prev, l.code]
                        )}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                        }`}
                      >
                        {l.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-1">{editLanguages.length} <FormattedMessage id="admin.captainDetail.coverage.selected" defaultMessage="selectionnes" /></p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className={`${UI.card} overflow-hidden`}>
          {/* Tab Headers */}
          <div className="flex overflow-x-auto border-b border-gray-200 dark:border-white/10">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            {/* N1 Recruits Tab */}
            {activeTab === 'n1' && (
              <div>
                {/* Transfer toolbar */}
                {captain.n1Recruits.length > 0 && (
                  <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 flex flex-wrap items-center gap-2">
                    {!showTransfer ? (
                      <button
                        onClick={() => setShowTransfer(true)}
                        className={`${UI.button.secondary} px-3 py-1.5 text-xs flex items-center gap-1.5`}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <FormattedMessage id="admin.captainDetail.transfer.btn" defaultMessage="Transferer des chatters" />
                      </button>
                    ) : (
                      <>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedForTransfer.size} <FormattedMessage id="admin.captainDetail.transfer.selected" defaultMessage="selectionnes" />
                        </span>
                        <input
                          type="text"
                          value={transferTargetId}
                          onChange={(e) => setTransferTargetId(e.target.value)}
                          placeholder={intl.formatMessage({ id: 'admin.captainDetail.transfer.targetId', defaultMessage: 'ID du captain cible' })}
                          className="px-2 py-1 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg w-48"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={handleTransfer}
                          disabled={transferLoading || selectedForTransfer.size === 0 || !transferTargetId}
                          className={`${UI.button.warning} px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50`}
                        >
                          {transferLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                          <FormattedMessage id="admin.captainDetail.transfer.confirm" defaultMessage="Transferer" />
                        </button>
                        <button
                          onClick={() => { setShowTransfer(false); setSelectedForTransfer(new Set()); setTransferTargetId(''); }}
                          className={`${UI.button.secondary} px-2 py-1.5 text-xs`}
                        >
                          <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {captain.n1Recruits.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      <FormattedMessage id="admin.captainDetail.noN1" defaultMessage="Aucune recrue N1" />
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-white/5">
                        <tr>
                          {showTransfer && (
                            <th className="px-2 py-3 w-8">
                              <input
                                type="checkbox"
                                checked={selectedForTransfer.size === captain.n1Recruits.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedForTransfer(new Set(captain.n1Recruits.map(r => r.id)));
                                  } else {
                                    setSelectedForTransfer(new Set());
                                  }
                                }}
                                className="rounded border-gray-300"
                              />
                            </th>
                          )}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <FormattedMessage id="admin.captainDetail.recruit.name" defaultMessage="Nom" />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">
                            <FormattedMessage id="admin.captainDetail.recruit.country" defaultMessage="Pays" />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <FormattedMessage id="admin.captainDetail.recruit.status" defaultMessage="Statut" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                            <FormattedMessage id="admin.captainDetail.recruit.calls" defaultMessage="Appels" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                            <FormattedMessage id="admin.captainDetail.recruit.earned" defaultMessage="Gagne" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">
                            <FormattedMessage id="admin.captainDetail.recruit.date" defaultMessage="Date" />
                          </th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {captain.n1Recruits.map(recruit => (
                          <tr
                            key={recruit.id}
                            onClick={() => navigate(`/admin/chatters/${recruit.id}`)}
                            className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            {showTransfer && (
                              <td className="px-2 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedForTransfer.has(recruit.id)}
                                  onChange={() => {
                                    setSelectedForTransfer(prev => {
                                      const next = new Set(prev);
                                      if (next.has(recruit.id)) next.delete(recruit.id);
                                      else next.add(recruit.id);
                                      return next;
                                    });
                                  }}
                                  className="rounded border-gray-300"
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                  {recruit.firstName?.[0]}{recruit.lastName?.[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                    {recruit.firstName} {recruit.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                    {recruit.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {recruit.country ? `${getFlagEmoji(recruit.country)} ${recruit.country}` : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(recruit.status)}`}>
                                {recruit.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right hidden md:table-cell">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{recruit.totalCalls}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right hidden md:table-cell">
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">{formatAmount(recruit.totalEarned)}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right hidden lg:table-cell">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(recruit.recruitedAt).toLocaleDateString(intl.locale)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* N2 Recruits Tab */}
            {activeTab === 'n2' && (
              <div>
                {captain.n2Recruits.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      <FormattedMessage id="admin.captainDetail.noN2" defaultMessage="Aucune recrue N2" />
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-white/5">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <FormattedMessage id="admin.captainDetail.recruit.name" defaultMessage="Nom" />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">
                            <FormattedMessage id="admin.captainDetail.recruit.country" defaultMessage="Pays" />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <FormattedMessage id="admin.captainDetail.recruit.status" defaultMessage="Statut" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                            <FormattedMessage id="admin.captainDetail.recruit.calls" defaultMessage="Appels" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                            <FormattedMessage id="admin.captainDetail.recruit.earned" defaultMessage="Gagne" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">
                            <FormattedMessage id="admin.captainDetail.recruit.date" defaultMessage="Date" />
                          </th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {captain.n2Recruits.map(recruit => (
                          <tr
                            key={recruit.id}
                            onClick={() => navigate(`/admin/chatters/${recruit.id}`)}
                            className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                  {recruit.firstName?.[0]}{recruit.lastName?.[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                    {recruit.firstName} {recruit.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                                    {recruit.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {recruit.country ? `${getFlagEmoji(recruit.country)} ${recruit.country}` : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(recruit.status)}`}>
                                {recruit.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right hidden md:table-cell">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{recruit.totalCalls}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right hidden md:table-cell">
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">{formatAmount(recruit.totalEarned)}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right hidden lg:table-cell">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(recruit.recruitedAt).toLocaleDateString(intl.locale)}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Monthly Commissions Tab */}
            {activeTab === 'commissions' && (
              <div>
                {captain.monthlyCommissions.length === 0 ? (
                  <div className="py-8 text-center">
                    <BarChart3 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      <FormattedMessage id="admin.captainDetail.noCommissions" defaultMessage="Aucune commission" />
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-white/5">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <FormattedMessage id="admin.captainDetail.commission.month" defaultMessage="Mois" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <FormattedMessage id="admin.captainDetail.commission.n1" defaultMessage="Comm. N1" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">
                            <FormattedMessage id="admin.captainDetail.commission.n2" defaultMessage="Comm. N2" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                            <FormattedMessage id="admin.captainDetail.commission.quality" defaultMessage="Bonus Q." />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <FormattedMessage id="admin.captainDetail.commission.total" defaultMessage="Total" />
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {captain.monthlyCommissions.map(mc => (
                          <tr key={mc.month} className="hover:bg-gray-50 dark:hover:bg-white/5">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{mc.month}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <span className="text-sm text-blue-600 dark:text-blue-400">{formatAmount(mc.n1Commissions)}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right hidden sm:table-cell">
                              <span className="text-sm text-purple-600 dark:text-purple-400">{formatAmount(mc.n2Commissions)}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right hidden md:table-cell">
                              {mc.qualityBonus > 0 ? (
                                <span className="text-sm text-green-600 dark:text-green-400">{formatAmount(mc.qualityBonus)}</span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatAmount(mc.totalAmount)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Total row */}
                      <tfoot className="bg-gray-50 dark:bg-white/5 border-t-2 border-gray-200 dark:border-white/10">
                        <tr>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              <FormattedMessage id="admin.captainDetail.commission.totalLabel" defaultMessage="TOTAL" />
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              {formatAmount(captain.monthlyCommissions.reduce((sum, mc) => sum + mc.n1Commissions, 0))}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right hidden sm:table-cell">
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                              {formatAmount(captain.monthlyCommissions.reduce((sum, mc) => sum + mc.n2Commissions, 0))}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right hidden md:table-cell">
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                              {formatAmount(captain.monthlyCommissions.reduce((sum, mc) => sum + mc.qualityBonus, 0))}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {formatAmount(captain.monthlyCommissions.reduce((sum, mc) => sum + mc.totalAmount, 0))}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Archives Tab */}
            {activeTab === 'archives' && (
              <div>
                {!captain.archives || captain.archives.length === 0 ? (
                  <div className="py-8 text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      <FormattedMessage
                        id="admin.captainDetail.archivesEmpty"
                        defaultMessage="Aucune archive disponible."
                      />
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      <FormattedMessage
                        id="admin.captainDetail.archivesEmptyHint"
                        defaultMessage="Les archives sont generees automatiquement le 1er de chaque mois."
                      />
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <FormattedMessage id="admin.captainDetail.archive.month" defaultMessage="Mois" />
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <FormattedMessage id="admin.captainDetail.archive.teamCalls" defaultMessage="Appels equipe" />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <FormattedMessage id="admin.captainDetail.archive.tier" defaultMessage="Palier" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">
                            <FormattedMessage id="admin.captainDetail.archive.tierBonus" defaultMessage="Bonus palier" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                            <FormattedMessage id="admin.captainDetail.archive.qualityBonus" defaultMessage="Bonus qualite" />
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                            <FormattedMessage id="admin.captainDetail.archive.n1" defaultMessage="N1 actifs" />
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <FormattedMessage id="admin.captainDetail.archive.total" defaultMessage="Total" />
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {captain.archives.map((archive) => {
                          const monthDate = new Date(archive.year, archive.month - 1);
                          const monthLabel = monthDate.toLocaleDateString(intl.locale, { month: 'long', year: 'numeric' });
                          return (
                            <tr key={archive.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{monthLabel}</span>
                                  {archive.revokedAt && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium">
                                      <FormattedMessage id="admin.captainDetail.archive.revoked" defaultMessage="Revoque" />
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{archive.teamCalls}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm text-gray-700 dark:text-gray-300">{archive.tierName}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right hidden sm:table-cell">
                                {archive.tierBonus > 0 ? (
                                  <span className="text-sm text-green-600 dark:text-green-400">{formatAmount(archive.tierBonus)}</span>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right hidden md:table-cell">
                                {archive.qualityBonusPaid ? (
                                  <span className="text-sm text-green-600 dark:text-green-400">{formatAmount(archive.qualityBonusAmount)}</span>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center hidden md:table-cell">
                                <span className="text-sm text-gray-600 dark:text-gray-400">{archive.activeN1Count}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatAmount(archive.bonusAmount)}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-white/5 border-t-2 border-gray-200 dark:border-white/10">
                        <tr>
                          <td className="px-4 py-3" colSpan={2}>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              TOTAL ({captain.archives.length} <FormattedMessage id="admin.captainDetail.archive.months" defaultMessage="mois" />)
                            </span>
                          </td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 text-right hidden sm:table-cell">
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                              {formatAmount(captain.archives.reduce((sum, a) => sum + a.tierBonus, 0))}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">
                              {formatAmount(captain.archives.reduce((sum, a) => sum + a.qualityBonusAmount, 0))}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell" />
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                              {formatAmount(captain.archives.reduce((sum, a) => sum + a.bonusAmount, 0))}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCaptainDetail;
