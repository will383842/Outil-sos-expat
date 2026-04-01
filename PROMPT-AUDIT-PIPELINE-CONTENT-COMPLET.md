# PROMPT — Audit & Correction Complète du Pipeline de Contenu SOS-Expat

## CONTEXTE

Tu es une équipe de 50 développeurs backend/frontend seniors, experts SEO, experts AEO, et architectes logiciels.
Tu dois auditer, tester, corriger et perfectionner CHAQUE composant du pipeline de génération de contenu SOS-Expat.

Le pipeline comprend 2 projets :
- **Mission Control** (génération + dashboard admin) : Laravel API + React Dashboard
  - Local : `C:\Users\willi\Documents\Projets\VS_CODE\Outils_communication\Mission_control_sos-expat`
  - Backend : `laravel-api/`
  - Frontend : `react-dashboard/`
  - Production VPS : `95.216.179.163`, path `/opt/influenceurs-tracker`
  - Docker containers : `inf-app`, `inf-content-worker`, `inf-publication-worker`, `inf-queue`, etc.
  - Dashboard : `https://influenceurs.life-expat.com`

- **Blog Frontend** (réception + rendu public SSR) : Laravel 12 + Blade
  - Local : `C:\Users\willi\Documents\Projets\VS_CODE\Blog_sos-expat_frontend`
  - Production VPS : même VPS, path `/opt/blog-sos-expat`
  - Docker containers : `blog-app`, `blog-nginx`, `blog-postgres`, `blog-queue`, `blog-redis`, `blog-scheduler`
  - Blog public : `https://sos-expat.com/blog` (via Cloudflare Worker proxy)

9 langues : FR, EN, ES, DE, PT, RU, ZH, AR (RTL), HI

---

## MISSION

Auditer et corriger de bout en bout le pipeline complet. Pour CHAQUE point ci-dessous :
1. **Lire le code source** (pas deviner)
2. **Tester en production** via SSH sur le VPS
3. **Identifier les bugs** avec fichier:ligne exacte
4. **Corriger** directement dans le code
5. **Déployer** sur le VPS (SCP + docker cp dans TOUS les containers inf-*)
6. **Vérifier** que la correction fonctionne
7. **Envoyer le résultat** dans un tableau ✅/❌

---

## PARTIE 1 — PIPELINE DE GÉNÉRATION (15 phases)

### Phase 1 : Validation
- [ ] Lire `ArticleGenerationService.php` → méthode `phase01_validate()`
- [ ] Vérifier que TOUS les paramètres obligatoires sont validés (topic, language, country, content_type, keywords)
- [ ] Vérifier que les valeurs par défaut sont sensées (tone=professional, length=long, faq_count=6)
- [ ] Tester : envoyer un job avec des paramètres manquants → doit échouer proprement

### Phase 2 : Recherche (Perplexity Sonar)
- [ ] Lire `PerplexitySearchService.php` — quel prompt est envoyé ?
- [ ] Vérifier que les facts retournés sont structurés (array de strings)
- [ ] Vérifier que les sources ont des URLs valides
- [ ] Tester : générer un article et vérifier que `$research['facts']` contient 10+ facts
- [ ] Tester : vérifier que `$research['sources']` contient 3+ URLs
- [ ] Si Perplexity échoue, vérifier le fallback (OpenAI research ou erreur ?)

### Phase 3 : Titre
- [ ] Lire `phase03_generateTitle()` — quel prompt ? Quel modèle ?
- [ ] Le titre DOIT contenir le mot-clé principal
- [ ] Le titre DOIT être ≤ 60 caractères (SEO Google)
- [ ] Le titre DOIT contenir l'année 2026
- [ ] Le titre NE DOIT PAS commencer par "Guide", "Article", "Comment" (clickbait SEO)
- [ ] Tester : générer 3 titres et vérifier ces critères

### Phase 4 : Accroche (Excerpt)
- [ ] Lire `phase04_generateExcerpt()` — longueur cible ? Format ?
- [ ] L'excerpt DOIT faire 150-200 caractères (pour Google snippet)
- [ ] L'excerpt DOIT contenir le mot-clé principal
- [ ] L'excerpt DOIT être engageant (pas une définition Wikipedia)
- [ ] L'excerpt DOIT contenir un bénéfice pour le lecteur
- [ ] Vérifier que l'excerpt est stocké dans `$article->excerpt`

### Phase 5 : Contenu HTML (GPT-4o)
- [ ] Lire `phase05_generateContent()` — PROMPT COMPLET, mot par mot
- [ ] **LONGUEUR** : vérifier que `$maxTokens` est suffisant pour la cible (16384 pour long)
- [ ] **STRUCTURE** : le prompt demande-t-il explicitement :
  - 8-12 sections H2 ?
  - 3-5 paragraphes par H2 (80-120 mots chacun) ?
  - Au moins 3 listes `<ul>`/`<ol>` avec 5+ items ?
  - Au moins 1 tableau `<table>` comparatif ?
  - Au moins 2 `<blockquote>` pour conseils ?
  - Des données chiffrées 2026 ?
  - Des exemples concrets ?
- [ ] **MOT-CLÉ** : le prompt exige-t-il le mot-clé dans :
  - Premier paragraphe ?
  - 2+ titres H2 ?
  - En `<strong>` au moins 1 fois ?
  - Densité 1-2% ?
