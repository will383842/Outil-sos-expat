// src/pages/admin/Finance/Refunds.tsx
// Refunds Management Page - Complete implementation with stats, filters, table, and modal
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  orderBy,
  Timestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import AdminLayout from '../../../components/admin/AdminLayout';
import Button from '../../../components/common/Button';
import {
  RefreshCw,
  Search,
  Plus,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

// ============================================================================
// TYPES
// ============================================================================

type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed';

type RefundReason =
  | 'customer_request'
  | 'service_not_delivered'
  | 'technical_issue'
  | 'duplicate_payment'
  | 'fraud'
  | 'other';

interface RefundRecord {
  id: string;
  paymentId: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  providerId?: string;
  providerName?: string;
  originalAmount: number;
  refundAmount: number;
  currency: string;
  reason: RefundReason;
  notes?: string;
  status: RefundStatus;
  requestedBy: string;
  requestedByName?: string;
  requestedAt: Date;
  processedBy?: string;
  processedByName?: string;
  processedAt?: Date;
  callSessionId?: string;
  stripeRefundId?: string;
  auditTrail: AuditEntry[];
}

interface AuditEntry {
  action: string;
  userId: string;
  userName?: string;
  timestamp: Date;
  details?: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  amountInEuros?: number;
  currency: string;
  status: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  providerId?: string;
  providerName?: string;
  createdAt: Date;
  callSessionId?: string;
}

interface RefundStats {
  totalRefunded: number;
  refundCount: number;
  refundRate: number;
  pendingCount: number;
}

interface FilterState {
  status: RefundStatus | 'all';
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  reason: RefundReason | 'all';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 25;

const REFUND_REASONS: { value: RefundReason; labelKey: string }[] = [
  { value: 'customer_request', labelKey: 'admin.refunds.reason.customerRequest' },
  { value: 'service_not_delivered', labelKey: 'admin.refunds.reason.serviceNotDelivered' },
  { value: 'technical_issue', labelKey: 'admin.refunds.reason.technicalIssue' },
  { value: 'duplicate_payment', labelKey: 'admin.refunds.reason.duplicatePayment' },
  { value: 'fraud', labelKey: 'admin.refunds.reason.fraud' },
  { value: 'other', labelKey: 'admin.refunds.reason.other' },
];

const PIE_COLORS = [
  '#DC2626', // red-600
  '#2563EB', // blue-600
  '#16A34A', // green-600
  '#D97706', // amber-600
  '#9333EA', // purple-600
  '#0891B2', // cyan-600
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusColor = (status: RefundStatus): string => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: RefundStatus): React.ReactNode => {
  switch (status) {
    case 'pending':
      return <Clock size={14} className="mr-1" />;
    case 'processing':
      return <RefreshCw size={14} className="mr-1 animate-spin" />;
    case 'completed':
      return <CheckCircle size={14} className="mr-1" />;
    case 'failed':
      return <XCircle size={14} className="mr-1" />;
    default:
      return null;
  }
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color,
  bgColor,
  subtitle,
}) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-full ${bgColor}`}>{icon}</div>
    </div>
  </div>
);

// ============================================================================
// NEW REFUND MODAL COMPONENT
// ============================================================================

interface NewRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (refundData: {
    paymentId: string;
    amount: number;
    reason: RefundReason;
    notes: string;
    payment: PaymentRecord;
  }) => Promise<void>;
}

const NewRefundModal: React.FC<NewRefundModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PaymentRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [isFullRefund, setIsFullRefund] = useState(true);
  const [reason, setReason] = useState<RefundReason>('customer_request');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search for payments
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const paymentsRef = collection(db, 'payments');

      // Try to search by payment ID first
      if (searchQuery.startsWith('pi_') || searchQuery.length === 20) {
        const paymentDoc = await getDoc(doc(db, 'payments', searchQuery));
        if (paymentDoc.exists()) {
          const data = paymentDoc.data();
          const createdAt = data.createdAt?.toDate?.() || new Date();
          setSearchResults([
            {
              id: paymentDoc.id,
              amount: data.amountInEuros ?? (data.amount ? data.amount / 100 : 0),
              currency: data.currency || 'EUR',
              status: data.status || 'unknown',
              clientId: data.clientId || '',
              clientName: data.clientName,
              clientEmail: data.clientEmail,
              providerId: data.providerId,
              providerName: data.providerName,
              createdAt,
              callSessionId: data.callSessionId || data.sessionId,
            },
          ]);
          setIsSearching(false);
          return;
        }
      }

      // Search by client name (paid payments only)
      const q = query(
        paymentsRef,
        where('status', '==', 'paid'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const results: PaymentRecord[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const clientName = (data.clientName || '').toLowerCase();
        const clientEmail = (data.clientEmail || '').toLowerCase();
        const searchLower = searchQuery.toLowerCase();

        if (
          clientName.includes(searchLower) ||
          clientEmail.includes(searchLower) ||
          docSnap.id.includes(searchQuery)
        ) {
          const createdAt = data.createdAt?.toDate?.() || new Date();
          results.push({
            id: docSnap.id,
            amount: data.amountInEuros ?? (data.amount ? data.amount / 100 : 0),
            currency: data.currency || 'EUR',
            status: data.status || 'unknown',
            clientId: data.clientId || '',
            clientName: data.clientName,
            clientEmail: data.clientEmail,
            providerId: data.providerId,
            providerName: data.providerName,
            createdAt,
            callSessionId: data.callSessionId || data.sessionId,
          });
        }
      });

      setSearchResults(results);
    } catch (err) {
      console.error('Error searching payments:', err);
      setError(intl.formatMessage({ id: 'admin.refunds.modal.searchError' }));
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, intl]);

  // Reset modal state
  const resetModal = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPayment(null);
    setRefundAmount('');
    setIsFullRefund(true);
    setReason('customer_request');
    setNotes('');
    setError(null);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    resetModal();
    onClose();
  }, [resetModal, onClose]);

  // Handle payment selection
  const handleSelectPayment = useCallback((payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setRefundAmount(payment.amount.toString());
    setSearchResults([]);
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!selectedPayment) return;

    const amount = isFullRefund
      ? selectedPayment.amount
      : parseFloat(refundAmount);

    if (isNaN(amount) || amount <= 0) {
      setError(intl.formatMessage({ id: 'admin.refunds.modal.invalidAmount' }));
      return;
    }

    if (amount > selectedPayment.amount) {
      setError(intl.formatMessage({ id: 'admin.refunds.modal.amountExceeds' }));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        paymentId: selectedPayment.id,
        amount,
        reason,
        notes,
        payment: selectedPayment,
      });
      handleClose();
    } catch (err) {
      console.error('Error creating refund:', err);
      setError(intl.formatMessage({ id: 'admin.refunds.modal.submitError' }));
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedPayment, isFullRefund, refundAmount, reason, notes, onSubmit, handleClose, intl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {intl.formatMessage({ id: 'admin.refunds.modal.title' })}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center text-red-700">
                <AlertCircle size={20} className="mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Payment Search */}
            {!selectedPayment ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  {intl.formatMessage({ id: 'admin.refunds.modal.searchPayment' })}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={intl.formatMessage({ id: 'admin.refunds.modal.searchPlaceholder' })}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <Button onClick={handleSearch} loading={isSearching}>
                    <Search size={16} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.refunds.modal.search' })}
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {searchResults.map((payment) => (
                      <button
                        key={payment.id}
                        onClick={() => handleSelectPayment(payment)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {payment.clientName || payment.clientId}
                            </p>
                            <p className="text-sm text-gray-500">
                              {intl.formatMessage({ id: 'admin.refunds.modal.paymentId' })}: {payment.id.substring(0, 20)}...
                            </p>
                            <p className="text-xs text-gray-400">
                              {intl.formatDate(payment.createdAt, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {intl.formatNumber(payment.amount, {
                                style: 'currency',
                                currency: payment.currency,
                              })}
                            </p>
                            <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                              payment.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {payment.status}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <p className="text-center text-gray-500 py-4">
                    {intl.formatMessage({ id: 'admin.refunds.modal.noResults' })}
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Selected Payment Details */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium text-gray-900">
                      {intl.formatMessage({ id: 'admin.refunds.modal.selectedPayment' })}
                    </h3>
                    <button
                      onClick={() => setSelectedPayment(null)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      {intl.formatMessage({ id: 'admin.refunds.modal.changePayment' })}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">{intl.formatMessage({ id: 'admin.refunds.modal.client' })}</p>
                      <p className="font-medium">{selectedPayment.clientName || selectedPayment.clientId}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{intl.formatMessage({ id: 'admin.refunds.modal.originalAmount' })}</p>
                      <p className="font-medium">
                        {intl.formatNumber(selectedPayment.amount, {
                          style: 'currency',
                          currency: selectedPayment.currency,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">{intl.formatMessage({ id: 'admin.refunds.modal.paymentDate' })}</p>
                      <p className="font-medium">
                        {intl.formatDate(selectedPayment.createdAt, {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">{intl.formatMessage({ id: 'admin.refunds.modal.provider' })}</p>
                      <p className="font-medium">{selectedPayment.providerName || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Refund Amount */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    {intl.formatMessage({ id: 'admin.refunds.modal.refundAmount' })}
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={isFullRefund}
                        onChange={() => {
                          setIsFullRefund(true);
                          setRefundAmount(selectedPayment.amount.toString());
                        }}
                        className="mr-2 text-red-600 focus:ring-red-500"
                      />
                      {intl.formatMessage({ id: 'admin.refunds.modal.fullRefund' })}
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!isFullRefund}
                        onChange={() => setIsFullRefund(false)}
                        className="mr-2 text-red-600 focus:ring-red-500"
                      />
                      {intl.formatMessage({ id: 'admin.refunds.modal.partialRefund' })}
                    </label>
                  </div>
                  {!isFullRefund && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        min="0.01"
                        max={selectedPayment.amount}
                        step="0.01"
                        className="w-32 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <span className="text-gray-500">{selectedPayment.currency}</span>
                      <span className="text-sm text-gray-400">
                        (max: {intl.formatNumber(selectedPayment.amount, {
                          style: 'currency',
                          currency: selectedPayment.currency,
                        })})
                      </span>
                    </div>
                  )}
                </div>

                {/* Reason Selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    {intl.formatMessage({ id: 'admin.refunds.modal.reason' })}
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as RefundReason)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {REFUND_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {intl.formatMessage({ id: r.labelKey })}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    {intl.formatMessage({ id: 'admin.refunds.modal.notes' })}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'admin.refunds.modal.notesPlaceholder' })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              {intl.formatMessage({ id: 'admin.refunds.modal.cancel' })}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedPayment || isSubmitting}
              loading={isSubmitting}
            >
              <RotateCcw size={16} className="mr-2" />
              {intl.formatMessage({ id: 'admin.refunds.modal.createRefund' })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Refunds: React.FC = () => {
  const intl = useIntl();
  const { user } = useAuth() as { user: { id: string; firstName?: string; lastName?: string } | null };

  // State
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [stats, setStats] = useState<RefundStats>({
    totalRefunded: 0,
    refundCount: 0,
    refundRate: 0,
    pendingCount: 0,
  });
  const [reasonAnalytics, setReasonAnalytics] = useState<{ name: string; value: number; color: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [selectedRefunds, setSelectedRefunds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedRefund, setExpandedRefund] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    reason: 'all',
  });

  // Load refunds data
  const loadRefunds = useCallback(async (reset = false) => {
    if (reset) {
      setIsLoading(true);
      setLastDoc(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const refundsRef = collection(db, 'refunds');
      const constraints: Parameters<typeof query>[1][] = [];

      // Status filter
      if (filters.status !== 'all') {
        constraints.push(where('status', '==', filters.status));
      }

      // Date filters
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        constraints.push(where('requestedAt', '>=', Timestamp.fromDate(fromDate)));
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        constraints.push(where('requestedAt', '<=', Timestamp.fromDate(toDate)));
      }

      // Reason filter
      if (filters.reason !== 'all') {
        constraints.push(where('reason', '==', filters.reason));
      }

      constraints.push(orderBy('requestedAt', 'desc'));

      if (!reset && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      constraints.push(limit(PAGE_SIZE));

      const q = query(refundsRef, ...constraints);
      const snapshot = await getDocs(q);

      const refundRecords: RefundRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const requestedAt = data.requestedAt?.toDate?.() || new Date();
        const processedAt = data.processedAt?.toDate?.();

        // Parse audit trail
        const auditTrail: AuditEntry[] = (data.auditTrail || []).map((entry: {
          action: string;
          userId: string;
          userName?: string;
          timestamp: Timestamp | Date;
          details?: string;
        }) => ({
          action: entry.action,
          userId: entry.userId,
          userName: entry.userName,
          timestamp: entry.timestamp instanceof Timestamp ? entry.timestamp.toDate() : entry.timestamp,
          details: entry.details,
        }));

        refundRecords.push({
          id: docSnap.id,
          paymentId: data.paymentId || '',
          clientId: data.clientId || '',
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          providerId: data.providerId,
          providerName: data.providerName,
          originalAmount: data.originalAmount || 0,
          refundAmount: data.refundAmount || 0,
          currency: data.currency || 'EUR',
          reason: data.reason || 'other',
          notes: data.notes,
          status: data.status || 'pending',
          requestedBy: data.requestedBy || '',
          requestedByName: data.requestedByName,
          requestedAt,
          processedBy: data.processedBy,
          processedByName: data.processedByName,
          processedAt,
          callSessionId: data.callSessionId,
          stripeRefundId: data.stripeRefundId,
          auditTrail,
        });
      });

      // Apply amount filter client-side
      let filteredRecords = refundRecords;
      if (filters.amountMin) {
        const min = parseFloat(filters.amountMin);
        filteredRecords = filteredRecords.filter((r) => r.refundAmount >= min);
      }
      if (filters.amountMax) {
        const max = parseFloat(filters.amountMax);
        filteredRecords = filteredRecords.filter((r) => r.refundAmount <= max);
      }

      setLastDoc(snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      if (reset) {
        setRefunds(filteredRecords);
      } else {
        setRefunds((prev) => [...prev, ...filteredRecords]);
      }
    } catch (err) {
      console.error('Error loading refunds:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filters, lastDoc]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthTs = Timestamp.fromDate(startOfMonth);

      // Get refunds this month
      const refundsQuery = query(
        collection(db, 'refunds'),
        where('requestedAt', '>=', startOfMonthTs)
      );
      const refundsSnapshot = await getDocs(refundsQuery);

      let totalRefunded = 0;
      let refundCount = 0;
      let pendingCount = 0;
      const reasonCounts: Record<string, number> = {};

      refundsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'completed') {
          totalRefunded += data.refundAmount || 0;
        }
        refundCount++;
        if (data.status === 'pending') {
          pendingCount++;
        }

        // Count by reason
        const reason = data.reason || 'other';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });

      // Get total transactions this month for refund rate
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('createdAt', '>=', startOfMonthTs),
        where('status', '==', 'paid')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const totalTransactions = paymentsSnapshot.size;

      const refundRate = totalTransactions > 0 ? (refundCount / totalTransactions) * 100 : 0;

      setStats({
        totalRefunded,
        refundCount,
        refundRate,
        pendingCount,
      });

      // Build reason analytics
      const analytics = Object.entries(reasonCounts).map(([reason, count], index) => ({
        name: intl.formatMessage({
          id: REFUND_REASONS.find((r) => r.value === reason)?.labelKey || 'admin.refunds.reason.other',
        }),
        value: count,
        color: PIE_COLORS[index % PIE_COLORS.length],
      }));
      setReasonAnalytics(analytics);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, [intl]);

  // Initial load
  useEffect(() => {
    loadRefunds(true);
    loadStats();
  }, []);

  // Reload on filter change
  useEffect(() => {
    loadRefunds(true);
  }, [filters.status, filters.dateFrom, filters.dateTo, filters.reason, filters.amountMin, filters.amountMax]);

  // Filter by search
  const filteredRefunds = useMemo(() => {
    if (!search.trim()) return refunds;
    const s = search.toLowerCase();
    return refunds.filter(
      (r) =>
        r.paymentId.toLowerCase().includes(s) ||
        r.clientName?.toLowerCase().includes(s) ||
        r.clientEmail?.toLowerCase().includes(s) ||
        r.clientId.toLowerCase().includes(s)
    );
  }, [refunds, search]);

  // Handle create refund
  const handleCreateRefund = useCallback(
    async (data: {
      paymentId: string;
      amount: number;
      reason: RefundReason;
      notes: string;
      payment: PaymentRecord;
    }) => {
      if (!user) return;

      const now = new Date();
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';

      const refundData = {
        paymentId: data.paymentId,
        clientId: data.payment.clientId,
        clientName: data.payment.clientName,
        clientEmail: data.payment.clientEmail,
        providerId: data.payment.providerId,
        providerName: data.payment.providerName,
        originalAmount: data.payment.amount,
        refundAmount: data.amount,
        currency: data.payment.currency,
        reason: data.reason,
        notes: data.notes,
        status: 'pending' as RefundStatus,
        requestedBy: user.id,
        requestedByName: userName,
        requestedAt: Timestamp.fromDate(now),
        callSessionId: data.payment.callSessionId,
        auditTrail: [
          {
            action: 'created',
            userId: user.id,
            userName,
            timestamp: Timestamp.fromDate(now),
            details: `Refund request created for ${data.amount} ${data.payment.currency}`,
          },
        ],
      };

      await addDoc(collection(db, 'refunds'), refundData);

      // Reload data
      await loadRefunds(true);
      await loadStats();
    },
    [user, loadRefunds, loadStats]
  );

  // Handle approve refund
  const handleApproveRefund = useCallback(
    async (refundId: string) => {
      if (!user) return;

      const now = new Date();
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';

      const refundRef = doc(db, 'refunds', refundId);
      const refundDoc = await getDoc(refundRef);

      if (!refundDoc.exists()) return;

      const currentData = refundDoc.data();
      const auditTrail = currentData.auditTrail || [];

      await updateDoc(refundRef, {
        status: 'completed',
        processedBy: user.id,
        processedByName: userName,
        processedAt: Timestamp.fromDate(now),
        auditTrail: [
          ...auditTrail,
          {
            action: 'approved',
            userId: user.id,
            userName,
            timestamp: Timestamp.fromDate(now),
            details: 'Refund approved and processed',
          },
        ],
      });

      // Update payment status
      const paymentRef = doc(db, 'payments', currentData.paymentId);
      await updateDoc(paymentRef, {
        status: 'refunded',
        refundedAt: Timestamp.fromDate(now),
        refundedBy: user.id,
      });

      await loadRefunds(true);
      await loadStats();
    },
    [user, loadRefunds, loadStats]
  );

  // Handle reject refund
  const handleRejectRefund = useCallback(
    async (refundId: string) => {
      if (!user) return;

      const reason = window.prompt(intl.formatMessage({ id: 'admin.refunds.rejectReason' }));
      if (!reason) return;

      const now = new Date();
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin';

      const refundRef = doc(db, 'refunds', refundId);
      const refundDoc = await getDoc(refundRef);

      if (!refundDoc.exists()) return;

      const currentData = refundDoc.data();
      const auditTrail = currentData.auditTrail || [];

      await updateDoc(refundRef, {
        status: 'failed',
        processedBy: user.id,
        processedByName: userName,
        processedAt: Timestamp.fromDate(now),
        rejectionReason: reason,
        auditTrail: [
          ...auditTrail,
          {
            action: 'rejected',
            userId: user.id,
            userName,
            timestamp: Timestamp.fromDate(now),
            details: `Refund rejected: ${reason}`,
          },
        ],
      });

      await loadRefunds(true);
      await loadStats();
    },
    [user, intl, loadRefunds, loadStats]
  );

  // Handle bulk actions
  const handleBulkApprove = useCallback(async () => {
    if (selectedRefunds.size === 0) return;
    if (!window.confirm(intl.formatMessage({ id: 'admin.refunds.confirmBulkApprove' }, { count: selectedRefunds.size }))) {
      return;
    }

    for (const refundId of selectedRefunds) {
      await handleApproveRefund(refundId);
    }
    setSelectedRefunds(new Set());
  }, [selectedRefunds, handleApproveRefund, intl]);

  const handleBulkReject = useCallback(async () => {
    if (selectedRefunds.size === 0) return;
    if (!window.confirm(intl.formatMessage({ id: 'admin.refunds.confirmBulkReject' }, { count: selectedRefunds.size }))) {
      return;
    }

    for (const refundId of selectedRefunds) {
      await handleRejectRefund(refundId);
    }
    setSelectedRefunds(new Set());
  }, [selectedRefunds, handleRejectRefund, intl]);

  // Handle export
  const handleExport = useCallback(() => {
    const headers = [
      'Date Requested',
      'Payment ID',
      'Client Name',
      'Original Amount',
      'Refund Amount',
      'Currency',
      'Reason',
      'Status',
      'Requested By',
      'Processed By',
      'Processed At',
    ];

    const rows = filteredRefunds.map((r) => [
      intl.formatDate(r.requestedAt, { day: '2-digit', month: '2-digit', year: 'numeric' }),
      r.paymentId,
      r.clientName || r.clientId,
      r.originalAmount.toFixed(2),
      r.refundAmount.toFixed(2),
      r.currency,
      intl.formatMessage({ id: REFUND_REASONS.find((reason) => reason.value === r.reason)?.labelKey || 'admin.refunds.reason.other' }),
      r.status,
      r.requestedByName || r.requestedBy,
      r.processedByName || r.processedBy || '',
      r.processedAt ? intl.formatDate(r.processedAt, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `refunds_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredRefunds, intl]);

  // Toggle selection
  const toggleSelection = useCallback((refundId: string) => {
    setSelectedRefunds((prev) => {
      const next = new Set(prev);
      if (next.has(refundId)) {
        next.delete(refundId);
      } else {
        next.add(refundId);
      }
      return next;
    });
  }, []);

  // Toggle all selection
  const toggleAllSelection = useCallback(() => {
    if (selectedRefunds.size === filteredRefunds.filter((r) => r.status === 'pending').length) {
      setSelectedRefunds(new Set());
    } else {
      setSelectedRefunds(new Set(filteredRefunds.filter((r) => r.status === 'pending').map((r) => r.id)));
    }
  }, [selectedRefunds, filteredRefunds]);

  return (
    <AdminLayout>
      <div className="p-6 text-black">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{intl.formatMessage({ id: 'admin.refunds.title' })}</h1>
            <p className="text-gray-500 mt-1">{intl.formatMessage({ id: 'admin.refunds.subtitle' })}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => { loadRefunds(true); loadStats(); }}>
              <RefreshCw size={16} className="mr-2" />
              {intl.formatMessage({ id: 'admin.refunds.refresh' })}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download size={16} className="mr-2" />
              {intl.formatMessage({ id: 'admin.refunds.export' })}
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={16} className="mr-2" />
              {intl.formatMessage({ id: 'admin.refunds.newRefund' })}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title={intl.formatMessage({ id: 'admin.refunds.stats.totalRefunded' })}
            value={intl.formatNumber(stats.totalRefunded, { style: 'currency', currency: 'EUR' })}
            icon={<DollarSign size={24} className="text-red-600" />}
            color="text-red-600"
            bgColor="bg-red-50"
            subtitle={intl.formatMessage({ id: 'admin.refunds.stats.thisMonth' })}
          />
          <StatCard
            title={intl.formatMessage({ id: 'admin.refunds.stats.refundCount' })}
            value={stats.refundCount}
            icon={<FileText size={24} className="text-blue-600" />}
            color="text-blue-600"
            bgColor="bg-blue-50"
            subtitle={intl.formatMessage({ id: 'admin.refunds.stats.thisMonth' })}
          />
          <StatCard
            title={intl.formatMessage({ id: 'admin.refunds.stats.refundRate' })}
            value={`${stats.refundRate.toFixed(1)}%`}
            icon={<TrendingUp size={24} className="text-amber-600" />}
            color="text-amber-600"
            bgColor="bg-amber-50"
            subtitle={intl.formatMessage({ id: 'admin.refunds.stats.ofTransactions' })}
          />
          <StatCard
            title={intl.formatMessage({ id: 'admin.refunds.stats.pendingRefunds' })}
            value={stats.pendingCount}
            icon={<Clock size={24} className="text-purple-600" />}
            color="text-purple-600"
            bgColor="bg-purple-50"
            subtitle={intl.formatMessage({ id: 'admin.refunds.stats.needingApproval' })}
          />
        </div>

        {/* Analytics Chart */}
        {reasonAnalytics.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {intl.formatMessage({ id: 'admin.refunds.reasonAnalytics' })}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={reasonAnalytics}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {reasonAnalytics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value ?? 0, intl.formatMessage({ id: 'admin.refunds.refunds' })]} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {intl.formatMessage({ id: 'admin.refunds.filter.status' })}
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as RefundStatus | 'all' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">{intl.formatMessage({ id: 'admin.refunds.filter.all' })}</option>
                <option value="pending">{intl.formatMessage({ id: 'admin.refunds.status.pending' })}</option>
                <option value="processing">{intl.formatMessage({ id: 'admin.refunds.status.processing' })}</option>
                <option value="completed">{intl.formatMessage({ id: 'admin.refunds.status.completed' })}</option>
                <option value="failed">{intl.formatMessage({ id: 'admin.refunds.status.failed' })}</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {intl.formatMessage({ id: 'admin.refunds.filter.dateFrom' })}
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {intl.formatMessage({ id: 'admin.refunds.filter.dateTo' })}
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {intl.formatMessage({ id: 'admin.refunds.filter.amountMin' })}
              </label>
              <input
                type="number"
                value={filters.amountMin}
                onChange={(e) => setFilters((prev) => ({ ...prev, amountMin: e.target.value }))}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {intl.formatMessage({ id: 'admin.refunds.filter.amountMax' })}
              </label>
              <input
                type="number"
                value={filters.amountMax}
                onChange={(e) => setFilters((prev) => ({ ...prev, amountMax: e.target.value }))}
                placeholder="1000.00"
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            {/* Reason Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {intl.formatMessage({ id: 'admin.refunds.filter.reason' })}
              </label>
              <select
                value={filters.reason}
                onChange={(e) => setFilters((prev) => ({ ...prev, reason: e.target.value as RefundReason | 'all' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">{intl.formatMessage({ id: 'admin.refunds.filter.all' })}</option>
                {REFUND_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {intl.formatMessage({ id: r.labelKey })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'admin.refunds.searchPlaceholder' })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedRefunds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
            <span className="text-blue-700 font-medium">
              {intl.formatMessage({ id: 'admin.refunds.selected' }, { count: selectedRefunds.size })}
            </span>
            <div className="flex gap-3">
              <Button size="small" onClick={handleBulkApprove}>
                <CheckCircle size={14} className="mr-1" />
                {intl.formatMessage({ id: 'admin.refunds.bulkApprove' })}
              </Button>
              <Button size="small" variant="outline" onClick={handleBulkReject}>
                <XCircle size={14} className="mr-1" />
                {intl.formatMessage({ id: 'admin.refunds.bulkReject' })}
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRefunds.size === filteredRefunds.filter((r) => r.status === 'pending').length && filteredRefunds.filter((r) => r.status === 'pending').length > 0}
                      onChange={toggleAllSelection}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.refunds.table.dateRequested' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.refunds.table.paymentId' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.refunds.table.clientName' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.refunds.table.originalAmount' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.refunds.table.refundAmount' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.refunds.table.reason' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.refunds.table.status' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.refunds.table.requestedBy' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.refunds.table.actions' })}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <RefreshCw size={24} className="animate-spin mx-auto text-red-600 mb-2" />
                      <p className="text-gray-500">{intl.formatMessage({ id: 'admin.refunds.loading' })}</p>
                    </td>
                  </tr>
                ) : filteredRefunds.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                      {intl.formatMessage({ id: 'admin.refunds.noRefunds' })}
                    </td>
                  </tr>
                ) : (
                  filteredRefunds.map((refund) => (
                    <React.Fragment key={refund.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          {refund.status === 'pending' && (
                            <input
                              type="checkbox"
                              checked={selectedRefunds.has(refund.id)}
                              onChange={() => toggleSelection(refund.id)}
                              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {intl.formatDate(refund.requestedAt, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <a
                            href={`/admin/finance/payments?id=${refund.paymentId}`}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            {refund.paymentId.substring(0, 16)}...
                            <ExternalLink size={12} className="ml-1" />
                          </a>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {refund.clientName || refund.clientId}
                          </div>
                          {refund.clientEmail && (
                            <div className="text-xs text-gray-500">{refund.clientEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {intl.formatNumber(refund.originalAmount, {
                            style: 'currency',
                            currency: refund.currency,
                          })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          {intl.formatNumber(refund.refundAmount, {
                            style: 'currency',
                            currency: refund.currency,
                          })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {intl.formatMessage({
                            id: REFUND_REASONS.find((r) => r.value === refund.reason)?.labelKey ||
                              'admin.refunds.reason.other',
                          })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                              refund.status
                            )}`}
                          >
                            {getStatusIcon(refund.status)}
                            {intl.formatMessage({ id: `admin.refunds.status.${refund.status}` })}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {refund.requestedByName || refund.requestedBy}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {refund.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveRefund(refund.id)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                  title={intl.formatMessage({ id: 'admin.refunds.approve' })}
                                >
                                  <CheckCircle size={18} />
                                </button>
                                <button
                                  onClick={() => handleRejectRefund(refund.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                  title={intl.formatMessage({ id: 'admin.refunds.reject' })}
                                >
                                  <XCircle size={18} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() =>
                                setExpandedRefund(expandedRefund === refund.id ? null : refund.id)
                              }
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                              title={intl.formatMessage({ id: 'admin.refunds.viewDetails' })}
                            >
                              {expandedRefund === refund.id ? (
                                <ChevronUp size={18} />
                              ) : (
                                <ChevronDown size={18} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {expandedRefund === refund.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={10} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Details */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">
                                  {intl.formatMessage({ id: 'admin.refunds.details' })}
                                </h4>
                                <dl className="space-y-2 text-sm">
                                  {refund.notes && (
                                    <div>
                                      <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.refunds.notes' })}</dt>
                                      <dd className="text-gray-900">{refund.notes}</dd>
                                    </div>
                                  )}
                                  {refund.providerName && (
                                    <div>
                                      <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.refunds.provider' })}</dt>
                                      <dd className="text-gray-900">{refund.providerName}</dd>
                                    </div>
                                  )}
                                  {refund.callSessionId && (
                                    <div>
                                      <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.refunds.callSession' })}</dt>
                                      <dd className="text-gray-900 font-mono text-xs">{refund.callSessionId}</dd>
                                    </div>
                                  )}
                                  {refund.processedAt && (
                                    <div>
                                      <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.refunds.processedAt' })}</dt>
                                      <dd className="text-gray-900">
                                        {intl.formatDate(refund.processedAt, {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                        {' by '}
                                        {refund.processedByName || refund.processedBy}
                                      </dd>
                                    </div>
                                  )}
                                </dl>
                              </div>

                              {/* Audit Trail */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">
                                  {intl.formatMessage({ id: 'admin.refunds.auditTrail' })}
                                </h4>
                                <div className="space-y-3">
                                  {refund.auditTrail.map((entry, index) => (
                                    <div key={index} className="flex items-start gap-3 text-sm">
                                      <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-400" />
                                      <div>
                                        <p className="text-gray-900">
                                          <span className="font-medium capitalize">{entry.action}</span>
                                          {' by '}
                                          {entry.userName || entry.userId}
                                        </p>
                                        <p className="text-gray-500 text-xs">
                                          {intl.formatDate(entry.timestamp, {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </p>
                                        {entry.details && (
                                          <p className="text-gray-600 text-xs mt-1">{entry.details}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && !isLoading && (
            <div className="px-4 py-4 border-t border-gray-200 text-center">
              <Button
                variant="outline"
                onClick={() => loadRefunds(false)}
                loading={isLoadingMore}
              >
                {intl.formatMessage({ id: 'admin.refunds.loadMore' })}
              </Button>
            </div>
          )}
        </div>

        {/* New Refund Modal */}
        <NewRefundModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateRefund}
        />
      </div>
    </AdminLayout>
  );
};

export default Refunds;
