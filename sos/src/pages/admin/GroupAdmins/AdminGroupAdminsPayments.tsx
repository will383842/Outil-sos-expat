/**
 * AdminGroupAdminsPayments - Admin page for managing GroupAdmin withdrawal requests
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  User,
  ExternalLink,
  Facebook,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    success: "bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
} as const;

interface Withdrawal {
  id: string;
  groupAdminId: string;
  groupAdminName: string;
  groupAdminEmail: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paymentDetails: Record<string, string>;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface WithdrawalStats {
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  completedThisMonth: number;
  completedAmountThisMonth: number;
}

const AdminGroupAdminsPayments: React.FC = () => {
  const functions = getFunctions(undefined, 'europe-west2');
  const intl = useIntl();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const getWithdrawals = httpsCallable(functions, 'adminGetGroupAdminWithdrawalsList');
      const result = await getWithdrawals({ status: statusFilter !== 'all' ? statusFilter : undefined });
      const data = result.data as { withdrawals: Withdrawal[]; stats: WithdrawalStats };
      setWithdrawals(data.withdrawals);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
      setError(intl.formatMessage({ id: 'groupAdmin.admin.payments.error' }));
    } finally {
      setLoading(false);
    }
  }, [functions, statusFilter]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleApprove = async (withdrawal: Withdrawal) => {
    setProcessingId(withdrawal.id);
    try {
      const processWithdrawal = httpsCallable(functions, 'adminProcessGroupAdminWithdrawal');
      await processWithdrawal({
        withdrawalId: withdrawal.id,
        action: 'approve',
      });
      fetchWithdrawals();
    } catch (err) {
      console.error('Error approving withdrawal:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (withdrawal: Withdrawal) => {
    const reason = window.prompt(intl.formatMessage({ id: 'groupAdmin.admin.payments.rejectionPrompt' }));
    if (!reason) return;

    setProcessingId(withdrawal.id);
    try {
      const processWithdrawal = httpsCallable(functions, 'adminProcessGroupAdminWithdrawal');
      await processWithdrawal({
        withdrawalId: withdrawal.id,
        action: 'reject',
        reason,
      });
      fetchWithdrawals();
    } catch (err) {
      console.error('Error rejecting withdrawal:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (withdrawal: Withdrawal) => {
    setProcessingId(withdrawal.id);
    try {
      const processWithdrawal = httpsCallable(functions, 'adminProcessGroupAdminWithdrawal');
      await processWithdrawal({
        withdrawalId: withdrawal.id,
        action: 'complete',
      });
      fetchWithdrawals();
    } catch (err) {
      console.error('Error completing withdrawal:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3" />
            {intl.formatMessage({ id: 'groupAdmin.admin.payments.status.pending' })}
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle className="w-3 h-3" />
            {intl.formatMessage({ id: 'groupAdmin.admin.payments.status.approved' })}
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            {intl.formatMessage({ id: 'groupAdmin.admin.payments.status.processing' })}
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            {intl.formatMessage({ id: 'groupAdmin.admin.payments.status.completed' })}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            {intl.formatMessage({ id: 'groupAdmin.admin.payments.status.rejected' })}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Facebook className="w-6 h-6 text-blue-500" />
              <FormattedMessage id="groupAdmin.admin.payments" defaultMessage="GroupAdmin Withdrawals" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {intl.formatMessage({ id: 'groupAdmin.admin.payments.description' })}
            </p>
          </div>
          <button onClick={fetchWithdrawals} className={`${UI.button.secondary} p-2`}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.payments.stats.pending' })}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {stats.pendingCount} ({formatAmount(stats.pendingAmount)})
                  </p>
                </div>
              </div>
            </div>
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.payments.stats.approved' })}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {stats.approvedCount} ({formatAmount(stats.approvedAmount)})
                  </p>
                </div>
              </div>
            </div>
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.payments.stats.completedThisMonth' })}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {stats.completedThisMonth} ({formatAmount(stats.completedAmountThisMonth)})
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className={UI.card + " p-4"}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={UI.select}
          >
            <option value="all">{intl.formatMessage({ id: 'groupAdmin.admin.payments.filter.all' })}</option>
            <option value="pending">{intl.formatMessage({ id: 'groupAdmin.admin.payments.filter.pending' })}</option>
            <option value="approved">{intl.formatMessage({ id: 'groupAdmin.admin.payments.filter.approved' })}</option>
            <option value="processing">{intl.formatMessage({ id: 'groupAdmin.admin.payments.filter.processing' })}</option>
            <option value="completed">{intl.formatMessage({ id: 'groupAdmin.admin.payments.filter.completed' })}</option>
            <option value="rejected">{intl.formatMessage({ id: 'groupAdmin.admin.payments.filter.rejected' })}</option>
          </select>
        </div>

        {/* Table */}
        <div className={UI.card + " overflow-hidden"}>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-12 text-red-500">
              <AlertTriangle className="w-6 h-6 mr-2" />
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {intl.formatMessage({ id: 'groupAdmin.admin.payments.col.groupAdmin' })}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {intl.formatMessage({ id: 'groupAdmin.admin.payments.col.amount' })}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {intl.formatMessage({ id: 'groupAdmin.admin.payments.col.method' })}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {intl.formatMessage({ id: 'groupAdmin.admin.payments.col.status' })}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {intl.formatMessage({ id: 'groupAdmin.admin.payments.col.requested' })}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      {intl.formatMessage({ id: 'groupAdmin.admin.payments.col.actions' })}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {withdrawals.map(withdrawal => (
                    <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-8 h-8 p-1.5 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {withdrawal.groupAdminName}
                            </p>
                            <p className="text-sm text-gray-500">{withdrawal.groupAdminEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-lg text-green-600">
                          {formatAmount(withdrawal.amount)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {withdrawal.paymentMethod}
                          </p>
                          {withdrawal.paymentDetails?.email && (
                            <p className="text-sm text-gray-500">{withdrawal.paymentDetails.email}</p>
                          )}
                          {withdrawal.paymentDetails?.phone && (
                            <p className="text-sm text-gray-500">{withdrawal.paymentDetails.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(withdrawal.status)}
                        {withdrawal.rejectionReason && (
                          <p className="text-xs text-red-500 mt-1">{withdrawal.rejectionReason}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-500">{formatDate(withdrawal.requestedAt)}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {withdrawal.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(withdrawal)}
                                disabled={processingId === withdrawal.id}
                                className={`${UI.button.success} px-3 py-1 text-sm`}
                              >
                                {processingId === withdrawal.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  intl.formatMessage({ id: 'groupAdmin.admin.payments.approve' })
                                )}
                              </button>
                              <button
                                onClick={() => handleReject(withdrawal)}
                                disabled={processingId === withdrawal.id}
                                className={`${UI.button.danger} px-3 py-1 text-sm`}
                              >
                                {intl.formatMessage({ id: 'groupAdmin.admin.payments.reject' })}
                              </button>
                            </>
                          )}
                          {withdrawal.status === 'approved' && (
                            <button
                              onClick={() => handleComplete(withdrawal)}
                              disabled={processingId === withdrawal.id}
                              className={`${UI.button.primary} px-3 py-1 text-sm`}
                            >
                              {processingId === withdrawal.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                intl.formatMessage({ id: 'groupAdmin.admin.payments.markComplete' })
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {withdrawals.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                  <DollarSign className="w-12 h-12 mb-4 opacity-50" />
                  <p>{intl.formatMessage({ id: 'groupAdmin.admin.payments.noWithdrawals' })}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminsPayments;
