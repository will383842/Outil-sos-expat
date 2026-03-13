/**
 * UnifiedAffiliateDashboard — Phase 8.1
 *
 * Drop-in unified affiliate section for any dashboard.
 * Displays: affiliate link, commission plan, commissions history, referrals.
 *
 * Can work standalone (uses useUnifiedAffiliate hook) or receive data via props.
 */

import React, { lazy, Suspense } from "react";
import { FormattedMessage } from "react-intl";
import { Wallet, TrendingUp, Clock, Coins } from "lucide-react";
import { useUnifiedAffiliate } from "@/hooks/useUnifiedAffiliate";
import type { UnifiedPlanInfo, UnifiedCommission, UnifiedReferral } from "@/hooks/useUnifiedAffiliate";

// Lazy load sub-components for performance
const UnifiedAffiliateLink = lazy(() => import("./UnifiedAffiliateLink"));
const CommissionPlanCard = lazy(() => import("./CommissionPlanCard"));
const CommissionsHistory = lazy(() => import("./CommissionsHistory"));
const ReferralsList = lazy(() => import("./ReferralsList"));

// ============================================================================
// TYPES
// ============================================================================

interface UnifiedAffiliateDashboardProps {
  /** Override: pass affiliate code directly instead of fetching */
  affiliateCode?: string;
  /** Override: pass plan info directly */
  planInfo?: UnifiedPlanInfo | null;
  /** Override: pass commissions directly */
  commissions?: UnifiedCommission[];
  /** Override: pass referrals directly */
  referrals?: UnifiedReferral[];
  /** Override: pass balance directly */
  balance?: { available: number; pending: number; totalEarned: number };
  /** Show balance cards (default true) */
  showBalance?: boolean;
  /** Show commissions history (default true) */
  showHistory?: boolean;
  /** Show referrals list (default true) */
  showReferrals?: boolean;
  /** Compact mode — fewer sections, for smaller dashboards */
  compact?: boolean;
  /** Extra CSS classes */
  className?: string;
}

// ============================================================================
// UI TOKENS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
};

const LoadingFallback = () => (
  <div className={`${UI.skeleton} h-32 w-full rounded-2xl`} />
);

// ============================================================================
// BALANCE CARDS
// ============================================================================

interface BalanceCardProps {
  icon: React.ReactNode;
  label: React.ReactNode;
  amount: number;
  color: string;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ icon, label, amount, color }) => (
  <div className={`${UI.card} p-4`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
        <p className={`text-xl font-bold ${color}`}>
          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)}
        </p>
      </div>
      <div className="p-2 bg-gray-100 dark:bg-white/10 rounded-xl">{icon}</div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UnifiedAffiliateDashboard: React.FC<UnifiedAffiliateDashboardProps> = ({
  affiliateCode: codeProp,
  planInfo: planProp,
  commissions: commissionsProp,
  referrals: referralsProp,
  balance: balanceProp,
  showBalance = true,
  showHistory = true,
  showReferrals = true,
  compact = false,
  className = "",
}) => {
  // Use hook data as fallback when props not provided
  const hookData = useUnifiedAffiliate();

  const code = codeProp ?? hookData.affiliateCode;
  const plan = planProp !== undefined ? planProp : hookData.planInfo;
  const commissions = commissionsProp ?? hookData.commissions;
  const referrals = referralsProp ?? hookData.referrals;
  const balance = balanceProp ?? hookData.balance;
  const isLoading = hookData.isLoading;

  // Don't render anything if no affiliate code
  if (!isLoading && !code) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Balance cards */}
      {showBalance && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <BalanceCard
            icon={<Wallet className="w-5 h-5 text-emerald-500" />}
            label={<FormattedMessage id="unified.balance.available" defaultMessage="Available" />}
            amount={balance.available}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <BalanceCard
            icon={<Clock className="w-5 h-5 text-amber-500" />}
            label={<FormattedMessage id="unified.balance.pending" defaultMessage="Pending" />}
            amount={balance.pending}
            color="text-amber-600 dark:text-amber-400"
          />
          <BalanceCard
            icon={<TrendingUp className="w-5 h-5 text-indigo-500" />}
            label={<FormattedMessage id="unified.balance.totalEarned" defaultMessage="Total earned" />}
            amount={balance.totalEarned}
            color="text-indigo-600 dark:text-indigo-400"
          />
        </div>
      )}

      {/* Affiliate link + Commission plan (side by side on desktop) */}
      <div className={compact ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-2 gap-4"}>
        {code && (
          <Suspense fallback={<LoadingFallback />}>
            <UnifiedAffiliateLink code={code} />
          </Suspense>
        )}
        <Suspense fallback={<LoadingFallback />}>
          <CommissionPlanCard planInfo={plan} isLoading={isLoading} />
        </Suspense>
      </div>

      {/* Commissions history */}
      {showHistory && (
        <Suspense fallback={<LoadingFallback />}>
          <CommissionsHistory commissions={commissions} isLoading={isLoading} />
        </Suspense>
      )}

      {/* Referrals list */}
      {showReferrals && !compact && (
        <Suspense fallback={<LoadingFallback />}>
          <ReferralsList referrals={referrals} isLoading={isLoading} />
        </Suspense>
      )}
    </div>
  );
};

export default UnifiedAffiliateDashboard;
