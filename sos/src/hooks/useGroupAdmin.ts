/**
 * useGroupAdmin - Main hook for GroupAdmin data
 */

import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  GroupAdmin,
  GroupAdminCommission,
  GroupAdminRecruit,
  GroupAdminNotification,
  GroupAdminLeaderboardEntry,
  GroupAdminDashboardResponse,
} from '@/types/groupAdmin';

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

export default useGroupAdmin;
