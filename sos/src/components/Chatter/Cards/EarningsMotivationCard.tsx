/**
 * EarningsMotivationCard - Carte de motivation affichant les gains cumulés
 *
 * Affiche de manière motivante :
 * - Gains du mois en cours
 * - Gains totaux depuis l'inscription
 * - Objectifs et progression
 * - Messages de motivation personnalisés
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  TrendingUp,
  Trophy,
  Target,
  Flame,
  Star,
  Sparkles,
  ChevronRight,
  Calendar,
  Award,
  Zap,
} from 'lucide-react';
import { formatCurrencyLocale } from './currencyUtils';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
} as const;

// Milestones for motivation
const EARNING_MILESTONES = [
  { amount: 5000, label: '50$', emoji: '🎯' },
  { amount: 10000, label: '100$', emoji: '💪' },
  { amount: 25000, label: '250$', emoji: '🔥' },
  { amount: 50000, label: '500$', emoji: '⭐' },
  { amount: 100000, label: '1000$', emoji: '🏆' },
  { amount: 250000, label: '2500$', emoji: '💎' },
  { amount: 500000, label: '5000$', emoji: '👑' },
  { amount: 1000000, label: '10000$', emoji: '🚀' },
];

// Monthly goals
const MONTHLY_GOALS = [
  { amount: 2000, label: '20$' },
  { amount: 5000, label: '50$' },
  { amount: 10000, label: '100$' },
  { amount: 20000, label: '200$' },
  { amount: 50000, label: '500$' },
];

interface EarningsMotivationCardProps {
  // Earnings data
  totalEarned: number;           // Total depuis inscription (en cents)
  monthlyEarnings: number;       // Gains du mois en cours (en cents)
  lastMonthEarnings?: number;    // Gains du mois dernier (en cents)

  // Activity data
  currentStreak?: number;        // Série actuelle en jours
  totalClients?: number;         // Total clients référés
  totalRecruits?: number;        // Total filleuls recrutés
  memberSince?: Date | string;   // Date d'inscription

  // Rank data
  monthlyRank?: number | null;   // Rang du mois
  totalChatters?: number;        // Nombre total de chatteurs

  // Handlers
  onViewLeaderboard?: () => void;
  onShareSuccess?: () => void;

  // State
  loading?: boolean;
  animationDelay?: number;
}

const EarningsMotivationCard = memo(function EarningsMotivationCard({
  totalEarned,
  monthlyEarnings,
  lastMonthEarnings = 0,
  currentStreak = 0,
  totalClients = 0,
  totalRecruits = 0,
  memberSince,
  monthlyRank,
  totalChatters,
  onViewLeaderboard,
  loading = false,
  animationDelay = 0,
}: EarningsMotivationCardProps) {
  const intl = useIntl();

  // Calculate membership duration
  const membershipDays = useMemo(() => {
    if (!memberSince) return 0;
    const start = typeof memberSince === 'string' ? new Date(memberSince) : memberSince;
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [memberSince]);

  // Get next milestone
  const nextMilestone = useMemo(() => {
    return EARNING_MILESTONES.find(m => m.amount > totalEarned) || EARNING_MILESTONES[EARNING_MILESTONES.length - 1];
  }, [totalEarned]);

  // Get current milestone achieved
  const currentMilestone = useMemo(() => {
    const achieved = EARNING_MILESTONES.filter(m => m.amount <= totalEarned);
    return achieved[achieved.length - 1];
  }, [totalEarned]);

  // Progress to next milestone
  const milestoneProgress = useMemo(() => {
    const previousAmount = currentMilestone?.amount || 0;
    const targetAmount = nextMilestone.amount;
    const progress = ((totalEarned - previousAmount) / (targetAmount - previousAmount)) * 100;
    return Math.min(100, Math.max(0, progress));
  }, [totalEarned, currentMilestone, nextMilestone]);

  // Monthly goal (auto-adjusted based on performance)
  const monthlyGoal = useMemo(() => {
    // Find appropriate goal based on past performance
    const avgMonthly = membershipDays > 30 ? (totalEarned / (membershipDays / 30)) : monthlyEarnings * 2;
    return MONTHLY_GOALS.find(g => g.amount > avgMonthly) || MONTHLY_GOALS[MONTHLY_GOALS.length - 1];
  }, [totalEarned, membershipDays, monthlyEarnings]);

  // Monthly progress
  const monthlyProgress = useMemo(() => {
    return Math.min(100, (monthlyEarnings / monthlyGoal.amount) * 100);
  }, [monthlyEarnings, monthlyGoal]);

  // Month-over-month growth
  const monthlyGrowth = useMemo(() => {
    if (lastMonthEarnings === 0) return null;
    return Math.round(((monthlyEarnings - lastMonthEarnings) / lastMonthEarnings) * 100);
  }, [monthlyEarnings, lastMonthEarnings]);

  // Daily average this month
  const dailyAverage = useMemo(() => {
    const dayOfMonth = new Date().getDate();
    return Math.round(monthlyEarnings / dayOfMonth);
  }, [monthlyEarnings]);

  // Motivational message based on performance
  const motivationMessage = useMemo(() => {
    if (currentStreak >= 30) return { key: 'motivation.legendary', emoji: '🔥' };
    if (currentStreak >= 14) return { key: 'motivation.onFire', emoji: '💪' };
    if (currentStreak >= 7) return { key: 'motivation.streak', emoji: '⭐' };
    if (monthlyGrowth && monthlyGrowth > 50) return { key: 'motivation.growth', emoji: '📈' };
    if (monthlyRank && monthlyRank <= 3) return { key: 'motivation.top3', emoji: '🏆' };
    if (monthlyRank && monthlyRank <= 10) return { key: 'motivation.top10', emoji: '🎯' };
    if (totalClients >= 10) return { key: 'motivation.clients', emoji: '👏' };
    if (totalRecruits >= 5) return { key: 'motivation.recruiter', emoji: '🌟' };
    if (monthlyEarnings > 0) return { key: 'motivation.active', emoji: '💰' };
    return { key: 'motivation.start', emoji: '🚀' };
  }, [currentStreak, monthlyGrowth, monthlyRank, totalClients, totalRecruits, monthlyEarnings]);

  // Format currency
  const formatAmount = (cents: number) => formatCurrencyLocale(cents, intl.locale);

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl ${UI.skeleton}`} />
          <div className="flex-1">
            <div className={`h-5 w-32 mb-2 ${UI.skeleton}`} />
            <div className={`h-4 w-24 ${UI.skeleton}`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={`h-24 ${UI.skeleton} rounded-xl`} />
          <div className={`h-24 ${UI.skeleton} rounded-xl`} />
        </div>
        <div className={`h-20 ${UI.skeleton} rounded-xl`} />
      </div>
    );
  }

  return (
    <div
      className={`${UI.card} ${UI.cardHover} p-4 sm:p-6 opacity-0 animate-fade-in-up`}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'forwards',
      }}
    >
      {/* Header avec message motivant */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="chatter.motivation.title" defaultMessage="Mes Gains" />
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>{motivationMessage.emoji}</span>
              <FormattedMessage
                id={motivationMessage.key}
                defaultMessage="Continue comme ça !"
              />
            </p>
          </div>
        </div>

        {/* Streak badge */}
        {currentStreak >= 3 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
              {currentStreak}j
            </span>
          </div>
        )}
      </div>

      {/* Main earnings grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
        {/* Gains du mois */}
        <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              <FormattedMessage id="chatter.motivation.thisMonth" defaultMessage="Ce mois" />
            </span>
          </div>
          <AnimatedNumber
            value={monthlyEarnings}
            isCurrency
            currencyCode="USD"
            duration={1200}
            delay={animationDelay + 100}
            animateOnVisible
            className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white"
          />
          {/* Monthly growth indicator */}
          {monthlyGrowth !== null && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
              monthlyGrowth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
            }`}>
              {monthlyGrowth >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3 rotate-180" />
              )}
              <span>{monthlyGrowth >= 0 ? '+' : ''}{monthlyGrowth}%</span>
              <span className="text-gray-400">vs mois dernier</span>
            </div>
          )}
          {/* Daily average */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ~{formatAmount(dailyAverage)}/jour
          </p>
        </div>

        {/* Gains totaux */}
        <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-100 dark:border-green-800/30">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              <FormattedMessage id="chatter.motivation.total" defaultMessage="Total gagne" />
            </span>
          </div>
          <AnimatedNumber
            value={totalEarned}
            isCurrency
            currencyCode="USD"
            duration={1500}
            delay={animationDelay + 200}
            animateOnVisible
            className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white"
          />
          {/* Current milestone */}
          {currentMilestone && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm">{currentMilestone.emoji}</span>
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                {currentMilestone.label} atteint !
              </span>
            </div>
          )}
          {/* Member since */}
          {membershipDays > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Depuis {membershipDays} jours
            </p>
          )}
        </div>
      </div>

      {/* Progress to next milestone */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl border border-red-100 dark:border-red-800/30 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              <FormattedMessage id="chatter.motivation.nextMilestone" defaultMessage="Prochain objectif" />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg">{nextMilestone.emoji}</span>
            <span className="font-bold text-red-600 dark:text-red-400">
              {nextMilestone.label}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden mb-2">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-full transition-all duration-1000"
            style={{ width: `${milestoneProgress}%` }}
          />
          {/* Animated shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">
            {formatAmount(totalEarned)}
          </span>
          <span className="font-medium text-red-600 dark:text-red-400">
            {Math.round(milestoneProgress)}%
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {formatAmount(nextMilestone.amount)}
          </span>
        </div>

        {/* Remaining amount */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
          <FormattedMessage
            id="chatter.motivation.remaining"
            defaultMessage="Plus que {amount} pour debloquer !"
            values={{ amount: formatAmount(nextMilestone.amount - totalEarned) }}
          />
        </p>
      </div>

      {/* Monthly goal progress */}
      <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            <FormattedMessage id="chatter.motivation.monthlyGoal" defaultMessage="Objectif mensuel" />
          </span>
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {formatAmount(monthlyEarnings)} / {monthlyGoal.label}
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              monthlyProgress >= 100
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-blue-400 to-indigo-500'
            }`}
            style={{ width: `${monthlyProgress}%` }}
          />
        </div>
        {monthlyProgress >= 100 && (
          <p className="text-xs text-center text-green-600 dark:text-green-400 mt-2 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" />
            <FormattedMessage id="chatter.motivation.goalReached" defaultMessage="Objectif atteint ! Bravo !" />
          </p>
        )}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{totalClients}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.motivation.clients" defaultMessage="Clients" />
          </p>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-lg">
          <p className="text-lg font-bold text-gray-900 dark:text-white">{totalRecruits}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.motivation.recruits" defaultMessage="Filleuls" />
          </p>
        </div>
        <div
          className={`p-2 rounded-lg cursor-pointer transition-colors ${
            monthlyRank && monthlyRank <= 10
              ? 'bg-yellow-50 dark:bg-yellow-900/20'
              : 'bg-gray-50 dark:bg-white/5'
          }`}
          onClick={onViewLeaderboard}
        >
          <p className={`text-lg font-bold ${
            monthlyRank && monthlyRank <= 3
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-gray-900 dark:text-white'
          }`}>
            {monthlyRank ? `#${monthlyRank}` : '-'}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.motivation.rank" defaultMessage="Classement" />
          </p>
        </div>
      </div>

      {/* CTA if rank is good */}
      {monthlyRank && monthlyRank <= 10 && onViewLeaderboard && (
        <button
          onClick={onViewLeaderboard}
          className="mt-4 w-full py-2 px-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Award className="w-4 h-4" />
          <FormattedMessage
            id="chatter.motivation.viewLeaderboard"
            defaultMessage="Tu es dans le Top 10 !"
          />
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

export default EarningsMotivationCard;
