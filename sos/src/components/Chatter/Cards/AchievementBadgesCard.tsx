/**
 * AchievementBadgesCard - Display earned and locked achievement badges
 * Shows gamification badges with progress indicators and visual effects
 *
 * Features:
 * - Badge grid display with earned/locked states
 * - Shine/glow effect on earned badges
 * - Lock icon overlay on unearned badges
 * - Hover reveals badge name and requirements
 * - Progress indicator for partially completed badges
 * - Recent badge highlight
 * - Stats summary (X/Y badges earned)
 * - Next badge to earn with progress
 */

import React, { memo, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Lock,
  Star,
  Users,
  Flame,
  Trophy,
  Target,
  Sparkles,
  TrendingUp,
  ChevronRight,
  X,
  Gift,
  Zap,
  Crown,
  Medal,
  Rocket,
  Heart,
  BookOpen,
  Video,
  DollarSign,
} from 'lucide-react';
import type { ChatterBadgeType, ChatterData } from '@/types/chatter';

// Design tokens - matching existing Chatter card styles
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: `
    transition-all duration-300 ease-out
    hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5
    hover:-translate-y-1
  `,
  skeleton: `
    relative overflow-hidden
    bg-gray-200 dark:bg-white/10 rounded
    before:absolute before:inset-0
    before:-translate-x-full
    before:animate-shimmer
    before:bg-gradient-to-r
    before:from-transparent
    before:via-white/20
    before:to-transparent
    dark:before:via-white/10
  `,
} as const;

// Badge configuration with icons, colors, and descriptions
interface BadgeConfig {
  id: ChatterBadgeType;
  icon: React.ElementType;
  nameKey: string;
  defaultName: string;
  descriptionKey: string;
  defaultDescription: string;
  color: string;
  bgColor: string;
  glowColor: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: 'milestone' | 'streak' | 'level' | 'competition' | 'activity';
  requirement?: {
    type: 'clients' | 'recruits' | 'streak' | 'earnings' | 'level' | 'rank';
    target: number;
  };
}

