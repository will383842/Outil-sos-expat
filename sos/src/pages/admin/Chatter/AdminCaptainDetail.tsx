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

// Captain tier definitions with thresholds
const CAPTAIN_TIERS = [
  { key: 'bronze', label: 'Bronze', color: 'from-amber-400 to-amber-600', textColor: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', minN1: 0 },
  { key: 'silver', label: 'Silver', color: 'from-gray-300 to-gray-500', textColor: 'text-gray-600 dark:text-gray-300', bgColor: 'bg-gray-200 dark:bg-gray-700/50', minN1: 5 },
  { key: 'gold', label: 'Gold', color: 'from-yellow-400 to-yellow-600', textColor: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', minN1: 15 },
  { key: 'platinum', label: 'Platinum', color: 'from-blue-400 to-blue-600', textColor: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', minN1: 30 },
  { key: 'diamond', label: 'Diamond', color: 'from-purple-400 to-purple-600', textColor: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', minN1: 50 },
];

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
  // Recruits
  n1Recruits: Recruit[];
  n2Recruits: Recruit[];
  // Monthly history
  monthlyCommissions: MonthlyCommission[];
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

  // Get tier info
  const getTierInfo = (tierKey: string) => {
    return CAPTAIN_TIERS.find(t => t.key === tierKey) || CAPTAIN_TIERS[0];
  };

  // Get tier progression percentage
  const getTierProgress = (tierKey: string, n1Count: number) => {
    const currentTierIndex = CAPTAIN_TIERS.findIndex(t => t.key === tierKey);
    const nextTier = CAPTAIN_TIERS[currentTierIndex + 1];

    if (!nextTier) return 100; // Already at max tier

    const currentMin = CAPTAIN_TIERS[currentTierIndex].minN1;
    const nextMin = nextTier.minN1;
    const progress = ((n1Count - currentMin) / (nextMin - currentMin)) * 100;
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
  const tierProgress = getTierProgress(captain.tier, captain.n1Count);
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
                        {tier.minN1}+
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
                  defaultMessage="Prochain tier: {tier} (encore {remaining} N1 requis)"
                  values={{
                    tier: nextTier.label,
                    remaining: Math.max(0, nextTier.minN1 - captain.n1Count),
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
              <div className="py-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="admin.captainDetail.archivesPlaceholder"
                    defaultMessage="Les archives d'activite seront disponibles prochainement."
                  />
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  <FormattedMessage
                    id="admin.captainDetail.archivesDescription"
                    defaultMessage="Historique des promotions, tier changes, et actions admin."
                  />
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCaptainDetail;
