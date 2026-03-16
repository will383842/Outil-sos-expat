/**
 * usePublicCommissionRates — Fetches commission rates from Firestore
 *
 * Reads {role}_config/current to get admin-configured commission values.
 * Used by landing pages to display dynamic rates instead of hardcoded amounts.
 * 5-minute in-memory cache to avoid repeated Firestore reads.
 *
 * Firestore rules must allow public read on {role}_config/current.
 */

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

// ============================================================================
// TYPES
// ============================================================================

export interface CommissionRates {
  // Per-call client commissions (cents)
  clientCallLawyer: number;   // e.g. 500 = $5
  clientCallExpat: number;    // e.g. 300 = $3

  // Per-call provider recruitment commissions (cents)
  providerCallLawyer: number; // e.g. 500 = $5
  providerCallExpat: number;  // e.g. 300 = $3

  // MLM network commissions (chatter only, cents)
  n1CallAmount: number;       // e.g. 100 = $1
  n2CallAmount: number;       // e.g. 50 = $0.50

  // Withdrawal
  minimumWithdrawal: number;  // e.g. 3000 = $30

  // Duration
  recruitmentLinkDurationMonths: number; // e.g. 6

  // Client discount
  clientDiscountType: 'percent' | 'fixed'; // percent = %, fixed = $ amount
  clientDiscountPercent: number;  // e.g. 5 (5%)
  clientDiscountAmount: number;   // e.g. 500 ($5 in cents)

  // Formatted helpers (dollars)
  clientCallRange: string;      // e.g. "3-5" (min-max of lawyer/expat)
  clientCallMax: number;        // e.g. 5 (dollars, max of lawyer/expat)
  providerCall: number;         // e.g. 5 (dollars, lawyer rate)
  providerCallExp: number;      // e.g. 3 (dollars, expat rate)
  providerCallRange: string;    // e.g. "3-5" or "5" (min-max of lawyer/expat recruitment)
  providerCallMax: number;      // e.g. 5 (dollars, max of recruitment rates)
  n1: number;                   // e.g. 1 (dollars)
  n2: number;                   // e.g. 0.5 (dollars)
  minWithdrawal: number;        // e.g. 30 (dollars)
  linkDuration: number;         // e.g. 6 (months)
  discount: number;             // e.g. 5 (5% or $5 depending on type)
  discountLabel: string;        // e.g. "5%" or "5$"
}

type RoleConfigCollection = 'chatter_config' | 'influencer_config' | 'blogger_config' | 'group_admin_config';

const ROLE_COLLECTION_MAP: Record<string, RoleConfigCollection> = {
  chatter: 'chatter_config',
  influencer: 'influencer_config',
  blogger: 'blogger_config',
  groupadmin: 'group_admin_config',
  groupAdmin: 'group_admin_config',
};

// ============================================================================
// DEFAULTS — Used as fallback when Firestore doc doesn't exist or fetch fails
// Must match backend types.ts defaults
// ============================================================================

const CHATTER_DEFAULTS: CommissionRates = buildRates({
  clientCallLawyer: 500, clientCallExpat: 300,
  providerCallLawyer: 500, providerCallExpat: 300,
  n1CallAmount: 100, n2CallAmount: 50,
  minimumWithdrawal: 3000, recruitmentLinkDurationMonths: 6,
  clientDiscountType: 'fixed', clientDiscountPercent: 0, clientDiscountAmount: 500,
});

const BLOGGER_DEFAULTS: CommissionRates = buildRates({
  clientCallLawyer: 500, clientCallExpat: 300,
  providerCallLawyer: 500, providerCallExpat: 300,
  n1CallAmount: 0, n2CallAmount: 0,
  minimumWithdrawal: 3000, recruitmentLinkDurationMonths: 6,
  clientDiscountType: 'fixed', clientDiscountPercent: 0, clientDiscountAmount: 500,
});

const INFLUENCER_DEFAULTS: CommissionRates = buildRates({
  clientCallLawyer: 500, clientCallExpat: 300,
  providerCallLawyer: 500, providerCallExpat: 300,
  n1CallAmount: 0, n2CallAmount: 0,
  minimumWithdrawal: 3000, recruitmentLinkDurationMonths: 6,
  clientDiscountType: 'fixed', clientDiscountPercent: 5, clientDiscountAmount: 500,
});

const GROUPADMIN_DEFAULTS: CommissionRates = buildRates({
  clientCallLawyer: 500, clientCallExpat: 300,
  providerCallLawyer: 500, providerCallExpat: 300,
  n1CallAmount: 100, n2CallAmount: 50,
  minimumWithdrawal: 3000, recruitmentLinkDurationMonths: 6,
  clientDiscountType: 'fixed', clientDiscountPercent: 0, clientDiscountAmount: 500,
});

const DEFAULTS_MAP: Record<string, CommissionRates> = {
  chatter: CHATTER_DEFAULTS,
  influencer: INFLUENCER_DEFAULTS,
  blogger: BLOGGER_DEFAULTS,
  groupadmin: GROUPADMIN_DEFAULTS,
  groupAdmin: GROUPADMIN_DEFAULTS,
};

// ============================================================================
// HELPERS
// ============================================================================

interface RawRates {
  clientCallLawyer: number;
  clientCallExpat: number;
  providerCallLawyer: number;
  providerCallExpat: number;
  n1CallAmount: number;
  n2CallAmount: number;
  minimumWithdrawal: number;
  recruitmentLinkDurationMonths: number;
  clientDiscountType: 'percent' | 'fixed';
  clientDiscountPercent: number;
  clientDiscountAmount: number;
}

