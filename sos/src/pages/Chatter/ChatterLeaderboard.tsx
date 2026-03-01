/**
 * ChatterLeaderboard - Monthly leaderboard for chatters
 * Shows top performers with country flags, earnings, and conversions
 *
 * Features:
 * - Top 3 podium with cash bonus prizes ($200/$100/$50)
 * - Ranking based on monthly earnings (commissions)
 * - Monthly countdown timer
 * - Motivational messages for climbing ranks
 * - $200 minimum eligibility requirement
 */

import React, { useState, useEffect, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { useApp } from '@/contexts/AppContext';
import { functionsAffiliate } from '@/config/firebase';
import { useChatter } from '@/hooks/useChatter';
import { ChatterDashboardLayout } from '@/components/Chatter/Layout';
import {
  Trophy,
  Medal,
  Crown,
  Star,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  Calendar,
  Target,
  Sparkles,
  Info,
} from 'lucide-react';
import type { ChatterLeaderboardEntry, ChatterLevel } from '@/types/chatter';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

// Level colors and names
const LEVEL_CONFIG: Record<ChatterLevel, { name: string; color: string; gradient: string }> = {
  1: { name: 'Bronze', color: 'text-red-700', gradient: 'from-amber-600 to-amber-800' },
  2: { name: 'Silver', color: 'text-gray-600 dark:text-gray-400', gradient: 'from-gray-300 to-gray-500' },
  3: { name: 'Gold', color: 'text-yellow-500', gradient: 'from-yellow-400 to-yellow-600' },
  4: { name: 'Platinum', color: 'text-cyan-400', gradient: 'from-cyan-300 to-cyan-500' },
  5: { name: 'Diamond', color: 'text-red-400', gradient: 'from-red-400 to-pink-500' },
};

// Top 3 podium styles — cash bonus prizes only (no multipliers)
const PODIUM_STYLES = {
  1: {
    icon: Crown,
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    ring: 'ring-4 ring-yellow-400/50',
    size: 'w-20 h-20 sm:w-24 sm:h-24',
    badge: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
    prize: '$200',
    emoji: '🥇',
    glowColor: 'shadow-yellow-400/50',
  },
  2: {
    icon: Medal,
    gradient: 'from-gray-300 via-gray-400 to-gray-500',
    ring: 'ring-4 ring-gray-400/50',
    size: 'w-16 h-16 sm:w-20 sm:h-20',
    badge: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800',
    prize: '$100',
    emoji: '🥈',
    glowColor: 'shadow-gray-400/50',
  },
  3: {
    icon: Medal,
    gradient: 'from-amber-600 via-orange-600 to-amber-700',
    ring: 'ring-4 ring-amber-600/50',
    size: 'w-16 h-16 sm:w-20 sm:h-20',
    badge: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white',
    prize: '$50',
    emoji: '🥉',
    glowColor: 'shadow-orange-400/50',
  },
};

interface LeaderboardResponse {
  rankings: ChatterLeaderboardEntry[];
  month: string;
  totalParticipants: number;
  myRank: number | null;
}

const ChatterLeaderboard: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const { dashboardData, isLoading: chatterLoading } = useChatter();

  // State
  const [rankings, setRankings] = useState<ChatterLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);

  // Calculate days remaining in month
  const daysRemaining = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.getDate() - now.getDate();
  }, []);

  // Check if viewing current month
  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === currentMonthStr;
  }, [selectedMonth]);

  // Available months (last 6 months)
  const availableMonths = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  }, []);

  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString(intl.locale, { month: 'long', year: 'numeric' });
  };

  // Fetch leaderboard
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const getLeaderboard = httpsCallable<{ month: string }, LeaderboardResponse>(
          functionsAffiliate,
          'getChatterLeaderboard'
        );

        const result = await getLeaderboard({ month: selectedMonth });
        setRankings(result.data.rankings);
        setTotalParticipants(result.data.totalParticipants);
        setMyRank(result.data.myRank);
      } catch (err: any) {
        console.error('Error fetching leaderboard:', err);
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedMonth]);

  // Navigation handlers
  const handlePreviousMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1]);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  // Format amount in USD (primary display)
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  // Get country flag emoji
  const getFlagEmoji = (countryCode: string): string => {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  // Top 3 entries
  const top3 = rankings.slice(0, 3);
  const restOfRankings = rankings.slice(3);

  // Current user's entry
  const currentUserEntry = dashboardData?.chatter
    ? rankings.find(r => r.chatterId === dashboardData.chatter.id)
    : null;

  // Calculate earnings gap to reach Top 3
  const earningsGapForTop3 = useMemo(() => {
    if (!myRank || myRank <= 3 || !currentUserEntry || top3.length < 3) return null;
    const thirdPlaceEarnings = top3[2]?.monthlyEarnings ?? 0;
    const myEarnings = currentUserEntry?.monthlyEarnings ?? 0;
    const gap = thirdPlaceEarnings - myEarnings;
    return gap > 0 ? gap : null;
  }, [myRank, currentUserEntry, top3]);

  if (chatterLoading) {
    return (
      <ChatterDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
        </div>
      </ChatterDashboardLayout>
    );
  }

  return (
    <ChatterDashboardLayout activeKey="leaderboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl dark:text-white sm:text-3xl font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-red-500" />
              <FormattedMessage id="chatter.leaderboard.title" defaultMessage="Classement" />
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="chatter.leaderboard.subtitle"
                defaultMessage="Top performers du mois de {month}"
                values={{ month: formatMonth(selectedMonth) }}
              />
            </p>
          </div>

          {/* Month Navigation & Time Remaining */}
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                disabled={availableMonths.indexOf(selectedMonth) === availableMonths.length - 1}
                className={`${UI.button.secondary} p-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm dark:text-white font-medium min-w-[140px]">
                {formatMonth(selectedMonth)}
              </span>
              <button
                onClick={handleNextMonth}
                disabled={availableMonths.indexOf(selectedMonth) === 0}
                className={`${UI.button.secondary} p-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {/* Countdown Timer - only show for current month */}
            {isCurrentMonth && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-100 dark:from-orange-900/30 to-red-100 dark:to-red-900/30 rounded-full">
                <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm dark:text-orange-300 font-medium">
                  <FormattedMessage
                    id="chatter.leaderboard.daysRemaining"
                    defaultMessage="Fin du mois dans {days} jours"
                    values={{ days: daysRemaining }}
                  />
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Top 3 Bonus Banner */}
        <div className={`${UI.card} p-4 sm:p-6 bg-gradient-to-r from-yellow-50 dark:from-yellow-900/20 via-amber-50 dark:via-amber-900/20 to-orange-50 dark:to-orange-900/20 border-yellow-200/50 dark:border-yellow-500/20`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-400/20 rounded-xl">
              <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-lg dark:text-white font-bold">
              <FormattedMessage id="chatter.leaderboard.bonusTitle" defaultMessage="TOP 3 DU MOIS - Bonus cash" />
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/60 dark:bg-white/5 rounded-xl">
              <span className="text-2xl sm:text-3xl">🥇</span>
              <div className="flex-1 sm:flex-none">
                <p className="text-sm dark:text-gray-400 font-medium">1er</p>
                <p className="font-bold text-yellow-600 dark:text-yellow-400">$200</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/60 dark:bg-white/5 rounded-xl">
              <span className="text-2xl sm:text-3xl">🥈</span>
              <div className="flex-1 sm:flex-none">
                <p className="text-sm dark:text-gray-400 font-medium">2e</p>
                <p className="font-bold text-gray-600 dark:text-gray-300">$100</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/60 dark:bg-white/5 rounded-xl">
              <span className="text-2xl sm:text-3xl">🥉</span>
              <div className="flex-1 sm:flex-none">
                <p className="text-sm dark:text-gray-400 font-medium">3e</p>
                <p className="font-bold text-amber-600 dark:text-amber-400">$50</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <FormattedMessage
                id="chatter.leaderboard.resetInfo"
                defaultMessage="Le classement est remis à zéro chaque 1er du mois. Basé sur vos commissions du mois."
              />
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Info className="w-3 h-3" />
              <FormattedMessage
                id="chatter.leaderboard.eligibility"
                defaultMessage="Éligibilité : minimum $200 de commissions totales cumulées"
              />
            </p>
          </div>
        </div>

        {/* My Rank Card */}
        {myRank && currentUserEntry && (
          <div className={`${UI.card} p-4 sm:p-6 ${
            myRank <= 3
              ? 'bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-orange-500/10 border-yellow-500/30'
              : 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30'
          }`}>
            <div className="flex sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold ${
                  myRank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 ring-4 ring-yellow-400/30' :
                  myRank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 ring-4 ring-gray-400/30' :
                  myRank === 3 ? 'bg-gradient-to-br from-amber-600 to-orange-500 ring-4 ring-orange-400/30' :
                  'bg-gradient-to-br from-red-400 to-orange-500'
                }`}>
                  {myRank <= 3 ? (
                    <span className="text-2xl">{PODIUM_STYLES[myRank as 1 | 2 | 3].emoji}</span>
                  ) : (
                    `#${myRank}`
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      <FormattedMessage id="chatter.leaderboard.yourRank" defaultMessage="Votre classement" />
                    </p>
                    {myRank <= 3 && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-yellow-400 rounded-full">
                        TOP 3
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="chatter.leaderboard.outOf"
                      defaultMessage="sur {total} chatters"
                      values={{ total: totalParticipants }}
                    />
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-semibold text-green-600 dark:text-green-400">
                  {formatAmount(currentUserEntry.monthlyEarnings)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="chatter.leaderboard.conversions"
                    defaultMessage="{clients} clients, {recruits} recrues"
                    values={{
                      clients: currentUserEntry.monthlyClients,
                      recruits: currentUserEntry.monthlyRecruits,
                    }}
                  />
                </p>
              </div>
            </div>

            {/* Motivational message for non-Top 3 */}
            {myRank > 3 && earningsGapForTop3 !== null && isCurrentMonth && (
              <div className="mt-4 pt-4 border-t dark:border-red-500/20">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-100 dark:from-orange-900/30 to-red-100 dark:to-red-900/30 rounded-xl">
                  <Target className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800 dark:text-orange-200 font-medium">
                      <FormattedMessage
                        id="chatter.leaderboard.motivational"
                        defaultMessage="Vous êtes #{rank} — encore {amount} de commissions pour le Top 3 !"
                        values={{ rank: myRank, amount: formatAmount(earningsGapForTop3) }}
                      />
                    </p>
                    <p className="text-xs text-gray-600 dark:text-orange-400 mt-0.5">
                      <FormattedMessage
                        id="chatter.leaderboard.motivationalSub"
                        defaultMessage="Partagez votre lien et continuez à recruter pour monter !"
                      />
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Celebration for Top 3 */}
            {myRank <= 3 && isCurrentMonth && (
              <div className="mt-4 pt-4 border-t dark:border-yellow-500/20">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-100 dark:from-yellow-900/30 to-amber-100 dark:to-amber-900/30 rounded-xl">
                  <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800 dark:text-yellow-200 font-medium">
                      <FormattedMessage
                        id="chatter.leaderboard.top3congrats"
                        defaultMessage="Bravo ! Vous êtes dans le Top 3 ce mois-ci !"
                      />
                    </p>
                    <p className="text-xs text-gray-600 dark:text-yellow-400 mt-0.5">
                      <FormattedMessage
                        id="chatter.leaderboard.bonusEligible"
                        defaultMessage="Vous recevrez un bonus cash de {prize} à la fin du mois !"
                        values={{ prize: PODIUM_STYLES[myRank as 1 | 2 | 3].prize }}
                      />
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          </div>
        ) : error ? (
          <div className={`${UI.card} p-6`}>
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-6 h-6" />
              <span>{error}</span>
            </div>
          </div>
        ) : rankings.length === 0 ? (
          <div className={`${UI.card} p-12 text-center`}>
            <Trophy className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg dark:text-white font-semibold mb-2">
              <FormattedMessage id="chatter.leaderboard.empty.title" defaultMessage="Pas encore de classement" />
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="chatter.leaderboard.empty.desc"
                defaultMessage="Le classement sera disponible lorsque des chatters auront des commissions ce mois-ci."
              />
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {top3.length >= 3 && (
              <div className={`${UI.card} p-6 sm:p-8 overflow-hidden relative`}>
                {/* Background decorations */}
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-50/50 dark:from-yellow-900/10 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-b from-yellow-200/20 dark:from-yellow-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

                <div className="relative flex items-end justify-center gap-4 sm:gap-8">
                  {/* 2nd Place */}
                  {top3[1] && (
                    <div className="flex flex-col items-center order-1">
                      <div className="relative">
                        <div className={`${PODIUM_STYLES[2].size} rounded-full bg-gradient-to-br ${PODIUM_STYLES[2].gradient} ${PODIUM_STYLES[2].ring} flex items-center justify-center mb-3 shadow-lg ${PODIUM_STYLES[2].glowColor}`}>
                          {top3[1].photoUrl ? (
                            <img src={top3[1].photoUrl} alt={top3[1].chatterName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-2xl sm:text-3xl font-bold">
                              {top3[1].chatterName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="absolute -top-2 text-3xl">{PODIUM_STYLES[2].emoji}</span>
                      </div>
                      <span className={`${PODIUM_STYLES[2].badge} px-3 py-1 rounded-full text-sm font-bold mb-2 shadow-md`}>
                        #2
                      </span>
                      <p className="font-semibold text-gray-900 dark:text-white sm:text-base text-center">
                        {top3[1].chatterName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {getFlagEmoji(top3[1].country)}
                      </p>
                      <p className="font-bold text-green-600 dark:text-green-400 mt-1">
                        {formatAmount(top3[1].monthlyEarnings)}
                      </p>
                      {/* Cash prize badge */}
                      <div className="mt-2 px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold">{PODIUM_STYLES[2].prize}</span>
                      </div>
                      <div className="h-20 w-16 sm:w-20 bg-gradient-to-t from-gray-300 dark:from-gray-600 to-gray-200 dark:to-gray-500 rounded-t-lg mt-3 shadow-inner" />
                    </div>
                  )}

                  {/* 1st Place */}
                  {top3[0] && (
                    <div className="flex flex-col items-center order-2">
                      <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500 mb-2 animate-pulse drop-shadow-lg" />
                      <div className="relative">
                        <div className={`${PODIUM_STYLES[1].size} rounded-full bg-gradient-to-br ${PODIUM_STYLES[1].gradient} ${PODIUM_STYLES[1].ring} flex items-center justify-center mb-3 shadow-xl ${PODIUM_STYLES[1].glowColor} animate-pulse`} style={{ animationDuration: '3s' }}>
                          {top3[0].photoUrl ? (
                            <img src={top3[0].photoUrl} alt={top3[0].chatterName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-3xl sm:text-4xl font-bold">
                              {top3[0].chatterName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="absolute -top-2 text-3xl">{PODIUM_STYLES[1].emoji}</span>
                      </div>
                      <span className={`${PODIUM_STYLES[1].badge} px-4 py-1.5 rounded-full text-base font-bold mb-2 shadow-lg`}>
                        #1
                      </span>
                      <p className="font-bold text-gray-900 dark:text-white sm:text-lg text-center">
                        {top3[0].chatterName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {getFlagEmoji(top3[0].country)}
                      </p>
                      <p className="font-bold text-green-600 dark:text-green-400 mt-1">
                        {formatAmount(top3[0].monthlyEarnings)}
                      </p>
                      {/* Cash prize badge */}
                      <div className="mt-2 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full shadow-md">
                        <span className="text-sm font-bold">{PODIUM_STYLES[1].prize}</span>
                      </div>
                      <div className="h-28 w-16 sm:w-20 bg-gradient-to-t from-yellow-500 dark:from-yellow-600 to-amber-400 dark:to-amber-500 rounded-t-lg mt-3 shadow-lg" />
                    </div>
                  )}

                  {/* 3rd Place */}
                  {top3[2] && (
                    <div className="flex flex-col items-center order-3">
                      <div className="relative">
                        <div className={`${PODIUM_STYLES[3].size} rounded-full bg-gradient-to-br ${PODIUM_STYLES[3].gradient} ${PODIUM_STYLES[3].ring} flex items-center justify-center mb-3 shadow-lg ${PODIUM_STYLES[3].glowColor}`}>
                          {top3[2].photoUrl ? (
                            <img src={top3[2].photoUrl} alt={top3[2].chatterName} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <span className="text-2xl sm:text-3xl font-bold">
                              {top3[2].chatterName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="absolute -top-2 text-3xl">{PODIUM_STYLES[3].emoji}</span>
                      </div>
                      <span className={`${PODIUM_STYLES[3].badge} px-3 py-1 rounded-full text-sm font-bold mb-2 shadow-md`}>
                        #3
                      </span>
                      <p className="font-semibold text-gray-900 dark:text-white sm:text-base text-center">
                        {top3[2].chatterName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {getFlagEmoji(top3[2].country)}
                      </p>
                      <p className="font-bold text-green-600 dark:text-green-400 mt-1">
                        {formatAmount(top3[2].monthlyEarnings)}
                      </p>
                      {/* Cash prize badge */}
                      <div className="mt-2 px-2 py-1 bg-amber-200 dark:bg-amber-800 rounded-full">
                        <span className="text-xs text-amber-800 dark:text-amber-200 font-semibold">{PODIUM_STYLES[3].prize}</span>
                      </div>
                      <div className="h-14 w-16 sm:w-20 bg-gradient-to-t from-amber-600 dark:from-amber-700 to-orange-500 dark:to-orange-600 rounded-t-lg mt-3 shadow-md" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rest of Rankings Table */}
            {restOfRankings.length > 0 && (
              <div className={`${UI.card} overflow-hidden`}>
                <div className="px-6 py-4 border-b dark:border-white/10">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FormattedMessage id="chatter.leaderboard.otherRankings" defaultMessage="Autres classements" />
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({totalParticipants} <FormattedMessage id="chatter.leaderboard.participants" defaultMessage="participants" />)
                    </span>
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">
                          <FormattedMessage id="chatter.leaderboard.rank" defaultMessage="Rang" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">
                          Chatter
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase hidden sm:table-cell">
                          <FormattedMessage id="chatter.leaderboard.level" defaultMessage="Niveau" />
                        </th>
                        <th className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-medium uppercase hidden md:table-cell">
                          <FormattedMessage id="chatter.leaderboard.conversions" defaultMessage="Conv." />
                        </th>
                        <th className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">
                          <FormattedMessage id="chatter.leaderboard.earnings" defaultMessage="Gains" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-white/5">
                      {restOfRankings.map((entry) => {
                        const isCurrentUser = dashboardData?.chatter.id === entry.chatterId;
                        return (
                          <tr
                            key={entry.chatterId}
                            className={`hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                              isCurrentUser
                                ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 ring-2 ring-red-500/30 ring-inset'
                                : ''
                            }`}
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`font-bold ${isCurrentUser ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                #{entry.rank}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-bold ${
                                  isCurrentUser ? 'ring-2 ring-red-500' : ''
                                }`}>
                                  {entry.photoUrl ? (
                                    <img src={entry.photoUrl} alt={entry.chatterName} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    <span>{entry.chatterName.charAt(0)}</span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                    {entry.chatterName}
                                    {isCurrentUser && (
                                      <span className="text-xs text-white px-1.5 py-0.5 bg-red-500 rounded-full ml-1 font-bold">
                                        <FormattedMessage id="chatter.leaderboard.you" defaultMessage="Vous" />
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <span>{getFlagEmoji(entry.country)}</span>
                                    <span className="text-xs">{entry.chatterCode}</span>
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
                              <div className="flex items-center gap-1">
                                <Star className={`w-4 h-4 ${LEVEL_CONFIG[entry.level].color}`} />
                                <span className={`text-sm font-medium ${LEVEL_CONFIG[entry.level].color}`}>
                                  {LEVEL_CONFIG[entry.level].name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right hidden md:table-cell">
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {entry.monthlyClients} / {entry.monthlyRecruits}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <span className={`font-semibold ${isCurrentUser ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {formatAmount(entry.monthlyEarnings)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Info Cards - Cash bonus prizes for Top 3 */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className={`${UI.card} p-4 bg-gradient-to-br from-yellow-50 dark:from-yellow-900/10 to-amber-50 dark:to-amber-900/10`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl shadow-lg">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Top 1</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.leaderboard.bonus.top1" defaultMessage="1er place : $200 bonus cash" />
                </p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-4 bg-gradient-to-br from-gray-50 dark:from-gray-900/10 to-slate-50 dark:to-slate-900/10`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl shadow-lg">
                <Medal className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Top 2</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.leaderboard.bonus.top2" defaultMessage="2e place : $100 bonus cash" />
                </p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-4 bg-gradient-to-br from-amber-50 dark:from-amber-900/10 to-orange-50 dark:to-orange-900/10`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
                <Medal className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Top 3</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.leaderboard.bonus.top3" defaultMessage="3e place : $50 bonus cash" />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Reset Reminder */}
        {isCurrentMonth && (
          <div className={`${UI.card} p-4 bg-gradient-to-r from-gray-50 dark:from-gray-900/20 to-slate-50 dark:to-slate-900/20`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  <FormattedMessage id="chatter.leaderboard.monthlyReset" defaultMessage="Remise à zéro mensuelle" />
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="chatter.leaderboard.monthlyResetDesc"
                    defaultMessage="Le classement repart à zéro chaque 1er du mois. Tous les chatters ont leur chance de gagner les bonus !"
                  />
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ChatterDashboardLayout>
  );
};

export default ChatterLeaderboard;
