/**
 * ============================================================================
 * HOOKS - TEMPLATE LANDING PAGES
 * ============================================================================
 *
 * Collection de hooks React optimisés pour les landing pages :
 * - useLandingData : Fetch des données depuis Firebase
 * - useIsMobile : Détection responsive
 * - useScrollDirection : Direction du scroll
 * - useReducedMotion : Préférences d'accessibilité
 * - useHapticFeedback : Feedback tactile mobile
 * - useScrollProgress : Barre de progression
 * - useIntersectionObserver : Animations au scroll
 */

export { useLandingData, usePrefetchLanding } from './useLandingData';
export { useIsMobile, useBreakpoint, useIsTouchDevice, BREAKPOINTS } from './useIsMobile';
export { useScrollDirection, useScrollY, useScrolledPast } from './useScrollDirection';
export { useReducedMotion, useAdaptiveAnimation, useConditionalAnimation } from './useReducedMotion';
export { useHapticFeedback } from './useHapticFeedback';
export { useScrollProgress } from './useScrollProgress';
export { useIntersectionObserver } from './useIntersectionObserver';
