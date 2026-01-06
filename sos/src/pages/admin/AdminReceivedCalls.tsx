import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../contexts/AppContext";
import { getDateLocale } from "../../utils/formatters";
import {
  Phone,
  Clock,
  Users,
  Search,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Timer,
  Copy,
  TrendingUp,
  AlertCircle,
  Wallet,
  ExternalLink
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  getDoc,
  doc,
  Timestamp,
  startAfter,
  DocumentSnapshot
} from "firebase/firestore";
import { db } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { useAuth } from "../../contexts/AuthContext";
import { logError } from "../../utils/logging";

// ============ TYPES ============
interface ReceivedCall {
  id: string;
  // Session data
  status: string;
  completedAt?: Timestamp;
  // Participant data
  participants: {
    provider: {
      phone: string;
      status: string;
      connectedAt?: Timestamp;
      disconnectedAt?: Timestamp;
    };
    client: {
      phone: string;
      status: string;
      connectedAt?: Timestamp;
      disconnectedAt?: Timestamp;
    };
  };
  // Conference data
  conference: {
    duration?: number;
    startedAt?: Timestamp;
    endedAt?: Timestamp;
  };
  // Payment data
  payment: {
    intentId: string;
    status: string;
    amount: number;
    providerAmount?: number;
    commissionAmount?: number;
    currency?: string;
    capturedAt?: Timestamp;
  };
  // Metadata
  metadata: {
    providerId: string;
    clientId: string;
    providerName?: string;
    clientName?: string;
    serviceType: string;
    providerType: string;
    createdAt: Timestamp;
    country?: string;
    interventionCountry?: string;
  };
  // Enriched data (loaded separately)
  payout?: {
    status: 'paid' | 'pending' | 'pending_kyc' | 'failed' | 'processing';
    transferId?: string;
    paidAt?: Timestamp;
    method?: 'stripe' | 'paypal' | 'bank_transfer';
    reason?: string;
  };
  costs?: {
    twilio: number;
    gcp: number;
    other: number;
    total: number;
  };
}

interface CallFilters {
  period: string;
  providerType: string;
  paymentStatus: string;
  payoutStatus: string;
}

interface CallStats {
  totalCalls: number;
  totalRevenue: number;
  totalCommission: number;
  totalCosts: number;
  netProfit: number;
  avgDuration: number;
  pendingPayouts: number;
  blockedKyc: number;
}

// ============ COST CALCULATION CONSTANTS ============
// Based on actual pricing from getCostMetrics.ts
const COST_PRICING = {
  // Twilio pricing (Europe)
  TWILIO: {
    VOICE_PER_MINUTE_EUR: 0.014,  // Prix par minute d'appel sortant
    // Pour un appel conférence: 2 participants × 2 legs = ~4× le tarif de base
    // + frais de conférence Twilio
    CONFERENCE_MULTIPLIER: 4.2,
  },
  // GCP costs (estimated per call)
  GCP: {
    CLOUD_FUNCTIONS_PER_CALL_EUR: 0.002,  // ~2 invocations par appel
    FIRESTORE_PER_CALL_EUR: 0.001,         // ~10-20 reads/writes par appel
    CLOUD_TASKS_PER_CALL_EUR: 0.0005,      // Scheduling
  },
  // Other costs
  OTHER: {
    STRIPE_PERCENTAGE: 0.014,  // 1.4% + 0.25€ par transaction
    STRIPE_FIXED_EUR: 0.25,
    PAYPAL_PERCENTAGE: 0.029,  // 2.9% + 0.35€
    PAYPAL_FIXED_EUR: 0.35,
  }
};

/**
 * Calculate costs for a single call based on duration and payment amount
 */
