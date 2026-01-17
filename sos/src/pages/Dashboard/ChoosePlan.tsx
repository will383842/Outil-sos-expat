/**
 * ChoosePlan Page
 * Page de choix de plan d'abonnement avec redirection Stripe Checkout
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useLocaleNavigate } from '../../multilingual-system';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { detectUserCurrency } from '../../services/pricingService';
import DashboardLayout from '../../components/layout/DashboardLayout';
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
import {
  Loader2,
  Check,
  X,
  Sparkles,
  Zap,
  Crown,
  Infinity,
  Shield,
  ChevronDown,
  ChevronUp,
  CreditCard,
  DollarSign,
  Euro
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface CreateSubscriptionCheckoutRequest {
  planId: string;
  billingPeriod: BillingPeriod;
  currency?: Currency;
}

interface CreateSubscriptionCheckoutResponse {
  sessionId: string;
  url: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  trial: <Sparkles className="w-6 h-6" />,
  basic: <Zap className="w-6 h-6" />,
  standard: <Zap className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  unlimited: <Infinity className="w-6 h-6" />
};

const TIER_COLORS: Record<SubscriptionTier, { border: string; bg: string; button: string }> = {
  trial: { border: 'border-gray-300', bg: 'bg-gray-50', button: 'bg-gray-600 hover:bg-gray-700' },
  basic: { border: 'border-blue-300', bg: 'bg-blue-50', button: 'bg-blue-600 hover:bg-blue-700' },
  standard: { border: 'border-indigo-300', bg: 'bg-indigo-50', button: 'bg-indigo-600 hover:bg-indigo-700' },
  pro: { border: 'border-purple-300', bg: 'bg-purple-50', button: 'bg-purple-600 hover:bg-purple-700' },
  unlimited: { border: 'border-amber-300', bg: 'bg-amber-50', button: 'bg-amber-600 hover:bg-amber-700' }
};

const TIER_ORDER: SubscriptionTier[] = ['trial', 'basic', 'standard', 'pro', 'unlimited'];

// ============================================================================
// DEFAULT PLANS (fallback)
// ============================================================================

const NOW = new Date();

const DEFAULT_FEATURES = [
  {
    key: 'ai_access',
    name: {
      fr: "Acces complet a l'outil IA",
      en: 'Full AI tool access',
      es: 'Acceso completo a la herramienta IA',
      de: 'Vollstandiger Zugang zum KI-Tool',
      pt: 'Acesso completo a ferramenta IA',
      ru: 'Polnyj dostup k instrumentu II',
      ar: 'Full AI tool access',
      ch: 'Full AI tool access',
      hi: 'Full AI tool access'
    },
    included: true
  },
];

const DEFAULT_LAWYER_PLANS: SubscriptionPlan[] = [
  {
    id: 'lawyer_basic',
    tier: 'basic',
    providerType: 'lawyer',
    pricing: { EUR: 14, USD: 19 },
    annualDiscountPercent: 20,
    aiCallsLimit: 5,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Basic', en: 'Basic', es: 'Basico', de: 'Basis', pt: 'Basico', ru: 'Basic', ar: 'Basic', ch: 'Basic', hi: 'Basic' },
    description: { fr: '5 appels IA par mois', en: '5 AI calls per month', es: '5 llamadas IA por mes', de: '5 KI-Anrufe pro Monat', pt: '5 chamadas IA por mes', ru: '5 AI calls', ar: '5 AI calls', ch: '5 AI calls', hi: '5 AI calls' },
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
    annualDiscountPercent: 20,
    aiCallsLimit: 15,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Standard', en: 'Standard', es: 'Estandar', de: 'Standard', pt: 'Padrao', ru: 'Standard', ar: 'Standard', ch: 'Standard', hi: 'Standard' },
    description: { fr: '15 appels IA par mois', en: '15 AI calls per month', es: '15 llamadas IA por mes', de: '15 KI-Anrufe pro Monat', pt: '15 chamadas IA por mes', ru: '15 AI calls', ar: '15 AI calls', ch: '15 AI calls', hi: '15 AI calls' },
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
    annualDiscountPercent: 20,
    aiCallsLimit: 30,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Pro', en: 'Pro', es: 'Pro', de: 'Pro', pt: 'Pro', ru: 'Pro', ar: 'Pro', ch: 'Pro', hi: 'Pro' },
    description: { fr: '30 appels IA par mois', en: '30 AI calls per month', es: '30 llamadas IA por mes', de: '30 KI-Anrufe pro Monat', pt: '30 chamadas IA por mes', ru: '30 AI calls', ar: '30 AI calls', ch: '30 AI calls', hi: '30 AI calls' },
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
    annualDiscountPercent: 20,
    aiCallsLimit: -1,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Illimite', en: 'Unlimited', es: 'Ilimitado', de: 'Unbegrenzt', pt: 'Ilimitado', ru: 'Unlimited', ar: 'Unlimited', ch: 'Unlimited', hi: 'Unlimited' },
    description: { fr: 'Appels illimites', en: 'Unlimited calls', es: 'Llamadas ilimitadas', de: 'Unbegrenzte Anrufe', pt: 'Chamadas ilimitadas', ru: 'Unlimited', ar: 'Unlimited', ch: 'Unlimited', hi: 'Unlimited' },
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
    annualDiscountPercent: 20,
    aiCallsLimit: 5,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Basic', en: 'Basic', es: 'Basico', de: 'Basis', pt: 'Basico', ru: 'Basic', ar: 'Basic', ch: 'Basic', hi: 'Basic' },
    description: { fr: '5 appels IA par mois', en: '5 AI calls per month', es: '5 llamadas IA por mes', de: '5 KI-Anrufe pro Monat', pt: '5 chamadas IA por mes', ru: '5 AI calls', ar: '5 AI calls', ch: '5 AI calls', hi: '5 AI calls' },
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
    annualDiscountPercent: 20,
    aiCallsLimit: 15,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Standard', en: 'Standard', es: 'Estandar', de: 'Standard', pt: 'Padrao', ru: 'Standard', ar: 'Standard', ch: 'Standard', hi: 'Standard' },
    description: { fr: '15 appels IA par mois', en: '15 AI calls per month', es: '15 llamadas IA por mes', de: '15 KI-Anrufe pro Monat', pt: '15 chamadas IA por mes', ru: '15 AI calls', ar: '15 AI calls', ch: '15 AI calls', hi: '15 AI calls' },
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
    annualDiscountPercent: 20,
    aiCallsLimit: 30,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Pro', en: 'Pro', es: 'Pro', de: 'Pro', pt: 'Pro', ru: 'Pro', ar: 'Pro', ch: 'Pro', hi: 'Pro' },
    description: { fr: '30 appels IA par mois', en: '30 AI calls per month', es: '30 llamadas IA por mes', de: '30 KI-Anrufe pro Monat', pt: '30 chamadas IA por mes', ru: '30 AI calls', ar: '30 AI calls', ch: '30 AI calls', hi: '30 AI calls' },
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
    annualDiscountPercent: 20,
    aiCallsLimit: -1,
    stripePriceId: { EUR: '', USD: '' },
    isActive: true,
    name: { fr: 'Illimite', en: 'Unlimited', es: 'Ilimitado', de: 'Unbegrenzt', pt: 'Ilimitado', ru: 'Unlimited', ar: 'Unlimited', ch: 'Unlimited', hi: 'Unlimited' },
    description: { fr: 'Appels illimites', en: 'Unlimited calls', es: 'Llamadas ilimitadas', de: 'Unbegrenzte Anrufe', pt: 'Chamadas ilimitadas', ru: 'Unlimited', ar: 'Unlimited', ch: 'Unlimited', hi: 'Unlimited' },
    sortOrder: 4,
    features: DEFAULT_FEATURES,
    createdAt: NOW,
    updatedAt: NOW
  }
];

// ============================================================================
// FAQ ITEM COMPONENT
// ============================================================================

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-6 pb-4 text-gray-600 text-sm">
          {answer}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PLAN CARD COMPONENT
// ============================================================================

interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isTrialEligible: boolean;
  billingPeriod: BillingPeriod;
  currency: Currency;
  locale: SupportedLanguage;
  isLoading: boolean;
  loadingPlanId: string | null;
  onSelect: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan,
  isUpgrade,
  isDowngrade,
  isTrialEligible,
  billingPeriod,
  currency,
  locale,
  isLoading,
  loadingPlanId,
  onSelect
}) => {
  const intl = useIntl();
  const colors = TIER_COLORS[plan.tier];
  const discount = plan.annualDiscountPercent ?? DEFAULT_ANNUAL_DISCOUNT_PERCENT;

  const monthlyPrice = plan.pricing[currency];
  const annualPrice = plan.annualPricing?.[currency] ?? calculateAnnualPrice(monthlyPrice, discount);
  const monthlyEquivalent = calculateMonthlyEquivalent(annualPrice);
  const savings = calculateAnnualSavings(monthlyPrice, discount);

  const displayPrice = billingPeriod === 'monthly' ? monthlyPrice : monthlyEquivalent;
  const costPerCall = plan.aiCallsLimit > 0 ? displayPrice / plan.aiCallsLimit : 0;

  const formatPrice = (price: number) => {
    const formatted = price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency === 'EUR' ? `${formatted} €` : `$${formatted}`;
  };

  const getButtonLabel = () => {
    if (isCurrentPlan) return intl.formatMessage({ id: 'subscription.plans.currentPlan' });
    if (isTrialEligible && !isDowngrade) return intl.formatMessage({ id: 'subscription.trial.startTrial' });
    if (isUpgrade) return intl.formatMessage({ id: 'subscription.plans.upgrade' });
    if (isDowngrade) return intl.formatMessage({ id: 'subscription.plans.downgrade' });
    return intl.formatMessage({ id: 'subscription.checkout.subscribe' });
  };

  const isThisLoading = loadingPlanId === plan.id;

  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 p-6 transition-all duration-300 flex flex-col',
        colors.border,
        colors.bg,
        isCurrentPlan && 'ring-2 ring-offset-2 ring-indigo-500',
        plan.tier === 'pro' && 'scale-105 shadow-xl z-10'
      )}
    >
      {/* Popular Badge */}
      {plan.tier === 'pro' && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
            {intl.formatMessage({ id: 'subscription.plans.popular' })}
          </span>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            {intl.formatMessage({ id: 'subscription.plans.currentPlan' })}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-sm mb-3">
          {TIER_ICONS[plan.tier]}
        </div>
        <h3 className="text-xl font-bold text-gray-900">
          {plan.name[locale] || plan.name.fr || plan.name.en}
        </h3>
      </div>

      {/* Price Display */}
      <div className="text-center mb-6">
        {billingPeriod === 'yearly' && (
          <div className="text-lg text-gray-400 line-through mb-1">
            {formatPrice(monthlyPrice)}/mois
          </div>
        )}

        <div className="flex items-baseline justify-center gap-1">
          <span className={cn(
            "font-extrabold text-gray-900 transition-all duration-300",
            billingPeriod === 'yearly' ? 'text-3xl text-green-600' : 'text-4xl'
          )}>
            {formatPrice(displayPrice)}
          </span>
          <span className="text-gray-500">/mois</span>
        </div>

        {billingPeriod === 'yearly' && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500">
              Facture {formatPrice(annualPrice)}/an
            </p>
            <p className="text-xs font-semibold text-green-600">
              Economisez {formatPrice(savings)}/an
            </p>
          </div>
        )}
      </div>

      {/* AI Calls Display */}
      <div className="bg-white rounded-lg p-4 mb-6 text-center">
        <div className="text-2xl font-bold text-indigo-600">
          {plan.aiCallsLimit === -1
            ? intl.formatMessage({ id: 'subscription.plans.unlimitedCalls' })
            : intl.formatMessage({ id: 'subscription.calls' }, { count: plan.aiCallsLimit })}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {intl.formatMessage({ id: 'subscription.plans.perMonth' })}
        </div>
        {plan.aiCallsLimit > 0 && (
          <div className="text-xs text-gray-400 mt-2">
            ~ {formatPrice(costPerCall)} / appel
          </div>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6 flex-grow">
        <li className="flex items-center text-sm text-gray-700">
          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
          {intl.formatMessage({ id: 'subscription.features.ai_chat' })}
        </li>
        <li className="flex items-center text-sm text-gray-700">
          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
          {intl.formatMessage({ id: 'subscription.features.ai_suggestions' })}
        </li>
        <li className="flex items-center text-sm text-gray-700">
          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
          {intl.formatMessage({ id: 'subscription.features.ai_templates' })}
        </li>
      </ul>

      {/* Downgrade Note */}
      {isDowngrade && !isCurrentPlan && (
        <p className="text-xs text-amber-600 text-center mb-3">
          {intl.formatMessage({ id: 'subscription.downgrade.effectiveAtPeriodEnd', defaultMessage: 'Effectif à la fin de la période actuelle' })}
        </p>
      )}

      {/* CTA Button */}
      <button
        onClick={onSelect}
        disabled={isCurrentPlan || isLoading}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2',
          isCurrentPlan
            ? 'bg-gray-400 cursor-not-allowed'
            : colors.button,
          isLoading && 'opacity-50 cursor-wait'
        )}
      >
        {isThisLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {intl.formatMessage({ id: 'common.loading' })}
          </>
        ) : (
          getButtonLabel()
        )}
      </button>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ChoosePlan: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const { user } = useAuth();
  const { subscription, plans, loading: subscriptionLoading, isTrialing } = useSubscription();

  const locale = language as SupportedLanguage;

  // State
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize currency from localStorage or detection
  useEffect(() => {
    const savedCurrency = localStorage.getItem('preferredSubscriptionCurrency') as Currency | null;
    if (savedCurrency === 'EUR' || savedCurrency === 'USD') {
      setCurrency(savedCurrency);
    } else {
      // Detect from service pricing detection (uses navigator.language)
      const detected = detectUserCurrency();
      setCurrency(detected === 'eur' ? 'EUR' : 'USD');
    }
  }, []);

  // Save currency preference
  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    localStorage.setItem('preferredSubscriptionCurrency', newCurrency);
  };

  // Determine provider type
  const userRole = user?.role || user?.type || '';
  const providerType: ProviderType = userRole === 'lawyer' ? 'lawyer' : 'expat_aidant';

  // SECURITY: Block clients from accessing this page
  // Note: Only check for 'client' as valid UserRole; 'user' is not a valid role in the type system
  const isClient = userRole === 'client';

  // If user is a client, show error and redirect
  useEffect(() => {
    if (!subscriptionLoading && isClient) {
      navigate('/dashboard', { replace: true });
    }
  }, [isClient, subscriptionLoading, navigate]);

  // Get available plans
  const defaultPlans = providerType === 'lawyer' ? DEFAULT_LAWYER_PLANS : DEFAULT_EXPAT_PLANS;
  const firestorePlans = plans.filter(p => p.providerType === providerType && p.tier !== 'trial');
  const availablePlans = useMemo(() => {
    const planList = firestorePlans.length > 0 ? firestorePlans : defaultPlans;
    return planList.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [firestorePlans, defaultPlans]);

  // Determine trial eligibility
  const isTrialEligible = !subscription || subscription.status === 'expired';

  // Get current plan tier index
  const currentTierIndex = subscription?.tier ? TIER_ORDER.indexOf(subscription.tier) : -1;

  // Handle plan selection - redirect to Stripe Checkout
  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    setIsLoading(true);
    setLoadingPlanId(plan.id);
    setError(null);

    try {
      const createSubscriptionCheckout = httpsCallable<
        CreateSubscriptionCheckoutRequest,
        CreateSubscriptionCheckoutResponse
      >(functions, 'createSubscriptionCheckout');

      const result = await createSubscriptionCheckout({
        planId: plan.id,
        billingPeriod,
        currency
      });

      if (result.data.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.data.url;
      } else {
        throw new Error('Failed to create checkout session - no URL returned');
      }
    } catch (e) {
      const err = e as Error & { code?: string; details?: { code?: string; message?: string } };
      console.error('Error creating checkout session:', err);

      // Parse Firebase Functions error with proper user-friendly messages
      let errorMessage = intl.formatMessage({ id: 'subscription.errors.generic', defaultMessage: 'Une erreur est survenue. Veuillez réessayer.' });

      // Firebase Functions errors have a code property
      const errorCode = err?.code || err?.details?.code || '';
      const firebaseMessage = err?.message || err?.details?.message || '';

      // Map error codes to user-friendly messages
      if (errorCode === 'functions/resource-exhausted' || firebaseMessage.includes('Trop de tentatives')) {
        errorMessage = intl.formatMessage({
          id: 'subscription.errors.rateLimited',
          defaultMessage: 'Trop de tentatives de paiement. Veuillez réessayer dans une heure.'
        });
      } else if (errorCode === 'functions/failed-precondition') {
        if (firebaseMessage.includes('abonnement actif')) {
          errorMessage = intl.formatMessage({
            id: 'subscription.errors.alreadySubscribed',
            defaultMessage: 'Vous avez déjà un abonnement actif. Veuillez le gérer depuis votre espace abonnement.'
          });
        } else if (firebaseMessage.includes('plan is no longer available') || firebaseMessage.includes('plus disponible')) {
          errorMessage = intl.formatMessage({
            id: 'subscription.errors.planUnavailable',
            defaultMessage: 'Ce plan n\'est plus disponible. Veuillez sélectionner un autre plan.'
          });
        } else {
          errorMessage = firebaseMessage || errorMessage;
        }
      } else if (errorCode === 'functions/permission-denied') {
        errorMessage = intl.formatMessage({
          id: 'subscription.errors.permissionDenied',
          defaultMessage: 'Vous n\'avez pas les droits pour effectuer cette action.'
        });
      } else if (errorCode === 'functions/unauthenticated') {
        errorMessage = intl.formatMessage({
          id: 'subscription.errors.unauthenticated',
          defaultMessage: 'Veuillez vous connecter pour continuer.'
        });
      } else if (errorCode === 'functions/not-found') {
        errorMessage = intl.formatMessage({
          id: 'subscription.errors.notFound',
          defaultMessage: 'Plan ou profil introuvable. Veuillez rafraîchir la page.'
        });
      } else if (errorCode === 'functions/internal' || errorCode === 'functions/unavailable') {
        errorMessage = intl.formatMessage({
          id: 'subscription.errors.serverError',
          defaultMessage: 'Une erreur serveur est survenue. Veuillez réessayer plus tard.'
        });
      } else if (firebaseMessage && !firebaseMessage.includes('INTERNAL')) {
        // Use the server message if it's not an internal error
        errorMessage = firebaseMessage;
      }

      setError(errorMessage);
      setIsLoading(false);
      setLoadingPlanId(null);
    }
  };

  // Loading state
  if (subscriptionLoading) {
    return (
      <DashboardLayout activeKey="subscription">
        <div className="flex items-center justify-center min-h-[60vh]">
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

  // Block clients from seeing subscription plans
  if (isClient) {
    return (
      <DashboardLayout activeKey="subscription">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {intl.formatMessage({ id: 'subscription.errors.clientNotAllowed', defaultMessage: 'Accès non autorisé' })}
            </h2>
            <p className="text-gray-500">
              {intl.formatMessage({ id: 'subscription.errors.clientNotAllowedMessage', defaultMessage: 'Les abonnements sont réservés aux prestataires (avocats et expatriés aidants).' })}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeKey="subscription">
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              {intl.formatMessage({ id: 'subscription.choosePlan.title', defaultMessage: 'Choisissez votre formule' })}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {intl.formatMessage({ id: 'subscription.choosePlan.subtitle', defaultMessage: 'Accédez à l\'assistant IA pour accompagner vos clients' })}
            </p>

            {/* Current Plan Badge */}
            {subscription && subscription.tier !== 'trial' && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                <Check className="w-4 h-4" />
                {intl.formatMessage({ id: 'subscription.currentPlan', defaultMessage: 'Plan actuel' })} : {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
              </div>
            )}
          </div>

          {/* Billing Period Toggle */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative inline-flex items-center rounded-full bg-gray-100 p-1">
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
                  billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {intl.formatMessage({ id: 'subscription.billing.monthly' })}
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={cn(
                  'relative z-10 px-6 py-2.5 text-sm font-semibold rounded-full transition-colors duration-200 flex items-center gap-2',
                  billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {intl.formatMessage({ id: 'subscription.billing.yearly' })}
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  -20%
                </span>
              </button>
            </div>

            {billingPeriod === 'yearly' && (
              <p className="text-sm text-green-600 font-medium animate-fade-in">
                {intl.formatMessage({ id: 'subscription.billing.save' }, { percent: 20 })}
              </p>
            )}
          </div>

          {/* Currency Selector */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center rounded-lg border border-gray-200 p-1 bg-white shadow-sm">
              <button
                onClick={() => handleCurrencyChange('EUR')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  currency === 'EUR'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Euro className="w-4 h-4" />
                EUR
              </button>
              <button
                onClick={() => handleCurrencyChange('USD')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  currency === 'USD'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <DollarSign className="w-4 h-4" />
                USD
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm text-center">
                {error}
              </div>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 mb-16">
            {availablePlans.map((plan) => {
              const planTierIndex = TIER_ORDER.indexOf(plan.tier);
              const isCurrentPlan = subscription?.tier === plan.tier && subscription?.billingPeriod === billingPeriod;
              const isUpgrade = currentTierIndex >= 0 && planTierIndex > currentTierIndex;
              const isDowngrade = currentTierIndex >= 0 && planTierIndex < currentTierIndex;

              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={isCurrentPlan}
                  isUpgrade={isUpgrade}
                  isDowngrade={isDowngrade}
                  isTrialEligible={isTrialEligible}
                  billingPeriod={billingPeriod}
                  currency={currency}
                  locale={locale}
                  isLoading={isLoading}
                  loadingPlanId={loadingPlanId}
                  onSelect={() => handleSelectPlan(plan)}
                />
              );
            })}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              {intl.formatMessage({ id: 'subscription.faq.title' })}
            </h2>

            <div className="space-y-3">
              <FAQItem
                question={intl.formatMessage({ id: 'subscription.faq.trial.q' })}
                answer={intl.formatMessage({ id: 'subscription.faq.trial.a' })}
              />
              <FAQItem
                question={intl.formatMessage({ id: 'subscription.faq.changePlan.q' })}
                answer={intl.formatMessage({ id: 'subscription.faq.changePlan.a' })}
              />
              <FAQItem
                question={intl.formatMessage({ id: 'subscription.faq.cancel.q' })}
                answer={intl.formatMessage({ id: 'subscription.faq.cancel.a' })}
              />
              <FAQItem
                question={intl.formatMessage({ id: 'subscription.faq.quota.q' })}
                answer={intl.formatMessage({ id: 'subscription.faq.quota.a' })}
              />
            </div>
          </div>

          {/* Security Footer */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                {/* Stripe Logo */}
                <div className="flex items-center gap-2">
                  <CreditCard className="w-8 h-8 text-indigo-600" />
                  <div className="text-left">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">{intl.formatMessage({ id: 'subscription.payment.poweredBy', defaultMessage: 'Powered by' })}</div>
                    <div className="font-bold text-gray-900">Stripe</div>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-10 bg-gray-200" />

                {/* Security Badge */}
                <div className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {intl.formatMessage({ id: 'subscription.payment.secure', defaultMessage: 'Paiement sécurisé' })}
                  </span>
                </div>

                <div className="hidden sm:block w-px h-10 bg-gray-200" />

                {/* No Commitment */}
                <div className="flex items-center gap-2">
                  <Check className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {intl.formatMessage({ id: 'subscription.payment.noCommitment', defaultMessage: 'Sans engagement, annulable à tout moment' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChoosePlan;
