/**
 * AdminBloggersPayments - Admin page for managing blogger withdrawals
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Wallet,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  DollarSign,
  ChevronRight,
  Check,
  X,
  FileText,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens - Purple theme for Bloggers
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    success: "bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500",
} as const;

interface Withdrawal {
  id: string;
  bloggerId: string;
  bloggerName: string;
  bloggerEmail: string;
  blogName?: string;
  amount: number;
  paymentMethod: string;
  paymentDetails: any;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';
  rejectionReason?: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
}

interface WithdrawalListResponse {
  withdrawals: Withdrawal[];
  total: number;
  page: number;
  limit: number;
  stats?: {
    pendingCount: number;
    pendingAmount: number;
    completedThisMonth: number;
    completedAmountThisMonth: number;
  };
}

type StatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';

const AdminBloggersPayments: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const functions = getFunctions(undefined, 'europe-west2');

  // State
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<WithdrawalListResponse['stats']>();

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const limit = 20;

  // Fetch withdrawals
  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetBloggerWithdrawals = httpsCallable<any, WithdrawalListResponse>(
        functions,
        'adminGetBloggerWithdrawals'
      );

      const result = await adminGetBloggerWithdrawals({
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
        includeStats: page === 1,
      });

      setWithdrawals(result.data.withdrawals);
      setTotal(result.data.total);
      if (result.data.stats) {
        setStats(result.data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching withdrawals:', err);
      setError(err.message || 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery, functions]);

  useEffect(() => {
    fetchWithdrawals();
  }, [page, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchWithdrawals();
      } else {
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Format amount
  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(intl.locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'processing':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Handle approve
  const handleApprove = async (withdrawalId: string) => {
    setActionLoading(withdrawalId);
    try {
      const adminProcessBloggerWithdrawal = httpsCallable(functions, 'adminProcessBloggerWithdrawal');
      await adminProcessBloggerWithdrawal({
        withdrawalId,
        action: 'approve',
      });
      fetchWithdrawals();
    } catch (err: any) {
      console.error('Approve error:', err);
      setError(err.message || 'Failed to approve withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle complete
  const handleComplete = async (withdrawalId: string, transactionId?: string) => {
    setActionLoading(withdrawalId);
    try {
      const adminProcessBloggerWithdrawal = httpsCallable(functions, 'adminProcessBloggerWithdrawal');
      await adminProcessBloggerWithdrawal({
        withdrawalId,
        action: 'complete',
        transactionId,
      });
      fetchWithdrawals();
    } catch (err: any) {
      console.error('Complete error:', err);
      setError(err.message || 'Failed to complete withdrawal');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!showRejectModal || !rejectReason) return;

    setActionLoading(showRejectModal);
    try {
      const adminProcessBloggerWithdrawal = httpsCallable(functions, 'adminProcessBloggerWithdrawal');
      await adminProcessBloggerWithdrawal({
        withdrawalId: showRejectModal,
        action: 'reject',
        reason: rejectReason,
      });
      setShowRejectModal(null);
      setRejectReason('');
      fetchWithdrawals();
    } catch (err: any) {
      console.error('Reject error:', err);
      setError(err.message || 'Failed to reject withdrawal');
    } finally {
      setActionLoading(null);
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
              <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
              <FormattedMessage id="admin.bloggers.payments.title" defaultMessage="Paiements Blogueurs" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.bloggers.payments.subtitle"
                defaultMessage="Gérer les demandes de retrait"
              />
            </p>
          </div>

          <button
            onClick={fetchWithdrawals}
            className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
            </span>
          </button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.payments.pending" defaultMessage="En attente" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.pendingCount}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.payments.pendingAmount" defaultMessage="Montant en attente" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {formatAmount(stats.pendingAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${UI.card} p-3 sm:p-4`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                    <FormattedMessage id="admin.payments.completedMonth" defaultMessage="Payés (mois)" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {stats.completedThisMonth}
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
                    <FormattedMessage id="admin.payments.paidMonth" defaultMessage="Versé (mois)" />
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {formatAmount(stats.completedAmountThisMonth)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={`${UI.card} p-3 sm:p-4`}>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.payments.search', defaultMessage: 'Rechercher par nom, email, blog...' })}
                className={`${UI.input} pl-10 text-sm sm:text-base`}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className={`${UI.select} text-sm`}
              >
                <option value="all">{intl.formatMessage({ id: 'admin.payments.filter.all', defaultMessage: 'Tous' })}</option>
                <option value="pending">{intl.formatMessage({ id: 'admin.payments.filter.pending', defaultMessage: 'En attente' })}</option>
                <option value="processing">{intl.formatMessage({ id: 'admin.payments.filter.processing', defaultMessage: 'En cours' })}</option>
                <option value="completed">{intl.formatMessage({ id: 'admin.payments.filter.completed', defaultMessage: 'Terminés' })}</option>
                <option value="rejected">{intl.formatMessage({ id: 'admin.payments.filter.rejected', defaultMessage: 'Rejetés' })}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20`}>
            <p className="text-red-600 dark:text-red-400 text-sm sm:text-base">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Withdrawals List */}
            <div className={`${UI.card} overflow-hidden`}>
              {withdrawals.length === 0 ? (
                <div className="p-8 text-center">
                  <Wallet className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="admin.payments.empty" defaultMessage="Aucune demande de retrait" />
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Blogueur
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Montant
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                          Méthode
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                          Date
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {withdrawals.map((withdrawal) => (
                        <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                                {withdrawal.bloggerName?.[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                                  {withdrawal.bloggerName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px] sm:max-w-[150px]">
                                  {withdrawal.blogName || withdrawal.bloggerEmail}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className="font-bold text-gray-900 dark:text-white">
                              {formatAmount(withdrawal.amount)}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {withdrawal.paymentMethod}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                              {getStatusIcon(withdrawal.status)}
                              <span className="hidden sm:inline">{withdrawal.status}</span>
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden lg:table-cell">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(withdrawal.requestedAt)}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              {withdrawal.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(withdrawal.id)}
                                    disabled={actionLoading === withdrawal.id}
                                    className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg"
                                    title="Approuver"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setShowRejectModal(withdrawal.id)}
                                    disabled={actionLoading === withdrawal.id}
                                    className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg"
                                    title="Rejeter"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {withdrawal.status === 'processing' && (
                                <button
                                  onClick={() => handleComplete(withdrawal.id)}
                                  disabled={actionLoading === withdrawal.id}
                                  className={`${UI.button.success} px-2 py-1 text-xs`}
                                >
                                  Marquer payé
                                </button>
                              )}
                              <button
                                onClick={() => navigate(`/admin/bloggers/${withdrawal.bloggerId}`)}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                              >
                                <ChevronRight className="w-4 h-4 text-gray-400" />
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
                  Page {page} sur {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`${UI.button.secondary} px-3 py-1 text-sm disabled:opacity-50`}
                  >
                    <FormattedMessage id="common.previous" defaultMessage="Préc." />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`${UI.button.secondary} px-3 py-1 text-sm disabled:opacity-50`}
                  >
                    <FormattedMessage id="common.next" defaultMessage="Suiv." />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${UI.card} w-full max-w-md p-6`}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="admin.payments.reject.title" defaultMessage="Rejeter la demande" />
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={intl.formatMessage({ id: 'admin.payments.reject.placeholder', defaultMessage: 'Raison du rejet...' })}
              className={`${UI.input} h-24 resize-none mb-4`}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className={`${UI.button.secondary} flex-1 px-4 py-2`}
              >
                <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason || actionLoading === showRejectModal}
                className={`${UI.button.danger} flex-1 px-4 py-2 disabled:opacity-50`}
              >
                {actionLoading === showRejectModal ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <FormattedMessage id="admin.payments.reject.confirm" defaultMessage="Rejeter" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBloggersPayments;
