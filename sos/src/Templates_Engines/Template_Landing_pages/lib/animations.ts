/**
 * ============================================================================
 * ANIMATIONS - Configuration Framer Motion
 * ============================================================================
 *
 * Configurations d'animations réutilisables pour les landing pages.
 * En harmonie avec le design system SOS Expat.
 */

import type { Transition, Variants } from 'framer-motion';

// ============================================================================
// TRANSITIONS
// ============================================================================

/** Transition spring par défaut (fluide et naturelle) */
export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

/** Transition spring rebondissante */
export const bounceTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
};

/** Transition fade douce */
export const fadeTransition: Transition = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94],
};

/** Transition lente pour les éléments importants */
export const slowTransition: Transition = {
  duration: 0.6,
  ease: [0.25, 0.46, 0.45, 0.94],
};

/** Transition rapide pour les micro-interactions */
export const quickTransition: Transition = {
  duration: 0.15,
  ease: 'easeOut',
};

// ============================================================================
// VARIANTS
// ============================================================================

/** Fade in depuis le bas (animation d'entrée standard) */
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: fadeTransition,
  },
};

/** Fade in avec scale */
export const fadeInScale: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
};

/** Fade in depuis la gauche */
export const fadeInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: fadeTransition,
  },
};

/** Fade in depuis la droite */
export const fadeInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: fadeTransition,
  },
};

/** Container avec stagger pour les enfants */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/** Container avec stagger rapide */
export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

/** Item pour stagger container */
export const staggerItem: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

// ============================================================================
// HOVER & TAP ANIMATIONS
// ============================================================================

/** Animation hover pour les cartes */
export const cardHover = {
  scale: 1.02,
  y: -4,
  transition: springTransition,
};

/** Animation hover pour les boutons */
export const buttonHover = {
  scale: 1.05,
  transition: quickTransition,
};

/** Animation tap/press */
export const tapAnimation = {
  scale: 0.98,
};

/** Animation pour les icônes au hover */
export const iconHover = {
  scale: 1.1,
  rotate: 5,
  transition: quickTransition,
};

// ============================================================================
// SCROLL ANIMATIONS
// ============================================================================

/** Animation parallax pour le hero */
export const parallaxY = (speed: number = 0.5) => ({
  y: ['0%', `${speed * 100}%`],
});

/** Animation d'opacité basée sur le scroll */
export const scrollFade = {
  opacity: [1, 0],
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Crée une animation d'entrée avec délai personnalisé
 * @param delay - Délai en secondes
 */
export const createDelayedFadeIn = (delay: number): Variants => ({
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...fadeTransition,
      delay,
    },
  },
});

/**
 * Crée un stagger avec timing personnalisé
 * @param staggerTime - Temps entre chaque enfant (s)
 * @param delayTime - Délai initial (s)
 */
export const createStaggerContainer = (
  staggerTime: number = 0.1,
  delayTime: number = 0.1
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerTime,
      delayChildren: delayTime,
    },
  },
});

// ============================================================================
// ANIMATION PRESETS POUR COMPOSANTS
// ============================================================================

/** Preset pour sections */
export const sectionAnimationPreset = {
  initial: 'hidden',
  whileInView: 'visible',
  viewport: { once: true, margin: '-100px' },
  variants: fadeInUp,
};

/** Preset pour les cards en grille */
export const gridAnimationPreset = {
  initial: 'hidden',
  whileInView: 'visible',
  viewport: { once: true, margin: '-50px' },
  variants: staggerContainer,
};

/** Preset pour items dans une grille */
export const gridItemPreset = {
  variants: staggerItem,
};
