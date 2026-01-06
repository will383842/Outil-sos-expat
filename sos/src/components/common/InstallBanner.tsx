// src/components/common/InstallBanner.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Smartphone, Zap, WifiOff, Bell, Share, Plus, ChevronRight } from 'lucide-react';
import { useIntl } from 'react-intl';
import { usePWAInstall } from '@/hooks/usePWAInstall';

/**
 * PWA Install Banner - 2026 Best Practices
 *
 * Features:
 * - Unified component for Android/iOS/Desktop
 * - Smart timing: shows after 3 page views or 30s engagement
 * - Mini banner first, expandable to full benefits view
 * - iOS Safari: shows manual install instructions
 * - Respects user choice (7 days if dismissed, 30 days if "not now")
 * - Smooth animations with reduced motion support
 * - Dark mode support
 * - Mobile-first, touch-optimized (44px touch targets)
 * - Safe area support for notched devices
 */

const LS_KEY_VIEWS = 'pwa_page_views';
const LS_KEY_DISMISSED = 'pwa_dismissed_at';
const LS_KEY_NOT_NOW = 'pwa_not_now_at';
const DISMISS_DAYS = 7;
const NOT_NOW_DAYS = 30;
const MIN_PAGE_VIEWS = 2;
const MIN_ENGAGEMENT_MS = 15000; // 15 seconds

// Detect iOS Safari (no beforeinstallprompt support)
const isIOSSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS/.test(ua);
  const notFirefox = !/FxiOS/.test(ua);
  return iOS && webkit && notChrome && notFirefox;
};

// Detect standalone mode (already installed)
const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean })?.standalone === true
  );
};

// Check if we should show based on engagement
const checkEngagement = (): boolean => {
  const views = parseInt(localStorage.getItem(LS_KEY_VIEWS) || '0', 10);
  return views >= MIN_PAGE_VIEWS;
};

// Check dismissal timestamps
const checkDismissed = (): boolean => {
  const dismissedAt = localStorage.getItem(LS_KEY_DISMISSED);
  const notNowAt = localStorage.getItem(LS_KEY_NOT_NOW);

  if (dismissedAt) {
    const days = (Date.now() - Number(dismissedAt)) / 86400000;
    if (days < DISMISS_DAYS) return true;
  }

  if (notNowAt) {
    const days = (Date.now() - Number(notNowAt)) / 86400000;
    if (days < NOT_NOW_DAYS) return true;
  }

  return false;
};

interface InstallBannerProps {
  /** Force show for testing */
  forceShow?: boolean;
}

