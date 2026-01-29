/**
 * ChatterLeaderboard - Monthly leaderboard for chatters
 * Shows top performers with country flags, earnings, and conversions
 */

import React, { useState, useEffect, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useApp } from '@/contexts/AppContext';
import { useChatter } from '@/hooks/useChatter';
import { ChatterDashboardLayout } from '@/components/Chatter/Layout';
import {
  Trophy,
  Medal,
  Crown,
  Star,
  TrendingUp,
  Users,
  Flame,
  Globe,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  User,
} from 'lucide-react';
import type { ChatterLeaderboardEntry, ChatterLevel } from '@/types/chatter';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

// Level colors and names
const LEVEL_CONFIG: Record<ChatterLevel, { name: string; color: string; gradient: string }> = {
  1: { name: 'Bronze', color: 'text-amber-700', gradient: 'from-amber-600 to-amber-800' },
  2: { name: 'Silver', color: 'text-gray-400', gradient: 'from-gray-300 to-gray-500' },
  3: { name: 'Gold', color: 'text-yellow-500', gradient: 'from-yellow-400 to-yellow-600' },
  4: { name: 'Platinum', color: 'text-cyan-400', gradient: 'from-cyan-300 to-cyan-500' },
  5: { name: 'Diamond', color: 'text-purple-400', gradient: 'from-purple-400 to-pink-500' },
};

