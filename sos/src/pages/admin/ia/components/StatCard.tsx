/**
 * StatCard - Carte de statistique réutilisable
 */

import React from 'react';
import { cn } from '../../../../utils/cn';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={cn('p-2 rounded-lg', color)}>
        {icon}
      </div>
      {trend && (
        <span className={cn(
          'text-sm font-medium',
          trend.positive ? 'text-green-600' : 'text-red-600'
        )}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </span>
      )}
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    <div className="text-sm text-gray-500">{label}</div>
  </div>
);

export default StatCard;
