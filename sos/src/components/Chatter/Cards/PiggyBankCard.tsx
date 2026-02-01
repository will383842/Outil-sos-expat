/**
 * PiggyBankCard - Tirelire visuelle pour le système chatter
 *
 * Displays a beautiful animated piggy bank with:
 * - Visual fill level based on progress
 * - Social network likes bonus checklist
 * - Progress bar to unlock threshold
 * - Claim button when unlocked
 */

import React, { memo, useState, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Unlock,
  Check,
  Circle,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Gift,
  PartyPopper,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
} from 'lucide-react';

// Custom TikTok icon (not available in lucide-react)
const TikTokIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Design tokens - matching existing Chatter card styles
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  cardHover: "hover:shadow-xl transition-shadow duration-300",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
  button: {
    primary: "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium rounded-xl transition-all",
    disabled: "bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-gray-500 cursor-not-allowed rounded-xl",
  },
} as const;

// Social network icons mapping
const NETWORK_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: TikTokIcon,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
};

const NETWORK_COLORS: Record<string, string> = {
  facebook: 'text-blue-600',
  instagram: 'text-pink-500',
  tiktok: 'text-gray-900 dark:text-white',
  twitter: 'text-sky-500',
  youtube: 'text-red-600',
  linkedin: 'text-blue-700',
};

// Types
export interface SocialNetwork {
  id: string;
  name: string;
  url: string;
  liked: boolean;
  bonus: number; // in cents
}

export interface PiggyBankData {
  isUnlocked: boolean;
  clientEarnings: number; // in cents
  unlockThreshold: number; // in cents
  progressPercent: number;
  amountToUnlock: number; // in cents
  socialLikes: {
    networksAvailable: number;
    networksLiked: number;
    bonusPending: number; // in cents
    bonusPaid: number; // in cents
    networks: SocialNetwork[];
  };
  totalPending: number; // in cents
  message: string;
}

interface PiggyBankCardProps {
  piggyBank: PiggyBankData | null;
  onClaim?: () => void;
  onNetworkClick?: (network: SocialNetwork) => void;
  loading?: boolean;
  claiming?: boolean;
}

