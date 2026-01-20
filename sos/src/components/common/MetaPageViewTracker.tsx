// src/components/common/MetaPageViewTracker.tsx
// Composant qui track les PageView Meta sur chaque changement de route SPA
// Equivalent du PageViewTracker GA4 mais pour Meta Pixel

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackMetaPageView, isFbqAvailable } from '@/utils/metaPixel';
import { generateEventIdForType } from '@/utils/sharedEventId';

/**
 * Pages critiques pour la conversion qui necessitent un tracking optimise
 * Ces pages sont importantes pour l'optimisation des campagnes Meta
 */
const CRITICAL_PAGES = [
  '/sos-call',        // Page de selection des providers
  '/checkout',        // Page de paiement
  '/pricing',         // Page de tarifs
  '/avocat',          // Pages avocats (SEO)
  '/lawyer',          // Pages avocats (EN)
  '/profile/',        // Profils providers
  '/provider/',       // Profils providers
  '/contact',         // Page contact
  '/register',        // Inscription
];

/**
 * Verifie si la page courante est une page critique pour les conversions
 */
const isCriticalPage = (pathname: string): boolean => {
  return CRITICAL_PAGES.some(page =>
    pathname.startsWith(page) || pathname.includes(page)
  );
};

/**
 * MetaPageViewTracker
 *
 * Ce composant doit etre place dans App.tsx, a cote de PageViewTracker (GA4).
 * Il ecoute les changements de route React Router et envoie un PageView Meta
 * a chaque navigation interne dans le SPA.
 *
 * Optimisations:
 * - Genere un eventID unique pour la deduplication Pixel/CAPI
 * - Identifie les pages critiques pour l'optimisation des campagnes
 *
 * Le premier PageView est deja envoye par index.html, donc on skip le premier render.
 */
const MetaPageViewTracker: React.FC = () => {
  const location = useLocation();
  const isFirstRender = useRef(true);
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    // Skip le premier render car index.html envoie deja un PageView au chargement
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastTrackedPath.current = location.pathname + location.search;
      return;
    }

    // Construire le chemin complet (pathname + search params)
    const currentPath = location.pathname + location.search;

    // Eviter de tracker deux fois la meme page (ex: re-render sans navigation)
    if (currentPath === lastTrackedPath.current) {
      return;
    }

    // Mettre a jour le dernier chemin tracke
    lastTrackedPath.current = currentPath;

    // Verifier si c'est une page critique
    const isCritical = isCriticalPage(location.pathname);

    // Petit delai pour s'assurer que le DOM est mis a jour (titre de page, etc.)
    const timeoutId = setTimeout(() => {
      // Generer un eventID unique pour la deduplication
      const eventId = generateEventIdForType('pageview');

      // Track avec eventID pour permettre la deduplication CAPI si necessaire
      trackMetaPageView({
        eventID: eventId,
      });

      // Log les pages critiques en dev pour debug
      if (process.env.NODE_ENV === 'development' && isCritical) {
        console.log('%c[MetaPixel] Critical PageView tracked:', 'color: #E4405F; font-weight: bold', {
          path: currentPath,
          eventId,
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, location.search]);

  // Log au montage en dev pour confirmer que le tracker est actif
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (isFbqAvailable()) {
        console.log('%c[MetaPixel] PageViewTracker monte et actif', 'color: #1877F2; font-weight: bold');
      } else {
        console.warn('[MetaPixel] PageViewTracker monte mais fbq non disponible');
      }
    }
  }, []);

  // Ce composant ne rend rien dans le DOM
  return null;
};

export default MetaPageViewTracker;
