/**
 * RecentActivityFeed - Last 5 commissions with colored icons by type
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Phone, Users, UserPlus, Gift, Crown, Settings, ArrowRight } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { UI, COMMISSION_COLORS } from '@/components/Chatter/designTokens';

interface RecentActivityFeedProps {
  onViewAll?: () => void;
  limit?: number;
  className?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  client_call: <Phone className="w-4 h-4" />,
  n1_call: <Users className="w-4 h-4" />,
  n2_call: <Users className="w-4 h-4" />,
  provider_call: <UserPlus className="w-4 h-4" />,
  activation_bonus: <Gift className="w-4 h-4" />,
  tier_bonus: <Gift className="w-4 h-4" />,
  telegram_bonus: <Gift className="w-4 h-4" />,
  captain_call: <Crown className="w-4 h-4" />,
  manual: <Settings className="w-4 h-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  client_call: 'Appel client',
  n1_call: 'Appel N1',
  n2_call: 'Appel N2',
  provider_call: 'Appel provider',
  activation_bonus: 'Bonus activation',
  tier_bonus: 'Bonus tier',
  telegram_bonus: 'Bonus Telegram',
  captain_call: 'Appel captain',
  manual: 'Ajustement',
};

function getCommissionColor(type: string): string {
  if (type.includes('client')) return COMMISSION_COLORS.client_call;
  if (type.includes('n1')) return COMMISSION_COLORS.n1_call;
  if (type.includes('n2')) return COMMISSION_COLORS.n2_call;
  if (type.includes('provider')) return COMMISSION_COLORS.provider_call;
  if (type.includes('bonus')) return COMMISSION_COLORS.bonus;
  if (type.includes('captain')) return COMMISSION_COLORS.captain_call;
  return COMMISSION_COLORS.manual;
}

const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  onViewAll,
  limit: maxItems = 5,
  className = '',
}) => {
  const intl = useIntl();
  const { commissions } = useChatterData();

  const recentCommissions = useMemo(
    () => commissions.filter((c) => c.status !== 'cancelled').slice(0, maxItems),
    [commissions, maxItems]
  );

  // Check which commissions are "new" since last visit
  const lastVisit = useMemo(() => {
    const stored = localStorage.getItem('chatter_last_activity_visit');
    const now = Date.now().toString();
    localStorage.setItem('chatter_last_activity_visit', now);
    return stored ? parseInt(stored, 10) : 0;
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return intl.formatMessage({ id: 'common.justNow', defaultMessage: "A l'instant" });
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}j`;
  };

  if (recentCommissions.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <div className={`${UI.card} overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          <FormattedMessage id="chatter.activity.recent" defaultMessage="Activite recente" />
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-red-500 hover:text-red-600 font-medium inline-flex items-center gap-1 min-h-[44px] px-2"
          >
            <FormattedMessage id="chatter.activity.viewAll" defaultMessage="Voir tout" />
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {recentCommissions.map((commission) => {
          const color = getCommissionColor(commission.type || '');
          const icon = TYPE_ICONS[commission.type || 'manual'] || TYPE_ICONS.manual;
          const isNew = commission.createdAt && new Date(commission.createdAt).getTime() > lastVisit;
          const amount = (commission.amount || 0) / 100;

          return (
            <div
              key={commission.id}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                isNew ? 'bg-green-50/50 dark:bg-green-500/5' : ''
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/10 ${color}`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {TYPE_LABELS[commission.type || ''] || commission.type}
                  </span>
                  {isNew && (
                    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-bold rounded">
                      NEW
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-sm font-bold text-green-500">+${amount.toFixed(2)}</span>
                <p className="text-[10px] text-slate-400">
                  {commission.createdAt && formatTimeAgo(commission.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentActivityFeed;
