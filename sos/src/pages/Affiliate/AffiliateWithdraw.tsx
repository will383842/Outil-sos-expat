/**
 * AffiliateWithdraw - Withdrawal request page
 * Shows available balance and allows withdrawal requests
 */

import React, { useState, useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Banknote,
  ChevronLeft,
  PiggyBank,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  Loader2,
  Info,
} from "lucide-react";
import { useLocaleNavigate } from "@/multilingual-system";
import { getTranslatedRouteSlug, type RouteKey } from "@/multilingual-system/core/routing/localeRoutes";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAffiliate } from "@/hooks/useAffiliate";
import { formatCents, getPayoutStatusLabel } from "@/types/affiliate";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TelegramConnect from "@/components/shared/TelegramConnect";

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    ghost: "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
} as const;

const AffiliateWithdraw: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || "en") as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

  const { user, refreshUser } = useAuth();
  const {
    affiliateData,
    payouts,
    isLoading,
    canWithdraw,
    minimumWithdrawal,
    requestWithdrawal,
  } = useAffiliate();

  const hasTelegram = !!user?.telegramId;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Translated routes
  const routes = useMemo(
    () => ({
      dashboard: `/${getTranslatedRouteSlug("affiliate-dashboard" as RouteKey, langCode)}`,
      bankDetails: `/${getTranslatedRouteSlug("affiliate-bank-details" as RouteKey, langCode)}`,
    }),
    [langCode]
  );

  // Handle withdrawal request
  const handleWithdrawal = async () => {
    if (!canWithdraw) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await requestWithdrawal();
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || intl.formatMessage({ id: "affiliate.withdraw.error", defaultMessage: "Erreur lors de la demande" }));
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
      // Map backend error codes to user-friendly messages
      const errorCode = err instanceof Error ? err.message : "";
      if (errorCode.includes("TELEGRAM_REQUIRED") || errorCode.includes("TELEGRAM_SEND_FAILED")) {
        setError(intl.formatMessage({ id: "affiliate.withdraw.error.telegram", defaultMessage: "Veuillez d'abord connecter votre compte Telegram." }));
      } else if (errorCode.includes("pending withdrawal") || errorCode.includes("pending payout")) {
        setError(intl.formatMessage({ id: "affiliate.withdraw.error.pending", defaultMessage: "Vous avez deja un retrait en cours." }));
      } else if (errorCode.includes("Insufficient") || errorCode.includes("below the minimum")) {
        setError(intl.formatMessage({ id: "affiliate.withdraw.error.insufficient", defaultMessage: "Solde insuffisant pour effectuer un retrait." }));
      } else if (errorCode.includes("bank details") || errorCode.includes("Bank details")) {
        setError(intl.formatMessage({ id: "affiliate.withdraw.error.bankDetails", defaultMessage: "Veuillez d'abord ajouter vos coordonnees bancaires." }));
      } else {
        setError(intl.formatMessage({ id: "affiliate.withdraw.error", defaultMessage: "Erreur lors de la demande. Veuillez reessayer." }));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payout status icon
  const getPayoutStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case "processing":
        return <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "pending":
        return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // Payout status color
  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
      case "processing":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400";
      case "pending":
        return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      case "failed":
        return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400";
    }
  };

  // Check if there's a pending payout
  const hasPendingPayout = affiliateData?.pendingPayoutId != null;

  // Success state
  if (success) {
    return (
      <DashboardLayout activeKey="affiliate-withdraw">
        <div className="max-w-lg mx-auto py-12">
          <div className={`${UI.card} p-8 text-center`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage id="affiliate.withdraw.success.title" defaultMessage="Demande envoyée !" />
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              <FormattedMessage
                id="affiliate.withdraw.success.description"
                defaultMessage="Votre demande de retrait a été enregistrée. Vous recevrez vos fonds sous 2-5 jours ouvrés."
              />
            </p>
            <button
              onClick={() => navigate(routes.dashboard)}
              className={`${UI.button.primary} px-6 py-3 w-full`}
            >
              <FormattedMessage id="affiliate.withdraw.backToDashboard" defaultMessage="Retour au tableau de bord" />
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeKey="affiliate-withdraw">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(routes.dashboard)} className={`${UI.button.ghost} p-2`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="affiliate.withdraw.title" defaultMessage="Retirer mes gains" />
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              <FormattedMessage id="affiliate.withdraw.subtitle" defaultMessage="Transférez votre solde vers votre compte bancaire" />
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Withdrawal Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Balance */}
            <div className={`${UI.card} p-6`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
                  <PiggyBank className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="affiliate.withdraw.availableBalance" defaultMessage="Solde disponible" />
                  </p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {formatCents(affiliateData?.availableBalance || 0, intl.locale)}
                  </p>
                </div>
              </div>

              {/* Progress to minimum */}
              {(affiliateData?.availableBalance || 0) < minimumWithdrawal && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-300">
                        <FormattedMessage id="affiliate.withdraw.belowMinimum.title" defaultMessage="Seuil non atteint" />
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        <FormattedMessage
                          id="affiliate.withdraw.belowMinimum.description"
                          defaultMessage="Le retrait minimum est de {amount}. Il vous manque encore {remaining}."
                          values={{
                            amount: formatCents(minimumWithdrawal, intl.locale),
                            remaining: formatCents(minimumWithdrawal - (affiliateData?.availableBalance || 0), intl.locale),
                          }}
                        />
                      </p>
                      <div className="mt-3 h-2 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, ((affiliateData?.availableBalance || 0) / minimumWithdrawal) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank details check */}
              {!affiliateData?.hasBankDetails && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl mb-6">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-800 dark:text-blue-300">
                        <FormattedMessage id="affiliate.withdraw.noBankDetails.title" defaultMessage="Coordonnées bancaires requises" />
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        <FormattedMessage
                          id="affiliate.withdraw.noBankDetails.description"
                          defaultMessage="Ajoutez vos coordonnées bancaires pour pouvoir retirer vos gains."
                        />
                      </p>
                      <button
                        onClick={() => navigate(routes.bankDetails)}
                        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <FormattedMessage id="affiliate.withdraw.addBankDetails" defaultMessage="Ajouter mes coordonnées" />
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Telegram connection required */}
              {!hasTelegram && (
                <div className="mb-6">
                  <TelegramConnect role="affiliate" onConnected={refreshUser} />
                </div>
              )}

              {/* Pending payout warning */}
              {hasPendingPayout && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl mb-6">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-300">
                        <FormattedMessage id="affiliate.withdraw.pendingPayout.title" defaultMessage="Retrait en cours" />
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        <FormattedMessage
                          id="affiliate.withdraw.pendingPayout.description"
                          defaultMessage="Vous avez déjà un retrait en cours de traitement. Veuillez patienter qu'il soit complété."
                        />
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl mb-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                </div>
              )}

              {/* Withdrawal button */}
              <button
                onClick={handleWithdrawal}
                disabled={!canWithdraw || isSubmitting || !hasTelegram}
                className={`${UI.button.primary} w-full py-4 flex items-center justify-center gap-2`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <FormattedMessage id="affiliate.withdraw.processing" defaultMessage="Traitement en cours..." />
                  </>
                ) : (
                  <>
                    <Banknote className="w-5 h-5" />
                    <FormattedMessage
                      id="affiliate.withdraw.requestButton"
                      defaultMessage="Retirer {amount}"
                      values={{ amount: formatCents(affiliateData?.availableBalance || 0, intl.locale) }}
                    />
                  </>
                )}
              </button>

              {/* Info */}
              <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  <FormattedMessage
                    id="affiliate.withdraw.info"
                    defaultMessage="Les retraits sont traités sous 2-5 jours ouvrés via Wise. Des frais de transfert peuvent s'appliquer selon votre banque."
                  />
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Payout History */}
          <div className="space-y-6">
            <div className={`${UI.card} overflow-hidden`}>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  <FormattedMessage id="affiliate.withdraw.history" defaultMessage="Historique des retraits" />
                </h3>
              </div>

              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className={`${UI.skeleton} h-4 w-24`} />
                      <div className={`${UI.skeleton} h-4 w-16`} />
                    </div>
                  ))}
                </div>
              ) : payouts.length === 0 ? (
                <div className="p-8 text-center">
                  <Banknote className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="affiliate.withdraw.noHistory" defaultMessage="Aucun retrait effectué" />
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {payouts.slice(0, 5).map((payout) => (
                    <div key={payout.id} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getPayoutStatusIcon(payout.status)}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCents(payout.amount, intl.locale)}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPayoutStatusColor(payout.status)}`}>
                          {getPayoutStatusLabel(payout.status, intl.locale)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(payout.requestedAt).toLocaleDateString(intl.locale, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transfer Info Card */}
            <div className={`${UI.card} p-6`}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="affiliate.withdraw.howItWorks" defaultMessage="Comment ça marche ?" />
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    1
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    <FormattedMessage
                      id="affiliate.withdraw.step1"
                      defaultMessage="Cliquez sur 'Retirer' une fois le seuil minimum atteint"
                    />
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    2
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    <FormattedMessage
                      id="affiliate.withdraw.step2"
                      defaultMessage="Votre demande est traitée sous 2-5 jours ouvrés"
                    />
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    3
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    <FormattedMessage
                      id="affiliate.withdraw.step3"
                      defaultMessage="Les fonds sont transférés via Wise sur votre compte"
                    />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AffiliateWithdraw;
