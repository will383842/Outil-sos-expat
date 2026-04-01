<role>
Tu es un architecte SEO technique de calibre mondial, spécialisé dans les sites multilingues massifs à SEO programmatique. Tu as 15+ ans d'expérience en indexation à grande échelle, hreflang, crawl budget optimization, et AEO (Answer Engine Optimization). Tu connais intimement le fonctionnement de Googlebot, les signaux de qualité, et les stratégies anti-duplication pour les sites à explosion combinatoire (langues × pays × profils).
</role>

<objective>
Réaliser un audit SEO complet, ultra précis et directement actionnable du site SOS-Expat (sos-expat.com).

Objectif chiffré : passer de ~351 pages indexées à 3000+ pages indexées sur Google, de manière contrôlée, progressive, qualitative et scalable.

Focus prioritaire : les profils prestataires (avocats + helpers expat) et les pages pays sont le coeur commercial — ils doivent être indexés en premier et en totalité.
</objective>

<context>
<site_overview>
SOS-Expat est une marketplace multilingue connectant expatriés, voyageurs et digital nomads avec des avocats et helpers expat dans 197 pays, via consultation instantanée par appel.

Chiffres clés :
- 9 langues : FR (priorité 1), EN (priorité 2), ES, DE, PT, RU, ZH, AR, HI
- 197 pays couverts
- ~6000 URLs soumises dans Google Search Console
- ~351 pages indexées (taux 5.8% — CRITIQUE)
- Pilotage TOTAL de l'indexation voulu (pas aléatoire)
</site_overview>

<page_types>
Par priorité SEO descendante :

P0 — CRITIQUE :
1. Profils prestataires (avocats + expats) : ~77 actifs × 9 langues = ~693 URLs
   Exemple : /fr-fr/avocat-tunisie/khadija-droit-famille-k8m2
2. Pages pays (listings par pays) : ~2205 URLs (pays × langue où providers existent)
   Exemple : /fr-fr/avocats-en-thailande/

P1 :
3. Pages statiques (pricing, FAQ, how-it-works) : ~35 types × 9 langues = ~315
4. Blog articles (Laravel SSR, VPS séparé) : variable, croissant

P2 :
5. Pages aide / FAQ détaillées : variable
6. Landing affiliés (chatter, blogger, influencer, captain, partner) : ~54

P3 :
7. Pages légales (CGU, privacy, cookies) : 27
</page_types>

<tech_stack>
| Composant | Technologie |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite (SPA) |
| Hosting frontend | Cloudflare Pages (PAS Firebase Hosting) |
| Bot detection + SSR routing | Cloudflare Worker (145+ user-agents, 200+ regex patterns) |
| SSR/Pre-rendering | Firebase Cloud Function renderForBotsV2 (Puppeteer) |
| Backend | Firebase Cloud Functions (3 régions EU/US) |
| Base de données | Firestore (nam7, Iowa) |
| Blog | Laravel 12 SSR (VPS Hetzner séparé) |
| Sitemaps | 5 Cloud Functions dynamiques |
| Auto-indexing | Google Indexing API + IndexNow (Bing/Yandex) |
| Structured data | JSON-LD React components (9 types de schema) |
| i18n | react-intl + react-helmet-async |
| SEO content generation | Claude API (meta tags, FAQs, descriptions, AEO summaries) |
</tech_stack>

<provider_profiles>
LE COEUR DU SITE — Chaque profil prestataire est la page la plus importante.

2 types :
- Avocats : consultation 49€/20min, spécialités juridiques (immigration, droit famille, fiscalité, business...)
- Helpers expat : consultation 19€/30min, aide pratique (logement, démarches admin, installation...)

Données par profil :
- Prénom uniquement (vie privée)
- Pays d'exercice + operatingCountries[] (multi-pays)
- Langues parlées → détermine dans quelles versions linguistiques le profil apparaît
- Spécialités/types d'aide (traduits en 9 langues)
- Note moyenne, nombre d'avis, nombre d'appels, taux de réussite
- Description (auto-traduite en 9 langues via Claude API)
- Photo de profil

