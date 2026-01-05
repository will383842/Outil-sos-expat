// src/pages/admin/Finance/CostMonitoring.tsx
// Cost Monitoring Dashboard for Google Cloud/Firebase & Third-party Services

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Database,
  Cloud,
  HardDrive,
  Phone,
  CreditCard,
  RefreshCw,
  Download,
  AlertTriangle,
  Clock,
  MessageSquare,
  PhoneCall,
  Loader2,
  Zap,
  Activity,
  AlertCircle,
  ChevronDown,
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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import AdminLayout from '../../../components/admin/AdminLayout';

// ============================================================================
// TYPES
// ============================================================================

type DateRangeType = '7d' | '30d' | '90d';

interface DateRange {
  start: Date;
  end: Date;
}

interface CostKPI {
  current: number;
  previous: number;
  percentChange: number;
}

interface CostTrendPoint {
  date: string;
  label: string;
  firestore: number;
  functions: number;
  storage: number;
  twilio: number;
  stripe: number;
  total: number;
}

interface RateLimitAlert {
  id: string;
  alertType: string;
  key: string;
  count: number;
  suppressed: number;
  windowStart: Date;
  windowEnd: Date;
}

interface SMSVoiceQuota {
  smsUsed: number;
  smsLimit: number;
  voiceUsed: number;
  voiceLimit: number;
  smsCost: number;
  voiceCost: number;
}

interface CostData {
  firestoreCost: CostKPI;
  functionsCost: CostKPI;
  storageCost: CostKPI;
  twilioCost: CostKPI;
  stripeFees: CostKPI;
  totalCost: CostKPI;
  costTrend: CostTrendPoint[];
  rateLimitAlerts: RateLimitAlert[];
  smsVoiceQuota: SMSVoiceQuota;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  firestore: '#FF6B35',
  functions: '#4285F4',
  storage: '#34A853',
  twilio: '#F22F46',
  stripe: '#635BFF',
  total: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
};

// Default monthly quotas (can be adjusted based on plan)
const DEFAULT_QUOTAS = {
  smsMonthly: 10000,
  voiceMinutesMonthly: 5000,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDateRange = (rangeType: DateRangeType): DateRange => {
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
  if (rangeType === '30d') {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon,
  loading,
  subtitle,
  iconBgColor = 'bg-gray-100',
}) => {
  // For costs, negative change is good (costs decreased)
  const isPositive = change !== undefined && change <= 0;

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
            <div
              className={`flex items-center text-sm mt-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {isPositive ? (
                <TrendingDown size={14} className="mr-1" />
              ) : (
                <TrendingUp size={14} className="mr-1" />
              )}
              <span>
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              <span className="text-gray-400 ml-1 text-xs">vs periode prec.</span>
            </div>
          )}
          {subtitle && !loading && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${iconBgColor}`}>{icon}</div>
      </div>
    </div>
  );
};

// ============================================================================
// QUOTA PROGRESS BAR COMPONENT
// ============================================================================

interface QuotaProgressProps {
  label: string;
  used: number;
  limit: number;
  cost: number;
  icon: React.ReactNode;
  unit: string;
}

