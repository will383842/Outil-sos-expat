# PROMPT — Audit SEO/AEO Multilingue, Hreflang, Slugs & Ciblage Linguistique

---

Tu es un panel de 30 experts réunis en session d'audit :

**Groupe A — 10 experts SEO/AEO mondiaux**
Tu incarnes simultanément les approches de : (1) un spécialiste technique SEO crawl/indexation, (2) un expert AEO (Answer Engine Optimization) et structured data, (3) un stratège SEO international/multilingue, (4) un expert en Core Web Vitals et performance, (5) un spécialiste du maillage interne et de l'architecture de l'information, (6) un expert en canonicalisation et gestion des duplicatas, (7) un analyste de logs serveur et crawl budget, (8) un spécialiste schema.org et rich snippets, (9) un expert en sitemap XML multilingue, (10) un stratège de contenu SEO multimarché.

**Groupe B — 10 experts développement frontend & backend**
Tu incarnes simultanément : (1) un architecte frontend React/Next.js SSR/SSG, (2) un expert en rendu côté serveur et hydratation, (3) un développeur backend Node.js/API routes, (4) un spécialiste de la gestion d'état et du routing côté client (React Router, etc.), (5) un expert en meta tags dynamiques et `<head>` management, (6) un développeur full-stack TypeScript, (7) un spécialiste Cloudflare Pages/Workers et edge rendering, (8) un expert en génération de sitemap programmatique, (9) un développeur spécialisé en accessibilité et HTML sémantique, (10) un expert en tests automatisés (Lighthouse CI, Playwright crawl).

**Groupe C — 10 experts routing multilingue, hreflang & slugs**
Tu incarnes simultanément : (1) un architecte de systèmes de routing i18n à grande échelle, (2) un expert hreflang (implémentation HTML, HTTP headers, sitemap XML), (3) un spécialiste de la normalisation/romanisation des slugs (arabe, hindi, chinois, russe, japonais, coréen, thaï, hébreu, etc.), (4) un expert en URL design multilingue (subfolder vs subdomain vs ccTLD), (5) un développeur spécialisé en génération automatique de slugs translittérés, (6) un expert en redirection 301/302 et migration d'URL multilingue, (7) un spécialiste du `x-default` hreflang et des fallbacks linguistiques, (8) un auditeur de cohérence entre routes frontend et URLs canoniques, (9) un expert en alternate links et link equity cross-language, (10) un spécialiste des edge cases hreflang (variantes régionales : fr-FR vs fr-CA, en-US vs en-GB, zh-Hans vs zh-Hant, pt-BR vs pt-PT).

---

## MISSION

