# PROMPT — Pages Pays Dynamiques + Refonte Slugs pour Prestataires SOS Expat
# Objectif : Rendre chaque prestataire INLOUPABLE dans ses pays d'intervention et ses langues

## NIVEAU D'EXIGENCE

Ce prompt doit être exécuté avec le niveau des 50 meilleurs développeurs fullstack, SEO et AEO du monde. Chaque détail compte. Chaque URL doit être parfaite. Chaque page doit être optimisée pour apparaître en première page de Google dans chaque pays et chaque langue concernés. Aucun compromis sur la qualité. Le résultat doit être un système qui fonctionne automatiquement pour les 77+ prestataires existants ET pour chaque futur prestataire qui s'inscrira, sans aucune intervention manuelle.

---

## CONTEXTE DU PROJET

SOS Expat est une plateforme de mise en relation téléphonique entre des clients (expatriés/voyageurs) et des prestataires (avocats/experts expatriés) dans 197 pays, en 9 langues (fr, en, es, de, ru, pt, zh, ar, hi).

### Ce qui existe déjà (NE PAS REFAIRE)
- **Profils prestataires individuels** : générés automatiquement à l'inscription dans 9 langues
  - URL format : `/{locale}/{role-pays}/{prenom-specialite-shortid}`
  - Ex : `/ar-sa/محامي-تايلاند/ahmed-هجرة-k7m2p9`
  - SEO complet : title, description, canonical, hreflang, ReviewSchema, FAQSchema, BreadcrumbSchema, Offer, ProfessionalService/LegalService
  - Soumis automatiquement à Google Indexing API + IndexNow + sitemaps dynamiques

- **Page listing globale** : `/prestataires` (SOSCall.tsx) avec filtres JS côté client (pays, langue, spécialité)
  - Problème : les filtres ne créent PAS d'URLs indexables

- **Sitemaps dynamiques** : Cloud Functions Firebase qui génèrent les sitemaps profils
- **SSR Puppeteer** : Cloudflare Worker détecte les bots → rend le HTML via Firebase Cloud Function
- **Auto-indexing** : `onProviderCreated` trigger → Google Indexing API + IndexNow

### Ce qui MANQUE (= CE QU'IL FAUT CONSTRUIRE)
Des **pages de listing par pays** indexables par Google, pour que quelqu'un qui cherche "avocat en Thaïlande" ou "محامي في تايلاند" tombe sur une page dédiée.

---

## RÈGLE MÉTIER CRITIQUE : MATRICE PAYS × LANGUES

⚠️ **Un prestataire ne doit être visible QUE dans les combinaisons pays/langues pertinentes.**

### Données du prestataire (Firestore `sos_profiles`)
```typescript
{
  country: "TH",                          // Pays principal (Thaïlande)
  operatingCountries: ["TH", "AE", "SA"], // Pays d'intervention
  languages: ["Arabic", "French"],         // Langues parlées
  specialties: ["IMMIGRATION", "VISAS"],   // Spécialités
  type: "lawyer" | "expat",               // Rôle
  isVisible: true,
  isApproved: true,
  isActive: true,
}
```

### Logique de visibilité

Pour chaque prestataire, générer des pages UNIQUEMENT pour :

```
Pages à créer = operatingCountries × languesÉligibles

où languesÉligibles = intersection de :
  1. Les 9 langues du site (fr, en, es, de, ru, pt, zh, ar, hi)
  2. Au moins UN de ces critères :
     a) Le prestataire PARLE cette langue
     b) Le pays d'intervention a cette langue comme langue officielle/courante
```

### Exemple concret

**Prestataire : Ahmed**
- `languages: ["Arabic", "French"]`
- `operatingCountries: ["TH", "AE", "SA"]`
- `type: "lawyer"`
- `specialties: ["IMMIGRATION"]`

**Mapping langue → code site :**
- Arabic → ar
- French → fr
- English → en (langue internationale, toujours incluse)

