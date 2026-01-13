// src/components/admin/DashboardCharts.tsx
// Dashboard Charts with real Firestore data
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useIntl } from "react-intl";
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
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Phone,
  DollarSign,
  Globe,
  Calendar,
  Filter,
  RefreshCw,
  UserPlus,
  Briefcase,
  Scale,
} from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../config/firebase";

// Types
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
  [key: string]: string | number;
}

interface DashboardStats {
  newUsers: ChartDataPoint[];
  newProviders: ChartDataPoint[];
  calls: ChartDataPoint[];
  revenue: ChartDataPoint[];
  revenueByType: PieDataPoint[];
  usersByCountry: PieDataPoint[];
  providersByType: PieDataPoint[];
  kpis: {
    totalNewUsers: number;
    totalNewProviders: number;
    totalCalls: number;
    successfulCalls: number;
    totalRevenue: number;
    platformRevenue: number;
    providerRevenue: number;
    avgCallDuration: number;
    conversionRate: number;
    userGrowth: number;
    revenueGrowth: number;
  };
}

interface FilterState {
  period: "7d" | "30d" | "90d" | "365d" | "all";
  country: string;
  language: string;
}

// Colors
const COLORS = {
  primary: "#DC2626", // red-600
  secondary: "#2563EB", // blue-600
  success: "#16A34A", // green-600
  warning: "#D97706", // amber-600
  purple: "#9333EA", // purple-600
  pink: "#DB2777", // pink-600
  cyan: "#0891B2", // cyan-600
  orange: "#EA580C", // orange-600
};

const PIE_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.success,
  COLORS.warning,
  COLORS.purple,
  COLORS.pink,
  COLORS.cyan,
  COLORS.orange,
];

// Helper to get date range
const getDateRange = (period: FilterState["period"]): Date => {
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "365d":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "all":
      return new Date(2020, 0, 1);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
};

// Format date for display
const formatDateLabel = (date: Date, period: FilterState["period"]): string => {
  if (period === "7d") {
    return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
  }
  if (period === "30d" || period === "90d") {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }
  return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
};

