/**
 * useGroupAdmin - Main hook for GroupAdmin data
 * useGroupAdminCommissions - Paginated commissions hook
 * useGroupAdminNotifications - Paginated notifications hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
  getFirestore,
} from 'firebase/firestore';
import { functionsAffiliate } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { BaseNotification } from '@/types/notification';
import {
  GroupAdmin,
  GroupAdminCommission,
  GroupAdminRecruit,
  GroupAdminNotification,
  GroupAdminLeaderboardEntry,
  GroupAdminDashboardResponse,
} from '@/types/groupAdmin';

// ============================================================================
// useGroupAdmin - Dashboard profile + preview data + real-time notifications
// ============================================================================

interface UseGroupAdminReturn {
  profile: GroupAdmin | null;
  recentCommissions: GroupAdminCommission[];
  recentRecruits: GroupAdminRecruit[];
  notifications: BaseNotification[];
  leaderboard: GroupAdminLeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  unreadNotificationsCount: number;
}

export function useGroupAdmin(): UseGroupAdminReturn {
  const { user } = useAuth();
  const db = getFirestore();
  const [profile, setProfile] = useState<GroupAdmin | null>(null);
  const [recentCommissions, setRecentCommissions] = useState<GroupAdminCommission[]>([]);
  const [recentRecruits, setRecentRecruits] = useState<GroupAdminRecruit[]>([]);
  const [notifications, setNotifications] = useState<BaseNotification[]>([]);
  const [leaderboard, setLeaderboard] = useState<GroupAdminLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isGroupAdmin = !!profile;

  const fetchDashboard = useCallback(async () => {
    if (!user || user.role !== 'groupAdmin') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const getDashboard = httpsCallable(functionsAffiliate, 'getGroupAdminDashboard');
      const result = await getDashboard({});
      const data = result.data as GroupAdminDashboardResponse;

      setProfile(data.profile);
      setRecentCommissions(data.recentCommissions);
      setRecentRecruits(data.recentRecruits);
      setLeaderboard(data.leaderboard);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Real-time notifications subscription (normalizes `read` → `isRead`)
  useEffect(() => {
    if (!user?.uid || !isGroupAdmin) return;

    const notificationsQuery = query(
      collection(db, 'group_admin_notifications'),
      where('groupAdminId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const items: BaseNotification[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type || 'system',
            title: data.title || '',
            titleTranslations: data.titleTranslations,
            message: data.message || '',
            messageTranslations: data.messageTranslations,
            actionUrl: data.actionUrl,
            // Normalize: legacy docs may have `read`, new docs use `isRead`
            isRead: data.isRead ?? data.read ?? false,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || '',
            data: data.data,
          };
        });
        setNotifications(items);
      },
      (err) => {
        console.error('[useGroupAdmin] Notifications subscription error:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isGroupAdmin, db]);

  // Mark single notification as read
  const markNotificationRead = useCallback(
    async (notificationId: string): Promise<void> => {
      if (!user?.uid) return;

      try {
        const notificationRef = doc(db, 'group_admin_notifications', notificationId);
        // Firestore rules only allow ['isRead', 'readAt'] — do NOT write 'read'
        await updateDoc(notificationRef, {
          isRead: true,
          readAt: Timestamp.now(),
        });
      } catch (err) {
        console.error('[useGroupAdmin] Failed to mark notification as read:', err);
      }
    },
    [user?.uid, db]
  );

  // Mark all notifications as read
  const markAllNotificationsRead = useCallback(
    async (): Promise<void> => {
      if (!user?.uid) return;

      try {
        const batch = writeBatch(db);
        const now = Timestamp.now();
        const unreadNotifications = notifications.filter((n) => !n.isRead);

        if (unreadNotifications.length === 0) return;

        for (const notification of unreadNotifications) {
          const notificationRef = doc(db, 'group_admin_notifications', notification.id);
          // Firestore rules only allow ['isRead', 'readAt'] — do NOT write 'read'
          batch.update(notificationRef, {
            isRead: true,
            readAt: now,
          });
        }

        await batch.commit();
      } catch (err) {
        console.error('[useGroupAdmin] Failed to mark all notifications as read:', err);
      }
    },
    [user?.uid, db, notifications]
  );

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  return {
    profile,
    recentCommissions,
    recentRecruits,
    notifications,
    leaderboard,
    isLoading,
    error,
    refresh: fetchDashboard,
    markNotificationRead,
    markAllNotificationsRead,
    unreadNotificationsCount,
  };
}

// ============================================================================
// useGroupAdminCommissions - Paginated commissions
// ============================================================================

interface UseGroupAdminCommissionsReturn {
  commissions: GroupAdminCommission[];
  total: number;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  loadPage: (page: number) => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useGroupAdminCommissions(pageSize: number = 20): UseGroupAdminCommissionsReturn {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<GroupAdminCommission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (targetPage: number) => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(null);
      const fn = httpsCallable(functionsAffiliate, 'getGroupAdminCommissions');
      const result = await fn({ page: targetPage, limit: pageSize });
      const data = result.data as {
        commissions: GroupAdminCommission[];
        total: number;
        page: number;
        hasMore: boolean;
      };
      setCommissions(data.commissions);
      setTotal(data.total);
      setPage(data.page);
      setHasMore(data.hasMore);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load commissions');
    } finally {
      setIsLoading(false);
    }
  }, [user, pageSize]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadPage(page + 1);
  }, [hasMore, isLoading, page, loadPage]);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  return { commissions, total, page, hasMore, isLoading, error, loadPage, loadMore };
}

// ============================================================================
// useGroupAdminNotifications - Paginated notifications
// ============================================================================

interface UseGroupAdminNotificationsReturn {
  notifications: GroupAdminNotification[];
  total: number;
  unreadCount: number;
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  loadPage: (page: number) => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useGroupAdminNotifications(pageSize: number = 20): UseGroupAdminNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<GroupAdminNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (targetPage: number) => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(null);
      const fn = httpsCallable(functionsAffiliate, 'getGroupAdminNotifications');
      const result = await fn({ page: targetPage, limit: pageSize });
      const data = result.data as {
        notifications: GroupAdminNotification[];
        total: number;
        unreadCount: number;
        page: number;
        hasMore: boolean;
      };
      setNotifications(data.notifications);
      setTotal(data.total);
      setUnreadCount(data.unreadCount);
      setPage(data.page);
      setHasMore(data.hasMore);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user, pageSize]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadPage(page + 1);
  }, [hasMore, isLoading, page, loadPage]);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  return { notifications, total, unreadCount, page, hasMore, isLoading, error, loadPage, loadMore };
}

export default useGroupAdmin;
