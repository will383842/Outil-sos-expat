/**
 * MySubscription Page
 * Page "Mon Abonnement IA" pour les prestataires
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useLocaleNavigate } from '../../multilingual-system';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { useAiQuota } from '../../hooks/useAiQuota';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  ExternalLink,
  Zap,
  Crown,
  Infinity,
  RefreshCw,
  Download,
  FileText,
  X,
  Sparkles,
  AlertTriangle,
  Check
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { SubscriptionCard } from '../../components/subscription/SubscriptionCard';
import { QuotaUsageBar } from '../../components/subscription/QuotaUsageBar';
import { subscribeToInvoices } from '../../services/subscription/subscriptionService';
import { Invoice, SubscriptionTier, SupportedLanguage } from '../../types/subscription';
import { cn } from '../../utils/cn';
import { getDateLocale } from '../../utils/formatters';

// ============================================================================
// TYPES
// ============================================================================

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  endDate: string;
  isLoading: boolean;
}

// ============================================================================
// TIER ICONS
// ============================================================================

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  trial: <Sparkles className="w-5 h-5" />,
  basic: <Zap className="w-5 h-5" />,
  standard: <Zap className="w-5 h-5" />,
  pro: <Crown className="w-5 h-5" />,
  unlimited: <Infinity className="w-5 h-5" />
};

const TIER_COLORS: Record<SubscriptionTier, string> = {
  trial: 'from-gray-500 to-gray-600',
  basic: 'from-blue-500 to-blue-600',
  standard: 'from-indigo-500 to-indigo-600',
  pro: 'from-purple-500 to-purple-600',
  unlimited: 'from-amber-500 to-orange-500'
};

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

interface StatusBadgeProps {
  status: string;
  intl: ReturnType<typeof useIntl>;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, intl }) => {
  const config: Record<string, { bg: string; text: string }> = {
    trialing: { bg: 'bg-blue-100', text: 'text-blue-700' },
    active: { bg: 'bg-green-100', text: 'text-green-700' },
    past_due: { bg: 'bg-red-100', text: 'text-red-700' },
    canceled: { bg: 'bg-gray-100', text: 'text-gray-700' },
    expired: { bg: 'bg-gray-100', text: 'text-gray-700' },
    paused: { bg: 'bg-yellow-100', text: 'text-yellow-700' }
  };

  const { bg, text } = config[status] || config.expired;

  return (
    <span className={cn('px-3 py-1 rounded-full text-sm font-medium', bg, text)}>
      {intl.formatMessage({ id: `subscription.status.${status}` })}
    </span>
  );
};

// ============================================================================
// CANCEL MODAL COMPONENT
// ============================================================================

const CancelModal: React.FC<CancelModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  endDate,
  isLoading
}) => {
  const intl = useIntl();
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {intl.formatMessage({ id: 'subscription.cancelModal.title' })}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={intl.formatMessage({ id: 'common.close', defaultMessage: 'Close' })}
          >
            <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        {/* Message */}
        <p className="text-gray-600 mb-4">
          {intl.formatMessage({ id: 'subscription.cancelModal.message' })}
        </p>

        {/* Access reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              {intl.formatMessage(
                { id: 'subscription.cancelModal.endsOn' },
                { date: endDate }
              )}
            </p>
          </div>
        </div>

        {/* Reason field (optional) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {intl.formatMessage({ id: 'subscription.cancelModal.reasonLabel', defaultMessage: 'Raison (optionnel)' })}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={intl.formatMessage({
              id: 'subscription.cancelModal.reasonPlaceholder',
              defaultMessage: 'Pourquoi souhaitez-vous annuler votre abonnement ?'
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {intl.formatMessage({ id: 'subscription.cancelModal.keep' })}
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {intl.formatMessage({ id: 'subscription.cancelModal.confirm' })}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// INVOICE ROW COMPONENT
// ============================================================================

interface InvoiceRowProps {
  invoice: Invoice;
  locale: string;
  intl: ReturnType<typeof useIntl>;
}

const InvoiceRow: React.FC<InvoiceRowProps> = ({ invoice, locale, intl }) => {
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat(getDateLocale(locale), {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === 'EUR' ? '€' : '$';
    const formatted = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formatted} ${symbol}`;
  };

  const statusColors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    open: 'bg-blue-100 text-blue-700',
    draft: 'bg-gray-100 text-gray-700',
    void: 'bg-gray-100 text-gray-500',
    uncollectible: 'bg-red-100 text-red-700'
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-900">
        {formatDate(invoice.createdAt)}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {formatAmount(invoice.amountPaid || invoice.amountDue, invoice.currency)}
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          statusColors[invoice.status] || statusColors.draft
        )}>
          {intl.formatMessage({ id: `subscription.billing.${invoice.status}` })}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {invoice.invoicePdfUrl && (
          <a
            href={invoice.invoicePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            {intl.formatMessage({ id: 'subscription.billing.downloadPdf' })}
          </a>
        )}
      </td>
    </tr>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MySubscription: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const locale = language as SupportedLanguage;
  const navigate = useLocaleNavigate();
  const { user } = useAuth();

  // SECURITY: Block clients from accessing this page
  const userRole = user?.role || user?.type || '';
  // Note: Only check for 'client' as valid UserRole; 'user' is not a valid role in the type system
  const isClient = userRole === 'client';

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Hooks
  const {
    subscription,
    plans,
    loading: subLoading,
    error: subError,
    isTrialing,
    isPastDue,
    openBillingPortal,
    cancelSubscription,
    reactivateSubscription,
    initializeTrial
  } = useSubscription();

  const {
    currentUsage,
    limit,
    isInTrial,
    trialDaysRemaining,
    trialCallsRemaining,
    isNearQuotaLimit,
    isUnlimited,
    loading: quotaLoading
  } = useAiQuota();

  // Local state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Redirect clients to dashboard
  useEffect(() => {
    if (user && isClient) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isClient, navigate]);

  // Load invoices
  useEffect(() => {
    if (!user?.uid) return;

    setInvoicesLoading(true);
    const unsubscribe = subscribeToInvoices(user.uid, (loadedInvoices) => {
      setInvoices(loadedInvoices);
      setInvoicesLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Current plan
  const currentPlan = useMemo(() => {
    return plans.find(p => p.id === subscription?.planId);
  }, [plans, subscription?.planId]);

  // If user is a client, show error and redirect
  if (isClient) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {intl.formatMessage({ id: 'subscription.errors.clientNotAllowed', defaultMessage: 'Accès non autorisé' })}
          </h2>
          <p className="text-gray-600 text-center max-w-md">
            {intl.formatMessage({ id: 'subscription.errors.clientNotAllowedMessage', defaultMessage: 'Seuls les prestataires (avocats et expatriés aidants) peuvent accéder aux abonnements.' })}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Format date
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat(getDateLocale(locale), {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  // Format price
  const formatPrice = (amount: number, currency: string) => {
    const symbol = currency === 'EUR' ? '€' : '$';
    const formatted = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formatted} ${symbol}`;
  };

  // Get plan name
  const getPlanName = (): string => {
    if (currentPlan) {
      return currentPlan.name[locale] || currentPlan.name.fr;
    }
    if (subscription?.tier) {
      return intl.formatMessage({ id: `subscription.plans.${subscription.tier}` });
    }
    return '-';
  };

  // Get billing period label
  const getBillingPeriodLabel = (): string => {
    const period = subscription?.billingPeriod || 'monthly';
    return intl.formatMessage({ id: `subscription.billing.${period}` });
  };

  // Handle start trial
  const handleStartTrial = async () => {
    if (!user?.role) return;

    setIsInitializing(true);
    try {
      // initializeTrial uses the providerType from the hook internally
      await initializeTrial();
    } catch (error) {
      console.error('Error starting trial:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  // Handle cancel
  const handleCancel = async (reason: string) => {
    setActionLoading(true);
    try {
      await cancelSubscription(reason);
      setShowCancelModal(false);
    } catch (error) {
      console.error('Error canceling subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reactivate
  const handleReactivate = async () => {
    setActionLoading(true);
    try {
      await reactivateSubscription();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle billing portal
  const handleBillingPortal = async () => {
    setActionLoading(true);
    try {
      await openBillingPortal();
    } catch (error) {
      console.error('Error opening billing portal:', error);
      setActionLoading(false);
    }
  };

  // Loading state
  if (subLoading || quotaLoading) {
    return (
      <DashboardLayout activeKey="subscription">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">{intl.formatMessage({ id: 'subscription.plans.loading' })}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // No subscription state
  if (!subscription) {
    return (
      <DashboardLayout activeKey="subscription">
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {intl.formatMessage({ id: 'subscription.trial.title' })}
              </h1>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {intl.formatMessage({ id: 'subscription.trial.description' })}
              </p>
              <button
                onClick={handleStartTrial}
                disabled={isInitializing}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {isInitializing
                  ? intl.formatMessage({ id: 'subscription.checkout.processing' })
                  : intl.formatMessage({ id: 'subscription.trial.startTrial' })}
              </button>
              <p className="text-sm text-gray-500 mt-4">
                {intl.formatMessage({ id: 'subscription.trial.noCreditCard' })}
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeKey="subscription">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* ============================================================ */}
          {/* 1. HEADER WITH STATUS */}
          {/* ============================================================ */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {intl.formatMessage({ id: 'subscription.mySubscription' })}
                </h1>
                <p className="text-gray-500 mt-1">
                  {intl.formatMessage({ id: 'subscription.manageDescription' })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r text-white font-medium',
                  TIER_COLORS[subscription.tier] || TIER_COLORS.basic
                )}>
                  {TIER_ICONS[subscription.tier]}
                  <span>{getPlanName()}</span>
                </div>
                <StatusBadge status={subscription.status} intl={intl} />
              </div>
            </div>

            {/* Cancellation scheduled alert */}
            {subscription.cancelAtPeriodEnd && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">
                      {intl.formatMessage({ id: 'subscription.cancelModal.scheduled' })}
                    </p>
                    <p className="text-sm text-amber-700">
                      {intl.formatMessage(
                        { id: 'subscription.cancelModal.endsOn' },
                        { date: formatDate(subscription.currentPeriodEnd) }
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReactivate}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn('w-4 h-4', actionLoading && 'animate-spin')} />
                  {intl.formatMessage({ id: 'subscription.reactivate' })}
                </button>
              </div>
            )}

            {/* Payment failed alert */}
            {isPastDue && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">
                      {intl.formatMessage({ id: 'subscription.errors.paymentFailed' })}
                    </p>
                    <p className="text-sm text-red-700">
                      {intl.formatMessage({ id: 'subscription.errors.updatePaymentMethod' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleBillingPortal}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  {intl.formatMessage({ id: 'subscription.manageBilling' })}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* ============================================================ */}
              {/* 2. QUOTA IA CARD */}
              {/* ============================================================ */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    {intl.formatMessage({ id: 'subscription.quota.usage' })}
                  </h2>

                  {isUnlimited ? (
                    <div className="flex items-center gap-4 py-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
                        <Infinity className="w-8 h-8 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-900">
                          {intl.formatMessage({ id: 'subscription.quota.unlimited' })}
                        </p>
                        <p className="text-gray-600">
                          {currentUsage} {intl.formatMessage({ id: 'subscription.quota.used' }).toLowerCase()}
                        </p>
                      </div>
                    </div>
                  ) : isInTrial ? (
                    <div className="space-y-4">
                      <QuotaUsageBar
                        currentUsage={currentUsage}
                        limit={limit}
                        isInTrial={true}
                        trialDaysRemaining={trialDaysRemaining}
                        trialCallsRemaining={trialCallsRemaining}
                        showUpgradePrompt={false}
                        compact={false}
                      />
                      <div className="bg-indigo-50 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-indigo-600" />
                          <span className="text-sm font-medium text-indigo-900">
                            {intl.formatMessage(
                              { id: 'subscription.trial.callsRemaining' },
                              { calls: trialCallsRemaining }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <QuotaUsageBar
                      currentUsage={currentUsage}
                      limit={limit}
                      isInTrial={false}
                      showUpgradePrompt={false}
                      compact={false}
                    />
                  )}

                  {/* Upgrade button if near limit */}
                  {isNearQuotaLimit && !isUnlimited && (
                    <button
                      onClick={() => navigate('/dashboard/subscription/plans')}
                      className="mt-4 w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      {intl.formatMessage({ id: 'subscription.quota.upgradePrompt' })}
                    </button>
                  )}
                </div>
              </div>

              {/* ============================================================ */}
              {/* 3. SUBSCRIPTION INFORMATION */}
              {/* ============================================================ */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gray-600" />
                    {intl.formatMessage({ id: 'subscription.billing.title' })}
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Current price */}
                    {subscription.status !== 'trialing' && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-500 mb-1">
                          {intl.formatMessage({ id: 'subscription.billing.amount' })}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatPrice(subscription.currentPeriodAmount, subscription.currency)}
                          <span className="text-sm font-normal text-gray-500">
                            {intl.formatMessage({ id: 'subscription.billing.perMonth' })}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Billing period */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">
                        {intl.formatMessage({ id: 'subscription.billing.period' })}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {getBillingPeriodLabel()}
                      </p>
                    </div>

                    {/* Next renewal */}
                    {subscription.status !== 'trialing' && !subscription.cancelAtPeriodEnd && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-500 mb-1">
                          {intl.formatMessage({ id: 'subscription.billing.nextBilling' })}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      </div>
                    )}

                    {/* Currency */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">
                        {intl.formatMessage({ id: 'subscription.billing.currency' })}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {subscription.currency}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* 5. INVOICE HISTORY */}
              {/* ============================================================ */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    {intl.formatMessage({ id: 'subscription.billing.invoiceHistory' })}
                  </h2>
                  {subscription.stripeCustomerId && invoices.length > 5 && (
                    <button
                      onClick={handleBillingPortal}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                      {intl.formatMessage({ id: 'subscription.billing.viewAll', defaultMessage: 'Voir toutes' })}
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {invoicesLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {intl.formatMessage({ id: 'subscription.billing.noInvoices' })}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {intl.formatMessage({ id: 'subscription.billing.date' })}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {intl.formatMessage({ id: 'subscription.billing.amount' })}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {intl.formatMessage({ id: 'subscription.billing.status' })}
                          </th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoices.slice(0, 5).map((invoice) => (
                          <InvoiceRow
                            key={invoice.id}
                            invoice={invoice}
                            locale={locale}
                            intl={intl}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* ============================================================ */}
              {/* 4. ACTIONS */}
              {/* ============================================================ */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {intl.formatMessage({ id: 'subscription.actions.title' })}
                </h2>
                <div className="space-y-3">
                  {/* Change plan */}
                  <button
                    onClick={() => navigate('/dashboard/subscription/plans')}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    {intl.formatMessage({ id: 'subscription.changePlan' })}
                  </button>

                  {/* Manage payment */}
                  {subscription.stripeCustomerId && subscription.status !== 'trialing' && (
                    <button
                      onClick={handleBillingPortal}
                      disabled={actionLoading}
                      className="w-full py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {intl.formatMessage({ id: 'subscription.manageBilling' })}
                    </button>
                  )}

                  {/* Cancel subscription */}
                  {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full py-3 px-4 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm"
                    >
                      {intl.formatMessage({ id: 'subscription.cancelSubscription' })}
                    </button>
                  )}

                  {/* Reactivate subscription */}
                  {subscription.cancelAtPeriodEnd && (
                    <button
                      onClick={handleReactivate}
                      disabled={actionLoading}
                      className="w-full py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={cn('w-4 h-4', actionLoading && 'animate-spin')} />
                      {intl.formatMessage({ id: 'subscription.reactivate' })}
                    </button>
                  )}
                </div>
              </div>

              {/* Current subscription summary card */}
              {subscription && (
                <SubscriptionCard
                  subscription={subscription}
                  plan={currentPlan || null}
                  onManageBilling={handleBillingPortal}
                  onChangePlan={() => navigate('/dashboard/subscription/plans')}
                  onCancelSubscription={() => setShowCancelModal(true)}
                  onReactivate={subscription.cancelAtPeriodEnd ? handleReactivate : undefined}
                  isLoading={actionLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. CANCEL MODAL */}
      {/* ============================================================ */}
      <CancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        endDate={formatDate(subscription.currentPeriodEnd)}
        isLoading={actionLoading}
      />
    </DashboardLayout>
  );
};

export default MySubscription;
