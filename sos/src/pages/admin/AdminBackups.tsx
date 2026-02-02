// src/pages/admin/AdminBackups.tsx
// Interface complète de sauvegarde et restauration
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useIntl } from "react-intl";
import AdminLayout from "@/components/admin/AdminLayout";
import Button from "@/components/common/Button";
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Save,
  Trash,
  Database,
  Play,
  Download,
  Calendar,
  Shield,
  Users,
  FileText,
  HardDrive,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Eye,
  Info,
} from "lucide-react";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";

// -------------------------
// Types
// -------------------------
type BackupStatus = "pending" | "completed" | "failed" | "in_progress" | "partial";

interface BackupRow {
  id: string;
  type: string;
  backupType?: string; // morning, midday, evening, admin
  status: BackupStatus;
  createdAt?: Timestamp | Date;
  completedAt?: Timestamp | Date;
  createdBy?: string;
  totalDocuments?: number;
  collectionCounts?: Record<string, number>;
  checksum?: string;
  bucketPath?: string;
  containsFinancialData?: boolean;
  retentionDays?: number;
  error?: string;
}

interface LocalBackupRow {
  id: string;
  backupDate: string;
  backupPath: string;
  machineName: string;
  status: "completed" | "failed" | "partial";
  sizeMB: number;
  components: {
    firestore: boolean;
    storage: boolean;
    auth: boolean;
    secrets: boolean;
    rules: boolean;
    code: boolean;
  };
  stats?: {
    firestoreCollections?: number;
    storageFiles?: number;
    authUsers?: number;
  };
  createdAt?: Timestamp | Date;
}

interface BackupsByDate {
  [date: string]: {
    firestore: BackupRow[];
    auth: BackupRow[];
  };
}

interface RestorePreview {
  backupId: string;
  backupDate: string;
  collectionsToRestore: string[];
  comparison: Record<string, { backup: number; current: number; diff: number }>;
  warnings: string[];
}

// -------------------------
// Helpers
// -------------------------
async function isAdminNow(): Promise<boolean> {
  const auth = getAuth();
  await new Promise<void>((res) => {
    const off = auth.onAuthStateChanged(() => {
      off();
      res();
    });
  });
  await auth.currentUser?.getIdToken(true);
  const t = await auth.currentUser?.getIdTokenResult();
  return t?.claims?.role === "admin" || t?.claims?.admin === true;
}

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  if (typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === "object" && "_seconds" in (v as Record<string, unknown>)) {
    return new Date((v as { _seconds: number })._seconds * 1000);
  }
  return undefined;
}

function formatDate(v: unknown, locale: string = "fr-FR"): string {
  const d = toDate(v);
  if (!d) return "-";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatDateOnly(d: Date): string {
  return d.toISOString().split("T")[0];
}

// -------------------------
// Components
// -------------------------
const StatusBadge: React.FC<{ status: BackupStatus; intl: ReturnType<typeof useIntl> }> = ({ status, intl }) => {
  const configs = {
    completed: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle, label: intl.formatMessage({ id: "admin.backups.status.completed" }) },
    failed: { bg: "bg-red-100", text: "text-red-800", icon: AlertTriangle, label: intl.formatMessage({ id: "admin.backups.status.failed" }) },
    pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock, label: intl.formatMessage({ id: "admin.backups.status.pending" }) },
    in_progress: { bg: "bg-blue-100", text: "text-blue-800", icon: RefreshCw, label: intl.formatMessage({ id: "admin.backups.status.inProgress" }) },
  };
  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center rounded-full ${config.bg} ${config.text} px-2 py-0.5 text-xs`}>
      <Icon size={12} className="mr-1" />
      {config.label}
    </span>
  );
};

const TypeBadge: React.FC<{ type: string; backupType?: string; intl: ReturnType<typeof useIntl> }> = ({ type, backupType, intl }) => {
  const label = backupType === "morning" ? intl.formatMessage({ id: "admin.backups.type.morning" })
    : backupType === "midday" ? intl.formatMessage({ id: "admin.backups.type.midday" })
    : backupType === "evening" ? intl.formatMessage({ id: "admin.backups.type.evening" })
    : backupType === "admin" ? intl.formatMessage({ id: "admin.backups.type.admin" })
    : type === "automatic" ? intl.formatMessage({ id: "admin.backups.type.automatic" })
    : type === "manual" ? intl.formatMessage({ id: "admin.backups.type.manual" })
    : type;

  const isAuto = type === "automatic";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
      isAuto ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
    }`}>
      {isAuto ? <RefreshCw size={12} className="mr-1" /> : <Save size={12} className="mr-1" />}
      {label}
    </span>
  );
};