**Langues officielles par pays :**
- TH (Thaïlande) → th (pas dans nos 9 langues) → on garde fr, en, ar (langues parlées par Ahmed)
- AE (Émirats) → ar (officielle) + en (courante) → ar, en, fr (Ahmed parle fr)
- SA (Arabie Saoudite) → ar (officielle) → ar, en, fr (Ahmed parle fr)

**Pages générées pour Ahmed :**
```
/fr-fr/avocats-en-thailande/          ← Ahmed apparaît (il parle français)
/en-us/lawyers-in-thailand/           ← Ahmed apparaît (anglais = langue internationale)
/ar-sa/محامون-في-تايلاند/              ← Ahmed apparaît (il parle arabe)

/fr-fr/avocats-aux-emirats/           ← Ahmed apparaît
/en-us/lawyers-in-uae/               ← Ahmed apparaît
/ar-sa/محامون-في-الإمارات/             ← Ahmed apparaît

/fr-fr/avocats-en-arabie-saoudite/    ← Ahmed apparaît
/en-us/lawyers-in-saudi-arabia/       ← Ahmed apparaît
/ar-sa/محامون-في-السعودية/             ← Ahmed apparaît
```

**Pages où Ahmed N'apparaît PAS :**
```
/de-de/anwaelte-in-thailand/          ← Ahmed ne parle pas allemand, Thaïlande pas germanophone
/pt-pt/advogados-na-tailandia/        ← Ahmed ne parle pas portugais
/ru-ru/advokaty-v-tailande/           ← Ahmed ne parle pas russe
/es-es/abogados-en-polonia/           ← Ahmed ne couvre pas la Pologne
```

### Exception : anglais comme langue universelle
L'anglais (en) est TOUJOURS inclus pour chaque pays d'intervention, car c'est la langue de recherche internationale. Un expatrié anglophone en Thaïlande cherchera "lawyer in Thailand" même si le prestataire ne parle pas anglais.

---

## ARCHITECTURE TECHNIQUE À IMPLÉMENTER

### 1. Nouvelles Routes (App.tsx)

```typescript
// Pages pays dynamiques — listing des prestataires par pays
{ path: "/lawyers/:countrySlug", component: ProvidersByCountry, translated: "lawyers-country" },
{ path: "/expats/:countrySlug", component: ProvidersByCountry, translated: "expats-country" },

// Variante avec spécialité
{ path: "/lawyers/:countrySlug/:specialtySlug", component: ProvidersByCountrySpecialty, translated: "lawyers-country-specialty" },
```

**Format URL traduit :**
```
/fr-fr/avocats-en-thailande/
/en-us/lawyers-in-thailand/
/es-es/abogados-en-tailandia/
/de-de/anwaelte-in-thailand/
/ar-sa/محامون-في-تايلاند/
/ru-ru/advokaty-v-tailande/
/pt-pt/advogados-na-tailandia/
/zh-cn/律师在泰国/  (ou pinyin: lushi-zai-taiguo)
/hi-in/vakil-thailand-mein/
```

### 2. Composant ProvidersByCountry

**Données à afficher :**
- H1 : "Avocats francophones en Thaïlande" (traduit dans chaque langue)
- Meta title : "Avocats en Thaïlande - Consultation téléphonique | SOS Expat"
- Meta description : "Trouvez un avocat francophone en Thaïlande. Immigration, visas, droit de la famille. Consultation par téléphone en 5 minutes. 24/7."
- Liste des prestataires filtrés (cards avec nom, photo, note, spécialités, langues, bouton "Voir le profil")
- Structured data : ItemList + AggregateRating + Offer + BreadcrumbList + FAQPage
- Liens internes vers les profils individuels
- Section FAQ dynamique : "Comment consulter un avocat en Thaïlande ?"

**SEO obligatoire par page :**
- `<SEOHead>` avec title, description, canonical, OG, Twitter
- `<BreadcrumbSchema>` : Home > Avocats > Avocats en Thaïlande
- `<FAQPageSchema>` : 3-5 questions localisées
- `<ReviewSchema>` avec AggregateRating si des prestataires ont des avis
- Schema ItemList listant les prestataires
- Schema Offer avec prix (€49 avocat, €19 expat)
- Hreflang vers les autres versions linguistiques de la même page pays

