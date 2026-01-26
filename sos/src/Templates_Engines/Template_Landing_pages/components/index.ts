/**
 * ============================================================================
 * COMPONENTS - TEMPLATE LANDING PAGES
 * ============================================================================
 *
 * Composants React pour les landing pages SOS Expat.
 * Design premium mobile-first en harmonie avec la home page.
 *
 * 3 TEMPLATES DISPONIBLES :
 * - minimal    : Design premium épuré (Hero + Trust + FAQ + CTA)
 * - complete   : Toutes les sections
 * - conversion : Optimisé conversion (urgence, popups, compteurs)
 *
 * Structure :
 * - LandingPage : Factory qui sélectionne le bon template
 * - templates/ : Les 3 variantes de design
 * - Sections : Hero, Problem, Solution, Process, etc.
 * - ui/ : Composants UI réutilisables
 */

// Main component (Factory)
export { LandingPage } from './LandingPage';

// Template variants
export {
  LandingPageMinimal,
  LandingPageComplete,
  LandingPageConversion,
} from './templates';

// Section components
export { LandingHero } from './LandingHero';
export { LandingProblem } from './LandingProblem';
export { LandingSolution } from './LandingSolution';
export { LandingProcess } from './LandingProcess';
export { LandingBenefits } from './LandingBenefits';
export { LandingTestimonials } from './LandingTestimonials';
export { LandingFAQ } from './LandingFAQ';
export { LandingCTA } from './LandingCTA';
export { LandingTrust } from './LandingTrust';

// SEO components
export { LandingSchema } from './LandingSchema';
export { LandingMeta } from './LandingMeta';
export { LandingBreadcrumbs } from './LandingBreadcrumbs';

// Conversion components
export { StickyCTAMobile } from './StickyCTAMobile';
export { SocialProofPopup } from './SocialProofPopup';
export { ReadingProgressBar } from './ReadingProgressBar';

// UI components
export * from './ui';
