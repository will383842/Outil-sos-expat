/**
 * QuotaUsageBar Component
 * Barre de progression du quota IA
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { AlertTriangle, CheckCircle, XCircle, Infinity, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';

interface QuotaUsageBarProps {
  currentUsage: number;
  limit: number; // -1 for unlimited
  isInTrial?: boolean;
  trialDaysRemaining?: number;
  trialCallsRemaining?: number;
  showUpgradePrompt?: boolean;
  onUpgradeClick?: () => void;
  compact?: boolean;
}

export const QuotaUsageBar: React.FC<QuotaUsageBarProps> = ({
  currentUsage,
  limit,
  isInTrial = false,
  trialDaysRemaining = 0,
  trialCallsRemaining = 0,
  showUpgradePrompt = true,
  onUpgradeClick,
  compact = false
}) => {
  const intl = useIntl();

  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : limit > 0 ? Math.min(100, Math.round((currentUsage / limit) * 100)) : 0;
  const remaining = isUnlimited ? -1 : Math.max(0, limit - currentUsage);

  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  // Determine status and colors
  const getStatusConfig = () => {
    if (isUnlimited) {
      return {
        color: 'bg-gradient-to-r from-amber-400 to-yellow-500',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        icon: <Infinity className="w-4 h-4" />,
        label: intl.formatMessage({ id: 'subscription.quota.unlimited' })
      };
    }
    if (isAtLimit) {
      return {
        color: 'bg-gradient-to-r from-red-500 to-red-600',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        icon: <XCircle className="w-4 h-4" />,
        label: intl.formatMessage({ id: 'subscription.quota.exhausted' })
      };
    }
    if (isNearLimit) {
      return {
        color: 'bg-gradient-to-r from-orange-400 to-amber-500',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-700',
        icon: <AlertTriangle className="w-4 h-4" />,
        label: intl.formatMessage({ id: 'subscription.quota.nearLimit' })
      };
    }
    return {
      color: 'bg-gradient-to-r from-green-400 to-emerald-500',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      icon: <CheckCircle className="w-4 h-4" />,
      label: intl.formatMessage({ id: 'subscription.quota.available' })
    };
  };

  const status = getStatusConfig();

  // Compact version for dashboard widget
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {isInTrial
              ? intl.formatMessage({ id: 'subscription.trial.title' })
              : intl.formatMessage({ id: 'subscription.quota.title' })}
          </span>
          <span className={cn('font-medium flex items-center gap-1', status.textColor)}>
            {status.icon}
            {isUnlimited ? (
              intl.formatMessage({ id: 'subscription.quota.unlimited' })
            ) : (
              `${currentUsage}/${limit}`
            )}
          </span>
        </div>

        {!isUnlimited && (
          <div className={cn('h-2 rounded-full overflow-hidden', status.bgColor)}>
            <div
              className={cn('h-full rounded-full transition-all duration-500', status.color)}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}

        {isInTrial && (
          <p className="text-xs text-gray-500">
            {intl.formatMessage({ id: 'subscription.trial.daysRemaining' }, { days: trialDaysRemaining })} {intl.formatMessage({ id: 'subscription.trial.daysAnd' })} {intl.formatMessage({ id: 'subscription.trial.callsRemaining' }, { calls: trialCallsRemaining })}
          </p>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900">
            {isInTrial
              ? intl.formatMessage({ id: 'subscription.trial.period' })
              : intl.formatMessage({ id: 'subscription.quota.usage' })}
          </h3>
        </div>
        <div className={cn(
          'flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
          status.bgColor,
          status.textColor
        )}>
          {status.icon}
          {status.label}
        </div>
      </div>

      {/* Progress Bar */}
      {!isUnlimited && (
        <div className="mb-4">
          <div className={cn('h-4 rounded-full overflow-hidden', status.bgColor)}>
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500 relative',
                status.color
              )}
              style={{ width: `${percentage}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{currentUsage}</div>
          <div className="text-xs text-gray-500">
            {intl.formatMessage({ id: 'subscription.quota.used' })}
          </div>
        </div>
        <div className="text-center border-x border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {isUnlimited ? '∞' : limit}
          </div>
          <div className="text-xs text-gray-500">
            {intl.formatMessage({ id: 'subscription.quota.total' })}
          </div>
        </div>
        <div className="text-center">
          <div className={cn('text-2xl font-bold', status.textColor)}>
            {isUnlimited ? '∞' : remaining}
          </div>
          <div className="text-xs text-gray-500">
            {intl.formatMessage({ id: 'subscription.quota.remaining' })}
          </div>
        </div>
      </div>

      {/* Trial Info */}
      {isInTrial && (
        <div className="bg-indigo-50 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900">
                {intl.formatMessage({ id: 'subscription.trial.period' })}
              </p>
              <p className="text-sm text-indigo-700">
                {intl.formatMessage({ id: 'subscription.trial.daysRemaining' }, { days: trialDaysRemaining })} {intl.formatMessage({ id: 'subscription.trial.daysAnd' })} {intl.formatMessage({ id: 'subscription.trial.callsRemaining' }, { calls: trialCallsRemaining })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Prompt */}
      {showUpgradePrompt && (isAtLimit || isNearLimit) && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
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
    </div>
  );
};

export default QuotaUsageBar;
