// src/components/pwa/PWAInstallPrompt.tsx
/**
 * PWA Install Prompt Component for SOS Chatter
 *
 * A beautiful, conversion-optimized PWA install prompt specifically designed
 * for chatters who need fast access to their dashboard to track earnings.
 *
 * Features:
 * - Smart display logic (30s delay, session-once, not-installed check)
 * - Platform detection (iOS/Android/Desktop) with tailored instructions
 * - Bottom sheet on mobile, centered modal on desktop
 * - Animated pulse install button
 * - Urgency/motivation messaging for chatters
 * - Framer Motion animations
 * - Full i18n support
 * - Accessibility compliant
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  Bell,
  WifiOff,
  Download,
  Share,
  Plus,
  Smartphone,
  Monitor,
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useIntl } from 'react-intl';
import { usePWAInstall } from '@/hooks/usePWAInstall';

// ============================================================================
// Constants
// ============================================================================

const LS_KEY_SESSION_SHOWN = 'pwa_chatter_session_shown';
const LS_KEY_DISMISSED_AT = 'pwa_chatter_dismissed_at';
const DISPLAY_DELAY_MS = 30000; // 30 seconds on dashboard
const DISMISS_COOLDOWN_DAYS = 7; // Don't show for 7 days after dismiss

// ============================================================================
// Platform Detection
// ============================================================================

type Platform = 'ios' | 'android' | 'desktop';

const detectPlatform = (): Platform => {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent.toLowerCase();

  // iOS detection
  if (/ipad|iphone|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream) {
    return 'ios';
  }

  // Android detection
  if (/android/.test(ua)) {
    return 'android';
  }

  return 'desktop';
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean })?.standalone === true
  );
};

const isSessionShown = (): boolean => {
  try {
    return sessionStorage.getItem(LS_KEY_SESSION_SHOWN) === 'true';
  } catch {
    return false;
  }
};

const markSessionShown = (): void => {
  try {
    sessionStorage.setItem(LS_KEY_SESSION_SHOWN, 'true');
  } catch {
    // Silently fail
  }
};

const isDismissedRecently = (): boolean => {
  try {
    const dismissedAt = localStorage.getItem(LS_KEY_DISMISSED_AT);
    if (!dismissedAt) return false;
    const daysSince = (Date.now() - Number(dismissedAt)) / 86400000;
    return daysSince < DISMISS_COOLDOWN_DAYS;
  } catch {
    return false;
  }
};

const markDismissed = (): void => {
  try {
    localStorage.setItem(LS_KEY_DISMISSED_AT, String(Date.now()));
  } catch {
    // Silently fail
  }
};

// ============================================================================
// Animation Variants
// ============================================================================

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const mobileSheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 30, stiffness: 300 },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

const desktopModalVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  exit: {
    scale: 0.9,
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.1 + i * 0.05 },
  }),
};

// ============================================================================
// Subcomponents
// ============================================================================

interface BenefitItemProps {
  icon: React.ElementType;
  text: string;
  highlight?: string;
  index: number;
  iconColor: string;
  iconBg: string;
}

const BenefitItem = memo(function BenefitItem({
  icon: Icon,
  text,
  highlight,
  index,
  iconColor,
  iconBg,
}: BenefitItemProps) {
  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3"
    >
      <div className={`flex-shrink-0 w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          {text}
          {highlight && (
            <span className="ml-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {highlight}
            </span>
          )}
        </p>
      </div>
    </motion.div>
  );
});

interface IOSInstructionsProps {
  onClose: () => void;
  onDone: () => void;
}

const IOSInstructions = memo(function IOSInstructions({ onClose, onDone }: IOSInstructionsProps) {
  const intl = useIntl();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 bg-white dark:bg-gray-800 z-10 p-5 flex flex-col rounded-t-3xl sm:rounded-2xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
          {intl.formatMessage({
            id: 'pwa.chatter.ios.title',
            defaultMessage: 'Install SOS Chatter',
          })}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={intl.formatMessage({ id: 'common.close', defaultMessage: 'Close' })}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-5 flex-1">
        {/* Step 1 */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/30">
            1
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <Share className="w-4 h-4 text-blue-500" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {intl.formatMessage({
                  id: 'pwa.chatter.ios.step1.title',
                  defaultMessage: 'Tap the Share button',
                })}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {intl.formatMessage({
                id: 'pwa.chatter.ios.step1.desc',
                defaultMessage: 'At the bottom of Safari browser',
              })}
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/30">
            2
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <Plus className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {intl.formatMessage({
                  id: 'pwa.chatter.ios.step2.title',
                  defaultMessage: 'Add to Home Screen',
                })}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {intl.formatMessage({
                id: 'pwa.chatter.ios.step2.desc',
                defaultMessage: 'Scroll down and tap "Add to Home Screen"',
              })}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-6 w-full min-h-[52px] px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:from-emerald-700 active:to-emerald-800 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all touch-manipulation"
      >
        {intl.formatMessage({
          id: 'pwa.chatter.ios.gotIt',
          defaultMessage: 'Got it!',
        })}
      </button>
    </motion.div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

