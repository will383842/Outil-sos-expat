/**
 * =============================================================================
 * PAGE AUDIT LOGS — Journal d'audit des actions
 * Vue admin pour consulter l'historique des actions sur la plateforme
 *
 * SÉCURITÉ: Accessible uniquement aux administrateurs
 * =============================================================================
 */

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { AuditLogEntry, AuditAction, AuditSeverity } from "../../lib/auditLog";
import { useLanguage } from "../../hooks/useLanguage";
import {
  Shield,
  Search,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  User,
  Filter,
  ChevronDown,
  FileText,
  UserPlus,
  UserMinus,
  Settings,
  Download,
  Sparkles,
  Briefcase,
  X,
} from "lucide-react";

// =============================================================================
// HELPERS
// =============================================================================

const getActionLabels = (t: (key: string) => string): Record<AuditAction, string> => ({
  "user.login": t("auditLogs.actions.login"),
  "user.logout": t("auditLogs.actions.logout"),
  "user.role_change": t("auditLogs.actions.roleChange"),
  "provider.create": t("auditLogs.actions.providerCreate"),
  "provider.update": t("auditLogs.actions.providerUpdate"),
  "provider.delete": t("auditLogs.actions.providerDelete"),
  "provider.access_grant": t("auditLogs.actions.accessGranted"),
  "provider.access_revoke": t("auditLogs.actions.accessRevoked"),
  "booking.create": t("auditLogs.actions.dossierCreate"),
  "booking.update": t("auditLogs.actions.dossierUpdate"),
  "booking.status_change": t("auditLogs.actions.dossierStatusChange"),
  "booking.delete": t("auditLogs.actions.dossierDelete"),
  "ai.response_generated": t("auditLogs.actions.aiResponseGenerated"),
  "ai.settings_change": t("auditLogs.actions.aiSettingsChanged"),
  "settings.update": t("auditLogs.actions.settingsChanged"),
  "export.data": t("auditLogs.actions.dataExport"),
  "admin.action": t("auditLogs.actions.adminAction"),
});

const actionIcons: Record<string, React.ElementType> = {
  "user.": User,
  "provider.create": UserPlus,
  "provider.delete": UserMinus,
  "provider.": User,
  "booking.": Briefcase,
  "ai.": Sparkles,
  "settings.": Settings,
  "export.": Download,
  "admin.": Shield,
};

const severityConfig: Record<AuditSeverity, { color: string; icon: React.ElementType; bg: string }> = {
  info: { color: "text-blue-600", icon: Info, bg: "bg-blue-100" },
  warning: { color: "text-amber-600", icon: AlertTriangle, bg: "bg-amber-100" },
  critical: { color: "text-red-600", icon: AlertCircle, bg: "bg-red-100" },
};

function getActionIcon(action: AuditAction): React.ElementType {
  for (const [prefix, icon] of Object.entries(actionIcons)) {
    if (action.startsWith(prefix)) return icon;
  }
  return FileText;
}

