/**
 * AdminAffiliateFraudAlerts - Gestion des alertes fraude
 *
 * Page admin pour :
 * - Voir les alertes de fraude détectées
 * - Valider ou bloquer les affiliés suspects
 * - Historique des actions
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Loader2,
  Flag,
  Ban,
  UserCheck,
  Clock,
  MapPin,
  Mail,
  Smartphone,
  Globe,
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
  addDoc,
  Timestamp,
} from "firebase/firestore";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { useAuth } from "../../contexts/AuthContext";

// ============================================================================
// TYPES
// ============================================================================

interface FraudAlert {
  id: string;
  affiliateId: string;
  affiliateEmail: string;
  affiliateCode: string;
  type: "suspicious_signup" | "rate_limit" | "same_ip" | "email_domain" | "pattern_detected";
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "validated" | "dismissed" | "blocked";
  details: {
    ip?: string;
    emailDomain?: string;
    signupsFromIP?: number;
    signupsLastHour?: number;
    deviceFingerprint?: string;
    suspiciousPatterns?: string[];
  };
  refereeId?: string;
  refereeEmail?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

interface FlaggedAffiliate {
  id: string;
  email: string;
  displayName: string;
  affiliateCode: string;
  affiliateStatus: string;
  flaggedAt: string;
  flagReason: string;
  alertCount: number;
  totalEarned: number;
}

// ============================================================================
// SEVERITY BADGE COMPONENT
// ============================================================================

const SeverityBadge: React.FC<{ severity: FraudAlert["severity"] }> = ({ severity }) => {
  const config = {
    low: {
      label: "Faible",
      classes: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    },
    medium: {
      label: "Moyen",
      classes: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    },
    high: {
      label: "Élevé",
      classes: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
    },
    critical: {
      label: "Critique",
      classes: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    },
  };

  const { label, classes } = config[severity];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
};

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

const StatusBadge: React.FC<{ status: FraudAlert["status"] }> = ({ status }) => {
  const config = {
    pending: {
      icon: <Clock className="h-3 w-3" />,
      label: "En attente",
      classes: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    },
    validated: {
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Validé",
      classes: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    },
    dismissed: {
      icon: <XCircle className="h-3 w-3" />,
      label: "Ignoré",
      classes: "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400",
    },
    blocked: {
      icon: <Ban className="h-3 w-3" />,
      label: "Bloqué",
      classes: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    },
  };

  const { icon, label, classes } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${classes}`}>
      {icon}
      {label}
    </span>
  );
};

// ============================================================================
// ALERT TYPE LABEL
// ============================================================================

const getAlertTypeLabel = (type: FraudAlert["type"]): string => {
  const labels: Record<FraudAlert["type"], string> = {
    suspicious_signup: "Inscription suspecte",
    rate_limit: "Limite de fréquence",
    same_ip: "Même IP",
    email_domain: "Domaine email bloqué",
    pattern_detected: "Pattern détecté",
  };
  return labels[type] || type;
};

// ============================================================================
// STAT CARD
// ============================================================================

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminAffiliateFraudAlerts: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const db = getFirestore();

  // State
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [flaggedAffiliates, setFlaggedAffiliates] = useState<FlaggedAffiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"alerts" | "flagged">("alerts");
  const [filterStatus, setFilterStatus] = useState<FraudAlert["status"] | "all">("pending");

  // Modal state
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"validate" | "dismiss" | "block" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);

    try {
      // Fetch fraud alerts
      const alertsQuery = query(
        collection(db, "affiliate_fraud_alerts"),
        orderBy("createdAt", "desc"),
        limit(200)
      );
      const alertsSnapshot = await getDocs(alertsQuery);

      const alertsData: FraudAlert[] = alertsSnapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          affiliateId: d.affiliateId || "",
          affiliateEmail: d.affiliateEmail || "",
          affiliateCode: d.affiliateCode || "",
          type: d.type || "pattern_detected",
          severity: d.severity || "medium",
          status: d.status || "pending",
          details: d.details || {},
          refereeId: d.refereeId,
          refereeEmail: d.refereeEmail,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || "",
          resolvedAt: d.resolvedAt?.toDate?.()?.toISOString(),
          resolvedBy: d.resolvedBy,
          resolution: d.resolution,
        };
      });
      setAlerts(alertsData);

      // Fetch flagged affiliates
      const flaggedQuery = query(
        collection(db, "users"),
        where("affiliateStatus", "==", "flagged")
      );
      const flaggedSnapshot = await getDocs(flaggedQuery);

      const flaggedData: FlaggedAffiliate[] = flaggedSnapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          email: d.email || "",
          displayName: d.displayName || `${d.firstName || ""} ${d.lastName || ""}`.trim(),
          affiliateCode: d.affiliateCode || "",
          affiliateStatus: d.affiliateStatus || "",
          flaggedAt: d.flaggedAt?.toDate?.()?.toISOString() || "",
          flagReason: d.flagReason || "",
          alertCount: alertsData.filter((a) => a.affiliateId === docSnap.id).length,
          totalEarned: d.totalEarned || 0,
        };
      });
      setFlaggedAffiliates(flaggedData);
    } catch (err) {
      console.error("[AdminAffiliateFraudAlerts] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, db]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter alerts
  const filteredAlerts = alerts.filter(
    (a) => filterStatus === "all" || a.status === filterStatus
  );

  // Stats
  const stats = {
    pending: alerts.filter((a) => a.status === "pending").length,
    critical: alerts.filter((a) => a.status === "pending" && a.severity === "critical").length,
    blocked: alerts.filter((a) => a.status === "blocked").length,
    flaggedAffiliates: flaggedAffiliates.length,
  };

  // Handle action
  const handleAction = async () => {
    if (!selectedAlert || !actionType) return;

    setIsProcessing(true);

    try {
      const newStatus: FraudAlert["status"] =
        actionType === "validate" ? "validated" :
        actionType === "dismiss" ? "dismissed" : "blocked";

      // Update alert
      await updateDoc(doc(db, "affiliate_fraud_alerts", selectedAlert.id), {
        status: newStatus,
        resolvedAt: Timestamp.now(),
        resolvedBy: user?.uid,
        resolution: actionNote,
        updatedAt: Timestamp.now(),
      });

      // If blocking, also update the affiliate
      if (actionType === "block" && selectedAlert.affiliateId) {
        await updateDoc(doc(db, "users", selectedAlert.affiliateId), {
          affiliateStatus: "suspended",
          suspendedAt: Timestamp.now(),
          suspendedBy: user?.uid,
          suspendReason: `Fraude: ${actionNote}`,
          updatedAt: Timestamp.now(),
        });
      }

      // If validating (false positive), unflag if needed
      if (actionType === "validate" && selectedAlert.affiliateId) {
        await updateDoc(doc(db, "users", selectedAlert.affiliateId), {
          affiliateStatus: "active",
          flaggedAt: null,
          flagReason: null,
          updatedAt: Timestamp.now(),
        });
      }

      setShowActionModal(false);
      setSelectedAlert(null);
      setActionType(null);
      setActionNote("");
      fetchData();
    } catch (err) {
      console.error("[AdminAffiliateFraudAlerts] Action error:", err);
    } finally {
      setIsProcessing(false);
    }
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="h-6 w-6 text-red-500" />
              Alertes Fraude
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Détection et gestion des activités suspectes
            </p>
          </div>
          <Button onClick={() => fetchData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="En attente"
            value={stats.pending}
            icon={<Clock className="h-5 w-5 text-white" />}
            color="bg-gradient-to-br from-amber-500 to-amber-600"
          />
          <StatCard
            title="Critiques"
            value={stats.critical}
            icon={<AlertTriangle className="h-5 w-5 text-white" />}
            color="bg-gradient-to-br from-red-500 to-red-600"
          />
          <StatCard
            title="Bloqués"
            value={stats.blocked}
            icon={<Ban className="h-5 w-5 text-white" />}
            color="bg-gradient-to-br from-gray-500 to-gray-600"
          />
          <StatCard
            title="Affiliés signalés"
            value={stats.flaggedAffiliates}
            icon={<Flag className="h-5 w-5 text-white" />}
            color="bg-gradient-to-br from-orange-500 to-orange-600"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab("alerts")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === "alerts"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              Alertes ({alerts.length})
            </button>
            <button
              onClick={() => setActiveTab("flagged")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === "flagged"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Flag className="h-4 w-4" />
              Affiliés signalés ({flaggedAffiliates.length})
            </button>
          </nav>
        </div>

        {/* Alerts Tab */}
        {activeTab === "alerts" && (
          <>
            {/* Filter */}
            <div className="flex gap-2">
              {(["all", "pending", "validated", "dismissed", "blocked"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  {status === "all" ? "Toutes" :
                   status === "pending" ? "En attente" :
                   status === "validated" ? "Validées" :
                   status === "dismissed" ? "Ignorées" : "Bloquées"}
                </button>
              ))}
            </div>

            {/* Alerts List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affilié</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sévérité</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(alert.createdAt).toLocaleDateString("fr-FR")}
                          <br />
                          <span className="text-xs">
                            {new Date(alert.createdAt).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {getAlertTypeLabel(alert.type)}
                          </span>
                          {alert.details.ip && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Globe className="h-3 w-3" />
                              {alert.details.ip}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate(`/admin/affiliates/${alert.affiliateId}`)}
                            className="text-left hover:underline"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {alert.affiliateEmail}
                            </p>
                            <p className="text-xs text-gray-500">{alert.affiliateCode}</p>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <SeverityBadge severity={alert.severity} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={alert.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedAlert(alert);
                                setShowDetailModal(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                              title="Détails"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {alert.status === "pending" && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedAlert(alert);
                                    setActionType("validate");
                                    setShowActionModal(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"
                                  title="Faux positif"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAlert(alert);
                                    setActionType("block");
                                    setShowActionModal(true);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                  title="Bloquer"
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAlerts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">Aucune alerte</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Flagged Affiliates Tab */}
        {activeTab === "flagged" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affilié</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raison</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Alertes</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gains</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {flaggedAffiliates.map((affiliate) => (
                    <tr key={affiliate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/admin/affiliates/${affiliate.id}`)}
                          className="text-left hover:underline"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {affiliate.displayName || affiliate.email}
                          </p>
                          <p className="text-xs text-gray-500">{affiliate.affiliateCode}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {affiliate.flagReason || "Non spécifié"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${
                          affiliate.alertCount > 5 ? "text-red-600" :
                          affiliate.alertCount > 2 ? "text-amber-600" : "text-gray-600"
                        }`}>
                          {affiliate.alertCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                        {(affiliate.totalEarned / 100).toFixed(2)} €
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/admin/affiliates/${affiliate.id}`)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {flaggedAffiliates.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <Flag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Aucun affilié signalé</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAlert(null);
          }}
          title="Détails de l'alerte"
        >
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SeverityBadge severity={selectedAlert.severity} />
                <StatusBadge status={selectedAlert.status} />
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getAlertTypeLabel(selectedAlert.type)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Affilié</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedAlert.affiliateEmail}
                  </p>
                  <p className="text-xs text-gray-500">{selectedAlert.affiliateCode}</p>
                </div>
                {selectedAlert.refereeEmail && (
                  <div>
                    <p className="text-xs text-gray-500">Filleul concerné</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedAlert.refereeEmail}
                    </p>
                  </div>
                )}
              </div>

              {selectedAlert.details && Object.keys(selectedAlert.details).length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                    Détails de la détection
                  </p>
                  <ul className="space-y-1 text-sm text-amber-600 dark:text-amber-300">
                    {selectedAlert.details.ip && (
                      <li className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        IP: {selectedAlert.details.ip}
                      </li>
                    )}
                    {selectedAlert.details.signupsFromIP && (
                      <li>
                        Inscriptions depuis cette IP: {selectedAlert.details.signupsFromIP}
                      </li>
                    )}
                    {selectedAlert.details.signupsLastHour && (
                      <li>
                        Inscriptions dernière heure: {selectedAlert.details.signupsLastHour}
                      </li>
                    )}
                    {selectedAlert.details.emailDomain && (
                      <li className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Domaine: {selectedAlert.details.emailDomain}
                      </li>
                    )}
                    {selectedAlert.details.suspiciousPatterns?.map((pattern, i) => (
                      <li key={i}>{pattern}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAlert.resolution && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500">Résolution</p>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedAlert.resolution}</p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedAlert(null);
                  }}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Action Modal */}
        <Modal
          isOpen={showActionModal}
          onClose={() => {
            setShowActionModal(false);
            setSelectedAlert(null);
            setActionType(null);
            setActionNote("");
          }}
          title={
            actionType === "validate" ? "Marquer comme faux positif" :
            actionType === "dismiss" ? "Ignorer l'alerte" :
            "Bloquer l'affilié"
          }
        >
          <div className="space-y-4">
            {actionType === "block" && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  Cette action va suspendre l'affilié. Il ne pourra plus générer de commissions
                  ni effectuer de retraits.
                </p>
              </div>
            )}

            {actionType === "validate" && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Cette alerte sera marquée comme faux positif. L'affilié sera remis en statut actif
                  s'il était signalé.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note (obligatoire)
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
                placeholder="Expliquez votre décision..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedAlert(null);
                  setActionType(null);
                  setActionNote("");
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleAction}
                disabled={isProcessing || !actionNote.trim()}
                className={
                  actionType === "block"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : actionType === "block" ? (
                  <Ban className="h-4 w-4 mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {actionType === "validate" ? "Valider" :
                 actionType === "dismiss" ? "Ignorer" : "Bloquer"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default AdminAffiliateFraudAlerts;
