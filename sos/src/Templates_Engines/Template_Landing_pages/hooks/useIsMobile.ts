/**
 * ============================================================================
 * HOOK - useIsMobile
 * ============================================================================
 *
 * Détection responsive avec breakpoints alignés sur Tailwind CSS.
 * Utilise matchMedia pour une détection réactive et performante.
 */

import { useState, useEffect, useCallback } from 'react';

/** Breakpoints Tailwind CSS (mobile-first) */
export const BREAKPOINTS = {
  xs: 320,   // Petits mobiles
  sm: 640,   // Mobiles standard
  md: 768,   // Tablettes portrait
  lg: 1024,  // Tablettes paysage / petit desktop
  xl: 1280,  // Desktop
  '2xl': 1536, // Grand écran
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * Hook pour détecter si l'écran est en dessous d'un breakpoint
 *
 * @param breakpoint - Largeur en pixels ou clé de breakpoint
 * @returns true si la largeur d'écran est inférieure au breakpoint
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile(); // < 768px par défaut
 * const isSmallMobile = useIsMobile(640);
 * const isTablet = useIsMobile('lg');
 *
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 * ```
 */
export function useIsMobile(breakpoint: number | BreakpointKey = 'md'): boolean {
  const breakpointValue = typeof breakpoint === 'number'
    ? breakpoint
    : BREAKPOINTS[breakpoint];

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpointValue;
  });

  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth < breakpointValue);
  }, [breakpointValue]);

  useEffect(() => {
    checkMobile();

    const mediaQuery = window.matchMedia(`(max-width: ${breakpointValue - 1}px)`);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    window.addEventListener('resize', checkMobile);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
      window.removeEventListener('resize', checkMobile);
    };
  }, [breakpointValue, checkMobile]);

  return isMobile;
}

/**
 * Hook pour obtenir le breakpoint actuel
 *
 * @returns Le nom du breakpoint actuel
 *
 * @example
 * ```tsx
 * const breakpoint = useBreakpoint(); // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 *
 * const columnsMap = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4, '2xl': 4 };
 * const columns = columnsMap[breakpoint];
 * ```
 */
export function useBreakpoint(): BreakpointKey {
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>('md');

  useEffect(() => {
    const getBreakpoint = (): BreakpointKey => {
      const width = window.innerWidth;

      if (width < BREAKPOINTS.sm) return 'xs';
      if (width < BREAKPOINTS.md) return 'sm';
      if (width < BREAKPOINTS.lg) return 'md';
      if (width < BREAKPOINTS.xl) return 'lg';
      if (width < BREAKPOINTS['2xl']) return 'xl';
      return '2xl';
    };

    const handleResize = () => {
      setBreakpoint(getBreakpoint());
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

/**
 * Hook pour détecter si c'est un appareil tactile
 *
 * @returns true si l'appareil supporte le touch
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouch;
}
