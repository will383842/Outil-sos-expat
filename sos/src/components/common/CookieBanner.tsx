// src/components/common/CookieBanner.tsx
import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Cookie, Settings, Shield, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { updateGA4Consent } from '../../utils/ga4';
import { initializeGTM, updateConsentFromPreferences } from '../../utils/gtm';
import { updateMetaPixelNativeConsent } from '../../utils/metaPixel';
import { updateGoogleAdsConsent, initializeGoogleAds } from '../../utils/googleAds';

/**
 * Cookie Consent Banner Component
 * GDPR-compliant cookie consent manager - Compact Toast Design
 *
 * Features:
 * - Shows on first visit (if no consent stored)
 * - Compact toast in bottom-left corner (non-intrusive)
 * - Granular cookie category controls (expandable)
 * - Stores consent in localStorage
 * - Can be reopened from footer link
 * - Smooth animations
 * - Fully translated (9 languages)
 */

const COOKIE_CONSENT_KEY = 'cookie_consent';
const COOKIE_PREFERENCES_KEY = 'cookie_preferences';

export type CookieCategory = 'essential' | 'analytics' | 'performance' | 'marketing';

export interface CookiePreferences {
  essential: boolean; // Always true, cannot be disabled
  analytics: boolean;
  performance: boolean;
  marketing: boolean;
  timestamp: number;
  version: string;
}

