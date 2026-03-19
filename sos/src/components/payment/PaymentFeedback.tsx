import React from 'react';

/* =====================================================================
 * PaymentFeedback - Friendly, fun & mobile-first error display
 * ===================================================================== */
type FeedbackType = 'error' | 'warning' | 'info' | 'success';

export interface PaymentFeedbackProps {
  error: string;
  onDismiss: () => void;
  onRetry?: () => void;
  t: (key: string, fallback?: string) => string;
}

// Detect error type from message
const detectErrorType = (error: string): {
  type: 'duplicate' | 'rateLimit' | 'cardDeclined' | 'insufficientFunds' | 'network' | 'expired' | 'cvc' | 'cancelled' | 'generic';
  feedbackType: FeedbackType;
} => {
  const lowerError = error.toLowerCase();

  // PayPal/Payment cancellation detection
  if (lowerError.includes('annulé') || lowerError.includes('cancelled') || lowerError.includes('canceled')) {
    return { type: 'cancelled', feedbackType: 'info' };
  }
  // Duplicate payment detection
  if (lowerError.includes('already') || lowerError.includes('doublon') || lowerError.includes('déjà') || lowerError.includes('similaire')) {
    return { type: 'duplicate', feedbackType: 'warning' };
  }
  // Rate limit detection
  if (lowerError.includes('rate') || lowerError.includes('tentative') || lowerError.includes('trop') || lowerError.includes('too many')) {
    return { type: 'rateLimit', feedbackType: 'info' };
  }
  // CVC/Security code errors
  if (lowerError.includes('cvc') || lowerError.includes('cvv') || lowerError.includes('security code') || lowerError.includes('code de sécurité')) {
    return { type: 'cvc', feedbackType: 'warning' };
  }
  // Expired card detection
  if (lowerError.includes('expired') || lowerError.includes('expiré') || lowerError.includes('expiration')) {
    return { type: 'expired', feedbackType: 'warning' };
  }
  // Card declined detection (Stripe messages)
  if (lowerError.includes('declined') || lowerError.includes('refusé') || lowerError.includes('rejected') ||
      lowerError.includes('do not honor') || lowerError.includes('card_declined') ||
      lowerError.includes('your card was declined') || lowerError.includes('payment failed') ||
      lowerError.includes('transaction not allowed') || lowerError.includes('card not supported')) {
    return { type: 'cardDeclined', feedbackType: 'warning' };
  }
  // Insufficient funds detection
  if (lowerError.includes('insufficient') || lowerError.includes('insuffisant') || lowerError.includes('funds') || lowerError.includes('balance')) {
    return { type: 'insufficientFunds', feedbackType: 'warning' };
  }
  // Network errors
  if (lowerError.includes('network') || lowerError.includes('connexion') || lowerError.includes('internet') ||
      lowerError.includes('timeout') || lowerError.includes('failed to fetch') || lowerError.includes('connection')) {
    return { type: 'network', feedbackType: 'info' };
  }

  return { type: 'generic', feedbackType: 'error' };
};

// Color schemes for different feedback types (soft, non-aggressive)
const feedbackStyles: Record<FeedbackType, { bg: string; border: string; icon: string; iconBg: string; text: string; button: string }> = {
  error: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: 'text-rose-500',
    iconBg: 'bg-rose-100',
    text: 'text-rose-800',
    button: 'bg-rose-500 hover:bg-rose-600 text-white'
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    iconBg: 'bg-amber-100',
    text: 'text-amber-800',
    button: 'bg-amber-500 hover:bg-amber-600 text-white'
  },
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    icon: 'text-sky-500',
    iconBg: 'bg-sky-100',
    text: 'text-sky-800',
    button: 'bg-sky-500 hover:bg-sky-600 text-white'
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-500',
    iconBg: 'bg-emerald-100',
    text: 'text-emerald-800',
    button: 'bg-emerald-500 hover:bg-emerald-600 text-white'
  }
};

