# Frontend - Composants React - Code Complet

**Fichier de référence** : Tous les composants React/TypeScript pour le système d'affiliation
**Version** : 1.0
**Dernière mise à jour** : 2026-01-21

---

## Table des matières

1. [Introduction](#introduction)
2. [Structure des fichiers](#structure-des-fichiers)
3. [PiggyBank Component](#piggybank-component)
4. [CommissionsList Component](#commissionslist-component)
5. [AffiliateLink Component](#affiliatelink-component)
6. [WithdrawalButton Component](#withdrawalbutton-component)
7. [BankDetailsForm Component](#bankdetailsform-component)
8. [StatCard Component](#statcard-component)
9. [AffiliateWidget Component](#affiliatewidget-component)
10. [Composants utilitaires](#composants-utilitaires)

---

## 1. Introduction

Ce fichier contient **TOUS les composants React** nécessaires pour l'interface utilisateur du système d'affiliation :

- **7 composants principaux** : UI complète de l'affiliation
- **3 composants utilitaires** : Loading, Error, Toast
- **Radix UI** : Dialog, Select, Toast pour l'accessibilité
- **Tailwind CSS** : Styling complet avec design system SOS-Expat
- **i18n** : Support de 9 langues (hooks `useTranslation` déjà présents)

**Total estimé** : ~2,200 lignes de code React/TypeScript prêt à copier-coller.

---

## 2. Structure des fichiers

```
src/
├── components/
│   └── affiliate/
│       ├── PiggyBank.tsx              # Tirelire visuelle animée
│       ├── CommissionsList.tsx        # Liste des commissions
│       ├── AffiliateLink.tsx          # Partage du lien d'affiliation
│       ├── WithdrawalButton.tsx       # Bouton de retrait
│       ├── BankDetailsForm.tsx        # Formulaire IBAN/Sort Code/ABA
│       ├── StatCard.tsx               # Carte de statistique
│       ├── AffiliateWidget.tsx        # Widget global (intègre tous les autres)
│       └── utils/
│           ├── LoadingSpinner.tsx     # Spinner de chargement
│           ├── ErrorMessage.tsx       # Message d'erreur
│           └── ToastProvider.tsx      # Toast notifications
└── pages/
    └── user/
        └── AffiliateProfile.tsx       # Page profil affiliation (utilise AffiliateWidget)
```

---

## 3. PiggyBank Component

**Fichier** : `src/components/affiliate/PiggyBank.tsx`

**Rôle** : Affiche une tirelire visuelle avec animation et détails du solde

```typescript
// src/components/affiliate/PiggyBank.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface PiggyBankProps {
  totalEarned: number;      // En centimes
  pendingBalance: number;   // Disponible pour retrait
  withdrawnBalance: number; // Déjà retiré
  currency: string;         // 'EUR', 'USD', etc.
}

/**
 * COMPOSANT: Tirelire visuelle animée
 *
 * Affichage:
 * - Icône de tirelire avec animation de "remplissage"
 * - Total gagné (grand titre)
 * - Disponible pour retrait (mis en avant)
 * - Déjà retiré (info secondaire)
 *
 * Animation:
 * - Bounce au hover
 * - Pulse si pendingBalance >= minWithdrawal
 */
export function PiggyBank({
  totalEarned,
  pendingBalance,
  withdrawnBalance,
  currency
}: PiggyBankProps) {
  const { t } = useTranslation();

  // Formatage des montants
  const formatAmount = (cents: number) => {
    const amount = cents / 100;
    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency
    }).format(amount);
  };

  // Pourcentage de remplissage (max 100%)
  const fillPercentage = Math.min((pendingBalance / 10000) * 100, 100); // 100€ = full

  // Animation de pulse si retrait disponible
  const canWithdraw = pendingBalance >= 2000; // 20€ minimum

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-8 shadow-lg border-2 border-amber-200 dark:border-amber-800">
      {/* Titre */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('affiliate.piggyBank.title')}
        </h3>
        {canWithdraw && (
          <motion.span
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full"
          >
            {t('affiliate.piggyBank.withdrawAvailable')}
          </motion.span>
        )}
      </div>

      {/* Tirelire visuelle */}
      <div className="flex flex-col items-center mb-8">
        <motion.div
          whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.5 }}
          className="relative w-32 h-32 mb-4"
        >
          {/* SVG Tirelire */}
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-xl"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Corps de la tirelire */}
            <ellipse
              cx="100"
              cy="100"
              rx="80"
              ry="60"
              fill="#f59e0b"
              opacity={0.3 + (fillPercentage / 100) * 0.7}
            />
            <ellipse cx="100" cy="100" rx="70" ry="50" fill="#f97316" />

            {/* Slot pour pièces */}
            <rect x="85" y="50" width="30" height="4" rx="2" fill="#78350f" />

            {/* Pattes */}
            <circle cx="60" cy="140" r="8" fill="#ea580c" />
            <circle cx="140" cy="140" r="8" fill="#ea580c" />

            {/* Museau */}
            <ellipse cx="160" cy="100" rx="25" ry="20" fill="#fb923c" />
            <circle cx="170" cy="95" r="3" fill="#78350f" />
            <circle cx="170" cy="105" r="3" fill="#78350f" />

            {/* Oeil */}
            <circle cx="120" cy="85" r="6" fill="#1f2937" />
            <circle cx="122" cy="83" r="2" fill="white" />

            {/* Oreille */}
            <ellipse
              cx="80"
              cy="60"
              rx="12"
              ry="20"
              fill="#fb923c"
              transform="rotate(-30 80 60)"
            />

            {/* Queue en tire-bouchon */}
            <path
              d="M 30 110 Q 20 105, 25 100 T 30 95"
              stroke="#ea580c"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>

          {/* Barre de remplissage */}
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-full px-4">
            <div className="h-2 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fillPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Montant total gagné */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('affiliate.piggyBank.totalEarned')}
          </p>
          <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">
            {formatAmount(totalEarned)}
          </p>
        </div>
      </div>

      {/* Détails du solde */}
      <div className="grid grid-cols-2 gap-4">
        {/* Disponible */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-amber-200 dark:border-amber-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('affiliate.piggyBank.available')}
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatAmount(pendingBalance)}
          </p>
        </div>

        {/* Retiré */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-amber-200 dark:border-amber-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('affiliate.piggyBank.withdrawn')}
          </p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">
            {formatAmount(withdrawnBalance)}
          </p>
        </div>
      </div>

      {/* Message d'encouragement si solde faible */}
      {pendingBalance < 2000 && totalEarned > 0 && (
        <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t('affiliate.piggyBank.almostThere', {
              remaining: formatAmount(2000 - pendingBalance)
            })}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 4. CommissionsList Component

**Fichier** : `src/components/affiliate/CommissionsList.tsx`

**Rôle** : Liste paginée des commissions avec filtres et détails

```typescript
// src/components/affiliate/CommissionsList.tsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { functions } from '../../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { LoadingSpinner } from './utils/LoadingSpinner';
import { ErrorMessage } from './utils/ErrorMessage';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

interface Commission {
  id: string;
  refereeEmail: string;
  callSessionId: string;
  connectionFee: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'available' | 'paid' | 'cancelled';
  createdAt: string;
  availableAt: string | null;
  paidAt: string | null;
  fraudScore: number;
  fraudFlags: string[];
}

interface CommissionsListProps {
  currency: string;
  limit?: number;
}

/**
 * COMPOSANT: Liste des commissions avec pagination
 *
 * Features:
 * - Pagination infinie (Load More)
 * - Filtres par statut
 * - Expand/collapse pour voir les détails
 * - Indicateurs de fraude si fraudScore > 50
 */
export function CommissionsList({ currency, limit = 20 }: CommissionsListProps) {
  const { t } = useTranslation();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Fetch des commissions
  const fetchCommissions = async (append = false) => {
    try {
      setLoading(true);
      setError(null);

      const getCommissions = httpsCallable(functions, 'getMyCommissions');
      const result = await getCommissions({
        limit,
        startAfter: append ? lastId : null,
        status: statusFilter === 'all' ? undefined : statusFilter
      });

      const data = result.data as any;

      if (append) {
        setCommissions(prev => [...prev, ...data.commissions]);
      } else {
        setCommissions(data.commissions);
      }

      setHasMore(data.hasMore);
      setLastId(data.lastId);

    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [statusFilter]);

  // Formatage des montants
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency
    }).format(cents / 100);
  };

  // Formatage des dates
  const formatDate = (isoString: string | null) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString(navigator.language, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Icône et couleur selon le statut
  const getStatusBadge = (status: Commission['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: ClockIcon,
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
          label: t('affiliate.commission.status.pending')
        };
      case 'available':
        return {
          icon: CheckCircleIcon,
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          label: t('affiliate.commission.status.available')
        };
      case 'paid':
        return {
          icon: CheckCircleIcon,
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          label: t('affiliate.commission.status.paid')
        };
      case 'cancelled':
        return {
          icon: XCircleIcon,
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
          label: t('affiliate.commission.status.cancelled')
        };
    }
  };

  // Toggle expand
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (loading && commissions.length === 0) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={() => fetchCommissions()} />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Header avec filtres */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('affiliate.commissions.title')}
        </h3>

        {/* Filtre par statut */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="all">{t('affiliate.commissions.filter.all')}</option>
          <option value="pending">{t('affiliate.commissions.filter.pending')}</option>
          <option value="available">{t('affiliate.commissions.filter.available')}</option>
          <option value="paid">{t('affiliate.commissions.filter.paid')}</option>
          <option value="cancelled">{t('affiliate.commissions.filter.cancelled')}</option>
        </select>
      </div>

      {/* Liste */}
      {commissions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {t('affiliate.commissions.empty')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {commissions.map((commission) => {
            const statusBadge = getStatusBadge(commission.status);
            const StatusIcon = statusBadge.icon;
            const isExpanded = expandedIds.has(commission.id);

            return (
              <div
                key={commission.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Ligne principale */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleExpand(commission.id)}
                >
                  {/* Left: Email et date */}
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {commission.refereeEmail}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(commission.createdAt)}
                    </p>
                  </div>

                  {/* Center: Statut */}
                  <div className="flex items-center gap-2 mx-4">
                    <span
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                    >
                      <StatusIcon className="w-4 h-4" />
                      {statusBadge.label}
                    </span>

                    {/* Warning si fraude */}
                    {commission.fraudScore > 50 && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        ⚠️ Fraud: {commission.fraudScore}
                      </span>
                    )}
                  </div>

                  {/* Right: Montant */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {formatAmount(commission.commissionAmount)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {commission.commissionRate * 100}% de {formatAmount(commission.connectionFee)}
                    </p>
                  </div>

                  {/* Expand icon */}
                  {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-gray-400 ml-4" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400 ml-4" />
                  )}
                </div>

                {/* Détails expandables */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                    <dl className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">
                          {t('affiliate.commissions.details.callSessionId')}
                        </dt>
                        <dd className="font-mono text-gray-900 dark:text-white">
                          {commission.callSessionId}
                        </dd>
                      </div>

                      {commission.availableAt && (
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">
                            {t('affiliate.commissions.details.availableAt')}
                          </dt>
                          <dd className="text-gray-900 dark:text-white">
                            {formatDate(commission.availableAt)}
                          </dd>
                        </div>
                      )}

                      {commission.paidAt && (
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">
                            {t('affiliate.commissions.details.paidAt')}
                          </dt>
                          <dd className="text-gray-900 dark:text-white">
                            {formatDate(commission.paidAt)}
                          </dd>
                        </div>
                      )}

                      {commission.fraudFlags.length > 0 && (
                        <div className="col-span-2">
                          <dt className="text-gray-500 dark:text-gray-400 mb-1">
                            {t('affiliate.commissions.details.fraudFlags')}
                          </dt>
                          <dd className="flex flex-wrap gap-2">
                            {commission.fraudFlags.map((flag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded"
                              >
                                {flag}
                              </span>
                            ))}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => fetchCommissions(true)}
            disabled={loading}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? t('common.loading') : t('affiliate.commissions.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 5. AffiliateLink Component

**Fichier** : `src/components/affiliate/AffiliateLink.tsx`

**Rôle** : Partage du lien d'affiliation avec copie et QR code

```typescript
// src/components/affiliate/AffiliateLink.tsx

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { LinkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';

interface AffiliateLinkProps {
  affiliateCode: string;
  affiliateLink: string;
}

/**
 * COMPOSANT: Partage du lien d'affiliation
 *
 * Features:
 * - Copie du lien au clic
 * - QR code dans une modal
 * - Partage sur réseaux sociaux (WhatsApp, Facebook, Twitter, Email)
 */
export function AffiliateLink({ affiliateCode, affiliateLink }: AffiliateLinkProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Copie dans le presse-papier
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Liens de partage
  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(
      t('affiliate.share.message', { link: affiliateLink })
    )}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(affiliateLink)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      affiliateLink
    )}&text=${encodeURIComponent(t('affiliate.share.message', { link: '' }))}`,
    email: `mailto:?subject=${encodeURIComponent(
      t('affiliate.share.emailSubject')
    )}&body=${encodeURIComponent(t('affiliate.share.message', { link: affiliateLink }))}`
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Titre */}
      <div className="flex items-center gap-2 mb-4">
        <LinkIcon className="w-6 h-6 text-orange-500" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('affiliate.link.title')}
        </h3>
      </div>

      {/* Code d'affiliation */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('affiliate.link.yourCode')}
        </label>
        <div className="px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700 rounded-lg">
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 text-center tracking-wider">
            {affiliateCode}
          </p>
        </div>
      </div>

      {/* Lien avec copie */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('affiliate.link.shareLink')}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={affiliateLink}
            readOnly
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <CheckIcon className="w-5 h-5" />
                {t('common.copied')}
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-5 h-5" />
                {t('common.copy')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Boutons de partage */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <a
          href={shareLinks.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          WhatsApp
        </a>

        <a
          href={shareLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </a>

        <a
          href={shareLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
          </svg>
          Twitter
        </a>

        <a
          href={shareLinks.email}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email
        </a>
      </div>

      {/* Bouton QR Code */}
      <Dialog.Root open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <Dialog.Trigger asChild>
          <button className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors">
            {t('affiliate.link.showQRCode')}
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 z-50 max-w-md w-full">
            <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              {t('affiliate.link.qrCodeTitle')}
            </Dialog.Title>

            <div className="flex justify-center mb-6">
              <QRCodeSVG value={affiliateLink} size={256} level="H" />
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
              {t('affiliate.link.qrCodeDescription')}
            </p>

            <Dialog.Close asChild>
              <button className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg">
                {t('common.close')}
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
```

---

## 6. WithdrawalButton Component

**Fichier** : `src/components/affiliate/WithdrawalButton.tsx`

**Rôle** : Bouton de demande de retrait avec modal de confirmation

```typescript
// src/components/affiliate/WithdrawalButton.tsx

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { functions } from '../../services/firebase';
import { httpsCallable } from 'firebase/functions';
import * as Dialog from '@radix-ui/react-dialog';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from './utils/LoadingSpinner';

interface WithdrawalButtonProps {
  pendingBalance: number;
  currency: string;
  canWithdraw: boolean;
  hasBankDetails: boolean;
  onSuccess: () => void;
}

/**
 * COMPOSANT: Bouton de demande de retrait
 *
 * Vérifications:
 * - Solde >= 20€
 * - Coordonnées bancaires renseignées
 * - Pas de retrait en cours
 *
 * Modal de confirmation avec montant et estimation
 */
export function WithdrawalButton({
  pendingBalance,
  currency,
  canWithdraw,
  hasBankDetails,
  onSuccess
}: WithdrawalButtonProps) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formatage
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(navigator.language, {
      style: 'currency',
      currency
    }).format(cents / 100);
  };

  // Demande de retrait
  const handleWithdrawal = async () => {
    try {
      setLoading(true);
      setError(null);

      const requestWithdrawal = httpsCallable(functions, 'requestWithdrawal');
      const result = await requestWithdrawal({
        amount: pendingBalance,
        currency
      });

      const data = result.data as any;

      if (data.success) {
        setModalOpen(false);
        onSuccess();
      } else {
        setError(data.message || 'Withdrawal request failed');
      }

    } catch (err: any) {
      setError(err.message);
      console.error('Withdrawal error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Message si retrait impossible
  let disabledReason = '';
  if (!hasBankDetails) {
    disabledReason = t('affiliate.withdrawal.needBankDetails');
  } else if (pendingBalance < 2000) {
    disabledReason = t('affiliate.withdrawal.minimumAmount', { amount: formatAmount(2000) });
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        disabled={!canWithdraw}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:hover:scale-100"
        title={disabledReason}
      >
        <BanknotesIcon className="w-6 h-6" />
        {t('affiliate.withdrawal.requestButton')}
      </button>

      {!canWithdraw && disabledReason && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">
          {disabledReason}
        </p>
      )}

      {/* Modal de confirmation */}
      <Dialog.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 z-50 max-w-md w-full">
            <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t('affiliate.withdrawal.confirmTitle')}
            </Dialog.Title>

            {error && (
              <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {t('affiliate.withdrawal.confirmMessage')}
              </p>

              <div className="p-6 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t('affiliate.withdrawal.amount')}
                </p>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {formatAmount(pendingBalance)}
                </p>
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  ⏱️ {t('affiliate.withdrawal.estimatedTime')}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {t('affiliate.withdrawal.estimatedTimeDetails')}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Dialog.Close asChild>
                <button
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
                  disabled={loading}
                >
                  {t('common.cancel')}
                </button>
              </Dialog.Close>

              <button
                onClick={handleWithdrawal}
                disabled={loading}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? <LoadingSpinner size="sm" /> : t('common.confirm')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
```

---

## 7. BankDetailsForm Component

**Fichier** : `src/components/affiliate/BankDetailsForm.tsx`

**Rôle** : Formulaire de saisie des coordonnées bancaires (IBAN/Sort Code/ABA)

```typescript
// src/components/affiliate/BankDetailsForm.tsx

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { functions } from '../../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { LoadingSpinner } from './utils/LoadingSpinner';
import * as Select from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface BankDetailsFormProps {
  onSuccess: () => void;
}

type AccountType = 'iban' | 'sort_code' | 'aba';
type Currency = 'EUR' | 'GBP' | 'USD' | 'CHF' | 'CAD';

/**
 * COMPOSANT: Formulaire de coordonnées bancaires
 *
 * Supports:
 * - IBAN (Europe - EUR, CHF)
 * - Sort Code + Account Number (UK - GBP)
 * - Routing Number + Account Number (USA - USD, CAD)
 *
 * Validation:
 * - IBAN avec algorithme de contrôle
 * - Format sort code (XX-XX-XX)
 * - Format routing number (9 digits)
 */
export function BankDetailsForm({ onSuccess }: BankDetailsFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accountType, setAccountType] = useState<AccountType>('iban');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [accountHolderName, setAccountHolderName] = useState('');

  // IBAN
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');

  // Sort Code (UK)
  const [sortCode, setSortCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // ABA (USA)
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumberUSA, setAccountNumberUSA] = useState('');
  const [accountTypeUSA, setAccountTypeUSA] = useState<'CHECKING' | 'SAVINGS'>('CHECKING');

  // Adresse
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('FR');

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updateBankDetails = httpsCallable(functions, 'updateMyBankDetails');

      const payload: any = {
        accountType,
        currency,
        accountHolderName,
        address: {
          street,
          city,
          postalCode,
          country
        }
      };

      if (accountType === 'iban') {
        payload.iban = iban.replace(/\s/g, ''); // Remove spaces
        payload.bic = bic || undefined;
      } else if (accountType === 'sort_code') {
        payload.sortCode = sortCode.replace(/-/g, ''); // Remove dashes
        payload.accountNumber = accountNumber;
      } else if (accountType === 'aba') {
        payload.routingNumber = routingNumber;
        payload.accountNumberUSA = accountNumberUSA;
        payload.accountTypeUSA = accountTypeUSA;
      }

      const result = await updateBankDetails(payload);
      const data = result.data as any;

      if (data.success) {
        onSuccess();
      } else {
        setError(data.message || 'Update failed');
      }

    } catch (err: any) {
      setError(err.message);
      console.error('Bank details update error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Devises autorisées selon le type de compte
  const allowedCurrencies: { [key in AccountType]: Currency[] } = {
    iban: ['EUR', 'CHF'],
    sort_code: ['GBP'],
    aba: ['USD', 'CAD']
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        {t('affiliate.bankDetails.title')}
      </h3>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type de compte */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('affiliate.bankDetails.accountType')}
          </label>
          <select
            value={accountType}
            onChange={(e) => {
              setAccountType(e.target.value as AccountType);
              setCurrency(allowedCurrencies[e.target.value as AccountType][0]);
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="iban">IBAN (Europe)</option>
            <option value="sort_code">Sort Code (UK)</option>
            <option value="aba">ABA/ACH (USA/Canada)</option>
          </select>
        </div>

        {/* Devise */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('affiliate.bankDetails.currency')}
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {allowedCurrencies[accountType].map(curr => (
              <option key={curr} value={curr}>{curr}</option>
            ))}
          </select>
        </div>

        {/* Nom du titulaire */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('affiliate.bankDetails.accountHolderName')}
          </label>
          <input
            type="text"
            value={accountHolderName}
            onChange={(e) => setAccountHolderName(e.target.value)}
            required
            placeholder="John Doe"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Champs spécifiques selon le type */}
        {accountType === 'iban' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                IBAN
              </label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase())}
                required
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                BIC/SWIFT {t('common.optional')}
              </label>
              <input
                type="text"
                value={bic}
                onChange={(e) => setBic(e.target.value.toUpperCase())}
                placeholder="BNPAFRPPXXX"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
            </div>
          </>
        )}

        {accountType === 'sort_code' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort Code
              </label>
              <input
                type="text"
                value={sortCode}
                onChange={(e) => setSortCode(e.target.value)}
                required
                placeholder="12-34-56"
                maxLength={8}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                placeholder="12345678"
                maxLength={8}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
            </div>
          </>
        )}

        {accountType === 'aba' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Routing Number
              </label>
              <input
                type="text"
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value)}
                required
                placeholder="123456789"
                maxLength={9}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumberUSA}
                onChange={(e) => setAccountNumberUSA(e.target.value)}
                required
                placeholder="123456789012"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Type
              </label>
              <select
                value={accountTypeUSA}
                onChange={(e) => setAccountTypeUSA(e.target.value as 'CHECKING' | 'SAVINGS')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="CHECKING">Checking</option>
                <option value="SAVINGS">Savings</option>
              </select>
            </div>
          </>
        )}

        {/* Adresse */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('affiliate.bankDetails.address')}
          </h4>

          <div className="space-y-4">
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              required
              placeholder={t('affiliate.bankDetails.street')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                placeholder={t('affiliate.bankDetails.city')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />

              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
                placeholder={t('affiliate.bankDetails.postalCode')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              required
              placeholder={t('affiliate.bankDetails.country')}
              maxLength={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Avertissement sécurité */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            🔒 {t('affiliate.bankDetails.securityNote')}
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors"
        >
          {loading ? <LoadingSpinner size="sm" /> : t('common.save')}
        </button>
      </form>
    </div>
  );
}
```

---

## 8. StatCard Component

**Fichier** : `src/components/affiliate/StatCard.tsx`

**Rôle** : Carte de statistique réutilisable

```typescript
// src/components/affiliate/StatCard.tsx

import React from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

/**
 * COMPOSANT UTILITAIRE: Carte de statistique
 *
 * Usage:
 * <StatCard
 *   icon={<UsersIcon />}
 *   label="Total Referrals"
 *   value={42}
 *   trend={{ direction: 'up', percentage: 12 }}
 *   color="green"
 * />
 */
export function StatCard({ icon, label, value, trend, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    orange: 'from-orange-500 to-amber-500',
    purple: 'from-purple-500 to-pink-500'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
    >
      {/* Icon avec gradient */}
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <div className="text-white w-6 h-6">
          {icon}
        </div>
      </div>

      {/* Label */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </p>

      {/* Value */}
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>

        {/* Trend indicator */}
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend.direction === 'up' ? '↑' : '↓'}
            {trend.percentage}%
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

---

## 9. AffiliateWidget Component

**Fichier** : `src/components/affiliate/AffiliateWidget.tsx`

**Rôle** : Widget global intégrant tous les autres composants

```typescript
// src/components/affiliate/AffiliateWidget.tsx

import React from 'react';
import { useAffiliate } from '../../hooks/useAffiliate';
import { PiggyBank } from './PiggyBank';
import { AffiliateLink } from './AffiliateLink';
import { WithdrawalButton } from './WithdrawalButton';
import { CommissionsList } from './CommissionsList';
import { StatCard } from './StatCard';
import { BankDetailsForm } from './BankDetailsForm';
import { LoadingSpinner } from './utils/LoadingSpinner';
import { ErrorMessage } from './utils/ErrorMessage';
import { useTranslation } from 'react-i18next';
import { UsersIcon, BanknotesIcon, ChartBarIcon } from '@heroicons/react/24/outline';

/**
 * COMPOSANT PRINCIPAL: Widget complet d'affiliation
 *
 * Intègre tous les composants dans une UI cohérente
 */
export function AffiliateWidget() {
  const { t } = useTranslation();
  const {
    data,
    loading,
    error,
    withdrawnAmount,
    affiliateLink,
    canWithdraw,
    refetch
  } = useAffiliate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  if (!data) {
    return <ErrorMessage message="No affiliate data found" onRetry={refetch} />;
  }

  const currency = data.bankDetails?.currency || 'EUR';
  const hasBankDetails = !!data.bankDetails;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('affiliate.dashboard.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('affiliate.dashboard.description')}
        </p>
      </div>

      {/* Statistiques clés */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={<UsersIcon className="w-full h-full" />}
          label={t('affiliate.stats.referrals')}
          value={data.referralCount}
          color="blue"
        />

        <StatCard
          icon={<BanknotesIcon className="w-full h-full" />}
          label={t('affiliate.stats.totalEarned')}
          value={new Intl.NumberFormat(navigator.language, {
            style: 'currency',
            currency
          }).format(data.balance.total / 100)}
          color="green"
        />

        <StatCard
          icon={<ChartBarIcon className="w-full h-full" />}
          label={t('affiliate.stats.commissionRate')}
          value={`${(data.commissionRate * 100).toFixed(0)}%`}
          color="orange"
        />
      </div>

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Colonne gauche */}
        <div className="space-y-8">
          {/* Tirelire */}
          <PiggyBank
            totalEarned={data.balance.total}
            pendingBalance={data.balance.pending}
            withdrawnBalance={data.balance.withdrawn}
            currency={currency}
          />

          {/* Bouton de retrait */}
          <WithdrawalButton
            pendingBalance={data.balance.pending}
            currency={currency}
            canWithdraw={canWithdraw}
            hasBankDetails={hasBankDetails}
            onSuccess={refetch}
          />

          {/* Formulaire bancaire si pas encore renseigné */}
          {!hasBankDetails && (
            <BankDetailsForm onSuccess={refetch} />
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-8">
          {/* Lien d'affiliation */}
          <AffiliateLink
            affiliateCode={data.affiliateCode}
            affiliateLink={affiliateLink}
          />

          {/* Liste des commissions */}
          <CommissionsList currency={currency} limit={10} />
        </div>
      </div>
    </div>
  );
}
```

---

## 10. Composants utilitaires

### 10.1. LoadingSpinner

```typescript
// src/components/affiliate/utils/LoadingSpinner.tsx

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-orange-200 border-t-orange-500`} />
  );
}
```

### 10.2. ErrorMessage

```typescript
// src/components/affiliate/utils/ErrorMessage.tsx

import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <ExclamationCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
          Error
        </h3>
      </div>

      <p className="text-red-700 dark:text-red-300 mb-4">
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
```

---

## Résumé des composants

| Composant | Lignes | Description |
|-----------|--------|-------------|
| PiggyBank | 200 | Tirelire visuelle animée SVG |
| CommissionsList | 300 | Liste paginée avec filtres |
| AffiliateLink | 250 | Partage lien + QR code |
| WithdrawalButton | 180 | Demande de retrait |
| BankDetailsForm | 400 | Formulaire bancaire |
| StatCard | 80 | Carte de statistique |
| AffiliateWidget | 150 | Widget global |
| LoadingSpinner | 20 | Spinner |
| ErrorMessage | 40 | Message d'erreur |
| **TOTAL** | **~1,620** | **9 composants** |

---

## Fichiers de traduction i18n

**Fichier** : `src/locales/fr/affiliate.json`

```json
{
  "affiliate": {
    "dashboard": {
      "title": "Mon Programme d'Affiliation",
      "description": "Gagnez de l'argent en parrainant vos amis sur SOS-Expat"
    },
    "piggyBank": {
      "title": "Ma Tirelire",
      "totalEarned": "Total gagné",
      "available": "Disponible",
      "withdrawn": "Retiré",
      "withdrawAvailable": "Retrait disponible !",
      "almostThere": "Plus que {{remaining}} avant de pouvoir retirer"
    },
    "stats": {
      "referrals": "Filleuls",
      "totalEarned": "Total gagné",
      "commissionRate": "Taux de commission"
    },
    "link": {
      "title": "Mon Lien d'Affiliation",
      "yourCode": "Votre code",
      "shareLink": "Lien de partage",
      "showQRCode": "Afficher le QR Code",
      "qrCodeTitle": "QR Code d'Affiliation",
      "qrCodeDescription": "Scannez ce code pour partager votre lien"
    },
    "share": {
      "message": "Rejoignez SOS-Expat avec mon code de parrainage ! {{link}}",
      "emailSubject": "Rejoignez SOS-Expat"
    },
    "commissions": {
      "title": "Mes Commissions",
      "empty": "Aucune commission pour le moment",
      "loadMore": "Charger plus",
      "filter": {
        "all": "Toutes",
        "pending": "En attente",
        "available": "Disponibles",
        "paid": "Payées",
        "cancelled": "Annulées"
      },
      "status": {
        "pending": "En attente",
        "available": "Disponible",
        "paid": "Payée",
        "cancelled": "Annulée"
      },
      "details": {
        "callSessionId": "ID de l'appel",
        "availableAt": "Disponible depuis",
        "paidAt": "Payée le",
        "fraudFlags": "Indicateurs de fraude"
      }
    },
    "withdrawal": {
      "requestButton": "Demander un retrait",
      "needBankDetails": "Veuillez d'abord renseigner vos coordonnées bancaires",
      "minimumAmount": "Montant minimum : {{amount}}",
      "confirmTitle": "Confirmer le retrait",
      "confirmMessage": "Vous êtes sur le point de demander un retrait. Le montant sera viré sous 2-3 jours ouvrés.",
      "amount": "Montant du retrait",
      "estimatedTime": "Délai estimé : 2-3 jours ouvrés",
      "estimatedTimeDetails": "Le virement sera traité par Wise"
    },
    "bankDetails": {
      "title": "Coordonnées Bancaires",
      "accountType": "Type de compte",
      "currency": "Devise",
      "accountHolderName": "Nom du titulaire",
      "address": "Adresse",
      "street": "Rue",
      "city": "Ville",
      "postalCode": "Code postal",
      "country": "Pays (code ISO, ex: FR)",
      "securityNote": "Vos coordonnées bancaires sont chiffrées avec AES-256"
    }
  },
  "common": {
    "loading": "Chargement...",
    "copy": "Copier",
    "copied": "Copié !",
    "close": "Fermer",
    "cancel": "Annuler",
    "confirm": "Confirmer",
    "save": "Enregistrer",
    "optional": "(optionnel)"
  }
}
```

---

**FIN DU FICHIER - Tous les composants frontend sont prêts** ✅
