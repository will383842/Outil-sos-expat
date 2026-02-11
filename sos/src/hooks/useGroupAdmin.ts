/**
 * useGroupAdmin - Main hook for GroupAdmin data
 * useGroupAdminCommissions - Paginated commissions hook
 * useGroupAdminNotifications - Paginated notifications hook
 */

import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  GroupAdmin,
  GroupAdminCommission,
  GroupAdminRecruit,
  GroupAdminNotification,
  GroupAdminLeaderboardEntry,
  GroupAdminDashboardResponse,
} from '@/types/groupAdmin';

// ============================================================================
// useGroupAdmin - Dashboard profile + preview data
// ============================================================================

interface UseGroupAdminReturn {
  profile: GroupAdmin | null;
  recentCommissions: GroupAdminCommission[];
  recentRecruits: GroupAdminRecruit[];
  notifications: GroupAdminNotification[];
  leaderboard: GroupAdminLeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGroupAdmin(): UseGroupAdminReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GroupAdmin | null>(null);
  const [recentCommissions, setRecentCommissions] = useState<GroupAdminCommission[]>([]);
  const [recentRecruits, setRecentRecruits] = useState<GroupAdminRecruit[]>([]);
  const [notifications, setNotifications] = useState<GroupAdminNotification[]>([]);
  const [leaderboard, setLeaderboard] = useState<GroupAdminLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!user || user.role !== 'groupAdmin') {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const getDashboard = httpsCallable(functions, 'getGroupAdminDashboard');
      const result = await getDashboard({});
      const data = result.data as GroupAdminDashboardResponse;

      setProfile(data.profile);
      setRecentCommissions(data.recentCommissions);
      setRecentRecruits(data.recentRecruits);
      setNotifications(data.notifications);
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

  return {
    profile,
    recentCommissions,
    recentRecruits,
    notifications,
    leaderboard,
    isLoading,
    error,
    refresh: fetchDashboard,
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
      const fn = httpsCallable(functions, 'getGroupAdminCommissions');
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
      const fn = httpsCallable(functions, 'getGroupAdminNotifications');
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
