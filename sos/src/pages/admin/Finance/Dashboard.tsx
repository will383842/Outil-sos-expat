// src/pages/admin/Finance/Dashboard.tsx
// Comprehensive Financial Dashboard for Admin Panel

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  RefreshCw,
  Download,
  Calendar,
  AlertTriangle,
  Clock,
  Users,
  ArrowRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import AdminLayout from '../../../components/admin/AdminLayout';

// ============================================================================
// TYPES
// ============================================================================

type DateRangeType = '7d' | '30d' | '90d' | 'ytd' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

interface KPIData {
  current: number;
  previous: number;
  percentChange: number;
}

interface RevenueChartPoint {
  date: string;
  label: string;
  revenue: number;
}

interface PaymentMethodData {
  name: string;
  value: number;
  color: string;
  [key: string]: unknown;
}

interface CountryRevenueData {
  country: string;
  countryCode: string;
  amount: number;
  transactionCount: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  amount: number;
  color: string;
}

interface RecentTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  providerName: string;
  clientName: string;
  createdAt: Date;
  paymentMethod: string;
}

interface DashboardData {
  totalRevenue: KPIData;
  totalTransactions: KPIData;
  avgTransactionValue: KPIData;
  netRevenue: KPIData;
  refundsRate: { rate: number; amount: number };
  activeDisputes: { count: number; amountAtRisk: number };
  mrr: number;
  pendingPayouts: number;
  revenueOverTime: RevenueChartPoint[];
  revenueByPaymentMethod: PaymentMethodData[];
  revenueByCountry: CountryRevenueData[];
  statusDistribution: StatusDistribution[];
  recentTransactions: RecentTransaction[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  stripe: '#635BFF',
  paypal: '#003087',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  pending: '#6B7280',
  refunded: '#8B5CF6',
  primary: '#DC2626',
  secondary: '#2563EB',
};

const STATUS_COLORS: Record<string, string> = {
  succeeded: COLORS.success,
  captured: COLORS.success,
  paid: COLORS.success,
  pending: COLORS.pending,
  failed: COLORS.error,
  refunded: COLORS.refunded,
  disputed: COLORS.warning,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDateRange = (rangeType: DateRangeType, customRange?: DateRange): DateRange => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;

  switch (rangeType) {
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      return customRange || { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end };
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
};

const getPreviousPeriodRange = (current: DateRange): DateRange => {
  const duration = current.end.getTime() - current.start.getTime();
  return {
    start: new Date(current.start.getTime() - duration),
    end: new Date(current.start.getTime() - 1),
  };
};

const formatCurrency = (amount: number, currency = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('fr-FR').format(num);
};

const formatDateLabel = (date: Date, rangeType: DateRangeType): string => {
  if (rangeType === '7d') {
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  }
  if (rangeType === '30d' || rangeType === '90d') {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
};

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
  subtitle?: string;
  iconBgColor?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, icon, loading, subtitle, iconBgColor = 'bg-gray-100' }) => {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          )}
          {change !== undefined && !loading && (
            <div className={`flex items-center text-sm mt-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? (
                <TrendingUp size={14} className="mr-1" />
              ) : (
                <TrendingDown size={14} className="mr-1" />
              )}
              <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
              <span className="text-gray-400 ml-1 text-xs">vs periode prec.</span>
            </div>
          )}
          {subtitle && !loading && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${iconBgColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SECONDARY KPI CARD COMPONENT
// ============================================================================

interface SecondaryKPICardProps {
  title: string;
  mainValue: string;
  secondaryValue?: string;
  icon: React.ReactNode;
  iconBgColor: string;
  loading?: boolean;
}

const SecondaryKPICard: React.FC<SecondaryKPICardProps> = ({
  title,
  mainValue,
  secondaryValue,
  icon,
  iconBgColor,
  loading,
}) => (
  <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${iconBgColor}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
        {loading ? (
          <div className="h-5 w-16 bg-gray-200 animate-pulse rounded mt-1" />
        ) : (
          <>
            <p className="text-lg font-bold text-gray-900">{mainValue}</p>
            {secondaryValue && (
              <p className="text-xs text-gray-500">{secondaryValue}</p>
            )}
          </>
        )}
      </div>
    </div>
  </div>
);

// ============================================================================
// COUNTRY FLAG COMPONENT
// ============================================================================

const CountryFlag: React.FC<{ code: string; className?: string }> = ({ code, className = '' }) => {
  if (!code) return null;

  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={`Flag ${code}`}
      className={`w-6 h-4 object-cover rounded-sm flex-shrink-0 ${className}`}
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

const FinanceDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const mountedRef = useRef(true);

  // State
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('30d');
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Check auth
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  // Computed date range
  const dateRange = useMemo(() => {
    return getDateRange(dateRangeType, customDateRange || undefined);
  }, [dateRangeType, customDateRange]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentRange = dateRange;
      const previousRange = getPreviousPeriodRange(currentRange);

      const startTimestamp = Timestamp.fromDate(currentRange.start);
      const endTimestamp = Timestamp.fromDate(currentRange.end);
      const prevStartTimestamp = Timestamp.fromDate(previousRange.start);
      const prevEndTimestamp = Timestamp.fromDate(previousRange.end);

      // Query current period payments
      const currentPaymentsQuery = query(
        collection(db, 'payments'),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp),
        orderBy('createdAt', 'desc')
      );

      // Query previous period payments
      const previousPaymentsQuery = query(
        collection(db, 'payments'),
        where('createdAt', '>=', prevStartTimestamp),
        where('createdAt', '<=', prevEndTimestamp),
        orderBy('createdAt', 'desc')
      );

      // Query subscriptions for MRR
      const subscriptionsQuery = query(
        collection(db, 'subscriptions'),
        where('status', 'in', ['active', 'trialing'])
      );

      // Execute queries in parallel
      const [currentSnapshot, previousSnapshot, subscriptionsSnapshot] = await Promise.all([
        getDocs(currentPaymentsQuery),
        getDocs(previousPaymentsQuery),
        getDocs(subscriptionsQuery),
      ]);

      if (!mountedRef.current) return;

      // Process current period payments
      interface PaymentData {
        amount: number;
        currency: string;
        status: string;
        createdAt: Date;
        paymentMethod: string;
        country: string;
        providerName: string;
        clientName: string;
        platformFee: number;
        refundAmount?: number;
      }

      const currentPayments: PaymentData[] = [];
      let currentTotalRevenue = 0;
      let currentRefunds = 0;
      let currentRefundCount = 0;

      currentSnapshot.forEach((doc) => {
        const d = doc.data();
        const amount = (d.amount as number) || 0;
        const status = (d.status as string) || 'unknown';
        const createdAt = d.createdAt?.toDate?.() || new Date();

        currentPayments.push({
          amount,
          currency: (d.currency as string) || 'EUR',
          status,
          createdAt,
          paymentMethod: (d.paymentMethod as string) || (d.provider as string) || 'stripe',
          country: (d.country as string) || (d.clientCountry as string) || 'FR',
          providerName: (d.providerName as string) || 'Unknown Provider',
          clientName: (d.clientName as string) || 'Unknown Client',
          platformFee: (d.platformFee as number) || (d.commissionAmount as number) || 0,
          refundAmount: (d.refundAmount as number) || 0,
        });

        if (status === 'succeeded' || status === 'captured' || status === 'paid') {
          currentTotalRevenue += amount;
        }
        if (status === 'refunded') {
          currentRefunds += d.refundAmount || amount;
          currentRefundCount++;
        }
      });

      // Process previous period payments
      let previousTotalRevenue = 0;
      let previousTransactionCount = 0;
      let previousRefunds = 0;

      previousSnapshot.forEach((doc) => {
        const d = doc.data();
        const amount = (d.amount as number) || 0;
        const status = (d.status as string) || 'unknown';

        previousTransactionCount++;
        if (status === 'succeeded' || status === 'captured' || status === 'paid') {
          previousTotalRevenue += amount;
        }
        if (status === 'refunded') {
          previousRefunds += d.refundAmount || amount;
        }
      });

      // Calculate MRR from subscriptions
      let mrr = 0;
      subscriptionsSnapshot.forEach((doc) => {
        const d = doc.data();
        const price = (d.price as number) || (d.amount as number) || (d.pricePerMonth as number) || 0;
        const interval = (d.interval as string) || 'month';

        if (interval === 'month') {
          mrr += price;
        } else if (interval === 'year') {
          mrr += price / 12;
        }
      });

      // Calculate KPIs
      // P1 FIX: Use successful transaction count for average, not total count
      const successfulTransactionCount = currentPayments.filter(
        p => p.status === 'succeeded' || p.status === 'captured' || p.status === 'paid'
      ).length;
      const currentTransactionCount = currentPayments.length;
      const currentNetRevenue = currentTotalRevenue - currentRefunds;
      const previousNetRevenue = previousTotalRevenue - previousRefunds;
      // Average should be revenue / successful transactions (not all transactions)
      const currentAvgTransaction = successfulTransactionCount > 0
        ? currentTotalRevenue / successfulTransactionCount
        : 0;
      const previousAvgTransaction = previousTransactionCount > 0
        ? previousTotalRevenue / previousTransactionCount
        : 0;

      // Calculate percentage changes
      const revenueChange = previousTotalRevenue > 0
        ? ((currentTotalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100
        : 0;
      const transactionChange = previousTransactionCount > 0
        ? ((currentTransactionCount - previousTransactionCount) / previousTransactionCount) * 100
        : 0;
      const avgTransactionChange = previousAvgTransaction > 0
        ? ((currentAvgTransaction - previousAvgTransaction) / previousAvgTransaction) * 100
        : 0;
      const netRevenueChange = previousNetRevenue > 0
        ? ((currentNetRevenue - previousNetRevenue) / previousNetRevenue) * 100
        : 0;

      // Calculate refund rate
      const refundRate = currentTransactionCount > 0
        ? (currentRefundCount / currentTransactionCount) * 100
        : 0;

      // Group revenue by day
      const revenueByDay = new Map<string, number>();
      const current = new Date(currentRange.start);
      while (current <= currentRange.end) {
        const key = current.toISOString().split('T')[0];
        revenueByDay.set(key, 0);
        current.setDate(current.getDate() + 1);
      }

      currentPayments.forEach((p) => {
        if (p.status === 'succeeded' || p.status === 'captured' || p.status === 'paid') {
          const key = p.createdAt.toISOString().split('T')[0];
          revenueByDay.set(key, (revenueByDay.get(key) || 0) + p.amount);
        }
      });

      const revenueOverTime: RevenueChartPoint[] = Array.from(revenueByDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dateStr, revenue]) => ({
          date: dateStr,
          label: formatDateLabel(new Date(dateStr), dateRangeType),
          revenue,
        }));

      // Group by payment method
      const paymentMethodMap = new Map<string, number>();
      currentPayments.forEach((p) => {
        if (p.status === 'succeeded' || p.status === 'captured' || p.status === 'paid') {
          const method = p.paymentMethod.toLowerCase();
          paymentMethodMap.set(method, (paymentMethodMap.get(method) || 0) + p.amount);
        }
      });

      const revenueByPaymentMethod: PaymentMethodData[] = [
        { name: 'Stripe', value: paymentMethodMap.get('stripe') || 0, color: COLORS.stripe },
        { name: 'PayPal', value: paymentMethodMap.get('paypal') || 0, color: COLORS.paypal },
      ].filter((pm) => pm.value > 0);

      // If no data, add placeholder
      if (revenueByPaymentMethod.length === 0) {
        revenueByPaymentMethod.push({ name: 'Stripe', value: 0, color: COLORS.stripe });
      }

      // Group by country
      const countryMap = new Map<string, { amount: number; count: number }>();
      currentPayments.forEach((p) => {
        if (p.status === 'succeeded' || p.status === 'captured' || p.status === 'paid') {
          const country = p.country || 'Unknown';
          const existing = countryMap.get(country) || { amount: 0, count: 0 };
          countryMap.set(country, {
            amount: existing.amount + p.amount,
            count: existing.count + 1,
          });
        }
      });

      const revenueByCountry: CountryRevenueData[] = Array.from(countryMap.entries())
        .map(([country, cdata]) => ({
          country,
          countryCode: country.length === 2 ? country : 'FR',
          amount: cdata.amount,
          transactionCount: cdata.count,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      // Group by status
      const statusMap = new Map<string, { count: number; amount: number }>();
      currentPayments.forEach((p) => {
        const existing = statusMap.get(p.status) || { count: 0, amount: 0 };
        statusMap.set(p.status, {
          count: existing.count + 1,
          amount: existing.amount + p.amount,
        });
      });

      const statusDistribution: StatusDistribution[] = Array.from(statusMap.entries())
        .map(([status, sdata]) => ({
          status,
          count: sdata.count,
          amount: sdata.amount,
          color: STATUS_COLORS[status] || COLORS.pending,
        }))
        .sort((a, b) => b.count - a.count);

      // Get recent transactions
      const recentTransactions: RecentTransaction[] = currentPayments
        .slice(0, 10)
        .map((p, index) => ({
          id: `tx-${index}`,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          providerName: p.providerName,
          clientName: p.clientName,
          createdAt: p.createdAt,
          paymentMethod: p.paymentMethod,
        }));

      // Calculate pending payouts
      const pendingPayouts = currentPayments
        .filter((p) => p.status === 'succeeded' || p.status === 'captured' || p.status === 'paid')
        .reduce((sum, p) => sum + (p.amount - p.platformFee), 0);

      // Count disputes (payments with status 'disputed')
      const disputes = currentPayments.filter((p) => p.status === 'disputed');
      const disputeCount = disputes.length;
      const disputeAmount = disputes.reduce((sum, p) => sum + p.amount, 0);

      // Set dashboard data
      setData({
        totalRevenue: {
          current: currentTotalRevenue,
          previous: previousTotalRevenue,
          percentChange: revenueChange,
        },
        totalTransactions: {
          current: currentTransactionCount,
          previous: previousTransactionCount,
          percentChange: transactionChange,
        },
        avgTransactionValue: {
          current: currentAvgTransaction,
          previous: previousAvgTransaction,
          percentChange: avgTransactionChange,
        },
        netRevenue: {
          current: currentNetRevenue,
          previous: previousNetRevenue,
          percentChange: netRevenueChange,
        },
        refundsRate: { rate: refundRate, amount: currentRefunds },
        activeDisputes: { count: disputeCount, amountAtRisk: disputeAmount },
        mrr,
        pendingPayouts,
        revenueOverTime,
        revenueByPaymentMethod,
        revenueByCountry,
        statusDistribution,
        recentTransactions,
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      if (mountedRef.current) {
        setError(intl.formatMessage({ id: 'admin.finance.dashboard.error.loading', defaultMessage: 'Erreur lors du chargement des donnees' }));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [dateRange, dateRangeType, intl]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    loadDashboardData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadDashboardData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle export
  const handleExport = useCallback(() => {
    if (!data) return;

    const csvContent = [
      ['Metric', 'Value', 'Previous', 'Change %'],
      ['Total Revenue', data.totalRevenue.current.toFixed(2), data.totalRevenue.previous.toFixed(2), data.totalRevenue.percentChange.toFixed(2)],
      ['Total Transactions', data.totalTransactions.current, data.totalTransactions.previous, data.totalTransactions.percentChange.toFixed(2)],
      ['Avg Transaction', data.avgTransactionValue.current.toFixed(2), data.avgTransactionValue.previous.toFixed(2), data.avgTransactionValue.percentChange.toFixed(2)],
      ['Net Revenue', data.netRevenue.current.toFixed(2), data.netRevenue.previous.toFixed(2), data.netRevenue.percentChange.toFixed(2)],
      ['Refund Rate (%)', data.refundsRate.rate.toFixed(2), '', ''],
      ['Refund Amount', data.refundsRate.amount.toFixed(2), '', ''],
      ['MRR', data.mrr.toFixed(2), '', ''],
      ['Pending Payouts', data.pendingPayouts.toFixed(2), '', ''],
      ['Active Disputes', data.activeDisputes.count, '', ''],
      ['Amount at Risk', data.activeDisputes.amountAtRisk.toFixed(2), '', ''],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  // Handle date range change
  const handleDateRangeChange = useCallback((range: DateRangeType) => {
    setDateRangeType(range);
    if (range !== 'custom') {
      setShowDatePicker(false);
    }
  }, []);

  // Error state
  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FormattedMessage id="admin.finance.dashboard.retry" defaultMessage="Reessayer" />
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              <FormattedMessage id="admin.finance.dashboard.title" defaultMessage="Dashboard Financier" />
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              <FormattedMessage
                id="admin.finance.dashboard.subtitle"
                defaultMessage="Vue d'ensemble des performances financieres"
              />
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Selector */}
            <div className="relative">
              <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {(['7d', '30d', '90d', 'ytd'] as DateRangeType[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => handleDateRangeChange(range)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      dateRangeType === range
                        ? 'bg-red-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {range === 'ytd' ? 'YTD' : range.toUpperCase()}
                  </button>
                ))}
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`px-3 py-2 text-sm font-medium flex items-center gap-1 transition-colors ${
                    dateRangeType === 'custom'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Calendar size={14} />
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Custom Date Picker Dropdown */}
              {showDatePicker && (
                <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
                  <div className="flex gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        <FormattedMessage id="admin.finance.dashboard.dateFrom" defaultMessage="Du" />
                      </label>
                      <input
                        type="date"
                        value={customDateRange?.start.toISOString().split('T')[0] || ''}
                        onChange={(e) =>
                          setCustomDateRange((prev) => ({
                            start: new Date(e.target.value),
                            end: prev?.end || new Date(),
                          }))
                        }
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        <FormattedMessage id="admin.finance.dashboard.dateTo" defaultMessage="Au" />
                      </label>
                      <input
                        type="date"
                        value={customDateRange?.end.toISOString().split('T')[0] || ''}
                        onChange={(e) =>
                          setCustomDateRange((prev) => ({
                            start: prev?.start || new Date(),
                            end: new Date(e.target.value),
                          }))
                        }
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDateRangeType('custom');
                      setShowDatePicker(false);
                    }}
                    className="mt-3 w-full px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    <FormattedMessage id="admin.finance.dashboard.apply" defaultMessage="Appliquer" />
                  </button>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <FormattedMessage id="admin.finance.dashboard.refresh" defaultMessage="Actualiser" />
            </button>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isLoading || !data}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Download size={16} />
              <FormattedMessage id="admin.finance.dashboard.export" defaultMessage="Exporter" />
            </button>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title={intl.formatMessage({ id: 'admin.finance.dashboard.totalRevenue', defaultMessage: 'Revenus Totaux' })}
            value={formatCurrency(data?.totalRevenue.current || 0)}
            change={data?.totalRevenue.percentChange}
            icon={<DollarSign size={24} className="text-green-600" />}
            iconBgColor="bg-green-100"
            loading={isLoading}
          />
          <KPICard
            title={intl.formatMessage({ id: 'admin.finance.dashboard.totalTransactions', defaultMessage: 'Transactions' })}
            value={formatNumber(data?.totalTransactions.current || 0)}
            change={data?.totalTransactions.percentChange}
            icon={<CreditCard size={24} className="text-blue-600" />}
            iconBgColor="bg-blue-100"
            loading={isLoading}
          />
          <KPICard
            title={intl.formatMessage({ id: 'admin.finance.dashboard.avgTransaction', defaultMessage: 'Panier Moyen' })}
            value={formatCurrency(data?.avgTransactionValue.current || 0)}
            change={data?.avgTransactionValue.percentChange}
            icon={<TrendingUp size={24} className="text-purple-600" />}
            iconBgColor="bg-purple-100"
            loading={isLoading}
          />
          <KPICard
            title={intl.formatMessage({ id: 'admin.finance.dashboard.netRevenue', defaultMessage: 'Revenus Nets' })}
            value={formatCurrency(data?.netRevenue.current || 0)}
            change={data?.netRevenue.percentChange}
            icon={<DollarSign size={24} className="text-red-600" />}
            iconBgColor="bg-red-100"
            loading={isLoading}
            subtitle={intl.formatMessage({ id: 'admin.finance.dashboard.afterRefunds', defaultMessage: 'Apres remboursements' })}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Over Time Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <FormattedMessage id="admin.finance.dashboard.revenueOverTime" defaultMessage="Evolution des Revenus" />
            </h3>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data?.revenueOverTime || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    stroke="#9CA3AF"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#9CA3AF"
                    tickLine={false}
                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenus']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Payment Method Pie Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <FormattedMessage id="admin.finance.dashboard.byPaymentMethod" defaultMessage="Par Methode de Paiement" />
            </h3>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : data?.revenueByPaymentMethod && data.revenueByPaymentMethod.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={data.revenueByPaymentMethod}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {data.revenueByPaymentMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Revenus']}
                  />
                  <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <FormattedMessage id="admin.finance.dashboard.noData" defaultMessage="Aucune donnee" />
              </div>
            )}
          </div>
        </div>

        {/* Secondary KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SecondaryKPICard
            title={intl.formatMessage({ id: 'admin.finance.dashboard.refundsRate', defaultMessage: 'Taux de Remboursement' })}
            mainValue={`${(data?.refundsRate.rate || 0).toFixed(1)}%`}
            secondaryValue={formatCurrency(data?.refundsRate.amount || 0)}
            icon={<RefreshCw size={20} className="text-purple-600" />}
            iconBgColor="bg-purple-100"
            loading={isLoading}
          />
          <SecondaryKPICard
            title={intl.formatMessage({ id: 'admin.finance.dashboard.activeDisputes', defaultMessage: 'Litiges Actifs' })}
            mainValue={formatNumber(data?.activeDisputes.count || 0)}
            secondaryValue={`${formatCurrency(data?.activeDisputes.amountAtRisk || 0)} a risque`}
            icon={<AlertTriangle size={20} className="text-orange-600" />}
            iconBgColor="bg-orange-100"
            loading={isLoading}
          />
          <SecondaryKPICard
            title={intl.formatMessage({ id: 'admin.finance.dashboard.mrr', defaultMessage: 'MRR (Abonnements)' })}
            mainValue={formatCurrency(data?.mrr || 0)}
            secondaryValue={intl.formatMessage({ id: 'admin.finance.dashboard.monthly', defaultMessage: 'Mensuel' })}
            icon={<TrendingUp size={20} className="text-green-600" />}
            iconBgColor="bg-green-100"
            loading={isLoading}
          />
          <SecondaryKPICard
            title={intl.formatMessage({ id: 'admin.finance.dashboard.pendingPayouts', defaultMessage: 'Paiements en Attente' })}
            mainValue={formatCurrency(data?.pendingPayouts || 0)}
            secondaryValue={intl.formatMessage({ id: 'admin.finance.dashboard.toProviders', defaultMessage: 'Vers prestataires' })}
            icon={<Clock size={20} className="text-blue-600" />}
            iconBgColor="bg-blue-100"
            loading={isLoading}
          />
        </div>

        {/* Transaction Distribution Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Country */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <FormattedMessage id="admin.finance.dashboard.byCountry" defaultMessage="Revenus par Pays (Top 10)" />
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.revenueByCountry || []).map((country, index) => {
                  const maxAmount = data?.revenueByCountry?.[0]?.amount || 1;
                  const percentage = (country.amount / maxAmount) * 100;

                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 text-center">
                        <CountryFlag code={country.countryCode} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {country.country}
                          </span>
                          <span className="text-sm text-gray-600">
                            {formatCurrency(country.amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {country.transactionCount} tx
                      </span>
                    </div>
                  );
                })}
                {(!data?.revenueByCountry || data.revenueByCountry.length === 0) && (
                  <p className="text-gray-500 text-center py-4">
                    <FormattedMessage id="admin.finance.dashboard.noData" defaultMessage="Aucune donnee" />
                  </p>
                )}
              </div>
            )}
          </div>

          {/* By Status */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <FormattedMessage id="admin.finance.dashboard.byStatus" defaultMessage="Distribution par Statut" />
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(data?.statusDistribution || []).map((status, index) => {
                  const totalCount = data?.statusDistribution?.reduce((sum, s) => sum + s.count, 0) || 1;
                  const percentage = (status.count / totalCount) * 100;

                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {status.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {status.count}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%`, backgroundColor: status.color }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(status.amount)}
                      </p>
                    </div>
                  );
                })}
                {(!data?.statusDistribution || data.statusDistribution.length === 0) && (
                  <p className="text-gray-500 text-center py-4">
                    <FormattedMessage id="admin.finance.dashboard.noData" defaultMessage="Aucune donnee" />
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              <FormattedMessage id="admin.finance.dashboard.recentActivity" defaultMessage="Activite Recente" />
            </h3>
            <Link
              to="/admin/payments"
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              <FormattedMessage id="admin.finance.dashboard.viewAll" defaultMessage="Voir tout" />
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FormattedMessage id="admin.finance.dashboard.table.date" defaultMessage="Date" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FormattedMessage id="admin.finance.dashboard.table.client" defaultMessage="Client" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FormattedMessage id="admin.finance.dashboard.table.provider" defaultMessage="Prestataire" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FormattedMessage id="admin.finance.dashboard.table.amount" defaultMessage="Montant" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FormattedMessage id="admin.finance.dashboard.table.method" defaultMessage="Methode" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <FormattedMessage id="admin.finance.dashboard.table.status" defaultMessage="Statut" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-gray-100 animate-pulse rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (data?.recentTransactions || []).length > 0 ? (
                  data?.recentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.createdAt.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.clientName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.providerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 capitalize">
                          {tx.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="px-2 py-1 text-xs rounded-full capitalize"
                          style={{
                            backgroundColor: `${STATUS_COLORS[tx.status] || COLORS.pending}20`,
                            color: STATUS_COLORS[tx.status] || COLORS.pending,
                          }}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <FormattedMessage id="admin.finance.dashboard.noTransactions" defaultMessage="Aucune transaction recente" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default FinanceDashboard;
