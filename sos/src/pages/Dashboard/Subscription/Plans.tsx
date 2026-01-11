/**
 * Subscription Plans Page
 * Page de sélection des plans d'abonnement
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useLocaleNavigate } from '../../../multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '../../../multilingual-system/core/routing/localeRoutes';
import { useApp } from '../../../contexts/AppContext';
import { ArrowLeft, Check, Shield, CreditCard, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useSubscription } from '../../../hooks/useSubscription';
import { useAuth } from '../../../contexts/AuthContext';
import { PricingTable } from '../../../components/subscription/PricingTable';
import { createSubscription } from '../../../services/subscription/subscriptionService';
import { SubscriptionPlan, Currency, ProviderType, BillingPeriod, SupportedLanguage } from '../../../types/subscription';
import { cn } from '../../../utils/cn';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// ============================================================================
// CHECKOUT FORM COMPONENT
// ============================================================================

interface CheckoutFormProps {
  selectedPlan: SubscriptionPlan;
  currency: Currency;
  onSuccess: () => void;
  onCancel: () => void;
  locale: SupportedLanguage;
  successUrl: string;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  selectedPlan,
  currency,
  onSuccess,
  onCancel,
  locale,
  successUrl
}) => {
  const intl = useIntl();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Validate the payment element
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message);
      }

      // Create subscription via Cloud Function
      const result = await createSubscription({
        planId: selectedPlan.id,
        currency
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create subscription');
      }

      // If there's a client secret, confirm the payment
      if (result.clientSecret) {
        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          clientSecret: result.clientSecret,
          confirmParams: {
            return_url: successUrl
          }
        });

        if (confirmError) {
          throw new Error(confirmError.message);
        }
      } else {
        // No payment confirmation needed (e.g., free trial with payment method)
        onSuccess();
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || intl.formatMessage({ id: 'subscription.errors.paymentFailed' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    // Map supported languages to proper Intl locale codes
    const localeMap: Record<string, string> = {
      fr: 'fr-FR',
      en: 'en-US',
      es: 'es-ES',
      de: 'de-DE',
      pt: 'pt-PT',
      ru: 'ru-RU',
      ar: 'ar-SA',
      ch: 'zh-CN',
      hi: 'hi-IN'
    };
    return new Intl.NumberFormat(localeMap[locale] || 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          {intl.formatMessage({ id: 'subscription.checkout.orderSummary' })}
        </h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">
            {selectedPlan.name[locale] || selectedPlan.name.en}
          </span>
          <span className="font-semibold text-gray-900">
            {formatPrice(selectedPlan.pricing[currency])}{intl.formatMessage({ id: 'subscription.plans.perMonth' })}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {selectedPlan.aiCallsLimit === -1
              ? intl.formatMessage({ id: 'subscription.plans.unlimitedCalls' })
              : intl.formatMessage({ id: 'subscription.plans.callsPerMonth' }, { count: selectedPlan.aiCallsLimit })}
          </span>
        </div>
        <div className="border-t border-gray-200 mt-4 pt-4">
          <div className="flex items-center justify-between font-semibold">
            <span>{intl.formatMessage({ id: 'subscription.checkout.monthlyTotal' })}</span>
            <span className="text-lg">{formatPrice(selectedPlan.pricing[currency])}</span>
          </div>
        </div>
      </div>

      {/* Payment Element */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {intl.formatMessage({ id: 'subscription.checkout.paymentInfo' })}
        </label>
        <div className="border border-gray-300 rounded-lg p-4 bg-white">
          <PaymentElement />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Security Note */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Shield className="w-4 h-4" />
        {intl.formatMessage({ id: 'subscription.checkout.securePayment' })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {intl.formatMessage({ id: 'subscription.checkout.cancel' })}
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {intl.formatMessage({ id: 'subscription.checkout.processing' })}
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              {intl.formatMessage({ id: 'subscription.checkout.subscribe' })}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// ============================================================================
// DEFAULT PLANS (fallback when Firestore is empty)
// ============================================================================

const NOW = new Date();
// Tous les plans donnent accès à l'outil IA uniquement (pas de templates, traductions, APIs, support)
const DEFAULT_FEATURES = [
  { key: 'ai_access', name: {
    fr: 'Accès complet à l\'outil IA', en: 'Full AI tool access', es: 'Acceso completo a la herramienta IA',
    de: 'Vollständiger Zugang zum KI-Tool', pt: 'Acesso completo à ferramenta IA', ru: 'Полный доступ к инструменту ИИ',
    ar: 'وصول كامل لأداة الذكاء الاصطناعي', ch: '完整访问AI工具', hi: 'AI टूल तक पूर्ण पहुंच'
  }, included: true },
  { key: 'ai_assistant', name: {
    fr: 'Assistant IA intelligent', en: 'Smart AI Assistant', es: 'Asistente IA inteligente',
    de: 'Intelligenter KI-Assistent', pt: 'Assistente IA inteligente', ru: 'Умный ИИ-ассистент',
    ar: 'مساعد ذكاء اصطناعي ذكي', ch: '智能AI助手', hi: 'स्मार्ट AI सहायक'
  }, included: true },
];

const DEFAULT_LAWYER_PLANS: SubscriptionPlan[] = [
  {
    id: 'lawyer_basic',
    tier: 'basic',
    providerType: 'lawyer',
    pricing: { EUR: 14, USD: 19 },
    annualPricing: { EUR: 134.4, USD: 182.4 },
    annualDiscountPercent: 20,
    aiCallsLimit: 5,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Basique', en: 'Basic', es: 'Básico', de: 'Basis', pt: 'Básico', ru: 'Базовый', ar: 'أساسي', ch: '基础版', hi: 'बेसिक' },
    description: { fr: '5 appels IA par mois', en: '5 AI calls per month', es: '5 llamadas IA por mes', de: '5 KI-Anrufe pro Monat', pt: '5 chamadas IA por mês', ru: '5 ИИ-звонков в месяц', ar: '5 مكالمات ذكاء اصطناعي شهرياً', ch: '每月5次AI通话', hi: 'प्रति माह 5 AI कॉल' },
    sortOrder: 1,
    features: DEFAULT_FEATURES,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'lawyer_standard',
    tier: 'standard',
    providerType: 'lawyer',
    pricing: { EUR: 39, USD: 49 },
    annualPricing: { EUR: 374.4, USD: 470.4 },
    annualDiscountPercent: 20,
    aiCallsLimit: 15,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Standard', en: 'Standard', es: 'Estándar', de: 'Standard', pt: 'Padrão', ru: 'Стандарт', ar: 'قياسي', ch: '标准版', hi: 'स्टैंडर्ड' },
    description: { fr: '15 appels IA par mois', en: '15 AI calls per month', es: '15 llamadas IA por mes', de: '15 KI-Anrufe pro Monat', pt: '15 chamadas IA por mês', ru: '15 ИИ-звонков в месяц', ar: '15 مكالمات ذكاء اصطناعي شهرياً', ch: '每月15次AI通话', hi: 'प्रति माह 15 AI कॉल' },
    sortOrder: 2,
    features: DEFAULT_FEATURES,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'lawyer_pro',
    tier: 'pro',
    providerType: 'lawyer',
    pricing: { EUR: 69, USD: 79 },
    annualPricing: { EUR: 662.4, USD: 758.4 },
    annualDiscountPercent: 20,
    aiCallsLimit: 30,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Professionnel', en: 'Professional', es: 'Profesional', de: 'Professionell', pt: 'Profissional', ru: 'Профессионал', ar: 'احترافي', ch: '专业版', hi: 'प्रोफेशनल' },
    description: { fr: '30 appels IA par mois', en: '30 AI calls per month', es: '30 llamadas IA por mes', de: '30 KI-Anrufe pro Monat', pt: '30 chamadas IA por mês', ru: '30 ИИ-звонков в месяц', ar: '30 مكالمات ذكاء اصطناعي شهرياً', ch: '每月30次AI通话', hi: 'प्रति माह 30 AI कॉल' },
    sortOrder: 3,
    features: DEFAULT_FEATURES,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'lawyer_unlimited',
    tier: 'unlimited',
    providerType: 'lawyer',
    pricing: { EUR: 119, USD: 139 },
    annualPricing: { EUR: 1142.4, USD: 1334.4 },
    annualDiscountPercent: 20,
    aiCallsLimit: -1,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Illimité', en: 'Unlimited', es: 'Ilimitado', de: 'Unbegrenzt', pt: 'Ilimitado', ru: 'Безлимит', ar: 'غير محدود', ch: '无限版', hi: 'अनलिमिटेड' },
    description: { fr: 'Appels illimités', en: 'Unlimited calls', es: 'Llamadas ilimitadas', de: 'Unbegrenzte Anrufe', pt: 'Chamadas ilimitadas', ru: 'Неограниченные звонки', ar: 'مكالمات غير محدودة', ch: '无限通话', hi: 'असीमित कॉल' },
    sortOrder: 4,
    features: DEFAULT_FEATURES,
    createdAt: NOW,
    updatedAt: NOW
  }
];

const DEFAULT_EXPAT_PLANS: SubscriptionPlan[] = [
  {
    id: 'expat_aidant_basic',
    tier: 'basic',
    providerType: 'expat_aidant',
    pricing: { EUR: 9, USD: 9 },
    annualPricing: { EUR: 86.4, USD: 86.4 },
    annualDiscountPercent: 20,
    aiCallsLimit: 5,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Basique', en: 'Basic', es: 'Básico', de: 'Basis', pt: 'Básico', ru: 'Базовый', ar: 'أساسي', ch: '基础版', hi: 'बेसिक' },
    description: { fr: '5 appels IA par mois', en: '5 AI calls per month', es: '5 llamadas IA por mes', de: '5 KI-Anrufe pro Monat', pt: '5 chamadas IA por mês', ru: '5 ИИ-звонков в месяц', ar: '5 مكالمات ذكاء اصطناعي شهرياً', ch: '每月5次AI通话', hi: 'प्रति माह 5 AI कॉल' },
    sortOrder: 1,
    features: DEFAULT_FEATURES,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'expat_aidant_standard',
    tier: 'standard',
    providerType: 'expat_aidant',
    pricing: { EUR: 14, USD: 17 },
    annualPricing: { EUR: 134.4, USD: 163.2 },
    annualDiscountPercent: 20,
    aiCallsLimit: 15,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Standard', en: 'Standard', es: 'Estándar', de: 'Standard', pt: 'Padrão', ru: 'Стандарт', ar: 'قياسي', ch: '标准版', hi: 'स्टैंडर्ड' },
    description: { fr: '15 appels IA par mois', en: '15 AI calls per month', es: '15 llamadas IA por mes', de: '15 KI-Anrufe pro Monat', pt: '15 chamadas IA por mês', ru: '15 ИИ-звонков в месяц', ar: '15 مكالمات ذكاء اصطناعي شهرياً', ch: '每月15次AI通话', hi: 'प्रति माह 15 AI कॉल' },
    sortOrder: 2,
    features: DEFAULT_FEATURES,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'expat_aidant_pro',
    tier: 'pro',
    providerType: 'expat_aidant',
    pricing: { EUR: 24, USD: 29 },
    annualPricing: { EUR: 230.4, USD: 278.4 },
    annualDiscountPercent: 20,
    aiCallsLimit: 30,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Professionnel', en: 'Professional', es: 'Profesional', de: 'Professionell', pt: 'Profissional', ru: 'Профессионал', ar: 'احترافي', ch: '专业版', hi: 'प्रोफेशनल' },
    description: { fr: '30 appels IA par mois', en: '30 AI calls per month', es: '30 llamadas IA por mes', de: '30 KI-Anrufe pro Monat', pt: '30 chamadas IA por mês', ru: '30 ИИ-звонков в месяц', ar: '30 مكالمات ذكاء اصطناعي شهرياً', ch: '每月30次AI通话', hi: 'प्रति माह 30 AI कॉल' },
    sortOrder: 3,
    features: DEFAULT_FEATURES,
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'expat_aidant_unlimited',
    tier: 'unlimited',
    providerType: 'expat_aidant',
    pricing: { EUR: 39, USD: 49 },
    annualPricing: { EUR: 374.4, USD: 470.4 },
    annualDiscountPercent: 20,
    aiCallsLimit: -1,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Illimité', en: 'Unlimited', es: 'Ilimitado', de: 'Unbegrenzt', pt: 'Ilimitado', ru: 'Безлимит', ar: 'غير محدود', ch: '无限版', hi: 'अनलिमिटेड' },
    description: { fr: 'Appels illimités', en: 'Unlimited calls', es: 'Llamadas ilimitadas', de: 'Unbegrenzte Anrufe', pt: 'Chamadas ilimitadas', ru: 'Неограниченные звонки', ar: 'مكالمات غير محدودة', ch: '无限通话', hi: 'असीमित कॉल' },
    sortOrder: 4,
    features: DEFAULT_FEATURES,
    createdAt: NOW,
    updatedAt: NOW
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PlansPage: React.FC = () => {
  const intl = useIntl();
  const { language: locale } = useApp();
  const navigate = useLocaleNavigate();

  // ✅ FIX: Calculate translated routes based on current language
  const langCode = (locale || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const translatedRoutes = useMemo(() => {
    const subscriptionSuccessSlug = getTranslatedRouteSlug('dashboard-subscription-success' as RouteKey, langCode);
    return {
      subscriptionSuccess: `/${subscriptionSuccessSlug}`,
    };
  }, [langCode]);

  const { user } = useAuth();
  const { subscription, plans, loading } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD');
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<BillingPeriod>('monthly');
  const [showCheckout, setShowCheckout] = useState(false);

  // Determine provider type
  const providerType: ProviderType = user?.role === 'lawyer' ? 'lawyer' : 'expat_aidant';

  // Get default plans based on provider type
  const defaultPlans = providerType === 'lawyer' ? DEFAULT_LAWYER_PLANS : DEFAULT_EXPAT_PLANS;

  // Filter plans for this provider type - use defaults if none from Firestore
  const firestorePlans = plans.filter(p => p.providerType === providerType && p.tier !== 'trial');
  const availablePlans = firestorePlans.length > 0 ? firestorePlans : defaultPlans;

  // Handle plan selection
  const handleSelectPlan = (plan: SubscriptionPlan, billingPeriod: BillingPeriod) => {
    setSelectedPlan(plan);
    setSelectedBillingPeriod(billingPeriod);
    setShowCheckout(true);
  };

  // Handle successful subscription
  const handleSuccess = () => {
    navigate(translatedRoutes.subscriptionSuccess);
  };

  // Calculate price based on billing period
  const getDisplayPrice = () => {
    if (!selectedPlan) return 0;
    if (selectedBillingPeriod === 'yearly') {
      return selectedPlan.annualPricing?.[selectedCurrency] ??
        selectedPlan.pricing[selectedCurrency] * 12 * (1 - (selectedPlan.annualDiscountPercent || 20) / 100);
    }
    return selectedPlan.pricing[selectedCurrency];
  };

  // Stripe options
  const stripeOptions = {
    mode: 'subscription' as const,
    amount: Math.round(getDisplayPrice() * 100),
    currency: selectedCurrency.toLowerCase(),
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#4f46e5',
        borderRadius: '8px'
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout activeKey="subscription">
        <div className="bg-gray-50 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-500">
            {intl.formatMessage({ id: 'subscription.plans.loading' })}
          </p>
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
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {intl.formatMessage({ id: 'common.back' })}
          </button>

          <h1 className="text-3xl font-bold text-gray-900 text-center">
            {intl.formatMessage({ id: 'subscription.plans.title' })}
          </h1>
          <p className="text-gray-500 text-center mt-2">
            {intl.formatMessage({ id: 'subscription.plans.subtitle' })}
          </p>
        </div>

        {!showCheckout ? (
          // Plans Grid
          <PricingTable
            plans={availablePlans}
            currentTier={subscription?.tier}
            providerType={providerType}
            currency={selectedCurrency}
            onSelectPlan={handleSelectPlan}
            isLoading={loading}
          />
        ) : (
          // Checkout Form
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {intl.formatMessage({ id: 'subscription.checkout.title' })}
              </h2>

              {selectedPlan && (
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <CheckoutForm
                    selectedPlan={selectedPlan}
                    currency={selectedCurrency}
                    onSuccess={handleSuccess}
                    onCancel={() => setShowCheckout(false)}
                    locale={locale}
                    successUrl={`${window.location.origin}/${langCode}${translatedRoutes.subscriptionSuccess}`}
                  />
                </Elements>
              )}
            </div>

            {/* Trust Badges */}
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                {intl.formatMessage({ id: 'subscription.checkout.easyCancellation' })}
              </div>
              <div className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                {intl.formatMessage({ id: 'subscription.checkout.noCommitment' })}
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-green-500" />
                {intl.formatMessage({ id: 'subscription.checkout.securePayment' })}
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        {!showCheckout && (
          <div className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              {intl.formatMessage({ id: 'subscription.faq.title' })}
            </h2>

            <div className="space-y-4">
              {[
                {
                  q: intl.formatMessage({ id: 'subscription.faq.changePlan.q' }),
                  a: intl.formatMessage({ id: 'subscription.faq.changePlan.a' })
                },
                {
                  q: intl.formatMessage({ id: 'subscription.faq.trial.q' }),
                  a: intl.formatMessage({ id: 'subscription.faq.trial.a' })
                },
                {
                  q: intl.formatMessage({ id: 'subscription.faq.quota.q' }),
                  a: intl.formatMessage({ id: 'subscription.faq.quota.a' })
                },
                {
                  q: intl.formatMessage({ id: 'subscription.faq.cancel.q' }),
                  a: intl.formatMessage({ id: 'subscription.faq.cancel.a' })
                }
              ].map((faq, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                  <p className="text-gray-600 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PlansPage;
