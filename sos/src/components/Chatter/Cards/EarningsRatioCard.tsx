/**
 * EarningsRatioCard
 *
 * Shows transparent breakdown of earnings with doré/money design.
 * Uses FormattedMessage for i18n, React.memo for performance.
 */

import React, { memo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Progress } from "@/components/ui/progress";
import { PieChart, Users, DollarSign } from "lucide-react";
import { UI, MONEY } from '@/components/Chatter/designTokens';

interface EarningsRatioCardProps {
  affiliationEarnings: number; // in cents
  referralEarnings: number; // in cents
  isLoading?: boolean;
}

const EarningsRatioCard = memo(function EarningsRatioCard({
  affiliationEarnings,
  referralEarnings,
  isLoading,
}: EarningsRatioCardProps) {
  const intl = useIntl();

  const totalEarnings = affiliationEarnings + referralEarnings;
  const affiliationPercent =
    totalEarnings > 0 ? Math.round((affiliationEarnings / totalEarnings) * 100) : 0;
  const referralPercent =
    totalEarnings > 0 ? Math.round((referralEarnings / totalEarnings) * 100) : 0;

  if (isLoading) {
    return (
      <div className={`${UI.card} p-3 sm:p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="h-5 w-5 dark:text-white" />
          <span className="font-semibold dark:text-white">
            <FormattedMessage id="chatter.referrals.earningsRatio" defaultMessage="Earnings Ratio" />
          </span>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
          <div className="h-4 bg-gray-100 dark:bg-white/5 rounded w-3/4 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${UI.card} bg-gradient-to-br from-amber-500/10 to-yellow-500/5 dark:from-amber-500/10 dark:to-yellow-500/5 p-3 sm:p-5`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-sm shadow-amber-500/20">
          <PieChart className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold dark:text-white">
          <FormattedMessage id="chatter.referrals.earningsRatio" defaultMessage="Earnings Ratio" />
        </span>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* Affiliation earnings */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs sm:text-sm font-medium dark:text-white">
                <FormattedMessage id="chatter.referrals.affiliationEarnings" defaultMessage="Affiliation Earnings" />
              </span>
            </div>
            <span className="text-xs sm:text-sm dark:text-gray-300">
              ${(affiliationEarnings / 100).toFixed(2)} ({affiliationPercent}%)
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 ml-5">
            <FormattedMessage id="chatter.referrals.affiliationEarningsDesc" defaultMessage="Commissions from your client referrals" />
          </p>
          <Progress value={affiliationPercent} className="h-1.5 sm:h-2 bg-gray-100 dark:bg-white/10" />
        </div>

        {/* Referral earnings */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs sm:text-sm font-medium dark:text-white">
                <FormattedMessage id="chatter.referrals.referralEarnings" defaultMessage="Referral Earnings" />
              </span>
            </div>
            <span className="text-xs sm:text-sm dark:text-gray-300">
              ${(referralEarnings / 100).toFixed(2)} ({referralPercent}%)
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 ml-5">
            <FormattedMessage id="chatter.referrals.referralEarningsDesc" defaultMessage="Commissions from your recruits' activity" />
          </p>
          <Progress
            value={referralPercent}
            className="h-1.5 sm:h-2 bg-gray-100 dark:bg-white/10 [&>div]:bg-indigo-600"
          />
        </div>

        {/* Total */}
        <div className="pt-2 sm:pt-3 border-t border-amber-200/30 dark:border-amber-500/15">
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm dark:text-white">
              <FormattedMessage id="common.total" defaultMessage="Total" />
            </span>
            <span className="font-bold text-base sm:text-lg bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
              ${(totalEarnings / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Info */}
        <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          <FormattedMessage id="chatter.referrals.ratioExplanation" defaultMessage="Breakdown of your total earnings by source" />
        </p>
      </div>
    </div>
  );
});

export { EarningsRatioCard };
export default EarningsRatioCard;
