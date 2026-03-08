/**
 * BalanceCards - 3 mini balance cards (Available, Pending, Locked)
 * Each with colored left border, amount, and contextual info
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Wallet, Clock, Lock, ArrowRight } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { UI, BALANCE_VARIANTS, SPACING } from '@/components/Chatter/designTokens';
import { HelpTooltip } from '@/components/Chatter/Layout/HelpTooltip';

interface BalanceCardsProps {
  onNavigateToWithdraw?: () => void;
  className?: string;
}

const BalanceCards: React.FC<BalanceCardsProps> = ({ onNavigateToWithdraw, className = '' }) => {
  const { dashboardData, canWithdraw } = useChatterData();
  const chatter = dashboardData?.chatter;

  const available = (chatter?.availableBalance || 0) / 100;
  const pending = (chatter?.pendingBalance || 0) / 100;
  const locked = (chatter?.validatedBalance || 0) / 100;

  const cards = [
    {
      key: 'available',
      label: <FormattedMessage id="chatter.balance.available" defaultMessage="Disponible" />,
      amount: available,
      icon: <Wallet className="w-4 h-4" />,
      variant: BALANCE_VARIANTS.available,
      tooltip: 'Montant pret pour le retrait',
      action: canWithdraw ? (
        <button
          onClick={onNavigateToWithdraw}
          className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors inline-flex items-center justify-center gap-1 min-h-[36px] animate-pulse hover:animate-none"
        >
          <FormattedMessage id="chatter.balance.withdraw" defaultMessage="Retirer" />
          <ArrowRight className="w-3 h-3" />
        </button>
      ) : available > 0 && available < 30 ? (
        <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          <FormattedMessage
            id="chatter.balance.needMore"
            defaultMessage="Encore ${amount} pour retirer"
            values={{ amount: (30 - available).toFixed(2) }}
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
      tooltip: 'Vos commissions sont validees apres 48h pour prevenir la fraude',
      action: null,
    },
    {
      key: 'locked',
      label: <FormattedMessage id="chatter.balance.locked" defaultMessage="Verrouille" />,
      amount: locked,
      icon: <Lock className="w-4 h-4" />,
      variant: BALANCE_VARIANTS.locked,
      tooltip: chatter?.telegramOnboardingCompleted
        ? 'Gagnez $150 en commissions clients pour debloquer vos $50 de bonus Telegram'
        : 'Balance validee, bientot disponible',
      action: null,
    },
  ];

  return (
    <div className={`grid grid-cols-3 ${SPACING.cardGap} ${className}`}>
      {cards.map((card) => (
        <div
          key={card.key}
          className={`${UI.card} ${card.variant.border} p-3 sm:p-4`}
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
