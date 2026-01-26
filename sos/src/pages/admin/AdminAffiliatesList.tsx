/**
 * AdminAffiliatesList - Liste complète des affiliés
 *
 * Page admin pour :
 * - Voir tous les affiliés avec leurs stats
 * - Rechercher et filtrer par statut, performance
 * - Voir les détails d'un affilié
 * - Suspendre / Réactiver un affilié
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  UserX,
  UserCheck,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  Loader2,
  Copy,
  CheckCircle,
  Ban,
  Flag,
  Download,
} from "lucide-react";
import { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, updateDoc, Timestamp, startAfter, DocumentSnapshot } from "firebase/firestore";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { useAuth } from "../../contexts/AuthContext";
import { formatCents, type AffiliateStatus } from "../../types/affiliate";

// ============================================================================
// TYPES
// ============================================================================

interface AffiliateUser {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: string;
  affiliateCode: string;
  affiliateStatus: AffiliateStatus;
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  affiliateStats: {
    totalReferrals: number;
    activeReferrals: number;
    totalCommissions: number;
  };
  hasBankDetails: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

type SortField = "totalEarned" | "totalReferrals" | "createdAt" | "availableBalance";
type SortOrder = "asc" | "desc";
type FilterStatus = AffiliateStatus | "all";

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: "blue" | "green" | "amber" | "purple" | "red";
}> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    amber: "from-amber-500 to-amber-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

const AffiliateStatusBadge: React.FC<{ status: AffiliateStatus }> = ({ status }) => {
  const config = {
    active: {
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Actif",
      classes: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    },
    suspended: {
      icon: <Ban className="h-3 w-3" />,
      label: "Suspendu",
      classes: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    },
    flagged: {
      icon: <Flag className="h-3 w-3" />,
      label: "Signalé",
      classes: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    },
  };

  const { icon, label, classes } = config[status] || config.active;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
      {icon}
      {label}
    </span>
  );
};

// ============================================================================
// ACTION MODAL
// ============================================================================

const ActionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  affiliate: AffiliateUser | null;
  action: "suspend" | "reactivate" | "flag" | null;
  onConfirm: (reason: string) => Promise<void>;
  isLoading: boolean;
}> = ({ isOpen, onClose, affiliate, action, onConfirm, isLoading }) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  if (!affiliate || !action) return null;

  const config = {
    suspend: {
      title: "Suspendre l'affilié",
      description: "L'affilié ne pourra plus générer de commissions ni effectuer de retraits.",
      buttonLabel: "Suspendre",
      buttonColor: "bg-red-600 hover:bg-red-700",
      requireReason: true,
    },
    reactivate: {
      title: "Réactiver l'affilié",
      description: "L'affilié pourra à nouveau générer des commissions et effectuer des retraits.",
      buttonLabel: "Réactiver",
      buttonColor: "bg-emerald-600 hover:bg-emerald-700",
      requireReason: false,
    },
    flag: {
      title: "Signaler l'affilié",
      description: "L'affilié sera marqué pour vérification. Il pourra toujours opérer mais sera surveillé.",
      buttonLabel: "Signaler",
      buttonColor: "bg-amber-600 hover:bg-amber-700",
      requireReason: true,
    },
  };

  const { title, description, buttonLabel, buttonColor, requireReason } = config[action];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {affiliate.displayName || affiliate.email}
          </p>
          <p className="text-xs text-gray-500 mt-1">{affiliate.affiliateCode}</p>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>

        {requireReason && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Raison {action === "suspend" ? "(obligatoire)" : "(optionnelle)"}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Indiquez la raison..."
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isLoading || (action === "suspend" && !reason.trim())}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${buttonColor} disabled:opacity-50 flex items-center gap-2`}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {buttonLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminAffiliatesList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const db = getFirestore();

  // State
  const [affiliates, setAffiliates] = useState<AffiliateUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortField, setSortField] = useState<SortField>("totalEarned");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal state
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateUser | null>(null);
  const [modalAction, setModalAction] = useState<"suspend" | "reactivate" | "flag" | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const total = affiliates.length;
    const active = affiliates.filter((a) => a.affiliateStatus === "active").length;
    const suspended = affiliates.filter((a) => a.affiliateStatus === "suspended").length;
    const flagged = affiliates.filter((a) => a.affiliateStatus === "flagged").length;
    const totalEarned = affiliates.reduce((sum, a) => sum + a.totalEarned, 0);
    const totalAvailable = affiliates.reduce((sum, a) => sum + a.availableBalance, 0);

    return { total, active, suspended, flagged, totalEarned, totalAvailable };
  }, [affiliates]);

  // Fetch affiliates
  const fetchAffiliates = useCallback(async (reset = false) => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      // Query users with affiliateCode
      let q = query(
        collection(db, "users"),
        where("affiliateCode", "!=", null),
        orderBy("affiliateCode"),
        limit(100)
      );

      if (!reset && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const users: AffiliateUser[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          email: data.email || "",
          displayName: data.displayName || `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role || "client",
          affiliateCode: data.affiliateCode || "",
          affiliateStatus: data.affiliateStatus || "active",
          totalEarned: data.totalEarned || 0,
          availableBalance: data.availableBalance || 0,
          pendingBalance: data.pendingBalance || 0,
          affiliateStats: data.affiliateStats || { totalReferrals: 0, activeReferrals: 0, totalCommissions: 0 },
          hasBankDetails: !!data.bankDetails,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() || undefined,
        };
      });

      // Sort locally since Firestore doesn't support complex ordering with != filter
      users.sort((a, b) => {
        let aVal: number, bVal: number;
        switch (sortField) {
          case "totalEarned":
            aVal = a.totalEarned;
            bVal = b.totalEarned;
            break;
          case "totalReferrals":
            aVal = a.affiliateStats.totalReferrals;
            bVal = b.affiliateStats.totalReferrals;
            break;
          case "availableBalance":
            aVal = a.availableBalance;
            bVal = b.availableBalance;
            break;
          case "createdAt":
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
            break;
          default:
            aVal = a.totalEarned;
            bVal = b.totalEarned;
        }
        return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
      });

      if (reset) {
        setAffiliates(users);
      } else {
        setAffiliates((prev) => [...prev, ...users]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 100);
    } catch (error) {
      console.error("[AdminAffiliatesList] Error fetching affiliates:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, db, sortField, sortOrder, lastDoc]);

  // Initial fetch
  useEffect(() => {
    fetchAffiliates(true);
  }, [sortField, sortOrder]);

  // Filter affiliates
  const filteredAffiliates = useMemo(() => {
    let result = affiliates;

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter((a) => a.affiliateStatus === filterStatus);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.email.toLowerCase().includes(q) ||
          a.displayName.toLowerCase().includes(q) ||
          a.affiliateCode.toLowerCase().includes(q)
      );
    }

    return result;
  }, [affiliates, filterStatus, searchQuery]);

  // Handle affiliate action
  const handleAction = async (reason: string) => {
    if (!selectedAffiliate || !modalAction) return;

    setIsActionLoading(true);
    try {
      const newStatus: AffiliateStatus =
        modalAction === "suspend" ? "suspended" :
        modalAction === "reactivate" ? "active" :
        "flagged";

      await updateDoc(doc(db, "users", selectedAffiliate.id), {
        affiliateStatus: newStatus,
        affiliateAdminNotes: reason ? `[${new Date().toISOString()}] ${modalAction}: ${reason}` : null,
        updatedAt: Timestamp.now(),
      });

      // Update local state
      setAffiliates((prev) =>
        prev.map((a) =>
          a.id === selectedAffiliate.id ? { ...a, affiliateStatus: newStatus } : a
        )
      );

      setSelectedAffiliate(null);
      setModalAction(null);
    } catch (error) {
      console.error("[AdminAffiliatesList] Error updating affiliate:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Copy affiliate code
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Export to CSV
  const exportToCsv = () => {
    const headers = ["Email", "Nom", "Code", "Statut", "Gains totaux", "Solde disponible", "Filleuls", "Date creation"];
    const rows = filteredAffiliates.map((a) => [
      a.email,
      a.displayName,
      a.affiliateCode,
      a.affiliateStatus,
      (a.totalEarned / 100).toFixed(2),
      (a.availableBalance / 100).toFixed(2),
      a.affiliateStats.totalReferrals,
      a.createdAt ? new Date(a.createdAt).toLocaleDateString("fr-FR") : "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `affiliates-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Liste des Affiliés
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gérez tous les affiliés du programme de parrainage
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={exportToCsv}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exporter
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchAffiliates(true)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Affiliés"
            value={stats.total}
            subtitle={`${stats.active} actifs`}
            icon={<Users className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            title="Gains Totaux"
            value={formatCents(stats.totalEarned)}
            subtitle="Toutes périodes"
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            title="À Verser"
            value={formatCents(stats.totalAvailable)}
            subtitle="Soldes disponibles"
            icon={<DollarSign className="h-5 w-5" />}
            color="purple"
          />
          <StatCard
            title="Signalés"
            value={stats.flagged + stats.suspended}
            subtitle={`${stats.flagged} signalés, ${stats.suspended} suspendus`}
            icon={<AlertTriangle className="h-5 w-5" />}
            color={stats.flagged + stats.suspended > 0 ? "red" : "amber"}
          />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par email, nom ou code..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="appearance-none px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="suspended">Suspendus</option>
                <option value="flagged">Signalés</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-") as [SortField, SortOrder];
                  setSortField(field);
                  setSortOrder(order);
                }}
                className="appearance-none px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="totalEarned-desc">Gains (+ au -)</option>
                <option value="totalEarned-asc">Gains (- au +)</option>
                <option value="totalReferrals-desc">Filleuls (+ au -)</option>
                <option value="totalReferrals-asc">Filleuls (- au +)</option>
                <option value="createdAt-desc">Plus récents</option>
                <option value="createdAt-asc">Plus anciens</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Affilié
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Filleuls
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Gains totaux
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Disponible
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading && affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                      <p className="text-sm text-gray-500 mt-2">Chargement...</p>
                    </td>
                  </tr>
                ) : filteredAffiliates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">Aucun affilié trouvé</p>
                    </td>
                  </tr>
                ) : (
                  filteredAffiliates.map((affiliate) => (
                    <tr
                      key={affiliate.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                            {affiliate.displayName?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {affiliate.displayName}
                            </p>
                            <p className="text-xs text-gray-500">{affiliate.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {affiliate.affiliateCode}
                          </code>
                          <button
                            onClick={() => copyCode(affiliate.affiliateCode)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            {copiedCode === affiliate.affiliateCode ? (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <AffiliateStatusBadge status={affiliate.affiliateStatus} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {affiliate.affiliateStats.totalReferrals}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          ({affiliate.affiliateStats.activeReferrals} actifs)
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCents(affiliate.totalEarned)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`text-sm font-medium ${
                          affiliate.availableBalance > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-gray-500"
                        }`}>
                          {formatCents(affiliate.availableBalance)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/admin/affiliates/${affiliate.id}`)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {affiliate.affiliateStatus === "active" ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedAffiliate(affiliate);
                                  setModalAction("flag");
                                }}
                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                title="Signaler"
                              >
                                <Flag className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAffiliate(affiliate);
                                  setModalAction("suspend");
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Suspendre"
                              >
                                <UserX className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedAffiliate(affiliate);
                                setModalAction("reactivate");
                              }}
                              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                              title="Réactiver"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && !isLoading && (
            <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => fetchAffiliates(false)}
                className="flex items-center gap-2 mx-auto"
              >
                Charger plus
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Action Modal */}
        <ActionModal
          isOpen={!!selectedAffiliate && !!modalAction}
          onClose={() => {
            setSelectedAffiliate(null);
            setModalAction(null);
          }}
          affiliate={selectedAffiliate}
          action={modalAction}
          onConfirm={handleAction}
          isLoading={isActionLoading}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminAffiliatesList;
