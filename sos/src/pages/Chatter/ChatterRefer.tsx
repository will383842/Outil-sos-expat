/**
 * ChatterRefer Page
 *
 * Viral kit page for sharing referral link.
 * Mobile-first glassmorphism design with Web Share API support.
 */

import React from "react";
import ChatterDashboardLayout from "@/components/Chatter/Layout/ChatterDashboardLayout";
import { ReferralLinkCard } from "@/components/Chatter/ViralKit/ReferralLinkCard";
import { ShareButtons } from "@/components/Chatter/ViralKit/ShareButtons";
import { ShareMessageSelector } from "@/components/Chatter/ViralKit/ShareMessageSelector";
import { QRCodeDisplay } from "@/components/Chatter/ViralKit/QRCodeDisplay";
import {
  Share2,
  Gift,
  Users,
  DollarSign,
  TrendingUp,
  Info,
} from "lucide-react";
import { useChatterReferrals } from "@/hooks/useChatterReferrals";
import { useTranslation } from "@/hooks/useTranslation";
import { REFERRAL_CONFIG } from "@/types/chatter";
import { useChatterData } from "@/contexts/ChatterDataContext";

export default function ChatterRefer() {
  const { t } = useTranslation();
  const { stats } = useChatterReferrals();
  const { dashboardData } = useChatterData();
  const config = dashboardData?.config;

  // Use backend config values, fallback to hardcoded REFERRAL_CONFIG defaults
  const n1CallAmount = config?.commissionN1CallAmount ?? REFERRAL_CONFIG.COMMISSIONS.N1_PER_CALL;
  const n2CallAmount = config?.commissionN2CallAmount ?? REFERRAL_CONFIG.COMMISSIONS.N2_PER_CALL;

  const commissionAmounts = [
    {
      label: t("chatter.referrals.when10"),
      amount: (config?.commissionN1CallAmount ?? REFERRAL_CONFIG.COMMISSIONS.THRESHOLD_10_AMOUNT) / 100,
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: t("chatter.referrals.when50N1"),
      amount: n1CallAmount / 100,
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: t("chatter.referrals.when50N2"),
      amount: n2CallAmount / 100,
      icon: Users,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
    },
    {
      label: t("chatter.referrals.perCallN1"),
      amount: n1CallAmount / 100,
      icon: TrendingUp,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-100 dark:bg-orange-900/30",
    },
  ];

  // Use backend recruitment milestones or fallback to hardcoded REFERRAL_CONFIG
  const tierBonuses = config?.recruitmentMilestones && config.recruitmentMilestones.length > 0
    ? config.recruitmentMilestones.map((m) => ({
        filleuls: m.count,
        bonus: m.bonus / 100,
      }))
    : Object.entries(REFERRAL_CONFIG.TIER_BONUSES).map(
        ([filleuls, bonus]) => ({
          filleuls: parseInt(filleuls),
          bonus: (bonus as number) / 100,
        })
      );

  return (
    <ChatterDashboardLayout activeKey="refer">
      <div className="space-y-4 sm:space-y-6">
        {/* Header — compact mobile-first */}
        <div>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
            <Share2 className="h-5 w-5 sm:h-7 sm:w-7 flex-shrink-0" />
            {t("chatter.referrals.referTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
            {t("chatter.referrals.referSubtitle")}
          </p>
        </div>

        {/* Stats summary — 2x2 on mobile, 4 cols on sm+ */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { icon: Users, value: stats.totalFilleulsN1, label: t("chatter.referrals.filleulsN1"), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30", gradient: "from-blue-600 to-blue-400" },
              { icon: Users, value: stats.qualifiedFilleulsN1, label: t("chatter.referrals.qualified"), color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", gradient: "from-red-600 to-red-400" },
              { icon: DollarSign, value: `$${(stats.totalReferralEarnings / 100).toFixed(0)}`, label: t("chatter.referrals.earned"), color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", gradient: "from-green-600 to-green-400" },
              { icon: TrendingUp, value: `$${(stats.monthlyReferralEarnings / 100).toFixed(0)}`, label: t("chatter.referrals.thisMonth"), color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", gradient: "from-orange-600 to-orange-400" },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-4 text-center opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-1.5 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${stat.color}`} />
                </div>
                <p className={`text-lg sm:text-2xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Main content — stacked on mobile, 2 cols on lg */}
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
          {/* Left column */}
          <div className="space-y-4">
            {/* Referral link */}
            <ReferralLinkCard />

            {/* Share buttons */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Share2 className="h-5 w-5 dark:text-white" />
                <span className="font-semibold dark:text-white">{t("chatter.referrals.shareDirectly")}</span>
              </div>
              <ShareButtons variant="full" />
            </div>

            {/* QR Code */}
            <QRCodeDisplay size={180} />
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Share messages */}
            <ShareMessageSelector />

            {/* Commission rates */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Gift className="h-5 w-5 dark:text-white" />
                <span className="font-semibold dark:text-white">{t("chatter.referrals.commissionRates")}</span>
              </div>
              <div className="space-y-2">
                {commissionAmounts.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 dark:bg-white/5 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-white/10"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1 rounded-lg ${item.bg} flex-shrink-0`}>
                        <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                      </div>
                      <span className="text-xs sm:text-sm dark:text-gray-300 truncate">{item.label}</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-green-600 dark:text-green-400 flex-shrink-0 ml-2">
                      ${item.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier bonuses */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <Gift className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold dark:text-white">{t("chatter.referrals.tierBonuses")}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                {tierBonuses.map((tier) => (
                  <div
                    key={tier.filleuls}
                    className="text-center p-2.5 sm:p-3 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200/50 dark:border-yellow-500/20"
                  >
                    <p className="text-lg sm:text-xl font-bold dark:text-white">
                      {tier.filleuls}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      {t("chatter.referrals.filleuls")}
                    </p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] sm:text-xs font-bold bg-yellow-400 dark:bg-yellow-500 text-yellow-900 rounded-full">
                      ${tier.bonus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Info footer */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {t("chatter.referrals.referInfo")}
            </p>
          </div>
        </div>
      </div>
    </ChatterDashboardLayout>
  );
}
