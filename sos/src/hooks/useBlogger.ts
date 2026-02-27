/**
 * useBlogger Hook
 *
 * Central hook for blogger operations in the frontend.
 * Provides data, actions, and computed values for blogger dashboard.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functionsWest2 } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Blogger,
  BloggerCommission,
  BloggerWithdrawal,
  BloggerNotification,
  BloggerDashboardData,
  RequestBloggerWithdrawalInput,
  RequestBloggerWithdrawalResponse,
  UpdateBloggerProfileInput,
  BloggerLeaderboardData,
  RegisterBloggerInput,
  RegisterBloggerResponse,
} from '../types/blogger';

// ============================================================================
// TYPES
// ============================================================================

interface UseBloggerReturn {
  // Data
  dashboardData: BloggerDashboardData | null;
  blogger: Blogger | null;
  commissions: BloggerCommission[];
  withdrawals: BloggerWithdrawal[];
  notifications: BloggerNotification[];
  leaderboard: BloggerLeaderboardData | null;

  // State
  isLoading: boolean;
  isLoadingLeaderboard: boolean;
  error: string | null;
  isBlogger: boolean;

  // Actions
  refreshDashboard: () => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  registerAsBlogger: (input: Partial<RegisterBloggerInput>) => Promise<{
    success: boolean;
    bloggerId?: string;
    error?: string;
  }>;
  requestWithdrawal: (input: RequestBloggerWithdrawalInput) => Promise<{
    success: boolean;
    withdrawalId?: string;
    message: string;
    error?: string;
  }>;
  updateProfile: (input: UpdateBloggerProfileInput) => Promise<{
    success: boolean;
    message: string;
  }>;
  markNotificationRead: (notificationId: string) => Promise<void>;

  // Computed
  clientShareUrl: string;
  recruitmentShareUrl: string;
  canWithdraw: boolean;
  minimumWithdrawal: number;
  totalBalance: number;
}

// ============================================================================
// HOOK
// ============================================================================

export function useBlogger(): UseBloggerReturn {
  const { user } = useAuth();

  // State
  const [dashboardData, setDashboardData] = useState<BloggerDashboardData | null>(null);
  const [commissions, setCommissions] = useState<BloggerCommission[]>([]);
  const [withdrawals, setWithdrawals] = useState<BloggerWithdrawal[]>([]);
  const [notifications, setNotifications] = useState<BloggerNotification[]>([]);
  const [leaderboard, setLeaderboard] = useState<BloggerLeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBlogger, setIsBlogger] = useState(false);

  // Extract blogger from dashboard data
  const blogger = useMemo(() => {
    if (!dashboardData?.blogger) return null;
    return dashboardData.blogger as unknown as Blogger;
  }, [dashboardData]);

  // ============================================================================
  // FETCH DASHBOARD
  // ============================================================================

  const refreshDashboard = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    setError(null);

    try {
      const getBloggerDashboard = httpsCallable<unknown, BloggerDashboardData>(
        functionsWest2,
        'getBloggerDashboard'
      );

      const result = await getBloggerDashboard({});
      setDashboardData(result.data);
      setIsBlogger(true);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === 'functions/not-found') {
        setIsBlogger(false);
      } else {
        setError(error.message || 'Failed to load dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // ============================================================================
  // FETCH LEADERBOARD
  // ============================================================================

  const refreshLeaderboard = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoadingLeaderboard(true);

    try {
      const getBloggerLeaderboard = httpsCallable<unknown, BloggerLeaderboardData>(
        functionsWest2,
        'getBloggerLeaderboard'
      );

      const result = await getBloggerLeaderboard({});
      setLeaderboard(result.data);
    } catch (err: unknown) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [user?.uid]);

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  useEffect(() => {
    if (!user?.uid || !isBlogger) return;

    // Subscribe to commissions
    const commissionsQuery = query(
      collection(db, 'blogger_commissions'),
      where('bloggerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubCommissions = onSnapshot(commissionsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          ...d,
          id: doc.id,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          validatedAt: d.validatedAt?.toDate?.()?.toISOString() || null,
          availableAt: d.availableAt?.toDate?.()?.toISOString() || null,
          paidAt: d.paidAt?.toDate?.()?.toISOString() || null,
          cancelledAt: d.cancelledAt?.toDate?.()?.toISOString() || null,
          updatedAt: d.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as BloggerCommission;
      });
      setCommissions(data);
    });

    // Subscribe to withdrawals
    const withdrawalsQuery = query(
      collection(db, 'blogger_withdrawals'),
      where('bloggerId', '==', user.uid),
      orderBy('requestedAt', 'desc'),
      limit(20)
    );

    const unsubWithdrawals = onSnapshot(withdrawalsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          ...d,
          id: doc.id,
          requestedAt: d.requestedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          processedAt: d.processedAt?.toDate?.()?.toISOString() || null,
          completedAt: d.completedAt?.toDate?.()?.toISOString() || null,
          failedAt: d.failedAt?.toDate?.()?.toISOString() || null,
          estimatedArrival: d.estimatedArrival?.toDate?.()?.toISOString() || null,
        } as BloggerWithdrawal;
      });
      setWithdrawals(data);
    });

    // Subscribe to notifications
    const notificationsQuery = query(
      collection(db, 'blogger_notifications'),
      where('bloggerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          ...d,
          id: doc.id,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          readAt: d.readAt?.toDate?.()?.toISOString() || null,
        } as BloggerNotification;
      });
      setNotifications(data);
    });

    return () => {
      unsubCommissions();
      unsubWithdrawals();
      unsubNotifications();
    };
  }, [user?.uid, isBlogger]);

  // Initial load
  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const registerAsBlogger = useCallback(
    async (input: Partial<RegisterBloggerInput>): Promise<{
      success: boolean;
      bloggerId?: string;
      error?: string;
    }> => {
      try {
        const registerBlogger = httpsCallable<
          Partial<RegisterBloggerInput>,
          RegisterBloggerResponse
        >(functionsWest2, 'registerBlogger');

        const result = await registerBlogger(input);

        if (result.data.success) {
          setIsBlogger(true);
          await refreshDashboard();
        }

        return {
          success: result.data.success,
          bloggerId: result.data.bloggerId,
          error: result.data.success ? undefined : result.data.message,
        };
      } catch (err: unknown) {
        const error = err as { message?: string };
        return {
          success: false,
          error: error.message || 'Failed to register as blogger',
        };
      }
    },
    [refreshDashboard]
  );

  const requestWithdrawal = useCallback(
    async (input: RequestBloggerWithdrawalInput): Promise<{
      success: boolean;
      withdrawalId?: string;
      message: string;
    }> => {
      try {
        const bloggerRequestWithdrawal = httpsCallable<
          RequestBloggerWithdrawalInput,
          RequestBloggerWithdrawalResponse
        >(functionsWest2, 'bloggerRequestWithdrawal');

        const result = await bloggerRequestWithdrawal(input);

        if (result.data.success) {
          // Refresh dashboard to update balances
          await refreshDashboard();
        }

        return {
          success: result.data.success,
          withdrawalId: result.data.withdrawalId,
          message: result.data.message,
        };
      } catch (err: unknown) {
        const error = err as { message?: string };
        return {
          success: false,
          message: error.message || 'Failed to request withdrawal',
        };
      }
    },
    [refreshDashboard]
  );

  const updateProfile = useCallback(
    async (input: UpdateBloggerProfileInput): Promise<{
      success: boolean;
      message: string;
    }> => {
      try {
        const updateBloggerProfile = httpsCallable<
          UpdateBloggerProfileInput,
          { success: boolean; message: string }
        >(functionsWest2, 'updateBloggerProfile');

        const result = await updateBloggerProfile(input);

        if (result.data.success) {
          await refreshDashboard();
        }

        return result.data;
      } catch (err: unknown) {
        const error = err as { message?: string };
        return {
          success: false,
          message: error.message || 'Failed to update profile',
        };
      }
    },
    [refreshDashboard]
  );

  const markNotificationRead = useCallback(
    async (notificationId: string): Promise<void> => {
      try {
        const notificationRef = doc(db, 'blogger_notifications', notificationId);
        await updateDoc(notificationRef, {
          isRead: true,
          readAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    []
  );

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const clientShareUrl = useMemo(() => {
    if (!blogger?.affiliateCodeClient) return '';
    return `https://sos-expat.com/ref/b/${blogger.affiliateCodeClient}`;
  }, [blogger?.affiliateCodeClient]);

  const recruitmentShareUrl = useMemo(() => {
    if (!blogger?.affiliateCodeRecruitment) return '';
    return `https://sos-expat.com/rec/b/${blogger.affiliateCodeRecruitment}`;
  }, [blogger?.affiliateCodeRecruitment]);

  const minimumWithdrawal = useMemo(() => {
    return dashboardData?.config?.minimumWithdrawalAmount || 3000; // $30 default
  }, [dashboardData]);

  const canWithdraw = useMemo(() => {
    if (!blogger) return false;
    return (
      blogger.availableBalance >= minimumWithdrawal &&
      !blogger.pendingWithdrawalId &&
      blogger.status === 'active'
    );
  }, [blogger, minimumWithdrawal]);

  const totalBalance = useMemo(() => {
    if (!blogger) return 0;
    return blogger.availableBalance + blogger.pendingBalance + blogger.validatedBalance;
  }, [blogger]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    dashboardData,
    blogger,
    commissions,
    withdrawals,
    notifications,
    leaderboard,

    // State
    isLoading,
    isLoadingLeaderboard,
    error,
    isBlogger,

    // Actions
    refreshDashboard,
    refreshLeaderboard,
    registerAsBlogger,
    requestWithdrawal,
    updateProfile,
    markNotificationRead,

    // Computed
    clientShareUrl,
    recruitmentShareUrl,
    canWithdraw,
    minimumWithdrawal,
    totalBalance,
  };
}

export default useBlogger;
