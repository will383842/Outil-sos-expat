/**
 * MilestoneProgressCard
 *
 * Displays tier bonus progression with glassmorphism design.
 * Mobile-first: compact tiers grid, responsive layout.
 */

import React from "react";
import { Progress } from "@/components/ui/progress";
import { Target, Trophy, Star, Check } from "lucide-react";
import { ChatterTierProgress, REFERRAL_CONFIG } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";
import { UI } from '@/components/Chatter/designTokens';

interface MilestoneProgressCardProps {
  tierProgress: ChatterTierProgress | null;
  qualifiedCount: number;
  paidTiers: number[];
  isLoading?: boolean;
}

const TIER_INFO = [
  { tier: 5, bonus: 1500, labelKey: "chatter.referrals.tier.bronze" },
  { tier: 10, bonus: 3500, labelKey: "chatter.referrals.tier.silver" },
  { tier: 20, bonus: 7500, labelKey: "chatter.referrals.tier.gold" },
  { tier: 50, bonus: 25000, labelKey: "chatter.referrals.tier.platinum" },
  { tier: 100, bonus: 60000, labelKey: "chatter.referrals.tier.diamond" },
  { tier: 500, bonus: 400000, labelKey: "chatter.referrals.tier.legend" },
];

export function MilestoneProgressCard({
  tierProgress,
  qualifiedCount,
  paidTiers = [],
  isLoading,
}: MilestoneProgressCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className={`${UI.card} p-3 sm:p-5`}>
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="font-semibold dark:text-white">{t("chatter.referrals.tierProgress")}</span>
        </div>
        <div className="space-y-3">
          <div className="h-8 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
          <div className="h-20 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Calculate progress percentage to next tier
  const currentTier = paidTiers.length > 0 ? Math.max(...paidTiers) : 0;
  const nextTierInfo = TIER_INFO.find(
    (t) => !paidTiers.includes(t.tier) && qualifiedCount < t.tier
  );
  const progressPercent = nextTierInfo
    ? Math.min(100, Math.round((qualifiedCount / nextTierInfo.tier) * 100))
    : 100;

  return (
    <div className={`${UI.card} p-3 sm:p-5`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <span className="font-semibold dark:text-white">{t("chatter.referrals.tierProgress")}</span>
      </div>

      {/* Current progress */}
      {nextTierInfo ? (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-baseline text-sm">
            <span className="dark:text-gray-300">
              <span className="font-bold text-base dark:text-white">{qualifiedCount}</span>
              <span className="text-gray-400"> / {nextTierInfo.tier}</span>{" "}
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                {t("chatter.referrals.qualifiedFilleuls")}
              </span>
            </span>
            <span className="font-bold text-green-600 dark:text-green-400">
              ${(nextTierInfo.bonus / 100).toFixed(0)}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2.5 sm:h-3" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("chatter.referrals.filleulsNeeded", {
              count: nextTierInfo.tier - qualifiedCount,
            })}
          </p>
        </div>
      ) : (
        <div className="text-center py-3 sm:py-4 mb-4">
          <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-500 mx-auto mb-2" />
          <p className="font-bold text-base sm:text-lg dark:text-white">
            {t("chatter.referrals.allTiersAchieved")}
          </p>
        </div>
      )}

      {/* Tier milestones — 3 cols mobile, 6 cols desktop */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {TIER_INFO.map((tier) => {
          const isAchieved = paidTiers.includes(tier.tier);
          const isCurrent = !isAchieved && nextTierInfo?.tier === tier.tier;

          return (
            <div
              key={tier.tier}
              className={`relative flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                isAchieved
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-400"
                  : isCurrent
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                  : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 opacity-50"
              }`}
            >
              {isAchieved && (
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                </div>
              )}

              <Star
                className={`h-4 w-4 sm:h-5 sm:w-5 mb-0.5 ${
                  isAchieved
                    ? "text-green-600 dark:text-green-400"
                    : isCurrent
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              />
              <span className="text-xs font-bold dark:text-white">{tier.tier}</span>
              <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-full">
                {t(tier.labelKey)}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-medium mt-0.5 px-1.5 py-0.5 rounded-full ${
                  isAchieved
                    ? "bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-200"
                    : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                }`}
              >
                ${(tier.bonus / 100).toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-[10px] sm:text-xs mt-3 text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-green-500" />
          <span>{t("chatter.referrals.achieved")}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-blue-500" />
          <span>{t("chatter.referrals.current")}</span>
        </div>
      </div>
    </div>
  );
}
