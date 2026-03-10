/**
 * ChatterLeaderboard - Unified Ranking page (fusion Leaderboard + Progression)
 * 2 sub-tabs: Classement | Ma Progression
 * Uses useChatterData() Context
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { useLocaleNavigate } from '@/multilingual-system';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';
import SwipeTabContainer from '@/components/Chatter/Layout/SwipeTabContainer';
import StreakDisplay from '@/components/Chatter/Activation/StreakDisplay';
import { UI, LEVEL_COLORS, SPACING } from '@/components/Chatter/designTokens';
import {
  Trophy, Star, Clock, Calendar, Crown, Medal, ArrowRight,
  ChevronLeft, ChevronRight, Loader2, Flame,
} from 'lucide-react';
import type { ChatterLeaderboardEntry } from '@/types/chatter';

// Podium prizes gradient/icon config (amounts are dynamic from admin config)
const PRIZE_STYLES = [
  { rank: 1, gradient: 'from-yellow-400 to-amber-600', icon: Crown, shadow: 'shadow-amber-500/20' },
  { rank: 2, gradient: 'from-gray-300 to-gray-500', icon: Medal, shadow: 'shadow-gray-500/20' },
  { rank: 3, gradient: 'from-orange-400 to-amber-700', icon: Star, shadow: 'shadow-orange-500/20' },
];

export default function ChatterLeaderboard() {
  return (
    <ChatterDashboardLayout activeKey="leaderboard">
      <ChatterLeaderboardContent />
    </ChatterDashboardLayout>
  );
}

const ChatterLeaderboardContent = React.memo(function ChatterLeaderboardContent() {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { dashboardData } = useChatterData();
  const chatter = dashboardData?.chatter;
  const config = dashboardData?.config;

  // Dynamic prizes from admin config
  const PRIZES = useMemo(() => {
    const prizes = config?.monthlyCompetitionPrizes;
    const p1 = ((prizes?.first ?? 20000) / 100).toFixed(0);
    const p2 = ((prizes?.second ?? 10000) / 100).toFixed(0);
    const p3 = ((prizes?.third ?? 5000) / 100).toFixed(0);
    const m1 = prizes?.firstMultiplier ?? 2;
    const m2 = prizes?.secondMultiplier ?? 1.5;
    const m3 = prizes?.thirdMultiplier ?? 1.15;
    return [
      { ...PRIZE_STYLES[0], amount: `$${p1}`, bonus: `${m1}x` },
      { ...PRIZE_STYLES[1], amount: `$${p2}`, bonus: `${m2}x` },
      { ...PRIZE_STYLES[2], amount: `$${p3}`, bonus: `${m3}x` },
    ];
  }, [config]);

  const [leaderboard, setLeaderboard] = useState<ChatterLeaderboardEntry[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch leaderboard
  useEffect(() => {
    setIsLoadingBoard(true);
    const fn = httpsCallable<{ month: string }, { leaderboard: ChatterLeaderboardEntry[] }>(
      functionsAffiliate, 'getChatterLeaderboard'
    );
    fn({ month: selectedMonth })
      .then((r) => setLeaderboard(r.data.leaderboard || []))
      .catch(() => setLeaderboard([]))
      .finally(() => setIsLoadingBoard(false));
  }, [selectedMonth]);

  // Days remaining in month
  const daysRemaining = useMemo(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
  }, []);

  // Month navigation
  const navigateMonth = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const isCurrentMonth = selectedMonth === (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  // My rank
  const myRank = leaderboard.findIndex((e) => e.chatterId === chatter?.id) + 1;
  const myEntry = leaderboard.find((e) => e.chatterId === chatter?.id);
  const totalParticipants = leaderboard.length;

  // Social proof percentage
  const betterThanPercent = myRank > 0 && totalParticipants > 0
    ? Math.round(((totalParticipants - myRank) / totalParticipants) * 100)
    : 0;

  // Tab 1: Classement
  const leaderboardTab = (
    <div className="space-y-4">
      {/* Month selector + countdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className={`${UI.button.ghost} p-2 ${SPACING.touchTarget}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[100px] text-center">
            <Calendar className="w-4 h-4 inline mr-1" />
            {intl.formatDate(new Date(selectedMonth + '-01'), { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => navigateMonth(1)} className={`${UI.button.ghost} p-2 ${SPACING.touchTarget}`}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {isCurrentMonth && (
          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <FormattedMessage id="chatter.leaderboard.daysLeft" defaultMessage="{days}d left" values={{ days: daysRemaining }} />
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoadingBoard && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )}

      {/* Podium Top 3 — Olympic layout: #2 | #1 (center, taller) | #3 */}
      {!isLoadingBoard && leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-1.5 sm:gap-3">
          {[1, 0, 2].map((podiumIndex) => {
            const prize = PRIZES[podiumIndex];
            const entry = leaderboard[podiumIndex];
            if (!entry || !prize) return null;
            const Icon = prize.icon;
            const isFirst = prize.rank === 1;
            return (
              <div
                key={prize.rank}
                className={`${UI.card} text-center flex-1 max-w-[140px] ${isFirst ? 'ring-2 ring-yellow-400/50 p-4 sm:p-5' : 'p-3 sm:p-4'}`}
              >
                <div className={`${isFirst ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-10 h-10 sm:w-12 sm:h-12'} mx-auto mb-2 rounded-full bg-gradient-to-br ${prize.gradient} flex items-center justify-center ${prize.shadow} shadow-lg`}>
                  <Icon className={`${isFirst ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-5 h-5 sm:w-6 sm:h-6'} text-white`} />
                </div>
                <p className={`${isFirst ? 'text-sm sm:text-base' : 'text-sm'} font-bold text-slate-900 dark:text-white truncate`}>
                  {entry.chatterName || 'Chatter'}
                </p>
                <p className={`${isFirst ? 'text-xl sm:text-2xl' : 'text-lg'} font-extrabold text-green-500 mt-1`}>
                  ${((entry.monthlyEarnings || 0) / 100).toFixed(0)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {prize.amount} + {prize.bonus}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Social proof */}
      {myRank > 0 && (
        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
          <FormattedMessage
            id="chatter.leaderboard.socialProof"
            defaultMessage="Vous gagnez plus que {percent}% des chatters actifs"
            values={{ percent: betterThanPercent }}
          />
        </p>
      )}

      {/* Full leaderboard list */}
      {!isLoadingBoard && leaderboard.length > 3 && (
        <div className={`${UI.card} overflow-hidden`}>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {leaderboard.slice(3).map((entry, index) => {
              const rank = index + 4;
              const isMe = entry.chatterId === chatter?.id;
              return (
                <div
                  key={entry.chatterId}
                  className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}
                >
                  <span className={`text-sm font-bold w-8 text-center ${isMe ? 'text-indigo-500' : 'text-slate-400'}`}>
                    #{rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isMe ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                      {entry.chatterName || 'Chatter'} {isMe && intl.formatMessage({ id: 'chatter.leaderboard.you', defaultMessage: '(you)' })}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-500 flex-shrink-0">
                    ${((entry.monthlyEarnings || 0) / 100).toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My position sticky card */}
      {myRank > 3 && myEntry && (
        <div className={`${UI.card} p-4 border-l-4 border-l-indigo-500 sticky bottom-20 lg:bottom-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">
                <FormattedMessage id="chatter.leaderboard.yourRank" defaultMessage="Votre position" />
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">#{myRank}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">
                <FormattedMessage id="chatter.leaderboard.earnings" defaultMessage="Gains ce mois" />
              </p>
              <p className="text-lg font-bold text-green-500">
                ${((myEntry.monthlyEarnings || 0) / 100).toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Eligibility banner */}
      {(!myEntry || (myEntry.monthlyEarnings || 0) < 20000) && (
        <div className={`${UI.card} p-4 bg-amber-50/50 dark:bg-amber-500/5`}>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <FormattedMessage
              id="chatter.leaderboard.eligibility"
              defaultMessage="Les 3 premiers gagnent {p1}, {p2} et {p3} de bonus ! Minimum $200 de gains pour participer."
              values={{ p1: PRIZES[0].amount, p2: PRIZES[1].amount, p3: PRIZES[2].amount }}
            />
          </p>
        </div>
      )}
    </div>
  );

  // Tab 2: Ma Progression
  const progressionTab = (
    <div className="space-y-4">
      {/* Current level card */}
      <div className={`${UI.card} p-5`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            LEVEL_COLORS[(chatter?.level || 1) as keyof typeof LEVEL_COLORS]?.bg || 'bg-gray-100'
          }`}>
            <div className="flex gap-0.5">
              {Array.from({ length: chatter?.level || 1 }, (_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              <FormattedMessage id="chatter.progression.currentLevel" defaultMessage="Niveau actuel" />
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {LEVEL_COLORS[(chatter?.level || 1) as keyof typeof LEVEL_COLORS]?.name || `Level ${chatter?.level}`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {(chatter?.level || 1) < 5 && (
          <div>
            <div className="h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${chatter?.levelProgress || 0}%` }}
              />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {chatter?.levelProgress || 0}% — <FormattedMessage id="chatter.progression.nextLevel" defaultMessage="vers le prochain niveau" />
            </p>
          </div>
        )}
      </div>

      {/* Streak */}
      <div className={`${UI.card} p-4`}>
        <StreakDisplay
          currentStreak={chatter?.currentStreak || 0}
          bestStreak={chatter?.bestStreak || 0}
          lastActivityDate={chatter?.lastActivityDate}
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: intl.formatMessage({ id: 'chatter.progression.totalEarned', defaultMessage: 'Total earned' }), value: `$${((chatter?.totalEarned || 0) / 100).toFixed(0)}` },
          { label: intl.formatMessage({ id: 'chatter.progression.bestRank', defaultMessage: 'Best rank' }), value: chatter?.bestRank ? `#${chatter.bestRank}` : '-' },
          { label: intl.formatMessage({ id: 'chatter.progression.bestStreak', defaultMessage: 'Best streak' }), value: `${chatter?.bestStreak || 0}d` },
          { label: intl.formatMessage({ id: 'chatter.progression.totalClients', defaultMessage: 'Total clients' }), value: String(chatter?.totalClients || 0) },
          { label: intl.formatMessage({ id: 'chatter.progression.referrals', defaultMessage: 'Referrals' }), value: String(chatter?.totalRecruits || 0) },
          { label: intl.formatMessage({ id: 'chatter.progression.commissions', defaultMessage: 'Commissions' }), value: String(chatter?.totalCommissions || 0) },
        ].map((stat) => (
          <div key={stat.label} className={`${UI.card} p-3 text-center`}>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      {chatter?.badges && chatter.badges.length > 0 && (
        <div className={`${UI.card} p-4`}>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            <FormattedMessage id="chatter.progression.badges" defaultMessage="Badges gagnes" />
          </h3>
          <div className="flex flex-wrap gap-2">
            {chatter.badges.map((badge: string) => (
              <span key={badge} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                {badge}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Roadmap to $5000/month */}
      <div className={`${UI.card} p-5`}>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          <FormattedMessage id="chatter.progression.roadmap.title" defaultMessage="Roadmap vers $5000/mois" />
        </h3>
        <div className="relative">
          {[
            { level: 1, threshold: 0, name: 'Rookie' },
            { level: 2, threshold: 100, name: 'Challenger' },
            { level: 3, threshold: 500, name: 'Pro' },
            { level: 4, threshold: 2000, name: 'Expert' },
            { level: 5, threshold: 5000, name: 'Légende' },
          ].map((step, index, arr) => {
            const currentLevel = chatter?.level || 1;
            const isPast = step.level < currentLevel;
            const isCurrent = step.level === currentLevel;
            const isFuture = step.level > currentLevel;
            const isLast = index === arr.length - 1;

            return (
              <div key={step.level} className="flex items-start gap-4 relative">
                {/* Vertical line */}
                {!isLast && (
                  <div
                    className={`absolute left-[15px] top-[32px] w-0.5 h-[calc(100%-8px)] ${
                      isPast ? 'bg-green-400' : isCurrent ? 'bg-gradient-to-b from-indigo-500 to-slate-300 dark:to-slate-600' : 'border-l-2 border-dashed border-slate-300 dark:border-slate-600'
                    }`}
                    style={isFuture ? { width: 0 } : {}}
                  />
                )}

                {/* Circle */}
                <div className="flex-shrink-0 relative z-10">
                  <div
                    className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      isPast
                        ? 'bg-green-500 border-green-400 text-white'
                        : isCurrent
                        ? 'bg-indigo-500 border-indigo-400 text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400'
                    }`}
                  >
                    {step.level}
                  </div>
                </div>

                {/* Content */}
                <div className={`pb-6 flex-1 ${isCurrent ? '' : ''}`}>
                  <div className={`flex items-center gap-2 ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : isPast ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    <span className="text-sm font-bold">{step.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
                        <FormattedMessage id="chatter.progression.roadmap.current" defaultMessage="Vous" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-xs ${isCurrent ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                      ${step.threshold.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Captain Teaser */}
      {chatter?.role !== 'captainChatter' ? (
        <div className={`${UI.card} overflow-hidden`}>
          <div className="p-5 bg-gradient-to-br from-amber-500/10 to-indigo-500/10 dark:from-amber-500/[0.07] dark:to-indigo-500/[0.07]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center shadow-md shadow-amber-500/25">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                <FormattedMessage id="chatter.progression.captain.title" defaultMessage="Devenez Captain !" />
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              <FormattedMessage id="chatter.progression.captain.description" defaultMessage="Passez au niveau supérieur en devenant Captain de votre équipe." />
            </p>
            <ul className="space-y-2 mb-4">
              {[
                { id: 'chatter.progression.captain.benefit1', defaultMessage: 'Bonus $50 à $1000/mois' },
                { id: 'chatter.progression.captain.benefit2', defaultMessage: 'Gestion de votre équipe' },
                { id: 'chatter.progression.captain.benefit3', defaultMessage: 'Récompenses exclusives' },
              ].map((benefit) => (
                <li key={benefit.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <FormattedMessage id={benefit.id} defaultMessage={benefit.defaultMessage} />
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/devenir-capitaine')}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20"
            >
              <FormattedMessage id="chatter.progression.captain.cta" defaultMessage="En savoir plus" />
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className={`${UI.card} overflow-hidden`}>
          <div className="p-5 bg-gradient-to-br from-yellow-400/10 to-amber-500/10 dark:from-yellow-400/[0.07] dark:to-amber-500/[0.07]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-md shadow-yellow-500/25">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  <FormattedMessage id="chatter.progression.captain.congrats" defaultMessage="Vous êtes Captain !" />
                </h3>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  <FormattedMessage id="chatter.progression.captain.congratsSub" defaultMessage="Gérez votre équipe et maximisez vos gains" />
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/chatter/mon-equipe')}
              className="w-full py-3 px-4 bg-gradient-to-r from-yellow-400 to-amber-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-yellow-500/20"
            >
              <FormattedMessage id="chatter.progression.captain.dashboard" defaultMessage="Mon équipe" />
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const tabs = [
    {
      key: 'leaderboard',
      label: <FormattedMessage id="chatter.ranking.tab.leaderboard" defaultMessage="Classement" />,
      content: leaderboardTab,
    },
    {
      key: 'progression',
      label: <FormattedMessage id="chatter.ranking.tab.progression" defaultMessage="Ma Progression" />,
      content: progressionTab,
    },
  ];

  return (
    <div className={`${SPACING.pagePadding} py-4`}>
      {/* Hero header */}
      <div className={`${UI.card} ${SPACING.cardPadding} bg-gradient-to-r from-amber-500/5 to-indigo-500/5 dark:from-amber-500/[0.03] dark:to-indigo-500/[0.03] mb-4`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-500 flex items-center justify-center shadow-md shadow-amber-500/25">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              <FormattedMessage id="chatter.ranking.title" defaultMessage="Classement" />
            </h1>
            {myRank > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <FormattedMessage
                  id="chatter.leaderboard.yourPosition"
                  defaultMessage="#{rank} sur {total}"
                  values={{ rank: myRank, total: totalParticipants }}
                />
              </p>
            )}
          </div>
        </div>
      </div>
      <SwipeTabContainer tabs={tabs} />
    </div>
  );
});