### 3. Sitemap Dynamique

Nouvelle Cloud Function `sitemapCountryListings` :
```
https://europe-west1-sos-urgently-ac307.cloudfunctions.net/sitemapCountryListings
```

Génère des URLs pour chaque combinaison pays × langue éligible :
```xml
<url>
  <loc>https://sos-expat.com/fr-fr/avocats-en-thailande/</loc>
  <xhtml:link rel="alternate" hreflang="fr" href="https://sos-expat.com/fr-fr/avocats-en-thailande/" />
  <xhtml:link rel="alternate" hreflang="en" href="https://sos-expat.com/en-us/lawyers-in-thailand/" />
  <xhtml:link rel="alternate" hreflang="ar" href="https://sos-expat.com/ar-sa/محامون-في-تايلاند/" />
  <xhtml:link rel="alternate" hreflang="x-default" href="https://sos-expat.com/fr-fr/avocats-en-thailande/" />
  <changefreq>daily</changefreq>
  <priority>0.8</priority>
</url>
```

### 4. Auto-Indexing

Quand un nouveau prestataire s'inscrit :
1. `onProviderCreated` génère ses slugs profil (DÉJÀ FAIT)
2. **NOUVEAU** : Identifier ses pays d'intervention × langues éligibles
3. **NOUVEAU** : Soumettre les URLs des pages pays correspondantes à Google Indexing API + IndexNow
4. **NOUVEAU** : Invalider le cache SSR des pages pays concernées

### 5. Cloudflare Worker

Ajouter les patterns des pages pays dans `LANDING_PAGE_PATTERNS` du worker pour que Puppeteer les rende en SSR :
```javascript
// Country listing pages — all 9 languages × all role translations
/^\/[a-z]{2}(-[a-z]{2})?\/avocats-en-[a-z-]+\/?$/i,     // FR
/^\/[a-z]{2}(-[a-z]{2})?\/lawyers-in-[a-z-]+\/?$/i,      // EN
/^\/[a-z]{2}(-[a-z]{2})?\/abogados-en-[a-z-]+\/?$/i,     // ES
// ... etc pour les 9 langues
```

### 6. Redirects (_redirects)

Ajouter les redirects pour les anciennes URLs ou formats non-localisés :
```
/lawyers-in-thailand /en-us/lawyers-in-thailand 301
/avocats-en-thailande /fr-fr/avocats-en-thailande 301
```

---

## DONNÉES DE RÉFÉRENCE

### Mapping pays → langues officielles/courantes

Utiliser la config existante `sos/src/multilingual-system/config/countries.json` et enrichir avec :

```typescript
const COUNTRY_LANGUAGES: Record<string, string[]> = {
  // Pays francophones
  FR: ['fr'], BE: ['fr', 'de'], CH: ['fr', 'de'], CA: ['fr', 'en'],
  DZ: ['ar', 'fr'], MA: ['ar', 'fr'], TN: ['ar', 'fr'],
  SN: ['fr'], CI: ['fr'], CM: ['fr', 'en'], CD: ['fr'],
  MG: ['fr'], ML: ['fr'], BF: ['fr'], NE: ['fr'], TD: ['fr'],

  // Pays anglophones
  US: ['en'], GB: ['en'], AU: ['en'], NZ: ['en'], IE: ['en'],
  ZA: ['en'], NG: ['en'], GH: ['en'], KE: ['en'], IN: ['en', 'hi'],
  SG: ['en'], HK: ['en', 'zh'], PH: ['en'],

  // Pays hispanophones
  ES: ['es'], MX: ['es'], AR: ['es'], CO: ['es'], CL: ['es'],
  PE: ['es'], VE: ['es'], EC: ['es'], BO: ['es'], PY: ['es'],
  UY: ['es'], CR: ['es'], PA: ['es'], DO: ['es'], CU: ['es'],

  // Pays germanophones
  DE: ['de'], AT: ['de'], CH: ['fr', 'de'], LI: ['de'], LU: ['fr', 'de'],

  // Pays arabophones
  SA: ['ar'], AE: ['ar', 'en'], EG: ['ar'], MA: ['ar', 'fr'],
  DZ: ['ar', 'fr'], TN: ['ar', 'fr'], IQ: ['ar'], JO: ['ar'],
  LB: ['ar', 'fr'], KW: ['ar'], QA: ['ar', 'en'], BH: ['ar'],
  OM: ['ar'], YE: ['ar'], LY: ['ar'], SD: ['ar'],

  // Pays russophones
  RU: ['ru'], BY: ['ru'], KZ: ['ru'], KG: ['ru'], UA: ['ru'],

  // Pays lusophones
  PT: ['pt'], BR: ['pt'], AO: ['pt'], MZ: ['pt'],

  // Pays sinophones
  CN: ['zh'], TW: ['zh'], SG: ['en', 'zh'],

  // Pays hindiphones
  IN: ['hi', 'en'],

  // Pays sans langue du site → anglais par défaut
  TH: ['en'], JP: ['en'], KR: ['en'], VN: ['en'], // etc.
};
```

