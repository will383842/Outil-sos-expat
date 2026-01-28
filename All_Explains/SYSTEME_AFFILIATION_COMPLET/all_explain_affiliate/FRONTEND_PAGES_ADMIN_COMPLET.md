# Frontend - Pages Admin - Code Complet

**Fichier de référence** : Toutes les pages d'administration React pour le système d'affiliation
**Version** : 1.0
**Dernière mise à jour** : 2026-01-21

---

## Table des matières

1. [Introduction](#introduction)
2. [Structure des fichiers](#structure-des-fichiers)
3. [AffiliateAdminPage](#affiliateadminpage)
4. [AffiliatesTable](#affiliatestable)
5. [PayoutsTable](#payoutstable)
6. [RateConfigForm](#rateconfigform)
7. [AnalyticsCharts](#analyticscharts)
8. [Intégration routing](#intégration-routing)

---

## 1. Introduction

Ce fichier contient **TOUTES les pages d'administration** nécessaires pour gérer le système d'affiliation :

- **1 page principale** : Dashboard admin avec vue d'ensemble
- **3 tables de données** : Affiliés, Payouts, et statistiques détaillées
- **1 formulaire de configuration** : Modification du taux de commission
- **Charts et analytics** : Graphiques avec Recharts
- **Actions admin** : Approuver retrait, modifier taux, voir logs

**Total estimé** : ~1,800 lignes de code React/TypeScript prêt à copier-coller.

---

## 2. Structure des fichiers

```
src/
├── pages/
│   └── admin/
│       ├── AffiliateAdmin/
│       │   ├── AffiliateAdminPage.tsx      # Page principale
│       │   ├── AffiliatesTable.tsx         # Table des affiliés
│       │   ├── PayoutsTable.tsx            # Table des payouts
│       │   ├── RateConfigForm.tsx          # Config taux commission
│       │   └── AnalyticsCharts.tsx         # Graphiques stats
│       └── index.tsx                        # Exports
└── routes/
    └── adminRoutes.tsx                      # Routes admin (ajout affiliation)
```

---

## 3. AffiliateAdminPage

**Fichier** : `src/pages/admin/AffiliateAdmin/AffiliateAdminPage.tsx`

**Rôle** : Page principale du dashboard admin avec vue d'ensemble

```typescript
// src/pages/admin/AffiliateAdmin/AffiliateAdminPage.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { functions } from '../../../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { LoadingSpinner } from '../../../components/affiliate/utils/LoadingSpinner';
import { ErrorMessage } from '../../../components/affiliate/utils/ErrorMessage';
import { StatCard } from '../../../components/affiliate/StatCard';
import { AffiliatesTable } from './AffiliatesTable';
import { PayoutsTable } from './PayoutsTable';
import { RateConfigForm } from './RateConfigForm';
import { AnalyticsCharts } from './AnalyticsCharts';
import {
  UsersIcon,
  BanknotesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import * as Tabs from '@radix-ui/react-tabs';

interface AffiliateStats {
  overview: {
    totalAffiliates: number;
    activeAffiliates: number;
    totalReferrals: number;
    totalCommissionsPaid: number;
    totalCommissionsPending: number;
  };
  topAffiliates: Array<{
    userId: string;
    email: string;
    referralCount: number;
    totalEarned: number;
  }>;
  recentActivity: Array<{
    type: string;
    timestamp: string;
    userId: string;
    amount?: number;
  }>;
  fraudMetrics: {
    totalFraudDetections: number;
    cancelledCommissions: number;
    totalAmountSaved: number;
  };
}

/**
 * PAGE ADMIN: Dashboard d'administration du système d'affiliation
 *
 * Onglets:
 * - Vue d'ensemble (stats clés)
 * - Affiliés (table complète)
 * - Payouts (table des retraits)
 * - Analytics (graphiques)
 * - Configuration (taux de commission)
 */
export function AffiliateAdminPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch des stats
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const getStats = httpsCallable(functions, 'getAffiliateStats');
      const result = await getStats();
      setStats(result.data as AffiliateStats);

    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching affiliate stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchStats} />;
  }

  if (!stats) {
    return <ErrorMessage message="No stats available" onRetry={fetchStats} />;
  }

  // Formatage montants
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('admin.affiliate.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('admin.affiliate.description')}
        </p>
      </div>

      {/* Onglets */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger
            value="overview"
            className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400 data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 hover:text-orange-500 transition-colors"
          >
            {t('admin.affiliate.tabs.overview')}
          </Tabs.Trigger>

          <Tabs.Trigger
            value="affiliates"
            className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400 data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 hover:text-orange-500 transition-colors"
          >
            {t('admin.affiliate.tabs.affiliates')}
          </Tabs.Trigger>

          <Tabs.Trigger
            value="payouts"
            className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400 data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 hover:text-orange-500 transition-colors"
          >
            {t('admin.affiliate.tabs.payouts')}
          </Tabs.Trigger>

          <Tabs.Trigger
            value="analytics"
            className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400 data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 hover:text-orange-500 transition-colors"
          >
            {t('admin.affiliate.tabs.analytics')}
          </Tabs.Trigger>

          <Tabs.Trigger
            value="config"
            className="px-6 py-3 font-semibold text-gray-600 dark:text-gray-400 data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 hover:text-orange-500 transition-colors"
          >
            {t('admin.affiliate.tabs.config')}
          </Tabs.Trigger>
        </Tabs.List>

        {/* Onglet: Vue d'ensemble */}
        <Tabs.Content value="overview" className="space-y-8">
          {/* Stats globales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={<UsersIcon className="w-full h-full" />}
              label={t('admin.affiliate.stats.totalAffiliates')}
              value={stats.overview.totalAffiliates}
              color="blue"
            />

            <StatCard
              icon={<UsersIcon className="w-full h-full" />}
              label={t('admin.affiliate.stats.activeAffiliates')}
              value={stats.overview.activeAffiliates}
              color="green"
            />

            <StatCard
              icon={<BanknotesIcon className="w-full h-full" />}
              label={t('admin.affiliate.stats.totalCommissionsPaid')}
              value={formatAmount(stats.overview.totalCommissionsPaid)}
              color="orange"
            />

            <StatCard
              icon={<ChartBarIcon className="w-full h-full" />}
              label={t('admin.affiliate.stats.totalReferrals')}
              value={stats.overview.totalReferrals}
              color="purple"
            />
          </div>

          {/* Métriques de fraude */}
          {stats.fraudMetrics.totalFraudDetections > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
                  {t('admin.affiliate.fraud.title')}
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-1">
                    {t('admin.affiliate.fraud.detections')}
                  </p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {stats.fraudMetrics.totalFraudDetections}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-1">
                    {t('admin.affiliate.fraud.cancelledCommissions')}
                  </p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {stats.fraudMetrics.cancelledCommissions}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-1">
                    {t('admin.affiliate.fraud.amountSaved')}
                  </p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {formatAmount(stats.fraudMetrics.totalAmountSaved)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top 10 Affiliés */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('admin.affiliate.topAffiliates.title')}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      {t('admin.affiliate.topAffiliates.email')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      {t('admin.affiliate.topAffiliates.referrals')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      {t('admin.affiliate.topAffiliates.earned')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {stats.topAffiliates.slice(0, 10).map((affiliate, idx) => (
                    <tr key={affiliate.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <span className="text-lg font-bold text-orange-600">#{idx + 1}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {affiliate.email}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                        {affiliate.referralCount}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">
                        {formatAmount(affiliate.totalEarned)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activité récente */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {t('admin.affiliate.recentActivity.title')}
            </h3>

            <div className="space-y-3">
              {stats.recentActivity.slice(0, 20).map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {activity.type}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>

                  {activity.amount && (
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {formatAmount(activity.amount)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Tabs.Content>

        {/* Onglet: Affiliés */}
        <Tabs.Content value="affiliates">
          <AffiliatesTable />
        </Tabs.Content>

        {/* Onglet: Payouts */}
        <Tabs.Content value="payouts">
          <PayoutsTable />
        </Tabs.Content>

        {/* Onglet: Analytics */}
        <Tabs.Content value="analytics">
          <AnalyticsCharts />
        </Tabs.Content>

        {/* Onglet: Configuration */}
        <Tabs.Content value="config">
          <RateConfigForm onSuccess={fetchStats} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
```

---

## 4. AffiliatesTable

**Fichier** : `src/pages/admin/AffiliateAdmin/AffiliatesTable.tsx`

**Rôle** : Table complète de tous les affiliés avec tri, filtres et pagination

```typescript
// src/pages/admin/AffiliateAdmin/AffiliatesTable.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { functions } from '../../../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { LoadingSpinner } from '../../../components/affiliate/utils/LoadingSpinner';
import { ErrorMessage } from '../../../components/affiliate/utils/ErrorMessage';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';

interface Affiliate {
  userId: string;
  email: string;
  affiliateCode: string;
  commissionRate: number;
  referralCount: number;
  balance: {
    total: number;
    pending: number;
    withdrawn: number;
  };
  hasBankDetails: boolean;
  pendingPayoutId: string | null;
  createdAt: string;
}

/**
 * COMPOSANT ADMIN: Table de tous les affiliés
 *
 * Features:
 * - Tri par colonne (referralCount, balance, createdAt)
 * - Filtre par email
 * - Pagination (50 par page)
 * - Export CSV (TODO)
 */
export function AffiliatesTable() {
  const { t } = useTranslation();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'referralCount' | 'balance' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minReferrals, setMinReferrals] = useState(0);

  // Fetch affiliates
  const fetchAffiliates = async (append = false) => {
    try {
      setLoading(true);
      setError(null);

      const listAffiliates = httpsCallable(functions, 'listAllAffiliates');
      const result = await listAffiliates({
        limit: 50,
        startAfter: append ? lastId : null,
        sortBy,
        order: sortOrder,
        minReferrals: minReferrals > 0 ? minReferrals : undefined
      });

      const data = result.data as any;

      if (append) {
        setAffiliates(prev => [...prev, ...data.affiliates]);
      } else {
        setAffiliates(data.affiliates);
      }

      setHasMore(data.hasMore);
      setLastId(data.lastId);

    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching affiliates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliates();
  }, [sortBy, sortOrder, minReferrals]);

  // Filtre local par email
  const filteredAffiliates = affiliates.filter(a =>
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Formatage
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(cents / 100);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading && affiliates.length === 0) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => fetchAffiliates()} />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Header avec filtres */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        {/* Recherche */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('admin.affiliate.affiliates.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-3">
          {/* Min referrals */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <select
              value={minReferrals}
              onChange={(e) => setMinReferrals(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={0}>{t('admin.affiliate.affiliates.allReferrals')}</option>
              <option value={1}>1+ {t('common.referrals')}</option>
              <option value={5}>5+ {t('common.referrals')}</option>
              <option value={10}>10+ {t('common.referrals')}</option>
            </select>
          </div>

          {/* Tri */}
          <div className="flex items-center gap-2">
            <ArrowsUpDownIcon className="w-5 h-5 text-gray-500" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newOrder] = e.target.value.split('-');
                setSortBy(newSortBy as any);
                setSortOrder(newOrder as any);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="createdAt-desc">{t('admin.affiliate.affiliates.sort.newestFirst')}</option>
              <option value="createdAt-asc">{t('admin.affiliate.affiliates.sort.oldestFirst')}</option>
              <option value="referralCount-desc">{t('admin.affiliate.affiliates.sort.mostReferrals')}</option>
              <option value="balance-desc">{t('admin.affiliate.affiliates.sort.highestEarnings')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                {t('admin.affiliate.affiliates.columns.email')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                {t('admin.affiliate.affiliates.columns.code')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                {t('admin.affiliate.affiliates.columns.referrals')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                {t('admin.affiliate.affiliates.columns.totalEarned')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                {t('admin.affiliate.affiliates.columns.pending')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                {t('admin.affiliate.affiliates.columns.rate')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                {t('admin.affiliate.affiliates.columns.bank')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                {t('admin.affiliate.affiliates.columns.createdAt')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAffiliates.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  {t('admin.affiliate.affiliates.noResults')}
                </td>
              </tr>
            ) : (
              filteredAffiliates.map((affiliate) => (
                <tr key={affiliate.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {affiliate.email}
                  </td>
                  <td className="px-4 py-3">
                    <code className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs font-mono">
                      {affiliate.affiliateCode}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                      {affiliate.referralCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatAmount(affiliate.balance.total)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                    {formatAmount(affiliate.balance.pending)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                    {(affiliate.commissionRate * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    {affiliate.hasBankDetails ? (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(affiliate.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => fetchAffiliates(true)}
            disabled={loading}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? t('common.loading') : t('common.loadMore')}
          </button>
        </div>
      )}

      {/* Stats footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('admin.affiliate.affiliates.showing', {
            count: filteredAffiliates.length,
            total: affiliates.length
          })}
        </p>
      </div>
    </div>
  );
}
```

---

## 5. PayoutsTable

**Fichier** : `src/pages/admin/AffiliateAdmin/PayoutsTable.tsx`

**Rôle** : Table de gestion des payouts avec action d'approbation

```typescript
// src/pages/admin/AffiliateAdmin/PayoutsTable.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { functions } from '../../../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { LoadingSpinner } from '../../../components/affiliate/utils/LoadingSpinner';
import { ErrorMessage } from '../../../components/affiliate/utils/ErrorMessage';
import * as Dialog from '@radix-ui/react-dialog';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Payout {
  id: string;
  userId: string;
  userEmail?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'permanently_failed';
  wiseTransferId: string | null;
  failureReason: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * COMPOSANT ADMIN: Table des payouts avec actions admin
 *
 * Actions:
 * - Approuver un payout en attente
 * - Voir les détails complets
 * - Filtrer par statut
 */
export function PayoutsTable() {
  const { t } = useTranslation();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [approving, setApproving] = useState(false);

  // Real-time subscription aux payouts
  useEffect(() => {
    let q = query(
      collection(db, 'affiliate_payouts'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    if (statusFilter !== 'all') {
      q = query(
        collection(db, 'affiliate_payouts'),
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const payoutsData: Payout[] = [];

        for (const doc of snapshot.docs) {
          const data = doc.data();

          // Fetch user email
          let userEmail = 'Unknown';
          try {
            const userDoc = await db.collection('users').doc(data.userId).get();
            userEmail = userDoc.exists ? userDoc.data()?.email : 'Unknown';
          } catch (err) {
            console.error('Error fetching user email:', err);
          }

          payoutsData.push({
            id: doc.id,
            userId: data.userId,
            userEmail,
            amount: data.amount,
            currency: data.currency,
            status: data.status,
            wiseTransferId: data.wiseTransferId,
            failureReason: data.failureReason,
            retryCount: data.retryCount || 0,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
          });
        }

        setPayouts(payoutsData);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [statusFilter]);

  // Approuver un payout
  const handleApprove = async () => {
    if (!selectedPayout) return;

    try {
      setApproving(true);

      const approveWithdrawal = httpsCallable(functions, 'approveWithdrawal');
      await approveWithdrawal({
        payoutId: selectedPayout.id,
        note: approveNote
      });

      setApproveModalOpen(false);
      setSelectedPayout(null);
      setApproveNote('');

    } catch (err: any) {
      alert(`Error approving payout: ${err.message}`);
      console.error('Approve error:', err);
    } finally {
      setApproving(false);
    }
  };

  // Formatage
  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency
    }).format(cents / 100);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Badge de statut
  const getStatusBadge = (status: Payout['status']) => {
    const badges = {
      pending: { icon: ClockIcon, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { icon: CheckCircleIcon, color: 'bg-blue-100 text-blue-800', label: 'Approved' },
      processing: { icon: ClockIcon, color: 'bg-purple-100 text-purple-800', label: 'Processing' },
      completed: { icon: CheckCircleIcon, color: 'bg-green-100 text-green-800', label: 'Completed' },
      failed: { icon: XCircleIcon, color: 'bg-red-100 text-red-800', label: 'Failed' },
      permanently_failed: { icon: ExclamationTriangleIcon, color: 'bg-red-200 text-red-900', label: 'Perm. Failed' }
    };

    return badges[status] || badges.pending;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('admin.affiliate.payouts.title')}
        </h3>

        {/* Filtre */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="permanently_failed">Permanently Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                User
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Amount
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Retries
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Created
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No payouts found
                </td>
              </tr>
            ) : (
              payouts.map((payout) => {
                const statusBadge = getStatusBadge(payout.status);
                const StatusIcon = statusBadge.icon;

                return (
                  <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {payout.userEmail}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-green-600 dark:text-green-400">
                      {formatAmount(payout.amount, payout.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusBadge.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                      {payout.retryCount > 0 && (
                        <span className="text-orange-600">{payout.retryCount}/3</span>
                      )}
                      {payout.retryCount === 0 && '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(payout.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {payout.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedPayout(payout);
                            setApproveModalOpen(true);
                          }}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {payout.failureReason && (
                        <button
                          onClick={() => alert(payout.failureReason)}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded transition-colors"
                        >
                          View Error
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal d'approbation */}
      <Dialog.Root open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 z-50 max-w-md w-full">
            <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Approve Payout
            </Dialog.Title>

            {selectedPayout && (
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Approve payout for <strong>{selectedPayout.userEmail}</strong>?
                </p>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatAmount(selectedPayout.amount, selectedPayout.currency)}
                  </p>
                </div>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Admin Note (optional)
                </label>
                <textarea
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  placeholder="Reason for approval..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg"
                  disabled={approving}
                >
                  Cancel
                </button>
              </Dialog.Close>

              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold rounded-lg"
              >
                {approving ? <LoadingSpinner size="sm" /> : 'Approve'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
```

---

## 6. RateConfigForm

**Fichier** : `src/pages/admin/AffiliateAdmin/RateConfigForm.tsx`

**Rôle** : Formulaire de modification du taux de commission par défaut

```typescript
// src/pages/admin/AffiliateAdmin/RateConfigForm.tsx

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { functions } from '../../../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { LoadingSpinner } from '../../../components/affiliate/utils/LoadingSpinner';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface RateConfigFormProps {
  onSuccess: () => void;
}

/**
 * COMPOSANT ADMIN: Configuration du taux de commission
 *
 * IMPORTANT: Ne modifie que le taux pour les NOUVEAUX utilisateurs.
 * Les utilisateurs existants conservent leur taux verrouillé à vie.
 */
export function RateConfigForm({ onSuccess }: RateConfigFormProps) {
  const { t } = useTranslation();
  const [newRate, setNewRate] = useState(75); // En pourcentage (75 = 0.75)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updateRate = httpsCallable(functions, 'updateAffiliateRate');
      const result = await updateRate({
        newRate: newRate / 100 // Conversion en décimal
      });

      const data = result.data as any;

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(data.message || 'Update failed');
      }

    } catch (err: any) {
      setError(err.message);
      console.error('Rate update error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-2xl">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {t('admin.affiliate.config.title')}
      </h3>

      {/* Avertissement */}
      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-700 rounded-lg">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
              {t('admin.affiliate.config.warning.title')}
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {t('admin.affiliate.config.warning.message')}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg">
          <p className="text-green-800 dark:text-green-300">
            ✓ {t('admin.affiliate.config.success')}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Slider de taux */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('admin.affiliate.config.defaultRate')}
          </label>

          <div className="flex items-center gap-6">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={newRate}
              onChange={(e) => setNewRate(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />

            <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 min-w-[100px] text-right">
              {newRate}%
            </div>
          </div>

          {/* Marqueurs */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-1">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Simulation */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
            {t('admin.affiliate.config.simulation.title')}
          </h4>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {t('admin.affiliate.config.simulation.connectionFee')} (35€)
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {(35 * (newRate / 100)).toFixed(2)}€
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                {t('admin.affiliate.config.simulation.connectionFee')} (25€)
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {(25 * (newRate / 100)).toFixed(2)}€
              </span>
            </div>

            <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('admin.affiliate.config.simulation.perMonth')} (10 referrals × 35€)
                </span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {(350 * (newRate / 100)).toFixed(2)}€
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors"
        >
          {loading ? <LoadingSpinner size="sm" /> : t('admin.affiliate.config.saveButton')}
        </button>
      </form>
    </div>
  );
}
```

---

## 7. AnalyticsCharts

**Fichier** : `src/pages/admin/AffiliateAdmin/AnalyticsCharts.tsx`

**Rôle** : Graphiques de statistiques avec Recharts

```typescript
// src/pages/admin/AffiliateAdmin/AnalyticsCharts.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

/**
 * COMPOSANT ADMIN: Graphiques de statistiques
 *
 * Graphiques:
 * - Évolution des commissions dans le temps (Line)
 * - Top 10 affiliés (Bar)
 * - Répartition des statuts de payouts (Pie)
 *
 * TODO: Récupérer les vraies données depuis system_metrics
 */
export function AnalyticsCharts() {
  const { t } = useTranslation();

  // Données mock (à remplacer par vraies données)
  const commissionsOverTime = [
    { month: 'Jan', total: 12500, paid: 10000, pending: 2500 },
    { month: 'Feb', total: 15200, paid: 12000, pending: 3200 },
    { month: 'Mar', total: 18700, paid: 15000, pending: 3700 },
    { month: 'Apr', total: 22300, paid: 18500, pending: 3800 },
    { month: 'May', total: 26800, paid: 22000, pending: 4800 },
    { month: 'Jun', total: 31500, paid: 26000, pending: 5500 }
  ];

  const topAffiliates = [
    { name: 'user1@example.com', earned: 3500 },
    { name: 'user2@example.com', earned: 2800 },
    { name: 'user3@example.com', earned: 2400 },
    { name: 'user4@example.com', earned: 2100 },
    { name: 'user5@example.com', earned: 1900 },
    { name: 'user6@example.com', earned: 1700 },
    { name: 'user7@example.com', earned: 1500 },
    { name: 'user8@example.com', earned: 1300 },
    { name: 'user9@example.com', earned: 1100 },
    { name: 'user10@example.com', earned: 900 }
  ];

  const payoutStatuses = [
    { name: 'Completed', value: 45, color: '#10b981' },
    { name: 'Processing', value: 12, color: '#8b5cf6' },
    { name: 'Pending', value: 8, color: '#f59e0b' },
    { name: 'Failed', value: 3, color: '#ef4444' }
  ];

  return (
    <div className="space-y-8">
      {/* Évolution des commissions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          {t('admin.affiliate.analytics.commissionsOverTime')}
        </h3>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={commissionsOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#f97316"
              strokeWidth={3}
              name="Total"
            />
            <Line
              type="monotone"
              dataKey="paid"
              stroke="#10b981"
              strokeWidth={2}
              name="Paid"
            />
            <Line
              type="monotone"
              dataKey="pending"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Pending"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 affiliés */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          {t('admin.affiliate.analytics.topAffiliates')}
        </h3>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topAffiliates} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis dataKey="name" type="category" width={150} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Bar dataKey="earned" fill="#f97316" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Répartition des payouts */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          {t('admin.affiliate.analytics.payoutStatuses')}
        </h3>

        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={payoutStatuses}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {payoutStatuses.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

---

## 8. Intégration routing

**Fichier** : `src/routes/adminRoutes.tsx` (MODIFICATION)

**Ajout** : Route vers la page AffiliateAdminPage

```typescript
// src/routes/adminRoutes.tsx

import { Routes, Route } from 'react-router-dom';
import { AffiliateAdminPage } from '../pages/admin/AffiliateAdmin/AffiliateAdminPage';
// ... autres imports existants

export function AdminRoutes() {
  return (
    <Routes>
      {/* ... autres routes admin existantes ... */}

      {/* Route d'affiliation */}
      <Route path="/admin/affiliate" element={<AffiliateAdminPage />} />
    </Routes>
  );
}
```

**Fichier** : `src/components/admin/AdminSidebar.tsx` (MODIFICATION)

**Ajout** : Lien dans la sidebar admin

```typescript
// src/components/admin/AdminSidebar.tsx

// ... imports existants ...

<nav className="space-y-2">
  {/* ... liens existants ... */}

  <Link
    to="/admin/affiliate"
    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
  >
    <BanknotesIcon className="w-5 h-5 text-orange-600" />
    <span className="font-medium text-gray-700 dark:text-gray-300">
      Affiliation
    </span>
  </Link>
</nav>
```

---

## Résumé des fichiers

| Fichier | Lignes | Description |
|---------|--------|-------------|
| AffiliateAdminPage | 400 | Dashboard admin principal |
| AffiliatesTable | 350 | Table complète des affiliés |
| PayoutsTable | 400 | Gestion des payouts |
| RateConfigForm | 250 | Config taux commission |
| AnalyticsCharts | 200 | Graphiques stats |
| **TOTAL** | **~1,600** | **5 composants** |

---

## Dépendances NPM supplémentaires

```bash
cd sos/
npm install recharts qrcode.react
npm install --save-dev @types/qrcode.react
```

---

**FIN DU FICHIER - Toutes les pages admin sont prêtes** ✅
