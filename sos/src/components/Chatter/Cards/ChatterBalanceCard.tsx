/**
 * ChatterBalanceCard - Tirelire (Piggy Bank) display for chatter
 * Shows available balance, pending balance, and withdrawal status
 *
 * Features:
 * - Animated balance count-up
 * - Smooth progress bar fill animation
 * - Hover lift effect
 * - Shimmer loading state
 * - Sparkle effect when reaching withdrawal threshold
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { PiggyBank, ArrowRight, Clock, CheckCircle, Sparkles } from 'lucide-react';
import { formatCurrencyLocale } from './currencyUtils';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

// Design tokens with enhanced effects
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: `
    transition-all duration-300 ease-out
    hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-white/5
    hover:-translate-y-1
  `,
  skeleton: `
    relative overflow-hidden
    bg-gray-200 dark:bg-white/10 rounded
    before:absolute before:inset-0
    before:-translate-x-full
    before:animate-shimmer
    before:bg-gradient-to-r
    before:from-transparent
    before:via-white/20
    before:to-transparent
    dark:before:via-white/10
  `,
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all active:scale-[0.98]",
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
  /** Animation delay for staggered entrance (in ms) */
  animationDelay?: number;
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
  animationDelay = 0,
}) => {
  const intl = useIntl();
  const [progressAnimated, setProgressAnimated] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);

  // Trigger progress bar animation after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgressAnimated(true);
    }, animationDelay + 300);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  // Show sparkle effect when balance reaches threshold
  useEffect(() => {
    if (canWithdraw && availableBalance >= minimumWithdrawal) {
      setShowSparkle(true);
      const timer = setTimeout(() => setShowSparkle(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [canWithdraw, availableBalance, minimumWithdrawal]);

  // Format amount in cents to USD display
  const formatAmount = (cents: number) => {
    return formatCurrencyLocale(cents, intl.locale);
  };

  const totalBalance = availableBalance + pendingBalance + validatedBalance;
  const progressToMinimum = Math.min(100, (availableBalance / minimumWithdrawal) * 100);

  // Loading skeleton with shimmer effect
  if (loading) {
    return (
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="text-center">
          <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full ${UI.skeleton}`} />
          <div className={`h-4 sm:h-5 w-20 sm:w-24 mx-auto mb-2 ${UI.skeleton}`} />
          <div className={`h-8 sm:h-10 w-28 sm:w-32 mx-auto mb-3 sm:mb-4 ${UI.skeleton}`} />
          <div className={`h-2 w-full mb-2 ${UI.skeleton} rounded-full`} />
          <div className={`h-10 sm:h-12 w-full ${UI.skeleton} rounded-xl`} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${UI.card} ${UI.cardHover} p-4 sm:p-6 relative opacity-0 animate-fade-in-up`}
      style={{
        animationDelay: `${animationDelay}ms`,
        animationFillMode: 'forwards',
      }}
    >
      {/* Sparkle overlay for milestone */}
      {showSparkle && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(6)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute w-4 h-4 text-yellow-400 animate-sparkle"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${10 + Math.random() * 80}%`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
      )}

      <div className="text-center">
        {/* Piggy Bank Icon with pulse when withdrawable */}
        <div
          className={`
            w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full
            bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30
            flex items-center justify-center
            transition-all duration-500
            ${canWithdraw ? 'animate-pulse-subtle shadow-lg shadow-red-500/20' : ''}
          `}
        >
          <PiggyBank className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
          <FormattedMessage id="chatter.balance.title" defaultMessage="Ma Tirelire" />
        </h3>

        {/* Available Balance (main) - Animated */}
        <div className="mb-1">
          <AnimatedNumber
            value={availableBalance}
            isCurrency
            currencyCode="USD"
            duration={1500}
            delay={animationDelay + 200}
            animateOnVisible
            className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent"
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">
          <FormattedMessage id="chatter.balance.available" defaultMessage="Disponible" />
        </p>

        {/* Balance Breakdown */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="p-2 sm:p-3 bg-gray-50 dark:bg-white/5 rounded-lg sm:rounded-xl transition-transform hover:scale-[1.02]">
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
          <div className="p-2 sm:p-3 bg-gray-50 dark:bg-white/5 rounded-lg sm:rounded-xl transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                <FormattedMessage id="chatter.balance.validated" defaultMessage="Valide" />
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
            <FormattedMessage id="chatter.balance.total" defaultMessage="Total general" />
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

        {/* Progress to minimum (if not reached) - Animated fill */}
        {availableBalance < minimumWithdrawal && (
          <div className="mb-3 sm:mb-4">
            <div className="h-1.5 sm:h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: progressAnimated ? `${progressToMinimum}%` : '0%',
                }}
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

        {/* Milestone reached indicator */}
        {availableBalance >= minimumWithdrawal && !hasPendingWithdrawal && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg sm:rounded-xl animate-fade-in">
            <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 flex items-center justify-center gap-1.5 sm:gap-2 font-medium">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <FormattedMessage id="chatter.balance.readyToWithdraw" defaultMessage="Pret pour le retrait !" />
            </p>
          </div>
        )}

        {/* Pending Withdrawal Notice */}
        {hasPendingWithdrawal && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg sm:rounded-xl">
            <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 flex items-center justify-center gap-1.5 sm:gap-2">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin-slow" />
              <FormattedMessage id="chatter.balance.pendingWithdrawal" defaultMessage="Retrait en cours de traitement" />
            </p>
          </div>
        )}

        {/* Withdraw Button - 48px minimum touch target with enhanced feedback */}
        <button
          onClick={onWithdraw}
          disabled={!canWithdraw}
          className={`
            w-full min-h-[48px] py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-medium
            transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2
            touch-manipulation
            ${canWithdraw
              ? `${UI.button.primary} hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/20`
              : "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }
          `}
        >
          {canWithdraw ? (
            <>
              <FormattedMessage id="chatter.balance.withdraw" defaultMessage="Retirer mes gains" />
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
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