### Mapping langue → code site
```typescript
const LANGUAGE_TO_SITE_CODE: Record<string, string> = {
  'French': 'fr', 'English': 'en', 'Spanish': 'es',
  'German': 'de', 'Russian': 'ru', 'Portuguese': 'pt',
  'Chinese': 'ch', 'Mandarin': 'ch', 'Arabic': 'ar', 'Hindi': 'hi',
  'Italian': 'en', // Italien non supporté → fallback anglais
  'Japanese': 'en', // Japonais non supporté → fallback anglais
  // Toute langue non supportée → fallback anglais
};
```

### Slug de pays traduit

```typescript
// Exemples de traduction des noms de pays dans les URLs
const COUNTRY_SLUG_TRANSLATIONS: Record<string, Record<string, string>> = {
  TH: { fr: 'thailande', en: 'thailand', es: 'tailandia', de: 'thailand', ar: 'تايلاند', ru: 'tailand', pt: 'tailandia', zh: 'taiguo', hi: 'thailand' },
  AE: { fr: 'emirats-arabes-unis', en: 'uae', es: 'emiratos-arabes', de: 'vereinigte-arabische-emirate', ar: 'الإمارات', ... },
  // ... 197 pays
};
```

**NOTE** : Ces traductions de noms de pays existent déjà partiellement dans `sos/src/multilingual-system/config/countries.json`. Les réutiliser et les enrichir.

---

## STACK TECHNIQUE

- **Frontend** : React 18 + TypeScript + Vite + Tailwind + react-intl (i18n)
- **Backend** : Firebase Cloud Functions (Node.js, TypeScript)
- **Base de données** : Firestore (collection `sos_profiles`)
- **Hébergement** : Cloudflare Pages (frontend) + Firebase (backend)
- **SSR** : Cloudflare Worker → Firebase Cloud Function avec Puppeteer
- **SEO** : react-helmet-async, JSON-LD via composants seo/, IndexNow + Google Indexing API
- **Routing** : React Router v6 avec système multilingue custom (localeRoutes.ts)

---

## FICHIERS CLÉS À CONNAÎTRE

| Fichier | Rôle |
|---------|------|
| `sos/src/App.tsx` | Routes de l'application |
| `sos/src/multilingual-system/core/routing/localeRoutes.ts` | Traductions des routes |
| `sos/src/multilingual-system/sitemaps/constants.ts` | Config sitemap statique |
| `sos/src/pages/SOSCall.tsx` | Page listing actuelle (filtres JS) |
| `sos/src/pages/ProviderProfile.tsx` | Page profil individuel (modèle de SEO) |
| `sos/src/components/seo/` | Tous les composants SEO (ReviewSchema, BreadcrumbSchema, FAQPageSchema, etc.) |
| `sos/firebase/functions/src/seo/sitemaps.ts` | Sitemaps dynamiques |
| `sos/firebase/functions/src/seo/autoIndexingTriggers.ts` | Auto-indexing |
| `sos/firebase/functions/src/triggers/onProviderCreated.ts` | Trigger inscription |
| `sos/cloudflare-worker/worker.js` | SSR bot detection |
| `sos/public/_redirects` | Redirects Cloudflare Pages |
| `sos/public/robots.txt` | Crawl rules |

