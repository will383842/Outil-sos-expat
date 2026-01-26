/**
 * ============================================================================
 * HOOK - useReducedMotion
 * ============================================================================
 *
 * Respecte la préférence "prefers-reduced-motion" de l'utilisateur.
 * Essentiel pour l'accessibilité WCAG 2.1 AAA.
 */

import { useState, useEffect } from 'react';

/**
 * Hook pour détecter la préférence "prefers-reduced-motion"
 *
 * Les utilisateurs peuvent activer cette option dans les paramètres
 * de leur système d'exploitation pour réduire les animations
 * (important pour les personnes avec des troubles vestibulaires).
 *
 * @returns true si l'utilisateur préfère moins de mouvement
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 *
 * return (
 *   <motion.div
 *     initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
 *     animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
 *     transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4 }}
 *   >
 *     Content
 *   </motion.div>
 * );
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook pour obtenir des valeurs d'animation adaptées aux préférences
 *
 * @returns Objet avec les paramètres d'animation adaptés
 *
 * @example
 * ```tsx
 * const { shouldAnimate, duration, transition, initial, animate } = useAdaptiveAnimation();
 *
 * return (
 *   <motion.div
 *     initial={initial}
 *     animate={animate}
 *     transition={transition}
 *   >
 *     Content
 *   </motion.div>
 * );
 * ```
 */
export function useAdaptiveAnimation() {
  const prefersReducedMotion = useReducedMotion();

  return {
    /** Indique si les animations doivent être jouées */
    shouldAnimate: !prefersReducedMotion,

    /** Durée d'animation (0 si reduced motion) */
    duration: prefersReducedMotion ? 0 : 0.4,

    /** Délai d'animation (0 si reduced motion) */
    delay: prefersReducedMotion ? 0 : 0.1,

    /** Transition par défaut (Framer Motion) */
    transition: prefersReducedMotion
      ? { duration: 0 }
      : { type: 'spring', stiffness: 300, damping: 30 },

    /** Animation d'entrée (fadeInUp) */
    initial: prefersReducedMotion ? false : { opacity: 0, y: 20 },

    /** Animation finale */
    animate: prefersReducedMotion ? false : { opacity: 1, y: 0 },

    /** Transition fade simple */
    fadeTransition: prefersReducedMotion
      ? { duration: 0 }
      : { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  };
}

/**
 * Hook pour les animations conditionnelles Framer Motion
 * Retourne l'animation si autorisée, sinon false
 *
 * @param animation - Configuration d'animation
 * @returns Animation adaptée ou false si reduced motion
 *
 * @example
 * ```tsx
 * const hoverAnimation = useConditionalAnimation({ scale: 1.05 });
 *
 * return (
 *   <motion.button whileHover={hoverAnimation}>
 *     Button
 *   </motion.button>
 * );
 * ```
 */
export function useConditionalAnimation<T extends object>(
  animation: T
): T | false {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? false : animation;
}
