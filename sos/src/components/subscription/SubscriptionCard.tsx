/**
 * SubscriptionCard Component
 * Affiche le plan d'abonnement actuel
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { useApp } from '../../contexts/AppContext';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Zap,
  Crown,
  Infinity,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { Subscription, SubscriptionPlan, SubscriptionTier, Currency, SupportedLanguage } from '../../types/subscription';
import { cn } from '../../utils/cn';
import { getDateLocale } from '../../utils/formatters';

interface SubscriptionCardProps {
  subscription: Subscription;
  plan: SubscriptionPlan | null;
  onManageBilling: () => void;
  onChangePlan: () => void;
  onCancelSubscription?: () => void;
  onReactivate?: () => void;
  isLoading?: boolean;
}

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  trial: <Sparkles className="w-6 h-6" />,
  basic: <Zap className="w-6 h-6" />,
  standard: <Zap className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  unlimited: <Infinity className="w-6 h-6" />
};

const TIER_GRADIENTS: Record<SubscriptionTier, string> = {
  trial: 'from-gray-500 to-gray-600',
  basic: 'from-blue-500 to-blue-600',
  standard: 'from-indigo-500 to-indigo-600',
  pro: 'from-purple-500 to-purple-600',
  unlimited: 'from-amber-500 to-orange-500'
};

const STATUS_BADGES: Record<string, { bg: string; text: string; labelKey: string }> = {
  trialing: { bg: 'bg-blue-100', text: 'text-blue-700', labelKey: 'subscription.status.trialing' },
  active: { bg: 'bg-green-100', text: 'text-green-700', labelKey: 'subscription.status.active' },
  past_due: { bg: 'bg-red-100', text: 'text-red-700', labelKey: 'subscription.status.past_due' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', labelKey: 'subscription.status.canceled' },
  canceled: { bg: 'bg-gray-100', text: 'text-gray-700', labelKey: 'subscription.status.canceled' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-700', labelKey: 'subscription.status.expired' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', labelKey: 'subscription.status.paused' }
};

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  plan,
  onManageBilling,
  onChangePlan,
  onCancelSubscription,
  onReactivate,
  isLoading = false
}) => {
  const intl = useIntl();
  const { language } = useApp();
  const locale = language as SupportedLanguage;

  const statusConfig = STATUS_BADGES[subscription.status] || STATUS_BADGES.expired;
  const tierGradient = TIER_GRADIENTS[subscription.tier] || TIER_GRADIENTS.basic;

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat(getDateLocale(locale), {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const formatPrice = (amount: number, currency: Currency) => {
    const symbol = currency === 'EUR' ? '€' : '$';
    const formatted = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formatted} ${symbol}`;
  };

  const getPlanName = () => {
    if (plan) {
      return plan.name[locale] || plan.name.fr;
    }
    // Fallback names
    const tierNames: Record<SubscriptionTier, string> = {
      trial: intl.formatMessage({ id: 'subscription.plans.trial' }),
      basic: intl.formatMessage({ id: 'subscription.plans.basic' }),
      standard: intl.formatMessage({ id: 'subscription.plans.standard' }),
      pro: intl.formatMessage({ id: 'subscription.plans.pro' }),
      unlimited: intl.formatMessage({ id: 'subscription.plans.unlimited' })
    };
    return tierNames[subscription.tier] || subscription.tier;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      {/* Header with gradient */}
      <div className={cn('bg-gradient-to-r p-6 text-white', tierGradient)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              {TIER_ICONS[subscription.tier]}
            </div>
            <div>
              <h3 className="text-xl font-bold">{getPlanName()}</h3>
              <p className="text-white/80 text-sm">
                {plan?.aiCallsLimit === -1
                  ? intl.formatMessage({ id: 'subscription.plans.unlimitedCalls' })
                  : intl.formatMessage({ id: 'subscription.plans.callsPerMonth' }, { count: plan?.aiCallsLimit || 0 })}
              </p>
            </div>
          </div>
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            'bg-white/20 text-white'
          )}>
            {intl.formatMessage({ id: statusConfig.labelKey })}
          </div>
        </div>

        {/* Price */}
        {subscription.status !== 'trialing' && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <span className="text-3xl font-extrabold">
              {formatPrice(subscription.currentPeriodAmount, subscription.currency)}
            </span>
            <span className="text-white/80">{intl.formatMessage({ id: 'subscription.billing.perMonth' })}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Trial Warning */}
        {subscription.status === 'trialing' && subscription.trialEndsAt && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">
                {intl.formatMessage({ id: 'subscription.trial.title' })}
              </p>
              <p className="text-sm text-blue-700">
                {intl.formatMessage({ id: 'subscription.trial.endsOn' }, { date: formatDate(subscription.trialEndsAt) })}
              </p>
            </div>
          </div>
        )}

        {/* Cancellation Warning */}
        {subscription.cancelAtPeriodEnd && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">
                {intl.formatMessage({ id: 'subscription.cancelModal.scheduled' })}
              </p>
              <p className="text-sm text-amber-700">
                {intl.formatMessage({ id: 'subscription.cancelModal.endsOn' }, { date: formatDate(subscription.currentPeriodEnd) })}
              </p>
              {onReactivate && (
                <button
                  onClick={onReactivate}
                  disabled={isLoading}
                  className="mt-2 text-sm font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  {intl.formatMessage({ id: 'subscription.reactivate' })}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Payment Failed Warning */}
        {subscription.status === 'past_due' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">
                {intl.formatMessage({ id: 'subscription.errors.paymentFailed' })}
              </p>
              <p className="text-sm text-red-700">
                {intl.formatMessage({ id: 'subscription.errors.updatePaymentMethod' })}
              </p>
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-3">
          {subscription.status !== 'trialing' && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {intl.formatMessage({ id: 'subscription.billing.nextBilling' })}
              </span>
              <span className="font-medium text-gray-900">
                {formatDate(subscription.currentPeriodEnd)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {intl.formatMessage({ id: 'subscription.billing.currency' })}
            </span>
            <span className="font-medium text-gray-900">
              {subscription.currency}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 space-y-3">
          {subscription.status !== 'trialing' && (
            <button
              onClick={onManageBilling}
              disabled={isLoading}
              className="w-full py-2.5 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              {intl.formatMessage({ id: 'subscription.manageBilling' })}
            </button>
          )}

          <button
            onClick={onChangePlan}
            disabled={isLoading}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
              subscription.status === 'trialing'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                : 'border border-indigo-300 text-indigo-700 hover:bg-indigo-50'
            )}
          >
            <Zap className="w-4 h-4" />
            {subscription.status === 'trialing'
              ? intl.formatMessage({ id: 'subscription.viewPlans' })
              : intl.formatMessage({ id: 'subscription.changePlan' })}
          </button>

          {onCancelSubscription && subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
            <button
              onClick={onCancelSubscription}
              disabled={isLoading}
              className="w-full py-2 px-4 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              {intl.formatMessage({ id: 'subscription.cancelSubscription' })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCard;