const CollectionSelector: React.FC<{
  collections: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  counts?: Record<string, number>;
  intl: ReturnType<typeof useIntl>;
}> = ({ collections, selected, onChange, counts, intl }) => {
  const toggleCollection = (col: string) => {
    if (selected.includes(col)) {
      onChange(selected.filter(c => c !== col));
    } else {
      onChange([...selected, col]);
    }
  };

  const selectAll = () => onChange(collections);
  const selectNone = () => onChange([]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 mb-2">
        <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">
          {intl.formatMessage({ id: "admin.backups.restore.selectAll" })}
        </button>
        <span className="text-gray-300">|</span>
        <button onClick={selectNone} className="text-xs text-gray-600 hover:underline">
          {intl.formatMessage({ id: "admin.backups.restore.selectNone" })}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {collections.map(col => (
          <label
            key={col}
            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
              selected.includes(col) ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(col)}
              onChange={() => toggleCollection(col)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{col}</div>
              {counts?.[col] !== undefined && (
                <div className="text-xs text-gray-500">{counts[col].toLocaleString()} docs</div>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

// -------------------------
// Main Page
// -------------------------
const AdminBackups: React.FC = () => {
  const intl = useIntl();
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [authBackups, setAuthBackups] = useState<BackupRow[]>([]);
  const [localBackups, setLocalBackups] = useState<LocalBackupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Restore state
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedBackup, setSelectedBackup] = useState<BackupRow | null>(null);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Confirmation dialog state (double security)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [codeInputValue, setCodeInputValue] = useState("");
  const [codeError, setCodeError] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState<"overview" | "restore" | "history" | "local">("overview");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const functions = getFunctions(undefined, "europe-west1");

  // ✅ OPTIMISATION COÛTS GCP: Polling 120s au lieu de onSnapshot pour les backups
  useEffect(() => {
    let isMounted = true;

    const loadBackups = async () => {
      try {
        // Load Firestore backups
        const firestoreSnap = await getDocs(
          query(collection(db, "backups"), orderBy("createdAt", "desc"), limit(100))
        );
        if (!isMounted) return;
        setRows(firestoreSnap.docs.map(d => ({ id: d.id, ...d.data() } as BackupRow)));

        // Load Auth backups
        const authSnap = await getDocs(
          query(collection(db, "auth_backups"), orderBy("createdAt", "desc"), limit(50))
        );
        if (!isMounted) return;
        setAuthBackups(authSnap.docs.map(d => ({ id: d.id, ...d.data() } as BackupRow)));

        // Load Local backups (PC backups)
        const localSnap = await getDocs(
          query(collection(db, "local_backups"), orderBy("createdAt", "desc"), limit(50))
        );
        if (!isMounted) return;
        setLocalBackups(localSnap.docs.map(d => ({ id: d.id, ...d.data() } as LocalBackupRow)));
      } catch (error) {
        console.error("Error loading backups:", error);
      }
    };

    // Chargement initial uniquement (bouton manuel pour actualiser)
    // ÉCONOMIE: Suppression du setInterval automatique (120s)
    // Avant: 720 requêtes/jour - Après: ~20 requêtes/jour (manuel)
    loadBackups();

    // Check admin status
    isAdminNow().then(setIsAdmin);

    return () => {
      isMounted = false;
    };
  }, []);

  // ---- Computed Values ----
  const backupsByDate = useMemo<BackupsByDate>(() => {
    const result: BackupsByDate = {};

    for (const backup of rows) {
      const date = toDate(backup.createdAt);
      if (!date) continue;
      const dateKey = formatDateOnly(date);
      if (!result[dateKey]) {
        result[dateKey] = { firestore: [], auth: [] };
      }
      result[dateKey].firestore.push(backup);
    }

    for (const backup of authBackups) {
      const date = toDate(backup.createdAt);
      if (!date) continue;
      const dateKey = formatDateOnly(date);
      if (!result[dateKey]) {
        result[dateKey] = { firestore: [], auth: [] };
      }
      result[dateKey].auth.push(backup);
    }

    return result;
  }, [rows, authBackups]);

  const availableDates = useMemo(() => {
    return Object.keys(backupsByDate).sort((a, b) => b.localeCompare(a));
  }, [backupsByDate]);

  const stats = useMemo(() => {
    const completed = rows.filter(r => r.status === "completed").length;
    const failed = rows.filter(r => r.status === "failed").length;
    const totalDocs = rows.find(r => r.status === "completed")?.totalDocuments || 0;
    const lastBackup = rows.find(r => r.status === "completed");
    const lastBackupDate = lastBackup ? toDate(lastBackup.createdAt) : null;
    const hoursAgo = lastBackupDate ? Math.floor((Date.now() - lastBackupDate.getTime()) / (1000 * 60 * 60)) : null;

    return { completed, failed, totalDocs, lastBackupDate, hoursAgo };
  }, [rows]);

  const availableCollections = useMemo(() => {
    if (!selectedBackup?.collectionCounts) return [];
    return Object.keys(selectedBackup.collectionCounts);
  }, [selectedBackup]);

  // ---- Actions ----
  const handleBackupNow = useCallback(async () => {
    if (!isAdmin) {
      alert(intl.formatMessage({ id: "admin.backups.alerts.adminRequired" }));
      return;
    }
    setLoading(true);
    try {
      const backupFn = httpsCallable(functions, "adminCreateManualBackup");
      const result = await backupFn({ includeAuth: true, description: "Backup manuel admin" });
      alert(intl.formatMessage({ id: "admin.backups.alerts.backupStarted" }));
    } catch (error) {
      console.error("Error creating backup:", error);
      alert(intl.formatMessage({ id: "admin.backups.alerts.backupError" }, { error: error instanceof Error ? error.message : intl.formatMessage({ id: "admin.backups.alerts.unknownError" }) }));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, functions, intl]);

  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedBackup(null);
    setSelectedCollections([]);
    setRestorePreview(null);
  }, []);

  const handleSelectBackup = useCallback((backup: BackupRow) => {
    setSelectedBackup(backup);
    // Pre-select all collections
    if (backup.collectionCounts) {
      setSelectedCollections(Object.keys(backup.collectionCounts));
    }
    setRestorePreview(null);
  }, []);

  const handlePreviewRestore = useCallback(async () => {
    if (!selectedBackup) return;
    setPreviewLoading(true);
    try {
      const previewFn = httpsCallable(functions, "adminPreviewRestore");
      const result = await previewFn({
        backupId: selectedBackup.id,
        backupType: "firestore",
        collections: selectedCollections,
      });
      setRestorePreview((result.data as { preview: RestorePreview }).preview);
    } catch (error) {
      console.error("Preview error:", error);
      alert(intl.formatMessage({ id: "admin.backups.alerts.previewError" }));
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedBackup, selectedCollections, functions, intl]);

  // Step 1: Show confirmation dialog and get code
  const handleInitiateRestore = useCallback(async () => {
    if (!selectedBackup || !restorePreview) return;

    try {
      // Get confirmation code from server
      const getCodeFn = httpsCallable(functions, "adminGetRestoreConfirmationCode");
      const result = await getCodeFn({ backupId: selectedBackup.id });
      const data = result.data as { success: boolean; code: string };

      if (data.success) {
        setExpectedCode(data.code);
        setConfirmationCode(data.code);
        setCodeInputValue("");
        setCodeError("");
        setShowConfirmDialog(true);
      }
    } catch (error) {
      console.error("Error getting confirmation code:", error);
      alert(intl.formatMessage({ id: "admin.backups.alerts.codeGenerationError" }));
    }
  }, [selectedBackup, restorePreview, functions, intl]);

  // Step 2: Validate code and execute restore
  const handleConfirmRestore = useCallback(async () => {
    if (!selectedBackup || !restorePreview) return;

    // Validate code
    if (codeInputValue.toUpperCase() !== expectedCode) {
      setCodeError(intl.formatMessage({ id: "admin.backups.confirmation.codeError" }));
      return;
    }

    setShowConfirmDialog(false);
    setRestoring(true);

    try {
      const restoreFn = httpsCallable(functions, "adminRestoreFirestore");
      const result = await restoreFn({
        backupId: selectedBackup.id,
        bucketPath: selectedBackup.bucketPath,
        collections: selectedCollections.length > 0 ? selectedCollections : undefined,
        confirmationCode: codeInputValue.toUpperCase(),
        expectedCode: expectedCode,
      });

      const data = result.data as {
        success: boolean;
        message: string;
        operationName?: string;
        trackingId?: string;
        preRestoreBackupId?: string;
        rollbackInfo?: string;
      };

      if (data.success) {
        alert(
          `${intl.formatMessage({ id: "admin.backups.alerts.restoreSuccess" })}\n\n` +
          `${intl.formatMessage({ id: "admin.backups.alerts.trackingId" }, { id: data.trackingId })}\n\n` +
          (data.rollbackInfo ? `${intl.formatMessage({ id: "admin.backups.alerts.rollbackInfo" }, { info: data.rollbackInfo })}\n\n` : "") +
          intl.formatMessage({ id: "admin.backups.alerts.restoreProgress" })
        );
      }
    } catch (error) {
      console.error("Restore error:", error);
      alert(intl.formatMessage({ id: "admin.backups.alerts.restoreError" }, { error: error instanceof Error ? error.message : intl.formatMessage({ id: "admin.backups.alerts.unknownError" }) }));
    } finally {
      setRestoring(false);
      setCodeInputValue("");
      setExpectedCode("");
    }
  }, [selectedBackup, restorePreview, selectedCollections, functions, codeInputValue, expectedCode, intl]);

  const handleDelete = useCallback(async (id: string) => {
    if (!isAdmin) {
      alert(intl.formatMessage({ id: "admin.backups.alerts.adminRequired" }));
      return;
    }
    if (!confirm(intl.formatMessage({ id: "admin.backups.alerts.deleteConfirm" }))) return;

    try {
      await deleteDoc(doc(db, "backups", id));
      alert(intl.formatMessage({ id: "admin.backups.alerts.deleteSuccess" }));
    } catch (error) {
      console.error("Delete error:", error);
      alert(intl.formatMessage({ id: "admin.backups.alerts.deleteError" }));
    }
  }, [isAdmin, intl]);

  const toggleDateExpanded = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{intl.formatMessage({ id: "admin.backups.title" })}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {intl.formatMessage({ id: "admin.backups.subtitle" })}
            </p>
          </div>
          <Button
            onClick={handleBackupNow}
            loading={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            <Save size={16} className="mr-2" />
            {intl.formatMessage({ id: "admin.backups.backupNow" })}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Database className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.completed}</p>
                <p className="text-xs text-gray-500">{intl.formatMessage({ id: "admin.backups.successfulBackups" })}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.totalDocs.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{intl.formatMessage({ id: "admin.backups.savedDocuments" })}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.hoursAgo && stats.hoursAgo > 24 ? "bg-orange-100" : "bg-green-100"}`}>
                <Clock className={`h-5 w-5 ${stats.hoursAgo && stats.hoursAgo > 24 ? "text-orange-600" : "text-green-600"}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {stats.hoursAgo !== null ? `${stats.hoursAgo}h` : "-"}
                </p>
                <p className="text-xs text-gray-500">{intl.formatMessage({ id: "admin.backups.lastBackup" })}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.failed > 0 ? "bg-red-100" : "bg-gray-100"}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.failed > 0 ? "text-red-600" : "text-gray-400"}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.failed}</p>
                <p className="text-xs text-gray-500">{intl.formatMessage({ id: "admin.backups.recentFailures" })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">{intl.formatMessage({ id: "admin.backups.retentionPolicy.title" })}</h3>
              <p className="text-sm text-blue-700 mt-1" dangerouslySetInnerHTML={{ __html: intl.formatMessage({ id: "admin.backups.retentionPolicy.description" }) }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <nav className="flex gap-4">
            {[
              { id: "overview", label: intl.formatMessage({ id: "admin.backups.tabs.overview" }), icon: BarChart },
              { id: "restore", label: intl.formatMessage({ id: "admin.backups.tabs.restore" }), icon: RotateCcw },
              { id: "history", label: intl.formatMessage({ id: "admin.backups.tabs.history" }), icon: Clock },
              { id: "local", label: "Backups Locaux", icon: HardDrive },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Backup Schedule */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-gray-400" />
                {intl.formatMessage({ id: "admin.backups.schedule.title" })}
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">{intl.formatMessage({ id: "admin.backups.schedule.morning" })}</div>
                  <div className="text-2xl font-semibold text-blue-600">03:00</div>
                  <div className="text-xs text-blue-700">{intl.formatMessage({ id: "admin.backups.schedule.mainBackup" })}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">{intl.formatMessage({ id: "admin.backups.schedule.midday" })}</div>
                  <div className="text-2xl font-semibold text-gray-600">11:00</div>
                  <div className="text-xs text-gray-700">{intl.formatMessage({ id: "admin.backups.schedule.intermediateBackup" })}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">{intl.formatMessage({ id: "admin.backups.schedule.evening" })}</div>
                  <div className="text-2xl font-semibold text-gray-600">19:00</div>
                  <div className="text-xs text-gray-700">{intl.formatMessage({ id: "admin.backups.schedule.endOfDayBackup" })}</div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4" dangerouslySetInnerHTML={{ __html: intl.formatMessage({ id: "admin.backups.schedule.rpo" }) }} />
            </div>

            {/* Recent Backups by Date */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                {intl.formatMessage({ id: "admin.backups.byDate.title" })}
              </h2>
              <div className="space-y-2">
                {availableDates.slice(0, 7).map(date => {
                  const dayData = backupsByDate[date];
                  const isExpanded = expandedDates.has(date);
                  const completedCount = dayData.firestore.filter(b => b.status === "completed").length;

                  return (
                    <div key={date} className="border rounded-lg">
                      <button
                        onClick={() => toggleDateExpanded(date)}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <span className="font-medium">{date}</span>
                          <span className="text-sm text-gray-500">
                            {intl.formatMessage({ id: "admin.backups.byDate.backupCount" }, { count: completedCount })}
                            {dayData.auth.length > 0 && ` ${intl.formatMessage({ id: "admin.backups.byDate.authCount" }, { count: dayData.auth.length })}`}
                          </span>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t bg-gray-50">
                          <div className="space-y-2">
                            {dayData.firestore.map(backup => (
                              <div key={backup.id} className="flex items-center justify-between text-sm p-2 bg-white rounded">
                                <div className="flex items-center gap-2">
                                  <Database size={14} className="text-gray-400" />
                                  <span>{formatDate(backup.createdAt, intl.locale)}</span>
                                  <TypeBadge type={backup.type} backupType={backup.backupType} intl={intl} />
                                  <StatusBadge status={backup.status} intl={intl} />
                                </div>
                                <span className="text-gray-500">
                                  {backup.totalDocuments?.toLocaleString()} {intl.formatMessage({ id: "admin.backups.byDate.docs" })}
                                </span>
                              </div>
                            ))}
                            {dayData.auth.map(backup => (
                              <div key={backup.id} className="flex items-center justify-between text-sm p-2 bg-white rounded">
                                <div className="flex items-center gap-2">
                                  <Users size={14} className="text-gray-400" />
                                  <span>{formatDate(backup.createdAt, intl.locale)}</span>
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Auth</span>
                                  <StatusBadge status={backup.status} intl={intl} />
                                </div>
                                <span className="text-gray-500">
                                  {backup.totalDocuments?.toLocaleString()} {intl.formatMessage({ id: "admin.backups.byDate.users" })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "restore" && (
          <div className="space-y-6">
            {/* Step 1: Select Date */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-sm">1</span>
                {intl.formatMessage({ id: "admin.backups.restore.step1.title" })}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {availableDates.slice(0, 30).map(date => {
                  const dayData = backupsByDate[date];
                  const hasCompleted = dayData.firestore.some(b => b.status === "completed");

                  return (
                    <button
                      key={date}
                      onClick={() => handleSelectDate(date)}
                      disabled={!hasCompleted}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        selectedDate === date
                          ? "bg-red-50 border-red-300 ring-2 ring-red-200"
                          : hasCompleted
                          ? "bg-white hover:bg-gray-50 border-gray-200"
                          : "bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="text-sm font-medium">{date.slice(5)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {intl.formatMessage({ id: "admin.backups.restore.step1.backupCount" }, { count: dayData.firestore.filter(b => b.status === "completed").length })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Backup */}
            {selectedDate && backupsByDate[selectedDate] && (
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-sm">2</span>
                  {intl.formatMessage({ id: "admin.backups.restore.step2.title" })}
                </h2>
                <div className="space-y-2">
                  {backupsByDate[selectedDate].firestore
                    .filter(b => b.status === "completed")
                    .map(backup => (
                      <button
                        key={backup.id}
                        onClick={() => handleSelectBackup(backup)}
                        className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors ${
                          selectedBackup?.id === backup.id
                            ? "bg-red-50 border-red-300 ring-2 ring-red-200"
                            : "bg-white hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Database className="h-8 w-8 text-gray-400" />
                          <div className="text-left">
                            <div className="font-medium">{formatDate(backup.createdAt, intl.locale)}</div>
                            <div className="text-sm text-gray-500">
                              {intl.formatMessage({ id: "admin.backups.restore.step2.documents" }, { count: backup.totalDocuments?.toLocaleString() || 0 })}
                              {backup.collectionCounts && ` - ${intl.formatMessage({ id: "admin.backups.restore.step2.collections" }, { count: Object.keys(backup.collectionCounts).length })}`}
                            </div>
                          </div>
                          <TypeBadge type={backup.type} backupType={backup.backupType} intl={intl} />
                        </div>
                        {backup.checksum && (
                          <div className="text-xs text-gray-400 font-mono">
                            #{backup.checksum.slice(0, 8)}
                          </div>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Step 3: Select Collections */}
            {selectedBackup && availableCollections.length > 0 && (
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-sm">3</span>
                  {intl.formatMessage({ id: "admin.backups.restore.step3.title" })}
                </h2>
                <CollectionSelector
                  collections={availableCollections}
                  selected={selectedCollections}
                  onChange={setSelectedCollections}
                  counts={selectedBackup.collectionCounts}
                  intl={intl}
                />

                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={handlePreviewRestore}
                    loading={previewLoading}
                    variant="outline"
                    disabled={selectedCollections.length === 0}
                  >
                    <Eye size={16} className="mr-2" />
                    {intl.formatMessage({ id: "admin.backups.restore.preview" })}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Preview & Confirm */}
            {restorePreview && (
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-sm">4</span>
                  {intl.formatMessage({ id: "admin.backups.restore.step4.title" })}
                </h2>

                {restorePreview.warnings.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-900">{intl.formatMessage({ id: "admin.backups.restore.warnings.title" })}</h4>
                        <ul className="text-sm text-orange-700 mt-1 list-disc list-inside">
                          {restorePreview.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border rounded-lg overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">{intl.formatMessage({ id: "admin.backups.restore.comparison.collection" })}</th>
                        <th className="px-4 py-2 text-right font-medium">{intl.formatMessage({ id: "admin.backups.restore.comparison.inBackup" })}</th>
                        <th className="px-4 py-2 text-right font-medium">{intl.formatMessage({ id: "admin.backups.restore.comparison.current" })}</th>
                        <th className="px-4 py-2 text-right font-medium">{intl.formatMessage({ id: "admin.backups.restore.comparison.difference" })}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {Object.entries(restorePreview.comparison).map(([col, data]) => (
                        <tr key={col}>
                          <td className="px-4 py-2 font-medium">{col}</td>
                          <td className="px-4 py-2 text-right">{data.backup.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{data.current.toLocaleString()}</td>
                          <td className={`px-4 py-2 text-right font-medium ${
                            data.diff > 0 ? "text-green-600" : data.diff < 0 ? "text-red-600" : "text-gray-400"
                          }`}>
                            {data.diff > 0 ? `+${data.diff}` : data.diff}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900">{intl.formatMessage({ id: "admin.backups.restore.irreversibleAction.title" })}</h4>
                      <p className="text-sm text-red-700 mt-1">
                        {intl.formatMessage({ id: "admin.backups.restore.irreversibleAction.description" })}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleInitiateRestore}
                  loading={restoring}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <RotateCcw size={16} className="mr-2" />
                  {intl.formatMessage({ id: "admin.backups.restore.startRestore" })}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Dialog Modal */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {intl.formatMessage({ id: "admin.backups.confirmation.title" })}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    {intl.formatMessage({ id: "admin.backups.confirmation.warning" })}
                  </p>
                </div>

                <div className="bg-gray-50 border rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    {intl.formatMessage({ id: "admin.backups.confirmation.typeCode" })}
                  </p>
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded p-3 text-center">
                    <span className="font-mono text-xl font-bold text-blue-600 tracking-wider">
                      {confirmationCode}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {intl.formatMessage({ id: "admin.backups.confirmation.enterCode" })}
                  </label>
                  <input
                    type="text"
                    value={codeInputValue}
                    onChange={(e) => {
                      setCodeInputValue(e.target.value.toUpperCase());
                      setCodeError("");
                    }}
                    placeholder={intl.formatMessage({ id: "admin.backups.confirmation.codePlaceholder" })}
                    className={`w-full px-4 py-2 border rounded-lg font-mono text-lg tracking-wider text-center ${
                      codeError ? "border-red-500" : "border-gray-300"
                    } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    autoFocus
                  />
                  {codeError && (
                    <p className="mt-1 text-sm text-red-600">{codeError}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setCodeInputValue("");
                    setCodeError("");
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {intl.formatMessage({ id: "admin.backups.confirmation.cancel" })}
                </Button>
                <Button
                  onClick={handleConfirmRestore}
                  disabled={codeInputValue.length < 5}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
                >
                  <Shield size={16} className="mr-2" />
                  {intl.formatMessage({ id: "admin.backups.confirmation.confirm" })}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: "admin.backups.history.date" })}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: "admin.backups.history.type" })}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: "admin.backups.history.status" })}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: "admin.backups.history.documents" })}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: "admin.backups.history.checksum" })}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: "admin.backups.history.actions" })}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        {intl.formatMessage({ id: "admin.backups.history.noBackups" })}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm">{formatDate(row.createdAt, intl.locale)}</td>
                        <td className="px-6 py-3">
                          <TypeBadge type={row.type} backupType={row.backupType} intl={intl} />
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={row.status} intl={intl} />
                        </td>
                        <td className="px-6 py-3 text-sm">
                          {row.totalDocuments?.toLocaleString() || "-"}
                        </td>
                        <td className="px-6 py-3 text-xs font-mono text-gray-500">
                          {row.checksum ? `#${row.checksum.slice(0, 8)}` : "-"}
                        </td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title={intl.formatMessage({ id: "admin.backups.history.delete" })}
                          >
                            <Trash size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "local" && (
          <div className="space-y-6">
            {/* Info Banner Local */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <HardDrive className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-green-900">Sauvegardes Locales (PC)</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Ces sauvegardes sont stockées sur votre ordinateur local dans <code className="bg-green-100 px-1 rounded">C:\Users\willi\Documents\BACKUP_SOS-Expat</code>.
                    Elles sont indépendantes de Google Cloud et vous protègent en cas de bannissement ou de perte d'accès.
                  </p>
                </div>
              </div>
            </div>

            {/* Local Backups Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <HardDrive className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{localBackups.length}</p>
                    <p className="text-xs text-gray-500">Backups Locaux</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">
                      {localBackups.reduce((acc, b) => acc + (b.sizeMB || 0), 0).toFixed(1)} MB
                    </p>
                    <p className="text-xs text-gray-500">Taille Totale</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${localBackups[0] ? "bg-green-100" : "bg-gray-100"}`}>
                    <Clock className={`h-5 w-5 ${localBackups[0] ? "text-green-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">
                      {localBackups[0] ? formatDate(localBackups[0].createdAt, intl.locale).split(" ")[0] : "-"}
                    </p>
                    <p className="text-xs text-gray-500">Dernier Backup Local</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Local Backups Table */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="font-medium">Historique des Backups Locaux</h3>
                <span className="text-sm text-gray-500">Rétention: 30 jours</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Composants</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taille</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chemin</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {localBackups.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          <HardDrive className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                          <p>Aucun backup local enregistré</p>
                          <p className="text-sm mt-1">Lancez <code className="bg-gray-100 px-1 rounded">BACKUP-QUOTIDIEN.bat</code> pour créer un backup</p>
                        </td>
                      </tr>
                    ) : (
                      localBackups.map((backup) => (
                        <tr key={backup.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm font-medium">
                            {backup.backupDate}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            {backup.machineName}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {backup.components?.firestore && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                  <Database size={10} className="mr-1" />DB
                                </span>
                              )}
                              {backup.components?.storage && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                                  <HardDrive size={10} className="mr-1" />Storage
                                </span>
                              )}
                              {backup.components?.auth && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                                  <Users size={10} className="mr-1" />Auth
                                </span>
                              )}
                              {backup.components?.secrets && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                                  <Shield size={10} className="mr-1" />Secrets
                                </span>
                              )}
                              {backup.components?.code && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">
                                  <FileText size={10} className="mr-1" />Code
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm">
                            {backup.sizeMB?.toFixed(1)} MB
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                              backup.status === "completed" ? "bg-green-100 text-green-800" :
                              backup.status === "partial" ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {backup.status === "completed" && <CheckCircle size={12} className="mr-1" />}
                              {backup.status === "partial" && <AlertTriangle size={12} className="mr-1" />}
                              {backup.status === "failed" && <AlertCircle size={12} className="mr-1" />}
                              {backup.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs font-mono text-gray-500 max-w-xs truncate" title={backup.backupPath}>
                            {backup.backupPath}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-gray-400" />
                Comment utiliser les backups locaux
              </h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Lancer un backup manuel</h4>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600">
                    <li>Ouvrez le dossier du projet <code className="bg-gray-100 px-1 rounded">sos/</code></li>
                    <li>Double-cliquez sur <code className="bg-gray-100 px-1 rounded">BACKUP-QUOTIDIEN.bat</code></li>
                    <li>Attendez la fin de l'exécution</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Activer le backup automatique</h4>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600">
                    <li>Clic droit sur <code className="bg-gray-100 px-1 rounded">CONFIGURER-AUTO-BACKUP.bat</code></li>
                    <li>Sélectionnez "Exécuter en tant qu'administrateur"</li>
                    <li>Le backup s'exécutera chaque nuit à 03:00</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

// Missing icon component
const BarChart: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="12" width="4" height="9" />
    <rect x="10" y="8" width="4" height="13" />
    <rect x="17" y="4" width="4" height="17" />
  </svg>
);

export default AdminBackups;
