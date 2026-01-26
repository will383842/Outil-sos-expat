# Spécifications Complètes Landing Pages SOS Expat 2026

> **Document unique** regroupant toutes les spécifications pour les landing pages d'exception.

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture](#2-architecture)
3. [Structure JSON Backend](#3-structure-json-backend)
4. [Types TypeScript](#4-types-typescript)
5. [Design System](#5-design-system)
6. [Composants](#6-composants)
7. [Mobile First](#7-mobile-first)
8. [Animations](#8-animations)
9. [Performance](#9-performance)
10. [Accessibilité](#10-accessibilité)
11. [SEO & Schema.org](#11-seo--schemaorg)
12. [Conversion](#12-conversion)
13. [Intégration Firebase](#13-intégration-firebase)
14. [Tests](#14-tests)
15. [Checklist](#15-checklist)

---

## 1. Vue d'ensemble

### 1.1 Objectif

Créer des landing pages d'exception pour 197 pays × 9 langues avec :
- **Design premium** inspiré des meilleures startups 2026
- **Performance parfaite** (100/100 Lighthouse)
- **Mobile first** exceptionnel
- **Accessibilité WCAG 2.1 AAA**
- **SEO Position 0** optimisé
- **Conversion maximale**

### 1.2 Stack Technique

```
Frontend: React 18 + TypeScript + Vite + Tailwind CSS
Animation: Framer Motion
State: React Query / Firebase Firestore
Routing: React Router v6
Pre-rendering: react-snap
```

### 1.3 Flux de Données

```
eng-content-generate (Laravel)
        ↓
    Génère JSON enrichi
        ↓
    Firebase Firestore
        ↓
    sos-expat.com (React)
        ↓
    Landing Pages rendues
```

---

## 2. Architecture

### 2.1 Structure Fichiers

```
src/
├── components/
│   └── landing/
│       ├── LandingPage.tsx           # Orchestrateur principal
│       ├── LandingHero.tsx           # Section hero
│       ├── LandingTrust.tsx          # Social proof & stats
│       ├── LandingProblem.tsx        # Section problème
│       ├── LandingSolution.tsx       # Section solution
│       ├── LandingProcess.tsx        # Comment ça marche
│       ├── LandingBenefits.tsx       # Avantages
│       ├── LandingFAQ.tsx            # FAQ avec Position 0
│       ├── LandingTestimonials.tsx   # Témoignages
│       ├── LandingCTA.tsx            # CTA final
│       ├── LandingSchema.tsx         # JSON-LD injection
│       ├── LandingBreadcrumbs.tsx    # Fil d'ariane
│       ├── StickyCTAMobile.tsx       # CTA sticky mobile
│       └── SocialProofPopup.tsx      # Popup activité récente
├── hooks/
│   ├── useLandingData.ts             # Fetch landing depuis Firestore
│   ├── useIsMobile.ts                # Détection mobile
│   ├── useScrollDirection.ts         # Direction scroll
│   ├── useReducedMotion.ts           # Préférence animation
│   └── useHapticFeedback.ts          # Feedback tactile
├── types/
│   └── landing.ts                    # Types TypeScript
├── styles/
│   ├── landing.css                   # Styles spécifiques
│   └── mobile-first.css              # Styles mobile
└── lib/
    ├── firebase.ts                   # Config Firebase
    └── animations.ts                 # Config animations
```

### 2.2 Routes

```tsx
// App.tsx
import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/landing/LandingPage';

function App() {
  return (
    <Routes>
      {/* Landing pages pattern */}
      <Route path="/:lang/:country/:service/:specialty?" element={<LandingPage />} />
      <Route path="/:country/:service/:specialty?" element={<LandingPage />} />

      {/* Exemples URLs:
        /de/lawyers/family-law       → Allemagne, français, avocats famille
        /en/de/lawyers/family-law    → Allemagne, anglais, avocats famille
        /es/us/services/immigration  → USA, espagnol, services immigration
      */}
    </Routes>
  );
}
```

---

## 3. Structure JSON Backend

Le backend génère un JSON complet avec toutes les données nécessaires :

```typescript
interface LandingJSON {
  // Identification
  version: '2.0';
  type: 'landing';
  template: 'minimal' | 'complete' | 'conversion';
  id: string;
  articleId: string;
  status: 'published' | 'draft';

  // Routing
  routing: {
    slug: string;
    fullPath: string;
    canonicalUrl: string;
    language: string;
    country: string;
    locale: string;
    hreflang: Array<{ lang: string; url: string }>;
  };

  // SEO
  seo: {
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
  };

  // Breadcrumbs
  breadcrumbs: Array<{
    name: string;
    url: string;
    position: number;
  }>;

  // E-E-A-T
  eeat: {
    expertise: { author: object; reviewedBy: object };
    experience: { yearsInBusiness: number; countriesCovered: number; clientsHelped: string; successRate: string };
    authority: { certifications: string[]; partnerships: string[]; mentions: string[] };
    trust: { securityBadges: string[]; guarantees: string[]; ratings: object };
    lastReviewed: string;
    lastUpdated: string;
  };

  // Ciblage
  targeting: {
    country: { code: string; nameFr: string; nameEn: string; flag: string };
    language: { code: string; name: string; direction: 'ltr' | 'rtl'; locale: string };
    specialty: { id: string; code: string; name: string; slug: string; category: string } | null;
    objective: string;
    uniqueAngle: string;
  };

  // CTA
  cta: {
    primary_url: string;
    primary_text: string;
    secondary_url?: string;
    secondary_text?: string;
    tracking_params?: object;
  };

  // Sections de contenu
  sections: {
    hero: { title: string; subtitle: string; image?: object; badges?: string[] };
    problem: { title: string; items: Array<{ title: string; description: string; icon: string }> };
    solution: { title: string; features: array };
    howItWorks: { title: string; steps: Array<{ number: number; title: string; description: string; estimatedTime: string }> };
    advantages: { items: Array<{ title: string; description: string; icon: string }> };
    testimonials: { items: array; aggregateRating: object };
    faq: { title: string; items: Array<{ question: string; answer: string; answerShort: string; format: string }> };
    cta: { title: string; subtitle?: string; primaryCta: object; secondaryCta?: object; reassurance: string };
  };

  // Schema.org
  schema: {
    webPage: object;
    faqPage: object;
    breadcrumbList: object;
    howTo: object | null;
    service: object;
    organization: object;
    reviews: object | null;
  };

  // Timestamps
  timestamps: {
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    lastReviewed: string;
  };

  // Métadonnées
  metadata: {
    source: string;
    generator: string;
    model: string;
    qualityScore: number;
    seoScore: number;
  };

  // UX/UI Excellence 2026
  animations: object;      // Config Framer Motion
  trustBadges: array;      // Badges de confiance
  conversion: object;      // Config conversion
  socialProof: object;     // Données social proof
  performance: object;     // Hints performance
  accessibility: object;   // Config accessibilité
  mobile: object;          // Config mobile first
}
```

---

## 4. Types TypeScript

```typescript
// types/landing.ts

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
  answerShort: string;  // Pour Position 0 (30-60 mots)
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
  webPage: object;
  faqPage: object;
  breadcrumbList: object;
  howTo: object | null;
  service: object;
  organization: object;
  reviews: object | null;
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
```

---

## 5. Design System

### 5.1 Couleurs

```typescript
// tailwind.config.ts
const colors = {
  // Primaire - Bleu confiance
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',  // Principal
    600: '#2563eb',  // Hover
    700: '#1d4ed8',  // Active
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },

  // Accent - Or premium pour CTAs
  accent: {
    400: '#fbbf24',
    500: '#f59e0b',  // CTA principal
    600: '#d97706',  // CTA hover
  },

  // Succès
  success: {
    50: '#ecfdf5',
    500: '#10b981',
    600: '#059669',
  },

  // Surfaces
  surface: {
    light: '#ffffff',
    subtle: '#f8fafc',
    muted: '#f1f5f9',
    dark: '#0f172a',
  },

  // Texte
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#94a3b8',
    inverse: '#ffffff',
  },
};
```

### 5.2 Typographie

```typescript
const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    display: ['Outfit', 'Inter', 'sans-serif'],
  },

  // Mobile first sizes
  fontSize: {
    'xs': '0.75rem',     // 12px
    'sm': '0.875rem',    // 14px
    'base': '1rem',      // 16px
    'lg': '1.125rem',    // 18px
    'xl': '1.25rem',     // 20px
    '2xl': '1.5rem',     // 24px
    '3xl': '1.875rem',   // 30px - H1 mobile
    '4xl': '2.25rem',    // 36px
    '5xl': '3rem',       // 48px - H1 tablet
    '6xl': '3.75rem',    // 60px - H1 desktop
  },
};
```

### 5.3 Espacements

```typescript
// Grille 8px
const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
};
```

### 5.4 Ombres

```typescript
const boxShadow = {
  'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07)',
  'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1)',
  'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15)',
  'cta': '0 10px 30px -5px rgba(245, 158, 11, 0.4)',
};
```

---

## 6. Composants

### 6.1 LandingPage (Orchestrateur)

```tsx
// components/landing/LandingPage.tsx
import { useParams } from 'react-router-dom';
import { useLandingData } from '../../hooks/useLandingData';
import { LandingSchema } from './LandingSchema';
import { LandingHero } from './LandingHero';
import { LandingTrust } from './LandingTrust';
import { LandingProblem } from './LandingProblem';
import { LandingSolution } from './LandingSolution';
import { LandingProcess } from './LandingProcess';
import { LandingBenefits } from './LandingBenefits';
import { LandingFAQ } from './LandingFAQ';
import { LandingTestimonials } from './LandingTestimonials';
import { LandingCTA } from './LandingCTA';
import { StickyCTAMobile } from './StickyCTAMobile';
import { PageLoader } from '../ui/PageLoader';

export const LandingPage: React.FC = () => {
  const params = useParams();
  const { data, isLoading, error } = useLandingData(params);

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorPage />;

  const { sections, cta, eeat, socialProof, targeting } = data;

  return (
    <>
      {/* Skip link accessibilité */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        {data.accessibility.skipLinks[0].label}
      </a>

      {/* Schema.org JSON-LD */}
      <LandingSchema schema={data.schema} />

      {/* Meta tags */}
      <LandingMeta seo={data.seo} routing={data.routing} />

      {/* Hero */}
      <LandingHero
        hero={sections.hero}
        cta={cta}
        trustBadges={data.trustBadges}
        targeting={targeting}
      />

      <main id="main-content">
        {/* Trust Section */}
        <LandingTrust
          stats={socialProof.stats}
          testimonial={socialProof.highlightTestimonial}
          partnerLogos={socialProof.partnerLogos}
          pressLogos={socialProof.pressLogos}
        />

        {/* Problem */}
        {sections.problem && (
          <LandingProblem problem={sections.problem} />
        )}

        {/* Solution */}
        {sections.solution && (
          <LandingSolution solution={sections.solution} cta={cta} />
        )}

        {/* Process */}
        {sections.howItWorks && (
          <LandingProcess process={sections.howItWorks} />
        )}

        {/* Benefits */}
        {sections.advantages && (
          <LandingBenefits benefits={sections.advantages} />
        )}

        {/* Testimonials */}
        {sections.testimonials && (
          <LandingTestimonials testimonials={sections.testimonials} />
        )}

        {/* FAQ */}
        <LandingFAQ faq={sections.faq} />

        {/* Final CTA */}
        <LandingCTA
          ctaSection={sections.cta}
          cta={cta}
          guarantee={data.conversion.guarantee}
        />
      </main>

      {/* Sticky CTA Mobile */}
      {data.conversion.stickyCta.enabled && (
        <StickyCTAMobile
          cta={cta}
          config={data.conversion.stickyCta}
        />
      )}

      {/* Social Proof Popup */}
      {data.conversion.socialProofPopup.enabled && (
        <SocialProofPopup
          activities={socialProof.recentActivity}
          config={data.conversion.socialProofPopup}
        />
      )}
    </>
  );
};
```

### 6.2 LandingHero

```tsx
// components/landing/LandingHero.tsx
import { motion, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface LandingHeroProps {
  hero: HeroSection;
  cta: CTAData;
  trustBadges: TrustBadge[];
  targeting: LandingTargeting;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  hero,
  cta,
  trustBadges,
  targeting,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const shouldAnimate = !prefersReducedMotion;

  return (
    <section
      ref={ref}
      className="
        relative
        min-h-[85vh]
        flex items-center
        overflow-hidden
        px-4 sm:px-6 lg:px-8
        pt-safe pb-20
      "
      aria-labelledby="hero-title"
    >
      {/* Background avec parallax */}
      <motion.div
        className="absolute inset-0 -z-10"
        style={shouldAnimate ? { y } : undefined}
      >
        {hero.image ? (
          <picture>
            <source srcSet={`${hero.image.src}?w=750&q=75`} media="(max-width: 640px)" />
            <source srcSet={`${hero.image.src}?w=1080&q=80`} media="(max-width: 1024px)" />
            <img
              src={`${hero.image.src}?w=1920&q=85`}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </picture>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/70 via-primary-900/50 to-primary-900/80" />
      </motion.div>

      {/* Contenu */}
      <motion.div
        className="relative z-10 w-full max-w-4xl mx-auto text-center"
        initial={shouldAnimate ? { opacity: 0 } : false}
        animate={inView ? { opacity: 1 } : false}
        style={shouldAnimate ? { opacity } : undefined}
      >
        {/* Badge de confiance */}
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
          animate={inView && shouldAnimate ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <span className="
            inline-flex items-center gap-2
            px-3 py-1.5 sm:px-4 sm:py-2
            bg-white/10 backdrop-blur-sm
            rounded-full
            text-white/90 text-sm font-medium
            border border-white/20
          ">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {trustBadges[0]?.text}
          </span>
        </motion.div>

        {/* Titre */}
        <motion.h1
          id="hero-title"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          animate={inView && shouldAnimate ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="
            font-display font-bold text-white
            text-3xl sm:text-4xl md:text-5xl lg:text-6xl
            leading-tight
            mb-4 sm:mb-6
          "
        >
          {hero.title}
        </motion.h1>

        {/* Sous-titre */}
        <motion.p
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          animate={inView && shouldAnimate ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="
            text-white/80
            text-lg sm:text-xl md:text-2xl
            leading-relaxed
            max-w-2xl mx-auto
            mb-8 sm:mb-10
          "
        >
          {hero.subtitle}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          animate={inView && shouldAnimate ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10"
        >
          {/* CTA Primaire */}
          <a
            href={cta.primary_url}
            className="
              w-full sm:w-auto
              inline-flex items-center justify-center gap-2
              px-8 py-4
              bg-gradient-to-r from-accent-500 to-accent-400
              text-white font-semibold text-lg
              rounded-xl
              shadow-cta
              min-h-[48px]
              active:scale-[0.98]
              transition-transform duration-150
              hover:from-accent-600 hover:to-accent-500
            "
          >
            {cta.primary_text}
            <ArrowRightIcon className="w-5 h-5" />
          </a>

          {/* CTA Secondaire */}
          {cta.secondary_url && (
            <a
              href={cta.secondary_url}
              className="
                w-full sm:w-auto
                inline-flex items-center justify-center
                px-8 py-4
                bg-white/10 backdrop-blur-sm
                text-white font-medium
                border border-white/30
                rounded-xl
                min-h-[48px]
                active:bg-white/20
                transition-colors duration-150
              "
            >
              {cta.secondary_text}
            </a>
          )}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={shouldAnimate ? { opacity: 0 } : false}
          animate={inView && shouldAnimate ? { opacity: 1 } : false}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4 sm:gap-6 text-white/70"
        >
          {trustBadges.slice(0, 4).map((badge) => (
            <div key={badge.id} className="flex items-center gap-2">
              <DynamicIcon name={badge.icon} className="w-4 h-4 sm:w-5 sm:h-5 text-accent-400" />
              <span className="text-sm">{badge.text}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Indicateur scroll */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={shouldAnimate ? { y: [0, 10, 0] } : false}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDownIcon className="w-8 h-8 text-white/50" />
      </motion.div>
    </section>
  );
};
```

### 6.3 LandingFAQ (Position 0)

```tsx
// components/landing/LandingFAQ.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface LandingFAQProps {
  faq: FAQSection;
}

export const LandingFAQ: React.FC<LandingFAQProps> = ({ faq }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section
      ref={ref}
      className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50"
      aria-labelledby="faq-title"
    >
      <div className="max-w-3xl mx-auto">
        {/* Titre */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-10 sm:mb-12"
        >
          <span className="
            inline-block px-4 py-2
            bg-primary-100 text-primary-700
            rounded-full text-sm font-semibold
            mb-4
          ">
            FAQ
          </span>
          <h2
            id="faq-title"
            className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-slate-900"
          >
            {faq.title}
          </h2>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-3 sm:space-y-4">
          {faq.items.map((item, index) => (
            <FAQAccordionItem
              key={index}
              item={item}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQAccordionItem: React.FC<{
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  inView: boolean;
}> = ({ item, index, isOpen, onToggle, inView }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1 }}
      className={`
        bg-white rounded-xl overflow-hidden
        shadow-sm hover:shadow-md
        transition-shadow duration-300
        ${isOpen ? 'ring-2 ring-primary-500/20' : ''}
      `}
    >
      {/* Question */}
      <button
        onClick={onToggle}
        className="
          w-full
          flex items-center justify-between
          px-4 sm:px-6 py-4 sm:py-5
          text-left
          min-h-[48px]
          group
        "
        aria-expanded={isOpen}
        id={`faq-question-${index}`}
        aria-controls={`faq-answer-${index}`}
      >
        <span className="
          font-semibold text-base sm:text-lg
          text-slate-900 group-hover:text-primary-600
          transition-colors pr-4
        ">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="
            flex-shrink-0
            w-8 h-8 sm:w-10 sm:h-10
            flex items-center justify-center
            bg-primary-100 rounded-lg
            group-hover:bg-primary-200
            transition-colors
          "
        >
          <ChevronDownIcon className="w-5 h-5 text-primary-600" />
        </motion.span>
      </button>

      {/* Réponse */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-answer-${index}`}
            role="region"
            aria-labelledby={`faq-question-${index}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="pt-2 border-t border-slate-100">
                {/* Réponse courte pour Position 0 (visible) */}
                <p
                  className="faq-answer-short text-slate-700 leading-relaxed pt-4 font-medium"
                  data-speakable={item.speakable}
                >
                  {item.answerShort}
                </p>

                {/* Réponse complète */}
                {item.answer !== item.answerShort && (
                  <p className="text-slate-600 leading-relaxed mt-3">
                    {item.answer}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
```

### 6.4 StickyCTAMobile

```tsx
// components/landing/StickyCTAMobile.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface StickyCTAMobileProps {
  cta: CTAData;
  config: {
    enabled: boolean;
    showAfterScroll: number;
    hideOnFooter: boolean;
  };
}

export const StickyCTAMobile: React.FC<StickyCTAMobileProps> = ({ cta, config }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      const shouldShow = currentScroll > config.showAfterScroll;
      const nearFooter = config.hideOnFooter && (currentScroll + windowHeight > docHeight - 200);

      setIsVisible(shouldShow && !nearFooter);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [config]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        >
          <div className="bg-white/95 backdrop-blur-lg border-t border-slate-200 px-4 py-3 pb-safe">
            {/* Progress bar */}
            <ReadingProgressBar />

            {/* CTA */}
            <a
              href={cta.primary_url}
              className="
                flex items-center justify-center gap-2
                w-full py-4
                bg-gradient-to-r from-accent-500 to-accent-400
                text-white font-semibold
                rounded-xl shadow-lg
                min-h-[48px]
                active:scale-[0.98]
                transition-transform duration-150
              "
              onClick={() => {
                if ('vibrate' in navigator) navigator.vibrate(10);
              }}
            >
              <span>{cta.primary_text}</span>
              <ArrowRightIcon className="w-5 h-5" />
            </a>

            {/* Réassurance */}
            <p className="text-center text-xs text-slate-500 mt-2">
              Sans engagement • Réponse sous 24h
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ReadingProgressBar: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setProgress((winScroll / height) * 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="h-1 bg-slate-200 rounded-full mb-3 overflow-hidden">
      <motion.div
        className="h-full bg-primary-500 rounded-full"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
```

### 6.5 LandingSchema (JSON-LD)

```tsx
// components/landing/LandingSchema.tsx
import { Helmet } from 'react-helmet-async';

interface LandingSchemaProps {
  schema: SchemaOrg;
}

export const LandingSchema: React.FC<LandingSchemaProps> = ({ schema }) => {
  return (
    <Helmet>
      {/* WebPage */}
      <script type="application/ld+json">
        {JSON.stringify(schema.webPage)}
      </script>

      {/* FAQPage */}
      <script type="application/ld+json">
        {JSON.stringify(schema.faqPage)}
      </script>

      {/* BreadcrumbList */}
      <script type="application/ld+json">
        {JSON.stringify(schema.breadcrumbList)}
      </script>

      {/* HowTo (si présent) */}
      {schema.howTo && (
        <script type="application/ld+json">
          {JSON.stringify(schema.howTo)}
        </script>
      )}

      {/* Service */}
      <script type="application/ld+json">
        {JSON.stringify(schema.service)}
      </script>

      {/* Organization */}
      <script type="application/ld+json">
        {JSON.stringify(schema.organization)}
      </script>

      {/* Reviews (si présent) */}
      {schema.reviews && (
        <script type="application/ld+json">
          {JSON.stringify(schema.reviews)}
        </script>
      )}
    </Helmet>
  );
};
```

---

## 7. Mobile First

### 7.1 Breakpoints

```typescript
// Mobile first = min-width
const screens = {
  'xs': '320px',   // Petits mobiles
  'sm': '640px',   // Mobiles standard
  'md': '768px',   // Tablettes portrait
  'lg': '1024px',  // Tablettes paysage
  'xl': '1280px',  // Desktop
  '2xl': '1536px', // Grand écran
};
```

### 7.2 Touch Targets

```css
/* Minimum 48x48px pour tous les éléments interactifs */
button, a, [role="button"] {
  min-height: 48px;
  min-width: 48px;
}

/* Désactiver tap highlight */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Éviter zoom sur input iOS */
input, select, textarea {
  font-size: 16px !important;
}
```

### 7.3 Safe Areas

```css
/* Safe area pour notch et home indicator */
.pt-safe { padding-top: env(safe-area-inset-top); }
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
.pl-safe { padding-left: env(safe-area-inset-left); }
.pr-safe { padding-right: env(safe-area-inset-right); }
```

### 7.4 Hooks Mobile

```typescript
// hooks/useIsMobile.ts
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// hooks/useScrollDirection.ts
export function useScrollDirection(threshold = 10): 'up' | 'down' | null {
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;

      if (Math.abs(diff) > threshold) {
        setDirection(diff > 0 ? 'down' : 'up');
        lastScrollY.current = currentY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return direction;
}
```

---

## 8. Animations

### 8.1 Configuration Framer Motion

```typescript
// lib/animations.ts
export const transitions = {
  default: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  fade: {
    duration: 0.4,
    ease: [0.25, 0.46, 0.45, 0.94],
  },
  bounce: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  },
};

export const variants = {
  fadeInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  fadeInScale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  },
};
```

### 8.2 Reduced Motion

```typescript
// hooks/useReducedMotion.ts
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// Usage
const Component = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={prefersReducedMotion ? false : { opacity: 1 }}
    />
  );
};
```

---

## 9. Performance

### 9.1 Core Web Vitals Targets

| Métrique | Target | Max |
|----------|--------|-----|
| LCP | < 2.5s | 4s |
| FID | < 100ms | 300ms |
| CLS | < 0.1 | 0.25 |

### 9.2 Optimisations Images

```tsx
// Utiliser srcset pour responsive
<picture>
  <source srcSet={`${src}?w=750&q=75`} media="(max-width: 640px)" />
  <source srcSet={`${src}?w=1080&q=80`} media="(max-width: 1024px)" />
  <img
    src={`${src}?w=1920&q=85`}
    alt={alt}
    loading="lazy"
    decoding="async"
  />
</picture>
```

### 9.3 Bundle Splitting

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'animation': ['framer-motion'],
          'firebase': ['firebase/app', 'firebase/firestore'],
        },
      },
    },
  },
});
```

### 9.4 Lazy Loading Sections

```tsx
import { lazy, Suspense } from 'react';

const LazyFAQ = lazy(() => import('./LandingFAQ'));
const LazyTestimonials = lazy(() => import('./LandingTestimonials'));

// Usage
<Suspense fallback={<SectionSkeleton />}>
  <LazyFAQ faq={faq} />
</Suspense>
```

---

## 10. Accessibilité

### 10.1 WCAG 2.1 Checklist

- [x] Skip links fonctionnels
- [x] Hiérarchie heading correcte (h1 → h2 → h3)
- [x] Alt text sur toutes les images
- [x] Contraste minimum 4.5:1
- [x] Focus visible au clavier
- [x] Reduced motion supporté
- [x] Touch targets 48x48px minimum
- [x] ARIA labels appropriés
- [x] Rôles landmarks corrects

### 10.2 Skip Links

```tsx
<a
  href="#main-content"
  className="
    sr-only
    focus:not-sr-only
    focus:absolute focus:top-4 focus:left-4
    focus:z-50
    focus:bg-white focus:px-4 focus:py-2
    focus:rounded-lg focus:shadow-lg
  "
>
  Aller au contenu principal
</a>
```

### 10.3 Focus Visible

```css
:focus:not(:focus-visible) {
  outline: none;
}

:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

---

## 11. SEO & Schema.org

### 11.1 Meta Tags

```tsx
// components/landing/LandingMeta.tsx
import { Helmet } from 'react-helmet-async';

export const LandingMeta: React.FC<{ seo: LandingSEO; routing: LandingRouting }> = ({
  seo,
  routing,
}) => (
  <Helmet>
    {/* Basiques */}
    <title>{seo.metaTitle}</title>
    <meta name="description" content={seo.metaDescription} />
    <meta name="robots" content={seo.robots} />
    <link rel="canonical" href={seo.canonicalUrl} />

    {/* Open Graph */}
    <meta property="og:type" content={seo.ogType} />
    <meta property="og:title" content={seo.ogTitle} />
    <meta property="og:description" content={seo.ogDescription} />
    <meta property="og:image" content={seo.ogImage} />
    <meta property="og:url" content={seo.ogUrl} />

    {/* Twitter */}
    <meta name="twitter:card" content={seo.twitterCard} />
    <meta name="twitter:title" content={seo.twitterTitle} />
    <meta name="twitter:description" content={seo.twitterDescription} />
    <meta name="twitter:image" content={seo.twitterImage} />

    {/* Hreflang */}
    {routing.hreflang.map((entry) => (
      <link
        key={entry.lang}
        rel="alternate"
        hrefLang={entry.lang}
        href={entry.url}
      />
    ))}
  </Helmet>
);
```

### 11.2 Schema.org Types

Le backend génère automatiquement :
- **WebPage** - Page principale
- **FAQPage** - Questions/réponses (Position 0)
- **BreadcrumbList** - Fil d'ariane
- **HowTo** - Étapes du processus
- **Service** - Description du service
- **Organization** - Infos entreprise
- **Review** - Témoignages clients

---

## 12. Conversion

### 12.1 Patterns Psychologiques

| Pattern | Implémentation |
|---------|----------------|
| **Urgency** | Badge "Plus que X places" |
| **Social Proof** | Popup activité récente |
| **Authority** | Badges partenaires |
| **Reciprocity** | Guide gratuit offert |
| **Guarantee** | Badge satisfaction |

### 12.2 Sticky CTA Mobile

- Apparaît après 300px de scroll
- Disparaît proche du footer
- Barre de progression lecture
- Feedback haptique au clic
- Safe area respectée

### 12.3 Trust Signals

- 4 badges dans le hero
- Stats animées (compteurs)
- Témoignage highlight
- Logos partenaires
- Logos presse

---

## 13. Intégration Firebase

### 13.1 Configuration

```typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

### 13.2 Hook useLandingData

```typescript
// hooks/useLandingData.ts
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface RouteParams {
  lang?: string;
  country?: string;
  service?: string;
  specialty?: string;
}

export function useLandingData(params: RouteParams) {
  const documentId = buildDocumentId(params);

  return useQuery({
    queryKey: ['landing', documentId],
    queryFn: async () => {
      const docRef = doc(db, 'landings', documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Landing not found');
      }

      return docSnap.data() as LandingData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}

function buildDocumentId(params: RouteParams): string {
  const lang = params.lang || 'fr';
  const country = params.country || '';
  const service = params.service || 'services';
  const specialty = params.specialty || '';

  return `${country}_${lang}_${service}${specialty ? '_' + specialty : ''}`;
}
```

---

## 14. Tests

### 14.1 Tests Unitaires

```typescript
// tests/LandingHero.test.tsx
import { render, screen } from '@testing-library/react';
import { LandingHero } from '../components/landing/LandingHero';

describe('LandingHero', () => {
  const mockData = {
    hero: { title: 'Test Title', subtitle: 'Test Subtitle' },
    cta: { primary_url: '/contact', primary_text: 'Contact' },
    trustBadges: [],
    targeting: { language: { direction: 'ltr' } },
  };

  it('renders title correctly', () => {
    render(<LandingHero {...mockData} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Title');
  });

  it('renders CTA with correct link', () => {
    render(<LandingHero {...mockData} />);
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '/contact');
  });
});
```

### 14.2 Tests Accessibilité

```typescript
// tests/a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Landing Page Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<LandingPage data={mockData} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

---

## 15. Checklist

### Avant Publication

#### Design
- [ ] Responsive parfait (320px → 2560px)
- [ ] Contraste WCAG AA minimum
- [ ] Touch targets 48x48px
- [ ] Safe areas respectées
- [ ] Dark mode supporté (optionnel)

#### Performance
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Lighthouse 95+ sur toutes catégories
- [ ] Bundle < 200kb initial

#### Accessibilité
- [ ] Skip links fonctionnels
- [ ] Navigation clavier complète
- [ ] Screen reader compatible
- [ ] Reduced motion supporté
- [ ] Focus visible

#### SEO
- [ ] Meta title < 60 caractères
- [ ] Meta description < 160 caractères
- [ ] Schema.org complet
- [ ] Hreflang pour toutes langues
- [ ] Canonical correct

#### Conversion
- [ ] CTA visible above fold
- [ ] Sticky CTA mobile
- [ ] Trust signals présents
- [ ] Social proof visible
- [ ] Guarantee affichée

#### Mobile
- [ ] Hero optimisé mobile
- [ ] Navigation accessible au pouce
- [ ] Formulaires adaptés
- [ ] Images optimisées
- [ ] Gestures supportées

---

## Conclusion

Ces spécifications garantissent des landing pages :

1. **Exceptionnellement belles** - Design premium 2026
2. **Ultra performantes** - 100/100 Lighthouse
3. **Totalement accessibles** - WCAG 2.1 AAA
4. **Mobile first parfait** - UX native-like
5. **SEO Position 0** - Schema.org complet
6. **Conversion maximale** - Patterns psychologiques optimisés

L'implémentation de ces guidelines positionnera SOS Expat comme référence UX/UI dans le secteur des services aux expatriés.
