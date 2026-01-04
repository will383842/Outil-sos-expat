// src/pages/admin/AdminPayments.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import {
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Download,
  Phone,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  CreditCard,
  FileText,
  TrendingUp,
  DollarSign,
  Percent,
  Hash,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { isUrlExpired } from '../../utils/urlUtils';
import { useIntl, FormattedMessage } from 'react-intl';
import { getCountryFlag, getCountryName } from '../../utils/formatters';
import { countriesData } from '../../data/countries';
import { toCsv } from '../../services/finance/reports';

type PaymentStatus = 'paid' | 'refunded' | 'failed' | 'pending';
type PaymentMethod = 'stripe' | 'paypal' | 'all';
type SortField = 'createdAt' | 'amount' | 'status' | 'country' | 'currency';
type SortOrder = 'asc' | 'desc';

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

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerId: string;
  providerName?: string;
  clientId: string;
  clientName?: string;
  createdAt: Date;
  callSessionId?: string;
  providerAmount?: number;
  commissionAmount?: number;
  duration?: number;
  callSession?: CallSessionData;
  invoices?: InvoiceRecord[];
  callDate?: Date;
  country?: string;
  paymentMethod?: 'stripe' | 'paypal';
}

// Stats interface
interface PaymentStats {
  totalCount: number;
  totalAmount: number;
  successRate: number;
  averageAmount: number;
  currency: string;
}

const PAGE_SIZE = 25;

// Supported currencies
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD'];

// Get unique countries from countriesData (excluding separator)
const getActiveCountries = () => {
  return countriesData
    .filter(c => c.code !== 'SEPARATOR' && !c.disabled)
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));
};

