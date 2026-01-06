import React, { useState, useEffect } from "react";
import { useIntl, FormattedMessage } from "react-intl";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Mail,
  DollarSign,
  User,
  Calendar,
  Search,
  Filter,
  Eye,
  Send,
  Loader2,
  TrendingUp,
  AlertCircle,
  CreditCard,
} from "lucide-react";

// Types
interface FailedPayoutAlert {
  id: string;
  providerId: string;
  providerEmail?: string;
  providerName?: string;
  amount: number;
  currency: string;
  orderId?: string;
  callSessionId?: string;
  status: "pending" | "failed" | "max_retries_reached" | "resolved";
  retryCount: number;
  lastError?: string;
  createdAt: Timestamp;
  lastRetryAt?: Timestamp;
  resolvedAt?: Timestamp;
  escalatedAt?: Timestamp;
}

interface PendingTransfer {
  id: string;
  providerId: string;
  providerEmail?: string;
  providerName?: string;
  providerAmount: number;
  currency: string;
  paymentIntentId: string;
  callSessionId?: string;
  status: "pending_kyc" | "processing" | "completed" | "failed";
  createdAt: Timestamp;
  escalatedAt?: Timestamp;
}

interface EscrowStats {
  stripe: {
    pendingCount: number;
    pendingAmountEur: number;
    oldestPendingDays: number;
  };
  paypal: {
    failedCount: number;
    failedAmountEur: number;
    oldestFailedDays: number;
  };
  totalEscrowEur: number;
}

