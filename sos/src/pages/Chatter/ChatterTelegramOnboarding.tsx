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
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
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

  // Handle option selection and save to Firestore
  const handleContinue = async () => {
    if (!selectedOption || !user?.uid) return;

    setLoading(true);
    try {
      // Update user document with Telegram choice
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        hasTelegram: selectedOption === 'yes',
        telegramOnboardingCompleted: true,
        telegramOnboardingAt: new Date().toISOString(),
      });

      // Also update chatters document if it exists
      try {
        const chatterRef = doc(db, 'chatters', user.uid);
        await updateDoc(chatterRef, {
          hasTelegram: selectedOption === 'yes',
          telegramOnboardingCompleted: true,
          telegramOnboardingAt: new Date().toISOString(),
        });
      } catch {
        // Chatters doc might not exist yet, that's ok
      }

      await refreshUser();
      navigate(dashboardRoute, { replace: true });
    } catch (error) {
      console.error('[TelegramOnboarding] Error:', error);
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

            {/* Option Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* YES Option */}
              <button
                type="button"
                onClick={() => setSelectedOption('yes')}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  selectedOption === 'yes'
                    ? 'bg-green-500/20 border-green-500 shadow-lg shadow-green-500/20'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                {selectedOption === 'yes' && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="text-center">
                  <MessageCircle className={`w-8 h-8 mx-auto mb-2 ${selectedOption === 'yes' ? 'text-green-400' : 'text-gray-400'}`} />
                  <span className={`block font-bold ${selectedOption === 'yes' ? 'text-green-300' : 'text-white'}`}>
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
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  selectedOption === 'no'
                    ? 'bg-gray-500/20 border-gray-500 shadow-lg shadow-gray-500/20'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                {selectedOption === 'no' && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="text-center">
                  <X className={`w-8 h-8 mx-auto mb-2 ${selectedOption === 'no' ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`block font-bold ${selectedOption === 'no' ? 'text-gray-300' : 'text-white'}`}>
                    <FormattedMessage id="chatter.telegram.no" defaultMessage="No, not yet" />
                  </span>
                  <span className="text-xs text-gray-500 mt-1 block">
                    <FormattedMessage id="chatter.telegram.no.info" defaultMessage="You can add it later" />
                  </span>
                </div>
              </button>
            </div>

            {/* Warning if NO selected */}
            {selectedOption === 'no' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-300">
                      <FormattedMessage
                        id="chatter.telegram.no.warning"
                        defaultMessage="Without Telegram, you'll miss the $50 bonus and exclusive rewards. You can always add Telegram later from your dashboard."
                      />
                    </p>
                    <a
                      href="https://telegram.org/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 mt-2"
                    >
                      <FormattedMessage id="chatter.telegram.install" defaultMessage="Install Telegram" />
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedOption || loading}
              className={`${UI.button.primary} w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
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

            {!selectedOption && (
              <p className="text-center text-sm text-gray-500 mt-3">
                <FormattedMessage id="chatter.telegram.selectOption" defaultMessage="Please select an option to continue" />
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatterTelegramOnboarding;
