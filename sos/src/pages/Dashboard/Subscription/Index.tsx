/**
 * Subscription Dashboard Page V2
 * Page de gestion de l'abonnement du prestataire - Design moderne 2026
 *
 * Features:
 * - Modern UI matching AiAssistant page design
 * - No invoice sections (removed as requested)
 * - Stable layout to prevent jumping
 * - All quota, usage, trial data properly connected
 */

import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useLocaleNavigate } from '../../../multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '../../../multilingual-system/core/routing/localeRoutes';
import { useApp } from '../../../contexts/AppContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useSubscription } from '../../../hooks/useSubscription';
import { useAiQuota } from '../../../hooks/useAiQuota';
import {
  CreditCard,
  Zap,
  Clock,
  TrendingUp,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Crown,
  Infinity,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Phone,
  ArrowUpRight,
  Check,
  XCircle
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { SubscriptionTier, SupportedLanguage } from '../../../types/subscription';
import { cn } from '../../../utils/cn';
import { getDateLocale } from '../../../utils/formatters';

// ============================================================================
// CONSTANTS
// ============================================================================

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  trial: <Sparkles className="w-5 h-5" />,
  basic: <Zap className="w-5 h-5" />,
  standard: <Zap className="w-5 h-5" />,
  pro: <Crown className="w-5 h-5" />,
  unlimited: <Infinity className="w-5 h-5" />
};

const TIER_GRADIENTS: Record<SubscriptionTier, string> = {
  trial: 'from-slate-500 to-slate-600',
  basic: 'from-blue-500 to-blue-600',
  standard: 'from-indigo-500 to-indigo-600',
  pro: 'from-purple-500 to-purple-600',
  unlimited: 'from-amber-500 to-orange-500'
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  trialing: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  active: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  past_due: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  canceled: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  subValue?: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, iconBg, label, value, subValue, loading }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className={cn('p-2.5 rounded-xl', iconBg)}>
        {icon}
      </div>
      {loading && (
        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      )}
    </div>
    <div className="mt-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {subValue && (
          <span className="text-sm text-gray-500">{subValue}</span>
        )}
      </div>
    </div>
  </div>
);

interface QuotaProgressProps {
  currentUsage: number;
  limit: number;
  isUnlimited: boolean;
  isInTrial: boolean;
  trialCallsRemaining: number;
}

