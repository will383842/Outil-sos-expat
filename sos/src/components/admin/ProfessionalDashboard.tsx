// src/components/admin/ProfessionalDashboard.tsx
// Professional Dashboard with comprehensive business metrics
// =============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
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
  RadialBarChart,
  RadialBar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Phone,
  DollarSign,
  Globe,
  RefreshCw,
  UserPlus,
  Briefcase,
  Scale,
  CreditCard,
  CheckCircle,
  Clock,
  Languages,
  Activity,
  Target,
  Percent,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { fetchWithCache } from '../../utils/firestoreCache';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ChartDataPoint {
  date: string;
  label: string;
  value: number;
  [key: string]: string | number;
}

interface PieDataPoint {
  name: string;
  value: number;
  color: string;
  percentage: number;
  fill?: string;
  [key: string]: string | number | undefined;
}

interface FilterState {
  period: 'today' | 'week' | 'month' | 'year' | 'custom';
  dateRange?: { start: Date; end: Date };
  country: string;
  role: string;
  paymentMethod: string;
}

interface DashboardMetrics {
  // Total users (cumulative)
  totalUsers: number;
  totalUsersByRole: Record<string, number>;

  // New registrations
  newRegistrations: number;
  newRegistrationsByRole: Record<string, number>;
  registrationTrend: ChartDataPoint[];

  // Active/Connected users
  activeUsers: number;
  activeUsersByRole: Record<string, number>;
  activeUsersPercentage: number;
  activeUsersTrend: ChartDataPoint[];

  // Revenue
  totalRevenue: number;
  revenueByCountry: PieDataPoint[];
  revenueByPaymentMethod: PieDataPoint[];
  revenueTrend: ChartDataPoint[];
  platformCommission: number;
  providerRevenue: number;

  // Calls
  totalCalls: number;
  successfulCalls: number;
  successRate: number;
  avgCallDuration: number;
  callsByCountry: PieDataPoint[];
  callsByLanguage: PieDataPoint[];
  callsByProviderType: PieDataPoint[];
  callsTrend: ChartDataPoint[];

  // Comparisons
  userGrowth: number;
  revenueGrowth: number;
  callsGrowth: number;
}

// ============================================================================
// CONSTANTS & COLORS
// ============================================================================

const PREMIUM_COLORS = {
  primary: '#DC2626',
  secondary: '#2563EB',
  success: '#10B981',
  warning: '#F59E0B',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
  orange: '#F97316',
  indigo: '#6366F1',
  emerald: '#059669',
};

const CHART_COLORS = [
  PREMIUM_COLORS.primary,
  PREMIUM_COLORS.secondary,
  PREMIUM_COLORS.success,
  PREMIUM_COLORS.warning,
  PREMIUM_COLORS.purple,
  PREMIUM_COLORS.pink,
  PREMIUM_COLORS.cyan,
  PREMIUM_COLORS.orange,
  PREMIUM_COLORS.indigo,
  PREMIUM_COLORS.emerald,
];

const ROLE_COLORS: Record<string, string> = {
  client: PREMIUM_COLORS.secondary,
  lawyer: PREMIUM_COLORS.primary,
  expat: PREMIUM_COLORS.success,
  chatter: PREMIUM_COLORS.purple,
  influencer: PREMIUM_COLORS.pink,
  blogger: PREMIUM_COLORS.orange,
  admin: PREMIUM_COLORS.indigo,
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  stripe: '#635BFF',
  paypal: '#003087',
  other: PREMIUM_COLORS.warning,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDateRange = (period: FilterState['period'], customRange?: { start: Date; end: Date }): { start: Date; end: Date } => {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (period) {
    case 'today':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
        end: endOfDay,
      };
    case 'week': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      return { start: weekStart, end: endOfDay };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart, end: endOfDay };
    }
    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { start: yearStart, end: endOfDay };
    }
    case 'custom':
      return customRange || { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay };
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay };
  }
};

const getPreviousPeriodRange = (period: FilterState['period'], currentRange: { start: Date; end: Date }): { start: Date; end: Date } => {
  const duration = currentRange.end.getTime() - currentRange.start.getTime();
  return {
    start: new Date(currentRange.start.getTime() - duration),
    end: new Date(currentRange.start.getTime() - 1),
  };
};