const calculateCallCosts = (
  durationSeconds: number,
  paymentAmount: number,
  paymentMethod: 'stripe' | 'paypal' = 'stripe'
): { twilio: number; gcp: number; other: number; total: number } => {
  // Twilio cost: duration in minutes × rate × conference multiplier
  const durationMinutes = Math.ceil(durationSeconds / 60); // Round up to next minute
  const twilioCost = durationMinutes * COST_PRICING.TWILIO.VOICE_PER_MINUTE_EUR * COST_PRICING.TWILIO.CONFERENCE_MULTIPLIER;

  // GCP cost: fixed overhead per call
  const gcpCost =
    COST_PRICING.GCP.CLOUD_FUNCTIONS_PER_CALL_EUR +
    COST_PRICING.GCP.FIRESTORE_PER_CALL_EUR +
    COST_PRICING.GCP.CLOUD_TASKS_PER_CALL_EUR;

  // Payment processing cost
  let otherCost = 0;
  if (paymentMethod === 'stripe') {
    otherCost = (paymentAmount * COST_PRICING.OTHER.STRIPE_PERCENTAGE) + COST_PRICING.OTHER.STRIPE_FIXED_EUR;
  } else if (paymentMethod === 'paypal') {
    otherCost = (paymentAmount * COST_PRICING.OTHER.PAYPAL_PERCENTAGE) + COST_PRICING.OTHER.PAYPAL_FIXED_EUR;
  }

  const total = twilioCost + gcpCost + otherCost;

  return {
    twilio: Math.round(twilioCost * 100) / 100,
    gcp: Math.round(gcpCost * 100) / 100,
    other: Math.round(otherCost * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

// ============ MAIN COMPONENT ============
const AdminReceivedCalls: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { language } = useApp();
  const intl = useIntl();

  // Get locale for date formatting
  const dateLocale = getDateLocale(language);

  // Helper function for translations
  const t = (id: string, values?: Record<string, any>) =>
    intl.formatMessage({ id }, values);

  // States
  const [calls, setCalls] = useState<ReceivedCall[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // UI States
  const [selectedCall, setSelectedCall] = useState<ReceivedCall | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<CallFilters>({
    period: '30d',
    providerType: 'all',
    paymentStatus: 'all',
    payoutStatus: 'all'
  });

  // Cache for user names
  const [userNamesCache, setUserNamesCache] = useState<Record<string, { firstName?: string; lastName?: string; displayName?: string }>>({});

  const ITEMS_PER_PAGE = 30;

  // Auth check
  useEffect(() => {
    if (!currentUser || (currentUser as any).role !== 'admin') {
      navigate('/admin/login');
      return;
    }
  }, [currentUser, navigate]);

  // Load calls when filters change
  useEffect(() => {
    loadCalls(true);
  }, [filters]);

  // Calculate stats when calls change
  useEffect(() => {
    if (calls.length > 0) {
      calculateStats();
    }
  }, [calls]);

  const getDateRangeStart = useCallback(() => {
    const now = new Date();
    switch (filters.period) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        return yesterday;
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // All time
    }
  }, [filters.period]);

  const enrichCallsWithNames = async (callsList: ReceivedCall[]): Promise<ReceivedCall[]> => {
    const missingClientIds = new Set<string>();
    const missingProviderIds = new Set<string>();

    callsList.forEach(call => {
      if (!call.metadata.clientName && call.metadata.clientId && !userNamesCache[call.metadata.clientId]) {
        missingClientIds.add(call.metadata.clientId);
      }
      if (!call.metadata.providerName && call.metadata.providerId && !userNamesCache[call.metadata.providerId]) {
        missingProviderIds.add(call.metadata.providerId);
      }
    });

    if (missingClientIds.size === 0 && missingProviderIds.size === 0) {
      return callsList.map(call => ({
        ...call,
        metadata: {
          ...call.metadata,
          clientName: call.metadata.clientName || formatUserName(userNamesCache[call.metadata.clientId]),
          providerName: call.metadata.providerName || formatUserName(userNamesCache[call.metadata.providerId])
        }
      }));
    }

    const newCache: Record<string, { firstName?: string; lastName?: string; displayName?: string }> = { ...userNamesCache };

    // Load client names from "users"
    const clientPromises = Array.from(missingClientIds).map(async (clientId) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', clientId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          newCache[clientId] = {
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: data.displayName || data.name
          };
        }
      } catch (error) {
        console.error(`Error loading user ${clientId}:`, error);
      }
    });

    // Load provider names from "sos_profiles" (with fallback to "users")
    const providerPromises = Array.from(missingProviderIds).map(async (providerId) => {
      try {
        const profileDoc = await getDoc(doc(db, 'sos_profiles', providerId));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          newCache[providerId] = {
            firstName: data.firstName,
            lastName: data.lastName,
            displayName: data.displayName || data.name
          };
        } else {
          const userDoc = await getDoc(doc(db, 'users', providerId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            newCache[providerId] = {
              firstName: data.firstName,
              lastName: data.lastName,
              displayName: data.displayName || data.name
            };
          }
        }
      } catch (error) {
        console.error(`Error loading provider ${providerId}:`, error);
      }
    });

    await Promise.all([...clientPromises, ...providerPromises]);
    setUserNamesCache(newCache);

    return callsList.map(call => ({
      ...call,
      metadata: {
        ...call.metadata,
        clientName: call.metadata.clientName || formatUserName(newCache[call.metadata.clientId]),
        providerName: call.metadata.providerName || formatUserName(newCache[call.metadata.providerId])
      }
    }));
  };

  // Fetch providerAmount and commissionAmount from payments collection
  const enrichCallsWithPaymentData = async (callsList: ReceivedCall[]): Promise<ReceivedCall[]> => {
    const paymentIds = callsList
      .map(c => c.payment?.intentId)
      .filter((id): id is string => !!id && id.length > 0);

    if (paymentIds.length === 0) return callsList;

    // Load payment data from payments collection
    const paymentsMap: Record<string, { providerAmount?: number; commissionAmount?: number; currency?: string }> = {};

    try {
      // Batch load payment documents
      const batchSize = 10;
      for (let i = 0; i < paymentIds.length; i += batchSize) {
        const batch = paymentIds.slice(i, i + batchSize);
        const promises = batch.map(async (paymentId) => {
          try {
            const paymentDoc = await getDoc(doc(db, 'payments', paymentId));
            if (paymentDoc.exists()) {
              const data = paymentDoc.data();
              // Amounts in payments collection are stored in cents - convert to main unit
              paymentsMap[paymentId] = {
                providerAmount: typeof data.providerAmount === 'number' ? data.providerAmount / 100 : undefined,
                commissionAmount: typeof data.commissionAmount === 'number' ? data.commissionAmount / 100 : undefined,
                currency: data.currency?.toUpperCase() || 'EUR'
              };
            }
          } catch (error) {
            console.error(`Error loading payment ${paymentId}:`, error);
          }
        });
        await Promise.all(promises);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
    }

    // Enrich calls with payment amounts
    return callsList.map(call => {
      const paymentId = call.payment?.intentId;
      const paymentData = paymentId ? paymentsMap[paymentId] : undefined;

      if (paymentData) {
        return {
          ...call,
          payment: {
            ...call.payment,
            providerAmount: paymentData.providerAmount ?? call.payment.providerAmount,
            commissionAmount: paymentData.commissionAmount ?? call.payment.commissionAmount,
            currency: paymentData.currency ?? call.payment.currency ?? 'EUR'
          }
        };
      }
      return call;
    });
  };

  // Calculate costs for each call based on duration and payment
  const enrichCallsWithCosts = (callsList: ReceivedCall[]): ReceivedCall[] => {
    return callsList.map(call => {
      const duration = call.conference?.duration || 0;
      const paymentAmount = call.payment?.amount || 0;

      // Detect payment method from intentId prefix
      const paymentMethod: 'stripe' | 'paypal' =
        call.payment?.intentId?.startsWith('pi_') ? 'stripe' : 'paypal';

      const costs = calculateCallCosts(duration, paymentAmount, paymentMethod);

      return {
        ...call,
        costs
      };
    });
  };

  const enrichCallsWithPayoutStatus = async (callsList: ReceivedCall[]): Promise<ReceivedCall[]> => {
    // Get unique provider IDs
    const providerIds = [...new Set(callsList.map(c => c.metadata.providerId))];

    // Load transfers (successful payouts)
    const transfersMap: Record<string, any> = {};
    const pendingTransfersMap: Record<string, any> = {};
    const failedPayoutsMap: Record<string, any> = {};

    try {
      // Load completed transfers
      for (const providerId of providerIds) {
        const transfersQuery = query(
          collection(db, 'transfers'),
          where('providerId', '==', providerId),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(transfersQuery);
        snapshot.docs.forEach(d => {
          const data = d.data();
          if (!transfersMap[providerId]) transfersMap[providerId] = [];
          transfersMap[providerId].push({ id: d.id, ...data });
        });
      }

      // Load pending transfers (blocked due to KYC)
      for (const providerId of providerIds) {
        const pendingQuery = query(
          collection(db, 'pending_transfers'),
          where('providerId', '==', providerId)
        );
        const snapshot = await getDocs(pendingQuery);
        snapshot.docs.forEach(d => {
          const data = d.data();
          if (!pendingTransfersMap[providerId]) pendingTransfersMap[providerId] = [];
          pendingTransfersMap[providerId].push({ id: d.id, ...data });
        });
      }

      // Load failed payout alerts
      for (const providerId of providerIds) {
        const failedQuery = query(
          collection(db, 'failed_payouts_alerts'),
          where('providerId', '==', providerId),
          where('status', '==', 'active')
        );
        const snapshot = await getDocs(failedQuery);
        snapshot.docs.forEach(d => {
          const data = d.data();
          failedPayoutsMap[providerId] = { id: d.id, ...data };
        });
      }
    } catch (error) {
      console.error('Error loading payout data:', error);
    }

    // Enrich calls with payout status
    return callsList.map(call => {
      const providerId = call.metadata.providerId;
      const sessionId = call.id;

      // Check if there's a completed transfer for this session
      const providerTransfers = transfersMap[providerId] || [];
      const completedTransfer = providerTransfers.find((t: any) =>
        t.callSessionId === sessionId || t.paymentIntentId === call.payment.intentId
      );

      if (completedTransfer) {
        return {
          ...call,
          payout: {
            status: 'paid' as const,
            transferId: completedTransfer.stripePayoutId || completedTransfer.id,
            paidAt: completedTransfer.arrivalDate || completedTransfer.createdAt,
            method: completedTransfer.paypalPayoutId ? 'paypal' : 'stripe'
          }
        };
      }

      // Check if there's a pending transfer (KYC blocked)
      const pendingTransfers = pendingTransfersMap[providerId] || [];
      const pendingTransfer = pendingTransfers.find((t: any) =>
        t.callSessionId === sessionId || t.paymentIntentId === call.payment.intentId
      );

      if (pendingTransfer) {
        return {
          ...call,
          payout: {
            status: 'pending_kyc' as const,
            reason: pendingTransfer.reason || 'KYC documents pending verification'
          }
        };
      }

      // Check if there's a failed payout alert
      const failedAlert = failedPayoutsMap[providerId];
      if (failedAlert) {
        return {
          ...call,
          payout: {
            status: 'failed' as const,
            reason: failedAlert.reason
          }
        };
      }

      // Default: Payment captured but payout pending
      if (call.payment.status === 'captured') {
        return {
          ...call,
          payout: {
            status: 'pending' as const
          }
        };
      }

      return call;
    });
  };

  const formatUserName = (user?: { firstName?: string; lastName?: string; displayName?: string }): string => {
    if (!user) return '';
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.displayName) return user.displayName;
    if (user.firstName) return user.firstName;
    return '';
  };

  const loadCalls = async (isInitial: boolean = true) => {
    try {
      if (isInitial) {
        setLoading(true);
        setCalls([]);
        setLastDoc(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      // Build query - only completed/failed calls
      // NOTE: Firestore doesn't allow multiple 'in' clauses, so we filter payment.status client-side
      const constraints: any[] = [
        where('status', 'in', ['completed', 'failed'])
      ];

      // Date filter
      if (filters.period !== 'all') {
        constraints.push(where('metadata.createdAt', '>=', Timestamp.fromDate(getDateRangeStart())));
      }

      constraints.push(orderBy('metadata.createdAt', 'desc'));
      constraints.push(limit(ITEMS_PER_PAGE * 3)); // Load more for client-side filtering

      if (!isInitial && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const callsQuery = query(collection(db, 'call_sessions'), ...constraints);
      const snapshot = await getDocs(callsQuery);

      if (snapshot.empty) {
        setHasMore(false);
        if (isInitial) setLoading(false);
        else setLoadingMore(false);
        return;
      }

      let rawCalls = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      } as ReceivedCall));

      // Client-side filtering for payment status (Firestore doesn't allow multiple 'in' clauses)
      rawCalls = rawCalls.filter(c =>
        ['captured', 'succeeded', 'refunded'].includes(c.payment?.status || '')
      );

      if (filters.providerType !== 'all') {
        rawCalls = rawCalls.filter(c => c.metadata.providerType === filters.providerType);
      }
      if (filters.paymentStatus !== 'all') {
        rawCalls = rawCalls.filter(c => c.payment.status === filters.paymentStatus);
      }

      // Limit results
      const limitedCalls = rawCalls.slice(0, ITEMS_PER_PAGE);

      // Enrich with names
      const enrichedWithNames = await enrichCallsWithNames(limitedCalls);

      // Enrich with payment data (providerAmount, commissionAmount from payments collection)
      const enrichedWithPayments = await enrichCallsWithPaymentData(enrichedWithNames);

      // Calculate costs for each call (Twilio, GCP, payment processing fees)
      const enrichedWithCosts = enrichCallsWithCosts(enrichedWithPayments);

      // Enrich with payout status
      const enrichedCalls = await enrichCallsWithPayoutStatus(enrichedWithCosts);

      // Filter by payout status if needed
      let finalCalls = enrichedCalls;
      if (filters.payoutStatus !== 'all') {
        finalCalls = enrichedCalls.filter(c => {
          if (filters.payoutStatus === 'paid') return c.payout?.status === 'paid';
          if (filters.payoutStatus === 'pending_kyc') return c.payout?.status === 'pending_kyc';
          if (filters.payoutStatus === 'failed') return c.payout?.status === 'failed';
          if (filters.payoutStatus === 'pending') return c.payout?.status === 'pending' || !c.payout;
          return true;
        });
      }

      if (isInitial) {
        setCalls(finalCalls);
      } else {
        setCalls(prev => [...prev, ...finalCalls]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length >= ITEMS_PER_PAGE);

    } catch (error) {
      console.error('Error loading calls:', error);
      logError({
        origin: 'frontend',
        error: `Error loading received calls: ${error instanceof Error ? error.message : 'Unknown'}`,
        context: { component: 'AdminReceivedCalls' }
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const calculateStats = () => {
    const totalCalls = calls.length;
    const totalRevenue = calls.reduce((sum, c) => sum + (c.payment.amount || 0), 0);
    const totalCommission = calls.reduce((sum, c) => sum + (c.payment.commissionAmount || 0), 0);
    const totalCosts = calls.reduce((sum, c) => sum + (c.costs?.total || 0), 0);
    const netProfit = totalCommission - totalCosts;

    const completedCalls = calls.filter(c => c.conference.duration && c.conference.duration > 0);
    const avgDuration = completedCalls.length > 0
      ? completedCalls.reduce((sum, c) => sum + (c.conference.duration || 0), 0) / completedCalls.length
      : 0;

    const pendingPayouts = calls.filter(c => c.payout?.status === 'pending' || !c.payout).length;
    const blockedKyc = calls.filter(c => c.payout?.status === 'pending_kyc').length;

    setStats({
      totalCalls,
      totalRevenue,
      totalCommission,
      totalCosts,
      netProfit,
      avgDuration,
      pendingPayouts,
      blockedKyc
    });
  };

  // Filtered calls for search
  const filteredCalls = useMemo(() => {
    if (!searchTerm) return calls;
    const searchLower = searchTerm.toLowerCase();
    return calls.filter(call =>
      call.id.toLowerCase().includes(searchLower) ||
      call.metadata.providerName?.toLowerCase().includes(searchLower) ||
      call.metadata.clientName?.toLowerCase().includes(searchLower) ||
      call.participants.provider.phone.includes(searchTerm) ||
      call.participants.client.phone.includes(searchTerm) ||
      call.payment.intentId.toLowerCase().includes(searchLower)
    );
  }, [calls, searchTerm]);

  const handleRefresh = useCallback(() => {
    loadCalls(true);
  }, []);

  const handleExportCSV = useCallback(() => {
    if (calls.length === 0) return;

    const csvData = calls.map(call => ({
      [t('admin.receivedCalls.modal.sessionId')]: call.id,
      [t('admin.receivedCalls.modal.date')]: call.metadata.createdAt?.toDate().toLocaleDateString() || '',
      [t('admin.receivedCalls.modal.time')]: call.metadata.createdAt?.toDate().toLocaleTimeString() || '',
      [t('admin.receivedCalls.table.duration')]: call.conference.duration ? `${Math.floor(call.conference.duration / 60)}m ${call.conference.duration % 60}s` : '0',
      [t('admin.receivedCalls.table.client')]: call.metadata.clientName || '',
      [t('admin.receivedCalls.table.provider')]: call.metadata.providerName || '',
      [t('admin.receivedCalls.table.providerRole')]: call.metadata.providerType,
      [t('admin.receivedCalls.table.country')]: call.metadata.interventionCountry || call.metadata.country || '',
      [t('admin.receivedCalls.table.totalAmount')]: call.payment.amount?.toFixed(2) || '0',
      [t('admin.receivedCalls.table.providerEarnings')]: call.payment.providerAmount?.toFixed(2) || '0',
      [t('admin.receivedCalls.table.sosCommission')]: call.payment.commissionAmount?.toFixed(2) || '0',
      [t('admin.receivedCalls.table.costs')]: call.costs?.total?.toFixed(2) || '0',
      [t('admin.receivedCalls.table.netProfit')]: ((call.payment.commissionAmount || 0) - (call.costs?.total || 0)).toFixed(2),
      [t('admin.receivedCalls.table.currency')]: call.payment.currency || 'EUR',
      [t('admin.receivedCalls.table.payoutStatus')]: call.payout?.status || 'pending'
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(v =>
        typeof v === 'string' && v.includes(',') ? `"${v}"` : v
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `appels_recus_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [calls, t]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatAmount = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat(dateLocale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getPayoutStatusBadge = (payout?: ReceivedCall['payout']) => {
    if (!payout) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock size={12} className="mr-1" />
          {t('admin.receivedCalls.payoutStatus.pending')}
        </span>
      );
    }

    switch (payout.status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" />
            {t('admin.receivedCalls.payoutStatus.paid')}
          </span>
        );
      case 'pending_kyc':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <AlertCircle size={12} className="mr-1" />
            {t('admin.receivedCalls.payoutStatus.pendingKyc')}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={12} className="mr-1" />
            {t('admin.receivedCalls.payoutStatus.failed')}
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <RefreshCw size={12} className="mr-1 animate-spin" />
            {t('admin.receivedCalls.payoutStatus.processing')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} className="mr-1" />
            {t('admin.receivedCalls.payoutStatus.pending')}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('admin.receivedCalls.loading')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ErrorBoundary>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Phone className="w-7 h-7 mr-2 text-green-600" />
                {t('admin.receivedCalls.title')}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('admin.receivedCalls.subtitle')}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center"
                disabled={calls.length === 0}
              >
                <Download size={16} className="mr-2" />
                {t('admin.receivedCalls.exportCsv')}
              </Button>

              <Button
                onClick={handleRefresh}
                variant="outline"
                className="flex items-center"
              >
                <RefreshCw size={16} className="mr-2" />
                {t('admin.receivedCalls.refresh')}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('admin.receivedCalls.stats.totalCalls')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCalls}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('admin.receivedCalls.stats.totalCommission')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatAmount(stats.totalCommission)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('admin.receivedCalls.stats.netProfit')}</p>
                    <p className="text-2xl font-bold text-gray-900">{formatAmount(stats.netProfit)}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-100">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('admin.receivedCalls.stats.blockedKyc')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.blockedKyc}</p>
                    {stats.blockedKyc > 0 && (
                      <p className="text-xs text-orange-600 mt-1">{t('admin.receivedCalls.stats.pendingPayouts')}: {stats.pendingPayouts}</p>
                    )}
                  </div>
                  <div className="p-3 rounded-full bg-orange-100">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.receivedCalls.filters.period')}
                </label>
                <select
                  value={filters.period}
                  onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="today">{t('admin.receivedCalls.filters.today')}</option>
                  <option value="yesterday">{t('admin.receivedCalls.filters.yesterday')}</option>
                  <option value="7d">{t('admin.receivedCalls.filters.last7days')}</option>
                  <option value="30d">{t('admin.receivedCalls.filters.last30days')}</option>
                  <option value="90d">{t('admin.receivedCalls.filters.last90days')}</option>
                  <option value="all">{t('admin.receivedCalls.filters.allTime')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.receivedCalls.filters.providerType')}
                </label>
                <select
                  value={filters.providerType}
                  onChange={(e) => setFilters(prev => ({ ...prev, providerType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('admin.receivedCalls.filters.allTypes')}</option>
                  <option value="lawyer">{t('admin.receivedCalls.filters.lawyer')}</option>
                  <option value="expat">{t('admin.receivedCalls.filters.expat')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.receivedCalls.filters.paymentStatus')}
                </label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('admin.receivedCalls.filters.allStatuses')}</option>
                  <option value="captured">{t('admin.receivedCalls.filters.captured')}</option>
                  <option value="refunded">{t('admin.receivedCalls.filters.refunded')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.receivedCalls.filters.payoutStatus')}
                </label>
                <select
                  value={filters.payoutStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, payoutStatus: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('admin.receivedCalls.filters.allStatuses')}</option>
                  <option value="paid">{t('admin.receivedCalls.filters.paid')}</option>
                  <option value="pending_kyc">{t('admin.receivedCalls.filters.pendingKyc')}</option>
                  <option value="pending">{t('admin.receivedCalls.filters.pending')}</option>
                  <option value="failed">{t('admin.receivedCalls.filters.failed')}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={t('admin.receivedCalls.filters.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              </div>

              <button
                onClick={() => setFilters({ period: '30d', providerType: 'all', paymentStatus: 'all', payoutStatus: 'all' })}
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('admin.receivedCalls.filters.reset')}
              </button>

              <div className="text-sm text-gray-600">
                {t('admin.receivedCalls.results', { count: filteredCalls.length })}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.receivedCalls.table.dateTime')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.receivedCalls.table.duration')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.receivedCalls.table.client')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.receivedCalls.table.provider')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.receivedCalls.table.country')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.receivedCalls.table.totalAmount')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.receivedCalls.table.providerEarnings')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.receivedCalls.table.sosCommission')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.receivedCalls.table.payoutStatus')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.receivedCalls.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {call.metadata.createdAt?.toDate().toLocaleDateString(dateLocale)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {call.metadata.createdAt?.toDate().toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm">
                          <Timer size={14} className="mr-1 text-gray-400" />
                          {formatDuration(call.conference.duration || 0)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {call.metadata.clientName || '—'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {call.participants.client.phone}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {call.metadata.providerName || '—'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {call.metadata.providerType === 'lawyer' ? '⚖️' : '🌍'} {t(`admin.receivedCalls.filters.${call.metadata.providerType}`)}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {call.metadata.interventionCountry || call.metadata.country || '—'}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatAmount(call.payment.amount || 0, call.payment.currency)}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {formatAmount(call.payment.providerAmount || 0, call.payment.currency)}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {formatAmount(call.payment.commissionAmount || 0, call.payment.currency)}
                        </div>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {getPayoutStatusBadge(call.payout)}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedCall(call);
                              setShowDetailModal(true);
                            }}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('admin.receivedCalls.modal.title')}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => copyToClipboard(call.id)}
                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                            title={t('admin.receivedCalls.modal.copySessionId')}
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* No data message */}
            {filteredCalls.length === 0 && (
              <div className="text-center py-12">
                <Phone className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('admin.receivedCalls.noData')}</h3>
                <p className="text-gray-600">{t('admin.receivedCalls.noDataHint')}</p>
              </div>
            )}

            {/* Load more button */}
            {hasMore && filteredCalls.length > 0 && (
              <div className="border-t border-gray-200 px-6 py-4 text-center">
                <Button
                  onClick={() => loadCalls(false)}
                  loading={loadingMore}
                  variant="outline"
                  className="w-full"
                >
                  {loadingMore ? t('admin.receivedCalls.loading') : t('admin.receivedCalls.loadMore')}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={t('admin.receivedCalls.modal.title')}
          size="large"
        >
          {selectedCall && (
            <div className="space-y-6">
              {/* Call Info */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                  <Phone className="mr-2" size={16} />
                  {t('admin.receivedCalls.modal.callInfo')}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.sessionId')}:</span>
                    <div className="text-sm font-mono">{selectedCall.id}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.date')}:</span>
                    <div className="text-sm font-medium">
                      {selectedCall.metadata.createdAt?.toDate().toLocaleDateString(dateLocale)} {selectedCall.metadata.createdAt?.toDate().toLocaleTimeString(dateLocale)}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.duration')}:</span>
                    <div className="text-sm font-medium">{formatDuration(selectedCall.conference.duration || 0)}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.status')}:</span>
                    <div className="text-sm font-medium">{selectedCall.status}</div>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Users className="mr-2" size={16} />
                    {t('admin.receivedCalls.modal.clientName')}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="text-sm font-medium">{selectedCall.metadata.clientName || '—'}</div>
                    <div className="text-sm text-gray-500 font-mono">{selectedCall.participants.client.phone}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                    <Users className="mr-2" size={16} />
                    {t('admin.receivedCalls.modal.providerName')}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="text-sm font-medium">{selectedCall.metadata.providerName || '—'}</div>
                    <div className="text-sm text-gray-500">
                      {selectedCall.metadata.providerType === 'lawyer' ? '⚖️' : '🌍'} {t(`admin.receivedCalls.filters.${selectedCall.metadata.providerType}`)}
                    </div>
                    <div className="text-sm text-gray-500 font-mono">{selectedCall.participants.provider.phone}</div>
                    <div className="text-sm text-gray-500">
                      {t('admin.receivedCalls.modal.interventionCountry')}: {selectedCall.metadata.interventionCountry || selectedCall.metadata.country || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                  <DollarSign className="mr-2" size={16} />
                  {t('admin.receivedCalls.modal.financialBreakdown')}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.totalPaid')}:</span>
                    <span className="text-sm font-medium">{formatAmount(selectedCall.payment.amount || 0, selectedCall.payment.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.providerAmount')}:</span>
                    <span className="text-sm font-medium">{formatAmount(selectedCall.payment.providerAmount || 0, selectedCall.payment.currency)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.commission')}:</span>
                    <span className="text-sm font-bold text-green-600">{formatAmount(selectedCall.payment.commissionAmount || 0, selectedCall.payment.currency)}</span>
                  </div>
                  {selectedCall.costs && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">{t('admin.receivedCalls.modal.costsBreakdown')}:</div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t('admin.receivedCalls.modal.twilioCost')}:</span>
                          <span className="text-red-600">-{formatAmount(selectedCall.costs.twilio, selectedCall.payment.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t('admin.receivedCalls.modal.gcpCost')}:</span>
                          <span className="text-red-600">-{formatAmount(selectedCall.costs.gcp, selectedCall.payment.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t('admin.receivedCalls.modal.otherCosts')}:</span>
                          <span className="text-red-600">-{formatAmount(selectedCall.costs.other, selectedCall.payment.currency)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium">{t('admin.receivedCalls.modal.netProfit')}:</span>
                        <span className="text-sm font-bold text-purple-600">
                          {formatAmount((selectedCall.payment.commissionAmount || 0) - selectedCall.costs.total, selectedCall.payment.currency)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Payout Info */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                  <Wallet className="mr-2" size={16} />
                  {t('admin.receivedCalls.modal.payoutInfo')}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.payoutStatus')}:</span>
                    {getPayoutStatusBadge(selectedCall.payout)}
                  </div>
                  {selectedCall.payout?.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.payoutDate')}:</span>
                      <span className="text-sm font-medium">
                        {selectedCall.payout.paidAt.toDate?.()?.toLocaleDateString(dateLocale) || '—'}
                      </span>
                    </div>
                  )}
                  {selectedCall.payout?.method && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.payoutMethod')}:</span>
                      <span className="text-sm font-medium capitalize">{selectedCall.payout.method}</span>
                    </div>
                  )}
                  {selectedCall.payout?.reason && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.kycStatus')}:</span>
                      <span className="text-sm text-orange-600">{selectedCall.payout.reason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                  <DollarSign className="mr-2" size={16} />
                  {t('admin.receivedCalls.modal.paymentInfo')}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.paymentId')}:</span>
                    <span className="text-sm font-mono">{selectedCall.payment.intentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.paymentStatus')}:</span>
                    <span className="text-sm font-medium">{selectedCall.payment.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('admin.receivedCalls.modal.currency')}:</span>
                    <span className="text-sm font-medium">{selectedCall.payment.currency || 'EUR'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <Button
                    onClick={() => copyToClipboard(selectedCall.id)}
                    variant="outline"
                    className="flex items-center"
                  >
                    <Copy size={16} className="mr-2" />
                    {t('admin.receivedCalls.modal.copySessionId')}
                  </Button>

                  {selectedCall.payment.intentId.startsWith('pi_') && (
                    <Button
                      onClick={() => window.open(`https://dashboard.stripe.com/payments/${selectedCall.payment.intentId}`, '_blank')}
                      variant="outline"
                      className="flex items-center"
                    >
                      <ExternalLink size={16} className="mr-2" />
                      {t('admin.receivedCalls.modal.viewInStripe')}
                    </Button>
                  )}
                </div>

                <Button
                  onClick={() => setShowDetailModal(false)}
                  variant="primary"
                >
                  {t('admin.receivedCalls.modal.close')}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </ErrorBoundary>
    </AdminLayout>
  );
};

export default AdminReceivedCalls;
