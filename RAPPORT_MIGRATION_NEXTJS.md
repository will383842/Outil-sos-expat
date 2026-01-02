# Rapport Complet de Migration: Vite SPA vers Next.js
## SOS-Expat.com - Analyse et Plan de Migration

**Date:** 2 Janvier 2026
**Version:** 1.0
**Auteur:** Analyse IA Claude (30 agents)

---

## Table des Matières

1. [Résumé Exécutif](#1-résumé-exécutif)
2. [État Actuel du Projet](#2-état-actuel-du-projet)
3. [Analyse des Dépendances](#3-analyse-des-dépendances)
4. [Points de Friction SSR](#4-points-de-friction-ssr)
5. [Inventaire des Pages](#5-inventaire-des-pages)
6. [Système d'Internationalisation](#6-système-dinternationalisation)
7. [Intégration Firebase](#7-intégration-firebase)
8. [Système SEO Actuel](#8-système-seo-actuel)
9. [Stratégie de Migration](#9-stratégie-de-migration)
10. [Plan Étape par Étape](#10-plan-étape-par-étape)
11. [Risques et Mitigations](#11-risques-et-mitigations)
12. [Checklist de Migration](#12-checklist-de-migration)

---

## 1. Résumé Exécutif

### Objectif
Migrer le site SOS-Expat.com de Vite SPA (Single Page Application) vers Next.js App Router pour améliorer le SEO via le Server-Side Rendering (SSR) et la génération statique (SSG).

### Statistiques du Projet Actuel

| Métrique | Valeur |
|----------|--------|
| Pages totales | ~120 fichiers .tsx |
| Composants | ~85 fichiers .tsx |
| Hooks personnalisés | ~25 hooks |
| Langues supportées | 9 (fr, en, es, de, pt, ru, zh, ar, hi) |
| APIs Browser utilisées | 618 occurrences |
| Fichiers TypeScript/TSX | ~250+ fichiers |
| Taille estimée | ~50,000+ lignes de code |

### Complexité de Migration: **ÉLEVÉE**

**Raisons principales:**
- Utilisation intensive des APIs navigateur (window, localStorage, sessionStorage)
- Firebase Client SDK nécessite une adaptation SSR spécifique
- Système multilingue complexe avec 9 langues
- PWA avec Service Worker
- Multiples passerelles de paiement (Stripe, PayPal)

---

## 2. État Actuel du Projet

### Architecture Technique

```
sos/
├── src/
│   ├── pages/              # ~120 pages (public + admin)
│   │   ├── admin/          # ~50 pages admin
│   │   └── Dashboard/      # Pages utilisateur connecté
│   ├── components/         # ~85 composants réutilisables
│   │   ├── admin/          # Composants admin
│   │   ├── auth/           # Authentification
│   │   ├── common/         # Composants partagés
│   │   ├── forms-data/     # Formulaires
│   │   ├── home/           # Page d'accueil
│   │   ├── layout/         # Header, Footer, Layout
│   │   ├── payment/        # Paiements
│   │   ├── pwa/            # PWA components
│   │   ├── review/         # Avis/Reviews
│   │   ├── seo/            # Schémas structurés
│   │   └── subscription/   # Abonnements
│   ├── contexts/           # 3 contextes React
│   │   ├── AuthContext.tsx # Auth + User (1980 lignes)
│   │   ├── AppContext.tsx  # Config app + i18n
│   │   └── PayPalContext.tsx
│   ├── hooks/              # ~25 hooks personnalisés
│   ├── helper/             # 9 fichiers JSON de traductions
│   ├── multilingual-system/# Système i18n avancé
│   ├── services/           # Services métier
│   ├── utils/              # Utilitaires
│   └── firebase/           # Config Firebase
├── public/                 # Assets statiques
├── firebase/
│   └── functions/          # Cloud Functions
└── vite.config.js          # Config Vite actuelle
```

### Stack Technique Actuel

| Catégorie | Technologie |
|-----------|-------------|
| Build Tool | Vite 5.4.2 |
| Framework | React 18.3.1 |
| Routing | React Router DOM 6.30.1 |
| State Management | React Context |
| i18n | react-intl 7.1.11 |
| SEO | react-helmet-async 2.0.5 |
| Styling | Tailwind CSS 3.4.1 |
| Backend | Firebase (Auth, Firestore, Functions, Storage) |
| Paiements | Stripe, PayPal |
| Maps | Leaflet, React-Leaflet |
| Forms | react-hook-form 7.62.0, Zod 4.1.5 |
| Charts | Recharts 3.1.2 |
| UI | Headless UI, Radix UI, MUI (admin) |

---

## 3. Analyse des Dépendances

### Dépendances à Remplacer

| Package Actuel | Remplacement Next.js | Effort |
|----------------|---------------------|--------|
| `vite` | `next` | Élevé |
| `react-router-dom` | Next.js App Router | Élevé |
| `react-helmet-async` | Next.js Metadata API | Moyen |
| `@vitejs/plugin-react` | (intégré Next.js) | Faible |

### Dépendances Compatibles (à conserver)

- `firebase` - Compatible avec config spéciale
- `react-intl` - Compatible
- `tailwindcss` - Compatible
- `@stripe/react-stripe-js` - Compatible
- `@paypal/react-paypal-js` - Compatible
- `react-hook-form` - Compatible
- `recharts` - Compatible (client-side)
- `lucide-react` - Compatible
- `date-fns` - Compatible
- `zod` - Compatible

### Dépendances Nécessitant Adaptation

| Package | Problème | Solution |
|---------|----------|----------|
| `react-leaflet` | Client-only | `dynamic` import avec `ssr: false` |
| `html2canvas` | Client-only | `dynamic` import |
| `jspdf` | Client-only | `dynamic` import |
| `react-confetti` | Client-only | `dynamic` import |
| `react-easy-crop` | Client-only | `dynamic` import |

---

## 4. Points de Friction SSR

### 4.1 Utilisation des APIs Navigateur

**618 occurrences identifiées** dans 101 fichiers.

#### Fichiers les Plus Impactés

| Fichier | Occurrences | Priorité |
|---------|-------------|----------|
| `contexts/AuthContext.tsx` | 10 | Critique |
| `pages/Login.tsx` | 32 | Haute |
| `pages/CallCheckout.tsx` | 33 | Haute |
| `pages/PasswordReset.tsx` | 26 | Haute |
| `utils/ga4.ts` | 25 | Moyenne |
| `utils/gtm.ts` | 17 | Moyenne |
| `pages/ProviderProfile.tsx` | 21 | Haute |

#### Types d'APIs Utilisées

```typescript
// WINDOW
window.location.href
window.location.origin
window.location.pathname
window.scrollTo()
window.navigator
window.innerWidth
window.matchMedia()
window.open()

// STORAGE
localStorage.getItem()
localStorage.setItem()
localStorage.removeItem()
sessionStorage.getItem()
sessionStorage.setItem()

// DOCUMENT
document.title
document.getElementById()
document.querySelector()

// NAVIGATOR
navigator.clipboard
navigator.share
navigator.userAgent
navigator.onLine
navigator.language
```

### 4.2 Contextes React Non-SSR Compatible

| Contexte | Lignes | Problèmes SSR |
|----------|--------|---------------|
| `AuthContext` | 1980 | localStorage, Firebase Auth listeners, navigator |
| `AppContext` | ~300 | localStorage pour langue, détection device |
| `PayPalContext` | ~50 | Dépend de scripts externes |

### 4.3 Hooks Non-SSR Compatible

| Hook | Problème |
|------|----------|
| `useDeviceDetection` | `window.innerWidth`, `navigator.userAgent` |
| `usePWAInstall` | `window.matchMedia`, `navigator.standalone` |
| `useWebShare` | `navigator.share` |
| `useIncomingCallSound` | Audio API browser |
| `useProviderActivityTracker` | localStorage |

---

## 5. Inventaire des Pages

### 5.1 Pages Publiques (SEO Critique)

Ces pages doivent être SSR/SSG pour le SEO:

| Route | Fichier | Type Recommandé |
|-------|---------|-----------------|
| `/` | Home.tsx | SSG |
| `/pricing` `/tarifs` | Pricing.tsx | SSG |
| `/faq` | FAQ.tsx | SSG |
| `/faq/:slug` | FAQDetail.tsx | SSG (dynamique) |
| `/contact` | Contact.tsx | SSG |
| `/how-it-works` | HowItWorks.tsx | SSG |
| `/testimonials` | Testimonials.tsx | SSG + ISR |
| `/testimonials/:country/:lang/:type` | TestimonialDetail.tsx | SSG (dynamique) |
| `/help-center` | HelpCenter.tsx | SSG |
| `/help-center/:slug` | HelpArticle.tsx | SSG (dynamique) |
| `/providers` | SOSCall.tsx | SSR |
| `/provider/:id` | ProviderProfile.tsx | SSR/ISR |
| `/avocat/:slug` | ProviderProfile.tsx | SSR/ISR |
| `/expatrie/:slug` | ProviderProfile.tsx | SSR/ISR |
| `/lawyers/:slug` | ProviderProfile.tsx | SSR/ISR |
| `/expats/:slug` | ProviderProfile.tsx | SSR/ISR |
| `/terms-clients` | TermsClients.tsx | SSG |
| `/terms-lawyers` | TermsLawyers.tsx | SSG |
| `/terms-expats` | TermsExpats.tsx | SSG |
| `/privacy-policy` | PrivacyPolicy.tsx | SSG |
| `/cookies` | Cookies.tsx | SSG |
| `/login` | Login.tsx | SSG |
| `/register` | Register.tsx | SSG |
| `/register/client` | RegisterClient.tsx | SSG |
| `/register/lawyer` | RegisterLawyer.tsx | SSG |
| `/register/expat` | RegisterExpat.tsx | SSG |

### 5.2 Pages Protégées (Client-Side OK)

Ces pages peuvent rester client-side:

| Route | Fichier | Notes |
|-------|---------|-------|
| `/dashboard` | Dashboard.tsx | Auth requise |
| `/dashboard/*` | Sous-pages | Auth requise |
| `/profile/edit` | ProfileEdit.tsx | Auth requise |
| `/call-checkout` | CallCheckout.tsx | Auth requise |
| `/payment-success` | PaymentSuccess.tsx | Auth requise |
| `/booking-request` | BookingRequest.tsx | Auth requise |

### 5.3 Pages Admin (~50 pages)

Toutes les pages admin peuvent rester client-side avec `'use client'`:

- `/admin/dashboard`
- `/admin/clients`
- `/admin/lawyers`
- `/admin/expats`
- `/admin/payments`
- `/admin/calls`
- ... (et ~45 autres)

---

## 6. Système d'Internationalisation

### Structure Actuelle

```
src/helper/
├── ar.json    # Arabe
├── ch.json    # Chinois
├── de.json    # Allemand
├── en.json    # Anglais
├── es.json    # Espagnol
├── fr.json    # Français
├── hi.json    # Hindi
├── pt.json    # Portugais
└── ru.json    # Russe
```

### Configuration react-intl

```typescript
// App.tsx actuel
import { IntlProvider } from 'react-intl';

const messages = {
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  // ...
};

<IntlProvider
  messages={messages[locale]}
  locale={locale}
  defaultLocale="fr"
>
  {/* App */}
</IntlProvider>
```

### Migration i18n Recommandée

**Option 1: Conserver react-intl** (Recommandé)
- Moins de refactoring
- react-intl est compatible Next.js avec configuration

**Option 2: Migrer vers next-intl**
- Meilleure intégration Next.js
- Support natif App Router
- Plus de travail de migration

### Structure Routes Multilingues

Actuellement via `multilingual-system/`:
- Slugs traduits par langue
- HrefLang tags
- URL canoniques par langue

**Structure Next.js recommandée:**
```
app/
├── [locale]/
│   ├── page.tsx           # /fr, /en, etc.
│   ├── pricing/
│   │   └── page.tsx       # /fr/tarifs, /en/pricing
│   ├── faq/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   └── ...
└── layout.tsx
```

---

## 7. Intégration Firebase

### Services Firebase Utilisés

| Service | Usage | Fichiers Impactés |
|---------|-------|-------------------|
| Authentication | Login, Register, OAuth | AuthContext.tsx, auth.ts |
| Firestore | Base de données | ~60 fichiers |
| Cloud Functions | API backend | hooks, services |
| Storage | Photos profil, documents | ImageUploader.tsx |
| Analytics | Tracking | ga4.ts, gtm.ts |

### Pattern Actuel d'Accès Firebase

```typescript
// Accès direct Firestore (client-side)
import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const fetchProviders = async () => {
  const q = query(
    collection(db, 'sos_profiles'),
    where('status', '==', 'approved')
  );
  const snapshot = await getDocs(q);
  // ...
};
```

### Migration Firebase pour Next.js

**Approche 1: Firebase Client SDK avec `'use client'`**
- Garder le pattern actuel
- Marquer composants comme client-side
- SEO via SSG pour pages statiques

**Approche 2: Firebase Admin SDK côté serveur**
- Créer API Routes Next.js
- Utiliser Firebase Admin pour SSR
- Plus de travail mais meilleur SEO dynamique

**Recommandation:** Approche hybride
- SSG pour pages statiques (Home, Pricing, FAQ, etc.)
- Client-side pour données dynamiques (providers list)
- ISR pour profils providers (régénération périodique)

### Collections Firestore Principales

| Collection | Usage | Volume Estimé |
|------------|-------|---------------|
| `users` | Tous les utilisateurs | ~10,000+ |
| `sos_profiles` | Avocats & Expatriés | ~1,000+ |
| `calls` | Historique appels | ~50,000+ |
| `reviews` | Avis clients | ~5,000+ |
| `testimonials` | Témoignages publics | ~100+ |
| `faq` | Questions FAQ | ~50+ |
| `help_articles` | Articles aide | ~30+ |
| `country_settings` | Config pays | 197 |

---

## 8. Système SEO Actuel

### Implémentation Actuelle

```typescript
// SEOHead.tsx
import { Helmet } from 'react-helmet-async';

const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  // ...
}) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="keywords" content={keywords} />
    <link rel="canonical" href={canonical} />
    {/* Open Graph */}
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImage} />
    {/* Twitter */}
    <meta name="twitter:card" content="summary_large_image" />
    {/* ... */}
  </Helmet>
);
```

### Schémas Structurés (JSON-LD)

Composants existants:
- `OrganizationSchema.tsx`
- `LocalBusinessSchema.tsx`
- `ProfessionalServiceSchema.tsx`
- `BreadcrumbSchema.tsx`
- `ReviewSchema.tsx`

### Migration SEO vers Next.js

```typescript
// app/[locale]/page.tsx (Next.js)
import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const { locale } = params;
  const t = await getTranslations(locale);

  return {
    title: t('seo.home.title'),
    description: t('seo.home.description'),
    keywords: t('seo.home.keywords'),
    openGraph: {
      title: t('seo.home.title'),
      description: t('seo.home.description'),
      images: ['/og-image.jpg'],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('seo.home.title'),
      description: t('seo.home.description'),
    },
    alternates: {
      canonical: `https://sos-expat.com/${locale}`,
      languages: {
        'fr': '/fr',
        'en': '/en',
        'es': '/es',
        // ...
      },
    },
  };
}
```

---

## 9. Stratégie de Migration

### Approche Recommandée: Migration Progressive

**Phase 1:** Coexistence (2-3 semaines)
- Créer projet Next.js séparé
- Migrer pages publiques SEO-critiques
- Garder SPA Vite pour pages protégées temporairement

**Phase 2:** Migration Complète (4-6 semaines)
- Migrer toutes les pages
- Adapter contextes et hooks
- Tests approfondis

**Phase 3:** Optimisation (2 semaines)
- Performance tuning
- SEO final
- Monitoring

### Structure Next.js Cible

```
sos-nextjs/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Home
│   │   ├── (public)/                   # Routes publiques
│   │   │   ├── pricing/page.tsx
│   │   │   ├── faq/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   ├── testimonials/page.tsx
│   │   │   ├── providers/page.tsx
│   │   │   └── provider/[slug]/page.tsx
│   │   ├── (auth)/                     # Routes auth
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── password-reset/page.tsx
│   │   └── (protected)/                # Routes protégées
│   │       ├── layout.tsx              # Auth check
│   │       ├── dashboard/page.tsx
│   │       ├── profile/edit/page.tsx
│   │       └── call-checkout/page.tsx
│   ├── admin/                          # Admin (client-side)
│   │   ├── layout.tsx
│   │   └── [...slug]/page.tsx
│   └── api/                            # API Routes
│       ├── auth/[...nextauth]/route.ts
│       └── providers/route.ts
├── components/                         # Composants migrés
├── contexts/                           # Contextes adaptés
├── hooks/                              # Hooks adaptés
├── lib/
│   ├── firebase/
│   │   ├── client.ts                   # Client SDK
│   │   └── admin.ts                    # Admin SDK (server)
│   └── i18n/
├── messages/                           # Traductions
│   ├── ar.json
│   ├── ch.json
│   └── ...
├── public/
├── middleware.ts                       # i18n routing
├── next.config.js
└── package.json
```

---

## 10. Plan Étape par Étape

### Phase 1: Préparation (Semaine 1)

#### Étape 1.1: Configuration Projet Next.js
```bash
npx create-next-app@latest sos-nextjs --typescript --tailwind --eslint --app
cd sos-nextjs
```

**Fichiers à créer:**
- `next.config.js` avec config i18n
- `middleware.ts` pour routing multilingue
- `tailwind.config.ts` (copier config existante)

#### Étape 1.2: Configuration Firebase
```typescript
// lib/firebase/client.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // ...
};

export const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
```

```typescript
// lib/firebase/admin.ts (pour SSR)
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
```

#### Étape 1.3: Configuration i18n
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const locales = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];
const defaultLocale = 'fr';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if locale is in pathname
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Redirect to default locale
  const locale = request.headers.get('accept-language')?.split(',')[0].split('-')[0] || defaultLocale;
  const validLocale = locales.includes(locale) ? locale : defaultLocale;

  return NextResponse.redirect(
    new URL(`/${validLocale}${pathname}`, request.url)
  );
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
```

### Phase 2: Migration Pages Publiques (Semaines 2-3)

#### Étape 2.1: Page d'Accueil
```typescript
// app/[locale]/page.tsx
import { Metadata } from 'next';
import { getTranslations } from '@/lib/i18n';
import HeroSection from '@/components/home/HeroSection';
import ServicesSection from '@/components/home/ServicesSection';
import ProfileCarousel from '@/components/home/ProfileCarousel';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import CTASection from '@/components/home/CTASection';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations(params.locale);
  return {
    title: t('seo.home.title'),
    description: t('seo.home.description'),
    // ...
  };
}

export default async function HomePage({ params }: Props) {
  const t = await getTranslations(params.locale);

  return (
    <main>
      <HeroSection translations={t} />
      <ServicesSection translations={t} />
      <ProfileCarousel locale={params.locale} />
      <TestimonialsSection locale={params.locale} />
      <CTASection translations={t} />
    </main>
  );
}

// Générer toutes les pages statiques pour chaque locale
export function generateStaticParams() {
  return [
    { locale: 'fr' },
    { locale: 'en' },
    { locale: 'es' },
    { locale: 'de' },
    { locale: 'pt' },
    { locale: 'ru' },
    { locale: 'zh' },
    { locale: 'ar' },
    { locale: 'hi' },
  ];
}
```

#### Étape 2.2: Pages FAQ avec SSG Dynamique
```typescript
// app/[locale]/faq/[slug]/page.tsx
import { Metadata } from 'next';
import { adminDb } from '@/lib/firebase/admin';

interface Props {
  params: { locale: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const faq = await getFaqBySlug(params.slug, params.locale);
  return {
    title: faq?.title || 'FAQ',
    description: faq?.excerpt || '',
  };
}

async function getFaqBySlug(slug: string, locale: string) {
  const snapshot = await adminDb
    .collection('faq')
    .where('slug', '==', slug)
    .where('locale', '==', locale)
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0].data();
}

export default async function FAQDetailPage({ params }: Props) {
  const faq = await getFaqBySlug(params.slug, params.locale);

  if (!faq) {
    notFound();
  }

  return (
    <article>
      <h1>{faq.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: faq.content }} />
    </article>
  );
}

// Pré-générer toutes les pages FAQ
export async function generateStaticParams() {
  const locales = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];
  const params = [];

  for (const locale of locales) {
    const snapshot = await adminDb
      .collection('faq')
      .where('locale', '==', locale)
      .get();

    for (const doc of snapshot.docs) {
      params.push({ locale, slug: doc.data().slug });
    }
  }

  return params;
}
```

#### Étape 2.3: Profils Providers avec ISR
```typescript
// app/[locale]/provider/[slug]/page.tsx
import { Metadata } from 'next';
import { adminDb } from '@/lib/firebase/admin';
import ProviderProfileClient from './ProviderProfileClient';

interface Props {
  params: { locale: string; slug: string };
}

async function getProvider(slug: string) {
  const snapshot = await adminDb
    .collection('sos_profiles')
    .where('slug', '==', slug)
    .where('status', '==', 'approved')
    .limit(1)
    .get();

  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = await getProvider(params.slug);

  if (!provider) {
    return { title: 'Provider Not Found' };
  }

  return {
    title: `${provider.firstName} ${provider.lastName} - ${provider.role === 'lawyer' ? 'Avocat' : 'Expatrié'}`,
    description: provider.bio?.substring(0, 160) || '',
    openGraph: {
      images: [provider.profilePhoto || '/default-avatar.png'],
    },
  };
}

export default async function ProviderProfilePage({ params }: Props) {
  const provider = await getProvider(params.slug);

  if (!provider) {
    notFound();
  }

  // Passer les données initiales au composant client
  return <ProviderProfileClient initialData={provider} locale={params.locale} />;
}

// ISR: Régénérer toutes les 60 secondes
export const revalidate = 60;
```

### Phase 3: Migration Composants Client (Semaines 4-5)

#### Étape 3.1: Adaptation des Contextes

```typescript
// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/client';
// ... reste du code existant

// IMPORTANT: Wrapper pour éviter erreurs SSR
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Éviter le rendu côté serveur
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AuthContextProvider>
      {children}
    </AuthContextProvider>
  );
}
```

#### Étape 3.2: Composants avec APIs Browser

```typescript
// components/common/ShareButton.tsx
'use client';

import { useState, useEffect } from 'react';

export default function ShareButton({ url, title }: Props) {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Vérifier côté client uniquement
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  const handleShare = async () => {
    if (canShare) {
      await navigator.share({ url, title });
    }
  };

  if (!canShare) return null;

  return <button onClick={handleShare}>Partager</button>;
}
```

#### Étape 3.3: Dynamic Imports pour Composants Lourds

```typescript
// app/[locale]/providers/page.tsx
import dynamic from 'next/dynamic';

// Leaflet map - client-side only
const ProvidersMap = dynamic(
  () => import('@/components/providers/ProvidersMap'),
  {
    ssr: false,
    loading: () => <div className="h-96 bg-gray-100 animate-pulse" />
  }
);

export default function ProvidersPage() {
  return (
    <div>
      <h1>Nos Avocats et Expatriés</h1>
      <ProvidersMap />
    </div>
  );
}
```

### Phase 4: Migration Pages Admin (Semaine 5-6)

```typescript
// app/admin/layout.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminLayoutWrapper({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
```

```typescript
// app/admin/[...slug]/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

// Mapping des pages admin
const adminPages = {
  'dashboard': dynamic(() => import('@/pages/admin/AdminDashboard')),
  'clients': dynamic(() => import('@/pages/admin/AdminClients')),
  'lawyers': dynamic(() => import('@/pages/admin/AdminLawyers')),
  'expats': dynamic(() => import('@/pages/admin/AdminExpats')),
  // ... autres pages
};

export default function AdminPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : 'dashboard';

  const PageComponent = adminPages[slug] || adminPages['dashboard'];

  return <PageComponent />;
}
```

### Phase 5: Finalisation (Semaine 7)

#### Étape 5.1: Configuration PWA Next.js

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  // ... autres configs
});
```

#### Étape 5.2: Sitemap Dynamique

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebase/admin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sos-expat.com';
  const locales = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];

  // Pages statiques
  const staticPages = [
    '',
    '/pricing',
    '/faq',
    '/contact',
    '/how-it-works',
    '/testimonials',
    '/register/lawyer',
    '/register/expat',
  ];

  const staticRoutes = locales.flatMap(locale =>
    staticPages.map(page => ({
      url: `${baseUrl}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: page === '' ? 1 : 0.8,
    }))
  );

  // Pages providers dynamiques
  const providersSnapshot = await adminDb
    .collection('sos_profiles')
    .where('status', '==', 'approved')
    .get();

  const providerRoutes = providersSnapshot.docs.flatMap(doc => {
    const data = doc.data();
    return locales.map(locale => ({
      url: `${baseUrl}/${locale}/provider/${data.slug}`,
      lastModified: new Date(data.updatedAt?.toDate() || Date.now()),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  });

  return [...staticRoutes, ...providerRoutes];
}
```

#### Étape 5.3: Robots.txt

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/dashboard/'],
    },
    sitemap: 'https://sos-expat.com/sitemap.xml',
  };
}
```

---

## 11. Risques et Mitigations

### Risque 1: Régression Fonctionnelle
**Probabilité:** Moyenne
**Impact:** Élevé

**Mitigation:**
- Tests E2E complets avant migration
- Migration progressive par feature
- Environnement de staging complet
- Rollback plan avec l'ancien Vite

### Risque 2: Performance Dégradée
**Probabilité:** Faible
**Impact:** Moyen

**Mitigation:**
- Benchmarks avant/après
- Optimisation bundle splitting
- Utilisation appropriée SSG/SSR/ISR
- Lazy loading agressif

### Risque 3: Problèmes Firebase + SSR
**Probabilité:** Haute
**Impact:** Moyen

**Mitigation:**
- Firebase Admin SDK pour SSR
- Client SDK uniquement dans `'use client'`
- Gestion explicite des états de chargement
- Fallbacks appropriés

### Risque 4: SEO Transition
**Probabilité:** Faible
**Impact:** Élevé

**Mitigation:**
- Redirections 301 pour anciennes URLs
- Sitemap complet avant lancement
- Monitoring Search Console
- Période de transition avec les deux versions

### Risque 5: Perte de Fonctionnalités PWA
**Probabilité:** Moyenne
**Impact:** Faible

**Mitigation:**
- Configuration next-pwa correcte
- Test sur tous les devices
- Service worker personnalisé si nécessaire

---

## 12. Checklist de Migration

### Pré-Migration
- [ ] Backup complet du projet actuel
- [ ] Documentation de toutes les routes
- [ ] Export des variables d'environnement
- [ ] Tests E2E du site actuel
- [ ] Benchmarks performance actuels

### Phase 1: Setup
- [ ] Créer projet Next.js
- [ ] Configurer Tailwind CSS
- [ ] Configurer Firebase (client + admin)
- [ ] Configurer i18n (middleware + messages)
- [ ] Configurer TypeScript paths

### Phase 2: Pages Publiques
- [ ] Home page (SSG)
- [ ] Pricing page (SSG)
- [ ] FAQ pages (SSG dynamique)
- [ ] Contact page (SSG)
- [ ] How It Works page (SSG)
- [ ] Testimonials pages (SSG + ISR)
- [ ] Provider profiles (ISR)
- [ ] Help Center (SSG)
- [ ] Legal pages (SSG)
- [ ] Auth pages (SSG)

### Phase 3: Composants
- [ ] Header/Footer
- [ ] Layout components
- [ ] SEO components (Metadata API)
- [ ] Schema components (JSON-LD)
- [ ] Forms components
- [ ] UI components

### Phase 4: Contextes & Hooks
- [ ] AuthContext adaptation
- [ ] AppContext adaptation
- [ ] Tous les hooks avec browser APIs

### Phase 5: Pages Protégées
- [ ] Dashboard
- [ ] Profile Edit
- [ ] Call Checkout
- [ ] Payment Success
- [ ] Messages

### Phase 6: Admin
- [ ] Admin Layout
- [ ] Toutes les pages admin

### Phase 7: Finalisation
- [ ] PWA configuration
- [ ] Sitemap dynamique
- [ ] Robots.txt
- [ ] Error pages (404, 500)
- [ ] Loading states
- [ ] Analytics

### Post-Migration
- [ ] Tests complets toutes fonctionnalités
- [ ] Tests SEO (meta tags, schemas)
- [ ] Tests performance
- [ ] Tests accessibilité
- [ ] Monitoring 24h post-deploy
- [ ] Vérification Search Console

---

## Conclusion

La migration de SOS-Expat vers Next.js est un projet ambitieux mais réalisable. Les principaux défis sont:

1. **Volume de code:** ~250 fichiers à migrer
2. **APIs Browser:** 618 occurrences à adapter
3. **Firebase:** Configuration hybride client/server
4. **i18n:** 9 langues avec slugs traduits

**Estimation totale:** 6-8 semaines avec une équipe dédiée

**Bénéfices attendus:**
- SEO optimal avec SSR/SSG
- Meilleure indexation Google
- Performance améliorée (ISR, code splitting automatique)
- Developer Experience améliorée

**Recommandation:** Procéder par phases, en commençant par les pages publiques les plus importantes pour le SEO (Home, Pricing, Provider Profiles) tout en maintenant le site actuel fonctionnel.

---

*Document généré par analyse IA - 30 agents d'analyse parallèles*
*SOS-Expat.com - Migration Vite vers Next.js*
