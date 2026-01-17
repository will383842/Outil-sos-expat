/**
 * =============================================================================
 * USE MEDIA QUERY - Hook professionnel pour la détection responsive
 * =============================================================================
 *
 * Fournit une détection réactive des breakpoints et préférences utilisateur.
 * Scalable et optimisé pour les performances (debounce, SSR-safe).
 *
 * @example
 * const { isMobile, isTablet, isDesktop } = useBreakpoint();
 * const isDark = useMediaQuery('(prefers-color-scheme: dark)');
 * const prefersReducedMotion = usePrefersReducedMotion();
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// BREAKPOINTS - Design tokens pour la cohérence
// =============================================================================

export const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// =============================================================================
// USE MEDIA QUERY - Hook de base
// =============================================================================

/**
 * Hook générique pour détecter un media query CSS
 * @param query - La media query CSS à évaluer
 * @returns boolean - true si la query correspond
 */
export function useMediaQuery(query: string): boolean {
  // SSR-safe: window n'existe pas côté serveur
  const getMatches = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    // Handler pour les changements
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Initialiser avec la valeur actuelle
    setMatches(mediaQuery.matches);

    // Écouter les changements
    // Note: addEventListener est plus moderne que addListener (deprecated)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback pour les vieux navigateurs
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

// =============================================================================
// USE BREAKPOINT - Détection des breakpoints Tailwind
// =============================================================================

export interface BreakpointResult {
  /** Écran < 640px (mobile phones) */
  isMobile: boolean;
  /** Écran >= 640px et < 768px (large phones, small tablets) */
  isSmallTablet: boolean;
  /** Écran >= 768px et < 1024px (tablets) */
  isTablet: boolean;
  /** Écran >= 1024px (laptops, desktops) */
  isDesktop: boolean;
  /** Écran >= 1280px (large desktops) */
  isLargeDesktop: boolean;
  /** Écran >= 1536px (ultra-wide) */
  isUltraWide: boolean;
  /** Breakpoint actuel */
  current: Breakpoint;
  /** Largeur actuelle de l'écran */
  width: number;
  /** Est-ce un écran tactile ? */
  isTouchDevice: boolean;
}

/**
 * Hook pour détecter le breakpoint actuel et fournir des helpers
 * @returns BreakpointResult - Informations sur le breakpoint actuel
 */
export function useBreakpoint(): BreakpointResult {
  const [width, setWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      // Debounce pour éviter trop de re-renders
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWidth(window.innerWidth);
      }, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Détecter si c'est un écran tactile
  const isTouchDevice = useMediaQuery('(pointer: coarse)');

  // Calculer les breakpoints et le breakpoint actuel
  return useMemo(() => {
    const isMobile = width < BREAKPOINTS.sm;
    const isSmallTablet = width >= BREAKPOINTS.sm && width < BREAKPOINTS.md;
    const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
    const isDesktop = width >= BREAKPOINTS.lg;
    const isLargeDesktop = width >= BREAKPOINTS.xl;
    const isUltraWide = width >= BREAKPOINTS['2xl'];

    // Déterminer le breakpoint actuel
    let current: Breakpoint = 'xs';
    if (width >= BREAKPOINTS['2xl']) current = '2xl';
    else if (width >= BREAKPOINTS.xl) current = 'xl';
    else if (width >= BREAKPOINTS.lg) current = 'lg';
    else if (width >= BREAKPOINTS.md) current = 'md';
    else if (width >= BREAKPOINTS.sm) current = 'sm';

    return {
      isMobile,
      isSmallTablet,
      isTablet,
      isDesktop,
      isLargeDesktop,
      isUltraWide,
      current,
      width,
      isTouchDevice,
    };
  }, [width, isTouchDevice]);
}

// =============================================================================
// USE MOBILE - Shortcut simple pour mobile
// =============================================================================

/**
 * Hook simplifié pour savoir si on est sur mobile
 * @returns boolean - true si mobile (< 768px)
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
}

/**
 * Hook simplifié pour savoir si on est sur tablette ou moins
 * @returns boolean - true si tablette ou moins (< 1024px)
 */
export function useIsTabletOrBelow(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.lg - 1}px)`);
}

// =============================================================================
// PREFERENCES UTILISATEUR
// =============================================================================

/**
 * Détecte si l'utilisateur préfère réduire les animations
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Détecte si l'utilisateur préfère le mode sombre
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Détecte si l'utilisateur préfère le contraste élevé
 */
export function usePrefersHighContrast(): boolean {
  return useMediaQuery('(prefers-contrast: more)');
}

// =============================================================================
// USE ORIENTATION - Détection de l'orientation
// =============================================================================

export type Orientation = 'portrait' | 'landscape';

/**
 * Détecte l'orientation de l'écran
 */
export function useOrientation(): Orientation {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  return isPortrait ? 'portrait' : 'landscape';
}

// =============================================================================
// EXPORTS PAR DÉFAUT
// =============================================================================

export default useBreakpoint;
