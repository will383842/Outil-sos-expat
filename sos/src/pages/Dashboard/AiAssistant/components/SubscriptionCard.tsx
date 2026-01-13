/**
 * Subscription Info Card Component
 * Displays current plan, trial info, and quota
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { Zap, ChevronRight } from 'lucide-react';
import { cn } from '../../../../utils/cn';
import { Card, CardHeader } from './Card';

interface SubscriptionCardProps {
  tierName: string;
  isInTrial: boolean;
  trialDaysRemaining?: number;
  currentUsage: number;
  limit: number;
  onManageClick: () => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  tierName,
  isInTrial,
  trialDaysRemaining = 0,
  currentUsage,
  limit,
  onManageClick,
}) => {
  const intl = useIntl();

  return (
    <Card className="shadow-sm">
      <CardHeader
        icon={<Zap className="w-4 h-4 text-indigo-500" />}
        title={intl.formatMessage({ id: 'subscription.mySubscription' })}
      />

      <div className="space-y-3">
        {/* Current Plan */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {intl.formatMessage({ id: 'subscription.plans.currentPlan' })}
          </span>
          <span className="font-medium text-gray-900">{tierName}</span>
        </div>

        {/* Trial Days */}
        {isInTrial && trialDaysRemaining !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {intl.formatMessage({ id: 'subscription.trial.daysRemaining' }, { days: trialDaysRemaining })}
            </span>
            <span className={cn('font-medium', trialDaysRemaining <= 7 ? 'text-amber-600' : 'text-gray-900')}>
              {trialDaysRemaining} {intl.formatMessage({ id: 'common.days' })}
            </span>
          </div>
        )}

        {/* Monthly Quota */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {intl.formatMessage({ id: 'subscription.quota.thisMonth' })}
          </span>
          <span className="font-medium text-gray-900">
            {currentUsage} / {limit === -1 ? '∞' : limit}
          </span>
        </div>

        {/* Manage Button */}
        <button
          onClick={onManageClick}
          className="w-full mt-2 py-2.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          {intl.formatMessage({ id: 'subscription.manageBilling' })}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
};

export default SubscriptionCard;