// Top 3 podium styles
const PODIUM_STYLES = {
  1: {
    icon: Crown,
    gradient: 'from-yellow-400 via-amber-500 to-orange-500',
    ring: 'ring-4 ring-yellow-400/50',
    size: 'w-20 h-20 sm:w-24 sm:h-24',
    badge: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
  },
  2: {
    icon: Medal,
    gradient: 'from-gray-300 via-gray-400 to-gray-500',
    ring: 'ring-4 ring-gray-400/50',
    size: 'w-16 h-16 sm:w-20 sm:h-20',
    badge: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800',
  },
  3: {
    icon: Medal,
    gradient: 'from-amber-600 via-orange-600 to-amber-700',
    ring: 'ring-4 ring-amber-600/50',
    size: 'w-16 h-16 sm:w-20 sm:h-20',
    badge: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white',
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
        const functions = getFunctions(undefined, 'europe-west1');
        const getLeaderboard = httpsCallable<{ month: string }, LeaderboardResponse>(
          functions,
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

  // Format amount
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents);
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

  if (chatterLoading) {
    return (
      <ChatterDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        </div>
      </ChatterDashboardLayout>
    );
  }

  return (
    <ChatterDashboardLayout activeKey="leaderboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500" />
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

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousMonth}
              disabled={availableMonths.indexOf(selectedMonth) === availableMonths.length - 1}
              className={`${UI.button.secondary} p-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white min-w-[140px] text-center">
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
        </div>

        {/* My Rank Card */}
        {myRank && currentUserEntry && (
          <div className={`${UI.card} p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                  #{myRank}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    <FormattedMessage id="chatter.leaderboard.yourRank" defaultMessage="Votre classement" />
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="chatter.leaderboard.outOf"
                      defaultMessage="sur {total} chatters"
                      values={{ total: totalParticipants }}
                    />
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600 dark:text-green-400">
                  {formatAmount(currentUserEntry.monthlyEarnings)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="chatter.leaderboard.conversions"
                    defaultMessage="{clients} clients, {recruits} recrutés"
                    values={{
                      clients: currentUserEntry.monthlyClients,
                      recruits: currentUserEntry.monthlyRecruits,
                    }}
                  />
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
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
              <div className={`${UI.card} p-6 sm:p-8`}>
                <div className="flex items-end justify-center gap-4 sm:gap-8">
                  {/* 2nd Place */}
                  {top3[1] && (
                    <div className="flex flex-col items-center order-1">
                      <div className={`${PODIUM_STYLES[2].size} rounded-full bg-gradient-to-br ${PODIUM_STYLES[2].gradient} ${PODIUM_STYLES[2].ring} flex items-center justify-center mb-3`}>
                        {top3[1].photoUrl ? (
                          <img src={top3[1].photoUrl} alt={top3[1].chatterName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-2xl sm:text-3xl font-bold text-white">
                            {top3[1].chatterName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <span className={`${PODIUM_STYLES[2].badge} px-3 py-1 rounded-full text-sm font-bold mb-2`}>
                        #2
                      </span>
                      <p className="font-semibold text-gray-900 dark:text-white text-center text-sm sm:text-base">
                        {top3[1].chatterName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {getFlagEmoji(top3[1].country)}
                      </p>
                      <p className="font-bold text-green-600 dark:text-green-400 mt-1">
                        {formatAmount(top3[1].monthlyEarnings)}
                      </p>
                      <div className="h-20 w-16 sm:w-20 bg-gradient-to-t from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-500 rounded-t-lg mt-3" />
                    </div>
                  )}

                  {/* 1st Place */}
                  {top3[0] && (
                    <div className="flex flex-col items-center order-2">
                      <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500 mb-2 animate-pulse" />
                      <div className={`${PODIUM_STYLES[1].size} rounded-full bg-gradient-to-br ${PODIUM_STYLES[1].gradient} ${PODIUM_STYLES[1].ring} flex items-center justify-center mb-3`}>
                        {top3[0].photoUrl ? (
                          <img src={top3[0].photoUrl} alt={top3[0].chatterName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-3xl sm:text-4xl font-bold text-white">
                            {top3[0].chatterName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <span className={`${PODIUM_STYLES[1].badge} px-4 py-1.5 rounded-full text-base font-bold mb-2`}>
                        #1
                      </span>
                      <p className="font-bold text-gray-900 dark:text-white text-center text-base sm:text-lg">
                        {top3[0].chatterName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {getFlagEmoji(top3[0].country)}
                      </p>
                      <p className="font-bold text-green-600 dark:text-green-400 text-lg mt-1">
                        {formatAmount(top3[0].monthlyEarnings)}
                      </p>
                      <div className="h-28 w-16 sm:w-20 bg-gradient-to-t from-yellow-500 to-amber-400 dark:from-yellow-600 dark:to-amber-500 rounded-t-lg mt-3" />
                    </div>
                  )}

                  {/* 3rd Place */}
                  {top3[2] && (
                    <div className="flex flex-col items-center order-3">
                      <div className={`${PODIUM_STYLES[3].size} rounded-full bg-gradient-to-br ${PODIUM_STYLES[3].gradient} ${PODIUM_STYLES[3].ring} flex items-center justify-center mb-3`}>
                        {top3[2].photoUrl ? (
                          <img src={top3[2].photoUrl} alt={top3[2].chatterName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-2xl sm:text-3xl font-bold text-white">
                            {top3[2].chatterName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <span className={`${PODIUM_STYLES[3].badge} px-3 py-1 rounded-full text-sm font-bold mb-2`}>
                        #3
                      </span>
                      <p className="font-semibold text-gray-900 dark:text-white text-center text-sm sm:text-base">
                        {top3[2].chatterName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {getFlagEmoji(top3[2].country)}
                      </p>
                      <p className="font-bold text-green-600 dark:text-green-400 mt-1">
                        {formatAmount(top3[2].monthlyEarnings)}
                      </p>
                      <div className="h-14 w-16 sm:w-20 bg-gradient-to-t from-amber-600 to-orange-500 dark:from-amber-700 dark:to-orange-600 rounded-t-lg mt-3" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rest of Rankings Table */}
            {restOfRankings.length > 0 && (
              <div className={`${UI.card} overflow-hidden`}>
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <FormattedMessage id="chatter.leaderboard.otherRankings" defaultMessage="Autres classements" />
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-white/5">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          <FormattedMessage id="chatter.leaderboard.rank" defaultMessage="Rang" />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Chatter
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">
                          <FormattedMessage id="chatter.leaderboard.level" defaultMessage="Niveau" />
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">
                          <FormattedMessage id="chatter.leaderboard.conversions" defaultMessage="Conv." />
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          <FormattedMessage id="chatter.leaderboard.earnings" defaultMessage="Gains" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {restOfRankings.map((entry) => {
                        const isCurrentUser = dashboardData?.chatter.id === entry.chatterId;
                        return (
                          <tr
                            key={entry.chatterId}
                            className={`hover:bg-gray-50 dark:hover:bg-white/5 ${
                              isCurrentUser ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                            }`}
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="font-bold text-gray-900 dark:text-white">
                                #{entry.rank}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
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
                                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded ml-1">
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
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {entry.monthlyClients} / {entry.monthlyRecruits}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <span className="font-semibold text-green-600 dark:text-green-400">
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

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Crown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Top 1</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.leaderboard.bonus.top1" defaultMessage="+100% bonus commissions" />
                </p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Medal className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Top 2</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.leaderboard.bonus.top2" defaultMessage="+50% bonus commissions" />
                </p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Medal className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Top 3</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.leaderboard.bonus.top3" defaultMessage="+15% bonus commissions" />
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ChatterDashboardLayout>
  );
};

export default ChatterLeaderboard;