const BADGE_CONFIG: BadgeConfig[] = [
  // Milestone badges
  {
    id: 'first_client',
    icon: Target,
    nameKey: 'chatter.badges.firstClient.name',
    defaultName: 'Premier Client',
    descriptionKey: 'chatter.badges.firstClient.desc',
    defaultDescription: 'Premiere conversion client reussie',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    glowColor: 'shadow-green-500/30',
    rarity: 'common',
    category: 'milestone',
    requirement: { type: 'clients', target: 1 },
  },
  {
    id: 'first_recruitment',
    icon: Users,
    nameKey: 'chatter.badges.firstRecruit.name',
    defaultName: 'Premier Recrutement',
    descriptionKey: 'chatter.badges.firstRecruit.desc',
    defaultDescription: 'Premier membre recrute dans ton equipe',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    glowColor: 'shadow-purple-500/30',
    rarity: 'common',
    category: 'milestone',
    requirement: { type: 'recruits', target: 1 },
  },
  {
    id: 'first_quiz_pass',
    icon: BookOpen,
    nameKey: 'chatter.badges.firstQuiz.name',
    defaultName: 'Certifie',
    descriptionKey: 'chatter.badges.firstQuiz.desc',
    defaultDescription: 'Quiz de certification reussi',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    glowColor: 'shadow-blue-500/30',
    rarity: 'common',
    category: 'activity',
  },
  // Streak badges
  {
    id: 'streak_7',
    icon: Flame,
    nameKey: 'chatter.badges.streak7.name',
    defaultName: 'Semaine de Feu',
    descriptionKey: 'chatter.badges.streak7.desc',
    defaultDescription: '7 jours consecutifs d\'activite',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    glowColor: 'shadow-orange-500/30',
    rarity: 'uncommon',
    category: 'streak',
    requirement: { type: 'streak', target: 7 },
  },
  {
    id: 'streak_30',
    icon: Flame,
    nameKey: 'chatter.badges.streak30.name',
    defaultName: 'Mois de Feu',
    descriptionKey: 'chatter.badges.streak30.desc',
    defaultDescription: '30 jours consecutifs d\'activite',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    glowColor: 'shadow-red-500/30',
    rarity: 'rare',
    category: 'streak',
    requirement: { type: 'streak', target: 30 },
  },
  {
    id: 'streak_100',
    icon: Flame,
    nameKey: 'chatter.badges.streak100.name',
    defaultName: 'Legende',
    descriptionKey: 'chatter.badges.streak100.desc',
    defaultDescription: '100 jours consecutifs d\'activite',
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    glowColor: 'shadow-pink-500/30',
    rarity: 'legendary',
    category: 'streak',
    requirement: { type: 'streak', target: 100 },
  },
  // Level badges
  {
    id: 'level_2',
    icon: Star,
    nameKey: 'chatter.badges.level2.name',
    defaultName: 'Niveau Silver',
    descriptionKey: 'chatter.badges.level2.desc',
    defaultDescription: 'Atteint le niveau 2',
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/30',
    glowColor: 'shadow-gray-400/30',
    rarity: 'common',
    category: 'level',
    requirement: { type: 'level', target: 2 },
  },
  {
    id: 'level_3',
    icon: Trophy,
    nameKey: 'chatter.badges.level3.name',
    defaultName: 'Niveau Gold',
    descriptionKey: 'chatter.badges.level3.desc',
    defaultDescription: 'Atteint le niveau 3',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    glowColor: 'shadow-yellow-500/30',
    rarity: 'uncommon',
    category: 'level',
    requirement: { type: 'level', target: 3 },
  },
  {
    id: 'level_4',
    icon: Trophy,
    nameKey: 'chatter.badges.level4.name',
    defaultName: 'Niveau Platinum',
    descriptionKey: 'chatter.badges.level4.desc',
    defaultDescription: 'Atteint le niveau 4',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    glowColor: 'shadow-cyan-500/30',
    rarity: 'rare',
    category: 'level',
    requirement: { type: 'level', target: 4 },
  },
  {
    id: 'level_5',
    icon: Crown,
    nameKey: 'chatter.badges.level5.name',
    defaultName: 'Niveau Diamond',
    descriptionKey: 'chatter.badges.level5.desc',
    defaultDescription: 'Atteint le niveau 5 - Elite',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30',
    glowColor: 'shadow-purple-500/40',
    rarity: 'legendary',
    category: 'level',
    requirement: { type: 'level', target: 5 },
  },
  // Competition badges
  {
    id: 'top3_monthly',
    icon: Medal,
    nameKey: 'chatter.badges.top3.name',
    defaultName: 'Top 3 Mensuel',
    descriptionKey: 'chatter.badges.top3.desc',
    defaultDescription: 'Atteint le top 3 du classement mensuel',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    glowColor: 'shadow-amber-500/30',
    rarity: 'epic',
    category: 'competition',
    requirement: { type: 'rank', target: 3 },
  },
  {
    id: 'top1_monthly',
    icon: Crown,
    nameKey: 'chatter.badges.top1.name',
    defaultName: 'Champion Mensuel',
    descriptionKey: 'chatter.badges.top1.desc',
    defaultDescription: 'Numero 1 du classement mensuel',
    color: 'text-yellow-500 dark:text-yellow-400',
    bgColor: 'bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30',
    glowColor: 'shadow-yellow-500/40',
    rarity: 'legendary',
    category: 'competition',
    requirement: { type: 'rank', target: 1 },
  },
  // Client milestones
  {
    id: 'clients_10',
    icon: Target,
    nameKey: 'chatter.badges.clients10.name',
    defaultName: 'Convertisseur',
    descriptionKey: 'chatter.badges.clients10.desc',
    defaultDescription: '10 clients convertis',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    glowColor: 'shadow-green-500/30',
    rarity: 'uncommon',
    category: 'milestone',
    requirement: { type: 'clients', target: 10 },
  },
  {
    id: 'clients_50',
    icon: Target,
    nameKey: 'chatter.badges.clients50.name',
    defaultName: 'Expert Conversion',
    descriptionKey: 'chatter.badges.clients50.desc',
    defaultDescription: '50 clients convertis',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    glowColor: 'shadow-emerald-500/30',
    rarity: 'rare',
    category: 'milestone',
    requirement: { type: 'clients', target: 50 },
  },
  {
    id: 'clients_100',
    icon: Rocket,
    nameKey: 'chatter.badges.clients100.name',
    defaultName: 'Machine a Clients',
    descriptionKey: 'chatter.badges.clients100.desc',
    defaultDescription: '100 clients convertis',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    glowColor: 'shadow-teal-500/30',
    rarity: 'epic',
    category: 'milestone',
    requirement: { type: 'clients', target: 100 },
  },
  // Recruitment milestones
  {
    id: 'recruits_5',
    icon: Users,
    nameKey: 'chatter.badges.recruits5.name',
    defaultName: 'Leader Emergent',
    descriptionKey: 'chatter.badges.recruits5.desc',
    defaultDescription: '5 membres recrutes',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    glowColor: 'shadow-purple-500/30',
    rarity: 'uncommon',
    category: 'milestone',
    requirement: { type: 'recruits', target: 5 },
  },
  {
    id: 'recruits_10',
    icon: Users,
    nameKey: 'chatter.badges.recruits10.name',
    defaultName: 'Chef d\'Equipe',
    descriptionKey: 'chatter.badges.recruits10.desc',
    defaultDescription: '10 membres recrutes',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    glowColor: 'shadow-violet-500/30',
    rarity: 'rare',
    category: 'milestone',
    requirement: { type: 'recruits', target: 10 },
  },
  // Earnings milestones
  {
    id: 'earned_100',
    icon: DollarSign,
    nameKey: 'chatter.badges.earned100.name',
    defaultName: 'Premiere Centaine',
    descriptionKey: 'chatter.badges.earned100.desc',
    defaultDescription: '100$ gagnes',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    glowColor: 'shadow-green-500/30',
    rarity: 'common',
    category: 'milestone',
    requirement: { type: 'earnings', target: 10000 }, // In cents
  },
  {
    id: 'earned_500',
    icon: DollarSign,
    nameKey: 'chatter.badges.earned500.name',
    defaultName: 'High Earner',
    descriptionKey: 'chatter.badges.earned500.desc',
    defaultDescription: '500$ gagnes',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    glowColor: 'shadow-emerald-500/30',
    rarity: 'rare',
    category: 'milestone',
    requirement: { type: 'earnings', target: 50000 },
  },
  {
    id: 'earned_1000',
    icon: TrendingUp,
    nameKey: 'chatter.badges.earned1000.name',
    defaultName: 'Millionnaire',
    descriptionKey: 'chatter.badges.earned1000.desc',
    defaultDescription: '1000$+ gagnes',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-gradient-to-br from-yellow-100 to-green-100 dark:from-yellow-900/30 dark:to-green-900/30',
    glowColor: 'shadow-yellow-500/40',
    rarity: 'epic',
    category: 'milestone',
    requirement: { type: 'earnings', target: 100000 },
  },
  // Activity badges
  {
    id: 'zoom_participant',
    icon: Video,
    nameKey: 'chatter.badges.zoomParticipant.name',
    defaultName: 'Participant Zoom',
    descriptionKey: 'chatter.badges.zoomParticipant.desc',
    defaultDescription: 'Premiere participation a un meeting Zoom',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    glowColor: 'shadow-blue-500/30',
    rarity: 'common',
    category: 'activity',
  },
  {
    id: 'zoom_regular',
    icon: Video,
    nameKey: 'chatter.badges.zoomRegular.name',
    defaultName: 'Assidu Zoom',
    descriptionKey: 'chatter.badges.zoomRegular.desc',
    defaultDescription: '5+ participations aux meetings Zoom',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    glowColor: 'shadow-indigo-500/30',
    rarity: 'uncommon',
    category: 'activity',
  },
];

