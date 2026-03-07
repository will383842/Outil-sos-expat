/**
 * ChatterReferrals Page
 *
 * Main referral dashboard showing filleuls N1/N2, progress, and stats.
 * Mobile-first: cards on mobile, table on desktop.
 */

import React from "react";
import ChatterDashboardLayout from "@/components/Chatter/Layout/ChatterDashboardLayout";
import { ReferralStatsCard } from "@/components/Chatter/Cards/ReferralStatsCard";
import { MilestoneProgressCard } from "@/components/Chatter/Cards/MilestoneProgressCard";
import { PromoAlertCard } from "@/components/Chatter/Cards/PromoAlertCard";
import { ReferralN1Table } from "@/components/Chatter/Tables/ReferralN1Table";
import { ReferralN2List } from "@/components/Chatter/Tables/ReferralN2List";
import { ReferralLinkCard } from "@/components/Chatter/ViralKit/ReferralLinkCard";
import { Users, RefreshCw, Share2, Info } from "lucide-react";
import { useChatterReferrals } from "@/hooks/useChatterReferrals";
import { useChatter } from "@/hooks/useChatter";
import { useTranslation } from "@/hooks/useTranslation";
import { Link } from "react-router-dom";

export default function ChatterReferrals() {
  const { t, locale } = useTranslation();
  const { dashboardData: chatterData } = useChatter();
  const {
    dashboardData,
    stats,
    filleulsN1,
    filleulsN2,
    tierProgress,
    activePromotion,
    isLoading,
    error,
    refreshDashboard,
  } = useChatterReferrals();

  const chatter = chatterData?.chatter;
  const paidTiers = chatter?.tierBonusesPaid || [];
  const qualifiedCount = chatter?.qualifiedReferralsCount || 0;

  return (
    <ChatterDashboardLayout activeKey="referrals">
      <div className="space-y-4 sm:space-y-6">
        {/* Header — compact, mobile-first */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
              <Users className="h-5 w-5 sm:h-7 sm:w-7 flex-shrink-0" />
              <span className="truncate">{t("chatter.referrals.title")}</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1 truncate">
              {t("chatter.referrals.subtitle")}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={refreshDashboard}
              disabled={isLoading}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-all touch-manipulation"
              aria-label={t("common.refresh")}
            >
              <RefreshCw
                className={`h-4 w-4 dark:text-gray-300 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
            <Link to={`/${locale}/chatter/parrainer`}>
              <button className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 transition-all active:scale-[0.98] touch-manipulation flex items-center gap-1.5">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">{t("chatter.referrals.refer")}</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading state — skeleton */}
        {isLoading && !dashboardData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 sm:h-24 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl animate-pulse" />
              ))}
            </div>
            <div className="h-32 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl animate-pulse" />
          </div>
        )}

        {/* Content */}
        {dashboardData && (
          <>
            {/* Active promotion alert */}
            {activePromotion && (
              <PromoAlertCard promotion={activePromotion} />
            )}

            {/* Stats grid — 2 cols on mobile, 4 on desktop */}
            <ReferralStatsCard stats={stats} isLoading={isLoading} />

            {/* Milestone progress */}
            <MilestoneProgressCard
              tierProgress={tierProgress}
              qualifiedCount={qualifiedCount}
              paidTiers={paidTiers}
              isLoading={isLoading}
            />

            {/* Referral link (compact) */}
            <ReferralLinkCard variant="compact" />

            {/* How it works — collapsible on mobile */}
            <details className="group bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg">
              <summary className="flex items-center gap-2 p-3 sm:p-4 cursor-pointer list-none touch-manipulation">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm font-medium dark:text-white">{t("chatter.referrals.howItWorks")}</span>
                <svg className="ml-auto h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                <ul className="list-disc ml-6 text-xs sm:text-sm space-y-1.5 text-gray-600 dark:text-gray-400">
                  <li>{t("chatter.referrals.howItWorks1")}</li>
                  <li>{t("chatter.referrals.howItWorks2")}</li>
                  <li>{t("chatter.referrals.howItWorks3")}</li>
                  <li>{t("chatter.referrals.howItWorks4")}</li>
                </ul>
              </div>
            </details>

            {/* Filleuls tables — stacked on mobile */}
            <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
              <div className="lg:col-span-2">
                <ReferralN1Table
                  filleuls={filleulsN1}
                  isLoading={isLoading}
                />
              </div>
              <div>
                <ReferralN2List filleuls={filleulsN2} isLoading={isLoading} />
              </div>
            </div>
          </>
        )}
      </div>
    </ChatterDashboardLayout>
  );
}
