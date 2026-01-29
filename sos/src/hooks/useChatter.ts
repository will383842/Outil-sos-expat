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
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { getTranslatedRouteSlug } from "@/multilingual-system/core/routing/localeRoutes";
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

  // Computed
  clientShareUrl: string;
  recruitmentShareUrl: string;
  canWithdraw: boolean;
  minimumWithdrawal: number;
  totalBalance: number;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useChatter(): UseChatterReturn {
  const { user } = useAuth();
  const { language } = useApp();
  const langCode = (language || "en") as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";
  const [dashboardData, setDashboardData] = useState<ChatterDashboardData | null>(null);
  const [commissions, setCommissions] = useState<ChatterCommission[]>([]);
  const [withdrawals, setWithdrawals] = useState<ChatterWithdrawal[]>([]);
  const [notifications, setNotifications] = useState<ChatterNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const functions = getFunctions(undefined, "europe-west1");
  const db = getFirestore();

  // Check if user is a chatter
  const isChatter = useMemo(() => {
    return !!dashboardData?.chatter?.status;
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
      const getChatterDashboardFn = httpsCallable<void, ChatterDashboardData>(
        functions,
        "getChatterDashboard"
      );

      const result = await getChatterDashboardFn();
      setDashboardData(result.data);
    } catch (err) {
      console.error("[useChatter] Error fetching dashboard:", err);
      // Check if error is "Chatter not found" - means user is not a chatter
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch chatter data";
      if (errorMessage.includes("not found")) {
        setDashboardData(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, functions]);

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
      >(functions, "chatterRequestWithdrawal");

      const result = await requestWithdrawalFn(input);
      await refreshDashboard();
      return {
        success: result.data.success,
        withdrawalId: result.data.withdrawalId,
        message: result.data.message,
      };
    },
    [user?.uid, functions, refreshDashboard]
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
      >(functions, "updateChatterProfile");

      const result = await updateProfileFn(input);
      await refreshDashboard();
      return result.data;
    },
    [user?.uid, functions, refreshDashboard]
  );

  // Mark notification as read
  const markNotificationRead = useCallback(
    async (notificationId: string): Promise<void> => {
      if (!user?.uid) return;

      // Update directly in Firestore (allowed by rules)
      const { doc, updateDoc, Timestamp } = await import("firebase/firestore");
      const notificationRef = doc(db, "chatter_notifications", notificationId);
      await updateDoc(notificationRef, {
        isRead: true,
        readAt: Timestamp.now(),
      });
    },
    [user?.uid, db]
  );

  // Subscribe to commissions
  useEffect(() => {
    if (!user?.uid || !isChatter) return;

    const commissionsQuery = query(
      collection(db, "chatter_commissions"),
      where("chatterId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      commissionsQuery,
      (snapshot) => {
        const items: ChatterCommission[] = snapshot.docs.map((doc) => {
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
        setCommissions(items);
      },
      (err) => {
        console.error("[useChatter] Commissions subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isChatter, db]);

  // Subscribe to withdrawals
  useEffect(() => {
    if (!user?.uid || !isChatter) return;

    const withdrawalsQuery = query(
      collection(db, "chatter_withdrawals"),
      where("chatterId", "==", user.uid),
      orderBy("requestedAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      withdrawalsQuery,
      (snapshot) => {
        const items: ChatterWithdrawal[] = snapshot.docs.map((doc) => {
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
        setWithdrawals(items);
      },
      (err) => {
        console.error("[useChatter] Withdrawals subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isChatter, db]);

  // Subscribe to notifications
  useEffect(() => {
    if (!user?.uid || !isChatter) return;

    const notificationsQuery = query(
      collection(db, "chatter_notifications"),
      where("chatterId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const items: ChatterNotification[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          } as ChatterNotification;
        });
        setNotifications(items);
      },
      (err) => {
        console.error("[useChatter] Notifications subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isChatter, db]);

  // Initial fetch
  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // Computed values
  const clientShareUrl = useMemo(() => {
    if (!dashboardData?.chatter?.affiliateCodeClient) return "";
    return `${window.location.origin}?ref=${dashboardData.chatter.affiliateCodeClient}`;
  }, [dashboardData]);

  const recruitmentShareUrl = useMemo(() => {
    if (!dashboardData?.chatter?.affiliateCodeRecruitment) return "";
    const providerRoute = getTranslatedRouteSlug("become-provider" as any, langCode);
    return `${window.location.origin}/${providerRoute}?ref=${dashboardData.chatter.affiliateCodeRecruitment}`;
  }, [dashboardData, langCode]);

  const minimumWithdrawal = dashboardData?.config?.minimumWithdrawalAmount || 2500;

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

  return {
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
    clientShareUrl,
    recruitmentShareUrl,
    canWithdraw,
    minimumWithdrawal,
    totalBalance,
  };
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

      // Persist to localStorage
      localStorage.setItem(CHATTER_CODE_KEY, normalizedCode);
      localStorage.setItem(CHATTER_CODE_TYPE_KEY, type);

      setReferralCode(normalizedCode);
      setReferralType(type);

      // Clean URL
      urlParams.delete("ref");
      urlParams.delete("code");
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    } else {
      // Check localStorage for existing code
      const storedCode = localStorage.getItem(CHATTER_CODE_KEY);
      const storedType = localStorage.getItem(CHATTER_CODE_TYPE_KEY);

      if (storedCode) {
        setReferralCode(storedCode);
        setReferralType(storedType as "client" | "recruitment" || "client");
      }
    }
  }, []);

  const clearReferral = useCallback(() => {
    localStorage.removeItem(CHATTER_CODE_KEY);
    localStorage.removeItem(CHATTER_CODE_TYPE_KEY);
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
  const code = localStorage.getItem(CHATTER_CODE_KEY);
  const type = localStorage.getItem(CHATTER_CODE_TYPE_KEY) as "client" | "recruitment" | null;
  return { code, type };
}

/**
 * Clear stored chatter referral (after successful signup)
 */
export function clearStoredChatterCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CHATTER_CODE_KEY);
  localStorage.removeItem(CHATTER_CODE_TYPE_KEY);
}

export default useChatter;