// Rarity colors and labels
const RARITY_CONFIG = {
  common: {
    border: 'border-gray-300 dark:border-gray-600',
    label: 'Commun',
    labelColor: 'text-gray-500',
  },
  uncommon: {
    border: 'border-green-400 dark:border-green-600',
    label: 'Peu commun',
    labelColor: 'text-green-600 dark:text-green-400',
  },
  rare: {
    border: 'border-blue-400 dark:border-blue-600',
    label: 'Rare',
    labelColor: 'text-blue-600 dark:text-blue-400',
  },
  epic: {
    border: 'border-purple-400 dark:border-purple-600',
    label: 'Epique',
    labelColor: 'text-purple-600 dark:text-purple-400',
  },
  legendary: {
    border: 'border-yellow-400 dark:border-yellow-500',
    label: 'Legendaire',
    labelColor: 'text-yellow-600 dark:text-yellow-400',
  },
};

interface AchievementBadgesCardProps {
  /** Earned badge IDs from chatter data */
  earnedBadges: ChatterBadgeType[];
  /** Chatter data for progress calculation */
  chatter?: Partial<Pick<ChatterData, 'totalClients' | 'totalRecruits' | 'currentStreak' | 'bestStreak' | 'totalEarned' | 'level' | 'bestRank' | 'zoomMeetingsAttended'>>;
  /** Loading state */
  loading?: boolean;
  /** Animation delay for staggered entrance (in ms) */
  animationDelay?: number;
  /** Callback when a badge is clicked */
  onBadgeClick?: (badge: BadgeConfig) => void;
  /** Show all badges or just a summary */
  variant?: 'full' | 'compact';
}