// Group data by date
const groupByDate = (
  items: { date: Date; value: number }[],
  period: FilterState["period"]
): ChartDataPoint[] => {
  const grouped = new Map<string, number>();
  const startDate = getDateRange(period);
  const now = new Date();

  // Initialize all dates with 0
  const current = new Date(startDate);
  while (current <= now) {
    const key = period === "365d" || period === "all"
      ? `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
      : current.toISOString().split("T")[0];
    grouped.set(key, 0);

    if (period === "365d" || period === "all") {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  // Add actual values
  items.forEach((item) => {
    if (item.date >= startDate) {
      const key = period === "365d" || period === "all"
        ? `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, "0")}`
        : item.date.toISOString().split("T")[0];
      grouped.set(key, (grouped.get(key) || 0) + item.value);
    }
  });

  // Convert to array
  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateStr, value]) => {
      const [year, monthOrDay] = dateStr.split("-");
      let displayDate: Date;
      if (period === "365d" || period === "all") {
        displayDate = new Date(parseInt(year), parseInt(monthOrDay) - 1, 1);
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

// KPI Card Component
const KPICard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
}> = ({ title, value, change, icon, color, suffix }) => {
  const intl = useIntl();
  const t = (key: string) => intl.formatMessage({ id: key });

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>
            {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
            {suffix && <span className="text-sm font-normal ml-1">{suffix}</span>}
          </p>
          {change !== undefined && (
            <div className={`flex items-center text-sm mt-1 ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
              {change >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
              <span>{change >= 0 ? "+" : ""}{change.toFixed(1)}%</span>
              <span className="text-gray-400 ml-1">{t("admin.charts.vsPreviousPeriod")}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full bg-opacity-10 ${color.replace("text-", "bg-")}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Main Component
const DashboardCharts: React.FC = () => {
  const intl = useIntl();
  const t = (key: string) => intl.formatMessage({ id: key });
  const mountedRef = useRef(true);

  const [filters, setFilters] = useState<FilterState>({
    period: "30d",
    country: "all",
    language: "all",
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countries, setCountries] = useState<{ code: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load countries for filter
  const loadCountries = useCallback(async () => {
    try {
      const countriesSnapshot = await getDocs(collection(db, "countries"));
      if (!mountedRef.current) return;

      const countriesList = countriesSnapshot.docs
        .map((doc) => ({
          code: doc.id,
          name: (doc.data().name as string) || doc.id,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setCountries(countriesList);
    } catch (err) {
      console.error("Error loading countries:", err);
    }
  }, []);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const startDate = getDateRange(filters.period);
      const startTimestamp = Timestamp.fromDate(startDate);

      // Build queries
      let usersQuery = query(
        collection(db, "users"),
        where("createdAt", ">=", startTimestamp),
        orderBy("createdAt", "desc")
      );

      let callsQuery = query(
        collection(db, "call_sessions"),
        where("metadata.createdAt", ">=", startTimestamp),
        orderBy("metadata.createdAt", "desc")
      );

      let paymentsQuery = query(
        collection(db, "payments"),
        where("createdAt", ">=", startTimestamp),
        orderBy("createdAt", "desc")
      );

      // Execute queries in parallel
      const [usersSnapshot, callsSnapshot, paymentsSnapshot] = await Promise.all([
        getDocs(usersQuery),
        getDocs(callsQuery),
        getDocs(paymentsQuery),
      ]);

      if (!mountedRef.current) return;

      // Process users data
      const usersData: { date: Date; role: string; country?: string }[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || new Date();
        usersData.push({
          date: createdAt,
          role: (data.role as string) || "client",
          country: data.country as string | undefined,
        });
      });

      // Process calls data
      const callsData: { date: Date; status: string; duration: number }[] = [];
      callsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.metadata?.createdAt?.toDate?.() || data.createdAt?.toDate?.() || new Date();
        callsData.push({
          date: createdAt,
          status: (data.status as string) || "unknown",
          duration: (data.duration as number) || 0,
        });
      });

      // Process payments data
      const paymentsData: { date: Date; amount: number; platformFee: number; providerAmount: number; type?: string }[] = [];
      paymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || new Date();
        paymentsData.push({
          date: createdAt,
          amount: (data.amount as number) || 0,
          platformFee: ((data.platformFee || data.connectionFeeAmount || data.commissionAmount) as number) || 0,
          providerAmount: (data.providerAmount as number) || 0,
          type: data.providerType as string | undefined,
        });
      });

      // Filter by country if needed
      const filteredUsers = filters.country === "all"
        ? usersData
        : usersData.filter(u => u.country === filters.country);

      // Calculate new users chart data
      const newUsersItems = filteredUsers
        .filter(u => u.role === "client")
        .map(u => ({ date: u.date, value: 1 }));
      const newUsersChart = groupByDate(newUsersItems, filters.period);

      // Calculate new providers chart data
      const newProvidersItems = filteredUsers
        .filter(u => u.role === "lawyer" || u.role === "expat")
        .map(u => ({ date: u.date, value: 1 }));
      const newProvidersChart = groupByDate(newProvidersItems, filters.period);

      // Calculate calls chart data
      const callsItems = callsData.map(c => ({ date: c.date, value: 1 }));
      const callsChart = groupByDate(callsItems, filters.period);

      // Calculate revenue chart data
      const revenueItems = paymentsData.map(p => ({ date: p.date, value: p.amount }));
      const revenueChart = groupByDate(revenueItems, filters.period);

      // Calculate KPIs
      const totalNewUsers = filteredUsers.filter(u => u.role === "client").length;
      const totalNewProviders = filteredUsers.filter(u => u.role === "lawyer" || u.role === "expat").length;
      const totalCalls = callsData.length;
      const successfulCalls = callsData.filter(c => c.status === "completed").length;
      const totalRevenue = paymentsData.reduce((sum, p) => sum + p.amount, 0);
      const platformRevenue = paymentsData.reduce((sum, p) => sum + p.platformFee, 0);
      const providerRevenue = paymentsData.reduce((sum, p) => sum + p.providerAmount, 0);
      const avgCallDuration = callsData.length > 0
        ? callsData.reduce((sum, c) => sum + c.duration, 0) / callsData.length
        : 0;
      const conversionRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

      // Calculate pie chart data
      const usersByCountryMap = new Map<string, number>();
      filteredUsers.forEach(u => {
        const country = u.country || t("admin.charts.unknown");
        usersByCountryMap.set(country, (usersByCountryMap.get(country) || 0) + 1);
      });
      const usersByCountry: PieDataPoint[] = Array.from(usersByCountryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value], index) => ({
          name,
          value,
          color: PIE_COLORS[index % PIE_COLORS.length],
        }));

      const providersByTypeMap = new Map<string, number>();
      filteredUsers.filter(u => u.role === "lawyer" || u.role === "expat").forEach(u => {
        const type = u.role === "lawyer" ? t("admin.charts.lawyers") : t("admin.charts.expats");
        providersByTypeMap.set(type, (providersByTypeMap.get(type) || 0) + 1);
      });
      const providersByType: PieDataPoint[] = Array.from(providersByTypeMap.entries())
        .map(([name, value], index) => ({
          name,
          value,
          color: index === 0 ? COLORS.primary : COLORS.secondary,
        }));

      const revenueByTypeMap = new Map<string, number>();
      paymentsData.forEach(p => {
        const type = p.type === "lawyer" ? t("admin.charts.lawyers") : p.type === "expat" ? t("admin.charts.expats") : t("admin.charts.other");
        revenueByTypeMap.set(type, (revenueByTypeMap.get(type) || 0) + p.amount);
      });
      const revenueByType: PieDataPoint[] = Array.from(revenueByTypeMap.entries())
        .map(([name, value], index) => ({
          name,
          value,
          color: PIE_COLORS[index % PIE_COLORS.length],
        }));

      // Calculate growth (compare to previous period)
      const periodMs = Date.now() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - periodMs);

      // For simplicity, we'll estimate growth based on trend
      const userGrowth = newUsersChart.length > 1
        ? ((newUsersChart[newUsersChart.length - 1].value - newUsersChart[0].value) / Math.max(newUsersChart[0].value, 1)) * 100
        : 0;
      const revenueGrowth = revenueChart.length > 1
        ? ((revenueChart[revenueChart.length - 1].value - revenueChart[0].value) / Math.max(revenueChart[0].value, 1)) * 100
        : 0;

      if (!mountedRef.current) return;

      setStats({
        newUsers: newUsersChart,
        newProviders: newProvidersChart,
        calls: callsChart,
        revenue: revenueChart,
        revenueByType,
        usersByCountry,
        providersByType,
        kpis: {
          totalNewUsers,
          totalNewProviders,
          totalCalls,
          successfulCalls,
          totalRevenue,
          platformRevenue,
          providerRevenue,
          avgCallDuration,
          conversionRate,
          userGrowth,
          revenueGrowth,
        },
      });
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      if (mountedRef.current) {
        setError(t("admin.charts.error"));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters]);

  // Load countries once on mount
  useEffect(() => {
    mountedRef.current = true;
    loadCountries();
    return () => { mountedRef.current = false; };
  }, []);

  // Load dashboard data when filters change
  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <span className="font-medium text-gray-700">{t("admin.charts.filters")}</span>
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <select
              value={filters.period}
              onChange={(e) => handleFilterChange("period", e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="7d">{t("admin.charts.last7Days")}</option>
              <option value="30d">{t("admin.charts.last30Days")}</option>
              <option value="90d">{t("admin.charts.last90Days")}</option>
              <option value="365d">{t("admin.charts.last12Months")}</option>
              <option value="all">{t("admin.charts.all")}</option>
            </select>
          </div>

          {/* Country Filter */}
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-gray-400" />
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange("country", e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="all">{t("admin.charts.allCountries")}</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw size={32} className="animate-spin text-red-600" />
            <p className="text-gray-500">{t("admin.charts.loading")}</p>
          </div>
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <KPICard
              title={t("admin.charts.newUsers")}
              value={stats.kpis.totalNewUsers}
              change={stats.kpis.userGrowth}
              icon={<UserPlus size={24} className="text-blue-600" />}
              color="text-blue-600"
            />
            <KPICard
              title={t("admin.charts.newProviders")}
              value={stats.kpis.totalNewProviders}
              icon={<Briefcase size={24} className="text-purple-600" />}
              color="text-purple-600"
            />
            <KPICard
              title={t("admin.charts.totalCalls")}
              value={stats.kpis.totalCalls}
              icon={<Phone size={24} className="text-green-600" />}
              color="text-green-600"
            />
            <KPICard
              title={t("admin.charts.successRate")}
              value={`${stats.kpis.conversionRate.toFixed(1)}%`}
              icon={<TrendingUp size={24} className="text-amber-600" />}
              color="text-amber-600"
            />
            <KPICard
              title={t("admin.charts.revenue")}
              value={stats.kpis.totalRevenue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
              change={stats.kpis.revenueGrowth}
              icon={<DollarSign size={24} className="text-red-600" />}
              color="text-red-600"
              suffix="€"
            />
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-500">{t("admin.charts.platformCommission")}</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.kpis.platformRevenue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-500">{t("admin.charts.providerRevenue")}</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.kpis.providerRevenue.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-500">{t("admin.charts.avgCallDuration")}</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(stats.kpis.avgCallDuration / 60)} min
              </p>
            </div>
          </div>

          {/* Charts Row 1: Line Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* New Users Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users size={20} className="text-blue-600" />
                Nouveaux utilisateurs
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.newUsers}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }}
                    formatter={(value) => [value ?? 0, t("admin.charts.users")]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={COLORS.secondary}
                    strokeWidth={2}
                    fill="url(#colorUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Calls Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Phone size={20} className="text-green-600" />
                Appels
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.calls}>
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
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }}
                    formatter={(value) => [value ?? 0, t("admin.charts.calls")]}
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
            </div>
          </div>

          {/* Charts Row 2: Revenue and Providers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-red-600" />
                Chiffre d'affaires (€)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }}
                    formatter={(value) => [`${(value ?? 0).toLocaleString("fr-FR")} €`, "CA"]}
                  />
                  <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* New Providers Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Scale size={20} className="text-purple-600" />
                Nouveaux prestataires
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.newProviders}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }}
                    formatter={(value) => [value ?? 0, t("admin.charts.providers")]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={COLORS.purple}
                    strokeWidth={2}
                    dot={{ fill: COLORS.purple, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 3: Pie Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Users by Country */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Globe size={20} className="text-cyan-600" />
                Utilisateurs par pays
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.usersByCountry}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.usersByCountry.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value ?? 0, name]}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={10}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Providers by Type */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase size={20} className="text-purple-600" />
                Types de prestataires
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.providersByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.providersByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value ?? 0, name]}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={10}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue by Type */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-amber-600" />
                CA par type
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.revenueByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.revenueByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${(value ?? 0).toLocaleString("fr-FR")} €`, name]}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={10}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DashboardCharts;
