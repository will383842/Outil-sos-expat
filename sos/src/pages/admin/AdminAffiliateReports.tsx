/**
 * AdminAffiliateReports - Rapports et Analytics Affiliation
 *
 * Page admin pour :
 * - Rapports mensuels
 * - Cohorts d'affiliés
 * - Analytics par source UTM
 * - Exports PDF/CSV
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  Download,
  RefreshCw,
  Loader2,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import { useAuth } from "../../contexts/AuthContext";
import { formatCents } from "../../types/affiliate";

// ============================================================================
// TYPES
// ============================================================================

interface MonthlyReport {
  month: string;
  monthKey: string;
  newAffiliates: number;
  newReferrals: number;
  commissionsEarned: number;
  commissionsCount: number;
  payoutsPaid: number;
  payoutsCount: number;
  conversionRate: number;
}

interface CohortData {
  cohort: string;
  affiliates: number;
  totalReferrals: number;
  avgReferrals: number;
  totalEarned: number;
  avgEarned: number;
  retentionRate: number;
}

interface TopPerformer {
  id: string;
  name: string;
  email: string;
  code: string;
  referrals: number;
  earned: number;
  conversionRate: number;
}

interface UTMSource {
  source: string;
  signups: number;
  conversions: number;
  revenue: number;
}

// ============================================================================
// CHART COLORS
// ============================================================================

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const ReportCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon: React.ReactNode;
}> = ({ title, value, change, subtitle, icon }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
          {value}
        </p>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 mt-2 text-sm ${
              change >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {change >= 0 ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}%
            </span>
            <span className="text-gray-400 ml-1">vs mois précédent</span>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl">
        {icon}
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminAffiliateReports: React.FC = () => {
  const { user } = useAuth();
  const db = getFirestore();

  // State
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [utmSources, setUtmSources] = useState<UTMSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"6m" | "12m" | "all">("12m");
  const [activeTab, setActiveTab] = useState<"overview" | "cohorts" | "performers" | "sources">("overview");

  // Fetch report data
  const fetchReportData = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);

    try {
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

      // 1. Fetch all affiliates once (users with affiliateCode)
      const usersSnapshot = await getDocs(
        query(collection(db, "users"), where("affiliateCode", "!=", null))
      );

      // Index affiliates by signup month
      const affiliatesByMonth: Record<string, number> = {};
      const affiliateReferralsByMonth: Record<string, number> = {};

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        if (createdAt && data.affiliateCode) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
          affiliatesByMonth[monthKey] = (affiliatesByMonth[monthKey] || 0) + 1;
        }
      });

      // 2. Fetch all referrals from last 12 months
      const referralsSnapshot = await getDocs(
        query(
          collection(db, "referrals"),
          where("createdAt", ">=", Timestamp.fromDate(twelveMonthsAgo))
        )
      );

      // Index referrals by month
      const referralsByMonth: Record<string, number> = {};
      referralsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        if (createdAt) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
          referralsByMonth[monthKey] = (referralsByMonth[monthKey] || 0) + 1;
        }
      });

      // 3. Fetch all commissions from last 12 months
      const commissionsSnapshot = await getDocs(
        query(
          collection(db, "affiliate_commissions"),
          where("createdAt", ">=", Timestamp.fromDate(twelveMonthsAgo))
        )
      );

      // Index commissions by month
      const commissionsByMonth: Record<string, { amount: number; count: number }> = {};
      commissionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        if (createdAt) {
          const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
          if (!commissionsByMonth[monthKey]) {
            commissionsByMonth[monthKey] = { amount: 0, count: 0 };
          }
          commissionsByMonth[monthKey].amount += data.amount || 0;
          commissionsByMonth[monthKey].count++;
        }
      });

      // 4. Fetch all payouts from last 12 months
      const payoutsSnapshot = await getDocs(
        query(
          collection(db, "affiliate_payouts"),
          where("status", "in", ["paid", "completed"]),
          where("paidAt", ">=", Timestamp.fromDate(twelveMonthsAgo))
        )
      );

      // Index payouts by month
      const payoutsByMonth: Record<string, { amount: number; count: number }> = {};
      payoutsSnapshot.forEach((doc) => {
        const data = doc.data();
        const paidAt = data.paidAt?.toDate?.();
        if (paidAt) {
          const monthKey = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, "0")}`;
          if (!payoutsByMonth[monthKey]) {
            payoutsByMonth[monthKey] = { amount: 0, count: 0 };
          }
          payoutsByMonth[monthKey].amount += data.amount || 0;
          payoutsByMonth[monthKey].count++;
        }
      });

      // 5. Build monthly reports array
      const months: MonthlyReport[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
        const monthName = monthDate.toLocaleDateString("fr-FR", {
          month: "short",
          year: "2-digit",
        });

        const newAffiliates = affiliatesByMonth[monthKey] || 0;
        const newReferrals = referralsByMonth[monthKey] || 0;
        const commissions = commissionsByMonth[monthKey] || { amount: 0, count: 0 };
        const payouts = payoutsByMonth[monthKey] || { amount: 0, count: 0 };

        // Calculate conversion rate: referrals who generated at least one commission / total referrals
        const conversionRate = newReferrals > 0 ? (commissions.count / newReferrals) * 100 : 0;

        months.push({
          month: monthName,
          monthKey,
          newAffiliates,
          newReferrals,
          commissionsEarned: commissions.amount,
          commissionsCount: commissions.count,
          payoutsPaid: payouts.amount,
          payoutsCount: payouts.count,
          conversionRate: Math.min(conversionRate, 100), // Cap at 100%
        });
      }

      setMonthlyReports(months);

      // 6. Generate cohort data from real data
      const cohortData: CohortData[] = months.slice(-6).map((m) => {
        // Calculate retention: affiliates who are still active (have recent commissions)
        const retentionRate = m.newAffiliates > 0 ? Math.min((m.commissionsCount / m.newAffiliates) * 10, 100) : 0;

        return {
          cohort: m.month,
          affiliates: m.newAffiliates,
          totalReferrals: m.newReferrals,
          avgReferrals: m.newAffiliates > 0 ? m.newReferrals / m.newAffiliates : 0,
          totalEarned: m.commissionsEarned,
          avgEarned: m.newAffiliates > 0 ? m.commissionsEarned / m.newAffiliates : 0,
          retentionRate,
        };
      });
      setCohorts(cohortData);

      // 7. Build top performers list with real conversion rates
      const performers: TopPerformer[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.affiliateCode) {
          const referrals = data.affiliateStats?.totalReferrals || 0;
          const totalCommissions = data.affiliateStats?.totalCommissions || 0;
          // Conversion rate = commissions generated / referrals brought
          const conversionRate = referrals > 0 ? Math.min((totalCommissions / referrals) * 100, 100) : 0;

          performers.push({
            id: doc.id,
            name: data.displayName || `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.email,
            email: data.email,
            code: data.affiliateCode,
            referrals,
            earned: data.totalEarned || 0,
            conversionRate,
          });
        }
      });

      performers.sort((a, b) => b.earned - a.earned);
      setTopPerformers(performers.slice(0, 20));

      // 8. UTM sources - aggregate from referrals tracking data
      const utmData: Record<string, { signups: number; conversions: number; revenue: number }> = {};

      referralsSnapshot.forEach((doc) => {
        const data = doc.data();
        // UTM data is stored in tracking.utmSource (see onUserCreated trigger)
        const source = data.tracking?.utmSource || data.utmSource || "organic";
        if (!utmData[source]) {
          utmData[source] = { signups: 0, conversions: 0, revenue: 0 };
        }
        utmData[source].signups++;
        if (data.hasConverted || data.firstActionAt) {
          utmData[source].conversions++;
        }
        utmData[source].revenue += data.totalCommissions || 0;
      });

      const sources: UTMSource[] = Object.entries(utmData)
        .map(([source, data]) => ({
          source,
          signups: data.signups,
          conversions: data.conversions,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // If no UTM data, show a placeholder message via empty array
      setUtmSources(sources.length > 0 ? sources : []);
    } catch (err) {
      console.error("[AdminAffiliateReports] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, db]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const currentMonth = monthlyReports[monthlyReports.length - 1];
    const previousMonth = monthlyReports[monthlyReports.length - 2];

    const calculateChange = (current: number, previous: number) => {
      if (!previous) return 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalCommissions: monthlyReports.reduce((sum, m) => sum + m.commissionsEarned, 0),
      totalPayouts: monthlyReports.reduce((sum, m) => sum + m.payoutsPaid, 0),
      totalAffiliates: topPerformers.length,
      avgConversion: monthlyReports.reduce((sum, m) => sum + m.conversionRate, 0) / monthlyReports.length || 0,
      commissionsChange: currentMonth && previousMonth
        ? calculateChange(currentMonth.commissionsEarned, previousMonth.commissionsEarned)
        : 0,
      affiliatesChange: currentMonth && previousMonth
        ? calculateChange(currentMonth.newAffiliates, previousMonth.newAffiliates)
        : 0,
    };
  }, [monthlyReports, topPerformers]);

  // Export functions
  const exportMonthlyCSV = () => {
    const headers = [
      "Mois",
      "Nouveaux Affiliés",
      "Nouveaux Filleuls",
      "Commissions",
      "Nb Commissions",
      "Payouts",
      "Nb Payouts",
      "Taux Conversion %",
    ];

    const rows = monthlyReports.map((m) => [
      m.month,
      m.newAffiliates,
      m.newReferrals,
      (m.commissionsEarned / 100).toFixed(2),
      m.commissionsCount,
      (m.payoutsPaid / 100).toFixed(2),
      m.payoutsCount,
      m.conversionRate.toFixed(1),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport_affiliation_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportPerformersCSV = () => {
    const headers = ["Nom", "Email", "Code", "Filleuls", "Gains", "Taux Conversion %"];
    const rows = topPerformers.map((p) => [
      p.name,
      p.email,
      p.code,
      p.referrals,
      (p.earned / 100).toFixed(2),
      p.conversionRate.toFixed(1),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `top_affilies_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Loading
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
              Rapports Affiliation
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Analytics et performance du programme
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as typeof selectedPeriod)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
            >
              <option value="6m">6 derniers mois</option>
              <option value="12m">12 derniers mois</option>
              <option value="all">Tout</option>
            </select>
            <Button variant="outline" onClick={exportMonthlyCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button onClick={() => fetchReportData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportCard
            title="Commissions totales"
            value={formatCents(summaryStats.totalCommissions)}
            change={summaryStats.commissionsChange}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <ReportCard
            title="Payouts versés"
            value={formatCents(summaryStats.totalPayouts)}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <ReportCard
            title="Affiliés actifs"
            value={summaryStats.totalAffiliates}
            change={summaryStats.affiliatesChange}
            icon={<Users className="h-5 w-5" />}
          />
          <ReportCard
            title="Taux conversion moyen"
            value={`${summaryStats.avgConversion.toFixed(1)}%`}
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4">
            {[
              { id: "overview", label: "Vue d'ensemble", icon: BarChart3 },
              { id: "cohorts", label: "Cohorts", icon: Users },
              { id: "performers", label: "Top Performers", icon: TrendingUp },
              { id: "sources", label: "Sources UTM", icon: PieChart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commissions Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Évolution des commissions
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyReports}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${v / 100}€`} />
                    <Tooltip formatter={(v) => formatCents(v as number)} />
                    <Bar dataKey="commissionsEarned" name="Commissions" fill="#10b981" />
                    <Bar dataKey="payoutsPaid" name="Payouts" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Growth Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Croissance affiliés et filleuls
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyReports}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="newAffiliates"
                      name="Nouveaux affiliés"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="newReferrals"
                      name="Nouveaux filleuls"
                      stroke="#f59e0b"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "cohorts" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Analyse par Cohort (mois d'inscription)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cohort</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Affiliés</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Filleuls</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Moy. Filleuls</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Gagné</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Moy. Gagné</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rétention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {cohorts.map((cohort) => (
                    <tr key={cohort.cohort} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {cohort.cohort}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {cohort.affiliates}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {cohort.totalReferrals}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {cohort.avgReferrals.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {formatCents(cohort.totalEarned)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {formatCents(cohort.avgEarned)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${
                          cohort.retentionRate >= 70
                            ? "text-emerald-600"
                            : cohort.retentionRate >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}>
                          {cohort.retentionRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "performers" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top 20 Affiliés
              </h3>
              <Button variant="outline" size="small" onClick={exportPerformersCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affilié</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Filleuls</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Gagné</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {topPerformers.map((performer, index) => (
                    <tr key={performer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index === 0 ? "bg-amber-100 text-amber-700" :
                          index === 1 ? "bg-gray-200 text-gray-700" :
                          index === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{performer.name}</p>
                        <p className="text-xs text-gray-500">{performer.code}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {performer.referrals}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                        {formatCents(performer.earned)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                        {performer.conversionRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "sources" && (
          utmSources.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <PieChart className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucune donnée UTM disponible
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Les données de tracking UTM seront collectées automatiquement lorsque des utilisateurs
                s'inscriront via des liens de parrainage contenant des paramètres UTM
                (ex: ?ref=CODE&utm_source=youtube&utm_medium=video).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Répartition par source
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        data={utmSources as any}
                        dataKey="signups"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        label={(props: any) =>
                          `${props.name || props.source || ""} ${((props.percent || 0) * 100).toFixed(0)}%`
                        }
                      >
                        {utmSources.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Performance par UTM Source
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Inscriptions</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversions</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {utmSources.map((source, index) => (
                        <tr key={source.source} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="font-medium text-gray-900 dark:text-white capitalize">
                                {source.source}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                            {source.signups}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                            {source.conversions}
                            <span className="text-xs text-gray-400 ml-1">
                              ({source.signups > 0 ? ((source.conversions / source.signups) * 100).toFixed(1) : 0}%)
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600">
                            {formatCents(source.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAffiliateReports;
