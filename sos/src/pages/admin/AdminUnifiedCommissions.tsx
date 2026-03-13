/**
 * AdminUnifiedCommissions — Phase 9.1-9.2
 *
 * Unified commission system admin dashboard.
 * Tabs: Overview, Plans, Commissions, User Override
 */

import React, { useState, useEffect, useCallback } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { httpsCallable } from "firebase/functions";
import { functionsAffiliate } from "@/config/firebase";
import {
  LayoutDashboard,
  FileText,
  List,
  UserCog,
  RefreshCw,
  Search,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Check,
  AlertTriangle,
  Eye,
  Lock,
  Unlock,
  XCircle,
  Clock,
  CheckCircle,
  Banknote,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Percent,
  Shield,
  Download,
} from "lucide-react";

// ============================================================================
// UI TOKENS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardFlat: "bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl",
  button: {
    primary: "px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium text-sm hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all",
    secondary: "px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 rounded-lg font-medium text-sm hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50 transition-all",
    danger: "px-4 py-2 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 disabled:opacity-50 transition-all",
    icon: "p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors",
  },
  input: "w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all",
  select: "px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all",
  badge: {
    success: "px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
    warning: "px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
    danger: "px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
    info: "px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
    neutral: "px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400",
  },
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
  tab: (active: boolean) =>
    `px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
      active
        ? "bg-indigo-600 text-white shadow-md"
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
    }`,
};

// ============================================================================
// TYPES
// ============================================================================

type Tab = "overview" | "plans" | "commissions" | "user" | "migration";

interface DashboardStats {
  total: number;
  totalAmount: number;
  byStatus: Record<string, { count: number; amount: number }>;
  byType: Record<string, { count: number; amount: number }>;
  byRole: Record<string, { count: number; amount: number }>;
}

interface SystemConfig {
  enabled?: boolean;
  shadowMode?: boolean;
}

interface PlanSummary {
  id: string;
  name: string;
  description: string;
  targetRoles: string[];
  isDefault: boolean;
  version: number;
}

interface CommissionRow {
  id: string;
  referrerId: string;
  referrerRole: string;
  referrerCode: string;
  refereeId: string;
  type: string;
  subType?: string;
  amount: number;
  status: string;
  createdAt: string;
  sourceId?: string;
}

interface UserCommissionSummary {
  totalEarned: number;
  pendingBalance: number;
  availableBalance: number;
  paidTotal: number;
  cancelledTotal: number;
  commissionCount: number;
}

