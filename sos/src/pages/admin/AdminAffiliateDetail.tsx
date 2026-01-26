/**
 * AdminAffiliateDetail - Détail d'un affilié
 *
 * Page admin pour :
 * - Voir les informations complètes d'un affilié
 * - Historique des commissions
 * - Liste des filleuls
 * - Historique des payouts
 * - Actions admin (suspendre, réactiver, ajuster)
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Copy,
  CreditCard,
  Calendar,
  Mail,
  Phone,
  Globe,
  Ban,
  Flag,
  UserCheck,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { getFirestore, doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc, Timestamp } from "firebase/firestore";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { useAuth } from "../../contexts/AuthContext";
import {
  formatCents,
  getCommissionActionTypeLabel,
  getCommissionStatusLabel,
  getPayoutStatusLabel,
  getStatusColor,
  type AffiliateStatus,
  type AffiliateCommission,
  type AffiliatePayout,
  type CommissionStatus,
  type PayoutStatus,
} from "../../types/affiliate";

// ============================================================================
// TYPES
// ============================================================================

interface AffiliateDetail {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: string;
  affiliateCode: string;
  affiliateStatus: AffiliateStatus;
  affiliateAdminNotes?: string;
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  affiliateStats: {
    totalReferrals: number;
    activeReferrals: number;
    totalCommissions: number;
    byType: {
      signup: { count: number; amount: number };
      firstCall: { count: number; amount: number };
      recurringCall: { count: number; amount: number };
      subscription: { count: number; amount: number };
      renewal: { count: number; amount: number };
      providerBonus: { count: number; amount: number };
    };
  };
  capturedRates?: {
    capturedAt: string;
    signupBonus: number;
    callCommissionRate: number;
    subscriptionRate: number;
    providerValidationBonus: number;
  };
  hasBankDetails: boolean;
  bankDetails?: {
    accountType: string;
    accountHolderName: string;
    country: string;
    currency: string;
    maskedAccount?: string;
  };
  referredBy?: string;
  referredByUserId?: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface ReferralUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  firstActionAt?: string;
  totalCommissions: number;
}

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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`p-2.5 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white shadow`}
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

const StatusBadge: React.FC<{ status: AffiliateStatus }> = ({ status }) => {
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
// MAIN COMPONENT
// ============================================================================

const AdminAffiliateDetail: React.FC = () => {
  const { affiliateId } = useParams<{ affiliateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const db = getFirestore();

  // State
  const [affiliate, setAffiliate] = useState<AffiliateDetail | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [referrals, setReferrals] = useState<ReferralUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "commissions" | "referrals" | "payouts">("overview");
  const [copiedCode, setCopiedCode] = useState(false);

  // Action modal
  const [modalAction, setModalAction] = useState<"suspend" | "reactivate" | "flag" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch affiliate data
  const fetchAffiliate = useCallback(async () => {
    if (!affiliateId || !user?.uid) return;

    setIsLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", affiliateId));

      if (!userDoc.exists()) {
        navigate("/admin/affiliates");
        return;
      }

      const data = userDoc.data();
      setAffiliate({
        id: userDoc.id,
        email: data.email || "",
        displayName: data.displayName || `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role || "client",
        affiliateCode: data.affiliateCode || "",
        affiliateStatus: data.affiliateStatus || "active",
        affiliateAdminNotes: data.affiliateAdminNotes,
        totalEarned: data.totalEarned || 0,
        availableBalance: data.availableBalance || 0,
        pendingBalance: data.pendingBalance || 0,
        affiliateStats: data.affiliateStats || {
          totalReferrals: 0,
          activeReferrals: 0,
          totalCommissions: 0,
          byType: {
            signup: { count: 0, amount: 0 },
            firstCall: { count: 0, amount: 0 },
            recurringCall: { count: 0, amount: 0 },
            subscription: { count: 0, amount: 0 },
            renewal: { count: 0, amount: 0 },
            providerBonus: { count: 0, amount: 0 },
          },
        },
        capturedRates: data.capturedRates ? {
          capturedAt: data.capturedRates.capturedAt?.toDate?.()?.toISOString() || "",
          signupBonus: data.capturedRates.signupBonus,
          callCommissionRate: data.capturedRates.callCommissionRate,
          subscriptionRate: data.capturedRates.subscriptionRate,
          providerValidationBonus: data.capturedRates.providerValidationBonus,
        } : undefined,
        hasBankDetails: !!data.bankDetails,
        bankDetails: data.bankDetails ? {
          accountType: data.bankDetails.accountType,
          accountHolderName: "[Chiffré]",
          country: data.bankDetails.country,
          currency: data.bankDetails.currency,
          maskedAccount: data.bankDetails.maskedAccount,
        } : undefined,
        referredBy: data.referredBy,
        referredByUserId: data.referredByUserId,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
        lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() || undefined,
      });

      // Fetch commissions
      const commissionsQuery = query(
        collection(db, "affiliate_commissions"),
        where("referrerId", "==", affiliateId),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const commissionsSnapshot = await getDocs(commissionsQuery);
      setCommissions(
        commissionsSnapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
          createdAt: d.data().createdAt?.toDate?.()?.toISOString() || "",
        })) as AffiliateCommission[]
      );

      // Fetch payouts
      const payoutsQuery = query(
        collection(db, "affiliate_payouts"),
        where("userId", "==", affiliateId),
        orderBy("requestedAt", "desc"),
        limit(20)
      );
      const payoutsSnapshot = await getDocs(payoutsQuery);
      setPayouts(
        payoutsSnapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
          requestedAt: d.data().requestedAt?.toDate?.()?.toISOString() || "",
        })) as AffiliatePayout[]
      );

      // Fetch referrals
      const referralsQuery = query(
        collection(db, "users"),
        where("referredByUserId", "==", affiliateId),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const referralsSnapshot = await getDocs(referralsQuery);
      setReferrals(
        referralsSnapshot.docs.map((d) => {
          const refData = d.data();
          return {
            id: d.id,
            email: refData.email || "",
            displayName: refData.displayName || `${refData.firstName || ""} ${refData.lastName || ""}`.trim() || refData.email,
            role: refData.role || "client",
            createdAt: refData.createdAt?.toDate?.()?.toISOString() || "",
            firstActionAt: refData.firstActionAt?.toDate?.()?.toISOString() || undefined,
            totalCommissions: refData.totalCommissionsGenerated || 0,
          };
        })
      );
    } catch (error) {
      console.error("[AdminAffiliateDetail] Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [affiliateId, user?.uid, db, navigate]);

  useEffect(() => {
    fetchAffiliate();
  }, [fetchAffiliate]);

  // Handle action
  const handleAction = async () => {
    if (!affiliate || !modalAction) return;

    setIsActionLoading(true);
    try {
      const newStatus: AffiliateStatus =
        modalAction === "suspend" ? "suspended" :
        modalAction === "reactivate" ? "active" :
        "flagged";

      const existingNotes = affiliate.affiliateAdminNotes || "";
      const newNote = `[${new Date().toISOString()}] ${modalAction}: ${actionReason}`;

      await updateDoc(doc(db, "users", affiliate.id), {
        affiliateStatus: newStatus,
        affiliateAdminNotes: existingNotes ? `${existingNotes}\n${newNote}` : newNote,
        updatedAt: Timestamp.now(),
      });

      setAffiliate((prev) =>
        prev ? { ...prev, affiliateStatus: newStatus, affiliateAdminNotes: existingNotes ? `${existingNotes}\n${newNote}` : newNote } : prev
      );
      setModalAction(null);
      setActionReason("");
    } catch (error) {
      console.error("[AdminAffiliateDetail] Error updating affiliate:", error);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Copy code
  const copyCode = () => {
    if (affiliate?.affiliateCode) {
      navigator.clipboard.writeText(affiliate.affiliateCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  if (!affiliate) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <p className="text-gray-500">Affilié non trouvé</p>
          <Button variant="outline" onClick={() => navigate("/admin/affiliates")} className="mt-4">
            Retour à la liste
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/affiliates")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {affiliate.displayName}
              </h1>
              <StatusBadge status={affiliate.affiliateStatus} />
            </div>
            <p className="text-sm text-gray-500 mt-1">{affiliate.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={fetchAffiliate}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
            {affiliate.affiliateStatus === "active" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setModalAction("flag")}
                  className="flex items-center gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                >
                  <Flag className="h-4 w-4" />
                  Signaler
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setModalAction("suspend")}
                  className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Ban className="h-4 w-4" />
                  Suspendre
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setModalAction("reactivate")}
                className="flex items-center gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
              >
                <UserCheck className="h-4 w-4" />
                Réactiver
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            title="Gains totaux"
            value={formatCents(affiliate.totalEarned)}
            icon={<TrendingUp className="h-4 w-4" />}
            color="green"
          />
          <StatCard
            title="Disponible"
            value={formatCents(affiliate.availableBalance)}
            subtitle="Pour retrait"
            icon={<DollarSign className="h-4 w-4" />}
            color="purple"
          />
          <StatCard
            title="En attente"
            value={formatCents(affiliate.pendingBalance)}
            subtitle="Non disponible"
            icon={<Clock className="h-4 w-4" />}
            color="amber"
          />
          <StatCard
            title="Filleuls"
            value={affiliate.affiliateStats.totalReferrals}
            subtitle={`${affiliate.affiliateStats.activeReferrals} actifs`}
            icon={<Users className="h-4 w-4" />}
            color="blue"
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-8">
            {[
              { id: "overview", label: "Aperçu" },
              { id: "commissions", label: `Commissions (${commissions.length})` },
              { id: "referrals", label: `Filleuls (${referrals.length})` },
              { id: "payouts", label: `Payouts (${payouts.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informations
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Nom</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {affiliate.displayName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Mail className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {affiliate.email}
                    </p>
                  </div>
                </div>
                {affiliate.phone && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Phone className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Téléphone</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {affiliate.phone}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Globe className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Code affilié</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {affiliate.affiliateCode}
                      </code>
                      <button
                        onClick={copyCode}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {copiedCode ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Membre depuis</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {affiliate.createdAt
                        ? new Date(affiliate.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Coordonnées bancaires
              </h3>
              {affiliate.hasBankDetails && affiliate.bankDetails ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <CreditCard className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Type de compte</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white uppercase">
                        {affiliate.bankDetails.accountType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Globe className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pays / Devise</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {affiliate.bankDetails.country} / {affiliate.bankDetails.currency}
                      </p>
                    </div>
                  </div>
                  {affiliate.bankDetails.maskedAccount && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <CreditCard className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Compte (masqué)</p>
                        <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                          {affiliate.bankDetails.maskedAccount}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    Aucune coordonnée bancaire enregistrée
                  </p>
                </div>
              )}
            </div>

            {/* Captured Rates */}
            {affiliate.capturedRates && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Taux capturés (gelés)
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-500">Bonus inscription</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCents(affiliate.capturedRates.signupBonus)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-500">Commission appels</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {(affiliate.capturedRates.callCommissionRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-500">Commission abonnements</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {(affiliate.capturedRates.subscriptionRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-500">Bonus prestataire validé</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCents(affiliate.capturedRates.providerValidationBonus)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Commission Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Répartition des commissions
              </h3>
              <div className="space-y-3">
                {Object.entries(affiliate.affiliateStats.byType).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    <div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {type === "signup" && "Inscriptions"}
                        {type === "firstCall" && "Premiers appels"}
                        {type === "recurringCall" && "Appels récurrents"}
                        {type === "subscription" && "Abonnements"}
                        {type === "renewal" && "Renouvellements"}
                        {type === "providerBonus" && "Bonus prestataire"}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">({data.count})</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCents(data.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Notes */}
            {affiliate.affiliateAdminNotes && (
              <div className="lg:col-span-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-6">
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Notes admin
                </h3>
                <pre className="text-sm text-amber-700 dark:text-amber-300 whitespace-pre-wrap font-mono">
                  {affiliate.affiliateAdminNotes}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === "commissions" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filleul</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Aucune commission
                    </td>
                  </tr>
                ) : (
                  commissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {new Date(commission.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {getCommissionActionTypeLabel(commission.actionType)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {commission.refereeEmail}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(commission.status)}`}>
                          {getCommissionStatusLabel(commission.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                        {formatCents(commission.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "referrals" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filleul</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inscrit le</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Commissions générées</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {referrals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Aucun filleul
                    </td>
                  </tr>
                ) : (
                  referrals.map((referral) => (
                    <tr key={referral.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {referral.displayName}
                          </p>
                          <p className="text-xs text-gray-500">{referral.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {referral.role}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(referral.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                        {formatCents(referral.totalCommissions)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "payouts" && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Devise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Aucun payout
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {new Date(payout.requestedAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                          {getPayoutStatusLabel(payout.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                        {formatCents(payout.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {payout.targetCurrency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Modal */}
        <Modal
          isOpen={!!modalAction}
          onClose={() => {
            setModalAction(null);
            setActionReason("");
          }}
          title={
            modalAction === "suspend" ? "Suspendre l'affilié" :
            modalAction === "reactivate" ? "Réactiver l'affilié" :
            "Signaler l'affilié"
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {modalAction === "suspend" && "L'affilié ne pourra plus générer de commissions ni effectuer de retraits."}
              {modalAction === "reactivate" && "L'affilié pourra à nouveau générer des commissions et effectuer des retraits."}
              {modalAction === "flag" && "L'affilié sera marqué pour vérification. Il pourra toujours opérer mais sera surveillé."}
            </p>

            {modalAction !== "reactivate" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Raison {modalAction === "suspend" ? "(obligatoire)" : "(optionnelle)"}
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Indiquez la raison..."
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setModalAction(null);
                  setActionReason("");
                }}
                disabled={isActionLoading}
              >
                Annuler
              </Button>
              <Button
                variant={modalAction === "reactivate" ? "primary" : "secondary"}
                onClick={handleAction}
                disabled={isActionLoading || (modalAction === "suspend" && !actionReason.trim())}
                className={`flex items-center gap-2 ${modalAction !== "reactivate" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
              >
                {isActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {modalAction === "suspend" && "Suspendre"}
                {modalAction === "reactivate" && "Réactiver"}
                {modalAction === "flag" && "Signaler"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default AdminAffiliateDetail;
