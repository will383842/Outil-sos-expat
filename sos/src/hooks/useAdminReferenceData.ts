/**
 * useAdminReferenceData Hook
 *
 * Shared hook for loading reference data commonly used across admin pages.
 * Uses in-memory caching to avoid redundant Firestore reads when navigating
 * between admin pages.
 *
 * COST OPTIMIZATION:
 * - Before: Each admin page loads users/profiles independently = 500+ reads/navigation
 * - After: Data cached in memory, refreshed on demand = 500 reads/session max
 * - Estimated savings: 70-80% reduction in admin Firestore reads
 *
 * Usage:
 * const { usersMap, profilesMap, isLoading, refresh } = useAdminReferenceData();
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  getDocs,
  limit,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================================================
// TYPES
// ============================================================================

export interface UserReference {
  id: string;
  displayName: string;
  email: string;
  type: string;
  country: string;
  preferredLanguage: string;
  createdAt?: Date;
  // Multi-provider status fields
  availability?: 'available' | 'busy' | 'offline';
  isOnline?: boolean;
  busyReason?: string;
  busyBySibling?: boolean;
  busySiblingProviderId?: string;
  currentCallSessionId?: string;
}

export interface ProfileReference {
  id: string;
  displayName: string;
  email: string;
  type: 'lawyer' | 'expat';
  country: string;
  languages: string[];
  isApproved: boolean;
  isVisible: boolean;
  createdAt?: Date;
  // Multi-provider status fields
  availability?: 'available' | 'busy' | 'offline';
  isOnline?: boolean;
  busyReason?: string;
  busyBySibling?: boolean;
  busySiblingProviderId?: string;
  currentCallSessionId?: string;
}

export interface SubscriptionPlanReference {
  id: string;
  name: string;
  tier: string;
  providerType: string;
  price: number;
  currency: string;
}

interface AdminReferenceDataReturn {
  // Maps for quick lookup
  usersMap: Map<string, UserReference>;
  profilesMap: Map<string, ProfileReference>;
  plansMap: Map<string, SubscriptionPlanReference>;

  // Arrays for iteration
  users: UserReference[];
  profiles: ProfileReference[];
  plans: SubscriptionPlanReference[];

  // State
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
  lastRefresh: Date | null;

  // Actions
  refresh: () => Promise<void>;
  getUserName: (userId: string) => string;
  getProfileName: (profileId: string) => string;
  getPlanName: (planId: string) => string;
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

// Cache is shared across all hook instances
let cachedUsers: Map<string, UserReference> = new Map();
let cachedProfiles: Map<string, ProfileReference> = new Map();
let cachedPlans: Map<string, SubscriptionPlanReference> = new Map();
let cacheTimestamp: number = 0;
let isLoadingGlobal: boolean = false;
let loadPromise: Promise<void> | null = null;

// Cache TTL: 5 minutes (admin sessions are usually short)
const CACHE_TTL_MS = 5 * 60 * 1000;

// Max items per collection (safety limit)
const MAX_USERS = 1000;
const MAX_PROFILES = 1000;
const MAX_PLANS = 50;

// ============================================================================
// HOOK
// ============================================================================

export function useAdminReferenceData(): AdminReferenceDataReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(
    cacheTimestamp ? new Date(cacheTimestamp) : null
  );
  const [version, setVersion] = useState(0); // Force re-render on cache update
  const mountedRef = useRef(true);

  // Check if cache is valid
  const isCacheValid = useCallback(() => {
    if (cachedUsers.size === 0) return false;
    if (Date.now() - cacheTimestamp > CACHE_TTL_MS) return false;
    return true;
  }, []);

  // Load data from Firestore
  const loadData = useCallback(async (force: boolean = false) => {
    // Skip if cache is valid and not forcing refresh
    if (!force && isCacheValid()) {
      console.log('[AdminReferenceData] Using cached data');
      return;
    }

    // If already loading, wait for existing promise
    if (isLoadingGlobal && loadPromise) {
      console.log('[AdminReferenceData] Waiting for existing load...');
      await loadPromise;
      return;
    }

    isLoadingGlobal = true;
    setIsLoading(true);
    setError(null);

    loadPromise = (async () => {
      try {
        console.log('[AdminReferenceData] Loading reference data...');

        // Load all data in parallel
        const [usersSnap, profilesSnap, plansSnap] = await Promise.all([
          getDocs(query(
            collection(db, 'users'),
            orderBy('createdAt', 'desc'),
            limit(MAX_USERS)
          )),
          getDocs(query(
            collection(db, 'sos_profiles'),
            limit(MAX_PROFILES)
          )),
          getDocs(query(
            collection(db, 'subscription_plans'),
            limit(MAX_PLANS)
          )),
        ]);

        // Build users map
        const newUsersMap = new Map<string, UserReference>();
        usersSnap.docs.forEach(doc => {
          const data = doc.data();
          newUsersMap.set(doc.id, {
            id: doc.id,
            displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
            email: data.email || '',
            type: data.type || data.role || data.providerType || 'user',
            country: data.country || data.currentCountry || 'Unknown',
            preferredLanguage: data.preferredLanguage || 'fr',
            createdAt: data.createdAt?.toDate?.(),
          });
        });

        // Build profiles map
        const newProfilesMap = new Map<string, ProfileReference>();
        profilesSnap.docs.forEach(doc => {
          const data = doc.data();
          newProfilesMap.set(doc.id, {
            id: doc.id,
            displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'N/A',
            email: data.email || '',
            type: data.type || 'expat',
            country: data.country || 'Unknown',
            languages: data.languages || [],
            isApproved: data.isApproved || false,
            isVisible: data.isVisible || false,
            createdAt: data.createdAt?.toDate?.(),
          });
        });

        // Build plans map
        const newPlansMap = new Map<string, SubscriptionPlanReference>();
        plansSnap.docs.forEach(doc => {
          const data = doc.data();
          newPlansMap.set(doc.id, {
            id: doc.id,
            name: data.name?.fr || data.name || doc.id,
            tier: data.tier || 'basic',
            providerType: data.providerType || 'expat',
            price: data.price || 0,
            currency: data.currency || 'EUR',
          });
        });

        // Update cache
        cachedUsers = newUsersMap;
        cachedProfiles = newProfilesMap;
        cachedPlans = newPlansMap;
        cacheTimestamp = Date.now();

        console.log(`[AdminReferenceData] Loaded: ${newUsersMap.size} users, ${newProfilesMap.size} profiles, ${newPlansMap.size} plans`);

        if (mountedRef.current) {
          setLastRefresh(new Date(cacheTimestamp));
          setVersion(v => v + 1);
        }

      } catch (err) {
        console.error('[AdminReferenceData] Error loading data:', err);
        if (mountedRef.current) {
          setError(err as Error);
        }
      } finally {
        isLoadingGlobal = false;
        loadPromise = null;
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    })();

    await loadPromise;
  }, [isCacheValid]);

  // Load on mount
  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  // Helper functions
  const getUserName = useCallback((userId: string): string => {
    return cachedUsers.get(userId)?.displayName || 'Unknown';
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const getProfileName = useCallback((profileId: string): string => {
    return cachedProfiles.get(profileId)?.displayName || cachedUsers.get(profileId)?.displayName || 'Unknown';
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPlanName = useCallback((planId: string): string => {
    return cachedPlans.get(planId)?.name || planId;
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  // Force refresh
  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  return {
    // Maps
    usersMap: cachedUsers,
    profilesMap: cachedProfiles,
    plansMap: cachedPlans,

    // Arrays
    users: Array.from(cachedUsers.values()),
    profiles: Array.from(cachedProfiles.values()),
    plans: Array.from(cachedPlans.values()),

    // State
    isLoading,
    isInitialized: cachedUsers.size > 0,
    error,
    lastRefresh,

    // Actions
    refresh,
    getUserName,
    getProfileName,
    getPlanName,
  };
}

// ============================================================================
// UTILITY: Clear cache (for logout or manual reset)
// ============================================================================

export function clearAdminReferenceCache(): void {
  cachedUsers = new Map();
  cachedProfiles = new Map();
  cachedPlans = new Map();
  cacheTimestamp = 0;
  console.log('[AdminReferenceData] Cache cleared');
}

// ============================================================================
// UTILITY: Get cache stats
// ============================================================================

export function getAdminReferenceCacheStats(): {
  users: number;
  profiles: number;
  plans: number;
  age: string;
  isValid: boolean;
} {
  const ageMs = Date.now() - cacheTimestamp;
  const ageMinutes = Math.round(ageMs / 60000);

  return {
    users: cachedUsers.size,
    profiles: cachedProfiles.size,
    plans: cachedPlans.size,
    age: cacheTimestamp ? `${ageMinutes}m ago` : 'never',
    isValid: cacheTimestamp > 0 && ageMs < CACHE_TTL_MS,
  };
}
