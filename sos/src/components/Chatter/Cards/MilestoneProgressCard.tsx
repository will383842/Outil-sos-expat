/**
 * MilestoneProgressCard
 *
 * Displays tier bonus progression:
 * - Current tier achieved
 * - Progress to next tier
 * - Bonus amounts
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Trophy, Star, Check } from "lucide-react";
import { ChatterTierProgress, REFERRAL_CONFIG } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";

interface MilestoneProgressCardProps {
  tierProgress: ChatterTierProgress | null;
  qualifiedCount: number;
  paidTiers: number[];
  isLoading?: boolean;
}

const TIER_INFO = [
  { tier: 5, bonus: 1500, label: "Bronze" },       // $15
  { tier: 10, bonus: 3500, label: "Silver" },      // $35
  { tier: 20, bonus: 7500, label: "Gold" },        // $75
  { tier: 50, bonus: 25000, label: "Platinum" },   // $250
  { tier: 100, bonus: 60000, label: "Diamond" },   // $600
  { tier: 500, bonus: 400000, label: "Legend" },    // $4,000
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {t("chatter.referrals.tierProgress")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {t("chatter.referrals.tierProgress")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current progress */}
        {nextTierInfo ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                {qualifiedCount} / {nextTierInfo.tier}{" "}
                {t("chatter.referrals.qualifiedFilleuls")}
              </span>
              <span className="font-bold text-green-600">
                ${(nextTierInfo.bonus / 100).toFixed(0)}
              </span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <p className="text-sm text-gray-600">
              {t("chatter.referrals.filleulsNeeded", {
                count: nextTierInfo.tier - qualifiedCount,
              })}
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <p className="font-bold text-lg">
              {t("chatter.referrals.allTiersAchieved")}
            </p>
          </div>
        )}

        {/* Tier milestones */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
          {TIER_INFO.map((tier) => {
            const isAchieved = paidTiers.includes(tier.tier);
            const isCurrent =
              !isAchieved && nextTierInfo?.tier === tier.tier;

            return (
              <div
                key={tier.tier}
                className={`relative flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                  isAchieved
                    ? "border-green-500 bg-green-50"
                    : isCurrent
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-gray-50 opacity-50"
                }`}
              >
                {isAchieved && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}

                <Star
                  className={`h-5 w-5 mb-1 ${
                    isAchieved
                      ? "text-green-600"
                      : isCurrent
                      ? "text-blue-600"
                      : "text-gray-400"
                  }`}
                />
                <span className="text-xs font-bold">{tier.tier}</span>
                <span className="text-[10px] text-gray-600">{tier.label}</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] mt-1 ${
                    isAchieved ? "bg-green-200" : ""
                  }`}
                >
                  ${(tier.bonus / 100).toFixed(0)}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 text-xs text-gray-500 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>{t("chatter.referrals.achieved")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>{t("chatter.referrals.current")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
