/**
 * AdminPartnersPayments - Premium 2026 withdrawal management for partners
 *
 * Features:
 * - Stats summary cards (pending count/amount, completed this month)
 * - Status filter tabs + search
 * - Approve/reject actions with rejection reason modal
 * - Navigate to partner detail on click
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  Wallet,
  Loader2,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Search,
  DollarSign,
  Clock,
  CheckCircle,
  Filter,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    success: "bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl px-3 py-1.5 transition-all active:scale-[0.98]",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl px-3 py-1.5 transition-all active:scale-[0.98]",
  },
  input: "w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 dark:text-white",
  badge: {
    pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    approved: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    processing: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
    completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface Withdrawal {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  websiteName: string;
  amount: number;
  withdrawalFee: number;
  totalDebited: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';
  paymentMethod: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

type StatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';

interface WithdrawalsResponse {
  withdrawals: Withdrawal[];
  stats?: {
    pendingCount: number;
    pendingAmount: number;
    completedThisMonth: number;
    completedAmountThisMonth: number;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

const AdminPartnersPayments: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<WithdrawalsResponse['stats']>();

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const getBadgeClass = (status: string) => {
    const base = (UI.badge as Record<string, string>)[status] || UI.badge.pending;
    return `${base} px-2.5 py-0.5 rounded-full text-xs font-medium`;
  };

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<any, WithdrawalsResponse>(functions, 'paymentAdminGetPending');
      const res = await fn({ userType: 'partner', status: statusFilter === 'all' ? undefined : statusFilter });
      setWithdrawals(res.data.withdrawals || []);
      if (res.data.stats) setStats(res.data.stats);
    } catch (err: any) {
      console.error('Error fetching withdrawals:', err);
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

  const handleApprove = async (withdrawalId: string) => {
    setActionLoading(withdrawalId);
    try {
      const fn = httpsCallable(functions, 'paymentAdminApprove');
      await fn({ withdrawalId });
      toast.success(intl.formatMessage({ id: 'admin.partners.payments.approved', defaultMessage: 'Retrait approuve' }));
      fetchWithdrawals();
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (withdrawalId: string) => {
    if (!rejectReason.trim()) {
      toast.error(intl.formatMessage({ id: 'admin.partners.payments.reasonRequired', defaultMessage: 'Raison requise' }));
      return;
    }
    setActionLoading(withdrawalId);
    try {
      const fn = httpsCallable(functions, 'paymentAdminReject');
      await fn({ withdrawalId, reason: rejectReason });
      toast.success(intl.formatMessage({ id: 'admin.partners.payments.rejected', defaultMessage: 'Retrait rejete' }));
      setShowRejectModal(null);
      setRejectReason('');
      fetchWithdrawals();
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  // Client-side search filter
  const filtered = withdrawals.filter(w => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return w.partnerName?.toLowerCase().includes(q) || w.partnerEmail?.toLowerCase().includes(q) || w.websiteName?.toLowerCase().includes(q);
  });

  const STATUS_FILTERS: { value: StatusFilter; labelId: string; defaultLabel: string }[] = [
    { value: 'all', labelId: 'admin.partners.payments.filter.all', defaultLabel: 'Tous' },
    { value: 'pending', labelId: 'admin.partners.payments.filter.pending', defaultLabel: 'En attente' },
    { value: 'processing', labelId: 'admin.partners.payments.filter.processing', defaultLabel: 'En cours' },
    { value: 'completed', labelId: 'admin.partners.payments.filter.completed', defaultLabel: 'Termines' },
    { value: 'rejected', labelId: 'admin.partners.payments.filter.rejected', defaultLabel: 'Rejetes' },
    { value: 'failed', labelId: 'admin.partners.payments.filter.failed', defaultLabel: 'Echoues' },
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-teal-500" />
              </div>
              <FormattedMessage id="admin.partners.payments.title" defaultMessage="Retraits Partenaires" />
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">
              <FormattedMessage id="admin.partners.payments.subtitle" defaultMessage="Examiner et traiter les demandes de retrait" />
            </p>
          </div>
          <button onClick={fetchWithdrawals} disabled={loading} className={`${UI.button.secondary} flex items-center gap-2 text-sm`}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <FormattedMessage id="common.refresh" defaultMessage="Rafraichir" />
          </button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Clock, label: intl.formatMessage({ id: 'admin.partners.payments.pendingCount', defaultMessage: 'En attente' }), value: stats.pendingCount, color: 'text-amber-500', bg: 'from-amber-500/20 to-orange-500/20' },
              { icon: DollarSign, label: intl.formatMessage({ id: 'admin.partners.payments.pendingAmount', defaultMessage: 'Montant en attente' }), value: formatAmount(stats.pendingAmount), color: 'text-amber-500', bg: 'from-amber-500/20 to-orange-500/20' },
              { icon: CheckCircle, label: intl.formatMessage({ id: 'admin.partners.payments.completedMonth', defaultMessage: 'Termines ce mois' }), value: stats.completedThisMonth, color: 'text-green-500', bg: 'from-green-500/20 to-emerald-500/20' },
              { icon: DollarSign, label: intl.formatMessage({ id: 'admin.partners.payments.paidMonth', defaultMessage: 'Paye ce mois' }), value: formatAmount(stats.completedAmountThisMonth), color: 'text-green-500', bg: 'from-green-500/20 to-emerald-500/20' },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className={UI.card + ' p-4'}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.bg} flex items-center justify-center`}>
                      <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_FILTERS.map(s => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === s.value
                    ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                <FormattedMessage id={s.labelId} defaultMessage={s.defaultLabel} />
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className={`${UI.input} pl-10 text-sm`}
              placeholder={intl.formatMessage({ id: 'admin.partners.payments.search', defaultMessage: 'Rechercher...' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        {error ? (
          <div className={UI.card + ' p-8 text-center'}>
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
            <button onClick={fetchWithdrawals} className={`${UI.button.secondary} inline-flex items-center gap-2 text-sm`}>
              <RefreshCw className="w-4 h-4" /> <FormattedMessage id="common.retry" defaultMessage="Reessayer" />
            </button>
          </div>
        ) : loading ? (
          <div className={UI.card + ' p-16 flex items-center justify-center'}>
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={UI.card + ' p-16 text-center'}>
            <Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.partners.payments.empty" defaultMessage="Aucune demande de retrait" />
            </p>
          </div>
        ) : (
          <div className={UI.card + ' overflow-hidden'}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.payments.table.date" defaultMessage="Date" /></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.payments.table.partner" defaultMessage="Partenaire" /></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.payments.table.website" defaultMessage="Site" /></th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.payments.table.amount" defaultMessage="Montant" /></th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.payments.table.fee" defaultMessage="Frais" /></th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.payments.table.total" defaultMessage="Total" /></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.payments.table.method" defaultMessage="Methode" /></th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.payments.table.status" defaultMessage="Statut" /></th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.payments.table.actions" defaultMessage="Actions" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filtered.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{new Date(w.createdAt).toLocaleDateString(intl.locale)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/admin/partners/${w.partnerId}`)} className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline">{w.partnerName}</button>
                        <p className="text-xs text-gray-500">{w.partnerEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{w.websiteName}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900 dark:text-white">{formatAmount(w.amount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">{formatAmount(w.withdrawalFee)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-gray-900 dark:text-white">{formatAmount(w.totalDebited)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{w.paymentMethod}</td>
                      <td className="px-4 py-3 text-center"><span className={getBadgeClass(w.status)}>{w.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        {(w.status === 'pending' || w.status === 'processing') && (
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => handleApprove(w.id)}
                              disabled={actionLoading === w.id}
                              className={`${UI.button.success} flex items-center gap-1 text-xs`}
                              title={intl.formatMessage({ id: 'admin.partners.payments.approve', defaultMessage: 'Approuver' })}
                            >
                              {actionLoading === w.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              <FormattedMessage id="admin.partners.payments.approve" defaultMessage="Approuver" />
                            </button>
                            <button
                              onClick={() => setShowRejectModal(w.id)}
                              className={`${UI.button.danger} flex items-center gap-1 text-xs`}
                              title={intl.formatMessage({ id: 'admin.partners.payments.reject', defaultMessage: 'Rejeter' })}
                            >
                              <X className="w-3 h-3" />
                              <FormattedMessage id="admin.partners.payments.reject" defaultMessage="Rejeter" />
                            </button>
                          </div>
                        )}
                        {w.rejectionReason && (
                          <p className="text-xs text-gray-500 italic mt-1 max-w-[120px] truncate" title={w.rejectionReason}>{w.rejectionReason}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setShowRejectModal(null); setRejectReason(''); }}>
            <div className={`${UI.card} p-6 w-full max-w-md space-y-4`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white"><FormattedMessage id="admin.partners.payments.rejectTitle" defaultMessage="Rejeter le retrait" /></h3>
                <button onClick={() => { setShowRejectModal(null); setRejectReason(''); }} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <textarea rows={3} className={UI.input} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={intl.formatMessage({ id: 'admin.partners.payments.rejectReason', defaultMessage: 'Raison du rejet...' })} />
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowRejectModal(null); setRejectReason(''); }} className={`${UI.button.secondary} text-sm`}><FormattedMessage id="common.cancel" defaultMessage="Annuler" /></button>
                <button onClick={() => handleReject(showRejectModal)} disabled={actionLoading === showRejectModal} className="bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98] text-sm flex items-center gap-2">
                  {actionLoading === showRejectModal && <Loader2 className="w-4 h-4 animate-spin" />}
                  <FormattedMessage id="admin.partners.payments.confirmReject" defaultMessage="Rejeter" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPartnersPayments;