export const PaymentFeedback: React.FC<PaymentFeedbackProps> = ({ error, onDismiss, onRetry, t }) => {
  const { type, feedbackType } = detectErrorType(error);
  const styles = feedbackStyles[feedbackType];

  // Get translated title and message based on error type
  const getContent = () => {
    switch (type) {
      case 'duplicate':
        return {
          title: t('err.duplicate.title', 'Oups, déjà en cours ! 🔄'),
          message: t('err.duplicate.message', 'Un paiement similaire est déjà en cours. Patientez quelques secondes avant de réessayer.')
        };
      case 'rateLimit':
        return {
          title: t('err.rateLimit.title', 'Tout doux ! ☕'),
          message: t('err.rateLimit.message', 'Trop de tentatives. Patientez une minute avant de réessayer.')
        };
      case 'cancelled':
        return {
          title: t('err.paypalCanceled.title', 'Paiement annulé'),
          message: t('err.paypalCanceled.message', 'Vous avez annulé le paiement. Vous pouvez réessayer quand vous le souhaitez.')
        };
      case 'cvc':
        return {
          title: t('err.cvc.title', 'Code de sécurité incorrect 🔐'),
          message: t('err.cvc.message', 'Le code CVC/CVV de votre carte est incorrect. Vérifiez les 3 chiffres au dos de votre carte.')
        };
      case 'expired':
        return {
          title: t('err.expired.title', 'Carte expirée 📅'),
          message: t('err.expired.message', 'Votre carte a expiré. Veuillez utiliser une autre carte de paiement.')
        };
      case 'cardDeclined':
        return {
          title: t('err.cardDeclined.title', 'Carte refusée 💳'),
          message: t('err.cardDeclined.message', 'Votre banque a refusé le paiement. Vérifiez vos informations ou utilisez une autre carte.')
        };
      case 'insufficientFunds':
        return {
          title: t('err.insufficientFunds.title', 'Solde insuffisant 💰'),
          message: t('err.insufficientFunds.message', 'Le solde de votre carte est insuffisant. Utilisez une autre carte ou approvisionnez votre compte.')
        };
      case 'network':
        return {
          title: t('err.network.title', 'Connexion instable 📶'),
          message: t('err.network.message', 'Problème de connexion internet. Vérifiez votre connexion et réessayez.')
        };
      default:
        return {
          title: t('err.paymentFailed', 'Le paiement a échoué'),
          message: t('err.generic.message', 'Une erreur est survenue lors du paiement. Veuillez réessayer ou utiliser un autre moyen de paiement.')
        };
    }
  };

  const { title, message } = getContent();

  return (
    <div
      className={`
        mb-4 p-4 rounded-2xl border-2 ${styles.bg} ${styles.border}
        animate-in slide-in-from-top-2 fade-in duration-300
        shadow-sm
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Mobile-first: Stack layout */}
      <div className="flex flex-col gap-3">
        {/* Header with icon and title */}
        <div className="flex items-start gap-3">
          {/* Animated icon container */}
          <div className={`
            flex-shrink-0 w-10 h-10 rounded-xl ${styles.iconBg}
            flex items-center justify-center
            animate-in zoom-in duration-200
          `}>
            {type === 'cancelled' && (
              <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {type === 'duplicate' && (
              <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {type === 'rateLimit' && (
              <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {type === 'cardDeclined' && (
              <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            )}
            {type === 'cvc' && (
              <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            {type === 'expired' && (
              <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            {type === 'insufficientFunds' && (
              <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {type === 'network' && (
              <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            )}
            {type === 'generic' && (
              <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>

          {/* Title and dismiss button */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className={`font-semibold text-base ${styles.text}`}>
                {title}
              </h4>
              <button
                onClick={onDismiss}
                className={`
                  flex-shrink-0 p-1.5 rounded-lg
                  hover:bg-black/5 active:bg-black/10
                  transition-colors duration-150
                `}
                aria-label="Fermer"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Message */}
            <p className={`mt-1 text-sm ${styles.text} opacity-80 leading-relaxed`}>
              {message}
            </p>
          </div>
        </div>

        {/* Action buttons - Mobile optimized */}
        {(onRetry || type === 'generic') && (
          <div className="flex gap-2 pt-1">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`
                  flex-1 py-2.5 px-4 rounded-xl font-medium text-sm
                  ${styles.button}
                  transition-all duration-150
                  active:scale-[0.98]
                  flex items-center justify-center gap-2
                `}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('err.tryAgain', 'Réessayer')}
              </button>
            )}
            {type === 'generic' && (
              <a
                href="mailto:support@sos-expat.com"
                className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm
                  bg-gray-100 hover:bg-gray-200 text-gray-700
                  transition-all duration-150 active:scale-[0.98]
                  flex items-center justify-center gap-2 no-underline"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t('err.contactSupport', 'Contacter le support')}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentFeedback;
