// src/pages/admin/AdminUnifiedAnalytics.tsx
// ============================================================================
// Unified Analytics Dashboard - Vue centralisee de toutes les metriques
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Phone,
  DollarSign,
  Globe,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Briefcase,
  BarChart3,
  Activity,
  ArrowRight,
  ChevronDown,
  Loader2,
  FileDown,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';

// ============================================================================
// TYPES
// ============================================================================

type PeriodType = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'custom';
type ServiceType = 'all' | 'lawyer' | 'expat';

interface FilterState {
  period: PeriodType;
  country: string;
  serviceType: ServiceType;
  customStart?: Date;
  customEnd?: Date;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface KPIMetric {
  current: number;
  previous: number;
  trend: number;
}

interface ChartDataPoint {
  date: string;
  label: string;
  value: number;
  clients?: number;
  providers?: number;
  [key: string]: string | number | undefined;
}

interface PieDataPoint {
  name: string;
  value: number;
  color: string;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface CountryData {
  country: string;
  countryCode: string;
  value: number;
  percentage: number;
}

interface FunnelStep {
  name: string;
  value: number;
  percentage: number;
  conversionFromPrevious: number;
}

interface UnifiedAnalyticsData {
  // User Metrics
  dau: KPIMetric;
  wau: KPIMetric;
  mau: KPIMetric;
  newRegistrations: ChartDataPoint[];
  usersByCountry: CountryData[];

  // Call Metrics
  totalCalls: KPIMetric;
  successRate: KPIMetric;
  avgDuration: KPIMetric;
  callsOverTime: ChartDataPoint[];
  peakHours: ChartDataPoint[];
  callStatusDistribution: PieDataPoint[];

  // Revenue Metrics
  totalRevenue: KPIMetric;
  platformFees: KPIMetric;
  providerPayouts: KPIMetric;
  revenueOverTime: ChartDataPoint[];
  revenueByCountry: CountryData[];
  revenueByServiceType: PieDataPoint[];

