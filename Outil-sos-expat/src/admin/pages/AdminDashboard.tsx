/**
 * =============================================================================
 * DASHBOARD ADMIN - Vue d'ensemble pour piloter la plateforme
 * =============================================================================
 *
 * Dashboard principal pour les administrateurs avec :
 * - KPIs principaux (prestataires, dossiers, revenus)
 * - Répartition par pays et par type
 * - Activité récente
 * - Statut de l'IA
 * - Alertes et actions rapides
 *
 * =============================================================================
 */

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  getDocs,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useLanguage } from "../../hooks/useLanguage";
import { Link } from "react-router-dom";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";

// Icons
import {
  Users,
  FolderOpen,
  TrendingUp,
  Globe,
  Scale,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  MapPin,
  Languages,
  Activity,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface DashboardData {
  // Prestataires
  totalProviders: number;
  activeProviders: number;
  lawyerCount: number;
  expatCount: number;
  providersByCountry: { country: string; count: number }[];
  providersByLanguage: { language: string; count: number }[];

  // Dossiers
  totalDossiers: number;
  pendingDossiers: number;
  inProgressDossiers: number;
  completedDossiers: number;
  recentDossiers: RecentDossier[];

  // IA
  aiRequestsThisMonth: number;
  aiQuotaUsed: number;

  // Activité
  newProvidersThisWeek: number;
  newDossiersThisWeek: number;
}

interface RecentDossier {
  id: string;
  title?: string;
  status: string;
  providerType?: string;
  clientName?: string;
  createdAt?: Timestamp;
}

// =============================================================================
// COMPOSANTS
// =============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "red",
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: "red" | "blue" | "green" | "purple" | "amber";
  loading?: boolean;
}) {
  const colorClasses = {
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className={`w-4 h-4 ${trend.value >= 0 ? "text-green-500" : "text-red-500"}`} />
                <span className={`text-sm font-medium ${trend.value >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {trend.value >= 0 ? "+" : ""}{trend.value}%
                </span>
                <span className="text-sm text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DistributionCard({
  title,
  icon: Icon,
  data,
  loading,
  emptyMessage,
}: {
  title: string;
  icon: React.ElementType;
  data: { label: string; count: number; color?: string }[];
  loading?: boolean;
  emptyMessage: string;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500", "bg-cyan-500"];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="w-5 h-5 text-gray-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {data.slice(0, 6).map((item, index) => {
              const percentage = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-500">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${colors[index % colors.length]}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentDossiersList({
  dossiers,
  loading,
  t,
}: {
  dossiers: RecentDossier[];
  loading?: boolean;
  t: (key: string) => string;
}) {
  const statusConfig: Record<string, { color: string; icon: React.ElementType }> = {
    pending: { color: "text-amber-600 bg-amber-50", icon: Clock },
    in_progress: { color: "text-blue-600 bg-blue-50", icon: Activity },
    completed: { color: "text-green-600 bg-green-50", icon: CheckCircle },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderOpen className="w-5 h-5 text-gray-500" />
          {t("admin:dashboard.recentDossiers.title")}
        </CardTitle>
        <Link to="/admin/dossiers">
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
            {t("common:actions.viewAll")}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {dossiers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            {t("admin:dashboard.recentDossiers.none")}
          </p>
        ) : (
          <div className="space-y-2">
            {dossiers.map((dossier) => {
              const config = statusConfig[dossier.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <Link
                  key={dossier.id}
                  to={`/admin/dossier/${dossier.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${dossier.providerType === "lawyer" ? "bg-blue-50" : "bg-green-50"}`}>
                      {dossier.providerType === "lawyer" ? (
                        <Scale className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Globe className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">
                        {dossier.title || `Dossier #${dossier.id.slice(0, 8)}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {dossier.clientName || "Client"}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {t(`common:status.${dossier.status === "in_progress" ? "inProgress" : dossier.status}`)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIStatusCard({
  requestsThisMonth,
  quotaUsed,
  loading,
  t,
}: {
  requestsThisMonth: number;
  quotaUsed: number;
  loading?: boolean;
  t: (key: string) => string;
}) {
  const quotaMax = 10000;
  const usagePercent = (quotaUsed / quotaMax) * 100;
  const isWarning = usagePercent > 80;
  const isCritical = usagePercent > 95;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-purple-500" />
          {t("admin:dashboard.iaStatus.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-green-500"
          }`} />
          <span className={`text-sm font-medium ${
            isCritical ? "text-red-600" : isWarning ? "text-amber-600" : "text-green-600"
          }`}>
            {isCritical
              ? t("admin:dashboard.iaStatus.critical")
              : isWarning
              ? t("admin:dashboard.iaStatus.warning")
              : t("admin:dashboard.iaStatus.operational")}
          </span>
        </div>

        {/* Usage bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">{t("admin:dashboard.iaStatus.usage")}</span>
            <span className="font-medium">{requestsThisMonth.toLocaleString()} / {quotaMax.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${
                isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-purple-500"
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {usagePercent.toFixed(1)}% {t("admin:dashboard.iaStatus.percent").replace("{{percent}}", "")}
          </p>
        </div>

        {/* Link to AI config */}
        <Link to="/admin/ia">
          <Button variant="outline" size="sm" className="w-full">
            {t("admin:sidebar.nav.aiSettings")}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function AlertsCard({
  inactiveProviders,
  oldPendingDossiers,
  loading,
  t,
}: {
  inactiveProviders: number;
  oldPendingDossiers: number;
  loading?: boolean;
  t: (key: string) => string;
}) {
  const hasAlerts = inactiveProviders > 0 || oldPendingDossiers > 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={hasAlerts ? "border-amber-200 bg-amber-50/30" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className={`w-5 h-5 ${hasAlerts ? "text-amber-500" : "text-gray-400"}`} />
          Alertes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAlerts ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Aucune alerte</span>
          </div>
        ) : (
          <div className="space-y-2">
            {inactiveProviders > 0 && (
              <div className="flex items-center justify-between p-2 bg-amber-100 rounded-lg">
                <span className="text-sm text-amber-800">
                  {inactiveProviders} prestataire(s) inactif(s)
                </span>
                <Link to="/admin/prestataires">
                  <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-800">
                    Voir
                  </Button>
                </Link>
              </div>
            )}
            {oldPendingDossiers > 0 && (
              <div className="flex items-center justify-between p-2 bg-amber-100 rounded-lg">
                <span className="text-sm text-amber-800">
                  {oldPendingDossiers} dossier(s) en attente depuis +48h
                </span>
                <Link to="/admin/dossiers">
                  <Button variant="ghost" size="sm" className="text-amber-700 hover:text-amber-800">
                    Voir
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AdminDashboard() {
  const { t } = useLanguage({ mode: "admin" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData>({
    totalProviders: 0,
    activeProviders: 0,
    lawyerCount: 0,
    expatCount: 0,
    providersByCountry: [],
    providersByLanguage: [],
    totalDossiers: 0,
    pendingDossiers: 0,
    inProgressDossiers: 0,
    completedDossiers: 0,
    recentDossiers: [],
    aiRequestsThisMonth: 0,
    aiQuotaUsed: 0,
    newProvidersThisWeek: 0,
    newDossiersThisWeek: 0,
  });

  // Load dashboard data
  const loadData = useCallback(async () => {
    try {
      // === PROVIDERS ===
      const providersSnap = await getDocs(collection(db, "sos_profiles"));
      const providers = providersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const totalProviders = providers.length;
      const activeProviders = providers.filter((p: any) => p.hasToolAccess === true).length;
      const lawyerCount = providers.filter((p: any) => p.type === "lawyer" || p.role === "lawyer").length;
      const expatCount = totalProviders - lawyerCount;

      // Group by country
      const countryMap = new Map<string, number>();
      providers.forEach((p: any) => {
        const country = p.country || p.currentCountry || "Non spécifié";
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      });
      const providersByCountry = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      // Group by language
      const languageMap = new Map<string, number>();
      providers.forEach((p: any) => {
        const languages = p.languages || p.languagesSpoken || [];
        languages.forEach((lang: string) => {
          languageMap.set(lang, (languageMap.get(lang) || 0) + 1);
        });
      });
      const providersByLanguage = Array.from(languageMap.entries())
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count);

      // === DOSSIERS ===
      const dossiersSnap = await getDocs(collection(db, "bookings"));
      const dossiers = dossiersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const totalDossiers = dossiers.length;
      const pendingDossiers = dossiers.filter((d: any) => d.status === "pending").length;
      const inProgressDossiers = dossiers.filter((d: any) => d.status === "in_progress").length;
      const completedDossiers = dossiers.filter((d: any) => d.status === "completed").length;

      // Recent dossiers
      const recentDossiersQuery = query(
        collection(db, "bookings"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const recentSnap = await getDocs(recentDossiersQuery);
      const recentDossiers = recentSnap.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        status: doc.data().status || "pending",
        providerType: doc.data().providerType,
        clientName: doc.data().clientName || doc.data().clientFirstName,
        createdAt: doc.data().createdAt,
      })) as RecentDossier[];

      // === AI USAGE ===
      let aiRequestsThisMonth = 0;
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const aiQuery = query(
          collection(db, "conversations"),
          where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
        );
        const aiSnap = await getDocs(aiQuery);
        aiRequestsThisMonth = aiSnap.size;
      } catch {
        // Collection may not exist
      }

      // === WEEKLY STATS ===
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekTimestamp = Timestamp.fromDate(oneWeekAgo);

      const newProvidersThisWeek = providers.filter((p: any) => {
        if (!p.createdAt) return false;
        return p.createdAt.toDate() >= oneWeekAgo;
      }).length;

      const newDossiersThisWeek = dossiers.filter((d: any) => {
        if (!d.createdAt) return false;
        const createdAt = d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
        return createdAt >= oneWeekAgo;
      }).length;

      setData({
        totalProviders,
        activeProviders,
        lawyerCount,
        expatCount,
        providersByCountry,
        providersByLanguage,
        totalDossiers,
        pendingDossiers,
        inProgressDossiers,
        completedDossiers,
        recentDossiers,
        aiRequestsThisMonth,
        aiQuotaUsed: aiRequestsThisMonth,
        newProvidersThisWeek,
        newDossiersThisWeek,
      });
    } catch (error) {
      console.error("[AdminDashboard] Error loading data:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };
    init();
  }, [loadData]);

  // Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("admin:dashboard.title")}
          </h1>
          <p className="text-gray-500 mt-1">
            {t("admin:dashboard.description")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {t("common:actions.refresh")}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Prestataires actifs"
          value={data.activeProviders}
          subtitle={`${data.totalProviders} inscrits au total`}
          icon={Users}
          color="blue"
          trend={{ value: data.newProvidersThisWeek, label: "cette semaine" }}
          loading={loading}
        />
        <StatCard
          title="Dossiers en cours"
          value={data.pendingDossiers + data.inProgressDossiers}
          subtitle={`${data.totalDossiers} au total`}
          icon={FolderOpen}
          color="amber"
          trend={{ value: data.newDossiersThisWeek, label: "cette semaine" }}
          loading={loading}
        />
        <StatCard
          title="Avocats"
          value={data.lawyerCount}
          subtitle="prestataires juridiques"
          icon={Scale}
          color="purple"
          loading={loading}
        />
        <StatCard
          title="Experts Expat"
          value={data.expatCount}
          subtitle="accompagnateurs"
          icon={Globe}
          color="green"
          loading={loading}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Distribution by country and language */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DistributionCard
              title="Prestataires par pays"
              icon={MapPin}
              data={data.providersByCountry.map((item) => ({
                label: item.country,
                count: item.count,
              }))}
              loading={loading}
              emptyMessage="Aucun pays enregistré"
            />
            <DistributionCard
              title="Langues parlées"
              icon={Languages}
              data={data.providersByLanguage.map((item) => ({
                label: item.language.toUpperCase(),
                count: item.count,
              }))}
              loading={loading}
              emptyMessage="Aucune langue enregistrée"
            />
          </div>

          {/* Recent dossiers */}
          <RecentDossiersList
            dossiers={data.recentDossiers}
            loading={loading}
            t={t}
          />
        </div>

        {/* Right column - Status cards */}
        <div className="space-y-6">
          <AIStatusCard
            requestsThisMonth={data.aiRequestsThisMonth}
            quotaUsed={data.aiQuotaUsed}
            loading={loading}
            t={t}
          />
          <AlertsCard
            inactiveProviders={data.totalProviders - data.activeProviders}
            oldPendingDossiers={0}
            loading={loading}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}