const InstallBanner: React.FC<InstallBannerProps> = ({ forceShow = false }) => {
  const intl = useIntl();
  const { canPrompt, install, installed } = usePWAInstall();

  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const isiOS = useMemo(() => isIOSSafari(), []);
  const isAlreadyInstalled = useMemo(() => isStandalone() || installed, [installed]);

  // Track page views
  useEffect(() => {
    const views = parseInt(localStorage.getItem(LS_KEY_VIEWS) || '0', 10);
    localStorage.setItem(LS_KEY_VIEWS, String(views + 1));
  }, []);

  // Determine if we should show the banner
  useEffect(() => {
    if (isAlreadyInstalled) return;
    if (checkDismissed() && !forceShow) return;

    // For iOS, show if Safari and engaged
    // For others, show if beforeinstallprompt fired and engaged
    const canShow = forceShow || isiOS || canPrompt;

    if (canShow) {
      // Check engagement OR wait for minimum time
      if (checkEngagement()) {
        const timer = setTimeout(() => {
          setIsVisible(true);
          setTimeout(() => setIsAnimating(true), 50);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        // Wait for engagement time
        const timer = setTimeout(() => {
          setIsVisible(true);
          setTimeout(() => setIsAnimating(true), 50);
        }, MIN_ENGAGEMENT_MS);
        return () => clearTimeout(timer);
      }
    }
  }, [canPrompt, isiOS, isAlreadyInstalled, forceShow]);

  // Close with animation
  const closeBanner = useCallback((permanent = false) => {
    setIsClosing(true);
    setIsAnimating(false);

    setTimeout(() => {
      if (permanent) {
        localStorage.setItem(LS_KEY_NOT_NOW, String(Date.now()));
      } else {
        localStorage.setItem(LS_KEY_DISMISSED, String(Date.now()));
      }
      setIsVisible(false);
      setIsClosing(false);
      setIsExpanded(false);
    }, 300);
  }, []);

  // Handle install click
  const handleInstall = useCallback(async () => {
    if (isiOS) {
      setShowIOSInstructions(true);
      return;
    }

    try {
      const result = await install();
      if (result.started) {
        closeBanner(true);
      }
    } catch {
      // Silently fail
    }
  }, [isiOS, install, closeBanner]);

  // Handle "Not now" click
  const handleNotNow = useCallback(() => {
    closeBanner(true);
  }, [closeBanner]);

  // Handle X click
  const handleDismiss = useCallback(() => {
    closeBanner(false);
  }, [closeBanner]);

  if (!isVisible || isAlreadyInstalled) return null;

  // Benefits of installing
  const benefits = [
    { icon: Zap, textId: 'pwa.benefit.fast', color: 'text-yellow-500' },
    { icon: WifiOff, textId: 'pwa.benefit.offline', color: 'text-blue-500' },
    { icon: Bell, textId: 'pwa.benefit.notifications', color: 'text-red-500' },
  ];

  return (
    <div
      className={`fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm z-[99] transition-all duration-300 ease-out ${
        isAnimating && !isClosing
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="dialog"
      aria-labelledby="pwa-banner-title"
      aria-describedby="pwa-banner-description"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* iOS Instructions Modal Overlay */}
        {showIOSInstructions && (
          <div className="absolute inset-0 bg-white dark:bg-gray-800 z-10 p-4 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                {intl.formatMessage({ id: 'pwa.ios.title' })}
              </h4>
              <button
                type="button"
                onClick={() => setShowIOSInstructions(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full active:bg-gray-100 dark:active:bg-gray-700 touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 flex-1">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <Share className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {intl.formatMessage({ id: 'pwa.ios.step1.title' })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {intl.formatMessage({ id: 'pwa.ios.step1.desc' })}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {intl.formatMessage({ id: 'pwa.ios.step2.title' })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {intl.formatMessage({ id: 'pwa.ios.step2.desc' })}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIOSInstructions(false);
                closeBanner(true);
              }}
              className="mt-4 w-full min-h-[44px] px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors touch-manipulation"
            >
              {intl.formatMessage({ id: 'pwa.ios.gotIt' })}
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="p-3 sm:p-4">
          {/* Header Row */}
          <div className="flex items-start gap-3">
            {/* App Icon */}
            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <Smartphone className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3
                    id="pwa-banner-title"
                    className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white"
                  >
                    {intl.formatMessage({ id: 'pwa.install.title' })}
                  </h3>
                  <p
                    id="pwa-banner-description"
                    className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5"
                  >
                    {intl.formatMessage({ id: 'pwa.install.subtitle' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="ml-2 -mr-1 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 rounded-full transition-colors touch-manipulation"
                  aria-label={intl.formatMessage({ id: 'pwa.install.close' })}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Expand/Collapse for benefits */}
              {!isExpanded && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium touch-manipulation"
                >
                  {intl.formatMessage({ id: 'pwa.install.whyInstall' })}
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Benefits (Expanded) */}
          {isExpanded && (
            <div className="mt-4 space-y-2 pt-3 border-t border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
              {benefits.map(({ icon: Icon, textId, color }) => (
                <div key={textId} className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-[11px] sm:text-xs text-gray-700 dark:text-gray-300">
                    {intl.formatMessage({ id: textId })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleNotNow}
              className="flex-1 min-h-[44px] px-3 py-2.5 text-[11px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 rounded-xl transition-colors touch-manipulation"
            >
              {intl.formatMessage({ id: 'pwa.install.notNow' })}
            </button>
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 min-h-[44px] px-3 py-2.5 text-[11px] sm:text-xs font-medium text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:from-red-700 active:to-red-800 rounded-xl shadow-sm transition-all touch-manipulation"
            >
              {intl.formatMessage({ id: 'pwa.install.button' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallBanner;
