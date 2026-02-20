// src/pages/admin/Finance/Transactions.tsx
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  orderBy,
  query,
  limit,
  where,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db, functions } from '../../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import AdminLayout from '../../../components/admin/AdminLayout';
import FinanceFilters, {
  FinanceFiltersState,
  defaultFinanceFilters,
  TransactionStatus,
} from '../../../components/admin/FinanceFilters';
import Button from '../../../components/common/Button';
import { useIntl } from 'react-intl';
import { isUrlExpired } from '../../../utils/urlUtils';
import {
  Phone,
  CreditCard,
  RefreshCw as RefundIcon,
  DollarSign,
  Repeat,
  Download,
  Eye,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type PaymentStatus = 'paid' | 'refunded' | 'failed' | 'pending' | 'disputed';
type SortField = 'createdAt' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  downloadUrl: string;
  type?: string;
  callId: string;
  createdAt?: Timestamp | Date;
}

interface CallSessionData {
  status?: 'pending' | 'provider_connecting' | 'client_connecting' | 'both_connecting' | 'active' | 'completed' | 'failed' | 'cancelled';
  createdAt?: Timestamp | Date;
  metadata?: {
    createdAt?: Timestamp | Date;
  };
  participants?: {
    client?: {
      connectedAt?: Timestamp | Date;
      disconnectedAt?: Timestamp | Date;
      status?: string;
    };
  };
  payment?: {
    duration?: number;
  };
}