function formatTimestamp(timestamp: Timestamp, t: (key: string, options?: Record<string, unknown>) => string): string {
  const date = timestamp.toDate();
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return t("common:time.today");
  if (minutes < 60) return t("common:time.minutesAgo", { count: minutes });
  if (hours < 24) return t("common:time.hoursAgo", { count: hours });

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =============================================================================
// COMPOSANTS
// =============================================================================

function LogEntry({ log, t }: { log: AuditLogEntry; t: (key: string, options?: Record<string, unknown>) => string }) {
  const [expanded, setExpanded] = useState(false);
  const severity = severityConfig[log.severity];
  const Icon = getActionIcon(log.action);
  const SeverityIcon = severity.icon;
  const actionLabels = getActionLabels(t);

  return (
    <div
      className={`border-l-4 ${
        log.severity === "critical"
          ? "border-red-500"
          : log.severity === "warning"
          ? "border-amber-500"
          : "border-blue-500"
      } bg-white rounded-r-lg border border-l-0 border-gray-200 p-4 hover:bg-gray-50`}
    >
      <div className="flex items-start gap-3">
        {/* Icône action */}
        <div className={`p-2 rounded-lg ${severity.bg} ${severity.color}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">
              {actionLabels[log.action] || log.action}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${severity.bg} ${severity.color}`}>
              <SeverityIcon className="w-3 h-3" />
              {t(`auditLogs.severity.${log.severity}`)}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {log.userEmail}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTimestamp(log.timestamp, t)}
            </span>
          </div>

          {/* Target info */}
          {log.targetId && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="text-gray-500">{log.targetType}:</span>{" "}
              <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                {log.targetId}
              </code>
            </div>
          )}

          {/* Détails expandables */}
          {log.details && Object.keys(log.details).length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
              >
                <ChevronDown
                  className={`w-4 h-4 transform ${expanded ? "rotate-180" : ""}`}
                />
                {expanded ? t("common:actions.collapse") : t("common:actions.expand")}
              </button>

              {expanded && (
                <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PAGE PRINCIPALE
// =============================================================================

export default function AuditLogs() {
  const { t } = useLanguage({ mode: "admin" });
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | "all">("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // Chargement des logs
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    setLoading(true);
    setError(null);

    const logsQuery = query(
      collection(db, "audit_logs"),
      orderBy("timestamp", "desc"),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AuditLogEntry[];
        setLogs(data);
        setLoading(false);
      },
      (err) => {
        console.error("Erreur chargement audit logs:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtrage
  const filteredLogs = logs.filter((log) => {
    // Filtre par recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesEmail = log.userEmail?.toLowerCase().includes(search);
      const matchesTarget = log.targetId?.toLowerCase().includes(search);
      const matchesAction = log.action.toLowerCase().includes(search);
      if (!matchesEmail && !matchesTarget && !matchesAction) return false;
    }

    // Filtre par sévérité
    if (severityFilter !== "all" && log.severity !== severityFilter) return false;

    // Filtre par type d'action
    if (actionFilter !== "all" && !log.action.startsWith(actionFilter)) return false;

    return true;
  });

  // Stats
  const stats = {
    total: logs.length,
    critical: logs.filter((l) => l.severity === "critical").length,
    warning: logs.filter((l) => l.severity === "warning").length,
    today: logs.filter((l) => {
      const logDate = l.timestamp.toDate();
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length,
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-5 h-5" />
          <span>{t("common:loading.default")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{t("common:errors.loading")}</span>
        </div>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-red-600" />
            {t("auditLogs.title")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("auditLogs.description")}
          </p>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">{t("auditLogs.stats.total")}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
          <div className="text-sm text-gray-600">{t("auditLogs.stats.today")}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.warning}</div>
          <div className="text-sm text-gray-600">{t("auditLogs.severity.warning")}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          <div className="text-sm text-gray-600">{t("auditLogs.severity.critical")}</div>
        </div>
      </div>

      {/* Recherche et filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex items-center gap-4">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("common:actions.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Toggle filtres */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              showFilters
                ? "bg-red-50 border-red-200 text-red-700"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            {t("common:actions.filters")}
            {(severityFilter !== "all" || actionFilter !== "all") && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            {/* Filtre sévérité */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("auditLogs.filters.severity")}</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as AuditSeverity | "all")}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{t("common:all")}</option>
                <option value="info">{t("auditLogs.severity.info")}</option>
                <option value="warning">{t("auditLogs.severity.warning")}</option>
                <option value="critical">{t("auditLogs.severity.critical")}</option>
              </select>
            </div>

            {/* Filtre type d'action */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t("auditLogs.filters.actionType")}</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">{t("common:all")}</option>
                <option value="user.">{t("utilisateurs.title")}</option>
                <option value="provider.">{t("prestataires.title")}</option>
                <option value="booking.">{t("common:navigation.dossiers")}</option>
                <option value="ai.">{t("common:types.ai")}</option>
                <option value="settings.">{t("common:navigation.settings")}</option>
                <option value="export.">{t("common:actions.export")}</option>
                <option value="admin.">{t("common:roles.admin")}</option>
              </select>
            </div>

            {/* Reset filtres */}
            {(severityFilter !== "all" || actionFilter !== "all") && (
              <button
                onClick={() => {
                  setSeverityFilter("all");
                  setActionFilter("all");
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
                {t("common:actions.reset")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Liste des logs */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {t("common:empty.noResults")}
          </h3>
          <p className="text-gray-600">
            {searchTerm || severityFilter !== "all" || actionFilter !== "all"
              ? t("common:empty.modifyFilters")
              : t("common:empty.noData")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <LogEntry key={log.id} log={log} t={t} />
          ))}
        </div>
      )}

      {/* Compteur */}
      <div className="text-center text-sm text-gray-500">
        {t("auditLogs.counter", { shown: filteredLogs.length, total: logs.length })}
      </div>
    </div>
  );
}