const QuotaProgress: React.FC<QuotaProgressProps> = ({
  currentUsage,
  limit,
  isUnlimited,
  isInTrial,
  trialCallsRemaining
}) => {
  const intl = useIntl();

  const percentage = isUnlimited ? 0 : limit > 0 ? Math.min(100, Math.round((currentUsage / limit) * 100)) : 0;
  const remaining = isUnlimited ? -1 : Math.max(0, limit - currentUsage);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const getBarColor = () => {
    if (isUnlimited) return 'bg-gradient-to-r from-amber-400 to-yellow-500';
    if (isAtLimit) return 'bg-gradient-to-r from-red-500 to-red-600';
    if (isNearLimit) return 'bg-gradient-to-r from-orange-400 to-amber-500';
    return 'bg-gradient-to-r from-green-400 to-emerald-500';
  };

  const getBgColor = () => {
    if (isUnlimited) return 'bg-amber-100';
    if (isAtLimit) return 'bg-red-100';
    if (isNearLimit) return 'bg-orange-100';
    return 'bg-green-100';
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      {!isUnlimited && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {intl.formatMessage({ id: 'subscription.quota.usage' })}
            </span>
            <span className="font-medium text-gray-900">{percentage}%</span>
          </div>
          <div className={cn('h-3 rounded-full overflow-hidden', getBgColor())}>
            <div
              className={cn('h-full rounded-full transition-all duration-700 ease-out', getBarColor())}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xl font-bold text-gray-900">{currentUsage}</p>
          <p className="text-xs text-gray-500">
            {intl.formatMessage({ id: 'subscription.quota.usedLabel', defaultMessage: 'Used' })}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg border-x border-gray-100">
          <p className="text-xl font-bold text-gray-900">
            {isUnlimited ? '∞' : limit}
          </p>
          <p className="text-xs text-gray-500">
            {intl.formatMessage({ id: 'subscription.quota.total' })}
          </p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className={cn(
            'text-xl font-bold',
            isUnlimited ? 'text-amber-600' : isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-green-600'
          )}>
            {isUnlimited ? '∞' : remaining}
          </p>
          <p className="text-xs text-gray-500">
            {intl.formatMessage({ id: 'subscription.quota.remaining' })}
          </p>
        </div>
      </div>

      {/* Trial Info */}
      {isInTrial && trialCallsRemaining > 0 && (
        <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-sm text-indigo-700">
            {intl.formatMessage(
              { id: 'subscription.trial.callsRemaining' },
              { calls: trialCallsRemaining }
            )}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SubscriptionPage: React.FC = () => {
  const intl = useIntl();
  const { language } = useApp();
  const locale = language as SupportedLanguage;
  const navigate = useLocaleNavigate();
  const { user } = useAuth();

  // DEBUG LOGS - Page Jump Investigation
  console.log('[SubscriptionPage DEBUG] 📦 Render', {
    userId: user?.uid,
    timestamp: new Date().toISOString()
  });

  // Route translations
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';
  const translatedRoutes = useMemo(() => ({
    aiAssistant: `/${getTranslatedRouteSlug('dashboard-ai-assistant' as RouteKey, langCode)}`,
    subscriptionPlans: `/${getTranslatedRouteSlug('dashboard-subscription-plans' as RouteKey, langCode)}`,
  }), [langCode]);

  // Hooks
  const {
    subscription,
    plans,
    loading: subLoading,
    isPastDue,
    openBillingPortal,
    reactivateSubscription,
    initializeTrial
  } = useSubscription();

  const {
    currentUsage,
    limit,
    isInTrial,
    trialDaysRemaining,
    trialCallsRemaining,
    isUnlimited,
    isNearQuotaLimit,
    usage,
    loading: quotaLoading
  } = useAiQuota();

  // DEBUG LOGS - State tracking
  console.log('[SubscriptionPage DEBUG] 📊 State', {
    subLoading,
    quotaLoading,
    hasSubscription: !!subscription,
    subscriptionStatus: subscription?.status,
    subscriptionTier: subscription?.tier,
    currentUsage,
    limit,
    isInTrial,
    timestamp: new Date().toISOString()
  });

  // Local state
  const [actionLoading, setActionLoading] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(false);

  // Current plan
  const currentPlan = useMemo(() => {
    return plans.find(p => p.id === subscription?.planId);
  }, [plans, subscription?.planId]);

  // Lowest price for CTA (dynamic from plans)
  const lowestPrice = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    const activePlans = plans.filter(p => p.isActive && p.tier !== 'trial');
    if (activePlans.length === 0) return null;
    const prices = activePlans.map(p => p.pricing?.EUR || 0).filter(p => p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [plans]);

  // Helpers
  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat(getDateLocale(locale), {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const formatPrice = (amount: number, currency: string) => {
    const symbol = currency === 'EUR' ? '€' : '$';
    const formatted = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${formatted} ${symbol}`;
  };

  const getPlanName = (): string => {
    if (currentPlan) {
      return currentPlan.name[locale] || currentPlan.name.fr;
    }
    if (subscription?.tier) {
      return intl.formatMessage({ id: `subscription.plans.${subscription.tier}` });
    }
    return '-';
  };

  const getDaysRemaining = (): number => {
    if (isInTrial) return trialDaysRemaining;
    if (!subscription?.currentPeriodEnd) return 0;
    return Math.max(0, Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  // Handlers
  const handleStartTrial = async () => {
    if (!user?.role) return;
    setIsInitializing(true);
    try {
      await initializeTrial();
    } catch (error) {
      console.error('Error starting trial:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleReactivate = async () => {
    setActionLoading(true);
    try {
      await reactivateSubscription();
    } catch (error) {
      console.error('Error reactivating:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBillingPortal = async () => {
    setActionLoading(true);
    try {
      await openBillingPortal();
    } catch (error) {
      console.error('Error opening billing portal:', error);
      setActionLoading(false);
    }
  };

  // Combined loading state
  const isLoading = subLoading || quotaLoading;

  // Status config
  const statusConfig = STATUS_CONFIG[subscription?.status || 'expired'] || STATUS_CONFIG.expired;

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    console.log('[SubscriptionPage DEBUG] 🔄 Rendering LOADING state', { subLoading, quotaLoading, timestamp: new Date().toISOString() });
    return (
      <DashboardLayout activeKey="subscription">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
          <div className="max-w-6xl mx-auto px-4 py-8">
            {/* Skeleton Header */}
            <div className="mb-8">
              <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-96 bg-gray-100 rounded mt-2 animate-pulse" />
            </div>

            {/* Skeleton Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-32 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl mb-4" />
                  <div className="h-3 w-20 bg-gray-100 rounded mb-2" />
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                </div>
              ))}
            </div>

            {/* Skeleton Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
                <div className="bg-white rounded-xl border border-gray-200 h-48 animate-pulse" />
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 h-48 animate-pulse" />
                <div className="bg-white rounded-xl border border-gray-200 h-32 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================================
  // NO SUBSCRIPTION STATE
  // ============================================================================

  if (!subscription) {
    console.log('[SubscriptionPage DEBUG] ⚠️ Rendering NO SUBSCRIPTION state', { timestamp: new Date().toISOString() });
    return (
      <DashboardLayout activeKey="subscription">
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
          <div className="max-w-3xl mx-auto px-4 py-12">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Gradient Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {intl.formatMessage({ id: 'subscription.trial.title' })}
                </h1>
                <p className="text-indigo-100 max-w-md mx-auto">
                  {intl.formatMessage({ id: 'subscription.trial.description' })}
                </p>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: <Phone className="w-5 h-5" />, label: intl.formatMessage({ id: 'subscription.trial.feature1', defaultMessage: '3 AI calls included' }) },
                    { icon: <Clock className="w-5 h-5" />, label: intl.formatMessage({ id: 'subscription.trial.feature2', defaultMessage: '30-day trial' }) },
                    { icon: <CreditCard className="w-5 h-5" />, label: intl.formatMessage({ id: 'subscription.trial.noCreditCard' }) }
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        {feature.icon}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={handleStartTrial}
                  disabled={isInitializing}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isInitializing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {intl.formatMessage({ id: 'subscription.checkout.processing' })}
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      {intl.formatMessage({ id: 'subscription.trial.startTrial' })}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  console.log('[SubscriptionPage DEBUG] ✅ Rendering MAIN state', {
    tier: subscription?.tier,
    status: subscription?.status,
    currentUsage,
    limit,
    timestamp: new Date().toISOString()
  });

  return (
    <DashboardLayout activeKey="subscription">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* ================================================================ */}
          {/* HEADER */}
          {/* ================================================================ */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {intl.formatMessage({ id: 'subscription.mySubscription' })}
                </h1>
                <p className="text-gray-500 mt-1">
                  {intl.formatMessage({ id: 'subscription.manageDescription' })}
                </p>
              </div>

              {/* Plan Badge */}
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r text-white font-medium shadow-lg',
                  TIER_GRADIENTS[subscription.tier] || TIER_GRADIENTS.basic
                )}>
                  {TIER_ICONS[subscription.tier]}
                  <span>{getPlanName()}</span>
                </div>
                <div className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
                  statusConfig.bg,
                  statusConfig.text
                )}>
                  <span className={cn('w-2 h-2 rounded-full', statusConfig.dot)} />
                  {intl.formatMessage({ id: `subscription.status.${subscription.status}` })}
                </div>
              </div>
            </div>

            {/* Alerts */}
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

            {isPastDue && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
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

          {/* ================================================================ */}
          {/* PROMINENT UPGRADE CTA - For trial/basic users */}
          {/* ================================================================ */}
          {(subscription.status === 'trialing' || subscription.tier === 'basic' || subscription.tier === 'trial') && (
            <div className="mb-8 relative overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 md:p-8 shadow-xl">
                {/* Animated background effect */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                        <Crown className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">
                          {subscription.status === 'trialing'
                            ? intl.formatMessage({ id: 'subscription.cta.trialTitle', defaultMessage: 'Passez au Premium !' })
                            : intl.formatMessage({ id: 'subscription.cta.upgradeTitle', defaultMessage: 'Boostez votre activité !' })}
                        </h2>
                        <p className="text-indigo-100 text-sm md:text-base">
                          {subscription.status === 'trialing'
                            ? intl.formatMessage({ id: 'subscription.cta.trialDescription', defaultMessage: 'Débloquez toutes les fonctionnalités avant la fin de votre essai' })
                            : intl.formatMessage({ id: 'subscription.cta.upgradeDescription', defaultMessage: 'Plus d\'appels IA, plus de clients, plus de revenus' })}
                        </p>
                      </div>
                    </div>

                    {/* Features pills */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium">
                        <Check className="w-4 h-4" />
                        {intl.formatMessage({ id: 'subscription.cta.feature1', defaultMessage: 'Jusqu\'à 30 appels/mois' })}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium">
                        <Check className="w-4 h-4" />
                        {intl.formatMessage({ id: 'subscription.cta.feature2', defaultMessage: 'Support prioritaire' })}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur rounded-full text-white text-sm font-medium">
                        <Check className="w-4 h-4" />
                        {intl.formatMessage({ id: 'subscription.cta.feature3', defaultMessage: 'Sans engagement' })}
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="flex flex-col items-stretch md:items-end gap-3">
                    <button
                      onClick={() => navigate(translatedRoutes.subscriptionPlans)}
                      className="group flex items-center justify-center gap-3 px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                      <Sparkles className="w-5 h-5" />
                      {intl.formatMessage({ id: 'subscription.cta.button', defaultMessage: 'Voir les offres' })}
                      <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                    {lowestPrice && (
                      <p className="text-indigo-200 text-xs text-center md:text-right">
                        {intl.formatMessage(
                          { id: 'subscription.cta.subtext', defaultMessage: 'À partir de {price}€/mois' },
                          { price: lowestPrice.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STATS CARDS */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<Zap className="w-5 h-5 text-indigo-600" />}
              iconBg="bg-indigo-100"
              label={intl.formatMessage({ id: 'subscription.stats.callsThisMonth' })}
              value={currentUsage}
              subValue={isUnlimited ? intl.formatMessage({ id: 'subscription.quota.unlimited' }) : `/ ${limit}`}
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-amber-600" />}
              iconBg="bg-amber-100"
              label={isInTrial
                ? intl.formatMessage({ id: 'subscription.stats.trialDaysLeft' })
                : intl.formatMessage({ id: 'subscription.stats.daysRemaining' })}
              value={getDaysRemaining()}
              subValue={intl.formatMessage({ id: 'common.days', defaultMessage: 'days' })}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-green-600" />}
              iconBg="bg-green-100"
              label={intl.formatMessage({ id: 'subscription.stats.totalCalls' })}
              value={usage?.totalCallsAllTime || 0}
            />
            <StatCard
              icon={<Calendar className="w-5 h-5 text-purple-600" />}
              iconBg="bg-purple-100"
              label={isInTrial
                ? intl.formatMessage({ id: 'subscription.trial.expiresLabel', defaultMessage: 'Trial ends' })
                : intl.formatMessage({ id: 'subscription.billing.nextBillingLabel', defaultMessage: 'Next billing' })}
              value={formatDate(isInTrial ? subscription.trialEndsAt : subscription.currentPeriodEnd)}
            />
          </div>

          {/* ================================================================ */}
          {/* MAIN CONTENT */}
          {/* ================================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quota Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Zap className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'subscription.quota.usage' })}
                    </h2>
                  </div>
                  {isUnlimited && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                      <Infinity className="w-4 h-4" />
                      {intl.formatMessage({ id: 'subscription.quota.unlimited' })}
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <QuotaProgress
                    currentUsage={currentUsage}
                    limit={limit}
                    isUnlimited={isUnlimited}
                    isInTrial={isInTrial}
                    trialCallsRemaining={trialCallsRemaining}
                  />

                  {/* Upgrade Prompt */}
                  {isNearQuotaLimit && !isUnlimited && (
                    <button
                      onClick={() => navigate(translatedRoutes.subscriptionPlans)}
                      className="mt-4 w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      {intl.formatMessage({ id: 'subscription.quota.upgradePrompt' })}
                    </button>
                  )}
                </div>
              </div>

              {/* Subscription Details Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {intl.formatMessage({ id: 'subscription.billing.title' })}
                    </h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Plan */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">
                        {intl.formatMessage({ id: 'subscription.currentPlan', defaultMessage: 'Current plan' })}
                      </p>
                      <div className="flex items-center gap-2">
                        {TIER_ICONS[subscription.tier]}
                        <span className="text-lg font-semibold text-gray-900">{getPlanName()}</span>
                      </div>
                    </div>

                    {/* Price (not for trial) */}
                    {subscription.status !== 'trialing' && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-500 mb-1">
                          {intl.formatMessage({ id: 'subscription.billing.amount' })}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatPrice(subscription.currentPeriodAmount, subscription.currency)}
                          <span className="text-sm font-normal text-gray-500">
                            {intl.formatMessage({ id: 'subscription.billing.perMonth' })}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* AI Calls Limit */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">
                        {intl.formatMessage({ id: 'subscription.quota.limitLabel', defaultMessage: 'Calls limit' })}
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {isUnlimited ? (
                          <span className="flex items-center gap-2">
                            <Infinity className="w-5 h-5 text-amber-500" />
                            {intl.formatMessage({ id: 'subscription.quota.unlimited' })}
                          </span>
                        ) : (
                          `${limit} / ${intl.formatMessage({ id: 'common.month', defaultMessage: 'month' })}`
                        )}
                      </p>
                    </div>

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

                  {/* Trial Warning */}
                  {isInTrial && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">
                          {intl.formatMessage({ id: 'subscription.trial.period' })}
                        </p>
                        <p className="text-sm text-blue-700">
                          {intl.formatMessage({ id: 'subscription.trial.daysRemaining' }, { days: trialDaysRemaining })}
                          {' - '}
                          {intl.formatMessage({ id: 'subscription.trial.callsRemaining' }, { calls: trialCallsRemaining })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {intl.formatMessage({ id: 'subscription.quickActions.title' })}
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(translatedRoutes.aiAssistant)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50 transition-colors group border border-transparent hover:border-indigo-100"
                  >
                    <span className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                        <Zap className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {intl.formatMessage({ id: 'subscription.quickActions.openAI' })}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  </button>

                  <button
                    onClick={() => navigate(translatedRoutes.subscriptionPlans)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-green-50 transition-colors group border border-transparent hover:border-green-100"
                  >
                    <span className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                        <CreditCard className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {intl.formatMessage({ id: 'subscription.viewPlans' })}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
                  </button>

                  {subscription.stripeCustomerId && subscription.status !== 'trialing' && (
                    <button
                      onClick={handleBillingPortal}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 transition-colors group border border-transparent hover:border-blue-100 disabled:opacity-50"
                    >
                      <span className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {intl.formatMessage({ id: 'subscription.quickActions.billingPortal' })}
                        </span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </button>
                  )}
                </div>
              </div>

              {/* Plan Features */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className={cn(
                  'p-6 bg-gradient-to-r text-white',
                  TIER_GRADIENTS[subscription.tier] || TIER_GRADIENTS.basic
                )}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 backdrop-blur rounded-lg">
                      {TIER_ICONS[subscription.tier]}
                    </div>
                    <h3 className="font-semibold">{getPlanName()}</h3>
                  </div>
                  <p className="text-sm text-white/80">
                    {currentPlan?.description?.[locale] || currentPlan?.description?.fr ||
                      intl.formatMessage({ id: `subscription.plans.${subscription.tier}.description`, defaultMessage: '' })}
                  </p>
                </div>
                <div className="p-4">
                  {(currentPlan?.features || []).length > 0 ? (
                    <ul className="space-y-2">
                      {(currentPlan?.features || []).slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{feature.name?.[locale] || feature.name?.fr || feature.key}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{isUnlimited ? intl.formatMessage({ id: 'subscription.plans.unlimitedCalls' }) : intl.formatMessage({ id: 'subscription.plans.callsPerMonth' }, { count: limit })}</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{intl.formatMessage({ id: 'subscription.features.priority_support', defaultMessage: 'Priority support' })}</span>
                      </li>
                    </ul>
                  )}

                  {/* Upgrade CTA */}
                  {subscription.tier !== 'unlimited' && (
                    <button
                      onClick={() => navigate(translatedRoutes.subscriptionPlans)}
                      className="mt-4 w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium text-sm hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      {subscription.status === 'trialing'
                        ? intl.formatMessage({ id: 'subscription.viewPlans' })
                        : intl.formatMessage({ id: 'subscription.changePlan' })}
                    </button>
                  )}
                </div>
              </div>

              {/* Reset Info */}
              {!isInTrial && (
                <p className="text-xs text-center text-gray-500 px-4">
                  {intl.formatMessage({ id: 'subscription.quota.resetInfo' })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionPage;
