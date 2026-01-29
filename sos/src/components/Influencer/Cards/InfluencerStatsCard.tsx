/**
 * InfluencerStatsCard - Displays a stat value with icon
 */

import React from 'react';

interface InfluencerStatsCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
}

const colorClasses = {
  green: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
  red: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  purple: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
};

const InfluencerStatsCard: React.FC<InfluencerStatsCardProps> = ({
  label,
  value,
  icon,
  color,
}) => {
  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default InfluencerStatsCard;