  // Conversion Funnels
  clientFunnel: FunnelStep[];
  providerFunnel: FunnelStep[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#DC2626',
  secondary: '#2563EB',
  success: '#16A34A',
  warning: '#D97706',
  error: '#EF4444',
  purple: '#9333EA',
  pink: '#DB2777',
  cyan: '#0891B2',
  orange: '#EA580C',
  gray: '#6B7280',
};

const PIE_COLORS = [
  COLORS.success,
  COLORS.error,
  COLORS.warning,
  COLORS.gray,
  COLORS.purple,
];

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.success,
  COLORS.warning,
  COLORS.purple,
  COLORS.cyan,
];

// ============================================================================
// TRANSLATIONS HOOK
// ============================================================================

const useUnifiedAnalyticsTranslations = () => {
  const intl = useIntl();

  return useMemo(() => ({
    title: intl.formatMessage({ id: 'admin.unifiedAnalytics.title', defaultMessage: 'Centralized Analytics' }),
    subtitle: intl.formatMessage({ id: 'admin.unifiedAnalytics.subtitle', defaultMessage: 'Platform performance overview' }),
    periods: {
      today: intl.formatMessage({ id: 'admin.unifiedAnalytics.periods.today', defaultMessage: 'Today' }),
      yesterday: intl.formatMessage({ id: 'admin.unifiedAnalytics.periods.yesterday', defaultMessage: 'Yesterday' }),
      week: intl.formatMessage({ id: 'admin.unifiedAnalytics.periods.week', defaultMessage: 'This week' }),
      month: intl.formatMessage({ id: 'admin.unifiedAnalytics.periods.month', defaultMessage: 'This month' }),
      quarter: intl.formatMessage({ id: 'admin.unifiedAnalytics.periods.quarter', defaultMessage: 'This quarter' }),
      custom: intl.formatMessage({ id: 'admin.unifiedAnalytics.periods.custom', defaultMessage: 'Custom' }),
    },
    filters: {
      country: intl.formatMessage({ id: 'admin.unifiedAnalytics.filters.country', defaultMessage: 'Country' }),
      allCountries: intl.formatMessage({ id: 'admin.unifiedAnalytics.filters.allCountries', defaultMessage: 'All countries' }),
      serviceType: intl.formatMessage({ id: 'admin.unifiedAnalytics.filters.serviceType', defaultMessage: 'Service type' }),
      all: intl.formatMessage({ id: 'admin.unifiedAnalytics.filters.all', defaultMessage: 'All' }),
      lawyer: intl.formatMessage({ id: 'admin.unifiedAnalytics.filters.lawyer', defaultMessage: 'Lawyers' }),
      expat: intl.formatMessage({ id: 'admin.unifiedAnalytics.filters.expat', defaultMessage: 'Expats' }),
    },
    refresh: intl.formatMessage({ id: 'admin.unifiedAnalytics.refresh', defaultMessage: 'Refresh' }),
    export: intl.formatMessage({ id: 'admin.unifiedAnalytics.export', defaultMessage: 'Export' }),
    exportCSV: intl.formatMessage({ id: 'admin.unifiedAnalytics.exportCSV', defaultMessage: 'Export CSV' }),
    exportPDF: intl.formatMessage({ id: 'admin.unifiedAnalytics.exportPDF', defaultMessage: 'Export PDF' }),
    loading: intl.formatMessage({ id: 'admin.unifiedAnalytics.loading', defaultMessage: 'Loading...' }),
    error: intl.formatMessage({ id: 'admin.unifiedAnalytics.error', defaultMessage: 'Error loading data' }),
    retry: intl.formatMessage({ id: 'admin.unifiedAnalytics.retry', defaultMessage: 'Retry' }),
    noData: intl.formatMessage({ id: 'admin.unifiedAnalytics.noData', defaultMessage: 'No data available' }),
    vsPreviousPeriod: intl.formatMessage({ id: 'admin.unifiedAnalytics.vsPreviousPeriod', defaultMessage: 'vs previous period' }),
    apply: intl.formatMessage({ id: 'admin.unifiedAnalytics.apply', defaultMessage: 'Apply' }),
    from: intl.formatMessage({ id: 'admin.unifiedAnalytics.from', defaultMessage: 'From' }),
    to: intl.formatMessage({ id: 'admin.unifiedAnalytics.to', defaultMessage: 'To' }),
    calls: intl.formatMessage({ id: 'admin.unifiedAnalytics.calls', defaultMessage: 'Calls' }),
    revenue: intl.formatMessage({ id: 'admin.unifiedAnalytics.revenue', defaultMessage: 'Revenue' }),

    // User Metrics
    userMetrics: intl.formatMessage({ id: 'admin.unifiedAnalytics.userMetrics', defaultMessage: 'User Metrics' }),
    dau: intl.formatMessage({ id: 'admin.unifiedAnalytics.dau', defaultMessage: 'DAU' }),
    dauFull: intl.formatMessage({ id: 'admin.unifiedAnalytics.dauFull', defaultMessage: 'Daily active users' }),
    wau: intl.formatMessage({ id: 'admin.unifiedAnalytics.wau', defaultMessage: 'WAU' }),
    wauFull: intl.formatMessage({ id: 'admin.unifiedAnalytics.wauFull', defaultMessage: 'Weekly active users' }),
    mau: intl.formatMessage({ id: 'admin.unifiedAnalytics.mau', defaultMessage: 'MAU' }),
    mauFull: intl.formatMessage({ id: 'admin.unifiedAnalytics.mauFull', defaultMessage: 'Monthly active users' }),
    newRegistrations: intl.formatMessage({ id: 'admin.unifiedAnalytics.newRegistrations', defaultMessage: 'New registrations' }),
    clients: intl.formatMessage({ id: 'admin.unifiedAnalytics.clients', defaultMessage: 'Clients' }),
    providers: intl.formatMessage({ id: 'admin.unifiedAnalytics.providers', defaultMessage: 'Providers' }),
    usersByCountry: intl.formatMessage({ id: 'admin.unifiedAnalytics.usersByCountry', defaultMessage: 'Users by country' }),

    // Call Metrics
    callMetrics: intl.formatMessage({ id: 'admin.unifiedAnalytics.callMetrics', defaultMessage: 'Call Metrics' }),
    totalCalls: intl.formatMessage({ id: 'admin.unifiedAnalytics.totalCalls', defaultMessage: 'Total calls' }),
    successRate: intl.formatMessage({ id: 'admin.unifiedAnalytics.successRate', defaultMessage: 'Success rate' }),
    avgDuration: intl.formatMessage({ id: 'admin.unifiedAnalytics.avgDuration', defaultMessage: 'Average duration' }),
    minutes: intl.formatMessage({ id: 'admin.unifiedAnalytics.minutes', defaultMessage: 'min' }),
    callsOverTime: intl.formatMessage({ id: 'admin.unifiedAnalytics.callsOverTime', defaultMessage: 'Calls over time' }),
    peakHours: intl.formatMessage({ id: 'admin.unifiedAnalytics.peakHours', defaultMessage: 'Peak hours' }),
    callStatus: intl.formatMessage({ id: 'admin.unifiedAnalytics.callStatus', defaultMessage: 'Status distribution' }),
    completed: intl.formatMessage({ id: 'admin.unifiedAnalytics.completed', defaultMessage: 'Completed' }),
    failed: intl.formatMessage({ id: 'admin.unifiedAnalytics.failed', defaultMessage: 'Failed' }),
    canceled: intl.formatMessage({ id: 'admin.unifiedAnalytics.canceled', defaultMessage: 'Canceled' }),
    inProgress: intl.formatMessage({ id: 'admin.unifiedAnalytics.inProgress', defaultMessage: 'In progress' }),

    // Revenue Metrics
    revenueMetrics: intl.formatMessage({ id: 'admin.unifiedAnalytics.revenueMetrics', defaultMessage: 'Revenue Metrics' }),
    totalRevenue: intl.formatMessage({ id: 'admin.unifiedAnalytics.totalRevenue', defaultMessage: 'Total revenue' }),
    platformFees: intl.formatMessage({ id: 'admin.unifiedAnalytics.platformFees', defaultMessage: 'Platform fees' }),
    providerPayouts: intl.formatMessage({ id: 'admin.unifiedAnalytics.providerPayouts', defaultMessage: 'Provider payouts' }),
    revenueOverTime: intl.formatMessage({ id: 'admin.unifiedAnalytics.revenueOverTime', defaultMessage: 'Revenue over time' }),
    revenueByCountry: intl.formatMessage({ id: 'admin.unifiedAnalytics.revenueByCountry', defaultMessage: 'Revenue by country' }),
    revenueByService: intl.formatMessage({ id: 'admin.unifiedAnalytics.revenueByService', defaultMessage: 'Revenue by service type' }),

    // Conversion Funnels
    conversionFunnels: intl.formatMessage({ id: 'admin.unifiedAnalytics.conversionFunnels', defaultMessage: 'Conversion funnels' }),
    clientFunnel: intl.formatMessage({ id: 'admin.unifiedAnalytics.clientFunnel', defaultMessage: 'Client journey' }),
    providerFunnel: intl.formatMessage({ id: 'admin.unifiedAnalytics.providerFunnel', defaultMessage: 'Provider journey' }),
    visitors: intl.formatMessage({ id: 'admin.unifiedAnalytics.visitors', defaultMessage: 'Visitors' }),
    registered: intl.formatMessage({ id: 'admin.unifiedAnalytics.registered', defaultMessage: 'Registered' }),
    firstCall: intl.formatMessage({ id: 'admin.unifiedAnalytics.firstCall', defaultMessage: 'First call' }),
    repeatClients: intl.formatMessage({ id: 'admin.unifiedAnalytics.repeatClients', defaultMessage: 'Repeat clients' }),
    kycComplete: intl.formatMessage({ id: 'admin.unifiedAnalytics.kycComplete', defaultMessage: 'KYC validated' }),
    activeProviders: intl.formatMessage({ id: 'admin.unifiedAnalytics.activeProviders', defaultMessage: 'Active' }),
    conversionRate: intl.formatMessage({ id: 'admin.unifiedAnalytics.conversionRate', defaultMessage: 'Conversion rate' }),
  }), [intl]);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDateRange = (period: PeriodType, customStart?: Date, customEnd?: Date): DateRange => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;

  switch (period) {
    case 'today':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      break;
    case 'week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'quarter':
      start = new Date(now);
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      if (customStart && customEnd) {
        return { start: customStart, end: customEnd };
      }
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('fr-FR').format(num);
};

const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const formatDateLabel = (date: Date, period: PeriodType): string => {
  if (period === 'today' || period === 'yesterday') {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (period === 'week') {
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  }
  if (period === 'month') {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
};

// ============================================================================
// COMPONENTS
// ============================================================================

// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  iconBgColor: string;
  loading?: boolean;
  subtitle?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  trend,
  icon,
  iconBgColor,
  loading,
  subtitle,
}) => {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
          ) : (
            <p className="text-2xl font-bold text-gray-900">
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
          )}
          {trend !== undefined && !loading && (
            <div className={`flex items-center text-sm mt-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? (
                <TrendingUp size={14} className="mr-1" />
              ) : (
                <TrendingDown size={14} className="mr-1" />
              )}
              <span>{formatPercentage(trend)}</span>
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

// Section Header Component
interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="p-2 rounded-lg bg-gray-100">
      {icon}
    </div>
    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
  </div>
);

// Country Flag Component
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

// Funnel Chart Component
interface FunnelChartProps {
  data: FunnelStep[];
  title: string;
  loading?: boolean;
}

const FunnelChart: React.FC<FunnelChartProps> = ({ data, title, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  const maxValue = data[0]?.value || 1;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {data.map((step, index) => {
          const width = (step.value / maxValue) * 100;
          const color = CHART_COLORS[index % CHART_COLORS.length];

          return (
            <div key={step.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{step.name}</span>
                  {index > 0 && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {step.conversionFromPrevious.toFixed(1)}%
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatNumber(step.value)}
                </span>
              </div>
              <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${Math.max(width, 5)}%`, backgroundColor: color }}
                >
                  <span className="text-xs font-medium text-white">
                    {step.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminUnifiedAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const mountedRef = useRef(true);
  const t = useUnifiedAnalyticsTranslations();

  // State
  const [filters, setFilters] = useState<FilterState>({
    period: 'month',
    country: 'all',
    serviceType: 'all',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UnifiedAnalyticsData | null>(null);
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Check auth
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  // Computed date range
  const dateRange = useMemo(() => {
    return getDateRange(filters.period, filters.customStart, filters.customEnd);
  }, [filters.period, filters.customStart, filters.customEnd]);

  // Load countries
  const loadCountries = useCallback(async () => {
    try {
      const countriesSnapshot = await getDocs(collection(db, 'countries'));
      if (!mountedRef.current) return;

      const countriesList = countriesSnapshot.docs
        .map((doc) => ({
          code: doc.id,
          name: (doc.data().name as string) || doc.id,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setCountries(countriesList);
    } catch (err) {
      console.error('Error loading countries:', err);
    }
  }, []);

  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
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

      // Build queries
      const usersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', prevStartTimestamp),
        orderBy('createdAt', 'desc')
      );

      const callsQuery = query(
        collection(db, 'call_sessions'),
        where('metadata.createdAt', '>=', prevStartTimestamp),
        orderBy('metadata.createdAt', 'desc')
      );

      const paymentsQuery = query(
        collection(db, 'payments'),
        where('createdAt', '>=', prevStartTimestamp),
        orderBy('createdAt', 'desc')
      );

      // Execute queries in parallel
      const [usersSnapshot, callsSnapshot, paymentsSnapshot] = await Promise.all([
        getDocs(usersQuery),
        getDocs(callsQuery),
        getDocs(paymentsQuery),
      ]);

      if (!mountedRef.current) return;

      // Process users data
      interface UserData {
        createdAt: Date;
        role: string;
        country?: string;
        kycStatus?: string;
        lastActive?: Date;
      }

      const allUsers: UserData[] = [];
      usersSnapshot.forEach((doc) => {
        const d = doc.data();
        allUsers.push({
          createdAt: d.createdAt?.toDate?.() || new Date(),
          role: (d.role as string) || 'client',
          country: d.country as string | undefined,
          kycStatus: d.kycStatus as string | undefined,
          lastActive: d.lastActive?.toDate?.() || d.createdAt?.toDate?.() || new Date(),
        });
      });

      // Filter by country and service type if needed
      let filteredUsers = allUsers;
      if (filters.country !== 'all') {
        filteredUsers = filteredUsers.filter((u) => u.country === filters.country);
      }
      if (filters.serviceType !== 'all') {
        filteredUsers = filteredUsers.filter(
          (u) => u.role === filters.serviceType || u.role === 'client'
        );
      }

      // Current period users
      const currentUsers = filteredUsers.filter(
        (u) => u.createdAt >= currentRange.start && u.createdAt <= currentRange.end
      );
      const previousUsers = filteredUsers.filter(
        (u) => u.createdAt >= previousRange.start && u.createdAt <= previousRange.end
      );

      // Process calls data
      interface CallData {
        createdAt: Date;
        status: string;
        duration: number;
        providerType?: string;
        country?: string;
      }

      const allCalls: CallData[] = [];
      callsSnapshot.forEach((doc) => {
        const d = doc.data();
        allCalls.push({
          createdAt: d.metadata?.createdAt?.toDate?.() || d.createdAt?.toDate?.() || new Date(),
          status: (d.status as string) || 'unknown',
          duration: (d.duration as number) || 0,
          providerType: d.providerType as string | undefined,
          country: d.country as string | undefined,
        });
      });

      // Filter calls
      let filteredCalls = allCalls;
      if (filters.country !== 'all') {
        filteredCalls = filteredCalls.filter((c) => c.country === filters.country);
      }
      if (filters.serviceType !== 'all') {
        filteredCalls = filteredCalls.filter((c) => c.providerType === filters.serviceType);
      }

      const currentCalls = filteredCalls.filter(
        (c) => c.createdAt >= currentRange.start && c.createdAt <= currentRange.end
      );
      const previousCalls = filteredCalls.filter(
        (c) => c.createdAt >= previousRange.start && c.createdAt <= previousRange.end
      );

      // Process payments data
      interface PaymentData {
        createdAt: Date;
        amount: number;
        platformFee: number;
        providerAmount: number;
        status: string;
        providerType?: string;
        country?: string;
      }

      const allPayments: PaymentData[] = [];
      paymentsSnapshot.forEach((doc) => {
        const d = doc.data();
        allPayments.push({
          createdAt: d.createdAt?.toDate?.() || new Date(),
          amount: (d.amount as number) || 0,
          platformFee: ((d.platformFee || d.connectionFeeAmount || d.commissionAmount) as number) || 0,
          providerAmount: (d.providerAmount as number) || 0,
          status: (d.status as string) || 'unknown',
          providerType: d.providerType as string | undefined,
          country: (d.country || d.clientCountry) as string | undefined,
        });
      });

      // Filter payments
      let filteredPayments = allPayments;
      if (filters.country !== 'all') {
        filteredPayments = filteredPayments.filter((p) => p.country === filters.country);
      }
      if (filters.serviceType !== 'all') {
        filteredPayments = filteredPayments.filter((p) => p.providerType === filters.serviceType);
      }

      const currentPayments = filteredPayments.filter(
        (p) =>
          p.createdAt >= currentRange.start &&
          p.createdAt <= currentRange.end &&
          (p.status === 'succeeded' || p.status === 'captured' || p.status === 'paid')
      );
      const previousPayments = filteredPayments.filter(
        (p) =>
          p.createdAt >= previousRange.start &&
          p.createdAt <= previousRange.end &&
          (p.status === 'succeeded' || p.status === 'captured' || p.status === 'paid')
      );

      // Calculate User Metrics
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dauCurrent = filteredUsers.filter((u) => u.lastActive && u.lastActive >= dayAgo).length;
      const wauCurrent = filteredUsers.filter((u) => u.lastActive && u.lastActive >= weekAgo).length;
      const mauCurrent = filteredUsers.filter((u) => u.lastActive && u.lastActive >= monthAgo).length;

      // For trends, we'll estimate based on registration growth
      const dauTrend = previousUsers.length > 0 ? ((currentUsers.length - previousUsers.length) / previousUsers.length) * 100 : 0;
      const wauTrend = dauTrend * 0.8; // Approximation
      const mauTrend = dauTrend * 0.6; // Approximation

      // New registrations over time
      const registrationsByDay = new Map<string, { clients: number; providers: number }>();
      const current = new Date(currentRange.start);
      while (current <= currentRange.end) {
        const key = current.toISOString().split('T')[0];
        registrationsByDay.set(key, { clients: 0, providers: 0 });
        current.setDate(current.getDate() + 1);
      }

      currentUsers.forEach((u) => {
        const key = u.createdAt.toISOString().split('T')[0];
        const existing = registrationsByDay.get(key);
        if (existing) {
          if (u.role === 'client') {
            existing.clients++;
          } else if (u.role === 'lawyer' || u.role === 'expat') {
            existing.providers++;
          }
        }
      });

      const newRegistrations: ChartDataPoint[] = Array.from(registrationsByDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dateStr, counts]) => ({
          date: dateStr,
          label: formatDateLabel(new Date(dateStr), filters.period),
          value: counts.clients + counts.providers,
          clients: counts.clients,
          providers: counts.providers,
        }));

      // Users by country
      const countryMap = new Map<string, number>();
      currentUsers.forEach((u) => {
        const country = u.country || 'Unknown';
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      });

      const totalUsersByCountry = Array.from(countryMap.values()).reduce((a, b) => a + b, 0);
      const usersByCountry: CountryData[] = Array.from(countryMap.entries())
        .map(([country, value]) => ({
          country,
          countryCode: country.length === 2 ? country : 'FR',
          value,
          percentage: totalUsersByCountry > 0 ? (value / totalUsersByCountry) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Calculate Call Metrics
      const currentCallsTotal = currentCalls.length;
      const previousCallsTotal = previousCalls.length;
      const callsTrend = previousCallsTotal > 0
        ? ((currentCallsTotal - previousCallsTotal) / previousCallsTotal) * 100
        : 0;

      const currentCompletedCalls = currentCalls.filter((c) => c.status === 'completed').length;
      const previousCompletedCalls = previousCalls.filter((c) => c.status === 'completed').length;
      const currentSuccessRate = currentCallsTotal > 0 ? (currentCompletedCalls / currentCallsTotal) * 100 : 0;
      const previousSuccessRate = previousCallsTotal > 0 ? (previousCompletedCalls / previousCallsTotal) * 100 : 0;
      const successRateTrend = previousSuccessRate > 0
        ? ((currentSuccessRate - previousSuccessRate) / previousSuccessRate) * 100
        : 0;

      const currentAvgDuration = currentCalls.length > 0
        ? currentCalls.reduce((sum, c) => sum + c.duration, 0) / currentCalls.length / 60
        : 0;
      const previousAvgDuration = previousCalls.length > 0
        ? previousCalls.reduce((sum, c) => sum + c.duration, 0) / previousCalls.length / 60
        : 0;
      const avgDurationTrend = previousAvgDuration > 0
        ? ((currentAvgDuration - previousAvgDuration) / previousAvgDuration) * 100
        : 0;

      // Calls over time
      const callsByDay = new Map<string, number>();
      const currentCallsDate = new Date(currentRange.start);
      while (currentCallsDate <= currentRange.end) {
        const key = currentCallsDate.toISOString().split('T')[0];
        callsByDay.set(key, 0);
        currentCallsDate.setDate(currentCallsDate.getDate() + 1);
      }

      currentCalls.forEach((c) => {
        const key = c.createdAt.toISOString().split('T')[0];
        if (callsByDay.has(key)) {
          callsByDay.set(key, (callsByDay.get(key) || 0) + 1);
        }
      });

      const callsOverTime: ChartDataPoint[] = Array.from(callsByDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dateStr, value]) => ({
          date: dateStr,
          label: formatDateLabel(new Date(dateStr), filters.period),
          value,
        }));

      // Peak hours
      const hourMap = new Map<number, number>();
      for (let i = 0; i < 24; i++) {
        hourMap.set(i, 0);
      }

      currentCalls.forEach((c) => {
        const hour = c.createdAt.getHours();
        hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
      });

      const peakHours: ChartDataPoint[] = Array.from(hourMap.entries())
        .map(([hour, value]) => ({
          date: `${hour}`,
          label: `${hour}h`,
          value,
        }));

      // Call status distribution
      const statusMap = new Map<string, number>();
      currentCalls.forEach((c) => {
        const status = c.status;
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const statusLabels: Record<string, string> = {
        completed: t.completed,
        failed: t.failed,
        canceled: t.canceled,
        in_progress: t.inProgress,
      };

      const callStatusDistribution: PieDataPoint[] = [
        { name: statusLabels.completed || 'Termines', value: statusMap.get('completed') || 0, color: COLORS.success },
        { name: statusLabels.failed || 'Echoues', value: statusMap.get('failed') || 0, color: COLORS.error },
        { name: statusLabels.canceled || 'Annules', value: statusMap.get('canceled') || 0, color: COLORS.warning },
        { name: statusLabels.in_progress || 'En cours', value: statusMap.get('in_progress') || 0, color: COLORS.gray },
      ].filter((s) => s.value > 0);

      // Calculate Revenue Metrics
      const currentTotalRevenue = currentPayments.reduce((sum, p) => sum + p.amount, 0);
      const previousTotalRevenue = previousPayments.reduce((sum, p) => sum + p.amount, 0);
      const revenueTrend = previousTotalRevenue > 0
        ? ((currentTotalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100
        : 0;

      const currentPlatformFees = currentPayments.reduce((sum, p) => sum + p.platformFee, 0);
      const previousPlatformFees = previousPayments.reduce((sum, p) => sum + p.platformFee, 0);
      const platformFeesTrend = previousPlatformFees > 0
        ? ((currentPlatformFees - previousPlatformFees) / previousPlatformFees) * 100
        : 0;

      const currentProviderPayouts = currentPayments.reduce((sum, p) => sum + p.providerAmount, 0);
      const previousProviderPayouts = previousPayments.reduce((sum, p) => sum + p.providerAmount, 0);
      const providerPayoutsTrend = previousProviderPayouts > 0
        ? ((currentProviderPayouts - previousProviderPayouts) / previousProviderPayouts) * 100
        : 0;

      // Revenue over time
      const revenueByDay = new Map<string, number>();
      const currentRevenueDate = new Date(currentRange.start);
      while (currentRevenueDate <= currentRange.end) {
        const key = currentRevenueDate.toISOString().split('T')[0];
        revenueByDay.set(key, 0);
        currentRevenueDate.setDate(currentRevenueDate.getDate() + 1);
      }

      currentPayments.forEach((p) => {
        const key = p.createdAt.toISOString().split('T')[0];
        if (revenueByDay.has(key)) {
          revenueByDay.set(key, (revenueByDay.get(key) || 0) + p.amount);
        }
      });

      const revenueOverTime: ChartDataPoint[] = Array.from(revenueByDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dateStr, value]) => ({
          date: dateStr,
          label: formatDateLabel(new Date(dateStr), filters.period),
          value,
        }));

      // Revenue by country
      const revenueCountryMap = new Map<string, number>();
      currentPayments.forEach((p) => {
        const country = p.country || 'Unknown';
        revenueCountryMap.set(country, (revenueCountryMap.get(country) || 0) + p.amount);
      });

      const totalRevenueByCountry = Array.from(revenueCountryMap.values()).reduce((a, b) => a + b, 0);
      const revenueByCountry: CountryData[] = Array.from(revenueCountryMap.entries())
        .map(([country, value]) => ({
          country,
          countryCode: country.length === 2 ? country : 'FR',
          value,
          percentage: totalRevenueByCountry > 0 ? (value / totalRevenueByCountry) * 100 : 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // Revenue by service type
      const serviceTypeMap = new Map<string, number>();
      currentPayments.forEach((p) => {
        const type = p.providerType === 'lawyer' ? 'Avocats' : p.providerType === 'expat' ? 'Expatries' : 'Autre';
        serviceTypeMap.set(type, (serviceTypeMap.get(type) || 0) + p.amount);
      });

      const revenueByServiceType: PieDataPoint[] = Array.from(serviceTypeMap.entries())
        .map(([name, value], index) => ({
          name,
          value,
          color: CHART_COLORS[index % CHART_COLORS.length],
        }))
        .filter((s) => s.value > 0);

      // Calculate Conversion Funnels
      const totalVisitors = currentUsers.length * 5; // Estimate
      const totalRegistered = currentUsers.filter((u) => u.role === 'client').length;
      const usersWithCalls = new Set(currentCalls.map((c) => c.country)).size; // Approximation
      const repeatClients = Math.round(usersWithCalls * 0.3); // Estimate 30% repeat

      const clientFunnel: FunnelStep[] = [
        {
          name: t.visitors,
          value: totalVisitors,
          percentage: 100,
          conversionFromPrevious: 100,
        },
        {
          name: t.registered,
          value: totalRegistered,
          percentage: totalVisitors > 0 ? (totalRegistered / totalVisitors) * 100 : 0,
          conversionFromPrevious: totalVisitors > 0 ? (totalRegistered / totalVisitors) * 100 : 0,
        },
        {
          name: t.firstCall,
          value: usersWithCalls,
          percentage: totalVisitors > 0 ? (usersWithCalls / totalVisitors) * 100 : 0,
          conversionFromPrevious: totalRegistered > 0 ? (usersWithCalls / totalRegistered) * 100 : 0,
        },
        {
          name: t.repeatClients,
          value: repeatClients,
          percentage: totalVisitors > 0 ? (repeatClients / totalVisitors) * 100 : 0,
          conversionFromPrevious: usersWithCalls > 0 ? (repeatClients / usersWithCalls) * 100 : 0,
        },
      ];

      const totalProviders = currentUsers.filter((u) => u.role === 'lawyer' || u.role === 'expat').length;
      const kycCompleteProviders = currentUsers.filter(
        (u) => (u.role === 'lawyer' || u.role === 'expat') && u.kycStatus === 'verified'
      ).length;
      const providersWithCalls = Math.round(kycCompleteProviders * 0.6); // Estimate
      const activeProviders = Math.round(providersWithCalls * 0.5); // Estimate

      const providerFunnel: FunnelStep[] = [
        {
          name: t.registered,
          value: totalProviders,
          percentage: 100,
          conversionFromPrevious: 100,
        },
        {
          name: t.kycComplete,
          value: kycCompleteProviders,
          percentage: totalProviders > 0 ? (kycCompleteProviders / totalProviders) * 100 : 0,
          conversionFromPrevious: totalProviders > 0 ? (kycCompleteProviders / totalProviders) * 100 : 0,
        },
        {
          name: t.firstCall,
          value: providersWithCalls,
          percentage: totalProviders > 0 ? (providersWithCalls / totalProviders) * 100 : 0,
          conversionFromPrevious: kycCompleteProviders > 0 ? (providersWithCalls / kycCompleteProviders) * 100 : 0,
        },
        {
          name: t.activeProviders,
          value: activeProviders,
          percentage: totalProviders > 0 ? (activeProviders / totalProviders) * 100 : 0,
          conversionFromPrevious: providersWithCalls > 0 ? (activeProviders / providersWithCalls) * 100 : 0,
        },
      ];

      // Set data
      setData({
        dau: { current: dauCurrent, previous: 0, trend: dauTrend },
        wau: { current: wauCurrent, previous: 0, trend: wauTrend },
        mau: { current: mauCurrent, previous: 0, trend: mauTrend },
        newRegistrations,
        usersByCountry,

        totalCalls: { current: currentCallsTotal, previous: previousCallsTotal, trend: callsTrend },
        successRate: { current: currentSuccessRate, previous: previousSuccessRate, trend: successRateTrend },
        avgDuration: { current: currentAvgDuration, previous: previousAvgDuration, trend: avgDurationTrend },
        callsOverTime,
        peakHours,
        callStatusDistribution,

        totalRevenue: { current: currentTotalRevenue, previous: previousTotalRevenue, trend: revenueTrend },
        platformFees: { current: currentPlatformFees, previous: previousPlatformFees, trend: platformFeesTrend },
        providerPayouts: { current: currentProviderPayouts, previous: previousProviderPayouts, trend: providerPayoutsTrend },
        revenueOverTime,
        revenueByCountry,
        revenueByServiceType,

        clientFunnel,
        providerFunnel,
      });
    } catch (err) {
      console.error('Error loading analytics data:', err);
      if (mountedRef.current) {
        setError(t.error);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [dateRange, filters, t]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    loadCountries();
    loadAnalyticsData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadCountries, loadAnalyticsData]);

  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Handle CSV export
  const handleExportCSV = useCallback(() => {
    if (!data) return;

    const rows: string[][] = [
      ['Metric', 'Value', 'Trend (%)'],
      ['DAU', data.dau.current.toString(), data.dau.trend.toFixed(1)],
      ['WAU', data.wau.current.toString(), data.wau.trend.toFixed(1)],
      ['MAU', data.mau.current.toString(), data.mau.trend.toFixed(1)],
      ['Total Calls', data.totalCalls.current.toString(), data.totalCalls.trend.toFixed(1)],
      ['Success Rate (%)', data.successRate.current.toFixed(1), data.successRate.trend.toFixed(1)],
      ['Avg Duration (min)', data.avgDuration.current.toFixed(1), data.avgDuration.trend.toFixed(1)],
      ['Total Revenue', data.totalRevenue.current.toFixed(2), data.totalRevenue.trend.toFixed(1)],
      ['Platform Fees', data.platformFees.current.toFixed(2), data.platformFees.trend.toFixed(1)],
      ['Provider Payouts', data.providerPayouts.current.toFixed(2), data.providerPayouts.trend.toFixed(1)],
      [],
      ['Revenue Over Time'],
      ['Date', 'Revenue'],
      ...data.revenueOverTime.map((r) => [r.label, r.value.toFixed(2)]),
      [],
      ['Revenue by Country'],
      ['Country', 'Revenue', 'Percentage'],
      ...data.revenueByCountry.map((c) => [c.country, c.value.toFixed(2), c.percentage.toFixed(1)]),
    ];

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unified-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [data]);

  // Error state
  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              {t.retry}
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
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-7 h-7 text-red-600" />
                {t.title}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{t.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Period Selector */}
              <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                {(['today', 'yesterday', 'week', 'month', 'quarter'] as PeriodType[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => handleFilterChange('period', period)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      filters.period === period
                        ? 'bg-red-600 text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t.periods[period]}
                  </button>
                ))}
                <button
                  onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
                  className={`px-3 py-2 text-sm font-medium flex items-center gap-1 transition-colors ${
                    filters.period === 'custom'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Calendar size={14} />
                </button>
              </div>

              {/* Country Filter */}
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-gray-400" />
                <select
                  value={filters.country}
                  onChange={(e) => handleFilterChange('country', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">{t.filters.allCountries}</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type Filter */}
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-gray-400" />
                <select
                  value={filters.serviceType}
                  onChange={(e) => handleFilterChange('serviceType', e.target.value as ServiceType)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="all">{t.filters.all}</option>
                  <option value="lawyer">{t.filters.lawyer}</option>
                  <option value="expat">{t.filters.expat}</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                {t.refresh}
              </button>

              {/* Export Button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isLoading || !data}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <Download size={16} />
                  {t.export}
                  <ChevronDown size={14} />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={handleExportCSV}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileDown size={16} />
                      {t.exportCSV}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Custom Date Picker */}
          {showCustomDatePicker && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t.from}</label>
                  <input
                    type="date"
                    value={filters.customStart?.toISOString().split('T')[0] || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        customStart: new Date(e.target.value),
                      }))
                    }
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t.to}</label>
                  <input
                    type="date"
                    value={filters.customEnd?.toISOString().split('T')[0] || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        customEnd: new Date(e.target.value),
                      }))
                    }
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={() => {
                    handleFilterChange('period', 'custom');
                    setShowCustomDatePicker(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  {t.apply}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Metrics Section */}
        <div>
          <SectionHeader title={t.userMetrics} icon={<Users size={20} className="text-blue-600" />} />

          {/* User KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <KPICard
              title={t.dauFull}
              value={data?.dau.current || 0}
              trend={data?.dau.trend}
              icon={<Users size={24} className="text-blue-600" />}
              iconBgColor="bg-blue-100"
              loading={isLoading}
              subtitle={t.dau}
            />
            <KPICard
              title={t.wauFull}
              value={data?.wau.current || 0}
              trend={data?.wau.trend}
              icon={<Activity size={24} className="text-green-600" />}
              iconBgColor="bg-green-100"
              loading={isLoading}
              subtitle={t.wau}
            />
            <KPICard
              title={t.mauFull}
              value={data?.mau.current || 0}
              trend={data?.mau.trend}
              icon={<TrendingUp size={24} className="text-purple-600" />}
              iconBgColor="bg-purple-100"
              loading={isLoading}
              subtitle={t.mau}
            />
          </div>

          {/* User Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New Registrations Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserPlus size={20} className="text-blue-600" />
                {t.newRegistrations}
              </h3>
              {isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={data?.newRegistrations || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                      formatter={(value, name) => [value, name === 'clients' ? t.clients : t.providers]}
                    />
                    <Legend />
                    <Bar dataKey="clients" name={t.clients} fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="providers" name={t.providers} fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Users by Country */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe size={20} className="text-cyan-600" />
                {t.usersByCountry}
              </h3>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {(data?.usersByCountry || []).map((country, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CountryFlag code={country.countryCode} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{country.country}</span>
                          <span className="text-sm text-gray-600">{formatNumber(country.value)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${country.percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">
                        {country.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call Metrics Section */}
        <div>
          <SectionHeader title={t.callMetrics} icon={<Phone size={20} className="text-green-600" />} />

          {/* Call KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <KPICard
              title={t.totalCalls}
              value={data?.totalCalls.current || 0}
              trend={data?.totalCalls.trend}
              icon={<Phone size={24} className="text-green-600" />}
              iconBgColor="bg-green-100"
              loading={isLoading}
            />
            <KPICard
              title={t.successRate}
              value={`${(data?.successRate.current || 0).toFixed(1)}%`}
              trend={data?.successRate.trend}
              icon={<CheckCircle size={24} className="text-blue-600" />}
              iconBgColor="bg-blue-100"
              loading={isLoading}
            />
            <KPICard
              title={t.avgDuration}
              value={`${(data?.avgDuration.current || 0).toFixed(1)} ${t.minutes}`}
              trend={data?.avgDuration.trend}
              icon={<Clock size={24} className="text-orange-600" />}
              iconBgColor="bg-orange-100"
              loading={isLoading}
            />
          </div>

          {/* Call Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calls Over Time */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.callsOverTime}</h3>
              {isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={data?.callsOverTime || []}>
                    <defs>
                      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                      formatter={(value) => [value, t.calls]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={COLORS.success}
                      strokeWidth={2}
                      fill="url(#colorCalls)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Call Status Distribution */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.callStatus}</h3>
              {isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
              ) : data?.callStatusDistribution && data.callStatusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={data.callStatusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {data.callStatusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, t.calls]} />
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  {t.noData}
                </div>
              )}
            </div>
          </div>

          {/* Peak Hours Chart */}
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.peakHours}</h3>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data?.peakHours || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                    formatter={(value) => [value, t.calls]}
                  />
                  <Bar dataKey="value" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue Metrics Section */}
        <div>
          <SectionHeader title={t.revenueMetrics} icon={<DollarSign size={20} className="text-red-600" />} />

          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <KPICard
              title={t.totalRevenue}
              value={formatCurrency(data?.totalRevenue.current || 0)}
              trend={data?.totalRevenue.trend}
              icon={<DollarSign size={24} className="text-red-600" />}
              iconBgColor="bg-red-100"
              loading={isLoading}
            />
            <KPICard
              title={t.platformFees}
              value={formatCurrency(data?.platformFees.current || 0)}
              trend={data?.platformFees.trend}
              icon={<TrendingUp size={24} className="text-green-600" />}
              iconBgColor="bg-green-100"
              loading={isLoading}
            />
            <KPICard
              title={t.providerPayouts}
              value={formatCurrency(data?.providerPayouts.current || 0)}
              trend={data?.providerPayouts.trend}
              icon={<Briefcase size={24} className="text-purple-600" />}
              iconBgColor="bg-purple-100"
              loading={isLoading}
            />
          </div>

          {/* Revenue Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Over Time */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.revenueOverTime}</h3>
              {isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data?.revenueOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9CA3AF"
                      tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                      formatter={(value) => [formatCurrency(typeof value === 'number' ? value : 0), t.revenue]}
                    />
                    <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Revenue by Service Type */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.revenueByService}</h3>
              {isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
              ) : data?.revenueByServiceType && data.revenueByServiceType.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={data.revenueByServiceType}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {data.revenueByServiceType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(typeof value === 'number' ? value : 0), t.revenue]} />
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  {t.noData}
                </div>
              )}
            </div>
          </div>

          {/* Revenue by Country */}
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.revenueByCountry}</h3>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data?.revenueByCountry || []).map((country, index) => {
                  const maxAmount = data?.revenueByCountry?.[0]?.value || 1;
                  const percentage = (country.value / maxAmount) * 100;

                  return (
                    <div key={index} className="flex items-center gap-3">
                      <CountryFlag code={country.countryCode} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{country.country}</span>
                          <span className="text-sm text-gray-600">{formatCurrency(country.value)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Conversion Funnels Section */}
        <div>
          <SectionHeader title={t.conversionFunnels} icon={<ArrowRight size={20} className="text-purple-600" />} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FunnelChart
              data={data?.clientFunnel || []}
              title={t.clientFunnel}
              loading={isLoading}
            />
            <FunnelChart
              data={data?.providerFunnel || []}
              title={t.providerFunnel}
              loading={isLoading}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUnifiedAnalytics;
