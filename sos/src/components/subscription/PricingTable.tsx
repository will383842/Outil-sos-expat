/**
 * PricingTable Component
 * Grille tarifaire des abonnements IA avec toggle mensuel/annuel
 */

import React, { useState, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Check, X, Sparkles, Zap, Crown, Infinity } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  SubscriptionPlan,
  SubscriptionTier,
  Currency,
  ProviderType,
  BillingPeriod,
  SupportedLanguage,
  DEFAULT_ANNUAL_DISCOUNT_PERCENT,
  calculateAnnualPrice,
  calculateMonthlyEquivalent,
  calculateAnnualSavings
} from '../../types/subscription';
import { cn } from '../../utils/cn';

interface PricingTableProps {
  plans: SubscriptionPlan[];
  currentTier?: SubscriptionTier;
  currentBillingPeriod?: BillingPeriod;
  providerType: ProviderType;
  currency?: Currency;
  onSelectPlan: (plan: SubscriptionPlan, billingPeriod: BillingPeriod) => void;
  isLoading?: boolean;
  // Configuration globale (venant de l'admin)
  annualDiscountPercent?: number;
}

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  trial: <Sparkles className="w-5 h-5" />,
  basic: <Zap className="w-5 h-5" />,
  standard: <Zap className="w-5 h-5" />,
  pro: <Crown className="w-5 h-5" />,
  unlimited: <Infinity className="w-5 h-5" />
};

const TIER_COLORS: Record<SubscriptionTier, string> = {
  trial: 'border-gray-300 bg-gray-50',
  basic: 'border-blue-300 bg-blue-50',
  standard: 'border-indigo-300 bg-indigo-50',
  pro: 'border-purple-300 bg-purple-50',
  unlimited: 'border-amber-300 bg-amber-50'
};

const TIER_BUTTON_COLORS: Record<SubscriptionTier, string> = {
  trial: 'bg-gray-600 hover:bg-gray-700',
  basic: 'bg-blue-600 hover:bg-blue-700',
  standard: 'bg-indigo-600 hover:bg-indigo-700',
  pro: 'bg-purple-600 hover:bg-purple-700',
  unlimited: 'bg-amber-600 hover:bg-amber-700'
};

