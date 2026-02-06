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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Gift,
  CheckCircle,
  ExternalLink,
  Download,
  ArrowRight,
  X,
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

  // State
  const [step, setStep] = useState<'choice' | 'connect' | 'download' | 'success'>('choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<TelegramLinkData | null>(null);
  const [linkStatus, setLinkStatus] = useState<LinkStatusData | null>(null);

  // Refs
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Routes
  const dashboardRoute = `/${getTranslatedRouteSlug('chatter-dashboard' as RouteKey, langCode)}`;
  const loginRoute = `/${getTranslatedRouteSlug('login' as RouteKey, langCode)}`;

  // Firebase Functions
  const functions = getFunctions(undefined, 'europe-west1');

  // ============================================================================
  // DEBUG LOGS
  // ============================================================================

  useEffect(() => {
    console.log('[TelegramOnboarding] Component mounted');
    console.log('[TelegramOnboarding] authInitialized:', authInitialized);
    console.log('[TelegramOnboarding] authLoading:', authLoading);
    console.log('[TelegramOnboarding] user:', user);
    console.log('[TelegramOnboarding] user?.role:', user?.role);
    console.log('[TelegramOnboarding] user?.telegramId:', user?.telegramId);
    console.log('[TelegramOnboarding] user?.telegramOnboardingCompleted:', user?.telegramOnboardingCompleted);
  }, [authInitialized, authLoading, user]);

  useEffect(() => {
    console.log('[TelegramOnboarding] step changed to:', step);
  }, [step]);

  useEffect(() => {
    console.log('[TelegramOnboarding] linkData:', linkData);
  }, [linkData]);

  useEffect(() => {
    console.log('[TelegramOnboarding] linkStatus:', linkStatus);
  }, [linkStatus]);

  useEffect(() => {
    console.log('[TelegramOnboarding] error:', error);
  }, [error]);

  // ============================================================================
  // AUTH REDIRECT
  // ============================================================================

  useEffect(() => {
    if (authInitialized && !authLoading) {
      console.log('[TelegramOnboarding] Auth ready, checking redirects...');

      if (!user) {
        console.log('[TelegramOnboarding] No user, redirecting to login');
        navigate(loginRoute);
      } else if (user.role !== 'chatter') {
        console.log('[TelegramOnboarding] Not a chatter, redirecting to dashboard');
        navigate('/dashboard');
      } else if (user.telegramOnboardingCompleted && user.telegramId) {
        console.log('[TelegramOnboarding] Already completed, redirecting to dashboard');
        navigate(dashboardRoute);
      } else {
        console.log('[TelegramOnboarding] User is valid chatter, showing onboarding');
      }
    }
  }, [authInitialized, authLoading, user, navigate, loginRoute, dashboardRoute]);

  // ============================================================================
  // GENERATE LINK
  // ============================================================================

  const generateLink = useCallback(async () => {
    console.log('[TelegramOnboarding] generateLink called');
    setLoading(true);
    setError(null);

    try {
      console.log('[TelegramOnboarding] Calling generateTelegramLink function...');
      const generateFn = httpsCallable<unknown, TelegramLinkData>(functions, 'generateTelegramLink');
      const result = await generateFn({});

      console.log('[TelegramOnboarding] generateTelegramLink result:', result.data);

      if (result.data.success) {
        if (!result.data.code) {
          console.log('[TelegramOnboarding] Already linked, going to success');
          setStep('success');
          return;
        }
        setLinkData(result.data);
        setStep('connect');
        startStatusCheck();
      } else {
        console.error('[TelegramOnboarding] Generate failed:', result.data.message);
        setError(result.data.message || 'Failed to generate link');
      }
    } catch (err: unknown) {
      console.error('[TelegramOnboarding] Error generating link:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [functions]);

  // ============================================================================
  // CHECK STATUS
  // ============================================================================

  const checkStatus = useCallback(async () => {
    console.log('[TelegramOnboarding] checkStatus called');

    try {
      const checkFn = httpsCallable<unknown, LinkStatusData>(functions, 'checkTelegramLinkStatus');
      const result = await checkFn({});

      console.log('[TelegramOnboarding] checkTelegramLinkStatus result:', result.data);
      setLinkStatus(result.data);

      if (result.data.isLinked) {
        console.log('[TelegramOnboarding] Linked! Stopping polling and going to success');
        stopStatusCheck();
        setStep('success');
        await refreshUser();
      } else if (result.data.status === 'expired') {
        console.log('[TelegramOnboarding] Link expired');
        setError('Lien expiré. Cliquez pour en générer un nouveau.');
        setLinkData(null);
        stopStatusCheck();
      }
    } catch (err) {
      console.error('[TelegramOnboarding] Error checking status:', err);
    }
  }, [functions, refreshUser]);

  const startStatusCheck = useCallback(() => {
    console.log('[TelegramOnboarding] Starting status polling');
    if (statusCheckInterval.current) return;

    checkStatus();
    statusCheckInterval.current = setInterval(checkStatus, 3000);
  }, [checkStatus]);

  const stopStatusCheck = useCallback(() => {
    console.log('[TelegramOnboarding] Stopping status polling');
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
      statusCheckInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopStatusCheck();
  }, [stopStatusCheck]);

  // ============================================================================
  // SKIP TELEGRAM
  // ============================================================================

  const handleSkip = async () => {
    console.log('[TelegramOnboarding] handleSkip called');
    setLoading(true);
    setError(null);

    try {
      console.log('[TelegramOnboarding] Calling skipTelegramOnboarding...');
      const skipFn = httpsCallable(functions, 'skipTelegramOnboarding');
      await skipFn({});
      console.log('[TelegramOnboarding] Skip successful, refreshing user...');
      await refreshUser();
      console.log('[TelegramOnboarding] Navigating to dashboard');
      navigate(dashboardRoute, { replace: true });
    } catch (err) {
      console.error('[TelegramOnboarding] Error skipping:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    console.log('[TelegramOnboarding] handleContinue called');
    navigate(dashboardRoute, { replace: true });
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
            <p className="text-gray-400">Chargement...</p>
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
      className="text-center space-y-8"
    >
      {/* Telegram Icon */}
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#0088cc] to-[#00a2e8] flex items-center justify-center">
        <MessageCircle className="w-10 h-10 text-white" />
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Avez-vous Telegram ?
        </h1>
        <p className="text-gray-400">
          Connectez-le pour recevoir <span className="text-amber-400 font-bold">$50 de bonus</span>
        </p>
      </div>

      {/* $50 Bonus Badge */}
      <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-4 py-2">
        <Gift className="w-5 h-5 text-amber-400" />
        <span className="text-amber-400 font-bold">+$50 bonus offert</span>
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
              Oui, connecter mon Telegram
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* NO Button */}
        <button
          onClick={() => setStep('download')}
          disabled={loading}
          className="w-full py-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
          Non, je n'ai pas Telegram
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Skip link (very small) */}
      <button
        onClick={handleSkip}
        disabled={loading}
        className="text-xs text-gray-500 hover:text-gray-400 underline"
      >
        Passer cette étape (sans bonus)
      </button>
    </motion.div>
  );

  // ============================================================================
  // RENDER: DOWNLOAD STEP
  // ============================================================================

  const renderDownloadStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      {/* Icon */}
      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#0088cc] to-[#00a2e8] flex items-center justify-center">
        <Download className="w-10 h-10 text-white" />
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Téléchargez Telegram
        </h1>
        <p className="text-gray-400">
          C'est gratuit et rapide !
        </p>
      </div>

      {/* Download Links */}
      <div className="space-y-3">
        <a
          href="https://apps.apple.com/app/telegram-messenger/id686449807"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 transition-colors"
        >
          <span>📱</span>
          App Store (iPhone)
          <ExternalLink className="w-4 h-4" />
        </a>

        <a
          href="https://play.google.com/store/apps/details?id=org.telegram.messenger"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 transition-colors"
        >
          <span>🤖</span>
          Google Play (Android)
          <ExternalLink className="w-4 h-4" />
        </a>

        <a
          href="https://telegram.org/apps"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-3 hover:bg-white/10 transition-colors"
        >
          <span>💻</span>
          Desktop / Web
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* After Download */}
      <div className="pt-4 border-t border-white/10">
        <p className="text-sm text-gray-400 mb-3">
          Une fois installé, revenez ici :
        </p>
        <button
          onClick={() => setStep('choice')}
          className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold rounded-xl hover:opacity-90 transition-opacity"
        >
          J'ai installé Telegram
        </button>
      </div>

      {/* Skip */}
      <button
        onClick={handleSkip}
        disabled={loading}
        className="text-xs text-gray-500 hover:text-gray-400 underline"
      >
        Continuer sans Telegram (sans bonus)
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
          Presque terminé !
        </h1>
        <p className="text-gray-400">
          Cliquez sur le bouton puis appuyez sur "Start" dans Telegram
        </p>
      </div>

      {/* Open Telegram Button */}
      <a
        href={linkData?.deepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-4 bg-gradient-to-r from-[#0088cc] to-[#00a2e8] text-white font-bold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity block"
      >
        <MessageCircle className="w-5 h-5" />
        Ouvrir Telegram
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
            En attente de connexion...
          </span>
        </div>
      </div>

      {/* Debug Info */}
      {linkData && (
        <div className="text-xs text-gray-600 bg-gray-900 p-2 rounded">
          <p>Deep Link: {linkData.deepLink?.substring(0, 50)}...</p>
          <p>Code: {linkData.code}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={generateLink}
            className="mt-2 text-sm text-red-400 underline"
          >
            Générer un nouveau lien
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
        ← Retour
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
          Parfait !
        </h1>
        <p className="text-gray-400">
          Votre Telegram est connecté
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
            <p className="text-xs text-amber-300">Crédité dans votre tirelire</p>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        className="w-full py-4 bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold rounded-xl flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
      >
        Accéder au Dashboard
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
        <title>Connecter Telegram | SOS-Expat</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gray-950 py-8 px-4 flex items-center justify-center">
        <div className="max-w-sm w-full">
          {step === 'choice' && renderChoiceStep()}
          {step === 'download' && renderDownloadStep()}
          {step === 'connect' && renderConnectStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </div>
    </Layout>
  );
};

export default ChatterTelegramOnboarding;
