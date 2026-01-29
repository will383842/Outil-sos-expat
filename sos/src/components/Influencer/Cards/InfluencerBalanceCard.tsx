/**
 * InfluencerBalanceCard - Displays a balance amount with icon and color
 */

import React from 'react';

interface InfluencerBalanceCardProps {
  label: string;
  amount: number;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'gray';
  icon: React.ReactNode;
  highlight?: boolean;
}

const colorClasses = {
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-600 dark:text-green-400',
    icon: 'bg-green-100 dark:bg-green-900/30',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    text: 'text-yellow-600 dark:text-yellow-400',
    icon: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-600 dark:text-red-400',
    icon: 'bg-red-100 dark:bg-red-900/30',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    icon: 'bg-blue-100 dark:bg-blue-900/30',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-600 dark:text-purple-400',
    icon: 'bg-purple-100 dark:bg-purple-900/30',
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-600 dark:text-gray-400',
    icon: 'bg-gray-100 dark:bg-gray-900/30',
  },
};

const InfluencerBalanceCard: React.FC<InfluencerBalanceCardProps> = ({
  label,
  amount,
  color,
  icon,
  highlight = false,
}) => {
  const colors = colorClasses[color];
  const formattedAmount = `$${(amount / 100).toFixed(2)}`;

  return (
    <div className={`${colors.bg} rounded-2xl p-6 border ${highlight ? 'border-2 border-green-500 ring-2 ring-green-500/20' : 'border-white/20 dark:border-white/10'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className={`text-3xl font-bold ${colors.text}`}>{formattedAmount}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center ${colors.text}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default InfluencerBalanceCard;
