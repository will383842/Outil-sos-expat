/**
 * EarningsRatioCard
 *
 * Shows transparent breakdown of earnings with glassmorphism design.
 */

import React from "react";
import { Progress } from "@/components/ui/progress";
import { PieChart, Users, DollarSign } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface EarningsRatioCardProps {
  affiliationEarnings: number; // in cents
  referralEarnings: number; // in cents
  isLoading?: boolean;
}

export function EarningsRatioCard({
  affiliationEarnings,
  referralEarnings,
  isLoading,
}: EarningsRatioCardProps) {
  const { t } = useTranslation();

  const totalEarnings = affiliationEarnings + referralEarnings;
  const affiliationPercent =
    totalEarnings > 0 ? Math.round((affiliationEarnings / totalEarnings) * 100) : 0;
  const referralPercent =
    totalEarnings > 0 ? Math.round((referralEarnings / totalEarnings) * 100) : 0;

  if (isLoading) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="h-5 w-5 dark:text-white" />
          <span className="font-semibold dark:text-white">{t("chatter.referrals.earningsRatio")}</span>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
          <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-3/4 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <PieChart className="h-5 w-5 dark:text-white" />
        <span className="font-semibold dark:text-white">{t("chatter.referrals.earningsRatio")}</span>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* Affiliation earnings */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs sm:text-sm font-medium dark:text-white">
                {t("chatter.referrals.affiliationEarnings")}
              </span>
            </div>
            <span className="text-xs sm:text-sm dark:text-gray-300">
              ${(affiliationEarnings / 100).toFixed(2)} ({affiliationPercent}%)
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 ml-5">
            {t("chatter.referrals.affiliationEarningsDesc")}
          </p>
          <Progress value={affiliationPercent} className="h-1.5 sm:h-2 bg-gray-100 dark:bg-white/10" />
        </div>

        {/* Referral earnings */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <span className="text-xs sm:text-sm font-medium dark:text-white">
                {t("chatter.referrals.referralEarnings")}
              </span>
            </div>
            <span className="text-xs sm:text-sm dark:text-gray-300">
              ${(referralEarnings / 100).toFixed(2)} ({referralPercent}%)
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 ml-5">
            {t("chatter.referrals.referralEarningsDesc")}
          </p>
          <Progress
            value={referralPercent}
            className="h-1.5 sm:h-2 bg-gray-100 dark:bg-white/10 [&>div]:bg-red-600"
          />
        </div>

        {/* Total */}
        <div className="pt-2 sm:pt-3 border-t border-gray-200 dark:border-white/10">
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm dark:text-white">{t("common.total")}</span>
            <span className="font-bold text-base sm:text-lg bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
              ${(totalEarnings / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Info */}
        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          {t("chatter.referrals.ratioExplanation")}
        </p>
      </div>
    </div>
  );
}
