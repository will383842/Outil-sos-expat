/**
 * SubscriptionSuccess Page
 * Page de confirmation apres un paiement Stripe reussi (redirect depuis Checkout)
 *
 * Features:
 * - Verification de la session Stripe via Cloud Function
 * - Animation de succes avec confettis
 * - Resume de l'abonnement
 * - Liste des fonctionnalites debloquees
 * - CTAs pour commencer a utiliser l'IA
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import {
  CheckCircle,
  Sparkles,
  ArrowRight,
  Zap,
  Gift,
  Calendar,
  CreditCard,
  Download,
  Mail,
  AlertCircle,
  Loader2,
  Crown,
  Infinity as InfinityIcon,
  HelpCircle
} from 'lucide-react';
import Confetti from 'react-confetti';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useSubscription } from '../../hooks/useSubscription';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { functions } from '../../config/firebase';
import { SupportedLanguage, SubscriptionTier, Currency } from '../../types/subscription';
import { cn } from '../../utils/cn';
import { getDateLocale } from '../../utils/formatters';

// ============================================================================
// TYPES
// ============================================================================

interface SessionDetails {
  success: boolean;
  subscription?: {
    id: string;
    planId: string;
    planName: string;
    tier: SubscriptionTier;
    status: string;
    aiCallsLimit: number;
    currentPeriodEnd: string;
    amountPaid: number;
    currency: Currency;
    billingPeriod: 'monthly' | 'yearly';
  };
  invoice?: {
    id: string;
    pdfUrl: string | null;
    hostedUrl: string | null;
  };
  customer?: {
    email: string;
  };
  error?: string;
}

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  trial: <Sparkles className="w-6 h-6" />,
  basic: <Zap className="w-6 h-6" />,
  standard: <Zap className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  unlimited: <InfinityIcon className="w-6 h-6" />
};

const TIER_GRADIENTS: Record<SubscriptionTier, string> = {
  trial: 'from-gray-500 to-gray-600',
  basic: 'from-blue-500 to-blue-600',
  standard: 'from-indigo-500 to-indigo-600',
  pro: 'from-purple-500 to-purple-600',
  unlimited: 'from-amber-500 to-orange-500'
};

// ============================================================================
// ANIMATED CHECK ICON
// ============================================================================

const AnimatedCheckIcon: React.FC = () => (
  <div className="relative inline-block">
    {/* Outer glow ring */}
    <div className="absolute inset-0 w-28 h-28 bg-green-400/30 rounded-full animate-ping" />

    {/* Main circle */}
    <div className="relative w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl animate-bounce-once">
      {/* Check icon with draw animation */}
      <svg
        className="w-14 h-14 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path
          className="animate-draw-check"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>

    {/* Gift badge */}
    <div className="absolute -top-2 -right-2 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center shadow-lg animate-bounce-delayed">
      <Gift className="w-6 h-6 text-white" />
    </div>
  </div>
);

// ============================================================================
// LOADING STATE
// ============================================================================

