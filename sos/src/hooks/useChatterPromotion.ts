/**
 * useChatterPromotion Hook
 *
 * Manages active promotions for chatters:
 * - Fetch active promotions
 * - Track promotion status
 */

import { useState, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/contexts/AuthContext";
import { ChatterPromotion, ChatterActivePromotion } from "@/types/chatter";

interface UseChatterPromotionReturn {
  // Data
  activePromotion: ChatterActivePromotion | null;
  allPromotions: ChatterPromotion[];

  // State
  isLoading: boolean;
  error: string | null;

  // Computed
  hasActivePromotion: boolean;
  currentMultiplier: number;
  promotionEndsIn: string | null;

  // Actions
  refresh: () => Promise<void>;
}

export function useChatterPromotion(): UseChatterPromotionReturn {
  const { user } = useAuth();
  const [activePromotion, setActivePromotion] = useState<ChatterActivePromotion | null>(null);
  const [allPromotions, setAllPromotions] = useState<ChatterPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const functions = getFunctions(undefined, "europe-west1");

  const fetchPromotions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get referral dashboard which includes active promotion
      const getReferralDashboard = httpsCallable<void, { activePromotion: ChatterActivePromotion | null }>(
        functions,
        "getReferralDashboard"
      );

      const result = await getReferralDashboard();
      setActivePromotion(result.data.activePromotion);
    } catch (err: any) {
      console.error("[useChatterPromotion] Error:", err);
      setError(err.message || "Failed to load promotions");
    } finally {
      setIsLoading(false);
    }
  }, [user, functions]);

  useEffect(() => {
    if (user) {
      fetchPromotions();
    }
  }, [user, fetchPromotions]);

  // Calculate time remaining
  const getTimeRemaining = (): string | null => {
    if (!activePromotion?.endsAt) return null;

    const endDate = new Date(activePromotion.endsAt);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}j ${hours}h`;
    }
    return `${hours}h`;
  };

  return {
    activePromotion,
    allPromotions,
    isLoading,
    error,
    hasActivePromotion: !!activePromotion,
    currentMultiplier: activePromotion?.multiplier || 1,
    promotionEndsIn: getTimeRemaining(),
    refresh: fetchPromotions,
  };
}

/**
 * Format promotion multiplier for display
 */
export function formatMultiplier(multiplier: number): string {
  if (multiplier <= 1) return "";
  return `x${multiplier}`;
}

/**
 * Get promotion type label
 */
export function getPromotionTypeLabel(
  type: ChatterPromotion["type"],
  locale: "fr" | "en" = "fr"
): string {
  const labels: Record<ChatterPromotion["type"], { fr: string; en: string }> = {
    hackathon: { fr: "Hackathon", en: "Hackathon" },
    bonus_weekend: { fr: "Weekend Bonus", en: "Bonus Weekend" },
    country_challenge: { fr: "Challenge Pays", en: "Country Challenge" },
    special_event: { fr: "Evenement Special", en: "Special Event" },
  };

  return labels[type]?.[locale] || type;
}
