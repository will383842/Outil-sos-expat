/**
 * ============================================================================
 * TEMPLATE LANDING PAGES - SOS EXPAT 2026
 * ============================================================================
 *
 * Template complet pour landing pages d'exception avec :
 * - Design premium mobile-first en harmonie avec SOS Expat
 * - Performance 100/100 Lighthouse
 * - Accessibilité WCAG 2.1 AAA
 * - SEO Position 0 optimisé
 * - Conversion maximale
 *
 * Structure du template :
 * ├── components/     → Composants React (Hero, FAQ, CTA, etc.)
 * ├── hooks/          → Hooks personnalisés (useLandingData, useIsMobile, etc.)
 * ├── types/          → Types TypeScript complets
 * ├── lib/            → Utilitaires (animations, firebase config)
 * └── styles/         → Styles CSS spécifiques aux landing pages
 */

// ============================================================================
// COMPONENTS
// ============================================================================
export * from './components';

// ============================================================================
// HOOKS
// ============================================================================
// Note: BREAKPOINTS is also exported from lib/constants, so we exclude it here
export {
  useLandingData,
  usePrefetchLanding,
  useIsMobile,
  useBreakpoint,
  useIsTouchDevice,
  useScrollDirection,
  useScrollY,
  useScrolledPast,
  useReducedMotion,
  useAdaptiveAnimation,
  useConditionalAnimation,
  useHapticFeedback,
  useScrollProgress,
  useIntersectionObserver,
} from './hooks';
export type { BreakpointKey } from './hooks/useIsMobile';

// ============================================================================
// TYPES
// ============================================================================
// Note: CTAButton and TrustBadge are components, so we rename the types
export type {
  LandingData,
  LandingTemplate,
  LandingStatus,
  LandingRouting,
  HreflangEntry,
  RouteParams,
  LandingSEO,
  EEATSignals,
  LandingTargeting,
  CTAData,
  TrustBadge as TrustBadgeData,
  SocialProofData,
  SchemaOrg,
  Breadcrumb,
  Timestamps,
  Metadata,
} from './types/landing.types';

export type {
  LandingSections,
  HeroSection,
  ResponsiveImage,
  ProblemSection,
  ProblemItem,
  SolutionSection,
  SolutionFeature,
  HowItWorksSection,
  ProcessStep,
  AdvantagesSection,
  AdvantageItem,
  TestimonialsSection,
  Testimonial,
  AggregateRating,
  FAQSection,
  FAQItem,
  FAQAnswerFormat,
  CTASection,
  CTAButton as CTAButtonData,
} from './types/sections.types';

export type {
  AnimationsConfig,
  SpringTransition,
  TimingTransition,
  AnimationVariant,
  MobileConfig,
  AccessibilityConfig,
  PerformanceHints,
  ConversionConfig,
} from './types/config.types';

// ============================================================================
// LIB (Animations, Constants, Utils)
// ============================================================================
export * from './lib';
