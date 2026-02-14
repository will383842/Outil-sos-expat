/**
 * AdminInfluencersLeaderboard - Admin view of the top 10 influencers
 * Note: This is informational only - no bonuses for Top 10 (unlike chatters)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsWest2 } from '@/config/firebase';
import {
  Trophy,
  Medal,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Users,
  TrendingUp,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

interface LeaderboardEntry {
  rank: number;
  influencerId: string;
  displayName: string;
  country?: string;
  earnings: number;
  referrals: number;
}

interface LeaderboardData {
  month: string;
  year: number;
  entries: LeaderboardEntry[];
  totalParticipants: number;
}

const AdminInfluencersLeaderboard: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Month navigation
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const getLeaderboard = httpsCallable<{ month?: number; year?: number }, LeaderboardData>(
        functionsWest2,
        'getInfluencerLeaderboard'
      );

      const result = await getLeaderboard({
        month: selectedDate.month,
        year: selectedDate.year,
      });

      setLeaderboard(result.data);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Format amount
  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Get month name
  const getMonthName = (month: number) => {
    return new Date(2024, month - 1).toLocaleDateString(intl.locale, { month: 'long' });
  };

  // Navigate months
  const goToPreviousMonth = () => {
    setSelectedDate(prev => {
      if (prev.month === 1) {
        return { month: 12, year: prev.year - 1 };
      }
      return { month: prev.month - 1, year: prev.year };
    });
  };

  const goToNextMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Don't go beyond current month
    if (selectedDate.year > currentYear || (selectedDate.year === currentYear && selectedDate.month >= currentMonth)) {
      return;
    }

    setSelectedDate(prev => {
      if (prev.month === 12) {
        return { month: 1, year: prev.year + 1 };
      }
      return { month: prev.month + 1, year: prev.year };
    });
  };

  // Get rank medal color
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-br from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white';
      default:
        return 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300';
    }
  };

  // Get country flag emoji
  const getFlagEmoji = (countryCode?: string): string => {
    if (!countryCode) return '🌍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedDate.month === now.getMonth() + 1 && selectedDate.year === now.getFullYear();
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
              <FormattedMessage id="admin.influencers.leaderboard.title" defaultMessage="Top 10 Influenceurs" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.influencers.leaderboard.subtitle"
                defaultMessage="Classement mensuel (informatif uniquement)"
              />
            </p>
          </div>

          <button
            onClick={fetchLeaderboard}
            className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className={`${UI.card} p-4`}>
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                {getMonthName(selectedDate.month)} {selectedDate.year}
              </p>
              {leaderboard && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {leaderboard.totalParticipants} participants
                </p>
              )}
            </div>

            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className={`${UI.card} p-4 bg-blue-50 dark:bg-blue-900/20`}>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <FormattedMessage
              id="admin.influencers.leaderboard.info"
              defaultMessage="Note : Ce classement est informatif uniquement. Contrairement aux chatters, les influenceurs ne reçoivent pas de bonus pour le Top 10."
            />
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : error ? (
          <div className={`${UI.card} p-8 text-center`}>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : leaderboard && leaderboard.entries.length > 0 ? (
          <div className="space-y-4">
            {/* Top 3 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {leaderboard.entries.slice(0, 3).map((entry) => (
                <div
                  key={entry.influencerId}
                  className={`${UI.card} p-6 cursor-pointer hover:scale-105 transition-transform ${
                    entry.rank === 1 ? 'ring-2 ring-yellow-400' : ''
                  }`}
                  onClick={() => navigate(`/admin/influencers/${entry.influencerId}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${getRankStyle(entry.rank)}`}>
                      {entry.rank === 1 ? (
                        <Trophy className="w-6 h-6" />
                      ) : (
                        <Medal className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getFlagEmoji(entry.country)}</span>
                        <p className="font-bold text-gray-900 dark:text-white truncate">
                          {entry.displayName}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          {formatAmount(entry.earnings)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {entry.referrals} réf.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rest of Top 10 */}
            {leaderboard.entries.length > 3 && (
              <div className={`${UI.card} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Rang
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Influenceur
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Gains
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Réf.
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {leaderboard.entries.slice(3).map((entry) => (
                        <tr
                          key={entry.influencerId}
                          className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                          onClick={() => navigate(`/admin/influencers/${entry.influencerId}`)}
                        >
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${getRankStyle(entry.rank)}`}>
                              {entry.rank}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getFlagEmoji(entry.country)}</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {entry.displayName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {formatAmount(entry.earnings)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-gray-600 dark:text-gray-400">
                              {entry.referrals}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`${UI.card} p-8 text-center`}>
            <Trophy className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.influencers.leaderboard.empty"
                defaultMessage="Aucun influenceur dans le classement ce mois-ci"
              />
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminInfluencersLeaderboard;