---

## CRITÈRES DE QUALITÉ

### Chaque page pays DOIT avoir :
- [ ] URL traduite dans la langue de la page
- [ ] Meta title < 60 chars avec : "Rôle + Pays + Langue | SOS Expat"
- [ ] Meta description < 160 chars avec : rôle, pays, spécialités disponibles, nombre de prestataires
- [ ] Canonical URL self-referencing
- [ ] Hreflang vers toutes les autres versions linguistiques de la même page pays
- [ ] x-default vers la version française
- [ ] BreadcrumbList JSON-LD : Home > Avocats > Avocats en [Pays]
- [ ] FAQPage JSON-LD : 3-5 questions traduites
- [ ] ItemList JSON-LD listant les prestataires
- [ ] Offer JSON-LD avec prix
- [ ] AggregateRating si des prestataires ont des avis
- [ ] OG tags (titre, description, image)
- [ ] Twitter Card tags
- [ ] robots: index, follow
- [ ] data-page-loaded marker pour SSR
- [ ] Liens internes vers chaque profil individuel
- [ ] Liens internes vers les pages pays adjacentes (ex: "Voir aussi : Avocats aux Émirats")

### Performance :
- [ ] Pas de requête Firestore côté client pour le listing (utiliser des données pré-calculées ou Cloud Functions)
- [ ] Lazy loading des images prestataires
- [ ] Pas plus de 50 prestataires par page (pagination)

### Auto-génération :
- [ ] Nouvelle inscription → pages pays mises à jour automatiquement
- [ ] Prestataire supprimé/désactivé → retiré des pages pays automatiquement
- [ ] Changement de pays d'intervention → pages pays mises à jour automatiquement
- [ ] Cache SSR invalidé quand un prestataire change dans un pays

---

## REFONTE COMPLÈTE DES SLUGS PRESTATAIRES

⚠️ **LES SLUGS ACTUELS SONT CATASTROPHIQUES POUR LE SEO. À REFONDRE EN PRIORITÉ.**

### Problème actuel

Les slugs actuels contiennent des identifiants internes, des codes illisibles et le préfixe "aaa_" des profils :

```
❌ ACTUEL (exemples réels) :
/fr-fr/avocat/tn/francais/khadija-b-aaa_lawyer_1769083221434_yxe3
/en-us/lawyer/hr/francais/peter-s-aaa_lawyer_1769083212492_kkpa
/fr-fr/avocat-croatie/peter-immi-visas-perm-j97b3u

Problèmes :
- "aaa_lawyer_1769083221434_yxe3" = identifiant interne exposé (pas pro, pas SEO)
- "aaa_" = préfixe de profil visible dans l'URL (Google peut considérer comme test/spam)
- Chiffres longs sans signification pour l'utilisateur ni pour Google
- "/tn/" et "/francais/" = segments redondants et non optimisés
- Le shortId "j97b3u" est mieux mais pas encore parfait
```

### Format de slug OPTIMAL à implémenter

```
✅ FORMAT CIBLE :
/{locale}/{role-pays}/{prenom-specialite-shortid}

Exemples :
/fr-fr/avocat-tunisie/khadija-droit-famille-k8m2
/en-us/lawyer-tunisia/khadija-family-law-k8m2
/ar-sa/محامي-تونس/خديجة-قانون-الأسرة-k8m2
/de-de/anwalt-kroatien/peter-einwanderung-p3x7
/fr-fr/avocat-croatie/peter-immigration-p3x7
```

### Règles de génération des slugs

1. **Prénom uniquement** — JAMAIS le nom de famille (confidentialité)
2. **Spécialité principale traduite** dans la langue de la page
3. **ShortId court (4-6 chars)** — alphanumérique, pas de tirets, dérivé du UID Firebase
4. **JAMAIS de** :
   - Préfixe `aaa_` (même pour les profils AAA — le slug doit être identique aux vrais profils)
   - Identifiants Firebase longs (`1769083221434`)
   - Underscores dans l'URL (utiliser des tirets)
   - Codes pays ISO dans le chemin (`/tn/`, `/hr/`) — le pays est déjà dans le segment role-pays
   - Segments `/francais/` ou `/english/` — la langue est déjà dans le locale prefix
