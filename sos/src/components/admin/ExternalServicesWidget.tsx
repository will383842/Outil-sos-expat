// src/components/admin/ExternalServicesWidget.tsx
// Widget affichant les soldes en temps reel des services externes
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIntl } from 'react-intl';
import {
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Phone,
  Brain,
  Sparkles,
  CreditCard,
  Cloud,
  Search,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

// Types pour les reponses des Cloud Functions
interface TwilioBalanceResponse {
  balance: number;
  currency: string;
  accountSid?: string;
}

interface OpenAIUsageResponse {
  totalUsage: number;
  dailyUsage?: number;
  currency: string;
  billingLimit?: number;
  remainingCredits?: number;
}

interface AnthropicUsageResponse {
  estimatedCost: number;
  currency: string;
  tokenUsage?: number;
  billingLimit?: number;
}

interface PerplexityUsageResponse {
  estimatedCost: number;
  currency: string;
  requestCount?: number;
}

interface StripeBalanceResponse {
  available: number;
  pending: number;
  currency: string;
  totalBalance: number;
}

interface FirebaseUsageResponse {
  estimatedCost: number;
  currency: string;
  breakdown?: {
    firestore?: number;
    functions?: number;
    storage?: number;
    hosting?: number;
  };
}

// Type unifie pour affichage
interface ServiceBalance {
  name: string;
  icon: React.ReactNode;
  balance: number;
  currency: string;
  status: 'ok' | 'warning' | 'critical' | 'loading' | 'error';
  statusMessage?: string;
  details?: string;
  threshold?: {
    warning: number;
    critical: number;
  };
}

// Seuils par defaut pour les alertes (en USD/EUR)
const DEFAULT_THRESHOLDS = {
  twilio: { warning: 50, critical: 20 },
  openai: { warning: 50, critical: 20 },
  anthropic: { warning: 100, critical: 200 }, // Cout estime, alerte si trop eleve
  perplexity: { warning: 50, critical: 100 }, // Cout estime
  stripe: { warning: 100, critical: 50 },
  firebase: { warning: 200, critical: 500 }, // Cout estime
};

// Liste fixe des cles de services (en dehors du composant pour eviter la boucle infinie)
const SERVICE_KEYS = ['twilio', 'openai', 'anthropic', 'perplexity', 'stripe', 'firebase'] as const;

// Composant carte de service
const ServiceCard: React.FC<{
  service: ServiceBalance;
  compact?: boolean;
}> = ({ service, compact = false }) => {
  const getStatusColor = (status: ServiceBalance['status']) => {
    switch (status) {
      case 'ok':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'error':
        return 'border-gray-200 bg-gray-50';
      case 'loading':
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusIcon = (status: ServiceBalance['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-600" />;
      case 'critical':
        return <AlertTriangle size={16} className="text-red-600" />;
      case 'error':
        return <XCircle size={16} className="text-gray-500" />;
      case 'loading':
      default:
        return <Clock size={16} className="text-gray-400 animate-pulse" />;
    }
  };

  const getBalanceColor = (status: ServiceBalance['status']) => {
    switch (status) {
      case 'ok':
        return 'text-green-700';
      case 'warning':
        return 'text-yellow-700';
      case 'critical':
        return 'text-red-700';
      default:
        return 'text-gray-700';
    }
  };

  const formatBalance = (balance: number, currency: string) => {
    if (currency === 'USD') {
      return `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'EUR') {
      return `${balance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    }
    return `${balance.toLocaleString()} ${currency}`;
  };

  if (compact) {
    return (
      <div
        className={`rounded-lg border p-3 ${getStatusColor(service.status)} transition-all hover:shadow-sm`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-gray-600">{service.icon}</div>
            <span className="text-sm font-medium text-gray-800">{service.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            {service.status === 'loading' ? (
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <span className={`text-sm font-bold ${getBalanceColor(service.status)}`}>
                {formatBalance(service.balance, service.currency)}
              </span>
            )}
            {getStatusIcon(service.status)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-4 ${getStatusColor(service.status)} transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-lg ${
              service.status === 'ok'
                ? 'bg-green-100'
                : service.status === 'warning'
                ? 'bg-yellow-100'
                : service.status === 'critical'
                ? 'bg-red-100'
                : 'bg-gray-100'
            }`}
          >
            {service.icon}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{service.name}</h4>
            {service.details && (
              <p className="text-xs text-gray-500">{service.details}</p>
            )}
          </div>
        </div>
        {getStatusIcon(service.status)}
      </div>

      <div className="mt-2">
        {service.status === 'loading' ? (
          <div className="space-y-2">
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ) : service.status === 'error' ? (
          <div className="text-sm text-gray-500">
            {service.statusMessage || 'Erreur de chargement'}
          </div>
        ) : (
          <>
            <div className={`text-2xl font-bold ${getBalanceColor(service.status)}`}>
              {formatBalance(service.balance, service.currency)}
            </div>
            {service.statusMessage && (
              <p
                className={`text-xs mt-1 ${
                  service.status === 'warning'
                    ? 'text-yellow-600'
                    : service.status === 'critical'
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                {service.statusMessage}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Props du widget principal
interface ExternalServicesWidgetProps {
  compact?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // en millisecondes
}

const ExternalServicesWidget: React.FC<ExternalServicesWidgetProps> = ({
  compact = false,
  autoRefresh = true,
  refreshInterval = 5 * 60 * 1000, // 5 minutes par defaut
}) => {
  const intl = useIntl();
  const mountedRef = useRef(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [services, setServices] = useState<Record<string, ServiceBalance>>({
    twilio: {
      name: 'Twilio',
      icon: <Phone size={20} className="text-red-500" />,
      balance: 0,
      currency: 'USD',
      status: 'loading',
      threshold: DEFAULT_THRESHOLDS.twilio,
    },
    openai: {
      name: 'OpenAI',
      icon: <Brain size={20} className="text-green-600" />,
      balance: 0,
      currency: 'USD',
      status: 'loading',
      threshold: DEFAULT_THRESHOLDS.openai,
    },
    anthropic: {
      name: 'Anthropic / Claude',
      icon: <Sparkles size={20} className="text-orange-500" />,
      balance: 0,
      currency: 'USD',
      status: 'loading',
      details: intl.formatMessage({ id: 'admin.externalServices.estimatedCost' }),
      threshold: DEFAULT_THRESHOLDS.anthropic,
    },
    perplexity: {
      name: 'Perplexity',
      icon: <Search size={20} className="text-blue-500" />,
      balance: 0,
      currency: 'USD',
      status: 'loading',
      details: intl.formatMessage({ id: 'admin.externalServices.estimatedCost' }),
      threshold: DEFAULT_THRESHOLDS.perplexity,
    },
    stripe: {
      name: 'Stripe',
      icon: <CreditCard size={20} className="text-purple-600" />,
      balance: 0,
      currency: 'EUR',
      status: 'loading',
      threshold: DEFAULT_THRESHOLDS.stripe,
    },
    firebase: {
      name: 'Firebase / GCP',
      icon: <Cloud size={20} className="text-yellow-500" />,
      balance: 0,
      currency: 'USD',
      status: 'loading',
      details: intl.formatMessage({ id: 'admin.externalServices.estimatedCost' }),
      threshold: DEFAULT_THRESHOLDS.firebase,
    },
  });

  // Fonction pour determiner le statut basee sur le solde et les seuils
  const getStatus = (
    balance: number,
    threshold: { warning: number; critical: number },
    isInversed: boolean = false // Pour les couts estimes, on inverse la logique
  ): { status: ServiceBalance['status']; message?: string } => {
    if (isInversed) {
      // Pour les couts: plus c'est eleve, plus c'est critique
      if (balance >= threshold.critical) {
        return {
          status: 'critical',
          message: intl.formatMessage({ id: 'admin.externalServices.costCritical' }),
        };
      }
      if (balance >= threshold.warning) {
        return {
          status: 'warning',
          message: intl.formatMessage({ id: 'admin.externalServices.costWarning' }),
        };
      }
      return { status: 'ok' };
    } else {
      // Pour les soldes: moins c'est eleve, plus c'est critique
      if (balance <= threshold.critical) {
        return {
          status: 'critical',
          message: intl.formatMessage({ id: 'admin.externalServices.balanceCritical' }),
        };
      }
      if (balance <= threshold.warning) {
        return {
          status: 'warning',
          message: intl.formatMessage({ id: 'admin.externalServices.balanceWarning' }),
        };
      }
      return { status: 'ok' };
    }
  };

  // Fonction pour mettre a jour un service
  const updateService = useCallback(
    (
      key: string,
      updates: Partial<ServiceBalance>
    ) => {
      if (!mountedRef.current) return;
      setServices((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...updates },
      }));
    },
    []
  );

  // Fetch du solde Twilio
  const fetchTwilioBalance = useCallback(async () => {
    try {
      const getTwilioBalance = httpsCallable<void, TwilioBalanceResponse>(
        functions,
        'getTwilioBalance'
      );
      const result = await getTwilioBalance();
      const data = result.data;

      const statusInfo = getStatus(data.balance, DEFAULT_THRESHOLDS.twilio, false);
      updateService('twilio', {
        balance: data.balance,
        currency: data.currency || 'USD',
        status: statusInfo.status,
        statusMessage: statusInfo.message,
        details: intl.formatMessage({ id: 'admin.externalServices.availableBalance' }),
      });
    } catch (error) {
      console.error('Erreur Twilio balance:', error);
      updateService('twilio', {
        status: 'error',
        statusMessage: intl.formatMessage({ id: 'admin.externalServices.fetchError' }),
      });
    }
  }, [updateService, intl]);

  // Fetch de l'usage OpenAI
  const fetchOpenAIUsage = useCallback(async () => {
    try {
      const getOpenAIUsage = httpsCallable<void, OpenAIUsageResponse>(
        functions,
        'getOpenAIUsage'
      );
      const result = await getOpenAIUsage();
      const data = result.data;

      const remaining = data.remainingCredits ?? data.billingLimit ?? 100 - data.totalUsage;
      const statusInfo = getStatus(remaining, DEFAULT_THRESHOLDS.openai, false);

      updateService('openai', {
        balance: remaining,
        currency: data.currency || 'USD',
        status: statusInfo.status,
        statusMessage: statusInfo.message,
        details: intl.formatMessage(
          { id: 'admin.externalServices.usedThisMonth' },
          { amount: data.totalUsage.toFixed(2) }
        ),
      });
    } catch (error) {
      console.error('Erreur OpenAI usage:', error);
      updateService('openai', {
        status: 'error',
        statusMessage: intl.formatMessage({ id: 'admin.externalServices.fetchError' }),
      });
    }
  }, [updateService, intl]);

  // Fetch de l'usage Anthropic
  const fetchAnthropicUsage = useCallback(async () => {
    try {
      const getAnthropicUsage = httpsCallable<void, AnthropicUsageResponse>(
        functions,
        'getAnthropicUsage'
      );
      const result = await getAnthropicUsage();
      const data = result.data;

      const statusInfo = getStatus(data.estimatedCost, DEFAULT_THRESHOLDS.anthropic, true);
      updateService('anthropic', {
        balance: data.estimatedCost,
        currency: data.currency || 'USD',
        status: statusInfo.status,
        statusMessage: statusInfo.message,
        details: intl.formatMessage({ id: 'admin.externalServices.monthlyEstimate' }),
      });
    } catch (error) {
      console.error('Erreur Anthropic usage:', error);
      updateService('anthropic', {
        status: 'error',
        statusMessage: intl.formatMessage({ id: 'admin.externalServices.fetchError' }),
      });
    }
  }, [updateService, intl]);

  // Fetch de l'usage Perplexity
  const fetchPerplexityUsage = useCallback(async () => {
    try {
      const getPerplexityUsage = httpsCallable<void, PerplexityUsageResponse>(
        functions,
        'getPerplexityUsage'
      );
      const result = await getPerplexityUsage();
      const data = result.data;

      const statusInfo = getStatus(data.estimatedCost, DEFAULT_THRESHOLDS.perplexity, true);
      updateService('perplexity', {
        balance: data.estimatedCost,
        currency: data.currency || 'USD',
        status: statusInfo.status,
        statusMessage: statusInfo.message,
        details: intl.formatMessage({ id: 'admin.externalServices.monthlyEstimate' }),
      });
    } catch (error) {
      console.error('Erreur Perplexity usage:', error);
      updateService('perplexity', {
        status: 'error',
        statusMessage: intl.formatMessage({ id: 'admin.externalServices.fetchError' }),
      });
    }
  }, [updateService, intl]);

  // Fetch du solde Stripe
  const fetchStripeBalance = useCallback(async () => {
    try {
      const getStripeBalance = httpsCallable<void, StripeBalanceResponse>(
        functions,
        'getStripeBalance'
      );
      const result = await getStripeBalance();
      const data = result.data;

      const statusInfo = getStatus(data.available, DEFAULT_THRESHOLDS.stripe, false);
      updateService('stripe', {
        balance: data.available,
        currency: data.currency || 'EUR',
        status: statusInfo.status,
        statusMessage: statusInfo.message,
        details: intl.formatMessage(
          { id: 'admin.externalServices.pendingAmount' },
          { amount: data.pending.toFixed(2) }
        ),
      });
    } catch (error) {
      console.error('Erreur Stripe balance:', error);
      updateService('stripe', {
        status: 'error',
        statusMessage: intl.formatMessage({ id: 'admin.externalServices.fetchError' }),
      });
    }
  }, [updateService, intl]);

  // Fetch de l'usage Firebase/GCP
  const fetchFirebaseUsage = useCallback(async () => {
    try {
      const getFirebaseUsage = httpsCallable<void, FirebaseUsageResponse>(
        functions,
        'getFirebaseUsage'
      );
      const result = await getFirebaseUsage();
      const data = result.data;

      const statusInfo = getStatus(data.estimatedCost, DEFAULT_THRESHOLDS.firebase, true);
      updateService('firebase', {
        balance: data.estimatedCost,
        currency: data.currency || 'USD',
        status: statusInfo.status,
        statusMessage: statusInfo.message,
        details: intl.formatMessage({ id: 'admin.externalServices.monthlyEstimate' }),
      });
    } catch (error) {
      console.error('Erreur Firebase usage:', error);
      updateService('firebase', {
        status: 'error',
        statusMessage: intl.formatMessage({ id: 'admin.externalServices.fetchError' }),
      });
    }
  }, [updateService, intl]);

  // Rafraichir tous les services
  const refreshAllServices = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsRefreshing(true);

    // Reset tous les services en loading
    SERVICE_KEYS.forEach((key) => {
      updateService(key, { status: 'loading' });
    });

    // Lancer tous les fetches en parallele
    await Promise.allSettled([
      fetchTwilioBalance(),
      fetchOpenAIUsage(),
      fetchAnthropicUsage(),
      fetchPerplexityUsage(),
      fetchStripeBalance(),
      fetchFirebaseUsage(),
    ]);

    if (mountedRef.current) {
      setIsRefreshing(false);
      setLastUpdated(new Date());
    }
  }, [
    updateService,
    fetchTwilioBalance,
    fetchOpenAIUsage,
    fetchAnthropicUsage,
    fetchPerplexityUsage,
    fetchStripeBalance,
    fetchFirebaseUsage,
  ]);

  // Ref pour stocker la derniere version de refreshAllServices
  const refreshAllServicesRef = useRef(refreshAllServices);

  // Mettre a jour la ref quand la fonction change
  useEffect(() => {
    refreshAllServicesRef.current = refreshAllServices;
  }, [refreshAllServices]);

  // Chargement initial et auto-refresh (sans dependance sur refreshAllServices)
  useEffect(() => {
    mountedRef.current = true;

    // Appel initial unique
    refreshAllServicesRef.current();

    let intervalId: NodeJS.Timeout | undefined;
    if (autoRefresh) {
      // Utiliser la ref pour l'interval
      intervalId = setInterval(() => {
        refreshAllServicesRef.current();
      }, refreshInterval);
    }

    return () => {
      mountedRef.current = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval]); // Plus de dependance sur refreshAllServices!

  // Compter les alertes
  const alertCount = Object.values(services).filter(
    (s) => s.status === 'warning' || s.status === 'critical'
  ).length;

  const criticalCount = Object.values(services).filter(
    (s) => s.status === 'critical'
  ).length;

  // Format de la derniere mise a jour
  const formatLastUpdated = () => {
    if (!lastUpdated) return intl.formatMessage({ id: 'admin.externalServices.never' });
    return lastUpdated.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <DollarSign size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {intl.formatMessage({ id: 'admin.externalServices.title' })}
              </h3>
              <p className="text-xs text-gray-500">
                {intl.formatMessage({ id: 'admin.externalServices.subtitle' })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Badge d'alertes */}
            {alertCount > 0 && (
              <div
                className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  criticalCount > 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                <AlertTriangle size={12} className="mr-1" />
                {alertCount} {intl.formatMessage({ id: 'admin.externalServices.alerts' })}
              </div>
            )}

            {/* Derniere mise a jour */}
            <div className="text-xs text-gray-500 hidden sm:block">
              {intl.formatMessage({ id: 'admin.externalServices.lastUpdated' })}: {formatLastUpdated()}
            </div>

            {/* Bouton refresh */}
            <button
              onClick={refreshAllServices}
              disabled={isRefreshing}
              className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={`mr-1 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {intl.formatMessage({ id: 'admin.externalServices.refresh' })}
            </button>
          </div>
        </div>
      </div>

      {/* Grid des services */}
      <div className="p-6">
        <div
          className={`grid gap-4 ${
            compact
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {Object.entries(services).map(([key, service]) => (
            <ServiceCard key={key} service={service} compact={compact} />
          ))}
        </div>
      </div>

      {/* Footer avec legende */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
              {intl.formatMessage({ id: 'admin.externalServices.statusOk' })}
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
              {intl.formatMessage({ id: 'admin.externalServices.statusWarning' })}
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
              {intl.formatMessage({ id: 'admin.externalServices.statusCritical' })}
            </div>
          </div>
          {autoRefresh && (
            <div className="flex items-center text-gray-400">
              <RefreshCw size={12} className="mr-1" />
              {intl.formatMessage(
                { id: 'admin.externalServices.autoRefresh' },
                { minutes: Math.round(refreshInterval / 60000) }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExternalServicesWidget;
