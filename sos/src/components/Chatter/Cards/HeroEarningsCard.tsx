/**
 * HeroEarningsCard - Main earnings card for active chatters (totalEarned > 0)
 * Shows total earned with count-up animation, monthly/daily stats, sparkline, level badge
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { TrendingUp, Star } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { LEVEL_COLORS, UI } from '@/components/Chatter/designTokens';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

interface HeroEarningsCardProps {
  className?: string;
}

const HeroEarningsCard: React.FC<HeroEarningsCardProps> = ({ className = '' }) => {
  const intl = useIntl();
  const { dashboardData, commissions } = useChatterData();
  const chatter = dashboardData?.chatter;

  const totalEarned = (chatter?.totalEarned || 0) / 100;
  const monthlyEarnings = (dashboardData?.monthlyStats?.earnings || 0) / 100;

  // Calculate today's earnings from commissions
  const todayEarnings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return commissions
      .filter((c) => c.createdAt?.startsWith(today) && c.status !== 'cancelled')
      .reduce((sum, c) => sum + (c.amount || 0), 0) / 100;
  }, [commissions]);

  // Sparkline data: last 7 days earnings
  const sparklineData = useMemo(() => {
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayTotal = commissions
        .filter((c) => c.createdAt?.startsWith(dateStr) && c.status !== 'cancelled')
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      days.push(dayTotal / 100);
    }
    return days;
  }, [commissions]);

  // Level info
  const level = chatter?.level || 1;
  const levelColor = LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || LEVEL_COLORS[1];

  // First withdrawal progress (if < $30)
  const showWithdrawalProgress = totalEarned > 0 && totalEarned < 30;

  // Sparkline SVG
  const sparklineSvg = useMemo(() => {
    const max = Math.max(...sparklineData, 1);
    const width = 120;
    const height = 32;
    const points = sparklineData.map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - (val / max) * height;
      return `${x},${y}`;
    }).join(' ');
    return { points, width, height };
  }, [sparklineData]);

  return (
    <div className={`${UI.card} ${UI.cardHighlight} overflow-hidden ${className}`}>
      <div className="p-4 sm:p-5">
        {/* Top row: label + level badge */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <FormattedMessage id="chatter.hero.totalEarned" defaultMessage="Total gagne" />
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${levelColor.bg} ${levelColor.text}`}>
            <Star className="w-3 h-3" />
            Lv.{level}
          </span>
        </div>

        {/* Main amount */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <div className="text-4xl font-extrabold text-green-500 tabular-nums">
              $<AnimatedNumber value={totalEarned} decimals={2} />
            </div>
          </div>
          {/* Sparkline */}
          <svg
            width={sparklineSvg.width}
            height={sparklineSvg.height}
            className="flex-shrink-0 opacity-60"
            viewBox={`0 0 ${sparklineSvg.width} ${sparklineSvg.height}`}
          >
            <polyline
              points={sparklineSvg.points}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Sub stats */}
        <div className="flex items-center gap-4 mt-3">
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              <FormattedMessage id="chatter.hero.thisMonth" defaultMessage="Ce mois" />
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              ${monthlyEarnings.toFixed(2)}
            </p>
          </div>
          <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
          <div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              <FormattedMessage id="chatter.hero.today" defaultMessage="Aujourd'hui" />
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              ${todayEarnings.toFixed(2)}
            </p>
          </div>
          {monthlyEarnings > 0 && (
            <>
              <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />
              <div className="flex items-center gap-1 text-green-500">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">
                  <FormattedMessage id="chatter.hero.active" defaultMessage="Actif" />
                </span>
              </div>
            </>
          )}
        </div>

        {/* First withdrawal progress bar */}
        {showWithdrawalProgress && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-500/10 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-green-700 dark:text-green-400">
                <FormattedMessage id="chatter.hero.firstWithdrawal" defaultMessage="Vers votre premier retrait" />
              </span>
              <span className="font-bold text-green-600 dark:text-green-400">
                ${totalEarned.toFixed(2)} / $30
              </span>
            </div>
            <div className="h-2 bg-green-200 dark:bg-green-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((totalEarned / 30) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroEarningsCard;
