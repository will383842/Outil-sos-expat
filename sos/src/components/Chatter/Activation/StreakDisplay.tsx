/**
 * StreakDisplay - Shows flame icon colored by streak length + day count
 */

import React from 'react';
import { Flame } from 'lucide-react';
import { FormattedMessage } from 'react-intl';
import { getStreakColor } from '@/components/Chatter/designTokens';

interface StreakDisplayProps {
  currentStreak: number;
  bestStreak: number;
  lastActivityDate?: string | null;
  compact?: boolean;
  className?: string;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({
  currentStreak,
  bestStreak,
  lastActivityDate,
  compact = false,
  className = '',
}) => {
  const flameColor = getStreakColor(currentStreak);

  // Check if streak is in danger (no activity in 24h)
  const isInDanger = (() => {
    if (!lastActivityDate) return false;
    const lastActivity = new Date(lastActivityDate).getTime();
    const now = Date.now();
    const hoursSince = (now - lastActivity) / (1000 * 60 * 60);
    return hoursSince > 20 && currentStreak > 0; // Warning at 20h
  })();

  if (currentStreak === 0 && !compact) return null;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <Flame className={`w-4 h-4 ${flameColor}`} />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {currentStreak}
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-0.5">j</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`flex items-center gap-1.5 ${isInDanger ? 'animate-pulse' : ''}`}>
        <Flame className={`w-5 h-5 ${flameColor}`} />
        <span className="text-sm font-bold text-slate-900 dark:text-white">
          {currentStreak}
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
            <FormattedMessage id="chatter.streak.days" defaultMessage="jours" />
          </span>
        </span>
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500">
        |
      </span>
      <span className="text-xs text-slate-400 dark:text-slate-500">
        <FormattedMessage id="chatter.streak.record" defaultMessage="Record" />: {bestStreak}
      </span>
    </div>
  );
};

export default StreakDisplay;
