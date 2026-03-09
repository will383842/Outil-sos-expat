/**
 * HeroEarningsCard - Main earnings card for active chatters (totalEarned > 0)
 * Shows total earned with count-up animation, monthly/daily stats, sparkline, level badge
 * 2026 glassmorphism design with indigo/violet gradient
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { TrendingUp, Star } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { LEVEL_COLORS } from '@/components/Chatter/designTokens';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

interface HeroEarningsCardProps {
  className?: string;
}

const HeroEarningsCard: React.FC<HeroEarningsCardProps> = ({ className = '' }) => {
  const intl = useIntl();
  const { dashboardData, commissions, minimumWithdrawal } = useChatterData();
  const chatter = dashboardData?.chatter;

  const totalEarned = (chatter?.totalEarned || 0) / 100;
  const monthlyEarnings = (dashboardData?.monthlyStats?.earnings || 0) / 100;

  // Minimum withdrawal in dollars (from config, fallback 3000 cents = $30)
  const minWithdrawalDollars = (minimumWithdrawal || dashboardData?.config?.minimumWithdrawalAmount || 3000) / 100;

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

  // First withdrawal progress (if below minimum)
  const showWithdrawalProgress = totalEarned > 0 && totalEarned < minWithdrawalDollars;

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
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent dark:from-indigo-500/20 dark:via-violet-500/10 dark:to-transparent backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${className}`}
    >
      {/* Subtle grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      <div className="relative z-10 p-4 sm:p-5">
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
              stroke="#818cf8"
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
                ${totalEarned.toFixed(2)} / ${minWithdrawalDollars.toFixed(0)}
              </span>
            </div>
            <div className="h-2 bg-green-200 dark:bg-green-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((totalEarned / minWithdrawalDollars) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroEarningsCard;