const LoadingState: React.FC = () => {
  const intl = useIntl();

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 min-h-[60vh]">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-indigo-100 rounded-full flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {intl.formatMessage({ id: 'subscription.success.verifying' })}
        </h2>
        <p className="text-gray-500">
          {intl.formatMessage({ id: 'subscription.success.pleaseWait' })}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// ERROR STATE
// ============================================================================

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  const intl = useIntl();
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4 min-h-[60vh]">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          {/* Error Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {intl.formatMessage({ id: 'subscription.success.error.title' })}
          </h1>

          {/* Error message */}
          <p className="text-gray-600 mb-6">
            {error || intl.formatMessage({ id: 'subscription.success.error.generic' })}
          </p>

          {/* Actions */}
          <div className="space-y-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full py-3 px-6 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                {intl.formatMessage({ id: 'action.retry' })}
              </button>
            )}

            <button
              onClick={() => navigate('/dashboard/subscription')}
              className="w-full py-3 px-6 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              {intl.formatMessage({ id: 'subscription.success.viewSubscription' })}
            </button>

            <a
              href="mailto:support@sos-expat.com"
              className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <HelpCircle className="w-4 h-4" />
              {intl.formatMessage({ id: 'subscription.success.contactSupport' })}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SubscriptionSuccessPage: React.FC = () => {
  const intl = useIntl();
  const { language: locale } = useApp();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const { subscription, plans, refresh } = useSubscription();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Get session_id from URL
  const sessionId = searchParams.get('session_id');

  // Update window size for confetti
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Verify the Stripe checkout session
  const verifySession = useCallback(async () => {
    if (!sessionId) {
      // No session_id, try to load subscription directly
      await refresh();
      setLoading(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call Cloud Function to verify session
      const verifySubscriptionSession = httpsCallable<
        { sessionId: string },
        SessionDetails
      >(functions, 'verifySubscriptionSession');

      const result = await verifySubscriptionSession({ sessionId });

      if (result.data.success) {
        setSessionDetails(result.data);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);

        // Reload subscription data
        await refresh();
      } else {
        setError(result.data.error || intl.formatMessage({ id: 'subscription.success.error.sessionInvalid' }));
      }
    } catch (err: unknown) {
      console.error('Error verifying session:', err);

      const firebaseError = err as { code?: string; message?: string };

      // If the function doesn't exist yet, just load subscription
      if (firebaseError.code === 'functions/not-found') {
        await refresh();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      } else {
        setError(firebaseError.message || intl.formatMessage({ id: 'subscription.success.error.generic' }));
      }
    } finally {
      setLoading(false);
    }
  }, [sessionId, refresh, intl]);

  // Verify session on mount
  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // Get plan details
  const currentPlan = plans.find(p => p.id === subscription?.planId);
  const planName = sessionDetails?.subscription?.planName ||
    currentPlan?.name[locale as SupportedLanguage] ||
    currentPlan?.name.fr ||
    subscription?.tier ||
    'Plan';
  const aiCallsLimit = sessionDetails?.subscription?.aiCallsLimit ||
    currentPlan?.aiCallsLimit ||
    5;
  const tierGradient = TIER_GRADIENTS[subscription?.tier || 'basic'];
  const tierIcon = TIER_ICONS[subscription?.tier || 'basic'];

  // Format helpers
  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat(getDateLocale(locale), {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const formatPrice = (amount: number, currency: Currency) => {
    const symbol = currency === 'EUR' ? '\u20AC' : '$';
    return `${amount}${symbol}`;
  };

  // Customer email
  const customerEmail = sessionDetails?.customer?.email || user?.email || '';

  // Loading state
  if (loading) {
    return (
      <DashboardLayout activeKey="subscription">
        <LoadingState />
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout activeKey="subscription">
        <ErrorState error={error} onRetry={verifySession} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeKey="subscription">
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 min-h-[60vh]">
        {/* Confetti */}
        {showConfetti && (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={200}
            colors={['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981']}
          />
        )}

        <div className="max-w-lg w-full">
          {/* Success Card */}
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            {/* Animated Check Icon */}
            <div className="mb-8">
              <AnimatedCheckIcon />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {intl.formatMessage({ id: 'subscription.success.title' })}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-gray-600 mb-6">
              {intl.formatMessage({ id: 'subscription.success.subtitle' }, { plan: planName })}
            </p>

            {/* Plan Badge */}
            <div className={cn(
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8',
              `bg-gradient-to-r ${tierGradient} text-white shadow-lg`
            )}>
              {tierIcon}
              <span className="font-semibold">{planName}</span>
            </div>

            {/* Subscription Summary */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                {intl.formatMessage({ id: 'subscription.success.summary' })}
              </h3>

              <div className="space-y-3">
                {/* Calls included */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">
                    {intl.formatMessage({ id: 'subscription.success.callsIncluded' })}
                  </span>
                  <span className="font-medium text-gray-900">
                    {aiCallsLimit === -1
                      ? intl.formatMessage({ id: 'subscription.plans.unlimitedCalls' })
                      : intl.formatMessage({ id: 'subscription.success.callsPerMonth' }, { count: aiCallsLimit })}
                  </span>
                </div>

                {/* Amount paid */}
                {sessionDetails?.subscription?.amountPaid !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">
                      {intl.formatMessage({ id: 'subscription.success.amountPaid' })}
                    </span>
                    <span className="font-bold text-green-600">
                      {formatPrice(
                        sessionDetails.subscription.amountPaid,
                        sessionDetails.subscription.currency
                      )}
                    </span>
                  </div>
                )}

                {/* Next billing */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {intl.formatMessage({ id: 'subscription.billing.nextBilling' })}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatDate(
                      sessionDetails?.subscription?.currentPeriodEnd ||
                      subscription?.currentPeriodEnd
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Features Unlocked */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 mb-8 text-left">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {intl.formatMessage({ id: 'subscription.success.accessTo' })}
              </h3>
              <ul className="space-y-3" role="list" aria-label={intl.formatMessage({ id: 'subscription.success.accessTo' })}>
                {[
                  intl.formatMessage({ id: 'subscription.success.features.fullAccess' }),
                  intl.formatMessage({ id: 'subscription.success.features.smartAssistant' }),
                  intl.formatMessage({ id: 'subscription.success.features.contextualSuggestions' }),
                  aiCallsLimit === -1
                    ? intl.formatMessage({ id: 'subscription.success.features.unlimitedCallsPerMonth' })
                    : intl.formatMessage({ id: 'subscription.success.features.callsPerMonth' }, { count: aiCallsLimit })
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-gray-700">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/dashboard/ai-assistant')}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label={intl.formatMessage({ id: 'subscription.success.startUsing' })}
              >
                <Sparkles className="w-5 h-5" aria-hidden="true" />
                {intl.formatMessage({ id: 'subscription.success.startUsing' })}
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                onClick={() => navigate('/dashboard/subscription')}
                className="w-full py-3 px-6 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                {intl.formatMessage({ id: 'subscription.success.viewSubscription' })}
              </button>

              {/* Download Invoice */}
              {sessionDetails?.invoice?.pdfUrl && (
                <a
                  href={sessionDetails.invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-6 text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center justify-center gap-2 focus:outline-none focus:underline"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  {intl.formatMessage({ id: 'subscription.success.downloadInvoice' })}
                </a>
              )}
            </div>

            {/* Email Confirmation Notice */}
            {customerEmail && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                  {intl.formatMessage(
                    { id: 'subscription.success.emailConfirmation' },
                    { email: customerEmail }
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Trust Badge */}
          <div className="text-center mt-6 text-sm text-gray-500">
            {intl.formatMessage({ id: 'subscription.success.thankYou' })}
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes bounce-once {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes bounce-delayed {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-5px) scale(1.1);
          }
        }

        @keyframes draw-check {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 0;
          }
        }

        .animate-bounce-once {
          animation: bounce-once 0.6s ease-out;
        }

        .animate-bounce-delayed {
          animation: bounce-delayed 1s ease-in-out infinite;
          animation-delay: 0.5s;
        }

        .animate-draw-check {
          animation: draw-check 0.8s ease-out forwards;
          animation-delay: 0.3s;
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default SubscriptionSuccessPage;
