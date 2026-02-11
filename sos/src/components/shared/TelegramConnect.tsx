/**
 * TelegramConnect - Inline Telegram connection component
 *
 * Compact version of ChatterTelegramOnboarding for embedding in payment pages.
 * Reuses generateTelegramLink and checkTelegramLinkStatus callables.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsWest3 } from '@/config/firebase';
import {
  MessageCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Download,
  Copy,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TelegramConnectProps {
  role: 'chatter' | 'influencer' | 'blogger' | 'groupAdmin';
  onConnected: () => void;
}

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
}

// ============================================================================
// COMPONENT
// ============================================================================

const TelegramConnect: React.FC<TelegramConnectProps> = ({ role, onConnected }) => {
  const intl = useIntl();
  const [step, setStep] = useState<'invite' | 'waiting' | 'success'>('invite');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<TelegramLinkData | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Generate link and open Telegram
  const handleConnect = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const generateTelegramLink = httpsCallable<{ role: string }, TelegramLinkData>(
        functionsWest3,
        'generateTelegramLink'
      );
      const result = await generateTelegramLink({ role });
      const data = result.data;

      if (!data.success) {
        setError(intl.formatMessage({ id: 'telegram.connect.error.generate', defaultMessage: 'Impossible de générer le lien Telegram' }));
        return;
      }

      // Already linked
      if (!data.deepLink && data.message?.includes('already linked')) {
        onConnected();
        return;
      }

      setLinkData(data);
      setStep('waiting');

      // Open deep link
      window.open(data.deepLink, '_blank');

      // Start polling
      startPolling();
    } catch (err) {
      const message = err instanceof Error ? err.message : intl.formatMessage({ id: 'telegram.connect.error.connection', defaultMessage: 'Erreur de connexion' });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [role, onConnected]);

  // Poll for link status
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const checkStatus = httpsCallable<void, LinkStatusData>(
          functionsWest3,
          'checkTelegramLinkStatus'
        );
        const result = await checkStatus();

        if (result.data.isLinked) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep('success');
          setTimeout(() => onConnected(), 1500);
        }
      } catch {
        // Silently retry
      }
    }, 3000);
  }, [onConnected]);

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    if (!linkData?.deepLink) return;
    try {
      await navigator.clipboard.writeText(linkData.deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  }, [linkData]);

  // Re-open link
  const handleReopenLink = useCallback(() => {
    if (linkData?.deepLink) {
      window.open(linkData.deepLink, '_blank');
    }
  }, [linkData]);

  // ============================================================================
  // RENDER: Success
  // ============================================================================

  if (step === 'success') {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6">
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            <FormattedMessage
              id="telegram.connect.success"
              defaultMessage="Telegram connecté !"
            />
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Waiting for connection
  // ============================================================================

  if (step === 'waiting') {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6">
        <div className="flex flex-col items-center space-y-5">
          {/* Animated Telegram icon */}
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center animate-pulse">
            <MessageCircle className="w-8 h-8 text-blue-500" />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage
                id="telegram.connect.waiting.title"
                defaultMessage="En attente de connexion..."
              />
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="telegram.connect.waiting.description"
                defaultMessage='Ouvrez Telegram et appuyez sur "Démarrer"'
              />
            </p>
          </div>

          {/* Spinner */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <FormattedMessage
              id="telegram.connect.waiting.detecting"
              defaultMessage="Détection automatique..."
            />
          </div>

          {/* Fallback actions */}
          <div className="text-center space-y-2 pt-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              <FormattedMessage
                id="telegram.connect.waiting.notWorking"
                defaultMessage="Le lien ne fonctionne pas ?"
              />
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={handleReopenLink}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <FormattedMessage
                  id="telegram.connect.waiting.reopen"
                  defaultMessage="Ouvrir à nouveau"
                />
              </button>
              <button
                onClick={handleCopyLink}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? (
                  <FormattedMessage id="telegram.connect.copied" defaultMessage="Copié !" />
                ) : (
                  <FormattedMessage id="telegram.connect.copy" defaultMessage="Copier le lien" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Invite (initial state)
  // ============================================================================

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6">
      <div className="flex flex-col items-center space-y-5">
        {/* Telegram icon */}
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-blue-500" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            <FormattedMessage
              id="telegram.connect.title"
              defaultMessage="Connectez votre Telegram"
            />
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            <FormattedMessage
              id="telegram.connect.description"
              defaultMessage="Pour sécuriser vos retraits, connectez votre compte Telegram. C'est rapide !"
            />
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full max-w-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <MessageCircle className="w-5 h-5" />
              <FormattedMessage
                id="telegram.connect.button"
                defaultMessage="Connecter Telegram"
              />
            </>
          )}
        </button>

        {/* Download hint */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          <FormattedMessage
            id="telegram.connect.noTelegram"
            defaultMessage="Vous n'avez pas Telegram ?"
          />{' '}
          <a
            href="https://telegram.org/dl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 inline-flex items-center gap-1"
          >
            <FormattedMessage
              id="telegram.connect.download"
              defaultMessage="Téléchargez l'app gratuite"
            />
            <Download className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  );
};

export default TelegramConnect;
