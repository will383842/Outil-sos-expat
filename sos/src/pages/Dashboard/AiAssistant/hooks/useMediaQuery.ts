/**
 * useMediaQuery - Responsive Breakpoint Hook for AI Assistant
 *
 * Provides reactive breakpoint detection with mobile-first approach.
 * Optimized for performance with debounced updates and SSR safety.
 *
 * Features:
 * - Mobile-first breakpoint detection
 * - Device type flags (isMobile, isTablet, isDesktop)
 * - Touch capability detection
 * - Orientation tracking
 * - Safe area insets for notched devices
 * - SSR-safe with hydration support
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface Breakpoints {
  sm: number;  // Small mobile (640px)
  md: number;  // Tablet (768px)
  lg: number;  // Desktop (1024px)
  xl: number;  // Large desktop (1280px)
  xxl: number; // Extra large (1536px)
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface MediaQueryState {
  // Device type flags
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;

  // Convenience flags
  isMobileOrTablet: boolean;
  isTabletOrDesktop: boolean;

  // Current breakpoint
  breakpoint: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

  // Dimensions
  width: number;
  height: number;

  // Orientation
  isPortrait: boolean;
  isLandscape: boolean;

  // Touch capability
  isTouchDevice: boolean;
  supportsHover: boolean;

  // Safe areas (for notched devices)
  safeAreaInsets: SafeAreaInsets;

  // Initialization state
  isReady: boolean;
}

export interface UseMediaQueryOptions {
  /** Custom breakpoints override */
  breakpoints?: Partial<Breakpoints>;
  /** Debounce delay for resize events (ms) */
  debounceDelay?: number;
  /** Enable SSR mode (returns mobile-first defaults) */
  ssr?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_BREAKPOINTS: Breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
};

const INITIAL_STATE: MediaQueryState = {
  isMobile: true, // Mobile-first default
  isTablet: false,
  isDesktop: false,
  isLargeDesktop: false,
  isMobileOrTablet: true,
  isTabletOrDesktop: false,
  breakpoint: 'sm',
  width: 0,
  height: 0,
  isPortrait: true,
  isLandscape: false,
  isTouchDevice: false,
  supportsHover: false,
  safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  isReady: false,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get safe area insets from CSS environment variables
 */
function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const computedStyle = getComputedStyle(document.documentElement);

  const getInset = (property: string): number => {
    const value = computedStyle.getPropertyValue(property);
    return parseInt(value, 10) || 0;
  };

  return {
    top: getInset('--safe-area-inset-top') || getInset('env(safe-area-inset-top)'),
    bottom: getInset('--safe-area-inset-bottom') || getInset('env(safe-area-inset-bottom)'),
    left: getInset('--safe-area-inset-left') || getInset('env(safe-area-inset-left)'),
    right: getInset('--safe-area-inset-right') || getInset('env(safe-area-inset-right)'),
  };
}

/**
 * Detect touch capability
 */
