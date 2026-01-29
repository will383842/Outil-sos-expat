/**
 * AdminInfluencerDetail - Detailed view of a single influencer for admins
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Globe,
  Calendar,
  DollarSign,
  Users,
  Link2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Play,
  Pause,
  Ban,
  Copy,
  Check,
  ExternalLink,
  TrendingUp,
  Youtube,
  Instagram,
  Facebook,
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
} as const;

interface Influencer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: string;
  status: 'active' | 'suspended' | 'banned';
  suspensionReason?: string;
  platforms: string[];
  bio?: string;
  communitySize?: number;
  communityNiche?: string;
  socialLinks?: Record<string, string>;
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  totalClientsReferred: number;
  totalProvidersRecruited: number;
  totalClicks: number;
  conversionRate: number;
  currentMonthEarnings: number;
  currentMonthRank?: number;
  createdAt: string;
  updatedAt: string;
}

interface Commission {
  id: string;
  type: string;
  finalAmount: number;
  status: string;
  createdAt: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  requestedAt: string;
}

const AdminInfluencerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const intl = useIntl();
  const functions = getFunctions(undefined, 'europe-west1');

  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedRecruit, setCopiedRecruit] = useState(false);

  // Fetch influencer details
  const fetchInfluencer = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const adminGetInfluencerDetail = httpsCallable<{ influencerId: string }, {
        influencer: Influencer;
        recentCommissions: Commission[];
        recentWithdrawals: Withdrawal[];
      }>(functions, 'adminGetInfluencerDetail');

      const result = await adminGetInfluencerDetail({ influencerId: id });
      setInfluencer(result.data.influencer);
      setCommissions(result.data.recentCommissions || []);
      setWithdrawals(result.data.recentWithdrawals || []);
    } catch (err: any) {
      console.error('Error fetching influencer:', err);
      setError(err.message || 'Failed to load influencer');
    } finally {
      setLoading(false);
    }
  }, [id, functions]);

  useEffect(() => {
    fetchInfluencer();
  }, [fetchInfluencer]);

  // Handle status change
  const handleStatusChange = async (newStatus: 'active' | 'suspended' | 'banned', reason?: string) => {
    if (!id) return;

    setActionLoading(true);
    try {
      const adminUpdateInfluencerStatus = httpsCallable(functions, 'adminUpdateInfluencerStatus');
      await adminUpdateInfluencerStatus({
        influencerId: id,
        status: newStatus,
        reason,
      });
      fetchInfluencer();
    } catch (err: any) {
      console.error('Status change error:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, type: 'client' | 'recruit') => {
    navigator.clipboard.writeText(text);
    if (type === 'client') {
      setCopiedClient(true);
      setTimeout(() => setCopiedClient(false), 2000);
    } else {
      setCopiedRecruit(true);
      setTimeout(() => setCopiedRecruit(false), 2000);
    }
  };

  // Format amount
  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(intl.locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'facebook':
        return <Facebook className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !influencer) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className={`${UI.card} p-8 text-center`}>
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <p className="text-red-600 dark:text-red-400">{error || 'Influencer not found'}</p>
            <button
              onClick={() => navigate('/admin/influencers')}
              className={`${UI.button.secondary} px-4 py-2 mt-4`}
            >
              <FormattedMessage id="common.back" defaultMessage="Retour" />
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const clientLink = `https://sos-expat.com/ref/i/${influencer.affiliateCodeClient}`;
  const recruitLink = `https://sos-expat.com/rec/i/${influencer.affiliateCodeRecruitment}`;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/influencers')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {influencer.firstName} {influencer.lastName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{influencer.email}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(influencer.status)}`}>
            {influencer.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="space-y-6">
            {/* Personal Info */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-red-500" />
                <FormattedMessage id="admin.influencer.profile" defaultMessage="Profil" />
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{influencer.email}</span>
                </div>
                {influencer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{influencer.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{influencer.country} / {influencer.language}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <FormattedMessage id="admin.influencer.joined" defaultMessage="Inscrit le" /> {formatDate(influencer.createdAt)}
                  </span>
                </div>
                {influencer.communitySize && (
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {influencer.communitySize.toLocaleString()} followers
                    </span>
                  </div>
                )}
              </div>

              {/* Platforms */}
              {influencer.platforms && influencer.platforms.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plateformes</p>
                  <div className="flex flex-wrap gap-2">
                    {influencer.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-white/10 rounded-lg text-xs text-gray-700 dark:text-gray-300"
                      >
                        {getPlatformIcon(platform)}
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {influencer.bio && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{influencer.bio}</p>
                </div>
              )}
            </div>

            {/* Affiliate Links */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-red-500" />
                <FormattedMessage id="admin.influencer.links" defaultMessage="Liens d'affiliation" />
              </h2>

              <div className="space-y-4">
                {/* Client Link */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lien client (5% remise)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 dark:bg-white/5 px-3 py-2 rounded-lg text-xs overflow-x-auto">
                      {influencer.affiliateCodeClient}
                    </code>
                    <button
                      onClick={() => copyToClipboard(clientLink, 'client')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                    >
                      {copiedClient ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>

                {/* Recruit Link */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lien recrutement</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 dark:bg-white/5 px-3 py-2 rounded-lg text-xs overflow-x-auto">
                      {influencer.affiliateCodeRecruitment}
                    </code>
                    <button
                      onClick={() => copyToClipboard(recruitLink, 'recruit')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                    >
                      {copiedRecruit ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
              <div className="space-y-2">
                {influencer.status === 'suspended' ? (
                  <button
                    onClick={() => handleStatusChange('active')}
                    disabled={actionLoading}
                    className={`${UI.button.primary} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Play className="w-4 h-4" />
                    <FormattedMessage id="admin.influencer.action.activate" defaultMessage="Activer" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange('suspended', 'Admin action')}
                    disabled={actionLoading}
                    className={`${UI.button.secondary} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Pause className="w-4 h-4" />
                    <FormattedMessage id="admin.influencer.action.suspend" defaultMessage="Suspendre" />
                  </button>
                )}
                {influencer.status !== 'banned' && (
                  <button
                    onClick={() => handleStatusChange('banned', 'Violation of terms')}
                    disabled={actionLoading}
                    className={`${UI.button.danger} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Ban className="w-4 h-4" />
                    <FormattedMessage id="admin.influencer.action.block" defaultMessage="Bloquer" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Middle Column - Stats & Balance */}
          <div className="space-y-6">
            {/* Balance Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`${UI.card} p-4`}>
                <p className="text-xs text-gray-500 dark:text-gray-400">Disponible</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatAmount(influencer.availableBalance)}</p>
              </div>
              <div className={`${UI.card} p-4`}>
                <p className="text-xs text-gray-500 dark:text-gray-400">En validation</p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{formatAmount(influencer.pendingBalance + influencer.validatedBalance)}</p>
              </div>
              <div className={`${UI.card} p-4`}>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total gagné</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatAmount(influencer.totalEarned)}</p>
              </div>
              <div className={`${UI.card} p-4`}>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total retiré</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatAmount(influencer.totalWithdrawn)}</p>
              </div>
            </div>

            {/* Performance Stats */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-500" />
                <FormattedMessage id="admin.influencer.performance" defaultMessage="Performance" />
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Clients référés</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{influencer.totalClientsReferred}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Prestataires recrutés</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{influencer.totalProvidersRecruited}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Clics totaux</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{influencer.totalClicks}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Taux conversion</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{(influencer.conversionRate * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Gains ce mois</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatAmount(influencer.currentMonthEarnings)}</p>
                </div>
                {influencer.currentMonthRank && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Rang ce mois</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">#{influencer.currentMonthRank}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Activity */}
          <div className="space-y-6">
            {/* Recent Commissions */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <FormattedMessage id="admin.influencer.recentCommissions" defaultMessage="Commissions récentes" />
              </h2>
              {commissions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Aucune commission</p>
              ) : (
                <div className="space-y-3">
                  {commissions.slice(0, 5).map((commission) => (
                    <div key={commission.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {commission.type === 'client_referral' ? 'Client' : 'Recrutement'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(commission.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatAmount(commission.finalAmount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(commission.status)}`}>
                          {commission.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Withdrawals */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-500" />
                <FormattedMessage id="admin.influencer.recentWithdrawals" defaultMessage="Retraits récents" />
              </h2>
              {withdrawals.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Aucun retrait</p>
              ) : (
                <div className="space-y-3">
                  {withdrawals.slice(0, 5).map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{withdrawal.paymentMethod}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(withdrawal.requestedAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{formatAmount(withdrawal.amount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(withdrawal.status)}`}>
                          {withdrawal.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminInfluencerDetail;
