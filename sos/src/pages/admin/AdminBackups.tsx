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
type BackupStatus = "pending" | "completed" | "failed" | "in_progress";

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
const StatusBadge: React.FC<{ status: BackupStatus }> = ({ status }) => {
  const configs = {
    completed: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle, label: "Terminé" },
    failed: { bg: "bg-red-100", text: "text-red-800", icon: AlertTriangle, label: "Échoué" },
    pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock, label: "En attente" },
    in_progress: { bg: "bg-blue-100", text: "text-blue-800", icon: RefreshCw, label: "En cours" },
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

const TypeBadge: React.FC<{ type: string; backupType?: string }> = ({ type, backupType }) => {
  const label = backupType === "morning" ? "Matin (3h)"
    : backupType === "midday" ? "Midi (11h)"
    : backupType === "evening" ? "Soir (19h)"
    : backupType === "admin" ? "Admin"
    : type === "automatic" ? "Automatique"
    : type === "manual" ? "Manuel"
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
}> = ({ collections, selected, onChange, counts }) => {
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
          Tout sélectionner
        </button>
        <span className="text-gray-300">|</span>
        <button onClick={selectNone} className="text-xs text-gray-600 hover:underline">
          Tout désélectionner
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
  const [activeTab, setActiveTab] = useState<"overview" | "restore" | "history">("overview");
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
      } catch (error) {
        console.error("Error loading backups:", error);
      }
    };

    loadBackups();
    const intervalId = setInterval(loadBackups, 120000); // Poll every 120s

    // Check admin status
    isAdminNow().then(setIsAdmin);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
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
      alert("Droits admin requis");
      return;
    }
    setLoading(true);
    try {
      const backupFn = httpsCallable(functions, "adminCreateManualBackup");
      const result = await backupFn({ includeAuth: true, description: "Backup manuel admin" });
      console.log("Backup result:", result.data);
      alert("Sauvegarde lancée avec succès!");
    } catch (error) {
      console.error("Error creating backup:", error);
      alert("Erreur lors de la sauvegarde: " + (error instanceof Error ? error.message : "Erreur inconnue"));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, functions]);

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
      alert("Erreur lors de la prévisualisation");
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedBackup, selectedCollections, functions]);

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
      alert("Erreur lors de la génération du code de confirmation");
    }
  }, [selectedBackup, restorePreview, functions]);

  // Step 2: Validate code and execute restore
  const handleConfirmRestore = useCallback(async () => {
    if (!selectedBackup || !restorePreview) return;

    // Validate code
    if (codeInputValue.toUpperCase() !== expectedCode) {
      setCodeError("Code incorrect. Veuillez réessayer.");
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
          `✅ ${data.message}\n\n` +
          `ID de suivi: ${data.trackingId}\n\n` +
          (data.rollbackInfo ? `🔄 ${data.rollbackInfo}\n\n` : "") +
          `L'opération peut prendre plusieurs minutes. Consultez l'onglet Historique pour suivre la progression.`
        );
      }
      console.log("Restore result:", data);
    } catch (error) {
      console.error("Restore error:", error);
      alert("Erreur lors de la restauration: " + (error instanceof Error ? error.message : "Erreur inconnue"));
    } finally {
      setRestoring(false);
      setCodeInputValue("");
      setExpectedCode("");
    }
  }, [selectedBackup, restorePreview, selectedCollections, functions, codeInputValue, expectedCode]);

  const handleDelete = useCallback(async (id: string) => {
    if (!isAdmin) {
      alert("Droits admin requis");
      return;
    }
    if (!confirm("Supprimer cette sauvegarde? Cette action est irréversible.")) return;

    try {
      await deleteDoc(doc(db, "backups", id));
      alert("Sauvegarde supprimée");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Erreur lors de la suppression");
    }
  }, [isAdmin]);

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
            <h1 className="text-2xl font-semibold">Sauvegardes & Restauration</h1>
            <p className="text-sm text-gray-500 mt-1">
              Gérez vos sauvegardes et restaurez vos données en cas de besoin
            </p>
          </div>
          <Button
            onClick={handleBackupNow}
            loading={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            <Save size={16} className="mr-2" />
            Sauvegarder maintenant
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
                <p className="text-xs text-gray-500">Sauvegardes réussies</p>
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
                <p className="text-xs text-gray-500">Documents sauvegardés</p>
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
                <p className="text-xs text-gray-500">Dernière sauvegarde</p>
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
                <p className="text-xs text-gray-500">Échecs récents</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">Politique de conservation</h3>
              <p className="text-sm text-blue-700 mt-1">
                Les sauvegardes standards sont conservées <strong>30 jours</strong>.
                Les données financières (paiements, factures, abonnements) sont conservées <strong>indéfiniment</strong> pour conformité légale (10 ans minimum).
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <nav className="flex gap-4">
            {[
              { id: "overview", label: "Vue d'ensemble", icon: BarChart },
              { id: "restore", label: "Restaurer", icon: RotateCcw },
              { id: "history", label: "Historique", icon: Clock },
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
                Planification des sauvegardes
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Matin</div>
                  <div className="text-2xl font-semibold text-blue-600">03:00</div>
                  <div className="text-xs text-blue-700">Backup principal</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Midi</div>
                  <div className="text-2xl font-semibold text-gray-600">11:00</div>
                  <div className="text-xs text-gray-700">Backup intermédiaire</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">Soir</div>
                  <div className="text-2xl font-semibold text-gray-600">19:00</div>
                  <div className="text-xs text-gray-700">Backup fin de journée</div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                RPO (Recovery Point Objective): <strong>8 heures maximum</strong> de perte de données en cas d'incident.
              </p>
            </div>

            {/* Recent Backups by Date */}
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                Sauvegardes par date
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
                            {completedCount} backup{completedCount > 1 ? "s" : ""} Firestore
                            {dayData.auth.length > 0 && ` + ${dayData.auth.length} Auth`}
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
                                  <span>{formatDate(backup.createdAt)}</span>
                                  <TypeBadge type={backup.type} backupType={backup.backupType} />
                                  <StatusBadge status={backup.status} />
                                </div>
                                <span className="text-gray-500">
                                  {backup.totalDocuments?.toLocaleString()} docs
                                </span>
                              </div>
                            ))}
                            {dayData.auth.map(backup => (
                              <div key={backup.id} className="flex items-center justify-between text-sm p-2 bg-white rounded">
                                <div className="flex items-center gap-2">
                                  <Users size={14} className="text-gray-400" />
                                  <span>{formatDate(backup.createdAt)}</span>
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Auth</span>
                                  <StatusBadge status={backup.status} />
                                </div>
                                <span className="text-gray-500">
                                  {backup.totalDocuments?.toLocaleString()} utilisateurs
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
                Choisir une date de restauration
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
                        {dayData.firestore.filter(b => b.status === "completed").length} backup{dayData.firestore.length > 1 ? "s" : ""}
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
                  Choisir un point de restauration
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
                            <div className="font-medium">{formatDate(backup.createdAt)}</div>
                            <div className="text-sm text-gray-500">
                              {backup.totalDocuments?.toLocaleString()} documents
                              {backup.collectionCounts && ` • ${Object.keys(backup.collectionCounts).length} collections`}
                            </div>
                          </div>
                          <TypeBadge type={backup.type} backupType={backup.backupType} />
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
                  Sélectionner les collections à restaurer
                </h2>
                <CollectionSelector
                  collections={availableCollections}
                  selected={selectedCollections}
                  onChange={setSelectedCollections}
                  counts={selectedBackup.collectionCounts}
                />

                <div className="mt-4 flex gap-3">
                  <Button
                    onClick={handlePreviewRestore}
                    loading={previewLoading}
                    variant="outline"
                    disabled={selectedCollections.length === 0}
                  >
                    <Eye size={16} className="mr-2" />
                    Prévisualiser
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Preview & Confirm */}
            {restorePreview && (
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-sm">4</span>
                  Confirmer la restauration
                </h2>

                {restorePreview.warnings.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-900">Attention</h4>
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
                        <th className="px-4 py-2 text-left font-medium">Collection</th>
                        <th className="px-4 py-2 text-right font-medium">Dans backup</th>
                        <th className="px-4 py-2 text-right font-medium">Actuel</th>
                        <th className="px-4 py-2 text-right font-medium">Différence</th>
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
                      <h4 className="font-medium text-red-900">Action irréversible</h4>
                      <p className="text-sm text-red-700 mt-1">
                        La restauration peut écraser des données actuelles. Assurez-vous d'avoir un backup récent avant de continuer.
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
                  Lancer la restauration
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
                  Confirmation de sécurité
                </h3>
              </div>

              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Attention :</strong> Cette action va restaurer des données depuis un backup.
                    Un backup de sécurité sera créé automatiquement avant la restauration pour vous permettre
                    de revenir en arrière si nécessaire.
                  </p>
                </div>

                <div className="bg-gray-50 border rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-2">
                    Pour confirmer, tapez le code suivant :
                  </p>
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded p-3 text-center">
                    <span className="font-mono text-xl font-bold text-blue-600 tracking-wider">
                      {confirmationCode}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entrez le code de confirmation :
                  </label>
                  <input
                    type="text"
                    value={codeInputValue}
                    onChange={(e) => {
                      setCodeInputValue(e.target.value.toUpperCase());
                      setCodeError("");
                    }}
                    placeholder="XXXXX-0000"
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
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirmRestore}
                  disabled={codeInputValue.length < 5}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
                >
                  <Shield size={16} className="mr-2" />
                  Confirmer la restauration
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checksum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Aucune sauvegarde trouvée
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm">{formatDate(row.createdAt)}</td>
                        <td className="px-6 py-3">
                          <TypeBadge type={row.type} backupType={row.backupType} />
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={row.status} />
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
                            title="Supprimer"
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
