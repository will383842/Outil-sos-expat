/**
 * ChatterRefer Page
 *
 * Viral kit page for sharing referral link.
 */

import React from "react";
import ChatterDashboardLayout from "@/components/Chatter/Layout/ChatterDashboardLayout";
import { ReferralLinkCard } from "@/components/Chatter/ViralKit/ReferralLinkCard";
import { ShareButtons } from "@/components/Chatter/ViralKit/ShareButtons";
import { ShareMessageSelector } from "@/components/Chatter/ViralKit/ShareMessageSelector";
import { QRCodeDisplay } from "@/components/Chatter/ViralKit/QRCodeDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

export default function ChatterRefer() {
  const { t } = useTranslation();
  const { stats } = useChatterReferrals();

  const commissionAmounts = [
    {
      label: t("chatter.referrals.when10"),
      amount: REFERRAL_CONFIG.COMMISSIONS.THRESHOLD_10_AMOUNT / 100,
      icon: TrendingUp,
    },
    {
      label: t("chatter.referrals.when50N1"),
      amount: REFERRAL_CONFIG.COMMISSIONS.THRESHOLD_50_N1_AMOUNT / 100,
      icon: DollarSign,
    },
    {
      label: t("chatter.referrals.when50N2"),
      amount: REFERRAL_CONFIG.COMMISSIONS.THRESHOLD_50_N2_AMOUNT / 100,
      icon: Users,
    },
    {
      label: t("chatter.referrals.perCallN1"),
      amount: REFERRAL_CONFIG.COMMISSIONS.N1_PER_CALL / 100,
      icon: TrendingUp,
    },
  ];

  const tierBonuses = Object.entries(REFERRAL_CONFIG.TIER_BONUSES).map(
    ([filleuls, bonus]) => ({
      filleuls: parseInt(filleuls),
      bonus: bonus / 100,
    })
  );

  return (
    <ChatterDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-7 w-7" />
            {t("chatter.referrals.referTitle")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("chatter.referrals.referSubtitle")}
          </p>
        </div>

        {/* Stats summary */}
        {stats && (
          <div className="grid sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{stats.totalFilleulsN1}</p>
                <p className="text-xs">
                  {t("chatter.referrals.filleulsN1")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold">{stats.qualifiedFilleulsN1}</p>
                <p className="text-xs">
                  {t("chatter.referrals.qualified")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">
                  ${(stats.totalReferralEarnings / 100).toFixed(0)}
                </p>
                <p className="text-xs">
                  {t("chatter.referrals.earned")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto text-orange-500 mb-2" />
                <p className="text-2xl font-bold">
                  ${(stats.monthlyReferralEarnings / 100).toFixed(0)}
                </p>
                <p className="text-xs">
                  {t("chatter.referrals.thisMonth")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Referral link */}
            <ReferralLinkCard />

            {/* Share buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  {t("chatter.referrals.shareDirectly")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ShareButtons variant="full" />
              </CardContent>
            </Card>

            {/* QR Code */}
            <QRCodeDisplay size={180} />
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Share messages */}
            <ShareMessageSelector />

            {/* Commission rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  {t("chatter.referrals.commissionRates")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {commissionAmounts.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <Badge variant="secondary" className="font-bold">
                      {typeof item.amount === "number"
                        ? `$${item.amount}`
                        : item.amount}
                    </Badge>
                  </div>
                ))}

              </CardContent>
            </Card>

            {/* Tier bonuses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-yellow-500" />
                  {t("chatter.referrals.tierBonuses")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-4 gap-2 sm:gap-3">
                  {tierBonuses.map((tier) => (
                    <div
                      key={tier.filleuls}
                      className="text-center p-3 sm:p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border"
                    >
                      <p className="text-xl sm:text-2xl font-bold">
                        {tier.filleuls}
                      </p>
                      <p className="text-xs">
                        {t("chatter.referrals.filleuls")}
                      </p>
                      <Badge className="mt-2 bg-yellow-500 text-xs sm:text-sm">
                        ${tier.bonus}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info footer */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="ml-2">
            {t("chatter.referrals.referInfo")}
          </AlertDescription>
        </Alert>
      </div>
    </ChatterDashboardLayout>
  );
}
