/**
 * AdminAffiliateCommissions - Gestion de toutes les commissions
 *
 * Page admin pour :
 * - Voir toutes les commissions (tous affiliés)
 * - Filtrer par statut, type, affilié, période
 * - Annuler ou ajuster des commissions
 * - Créer des ajustements manuels
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  Search,
  RefreshCw,
  Filter,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  ChevronDown,
  Calendar,
} from "lucide-react";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { useAuth } from "../../contexts/AuthContext";
import {
  formatCents,
  type CommissionActionType,
  type CommissionStatus,
  getCommissionActionTypeLabel,
  getCommissionStatusLabel,
} from "../../types/affiliate";

// ============================================================================
// TYPES
// ============================================================================

interface Commission {
  id: string;
  referrerId: string;
  referrerEmail: string;
  referrerAffiliateCode: string;
  refereeId: string;
  refereeEmail: string;
  type: CommissionActionType;
  amount: number;
  status: CommissionStatus;
  calculationType: string;
  calculationDetails: string;
  createdAt: string;
  availableAt: string;
  paidAt: string | null;
}

type FilterStatus = CommissionStatus | "all";
type FilterType = CommissionActionType | "all";

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

const StatusBadge: React.FC<{ status: CommissionStatus }> = ({ status }) => {
  const config = {
    pending: {
      icon: <Clock className="h-3 w-3" />,
      label: "En attente",
      classes: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    },
    available: {
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Disponible",
      classes: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    },
    processing: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: "En cours",
      classes: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    },
    paid: {
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Payée",
      classes: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    },
    cancelled: {
      icon: <XCircle className="h-3 w-3" />,
      label: "Annulée",
      classes: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    },
  };

  const { icon, label, classes } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
      {icon}
      {label}
    </span>
  );
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, subtitle, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminAffiliateCommissions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const db = getFirestore();

  // State
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("month");

  // Modals
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  // Fetch commissions
  const fetchCommissions = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      let q = query(
        collection(db, "affiliate_commissions"),
        orderBy("createdAt", "desc"),
        limit(500)
      );

      // Add date filter
      const now = new Date();
      if (dateRange !== "all") {
        let startDate: Date;
        switch (dateRange) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        q = query(
          collection(db, "affiliate_commissions"),
          where("createdAt", ">=", Timestamp.fromDate(startDate)),
          orderBy("createdAt", "desc"),
          limit(500)
        );
      }

      const snapshot = await getDocs(q);
      const data: Commission[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          referrerId: d.referrerId || "",
          referrerEmail: d.referrerEmail || "",
          referrerAffiliateCode: d.referrerAffiliateCode || "",
          refereeId: d.refereeId || "",
          refereeEmail: d.refereeEmail || "",
          type: d.type || "referral_signup",
          amount: d.amount || 0,
          status: d.status || "pending",
          calculationType: d.calculationType || "fixed",
          calculationDetails: d.calculationDetails || "",
          createdAt: d.createdAt?.toDate?.()?.toISOString() || "",
          availableAt: d.availableAt?.toDate?.()?.toISOString() || "",
          paidAt: d.paidAt?.toDate?.()?.toISOString() || null,
        };
      });

      setCommissions(data);
    } catch (err) {
      console.error("[AdminAffiliateCommissions] Error:", err);
      setError("Erreur lors du chargement des commissions");
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, db, dateRange]);

  useEffect(() => {
    fetchCommissions();
  }, [fetchCommissions]);

  // Filter commissions
  const filteredCommissions = useMemo(() => {
    let result = commissions;

    if (filterStatus !== "all") {
      result = result.filter((c) => c.status === filterStatus);
    }

    if (filterType !== "all") {
      result = result.filter((c) => c.type === filterType);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.referrerEmail.toLowerCase().includes(term) ||
          c.refereeEmail.toLowerCase().includes(term) ||
          c.referrerAffiliateCode.toLowerCase().includes(term)
      );
    }

    return result;
  }, [commissions, filterStatus, filterType, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const pending = filteredCommissions.filter((c) => c.status === "pending");
    const available = filteredCommissions.filter((c) => c.status === "available");
    const paid = filteredCommissions.filter((c) => c.status === "paid");

    return {
      total: filteredCommissions.reduce((sum, c) => sum + c.amount, 0),
      count: filteredCommissions.length,
      pendingAmount: pending.reduce((sum, c) => sum + c.amount, 0),
      pendingCount: pending.length,
      availableAmount: available.reduce((sum, c) => sum + c.amount, 0),
      availableCount: available.length,
      paidAmount: paid.reduce((sum, c) => sum + c.amount, 0),
      paidCount: paid.length,
    };
  }, [filteredCommissions]);

  // Cancel commission
  const handleCancel = async () => {
    if (!selectedCommission || !cancelReason.trim()) return;

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, "affiliate_commissions", selectedCommission.id), {
        status: "cancelled",
        cancellationReason: cancelReason,
        cancelledBy: user?.uid,
        cancelledAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setShowCancelModal(false);
      setSelectedCommission(null);
      setCancelReason("");
      fetchCommissions();
    } catch (err) {
      console.error("[AdminAffiliateCommissions] Cancel error:", err);
      setError("Erreur lors de l'annulation");
    } finally {
      setIsProcessing(false);
    }
  };

  // Adjust commission
  const handleAdjust = async () => {
    if (!selectedCommission || !adjustAmount || !adjustReason.trim()) return;

    setIsProcessing(true);
    try {
      const newAmount = Math.round(parseFloat(adjustAmount) * 100);
      const oldAmount = selectedCommission.amount;

      await updateDoc(doc(db, "affiliate_commissions", selectedCommission.id), {
        amount: newAmount,
        calculationDetails: `${selectedCommission.calculationDetails} → Ajusté à ${formatCents(newAmount)} (${adjustReason})`,
        adjustedBy: user?.uid,
        adjustedAt: Timestamp.now(),
        adjustmentReason: adjustReason,
        previousAmount: oldAmount,
        updatedAt: Timestamp.now(),
      });

      setShowAdjustModal(false);
      setSelectedCommission(null);
      setAdjustAmount("");
      setAdjustReason("");
      fetchCommissions();
    } catch (err) {
      console.error("[AdminAffiliateCommissions] Adjust error:", err);
      setError("Erreur lors de l'ajustement");
    } finally {
      setIsProcessing(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = [
      "ID",
      "Date",
      "Affilié",
      "Code",
      "Filleul",
      "Type",
      "Montant",
      "Statut",
    ];

    const rows = filteredCommissions.map((c) => [
      c.id,
      new Date(c.createdAt).toLocaleDateString("fr-FR"),
      c.referrerEmail,
      c.referrerAffiliateCode,
      c.refereeEmail,
      getCommissionActionTypeLabel(c.type),
      (c.amount / 100).toFixed(2),
      c.status,
    ]);

    const csvContent =
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `commissions_${new Date().toISOString().split("T")[0]}.csv`
    );
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
              Gestion des Commissions
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Toutes les commissions d'affiliation
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button onClick={() => fetchCommissions()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total"
            value={formatCents(stats.total)}
            subtitle={`${stats.count} commissions`}
            icon={<DollarSign className="h-5 w-5 text-white" />}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard
            title="En attente"
            value={formatCents(stats.pendingAmount)}
            subtitle={`${stats.pendingCount} commissions`}
            icon={<Clock className="h-5 w-5 text-white" />}
            color="bg-gradient-to-br from-amber-500 to-amber-600"
          />
          <StatCard
            title="Disponibles"
            value={formatCents(stats.availableAmount)}
            subtitle={`${stats.availableCount} commissions`}
            icon={<CheckCircle className="h-5 w-5 text-white" />}
            color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
          <StatCard
            title="Payées"
            value={formatCents(stats.paidAmount)}
            subtitle={`${stats.paidCount} commissions`}
            icon={<CheckCircle className="h-5 w-5 text-white" />}
            color="bg-gradient-to-br from-green-500 to-green-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par email ou code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="available">Disponible</option>
              <option value="processing">En cours</option>
              <option value="paid">Payée</option>
              <option value="cancelled">Annulée</option>
            </select>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Tous les types</option>
              <option value="referral_signup">Inscription</option>
              <option value="referral_first_call">1er appel</option>
              <option value="referral_recurring_call">Appel récurrent</option>
              <option value="referral_subscription">Abonnement</option>
              <option value="referral_subscription_renewal">Renouvellement</option>
              <option value="referral_provider_validated">Bonus prestataire</option>
              <option value="manual_adjustment">Ajustement manuel</option>
            </select>

            {/* Date range */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="all">Tout</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Affilié
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Filleul
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Montant
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCommissions.map((commission) => (
                  <tr
                    key={commission.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(commission.createdAt).toLocaleDateString("fr-FR")}
                      <br />
                      <span className="text-xs">
                        {new Date(commission.createdAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/affiliates/${commission.referrerId}`)}
                        className="text-left hover:underline"
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {commission.referrerEmail}
                        </p>
                        <p className="text-xs text-gray-500">
                          {commission.referrerAffiliateCode}
                        </p>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {commission.refereeEmail}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getCommissionActionTypeLabel(commission.type)}
                      </span>
                      <p className="text-xs text-gray-500 max-w-[200px] truncate">
                        {commission.calculationDetails}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-emerald-600">
                        {formatCents(commission.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={commission.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {commission.status !== "paid" &&
                          commission.status !== "cancelled" && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedCommission(commission);
                                  setAdjustAmount((commission.amount / 100).toString());
                                  setShowAdjustModal(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                title="Ajuster"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCommission(commission);
                                  setShowCancelModal(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Annuler"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCommissions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Aucune commission trouvée</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cancel Modal */}
        <Modal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedCommission(null);
            setCancelReason("");
          }}
          title="Annuler la commission"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                Cette action est irréversible. Le montant sera déduit du solde de l'affilié.
              </p>
            </div>
            {selectedCommission && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedCommission.referrerEmail}
                </p>
                <p className="text-lg font-bold text-emerald-600 mt-1">
                  {formatCents(selectedCommission.amount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {getCommissionActionTypeLabel(selectedCommission.type)}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Raison de l'annulation (obligatoire)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Ex: Inscription frauduleuse détectée..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedCommission(null);
                  setCancelReason("");
                }}
              >
                Fermer
              </Button>
              <Button
                onClick={handleCancel}
                disabled={isProcessing || !cancelReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Annuler la commission
              </Button>
            </div>
          </div>
        </Modal>

        {/* Adjust Modal */}
        <Modal
          isOpen={showAdjustModal}
          onClose={() => {
            setShowAdjustModal(false);
            setSelectedCommission(null);
            setAdjustAmount("");
            setAdjustReason("");
          }}
          title="Ajuster le montant"
        >
          <div className="space-y-4">
            {selectedCommission && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedCommission.referrerEmail}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Montant actuel: {formatCents(selectedCommission.amount)}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nouveau montant (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Raison de l'ajustement (obligatoire)
              </label>
              <textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                rows={3}
                placeholder="Ex: Correction suite à erreur de calcul..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAdjustModal(false);
                  setSelectedCommission(null);
                  setAdjustAmount("");
                  setAdjustReason("");
                }}
              >
                Fermer
              </Button>
              <Button
                onClick={handleAdjust}
                disabled={isProcessing || !adjustAmount || !adjustReason.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Edit className="h-4 w-4 mr-2" />
                )}
                Ajuster
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default AdminAffiliateCommissions;
