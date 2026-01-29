/**
 * BloggerLeaderboard - Monthly top 10 rankings (informational only - no bonus)
 */

import React, { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { useBlogger } from '@/hooks/useBlogger';
import type { BloggerLeaderboardEntry } from '@/types/blogger';
import { BloggerDashboardLayout } from '@/components/Blogger';
import { Trophy, Medal, Loader2, Info } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const BloggerLeaderboard: React.FC = () => {
  const { leaderboard, isLoading, refreshLeaderboard } = useBlogger();

  useEffect(() => {
    refreshLeaderboard();
  }, []);

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">#{rank}</span>;
    }
  };

  if (isLoading && !leaderboard) {
    return (
      <BloggerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </BloggerDashboardLayout>
    );
  }

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="blogger.leaderboard.title" defaultMessage="Classement mensuel" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="blogger.leaderboard.subtitle"
              defaultMessage="Top 10 des blogueurs - {month}"
              values={{ month: leaderboard?.month || new Date().toISOString().substring(0, 7) }}
            />
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-purple-700 dark:text-purple-300">
            <FormattedMessage
              id="blogger.leaderboard.info"
              defaultMessage="Classement informatif uniquement - pas de bonus associé. Les blogueurs gagnent des commissions fixes ($10 par client, $5 par recrutement) sans bonus de classement."
            />
          </p>
        </div>

        {/* Your Position */}
        {leaderboard?.currentUserRank && (
          <div className={`${UI.card} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              <FormattedMessage id="blogger.leaderboard.yourPosition" defaultMessage="Votre position" />
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    #{leaderboard.currentUserRank.rank}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    <FormattedMessage id="blogger.leaderboard.you" defaultMessage="Vous" />
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatCurrency(leaderboard.currentUserRank.earnings || 0)}
                    <FormattedMessage id="blogger.leaderboard.thisMonth" defaultMessage=" ce mois" />
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {leaderboard.currentUserRank.clients || 0}
                  <FormattedMessage id="blogger.leaderboard.clients" defaultMessage=" clients" />
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rankings */}
        <div className={`${UI.card} overflow-hidden`}>
          {leaderboard?.entries && leaderboard.entries.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaderboard.entries.map((entry: BloggerLeaderboardEntry) => (
                <div
                  key={entry.bloggerId}
                  className={`p-4 flex items-center gap-4 ${
                    entry.isCurrentUser ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                  }`}
                >
                  <div className="w-10 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      entry.isCurrentUser ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {entry.displayName}
                      {entry.isCurrentUser && (
                        <span className="ml-2 text-xs text-purple-500">
                          (<FormattedMessage id="blogger.leaderboard.you" defaultMessage="Vous" />)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.blogName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(entry.earnings)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {entry.clients}
                      <FormattedMessage id="blogger.leaderboard.clientsShort" defaultMessage=" clients" />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <FormattedMessage
                id="blogger.leaderboard.empty"
                defaultMessage="Pas encore de classement pour ce mois"
              />
            </div>
          )}
        </div>

        {/* How it works */}
        <div className={`${UI.card} p-6`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            <FormattedMessage id="blogger.leaderboard.howItWorks" defaultMessage="Comment fonctionne le classement ?" />
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-purple-500">•</span>
              <FormattedMessage
                id="blogger.leaderboard.howItWorks1"
                defaultMessage="Le classement est basé sur les gains totaux du mois (clients + recrutements)"
              />
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">•</span>
              <FormattedMessage
                id="blogger.leaderboard.howItWorks2"
                defaultMessage="Seuls les 10 premiers blogueurs sont affichés"
              />
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">•</span>
              <FormattedMessage
                id="blogger.leaderboard.howItWorks3"
                defaultMessage="Le classement est réinitialisé chaque 1er du mois"
              />
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">•</span>
              <FormattedMessage
                id="blogger.leaderboard.howItWorks4"
                defaultMessage="Ce classement est purement informatif, aucun bonus n'est associé"
              />
            </li>
          </ul>
        </div>
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerLeaderboard;