interface TransactionRecord {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  type: 'call_payment' | 'subscription' | 'refund' | 'payout';
  providerId: string;
  providerName?: string;
  providerCountry?: string;
  clientId: string;
  clientName?: string;
  clientCountry?: string;
  createdAt: Date;
  callSessionId?: string;
  providerAmount?: number;
  commissionAmount?: number;
  duration?: number;
  callSession?: CallSessionData;
  invoices?: InvoiceRecord[];
  callDate?: Date;
  paymentMethod?: 'stripe' | 'paypal';
  stripePaymentIntentId?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PAGE_SIZES = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

// Country flag emoji lookup (common countries)
const COUNTRY_FLAGS: Record<string, string> = {
  FR: '\u{1F1EB}\u{1F1F7}', US: '\u{1F1FA}\u{1F1F8}', GB: '\u{1F1EC}\u{1F1E7}',
  DE: '\u{1F1E9}\u{1F1EA}', ES: '\u{1F1EA}\u{1F1F8}', IT: '\u{1F1EE}\u{1F1F9}',
  PT: '\u{1F1F5}\u{1F1F9}', NL: '\u{1F1F3}\u{1F1F1}', BE: '\u{1F1E7}\u{1F1EA}',
  CH: '\u{1F1E8}\u{1F1ED}', CA: '\u{1F1E8}\u{1F1E6}', AU: '\u{1F1E6}\u{1F1FA}',
  JP: '\u{1F1EF}\u{1F1F5}', CN: '\u{1F1E8}\u{1F1F3}', IN: '\u{1F1EE}\u{1F1F3}',
  BR: '\u{1F1E7}\u{1F1F7}', MX: '\u{1F1F2}\u{1F1FD}', RU: '\u{1F1F7}\u{1F1FA}',
  KR: '\u{1F1F0}\u{1F1F7}', SA: '\u{1F1F8}\u{1F1E6}', AE: '\u{1F1E6}\u{1F1EA}',
  PL: '\u{1F1F5}\u{1F1F1}', SE: '\u{1F1F8}\u{1F1EA}', NO: '\u{1F1F3}\u{1F1F4}',
  DK: '\u{1F1E9}\u{1F1F0}', FI: '\u{1F1EB}\u{1F1EE}', AT: '\u{1F1E6}\u{1F1F9}',
  IE: '\u{1F1EE}\u{1F1EA}', NZ: '\u{1F1F3}\u{1F1FF}', SG: '\u{1F1F8}\u{1F1EC}',
  HK: '\u{1F1ED}\u{1F1F0}', TH: '\u{1F1F9}\u{1F1ED}', VN: '\u{1F1FB}\u{1F1F3}',
  ID: '\u{1F1EE}\u{1F1E9}', MY: '\u{1F1F2}\u{1F1FE}', PH: '\u{1F1F5}\u{1F1ED}',
  ZA: '\u{1F1FF}\u{1F1E6}', EG: '\u{1F1EA}\u{1F1EC}', MA: '\u{1F1F2}\u{1F1E6}',
  NG: '\u{1F1F3}\u{1F1EC}', KE: '\u{1F1F0}\u{1F1EA}', AR: '\u{1F1E6}\u{1F1F7}',
  CL: '\u{1F1E8}\u{1F1F1}', CO: '\u{1F1E8}\u{1F1F4}', PE: '\u{1F1F5}\u{1F1EA}',
  TR: '\u{1F1F9}\u{1F1F7}', IL: '\u{1F1EE}\u{1F1F1}', GR: '\u{1F1EC}\u{1F1F7}',
  CZ: '\u{1F1E8}\u{1F1FF}', HU: '\u{1F1ED}\u{1F1FA}', RO: '\u{1F1F7}\u{1F1F4}',
};

const getCountryFlag = (countryCode?: string): string => {
  if (!countryCode) return '\u{1F30D}';
  return COUNTRY_FLAGS[countryCode.toUpperCase()] || '\u{1F30D}';
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface StatusBadgeProps {
  status: PaymentStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const intl = useIntl();

  const config: Record<PaymentStatus, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    paid: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
    },
    pending: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    refunded: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <RefundIcon className="w-3.5 h-3.5" />,
    },
    disputed: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    failed: {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const { bg, text, border, icon } = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${bg} ${text} ${border}`}
    >
      {icon}
      {intl.formatMessage({ id: `admin.transactions.status.${status}` })}
    </span>
  );
};

interface TransactionTypeIconProps {
  type: TransactionRecord['type'];
  className?: string;
}

const TransactionTypeIcon: React.FC<TransactionTypeIconProps> = ({ type, className = 'w-4 h-4' }) => {
  const icons: Record<TransactionRecord['type'], React.ReactNode> = {
    call_payment: <Phone className={className} />,
    subscription: <Repeat className={className} />,
    refund: <RefundIcon className={className} />,
    payout: <DollarSign className={className} />,
  };
  return <>{icons[type] || <CreditCard className={className} />}</>;
};

interface PaymentMethodIconProps {
  method?: 'stripe' | 'paypal';
}

const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({ method }) => {
  if (method === 'paypal') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
        <CreditCard className="w-4 h-4" />
        PayPal
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-purple-600">
      <CreditCard className="w-4 h-4" />
      Stripe
    </span>
  );
};

interface SortableHeaderProps {
  field: SortField;
  currentSort: { field: SortField; direction: SortDirection };
  onSort: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  field,
  currentSort,
  onSort,
  children,
  className = '',
}) => {
  const isActive = currentSort.field === field;
  return (
    <th
      className={`text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 cursor-pointer select-none hover:bg-gray-100 transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          currentSort.direction === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-red-600" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-red-600" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
        )}
      </div>
    </th>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Transactions: React.FC = () => {
  const intl = useIntl();
  const tableRef = useRef<HTMLDivElement>(null);

  // Data state
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filters state
  const [filters, setFilters] = useState<FinanceFiltersState>(defaultFinanceFilters);

  // Pagination state
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Sort state
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'createdAt',
    direction: 'desc',
  });

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // UI state
  const [isSticky, setIsSticky] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cache for client and provider names to avoid repeated fetches
  const clientNamesCache = useRef<Map<string, { name: string; country?: string }>>(new Map());
  const providerNamesCache = useRef<Map<string, { name: string; country?: string }>>(new Map());

  // Quick filters (status tabs)
  const [quickFilter, setQuickFilter] = useState<TransactionStatus>('all');

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================

  const startTs = useMemo(() => {
    if (!filters.startDate) return undefined;
    const d = new Date(filters.startDate);
    if (Number.isNaN(d.getTime())) return undefined;
    d.setHours(0, 0, 0, 0);
    return Timestamp.fromDate(d);
  }, [filters.startDate]);

  const endTs = useMemo(() => {
    if (!filters.endDate) return undefined;
    const d = new Date(filters.endDate);
    if (Number.isNaN(d.getTime())) return undefined;
    d.setHours(23, 59, 59, 999);
    return Timestamp.fromDate(d);
  }, [filters.endDate]);

  // Calculate totals for filtered transactions
  const totals = useMemo(() => {
    const sum = transactions.reduce((acc, t) => acc + t.amount, 0);
    return { count: transactions.length, sum };
  }, [transactions]);

  // ==========================================================================
  // DATA MAPPING
  // ==========================================================================

  const mapSnapToTransaction = useCallback((docSnap: QueryDocumentSnapshot<DocumentData>): TransactionRecord => {
    const data = docSnap.data() as {
      amount?: number;
      amountInEuros?: number;
      currency?: string;
      status?: PaymentStatus;
      type?: 'call_payment' | 'subscription' | 'refund' | 'payout';
      providerId?: string;
      providerName?: string;
      providerCountry?: string;
      clientId?: string;
      clientName?: string;
      clientCountry?: string;
      createdAt?: Timestamp | Date;
      callSessionId?: string;
      sessionId?: string;
      providerAmount?: number;
      providerAmountEuros?: number;
      commissionAmount?: number;
      commissionAmountEuros?: number;
      duration?: number;
      paymentMethod?: 'stripe' | 'paypal';
      stripePaymentIntentId?: string;
    };

    let createdAtDate: Date = new Date();
    const val = data.createdAt;
    if (val instanceof Timestamp) {
      createdAtDate = val.toDate();
    } else if (val instanceof Date) {
      createdAtDate = val;
    }

    return {
      id: docSnap.id,
      amount: data.amountInEuros ?? (data.amount ? data.amount / 100 : 0),
      currency: data.currency ?? 'EUR',
      status: (data.status ?? 'pending') as PaymentStatus,
      type: data.type ?? 'call_payment',
      providerId: data.providerId ?? '',
      providerName: data.providerName,
      providerCountry: data.providerCountry,
      clientId: data.clientId ?? '',
      clientName: data.clientName,
      clientCountry: data.clientCountry,
      createdAt: createdAtDate,
      callSessionId: data.callSessionId || data.sessionId,
      providerAmount: data.providerAmountEuros ?? (data.providerAmount ? data.providerAmount / 100 : undefined),
      commissionAmount: data.commissionAmountEuros ?? (data.commissionAmount ? data.commissionAmount / 100 : undefined),
      duration: data.duration,
      paymentMethod: data.paymentMethod ?? 'stripe',
      stripePaymentIntentId: data.stripePaymentIntentId,
    };
  }, []);

  // Fetch call session data
  const fetchCallSession = useCallback(async (callSessionId: string): Promise<CallSessionData | null> => {
    if (!callSessionId) return null;
    try {
      const sessionDoc = await getDoc(doc(db, 'call_sessions', callSessionId));
      if (sessionDoc.exists()) {
        return sessionDoc.data() as CallSessionData;
      }
    } catch (error) {
      console.error('Error fetching call session:', error);
    }
    return null;
  }, []);

  // Fetch invoice records
  const fetchInvoices = useCallback(async (callId: string): Promise<InvoiceRecord[]> => {
    if (!callId) return [];
    try {
      const invoicesRef = collection(db, 'invoice_records');
      const q = query(invoicesRef, where('callId', '==', callId));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        let createdAtDate: Date = new Date();
        const val = data.createdAt;
        if (val instanceof Timestamp) {
          createdAtDate = val.toDate();
        } else if (val instanceof Date) {
          createdAtDate = val;
        }

        return {
          id: docSnap.id,
          invoiceNumber: data.invoiceNumber || '',
          downloadUrl: data.downloadUrl || '',
          type: data.type,
          callId: data.callId || callId,
          createdAt: createdAtDate,
        };
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }, []);

  // Fetch client name from users collection
  const fetchClientName = useCallback(async (clientId: string): Promise<{ name: string; country?: string } | null> => {
    if (!clientId) return null;
    try {
      const userDoc = await getDoc(doc(db, 'users', clientId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Try multiple name fields
        const displayName = data.displayName || data.fullName;
        const firstName = data.firstName || data.prenom || '';
        const lastName = data.lastName || data.nom || '';
        const combinedName = `${firstName} ${lastName}`.trim();
        const name = displayName || combinedName || data.email?.split('@')[0] || null;
        const country = data.country || data.currentCountry || data.residenceCountry;
        return name ? { name, country } : null;
      }
    } catch (error) {
      console.error('Error fetching client:', error);
    }
    return null;
  }, []);

  // Fetch provider name from sos_profiles collection
  const fetchProviderName = useCallback(async (providerId: string): Promise<{ name: string; country?: string } | null> => {
    if (!providerId) return null;
    try {
      // First try sos_profiles
      const profileDoc = await getDoc(doc(db, 'sos_profiles', providerId));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        const displayName = data.displayName || data.fullName;
        const firstName = data.firstName || data.prenom || '';
        const lastName = data.lastName || data.nom || '';
        const combinedName = `${firstName} ${lastName}`.trim();
        const name = displayName || combinedName || null;
        const country = data.country || data.currentCountry || data.interventionCountry;
        if (name) return { name, country };
      }

      // Fallback to users collection
      const userDoc = await getDoc(doc(db, 'users', providerId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const displayName = data.displayName || data.fullName;
        const firstName = data.firstName || data.prenom || '';
        const lastName = data.lastName || data.nom || '';
        const combinedName = `${firstName} ${lastName}`.trim();
        const name = displayName || combinedName || data.email?.split('@')[0] || null;
        const country = data.country || data.currentCountry;
        return name ? { name, country } : null;
      }
    } catch (error) {
      console.error('Error fetching provider:', error);
    }
    return null;
  }, []);

  // Enrich transactions with additional data
  const enrichTransactions = useCallback(async (records: TransactionRecord[]): Promise<TransactionRecord[]> => {
    // First, collect all unique client and provider IDs that need name resolution
    // Skip IDs that are already in cache
    const clientIdsToFetch = new Set<string>();
    const providerIdsToFetch = new Set<string>();

    records.forEach((t) => {
      if (!t.clientName && t.clientId && !clientNamesCache.current.has(t.clientId)) {
        clientIdsToFetch.add(t.clientId);
      }
      if (!t.providerName && t.providerId && !providerNamesCache.current.has(t.providerId)) {
        providerIdsToFetch.add(t.providerId);
      }
    });

    // Fetch client names in parallel (only uncached ones)
    const clientPromises = Array.from(clientIdsToFetch).map(async (id) => {
      const result = await fetchClientName(id);
      if (result) {
        clientNamesCache.current.set(id, result);
      }
    });

    // Fetch provider names in parallel (only uncached ones)
    const providerPromises = Array.from(providerIdsToFetch).map(async (id) => {
      const result = await fetchProviderName(id);
      if (result) {
        providerNamesCache.current.set(id, result);
      }
    });

    // Wait for all name fetches
    await Promise.all([...clientPromises, ...providerPromises]);

    // Now enrich each transaction using cached names
    return Promise.all(
      records.map(async (transaction) => {
        // Apply resolved names from cache
        let clientName = transaction.clientName;
        let clientCountry = transaction.clientCountry;
        let providerName = transaction.providerName;
        let providerCountry = transaction.providerCountry;

        if (!clientName && transaction.clientId) {
          const clientData = clientNamesCache.current.get(transaction.clientId);
          if (clientData) {
            clientName = clientData.name;
            if (!clientCountry) clientCountry = clientData.country;
          }
        }

        if (!providerName && transaction.providerId) {
          const providerData = providerNamesCache.current.get(transaction.providerId);
          if (providerData) {
            providerName = providerData.name;
            if (!providerCountry) providerCountry = providerData.country;
          }
        }

        // If no call session, just return with resolved names
        if (!transaction.callSessionId) {
          return {
            ...transaction,
            clientName,
            clientCountry,
            providerName,
            providerCountry,
          };
        }

        const [callSession, invoices] = await Promise.all([
          fetchCallSession(transaction.callSessionId),
          fetchInvoices(transaction.callSessionId),
        ]);

        let callDate: Date | undefined;
        let callDuration: number | undefined = transaction.duration;

        if (callSession) {
          const sessionCreatedAt = callSession.metadata?.createdAt || callSession.createdAt;
          if (sessionCreatedAt) {
            if (sessionCreatedAt instanceof Timestamp) {
              callDate = sessionCreatedAt.toDate();
            } else if (sessionCreatedAt instanceof Date) {
              callDate = sessionCreatedAt;
            }
          }

          const sessionStatus = callSession.status;

          if (sessionStatus === 'failed') {
            callDuration = 0;
          } else if (sessionStatus === 'completed') {
            const client = callSession.participants?.client;
            if (client?.connectedAt && client?.disconnectedAt) {
              let connectedAtDate: Date;
              let disconnectedAtDate: Date;

              if (client.connectedAt instanceof Timestamp) {
                connectedAtDate = client.connectedAt.toDate();
              } else if (client.connectedAt instanceof Date) {
                connectedAtDate = client.connectedAt;
              } else {
                connectedAtDate = new Date(client.connectedAt);
              }

              if (client.disconnectedAt instanceof Timestamp) {
                disconnectedAtDate = client.disconnectedAt.toDate();
              } else if (client.disconnectedAt instanceof Date) {
                disconnectedAtDate = client.disconnectedAt;
              } else {
                disconnectedAtDate = new Date(client.disconnectedAt);
              }

              const durationMs = disconnectedAtDate.getTime() - connectedAtDate.getTime();
              callDuration = Math.round(durationMs / (1000 * 60));
            } else if (callSession.payment?.duration) {
              callDuration = callSession.payment.duration;
            }
          } else {
            if (!callDuration && callSession.payment?.duration) {
              callDuration = callSession.payment.duration;
            }
          }
        }

        return {
          ...transaction,
          clientName,
          clientCountry,
          providerName,
          providerCountry,
          callSession: callSession ?? undefined,
          invoices,
          callDate,
          duration: callDuration,
        };
      })
    );
  }, [fetchCallSession, fetchInvoices, fetchClientName, fetchProviderName]);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const buildQuery = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      try {
        const colRef = collection(db, 'payments');
        const constraints: QueryConstraint[] = [];

        // Status filter (from quick filter or advanced filter)
        const effectiveStatus = quickFilter !== 'all' ? quickFilter : filters.status;
        if (effectiveStatus !== 'all') {
          constraints.push(where('status', '==', effectiveStatus));
        }

        // Type filter
        if (filters.type !== 'all') {
          constraints.push(where('type', '==', filters.type));
        }

        // Date range
        if (startTs) {
          constraints.push(where('createdAt', '>=', startTs));
        }
        if (endTs) {
          constraints.push(where('createdAt', '<=', endTs));
        }

        // Payment method
        if (filters.method !== 'all') {
          constraints.push(where('paymentMethod', '==', filters.method));
        }

        // Sorting
        const sortField = sortConfig.field === 'createdAt' ? 'createdAt' :
                          sortConfig.field === 'amount' ? 'amountInEuros' : 'status';
        constraints.push(orderBy(sortField, sortConfig.direction));

        // Pagination
        if (!reset && lastDoc) {
          constraints.push(startAfter(lastDoc));
        }
        constraints.push(limit(pageSize));

        const q = query(colRef, ...constraints);
        const snap = await getDocs(q);

        const pageItems = snap.docs.map(mapSnapToTransaction);
        const enrichedItems = await enrichTransactions(pageItems);

        // Filter by search term and amount range (client-side)
        let filteredItems = enrichedItems;

        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredItems = filteredItems.filter((t) =>
            [t.id, t.providerId, t.providerName, t.clientId, t.clientName, t.stripePaymentIntentId]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(searchLower))
          );
        }

        if (filters.minAmount) {
          const min = parseFloat(filters.minAmount);
          if (!isNaN(min)) {
            filteredItems = filteredItems.filter((t) => t.amount >= min);
          }
        }

        if (filters.maxAmount) {
          const max = parseFloat(filters.maxAmount);
          if (!isNaN(max)) {
            filteredItems = filteredItems.filter((t) => t.amount <= max);
          }
        }

        setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
        setHasMore(snap.docs.length === pageSize);

        if (reset) {
          setTransactions(filteredItems);
        } else {
          setTransactions((prev) => [...prev, ...filteredItems]);
        }
      } catch (err) {
        console.error('Error loading transactions:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [filters, quickFilter, startTs, endTs, sortConfig, pageSize, lastDoc, mapSnapToTransaction, enrichTransactions]
  );

  // Initial load and filter changes
  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    setSelectedIds(new Set());
    void buildQuery(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.type, filters.method, filters.startDate, filters.endDate, quickFilter, sortConfig, pageSize]);

  // Search debounce effect
  useEffect(() => {
    const debounce = setTimeout(() => {
      setLastDoc(null);
      setHasMore(true);
      void buildQuery(true);
    }, 300);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.minAmount, filters.maxAmount]);

  // Sticky header detection
  useEffect(() => {
    const handleScroll = () => {
      if (tableRef.current) {
        const rect = tableRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 64);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSort = useCallback((field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: FinanceFiltersState) => {
    setFilters(newFilters);
    if (newFilters.status !== filters.status) {
      setQuickFilter(newFilters.status);
    }
  }, [filters.status]);

  const handleFiltersReset = useCallback(() => {
    setFilters(defaultFinanceFilters);
    setQuickFilter('all');
  }, []);

  const handleRefresh = useCallback(() => {
    setLastDoc(null);
    setHasMore(true);
    void buildQuery(true);
  }, [buildQuery]);

  const handleQuickFilterChange = useCallback((status: TransactionStatus) => {
    setQuickFilter(status);
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(transactions.map((t) => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [transactions]);

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const handleRowClick = useCallback((id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  }, []);

  const handleCopyId = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Invoice download handler
  const handleInvoiceDownload = useCallback(async (invoice: InvoiceRecord, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      let downloadUrl = invoice.downloadUrl;

      if (isUrlExpired(downloadUrl)) {
        const generateInvoiceDownloadUrlFn = httpsCallable<{ invoiceId: string }, { downloadUrl: string }>(
          functions,
          'generateInvoiceDownloadUrl'
        );

        const result = await generateInvoiceDownloadUrlFn({ invoiceId: invoice.id });
        downloadUrl = result.data.downloadUrl;
      }

      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error(intl.formatMessage({ id: 'admin.transactions.downloadError' }));
    }
  }, [intl]);

  // Bulk actions
  const handleBulkExport = useCallback(() => {
    const selectedTransactions = transactions.filter((t) => selectedIds.has(t.id));
    const csv = [
      ['ID', 'Date', 'Type', 'Client', 'Provider', 'Amount', 'Currency', 'Status', 'Method'].join(','),
      ...selectedTransactions.map((t) =>
        [
          t.id,
          t.createdAt.toISOString(),
          t.type,
          t.clientName || t.clientId,
          t.providerName || t.providerId,
          t.amount.toFixed(2),
          t.currency,
          t.status,
          t.paymentMethod,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions, selectedIds]);

  const handleBulkRefund = useCallback(async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    const confirmed = window.confirm(
      intl.formatMessage({ id: 'admin.transactions.confirmBulkRefund' }, { count })
    );

    if (!confirmed) return;

    // Filter only 'paid' transactions that can be refunded
    const refundableIds = transactions
      .filter((t) => selectedIds.has(t.id) && t.status === 'paid')
      .map((t) => t.id);

    if (refundableIds.length === 0) {
      toast.error(intl.formatMessage({ id: 'admin.transactions.noRefundableTransactions' }));
      return;
    }

    if (refundableIds.length !== count) {
      const skipCount = count - refundableIds.length;
      const proceed = window.confirm(
        intl.formatMessage(
          { id: 'admin.transactions.partialRefundWarning' },
          { refundable: refundableIds.length, skipped: skipCount }
        )
      );
      if (!proceed) return;
    }

    try {
      const adminBulkRefund = httpsCallable<
        { paymentIds: string[]; reason: string },
        { success: boolean; total: number; successful: number; failed: number; results: Array<{ paymentId: string; success: boolean; error?: string }> }
      >(functions, 'adminBulkRefund');

      const result = await adminBulkRefund({
        paymentIds: refundableIds,
        reason: 'admin_bulk_refund',
      });

      if (result.data.success) {
        toast.success(
          intl.formatMessage(
            { id: 'admin.transactions.bulkRefundSuccess' },
            { count: result.data.successful }
          )
        );
      } else {
        toast.success(
          intl.formatMessage(
            { id: 'admin.transactions.bulkRefundPartial' },
            { successful: result.data.successful, failed: result.data.failed }
          )
        );
      }

      // Refresh data and clear selection
      setSelectedIds(new Set());
      setLastDoc(null);
      setHasMore(true);
      void buildQuery(true);
    } catch (err) {
      console.error('Bulk refund failed:', err);
      toast.error(
        intl.formatMessage({ id: 'admin.transactions.bulkRefundError' }) +
          ': ' +
          (err instanceof Error ? err.message : 'Unknown error')
      );
    }
  }, [selectedIds, transactions, intl, buildQuery]);

  // Single refund handler
  const handleSingleRefund = useCallback(async (transactionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const transaction = transactions.find((t) => t.id === transactionId);
    if (!transaction || transaction.status !== 'paid') {
      toast.error(intl.formatMessage({ id: 'admin.transactions.cannotRefund' }));
      return;
    }

    const confirmed = window.confirm(
      intl.formatMessage(
        { id: 'admin.transactions.confirmSingleRefund' },
        {
          amount: intl.formatNumber(transaction.amount, {
            style: 'currency',
            currency: transaction.currency,
          }),
        }
      )
    );

    if (!confirmed) return;

    try {
      const adminRefundPayment = httpsCallable<
        { paymentId: string; reason: string },
        { success: boolean; refundId?: string; message: string }
      >(functions, 'adminRefundPayment');

      const result = await adminRefundPayment({
        paymentId: transactionId,
        reason: 'admin_refund',
      });

      if (result.data.success) {
        toast.success(intl.formatMessage({ id: 'admin.transactions.refundSuccess' }));
        // Refresh data
        setLastDoc(null);
        setHasMore(true);
        void buildQuery(true);
      }
    } catch (err) {
      console.error('Refund failed:', err);
      toast.error(
        intl.formatMessage({ id: 'admin.transactions.refundError' }) +
          ': ' +
          (err instanceof Error ? err.message : 'Unknown error')
      );
    }
  }, [transactions, intl, buildQuery]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 text-black min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {intl.formatMessage({ id: 'admin.transactions.title' })}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {intl.formatMessage({ id: 'admin.transactions.subtitle' })}
          </p>
        </div>

        {/* Quick Status Filters (Tabs) */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'paid', 'pending', 'refunded', 'disputed'] as TransactionStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => handleQuickFilterChange(status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                quickFilter === status
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {intl.formatMessage({ id: `admin.transactions.quickFilter.${status}` })}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4">
          <FinanceFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleFiltersReset}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-red-800">
              {intl.formatMessage({ id: 'admin.transactions.selectedCount' }, { count: selectedIds.size })}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="small" onClick={handleBulkExport}>
                <Download className="w-4 h-4 mr-1" />
                {intl.formatMessage({ id: 'admin.transactions.exportSelected' })}
              </Button>
              <Button variant="outline" size="small" onClick={handleBulkRefund}>
                <RefundIcon className="w-4 h-4 mr-1" />
                {intl.formatMessage({ id: 'admin.transactions.refundSelected' })}
              </Button>
              <Button
                variant="ghost"
                size="small"
                onClick={() => setSelectedIds(new Set())}
              >
                {intl.formatMessage({ id: 'admin.transactions.clearSelection' })}
              </Button>
            </div>
          </div>
        )}

        {/* Table Container */}
        <div ref={tableRef} className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={`bg-gray-50 ${isSticky ? 'sticky top-16 z-10 shadow-sm' : ''}`}>
                <tr>
                  {/* Checkbox */}
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      checked={selectedIds.size === transactions.length && transactions.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>

                  {/* Date/Time */}
                  <SortableHeader field="createdAt" currentSort={sortConfig} onSort={handleSort}>
                    {intl.formatMessage({ id: 'admin.transactions.table.dateTime' })}
                  </SortableHeader>

                  {/* Transaction ID */}
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.transactions.table.transactionId' })}
                  </th>

                  {/* Type */}
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.transactions.table.type' })}
                  </th>

                  {/* Client */}
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.transactions.table.client' })}
                  </th>

                  {/* Provider */}
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.transactions.table.provider' })}
                  </th>

                  {/* Amount */}
                  <SortableHeader field="amount" currentSort={sortConfig} onSort={handleSort}>
                    {intl.formatMessage({ id: 'admin.transactions.table.amount' })}
                  </SortableHeader>

                  {/* Method */}
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.transactions.table.method' })}
                  </th>

                  {/* Status */}
                  <SortableHeader field="status" currentSort={sortConfig} onSort={handleSort}>
                    {intl.formatMessage({ id: 'admin.transactions.table.status' })}
                  </SortableHeader>

                  {/* Actions */}
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 w-28">
                    {intl.formatMessage({ id: 'admin.transactions.table.actions' })}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction) => {
                  const isExpanded = expandedRowId === transaction.id;
                  const isSelected = selectedIds.has(transaction.id);

                  return (
                    <React.Fragment key={transaction.id}>
                      {/* Main Row */}
                      <tr
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-red-50' : ''
                        } ${isExpanded ? 'bg-gray-50' : ''}`}
                        onClick={() => handleRowClick(transaction.id)}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(transaction.id, e.target.checked)}
                          />
                        </td>

                        {/* Date/Time */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {intl.formatDate(transaction.createdAt, {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {intl.formatTime(transaction.createdAt, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Transaction ID */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleCopyId(transaction.id, e)}
                              className="text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              title={intl.formatMessage({ id: 'admin.transactions.copyId' })}
                            >
                              {transaction.id.substring(0, 12)}...
                              {copiedId === transaction.id ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 opacity-50" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-gray-100 rounded-lg">
                              <TransactionTypeIcon type={transaction.type} className="w-4 h-4 text-gray-600" />
                            </span>
                            <span className="text-sm text-gray-700">
                              {intl.formatMessage({ id: `admin.transactions.type.${transaction.type}` })}
                            </span>
                          </div>
                        </td>

                        {/* Client */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{getCountryFlag(transaction.clientCountry)}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {transaction.clientName || intl.formatMessage({ id: 'admin.transactions.anonymous' })}
                              </div>
                              <div className="text-xs text-gray-500 font-mono">
                                {transaction.clientId.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Provider */}
                        <td className="px-4 py-3">
                          {transaction.providerId ? (
                            <div className="flex items-center gap-2">
                              <span>{getCountryFlag(transaction.providerCountry)}</span>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {transaction.providerName || intl.formatMessage({ id: 'admin.transactions.unknown' })}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                  {transaction.providerId.substring(0, 8)}...
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {intl.formatNumber(transaction.amount, {
                              style: 'currency',
                              currency: transaction.currency,
                            })}
                          </div>
                        </td>

                        {/* Method */}
                        <td className="px-4 py-3">
                          <PaymentMethodIcon method={transaction.paymentMethod} />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={transaction.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                              title={intl.formatMessage({ id: 'admin.transactions.viewDetails' })}
                              onClick={() => handleRowClick(transaction.id)}
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </button>
                            {transaction.invoices && transaction.invoices.length > 0 && (
                              <button
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                title={intl.formatMessage({ id: 'admin.transactions.downloadInvoice' })}
                                onClick={(e) => handleInvoiceDownload(transaction.invoices![0], e)}
                              >
                                <FileText className="w-4 h-4 text-gray-500" />
                              </button>
                            )}
                            {transaction.status === 'paid' && (
                              <button
                                className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                title={intl.formatMessage({ id: 'admin.transactions.refund' })}
                                onClick={(e) => handleSingleRefund(transaction.id, e)}
                              >
                                <RefundIcon className="w-4 h-4 text-red-500 hover:text-red-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={10} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {/* Transaction Details */}
                              <div className="bg-white p-4 rounded-lg border">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                  {intl.formatMessage({ id: 'admin.transactions.details.transactionInfo' })}
                                </h4>
                                <dl className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.transactions.details.id' })}</dt>
                                    <dd className="font-mono text-gray-900 text-xs">{transaction.id}</dd>
                                  </div>
                                  {transaction.stripePaymentIntentId && (
                                    <div className="flex justify-between">
                                      <dt className="text-gray-500">Stripe PI</dt>
                                      <dd className="font-mono text-gray-900 text-xs">{transaction.stripePaymentIntentId}</dd>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.transactions.details.createdAt' })}</dt>
                                    <dd className="text-gray-900">
                                      {intl.formatDate(transaction.createdAt, {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                      })}
                                    </dd>
                                  </div>
                                </dl>
                              </div>

                              {/* Payment Breakdown */}
                              <div className="bg-white p-4 rounded-lg border">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                  {intl.formatMessage({ id: 'admin.transactions.details.breakdown' })}
                                </h4>
                                <dl className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.transactions.details.total' })}</dt>
                                    <dd className="font-semibold text-gray-900">
                                      {intl.formatNumber(transaction.amount, {
                                        style: 'currency',
                                        currency: transaction.currency,
                                      })}
                                    </dd>
                                  </div>
                                  {transaction.providerAmount !== undefined && (
                                    <div className="flex justify-between">
                                      <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.transactions.details.providerAmount' })}</dt>
                                      <dd className="text-green-600">
                                        {intl.formatNumber(transaction.providerAmount, {
                                          style: 'currency',
                                          currency: transaction.currency,
                                        })}
                                      </dd>
                                    </div>
                                  )}
                                  {transaction.commissionAmount !== undefined && (
                                    <div className="flex justify-between">
                                      <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.transactions.details.commission' })}</dt>
                                      <dd className="text-red-600">
                                        {intl.formatNumber(transaction.commissionAmount, {
                                          style: 'currency',
                                          currency: transaction.currency,
                                        })}
                                      </dd>
                                    </div>
                                  )}
                                </dl>
                              </div>

                              {/* Call Info */}
                              {transaction.callSessionId && (
                                <div className="bg-white p-4 rounded-lg border">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                    {intl.formatMessage({ id: 'admin.transactions.details.callInfo' })}
                                  </h4>
                                  <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.transactions.details.sessionId' })}</dt>
                                      <dd className="font-mono text-gray-900 text-xs">{transaction.callSessionId}</dd>
                                    </div>
                                    {transaction.callDate && (
                                      <div className="flex justify-between">
                                        <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.transactions.details.callDate' })}</dt>
                                        <dd className="text-gray-900">
                                          {intl.formatDate(transaction.callDate, {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </dd>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.transactions.details.duration' })}</dt>
                                      <dd className="text-gray-900">
                                        {transaction.duration !== undefined
                                          ? `${transaction.duration} min`
                                          : intl.formatMessage({ id: 'admin.transactions.na' })}
                                      </dd>
                                    </div>
                                    {transaction.callSession?.status && (
                                      <div className="flex justify-between">
                                        <dt className="text-gray-500">{intl.formatMessage({ id: 'admin.transactions.details.callStatus' })}</dt>
                                        <dd className="text-gray-900 capitalize">{transaction.callSession.status}</dd>
                                      </div>
                                    )}
                                  </dl>
                                </div>
                              )}

                              {/* Invoices */}
                              {transaction.invoices && transaction.invoices.length > 0 && (
                                <div className="bg-white p-4 rounded-lg border">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                    {intl.formatMessage({ id: 'admin.transactions.details.invoices' })}
                                  </h4>
                                  <div className="space-y-2">
                                    {transaction.invoices.map((invoice) => (
                                      <button
                                        key={invoice.id}
                                        onClick={(e) => handleInvoiceDownload(invoice, e)}
                                        className="flex items-center justify-between w-full p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                                      >
                                        <div className="flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-gray-400" />
                                          <span className="text-sm font-mono">{invoice.invoiceNumber}</span>
                                        </div>
                                        <Download className="w-4 h-4 text-blue-600" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Empty state */}
                {!isLoading && transactions.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <CreditCard className="w-12 h-12 text-gray-300 mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {intl.formatMessage({ id: 'admin.transactions.empty.title' })}
                        </h3>
                        <p className="text-gray-500">
                          {intl.formatMessage({ id: 'admin.transactions.empty.description' })}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="p-4 flex justify-center items-center gap-2 text-gray-600 border-t">
              <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              {intl.formatMessage({ id: 'admin.transactions.loading' })}
            </div>
          )}
        </div>

        {/* Footer - Pagination & Totals */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Totals */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {intl.formatMessage({ id: 'admin.transactions.totalTransactions' }, { count: totals.count })}
            </span>
            <span className="text-gray-300">|</span>
            <span className="font-medium text-gray-900">
              {intl.formatMessage({ id: 'admin.transactions.totalAmount' })}:{' '}
              {intl.formatNumber(totals.sum, { style: 'currency', currency: 'EUR' })}
            </span>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {intl.formatMessage({ id: 'admin.transactions.rowsPerPage' })}
              </span>
              <select
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {/* Load More */}
            {hasMore && !isLoading && (
              <Button onClick={() => void buildQuery(false)} variant="outline" size="small">
                {intl.formatMessage({ id: 'admin.transactions.loadMore' })}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Transactions;