interface PWAInstallPromptProps {
  /** Force show for testing/demo purposes */
  forceShow?: boolean;
  /** Callback when install is triggered */
  onInstall?: () => void;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = memo(function PWAInstallPrompt({
  forceShow = false,
  onInstall,
  onDismiss,
}) {
  const intl = useIntl();
  const { canPrompt, install, installed } = usePWAInstall();

  const [isVisible, setIsVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const platform = useMemo(() => detectPlatform(), []);
  const isAlreadyInstalled = useMemo(() => isStandalone() || installed, [installed]);
  const isMobile = platform === 'ios' || platform === 'android';

  // Determine if we should show the prompt
  useEffect(() => {
    // Skip if already installed
    if (isAlreadyInstalled && !forceShow) return;

    // Skip if already shown this session
    if (isSessionShown() && !forceShow) return;

    // Skip if dismissed recently
    if (isDismissedRecently() && !forceShow) return;

    // For non-iOS, also check if browser supports install prompt
    if (platform !== 'ios' && !canPrompt && !forceShow) return;

    // Show after delay
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
      markSessionShown();
    }, forceShow ? 0 : DISPLAY_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isAlreadyInstalled, platform, canPrompt, forceShow]);

  // Handle install click
  const handleInstall = useCallback(async () => {
    if (platform === 'ios') {
      setShowIOSInstructions(true);
      return;
    }

    setIsInstalling(true);

    try {
      const result = await install();
      if (result.started) {
        onInstall?.();
        setIsVisible(false);
        markDismissed();
      }
    } catch {
      // Silently fail
    } finally {
      setIsInstalling(false);
    }
  }, [platform, install, onInstall]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    markDismissed();
    onDismiss?.();
  }, [onDismiss]);

  // Handle iOS instructions done
  const handleIOSDone = useCallback(() => {
    setShowIOSInstructions(false);
    setIsVisible(false);
    markDismissed();
    onInstall?.();
  }, [onInstall]);

  // Platform-specific hint - must be before early return
  const platformHint = useMemo(() => {
    switch (platform) {
      case 'ios':
        return intl.formatMessage({
          id: 'pwa.chatter.hint.ios',
          defaultMessage: 'Tap Share then "Add to Home Screen"',
        });
      case 'android':
        return intl.formatMessage({
          id: 'pwa.chatter.hint.android',
          defaultMessage: 'Tap Install to add to your home screen',
        });
      default:
        return intl.formatMessage({
          id: 'pwa.chatter.hint.desktop',
          defaultMessage: 'Install for quick access from your desktop',
        });
    }
  }, [platform, intl]);

  // Don't render if not visible or already installed
  if (!isVisible || (isAlreadyInstalled && !forceShow)) return null;

  // Benefits list with chatter-specific messaging
  const benefits = [
    {
      icon: Bell,
      text: intl.formatMessage({
        id: 'pwa.chatter.benefit.notifications',
        defaultMessage: 'Get notified instantly when you earn!',
      }),
      highlight: intl.formatMessage({
        id: 'pwa.chatter.benefit.notifications.highlight',
        defaultMessage: '+$10',
      }),
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    },
    {
      icon: Zap,
      text: intl.formatMessage({
        id: 'pwa.chatter.benefit.speed',
        defaultMessage: '10x faster than browser',
      }),
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-100 dark:bg-purple-900/50',
    },
    {
      icon: WifiOff,
      text: intl.formatMessage({
        id: 'pwa.chatter.benefit.offline',
        defaultMessage: 'Check earnings offline',
      }),
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    },
    {
      icon: TrendingUp,
      text: intl.formatMessage({
        id: 'pwa.chatter.benefit.tracking',
        defaultMessage: 'Never miss a commission',
      }),
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    },
  ];

  // Platform icon
  const PlatformIcon = platform === 'desktop' ? Monitor : Smartphone;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            aria-hidden="true"
          />

          {/* Modal/Sheet Container */}
          <motion.div
            variants={isMobile ? mobileSheetVariants : desktopModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            className={`fixed z-[101] ${
              isMobile
                ? 'bottom-0 left-0 right-0'
                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4'
            }`}
            style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : undefined}
          >
            <div
              className={`bg-white dark:bg-gray-800 overflow-hidden relative ${
                isMobile ? 'rounded-t-3xl' : 'rounded-2xl shadow-2xl'
              }`}
            >
              {/* iOS Instructions Overlay */}
              <AnimatePresence>
                {showIOSInstructions && (
                  <IOSInstructions
                    onClose={() => setShowIOSInstructions(false)}
                    onDone={handleIOSDone}
                  />
                )}
              </AnimatePresence>

              {/* Drag Handle (Mobile only) */}
              {isMobile && (
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                </div>
              )}

              {/* Header */}
              <div className="px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* App Icon with Gradient */}
                    <div className="relative">
                      <div className="w-16 h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/40">
                        <DollarSign className="w-8 h-8 sm:w-9 sm:h-9 text-white" strokeWidth={2.5} />
                      </div>
                      {/* Notification badge */}
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                        <span className="text-[10px] font-bold text-white">3</span>
                      </div>
                    </div>

                    <div>
                      <h2
                        id="pwa-install-title"
                        className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white"
                      >
                        {intl.formatMessage({
                          id: 'pwa.chatter.title',
                          defaultMessage: 'Install SOS Chatter',
                        })}
                      </h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <PlatformIcon className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">{platformHint}</p>
                      </div>
                    </div>
                  </div>

                  {/* Close button (desktop) */}
                  {!isMobile && (
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label={intl.formatMessage({ id: 'common.close', defaultMessage: 'Close' })}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Urgency Banner */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-800 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <p className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-200">
                      {intl.formatMessage({
                        id: 'pwa.chatter.urgency',
                        defaultMessage: 'Track your $10 commissions in real-time!',
                      })}
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Benefits List */}
              <div className="px-5 pb-4 sm:px-6 sm:pb-5 space-y-3">
                {benefits.map((benefit, index) => (
                  <BenefitItem
                    key={benefit.text}
                    icon={benefit.icon}
                    text={benefit.text}
                    highlight={benefit.highlight}
                    index={index}
                    iconColor={benefit.iconColor}
                    iconBg={benefit.iconBg}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-3">
                {/* Install Button with Pulse Animation */}
                <motion.button
                  type="button"
                  onClick={handleInstall}
                  disabled={isInstalling}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full min-h-[56px] px-6 py-4 text-base font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:from-emerald-700 active:to-emerald-800 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all touch-manipulation disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                >
                  {/* Pulse ring animation */}
                  <span className="absolute inset-0 rounded-2xl">
                    <span className="absolute inset-0 rounded-2xl animate-ping bg-emerald-400 opacity-20" />
                  </span>

                  <span className="relative flex items-center justify-center gap-2">
                    <Download className={`w-5 h-5 ${isInstalling ? 'animate-bounce' : ''}`} />
                    {isInstalling
                      ? intl.formatMessage({
                          id: 'pwa.chatter.installing',
                          defaultMessage: 'Installing...',
                        })
                      : intl.formatMessage({
                          id: 'pwa.chatter.installButton',
                          defaultMessage: 'Install Now - Free',
                        })}
                  </span>
                </motion.button>

                {/* Later Button */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full min-h-[48px] px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors touch-manipulation"
                >
                  {intl.formatMessage({
                    id: 'pwa.chatter.later',
                    defaultMessage: 'Maybe later',
                  })}
                </button>
              </div>

              {/* Social Proof Footer */}
              <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0">
                <div className="text-center">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">
                    {intl.formatMessage({
                      id: 'pwa.chatter.socialProof',
                      defaultMessage: 'Trusted by 1,000+ chatters worldwide',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default PWAInstallPrompt;
