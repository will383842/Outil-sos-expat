/**
 * ReferralStatsCard
 *
 * Displays referral statistics in a grid:
 * - 2 columns on mobile, 4 on desktop
 * - Glassmorphism design
 */

import React from "react";
import { Users, UserCheck, DollarSign, TrendingUp } from "lucide-react";
import { ChatterReferralStats } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";

interface ReferralStatsCardProps {
  stats: ChatterReferralStats | null;
  isLoading?: boolean;
}

export function ReferralStatsCard({ stats, isLoading }: ReferralStatsCardProps) {
  const { t } = useTranslation();

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-4 animate-pulse"
          >
            <div className="h-3 w-16 bg-gray-200 dark:bg-white/10 rounded mb-2" />
            <div className="h-6 w-12 bg-gray-200 dark:bg-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: t("chatter.referrals.filleulsN1"),
      value: stats.totalFilleulsN1,
      subtext: `${stats.qualifiedFilleulsN1} ${t("chatter.referrals.qualified")}`,
      icon: Users,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-600 to-blue-400",
    },
    {
      label: t("chatter.referrals.filleulsN2"),
      value: stats.totalFilleulsN2,
      icon: Users,
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      gradient: "from-red-600 to-red-400",
    },
    {
      label: t("chatter.referrals.totalEarnings"),
      value: `$${(stats.totalReferralEarnings / 100).toFixed(2)}`,
      icon: DollarSign,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      gradient: "from-green-600 to-green-400",
    },
    {
      label: t("chatter.referrals.monthlyEarnings"),
      value: `$${(stats.monthlyReferralEarnings / 100).toFixed(2)}`,
      icon: TrendingUp,
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
      gradient: "from-orange-600 to-orange-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 opacity-0 animate-fade-in-up"
          style={{
            animationDelay: `${index * 80}ms`,
            animationFillMode: 'forwards',
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className={`p-1 sm:p-1.5 rounded-lg ${item.iconBg}`}>
              <item.icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${item.iconColor}`} />
            </div>
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
              {item.label}
            </span>
          </div>
          <p className={`text-lg sm:text-2xl font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent`}>
            {item.value}
          </p>
          {item.subtext && (
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {item.subtext}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
