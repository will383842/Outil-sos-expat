/**
 * ============================================================================
 * TYPES PRINCIPAUX - LANDING DATA
 * ============================================================================
 *
 * Structure complète des données d'une landing page.
 * Ces types correspondent au JSON généré par eng-content-generate (Laravel)
 * et stocké dans Firebase Firestore collection "landings".
 */

import type {
  LandingSections,
  HeroSection,
  FAQSection,
  CTASection,
} from './sections.types';

import type {
  AnimationsConfig,
  ConversionConfig,
  MobileConfig,
  AccessibilityConfig,
  PerformanceHints,
} from './config.types';

// ============================================================================
// LANDING DATA - TYPE PRINCIPAL
// ============================================================================

export interface LandingData {
  /** Version du format JSON */
  version: string;
  /** Type de contenu */
  type: 'landing';
  /** Template utilisé */
  template: LandingTemplate;
  /** ID unique du document */
  id: string;
  /** ID de l'article source */
  articleId: string;
  /** Statut de publication */
  status: LandingStatus;

  // Routing & SEO
  routing: LandingRouting;
  seo: LandingSEO;
  breadcrumbs: Breadcrumb[];

  // E-E-A-T & Trust
  eeat: EEATSignals;
  targeting: LandingTargeting;
  trustBadges: TrustBadge[];
  socialProof: SocialProofData;

  // Content
  cta: CTAData;
  sections: LandingSections;
  schema: SchemaOrg;

  // Config
  animations: AnimationsConfig;
  conversion: ConversionConfig;
  mobile: MobileConfig;
  accessibility: AccessibilityConfig;
  performance: PerformanceHints;

  // Meta
  timestamps: Timestamps;
  metadata: Metadata;
}

// ============================================================================
// ENUMS & BASIC TYPES
// ============================================================================

export type LandingTemplate = 'minimal' | 'complete' | 'conversion';
export type LandingStatus = 'published' | 'draft' | 'archived';

// ============================================================================
// ROUTING
// ============================================================================

export interface LandingRouting {
  /** Slug de la page (ex: "lawyers-family-law") */
  slug: string;
  /** Chemin complet (ex: "/fr/de/lawyers/family-law") */
  fullPath: string;
  /** URL canonique complète */
  canonicalUrl: string;
  /** Code langue (ex: "fr", "en", "ar") */
  language: string;
  /** Code pays ISO (ex: "de", "us", "ma") */
  country: string;
  /** Locale complète (ex: "fr-DE", "en-US") */
  locale: string;
  /** Liens hreflang pour toutes les versions linguistiques */
  hreflang: HreflangEntry[];
}

export interface HreflangEntry {
  /** Code langue-région (ex: "fr-DE", "en-US", "x-default") */
  lang: string;
  /** URL de la version */
  url: string;
}

export interface RouteParams {
  lang?: string;
  country?: string;
  service?: string;
  specialty?: string;
}

// ============================================================================
// SEO
// ============================================================================

export interface LandingSEO {
  /** Titre de la page (H1) */
  title: string;
  /** Meta title (< 60 caractères) */
  metaTitle: string;
  /** Meta description (< 160 caractères) */
  metaDescription: string;
  /** Mots-clés cibles */
  keywords: string[];
  /** URL canonique */
  canonicalUrl: string;
  /** Directive robots */
  robots: string;

  // Open Graph
  ogType: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;

  // Twitter Cards
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

// ============================================================================
// E-E-A-T SIGNALS (Experience, Expertise, Authority, Trust)
// ============================================================================

export interface EEATSignals {
  expertise: {
    author: {
      name: string;
      type: string;
      credentials: string;
      experience: string;
    };
    reviewedBy: {
      name: string;
      qualification: string;
    };
  };
  experience: {
    yearsInBusiness: number;
    countriesCovered: number;
    clientsHelped: string;
    successRate: string;
  };
  authority: {
    certifications: string[];
    partnerships: string[];
    mentions: string[];
  };
  trust: {
    securityBadges: string[];
    guarantees: string[];
    ratings: {
      google: { score: number; count: number };
      trustpilot: { score: number; count: number };
    };
  };
  lastReviewed: string;
  lastUpdated: string;
  nextReviewDate: string;
}

// ============================================================================
// TARGETING
// ============================================================================

export interface LandingTargeting {
  country: {
    code: string;
    nameFr: string;
    nameEn: string;
    nameLocal: string;
    flag: string;
  };
  language: {
    code: string;
    name: string;
    direction: 'ltr' | 'rtl';
    locale: string;
  };
  specialty: {
    id: string;
    code: string;
    name: string;
    slug: string;
    category: string;
  } | null;
  objective: string;
  uniqueAngle: string;
}

// ============================================================================
// CTA (Call To Action)
// ============================================================================

export interface CTAData {
  /** URL du CTA principal */
  primary_url: string;
  /** Texte du CTA principal */
  primary_text: string;
  /** URL du CTA secondaire (optionnel) */
  secondary_url?: string;
  /** Texte du CTA secondaire */
  secondary_text?: string;
  /** Paramètres UTM pour le tracking */
  tracking_params?: Record<string, string>;
  /** Type de match pour le targeting */
  match_type?: string;
}

// ============================================================================
// TRUST & SOCIAL PROOF
// ============================================================================

export interface TrustBadge {
  id: string;
  icon: string;
  text: string;
  color: 'primary' | 'success' | 'accent';
}

export interface SocialProofData {
  stats: Array<{
    value: string;
    label: string;
    icon: string;
  }>;
  recentActivity: Array<{
    name: string;
    city: string;
    action: string;
    timeAgo: string;
  }>;
  partnerLogos: string[];
  highlightTestimonial: {
    quote: string;
    author: string;
    location: string;
    rating: number;
    avatar: string;
  };
  pressLogos: Array<{
    name: string;
    logo: string;
  }>;
}

// ============================================================================
// SCHEMA.ORG
// ============================================================================

export interface SchemaOrg {
  webPage: Record<string, unknown>;
  faqPage: Record<string, unknown>;
  breadcrumbList: Record<string, unknown>;
  howTo: Record<string, unknown> | null;
  service: Record<string, unknown>;
  organization: Record<string, unknown>;
  reviews: Record<string, unknown> | null;
}

// ============================================================================
// BREADCRUMBS
// ============================================================================

export interface Breadcrumb {
  name: string;
  url: string;
  position: number;
}

// ============================================================================
// TIMESTAMPS & METADATA
// ============================================================================

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  lastReviewed: string;
}

export interface Metadata {
  source: string;
  generator: string;
  model: string;
  qualityScore: number;
  seoScore: number;
  uniquenessScore: number;
}
