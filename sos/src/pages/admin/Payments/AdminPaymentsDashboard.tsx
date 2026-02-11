/**
 * AdminPaymentsDashboard.tsx
 *
 * Admin dashboard for managing centralized withdrawals from Chatter, Influencer, and Blogger systems.
 * Provides overview of all withdrawals with quick actions: approve, reject, process.
 * Includes statistics, charts, and filtering by status, user type, date.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import AdminLayout from '../../../components/admin/AdminLayout';
import Button from '../../../components/common/Button';
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Download,
  AlertTriangle,
  TrendingUp,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  Users,
  Calendar,
  CreditCard,
  Send,
  Ban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PaymentUserType, WithdrawalStatus, STATUS_COLORS } from '../../../types/payment';
import { toCsv } from '../../../services/finance/reports';

// ============================================================================
// TYPES
// ============================================================================

interface UnifiedWithdrawal {
  id: string;
  docId: string;
  userType: PaymentUserType;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate?: number;
  convertedAmount?: number;
  status: WithdrawalStatus;
  paymentMethod: string;
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  rejectionReason?: string;
  failureReason?: string;
  paymentReference?: string;
  telegramConfirmationPending?: boolean;
}

interface WithdrawalStats {
  pending: { count: number; amount: number };
  processing: { count: number; amount: number };
  completed30d: { count: number; amount: number };
  successRate: number;
  totalPending: number;
  totalProcessing: number;
}

type SortField = 'requestedAt' | 'amount' | 'status' | 'userType';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE = 25;

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

const StatusBadge: React.FC<{ status: WithdrawalStatus }> = ({ status }) => {
  const intl = useIntl();

  const config: Record<WithdrawalStatus, { color: string; icon: React.ReactNode; labelKey: string }> = {
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock className="w-3.5 h-3.5" />, labelKey: 'admin.withdrawals.status.pending' },
    validating: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Search className="w-3.5 h-3.5" />, labelKey: 'admin.withdrawals.status.validating' },
    approved: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: <CheckCircle className="w-3.5 h-3.5" />, labelKey: 'admin.withdrawals.status.approved' },
    queued: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: <Clock className="w-3.5 h-3.5" />, labelKey: 'admin.withdrawals.status.queued' },
    processing: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, labelKey: 'admin.withdrawals.status.processing' },
    sent: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: <Send className="w-3.5 h-3.5" />, labelKey: 'admin.withdrawals.status.sent' },
    completed: { color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="w-3.5 h-3.5" />, labelKey: 'admin.withdrawals.status.completed' },
    failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-3.5 h-3.5" />, labelKey: 'admin.withdrawals.status.failed' },
    rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: <Ban className="w-3.5 h-3.5" />, labelKey: 'admin.withdrawals.status.rejected' },
    cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: <XCircle className="w-3.5 h-3.5" />, labelKey: 'admin.withdrawals.status.cancelled' },
  };

  const { color, icon, labelKey } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      {icon}
      {intl.formatMessage({ id: labelKey, defaultMessage: status })}
    </span>
  );
};

// ============================================================================
// USER TYPE BADGE COMPONENT
// ============================================================================

const UserTypeBadge: React.FC<{ userType: PaymentUserType }> = ({ userType }) => {
  const config: Record<PaymentUserType, { color: string; label: string }> = {
    chatter: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Chatter' },
    influencer: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Influencer' },
    blogger: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Blogger' },
    group_admin: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Group Admin' },
  };

  const { color, label } = config[userType] || config.chatter;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
};

// ============================================================================
// REJECTION MODAL COMPONENT
// ============================================================================

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  withdrawalId: string;
  isProcessing: boolean;
}

const RejectionModal: React.FC<RejectionModalProps> = ({ isOpen, onClose, onConfirm, withdrawalId, isProcessing }) => {
  const intl = useIntl();
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <FormattedMessage id="admin.withdrawals.rejectModal.title" defaultMessage="Rejeter le retrait" />
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          <FormattedMessage
            id="admin.withdrawals.rejectModal.description"
            defaultMessage="Veuillez indiquer la raison du rejet pour le retrait {id}."
            values={{ id: withdrawalId.slice(0, 8) }}
          />
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={intl.formatMessage({ id: 'admin.withdrawals.rejectModal.placeholder', defaultMessage: 'Raison du rejet...' })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          rows={3}
        />
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
          </Button>
          <Button
            variant="danger"
            onClick={() => onConfirm(reason)}
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
// MAIN COMPONENT
// ============================================================================

const AdminPaymentsDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  // State
  const [withdrawals, setWithdrawals] = useState<UnifiedWithdrawal[]>([]);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | 'all'>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<PaymentUserType | 'all'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; withdrawalId: string; userType: PaymentUserType }>({
    isOpen: false,
    withdrawalId: '',
    userType: 'chatter',
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const getCollectionName = (userType: PaymentUserType): string => {
    switch (userType) {
      case 'chatter': return 'chatter_withdrawals';
      case 'influencer': return 'influencer_withdrawals';
      case 'blogger': return 'blogger_withdrawals';
      default: return 'chatter_withdrawals';
    }
  };

  const mapDocToWithdrawal = (docSnap: QueryDocumentSnapshot<DocumentData>, userType: PaymentUserType): UnifiedWithdrawal => {
    const data = docSnap.data();

    let requestedAt = new Date();
    if (data.requestedAt instanceof Timestamp) {
      requestedAt = data.requestedAt.toDate();
    } else if (data.requestedAt) {
      requestedAt = new Date(data.requestedAt);
    }

    let processedAt: Date | undefined;
    if (data.processedAt instanceof Timestamp) {
      processedAt = data.processedAt.toDate();
    } else if (data.processedAt) {
      processedAt = new Date(data.processedAt);
    }

    let completedAt: Date | undefined;
    if (data.completedAt instanceof Timestamp) {
      completedAt = data.completedAt.toDate();
    } else if (data.completedAt) {
      completedAt = new Date(data.completedAt);
    }

    // Determine user ID and name based on user type
    let userId = '';
    let userEmail = '';
    let userName = '';

    if (userType === 'chatter') {
      userId = data.chatterId || '';
      userEmail = data.chatterEmail || '';
      userName = data.chatterName || '';
    } else if (userType === 'influencer') {
      userId = data.influencerId || '';
      userEmail = data.influencerEmail || '';
      userName = data.influencerName || `${data.influencerFirstName || ''} ${data.influencerLastName || ''}`.trim();
    } else if (userType === 'blogger') {
      userId = data.bloggerId || '';
      userEmail = data.bloggerEmail || '';
      userName = data.bloggerName || '';
    }

    return {
      id: `${userType}_${docSnap.id}`,
      docId: docSnap.id,
      userType,
      userId,
      userEmail,
      userName,
      amount: data.amount || 0,
      sourceCurrency: data.sourceCurrency || 'USD',
      targetCurrency: data.targetCurrency || data.sourceCurrency || 'USD',
      exchangeRate: data.exchangeRate,
      convertedAmount: data.convertedAmount,
      status: data.status || 'pending',
      paymentMethod: data.paymentMethod || 'unknown',
      requestedAt,
      processedAt,
      completedAt,
      rejectionReason: data.rejectionReason,
      failureReason: data.failureReason,
      paymentReference: data.paymentReference,
      telegramConfirmationPending: data.telegramConfirmationPending || false,
    };
  };

  const fetchWithdrawals = useCallback(async (reset = false) => {
    if (reset) {
      setIsLoading(true);
      setLastDoc(null);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const userTypes: PaymentUserType[] = userTypeFilter === 'all'
        ? ['chatter', 'influencer', 'blogger']
        : [userTypeFilter];

      const allWithdrawals: UnifiedWithdrawal[] = [];

      for (const userType of userTypes) {
        const colRef = collection(db, getCollectionName(userType));
        const constraints: Parameters<typeof query>[1][] = [];

        if (statusFilter !== 'all') {
          constraints.push(where('status', '==', statusFilter));
        }

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          constraints.push(where('requestedAt', '>=', Timestamp.fromDate(start)));
        }

        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          constraints.push(where('requestedAt', '<=', Timestamp.fromDate(end)));
        }

        constraints.push(orderBy('requestedAt', 'desc'));
        constraints.push(limit(PAGE_SIZE));

        const q = query(colRef, ...constraints);
        const snapshot = await getDocs(q);

        const withdrawals = snapshot.docs.map(docSnap => mapDocToWithdrawal(docSnap, userType));
        allWithdrawals.push(...withdrawals);
      }

      // Sort combined results
      allWithdrawals.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

      if (reset) {
        setWithdrawals(allWithdrawals);
        setSelectedIds(new Set());
        setSelectAll(false);
      } else {
        setWithdrawals(prev => [...prev, ...allWithdrawals]);
      }

      setHasMore(allWithdrawals.length >= PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
      setError(intl.formatMessage({ id: 'admin.withdrawals.error.fetch', defaultMessage: 'Erreur lors du chargement des retraits' }));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [statusFilter, userTypeFilter, startDate, endDate, intl]);

  const fetchStats = useCallback(async () => {
    try {
      const userTypes: PaymentUserType[] = ['chatter', 'influencer', 'blogger'];
      const stats: WithdrawalStats = {
        pending: { count: 0, amount: 0 },
        processing: { count: 0, amount: 0 },
        completed30d: { count: 0, amount: 0 },
        successRate: 0,
        totalPending: 0,
        totalProcessing: 0,
      };

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let totalCompleted = 0;
      let totalFailed = 0;

      for (const userType of userTypes) {
        const colRef = collection(db, getCollectionName(userType));

        // Pending
        const pendingQuery = query(colRef, where('status', '==', 'pending'));
        const pendingSnap = await getDocs(pendingQuery);
        pendingSnap.forEach(doc => {
          const data = doc.data();
          stats.pending.count++;
          stats.pending.amount += data.amount || 0;
        });

        // Processing (includes approved, queued, processing, sent)
        const processingStatuses = ['approved', 'queued', 'processing', 'sent'];
        for (const status of processingStatuses) {
          const processingQuery = query(colRef, where('status', '==', status));
          const processingSnap = await getDocs(processingQuery);
          processingSnap.forEach(doc => {
            const data = doc.data();
            stats.processing.count++;
            stats.processing.amount += data.amount || 0;
          });
        }

        // Completed in last 30 days
        const completedQuery = query(
          colRef,
          where('status', '==', 'completed'),
          where('completedAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
        );
        const completedSnap = await getDocs(completedQuery);
        completedSnap.forEach(doc => {
          const data = doc.data();
          stats.completed30d.count++;
          stats.completed30d.amount += data.amount || 0;
          totalCompleted++;
        });

        // Failed in last 30 days (for success rate)
        const failedQuery = query(
          colRef,
          where('status', 'in', ['failed', 'rejected']),
          where('requestedAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
        );
        const failedSnap = await getDocs(failedQuery);
        totalFailed += failedSnap.size;
      }

      // Calculate success rate
      const totalAttempts = totalCompleted + totalFailed;
      stats.successRate = totalAttempts > 0 ? (totalCompleted / totalAttempts) * 100 : 100;
      stats.totalPending = stats.pending.count;
      stats.totalProcessing = stats.processing.count;

      setStats(stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals(true);
    fetchStats();
  }, [fetchWithdrawals, fetchStats]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleApprove = async (withdrawal: UnifiedWithdrawal) => {
    // Block approval if Telegram confirmation is still pending
    if (withdrawal.telegramConfirmationPending) {
      setError(intl.formatMessage({
        id: 'admin.withdrawals.error.telegramPending',
        defaultMessage: 'Impossible d\'approuver : confirmation Telegram en attente. L\'utilisateur doit d\'abord confirmer via Telegram.',
      }));
      return;
    }

    setProcessingId(withdrawal.id);
    setIsProcessing(true);
    setError(null);

    try {
      const colName = getCollectionName(withdrawal.userType);
      const docRef = doc(db, colName, withdrawal.docId);

      await updateDoc(docRef, {
        status: 'approved',
        approvedAt: Timestamp.now(),
        approvedBy: 'admin',
      });

      setWithdrawals(prev => prev.map(w =>
        w.id === withdrawal.id ? { ...w, status: 'approved' as WithdrawalStatus } : w
      ));

      setSuccess(intl.formatMessage({ id: 'admin.withdrawals.success.approved', defaultMessage: 'Retrait approuve avec succes' }));
      setTimeout(() => setSuccess(null), 3000);

      // Refresh stats
      fetchStats();
    } catch (err) {
      console.error('Error approving withdrawal:', err);
      setError(intl.formatMessage({ id: 'admin.withdrawals.error.approve', defaultMessage: 'Erreur lors de l\'approbation' }));
    } finally {
      setProcessingId(null);
      setIsProcessing(false);
    }
  };

  const handleReject = async (reason: string) => {
    const { withdrawalId, userType } = rejectionModal;
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);
    if (!withdrawal) return;

    setProcessingId(withdrawalId);
    setIsProcessing(true);
    setError(null);

    try {
      const colName = getCollectionName(userType);
      const docRef = doc(db, colName, withdrawal.docId);

      await updateDoc(docRef, {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectedBy: 'admin',
        rejectionReason: reason,
      });

      setWithdrawals(prev => prev.map(w =>
        w.id === withdrawalId ? { ...w, status: 'rejected' as WithdrawalStatus, rejectionReason: reason } : w
      ));

      setSuccess(intl.formatMessage({ id: 'admin.withdrawals.success.rejected', defaultMessage: 'Retrait rejete' }));
      setTimeout(() => setSuccess(null), 3000);

      setRejectionModal({ isOpen: false, withdrawalId: '', userType: 'chatter' });
      fetchStats();
    } catch (err) {
      console.error('Error rejecting withdrawal:', err);
      setError(intl.formatMessage({ id: 'admin.withdrawals.error.reject', defaultMessage: 'Erreur lors du rejet' }));
    } finally {
      setProcessingId(null);
      setIsProcessing(false);
    }
  };

  const handleProcess = async (withdrawal: UnifiedWithdrawal) => {
    setProcessingId(withdrawal.id);
    setIsProcessing(true);
    setError(null);

    try {
      const colName = getCollectionName(withdrawal.userType);
      const docRef = doc(db, colName, withdrawal.docId);

      await updateDoc(docRef, {
        status: 'processing',
        processedAt: Timestamp.now(),
        processedBy: 'admin',
      });

      setWithdrawals(prev => prev.map(w =>
        w.id === withdrawal.id ? { ...w, status: 'processing' as WithdrawalStatus, processedAt: new Date() } : w
      ));

      setSuccess(intl.formatMessage({ id: 'admin.withdrawals.success.processing', defaultMessage: 'Retrait mis en traitement' }));
      setTimeout(() => setSuccess(null), 3000);

      fetchStats();
    } catch (err) {
      console.error('Error processing withdrawal:', err);
      setError(intl.formatMessage({ id: 'admin.withdrawals.error.process', defaultMessage: 'Erreur lors du traitement' }));
    } finally {
      setProcessingId(null);
      setIsProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    const pendingSelected = withdrawals.filter(
      w => selectedIds.has(w.id) && w.status === 'pending'
    );

    if (pendingSelected.length === 0) {
      setError(intl.formatMessage({ id: 'admin.withdrawals.error.noPending', defaultMessage: 'Aucun retrait en attente selectionne' }));
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const batch = writeBatch(db);

      for (const withdrawal of pendingSelected) {
        const colName = getCollectionName(withdrawal.userType);
        const docRef = doc(db, colName, withdrawal.docId);
        batch.update(docRef, {
          status: 'approved',
          approvedAt: Timestamp.now(),
          approvedBy: 'admin',
        });
      }

      await batch.commit();

      setWithdrawals(prev => prev.map(w =>
        selectedIds.has(w.id) && w.status === 'pending'
          ? { ...w, status: 'approved' as WithdrawalStatus }
          : w
      ));

      setSelectedIds(new Set());
      setSelectAll(false);
      setSuccess(intl.formatMessage(
        { id: 'admin.withdrawals.success.bulkApproved', defaultMessage: '{count} retraits approuves' },
        { count: pendingSelected.length }
      ));
      setTimeout(() => setSuccess(null), 3000);

      fetchStats();
    } catch (err) {
      console.error('Error bulk approving:', err);
      setError(intl.formatMessage({ id: 'admin.withdrawals.error.bulkApprove', defaultMessage: 'Erreur lors de l\'approbation en masse' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = () => {
    const rows = filteredWithdrawals.map(w => ({
      id: w.docId,
      userType: w.userType,
      userName: w.userName,
      userEmail: w.userEmail,
      amount: w.amount,
      sourceCurrency: w.sourceCurrency,
      targetCurrency: w.targetCurrency,
      exchangeRate: w.exchangeRate || '',
      convertedAmount: w.convertedAmount || '',
      status: w.status,
      paymentMethod: w.paymentMethod,
      requestedAt: intl.formatDate(w.requestedAt, { dateStyle: 'short', timeStyle: 'short' }),
      processedAt: w.processedAt ? intl.formatDate(w.processedAt, { dateStyle: 'short', timeStyle: 'short' }) : '',
      completedAt: w.completedAt ? intl.formatDate(w.completedAt, { dateStyle: 'short', timeStyle: 'short' }) : '',
      paymentReference: w.paymentReference || '',
    }));

    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `withdrawals_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // FILTERING & SORTING
  // ============================================================================

  const filteredWithdrawals = useMemo(() => {
    let result = [...withdrawals];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(w =>
        w.userName.toLowerCase().includes(term) ||
        w.userEmail.toLowerCase().includes(term) ||
        w.docId.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'requestedAt':
          comparison = a.requestedAt.getTime() - b.requestedAt.getTime();
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
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
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
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="ml-1 text-gray-400" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp size={14} className="ml-1 text-blue-600" />
      : <ArrowDown size={14} className="ml-1 text-blue-600" />;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading && withdrawals.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          <span className="ml-2 text-gray-600">
            <FormattedMessage id="common.loading" defaultMessage="Chargement..." />
          </span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              <FormattedMessage id="admin.withdrawals.title" defaultMessage="Gestion des Retraits" />
            </h1>
            <p className="text-gray-600 mt-1">
              <FormattedMessage
                id="admin.withdrawals.description"
                defaultMessage="Gerez les retraits des Chatters, Influenceurs et Blogueurs"
              />
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download size={16} className="mr-2" />
              <FormattedMessage id="admin.withdrawals.exportCsv" defaultMessage="Exporter CSV" />
            </Button>
            <Button variant="outline" onClick={() => { fetchWithdrawals(true); fetchStats(); }}>
              <RefreshCw size={16} className="mr-2" />
              <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-green-700">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.stats.pending" defaultMessage="En attente" />
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending.count}</p>
                  <p className="text-sm text-gray-500">${stats.pending.amount.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-full bg-yellow-100">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Processing */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.stats.processing" defaultMessage="En traitement" />
                  </p>
                  <p className="text-2xl font-bold text-blue-600">{stats.processing.count}</p>
                  <p className="text-sm text-gray-500">${stats.processing.amount.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <RefreshCw className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Completed 30d */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.stats.completed30d" defaultMessage="Completes (30j)" />
                  </p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed30d.count}</p>
                  <p className="text-sm text-gray-500">${stats.completed30d.amount.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Success Rate */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.stats.successRate" defaultMessage="Taux de succes" />
                  </p>
                  <p className={`text-2xl font-bold ${stats.successRate >= 90 ? 'text-green-600' : stats.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {stats.successRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.stats.last30d" defaultMessage="30 derniers jours" />
                  </p>
                </div>
                <div className="p-3 rounded-full bg-indigo-100">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FormattedMessage id="admin.withdrawals.filter.status" defaultMessage="Statut" />
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as WithdrawalStatus | 'all')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">{intl.formatMessage({ id: 'common.all', defaultMessage: 'Tous' })}</option>
                <option value="pending">{intl.formatMessage({ id: 'admin.withdrawals.status.pending', defaultMessage: 'En attente' })}</option>
                <option value="approved">{intl.formatMessage({ id: 'admin.withdrawals.status.approved', defaultMessage: 'Approuve' })}</option>
                <option value="processing">{intl.formatMessage({ id: 'admin.withdrawals.status.processing', defaultMessage: 'En traitement' })}</option>
                <option value="completed">{intl.formatMessage({ id: 'admin.withdrawals.status.completed', defaultMessage: 'Complete' })}</option>
                <option value="failed">{intl.formatMessage({ id: 'admin.withdrawals.status.failed', defaultMessage: 'Echoue' })}</option>
                <option value="rejected">{intl.formatMessage({ id: 'admin.withdrawals.status.rejected', defaultMessage: 'Rejete' })}</option>
              </select>
            </div>

            {/* User Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FormattedMessage id="admin.withdrawals.filter.userType" defaultMessage="Type d'utilisateur" />
              </label>
              <select
                value={userTypeFilter}
                onChange={(e) => setUserTypeFilter(e.target.value as PaymentUserType | 'all')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">{intl.formatMessage({ id: 'common.all', defaultMessage: 'Tous' })}</option>
                <option value="chatter">Chatter</option>
                <option value="influencer">Influencer</option>
                <option value="blogger">Blogger</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FormattedMessage id="admin.withdrawals.filter.dateFrom" defaultMessage="Date debut" />
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FormattedMessage id="admin.withdrawals.filter.dateTo" defaultMessage="Date fin" />
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FormattedMessage id="admin.withdrawals.filter.search" defaultMessage="Rechercher" />
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'admin.withdrawals.filter.searchPlaceholder', defaultMessage: 'Email, nom, ID...' })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="mt-4 flex justify-end">
            <Button onClick={() => fetchWithdrawals(true)}>
              <Filter size={16} className="mr-2" />
              <FormattedMessage id="admin.withdrawals.filter.apply" defaultMessage="Appliquer les filtres" />
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-blue-700">
              <FormattedMessage
                id="admin.withdrawals.selected"
                defaultMessage="{count} retrait(s) selectionne(s)"
                values={{ count: selectedIds.size }}
              />
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleBulkApprove} disabled={isProcessing}>
                <CheckSquare size={16} className="mr-2" />
                <FormattedMessage id="admin.withdrawals.bulkApprove" defaultMessage="Approuver la selection" />
              </Button>
              <button
                onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }}
                className="text-blue-700 hover:text-blue-900 text-sm underline"
              >
                <FormattedMessage id="common.clearSelection" defaultMessage="Deselectionner" />
              </button>
            </div>
          </div>
        )}

        {/* Withdrawals Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FormattedMessage id="admin.withdrawals.table.user" defaultMessage="Utilisateur" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('userType')}
                  >
                    <div className="flex items-center">
                      <FormattedMessage id="admin.withdrawals.table.type" defaultMessage="Type" />
                      {renderSortIcon('userType')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center">
                      <FormattedMessage id="admin.withdrawals.table.amount" defaultMessage="Montant" />
                      {renderSortIcon('amount')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FormattedMessage id="admin.withdrawals.table.method" defaultMessage="Methode" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      <FormattedMessage id="admin.withdrawals.table.status" defaultMessage="Statut" />
                      {renderSortIcon('status')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('requestedAt')}
                  >
                    <div className="flex items-center">
                      <FormattedMessage id="admin.withdrawals.table.date" defaultMessage="Date" />
                      {renderSortIcon('requestedAt')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FormattedMessage id="admin.withdrawals.table.actions" defaultMessage="Actions" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      <FormattedMessage id="admin.withdrawals.noResults" defaultMessage="Aucun retrait trouve" />
                    </td>
                  </tr>
                ) : (
                  filteredWithdrawals.map((withdrawal) => (
                    <tr
                      key={withdrawal.id}
                      className={`hover:bg-gray-50 ${selectedIds.has(withdrawal.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(withdrawal.id)}
                          onChange={() => handleSelectRow(withdrawal.id)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {withdrawal.docId.slice(0, 8)}...
                        </code>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{withdrawal.userName || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{withdrawal.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <UserTypeBadge userType={withdrawal.userType} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-semibold text-gray-900">
                            ${withdrawal.amount.toFixed(2)}
                          </p>
                          {withdrawal.convertedAmount && withdrawal.targetCurrency !== withdrawal.sourceCurrency && (
                            <p className="text-xs text-gray-500">
                              ~ {withdrawal.convertedAmount.toFixed(2)} {withdrawal.targetCurrency}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700 capitalize">
                          {withdrawal.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={withdrawal.status} />
                          {withdrawal.telegramConfirmationPending && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200 rounded-full" title="En attente de confirmation Telegram">
                              TG
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="text-gray-900">
                            {intl.formatDate(withdrawal.requestedAt, { dateStyle: 'short' })}
                          </p>
                          <p className="text-gray-500">
                            {intl.formatTime(withdrawal.requestedAt, { timeStyle: 'short' })}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {/* View Details */}
                          <button
                            onClick={() => navigate(`/admin/payments/${withdrawal.userType}/${withdrawal.docId}`)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            title={intl.formatMessage({ id: 'admin.withdrawals.action.view', defaultMessage: 'Voir details' })}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Approve (if pending and Telegram confirmed) */}
                          {withdrawal.status === 'pending' && (
                            <button
                              onClick={() => handleApprove(withdrawal)}
                              disabled={(isProcessing && processingId === withdrawal.id) || withdrawal.telegramConfirmationPending}
                              className={`p-2 rounded disabled:opacity-50 ${withdrawal.telegramConfirmationPending ? 'text-gray-300 cursor-not-allowed' : 'text-green-400 hover:text-green-600 hover:bg-green-50'}`}
                              title={withdrawal.telegramConfirmationPending
                                ? intl.formatMessage({ id: 'admin.withdrawals.action.telegramPending', defaultMessage: 'En attente de confirmation Telegram' })
                                : intl.formatMessage({ id: 'admin.withdrawals.action.approve', defaultMessage: 'Approuver' })
                              }
                            >
                              {isProcessing && processingId === withdrawal.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <CheckCircle className="w-4 h-4" />
                              }
                            </button>
                          )}

                          {/* Reject (if pending) */}
                          {withdrawal.status === 'pending' && (
                            <button
                              onClick={() => setRejectionModal({ isOpen: true, withdrawalId: withdrawal.id, userType: withdrawal.userType })}
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title={intl.formatMessage({ id: 'admin.withdrawals.action.reject', defaultMessage: 'Rejeter' })}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Process (if approved) */}
                          {withdrawal.status === 'approved' && (
                            <button
                              onClick={() => handleProcess(withdrawal)}
                              disabled={isProcessing && processingId === withdrawal.id}
                              className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                              title={intl.formatMessage({ id: 'admin.withdrawals.action.process', defaultMessage: 'Traiter' })}
                            >
                              {isProcessing && processingId === withdrawal.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Send className="w-4 h-4" />
                              }
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && !isLoading && (
            <div className="p-4 border-t border-gray-200 text-center">
              <Button
                variant="outline"
                onClick={() => fetchWithdrawals(false)}
                loading={isLoadingMore}
              >
                <FormattedMessage id="common.loadMore" defaultMessage="Charger plus" />
              </Button>
            </div>
          )}
        </div>

        {/* Rejection Modal */}
        <RejectionModal
          isOpen={rejectionModal.isOpen}
          onClose={() => setRejectionModal({ isOpen: false, withdrawalId: '', userType: 'chatter' })}
          onConfirm={handleReject}
          withdrawalId={rejectionModal.withdrawalId}
          isProcessing={isProcessing}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentsDashboard;
