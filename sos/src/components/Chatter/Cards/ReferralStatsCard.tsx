/**
 * ReferralStatsCard
 *
 * Displays referral statistics summary:
 * - Filleuls N1/N2 counts
 * - Qualified filleuls
 * - Referral earnings
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, DollarSign, TrendingUp } from "lucide-react";
import { ChatterReferralStats } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";

interface ReferralStatsCardProps {
  stats: ChatterReferralStats | null;
  isLoading?: boolean;
}

export function ReferralStatsCard({ stats, isLoading }: ReferralStatsCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("chatter.referrals.stats")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    {
      label: t("chatter.referrals.filleulsN1"),
      value: stats.totalFilleulsN1,
      subtext: `${stats.qualifiedFilleulsN1} ${t("chatter.referrals.qualified")}`,
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: t("chatter.referrals.filleulsN2"),
      value: stats.totalFilleulsN2,
      icon: Users,
      color: "text-red-600",
    },
    {
      label: t("chatter.referrals.totalEarnings"),
      value: `$${(stats.totalReferralEarnings / 100).toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: t("chatter.referrals.monthlyEarnings"),
      value: `$${(stats.monthlyReferralEarnings / 100).toFixed(2)}`,
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t("chatter.referrals.stats")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {statItems.map((item, index) => (
            <div
              key={index}
              className="flex flex-col p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-1">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-sm text-gray-600">{item.label}</span>
              </div>
              <span className="text-2xl font-bold">{item.value}</span>
              {item.subtext && (
                <span className="text-xs text-gray-500">{item.subtext}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
