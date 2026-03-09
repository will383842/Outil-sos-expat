/**
 * ChatterReferralEarnings Page
 *
 * Detailed referral earnings breakdown and commission history.
 * Mobile-first glassmorphism design.
 */

import React from "react";
import ChatterDashboardLayout from "@/components/Chatter/Layout/ChatterDashboardLayout";
import { EarningsRatioCard } from "@/components/Chatter/Cards/EarningsRatioCard";
import { ReferralCommissionsTable } from "@/components/Chatter/Tables/ReferralCommissionsTable";
import {
  DollarSign,
  RefreshCw,
  TrendingUp,
  Calendar,
  Users,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import { useChatterReferrals } from "@/hooks/useChatterReferrals";
import { useChatterData } from "@/contexts/ChatterDataContext";
import { useTranslation } from "@/hooks/useTranslation";
import { Link } from "react-router-dom";

export default function ChatterReferralEarnings() {
  return (
    <ChatterDashboardLayout activeKey="referral-earnings">
      <ChatterReferralEarningsContent />
    </ChatterDashboardLayout>
  );
}

function ChatterReferralEarningsContent() {
  const { t, locale } = useTranslation();
  const { dashboardData: chatterData } = useChatterData();
  const {
    dashboardData,
    stats,
    recentCommissions,
    isLoading,
    error,
    refreshDashboard,
  } = useChatterReferrals();

  const chatter = chatterData?.chatter;
  const affiliationEarnings = chatter
    ? chatter.totalEarned - (chatter.referralEarnings || 0)
    : 0;
  const referralEarnings = chatter?.referralEarnings || 0;

  // Commission breakdown by type
  const commissionBreakdown = recentCommissions.reduce(
    (acc, commission) => {
      const type = commission.type;
      if (!acc[type]) {
        acc[type] = { count: 0, amount: 0 };
      }
      acc[type].count++;
      acc[type].amount += commission.amount;
      return acc;
    },
    {} as Record<string, { count: number; amount: number }>
  );

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      threshold_10: t("chatter.referrals.type_threshold_10"),
      threshold_50: t("chatter.referrals.type_threshold_50"),
      threshold_50_n2: t("chatter.referrals.type_threshold_50_n2"),
      recurring_5pct: t("chatter.referrals.type_recurring"),
      tier_bonus: t("chatter.referrals.type_tier_bonus"),
    };
    return labels[type] || type;
  };

  const getTypeStyle = (type: string) => {
    const styles: Record<string, { iconBg: string; iconColor: string; icon: React.ElementType }> = {
      threshold_10: { iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400", icon: TrendingUp },
      threshold_50: { iconBg: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400", icon: TrendingUp },
      threshold_50_n2: { iconBg: "bg-indigo-100 dark:bg-indigo-900/30", iconColor: "text-indigo-600 dark:text-indigo-400", icon: Users },
      recurring_5pct: { iconBg: "bg-orange-100 dark:bg-orange-900/30", iconColor: "text-orange-600 dark:text-orange-400", icon: Calendar },
      tier_bonus: { iconBg: "bg-yellow-100 dark:bg-yellow-900/30", iconColor: "text-yellow-600 dark:text-yellow-400", icon: Trophy },
    };
    return styles[type] || { iconBg: "bg-gray-100 dark:bg-white/10", iconColor: "text-gray-600 dark:text-gray-400", icon: DollarSign };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
        {/* Header — compact, mobile-first */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to={`/${locale}/chatter/filleuls`}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors touch-manipulation flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5 dark:text-gray-300" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span className="truncate">{t("chatter.referrals.earningsTitle")}</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {t("chatter.referrals.earningsSubtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={() => refreshDashboard()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition-all touch-manipulation flex-shrink-0"
            aria-label={t("common.refresh")}
          >
            <RefreshCw className={`h-4 w-4 dark:text-gray-300 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && !dashboardData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 sm:h-24 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl animate-pulse" />
              ))}
            </div>
            <div className="h-32 bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl animate-pulse" />
          </div>
        )}

        {/* Content */}
        {dashboardData && (
          <>
            {/* Top stats — 3 cols */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {[
                {
                  label: t("chatter.referrals.totalReferralEarnings"),
                  value: `$${(referralEarnings / 100).toFixed(2)}`,
                  gradient: "from-green-600 to-green-400",
                },
                {
                  label: t("chatter.referrals.thisMonth"),
                  value: `$${((stats?.monthlyReferralEarnings || 0) / 100).toFixed(2)}`,
                  gradient: "from-blue-600 to-blue-400",
                },
                {
                  label: t("chatter.referrals.qualifiedReferrals"),
                  value: `${stats?.qualifiedFilleulsN1 || 0}`,
                  gradient: "from-indigo-600 to-violet-400",
                },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-4 text-center opacity-0 animate-fade-in-up"
                  style={{
                    animationDelay: `${index * 80}ms`,
                    animationFillMode: 'forwards',
                  }}
                >
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
                    {stat.label}
                  </p>
                  <p className={`text-lg sm:text-2xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Earnings ratio */}
            <EarningsRatioCard
              affiliationEarnings={affiliationEarnings}
              referralEarnings={referralEarnings}
              isLoading={isLoading}
            />

            {/* Commission breakdown by type */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
              <h3 className="font-semibold dark:text-white mb-3 sm:mb-4">
                {t("chatter.referrals.breakdownByType")}
              </h3>

              {Object.keys(commissionBreakdown).length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("chatter.referrals.noCommissionsYet")}
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                  {Object.entries(commissionBreakdown).map(([type, data], index) => {
                    const style = getTypeStyle(type);
                    const TypeIcon = style.icon;
                    return (
                      <div
                        key={type}
                        className="flex items-center gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-white/5 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-white/10 opacity-0 animate-fade-in-up"
                        style={{
                          animationDelay: `${index * 60}ms`,
                          animationFillMode: 'forwards',
                        }}
                      >
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
                          <TypeIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${style.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium dark:text-white truncate">
                            {getTypeLabel(type)}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                            {t("chatter.referrals.commissionCount", { count: data.count })}
                          </p>
                        </div>
                        <span className="font-bold text-sm sm:text-base text-green-600 dark:text-green-400 flex-shrink-0">
                          +${(data.amount / 100).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Commission history */}
            <ReferralCommissionsTable
              commissions={recentCommissions}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
  );
}
