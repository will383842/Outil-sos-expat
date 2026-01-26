/**
 * AffiliateDashboard - Main affiliate dashboard page
 * Shows affiliate stats, referral link, recent commissions, and quick actions
 */

import React, { useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Users,
  Wallet,
  TrendingUp,
  Clock,
  Share2,
  Copy,
  ExternalLink,
  ChevronRight,
  PiggyBank,
  Gift,
  CheckCircle,
  AlertCircle,
  Banknote,
} from "lucide-react";
import { useLocaleNavigate } from "@/multilingual-system";
import { getTranslatedRouteSlug, type RouteKey } from "@/multilingual-system/core/routing/localeRoutes";
import { useApp } from "@/contexts/AppContext";
import { useAffiliate } from "@/hooks/useAffiliate";
import { formatCents, getCommissionStatusLabel, getStatusColor } from "@/types/affiliate";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  button: {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
} as const;

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  gradient: string;
  iconBg: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subValue,
  gradient,
  iconBg,
  loading,
}) => {
  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-5 min-h-[120px]`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`${UI.skeleton} h-4 w-20 mb-3`} />
            <div className={`${UI.skeleton} h-8 w-16 mb-2`} />
            <div className={`${UI.skeleton} h-3 w-24`} />
          </div>
          <div className={`${UI.skeleton} h-12 w-12 rounded-xl`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${UI.card} ${UI.cardHover} p-4 sm:p-5 min-h-[120px]`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {label}
          </p>
          <p className={`mt-1 text-2xl sm:text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {value}
          </p>
          {subValue && (
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
              {subValue}
            </p>
          )}
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const AffiliateDashboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const {
    affiliateData,
    commissions,
    referrals,
    isLoading,
    error,
    shareUrl,
    canWithdraw,
    minimumWithdrawal,
  } = useAffiliate();

  // Copy feedback state
  const [copied, setCopied] = useState(false);

  // Translated routes
  const routes = useMemo(() => ({
    earnings: `/${getTranslatedRouteSlug('affiliate-earnings' as RouteKey, langCode)}`,
    referrals: `/${getTranslatedRouteSlug('affiliate-referrals' as RouteKey, langCode)}`,
    withdraw: `/${getTranslatedRouteSlug('affiliate-withdraw' as RouteKey, langCode)}`,
    bankDetails: `/${getTranslatedRouteSlug('affiliate-bank-details' as RouteKey, langCode)}`,
  }), [langCode]);

  // Copy share link with feedback
  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Native share
  const shareNative = async () => {
    if (!shareUrl || !navigator.share) return;
    try {
      await navigator.share({
        title: intl.formatMessage({ id: "affiliate.share.title", defaultMessage: "Join SOS Expat" }),
        text: intl.formatMessage({ id: "affiliate.share.text", defaultMessage: "Get help from lawyers and expats worldwide" }),
        url: shareUrl,
      });
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  // Recent commissions (last 5)
  const recentCommissions = commissions.slice(0, 5);

  // Stats calculations
  const pendingCount = commissions.filter(c => c.status === "pending").length;
  const thisMonthCommissions = commissions.filter(c => {
    const date = new Date(c.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonthCommissions.reduce((sum, c) => sum + c.amount, 0);

  if (error) {
    return (
      <DashboardLayout activeKey="affiliate">
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <span>{error}</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeKey="affiliate">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="affiliate.dashboard.title" defaultMessage="Programme Affiliation" />
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              <FormattedMessage id="affiliate.dashboard.subtitle" defaultMessage="Gagnez des commissions en parrainant" />
            </p>
          </div>

          {canWithdraw && (
            <button
              onClick={() => navigate(routes.withdraw)}
              className={`${UI.button.primary} px-6 py-3 flex items-center gap-2`}
            >
              <Banknote className="w-5 h-5" />
              <FormattedMessage id="affiliate.withdraw.cta" defaultMessage="Retirer mes gains" />
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />}
            label={intl.formatMessage({ id: "affiliate.stats.available", defaultMessage: "Solde disponible" })}
            value={formatCents(affiliateData?.availableBalance || 0, intl.locale)}
            subValue={pendingCount > 0
              ? intl.formatMessage({ id: "affiliate.stats.pending", defaultMessage: "{count} en attente" }, { count: pendingCount })
              : undefined
            }
            gradient="from-emerald-600 to-teal-600"
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            loading={isLoading}
          />

          <StatCard
            icon={<PiggyBank className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />}
            label={intl.formatMessage({ id: "affiliate.stats.total", defaultMessage: "Total gagné" })}
            value={formatCents(affiliateData?.totalEarned || 0, intl.locale)}
            subValue={formatCents(thisMonthTotal, intl.locale) + " " + intl.formatMessage({ id: "affiliate.stats.thisMonth", defaultMessage: "ce mois" })}
            gradient="from-purple-600 to-pink-600"
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            loading={isLoading}
          />

          <StatCard
            icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />}
            label={intl.formatMessage({ id: "affiliate.stats.referrals", defaultMessage: "Filleuls" })}
            value={affiliateData?.totalReferrals || 0}
            subValue={intl.formatMessage({ id: "affiliate.stats.active", defaultMessage: "{count} actifs" }, { count: affiliateData?.activeReferrals || 0 })}
            gradient="from-blue-600 to-indigo-600"
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            loading={isLoading}
          />

          <StatCard
            icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 dark:text-amber-400" />}
            label={intl.formatMessage({ id: "affiliate.stats.commissions", defaultMessage: "Commissions" })}
            value={commissions.length}
            subValue={intl.formatMessage({ id: "affiliate.stats.lifetime", defaultMessage: "depuis le début" })}
            gradient="from-amber-500 to-orange-500"
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            loading={isLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Share Link & Recent Commissions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Share Link Card */}
            <div className={`${UI.card} p-6`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
                  <Gift className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    <FormattedMessage id="affiliate.share.heading" defaultMessage="Votre lien de parrainage" />
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="affiliate.share.description" defaultMessage="Partagez ce lien pour gagner des commissions" />
                  </p>
                </div>
              </div>

              {/* Affiliate Code */}
              {affiliateData?.affiliateCode && (
                <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <FormattedMessage id="affiliate.code.label" defaultMessage="Votre code" />
                  </p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {affiliateData.affiliateCode}
                  </p>
                </div>
              )}

              {/* Share Link Input */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {shareUrl || intl.formatMessage({ id: "affiliate.share.loading", defaultMessage: "Chargement..." })}
                  </span>
                </div>
                <button
                  onClick={copyShareLink}
                  disabled={!shareUrl}
                  className={`${UI.button.secondary} p-3 ${copied ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : ''}`}
                  title={intl.formatMessage({ id: copied ? "common.copied" : "common.copy", defaultMessage: copied ? "Copié!" : "Copier" })}
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
                {typeof navigator.share === "function" && (
                  <button
                    onClick={shareNative}
                    disabled={!shareUrl}
                    className={`${UI.button.primary} p-3`}
                    title={intl.formatMessage({ id: "common.share", defaultMessage: "Partager" })}
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Recent Commissions */}
            <div className={`${UI.card} overflow-hidden`}>
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <FormattedMessage id="affiliate.commissions.recent" defaultMessage="Commissions récentes" />
                </h3>
                <button
                  onClick={() => navigate(routes.earnings)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <FormattedMessage id="common.viewAll" defaultMessage="Voir tout" />
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`${UI.skeleton} w-10 h-10 rounded-full`} />
                        <div>
                          <div className={`${UI.skeleton} h-4 w-32 mb-1`} />
                          <div className={`${UI.skeleton} h-3 w-20`} />
                        </div>
                      </div>
                      <div className={`${UI.skeleton} h-5 w-16`} />
                    </div>
                  ))}
                </div>
              ) : recentCommissions.length === 0 ? (
                <div className="p-8 text-center">
                  <Gift className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="affiliate.commissions.empty" defaultMessage="Aucune commission pour l'instant" />
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    <FormattedMessage id="affiliate.commissions.emptyHint" defaultMessage="Partagez votre lien pour commencer à gagner" />
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {recentCommissions.map((commission) => (
                    <div key={commission.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          commission.status === "available"
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : commission.status === "pending"
                              ? "bg-amber-100 dark:bg-amber-900/30"
                              : "bg-gray-100 dark:bg-gray-800"
                        }`}>
                          {commission.status === "available" ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {intl.formatMessage({
                              id: `affiliate.actionType.${commission.actionType}`,
                              defaultMessage: commission.actionType
                            })}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(commission.createdAt).toLocaleDateString(intl.locale)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          +{formatCents(commission.amount, intl.locale)}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(commission.status)}`}>
                          {getCommissionStatusLabel(commission.status, intl.locale)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Quick Actions & Info */}
          <div className="space-y-6">
            {/* Tirelire (Piggy Bank) */}
            <div className={`${UI.card} p-6`}>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
                  <PiggyBank className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  <FormattedMessage id="affiliate.piggybank.title" defaultMessage="Ma Tirelire" />
                </h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  {formatCents(affiliateData?.availableBalance || 0, intl.locale)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <FormattedMessage
                    id="affiliate.piggybank.minimum"
                    defaultMessage="Retrait minimum : {amount}"
                    values={{ amount: formatCents(minimumWithdrawal, intl.locale) }}
                  />
                </p>

                {/* Progress to minimum */}
                {(affiliateData?.availableBalance || 0) < minimumWithdrawal && (
                  <div className="mb-4">
                    <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, ((affiliateData?.availableBalance || 0) / minimumWithdrawal) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <FormattedMessage
                        id="affiliate.piggybank.remaining"
                        defaultMessage="Encore {amount} avant retrait"
                        values={{ amount: formatCents(minimumWithdrawal - (affiliateData?.availableBalance || 0), intl.locale) }}
                      />
                    </p>
                  </div>
                )}

                <button
                  onClick={() => navigate(routes.withdraw)}
                  disabled={!canWithdraw}
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    canWithdraw
                      ? UI.button.primary
                      : "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {canWithdraw ? (
                    <FormattedMessage id="affiliate.withdraw.now" defaultMessage="Retirer maintenant" />
                  ) : !affiliateData?.hasBankDetails ? (
                    <FormattedMessage id="affiliate.withdraw.addBank" defaultMessage="Ajouter coordonnées bancaires" />
                  ) : (
                    <FormattedMessage id="affiliate.withdraw.belowMinimum" defaultMessage="Seuil non atteint" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`${UI.card} p-6`}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="affiliate.quickActions.title" defaultMessage="Actions rapides" />
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(routes.referrals)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      <FormattedMessage id="affiliate.nav.referrals" defaultMessage="Mes filleuls" />
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => navigate(routes.earnings)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      <FormattedMessage id="affiliate.nav.earnings" defaultMessage="Historique gains" />
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => navigate(routes.bankDetails)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Banknote className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      <FormattedMessage id="affiliate.nav.bankDetails" defaultMessage="Coordonnées bancaires" />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {affiliateData?.hasBankDetails ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </button>
              </div>
            </div>

            {/* Commission Rates Info */}
            <div className={`${UI.card} p-6`}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="affiliate.rates.title" defaultMessage="Vos taux de commission" />
              </h3>
              {affiliateData?.capturedRates ? (
                <div className="space-y-3">
                  {Object.entries(affiliateData.capturedRates.commissionRules || {}).map(([key, rule]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {intl.formatMessage({ id: `affiliate.actionType.${key}`, defaultMessage: key })}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {rule.type === "fixed"
                          ? formatCents(rule.fixedAmount || 0, intl.locale)
                          : `${rule.percentage}%`
                        }
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="affiliate.rates.loading" defaultMessage="Chargement des taux..." />
                </p>
              )}
              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                <FormattedMessage id="affiliate.rates.frozen" defaultMessage="Vos taux sont gelés à vie depuis votre inscription." />
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AffiliateDashboard;
