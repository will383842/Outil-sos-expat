/**
 * EarningsRatioCard
 *
 * Shows transparent breakdown of earnings:
 * - Affiliation (client referrals + recruitment)
 * - Referral (parrainage system)
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            {t("chatter.referrals.earningsRatio")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          {t("chatter.referrals.earningsRatio")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Affiliation earnings */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">
                {t("chatter.referrals.affiliationEarnings")}
              </span>
            </div>
            <span className="text-sm text-gray-600">
              ${(affiliationEarnings / 100).toFixed(2)} ({affiliationPercent}%)
            </span>
          </div>
          <Progress value={affiliationPercent} className="h-2 bg-gray-100" />
        </div>

        {/* Referral earnings */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">
                {t("chatter.referrals.referralEarnings")}
              </span>
            </div>
            <span className="text-sm text-gray-600">
              ${(referralEarnings / 100).toFixed(2)} ({referralPercent}%)
            </span>
          </div>
          <Progress
            value={referralPercent}
            className="h-2 bg-gray-100 [&>div]:bg-purple-600"
          />
        </div>

        {/* Total */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium">{t("common.total")}</span>
            <span className="font-bold text-lg">
              ${(totalEarnings / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-500 mt-2">
          {t("chatter.referrals.ratioExplanation")}
        </p>
      </CardContent>
    </Card>
  );
}
