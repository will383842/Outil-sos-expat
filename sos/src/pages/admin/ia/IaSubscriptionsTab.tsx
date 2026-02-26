/**
 * IaSubscriptionsTab - Tableau de bord complet des abonnements IA
 * Statistiques par pays, langue, rôle, plan + liste détaillée
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdminTranslations, useIaAdminTranslations } from '../../../utils/adminTranslations';
import { useApp } from '../../../contexts/AppContext';
import { getDateLocale } from '../../../utils/formatters';
import {
  Search,
  RefreshCw,
  Check,
  AlertCircle,
  X,
  Download,
  ExternalLink,
  DollarSign,
  Filter,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crown,
  Sparkles,
  XCircle,
  Clock,
  Globe,
  Users,
  TrendingUp,
  BarChart3,
  PieChart,
  MapPin,
  Languages,
  Briefcase,
  Scale,
  Map as MapIcon
} from 'lucide-react';
import WorldMapSubscriptions, { CountryData } from '../../../components/admin/WorldMapSubscriptions';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAdminReferenceData } from '../../../hooks/useAdminReferenceData';
import { cn } from '../../../utils/cn';
import {
  SubscriptionTier,
  SubscriptionStatus,
  BillingPeriod,
  Currency
} from '../../../types/subscription';
import { SubscriptionListItem, SubscriptionFilter } from './types';

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionWithDetails extends SubscriptionListItem {
  country?: string;
  language?: string;
}

interface CountryStat {
  code: string;
  name: string;
  count: number;
  percentage: number;
  mrrEur: number;
}

interface LanguageStat {
  code: string;
  name: string;
  count: number;
  percentage: number;
}

interface RoleStat {
  role: 'lawyer' | 'expat_aidant';
  label: string;
  count: number;
  percentage: number;
  mrrEur: number;
}

interface TierStat {
  tier: SubscriptionTier;
  label: string;
  count: number;
  percentage: number;
  mrrEur: number;
  color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  trialing: { label: 'Essai', color: 'bg-blue-100 text-blue-700', icon: <Sparkles className="w-3 h-3" /> },
  active: { label: 'Actif', color: 'bg-green-100 text-green-700', icon: <Check className="w-3 h-3" /> },
  past_due: { label: 'En retard', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-600', icon: <XCircle className="w-3 h-3" /> },
  canceled: { label: 'Annulé', color: 'bg-gray-100 text-gray-600', icon: <XCircle className="w-3 h-3" /> },
  expired: { label: 'Expiré', color: 'bg-red-100 text-red-700', icon: <X className="w-3 h-3" /> },
  paused: { label: 'En pause', color: 'bg-purple-100 text-purple-700', icon: <Clock className="w-3 h-3" /> },
  suspended: { label: 'Suspendu', color: 'bg-red-200 text-red-800', icon: <AlertCircle className="w-3 h-3" /> }
};

const TIER_LABELS: Record<SubscriptionTier, string> = {
  trial: 'Essai',
  basic: 'Basic',
  standard: 'Standard',
  pro: 'Pro',
  unlimited: 'Illimité'
};

const TIER_COLORS: Record<SubscriptionTier, string> = {
  trial: 'bg-gray-500',
  basic: 'bg-blue-500',
  standard: 'bg-indigo-500',
  pro: 'bg-purple-500',
  unlimited: 'bg-amber-500'
};

const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
  ar: 'العربية',
  ch: '中文',
  hi: 'हिंदी'
};

const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France',
  US: 'États-Unis',
  GB: 'Royaume-Uni',
  DE: 'Allemagne',
  ES: 'Espagne',
  IT: 'Italie',
  BE: 'Belgique',
  CH: 'Suisse',
  CA: 'Canada',
  AU: 'Australie',
  NL: 'Pays-Bas',
  PT: 'Portugal',
  BR: 'Brésil',
  MX: 'Mexique',
  JP: 'Japon',
  CN: 'Chine',
  IN: 'Inde',
  AE: 'Émirats Arabes Unis',
  SA: 'Arabie Saoudite',
  SG: 'Singapour',
  HK: 'Hong Kong',
  MA: 'Maroc',
  TN: 'Tunisie',
  DZ: 'Algérie',
  SN: 'Sénégal',
  CI: 'Côte d\'Ivoire'
};

// ============================================================================
// CSV EXPORT
// ============================================================================

const exportToCSV = (subscriptions: SubscriptionWithDetails[], language: string) => {
  const headers = [
    'ID',
    'Provider',
    'Email',
    'Type',
    'Pays',
    'Langue',
    'Plan',
    'Tier',
    'Statut',
    'Période',
    'Devise',
    'Montant',
    'Début',
    'Fin',
    'Stripe Sub ID',
    'Stripe Customer ID'
  ];

  const rows = subscriptions.map(sub => [
    sub.id,
    sub.providerName,
    sub.providerEmail,
    sub.providerType === 'lawyer' ? 'Avocat' : 'Expatrié',
    sub.country || 'N/A',
    sub.language || 'N/A',
    sub.planName,
    sub.tier,
    STATUS_CONFIG[sub.status]?.label || sub.status,
    sub.billingPeriod === 'yearly' ? 'Annuel' : 'Mensuel',
    sub.currency,
    sub.amount.toString(),
    sub.startDate.toLocaleDateString(getDateLocale(language)),
    sub.endDate.toLocaleDateString(getDateLocale(language)),
    sub.stripeSubscriptionId || '',
    sub.stripeCustomerId || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `abonnements_ia_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  trend?: { value: number; label: string };
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, color = 'bg-white', trend }) => (
  <div className={cn('rounded-xl border border-gray-200 p-4', color)}>
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-sm text-gray-600">{label}</span>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    {subValue && <div className="text-sm text-gray-500">{subValue}</div>}
    {trend && (
      <div className={cn('text-xs mt-1 flex items-center gap-1', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
        <TrendingUp className={cn('w-3 h-3', trend.value < 0 && 'rotate-180')} />
        {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
      </div>
    )}
  </div>
);

// ============================================================================
// DISTRIBUTION BAR COMPONENT
// ============================================================================

interface DistributionBarProps {
  items: { label: string; value: number; percentage: number; color: string }[];
  title: string;
  icon: React.ReactNode;
}

const DistributionBar: React.FC<DistributionBarProps> = ({ items, title, icon }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className="font-semibold text-gray-900">{title}</h3>
    </div>
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">{item.label}</span>
            <span className="font-medium text-gray-900">{item.value} ({item.percentage.toFixed(1)}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', item.color)}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================================
// COMPONENT
// ============================================================================

export const IaSubscriptionsTab: React.FC = () => {
  const adminT = useAdminTranslations();
  const iaT = useIaAdminTranslations();
  const { language } = useApp();

  // COST OPTIMIZATION: Shared reference data cache (users, profiles, plans)
  const { usersMap, profilesMap, plansMap, isLoading: refDataLoading } = useAdminReferenceData();

  // State
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'stats' | 'list' | 'map'>('stats');

  // Filters
  const [filters, setFilters] = useState<SubscriptionFilter & { providerType: 'all' | 'lawyer' | 'expat_aidant'; country: string }>({
    status: 'all',
    tier: 'all',
    billingPeriod: 'all',
    dateRange: 'all',
    search: '',
    providerType: 'all',
    country: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortBy, setSortBy] = useState<'startDate' | 'amount' | 'provider'>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load subscriptions
      const subsQuery = query(
        collection(db, 'subscriptions'),
        orderBy('createdAt', 'desc'),
        limit(1000)
      );
      const snapshot = await getDocs(subsQuery);

      // COST OPTIMIZATION: Use shared reference data from useAdminReferenceData hook
      // This replaces 3 separate Firestore queries (providers, users, plans)
      // Savings: ~2000 reads per page load → 0 reads (uses cached data)

      const subsList: SubscriptionWithDetails[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const providerId = data.providerId || doc.id;

        // Get provider info from cached profiles or users
        const profileInfo = profilesMap.get(providerId);
        const userInfo = usersMap.get(providerId);
        const providerInfo = profileInfo ? {
          name: profileInfo.displayName,
          email: profileInfo.email,
          type: profileInfo.type,
          country: profileInfo.country,
          language: profileInfo.languages?.[0] || 'fr'
        } : userInfo ? {
          name: userInfo.displayName,
          email: userInfo.email,
          type: userInfo.type,
          country: userInfo.country,
          language: userInfo.preferredLanguage
        } : null;

        // Get plan name from cached plans
        const planInfo = plansMap.get(data.planId);

        subsList.push({
          id: doc.id,
          providerId,
          providerName: providerInfo?.name || 'Inconnu',
          providerEmail: providerInfo?.email || '',
          providerType: (providerInfo?.type === 'lawyer' ? 'lawyer' : 'expat_aidant') as 'lawyer' | 'expat_aidant',
          country: providerInfo?.country || 'Unknown',
          language: providerInfo?.language || 'fr',
          planId: data.planId || '',
          planName: planInfo?.name || TIER_LABELS[data.tier as SubscriptionTier] || data.tier,
          tier: data.tier as SubscriptionTier,
          status: data.status as SubscriptionStatus,
          billingPeriod: (data.billingPeriod || 'monthly') as BillingPeriod,
          currency: (data.currency || 'EUR') as Currency,
          amount: data.currentPeriodAmount || 0,
          startDate: data.currentPeriodStart?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
          endDate: data.currentPeriodEnd?.toDate?.() || new Date(),
          canceledAt: data.canceledAt?.toDate?.(),
          stripeSubscriptionId: data.stripeSubscriptionId,
          stripeCustomerId: data.stripeCustomerId
        });
      });

      setSubscriptions(subsList);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      setError((err as Error).message || iaT.errorLoading);
    } finally {
      setLoading(false);
    }
  }, [profilesMap, usersMap, plansMap, iaT.errorLoading]);

  // Load when reference data is ready
  useEffect(() => {
    if (!refDataLoading) {
      loadSubscriptions();
    }
  }, [loadSubscriptions, refDataLoading]);

  // ============================================================================
  // COMPUTED STATS
  // ============================================================================

  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');
    const activeOnly = subscriptions.filter(s => s.status === 'active');
    const trial = subscriptions.filter(s => s.status === 'trialing');
    const canceled = subscriptions.filter(s => s.status === 'cancelled' || s.status === 'canceled' || s.status === 'expired');
    const pastDue = subscriptions.filter(s => s.status === 'past_due');

    // MRR calculation
    const calculateMrr = (subs: SubscriptionWithDetails[], currency: Currency) => {
      return subs
        .filter(s => s.status === 'active' && s.currency === currency)
        .reduce((acc, s) => acc + (s.billingPeriod === 'yearly' ? s.amount / 12 : s.amount), 0);
    };

    const mrrEur = calculateMrr(subscriptions, 'EUR');
    const mrrUsd = calculateMrr(subscriptions, 'USD');

    // ARR (Annual Recurring Revenue)
    const arrEur = mrrEur * 12;

    // Churn rate (canceled in last 30 days / active at start of period)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCanceled = canceled.filter(s => s.canceledAt && s.canceledAt > thirtyDaysAgo).length;
    const churnRate = activeOnly.length > 0 ? (recentCanceled / (activeOnly.length + recentCanceled)) * 100 : 0;

    // Conversion rate (trial to paid)
    const convertedTrials = subscriptions.filter(s =>
      s.status === 'active' && s.tier !== 'trial'
    ).length;
    const totalTrials = subscriptions.filter(s =>
      s.status === 'trialing' || (s.status === 'active' && s.tier !== 'trial')
    ).length;
    const conversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

    return {
      total: subscriptions.length,
      active: active.length,
      activeOnly: activeOnly.length,
      trial: trial.length,
      canceled: canceled.length,
      pastDue: pastDue.length,
      mrrEur: Math.round(mrrEur),
      mrrUsd: Math.round(mrrUsd),
      arrEur: Math.round(arrEur),
      churnRate: churnRate.toFixed(1),
      conversionRate: conversionRate.toFixed(1)
    };
  }, [subscriptions]);

  // Stats by country
  const countryStats = useMemo((): CountryStat[] => {
    const active = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');
    const countryMap = new Map<string, { count: number; mrrEur: number }>();

    active.forEach(sub => {
      const country = sub.country || 'Unknown';
      const existing = countryMap.get(country) || { count: 0, mrrEur: 0 };
      const mrr = sub.status === 'active' && sub.currency === 'EUR'
        ? (sub.billingPeriod === 'yearly' ? sub.amount / 12 : sub.amount)
        : 0;
      countryMap.set(country, {
        count: existing.count + 1,
        mrrEur: existing.mrrEur + mrr
      });
    });

    const total = active.length;
    return Array.from(countryMap.entries())
      .map(([code, data]) => ({
        code,
        name: COUNTRY_NAMES[code] || code,
        count: data.count,
        percentage: total > 0 ? (data.count / total) * 100 : 0,
        mrrEur: Math.round(data.mrrEur)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [subscriptions]);

  // Stats by language
  const languageStats = useMemo((): LanguageStat[] => {
    const active = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');
    const langMap = new Map<string, number>();

    active.forEach(sub => {
      const lang = sub.language || 'fr';
      langMap.set(lang, (langMap.get(lang) || 0) + 1);
    });

    const total = active.length;
    return Array.from(langMap.entries())
      .map(([code, count]) => ({
        code,
        name: LANGUAGE_NAMES[code] || code,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [subscriptions]);

  // Stats by role
  const roleStats = useMemo((): RoleStat[] => {
    const active = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');
    const lawyers = active.filter(s => s.providerType === 'lawyer');
    const expats = active.filter(s => s.providerType === 'expat_aidant');

    const calculateMrr = (subs: SubscriptionWithDetails[]) => {
      return subs
        .filter(s => s.status === 'active' && s.currency === 'EUR')
        .reduce((acc, s) => acc + (s.billingPeriod === 'yearly' ? s.amount / 12 : s.amount), 0);
    };

    const total = active.length;
    return [
      {
        role: 'lawyer',
        label: 'Avocats',
        count: lawyers.length,
        percentage: total > 0 ? (lawyers.length / total) * 100 : 0,
        mrrEur: Math.round(calculateMrr(lawyers))
      },
      {
        role: 'expat_aidant',
        label: 'Expatriés Aidants',
        count: expats.length,
        percentage: total > 0 ? (expats.length / total) * 100 : 0,
        mrrEur: Math.round(calculateMrr(expats))
      }
    ];
  }, [subscriptions]);

  // Stats by tier
  const tierStats = useMemo((): TierStat[] => {
    const active = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing');
    const tierMap = new Map<SubscriptionTier, { count: number; mrrEur: number }>();

    active.forEach(sub => {
      const tier = sub.tier;
      const existing = tierMap.get(tier) || { count: 0, mrrEur: 0 };
      const mrr = sub.status === 'active' && sub.currency === 'EUR'
        ? (sub.billingPeriod === 'yearly' ? sub.amount / 12 : sub.amount)
        : 0;
      tierMap.set(tier, {
        count: existing.count + 1,
        mrrEur: existing.mrrEur + mrr
      });
    });

    const total = active.length;
    const tiers: SubscriptionTier[] = ['trial', 'basic', 'standard', 'pro', 'unlimited'];

    return tiers
      .filter(tier => tierMap.has(tier))
      .map(tier => ({
        tier,
        label: TIER_LABELS[tier],
        count: tierMap.get(tier)?.count || 0,
        percentage: total > 0 ? ((tierMap.get(tier)?.count || 0) / total) * 100 : 0,
        mrrEur: tierMap.get(tier)?.mrrEur || 0,
        color: TIER_COLORS[tier]
      }));
  }, [subscriptions]);

  // Unique countries for filter
  const uniqueCountries = useMemo(() => {
    const countries = new Set<string>();
    subscriptions.forEach(s => {
      if (s.country && s.country !== 'Unknown') {
        countries.add(s.country);
      }
    });
    return Array.from(countries).sort();
  }, [subscriptions]);

  // Data for world map
  const worldMapData = useMemo((): CountryData[] => {
    const countryMap = new Map<string, {
      subscriptions: number;
      mrrEur: number;
      lawyers: number;
      expats: number;
      trials: number;
      active: number;
    }>();

    subscriptions.forEach(sub => {
      const country = sub.country || 'Unknown';
      if (country === 'Unknown') return;

      const existing = countryMap.get(country) || {
        subscriptions: 0,
        mrrEur: 0,
        lawyers: 0,
        expats: 0,
        trials: 0,
        active: 0
      };

      // Only count active or trialing subscriptions
      if (sub.status !== 'active' && sub.status !== 'trialing') return;

      const mrr = sub.status === 'active' && sub.currency === 'EUR'
        ? (sub.billingPeriod === 'yearly' ? sub.amount / 12 : sub.amount)
        : 0;

      countryMap.set(country, {
        subscriptions: existing.subscriptions + 1,
        mrrEur: existing.mrrEur + mrr,
        lawyers: existing.lawyers + (sub.providerType === 'lawyer' ? 1 : 0),
        expats: existing.expats + (sub.providerType === 'expat_aidant' ? 1 : 0),
        trials: existing.trials + (sub.status === 'trialing' ? 1 : 0),
        active: existing.active + (sub.status === 'active' ? 1 : 0)
      });
    });

    return Array.from(countryMap.entries()).map(([code, data]) => ({
      code,
      name: COUNTRY_NAMES[code] || code,
      subscriptions: data.subscriptions,
      mrrEur: Math.round(data.mrrEur),
      lawyers: data.lawyers,
      expats: data.expats,
      trials: data.trials,
      active: data.active
    }));
  }, [subscriptions]);

  // ============================================================================
  // FILTERED & SORTED DATA
  // ============================================================================

  const filteredSubscriptions = useMemo(() => {
    let result = subscriptions.filter(sub => {
      if (filters.search) {
        const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const search = strip(filters.search);
        if (!strip(sub.providerName).includes(search) &&
            !sub.providerEmail.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (filters.status !== 'all') {
        if (filters.status === 'cancelled') {
          if (sub.status !== 'cancelled' && sub.status !== 'canceled') return false;
        } else if (sub.status !== filters.status) return false;
      }
      if (filters.tier !== 'all' && sub.tier !== filters.tier) return false;
      if (filters.billingPeriod !== 'all' && sub.billingPeriod !== filters.billingPeriod) return false;
      if (filters.providerType !== 'all' && sub.providerType !== filters.providerType) return false;
      if (filters.country !== 'all' && sub.country !== filters.country) return false;

      if (filters.dateRange !== 'all') {
        const now = new Date();
        let cutoffDate = new Date();
        switch (filters.dateRange) {
          case '7d': cutoffDate.setDate(now.getDate() - 7); break;
          case '30d': cutoffDate.setDate(now.getDate() - 30); break;
          case '90d': cutoffDate.setDate(now.getDate() - 90); break;
          case '1y': cutoffDate.setFullYear(now.getFullYear() - 1); break;
        }
        if (sub.startDate < cutoffDate) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'startDate': comparison = a.startDate.getTime() - b.startDate.getTime(); break;
        case 'amount': comparison = a.amount - b.amount; break;
        case 'provider': comparison = a.providerName.localeCompare(b.providerName); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [subscriptions, filters, sortBy, sortOrder]);

  const openStripeSubscription = (stripeSubId: string) => {
    window.open(`https://dashboard.stripe.com/subscriptions/${stripeSubId}`, '_blank');
  };

  const openStripeCustomer = (stripeCustomerId: string) => {
    window.open(`https://dashboard.stripe.com/customers/${stripeCustomerId}`, '_blank');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('stats')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
              viewMode === 'stats' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Statistiques
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
              viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <CreditCard className="w-4 h-4" />
            Liste ({filteredSubscriptions.length})
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
              viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <MapIcon className="w-4 h-4" />
            Carte mondiale
          </button>
        </div>

        <button
          onClick={loadSubscriptions}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* STATS VIEW */}
      {viewMode === 'stats' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              icon={<CreditCard className="w-4 h-4 text-indigo-600" />}
              label="Total abonnements"
              value={stats.total}
            />
            <StatCard
              icon={<Crown className="w-4 h-4 text-green-600" />}
              label="Actifs"
              value={stats.activeOnly}
              color="bg-green-50"
            />
            <StatCard
              icon={<Sparkles className="w-4 h-4 text-blue-600" />}
              label="En essai"
              value={stats.trial}
              color="bg-blue-50"
            />
            <StatCard
              icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
              label="MRR"
              value={`${stats.mrrEur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`}
              subValue={stats.mrrUsd > 0 ? `+ $${stats.mrrUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined}
              color="bg-emerald-50"
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
              label="ARR"
              value={`${stats.arrEur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`}
              color="bg-purple-50"
            />
            <StatCard
              icon={<PieChart className="w-4 h-4 text-amber-600" />}
              label="Conversion"
              value={`${stats.conversionRate}%`}
              subValue={`Churn: ${stats.churnRate}%`}
              color="bg-amber-50"
            />
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Role */}
            <DistributionBar
              title="Par type de prestataire"
              icon={<Users className="w-5 h-5 text-indigo-600" />}
              items={roleStats.map(r => ({
                label: `${r.label} (${r.mrrEur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€ MRR)`,
                value: r.count,
                percentage: r.percentage,
                color: r.role === 'lawyer' ? 'bg-red-500' : 'bg-blue-500'
              }))}
            />

            {/* By Tier */}
            <DistributionBar
              title="Par plan"
              icon={<Crown className="w-5 h-5 text-purple-600" />}
              items={tierStats.map(t => ({
                label: `${t.label} (${t.mrrEur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€ MRR)`,
                value: t.count,
                percentage: t.percentage,
                color: t.color
              }))}
            />

            {/* By Country */}
            <DistributionBar
              title="Top 10 pays"
              icon={<Globe className="w-5 h-5 text-green-600" />}
              items={countryStats.map((c, i) => ({
                label: `${c.name} (${c.mrrEur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€)`,
                value: c.count,
                percentage: c.percentage,
                color: i === 0 ? 'bg-green-500' : i === 1 ? 'bg-green-400' : 'bg-green-300'
              }))}
            />

            {/* By Language */}
            <DistributionBar
              title="Par langue préférée"
              icon={<Languages className="w-5 h-5 text-amber-600" />}
              items={languageStats.map((l, i) => ({
                label: l.name,
                value: l.count,
                percentage: l.percentage,
                color: i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-amber-400' : 'bg-amber-300'
              }))}
            />
          </div>

          {/* Quick Summary Table */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Résumé par statut
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                const count = subscriptions.filter(s => s.status === status).length;
                return (
                  <div key={status} className={cn('p-3 rounded-lg', config.color.replace('text-', 'bg-').replace('-700', '-50').replace('-600', '-50'))}>
                    <div className="flex items-center gap-2 mb-1">
                      {config.icon}
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Quick filters */}
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as SubscriptionStatus | 'all' }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="trialing">Essai</option>
                <option value="past_due">En retard</option>
                <option value="cancelled">Annulé</option>
                <option value="expired">Expiré</option>
              </select>

              <select
                value={filters.providerType}
                onChange={(e) => setFilters(prev => ({ ...prev, providerType: e.target.value as any }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tous les types</option>
                <option value="lawyer">Avocats</option>
                <option value="expat_aidant">Expatriés</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'px-3 py-2 rounded-lg flex items-center gap-2 transition-colors',
                  showFilters ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Filter className="w-4 h-4" />
                Plus
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <button
                onClick={() => exportToCSV(filteredSubscriptions, language)}
                disabled={filteredSubscriptions.length === 0}
                className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Advanced filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Plan:</span>
                  <select
                    value={filters.tier}
                    onChange={(e) => setFilters(prev => ({ ...prev, tier: e.target.value as SubscriptionTier | 'all' }))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="all">Tous</option>
                    <option value="trial">Essai</option>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="pro">Pro</option>
                    <option value="unlimited">Illimité</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Période:</span>
                  <select
                    value={filters.billingPeriod}
                    onChange={(e) => setFilters(prev => ({ ...prev, billingPeriod: e.target.value as BillingPeriod | 'all' }))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="all">Toutes</option>
                    <option value="monthly">Mensuel</option>
                    <option value="yearly">Annuel</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Pays:</span>
                  <select
                    value={filters.country}
                    onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="all">Tous</option>
                    {uniqueCountries.map(c => (
                      <option key={c} value={c}>{COUNTRY_NAMES[c] || c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Date:</span>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="all">Toutes périodes</option>
                    <option value="7d">7 derniers jours</option>
                    <option value="30d">30 derniers jours</option>
                    <option value="90d">90 derniers jours</option>
                    <option value="1y">1 an</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Tri:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value="startDate">Date début</option>
                    <option value="amount">Montant</option>
                    <option value="provider">Prestataire</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                  >
                    {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-2 text-sm text-gray-500">
              {filteredSubscriptions.length} abonnement(s) affiché(s) sur {subscriptions.length}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prestataire</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pays</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Début</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        {adminT.loading}
                      </td>
                    </tr>
                  ) : filteredSubscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        Aucun abonnement trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredSubscriptions.map((sub) => {
                      const statusInfo = STATUS_CONFIG[sub.status];
                      return (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">{sub.providerName}</div>
                              <div className="text-sm text-gray-500">{sub.providerEmail}</div>
                              <span className={cn(
                                'text-xs px-1.5 py-0.5 rounded',
                                sub.providerType === 'lawyer' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              )}>
                                {sub.providerType === 'lawyer' ? 'Avocat' : 'Expatrié'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="text-sm text-gray-700">{COUNTRY_NAMES[sub.country || ''] || sub.country}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Languages className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{LANGUAGE_NAMES[sub.language || 'fr'] || sub.language}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{sub.planName}</span>
                            <div className="text-xs text-gray-500 capitalize">{sub.tier}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('px-2 py-1 rounded text-sm flex items-center gap-1 w-fit', statusInfo?.color)}>
                              {statusInfo?.icon}
                              {statusInfo?.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'px-2 py-1 rounded text-xs',
                              sub.billingPeriod === 'yearly' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                            )}>
                              {sub.billingPeriod === 'yearly' ? 'Annuel' : 'Mensuel'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-900">
                              {sub.amount.toLocaleString()} {sub.currency === 'EUR' ? '€' : '$'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {sub.startDate.toLocaleDateString(getDateLocale(language), { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {sub.stripeSubscriptionId && (
                                <button
                                  onClick={() => openStripeSubscription(sub.stripeSubscriptionId!)}
                                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                  title="Voir dans Stripe"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              )}
                              {sub.stripeCustomerId && (
                                <button
                                  onClick={() => openStripeCustomer(sub.stripeCustomerId!)}
                                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Client Stripe"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MAP VIEW */}
      {viewMode === 'map' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Globe className="w-4 h-4 text-indigo-600" />}
              label="Pays actifs"
              value={worldMapData.length}
            />
            <StatCard
              icon={<Users className="w-4 h-4 text-green-600" />}
              label="Total abonnés"
              value={worldMapData.reduce((acc, c) => acc + c.subscriptions, 0)}
              color="bg-green-50"
            />
            <StatCard
              icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
              label="MRR mondial"
              value={`${worldMapData.reduce((acc, c) => acc + c.mrrEur, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`}
              color="bg-emerald-50"
            />
            <StatCard
              icon={<TrendingUp className="w-4 h-4 text-amber-600" />}
              label="En essai"
              value={worldMapData.reduce((acc, c) => acc + c.trials, 0)}
              color="bg-amber-50"
            />
          </div>

          {/* World Map */}
          <WorldMapSubscriptions data={worldMapData} />

          {/* Country breakdown table */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              Détail par pays
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pays</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Abonnements</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">MRR</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avocats</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Expatriés</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Essais</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actifs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {worldMapData
                    .sort((a, b) => b.subscriptions - a.subscriptions)
                    .map(country => (
                      <tr key={country.code} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{country.name}</td>
                        <td className="px-4 py-2 text-right text-gray-700">{country.subscriptions}</td>
                        <td className="px-4 py-2 text-right text-emerald-600 font-medium">{country.mrrEur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</td>
                        <td className="px-4 py-2 text-right text-red-600">{country.lawyers}</td>
                        <td className="px-4 py-2 text-right text-blue-600">{country.expats}</td>
                        <td className="px-4 py-2 text-right text-amber-600">{country.trials}</td>
                        <td className="px-4 py-2 text-right text-green-600">{country.active}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <tr>
                    <td className="px-4 py-2 text-gray-900">Total</td>
                    <td className="px-4 py-2 text-right text-gray-900">{worldMapData.reduce((acc, c) => acc + c.subscriptions, 0)}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{worldMapData.reduce((acc, c) => acc + c.mrrEur, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</td>
                    <td className="px-4 py-2 text-right text-red-700">{worldMapData.reduce((acc, c) => acc + c.lawyers, 0)}</td>
                    <td className="px-4 py-2 text-right text-blue-700">{worldMapData.reduce((acc, c) => acc + c.expats, 0)}</td>
                    <td className="px-4 py-2 text-right text-amber-700">{worldMapData.reduce((acc, c) => acc + c.trials, 0)}</td>
                    <td className="px-4 py-2 text-right text-green-700">{worldMapData.reduce((acc, c) => acc + c.active, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IaSubscriptionsTab;
