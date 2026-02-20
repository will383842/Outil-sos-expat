/**
 * useInfluencer Hook
 *
 * React hook for managing influencer data and operations.
 * Provides:
 * - Influencer dashboard data fetching
 * - Commission history
 * - Withdrawal requests
 * - Profile management
 * - Leaderboard data
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { httpsCallable } from "firebase/functions";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { functionsWest2 } from "@/config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { getTranslatedRouteSlug } from "@/multilingual-system/core/routing/localeRoutes";
import {
  InfluencerDashboardData,
  InfluencerCommission,
  InfluencerWithdrawal,
  InfluencerNotification,
  InfluencerReferral,
  InfluencerLeaderboardData,
  RequestInfluencerWithdrawalInput,
  UpdateInfluencerProfileInput,
} from "../types/influencer";

// ============================================================================
// TYPES
// ============================================================================

interface UseInfluencerReturn {
  // Data
  dashboardData: InfluencerDashboardData | null;
  commissions: InfluencerCommission[];
  withdrawals: InfluencerWithdrawal[];
  notifications: InfluencerNotification[];
  referrals: InfluencerReferral[];
  leaderboard: InfluencerLeaderboardData | null;

  // State
  isLoading: boolean;
  error: string | null;
  isInfluencer: boolean;

  // Actions
  refreshDashboard: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  requestWithdrawal: (
    input: RequestInfluencerWithdrawalInput
  ) => Promise<{ success: boolean; withdrawalId?: string; message: string }>;
  updateProfile: (
    input: UpdateInfluencerProfileInput
  ) => Promise<{ success: boolean; message: string }>;
  markNotificationRead: (notificationId: string) => Promise<void>;

  // Computed
  clientShareUrl: string;
  recruitmentShareUrl: string;
  canWithdraw: boolean;
  minimumWithdrawal: number;
  totalBalance: number;
  clientDiscount: number;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useInfluencer(): UseInfluencerReturn {
  const { user } = useAuth();
  const { language } = useApp();
  const langCode = (language || "en") as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";
  const [dashboardData, setDashboardData] = useState<InfluencerDashboardData | null>(null);
  const [commissions, setCommissions] = useState<InfluencerCommission[]>([]);
  const [withdrawals, setWithdrawals] = useState<InfluencerWithdrawal[]>([]);
  const [notifications, setNotifications] = useState<InfluencerNotification[]>([]);
  const [referrals, setReferrals] = useState<InfluencerReferral[]>([]);
  const [leaderboard, setLeaderboard] = useState<InfluencerLeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const db = getFirestore();

  // Check if user is an influencer
  const isInfluencer = useMemo(() => {
    return !!dashboardData?.influencer?.status;
  }, [dashboardData]);

  // Fetch dashboard data
  const refreshDashboard = useCallback(async () => {
    if (!user?.uid) {
      setDashboardData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const getInfluencerDashboardFn = httpsCallable<void, InfluencerDashboardData>(
        functionsWest2,
        "getInfluencerDashboard"
      );

      const result = await getInfluencerDashboardFn();
      setDashboardData(result.data);
    } catch (err) {
      console.error("[useInfluencer] Error fetching dashboard:", err);
      // Check if error is "Influencer not found" - means user is not an influencer
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch influencer data";
      if (errorMessage.includes("not found")) {
        setDashboardData(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, functionsWest2]);

  // Fetch leaderboard data
  const refreshLeaderboard = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const getLeaderboardFn = httpsCallable<void, InfluencerLeaderboardData>(
        functionsWest2,
        "getInfluencerLeaderboard"
      );

      const result = await getLeaderboardFn();
      setLeaderboard(result.data);
    } catch (err) {
      console.error("[useInfluencer] Error fetching leaderboard:", err);
    }
  }, [user?.uid, functionsWest2]);

  /**
   * @deprecated This method is deprecated.
   * Use the centralized payment system instead:
   * - Hooks: @/hooks/usePayment (usePayment.requestWithdrawal)
   *
   * This method will be removed in a future version.
   */
  // Request withdrawal
  const requestWithdrawal = useCallback(
    async (
      input: RequestInfluencerWithdrawalInput
    ): Promise<{ success: boolean; withdrawalId?: string; message: string }> => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const requestWithdrawalFn = httpsCallable<
        RequestInfluencerWithdrawalInput,
        { success: boolean; withdrawalId: string; amount: number; message: string }
      >(functionsWest2, "influencerRequestWithdrawal");

      const result = await requestWithdrawalFn(input);
      await refreshDashboard();
      return {
        success: result.data.success,
        withdrawalId: result.data.withdrawalId,
        message: result.data.message,
      };
    },
    [user?.uid, functionsWest2, refreshDashboard]
  );

  // Update profile
  const updateProfile = useCallback(
    async (
      input: UpdateInfluencerProfileInput
    ): Promise<{ success: boolean; message: string }> => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const updateProfileFn = httpsCallable<
        UpdateInfluencerProfileInput,
        { success: boolean; message: string }
      >(functionsWest2, "updateInfluencerProfile");

      const result = await updateProfileFn(input);
      await refreshDashboard();
      return result.data;
    },
    [user?.uid, functionsWest2, refreshDashboard]
  );

  // Mark notification as read
  const markNotificationRead = useCallback(
    async (notificationId: string): Promise<void> => {
      if (!user?.uid) return;

      try {
        // Update directly in Firestore (allowed by rules)
        const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
        const notificationRef = doc(db, "influencer_notifications", notificationId);
        await updateDoc(notificationRef, {
          isRead: true,
          readAt: Timestamp.now(),
        });
      } catch (error) {
        console.error("[useInfluencer] Failed to mark notification as read:", error);
        // Silently fail - notification read status is not critical
      }
    },
    [user?.uid, db]
  );

  // Subscribe to commissions
  useEffect(() => {
    if (!user?.uid || !isInfluencer) return;

    const commissionsQuery = query(
      collection(db, "influencer_commissions"),
      where("influencerId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      commissionsQuery,
      (snapshot) => {
        const items: InfluencerCommission[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
            validatedAt: data.validatedAt?.toDate?.()?.toISOString() || null,
            availableAt: data.availableAt?.toDate?.()?.toISOString() || null,
            paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
          } as InfluencerCommission;
        });
        setCommissions(items);
      },
      (err) => {
        console.error("[useInfluencer] Commissions subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isInfluencer, db]);

  // Subscribe to withdrawals
  useEffect(() => {
    if (!user?.uid || !isInfluencer) return;

    const withdrawalsQuery = query(
      collection(db, "influencer_withdrawals"),
      where("influencerId", "==", user.uid),
      orderBy("requestedAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      withdrawalsQuery,
      (snapshot) => {
        const items: InfluencerWithdrawal[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            requestedAt: data.requestedAt?.toDate?.()?.toISOString() || "",
            processedAt: data.processedAt?.toDate?.()?.toISOString() || undefined,
            completedAt: data.completedAt?.toDate?.()?.toISOString() || undefined,
            rejectedAt: data.rejectedAt?.toDate?.()?.toISOString() || undefined,
            failedAt: data.failedAt?.toDate?.()?.toISOString() || undefined,
          } as InfluencerWithdrawal;
        });
        setWithdrawals(items);
      },
      (err) => {
        console.error("[useInfluencer] Withdrawals subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isInfluencer, db]);

  // Subscribe to notifications
  useEffect(() => {
    if (!user?.uid || !isInfluencer) return;

    const notificationsQuery = query(
      collection(db, "influencer_notifications"),
      where("influencerId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const items: InfluencerNotification[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          } as InfluencerNotification;
        });
        setNotifications(items);
      },
      (err) => {
        console.error("[useInfluencer] Notifications subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isInfluencer, db]);

  // Subscribe to referrals (recruited providers)
  useEffect(() => {
    if (!user?.uid || !isInfluencer) return;

    const referralsQuery = query(
      collection(db, "influencer_referrals"),
      where("influencerId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      referralsQuery,
      (snapshot) => {
        const items: InfluencerReferral[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
            commissionWindowEnd: data.commissionWindowEnd?.toDate?.()?.toISOString() || "",
          } as InfluencerReferral;
        });
        setReferrals(items);
      },
      (err) => {
        console.error("[useInfluencer] Referrals subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isInfluencer, db]);

  // Initial fetch
  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // Fetch leaderboard when dashboard is loaded
  useEffect(() => {
    if (isInfluencer) {
      refreshLeaderboard();
    }
  }, [isInfluencer, refreshLeaderboard]);

  // Computed values
  const clientShareUrl = useMemo(() => {
    if (!dashboardData?.influencer?.affiliateCodeClient) return "";
    return `https://sos-expat.com/ref/i/${dashboardData.influencer.affiliateCodeClient}`;
  }, [dashboardData]);

  const recruitmentShareUrl = useMemo(() => {
    if (!dashboardData?.influencer?.affiliateCodeRecruitment) return "";
    const providerRoute = getTranslatedRouteSlug("become-provider" as any, langCode);
    return `https://sos-expat.com/rec/i/${dashboardData.influencer.affiliateCodeRecruitment}`;
  }, [dashboardData, langCode]);

  const minimumWithdrawal = dashboardData?.config?.minimumWithdrawalAmount || 5000; // $50 default

  const canWithdraw = useMemo(() => {
    if (!dashboardData) return false;
    const { influencer } = dashboardData;
    return (
      influencer.status === "active" &&
      influencer.availableBalance >= minimumWithdrawal &&
      !influencer.pendingWithdrawalId
    );
  }, [dashboardData, minimumWithdrawal]);

  const totalBalance = useMemo(() => {
    if (!dashboardData) return 0;
    const { influencer } = dashboardData;
    return influencer.availableBalance + influencer.pendingBalance + influencer.validatedBalance;
  }, [dashboardData]);

  const clientDiscount = dashboardData?.config?.clientDiscountPercent ?? 0;

  return {
    dashboardData,
    commissions,
    withdrawals,
    notifications,
    referrals,
    leaderboard,
    isLoading,
    error,
    isInfluencer,
    refreshDashboard,
    refreshLeaderboard,
    requestWithdrawal,
    updateProfile,
    markNotificationRead,
    clientShareUrl,
    recruitmentShareUrl,
    canWithdraw,
    minimumWithdrawal,
    totalBalance,
    clientDiscount,
  };
}

// ============================================================================
// REFERRAL CODE CAPTURE HOOK
// ============================================================================

import {
  storeReferralCode as storeCode,
  getStoredReferral as getStored,
  clearStoredReferral as clearStored,
  type ReferralCodeType,
} from "../utils/referralStorage";

/**
 * Hook to capture and persist influencer referral codes from URL
 * Handles both client referral (/ref/i/CODE) and recruitment (/rec/i/CODE) links
 */
export function useInfluencerReferralCapture(): {
  referralCode: string | null;
  referralType: "client" | "recruitment" | null;
  clearReferral: () => void;
} {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralType, setReferralType] = useState<"client" | "recruitment" | null>(null);

  useEffect(() => {
    // Check URL path for influencer referral pattern
    const path = window.location.pathname;

    // Match /ref/i/CODE (client referral)
    const clientMatch = path.match(/^\/ref\/i\/([A-Z0-9]+)$/i);
    if (clientMatch) {
      const code = clientMatch[1].toUpperCase();
      storeCode(code, 'influencer', 'client');
      setReferralCode(code);
      setReferralType("client");
      return;
    }

    // Match /rec/i/CODE (provider recruitment)
    const recruitMatch = path.match(/^\/rec\/i\/([A-Z0-9-]+)$/i);
    if (recruitMatch) {
      const code = recruitMatch[1].toUpperCase();
      storeCode(code, 'influencer', 'recruitment');
      setReferralCode(code);
      setReferralType("recruitment");
      return;
    }

    // Also check URL params for backward compatibility
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref_i") || urlParams.get("influencer_ref");

    if (refCode) {
      const normalizedCode = refCode.toUpperCase();
      const type: ReferralCodeType = normalizedCode.startsWith("REC-")
        ? "recruitment"
        : "client";

      storeCode(normalizedCode, 'influencer', type);
      setReferralCode(normalizedCode);
      setReferralType(type);

      // Clean URL
      urlParams.delete("ref_i");
      urlParams.delete("influencer_ref");
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    } else {
      // Check localStorage for existing code (returns null if expired)
      const stored = getStored('influencer');

      if (stored) {
        setReferralCode(stored.code);
        setReferralType(stored.codeType as "client" | "recruitment");
      }
    }
  }, []);

  const clearReferral = useCallback(() => {
    clearStored('influencer');
    setReferralCode(null);
    setReferralType(null);
  }, []);

  return {
    referralCode,
    referralType,
    clearReferral,
  };
}

/**
 * Get the stored influencer referral code (for use in signup/checkout)
 */
export function getStoredInfluencerCode(): {
  code: string | null;
  type: "client" | "recruitment" | null;
} {
  const stored = getStored('influencer');
  if (!stored) {
    return { code: null, type: null };
  }
  return { code: stored.code, type: stored.codeType as "client" | "recruitment" };
}

/**
 * Clear stored influencer referral (after successful conversion)
 */
export function clearStoredInfluencerCode(): void {
  clearStored('influencer');
}

export default useInfluencer;
