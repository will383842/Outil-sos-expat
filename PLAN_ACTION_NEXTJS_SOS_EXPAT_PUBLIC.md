# PLAN D'ACTION COMPLET - MIGRATION NEXT.JS SOS-EXPAT-PUBLIC

> **Document de reference ultime pour la migration vers Next.js**
>
> Date de creation: 2026-01-05
> Version: 2.0 (Mise a jour complete apres audit de 30 agents IA)
> Projet: sos-expat-public

---

## TABLE DES MATIERES

1. [Resume Executif](#1-resume-executif)
2. [Architecture Cible](#2-architecture-cible)
3. [Systeme Multilingue Complet](#3-systeme-multilingue-complet)
4. [Pages a Migrer](#4-pages-a-migrer)
5. [Composants a Partager](#5-composants-a-partager)
6. [Firebase et Donnees](#6-firebase-et-donnees)
7. [SEO et Referencement IA](#7-seo-et-referencement-ia)
8. [Routing et Redirections](#8-routing-et-redirections)
9. [Performance et Core Web Vitals](#9-performance-et-core-web-vitals)
10. [Configuration DigitalOcean](#10-configuration-digitalocean)
11. [Plan d'Action Pas a Pas](#11-plan-daction-pas-a-pas)
12. [Checklist de Validation](#12-checklist-de-validation)

---

## 1. RESUME EXECUTIF

### 1.1 Objectif
Creer un projet Next.js (`sos-expat-public/`) pour les pages publiques SEO-critical, tout en conservant la SPA React existante (`sos/`) pour le dashboard et l'admin.

### 1.2 Architecture Hybride

```
sos-expat-project/
├── sos/                    # SPA React (dashboard, admin, checkout)
├── sos-expat-public/       # Next.js (pages publiques SEO)
├── Outil-sos-expat/        # Outil IA (existant)
└── .do/
    └── app.yaml            # Config DigitalOcean multi-services
```

### 1.3 Benefices Attendus

| Metrique | Avant (SPA) | Apres (Next.js) |
|----------|-------------|-----------------|
| Time to First Byte | 800-1200ms | 50-200ms |
| First Contentful Paint | 2-4s | 0.5-1s |
| Pages indexees Google | ~30% | 100% |
| Score Lighthouse | 45-65 | 90-100 |
| Crawlabilite IA | Limitee | Complete |

---

## 2. ARCHITECTURE CIBLE

### 2.1 Structure du Projet Next.js

```
sos-expat-public/
├── app/
│   ├── [locale]/                          # Route dynamique locale
│   │   ├── layout.tsx                     # Layout avec i18n
│   │   ├── page.tsx                       # Home
│   │   ├── (static)/                      # Pages statiques SSG
│   │   │   ├── tarifs/page.tsx           # Pricing
│   │   │   ├── comment-ca-marche/page.tsx # How it works
│   │   │   ├── contact/page.tsx          # Contact
│   │   │   ├── mentions-legales/page.tsx # Legal
│   │   │   ├── politique-confidentialite/page.tsx
│   │   │   ├── cookies/page.tsx
│   │   │   └── consommateurs/page.tsx
│   │   ├── (dynamic)/                     # Pages dynamiques ISR
│   │   │   ├── faq/
│   │   │   │   ├── page.tsx              # FAQ list
│   │   │   │   └── [slug]/page.tsx       # FAQ detail
│   │   │   ├── temoignages/
│   │   │   │   ├── page.tsx              # Testimonials list
│   │   │   │   └── [country]/[language]/[type]/page.tsx
│   │   │   ├── centre-aide/
│   │   │   │   ├── page.tsx              # Help center
│   │   │   │   └── [slug]/page.tsx       # Help article
│   │   │   └── prestataires/
│   │   │       ├── page.tsx              # Providers list
│   │   │       └── [slug]/page.tsx       # Provider profile
│   │   └── not-found.tsx                  # 404 page
│   ├── api/
│   │   ├── revalidate/route.ts           # ISR webhook
│   │   └── health/route.ts               # Health check
│   ├── robots.ts                          # Robots.txt dynamique
│   ├── sitemap.ts                         # Sitemap dynamique
│   └── manifest.ts                        # PWA manifest
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Navigation.tsx
│   │   └── LanguageSwitcher.tsx
│   ├── seo/
│   │   ├── SEOHead.tsx
│   │   ├── HreflangLinks.tsx
│   │   ├── OrganizationSchema.tsx
│   │   ├── BreadcrumbSchema.tsx
│   │   ├── FAQSchema.tsx
│   │   ├── LocalBusinessSchema.tsx
│   │   └── ReviewSchema.tsx
│   ├── ui/                                # Composants UI partages
│   └── common/                            # Composants communs
├── lib/
│   ├── firebase/
│   │   ├── admin.ts                       # Firebase Admin SDK (SSR)
│   │   ├── client.ts                      # Firebase Client SDK
│   │   └── collections.ts                 # Types collections
│   ├── i18n/
│   │   ├── config.ts                      # Configuration i18n
│   │   ├── dictionaries.ts                # Chargement traductions
│   │   └── routing.ts                     # Route translations
│   ├── seo/
│   │   ├── metadata.ts                    # Generateur metadata
│   │   └── schemas.ts                     # JSON-LD schemas
│   └── utils/
│       ├── localeHelpers.ts
│       └── slugGenerator.ts
├── messages/                              # Fichiers de traduction
│   ├── fr.json
│   ├── en.json
│   ├── es.json
│   ├── de.json
│   ├── ru.json
│   ├── pt.json
│   ├── ch.json
│   ├── ar.json
│   └── hi.json
├── public/
│   ├── fonts/
│   │   └── inter-var.woff2
│   ├── images/
│   ├── icons/
│   └── llms.txt                           # Fichier pour IA crawlers
├── middleware.ts                          # Middleware i18n + redirections
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 2.2 Flux de Donnees

```
┌─────────────────────────────────────────────────────────────────┐
│                      UTILISATEUR                                │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│    DIGITALOCEAN CDN     │       │   DIGITALOCEAN CDN      │
│    (Edge Caching)       │       │   (Edge Caching)        │
└───────────┬─────────────┘       └───────────┬─────────────┘
            │                                 │
            ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│   NEXT.JS APP PLATFORM  │       │   REACT SPA (STATIC)    │
│   sos-expat-public      │       │   sos                   │
│                         │       │                         │
│   Routes:               │       │   Routes:               │
│   - / (Home)            │       │   - /dashboard/*        │
│   - /tarifs             │       │   - /admin/*            │
│   - /faq/*              │       │   - /checkout/*         │
│   - /prestataires/*     │       │   - /login              │
│   - /temoignages/*      │       │   - /register/*         │
│   - /contact            │       │   - /payment/*          │
│   - /centre-aide/*      │       │                         │
│   - /mentions-legales   │       │                         │
└───────────┬─────────────┘       └───────────┬─────────────┘
            │                                 │
            └─────────────┬───────────────────┘
                          ▼
              ┌─────────────────────────┐
              │      FIREBASE           │
              │                         │
              │   - Firestore (DB)      │
              │   - Auth                │
              │   - Storage             │
              │   - Cloud Functions     │
              └─────────────────────────┘
```

---

## 3. SYSTEME MULTILINGUE COMPLET

### 3.1 Langues Supportees (9)

| Code | Langue | Pays par defaut | Direction | Hreflang SEO |
|------|--------|-----------------|-----------|--------------|
| fr | Francais | France (fr) | LTR | fr |
| en | English | USA (us) | LTR | en |
| es | Espanol | Espagne (es) | LTR | es |
| de | Deutsch | Allemagne (de) | LTR | de |
| ru | Russe | Russie (ru) | LTR | ru |
| pt | Portugues | Portugal (pt) | LTR | pt |
| ch | Chinois | Chine (cn) | LTR | zh-Hans |
| hi | Hindi | Inde (in) | LTR | hi |
| ar | Arabe | Arabie Saoudite (sa) | **RTL** | ar |

### 3.2 Pays Supportes (196)

Tous les codes ISO 3166-1 alpha-2 sont supportes:

```typescript
const SUPPORTED_COUNTRIES = [
  // Europe (44)
  'fr', 'de', 'gb', 'es', 'it', 'pt', 'nl', 'be', 'ch', 'at', 'pl', 'cz', 'sk',
  'hu', 'ro', 'bg', 'hr', 'si', 'rs', 'ba', 'mk', 'al', 'gr', 'cy', 'mt', 'ie',
  'dk', 'se', 'no', 'fi', 'ee', 'lv', 'lt', 'by', 'ua', 'md', 'ru', 'is', 'lu',
  'li', 'mc', 'ad', 'sm', 'va',

  // Ameriques (35)
  'us', 'ca', 'mx', 'gt', 'bz', 'sv', 'hn', 'ni', 'cr', 'pa', 'cu', 'jm', 'ht',
  'do', 'pr', 'tt', 'bb', 'gd', 'vc', 'lc', 'dm', 'ag', 'kn', 'bs', 'co', 've',
  'ec', 'pe', 'bo', 'py', 'uy', 'ar', 'cl', 'br', 'gy', 'sr',

  // Asie (48)
  'cn', 'jp', 'kr', 'kp', 'tw', 'hk', 'mo', 'mn', 'in', 'pk', 'bd', 'lk', 'np',
  'bt', 'mm', 'th', 'la', 'vn', 'kh', 'my', 'sg', 'id', 'ph', 'bn', 'tl', 'af',
  'ir', 'iq', 'sy', 'jo', 'lb', 'il', 'ps', 'sa', 'ye', 'om', 'ae', 'qa', 'bh',
  'kw', 'tr', 'az', 'ge', 'am', 'kz', 'uz', 'tm', 'kg', 'tj',

  // Afrique (54)
  'eg', 'ly', 'tn', 'dz', 'ma', 'mr', 'sn', 'gm', 'gw', 'gn', 'sl', 'lr', 'ci',
  'bf', 'ml', 'ne', 'ng', 'td', 'cm', 'cf', 'cg', 'cd', 'ga', 'gq', 'st', 'ao',
  'zm', 'zw', 'mw', 'mz', 'na', 'bw', 'sz', 'ls', 'za', 'mg', 'mu', 'km', 'sc',
  'rw', 'bi', 'ug', 'ke', 'tz', 'et', 'er', 'dj', 'so', 'sd', 'ss', 'tg', 'bj',
  'gh', 'cv',

  // Oceanie (14)
  'au', 'nz', 'pg', 'fj', 'sb', 'vu', 'nc', 'ws', 'to', 'tv', 'nr', 'ki', 'mh',
  'fm', 'pw'
];
```

### 3.3 Combinaisons Locale (1764 totales)

**Format URL:** `/{langue}-{pays}/{slug-traduit}`

**Exemples de combinaisons valides:**

```
# Combinaisons standard (langue = pays)
/fr-fr/tarifs
/en-us/pricing
/es-es/precios
/de-de/preise

# Combinaisons cross-pays (langue ≠ pays)
/en-fr/pricing          # Anglais en France
/fr-ca/tarifs           # Francais au Canada
/fr-be/tarifs           # Francais en Belgique
/en-gb/pricing          # Anglais au Royaume-Uni
/es-mx/precios          # Espagnol au Mexique
/pt-br/precos           # Portugais au Bresil
/ar-ae/الأسعار          # Arabe aux Emirats
/ar-th/الأسعار          # Arabe en Thailande
/ch-sg/价格             # Chinois a Singapour
/hi-gb/मूल्य-निर्धारण    # Hindi au Royaume-Uni
```

### 3.4 Detection de Locale (Priorite)

```typescript
// middleware.ts - Priorite de detection
const detectLocale = (request: NextRequest): string => {
  // 1. URL explicite (/fr-fr/...)
  const urlLocale = extractLocaleFromPath(request.nextUrl.pathname);
  if (urlLocale) return urlLocale;

  // 2. Cookie de preference
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) return cookieLocale;

  // 3. Header Accept-Language
  const acceptLang = request.headers.get('accept-language');
  const browserLocale = parseAcceptLanguage(acceptLang);
  if (browserLocale) return browserLocale;

  // 4. Geolocation (Vercel/DigitalOcean headers)
  const country = request.geo?.country?.toLowerCase() ||
                  request.headers.get('cf-ipcountry')?.toLowerCase();
  if (country) {
    const langForCountry = getLanguageForCountry(country);
    return `${langForCountry}-${country}`;
  }

  // 5. Default
  return 'fr-fr';
};
```

### 3.5 Mapping Langue → Pays par Defaut

```typescript
const LANGUAGE_TO_DEFAULT_COUNTRY: Record<string, string> = {
  fr: 'fr',   // Francais → France
  en: 'us',   // Anglais → USA
  es: 'es',   // Espagnol → Espagne
  de: 'de',   // Allemand → Allemagne
  ru: 'ru',   // Russe → Russie
  pt: 'pt',   // Portugais → Portugal
  ch: 'cn',   // Chinois → Chine
  hi: 'in',   // Hindi → Inde
  ar: 'sa',   // Arabe → Arabie Saoudite
};
```

### 3.6 Mapping Pays → Langue Principale

```typescript
const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  // Francophone (22 pays)
  fr: 'fr', be: 'fr', ch: 'fr', lu: 'fr', mc: 'fr', ca: 'fr',
  sn: 'fr', ci: 'fr', ml: 'fr', bf: 'fr', ne: 'fr', tg: 'fr',
  bj: 'fr', rw: 'fr', bi: 'fr', cd: 'fr', cg: 'fr', ga: 'fr',
  cm: 'fr', mg: 'fr', dz: 'fr', ma: 'fr', tn: 'fr',

  // Anglophone (16 pays)
  us: 'en', gb: 'en', au: 'en', nz: 'en', ie: 'en', za: 'en',
  ke: 'en', ng: 'en', gh: 'en', ph: 'en', sg: 'en', my: 'en',
  pk: 'en', jm: 'en', tt: 'en', bb: 'en',

  // Hispanophone (21 pays)
  es: 'es', mx: 'es', ar: 'es', co: 'es', cl: 'es', pe: 'es',
  ve: 'es', ec: 'es', gt: 'es', cu: 'es', bo: 'es', do: 'es',
  hn: 'es', py: 'es', sv: 'es', ni: 'es', cr: 'es', pa: 'es',
  uy: 'es', gq: 'es', pr: 'es',

  // Germanophone (3 pays)
  de: 'de', at: 'de', li: 'de',

  // Russophone (8 pays)
  ru: 'ru', by: 'ru', kz: 'ru', kg: 'ru', tj: 'ru', uz: 'ru',
  tm: 'ru', md: 'ru',

  // Lusophone (8 pays)
  pt: 'pt', br: 'pt', ao: 'pt', mz: 'pt', gw: 'pt', tl: 'pt',
  cv: 'pt', st: 'pt',

  // Sinophone (4 pays/territoires)
  cn: 'ch', tw: 'ch', hk: 'ch', mo: 'ch',

  // Hindophone (3 pays)
  in: 'hi', np: 'hi', fj: 'hi',

  // Arabophone (17 pays)
  sa: 'ar', ae: 'ar', eg: 'ar', iq: 'ar', jo: 'ar', kw: 'ar',
  lb: 'ar', ly: 'ar', om: 'ar', ps: 'ar', qa: 'ar', sd: 'ar',
  sy: 'ar', ye: 'ar', bh: 'ar', dj: 'ar', mr: 'ar', so: 'ar',
};
```

### 3.7 Traduction des Routes (40 cles)

```typescript
const ROUTE_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Pages principales
  'pricing': {
    fr: 'tarifs',
    en: 'pricing',
    es: 'precios',
    de: 'preise',
    ru: 'цены',
    pt: 'precos',
    ch: '价格',
    hi: 'मूल्य-निर्धारण',
    ar: 'الأسعار',
  },
  'how-it-works': {
    fr: 'comment-ca-marche',
    en: 'how-it-works',
    es: 'como-funciona',
    de: 'so-funktioniert-es',
    ru: 'как-это-работает',
    pt: 'como-funciona',
    ch: '如何运作',
    hi: 'यह-कैसे-काम-करता-है',
    ar: 'كيف-يعمل',
  },
  'contact': {
    fr: 'contact',
    en: 'contact',
    es: 'contacto',
    de: 'kontakt',
    ru: 'контакт',
    pt: 'contato',
    ch: '联系我们',
    hi: 'संपर्क',
    ar: 'اتصل-بنا',
  },
  'faq': {
    fr: 'faq',
    en: 'faq',
    es: 'preguntas-frecuentes',
    de: 'haeufige-fragen',
    ru: 'часто-задаваемые-вопросы',
    pt: 'perguntas-frequentes',
    ch: '常见问题',
    hi: 'अक्सर-पूछे-जाने-वाले-प्रश्न',
    ar: 'الأسئلة-الشائعة',
  },
  'testimonials': {
    fr: 'temoignages',
    en: 'testimonials',
    es: 'testimonios',
    de: 'erfahrungsberichte',
    ru: 'отзывы',
    pt: 'depoimentos',
    ch: '客户评价',
    hi: 'प्रशंसापत्र',
    ar: 'شهادات',
  },
  'providers': {
    fr: 'prestataires',
    en: 'providers',
    es: 'proveedores',
    de: 'anbieter',
    ru: 'специалисты',
    pt: 'prestadores',
    ch: '服务提供者',
    hi: 'प्रदाता',
    ar: 'مقدمي-الخدمات',
  },
  'lawyers': {
    fr: 'avocat',
    en: 'lawyers',
    es: 'abogados',
    de: 'anwaelte',
    ru: 'юристы',
    pt: 'advogados',
    ch: '律师',
    hi: 'वकील',
    ar: 'محامون',
  },
  'expats': {
    fr: 'expatrie',
    en: 'expats',
    es: 'expatriados',
    de: 'expats',
    ru: 'экспаты',
    pt: 'expatriados',
    ch: '外籍人士',
    hi: 'प्रवासी',
    ar: 'المغتربين',
  },
  'help-center': {
    fr: 'centre-aide',
    en: 'help-center',
    es: 'centro-ayuda',
    de: 'hilfezentrum',
    ru: 'справочный-центр',
    pt: 'central-ajuda',
    ch: '帮助中心',
    hi: 'सहायता-केंद्र',
    ar: 'مركز-المساعدة',
  },
  'privacy-policy': {
    fr: 'politique-confidentialite',
    en: 'privacy-policy',
    es: 'politica-privacidad',
    de: 'datenschutz',
    ru: 'политика-конфиденциальности',
    pt: 'politica-privacidade',
    ch: '隐私政策',
    hi: 'गोपनीयता-नीति',
    ar: 'سياسة-الخصوصية',
  },
  'terms': {
    fr: 'mentions-legales',
    en: 'terms',
    es: 'terminos',
    de: 'nutzungsbedingungen',
    ru: 'условия-использования',
    pt: 'termos',
    ch: '使用条款',
    hi: 'नियम-और-शर्तें',
    ar: 'الشروط-والأحكام',
  },
  'cookies': {
    fr: 'cookies',
    en: 'cookies',
    es: 'cookies',
    de: 'cookies',
    ru: 'куки',
    pt: 'cookies',
    ch: 'cookies政策',
    hi: 'कुकीज़',
    ar: 'ملفات-تعريف-الارتباط',
  },
  'consumers': {
    fr: 'consommateurs',
    en: 'consumers',
    es: 'consumidores',
    de: 'verbraucher',
    ru: 'потребители',
    pt: 'consumidores',
    ch: '消费者',
    hi: 'उपभोक्ता',
    ar: 'المستهلكين',
  },
  'terms-lawyers': {
    fr: 'conditions-avocats',
    en: 'terms-lawyers',
    es: 'terminos-abogados',
    de: 'bedingungen-anwaelte',
    ru: 'условия-юристы',
    pt: 'termos-advogados',
    ch: '律师条款',
    hi: 'वकील-शर्तें',
    ar: 'شروط-المحامين',
  },
  'terms-expats': {
    fr: 'conditions-expatries',
    en: 'terms-expats',
    es: 'terminos-expatriados',
    de: 'bedingungen-expats',
    ru: 'условия-экспаты',
    pt: 'termos-expatriados',
    ch: '外籍人士条款',
    hi: 'प्रवासी-शर्तें',
    ar: 'شروط-المغتربين',
  },
  'terms-clients': {
    fr: 'conditions-clients',
    en: 'terms-clients',
    es: 'terminos-clientes',
    de: 'bedingungen-kunden',
    ru: 'условия-клиенты',
    pt: 'termos-clientes',
    ch: '客户条款',
    hi: 'ग्राहक-शर्तें',
    ar: 'شروط-العملاء',
  },
  'service-status': {
    fr: 'etat-service',
    en: 'service-status',
    es: 'estado-servicio',
    de: 'servicestatus',
    ru: 'статус-сервиса',
    pt: 'estado-servico',
    ch: '服务状态',
    hi: 'सेवा-स्थिति',
    ar: 'حالة-الخدمة',
  },
};
```

---

## 4. PAGES A MIGRER

### 4.1 Pages Publiques (20 pages)

| # | Page | Route | Mode Rendu | Revalidation | Priorite |
|---|------|-------|------------|--------------|----------|
| 1 | Home | `/` | SSG + ISR | 6h | P0 |
| 2 | Pricing | `/tarifs` | SSG + ISR | 1h | P0 |
| 3 | How It Works | `/comment-ca-marche` | SSG | - | P1 |
| 4 | Contact | `/contact` | SSR | - | P1 |
| 5 | FAQ List | `/faq` | SSG + ISR | 24h | P1 |
| 6 | FAQ Detail | `/faq/[slug]` | ISR | 24h | P1 |
| 7 | Testimonials List | `/temoignages` | SSG + ISR | 12h | P1 |
| 8 | Testimonial Detail | `/temoignages/[...params]` | ISR | 24h | P2 |
| 9 | Help Center | `/centre-aide` | SSG + ISR | 24h | P2 |
| 10 | Help Article | `/centre-aide/[slug]` | ISR | 24h | P2 |
| 11 | Providers List | `/prestataires` | SSG + ISR | 6h | P0 |
| 12 | Provider Profile | `/prestataires/[slug]` | ISR | 4h | P0 |
| 13 | Lawyers | `/avocat` | SSG + ISR | 6h | P1 |
| 14 | Expats | `/expatrie` | SSG + ISR | 6h | P1 |
| 15 | Privacy Policy | `/politique-confidentialite` | SSG | - | P2 |
| 16 | Terms (Clients) | `/conditions-clients` | SSG | - | P2 |
| 17 | Terms (Lawyers) | `/conditions-avocats` | SSG | - | P2 |
| 18 | Terms (Expats) | `/conditions-expatries` | SSG | - | P2 |
| 19 | Cookies | `/cookies` | SSG | - | P2 |
| 20 | Consumers | `/consommateurs` | SSG | - | P2 |
| 21 | 404 Not Found | `/not-found` | SSG | - | P1 |
| 22 | Service Status | `/etat-service` | SSR | - | P2 |

### 4.2 Pages a NE PAS Migrer (SPA React)

Ces pages restent dans la SPA React existante (`sos/`):

```
# Authentification
/login
/register
/register/client
/register/lawyer
/register/expat
/password-reset

# Dashboard utilisateur
/dashboard
/dashboard/messages
/dashboard/ai-assistant
/dashboard/subscription
/dashboard/subscription/plans
/dashboard/subscription/success
/dashboard/conversations

# Paiement/Checkout
/call-checkout/:providerId
/booking-request/:providerId
/payment-success

# Profil
/profile/edit

# Admin (50+ pages)
/admin/*

# Services proteges
/sos-appel
/appel-expatrie
```

---

## 5. COMPOSANTS A PARTAGER

### 5.1 Composants UI Communs

```typescript
// Liste des composants a copier de sos/ vers sos-expat-public/

// Layout (obligatoires)
'components/layout/Header.tsx'           // → Simplifier (retirer dashboard items)
'components/layout/Footer.tsx'           // → Copier tel quel
'components/layout/Navigation.tsx'       // → Adapter pour Next.js Link

// SEO (obligatoires)
'components/seo/OrganizationSchema.tsx'  // → Adapter pour Next.js
'components/seo/BreadcrumbSchema.tsx'    // → Adapter pour Next.js
'components/seo/LocalBusinessSchema.tsx' // → Adapter pour Next.js
'components/seo/ReviewSchema.tsx'        // → Adapter pour Next.js
'components/seo/FAQSchema.tsx'           // → Adapter pour Next.js

// Multilingue (obligatoires)
'multilingual-system/components/HrefLang/HreflangLinks.tsx'
'multilingual-system/components/HrefLang/HrefLangConstants.ts'
'multilingual-system/core/routing/localeRoutes.ts'

// UI Communs (selon besoins)
'components/ui/Button.tsx'
'components/ui/Card.tsx'
'components/ui/Badge.tsx'
'components/ui/Avatar.tsx'
'components/ui/Spinner.tsx'
'components/ui/Modal.tsx'

// Common
'components/common/StarRating.tsx'
'components/common/LanguageDropdown.tsx'
'components/common/CountryFlag.tsx'
```

### 5.2 Hooks et Utilitaires

```typescript
// Hooks a adapter
'hooks/useLocale.ts'          // → Adapter pour next-intl
'hooks/useTranslation.ts'     // → Remplacer par next-intl

// Utils a copier
'utils/slugGenerator.ts'      // → Copier tel quel
'utils/localeFormatters.ts'   // → Copier tel quel
'utils/dateHelpers.ts'        // → Copier tel quel
```

### 5.3 Types et Interfaces

```typescript
// Types a partager (creer package commun ou copier)
'types/provider.ts'
'types/review.ts'
'types/faq.ts'
'types/helpArticle.ts'
'types/locale.ts'
```

---

## 6. FIREBASE ET DONNEES

### 6.1 Collections Firestore (Pages Publiques)

| Collection | Usage | Mode Fetch | Revalidation |
|------------|-------|------------|--------------|
| `providers` | Liste/profils prestataires | Admin SDK (SSG) | 4-6h ISR |
| `sos_profiles` | Profils etendus | Admin SDK (SSG) | 4-6h ISR |
| `reviews` | Avis/temoignages | Admin SDK (SSG) | 12h ISR |
| `faqs` | Questions frequentes | Admin SDK (SSG) | 24h ISR |
| `help_articles` | Articles aide | Admin SDK (SSG) | 24h ISR |
| `help_categories` | Categories aide | Admin SDK (SSG) | 7j ISR |
| `admin_config/pricing` | Config tarifs | Admin SDK (SSG) | 1h ISR |
| `legal_documents` | Documents legaux | Admin SDK (SSG) | On-demand |

### 6.2 Firebase Admin SDK (Server-Side)

```typescript
// lib/firebase/admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

export const adminApp = getApps().length === 0
  ? initializeApp(firebaseAdminConfig)
  : getApps()[0];

export const adminDb = getFirestore(adminApp);
```

### 6.3 Queries pour SSG/ISR

```typescript
// lib/firebase/queries.ts
import { adminDb } from './admin';

// Providers
export async function getProviders(options?: {
  type?: 'lawyer' | 'expat';
  country?: string;
  limit?: number;
}) {
  let query = adminDb.collection('providers')
    .where('isVisible', '==', true)
    .where('isApproved', '==', true);

  if (options?.type) {
    query = query.where('type', '==', options.type);
  }
  if (options?.country) {
    query = query.where('country', '==', options.country);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// FAQs
export async function getFAQs(options?: {
  category?: string;
  locale?: string;
}) {
  let query = adminDb.collection('faqs')
    .where('isActive', '==', true)
    .orderBy('order', 'asc');

  if (options?.category) {
    query = query.where('category', '==', options.category);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Reviews/Testimonials
export async function getReviews(options?: {
  verified?: boolean;
  limit?: number;
}) {
  let query = adminDb.collection('reviews')
    .where('status', '==', 'published')
    .where('isPublic', '==', true)
    .orderBy('createdAt', 'desc');

  if (options?.verified) {
    query = query.where('verified', '==', true);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Help Articles
export async function getHelpArticles(options?: {
  categoryId?: string;
  locale?: string;
}) {
  let query = adminDb.collection('help_articles')
    .where('isPublished', '==', true)
    .orderBy('order', 'asc');

  if (options?.categoryId) {
    query = query.where('categoryId', '==', options.categoryId);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Pricing Config
export async function getPricingConfig() {
  const doc = await adminDb.doc('admin_config/pricing').get();
  return doc.exists ? doc.data() : null;
}
```

### 6.4 Variables d'Environnement

```bash
# .env.local (sos-expat-public)

# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=sos-expat-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@sos-expat-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Client SDK (Client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sos-expat-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sos-expat-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sos-expat-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Site Config
NEXT_PUBLIC_SITE_URL=https://sos-expat.com
NEXT_PUBLIC_DEFAULT_LOCALE=fr-fr

# ISR Secret (pour webhook revalidation)
REVALIDATION_SECRET=your-secret-token-here
```

---

## 7. SEO ET REFERENCEMENT IA

### 7.1 Configuration Metadata Next.js

```typescript
// lib/seo/metadata.ts
import type { Metadata } from 'next';

interface SEOConfig {
  title: string;
  description: string;
  locale: string;
  slug?: string;
  ogImage?: string;
  noindex?: boolean;
  alternates?: Record<string, string>;
  // AI-specific
  aiSummary?: string;
  expertise?: 'beginner' | 'intermediate' | 'expert';
  contentQuality?: 'high' | 'medium' | 'low';
  trustworthiness?: 'high' | 'medium' | 'low';
  citations?: string[];
}

export function generateMetadata(config: SEOConfig): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sos-expat.com';
  const [lang, country] = config.locale.split('-');
  const canonical = `${baseUrl}/${config.locale}${config.slug ? `/${config.slug}` : ''}`;

  return {
    title: config.title,
    description: config.description.substring(0, 160),

    // Robots
    robots: config.noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',

    // Canonical & Alternates
    alternates: {
      canonical,
      languages: {
        ...config.alternates,
        'x-default': `${baseUrl}/en-us${config.slug ? `/${config.slug}` : ''}`,
      },
    },

    // Open Graph
    openGraph: {
      title: config.title,
      description: config.description,
      url: canonical,
      siteName: 'SOS Expat',
      locale: lang === 'ch' ? 'zh_CN' : `${lang}_${country.toUpperCase()}`,
      type: 'website',
      images: [{
        url: config.ogImage || `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: config.title,
      }],
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
      images: [config.ogImage || `${baseUrl}/og-image.png`],
    },

    // AI-Specific Metadata
    other: {
      'ai-crawlable': 'true',
      'ai-summary': config.aiSummary || config.description,
      'expertise-level': config.expertise || 'expert',
      'content-quality': config.contentQuality || 'high',
      'trustworthiness': config.trustworthiness || 'high',
      'citations': config.citations?.join('; ') || '',
      'last-reviewed': new Date().toISOString().split('T')[0],
    },
  };
}
```

### 7.2 Hreflang Links

```typescript
// lib/seo/hreflang.ts
import { ROUTE_TRANSLATIONS } from '@/lib/i18n/routing';

const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'];
const LANGUAGE_TO_COUNTRY = {
  fr: 'fr', en: 'us', es: 'es', de: 'de',
  ru: 'ru', pt: 'pt', ch: 'cn', hi: 'in', ar: 'sa'
};

// Mapping special pour SEO (ch → zh-Hans)
const HREFLANG_CODES: Record<string, string> = {
  fr: 'fr', en: 'en', es: 'es', de: 'de',
  ru: 'ru', pt: 'pt', ch: 'zh-Hans', hi: 'hi', ar: 'ar'
};

export function generateHreflangLinks(
  currentLocale: string,
  routeKey: string,
  preserveCountry: boolean = true
): Record<string, string> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sos-expat.com';
  const [currentLang, currentCountry] = currentLocale.split('-');

  const links: Record<string, string> = {};

  for (const lang of SUPPORTED_LANGUAGES) {
    const hreflangCode = HREFLANG_CODES[lang];
    const country = preserveCountry ? currentCountry : LANGUAGE_TO_COUNTRY[lang];
    const translatedSlug = ROUTE_TRANSLATIONS[routeKey]?.[lang] || routeKey;

    links[hreflangCode] = `${baseUrl}/${lang}-${country}/${translatedSlug}`;
  }

  // x-default (English US)
  const defaultSlug = ROUTE_TRANSLATIONS[routeKey]?.['en'] || routeKey;
  links['x-default'] = `${baseUrl}/en-us/${defaultSlug}`;

  return links;
}
```

### 7.3 JSON-LD Schemas

```typescript
// lib/seo/schemas.ts

// Organization Schema (global)
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SOS Expat',
    url: 'https://sos-expat.com',
    logo: 'https://sos-expat.com/sos-logo.webp',
    description: 'Plateforme de mise en relation entre expatries et professionnels juridiques',
    foundingDate: '2024',
    founders: [{ '@type': 'Person', name: 'SOS Expat Team' }],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'EE',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['French', 'English', 'Spanish', 'German', 'Russian', 'Portuguese', 'Chinese', 'Hindi', 'Arabic'],
    },
    sameAs: [
      'https://linkedin.com/company/sos-expat',
      'https://twitter.com/sosexpat',
    ],
  };
}

// LocalBusiness Schema (pour SEO local)
export function generateLocalBusinessSchema(country: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'SOS Expat',
    description: 'Legal assistance for expatriates',
    url: 'https://sos-expat.com',
    priceRange: '€€',
    areaServed: {
      '@type': 'Country',
      name: country,
    },
  };
}

// FAQ Schema
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// Review/Rating Schema
export function generateReviewSchema(reviews: Array<{
  author: string;
  rating: number;
  content: string;
  date: string;
}>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'SOS Expat Legal Services',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.map(review => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.author },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.content,
      datePublished: review.date,
    })),
  };
}

// Breadcrumb Schema
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Provider/Person Schema
export function generateProviderSchema(provider: {
  name: string;
  type: string;
  country: string;
  languages: string[];
  rating: number;
  reviewCount: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: provider.name,
    jobTitle: provider.type === 'lawyer' ? 'Attorney' : 'Expatriate Advisor',
    worksFor: { '@type': 'Organization', name: 'SOS Expat' },
    knowsLanguage: provider.languages,
    nationality: { '@type': 'Country', name: provider.country },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: provider.rating,
      reviewCount: provider.reviewCount,
    },
  };
}
```

### 7.4 Robots.txt Dynamique

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sos-expat.com';

  return {
    rules: [
      // Bots principaux (pas de delai)
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },

      // Bots standards (delai 1s)
      {
        userAgent: ['Bingbot', 'DuckDuckBot'],
        allow: '/',
        disallow: ['/api/', '/_next/'],
        crawlDelay: 1,
      },

      // Bots IA (autorises avec delai)
      {
        userAgent: [
          'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',  // OpenAI
          'ClaudeBot', 'Claude-Web', 'anthropic-ai',   // Anthropic
          'PerplexityBot',                             // Perplexity
          'Google-Extended',                           // Google AI
          'cohere-ai',                                 // Cohere
          'CCBot',                                     // Common Crawl
        ],
        allow: '/',
        disallow: ['/api/', '/_next/'],
        crawlDelay: 2,
      },

      // Bots bloques (scrapers agressifs)
      {
        userAgent: [
          'AhrefsBot', 'SemrushBot', 'DotBot', 'MJ12bot',
          'BLEXBot', 'DataForSeoBot', 'Bytespider', 'PetalBot',
        ],
        disallow: '/',
      },

      // Default
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/dashboard/', '/admin/', '/checkout/'],
        crawlDelay: 1,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
```

### 7.5 Sitemap Dynamique

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { getProviders, getFAQs, getHelpArticles, getReviews } from '@/lib/firebase/queries';
import { ROUTE_TRANSLATIONS } from '@/lib/i18n/routing';

const SUPPORTED_LOCALES = [
  'fr-fr', 'en-us', 'es-es', 'de-de', 'ru-ru',
  'pt-pt', 'ch-cn', 'hi-in', 'ar-sa'
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sos-expat.com';
  const sitemap: MetadataRoute.Sitemap = [];

  // 1. Pages statiques
  const staticPages = [
    { route: '', priority: 1.0, changeFreq: 'daily' as const },
    { route: 'pricing', priority: 0.9, changeFreq: 'weekly' as const },
    { route: 'how-it-works', priority: 0.8, changeFreq: 'monthly' as const },
    { route: 'contact', priority: 0.7, changeFreq: 'monthly' as const },
    { route: 'faq', priority: 0.8, changeFreq: 'weekly' as const },
    { route: 'testimonials', priority: 0.8, changeFreq: 'weekly' as const },
    { route: 'providers', priority: 0.9, changeFreq: 'daily' as const },
    { route: 'help-center', priority: 0.7, changeFreq: 'weekly' as const },
    { route: 'privacy-policy', priority: 0.3, changeFreq: 'yearly' as const },
    { route: 'terms', priority: 0.3, changeFreq: 'yearly' as const },
    { route: 'cookies', priority: 0.3, changeFreq: 'yearly' as const },
  ];

  // Generer URLs pour toutes les locales
  for (const page of staticPages) {
    for (const locale of SUPPORTED_LOCALES) {
      const [lang] = locale.split('-');
      const translatedRoute = page.route ? ROUTE_TRANSLATIONS[page.route]?.[lang] || page.route : '';

      sitemap.push({
        url: `${baseUrl}/${locale}${translatedRoute ? `/${translatedRoute}` : ''}`,
        lastModified: new Date(),
        changeFrequency: page.changeFreq,
        priority: page.priority,
      });
    }
  }

  // 2. Providers (dynamique)
  const providers = await getProviders();
  for (const provider of providers) {
    for (const locale of SUPPORTED_LOCALES) {
      const [lang] = locale.split('-');
      const providerSlug = ROUTE_TRANSLATIONS['providers']?.[lang] || 'providers';

      sitemap.push({
        url: `${baseUrl}/${locale}/${providerSlug}/${provider.slug || provider.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  // 3. FAQs (dynamique)
  const faqs = await getFAQs();
  for (const faq of faqs) {
    for (const locale of SUPPORTED_LOCALES) {
      const [lang] = locale.split('-');
      const faqSlug = ROUTE_TRANSLATIONS['faq']?.[lang] || 'faq';
      const slug = faq.slug?.[lang] || faq.id;

      sitemap.push({
        url: `${baseUrl}/${locale}/${faqSlug}/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }

  // 4. Help Articles (dynamique)
  const articles = await getHelpArticles();
  for (const article of articles) {
    for (const locale of SUPPORTED_LOCALES) {
      const [lang] = locale.split('-');
      const helpSlug = ROUTE_TRANSLATIONS['help-center']?.[lang] || 'help-center';
      const slug = typeof article.slug === 'string' ? article.slug : article.slug?.[lang] || article.id;

      sitemap.push({
        url: `${baseUrl}/${locale}/${helpSlug}/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  }

  return sitemap;
}
```

### 7.6 Fichier llms.txt (Pour IA Crawlers)

```
# llms.txt - SOS Expat Platform Information for AI Crawlers

## Platform Overview
Name: SOS Expat
Type: Legal Tech Platform
Purpose: Connect expatriates with lawyers and local experts worldwide
Languages: French, English, Spanish, German, Russian, Portuguese, Chinese, Hindi, Arabic
Countries Served: 196 countries worldwide

## Core Services
1. Urgent Legal Consultation (SOS Call) - Connect with a lawyer in under 5 minutes
2. Expat Guidance Call - Advice from experienced expatriates
3. Provider Directory - Find verified lawyers and experts by country/specialty

## Provider Types
- Lawyers (Avocats)
- Expatriate Advisors (Expatries)
- Accountants
- Notaries
- Tax Consultants
- Real Estate Agents
- Translators
- HR Consultants
- Financial Advisors
- Insurance Brokers

## Pricing Model
- Lawyer Call: 49 EUR / 55 USD (20 minutes)
- Expat Call: 19 EUR / 25 USD (30 minutes)
- No subscription required
- Pay per consultation

## Key Differentiators
- Multilingual platform (9 languages)
- Global coverage (196 countries)
- Verified professionals only
- Average connection time: < 5 minutes
- 24/7 availability

## Trust Signals
- E-A-T compliant (Expertise, Authoritativeness, Trustworthiness)
- Verified provider profiles
- Real user reviews
- Secure payment processing (Stripe, PayPal)
- GDPR compliant

## Contact
Website: https://sos-expat.com
Support: Available in all supported languages

## Crawling Guidelines
- Public pages are AI-crawlable
- Protected pages (dashboard, admin) are not indexed
- Content is regularly updated
- ISR (Incremental Static Regeneration) ensures fresh content
```

---

## 8. ROUTING ET REDIRECTIONS

### 8.1 Middleware Next.js

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'];
const DEFAULT_LOCALE = 'fr-fr';

// Routes qui restent dans la SPA React
const SPA_ROUTES = [
  '/dashboard',
  '/admin',
  '/login',
  '/register',
  '/password-reset',
  '/checkout',
  '/call-checkout',
  '/booking-request',
  '/payment-success',
  '/profile',
  '/sos-appel',
  '/appel-expatrie',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignorer les assets statiques
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // fichiers statiques
  ) {
    return NextResponse.next();
  }

  // 2. Rediriger vers SPA pour routes protegees
  for (const route of SPA_ROUTES) {
    if (pathname.startsWith(route) || pathname.match(new RegExp(`^/[a-z]{2}-[a-z]{2}${route}`))) {
      // Rediriger vers la SPA React
      const spaUrl = process.env.NEXT_PUBLIC_SPA_URL || 'https://app.sos-expat.com';
      return NextResponse.redirect(new URL(pathname, spaUrl));
    }
  }

  // 3. Verifier si locale presente dans URL
  const localeMatch = pathname.match(/^\/([a-z]{2})-([a-z]{2})(\/.*)?$/);

  if (!localeMatch) {
    // Detecter locale et rediriger
    const detectedLocale = detectLocale(request);
    const newUrl = new URL(`/${detectedLocale}${pathname}`, request.url);
    return NextResponse.redirect(newUrl);
  }

  const [, lang, country] = localeMatch;

  // 4. Valider langue
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    const newUrl = new URL(`/${DEFAULT_LOCALE}${pathname.slice(6)}`, request.url);
    return NextResponse.redirect(newUrl);
  }

  // 5. Ajouter headers pour le rendu
  const response = NextResponse.next();
  response.headers.set('x-locale', `${lang}-${country}`);
  response.headers.set('x-language', lang);
  response.headers.set('x-country', country);

  return response;
}

function detectLocale(request: NextRequest): string {
  // 1. Cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Accept-Language header
  const acceptLang = request.headers.get('accept-language');
  if (acceptLang) {
    const lang = acceptLang.split(',')[0].split('-')[0].toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      return `${lang}-${getDefaultCountry(lang)}`;
    }
  }

  // 3. Geolocation
  const country = request.geo?.country?.toLowerCase();
  if (country) {
    const lang = getLanguageForCountry(country);
    return `${lang}-${country}`;
  }

  return DEFAULT_LOCALE;
}

function isValidLocale(locale: string): boolean {
  const [lang, country] = locale.split('-');
  return SUPPORTED_LANGUAGES.includes(lang) && country?.length === 2;
}

function getDefaultCountry(lang: string): string {
  const map: Record<string, string> = {
    fr: 'fr', en: 'us', es: 'es', de: 'de',
    ru: 'ru', pt: 'pt', ch: 'cn', hi: 'in', ar: 'sa'
  };
  return map[lang] || 'fr';
}

function getLanguageForCountry(country: string): string {
  // Mapping simplifie (voir section 3.6 pour le mapping complet)
  const francophone = ['fr', 'be', 'ca', 'ch', 'lu', 'mc', 'sn', 'ci'];
  const anglophone = ['us', 'gb', 'au', 'nz', 'ie', 'za'];
  const hispanophone = ['es', 'mx', 'ar', 'co', 'cl', 'pe'];

  if (francophone.includes(country)) return 'fr';
  if (anglophone.includes(country)) return 'en';
  if (hispanophone.includes(country)) return 'es';
  // ... autres mappings

  return 'en'; // Default
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'
  ],
};
```

### 8.2 Redirections SPA → Next.js

Dans la SPA React existante, ajouter des redirections vers Next.js pour les pages publiques:

```typescript
// sos/src/utils/navigation.ts
const NEXTJS_ROUTES = [
  '/', '/tarifs', '/pricing', '/comment-ca-marche', '/how-it-works',
  '/contact', '/faq', '/temoignages', '/testimonials',
  '/prestataires', '/providers', '/centre-aide', '/help-center',
  '/mentions-legales', '/terms', '/politique-confidentialite', '/privacy-policy',
  '/cookies', '/consommateurs', '/consumers',
];

export function shouldRedirectToNextJS(path: string): boolean {
  const locale = extractLocale(path);
  const pathWithoutLocale = path.replace(/^\/[a-z]{2}-[a-z]{2}/, '');

  return NEXTJS_ROUTES.some(route =>
    pathWithoutLocale === route || pathWithoutLocale.startsWith(route + '/')
  );
}

// Dans le Router principal (App.tsx)
if (shouldRedirectToNextJS(window.location.pathname)) {
  window.location.href = `https://sos-expat.com${window.location.pathname}`;
}
```

### 8.3 Webhook ISR Revalidation

```typescript
// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidation-secret');

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, id, locale } = body;

    switch (type) {
      case 'provider':
        revalidateTag('providers');
        if (id) revalidatePath(`/${locale}/prestataires/${id}`);
        break;

      case 'faq':
        revalidateTag('faqs');
        if (id) revalidatePath(`/${locale}/faq/${id}`);
        break;

      case 'testimonial':
        revalidateTag('reviews');
        revalidatePath(`/${locale}/temoignages`);
        break;

      case 'article':
        revalidateTag('articles');
        if (id) revalidatePath(`/${locale}/centre-aide/${id}`);
        break;

      case 'pricing':
        revalidateTag('pricing');
        revalidatePath(`/${locale}/tarifs`);
        break;

      case 'all':
        revalidateTag('providers');
        revalidateTag('faqs');
        revalidateTag('reviews');
        revalidateTag('articles');
        revalidateTag('pricing');
        break;

      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }

    return NextResponse.json({
      revalidated: true,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}
```

---

## 9. PERFORMANCE ET CORE WEB VITALS

### 9.1 Configuration Next.js Optimisee

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Compression
  compress: true,

  // Images optimisees
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
  },

  // Optimisations experimentales
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'lodash-es',
      '@heroicons/react',
    ],
  },

  // Headers de cache
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Code splitting ameliore
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'vendor-react',
            chunks: 'all',
            priority: 20,
          },
          firebase: {
            test: /[\\/]node_modules[\\/]firebase[\\/]/,
            name: 'vendor-firebase',
            chunks: 'all',
            priority: 15,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
```

### 9.2 Chargement des Fonts

```typescript
// app/layout.tsx
import localFont from 'next/font/local';

const inter = localFont({
  src: '../public/fonts/inter-var.woff2',
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

### 9.3 Preconnect et Preload

```typescript
// app/[locale]/layout.tsx
export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <>
      {/* Preconnect to critical origins */}
      <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://www.gstatic.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />

      {/* Main content */}
      <Header locale={params.locale} />
      <main>{children}</main>
      <Footer locale={params.locale} />
    </>
  );
}
```

### 9.4 Metriques Core Web Vitals

| Metrique | Cible | Mesure |
|----------|-------|--------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Contenu principal visible |
| **FID** (First Input Delay) | < 100ms | Premiere interaction |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Stabilite visuelle |
| **INP** (Interaction to Next Paint) | < 200ms | Reactivite |
| **TTFB** (Time to First Byte) | < 200ms | Reponse serveur |

---

## 10. CONFIGURATION DIGITALOCEAN

### 10.1 Structure App Platform

```yaml
# .do/app.yaml
name: sos-expat
region: fra  # Frankfurt (Europe)

# Domaines
domains:
  - domain: sos-expat.com
    type: PRIMARY
    zone: sos-expat.com
  - domain: www.sos-expat.com
    type: ALIAS

# Services
services:
  # Service 1: Next.js (Pages publiques)
  - name: public
    github:
      repo: your-username/sos-expat-project
      branch: main
      deploy_on_push: true
    source_dir: sos-expat-public
    build_command: npm ci && npm run build
    run_command: npm start
    environment_slug: node-js
    instance_size_slug: professional-xs
    instance_count: 1
    http_port: 3000
    health_check:
      http_path: /api/health
      initial_delay_seconds: 10
      period_seconds: 10
    envs:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_SITE_URL
        value: https://sos-expat.com
      - key: FIREBASE_PROJECT_ID
        type: SECRET
        value: ${FIREBASE_PROJECT_ID}
      - key: FIREBASE_CLIENT_EMAIL
        type: SECRET
        value: ${FIREBASE_CLIENT_EMAIL}
      - key: FIREBASE_PRIVATE_KEY
        type: SECRET
        value: ${FIREBASE_PRIVATE_KEY}
      - key: REVALIDATION_SECRET
        type: SECRET
        value: ${REVALIDATION_SECRET}
    routes:
      - path: /
        preserve_path_prefix: false

# Static Sites (SPA React - Dashboard/Admin)
static_sites:
  - name: app
    github:
      repo: your-username/sos-expat-project
      branch: main
      deploy_on_push: true
    source_dir: sos
    build_command: npm ci && npm run build
    output_dir: dist
    environment_slug: node-js
    envs:
      - key: VITE_FIREBASE_API_KEY
        type: SECRET
        value: ${FIREBASE_API_KEY}
      - key: VITE_FIREBASE_AUTH_DOMAIN
        value: ${FIREBASE_AUTH_DOMAIN}
      - key: VITE_FIREBASE_PROJECT_ID
        value: ${FIREBASE_PROJECT_ID}
    routes:
      - path: /dashboard
        preserve_path_prefix: true
      - path: /admin
        preserve_path_prefix: true
      - path: /login
        preserve_path_prefix: true
      - path: /register
        preserve_path_prefix: true
      - path: /checkout
        preserve_path_prefix: true
```

### 10.2 Variables d'Environnement DigitalOcean

```bash
# A configurer dans DigitalOcean App Platform > Settings > App-Level Environment Variables

# Firebase Admin
FIREBASE_PROJECT_ID=sos-expat-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@sos-expat-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

# Firebase Client (pour SPA)
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=sos-expat-xxxxx.firebaseapp.com
FIREBASE_STORAGE_BUCKET=sos-expat-xxxxx.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123

# ISR Webhook
REVALIDATION_SECRET=generate-a-secure-random-string

# Autres
NEXT_PUBLIC_SITE_URL=https://sos-expat.com
NEXT_PUBLIC_SPA_URL=https://sos-expat.com
```

---

## 11. PLAN D'ACTION PAS A PAS

### Phase 1: Setup Initial (Jour 1-2)

#### Etape 1.1: Creer le projet Next.js
```bash
# Dans le repertoire sos-expat-project/
npx create-next-app@latest sos-expat-public --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"

cd sos-expat-public
```

#### Etape 1.2: Installer les dependances
```bash
npm install firebase firebase-admin next-intl
npm install -D @types/node
```

#### Etape 1.3: Configurer TypeScript
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### Etape 1.4: Configurer Tailwind
```javascript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

#### Etape 1.5: Copier les fichiers statiques
```bash
# Copier les fonts
cp -r ../sos/public/fonts ./public/

# Copier les images
cp -r ../sos/public/images ./public/

# Copier les icones
cp -r ../sos/public/icons ./public/

# Copier le logo
cp ../sos/public/sos-logo.webp ./public/

# Copier llms.txt
cp ../sos/public/llms.txt ./public/
```

---

### Phase 2: Configuration Firebase (Jour 2-3)

#### Etape 2.1: Creer lib/firebase/admin.ts
```typescript
// lib/firebase/admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminDb: Firestore;

function getAdminApp(): App {
  if (!adminApp && getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return adminApp || getApps()[0];
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
  }
  return adminDb;
}
```

#### Etape 2.2: Creer lib/firebase/queries.ts
(Voir section 6.3 pour le code complet)

#### Etape 2.3: Creer .env.local
```bash
# Creer .env.local avec les variables d'environnement
# (Voir section 6.4)
```

---

### Phase 3: Systeme Multilingue (Jour 3-4)

#### Etape 3.1: Creer lib/i18n/config.ts
```typescript
// lib/i18n/config.ts
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'es', 'de', 'ru', 'pt', 'ch', 'hi', 'ar'] as const;
export const DEFAULT_LANGUAGE = 'fr';
export const DEFAULT_LOCALE = 'fr-fr';

export type Language = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_TO_COUNTRY: Record<Language, string> = {
  fr: 'fr',
  en: 'us',
  es: 'es',
  de: 'de',
  ru: 'ru',
  pt: 'pt',
  ch: 'cn',
  hi: 'in',
  ar: 'sa',
};
```

#### Etape 3.2: Creer lib/i18n/routing.ts
(Voir section 3.7 pour ROUTE_TRANSLATIONS complet)

#### Etape 3.3: Creer middleware.ts
(Voir section 8.1 pour le code complet)

#### Etape 3.4: Copier les fichiers de traduction
```bash
# Creer le dossier messages
mkdir messages

# Copier les fichiers de traduction depuis la SPA
cp ../sos/src/i18n/messages/fr.json ./messages/
cp ../sos/src/i18n/messages/en.json ./messages/
cp ../sos/src/i18n/messages/es.json ./messages/
cp ../sos/src/i18n/messages/de.json ./messages/
cp ../sos/src/i18n/messages/ru.json ./messages/
cp ../sos/src/i18n/messages/pt.json ./messages/
cp ../sos/src/i18n/messages/ch.json ./messages/
cp ../sos/src/i18n/messages/hi.json ./messages/
cp ../sos/src/i18n/messages/ar.json ./messages/
```

---

### Phase 4: Composants de Base (Jour 4-6)

#### Etape 4.1: Creer app/[locale]/layout.tsx
```typescript
// app/[locale]/layout.tsx
import { notFound } from 'next/navigation';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import localFont from 'next/font/local';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n/config';
import './globals.css';

const inter = localFont({
  src: '../../public/fonts/inter-var.woff2',
  display: 'swap',
  variable: '--font-inter',
});

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.flatMap(lang =>
    ['fr', 'us', 'es', 'de', 'ru', 'pt', 'cn', 'in', 'sa'].map(country => ({
      locale: `${lang}-${country}`,
    }))
  );
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const [lang] = params.locale.split('-');

  if (!SUPPORTED_LANGUAGES.includes(lang as any)) {
    notFound();
  }

  const messages = await getMessages({ locale: lang });

  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className={inter.variable}>
      <body className="min-h-screen bg-white font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <Header locale={params.locale} />
          <main className="flex-1">
            {children}
          </main>
          <Footer locale={params.locale} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

#### Etape 4.2: Creer components/layout/Header.tsx
(Adapter depuis sos/src/components/layout/Header.tsx - version simplifiee sans elements dashboard)

#### Etape 4.3: Creer components/layout/Footer.tsx
(Copier et adapter depuis sos/src/components/layout/Footer.tsx)

#### Etape 4.4: Creer components/layout/LanguageSwitcher.tsx
```typescript
// components/layout/LanguageSwitcher.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { SUPPORTED_LANGUAGES, LANGUAGE_TO_COUNTRY } from '@/lib/i18n/config';

export default function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentLang, currentCountry] = currentLocale.split('-');

  const handleLanguageChange = (newLang: string) => {
    const newCountry = currentCountry; // Preserver le pays
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}-[a-z]{2}/, '');
    const newPath = `/${newLang}-${newCountry}${pathWithoutLocale}`;
    router.push(newPath);
  };

  return (
    <select
      value={currentLang}
      onChange={(e) => handleLanguageChange(e.target.value)}
      className="rounded border px-2 py-1"
    >
      {SUPPORTED_LANGUAGES.map(lang => (
        <option key={lang} value={lang}>
          {lang.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
```

---

### Phase 5: Pages Statiques (Jour 6-8)

#### Etape 5.1: Page Home
```typescript
// app/[locale]/page.tsx
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { generateMetadata as genMeta } from '@/lib/seo/metadata';
import { getProviders, getReviews, getPricingConfig } from '@/lib/firebase/queries';
import HeroSection from '@/components/home/HeroSection';
import ProvidersSection from '@/components/home/ProvidersSection';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import PricingSection from '@/components/home/PricingSection';

interface Props {
  params: { locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale.split('-')[0], namespace: 'home' });

  return genMeta({
    title: t('meta.title'),
    description: t('meta.description'),
    locale: params.locale,
    aiSummary: 'Legal consultation platform connecting expatriates with lawyers and experts worldwide',
    expertise: 'expert',
    contentQuality: 'high',
  });
}

export const revalidate = 21600; // 6 heures

export default async function HomePage({ params }: Props) {
  const [providers, reviews, pricing] = await Promise.all([
    getProviders({ limit: 6 }),
    getReviews({ verified: true, limit: 5 }),
    getPricingConfig(),
  ]);

  return (
    <>
      <HeroSection locale={params.locale} />
      <ProvidersSection providers={providers} locale={params.locale} />
      <TestimonialsSection reviews={reviews} locale={params.locale} />
      <PricingSection pricing={pricing} locale={params.locale} />
    </>
  );
}
```

#### Etape 5.2: Page Pricing
```typescript
// app/[locale]/(static)/tarifs/page.tsx
// (Structure similaire avec SSG + ISR 1h)
```

#### Etape 5.3: Page Contact
```typescript
// app/[locale]/(static)/contact/page.tsx
// (SSR pour formulaire)
```

#### Etape 5.4: Pages Legales
```typescript
// app/[locale]/(static)/mentions-legales/page.tsx
// app/[locale]/(static)/politique-confidentialite/page.tsx
// app/[locale]/(static)/cookies/page.tsx
// (SSG pur)
```

---

### Phase 6: Pages Dynamiques (Jour 8-12)

#### Etape 6.1: FAQ avec ISR
```typescript
// app/[locale]/(dynamic)/faq/page.tsx
import { getFAQs } from '@/lib/firebase/queries';
import { generateFAQSchema } from '@/lib/seo/schemas';

export const revalidate = 86400; // 24h

export default async function FAQPage({ params }: Props) {
  const faqs = await getFAQs();
  const [lang] = params.locale.split('-');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateFAQSchema(
            faqs.map(faq => ({
              question: faq.question[lang] || faq.question['fr'],
              answer: faq.answer[lang] || faq.answer['fr'],
            }))
          )),
        }}
      />
      <FAQList faqs={faqs} locale={params.locale} />
    </>
  );
}
```

#### Etape 6.2: FAQ Detail
```typescript
// app/[locale]/(dynamic)/faq/[slug]/page.tsx
export async function generateStaticParams() {
  const faqs = await getFAQs();
  const locales = ['fr-fr', 'en-us', 'es-es', 'de-de', 'ru-ru', 'pt-pt', 'ch-cn', 'hi-in', 'ar-sa'];

  return faqs.flatMap(faq =>
    locales.map(locale => ({
      locale,
      slug: faq.slug?.[locale.split('-')[0]] || faq.id,
    }))
  );
}

export const revalidate = 86400; // 24h
```

#### Etape 6.3: Providers List & Profile
```typescript
// app/[locale]/(dynamic)/prestataires/page.tsx
// app/[locale]/(dynamic)/prestataires/[slug]/page.tsx
// (ISR 4-6h)
```

#### Etape 6.4: Testimonials
```typescript
// app/[locale]/(dynamic)/temoignages/page.tsx
// app/[locale]/(dynamic)/temoignages/[...params]/page.tsx
// (ISR 12-24h)
```

---

### Phase 7: SEO Final (Jour 12-14)

#### Etape 7.1: Implementer robots.ts
(Voir section 7.4)

#### Etape 7.2: Implementer sitemap.ts
(Voir section 7.5)

#### Etape 7.3: Ajouter JSON-LD sur toutes les pages
(Voir section 7.3)

#### Etape 7.4: Verifier Hreflang
```bash
# Tester avec:
curl -I https://localhost:3000/fr-fr/tarifs | grep -i "link"
```

---

### Phase 8: Deploiement (Jour 14-15)

#### Etape 8.1: Creer .do/app.yaml
(Voir section 10.1)

#### Etape 8.2: Configurer les secrets DigitalOcean
```bash
# Via DigitalOcean CLI ou Dashboard
doctl apps create --spec .do/app.yaml
```

#### Etape 8.3: Tester le deploiement
```bash
# Verifier les endpoints
curl https://sos-expat.com/api/health
curl https://sos-expat.com/fr-fr/
curl https://sos-expat.com/en-us/pricing
```

#### Etape 8.4: Configurer les webhooks ISR
```bash
# Dans Firebase Cloud Functions, appeler:
POST https://sos-expat.com/api/revalidate
Headers: x-revalidation-secret: YOUR_SECRET
Body: { "type": "provider", "id": "xxx", "locale": "fr-fr" }
```

---

## 12. CHECKLIST DE VALIDATION

### Pre-Migration

- [ ] Backup complet de la SPA existante
- [ ] Export des donnees Firebase
- [ ] Documentation des URLs actuelles
- [ ] Liste des redirections necessaires

### Configuration

- [ ] Variables d'environnement definies
- [ ] Firebase Admin SDK configure
- [ ] Middleware i18n fonctionnel
- [ ] Tailwind CSS configure

### Pages

- [ ] Home page fonctionnelle (toutes locales)
- [ ] Pricing page avec donnees dynamiques
- [ ] FAQ list + detail pages
- [ ] Providers list + profile pages
- [ ] Testimonials pages
- [ ] Help center pages
- [ ] Pages legales
- [ ] Page 404 personnalisee

### SEO

- [ ] Metadata correcte sur toutes les pages
- [ ] Hreflang links valides
- [ ] Sitemap.xml genere
- [ ] Robots.txt correct
- [ ] JSON-LD schemas valides
- [ ] AI-specific meta tags presents
- [ ] llms.txt accessible

### Performance

- [ ] Lighthouse score > 90
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] TTFB < 200ms
- [ ] Images optimisees (WebP/AVIF)
- [ ] Fonts preloaded

### Fonctionnel

- [ ] Language switcher fonctionne
- [ ] Navigation vers SPA (dashboard) fonctionne
- [ ] Formulaire contact envoie les emails
- [ ] ISR revalidation fonctionne
- [ ] Webhook API repond

### Deploiement

- [ ] Build reussit sans erreur
- [ ] Deploy sur DigitalOcean OK
- [ ] DNS configure
- [ ] HTTPS actif
- [ ] Health check passe

### Post-Migration

- [ ] Google Search Console verifie
- [ ] Bing Webmaster Tools verifie
- [ ] Redirections 301 en place (si necessaire)
- [ ] Monitoring configure
- [ ] Alertes definies

---

## ANNEXES

### A. Commandes Utiles

```bash
# Developpement
npm run dev

# Build
npm run build

# Analyser le bundle
npm run build && npx @next/bundle-analyzer

# Verifier les types
npm run type-check

# Linter
npm run lint

# Test local de production
npm run build && npm start
```

### B. Structure des Commits Git

```bash
# Feature
git commit -m "feat(nextjs): add pricing page with ISR"

# Fix
git commit -m "fix(seo): correct hreflang for Chinese locale"

# Docs
git commit -m "docs: update migration plan"

# Chore
git commit -m "chore: update dependencies"
```

### C. Contacts et Support

- Documentation Next.js: https://nextjs.org/docs
- Documentation Firebase Admin: https://firebase.google.com/docs/admin/setup
- DigitalOcean App Platform: https://docs.digitalocean.com/products/app-platform/

---

**FIN DU DOCUMENT**

*Ce document a ete genere automatiquement par Claude Code avec l'aide de 30 agents IA specialises.*
*Derniere mise a jour: 2026-01-05*
