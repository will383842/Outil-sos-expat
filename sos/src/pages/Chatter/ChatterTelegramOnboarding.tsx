/**
 * ChatterTelegramOnboarding - Mandatory step after registration
 * User must choose OUI (has Telegram) or NON before accessing dashboard
 *
 * Benefits:
 * - OUI: $50 bonus when their affiliate link is used 10 times
 * - Telegram gives access to exceptional bonuses ($10 to $1000)
 */

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  MessageCircle,
  Gift,
  Trophy,
  DollarSign,
  CheckCircle,
  X,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Download,
} from 'lucide-react';

// Design tokens - Dark theme matching ChatterLanding
const UI = {
  card: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-extrabold rounded-xl transition-all hover:shadow-lg hover:shadow-amber-500/30",
    secondary: "bg-white/5 border-2 border-white/10 text-white font-bold rounded-xl transition-all hover:bg-white/10 hover:border-white/20",
  },
} as const;

const ChatterTelegramOnboarding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const { user, refreshUser, authInitialized, isLoading: authLoading } = useAuth();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<'yes' | 'no' | null>(null);

  // Routes
  const dashboardRoute = `/${getTranslatedRouteSlug('chatter-dashboard' as RouteKey, langCode)}`;
  const loginRoute = `/${getTranslatedRouteSlug('login' as RouteKey, langCode)}`;

  // Redirect if not authenticated or not a chatter
  useEffect(() => {
    if (authInitialized && !authLoading) {
      if (!user) {
        navigate(loginRoute);
      } else if (user.role !== 'chatter') {
        navigate('/dashboard');
      } else if (user.telegramOnboardingCompleted) {
        // Already completed this step
        navigate(dashboardRoute);
      }
    }
  }, [authInitialized, authLoading, user, navigate, loginRoute, dashboardRoute]);

  const functions = getFunctions(undefined, 'europe-west1');

  // Handle option selection and save via Cloud Function
  const handleContinue = async () => {
    if (!selectedOption || !user?.uid) return;

    setLoading(true);
    setError(null);
    try {
      // Call Cloud Function to update Telegram onboarding status
      const updateTelegramOnboardingFn = httpsCallable(functions, 'updateTelegramOnboarding');
      await updateTelegramOnboardingFn({
        hasTelegram: selectedOption === 'yes',
      });

      await refreshUser();
      navigate(dashboardRoute, { replace: true });
    } catch (err) {
      console.error('[TelegramOnboarding] Error:', err);
      setError(
        intl.formatMessage({
          id: 'chatter.telegram.error',
          defaultMessage: 'An error occurred. Please try again.',
        })
      );
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (!authInitialized || authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-950 via-gray-950 to-black">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const bonusExamples = [
    { amount: '$10', label: intl.formatMessage({ id: 'chatter.telegram.bonus.weekly', defaultMessage: 'Weekly challenges' }) },
    { amount: '$50', label: intl.formatMessage({ id: 'chatter.telegram.bonus.affiliate', defaultMessage: '10 affiliate calls' }) },
    { amount: '$100', label: intl.formatMessage({ id: 'chatter.telegram.bonus.milestone', defaultMessage: 'Milestone rewards' }) },
    { amount: '$1000', label: intl.formatMessage({ id: 'chatter.telegram.bonus.top', defaultMessage: 'Top performer' }) },
  ];

  return (
    <Layout showFooter={false}>
      <Helmet>
        <html lang={langCode === 'ch' ? 'zh' : langCode} />
        <title>{intl.formatMessage({ id: 'chatter.telegram.seo.title', defaultMessage: 'Connect Telegram | SOS-Expat' })}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="theme-color" content="#991B1B" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-red-950 via-gray-950 to-black py-8 px-4">
        {/* Radial glow */}
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(251,191,36,0.08),transparent_50%)] pointer-events-none" />

        <div className="max-w-lg mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#0088cc] to-[#00a2e8] flex items-center justify-center shadow-lg shadow-blue-500/30">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
              <FormattedMessage id="chatter.telegram.title" defaultMessage="Unlock Exclusive Bonuses!" />
            </h1>
            <p className="text-gray-400">
              <FormattedMessage id="chatter.telegram.subtitle" defaultMessage="One last step before your dashboard" />
            </p>
          </div>

          {/* Telegram Benefits Card */}
          <div className={`${UI.card} p-6 mb-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-bold text-white">
                  <FormattedMessage id="chatter.telegram.benefits.title" defaultMessage="Why Telegram?" />
                </h2>
                <p className="text-sm text-gray-400">
                  <FormattedMessage id="chatter.telegram.benefits.subtitle" defaultMessage="Get exclusive bonuses & rewards" />
                </p>
              </div>
            </div>

            {/* Bonus Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {bonusExamples.map((bonus, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-xl p-3 text-center"
                >
                  <div className="text-2xl font-black text-amber-400 mb-1">{bonus.amount}</div>
                  <div className="text-xs text-gray-400">{bonus.label}</div>
                </div>
              ))}
            </div>

            {/* Main $50 Bonus Highlight */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-green-300 mb-1">
                    <FormattedMessage id="chatter.telegram.bonus50.title" defaultMessage="Get $50 Bonus!" />
                  </h3>
                  <p className="text-sm text-green-400/80">
                    <FormattedMessage
                      id="chatter.telegram.bonus50.description"
                      defaultMessage="When your affiliate link generates 10 calls, you earn $50 instantly! Telegram members are notified first about bonus opportunities."
                    />
                  </p>
                </div>
              </div>
            </div>

            {/* Feature List */}
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-sm">
                  <FormattedMessage id="chatter.telegram.feature1" defaultMessage="Early access to flash bonuses ($10-$1000)" />
                </span>
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-sm">
                  <FormattedMessage id="chatter.telegram.feature2" defaultMessage="Weekly contests & leaderboard prizes" />
                </span>
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <span className="text-sm">
                  <FormattedMessage id="chatter.telegram.feature3" defaultMessage="Direct support from our team" />
                </span>
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span className="text-sm">
                  <FormattedMessage id="chatter.telegram.feature4" defaultMessage="Exclusive training & tips to earn more" />
                </span>
              </li>
            </ul>
          </div>

          {/* Question Card */}
          <div className={`${UI.card} p-6`}>
            <h3 className="text-lg font-bold text-white mb-4 text-center">
              <FormattedMessage id="chatter.telegram.question" defaultMessage="Do you have Telegram?" />
            </h3>

            {/* Error display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            )}

            {/* Step 1: Initial Question - Only show if no option selected yet */}
            {!selectedOption && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* YES Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedOption('yes')}
                    className="relative p-4 rounded-xl border-2 transition-all bg-white/5 border-white/10 hover:border-green-500/50 hover:bg-green-500/10"
                  >
                    <div className="text-center">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                      <span className="block font-bold text-white">
                        <FormattedMessage id="chatter.telegram.yes" defaultMessage="Yes, I have it!" />
                      </span>
                      <span className="text-xs text-green-400 mt-1 block">
                        <FormattedMessage id="chatter.telegram.yes.bonus" defaultMessage="+$50 bonus available" />
                      </span>
                    </div>
                  </button>

                  {/* NO Option */}
                  <button
                    type="button"
                    onClick={() => setSelectedOption('no')}
                    className="relative p-4 rounded-xl border-2 transition-all bg-white/5 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/10"
                  >
                    <div className="text-center">
                      <Download className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                      <span className="block font-bold text-white">
                        <FormattedMessage id="chatter.telegram.no" defaultMessage="No, not yet" />
                      </span>
                      <span className="text-xs text-amber-400 mt-1 block">
                        <FormattedMessage id="chatter.telegram.no.install" defaultMessage="I'll install it now!" />
                      </span>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Step 2A: YES selected - Confirm and continue */}
            {selectedOption === 'yes' && (
              <div className="space-y-4">
                <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-300">
                        <FormattedMessage id="chatter.telegram.yes.confirmed" defaultMessage="Perfect!" />
                      </h4>
                      <p className="text-sm text-green-400/80">
                        <FormattedMessage
                          id="chatter.telegram.yes.description"
                          defaultMessage="You're eligible for the $50 bonus! We'll send you exclusive opportunities via Telegram."
                        />
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={loading}
                  className={`${UI.button.primary} w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <FormattedMessage id="common.loading" defaultMessage="Loading..." />
                    </>
                  ) : (
                    <>
                      <FormattedMessage id="chatter.telegram.continue" defaultMessage="Continue to Dashboard" />
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOption(null)}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-300"
                >
                  <FormattedMessage id="common.back" defaultMessage="Back" />
                </button>
              </div>
            )}

            {/* Step 2B: NO selected - Install Telegram flow */}
            {selectedOption === 'no' && (
              <div className="space-y-4">
                {/* Strong incentive to install */}
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-5">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Gift className="w-8 h-8 text-black" />
                    </div>
                    <h4 className="text-xl font-black text-white mb-1">
                      <FormattedMessage id="chatter.telegram.install.title" defaultMessage="Don't miss $50!" />
                    </h4>
                    <p className="text-sm text-amber-300">
                      <FormattedMessage
                        id="chatter.telegram.install.description"
                        defaultMessage="Install Telegram in 2 minutes and unlock your $50 bonus + exclusive rewards up to $1000!"
                      />
                    </p>
                  </div>

                  {/* Install buttons for different platforms */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <a
                      href="https://apps.apple.com/app/telegram-messenger/id686449807"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-black/30 hover:bg-black/50 border border-white/10 rounded-xl transition-colors"
                    >
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      <span className="text-sm font-medium text-white">App Store</span>
                    </a>
                    <a
                      href="https://play.google.com/store/apps/details?id=org.telegram.messenger"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-black/30 hover:bg-black/50 border border-white/10 rounded-xl transition-colors"
                    >
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                      </svg>
                      <span className="text-sm font-medium text-white">Play Store</span>
                    </a>
                  </div>

                  <a
                    href="https://telegram.org/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm text-amber-400 hover:text-amber-300"
                  >
                    <FormattedMessage id="chatter.telegram.desktop" defaultMessage="Or download for desktop" />
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* "I just installed it!" button */}
                <button
                  type="button"
                  onClick={() => setSelectedOption('yes')}
                  className={`${UI.button.primary} w-full py-4 flex items-center justify-center gap-2`}
                >
                  <CheckCircle className="w-5 h-5" />
                  <FormattedMessage id="chatter.telegram.justInstalled" defaultMessage="I just installed Telegram!" />
                </button>

                {/* Continue without - discouraged */}
                <div className="pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={loading}
                    className="w-full py-3 text-gray-500 hover:text-gray-400 text-sm flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                        <FormattedMessage id="common.loading" defaultMessage="Loading..." />
                      </>
                    ) : (
                      <>
                        <FormattedMessage id="chatter.telegram.skipForNow" defaultMessage="Continue without Telegram (miss $50 bonus)" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-600 mt-2">
                    <FormattedMessage
                      id="chatter.telegram.skipWarning"
                      defaultMessage="You can add Telegram later from your dashboard settings"
                    />
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOption(null)}
                  className="w-full text-center text-sm text-gray-500 hover:text-gray-300"
                >
                  <FormattedMessage id="common.back" defaultMessage="Back" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatterTelegramOnboarding;
