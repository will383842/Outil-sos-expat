// src/pages/admin/Finance/Payouts.tsx
// Professional Payouts Management Page for Admin
// Manages payouts to providers (lawyers and expats)
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  Timestamp,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
} from 'firebase/firestore';
import { db, functions } from '../../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import AdminLayout from '../../../components/admin/AdminLayout';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { useIntl } from 'react-intl';
import {
  DollarSign,
  Clock,
  Calendar,
  TrendingUp,
  Users,
  Download,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CreditCard,
  Building,
  Scale,
  Globe,
  RotateCcw,
  Settings,
  FileText,
  ArrowUp,
  ArrowDown,
  Minus,
  CheckSquare,
  Square,
  Loader,
  ChevronDown,
  ChevronUp,
  Send,
  Ban,
} from 'lucide-react';
import { logError } from '../../../utils/logging';

// ============ TYPES ============
type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
type ProviderType = 'lawyer' | 'expat';

interface CallSession {
  id: string;
  status: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  payment: {
    amount: number;
    providerAmount: number;
    commissionAmount: number;
    status: string;
    providerPaid: boolean;
  };
  metadata: {
    providerId: string;
    providerName?: string;
    clientId: string;
    clientName?: string;
    providerType: ProviderType;
  };
  duration?: number;
}

interface ProviderInfo {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  type: ProviderType;
  profilePhoto?: string;
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  paypalEmail?: string;
  paypalOnboardingComplete?: boolean;
  paymentGateway?: 'stripe' | 'paypal';
  bankAccountLast4?: string;
  bankAccountVerified?: boolean;
  country?: string;
}

interface PayoutRecord {
  id: string;
  providerId: string;
  providerInfo?: ProviderInfo;
  callSessionIds: string[];
  callSessions?: CallSession[];
  callsCount: number;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  currency: string;
  status: PayoutStatus;
  scheduledDate?: Timestamp;
  processedAt?: Timestamp;
  failedAt?: Timestamp;
  failureReason?: string;
  stripeTransferId?: string;
  paypalPayoutId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  retryCount: number;
  auditTrail: AuditEntry[];
}

interface AuditEntry {
  action: string;
  timestamp: Timestamp;
  userId?: string;
  details?: string;
}

interface PayoutStats {
  pendingAmount: number;
  pendingCount: number;
  monthlyAmount: number;
  monthlyCount: number;
  averagePayoutTime: number;
  nextScheduledDate?: Date;
}

interface PayoutScheduleConfig {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-28 for monthly
  minimumAmount: number;
  currency: string;
}

// ============ CONSTANTS ============
const PAGE_SIZE = 25;
const COMMISSION_RATE = 0.20; // 20% platform commission

// ============ UTILITY COMPONENTS ============
const StatusBadge: React.FC<{ status: PayoutStatus }> = ({ status }) => {
  const config = {
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pending' },
    processing: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Loader, label: 'Processing', pulse: true },
    completed: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Completed' },
    failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Failed' },
  }[status];

  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}>
      <IconComponent size={12} className="mr-1" />
      {config.label}
    </span>
  );
};

const ProviderTypeBadge: React.FC<{ type: ProviderType }> = ({ type }) => {
  if (type === 'lawyer') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <Scale size={12} className="mr-1" />
        Lawyer
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <Globe size={12} className="mr-1" />
      Expat
    </span>
  );
};

const BankAccountBadge: React.FC<{ last4?: string; verified?: boolean }> = ({ last4, verified }) => {
  if (!last4) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <CreditCard size={12} className="mr-1" />
        Not configured
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <CreditCard size={12} className="mr-1" />
        ****{last4}
      </span>
      {verified ? (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle size={10} className="mr-1" />
          Verified
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertTriangle size={10} className="mr-1" />
          Unverified
        </span>
      )}
    </div>
  );
};

const StatsCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  color: string;
  change?: number;
  isLive?: boolean;
}> = ({ title, value, subtitle, icon: Icon, color, change, isLive }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative overflow-hidden">
    {isLive && (
      <div className="absolute top-2 right-2 flex items-center">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
        <span className="text-xs text-green-600 font-medium">LIVE</span>
      </div>
    )}
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        {change !== undefined && (
          <div className="flex items-center mt-2">
            {change > 0 ? (
              <ArrowUp className="text-green-500" size={14} />
            ) : change < 0 ? (
              <ArrowDown className="text-red-500" size={14} />
            ) : (
              <Minus className="text-gray-400" size={14} />
            )}
            <span className={`text-sm ml-1 ${
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {Math.abs(change)}% vs last month
            </span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

// ============ MAIN COMPONENT ============
const Payouts: React.FC = () => {
  const intl = useIntl();
  const mountedRef = useRef<boolean>(true);

  // Data states
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [pendingCalls, setPendingCalls] = useState<CallSession[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [scheduleConfig, setScheduleConfig] = useState<PayoutScheduleConfig>({
    frequency: 'weekly',
    dayOfWeek: 1, // Monday
    minimumAmount: 10,
    currency: 'EUR',
  });

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedForBatch, setSelectedForBatch] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | 'all'>('all');
  const [providerTypeFilter, setProviderTypeFilter] = useState<ProviderType | 'all'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Formatters
  const formatCurrency = useCallback((amount: number, currency: string = 'EUR') => {
    return intl.formatNumber(amount, { style: 'currency', currency });
  }, [intl]);

  const formatDateTime = useCallback((timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return intl.formatDate(date, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [intl]);

  const formatRelativeTime = useCallback((timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }, []);

  // Fetch provider info
  const fetchProviderInfo = useCallback(async (providerId: string): Promise<ProviderInfo | undefined> => {
    try {
      const providerDoc = await getDoc(doc(db, 'sos_profiles', providerId));
      if (providerDoc.exists()) {
        const data = providerDoc.data();
        return {
          id: providerDoc.id,
          displayName: data.displayName,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || '',
          type: data.type || 'expat',
          profilePhoto: data.profilePhoto,
          stripeAccountId: data.stripeAccountId,
          stripeOnboardingComplete: data.stripeOnboardingComplete,
          paypalEmail: data.paypalEmail,
          paypalOnboardingComplete: data.paypalOnboardingComplete,
          paymentGateway: data.paymentGateway,
          bankAccountLast4: data.bankAccountLast4,
          bankAccountVerified: data.bankAccountVerified,
          country: data.country,
        };
      }
    } catch (error) {
      console.error('Error fetching provider info:', error);
    }
    return undefined;
  }, []);

  // Load pending calls (completed but not paid to provider)
  const loadPendingCalls = useCallback(async () => {
    try {
      const pendingQuery = query(
        collection(db, 'call_sessions'),
        where('status', '==', 'completed'),
        where('payment.status', '==', 'captured'),
        where('payment.providerPaid', '==', false),
        orderBy('createdAt', 'desc'),
        limit(500)
      );

      const snapshot = await getDocs(pendingQuery);
      const calls = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          status: data.status,
          createdAt: data.createdAt || data.metadata?.createdAt,
          completedAt: data.completedAt,
          payment: {
            amount: data.payment?.amount || 0,
            providerAmount: data.payment?.providerAmount || 0,
            commissionAmount: data.payment?.commissionAmount || 0,
            status: data.payment?.status || 'pending',
            providerPaid: data.payment?.providerPaid || false,
          },
          metadata: {
            providerId: data.metadata?.providerId || '',
            providerName: data.metadata?.providerName,
            clientId: data.metadata?.clientId || '',
            clientName: data.metadata?.clientName,
            providerType: data.metadata?.providerType || 'expat',
          },
          duration: data.payment?.duration || data.duration,
        } as CallSession;
      });

      if (mountedRef.current) {
        setPendingCalls(calls);
      }
    } catch (error) {
      console.error('Error loading pending calls:', error);
      logError({
        origin: 'frontend',
        error: `Error loading pending calls: ${(error as Error).message}`,
        context: { component: 'Payouts' },
      });
    }
  }, []);

  // Load payouts from Firestore
  const loadPayouts = useCallback(async (reset = false) => {
    setIsLoading(true);
    try {
      const payoutsRef = collection(db, 'payouts');
      const constraints: any[] = [];

      // Apply filters
      if (statusFilter !== 'all') {
        constraints.push(where('status', '==', statusFilter));
      }

      // Date filters
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(start)));
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(end)));
      }

      constraints.push(orderBy('createdAt', 'desc'));

      if (!reset && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      constraints.push(limit(PAGE_SIZE));

      const q = query(payoutsRef, ...constraints);
      const snapshot = await getDocs(q);

      const payoutRecords: PayoutRecord[] = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const providerInfo = await fetchProviderInfo(data.providerId);

          return {
            id: docSnap.id,
            providerId: data.providerId,
            providerInfo,
            callSessionIds: data.callSessionIds || [],
            callsCount: data.callsCount || 0,
            grossAmount: data.grossAmount || 0,
            commissionAmount: data.commissionAmount || 0,
            netAmount: data.netAmount || 0,
            currency: data.currency || 'EUR',
            status: data.status || 'pending',
            scheduledDate: data.scheduledDate,
            processedAt: data.processedAt,
            failedAt: data.failedAt,
            failureReason: data.failureReason,
            stripeTransferId: data.stripeTransferId,
            paypalPayoutId: data.paypalPayoutId,
            createdAt: data.createdAt || Timestamp.now(),
            updatedAt: data.updatedAt || Timestamp.now(),
            retryCount: data.retryCount || 0,
            auditTrail: data.auditTrail || [],
          };
        })
      );

      setLastDoc(snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      if (reset) {
        setPayouts(payoutRecords);
      } else {
        setPayouts(prev => [...prev, ...payoutRecords]);
      }
    } catch (error) {
      console.error('Error loading payouts:', error);
      logError({
        origin: 'frontend',
        error: `Error loading payouts: ${(error as Error).message}`,
        context: { component: 'Payouts' },
      });
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [statusFilter, startDate, endDate, lastDoc, fetchProviderInfo]);

  // Calculate stats
  const calculateStats = useCallback(async () => {
    try {
      // Pending amount from pending calls
      const pendingAmount = pendingCalls.reduce((sum, call) => sum + call.payment.providerAmount, 0);
      const pendingCount = pendingCalls.length;

      // Monthly stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthlyQuery = query(
        collection(db, 'payouts'),
        where('status', '==', 'completed'),
        where('processedAt', '>=', Timestamp.fromDate(startOfMonth))
      );

      const monthlySnapshot = await getDocs(monthlyQuery);
      const monthlyAmount = monthlySnapshot.docs.reduce((sum, doc) => sum + (doc.data().netAmount || 0), 0);
      const monthlyCount = monthlySnapshot.size;

      // Average payout time (days from call completion to payout)
      let totalPayoutTime = 0;
      let payoutTimeCount = 0;

      monthlySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.createdAt && data.processedAt) {
          const createdAt = data.createdAt.toDate();
          const processedAt = data.processedAt.toDate();
          totalPayoutTime += (processedAt.getTime() - createdAt.getTime()) / 86400000; // Days
          payoutTimeCount++;
        }
      });

      const averagePayoutTime = payoutTimeCount > 0 ? totalPayoutTime / payoutTimeCount : 0;

      // Next scheduled payout
      const nextScheduledQuery = query(
        collection(db, 'payouts'),
        where('status', '==', 'pending'),
        where('scheduledDate', '>', Timestamp.now()),
        orderBy('scheduledDate', 'asc'),
        limit(1)
      );

      const nextScheduledSnapshot = await getDocs(nextScheduledQuery);
      const nextScheduledDate = nextScheduledSnapshot.docs.length > 0
        ? nextScheduledSnapshot.docs[0].data().scheduledDate?.toDate()
        : undefined;

      if (mountedRef.current) {
        setStats({
          pendingAmount,
          pendingCount,
          monthlyAmount,
          monthlyCount,
          averagePayoutTime,
          nextScheduledDate,
        });
      }
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  }, [pendingCalls]);

  // Trigger manual payout
  const triggerManualPayout = useCallback(async (payoutId: string) => {
    if (!confirm(intl.formatMessage({ id: 'admin.finance.payouts.confirmManualPayout' }))) return;

    setIsProcessing(true);
    try {
      const processPayoutFn = httpsCallable(functions, 'processProviderPayout');
      await processPayoutFn({ payoutId });

      // Refresh payouts
      await loadPayouts(true);
      await calculateStats();

      alert(intl.formatMessage({ id: 'admin.finance.payouts.payoutTriggered' }));
    } catch (error) {
      console.error('Error triggering payout:', error);
      alert(intl.formatMessage({ id: 'admin.finance.payouts.payoutError' }));
    } finally {
      setIsProcessing(false);
    }
  }, [intl, loadPayouts, calculateStats]);

  // Retry failed payout
  const retryFailedPayout = useCallback(async (payoutId: string) => {
    if (!confirm(intl.formatMessage({ id: 'admin.finance.payouts.confirmRetry' }))) return;

    setIsProcessing(true);
    try {
      const retryPayoutFn = httpsCallable(functions, 'retryProviderPayout');
      await retryPayoutFn({ payoutId });

      await loadPayouts(true);
      await calculateStats();

      alert(intl.formatMessage({ id: 'admin.finance.payouts.retrySuccess' }));
    } catch (error) {
      console.error('Error retrying payout:', error);
      alert(intl.formatMessage({ id: 'admin.finance.payouts.retryError' }));
    } finally {
      setIsProcessing(false);
    }
  }, [intl, loadPayouts, calculateStats]);

  // Process batch payout
  const processBatchPayout = useCallback(async () => {
    if (selectedForBatch.size === 0) return;
    if (!confirm(intl.formatMessage({ id: 'admin.finance.payouts.confirmBatch' }, { count: selectedForBatch.size }))) return;

    setIsProcessing(true);
    try {
      const batchPayoutFn = httpsCallable(functions, 'processBatchPayout');
      await batchPayoutFn({ payoutIds: Array.from(selectedForBatch) });

      setSelectedForBatch(new Set());
      setShowBatchModal(false);
      await loadPayouts(true);
      await calculateStats();

      alert(intl.formatMessage({ id: 'admin.finance.payouts.batchSuccess' }));
    } catch (error) {
      console.error('Error processing batch payout:', error);
      alert(intl.formatMessage({ id: 'admin.finance.payouts.batchError' }));
    } finally {
      setIsProcessing(false);
    }
  }, [selectedForBatch, intl, loadPayouts, calculateStats]);

  // Export for accounting
  const handleExportCSV = useCallback(() => {
    const headers = [
      'Payout ID',
      'Provider ID',
      'Provider Name',
      'Provider Type',
      'Bank Account',
      'Calls Count',
      'Gross Amount',
      'Commission',
      'Net Amount',
      'Currency',
      'Status',
      'Scheduled Date',
      'Processed At',
      'Created At',
    ];

    const rows = payouts.map(payout => [
      payout.id,
      payout.providerId,
      payout.providerInfo?.displayName || `${payout.providerInfo?.firstName || ''} ${payout.providerInfo?.lastName || ''}`.trim() || 'N/A',
      payout.providerInfo?.type || 'N/A',
      payout.providerInfo?.bankAccountLast4 ? `****${payout.providerInfo.bankAccountLast4}` : 'N/A',
      payout.callsCount,
      payout.grossAmount.toFixed(2),
      payout.commissionAmount.toFixed(2),
      payout.netAmount.toFixed(2),
      payout.currency,
      payout.status,
      payout.scheduledDate ? formatDateTime(payout.scheduledDate) : 'N/A',
      payout.processedAt ? formatDateTime(payout.processedAt) : 'N/A',
      formatDateTime(payout.createdAt),
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payouts_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [payouts, formatDateTime]);

  // Save schedule configuration
  const saveScheduleConfig = useCallback(async () => {
    try {
      await updateDoc(doc(db, 'config', 'payout_schedule'), {
        ...scheduleConfig,
        updatedAt: Timestamp.now(),
      });
      setShowScheduleModal(false);
      alert(intl.formatMessage({ id: 'admin.finance.payouts.scheduleUpdated' }));
    } catch (error) {
      console.error('Error saving schedule config:', error);
      alert(intl.formatMessage({ id: 'admin.finance.payouts.scheduleError' }));
    }
  }, [scheduleConfig, intl]);

  // Toggle batch selection
  const toggleBatchSelection = useCallback((payoutId: string) => {
    setSelectedForBatch(prev => {
      const next = new Set(prev);
      if (next.has(payoutId)) {
        next.delete(payoutId);
      } else {
        next.add(payoutId);
      }
      return next;
    });
  }, []);

  // Select all pending for batch
  const selectAllPending = useCallback(() => {
    const pendingIds = payouts.filter(p => p.status === 'pending').map(p => p.id);
    setSelectedForBatch(new Set(pendingIds));
  }, [payouts]);

  // Filter payouts by search
  const filteredPayouts = useMemo(() => {
    let result = payouts;

    // Provider type filter
    if (providerTypeFilter !== 'all') {
      result = result.filter(p => p.providerInfo?.type === providerTypeFilter);
    }

    // Amount range filter
    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) {
        result = result.filter(p => p.netAmount >= min);
      }
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        result = result.filter(p => p.netAmount <= max);
      }
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.providerInfo?.displayName?.toLowerCase().includes(search) ||
        p.providerInfo?.firstName?.toLowerCase().includes(search) ||
        p.providerInfo?.lastName?.toLowerCase().includes(search) ||
        p.providerInfo?.email?.toLowerCase().includes(search) ||
        p.providerId.toLowerCase().includes(search)
      );
    }

    return result;
  }, [payouts, providerTypeFilter, minAmount, maxAmount, searchTerm]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    loadPendingCalls();
    loadPayouts(true);

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Recalculate stats when data changes
  useEffect(() => {
    if (pendingCalls.length > 0 || payouts.length > 0) {
      calculateStats();
    }
  }, [pendingCalls, payouts, calculateStats]);

  // Reload when filters change
  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    loadPayouts(true);
  }, [statusFilter, startDate, endDate]);

  // View payout details
  const handleViewDetails = useCallback(async (payout: PayoutRecord) => {
    // Load call sessions for this payout
    if (payout.callSessionIds.length > 0) {
      try {
        const callSessions: CallSession[] = [];
        for (const callId of payout.callSessionIds.slice(0, 50)) { // Limit to 50 for performance
          const callDoc = await getDoc(doc(db, 'call_sessions', callId));
          if (callDoc.exists()) {
            const data = callDoc.data();
            callSessions.push({
              id: callDoc.id,
              status: data.status,
              createdAt: data.createdAt || data.metadata?.createdAt,
              completedAt: data.completedAt,
              payment: {
                amount: data.payment?.amount || 0,
                providerAmount: data.payment?.providerAmount || 0,
                commissionAmount: data.payment?.commissionAmount || 0,
                status: data.payment?.status || 'pending',
                providerPaid: data.payment?.providerPaid || false,
              },
              metadata: {
                providerId: data.metadata?.providerId || '',
                providerName: data.metadata?.providerName,
                clientId: data.metadata?.clientId || '',
                clientName: data.metadata?.clientName,
                providerType: data.metadata?.providerType || 'expat',
              },
              duration: data.payment?.duration || data.duration,
            });
          }
        }
        payout.callSessions = callSessions;
      } catch (error) {
        console.error('Error loading call sessions:', error);
      }
    }

    setSelectedPayout(payout);
    setShowDetailModal(true);
  }, []);

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <DollarSign className="mr-3 text-green-600" size={28} />
              {intl.formatMessage({ id: 'admin.finance.payouts.title' })}
            </h1>
            <p className="text-gray-600 mt-1">
              {intl.formatMessage({ id: 'admin.finance.payouts.subtitle' })}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Schedule Config */}
            <button
              onClick={() => setShowScheduleModal(true)}
              className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              title={intl.formatMessage({ id: 'admin.finance.payouts.scheduleConfig' })}
            >
              <Settings size={20} />
            </button>

            {/* Batch Payout */}
            {selectedForBatch.size > 0 && (
              <Button onClick={() => setShowBatchModal(true)} variant="primary">
                <Send size={16} className="mr-2" />
                {intl.formatMessage({ id: 'admin.finance.payouts.batchPayout' })} ({selectedForBatch.size})
              </Button>
            )}

            {/* Export */}
            <button
              onClick={handleExportCSV}
              className="p-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              title={intl.formatMessage({ id: 'admin.finance.payouts.export' })}
            >
              <Download size={20} />
            </button>

            {/* Refresh */}
            <Button variant="outline" onClick={() => { loadPayouts(true); loadPendingCalls(); }}>
              <RefreshCw size={16} className="mr-2" />
              {intl.formatMessage({ id: 'admin.finance.payouts.refresh' })}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title={intl.formatMessage({ id: 'admin.finance.payouts.stats.pending' })}
              value={formatCurrency(stats.pendingAmount)}
              subtitle={`${stats.pendingCount} ${intl.formatMessage({ id: 'admin.finance.payouts.stats.providers' })}`}
              icon={Clock}
              color="bg-yellow-500"
              isLive
            />
            <StatsCard
              title={intl.formatMessage({ id: 'admin.finance.payouts.stats.thisMonth' })}
              value={formatCurrency(stats.monthlyAmount)}
              subtitle={`${stats.monthlyCount} ${intl.formatMessage({ id: 'admin.finance.payouts.stats.payouts' })}`}
              icon={TrendingUp}
              color="bg-green-500"
            />
            <StatsCard
              title={intl.formatMessage({ id: 'admin.finance.payouts.stats.avgTime' })}
              value={`${stats.averagePayoutTime.toFixed(1)} ${intl.formatMessage({ id: 'admin.finance.payouts.stats.days' })}`}
              subtitle={intl.formatMessage({ id: 'admin.finance.payouts.stats.callToPayout' })}
              icon={Calendar}
              color="bg-blue-500"
            />
            <StatsCard
              title={intl.formatMessage({ id: 'admin.finance.payouts.stats.nextScheduled' })}
              value={stats.nextScheduledDate ? intl.formatDate(stats.nextScheduledDate, { day: '2-digit', month: 'short' }) : 'N/A'}
              subtitle={stats.nextScheduledDate ? formatRelativeTime(stats.nextScheduledDate) : intl.formatMessage({ id: 'admin.finance.payouts.stats.noneScheduled' })}
              icon={Calendar}
              color="bg-purple-500"
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{intl.formatMessage({ id: 'admin.finance.payouts.filters' })}:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PayoutStatus | 'all')}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="all">{intl.formatMessage({ id: 'admin.finance.payouts.filter.allStatus' })}</option>
              <option value="pending">{intl.formatMessage({ id: 'admin.finance.payouts.filter.pending' })}</option>
              <option value="processing">{intl.formatMessage({ id: 'admin.finance.payouts.filter.processing' })}</option>
              <option value="completed">{intl.formatMessage({ id: 'admin.finance.payouts.filter.completed' })}</option>
              <option value="failed">{intl.formatMessage({ id: 'admin.finance.payouts.filter.failed' })}</option>
            </select>

            {/* Provider Type Filter */}
            <select
              value={providerTypeFilter}
              onChange={(e) => setProviderTypeFilter(e.target.value as ProviderType | 'all')}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="all">{intl.formatMessage({ id: 'admin.finance.payouts.filter.allTypes' })}</option>
              <option value="lawyer">{intl.formatMessage({ id: 'admin.finance.payouts.filter.lawyer' })}</option>
              <option value="expat">{intl.formatMessage({ id: 'admin.finance.payouts.filter.expat' })}</option>
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                placeholder={intl.formatMessage({ id: 'admin.finance.payouts.filter.startDate' })}
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                placeholder={intl.formatMessage({ id: 'admin.finance.payouts.filter.endDate' })}
              />
            </div>

            {/* Amount Range */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.finance.payouts.filter.minAmount' })}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.finance.payouts.filter.maxAmount' })}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-24"
              />
            </div>

            <div className="flex-1"></div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder={intl.formatMessage({ id: 'admin.finance.payouts.filter.search' })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-4 py-1.5 border border-gray-300 rounded-md text-sm w-64"
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>

            {/* Select All Pending */}
            <button
              onClick={selectAllPending}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {intl.formatMessage({ id: 'admin.finance.payouts.selectAllPending' })}
            </button>

            <span className="text-sm text-gray-500">
              {filteredPayouts.length} {intl.formatMessage({ id: 'admin.finance.payouts.results' })}
            </span>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    <button
                      onClick={selectAllPending}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <CheckSquare size={16} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.finance.payouts.table.provider' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.finance.payouts.table.bankAccount' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.finance.payouts.table.callsCount' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.finance.payouts.table.grossAmount' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.finance.payouts.table.commission' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.finance.payouts.table.netAmount' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.finance.payouts.table.status' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.finance.payouts.table.scheduledDate' })}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {intl.formatMessage({ id: 'admin.finance.payouts.table.actions' })}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    {/* Checkbox */}
                    <td className="px-4 py-4">
                      {payout.status === 'pending' && (
                        <button
                          onClick={() => toggleBatchSelection(payout.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {selectedForBatch.has(payout.id) ? (
                            <CheckSquare size={16} className="text-blue-600" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      )}
                    </td>

                    {/* Provider */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {payout.providerInfo?.profilePhoto ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={payout.providerInfo.profilePhoto}
                              alt={intl.formatMessage({ id: 'admin.common.profilePhotoOf' }, { name: payout.providerInfo?.displayName || `${payout.providerInfo?.firstName || ''} ${payout.providerInfo?.lastName || ''}`.trim() || intl.formatMessage({ id: 'admin.common.professional' }) })}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {payout.providerInfo?.displayName ||
                             `${payout.providerInfo?.firstName || ''} ${payout.providerInfo?.lastName || ''}`.trim() ||
                             'N/A'}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{payout.providerInfo?.email}</span>
                            {payout.providerInfo?.type && (
                              <ProviderTypeBadge type={payout.providerInfo.type} />
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Bank Account */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <BankAccountBadge
                        last4={payout.providerInfo?.bankAccountLast4}
                        verified={payout.providerInfo?.bankAccountVerified}
                      />
                    </td>

                    {/* Calls Count */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payout.callsCount}
                    </td>

                    {/* Gross Amount */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payout.grossAmount, payout.currency)}
                    </td>

                    {/* Commission */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(payout.commissionAmount, payout.currency)}
                    </td>

                    {/* Net Amount */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      {formatCurrency(payout.netAmount, payout.currency)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge status={payout.status} />
                      {payout.failureReason && (
                        <div className="text-xs text-red-500 mt-1" title={payout.failureReason}>
                          {payout.failureReason.substring(0, 30)}...
                        </div>
                      )}
                    </td>

                    {/* Scheduled Date */}
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payout.scheduledDate ? formatDateTime(payout.scheduledDate) : 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {/* View Details */}
                        <button
                          onClick={() => handleViewDetails(payout)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title={intl.formatMessage({ id: 'admin.finance.payouts.viewDetails' })}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Trigger Manual Payout */}
                        {payout.status === 'pending' && (
                          <button
                            onClick={() => triggerManualPayout(payout.id)}
                            disabled={isProcessing}
                            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded disabled:opacity-50"
                            title={intl.formatMessage({ id: 'admin.finance.payouts.triggerPayout' })}
                          >
                            <Play size={16} />
                          </button>
                        )}

                        {/* Retry Failed */}
                        {payout.status === 'failed' && (
                          <button
                            onClick={() => retryFailedPayout(payout.id)}
                            disabled={isProcessing}
                            className="p-1.5 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded disabled:opacity-50"
                            title={intl.formatMessage({ id: 'admin.finance.payouts.retryPayout' })}
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!isLoading && filteredPayouts.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {intl.formatMessage({ id: 'admin.finance.payouts.noPayouts' })}
                      </h3>
                      <p className="text-gray-600">
                        {intl.formatMessage({ id: 'admin.finance.payouts.noPayoutsHint' })}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {isLoading && (
            <div className="p-4 text-center text-gray-600">
              {intl.formatMessage({ id: 'admin.finance.payouts.loading' })}
            </div>
          )}
        </div>

        {/* Load More */}
        {hasMore && !isLoading && (
          <div className="mt-4 flex justify-center">
            <Button onClick={() => loadPayouts(false)} variant="outline">
              {intl.formatMessage({ id: 'admin.finance.payouts.loadMore' })}
            </Button>
          </div>
        )}

        {/* Payout Details Modal */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={intl.formatMessage({ id: 'admin.finance.payouts.modal.title' })}
          size="large"
        >
          {selectedPayout && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {selectedPayout.providerInfo?.profilePhoto ? (
                      <img
                        src={selectedPayout.providerInfo.profilePhoto}
                        alt={intl.formatMessage({ id: 'admin.common.profilePhotoOf' }, { name: selectedPayout.providerInfo?.displayName || `${selectedPayout.providerInfo?.firstName || ''} ${selectedPayout.providerInfo?.lastName || ''}`.trim() || intl.formatMessage({ id: 'admin.common.professional' }) })}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Users className="h-8 w-8 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedPayout.providerInfo?.displayName ||
                       `${selectedPayout.providerInfo?.firstName || ''} ${selectedPayout.providerInfo?.lastName || ''}`.trim() ||
                       'N/A'}
                    </h3>
                    <p className="text-gray-500">{selectedPayout.providerInfo?.email}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <StatusBadge status={selectedPayout.status} />
                      {selectedPayout.providerInfo?.type && (
                        <ProviderTypeBadge type={selectedPayout.providerInfo.type} />
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(selectedPayout.netAmount, selectedPayout.currency)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {intl.formatMessage({ id: 'admin.finance.payouts.modal.netAmount' })}
                  </div>
                </div>
              </div>

              {/* Commission Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.finance.payouts.modal.grossAmount' })}</div>
                  <div className="text-xl font-bold text-gray-900">{formatCurrency(selectedPayout.grossAmount, selectedPayout.currency)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.finance.payouts.modal.platformFee' })}</div>
                  <div className="text-xl font-bold text-red-600">-{formatCurrency(selectedPayout.commissionAmount, selectedPayout.currency)}</div>
                  <div className="text-xs text-gray-500">{(COMMISSION_RATE * 100).toFixed(0)}% commission</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.finance.payouts.modal.toBePaid' })}</div>
                  <div className="text-xl font-bold text-green-600">{formatCurrency(selectedPayout.netAmount, selectedPayout.currency)}</div>
                </div>
              </div>

              {/* Bank Transfer Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Building className="mr-2" size={16} />
                  {intl.formatMessage({ id: 'admin.finance.payouts.modal.bankDetails' })}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{intl.formatMessage({ id: 'admin.finance.payouts.modal.paymentMethod' })}:</span>
                    <span className="font-medium">{selectedPayout.providerInfo?.paymentGateway || 'Stripe'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{intl.formatMessage({ id: 'admin.finance.payouts.modal.accountNumber' })}:</span>
                    <span className="font-mono">****{selectedPayout.providerInfo?.bankAccountLast4 || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{intl.formatMessage({ id: 'admin.finance.payouts.modal.verificationStatus' })}:</span>
                    <span className={selectedPayout.providerInfo?.bankAccountVerified ? 'text-green-600' : 'text-yellow-600'}>
                      {selectedPayout.providerInfo?.bankAccountVerified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                  {selectedPayout.stripeTransferId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stripe Transfer ID:</span>
                      <span className="font-mono text-xs">{selectedPayout.stripeTransferId}</span>
                    </div>
                  )}
                  {selectedPayout.paypalPayoutId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">PayPal Payout ID:</span>
                      <span className="font-mono text-xs">{selectedPayout.paypalPayoutId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Calls Included */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <FileText className="mr-2" size={16} />
                  {intl.formatMessage({ id: 'admin.finance.payouts.modal.callsIncluded' })} ({selectedPayout.callsCount})
                </h4>
                <div className="bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                  {selectedPayout.callSessions && selectedPayout.callSessions.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Duration</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedPayout.callSessions.map(call => (
                          <tr key={call.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateTime(call.createdAt)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {call.metadata.clientName || 'N/A'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {call.duration ? `${call.duration} min` : 'N/A'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {formatCurrency(call.payment.providerAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="p-4 text-center text-gray-500">
                      {intl.formatMessage({ id: 'admin.finance.payouts.modal.noCallsLoaded' })}
                    </p>
                  )}
                </div>
              </div>

              {/* Audit Trail */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Clock className="mr-2" size={16} />
                  {intl.formatMessage({ id: 'admin.finance.payouts.modal.auditTrail' })}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {selectedPayout.auditTrail && selectedPayout.auditTrail.length > 0 ? (
                    selectedPayout.auditTrail.map((entry, index) => (
                      <div key={index} className="flex items-start space-x-3 py-2 border-b border-gray-200 last:border-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{entry.action}</div>
                          <div className="text-xs text-gray-500">
                            {formatDateTime(entry.timestamp)}
                            {entry.userId && ` - by ${entry.userId}`}
                          </div>
                          {entry.details && (
                            <div className="text-xs text-gray-600 mt-1">{entry.details}</div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">
                      <div className="flex items-start space-x-3 py-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div>
                          <div className="font-medium text-gray-900">Payout created</div>
                          <div className="text-xs text-gray-500">{formatDateTime(selectedPayout.createdAt)}</div>
                        </div>
                      </div>
                      {selectedPayout.processedAt && (
                        <div className="flex items-start space-x-3 py-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div>
                            <div className="font-medium text-gray-900">Payout processed</div>
                            <div className="text-xs text-gray-500">{formatDateTime(selectedPayout.processedAt)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  {intl.formatMessage({ id: 'admin.finance.payouts.modal.close' })}
                </button>
                <div className="flex space-x-3">
                  {selectedPayout.status === 'pending' && (
                    <Button
                      onClick={() => {
                        triggerManualPayout(selectedPayout.id);
                        setShowDetailModal(false);
                      }}
                      disabled={isProcessing}
                    >
                      <Play size={16} className="mr-2" />
                      {intl.formatMessage({ id: 'admin.finance.payouts.modal.processPayout' })}
                    </Button>
                  )}
                  {selectedPayout.status === 'failed' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        retryFailedPayout(selectedPayout.id);
                        setShowDetailModal(false);
                      }}
                      disabled={isProcessing}
                    >
                      <RotateCcw size={16} className="mr-2" />
                      {intl.formatMessage({ id: 'admin.finance.payouts.modal.retryPayout' })}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Schedule Configuration Modal */}
        <Modal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          title={intl.formatMessage({ id: 'admin.finance.payouts.schedule.title' })}
          size="medium"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {intl.formatMessage({ id: 'admin.finance.payouts.schedule.frequency' })}
              </label>
              <select
                value={scheduleConfig.frequency}
                onChange={(e) => setScheduleConfig(prev => ({ ...prev, frequency: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="daily">{intl.formatMessage({ id: 'admin.finance.payouts.schedule.daily' })}</option>
                <option value="weekly">{intl.formatMessage({ id: 'admin.finance.payouts.schedule.weekly' })}</option>
                <option value="biweekly">{intl.formatMessage({ id: 'admin.finance.payouts.schedule.biweekly' })}</option>
                <option value="monthly">{intl.formatMessage({ id: 'admin.finance.payouts.schedule.monthly' })}</option>
              </select>
            </div>

            {scheduleConfig.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {intl.formatMessage({ id: 'admin.finance.payouts.schedule.dayOfWeek' })}
                </label>
                <select
                  value={scheduleConfig.dayOfWeek}
                  onChange={(e) => setScheduleConfig(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>
            )}

            {scheduleConfig.frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {intl.formatMessage({ id: 'admin.finance.payouts.schedule.dayOfMonth' })}
                </label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={scheduleConfig.dayOfMonth || 1}
                  onChange={(e) => setScheduleConfig(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {intl.formatMessage({ id: 'admin.finance.payouts.schedule.minimumAmount' })}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min={0}
                  value={scheduleConfig.minimumAmount}
                  onChange={(e) => setScheduleConfig(prev => ({ ...prev, minimumAmount: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
                <span className="text-gray-500">{scheduleConfig.currency}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {intl.formatMessage({ id: 'admin.finance.payouts.schedule.minimumHint' })}
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                {intl.formatMessage({ id: 'admin.finance.payouts.schedule.cancel' })}
              </button>
              <Button onClick={saveScheduleConfig}>
                {intl.formatMessage({ id: 'admin.finance.payouts.schedule.save' })}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Batch Payout Modal */}
        <Modal
          isOpen={showBatchModal}
          onClose={() => setShowBatchModal(false)}
          title={intl.formatMessage({ id: 'admin.finance.payouts.batch.title' })}
          size="medium"
        >
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="text-yellow-600 mr-3 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-medium text-yellow-800">
                    {intl.formatMessage({ id: 'admin.finance.payouts.batch.warning' })}
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {intl.formatMessage({ id: 'admin.finance.payouts.batch.warningText' }, { count: selectedForBatch.size })}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {intl.formatMessage({ id: 'admin.finance.payouts.batch.summary' })}
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{intl.formatMessage({ id: 'admin.finance.payouts.batch.totalPayouts' })}:</span>
                  <span className="font-medium">{selectedForBatch.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{intl.formatMessage({ id: 'admin.finance.payouts.batch.totalAmount' })}:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(
                      payouts
                        .filter(p => selectedForBatch.has(p.id))
                        .reduce((sum, p) => sum + p.netAmount, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                {intl.formatMessage({ id: 'admin.finance.payouts.batch.cancel' })}
              </button>
              <Button onClick={processBatchPayout} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader size={16} className="mr-2 animate-spin" />
                    {intl.formatMessage({ id: 'admin.finance.payouts.batch.processing' })}
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    {intl.formatMessage({ id: 'admin.finance.payouts.batch.confirm' })}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default Payouts;