SEO déjà implémenté sur chaque profil :
- Meta title/description auto-générés par Claude API (stockés dans seo_optimized/{locale})
- FAQs uniques auto-générées (5-6 questions par profil par langue)
- Slugs localisés en 9 langues : provider.slugs[lang]
- Hreflang 9 langues + x-default (français)
- Canonical self-referencing
- JSON-LD : ReviewSchema, BreadcrumbSchema, FAQPageSchema, ProfessionalServiceSchema/LocalBusinessSchema, OfferSchema
- Open Graph complet
- Keywords auto-générés (10-15 par langue)
- aiSummary + aiKeyFacts pour AEO (ChatGPT, Perplexity, Google AI Overview)

Format des slugs :
/{locale}/{role-type-localisé}/{prénom}-{spécialité-courte}-{shortid}
/fr-fr/avocat-tunisie/khadija-droit-famille-k8m2
/en-us/lawyer-tunisia/khadija-family-law-k8m2
/de-de/anwalt-tunesien/khadija-familienrecht-k8m2

RÈGLE ABSOLUE SLUGS NON-LATIN :
Les slugs doivent TOUJOURS être en caractères ASCII/Latin romanisés, même pour les langues arabes, hindi, chinoises, russes. JAMAIS de caractères Unicode dans les slugs.
Mauvais : /ar-sa/محامي-تونس/خديجة-قانون-الأسرة-k8m2
Correct  : /ar-sa/muhami-tunis/khadija-qanun-usra-k8m2
Correct  : /hi-in/vakil-tunisia/khadija-parivar-kanoon-k8m2
Correct  : /zh-cn/lushi-tunisia/khadija-jiating-fa-k8m2

Raisons : lisibilité universelle, copier-coller, analytics, partage sur réseaux sociaux, éviter l'encodage %XX dans les logs, compatibilité outils SEO tiers.
</provider_profiles>

<country_pages>
Chaque page pays liste les prestataires disponibles dans ce pays + cette langue :
/fr-fr/avocats-en-thailande/
/en-us/lawyers-in-thailand/
/es-es/abogados-en-tailandia/
/ar-sa/محامون-في-تايلاند/

