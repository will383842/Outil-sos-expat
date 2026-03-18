# AUDIT SEO COMPLET — sos-expat.com — Objectif : 0 Erreur GSC, Visibilite Maximale

> **Version** : 2.0 — 2026-03-17
> **Cible** : 2000+ pages indexees sans aucune erreur Google Search Console
> **Site** : https://sos-expat.com — SPA React 18 + Vite + Dynamic Rendering Puppeteer
> **Deploiement** : Cloudflare Pages (frontend) + Firebase Functions europe-west1 (SEO backend)

---

## TABLE DES MATIERES

1. [Contexte & Architecture Existante](#1-contexte--architecture-existante)
2. [Problemes GSC a Resoudre](#2-problemes-gsc-a-resoudre)
3. [Hierarchie des 63 Agents](#3-hierarchie-des-63-agents)
4. [Phase 0 — Protection & Verification Structure Existante](#phase-0--verification-structure-existante--protection-anti-casse)
5. [Phase 1 — Audit Dynamic Rendering](#phase-1--audit-dynamic-rendering-puppeteer)
5. [Phase 2 — Audit Sitemaps](#phase-2--audit-sitemaps)
6. [Phase 3 — Audit Redirections](#phase-3--audit-redirections)
7. [Phase 4 — Audit Canonical URLs](#phase-4--audit-canonical-urls)
8. [Phase 5 — Audit Hreflang](#phase-5--audit-hreflang)
9. [Phase 6 — Audit Noindex](#phase-6--audit-noindex)
10. [Phase 7 — Audit Erreurs 5xx](#phase-7--audit-erreurs-5xx)
11. [Phase 8 — Audit Soft 404](#phase-8--audit-soft-404--contenu-insuffisant)
12. [Phase 9 — Audit 404 & Liens Casses](#phase-9--audit-404--liens-casses)
13. [Phase 10 — Audit Profils Prestataires](#phase-10--audit-profils-prestataires-pages-critiques)
14. [Phase 11 — Audit robots.txt & Headers HTTP](#phase-11--audit-robotstxt--headers-http)
15. [Phase 12 — Audit AI SEO / SAIO](#phase-12--audit-ai-seo--saio)
16. [Phase 13 — Audit Structured Data / JSON-LD](#phase-13--audit-structured-data--json-ld)
17. [Phase 14 — Audit Performance & Core Web Vitals](#phase-14--audit-performance--core-web-vitals)
18. [Phase 15 — Audit Auto-Indexing & Soumission Automatique](#phase-15--audit-auto-indexing--soumission-automatique)
19. [Phase 16 — Audit Slugs & Optimisation URLs](#phase-16--audit-slugs--optimisation-urls)
20. [Phase 17 — Audit Systeme Multilingue SEO Complet](#phase-17--audit-systeme-multilingue-seo-complet)
21. [Phase 18 — Cross-Checks & Tests de Validation](#phase-18--cross-checks--tests-de-validation)
22. [Phase 19 — Plan d'Action & Deploiement](#phase-19--plan-daction--deploiement)
23. [Regles Absolues](#regles-absolues-ne-jamais-violer)

---

## 1. CONTEXTE & ARCHITECTURE EXISTANTE

### Stack Technique
| Composant | Technologie | Details |
|-----------|-------------|---------|
| Frontend | React 18 + Vite + TypeScript | SPA, code-splitting, lazy loading |
| Deploiement Frontend | Cloudflare Pages | Auto-deploy GitHub → main |
| Backend SEO | Firebase Functions (europe-west1) | Puppeteer rendering + sitemaps |
| Base de donnees | Firestore (nam7, Iowa) | Profils, articles, FAQ, landing |
| CDN | Cloudflare | Headers, redirections, cache |
| Meta tags | react-helmet-async v2.0.5 | Dynamic injection cote client |
| Structured Data | 10 composants JSON-LD | Article, FAQ, Service, Review, etc. |

### 9 Langues Supportees
| Code Interne | Code URL | Locale Default | Pays | hreflang |
|-------------|----------|----------------|------|----------|
| fr | fr | fr-fr | France | fr |
| en | en | en-us | United States | en |
| es | es | es-es | Spain | es |
| de | de | de-de | Germany | de |
| ru | ru | ru-ru | Russia | ru |
| pt | pt | pt-pt | Portugal | pt |
| ch | zh | zh-cn | China | zh-Hans |
| ar | ar | ar-sa | Saudi Arabia | ar |
| hi | hi | hi-in | India | hi |

**ATTENTION** : Le chinois utilise `ch` en interne mais `zh` dans les URLs et `zh-Hans` pour hreflang.

### Format des URLs
```
/{langue}-{pays}/{slug-traduit}
Exemples :
  /fr-fr/tarifs
  /en-us/pricing
  /es-es/precios
  /zh-cn/pricing (chinois)
  /ar-sa/pricing (arabe)
```

### Ce qui est DEJA implemente (ne pas refaire, auditer)

**SEO Head Component** (`sos/src/components/layout/SEOHead.tsx`) :
- Canonical dynamique (normalise vers pays par defaut)
- Meta robots : `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1`
- Open Graph complet (title, description, image, locale, url, type)
- Twitter Cards (summary_large_image)
- Meta AI specifiques (ai-crawlable, content-quality, expertise, trustworthiness, reading-time, last-reviewed, citations)
- JSON-LD enrichi avec WebPage + WebPageElement + AI metadata
- Props : aiSummary, contentType, readingTime, expertise, trustworthiness, contentQuality, lastReviewed, citations

**Dynamic Rendering** (`sos/firebase/functions/src/seo/dynamicRender.ts`) :
- `renderForBotsV2` : Puppeteer + @sparticuz/chromium
- Detection de 44+ user-agents bots (Google, Bing, social, AI)
- Cache L1 (memoire, max 100 entries) + L2 (Firestore `ssr_cache`, TTL 24h)
- Attend React via 5 selecteurs : `[data-react-snap-ready="true"]`, `[data-provider-loaded="true"]`, `[data-provider-not-found="true"]`, `.provider-profile-name`, `h1`
- Config : 1GiB RAM, 0.5 CPU, 120s timeout, 30s render, 10s React wait, viewport 1280x800
- `invalidateCacheEndpoint` : invalidation authentifiee par path ou pattern
- Non-bots : 302 redirect vers le site normal
- Erreur Puppeteer : fallback 302 redirect (PAS de 500, PAS de HTML statique)
- Detection NotFound : selecteur `[data-provider-not-found="true"]` EXISTE dans le code mais NE retourne PAS HTTP 404 — c'est un probleme majeur

**Sitemaps** (`sos/firebase/functions/src/seo/sitemaps.ts`) :
- `sitemap.xml` (index) → pointe vers 5 sous-sitemaps
- `sitemap-static.xml` : pages statiques avec hreflang complet
- `sitemapProfiles` : Firestore query (isVisible=true, isApproved=true, isActive=true), exclut AAA, whitelist locales, hreflang, weekly/0.7
- `sitemapHelp` : articles publies, detection langue slug, deduplication, weekly/0.6
- `sitemapFaq` : FAQs actives, prevention contamination cross-langue, monthly/0.5
- `sitemapLanding` : landing pages actives, detection langue, weekly/0.8

**Hreflang** (`sos/src/multilingual-system/components/HrefLang/HreflangLinks.tsx`) :
- 9 alternates + x-default (→ fr-fr)
- Normalise vers pays par defaut (fr-be → fr-fr, en-gb → en-us)
- Traduit les slugs via `getRouteKeyFromSlug()` + `getTranslatedRouteSlug()`
- Codes hreflang : fr, en, es, de, ru, pt, zh-Hans, ar, hi

**Redirections** (`sos/public/_redirects`) :
- ~140 regles 301 (AUCUNE 302)
- Trailing slash removal
- Legacy `/fr/*` → `/fr-fr/:splat`
- Variantes regionales (pt-br→pt-pt, en-gb→en-us, etc.)
- Cross-language contamination (fr-us→fr-fr, es-fr→es-es, etc.)
- Legacy blog URLs → /fr-fr/
- Non-localized routes → default locale
- SPA fallback `/* /index.html 200` (DERNIER)

**robots.txt** (`sos/public/robots.txt`) :
- Allow / pour tous + sitemaps listes
- AI bots autorises avec crawl-delay (GPTBot, ClaudeBot, PerplexityBot, etc.)
- Scrapers bloques (AhrefsBot, SemrushBot, etc.)
- Googlebot crawl-delay 0

**Structured Data** (10 composants dans `sos/src/components/seo/`) :
- ArticleSchema, BreadcrumbSchema, FAQPageSchema
- LocalBusinessSchema (24/7, multi-langue, AggregateRating)
- OrganizationSchema (@graph : Organization + WebSite + ProfessionalService + SearchAction)
- ProfessionalServiceSchema / ProviderSchemaUtils (LegalService pour avocats)
- ReviewSchema (individual + aggregate)
- ServiceSchema, VideoSchema

**AI SEO / SAIO** :
- `llms.txt` (202 lignes) : identite, services, FAQ, liens, programme affilies
- Meta tags AI dans SEOHead : ai-crawlable, content-quality, expertise, trustworthiness
- JSON-LD enrichi : ai:summary, estimatedReadingTime, contentQuality
- robots.txt : 15+ AI bots autorises avec crawl-delay

**Profils Prestataires** (`sos/src/pages/ProviderProfile.tsx`) :
- Slugs multilingues par profil (objet `slugs: { fr, en, de, ... }`)
- SEOHead avec title/description dynamiques
- HreflangLinks par profil
- BreadcrumbSchema
- ProfessionalServiceSchema / LegalService
- ReviewSchema avec AggregateRating
- Attribut `data-provider-loaded` pour Puppeteer

**index.html** :
- Meta robots par defaut : `index, follow`
- OG + Twitter defaults
- Preconnect/prefetch/preload
- GA4 Consent Mode V2
- Meta Pixel differe
- Redirect locale automatique (timezone + navigator.language)
- noscript riche (650 lignes HTML semantique)
- Capture `?ref=` affiliate dans sessionStorage

**Cache & Ping** :
- `warm-ssr-cache.js` : prechauffage 50-130+ URLs
- `sitemapPingService.ts` : ping Google + Bing apres generation

**Auto-Indexing Triggers** (`sos/firebase/functions/src/seo/autoIndexingTriggers.ts`) :
- `onProfileCreated` : declenche quand profil cree (visible + approved)
- `onProfileUpdated` : detecte transition hidden→public + invalidation cache SSR toutes langues
- `onBlogPostCreated/Updated` : articles publies
- `onHelpArticleCreated/Updated` : articles aide publies
- `onLandingPageCreated/Updated` : landing pages actives
- `onFaqCreated/Updated` : FAQs actives
- `scheduledSitemapPing` : cron quotidien 8h (Paris), ping si profils recents (24h)
- `scheduledBulkIndexing` : cron quotidien 9h (Paris), soumet 200 URLs/jour avec cursor pagination
- `scheduledSeoHealthCheck` : cron hebdo lundi 10h, rapport complet + notification Telegram

**Google Indexing API** (`sos/firebase/functions/src/seo/googleIndexingService.ts`) :
- Service account Firebase admin SDK
- Quota : 200 URLs/jour (LIMITE DURE)
- `submitToGoogleIndexing(url, type)` : soumission unitaire
- `submitBatchToGoogleIndexing(urls, maxUrls)` : batch sequentiel (100ms entre chaque)
- `getUrlIndexingStatus(url)` : verifier le statut d'indexation
- Lazy loading googleapis pour eviter timeout deploy

**IndexNow** (`sos/firebase/functions/src/seo/indexNowService.ts`) :
- Cle : `sosexpat2025indexnowkey` (doit etre heberge a `https://sos-expat.com/sosexpat2025indexnowkey.txt`)
- Soumission instantanee illimitee vers Bing/Yandex
- Batch jusqu'a 10 000 URLs par requete
- `generateBlogUrls(slug)` / `generateLandingUrls(slug)` / `generateFaqUrls(slug)` : genere 9 variantes de langue

**Slug Generator** (`sos/src/utils/slugGenerator.ts` — 1000+ lignes) :
- Format : `/{locale}/{role-country}/{firstname-specialty-shortid}`
- ShortId : hash deterministe 6 chars depuis Firebase UID (alphabet sans ambigus : pas de 0/O/1/l/I)
- Roles traduits 9 langues : avocat/lawyer/abogado/anwalt/advogado/advokat/lushi/muhami/vakil
- 197 pays traduits 9 langues dans `COUNTRY_TRANSLATIONS`
- Specialites traduites dans `sos/src/data/specialty-slug-mappings.ts` (max 15 chars)
- `generateSlug(options)` : slug unique langue
- `generateMultilingualSlugs(options)` : les 9 variantes d'un coup
- Validation : max 70 chars, lowercase, pas d'accents, tirets
- Migration : `sos/firebase/functions/src/seo/migrateProfileSlugs.ts`

**Snippet Generator** (`sos/src/utils/snippetGenerator.ts`) :
- Featured Snippets (Position 0) : 197 pays × 9 langues × 2 types
- 6 templates FAQ par type de prestataire par langue
- Meta descriptions generees depuis premiere reponse FAQ (≤160 chars)
- H1/H2 tags localises par langue
- Prix dynamiques : avocat 49EUR/20min, expat 19EUR/30min
- `useSnippetGenerator(provider, locale)` : hook React memoize

---

## 2. PROBLEMES GSC A RESOUDRE

| # | Erreur GSC | Severite | Cause Probable |
|---|-----------|----------|----------------|
| 1 | **Exclue par la balise "noindex"** | CRITIQUE | SEOHead ou Puppeteer injecte noindex involontairement |
| 2 | **Page avec redirection** | HAUTE | URLs dans sitemaps qui redirigent, chaines de redirections |
| 3 | **Page en double sans URL canonique** | HAUTE | Canonical manquant ou multiple, variantes non canonisees |
| 4 | **Erreur serveur (5xx)** | CRITIQUE | Puppeteer OOM/timeout, Cloud Function cold start |
| 5 | **Exploree, actuellement non indexee** | MOYENNE | Contenu juge insuffisant, thin content, doublon |
| 6 | **Introuvable (404)** | HAUTE | Profils desactives encore dans sitemap/index, liens casses |
| 7 | **Soft 404** | CRITIQUE | SPA retourne 200 + HTML vide, Puppeteer echoue silencieusement |

---

## 3. HIERARCHIE DES 62 AGENTS

### Niveau 0 — Chef d'Orchestre (1 agent)

| # | Agent | Role | Dependances |
|---|-------|------|-------------|
| A0 | **Orchestrateur General** | Coordonne les 8 directeurs, consolide les rapports, produit le plan final | Tous |

### Niveau 1 — Directeurs de Domaine (8 agents)

| # | Agent | Domaine | Agents supervises |
|---|-------|---------|-------------------|
| A1 | **Directeur Rendering & Serveur** | Dynamic rendering, 5xx, soft 404 | A9-A17 |
| A2 | **Directeur Sitemaps & Indexation** | Sitemaps, soumission, coherence | A18-A25 |
| A3 | **Directeur Redirections & URLs** | Redirections, canonicals, 404 | A26-A33 |
| A4 | **Directeur Multilingue & Hreflang** | Hreflang, i18n, locales, traductions | A34-A41 |
| A5 | **Directeur SAIO & Structured Data** | AI SEO, JSON-LD, rich results, performance | A42-A52 |
| A6 | **Directeur Auto-Indexing** | Triggers, Google Indexing API, IndexNow, crons | A53-A57 |
| A7 | **Directeur Slugs & URLs** | Generation slugs, optimisation, migration, validation | A58-A62 |
| A8 | **Directeur Multilingue SEO Profond** | Snippets, traductions SEO, fallbacks, contenu par langue | A63-A68 |

### Niveau 2 — Agents Specialises (53 agents)

#### Sous A1 : Rendering & Serveur (9 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| A6 | **Audit Bot Detection** | Verifier que TOUS les user-agents Google sont detectes (Googlebot, Googlebot-Mobile, Googlebot-Image, AdsBot-Google, Mediapartners-Google, APIs-Google, Google-InspectionTool, Storebot-Google, GoogleOther). Verifier Bing, social, AI bots. Tester avec curl -H "User-Agent: ..." |
| A7 | **Audit Puppeteer Rendering** | Tester le rendu de 20 URLs types (homepage × 3 langues, profil avocat × 3 langues, profil expat × 3 langues, article aide × 2, FAQ × 2, landing × 2, 404 × 2). Verifier que le HTML contient : `<title>`, `<meta description>`, `<link canonical>`, `<link hreflang>`, OG tags, JSON-LD. Mesurer le temps de rendu |
| A8 | **Audit Selecteurs React** | Verifier que les selecteurs d'attente (`data-react-snap-ready`, `data-provider-loaded`, `.provider-profile-name`, `h1`) sont presents sur TOUTES les pages. Lister les pages ou aucun selecteur n'est trouve → ces pages causent des timeouts |
| A9 | **Audit Cache SSR** | Verifier le cache L2 Firestore (`ssr_cache`). Compter les entrees, verifier le TTL, identifier les entrees corrompues ou perimees. Verifier que le cache ne sert pas de pages avec d'anciens meta tags apres une mise a jour du code |
| A10 | **Audit Code HTTP Retourne** | Verifier que renderForBotsV2 retourne 200 pour pages valides, 404 pour pages inexistantes, et JAMAIS 200 pour une page 404 React. Tester : URL valide → 200, URL inexistante → 404 (pas 200+soft404), URL protegee → 302/403 |
| A11 | **Audit Erreurs 5xx** | Analyser les logs Cloud Functions (derniers 7 jours). Identifier : OOM errors, timeouts, cold start lents, erreurs Chromium. Verifier que maxInstances=10 est suffisant. Proposer des mitigations |
| A12 | **Audit Fallback** | Que retourne la fonction si Puppeteer crash ? Verifier le try/catch. Proposer un fallback : retourner le HTML statique de index.html AVEC les meta defaults plutot qu'un 5xx |
| A13 | **Audit Pages Protegees** | Verifier que /dashboard, /admin, /profile/edit, /call-checkout, /payment-success, /booking-request NE SONT PAS rendues par Puppeteer. Elles doivent retourner 302 redirect ou 403, pas du HTML indexable |
| A14 | **Audit Warm Cache** | Analyser `warm-ssr-cache.js`. Verifier que toutes les pages critiques sont couvertes. Proposer une liste etendue incluant les profils les plus importants. Verifier que le script fonctionne correctement |

#### Sous A2 : Sitemaps & Indexation (8 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| A15 | **Audit Sitemap Index** | Verifier `sitemap.xml` : tous les sous-sitemaps listes, URLs correctes, accessible, Content-Type XML. Cross-verifier avec robots.txt |
| A16 | **Audit Sitemap Static** | Verifier `sitemap-static.xml` : chaque URL existe (pas de 404), pas de redirect, pas de noindex, hreflang coherents, lastmod reelle |
| A17 | **Audit Sitemap Profiles** | Verifier `sitemapProfiles` : query Firestore correcte, aucun profil inactif/non approuve, aucune URL 404, aucune URL qui redirige, hreflang coherents, slugs multilingues corrects, conversion ch→zh, whitelist locales |
| A18 | **Audit Sitemap Help** | Verifier `sitemapHelp` : articles publies uniquement, slugs corrects, detection langue, pas de contamination cross-langue, deduplication fonctionnelle |
| A19 | **Audit Sitemap FAQ** | Verifier `sitemapFaq` : FAQs actives, slugs corrects, pas de contamination |
| A20 | **Audit Sitemap Landing** | Verifier `sitemapLanding` : landing pages actives, slugs corrects |
| A21 | **Cross-Check Sitemaps vs Rendering** | Pour 50 URLs aleatoires de chaque sitemap : verifier que le rendu Puppeteer retourne 200, que le HTML contient du contenu reel (pas soft 404), que les meta tags matchent le sitemap |
| A22 | **Audit Ping & Soumission** | Verifier que `sitemapPingService` fonctionne. Verifier les logs de ping. Proposer un cron de re-ping periodique si absent |

#### Sous A3 : Redirections & URLs (8 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| A23 | **Audit Chaines Redirections** | Parcourir TOUTES les 240+ regles de `_redirects`. Detecter les chaines (A→B→C) et boucles (A→B→A). Chaque redirect doit pointer vers la destination finale en un seul hop |
| A24 | **Audit Ordre des Regles** | Cloudflare Pages = first match wins. Verifier que les regles specifiques sont AVANT les regles generiques. Verifier que `/* /index.html 200` est en DERNIER. Identifier les regles qui pourraient capturer des URLs valides |
| A25 | **Audit URLs GSC "Page avec redirection"** | Lister les URLs GSC marquees "Page avec redirection". Pour chacune : verifier qu'elle a un redirect 301, que la destination est indexable, et que l'URL a ete retiree du sitemap |
| A26 | **Audit URLs GSC "Introuvable (404)"** | Lister les URLs 404 de GSC. Categoriser : legacy, profils supprimes, URLs mal formees. Pour chaque categorie : ajouter redirect ou confirmer 404 volontaire, retirer du sitemap |
| A27 | **Audit Canonical URLs** | Pour chaque type de page (homepage, profil, article, FAQ, landing, tarifs) : verifier qu'il y a exactement 1 `<link rel="canonical">`, qu'il est HTTPS absolu, sans trailing slash, pointe vers le pays par defaut |
| A28 | **Audit Canonical Puppeteer** | Verifier que le canonical dans le HTML pre-rendu (Puppeteer) est IDENTIQUE au canonical cote client. Tester 10 URLs dans 3 langues |
| A29 | **Audit Pages Dupliquees** | Identifier les paires de pages que Google considere comme dupliquees. Verifier les canonicals entre variantes regionales (fr-be vs fr-fr). Verifier que seule la version canonique est dans le sitemap |
| A30 | **Audit Liens Internes** | Scanner les liens internes du site (composants de navigation, footer, pages). Verifier qu'aucun lien ne pointe vers une 404 ou une page qui redirige |

#### Sous A4 : Multilingue & Hreflang (8 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| A31 | **Audit Reciprocite Hreflang** | POUR CHAQUE PAGE dans CHAQUE langue : verifier que si page A (fr-fr) declare un alternate vers page B (en-us), alors page B declare un alternate retour vers page A. Tester 20 pages × 9 langues = 180 verifications |
| A32 | **Audit Hreflang Sitemaps vs HTML** | Comparer les hreflang dans les sitemaps avec ceux dans le HTML rendu. Ils doivent etre IDENTIQUES. Tester 30 URLs |
| A33 | **Audit Codes Langue Hreflang** | Verifier que les codes sont corrects : fr, en, es, de, ru, pt, zh-Hans (PAS ch, PAS zh), ar, hi. Verifier x-default → fr-fr |
| A34 | **Audit Slugs Multilingues** | Pour 50 profils : verifier que chaque profil a des slugs dans les 9 langues, que les slugs sont uniques par langue, que le slug FR n'est pas reutilise dans d'autres langues |
| A35 | **Audit Traduction Slugs Routes** | Verifier `getTranslatedRouteSlug()` pour chaque route key × 9 langues. Verifier que les slugs de route (tarifs/pricing/precios/preise...) sont corrects |
| A36 | **Audit Locale Redirect** | Verifier le script de redirection locale dans `index.html`. Verifier que la detection timezone → pays → langue fonctionne correctement. Tester 10 timezones |
| A37 | **Audit Hreflang Profils** | Les profils prestataires ont des slugs specifiques par langue. Verifier que les hreflang des profils pointent vers les bonnes URLs avec les bons slugs traduits (pas le slug FR pour toutes les langues) |
| A38 | **Audit Cross-Language Contamination** | Verifier que les sitemaps et hreflang ne generent JAMAIS de combinaisons invalides (es-FR, zh-HR, fr-US, etc.). Tester la whitelist dans sitemaps.ts |

#### Sous A5 : SAIO & Structured Data (11 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| A42 | **Audit llms.txt** | Verifier `llms.txt` : informations a jour, liens valides, format correct, accessible publiquement, reference dans robots.txt Allow: /llms.txt. Proposer un `llms-full.txt` plus detaille si absent |
| A43 | **Audit Meta Tags AI** | Pour 10 pages types : verifier la presence et la pertinence de ai-crawlable, content-quality, expertise, trustworthiness, reading-time, last-reviewed, citations. Verifier que les valeurs ne sont pas generiques/identiques |
| A44 | **Audit JSON-LD WebPage** | Verifier le JSON-LD WebPage genere par SEOHead pour 10 pages. Valider avec schema.org et Google Rich Results Test. Verifier ai:summary, estimatedReadingTime |
| A45 | **Audit Schema Profils** | Valider ProfessionalServiceSchema/LegalService pour 10 profils. Verifier : @type correct (LegalService pour avocats, ProfessionalService pour expats), AggregateRating (seulement si reviewCount > 0), knowsLanguage, areaServed, hasOfferCatalog |
| A46 | **Audit FAQPage Schema** | Valider FAQPageSchema pour toutes les pages FAQ. Verifier que mainEntity contient les bonnes paires Q&A. Tester avec Google Rich Results Test |
| A47 | **Audit Article Schema** | Valider ArticleSchema pour les articles du centre d'aide. Verifier headline, author, publisher, dates, image |
| A48 | **Audit Breadcrumb Schema** | Valider BreadcrumbSchema pour 10 pages types. Verifier la hierarchie, les URLs, les noms. Tester avec Google Rich Results Test |
| A49 | **Audit Organization Schema** | Valider OrganizationSchema : @graph correct (Organization + WebSite + ProfessionalService), SearchAction, logo, contact points. Verifier qu'aggregateRating est sur ProfessionalService (PAS Organization) |
| A50 | **Audit Review Schema** | Valider ReviewSchema pour les profils avec avis. Verifier rating 1-5, author, date, itemReviewed. Verifier qu'aggregate = moyenne correcte |
| A51 | **Audit Core Web Vitals** | Mesurer LCP, FID/INP, CLS pour 5 pages types. Verifier : preconnect, prefetch, preload font Inter, lazy loading images, code splitting. Identifier les bottlenecks |
| A52 | **Audit AI Crawlability** | Tester l'acces au site par les AI bots (GPTBot, ClaudeBot, PerplexityBot). Verifier que le dynamic rendering fonctionne pour eux. Verifier que le contenu rendu est riche et comprehensible par un LLM |

#### Sous A6 : Auto-Indexing & Soumission (5 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| A53 | **Audit Google Indexing API** | Verifier `googleIndexingService.ts` : service account valide, scope Indexing, quota 200/jour respecte. Verifier les logs : combien d'URLs soumises/jour ? Erreurs 403/429 ? La pagination par cursor fonctionne-t-elle ? Le cycle recommence-t-il automatiquement ? Verifier que les URLs soumises sont des canonicals (pas des variantes). Verifier que `getUrlIndexingStatus()` retourne des resultats coherents |
| A54 | **Audit IndexNow** | Verifier `indexNowService.ts` : cle `sosexpat2025indexnowkey` hebergee a `https://sos-expat.com/sosexpat2025indexnowkey.txt` (GET → 200). Tester la soumission batch. Verifier que `generateBlogUrls/LandingUrls/FaqUrls` generent les 9 variantes correctes. Verifier les codes retour Bing (200/202 = OK). Proposer d'ajouter les profils (pas seulement blog/landing/faq) |
| A55 | **Audit Triggers Auto-Indexing** | Verifier `autoIndexingTriggers.ts` : CHAQUE trigger (onProfileCreated/Updated, onBlog*, onHelp*, onLanding*, onFaq*) fonctionne. Verifier que la detection de transition (hidden→public) est correcte. Verifier que le cache SSR est invalide pour TOUTES les variantes de langue. Verifier que les triggers n'indexent PAS les profils non approuves/non visibles |
| A56 | **Audit Crons SEO** | Verifier les 3 scheduled functions : `scheduledSitemapPing` (8h, ping si profils recents), `scheduledBulkIndexing` (9h, 200 URLs/jour), `scheduledSeoHealthCheck` (lundi 10h). Verifier les logs : s'executent-elles ? Erreurs ? Le health check envoie-t-il bien la notification Telegram ? Le bulk indexing couvre-t-il toutes les langues ou seulement FR ? |
| A57 | **Audit Pipeline Indexation Complete** | Cross-check de bout en bout : Nouveau profil cree → trigger fire → IndexNow + Google API soumis → cache SSR invalide → sitemap regenere → ping envoye → Google crawle → page indexee. Identifier les maillons faibles. Verifier le delai moyen entre creation et indexation |

#### Sous A7 : Slugs & Optimisation URLs (5 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| A58 | **Audit Generation Slugs** | Verifier `slugGenerator.ts` : format `/{locale}/{role-country}/{firstname-specialty-shortid}`. Tester `generateSlug()` avec 10 profils types (noms avec accents, noms arabes/chinois/hindi, noms tres longs, noms avec caracteres speciaux). Verifier que le resultat est ≤70 chars, lowercase, sans accents, avec tirets. Verifier le shortId : hash deterministe, alphabet 32 chars sans ambigus, extraction regex correcte |
| A59 | **Audit Slugs Multilingues** | Verifier `generateMultilingualSlugs()` : pour 20 profils, generer les 9 variantes et verifier : (a) Aucun slug vide/null/undefined, (b) Role traduit correctement (avocat/lawyer/abogado/...), (c) Pays traduit correctement dans les 9 langues (197 pays × 9 = verifier un echantillon de 30 pays), (d) Specialite traduite (max 15 chars), (e) Pas de doublons entre profils dans une meme langue |
| A60 | **Audit Traductions Pays** | Verifier `COUNTRY_TRANSLATIONS` (197 pays × 9 langues) : (a) Aucun pays manquant, (b) Slugs valides (pas d'accents, pas d'espaces, tirets), (c) Pas de doublons (deux pays avec le meme slug dans une langue), (d) Coherence avec les noms de pays dans les sitemaps et les URLs. Verifier les cas complexes : "Cote d'Ivoire", "Republique Tcheque", "Arabie Saoudite", etc. |
| A61 | **Audit Specialites Slugs** | Verifier `specialty-slug-mappings.ts` : (a) Chaque specialite avocat a un slug dans les 9 langues, (b) Chaque type d'aide expat a un slug dans les 9 langues, (c) Max 15 chars respecte, (d) Pas de caracteres invalides, (e) Slugs significatifs et SEO-friendly (pas de codes techniques). Proposer des ameliorations si certains slugs sont trop generiques |
| A62 | **Audit Migration Slugs** | Verifier `migrateProfileSlugs.ts` : (a) Tous les profils existants ont ete migres vers le nouveau format multilingue, (b) Les anciens slugs (legacy format `fr/avocat-thailand/...`) ont des redirections 301 dans `_redirects`, (c) Aucun profil n'a un slug legacy sans equivalent multilingue, (d) Le script de migration est idempotent (peut etre rejoue sans casser) |

#### Sous A8 : Multilingue SEO Profond (6 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| A63 | **Audit Snippet Generator** | Verifier `snippetGenerator.ts` : (a) Les 6 templates FAQ par type × 9 langues sont complets et grammaticalement corrects, (b) Les variables {name}, {country} sont correctement substituees, (c) Les prix sont corrects (49€ avocat, 19€ expat), (d) Les meta descriptions generees sont ≤160 chars et uniques par profil, (e) Les H1/H2 tags sont localises correctement. Tester pour 5 profils × 9 langues |
| A64 | **Audit Contenu Traduit vs Duplique** | Verifier que les pages dans differentes langues ont du VRAI contenu traduit, pas juste des meta tags traduits avec le meme body FR. Pour 10 profils : comparer le HTML rendu en FR, EN, ES → le texte visible doit etre different. Identifier les pages ou seuls les meta changent mais le contenu reste en FR → "Exploree, non indexee" car Google detecte le doublon |
| A65 | **Audit Fallback Traductions** | Verifier le mecanisme de fallback : (a) `LocalizedText` : langue demandee → FR → EN → premiere dispo, (b) Si un profil n'a de bio qu'en FR, les pages EN/ES/DE affichent quoi ? La bio FR ? → doublon potentiel, (c) Si un slug manque pour une langue, cette langue est-elle bien exclue des hreflang ET du sitemap ?, (d) Identifier tous les profils avec traductions incompletes |
| A66 | **Audit useSnippetGenerator** | Verifier le hook `useSnippetGenerator(provider, locale)` : (a) Le memoization fonctionne (pas de re-generation a chaque render), (b) Le JSON-LD genere est valide pour chaque langue, (c) Les snippets sont coherents avec les meta tags de SEOHead, (d) Le hook retourne null gracieusement si provider est null (pas de crash React → pas de soft 404) |
| A67 | **Audit Meta Titles/Descriptions Uniques** | Pour 50 profils × 3 langues = 150 pages : extraire le `<title>` et `<meta description>` du HTML rendu. Verifier : (a) Aucun doublon exact entre deux pages, (b) Chaque title contient le nom + role + pays, (c) Chaque description est > 80 chars et < 160 chars, (d) Les descriptions varient entre profils (pas un template identique), (e) Les titres sont dans la bonne langue |
| A68 | **Audit Coherence Multilingue Bout en Bout** | Pour 5 profils complets, verifier la chaine COMPLETE dans chaque langue : Slug Firestore → URL sitemap → URL hreflang → canonical → meta title → meta description → H1 → JSON-LD name → breadcrumb. TOUT doit etre coherent et dans la bonne langue. Un seul maillon incoherent = probleme GSC |

### Niveau 3 — Agent de Validation Finale (1 agent)

| # | Agent | Mission |
|---|-------|---------|
| A69 | **Validateur Final** | Recoit les rapports de A1-A8. Execute les cross-checks (Phase 18). Produit le rapport final et le plan d'action ordonne |

---

### Schema de la Hierarchie

```
                                    A0 - Orchestrateur General
                                              |
        ┌──────────┬──────────┬──────────┬────┴────┬──────────┬──────────┬──────────┐
        |          |          |          |         |          |          |          |
   A1 Rendering A2 Sitemaps A3 Redirects A4 Hreflang A5 SAIO A6 AutoIdx A7 Slugs A8 i18n SEO
        |          |          |          |         |          |          |          |
    A9-A17     A18-A25    A26-A33    A34-A41  A42-A52    A53-A57    A58-A62    A63-A68
   (9 agents) (8 agents) (8 agents) (8 agents)(11 agents)(5 agents) (5 agents) (6 agents)
                                              |
                                    A69 - Validateur Final
```

**Total : 1 orchestrateur + 8 directeurs + 53 specialistes + 1 validateur = 63 agents**

### Flux d'Execution

```
ETAPE 1 : A0 lance A1, A2, A3, A4, A5, A6, A7, A8 en PARALLELE
ETAPE 2 : Chaque directeur lance ses agents en parallele
ETAPE 3 : Les agents specialises executent leurs audits
ETAPE 4 : Les directeurs consolident et identifient les problemes
ETAPE 5 : A69 execute les cross-checks inter-domaines (Phase 18)
ETAPE 6 : A0 produit le rapport final et le plan d'action
```

---

## PHASE 0 — Verification Structure Existante & Protection Anti-Casse

> **CETTE PHASE EST OBLIGATOIRE AVANT TOUTE MODIFICATION.**
> Le site a deja une infrastructure SEO avancee. Le risque #1 est de CASSER ce qui fonctionne deja en voulant corriger ce qui ne fonctionne pas.

### 0A — Snapshot de l'Etat Actuel (AVANT toute modification)

Capturer un snapshot complet AVANT de toucher quoi que ce soit :

- [ ] **GSC baseline** : noter le nombre exact de pages indexees, exclues, en erreur par categorie
- [ ] **Sitemaps actuels** : telecharger et archiver les 5 sitemaps (index + 4 dynamiques) en XML
- [ ] **Cache SSR** : compter les entrees dans `ssr_cache` Firestore
- [ ] **URLs fonctionnelles** : tester 50 URLs critiques (homepage × 9, profils × 10, articles × 5) → sauvegarder les codes HTTP et les titles
- [ ] **Git state** : creer une branche `audit-seo-backup` avant toute modification code
- [ ] **_redirects backup** : copier le fichier actuel
- [ ] **Hreflang baseline** : pour 10 pages, capturer les hreflang actuels

### 0B — Verification que la Structure Existante Fonctionne

**AVANT de chercher des problemes, verifier que les systemes en place FONCTIONNENT :**

| Systeme | Test | Resultat attendu |
|---------|------|-------------------|
| Dynamic Rendering | curl avec User-Agent Googlebot sur /fr-fr/ | HTML complet avec `<title>`, meta, JSON-LD |
| Sitemaps Profiles | GET sitemapProfiles Cloud Function | XML valide avec URLs et hreflang |
| Sitemaps Help | GET sitemapHelp Cloud Function | XML valide |
| Sitemaps FAQ | GET sitemapFaq Cloud Function | XML valide |
| Sitemaps Landing | GET sitemapLanding Cloud Function | XML valide |
| Sitemap Index | GET /sitemap.xml | Index avec 5 sous-sitemaps |
| Hreflang | Verifier 3 pages FR → EN reciproque | ✅ si reciproque |
| Canonical | Verifier /fr-be/tarifs → canonical /fr-fr/tarifs | ✅ si normalise |
| Auto-Indexing | Verifier les logs scheduledBulkIndexing | ✅ si execute quotidiennement |
| IndexNow | GET /sosexpat2025indexnowkey.txt | ✅ si retourne la cle |
| Redirections | Tester /fr/tarifs → 301 /fr-fr/tarifs | ✅ si 301 correct |
| robots.txt | GET /robots.txt | ✅ si accessible avec sitemaps |
| llms.txt | GET /llms.txt | ✅ si accessible |
| Schema.org | Google Rich Results Test sur 3 pages | ✅ si valide |

**Si un systeme fonctionne → NE PAS LE MODIFIER sauf si c'est la source d'une erreur GSC avérée.**

### 0C — Regles Anti-Casse (A RESPECTER IMPERATIVEMENT)

#### Anti-Doublon
- [ ] **JAMAIS deux `<link rel="canonical">` sur la meme page** — Verifier que React Helmet ne cree pas de doublon avec index.html
- [ ] **JAMAIS deux `<meta name="robots">` sur la meme page** — Helmet doit REMPLACER, pas AJOUTER
- [ ] **JAMAIS un meme slug pour deux profils dans une meme langue** — Verifier l'unicite en base
- [ ] **JAMAIS une meme URL dans deux sitemaps differents** — Pas de profil dans sitemap-static ET sitemapProfiles
- [ ] **JAMAIS un hreflang qui pointe vers une page qui pointe vers un autre hreflang** (boucle)
- [ ] **JAMAIS une URL dans le sitemap qui redirige** — Si une URL a un 301, elle ne doit PAS etre dans le sitemap
- [ ] **JAMAIS deux JSON-LD du meme @type sur la meme page** (ex: deux FAQPage)

#### Anti-Casse Hreflang
- [ ] Si tu modifies le composant HreflangLinks : tester TOUTES les 9 langues (pas seulement FR+EN)
- [ ] Si tu modifies les codes langue : verifier le mapping ch→zh→zh-Hans partout (slugGenerator, sitemaps, hreflang, URLs)
- [ ] Si tu modifies un slug de route : mettre a jour dans localeRoutes.ts, HreflangLinks, sitemaps, ET _redirects
- [ ] Jamais supprimer un hreflang sans verifier que la page cible ne declare pas un retour

#### Anti-Casse Redirections
- [ ] Si tu ajoutes une regle dans _redirects : verifier qu'elle ne capture PAS des URLs valides (tester avec 5 URLs)
- [ ] Si tu deplace une regle : Cloudflare = first match wins, l'ordre compte
- [ ] Le SPA fallback `/* /index.html 200` DOIT rester la DERNIERE regle (ligne 240)
- [ ] Ne JAMAIS ajouter de 302 — tout doit etre 301 (permanent)

#### Anti-Casse Rendering
- [ ] Si tu modifies dynamicRender.ts : tester avec AU MOINS 5 URLs types avant deploiement
- [ ] Ne JAMAIS reduire la memoire en dessous de 1GiB (Puppeteer crash)
- [ ] Ne JAMAIS reduire le timeout en dessous de 30s
- [ ] Si tu ajoutes un selecteur d'attente : verifier qu'il existe dans le DOM de TOUTES les pages

#### Anti-Casse Sitemaps
- [ ] Si tu modifies la query Firestore dans sitemapProfiles : verifier que le nombre d'URLs ne change pas de maniere inattendue
- [ ] Ne JAMAIS retirer la validation whitelist des locales
- [ ] Ne JAMAIS retirer le filtre AAA
- [ ] Verifier que le XML genere est bien forme (pas de caracteres invalides, encodage UTF-8)

#### Anti-Casse Slugs
- [ ] Ne JAMAIS modifier un slug existant en base — creer une redirection
- [ ] Ne JAMAIS changer le format de slug sans migration
- [ ] Ne JAMAIS modifier le shortId d'un profil existant (il fait partie de l'URL indexee)
- [ ] Si tu ajoutes un pays dans COUNTRY_TRANSLATIONS : verifier les 9 langues

#### Anti-Casse Auto-Indexing
- [ ] Ne JAMAIS depasser 200 URLs/jour sur Google Indexing API (hard limit)
- [ ] Ne JAMAIS soumettre des URLs non-canoniques a Google
- [ ] Si tu modifies un trigger Firestore : verifier qu'il ne fire PAS sur les profils AAA/non approuves

### 0D — Matrice de Risque par Fichier

| Fichier | Risque si modifié | Impact potentiel | Precaution |
|---------|-------------------|-----------------|------------|
| `dynamicRender.ts` | **CRITIQUE** | 100% des pages pour les bots | Tester 20 URLs avant deploy |
| `sitemaps.ts` | **CRITIQUE** | Tous les sitemaps | Comparer avant/apres nombre URLs |
| `_redirects` | **HAUTE** | Toutes les redirections | Tester 10 URLs apres modif |
| `SEOHead.tsx` | **HAUTE** | Meta de toutes les pages | Verifier 5 pages × 3 langues |
| `HreflangLinks.tsx` | **HAUTE** | Hreflang de toutes les pages | Verifier reciprocite 9 langues |
| `slugGenerator.ts` | **HAUTE** | URLs des profils | Ne modifier que pour NOUVEAUX profils |
| `autoIndexingTriggers.ts` | **MOYENNE** | Indexation automatique | Verifier les logs apres deploy |
| `index.html` | **HAUTE** | Template de toutes les pages | Redirect locale, noscript, meta |
| `robots.txt` | **MOYENNE** | Regles de crawl | Tester avec Google robots.txt tester |
| `NotFound.tsx` | **MOYENNE** | Pages 404 | Verifier que noindex est conserve |
| `snippetGenerator.ts` | **BASSE** | Snippets profils | Tester 3 profils × 3 langues |
| `specialty-slug-mappings.ts` | **BASSE** | Slugs specialites | Ne change que les nouveaux |

---

## PHASE 1 — Audit Dynamic Rendering (Puppeteer)

**Agents** : A9, A10, A11, A12, A13, A14, A15, A16, A17
**Superviseur** : A1
**Fichier principal** : `sos/firebase/functions/src/seo/dynamicRender.ts`

### A6 — Bot Detection

**Objectif** : Aucun bot Google ne doit passer a travers le filtre

Verifier que le tableau de detection contient EXACTEMENT ces user-agents Google :
```
Googlebot
Googlebot-Mobile
Googlebot-Image
Googlebot-News
Googlebot-Video
AdsBot-Google
AdsBot-Google-Mobile
Mediapartners-Google
APIs-Google
Google-InspectionTool
Google-Safety
Storebot-Google
GoogleOther
Google-Extended
FeedFetcher-Google
```

Verifier aussi :
- [ ] Bingbot, BingPreview, msnbot
- [ ] LinkedInBot, Twitterbot, facebookexternalhit, WhatsApp, Discordbot, TelegramBot
- [ ] GPTBot, ChatGPT-User, OAI-SearchBot
- [ ] ClaudeBot, anthropic-ai
- [ ] PerplexityBot, cohere-ai, YouBot, Amazonbot, Applebot
- [ ] Screaming Frog SEO Spider, Sitebulb

**Test** : `curl -H "User-Agent: Google-InspectionTool" https://europe-west1-sos-urgently-ac307.cloudfunctions.net/renderForBotsV2?path=/fr-fr/&url=https://sos-expat.com/fr-fr/` → doit retourner du HTML rendu, pas un 302

### A7 — Qualite du Rendu Puppeteer

**Objectif** : Le HTML pre-rendu contient TOUTES les balises SEO

Pour chaque URL testee, verifier la PRESENCE et la VALIDITE de :
```html
<title>Texte unique et descriptif (50-60 chars)</title>
<meta name="description" content="Description unique (150-160 chars)"/>
<link rel="canonical" href="https://sos-expat.com/..."/>
<link rel="alternate" hreflang="fr" href="..."/>
<link rel="alternate" hreflang="en" href="..."/>
... (9 langues + x-default)
<meta property="og:title" content="..."/>
<meta property="og:description" content="..."/>
<meta property="og:url" content="..."/>
<meta property="og:image" content="..."/>
<meta name="robots" content="index, follow, ..."/>
<script type="application/ld+json">...</script>
```

**URLs a tester (minimum 20)** :
| Type | URLs |
|------|------|
| Homepage | /fr-fr/, /en-us/, /zh-cn/ |
| Tarifs | /fr-fr/tarifs, /en-us/pricing, /es-es/precios |
| FAQ | /fr-fr/faq, /en-us/faq |
| Centre aide | /fr-fr/centre-aide, /en-us/help-center |
| Profil avocat | 3 profils reels dans 3 langues |
| Profil expat | 2 profils reels dans 2 langues |
| Landing | /fr-fr/devenir-blogueur, /en-us/become-blogger |
| 404 | /fr-fr/page-inexistante (DOIT retourner HTTP 404, pas 200) |

### A8 — Selecteurs d'Attente React

**Objectif** : Puppeteer ne snapshote JAMAIS avant que React soit monte

Verifier dans le code de chaque page/composant :
- [ ] Homepage : quel selecteur est present ? (`h1`, `data-react-snap-ready` ?)
- [ ] ProviderProfile : `data-provider-loaded` est-il toujours ajoute au DOM ?
- [ ] Articles aide : quel selecteur ?
- [ ] FAQ : quel selecteur ?
- [ ] Landing pages : quel selecteur ?
- [ ] Pages statiques (tarifs, contact) : quel selecteur ?

**PROBLEME POTENTIEL** : Si une page n'a aucun des 4 selecteurs, Puppeteer attend 10s puis snapshote le HTML actuel → potentiellement incomplet → soft 404

**Action** : Ajouter `data-react-snap-ready` sur CHAQUE page publique dans le composant principal

### A9 — Integrite du Cache SSR

- [ ] Compter les documents dans `ssr_cache` : combien ? → Si > 1000, verifier la purge TTL
- [ ] Verifier que le TTL 24h est respecte (pas de cache eternel)
- [ ] Identifier les entrees avec du HTML invalide (pas de `<title>`, pas de `<meta description>`)
- [ ] Verifier que la mise a jour du code frontend invalide le cache (sinon l'ancien HTML est servi)
- [ ] Proposer un hook post-deploy qui invalide le cache automatiquement

### A10 — Codes HTTP du Dynamic Renderer

**PROBLEME CENTRAL** : Le SPA fallback Cloudflare (`/* /index.html 200`) retourne TOUJOURS 200. Googlebot voit 200 + contenu vide = **soft 404**.

Verifier dans `renderForBotsV2` :
- [ ] URL valide → HTTP 200 + HTML complet ✅
- [ ] URL inexistante → le renderer detecte-t-il la page 404 React et retourne-t-il HTTP 404 ?
- [ ] Comment le renderer sait qu'une page est 404 ? → Il doit detecter le composant NotFound.tsx (chercher un selecteur specifique comme `data-page-not-found` ou le titre "404")
- [ ] URL protegee (/dashboard) → HTTP 302 vers login ou 403 ?
- [ ] URL avec redirect (_redirects match) → le renderer suit-il la redirect ou rend-il la page de destination directement ?

**SI LE RENDERER NE DETECTE PAS LES 404** : C'est la cause principale des soft 404 dans GSC. Fix : ajouter `<meta name="render-status" content="404"/>` dans NotFound.tsx et le detecter dans Puppeteer pour retourner HTTP 404.

### A11 — Analyse des Erreurs 5xx

- [ ] Extraire les logs `renderForBotsV2` des 7 derniers jours (Cloud Logging)
- [ ] Categoriser les erreurs : OOM, timeout, Chromium crash, Firestore error, network error
- [ ] Mesurer le taux d'erreur : objectif < 0.1%
- [ ] Verifier le cold start time : si > 15s, Googlebot peut timeout
- [ ] Verifier si `maxInstances: 10` cause des rejets (429) pendant les crawl bursts
- [ ] Verifier la version de @sparticuz/chromium : est-elle a jour ?

### A12 — Strategie de Fallback

- [ ] Verifier le try/catch global dans renderForBotsV2
- [ ] Que retourne la fonction en cas d'erreur ? → 500 ? → MAUVAIS pour GSC
- [ ] Proposer : en cas d'erreur Puppeteer, retourner le HTML statique de `index.html` AVEC les meta defaults → Google verra au moins les meta par defaut, c'est mieux qu'un 5xx
- [ ] Alternative : retourner 503 (Service Unavailable) + Retry-After header → Google reviendra plus tard

### A13 — Protection des Pages Privees

- [ ] Tester avec curl bot : renderForBotsV2 + path=/dashboard → que retourne-t-il ?
- [ ] Tester : /admin, /profile/edit, /call-checkout, /payment-success, /booking-request
- [ ] Ces pages doivent retourner 302 (redirect vers login) ou rien d'indexable
- [ ] Verifier que ces paths sont aussi dans robots.txt Disallow (c'est le cas, mais double verification)

### A14 — Couverture du Warm Cache

- [ ] Verifier `warm-ssr-cache.js` : combien d'URLs ? → 50 prioritaires, 130+ avec --all
- [ ] Manque-t-il des pages critiques ? (nouveaux profils top, nouvelles landing pages)
- [ ] Proposer : generer la liste d'URLs depuis les sitemaps dynamiquement
- [ ] Proposer : un cron Cloud Scheduler qui warm le cache toutes les 12h
- [ ] Verifier que le script precede le ping Google (warm PUIS ping, pas l'inverse)

---

## PHASE 2 — Audit Sitemaps

**Agents** : A15, A16, A17, A18, A19, A20, A21, A22
**Superviseur** : A2
**Fichier principal** : `sos/firebase/functions/src/seo/sitemaps.ts`

### A15 — Sitemap Index

- [ ] `sitemap.xml` est-il accessible a `https://sos-expat.com/sitemap.xml` ?
- [ ] Content-Type : `application/xml` (pas text/html)
- [ ] Liste-t-il les 5 sous-sitemaps avec les bonnes URLs ?
- [ ] Les URLs des Cloud Functions sont-elles les bonnes ? (`europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapProfiles`, etc.)
- [ ] `lastmod` est-il a jour ?
- [ ] Les URLs dans robots.txt correspondent-elles exactement a celles du sitemap index ?

### A16 — Sitemap Static

Pour CHAQUE URL dans `sitemap-static.xml` :
- [ ] GET l'URL → code HTTP ? (doit etre 200, pas 301/302/404)
- [ ] Si le rendu bot est actif : le HTML contient-il du contenu reel ?
- [ ] Les hreflang dans le sitemap sont-ils corrects et reciproques ?
- [ ] `lastmod` est-il realiste (pas dans le futur, pas trop ancien) ?
- [ ] `changefreq` et `priority` sont-ils raisonnables ?

### A17 — Sitemap Profiles (CRITIQUE — ~90% des pages)

- [ ] Executer la Cloud Function localement ou en prod et verifier le XML genere
- [ ] Compter le nombre d'URLs : correspond-il au nombre de profils actifs en Firestore ?
- [ ] Verifier la query : `isVisible=true AND isApproved=true AND isActive=true AND isAAA!=true`
- [ ] Pour 50 URLs aleatoires :
  - GET → 200 ? (pas 404, pas redirect)
  - HTML rendu contient le nom du prestataire ?
  - Hreflang dans le sitemap = hreflang dans le HTML ?
- [ ] Verifier qu'aucun slug n'est vide ou `undefined` ou `null`
- [ ] Verifier la conversion ch→zh dans les URLs
- [ ] Verifier la whitelist de locales : aucune combinaison invalide ne passe
- [ ] Verifier que les profils avec `slug` (legacy, string) ET `slugs` (nouveau, objet) sont bien geres
- [ ] Verifier le XML : bien forme, encode UTF-8, pas de caracteres invalides dans les slugs arabes/chinois/hindi

### A18-A20 — Sitemaps Help, FAQ, Landing

Meme verifications que A17, adaptees au type de contenu :
- [ ] Query Firestore correcte (isPublished/isActive)
- [ ] Slugs corrects par langue
- [ ] Detection langue du slug (prefixe)
- [ ] Deduplication fonctionnelle (Help)
- [ ] Prevention contamination cross-langue
- [ ] XML bien forme

### A21 — Cross-Check Sitemaps vs Rendering

**50 URLs de CHAQUE sitemap** (250 total) :
1. Extraire l'URL du sitemap
2. GET avec User-Agent Googlebot via renderForBotsV2
3. Verifier : HTTP 200, HTML > 1000 chars, contient `<title>`, contient `<meta description>`, contient `<link canonical>`
4. Verifier que canonical dans HTML = URL dans sitemap
5. Verifier que hreflang dans HTML = hreflang dans sitemap

**Si une URL echoue** : c'est un candidat pour les erreurs GSC. Documenter.

### A22 — Ping & Soumission

- [ ] `sitemapPingService.ts` : les URLs de ping sont-elles correctes ?
- [ ] Note : Google a deprecie le ping sitemap en 2023. L'API retourne-t-elle encore 200 ?
- [ ] Bing ping fonctionne encore (via IndexNow aussi)
- [ ] Proposer : implementer IndexNow pour Bing/Yandex (soumission instantanee)
- [ ] Proposer : soumission automatique via Google Search Console API (Indexing API pour les profils prestataires = JobPosting-like)
- [ ] Y a-t-il un cron qui re-ping apres mise a jour des sitemaps ?

---

## PHASE 3 — Audit Redirections

**Agents** : A23, A24, A25, A26, A27, A28, A29, A30
**Superviseur** : A3
**Fichier principal** : `sos/public/_redirects`

### A23 — Chaines & Boucles de Redirections

**Script de test** :
```bash
# Pour chaque regle dans _redirects :
# 1. Suivre la destination
# 2. Verifier que la destination ne redirige PAS elle-meme
# 3. Si elle redirige → chaine detectee → CORRIGER

# Exemples a verifier :
# /fr/* → /fr-fr/:splat → est-ce que /fr-fr/* redirige quelque part ? NON ✅
# /pt-br/* → /pt-pt/:splat → est-ce que /pt-pt/* redirige ? NON ✅
# /en-gb/* → /en-us/:splat → est-ce que /en-us/* redirige ? NON ✅
```

- [ ] Tester TOUTES les regles : aucune destination ne doit elle-meme rediriger
- [ ] Verifier specifiquement les redirections cross-language : /fr-us/* → /fr-fr/:splat → OK
- [ ] Verifier les redirections legacy blog : /blog-expatnola/ → /fr-fr/ → OK (pas /fr-fr/ → /fr-fr ?)
- [ ] Verifier trailing slash : /fr-fr/ → /fr-fr 301 + on accede a /fr-fr → page valide (pas un autre redirect)

### A24 — Ordre des Regles Cloudflare

Cloudflare Pages = **first match wins**, du haut vers le bas.

- [ ] Verifier que les regles les plus specifiques sont EN HAUT
- [ ] Verifier que les regles generiques (splat) sont EN BAS
- [ ] Verifier que `/* /index.html 200` est la TOUTE DERNIERE regle
- [ ] Verifier qu'aucune regle trop large ne capture des URLs valides :
  - `/fr/*` capture-t-il `/fr-fr/...` ? → NON car `/fr-fr/*` n'a PAS `/fr/` comme prefixe → OK
  - Mais `/fr/fr-fr/*` serait capture → verifier

### A25 — URLs GSC "Page avec redirection"

Pour chaque URL flaggee dans GSC :
1. Identifier la regle de redirection qui la capture
2. Verifier que la destination est une page indexable (200, pas noindex)
3. Verifier que l'URL source n'est dans AUCUN sitemap
4. Si l'URL devrait etre indexee : retirer la redirection
5. Si la redirection est legitime : confirmer et demander la revalidation GSC

### A26 — URLs GSC "Introuvable (404)"

Categorisation obligatoire :
| Categorie | Action |
|-----------|--------|
| URL legacy (ancien format) | Ajouter redirect 301 dans `_redirects` |
| Profil supprime/desactive | Confirmer 404 + retirer du sitemap |
| URL mal formee (mauvais locale) | Ajouter redirect 301 vers la bonne URL |
| URL ancienne (WordPress) | Ajouter redirect 301 vers /fr-fr/ |
| URL generee par un bug | Corriger le bug source |

### A27 — Canonical URLs Complet

Pour CHAQUE type de page :
| Type | Canonical attendu | Verification |
|------|------------------|--------------|
| Homepage fr-be | https://sos-expat.com/fr-fr | Normalise pays |
| Homepage en-us | https://sos-expat.com/en-us | Deja default |
| Tarifs fr-fr | https://sos-expat.com/fr-fr/tarifs | Exact |
| Profil /fr-be/avocat-th/x | https://sos-expat.com/fr-fr/avocat-th/x | Normalise |
| Article aide | https://sos-expat.com/{locale}/centre-aide/{slug} | Avec locale default |
| Page 404 | AUCUN canonical (ou self-referencing avec noindex) | |

Verifier :
- [ ] Exactement 1 `<link rel="canonical">` par page
- [ ] Toujours HTTPS
- [ ] Jamais de trailing slash
- [ ] URL absolue (commence par https://sos-expat.com)
- [ ] Pas de parametre de query dans le canonical

### A28 — Canonical : Client vs Puppeteer

**Test critique** : Le canonical est injecte par React Helmet cote client. Puppeteer doit attendre que Helmet ait injecte AVANT de snapshotter.

Pour 10 URLs × 3 langues :
1. Rendre avec Puppeteer
2. Extraire le canonical du HTML rendu
3. Comparer avec le canonical attendu
4. Si different : Puppeteer snapshote trop tot → augmenter le wait time ou ajouter un selecteur

### A29 — Pages Dupliquees

- [ ] Lister les URLs GSC marquees "Page en double sans URL canonique selectionnee par l'utilisateur"
- [ ] Pour chaque paire de doublons : quel canonical Google a-t-il choisi ?
- [ ] Est-ce que les deux pages ont des canonicals differents (conflit) ?
- [ ] Est-ce que le canonical pointe vers la bonne version ?
- [ ] Les variantes regionales (fr-be, fr-ca, fr-ch) ont-elles toutes canonical → fr-fr ?

### A30 — Liens Internes

- [ ] Scanner les composants de navigation : Header, Footer, Sidebar
- [ ] Verifier que tous les liens utilisent les slugs traduits (pas des hardcoded)
- [ ] Verifier que les liens des profils dans les listes pointent vers des pages existantes
- [ ] Verifier les liens dans le noscript de index.html : sont-ils a jour ?
- [ ] Verifier les liens dans les articles aide et FAQ

---

## PHASE 4 — Audit Canonical URLs

Couverte par A27, A28, A29 dans la Phase 3.

---

## PHASE 5 — Audit Hreflang

**Agents** : A31, A32, A33, A34, A35, A36, A37, A38
**Superviseur** : A4
**Fichier principal** : `sos/src/multilingual-system/components/HrefLang/HreflangLinks.tsx`

### A31 — Reciprocite Hreflang

**Regle Google** : Si page A declare `hreflang="en"` vers page B, alors page B DOIT declarer `hreflang="fr"` vers page A. Sinon Google IGNORE les deux.

**Test systematique** :
```
Pour chaque page P dans le sitemap :
  Pour chaque hreflang H declare par P :
    Rendre la page cible de H
    Verifier qu'elle declare un hreflang retour vers P
    Si non → ERREUR CRITIQUE : reciprocite manquante
```

- [ ] Tester au minimum 20 pages statiques × 9 langues
- [ ] Tester au minimum 10 profils × 9 langues
- [ ] Tester au minimum 5 articles aide × 9 langues

### A32 — Coherence Sitemaps vs HTML

Pour 30 URLs :
1. Extraire les hreflang du sitemap XML
2. Rendre la page avec Puppeteer
3. Extraire les hreflang du HTML rendu
4. Comparer : memes langues ? memes URLs ?

**Causes de mismatch possibles** :
- Le sitemap utilise ch→zh mais le frontend utilise ch→zh-Hans
- Le sitemap genere des URLs avec un format different du frontend
- Le frontend traduit les slugs differemment du sitemap

### A33 — Codes Langue

Verifier que les codes sont 100% conformes :
| Langue | Dans les URLs | hreflang HTML | hreflang Sitemap | OG locale |
|--------|--------------|---------------|------------------|-----------|
| Francais | fr-fr | fr | fr | fr_FR |
| Anglais | en-us | en | en | en_US |
| Espagnol | es-es | es | es | es_ES |
| Allemand | de-de | de | de | de_DE |
| Russe | ru-ru | ru | ru | ru_RU |
| Portugais | pt-pt | pt | pt | pt_PT |
| Chinois | zh-cn | zh-Hans | zh-Hans | zh_CN |
| Arabe | ar-sa | ar | ar | ar_SA |
| Hindi | hi-in | hi | hi | hi_IN |

- [ ] Le chinois NE DOIT PAS etre `ch` dans les hreflang
- [ ] x-default DOIT pointer vers la version fr-fr

### A34 — Slugs Multilingues des Profils

Pour 50 profils Firestore :
- [ ] Verifier que le champ `slugs` est un objet avec 9 cles (fr, en, es, de, ru, pt, ch, ar, hi)
- [ ] Verifier qu'aucune cle n'est vide, null, ou undefined
- [ ] Verifier que chaque slug est unique dans sa langue (pas deux profils avec le meme slug en FR)
- [ ] Verifier que le slug ne contient pas de caracteres invalides pour les URLs
- [ ] Verifier que les slugs arabes/chinois/hindi sont correctement encodes (pas de mojibake)
- [ ] Verifier le fallback : si un slug manque dans une langue, cette langue est-elle exclue des hreflang ?

### A35 — Traduction des Routes

Verifier `getTranslatedRouteSlug()` pour TOUTES les route keys :
| Route Key | FR | EN | ES | DE | RU | PT | ZH | AR | HI |
|-----------|----|----|----|----|----|----|----|----|-----|
| pricing | tarifs | pricing | precios | preise | tseny | precos | pricing | pricing | pricing |
| faq | faq | faq | preguntas-frecuentes | haufig-gestellte-fragen | chasto-zadavaemye-voprosy | perguntas-frequentes | faq | faq | faq |
| help-center | centre-aide | help-center | centro-ayuda | hilfezentrum | tsentr-pomoshchi | centro-ajuda | bangzhu-zhongxin | مركز-المساعدة | sahayata-kendra |
| register-lawyer | inscription/avocat | register/lawyer | registro/abogado | registrierung/anwalt | ... | ... | ... | ... | ... |
| (etc.) | | | | | | | | | |

- [ ] Verifier que CHAQUE combinaison route key × langue retourne un slug valide (pas undefined)

### A36 — Redirect Locale (index.html)

Le script dans `index.html` redirige `/` vers `/{locale}/` :
- [ ] Verifier le mapping timezone → pays → langue (40+ timezones)
- [ ] Verifier que la redirection preserve `?ref=` (affiliate)
- [ ] Verifier que la redirection ne cree PAS une chaine (/ → /fr-fr/ → /fr-fr via trailing slash rule)
- [ ] Verifier que les navigateurs sans Intl.DateTimeFormat ont un fallback (→ fr-fr par defaut ?)

### A37 — Hreflang des Profils

Les profils ont des slugs specifiques par langue. Les hreflang doivent pointer vers les bonnes URLs :

**Exemple** : Profil "Julien" avocat en Thailande
```
hreflang="fr" → /fr-fr/avocat-thailand/julien-k7m2p9
hreflang="en" → /en-us/lawyers/julien-k7m2p9
hreflang="es" → /es-es/abogado-thailand/julien-k7m2p9
hreflang="de" → /de-de/anwalt-thailand/julien-k7m2p9
```

- [ ] Verifier que le composant HreflangLinks sur les profils utilise les `slugs` multilingues (pas le slug FR pour tout)
- [ ] Verifier pour 10 profils que les 9 hreflang pointent vers des pages qui existent
- [ ] Verifier que le type de prestataire est traduit dans l'URL (avocat/lawyer/abogado/anwalt/etc.)
- [ ] Verifier que le pays dans l'URL est coherent (thailand dans toutes les langues ? ou traduit ?)

### A38 — Prevention Contamination Cross-Language

- [ ] Verifier la whitelist dans `sitemaps.ts` : seules les combinaisons valides passent
- [ ] Verifier que les combinaisons invalides sont redirigees dans `_redirects`
- [ ] Tester : `/fr-us/tarifs` → 301 vers `/fr-fr/tarifs` ✅
- [ ] Tester : `/es-fr/precios` → 301 vers `/es-es/precios` ✅
- [ ] Generer la matrice complete : 9 langues × tous les pays possibles → identifier les manquants

---

## PHASE 6 — Audit Noindex

Couverte par A10 et les verifications de la Phase 1.

Verifications supplementaires :
- [ ] `grep -r "noindex" sos/src/` : lister TOUTES les occurrences
- [ ] Verifier que SEOHead prop `noindex` n'est utilise que sur : NotFound, pages protegees
- [ ] Verifier que `index.html` a `<meta name="robots" content="index, follow">`
- [ ] Verifier qu'aucun header HTTP `X-Robots-Tag: noindex` n'est ajoute par Cloudflare ou Firebase
- [ ] Verifier `_headers` : aucune regle X-Robots-Tag
- [ ] Si React crash sur une page, l'utilisateur voit le fallback index.html → celui-ci a `index, follow` → Google indexe une page vide avec index,follow → SOFT 404 (pas noindex mais c'est pire)

---

## PHASE 7 — Audit Erreurs 5xx

Couverte par A11 et A12 dans la Phase 1.

Verifications supplementaires :
- [ ] Verifier que Cloudflare ne retourne pas de 5xx pour des URLs valides (erreur CDN)
- [ ] Verifier que les Cloud Functions ne sont pas throttled (quota vCPU, RAM, instances)
- [ ] Verifier que Firestore n'a pas de problemes de quota (lectures pour le cache SSR)
- [ ] Tester la charge : 10 requetes simultanees vers renderForBotsV2 → toutes reussissent ?

---

## PHASE 8 — Audit Soft 404 & Contenu Insuffisant

**Agents** : Couverte par A7, A10, A21
**Probleme central** : SPA + Cloudflare fallback = TOUJOURS HTTP 200, meme pour les pages vides

### Causes de Soft 404

| Cause | Symptome | Solution |
|-------|----------|----------|
| Puppeteer timeout | HTML avec spinner/loader seulement | Augmenter wait, ajouter selecteur |
| Profil desactive | Page sans donnees profil | Retourner 404 dans le renderer |
| Donnees Firestore manquantes | Template vide | Verifier avant rendu |
| React crash | index.html nu | Catch error, retourner 500 |
| Page non traduite | Contenu FR dans URL EN | Verifier contenu par langue |

### Contenu Minimum pour Indexation

Pour les profils prestataires, le HTML rendu DOIT contenir :
- [ ] Nom complet du prestataire (dans `<h1>`)
- [ ] Type (avocat/expat) et pays
- [ ] Au moins 1 phrase de description (> 50 mots)
- [ ] Specialites listees
- [ ] Langues parlees
- [ ] Note et nombre d'avis (si applicable)

**Si un profil n'a pas assez de contenu** : soit enrichir les donnees, soit exclure du sitemap temporairement.

### Detection des Soft 404 par le Renderer

Le renderer DOIT detecter les pages qui ne sont pas de vraies pages :
```javascript
// Dans renderForBotsV2, apres le rendu :
const title = await page.title();
const bodyText = await page.evaluate(() => document.body.innerText);

// Si le titre est le titre par defaut ou le body est quasi vide → soft 404
if (title === 'SOS Expat & Travelers - 24/7 Emergency Help Worldwide' && bodyText.length < 200) {
  return res.status(404).send(html); // Retourner 404, pas 200
}

// Si on detecte le composant 404 React
const is404 = await page.evaluate(() => !!document.querySelector('[data-page-not-found]'));
if (is404) {
  return res.status(404).send(html);
}
```

---

## PHASE 9 — Audit 404 & Liens Casses

Couverte par A26 et A30 dans la Phase 3.

Verifications supplementaires :
- [ ] Verifier que `NotFound.tsx` ajoute un attribut `data-page-not-found` au DOM pour la detection
- [ ] Verifier que les HTTP headers du renderer distinguent 200 et 404
- [ ] Pour les profils desactives : ajouter un trigger Firestore qui retire du cache SSR et du sitemap

---

## PHASE 10 — Audit Profils Prestataires (Pages Critiques)

**Ces pages representent ~90% des URLs du site. Leur indexation est la PRIORITE #1.**

### Verification de la Pipeline Complete

```
Firestore (sos_profiles) → Sitemap (sitemapProfiles) → Rendu (renderForBotsV2) → Google
```

Pour chaque etape, verifier :

**Etape 1 : Donnees Firestore**
- [ ] Combien de profils ont `isVisible=true AND isApproved=true AND isActive=true` ?
- [ ] Combien ont des `slugs` multilingues (objet) vs `slug` legacy (string) ?
- [ ] Combien ont une bio/description non vide ?
- [ ] Combien ont des specialites ?
- [ ] Combien ont une photo de profil accessible (pas de 404 sur l'image) ?
- [ ] Combien ont des avis ?

**Etape 2 : Presence dans le Sitemap**
- [ ] Nombre d'URLs dans sitemapProfiles = nombre de profils valides × 9 langues ?
- [ ] Ou certains profils n'ont pas toutes les langues (slugs manquants) ?
- [ ] Le sitemap exclut-il correctement les AAA ?

**Etape 3 : Rendu Puppeteer**
- [ ] Pour 20 profils aleatoires × 3 langues = 60 tests :
  - HTTP 200 ?
  - HTML > 2000 chars ?
  - Contient `<h1>` avec le nom ?
  - Contient `<meta description>` unique ?
  - Contient `<link canonical>` correct ?
  - Contient les 9 hreflang + x-default ?
  - Contient JSON-LD ProfessionalServiceSchema valide ?

**Etape 4 : Coherence**
- [ ] URL dans sitemap = canonical dans HTML ?
- [ ] Hreflang dans sitemap = hreflang dans HTML ?
- [ ] Slug dans URL = slug dans Firestore pour cette langue ?

### Meta Tags des Profils

Chaque profil DOIT avoir des meta tags UNIQUES :
```html
<!-- MAUVAIS (generique) -->
<title>SOS Expat - Provider Profile</title>
<meta name="description" content="Find a provider on SOS Expat"/>

<!-- BON (unique par profil) -->
<title>Julien D. - Avocat en Thailande | SOS Expat</title>
<meta name="description" content="Consultez Julien D., avocat francophone en Thailande. Specialise en droit de l'immigration et droit des affaires. 4.8/5 (23 avis). Disponible 24/7."/>
```

- [ ] Verifier que le title contient le nom + role + pays
- [ ] Verifier que la description est generee dynamiquement a partir des donnees du profil
- [ ] Verifier que la description varie entre profils (pas de template identique)

---

## PHASE 11 — Audit robots.txt & Headers HTTP

**Fichiers** : `sos/public/robots.txt`, `sos/public/_headers`

### robots.txt
- [ ] Accessible a `https://sos-expat.com/robots.txt` (HTTP 200)
- [ ] Ne bloque PAS les JS/CSS (Google en a besoin pour le rendering)
- [ ] Les sitemaps listes sont tous accessibles
- [ ] Pas de contradiction entre Allow et Disallow
- [ ] `Allow: /llms.txt` est present
- [ ] Les paths Disallow sont corrects (/dashboard, /admin, /profile/edit, etc.)

### Headers HTTP (_headers)
- [ ] Pas de `X-Robots-Tag` dans les headers
- [ ] `Cache-Control` correct : no-cache pour HTML, immutable pour assets
- [ ] `Content-Type: text/html; charset=utf-8` pour les pages HTML
- [ ] HSTS present et correct
- [ ] CSP ne bloque PAS les ressources Google (fonts, analytics, tag manager)

### Headers du Dynamic Renderer
- [ ] Verifier que `renderForBotsV2` retourne les bons headers :
  - `Content-Type: text/html; charset=utf-8`
  - Pas de `X-Robots-Tag`
  - `Cache-Control` pour les bots (public, max-age=86400 ?)

---

## PHASE 12 — Audit AI SEO / SAIO

**Agents** : A39, A40, A41, A49
**Objectif** : Maximiser la visibilite dans les reponses generees par IA (ChatGPT, Perplexity, Claude, Google AI Overview)

### A39 — llms.txt

- [ ] `https://sos-expat.com/llms.txt` est accessible (HTTP 200)
- [ ] Le contenu est a jour (services, prix, pays, langues)
- [ ] Les liens dans le fichier fonctionnent
- [ ] Format respecte la spec llms.txt (titre, description, sections)
- [ ] Proposer un `llms-full.txt` avec :
  - Liste complete des pays couverts
  - Tous les types de prestataires
  - Grille tarifaire detaillee
  - FAQ etendue
  - Cas d'usage types
  - Informations de contact par pays

### A40 — Meta Tags AI

Pour 10 pages types, verifier :
| Meta Tag | Valeur attendue | Present ? |
|----------|----------------|-----------|
| ai-crawlable | true | |
| content-quality | high/medium | |
| expertise | domain-specific value | |
| trustworthiness | high | |
| reading-time | X min | |
| last-reviewed | date recente | |
| citations | sources pertinentes | |

- [ ] Les valeurs sont-elles UNIQUES par page (pas toutes "high") ?
- [ ] `last-reviewed` est-il une date reelle (pas hardcodee) ?
- [ ] `expertise` est-il pertinent pour le contenu (legal pour avocats, expat pour expats) ?

### A41 — JSON-LD pour IA

Verifier que le JSON-LD enrichi contient :
- [ ] `ai:summary` : resume clair et informatif (pas generique)
- [ ] `estimatedReadingTime` : calculé a partir du contenu reel
- [ ] `contentQuality` : coherent avec le contenu
- [ ] `potentialAction: ReadAction` : present
- [ ] Le JSON est valide (pas de trailing comma, pas de undefined)

### A49 — Test d'Accessibilite AI

- [ ] Tester avec curl + User-Agent GPTBot → HTML complet retourne ?
- [ ] Tester avec curl + User-Agent ClaudeBot → HTML complet retourne ?
- [ ] Tester avec curl + User-Agent PerplexityBot → HTML complet retourne ?
- [ ] Le contenu rendu est-il comprehensible par un LLM ? (texte structure, pas de JS inline)
- [ ] Les donnees structurees sont-elles lisibles ? (JSON-LD valide)
- [ ] Le site apparait-il dans les reponses de Perplexity, ChatGPT, Google AI Overview ?
- [ ] Proposer des optimisations de contenu pour les citations AI :
  - Phrases factuelles claires (pas de jargon marketing)
  - Donnees chiffrees (197 pays, 9 langues, 24/7)
  - Reponses directes aux questions frequentes
  - Format Q&A dans les FAQ (facilite l'extraction)

---

## PHASE 13 — Audit Structured Data / JSON-LD

**Agents** : A42, A43, A44, A45, A46, A47

### A42 — Schema Profils

Pour 10 profils, valider avec https://validator.schema.org/ :
- [ ] @type = LegalService (avocats) ou ProfessionalService (expats)
- [ ] name, description, image sont remplis
- [ ] address.addressCountry est correct
- [ ] areaServed est correct
- [ ] aggregateRating present SEULEMENT si reviewCount > 0
- [ ] ratingValue est un nombre entre 1 et 5
- [ ] knowsLanguage est un tableau non vide
- [ ] hasOfferCatalog avec les specialites
- [ ] openingHours = 24/7

### A43 — FAQPage Schema

- [ ] @type = FAQPage
- [ ] mainEntity contient les bonnes questions
- [ ] Chaque Question a un acceptedAnswer avec texte
- [ ] Valide avec Google Rich Results Test
- [ ] Eligible pour les FAQ Rich Snippets dans les SERP

### A44 — Article Schema

- [ ] @type = Article
- [ ] headline correspond au titre de l'article
- [ ] author est specifie
- [ ] publisher avec logo
- [ ] datePublished et dateModified sont des dates ISO valides
- [ ] image est une URL accessible

### A45 — Breadcrumb Schema

- [ ] @type = BreadcrumbList
- [ ] Hierarchie correcte (Home > Category > Page)
- [ ] URLs absolues
- [ ] position incremente correctement (1, 2, 3...)

### A46 — Organization Schema

- [ ] @graph contient : Organization + WebSite + ProfessionalService
- [ ] SearchAction avec sitelinks searchbox
- [ ] logo avec dimensions
- [ ] contactPoint multi-langue
- [ ] aggregateRating sur ProfessionalService (PAS Organization)
- [ ] sameAs avec liens sociaux valides

### A47 — Review Schema

Pour 5 profils avec avis :
- [ ] Review @type correct
- [ ] ratingValue entre 1 et 5
- [ ] author specifie
- [ ] datePublished valide
- [ ] reviewBody present
- [ ] itemReviewed pointe vers le profil
- [ ] AggregateRating = moyenne correcte des reviews

---

## PHASE 14 — Audit Performance & Core Web Vitals

**Agent** : A48

### Mesures a Effectuer

Pour 5 pages types (homepage, profil, FAQ, tarifs, article) :

| Metrique | Seuil Google | Mesure |
|----------|-------------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | |
| INP (Interaction to Next Paint) | < 200ms | |
| CLS (Cumulative Layout Shift) | < 0.1 | |
| FCP (First Contentful Paint) | < 1.8s | |
| TTFB (Time to First Byte) | < 800ms | |

### Verifications Specifiques
- [ ] Preconnect vers les domaines critiques (Firestore, fonts, GTM)
- [ ] Preload de la police Inter (WOFF2)
- [ ] Lazy loading des images (attribut `loading="lazy"`)
- [ ] Code splitting : les chunks sont-ils raisonnablement petits ?
- [ ] Les images de profil sont-elles optimisees (WebP, dimensions correctes) ?
- [ ] Le CSS critique est-il inline ou preloade ?
- [ ] Pas de render-blocking JS (defer/async sur les scripts tiers)
- [ ] GA4 et Meta Pixel sont-ils differes correctement ?

### Impact sur le SEO
- [ ] Google utilise Core Web Vitals comme signal de ranking
- [ ] Un mauvais CLS peut degrader le positionnement
- [ ] Un LCP > 4s cause un downgrade significatif

---

## PHASE 15 — Audit Auto-Indexing & Soumission Automatique

**Agents** : A53, A54, A55, A56, A57
**Superviseur** : A6
**Fichiers principaux** : `seo/autoIndexingTriggers.ts`, `seo/googleIndexingService.ts`, `seo/indexNowService.ts`

### A53 — Google Indexing API

- [ ] Verifier que le service account a le scope `https://www.googleapis.com/auth/indexing`
- [ ] Verifier que le service account est ajoute comme proprietaire dans GSC (obligatoire pour l'Indexing API)
- [ ] Verifier les logs des 7 derniers jours : combien d'URLs soumises par jour ? Objectif = 200/jour
- [ ] Verifier les erreurs : 403 (permission denied) = service account non autorise, 429 (quota exceeded) = trop de soumissions, 400 (invalid URL) = URL mal formee
- [ ] Verifier que `submitBatchToGoogleIndexing` respecte le delai de 100ms entre requetes
- [ ] Verifier que le cursor pagination dans `scheduledBulkIndexing` fonctionne : (a) Reprend la ou il s'est arrete, (b) Recommence quand tous les profils sont traites, (c) Ne soumet PAS toujours les memes URLs
- [ ] Verifier que les URLs soumises sont des URLs CANONIQUES (fr-fr par defaut, pas des variantes regionales)
- [ ] Verifier que `getUrlIndexingStatus()` fonctionne et retourne des donnees utiles
- [ ] Proposer une strategie de priorisation : profils nouveaux > profils mis a jour > profils anciens jamais indexes

### A54 — IndexNow (Bing/Yandex)

- [ ] Verifier que `https://sos-expat.com/sosexpat2025indexnowkey.txt` est accessible (GET → 200)
- [ ] Verifier que le contenu du fichier est exactement `sosexpat2025indexnowkey` (pas de newline ni espace)
- [ ] Tester une soumission batch : envoyer 5 URLs et verifier le code retour (200 ou 202 = OK)
- [ ] Verifier que `generateBlogUrls(slug)` genere bien les 9 variantes de langue correctes
- [ ] Verifier que `generateLandingUrls(slug)` et `generateFaqUrls(slug)` font de meme
- [ ] **NOTE** : `generateProfileUrls` n'est PAS dans indexNowService.ts mais dans `autoIndexingTriggers.ts` sous le nom `generateProfileUrlsFromData`. Verifier que cette fonction est bien appelee par les triggers de profils et qu'elle soumet via IndexNow
- [ ] Verifier que les URLs generees correspondent au format exact des sitemaps
- [ ] Verifier que le batch de 10 000 URLs max n'est pas depasse

### A55 — Triggers Firestore Auto-Indexing

Pour CHAQUE trigger, verifier :

| Trigger | Collection | Condition | Actions attendues |
|---------|-----------|-----------|-------------------|
| onProfileCreated | sos_profiles | isVisible=true, isApproved=true | Google Indexing API + IndexNow + cache warm |
| onProfileUpdated | sos_profiles | transition hidden→public | Google Indexing API + IndexNow + invalide cache SSR toutes langues |
| onBlogPostCreated | blog_posts | isPublished=true | IndexNow blog URLs (9 langues) |
| onBlogPostUpdated | blog_posts | transition draft→published | IndexNow blog URLs + invalide cache |
| onHelpArticleCreated | help_articles | isPublished=true | IndexNow help URLs (9 langues) |
| onHelpArticleUpdated | help_articles | transition draft→published | IndexNow help URLs + invalide cache |
| onLandingPageCreated | landing_pages | isActive=true | IndexNow landing URLs (9 langues) |
| onLandingPageUpdated | landing_pages | transition inactive→active | IndexNow landing URLs + invalide cache |
| onFaqCreated | faqs | isActive=true | IndexNow FAQ URLs (9 langues) |
| onFaqUpdated | faqs | transition inactive→active | IndexNow FAQ URLs + invalide cache |

- [ ] Verifier que chaque trigger INVALIDE le cache SSR pour TOUTES les variantes de langue (pas seulement FR)
- [ ] Verifier que les triggers NE se declenchent PAS pour les profils AAA (test)
- [ ] Verifier que les triggers NE soumettent PAS de profils non approuves/non visibles
- [ ] Verifier les logs : les triggers se declenchent-ils reellement en production ?
- [ ] Verifier que la transition detection fonctionne (compare before/after pour isVisible, isApproved, isPublished, isActive)

### A56 — Crons SEO Planifies

| Cron | Horaire | Verifications |
|------|---------|---------------|
| scheduledSitemapPing | Quotidien 8h Paris | S'execute-t-il ? Le ping Google/Bing retourne-t-il 200 ? La detection de profils recents (24h) fonctionne-t-elle ? Si pas de profils recents, le ping est-il quand meme envoye ? |
| scheduledBulkIndexing | Quotidien 9h Paris | S'execute-t-il ? Combien d'URLs soumises par execution ? Le cursor avance-t-il ? Quelles langues sont couvertes (FR seulement ou toutes) ? Le quota 200/jour est-il atteint ? |
| scheduledSeoHealthCheck | Hebdo lundi 10h | S'execute-t-il ? Le rapport est-il envoye par Telegram ? Que contient le rapport ? (nombre pages indexees, erreurs, profils sans slug, etc.) |

- [ ] Verifier que les crons sont bien deployes et actifs dans Cloud Scheduler
- [ ] Verifier les logs des 30 derniers jours : executions reussies vs echouees
- [ ] Verifier que le bulk indexing couvre TOUTES les langues en rotation (pas seulement FR en boucle)
- [ ] Proposer : ajouter un cron de regeneration/warming du cache SSR (toutes les 12h)

### A57 — Pipeline Indexation Bout en Bout

Test de bout en bout pour un profil NEUF :
```
1. Creer un profil test (isVisible=true, isApproved=true, isActive=true)
2. Verifier que onProfileCreated se declenche (logs)
3. Verifier que Google Indexing API est appele avec les bonnes URLs
4. Verifier que IndexNow est appele (si implementé pour les profils)
5. Verifier que le cache SSR est pre-chauffe pour ce profil (toutes langues)
6. Verifier que le profil apparait dans sitemapProfiles
7. Verifier que le sitemap ping est envoye
8. Mesurer le delai entre creation et apparition dans Google (via GSC)
```

Test pour un profil DESACTIVE :
```
1. Desactiver un profil existant (isActive=false)
2. Verifier que onProfileUpdated se declenche
3. Verifier que le cache SSR est invalide pour ce profil
4. Verifier que le profil DISPARAIT du sitemap a la prochaine generation
5. Verifier que l'URL retourne HTTP 404 (pas 200 avec contenu vide)
6. Optionnel : soumettre URL_DELETED via Google Indexing API
```

---

## PHASE 16 — Audit Slugs & Optimisation URLs

**Agents** : A58, A59, A60, A61, A62
**Superviseur** : A7
**Fichiers principaux** : `sos/src/utils/slugGenerator.ts`, `sos/src/data/specialty-slug-mappings.ts`, `seo/migrateProfileSlugs.ts`

### A58 — Generation de Slugs

**Fichier** : `sos/src/utils/slugGenerator.ts` (1000+ lignes)

Tests de generation pour cas limites :
| Cas | Input | Slug attendu | Verification |
|-----|-------|-------------|--------------|
| Nom simple | Jean, lawyer, France | /fr-fr/avocat-france/jean-visa-k7m2p9 | ≤70 chars, lowercase |
| Nom avec accents | José María, lawyer, España | /es-es/abogado-espana/jose-maria-visa-x4n8q2 | Accents retires |
| Nom arabe | محمد, lawyer, Arabie Saoudite | /ar-sa/muhami-arabie-saoudite/mhmd-visa-r3t5w7 | Translitere ? |
| Nom chinois | 张伟, expat, Chine | /zh-cn/haiwai-zhongguo/zhang-wei-visa-p2k4m6 | Romanise ? |
| Nom tres long | Jean-Baptiste-Alexandre, lawyer, Republique Democratique du Congo | ≤70 chars | Tronque proprement |
| Specialite longue | Immigration + 5 autres | Premiere specialite seulement | Max 15 chars |

- [ ] Verifier `generateShortId(uid)` : (a) Deterministe (meme uid → meme shortId), (b) 6 chars exactement, (c) Alphabet 32 chars sans ambigus, (d) Pas de collisions sur 1000 UIDs de test
- [ ] Verifier que le regex d'extraction `/-([a-z0-9]{6})$/` fonctionne sur tous les formats de slug
- [ ] Verifier que les caracteres speciaux sont correctement nettoyes : `'`, `-`, `.`, `@`, `&`, etc.
- [ ] Verifier le comportement avec des noms vides ou null → pas de crash, slug valide par defaut

### A59 — Slugs Multilingues Complets

Pour 20 profils Firestore existants :
- [ ] Executer `generateMultilingualSlugs()` et verifier les 9 variantes
- [ ] Verifier que le ROLE est traduit dans chaque langue :
  ```
  FR: avocat | EN: lawyer | ES: abogado | DE: anwalt
  PT: advogado | RU: advokat | ZH: lushi | AR: muhami | HI: vakil
  ```
- [ ] Verifier que le PAYS est traduit dans chaque langue :
  ```
  Thailande (FR) | Thailand (EN) | Tailandia (ES) | Thailand (DE)
  Tailandia (PT) | Tailand (RU) | taiguo (ZH) | تايلاند (AR) | thaaeelaind (HI)
  ```
- [ ] Verifier que la SPECIALITE est traduite et ≤15 chars dans chaque langue
- [ ] Verifier l'unicite : pas deux profils avec le meme slug dans une langue
- [ ] Verifier la coherence : le shortId est le MEME dans toutes les langues (seul role+pays+specialite changent)

### A60 — Traductions des 197 Pays

**Fichier** : `COUNTRY_TRANSLATIONS` dans `slugGenerator.ts`

- [ ] Compter le nombre de pays : exactement 197 ?
- [ ] Pour chaque pays, verifier que les 9 langues ont une traduction
- [ ] Verifier les cas complexes :
  | Pays | FR | EN | Verification |
  |------|----|----|-------------|
  | Cote d'Ivoire | cote-divoire | ivory-coast | Apostrophe retiree |
  | Republique Tcheque | republique-tcheque | czech-republic | |
  | Arabie Saoudite | arabie-saoudite | saudi-arabia | |
  | Emirats Arabes Unis | emirats-arabes-unis | united-arab-emirates | Long ! |
  | Coree du Sud | coree-du-sud | south-korea | |
  | Papouasie-Nouvelle-Guinee | papouasie-nouvelle-guinee | papua-new-guinea | Tres long |
- [ ] Verifier qu'aucun slug de pays ne depasse 30 chars (sinon le slug total depasse 70)
- [ ] Verifier qu'il n'y a pas de doublons (deux pays avec le meme slug dans une langue)
- [ ] Verifier les traductions arabes/chinoises/hindi : sont-elles romanisees pour les URLs ?

### A61 — Slugs des Specialites

**Fichier** : `sos/src/data/specialty-slug-mappings.ts`

- [ ] Lister toutes les specialites avocat et types d'aide expat
- [ ] Pour chaque specialite, verifier les 9 traductions :
  | Code | FR | EN | ES | Max 15 chars ? |
  |------|----|----|----| |
  | IMMI_VISAS | visa | visa | visa | ✅ |
  | URG_PENAL | penal | criminal | penal | ✅ |
  | CUR_ADMIN | administratif | administrative | administrativo | ⚠️ 15 chars? |
- [ ] Verifier que les slugs de specialite sont SEO-friendly (descriptifs, pas de codes)
- [ ] Verifier que la premiere specialite du profil est utilisee dans le slug (pas une random)
- [ ] Proposer des ameliorations pour les slugs trop generiques (ex: "other" → specifique)

### A62 — Migration des Slugs Legacy

**Fichier** : `sos/firebase/functions/src/seo/migrateProfileSlugs.ts`

- [ ] Combien de profils ont encore le format legacy (`slug` string au lieu de `slugs` objet) ?
- [ ] Le script de migration a-t-il ete execute sur TOUS les profils ?
- [ ] Pour les profils migres : les anciens slugs ont-ils des redirections 301 dans `_redirects` ?
- [ ] Format legacy : `fr/avocat-thailand/melissa-...` → doit rediriger vers `/fr-fr/avocat-thailande/melissa-...-k7m2p9`
- [ ] Verifier que le script est idempotent (peut etre rejoue sans effets de bord)
- [ ] Verifier que le sitemap utilise les NOUVEAUX slugs (pas les legacy)
- [ ] Identifier les profils avec slug legacy ENCORE dans l'index Google → priorite pour redirection

---

## PHASE 17 — Audit Systeme Multilingue SEO Complet

**Agents** : A63, A64, A65, A66, A67, A68
**Superviseur** : A8
**Fichiers principaux** : `snippetGenerator.ts`, `useSnippetGenerator.ts`, `SEOHead.tsx`, `ProviderProfile.tsx`

### A63 — Snippet Generator (Featured Snippets / Position 0)

**Fichier** : `sos/src/utils/snippetGenerator.ts`

- [ ] Verifier les 6 templates FAQ par type (avocat/expat) × 9 langues = 108 templates
- [ ] Pour chaque template, verifier :
  - Variables {name}, {country}, {specialty} sont correctement substituees
  - La grammaire est correcte dans chaque langue (accord genre/nombre)
  - Le contenu est substantiel (pas juste une phrase)
  - Les prix sont corrects : avocat 49€/20min, expat 19€/30min
- [ ] Verifier que les meta descriptions generees sont :
  - ≤ 160 caracteres
  - Uniques par profil (incluent nom + pays + specialite)
  - Contiennent des mots-cles pertinents (avocat/lawyer + pays + specialite)
  - Sont dans la bonne langue
- [ ] Verifier les H1 tags localises :
  ```
  FR: "{name} - Avocat en {country}"
  EN: "{name} - Lawyer in {country}"
  ES: "{name} - Abogado en {country}"
  DE: "{name} - Anwalt in {country}"
  ```
- [ ] Verifier les H2 tags (5 sections) dans chaque langue
- [ ] Tester la generation pour 5 profils × 9 langues = 45 combinaisons

### A64 — Contenu Reel vs Duplique entre Langues

**PROBLEME POTENTIEL MAJEUR** : Si le body HTML est identique en FR et EN (seuls les meta changent), Google voit des doublons → "Exploree, non indexee"

Pour 10 profils × 3 langues (FR, EN, ES) :
1. Rendre chaque page avec Puppeteer
2. Extraire le texte visible (innerText du body)
3. Comparer le texte FR vs EN vs ES
4. **Si identique ou >80% similaire** : la page est un DOUBLON → Google ne l'indexera pas

Verifier specifiquement :
- [ ] La bio/description est-elle traduite ou identique en FR dans toutes les langues ?
- [ ] Les FAQ generees par snippetGenerator sont-elles dans la bonne langue ?
- [ ] Les labels (specialites, langues parlees, boutons) sont-ils traduits ?
- [ ] Le breadcrumb est-il dans la bonne langue ?
- [ ] Les reviews sont-elles affichees dans leur langue d'origine ou toujours en FR ?

**Si le contenu est principalement en FR pour toutes les langues** :
- Option A : Traduire reellement le contenu (bios, descriptions) → meilleur pour SEO
- Option B : Utiliser `hreflang` pour indiquer que c'est la meme page en plusieurs langues → canonical vers FR
- Option C : N'indexer que les langues avec du vrai contenu traduit → retirer les autres du sitemap

### A65 — Fallback Traductions & Impact SEO

**Type LocalizedText** : `Record<string, string>` avec fallback FR → EN → premiere dispo

Scenarios a tester :
| Scenario | Comportement | Impact SEO |
|----------|-------------|------------|
| Bio en FR uniquement | Pages EN/ES/DE affichent bio FR | DOUBLON → non indexe |
| Bio en FR + EN | Pages ES/DE affichent bio EN (fallback) | Doublon partiel |
| Bio dans les 9 langues | Chaque page a un contenu unique | IDEAL |
| Pas de bio du tout | Page avec template generique | Thin content → soft 404 |
| Slug manquant en DE | Page DE n'existe pas | Doit etre EXCLU du sitemap + hreflang |

- [ ] Combien de profils ont une bio dans les 9 langues ? → Probablement tres peu
- [ ] Combien ont une bio en FR seulement ? → Probablement la majorite
- [ ] Quelle strategie adopter pour les pages avec bio non traduite ?
- [ ] Les pages avec fallback doivent-elles avoir canonical → version FR ?
- [ ] Les snippets FAQ (generes automatiquement) compensent-ils le manque de bio traduite ?

### A66 — Hook useSnippetGenerator

- [ ] Verifier que `useMemo` est correctement configure (dependencies : [provider, locale])
- [ ] Verifier que si `provider === null`, le hook retourne `null` sans crash
- [ ] Verifier que le JSON-LD retourne par le hook est valide (schema.org)
- [ ] Verifier que les snippets sont injectes dans le DOM (FAQ section visible)
- [ ] Verifier que Puppeteer attend assez longtemps pour que les snippets soient rendus
- [ ] Tester : changer la locale dynamiquement → les snippets se regenerent-ils dans la bonne langue ?

### A67 — Meta Titles & Descriptions : Unicite Absolue

**C'est un facteur MAJEUR de "Page en double"**

Script de test :
```bash
# Extraire les titles de 150 pages (50 profils × 3 langues)
# Stocker dans un fichier CSV : URL, title, description
# Detecter les doublons exacts et quasi-doublons (Levenshtein < 10)
```

Verifications :
- [ ] ZERO doublon exact de `<title>` entre deux pages
- [ ] ZERO doublon exact de `<meta description>` entre deux pages
- [ ] Chaque title contient : NOM + ROLE traduit + PAYS traduit
- [ ] Chaque title est dans la bonne LANGUE
- [ ] Chaque description fait 80-160 chars
- [ ] Les descriptions contiennent des mots-cles pertinents pour la langue cible
- [ ] Les descriptions ne sont pas des templates generiques identiques ("Consultez [nom] sur SOS Expat")

### A68 — Coherence Multilingue de Bout en Bout

**Test ultime** : Pour 5 profils COMPLETS (avec bio, reviews, specialites), dans les 9 langues :

| Element | FR | EN | ES | DE | ... | Coherent ? |
|---------|----|----|----|----|-----|-----------|
| Slug URL | /fr-fr/avocat-thailande/... | /en-us/lawyer-thailand/... | /es-es/abogado-tailandia/... | /de-de/anwalt-thailand/... | | Role + pays traduits |
| Sitemap URL | Identique au slug | | | | | |
| Hreflang FR | Self-referencing | Pointe vers FR | Pointe vers FR | Pointe vers FR | | Reciproque |
| Canonical | https://sos-expat.com/fr-fr/... | https://sos-expat.com/en-us/... | https://sos-expat.com/es-es/... | | | Self-referencing |
| `<title>` | "Jean - Avocat en Thaïlande" | "Jean - Lawyer in Thailand" | "Jean - Abogado en Tailandia" | | | Langue correcte |
| `<meta desc>` | Unique FR | Unique EN | Unique ES | | | ≤160 chars, langue correcte |
| H1 | "Jean - Avocat..." | "Jean - Lawyer..." | "Jean - Abogado..." | | | Langue correcte |
| JSON-LD name | "Jean" | "Jean" | "Jean" | | | Identique |
| JSON-LD @type | LegalService | LegalService | LegalService | | | Identique |
| JSON-LD country | "Thaïlande" | "Thailand" | "Tailandia" | | | Traduit |
| Breadcrumb | Accueil > Avocats > Thaïlande | Home > Lawyers > Thailand | Inicio > Abogados > Tailandia | | | Traduit |
| FAQ Schema | 6 Q&A en FR | 6 Q&A en EN | 6 Q&A en ES | | | Contenu unique par langue |
| Bio/Description | Texte FR | Texte EN ou fallback FR | Texte ES ou fallback | | | Traduit si possible |

Si UN SEUL element est incoherent (ex: breadcrumb EN avec "Avocats" au lieu de "Lawyers"), c'est un bug qui degrade le SEO.

---

## PHASE 18 — Cross-Checks & Tests de Validation

**Agent** : A69 (Validateur Final)

### Cross-Check 1 : Sitemaps ↔ Redirections
```
Pour chaque URL dans tous les sitemaps :
  Tester si l'URL est capturee par une regle de _redirects
  Si oui → ERREUR : URL dans sitemap qui redirige
  Action : retirer du sitemap OU retirer la redirection
```

### Cross-Check 2 : Sitemaps ↔ Noindex
```
Pour chaque URL dans tous les sitemaps :
  Rendre avec Puppeteer
  Verifier que meta robots != noindex
  Si noindex → ERREUR CRITIQUE
  Action : retirer du sitemap OU retirer le noindex
```

### Cross-Check 3 : Hreflang ↔ Canonical
```
Pour chaque page :
  Les URLs dans les hreflang doivent etre des URLs canoniques
  Si un hreflang pointe vers une URL non-canonique → ERREUR
  Exemple : hreflang pointe vers /fr-be/tarifs mais le canonical est /fr-fr/tarifs
```

### Cross-Check 4 : Hreflang ↔ Sitemaps
```
Les hreflang dans le HTML doivent matcher ceux dans le sitemap
Pour 30 URLs :
  Comparer les deux sets de hreflang
  Si differents → ERREUR
```

### Cross-Check 5 : Hreflang Reciprocite Globale
```
Pour 10 pages dans chaque langue (90 pages total) :
  Verifier la reciprocite bidirectionnelle
  Page FR → EN et EN → FR (et les 7 autres)
```

### Cross-Check 6 : Canonical ↔ Sitemaps
```
Pour chaque URL dans le sitemap :
  Le canonical de cette page doit pointer vers cette meme URL
  Si le canonical pointe ailleurs → l'URL du sitemap est mauvaise
```

### Cross-Check 7 : 404 Detection ↔ Renderer
```
Tester 10 URLs inexistantes :
  Le renderer retourne-t-il HTTP 404 (pas 200) ?
  Le HTML contient-il quand meme les meta noindex ?
```

### Cross-Check 8 : Cache ↔ Code
```
Apres un deploiement frontend :
  Le cache SSR sert-il l'ancien HTML ?
  Les meta tags dans le cache sont-ils a jour ?
  Faut-il invalider le cache a chaque deploy ?
```

### Cross-Check 9 : Profils Desactives ↔ Sitemaps
```
Si un profil passe de isActive=true a false :
  Est-il retire du sitemap a la prochaine generation ?
  Le cache SSR est-il invalide pour ce profil ?
  L'URL retourne-t-elle 404 (pas 200 avec contenu vide) ?
```

### Cross-Check 10 : AI Bots ↔ Rendering
```
Pour 5 AI bots (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Amazonbot) :
  Tester le rendering via renderForBotsV2
  Verifier que le HTML retourne est complet
  Verifier que les meta AI sont presentes
  Verifier que le JSON-LD enrichi est present
```

### Cross-Check 11 : Slugs Firestore ↔ Sitemaps ↔ URLs reelles
```
Pour 50 profils :
  Lire slugs{} depuis Firestore
  Pour chaque langue :
    Construire l'URL attendue depuis le slug
    Verifier que cette URL est dans le sitemap
    Verifier que cette URL retourne HTTP 200
    Verifier que le canonical de cette URL correspond
  Si un slug est manquant pour une langue :
    Verifier que cette langue est ABSENTE du sitemap
    Verifier que cette langue est ABSENTE des hreflang
```

### Cross-Check 12 : Auto-Indexing ↔ Sitemaps ↔ Rendering
```
Pour 10 profils recemment crees (< 7 jours) :
  Verifier que onProfileCreated a fire (logs)
  Verifier que Google Indexing API a ete appele
  Verifier que le profil est dans le sitemap
  Verifier que le cache SSR est chaud (L2 Firestore)
  Verifier que le rendu Puppeteer retourne 200 + contenu complet
```

### Cross-Check 13 : Slugs Legacy ↔ Redirections
```
Pour tous les profils avec slug legacy (string) :
  Construire l'URL legacy : /fr/avocat-thailand/...
  Verifier qu'une redirection 301 existe dans _redirects
  Verifier que la destination est le nouveau slug multilingue
  Verifier que la destination retourne HTTP 200
```

### Cross-Check 14 : Traductions Pays ↔ Sitemaps ↔ Slugs
```
Pour 20 pays × 9 langues :
  Verifier que le nom traduit dans COUNTRY_TRANSLATIONS
  correspond exactement au segment pays dans les URLs du sitemap
  Exemples :
    FR: "thailande" = /fr-fr/avocat-thailande/...
    EN: "thailand" = /en-us/lawyer-thailand/...
    ES: "tailandia" = /es-es/abogado-tailandia/...
```

### Cross-Check 15 : Snippet Generator ↔ HTML Rendu
```
Pour 5 profils × 3 langues :
  Generer les snippets avec snippetGenerator
  Rendre la page avec Puppeteer
  Verifier que :
    - Le H1 genere par snippet = H1 dans le HTML
    - La meta description generee = meta description dans le HTML
    - Les FAQ generees = FAQ dans le JSON-LD
    - Le contenu est dans la BONNE LANGUE (pas FR partout)
```

### Cross-Check 16 : IndexNow ↔ Sitemaps Coherence
```
Pour chaque type de contenu (blog, landing, FAQ) :
  Comparer les URLs generees par generateBlogUrls/generateLandingUrls/generateFaqUrls
  avec les URLs dans les sitemaps correspondants
  Format, locale, slugs doivent etre IDENTIQUES
  Si IndexNow soumet une URL differente du sitemap → Google voit une incoherence
```

### Cross-Check 17 : Contenu Duplique Inter-Langues
```
Pour 20 profils × 2 paires de langues (FR-EN, FR-ES) :
  Rendre les deux versions
  Extraire le texte visible (body innerText)
  Calculer la similarite (Jaccard ou cosine)
  Si similarite > 80% → DOUBLON → Google ne va indexer qu'une version
  Documenter : quels profils ont du contenu traduit vs contenu FR en fallback
```

### Cross-Check 18 : Quota Google Indexing API ↔ Couverture
```
Avec 200 URLs/jour et 2000+ pages :
  Combien de jours pour tout soumettre ? (10+ jours)
  Quelle strategie de priorisation ?
  Les profils les plus importants sont-ils soumis en premier ?
  Les nouvelles pages sont-elles priorisees ?
  Le cursor de pagination avance-t-il correctement ?
```

### Script de Test Global

```bash
#!/bin/bash
# test-seo-indexability.sh
# Teste l'indexabilite de N URLs

RENDER_URL="https://europe-west1-sos-urgently-ac307.cloudfunctions.net/renderForBotsV2"
SITE_URL="https://sos-expat.com"

# URLs a tester
URLS=(
  "/fr-fr/"
  "/en-us/"
  "/fr-fr/tarifs"
  "/en-us/pricing"
  "/fr-fr/faq"
  "/fr-fr/centre-aide"
  # Ajouter des profils reels
)

for path in "${URLS[@]}"; do
  echo "=== Testing: $path ==="

  # 1. Test HTTP status
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: Googlebot" \
    "$RENDER_URL?path=$path&url=$SITE_URL$path&bot=Googlebot")
  echo "  HTTP Status: $STATUS"

  # 2. Test content
  HTML=$(curl -s \
    -H "User-Agent: Googlebot" \
    "$RENDER_URL?path=$path&url=$SITE_URL$path&bot=Googlebot")

  # Check title
  TITLE=$(echo "$HTML" | grep -oP '<title>\K[^<]+')
  echo "  Title: $TITLE"

  # Check canonical
  CANONICAL=$(echo "$HTML" | grep -oP 'rel="canonical" href="\K[^"]+')
  echo "  Canonical: $CANONICAL"

  # Check noindex
  if echo "$HTML" | grep -q "noindex"; then
    echo "  ⚠️  NOINDEX DETECTED!"
  fi

  # Check hreflang count
  HREFLANG_COUNT=$(echo "$HTML" | grep -c 'hreflang=')
  echo "  Hreflang count: $HREFLANG_COUNT (expected: 10)"

  # Check JSON-LD
  JSONLD_COUNT=$(echo "$HTML" | grep -c 'application/ld+json')
  echo "  JSON-LD blocks: $JSONLD_COUNT"

  # Check content length
  CONTENT_LEN=${#HTML}
  echo "  Content length: $CONTENT_LEN chars"

  if [ $CONTENT_LEN -lt 1000 ]; then
    echo "  ⚠️  POSSIBLE SOFT 404 (content too short)"
  fi

  echo ""
done
```

---

## PHASE 19 — Plan d'Action & Deploiement

### Priorisation des Corrections

**P0 — CRITIQUE (a faire IMMEDIATEMENT)** :
| # | Probleme | Impact GSC | Fichier | Agent |
|---|----------|-----------|---------|-------|
| 1 | Renderer ne retourne pas 404 pour pages inexistantes | Soft 404 massif | dynamicRender.ts | A10 |
| 2 | Noindex involontaire sur pages publiques | Pages exclues | SEOHead.tsx | A6 (Phase 6) |
| 3 | Erreurs 5xx Puppeteer sans fallback | Pages non indexees | dynamicRender.ts | A11, A12 |
| 4 | URLs dans sitemaps qui redirigent | "Page avec redirection" | sitemaps.ts, _redirects | A21, A25 |

**P1 — IMPORTANT (a faire dans la semaine)** :
| # | Probleme | Impact GSC | Fichier | Agent |
|---|----------|-----------|---------|-------|
| 5 | Chaines de redirections | Crawl budget gaspille | _redirects | A23 |
| 6 | Canonical manquant/incorrect | "Page en double" | SEOHead.tsx | A27, A28 |
| 7 | Hreflang non reciproques | Hreflang ignores | HreflangLinks.tsx, sitemaps.ts | A31, A32 |
| 8 | Profils desactives dans sitemap | 404 dans GSC | sitemaps.ts | A17 |
| 9 | Liens internes casses | 404 dans GSC | Composants nav | A30 |
| 10 | Cache SSR perime apres deploy | Meta tags obsoletes | dynamicRender.ts | A9 |

**P2 — OPTIMISATION (a faire dans le mois)** :
| # | Probleme | Impact | Fichier | Agent |
|---|----------|--------|---------|-------|
| 11 | Contenu profils insuffisant | "Exploree, non indexee" | ProviderProfile.tsx | A8 (Phase 8) |
| 12 | Meta descriptions identiques | "Page en double" | SEOHead.tsx | A10 (Phase 10) |
| 13 | Structured data incomplet | Pas de rich snippets | components/seo/*.tsx | A42-A47 |
| 14 | Core Web Vitals | Ranking signal | Vite config, composants | A48 |
| 15 | llms-full.txt manquant | Visibilite AI | public/ | A39 |
| 16 | IndexNow pour Bing | Indexation plus rapide | Nouveau fichier | A22 |

### Protocole de Deploiement

```
1. AVANT toute modification :
   - Sauvegarder _redirects, dynamicRender.ts, sitemaps.ts, SEOHead.tsx
   - Prendre un snapshot du cache SSR (Firestore ssr_cache)
   - Noter le nombre de pages indexees dans GSC

2. Deployer les corrections :
   a. Frontend (Cloudflare Pages) : git push main → auto-deploy
   b. Backend (Firebase Functions) : rm -rf lib && npm run build && firebase deploy --only functions

3. APRES deploiement :
   - Invalider TOUT le cache SSR (invalidateCacheEndpoint avec clearAll)
   - Executer warm-ssr-cache.js (--all)
   - Verifier 10 URLs critiques avec le script de test
   - Soumettre les sitemaps dans GSC
   - Demander la revalidation des erreurs corrigees dans GSC

4. MONITORING (7 jours suivants) :
   - Verifier GSC quotidiennement pour nouvelles erreurs
   - Verifier les logs Cloud Functions pour 5xx
   - Verifier le nombre de pages indexees (doit augmenter)
```

---

## REGLES ABSOLUES (NE JAMAIS VIOLER)

1. **NE JAMAIS casser les hreflang existants** — Si tu modifies un hreflang, verifier la reciprocite dans TOUTES les 9 langues
2. **NE JAMAIS supprimer une redirection** sans verifier que l'URL n'est pas dans l'index Google
3. **NE JAMAIS changer le format des URLs** sans mettre en place les redirections 301 correspondantes
4. **NE JAMAIS modifier les slugs existants** des profils — Creer des redirections si necessaire
5. **NE JAMAIS ajouter noindex** sur une page de profil, article, ou page publique
6. **TOUJOURS tester le rendu Puppeteer** apres chaque modification SEO
7. **TOUJOURS verifier la coherence** sitemaps ↔ redirections ↔ canonicals ↔ hreflang
8. **TOUJOURS conserver la compatibilite multilingue** — Les 9 langues doivent fonctionner identiquement
9. **NE JAMAIS deployer** sans avoir verifie au minimum 3 URLs par type × 3 langues
10. **PRIORITE ABSOLUE : les profils prestataires** — ~90% des pages, leur indexation est critique
11. **NE JAMAIS modifier index.html** sans verifier le script de redirection locale, le noscript, et les meta defaults
12. **NE JAMAIS toucher au SPA fallback** (`/* /index.html 200`) — il DOIT rester en dernier dans `_redirects`
13. **TOUJOURS invalider le cache SSR** apres un deploiement frontend
14. **NE JAMAIS casser la conversion ch↔zh** pour le chinois
15. **TOUJOURS verifier que les sitemaps dynamiques retournent du XML valide** apres modification

---

## OUTPUT ATTENDU PAR AGENT

Chaque agent produit un rapport structure :

```markdown
## Rapport Agent [A##] — [Nom de l'Agent]

### Resume
- Total verifications : XX
- Reussies : XX ✅
- Echouees : XX ❌
- Attention : XX ⚠️

### Problemes Trouves
| # | Severite | Description | Fichier | Ligne | Fix Propose |
|---|----------|-------------|---------|-------|-------------|
| 1 | P0 | ... | ... | ... | ... |

### Verifications Detaillees
- [ ] ✅ Check 1 : description
- [ ] ❌ Check 2 : description → PROBLEME : details
- [ ] ⚠️ Check 3 : description → ATTENTION : details

### Code de Correction (si applicable)
\`\`\`typescript
// Fichier : ...
// Avant :
ancien code
// Apres :
nouveau code
\`\`\`
```

Le **Validateur Final (A50)** produit :
1. **Rapport consolide** avec tous les problemes tries par severite
2. **Plan d'action ordonne** avec dependances entre les corrections
3. **Checklist de deploiement** avec les etapes post-deploy
4. **Script de test** personalise pour les URLs problematiques
5. **Dashboard de suivi** : nombre de pages par statut (indexee, erreur, exclue)

---

## FICHIERS CLES — REFERENCE RAPIDE

| Fichier | Chemin | Role |
|---------|--------|------|
| Dynamic Render | `sos/firebase/functions/src/seo/dynamicRender.ts` | Rendu Puppeteer pour bots |
| Sitemaps | `sos/firebase/functions/src/seo/sitemaps.ts` | 4 sitemaps dynamiques |
| Sitemap Ping | `sos/firebase/functions/src/seo/sitemapPingService.ts` | Ping Google/Bing |
| SEOHead | `sos/src/components/layout/SEOHead.tsx` | Meta tags, canonical, OG, AI |
| HreflangLinks | `sos/src/multilingual-system/components/HrefLang/HreflangLinks.tsx` | Hreflang links |
| HrefLangConstants | `sos/src/multilingual-system/components/HrefLang/HrefLangConstants.ts` | Locale mappings |
| Locale Routes | `sos/src/multilingual-system/core/routing/localeRoutes.ts` | Slug translation |
| Redirections | `sos/public/_redirects` | 240+ redirections Cloudflare |
| robots.txt | `sos/public/robots.txt` | Regles de crawl |
| Headers | `sos/public/_headers` | Headers HTTP |
| Sitemap Index | `sos/public/sitemap.xml` | Index des sitemaps |
| Sitemap Static | `sos/public/sitemap-static.xml` | Pages statiques |
| llms.txt | `sos/public/llms.txt` | AI SEO |
| index.html | `sos/index.html` | Template HTML |
| NotFound | `sos/src/pages/NotFound.tsx` | Page 404 |
| ProviderProfile | `sos/src/pages/ProviderProfile.tsx` | Page profil |
| App Routes | `sos/src/App.tsx` | Toutes les routes |
| Warm Cache | `sos/scripts/warm-ssr-cache.js` | Prechauffage SSR |
| ArticleSchema | `sos/src/components/seo/ArticleSchema.tsx` | Schema articles |
| BreadcrumbSchema | `sos/src/components/seo/BreadcrumbSchema.tsx` | Schema breadcrumbs |
| FAQPageSchema | `sos/src/components/seo/FAQPageSchema.tsx` | Schema FAQ |
| LocalBusinessSchema | `sos/src/components/seo/LocalBusinessSchema.tsx` | Schema business |
| OrganizationSchema | `sos/src/components/seo/OrganizationSchema.tsx` | Schema organisation |
| ProfessionalServiceSchema | `sos/src/components/seo/ProfessionalServiceSchema.tsx` | Schema profils |
| ProviderSchemaUtils | `sos/src/components/seo/ProviderSchemaUtils.ts` | Utilitaires schema |
| ReviewSchema | `sos/src/components/seo/ReviewSchema.tsx` | Schema avis |
| ServiceSchema | `sos/src/components/seo/ServiceSchema.tsx` | Schema services |
| VideoSchema | `sos/src/components/seo/VideoSchema.tsx` | Schema video |
| **Auto-Indexing Triggers** | `sos/firebase/functions/src/seo/autoIndexingTriggers.ts` | Triggers Firestore + crons SEO |
| **Google Indexing API** | `sos/firebase/functions/src/seo/googleIndexingService.ts` | Soumission 200 URLs/jour Google |
| **IndexNow Service** | `sos/firebase/functions/src/seo/indexNowService.ts` | Soumission instantanee Bing/Yandex |
| **Slug Generator** | `sos/src/utils/slugGenerator.ts` | Generation slugs multilingues (1000+ lignes) |
| **Specialty Slugs** | `sos/src/data/specialty-slug-mappings.ts` | Traductions specialites pour slugs |
| **Slug Migration** | `sos/firebase/functions/src/seo/migrateProfileSlugs.ts` | Migration slugs legacy → multilingues |
| **Snippet Generator** | `sos/src/utils/snippetGenerator.ts` | Featured Snippets, FAQ, meta desc par langue |
| **useSnippetGenerator** | `sos/src/hooks/useSnippetGenerator.ts` | Hook React pour snippets memoises |
| **IndexNow Key File** | `sos/public/sosexpat2025indexnowkey.txt` | Cle d'authentification IndexNow |
| **SEO Module Index** | `sos/firebase/functions/src/seo/index.ts` | Exports de tous les modules SEO |
