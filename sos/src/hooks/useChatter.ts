/**
 * useChatter Hook
 *
 * React hook for managing chatter data and operations.
 * Provides:
 * - Chatter dashboard data fetching
 * - Commission history
 * - Withdrawal requests
 * - Profile management
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { functionsAffiliate } from "@/config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { storeReferralCode, getStoredReferral, clearStoredReferral } from "../utils/referralStorage";
import {
  ChatterDashboardData,
  ChatterCommission,
  ChatterWithdrawal,
  ChatterNotification,
  RequestWithdrawalInput,
  UpdateChatterProfileInput,
  ChatterPaymentMethod,
  ChatterPaymentDetails,
} from "../types/chatter";

// ============================================================================
// CACHE TTL — avoids redundant Firebase calls on navigation
// ============================================================================

const CACHE_TTL = {
  dashboard: 180_000,     // 3min — main dashboard data (pull-to-refresh & mutations force refetch)
  commissions: 120_000,   // 2min — commission history
  withdrawals: 300_000,   // 5min — withdrawal history (changes rarely)
  notifications: 60_000,  // 1min — notifications
} as const;

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

function isCacheValid<T>(entry: CacheEntry<T> | null, ttl: number): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.fetchedAt < ttl;
}

// ============================================================================
// TYPES
// ============================================================================

interface UseChatterReturn {
  // Data
  dashboardData: ChatterDashboardData | null;
  commissions: ChatterCommission[];
  withdrawals: ChatterWithdrawal[];
  notifications: ChatterNotification[];

  // State
  isLoading: boolean;
  error: string | null;
  isChatter: boolean;

  // Actions
  refreshDashboard: (forceRefresh?: boolean) => Promise<void>;
  requestWithdrawal: (
    input: RequestWithdrawalInput
  ) => Promise<{ success: boolean; withdrawalId?: string; message: string }>;
  updateProfile: (
    input: UpdateChatterProfileInput
  ) => Promise<{ success: boolean; message: string }>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Computed
  clientShareUrl: string;
  recruitmentShareUrl: string;
  providerShareUrl: string;
  canWithdraw: boolean;
  minimumWithdrawal: number;
  totalBalance: number;
  unreadNotificationsCount: number;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useChatter(): UseChatterReturn {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<ChatterDashboardData | null>(null);
  const [commissions, setCommissions] = useState<ChatterCommission[]>([]);
  const [withdrawals, setWithdrawals] = useState<ChatterWithdrawal[]>([]);
  const [notifications, setNotifications] = useState<ChatterNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache refs (survive re-renders, cleared on unmount)
  const dashboardCache = useRef<CacheEntry<ChatterDashboardData> | null>(null);
  const commissionsCache = useRef<CacheEntry<ChatterCommission[]> | null>(null);
  const withdrawalsCache = useRef<CacheEntry<ChatterWithdrawal[]> | null>(null);
  const notificationsCache = useRef<CacheEntry<ChatterNotification[]> | null>(null);

  const db = getFirestore();

  // Check if user is a chatter
  const isChatter = useMemo(() => {
    return !!dashboardData?.chatter?.status;
  }, [dashboardData]);

  // Fetch all list data (commissions, withdrawals, notifications) via getDocs
  // Respects cache TTL — only fetches stale data
  const fetchListData = useCallback(async (forceRefresh = false) => {
    if (!user?.uid) return;

    const needsCommissions = forceRefresh || !isCacheValid(commissionsCache.current, CACHE_TTL.commissions);
    const needsWithdrawals = forceRefresh || !isCacheValid(withdrawalsCache.current, CACHE_TTL.withdrawals);
    const needsNotifications = forceRefresh || !isCacheValid(notificationsCache.current, CACHE_TTL.notifications);

    // Nothing to fetch — everything is cached
    if (!needsCommissions && !needsWithdrawals && !needsNotifications) return;

    const promises: Promise<any>[] = [];
    const keys: string[] = [];

    if (needsCommissions) {
      const commissionsQuery = query(
        collection(db, "chatter_commissions"),
        where("chatterId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      promises.push(getDocs(commissionsQuery));
      keys.push("commissions");
    }

    if (needsWithdrawals) {
      const withdrawalsQuery = query(
        collection(db, "payment_withdrawals"),
        where("userId", "==", user.uid),
        where("userType", "==", "chatter"),
        orderBy("requestedAt", "desc"),
        limit(20)
      );
      promises.push(getDocs(withdrawalsQuery));
      keys.push("withdrawals");
    }

    if (needsNotifications) {
      const notificationsQuery = query(
        collection(db, "chatter_notifications"),
        where("chatterId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(30)
      );
      promises.push(getDocs(notificationsQuery));
      keys.push("notifications");
    }

    const results = await Promise.allSettled(promises);

    results.forEach((result, i) => {
      const key = keys[i];
      if (result.status !== "fulfilled") {
        console.warn(`[useChatter] Failed to fetch ${key}:`, result.reason);
        return;
      }

      const now = Date.now();

      if (key === "commissions") {
        const parsed = result.value.docs.map((doc: any) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
            validatedAt: data.validatedAt?.toDate?.()?.toISOString() || null,
            availableAt: data.availableAt?.toDate?.()?.toISOString() || null,
            paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
          } as ChatterCommission;
        });
        commissionsCache.current = { data: parsed, fetchedAt: now };
        setCommissions(parsed);
      } else if (key === "withdrawals") {
        const parsed = result.value.docs.map((doc: any) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            requestedAt: data.requestedAt?.toDate?.()?.toISOString() || "",
            processedAt: data.processedAt?.toDate?.()?.toISOString() || undefined,
            completedAt: data.completedAt?.toDate?.()?.toISOString() || undefined,
            failedAt: data.failedAt?.toDate?.()?.toISOString() || undefined,
          } as ChatterWithdrawal;
        });
        withdrawalsCache.current = { data: parsed, fetchedAt: now };
        setWithdrawals(parsed);
      } else if (key === "notifications") {
        const parsed = result.value.docs.map((doc: any) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          } as ChatterNotification;
        });
        notificationsCache.current = { data: parsed, fetchedAt: now };
        setNotifications(parsed);
      }
    });
  }, [user?.uid, db]);

  // Fetch dashboard data + list data in parallel (with cache TTL)
  const refreshDashboard = useCallback(async (forceRefresh = false) => {
    if (!user?.uid) {
      setDashboardData(null);
      setIsLoading(false);
      return;
    }

    const dashboardCached = !forceRefresh && isCacheValid(dashboardCache.current, CACHE_TTL.dashboard);

    // If dashboard is cached, serve it immediately (lists may still refresh)
    if (dashboardCached) {
      setDashboardData(dashboardCache.current!.data);
      // Still refresh lists in background (they have their own TTL)
      fetchListData(forceRefresh);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const getChatterDashboardFn = httpsCallable<{ level?: string }, ChatterDashboardData>(
        functionsAffiliate,
        "getChatterDashboard"
      );

      // Phase 1: Fetch essential data (fast — skips trends/comparison/forecast)
      const [result] = await Promise.all([
        getChatterDashboardFn({ level: "essential" }),
        fetchListData(forceRefresh),
      ]);

      dashboardCache.current = { data: result.data, fetchedAt: Date.now() };
      setDashboardData(result.data);

      // Phase 2: Fetch deferred data (trends, comparison, forecast) in background
      if (!result.data.trends) {
        getChatterDashboardFn({ level: "full" }).then((fullResult) => {
          dashboardCache.current = { data: fullResult.data, fetchedAt: Date.now() };
          setDashboardData(fullResult.data);
        }).catch(() => {
          // Non-critical: below-fold cards just won't have trend data
        });
      }
    } catch (err) {
      console.error("[useChatter] Error fetching dashboard:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch chatter data";
      if (errorMessage.includes("not found")) {
        setDashboardData(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, functionsAffiliate, fetchListData]);

  // Request withdrawal
  const requestWithdrawal = useCallback(
    async (
      input: RequestWithdrawalInput
    ): Promise<{ success: boolean; withdrawalId?: string; message: string }> => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const requestWithdrawalFn = httpsCallable<
        RequestWithdrawalInput,
        { success: boolean; withdrawalId: string; amount: number; message: string }
      >(functionsAffiliate, "chatterRequestWithdrawal");

      const result = await requestWithdrawalFn(input);
      // Force refresh — balance changed
      dashboardCache.current = null;
      withdrawalsCache.current = null;
      await refreshDashboard(true);
      return {
        success: result.data.success,
        withdrawalId: result.data.withdrawalId,
        message: result.data.message,
      };
    },
    [user?.uid, functionsAffiliate, refreshDashboard]
  );

  // Update profile
  const updateProfile = useCallback(
    async (
      input: UpdateChatterProfileInput
    ): Promise<{ success: boolean; message: string }> => {
      if (!user?.uid) {
        throw new Error("User must be authenticated");
      }

      const updateProfileFn = httpsCallable<
        UpdateChatterProfileInput,
        { success: boolean; message: string }
      >(functionsAffiliate, "updateChatterProfile");

      const result = await updateProfileFn(input);
      // Force refresh — profile data changed
      dashboardCache.current = null;
      await refreshDashboard(true);
      return result.data;
    },
    [user?.uid, functionsAffiliate, refreshDashboard]
  );

  // Mark notification as read
  const markNotificationRead = useCallback(
    async (notificationId: string): Promise<void> => {
      if (!user?.uid) return;

      try {
        // Update directly in Firestore (allowed by rules)
        const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
        const notificationRef = doc(db, "chatter_notifications", notificationId);
        await updateDoc(notificationRef, {
          isRead: true,
          readAt: Timestamp.now(),
        });
      } catch (error) {
        console.error("[useChatter] Failed to mark notification as read:", error);
        // Silently fail - notification read status is not critical
      }
    },
    [user?.uid, db]
  );

  // Mark all notifications as read
  const markAllNotificationsRead = useCallback(
    async (): Promise<void> => {
      if (!user?.uid) return;

      try {
        const { doc, Timestamp, writeBatch } = await import("firebase/firestore");
        const batch = writeBatch(db);
        const now = Timestamp.now();

        // Get unread notifications and update them in a batch
        const unreadNotifications = notifications.filter((n) => !n.isRead);

        if (unreadNotifications.length === 0) return;

        for (const notification of unreadNotifications) {
          const notificationRef = doc(db, "chatter_notifications", notification.id);
          batch.update(notificationRef, {
            isRead: true,
            readAt: now,
          });
        }

        await batch.commit();
      } catch (error) {
        console.error("[useChatter] Failed to mark all notifications as read:", error);
        // Silently fail - notification read status is not critical
      }
    },
    [user?.uid, db, notifications]
  );

  // Initial fetch
  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // Computed values
  const clientShareUrl = useMemo(() => {
    if (!dashboardData?.chatter?.affiliateCodeClient) return "";
    return `${window.location.origin}/ref/c/${dashboardData.chatter.affiliateCodeClient}`;
  }, [dashboardData]);

  const recruitmentShareUrl = useMemo(() => {
    if (!dashboardData?.chatter?.affiliateCodeRecruitment) return "";
    return `${window.location.origin}/rec/c/${dashboardData.chatter.affiliateCodeRecruitment}`;
  }, [dashboardData]);

  const providerShareUrl = useMemo(() => {
    if (!dashboardData?.chatter?.affiliateCodeProvider) return "";
    return `${window.location.origin}/prov/c/${dashboardData.chatter.affiliateCodeProvider}`;
  }, [dashboardData]);

  const minimumWithdrawal = dashboardData?.config?.minimumWithdrawalAmount || 3000;

  const canWithdraw = useMemo(() => {
    if (!dashboardData) return false;
    const { chatter } = dashboardData;
    return (
      chatter.status === "active" &&
      chatter.availableBalance >= minimumWithdrawal &&
      !chatter.pendingWithdrawalId
    );
  }, [dashboardData, minimumWithdrawal]);

  const totalBalance = useMemo(() => {
    if (!dashboardData) return 0;
    const { chatter } = dashboardData;
    return chatter.availableBalance + chatter.pendingBalance + chatter.validatedBalance;
  }, [dashboardData]);

  // Unread notifications count (from real-time subscription or dashboard data)
  const unreadNotificationsCount = useMemo(() => {
    // Prefer real-time count from notifications subscription
    const realtimeUnread = notifications.filter((n) => !n.isRead).length;
    // Fall back to dashboard data if notifications haven't loaded yet
    return realtimeUnread || dashboardData?.unreadNotifications || 0;
  }, [notifications, dashboardData?.unreadNotifications]);

  // Memoize the return value to prevent unnecessary re-renders of context consumers.
  // Without this, every isLoading toggle creates a new object reference,
  // causing ALL context consumers to re-render even if they don't use isLoading.
  return useMemo(() => ({
    dashboardData,
    commissions,
    withdrawals,
    notifications,
    isLoading,
    error,
    isChatter,
    refreshDashboard,
    requestWithdrawal,
    updateProfile,
    markNotificationRead,
    markAllNotificationsRead,
    clientShareUrl,
    recruitmentShareUrl,
    providerShareUrl,
    canWithdraw,
    minimumWithdrawal,
    totalBalance,
    unreadNotificationsCount,
  }), [
    dashboardData,
    commissions,
    withdrawals,
    notifications,
    isLoading,
    error,
    isChatter,
    refreshDashboard,
    requestWithdrawal,
    updateProfile,
    markNotificationRead,
    markAllNotificationsRead,
    clientShareUrl,
    recruitmentShareUrl,
    providerShareUrl,
    canWithdraw,
    minimumWithdrawal,
    totalBalance,
    unreadNotificationsCount,
  ]);
}

// ============================================================================
// REFERRAL CODE CAPTURE HOOK
// ============================================================================

const CHATTER_CODE_KEY = "sos_chatter_code";
const CHATTER_CODE_TYPE_KEY = "sos_chatter_code_type";

interface ChatterReferralTracking {
  code: string;
  type: "client" | "recruitment";
  capturedAt: string;
  landingPage: string;
}

/**
 * Hook to capture and persist chatter referral codes from URL
 */
