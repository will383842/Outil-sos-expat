/**
 * Types TypeScript complets pour Landing Pages SOS Expat 2026
 *
 * Ces types correspondent à la structure JSON générée par le backend
 * eng-content-generate et stockée dans Firebase Firestore.
 */

// ============================================================================
// TYPES PRINCIPAUX
// ============================================================================

export interface LandingData {
  version: string;
  type: 'landing';
  template: LandingTemplate;
  id: string;
  articleId: string;
  status: LandingStatus;
  routing: LandingRouting;
  seo: LandingSEO;
  breadcrumbs: Breadcrumb[];
  eeat: EEATSignals;
  targeting: LandingTargeting;
  cta: CTAData;
  sections: LandingSections;
  schema: SchemaOrg;
  timestamps: Timestamps;
  metadata: Metadata;
  animations: AnimationsConfig;
  trustBadges: TrustBadge[];
  conversion: ConversionConfig;
  socialProof: SocialProofData;
  performance: PerformanceHints;
  accessibility: AccessibilityConfig;
  mobile: MobileConfig;
}

export type LandingTemplate = 'minimal' | 'complete' | 'conversion';
export type LandingStatus = 'published' | 'draft' | 'archived';

// ============================================================================
// ROUTING
// ============================================================================

export interface LandingRouting {
  slug: string;
  fullPath: string;
  canonicalUrl: string;
  language: string;
  country: string;
  locale: string;
  hreflang: HreflangEntry[];
}

export interface HreflangEntry {
  lang: string;
  url: string;
}

// ============================================================================
// SEO
// ============================================================================

export interface LandingSEO {
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl: string;
  robots: string;
  ogType: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

// ============================================================================
// E-E-A-T SIGNALS
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
// CTA
// ============================================================================

export interface CTAData {
  primary_url: string;
  primary_text: string;
  secondary_url?: string;
  secondary_text?: string;
  tracking_params?: Record<string, string>;
  match_type?: string;
}

// ============================================================================
// SECTIONS
// ============================================================================

export interface LandingSections {
  hero: HeroSection;
  problem?: ProblemSection;
  solution?: SolutionSection;
  howItWorks?: HowItWorksSection;
  advantages?: AdvantagesSection;
  testimonials?: TestimonialsSection;
  faq: FAQSection;
  cta: CTASection;
}

export interface HeroSection {
  title: string;
  subtitle: string;
  image?: ResponsiveImage;
  badges?: string[];
  backgroundGradient?: string;
}

export interface ResponsiveImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  srcset: Array<{ src: string; width: number }>;
  sizes: string;
  loading: 'lazy' | 'eager';
}

