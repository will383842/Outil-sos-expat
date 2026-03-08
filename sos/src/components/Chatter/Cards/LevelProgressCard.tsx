/**
 * LevelProgressCard - Level progress bar + forecast + streak flame
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Star } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { UI, LEVEL_COLORS } from '@/components/Chatter/designTokens';
import StreakDisplay from '@/components/Chatter/Activation/StreakDisplay';

interface LevelProgressCardProps {
  className?: string;
}

const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 100,    // $100 to reach level 2
  2: 500,    // $500 to reach level 3
  3: 2000,   // $2000 to reach level 4
  4: 5000,   // $5000 to reach level 5
};

const LEVEL_NAMES: Record<number, string> = {
  1: 'Debutant',
  2: 'Intermediaire',
  3: 'Avance',
  4: 'Expert',
  5: 'Elite',
};

const LevelProgressCard: React.FC<LevelProgressCardProps> = ({ className = '' }) => {
  const { dashboardData } = useChatterData();
  const chatter = dashboardData?.chatter;

  const level = chatter?.level || 1;
  const levelProgress = chatter?.levelProgress || 0;
  const totalEarned = (chatter?.totalEarned || 0) / 100;
  const currentStreak = chatter?.currentStreak || 0;
  const bestStreak = chatter?.bestStreak || 0;
  const lastActivityDate = chatter?.lastActivityDate;

  const levelColor = LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || LEVEL_COLORS[1];
  const nextThreshold = LEVEL_THRESHOLDS[level];
  const isMaxLevel = level >= 5;
  const remaining = nextThreshold ? Math.max(nextThreshold - totalEarned, 0) : 0;

  // Stars display
  const stars = Array.from({ length: 5 }, (_, i) => i < level);

  return (
    <div className={`${UI.card} p-4 sm:p-5 ${className}`}>
      {/* Header: level name + stars + streak */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${levelColor.bg} ${levelColor.text}`}>
            {LEVEL_NAMES[level] || `Level ${level}`}
          </span>
          <div className="flex gap-0.5">
            {stars.map((filled, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${filled ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 dark:text-white/10'}`}
              />
            ))}
          </div>
        </div>
        <StreakDisplay
          currentStreak={currentStreak}
          bestStreak={bestStreak}
          lastActivityDate={lastActivityDate}
          compact
        />
      </div>

      {/* Progress bar */}
      {!isMaxLevel && (
        <>
          <div className="h-2.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                level === 1 ? 'from-gray-400 to-gray-500' :
                level === 2 ? 'from-blue-400 to-blue-600' :
                level === 3 ? 'from-violet-400 to-violet-600' :
                'from-orange-400 to-orange-600'
              }`}
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <FormattedMessage
                id="chatter.level.remaining"
                defaultMessage="Encore ${amount} pour {level}"
                values={{
                  amount: remaining.toFixed(0),
                  level: LEVEL_NAMES[level + 1] || 'prochain niveau',
                }}
              />
            </p>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {levelProgress}%
            </span>
          </div>
        </>
      )}

      {isMaxLevel && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
          <FormattedMessage id="chatter.level.max" defaultMessage="Niveau maximum atteint ! +50% bonus" />
        </p>
      )}
    </div>
  );
};

export default LevelProgressCard;
