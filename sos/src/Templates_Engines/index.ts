/**
 * ============================================================================
 * TEMPLATES ENGINES - SOS EXPAT 2026
 * ============================================================================
 *
 * Système de templates modulaire pour générer des pages dynamiques
 * optimisées SEO, accessibles et performantes.
 *
 * Structure :
 * - Template_Landing_pages : Landing pages pour 197 pays × 9 langues
 * - [Future] Template_Blog : Articles de blog
 * - [Future] Template_Services : Pages de services
 *
 * @version 2.0
 * @author SOS Expat Team
 */

// ============================================================================
// LANDING PAGES TEMPLATE
// ============================================================================
export * from './Template_Landing_pages';

// ============================================================================
// TYPES GLOBAUX
// ============================================================================
export type {
  LandingData,
  LandingTemplate,
  LandingStatus,
  LandingSections,
  CTAData,
} from './Template_Landing_pages/types';