function buildRates(raw: RawRates): CommissionRates {
  const minClient = Math.min(raw.clientCallLawyer, raw.clientCallExpat);
  const maxClient = Math.max(raw.clientCallLawyer, raw.clientCallExpat);
  const minDollars = minClient / 100;
  const maxDollars = maxClient / 100;

  // Discount: read type from config — supports both % and $
  const isFixed = raw.clientDiscountType === 'fixed';
  const discountValue = isFixed
    ? raw.clientDiscountAmount / 100  // cents → dollars
    : raw.clientDiscountPercent;       // already a percentage
  const discountLabel = isFixed
    ? `${raw.clientDiscountAmount / 100}$`
    : `${raw.clientDiscountPercent}%`;

  const provLawyer = raw.providerCallLawyer / 100;
  const provExpat = raw.providerCallExpat / 100;
  const provMin = Math.min(provLawyer, provExpat);
  const provMax = Math.max(provLawyer, provExpat);

  return {
    ...raw,
    clientCallRange: minDollars === maxDollars ? `${maxDollars}` : `${minDollars}-${maxDollars}`,
    clientCallMax: maxDollars,
    providerCall: provLawyer,
    providerCallExp: provExpat,
    providerCallRange: provMin === provMax ? `${provMax}` : `${provMin}-${provMax}`,
    providerCallMax: provMax,
    n1: raw.n1CallAmount / 100,
    n2: raw.n2CallAmount / 100,
    minWithdrawal: raw.minimumWithdrawal / 100,
    linkDuration: raw.recruitmentLinkDurationMonths,
    discount: discountValue,
    discountLabel,
  };
}

/** Extract rates from a Firestore config document (field names vary per role) */
function extractRatesFromDoc(role: string, data: Record<string, any>): RawRates {
  if (role === 'chatter') {
    return {
      clientCallLawyer: data.commissionClientCallAmountLawyer ?? data.commissionClientCallAmount ?? 500,
      clientCallExpat: data.commissionClientCallAmountExpat ?? data.commissionClientCallAmount ?? 300,
      providerCallLawyer: data.commissionProviderCallAmountLawyer ?? data.commissionProviderCallAmount ?? 500,
      providerCallExpat: data.commissionProviderCallAmountExpat ?? 300,
      n1CallAmount: data.commissionN1CallAmount ?? 100,
      n2CallAmount: data.commissionN2CallAmount ?? 50,
      minimumWithdrawal: data.minimumWithdrawalAmount ?? 3000,
      recruitmentLinkDurationMonths: data.recruitmentLinkDurationMonths ?? 6,
      clientDiscountType: data.clientDiscountType ?? 'fixed',
      clientDiscountPercent: data.clientDiscountPercent ?? 5,
      clientDiscountAmount: data.clientDiscountAmount ?? 500,
    };
  }

  // Blogger, Influencer, GroupAdmin use similar field names
  // Legacy fields: commissionClientAmount / commissionRecruitmentAmount (single value, no lawyer/expat split)
  const legacyClient = data.commissionClientAmount;
  const legacyRecruitment = data.commissionRecruitmentAmount;
  return {
    clientCallLawyer: data.commissionClientAmountLawyer ?? data.commissionClientCallAmountLawyer ?? legacyClient ?? 500,
    clientCallExpat: data.commissionClientAmountExpat ?? data.commissionClientCallAmountExpat ?? legacyClient ?? 300,
    providerCallLawyer: data.commissionRecruitmentAmountLawyer ?? data.commissionProviderCallAmountLawyer ?? legacyRecruitment ?? 500,
    providerCallExpat: data.commissionRecruitmentAmountExpat ?? data.commissionProviderCallAmountExpat ?? legacyRecruitment ?? 300,
    n1CallAmount: data.commissionN1CallAmount ?? 0,
    n2CallAmount: data.commissionN2CallAmount ?? 0,
    minimumWithdrawal: data.minimumWithdrawalAmount ?? 3000,
    recruitmentLinkDurationMonths: data.recruitmentLinkDurationMonths ?? 6,
    clientDiscountType: data.clientDiscountType ?? 'fixed',
    clientDiscountPercent: data.clientDiscountPercent ?? 5,
    clientDiscountAmount: data.clientDiscountAmount ?? 500,
  };
}

// ============================================================================
// CACHE
// ============================================================================

const cache = new Map<string, { data: CommissionRates; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// HOOK
// ============================================================================

export function usePublicCommissionRates(role: string): { rates: CommissionRates; isLoading: boolean } {
  const defaults = DEFAULTS_MAP[role] || CHATTER_DEFAULTS;
  const [rates, setRates] = useState<CommissionRates>(defaults);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const collection = ROLE_COLLECTION_MAP[role];
    if (!collection) {
      setRates(defaults);
      return;
    }

    const cacheKey = `commission_${role}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setRates(cached.data);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getDoc(doc(db, collection, 'current'))
      .then(snap => {
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data();
          const raw = extractRatesFromDoc(role, data);
          const resolved = buildRates(raw);
          cache.set(cacheKey, { data: resolved, ts: Date.now() });
          setRates(resolved);
        } else {
          cache.set(cacheKey, { data: defaults, ts: Date.now() });
          setRates(defaults);
        }
      })
      .catch(() => {
        if (!cancelled) setRates(defaults);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [role]);

  return { rates, isLoading };
}
