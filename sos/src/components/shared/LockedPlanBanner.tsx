/**
 * LockedPlanBanner — Displays the affiliate's locked commission plan info.
 * Used across all 4 affiliate dashboards (Chatter, Influencer, Blogger, GroupAdmin).
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Shield } from 'lucide-react';

interface LockedPlanBannerProps {
  commissionPlan: {
    name: string;
    rateLockDate?: string;
    isLifetimeLock?: boolean;
  } | null | undefined;
}

const LockedPlanBanner: React.FC<LockedPlanBannerProps> = ({ commissionPlan }) => {
  const intl = useIntl();

  if (!commissionPlan) return null;

  const lockDate = commissionPlan.rateLockDate
    ? intl.formatDate(new Date(commissionPlan.rateLockDate), { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center flex-shrink-0">
        <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">
            <FormattedMessage id="affiliate.lockedPlan.title" defaultMessage="Your commission plan" />
          </span>
          <span className="text-xs bg-emerald-200 dark:bg-emerald-700 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-medium">
            <FormattedMessage id="affiliate.lockedPlan.locked" defaultMessage="Locked for life" />
          </span>
        </div>
        <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">
          {commissionPlan.name}
          {lockDate && (
            <span className="text-emerald-500 dark:text-emerald-400 ml-1">
              — <FormattedMessage id="affiliate.lockedPlan.since" defaultMessage="since {date}" values={{ date: lockDate }} />
            </span>
          )}
        </p>
        <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5">
          <FormattedMessage id="affiliate.lockedPlan.guarantee" defaultMessage="Your rates are guaranteed and will never change." />
        </p>
      </div>
    </div>
  );
};

export default LockedPlanBanner;
