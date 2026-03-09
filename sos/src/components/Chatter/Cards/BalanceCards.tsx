/**
 * BalanceCards - 3 mini balance cards (Available, Pending, Locked)
 * Each with colored left border, amount, and contextual info
 * 2026 glassmorphism design with indigo/violet accents
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Wallet, Clock, Lock, ArrowRight } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { BALANCE_VARIANTS, SPACING } from '@/components/Chatter/designTokens';
import { HelpTooltip } from '@/components/Chatter/Layout/HelpTooltip';

interface BalanceCardsProps {
  onNavigateToWithdraw?: () => void;
  className?: string;
}

const BalanceCards: React.FC<BalanceCardsProps> = ({ onNavigateToWithdraw, className = '' }) => {
  const intl = useIntl();
  const { dashboardData, canWithdraw, minimumWithdrawal } = useChatterData();
  const chatter = dashboardData?.chatter;

  const available = (chatter?.availableBalance || 0) / 100;
  const pending = (chatter?.pendingBalance || 0) / 100;
  const locked = (chatter?.validatedBalance || 0) / 100;

  // Minimum withdrawal in dollars (from config, fallback 3000 cents = $30)
  const minWithdrawalDollars = (minimumWithdrawal || dashboardData?.config?.minimumWithdrawalAmount || 3000) / 100;

  const cards = [
    {
      key: 'available',
      label: <FormattedMessage id="chatter.balance.available" defaultMessage="Disponible" />,
      amount: available,
      icon: <Wallet className="w-4 h-4" />,
      variant: BALANCE_VARIANTS.available,
      tooltip: intl.formatMessage({ id: 'chatter.balance.tooltip.available', defaultMessage: 'Amount ready for withdrawal' }),
      action: canWithdraw ? (
        <button
          onClick={onNavigateToWithdraw}
          className="mt-2 w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-1 min-h-[36px] animate-pulse hover:animate-none shadow-md shadow-indigo-500/25"
        >
          <FormattedMessage id="chatter.balance.withdraw" defaultMessage="Retirer" />
          <ArrowRight className="w-3 h-3" />
        </button>
      ) : available > 0 && available < minWithdrawalDollars ? (
        <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          <FormattedMessage
            id="chatter.balance.needMore"
            defaultMessage="Encore ${amount} pour retirer"
            values={{ amount: (minWithdrawalDollars - available).toFixed(2) }}
          />
        </p>
      ) : null,
    },
    {
      key: 'pending',
      label: <FormattedMessage id="chatter.balance.pending" defaultMessage="En attente" />,
      amount: pending,
      icon: <Clock className="w-4 h-4" />,
      variant: BALANCE_VARIANTS.pending,
      tooltip: intl.formatMessage({ id: 'chatter.balance.tooltip.pending', defaultMessage: 'Your commissions are validated after 48h to prevent fraud' }),
      action: null,
    },
    {
      key: 'locked',
      label: <FormattedMessage id="chatter.balance.locked" defaultMessage="Verrouille" />,
      amount: locked,
      icon: <Lock className="w-4 h-4" />,
      variant: BALANCE_VARIANTS.locked,
      tooltip: chatter?.telegramOnboardingCompleted
        ? intl.formatMessage({ id: 'chatter.balance.tooltip.lockedTelegram', defaultMessage: 'Earn $150 in client commissions to unlock your $50 Telegram bonus' })
        : intl.formatMessage({ id: 'chatter.balance.tooltip.lockedValidated', defaultMessage: 'Validated balance, available soon' }),
      action: null,
    },
  ];

  return (
    <div className={`grid grid-cols-3 ${SPACING.cardGap} ${className}`}>
      {cards.map((card) => (
        <div
          key={card.key}
          className={`bg-white/80 dark:bg-white/[0.03] backdrop-blur-xl border border-slate-200/60 dark:border-white/[0.06] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${card.variant.border} p-3 sm:p-4 transition-all duration-200`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`${card.variant.icon}`}>{card.icon}</span>
            <span className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {card.label}
            </span>
            <HelpTooltip text={card.tooltip} />
          </div>
          <p className={`text-lg sm:text-xl font-bold tabular-nums ${
            card.key === 'available' && card.amount > 0 ? 'text-green-500' : 'text-slate-900 dark:text-white'
          }`}>
            ${card.amount.toFixed(2)}
          </p>
          {card.action}
        </div>
      ))}
    </div>
  );
};

export default BalanceCards;