export const PricingTable: React.FC<PricingTableProps> = ({
  plans,
  currentTier,
  currentBillingPeriod,
  providerType: _providerType,
  currency = 'USD',
  onSelectPlan,
  isLoading = false,
  annualDiscountPercent = DEFAULT_ANNUAL_DISCOUNT_PERCENT
}) => {
  const intl = useIntl();
  const { language } = useApp();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const locale = language as SupportedLanguage;

  // Calculer les prix pour chaque plan selon la période sélectionnée
  const getPriceInfo = useMemo(() => {
    return (plan: SubscriptionPlan) => {
      const monthlyPrice = plan.pricing[selectedCurrency];
      const discount = plan.annualDiscountPercent ?? annualDiscountPercent;

      // Utiliser le prix annuel défini ou le calculer
      const annualPrice = plan.annualPricing?.[selectedCurrency]
        ?? calculateAnnualPrice(monthlyPrice, discount);

      const monthlyEquivalent = calculateMonthlyEquivalent(annualPrice);
      const savings = calculateAnnualSavings(monthlyPrice, discount);

      return {
        monthlyPrice,
        annualPrice,
        monthlyEquivalent,
        savings,
        discount
      };
    };
  }, [selectedCurrency, annualDiscountPercent]);

  const formatPrice = (price: number) => {
    const symbol = selectedCurrency === 'EUR' ? '€' : '$';
    // Formater avec décimales si nécessaire
    const formatted = price % 1 === 0 ? price.toString() : price.toFixed(2);
    return `${formatted}${symbol}`;
  };

  const getCallsLabel = (plan: SubscriptionPlan) => {
    if (plan.aiCallsLimit === -1) {
      return intl.formatMessage({ id: 'subscription.plans.unlimited' });
    }
    return intl.formatMessage({ id: 'subscription.calls' }, { count: plan.aiCallsLimit });
  };

  const isCurrentPlan = (plan: SubscriptionPlan) =>
    plan.tier === currentTier && billingPeriod === currentBillingPeriod;

  const isUpgrade = (plan: SubscriptionPlan) => {
    if (!currentTier) return true;
    const tierOrder: SubscriptionTier[] = ['trial', 'basic', 'standard', 'pro', 'unlimited'];
    return tierOrder.indexOf(plan.tier) > tierOrder.indexOf(currentTier);
  };

  const getButtonLabel = (plan: SubscriptionPlan) => {
    if (isCurrentPlan(plan)) {
      return intl.formatMessage({ id: 'subscription.plans.currentPlan' });
    }
    if (isUpgrade(plan)) {
      return intl.formatMessage({ id: 'subscription.plans.upgrade' });
    }
    return intl.formatMessage({ id: 'subscription.plans.downgrade' });
  };

  // Features - Tous les plans donnent accès à l'outil IA
  // La seule différence est le nombre d'appels IA par mois (affiché séparément)
  const getFeatures = (_tier: SubscriptionTier) => {
    // Tous les plans ont les mêmes fonctionnalités de base
    return [
      { key: 'ai_access', label: intl.formatMessage({ id: 'subscription.features.ai_chat' }), included: true },
      { key: 'ai_chat', label: intl.formatMessage({ id: 'subscription.features.ai_suggestions' }), included: true },
      { key: 'ai_suggestions', label: intl.formatMessage({ id: 'subscription.features.ai_templates' }), included: true }
    ];
  };

  return (
    <div className="space-y-6">
      {/* Billing Period Toggle - Design moderne */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative inline-flex items-center rounded-full bg-gray-100 p-1">
          {/* Background slider */}
          <div
            className={cn(
              "absolute h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-full bg-white shadow-md transition-all duration-300 ease-in-out",
              billingPeriod === 'monthly' ? 'left-1' : 'left-[calc(50%+2px)]'
            )}
          />

          <button
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              'relative z-10 px-6 py-2.5 text-sm font-semibold rounded-full transition-colors duration-200',
              billingPeriod === 'monthly'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {intl.formatMessage({ id: 'subscription.billing.monthly' })}
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={cn(
              'relative z-10 px-6 py-2.5 text-sm font-semibold rounded-full transition-colors duration-200 flex items-center gap-2',
              billingPeriod === 'yearly'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {intl.formatMessage({ id: 'subscription.billing.yearly' })}
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              -{annualDiscountPercent}%
            </span>
          </button>
        </div>

        {/* Savings message */}
        {billingPeriod === 'yearly' && (
          <p className="text-sm text-green-600 font-medium animate-fade-in">
            {intl.formatMessage({ id: 'subscription.billing.save' }, { percent: annualDiscountPercent })}
          </p>
        )}
      </div>

      {/* Currency Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
          <button
            onClick={() => setSelectedCurrency('EUR')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              selectedCurrency === 'EUR'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            EUR (€)
          </button>
          <button
            onClick={() => setSelectedCurrency('USD')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              selectedCurrency === 'USD'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            USD ($)
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const priceInfo = getPriceInfo(plan);
          const displayPrice = billingPeriod === 'monthly'
            ? priceInfo.monthlyPrice
            : priceInfo.monthlyEquivalent;

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-2xl border-2 p-6 transition-all duration-300',
                TIER_COLORS[plan.tier],
                isCurrentPlan(plan) && 'ring-2 ring-offset-2 ring-indigo-500',
                plan.tier === 'pro' && 'scale-105 shadow-xl'
              )}
            >
              {/* Popular Badge */}
              {plan.tier === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {intl.formatMessage({ id: 'subscription.plans.popular' })}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm mb-3">
                  {TIER_ICONS[plan.tier]}
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {plan.name[locale] || plan.name.fr}
                </h3>

                {/* Price Display */}
                <div className="mt-4">
                  {/* Prix barré si annuel */}
                  {billingPeriod === 'yearly' && (
                    <div className="text-lg text-gray-400 line-through mb-1">
                      {formatPrice(priceInfo.monthlyPrice)}{intl.formatMessage({ id: 'subscription.billing.perMonth' })}
                    </div>
                  )}

                  {/* Prix principal */}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={cn(
                      "font-extrabold text-gray-900 transition-all duration-300",
                      billingPeriod === 'yearly' ? 'text-3xl text-green-600' : 'text-4xl'
                    )}>
                      {formatPrice(displayPrice)}
                    </span>
                    <span className="text-gray-500">{intl.formatMessage({ id: 'subscription.billing.perMonth' })}</span>
                  </div>

                  {/* Info facturation annuelle */}
                  {billingPeriod === 'yearly' && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500">
                        {intl.formatMessage({ id: 'subscription.billing.billedAnnually' }, { price: formatPrice(priceInfo.annualPrice) })}
                      </p>
                      <p className="text-xs font-semibold text-green-600">
                        {intl.formatMessage({ id: 'subscription.billing.save' }, { percent: formatPrice(priceInfo.savings) })}{intl.formatMessage({ id: 'subscription.billing.perYear' })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Calls Limit */}
              <div className="bg-white rounded-lg p-3 mb-6 text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {getCallsLabel(plan)}
                </div>
                <div className="text-xs text-gray-500">
                  {intl.formatMessage({ id: 'subscription.plans.perMonth' })}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {getFeatures(plan.tier).map((feature) => (
                  <li
                    key={feature.key}
                    className={cn(
                      'flex items-center text-sm',
                      feature.included ? 'text-gray-700' : 'text-gray-400'
                    )}
                  >
                    {feature.included ? (
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 mr-2 flex-shrink-0" />
                    )}
                    {feature.label}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => onSelectPlan(plan, billingPeriod)}
                disabled={isCurrentPlan(plan) || isLoading}
                className={cn(
                  'w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200',
                  isCurrentPlan(plan)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : TIER_BUTTON_COLORS[plan.tier],
                  isLoading && 'opacity-50 cursor-wait'
                )}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {intl.formatMessage({ id: 'common.loading' })}
                  </span>
                ) : (
                  getButtonLabel(plan)
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Trial Info */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 text-center">
        <Sparkles className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
        <h4 className="font-semibold text-gray-900 mb-1">
          {intl.formatMessage({ id: 'subscription.trial.available' })}
        </h4>
        <p className="text-sm text-gray-600">
          {intl.formatMessage({ id: 'subscription.trial.description' })}
        </p>
      </div>
    </div>
  );
};

export default PricingTable;
