/**
 * WeeklyChallengeCard - Weekly challenge widget for Chatter dashboard
 *
 * Features:
 * - Challenge title and description
 * - Countdown timer until challenge ends
 * - Top 3 leaderboard with prizes
 * - User's current position
 * - CTA button based on challenge type
 * - Mobile-first design with animations
 */

import React, { useState, useEffect, useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Clock,
  Users,
  Phone,
  UserPlus,
  ChevronRight,
  Crown,
  Medal,
  Award,
  Flame,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Design tokens - matching existing Chatter card styles
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
  button: {
    primary:
      "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
  },
} as const;

// Challenge types
type WeeklyChallengeType = "recruiter" | "caller" | "team";

interface LeaderboardEntry {
  chatterId: string;
  name: string;
  score: number;
  photoUrl?: string;
}

interface WeeklyChallenge {
  id: string;
  title: string;
  titleTranslations?: Record<string, string>;
  description: string;
  descriptionTranslations?: Record<string, string>;
  type: WeeklyChallengeType;
  startDate: { toDate: () => Date } | Date;
  endDate: { toDate: () => Date } | Date;
  prizes: {
    1: number;
    2: number;
    3: number;
  };
  leaderboard: LeaderboardEntry[];
  status: "active" | "completed" | "cancelled";
}

interface WeeklyChallengeCardProps {
  /** Challenge data */
  challenge: WeeklyChallenge | null;
  /** Current user's rank */
  myRank: number | null;
  /** Current user's score */
  myScore: number | null;
  /** Current user's ID */
  userId: string;
  /** Loading state */
  loading?: boolean;
  /** Callback when CTA is clicked */
  onCtaClick?: (type: WeeklyChallengeType) => void;
}

// Prize medal icons and colors
const PRIZE_CONFIG = {
  1: {
    icon: Crown,
    color: "text-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-400",
    label: "1st",
  },
  2: {
    icon: Medal,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-700/30",
    borderColor: "border-gray-600 dark:border-gray-400",
    label: "2nd",
  },
  3: {
    icon: Award,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-600",
    label: "3rd",
  },
};

// Challenge type icons
const CHALLENGE_TYPE_CONFIG: Record<
  WeeklyChallengeType,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    ctaKey: string;
    ctaDefault: string;
  }
> = {
  recruiter: {
    icon: UserPlus,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    ctaKey: "chatter.weeklyChallenge.cta.recruiter",
    ctaDefault: "Recruit Chatters",
  },
  caller: {
    icon: Phone,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    ctaKey: "chatter.weeklyChallenge.cta.caller",
    ctaDefault: "Share Your Link",
  },
  team: {
    icon: Users,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    ctaKey: "chatter.weeklyChallenge.cta.team",
    ctaDefault: "Boost Your Team",
  },
};

/**
 * Format remaining time
 */
