/**
 * Quota Visualization Component
 * Modern circular progress with stats
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { Zap, AlertTriangle, CheckCircle, XCircle, Infinity as InfinityIcon } from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { Card, CardHeader } from './Card';

interface QuotaVisualizationProps {
  currentUsage: number;
  limit: number;
  isInTrial?: boolean;
  trialDaysRemaining?: number;
  trialCallsRemaining?: number;
  showUpgradePrompt?: boolean;
  onUpgradeClick?: () => void;
}

export const QuotaVisualization: React.FC<QuotaVisualizationProps> = ({
  currentUsage,
  limit,
  isInTrial = false,
  trialDaysRemaining = 0,
  trialCallsRemaining = 0,
  showUpgradePrompt = false,
  onUpgradeClick,
}) => {
  const intl = useIntl();

  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : limit > 0 ? Math.min(100, Math.round((currentUsage / limit) * 100)) : 0;
  const remaining = isUnlimited ? -1 : Math.max(0, limit - currentUsage);

  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  // Status configuration
  const getStatus = () => {
    if (isUnlimited) {
      return {
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        strokeColor: 'stroke-amber-500',
        icon: <InfinityIcon className="w-4 h-4" />,
        label: intl.formatMessage({ id: 'subscription.quota.unlimited' }),
      };
    }
    if (isAtLimit) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        strokeColor: 'stroke-red-500',
        icon: <XCircle className="w-4 h-4" />,
        label: intl.formatMessage({ id: 'subscription.quota.exhausted' }),
      };
    }
    if (isNearLimit) {
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        strokeColor: 'stroke-orange-500',
        icon: <AlertTriangle className="w-4 h-4" />,
        label: intl.formatMessage({ id: 'subscription.quota.nearLimit' }),
      };
    }
    return {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      strokeColor: 'stroke-green-500',
      icon: <CheckCircle className="w-4 h-4" />,
      label: intl.formatMessage({ id: 'subscription.quota.available' }),
    };
  };

  const status = getStatus();

  // Circular progress calculations
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="shadow-sm">
      {/* Header */}
      <CardHeader
        icon={<Zap className="w-4 h-4 text-indigo-500" />}
        title={
          isInTrial
            ? intl.formatMessage({ id: 'subscription.trial.period' })
            : intl.formatMessage({ id: 'subscription.quota.usage' })
        }
        action={
          <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium', status.bgColor, status.color)}>
            {status.icon}
            {status.label}
          </div>
        }
      />

      {/* Circular Progress */}
      {!isUnlimited && (
        <div className="flex justify-center mb-4">
          <div className="relative">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-gray-100"
              />
              {/* Progress circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={cn(status.strokeColor, 'transition-all duration-1000 ease-out')}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-2xl font-bold', status.color)}>{percentage}%</span>
              <span className="text-xs text-gray-500">utilisé</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">{currentUsage}</div>
          <div className="text-xs text-gray-500">{intl.formatMessage({ id: 'subscription.quota.used' })}</div>
        </div>
        <div className="text-center border-x border-gray-200">
          <div className="text-xl font-bold text-gray-900">{isUnlimited ? '∞' : limit}</div>
          <div className="text-xs text-gray-500">{intl.formatMessage({ id: 'subscription.quota.total' })}</div>
        </div>
        <div className="text-center">
          <div className={cn('text-xl font-bold', status.color)}>{isUnlimited ? '∞' : remaining}</div>
          <div className="text-xs text-gray-500">{intl.formatMessage({ id: 'subscription.quota.remaining' })}</div>
        </div>
      </div>

      {/* Trial Info */}
      {isInTrial && (
        <div className="bg-indigo-50 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900">
                {intl.formatMessage({ id: 'subscription.trial.period' })}
              </p>
              <p className="text-sm text-indigo-700">
                {intl.formatMessage({ id: 'subscription.trial.daysRemaining' }, { days: trialDaysRemaining })}{' '}
                {intl.formatMessage({ id: 'subscription.trial.daysAnd' })}{' '}
                {intl.formatMessage({ id: 'subscription.trial.callsRemaining' }, { calls: trialCallsRemaining })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Button */}
      {showUpgradePrompt && (isAtLimit || isNearLimit) && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
        >
          <Zap className="w-4 h-4" />
          {isAtLimit
            ? intl.formatMessage({ id: 'subscription.actions.upgrade' })
            : intl.formatMessage({ id: 'subscription.quota.upgradePrompt' })}
        </button>
      )}

      {/* Period Info */}
      {!isInTrial && (
        <p className="text-xs text-gray-500 text-center mt-4">
          {intl.formatMessage({ id: 'subscription.quota.resetInfo' })}
        </p>
      )}
    </Card>
  );
};

export default QuotaVisualization;