// Format relative time
const formatRelativeTime = (date: Date, intl: ReturnType<typeof useIntl>): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return intl.formatMessage({ id: 'admin.payments.justNow' });
  } else if (diffMins < 60) {
    return intl.formatMessage({ id: 'admin.payments.minsAgo' }, { count: diffMins });
  } else if (diffHours < 24) {
    return intl.formatMessage({ id: 'admin.payments.hoursAgo' }, { count: diffHours });
  } else if (diffDays === 1) {
    return intl.formatMessage({ id: 'admin.payments.yesterday' });
  } else if (diffDays < 7) {
    return intl.formatMessage({ id: 'admin.payments.daysAgo' }, { count: diffDays });
  } else {
    return intl.formatDate(date, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
};

const AdminPayments: React.FC = () => {
  const intl = useIntl();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod>('all');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Expansion
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Quick filter tab
  const [quickFilter, setQuickFilter] = useState<PaymentStatus | 'all'>('all');

  // Conversion Date -> Timestamp
  const startTs = useMemo(() => {
    if (!startDate) return undefined;
    const d = new Date(startDate);
    if (Number.isNaN(d.getTime())) return undefined;
    d.setHours(0, 0, 0, 0);
    return Timestamp.fromDate(d);
  }, [startDate]);

  const endTs = useMemo(() => {
    if (!endDate) return undefined;
    const d = new Date(endDate);
    if (Number.isNaN(d.getTime())) return undefined;
    d.setHours(23, 59, 59, 999);
    return Timestamp.fromDate(d);
  }, [endDate]);

  const mapSnapToPayment = (docSnap: QueryDocumentSnapshot<DocumentData>): PaymentRecord => {
    const data = docSnap.data() as {
      amount?: number;
      amountInEuros?: number;
      currency?: string;
      status?: PaymentStatus;
      providerId?: string;
      providerName?: string;
      clientId?: string;
      clientName?: string;
      createdAt?: Timestamp | Date;
      callSessionId?: string;
      sessionId?: string;
      providerAmount?: number;
      providerAmountEuros?: number;
      commissionAmount?: number;
      commissionAmountEuros?: number;
      duration?: number;
      country?: string;
      paymentMethod?: 'stripe' | 'paypal';
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
      providerId: data.providerId ?? '',
      providerName: data.providerName,
      clientId: data.clientId ?? '',
      clientName: data.clientName,
      createdAt: createdAtDate,
      callSessionId: data.callSessionId || data.sessionId,
      providerAmount: data.providerAmountEuros ?? (data.providerAmount ? data.providerAmount / 100 : undefined),
      commissionAmount: data.commissionAmountEuros ?? (data.commissionAmount ? data.commissionAmount / 100 : undefined),
      duration: data.duration,
      country: data.country,
      paymentMethod: data.paymentMethod ?? 'stripe',
    };
  };

  // Fetch call session data
  const fetchCallSession = async (callSessionId: string): Promise<CallSessionData | null> => {
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
  };

  // Fetch invoice records for a call
  const fetchInvoices = async (callId: string): Promise<InvoiceRecord[]> => {
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
  };

  // Fetch additional data for payments
  const enrichPayments = async (paymentRecords: PaymentRecord[]): Promise<PaymentRecord[]> => {
    return Promise.all(
      paymentRecords.map(async (payment) => {
        if (!payment.callSessionId) return payment;

        const [callSession, invoices] = await Promise.all([
          fetchCallSession(payment.callSessionId),
          fetchInvoices(payment.callSessionId),
        ]);

        let callDate: Date | undefined;
        let callDuration: number | undefined = payment.duration;

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
          ...payment,
          callSession: callSession ?? undefined,
          invoices,
          callDate,
          duration: callDuration,
        };
      })
    );
  };

  const buildQuery = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      try {
        const colRef = collection(db, 'payments');
        const constraints: Parameters<typeof query>[1][] = [];

        // Status filter (combine quickFilter and statusFilter)
        const effectiveStatus = quickFilter !== 'all' ? quickFilter : statusFilter;
        if (effectiveStatus !== 'all') {
          constraints.push(where('status', '==', effectiveStatus));
        }
        if (startTs) {
          constraints.push(where('createdAt', '>=', startTs));
        }
        if (endTs) {
          constraints.push(where('createdAt', '<=', endTs));
        }

        // Sort
        constraints.push(orderBy('createdAt', 'desc'));

        // Pagination
        if (!reset && lastDoc) {
          constraints.push(startAfter(lastDoc));
        }

        constraints.push(limit(PAGE_SIZE));

        const q = query(colRef, ...constraints);
        const snap = await getDocs(q);

        const pageItems = snap.docs.map(mapSnapToPayment);

        const enrichedItems = await enrichPayments(pageItems);

        setLastDoc(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
        setHasMore(snap.docs.length === PAGE_SIZE);

        if (reset) {
          setPayments(enrichedItems);
          setSelectedIds(new Set());
          setSelectAll(false);
        } else {
          setPayments((prev) => [...prev, ...enrichedItems]);
        }
      } catch (err) {
        console.error('Error loading payments:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, quickFilter, startTs, endTs, lastDoc]
  );

  // Load on filter change
  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    void buildQuery(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, quickFilter, startTs, endTs]);

  // Apply client-side filters and sorting
  const filteredAndSortedPayments = useMemo(() => {
    let result = [...payments];

    // Search filter
    const s = search.trim().toLowerCase();
    if (s) {
      result = result.filter((p) =>
        [p.id, p.providerId, p.providerName, p.clientId, p.clientName, p.country]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(s))
      );
    }

    // Country filter
    if (countryFilter !== 'all') {
      result = result.filter((p) => p.country === countryFilter);
    }

    // Currency filter
    if (currencyFilter !== 'all') {
      result = result.filter((p) => p.currency === currencyFilter);
    }

    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      result = result.filter((p) => p.paymentMethod === paymentMethodFilter);
    }

    // Amount range filter
    const minAmt = parseFloat(minAmount);
    const maxAmt = parseFloat(maxAmount);
    if (!isNaN(minAmt)) {
      result = result.filter((p) => p.amount >= minAmt);
    }
    if (!isNaN(maxAmt)) {
      result = result.filter((p) => p.amount <= maxAmt);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'country':
          comparison = (a.country || '').localeCompare(b.country || '');
          break;
        case 'currency':
          comparison = a.currency.localeCompare(b.currency);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [payments, search, countryFilter, currencyFilter, paymentMethodFilter, minAmount, maxAmount, sortField, sortOrder]);

  // Calculate stats
  const stats = useMemo((): PaymentStats => {
    const paidPayments = payments.filter((p) => p.status === 'paid');
    const totalCount = payments.length;
    const totalAmount = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const successRate = totalCount > 0 ? (paidPayments.length / totalCount) * 100 : 0;
    const averageAmount = paidPayments.length > 0 ? totalAmount / paidPayments.length : 0;

    // Get most common currency
    const currencyCounts = payments.reduce((acc, p) => {
      acc[p.currency] = (acc[p.currency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mainCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'EUR';

    return {
      totalCount,
      totalAmount,
      successRate,
      averageAmount,
      currency: mainCurrency,
    };
  }, [payments]);

  // Handle invoice download
  const handleInvoiceDownload = useCallback(async (invoice: InvoiceRecord, e: React.MouseEvent) => {
    e.preventDefault();

    try {
      let downloadUrl = invoice.downloadUrl;

      if (isUrlExpired(downloadUrl)) {
        const generateInvoiceDownloadUrlFn = httpsCallable<{ invoiceId: string }, { downloadUrl: string }>(
          functions,
          'generateInvoiceDownloadUrl'
        );

        const result = await generateInvoiceDownloadUrlFn({ invoiceId: invoice.id });
        downloadUrl = result.data.downloadUrl;

        setPayments((prevPayments) =>
          prevPayments.map((payment) => {
            if (payment.invoices) {
              const updatedInvoices = payment.invoices.map((inv) =>
                inv.id === invoice.id ? { ...inv, downloadUrl } : inv
              );
              return { ...payment, invoices: updatedInvoices };
            }
            return payment;
          })
        );
      }

      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert(intl.formatMessage({ id: 'admin.payments.downloadError' }));
    }
  }, [intl]);

  // Handle CSV export
  const handleExportCSV = useCallback(() => {
    const rows = filteredAndSortedPayments.map((p) => ({
      id: p.id,
      date: intl.formatDate(p.createdAt, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      country: p.country || '',
      paymentMethod: p.paymentMethod || 'stripe',
      clientName: p.clientName || p.clientId,
      providerName: p.providerName || p.providerId,
      providerAmount: p.providerAmount ?? '',
      commission: p.commissionAmount ?? '',
      duration: p.duration ?? '',
      callSessionId: p.callSessionId ?? '',
    }));

    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredAndSortedPayments, intl]);

  // Handle row selection
  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedPayments.map((p) => p.id)));
    }
    setSelectAll(!selectAll);
  };

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Handle row expansion
  const toggleRowExpansion = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="ml-1 text-gray-400" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp size={14} className="ml-1 text-blue-600" />
      : <ArrowDown size={14} className="ml-1 text-blue-600" />;
  };

  // Render payment method icon
  const renderPaymentMethodIcon = (method?: string) => {
    if (method === 'paypal') {
      return (
        <span className="inline-flex items-center gap-1 text-blue-600" title="PayPal">
          <span className="font-bold text-xs">PP</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-purple-600" title="Stripe">
        <CreditCard size={14} />
      </span>
    );
  };

  // Render status badge with icon
  const renderStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded text-sm">
            <CheckCircle size={14} className="mr-1" />
            {intl.formatMessage({ id: 'admin.payments.statusPaid' })}
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded text-sm">
            <RotateCcw size={14} className="mr-1" />
            {intl.formatMessage({ id: 'admin.payments.statusRefunded' })}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded text-sm">
            <XCircle size={14} className="mr-1" />
            {intl.formatMessage({ id: 'admin.payments.statusFailed' })}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded text-sm">
            <Clock size={14} className="mr-1" />
            {intl.formatMessage({ id: 'admin.payments.statusPending' })}
          </span>
        );
    }
  };

  const activeCountries = useMemo(() => getActiveCountries(), []);

  return (
    <AdminLayout>
      <div className="p-6 text-black">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{intl.formatMessage({ id: 'admin.payments.title' })}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <FileText size={16} className="mr-2" />
              {intl.formatMessage({ id: 'admin.payments.exportCsv' })}
            </Button>
            <Button variant="outline" onClick={() => void buildQuery(true)}>
              <RefreshCw size={16} className="mr-2" />
              {intl.formatMessage({ id: 'admin.payments.refresh' })}
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Hash size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.payments.stats.totalPayments' })}</p>
                <p className="text-2xl font-bold">{stats.totalCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.payments.stats.totalAmount' })}</p>
                <p className="text-2xl font-bold">
                  {intl.formatNumber(stats.totalAmount, { style: 'currency', currency: stats.currency })}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Percent size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.payments.stats.successRate' })}</p>
                <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'admin.payments.stats.avgAmount' })}</p>
                <p className="text-2xl font-bold">
                  {intl.formatNumber(stats.averageAmount, { style: 'currency', currency: stats.currency })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="bg-white border rounded-lg mb-4">
          <div className="flex border-b">
            {(['all', 'paid', 'pending', 'failed', 'refunded'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setQuickFilter(status);
                  if (status !== 'all') {
                    setStatusFilter('all');
                  }
                }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  quickFilter === status
                    ? 'border-red-600 text-red-600 bg-red-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {status === 'all'
                  ? intl.formatMessage({ id: 'admin.payments.statusAll' })
                  : status === 'paid'
                  ? intl.formatMessage({ id: 'admin.payments.statusPaid' })
                  : status === 'pending'
                  ? intl.formatMessage({ id: 'admin.payments.statusPending' })
                  : status === 'failed'
                  ? intl.formatMessage({ id: 'admin.payments.statusFailed' })
                  : intl.formatMessage({ id: 'admin.payments.statusRefunded' })}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border rounded-lg p-4 mb-4 text-black">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {/* Country Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {intl.formatMessage({ id: 'admin.payments.country' })}
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              >
                <option value="all">{intl.formatMessage({ id: 'admin.payments.statusAll' })}</option>
                {activeCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {getCountryName(country.code, intl.locale.split('-')[0])}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {intl.formatMessage({ id: 'admin.payments.currency' })}
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
              >
                <option value="all">{intl.formatMessage({ id: 'admin.payments.statusAll' })}</option>
                {CURRENCIES.map((curr) => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {intl.formatMessage({ id: 'admin.payments.paymentMethod' })}
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value as PaymentMethod)}
              >
                <option value="all">{intl.formatMessage({ id: 'admin.payments.statusAll' })}</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>

            {/* Amount Range */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {intl.formatMessage({ id: 'admin.payments.amountRange' })}
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder={intl.formatMessage({ id: 'admin.payments.min' })}
                  className="w-1/2 border rounded px-2 py-2 text-sm"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
                <input
                  type="number"
                  placeholder={intl.formatMessage({ id: 'admin.payments.max' })}
                  className="w-1/2 border rounded px-2 py-2 text-sm"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {intl.formatMessage({ id: 'admin.payments.dateFrom' })}
              </label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {intl.formatMessage({ id: 'admin.payments.dateTo' })}
              </label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Search */}
          <div className="mt-3">
            <div className="flex">
              <input
                className="flex-1 border rounded-l px-3 py-2"
                placeholder={intl.formatMessage({ id: 'admin.payments.searchPlaceholder' })}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="border border-l-0 rounded-r px-3 py-2 grid place-items-center bg-gray-50">
                <Search size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Selection info */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
            <span className="text-blue-700">
              {intl.formatMessage({ id: 'admin.payments.selected' }, { count: selectedIds.size })}
            </span>
            <button
              onClick={() => {
                setSelectedIds(new Set());
                setSelectAll(false);
              }}
              className="text-blue-700 hover:text-blue-900 text-sm underline"
            >
              {intl.formatMessage({ id: 'admin.payments.clearSelection' })}
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {/* Checkbox column */}
                <th className="text-left px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                {/* Expand column */}
                <th className="w-10"></th>
                {/* Date */}
                <th
                  className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center">
                    {intl.formatMessage({ id: 'admin.payments.table.paymentDate' })}
                    {renderSortIcon('createdAt')}
                  </div>
                </th>
                {/* Country */}
                <th
                  className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('country')}
                >
                  <div className="flex items-center">
                    {intl.formatMessage({ id: 'admin.payments.country' })}
                    {renderSortIcon('country')}
                  </div>
                </th>
                {/* Payment Method */}
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  {intl.formatMessage({ id: 'admin.payments.paymentMethod' })}
                </th>
                {/* Client Paid */}
                <th
                  className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center">
                    {intl.formatMessage({ id: 'admin.payments.table.clientPaid' })}
                    {renderSortIcon('amount')}
                  </div>
                </th>
                {/* Provider */}
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  {intl.formatMessage({ id: 'admin.payments.table.provider' })}
                </th>
                {/* Platform */}
                <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                  {intl.formatMessage({ id: 'admin.payments.table.platform' })}
                </th>
                {/* Status */}
                <th
                  className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    {intl.formatMessage({ id: 'admin.payments.table.status' })}
                    {renderSortIcon('status')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedPayments.map((p) => {
                const providerInvoice = p.invoices?.find((inv) => inv.invoiceNumber.startsWith('PRV-'));
                const platformInvoice = p.invoices?.find((inv) => inv.invoiceNumber.startsWith('PLT-'));
                const isExpanded = expandedRows.has(p.id);

                return (
                  <React.Fragment key={p.id}>
                    <tr className={`border-t hover:bg-gray-50 ${selectedIds.has(p.id) ? 'bg-blue-50' : ''}`}>
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => handleSelectRow(p.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      {/* Expand button */}
                      <td className="px-2 py-3">
                        <button
                          onClick={() => toggleRowExpansion(p.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {formatRelativeTime(p.createdAt, intl)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {intl.formatDate(p.createdAt, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      {/* Country */}
                      <td className="px-4 py-3">
                        {p.country ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-lg">{getCountryFlag(p.country)}</span>
                            <span className="text-sm">{getCountryName(p.country, intl.locale.split('-')[0])}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {/* Payment Method */}
                      <td className="px-4 py-3">
                        {renderPaymentMethodIcon(p.paymentMethod)}
                      </td>
                      {/* Client Paid */}
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {intl.formatNumber(p.amount, { style: 'currency', currency: p.currency })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {p.clientName ?? p.clientId}
                        </div>
                      </td>
                      {/* Provider */}
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {p.providerAmount !== undefined
                            ? intl.formatNumber(p.providerAmount, { style: 'currency', currency: p.currency })
                            : intl.formatMessage({ id: 'admin.payments.na' })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {p.providerName ?? p.providerId}
                        </div>
                      </td>
                      {/* Platform */}
                      <td className="px-4 py-3">
                        {p.commissionAmount !== undefined
                          ? intl.formatNumber(p.commissionAmount, { style: 'currency', currency: p.currency })
                          : intl.formatMessage({ id: 'admin.payments.na' })}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        {renderStatusBadge(p.status)}
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr className="bg-gray-50 border-t">
                        <td colSpan={9} className="px-8 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Call Info */}
                            <div>
                              <h4 className="font-semibold text-sm mb-2">
                                {intl.formatMessage({ id: 'admin.payments.table.call' })}
                              </h4>
                              {p.callDate ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone size={14} className="text-gray-400" />
                                  <span>
                                    {intl.formatDate(p.callDate, {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">{intl.formatMessage({ id: 'admin.payments.na' })}</span>
                              )}
                              <div className="mt-1 text-sm">
                                <span className="text-gray-500">{intl.formatMessage({ id: 'admin.payments.table.duration' })}: </span>
                                {p.duration !== undefined ? (
                                  <span>{p.duration} min</span>
                                ) : p.callSession?.status === 'failed' ? (
                                  <span>0 min</span>
                                ) : (
                                  <span className="text-gray-400">{intl.formatMessage({ id: 'admin.payments.na' })}</span>
                                )}
                              </div>
                              {p.callSessionId && (
                                <div className="mt-1 text-xs text-gray-400">
                                  ID: {p.callSessionId}
                                </div>
                              )}
                            </div>

                            {/* Invoices */}
                            <div>
                              <h4 className="font-semibold text-sm mb-2">
                                {intl.formatMessage({ id: 'admin.payments.table.invoices' })}
                              </h4>
                              <div className="flex flex-col gap-1">
                                {providerInvoice && (
                                  <button
                                    onClick={(e) => handleInvoiceDownload(providerInvoice, e)}
                                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 gap-1 cursor-pointer bg-transparent border-none p-0"
                                    title={intl.formatMessage({ id: 'admin.payments.providerInvoice' })}
                                  >
                                    <Download size={12} />
                                    {intl.formatMessage({ id: 'admin.payments.providerInvoice' })}
                                  </button>
                                )}
                                {platformInvoice && (
                                  <button
                                    onClick={(e) => handleInvoiceDownload(platformInvoice, e)}
                                    className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 gap-1 cursor-pointer bg-transparent border-none p-0"
                                    title={intl.formatMessage({ id: 'admin.payments.platformInvoice' })}
                                  >
                                    <Download size={12} />
                                    {intl.formatMessage({ id: 'admin.payments.platformInvoice' })}
                                  </button>
                                )}
                                {(!providerInvoice && !platformInvoice) && (
                                  <span className="text-xs text-gray-400">{intl.formatMessage({ id: 'admin.payments.noInvoice' })}</span>
                                )}
                              </div>
                            </div>

                            {/* IDs */}
                            <div>
                              <h4 className="font-semibold text-sm mb-2">
                                {intl.formatMessage({ id: 'admin.payments.details' })}
                              </h4>
                              <div className="text-xs space-y-1">
                                <div>
                                  <span className="text-gray-500">Payment ID: </span>
                                  <span className="font-mono">{p.id}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Client ID: </span>
                                  <span className="font-mono">{p.clientId}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Provider ID: </span>
                                  <span className="font-mono">{p.providerId}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {!isLoading && filteredAndSortedPayments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                    {intl.formatMessage({ id: 'admin.payments.noPayments' })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {isLoading && (
            <div className="p-4 text-center text-gray-600">{intl.formatMessage({ id: 'admin.payments.loading' })}</div>
          )}
        </div>

        {hasMore && !isLoading && (
          <div className="mt-4 flex justify-center">
            <Button onClick={() => void buildQuery(false)}>{intl.formatMessage({ id: 'admin.payments.loadMore' })}</Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPayments;
