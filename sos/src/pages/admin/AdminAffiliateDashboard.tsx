/**
 * AdminAffiliateDashboard - Dashboard KPIs du système d'affiliation
 *
 * Vue d'ensemble temps réel :
 * - KPIs financiers (total à verser, commissions du jour/mois)
 * - Graphiques évolution (12 mois)
 * - Top 10 affiliés
 * - Alertes et actions rapides
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Wallet,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Loader2,
  Calendar,
  BarChart3,
  PieChart,
  Award,
  UserPlus,
  Phone,
  CreditCard,
  Flag,
} from "lucide-react";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import { useAuth } from "../../contexts/AuthContext";
import { formatCents } from "../../types/affiliate";

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  // Financial
  totalToPayOut: number;
  pendingPayoutsAmount: number;
  pendingPayoutsCount: number;
  paidThisMonth: number;
  paidThisMonthCount: number;

  // Commissions
  commissionsToday: number;
  commissionsTodayCount: number;
  commissionsThisMonth: number;
  commissionsThisMonthCount: number;
  totalCommissionsAllTime: number;

  // Affiliates
  totalAffiliates: number;
  activeAffiliates: number;
  newAffiliatesThisMonth: number;
  flaggedAffiliates: number;
  suspendedAffiliates: number;

  // Referrals
  newReferralsThisMonth: number;
  totalReferrals: number;
}

interface TopAffiliate {
  id: string;
  name: string;
  email: string;
  code: string;
  totalEarned: number;
  referralCount: number;
  thisMonthEarned: number;
}

interface MonthlyData {
  month: string;
  commissions: number;
  payouts: number;
  newAffiliates: number;
  newReferrals: number;
}

interface CommissionByType {
  type: string;
  label: string;
  amount: number;
  count: number;
  color: string;
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: React.ReactNode;
  color: "blue" | "green" | "amber" | "purple" | "red" | "indigo";
  onClick?: () => void;
}> = ({ title, value, subtitle, change, icon, color, onClick }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600",
    indigo: "from-indigo-500 to-indigo-600",
  };

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 ${
        onClick ? "hover:shadow-md transition-shadow cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${
              change >= 0 ? "text-emerald-600" : "text-red-600"
            }`}>
              {change >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{change >= 0 ? "+" : ""}{change}% vs mois dernier</span>
            </div>
          )}
        </div>
        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg`}
        >
          {icon}
        </div>
      </div>
    </Wrapper>
  );
};

// ============================================================================
// ALERT CARD COMPONENT
// ============================================================================

const AlertCard: React.FC<{
  type: "warning" | "error" | "info";
  title: string;
  count: number;
  action: string;
  onClick: () => void;
}> = ({ type, title, count, action, onClick }) => {
  const config = {
    warning: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      text: "text-amber-700 dark:text-amber-400",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      text: "text-red-700 dark:text-red-400",
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      text: "text-blue-700 dark:text-blue-400",
    },
  };

  const { bg, border, icon, text } = config[type];

  return (
    <div className={`${bg} ${border} border rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {icon}
          <div>
            <p className={`font-medium ${text}`}>{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {count}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="small"
          onClick={onClick}
          className={text}
        >
          {action}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminAffiliateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const db = getFirestore();

  // State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topAffiliates, setTopAffiliates] = useState<TopAffiliate[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [commissionsByType, setCommissionsByType] = useState<CommissionByType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 1. Fetch affiliate stats
      const usersQuery = query(
        collection(db, "users"),
        where("affiliateCode", "!=", null)
      );
      const usersSnapshot = await getDocs(usersQuery);

      let totalToPayOut = 0;
      let totalAffiliates = 0;
      let activeAffiliates = 0;
      let newAffiliatesThisMonth = 0;
      let flaggedAffiliates = 0;
      let suspendedAffiliates = 0;
      let totalReferrals = 0;
      let newReferralsThisMonth = 0;
      const affiliatesList: TopAffiliate[] = [];

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.affiliateCode) {
          totalAffiliates++;
          totalToPayOut += data.availableBalance || 0;

          if (data.affiliateStatus === "active") activeAffiliates++;
          if (data.affiliateStatus === "flagged") flaggedAffiliates++;
          if (data.affiliateStatus === "suspended") suspendedAffiliates++;

          const createdAt = data.createdAt?.toDate?.() || new Date(0);
          if (createdAt >= startOfMonth) newAffiliatesThisMonth++;

          totalReferrals += data.affiliateStats?.totalReferrals || 0;

          affiliatesList.push({
            id: doc.id,
            name: data.displayName || `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.email,
            email: data.email,
            code: data.affiliateCode,
            totalEarned: data.totalEarned || 0,
            referralCount: data.affiliateStats?.totalReferrals || 0,
            thisMonthEarned: 0, // Will calculate from commissions
          });
        }
      });

      // Sort and get top 10
      affiliatesList.sort((a, b) => b.totalEarned - a.totalEarned);
      setTopAffiliates(affiliatesList.slice(0, 10));

      // 2. Fetch pending payouts
      const pendingPayoutsQuery = query(
        collection(db, "affiliate_payouts"),
        where("status", "==", "pending")
      );
      const pendingPayoutsSnapshot = await getDocs(pendingPayoutsQuery);

      let pendingPayoutsAmount = 0;
      pendingPayoutsSnapshot.forEach((doc) => {
        pendingPayoutsAmount += doc.data().amount || 0;
      });

      // 3. Fetch paid this month
      const paidThisMonthQuery = query(
        collection(db, "affiliate_payouts"),
        where("status", "==", "paid"),
        where("paidAt", ">=", Timestamp.fromDate(startOfMonth))
      );
      const paidThisMonthSnapshot = await getDocs(paidThisMonthQuery);

      let paidThisMonth = 0;
      paidThisMonthSnapshot.forEach((doc) => {
        paidThisMonth += doc.data().amount || 0;
      });

      // 4. Fetch commissions
      const commissionsQuery = query(
        collection(db, "affiliate_commissions"),
        orderBy("createdAt", "desc"),
        limit(1000)
      );
      const commissionsSnapshot = await getDocs(commissionsQuery);

      let commissionsToday = 0;
      let commissionsTodayCount = 0;
      let commissionsThisMonth = 0;
      let commissionsThisMonthCount = 0;
      let totalCommissionsAllTime = 0;
      const byType: Record<string, { amount: number; count: number }> = {};

      commissionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || new Date(0);
        const amount = data.amount || 0;
        const type = data.type || "unknown";

        totalCommissionsAllTime += amount;

        if (!byType[type]) byType[type] = { amount: 0, count: 0 };
        byType[type].amount += amount;
        byType[type].count++;

        if (createdAt >= startOfMonth) {
          commissionsThisMonth += amount;
          commissionsThisMonthCount++;
        }

        if (createdAt >= startOfDay) {
          commissionsToday += amount;
          commissionsTodayCount++;
        }
      });

      // Convert byType to array
      const typeLabels: Record<string, { label: string; color: string }> = {
        referral_signup: { label: "Inscriptions", color: "#10b981" },
        referral_first_call: { label: "1er Appel", color: "#3b82f6" },
        referral_recurring_call: { label: "Appels récurrents", color: "#6366f1" },
        referral_subscription: { label: "Abonnements", color: "#8b5cf6" },
        referral_subscription_renewal: { label: "Renouvellements", color: "#ec4899" },
        referral_provider_validated: { label: "Bonus prestataire", color: "#f59e0b" },
        manual_adjustment: { label: "Ajustements", color: "#6b7280" },
      };

      const commissionsByTypeArray: CommissionByType[] = Object.entries(byType).map(
        ([type, { amount, count }]) => ({
          type,
          label: typeLabels[type]?.label || type,
          amount,
          count,
          color: typeLabels[type]?.color || "#6b7280",
        })
      );

      setCommissionsByType(commissionsByTypeArray);

      // 5. Generate monthly data (last 12 months) from real data
      // Initialize monthly buckets
      const monthlyBuckets: Record<string, MonthlyData> = {};
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
        const monthName = monthDate.toLocaleDateString("fr-FR", { month: "short" });
        monthlyBuckets[monthKey] = {
          month: monthName,
          commissions: 0,
          payouts: 0,
          newAffiliates: 0,
          newReferrals: 0,
        };
      }

      // Aggregate commissions by month from the already fetched data
      commissionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        if (createdAt) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
          if (monthlyBuckets[monthKey]) {
            monthlyBuckets[monthKey].commissions += data.amount || 0;
          }
        }
      });

      // Fetch all payouts from last 12 months for historical data
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const allPayoutsQuery = query(
        collection(db, "affiliate_payouts"),
        where("status", "in", ["paid", "completed"]),
        where("paidAt", ">=", Timestamp.fromDate(twelveMonthsAgo))
      );
      const allPayoutsSnapshot = await getDocs(allPayoutsQuery);

      allPayoutsSnapshot.forEach((doc) => {
        const data = doc.data();
        const paidAt = data.paidAt?.toDate?.();
        if (paidAt) {
          const monthKey = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, "0")}`;
          if (monthlyBuckets[monthKey]) {
            monthlyBuckets[monthKey].payouts += data.amount || 0;
          }
        }
      });

      // Aggregate new affiliates by month from already fetched users
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        if (createdAt && data.affiliateCode) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
          if (monthlyBuckets[monthKey]) {
            monthlyBuckets[monthKey].newAffiliates++;
          }
        }
      });

      // Fetch referrals from last 12 months
      const referralsQuery = query(
        collection(db, "referrals"),
        where("createdAt", ">=", Timestamp.fromDate(twelveMonthsAgo))
      );
      const referralsSnapshot = await getDocs(referralsQuery);

      referralsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        if (createdAt) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
          if (monthlyBuckets[monthKey]) {
            monthlyBuckets[monthKey].newReferrals++;
          }
        }
      });

      // Also count referrals this month for stats
      referralsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        if (createdAt && createdAt >= startOfMonth) {
          newReferralsThisMonth++;
        }
      });

      // Convert buckets to sorted array
      const sortedMonthKeys = Object.keys(monthlyBuckets).sort();
      const monthlyDataArray: MonthlyData[] = sortedMonthKeys.map((key) => monthlyBuckets[key]);

      setMonthlyData(monthlyDataArray);

      // Set all stats
      setStats({
        totalToPayOut,
        pendingPayoutsAmount,
        pendingPayoutsCount: pendingPayoutsSnapshot.size,
        paidThisMonth,
        paidThisMonthCount: paidThisMonthSnapshot.size,
        commissionsToday,
        commissionsTodayCount,
        commissionsThisMonth,
        commissionsThisMonthCount,
        totalCommissionsAllTime,
        totalAffiliates,
        activeAffiliates,
        newAffiliatesThisMonth,
        flaggedAffiliates,
        suspendedAffiliates,
        newReferralsThisMonth,
        totalReferrals,
      });
    } catch (err) {
      console.error("[AdminAffiliateDashboard] Error fetching data:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, db]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Chargement du dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <Button onClick={() => fetchDashboardData()} className="mt-4">
              Réessayer
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard Affiliation
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Vue d'ensemble du programme d'affiliation
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchDashboardData()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Financial KPIs */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 text-white">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Finances Affiliation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-sm text-white/80">Total à verser</p>
              <p className="text-3xl font-bold mt-1">
                {formatCents(stats?.totalToPayOut || 0)}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {stats?.activeAffiliates || 0} affiliés actifs
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-sm text-white/80">Demandes en attente</p>
              <p className="text-3xl font-bold mt-1">
                {formatCents(stats?.pendingPayoutsAmount || 0)}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {stats?.pendingPayoutsCount || 0} demandes
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-sm text-white/80">Versé ce mois</p>
              <p className="text-3xl font-bold mt-1">
                {formatCents(stats?.paidThisMonth || 0)}
              </p>
              <p className="text-xs text-white/60 mt-1">
                {stats?.paidThisMonthCount || 0} paiements
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <p className="text-sm text-white/80">Total distribué</p>
              <p className="text-3xl font-bold mt-1">
                {formatCents(stats?.totalCommissionsAllTime || 0)}
              </p>
              <p className="text-xs text-white/60 mt-1">depuis le lancement</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {((stats?.pendingPayoutsCount || 0) > 0 || (stats?.flaggedAffiliates || 0) > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(stats?.pendingPayoutsCount || 0) > 0 && (
              <AlertCard
                type="info"
                title="Demandes de retrait en attente"
                count={stats?.pendingPayoutsCount || 0}
                action="Traiter"
                onClick={() => navigate("/admin/affiliates/payouts")}
              />
            )}
            {(stats?.flaggedAffiliates || 0) > 0 && (
              <AlertCard
                type="warning"
                title="Affiliés signalés"
                count={stats?.flaggedAffiliates || 0}
                action="Voir"
                onClick={() => navigate("/admin/affiliates?status=flagged")}
              />
            )}
            {(stats?.suspendedAffiliates || 0) > 0 && (
              <AlertCard
                type="error"
                title="Affiliés suspendus"
                count={stats?.suspendedAffiliates || 0}
                action="Gérer"
                onClick={() => navigate("/admin/affiliates?status=suspended")}
              />
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Commissions aujourd'hui"
            value={formatCents(stats?.commissionsToday || 0)}
            subtitle={`${stats?.commissionsTodayCount || 0} actions`}
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            title="Commissions ce mois"
            value={formatCents(stats?.commissionsThisMonth || 0)}
            subtitle={`${stats?.commissionsThisMonthCount || 0} actions`}
            icon={<Calendar className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            title="Nouveaux affiliés"
            value={stats?.newAffiliatesThisMonth || 0}
            subtitle="ce mois"
            icon={<UserPlus className="h-5 w-5" />}
            color="purple"
            onClick={() => navigate("/admin/affiliates")}
          />
          <StatCard
            title="Total filleuls"
            value={stats?.totalReferrals || 0}
            subtitle={`${stats?.totalAffiliates || 0} affiliés`}
            icon={<Users className="h-5 w-5" />}
            color="indigo"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolution Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Évolution sur 12 mois
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(value) => `${value / 100}€`} />
                  <Tooltip
                    formatter={(value) => formatCents(value as number)}
                    labelClassName="font-semibold"
                  />
                  <Area
                    type="monotone"
                    dataKey="commissions"
                    name="Commissions"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="payouts"
                    name="Paiements"
                    stackId="2"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Commissions by Type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Répartition par type
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data={commissionsByType as any}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={(props: any) =>
                      `${props.name || props.label || ""} ${((props.percent || 0) * 100).toFixed(0)}%`
                    }
                  >
                    {commissionsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCents(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top Affiliates & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 10 Affiliates */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Top 10 Affiliés
              </h3>
              <Button
                variant="ghost"
                size="small"
                onClick={() => navigate("/admin/affiliates")}
              >
                Voir tous
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affilié</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Filleuls</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total gagné</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {topAffiliates.map((affiliate, index) => (
                    <tr
                      key={affiliate.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => navigate(`/admin/affiliates/${affiliate.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index === 0
                            ? "bg-amber-100 text-amber-700"
                            : index === 1
                            ? "bg-gray-200 text-gray-700"
                            : index === 2
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {affiliate.name}
                          </p>
                          <p className="text-xs text-gray-500">{affiliate.code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                        {affiliate.referralCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-emerald-600">
                          {formatCents(affiliate.totalEarned)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {topAffiliates.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        Aucun affilié pour le moment
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Actions rapides
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/admin/affiliates/payouts")}
              >
                <Wallet className="h-4 w-4 mr-2" />
                Traiter les paiements
                {(stats?.pendingPayoutsCount || 0) > 0 && (
                  <span className="ml-auto bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">
                    {stats?.pendingPayoutsCount}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/admin/affiliates")}
              >
                <Users className="h-4 w-4 mr-2" />
                Gérer les affiliés
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/admin/affiliates/config")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Configuration
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/admin/affiliates/commissions")}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Toutes les commissions
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate("/admin/affiliates/reports")}
              >
                <PieChart className="h-4 w-4 mr-2" />
                Rapports
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAffiliateDashboard;
