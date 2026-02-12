/**
 * ChatterTelegramOnboarding - Simple Telegram Connection
 *
 * Ultra-simple: 2 buttons (Yes/No) + $50 bonus highlight
 * Goal: Capture telegram_id for future campaigns
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { httpsCallable } from 'firebase/functions';
import { functionsWest3 } from '@/config/firebase';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Gift,
  CheckCircle,
  ExternalLink,
  ArrowRight,
  Download,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TelegramLinkData {
  success: boolean;
  code: string;
  deepLink: string;
  qrCodeUrl: string;
  expiresAt: string;
  message: string;
}

interface LinkStatusData {
  success: boolean;
  status: 'pending' | 'linked' | 'expired';
  isLinked: boolean;
  telegramId: number | null;
  telegramUsername: string | null;
  telegramFirstName: string | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ChatterTelegramOnboarding: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const { user, refreshUser, authInitialized, isLoading: authLoading } = useAuth();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  // State - removed 'download' step, replaced with inline hint
  const [step, setStep] = useState<'choice' | 'connect' | 'success'>('choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<TelegramLinkData | null>(null);
  const [linkStatus, setLinkStatus] = useState<LinkStatusData | null>(null);
  const [showDownloadHint, setShowDownloadHint] = useState(false);

  // Refs
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef<number>(0);

  // Routes
  const dashboardRoute = `/${getTranslatedRouteSlug('chatter-dashboard' as RouteKey, langCode)}`;
  const loginRoute = `/${getTranslatedRouteSlug('login' as RouteKey, langCode)}`;

  // Firebase Functions - europe-west3 via shared config (functionsWest3)

  // ============================================================================
  // AUTH REDIRECT
  // ============================================================================

  useEffect(() => {
    if (authInitialized && !authLoading) {
      if (!user) {
        navigate(loginRoute);
      } else if (user.role !== 'chatter') {
        navigate('/dashboard');
      } else if (user.telegramOnboardingCompleted && user.telegramId) {
        navigate(dashboardRoute);
      }
    }
  }, [authInitialized, authLoading, user, navigate, loginRoute, dashboardRoute]);

  // ============================================================================
  // GENERATE LINK
  // ============================================================================

  const generateLink = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const generateFn = httpsCallable<{ role?: string }, TelegramLinkData>(functionsWest3, 'generateTelegramLink');
      const result = await generateFn({ role: 'chatter' });

      if (result.data.success) {
        if (!result.data.code) {
          setStep('success');
          return;
        }
        setLinkData(result.data);
        setStep('connect');
        startStatusCheck();
      } else {
        setError(result.data.message || intl.formatMessage({ id: 'chatter.telegram.error.generic', defaultMessage: 'An error occurred. Please try again.' }));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '';
      setError(intl.formatMessage({ id: 'chatter.telegram.error.generic', defaultMessage: 'An error occurred. Please try again.' }) + (errorMessage ? ` (${errorMessage})` : ''));
    } finally {
      setLoading(false);
    }
  }, [intl]);

  // ============================================================================
  // CHECK STATUS
  // ============================================================================

  const stopStatusCheck = useCallback(() => {
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
      statusCheckInterval.current = null;
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const checkFn = httpsCallable<unknown, LinkStatusData>(functionsWest3, 'checkTelegramLinkStatus');
      const result = await checkFn({});

      setLinkStatus(result.data);
      errorCountRef.current = 0;

      if (result.data.isLinked) {
        stopStatusCheck();
        setStep('success');
        await refreshUser();
      } else if (result.data.status === 'expired') {
        setError(intl.formatMessage({ id: 'chatter.telegram.error.expired', defaultMessage: 'Link expired. Click to generate a new one.' }));
        setLinkData(null);
        stopStatusCheck();
      }
    } catch {
      errorCountRef.current += 1;
      if (errorCountRef.current >= 5) {
        stopStatusCheck();
        setError(intl.formatMessage({ id: 'chatter.telegram.error.connection', defaultMessage: 'Connection error. Click "Open Telegram" then come back here.' }));
      }
    }
  }, [refreshUser, stopStatusCheck, intl]);

  const startStatusCheck = useCallback(() => {
    if (statusCheckInterval.current) return;
    checkStatus();
    statusCheckInterval.current = setInterval(checkStatus, 3000);
  }, [checkStatus]);

  useEffect(() => {
    return () => stopStatusCheck();
  }, [stopStatusCheck]);

  // ============================================================================
  // CONTINUE TO DASHBOARD
  // ============================================================================

  const handleContinue = () => {
    navigate(dashboardRoute, { replace: true });
  };

  // ============================================================================
  // SKIP TELEGRAM
  // ============================================================================

  const handleSkip = async () => {
    setLoading(true);
    setError(null);

    try {
      const skipFn = httpsCallable<unknown, { success: boolean; message: string }>(
        functionsWest3,
        'skipTelegramOnboarding'
      );
      const result = await skipFn({});

      if (result.data.success) {
        await refreshUser();
        navigate(dashboardRoute, { replace: true });
      } else {
        setError(result.data.message || intl.formatMessage({ id: 'chatter.telegram.error.generic', defaultMessage: 'An error occurred. Please try again.' }));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '';
      setError(intl.formatMessage({ id: 'chatter.telegram.error.generic', defaultMessage: 'An error occurred. Please try again.' }) + (errorMessage ? ` (${errorMessage})` : ''));
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (!authInitialized || authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-950">
          <div className="text-center">
            <motion.div
              className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-gray-400">
              <FormattedMessage id="chatter.telegram.loading" defaultMessage="Loading..." />
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // ============================================================================
  // RENDER: CHOICE STEP (Yes/No)
  // ============================================================================

  const renderChoiceStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      {/* $50 Bonus Badge - prominent at top */}
      <motion.div
        className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-5 py-3"
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Gift className="w-6 h-6 text-amber-400" />
        <span className="text-amber-400 font-bold text-lg">
          <FormattedMessage id="chatter.telegram.bonusBadge" defaultMessage="+$50 free bonus" />
        </span>
      </motion.div>

      {/* Telegram Icon */}
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#0088cc] to-[#00a2e8] flex items-center justify-center shadow-lg shadow-blue-500/30">
        <MessageCircle className="w-10 h-10 text-white" />
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          <FormattedMessage id="chatter.telegram.title" defaultMessage="Do you have Telegram?" />
        </h1>
        <p className="text-gray-400">
          <FormattedMessage
            id="chatter.telegram.subtitle"
            defaultMessage="Connect your Telegram to receive a {bonus} bonus"
            values={{ bonus: <span className="text-amber-400 font-bold">$50</span> }}
          />
        </p>
      </div>

      {/* Two Buttons */}
      <div className="space-y-3">
        {/* YES Button */}
        <button
          onClick={generateLink}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-[#0088cc] to-[#00a2e8] text-white font-bold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <FormattedMessage id="chatter.telegram.yesButton" defaultMessage="Yes, connect my Telegram" />
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* NO Button - opens telegram.org/apps in new tab + shows hint */}
        <button
          onClick={() => {
            window.open('https://telegram.org/apps', '_blank');
            setShowDownloadHint(true);
          }}
          disabled={loading}
          className="w-full py-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          <FormattedMessage id="chatter.telegram.noButton" defaultMessage="No, I don't have Telegram yet" />
        </button>
      </div>

      {/* Download hint - shown after clicking "No" */}
      {showDownloadHint && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl"
        >
          <p className="text-sm text-blue-300">
            <FormattedMessage
              id="chatter.telegram.noButtonInstall"
              defaultMessage='Install Telegram (free), then come back and click "Yes"'
            />
          </p>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-gray-500 text-center">
        <FormattedMessage id="chatter.telegram.requiredInfo" defaultMessage="Telegram is required to receive your notifications and bonuses" />
      </p>

      {/* Skip option */}
      <button
        onClick={handleSkip}
        disabled={loading}
        className="text-xs text-gray-600 hover:text-gray-400 underline"
      >
        <FormattedMessage id="chatter.telegram.skipButton" defaultMessage="Continue without Telegram (you'll lose the $50 bonus)" />
      </button>
    </motion.div>
  );

  // ============================================================================
  // RENDER: CONNECT STEP
  // ============================================================================

  const renderConnectStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      {/* Icon */}
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#0088cc] to-[#00a2e8] flex items-center justify-center">
        <MessageCircle className="w-10 h-10 text-white" />
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          <FormattedMessage id="chatter.telegram.connect.title" defaultMessage="Almost done!" />
        </h1>
        <p className="text-gray-400">
          <FormattedMessage id="chatter.telegram.connect.subtitle" defaultMessage='Click the button then tap "Start" in Telegram' />
        </p>
      </div>

      {/* Open Telegram Button */}
      <a
        href={linkData?.deepLink}
        onClick={(e) => {
          const code = linkData?.code;
          if (code) {
            const tgScheme = `tg://resolve?domain=SOSExpatChatterBot&start=${code}`;
            window.location.href = tgScheme;
            setTimeout(() => {
              window.open(linkData?.deepLink, '_blank');
            }, 1000);
            e.preventDefault();
          }
        }}
        className="w-full py-4 bg-gradient-to-r from-[#0088cc] to-[#00a2e8] text-white font-bold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity block cursor-pointer"
      >
        <MessageCircle className="w-5 h-5" />
        <FormattedMessage id="chatter.telegram.connect.openButton" defaultMessage="Open Telegram" />
        <ExternalLink className="w-5 h-5" />
      </a>

      {/* Status */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center justify-center gap-3">
          <motion.div
            className="w-3 h-3 rounded-full bg-amber-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-gray-300">
            <FormattedMessage id="chatter.telegram.connect.waiting" defaultMessage="Waiting for connection..." />
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={generateLink}
            className="mt-2 text-sm text-red-400 underline"
          >
            <FormattedMessage id="chatter.telegram.connect.regenerate" defaultMessage="Generate a new link" />
          </button>
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => {
          stopStatusCheck();
          setStep('choice');
          setLinkData(null);
        }}
        className="text-sm text-gray-500 hover:text-gray-400"
      >
        &larr; <FormattedMessage id="chatter.telegram.back" defaultMessage="Back" />
      </button>
    </motion.div>
  );

  // ============================================================================
  // RENDER: SUCCESS STEP
  // ============================================================================

  const renderSuccessStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6"
    >
      {/* Success Icon */}
      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
        <CheckCircle className="w-12 h-12 text-white" />
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          <FormattedMessage id="chatter.telegram.success.title" defaultMessage="Perfect!" />
        </h1>
        <p className="text-gray-400">
          <FormattedMessage id="chatter.telegram.success.subtitle" defaultMessage="Your Telegram is connected" />
        </p>
      </div>

      {/* Telegram Info */}
      {linkStatus?.telegramUsername && (
        <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <MessageCircle className="w-6 h-6 text-blue-400" />
          <div className="text-left">
            <p className="font-bold text-white">{linkStatus.telegramFirstName || 'User'}</p>
            <p className="text-sm text-blue-400">@{linkStatus.telegramUsername}</p>
          </div>
          <CheckCircle className="w-5 h-5 text-green-400" />
        </div>
      )}

      {/* Bonus */}
      <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-center justify-center gap-3">
          <Gift className="w-8 h-8 text-amber-400" />
          <div>
            <p className="text-2xl font-black text-white">+$50</p>
            <p className="text-xs text-amber-300">
              <FormattedMessage id="chatter.telegram.success.bonusCredit" defaultMessage="Unlocked when you earn $150 in commissions" />
            </p>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        className="w-full py-4 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
      >
        <FormattedMessage id="chatter.telegram.success.continueButton" defaultMessage="Go to Dashboard" />
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Layout showFooter={false}>
      <Helmet>
        <title>{intl.formatMessage({ id: 'chatter.telegram.seo.title', defaultMessage: 'Connect Telegram | SOS-Expat' })}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gray-950 py-8 px-4 flex items-center justify-center">
        <div className="max-w-sm w-full">
          {step === 'choice' && renderChoiceStep()}
          {step === 'connect' && renderConnectStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </div>
    </Layout>
  );
};

export default ChatterTelegramOnboarding;
