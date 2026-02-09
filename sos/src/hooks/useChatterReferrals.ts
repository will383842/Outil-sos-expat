/**
 * useChatterReferrals Hook
 *
 * Manages the 2-level referral system data:
 * - Filleuls N1/N2
 * - Referral commissions
 * - Tier progress
 * - Early adopter status
 */

import { useState, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChatterReferralDashboardData,
  ChatterFilleulN1,
  ChatterFilleulN2,
  ChatterReferralStats,
  ChatterTierProgress,
  ChatterEarlyAdopterStatus,
  ChatterActivePromotion,
  ChatterReferralCommission,
} from "@/types/chatter";

interface UseChatterReferralsReturn {
  // Data
  dashboardData: ChatterReferralDashboardData | null;
  stats: ChatterReferralStats | null;
  filleulsN1: ChatterFilleulN1[];
  filleulsN2: ChatterFilleulN2[];
  recentCommissions: ChatterReferralDashboardData["recentCommissions"];
  tierProgress: ChatterTierProgress | null;
  earlyAdopter: ChatterEarlyAdopterStatus | null;
  activePromotion: ChatterActivePromotion | null;

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshDashboard: () => Promise<void>;
}

export function useChatterReferrals(): UseChatterReferralsReturn {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<ChatterReferralDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const functions = getFunctions(undefined, "europe-west1");

  const fetchDashboard = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const getReferralDashboard = httpsCallable<void, ChatterReferralDashboardData>(
        functions,
        "getReferralDashboard"
      );

      const result = await getReferralDashboard();
      setDashboardData(result.data);
    } catch (err: any) {
      console.error("[useChatterReferrals] Error fetching dashboard:", err);
      setError(err.message || "Failed to load referral dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [user, functions]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
  }, [user, fetchDashboard]);

  return {
    // Data
    dashboardData,
    stats: dashboardData?.stats || null,
    filleulsN1: dashboardData?.filleulsN1 || [],
    filleulsN2: dashboardData?.filleulsN2 || [],
    recentCommissions: dashboardData?.recentCommissions || [],
    tierProgress: dashboardData?.tierProgress || null,
    earlyAdopter: dashboardData?.earlyAdopter || null,
    activePromotion: dashboardData?.activePromotion || null,

    // State
    isLoading,
    error,

    // Actions
    refreshDashboard: fetchDashboard,
  };
}

/**
 * Calculate filleul progression percentage to next threshold
 */
export function getFilleulProgressPercent(clientEarnings: number): {
  progressTo10: number;
  progressTo50: number;
  currentPhase: "to10" | "to50" | "qualified";
} {
  const THRESHOLD_10 = 1000; // $10 in cents
  const THRESHOLD_50 = 5000; // $50 in cents

  if (clientEarnings >= THRESHOLD_50) {
    return {
      progressTo10: 100,
      progressTo50: 100,
      currentPhase: "qualified",
    };
  }

  if (clientEarnings >= THRESHOLD_10) {
    return {
      progressTo10: 100,
      progressTo50: Math.min(100, Math.round((clientEarnings / THRESHOLD_50) * 100)),
      currentPhase: "to50",
    };
  }

  return {
    progressTo10: Math.min(100, Math.round((clientEarnings / THRESHOLD_10) * 100)),
    progressTo50: 0,
    currentPhase: "to10",
  };
}

/**
 * Format tier bonus display
 */
export function formatTierBonus(tier: number): string {
  const bonuses: Record<number, string> = {
    5: "$15",
    10: "$35",
    20: "$75",
    50: "$250",
    100: "$600",
    500: "$4,000",
  };
  return bonuses[tier] || "";
}

/**
 * Get next tier info
 */
export function getNextTierInfo(
  qualifiedCount: number,
  paidTiers: number[]
): { tier: number; needed: number; bonus: string } | null {
  const tiers = [5, 10, 20, 50, 100, 500];

  for (const tier of tiers) {
    if (!paidTiers.includes(tier) && qualifiedCount < tier) {
      return {
        tier,
        needed: tier - qualifiedCount,
        bonus: formatTierBonus(tier),
      };
    }
  }

  return null; // All tiers achieved
}