export interface ProblemSection {
  title: string;
  intro?: string;
  items: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

export interface SolutionSection {
  title: string;
  intro?: string;
  features: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

export interface HowItWorksSection {
  title: string;
  intro?: string;
  totalTime: string;
  steps: Array<{
    number: number;
    title: string;
    description: string;
    icon: string;
    estimatedTime: string;
  }>;
}

export interface AdvantagesSection {
  title?: string;
  items: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

export interface TestimonialsSection {
  title?: string;
  items: Testimonial[];
  aggregateRating: {
    ratingValue: number;
    ratingCount: number;
    bestRating: number;
    worstRating: number;
  };
}

export interface Testimonial {
  name: string;
  location?: string;
  avatar?: string;
  quote: string;
  rating: number;
  date: string;
  verified: boolean;
}

export interface FAQSection {
  title: string;
  items: FAQItem[];
  totalQuestions: number;
}

export interface FAQItem {
  question: string;
  answer: string;
  answerShort: string; // Pour Position 0 (30-60 mots)
  format: 'paragraph' | 'list' | 'steps' | 'number' | 'comparison' | 'definition' | 'yes_no';
  wordCount: number;
  speakable: boolean;
}

export interface CTASection {
  title: string;
  subtitle?: string;
  primaryCta: {
    text: string;
    url: string;
    style: 'primary' | 'secondary';
    tracking?: { event: string; location: string };
  };
  secondaryCta?: {
    text: string;
    url: string;
    style: 'primary' | 'secondary';
  };
  reassurance: string;
  urgency?: string;
}

// ============================================================================
// TRUST BADGES
// ============================================================================

export interface TrustBadge {
  id: string;
  icon: string;
  text: string;
  color: 'primary' | 'success' | 'accent';
}

// ============================================================================
// CONVERSION CONFIG
// ============================================================================

export interface ConversionConfig {
  urgency: {
    enabled: boolean;
    type: 'spots' | 'time' | 'discount';
    data: { spotsLeft?: number; expiresIn?: string };
    text: string;
  };
  stickyCta: {
    enabled: boolean;
    showAfterScroll: number;
    hideOnFooter: boolean;
  };
  exitIntent: {
    enabled: boolean;
    delay: number;
    showOnce: boolean;
  };
  progressBar: {
    enabled: boolean;
    type: 'reading' | 'steps';
  };
  socialProofPopup: {
    enabled: boolean;
    interval: number;
    maxShows: number;
  };
  guarantee: {
    icon: string;
    title: string;
    text: string;
  };
  ctaTracking: {
    provider: 'gtm' | 'ga4' | 'plausible';
    events: string[];
  };
}

// ============================================================================
// SOCIAL PROOF
// ============================================================================

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
// ANIMATIONS
// ============================================================================

export interface AnimationsConfig {
  transitions: {
    default: { type: string; stiffness: number; damping: number };
    fade: { duration: number; ease: number[] };
    bounce: { type: string; stiffness: number; damping: number };
    slow: { duration: number; ease: number[] };
  };
  variants: Record<string, {
    hidden: Record<string, number>;
    visible: Record<string, number>;
  }>;
  stagger: { children: number; delayChildren: number };
  parallax: { enabled: boolean; speed: number };
  scroll: { threshold: number; triggerOnce: boolean };
}

// ============================================================================
// MOBILE CONFIG
// ============================================================================

export interface MobileConfig {
  breakpoints: Record<string, number>;
  touch: {
    minTargetSize: number;
    minSpacing: number;
    swipeEnabled: boolean;
    tapHighlight: boolean;
    scrollBehavior: string;
  };
  navigation: {
    type: 'hamburger' | 'bottom-nav' | 'tabs';
    position: string;
    sticky: boolean;
    hideOnScroll: boolean;
    showOnScrollUp: boolean;
    height: number;
    safeArea: boolean;
  };
  hero: {
    fullHeight: boolean;
    minHeight: string;
    textSize: { title: string; subtitle: string };
    ctaSize: string;
    imagePosition: string;
  };
  stickyCta: {
    enabled: boolean;
    position: string;
    safeArea: boolean;
    blur: boolean;
    showAfterScroll: number;
  };
  haptics: {
    enabled: boolean;
    onTap: string;
    onSuccess: string;
    onError: string;
  };
  darkMode: {
    support: boolean;
    default: 'system' | 'light' | 'dark';
  };
}

// ============================================================================
// ACCESSIBILITY
// ============================================================================

export interface AccessibilityConfig {
  skipLinks: Array<{ id: string; label: string }>;
  ariaLabels: Record<string, string>;
  liveRegion: Record<string, string>;
  focusManagement: {
    trapOnModal: boolean;
    restoreOnClose: boolean;
    visibleOutline: boolean;
  };
  reducedMotion: {
    respectUserPreference: boolean;
    fallbackDuration: number;
  };
  contrast: {
    minimum: number;
    enhanced: number;
  };
  touchTarget: {
    minimum: number;
  };
}

// ============================================================================
// PERFORMANCE
// ============================================================================

export interface PerformanceHints {
  preloadImages: string[];
  preloadFonts: string[];
  deferScripts: string[];
  lazyLoadSections: string[];
  cacheStrategy: Record<string, string>;
  targets: {
    LCP: number;
    FID: number;
    CLS: number;
  };
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
// AUTRES
// ============================================================================

export interface Breadcrumb {
  name: string;
  url: string;
  position: number;
}

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

// ============================================================================
// PROPS INTERFACES
// ============================================================================

export interface LandingPageProps {
  data?: LandingData;
  isLoading?: boolean;
  error?: Error | null;
}

export interface RouteParams {
  lang?: string;
  country?: string;
  service?: string;
  specialty?: string;
}
