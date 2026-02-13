/**
 * InfluencerEarningsBreakdownCard - Earnings breakdown by category for Influencer dashboard
 *
 * Shows a breakdown of influencer earnings with visual bar chart:
 * - Client referrals (direct commissions from referred clients)
 * - Recruitment commissions (bonuses for recruiting new influencers)
 * - Network bonuses (N1/N2 passive income from network)
 *
 * Features:
 * - Visual bar chart with animated bars on mount
 * - Color-coded categories
 * - Amount and percentage display
 * - Total at the bottom
 * - Glassmorphism design
 * - Dark mode support
 * - Mobile-first with touch-friendly tap targets
 */

import React, { memo, useMemo, useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { PieChart, Users, UserPlus, Network } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface EarningsBreakdown {
  /** Client referral earnings in cents ($10/client) */
  clientReferrals: number;
  /** Recruitment commission earnings in cents ($5/call from partners) */
  recruitmentCommissions: number;
}

export interface InfluencerEarningsBreakdownCardProps {
  /** Earnings breakdown by category */
  breakdown: EarningsBreakdown;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

interface CategoryConfig {
  key: keyof EarningsBreakdown;
  labelKey: string;
  defaultLabel: string;
  barGradient: string;
  bgColor: string;
  textColor: string;
  icon: React.ElementType;
}

const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: 'clientReferrals',
    labelKey: 'influencer.earnings.clientReferrals',
    defaultLabel: 'Client Referrals ($10/client)',
    barGradient: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400',
    icon: Users,
  },
  {
    key: 'recruitmentCommissions',
    labelKey: 'influencer.earnings.recruitmentCommissions',
    defaultLabel: 'Partner Commissions ($5/call)',
    barGradient: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    icon: UserPlus,
  },
];

// Design tokens
const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  cardHover: 'hover:shadow-xl transition-shadow duration-300',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format currency from cents to dollars
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Animated bar component for each category
 */
interface EarningsBarProps {
  config: CategoryConfig;
  amount: number;
  percentage: number;
  animationDelay: number;
  isAnimated: boolean;
}

const EarningsBar: React.FC<EarningsBarProps> = ({
  config,
  amount,
  percentage,
  animationDelay,
  isAnimated,
}) => {
  const intl = useIntl();
  const Icon = config.icon;

  return (
    <button
      type="button"
      className="w-full p-3 sm:p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 dark:focus:ring-offset-gray-900 min-h-[72px] touch-manipulation"
      aria-label={`${intl.formatMessage({ id: config.labelKey, defaultMessage: config.defaultLabel })}: ${formatCurrency(amount)} (${percentage.toFixed(1)}%)`}
    >
      <div className="flex items-center gap-3 sm:gap-4 mb-2">
        {/* Icon */}
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl${config.bgColor}flex items-center justify-center`}
        >
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${config.textColor}`} />
        </div>

        {/* Label and amount */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm dark:text-white sm:text-base font-medium truncate">
            {intl.formatMessage({
              id: config.labelKey,
              defaultMessage: config.defaultLabel,
            })}
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-lg sm:text-xl font-bold ${config.textColor}`}>
              {formatCurrency(amount)}
            </span>
            <span className="text-xs dark:text-gray-700 sm:text-sm">
              ({percentage.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 sm:h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${config.barGradient} rounded-full transition-all duration-700 ease-out`}
          style={{
            width: isAnimated ? `${Math.max(percentage, 1)}%` : '0%',
            transitionDelay: `${animationDelay}ms`,
          }}
        />
      </div>
    </button>
  );
};

/**
 * Empty state when no earnings
 */
const EmptyState: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-8 px-4 text-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-100 dark:from-gray-800 to-gray-200 dark:to-gray-700 flex items-center justify-center mb-4">
        <PieChart className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-gray-700" />
      </div>
      <h4 className="text-base dark:text-gray-700 sm:text-lg font-semibold mb-2">
        <FormattedMessage
          id="influencer.earnings.emptyTitle"
          defaultMessage="No earnings yet"
        />
      </h4>
      <p className="text-sm dark:text-gray-700 max-w-xs">
        <FormattedMessage
          id="influencer.earnings.emptyDescription"
          defaultMessage="Start earning by sharing your referral link and recruiting new members!"
        />
      </p>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const InfluencerEarningsBreakdownCard = memo(function InfluencerEarningsBreakdownCard({
  breakdown,
  className = '',
}: InfluencerEarningsBreakdownCardProps) {
  const intl = useIntl();
  const [isAnimated, setIsAnimated] = useState(false);

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate total and percentages
  const { categories, total, hasEarnings } = useMemo(() => {
    const totalAmount =
      breakdown.clientReferrals +
      breakdown.recruitmentCommissions;

    const categoryData = CATEGORY_CONFIG.map((config, index) => {
      const amount = breakdown[config.key];
      const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;

      return {
        config,
        amount,
        percentage,
        animationDelay: index * 150,
      };
    });

    return {
      categories: categoryData,
      total: totalAmount,
      hasEarnings: totalAmount > 0,
    };
  }, [breakdown]);

  return (
    <div className={`${UI.card} ${UI.cardHover} overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <PieChart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white sm:text-lg">
              <FormattedMessage
                id="influencer.earnings.breakdownTitle"
                defaultMessage="Earnings Breakdown"
              />
            </h3>
            <p className="text-xs dark:text-gray-700 sm:text-sm">
              <FormattedMessage
                id="influencer.earnings.breakdownSubtitle"
                defaultMessage="Your earnings by category"
              />
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      {!hasEarnings ? (
        <EmptyState />
      ) : (
        <div className="p-4 sm:p-6 pt-2 space-y-2">
          {/* Category bars */}
          {categories.map((category) => (
            <EarningsBar
              key={category.config.key}
              config={category.config}
              amount={category.amount}
              percentage={category.percentage}
              animationDelay={category.animationDelay}
              isAnimated={isAnimated}
            />
          ))}

          {/* Total */}
          <div className="mt-4 pt-4 border-t dark:border-white/10">
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
              <span className="text-sm dark:text-gray-700 sm:text-base font-medium">
                <FormattedMessage
                  id="influencer.earnings.total"
                  defaultMessage="Total Earnings"
                />
              </span>
              <span className="text-xl dark:text-white sm:text-2xl font-bold">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default InfluencerEarningsBreakdownCard;