const formatDateLabel = (date: Date, period: FilterState['period']): string => {
  if (period === 'today') {
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

const groupByDate = (
  items: { date: Date; value: number }[],
  period: FilterState['period'],
  range: { start: Date; end: Date }
): ChartDataPoint[] => {
  const grouped = new Map<string, number>();

  // Determine grouping interval
  const getKey = (date: Date): string => {
    if (period === 'today') {
      return `${date.getHours()}:00`;
    }
    if (period === 'year') {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    return date.toISOString().split('T')[0];
  };

  // Initialize all time slots
  const current = new Date(range.start);
  while (current <= range.end) {
    const key = getKey(current);
    grouped.set(key, 0);

    if (period === 'today') {
      current.setHours(current.getHours() + 1);
    } else if (period === 'year') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  // Add actual values
  items.forEach((item) => {
    if (item.date >= range.start && item.date <= range.end) {
      const key = getKey(item.date);
      grouped.set(key, (grouped.get(key) || 0) + item.value);
    }
  });

  // Convert to array
  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateStr, value]) => {
      let displayDate: Date;
      if (period === 'today') {
        const [hour] = dateStr.split(':');
        displayDate = new Date();
        displayDate.setHours(parseInt(hour), 0, 0, 0);
      } else if (period === 'year') {
        const [year, month] = dateStr.split('-');
        displayDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      } else {
        displayDate = new Date(dateStr);
      }
      return {
        date: dateStr,
        label: formatDateLabel(displayDate, period),
        value,
      };
    });
};

const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Hero KPI Card with glassmorphism effect
interface HeroKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: React.ReactNode;
  colorClass: string;
  isLoading?: boolean;
}

