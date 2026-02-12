import React, { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Copy, Share2, CheckCircle, Gift, ArrowRight, Users, DollarSign, Zap } from "lucide-react";
import { useAffiliate } from "../../hooks/useAffiliate";
import { formatCents } from "../../types/affiliate";
import { useLocaleNavigate } from "../../multilingual-system/hooks/useLocaleNavigate";
import { getTranslatedRouteSlug, type RouteKey } from "../../multilingual-system/core/routing/localeRoutes";

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const DashboardAffiliateCard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { affiliateData, referrals, isLoading, error, shareUrl } = useAffiliate();
  const [copied, setCopied] = useState(false);

  // Don't render on error or if no data after loading
  if (error) return null;

  // Skeleton loading state
  if (isLoading) {
    return (
      <div className={`${UI.card} p-4 sm:p-6 animate-pulse`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-white/10" />
          <div className="flex-1">
            <div className="h-5 w-48 bg-gray-200 dark:bg-white/10 rounded mb-2" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-white/10 rounded" />
          </div>
        </div>
        <div className="h-12 bg-gray-200 dark:bg-white/10 rounded-xl mb-3" />
        <div className="h-10 bg-gray-200 dark:bg-white/10 rounded-xl" />
      </div>
    );
  }

  if (!affiliateData) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "SOS-Expat",
        text: intl.formatMessage({ id: "dashboard.affiliate.subtitle" }),
        url: shareUrl,
      });
    } catch {
      // User cancelled
    }
  };

  const goToAffiliateDashboard = () => {
    const langCode = intl.locale?.substring(0, 2) || "fr";
    const slug = getTranslatedRouteSlug("affiliate-dashboard" as RouteKey, langCode);
    navigate(`/${slug}`);
  };

  const totalEarned = affiliateData.totalEarned || 0;
  const totalReferrals = referrals.length || affiliateData.totalReferrals || 0;

  return (
    <div className={`${UI.card} p-4 sm:p-6 overflow-hidden relative`}>
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
          <Gift className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">
            <FormattedMessage
              id="dashboard.affiliate.title"
              defaultMessage="Gagnez de l'argent en partageant !"
            />
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            <FormattedMessage
              id="dashboard.affiliate.subtitle"
              defaultMessage="Partagez votre lien et gagnez des commissions sur chaque inscription, appel et abonnement"
            />
          </p>
        </div>
      </div>

      {/* Mini stats */}
      {(totalReferrals > 0 || totalEarned > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="affiliate.referrals" defaultMessage="Filleuls" />
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalReferrals}</p>
          </div>
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <DollarSign className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="affiliate.earned" defaultMessage="Gagn\u00e9" />
              </span>
            </div>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{formatCents(totalEarned)}</p>
          </div>
        </div>
      )}

      {/* Link label */}
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
        <FormattedMessage
          id="dashboard.affiliate.yourLink"
          defaultMessage="Votre lien de parrainage"
        />
      </p>

      {/* Link + Copy/Share */}
      <div className="flex items-center px-4 py-3 min-h-[48px] bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1 select-all">
          {shareUrl}
        </span>
      </div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={copyLink}
          className={`flex-1 min-h-[48px] rounded-xl font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
            copied
              ? "bg-green-500 text-white"
              : "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200"
          }`}
        >
          {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          <span>
            {copied ? (
              <FormattedMessage id="common.copied" defaultMessage="Copi\u00e9 !" />
            ) : (
              <FormattedMessage id="common.copy" defaultMessage="Copier" />
            )}
          </span>
        </button>
        {typeof navigator.share === "function" && (
          <button
            onClick={handleShare}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center active:scale-[0.98] transition-all"
            title={intl.formatMessage({ id: "common.share", defaultMessage: "Partager" })}
          >
            <Share2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* How it works - 3 steps */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/15 dark:to-teal-900/15 rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          <FormattedMessage
            id="dashboard.affiliate.howItWorks"
            defaultMessage="Comment \u00e7a marche ?"
          />
        </p>
        <div className="space-y-2.5">
          {[
            { icon: Share2, msgId: "dashboard.affiliate.step1", defaultMsg: "Partagez votre lien avec vos proches" },
            { icon: Users, msgId: "dashboard.affiliate.step2", defaultMsg: "Ils s'inscrivent via votre lien" },
            { icon: Zap, msgId: "dashboard.affiliate.step3", defaultMsg: "Vous gagnez des commissions automatiquement" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-white dark:bg-white/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                <step.icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <FormattedMessage id={step.msgId} defaultMessage={step.defaultMsg} />
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA to full affiliate dashboard */}
      <button
        onClick={goToAffiliateDashboard}
        className="w-full min-h-[48px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-emerald-500/20"
      >
        <FormattedMessage
          id="dashboard.affiliate.viewDetails"
          defaultMessage="Voir mon tableau de bord affiliation"
        />
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default DashboardAffiliateCard;
