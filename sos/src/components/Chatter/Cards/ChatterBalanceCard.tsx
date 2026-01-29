/**
 * ChatterBalanceCard - Tirelire (Piggy Bank) display for chatter
 * Shows available balance, pending balance, and withdrawal status
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { PiggyBank, ArrowRight, Clock, CheckCircle } from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
  },
} as const;

interface ChatterBalanceCardProps {
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  minimumWithdrawal: number;
  canWithdraw: boolean;
  hasPendingWithdrawal: boolean;
  onWithdraw?: () => void;
  loading?: boolean;
}

const ChatterBalanceCard: React.FC<ChatterBalanceCardProps> = ({
  availableBalance,
  pendingBalance,
  validatedBalance,
  minimumWithdrawal,
  canWithdraw,
  hasPendingWithdrawal,
  onWithdraw,
  loading,
}) => {
  const intl = useIntl();

  // Format amount in cents to display
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents);
  };

  const totalBalance = availableBalance + pendingBalance + validatedBalance;
  const progressToMinimum = Math.min(100, (availableBalance / minimumWithdrawal) * 100);

  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
          <div className="h-4 sm:h-5 w-20 sm:w-24 mx-auto mb-2 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
          <div className="h-8 sm:h-10 w-28 sm:w-32 mx-auto mb-3 sm:mb-4 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
          <div className="h-2 w-full mb-2 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
          <div className="h-10 sm:h-12 w-full bg-gray-200 dark:bg-white/10 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${UI.card} ${UI.cardHover} p-4 sm:p-6`}>
      <div className="text-center">
        {/* Piggy Bank Icon */}
        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center">
          <PiggyBank className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
          <FormattedMessage id="chatter.balance.title" defaultMessage="Ma Tirelire" />
        </h3>

        {/* Available Balance (main) */}
        <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-1">
          {formatAmount(availableBalance)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
          <FormattedMessage id="chatter.balance.available" defaultMessage="Disponible" />
        </p>

        {/* Balance Breakdown */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="p-2 sm:p-3 bg-gray-50 dark:bg-white/5 rounded-lg sm:rounded-xl">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500" />
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="chatter.balance.pending" defaultMessage="En attente" />
              </span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              {formatAmount(pendingBalance)}
            </p>
          </div>
          <div className="p-2 sm:p-3 bg-gray-50 dark:bg-white/5 rounded-lg sm:rounded-xl">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="chatter.balance.validated" defaultMessage="Validé" />
              </span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              {formatAmount(validatedBalance)}
            </p>
          </div>
        </div>

        {/* Total */}
        <div className="p-2 sm:p-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg sm:rounded-xl mb-3 sm:mb-4">
          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.balance.total" defaultMessage="Total général" />
          </span>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {formatAmount(totalBalance)}
          </p>
        </div>

        {/* Minimum Withdrawal */}
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
          <FormattedMessage
            id="chatter.balance.minimum"
            defaultMessage="Retrait minimum : {amount}"
            values={{ amount: formatAmount(minimumWithdrawal) }}
          />
        </p>

        {/* Progress to minimum (if not reached) */}
        {availableBalance < minimumWithdrawal && (
          <div className="mb-3 sm:mb-4">
            <div className="h-1.5 sm:h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-500"
                style={{ width: `${progressToMinimum}%` }}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
              <FormattedMessage
                id="chatter.balance.remaining"
                defaultMessage="Encore {amount} avant retrait"
                values={{ amount: formatAmount(minimumWithdrawal - availableBalance) }}
              />
            </p>
          </div>
        )}

        {/* Pending Withdrawal Notice */}
        {hasPendingWithdrawal && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg sm:rounded-xl">
            <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 flex items-center justify-center gap-1.5 sm:gap-2">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <FormattedMessage id="chatter.balance.pendingWithdrawal" defaultMessage="Retrait en cours de traitement" />
            </p>
          </div>
        )}

        {/* Withdraw Button */}
        <button
          onClick={onWithdraw}
          disabled={!canWithdraw}
          className={`w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
            canWithdraw
              ? UI.button.primary
              : "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 cursor-not-allowed"
          }`}
        >
          {canWithdraw ? (
            <>
              <FormattedMessage id="chatter.balance.withdraw" defaultMessage="Retirer mes gains" />
              <ArrowRight className="w-4 h-4" />
            </>
          ) : hasPendingWithdrawal ? (
            <FormattedMessage id="chatter.balance.withdrawPending" defaultMessage="Retrait en cours" />
          ) : availableBalance < minimumWithdrawal ? (
            <FormattedMessage id="chatter.balance.belowMinimum" defaultMessage="Seuil non atteint" />
          ) : (
            <FormattedMessage id="chatter.balance.withdraw" defaultMessage="Retirer mes gains" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatterBalanceCard;
