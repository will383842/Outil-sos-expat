/**
 * AdminAffiliatePayouts - Gestion des paiements affiliés
 *
 * Page admin pour :
 * - Voir les payouts en attente
 * - Approuver / Rejeter les demandes
 * - Traiter les paiements via Wise (automatique) ou manuellement
 * - Voir l'historique des payouts
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  CreditCard,
  Search,
  Filter,
  Eye,
  ChevronDown,
  Loader2,
  Banknote,
  TrendingUp,
  Users,
  ArrowUpRight,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { useAffiliateAdmin } from "../../hooks/useAffiliate";
import { formatCents, getPayoutStatusLabel, getStatusColor } from "../../types/affiliate";
import type { AffiliatePayout, PayoutStatus } from "../../types/affiliate";

// ============================================================================
// TYPES
// ============================================================================

type FilterStatus = PayoutStatus | "all";

interface PayoutActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  payout: AffiliatePayout | null;
  action: "approve" | "reject" | "process_wise" | "process_manual" | null;
  onConfirm: (data?: { reason?: string; transactionRef?: string; notes?: string }) => Promise<void>;
  isLoading: boolean;
  wiseConfigured: boolean;
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color: "blue" | "green" | "amber" | "purple" | "red";
}> = ({ title, value, subtitle, icon, trend, color }) => {
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
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                +{trend.value}%
              </span>
              <span className="text-gray-400">{trend.label}</span>
            </div>
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

const StatusBadge: React.FC<{ status: PayoutStatus }> = ({ status }) => {
  const icons: Record<PayoutStatus, React.ReactNode> = {
    pending: <Clock className="h-3 w-3" />,
    approved: <CheckCircle className="h-3 w-3" />,
    processing: <Loader2 className="h-3 w-3 animate-spin" />,
    completed: <CheckCircle className="h-3 w-3" />,
    failed: <XCircle className="h-3 w-3" />,
    rejected: <XCircle className="h-3 w-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
        status
      )}`}
    >
      {icons[status]}
      {getPayoutStatusLabel(status, "fr")}
    </span>
  );
};

// ============================================================================
// PAYOUT ACTION MODAL
// ============================================================================

const PayoutActionModal: React.FC<PayoutActionModalProps> = ({
  isOpen,
  onClose,
  payout,
  action,
  onConfirm,
  isLoading,
  wiseConfigured,
}) => {
  const [reason, setReason] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setTransactionRef("");
      setNotes("");
    }
  }, [isOpen]);

  if (!payout || !action) return null;

  const titles: Record<string, string> = {
    approve: "Approuver le payout",
    reject: "Rejeter le payout",
    process_wise: "Traiter via Wise",
    process_manual: "Marquer comme payé",
  };

  const descriptions: Record<string, string> = {
    approve:
      "Le payout sera marqué comme approuvé. Vous pourrez ensuite le traiter via Wise ou manuellement.",
    reject:
      "Le payout sera rejeté et le solde sera restauré sur le compte de l'affilié.",
    process_wise: wiseConfigured
      ? "Le paiement sera envoyé automatiquement via Wise. L'affilié recevra les fonds sous 1-2 jours ouvrés."
      : "Wise n'est pas configuré. Veuillez utiliser le traitement manuel.",
    process_manual:
      "Confirmez que vous avez effectué le virement bancaire manuellement. Le payout sera marqué comme complété.",
  };

  const handleConfirm = async () => {
    await onConfirm({
      reason,
      transactionRef,
      notes,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titles[action]}>
      <div className="space-y-4">
        {/* Payout Info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Affilié:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {payout.userName}
              </p>
              <p className="text-xs text-gray-400">{payout.userEmail}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Montant:</span>
              <p className="font-bold text-xl text-gray-900 dark:text-white">
                {formatCents(payout.amount, "fr-FR", "EUR")}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Compte:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {payout.bankDetailsSnapshot.maskedAccount}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Devise:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {payout.targetCurrency}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {descriptions[action]}
        </p>

        {/* Reject reason */}
        {action === "reject" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Raison du rejet *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez la raison du rejet..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
          </div>
        )}

        {/* Manual processing fields */}
        {action === "process_manual" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Référence de transaction
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="Ex: VIREMENT-2024-001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes optionnelles..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                rows={2}
              />
            </div>
          </>
        )}

        {/* Wise not configured warning */}
        {action === "process_wise" && !wiseConfigured && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Wise non configuré
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Les secrets WISE_API_TOKEN et WISE_PROFILE_ID ne sont pas
                  définis. Utilisez le traitement manuel.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            variant={action === "reject" ? "secondary" : "primary"}
            onClick={handleConfirm}
            disabled={
              isLoading ||
              (action === "reject" && reason.length < 5) ||
              (action === "process_wise" && !wiseConfigured)
            }
            className={action === "reject" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Traitement...
              </>
            ) : action === "reject" ? (
              "Rejeter"
            ) : action === "process_wise" ? (
              "Envoyer via Wise"
            ) : action === "process_manual" ? (
              "Confirmer le paiement"
            ) : (
              "Approuver"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminAffiliatePayouts: React.FC = () => {
  const {
    globalStats,
    pendingPayouts,
    isLoading,
    wiseConfigured,
    refreshStats,
    refreshPayouts,
    approvePayout,
    rejectPayout,
    processPayoutManual,
    processPayoutWise,
  } = useAffiliateAdmin();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<AffiliatePayout | null>(null);
  const [modalAction, setModalAction] = useState<
    "approve" | "reject" | "process_wise" | "process_manual" | null
  >(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filter payouts
  const filteredPayouts = pendingPayouts.filter((payout) => {
    const matchesStatus =
      filterStatus === "all" || payout.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      payout.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payout.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Stats
  const stats = {
    pendingCount: pendingPayouts.filter((p) => p.status === "pending").length,
    pendingAmount: pendingPayouts
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.amount, 0),
    approvedCount: pendingPayouts.filter((p) => p.status === "approved").length,
    processingCount: pendingPayouts.filter((p) => p.status === "processing").length,
  };

  // Handle action
  const handleAction = (
    payout: AffiliatePayout,
    action: "approve" | "reject" | "process_wise" | "process_manual"
  ) => {
    setSelectedPayout(payout);
    setModalAction(action);
  };

  // Confirm action
  const handleConfirmAction = async (data?: {
    reason?: string;
    transactionRef?: string;
    notes?: string;
  }) => {
    if (!selectedPayout || !modalAction) return;

    setIsProcessing(true);
    try {
      let result: { success: boolean; message: string };

      switch (modalAction) {
        case "approve":
          result = await approvePayout(selectedPayout.id, data?.notes);
          break;
        case "reject":
          result = await rejectPayout(selectedPayout.id, data?.reason || "");
          break;
        case "process_wise":
          result = await processPayoutWise(selectedPayout.id);
          break;
        case "process_manual":
          result = await processPayoutManual(
            selectedPayout.id,
            data?.transactionRef,
            data?.notes
          );
          break;
        default:
          throw new Error("Unknown action");
      }

      setNotification({
        type: result.success ? "success" : "error",
        message: result.message,
      });

      if (result.success) {
        setSelectedPayout(null);
        setModalAction(null);
      }
    } catch (error) {
      setNotification({
        type: "error",
        message: error instanceof Error ? error.message : "Une erreur est survenue",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Refresh on mount
  useEffect(() => {
    refreshStats();
    refreshPayouts();
  }, []);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Paiements Affiliés
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gérez les demandes de retrait des affiliés
            </p>
          </div>
          <div className="flex items-center gap-3">
            {wiseConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                Wise configuré
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Wise non configuré
              </span>
            )}
            <Button
              variant="outline"
              onClick={() => {
                refreshStats();
                refreshPayouts();
              }}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`p-4 rounded-lg flex items-center gap-3 ${
              notification.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            <p>{notification.message}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="En attente"
            value={stats.pendingCount}
            subtitle={formatCents(stats.pendingAmount, "fr-FR", "EUR")}
            icon={<Clock className="h-6 w-6" />}
            color="amber"
          />
          <StatCard
            title="Approuvés"
            value={stats.approvedCount}
            subtitle="Prêts à traiter"
            icon={<CheckCircle className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title="En traitement"
            value={stats.processingCount}
            subtitle="Via Wise"
            icon={<Loader2 className="h-6 w-6" />}
            color="purple"
          />
          <StatCard
            title="Total affiliés"
            value={globalStats?.activeAffiliates || 0}
            subtitle={`${globalStats?.totalReferrals || 0} filleuls`}
            icon={<Users className="h-6 w-6" />}
            color="green"
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
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvés</option>
                <option value="processing">En traitement</option>
                <option value="completed">Complétés</option>
                <option value="failed">Échoués</option>
                <option value="rejected">Rejetés</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="text-center py-12">
              <Banknote className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || filterStatus !== "all"
                  ? "Aucun payout ne correspond aux critères"
                  : "Aucun payout en attente"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Affilié
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Compte
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPayouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {payout.userName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {payout.userEmail}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {formatCents(payout.amount, "fr-FR", "EUR")}
                        </p>
                        {payout.convertedAmount && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ~{formatCents(payout.convertedAmount, "fr-FR", payout.targetCurrency)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900 dark:text-white font-mono">
                          {payout.bankDetailsSnapshot.maskedAccount}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {payout.targetCurrency} • {payout.bankDetailsSnapshot.country}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={payout.status} />
                        {payout.wiseTransferId && (
                          <p className="text-xs text-gray-400 mt-1">
                            Wise #{payout.wiseTransferId}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {new Date(
                            (payout.requestedAt as any)?.toDate?.() ||
                              payout.requestedAt
                          ).toLocaleDateString("fr-FR")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {payout.commissionCount} commissions
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {payout.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => handleAction(payout, "approve")}
                                title="Approuver"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => handleAction(payout, "reject")}
                                title="Rejeter"
                                className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(payout.status === "pending" ||
                            payout.status === "approved") && (
                            <>
                              <Button
                                variant="primary"
                                size="small"
                                onClick={() => handleAction(payout, "process_wise")}
                                disabled={!wiseConfigured}
                                title={
                                  wiseConfigured
                                    ? "Envoyer via Wise"
                                    : "Wise non configuré"
                                }
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => handleAction(payout, "process_manual")}
                                title="Paiement manuel"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {payout.status === "processing" && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              En cours...
                            </span>
                          )}
                          {(payout.status === "completed" ||
                            payout.status === "failed" ||
                            payout.status === "rejected") && (
                            <Button
                              variant="ghost"
                              size="small"
                              onClick={() => {
                                // Could open a details modal
                                console.log("View details", payout);
                              }}
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Légende des actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-gray-600 dark:text-gray-400">Approuver</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Rejeter (restaure le solde)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-indigo-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Wise (automatique)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Manuel (virement effectué)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      <PayoutActionModal
        isOpen={!!modalAction}
        onClose={() => {
          setModalAction(null);
          setSelectedPayout(null);
        }}
        payout={selectedPayout}
        action={modalAction}
        onConfirm={handleConfirmAction}
        isLoading={isProcessing}
        wiseConfigured={wiseConfigured}
      />
    </AdminLayout>
  );
};

export default AdminAffiliatePayouts;
