/**
 * IaSubscriptionsTab - Liste complete des abonnements IA
 * Avec filtres, export CSV, actions Stripe
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAdminTranslations, useIaAdminTranslations } from '../../../utils/adminTranslations';
import {
  Search,
  RefreshCw,
  Check,
  AlertCircle,
  X,
  Download,
  ExternalLink,
  Calendar,
  DollarSign,
  Filter,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Crown,
  Sparkles,
  XCircle,
  Clock
} from 'lucide-react';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { cn } from '../../../utils/cn';
import {
  SubscriptionTier,
  SubscriptionStatus,
  BillingPeriod,
  Currency
} from '../../../types/subscription';
import { SubscriptionListItem, SubscriptionFilter } from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  trialing: { label: 'Essai', color: 'bg-blue-100 text-blue-700', icon: <Sparkles className="w-3 h-3" /> },
  active: { label: 'Actif', color: 'bg-green-100 text-green-700', icon: <Check className="w-3 h-3" /> },
  past_due: { label: 'En retard', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> },
  canceled: { label: 'Annule', color: 'bg-gray-100 text-gray-600', icon: <XCircle className="w-3 h-3" /> },
  expired: { label: 'Expire', color: 'bg-red-100 text-red-700', icon: <X className="w-3 h-3" /> },
  paused: { label: 'En pause', color: 'bg-purple-100 text-purple-700', icon: <Clock className="w-3 h-3" /> }
};

const TIER_LABELS: Record<SubscriptionTier, string> = {
  trial: 'Essai',
  basic: 'Basic',
  standard: 'Standard',
  pro: 'Pro',
  unlimited: 'Illimite'
};

// ============================================================================
// CSV EXPORT
// ============================================================================

const exportToCSV = (subscriptions: SubscriptionListItem[]) => {
  const headers = [
    'ID',
    'Provider',
    'Email',
    'Type',
    'Plan',
    'Tier',
    'Statut',
    'Periode',
    'Devise',
    'Montant',
    'Debut',
    'Fin',
    'Stripe Sub ID',
    'Stripe Customer ID'
  ];

  const rows = subscriptions.map(sub => [
    sub.id,
    sub.providerName,
    sub.providerEmail,
    sub.providerType === 'lawyer' ? 'Avocat' : 'Expatrie',
    sub.planName,
    sub.tier,
    STATUS_CONFIG[sub.status]?.label || sub.status,
    sub.billingPeriod === 'yearly' ? 'Annuel' : 'Mensuel',
    sub.currency,
    sub.amount.toString(),
    sub.startDate.toLocaleDateString('fr-FR'),
    sub.endDate.toLocaleDateString('fr-FR'),
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
// COMPONENT
// ============================================================================

export const IaSubscriptionsTab: React.FC = () => {
  const adminT = useAdminTranslations();
  const iaT = useIaAdminTranslations();

  // State
  const [subscriptions, setSubscriptions] = useState<SubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<SubscriptionFilter>({
    status: 'all',
    tier: 'all',
    billingPeriod: 'all',
    dateRange: 'all',
    search: ''
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
      const subsQuery = query(
        collection(db, 'subscriptions'),
        orderBy('createdAt', 'desc'),
        limit(500)
      );

      const snapshot = await getDocs(subsQuery);
      const subsList: SubscriptionListItem[] = [];

      // Also load users to get provider info
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersMap = new Map<string, { name: string; email: string; type: string }>();
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        usersMap.set(doc.id, {
          name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
          email: data.email || '',
          type: data.providerType || data.role
        });
      });

      // Load plans to get plan names
      const plansSnapshot = await getDocs(collection(db, 'subscription_plans'));
      const plansMap = new Map<string, string>();
      plansSnapshot.docs.forEach(doc => {
        const data = doc.data();
        plansMap.set(doc.id, data.name?.fr || data.name || doc.id);
      });

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const providerId = data.providerId || doc.id;
        const userInfo = usersMap.get(providerId);

        subsList.push({
          id: doc.id,
          providerId,
          providerName: userInfo?.name || 'Inconnu',
          providerEmail: userInfo?.email || '',
          providerType: (userInfo?.type === 'lawyer' ? 'lawyer' : 'expat_aidant') as 'lawyer' | 'expat_aidant',
          planId: data.planId || '',
          planName: plansMap.get(data.planId) || TIER_LABELS[data.tier as SubscriptionTier] || data.tier,
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
    } catch (err: any) {
      console.error('Error loading subscriptions:', err);
      setError(err.message || iaT.errorLoading);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // ============================================================================
  // FILTERED & SORTED DATA
  // ============================================================================

  const filteredSubscriptions = useMemo(() => {
    let result = subscriptions.filter(sub => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!sub.providerName.toLowerCase().includes(search) &&
            !sub.providerEmail.toLowerCase().includes(search)) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all' && sub.status !== filters.status) {
        return false;
      }

      // Tier filter
      if (filters.tier !== 'all' && sub.tier !== filters.tier) {
        return false;
      }

      // Billing period filter
      if (filters.billingPeriod !== 'all' && sub.billingPeriod !== filters.billingPeriod) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        let cutoffDate = new Date();
        switch (filters.dateRange) {
          case '7d':
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            cutoffDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            cutoffDate.setDate(now.getDate() - 90);
            break;
          case '1y':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        if (sub.startDate < cutoffDate) {
          return false;
        }
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'startDate':
          comparison = a.startDate.getTime() - b.startDate.getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'provider':
          comparison = a.providerName.localeCompare(b.providerName);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [subscriptions, filters, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'active');
    const trial = subscriptions.filter(s => s.status === 'trialing');
    const canceled = subscriptions.filter(s => s.status === 'canceled' || s.status === 'expired');

    const mrrEur = active
      .filter(s => s.currency === 'EUR')
      .reduce((acc, s) => acc + (s.billingPeriod === 'yearly' ? s.amount / 12 : s.amount), 0);
    const mrrUsd = active
      .filter(s => s.currency === 'USD')
      .reduce((acc, s) => acc + (s.billingPeriod === 'yearly' ? s.amount / 12 : s.amount), 0);

    return {
      total: subscriptions.length,
      active: active.length,
      trial: trial.length,
      canceled: canceled.length,
      mrrEur: Math.round(mrrEur),
      mrrUsd: Math.round(mrrUsd)
    };
  }, [subscriptions]);

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
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-gray-500">Total abonnements</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600">Actifs</span>
          </div>
          <div className="text-2xl font-bold text-green-700">{stats.active}</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-600">En essai</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats.trial}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-500">MRR</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {stats.mrrEur.toLocaleString()}EUR
            {stats.mrrUsd > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                + ${stats.mrrUsd.toLocaleString()}
              </span>
            )}
          </div>
        </div>
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={iaT.searchByNameEmail}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Status filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as SubscriptionStatus | 'all' }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="trialing">Essai</option>
            <option value="past_due">En retard</option>
            <option value="canceled">Annule</option>
            <option value="expired">Expire</option>
          </select>

          {/* Toggle more filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'px-3 py-2 rounded-lg flex items-center gap-2 transition-colors',
              showFilters ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Export CSV */}
          <button
            onClick={() => exportToCSV(filteredSubscriptions)}
            disabled={filteredSubscriptions.length === 0}
            className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          {/* Refresh */}
          <button
            onClick={loadSubscriptions}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
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
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tous</option>
                <option value="trial">Essai</option>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="pro">Pro</option>
                <option value="unlimited">Illimite</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Periode:</span>
              <select
                value={filters.billingPeriod}
                onChange={(e) => setFilters(prev => ({ ...prev, billingPeriod: e.target.value as BillingPeriod | 'all' }))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Toutes</option>
                <option value="monthly">Mensuel</option>
                <option value="yearly">Annuel</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Date:</span>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as typeof filters.dateRange }))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Toutes periodes</option>
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
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="startDate">Date debut</option>
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
          {filteredSubscriptions.length} abonnement(s) affiche(s)
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Prestataire
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Periode
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Montant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Debut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
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
                    Aucun abonnement trouve
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const statusInfo = STATUS_CONFIG[sub.status];

                  return (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      {/* Provider */}
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{sub.providerName}</div>
                          <div className="text-sm text-gray-500">{sub.providerEmail}</div>
                          <span className="text-xs text-gray-400">
                            {sub.providerType === 'lawyer' ? 'Avocat' : 'Expatrie'}
                          </span>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{sub.planName}</span>
                        <div className="text-xs text-gray-500 capitalize">{sub.tier}</div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'px-2 py-1 rounded text-sm flex items-center gap-1 w-fit',
                          statusInfo?.color
                        )}>
                          {statusInfo?.icon}
                          {statusInfo?.label}
                        </span>
                        {sub.canceledAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            Annule le {sub.canceledAt.toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>

                      {/* Billing Period */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs',
                          sub.billingPeriod === 'yearly'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        )}>
                          {sub.billingPeriod === 'yearly' ? 'Annuel' : 'Mensuel'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">
                          {sub.amount.toLocaleString()} {sub.currency === 'EUR' ? 'EUR' : '$'}
                        </span>
                      </td>

                      {/* Start Date */}
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {sub.startDate.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* End Date */}
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {sub.endDate.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Actions */}
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
    </div>
  );
};

export default IaSubscriptionsTab;