const PiggyBankCard = memo(function PiggyBankCard({
  piggyBank,
  onClaim,
  onNetworkClick,
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
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex flex-col items-center">
          <div className={`${UI.skeleton} w-24 h-24 rounded-full mb-4`} />
          <div className={`${UI.skeleton} h-6 w-32 mb-2`} />
          <div className={`${UI.skeleton} h-8 w-24 mb-4`} />
          <div className={`${UI.skeleton} h-3 w-full rounded-full mb-4`} />
          <div className="grid grid-cols-3 gap-2 w-full mb-4">
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
    socialLikes,
    totalPending,
    message,
  } = piggyBank;

  const canClaim = isUnlocked && totalPending > 0;

  return (
    <div className={`${UI.card} ${UI.cardHover} overflow-hidden relative`}>
      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-rose-500/20 z-10 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
              transition={{ type: 'spring', damping: 10 }}
              className="text-center"
            >
              <PartyPopper className="w-12 h-12 text-pink-500 mx-auto mb-2" />
              <p className="text-lg font-bold text-pink-600 dark:text-pink-400">
                <FormattedMessage
                  id="chatter.piggyBank.unlocked"
                  defaultMessage="Unlocked!"
                />
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
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
            {/* Background piggy shape */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 border-4 border-pink-200 dark:border-pink-800/50 overflow-hidden">
              {/* Fill level animation */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-pink-400 to-pink-300 dark:from-pink-600 dark:to-pink-500"
                initial={{ height: 0 }}
                animate={{ height: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  borderRadius: '0 0 100% 100% / 0 0 50% 50%',
                }}
              />

              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            </div>

            {/* Piggy emoji overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl drop-shadow-lg">🐷</span>
            </div>

            {/* Lock/Unlock indicator */}
            <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
              isUnlocked
                ? 'bg-green-500'
                : 'bg-gray-400 dark:bg-gray-600'
            }`}>
              {isUnlocked ? (
                <Unlock className="w-4 h-4 text-white" />
              ) : (
                <Lock className="w-4 h-4 text-white" />
              )}
            </div>
          </div>

          {/* Amount inside piggy */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="bg-white/90 dark:bg-gray-900/90 px-3 py-1 rounded-full shadow-lg backdrop-blur-sm">
              <span className="text-sm font-bold text-pink-600 dark:text-pink-400">
                {formatAmount(totalPending)}
              </span>
            </div>
          </motion.div>
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
          <div className="h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden relative">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 background-animate"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {/* Threshold marker */}
            <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-green-500" />
          </div>

          {/* Status message */}
          <div className="mt-2 text-center">
            {isUnlocked ? (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <FormattedMessage
                  id="chatter.piggyBank.readyToClaim"
                  defaultMessage="Your bonuses are ready!"
                />
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1.5">
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

        {/* Social Networks Checklist */}
        {socialLikes.networks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-pink-500" />
                <FormattedMessage
                  id="chatter.piggyBank.socialBonus"
                  defaultMessage="Social Bonus"
                />
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {socialLikes.networksLiked}/{socialLikes.networksAvailable}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {socialLikes.networks.map((network) => {
                const Icon = NETWORK_ICONS[network.id.toLowerCase()] || Circle;
                const color = NETWORK_COLORS[network.id.toLowerCase()] || 'text-gray-500';

                return (
                  <motion.button
                    key={network.id}
                    onClick={() => onNetworkClick?.(network)}
                    className={`relative flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                      network.liked
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-pink-300 dark:hover:border-pink-700'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Network icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      network.liked
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-white dark:bg-white/10'
                    }`}>
                      <Icon className={`w-4 h-4 ${network.liked ? 'text-green-600' : color}`} />
                    </div>

                    {/* Network name and bonus */}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                        {network.name}
                      </p>
                      <p className={`text-xs ${
                        network.liked
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-pink-600 dark:text-pink-400'
                      }`}>
                        +{formatAmount(network.bonus)}
                      </p>
                    </div>

                    {/* Status indicator */}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      network.liked
                        ? 'bg-green-500'
                        : 'border-2 border-gray-300 dark:border-gray-600'
                    }`}>
                      {network.liked ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : (
                        <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Social bonus summary */}
            {socialLikes.bonusPending > 0 && (
              <div className="mt-2 p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg text-center">
                <p className="text-xs text-pink-700 dark:text-pink-300">
                  <FormattedMessage
                    id="chatter.piggyBank.bonusPending"
                    defaultMessage="{amount} bonus pending"
                    values={{ amount: formatAmount(socialLikes.bonusPending) }}
                  />
                </p>
              </div>
            )}
          </div>
        )}

        {/* Total Pending Display */}
        <div className="p-3 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl mb-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              <FormattedMessage
                id="chatter.piggyBank.totalAvailable"
                defaultMessage="Total available"
              />
            </p>
            <motion.p
              className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent"
              key={totalPending}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              {formatAmount(totalPending)}
            </motion.p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mb-4">
            {message}
          </p>
        )}

        {/* Claim Button */}
        <motion.button
          onClick={onClaim}
          disabled={!canClaim || claiming}
          className={`w-full py-3 font-medium flex items-center justify-center gap-2 ${
            canClaim ? UI.button.primary : UI.button.disabled
          }`}
          whileHover={canClaim ? { scale: 1.02 } : {}}
          whileTap={canClaim ? { scale: 0.98 } : {}}
        >
          {claiming ? (
            <>
              <motion.div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
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
        </motion.button>
      </div>

      {/* Bottom gradient decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500" />

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
      `}</style>
    </div>
  );
});

export default PiggyBankCard;