interface UserInfo {
  email: string;
  firstName?: string;
  role?: string;
  affiliateCode?: string;
  commissionPlanId?: string | null;
  lockedRates?: Record<string, number> | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const STATUS_BADGES: Record<string, { badge: string; icon: React.ReactNode; label: string }> = {
  available: { badge: UI.badge.success, icon: <CheckCircle className="w-3 h-3" />, label: "Available" },
  held: { badge: UI.badge.warning, icon: <Clock className="w-3 h-3" />, label: "Held" },
  pending: { badge: UI.badge.warning, icon: <Clock className="w-3 h-3" />, label: "Pending" },
  paid: { badge: UI.badge.info, icon: <Banknote className="w-3 h-3" />, label: "Paid" },
  cancelled: { badge: UI.badge.danger, icon: <XCircle className="w-3 h-3" />, label: "Cancelled" },
};

const ROLE_LABELS: Record<string, string> = {
  chatter: "Chatter",
  influencer: "Influencer",
  blogger: "Blogger",
  groupAdmin: "Group Admin",
  lawyer: "Avocat",
  expat: "Expat",
  partner: "Partenaire",
  affiliate: "Affilié",
};

const TYPE_LABELS: Record<string, string> = {
  client_call: "Appel client",
  recruitment_call: "Appel recrue",
  signup_bonus: "Bonus inscription",
  activation_bonus: "Bonus activation",
  provider_recruitment: "Recrutement prestataire",
  recruit_bonus: "Bonus recrue",
  n1_recruit_bonus: "Bonus N1",
  subscription_commission: "Abonnement",
  subscription_renewal: "Renouvellement",
  captain_call: "Appel capitaine",
  captain_tier_bonus: "Bonus palier capitaine",
  captain_quality_bonus: "Bonus qualité capitaine",
  referral_milestone: "Palier filleuls",
  manual_adjustment: "Ajustement manuel",
};

// ============================================================================
// CALLABLE WRAPPERS
// ============================================================================

// Admin callables (us-central1)
const callAdminListPlans = () =>
  httpsCallable<{ role?: string }, { success: boolean; plans: PlanSummary[] }>(functionsAffiliate, "adminListCommissionPlans")();
const callAdminGetPlan = (planId: string) =>
  httpsCallable<{ planId: string }, { success: boolean; plan: Record<string, unknown> }>(functionsAffiliate, "adminGetCommissionPlan")({ planId });
const callAdminCreatePlan = (plan: Record<string, unknown>) =>
  httpsCallable<{ plan: Record<string, unknown> }, { success: boolean; plan: PlanSummary }>(functionsAffiliate, "adminCreateCommissionPlan")({ plan });
const callAdminUpdatePlan = (planId: string, updates: Record<string, unknown>, expectedVersion?: number) =>
  httpsCallable<{ planId: string; updates: Record<string, unknown>; expectedVersion?: number }, { success: boolean }>(functionsAffiliate, "adminUpdateCommissionPlan")({ planId, updates, expectedVersion });
const callAdminDeletePlan = (planId: string) =>
  httpsCallable<{ planId: string }, { success: boolean }>(functionsAffiliate, "adminDeleteCommissionPlan")({ planId });
const callAdminAssignPlan = (userId: string, planId: string) =>
  httpsCallable<{ userId: string; planId: string }, { success: boolean }>(functionsAffiliate, "adminAssignPlanToUser")({ userId, planId });
const callAdminRemovePlan = (userId: string) =>
  httpsCallable<{ userId: string }, { success: boolean }>(functionsAffiliate, "adminRemovePlanFromUser")({ userId });
const callAdminSetLockedRates = (userId: string, rates: Record<string, number>) =>
  httpsCallable<{ userId: string; rates: Record<string, number> }, { success: boolean }>(functionsAffiliate, "adminSetUserLockedRates")({ userId, rates });
const callAdminSetDiscount = (userId: string, discountConfig: Record<string, unknown>) =>
  httpsCallable<{ userId: string; discountConfig: Record<string, unknown> }, { success: boolean }>(functionsAffiliate, "adminSetUserDiscountConfig")({ userId, discountConfig });

// Dashboard callables (us-central1)
const callListCommissions = (params: Record<string, unknown>) =>
  httpsCallable<Record<string, unknown>, { success: boolean; commissions: CommissionRow[]; count: number }>(functionsAffiliate, "adminListUnifiedCommissions")(params);
const callUserSummary = (userId: string) =>
  httpsCallable<{ userId: string }, { success: boolean; summary: UserCommissionSummary; userInfo: UserInfo | null }>(functionsAffiliate, "adminGetUserCommissionSummary")({ userId });
const callCancelCommission = (commissionId: string, reason: string) =>
  httpsCallable<{ commissionId: string; reason: string }, { success: boolean }>(functionsAffiliate, "adminCancelCommission")({ commissionId, reason });
const callReleaseCommission = (commissionId: string) =>
  httpsCallable<{ commissionId: string }, { success: boolean }>(functionsAffiliate, "adminReleaseHeldCommission")({ commissionId });
const callDashboardStats = (sinceDays?: number) =>
  httpsCallable<{ sinceDays?: number }, { success: boolean; stats: DashboardStats; systemConfig: SystemConfig }>(functionsAffiliate, "adminGetUnifiedDashboardStats")({ sinceDays });
const callShadowStats = (sinceDays?: number) =>
  httpsCallable<{ sinceDays?: number }, { success: boolean; stats: Record<string, number>; recentComparisons: Record<string, unknown>[] }>(functionsAffiliate, "adminGetUnifiedShadowStats")({ sinceDays });
const callToggleSystem = (params: { enabled?: boolean; shadowMode?: boolean }) =>
  httpsCallable<{ enabled?: boolean; shadowMode?: boolean }, { success: boolean; config: SystemConfig }>(functionsAffiliate, "adminToggleUnifiedSystem")(params);

// Migration callables (us-central1)
const callMigrationStatus = () =>
  httpsCallable<void, { success: boolean; plans: Record<string, unknown>; affiliates: Record<string, unknown>; referrals: Record<string, unknown>; systemConfig: unknown; recentReports: Record<string, unknown>[] }>(functionsAffiliate, "adminGetMigrationStatus")();
const callSeedPlans = (dryRun?: boolean) =>
  httpsCallable<{ dryRun?: boolean }, { success: boolean; created: number; existing: number; total: number }>(functionsAffiliate, "adminSeedDefaultPlans")({ dryRun });
const callMigrateCodes = (dryRun?: boolean) =>
  httpsCallable<{ dryRun?: boolean; batchSize?: number }, { success: boolean; total: number; migrated: number; skipped: number; errors: number }>(functionsAffiliate, "adminMigrateAffiliateCodes")({ dryRun, batchSize: 100 });
const callMigrateReferrals = (dryRun?: boolean) =>
  httpsCallable<{ dryRun?: boolean; batchSize?: number }, { success: boolean; total: number; migrated: number; skipped: number; errors: number }>(functionsAffiliate, "adminMigrateReferrals")({ dryRun, batchSize: 100 });

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminUnifiedCommissions: React.FC = () => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const TABS: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "overview", icon: <LayoutDashboard className="w-4 h-4" />, label: "Vue d'ensemble" },
    { key: "plans", icon: <FileText className="w-4 h-4" />, label: "Plans" },
    { key: "commissions", icon: <List className="w-4 h-4" />, label: "Commissions" },
    { key: "user", icon: <UserCog className="w-4 h-4" />, label: "Utilisateur" },
    { key: "migration", icon: <Download className="w-4 h-4" />, label: "Migration" },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-right ${
            toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            <FormattedMessage id="admin.unified.title" defaultMessage="Commissions unifiées" />
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <FormattedMessage id="admin.unified.subtitle" defaultMessage="Système unifié de commissions d'affiliation" />
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={UI.tab(activeTab === tab.key)}
          >
            <span className="flex items-center gap-2">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab showToast={showToast} />}
      {activeTab === "plans" && <PlansTab showToast={showToast} />}
      {activeTab === "commissions" && <CommissionsTab showToast={showToast} />}
      {activeTab === "user" && <UserTab showToast={showToast} />}
      {activeTab === "migration" && <MigrationTab showToast={showToast} />}
    </div>
  );
};

// ============================================================================
// TAB 1: OVERVIEW
// ============================================================================

