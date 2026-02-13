/**
 * InfluencerLiveActivityFeed - Recent activity feed for the influencer dashboard
 *
 * Features:
 * - Displays recent commissions, referrals, withdrawals, and badges
 * - Staggered entrance animations for list items
 * - Mobile-first responsive design with glassmorphism
 * - Dark mode support
 * - Loading skeleton state
 * - Empty state handling
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  DollarSign,
  UserPlus,
  CheckCircle,
  Clock,
  Award,
  ArrowDownCircle,
  Sparkles,
} from 'lucide-react';

// Design tokens - matching existing Influencer card styles
const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  skeleton: 'animate-pulse bg-gray-200 dark:bg-white/10 rounded',
} as const;

/**
 * Activity types for the influencer feed
 */
type ActivityType = 'client_referral' | 'recruitment' | 'withdrawal' | 'badge_earned';

/**
 * Activity item interface
 */
export interface ActivityItem {
  id: string;
  type: ActivityType;
  amount?: number; // in cents
  createdAt: string;
  description?: string;
}

/**
 * Props for InfluencerLiveActivityFeed component
 */
export interface InfluencerLiveActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  className?: string;
}

/**
 * Activity type configuration
 */
const ACTIVITY_CONFIG: Record<
  ActivityType,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    messageKey: string;
    defaultMessage: string;
  }
> = {
  client_referral: {
    icon: DollarSign,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    messageKey: 'influencer.activity.clientReferral',
    defaultMessage: 'Commission earned',
  },
  recruitment: {
    icon: UserPlus,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    messageKey: 'influencer.activity.recruitment',
    defaultMessage: 'New referral joined',
  },
  withdrawal: {
    icon: ArrowDownCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    messageKey: 'influencer.activity.withdrawal',
    defaultMessage: 'Withdrawal processed',
  },
  badge_earned: {
    icon: Award,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    messageKey: 'influencer.activity.badgeEarned',
    defaultMessage: 'Badge earned',
  },
};

/**
 * Format amount in cents to dollars
 */
function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format relative time from ISO string
 */
function formatRelativeTime(isoString: string, locale: string): string {
  const now = Date.now();
  const time = new Date(isoString).getTime();
  const diffMs = now - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) {
    return locale === 'fr' ? "a l'instant" : 'just now';
  } else if (diffMin < 60) {
    return locale === 'fr' ? `il y a ${diffMin} min` : `${diffMin} min ago`;
  } else if (diffHr < 24) {
    return locale === 'fr' ? `il y a ${diffHr}h` : `${diffHr}h ago`;
  } else if (diffDays < 7) {
    return locale === 'fr' ? `il y a ${diffDays}j` : `${diffDays}d ago`;
  } else {
    return locale === 'fr' ? 'il y a +7j' : '7d+ ago';
  }
}

/**
 * Loading skeleton component
 */
const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`${UI.card} p-4 ${className}`}>
    {/* Header skeleton */}
    <div className="flex items-center gap-2 mb-4">
      <div className={`${UI.skeleton} w-8 h-8 rounded-lg`} />
      <div className={`${UI.skeleton} h-5 w-28`} />
    </div>
    {/* Items skeleton */}
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`${UI.skeleton} h-14 w-full rounded-xl`}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  </div>
);

/**
 * Empty state component
 */
const EmptyState: React.FC = () => (
  <div className="text-center py-8">
    <Sparkles className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
    <p className="text-gray-700 dark:text-gray-300 font-medium">
      <FormattedMessage
        id="influencer.activity.empty"
        defaultMessage="No recent activity"
      />
    </p>
    <p className="text-gray-400 dark:text-gray-300 mt-1">
      <FormattedMessage
        id="influencer.activity.emptyHint"
        defaultMessage="Your earnings and referrals will appear here"
      />
    </p>
  </div>
);

/**
 * Single activity item component
 */
const ActivityItemRow: React.FC<{
  activity: ActivityItem;
  index: number;
  locale: string;
}> = memo(({ activity, index, locale }) => {
  const config = ACTIVITY_CONFIG[activity.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        delay: index * 0.08,
      }}
      className="py-1.5"
    >
      <div
        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
          index === 0
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-800/50'
            : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'
        }`}
      >
        {/* Icon */}
        <div
          className={`w-9 h-9 rounded-xl${config.bgColor}flex items-center justify-center`}
        >
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm dark:text-white font-medium truncate">
            {activity.description || (
              <FormattedMessage
                id={config.messageKey}
                defaultMessage={config.defaultMessage}
              />
            )}
          </p>
          {activity.amount && (
            <p className={`text-xs font-semibold ${config.color}`}>
              {activity.type === 'withdrawal' ? '-' : '+'}
              {formatAmount(activity.amount)}
            </p>
          )}
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 text-xs dark:text-gray-300">
          <Clock className="w-3 h-3" />
          <span>{formatRelativeTime(activity.createdAt, locale)}</span>
        </div>
      </div>
    </motion.div>
  );
});

ActivityItemRow.displayName = 'ActivityItemRow';

/**
 * InfluencerLiveActivityFeed Component
 */
const InfluencerLiveActivityFeed: React.FC<InfluencerLiveActivityFeedProps> = memo(
  ({ activities, isLoading = false, className = '' }) => {
    const intl = useIntl();
    const locale = intl.locale.split('-')[0];

    // Limit to last 5 activities
    const displayedActivities = useMemo(
      () => activities.slice(0, 5),
      [activities]
    );

    // Loading state
    if (isLoading) {
      return <LoadingSkeleton className={className} />;
    }

    return (
      <div className={`${UI.card} overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              {/* Pulse indicator when there are activities */}
              {displayedActivities.length > 0 && (
                <div className="absolute -top-1 w-3 h-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white sm:text-base">
                <FormattedMessage
                  id="influencer.activity.title"
                  defaultMessage="Recent Activity"
                />
              </h3>
              <p className="text-xs dark:text-gray-300">
                <FormattedMessage
                  id="influencer.activity.subtitle"
                  defaultMessage="Your latest earnings"
                />
              </p>
            </div>
          </div>
          {displayedActivities.length > 0 && (
            <div className="flex items-center gap-1 text-xs dark:text-gray-300 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" />
              <span>{displayedActivities.length}</span>
            </div>
          )}
        </div>

        {/* Activity List */}
        <div className="px-4 pb-4">
          {displayedActivities.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence mode="popLayout">
              {displayedActivities.map((activity, index) => (
                <ActivityItemRow
                  key={activity.id}
                  activity={activity}
                  index={index}
                  locale={locale}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {displayedActivities.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-t dark:border-white/10">
            <div className="flex items-center justify-center gap-2 text-xs dark:text-gray-300">
              <Activity className="w-3.5 h-3.5" />
              <FormattedMessage
                id="influencer.activity.footer"
                defaultMessage="Showing last {count} activities"
                values={{ count: displayedActivities.length }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }
);

InfluencerLiveActivityFeed.displayName = 'InfluencerLiveActivityFeed';

// Named export
export { InfluencerLiveActivityFeed };

// Default export
export default InfluencerLiveActivityFeed;