const HeroKPICard: React.FC<HeroKPICardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  colorClass,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl border border-white/20 shadow-xl shadow-gray-200/50 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
          <div className="h-10 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-xl border border-white/20 shadow-xl shadow-gray-200/50 p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
      {/* Background gradient decoration */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${colorClass} opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`}></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</span>
          <div className={`p-2 rounded-xl ${colorClass} bg-opacity-10`}>
            {icon}
          </div>
        </div>

        <div className={`text-3xl font-bold ${colorClass.replace('bg-', 'text-')} mb-1`}>
          {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
        </div>

        {(subtitle || change !== undefined) && (
          <div className="flex items-center gap-2 text-sm">
            {change !== undefined && (
              <span className={`flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            )}
            {subtitle && <span className="text-gray-400">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

// Chart Card Container
interface ChartCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300 ${className}`}>
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      {icon}
      {title}
    </h3>
    {children}
  </div>
);

// Custom Tooltip for charts
const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  formatter?: (value: number) => string;
}> = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3">
      <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            {formatter ? formatter(entry.value) : entry.value.toLocaleString('fr-FR')}
          </span>
        </div>
      ))}
    </div>
  );
};

// Gauge Chart for success rate
interface GaugeChartProps {
  value: number;
  target?: number;
  label: string;
}

const GaugeChart: React.FC<GaugeChartProps> = ({ value, target = 90, label }) => {
  const data = [
    { name: label, value, fill: value >= target ? PREMIUM_COLORS.success : value >= 70 ? PREMIUM_COLORS.warning : PREMIUM_COLORS.primary },
  ];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="100%"
          barSize={20}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar
            background={{ fill: '#E5E7EB' }}
            dataKey="value"
            cornerRadius={10}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="text-4xl font-bold text-gray-900">{value.toFixed(1)}%</span>
        <span className="text-sm text-gray-500">Objectif: {target}%</span>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ProfessionalDashboard: React.FC = () => {
  const intl = useIntl();
  const mountedRef = useRef(true);

  // State
  const [filters, setFilters] = useState<FilterState>({
    period: 'month',
    country: 'all',
    role: 'all',
    paymentMethod: 'all',
  });

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);

  // Load countries for filter
  const loadCountries = useCallback(async () => {
    try {
      const countriesList = await fetchWithCache(
        'COUNTRIES',
        undefined,
        async () => {
          const countriesSnapshot = await getDocs(collection(db, 'countries'));
          return countriesSnapshot.docs
            .map((doc) => ({
              code: doc.id,
              name: (doc.data().name as string) || doc.id,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        }
      );
      if (mountedRef.current) {
        setCountries(countriesList);
      }
    } catch (err) {
      console.error('[ProfessionalDashboard] Error loading countries:', err);
    }
  }, []);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const dateRange = getDateRange(filters.period, filters.dateRange);
      const prevRange = getPreviousPeriodRange(filters.period, dateRange);

      const startTimestamp = Timestamp.fromDate(dateRange.start);
      const prevStartTimestamp = Timestamp.fromDate(prevRange.start);
      const prevEndTimestamp = Timestamp.fromDate(prevRange.end);

      // ========================================
      // QUERY 1: Total Users (Cumulative)
      // ========================================
      const totalUsersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['client', 'lawyer', 'expat', 'chatter', 'influencer', 'blogger'])
      );

      // ========================================
      // QUERY 2: New Registrations (Period)
      // ========================================
      const newUsersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', startTimestamp),
        orderBy('createdAt', 'desc')
      );

      // ========================================
      // QUERY 3: Previous Period New Registrations
      // ========================================
      const prevNewUsersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', prevStartTimestamp),
        where('createdAt', '<=', prevEndTimestamp),
        orderBy('createdAt', 'desc')
      );

      // ========================================
      // QUERY 4: Active Users (via lastLoginAt)
      // ========================================
      const activeUsersQuery = query(
        collection(db, 'users'),
        where('lastLoginAt', '>=', startTimestamp)
      );

      // ========================================
      // QUERY 5: Payments (Period)
      // ========================================
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('status', '==', 'captured'),
        where('createdAt', '>=', startTimestamp),
        orderBy('createdAt', 'desc')
      );

      // ========================================
      // QUERY 6: Previous Period Payments
      // ========================================
      const prevPaymentsQuery = query(
        collection(db, 'payments'),
        where('status', '==', 'captured'),
        where('createdAt', '>=', prevStartTimestamp),
        where('createdAt', '<=', prevEndTimestamp)
      );

      // ========================================
      // QUERY 7: Call Sessions (Period)
      // ========================================
      const callsQuery = query(
        collection(db, 'call_sessions'),
        where('metadata.createdAt', '>=', startTimestamp),
        orderBy('metadata.createdAt', 'desc')
      );

      // ========================================
      // QUERY 8: Previous Period Calls
      // ========================================
      const prevCallsQuery = query(
        collection(db, 'call_sessions'),
        where('metadata.createdAt', '>=', prevStartTimestamp),
        where('metadata.createdAt', '<=', prevEndTimestamp)
      );

      // Execute all queries in parallel
      const [
        totalUsersSnapshot,
        newUsersSnapshot,
        prevNewUsersSnapshot,
        activeUsersSnapshot,
        paymentsSnapshot,
        prevPaymentsSnapshot,
        callsSnapshot,
        prevCallsSnapshot,
      ] = await Promise.all([
        getDocs(totalUsersQuery),
        getDocs(newUsersQuery),
        getDocs(prevNewUsersQuery),
        getDocs(activeUsersQuery),
        getDocs(paymentsQuery),
        getDocs(prevPaymentsQuery),
        getDocs(callsQuery),
        getDocs(prevCallsQuery),
      ]);

      if (!mountedRef.current) return;

      // ========================================
      // PROCESS TOTAL USERS
      // ========================================
      let totalUsers = 0;
      const totalUsersByRole: Record<string, number> = {};

      totalUsersSnapshot.forEach((doc) => {
        const data = doc.data();
        const role = (data.role as string) || 'client';
        const country = data.country as string | undefined;

        // Apply country filter if set
        if (filters.country !== 'all' && country !== filters.country) return;
        // Apply role filter if set
        if (filters.role !== 'all' && role !== filters.role) return;

        totalUsers++;
        totalUsersByRole[role] = (totalUsersByRole[role] || 0) + 1;
      });

      // ========================================
      // PROCESS NEW REGISTRATIONS
      // ========================================
      let newRegistrations = 0;
      const newRegistrationsByRole: Record<string, number> = {};
      const registrationItems: { date: Date; value: number }[] = [];

      newUsersSnapshot.forEach((doc) => {
        const data = doc.data();
        const role = (data.role as string) || 'client';
        const country = data.country as string | undefined;
        const createdAt = data.createdAt?.toDate?.() || new Date();

        // Apply filters
        if (filters.country !== 'all' && country !== filters.country) return;
        if (filters.role !== 'all' && role !== filters.role) return;

        newRegistrations++;
        newRegistrationsByRole[role] = (newRegistrationsByRole[role] || 0) + 1;
        registrationItems.push({ date: createdAt, value: 1 });
      });

      const registrationTrend = groupByDate(registrationItems, filters.period, dateRange);

      // Previous period for comparison
      let prevNewRegistrations = 0;
      prevNewUsersSnapshot.forEach((doc) => {
        const data = doc.data();
        const country = data.country as string | undefined;
        const role = (data.role as string) || 'client';

        if (filters.country !== 'all' && country !== filters.country) return;
        if (filters.role !== 'all' && role !== filters.role) return;

        prevNewRegistrations++;
      });

      // ========================================
      // PROCESS ACTIVE USERS
      // ========================================
      let activeUsers = 0;
      const activeUsersByRole: Record<string, number> = {};
      const activeUsersItems: { date: Date; value: number }[] = [];

      activeUsersSnapshot.forEach((doc) => {
        const data = doc.data();
        const role = (data.role as string) || 'client';
        const country = data.country as string | undefined;
        const lastLoginAt = data.lastLoginAt?.toDate?.() || new Date();

        if (filters.country !== 'all' && country !== filters.country) return;
        if (filters.role !== 'all' && role !== filters.role) return;

        activeUsers++;
        activeUsersByRole[role] = (activeUsersByRole[role] || 0) + 1;
        activeUsersItems.push({ date: lastLoginAt, value: 1 });
      });

      const activeUsersTrend = groupByDate(activeUsersItems, filters.period, dateRange);
      const activeUsersPercentage = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

      // ========================================
      // PROCESS PAYMENTS/REVENUE
      // ========================================
      let totalRevenue = 0;
      let platformCommission = 0;
      let providerRevenue = 0;
      const revenueByCountryMap = new Map<string, number>();
      const revenueByPaymentMethodMap = new Map<string, number>();
      const revenueItems: { date: Date; value: number }[] = [];

      paymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        const amount = (data.amount as number) || 0;
        const country = (data.countryCode as string) || (data.country as string) || 'Unknown';
        const paymentMethod = (data.paymentMethod as string) || (data.provider as string) || 'other';
        const createdAt = data.createdAt?.toDate?.() || new Date();
        const commission = ((data.platformFee || data.connectionFeeAmount || data.commissionAmount) as number) || 0;
        const providerAmount = (data.providerAmount as number) || 0;

        // Apply payment method filter
        if (filters.paymentMethod !== 'all' && paymentMethod.toLowerCase() !== filters.paymentMethod.toLowerCase()) return;

        totalRevenue += amount;
        platformCommission += commission;
        providerRevenue += providerAmount;

        revenueByCountryMap.set(country, (revenueByCountryMap.get(country) || 0) + amount);

        const normalizedMethod = paymentMethod.toLowerCase().includes('stripe') ? 'stripe'
          : paymentMethod.toLowerCase().includes('paypal') ? 'paypal' : 'other';
        revenueByPaymentMethodMap.set(normalizedMethod, (revenueByPaymentMethodMap.get(normalizedMethod) || 0) + amount);

        revenueItems.push({ date: createdAt, value: amount });
      });

      const revenueTrend = groupByDate(revenueItems, filters.period, dateRange);

      // Revenue by country (Top 10)
      const revenueByCountry: PieDataPoint[] = Array.from(revenueByCountryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value], index) => ({
          name,
          value,
          color: CHART_COLORS[index % CHART_COLORS.length],
          percentage: totalRevenue > 0 ? (value / totalRevenue) * 100 : 0,
        }));

      // Revenue by payment method
      const revenueByPaymentMethod: PieDataPoint[] = Array.from(revenueByPaymentMethodMap.entries())
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: PAYMENT_METHOD_COLORS[name] || PREMIUM_COLORS.warning,
          percentage: totalRevenue > 0 ? (value / totalRevenue) * 100 : 0,
        }));

      // Previous period revenue
      let prevTotalRevenue = 0;
      prevPaymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        const amount = (data.amount as number) || 0;
        const paymentMethod = (data.paymentMethod as string) || (data.provider as string) || 'other';

        if (filters.paymentMethod !== 'all' && paymentMethod.toLowerCase() !== filters.paymentMethod.toLowerCase()) return;

        prevTotalRevenue += amount;
      });

      // ========================================
      // PROCESS CALLS
      // ========================================
      let totalCalls = 0;
      let successfulCalls = 0;
      let totalDuration = 0;
      const callsByCountryMap = new Map<string, number>();
      const callsByLanguageMap = new Map<string, number>();
      const callsByProviderTypeMap = new Map<string, number>();
      const callsItems: { date: Date; value: number }[] = [];

      callsSnapshot.forEach((doc) => {
        const data = doc.data();
        const status = (data.status as string) || 'unknown';
        const duration = (data.duration as number) || 0;
        const createdAt = data.metadata?.createdAt?.toDate?.() || data.createdAt?.toDate?.() || new Date();
        const country = (data.metadata?.country as string) || (data.providerCountry as string) || 'Unknown';
        const language = (data.metadata?.language as string) || (data.language as string) || 'Unknown';
        const providerType = (data.providerType as string) || (data.metadata?.providerType as string) || 'Unknown';

        totalCalls++;
        if (status === 'completed' || status === 'ended') {
          successfulCalls++;
          totalDuration += duration;
        }

        callsByCountryMap.set(country, (callsByCountryMap.get(country) || 0) + 1);
        callsByLanguageMap.set(language, (callsByLanguageMap.get(language) || 0) + 1);
        callsByProviderTypeMap.set(providerType, (callsByProviderTypeMap.get(providerType) || 0) + 1);
        callsItems.push({ date: createdAt, value: 1 });
      });

      const callsTrend = groupByDate(callsItems, filters.period, dateRange);
      const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
      const avgCallDuration = successfulCalls > 0 ? totalDuration / successfulCalls : 0;

      // Calls by country (Top 10)
      const callsByCountry: PieDataPoint[] = Array.from(callsByCountryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value], index) => ({
          name,
          value,
          color: CHART_COLORS[index % CHART_COLORS.length],
          percentage: totalCalls > 0 ? (value / totalCalls) * 100 : 0,
        }));

      // Calls by language
      const callsByLanguage: PieDataPoint[] = Array.from(callsByLanguageMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value], index) => ({
          name,
          value,
          color: CHART_COLORS[index % CHART_COLORS.length],
          percentage: totalCalls > 0 ? (value / totalCalls) * 100 : 0,
        }));

      // Calls by provider type
      const callsByProviderType: PieDataPoint[] = Array.from(callsByProviderTypeMap.entries())
        .map(([name, value]) => ({
          name: name === 'lawyer' ? 'Avocats' : name === 'expat' ? 'Expatriés' : name,
          value,
          color: ROLE_COLORS[name] || PREMIUM_COLORS.warning,
          percentage: totalCalls > 0 ? (value / totalCalls) * 100 : 0,
        }));

      // Previous period calls
      let prevTotalCalls = 0;
      prevCallsSnapshot.forEach(() => {
        prevTotalCalls++;
      });

      // ========================================
      // CALCULATE GROWTH METRICS
      // ========================================
      const userGrowth = calculatePercentageChange(newRegistrations, prevNewRegistrations);
      const revenueGrowth = calculatePercentageChange(totalRevenue, prevTotalRevenue);
      const callsGrowth = calculatePercentageChange(totalCalls, prevTotalCalls);

      // ========================================
      // SET FINAL METRICS
      // ========================================
      if (!mountedRef.current) return;

      setMetrics({
        totalUsers,
        totalUsersByRole,
        newRegistrations,
        newRegistrationsByRole,
        registrationTrend,
        activeUsers,
        activeUsersByRole,
        activeUsersPercentage,
        activeUsersTrend,
        totalRevenue,
        revenueByCountry,
        revenueByPaymentMethod,
        revenueTrend,
        platformCommission,
        providerRevenue,
        totalCalls,
        successfulCalls,
        successRate,
        avgCallDuration,
        callsByCountry,
        callsByLanguage,
        callsByProviderType,
        callsTrend,
        userGrowth,
        revenueGrowth,
        callsGrowth,
      });

    } catch (err) {
      console.error('[ProfessionalDashboard] Error loading data:', err);
      if (mountedRef.current) {
        setError(intl.formatMessage({ id: 'admin.professionalDashboard.error', defaultMessage: 'Erreur lors du chargement des données' }));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters, intl]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    loadCountries();
    return () => {
      mountedRef.current = false;
    };
  }, [loadCountries]);

  // Load data when filters change
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Filter handlers
  const handlePeriodChange = (period: FilterState['period']) => {
    setFilters((prev) => ({ ...prev, period }));
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  // Role distribution for donut chart
  const roleDistribution = useMemo(() => {
    if (!metrics) return [];
    return Object.entries(metrics.newRegistrationsByRole)
      .map(([role, count]) => ({
        name: role === 'client' ? 'Clients' : role === 'lawyer' ? 'Avocats' : role === 'expat' ? 'Expatriés' : role.charAt(0).toUpperCase() + role.slice(1),
        value: count,
        color: ROLE_COLORS[role] || PREMIUM_COLORS.warning,
        percentage: metrics.newRegistrations > 0 ? (count / metrics.newRegistrations) * 100 : 0,
      }));
  }, [metrics]);

  // Active users by role for horizontal bar
  const activeUsersByRoleData = useMemo(() => {
    if (!metrics) return [];
    return Object.entries(metrics.activeUsersByRole)
      .map(([role, count]) => ({
        name: role === 'client' ? 'Clients' : role === 'lawyer' ? 'Avocats' : role === 'expat' ? 'Expatriés' : role.charAt(0).toUpperCase() + role.slice(1),
        value: count,
        percentage: metrics.totalUsersByRole[role] > 0 ? (count / metrics.totalUsersByRole[role]) * 100 : 0,
        fill: ROLE_COLORS[role] || PREMIUM_COLORS.warning,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [metrics]);

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ================================================================== */}
      {/* FILTERS SECTION */}
      {/* ================================================================== */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* Period Tabs */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            {[
              { key: 'today', label: intl.formatMessage({ id: 'admin.dashboard.professional.filters.today' }) },
              { key: 'week', label: intl.formatMessage({ id: 'admin.dashboard.professional.filters.week' }) },
              { key: 'month', label: intl.formatMessage({ id: 'admin.dashboard.professional.filters.month' }) },
              { key: 'year', label: intl.formatMessage({ id: 'admin.dashboard.professional.filters.year' }) },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePeriodChange(key as FilterState['period'])}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filters.period === key
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-gray-200 hidden sm:block" />

          {/* Country Filter */}
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-gray-400" />
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange('country', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
            >
              <option value="all">{intl.formatMessage({ id: 'admin.dashboard.professional.filters.allCountries' })}</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
            >
              <option value="all">{intl.formatMessage({ id: 'admin.dashboard.professional.filters.allRoles' })}</option>
              <option value="client">{intl.formatMessage({ id: 'admin.dashboard.professional.roles.client' })}</option>
              <option value="lawyer">{intl.formatMessage({ id: 'admin.dashboard.professional.roles.lawyer' })}</option>
              <option value="expat">{intl.formatMessage({ id: 'admin.dashboard.professional.roles.expat' })}</option>
              <option value="chatter">{intl.formatMessage({ id: 'admin.dashboard.professional.roles.chatter' })}</option>
              <option value="influencer">{intl.formatMessage({ id: 'admin.dashboard.professional.roles.influencer' })}</option>
              <option value="blogger">{intl.formatMessage({ id: 'admin.dashboard.professional.roles.blogger' })}</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-gray-400" />
            <select
              value={filters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
            >
              <option value="all">{intl.formatMessage({ id: 'admin.dashboard.professional.filters.allMethods' })}</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            {intl.formatMessage({ id: 'admin.dashboard.professional.filters.refresh' })}
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* HERO KPI SECTION */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <HeroKPICard
          title={intl.formatMessage({ id: 'admin.dashboard.professional.kpi.totalUsers' })}
          value={metrics?.totalUsers || 0}
          subtitle={intl.formatMessage({ id: 'admin.dashboard.professional.kpi.newThisPeriod' }, { count: metrics?.newRegistrations || 0 })}
          icon={<Users size={20} className="text-blue-600" />}
          colorClass="bg-blue-600"
          isLoading={isLoading}
        />
        <HeroKPICard
          title={intl.formatMessage({ id: 'admin.dashboard.professional.kpi.connected' })}
          value={metrics?.activeUsers || 0}
          subtitle={intl.formatMessage({ id: 'admin.dashboard.professional.kpi.percentOfTotal' }, { percentage: (metrics?.activeUsersPercentage ?? 0).toFixed(1) })}
          change={metrics?.userGrowth}
          icon={<Activity size={20} className="text-green-600" />}
          colorClass="bg-green-600"
          isLoading={isLoading}
        />
        <HeroKPICard
          title={intl.formatMessage({ id: 'admin.dashboard.professional.kpi.revenueThisMonth' })}
          value={`${(metrics?.totalRevenue || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`}
          change={metrics?.revenueGrowth}
          icon={<DollarSign size={20} className="text-red-600" />}
          colorClass="bg-red-600"
          isLoading={isLoading}
        />
        <HeroKPICard
          title={intl.formatMessage({ id: 'admin.dashboard.professional.kpi.successfulCalls' })}
          value={metrics?.successfulCalls || 0}
          subtitle={intl.formatMessage({ id: 'admin.dashboard.professional.kpi.outOfCalls' }, { count: metrics?.totalCalls || 0 })}
          change={metrics?.callsGrowth}
          icon={<Phone size={20} className="text-purple-600" />}
          colorClass="bg-purple-600"
          isLoading={isLoading}
        />
        <HeroKPICard
          title={intl.formatMessage({ id: 'admin.dashboard.professional.kpi.successRate' })}
          value={`${(metrics?.successRate || 0).toFixed(1)}%`}
          icon={<Target size={20} className="text-amber-600" />}
          colorClass="bg-amber-600"
          isLoading={isLoading}
        />
        <HeroKPICard
          title={intl.formatMessage({ id: 'admin.dashboard.professional.kpi.avgDuration' })}
          value={intl.formatMessage({ id: 'admin.dashboard.professional.kpi.minutes' }, { minutes: Math.round((metrics?.avgCallDuration || 0) / 60) })}
          icon={<Clock size={20} className="text-cyan-600" />}
          colorClass="bg-cyan-600"
          isLoading={isLoading}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm font-medium text-gray-500">{intl.formatMessage({ id: 'admin.dashboard.professional.kpi.platformCommission' })}</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {(metrics?.platformCommission || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm font-medium text-gray-500">{intl.formatMessage({ id: 'admin.dashboard.professional.kpi.providerRevenue' })}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {(metrics?.providerRevenue || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-sm font-medium text-gray-500">{intl.formatMessage({ id: 'admin.dashboard.professional.kpi.newRegistrations' })}</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {metrics?.newRegistrations || 0}
            <span className="text-sm font-normal text-gray-400 ml-2">{intl.formatMessage({ id: 'admin.dashboard.professional.kpi.thisPeriod' })}</span>
          </p>
        </div>
      </div>

      {!isLoading && metrics && (
        <>
          {/* ================================================================== */}
          {/* REGISTRATIONS SECTION */}
          {/* ================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New Registrations Trend */}
            <ChartCard
              title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.newRegistrations' })}
              icon={<UserPlus size={20} className="text-blue-600" />}
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.registrationTrend}>
                  <defs>
                    <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PREMIUM_COLORS.secondary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PREMIUM_COLORS.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name={intl.formatMessage({ id: 'admin.dashboard.professional.charts.registered' })}
                    stroke={PREMIUM_COLORS.secondary}
                    strokeWidth={2}
                    fill="url(#colorRegistrations)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Role Distribution */}
            <ChartCard
              title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.roleDistribution' })}
              icon={<Briefcase size={20} className="text-purple-600" />}
            >
              {roleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => {
                        const numValue = typeof value === 'number' ? value : 0;
                        const pct = metrics.newRegistrations > 0 ? ((numValue / metrics.newRegistrations) * 100).toFixed(1) : '0';
                        return [`${numValue} (${pct}%)`, String(name)];
                      }}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconType="circle"
                      iconSize={10}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  {intl.formatMessage({ id: 'admin.dashboard.professional.noData' })}
                </div>
              )}
            </ChartCard>
          </div>

          {/* ================================================================== */}
          {/* ACTIVE USERS SECTION */}
          {/* ================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Users Trend */}
            <ChartCard
              title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.connectedUsers' })}
              icon={<Activity size={20} className="text-green-600" />}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.activeUsersTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="value"
                    name={intl.formatMessage({ id: 'admin.dashboard.professional.kpi.connected' })}
                    fill={PREMIUM_COLORS.success}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Active Users by Role */}
            <ChartCard
              title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.connectionRateByRole' })}
              icon={<Percent size={20} className="text-indigo-600" />}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={activeUsersByRoleData}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" width={80} />
                  <Tooltip
                    formatter={(value) => [`${typeof value === 'number' ? value.toFixed(1) : '0'}%`, intl.formatMessage({ id: 'admin.dashboard.professional.charts.activeRate' })]}
                  />
                  <Bar dataKey="percentage" name={intl.formatMessage({ id: 'admin.dashboard.professional.charts.activeRate' })} radius={[0, 4, 4, 0]}>
                    {activeUsersByRoleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ================================================================== */}
          {/* REVENUE SECTION */}
          {/* ================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <ChartCard
              title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.revenue' })}
              icon={<DollarSign size={20} className="text-red-600" />}
            >
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={metrics.revenueTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PREMIUM_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PREMIUM_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip
                    content={<CustomTooltip formatter={(v) => `${v.toLocaleString('fr-FR')} €`} />}
                  />
                  <Bar dataKey="value" name={intl.formatMessage({ id: 'admin.dashboard.professional.charts.turnover' })} fill={PREMIUM_COLORS.primary} radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={intl.formatMessage({ id: 'admin.dashboard.professional.charts.trend' })}
                    stroke={PREMIUM_COLORS.indigo}
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Revenue by Country */}
            <ChartCard
              title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.revenueByCountry' })}
              icon={<Globe size={20} className="text-cyan-600" />}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={metrics.revenueByCountry}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" width={80} />
                  <Tooltip
                    formatter={(value) => [`${typeof value === 'number' ? value.toLocaleString('fr-FR') : '0'} €`, intl.formatMessage({ id: 'admin.dashboard.professional.charts.turnover' })]}
                  />
                  <Bar dataKey="value" name={intl.formatMessage({ id: 'admin.dashboard.professional.charts.turnover' })} radius={[0, 4, 4, 0]}>
                    {metrics.revenueByCountry.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Payment Methods */}
          <ChartCard
            title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.paymentMethodDistribution' })}
            icon={<CreditCard size={20} className="text-purple-600" />}
            className="col-span-full"
          >
            {metrics.revenueByPaymentMethod.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                <ResponsiveContainer width="100%" height={250} className="max-w-md">
                  <PieChart>
                    <Pie
                      data={metrics.revenueByPaymentMethod}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, payload }) => `${name}: ${((payload as PieDataPoint)?.percentage ?? 0).toFixed(1)}%`}
                    >
                      {metrics.revenueByPaymentMethod.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${typeof value === 'number' ? value.toLocaleString('fr-FR') : '0'} €`, intl.formatMessage({ id: 'admin.dashboard.professional.charts.turnover' })]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex flex-col gap-4">
                  {metrics.revenueByPaymentMethod.map((method) => (
                    <div key={method.name} className="flex items-center gap-4">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: method.color }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{method.name}</p>
                        <p className="text-sm text-gray-500">
                          {method.value.toLocaleString('fr-FR')} € ({method.percentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                {intl.formatMessage({ id: 'admin.dashboard.professional.noPayment' })}
              </div>
            )}
          </ChartCard>

          {/* ================================================================== */}
          {/* CALLS SECTION */}
          {/* ================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calls Trend */}
            <ChartCard
              title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.callVolume' })}
              icon={<Phone size={20} className="text-purple-600" />}
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.callsTrend}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PREMIUM_COLORS.purple} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PREMIUM_COLORS.purple} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name={intl.formatMessage({ id: 'admin.dashboard.professional.charts.calls' })}
                    stroke={PREMIUM_COLORS.purple}
                    strokeWidth={2}
                    fill="url(#colorCalls)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Success Rate Gauge */}
            <ChartCard
              title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.successRateGauge' })}
              icon={<CheckCircle size={20} className="text-green-600" />}
            >
              <GaugeChart
                value={metrics.successRate}
                target={90}
                label={intl.formatMessage({ id: 'admin.dashboard.professional.charts.successRateLabel' })}
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calls by Country */}
            <ChartCard
              title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.callsByCountry' })}
              icon={<Globe size={20} className="text-cyan-600" />}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={metrics.callsByCountry}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" name={intl.formatMessage({ id: 'admin.dashboard.professional.charts.calls' })} radius={[0, 4, 4, 0]}>
                    {metrics.callsByCountry.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Calls by Language */}
            <ChartCard
              title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.callsByLanguage' })}
              icon={<Languages size={20} className="text-pink-600" />}
            >
              {metrics.callsByLanguage.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.callsByLanguage}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {metrics.callsByLanguage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => {
                        const numValue = typeof value === 'number' ? value : 0;
                        const pct = metrics.totalCalls > 0 ? ((numValue / metrics.totalCalls) * 100).toFixed(1) : '0';
                        return [`${numValue} (${pct}%)`, String(name)];
                      }}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      iconType="circle"
                      iconSize={10}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-400">
                  {intl.formatMessage({ id: 'admin.dashboard.professional.noCall' })}
                </div>
              )}
            </ChartCard>
          </div>

          {/* Calls by Provider Type */}
          <ChartCard
            title={intl.formatMessage({ id: 'admin.dashboard.professional.charts.callsByProviderType' })}
            icon={<Scale size={20} className="text-indigo-600" />}
          >
            {metrics.callsByProviderType.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                <ResponsiveContainer width="100%" height={250} className="max-w-md">
                  <PieChart>
                    <Pie
                      data={metrics.callsByProviderType}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, payload }) => `${name}: ${((payload as PieDataPoint)?.percentage ?? 0).toFixed(1)}%`}
                    >
                      {metrics.callsByProviderType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex flex-col gap-4">
                  {metrics.callsByProviderType.map((type) => (
                    <div key={type.name} className="flex items-center gap-4">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{type.name}</p>
                        <p className="text-sm text-gray-500">
                          {intl.formatMessage({ id: 'admin.dashboard.professional.charts.callsCount' }, { count: type.value, percentage: type.percentage.toFixed(1) })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                {intl.formatMessage({ id: 'admin.dashboard.professional.noCall' })}
              </div>
            )}
          </ChartCard>
        </>
      )}

      {/* Loading skeleton for charts */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-72 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfessionalDashboard;