Analyse en profondeur le site **SOS-Expat** (https://www.sos-expat.com) sur les 9 axes suivants. Pour chaque axe, produis un diagnostic détaillé, les problèmes trouvés classés par criticité (🔴 critique / 🟠 important / 🟡 mineur), et les corrections exactes à appliquer.

---

## AXE 1 — Inventaire complet des routes et pages

1. Crawle l'intégralité du site et liste **toutes les URLs accessibles** (pages, landings, CGU, blog, FAQ, etc.)
2. Pour chaque URL, identifie :
   - La langue servie
   - Le pattern d'URL (`/fr/...`, `/en/...`, `/ar/...`, etc.)
   - Si la page a des variantes dans d'autres langues
   - Le statut HTTP (200, 301, 404, soft 404)
3. Identifie les pages orphelines (aucun lien interne pointant vers elles)
4. Identifie les langues déclarées dans le système mais qui n'ont pas de routes correspondantes

---

## AXE 2 — Audit hreflang exhaustif

**Principe fondamental** : Chaque page traduite doit être servie aux utilisateurs de la langue et du pays appropriés. Avec des balises hreflang bien configurées, Google comprend qu'il s'agit de versions linguistiques destinées à des audiences distinctes, ce qui évite les problèmes de contenu dupliqué et favorise l'indexation correcte dans chaque marché.

Pour **chaque groupe de pages équivalentes** (même contenu, langues différentes) :

1. Vérifie la présence des balises `<link rel="alternate" hreflang="xx">` dans le `<head>`
2. Vérifie que **chaque page référence toutes ses variantes** (y compris elle-même — règle de réciprocité obligatoire)
3. Vérifie la présence et la cohérence du `hreflang="x-default"` (page de fallback pour les langues non couvertes)
4. Vérifie que les codes langue utilisés sont conformes ISO 639-1 (et ISO 3166-1 pour les variantes régionales, ex: `pt-BR`, `zh-Hans`)
5. Vérifie l'absence de conflits entre hreflang et canonical (`rel="canonical"` doit pointer vers soi-même, JAMAIS vers une autre langue)
6. Vérifie la cohérence avec le sitemap XML (les alternate links dans le sitemap doivent correspondre exactement aux balises HTML)
7. Signale toute page qui déclare un hreflang vers une URL qui retourne 404 ou redirige (lien cassé = hreflang ignoré par Google)

---

## AXE 3 — Audit des slugs non-latins (PRIORITAIRE)

Pour les langues utilisant des scripts non-latins (arabe, hindi, chinois mandarin, russe, japonais, coréen, thaï, hébreu, persan, ourdou, bengali, etc.) :

1. **Liste tous les slugs actuellement en production** pour ces langues
2. Pour chaque slug, vérifie :
   - Est-il en caractères natifs (ex: `/ar/خدمات-قانونية/`) ou romanisé (ex: `/ar/khadamat-qanuniya/`) ?
   - Est-il URL-encoded correctement ?
   - Est-il cohérent avec les autres langues (même structure de slug) ?
3. **Recommandation ferme** : Les slugs DOIVENT être romanisés/translittérés pour :
   - Compatibilité maximale avec les crawlers et outils d'analyse
   - Partageabilité (liens copiés-collés lisibles dans les emails, réseaux sociaux, messageries)
   - Éviter les problèmes d'encodage, de troncature et de double-encodage
   - Lisibilité dans les SERP (Google affiche les URLs décodées, mais les caractères non-latins peuvent apparaître en percent-encoding)
4. Pour chaque slug problématique, propose la version romanisée correcte avec la bibliothèque/méthode de translittération recommandée (ex: `slugify` avec option `transliterate`, ICU transliterator, `limax`, `transliteration` npm package, etc.)
5. Vérifie qu'aucun slug ne contient :
   - Des espaces non encodés
   - Des caractères spéciaux interdits dans les URLs (RFC 3986)
   - Des doublons après normalisation (deux slugs différents qui deviennent identiques après romanisation)
   - Des encodages mixtes (partie romanisée + partie en caractères natifs)
6. Propose un **mapping complet** slug natif → slug romanisé pour chaque langue non-latine, avec redirections 301 à mettre en place

---

## AXE 4 — Architecture multilingue et maillage interne

1. Évalue le pattern d'URL choisi (`/fr/`, `/en/`, etc.) — est-il cohérent sur tout le site ? Y a-t-il des pages qui cassent le pattern (ex: page sans préfixe de langue) ?
2. Vérifie que le sélecteur de langue (language switcher) :
   - Est présent sur **toutes** les pages (y compris CGU, FAQ, pages légales)
   - Pointe vers la bonne variante linguistique de la page courante (PAS la homepage de l'autre langue)
   - Utilise des liens `<a href>` crawlables (pas du JavaScript pur, pas de `onclick` sans `href`)
   - Affiche toutes les langues disponibles pour cette page spécifique
3. Analyse le maillage interne cross-langue :
   - Les liens internes dans une page FR pointent-ils vers d'autres pages FR (et non EN) ?
   - Y a-t-il des fuites de link equity vers la mauvaise langue ?
   - Les CTAs et boutons pointent-ils vers la bonne variante linguistique ?
4. Vérifie la balise `<html lang="xx">` sur chaque page — correspond-elle à la langue réellement servie ?
5. Vérifie les meta `og:locale` et `og:locale:alternate` pour le partage social (Facebook, LinkedIn, WhatsApp)
6. Vérifie que les breadcrumbs sont traduits et pointent vers les bonnes variantes linguistiques

---

## AXE 5 — Sitemap XML multilingue

1. Localise et analyse tous les fichiers sitemap (sitemap.xml, sitemap-index, sitemaps par langue)
2. Vérifie que chaque URL dans le sitemap inclut les balises `<xhtml:link rel="alternate" hreflang="xx">` vers **toutes** ses variantes linguistiques
3. Vérifie la cohérence bidirectionnelle : chaque URL servie en 200 doit être dans le sitemap, et chaque URL du sitemap doit retourner 200
4. Vérifie que les sitemaps sont déclarés dans `robots.txt`
5. Signale les URLs dans le sitemap qui retournent autre chose que 200
6. Vérifie que le namespace `xmlns:xhtml` est correctement déclaré dans le sitemap
7. Vérifie qu'il n'y a pas de sitemap orphelin (déclaré nulle part) ou de sitemap vide

---

## AXE 6 — Canonicalisation et duplicatas

1. Vérifie que chaque page a un `<link rel="canonical">` pointant vers **elle-même** (URL absolue, même protocole, même domaine)
2. Identifie les pages dupliquées (même contenu, URLs différentes) — avec/sans trailing slash, www vs non-www, HTTP vs HTTPS, avec/sans paramètres
3. Vérifie qu'il n'y a **JAMAIS** de canonical cross-langue (une page FR ne doit JAMAIS avoir un canonical vers la page EN — c'est l'erreur la plus destructrice pour le SEO multilingue)
4. Vérifie la gestion des paramètres d'URL (UTM, fbclid, gclid, etc.) — sont-ils exclus du canonical ?
5. Vérifie la cohérence canonical ↔ hreflang : si une page A a un canonical vers B, alors les hreflang de A sont ignorés par Google. Signale tout conflit.

---

## AXE 7 — Structured Data et AEO

1. Vérifie les schema.org sur chaque type de page (Organization, FAQPage, BreadcrumbList, Service, Review, HowTo, WebSite, WebPage, etc.)
2. Vérifie que le champ `inLanguage` des structured data correspond à la langue de la page
3. Vérifie que les FAQ et HowTo schemas sont rédigés dans la bonne langue (contenu traduit, pas en anglais par défaut)
4. Évalue la couverture AEO : les pages sont-elles optimisées pour les featured snippets et les réponses IA (Google AI Overview, Bing Copilot, Perplexity, ChatGPT Search) ?
   - Questions/réponses clairement structurées
   - Paragraphes de définition en début de section
   - Listes à puces pour les processus/étapes
   - Tableaux comparatifs quand pertinent
5. Vérifie que les breadcrumbs schema correspondent à la navigation réelle et sont dans la bonne langue
6. Vérifie que le schema `WebSite` avec `SearchAction` (sitelinks searchbox) est présent et configuré pour chaque langue

---

## AXE 8 — Performance et indexabilité

1. Vérifie le rendu : les balises meta, hreflang et canonical sont-elles présentes dans le **HTML initial** (SSR/prerendering) ou uniquement après exécution JavaScript ?
   - Si elles dépendent du JS : Googlebot peut les voir (il exécute JS) mais avec un délai d'indexation, et d'autres moteurs (Bing, Yandex, Baidu) peuvent ne pas les voir du tout
2. Si SPA/CSR : vérifie que le prerendering ou SSR est en place pour que **tous les crawlers** voient le contenu complet, les meta tags et les hreflang
3. Vérifie les temps de réponse serveur (TTFB) par région géographique — les utilisateurs arabophones, asiatiques ou russophones ont-ils une latence acceptable ?
4. Vérifie que `robots.txt` ne bloque pas les ressources nécessaires au rendu (JS, CSS, fonts)
5. Vérifie la présence et la configuration du `<meta name="robots">` par page — aucune variante linguistique ne doit être en `noindex` par erreur
6. Vérifie le crawl budget : les pages à faible valeur (paramètres d'URL, filtres, pagination infinie) ne cannibalisent-elles pas le budget de crawl des pages multilingues importantes ?

---

## AXE 9 — Ciblage linguistique, content negotiation & désambiguïsation des duplicatas

**Contexte critique** : Chaque page traduite doit être servie aux utilisateurs de la langue et du pays appropriés. Les balises hreflang indiquent à Google que ces pages sont des versions linguistiques destinées à des audiences distinctes — PAS du contenu dupliqué. Une mauvaise configuration entraîne soit la cannibalisation entre variantes, soit l'indexation de la mauvaise langue pour un pays.

### 9.1 — Content negotiation serveur

1. Le serveur effectue-t-il des **redirections automatiques** basées sur le header `Accept-Language` ou la géolocalisation IP ?
2. Si oui : vérifie que **Googlebot** (qui crawle depuis les US en anglais) n'est PAS redirigé systématiquement vers `/en/` — cela empêcherait le crawl des autres langues et détruirait l'indexation multilingue
3. **Recommandation Google officielle** : ne JAMAIS rediriger automatiquement basé sur la langue/géo. À la place, proposer un **bandeau de suggestion** non intrusif ("Cette page est aussi disponible en français") que l'utilisateur peut accepter ou ignorer
4. Si Cloudflare Workers ou des règles de redirection sont en place, les auditer spécifiquement

### 9.2 — Désambiguïsation duplicata via hreflang

1. Pour chaque groupe de pages équivalentes, vérifie que Google les traite bien comme des **variantes** (et non comme des **duplicatas**) en analysant :
   - Le rapport **"Pages"** (ex-Couverture) de Google Search Console → pages exclues pour "Duplicate, Google chose different canonical than user"
   - Le rapport **"Ciblage international"** de GSC → erreurs hreflang (tags manquants, tags sans correspondance retour, etc.)
2. Vérifie qu'aucune variante linguistique n'est marquée comme "Duplicate without user-selected canonical" — c'est le signe que Google ignore le hreflang et considère la page comme un duplicata
3. Si des pages sont mal classifiées : identifier la cause racine (canonical incorrect ? hreflang non réciproque ? contenu identique non traduit ?)

### 9.3 — Indexation par pays

1. Dans **GSC > Performance**, filtrer par pays et vérifier que la bonne variante linguistique apparaît pour chaque pays cible :
   - France, Belgique FR, Suisse FR, Canada FR, Afrique francophone → `/fr/`
   - UK, US, Australie, Inde anglophone → `/en/`
   - Allemagne, Autriche, Suisse DE → `/de/`
   - Pays arabophones (Maroc, Tunisie, Algérie, EAU, Arabie Saoudite, etc.) → `/ar/`
   - Russie, pays russophones → `/ru/`
   - Chine, Taïwan, Singapour sinophone → `/zh/`
   - Et ainsi de suite pour chaque langue supportée
2. Signale tout cas où Google indexe **la mauvaise variante** pour un pays (ex: `/en/` qui apparaît pour des requêtes depuis la France)
3. Si des variantes régionales existent (fr-FR vs fr-CA, pt-BR vs pt-PT), vérifier que le ciblage hreflang est assez granulaire

### 9.4 — Vary header et cache CDN

1. Si le serveur utilise content negotiation : vérifie la présence du header `Vary: Accept-Language` pour que les **caches et CDN** (Cloudflare, etc.) ne servent pas la mauvaise langue à un visiteur
2. Vérifie que Cloudflare ne cache pas une seule variante linguistique pour toutes les requêtes (problème courant avec les CDN)
3. Vérifie les règles de cache Cloudflare — le cache key inclut-il le préfixe de langue ?

### 9.5 — Googlebot crawl paths

1. Vérifie que **toutes les variantes linguistiques** sont découvrables par Googlebot via au moins 2 de ces 3 canaux :
   - Liens internes (language switcher crawlable avec `<a href>`)
   - Sitemap XML avec balises `<xhtml:link>` alternate
   - Balises hreflang dans le `<head>` HTML
2. Vérifie que le `robots.txt` ne bloque aucune variante linguistique
3. Vérifie qu'il n'y a pas de page en `noindex` par erreur sur certaines langues seulement (erreur courante lors de migrations)

### 9.6 — Signaux contradictoires (le piège le plus dangereux)

Identifie tout **conflit** entre ces signaux — un seul conflit peut détruire l'indexation multilingue :

| Signal A | Signal B | Conflit | Conséquence |
|----------|----------|---------|-------------|
| hreflang FR → `/fr/page/` | canonical de `/fr/page/` → `/en/page/` | Canonical cross-langue | Google ignore le hreflang, traite FR comme duplicata de EN |
| hreflang vers `/ar/services/` | `/ar/services/` retourne 301 → `/ar/khadamat/` | hreflang vers redirection | Google peut ignorer le hreflang ou perdre le signal |
| Sitemap déclare `/de/hilfe/` | Page HTML déclare hreflang vers `/de/help/` | URL mismatch sitemap/HTML | Google ne sait pas quelle URL est la bonne |
| `meta robots: noindex` sur `/ru/` | hreflang des autres pages pointe vers `/ru/` | noindex + hreflang entrant | Page non indexée mais référencée — signal contradictoire |
| Redirection 302 (temporaire) `/zh/` → `/en/` | hreflang déclare `/zh/` comme variante chinoise | Redirection + hreflang | 302 = "temporaire", Google peut garder `/zh/` mais n'y accède jamais |

Pour chaque conflit trouvé, indique la **correction prioritaire** et l'**ordre de résolution** (certains conflits doivent être résolus avant d'autres pour éviter des effets de bord).

---

## FORMAT DE SORTIE ATTENDU

Pour chaque axe, structure ta réponse ainsi :

```
## AXE X — [Titre]

### Diagnostic
[Analyse détaillée avec observations factuelles]

### Problèmes trouvés
| # | Criticité | Page/URL | Problème | Impact SEO |
|---|-----------|----------|----------|------------|
| 1 | 🔴 | /ar/... | Slug en caractères arabes non romanisés | Crawl/partage/encodage défaillant |
| 2 | 🟠 | /zh/... | hreflang manquant vers variante EN | Perte indexation cross-langue |
| 3 | 🟡 | /fr/... | og:locale manquant | Partage social sous-optimal |

### Corrections recommandées
[Pour chaque problème : la correction exacte avec le code/config/balise à modifier]

### Priorité d'implémentation
[Ordre recommandé des corrections avec justification]
```

---

## LIVRABLE FINAL

Après les 9 axes, produis :

### 1. Tableau récapitulatif global
Tous les problèmes trouvés sur les 9 axes, triés par criticité (🔴 d'abord), avec l'axe d'origine et l'effort estimé (rapide/moyen/long).

### 2. Roadmap de corrections ordonnée
Quoi faire en premier, en second, etc. — avec cette logique de priorisation :
- **Phase 1 (immédiat)** : Corrections qui débloquent l'indexation (conflits canonical/hreflang, signaux contradictoires, redirections serveur)
- **Phase 2 (semaine 1)** : Romanisation des slugs non-latins + redirections 301
- **Phase 3 (semaine 2)** : Complétude hreflang, sitemap multilingue, maillage interne
- **Phase 4 (semaine 3)** : Structured data, AEO, performance, monitoring

### 3. Checklist de validation post-correction
Pour chaque correction, un test de vérification précis :
- [ ] Outil à utiliser (Google Search Console, Ahrefs, Screaming Frog, hreflang checker, etc.)
- [ ] Ce qu'il faut vérifier
- [ ] Résultat attendu si la correction est réussie

### 4. Tests automatisés recommandés
Script ou pipeline CI/CD pour vérifier en continu :
- **Test Playwright/Puppeteer** qui crawle toutes les routes et vérifie pour chaque page :
  - Présence de `<html lang>` correct
  - Présence de canonical auto-référent
  - Présence de tous les hreflang attendus (réciprocité)
  - Absence de conflits canonical/hreflang
  - Slugs romanisés pour les langues non-latines
  - Statut HTTP 200 pour toutes les URLs référencées en hreflang
- **Monitoring GSC hebdomadaire** : script qui vérifie que le ratio "bonne langue / bon pays" ne se dégrade pas, et alerte si une variante linguistique perd son indexation au profit d'une autre
- **Smoke test post-déploiement** : vérification automatique que les hreflang, canonical et sitemap sont cohérents après chaque mise en production

---

*Commence l'audit maintenant. Sois exhaustif, précis, et actionnable. Chaque problème doit avoir sa solution concrète avec le code ou la configuration exacte à modifier. Ne fais pas de suppositions — vérifie chaque point factuellement.*
