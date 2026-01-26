/**
 * ============================================================================
 * TYPES CONFIG - ANIMATIONS, MOBILE, ACCESSIBILITY, PERFORMANCE
 * ============================================================================
 *
 * Types pour toutes les configurations UX/UI des landing pages :
 * - Animations Framer Motion
 * - Configuration mobile-first
 * - Accessibilité WCAG 2.1
 * - Performance Core Web Vitals
 * - Conversion optimization
 */

// ============================================================================
// ANIMATIONS CONFIG
// ============================================================================

export interface AnimationsConfig {
  /** Configurations des transitions */
  transitions: {
    default: SpringTransition;
    fade: TimingTransition;
    bounce: SpringTransition;
    slow: TimingTransition;
  };
  /** Variants pour les animations d'entrée/sortie */
  variants: Record<string, AnimationVariant>;
  /** Configuration du stagger pour les listes */
  stagger: {
    children: number;
    delayChildren: number;
  };
  /** Configuration parallax */
  parallax: {
    enabled: boolean;
    speed: number;
  };
  /** Configuration scroll-triggered */
  scroll: {
    threshold: number;
    triggerOnce: boolean;
  };
}

export interface SpringTransition {
  type: 'spring';
  stiffness: number;
  damping: number;
}

export interface TimingTransition {
  duration: number;
  ease: number[];
}

export interface AnimationVariant {
  hidden: Record<string, number>;
  visible: Record<string, number>;
}

// ============================================================================
// MOBILE CONFIG
// ============================================================================

export interface MobileConfig {
  /** Breakpoints en pixels */
  breakpoints: Record<string, number>;
  /** Configuration tactile */
  touch: {
    /** Taille minimum des cibles tactiles (48px recommandé) */
    minTargetSize: number;
    /** Espacement minimum entre cibles */
    minSpacing: number;
    /** Activer le swipe */
    swipeEnabled: boolean;
    /** Highlight au tap */
    tapHighlight: boolean;
    /** Comportement du scroll */
    scrollBehavior: string;
  };
  /** Configuration de la navigation */
  navigation: {
    type: 'hamburger' | 'bottom-nav' | 'tabs';
    position: string;
    sticky: boolean;
    hideOnScroll: boolean;
    showOnScrollUp: boolean;
    height: number;
    safeArea: boolean;
  };
  /** Configuration du hero mobile */
  hero: {
    fullHeight: boolean;
    minHeight: string;
    textSize: { title: string; subtitle: string };
    ctaSize: string;
    imagePosition: string;
  };
  /** Configuration du CTA sticky */
  stickyCta: {
    enabled: boolean;
    position: string;
    safeArea: boolean;
    blur: boolean;
    showAfterScroll: number;
  };
  /** Configuration haptic feedback */
  haptics: {
    enabled: boolean;
    onTap: string;
    onSuccess: string;
    onError: string;
  };
  /** Configuration dark mode */
  darkMode: {
    support: boolean;
    default: 'system' | 'light' | 'dark';
  };
}

// ============================================================================
// ACCESSIBILITY CONFIG (WCAG 2.1 AAA)
// ============================================================================

export interface AccessibilityConfig {
  /** Liens de navigation rapide */
  skipLinks: Array<{
    id: string;
    label: string;
  }>;
  /** Labels ARIA personnalisés */
  ariaLabels: Record<string, string>;
  /** Messages pour les régions live */
  liveRegion: Record<string, string>;
  /** Gestion du focus */
  focusManagement: {
    /** Piéger le focus dans les modales */
    trapOnModal: boolean;
    /** Restaurer le focus à la fermeture */
    restoreOnClose: boolean;
    /** Outline visible au focus */
    visibleOutline: boolean;
  };
  /** Configuration reduced motion */
  reducedMotion: {
    /** Respecter la préférence utilisateur */
    respectUserPreference: boolean;
    /** Durée de fallback si reduced motion */
    fallbackDuration: number;
  };
  /** Niveaux de contraste */
  contrast: {
    /** Ratio minimum (4.5:1 pour AA) */
    minimum: number;
    /** Ratio enhanced (7:1 pour AAA) */
    enhanced: number;
  };
  /** Taille des cibles tactiles */
  touchTarget: {
    /** Taille minimum en pixels */
    minimum: number;
  };
}

// ============================================================================
// PERFORMANCE CONFIG (Core Web Vitals)
// ============================================================================

export interface PerformanceHints {
  /** Images à précharger (LCP) */
  preloadImages: string[];
  /** Polices à précharger */
  preloadFonts: string[];
  /** Scripts à différer */
  deferScripts: string[];
  /** Sections à lazy-load */
  lazyLoadSections: string[];
  /** Stratégies de cache */
  cacheStrategy: Record<string, string>;
  /** Objectifs Core Web Vitals */
  targets: {
    /** Largest Contentful Paint (ms) */
    LCP: number;
    /** First Input Delay (ms) */
    FID: number;
    /** Cumulative Layout Shift */
    CLS: number;
  };
}

// ============================================================================
// CONVERSION CONFIG
// ============================================================================

export interface ConversionConfig {
  /** Configuration urgence */
  urgency: {
    enabled: boolean;
    type: 'spots' | 'time' | 'discount';
    data: {
      spotsLeft?: number;
      expiresIn?: string;
    };
    text: string;
  };
  /** Configuration CTA sticky */
  stickyCta: {
    enabled: boolean;
    showAfterScroll: number;
    hideOnFooter: boolean;
  };
  /** Configuration exit intent */
  exitIntent: {
    enabled: boolean;
    delay: number;
    showOnce: boolean;
  };
  /** Configuration barre de progression */
  progressBar: {
    enabled: boolean;
    type: 'reading' | 'steps';
  };
  /** Configuration popup social proof */
  socialProofPopup: {
    enabled: boolean;
    interval: number;
    maxShows: number;
  };
  /** Configuration garantie */
  guarantee: {
    icon: string;
    title: string;
    text: string;
  };
  /** Configuration tracking CTA */
  ctaTracking: {
    provider: 'gtm' | 'ga4' | 'plausible';
    events: string[];
  };
}
