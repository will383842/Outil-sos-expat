/**
 * LiveActivityFeed - Real-time social proof feed for Chatter dashboard
 *
 * Features:
 * - Real-time Firestore listener (onSnapshot)
 * - Displays last 10 activities
 * - Slide-in animation for new entries
 * - Format: "Marie D. (FR) vient de gagner $12!"
 * - Mobile-first responsive design
 * - Auto-refreshes every 30 seconds
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  UserPlus,
  TrendingUp,
  Sparkles,
  Activity,
  Zap,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../config/firebase";

// Design tokens - matching existing Chatter card styles
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
} as const;

/**
 * Activity types
 */
type ActivityType = "commission" | "signup" | "level_up";

/**
 * Activity feed item from Firestore
 */
interface ActivityFeedItem {
  id: string;
  type: ActivityType;
  chatterName: string;
  country: string;
  amount?: number; // In cents
  level?: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

/**
 * Props for LiveActivityFeed component
 */
interface LiveActivityFeedProps {
  /** Maximum number of items to display */
  maxItems?: number;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Custom class name */
  className?: string;
  /** Loading state override */
  loading?: boolean;
  /** Compact mode for smaller display */
  compact?: boolean;
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
    emoji: string;
  }
> = {
  commission: {
    icon: DollarSign,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    messageKey: "chatter.activityFeed.commission",
    defaultMessage: "just earned ${amount}!",
    emoji: "💰",
  },
  signup: {
    icon: UserPlus,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    messageKey: "chatter.activityFeed.signup",
    defaultMessage: "just joined the team!",
    emoji: "🎉",
  },
  level_up: {
    icon: TrendingUp,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    messageKey: "chatter.activityFeed.levelUp",
    defaultMessage: "reached level {level}!",
    emoji: "🚀",
  },
};

/**
 * Country flag emoji from country code
 */
function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode === "XX" || countryCode.length !== 2) {
    return "🌍";
  }
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Format amount in cents to dollars
 */
function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: Timestamp, locale: string): string {
  const now = Date.now();
  const time = timestamp.toMillis();
  const diffMs = now - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return locale === "fr" ? "à l'instant" : "just now";
  } else if (diffMin < 60) {
    return locale === "fr" ? `il y a ${diffMin}m` : `${diffMin}m ago`;
  } else if (diffHr < 24) {
    return locale === "fr" ? `il y a ${diffHr}h` : `${diffHr}h ago`;
  } else {
    return locale === "fr" ? "hier" : "yesterday";
  }
}

/**
 * LiveActivityFeed Component
 */
const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  maxItems = 10,
  showHeader = true,
  className = "",
  loading: loadingOverride,
  compact = false,
}) => {
  const intl = useIntl();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousActivitiesRef = useRef<Set<string>>(new Set());

  // Subscribe to Firestore in real-time
  useEffect(() => {
    const activityQuery = query(
      collection(db, "chatter_activity_feed"),
      orderBy("createdAt", "desc"),
      limit(maxItems)
    );

    const unsubscribe = onSnapshot(
      activityQuery,
      (snapshot) => {
        const newActivities: ActivityFeedItem[] = [];
        const currentIds = new Set<string>();

        snapshot.forEach((doc) => {
          const data = doc.data() as ActivityFeedItem;
          newActivities.push({
            ...data,
            id: doc.id,
          });
          currentIds.add(doc.id);
        });

        // Update previous IDs for animation detection
        previousActivitiesRef.current = currentIds;

        setActivities(newActivities);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("[LiveActivityFeed] Firestore error:", err);
        setError("Failed to load activity feed");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [maxItems]);

  // Get locale for formatting
  const locale = intl.locale.split("-")[0];

  // Memoize formatted activities
  const formattedActivities = useMemo(() => {
    return activities.map((activity) => {
      const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.commission;
      const flag = getCountryFlag(activity.country);

      let message = "";
      if (activity.type === "commission" && activity.amount) {
        message =
          locale === "fr"
            ? `vient de gagner ${formatAmount(activity.amount)} !`
            : `just earned ${formatAmount(activity.amount)}!`;
      } else if (activity.type === "level_up" && activity.level) {
        message =
          locale === "fr"
            ? `a atteint le niveau ${activity.level} !`
            : `reached level ${activity.level}!`;
      } else if (activity.type === "signup") {
        message =
          locale === "fr"
            ? "a rejoint l'équipe !"
            : "just joined the team!";
      }

      return {
        ...activity,
        config,
        flag,
        message,
        relativeTime: formatRelativeTime(activity.createdAt, locale),
      };
    });
  }, [activities, locale]);

  // Loading state
  const isLoading = loadingOverride ?? loading;

  if (isLoading) {
    return (
      <div className={`${UI.card} p-4 ${className}`}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <div className={`${UI.skeleton} w-8 h-8 rounded-lg`} />
            <div className={`${UI.skeleton} h-5 w-32`} />
          </div>
        )}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`${UI.skeleton} h-12 w-full rounded-xl`} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${UI.card} p-4 ${className}`}>
        <div className="text-center py-4">
          <Activity className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div className={`${UI.card} p-4 ${className}`}>
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              <FormattedMessage
                id="chatter.activityFeed.title"
                defaultMessage="Live Activity"
              />
            </h3>
          </div>
        )}
        <div className="text-center py-6">
          <Sparkles className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            <FormattedMessage
              id="chatter.activityFeed.empty"
              defaultMessage="No recent activity"
            />
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            <FormattedMessage
              id="chatter.activityFeed.emptyHint"
              defaultMessage="Be the first to earn today!"
            />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${UI.card} overflow-hidden ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              {/* Pulse indicator */}
              <div className="absolute -top-1 -right-1 w-3 h-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                <FormattedMessage
                  id="chatter.activityFeed.title"
                  defaultMessage="Live Activity"
                />
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="chatter.activityFeed.subtitle"
                  defaultMessage="Real-time earnings"
                />
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-full">
            <FormattedMessage
              id="chatter.activityFeed.live"
              defaultMessage="LIVE"
            />
          </div>
        </div>
      )}

      {/* Activity List */}
      <div
        className={`${compact ? "max-h-64" : "max-h-96"} overflow-y-auto px-4 pb-4`}
      >
        <AnimatePresence mode="popLayout">
          {formattedActivities.map((activity, index) => {
            const Icon = activity.config.icon;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  delay: index * 0.05,
                }}
                className="py-2 first:pt-0"
              >
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    index === 0
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-800/50"
                      : "bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl ${activity.config.bgColor} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`w-4 h-4 ${activity.config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      <span className="mr-1">{activity.config.emoji}</span>
                      <span className="font-semibold">{activity.chatterName}</span>
                      <span className="mx-1 text-gray-400">
                        ({activity.flag} {activity.country})
                      </span>
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {activity.message}
                    </p>
                  </div>

                  {/* Time */}
                  <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {activity.relativeTime}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Activity className="w-3.5 h-3.5" />
          <FormattedMessage
            id="chatter.activityFeed.footer"
            defaultMessage="{count} activities in the last 24h"
            values={{ count: activities.length }}
          />
        </div>
      </div>
    </div>
  );
};

export default LiveActivityFeed;
