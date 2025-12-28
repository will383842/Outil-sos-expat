// src/components/common/CookieBanner.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { X, Cookie, Settings, Shield, Check, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import Button from './Button';
import { updateGA4Consent } from '../../utils/ga4';
import { initializeGTM, updateConsentFromPreferences } from '../../utils/gtm';

/**
 * Cookie Consent Banner Component
 * GDPR-compliant cookie consent manager
 * 
 * Features:
 * - Shows on first visit (if no consent stored)
 * - Granular cookie category controls
 * - Stores consent in localStorage
 * - Can be reopened from footer link
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
          // Invalid data, show banner
          setIsVisible(true);
        }
      } else {
        // No consent yet, show banner
        setIsVisible(true);
      }
    };

    // Check on mount
    checkConsent();

    // Listen for custom event to show banner again (from footer link)
    const handleShowBanner = () => {
      setIsVisible(true);
      setShowDetails(true); // Show details when reopened
    };

    window.addEventListener('showCookieBanner', handleShowBanner);
    
    return () => {
      window.removeEventListener('showCookieBanner', handleShowBanner);
    };
  }, []);

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
    setIsVisible(false);

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

    // Initialize GTM/GA4 if analytics is granted
    if (prefs.analytics) {
      initializeGTM().catch(console.error);
    }

    if (onPreferencesSaved) {
      onPreferencesSaved(prefs);
    }
  };

  const toggleCategory = (category: CookieCategory) => {
    if (category === 'essential') return; // Cannot disable essential
    
    setPreferences((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 ${zIndexClass} ${className}`}
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
    >
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Icon and Main Content */}
            <div className="flex items-start gap-3 flex-1">
              <div className="flex-shrink-0 mt-1">
                <Cookie className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  id="cookie-banner-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white mb-1"
                >
                  {intl.formatMessage({ id: 'cookieBanner.title' })}
                </h3>
                <p
                  id="cookie-banner-description"
                  className="text-sm text-gray-600 dark:text-gray-300 mb-3"
                >
                  {intl.formatMessage({ id: 'cookieBanner.description' })}{' '}
                  <Link
                    to={getCookiePolicyUrl()}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {intl.formatMessage({ id: 'cookieBanner.learnMore' })}
                  </Link>
                </p>

                {/* Detailed Preferences (Collapsible) */}
                {showDetails && (
                  <div className="mt-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    {/* Essential Cookies */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            {intl.formatMessage({ id: 'cookieBanner.essential.title' })}
                          </label>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({intl.formatMessage({ id: 'cookieBanner.alwaysActive' })})
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {intl.formatMessage({ id: 'cookieBanner.essential.description' })}
                        </p>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center justify-center w-10 h-6 bg-green-100 dark:bg-green-900 rounded-full">
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                    </div>

                    {/* Analytics Cookies */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            {intl.formatMessage({ id: 'cookieBanner.analytics.title' })}
                          </label>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {intl.formatMessage({ id: 'cookieBanner.analytics.description' })}
                        </p>
                      </div>
                      <div className="ml-4">
                        <button
                          type="button"
                          onClick={() => toggleCategory('analytics')}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            preferences.analytics
                              ? 'bg-blue-600 dark:bg-blue-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                          role="switch"
                          aria-checked={preferences.analytics}
                          aria-label={intl.formatMessage({ id: 'cookieBanner.analytics.title' })}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              preferences.analytics ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Performance Cookies */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            {intl.formatMessage({ id: 'cookieBanner.performance.title' })}
                          </label>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {intl.formatMessage({ id: 'cookieBanner.performance.description' })}
                        </p>
                      </div>
                      <div className="ml-4">
                        <button
                          type="button"
                          onClick={() => toggleCategory('performance')}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                            preferences.performance
                              ? 'bg-purple-600 dark:bg-purple-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                          role="switch"
                          aria-checked={preferences.performance}
                          aria-label={intl.formatMessage({ id: 'cookieBanner.performance.title' })}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              preferences.performance ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Marketing Cookies */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Settings className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            {intl.formatMessage({ id: 'cookieBanner.marketing.title' })}
                          </label>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {intl.formatMessage({ id: 'cookieBanner.marketing.description' })}
                        </p>
                      </div>
                      <div className="ml-4">
                        <button
                          type="button"
                          onClick={() => toggleCategory('marketing')}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                            preferences.marketing
                              ? 'bg-orange-600 dark:bg-orange-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                          role="switch"
                          aria-checked={preferences.marketing}
                          aria-label={intl.formatMessage({ id: 'cookieBanner.marketing.title' })}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              preferences.marketing ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto lg:flex-shrink-0">
              {!showDetails ? (
                <>
                  <Button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    variant="outline"
                    size="small"
                    className="whitespace-nowrap"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {intl.formatMessage({ id: 'cookieBanner.customize' })}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRejectAll}
                    variant="outline"
                    size="small"
                    className="whitespace-nowrap"
                  >
                    {intl.formatMessage({ id: 'cookieBanner.rejectAll' })}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAcceptAll}
                    variant="primary"
                    size="small"
                    className="whitespace-nowrap"
                  >
                    {intl.formatMessage({ id: 'cookieBanner.acceptAll' })}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={() => setShowDetails(false)}
                    variant="outline"
                    size="small"
                    className="whitespace-nowrap"
                  >
                    <ChevronDown className="w-4 h-4 mr-2 rotate-180" />
                    {intl.formatMessage({ id: 'cookieBanner.showLess' })}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSavePreferences}
                    variant="primary"
                    size="small"
                    className="whitespace-nowrap"
                  >
                    {intl.formatMessage({ id: 'cookieBanner.savePreferences' })}
                  </Button>
                </>
              )}
            </div>
          </div>
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

