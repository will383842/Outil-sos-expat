/**
 * Hook to fetch provider stats for the agency
 */
import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  type ProviderMonthlyStats,
  type AgencyStats,
  aggregateAgencyStats,
} from '../types';
import { format, subMonths } from 'date-fns';

interface UseProviderStatsResult {
  stats: ProviderMonthlyStats[];
  agencyStats: AgencyStats | null;
  isLoading: boolean;
  error: string | null;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
}

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

/**
 * Get last N months including current
 */
function getRecentMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    months.push(format(subMonths(now, i), 'yyyy-MM'));
  }

  return months;
}

export function useProviderStats(): UseProviderStatsResult {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProviderMonthlyStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const availableMonths = useMemo(() => getRecentMonths(12), []);

  useEffect(() => {
    if (!user?.linkedProviderIds?.length) {
      setStats([]);
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Firestore 'in' queries support max 30 items
        const providerIds = user.linkedProviderIds.slice(0, 30);

        // Note: Using only 'where' clauses to avoid needing composite indexes
        // Sorting is done client-side
        const q = query(
          collection(db, 'provider_stats'),
          where('providerId', 'in', providerIds),
          where('month', '==', selectedMonth)
        );

        const snapshot = await getDocs(q);
        const statsList: ProviderMonthlyStats[] = [];

        snapshot.forEach((doc) => {
          statsList.push({
            id: doc.id,
            ...doc.data(),
          } as ProviderMonthlyStats);
        });

        // Sort client-side to avoid needing composite Firestore index
        statsList.sort((a, b) => a.providerName.localeCompare(b.providerName));

        setStats(statsList);
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError('Erreur lors du chargement des statistiques');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user?.linkedProviderIds, selectedMonth]);

  const agencyStats = useMemo(() => {
    if (stats.length === 0) return null;
    return aggregateAgencyStats(stats, selectedMonth);
  }, [stats, selectedMonth]);

  return {
    stats,
    agencyStats,
    isLoading,
    error,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
  };
}

export default useProviderStats;