interface CookieBannerProps {
  /** z-index Tailwind class */
  zIndexClass?: string;
  /** Classes supplémentaires */
  className?: string;
  /** Callback when preferences are saved */
  onPreferencesSaved?: (preferences: CookiePreferences) => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({
  zIndexClass = 'z-[100]',
  className = '',
  onPreferencesSaved,
}) => {
  const intl = useIntl();
  const { language } = useApp();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always enabled
    analytics: false,
    performance: false,
    marketing: false,
    timestamp: Date.now(),
    version: '1.0',
  });

  // Load saved preferences and listen for reopen event
  useEffect(() => {
    const checkConsent = () => {
      const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
      const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);

      if (savedConsent === 'accepted' && savedPreferences) {
        try {
          const parsed = JSON.parse(savedPreferences) as CookiePreferences;
          setPreferences(parsed);
          setIsVisible(false);
        } catch {
          // Invalid data, show banner with animation
          setIsVisible(true);
          setTimeout(() => setIsAnimating(true), 100);
        }
      } else {
        // No consent yet, show banner with animation
        setIsVisible(true);
        setTimeout(() => setIsAnimating(true), 100);
      }
    };

    // Check on mount
    checkConsent();

    // Listen for custom event to show banner again (from footer link)
    const handleShowBanner = () => {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 100);
      setShowDetails(true); // Show details when reopened
    };

    window.addEventListener('showCookieBanner', handleShowBanner);

    return () => {
      window.removeEventListener('showCookieBanner', handleShowBanner);
    };
  }, []);

  // Handle closing with animation
  const closeBanner = () => {
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 300);
  };

  // Get cookie policy URL based on current language
  const getCookiePolicyUrl = () => {
    const localeMap: Record<string, string> = {
      fr: '/fr-fr/cookies',
      en: '/en-us/cookies',
      es: '/es-es/cookies',
      pt: '/pt-pt/cookies',
      de: '/de-de/cookies',
      ru: '/ru-ru/cookies',
      ch: '/zh-cn/cookies',
      hi: '/hi-in/cookies',
      ar: '/ar-sa/cookies',
    };
    return localeMap[language] || '/cookies';
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      performance: true,
      marketing: true,
      timestamp: Date.now(),
      version: '1.0',
    };
    savePreferences(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyEssential: CookiePreferences = {
      essential: true,
      analytics: false,
      performance: false,
      marketing: false,
      timestamp: Date.now(),
      version: '1.0',
    };
    savePreferences(onlyEssential);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  const savePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));

    // Update consent using Consent Mode v2 (GTM + GA4)
    const consentPrefs = {
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      performance: prefs.performance,
    };

    // Update GTM consent (will also update dataLayer)
    updateConsentFromPreferences(consentPrefs);

    // Update GA4 consent as well (for direct GA4 tracking)
    updateGA4Consent(consentPrefs);

    // Update Meta Pixel consent via native fbq API (GDPR compliant)
    updateMetaPixelNativeConsent(prefs.marketing);

    // Initialize GTM/GA4 if analytics is granted
    if (prefs.analytics) {
      initializeGTM().catch(console.error);
    }

    if (onPreferencesSaved) {
      onPreferencesSaved(prefs);
    }

    // Close with animation
    closeBanner();
  };

  const toggleCategory = (category: CookieCategory) => {
    if (category === 'essential') return; // Cannot disable essential
    
    setPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  if (!isVisible) return null;

  // Toggle switch component - optimized for mobile touch targets (44px min)
  const ToggleSwitch = ({
    enabled,
    onChange,
    color = 'blue',
    ariaLabel,
  }: {
    enabled: boolean;
    onChange: () => void;
    color?: 'blue' | 'purple' | 'orange';
    ariaLabel: string;
  }) => {
    const colorClasses = {
      blue: enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
      purple: enabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600',
      orange: enabled ? 'bg-orange-600' : 'bg-gray-300 dark:bg-gray-600',
    };

    return (
      <button
        type="button"
        onClick={onChange}
        className="relative flex items-center justify-center min-w-[44px] min-h-[44px] -my-2 touch-manipulation"
        role="switch"
        aria-checked={enabled}
        aria-label={ariaLabel}
      >
        <span
          className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out ${colorClasses[color]}`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
              enabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
            }`}
          />
        </span>
      </button>
    );
  };

  return (
    <div
      className={`fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-sm ${zIndexClass} ${className} transition-all duration-300 ease-out ${
        isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Compact Header */}
        <div className="p-3 sm:p-4">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="flex-shrink-0 p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <Cookie className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <h3
                  id="cookie-banner-title"
                  className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {intl.formatMessage({ id: 'cookieBanner.title' })}
                </h3>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="ml-2 -mr-1 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 rounded-full transition-colors touch-manipulation"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p
                id="cookie-banner-description"
                className="mt-1 text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed"
              >
                {intl.formatMessage({ id: 'cookieBanner.description' })}{' '}
                <Link
                  to={getCookiePolicyUrl()}
                  className="text-blue-600 dark:text-blue-400 hover:underline active:text-blue-800"
                >
                  {intl.formatMessage({ id: 'cookieBanner.learnMore' })}
                </Link>
              </p>
            </div>
          </div>

          {/* Detailed Preferences (Expandable) */}
          {showDetails && (
            <div className="mt-3 sm:mt-4 space-y-1 pt-3 border-t border-gray-100 dark:border-gray-700">
              {/* Essential - Always on */}
              <div className="flex items-center justify-between py-2 px-1 -mx-1 rounded-lg active:bg-gray-50 dark:active:bg-gray-700/50">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  <span className="text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">
                    {intl.formatMessage({ id: 'cookieBanner.essential.title' })}
                  </span>
                </div>
                <div className="flex items-center justify-center w-9 h-5 bg-green-100 dark:bg-green-900/50 rounded-full">
                  <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between py-2 px-1 -mx-1 rounded-lg active:bg-gray-50 dark:active:bg-gray-700/50">
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">
                    {intl.formatMessage({ id: 'cookieBanner.analytics.title' })}
                  </span>
                </div>
                <ToggleSwitch
                  enabled={preferences.analytics}
                  onChange={() => toggleCategory('analytics')}
                  color="blue"
                  ariaLabel={intl.formatMessage({ id: 'cookieBanner.analytics.title' })}
                />
              </div>

              {/* Performance */}
              <div className="flex items-center justify-between py-2 px-1 -mx-1 rounded-lg active:bg-gray-50 dark:active:bg-gray-700/50">
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">
                    {intl.formatMessage({ id: 'cookieBanner.performance.title' })}
                  </span>
                </div>
                <ToggleSwitch
                  enabled={preferences.performance}
                  onChange={() => toggleCategory('performance')}
                  color="purple"
                  ariaLabel={intl.formatMessage({ id: 'cookieBanner.performance.title' })}
                />
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between py-2 px-1 -mx-1 rounded-lg active:bg-gray-50 dark:active:bg-gray-700/50">
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                  <span className="text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">
                    {intl.formatMessage({ id: 'cookieBanner.marketing.title' })}
                  </span>
                </div>
                <ToggleSwitch
                  enabled={preferences.marketing}
                  onChange={() => toggleCategory('marketing')}
                  color="orange"
                  ariaLabel={intl.formatMessage({ id: 'cookieBanner.marketing.title' })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons - Mobile optimized with min touch target 44px */}
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          {!showDetails ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="flex-1 min-h-[44px] px-3 py-2.5 text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-600 rounded-xl transition-colors touch-manipulation"
              >
                {intl.formatMessage({ id: 'cookieBanner.customize' })}
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 min-h-[44px] px-3 py-2.5 text-[11px] sm:text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors touch-manipulation"
              >
                {intl.formatMessage({ id: 'cookieBanner.acceptAll' })}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRejectAll}
                className="flex-1 min-h-[44px] px-3 py-2.5 text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-600 rounded-xl transition-colors touch-manipulation"
              >
                {intl.formatMessage({ id: 'cookieBanner.rejectAll' })}
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                className="flex-1 min-h-[44px] px-3 py-2.5 text-[11px] sm:text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-colors touch-manipulation"
              >
                {intl.formatMessage({ id: 'cookieBanner.savePreferences' })}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to get current cookie preferences
 */
export const useCookiePreferences = (): CookiePreferences | null => {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch {
        setPreferences(null);
      }
    }
  }, []);

  return preferences;
};

/**
 * Function to show cookie banner again (e.g., from footer link)
 */
export const showCookieBanner = () => {
  localStorage.removeItem(COOKIE_CONSENT_KEY);
  // Trigger re-render by dispatching custom event
  window.dispatchEvent(new CustomEvent('showCookieBanner'));
};

export default CookieBanner;