- [ ] **NETTOYAGE** : après réception du contenu GPT :
  - Strip des balises markdown ` ```html ``` `
  - Strip de `<html>`, `<head>`, `<body>`, `<style>`, `<script>`, `<title>`, `<meta>`, `<link>`
  - Strip de `<h1>` (le H1 est le titre de la page, pas dans le contenu)
  - Vérifier qu'il ne reste AUCUNE balise parasite
- [ ] **AUTO-EXTEND** : si le contenu fait < 70% du minimum cible :
  - Le système DOIT relancer GPT avec le contenu existant + instruction d'extension
  - Vérifier que le retry fonctionne et produit un article plus long
- [ ] **WORD COUNT** : vérifier que `$article->word_count` est calculé APRÈS nettoyage HTML
- [ ] Tester : générer un article "long" et vérifier ≥ 2500 mots

### Phase 5b : Featured Snippet
- [ ] Lire `phase05b_featuredSnippet()` — format de sortie ?
- [ ] Le snippet DOIT faire 40-60 mots (position 0 Google)
- [ ] Le snippet DOIT être une définition directe du sujet
- [ ] Le snippet DOIT contenir le mot-clé principal
- [ ] Vérifier qu'il est stocké quelque part (dans le contenu ? un champ dédié ?)

### Phase 6 : FAQ
- [ ] Lire `phase06_generateFaq()` — combien de FAQs ? Quel format ?
- [ ] DOIT générer 6-8 FAQs (pas 0 !)
- [ ] Chaque FAQ DOIT avoir une question ET une réponse
- [ ] Les questions DOIVENT être des vraies questions que les utilisateurs posent (pas des reformulations du titre)
- [ ] Les réponses DOIVENT faire 50-150 mots (pas 1 phrase)
- [ ] Vérifier que les FAQs sont stockées dans `generated_article_faqs` table
- [ ] La phase est-elle wrappée dans try/catch ? (non-bloquante)
- [ ] Tester : vérifier que l'article a 6+ FAQs dans la DB

### Phase 7 : Meta Tags
- [ ] Lire `phase07_generateMetaTags()`
- [ ] **meta_title** : ≤ 60 caractères, contient le mot-clé, contient "| SOS-Expat"
- [ ] **meta_description** : 140-160 caractères, contient le mot-clé, contient un CTA
- [ ] Vérifier que les deux sont stockés sur l'article
- [ ] Tester : vérifier les longueurs exactes

### Phase 7b : AEO Meta (og_title, og_description, ai_summary)
- [ ] Lire `phase07b_generateAeoMeta()`
- [ ] **og_title** : optimisé pour le partage social (peut être différent du meta_title)
- [ ] **og_description** : optimisé pour Facebook/LinkedIn (≤ 200 chars)
- [ ] **ai_summary** : résumé pour les moteurs IA (Perplexity, ChatGPT, Google AI Overview)
  - Doit faire 100-200 mots
  - Doit contenir les points clés de l'article
  - Doit être factuel et direct (pas marketing)
- [ ] Vérifier que les 3 champs sont stockés

### Phase 8 : JSON-LD
- [ ] Lire `phase08_generateJsonLd()`
- [ ] Schéma `Article` : headline, datePublished, dateModified, author, publisher, image
- [ ] Schéma `BreadcrumbList` : Home → Catégorie → Article
- [ ] Schéma `FAQPage` : toutes les FAQs avec questions/réponses
- [ ] Le JSON-LD DOIT être valide (pas de champs null qui cassent le schema)
- [ ] Tester avec Google Rich Results Test (copier le JSON-LD)

