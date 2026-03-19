import React, { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Copy, Share2, CheckCircle, ArrowRight, ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { useAffiliate } from "../../hooks/useAffiliate";
import { copyToClipboard } from '@/utils/clipboard';
import { formatCents } from "../../types/affiliate";
import { useLocaleNavigate } from "../../multilingual-system/hooks/useLocaleNavigate";
import { getTranslatedRouteSlug, type RouteKey } from "../../multilingual-system/core/routing/localeRoutes";

const DashboardAffiliateCard: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { affiliateData, referrals, isLoading, error, shareUrl } = useAffiliate();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/[0.06] to-teal-500/[0.06] dark:from-emerald-500/[0.08] dark:to-teal-500/[0.08] backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-500/15 rounded-2xl p-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
          <div className="flex-1">
            <div className="h-4 w-40 bg-gray-200 dark:bg-white/10 rounded" />
          </div>
          <div className="h-8 w-20 bg-gray-200 dark:bg-white/10 rounded-lg" />
        </div>
      </div>
    );
  }

  const hasData = !!affiliateData && !error;

  const copyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    const langCode = (intl.locale?.substring(0, 2) || "fr") as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";
    const slug = getTranslatedRouteSlug("affiliate-dashboard" as RouteKey, langCode);
    navigate(`/${slug}`);
  };

  const totalEarned = affiliateData?.totalEarned || 0;
  const totalReferrals = referrals.length || affiliateData?.totalReferrals || 0;

  return (
    <div className="bg-gradient-to-r from-emerald-500/[0.06] to-teal-500/[0.06] dark:from-emerald-500/[0.08] dark:to-teal-500/[0.08] backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-500/15 rounded-2xl overflow-hidden transition-all duration-200">
      {/* Accent line */}
      <div className="h-[2px] bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />

      {/* Main row — always visible */}
      <div className="px-3 sm:px-4 py-2.5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
          <Link2 className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
            <FormattedMessage
              id="dashboard.affiliate.title"
              defaultMessage="Gagnez de l'argent en partageant !"
            />
          </p>
          {hasData && (totalReferrals > 0 || totalEarned > 0) && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              {totalReferrals > 0 && (
                <span>
                  {totalReferrals} <FormattedMessage id="affiliate.referrals" defaultMessage="Filleuls" />
                </span>
              )}
              {totalReferrals > 0 && totalEarned > 0 && <span className="mx-1.5 opacity-40">·</span>}
              {totalEarned > 0 && <span>{formatCents(totalEarned)}</span>}
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasData && shareUrl && (
            <>
              <button
                onClick={copyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  copied
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 active:scale-[0.97]"
                }`}
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? (
                  <FormattedMessage id="common.copied" defaultMessage="Copié !" />
                ) : (
                  <FormattedMessage id="common.copy" defaultMessage="Copier" />
                )}
              </button>
              {typeof navigator.share === "function" && (
                <button
                  onClick={handleShare}
                  className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-[0.97] transition-all"
                  title={intl.formatMessage({ id: "common.share", defaultMessage: "Partager" })}
                >
                  <Share2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-3 sm:px-4 pb-3 space-y-2.5 border-t border-emerald-200/30 dark:border-emerald-500/10 pt-2.5">
          {/* Share link */}
          {hasData && shareUrl && (
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 text-xs font-mono text-gray-600 dark:text-gray-300 truncate px-3 py-2 rounded-lg bg-white/60 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 select-all">
                {shareUrl}
              </code>
            </div>
          )}

          {/* Subtitle + CTA */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="dashboard.affiliate.subtitle"
                defaultMessage="Partagez votre lien et gagnez des commissions sur chaque appel effectué"
              />
            </p>
            <button
              onClick={goToAffiliateDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/15 hover:bg-emerald-500/20 active:scale-[0.97] transition-all whitespace-nowrap flex-shrink-0"
            >
              <FormattedMessage
                id="dashboard.affiliate.viewDetails"
                defaultMessage="Voir mon tableau de bord affiliation"
              />
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAffiliateCard;
