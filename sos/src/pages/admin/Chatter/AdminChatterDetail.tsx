/**
 * AdminChatterDetail - Admin page for viewing and managing a single chatter
 * Shows detailed info, commissions, withdrawals, and admin actions
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  ArrowLeft,
  User,
  Star,
  Flame,
  Wallet,
  Users,
  Phone,
  Mail,
  Globe,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Ban,
  PlayCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
    success: "bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all",
  },
} as const;

interface ChatterDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  languages: string[];
  status: string;
  level: number;
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalClientConversions: number;
  totalRecruitmentConversions: number;
  currentStreak: number;
  bestStreak: number;
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
  recruiterCode?: string;
  suspendedAt?: string;
  suspendReason?: string;
  createdAt: string;
  quizPassedAt?: string;
  commissions: any[];
  withdrawals: any[];
}

const AdminChatterDetail: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { chatterId } = useParams<{ chatterId: string }>();
  const functions = getFunctions(undefined, 'europe-west1');

  const [chatter, setChatter] = useState<ChatterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch chatter detail
  const fetchChatter = async () => {
    if (!chatterId) return;

    setLoading(true);
    setError(null);

    try {
      const adminGetChatterDetail = httpsCallable<{ chatterId: string }, ChatterDetail>(
        functions,
        'adminGetChatterDetail'
      );

      const result = await adminGetChatterDetail({ chatterId });
      setChatter(result.data);
    } catch (err: any) {
      console.error('Error fetching chatter:', err);
      setError(err.message || 'Failed to load chatter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChatter();
  }, [chatterId]);

  // Format amount
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents);
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

  // Handle status change
  const handleStatusChange = async (newStatus: string, reason?: string) => {
    if (!chatterId || !chatter) return;

    setActionLoading(true);

    try {
      const adminUpdateChatterStatus = httpsCallable(functions, 'adminUpdateChatterStatus');
      await adminUpdateChatterStatus({
        chatterId,
        status: newStatus,
        reason,
      });

      // Refresh data
      await fetchChatter();
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert(err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
      case 'quiz_required':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'suspended':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'banned':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (error || !chatter) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/admin/chatters')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <FormattedMessage id="common.back" defaultMessage="Retour" />
        </button>

        <div className={`${UI.card} p-8 text-center`}>
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{error || 'Chatter not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/chatters')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="w-4 h-4" />
        <FormattedMessage id="common.back" defaultMessage="Retour" />
      </button>

      {/* Header */}
      <div className={`${UI.card} p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
              {chatter.firstName?.[0]}{chatter.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {chatter.firstName} {chatter.lastName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(chatter.status)}`}>
                  {chatter.status}
                </span>
                <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Star className="w-4 h-4 text-amber-500" />
                  {getLevelName(chatter.level)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchChatter}
              className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {chatter.status === 'active' && (
              <button
                onClick={() => {
                  const reason = prompt('Raison de la suspension:');
                  if (reason) handleStatusChange('suspended', reason);
                }}
                disabled={actionLoading}
                className={`${UI.button.danger} px-4 py-2 flex items-center gap-2`}
              >
                <Ban className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.suspend" defaultMessage="Suspendre" />
              </button>
            )}

            {chatter.status === 'suspended' && (
              <button
                onClick={() => handleStatusChange('active')}
                disabled={actionLoading}
                className={`${UI.button.success} px-4 py-2 flex items-center gap-2`}
              >
                <PlayCircle className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.reactivate" defaultMessage="Réactiver" />
              </button>
            )}

            {chatter.status !== 'banned' && (
              <button
                onClick={() => {
                  if (confirm('Êtes-vous sûr de vouloir bannir ce chatter ?')) {
                    handleStatusChange('banned', 'Banni par admin');
                  }
                }}
                disabled={actionLoading}
                className={`${UI.button.danger} px-4 py-2 flex items-center gap-2`}
              >
                <XCircle className="w-4 h-4" />
                <FormattedMessage id="admin.chatters.ban" defaultMessage="Bannir" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className={`${UI.card} p-6`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="admin.chatters.contact" defaultMessage="Contact" />
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{chatter.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{chatter.phone || '-'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">{chatter.country}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {new Date(chatter.createdAt).toLocaleDateString(intl.locale)}
              </span>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className={`${UI.card} p-6`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="admin.chatters.balance" defaultMessage="Solde" />
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Disponible</span>
              <span className="font-semibold text-green-600">{formatAmount(chatter.availableBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Validé</span>
              <span className="font-medium">{formatAmount(chatter.validatedBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">En attente</span>
              <span className="font-medium text-amber-600">{formatAmount(chatter.pendingBalance)}</span>
            </div>
            <hr className="border-gray-200 dark:border-white/10" />
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total gagné</span>
              <span className="font-bold text-lg">{formatAmount(chatter.totalEarned)}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={`${UI.card} p-6`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="admin.chatters.stats" defaultMessage="Statistiques" />
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Clients convertis</span>
              <span className="font-semibold">{chatter.totalClientConversions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Prestataires recrutés</span>
              <span className="font-semibold">{chatter.totalRecruitmentConversions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">Streak actuel</span>
              <span className="flex items-center gap-1 font-semibold">
                <Flame className={`w-4 h-4 ${chatter.currentStreak > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
                {chatter.currentStreak}j
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Record streak</span>
              <span className="font-semibold">{chatter.bestStreak}j</span>
            </div>
          </div>
        </div>
      </div>

      {/* Affiliate Codes */}
      <div className={`${UI.card} p-6`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          <FormattedMessage id="admin.chatters.codes" defaultMessage="Codes affiliés" />
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Code Client</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {chatter.affiliateCodeClient || '-'}
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Code Recrutement</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {chatter.affiliateCodeRecruitment || '-'}
            </p>
          </div>
        </div>
        {chatter.recruiterCode && (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Recruté par: <span className="font-medium">{chatter.recruiterCode}</span>
          </p>
        )}
      </div>

      {/* Recent Commissions */}
      <div className={`${UI.card} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            <FormattedMessage id="admin.chatters.recentCommissions" defaultMessage="Commissions récentes" />
          </h3>
        </div>
        {chatter.commissions?.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FormattedMessage id="admin.chatters.noCommissions" defaultMessage="Aucune commission" />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {chatter.commissions?.slice(0, 10).map((c: any) => (
              <div key={c.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {c.type === 'client' ? 'Commission Client' : 'Commission Recrutement'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString(intl.locale)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">+{formatAmount(c.amount)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatterDetail;
