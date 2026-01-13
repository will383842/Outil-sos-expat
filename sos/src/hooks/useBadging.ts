// src/hooks/useBadging.ts
/**
 * Hook for App Badging API
 *
 * Allows showing notification badges on the app icon
 * (PWA installed on home screen)
 *
 * Supported on:
 * - Chrome 81+ (desktop & Android)
 * - Edge 81+
 * - Safari 17+ (iOS 17+)
 */

import { useCallback, useEffect, useRef } from 'react';

interface Navigator {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

interface UseBadgingReturn {
  /** Whether Badging API is supported */
  isSupported: boolean;
  /** Set badge count on app icon */
  setBadge: (count: number) => Promise<boolean>;
  /** Clear badge from app icon */
  clearBadge: () => Promise<boolean>;
  /** Update badge when count changes (auto-clears when 0) */
  updateBadge: (count: number) => Promise<boolean>;
}

/**
 * Hook to manage PWA app icon badges
 *
 * @example
 * ```tsx
 * const { setBadge, clearBadge, isSupported } = useBadging();
 *
 * // Show badge with count
 * await setBadge(5);
 *
 * // Clear badge
 * await clearBadge();
 * ```
 */
export function useBadging(): UseBadgingReturn {
  const lastCount = useRef<number>(0);

  // Check if Badging API is supported
  const isSupported =
    typeof window !== 'undefined' &&
    'setAppBadge' in navigator &&
    'clearAppBadge' in navigator;

  /**
   * Set badge count on app icon
   * @param count - Number to show on badge (0 or undefined shows dot, >0 shows count)
   */
  const setBadge = useCallback(
    async (count: number): Promise<boolean> => {
      if (!isSupported) {
        console.warn('[Badging] API not supported');
        return false;
      }

      try {
        const nav = navigator as Navigator;
        if (count > 0) {
          await nav.setAppBadge?.(count);
        } else {
          await nav.setAppBadge?.(); // Shows dot without count
        }
        lastCount.current = count;
        return true;
      } catch (error) {
        console.error('[Badging] Failed to set badge:', error);
        return false;
      }
    },
    [isSupported]
  );

  /**
   * Clear badge from app icon
   */
  const clearBadge = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const nav = navigator as Navigator;
      await nav.clearAppBadge?.();
      lastCount.current = 0;
      return true;
    } catch (error) {
      console.error('[Badging] Failed to clear badge:', error);
      return false;
    }
  }, [isSupported]);

  /**
   * Update badge, auto-clears when count is 0
   */
  const updateBadge = useCallback(
    async (count: number): Promise<boolean> => {
      // Only update if count changed
      if (count === lastCount.current) {
        return true;
      }

      if (count <= 0) {
        return clearBadge();
      }
      return setBadge(count);
    },
    [setBadge, clearBadge]
  );

  // Clear badge on unmount (optional cleanup)
  useEffect(() => {
    return () => {
      // Don't clear badge on component unmount - keep showing notifications
      // clearBadge();
    };
  }, []);

  return {
    isSupported,
    setBadge,
    clearBadge,
    updateBadge,
  };
}

/**
 * Utility to update badge from outside React (e.g., Service Worker message)
 */
export async function setAppBadge(count: number): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('setAppBadge' in navigator)
  ) {
    return false;
  }

  try {
    const nav = navigator as Navigator;
    if (count > 0) {
      await nav.setAppBadge?.(count);
    } else {
      await nav.clearAppBadge?.();
    }
    return true;
  } catch (error) {
    console.error('[Badging] Failed to update badge:', error);
    return false;
  }
}

/**
 * Clear badge utility
 */
export async function clearAppBadge(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('clearAppBadge' in navigator)
  ) {
    return false;
  }

  try {
    const nav = navigator as Navigator;
    await nav.clearAppBadge?.();
    return true;
  } catch (error) {
    console.error('[Badging] Failed to clear badge:', error);
    return false;
  }
}

export default useBadging;
