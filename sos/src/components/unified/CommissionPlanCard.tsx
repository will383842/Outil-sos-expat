/**
 * CommissionPlanCard — Phase 8.1
 *
 * Displays the user's commission rates in clear human-readable language.
 * Reads from lockedRates (user doc) or plan rates (unified system).
 */

import React from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Coins, TrendingUp, Users, Gift, Lock } from "lucide-react";
import type { UnifiedPlanInfo } from "@/hooks/useUnifiedAffiliate";

interface CommissionPlanCardProps {
  planInfo: UnifiedPlanInfo | null;
  isLoading?: boolean;
  className?: string;
}

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
};

const RATE_ICONS: Record<string, React.ReactNode> = {
  client_call: <Coins className="w-4 h-4 text-emerald-500" />,
  recruitment_call: <TrendingUp className="w-4 h-4 text-blue-500" />,
  captain_call: <TrendingUp className="w-4 h-4 text-purple-500" />,
  signup_bonus: <Gift className="w-4 h-4 text-amber-500" />,
  provider_recruitment: <Users className="w-4 h-4 text-indigo-500" />,
};

const RATE_LABELS: Record<string, string> = {
  client_call: "unified.plan.clientCall",
  recruitment_call: "unified.plan.recruitmentCall",
  captain_call: "unified.plan.captainCall",
  signup_bonus: "unified.plan.signupBonus",
  provider_recruitment: "unified.plan.providerRecruitment",
  subscription_commission: "unified.plan.subscription",
  subscription_renewal: "unified.plan.subscriptionRenewal",
  n1_recruit_bonus: "unified.plan.n1RecruitBonus",
};

const RATE_DEFAULTS: Record<string, string> = {
  client_call: "Per client call",
  recruitment_call: "Per recruit's call",
  captain_call: "Captain bonus per call",
  signup_bonus: "Signup bonus",
  provider_recruitment: "Provider recruitment",
  subscription_commission: "Subscription commission",
  subscription_renewal: "Subscription renewal",
  n1_recruit_bonus: "N1 recruit bonus",
};

function formatRateValue(rate: { fixedAmount?: number; percentage?: number }, locale: string): string {
  if (rate.fixedAmount !== undefined && rate.fixedAmount > 0) {
    const amount = rate.fixedAmount / 100;
    return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(amount);
  }
  if (rate.percentage !== undefined && rate.percentage > 0) {
    return `${rate.percentage}%`;
  }
  return "—";
}

const CommissionPlanCard: React.FC<CommissionPlanCardProps> = ({ planInfo, isLoading, className = "" }) => {
  const intl = useIntl();

  if (isLoading) {
    return (
      <div className={`${UI.card} p-4 sm:p-5 ${className}`}>
        <div className={`${UI.skeleton} h-5 w-40 mb-4`} />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <div className={`${UI.skeleton} h-4 w-32`} />
              <div className={`${UI.skeleton} h-4 w-16`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!planInfo || planInfo.rates.length === 0) {
    return null;
  }

  const enabledRates = planInfo.rates.filter((r) => r.enabled);
  const hasLockedRates = !!planInfo.lockedRates;

  return (
    <div className={`${UI.card} p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Coins className="w-5 h-5 text-emerald-500" />
          <FormattedMessage id="unified.plan.title" defaultMessage="Your commission rates" />
        </h3>
        {hasLockedRates && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
            <Lock className="w-3 h-3" />
            <FormattedMessage id="unified.plan.locked" defaultMessage="Locked" />
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {enabledRates.map((rate) => (
          <div
            key={rate.type}
            className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-white/5 rounded-lg"
          >
            <div className="flex items-center gap-2">
              {RATE_ICONS[rate.type] || <Coins className="w-4 h-4 text-gray-400" />}
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {intl.formatMessage({
                  id: RATE_LABELS[rate.type] || `unified.plan.${rate.type}`,
                  defaultMessage: RATE_DEFAULTS[rate.type] || rate.type.replace(/_/g, " "),
                })}
              </span>
            </div>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {formatRateValue(rate, intl.locale)}
            </span>
          </div>
        ))}
      </div>

      {/* Discount info */}
      {planInfo.discount?.enabled && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
          <div className="flex items-center justify-between py-2 px-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <span className="text-sm text-purple-600 dark:text-purple-300">
              <FormattedMessage id="unified.plan.clientDiscount" defaultMessage="Client discount" />
            </span>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {planInfo.discount.type === "fixed"
                ? new Intl.NumberFormat(intl.locale, { style: "currency", currency: "USD" }).format(planInfo.discount.value / 100)
                : `${planInfo.discount.value}%`}
            </span>
          </div>
          {planInfo.discount.label && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 px-3">
              {planInfo.discount.label}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CommissionPlanCard;
