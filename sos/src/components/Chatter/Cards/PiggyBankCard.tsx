/**
 * PiggyBankCard - Tirelire visuelle pour le système chatter
 *
 * Displays a beautiful animated piggy bank with:
 * - Visual fill level based on progress
 * - Progress bar to unlock threshold
 * - Claim button when unlocked
 */

import React, { memo, useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Lock,
  Unlock,
  Sparkles,
  TrendingUp,
  PartyPopper,
} from 'lucide-react';

import { UI } from '@/components/Chatter/designTokens';

// PiggyBank-specific button overrides (violet glassmorphism theme)
const PIGGY_BUTTON = {
  primary: "bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-500/25",
  disabled: "bg-white/[0.06] backdrop-blur-sm text-gray-400 dark:text-gray-500 cursor-not-allowed rounded-xl border border-white/[0.06]",
} as const;

// Types
export interface PiggyBankData {
  isUnlocked: boolean;
  clientEarnings: number; // in cents
  unlockThreshold: number; // in cents
  progressPercent: number;
  amountToUnlock: number; // in cents
  totalPending: number; // in cents
  message: string;
}

interface PiggyBankCardProps {
  piggyBank: PiggyBankData | null;
  onClaim?: () => void;
  loading?: boolean;
  claiming?: boolean;
}