5. **Pays traduit dans le segment role-pays** :
   - FR : `avocat-tunisie`, `avocat-croatie`, `expatrie-thailande`
   - EN : `lawyer-tunisia`, `lawyer-croatia`, `expat-thailand`
   - AR : `محامي-تونس`, `محامي-كرواتيا`
   - Etc. pour les 9 langues
6. **Longueur max du slug complet** (après le locale) : **50 caractères** (Google tronque au-delà dans les SERP)
7. **Caractères autorisés** : lettres minuscules, chiffres, tirets, caractères Unicode (arabe, chinois, hindi, cyrillique)

### Raccourcissement intelligent des spécialités

Les spécialités juridiques peuvent être très longues. Il faut un système de **slug court** par spécialité :

```typescript
// Mapping spécialité longue → slug court (par langue)
const SPECIALTY_SLUGS: Record<string, Record<string, string>> = {
  // Code interne → { lang: slug court }
  'DROIT_INTERNATIONAL_PRIVE': {
    fr: 'droit-intl',
    en: 'intl-law',
    es: 'derecho-intl',
    de: 'intl-recht',
    ar: 'قانون-دولي',
    ru: 'mezhd-pravo',
    pt: 'direito-intl',
    zh: 'guoji-fa',
    hi: 'intl-law',
  },
  'IMMIGRATION_VISAS_PERMIS_RESIDENCE': {
    fr: 'immigration',
    en: 'immigration',
    es: 'inmigracion',
    de: 'einwanderung',
    ar: 'هجرة',
    ru: 'immigratsiya',
    pt: 'imigracao',
    zh: 'yimin',
    hi: 'immigration',
  },
  'DROIT_FAMILLE_MARIAGE_DIVORCE': {
    fr: 'famille',
    en: 'family',
    es: 'familia',
    de: 'familie',
    ar: 'أسرة',
    ru: 'semya',
    pt: 'familia',
    zh: 'jiating',
    hi: 'parivar',
  },
  'FISCALITE_DECLARATIONS_IMPOTS': {
    fr: 'fiscal',
    en: 'tax',
    es: 'fiscal',
    de: 'steuer',
    ar: 'ضرائب',
    ru: 'nalogi',
    pt: 'fiscal',
    zh: 'shuiwu',
    hi: 'tax',
  },
  // ... CHAQUE spécialité doit avoir un slug court de 5-15 chars max par langue
  // Lister toutes les spécialités existantes dans lawyer-specialties.ts et expat-help-types.ts
};
```

**Règles de raccourcissement :**
1. Chaque spécialité a un **slug court prédéfini** (5-15 chars) dans chaque langue
2. Si la spécialité n'a pas de slug court → prendre les **2 premiers mots** et tronquer à 15 chars
3. Si le slug complet dépasse 50 chars → supprimer la spécialité, garder seulement `{prenom}-{shortid}`
4. **Priorité** : prénom (obligatoire) > spécialité (souhaité) > shortId (obligatoire)

**Exemples de raccourcissement :**
```
Spécialité longue : "Droit international privé et succession"
→ Slug court FR : "droit-intl"
→ URL : /fr-fr/avocat-tunisie/khadija-droit-intl-k8m2  (42 chars ✅)

Spécialité longue : "القانون الدولي الخاص والميراث"
→ Slug court AR : "قانون-دولي"
→ URL : /ar-sa/محامي-تونس/خديجة-قانون-دولي-k8m2  (38 chars ✅)

Spécialité longue : "Urgent assistance for domestic violence cases abroad"
→ Slug court EN : "domestic-violence"
→ URL : /en-us/lawyer-tunisia/khadija-domestic-violence-k8m2  (47 chars ✅)

Prénom très long + spécialité → dépasse 50 chars :
→ Fallback : /fr-fr/avocat-tunisie/jean-philippe-k8m2  (garder prénom + shortId)
```

