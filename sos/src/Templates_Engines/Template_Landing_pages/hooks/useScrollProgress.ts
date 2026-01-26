/**
 * ============================================================================
 * HOOK - useScrollProgress
 * ============================================================================
 *
 * Calcule la progression du scroll sur la page.
 * Utilisé pour les barres de lecture et les indicateurs de progression.
 */

import { useState, useEffect, useRef } from 'react';

export interface UseScrollProgressOptions {
  /** ID de l'élément à tracker (défaut: document entier) */
  elementId?: string;
  /** Throttle en ms pour les mises à jour */
  throttle?: number;
}

export interface ScrollProgressResult {
  /** Progression entre 0 et 1 */
  progress: number;
  /** Progression en pourcentage (0-100) */
  percentage: number;
  /** Progression arrondie (0-100) */
  percentageRounded: number;
  /** Position Y actuelle */
  scrollY: number;
  /** Hauteur scrollable totale */
  scrollHeight: number;
}

/**
 * Hook pour calculer la progression du scroll
 *
 * @param options - Options de configuration
 * @returns Objet avec les valeurs de progression
 *
 * @example
 * ```tsx
 * const { percentage, progress } = useScrollProgress();
 *
 * return (
 *   <div className="fixed top-0 left-0 h-1 bg-red-500" style={{ width: `${percentage}%` }} />
 * );
 * ```
 */
export function useScrollProgress(
  options: UseScrollProgressOptions = {}
): ScrollProgressResult {
  const { elementId, throttle = 16 } = options; // ~60fps

  const [result, setResult] = useState<ScrollProgressResult>({
    progress: 0,
    percentage: 0,
    percentageRounded: 0,
    scrollY: 0,
    scrollHeight: 0,
  });

  const lastUpdate = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const calculateProgress = () => {
      const now = Date.now();

      // Throttle updates
      if (now - lastUpdate.current < throttle) {
        ticking.current = false;
        return;
      }

      let scrollY: number;
      let scrollHeight: number;
      let viewportHeight: number;

      if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
          scrollY = element.scrollTop;
          scrollHeight = element.scrollHeight;
          viewportHeight = element.clientHeight;
        } else {
          ticking.current = false;
          return;
        }
      } else {
        scrollY = window.scrollY || document.documentElement.scrollTop;
        scrollHeight = document.documentElement.scrollHeight;
        viewportHeight = window.innerHeight;
      }

      const maxScroll = scrollHeight - viewportHeight;
      const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;
      const percentage = progress * 100;

      setResult({
        progress,
        percentage,
        percentageRounded: Math.round(percentage),
        scrollY,
        scrollHeight,
      });

      lastUpdate.current = now;
      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(calculateProgress);
        ticking.current = true;
      }
    };

    // Calcul initial
    calculateProgress();

    // Écouter le scroll
    if (elementId) {
      const element = document.getElementById(elementId);
      element?.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        element?.removeEventListener('scroll', handleScroll);
      };
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [elementId, throttle]);

  return result;
}