const AdminFinancePayouts: React.FC = () => {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState<"paypal" | "stripe">("paypal");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<EscrowStats | null>(null);
  const [failedPayouts, setFailedPayouts] = useState<FailedPayoutAlert[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<FailedPayoutAlert | PendingTransfer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Charger les stats d'escrow
      const statsPromise = loadEscrowStats();

      // Charger les failed_payouts_alerts (PayPal)
      const paypalQuery = query(
        collection(db, "failed_payouts_alerts"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const paypalSnapshot = await getDocs(paypalQuery);
      const paypalData = paypalSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FailedPayoutAlert[];
      setFailedPayouts(paypalData);

      // Charger les pending_transfers (Stripe)
      const stripeQuery = query(
        collection(db, "pending_transfers"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const stripeSnapshot = await getDocs(stripeQuery);
      const stripeData = stripeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PendingTransfer[];
      setPendingTransfers(stripeData);

      const statsResult = await statsPromise;
      setStats(statsResult);
    } catch (err) {
      console.error("Erreur chargement données:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const loadEscrowStats = async (): Promise<EscrowStats> => {
    const now = new Date();

    // PayPal stats
    const paypalQuery = query(
      collection(db, "failed_payouts_alerts"),
      where("status", "in", ["pending", "failed", "max_retries_reached"])
    );
    const paypalSnapshot = await getDocs(paypalQuery);

    let paypalAmount = 0;
    let oldestPaypalDays = 0;

    paypalSnapshot.forEach((doc) => {
      const data = doc.data();
      paypalAmount += data.amount || 0;
      const createdAt = data.createdAt?.toDate?.();
      if (createdAt) {
        const days = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        if (days > oldestPaypalDays) oldestPaypalDays = days;
      }
    });

    // Stripe stats
    const stripeQuery = query(
      collection(db, "pending_transfers"),
      where("status", "==", "pending_kyc")
    );
    const stripeSnapshot = await getDocs(stripeQuery);

    let stripeAmount = 0;
    let oldestStripeDays = 0;

    stripeSnapshot.forEach((doc) => {
      const data = doc.data();
      stripeAmount += (data.providerAmount || 0) / 100;
      const createdAt = data.createdAt?.toDate?.();
      if (createdAt) {
        const days = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        if (days > oldestStripeDays) oldestStripeDays = days;
      }
    });

    return {
      stripe: {
        pendingCount: stripeSnapshot.size,
        pendingAmountEur: stripeAmount,
        oldestPendingDays: oldestStripeDays,
      },
      paypal: {
        failedCount: paypalSnapshot.size,
        failedAmountEur: paypalAmount,
        oldestFailedDays: oldestPaypalDays,
      },
      totalEscrowEur: stripeAmount + paypalAmount,
    };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="w-3 h-3" />, label: "En attente" },
      failed: { color: "bg-red-100 text-red-800", icon: <XCircle className="w-3 h-3" />, label: "Échec" },
      max_retries_reached: { color: "bg-orange-100 text-orange-800", icon: <AlertTriangle className="w-3 h-3" />, label: "Max retries" },
      resolved: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-3 h-3" />, label: "Résolu" },
      pending_kyc: { color: "bg-blue-100 text-blue-800", icon: <User className="w-3 h-3" />, label: "KYC en attente" },
      processing: { color: "bg-purple-100 text-purple-800", icon: <RefreshCw className="w-3 h-3" />, label: "En cours" },
      completed: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-3 h-3" />, label: "Complété" },
    };

    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800", icon: null, label: status };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const getDaysAgo = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate();
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    return `Il y a ${days} jours`;
  };

  const getDaysAgoColor = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "text-gray-500";
    const date = timestamp.toDate();
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days >= 90) return "text-red-600 font-semibold";
    if (days >= 30) return "text-orange-600";
    if (days >= 7) return "text-yellow-600";
    return "text-gray-600";
  };

  const handleRetryPayout = async (item: FailedPayoutAlert) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Appeler la fonction de retry
      const retryPayout = httpsCallable(functions, "retryPayPalPayout");
      await retryPayout({ alertId: item.id });

      setSuccess("Retry lancé avec succès");
      await loadData();
    } catch (err: any) {
      console.error("Erreur retry:", err);
      setError(err.message || "Erreur lors du retry");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendReminder = async (item: FailedPayoutAlert | PendingTransfer) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Créer un message_event pour rappeler au provider de compléter son KYC
      const providerId = item.providerId;
      const amount = "amount" in item ? item.amount : (item as PendingTransfer).providerAmount / 100;

      await getDocs(collection(db, "users")).then(async () => {
        const triggerKycReminder = httpsCallable(functions, "triggerKYCReminders");
        await triggerKycReminder({ providerId });
      });

      setSuccess("Rappel envoyé avec succès");
    } catch (err: any) {
      console.error("Erreur envoi rappel:", err);
      setError(err.message || "Erreur lors de l'envoi du rappel");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkResolved = async (item: FailedPayoutAlert) => {
    setIsProcessing(true);
    setError(null);

    try {
      await updateDoc(doc(db, "failed_payouts_alerts", item.id), {
        status: "resolved",
        resolvedAt: Timestamp.now(),
        resolvedBy: "admin",
      });

      setSuccess("Marqué comme résolu");
      await loadData();
      setSelectedItem(null);
    } catch (err: any) {
      console.error("Erreur résolution:", err);
      setError(err.message || "Erreur lors de la résolution");
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrer les données
  const filteredPaypal = failedPayouts.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.providerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.providerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.providerId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredStripe = pendingTransfers.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.providerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.providerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.providerId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Chargement...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            <FormattedMessage id="admin.payouts.title" defaultMessage="Fonds en Transit (Escrow)" />
          </h1>
          <p className="text-gray-600 mt-1">
            <FormattedMessage
              id="admin.payouts.description"
              defaultMessage="Suivi des paiements en attente de KYC provider"
            />
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* Total Escrow */}
            <div className={`bg-white rounded-lg border p-4 ${stats.totalEscrowEur > 1000 ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Escrow</p>
                  <p className={`text-2xl font-bold ${stats.totalEscrowEur > 1000 ? "text-red-600" : "text-gray-900"}`}>
                    {stats.totalEscrowEur.toFixed(2)}€
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stats.totalEscrowEur > 1000 ? "bg-red-100" : "bg-blue-100"}`}>
                  <DollarSign className={`w-6 h-6 ${stats.totalEscrowEur > 1000 ? "text-red-600" : "text-blue-600"}`} />
                </div>
              </div>
              {stats.totalEscrowEur > 1000 && (
                <p className="text-xs text-red-600 mt-2 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Seuil dépassé (1000€)
                </p>
              )}
            </div>

            {/* PayPal Failed */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">PayPal en échec</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.paypal.failedCount}</p>
                </div>
                <div className="p-3 rounded-full bg-orange-100">
                  <CreditCard className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{stats.paypal.failedAmountEur.toFixed(2)}€</p>
            </div>

            {/* Stripe Pending */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Stripe en attente</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.stripe.pendingCount}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{stats.stripe.pendingAmountEur.toFixed(2)}€</p>
            </div>

            {/* Oldest PayPal */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">+ ancien PayPal</p>
                  <p className={`text-2xl font-bold ${stats.paypal.oldestFailedDays >= 90 ? "text-red-600" : stats.paypal.oldestFailedDays >= 30 ? "text-orange-600" : "text-gray-900"}`}>
                    {stats.paypal.oldestFailedDays}j
                  </p>
                </div>
                <div className="p-3 rounded-full bg-yellow-100">
                  <Calendar className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            {/* Oldest Stripe */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">+ ancien Stripe</p>
                  <p className={`text-2xl font-bold ${stats.stripe.oldestPendingDays >= 90 ? "text-red-600" : stats.stripe.oldestPendingDays >= 30 ? "text-orange-600" : "text-gray-900"}`}>
                    {stats.stripe.oldestPendingDays}j
                  </p>
                </div>
                <div className="p-3 rounded-full bg-indigo-100">
                  <Calendar className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("paypal")}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === "paypal"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              PayPal ({failedPayouts.filter(p => ["pending", "failed", "max_retries_reached"].includes(p.status)).length})
            </button>
            <button
              onClick={() => setActiveTab("stripe")}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === "stripe"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Stripe ({pendingTransfers.filter(p => p.status === "pending_kyc").length})
            </button>
          </nav>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par email, nom ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              {activeTab === "paypal" ? (
                <>
                  <option value="pending">En attente</option>
                  <option value="failed">Échec</option>
                  <option value="max_retries_reached">Max retries</option>
                  <option value="resolved">Résolu</option>
                </>
              ) : (
                <>
                  <option value="pending_kyc">KYC en attente</option>
                  <option value="processing">En cours</option>
                  <option value="completed">Complété</option>
                  <option value="failed">Échec</option>
                </>
              )}
            </select>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {/* Table PayPal */}
        {activeTab === "paypal" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retries</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPaypal.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Aucun payout PayPal en attente
                    </td>
                  </tr>
                ) : (
                  filteredPaypal.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.providerName || "N/A"}</p>
                          <p className="text-sm text-gray-500">{item.providerEmail || item.providerId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          {item.amount.toFixed(2)} {item.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4">
                        <span className={`${item.retryCount >= 3 ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                          {item.retryCount || 0}/3
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={getDaysAgoColor(item.createdAt)}>
                          {getDaysAgo(item.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {item.status !== "resolved" && (
                            <>
                              <button
                                onClick={() => handleRetryPayout(item)}
                                disabled={isProcessing || item.retryCount >= 3}
                                className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                                title="Retry payout"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSendReminder(item)}
                                disabled={isProcessing}
                                className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                title="Envoyer rappel KYC"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Stripe */}
        {activeTab === "stripe" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Intent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStripe.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Aucun transfert Stripe en attente
                    </td>
                  </tr>
                ) : (
                  filteredStripe.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.providerName || "N/A"}</p>
                          <p className="text-sm text-gray-500">{item.providerEmail || item.providerId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          {(item.providerAmount / 100).toFixed(2)} {item.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {item.paymentIntentId?.slice(0, 20)}...
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className={getDaysAgoColor(item.createdAt)}>
                          {getDaysAgo(item.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {item.status === "pending_kyc" && (
                            <button
                              onClick={() => handleSendReminder(item)}
                              disabled={isProcessing}
                              className="p-2 text-green-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                              title="Envoyer rappel KYC"
                            >
                              <Mail className="w-4 h-4" />
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
        )}

        {/* Modal de détails */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Détails du paiement</h3>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <XCircle className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Provider ID</p>
                    <p className="font-mono text-sm">{selectedItem.providerId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p>{("providerEmail" in selectedItem ? selectedItem.providerEmail : null) || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Montant</p>
                    <p className="font-semibold text-lg">
                      {"amount" in selectedItem
                        ? `${selectedItem.amount.toFixed(2)} ${selectedItem.currency}`
                        : `${((selectedItem as PendingTransfer).providerAmount / 100).toFixed(2)} ${selectedItem.currency}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Statut</p>
                    {getStatusBadge(selectedItem.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date de création</p>
                    <p>{selectedItem.createdAt?.toDate?.()?.toLocaleString() || "N/A"}</p>
                  </div>
                  {"retryCount" in selectedItem && (
                    <div>
                      <p className="text-sm text-gray-500">Tentatives</p>
                      <p>{selectedItem.retryCount || 0}/3</p>
                    </div>
                  )}
                </div>

                {"lastError" in selectedItem && selectedItem.lastError && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-800">Dernière erreur</p>
                    <p className="text-sm text-red-600 mt-1">{selectedItem.lastError}</p>
                  </div>
                )}

                {"escalatedAt" in selectedItem && selectedItem.escalatedAt && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium text-orange-800 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Escaladé le {selectedItem.escalatedAt.toDate?.()?.toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                {"status" in selectedItem && selectedItem.status !== "resolved" && "amount" in selectedItem && (
                  <button
                    onClick={() => handleMarkResolved(selectedItem as FailedPayoutAlert)}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Marquer comme résolu
                  </button>
                )}
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFinancePayouts;