function formatTimeRemaining(endDate: Date): string {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) {
    return "Ended";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Format cents to dollars
 */
function formatPrize(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

const WeeklyChallengeCard: React.FC<WeeklyChallengeCardProps> = ({
  challenge,
  myRank,
  myScore,
  userId,
  loading = false,
  onCtaClick,
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Get end date as Date object
  const endDate = useMemo(() => {
    if (!challenge) return null;
    return challenge.endDate instanceof Date
      ? challenge.endDate
      : challenge.endDate.toDate();
  }, [challenge]);

  // Update countdown every minute
  useEffect(() => {
    if (!endDate) return;

    const updateTime = () => {
      setTimeRemaining(formatTimeRemaining(endDate));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  // Get challenge type config
  const typeConfig = challenge
    ? CHALLENGE_TYPE_CONFIG[challenge.type]
    : null;
  const TypeIcon = typeConfig?.icon || Trophy;

  // Get top 3 from leaderboard
  const top3 = useMemo(() => {
    if (!challenge) return [];
    return challenge.leaderboard.slice(0, 3);
  }, [challenge]);

  // Get translated title and description
  const title = useMemo(() => {
    if (!challenge) return "";
    const locale = intl.locale.split("-")[0];
    return (
      challenge.titleTranslations?.[locale] ||
      challenge.titleTranslations?.en ||
      challenge.title
    );
  }, [challenge, intl.locale]);

  const description = useMemo(() => {
    if (!challenge) return "";
    const locale = intl.locale.split("-")[0];
    return (
      challenge.descriptionTranslations?.[locale] ||
      challenge.descriptionTranslations?.en ||
      challenge.description
    );
  }, [challenge, intl.locale]);

  // Handle CTA click
  const handleCtaClick = () => {
    if (onCtaClick && challenge) {
      onCtaClick(challenge.type);
    } else if (challenge) {
      // Default navigation based on challenge type
      switch (challenge.type) {
        case "recruiter":
          navigate("/chatter/filleuls");
          break;
        case "caller":
          navigate("/chatter/posts");
          break;
        case "team":
          navigate("/chatter/parrainer");
          break;
      }
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`${UI.skeleton} h-6 w-40`} />
          <div className={`${UI.skeleton} h-6 w-20`} />
        </div>
        <div className={`${UI.skeleton} h-4 w-full mb-4`} />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${UI.skeleton} h-12 w-full rounded-xl`} />
          ))}
        </div>
      </div>
    );
  }

  // No challenge state
  if (!challenge) {
    return (
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="text-center py-6">
          <Trophy className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="chatter.weeklyChallenge.noChallenge"
              defaultMessage="No active challenge this week"
            />
          </p>
          <p className="text-sm dark:text-gray-300 mt-1">
            <FormattedMessage
              id="chatter.weeklyChallenge.checkBack"
              defaultMessage="Check back Monday for a new challenge!"
            />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${UI.card} ${UI.cardHover} overflow-hidden`}>
      {/* Header */}
      <div className="p-4 sm:p-6 pb-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-xl ${typeConfig?.bgColor} flex items-center justify-center shadow-lg`}
            >
              <TypeIcon className={`w-5 h-5 ${typeConfig?.color}`} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white sm:text-base">
                {title}
              </h3>
              <div className="flex items-center gap-1 text-xs dark:text-gray-400">
                <Clock className="w-3 h-3" />
                <span>
                  <FormattedMessage
                    id="chatter.weeklyChallenge.endsIn"
                    defaultMessage="Ends in {time}"
                    values={{ time: timeRemaining }}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Prize Pool Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-50 dark:from-yellow-900/20 to-orange-50 dark:to-orange-900/20 border dark:border-yellow-800">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm dark:text-white font-bold">
              {formatPrize(
                challenge.prizes[1] + challenge.prizes[2] + challenge.prizes[3]
              )}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm dark:text-gray-400 mb-4">
          {description}
        </p>
      </div>

      {/* Top 3 Leaderboard */}
      <div className="px-4 sm:px-6 pb-4">
        <div className="space-y-2">
          {top3.length > 0 ? (
            top3.map((entry, index) => {
              const rank = (index + 1) as 1 | 2 | 3;
              const config = PRIZE_CONFIG[rank];
              const PrizeIcon = config.icon;
              const isCurrentUser = entry.chatterId === userId;

              return (
                <motion.div
                  key={entry.chatterId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isCurrentUser
                      ? "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800"
                      : "bg-gray-50 dark:bg-white/5"
                  }`}
                >
                  {/* Rank Badge */}
                  <div
                    className={`w-8 h-8 rounded-full${config.bgColor}flex items-center justify-center`}
                  >
                    <PrizeIcon className={`w-4 h-4 ${config.color}`} />
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                    {entry.photoUrl ? (
                      <img
                        src={entry.photoUrl}
                        alt={entry.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">
                        {entry.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        isCurrentUser
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {entry.name}
                      {isCurrentUser && (
                        <span className="ml-1 text-xs opacity-70">
                          <FormattedMessage
                            id="chatter.weeklyChallenge.you"
                            defaultMessage="(You)"
                          />
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm dark:text-gray-300 font-bold">
                      {entry.score}
                    </span>
                    <span className="text-xs">pts</span>
                  </div>

                  {/* Prize */}
                  <div
                    className={`px-2 py-1 rounded-full ${config.bgColor} border ${config.borderColor}`}
                  >
                    <span className={`text-xs font-bold ${config.color}`}>
                      {formatPrize(challenge.prizes[rank])}
                    </span>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="chatter.weeklyChallenge.noParticipants"
                  defaultMessage="Be the first to participate!"
                />
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User's Position (if not in top 3) */}
      {myRank && myRank > 3 && (
        <div className="px-4 sm:px-6 pb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 border dark:border-blue-800">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm dark:text-blue-300 font-medium">
                <FormattedMessage
                  id="chatter.weeklyChallenge.yourPosition"
                  defaultMessage="Your Position"
                />
              </p>
              <p className="text-xs dark:text-blue-400">
                <FormattedMessage
                  id="chatter.weeklyChallenge.keepGoing"
                  defaultMessage="Keep going to reach Top 3!"
                />
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg dark:text-blue-300 font-bold">
                #{myRank}
              </span>
              <span className="text-sm dark:text-blue-400">
                ({myScore} pts)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CTA Button */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        <button
          onClick={handleCtaClick}
          className={`${UI.button.primary} w-full min-h-[48px] flex items-center justify-center gap-2 px-6 touch-manipulation active:scale-[0.98]`}
        >
          <Flame className="w-5 h-5" />
          <span>
            {intl.formatMessage({
              id: typeConfig?.ctaKey || "chatter.weeklyChallenge.cta.default",
              defaultMessage: typeConfig?.ctaDefault || "Join Challenge",
            })}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Footer - Total Participants */}
      {challenge.leaderboard.length > 0 && (
        <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-white/5 border-t dark:border-white/10">
          <div className="flex items-center justify-center gap-2 text-sm dark:text-gray-400">
            <Users className="w-4 h-4" />
            <FormattedMessage
              id="chatter.weeklyChallenge.participants"
              defaultMessage="{count} participants"
              values={{ count: challenge.leaderboard.length }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyChallengeCard;