### Migration des slugs existants

```
CRITIQUE : NE PAS CASSER LES ANCIENNES URLs

1. Générer les NOUVEAUX slugs pour TOUS les prestataires (existants + futurs)
2. Stocker dans Firestore : sos_profiles.slugs[lang] = nouveau slug
3. Créer des REDIRECTS 301 automatiques : ancien slug → nouveau slug
4. Les anciennes URLs continuent de fonctionner (301 redirect)
5. Le sitemap ne référence QUE les nouveaux slugs
6. Google recrawle → suit le 301 → indexe la nouvelle URL
```

### Gestion des profils AAA

Les profils AAA (`uid.startsWith('aaa_')`) sont de VRAIS profils de prestataires. Leurs slugs doivent être **identiques en format** aux profils normaux :

```
❌ INTERDIT : /fr-fr/avocat-tunisie/khadija-aaa_lawyer_1769083221434
✅ CORRECT  : /fr-fr/avocat-tunisie/khadija-droit-famille-k8m2
```

Le préfixe `aaa_` ne doit JAMAIS apparaître dans une URL publique. Le shortId doit être dérivé du UID mais sans exposer le format interne.

---

## MIGRATION DES PRESTATAIRES EXISTANTS

⚠️ **Il y a déjà ~77+ prestataires inscrits. Les pages pays doivent être générées pour EUX AUSSI, pas seulement les futurs.**

### Script de migration (à exécuter UNE FOIS après le déploiement)

```typescript
// scripts/generate-country-pages-index.ts
// 1. Lire TOUS les sos_profiles actifs (isVisible + isApproved + isActive)
// 2. Pour chaque prestataire, calculer sa matrice pays × langues
// 3. Agréger : pour chaque couple (pays, langue), lister les prestataires éligibles
// 4. Générer un document Firestore "country_listings/{countryCode}_{lang}" avec :
//    - providerIds: string[]
//    - providerCount: number
//    - lastUpdated: Timestamp
//    - topRating: number (meilleure note du pays)
//    - topSpecialties: string[] (spécialités les plus courantes)
// 5. Soumettre TOUTES les nouvelles URLs à IndexNow (batch)
// 6. Soumettre les plus importantes à Google Indexing API (quota 200/jour)
```

### Mise à jour incrémentale (automatique après migration)

Quand un prestataire est **créé, modifié ou supprimé** :
```
onProviderCreated → recalculer les country_listings affectés
onProviderUpdated → si operatingCountries ou languages changent → recalculer
onProviderDeleted → retirer des country_listings + noindex si page devient vide
```

---

## GESTION DES CAS LIMITES

### 1. Prestataire sans pays d'intervention renseignés
- Utiliser `provider.country` (pays principal) comme seul pays d'intervention
- La page pays est quand même créée pour ce pays

### 2. Pays sans aucune langue du site comme langue officielle (ex: Thaïlande, Japon, Corée)
- Créer la page en **anglais** (langue universelle) : `/en-us/lawyers-in-thailand/`
- Créer aussi dans les **langues que les prestataires du pays parlent**
- Ex: Si Ahmed parle arabe et travaille en Thaïlande → `/ar-sa/محامون-في-تايلاند/` est créée

### 3. Page pays avec 0 prestataires (dernier prestataire désactivé)
- Ajouter `noindex` à la page
- NE PAS supprimer l'URL (évite les 404 si Google l'a en cache)
- Afficher un message : "Aucun prestataire disponible dans ce pays. Recherchez dans les pays voisins."
- Proposer des liens vers les pays adjacents

### 4. Prestataire qui change ses pays d'intervention
- Le trigger `onProviderUpdated` détecte le changement
- Retire le prestataire des anciens country_listings
- L'ajoute aux nouveaux country_listings
- Invalide le cache SSR des pages concernées
- Soumet les URLs modifiées à IndexNow

