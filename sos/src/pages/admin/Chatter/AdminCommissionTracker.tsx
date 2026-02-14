/**
 * AdminCommissionTracker - Professional Commission Tracking Dashboard
 *
 * Features:
 * - KPIs and summary stats
 * - Advanced filtering (date, type, status, chatter)
 * - Commission cascade view (N1/N2 relationships)
 * - Export to CSV
 * - Search by chatter/email/ID
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsWest2 } from "@/config/firebase";
import {
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Calendar,
  X,
  Eye,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import CommissionWaterfall from '../../../components/admin/CommissionWaterfall';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    ghost: "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
  badge: {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300",
    validated: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
    available: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
    paid: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  },
} as const;

// Commission types with labels
const COMMISSION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'client_call', label: 'Client Call ($10)' },
  { value: 'n1_call', label: 'N1 Call ($1)' },
  { value: 'n2_call', label: 'N2 Call ($0.50)' },
  { value: 'activation_bonus', label: 'Activation Bonus ($5)' },
  { value: 'n1_recruit_bonus', label: 'N1 Recruit Bonus ($1)' },
  { value: 'provider_call', label: 'Provider Call ($5)' },
  { value: 'bonus_level', label: 'Level Bonus' },
  { value: 'bonus_streak', label: 'Streak Bonus' },
  { value: 'bonus_top3', label: 'Top 3 Bonus' },
  { value: 'tier_bonus', label: 'Tier Bonus' },
  { value: 'manual_adjustment', label: 'Manual Adjustment' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'validated', label: 'Validated' },
  { value: 'available', label: 'Available' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SOURCE_TYPES = [
  { value: '', label: 'All Sources' },
  { value: 'call_session', label: 'Call Session' },
  { value: 'user', label: 'User' },
  { value: 'provider', label: 'Provider' },
  { value: 'bonus', label: 'Bonus' },
];

// Types
interface CommissionDetailed {
  id: string;
  chatterId: string;
  chatterEmail: string;
  chatterName: string;
  chatterCode: string;
  type: string;
  sourceId: string | null;
  sourceType: string | null;
  sourceDetails?: Record<string, unknown>;
  baseAmount: number;
  levelBonus: number;
  top3Bonus: number;
  zoomBonus: number;
  streakBonus?: number;
  monthlyTopMultiplier?: number;
  amount: number;
  currency: string;
  calculationDetails: string;
  status: 'pending' | 'validated' | 'available' | 'paid' | 'cancelled';
  createdAt: string;
  validatedAt: string | null;
  availableAt: string | null;
  paidAt: string | null;
  withdrawalId: string | null;
  description: string;
  relatedChatter?: {
    id: string;
    name: string;
    email: string;
    code: string;
  };
  callSession?: {
    id: string;
    clientEmail?: string;
    duration?: number;
    connectionFee?: number;
  };
}

interface CommissionStats {
  totals: {
    amount: number;
    count: number;
    pending: number;
    validated: number;
    available: number;
    paid: number;
  };
  byType: Record<string, { amount: number; count: number }>;
  byMonth: Array<{ month: string; amount: number; count: number }>;
  topEarners: Array<{
    chatterId: string;
    chatterName: string;
    chatterCode: string;
    amount: number;
    count: number;
    country: string;
  }>;
  pendingValidation: {
    count: number;
    amount: number;
    oldestDate: string | null;
  };
  recentActivity: Array<{
    id: string;
    chatterId: string;
    chatterName: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

// Helper functions
const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
};

const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (iso: string): string => {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTypeLabel = (type: string): string => {
  const found = COMMISSION_TYPES.find((t) => t.value === type);
  return found?.label || type;
};

const getTypeColor = (type: string): string => {
  switch (type) {
    case 'client_call':
      return 'bg-green-500';
    case 'n1_call':
      return 'bg-blue-500';
    case 'n2_call':
      return 'bg-indigo-500';
    case 'activation_bonus':
      return 'bg-orange-500';
    case 'n1_recruit_bonus':
      return 'bg-yellow-500';
    case 'provider_call':
      return 'bg-purple-500';
    default:
      return 'bg-gray-500';
  }
};

// KPI Card Component
const KPICard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color: string;
}> = ({ title, value, subtitle, icon, trend, color }) => (
  <div className={UI.card + " p-6"}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      {trend && (
        <div
          className={`flex items-center gap-1 text-sm font-medium ${
            trend.positive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {trend.positive ? (
            <ArrowUpRight className="w-4 h-4" />
          ) : (
            <ArrowDownRight className="w-4 h-4" />
          )}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
      {value}
    </div>
    <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
    {subtitle && (
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        {subtitle}
      </div>
    )}
  </div>
);

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const badgeClass = UI.badge[status as keyof typeof UI.badge] || UI.badge.pending;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Main Component
const AdminCommissionTracker: React.FC = () => {
  const intl = useIntl();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [commissions, setCommissions] = useState<CommissionDetailed[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<CommissionDetailed | null>(null);
  const [showWaterfall, setShowWaterfall] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [sourceType, setSourceType] = useState(searchParams.get('sourceType') || '');
  const [chatterId, setChatterId] = useState(searchParams.get('chatterId') || '');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: searchParams.get('startDate') || '',
    end: searchParams.get('endDate') || '',
  });
  const [offset, setOffset] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const adminGetCommissionStats = httpsCallable<
        { dateRange?: { start: string; end: string } },
        CommissionStats
      >(functionsWest2, 'adminGetCommissionStats');

      const result = await adminGetCommissionStats({
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
      });

      setStats(result.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [dateRange]);

  // Fetch commissions
  const fetchCommissions = useCallback(
    async (resetOffset = true) => {
      setLoading(true);
      try {
        const newOffset = resetOffset ? 0 : offset;

        const adminGetCommissionsDetailed = httpsCallable<
          {
            chatterId?: string;
            dateRange?: { start: string; end: string };
            type?: string;
            status?: string;
            sourceType?: string;
            search?: string;
            limit: number;
            offset: number;
          },
          {
            commissions: CommissionDetailed[];
            stats: { total: number };
            hasMore: boolean;
          }
        >(functionsWest2, 'adminGetCommissionsDetailed');

        const result = await adminGetCommissionsDetailed({
          chatterId: chatterId || undefined,
          dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
          type: type || undefined,
          status: status || undefined,
          sourceType: sourceType || undefined,
          search: search || undefined,
          limit: 50,
          offset: newOffset,
        });

        if (resetOffset) {
          setCommissions(result.data.commissions);
        } else {
          setCommissions((prev) => [...prev, ...result.data.commissions]);
        }
        setHasMore(result.data.hasMore);
        setOffset(newOffset + result.data.commissions.length);
      } catch (error) {
        console.error('Failed to fetch commissions:', error);
      } finally {
        setLoading(false);
      }
    },
    [chatterId, dateRange, type, status, sourceType, search, offset]
  );

  // Export CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const adminExportCommissionsCSV = httpsCallable<
        {
          chatterId?: string;
          dateRange?: { start: string; end: string };
          type?: string;
          status?: string;
          sourceType?: string;
        },
        { success: boolean; csv: string; count: number }
      >(functionsWest2, 'adminExportCommissionsCSV');

      const result = await adminExportCommissionsCSV({
        chatterId: chatterId || undefined,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
        type: type || undefined,
        status: status || undefined,
        sourceType: sourceType || undefined,
      });

      if (result.data.success) {
        // Download CSV
        const blob = new Blob([result.data.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `commissions_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export:', error);
    } finally {
      setExporting(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStats();
    fetchCommissions(true);
  }, []);

  // Refetch on filter change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCommissions(true);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [type, status, sourceType, chatterId, dateRange]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (sourceType) params.set('sourceType', sourceType);
    if (chatterId) params.set('chatterId', chatterId);
    if (dateRange.start) params.set('startDate', dateRange.start);
    if (dateRange.end) params.set('endDate', dateRange.end);
    setSearchParams(params);
  }, [search, type, status, sourceType, chatterId, dateRange, setSearchParams]);

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setType('');
    setStatus('');
    setSourceType('');
    setChatterId('');
    setDateRange({ start: '', end: '' });
  };

  const hasActiveFilters =
    search || type || status || sourceType || chatterId || dateRange.start || dateRange.end;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage
                id="admin.chatter.commissions.title"
                defaultMessage="Commission Tracker"
              />
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              <FormattedMessage
                id="admin.chatter.commissions.subtitle"
                defaultMessage="Track and manage chatter commissions across the network"
              />
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchStats();
                fetchCommissions(true);
              }}
              className={UI.button.secondary + " p-2"}
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className={UI.button.secondary + " px-4 py-2 flex items-center gap-2"}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Commissions"
              value={formatCurrency(stats.totals.amount)}
              subtitle={`${stats.totals.count.toLocaleString()} commissions`}
              icon={<DollarSign className="w-6 h-6 text-white" />}
              color="bg-gradient-to-br from-green-500 to-emerald-600"
            />
            <KPICard
              title="Pending"
              value={formatCurrency(stats.totals.pending)}
              subtitle="In validation period"
              icon={<Clock className="w-6 h-6 text-white" />}
              color="bg-gradient-to-br from-yellow-500 to-orange-500"
            />
            <KPICard
              title="Available"
              value={formatCurrency(stats.totals.available)}
              subtitle="Ready for withdrawal"
              icon={<CheckCircle className="w-6 h-6 text-white" />}
              color="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <KPICard
              title="Paid Out"
              value={formatCurrency(stats.totals.paid)}
              subtitle="Total withdrawn"
              icon={<TrendingUp className="w-6 h-6 text-white" />}
              color="bg-gradient-to-br from-purple-500 to-pink-600"
            />
          </div>
        )}

        {/* Top Earners & Recent Activity */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Earners */}
            <div className={UI.card + " p-6"}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-500" />
                  Top 10 Earners
                </h3>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                {stats.topEarners.slice(0, 5).map((earner, index) => (
                  <div
                    key={earner.chatterId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0
                            ? 'bg-yellow-500'
                            : index === 1
                            ? 'bg-gray-400'
                            : index === 2
                            ? 'bg-orange-600'
                            : 'bg-gray-300'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {earner.chatterName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {earner.chatterCode} • {earner.country}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(earner.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {earner.count} commissions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commission by Type */}
            <div className={UI.card + " p-6"}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-500" />
                  By Commission Type
                </h3>
              </div>
              <div className="space-y-3">
                {Object.entries(stats.byType)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .slice(0, 6)
                  .map(([commType, data]) => (
                    <div key={commType} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {getTypeLabel(commType)}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(data.amount)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getTypeColor(commType)} rounded-full`}
                          style={{
                            width: `${(data.amount / stats.totals.amount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={UI.card + " p-4"}>
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email, name, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={UI.input + " pl-10"}
              />
            </div>

            {/* Quick filters */}
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={UI.select}
            >
              {COMMISSION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={UI.select}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* More filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={UI.button.ghost + " px-3 py-2 flex items-center gap-2"}
            >
              <Filter className="w-4 h-4" />
              More Filters
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showFilters ? 'rotate-180' : ''
                }`}
              />
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>

          {/* Extended filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Source Type
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className={UI.select + " w-full"}
                >
                  {SOURCE_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chatter ID
                </label>
                <input
                  type="text"
                  placeholder="Filter by chatter ID"
                  value={chatterId}
                  onChange={(e) => setChatterId(e.target.value)}
                  className={UI.input}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, start: e.target.value }))
                    }
                    className={UI.input}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, end: e.target.value }))
                    }
                    className={UI.input}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Commissions Table */}
        <div className={UI.card + " overflow-hidden"}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chatter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {loading && commissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                      <p className="mt-2 text-gray-500">Loading commissions...</p>
                    </td>
                  </tr>
                ) : commissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <AlertCircle className="w-8 h-8 mx-auto text-gray-400" />
                      <p className="mt-2 text-gray-500">No commissions found</p>
                    </td>
                  </tr>
                ) : (
                  commissions.map((commission) => (
                    <tr
                      key={commission.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {commission.id.slice(0, 8)}...
                        </div>
                        <div className="text-xs text-gray-500">
                          {commission.description.slice(0, 40)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={`/admin/chatters/${commission.chatterId}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {commission.chatterName}
                        </a>
                        <div className="text-xs text-gray-500">
                          {commission.chatterCode}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${getTypeColor(
                              commission.type
                            )}`}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {getTypeLabel(commission.type)}
                          </span>
                        </div>
                        {commission.relatedChatter && (
                          <div className="text-xs text-gray-500 mt-1">
                            via {commission.relatedChatter.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-green-600">
                          {formatCurrency(commission.amount)}
                        </div>
                        {commission.baseAmount !== commission.amount && (
                          <div className="text-xs text-gray-500">
                            Base: {formatCurrency(commission.baseAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={commission.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(commission.createdAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateTime(commission.createdAt).split(', ')[1]}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedCommission(commission);
                            setShowWaterfall(true);
                          }}
                          className={UI.button.ghost + " p-2"}
                          title="View cascade"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="p-4 border-t border-gray-200 dark:border-white/10 text-center">
              <button
                onClick={() => fetchCommissions(false)}
                disabled={loading}
                className={UI.button.secondary + " px-6 py-2"}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Waterfall Modal */}
        {showWaterfall && selectedCommission && (
          <CommissionWaterfall
            commission={selectedCommission}
            onClose={() => {
              setShowWaterfall(false);
              setSelectedCommission(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCommissionTracker;