function detectTouchCapability(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Detect hover capability
 */
function detectHoverCapability(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(hover: hover)').matches;
}

/**
 * Determine current breakpoint based on width
 */
function getBreakpoint(width: number, breakpoints: Breakpoints): MediaQueryState['breakpoint'] {
  if (width >= breakpoints.xxl) return 'xxl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  return 'sm';
}

// ============================================================================
// HOOK
// ============================================================================

export function useMediaQuery(options: UseMediaQueryOptions = {}): MediaQueryState {
  const {
    breakpoints: customBreakpoints,
    debounceDelay = 100,
    ssr = false,
  } = options;

  // Merge custom breakpoints with defaults
  const breakpoints = useMemo<Breakpoints>(
    () => ({ ...DEFAULT_BREAKPOINTS, ...customBreakpoints }),
    [customBreakpoints]
  );

  // State
  const [state, setState] = useState<MediaQueryState>(() => {
    // SSR mode or initial render - return mobile-first defaults
    if (ssr || typeof window === 'undefined') {
      return INITIAL_STATE;
    }

    // Client-side initial state
    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width, breakpoints);

    return {
      isMobile: width < breakpoints.md,
      isTablet: width >= breakpoints.md && width < breakpoints.lg,
      isDesktop: width >= breakpoints.lg,
      isLargeDesktop: width >= breakpoints.xl,
      isMobileOrTablet: width < breakpoints.lg,
      isTabletOrDesktop: width >= breakpoints.md,
      breakpoint,
      width,
      height,
      isPortrait: height > width,
      isLandscape: width > height,
      isTouchDevice: detectTouchCapability(),
      supportsHover: detectHoverCapability(),
      safeAreaInsets: getSafeAreaInsets(),
      isReady: true,
    };
  });

  // Update state based on current viewport
  const updateState = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const breakpoint = getBreakpoint(width, breakpoints);

    setState((prev) => {
      // Avoid unnecessary re-renders
      if (
        prev.width === width &&
        prev.height === height &&
        prev.isReady
      ) {
        return prev;
      }

      return {
        isMobile: width < breakpoints.md,
        isTablet: width >= breakpoints.md && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg,
        isLargeDesktop: width >= breakpoints.xl,
        isMobileOrTablet: width < breakpoints.lg,
        isTabletOrDesktop: width >= breakpoints.md,
        breakpoint,
        width,
        height,
        isPortrait: height > width,
        isLandscape: width > height,
        isTouchDevice: detectTouchCapability(),
        supportsHover: detectHoverCapability(),
        safeAreaInsets: getSafeAreaInsets(),
        isReady: true,
      };
    });
  }, [breakpoints]);

  // Setup event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial update
    updateState();

    // Debounced resize handler
    let timeoutId: ReturnType<typeof setTimeout>;
    let rafId: number;

    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        timeoutId = setTimeout(updateState, debounceDelay);
      });
    };

    // Orientation change handler (more responsive)
    const handleOrientationChange = () => {
      // Small delay to let browser update dimensions
      setTimeout(updateState, 150);
    };

    // Media query listeners for breakpoint changes (more accurate)
    const mediaQueries = [
      window.matchMedia(`(min-width: ${breakpoints.md}px)`),
      window.matchMedia(`(min-width: ${breakpoints.lg}px)`),
      window.matchMedia(`(min-width: ${breakpoints.xl}px)`),
    ];

    const handleMediaChange = () => updateState();

    // Add listeners
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    mediaQueries.forEach((mq) => {
      if (mq.addEventListener) {
        mq.addEventListener('change', handleMediaChange);
      } else {
        // Fallback for older browsers
        mq.addListener(handleMediaChange);
      }
    });

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      mediaQueries.forEach((mq) => {
        if (mq.removeEventListener) {
          mq.removeEventListener('change', handleMediaChange);
        } else {
          mq.removeListener(handleMediaChange);
        }
      });
    };
  }, [updateState, debounceDelay, breakpoints]);

  return state;
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Simple hook that returns only the device type flags
 */
export function useDeviceType(): Pick<
  MediaQueryState,
  'isMobile' | 'isTablet' | 'isDesktop' | 'isReady'
> {
  const { isMobile, isTablet, isDesktop, isReady } = useMediaQuery();
  return { isMobile, isTablet, isDesktop, isReady };
}

/**
 * Hook that returns a single boolean for a specific media query
 */
export function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Hook that returns true if the screen is smaller than the given breakpoint
 */
export function useIsSmallerThan(breakpoint: keyof Breakpoints): boolean {
  const { width, isReady } = useMediaQuery();
  const breakpointValue = DEFAULT_BREAKPOINTS[breakpoint];

  if (!isReady) return true; // Mobile-first default

  return width < breakpointValue;
}

/**
 * Hook that returns true if the screen is larger than the given breakpoint
 */
export function useIsLargerThan(breakpoint: keyof Breakpoints): boolean {
  const { width, isReady } = useMediaQuery();
  const breakpointValue = DEFAULT_BREAKPOINTS[breakpoint];

  if (!isReady) return false; // Mobile-first default

  return width >= breakpointValue;
}

/**
 * Hook for detecting preferred color scheme
 */
export function usePrefersDarkMode(): boolean {
  return useMatchMedia('(prefers-color-scheme: dark)');
}

/**
 * Hook for detecting reduced motion preference
 */
export function usePrefersReducedMotion(): boolean {
  return useMatchMedia('(prefers-reduced-motion: reduce)');
}

// Default export
export default useMediaQuery;