### Phase 9 : Liens internes (maillage)
- [ ] Lire `phase09_addInternalLinks()` et `InternalLinkingService.php`
- [ ] Combien de liens internes sont ajoutés ? (minimum 3-5 par article)
- [ ] Les liens pointent-ils vers des articles EXISTANTS dans la DB ?
- [ ] Les ancres sont-elles des mots-clés pertinents (pas "cliquez ici") ?
- [ ] Les liens sont-ils placés naturellement dans le texte (pas en fin d'article) ?
- [ ] Le service évite-t-il de lier vers le même article deux fois ?
- [ ] Tester : vérifier les `<a href>` dans le contenu HTML d'un article généré

### Phase 10 : Liens externes
- [ ] Lire `phase10_addExternalLinks()` — quelles sources ?
- [ ] Les liens externes proviennent-ils de la phase 2 (sources Perplexity) ?
- [ ] Les liens ont-ils `rel="nofollow noopener"` ?
- [ ] Les liens ont-ils `target="_blank"` ?
- [ ] Minimum 2-3 liens externes par article vers des sources fiables
- [ ] Vérifier : les URLs sont-elles valides (pas de 404) ?

### Phase 11 : Liens affiliés
- [ ] Lire `phase11_addAffiliateLinks()` — vers quoi pointent-ils ?
- [ ] Maximum 2 par article (pas de spam)
- [ ] Les liens sont-ils pertinents par rapport au contenu ?
- [ ] Les liens ont-ils `rel="sponsored noopener"` ?
- [ ] Vérifier que les liens pointent vers `sos-expat.com` (CTA)

### Phase 12 : Images (Unsplash)
- [ ] Lire `phase12_addImages()` et `UnsplashService.php`
- [ ] Vérifier que `featured_image_url` est TOUJOURS assigné (pas null)
- [ ] Vérifier le fallback : si Unsplash ne retourne rien → que se passe-t-il ?
- [ ] Vérifier que `featured_image_srcset` contient les 3 tailles (640w, 960w, 1200w)
- [ ] Vérifier que `photographer_name` et `photographer_url` sont stockés (CGU Unsplash)
- [ ] Vérifier que `featured_image_alt` contient le mot-clé (SEO images)
- [ ] Vérifier le rate limiter (40 req/heure max, Redis key)
- [ ] Vérifier que les URLs utilisent le CDN Unsplash (`?w=1200&q=80&auto=format`)
- [ ] Tester : générer un article et vérifier que l'image est visible

### Phase 13 : Slug + Canonical
- [ ] Lire `phase13_generateSlugs()` et `SlugService.php`
- [ ] Le slug est-il unique dans la DB ?
- [ ] Le slug est-il en minuscules, sans accents, avec tirets ?
- [ ] La canonical URL est-elle correcte ? (`https://sos-expat.com/blog/fr-fr/articles/{slug}`)
- [ ] Le slug est-il ≤ 60 caractères ?

### Phase 14 : Scores (SEO, Qualité, Lisibilité)
- [ ] Lire `phase14_calculateQuality()` et `SeoAnalysisService.php`
- [ ] **seo_score** : comment est-il calculé ? Quels critères ?
  - Présence mot-clé dans H1, H2, premier paragraphe, meta
  - Densité mot-clé
  - Structure HTML (H2, H3, listes, tables)
  - Images avec alt
  - Liens internes/externes
- [ ] **quality_score** : formule exacte (SEO 40% + readability 25% + length 20% + FAQ 15%)
- [ ] **readability_score** : quel algorithme ? (Flesch-Kincaid ?)
- [ ] Vérifier que les 3 scores sont stockés sur l'article (pas 0 !)
- [ ] La phase est-elle non-bloquante (try/catch) ?
- [ ] Tester : vérifier que les scores sont > 0 après génération

### Phase 15 : Traductions automatiques
- [ ] Lire `phase15_dispatchTranslations()` et `GenerateTranslationJob.php` et `TranslationService.php`
- [ ] Les 8 langues cibles sont-elles dispatchées ? (EN, ES, DE, PT, RU, ZH, AR, HI)
- [ ] Le modèle de traduction est-il GPT-4o-mini ?
- [ ] La traduction inclut-elle : titre, contenu, excerpt, meta_title, meta_description, FAQs ?
- [ ] Le slug est-il régénéré par langue ?
- [ ] Les traductions sont-elles liées via `parent_article_id` ?
- [ ] Les hreflang sont-ils synchronisés après toutes les traductions ?
- [ ] Tester : après génération d'un article FR, vérifier que 8 jobs de traduction sont dispatchés

---

## PARTIE 2 — PUBLICATION VERS LE BLOG

### BlogPublisher
- [ ] Lire `BlogPublisher.php` — payload complet envoyé au Blog
- [ ] Le payload contient-il TOUTES les données :
  - translations (multi-langues)
  - faqs (par langue)
  - sources (URLs, titres, trust_score)
  - images (URL, alt, source, attribution)
  - tags, countries
  - featured_image_url, featured_image_srcset, photographer_name, photographer_url
  - seo_score, quality_score, readability_score
  - content_type, category_slug
- [ ] L'authentification est-elle Bearer token + HMAC-SHA256 ?
- [ ] Le retry est-il configuré (5 tentatives, backoff exponentiel) ?
- [ ] Le status Mission Control est-il mis à "published" après succès ?
- [ ] Tester : publier un article et vérifier le payload reçu côté Blog

### Catégorisation automatique
- [ ] Lire le mapping `content_type → category_slug` dans BlogPublisher
- [ ] Vérifier que les catégories existent côté Blog (fiches-pays, fiches-pratiques, fiches-thematiques)
- [ ] Vérifier que chaque article est affecté à la bonne catégorie
- [ ] Tester : un guide → fiches-pays, un article → fiches-pratiques, un Q&A → fiches-thematiques

### Réception côté Blog
- [ ] Lire `ArticleApiController::store()` — validation, création, relations
- [ ] Le HTML est-il nettoyé correctement ? (strip_tags whitelist, pas HTMLPurifier)
- [ ] Les ArticleVersions sont-elles créées à chaque update ?
- [ ] Les FAQs par langue sont-elles créées ?
- [ ] Les images sont-elles créées ?
- [ ] Les tags sont-ils créés/liés ?
- [ ] Les countries sont-ils créés/liés ?
- [ ] La déduplication fonctionne-t-elle ? (external_article_id unique)

---

## PARTIE 3 — RENDU PUBLIC SUR SOS-EXPAT.COM/BLOG

### Routes et URLs
- [ ] Vérifier que TOUTES les routes ont le préfixe `/blog`
- [ ] Vérifier les 9 locales : `/blog/fr-fr`, `/blog/en-us`, `/blog/es-es`, etc.
- [ ] Vérifier que le Cloudflare Worker proxy `/blog/*` vers `blog.life-expat.com`
- [ ] Vérifier le SSL (`https://blog.life-expat.com`)

### Page article (`show.blade.php`)
- [ ] **H1** : unique, contient le mot-clé, pas de doublon avec meta_title
- [ ] **Meta tags** : title, description, canonical, og:title, og:description, og:image, twitter:card
- [ ] **Hreflang** : bidirectionnel pour toutes les traductions + x-default → FR
- [ ] **AEO meta** : ai:summary, ai:topics, ai:content-type, ai:freshness, ai:expertise-level
- [ ] **JSON-LD** : Article + BreadcrumbList + FAQPage (dans @graph)
- [ ] **Image featured** : avec `srcset` Unsplash CDN, `alt` contenant le mot-clé
- [ ] **Attribution photo** : nom du photographe + lien Unsplash (CGU compliance)
- [ ] **Table of Contents** : généré depuis les H2/H3, scroll-spy sur desktop
- [ ] **FAQ accordéon** : `<details>` accessible, clavier navigable
- [ ] **Sources** : liste ordonnée avec liens
- [ ] **Articles connexes** : 6 articles liés
- [ ] **CTA SOS-Expat** : lien vers le SPA pour contacter un expert
- [ ] **Reading progress bar**
- [ ] **Mobile responsive** : vérifier sur 375px, 768px, 1024px

### Page listing (`index.blade.php`)
- [ ] Pagination correcte avec `?page=2`
- [ ] Hreflang sur les pages paginées
- [ ] JSON-LD `ItemList` + `CollectionPage`
- [ ] Filtres par catégorie/pays/tag

### SEO technique
- [ ] Sitemap : `/blog/sitemap.xml` → URLs avec `/blog/`, images, hreflang, lastmod
- [ ] robots.txt : `/blog/robots.txt` → Allow /blog/, Disallow /admin/ /api/
- [ ] llms.txt : URLs avec `/blog/`
- [ ] ai.txt : URLs avec `/blog/`
- [ ] RSS : `/blog/fr/feed.xml` pour chaque langue
- [ ] IndexNow : ping après chaque publication
- [ ] Cache invalidation : après publish/unpublish

---

## PARTIE 4 — DASHBOARD ADMIN (REACT)

### Page Taxonomies (`/content/taxonomies`)
- [ ] Input "Total articles/jour" fonctionne
- [ ] Table des % par taxonomie avec calcul auto
- [ ] Validation total = 100%
- [ ] Sauvegarde via API `/taxonomy-distribution`
- [ ] Simulation de production quotidienne

### Page Publication (`/content/publication`)
- [ ] KPI : stock non publié, publiés aujourd'hui, projection jours de stock
- [ ] Rythme de publication configurable (articles/jour, heures)
- [ ] Breakdown par type et par status
- [ ] File d'attente avec actions (publier/annuler)

### Page Qualité (`/content/quality`)
- [ ] Stats globales : vérifiés, originaux, similaires, plagiés
- [ ] Table des articles flaggés avec scores
- [ ] Actions : vérifier plagiat, améliorer, approuver, rejeter
- [ ] Onglet articles rejetés avec restauration

### Page Articles (`/content/articles`)
- [ ] Filtres : status, langue, pays, type
- [ ] Tri : SEO score, qualité, mots, date
- [ ] Bulk actions : supprimer, publier
- [ ] Détail article avec prévisualisation HTML

### Page Scheduler (`/content/scheduler`)
- [ ] Configuration quotas par type
- [ ] Bouton "Lancer maintenant"
- [ ] Progression en temps réel
- [ ] Historique 30 jours

---

## PARTIE 5 — ALERTES TELEGRAM

- [ ] Alerte succès : envoyée après chaque article généré (titre, mots, scores, image)
- [ ] Alerte phase : envoyée si une phase 6-15 échoue (nom phase, erreur, article)
- [ ] Alerte critique : envoyée si le pipeline entier crashe
- [ ] Alerte publication : envoyée après publication réussie sur le Blog
- [ ] Vérifier que le bot token et chat_id sont corrects
- [ ] Tester : générer un article et vérifier la réception Telegram

---

## PARTIE 6 — SÉCURITÉ & CONFORMITÉ

### Unsplash API Terms
- [ ] Hotlinking CDN (pas de téléchargement local)
- [ ] Download tracking (`triggerDownloadTracking()`)
- [ ] Attribution photographe visible sous chaque image
- [ ] Lien Unsplash avec `utm_source=sos-expat`
- [ ] Rate limiter (40 req/heure, Redis)

### Budget AI
- [ ] `AI_DAILY_BUDGET` et `AI_MONTHLY_BUDGET` configurés
- [ ] `AI_BLOCK_ON_EXCEEDED` = true
- [ ] Coût par article tracké dans `api_costs` table

### Sécurité Blog API
- [ ] Auth : Bearer token + HMAC-SHA256 avec replay protection (5 min)
- [ ] Rate limit : 10 req/min
- [ ] HTML sanitization : strip_tags whitelist (pas de `<script>`, `<iframe>`)

---

## PARTIE 7 — TEST END-TO-END

Exécuter un test complet :

1. **Générer** un article "Expatriation en Espagne 2026" via le dashboard
2. **Vérifier** : status=review, mots≥2500, SEO≥70, Quality≥70, image=YES, FAQs≥6
3. **Vérifier** : 8 jobs de traduction dispatchés
4. **Vérifier** : scores SEO/Quality/Readability > 0
5. **Vérifier** : featured_image avec srcset, photographer, attribution
6. **Vérifier** : liens internes (3+), liens externes (2+), liens affiliés (1-2)
7. **Publier** vers le Blog
8. **Vérifier** : status Mission Control = "published"
9. **Vérifier** : article visible sur `sos-expat.com/blog/fr-fr/articles/{slug}`
10. **Vérifier** : meta tags complets (title, description, canonical, hreflang, og, twitter, AEO)
11. **Vérifier** : JSON-LD valide (Article + FAQ + Breadcrumb)
12. **Vérifier** : image affichée avec attribution Unsplash
13. **Vérifier** : FAQs en accordéon
14. **Vérifier** : TOC avec scroll-spy
15. **Vérifier** : sitemap mis à jour avec le nouvel article
16. **Vérifier** : notification Telegram reçue (succès)
17. **Attendre** les traductions → vérifier hreflang complet 9 langues

---

## FORMAT DE RÉPONSE

Pour CHAQUE point audité :
```
| # | Check | Status | Fichier:Ligne | Action |
|---|-------|--------|---------------|--------|
| 1 | H1 contient mot-clé | ❌ BUG | ArticleGenerationService.php:635 | Fix prompt + test |
```

À la fin, tableau de synthèse :

| Composant | Tests | ✅ Pass | ❌ Fail | ⚠️ Partiel |
|-----------|-------|---------|---------|-----------|
| Phase 1-8 (core) | 25 | | | |
| Phase 9-14 (enrichment) | 20 | | | |
| Phase 15 (translations) | 8 | | | |
| Publication | 12 | | | |
| Rendu Blog | 20 | | | |
| Dashboard | 15 | | | |
| Telegram | 5 | | | |
| Sécurité | 8 | | | |
| **TOTAL** | **113** | | | |

**CORRIGER CHAQUE ❌ IMMÉDIATEMENT** — pas de "à faire plus tard".

---

## PARTIE 8 — SOURCES SCRAPÉES (AMONT DU PIPELINE)

### Content Sources (sites scrapés)
- [ ] Lire `ContentSource` model — combien de sources actives ?
- [ ] Lister TOUTES les sources avec leur nombre d'articles scrapés (Expat.com, ExpatFocus, JustLanded, etc.)
- [ ] Vérifier que le scraper fonctionne (`inf-scraper`, `inf-content-scraper` containers)
- [ ] Vérifier le scheduler de scraping (fréquence, dernière exécution)

### Content Articles (articles scrapés)
- [ ] Combien d'articles scrapés au total ? Par pays ? Par source ?
- [ ] Les articles ont-ils un `processing_status` correct ? (unprocessed, clustered, used)
- [ ] Les articles sont-ils utilisés comme contexte dans la phase 2 (Research) ?
- [ ] Le clustering (TopicClusteringService) fonctionne-t-il ? Combien de clusters ?

### Topic Clusters → Génération
- [ ] Lire `TopicClusteringService.php` — algorithme Jaccard, seuil 30%
- [ ] Les clusters sont-ils utilisés pour alimenter `ArticleGenerationService.generate()` avec du contexte ?
- [ ] Le `ResearchBriefService` compile-t-il les sources scrappées en brief ?
- [ ] Tester : un cluster de 5 articles → l'article généré est-il plus riche/complet ?

---

## PARTIE 9 — QUALITÉ DU CONTENU (COMPARAISON AVEC LES MEILLEURS)

### Benchmark qualité
- [ ] Comparer un article généré avec les 3 meilleurs articles Google sur le même sujet
- [ ] Vérifier les critères E-E-A-T :
  - **Experience** : l'article contient-il des témoignages/retours d'expérience ?
  - **Expertise** : les conseils sont-ils précis et actionnables (pas vagues) ?
  - **Authoritativeness** : les sources citées sont-elles fiables (sites gouvernementaux, ambassades) ?
  - **Trust** : y a-t-il une date, un auteur, des sources vérifiables ?
- [ ] Vérifier la profondeur du contenu :
  - Chiffres concrets et récents (prix loyers 2026, salaires, coût visa)
  - Tableaux comparatifs (coût de vie ville A vs ville B)
  - Étapes numérotées pour les démarches administratives
  - Liens vers les sites officiels (ambassade, immigration, sécurité sociale)
  - Avertissements et pièges à éviter
  - Témoignages ou citations d'expatriés

### Checklist contenu world-class
- [ ] Le premier paragraphe répond-il directement à la question du titre ?
- [ ] Chaque H2 couvre-t-il un aspect UNIQUE du sujet (pas de redondance) ?
- [ ] Y a-t-il un encadré "Résumé / Points clés" en début d'article ?
- [ ] Y a-t-il un encadré "Budget estimé" ou "Coûts" avec un tableau ?
- [ ] Y a-t-il une section "Erreurs à éviter" ou "Pièges courants" ?
- [ ] Y a-t-il une section "Témoignage" ou "Retour d'expérience" ?
- [ ] La conclusion contient-elle un récapitulatif + CTA ?
- [ ] Le ton est-il humain et engageant (pas robotique/Wikipedia) ?

---

## PARTIE 10 — FLUX DE PUBLICATION AUTOMATIQUE

### Scheduler quotidien (DailyContentSchedulerService)
- [ ] Lire `DailyContentSchedulerService.php` — flux complet
- [ ] Le scheduler utilise-t-il la distribution taxonomique (%) ?
- [ ] Le calcul auto fonctionne-t-il ? (total × % = count par type)
- [ ] Le scheduler est-il idempotent ? (pas de doublons si lancé 2 fois)
- [ ] Le budget AI est-il vérifié AVANT de lancer le batch ?
- [ ] Le scheduler dispatch-t-il les jobs sur la queue `content` ?

### Publication automatique (PublishContentJob)
- [ ] Les articles passent-ils de `review` → `scheduled` → `published` automatiquement ?
- [ ] Le rate limiting fonctionne-t-il ? (max_per_hour, max_per_day, min_interval)
- [ ] Les heures actives sont-elles respectées ? (publish_start_hour, publish_end_hour)
- [ ] Le jitter (publication irrégulière) fonctionne-t-il ?
- [ ] Après publication côté Blog, le status Mission Control passe-t-il à `published` ?
- [ ] Après publication, le Blog passe-t-il l'article en `published` + `is_published=true` ?
  - OU l'article reste-t-il en `draft` côté Blog (nécessitant une action manuelle) ?
  - **CRITIQUE** : vérifier le flux complet Mission Control → Blog API → status Blog

### Publication côté Blog : auto-publish ou draft ?
- [ ] Quand Mission Control envoie un article, le Blog le met en `draft`
- [ ] Y a-t-il un mécanisme pour passer automatiquement en `published` ?
- [ ] Faut-il ajouter un endpoint `POST /api/v1/articles/{id}/publish` appelé par Mission Control ?
- [ ] Ou faut-il modifier `ArticleApiController::store()` pour accepter `status=published` ?
- [ ] **OBJECTIF** : la publication doit être 100% automatique sans intervention humaine

---

## PARTIE 11 — CROISEMENTS ET TESTS D'INTÉGRITÉ

### Test de cohérence DB Mission Control ↔ Blog
- [ ] Compter les articles `published` côté Mission Control
- [ ] Compter les articles côté Blog
- [ ] Vérifier que chaque article publié MC existe côté Blog (via `external_article_id`)
- [ ] Vérifier que les FAQs sont identiques des deux côtés
- [ ] Vérifier que les images sont identiques

### Test de cohérence URLs
- [ ] L'URL canonical stockée côté Mission Control correspond-elle à l'URL réelle du Blog ?
- [ ] Le canonical doit être `https://sos-expat.com/blog/{locale}/articles/{slug}` (pas `blog.life-expat.com`)
- [ ] Les hreflang pointent-ils vers `sos-expat.com/blog/...` (pas d'autre domaine) ?

### Test de cohérence traductions
- [ ] Si un article FR est traduit en EN, les deux ont-ils le même `parent_article_id` ?
- [ ] Les hreflang incluent-ils TOUTES les traductions disponibles ?
- [ ] Le x-default pointe-t-il vers FR ?
- [ ] Chaque traduction a-t-elle son propre slug traduit (pas le slug FR copié) ?

### Test de performance
- [ ] Temps de génération d'un article complet (cible : < 3 min)
- [ ] Temps de chargement page blog (cible : < 2s)
- [ ] TTFB du Blog (cible : < 500ms)
- [ ] Taille HTML d'une page article (cible : < 100KB)
- [ ] Cache Redis : les pages sont-elles cachées ? TTL correct ?

### Test d'erreurs edge cases
- [ ] Que se passe-t-il si OpenAI API est down ? → l'article reste en `draft` + alerte Telegram ?
- [ ] Que se passe-t-il si Unsplash est down ? → article sans image + alerte Telegram ?
- [ ] Que se passe-t-il si Perplexity est down ? → fallback ou échec ?
- [ ] Que se passe-t-il si le Blog est down ? → article en queue retry + alerte ?
- [ ] Que se passe-t-il si le quota Unsplash est atteint (40/h) ? → skip image + alerte ?
- [ ] Que se passe-t-il si le budget AI est dépassé ? → block + alerte ?
- [ ] Que se passe-t-il si un article est généré en double (même topic/pays/langue) ? → déduplication ?

---

## PARTIE 12 — CLOUDFLARE WORKER (PROXY BLOG)

- [ ] Lire `sos/cloudflare-worker/worker.js` — section BLOG PROXY
- [ ] Le Worker intercepte-t-il TOUTES les requêtes `/blog/*` ?
- [ ] Le Worker passe-t-il les headers (Authorization, Accept, Content-Type) ?
- [ ] Le Worker gère-t-il les redirections du Blog (Location header rewrite) ?
- [ ] Les assets CSS/JS du Blog sont-ils servis correctement via le Worker ?
- [ ] Le Worker ne bloque-t-il pas les bots Google/Bing sur `/blog/*` ?
- [ ] Tester : `curl -I https://sos-expat.com/blog/fr-fr` → header `X-Worker-Blog-Proxy: true`
- [ ] Tester : Google Mobile Friendly Test sur une page article

---

## PARTIE 13 — DOCKER & INFRASTRUCTURE

### Containers Mission Control
- [ ] 12 containers tous UP et healthy
- [ ] `inf-content-worker` : queue `content`, timeout 600s, tries 3
- [ ] `inf-publication-worker` : queue `publication`, timeout 120s, tries 5
- [ ] `inf-queue` : queue `default`, tries 3
- [ ] Shared-network connecté pour accès Blog
- [ ] Les fichiers PHP sont-ils à jour dans TOUS les containers ? (problème récurrent de cache Docker)

### Containers Blog
- [ ] 6 containers tous UP et healthy
- [ ] Permissions storage : UID 82 (Alpine www-data)
- [ ] Permissions bootstrap/cache : UID 82
- [ ] `php artisan optimize` exécuté après chaque déploiement
- [ ] `blog-queue` traite les jobs (IndexNow, cache invalidation)

### Réseau Docker
- [ ] `inf-app` connecté à `shared-network` ? (CRITIQUE pour Blog API)
- [ ] `inf-content-worker` connecté ? (pour la publication)
- [ ] `inf-publication-worker` connecté ?
- [ ] `inf-queue` connecté ?
- [ ] Persistance : le `docker-compose.yml` déclare-t-il `shared-network: external: true` ?
- [ ] Après un `docker compose up -d`, les connexions sont-elles maintenues ?

---

## RÉSUMÉ FINAL — 180+ POINTS DE VÉRIFICATION

| Composant | Tests | Description |
|-----------|-------|-------------|
| Sources & Scraping | 12 | Amont du pipeline, données brutes |
| Phase 1-8 (core) | 35 | Recherche, titre, contenu, FAQs, meta, JSON-LD |
| Phase 9-14 (enrichment) | 30 | Liens, images, scores SEO/Quality |
| Phase 15 (translations) | 10 | 8 langues automatiques |
| Publication | 18 | BlogPublisher, catégorisation, réception Blog, auto-publish |
| Rendu Blog | 25 | HTML, meta, JSON-LD, hreflang, AEO, images, TOC, FAQ |
| Dashboard Admin | 15 | 4 pages React (taxonomies, publication, qualité, scheduler) |
| Alertes Telegram | 6 | Succès, échecs phases, échec critique |
| Sécurité & Conformité | 10 | Unsplash CGU, budget AI, auth API |
| Qualité World-Class | 12 | E-E-A-T, benchmark, depth, engagement |
| Croisements & Intégrité | 15 | DB sync, URLs, traductions, performance, edge cases |
| Cloudflare Worker | 7 | Proxy /blog/*, headers, bots |
| Docker & Infra | 12 | Containers, réseau, permissions, cache |
| Génération variantes | 15 | Q&A, Comparative, Landing, Press |
| Services qualité avancés | 12 | Tone, Brand, FactCheck, AutoImprove |
| Blog services & middleware | 10 | CanonicalService, ImageService, SetLocale, Redirects |
| Blog admin & scheduled | 8 | Admin CRUD, PublishScheduled, WarmCache |
| Dashboard pages complètes | 10 | 40+ pages React, navigation, bulk actions |
| **TOTAL** | **262** | |

---

## PARTIE 14 — GÉNÉRATION VARIANTES (Q&A, Comparative, Landing, Press)

### Q&A Generation
- [ ] Lire `QaGenerationService.php` — pipeline complet
- [ ] Lire `QaFromQuestionsService.php` — génération depuis questions forums
- [ ] Vérifier `GenerateQaEntriesJob.php` et `GenerateQaFromClusterJob.php`
- [ ] Le Q&A a-t-il : answer_short (40-60 mots), answer_detailed_html (1000-2000 mots) ?
- [ ] Le JSON-LD QAPage est-il généré ?
- [ ] Les Q&A sont-ils publiables sur le Blog ?

### Comparative Generation
- [ ] Lire `ComparativeGenerationService.php` — pipeline complet
- [ ] Vérifier `GenerateComparativeJob.php`
- [ ] Les comparatifs ont-ils des tableaux structurés (pays A vs pays B) ?
- [ ] Le JSON-LD ItemList est-il généré ?

### Articles depuis Questions Forums
- [ ] Lire `ArticleFromQuestionsService.php`
- [ ] Vérifier `GenerateArticleFromQuestionsJob.php`
- [ ] Les questions scrapées sont-elles utilisées comme source d'articles ?
- [ ] Le `QuestionClusteringService.php` groupe-t-il les questions similaires ?

### Auto Content Pipeline
- [ ] Lire `AutoContentPipelineService.php` — orchestration complète
- [ ] Le pipeline auto gère-t-il : clustering → brief → génération → plagiat → qualité → Q&A ?
- [ ] Lire `RunFullAutoPipelineJob.php`
- [ ] Le budget est-il vérifié avant chaque étape ?

### ContentTypeConfig
- [ ] Lire `ContentTypeConfig.php` — configuration par type de contenu
- [ ] Chaque type a-t-il : model AI, temperature, target_words, max_tokens, faq_count ?
- [ ] Les configs correspondent-elles aux prompts envoyés ?

---

## PARTIE 15 — SERVICES QUALITÉ AVANCÉS

### ToneAnalyzerService
- [ ] Lire `Quality/ToneAnalyzerService.php`
- [ ] Vérifie-t-il : formality, objectivity, detected_tone ?
- [ ] Est-il appelé dans la pipeline ? Si non, faut-il l'intégrer à la phase 14 ?

### BrandComplianceService
- [ ] Lire `Quality/BrandComplianceService.php`
- [ ] Vérifie-t-il : mentions SOS-Expat, ton conforme, pas de concurrent cité ?
- [ ] Est-il appelé dans la pipeline ?

### FactCheckingService
- [ ] Lire `Quality/FactCheckingService.php`
- [ ] Vérifie-t-il les affirmations contre des sources fiables ?
- [ ] Est-il appelé dans la pipeline ?

### AutoQualityImproverService
- [ ] Lire `Quality/AutoQualityImproverService.php`
- [ ] Que corrige-t-il automatiquement ? (SEO, readability, keyword density ?)
- [ ] `ImproveArticleQualityJob.php` — est-il dispatché quand quality_score < seuil ?
- [ ] Tester : améliorer un article flaggé → le score augmente-t-il ?

### PlagiarismService (Déduplication)
- [ ] Lire `Quality/PlagiarismService.php` — algorithme shingling Jaccard
- [ ] Seuils : 35% = plagié, 20% = similaire, < 20% = original
- [ ] La vérification est-elle automatique post-génération ?
- [ ] Les résultats sont-ils stockés ? Visibles dans le dashboard ?

### RunQualityVerificationJob
- [ ] Ce job batch lance-t-il les vérifications qualité sur plusieurs articles ?
- [ ] Est-il schedulé automatiquement ?

---

## PARTIE 16 — BLOG : SERVICES & MIDDLEWARE

### CanonicalService (Blog)
- [ ] Lire `app/Services/CanonicalService.php`
- [ ] Toutes les URLs ont-elles le préfixe `/blog` ?
- [ ] Le `$blogPrefix` est-il bien `/blog` ?
- [ ] Les hreflang utilisent-ils `sos-expat.com/blog/...` (pas `blog.life-expat.com`) ?
- [ ] Le x-default pointe-t-il vers `/blog/fr-fr/...` ?

### ImageService (Blog)
- [ ] Lire `app/Services/ImageService.php`
- [ ] Les URLs Unsplash sont-elles détectées et servies via CDN (pas download) ?
- [ ] Les images non-Unsplash sont-elles redimensionnées localement ?
- [ ] Le srcset est-il généré correctement (640w, 960w, 1200w) ?

### ArticlePublishedService (Blog)
- [ ] Lire `app/Services/ArticlePublishedService.php`
- [ ] Après publication : cache invalidé ? IndexNow ping ? Google sitemap ping ?
- [ ] Relations internes recalculées ?
- [ ] Quels caches sont invalidés ? (sitemap, RSS, homepage, catégories, article)

### LinkInjectorService (Blog)
- [ ] Lire `app/Services/LinkInjectorService.php`
- [ ] Les liens affiliés sont-ils injectés dans le contenu affiché ?
- [ ] Les liens externes sont-ils injectés ?
- [ ] Les liens internes vers d'autres articles sont-ils injectés ?
- [ ] Le service évite-t-il d'injecter dans `<h1>`, `<h2>`, `<code>`, `<a>` ?

### SetLocale Middleware
- [ ] Lire `app/Http/Middleware/SetLocale.php`
- [ ] Le préfixe `/blog` est-il correctement strippé pour trouver la locale ?
- [ ] Les 9 langues sont-elles supportées ?
- [ ] La locale est-elle injectée comme route parameter pour les contrôleurs ?
- [ ] Les View::shared variables sont-elles correctes (locale, localePrefix, dir, etc.) ?

### HandleRedirects Middleware
- [ ] Lire `app/Http/Middleware/HandleRedirects.php`
- [ ] Les anciens slugs sont-ils redirigés vers les nouveaux (301) ?
- [ ] Le compteur de hits est-il incrémenté ?
- [ ] Le `/blog` prefix est-il pris en compte dans les redirections ?

---

## PARTIE 17 — BLOG : ADMIN & SCHEDULED COMMANDS

### Admin CRUD
- [ ] `/blog/admin/login` fonctionne-t-il ?
- [ ] L'admin peut-il éditer un article ? Publier/dépublier ?
- [ ] L'admin peut-il gérer les liens affiliés ?
- [ ] L'admin peut-il gérer les redirections ?

### Scheduled Commands (Blog)
- [ ] `PublishScheduledArticles` — publie-t-il les articles `scheduled` à l'heure prévue ?
- [ ] `WarmCache` — précharge-t-il les pages les plus visitées ?
- [ ] `RecalculateRelations` — recalcule-t-il les articles connexes ?
- [ ] Ces commandes sont-elles dans le scheduler cron ? Fréquence ?
- [ ] Le container `blog-scheduler` exécute-t-il bien le scheduler Laravel ?

---

## PARTIE 18 — DASHBOARD REACT : VÉRIFICATION COMPLÈTE

### Navigation
- [ ] Toutes les nouvelles pages sont-elles dans la sidebar ? (Taxonomies, Publication, Qualité)
- [ ] Les routes sont-elles lazy-loaded ?
- [ ] La détection de route active fonctionne-t-elle pour les nouvelles pages ?

### Pages existantes à vérifier
- [ ] `/content/overview` — KPI cards, status distribution, budget tracking, auto pipeline launch
- [ ] `/content/articles` — filtres complets (status, langue, pays, type), tri, bulk actions, pagination
- [ ] `/content/articles/{id}` — détail avec onglets (Contenu, SEO, FAQ, Medias, Publier)
- [ ] `/content/articles/new` — formulaire de génération avec tous les paramètres
- [ ] `/content/comparatives` — liste et détail des comparatifs
- [ ] `/content/qa` — liste et détail des Q&A
- [ ] `/content/clusters` — liste des clusters, génération depuis cluster
- [ ] `/content/campaigns` — campagnes de contenu (start/pause/resume/cancel)
- [ ] `/publishing` — endpoints, queue, schedule par endpoint
- [ ] `/seo` — dashboard SEO, hreflang matrix, orphelins, liens internes
- [ ] `/costs` — overview, breakdown, trends des coûts AI
- [ ] `/translations` — batches, progression par langue, start/pause/cancel
