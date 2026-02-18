/**
 * useAffiliate Hook
 *
 * React hook for managing affiliate data and operations.
 * Provides:
 * - Affiliate data fetching
 * - Commission history
 * - Payout requests
 * - Bank details management
 */

import { useState, useEffect, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { getFirestore, collection, doc, query, where, orderBy, limit, onSnapshot, Timestamp, DocumentSnapshot } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { functionsWest2 } from "../config/firebase";
import {
  AffiliateData,
  AffiliateCommission,
  AffiliatePayout,
  Referral,
  BankDetailsInput,
  WithdrawalRequest,
  WithdrawalResponse,
  CommissionStatus,
} from "../types/affiliate";

// ============================================================================
// TYPES
// ============================================================================

interface UseAffiliateReturn {
  // Data
  affiliateData: AffiliateData | null;
  commissions: AffiliateCommission[];
  payouts: AffiliatePayout[];
  referrals: Referral[];

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshData: () => Promise<void>;
  updateBankDetails: (bankDetails: BankDetailsInput) => Promise<{ success: boolean; message: string }>;
  requestWithdrawal: (request?: WithdrawalRequest) => Promise<WithdrawalResponse>;

  // Computed
  shareUrl: string;
  canWithdraw: boolean;
  minimumWithdrawal: number;
}

interface UseAffiliateCommissionsReturn {
  commissions: AffiliateCommission[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  filterByStatus: (status: CommissionStatus | "all") => void;
  currentFilter: CommissionStatus | "all";
}

interface UseAffiliatePayoutsReturn {
  payouts: AffiliatePayout[];
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useAffiliate(): UseAffiliateReturn {
  const { user } = useAuth();
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const functions = functionsWest2;
  const db = getFirestore();

  // Fetch affiliate data
  const refreshData = useCallback(async () => {
    if (!user?.uid) {
      setAffiliateData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const getMyAffiliateDataFn = httpsCallable<void, AffiliateData>(
        functions,
        "getMyAffiliateData"
      );

      const result = await getMyAffiliateDataFn();
      setAffiliateData(result.data);
    } catch (err) {
      console.error("[useAffiliate] Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch affiliate data");
      setAffiliateData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, functions]);

  // Update bank details
  const updateBankDetails = useCallback(
    async (bankDetails: BankDetailsInput): Promise<{ success: boolean; message: string }> => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const updateBankDetailsFn = httpsCallable<BankDetailsInput, { success: boolean; message: string }>(
        functions,
        "updateBankDetails"
      );

      const result = await updateBankDetailsFn(bankDetails);
      await refreshData(); // Refresh data after update
      return result.data;
    },
    [user?.uid, functions, refreshData]
  );

  // Request withdrawal
  const requestWithdrawal = useCallback(
    async (request?: WithdrawalRequest): Promise<WithdrawalResponse> => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const requestWithdrawalFn = httpsCallable<WithdrawalRequest | undefined, WithdrawalResponse>(
        functions,
        "requestWithdrawal"
      );

      const result = await requestWithdrawalFn(request);
      await refreshData(); // Refresh data after withdrawal
      return result.data;
    },
    [user?.uid, functions, refreshData]
  );

  // Subscribe to commissions
  useEffect(() => {
    if (!user?.uid) return;

    const commissionsQuery = query(
      collection(db, "affiliate_commissions"),
      where("referrerId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      commissionsQuery,
      (snapshot) => {
        const items: AffiliateCommission[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || "",
            availableAt: data.availableAt?.toDate?.()?.toISOString() || null,
            paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
          } as AffiliateCommission;
        });
        setCommissions(items);
      },
      (err) => {
        console.error("[useAffiliate] Commissions subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, db]);

  // Subscribe to payouts
  useEffect(() => {
    if (!user?.uid) return;

    const payoutsQuery = query(
      collection(db, "affiliate_payouts"),
      where("userId", "==", user.uid),
      orderBy("requestedAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      payoutsQuery,
      (snapshot) => {
        const items: AffiliatePayout[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            requestedAt: data.requestedAt?.toDate?.()?.toISOString() || "",
            processedAt: data.processedAt?.toDate?.()?.toISOString() || undefined,
            completedAt: data.completedAt?.toDate?.()?.toISOString() || undefined,
            failedAt: data.failedAt?.toDate?.()?.toISOString() || undefined,
            estimatedArrival: data.estimatedArrival?.toDate?.()?.toISOString() || undefined,
          } as AffiliatePayout;
        });
        setPayouts(items);
      },
      (err) => {
        console.error("[useAffiliate] Payouts subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, db]);

  // Subscribe to referrals
  useEffect(() => {
    if (!user?.uid) return;

    const referralsQuery = query(
      collection(db, "referrals"),
      where("referrerId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      referralsQuery,
      (snapshot) => {
        const items: Referral[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
            firstActionAt: data.firstActionAt?.toDate?.()?.toISOString() || null,
          } as Referral;
        });
        setReferrals(items);
      },
      (err) => {
        console.error("[useAffiliate] Referrals subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, db]);

  // Initial fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Computed values
  const shareUrl = affiliateData?.affiliateCode
    ? `${window.location.origin}?ref=${affiliateData.affiliateCode}`
    : "";

  const minimumWithdrawal = 3000; // 30€ in cents (from default config)
  const canWithdraw =
    !!affiliateData &&
    affiliateData.availableBalance >= minimumWithdrawal &&
    affiliateData.hasBankDetails &&
    !affiliateData.pendingPayoutId;

  return {
    affiliateData,
    commissions,
    payouts,
    referrals,
    isLoading,
    error,
    refreshData,
    updateBankDetails,
    requestWithdrawal,
    shareUrl,
    canWithdraw,
    minimumWithdrawal,
  };
}

// ============================================================================
// ADMIN HOOK
// ============================================================================

import { AffiliateGlobalStats, AffiliateConfig } from "../types/affiliate";

interface UseAffiliateAdminReturn {
  globalStats: AffiliateGlobalStats | null;
  config: AffiliateConfig | null;
  pendingPayouts: AffiliatePayout[];
  isLoading: boolean;
  error: string | null;
  wiseConfigured: boolean;
  refreshStats: () => Promise<void>;
  refreshPayouts: () => Promise<void>;
  updateConfig: (config: Partial<AffiliateConfig>, reason: string) => Promise<void>;
  // Payout actions
  approvePayout: (payoutId: string, notes?: string) => Promise<{ success: boolean; message: string }>;
  rejectPayout: (payoutId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  processPayoutManual: (payoutId: string, transactionRef?: string, notes?: string) => Promise<{ success: boolean; message: string }>;
  processPayoutWise: (payoutId: string) => Promise<{ success: boolean; message: string; transferId?: number }>;
}

export function useAffiliateAdmin(): UseAffiliateAdminReturn {
  const { user } = useAuth();
  const [globalStats, setGlobalStats] = useState<AffiliateGlobalStats | null>(null);
  const [config, setConfig] = useState<AffiliateConfig | null>(null);
  const [pendingPayouts, setPendingPayouts] = useState<AffiliatePayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wiseConfigured, setWiseConfigured] = useState(false);

  const functions = functionsWest2;
  const db = getFirestore();

  // Fetch global stats
  const refreshStats = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      const getStatsFn = httpsCallable<void, AffiliateGlobalStats>(
        functions,
        "getAffiliateGlobalStats"
      );

      const result = await getStatsFn();
      setGlobalStats(result.data);
    } catch (err) {
      console.error("[useAffiliateAdmin] Error fetching stats:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, functions]);

  // Fetch config
  useEffect(() => {
    if (!user?.uid) return;

    const configDocRef = doc(db, "affiliate_config", "current");
    const unsubscribe = onSnapshot(
      configDocRef,
      (snapshot: DocumentSnapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setConfig({
            ...data,
            updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || "",
          } as AffiliateConfig);
        }
      },
      (error: Error) => {
        console.error("[useAffiliateAdmin] Config subscription error:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, db]);

  // Update config
  const updateConfig = useCallback(
    async (configUpdates: Partial<AffiliateConfig>, reason: string) => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const updateConfigFn = httpsCallable<
        { config: Partial<AffiliateConfig>; reason: string },
        { success: boolean; config: AffiliateConfig }
      >(functions, "adminUpdateAffiliateConfig");

      const result = await updateConfigFn({ config: configUpdates, reason });
      setConfig(result.data.config);
    },
    [user?.uid, functions]
  );

  // Fetch pending payouts
  const refreshPayouts = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const getPendingPayoutsFn = httpsCallable<
        void,
        { success: boolean; payouts: AffiliatePayout[]; wiseConfigured: boolean }
      >(functions, "adminGetPendingPayouts");

      const result = await getPendingPayoutsFn();
      setPendingPayouts(result.data.payouts || []);
      setWiseConfigured(result.data.wiseConfigured || false);
    } catch (err) {
      console.error("[useAffiliateAdmin] Error fetching payouts:", err);
    }
  }, [user?.uid, functions]);

  // Approve payout
  const approvePayout = useCallback(
    async (payoutId: string, notes?: string) => {
      const approveFn = httpsCallable<
        { payoutId: string; notes?: string },
        { success: boolean; message: string; wiseConfigured: boolean }
      >(functions, "adminApprovePayout");

      const result = await approveFn({ payoutId, notes });
      await refreshPayouts();
      return { success: result.data.success, message: result.data.message };
    },
    [functions, refreshPayouts]
  );

  // Reject payout
  const rejectPayout = useCallback(
    async (payoutId: string, reason: string) => {
      const rejectFn = httpsCallable<
        { payoutId: string; reason: string },
        { success: boolean; message: string }
      >(functions, "adminRejectPayout");

      const result = await rejectFn({ payoutId, reason });
      await refreshPayouts();
      return { success: result.data.success, message: result.data.message };
    },
    [functions, refreshPayouts]
  );

  // Process payout manually
  const processPayoutManual = useCallback(
    async (payoutId: string, transactionReference?: string, notes?: string) => {
      const processFn = httpsCallable<
        { payoutId: string; transactionReference?: string; notes?: string },
        { success: boolean; message: string }
      >(functions, "adminProcessPayoutManual");

      const result = await processFn({ payoutId, transactionReference, notes });
      await refreshPayouts();
      return { success: result.data.success, message: result.data.message };
    },
    [functions, refreshPayouts]
  );

  // Process payout via Wise
  const processPayoutWise = useCallback(
    async (payoutId: string) => {
      const processFn = httpsCallable<
        { payoutId: string },
        { success: boolean; message: string; transferId?: number }
      >(functions, "adminProcessPayoutWise");

      const result = await processFn({ payoutId });
      await refreshPayouts();
      return {
        success: result.data.success,
        message: result.data.message,
        transferId: result.data.transferId,
      };
    },
    [functions, refreshPayouts]
  );

  // Initial fetch
  useEffect(() => {
    refreshStats();
    refreshPayouts();
  }, [refreshStats, refreshPayouts]);

  return {
    globalStats,
    config,
    pendingPayouts,
    isLoading,
    error,
    wiseConfigured,
    refreshStats,
    refreshPayouts,
    updateConfig,
    approvePayout,
    rejectPayout,
    processPayoutManual,
    processPayoutWise,
  };
}

// ============================================================================
// REFERRAL CODE CAPTURE HOOK
// ============================================================================

import {
  storeReferralCode as storeCode,
  getStoredReferral as getStored,
  getStoredReferralCode as getCode,
  clearStoredReferral as clearStored,
  type StoredReferral,
} from "../utils/referralStorage";

interface ReferralTracking {
  code: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  capturedAt: string;
}

/**
 * Hook to capture and persist referral codes from URL
 * Should be called early in the app lifecycle
 */
export function useReferralCapture(): {
  referralCode: string | null;
  referralTracking: ReferralTracking | null;
  clearReferral: () => void;
} {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralTracking, setReferralTracking] = useState<ReferralTracking | null>(null);

  useEffect(() => {
    // Check URL for referral code
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref") || urlParams.get("code");

    if (refCode) {
      // Capture UTM parameters
      const tracking = {
        utmSource: urlParams.get("utm_source") || undefined,
        utmMedium: urlParams.get("utm_medium") || undefined,
        utmCampaign: urlParams.get("utm_campaign") || undefined,
        landingPage: window.location.pathname,
      };

      // Persist to localStorage via shared utility (30-day expiration)
      storeCode(refCode, 'client', 'client', tracking);

      const stored = getStored('client');
      setReferralCode(stored?.code ?? refCode.toUpperCase());
      setReferralTracking(stored ? {
        code: stored.code,
        utmSource: stored.utmSource,
        utmMedium: stored.utmMedium,
        utmCampaign: stored.utmCampaign,
        landingPage: stored.landingPage,
        capturedAt: stored.capturedAt,
      } : null);

      // Clean URL
      urlParams.delete("ref");
      urlParams.delete("code");
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    } else {
      // Check localStorage for existing code (returns null if expired)
      const stored = getStored('client');

      if (stored) {
        setReferralCode(stored.code);
        setReferralTracking({
          code: stored.code,
          utmSource: stored.utmSource,
          utmMedium: stored.utmMedium,
          utmCampaign: stored.utmCampaign,
          landingPage: stored.landingPage,
          capturedAt: stored.capturedAt,
        });
      }
    }
  }, []);

  const clearReferral = useCallback(() => {
    clearStored('client');
    setReferralCode(null);
    setReferralTracking(null);
  }, []);

  return {
    referralCode,
    referralTracking,
    clearReferral,
  };
}

/**
 * Get the stored referral code (for use in signup)
 */
export function getStoredReferralCode(): string | null {
  return getCode('client');
}

/**
 * Get the stored referral tracking (for use in signup)
 */
export function getStoredReferralTracking(): ReferralTracking | null {
  const stored = getStored('client');
  if (!stored) return null;
  return {
    code: stored.code,
    utmSource: stored.utmSource,
    utmMedium: stored.utmMedium,
    utmCampaign: stored.utmCampaign,
    landingPage: stored.landingPage,
    capturedAt: stored.capturedAt,
  };
}

/**
 * Clear stored referral (after successful signup)
 */
export function clearStoredReferral(): void {
  clearStored('client');
}
