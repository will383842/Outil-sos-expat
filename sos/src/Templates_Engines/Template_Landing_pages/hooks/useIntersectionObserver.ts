/**
 * ============================================================================
 * HOOK - useIntersectionObserver
 * ============================================================================
 *
 * Observe la visibilité d'un élément dans le viewport.
 * Utilisé pour déclencher des animations au scroll.
 */

import { useState, useEffect, useRef, RefObject } from 'react';

export interface UseIntersectionObserverOptions {
  /** Marge autour de la zone de détection */
  rootMargin?: string;
  /** Pourcentage de visibilité requis (0-1) */
  threshold?: number | number[];
  /** Ne déclencher qu'une seule fois */
  triggerOnce?: boolean;
  /** Élément racine pour l'observation */
  root?: Element | null;
  /** Désactiver l'observation */
  disabled?: boolean;
}

export interface UseIntersectionObserverResult {
  /** Référence à attacher à l'élément */
  ref: RefObject<HTMLElement>;
  /** L'élément est visible dans le viewport */
  isInView: boolean;
  /** L'élément a été visible au moins une fois */
  hasBeenInView: boolean;
  /** Ratio de visibilité (0-1) */
  intersectionRatio: number;
  /** Entry complète de l'IntersectionObserver */
  entry: IntersectionObserverEntry | null;
}

/**
 * Hook pour observer la visibilité d'un élément
 *
 * @param options - Options de configuration
 * @returns Objet avec la ref et les états de visibilité
 *
 * @example
 * ```tsx
 * const { ref, isInView } = useIntersectionObserver({
 *   threshold: 0.1,
 *   triggerOnce: true,
 * });
 *
 * return (
 *   <motion.div
 *     ref={ref}
 *     initial={{ opacity: 0, y: 20 }}
 *     animate={isInView ? { opacity: 1, y: 0 } : {}}
 *   >
 *     Content
 *   </motion.div>
 * );
 * ```
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverResult {
  const {
    rootMargin = '0px',
    threshold = 0,
    triggerOnce = false,
    root = null,
    disabled = false,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const [intersectionRatio, setIntersectionRatio] = useState(0);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element || disabled) return;

    // Si triggerOnce et déjà vu, ne pas réobserver
    if (triggerOnce && hasBeenInView) return;

    const observerCallback: IntersectionObserverCallback = (entries) => {
      const [observedEntry] = entries;

      setEntry(observedEntry);
      setIntersectionRatio(observedEntry.intersectionRatio);
      setIsInView(observedEntry.isIntersecting);

      if (observedEntry.isIntersecting) {
        setHasBeenInView(true);

        // Déconnecter si triggerOnce
        if (triggerOnce) {
          observer.disconnect();
        }
      }
    };

    const observer = new IntersectionObserver(observerCallback, {
      root,
      rootMargin,
      threshold,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [root, rootMargin, threshold, triggerOnce, disabled, hasBeenInView]);

  return {
    ref: ref as RefObject<HTMLElement>,
    isInView,
    hasBeenInView,
    intersectionRatio,
    entry,
  };
}

/**
 * Hook simplifié pour les animations au scroll
 *
 * @param triggerOnce - Ne déclencher qu'une seule fois
 * @returns Tuple [ref, isInView]
 *
 * @example
 * ```tsx
 * const [ref, isInView] = useInView(true);
 *
 * return (
 *   <div ref={ref} className={isInView ? 'animate-in' : ''}>
 *     Content
 *   </div>
 * );
 * ```
 */
export function useInView(triggerOnce = true): [RefObject<HTMLElement>, boolean] {
  const { ref, isInView, hasBeenInView } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce,
  });

  return [ref, triggerOnce ? hasBeenInView : isInView];
}
