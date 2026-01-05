# PLAN DE MIGRATION NEXT.JS - SOS EXPAT PUBLIC

> **Document de référence complet pour la création du projet `sos-expat-public`**
>
> Date: 2026-01-04
> Version: 1.0
> Auteur: Claude (Anthropic)

---

## TABLE DES MATIERES

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture cible](#2-architecture-cible)
3. [Pages à migrer](#3-pages-à-migrer)
4. [Système multilingue](#4-système-multilingue)
5. [Traductions des routes](#5-traductions-des-routes)
6. [SEO et métadonnées](#6-seo-et-métadonnées)
7. [Firebase et données](#7-firebase-et-données)
8. [Composants à migrer](#8-composants-à-migrer)
9. [Système de style](#9-système-de-style)
10. [Variables d'environnement](#10-variables-denvironnement)
11. [Configuration DigitalOcean](#11-configuration-digitalocean)
12. [Structure du projet Next.js](#12-structure-du-projet-nextjs)
13. [Étapes de migration](#13-étapes-de-migration)
14. [Checklist finale](#14-checklist-finale)

---

## 1. VUE D'ENSEMBLE

### 1.1 Objectif

Créer un nouveau projet Next.js (`sos-expat-public`) pour les pages publiques SEO-critical, tout en conservant la SPA React existante (`sos`) pour les pages privées (dashboard, admin, checkout).

### 1.2 Pourquoi cette migration ?

| Problème actuel | Solution Next.js |
|-----------------|------------------|
| SPA = contenu invisible aux robots | SSR/SSG = HTML complet au premier chargement |
| SEO limité malgré les efforts | Pages pré-rendues indexables immédiatement |
| Temps de chargement initial long | HTML statique + hydratation |
| Pas de crawling par les IA (ChatGPT, Claude, Perplexity) | Contenu disponible sans JavaScript |

### 1.3 Architecture hybride

```
┌─────────────────────────────────────────────────────────────┐
│                 DIGITALOCEAN APP PLATFORM                   │
│                     sos-expat.com                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────┐    │
│  │  sos-expat-public   │    │        sos              │    │
│  │  (Next.js SSR/SSG)  │    │    (React SPA)          │    │
│  │                     │    │                         │    │
│  │  Pages publiques:   │    │  Pages privées:         │    │
│  │  • /                │    │  • /dashboard/*         │    │
│  │  • /testimonials    │    │  • /admin/*             │    │
│  │  • /providers/*     │    │  • /checkout/*          │    │
│  │  • /pricing         │    │  • /payment/*           │    │
│  │  • /faq/*           │    │  • /settings/*          │    │
│  │  • /contact         │    │  • /profile/*           │    │
│  └─────────────────────┘    └─────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE (Backend)                       │
│  • Firestore • Cloud Functions • Auth • Storage             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. ARCHITECTURE CIBLE

### 2.1 Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 14+ (App Router) |
| Langage | TypeScript |
| Styling | Tailwind CSS |
| i18n | next-intl |
| Base de données | Firebase Firestore |
| Hébergement | DigitalOcean App Platform |
| CDN | DigitalOcean Spaces (optionnel) |

### 2.2 Modes de rendu par page

| Page | Mode | Raison |
|------|------|--------|
| Home | SSG + ISR | Contenu semi-statique, revalidation 1h |
| Pricing | SSG + ISR | Prix changent rarement |
| Testimonials | SSG + ISR | Nouveaux avis = revalidation |
| Provider Profile | SSG + ISR | Profils individuels, revalidation 24h |
| FAQ | SSG | Contenu statique |
| Contact | SSG | Formulaire côté client |
| Legal pages | SSG | Contenu statique |

### 2.3 Stratégie de données

```
Build Time (SSG)
    │
    ├─► Fetch Firestore: pricing config
    ├─► Fetch Firestore: FAQ items (isActive=true)
    ├─► Fetch Firestore: testimonials (top 50)
    ├─► Fetch Firestore: providers (isApproved=true, limit 500)
    │
    ▼
Static HTML + JSON data files
    │
    │ Runtime (Client)
    ▼
Hydration + Real-time updates (optional)
```

---

## 3. PAGES À MIGRER

### 3.1 Pages publiques prioritaires (17 pages)

| # | Page | Fichier actuel | Route FR | Route EN | Dynamique |
|---|------|----------------|----------|----------|-----------|
| 1 | **Home** | `Home.tsx` | `/` | `/` | Oui (testimonials, pricing) |
| 2 | **Pricing** | `Pricing.tsx` | `/tarifs` | `/pricing` | Oui (pricing config) |
| 3 | **How It Works** | `HowItWorks.tsx` | `/comment-ca-marche` | `/how-it-works` | Non |
| 4 | **Testimonials** | `Testimonials.tsx` | `/temoignages` | `/testimonials` | Oui (Firestore) |
| 5 | **Testimonial Detail** | `TestimonialDetail.tsx` | `/temoignages/:country/:lang/:type` | `/testimonials/:country/:lang/:type` | Oui |
| 6 | **FAQ List** | `FAQ.tsx` | `/faq` | `/faq` | Oui (Firestore) |
| 7 | **FAQ Detail** | `FAQDetail.tsx` | `/faq/:slug` | `/faq/:slug` | Oui |
| 8 | **Help Center** | `HelpCenter.tsx` | `/centre-aide` | `/help-center` | Oui |
| 9 | **Help Article** | `HelpArticle.tsx` | `/centre-aide/:slug` | `/help-center/:slug` | Oui |
| 10 | **Contact** | `Contact.tsx` | `/contact` | `/contact` | Non |
| 11 | **Provider Profile** | `ProviderProfile.tsx` | `/avocat/:slug`, `/expatrie/:slug` | `/lawyers/:slug`, `/expats/:slug` | Oui |
| 12 | **Privacy Policy** | `PrivacyPolicy.tsx` | `/politique-confidentialite` | `/privacy-policy` | Oui (Firestore) |
| 13 | **Terms Clients** | `TermsClients.tsx` | `/cgu-clients` | `/terms-clients` | Oui |
| 14 | **Cookies** | `Cookies.tsx` | `/cookies` | `/cookies` | Oui |
| 15 | **Consumers** | `Consumers.tsx` | `/consommateurs` | `/consumers` | Oui |
| 16 | **Service Status** | `ServiceStatus.tsx` | `/statut-service` | `/service-status` | Non |
| 17 | **SEO Info** | `SEO.tsx` | `/referencement` | `/seo` | Non |

### 3.2 Pages à NE PAS migrer (restent dans SPA)

- `/dashboard/*` - Toutes les pages dashboard
- `/admin/*` - Panel d'administration
- `/login`, `/register/*` - Authentification
- `/call-checkout/*` - Processus de paiement
- `/booking-request/*` - Réservation
- `/payment-success` - Confirmation
- `/profile/edit` - Édition profil

---

## 4. SYSTÈME MULTILINGUE

### 4.1 Langues supportées (9)

| Code interne | Code ISO | Langue | Pays par défaut | RTL |
|--------------|----------|--------|-----------------|-----|
| `fr` | `fr` | Français | France (fr) | Non |
| `en` | `en` | English | USA (us) | Non |
| `es` | `es` | Español | Spain (es) | Non |
| `de` | `de` | Deutsch | Germany (de) | Non |
| `ru` | `ru` | Русский | Russia (ru) | Non |
| `pt` | `pt` | Português | Portugal (pt) | Non |
| `ch` | `zh-Hans` | 中文 | China (cn) | Non |
| `hi` | `hi` | हिन्दी | India (in) | Non |
| `ar` | `ar` | العربية | Saudi Arabia (sa) | **Oui** |

### 4.2 Format des URLs

```
/{langue}-{pays}/{slug-traduit}

Exemples:
/fr-fr/tarifs
/en-us/pricing
/es-mx/precios
/de-de/preise
/ar-sa/الأسعار
```

### 4.3 Détection de langue (priorité)

1. **URL prefix** - `/fr-fr/...` → français
2. **localStorage** - `sos_language`
3. **Timezone** - `Europe/Paris` → France → français
4. **Navigator** - `navigator.language`
5. **Default** - français

### 4.4 Mapping Timezone → Pays (extrait)

```javascript
const TZ_TO_COUNTRY = {
  // Europe
  'Europe/Paris': 'fr',
  'Europe/London': 'gb',
  'Europe/Berlin': 'de',
  'Europe/Madrid': 'es',
  'Europe/Moscow': 'ru',
  // Americas
  'America/New_York': 'us',
  'America/Los_Angeles': 'us',
  'America/Toronto': 'ca',
  'America/Sao_Paulo': 'br',
  // Asia
  'Asia/Tokyo': 'jp',
  'Asia/Shanghai': 'cn',
  'Asia/Dubai': 'ae',
  'Asia/Kolkata': 'in',
  // ... 289 mappings au total
};
```

### 4.5 Configuration next-intl

```typescript
// i18n/config.ts
export const locales = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'] as const;
export const defaultLocale = 'fr';

export const localeToCountry: Record<string, string> = {
  fr: 'fr', en: 'us', es: 'es', de: 'de',
  ru: 'ru', pt: 'pt', ch: 'cn', hi: 'in', ar: 'sa'
};

// Pour hreflang SEO
export const localeToHreflang: Record<string, string> = {
  fr: 'fr', en: 'en', es: 'es', de: 'de',
  ru: 'ru', pt: 'pt', ch: 'zh-Hans', hi: 'hi', ar: 'ar'
};
```

---

## 5. TRADUCTIONS DES ROUTES

### 5.1 Table complète des routes traduites (40 clés)

| RouteKey | FR | EN | ES | DE |
|----------|----|----|----|----|
| `lawyer` | avocat | lawyers | abogados | anwaelte |
| `expat` | expatrie | expats | expatriados | expatriates |
| `pricing` | tarifs | pricing | precios | preise |
| `contact` | contact | contact | contacto | kontakt |
| `how-it-works` | comment-ca-marche | how-it-works | como-funciona | wie-es-funktioniert |
| `faq` | faq | faq | preguntas-frecuentes | faq |
| `help-center` | centre-aide | help-center | centro-ayuda | hilfezentrum |
| `testimonials` | temoignages | testimonials | testimonios | testimonials |
| `privacy-policy` | politique-confidentialite | privacy-policy | politica-privacidad | datenschutzrichtlinie |
| `terms-clients` | cgu-clients | terms-clients | terminos-clientes | agb-kunden |
| `terms-lawyers` | cgu-avocats | terms-lawyers | terminos-abogados | agb-anwaelte |
| `terms-expats` | cgu-expatries | terms-expats | terminos-expatriados | agb-expatriates |
| `cookies` | cookies | cookies | cookies | cookies |
| `consumers` | consommateurs | consumers | consumidores | verbraucher |
| `service-status` | statut-service | service-status | estado-servicio | dienststatus |
| `seo` | referencement | seo | seo | seo |
| `sos-call` | sos-appel | emergency-call | llamada-emergencia | notruf |
| `expat-call` | appel-expatrie | expat-call | llamada-expatriado | expatriate-anruf |
| `providers` | prestataires | providers | proveedores | anbieter |
| `login` | connexion | login | iniciar-sesion | anmeldung |
| `register` | inscription | register | registro | registrierung |
| `dashboard` | tableau-de-bord | dashboard | panel | dashboard |

### 5.2 Routes avec paramètres dynamiques

```
Provider Profile:
/fr-fr/avocat/{slug}
/en-us/lawyers/{slug}
/es-es/abogados/{slug}

FAQ Detail:
/fr-fr/faq/{slug}
/en-us/faq/{slug}

Help Article:
/fr-fr/centre-aide/{slug}
/en-us/help-center/{slug}

Testimonial Detail:
/fr-fr/temoignages/{country}/{language}/{reviewType}
/en-us/testimonials/{country}/{language}/{reviewType}
```

### 5.3 Utilitaires de traduction de routes

```typescript
// lib/routes.ts

export function getTranslatedSlug(routeKey: string, lang: string): string {
  return ROUTE_TRANSLATIONS[routeKey]?.[lang] || routeKey;
}

export function getRouteKeyFromSlug(slug: string): string | null {
  for (const [key, translations] of Object.entries(ROUTE_TRANSLATIONS)) {
    if (Object.values(translations).includes(slug)) {
      return key;
    }
  }
  return null;
}

export function buildLocalizedPath(routeKey: string, lang: string, country: string, params?: Record<string, string>): string {
  const slug = getTranslatedSlug(routeKey, lang);
  let path = `/${lang}-${country}/${slug}`;

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, value);
    }
  }

  return path;
}
```

---

## 6. SEO ET MÉTADONNÉES

### 6.1 Composant SEOHead existant (props)

```typescript
interface SEOHeadProps {
  // Meta de base
  title: string;
  description: string;
  canonicalUrl?: string;
  keywords?: string;
  author?: string;

  // Open Graph
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';

  // Twitter
  twitterCard?: 'summary' | 'summary_large_image';
  twitterSite?: string;
  twitterCreator?: string;

  // Dates
  publishedTime?: string;
  modifiedTime?: string;

  // Locale
  locale?: string;
  siteName?: string;
  alternateLanguages?: { lang: string; url: string }[];

  // Structured Data
  structuredData?: Record<string, unknown>;

  // Robots
  noindex?: boolean;

  // AI-specific (pour ChatGPT, Claude, etc.)
  aiSummary?: string;
  contentType?: string;
  readingTime?: string;
  expertise?: string;
  trustworthiness?: string;
  contentQuality?: 'high' | 'medium' | 'low';
  lastReviewed?: string;
  citations?: string[];
}
```

### 6.2 Schemas JSON-LD existants

| Schema | Fichier | Usage |
|--------|---------|-------|
| `OrganizationSchema` | `OrganizationSchema.tsx` | Page d'accueil |
| `LocalBusinessSchema` | `LocalBusinessSchema.tsx` | Pages locales |
| `ProfessionalServiceSchema` | `ProfessionalServiceSchema.tsx` | Profils providers |
| `ReviewSchema` | `ReviewSchema.tsx` | Testimonials |
| `BreadcrumbSchema` | `BreadcrumbSchema.tsx` | Navigation |

### 6.3 Migration vers Next.js Metadata API

```typescript
// app/[locale]/pricing/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations(locale);

  return {
    title: `${t('pricing.title')} | SOS Expat`,
    description: t('pricing.description'),
    alternates: {
      canonical: `https://sos-expat.com/${locale}/pricing`,
      languages: {
        'fr': '/fr-fr/tarifs',
        'en': '/en-us/pricing',
        'es': '/es-es/precios',
        // ... autres langues
      },
    },
    openGraph: {
      title: t('pricing.title'),
      description: t('pricing.description'),
      url: `https://sos-expat.com/${locale}/pricing`,
      siteName: 'SOS Expat',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      type: 'website',
      images: [
        {
          url: 'https://sos-expat.com/og-image.png',
          width: 1200,
          height: 630,
          alt: 'SOS Expat',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('pricing.title'),
      description: t('pricing.description'),
      images: ['https://sos-expat.com/twitter-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  };
}
```

### 6.4 HrefLang et liens alternatifs

```typescript
// components/HrefLangLinks.tsx
export function generateHrefLangLinks(currentPath: string, routeKey: string) {
  const links = [];

  for (const lang of SUPPORTED_LANGUAGES) {
    const country = localeToCountry[lang];
    const slug = getTranslatedSlug(routeKey, lang);
    const hreflang = localeToHreflang[lang];

    links.push({
      hreflang,
      href: `https://sos-expat.com/${lang}-${country}/${slug}`,
    });
  }

  // x-default pointe vers anglais
  links.push({
    hreflang: 'x-default',
    href: `https://sos-expat.com/en-us/${getTranslatedSlug(routeKey, 'en')}`,
  });

  return links;
}
```

### 6.5 Sitemap dynamique

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sos-expat.com';
  const routes: MetadataRoute.Sitemap = [];

  // Pages statiques pour chaque langue
  for (const lang of SUPPORTED_LANGUAGES) {
    const country = localeToCountry[lang];
    const locale = `${lang}-${country}`;

    // Home
    routes.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    });

    // Pricing
    routes.push({
      url: `${baseUrl}/${locale}/${getTranslatedSlug('pricing', lang)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    });

    // ... autres pages statiques
  }

  // Pages dynamiques (providers)
  const providers = await fetchAllProviders();
  for (const provider of providers) {
    for (const lang of SUPPORTED_LANGUAGES) {
      const country = localeToCountry[lang];
      const locale = `${lang}-${country}`;
      const type = provider.type === 'lawyer' ? 'lawyer' : 'expat';
      const slug = getTranslatedSlug(type, lang);

      routes.push({
        url: `${baseUrl}/${locale}/${slug}/${provider.slug}`,
        lastModified: provider.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return routes;
}
```

---

## 7. FIREBASE ET DONNÉES

### 7.1 Collections Firestore utilisées par les pages publiques

| Collection | Usage | Accès public |
|------------|-------|--------------|
| `sos_profiles` | Profils providers | Lecture si `isApproved=true` |
| `reviews` | Avis/testimonials | Lecture si `status=published` |
| `faqs` | Questions fréquentes | Lecture si `isActive=true` |
| `help_categories` | Catégories aide | Lecture publique |
| `help_articles` | Articles aide | Lecture si `isPublished=true` |
| `admin_config/pricing` | Configuration prix | Lecture publique |
| `legal_documents` | Documents légaux | Lecture publique |

### 7.2 Stratégie de fetch pour SSG

```typescript
// lib/firebase-admin.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialisation côté serveur (Next.js)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminDb = getFirestore();

// Fonction de fetch pour SSG
export async function getProviders(): Promise<Provider[]> {
  const snapshot = await adminDb
    .collection('sos_profiles')
    .where('isApproved', '==', true)
    .where('isVisible', '==', true)
    .where('isBanned', '==', false)
    .limit(500)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Provider[];
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const doc = await adminDb.doc('admin_config/pricing').get();
  return doc.data() as PricingConfig;
}

export async function getFAQs(lang: string): Promise<FAQ[]> {
  const snapshot = await adminDb
    .collection('faqs')
    .where('isActive', '==', true)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      question: data.question[lang] || data.question['fr'],
      answer: data.answer[lang] || data.answer['fr'],
      slug: data.slug[lang] || data.slug['fr'],
      category: data.category,
    };
  });
}
```

### 7.3 Revalidation ISR

```typescript
// app/[locale]/testimonials/page.tsx
export const revalidate = 3600; // Revalidation toutes les heures

export default async function TestimonialsPage({ params }: Props) {
  const testimonials = await getTestimonials();
  // ...
}

// Revalidation on-demand via webhook
// app/api/revalidate/route.ts
export async function POST(request: Request) {
  const { secret, path } = await request.json();

  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  revalidatePath(path);
  return Response.json({ revalidated: true });
}
```

---

## 8. COMPOSANTS À MIGRER

### 8.1 Composants Layout (131 KB total)

| Composant | Fichier | Taille | Priorité | Notes migration |
|-----------|---------|--------|----------|-----------------|
| `Header` | `Header.tsx` | 61 KB | HAUTE | Remplacer `Link` React Router → Next.js `Link` |
| `Footer` | `Footer.tsx` | 35 KB | HAUTE | Remplacer `Link`, adapter form contact |
| `Layout` | `Layout.tsx` | 6.3 KB | HAUTE | Remplacer `Helmet` → Next.js metadata |
| `SEOHead` | `SEOHead.tsx` | 8.5 KB | HAUTE | Migrer vers `generateMetadata()` |

### 8.2 Composants Common (171 KB total)

| Composant | Fichier | Taille | Nécessaire SSR |
|-----------|---------|--------|----------------|
| `Button` | `Button.tsx` | 5.4 KB | Oui |
| `Modal` | `Modal.tsx` | 3.2 KB | Client only |
| `LoadingSpinner` | `LoadingSpinner.tsx` | 1.5 KB | Oui |
| `CookieBanner` | `CookieBanner.tsx` | 18 KB | Client only |
| `ErrorBoundary` | `ErrorBoundary.tsx` | 8.8 KB | Client only |
| `ShareButton` | `ShareButton.tsx` | 7.2 KB | Client only |

### 8.3 Composants Home (75 KB total)

| Composant | Fichier | Taille | Mode rendu |
|-----------|---------|--------|------------|
| `HeroSection` | `HeroSection.tsx` | 6.3 KB | SSG |
| `HowItWorksSection` | `HowItWorksSection.tsx` | 11 KB | SSG |
| `ServicesSection` | `ServicesSection.tsx` | 5.7 KB | SSG |
| `CTASection` | `CTASection.tsx` | 6.5 KB | SSG |
| `TestimonialsSection` | `TestimonialsSection.tsx` | 5.4 KB | SSG + ISR |
| `ProfileCarousel` | `ProfileCarousel.tsx` | 20 KB | Client only |
| `ModernProfileCard` | `ModernProfileCard.tsx` | 21 KB | SSG |

### 8.4 Composants SEO (schemas)

| Composant | Usage |
|-----------|-------|
| `OrganizationSchema` | Home page |
| `LocalBusinessSchema` | Provider profiles |
| `ProfessionalServiceSchema` | Provider profiles |
| `ReviewSchema` | Testimonials |
| `BreadcrumbSchema` | Navigation |

### 8.5 Remplacements nécessaires

| Avant (React SPA) | Après (Next.js) |
|-------------------|-----------------|
| `react-router-dom` Link | `next/link` Link |
| `useNavigate()` | `useRouter()` de `next/navigation` |
| `useLocation()` | `usePathname()` de `next/navigation` |
| `react-helmet-async` Helmet | `generateMetadata()` ou `<head>` |
| `lazy(() => import(...))` | Dynamic imports ou RSC |

---

## 9. SYSTÈME DE STYLE

### 9.1 Configuration Tailwind existante

```javascript
// tailwind.config.js (à répliquer)
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### 9.2 Variables CSS (Design System)

```css
:root {
  /* Primary Colors */
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: rgba(37, 99, 235, 0.1);

  /* Background */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --surface: #ffffff;

  /* Text */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #64748b;

  /* Border */
  --border-light: #e2e8f0;
  --border-medium: #cbd5e1;

  /* Status */
  --error: #dc2626;
  --success: #059669;
  --warning: #d97706;

  /* Spacing */
  --space-xs: 0.5rem;
  --space-sm: 0.75rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;

  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  /* Touch targets */
  --touch-min: 44px;
  --touch-ideal: 48px;
}
```

### 9.3 Dark Mode

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --surface: #1e293b;
    --text-primary: #f8fafc;
    --text-secondary: #cbd5e1;
    --border-light: #334155;
  }
}
```

### 9.4 Support RTL (Arabe)

```css
html[dir="rtl"],
html.rtl {
  direction: rtl;
  text-align: right;
}

[dir="rtl"] .flex-row {
  flex-direction: row-reverse;
}

[dir="rtl"] .ml-auto { margin-left: 0; margin-right: auto; }
[dir="rtl"] .mr-auto { margin-right: 0; margin-left: auto; }

[dir="rtl"] input,
[dir="rtl"] textarea {
  text-align: right;
}
```

### 9.5 Fonts (Inter Variable)

```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/Inter-roman.var.woff2') format('woff2');
}

body {
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
```

**Fichiers à copier:**
- `public/fonts/Inter-roman.var.woff2`
- `public/fonts/Inter-italic.var.woff2`
- `public/fonts/inter-var.woff2`

---

## 10. VARIABLES D'ENVIRONNEMENT

### 10.1 Variables publiques (NEXT_PUBLIC_)

```env
# Firebase (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sos-urgently-ac307.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sos-urgently-ac307
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sos-urgently-ac307.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...

# Stripe (publishable key)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
NEXT_PUBLIC_PAYPAL_MODE=live

# Analytics
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-...
NEXT_PUBLIC_GTM_ID=GTM-...

# URLs
NEXT_PUBLIC_SITE_URL=https://sos-expat.com
NEXT_PUBLIC_SPA_URL=https://app.sos-expat.com
```

### 10.2 Variables serveur (privées)

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=sos-urgently-ac307
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@sos-urgently-ac307.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Revalidation
REVALIDATE_SECRET=your-secret-token

# Sentry (backend)
SENTRY_DSN=https://...@sentry.io/...
```

### 10.3 Migration des noms

| Vite (actuel) | Next.js |
|---------------|---------|
| `VITE_FIREBASE_API_KEY` | `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `VITE_STRIPE_PUBLIC_KEY` | `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` |
| `VITE_GA4_MEASUREMENT_ID` | `NEXT_PUBLIC_GA4_MEASUREMENT_ID` |

---

## 11. CONFIGURATION DIGITALOCEAN

### 11.1 Configuration App Platform (2 services)

```yaml
# .do/app.yaml
name: sos-expat
region: fra  # Frankfurt

services:
  # Service 1: Next.js (pages publiques SSR)
  - name: public
    github:
      repo: username/sos-expat-project
      branch: main
      deploy_on_push: true
    source_dir: sos-expat-public
    build_command: npm run build
    run_command: npm start
    environment_slug: node-js
    instance_size_slug: professional-xs  # 1 vCPU, 1GB RAM
    instance_count: 1
    http_port: 3000
    routes:
      - path: /
        preserve_path_prefix: false
    envs:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_FIREBASE_API_KEY
        value: ${FIREBASE_API_KEY}
      - key: FIREBASE_PROJECT_ID
        value: ${FIREBASE_PROJECT_ID}
      - key: FIREBASE_CLIENT_EMAIL
        value: ${FIREBASE_CLIENT_EMAIL}
      - key: FIREBASE_PRIVATE_KEY
        type: SECRET
        value: ${FIREBASE_PRIVATE_KEY}

# Static site pour SPA (dashboard/admin)
static_sites:
  - name: app
    github:
      repo: username/sos-expat-project
      branch: main
    source_dir: sos
    build_command: npm run build
    output_dir: dist
    catchall_document: index.html
    routes:
      - path: /dashboard
      - path: /admin
      - path: /login
      - path: /register
      - path: /checkout
      - path: /payment
```

### 11.2 Routing entre Next.js et SPA

```yaml
# Règles de routing DigitalOcean
ingress:
  rules:
    # Pages publiques → Next.js
    - match:
        path:
          prefix: /
      component:
        name: public

    # Dashboard/Admin → SPA React
    - match:
        path:
          prefix: /dashboard
      component:
        name: app

    - match:
        path:
          prefix: /admin
      component:
        name: app
```

### 11.3 Estimation des coûts

| Ressource | Taille | Coût/mois |
|-----------|--------|-----------|
| Next.js Service | professional-xs | ~$12 |
| Static Site (SPA) | basic | ~$5 |
| **Total estimé** | | **~$17/mois** |

---

## 12. STRUCTURE DU PROJET NEXT.JS

### 12.1 Arborescence complète

```
sos-expat-public/
├── .do/
│   └── app.yaml                    # Config DigitalOcean
├── app/
│   ├── [locale]/                   # Routes avec locale
│   │   ├── layout.tsx              # Layout avec locale
│   │   ├── page.tsx                # Home page
│   │   │
│   │   ├── (marketing)/            # Groupe sans segment URL
│   │   │   ├── tarifs/page.tsx     # /fr-fr/tarifs
│   │   │   ├── pricing/page.tsx    # /en-us/pricing (alias)
│   │   │   ├── contact/page.tsx
│   │   │   ├── comment-ca-marche/page.tsx
│   │   │   └── how-it-works/page.tsx
│   │   │
│   │   ├── (legal)/
│   │   │   ├── politique-confidentialite/page.tsx
│   │   │   ├── privacy-policy/page.tsx
│   │   │   ├── cgu-clients/page.tsx
│   │   │   ├── terms-clients/page.tsx
│   │   │   ├── cookies/page.tsx
│   │   │   └── consommateurs/page.tsx
│   │   │
│   │   ├── (content)/
│   │   │   ├── faq/
│   │   │   │   ├── page.tsx        # Liste FAQ
│   │   │   │   └── [slug]/page.tsx # Détail FAQ
│   │   │   ├── centre-aide/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── temoignages/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [country]/[language]/[type]/page.tsx
│   │   │   └── testimonials/       # Alias EN
│   │   │       └── ...
│   │   │
│   │   └── (providers)/
│   │       ├── avocat/[slug]/page.tsx
│   │       ├── lawyers/[slug]/page.tsx
│   │       ├── expatrie/[slug]/page.tsx
│   │       └── expats/[slug]/page.tsx
│   │
│   ├── api/
│   │   ├── revalidate/route.ts     # Webhook revalidation
│   │   └── contact/route.ts        # Form submission
│   │
│   ├── layout.tsx                  # Root layout
│   ├── not-found.tsx               # 404 page
│   ├── sitemap.ts                  # Dynamic sitemap
│   └── robots.ts                   # robots.txt
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Navigation.tsx
│   ├── home/
│   │   ├── HeroSection.tsx
│   │   ├── ServicesSection.tsx
│   │   ├── HowItWorksSection.tsx
│   │   ├── TestimonialsSection.tsx
│   │   └── CTASection.tsx
│   ├── providers/
│   │   ├── ProviderCard.tsx
│   │   └── ProviderGrid.tsx
│   ├── seo/
│   │   ├── OrganizationSchema.tsx
│   │   ├── BreadcrumbSchema.tsx
│   │   └── ReviewSchema.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   └── common/
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
│
├── lib/
│   ├── firebase-admin.ts           # Firebase Admin SDK
│   ├── firebase-client.ts          # Firebase Client SDK
│   ├── routes.ts                   # Route translations
│   └── utils.ts                    # Utilities
│
├── i18n/
│   ├── config.ts                   # i18n configuration
│   ├── request.ts                  # next-intl request config
│   └── messages/
│       ├── fr.json
│       ├── en.json
│       ├── es.json
│       ├── de.json
│       ├── ru.json
│       ├── pt.json
│       ├── ch.json
│       ├── hi.json
│       └── ar.json
│
├── styles/
│   ├── globals.css                 # Global styles + Tailwind
│   └── variables.css               # CSS variables
│
├── public/
│   ├── fonts/
│   │   ├── Inter-roman.var.woff2
│   │   ├── Inter-italic.var.woff2
│   │   └── inter-var.woff2
│   ├── icons/                      # PWA icons
│   ├── images/
│   │   ├── og-image.png
│   │   └── twitter-image.png
│   └── favicon.ico
│
├── types/
│   ├── provider.ts
│   ├── faq.ts
│   ├── testimonial.ts
│   └── pricing.ts
│
├── middleware.ts                   # Locale detection middleware
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── package.json
└── .env.local
```

### 12.2 Middleware de locale

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, localeToCountry } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true,
});

export const config = {
  matcher: [
    // Skip api routes, static files, etc.
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
```

### 12.3 Configuration Next.js

```javascript
// next.config.js
const withNextIntl = require('next-intl/plugin')();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Redirections vers SPA pour pages privées
  async redirects() {
    return [
      {
        source: '/:locale/dashboard/:path*',
        destination: 'https://app.sos-expat.com/dashboard/:path*',
        permanent: false,
      },
      {
        source: '/:locale/admin/:path*',
        destination: 'https://app.sos-expat.com/admin/:path*',
        permanent: false,
      },
    ];
  },

  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
```

---

## 13. ÉTAPES DE MIGRATION

### Phase 1: Setup initial (Semaine 1)

- [ ] Créer le dossier `sos-expat-public/` dans le monorepo
- [ ] Initialiser Next.js 14 avec App Router
- [ ] Configurer TypeScript
- [ ] Configurer Tailwind CSS
- [ ] Copier les fichiers de fonts
- [ ] Configurer next-intl
- [ ] Setup Firebase Admin SDK
- [ ] Configurer les variables d'environnement

### Phase 2: Composants de base (Semaine 2)

- [ ] Migrer les composants UI (Button, Card, Badge, etc.)
- [ ] Migrer Header.tsx
- [ ] Migrer Footer.tsx
- [ ] Créer le layout root
- [ ] Créer le layout avec locale
- [ ] Configurer le middleware de locale

### Phase 3: Pages statiques (Semaine 3)

- [ ] Migrer Home page
- [ ] Migrer Pricing page
- [ ] Migrer How It Works
- [ ] Migrer Contact
- [ ] Migrer toutes les pages légales

### Phase 4: Pages dynamiques (Semaine 4)

- [ ] Migrer FAQ (liste + détail)
- [ ] Migrer Help Center (liste + détail)
- [ ] Migrer Testimonials (liste + détail)
- [ ] Configurer ISR pour ces pages

### Phase 5: Provider Profiles (Semaine 5)

- [ ] Migrer ProviderProfile.tsx
- [ ] Implémenter generateStaticParams pour SSG
- [ ] Configurer ISR (revalidation 24h)
- [ ] Générer les routes pour les 2 types (lawyer/expat)

### Phase 6: SEO & Performance (Semaine 6)

- [ ] Implémenter tous les schemas JSON-LD
- [ ] Configurer le sitemap dynamique
- [ ] Configurer robots.txt
- [ ] Ajouter les hreflang
- [ ] Optimiser les images avec next/image
- [ ] Tester les Core Web Vitals

### Phase 7: Déploiement (Semaine 7)

- [ ] Configurer DigitalOcean App Platform
- [ ] Configurer le routing entre Next.js et SPA
- [ ] Tester en staging
- [ ] Migration DNS progressive
- [ ] Monitoring et alertes

---

## 14. CHECKLIST FINALE

### 14.1 SEO

- [ ] Toutes les pages ont des meta title/description uniques
- [ ] Open Graph configuré pour chaque page
- [ ] Twitter Cards configurées
- [ ] Schema.org JSON-LD sur toutes les pages pertinentes
- [ ] Sitemap XML généré dynamiquement
- [ ] robots.txt configuré
- [ ] Hreflang pour les 9 langues
- [ ] Canonical URLs corrects
- [ ] Pas de contenu dupliqué

### 14.2 Multilingue

- [ ] 9 langues supportées
- [ ] Routes traduites correctement
- [ ] Détection de langue fonctionnelle
- [ ] Support RTL pour l'arabe
- [ ] Traductions complètes

### 14.3 Performance

- [ ] Score Lighthouse > 90
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] Images optimisées (WebP/AVIF)
- [ ] Fonts préchargées
- [ ] Code splitting effectif

### 14.4 Fonctionnel

- [ ] Toutes les pages publiques accessibles
- [ ] Navigation fonctionne entre langues
- [ ] Formulaire contact fonctionne
- [ ] Redirection vers SPA pour pages privées
- [ ] Pas d'erreurs 404 sur les anciennes URLs
- [ ] Analytics trackent correctement

### 14.5 Infrastructure

- [ ] DigitalOcean App Platform configuré
- [ ] SSL/TLS actif
- [ ] CDN configuré
- [ ] Monitoring en place
- [ ] Alertes configurées
- [ ] Backup des données

---

## ANNEXES

### A. Fichiers de traduction à copier

```
sos/src/helper/
├── fr.json (5,400 lignes)
├── en.json
├── es.json
├── de.json
├── pt.json
├── ru.json
├── ch.json
├── hi.json
└── ar.json
```

### B. Assets à copier

```
sos/public/
├── fonts/ (3 fichiers WOFF2)
├── icons/ (20 fichiers PNG)
├── splash/ (13 fichiers SVG)
├── og-image.png
├── twitter-image.png
├── favicon.ico
├── favicon.svg
└── manifest.json
```

### C. Composants à adapter (non copier tel quel)

Les composants suivants utilisent `react-router-dom` et `react-helmet-async` qui doivent être remplacés:

1. `Header.tsx` - 150+ occurrences de Link/useNavigate
2. `Footer.tsx` - 50+ occurrences
3. `Layout.tsx` - Helmet → metadata
4. Toutes les pages - imports à modifier

### D. Collections Firestore à requêter

```javascript
// Collections en lecture seule pour SSG
const collections = [
  'sos_profiles',      // Providers (500 docs max)
  'reviews',           // Testimonials (status=published)
  'faqs',              // FAQ (isActive=true)
  'help_categories',   // Help center categories
  'help_articles',     // Help center articles
  'admin_config',      // pricing document
  'legal_documents',   // CGU, privacy, etc.
];
```

---

## FIN DU DOCUMENT

Ce document contient toutes les informations nécessaires pour créer le projet `sos-expat-public` avec Next.js. Il a été généré automatiquement en analysant le projet existant avec 10 agents IA spécialisés.

**Pour commencer:** Créez le dossier `sos-expat-public/` et suivez les étapes de la Phase 1.
