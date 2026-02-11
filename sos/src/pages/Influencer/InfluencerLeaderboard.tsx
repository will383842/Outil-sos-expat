/**
 * InfluencerLeaderboard - Monthly top 10 rankings with Top 3 bonus rewards
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { useInfluencer } from '@/hooks/useInfluencer';
import type { InfluencerLeaderboardEntry } from '@/types/influencer';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Trophy, Medal, Crown, Star, Sparkles } from 'lucide-react';

const TOP3_BONUSES = [
  { rank: 1, multiplier: 'x2.00', label: 'Gold', color: 'from-yellow-400 to-amber-500', textColor: 'text-yellow-700 dark:text-yellow-300', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { rank: 2, multiplier: 'x1.50', label: 'Silver', color: 'from-gray-300 to-gray-400', textColor: 'text-gray-600 dark:text-gray-300', bgColor: 'bg-gray-50 dark:bg-gray-800/30' },
  { rank: 3, multiplier: 'x1.15', label: 'Bronze', color: 'from-amber-500 to-orange-600', textColor: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
] as const;

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const InfluencerLeaderboard: React.FC = () => {
  const { leaderboard, isLoading, refreshLeaderboard } = useInfluencer();

  useEffect(() => {
    refreshLeaderboard();
  }, []);

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500 drop-shadow-sm" />;
      case 2: return <Star className="w-6 h-6 text-gray-400" />;
      case 3: return <Star className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">#{rank}</span>;
    }
  };

  if (isLoading && !leaderboard) {
    return (
      <InfluencerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="large" color="red" />
        </div>
      </InfluencerDashboardLayout>
    );
  }

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="influencer.leaderboard.title" defaultMessage="Classement mensuel" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="influencer.leaderboard.subtitle"
              defaultMessage="Top 10 des influenceurs - {month}"
              values={{ month: leaderboard?.month || new Date().toISOString().substring(0, 7) }}
            />
          </p>
        </div>

        {/* Top 3 Bonus Cards */}
        <div className="grid grid-cols-3 gap-3">
          {TOP3_BONUSES.map((bonus) => (
            <div
              key={bonus.rank}
              className={`${bonus.bgColor} rounded-xl p-3 text-center border border-white/20 dark:border-white/10`}
            >
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br ${bonus.color} mb-1.5`}>
                {bonus.rank === 1 ? (
                  <Crown className="w-4 h-4 text-white" />
                ) : (
                  <Star className="w-4 h-4 text-white" />
                )}
              </div>
              <p className={`text-lg font-bold ${bonus.textColor}`}>{bonus.multiplier}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id={`influencer.leaderboard.bonus.rank${bonus.rank}`}
                  defaultMessage={`Top ${bonus.rank} bonus`}
                />
              </p>
            </div>
          ))}
        </div>

        {/* Your Position */}
        {leaderboard?.currentUserRank && (
          <div className={`${UI.card} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="influencer.leaderboard.yourPosition" defaultMessage="Votre position" />
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-red-600 dark:text-red-400">
                    #{leaderboard.currentUserRank.rank}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    <FormattedMessage id="influencer.leaderboard.you" defaultMessage="Vous" />
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatCurrency(leaderboard.currentUserRank.earnings || 0)}
                    <FormattedMessage id="influencer.leaderboard.thisMonth" defaultMessage=" ce mois" />
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {leaderboard.currentUserRank.referrals || 0}
                  <FormattedMessage id="influencer.leaderboard.clients" defaultMessage=" clients" />
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rankings */}
        <div className={`${UI.card} overflow-hidden`}>
          {leaderboard?.entries && leaderboard.entries.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaderboard.entries.map((entry: InfluencerLeaderboardEntry) => (
                <div
                  key={entry.influencerId}
                  className={`p-4 flex items-center gap-4 ${
                    entry.isCurrentUser ? 'bg-red-50 dark:bg-red-900/20' : ''
                  }`}
                >
                  <div className="w-10 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      entry.isCurrentUser ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {entry.displayName}
                      {entry.isCurrentUser && (
                        <span className="ml-2 text-xs text-red-500">
                          (<FormattedMessage id="influencer.leaderboard.you" defaultMessage="Vous" />)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.country}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(entry.earnings)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {entry.referrals}
                      <FormattedMessage id="influencer.leaderboard.clientsShort" defaultMessage=" réf." />
                    </p>
                    {entry.rank <= 3 && (
                      <span className={`inline-flex items-center gap-0.5 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        TOP3_BONUSES[entry.rank - 1].bgColor
                      } ${TOP3_BONUSES[entry.rank - 1].textColor}`}>
                        <Sparkles className="w-2.5 h-2.5" />
                        {TOP3_BONUSES[entry.rank - 1].multiplier}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <FormattedMessage
                id="influencer.leaderboard.empty"
                defaultMessage="Pas encore de classement pour ce mois"
              />
            </div>
          )}
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerLeaderboard;
