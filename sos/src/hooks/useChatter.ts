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

import { useState, useEffect, useCallback, useMemo } from "react";
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
  refreshDashboard: () => Promise<void>;
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

  const db = getFirestore();

  // Check if user is a chatter
  const isChatter = useMemo(() => {
    return !!dashboardData?.chatter?.status;
  }, [dashboardData]);

  // Fetch all list data (commissions, withdrawals, notifications) via getDocs
  const fetchListData = useCallback(async () => {
    if (!user?.uid) return;

    const commissionsQuery = query(
      collection(db, "chatter_commissions"),
      where("chatterId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const withdrawalsQuery = query(
      collection(db, "payment_withdrawals"),
      where("userId", "==", user.uid),
      where("userType", "==", "chatter"),
      orderBy("requestedAt", "desc"),
      limit(20)
    );

    const notificationsQuery = query(
      collection(db, "chatter_notifications"),
      where("chatterId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    // Use allSettled so one failing query doesn't break the dashboard
    const [commissionsResult, withdrawalsResult, notificationsResult] = await Promise.allSettled([
      getDocs(commissionsQuery),
      getDocs(withdrawalsQuery),
      getDocs(notificationsQuery),
    ]);

    if (commissionsResult.status === "fulfilled") {
      setCommissions(
        commissionsResult.value.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
            validatedAt: data.validatedAt?.toDate?.()?.toISOString() || null,
            availableAt: data.availableAt?.toDate?.()?.toISOString() || null,
            paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
          } as ChatterCommission;
        })
      );
    } else {
      console.warn("[useChatter] Failed to fetch commissions:", commissionsResult.reason);
    }

    if (withdrawalsResult.status === "fulfilled") {
      setWithdrawals(
        withdrawalsResult.value.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            requestedAt: data.requestedAt?.toDate?.()?.toISOString() || "",
            processedAt: data.processedAt?.toDate?.()?.toISOString() || undefined,
            completedAt: data.completedAt?.toDate?.()?.toISOString() || undefined,
            failedAt: data.failedAt?.toDate?.()?.toISOString() || undefined,
          } as ChatterWithdrawal;
        })
      );
    } else {
      console.warn("[useChatter] Failed to fetch withdrawals:", withdrawalsResult.reason);
    }

    if (notificationsResult.status === "fulfilled") {
      setNotifications(
        notificationsResult.value.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          } as ChatterNotification;
        })
      );
    } else {
      console.warn("[useChatter] Failed to fetch notifications:", notificationsResult.reason);
    }
  }, [user?.uid, db]);

  // Fetch dashboard data + list data in parallel
  const refreshDashboard = useCallback(async () => {
    if (!user?.uid) {
      setDashboardData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const getChatterDashboardFn = httpsCallable<void, ChatterDashboardData>(
        functionsAffiliate,
        "getChatterDashboard"
      );

      // Fetch dashboard callable and list data in parallel
      const [result] = await Promise.all([
        getChatterDashboardFn(),
        fetchListData(),
      ]);

      setDashboardData(result.data);
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
      await refreshDashboard();
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
      await refreshDashboard();
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
