/**
 * useLazySection Hook
 * Lazy load des sections sous le fold avec Intersection Observer
 *
 * Usage:
 * const { ref, isVisible } = useLazySection();
 * <section ref={ref}>{isVisible && <HeavyComponent />}</section>
 */

import { useEffect, useRef, useState } from 'react';

interface UseLazySectionOptions {
  /** Distance avant le viewport pour déclencher le chargement (px) */
  rootMargin?: string;
  /** Pourcentage de visibilité requis (0-1) */
  threshold?: number;
  /** Une fois visible, rester visible (défaut: true) */
  triggerOnce?: boolean;
}

interface UseLazySectionResult {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
}

export function useLazySection(options: UseLazySectionOptions = {}): UseLazySectionResult {
  const {
    rootMargin = '200px', // Précharger 200px avant le viewport
    threshold = 0,
    triggerOnce = true,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Si déjà visible et triggerOnce, pas besoin d'observer
    if (isVisible && triggerOnce) return;

    // Fallback si IntersectionObserver n'est pas supporté
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (triggerOnce) {
              observer.disconnect();
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, triggerOnce, isVisible]);

  return { ref, isVisible };
}

export default useLazySection;
