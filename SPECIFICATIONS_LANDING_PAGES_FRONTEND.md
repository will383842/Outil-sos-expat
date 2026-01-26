# SPÉCIFICATIONS LANDING PAGES - SOS-EXPAT FRONTEND

## Version 2026-01-26 | Perfection SEO & Conversion

---

## TABLE DES MATIÈRES

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture](#2-architecture)
3. [Structure JSON du Backend](#3-structure-json-du-backend)
4. [Composants à créer](#4-composants-à-créer)
5. [Pages/Routes](#5-pagesroutes)
6. [Intégration Firebase](#6-intégration-firebase)
7. [SEO & Schema.org](#7-seo--schemaorg)
8. [Styling & Design System](#8-styling--design-system)
9. [Internationalisation](#9-internationalisation)
10. [Performance](#10-performance)
11. [Tests](#11-tests)
12. [Checklist d'implémentation](#12-checklist-dimplémentation)

---

## 1. VUE D'ENSEMBLE

### 1.1 Objectif

Créer un système de landing pages dynamiques qui :
- Consomme le JSON enrichi généré par `eng-content-generate`
- Réutilise les composants existants de sos-expat
- Optimise pour le SEO (Position 0, Featured Snippets, Schema.org)
- Supporte 9 langues et 197 pays
- Convertit les visiteurs en clients/avocats partenaires

### 1.2 Types de Landing Pages

| Type | Objectif | Template |
|------|----------|----------|
| `client_acquisition` | Acquérir des clients expatriés | `complete` ou `conversion` |
| `recruitment_lawyer` | Recruter des avocats partenaires | `conversion` |
| `recruitment_helper` | Recruter des assistants | `minimal` |

### 1.3 Templates disponibles

```
minimal     → Hero + Problem + Solution + CTA (pages simples)
complete    → Toutes les sections (pages complètes)
conversion  → Focus conversion avec témoignages + pricing
```

---

## 2. ARCHITECTURE

### 2.1 Flux de données

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  eng-content-generate (Backend Laravel)                         │
│  ├── LandingContentBuilder.php                                  │
│  ├── CtaResolver.php                                            │
│  └── CloudflareGitHubConnector.php                              │
│                         │                                       │
│                         ▼ JSON enrichi                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │                   Firebase Firestore                        │
│  │                                                             │
│  │  Collection: "landings"                                     │
│  │  Document ID: "{country}_{lang}_{objective}_{specialty?}"   │
│  │                                                             │
│  │  Exemple: "de_fr_client_acquisition_family_law"             │
│  └─────────────────────────────────────────────────────────────┘
│                         │                                       │
│                         ▼ Fetch via React Hook                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │              sos-expat-project (Frontend React)             │
│  │                                                             │
│  │  hooks/useLandingData.ts        → Fetch + Cache             │
│  │  pages/Landing/LandingPage.tsx  → Orchestration             │
│  │  components/landing/*           → Rendu des sections        │
│  │                                                             │
│  └─────────────────────────────────────────────────────────────┘
│                         │                                       │
│                         ▼ HTML pré-rendu                        │
│                                                                 │
│  react-snap → SEO optimisé avec Schema.org                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Structure des dossiers à créer

```
src/
├── pages/
│   └── Landing/
│       ├── index.ts                    # Export barrel
│       ├── LandingPage.tsx             # Page principale (orchestrateur)
│       ├── LandingMinimal.tsx          # Template minimal
│       ├── LandingComplete.tsx         # Template complet
│       └── LandingConversion.tsx       # Template conversion
│
├── components/
│   └── landing/
│       ├── index.ts                    # Export barrel
│       ├── LandingHero.tsx             # Section Hero
│       ├── LandingProblem.tsx          # Section Problème
│       ├── LandingSolution.tsx         # Section Solution
│       ├── LandingAdvantages.tsx       # Section Avantages
│       ├── LandingHowItWorks.tsx       # Section Comment ça marche
│       ├── LandingFAQ.tsx              # Section FAQ (Schema.org)
│       ├── LandingTestimonials.tsx     # Section Témoignages
│       ├── LandingPricing.tsx          # Section Tarifs
│       ├── LandingCTA.tsx              # Boutons CTA dynamiques
│       ├── LandingBreadcrumbs.tsx      # Fil d'Ariane
│       ├── LandingSchema.tsx           # Injection JSON-LD
│       └── LandingEEAT.tsx             # Signaux E-E-A-T
│
├── hooks/
│   └── useLandingData.ts               # Hook fetch landing data
│
├── types/
│   └── landing.types.ts                # Types TypeScript
│
└── utils/
    └── landing.utils.ts                # Utilitaires landing
```

---

## 3. STRUCTURE JSON DU BACKEND

### 3.1 Format complet du JSON

Le backend (`eng-content-generate`) produit ce JSON :

```typescript
interface LandingData {
  // Métadonnées
  version: "2.0";
  type: "landing";
  template: "minimal" | "complete" | "conversion";
  id: number;
  articleId: number;
  status: "published" | "draft" | "needs_review";

  // Routing
  routing: {
    slug: string;
    fullPath: string;
    canonical: string;
    hreflang: Array<{
      lang: string;
      url: string;
    }>;
  };

  // SEO
  seo: {
    title: string;
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage: string;
    ogType: string;
  };

  // Breadcrumbs
  breadcrumbs: Array<{
    label: string;
    url: string;
    position: number;
  }>;

  // E-E-A-T Signals
  eeat: {
    expertise: {
      yearsExperience: number;
      certifications: string[];
      specializations: string[];
    };
    experience: {
      casesHandled: number;
      countriesCovered: number;
      clientTypes: string[];
    };
    authority: {
      partnerships: string[];
      mediaAppearances: string[];
      awards: string[];
    };
    trust: {
      rating: number;
      reviewCount: number;
      verifiedBadges: string[];
      guarantees: string[];
    };
  };

  // Ciblage
  targeting: {
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
      direction: "ltr" | "rtl";
      locale: string;
    };
    specialty: {
      id: number;
      code: string;
      name: string;
      slug: string;
      category: string;
    } | null;
    objective: "client_acquisition" | "recruitment_lawyer" | "recruitment_helper";
    uniqueAngle: string;
  };

  // CTAs résolus automatiquement
  cta: {
    id: number | null;
    slug: string;
    primary_url: string;
    secondary_url: string;
    primary_text: string;
    secondary_text: string;
    tracking_params: Record<string, string>;
    match_type: string;
    category: string;
  };

  // Sections de contenu
  sections: {
    hero: {
      title: string;
      subtitle: string;
      benefits: string[];
      image?: {
        src: string;
        alt: string;
        srcset?: string;
      };
    };
    problem: {
      sectionTitle: string;
      intro: string;
      problems: Array<{
        title: string;
        description: string;
        icon?: string;
      }>;
    };
    solution: {
      sectionTitle: string;
      intro: string;
      solutions: Array<{
        problemSolved: string;
        how: string;
        icon?: string;
      }>;
    };
    advantages: {
      sectionTitle: string;
      advantages: Array<{
        icon: string;
        title: string;
        description: string;
      }>;
    };
    howItWorks: {
      sectionTitle: string;
      steps: Array<{
        number: number;
        title: string;
        description: string;
        icon?: string;
      }>;
    };
    faq: {
      title: string;
      items: Array<{
        question: string;
        answer: string;
        answerShort: string;      // Pour Position 0 (30-60 mots)
        format: "paragraph" | "list" | "steps" | "table";
        wordCount: number;
        speakable: boolean;
      }>;
      totalQuestions: number;
    };
    testimonials?: {
      sectionTitle: string;
      items: Array<{
        author: string;
        role: string;
        country: string;
        rating: number;
        text: string;
        date: string;
        verified: boolean;
      }>;
    };
    pricing?: {
      sectionTitle: string;
      plans: Array<{
        name: string;
        price: string;
        period: string;
        features: string[];
        recommended: boolean;
        ctaText: string;
        ctaUrl: string;
      }>;
    };
    cta: {
      title: string;
      subtitle: string;
      primaryCta: string;
      reassurance: string;
    };
  };

  // Schema.org complet
  schema: {
    faqPage: object;           // FAQPage schema
    breadcrumbList: object;    // BreadcrumbList schema
    howTo?: object;            // HowTo schema (si steps)
    service: object;           // Service schema
    review?: object;           // Review schema (si testimonials)
    organization: object;      // Organization schema
  };

  // Timestamps
  timestamps: {
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    lastReviewed: string;
  };

  // Métadonnées de génération
  metadata: {
    source: string;
    generator: string;
    model: string;
    qualityScore: number;
    seoScore: number;
    uniquenessScore: number;
  };
}
```

### 3.2 Exemple JSON réel

```json
{
  "version": "2.0",
  "type": "landing",
  "template": "complete",
  "id": 1234,
  "articleId": 5678,
  "status": "published",

  "routing": {
    "slug": "avocat-droit-famille-allemagne",
    "fullPath": "/fr/de/avocats/famille",
    "canonical": "https://sos-expat.com/fr/de/avocats/famille",
    "hreflang": [
      { "lang": "fr", "url": "https://sos-expat.com/fr/de/avocats/famille" },
      { "lang": "en", "url": "https://sos-expat.com/en/de/lawyers/family" },
      { "lang": "de", "url": "https://sos-expat.com/de/de/anwaelte/familie" }
    ]
  },

  "seo": {
    "title": "Avocat Droit de la Famille en Allemagne",
    "metaTitle": "Avocat Droit Famille Allemagne | Divorce, Garde Enfants | SOS Expat",
    "metaDescription": "Trouvez un avocat francophone spécialisé en droit de la famille en Allemagne. Divorce, garde d'enfants, pension alimentaire. Consultation gratuite.",
    "keywords": ["avocat famille allemagne", "divorce expatrié", "garde enfants allemagne"]
  },

  "targeting": {
    "country": {
      "code": "DE",
      "nameFr": "Allemagne",
      "nameEn": "Germany",
      "nameLocal": "Deutschland",
      "flag": "🇩🇪"
    },
    "language": {
      "code": "fr",
      "name": "Français",
      "direction": "ltr",
      "locale": "fr-DE"
    },
    "specialty": {
      "id": 7,
      "code": "FAM",
      "name": "Droit de la Famille",
      "slug": "famille",
      "category": "family_law"
    },
    "objective": "client_acquisition"
  },

  "cta": {
    "id": 15,
    "slug": "legal-consultation-fr",
    "primary_url": "https://sos-expat.com/avocats/consultation",
    "secondary_url": "https://sos-expat.com/avocats/annuaire",
    "primary_text": "Consulter un avocat expatrié",
    "secondary_text": "Voir l'annuaire des avocats",
    "tracking_params": {
      "utm_source": "landing",
      "utm_medium": "cta",
      "utm_campaign": "legal_services"
    },
    "match_type": "category_specific",
    "category": "legal"
  },

  "sections": {
    "hero": {
      "title": "Avocat Droit de la Famille en Allemagne",
      "subtitle": "Un avocat francophone spécialisé pour vous accompagner dans vos démarches familiales",
      "benefits": [
        "Consultation gratuite de 15 minutes",
        "Avocats francophones vérifiés",
        "Expertise du droit allemand et français"
      ]
    },
    "faq": {
      "title": "Questions fréquentes",
      "items": [
        {
          "question": "Comment divorcer en Allemagne en tant qu'expatrié français ?",
          "answer": "Pour divorcer en Allemagne, vous devez d'abord respecter une année de séparation obligatoire (Trennungsjahr). Ensuite, vous pouvez déposer une demande de divorce auprès du tribunal de la famille (Familiengericht). Un avocat est obligatoire pour représenter au moins l'un des époux. En tant qu'expatrié français, vous pouvez choisir d'appliquer le droit français ou allemand selon votre situation.",
          "answerShort": "Pour divorcer en Allemagne, respectez d'abord l'année de séparation obligatoire, puis déposez une demande au tribunal de la famille avec un avocat obligatoire.",
          "format": "paragraph",
          "wordCount": 78,
          "speakable": true
        }
      ],
      "totalQuestions": 8
    },
    "cta": {
      "title": "Prêt à résoudre votre situation familiale ?",
      "subtitle": "Nos avocats francophones en Allemagne sont là pour vous aider",
      "primaryCta": "Consultation gratuite",
      "reassurance": "Sans engagement • Réponse sous 24h • 100% confidentiel"
    }
  },

  "schema": {
    "faqPage": {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [...]
    },
    "service": {
      "@context": "https://schema.org",
      "@type": "LegalService",
      "name": "Avocat Droit de la Famille - Allemagne",
      "provider": {
        "@type": "Organization",
        "name": "SOS Expat"
      }
    }
  }
}
```

---

## 4. COMPOSANTS À CRÉER

### 4.1 Types TypeScript

**Fichier : `src/types/landing.types.ts`**

```typescript
// ============================================================================
// LANDING PAGE TYPES - SOS EXPAT
// ============================================================================

export type LandingTemplate = 'minimal' | 'complete' | 'conversion';
export type LandingObjective = 'client_acquisition' | 'recruitment_lawyer' | 'recruitment_helper';
export type TextDirection = 'ltr' | 'rtl';
export type AnswerFormat = 'paragraph' | 'list' | 'steps' | 'table';

// ----- Routing -----
export interface LandingRouting {
  slug: string;
  fullPath: string;
  canonical: string;
  hreflang: HreflangEntry[];
}

export interface HreflangEntry {
  lang: string;
  url: string;
}

// ----- SEO -----
export interface LandingSEO {
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage?: string;
  ogType?: string;
}

// ----- Breadcrumbs -----
export interface BreadcrumbItem {
  label: string;
  url: string;
  position: number;
}

// ----- E-E-A-T -----
export interface LandingEEAT {
  expertise: {
    yearsExperience: number;
    certifications: string[];
    specializations: string[];
  };
  experience: {
    casesHandled: number;
    countriesCovered: number;
    clientTypes: string[];
  };
  authority: {
    partnerships: string[];
    mediaAppearances: string[];
    awards: string[];
  };
  trust: {
    rating: number;
    reviewCount: number;
    verifiedBadges: string[];
    guarantees: string[];
  };
}

// ----- Targeting -----
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
    direction: TextDirection;
    locale: string;
  };
  specialty: {
    id: number;
    code: string;
    name: string;
    slug: string;
    category: string;
  } | null;
  objective: LandingObjective;
  uniqueAngle: string;
}

// ----- CTA -----
export interface LandingCTA {
  id: number | null;
  slug: string;
  primary_url: string;
  secondary_url: string;
  primary_text: string;
  secondary_text: string;
  tracking_params: Record<string, string>;
  match_type: string;
  category: string;
}

// ----- Sections -----
export interface HeroSection {
  title: string;
  subtitle: string;
  benefits: string[];
  image?: {
    src: string;
    alt: string;
    srcset?: string;
  };
}

export interface ProblemSection {
  sectionTitle: string;
  intro: string;
  problems: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
}

export interface SolutionSection {
  sectionTitle: string;
  intro: string;
  solutions: Array<{
    problemSolved: string;
    how: string;
    icon?: string;
  }>;
}

export interface AdvantagesSection {
  sectionTitle: string;
  advantages: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export interface HowItWorksSection {
  sectionTitle: string;
  steps: Array<{
    number: number;
    title: string;
    description: string;
    icon?: string;
  }>;
}

export interface FAQItem {
  question: string;
  answer: string;
  answerShort: string;
  format: AnswerFormat;
  wordCount: number;
  speakable: boolean;
}

export interface FAQSection {
  title: string;
  items: FAQItem[];
  totalQuestions: number;
}

export interface TestimonialItem {
  author: string;
  role: string;
  country: string;
  rating: number;
  text: string;
  date: string;
  verified: boolean;
}

export interface TestimonialsSection {
  sectionTitle: string;
  items: TestimonialItem[];
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended: boolean;
  ctaText: string;
  ctaUrl: string;
}

export interface PricingSection {
  sectionTitle: string;
  plans: PricingPlan[];
}

export interface CTASection {
  title: string;
  subtitle: string;
  primaryCta: string;
  reassurance: string;
}

export interface LandingSections {
  hero: HeroSection;
  problem: ProblemSection;
  solution: SolutionSection;
  advantages: AdvantagesSection;
  howItWorks: HowItWorksSection;
  faq: FAQSection;
  testimonials?: TestimonialsSection;
  pricing?: PricingSection;
  cta: CTASection;
}

// ----- Schema.org -----
export interface LandingSchema {
  faqPage: object;
  breadcrumbList: object;
  howTo?: object;
  service: object;
  review?: object;
  organization: object;
}

// ----- Main Landing Data -----
export interface LandingData {
  version: string;
  type: 'landing';
  template: LandingTemplate;
  id: number;
  articleId: number;
  status: 'published' | 'draft' | 'needs_review';
  routing: LandingRouting;
  seo: LandingSEO;
  breadcrumbs: BreadcrumbItem[];
  eeat: LandingEEAT;
  targeting: LandingTargeting;
  cta: LandingCTA;
  sections: LandingSections;
  schema: LandingSchema;
  timestamps: {
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    lastReviewed: string;
  };
  metadata: {
    source: string;
    generator: string;
    model: string;
    qualityScore: number;
    seoScore: number;
    uniquenessScore: number;
  };
}

// ----- Hook Return Type -----
export interface UseLandingDataReturn {
  data: LandingData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

### 4.2 Hook useLandingData

**Fichier : `src/hooks/useLandingData.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { LandingData, UseLandingDataReturn } from '@/types/landing.types';

/**
 * Hook pour récupérer les données d'une landing page depuis Firestore
 *
 * @param countryCode - Code pays (ex: "de")
 * @param languageCode - Code langue (ex: "fr")
 * @param objective - Objectif (ex: "client_acquisition")
 * @param specialtySlug - Slug spécialité optionnel (ex: "famille")
 */
export function useLandingData(
  countryCode: string,
  languageCode: string,
  objective: string,
  specialtySlug?: string
): UseLandingDataReturn {
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Construire l'ID du document
  const documentId = specialtySlug
    ? `${countryCode}_${languageCode}_${objective}_${specialtySlug}`
    : `${countryCode}_${languageCode}_${objective}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const docRef = doc(db, 'landings', documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setData(docSnap.data() as LandingData);
      } else {
        setError(new Error(`Landing page not found: ${documentId}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook pour récupérer une landing par son slug complet
 */
export function useLandingBySlug(slug: string): UseLandingDataReturn {
  const [data, setData] = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Chercher par slug dans la collection
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(
        collection(db, 'landings'),
        where('routing.slug', '==', slug)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setData(querySnapshot.docs[0].data() as LandingData);
      } else {
        setError(new Error(`Landing page not found for slug: ${slug}`));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

### 4.3 Composant LandingPage (Orchestrateur)

**Fichier : `src/pages/Landing/LandingPage.tsx`**

```tsx
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useLandingData } from '@/hooks/useLandingData';
import { Layout } from '@/components/layout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Landing components
import {
  LandingHero,
  LandingProblem,
  LandingSolution,
  LandingAdvantages,
  LandingHowItWorks,
  LandingFAQ,
  LandingTestimonials,
  LandingPricing,
  LandingCTA,
  LandingBreadcrumbs,
  LandingSchema,
  LandingEEAT,
} from '@/components/landing';

import type { LandingData } from '@/types/landing.types';

interface LandingPageProps {
  // Props optionnelles pour SSR/pré-rendu
  preloadedData?: LandingData;
}

export const LandingPage: React.FC<LandingPageProps> = ({ preloadedData }) => {
  // Récupérer les paramètres de route
  const { country, language, objective, specialty } = useParams<{
    country: string;
    language: string;
    objective: string;
    specialty?: string;
  }>();

  // Fetch data (skip si preloaded)
  const { data, loading, error } = useLandingData(
    country || '',
    language || 'fr',
    objective || 'client_acquisition',
    specialty
  );

  // Utiliser preloaded si disponible
  const landingData = preloadedData || data;

  // Déterminer les sections à afficher selon le template
  const sectionsToRender = useMemo(() => {
    if (!landingData) return [];

    const template = landingData.template;
    const sections = landingData.sections;

    switch (template) {
      case 'minimal':
        return ['hero', 'problem', 'solution', 'cta'];
      case 'conversion':
        return ['hero', 'problem', 'solution', 'advantages', 'testimonials', 'pricing', 'faq', 'cta'];
      case 'complete':
      default:
        return ['hero', 'problem', 'solution', 'advantages', 'howItWorks', 'faq', 'testimonials', 'cta'];
    }
  }, [landingData]);

  // Loading state
  if (loading && !landingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  // Error state
  if (error && !landingData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Page non trouvée</h1>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </Layout>
    );
  }

  if (!landingData) return null;

  const { seo, routing, breadcrumbs, sections, cta, schema, targeting, eeat } = landingData;
  const isRTL = targeting.language.direction === 'rtl';

  return (
    <ErrorBoundary>
      <Layout className={isRTL ? 'rtl' : 'ltr'}>
        {/* SEO Meta Tags */}
        <Helmet>
          <title>{seo.metaTitle}</title>
          <meta name="description" content={seo.metaDescription} />
          <meta name="keywords" content={seo.keywords.join(', ')} />
          <link rel="canonical" href={routing.canonical} />

          {/* Hreflang */}
          {routing.hreflang.map((entry) => (
            <link
              key={entry.lang}
              rel="alternate"
              hrefLang={entry.lang}
              href={entry.url}
            />
          ))}

          {/* Open Graph */}
          <meta property="og:title" content={seo.metaTitle} />
          <meta property="og:description" content={seo.metaDescription} />
          <meta property="og:type" content={seo.ogType || 'website'} />
          <meta property="og:url" content={routing.canonical} />
          {seo.ogImage && <meta property="og:image" content={seo.ogImage} />}

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={seo.metaTitle} />
          <meta name="twitter:description" content={seo.metaDescription} />
        </Helmet>

        {/* Schema.org JSON-LD */}
        <LandingSchema schema={schema} />

        {/* Breadcrumbs */}
        <LandingBreadcrumbs items={breadcrumbs} />

        {/* Main Content */}
        <main className="landing-page">
          {/* Hero Section - Toujours présent */}
          {sectionsToRender.includes('hero') && (
            <LandingHero
              data={sections.hero}
              cta={cta}
              country={targeting.country}
            />
          )}

          {/* E-E-A-T Signals (après hero) */}
          <LandingEEAT data={eeat} />

          {/* Problem Section */}
          {sectionsToRender.includes('problem') && sections.problem && (
            <LandingProblem data={sections.problem} />
          )}

          {/* Solution Section */}
          {sectionsToRender.includes('solution') && sections.solution && (
            <LandingSolution data={sections.solution} />
          )}

          {/* Advantages Section */}
          {sectionsToRender.includes('advantages') && sections.advantages && (
            <LandingAdvantages data={sections.advantages} />
          )}

          {/* How It Works Section */}
          {sectionsToRender.includes('howItWorks') && sections.howItWorks && (
            <LandingHowItWorks data={sections.howItWorks} />
          )}

          {/* FAQ Section */}
          {sectionsToRender.includes('faq') && sections.faq && (
            <LandingFAQ data={sections.faq} />
          )}

          {/* Testimonials Section */}
          {sectionsToRender.includes('testimonials') && sections.testimonials && (
            <LandingTestimonials data={sections.testimonials} />
          )}

          {/* Pricing Section */}
          {sectionsToRender.includes('pricing') && sections.pricing && (
            <LandingPricing data={sections.pricing} />
          )}

          {/* Final CTA Section - Toujours présent */}
          {sectionsToRender.includes('cta') && (
            <LandingCTA
              data={sections.cta}
              cta={cta}
              variant="full"
            />
          )}
        </main>
      </Layout>
    </ErrorBoundary>
  );
};

export default LandingPage;
```

### 4.4 Composant LandingHero

**Fichier : `src/components/landing/LandingHero.tsx`**

```tsx
import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { HeroSection, LandingCTA } from '@/types/landing.types';

interface LandingHeroProps {
  data: HeroSection;
  cta: LandingCTA;
  country: {
    code: string;
    flag: string;
    nameLocal: string;
  };
}

export const LandingHero: React.FC<LandingHeroProps> = ({ data, cta, country }) => {
  const { title, subtitle, benefits, image } = data;

  // Construire URL avec tracking params
  const buildTrackedUrl = (baseUrl: string) => {
    const params = new URLSearchParams(cta.tracking_params);
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${params.toString()}`;
  };

  return (
    <section className="relative bg-gradient-to-br from-red-600 to-red-800 text-white py-16 md:py-24 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] bg-repeat" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center md:text-left">
            {/* Country Flag Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <span className="text-2xl">{country.flag}</span>
              <span className="font-medium">{country.nameLocal}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {title}
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              {subtitle}
            </p>

            {/* Benefits */}
            <ul className="space-y-3 mb-8">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3 text-lg">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={buildTrackedUrl(cta.primary_url)}
                className="btn-primary text-lg px-8 py-4 rounded-lg font-semibold
                         bg-white text-red-600 hover:bg-gray-100
                         transition-all duration-300 hover:scale-105
                         shadow-lg hover:shadow-xl text-center"
              >
                {cta.primary_text}
              </a>

              {cta.secondary_url && (
                <a
                  href={buildTrackedUrl(cta.secondary_url)}
                  className="btn-secondary text-lg px-8 py-4 rounded-lg font-semibold
                           border-2 border-white text-white hover:bg-white hover:text-red-600
                           transition-all duration-300 text-center"
                >
                  {cta.secondary_text}
                </a>
              )}
            </div>
          </div>

          {/* Image */}
          {image && (
            <div className="hidden md:block">
              <img
                src={image.src}
                alt={image.alt}
                srcSet={image.srcset}
                className="rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-500"
                loading="eager"
                width={600}
                height={400}
              />
            </div>
          )}
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
};

export default LandingHero;
```

### 4.5 Composant LandingFAQ (avec Schema.org)

**Fichier : `src/components/landing/LandingFAQ.tsx`**

```tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { FAQSection, FAQItem } from '@/types/landing.types';

interface LandingFAQProps {
  data: FAQSection;
}

export const LandingFAQ: React.FC<LandingFAQProps> = ({ data }) => {
  const { title, items, totalQuestions } = data;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 md:py-24 bg-gray-50" id="faq">
      <div className="container mx-auto px-4">
        {/* Section Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          <p className="text-gray-600">
            {totalQuestions} questions fréquentes
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto space-y-4">
          {items.map((item, index) => (
            <FAQAccordionItem
              key={index}
              item={item}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => toggleQuestion(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface FAQAccordionItemProps {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQAccordionItem: React.FC<FAQAccordionItemProps> = ({
  item,
  index,
  isOpen,
  onToggle,
}) => {
  const { question, answer, answerShort, format, speakable } = item;

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border border-gray-200
        transition-all duration-300
        ${isOpen ? 'ring-2 ring-red-500 ring-opacity-50' : 'hover:shadow-md'}
      `}
      itemScope
      itemType="https://schema.org/Question"
    >
      {/* Question Header */}
      <button
        className="w-full px-6 py-5 flex items-center justify-between text-left"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${index}`}
      >
        <h3
          className="text-lg font-semibold text-gray-900 pr-4"
          itemProp="name"
        >
          {question}
        </h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-red-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Answer Content */}
      <div
        id={`faq-answer-${index}`}
        className={`
          overflow-hidden transition-all duration-300
          ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
        itemScope
        itemType="https://schema.org/Answer"
        itemProp="acceptedAnswer"
      >
        <div className="px-6 pb-5">
          {/* Answer Short (pour Position 0 / Featured Snippets) */}
          {speakable && (
            <p
              className="text-gray-700 font-medium mb-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-500"
              itemProp="text"
              data-speakable="true"
            >
              {answerShort}
            </p>
          )}

          {/* Answer Full */}
          <div
            className={`text-gray-600 leading-relaxed ${!speakable ? '' : 'mt-3 pt-3 border-t border-gray-100'}`}
          >
            {format === 'list' ? (
              <ul className="list-disc list-inside space-y-2">
                {answer.split('\n').filter(Boolean).map((line, i) => (
                  <li key={i}>{line.replace(/^[-•]\s*/, '')}</li>
                ))}
              </ul>
            ) : format === 'steps' ? (
              <ol className="list-decimal list-inside space-y-2">
                {answer.split('\n').filter(Boolean).map((line, i) => (
                  <li key={i}>{line.replace(/^\d+\.\s*/, '')}</li>
                ))}
              </ol>
            ) : (
              <p>{answer}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingFAQ;
```

### 4.6 Composant LandingCTA

**Fichier : `src/components/landing/LandingCTA.tsx`**

```tsx
import React from 'react';
import { Phone, Calendar, Shield, Clock } from 'lucide-react';
import type { CTASection, LandingCTA as LandingCTAType } from '@/types/landing.types';

interface LandingCTAProps {
  data: CTASection;
  cta: LandingCTAType;
  variant?: 'inline' | 'full';
}

export const LandingCTA: React.FC<LandingCTAProps> = ({
  data,
  cta,
  variant = 'full'
}) => {
  const { title, subtitle, primaryCta, reassurance } = data;

  // Construire URL avec tracking params
  const buildTrackedUrl = (baseUrl: string) => {
    const params = new URLSearchParams(cta.tracking_params);
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${params.toString()}`;
  };

  // Parse reassurance items
  const reassuranceItems = reassurance.split('•').map(item => item.trim()).filter(Boolean);

  if (variant === 'inline') {
    return (
      <div className="bg-red-50 rounded-2xl p-6 md:p-8 text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 mb-6">{subtitle}</p>
        <a
          href={buildTrackedUrl(cta.primary_url)}
          className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg
                   font-semibold hover:bg-red-700 transition-colors"
        >
          {cta.primary_text}
        </a>
      </div>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-red-600 to-red-800 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            {title}
          </h2>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/90 mb-10">
            {subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a
              href={buildTrackedUrl(cta.primary_url)}
              className="group inline-flex items-center justify-center gap-3
                       bg-white text-red-600 px-10 py-5 rounded-xl
                       font-bold text-lg hover:bg-gray-100
                       transition-all duration-300 hover:scale-105
                       shadow-lg hover:shadow-xl"
            >
              <Phone className="w-6 h-6 group-hover:animate-pulse" />
              {cta.primary_text}
            </a>

            {cta.secondary_url && (
              <a
                href={buildTrackedUrl(cta.secondary_url)}
                className="inline-flex items-center justify-center gap-3
                         border-2 border-white text-white px-10 py-5 rounded-xl
                         font-bold text-lg hover:bg-white hover:text-red-600
                         transition-all duration-300"
              >
                <Calendar className="w-6 h-6" />
                {cta.secondary_text}
              </a>
            )}
          </div>

          {/* Reassurance Items */}
          <div className="flex flex-wrap justify-center gap-6 text-white/80">
            {reassuranceItems.map((item, index) => {
              const Icon = index === 0 ? Shield : index === 1 ? Clock : Shield;
              return (
                <div key={index} className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  <span>{item}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingCTA;
```

### 4.7 Composant LandingSchema (JSON-LD)

**Fichier : `src/components/landing/LandingSchema.tsx`**

```tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import type { LandingSchema as LandingSchemaType } from '@/types/landing.types';

interface LandingSchemaProps {
  schema: LandingSchemaType;
}

export const LandingSchema: React.FC<LandingSchemaProps> = ({ schema }) => {
  const { faqPage, breadcrumbList, howTo, service, review, organization } = schema;

  return (
    <Helmet>
      {/* FAQPage Schema */}
      {faqPage && (
        <script type="application/ld+json">
          {JSON.stringify(faqPage)}
        </script>
      )}

      {/* BreadcrumbList Schema */}
      {breadcrumbList && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbList)}
        </script>
      )}

      {/* HowTo Schema */}
      {howTo && (
        <script type="application/ld+json">
          {JSON.stringify(howTo)}
        </script>
      )}

      {/* Service Schema */}
      {service && (
        <script type="application/ld+json">
          {JSON.stringify(service)}
        </script>
      )}

      {/* Review Schema */}
      {review && (
        <script type="application/ld+json">
          {JSON.stringify(review)}
        </script>
      )}

      {/* Organization Schema */}
      {organization && (
        <script type="application/ld+json">
          {JSON.stringify(organization)}
        </script>
      )}
    </Helmet>
  );
};

export default LandingSchema;
```

### 4.8 Composant LandingBreadcrumbs

**Fichier : `src/components/landing/LandingBreadcrumbs.tsx`**

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import type { BreadcrumbItem } from '@/types/landing.types';

interface LandingBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const LandingBreadcrumbs: React.FC<LandingBreadcrumbsProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="bg-gray-100 py-3"
    >
      <div className="container mx-auto px-4">
        <ol
          className="flex flex-wrap items-center gap-2 text-sm"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          {/* Home Link */}
          <li
            className="flex items-center"
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <Link
              to="/"
              className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
              itemProp="item"
            >
              <Home className="w-4 h-4" />
              <span className="sr-only" itemProp="name">Accueil</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>

          {/* Breadcrumb Items */}
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li
                key={item.position}
                className="flex items-center"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />

                {isLast ? (
                  <span
                    className="text-gray-900 font-medium"
                    itemProp="name"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.url}
                    className="text-gray-600 hover:text-red-600 transition-colors"
                    itemProp="item"
                  >
                    <span itemProp="name">{item.label}</span>
                  </Link>
                )}

                <meta itemProp="position" content={String(item.position + 1)} />
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};

export default LandingBreadcrumbs;
```

### 4.9 Composant LandingEEAT

**Fichier : `src/components/landing/LandingEEAT.tsx`**

```tsx
import React from 'react';
import { Award, Briefcase, Shield, Star, Globe, Users } from 'lucide-react';
import type { LandingEEAT as LandingEEATType } from '@/types/landing.types';

interface LandingEEATProps {
  data: LandingEEATType;
}

export const LandingEEAT: React.FC<LandingEEATProps> = ({ data }) => {
  const { expertise, experience, authority, trust } = data;

  const stats = [
    {
      icon: Briefcase,
      value: `${expertise.yearsExperience}+`,
      label: "Années d'expérience",
    },
    {
      icon: Globe,
      value: `${experience.countriesCovered}`,
      label: 'Pays couverts',
    },
    {
      icon: Users,
      value: `${experience.casesHandled.toLocaleString()}+`,
      label: 'Dossiers traités',
    },
    {
      icon: Star,
      value: `${trust.rating}/5`,
      label: `${trust.reviewCount} avis`,
    },
  ];

  return (
    <section className="py-8 bg-white border-b border-gray-100">
      <div className="container mx-auto px-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Trust Badges */}
        {trust.verifiedBadges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 mt-8 pt-6 border-t border-gray-100">
            {trust.verifiedBadges.map((badge, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium"
              >
                <Shield className="w-4 h-4" />
                {badge}
              </div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {expertise.certifications.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {expertise.certifications.map((cert, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium"
              >
                <Award className="w-3 h-3" />
                {cert}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default LandingEEAT;
```

### 4.10 Export Barrel

**Fichier : `src/components/landing/index.ts`**

```typescript
export { LandingHero } from './LandingHero';
export { LandingProblem } from './LandingProblem';
export { LandingSolution } from './LandingSolution';
export { LandingAdvantages } from './LandingAdvantages';
export { LandingHowItWorks } from './LandingHowItWorks';
export { LandingFAQ } from './LandingFAQ';
export { LandingTestimonials } from './LandingTestimonials';
export { LandingPricing } from './LandingPricing';
export { LandingCTA } from './LandingCTA';
export { LandingBreadcrumbs } from './LandingBreadcrumbs';
export { LandingSchema } from './LandingSchema';
export { LandingEEAT } from './LandingEEAT';
```

---

## 5. PAGES/ROUTES

### 5.1 Configuration des routes

**Ajouter dans `src/App.tsx` :**

```typescript
// Import
import { LandingPage } from '@/pages/Landing/LandingPage';

// Dans routeConfigs, ajouter :
const landingRoutes = [
  // Route générique pour toutes les landing pages
  {
    path: '/:language/:country/:objective',
    element: <LandingPage />,
    name: 'landing-generic',
  },
  {
    path: '/:language/:country/:objective/:specialty',
    element: <LandingPage />,
    name: 'landing-specialty',
  },

  // Routes spécifiques par langue (exemples)
  // FR
  { path: '/fr/:country/avocats', element: <LandingPage />, name: 'landing-lawyers-fr' },
  { path: '/fr/:country/avocats/:specialty', element: <LandingPage />, name: 'landing-lawyers-specialty-fr' },

  // EN
  { path: '/en/:country/lawyers', element: <LandingPage />, name: 'landing-lawyers-en' },
  { path: '/en/:country/lawyers/:specialty', element: <LandingPage />, name: 'landing-lawyers-specialty-en' },

  // DE
  { path: '/de/:country/anwaelte', element: <LandingPage />, name: 'landing-lawyers-de' },
  { path: '/de/:country/anwaelte/:specialty', element: <LandingPage />, name: 'landing-lawyers-specialty-de' },

  // ES
  { path: '/es/:country/abogados', element: <LandingPage />, name: 'landing-lawyers-es' },
  { path: '/es/:country/abogados/:specialty', element: <LandingPage />, name: 'landing-lawyers-specialty-es' },
];
```

### 5.2 Exemples d'URLs générées

| URL | Pays | Langue | Objectif | Spécialité |
|-----|------|--------|----------|------------|
| `/fr/de/avocats/famille` | Allemagne | FR | client_acquisition | Famille |
| `/en/us/lawyers/immigration` | USA | EN | client_acquisition | Immigration |
| `/de/at/anwaelte/steuerrecht` | Autriche | DE | client_acquisition | Fiscal |
| `/fr/de/rejoindre-reseau` | Allemagne | FR | recruitment_lawyer | - |
| `/es/mx/abogados/inmobiliario` | Mexique | ES | client_acquisition | Immobilier |

---

## 6. INTÉGRATION FIREBASE

### 6.1 Structure Firestore

```
firestore/
└── landings/                              # Collection principale
    ├── de_fr_client_acquisition_famille   # Document ID
    │   └── { ...LandingData }             # Données JSON complètes
    ├── us_en_client_acquisition_immigration
    ├── de_fr_recruitment_lawyer
    └── ...
```

### 6.2 Règles Firestore

**Ajouter dans `firestore.rules` :**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Landing pages - lecture publique, écriture admin only
    match /landings/{landingId} {
      allow read: if true;  // Lecture publique pour le site
      allow write: if request.auth != null
                   && request.auth.token.admin == true;
    }

  }
}
```

### 6.3 Index Firestore

**Ajouter dans `firestore.indexes.json` :**

```json
{
  "indexes": [
    {
      "collectionGroup": "landings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "targeting.country.code", "order": "ASCENDING" },
        { "fieldPath": "targeting.language.code", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "landings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "routing.slug", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 7. SEO & SCHEMA.ORG

### 7.1 Schema.org Types utilisés

| Type | Utilisation |
|------|-------------|
| `FAQPage` | Section FAQ avec questions/réponses |
| `BreadcrumbList` | Fil d'Ariane |
| `HowTo` | Section "Comment ça marche" |
| `LegalService` | Description du service juridique |
| `Review` / `AggregateRating` | Témoignages et notes |
| `Organization` | Informations SOS Expat |

### 7.2 Position 0 Optimization

Le champ `answerShort` (30-60 mots) dans chaque FAQ est optimisé pour :
- **Featured Snippets** (résultats enrichis Google)
- **People Also Ask** (PAA boxes)
- **Voice Search** (Google Assistant, Siri)

### 7.3 Hreflang Implementation

```html
<link rel="alternate" hreflang="fr" href="https://sos-expat.com/fr/de/avocats/famille" />
<link rel="alternate" hreflang="en" href="https://sos-expat.com/en/de/lawyers/family" />
<link rel="alternate" hreflang="de" href="https://sos-expat.com/de/de/anwaelte/familie" />
<link rel="alternate" hreflang="x-default" href="https://sos-expat.com/fr/de/avocats/famille" />
```

---

## 8. STYLING & DESIGN SYSTEM

### 8.1 Classes Tailwind à utiliser

```css
/* Couleurs principales */
.text-red-600    /* Couleur primaire texte */
.bg-red-600      /* Couleur primaire fond */
.bg-red-50       /* Fond léger */
.border-red-500  /* Bordures accent */

/* Typographie */
.text-4xl .md:text-5xl .lg:text-6xl  /* Titres H1 */
.text-3xl .md:text-4xl               /* Titres H2 */
.text-xl .md:text-2xl                /* Sous-titres */
.text-lg                             /* Corps important */
.text-base                           /* Corps normal */

/* Espacements sections */
.py-16 .md:py-24    /* Padding vertical sections */
.container          /* Conteneur centré */
.mx-auto            /* Centrage */
.px-4               /* Padding horizontal mobile */

/* Cards */
.bg-white .rounded-xl .shadow-sm .border .border-gray-200

/* Boutons */
.btn-primary   /* Bouton principal (défini dans index.css) */
.btn-secondary /* Bouton secondaire */
```

### 8.2 Animations

```css
/* Dans index.css - déjà existantes */
.hover:scale-105      /* Effet zoom au hover */
.transition-all       /* Transition fluide */
.duration-300         /* Durée 300ms */
.animate-fade-in      /* Fade in au chargement */
```

### 8.3 Support RTL (Arabe, Hébreu)

```tsx
// Dans LandingPage.tsx
const isRTL = targeting.language.direction === 'rtl';

<Layout className={isRTL ? 'rtl' : 'ltr'}>
```

```css
/* Styles RTL automatiques avec Tailwind */
.rtl {
  direction: rtl;
  text-align: right;
}

.rtl .flex-row {
  flex-direction: row-reverse;
}
```

---

## 9. INTERNATIONALISATION

### 9.1 Langues supportées

| Code | Langue | Direction | Locale exemple |
|------|--------|-----------|----------------|
| `fr` | Français | LTR | fr-FR, fr-DE |
| `en` | English | LTR | en-US, en-GB |
| `de` | Deutsch | LTR | de-DE, de-AT |
| `es` | Español | LTR | es-ES, es-MX |
| `pt` | Português | LTR | pt-BR, pt-PT |
| `ru` | Русский | LTR | ru-RU |
| `zh` | 中文 | LTR | zh-CN |
| `ar` | العربية | **RTL** | ar-AE |
| `hi` | हिन्दी | LTR | hi-IN |

### 9.2 Utilisation avec le système existant

Les landing pages utilisent le contenu du JSON (pas les fichiers de traduction existants), car le contenu est généré dynamiquement par le backend.

Cependant, pour les éléments UI statiques (boutons "Retour", "Partager", etc.), utiliser le système existant :

```tsx
import { useIntl } from 'react-intl';

const { formatMessage } = useIntl();
const backLabel = formatMessage({ id: 'common.back' });
```

---

## 10. PERFORMANCE

### 10.1 Optimisations à implémenter

| Technique | Implementation |
|-----------|----------------|
| **Lazy Loading** | Composants chargés à la demande |
| **Image Optimization** | `srcset` pour images responsives |
| **Code Splitting** | Route-based splitting automatique |
| **Caching** | Cache Firestore + react-query/SWR |
| **Pre-rendering** | react-snap pour SEO |

### 10.2 Lazy Loading des composants

```tsx
// Dans LandingPage.tsx
const LandingTestimonials = lazy(() => import('@/components/landing/LandingTestimonials'));
const LandingPricing = lazy(() => import('@/components/landing/LandingPricing'));

// Utilisation avec Suspense
<Suspense fallback={<LoadingSpinner />}>
  {sections.testimonials && <LandingTestimonials data={sections.testimonials} />}
</Suspense>
```

### 10.3 Cache avec SWR (optionnel)

```tsx
import useSWR from 'swr';

export function useLandingDataSWR(documentId: string) {
  const fetcher = async () => {
    const docRef = doc(db, 'landings', documentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data() as LandingData;
    throw new Error('Not found');
  };

  const { data, error, isLoading, mutate } = useSWR(
    `landing-${documentId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return { data, loading: isLoading, error, refetch: mutate };
}
```

---

## 11. TESTS

### 11.1 Tests unitaires (Vitest)

**Fichier : `src/components/landing/__tests__/LandingHero.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LandingHero } from '../LandingHero';

const mockData = {
  title: 'Test Title',
  subtitle: 'Test Subtitle',
  benefits: ['Benefit 1', 'Benefit 2'],
};

const mockCta = {
  id: 1,
  slug: 'test',
  primary_url: 'https://example.com',
  secondary_url: 'https://example.com/secondary',
  primary_text: 'Primary CTA',
  secondary_text: 'Secondary CTA',
  tracking_params: {},
  match_type: 'test',
  category: 'test',
};

const mockCountry = {
  code: 'DE',
  flag: '🇩🇪',
  nameLocal: 'Deutschland',
};

describe('LandingHero', () => {
  it('renders title correctly', () => {
    render(
      <BrowserRouter>
        <LandingHero data={mockData} cta={mockCta} country={mockCountry} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders all benefits', () => {
    render(
      <BrowserRouter>
        <LandingHero data={mockData} cta={mockCta} country={mockCountry} />
      </BrowserRouter>
    );

    expect(screen.getByText('Benefit 1')).toBeInTheDocument();
    expect(screen.getByText('Benefit 2')).toBeInTheDocument();
  });

  it('renders CTA buttons with correct URLs', () => {
    render(
      <BrowserRouter>
        <LandingHero data={mockData} cta={mockCta} country={mockCountry} />
      </BrowserRouter>
    );

    const primaryBtn = screen.getByText('Primary CTA');
    expect(primaryBtn).toHaveAttribute('href', expect.stringContaining('example.com'));
  });
});
```

### 11.2 Tests d'intégration

```tsx
// src/pages/Landing/__tests__/LandingPage.integration.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from '../LandingPage';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => mockLandingData,
  })),
}));

describe('LandingPage Integration', () => {
  it('fetches and displays landing data', async () => {
    render(
      <MemoryRouter initialEntries={['/fr/de/client_acquisition/famille']}>
        <Routes>
          <Route path="/:language/:country/:objective/:specialty" element={<LandingPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
  });
});
```

---

## 12. CHECKLIST D'IMPLÉMENTATION

### Phase 1 : Setup (1-2 jours)
- [ ] Créer la structure des dossiers
- [ ] Ajouter les types TypeScript (`landing.types.ts`)
- [ ] Créer le hook `useLandingData.ts`
- [ ] Configurer les règles Firestore

### Phase 2 : Composants de base (2-3 jours)
- [ ] `LandingSchema.tsx` (JSON-LD)
- [ ] `LandingBreadcrumbs.tsx`
- [ ] `LandingHero.tsx`
- [ ] `LandingCTA.tsx`
- [ ] `LandingEEAT.tsx`

### Phase 3 : Composants de contenu (2-3 jours)
- [ ] `LandingProblem.tsx`
- [ ] `LandingSolution.tsx`
- [ ] `LandingAdvantages.tsx`
- [ ] `LandingHowItWorks.tsx`
- [ ] `LandingFAQ.tsx`

### Phase 4 : Composants optionnels (1-2 jours)
- [ ] `LandingTestimonials.tsx`
- [ ] `LandingPricing.tsx`

### Phase 5 : Page & Routes (1 jour)
- [ ] `LandingPage.tsx` (orchestrateur)
- [ ] Configurer les routes dans `App.tsx`
- [ ] Tester les URLs

### Phase 6 : Tests & Optimisation (2 jours)
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Optimisation performance
- [ ] Vérification SEO (Lighthouse)

### Phase 7 : Déploiement (1 jour)
- [ ] Ajouter routes à react-snap
- [ ] Déployer sur staging
- [ ] Tests finaux
- [ ] Déploiement production

---

## ANNEXES

### A. Commandes utiles

```bash
# Développement
npm run dev

# Build
npm run build

# Tests
npm run test

# Lint
npm run lint

# Type check
npm run typecheck
```

### B. Ressources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Router v6](https://reactrouter.com/en/main)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Schema.org](https://schema.org/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)

---

**Document créé le 2026-01-26**
**Version : 1.0.0**
**Auteur : eng-content-generate / Claude**