### 5. Deux types de prestataires dans le même pays (avocat + expat)
- Créer des pages SÉPARÉES :
  - `/fr-fr/avocats-en-thailande/` (avocats uniquement)
  - `/fr-fr/expatries-en-thailande/` (expats uniquement)
- Et potentiellement une page combinée `/fr-fr/prestataires-en-thailande/`

### 6. Pagination pour les pays avec beaucoup de prestataires
- Maximum 20 prestataires par page
- Pagination : `/fr-fr/avocats-en-france/`, `/fr-fr/avocats-en-france/page/2/`
- Chaque page paginée a sa propre canonical + prev/next links
- Toutes les pages paginées sont dans le sitemap

### 7. Tri des prestataires sur les pages pays
- Tri par défaut : en ligne d'abord, puis par note, puis par nombre d'avis
- Le tri est serveur-side (pas JS client) pour le SEO

### 8. Langues du prestataire non supportées par le site
- Ex: Un prestataire parle uniquement italien → l'italien n'est pas une des 9 langues du site
- Fallback : la page est créée en **anglais** (en-us) car l'anglais est universel
- Le prestataire apparaît aussi dans les pages des langues officielles de ses pays d'intervention

---

## LIVRABLES ATTENDUS

### Phase 1 : Refonte des slugs (PRIORITAIRE — à faire AVANT les pages pays)
1. **Nouveau générateur de slugs** — Format : `{role-pays}/{prenom-specialite-shortid}` traduit dans 9 langues
2. **Script de migration des slugs** — Régénérer les slugs de TOUS les 77+ prestataires existants
3. **Système de redirects 301** — Ancien slug → nouveau slug (aucune URL cassée)
4. **Mise à jour `onProviderCreated`** — Nouveau format de slug pour chaque futur prestataire
5. **Mise à jour sitemaps** — Ne référencer QUE les nouveaux slugs
6. **Soumission IndexNow/Google** — Informer les moteurs de recherche des nouvelles URLs

### Phase 2 : Pages pays dynamiques
7. **Composant `ProvidersByCountry.tsx`** — Page listing par pays avec SEO complet
8. **Routes multilingues** — Ajout dans App.tsx + localeRoutes.ts
9. **Cloud Function `sitemapCountryListings`** — Sitemap dynamique des pages pays
10. **Cloud Function ou trigger pour `country_listings`** — Pré-calcul Firestore des données par pays
11. **Mise à jour `onProviderCreated` + `onProviderUpdated`** — Auto-indexing + mise à jour des pages pays
12. **Script de migration pages pays** — Générer les pages pays pour les 77+ prestataires existants
13. **Mise à jour `worker.js`** — Patterns SSR pour pages pays
14. **Mise à jour `_redirects`** — Redirects pour URLs non-localisées
15. **Mise à jour `robots.txt`** — Déclaration du nouveau sitemap
16. **Mapping COUNTRY_LANGUAGES complet** — 197 pays → langues (fichier de config JSON)

### Phase 3 : Validation
17. **Tests matrice pays × langues** — Vérifier 10+ scénarios type (avocat arabophone en Thaïlande, expat anglophone au Brésil, etc.)
18. **Test Google Rich Results** — Valider le structured data de chaque type de page via https://search.google.com/test/rich-results
19. **Test redirects 301** — Vérifier que TOUTES les anciennes URLs redirigent vers les nouvelles
20. **Test SSR** — Vérifier que Puppeteer rend correctement les pages pays
21. **Test sitemaps** — Valider les nouveaux sitemaps via Google Search Console

---

## ⛔ INTERDICTIONS

- Ne PAS modifier les pages de profils individuels existants (ProviderProfile.tsx) — ils sont déjà parfaits
- Ne PAS créer de pages pour des combinaisons pays/langue où AUCUN prestataire n'existe
- Ne PAS hardcoder les données — tout doit venir de Firestore
- Ne PAS utiliser de traduction automatique pour les contenus — utiliser le système i18n existant (react-intl)
- Ne PAS créer de pages vides — minimum 1 prestataire pour qu'une page pays existe
- Ne PAS indexer les pages avec 0 prestataires (noindex si un prestataire quitte et la page devient vide)
