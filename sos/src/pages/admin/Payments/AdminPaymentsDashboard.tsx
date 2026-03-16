/**
 * AdminPaymentsDashboard.tsx
 *
 * Centralized admin dashboard for managing ALL withdrawal requests across all roles.
 * Two main tabs: "Demandes en cours" (active) and "Paiements traités" (completed/terminal).
 * Uses backend callable functions for proper audit trail and balance management.
 *
 * Supports: chatter, influencer, blogger, group_admin, affiliate, partner, client, lawyer, expat
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import AdminLayout from '../../../components/admin/AdminLayout';
import Button from '../../../components/common/Button';
import toast from 'react-hot-toast';
import {
  Clock,
  CheckCircle,
  RefreshCw,
  Download,
  TrendingUp,
  Search,
  Eye,
  Loader2,
  Send,
  Ban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Banknote,
  FileCheck,
  Inbox,
  Archive,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PaymentUserType, WithdrawalStatus, STATUS_COLORS } from '../../../types/payment';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { StatusType } from '@/components/admin/StatusBadge';

// ============================================================================
// TYPES
// ============================================================================

interface UnifiedWithdrawal {
  id: string;
  userType: PaymentUserType;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  withdrawalFee?: number;
  totalDebited?: number;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate?: number;
  convertedAmount?: number;
  status: WithdrawalStatus;
  paymentMethod: string;
  provider?: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
  failureReason?: string;
  errorMessage?: string;
  paymentReference?: string;
  providerTransactionId?: string;
  telegramConfirmationPending?: boolean;
  statusHistory?: Array<{ status: string; timestamp: string; note?: string }>;
}

interface WithdrawalStats {
  pending: { count: number; amount: number };
  processing: { count: number; amount: number };
  completed30d: { count: number; amount: number };
  failed30d: { count: number; amount: number };
  successRate: number;
}

interface PendingResponse {
  withdrawals: UnifiedWithdrawal[];
  total: number;
  hasMore: boolean;
  summary: {
    pendingCount: number;
    pendingAmount: number;
    validatingCount: number;
    approvedCount: number;
    processingCount: number;
  };
}

type MainTab = 'active' | 'completed';
type SortField = 'requestedAt' | 'amount' | 'status' | 'userType';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE = 25;

// Active statuses (demandes en cours)
const ACTIVE_STATUSES: WithdrawalStatus[] = ['pending', 'validating', 'approved', 'queued', 'processing', 'sent'];
// Terminal statuses (paiements traités)
const TERMINAL_STATUSES: WithdrawalStatus[] = ['completed', 'failed', 'rejected', 'cancelled'];

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

const withdrawalStatusMap: Record<WithdrawalStatus, { statusType: StatusType; labelKey: string }> = {
  pending: { statusType: 'pending', labelKey: 'admin.withdrawals.status.pending' },
  validating: { statusType: 'validating', labelKey: 'admin.withdrawals.status.validating' },
  approved: { statusType: 'approved', labelKey: 'admin.withdrawals.status.approved' },
  queued: { statusType: 'queued', labelKey: 'admin.withdrawals.status.queued' },
  processing: { statusType: 'processing', labelKey: 'admin.withdrawals.status.processing' },
  sent: { statusType: 'sent', labelKey: 'admin.withdrawals.status.sent' },
  completed: { statusType: 'paid', labelKey: 'admin.withdrawals.status.completed' },
  failed: { statusType: 'failed', labelKey: 'admin.withdrawals.status.failed' },
  rejected: { statusType: 'rejected', labelKey: 'admin.withdrawals.status.rejected' },
  cancelled: { statusType: 'cancelled', labelKey: 'admin.withdrawals.status.cancelled' },
};

const WithdrawalStatusBadge: React.FC<{ status: WithdrawalStatus }> = ({ status }) => {
  const intl = useIntl();
  const { statusType, labelKey } = withdrawalStatusMap[status] || withdrawalStatusMap.pending;
  const label = intl.formatMessage({ id: labelKey, defaultMessage: status });
  return <StatusBadge status={statusType} label={label} size="sm" />;
};

// ============================================================================
// USER TYPE BADGE COMPONENT
// ============================================================================

const USER_TYPE_CONFIG: Record<PaymentUserType, { color: string; label: string }> = {
  chatter: { color: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700', label: 'Chatter' },
  influencer: { color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700', label: 'Influencer' },
  blogger: { color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700', label: 'Blogger' },
  group_admin: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700', label: 'Admin Groupe' },
  affiliate: { color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700', label: 'Affilié' },
  partner: { color: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700', label: 'Partenaire' },
  client: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700', label: 'Client' },
  lawyer: { color: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700', label: 'Avocat' },
  expat: { color: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700', label: 'Expatrié' },
  captain: { color: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700', label: 'Capitaine' },
};

const UserTypeBadge: React.FC<{ userType: PaymentUserType }> = ({ userType }) => {
  const { color, label } = USER_TYPE_CONFIG[userType] || USER_TYPE_CONFIG.chatter;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
};

// ============================================================================
// REJECTION MODAL
// ============================================================================

const RejectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isProcessing: boolean;
}> = ({ isOpen, onClose, onConfirm, isProcessing }) => {
  const intl = useIntl();
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <FormattedMessage id="admin.withdrawals.rejectModal.title" defaultMessage="Rejeter le retrait" />
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <FormattedMessage
            id="admin.withdrawals.rejectModal.description"
            defaultMessage="Le solde sera automatiquement restauré. Veuillez indiquer la raison du rejet."
          />
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={intl.formatMessage({ id: 'admin.withdrawals.rejectModal.placeholder', defaultMessage: 'Raison du rejet...' })}
          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          rows={3}
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
          </Button>
          <Button
            variant="danger"
            onClick={() => { onConfirm(reason); setReason(''); }}
            disabled={!reason.trim() || isProcessing}
            loading={isProcessing}
          >
            <FormattedMessage id="admin.withdrawals.rejectModal.confirm" defaultMessage="Confirmer le rejet" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MARK AS PAID MODAL
// ============================================================================

const MarkAsPaidModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (externalRef: string, note: string) => void;
  isProcessing: boolean;
}> = ({ isOpen, onClose, onConfirm, isProcessing }) => {
  const intl = useIntl();
  const [externalRef, setExternalRef] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <FormattedMessage id="admin.withdrawals.markPaidModal.title" defaultMessage="Marquer comme payé" />
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <FormattedMessage
            id="admin.withdrawals.markPaidModal.description"
            defaultMessage="Confirmez le paiement manuel avec la référence de la transaction."
          />
        </p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="admin.withdrawals.markPaidModal.reference" defaultMessage="Référence de transaction" />
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder="Ex: TXN-123456, VIREMENT-2026-001..."
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="admin.withdrawals.markPaidModal.note" defaultMessage="Note (optionnel)" />
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={intl.formatMessage({ id: 'admin.withdrawals.markPaidModal.notePlaceholder', defaultMessage: 'Notes additionnelles...' })}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={2}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
          </Button>
          <Button
            onClick={() => { onConfirm(externalRef.trim(), note.trim()); setExternalRef(''); setNote(''); }}
            disabled={!externalRef.trim() || isProcessing}
            loading={isProcessing}
          >
            <CheckCircle size={16} className="mr-2" />
            <FormattedMessage id="admin.withdrawals.markPaidModal.confirm" defaultMessage="Confirmer le paiement" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminPaymentsDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Main tabs
  const initialTab = (searchParams.get('tab') as MainTab) || 'active';
  const initialUserType = (searchParams.get('userType') as PaymentUserType | 'all') || 'all';
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);

  // State
  const [withdrawals, setWithdrawals] = useState<UnifiedWithdrawal[]>([]);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [summary, setSummary] = useState<PendingResponse['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | 'all'>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<PaymentUserType | 'all'>(initialUserType);
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('requestedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modals
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; withdrawalId: string }>({
    isOpen: false, withdrawalId: '',
  });
  const [markPaidModal, setMarkPaidModal] = useState<{ isOpen: boolean; withdrawalId: string }>({
    isOpen: false, withdrawalId: '',
  });

  // ============================================================================
  // CALLABLE REFERENCES
  // ============================================================================

  const getPendingFn = useMemo(() => httpsCallable<any, PendingResponse>(functions, 'paymentAdminGetPending'), []);
  const approveFn = useMemo(() => httpsCallable<any, any>(functions, 'paymentAdminApprove'), []);
  const rejectFn = useMemo(() => httpsCallable<any, any>(functions, 'paymentAdminReject'), []);
  const processFn = useMemo(() => httpsCallable<any, any>(functions, 'paymentAdminProcess'), []);
  const markPaidFn = useMemo(() => httpsCallable<any, any>(functions, 'adminMarkWithdrawalAsPaid'), []);
  const getStatsFn = useMemo(() => httpsCallable<any, any>(functions, 'paymentAdminGetStats'), []);
  const exportFn = useMemo(() => httpsCallable<any, any>(functions, 'paymentAdminExport'), []);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchWithdrawals = useCallback(async (reset = true) => {
    setIsLoading(true);

    try {
      // Determine status filter based on main tab
      let statusesToFetch: WithdrawalStatus[] | undefined;
      if (statusFilter !== 'all') {
        statusesToFetch = [statusFilter];
      } else if (mainTab === 'active') {
        statusesToFetch = ACTIVE_STATUSES;
      } else {
        statusesToFetch = TERMINAL_STATUSES;
      }

      const offset = reset ? 0 : page * PAGE_SIZE;

      const result = await getPendingFn({
        userType: userTypeFilter === 'all' ? undefined : userTypeFilter,
        status: statusesToFetch,
        limit: PAGE_SIZE,
        offset,
      });

      const data = result.data;
      setWithdrawals(data.withdrawals || []);
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
      if (data.summary) {
        setSummary(data.summary);
      }
      if (reset) {
        setPage(0);
        setSelectedIds(new Set());
        setSelectAll(false);
      }
    } catch (err: any) {
      console.error('Error fetching withdrawals:', err);
      toast.error(err.message || 'Erreur lors du chargement des retraits');
    } finally {
      setIsLoading(false);
    }
  }, [getPendingFn, statusFilter, userTypeFilter, mainTab, page]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await getStatsFn({ period: 'month' });
      const data = result.data;

      const bs = data.byStatus || {};
      const sm = data.summary || {};
      const processingCount = (bs.approved?.count || 0) + (bs.processing?.count || 0) + (bs.queued?.count || 0) + (bs.sent?.count || 0);
      const processingAmount = (bs.approved?.amount || 0) + (bs.processing?.amount || 0) + (bs.queued?.amount || 0) + (bs.sent?.amount || 0);
      const totalAttempts = (sm.completedCount || 0) + (sm.failedCount || 0);

      setStats({
        pending: { count: sm.pendingCount || 0, amount: (sm.pendingAmount || 0) / 100 },
        processing: { count: processingCount, amount: processingAmount / 100 },
        completed30d: { count: sm.completedCount || 0, amount: (sm.completedAmount || 0) / 100 },
        failed30d: { count: sm.failedCount || 0, amount: (sm.failedAmount || 0) / 100 },
        successRate: totalAttempts > 0 ? ((sm.completedCount || 0) / totalAttempts) * 100 : 100,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [getStatsFn]);

  // Track whether initial fetch has happened to avoid double-fetching
  const hasFetched = useRef(false);

  // Fetch data when filters change
  useEffect(() => {
    fetchWithdrawals(true);
    fetchStats();
    hasFetched.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab, statusFilter, userTypeFilter]);

  // Sync URL params using window.history to avoid React Router re-render loop
  useEffect(() => {
    const params = new URLSearchParams();
    if (mainTab !== 'active') params.set('tab', mainTab);
    if (userTypeFilter !== 'all') params.set('userType', userTypeFilter);
    const search = params.toString();
    const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [mainTab, userTypeFilter]);

  // ============================================================================
  // ACTIONS (via callables — audit trail + balance management)
  // ============================================================================

  const handleApprove = async (withdrawal: UnifiedWithdrawal) => {
    if (withdrawal.telegramConfirmationPending) {
      toast.error(intl.formatMessage({
        id: 'admin.withdrawals.error.telegramPending',
        defaultMessage: 'Impossible d\'approuver : confirmation Telegram en attente.',
      }));
      return;
    }

    setProcessingId(withdrawal.id);
    setIsProcessing(true);

    try {
      await approveFn({ withdrawalId: withdrawal.id });
      toast.success(intl.formatMessage({ id: 'admin.withdrawals.success.approved', defaultMessage: 'Retrait approuvé avec succès' }));
      fetchWithdrawals(true);
      fetchStats();
    } catch (err: any) {
      console.error('Error approving withdrawal:', err);
      toast.error(err.message || 'Erreur lors de l\'approbation');
    } finally {
      setProcessingId(null);
      setIsProcessing(false);
    }
  };

  const handleReject = async (reason: string) => {
    const { withdrawalId } = rejectionModal;
    if (!withdrawalId) return;

    setProcessingId(withdrawalId);
    setIsProcessing(true);

    try {
      await rejectFn({ withdrawalId, reason });
      toast.success(intl.formatMessage({ id: 'admin.withdrawals.success.rejected', defaultMessage: 'Retrait rejeté — solde restauré' }));
      setRejectionModal({ isOpen: false, withdrawalId: '' });
      fetchWithdrawals(true);
      fetchStats();
    } catch (err: any) {
      console.error('Error rejecting withdrawal:', err);
      toast.error(err.message || 'Erreur lors du rejet');
    } finally {
      setProcessingId(null);
      setIsProcessing(false);
    }
  };

  const handleProcess = async (withdrawal: UnifiedWithdrawal) => {
    setProcessingId(withdrawal.id);
    setIsProcessing(true);

    try {
      const result = await processFn({ withdrawalId: withdrawal.id });
      const msg = result.data?.message || 'Retrait envoyé au fournisseur';
      toast.success(msg);
      fetchWithdrawals(true);
      fetchStats();
    } catch (err: any) {
      console.error('Error processing withdrawal:', err);
      toast.error(err.message || 'Erreur lors du traitement');
    } finally {
      setProcessingId(null);
      setIsProcessing(false);
    }
  };

  const handleMarkAsPaid = async (externalRef: string, note: string) => {
    const { withdrawalId } = markPaidModal;
    if (!withdrawalId) return;

    setProcessingId(withdrawalId);
    setIsProcessing(true);

    try {
      await markPaidFn({ withdrawalId, externalReference: externalRef, note: note || undefined });
      toast.success(intl.formatMessage({ id: 'admin.withdrawals.success.paid', defaultMessage: 'Retrait marqué comme payé' }));
      setMarkPaidModal({ isOpen: false, withdrawalId: '' });
      fetchWithdrawals(true);
      fetchStats();
    } catch (err: any) {
      console.error('Error marking as paid:', err);
      toast.error(err.message || 'Erreur');
    } finally {
      setProcessingId(null);
      setIsProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    const pendingSelected = withdrawals.filter(
      w => selectedIds.has(w.id) && w.status === 'pending' && !w.telegramConfirmationPending
    );

    if (pendingSelected.length === 0) {
      toast.error('Aucun retrait en attente sélectionné');
      return;
    }

    setIsProcessing(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const w of pendingSelected) {
        try {
          await approveFn({ withdrawalId: w.id });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} retrait(s) approuvé(s)`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} erreur(s) lors de l'approbation`);
      }

      setSelectedIds(new Set());
      setSelectAll(false);
      fetchWithdrawals(true);
      fetchStats();
    } catch (err: any) {
      console.error('Error bulk approving:', err);
      toast.error(err.message || 'Erreur lors de l\'approbation en masse');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await exportFn({
        fromDate: thirtyDaysAgo.toISOString(),
        toDate: new Date().toISOString(),
        status: mainTab === 'active' ? ACTIVE_STATUSES : TERMINAL_STATUSES,
        userType: userTypeFilter === 'all' ? undefined : [userTypeFilter],
        format: 'csv',
      });

      const data = result.data;
      const blob = new Blob([data.data], { type: data.mimeType || 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || `withdrawals_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${data.recordCount} enregistrements exportés`);
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.message || 'Erreur lors de l\'export');
    }
  };

  // ============================================================================
  // FILTERING & SORTING (client-side on loaded data)
  // ============================================================================

  const filteredWithdrawals = useMemo(() => {
    let result = [...withdrawals];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(w =>
        (w.userName || '').toLowerCase().includes(term) ||
        (w.userEmail || '').toLowerCase().includes(term) ||
        w.id.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'requestedAt':
          comparison = new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'userType':
          comparison = a.userType.localeCompare(b.userType);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [withdrawals, searchTerm, sortField, sortOrder]);

  // Selection handlers
  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWithdrawals.map(w => w.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="ml-1 text-gray-400" />;
    return sortOrder === 'asc'
      ? <ArrowUp size={14} className="ml-1 text-blue-600" />
      : <ArrowDown size={14} className="ml-1 text-blue-600" />;
  };

  // Format amount from cents to dollars
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  // Status filter options based on main tab
  const statusOptions = mainTab === 'active' ? ACTIVE_STATUSES : TERMINAL_STATUSES;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Banknote className="w-7 h-7 text-red-500" />
              <FormattedMessage id="admin.withdrawals.title" defaultMessage="Gestion des Retraits" />
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <FormattedMessage
                id="admin.withdrawals.description"
                defaultMessage="Gérez les demandes de retrait de commissions pour tous les rôles affiliés"
              />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download size={16} className="mr-2" />
              <span className="hidden sm:inline">
                <FormattedMessage id="admin.withdrawals.exportCsv" defaultMessage="Exporter CSV" />
              </span>
            </Button>
            <Button variant="outline" onClick={() => { fetchWithdrawals(true); fetchStats(); }}>
              <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
              </span>
            </Button>
          </div>
        </div>

        {/* Main Tabs: Demandes en cours / Paiements traités */}
        <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
          <button
            onClick={() => { setMainTab('active'); setStatusFilter('all'); setPage(0); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mainTab === 'active'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Inbox size={16} />
            <FormattedMessage id="admin.withdrawals.tab.active" defaultMessage="Demandes en cours" />
            {summary && (summary.pendingCount + (summary.validatingCount || 0) + summary.approvedCount + summary.processingCount) > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {summary.pendingCount + (summary.validatingCount || 0) + summary.approvedCount + summary.processingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setMainTab('completed'); setStatusFilter('all'); setPage(0); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mainTab === 'completed'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Archive size={16} />
            <FormattedMessage id="admin.withdrawals.tab.completed" defaultMessage="Paiements traités" />
          </button>
        </div>

        {/* Stats Cards — always rendered to avoid layout shift */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="admin.withdrawals.stats.pending" defaultMessage="En attente" />
                </p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats?.pending.count ?? '—'}</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{stats ? formatAmount(stats.pending.amount * 100) : '—'}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="admin.withdrawals.stats.processing" defaultMessage="En traitement" />
                </p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats?.processing.count ?? '—'}</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{stats ? formatAmount(stats.processing.amount * 100) : '—'}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="admin.withdrawals.stats.completed30d" defaultMessage="Payés (30j)" />
                </p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats?.completed30d.count ?? '—'}</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{stats ? formatAmount(stats.completed30d.amount * 100) : '—'}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="admin.withdrawals.stats.successRate" defaultMessage="Taux de succès" />
                </p>
                <p className={`text-xl sm:text-2xl font-bold ${!stats ? 'text-gray-400' : stats.successRate >= 90 ? 'text-green-600' : stats.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {stats ? `${stats.successRate.toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="admin.withdrawals.stats.last30d" defaultMessage="30 derniers jours" />
                </p>
              </div>
              <div className="p-2 sm:p-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FormattedMessage id="admin.withdrawals.filter.status" defaultMessage="Statut" />
              </label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as WithdrawalStatus | 'all'); setPage(0); }}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              >
                <option value="all">{intl.formatMessage({ id: 'common.all', defaultMessage: 'Tous' })}</option>
                {statusOptions.map(s => (
                  <option key={s} value={s}>
                    {intl.formatMessage({ id: `admin.withdrawals.status.${s}`, defaultMessage: s })}
                  </option>
                ))}
              </select>
            </div>

            {/* User Type Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FormattedMessage id="admin.withdrawals.filter.userType" defaultMessage="Rôle" />
              </label>
              <select
                value={userTypeFilter}
                onChange={(e) => { setUserTypeFilter(e.target.value as PaymentUserType | 'all'); setPage(0); }}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              >
                <option value="all">{intl.formatMessage({ id: 'common.all', defaultMessage: 'Tous les rôles' })}</option>
                {Object.entries(USER_TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FormattedMessage id="admin.withdrawals.filter.search" defaultMessage="Rechercher" />
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'admin.withdrawals.filter.searchPlaceholder', defaultMessage: 'Email, nom, ID...' })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && mainTab === 'active' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-blue-700 dark:text-blue-300 text-sm">
              <FormattedMessage
                id="admin.withdrawals.selected"
                defaultMessage="{count} retrait(s) sélectionné(s)"
                values={{ count: selectedIds.size }}
              />
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleBulkApprove} disabled={isProcessing} loading={isProcessing}>
                <CheckSquare size={16} className="mr-2" />
                <FormattedMessage id="admin.withdrawals.bulkApprove" defaultMessage="Approuver la sélection" />
              </Button>
              <button
                onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }}
                className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 text-sm underline"
              >
                <FormattedMessage id="common.clearSelection" defaultMessage="Désélectionner" />
              </button>
            </div>
          </div>
        )}

        {/* Withdrawals Table */}
        <div className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-black/40 z-10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
          )}
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    {mainTab === 'active' && (
                      <th className="px-3 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                      </th>
                    )}
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <FormattedMessage id="admin.withdrawals.table.user" defaultMessage="Utilisateur" />
                    </th>
                    <th
                      className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10"
                      onClick={() => handleSort('userType')}
                    >
                      <div className="flex items-center">
                        <FormattedMessage id="admin.withdrawals.table.type" defaultMessage="Rôle" />
                        {renderSortIcon('userType')}
                      </div>
                    </th>
                    <th
                      className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center">
                        <FormattedMessage id="admin.withdrawals.table.amount" defaultMessage="Montant" />
                        {renderSortIcon('amount')}
                      </div>
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                      <FormattedMessage id="admin.withdrawals.table.fees" defaultMessage="Frais" />
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                      <FormattedMessage id="admin.withdrawals.table.method" defaultMessage="Méthode" />
                    </th>
                    <th
                      className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        <FormattedMessage id="admin.withdrawals.table.status" defaultMessage="Statut" />
                        {renderSortIcon('status')}
                      </div>
                    </th>
                    <th
                      className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 hidden sm:table-cell"
                      onClick={() => handleSort('requestedAt')}
                    >
                      <div className="flex items-center">
                        <FormattedMessage id="admin.withdrawals.table.date" defaultMessage="Date" />
                        {renderSortIcon('requestedAt')}
                      </div>
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <FormattedMessage id="admin.withdrawals.table.actions" defaultMessage="Actions" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredWithdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={mainTab === 'active' ? 9 : 8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center gap-2">
                          {mainTab === 'active' ? <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600" /> : <Archive className="w-10 h-10 text-gray-300 dark:text-gray-600" />}
                          <FormattedMessage id="admin.withdrawals.noResults" defaultMessage="Aucun retrait trouvé" />
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredWithdrawals.map((w) => (
                      <tr
                        key={w.id}
                        className={`hover:bg-gray-50 dark:hover:bg-white/5 ${selectedIds.has(w.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                      >
                        {mainTab === 'active' && (
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(w.id)}
                              onChange={() => handleSelectRow(w.id)}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                          </td>
                        )}
                        <td className="px-3 sm:px-4 py-3">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-[120px] sm:max-w-[180px]">
                              {w.userName || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[180px]">
                              {w.userEmail || w.userId?.slice(0, 12)}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <UserTypeBadge userType={w.userType} />
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                              {formatAmount(w.amount)}
                            </p>
                            {w.convertedAmount && w.targetCurrency !== w.sourceCurrency && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                ~ {formatAmount(w.convertedAmount)} {w.targetCurrency}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                          {(w.withdrawalFee || 0) > 0 ? (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatAmount(w.withdrawalFee || 0)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap hidden md:table-cell">
                          <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 capitalize">
                            {(w.paymentMethod || w.provider || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <WithdrawalStatusBadge status={w.status} />
                            {w.telegramConfirmationPending && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-full" title="Confirmation Telegram en attente">
                                TG
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                          <div className="text-xs sm:text-sm">
                            <p className="text-gray-900 dark:text-white">
                              {intl.formatDate(new Date(w.requestedAt), { dateStyle: 'short' })}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">
                              {intl.formatTime(new Date(w.requestedAt), { timeStyle: 'short' })}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Details */}
                            <button
                              onClick={() => navigate(`/admin/payments/${w.userType}/${w.id}`)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 rounded"
                              title={intl.formatMessage({ id: 'admin.withdrawals.action.view', defaultMessage: 'Voir détails' })}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Approve (if pending) */}
                            {w.status === 'pending' && (
                              <button
                                onClick={() => handleApprove(w)}
                                disabled={(isProcessing && processingId === w.id) || !!w.telegramConfirmationPending}
                                className={`p-1.5 rounded disabled:opacity-50 ${w.telegramConfirmationPending ? 'text-gray-300 cursor-not-allowed' : 'text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                                title={w.telegramConfirmationPending
                                  ? 'Confirmation Telegram en attente'
                                  : intl.formatMessage({ id: 'admin.withdrawals.action.approve', defaultMessage: 'Approuver' })
                                }
                              >
                                {isProcessing && processingId === w.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <CheckCircle className="w-4 h-4" />
                                }
                              </button>
                            )}

                            {/* Reject (if pending or approved) */}
                            {(w.status === 'pending' || w.status === 'approved') && (
                              <button
                                onClick={() => setRejectionModal({ isOpen: true, withdrawalId: w.id })}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title={intl.formatMessage({ id: 'admin.withdrawals.action.reject', defaultMessage: 'Rejeter' })}
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}

                            {/* Process via provider (if approved) */}
                            {w.status === 'approved' && (
                              <button
                                onClick={() => handleProcess(w)}
                                disabled={isProcessing && processingId === w.id}
                                className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded disabled:opacity-50"
                                title={intl.formatMessage({ id: 'admin.withdrawals.action.process', defaultMessage: 'Traiter via Wise/Flutterwave' })}
                              >
                                {isProcessing && processingId === w.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <Send className="w-4 h-4" />
                                }
                              </button>
                            )}

                            {/* Mark as paid (manual — if pending, approved, processing, or failed) */}
                            {['pending', 'approved', 'processing', 'failed'].includes(w.status) && (
                              <button
                                onClick={() => setMarkPaidModal({ isOpen: true, withdrawalId: w.id })}
                                className="p-1.5 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"
                                title={intl.formatMessage({ id: 'admin.withdrawals.action.markPaid', defaultMessage: 'Marquer payé (manuel)' })}
                              >
                                <FileCheck className="w-4 h-4" />
                              </button>
                            )}

                            {/* Show payment reference for completed */}
                            {w.status === 'completed' && w.paymentReference && (
                              <span className="text-xs text-green-600 dark:text-green-400 font-mono px-1.5" title={w.paymentReference}>
                                {w.paymentReference.slice(0, 10)}...
                              </span>
                            )}

                            {/* Show failure reason for failed/rejected */}
                            {(w.status === 'failed' || w.status === 'rejected') && (w.failureReason || w.rejectionReason || w.errorMessage) && (
                              <span className="text-xs text-red-500 dark:text-red-400 max-w-[100px] truncate" title={w.failureReason || w.rejectionReason || w.errorMessage}>
                                {(w.failureReason || w.rejectionReason || w.errorMessage || '').slice(0, 30)}...
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          {/* Pagination */}
          {!isLoading && filteredWithdrawals.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="admin.withdrawals.pagination"
                  defaultMessage="{count} résultat(s) — Page {page}"
                  values={{ count: total, page: page + 1 }}
                />
              </p>
              <div className="flex items-center gap-2">
                {page > 0 && (
                  <Button variant="outline" onClick={() => { setPage(p => p - 1); fetchWithdrawals(false); }}>
                    <FormattedMessage id="common.previous" defaultMessage="Précédent" />
                  </Button>
                )}
                {hasMore && (
                  <Button variant="outline" onClick={() => { setPage(p => p + 1); fetchWithdrawals(false); }}>
                    <FormattedMessage id="common.next" defaultMessage="Suivant" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <RejectionModal
          isOpen={rejectionModal.isOpen}
          onClose={() => setRejectionModal({ isOpen: false, withdrawalId: '' })}
          onConfirm={handleReject}
          isProcessing={isProcessing}
        />
        <MarkAsPaidModal
          isOpen={markPaidModal.isOpen}
          onClose={() => setMarkPaidModal({ isOpen: false, withdrawalId: '' })}
          onConfirm={handleMarkAsPaid}
          isProcessing={isProcessing}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentsDashboard;
