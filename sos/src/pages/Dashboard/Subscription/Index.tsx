/**
 * Subscription Dashboard Page
 * Page de gestion de l'abonnement du prestataire
 */

import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../contexts/AppContext';
import {
  CreditCard,
  Zap,
  AlertCircle,
  Clock,
  TrendingUp,
  FileText,
  Download,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useSubscription } from '../../../hooks/useSubscription';
import { useAiQuota } from '../../../hooks/useAiQuota';
import { useAuth } from '../../../contexts/AuthContext';
import { SubscriptionCard } from '../../../components/subscription/SubscriptionCard';
import { QuotaUsageBar } from '../../../components/subscription/QuotaUsageBar';
import { getInvoices, subscribeToInvoices } from '../../../services/subscription/subscriptionService';
import { Invoice, ProviderType } from '../../../types/subscription';
import { cn } from '../../../utils/cn';
import { getDateLocale } from '../../../utils/formatters';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, trend }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 bg-gray-100 rounded-lg">
        {icon}
      </div>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      {subValue && (
        <span className={cn(
          'text-sm font-medium',
          trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
        )}>
          {trend === 'up' && '↑ '}
          {trend === 'down' && '↓ '}
          {subValue}
        </span>
      )}
    </div>
  </div>
);

interface InvoiceRowProps {
  invoice: Invoice;
  locale: string;
  intl: ReturnType<typeof useIntl>;
}

const InvoiceRow: React.FC<InvoiceRowProps> = ({ invoice, locale, intl }) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(getDateLocale(locale), {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === 'EUR' ? '€' : '$';
    return `${amount}${symbol}`;
  };

  const statusColors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    open: 'bg-blue-100 text-blue-700',
    draft: 'bg-gray-100 text-gray-700',
    void: 'bg-gray-100 text-gray-500',
    uncollectible: 'bg-red-100 text-red-700'
  };

  const getStatusLabel = (status: string): string => {
    return intl.formatMessage({ id: `subscription.billing.${status}` });
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-900">
        {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {formatAmount(invoice.amountPaid || invoice.amountDue, invoice.currency)}
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          statusColors[invoice.status]
        )}>
          {getStatusLabel(invoice.status)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {invoice.invoicePdfUrl && (
          <a
            href={invoice.invoicePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
          >
            <Download className="w-4 h-4" />
            PDF
          </a>
        )}
      </td>
    </tr>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SubscriptionPage: React.FC = () => {
  const intl = useIntl();
  const { language: locale } = useApp();
  const navigate = useNavigate();

  const { user } = useAuth();
  const {
    subscription,
    plans,
    loading: subLoading,
    isTrialing,
    openBillingPortal,
    cancel: cancelSubscription,
    reactivate: reactivateSubscription,
    initializeTrial
  } = useSubscription();

  const {
    currentUsage,
    limit,
    isInTrial,
    trialDaysRemaining,
    trialCallsRemaining,
    usage
  } = useAiQuota();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

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

  // Get current plan
  const currentPlan = plans.find(p => p.id === subscription?.planId);

  // Initialize trial if no subscription
  const handleStartTrial = async () => {
    if (!user?.role) return;

    setIsInitializing(true);
    try {
      const providerType: ProviderType = user.role === 'lawyer' ? 'lawyer' : 'expat_aidant';
      await initializeTrial(providerType);
    } catch (error) {
      console.error('Error starting trial:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  // Handle cancel subscription
  const handleCancel = async () => {
    const result = await cancelSubscription(false); // Cancel at period end
    if (result.success) {
      setShowCancelModal(false);
    }
  };

  // No subscription state
  if (!subLoading && !subscription) {
    return (
      <DashboardLayout activeKey="subscription">
        <div className="bg-gray-50">
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
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
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
      <div className="bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {intl.formatMessage({ id: 'subscription.mySubscription' })}
          </h1>
          <p className="text-gray-500">
            {intl.formatMessage({ id: 'subscription.manageDescription' })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Zap className="w-5 h-5 text-indigo-600" />}
            label={intl.formatMessage({ id: 'subscription.stats.callsThisMonth' })}
            value={currentUsage}
            subValue={limit === -1 ? '∞' : `/ ${limit}`}
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            label={isInTrial
              ? intl.formatMessage({ id: 'subscription.stats.trialDaysLeft' })
              : intl.formatMessage({ id: 'subscription.stats.daysRemaining' })}
            value={isInTrial ? trialDaysRemaining : (subscription?.currentPeriodEnd ? Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0)}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
            label={intl.formatMessage({ id: 'subscription.stats.totalCalls' })}
            value={usage?.totalCallsAllTime || 0}
          />
          <StatCard
            icon={<FileText className="w-5 h-5 text-blue-600" />}
            label={intl.formatMessage({ id: 'subscription.billing.invoices' })}
            value={invoices.length}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Subscription & Usage */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Subscription */}
            {subscription && (
              <SubscriptionCard
                subscription={subscription}
                plan={currentPlan || null}
                onManageBilling={openBillingPortal}
                onChangePlan={() => navigate('/dashboard/subscription/plans')}
                onCancelSubscription={() => setShowCancelModal(true)}
                onReactivate={subscription.cancelAtPeriodEnd ? reactivateSubscription : undefined}
                isLoading={subLoading}
              />
            )}

            {/* Usage Chart */}
            <QuotaUsageBar
              currentUsage={currentUsage}
              limit={limit}
              isInTrial={isInTrial}
              trialDaysRemaining={trialDaysRemaining}
              trialCallsRemaining={trialCallsRemaining}
              showUpgradePrompt
              onUpgradeClick={() => navigate('/dashboard/subscription/plans')}
            />
          </div>

          {/* Right Column - Quick Actions & Invoices */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">
                {intl.formatMessage({ id: 'subscription.quickActions.title' })}
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/dashboard/ai-assistant')}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <span className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {intl.formatMessage({ id: 'subscription.quickActions.openAI' })}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>

                <button
                  onClick={() => navigate('/dashboard/subscription/plans')}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <span className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {intl.formatMessage({ id: 'subscription.viewPlans' })}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>

                {subscription?.stripeCustomerId && (
                  <button
                    onClick={openBillingPortal}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <span className="flex items-center gap-3">
                      <ExternalLink className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {intl.formatMessage({ id: 'subscription.quickActions.billingPortal' })}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">
                  {intl.formatMessage({ id: 'subscription.billing.recentInvoices' })}
                </h3>
              </div>

              {invoicesLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {intl.formatMessage({ id: 'subscription.billing.noInvoices' })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'subscription.billing.period' })}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'subscription.billing.amount' })}
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {intl.formatMessage({ id: 'subscription.billing.status' })}
                        </th>
                        <th className="px-4 py-2"></th>
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
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {intl.formatMessage({ id: 'subscription.cancelModal.title' })}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {intl.formatMessage({ id: 'subscription.cancelModal.message' })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                {intl.formatMessage({ id: 'subscription.cancelModal.keep' })}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
              >
                {intl.formatMessage({ id: 'subscription.cancelModal.confirm' })}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionPage;