const AchievementBadgesCard = memo(function AchievementBadgesCard({
  earnedBadges,
  chatter,
  loading = false,
  animationDelay = 0,
  onBadgeClick,
  variant = 'full',
}: AchievementBadgesCardProps) {
  const intl = useIntl();
  const [selectedBadge, setSelectedBadge] = useState<BadgeConfig | null>(null);
  const [showAllBadges, setShowAllBadges] = useState(false);

  // Calculate badge progress for each badge
  const getBadgeProgress = (badge: BadgeConfig): number => {
    if (!badge.requirement || !chatter) return 0;

    switch (badge.requirement.type) {
      case 'clients':
        return Math.min(100, ((chatter.totalClients || 0) / badge.requirement.target) * 100);
      case 'recruits':
        return Math.min(100, ((chatter.totalRecruits || 0) / badge.requirement.target) * 100);
      case 'streak':
        return Math.min(100, (Math.max(chatter.currentStreak || 0, chatter.bestStreak || 0) / badge.requirement.target) * 100);
      case 'earnings':
        return Math.min(100, ((chatter.totalEarned || 0) / badge.requirement.target) * 100);
      case 'level':
        return Math.min(100, ((chatter.level || 1) / badge.requirement.target) * 100);
      case 'rank':
        if (!chatter.bestRank) return 0;
        return chatter.bestRank <= badge.requirement.target ? 100 : 0;
      default:
        return 0;
    }
  };

  // Check if badge is earned
  const isBadgeEarned = (badgeId: ChatterBadgeType): boolean => {
    return earnedBadges.includes(badgeId);
  };

  // Calculate stats
  const stats = useMemo((): {
    totalBadges: number;
    earnedCount: number;
    nextBadge: BadgeConfig | null;
    nextBadgeProgress: number;
    recentBadge: BadgeConfig | undefined;
  } => {
    const totalBadges = BADGE_CONFIG.length;
    const earnedCount = earnedBadges.length;

    // Find next badge to earn (highest progress that's not yet earned)
    let nextBadge: BadgeConfig | null = null;
    let nextBadgeProgress = 0;

    BADGE_CONFIG.forEach(badge => {
      if (!isBadgeEarned(badge.id)) {
        const progress = getBadgeProgress(badge);
        if (progress > nextBadgeProgress && progress < 100) {
          nextBadge = badge;
          nextBadgeProgress = progress;
        }
      }
    });

    // Find most recently earned badge (last in earned array)
    const recentBadgeId = earnedBadges[earnedBadges.length - 1];
    const recentBadge = BADGE_CONFIG.find(b => b.id === recentBadgeId);

    return {
      totalBadges,
      earnedCount,
      nextBadge,
      nextBadgeProgress,
      recentBadge,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earnedBadges, chatter]);

  // Handle badge click
  const handleBadgeClick = (badge: BadgeConfig) => {
    setSelectedBadge(badge);
    onBadgeClick?.(badge);
  };

  // Close badge detail modal
  const closeBadgeDetail = () => {
    setSelectedBadge(null);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl ${UI.skeleton}`} />
          <div className="flex-1">
            <div className={`h-5 w-32 mb-2 ${UI.skeleton}`} />
            <div className={`h-4 w-24 ${UI.skeleton}`} />
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`aspect-square rounded-xl ${UI.skeleton}`} />
          ))}
        </div>
      </div>
    );
  }

  // Display badges (limited in compact mode)
  const displayBadges = variant === 'compact' && !showAllBadges
    ? BADGE_CONFIG.slice(0, 6)
    : BADGE_CONFIG;

  return (
    <>
      <div
        className={`${UI.card} ${UI.cardHover} p-4 sm:p-6 opacity-0 animate-fade-in-up`}
        style={{
          animationDelay: `${animationDelay}ms`,
          animationFillMode: 'forwards',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                <FormattedMessage
                  id="chatter.badges.title"
                  defaultMessage="Badges"
                />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="chatter.badges.progress"
                  defaultMessage="{earned}/{total} debloques"
                  values={{ earned: stats.earnedCount, total: stats.totalBadges }}
                />
              </p>
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-gray-200 dark:text-white/10"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${(stats.earnedCount / stats.totalBadges) * 125.6} 125.6`}
                className="text-amber-500 transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {Math.round((stats.earnedCount / stats.totalBadges) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Recent Badge Highlight */}
        {stats.recentBadge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800/30"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-xl ${stats.recentBadge.bgColor} flex items-center justify-center shadow-lg ${stats.recentBadge.glowColor}`}>
                  <stats.recentBadge.icon className={`w-6 h-6 ${stats.recentBadge.color}`} />
                </div>
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-500 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <FormattedMessage id="chatter.badges.recent" defaultMessage="Dernier badge obtenu" />
                </p>
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {intl.formatMessage({ id: stats.recentBadge.nameKey, defaultMessage: stats.recentBadge.defaultName })}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Next Badge to Earn */}
        {stats.nextBadge && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="relative opacity-50">
                <div className={`w-10 h-10 rounded-xl ${stats.nextBadge.bgColor} flex items-center justify-center`}>
                  <stats.nextBadge.icon className={`w-5 h-5 ${stats.nextBadge.color}`} />
                </div>
                <Lock className="absolute -bottom-1 -right-1 w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.badges.next" defaultMessage="Prochain badge" />
                </p>
                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                  {intl.formatMessage({ id: stats.nextBadge.nameKey, defaultMessage: stats.nextBadge.defaultName })}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.nextBadgeProgress}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {Math.round(stats.nextBadgeProgress)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Badge Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3">
          {displayBadges.map((badge, index) => {
            const isEarned = isBadgeEarned(badge.id);
            const progress = getBadgeProgress(badge);
            const BadgeIcon = badge.icon;

            return (
              <motion.button
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleBadgeClick(badge)}
                className={`
                  relative aspect-square rounded-xl p-2 sm:p-3
                  flex flex-col items-center justify-center
                  transition-all duration-300
                  ${isEarned
                    ? `${badge.bgColor} shadow-lg ${badge.glowColor} hover:scale-110`
                    : 'bg-gray-100 dark:bg-white/5 opacity-50 hover:opacity-70 hover:scale-105'
                  }
                  group
                `}
                title={intl.formatMessage({ id: badge.nameKey, defaultMessage: badge.defaultName })}
              >
                {/* Badge Icon */}
                <BadgeIcon
                  className={`w-5 h-5 sm:w-6 sm:h-6 ${isEarned ? badge.color : 'text-gray-400 dark:text-gray-600'}`}
                />

                {/* Lock overlay for unearned */}
                {!isEarned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-gray-400 dark:text-gray-600 opacity-50" />
                  </div>
                )}

                {/* Progress indicator for partially completed */}
                {!isEarned && progress > 0 && progress < 100 && (
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Shine effect for earned badges */}
                {isEarned && (
                  <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                )}

                {/* Rarity indicator dot */}
                <div
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    badge.rarity === 'legendary' ? 'bg-yellow-400' :
                    badge.rarity === 'epic' ? 'bg-purple-400' :
                    badge.rarity === 'rare' ? 'bg-blue-400' :
                    badge.rarity === 'uncommon' ? 'bg-green-400' :
                    'bg-gray-400'
                  } ${isEarned ? 'opacity-100' : 'opacity-30'}`}
                />
              </motion.button>
            );
          })}
        </div>

        {/* Show more button (compact mode) */}
        {variant === 'compact' && BADGE_CONFIG.length > 6 && (
          <button
            onClick={() => setShowAllBadges(!showAllBadges)}
            className="w-full mt-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-1"
          >
            {showAllBadges ? (
              <FormattedMessage id="chatter.badges.showLess" defaultMessage="Voir moins" />
            ) : (
              <>
                <FormattedMessage
                  id="chatter.badges.showAll"
                  defaultMessage="Voir tous les badges ({count})"
                  values={{ count: BADGE_CONFIG.length }}
                />
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={closeBadgeDetail}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={closeBadgeDetail}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Badge display */}
              <div className="text-center">
                <div className={`
                  relative inline-flex w-20 h-20 rounded-2xl items-center justify-center mx-auto mb-4
                  ${isBadgeEarned(selectedBadge.id)
                    ? `${selectedBadge.bgColor} shadow-xl ${selectedBadge.glowColor}`
                    : 'bg-gray-100 dark:bg-white/5'
                  }
                `}>
                  <selectedBadge.icon
                    className={`w-10 h-10 ${isBadgeEarned(selectedBadge.id) ? selectedBadge.color : 'text-gray-400'}`}
                  />
                  {!isBadgeEarned(selectedBadge.id) && (
                    <Lock className="absolute bottom-2 right-2 w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Badge name */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {intl.formatMessage({ id: selectedBadge.nameKey, defaultMessage: selectedBadge.defaultName })}
                </h3>

                {/* Rarity */}
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${RARITY_CONFIG[selectedBadge.rarity].labelColor} bg-current/10 mb-3`}>
                  {RARITY_CONFIG[selectedBadge.rarity].label}
                </span>

                {/* Description */}
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {intl.formatMessage({ id: selectedBadge.descriptionKey, defaultMessage: selectedBadge.defaultDescription })}
                </p>

                {/* Progress / Status */}
                {isBadgeEarned(selectedBadge.id) ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-medium">
                      <FormattedMessage id="chatter.badges.earned" defaultMessage="Badge obtenu !" />
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        <FormattedMessage id="chatter.badges.progressLabel" defaultMessage="Progression" />
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {Math.round(getBadgeProgress(selectedBadge))}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                        style={{ width: `${getBadgeProgress(selectedBadge)}%` }}
                      />
                    </div>
                    {selectedBadge.requirement && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        <FormattedMessage
                          id={`chatter.badges.requirement.${selectedBadge.requirement.type}`}
                          defaultMessage="Objectif: {target}"
                          values={{ target: selectedBadge.requirement.target }}
                        />
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default AchievementBadgesCard;
