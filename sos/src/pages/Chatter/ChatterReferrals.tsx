/**
 * ChatterReferrals Page
 *
 * Main referral dashboard showing filleuls N1/N2, progress, and stats.
 */

import React from "react";
import ChatterDashboardLayout from "@/components/Chatter/Layout/ChatterDashboardLayout";
import { ReferralStatsCard } from "@/components/Chatter/Cards/ReferralStatsCard";
import { MilestoneProgressCard } from "@/components/Chatter/Cards/MilestoneProgressCard";
import { PromoAlertCard } from "@/components/Chatter/Cards/PromoAlertCard";
import { ReferralN1Table } from "@/components/Chatter/Tables/ReferralN1Table";
import { ReferralN2List } from "@/components/Chatter/Tables/ReferralN2List";
import { ReferralLinkCard } from "@/components/Chatter/ViralKit/ReferralLinkCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Users, RefreshCw, Share2, Info } from "lucide-react";
import { useChatterReferrals } from "@/hooks/useChatterReferrals";
import { useChatter } from "@/hooks/useChatter";
import { useTranslation } from "@/hooks/useTranslation";
import { Link } from "react-router-dom";

export default function ChatterReferrals() {
  const { t, locale } = useTranslation();
  const { dashboardData: chatterData } = useChatter();
  const {
    dashboardData,
    stats,
    filleulsN1,
    filleulsN2,
    tierProgress,
    activePromotion,
    isLoading,
    error,
    refreshDashboard,
  } = useChatterReferrals();

  const chatter = chatterData?.chatter;
  const paidTiers = chatter?.tierBonusesPaid || [];
  const qualifiedCount = chatter?.qualifiedReferralsCount || 0;

  return (
    <ChatterDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7" />
              {t("chatter.referrals.title")}
            </h1>
            <p className="text-gray-600 mt-1">
              {t("chatter.referrals.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
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
            <Link to={`/${locale}/chatter/parrainer`}>
              <Button size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
                {t("chatter.referrals.refer")}
              </Button>
            </Link>
          </div>
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
            {/* Active promotion alert */}
            {activePromotion && (
              <PromoAlertCard promotion={activePromotion} />
            )}

            {/* Stats and milestones */}
            <div className="grid lg:grid-cols-2 gap-6">
              <ReferralStatsCard stats={stats} isLoading={isLoading} />
              <MilestoneProgressCard
                tierProgress={tierProgress}
                qualifiedCount={qualifiedCount}
                paidTiers={paidTiers}
                isLoading={isLoading}
              />
            </div>

            {/* Referral link (compact) */}
            <ReferralLinkCard variant="compact" />

            {/* How it works info */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <strong>{t("chatter.referrals.howItWorks")}</strong>
                <ul className="list-disc mt-2 text-sm space-y-1">
                  <li>
                    {t("chatter.referrals.howItWorks1")}
                  </li>
                  <li>
                    {t("chatter.referrals.howItWorks2")}
                  </li>
                  <li>
                    {t("chatter.referrals.howItWorks3")}
                  </li>
                  <li>
                    {t("chatter.referrals.howItWorks4")}
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Filleuls tables */}
            <div className="grid xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <ReferralN1Table
                  filleuls={filleulsN1}
                  isLoading={isLoading}
                />
              </div>
              <div>
                <ReferralN2List filleuls={filleulsN2} isLoading={isLoading} />
              </div>
            </div>
          </>
        )}
      </div>
    </ChatterDashboardLayout>
  );
}