const PiggyBankCard = memo(function PiggyBankCard({
  piggyBank,
  onClaim,
  loading = false,
  claiming = false,
}: PiggyBankCardProps) {
  const intl = useIntl();
  const [showCelebration, setShowCelebration] = useState(false);

  // Format amount in cents to display
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Show celebration when unlocked
  useEffect(() => {
    if (piggyBank?.isUnlocked && piggyBank.totalPending > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [piggyBank?.isUnlocked, piggyBank?.totalPending]);

  // Loading skeleton
  if (loading || !piggyBank) {
    return (
      <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 sm:p-6">
        <div className="flex items-center">
          <div className={`${UI.skeleton} w-24 h-24 rounded-full mb-4`} />
          <div className={`${UI.skeleton} h-6 w-32 mb-2`} />
          <div className={`${UI.skeleton} h-8 w-24 mb-4`} />
          <div className={`${UI.skeleton} h-3 w-full rounded-full mb-4`} />
          <div className="grid gap-2 w-full mb-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`${UI.skeleton} h-12 rounded-lg`} />
            ))}
          </div>
          <div className={`${UI.skeleton} h-12 w-full rounded-xl`} />
        </div>
      </div>
    );
  }

  const {
    isUnlocked,
    clientEarnings,
    unlockThreshold,
    progressPercent,
    amountToUnlock,
    totalPending,
    message,
  } = piggyBank;

  const canClaim = isUnlocked && totalPending > 0;

  return (
    <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden relative hover:bg-white/[0.06] transition-colors duration-300">
      {/* Celebration overlay */}
      <>
        {showCelebration && (
          <div
            className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 z-10 flex items-center justify-center animate-fade-in backdrop-blur-sm"
          >
            <div
              className="text-center animate-fade-in"
            >
              <PartyPopper className="w-12 h-12 text-violet-400 mx-auto mb-2" />
              <p className="text-lg text-violet-300 font-bold">
                <FormattedMessage
                  id="chatter.piggyBank.unlocked"
                  defaultMessage="Unlocked!"
                />
              </p>
            </div>
          </div>
        )}
      </>

      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h3 className="text-lg dark:text-white font-bold flex items-center justify-center gap-2">
            <span className="text-2xl">🐷</span>
            <FormattedMessage
              id="chatter.piggyBank.title"
              defaultMessage="Ma Tirelire"
            />
          </h3>
        </div>

        {/* Visual Piggy Bank */}
        <div className="relative mx-auto w-32 h-32 mb-4">
          {/* Piggy bank container */}
          <div className="relative w-full h-full">
            {/* Gradient ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 p-[3px]">
              <div className="w-full h-full rounded-full bg-slate-950/80 overflow-hidden relative">
                {/* Fill level animation */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-violet-400 to-purple-500 transition-all duration-1000 ease-out opacity-80"
                  style={{
                    height: `${progressPercent}%`,
                    borderRadius: '0 0 100% 100% / 0 0 50% 50%',
                  }}
                />

                {/* Shimmer effect */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slide"
                />
              </div>
            </div>

            {/* Piggy emoji overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl drop-shadow-lg">🐷</span>
            </div>

            {/* Lock/Unlock indicator */}
            <div className={`absolute -bottom-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
              isUnlocked
                ? 'bg-green-500 shadow-green-500/30'
                : 'bg-slate-500 dark:bg-slate-600'
            }`}>
              {isUnlocked ? (
                <Unlock className="w-4 h-4 text-white" />
              ) : (
                <Lock className="w-4 h-4 text-white" />
              )}
            </div>
          </div>

          {/* Amount inside piggy */}
          <div
            className="absolute inset-0 flex items-center justify-center animate-fade-in"
          >
            <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/[0.08]">
              <span className="text-sm text-violet-300 font-bold">
                {formatAmount(totalPending)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar to unlock */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <FormattedMessage
                id="chatter.piggyBank.progress"
                defaultMessage="Progress"
              />
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatAmount(clientEarnings)} / {formatAmount(unlockThreshold)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 background-animate transition-all duration-800 ease-out shadow-[0_0_12px_rgba(139,92,246,0.4)]"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Threshold marker */}
            <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-green-500" />
          </div>

          {/* Status message */}
          <div className="mt-2 text-center">
            {isUnlocked ? (
              <p className="text-sm dark:text-green-400 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <FormattedMessage
                  id="chatter.piggyBank.readyToClaim"
                  defaultMessage="Your bonuses are ready!"
                />
              </p>
            ) : (
              <p className="text-sm dark:text-gray-400 flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <FormattedMessage
                  id="chatter.piggyBank.amountToUnlock"
                  defaultMessage="Earn {amount} more to unlock"
                  values={{ amount: formatAmount(amountToUnlock) }}
                />
              </p>
            )}
          </div>
        </div>

        {/* Total Pending Display */}
        <div className="p-3 bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-xl mb-4">
          <div className="text-center">
            <p className="text-xs dark:text-gray-400 mb-1">
              <FormattedMessage
                id="chatter.piggyBank.totalAvailable"
                defaultMessage="Total available"
              />
            </p>
            <p
              className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent transition-transform duration-300"
            >
              {formatAmount(totalPending)}
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <p className="text-xs dark:text-gray-400 mb-4">
            {message}
          </p>
        )}

        {/* Claim Button */}
        <button
          onClick={onClaim}
          disabled={!canClaim || claiming}
          className={`w-full py-3 font-medium flex items-center justify-center gap-2 transition-transform ${
            canClaim ? `${PIGGY_BUTTON.primary} hover:scale-[1.02] active:scale-[0.98]` : PIGGY_BUTTON.disabled
          }`}
        >
          {claiming ? (
            <>
              <div
                className="w-5 h-5 border-2 rounded-full animate-spin"
              />
              <FormattedMessage
                id="chatter.piggyBank.claiming"
                defaultMessage="Claiming..."
              />
            </>
          ) : canClaim ? (
            <>
              <Sparkles className="w-5 h-5" />
              <FormattedMessage
                id="chatter.piggyBank.claim"
                defaultMessage="Claim my bonuses"
              />
            </>
          ) : isUnlocked ? (
            <FormattedMessage
              id="chatter.piggyBank.noBonuses"
              defaultMessage="No bonuses to claim"
            />
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <FormattedMessage
                id="chatter.piggyBank.locked"
                defaultMessage="Locked"
              />
            </>
          )}
        </button>
      </div>

      {/* Bottom gradient decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      {/* CSS for background animation */}
      <style>{`
        .background-animate {
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shimmerSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer-slide {
          animation: shimmerSlide 2s ease-in-out infinite;
          animation-delay: 3s;
        }
      `}</style>
    </div>
  );
});

export default PiggyBankCard;
