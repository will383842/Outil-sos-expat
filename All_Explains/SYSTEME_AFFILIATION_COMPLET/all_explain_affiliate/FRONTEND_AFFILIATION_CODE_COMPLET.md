# FRONTEND AFFILIATION - CODE COMPLET
## Tous les fichiers React/TypeScript prêts à copier-coller

**Version:** 2.0
**Date:** 21 janvier 2026
**Framework:** React 18 + TypeScript + Tailwind CSS

---

# TABLE DES MATIÈRES

1. [Structure des Fichiers](#1-structure-des-fichiers)
2. [Types Frontend](#2-types-frontend)
3. [Hooks React](#3-hooks-react)
4. [Utils & API](#4-utils--api)
5. [Page Inscription (SignUp)](#5-page-inscription-signup)
6. [Page Dashboard Affilié](#6-page-dashboard-affilié)
7. [Page Coordonnées Bancaires](#7-page-coordonnées-bancaires)
8. [Composants Communs](#8-composants-communs)
9. [Page Admin](#9-page-admin)
10. [Routing & Navigation](#10-routing--navigation)

---

# 1. STRUCTURE DES FICHIERS

## 1.1 Arborescence à créer

```bash
cd sos/src

# Créer structure
mkdir -p features/affiliate/{types,hooks,components/{common,user,admin},pages/{user,admin},utils,api}

# Structure finale:
src/
├── features/
│   └── affiliate/
│       ├── types/
│       │   └── affiliate.types.ts
│       ├── hooks/
│       │   ├── useAffiliate.ts
│       │   ├── useAffiliateCommissions.ts
│       │   ├── useAffiliateWithdrawal.ts
│       │   └── useAffiliateAdmin.ts
│       ├── components/
│       │   ├── common/
│       │   │   ├── PiggyBank.tsx
│       │   │   ├── AffiliateLink.tsx
│       │   │   ├── CommissionCard.tsx
│       │   │   └── StatCard.tsx
│       │   ├── user/
│       │   │   ├── CommissionsList.tsx
│       │   │   ├── WithdrawalButton.tsx
│       │   │   ├── BankDetailsForm.tsx
│       │   │   └── ReferralStats.tsx
│       │   └── admin/
│       │       ├── AffiliatesTable.tsx
│       │       ├── PayoutsTable.tsx
│       │       ├── RateConfigForm.tsx
│       │       └── AnalyticsCharts.tsx
│       ├── pages/
│       │   ├── user/
│       │   │   ├── AffiliateAccountPage.tsx
│       │   │   └── AffiliateBankDetailsPage.tsx
│       │   └── admin/
│       │       ├── AffiliateAdminPage.tsx
│       │       ├── AffiliateDetailPage.tsx
│       │       └── AffiliatePayoutsPage.tsx
│       ├── utils/
│       │   ├── affiliateFormatter.ts
│       │   ├── affiliateValidation.ts
│       │   └── affiliateConstants.ts
│       └── api/
│           └── affiliateApi.ts
```

---

# 2. TYPES FRONTEND

## 2.1 Types Affilié

**Fichier:** `src/features/affiliate/types/affiliate.types.ts`

```typescript
/**
 * Types Frontend pour le système d'affiliation
 */

import { Timestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════════════
// USER AFFILIATE DATA
// ═══════════════════════════════════════════════════════════════════════════

export interface AffiliateData {
  affiliateCode: string;
  referredBy: string | null;
  affiliateCommissionRate: number;
  affiliateBalance: number;
  pendingAffiliateBalance: number;
  referralCount: number;
  bankDetails: BankDetails | null;
  pendingPayoutId: string | null;
  totalEarnings: number;
  lastWithdrawalAt: Timestamp | null;
  kycVerified: boolean;
  isSuspended: boolean;
}

export interface BankDetails {
  accountHolderName: string;
  accountType: 'iban' | 'sort_code' | 'aba';
  iban?: string;
  sortCode?: string;
  accountNumber?: string;
  routingNumber?: string;
  bic?: string;
  country: string;
  currency: string;
  verifiedAt: Timestamp | null;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  updatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMISSION
// ═══════════════════════════════════════════════════════════════════════════

export interface Commission {
  id: string;
  referrerId: string;
  referrerEmail: string;
  referrerName: string;
  refereeId: string;
  refereeEmail: string;
  refereeName: string;
  callSessionId: string;
  paymentId: string;
  paymentSource: 'stripe' | 'paypal';
  providerType: 'lawyer' | 'helper';
  connectionFee: number;
  commissionRate: number;
  commissionAmount: number;
  currency: 'EUR';
  status: 'pending' | 'available' | 'paid' | 'cancelled';
  payoutId: string | null;
  paidAt: Timestamp | null;
  fraudScore: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  availableAt: Timestamp | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYOUT
// ═══════════════════════════════════════════════════════════════════════════

export interface Payout {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amountRequested: number;
  sourceCurrency: 'EUR';
  amountConverted: number | null;
  targetCurrency: string;
  exchangeRate: number | null;
  wiseFee: number | null;
  amountReceived: number | null;
  wiseTransferId: string | null;
  wiseRecipientId: string | null;
  wiseQuoteId: string | null;
  wiseStatus: string | null;
  bankAccountHolder: string;
  bankAccountLast4: string;
  bankCountry: string;
  bankCurrency: string;
  commissionIds: string[];
  commissionCount: number;
  status: 'pending' | 'processing' | 'completed' | 'paid' | 'failed' | 'cancelled';
  failureReason: string | null;
  kycRequired: boolean;
  kycVerified: boolean;
  manualReviewRequired: boolean;
  requestedAt: Timestamp;
  completedAt: Timestamp | null;
  paidAt: Timestamp | null;
  failedAt: Timestamp | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export interface AffiliateConfig {
  currentCommissionRate: number;
  lawyerConnectionFee: number;
  helperConnectionFee: number;
  minimumWithdrawal: number;
  holdPeriodHours: number;
  maxMonthlyEarnings: number;
  maxYearlyEarnings: number;
  isActive: boolean;
  withdrawalsEnabled: boolean;
  supportedCurrencies: string[];
  rateHistory: RateHistoryEntry[];
}

export interface RateHistoryEntry {
  rate: number;
  effectiveFrom: Timestamp;
  changedBy: string;
  changedByEmail: string;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API RESPONSES
// ═══════════════════════════════════════════════════════════════════════════

export interface WithdrawalResponse {
  success: boolean;
  payoutId: string;
  amount: number;
  message: string;
}

export interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalCommissions: number;
  totalCommissionsAmount: number;
  totalPayouts: number;
  totalPayoutsAmount: number;
  pendingPayouts: number;
  pendingPayoutsAmount: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORM DATA
// ═══════════════════════════════════════════════════════════════════════════

export interface BankDetailsFormData {
  accountHolderName: string;
  accountType: 'iban' | 'sort_code' | 'aba';
  country: string;
  currency: string;
  iban?: string;
  bic?: string;
  sortCode?: string;
  accountNumber?: string;
  routingNumber?: string;
}
```

---

# 3. HOOKS REACT

## 3.1 Hook useAffiliate

**Fichier:** `src/features/affiliate/hooks/useAffiliate.ts`

```typescript
/**
 * Hook principal pour les données d'affiliation
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { AffiliateData } from '../types/affiliate.types';

export function useAffiliate() {
  const { user } = useAuth();
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Écouter les changements en temps réel
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          setData({
            affiliateCode: userData.affiliateCode || '',
            referredBy: userData.referredBy || null,
            affiliateCommissionRate: userData.affiliateCommissionRate || 0,
            affiliateBalance: userData.affiliateBalance || 0,
            pendingAffiliateBalance: userData.pendingAffiliateBalance || 0,
            referralCount: userData.referralCount || 0,
            bankDetails: userData.bankDetails || null,
            pendingPayoutId: userData.pendingPayoutId || null,
            totalEarnings: userData.totalEarnings || 0,
            lastWithdrawalAt: userData.lastWithdrawalAt || null,
            kycVerified: userData.kycVerified || false,
            isSuspended: userData.isSuspended || false
          });
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching affiliate data:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Calculer montant retiré
  const withdrawnAmount = data
    ? data.affiliateBalance - data.pendingAffiliateBalance
    : 0;

  // Générer lien de parrainage
  const affiliateLink = data?.affiliateCode
    ? `${window.location.origin}/signup?code=${data.affiliateCode}`
    : '';

  // Vérifier si peut retirer
  const canWithdraw = data
    ? data.pendingAffiliateBalance >= 3000 && // Minimum 30€
      data.bankDetails !== null &&
      !data.pendingPayoutId &&
      !data.isSuspended
    : false;

  return {
    data,
    loading,
    error,
    withdrawnAmount,
    affiliateLink,
    canWithdraw
  };
}
```

## 3.2 Hook useAffiliateCommissions

**Fichier:** `src/features/affiliate/hooks/useAffiliateCommissions.ts`

```typescript
/**
 * Hook pour gérer les commissions
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Commission } from '../types/affiliate.types';

interface UseCommissionsOptions {
  limitCount?: number;
  status?: 'pending' | 'available' | 'paid' | 'cancelled';
}

export function useAffiliateCommissions(options: UseCommissionsOptions = {}) {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setCommissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Build query
    let q = query(
      collection(db, 'affiliate_commissions'),
      where('referrerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    // Filter by status
    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }

    // Limit results
    if (options.limitCount) {
      q = query(q, limit(options.limitCount));
    }

    // Subscribe to changes
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const commissionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Commission[];

        setCommissions(commissionsData);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching commissions:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, options.status, options.limitCount]);

  // Stats
  const stats = {
    total: commissions.length,
    totalAmount: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
    available: commissions.filter(c => c.status === 'available').length,
    availableAmount: commissions
      .filter(c => c.status === 'available')
      .reduce((sum, c) => sum + c.commissionAmount, 0),
    paid: commissions.filter(c => c.status === 'paid').length,
    paidAmount: commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0)
  };

  return {
    commissions,
    loading,
    error,
    stats
  };
}
```

## 3.3 Hook useAffiliateWithdrawal

**Fichier:** `src/features/affiliate/hooks/useAffiliateWithdrawal.ts`

```typescript
/**
 * Hook pour gérer les retraits
 */

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { WithdrawalResponse } from '../types/affiliate.types';
import { toast } from 'sonner';

export function useAffiliateWithdrawal() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const requestWithdrawal = async (): Promise<WithdrawalResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const withdrawFn = httpsCallable<{}, WithdrawalResponse>(
        functions,
        'requestAffiliateWithdrawal'
      );

      const result = await withdrawFn({});
      const response = result.data;

      toast.success(response.message || 'Retrait demandé avec succès');
      return response;

    } catch (err: any) {
      console.error('Withdrawal error:', err);
      const errorMessage = err.message || 'Erreur lors de la demande de retrait';
      setError(new Error(errorMessage));
      toast.error(errorMessage);
      return null;

    } finally {
      setLoading(false);
    }
  };

  return {
    requestWithdrawal,
    loading,
    error
  };
}
```

## 3.4 Hook useAffiliateAdmin

**Fichier:** `src/features/affiliate/hooks/useAffiliateAdmin.ts`

```typescript
/**
 * Hook pour l'administration du système d'affiliation
 */

import { useState, useEffect } from 'react';
import { doc, collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/config/firebase';
import { AffiliateConfig, AffiliateStats } from '../types/affiliate.types';
import { toast } from 'sonner';

export function useAffiliateAdmin() {
  const [config, setConfig] = useState<AffiliateConfig | null>(null);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Load config
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'affiliate_config', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          setConfig(snapshot.data() as AffiliateConfig);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const getStatsFn = httpsCallable<{}, AffiliateStats>(
          functions,
          'getAffiliateGlobalStats'
        );
        const result = await getStatsFn({});
        setStats(result.data);
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    };

    loadStats();
  }, []);

  // Update commission rate
  const updateRate = async (newRate: number, reason: string): Promise<boolean> => {
    if (!reason.trim()) {
      toast.error('Raison requise');
      return false;
    }

    setUpdating(true);

    try {
      const updateRateFn = httpsCallable(
        functions,
        'updateCommissionRate'
      );

      await updateRateFn({ newRate, reason });
      toast.success('Taux mis à jour avec succès');
      return true;

    } catch (err: any) {
      console.error('Update rate error:', err);
      toast.error(err.message || 'Erreur lors de la mise à jour');
      return false;

    } finally {
      setUpdating(false);
    }
  };

  return {
    config,
    stats,
    loading,
    updating,
    updateRate
  };
}
```

---

# 4. UTILS & API

## 4.1 Formatters

**Fichier:** `src/features/affiliate/utils/affiliateFormatter.ts`

```typescript
/**
 * Utilitaires de formatage
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Formate un montant en centimes vers EUR
 */
export function formatAmount(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency
  }).format(cents / 100);
}

/**
 * Formate un pourcentage
 */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/**
 * Formate une date
 */
export function formatDate(timestamp: Timestamp | null): string {
  if (!timestamp) return '-';

  return timestamp.toDate().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formate une date relative (il y a X jours)
 */
export function formatRelativeDate(timestamp: Timestamp): string {
  const now = new Date();
  const date = timestamp.toDate();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} ans`;
}

/**
 * Masque partiellement un IBAN
 */
export function maskIBAN(iban: string): string {
  if (!iban || iban.length < 4) return '****';
  return '****' + iban.slice(-4);
}

/**
 * Badge de statut commission
 */
export function getCommissionStatusBadge(status: string): {
  label: string;
  className: string;
} {
  const badges = {
    pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
    available: { label: 'Disponible', className: 'bg-green-100 text-green-800' },
    paid: { label: 'Retiré', className: 'bg-blue-100 text-blue-800' },
    cancelled: { label: 'Annulé', className: 'bg-red-100 text-red-800' }
  };

  return badges[status as keyof typeof badges] || badges.pending;
}

/**
 * Badge de statut payout
 */
export function getPayoutStatusBadge(status: string): {
  label: string;
  className: string;
} {
  const badges = {
    pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
    processing: { label: 'En cours', className: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Envoyé', className: 'bg-indigo-100 text-indigo-800' },
    paid: { label: 'Reçu', className: 'bg-green-100 text-green-800' },
    failed: { label: 'Échec', className: 'bg-red-100 text-red-800' },
    cancelled: { label: 'Annulé', className: 'bg-gray-100 text-gray-800' }
  };

  return badges[status as keyof typeof badges] || badges.pending;
}
```

## 4.2 Validation

**Fichier:** `src/features/affiliate/utils/affiliateValidation.ts`

```typescript
/**
 * Validation des formulaires
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Valide un IBAN
 */
export function validateIBAN(iban: string): boolean {
  const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/;
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  return ibanRegex.test(cleanIban) && cleanIban.length >= 15 && cleanIban.length <= 34;
}

/**
 * Valide un BIC/SWIFT
 */
export function validateBIC(bic: string): boolean {
  const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return bicRegex.test(bic.toUpperCase());
}

/**
 * Valide un Sort Code (UK)
 */
export function validateSortCode(sortCode: string): boolean {
  const sortCodeRegex = /^[0-9]{2}-[0-9]{2}-[0-9]{2}$/;
  return sortCodeRegex.test(sortCode);
}

/**
 * Valide un Account Number (UK)
 */
export function validateAccountNumber(accountNumber: string): boolean {
  return /^[0-9]{8}$/.test(accountNumber);
}

/**
 * Valide un Routing Number (US)
 */
export function validateRoutingNumber(routingNumber: string): boolean {
  return /^[0-9]{9}$/.test(routingNumber);
}

/**
 * Valide le formulaire de coordonnées bancaires
 */
export function validateBankDetailsForm(formData: any): ValidationResult {
  const errors: Record<string, string> = {};

  // Account Holder Name
  if (!formData.accountHolderName?.trim()) {
    errors.accountHolderName = 'Nom du titulaire requis';
  }

  // Country & Currency
  if (!formData.country) {
    errors.country = 'Pays requis';
  }

  if (!formData.currency) {
    errors.currency = 'Devise requise';
  }

  // Type-specific validation
  if (formData.accountType === 'iban') {
    if (!formData.iban?.trim()) {
      errors.iban = 'IBAN requis';
    } else if (!validateIBAN(formData.iban)) {
      errors.iban = 'IBAN invalide';
    }

    if (formData.bic && !validateBIC(formData.bic)) {
      errors.bic = 'BIC invalide';
    }
  }

  if (formData.accountType === 'sort_code') {
    if (!formData.sortCode?.trim()) {
      errors.sortCode = 'Sort Code requis';
    } else if (!validateSortCode(formData.sortCode)) {
      errors.sortCode = 'Sort Code invalide (format: 12-34-56)';
    }

    if (!formData.accountNumber?.trim()) {
      errors.accountNumber = 'Account Number requis';
    } else if (!validateAccountNumber(formData.accountNumber)) {
      errors.accountNumber = 'Account Number invalide (8 chiffres)';
    }
  }

  if (formData.accountType === 'aba') {
    if (!formData.routingNumber?.trim()) {
      errors.routingNumber = 'Routing Number requis';
    } else if (!validateRoutingNumber(formData.routingNumber)) {
      errors.routingNumber = 'Routing Number invalide (9 chiffres)';
    }

    if (!formData.accountNumber?.trim()) {
      errors.accountNumber = 'Account Number requis';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
```

## 4.3 Constantes

**Fichier:** `src/features/affiliate/utils/affiliateConstants.ts`

```typescript
/**
 * Constantes du système d'affiliation
 */

export const AFFILIATE_CONSTANTS = {
  // Montants
  MINIMUM_WITHDRAWAL: 3000, // 30€ en centimes
  LAWYER_FEE: 3500,        // 35€
  HELPER_FEE: 2500,        // 25€

  // Devises supportées
  SUPPORTED_CURRENCIES: ['EUR', 'USD', 'GBP', 'CHF', 'CAD'],

  // Pays supportés
  SUPPORTED_COUNTRIES: [
    { code: 'FR', name: 'France', currency: 'EUR' },
    { code: 'DE', name: 'Allemagne', currency: 'EUR' },
    { code: 'GB', name: 'Royaume-Uni', currency: 'GBP' },
    { code: 'US', name: 'États-Unis', currency: 'USD' },
    { code: 'CH', name: 'Suisse', currency: 'CHF' },
    { code: 'CA', name: 'Canada', currency: 'CAD' },
    { code: 'BE', name: 'Belgique', currency: 'EUR' },
    { code: 'ES', name: 'Espagne', currency: 'EUR' },
    { code: 'IT', name: 'Italie', currency: 'EUR' },
    { code: 'PT', name: 'Portugal', currency: 'EUR' }
  ],

  // Types de compte
  ACCOUNT_TYPES: [
    { value: 'iban', label: 'IBAN (Europe)', region: 'EU' },
    { value: 'sort_code', label: 'Sort Code (UK)', region: 'UK' },
    { value: 'aba', label: 'Routing Number (US)', region: 'US' }
  ],

  // Routes
  ROUTES: {
    AFFILIATE_ACCOUNT: '/dashboard/affiliate',
    BANK_DETAILS: '/dashboard/affiliate/bank-details',
    ADMIN_DASHBOARD: '/admin/affiliate',
    ADMIN_DETAIL: '/admin/affiliate/:userId',
    ADMIN_PAYOUTS: '/admin/affiliate/payouts'
  }
};
```

## 4.4 API Wrapper

**Fichier:** `src/features/affiliate/api/affiliateApi.ts`

```typescript
/**
 * Wrapper pour les appels aux Cloud Functions
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import {
  WithdrawalResponse,
  AffiliateStats,
  BankDetailsFormData
} from '../types/affiliate.types';

/**
 * Demande de retrait
 */
export async function requestWithdrawal(): Promise<WithdrawalResponse> {
  const fn = httpsCallable<{}, WithdrawalResponse>(
    functions,
    'requestAffiliateWithdrawal'
  );
  const result = await fn({});
  return result.data;
}

/**
 * Mise à jour coordonnées bancaires
 */
export async function updateBankDetails(
  bankDetails: BankDetailsFormData
): Promise<void> {
  const fn = httpsCallable<BankDetailsFormData, void>(
    functions,
    'updateAffiliateBankDetails'
  );
  await fn(bankDetails);
}

/**
 * Obtenir stats globales (Admin)
 */
export async function getAffiliateStats(): Promise<AffiliateStats> {
  const fn = httpsCallable<{}, AffiliateStats>(
    functions,
    'getAffiliateGlobalStats'
  );
  const result = await fn({});
  return result.data;
}

/**
 * Mettre à jour le taux de commission (Admin)
 */
export async function updateCommissionRate(
  newRate: number,
  reason: string
): Promise<void> {
  const fn = httpsCallable<{ newRate: number; reason: string }, void>(
    functions,
    'updateCommissionRate'
  );
  await fn({ newRate, reason });
}

/**
 * Approuver un payout (Admin)
 */
export async function approveWithdrawal(payoutId: string): Promise<void> {
  const fn = httpsCallable<{ payoutId: string }, void>(
    functions,
    'approveAffiliateWithdrawal'
  );
  await fn({ payoutId });
}
```

---

# 5. PAGE INSCRIPTION (SIGNUP)

## 5.1 Modification SignUp.tsx

**Fichier:** `src/pages/auth/SignUp.tsx` (MODIFIER fichier existant)

```typescript
/**
 * Page d'inscription avec capture du code de parrainage
 * MODIFICATION du fichier existant
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { toast } from 'sonner';

export default function SignUp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // NOUVEAU: Capturer code de parrainage depuis URL
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Vérifier URL: /signup?code=abc123
    const code = searchParams.get('code');

    if (code) {
      setReferralCode(code);
      // Sauvegarder en localStorage (au cas où user rafraîchit la page)
      localStorage.setItem('pendingReferralCode', code);
      console.log('Code de parrainage capturé:', code);
    } else {
      // Vérifier si code sauvegardé en localStorage
      const storedCode = localStorage.getItem('pendingReferralCode');
      if (storedCode) {
        setReferralCode(storedCode);
        console.log('Code de parrainage récupéré du localStorage:', storedCode);
      }
    }
  }, [searchParams]);

  // ═══════════════════════════════════════════════════════════════════
  // Fonction d'inscription (MODIFIER pour inclure referralCode)
  // ═══════════════════════════════════════════════════════════════════

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const role = formData.get('role') as string;

    try {
      // 1. Créer compte Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Créer document Firestore avec pendingReferralCode
      await setDoc(doc(db, 'users', user.uid), {
        email,
        firstName,
        lastName,
        role,
        // NOUVEAU: Inclure code de parrainage
        pendingReferralCode: referralCode, // Sera traité par onUserCreate trigger
        createdAt: new Date(),
        // ... autres champs existants
      });

      // 3. Nettoyer localStorage
      localStorage.removeItem('pendingReferralCode');

      toast.success('Compte créé avec succès !');
      navigate('/dashboard');

    } catch (error: any) {
      console.error('Erreur inscription:', error);
      toast.error(error.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* NOUVEAU: Banner code parrainage */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {referralCode && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-green-800 font-medium">
                Vous avez été invité par un membre SOS-Expat !
              </p>
              <p className="text-green-600 text-sm mt-1">
                Code de parrainage: <span className="font-mono font-bold">{referralCode}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Formulaire d'inscription (EXISTANT) */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Prénom</label>
          <input
            name="firstName"
            type="text"
            placeholder="Votre prénom"
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nom</label>
          <input
            name="lastName"
            type="text"
            placeholder="Votre nom"
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            name="email"
            type="email"
            placeholder="votre@email.com"
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mot de passe</label>
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Je suis...</label>
          <select
            name="role"
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sélectionnez</option>
            <option value="client">Un expatrié / voyageur</option>
            <option value="provider">Un professionnel (avocat/helper)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Inscription en cours...' : 'S\'inscrire'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-4">
        Déjà un compte ?{' '}
        <a href="/login" className="text-blue-600 hover:underline">
          Se connecter
        </a>
      </p>
    </div>
  );
}
```

---

# 6. PAGE DASHBOARD AFFILIÉ

## 6.1 Page Dashboard Complète

**Fichier:** `src/features/affiliate/pages/user/AffiliateAccountPage.tsx`

```typescript
/**
 * Page Dashboard Affilié avec Tirelire
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Users, Euro, Wallet, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAffiliate } from '../../hooks/useAffiliate';
import { useAffiliateCommissions } from '../../hooks/useAffiliateCommissions';
import { useAffiliateWithdrawal } from '../../hooks/useAffiliateWithdrawal';
import { PiggyBank } from '../../components/common/PiggyBank';
import { AffiliateLink } from '../../components/common/AffiliateLink';
import { CommissionsList } from '../../components/user/CommissionsList';
import { StatCard } from '../../components/common/StatCard';
import { formatAmount, formatRate } from '../../utils/affiliateFormatter';

export default function AffiliateAccountPage() {
  const navigate = useNavigate();
  const { data, loading, withdrawnAmount, affiliateLink, canWithdraw } = useAffiliate();
  const { commissions, stats } = useAffiliateCommissions({ limitCount: 50 });
  const { requestWithdrawal, loading: withdrawing } = useAffiliateWithdrawal();

  // ═══════════════════════════════════════════════════════════════════
  // Handlers
  // ═══════════════════════════════════════════════════════════════════

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateLink);
    toast.success('Lien copié !');
  };

  const handleWithdraw = async () => {
    if (!canWithdraw) {
      if (!data?.bankDetails) {
        toast.error('Configurez vos coordonnées bancaires d\'abord');
        navigate('/dashboard/affiliate/bank-details');
        return;
      }
      toast.error('Vérifiez les conditions de retrait');
      return;
    }

    const confirmed = window.confirm(
      `Confirmer le retrait de ${formatAmount(data!.pendingAffiliateBalance)} ?`
    );

    if (!confirmed) return;

    const result = await requestWithdrawal();
    if (result) {
      toast.success('Retrait demandé avec succès. Vous serez notifié par email.');
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // Loading
  // ═══════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-600">Données d'affiliation non disponibles</p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Header avec lien de parrainage */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Programme d'Affiliation</h1>
        <p className="text-blue-100 mb-6">
          Gagnez {formatRate(data.affiliateCommissionRate)} sur chaque appel de vos filleuls !
        </p>

        <AffiliateLink
          link={affiliateLink}
          code={data.affiliateCode}
          onCopy={handleCopyLink}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Tirelire */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <PiggyBank
        totalEarned={data.affiliateBalance}
        withdrawn={withdrawnAmount}
        available={data.pendingAffiliateBalance}
        hasBankDetails={!!data.bankDetails}
        pendingPayoutId={data.pendingPayoutId}
        isSuspended={data.isSuspended}
        canWithdraw={canWithdraw}
        onWithdraw={handleWithdraw}
        onConfigureBankDetails={() => navigate('/dashboard/affiliate/bank-details')}
        withdrawing={withdrawing}
      />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Stats rapides */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="text-blue-600" size={24} />}
          label="Filleuls"
          value={data.referralCount}
        />

        <StatCard
          icon={<Euro className="text-green-600" size={24} />}
          label="Commissions"
          value={stats.total}
        />

        <StatCard
          icon={<TrendingUp className="text-purple-600" size={24} />}
          label="Mon taux"
          value={formatRate(data.affiliateCommissionRate)}
        />

        <StatCard
          icon={<Wallet className="text-amber-600" size={24} />}
          label="Total gagné"
          value={formatAmount(data.affiliateBalance)}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Historique commissions */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <CommissionsList commissions={commissions} />
    </div>
  );
}
```

---

**[Suite dans le prochain message car limite de caractères atteinte]**

Le fichier est déjà très long. Voulez-vous que je:
1. Continue dans ce même fichier avec les composants restants ?
2. Crée un second fichier `FRONTEND_AFFILIATION_CODE_COMPLET_PART2.md` ?

Je recommande l'option 2 pour garder les fichiers lisibles. Qu'en pensez-vous ?