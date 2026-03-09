/**
 * RecentActivityFeed - Last 10 commissions with colored icons by type
 * 2026 glassmorphism design with i18n labels and fade-in animations
 */

import React, { useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Phone, Users, UserPlus, Gift, Crown, Settings, ArrowRight } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { COMMISSION_COLORS } from '@/components/Chatter/designTokens';

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

/** i18n label map — each type maps to its FormattedMessage id + default */
const TYPE_LABEL_KEYS: Record<string, { id: string; defaultMessage: string }> = {
  client_call: { id: 'chatter.commission.type.client_call', defaultMessage: 'Appel client' },
  n1_call: { id: 'chatter.commission.type.n1_call', defaultMessage: 'Appel N1' },
  n2_call: { id: 'chatter.commission.type.n2_call', defaultMessage: 'Appel N2' },
  provider_call: { id: 'chatter.commission.type.provider_call', defaultMessage: 'Appel provider' },
  activation_bonus: { id: 'chatter.commission.type.activation_bonus', defaultMessage: 'Bonus activation' },
  tier_bonus: { id: 'chatter.commission.type.tier_bonus', defaultMessage: 'Bonus tier' },
  telegram_bonus: { id: 'chatter.commission.type.telegram_bonus', defaultMessage: 'Bonus Telegram' },
  captain_call: { id: 'chatter.commission.type.captain_call', defaultMessage: 'Appel captain' },
  manual: { id: 'chatter.commission.type.manual', defaultMessage: 'Ajustement' },
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
  limit: maxItems = 10,
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
    <div className={`bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200/60 dark:border-white/[0.06] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          <FormattedMessage id="chatter.activity.recent" defaultMessage="Activite recente" />
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-indigo-500 hover:text-indigo-600 font-medium inline-flex items-center gap-1 min-h-[44px] px-2 transition-colors duration-200"
          >
            <FormattedMessage id="chatter.activity.viewAll" defaultMessage="Voir tout" />
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {recentCommissions.map((commission, index) => {
          const color = getCommissionColor(commission.type || '');
          const icon = TYPE_ICONS[commission.type || 'manual'] || TYPE_ICONS.manual;
          const isNew = commission.createdAt && new Date(commission.createdAt).getTime() > lastVisit;
          const amount = (commission.amount || 0) / 100;
          const labelKey = TYPE_LABEL_KEYS[commission.type || ''] || TYPE_LABEL_KEYS.manual;
          const filleulName = (commission as any).filleulName;

          return (
            <div
              key={commission.id}
              className={`flex items-center gap-3 px-4 py-3 transition-colors animate-[fadeIn_0.3s_ease-out_forwards] ${
                isNew ? 'bg-green-50/50 dark:bg-green-500/5' : ''
              }`}
              style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/10 ${color}`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {filleulName ? (
                      <>
                        {filleulName}
                        <span className="text-slate-400 dark:text-slate-500"> — </span>
                        <FormattedMessage id={labelKey.id} defaultMessage={labelKey.defaultMessage} />
                      </>
                    ) : (
                      <FormattedMessage id={labelKey.id} defaultMessage={labelKey.defaultMessage} />
                    )}
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

export default React.memo(RecentActivityFeed);