export function useChatterReferralCapture(): {
  referralCode: string | null;
  referralType: "client" | "recruitment" | null;
  clearReferral: () => void;
} {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralType, setReferralType] = useState<"client" | "recruitment" | null>(null);

  useEffect(() => {
    // Check URL for referral code
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref") || urlParams.get("code");

    if (refCode) {
      const normalizedCode = refCode.toUpperCase();
      const type: "client" | "recruitment" = normalizedCode.startsWith("REC-")
        ? "recruitment"
        : "client";

      // Persist via referralStorage
      storeReferralCode(normalizedCode, 'chatter', type, { landingPage: window.location.pathname });

      setReferralCode(normalizedCode);
      setReferralType(type);

      // KEEP ?ref= in URL — AffiliateRefSync ensures it persists across navigation
      // Do NOT clean URL anymore, the ref must stay visible
    } else {
      // Check referralStorage for existing code
      const stored = getStoredReferral('chatter');
      if (stored) {
        setReferralCode(stored.code);
        setReferralType(stored.codeType as "client" | "recruitment" || "client");
      }
    }
  }, []);

  const clearReferral = useCallback(() => {
    clearStoredReferral('chatter');
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
 * Get the stored chatter referral code (for use in signup)
 */
export function getStoredChatterCode(): {
  code: string | null;
  type: "client" | "recruitment" | null;
} {
  if (typeof window === "undefined") {
    return { code: null, type: null };
  }
  const stored = getStoredReferral('chatter');
  if (!stored) return { code: null, type: null };
  return { code: stored.code, type: (stored.codeType as "client" | "recruitment") || "client" };
}

/**
 * Clear stored chatter referral (after successful signup)
 */
export function clearStoredChatterCode(): void {
  if (typeof window === "undefined") return;
  clearStoredReferral('chatter');
}

export default useChatter;
