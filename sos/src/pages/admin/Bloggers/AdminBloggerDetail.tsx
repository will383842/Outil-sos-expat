/**
 * AdminBloggerDetail - Detailed view of a single blogger for admins
 *
 * Note: Bloggers have FIXED commissions ($10 client, $5 recruitment) with NO levels/bonuses
 * They cannot become Chatters or Influencers (definitive role)
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
  FileText,
  Award,
  Eye,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens - Purple theme for Bloggers
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
} as const;

interface Blogger {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country: string;
  language: string;
  status: 'active' | 'suspended' | 'blocked';
  suspensionReason?: string;
  blogUrl: string;
  blogName: string;
  blogLanguage: string;
  blogCountry: string;
  blogTheme: string;
  blogTraffic: string;
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
  badges: string[];
  currentStreak: number;
  longestStreak: number;
  createdAt: string;
  updatedAt: string;
}

interface Commission {
  id: string;
  type: string;
  amount: number;
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

const BLOG_THEMES: Record<string, { labelFr: string; labelEn: string }> = {
  expatriation: { labelFr: 'Expatriation', labelEn: 'Expatriation' },
  travel: { labelFr: 'Voyage', labelEn: 'Travel' },
  lifestyle: { labelFr: 'Lifestyle', labelEn: 'Lifestyle' },
  business: { labelFr: 'Business', labelEn: 'Business' },
  tech: { labelFr: 'Tech', labelEn: 'Tech' },
  finance: { labelFr: 'Finance', labelEn: 'Finance' },
  other: { labelFr: 'Autre', labelEn: 'Other' },
};

const BLOG_TRAFFIC_TIERS: Record<string, { labelFr: string; labelEn: string }> = {
  lt1k: { labelFr: '< 1 000 visiteurs/mois', labelEn: '< 1,000 visitors/month' },
  '1k-5k': { labelFr: '1 000 - 5 000 visiteurs/mois', labelEn: '1,000 - 5,000 visitors/month' },
  '5k-10k': { labelFr: '5 000 - 10 000 visiteurs/mois', labelEn: '5,000 - 10,000 visitors/month' },
  '10k-50k': { labelFr: '10 000 - 50 000 visiteurs/mois', labelEn: '10,000 - 50,000 visitors/month' },
  '50k-100k': { labelFr: '50 000 - 100 000 visiteurs/mois', labelEn: '50,000 - 100,000 visitors/month' },
  gt100k: { labelFr: '> 100 000 visiteurs/mois', labelEn: '> 100,000 visitors/month' },
};

const AdminBloggerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const intl = useIntl();
  const functions = getFunctions(undefined, 'europe-west1');

  const [blogger, setBlogger] = useState<Blogger | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedRecruit, setCopiedRecruit] = useState(false);

  // Fetch blogger details
  const fetchBlogger = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const adminGetBloggerDetail = httpsCallable<{ bloggerId: string }, {
        blogger: Blogger;
        recentCommissions: Commission[];
        recentWithdrawals: Withdrawal[];
      }>(functions, 'adminGetBloggerDetail');

      const result = await adminGetBloggerDetail({ bloggerId: id });
      setBlogger(result.data.blogger);
      setCommissions(result.data.recentCommissions || []);
      setWithdrawals(result.data.recentWithdrawals || []);
    } catch (err: any) {
      console.error('Error fetching blogger:', err);
      setError(err.message || 'Failed to load blogger');
    } finally {
      setLoading(false);
    }
  }, [id, functions]);

  useEffect(() => {
    fetchBlogger();
  }, [fetchBlogger]);

  // Handle status change
  const handleStatusChange = async (newStatus: 'active' | 'suspended' | 'blocked', reason?: string) => {
    if (!id) return;

    setActionLoading(true);
    try {
      const adminUpdateBloggerStatus = httpsCallable(functions, 'adminUpdateBloggerStatus');
      await adminUpdateBloggerStatus({
        bloggerId: id,
        status: newStatus,
        reason,
      });
      fetchBlogger();
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
      case 'blocked':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !blogger) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className={`${UI.card} p-8 text-center`}>
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <p className="text-red-600 dark:text-red-400">{error || 'Blogger not found'}</p>
            <button
              onClick={() => navigate('/admin/bloggers')}
              className={`${UI.button.secondary} px-4 py-2 mt-4`}
            >
              <FormattedMessage id="common.back" defaultMessage="Retour" />
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const clientLink = `https://sos-expat.com/ref/b/${blogger.affiliateCodeClient}`;
  const recruitLink = `https://sos-expat.com/rec/b/${blogger.affiliateCodeRecruitment}`;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/bloggers')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {blogger.firstName} {blogger.lastName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{blogger.email}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(blogger.status)}`}>
            {blogger.status}
          </span>
        </div>

        {/* Definitive Role Warning */}
        <div className={`${UI.card} p-4 bg-purple-50 dark:bg-purple-900/20`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <FormattedMessage
                id="admin.blogger.definitiveRole"
                defaultMessage="Rôle définitif : Ce blogueur ne peut pas devenir Chatter ou Influenceur."
              />
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="space-y-6">
            {/* Personal Info */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" />
                <FormattedMessage id="admin.blogger.profile" defaultMessage="Profil" />
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{blogger.email}</span>
                </div>
                {blogger.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{blogger.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{blogger.country} / {blogger.language}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <FormattedMessage id="admin.blogger.joined" defaultMessage="Inscrit le" /> {formatDate(blogger.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Blog Info */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                <FormattedMessage id="admin.blogger.blogInfo" defaultMessage="Informations du blog" />
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nom du blog</p>
                  <p className="font-medium text-gray-900 dark:text-white">{blogger.blogName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">URL</p>
                  <a
                    href={blogger.blogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    {blogger.blogUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Langue</p>
                    <p className="text-gray-700 dark:text-gray-300">{blogger.blogLanguage}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pays cible</p>
                    <p className="text-gray-700 dark:text-gray-300">{blogger.blogCountry}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Thématique</p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {BLOG_THEMES[blogger.blogTheme]?.labelFr || blogger.blogTheme}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Trafic</p>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-500" />
                    <p className="text-gray-700 dark:text-gray-300">
                      {BLOG_TRAFFIC_TIERS[blogger.blogTraffic]?.labelFr || blogger.blogTraffic}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Affiliate Links */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-500" />
                <FormattedMessage id="admin.blogger.links" defaultMessage="Liens d'affiliation" />
              </h2>

              <div className="space-y-4">
                {/* Client Link */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lien client ($10 fixe)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 dark:bg-white/5 px-3 py-2 rounded-lg text-xs overflow-x-auto">
                      {blogger.affiliateCodeClient}
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Lien recrutement ($5/appel)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-100 dark:bg-white/5 px-3 py-2 rounded-lg text-xs overflow-x-auto">
                      {blogger.affiliateCodeRecruitment}
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
                {blogger.status === 'suspended' ? (
                  <button
                    onClick={() => handleStatusChange('active')}
                    disabled={actionLoading}
                    className={`${UI.button.primary} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Play className="w-4 h-4" />
                    <FormattedMessage id="admin.blogger.action.activate" defaultMessage="Activer" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange('suspended', 'Admin action')}
                    disabled={actionLoading}
                    className={`${UI.button.secondary} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Pause className="w-4 h-4" />
                    <FormattedMessage id="admin.blogger.action.suspend" defaultMessage="Suspendre" />
                  </button>
                )}
                {blogger.status !== 'blocked' && (
                  <button
                    onClick={() => handleStatusChange('blocked', 'Violation of terms')}
                    disabled={actionLoading}
                    className={`${UI.button.danger} w-full px-4 py-2 flex items-center justify-center gap-2`}
                  >
                    <Ban className="w-4 h-4" />
                    <FormattedMessage id="admin.blogger.action.block" defaultMessage="Bloquer" />
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
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatAmount(blogger.availableBalance)}</p>
              </div>
              <div className={`${UI.card} p-4`}>
                <p className="text-xs text-gray-500 dark:text-gray-400">En validation</p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{formatAmount(blogger.pendingBalance + blogger.validatedBalance)}</p>
              </div>
              <div className={`${UI.card} p-4`}>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total gagné</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatAmount(blogger.totalEarned)}</p>
              </div>
              <div className={`${UI.card} p-4`}>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total retiré</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatAmount(blogger.totalWithdrawn)}</p>
              </div>
            </div>

            {/* Performance Stats */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <FormattedMessage id="admin.blogger.performance" defaultMessage="Performance" />
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Clients référés</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{blogger.totalClientsReferred}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Prestataires recrutés</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{blogger.totalProvidersRecruited}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Clics totaux</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{blogger.totalClicks}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Taux conversion</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{(blogger.conversionRate * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Gains ce mois</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatAmount(blogger.currentMonthEarnings)}</p>
                </div>
                {blogger.currentMonthRank && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Rang ce mois</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">#{blogger.currentMonthRank}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                <FormattedMessage id="admin.blogger.badges" defaultMessage="Badges" />
              </h2>
              {blogger.badges && blogger.badges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {blogger.badges.map((badge) => (
                    <span
                      key={badge}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aucun badge</p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Streak actuel</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{blogger.currentStreak} jours</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Meilleur streak</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{blogger.longestStreak} jours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Activity */}
          <div className="space-y-6">
            {/* Recent Commissions */}
            <div className={`${UI.card} p-6`}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <FormattedMessage id="admin.blogger.recentCommissions" defaultMessage="Commissions récentes" />
              </h2>
              {commissions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Aucune commission</p>
              ) : (
                <div className="space-y-3">
                  {commissions.slice(0, 5).map((commission) => (
                    <div key={commission.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {commission.type === 'client_referral' ? 'Client ($10)' : 'Recrutement ($5)'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(commission.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatAmount(commission.amount)}</p>
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
                <FormattedMessage id="admin.blogger.recentWithdrawals" defaultMessage="Retraits récents" />
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

export default AdminBloggerDetail;
