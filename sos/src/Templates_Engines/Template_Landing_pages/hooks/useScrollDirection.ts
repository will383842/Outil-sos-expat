/**
 * ============================================================================
 * HOOK - useScrollDirection
 * ============================================================================
 *
 * Détecte la direction du scroll pour afficher/masquer des éléments
 * (ex: navigation qui disparaît au scroll down et réapparaît au scroll up).
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type ScrollDirection = 'up' | 'down' | null;

export interface UseScrollDirectionOptions {
  /** Seuil minimum en pixels avant de détecter un changement */
  threshold?: number;
  /** Désactiver en haut de page */
  disableAtTop?: boolean;
  /** Position minimale avant de commencer à détecter */
  initialPosition?: number;
}

/**
 * Hook pour détecter la direction du scroll
 *
 * @param options - Options de configuration
 * @returns Direction du scroll ('up', 'down', ou null)
 *
 * @example
 * ```tsx
 * const scrollDirection = useScrollDirection({ threshold: 10 });
 *
 * return (
 *   <nav className={cn(
 *     'fixed top-0 transition-transform duration-300',
 *     scrollDirection === 'down' ? '-translate-y-full' : 'translate-y-0'
 *   )}>
 *     Navigation
 *   </nav>
 * );
 * ```
 */
export function useScrollDirection(
  options: UseScrollDirectionOptions = {}
): ScrollDirection {
  const {
    threshold = 10,
    disableAtTop = true,
    initialPosition = 0,
  } = options;

  const [direction, setDirection] = useState<ScrollDirection>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  const updateDirection = useCallback(() => {
    const currentY = window.scrollY;

    if (disableAtTop && currentY < initialPosition) {
      setDirection(null);
      lastScrollY.current = currentY;
      ticking.current = false;
      return;
    }

    const diff = currentY - lastScrollY.current;

    if (Math.abs(diff) > threshold) {
      setDirection(diff > 0 ? 'down' : 'up');
      lastScrollY.current = currentY;
    }

    ticking.current = false;
  }, [threshold, disableAtTop, initialPosition]);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateDirection);
        ticking.current = true;
      }
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [updateDirection]);

  return direction;
}

/**
 * Hook pour obtenir la position de scroll actuelle
 *
 * @returns Position Y du scroll
 */
export function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return scrollY;
}

/**
 * Hook pour détecter si on a scrollé au-delà d'une position
 *
 * @param threshold - Position en pixels
 * @returns true si on a scrollé au-delà
 *
 * @example
 * ```tsx
 * const showStickyCta = useScrolledPast(300);
 *
 * return showStickyCta && <StickyCTA />;
 * ```
 */
export function useScrolledPast(threshold: number): boolean {
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolledPast(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  return scrolledPast;
}
