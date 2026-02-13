/**
 * ChatterReferralEarnings Page
 *
 * Detailed referral earnings breakdown and commission history.
 */

import React from "react";
import ChatterDashboardLayout from "@/components/Chatter/Layout/ChatterDashboardLayout";
import { EarningsRatioCard } from "@/components/Chatter/Cards/EarningsRatioCard";
import { ReferralCommissionsTable } from "@/components/Chatter/Tables/ReferralCommissionsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Calendar,
  Users,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import { useChatterReferrals } from "@/hooks/useChatterReferrals";
import { useChatter } from "@/hooks/useChatter";
import { useTranslation } from "@/hooks/useTranslation";
import { Link } from "react-router-dom";

export default function ChatterReferralEarnings() {
  const { t, locale } = useTranslation();
  const { dashboardData: chatterData } = useChatter();
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

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ElementType> = {
      threshold_10: TrendingUp,
      threshold_50: TrendingUp,
      threshold_50_n2: Users,
      recurring_5pct: Calendar,
      tier_bonus: Trophy,
    };
    return icons[type] || DollarSign;
  };

  return (
    <ChatterDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                to={`/${locale}/chatter/filleuls`}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <DollarSign className="h-7 w-7" />
                {t("chatter.referrals.earningsTitle")}
              </h1>
            </div>
            <p className="text-gray-600">
              {t("chatter.referrals.earningsSubtitle")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDashboard}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            {t("common.refresh")}
          </Button>
        </div>

        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {isLoading && !dashboardData && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Content */}
        {dashboardData && (
          <>
            {/* Top stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm mb-1">
                      {t("chatter.referrals.totalReferralEarnings")}
                    </p>
                    <p className="text-3xl font-bold">
                      ${(referralEarnings / 100).toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm mb-1">
                      {t("chatter.referrals.thisMonth")}
                    </p>
                    <p className="text-3xl font-bold">
                      ${((stats?.monthlyReferralEarnings || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm mb-1">
                      {t("chatter.referrals.qualifiedReferrals")}
                    </p>
                    <p className="text-3xl font-bold">
                      {stats?.qualifiedFilleulsN1 || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Earnings ratio */}
            <EarningsRatioCard
              affiliationEarnings={affiliationEarnings}
              referralEarnings={referralEarnings}
              isLoading={isLoading}
            />

            {/* Commission breakdown by type */}
            <Card>
              <CardHeader>
                <CardTitle>{t("chatter.referrals.breakdownByType")}</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(commissionBreakdown).length === 0 ? (
                  <p className="text-center py-4">
                    {t("chatter.referrals.noCommissionsYet")}
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(commissionBreakdown).map(([type, data]) => {
                      const TypeIcon = getTypeIcon(type);
                      return (
                        <div
                          key={type}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <TypeIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {getTypeLabel(type)}
                            </p>
                            <p className="text-xs">
                              {data.count} commission{data.count > 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="ml-auto text-right">
                            <p className="font-bold text-green-600">
                              ${(data.amount / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Commission history */}
            <ReferralCommissionsTable
              commissions={recentCommissions}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
    </ChatterDashboardLayout>
  );
}
