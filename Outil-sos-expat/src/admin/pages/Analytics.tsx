/**
 * =============================================================================
 * ANALYTICS - Rapports et statistiques détaillés
 * =============================================================================
 *
 * Page d'analytiques pour les administrateurs avec :
 * - Évolution des dossiers dans le temps
 * - Performance des prestataires
 * - Répartition géographique
 * - Métriques IA
 *
 * =============================================================================
 */

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useLanguage } from "../../hooks/useLanguage";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";

// Icons
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Users,
  FolderOpen,
  Globe,
  Clock,
  CheckCircle,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface AnalyticsData {
  // Time series
  dossiersByMonth: { month: string; count: number; completed: number }[];
  dossiersByWeek: { week: string; count: number }[];

  // Provider metrics
  topProviders: { name: string; dossiers: number; completedRate: number }[];
  providersByType: { type: string; count: number }[];

  // Dossier metrics
  avgTimeToComplete: number | null; // in hours, null if no data
  completionRate: number;
  dossiersByStatus: { status: string; count: number }[];
  dossiersByCountry: { country: string; count: number }[];

  // Trend data (calculated from real data)
  completionRateTrend: number | null;
  avgTimeTrend: number | null;
  dossiersTrend: number | null;

  // Total dossiers in period
  totalDossiersInPeriod: number;
}