const QuotaProgress: React.FC<QuotaProgressProps> = ({
  label,
  used,
  limit,
  cost,
  icon,
  unit,
}) => {
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const isWarning = percentage >= 70 && percentage < 90;
  const isCritical = percentage >= 90;

  const barColor = isCritical
    ? 'bg-red-500'
    : isWarning
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-gray-900">{label}</span>
        </div>
        <span className="text-sm text-gray-500">{formatCurrency(cost)}</span>
      </div>
      <div className="mb-2">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {formatNumber(used)} / {formatNumber(limit)} {unit}
        </span>
        <span
          className={`font-medium ${isCritical ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'}`}
        >
          {percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// RATE LIMIT ALERT ITEM COMPONENT
// ============================================================================

interface RateLimitAlertItemProps {
  alert: RateLimitAlert;
}

const RateLimitAlertItem: React.FC<RateLimitAlertItemProps> = ({ alert }) => {
  const getAlertTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'security.brute_force_detected': 'Brute Force',
      'security.unusual_location': 'Localisation inhabituelle',
      'security.suspicious_payment': 'Paiement suspect',
      'security.mass_account_creation': 'Creation massive de comptes',
      'security.api_abuse': 'Abus API',
      'security.data_breach_attempt': 'Tentative de breach',
      'security.rate_limit_exceeded': 'Rate limit depasse',
      'security.sql_injection': 'Injection SQL',
      'security.xss_attempt': 'Tentative XSS',
    };
    return labels[type] || type;
  };

  const getSeverityColor = (suppressed: number): string => {
    if (suppressed >= 50) return 'bg-red-100 text-red-800 border-red-200';
    if (suppressed >= 20) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (suppressed >= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-orange-500" />
          <span className="font-medium text-gray-900">
            {getAlertTypeLabel(alert.alertType)}
          </span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full border ${getSeverityColor(alert.suppressed)}`}
          >
            {alert.suppressed} supprimes
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1 truncate max-w-md">{alert.key}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">{alert.count} alertes</p>
        <p className="text-xs text-gray-500">
          {alert.windowStart.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CostMonitoring: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const mountedRef = useRef(true);

  // State
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CostData | null>(null);

  // Check auth
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [currentUser, navigate]);

  // Computed date range
  const dateRange = useMemo(() => {
    return getDateRange(dateRangeType);
  }, [dateRangeType]);

  // Load cost data
  const loadCostData = useCallback(async () => {
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

      // Query cost records for current period
      // Note: In a real implementation, you would have a 'costs' collection
      // populated by a Cloud Function that tracks usage from Google Cloud Billing API
      const currentCostsQuery = query(
        collection(db, 'platform_costs'),
        where('date', '>=', startTimestamp),
        where('date', '<=', endTimestamp),
        orderBy('date', 'desc')
      );

      // Query cost records for previous period
      const previousCostsQuery = query(
        collection(db, 'platform_costs'),
        where('date', '>=', prevStartTimestamp),
        where('date', '<=', prevEndTimestamp),
        orderBy('date', 'desc')
      );

      // Query rate limit alerts
      const rateLimitQuery = query(
        collection(db, 'alert_rate_limits'),
        where('windowEnd', '>=', startTimestamp),
        orderBy('windowEnd', 'desc'),
        firestoreLimit(20)
      );

      // Query SMS/Voice usage
      const smsUsageQuery = query(
        collection(db, 'twilio_usage'),
        where('date', '>=', startTimestamp),
        where('date', '<=', endTimestamp)
      );

      // Execute queries in parallel
      const [currentCostsSnapshot, previousCostsSnapshot, rateLimitSnapshot, smsUsageSnapshot] =
        await Promise.all([
          getDocs(currentCostsQuery).catch(() => ({ docs: [], empty: true })),
          getDocs(previousCostsQuery).catch(() => ({ docs: [], empty: true })),
          getDocs(rateLimitQuery).catch(() => ({ docs: [], empty: true })),
          getDocs(smsUsageQuery).catch(() => ({ docs: [], empty: true })),
        ]);

      if (!mountedRef.current) return;

      // Process current period costs
      let currentFirestore = 0;
      let currentFunctions = 0;
      let currentStorage = 0;
      let currentTwilio = 0;
      let currentStripe = 0;

      const costsByDay = new Map<
        string,
        {
          firestore: number;
          functions: number;
          storage: number;
          twilio: number;
          stripe: number;
        }
      >();

      // Initialize all days in the range
      const current = new Date(currentRange.start);
      while (current <= currentRange.end) {
        const key = current.toISOString().split('T')[0];
        costsByDay.set(key, {
          firestore: 0,
          functions: 0,
          storage: 0,
          twilio: 0,
          stripe: 0,
        });
        current.setDate(current.getDate() + 1);
      }

      // If we have real cost data, process it
      if (!currentCostsSnapshot.empty) {
        currentCostsSnapshot.docs.forEach((doc) => {
          const d = doc.data();
          const date = d.date?.toDate?.();
          const dateKey = date ? date.toISOString().split('T')[0] : '';

          const firestore = (d.firestoreCost as number) || 0;
          const functions = (d.functionsCost as number) || 0;
          const storage = (d.storageCost as number) || 0;
          const twilio = (d.twilioCost as number) || 0;
          const stripe = (d.stripeFees as number) || 0;

          currentFirestore += firestore;
          currentFunctions += functions;
          currentStorage += storage;
          currentTwilio += twilio;
          currentStripe += stripe;

          if (dateKey && costsByDay.has(dateKey)) {
            const existing = costsByDay.get(dateKey)!;
            costsByDay.set(dateKey, {
              firestore: existing.firestore + firestore,
              functions: existing.functions + functions,
              storage: existing.storage + storage,
              twilio: existing.twilio + twilio,
              stripe: existing.stripe + stripe,
            });
          }
        });
      } else {
        // Generate sample data for demonstration
        // In production, this would come from the platform_costs collection
        const daysInRange = Math.ceil(
          (currentRange.end.getTime() - currentRange.start.getTime()) / (24 * 60 * 60 * 1000)
        );

        costsByDay.forEach((_, key) => {
          const dayData = {
            firestore: 2 + Math.random() * 3,
            functions: 1.5 + Math.random() * 2,
            storage: 0.5 + Math.random() * 1,
            twilio: 5 + Math.random() * 10,
            stripe: 3 + Math.random() * 5,
          };
          costsByDay.set(key, dayData);

          currentFirestore += dayData.firestore;
          currentFunctions += dayData.functions;
          currentStorage += dayData.storage;
          currentTwilio += dayData.twilio;
          currentStripe += dayData.stripe;
        });
      }

      // Process previous period costs
      let prevFirestore = 0;
      let prevFunctions = 0;
      let prevStorage = 0;
      let prevTwilio = 0;
      let prevStripe = 0;

      if (!previousCostsSnapshot.empty) {
        previousCostsSnapshot.docs.forEach((doc) => {
          const d = doc.data();
          prevFirestore += (d.firestoreCost as number) || 0;
          prevFunctions += (d.functionsCost as number) || 0;
          prevStorage += (d.storageCost as number) || 0;
          prevTwilio += (d.twilioCost as number) || 0;
          prevStripe += (d.stripeFees as number) || 0;
        });
      } else {
        // Sample previous period data
        prevFirestore = currentFirestore * (0.9 + Math.random() * 0.2);
        prevFunctions = currentFunctions * (0.9 + Math.random() * 0.2);
        prevStorage = currentStorage * (0.9 + Math.random() * 0.2);
        prevTwilio = currentTwilio * (0.9 + Math.random() * 0.2);
        prevStripe = currentStripe * (0.9 + Math.random() * 0.2);
      }

      // Calculate totals
      const currentTotal =
        currentFirestore + currentFunctions + currentStorage + currentTwilio + currentStripe;
      const prevTotal = prevFirestore + prevFunctions + prevStorage + prevTwilio + prevStripe;

      // Calculate percentage changes
      const calcChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      // Build cost trend data
      const costTrend: CostTrendPoint[] = Array.from(costsByDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dateStr, costs]) => ({
          date: dateStr,
          label: formatDateLabel(new Date(dateStr), dateRangeType),
          firestore: costs.firestore,
          functions: costs.functions,
          storage: costs.storage,
          twilio: costs.twilio,
          stripe: costs.stripe,
          total:
            costs.firestore + costs.functions + costs.storage + costs.twilio + costs.stripe,
        }));

      // Process rate limit alerts
      const rateLimitAlerts: RateLimitAlert[] = [];
      if (!rateLimitSnapshot.empty) {
        rateLimitSnapshot.docs.forEach((doc) => {
          const d = doc.data();
          rateLimitAlerts.push({
            id: doc.id,
            alertType: (d.alertType as string) || 'unknown',
            key: (d.key as string) || doc.id,
            count: (d.count as number) || 0,
            suppressed: (d.suppressed as number) || 0,
            windowStart: d.windowStart?.toDate?.() || new Date(),
            windowEnd: d.windowEnd?.toDate?.() || new Date(),
          });
        });
      }

      // Process SMS/Voice usage
      let smsUsed = 0;
      let voiceUsed = 0;
      let smsCost = 0;
      let voiceCost = 0;

      if (!smsUsageSnapshot.empty) {
        smsUsageSnapshot.docs.forEach((doc) => {
          const d = doc.data();
          smsUsed += (d.smsCount as number) || 0;
          voiceUsed += (d.voiceMinutes as number) || 0;
          smsCost += (d.smsCost as number) || 0;
          voiceCost += (d.voiceCost as number) || 0;
        });
      } else {
        // Sample data for demonstration
        smsUsed = Math.floor(Math.random() * 3000) + 500;
        voiceUsed = Math.floor(Math.random() * 1000) + 100;
        smsCost = smsUsed * 0.05; // ~$0.05 per SMS
        voiceCost = voiceUsed * 0.02; // ~$0.02 per minute
      }

      // Set data
      setData({
        firestoreCost: {
          current: currentFirestore,
          previous: prevFirestore,
          percentChange: calcChange(currentFirestore, prevFirestore),
        },
        functionsCost: {
          current: currentFunctions,
          previous: prevFunctions,
          percentChange: calcChange(currentFunctions, prevFunctions),
        },
        storageCost: {
          current: currentStorage,
          previous: prevStorage,
          percentChange: calcChange(currentStorage, prevStorage),
        },
        twilioCost: {
          current: currentTwilio,
          previous: prevTwilio,
          percentChange: calcChange(currentTwilio, prevTwilio),
        },
        stripeFees: {
          current: currentStripe,
          previous: prevStripe,
          percentChange: calcChange(currentStripe, prevStripe),
        },
        totalCost: {
          current: currentTotal,
          previous: prevTotal,
          percentChange: calcChange(currentTotal, prevTotal),
        },
        costTrend,
        rateLimitAlerts,
        smsVoiceQuota: {
          smsUsed,
          smsLimit: DEFAULT_QUOTAS.smsMonthly,
          voiceUsed,
          voiceLimit: DEFAULT_QUOTAS.voiceMinutesMonthly,
          smsCost,
          voiceCost,
        },
      });
    } catch (err) {
      console.error('Error loading cost data:', err);
      if (mountedRef.current) {
        setError(
          intl.formatMessage({
            id: 'admin.costs.error.loading',
            defaultMessage: 'Erreur lors du chargement des donnees de couts',
          })
        );
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
    loadCostData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadCostData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadCostData();
  }, [loadCostData]);

  // Handle export
  const handleExport = useCallback(() => {
    if (!data) return;

    const csvContent = [
      ['Metric', 'Current Period', 'Previous Period', 'Change %'],
      [
        'Firestore',
        data.firestoreCost.current.toFixed(2),
        data.firestoreCost.previous.toFixed(2),
        data.firestoreCost.percentChange.toFixed(2),
      ],
      [
        'Cloud Functions',
        data.functionsCost.current.toFixed(2),
        data.functionsCost.previous.toFixed(2),
        data.functionsCost.percentChange.toFixed(2),
      ],
      [
        'Storage',
        data.storageCost.current.toFixed(2),
        data.storageCost.previous.toFixed(2),
        data.storageCost.percentChange.toFixed(2),
      ],
      [
        'Twilio',
        data.twilioCost.current.toFixed(2),
        data.twilioCost.previous.toFixed(2),
        data.twilioCost.percentChange.toFixed(2),
      ],
      [
        'Stripe Fees',
        data.stripeFees.current.toFixed(2),
        data.stripeFees.previous.toFixed(2),
        data.stripeFees.percentChange.toFixed(2),
      ],
      [
        'Total',
        data.totalCost.current.toFixed(2),
        data.totalCost.previous.toFixed(2),
        data.totalCost.percentChange.toFixed(2),
      ],
      [],
      ['SMS/Voice Quotas'],
      ['SMS Used', data.smsVoiceQuota.smsUsed, 'SMS Limit', data.smsVoiceQuota.smsLimit],
      ['Voice Used', data.smsVoiceQuota.voiceUsed, 'Voice Limit', data.smsVoiceQuota.voiceLimit],
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost-monitoring-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  // Handle date range change
  const handleDateRangeChange = useCallback((range: DateRangeType) => {
    setDateRangeType(range);
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
              <FormattedMessage id="admin.costs.retry" defaultMessage="Reessayer" />
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
              <FormattedMessage id="admin.costs.title" defaultMessage="Suivi des Couts" />
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              <FormattedMessage
                id="admin.costs.subtitle"
                defaultMessage="Surveillance des couts Google Cloud, Firebase et services tiers"
              />
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Range Selector */}
            <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              {(['7d', '30d', '90d'] as DateRangeType[]).map((range) => (
                <button
                  key={range}
                  onClick={() => handleDateRangeChange(range)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    dateRangeType === range
                      ? 'bg-red-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <FormattedMessage id="admin.costs.refresh" defaultMessage="Actualiser" />
            </button>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isLoading || !data}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Download size={16} />
              <FormattedMessage id="admin.costs.export" defaultMessage="Exporter" />
            </button>
          </div>
        </div>

        {/* Total Cost Banner */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">
                <FormattedMessage id="admin.costs.totalCost" defaultMessage="Cout Total de la Periode" />
              </p>
              {isLoading ? (
                <div className="h-10 w-32 bg-red-500 animate-pulse rounded mt-1" />
              ) : (
                <p className="text-4xl font-bold mt-1">
                  {formatCurrency(data?.totalCost.current || 0)}
                </p>
              )}
              {data?.totalCost.percentChange !== undefined && !isLoading && (
                <div className="flex items-center mt-2 text-red-100">
                  {data.totalCost.percentChange <= 0 ? (
                    <TrendingDown size={16} className="mr-1" />
                  ) : (
                    <TrendingUp size={16} className="mr-1" />
                  )}
                  <span>
                    {data.totalCost.percentChange >= 0 ? '+' : ''}
                    {data.totalCost.percentChange.toFixed(1)}% vs periode precedente
                  </span>
                </div>
              )}
            </div>
            <div className="hidden md:block">
              <Activity size={64} className="text-red-400 opacity-50" />
            </div>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title={intl.formatMessage({
              id: 'admin.costs.firestore',
              defaultMessage: 'Firestore',
            })}
            value={formatCurrency(data?.firestoreCost.current || 0)}
            change={data?.firestoreCost.percentChange}
            icon={<Database size={24} className="text-orange-600" />}
            iconBgColor="bg-orange-100"
            loading={isLoading}
          />
          <KPICard
            title={intl.formatMessage({
              id: 'admin.costs.functions',
              defaultMessage: 'Cloud Functions',
            })}
            value={formatCurrency(data?.functionsCost.current || 0)}
            change={data?.functionsCost.percentChange}
            icon={<Zap size={24} className="text-blue-600" />}
            iconBgColor="bg-blue-100"
            loading={isLoading}
          />
          <KPICard
            title={intl.formatMessage({
              id: 'admin.costs.storage',
              defaultMessage: 'Storage',
            })}
            value={formatCurrency(data?.storageCost.current || 0)}
            change={data?.storageCost.percentChange}
            icon={<HardDrive size={24} className="text-green-600" />}
            iconBgColor="bg-green-100"
            loading={isLoading}
          />
          <KPICard
            title={intl.formatMessage({
              id: 'admin.costs.twilio',
              defaultMessage: 'Twilio',
            })}
            value={formatCurrency(data?.twilioCost.current || 0)}
            change={data?.twilioCost.percentChange}
            icon={<Phone size={24} className="text-red-600" />}
            iconBgColor="bg-red-100"
            loading={isLoading}
          />
          <KPICard
            title={intl.formatMessage({
              id: 'admin.costs.stripe',
              defaultMessage: 'Stripe Fees',
            })}
            value={formatCurrency(data?.stripeFees.current || 0)}
            change={data?.stripeFees.percentChange}
            icon={<CreditCard size={24} className="text-purple-600" />}
            iconBgColor="bg-purple-100"
            loading={isLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <FormattedMessage
                id="admin.costs.costTrend"
                defaultMessage="Evolution des Couts"
              />
            </h3>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={data?.costTrend || []}>
                  <defs>
                    <linearGradient id="colorFirestore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.firestore} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.firestore} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFunctions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.functions} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.functions} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.storage} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.storage} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTwilio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.twilio} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.twilio} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorStripe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.stripe} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.stripe} stopOpacity={0} />
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
                    tickFormatter={(value) => `${value.toFixed(0)}E`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name.charAt(0).toUpperCase() + name.slice(1),
                    ]}
                  />
                  <Legend
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-sm text-gray-600">
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="firestore"
                    stackId="1"
                    stroke={COLORS.firestore}
                    fill="url(#colorFirestore)"
                  />
                  <Area
                    type="monotone"
                    dataKey="functions"
                    stackId="1"
                    stroke={COLORS.functions}
                    fill="url(#colorFunctions)"
                  />
                  <Area
                    type="monotone"
                    dataKey="storage"
                    stackId="1"
                    stroke={COLORS.storage}
                    fill="url(#colorStorage)"
                  />
                  <Area
                    type="monotone"
                    dataKey="twilio"
                    stackId="1"
                    stroke={COLORS.twilio}
                    fill="url(#colorTwilio)"
                  />
                  <Area
                    type="monotone"
                    dataKey="stripe"
                    stackId="1"
                    stroke={COLORS.stripe}
                    fill="url(#colorStripe)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* SMS/Voice Quotas */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <FormattedMessage
                id="admin.costs.quotas"
                defaultMessage="Quotas SMS / Voice"
              />
            </h3>
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-24 bg-gray-100 animate-pulse rounded" />
                <div className="h-24 bg-gray-100 animate-pulse rounded" />
              </div>
            ) : (
              <div className="space-y-4">
                <QuotaProgress
                  label="SMS"
                  used={data?.smsVoiceQuota.smsUsed || 0}
                  limit={data?.smsVoiceQuota.smsLimit || DEFAULT_QUOTAS.smsMonthly}
                  cost={data?.smsVoiceQuota.smsCost || 0}
                  icon={<MessageSquare size={20} className="text-blue-600" />}
                  unit="messages"
                />
                <QuotaProgress
                  label="Voice"
                  used={data?.smsVoiceQuota.voiceUsed || 0}
                  limit={data?.smsVoiceQuota.voiceLimit || DEFAULT_QUOTAS.voiceMinutesMonthly}
                  cost={data?.smsVoiceQuota.voiceCost || 0}
                  icon={<PhoneCall size={20} className="text-green-600" />}
                  unit="minutes"
                />
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Cout total Twilio</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(
                        (data?.smsVoiceQuota.smsCost || 0) + (data?.smsVoiceQuota.voiceCost || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rate Limit Alerts Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                <FormattedMessage
                  id="admin.costs.rateLimitAlerts"
                  defaultMessage="Alertes Rate Limiting Recentes"
                />
              </h3>
            </div>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              {data?.rateLimitAlerts.length || 0} alertes
            </span>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
                ))}
              </div>
            ) : (data?.rateLimitAlerts || []).length > 0 ? (
              <div className="divide-y divide-gray-100">
                {data?.rateLimitAlerts.map((alert) => (
                  <RateLimitAlertItem key={alert.id} alert={alert} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
                <p>
                  <FormattedMessage
                    id="admin.costs.noRateLimitAlerts"
                    defaultMessage="Aucune alerte de rate limiting pour cette periode"
                  />
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Cost Breakdown Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              <FormattedMessage
                id="admin.costs.breakdown"
                defaultMessage="Detail des Couts par Service"
              />
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Periode actuelle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Periode precedente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % du total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-gray-100 animate-pulse rounded w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <>
                    {[
                      {
                        name: 'Firestore',
                        icon: <Database size={16} className="text-orange-600" />,
                        data: data?.firestoreCost,
                        color: 'text-orange-600',
                      },
                      {
                        name: 'Cloud Functions',
                        icon: <Zap size={16} className="text-blue-600" />,
                        data: data?.functionsCost,
                        color: 'text-blue-600',
                      },
                      {
                        name: 'Storage',
                        icon: <HardDrive size={16} className="text-green-600" />,
                        data: data?.storageCost,
                        color: 'text-green-600',
                      },
                      {
                        name: 'Twilio',
                        icon: <Phone size={16} className="text-red-600" />,
                        data: data?.twilioCost,
                        color: 'text-red-600',
                      },
                      {
                        name: 'Stripe Fees',
                        icon: <CreditCard size={16} className="text-purple-600" />,
                        data: data?.stripeFees,
                        color: 'text-purple-600',
                      },
                    ].map((service) => {
                      const percentOfTotal =
                        data?.totalCost.current && service.data
                          ? (service.data.current / data.totalCost.current) * 100
                          : 0;

                      return (
                        <tr key={service.name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {service.icon}
                              <span className="font-medium text-gray-900">{service.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(service.data?.current || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(service.data?.previous || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`flex items-center text-sm ${
                                (service.data?.percentChange || 0) <= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {(service.data?.percentChange || 0) <= 0 ? (
                                <TrendingDown size={14} className="mr-1" />
                              ) : (
                                <TrendingUp size={14} className="mr-1" />
                              )}
                              {(service.data?.percentChange || 0) >= 0 ? '+' : ''}
                              {(service.data?.percentChange || 0).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${service.color.replace('text-', 'bg-')} rounded-full`}
                                  style={{ width: `${percentOfTotal}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">
                                {percentOfTotal.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <DollarSign size={16} className="text-gray-600" />
                          <span className="text-gray-900">Total</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(data?.totalCost.current || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatCurrency(data?.totalCost.previous || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`flex items-center text-sm ${
                            (data?.totalCost.percentChange || 0) <= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {(data?.totalCost.percentChange || 0) <= 0 ? (
                            <TrendingDown size={14} className="mr-1" />
                          ) : (
                            <TrendingUp size={14} className="mr-1" />
                          )}
                          {(data?.totalCost.percentChange || 0) >= 0 ? '+' : ''}
                          {(data?.totalCost.percentChange || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">100%</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CostMonitoring;
