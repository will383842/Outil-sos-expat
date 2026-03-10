/**
 * useChatterReferrals Hook
 *
 * Manages the 2-level referral system data:
 * - Filleuls N1/N2
 * - Referral commissions
 * - Tier progress
 * - Active promotions
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { functionsAffiliate } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChatterReferralDashboardData,
  ChatterFilleulN1,
  ChatterFilleulN2,
  ChatterReferralStats,
  ChatterTierProgress,
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
  activePromotion: ChatterActivePromotion | null;

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshDashboard: () => Promise<void>;
}

const REFERRAL_CACHE_TTL = 120_000; // 2min cache

export function useChatterReferrals(): UseChatterReferralsReturn {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<ChatterReferralDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ data: ChatterReferralDashboardData; timestamp: number } | null>(null);

  const fetchDashboard = useCallback(async (force = false) => {
    if (!user) return;

    // Check cache
    if (!force && cacheRef.current && (Date.now() - cacheRef.current.timestamp < REFERRAL_CACHE_TTL)) {
      setDashboardData(cacheRef.current.data);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const getReferralDashboard = httpsCallable<void, ChatterReferralDashboardData>(
        functionsAffiliate,
        "getReferralDashboard"
      );

      const result = await getReferralDashboard();
      cacheRef.current = { data: result.data, timestamp: Date.now() };
      setDashboardData(result.data);
    } catch (err: any) {
      console.error("[useChatterReferrals] Error fetching dashboard:", err);
      setError(err.message || "Failed to load referral dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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

/** Default milestones (fallback when config not available) */
const DEFAULT_MILESTONES: Array<{ count: number; bonus: number }> = [
  { count: 5, bonus: 1500 },
  { count: 10, bonus: 3500 },
  { count: 20, bonus: 7500 },
  { count: 50, bonus: 25000 },
  { count: 100, bonus: 60000 },
  { count: 500, bonus: 400000 },
];

/**
 * Format tier bonus display (cents → dollar string)
 */
export function formatTierBonus(
  tier: number,
  milestones?: Array<{ count: number; bonus: number }>
): string {
  const ms = milestones ?? DEFAULT_MILESTONES;
  const match = ms.find((m) => m.count === tier);
  if (!match) return "";
  const dollars = match.bonus / 100;
  return dollars >= 1000
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars}`;
}

/**
 * Get next tier info
 */
export function getNextTierInfo(
  qualifiedCount: number,
  paidTiers: number[],
  milestones?: Array<{ count: number; bonus: number }>
): { tier: number; needed: number; bonus: string } | null {
  const ms = milestones ?? DEFAULT_MILESTONES;
  const tiers = ms.map((m) => m.count);

  for (const tier of tiers) {
    if (!paidTiers.includes(tier) && qualifiedCount < tier) {
      return {
        tier,
        needed: tier - qualifiedCount,
        bonus: formatTierBonus(tier, ms),
      };
    }
  }

  return null; // All tiers achieved
}