// Helper to get period date range
function getPeriodRange(period: "week" | "month" | "year"): { start: Date; end: Date; previousStart: Date; previousEnd: Date } {
  const now = new Date();
  const end = now;
  let start: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (period) {
    case "week":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousEnd = new Date(start.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      previousEnd = new Date(start.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      previousEnd = new Date(start.getTime() - 1);
      previousStart = new Date(previousEnd.getFullYear() - 1, previousEnd.getMonth(), previousEnd.getDate());
      break;
  }

  return { start, end, previousStart, previousEnd };
}

// =============================================================================
// COMPOSANTS
// =============================================================================

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-32 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{title}</p>
          </div>
          <div className="p-3 bg-gray-100 rounded-xl">
            <Icon className="w-6 h-6 text-gray-600" />
          </div>
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-3">
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
              {change >= 0 ? "+" : ""}{change}%
            </span>
            <span className="text-sm text-gray-500">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SimpleBarChart({
  data,
  loading,
}: {
  data: { label: string; value: number; secondary?: number }[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">{item.label}</span>
            <span className="text-gray-500">{item.value}</span>
          </div>
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-red-500 rounded-full transition-all"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
            {item.secondary !== undefined && (
              <div
                className="absolute left-0 top-0 h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(item.secondary / maxValue) * 100}%` }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusDistribution({
  data,
  loading,
}: {
  data: { status: string; count: number }[];
  loading?: boolean;
}) {
  const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    pending: { color: "bg-amber-500", icon: Clock, label: "En attente" },
    in_progress: { color: "bg-blue-500", icon: BarChart3, label: "En cours" },
    completed: { color: "bg-green-500", icon: CheckCircle, label: "Terminés" },
    cancelled: { color: "bg-gray-400", icon: Clock, label: "Annulés" },
  };

  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-full rounded-full" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex h-4 rounded-full overflow-hidden">
        {data.map((item) => {
          const config = statusConfig[item.status] || statusConfig.pending;
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div
              key={item.status}
              className={`${config.color} transition-all`}
              style={{ width: `${percentage}%` }}
              title={`${config.label}: ${item.count}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3">
        {data.map((item) => {
          const config = statusConfig[item.status] || statusConfig.pending;
          const Icon = config.icon;
          const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
          return (
            <div key={item.status} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${config.color}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">{config.label}</p>
                <p className="text-xs text-gray-500">{item.count} ({percentage}%)</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Analytics() {
  const { t } = useLanguage({ mode: "admin" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [data, setData] = useState<AnalyticsData>({
    dossiersByMonth: [],
    dossiersByWeek: [],
    topProviders: [],
    providersByType: [],
    avgTimeToComplete: null,
    completionRate: 0,
    dossiersByStatus: [],
    dossiersByCountry: [],
    completionRateTrend: null,
    avgTimeTrend: null,
    dossiersTrend: null,
    totalDossiersInPeriod: 0,
  });

  const loadData = useCallback(async (selectedPeriod: "week" | "month" | "year") => {
    try {
      const { start, end, previousStart, previousEnd } = getPeriodRange(selectedPeriod);

      // === DOSSIERS ===
      const dossiersSnap = await getDocs(
        query(collection(db, "bookings"), orderBy("createdAt", "desc"))
      );
      const allDossiers = dossiersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter dossiers by period
      const getDossierDate = (d: any): Date | null => {
        if (!d.createdAt) return null;
        return d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      };

      const dossiersInPeriod = allDossiers.filter((d: any) => {
        const date = getDossierDate(d);
        return date && date >= start && date <= end;
      });

      const dossiersInPreviousPeriod = allDossiers.filter((d: any) => {
        const date = getDossierDate(d);
        return date && date >= previousStart && date <= previousEnd;
      });

      // === PROVIDERS ===
      const providersSnap = await getDocs(collection(db, "sos_profiles"));
      const providers = providersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Group dossiers by month (always show 6 months for context)
      const monthMap = new Map<string, { count: number; completed: number }>();
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
        monthMap.set(key, { count: 0, completed: 0 });
      }

      allDossiers.forEach((d: any) => {
        const date = getDossierDate(d);
        if (!date) return;
        const key = date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
        const current = monthMap.get(key);
        if (current) {
          current.count++;
          if (d.status === "completed") current.completed++;
        }
      });

      const dossiersByMonth = Array.from(monthMap.entries()).map(([month, data]) => ({
        month,
        count: data.count,
        completed: data.completed,
      }));

      // Group dossiers by week (last 8 weeks)
      const weekMap = new Map<string, number>();
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - i * 7);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const key = `S${8 - i}`;

        const count = allDossiers.filter((d: any) => {
          const date = getDossierDate(d);
          return date && date >= weekStart && date < weekEnd;
        }).length;

        weekMap.set(key, count);
      }

      const dossiersByWeek = Array.from(weekMap.entries()).map(([week, count]) => ({
        week,
        count,
      }));

      // Provider metrics (filtered by period)
      const providerDossierCount = new Map<string, { name: string; total: number; completed: number }>();
      dossiersInPeriod.forEach((d: any) => {
        const providerId = d.providerId;
        if (!providerId) return;
        const current = providerDossierCount.get(providerId) || {
          name: d.providerName || "Prestataire",
          total: 0,
          completed: 0,
        };
        current.total++;
        if (d.status === "completed") current.completed++;
        providerDossierCount.set(providerId, current);
      });

      const topProviders = Array.from(providerDossierCount.values())
        .map((p) => ({
          name: p.name,
          dossiers: p.total,
          completedRate: p.total > 0 ? (p.completed / p.total) * 100 : 0,
        }))
        .sort((a, b) => b.dossiers - a.dossiers)
        .slice(0, 5);

      // Providers by type
      const typeMap = new Map<string, number>();
      providers.forEach((p: any) => {
        const type = p.type || p.role || "expat";
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });
      const providersByType = Array.from(typeMap.entries())
        .map(([type, count]) => ({ type, count }));

      // Dossiers by status (filtered by period)
      const statusMap = new Map<string, number>();
      dossiersInPeriod.forEach((d: any) => {
        const status = d.status || "pending";
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      const dossiersByStatus = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }));

      // Dossiers by country (filtered by period)
      const countryMap = new Map<string, number>();
      dossiersInPeriod.forEach((d: any) => {
        const country = d.clientCurrentCountry || d.country || "Non specifie";
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      });
      const dossiersByCountry = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Completion metrics (filtered by period)
      const completedDossiersInPeriod = dossiersInPeriod.filter((d: any) => d.status === "completed");
      const completionRate = dossiersInPeriod.length > 0
        ? (completedDossiersInPeriod.length / dossiersInPeriod.length) * 100
        : 0;

      // Previous period completion rate for trend
      const completedDossiersInPrevPeriod = dossiersInPreviousPeriod.filter((d: any) => d.status === "completed");
      const prevCompletionRate = dossiersInPreviousPeriod.length > 0
        ? (completedDossiersInPrevPeriod.length / dossiersInPreviousPeriod.length) * 100
        : 0;

      // Calculate completion rate trend
      const completionRateTrend = prevCompletionRate > 0
        ? Math.round(((completionRate - prevCompletionRate) / prevCompletionRate) * 100)
        : null;

      // Calculate dossiers count trend
      const dossiersTrend = dossiersInPreviousPeriod.length > 0
        ? Math.round(((dossiersInPeriod.length - dossiersInPreviousPeriod.length) / dossiersInPreviousPeriod.length) * 100)
        : null;

      // Calculate avg time to complete from real data
      const completedWithDates = completedDossiersInPeriod.filter((d: any) => {
        return d.createdAt && d.completedAt;
      });

      let avgTimeToComplete: number | null = null;
      let avgTimeTrend: number | null = null;

      if (completedWithDates.length > 0) {
        const totalHours = completedWithDates.reduce((sum: number, d: any) => {
          const createdAt = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
          const completedAt = d.completedAt.toDate ? d.completedAt.toDate() : new Date(d.completedAt);
          const hours = (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);
        avgTimeToComplete = Math.round(totalHours / completedWithDates.length);

        // Calculate previous period avg time
        const prevCompletedWithDates = completedDossiersInPrevPeriod.filter((d: any) => {
          return d.createdAt && d.completedAt;
        });

        if (prevCompletedWithDates.length > 0) {
          const prevTotalHours = prevCompletedWithDates.reduce((sum: number, d: any) => {
            const createdAt = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
            const completedAt = d.completedAt.toDate ? d.completedAt.toDate() : new Date(d.completedAt);
            const hours = (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
            return sum + hours;
          }, 0);
          const prevAvgTime = prevTotalHours / prevCompletedWithDates.length;
          // Negative trend is good for time (less time = better)
          avgTimeTrend = Math.round(((avgTimeToComplete - prevAvgTime) / prevAvgTime) * 100);
        }
      }

      setData({
        dossiersByMonth,
        dossiersByWeek,
        topProviders,
        providersByType,
        avgTimeToComplete,
        completionRate,
        dossiersByStatus,
        dossiersByCountry,
        completionRateTrend,
        avgTimeTrend,
        dossiersTrend,
        totalDossiersInPeriod: dossiersInPeriod.length,
      });
    } catch (error) {
      console.error("[Analytics] Error loading data:", error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadData(period);
      setLoading(false);
    };
    init();
  }, [loadData, period]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(period);
    setRefreshing(false);
  };

  // Export analytics data to CSV
  const handleExport = useCallback(() => {
    const exportPeriodLabels = {
      week: "7_jours",
      month: "30_jours",
      year: "12_mois",
    };

    // Build CSV content
    const lines: string[] = [];

    // Header
    lines.push(`Rapport Analytiques SOS Expat - ${new Date().toLocaleDateString("fr-FR")}`);
    lines.push(`Periode: ${exportPeriodLabels[period]}`);
    lines.push("");

    // KPIs
    lines.push("=== INDICATEURS CLES ===");
    lines.push(`Taux de completion;${data.completionRate.toFixed(1)}%`);
    lines.push(`Temps moyen traitement;${data.avgTimeToComplete !== null ? `${data.avgTimeToComplete}h` : "N/A"}`);
    lines.push(`Prestataires actifs;${data.providersByType.reduce((sum, p) => sum + p.count, 0)}`);
    lines.push(`Dossiers sur la periode;${data.totalDossiersInPeriod}`);
    lines.push("");

    // Dossiers by status
    lines.push("=== REPARTITION PAR STATUT ===");
    lines.push("Statut;Nombre");
    data.dossiersByStatus.forEach((item) => {
      const statusLabels: Record<string, string> = {
        pending: "En attente",
        in_progress: "En cours",
        completed: "Termines",
        cancelled: "Annules",
      };
      lines.push(`${statusLabels[item.status] || item.status};${item.count}`);
    });
    lines.push("");

    // Dossiers by country
    lines.push("=== DOSSIERS PAR PAYS ===");
    lines.push("Pays;Nombre");
    data.dossiersByCountry.forEach((item) => {
      lines.push(`${item.country};${item.count}`);
    });
    lines.push("");

    // Top providers
    lines.push("=== TOP PRESTATAIRES ===");
    lines.push("Prestataire;Dossiers;Taux completion");
    data.topProviders.forEach((item) => {
      lines.push(`${item.name};${item.dossiers};${item.completedRate.toFixed(0)}%`);
    });
    lines.push("");

    // Monthly evolution
    lines.push("=== EVOLUTION MENSUELLE ===");
    lines.push("Mois;Total;Completes");
    data.dossiersByMonth.forEach((item) => {
      lines.push(`${item.month};${item.count};${item.completed}`);
    });

    // Create and download CSV file
    const csvContent = lines.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytiques_sos_expat_${exportPeriodLabels[period]}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, period]);

  // Period labels for display
  const periodLabels: Record<typeof period, string> = {
    week: "7 jours",
    month: "30 jours",
    year: "12 mois",
  };

  const periodLabel = `vs periode precedente`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytiques</h1>
          <p className="text-gray-500 mt-1">
            Rapports et statistiques détaillés de la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-500">Période :</span>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { value: "week", label: "7 jours" },
            { value: "month", label: "30 jours" },
            { value: "year", label: "12 mois" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value as typeof period)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                period === option.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Taux de completion"
          value={`${data.completionRate.toFixed(1)}%`}
          change={data.completionRateTrend ?? undefined}
          changeLabel={periodLabel}
          icon={CheckCircle}
          loading={loading}
        />
        <MetricCard
          title="Temps moyen traitement"
          value={data.avgTimeToComplete !== null ? `${data.avgTimeToComplete}h` : "N/A"}
          change={data.avgTimeTrend !== null ? -data.avgTimeTrend : undefined}
          changeLabel={data.avgTimeTrend !== null ? periodLabel : undefined}
          icon={Clock}
          loading={loading}
        />
        <MetricCard
          title="Prestataires actifs"
          value={data.providersByType.reduce((sum, p) => sum + p.count, 0)}
          icon={Users}
          loading={loading}
        />
        <MetricCard
          title={`Dossiers (${periodLabels[period]})`}
          value={data.totalDossiersInPeriod}
          change={data.dossiersTrend ?? undefined}
          changeLabel={data.dossiersTrend !== null ? periodLabel : undefined}
          icon={FolderOpen}
          loading={loading}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5 text-gray-500" />
              Évolution mensuelle des dossiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={data.dossiersByMonth.map((d) => ({
                label: d.month,
                value: d.count,
                secondary: d.completed,
              }))}
              loading={loading}
            />
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-gray-600">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-gray-600">Complétés</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              Répartition par statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDistribution data={data.dossiersByStatus} loading={loading} />
          </CardContent>
        </Card>

        {/* Top providers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-gray-500" />
              Top prestataires
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data.topProviders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {data.topProviders.map((provider, index) => (
                  <div key={provider.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{provider.name}</p>
                      <p className="text-sm text-gray-500">
                        {provider.dossiers} dossiers • {provider.completedRate.toFixed(0)}% complétés
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By country */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-5 h-5 text-gray-500" />
              Dossiers par pays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={data.dossiersByCountry.map((d) => ({
                label: d.country,
                value: d.count,
              }))}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
