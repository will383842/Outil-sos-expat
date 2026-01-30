/**
 * useEarlyAdopters Hook
 *
 * Public hook for viewing early adopter (Pioneer) counters by country.
 * Used on the public Pioneers page.
 */

import { useState, useEffect, useCallback } from "react";
import { getFirestore, collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { ChatterEarlyAdopterCounter } from "@/types/chatter";

interface UseEarlyAdoptersReturn {
  // Data
  counters: ChatterEarlyAdopterCounter[];
  openCountries: ChatterEarlyAdopterCounter[];
  totalEarlyAdopters: number;
  totalOpenSlots: number;

  // State
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  getCounterByCountry: (countryCode: string) => ChatterEarlyAdopterCounter | null;
}

export function useEarlyAdopters(): UseEarlyAdoptersReturn {
  const [counters, setCounters] = useState<ChatterEarlyAdopterCounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const db = getFirestore();

  const fetchCounters = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const countersRef = collection(db, "chatter_early_adopter_counters");
      const q = query(countersRef, orderBy("currentCount", "desc"));
      const snapshot = await getDocs(q);

      const fetchedCounters: ChatterEarlyAdopterCounter[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          countryCode: doc.id,
          countryName: data.countryName || doc.id,
          currentCount: data.currentCount || 0,
          maxEarlyAdopters: data.maxEarlyAdopters || 50,
          remainingSlots: data.remainingSlots || 50,
          isOpen: data.isOpen ?? true,
        };
      });

      setCounters(fetchedCounters);
    } catch (err: any) {
      console.error("[useEarlyAdopters] Error:", err);
      setError(err.message || "Failed to load early adopter counters");
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    fetchCounters();
  }, [fetchCounters]);

  const openCountries = counters.filter((c) => c.isOpen && c.remainingSlots > 0);

  const totalEarlyAdopters = counters.reduce((sum, c) => sum + c.currentCount, 0);
  const totalOpenSlots = counters.reduce((sum, c) => sum + c.remainingSlots, 0);

  const getCounterByCountry = (countryCode: string): ChatterEarlyAdopterCounter | null => {
    return counters.find((c) => c.countryCode === countryCode) || null;
  };

  return {
    counters,
    openCountries,
    totalEarlyAdopters,
    totalOpenSlots,
    isLoading,
    error,
    refresh: fetchCounters,
    getCounterByCountry,
  };
}

/**
 * Get country flag emoji from country code
 */
export function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Format remaining slots for display
 */
export function formatRemainingSlots(remaining: number, locale: "fr" | "en" = "fr"): string {
  if (remaining === 0) {
    return locale === "fr" ? "Complet" : "Full";
  }
  if (remaining === 1) {
    return locale === "fr" ? "1 place" : "1 spot";
  }
  return locale === "fr" ? `${remaining} places` : `${remaining} spots`;
}

/**
 * Get urgency level based on remaining slots
 */
export function getUrgencyLevel(remaining: number, max: number): "none" | "low" | "medium" | "high" {
  const percent = (remaining / max) * 100;

  if (remaining === 0) return "none";
  if (percent <= 10) return "high";
  if (percent <= 30) return "medium";
  if (percent <= 50) return "low";
  return "none";
}