const OverviewTab: React.FC<{ showToast: (t: "success" | "error", m: string) => void }> = ({ showToast }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [shadowStats, setShadowStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [sinceDays, setSinceDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, shadowRes] = await Promise.all([
        callDashboardStats(sinceDays),
        callShadowStats(7),
      ]);
      setStats(dashRes.data.stats);
      setSystemConfig(dashRes.data.systemConfig);
      setShadowStats(shadowRes.data.stats);
    } catch (err) {
      showToast("error", "Erreur lors du chargement des stats");
    } finally {
      setLoading(false);
    }
  }, [sinceDays, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = useCallback(async (field: "enabled" | "shadowMode") => {
    if (!systemConfig) return;
    setToggling(true);
    try {
      const newValue = !systemConfig[field];
      const res = await callToggleSystem({ [field]: newValue });
      setSystemConfig(res.data.config);
      showToast("success", `${field === "enabled" ? "Système" : "Shadow mode"} ${newValue ? "activé" : "désactivé"}`);
    } catch {
      showToast("error", "Erreur lors du changement de configuration");
    } finally {
      setToggling(false);
    }
  }, [systemConfig, showToast]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`${UI.card} p-5`}>
              <div className={`${UI.skeleton} h-4 w-24 mb-3`} />
              <div className={`${UI.skeleton} h-8 w-16`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Controls */}
      <div className={`${UI.card} p-5`}>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-500" />
          Configuration système
        </h3>
        <div className="flex flex-wrap gap-6">
          <button
            onClick={() => handleToggle("enabled")}
            disabled={toggling}
            className="flex items-center gap-3 group"
          >
            {systemConfig?.enabled ? (
              <ToggleRight className="w-8 h-8 text-emerald-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-400" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Système unifié</p>
              <p className="text-xs text-gray-400">
                {systemConfig?.enabled ? "Actif — commissions calculées" : "Inactif — aucune commission créée"}
              </p>
            </div>
          </button>
          <button
            onClick={() => handleToggle("shadowMode")}
            disabled={toggling}
            className="flex items-center gap-3 group"
          >
            {systemConfig?.shadowMode ? (
              <ToggleRight className="w-8 h-8 text-amber-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-400" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Shadow mode</p>
              <p className="text-xs text-gray-400">
                {systemConfig?.shadowMode ? "Activé — calcule sans écrire" : "Désactivé — écritures réelles"}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3">
        <select
          value={sinceDays}
          onChange={(e) => setSinceDays(Number(e.target.value))}
          className={UI.select}
        >
          <option value={7}>7 jours</option>
          <option value={30}>30 jours</option>
          <option value={90}>90 jours</option>
        </select>
        <button onClick={fetchData} className={UI.button.icon}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={<List className="w-5 h-5" />}
            label="Total commissions"
            value={stats.total}
            color="blue"
          />
          <KPICard
            icon={<DollarSign className="w-5 h-5" />}
            label="Montant total"
            value={fmt(stats.totalAmount)}
            color="green"
          />
          <KPICard
            icon={<Clock className="w-5 h-5" />}
            label="En attente"
            value={stats.byStatus?.held?.count || 0}
            subValue={fmt(stats.byStatus?.held?.amount || 0)}
            color="amber"
          />
          <KPICard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Disponibles"
            value={stats.byStatus?.available?.count || 0}
            subValue={fmt(stats.byStatus?.available?.amount || 0)}
            color="emerald"
          />
        </div>
      )}

      {/* By type and by role */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By type */}
          <div className={`${UI.card} p-5`}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Par type</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(stats.byType)
                .sort(([, a], [, b]) => b.amount - a.amount)
                .map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                    <span className="text-xs text-gray-600 dark:text-gray-300">{TYPE_LABELS[type] || type}</span>
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-100">
                      {data.count} — {fmt(data.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* By role */}
          <div className={`${UI.card} p-5`}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Par rôle</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(stats.byRole)
                .sort(([, a], [, b]) => b.amount - a.amount)
                .map(([role, data]) => (
                  <div key={role} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                    <span className="text-xs text-gray-600 dark:text-gray-300">{ROLE_LABELS[role] || role}</span>
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-100">
                      {data.count} — {fmt(data.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Shadow stats */}
      {shadowStats && (
        <div className={`${UI.card} p-5`}>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-500" />
            Shadow mode — 7 derniers jours
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total", value: shadowStats.total || 0, color: "text-gray-600" },
              { label: "Match", value: shadowStats.matches || 0, color: "text-emerald-600" },
              { label: "Mismatch", value: shadowStats.mismatches || 0, color: "text-red-600" },
              { label: "Shadow only", value: shadowStats.shadowOnly || 0, color: "text-amber-600" },
              { label: "Erreurs", value: shadowStats.errors || 0, color: "text-red-600" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// KPI Card sub-component
// ============================================================================

const KPICard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}> = ({ icon, label, value, subValue, color }) => {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    green: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
    amber: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
    emerald: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
    red: "text-red-500 bg-red-50 dark:bg-red-900/20",
    purple: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
  };

  return (
    <div className={`${UI.card} p-5`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.blue}`}>{icon}</div>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
      {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
    </div>
  );
};

// ============================================================================
// TAB 2: PLANS
// ============================================================================

const PlansTab: React.FC<{ showToast: (t: "success" | "error", m: string) => void }> = ({ showToast }) => {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAdminListPlans();
      setPlans(res.data.plans || []);
    } catch {
      showToast("error", "Erreur lors du chargement des plans");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleDelete = useCallback(async (planId: string, planName: string) => {
    if (!confirm(`Supprimer le plan "${planName}" ? Cette action est irréversible.`)) return;
    try {
      await callAdminDeletePlan(planId);
      showToast("success", `Plan "${planName}" supprimé`);
      fetchPlans();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      showToast("error", msg);
    }
  }, [showToast, fetchPlans]);

  const handleSave = useCallback(async () => {
    if (!editingPlan) return;
    setSaving(true);
    try {
      if (creating) {
        await callAdminCreatePlan(editingPlan);
        showToast("success", "Plan créé");
      } else {
        const planId = editingPlan.id as string;
        const { id, ...updates } = editingPlan;
        await callAdminUpdatePlan(planId, updates, editingPlan.version as number);
        showToast("success", "Plan mis à jour");
      }
      setEditingPlan(null);
      setCreating(false);
      fetchPlans();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de sauvegarde";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  }, [editingPlan, creating, showToast, fetchPlans]);

  const handleEdit = useCallback(async (planId: string) => {
    try {
      const res = await callAdminGetPlan(planId);
      setEditingPlan(res.data.plan);
      setCreating(false);
    } catch {
      showToast("error", "Erreur lors du chargement du plan");
    }
  }, [showToast]);

  if (loading) {
    return (
      <div className={`${UI.card} p-5`}>
        {[1, 2, 3].map((i) => <div key={i} className={`${UI.skeleton} h-16 w-full mb-3`} />)}
      </div>
    );
  }

  // Plan editor modal
  if (editingPlan) {
    return (
      <PlanEditor
        plan={editingPlan}
        isNew={creating}
        saving={saving}
        onChange={setEditingPlan}
        onSave={handleSave}
        onCancel={() => { setEditingPlan(null); setCreating(false); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">{plans.length} plan(s)</p>
        <div className="flex gap-2">
          <button onClick={fetchPlans} className={UI.button.icon}><RefreshCw className="w-4 h-4" /></button>
          <button
            onClick={() => {
              setEditingPlan({
                name: "",
                description: "",
                targetRoles: [],
                isDefault: false,
                rules: {
                  signup_bonus: { enabled: false, amount: 0 },
                  client_call: { enabled: true, type: "fixed", amounts: { lawyer: 200, expat: 100 } },
                  recruitment_call: { enabled: false, depth: 0, depthAmounts: [] },
                  activation_bonus: { enabled: false, amount: 0, afterNthCall: 2 },
                  provider_recruitment: { enabled: false, amounts: { lawyer: 0, expat: 0 }, windowMonths: 6 },
                  recruit_bonus: { enabled: false, amount: 0 },
                  n1_recruit_bonus: { enabled: false, amount: 0 },
                  subscription_commission: { enabled: false, type: "fixed", firstMonthAmount: 0, rate: 0 },
                  referral_milestones: { enabled: false, qualificationThreshold: 0, milestones: [] },
                  captain_bonus: { enabled: false, callAmount: 0, tiers: [], qualityBonus: { enabled: false, amount: 0 } },
                },
                bonuses: {},
                discount: { enabled: false, type: "fixed", value: 0, label: "" },
                withdrawal: { minimumAmount: 3000, fee: 300, holdPeriodHours: 24 },
              });
              setCreating(true);
            }}
            className={UI.button.primary}
          >
            <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Nouveau plan</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {plans.map((plan) => (
          <div key={plan.id} className={`${UI.cardFlat} p-4 flex items-center justify-between`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white truncate">{plan.name}</h4>
                {plan.isDefault && <span className={UI.badge.info}>Défaut</span>}
                <span className={UI.badge.neutral}>v{plan.version}</span>
              </div>
              <p className="text-xs text-gray-400 truncate">{plan.description}</p>
              <div className="flex gap-1 mt-1.5">
                {plan.targetRoles.map((r) => (
                  <span key={r} className={UI.badge.neutral}>{ROLE_LABELS[r] || r}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-1 ml-4">
              <button onClick={() => handleEdit(plan.id)} className={UI.button.icon}>
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(plan.id, plan.name)} className={UI.button.icon}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {plans.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun plan créé</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PLAN EDITOR
// ============================================================================

const PlanEditor: React.FC<{
  plan: Record<string, unknown>;
  isNew: boolean;
  saving: boolean;
  onChange: (p: Record<string, unknown>) => void;
  onSave: () => void;
  onCancel: () => void;
}> = ({ plan, isNew, saving, onChange, onSave, onCancel }) => {
  const rules = (plan.rules || {}) as Record<string, Record<string, unknown>>;
  const discount = (plan.discount || {}) as Record<string, unknown>;
  const withdrawal = (plan.withdrawal || {}) as Record<string, unknown>;

  const setField = (key: string, value: unknown) => onChange({ ...plan, [key]: value });
  const setRule = (ruleKey: string, field: string, value: unknown) => {
    const updated = { ...rules, [ruleKey]: { ...rules[ruleKey], [field]: value } };
    onChange({ ...plan, rules: updated });
  };

  const AVAILABLE_ROLES = ["chatter", "influencer", "blogger", "groupAdmin", "lawyer", "expat", "partner", "*"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">
          {isNew ? "Nouveau plan" : `Modifier: ${plan.name}`}
        </h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className={UI.button.secondary} disabled={saving}>
            <span className="flex items-center gap-1"><X className="w-4 h-4" /> Annuler</span>
          </button>
          <button onClick={onSave} className={UI.button.primary} disabled={saving}>
            <span className="flex items-center gap-1"><Save className="w-4 h-4" /> {saving ? "..." : "Sauvegarder"}</span>
          </button>
        </div>
      </div>

      {/* General info */}
      <div className={`${UI.card} p-5 space-y-4`}>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Informations générales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nom</label>
            <input
              className={UI.input}
              value={(plan.name as string) || ""}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Ex: Plan Chatter Standard"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Par défaut</label>
            <button
              onClick={() => setField("isDefault", !plan.isDefault)}
              className={`flex items-center gap-2 text-sm ${plan.isDefault ? "text-emerald-600" : "text-gray-400"}`}
            >
              {plan.isDefault ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              {plan.isDefault ? "Oui" : "Non"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Description</label>
          <input
            className={UI.input}
            value={(plan.description as string) || ""}
            onChange={(e) => setField("description", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rôles cibles</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_ROLES.map((role) => {
              const selected = ((plan.targetRoles as string[]) || []).includes(role);
              return (
                <button
                  key={role}
                  onClick={() => {
                    const current = (plan.targetRoles as string[]) || [];
                    setField("targetRoles", selected ? current.filter((r) => r !== role) : [...current, role]);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selected
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {role === "*" ? "Tous (*)" : ROLE_LABELS[role] || role}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Commission Rules */}
      <div className={`${UI.card} p-5 space-y-4`}>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Règles de commission</h3>

        {/* Signup bonus */}
        <RuleBlock
          title="Bonus inscription" ruleKey="signup_bonus"
          enabled={!!rules.signup_bonus?.enabled}
          onToggle={(v) => setRule("signup_bonus", "enabled", v)}
        >
          <CentsInput label="Montant" value={rules.signup_bonus?.amount as number} onChange={(v) => setRule("signup_bonus", "amount", v)} />
        </RuleBlock>

        {/* Client call */}
        <RuleBlock
          title="Appel client" ruleKey="client_call"
          enabled={!!rules.client_call?.enabled}
          onToggle={(v) => setRule("client_call", "enabled", v)}
        >
          <div className="flex gap-3 mb-2">
            <select
              className={UI.select}
              value={(rules.client_call?.type as string) || "fixed"}
              onChange={(e) => setRule("client_call", "type", e.target.value)}
            >
              <option value="fixed">Fixe</option>
              <option value="percentage">Pourcentage</option>
            </select>
          </div>
          {rules.client_call?.type === "percentage" ? (
            <div>
              <label className="text-xs text-gray-400">Taux (%)</label>
              <input
                type="number" step="0.01" min="0" max="1"
                className={UI.input}
                value={(rules.client_call?.rate as number) || 0}
                onChange={(e) => setRule("client_call", "rate", parseFloat(e.target.value))}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <CentsInput
                label="Avocat"
                value={(rules.client_call?.amounts as Record<string, number>)?.lawyer || 0}
                onChange={(v) => setRule("client_call", "amounts", { ...(rules.client_call?.amounts as Record<string, number>), lawyer: v })}
              />
              <CentsInput
                label="Expat"
                value={(rules.client_call?.amounts as Record<string, number>)?.expat || 0}
                onChange={(v) => setRule("client_call", "amounts", { ...(rules.client_call?.amounts as Record<string, number>), expat: v })}
              />
            </div>
          )}
        </RuleBlock>

        {/* Recruitment call */}
        <RuleBlock
          title="Appel recrue (cascade)" ruleKey="recruitment_call"
          enabled={!!rules.recruitment_call?.enabled}
          onToggle={(v) => setRule("recruitment_call", "enabled", v)}
        >
          <div className="mb-2">
            <label className="text-xs text-gray-400">Profondeur (0-5)</label>
            <input
              type="number" min="0" max="5"
              className={UI.input}
              value={(rules.recruitment_call?.depth as number) || 0}
              onChange={(e) => {
                const depth = Math.min(5, Math.max(0, parseInt(e.target.value) || 0));
                const current = (rules.recruitment_call?.depthAmounts as number[]) || [];
                const depthAmounts = Array.from({ length: depth }, (_, i) => current[i] || 100);
                setRule("recruitment_call", "depth", depth);
                setRule("recruitment_call", "depthAmounts", depthAmounts);
              }}
            />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {((rules.recruitment_call?.depthAmounts as number[]) || []).map((amt, i) => (
              <CentsInput
                key={i}
                label={`N${i + 1}`}
                value={amt}
                onChange={(v) => {
                  const arr = [...((rules.recruitment_call?.depthAmounts as number[]) || [])];
                  arr[i] = v;
                  setRule("recruitment_call", "depthAmounts", arr);
                }}
              />
            ))}
          </div>
        </RuleBlock>

        {/* Provider recruitment */}
        <RuleBlock
          title="Recrutement prestataire" ruleKey="provider_recruitment"
          enabled={!!rules.provider_recruitment?.enabled}
          onToggle={(v) => setRule("provider_recruitment", "enabled", v)}
        >
          <div className="grid grid-cols-2 gap-3 mb-2">
            <CentsInput
              label="Avocat"
              value={(rules.provider_recruitment?.amounts as Record<string, number>)?.lawyer || 0}
              onChange={(v) => setRule("provider_recruitment", "amounts", { ...(rules.provider_recruitment?.amounts as Record<string, number>), lawyer: v })}
            />
            <CentsInput
              label="Expat"
              value={(rules.provider_recruitment?.amounts as Record<string, number>)?.expat || 0}
              onChange={(v) => setRule("provider_recruitment", "amounts", { ...(rules.provider_recruitment?.amounts as Record<string, number>), expat: v })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Fenêtre (mois)</label>
            <input
              type="number" min="1" max="24"
              className={UI.input}
              value={(rules.provider_recruitment?.windowMonths as number) || 6}
              onChange={(e) => setRule("provider_recruitment", "windowMonths", parseInt(e.target.value) || 6)}
            />
          </div>
        </RuleBlock>

        {/* Activation bonus */}
        <RuleBlock
          title="Bonus activation" ruleKey="activation_bonus"
          enabled={!!rules.activation_bonus?.enabled}
          onToggle={(v) => setRule("activation_bonus", "enabled", v)}
        >
          <div className="grid grid-cols-2 gap-3">
            <CentsInput label="Montant" value={rules.activation_bonus?.amount as number} onChange={(v) => setRule("activation_bonus", "amount", v)} />
            <div>
              <label className="text-xs text-gray-400">Après N appels</label>
              <input type="number" min="1" className={UI.input} value={(rules.activation_bonus?.afterNthCall as number) || 2} onChange={(e) => setRule("activation_bonus", "afterNthCall", parseInt(e.target.value) || 2)} />
            </div>
          </div>
        </RuleBlock>

        {/* Recruit bonus + N1 */}
        <RuleBlock
          title="Bonus recrue" ruleKey="recruit_bonus"
          enabled={!!rules.recruit_bonus?.enabled}
          onToggle={(v) => setRule("recruit_bonus", "enabled", v)}
        >
          <CentsInput label="Montant" value={rules.recruit_bonus?.amount as number} onChange={(v) => setRule("recruit_bonus", "amount", v)} />
        </RuleBlock>

        <RuleBlock
          title="Bonus N1 recrue" ruleKey="n1_recruit_bonus"
          enabled={!!rules.n1_recruit_bonus?.enabled}
          onToggle={(v) => setRule("n1_recruit_bonus", "enabled", v)}
        >
          <CentsInput label="Montant" value={rules.n1_recruit_bonus?.amount as number} onChange={(v) => setRule("n1_recruit_bonus", "amount", v)} />
        </RuleBlock>
      </div>

      {/* Discount */}
      <div className={`${UI.card} p-5 space-y-4`}>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Réduction client</h3>
        <RuleBlock
          title="Réduction" ruleKey="discount"
          enabled={!!discount.enabled}
          onToggle={(v) => onChange({ ...plan, discount: { ...discount, enabled: v } })}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Type</label>
              <select
                className={UI.select}
                value={(discount.type as string) || "fixed"}
                onChange={(e) => onChange({ ...plan, discount: { ...discount, type: e.target.value } })}
              >
                <option value="fixed">Fixe (cents)</option>
                <option value="percentage">Pourcentage</option>
              </select>
            </div>
            <CentsInput
              label={discount.type === "percentage" ? "Valeur (%)" : "Valeur"}
              value={(discount.value as number) || 0}
              onChange={(v) => onChange({ ...plan, discount: { ...discount, value: v } })}
              isCents={discount.type !== "percentage"}
            />
          </div>
        </RuleBlock>
      </div>

      {/* Withdrawal */}
      <div className={`${UI.card} p-5 space-y-4`}>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Retrait</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CentsInput label="Minimum retrait" value={(withdrawal.minimumAmount as number) || 3000} onChange={(v) => onChange({ ...plan, withdrawal: { ...withdrawal, minimumAmount: v } })} />
          <CentsInput label="Frais" value={(withdrawal.fee as number) || 300} onChange={(v) => onChange({ ...plan, withdrawal: { ...withdrawal, fee: v } })} />
          <div>
            <label className="text-xs text-gray-400">Période de rétention (heures)</label>
            <input
              type="number" min="0" max="720"
              className={UI.input}
              value={(withdrawal.holdPeriodHours as number) || 24}
              onChange={(e) => onChange({ ...plan, withdrawal: { ...withdrawal, holdPeriodHours: parseInt(e.target.value) || 0 } })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SHARED SUB-COMPONENTS
// ============================================================================

const RuleBlock: React.FC<{
  title: string;
  ruleKey: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}> = ({ title, enabled, onToggle, children }) => (
  <div className={`p-3 rounded-lg border ${enabled ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10" : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5"}`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{title}</span>
      <button onClick={() => onToggle(!enabled)}>
        {enabled ? <ToggleRight className="w-5 h-5 text-indigo-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
      </button>
    </div>
    {enabled && <div className="mt-2">{children}</div>}
  </div>
);

const CentsInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  isCents?: boolean;
}> = ({ label, value, onChange, isCents = true }) => (
  <div>
    <label className="text-xs text-gray-400">{label} {isCents && <span className="text-gray-300">({fmt(value || 0)})</span>}</label>
    <input
      type="number"
      min="0"
      step={isCents ? "1" : "0.01"}
      className={UI.input}
      value={value || 0}
      onChange={(e) => onChange(isCents ? parseInt(e.target.value) || 0 : parseFloat(e.target.value) || 0)}
    />
  </div>
);

// ============================================================================
// TAB 3: COMMISSIONS
// ============================================================================

const CommissionsTab: React.FC<{ showToast: (t: "success" | "error", m: string) => void }> = ({ showToast }) => {
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterUser, setFilterUser] = useState<string>("");
  const [cancelModal, setCancelModal] = useState<{ id: string; reason: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCommissions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { limit: 50 };
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      if (filterUser) params.referrerId = filterUser;
      const res = await callListCommissions(params);
      setCommissions(res.data.commissions || []);
    } catch {
      showToast("error", "Erreur lors du chargement des commissions");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, filterUser, showToast]);

  useEffect(() => { fetchCommissions(); }, [fetchCommissions]);

  const handleCancel = useCallback(async () => {
    if (!cancelModal?.id || !cancelModal.reason.trim()) return;
    setActionLoading(cancelModal.id);
    try {
      await callCancelCommission(cancelModal.id, cancelModal.reason);
      showToast("success", "Commission annulée");
      setCancelModal(null);
      fetchCommissions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      showToast("error", msg);
    } finally {
      setActionLoading(null);
    }
  }, [cancelModal, showToast, fetchCommissions]);

  const handleRelease = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      await callReleaseCommission(id);
      showToast("success", "Commission libérée");
      fetchCommissions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      showToast("error", msg);
    } finally {
      setActionLoading(null);
    }
  }, [showToast, fetchCommissions]);

  const exportCSV = useCallback(() => {
    const headers = ["ID", "Referrer", "Role", "Type", "Amount", "Status", "Date"];
    const rows = commissions.map((c) => [
      c.id,
      c.referrerId,
      c.referrerRole,
      TYPE_LABELS[c.type] || c.type,
      (c.amount / 100).toFixed(2),
      c.status,
      c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : "",
    ]);
    const escapeCsv = (v: string) => v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `unified_commissions_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [commissions]);

  return (
    <div className="space-y-4">
      {/* Cancel modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${UI.card} p-6 w-full max-w-md`}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Annuler la commission</h3>
            <p className="text-xs text-gray-500 mb-3">ID: {cancelModal.id}</p>
            <textarea
              className={UI.input}
              rows={3}
              placeholder="Raison de l'annulation (obligatoire)"
              value={cancelModal.reason}
              onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setCancelModal(null)} className={UI.button.secondary}>Annuler</button>
              <button
                onClick={handleCancel}
                className={UI.button.danger}
                disabled={!cancelModal.reason.trim() || !!actionLoading}
              >
                {actionLoading ? "..." : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Statut</label>
          <select className={UI.select} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tous</option>
            <option value="available">Available</option>
            <option value="held">Held</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <select className={UI.select} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Tous</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-400 mb-1">User ID (referrer)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className={`${UI.input} pl-9`}
              placeholder="ID utilisateur..."
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchCommissions()}
            />
          </div>
        </div>
        <button onClick={fetchCommissions} className={UI.button.secondary}>
          <span className="flex items-center gap-1"><Search className="w-4 h-4" /> Rechercher</span>
        </button>
        <button onClick={exportCSV} className={UI.button.icon} title="Exporter CSV">
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className={`${UI.card} p-5`}>
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className={`${UI.skeleton} h-12 w-full mb-2`} />)}
        </div>
      ) : (
        <div className={`${UI.card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Referrer</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Rôle</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500">Montant</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">Statut</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => {
                  const statusCfg = STATUS_BADGES[c.status] || STATUS_BADGES.pending;
                  return (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="py-2.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-700 dark:text-gray-200">
                        {TYPE_LABELS[c.type] || c.type}
                        {c.subType && <span className="text-gray-400 ml-1">/{c.subType}</span>}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-500 font-mono truncate max-w-[120px]" title={c.referrerId}>
                        {c.referrerCode || c.referrerId.slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-500">
                        {ROLE_LABELS[c.referrerRole] || c.referrerRole}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs font-bold text-emerald-600">{fmt(c.amount)}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`${statusCfg.badge} inline-flex items-center gap-1`}>
                          {statusCfg.icon} {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {c.status === "held" && (
                            <button
                              onClick={() => handleRelease(c.id)}
                              className={UI.button.icon}
                              title="Libérer"
                              disabled={actionLoading === c.id}
                            >
                              <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                            </button>
                          )}
                          {c.status !== "cancelled" && c.status !== "paid" && (
                            <button
                              onClick={() => setCancelModal({ id: c.id, reason: "" })}
                              className={UI.button.icon}
                              title="Annuler"
                              disabled={!!actionLoading}
                            >
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {commissions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                      Aucune commission trouvée
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 dark:border-white/10 text-xs text-gray-400">
            {commissions.length} résultat(s)
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TAB 4: USER OVERRIDE
// ============================================================================

const UserTab: React.FC<{ showToast: (t: "success" | "error", m: string) => void }> = ({ showToast }) => {
  const [searchId, setSearchId] = useState("");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [summary, setSummary] = useState<UserCommissionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PlanSummary[]>([]);

  // Editable fields
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [editRates, setEditRates] = useState<Record<string, number>>({});
  const [editDiscount, setEditDiscount] = useState<Record<string, unknown>>({ enabled: false, type: "fixed", value: 0 });
  const [saving, setSaving] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!searchId.trim()) return;
    setLoading(true);
    try {
      const [userRes, plansRes] = await Promise.all([
        callUserSummary(searchId.trim()),
        callAdminListPlans(),
      ]);
      setUserInfo(userRes.data.userInfo);
      setSummary(userRes.data.summary);
      setPlans(plansRes.data.plans || []);

      // Pre-fill editable fields
      const info = userRes.data.userInfo;
      if (info) {
        setSelectedPlanId(info.commissionPlanId || "");
        setEditRates(info.lockedRates || {});
        setEditDiscount({ enabled: false, type: "fixed", value: 0 });
      }
    } catch {
      showToast("error", "Utilisateur non trouvé ou erreur");
      setUserInfo(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [searchId, showToast]);

  const handleAssignPlan = useCallback(async () => {
    if (!searchId.trim()) return;
    setSaving(true);
    try {
      if (selectedPlanId) {
        await callAdminAssignPlan(searchId.trim(), selectedPlanId);
        showToast("success", "Plan assigné");
      } else {
        await callAdminRemovePlan(searchId.trim());
        showToast("success", "Plan individuel supprimé (retour au défaut)");
      }
      fetchUser();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }, [searchId, selectedPlanId, showToast, fetchUser]);

  const handleSaveRates = useCallback(async () => {
    if (!searchId.trim()) return;
    setSaving(true);
    try {
      await callAdminSetLockedRates(searchId.trim(), editRates);
      showToast("success", "Taux verrouillés mis à jour");
      fetchUser();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }, [searchId, editRates, showToast, fetchUser]);

  const handleSaveDiscount = useCallback(async () => {
    if (!searchId.trim()) return;
    setSaving(true);
    try {
      await callAdminSetDiscount(searchId.trim(), editDiscount);
      showToast("success", "Réduction mise à jour");
      fetchUser();
    } catch (err: unknown) {
      showToast("error", err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }, [searchId, editDiscount, showToast, fetchUser]);

  const addRateKey = useCallback(() => {
    const key = prompt("Clé du taux (ex: client_call_lawyer, signup_bonus, recruitment_call_n1)");
    if (key && !(key in editRates)) {
      setEditRates({ ...editRates, [key]: 0 });
    }
  }, [editRates]);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className={`${UI.card} p-5`}>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-500" />
          Rechercher un utilisateur
        </h3>
        <div className="flex gap-3">
          <input
            className={`${UI.input} flex-1`}
            placeholder="User ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUser()}
          />
          <button onClick={fetchUser} className={UI.button.primary} disabled={loading}>
            {loading ? "..." : "Rechercher"}
          </button>
        </div>
      </div>

      {userInfo && summary && (
        <>
          {/* User info */}
          <div className={`${UI.card} p-5`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <span className="text-lg font-bold text-indigo-600">{(userInfo.firstName || userInfo.email || "?").charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">
                  {userInfo.firstName || userInfo.email?.split("@")[0] || searchId}
                </h3>
                <p className="text-xs text-gray-400">{userInfo.email} · {ROLE_LABELS[userInfo.role || ""] || userInfo.role} · Code: {userInfo.affiliateCode || "—"}</p>
              </div>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="text-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-gray-800 dark:text-white">{fmt(summary.totalEarned)}</p>
                <p className="text-xs text-gray-400">Total gagné</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-emerald-600">{fmt(summary.availableBalance)}</p>
                <p className="text-xs text-gray-400">Disponible</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-amber-600">{fmt(summary.pendingBalance)}</p>
                <p className="text-xs text-gray-400">En attente</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-blue-600">{fmt(summary.paidTotal)}</p>
                <p className="text-xs text-gray-400">Payé</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-gray-600">{summary.commissionCount}</p>
                <p className="text-xs text-gray-400">Commissions</p>
              </div>
            </div>
          </div>

          {/* Plan assignment */}
          <div className={`${UI.card} p-5`}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" />
              Plan de commission
            </h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">Plan individuel (vide = défaut du rôle)</label>
                <select className={UI.select + " w-full"} value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}>
                  <option value="">— Défaut du rôle —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.targetRoles.join(", ")})</option>
                  ))}
                </select>
              </div>
              <button onClick={handleAssignPlan} className={UI.button.primary} disabled={saving}>
                <span className="flex items-center gap-1"><Save className="w-4 h-4" /> Appliquer</span>
              </button>
            </div>
          </div>

          {/* Locked rates */}
          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                Taux verrouillés (lockedRates)
              </h3>
              <div className="flex gap-2">
                <button onClick={addRateKey} className={UI.button.secondary}>
                  <span className="flex items-center gap-1"><Plus className="w-3 h-3" /> Ajouter</span>
                </button>
                <button onClick={handleSaveRates} className={UI.button.primary} disabled={saving}>
                  <span className="flex items-center gap-1"><Save className="w-4 h-4" /> Sauvegarder</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Les taux verrouillés ont la priorité absolue sur le plan. Montants en cents.
            </p>
            {Object.keys(editRates).length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucun taux verrouillé</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(editRates).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400">{key} <span className="text-gray-300">({fmt(value)})</span></label>
                      <input
                        type="number"
                        min="0"
                        className={UI.input}
                        value={value}
                        onChange={(e) => setEditRates({ ...editRates, [key]: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const { [key]: _, ...rest } = editRates;
                        setEditRates(rest);
                      }}
                      className={`${UI.button.icon} mt-4`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discount override */}
          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <Percent className="w-4 h-4 text-purple-500" />
                Réduction client individuelle
              </h3>
              <button onClick={handleSaveDiscount} className={UI.button.primary} disabled={saving}>
                <span className="flex items-center gap-1"><Save className="w-4 h-4" /> Sauvegarder</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Activée</label>
                <button
                  onClick={() => setEditDiscount({ ...editDiscount, enabled: !editDiscount.enabled })}
                  className={`flex items-center gap-2 text-sm ${editDiscount.enabled ? "text-emerald-600" : "text-gray-400"}`}
                >
                  {editDiscount.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Type</label>
                <select
                  className={UI.select + " w-full"}
                  value={(editDiscount.type as string) || "fixed"}
                  onChange={(e) => setEditDiscount({ ...editDiscount, type: e.target.value })}
                >
                  <option value="fixed">Fixe (cents)</option>
                  <option value="percentage">Pourcentage</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Valeur</label>
                <input
                  type="number"
                  min="0"
                  className={UI.input}
                  value={(editDiscount.value as number) || 0}
                  onChange={(e) => setEditDiscount({ ...editDiscount, value: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// TAB 5: MIGRATION
// ============================================================================

interface MigrationStepStatus {
  label: string;
  description: string;
  status: "ready" | "running" | "done" | "error";
  progress?: string;
  result?: string;
}

const MigrationTab: React.FC<{ showToast: (t: "success" | "error", m: string) => void }> = ({ showToast }) => {
  const [loading, setLoading] = useState(true);
  const [migrationData, setMigrationData] = useState<Record<string, unknown> | null>(null);
  const [steps, setSteps] = useState<Record<string, MigrationStepStatus>>({
    seed: { label: "Seed plans par défaut", description: "Crée les 8 plans de commission dans Firestore", status: "ready" },
    codes: { label: "Migrer codes affiliés", description: "Convertit les codes legacy au format unifié + assigne plans + snapshot lockedRates", status: "ready" },
    referrals: { label: "Migrer relations de parrainage", description: "Normalise les champs legacy vers referredByUserId", status: "ready" },
  });

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callMigrationStatus();
      setMigrationData(res.data as unknown as Record<string, unknown>);
    } catch {
      showToast("error", "Erreur lors du chargement du statut de migration");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const runStep = useCallback(async (step: string, dryRun: boolean) => {
    setSteps((prev) => ({ ...prev, [step]: { ...prev[step], status: "running", result: undefined } }));
    try {
      let result: { total: number; migrated?: number; created?: number; skipped?: number; errors?: number };

      if (step === "seed") {
        const res = await callSeedPlans(dryRun);
        result = { total: res.data.total, created: res.data.created };
      } else if (step === "codes") {
        const res = await callMigrateCodes(dryRun);
        result = res.data;
      } else {
        const res = await callMigrateReferrals(dryRun);
        result = res.data;
      }

      const prefix = dryRun ? "[DRY-RUN] " : "";
      const summary = step === "seed"
        ? `${prefix}${result.created || 0} créé(s), ${result.total - (result.created || 0)} existant(s)`
        : `${prefix}${result.migrated || 0} migré(s), ${result.skipped || 0} skippé(s), ${result.errors || 0} erreur(s)`;

      setSteps((prev) => ({ ...prev, [step]: { ...prev[step], status: "done", result: summary } }));
      showToast("success", summary);
      if (!dryRun) fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      setSteps((prev) => ({ ...prev, [step]: { ...prev[step], status: "error", result: msg } }));
      showToast("error", msg);
    }
  }, [showToast, fetchStatus]);

  if (loading) {
    return (
      <div className={`${UI.card} p-5`}>
        {[1, 2, 3].map((i) => <div key={i} className={`${UI.skeleton} h-20 w-full mb-3`} />)}
      </div>
    );
  }

  const plans = migrationData?.plans as Record<string, unknown> | undefined;
  const affiliates = migrationData?.affiliates as Record<string, unknown> | undefined;
  const referrals = migrationData?.referrals as Record<string, unknown> | undefined;
  const reports = (migrationData?.recentReports || []) as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      {/* Progress overview */}
      <div className={`${UI.card} p-5`}>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-indigo-500" />
          Progression de la migration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ProgressCard
            label="Plans"
            current={plans?.total as number || 0}
            total={plans?.expected as number || 8}
            done={!!plans?.allSeeded}
          />
          <ProgressCard
            label="Codes affiliés"
            current={affiliates?.withUnifiedCode as number || 0}
            total={affiliates?.total as number || 0}
            percent={affiliates?.codesMigrated as number || 0}
          />
          <ProgressCard
            label="Referrals unifiés"
            current={referrals?.withUnifiedField as number || 0}
            total={(referrals?.withUnifiedField as number || 0) + (referrals?.withLegacyOnly as number || 0)}
            remaining={referrals?.withLegacyOnly as number || 0}
          />
        </div>
      </div>

      {/* Migration steps */}
      <div className={`${UI.card} p-5`}>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Étapes de migration
        </h3>
        <div className="space-y-4">
          {Object.entries(steps).map(([key, step]) => (
            <div key={key} className={`p-4 rounded-lg border ${
              step.status === "done" ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10" :
              step.status === "error" ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10" :
              step.status === "running" ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10" :
              "border-gray-200 dark:border-white/10"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center gap-2">
                    {step.status === "done" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {step.status === "error" && <XCircle className="w-4 h-4 text-red-500" />}
                    {step.status === "running" && <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />}
                    {step.label}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => runStep(key, true)}
                    className={UI.button.secondary}
                    disabled={step.status === "running"}
                  >
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Dry-run</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Lancer "${step.label}" en production ? Cette action modifiera les données.`)) {
                        runStep(key, false);
                      }
                    }}
                    className={UI.button.primary}
                    disabled={step.status === "running"}
                  >
                    {step.status === "running" ? "En cours..." : "Exécuter"}
                  </button>
                </div>
              </div>
              {step.result && (
                <p className={`text-xs mt-2 ${step.status === "error" ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
                  {step.result}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent reports */}
      {reports.length > 0 && (
        <div className={`${UI.card} p-5`}>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Rapports récents</h3>
          <div className="space-y-2">
            {reports.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-white/5 rounded-lg text-xs">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{r.type as string}</span>
                  <span className="text-gray-400 ml-2">
                    {r.timestamp ? new Date(r.timestamp as string).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </span>
                </div>
                <div className="flex gap-3">
                  <span className="text-emerald-600">{r.migrated as number} migrés</span>
                  <span className="text-gray-400">{r.skipped as number} skippés</span>
                  {(r.errors as number) > 0 && <span className="text-red-500">{r.errors as number} erreurs</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={fetchStatus} className={UI.button.secondary}>
        <span className="flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Rafraîchir le statut</span>
      </button>
    </div>
  );
};

const ProgressCard: React.FC<{
  label: string;
  current: number;
  total: number;
  done?: boolean;
  percent?: number;
  remaining?: number;
}> = ({ label, current, total, done, percent, remaining }) => {
  const pct = percent ?? (total > 0 ? Math.round((current / total) * 100) : 0);
  return (
    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
        {done && <CheckCircle className="w-4 h-4 text-emerald-500" />}
      </div>
      <p className="text-xl font-bold text-gray-800 dark:text-white">
        {current}/{total}
      </p>
      <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5 mt-2">
        <div
          className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">
        {pct}%{remaining !== undefined && remaining > 0 && ` — ${remaining} restant(s)`}
      </p>
    </div>
  );
};

export default AdminUnifiedCommissions;