Logique matrice : un avocat arabophone en Thaïlande apparaît dans /ar-sa/ et /fr-fr/ (s'il parle français) mais PAS dans /de-de/ (ne parle pas allemand).
Pagination : 20 prestataires par page.
Slugs pays traduits en 9 langues (247 pays dans country-slug-translations.ts).
</country_pages>

<current_sitemaps>
sitemap.xml                        → sitemap index master
sitemaps/profiles.xml              → TOUS les profils (avec hreflang 9 langues) — NON segmenté
sitemaps/country-listings.xml      → pages pays (~2205 URLs) — NON segmenté
sitemaps/help.xml                  → articles centre d'aide
sitemaps/faq.xml                   → pages FAQ
sitemaps/articles-{lang}.xml       → articles blog (Laravel, par langue)
sitemaps/categories-{lang}.xml     → catégories blog
sitemaps/tags-{lang}.xml           → tags blog
sitemaps/countries-{lang}.xml      → pages pays blog
</current_sitemaps>

<current_hreflang>
- Implémenté en HTML (link rel="alternate" via HreflangLinks.tsx)
- Implémenté dans sitemaps XML (xhtml:link rel="alternate")
- x-default → version française
- 9 locales : fr-FR, en-US, es-ES, de-DE, pt-PT, ru-RU, zh-CN, ar-SA, hi-IN
</current_hreflang>

<current_robots_txt>
- Googlebot : Crawl-delay: 0 (crawl agressif autorisé)
- Default : Crawl-delay: 1
- Bots IA (GPTBot, ClaudeBot, PerplexityBot) : Allow + Crawl-delay: 2
- Scrapers SEO (Ahrefsbot, Semrushbot) : Disallow
- Dashboard/admin/API : Disallow
- 12 sitemaps déclarés
</current_robots_txt>

<current_auto_indexing>
- onProfileCreated (trigger Firestore) → génère 9 URLs profil → soumet IndexNow + Google Indexing API (max 10 URLs, quota 200/jour)
- onProfileUpdated → invalide cache SSR + re-soumet si profil devenu visible
- Sitemap pings quotidiens/hebdomadaires
</current_auto_indexing>

<known_bugs>
1. CRITIQUE : Canonical tronqué sur certains profils (slug pas entièrement stocké en Firestore)
2. CRITIQUE : Meta description EN affichée sur pages FR (index.html statique pas overridé par Helmet en SSR)
3. MOYEN : SSR manquant sur certaines variantes EN (patterns regex Cloudflare Worker incomplets)
4. MOYEN : Section "Autres prestataires" ne filtre pas par operatingCountries
5. MOYEN : Schemas HowTo et Speakable manquants sur profils
</known_bugs>
</context>

<instructions>
Analyse ce site section par section. Pour CHAQUE section, produis des recommandations SPÉCIFIQUES à SOS-Expat avec des exemples concrets utilisant les vrais URLs/données du site. Pas de conseils SEO génériques.

Raisonne étape par étape avant chaque recommandation : identifie le problème → analyse l'impact → propose la solution → donne l'exemple concret.

SECTION 1 — DIAGNOSTIC D'INDEXATION (351/6000 = 5.8%)
Analyse les causes probables en tenant compte de :
- Architecture SPA + SSR Puppeteer (latence ? erreurs rendering ?)
- Explosion combinatoire : 77 profils × 9 langues + 2205 pages pays → thin content perçu ?
- Pages pays avec 0-2 prestataires → soft 404 ?
- Duplication perçue entre langues (traductions automatiques)
- Crawl budget gaspillé ?
- Bugs #1 et #2 (canonical tronqué + meta EN sur FR)

Livrable :
- Top 10 causes classées par impact
- Pages à pousser en priorité absolue
- Pages à noindex temporairement
- Ordre d'indexation optimal

SECTION 2 — ARCHITECTURE SEO : PROFILS PRESTATAIRES
Analyse : structure URL, profondeur de clics, maillage entre profils, matrice pays × langue × spécialité, profils pauvres (0 avis, pas de description).

Livrable :
- Seuil minimum pour indexer un profil (scoring /100 avec pondération)
- Stratégie profils "vides" vs "riches"
- Hub/cluster idéal : Spécialité → Pays → Profil

SECTION 3 — ARCHITECTURE SEO : PAGES PAYS
Analyse : pages avec 0 prestataires, seuil minimum, duplication entre pages pays.

Livrable :
- Seuil minimum de prestataires pour indexer
- Règles de contenu unique par page pays (données locales, stats juridiques)
- Stratégie pays sans prestataires

SECTION 4 — STRATÉGIE MULTILINGUE & ANTI-DUPLICATION
Analyse : 9 copies perçues ? traductions automatiques suffisantes ? explosion combinatoire viable ?

Livrable :
- Stratégie FR → EN → autres avec critères de passage chiffrés
- Différenciation obligatoire entre versions linguistiques

SECTION 5 — SLUGS & URLs
Analyse :
- shortid Firebase (4-6 chars) problématique SEO ?
- RÈGLE ABSOLUE à valider : les slugs AR/HI/ZH/RU DOIVENT être en ASCII romanisé (translittération), JAMAIS en caractères Unicode natifs — le locale dans l'URL (/ar-sa/, /hi-in/) suffit à Google pour identifier la langue, le slug n'a pas besoin d'être en arabe/hindi/chinois
- Proposer la méthode de translittération correcte par langue (ISO 233, Pinyin, IAST, etc.)
- 301 redirects sur les anciens slugs Unicode éventuels
- previousSlugs en place ?

SECTION 6 — HREFLANG (audit complet)
Analyse : réciprocité, cohérence HTML ↔ sitemaps, x-default FR, codes ISO, conflit canonical ↔ hreflang.

SECTION 7 — CANONICAL & DUPLICATION
Analyse : bug canonical tronqué, self-referencing multilingue, risque cross-language.

SECTION 8 — QUALITÉ DES PAGES (scoring /100)
Définis score minimum par type de page avec critères pondérés et seuil noindex automatique.

SECTION 9 — AEO
Le site utilise déjà Claude API pour aiSummary et aiKeyFacts. Analyse si c'est suffisant, structure snippet 0 par type de page.

SECTION 10 — STRUCTURE ON-PAGE
Templates exacts pour titles, H1, meta descriptions par type de page × langue. Règles de génération automatique.

SECTION 11 — MAILLAGE INTERNE
Profil ↔ profils, profil ↔ pays, pays ↔ pays voisins, blog ↔ profils/pays. Minimum 5-10 liens par page.

SECTION 12 — DONNÉES STRUCTURÉES (JSON-LD)
9 schemas déjà en place. Analyse les manquants (HowTo, Speakable, Person, LegalService ?).

SECTION 13 — SITEMAPS (ULTRA CRITIQUE)
Le site a 1 seul profiles.xml avec TOUS les profils → probablement cause majeure de non-indexation.
Propose découpage par langue, 200-500 URLs max, envoi progressif.

SECTION 14 — STRATÉGIE D'INDEXATION PAR PHASES
Phase 1 (S1-2) : Fondations FR — combien d'URLs ?
Phase 2 (S3-4) : FR + début EN — conditions de passage ?
Phase 3 (Mois 2) : FR + EN + ES/DE
Phase 4 (Mois 3+) : toutes langues — conditions ?
Nombre exact d'URLs par phase, métriques de passage.

SECTION 15 — CRAWL BUDGET & SSR
SSR Puppeteer : latence TTFB ? cache efficace ? Worker route bien tous les bots ?

SECTION 16 — ANTI-DUPLICATE MASSIF
77×9 profils identiques structurellement, 2205 pages pays même template. Règles de différenciation.

SECTION 17 — CONCURRENCE
Expatica, InterNations, Expat.com, JustAnswer, LegalZoom. Requêtes cibles prioritaires.

SECTION 18 — PLAN D'ACTION
20 problèmes majeurs (impact × effort), plan 7j / 30j / 90j.

SECTION 19 — CHECKLISTS
Checklist profil, checklist page pays, checklist sitemap, checklist nouvelle langue.

SECTION 20 — AUTOMATISATION & SCALING
Scoring SEO automatique backend, noindex auto sous seuil, scaling 500 → 1000 prestataires.
</instructions>

<constraints>
- ZÉRO blabla, uniquement actionnable
- SPÉCIFIQUE à SOS-Expat avec exemples concrets (vrais URLs, vrais types de pages)
- Ne pas re-proposer ce qui fonctionne déjà — se concentrer sur ce qui manque ou est cassé
- Compatible avec l'architecture (SPA + Cloudflare Worker + SSR Puppeteer + Firebase)
- Solutions automatisables (le site utilise Claude API pour le contenu SEO)
- Priorisé systématiquement P0/P1/P2/P3
</constraints>

<confidence_levels>
Pour chaque recommandation, indique ton niveau de certitude :
- ✅ SÛR : déductible de l'architecture décrite
- ⚠️ PROBABLE : hypothèse forte basée sur les patterns connus
- ❓ À VÉRIFIER : nécessite données GSC ou test terrain
</confidence_levels>

<output_format>
Structure ta réponse exactement selon les 20 sections demandées.
Pour chaque section :
1. Diagnostic (ce qui ne va pas / ce qui manque)
2. Impact (pourquoi c'est important, chiffré si possible)
3. Recommandations (actions précises, ordonnées)
4. Exemples concrets SOS-Expat
5. Priorité (P0/P1/P2/P3)

Utilise :
- Listes numérotées
- Tableaux comparatifs
- Exemples de code/config (robots.txt, JSON-LD, sitemap XML) quand applicable
- Checklists avec cases à cocher
</output_format>

<critical_reminder>
Les PROFILS PRESTATAIRES (avocats + helpers expat) et les PAGES PAYS sont le coeur commercial du site. Chaque recommandation doit être évaluée à travers le prisme : "est-ce que ça aide à indexer plus de profils et de pages pays de manière qualitative ?"

L'objectif n'est PAS d'indexer 6000 pages. L'objectif est d'indexer les BONNES pages (profils riches + pages pays avec prestataires) et de noindex le reste jusqu'à ce qu'il soit prêt.
</critical_reminder>
