/**
 * TelegramConfirmationWaiting - Waiting screen after withdrawal submission
 *
 * Polls getWithdrawalConfirmationStatus every 3 seconds.
 * Shows countdown, progress bar, and Telegram animation.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsWest3 } from '@/config/firebase';
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TelegramConfirmationWaitingProps {
  withdrawalId: string;
  amount: number; // in cents
  currency?: string;
  paymentMethod?: string;
  onConfirmed: () => void;
  onCancelled: () => void;
  onExpired: () => void;
}

interface ConfirmationStatusResponse {
  success: boolean;
  status: string;
  telegramConfirmationPending: boolean;
  telegramConfirmedAt?: string;
}

const EXPIRY_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
// COMPONENT
// ============================================================================

const TelegramConfirmationWaiting: React.FC<TelegramConfirmationWaitingProps> = ({
  withdrawalId,
  amount,
  currency = 'USD',
  paymentMethod,
  onConfirmed,
  onCancelled,
  onExpired,
}) => {
  const intl = useIntl();

  const [state, setState] = useState<'waiting' | 'confirmed' | 'cancelled' | 'expired'>('waiting');
  const [timeLeft, setTimeLeft] = useState(EXPIRY_DURATION_MS);
  const [cancelLoading, setCancelLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const amountFormatted = useMemo(() => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount / 100);
  }, [amount, currency, intl.locale]);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, EXPIRY_DURATION_MS - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setState('expired');
        if (timerRef.current) clearInterval(timerRef.current);
        if (pollRef.current) clearInterval(pollRef.current);
        onExpired();
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onExpired]);

  // Poll for confirmation status
  useEffect(() => {
    const poll = async () => {
      try {
        const getStatus = httpsCallable<{ withdrawalId: string }, ConfirmationStatusResponse>(
          functionsWest3,
          'getWithdrawalConfirmationStatus'
        );
        const result = await getStatus({ withdrawalId });
        const data = result.data;

        if (!data.telegramConfirmationPending && data.telegramConfirmedAt) {
          // Confirmed via Telegram
          setState('confirmed');
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => onConfirmed(), 2000);
        } else if (data.status === 'cancelled') {
          // Cancelled (via Telegram or otherwise)
          setState('cancelled');
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => onCancelled(), 2000);
        }
      } catch {
        // Silently retry
      }
    };

    pollRef.current = setInterval(poll, 3000);
    // Initial poll
    poll();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [withdrawalId, onConfirmed, onCancelled]);

  // Cancel from frontend
  const handleCancel = useCallback(async () => {
    setCancelLoading(true);
    try {
      const cancelFn = httpsCallable<{ withdrawalId: string; reason?: string }, { success: boolean }>(
        functionsWest3,
        'cancelWithdrawal'
      );
      await cancelFn({ withdrawalId, reason: 'Cancelled by user from confirmation screen' });
      setState('cancelled');
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => onCancelled(), 1500);
    } catch {
      // Still try onCancelled
      onCancelled();
    } finally {
      setCancelLoading(false);
    }
  }, [withdrawalId, onCancelled]);

  // Format countdown
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Progress bar percentage (100% to 0%)
  const progressPercent = (timeLeft / EXPIRY_DURATION_MS) * 100;

  // ============================================================================
  // RENDER: Confirmed
  // ============================================================================

  if (state === 'confirmed') {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6">
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-green-600 dark:text-green-400">
            <FormattedMessage
              id="telegram.confirmation.confirmed"
              defaultMessage="Retrait confirmé !"
            />
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="telegram.confirmation.confirmed.description"
              defaultMessage="Votre retrait de {amount} sera traité dans les plus brefs délais."
              values={{ amount: amountFormatted }}
            />
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Cancelled
  // ============================================================================

  if (state === 'cancelled') {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6">
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            <FormattedMessage
              id="telegram.confirmation.cancelled"
              defaultMessage="Retrait annulé"
            />
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="telegram.confirmation.cancelled.description"
              defaultMessage="Le montant a été recrédité à votre solde."
            />
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Expired
  // ============================================================================

  if (state === 'expired') {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6">
        <div className="flex flex-col items-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-semibold text-amber-600 dark:text-amber-400">
            <FormattedMessage
              id="telegram.confirmation.expired"
              defaultMessage="Temps écoulé"
            />
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="telegram.confirmation.expired.description"
              defaultMessage="La demande de confirmation a expiré. Le montant a été recrédité à votre solde."
            />
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium py-3 px-6 rounded-xl transition-all"
          >
            <FormattedMessage
              id="telegram.confirmation.retry"
              defaultMessage="Réessayer"
            />
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Waiting
  // ============================================================================

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-6">
      <div className="flex flex-col items-center space-y-6">
        {/* Animated Telegram icon */}
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center animate-pulse">
          <MessageCircle className="w-8 h-8 text-blue-500" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            <FormattedMessage
              id="telegram.confirmation.title"
              defaultMessage="Confirmez sur Telegram"
            />
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            <FormattedMessage
              id="telegram.confirmation.description"
              defaultMessage="Nous avons envoyé une demande de confirmation dans votre Telegram."
            />
          </p>
        </div>

        {/* Withdrawal summary card */}
        <div className="w-full max-w-xs bg-gray-50 dark:bg-white/5 rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="telegram.confirmation.amount" defaultMessage="Retrait" />
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">{amountFormatted}</span>
          </div>
          {paymentMethod && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="telegram.confirmation.via" defaultMessage="Via" />
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {paymentMethod}
              </span>
            </div>
          )}
        </div>

        {/* Countdown */}
        <div className="w-full max-w-xs space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="telegram.confirmation.expires"
                defaultMessage="Expire dans"
              />
            </span>
            <span className={`font-mono font-semibold ${timeLeft < 60000 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                progressPercent > 30
                  ? 'bg-blue-500'
                  : progressPercent > 10
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Polling indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <FormattedMessage
            id="telegram.confirmation.waiting"
            defaultMessage="En attente de votre réponse..."
          />
        </div>

        {/* Cancel button */}
        <button
          onClick={handleCancel}
          disabled={cancelLoading}
          className="text-sm text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors flex items-center gap-1"
        >
          {cancelLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <FormattedMessage
            id="telegram.confirmation.cancel"
            defaultMessage="Annuler le retrait"
          />
        </button>
      </div>
    </div>
  );
};

export default TelegramConfirmationWaiting;
