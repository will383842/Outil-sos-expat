# PROMPT — Système IA d'Optimisation SEO Automatique des Fiches Prestataires

---

## CONTEXTE DU PROJET

Tu travailles sur **SOS Expat & Travelers** (https://sos-expat.com), une plateforme qui met en relation des **avocats** et **expatriés aidants** avec des personnes ayant besoin d'aide partout dans le monde :

- **Expatriés** installés à l'étranger
- **Vacanciers** et touristes en déplacement
- **Digital nomades** travaillant à distance
- **Voyageurs d'affaires** et travailleurs détachés
- **Étudiants internationaux** en échange ou mobilité
- **Retraités à l'étranger**
- **Familles en relocation**

La plateforme couvre **197 pays**, **9 langues** (FR, EN, ES, DE, PT, RU, ZH, AR, HI) et fonctionne **24/7**.

### Types de prestataires

**Avocats** (`type: "lawyer"`) :
- Spécialités juridiques (immigration, droit du travail, fiscalité, famille, immobilier, etc.)
- Champs : `specialties[]` avec codes comme `IMMI_VISAS_PERMIS_SEJOUR`, `FAM_MARIAGE_DIVORCE`
- Consultation de 20 minutes à 49€

**Expatriés aidants** (`type: "expat"`) :
- Types d'aide pratique (logement, démarches administratives, vie quotidienne, etc.)
- Champs : `helpTypes[]` avec codes comme `LOGEMENT`, `DEMARCHES_ADMIN`
- Consultation de 30 minutes à 19€

### Architecture technique existante

- **Frontend** : React + TypeScript + Vite, déployé sur Cloudflare Pages
- **Backend** : Firebase Cloud Functions (3 régions : europe-west1, us-central1, europe-west3)
- **Base de données** : Firestore (collections `users`, `sos_profiles`)
- **SSR** : Cloudflare Worker → Puppeteer (renderForBotsV2) pour les bots
- **i18n** : react-intl avec 9 fichiers de traduction (en.json, fr.json, es.json, de.json, pt.json, ru.json, ch.json, ar.json, hi.json)
- **SEO existant** : SEOHead component, HreflangLinks, BreadcrumbSchema, FAQPageSchema, ArticleSchema, ProfessionalServiceSchema, OrganizationSchema
- **Sitemap** : sitemapProfiles Cloud Function avec hreflang × 9 langues
- **Indexation** : IndexNow + Google Indexing API via autoIndexingTriggers.ts
- **Spécialités** : `lawyer-specialties.ts` (labels traduits en 9 langues), `expat-help-types.ts` (labels traduits)
- **Traductions profils** : `providerTranslationService.ts` traduit automatiquement les profils via IA
- **Profils AAA** : ~200 profils test/démo (uid commence par `aaa_`), générés par `aaaProfileGenerator.ts`

### Données disponibles par prestataire (Firestore)

```typescript
// Collection: sos_profiles/{uid}
{
  uid: string;
  type: "lawyer" | "expat";
  firstName: string;
  lastName: string;
  country: string;              // Code ISO 2 lettres (ex: "TH", "TN", "FR")
  city?: string;
  languages: string[];          // Langues parlées (ex: ["French", "English", "Thai"])
  specialties?: string[];       // Codes spécialités avocats
  helpTypes?: string[];         // Codes types d'aide expats
  yearsOfExperience?: number;
  yearsAsExpat?: number;
  description?: string | Record<string, string>;  // Description libre (1 langue ou multilingue)
  bio?: string | Record<string, string>;
  rating?: number;
  reviewCount?: number;
  totalCalls?: number;
  successRate?: number;
  isVisible: boolean;
  isAAA?: boolean;              // Profil de test
  slugs: Record<string, string>; // Slugs par langue pour les URLs
  profilePhoto?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## MISSION

Construire un **système automatisé** qui utilise l'API Claude (Anthropic) pour générer et optimiser les éléments SEO de chaque fiche prestataire. Le système doit :

1. **Fonctionner sur les profils existants** (y compris les ~200 profils AAA) ET sur tous les futurs profils
2. **Couvrir les 9 langues** avec des traductions natives (pas du mot-à-mot)
3. **Cibler toutes les audiences** (expatriés, vacanciers, digital nomades, étudiants, etc.)
4. **Stocker les résultats dans Firestore** sans écraser les données du prestataire
5. **S'intégrer au frontend** existant (SEOHead, structured data, etc.)
6. **Déclencher l'indexation** via IndexNow + Google Indexing API après génération

---

## ARCHITECTURE DU SYSTÈME

### Déclencheurs (quand exécuter l'IA)

| Événement | Action | Priorité |
|-----------|--------|----------|
| **Nouveau profil créé** (`onProviderCreated`) | Générer tous les éléments SEO × 9 langues | Immédiat |
| **Profil modifié** (description, spécialités, pays) | Régénérer les éléments affectés | Dans les 5 min |
| **Premier avis reçu** (`rating > 0`) | Intégrer la note dans les meta descriptions | Dans l'heure |
| **Migration initiale** (profils existants) | Script batch pour tous les profils existants | One-shot |
| **Optimisation mensuelle** (optionnel, phase 2) | Analyser GSC + réoptimiser les sous-performants | 1×/mois |

### Stockage Firestore

```typescript
// Sous-collection : sos_profiles/{uid}/seo_optimized/{locale}
// Exemple : sos_profiles/abc123/seo_optimized/fr
{
  locale: "fr",                    // Code langue

  // ========== SEO CLASSIQUE (Google, Bing, Yandex, Baidu) ==========
  metaTitle: string,               // <title> optimisé (max 60 chars) — apparaît dans Google
  metaDescription: string,         // <meta description> optimisée (max 155 chars) — snippet Google
  keywords: string[],              // 10-15 mots-clés ciblés dans la langue
  semanticKeywords: string[],      // 15-20 mots sémantiquement liés (LSI) pour le contenu enrichi
                                   // Ex FR: ["consultation juridique", "droit international", "expatriation", "visa travail"]
                                   // Ex EN: ["legal consultation", "international law", "expatriation", "work visa"]

  // ========== CONTENU DU PROFIL ==========
  profileDescription: string,      // Description enrichie et engageante (250-400 chars) — affichée sur la page
  profileDescriptionLong: string,  // Description longue SEO (600-800 chars) — pour le structured data et le contenu enrichi
  originalDescriptionCorrected?: string, // Description originale corrigée (orthographe, grammaire)
  correctionsMade?: string[],      // Liste des corrections faites
  detectedLanguage: string,        // Langue détectée de la description originale
  qualityScore: number,            // Score qualité 0-100

  // ========== FAQ PERSONNALISÉES (Rich Snippets + AEO) ==========
  faqs: [                          // 5-6 FAQ personnalisées
    {
      question: string,            // Question que les gens posent VRAIMENT sur Google
      answer: string,              // Réponse complète (2-3 phrases)
      category: string,            // Catégorie : "legal" | "practical" | "cost" | "process" | "reviews"
    }
  ],

  // ========== OPEN GRAPH (Facebook, LinkedIn, WhatsApp) ==========
  ogTitle: string,                 // Titre social (max 70 chars — plus long que meta title)
  ogDescription: string,           // Description sociale (max 200 chars — plus long que meta desc)
                                   // Optimisé pour donner envie de cliquer quand partagé sur les réseaux

  // ========== TWITTER CARD ==========
  twitterTitle: string,            // Titre Twitter (max 70 chars)
  twitterDescription: string,      // Description Twitter (max 200 chars)

  // ========== AEO — Answer Engine Optimization (ChatGPT, Perplexity, Google AI Overview) ==========
  aiSummary: string,               // Résumé optimisé pour les IA (150-250 chars)
                                   // Structuré comme une réponse directe à "Qui est [nom] ?"
                                   // Ex: "Jean Dupont est un avocat français basé à Tokyo, spécialisé en immigration
                                   // et droit des affaires. 8 ans d'expérience au Japon. Consultation 49€/20min sur SOS Expat."
  aiKeyFacts: string[],            // 5-7 faits clés structurés pour les IA
                                   // Ex: ["Avocat français à Tokyo", "8 ans d'expérience", "Spécialité: immigration",
                                   //      "Langues: français, anglais, japonais", "Consultation: 49€/20min", "Note: 4.9/5"]
  expertise: string,               // Niveau d'expertise pour les IA ("Legal Services, Immigration Law, Japan")
  trustworthiness: string,         // Signaux de confiance ("verified_lawyer, 8_years_experience, 4.9_rating, 127_reviews")

  // ========== STRUCTURED DATA (JSON-LD) ==========
  structuredData: {
    // Schema LegalService/ProfessionalService enrichi
    serviceDescription: string,    // Description du service (pas du prestataire) pour le schema Service
    serviceArea: string,           // Zone de service traduite ("Tokyo, Japon" / "Tokyo, Japan")
    knowsAbout: string[],          // Expertise reconnue (5-8 sujets)
                                   // Ex: ["Immigration law in Japan", "Work visa applications", "Business registration"]
    hasOfferCatalog: {             // Catalogue de services (pour les rich snippets prix)
      name: string,                // "Services juridiques" / "Legal Services"
      services: string[],          // Spécialités traduites en texte naturel
    },
  },

  // ========== BREADCRUMB OPTIMISÉ ==========
  breadcrumbLabel: string,         // Label du breadcrumb pour ce prestataire
                                   // Ex: "Avocat immigration Tokyo" (pas juste "Jean D.")
                                   // Google affiche les breadcrumbs dans les résultats

  // ========== MÉTADONNÉES SYSTÈME ==========
  generatedAt: Timestamp,
  modelUsed: string,               // "claude-sonnet-4-6"
  inputHash: string,               // Hash des données source
  version: number,                 // Version du prompt
  isExtraLanguage?: boolean,       // true si langue hors des 9 du site
}
```

### Intégration Frontend

Le composant `ProviderProfile.tsx` doit :

**SEO classique :**
1. `metaTitle` → `<SEOHead title={...}>` (fallback : titre existant)
2. `metaDescription` → `<SEOHead description={...}>` (fallback : description existante)
3. `keywords` → `<SEOHead keywords={...}>` (fallback : aucun)
4. `breadcrumbLabel` → `<BreadcrumbSchema>` dernier élément (fallback : nom du prestataire)

**Contenu affiché :**
5. `profileDescription` → description courte visible sur la page (fallback : description prestataire)
6. `profileDescriptionLong` → contenu étendu de la page + description dans le structured data
7. `originalDescriptionCorrected` → remplace la description brute si elle existe
8. `faqs` → `<FAQPageSchema>` avec `inLanguage` (fallback : FAQ snippetGenerator)

**Réseaux sociaux :**
9. `ogTitle` → `<meta property="og:title">` (fallback : metaTitle)
10. `ogDescription` → `<meta property="og:description">` (fallback : metaDescription)
11. `twitterTitle` → `<meta name="twitter:title">` (fallback : ogTitle)
12. `twitterDescription` → `<meta name="twitter:description">` (fallback : ogDescription)

**AEO (IA) :**
13. `aiSummary` → `<SEOHead aiSummary={...}>` (fallback : description)
14. `aiKeyFacts` → `<meta name="ai-key-facts">` (nouveau)
15. `expertise` → `<SEOHead expertise={...}>` (fallback : spécialités)
16. `trustworthiness` → `<SEOHead trustworthiness={...}>` (fallback : basique)

**Structured data (JSON-LD) :**
17. `structuredData.serviceDescription` → description dans le schema LegalService/ProfessionalService
18. `structuredData.serviceArea` → areaServed traduit dans le schema
19. `structuredData.knowsAbout` → knowsAbout dans le schema Person/Attorney
20. `structuredData.hasOfferCatalog` → OfferCatalog avec noms traduits des services

**Sémantique (contenu invisible pour les moteurs) :**
21. `semanticKeywords` → intégrés naturellement dans `profileDescriptionLong`
    (pas en meta keywords — Google les ignore depuis 2009 — mais dans le contenu de la page)

### Traduction de la description dans les langues parlées par le prestataire

**Cas concret** : un avocat parle arabe, italien et thaïlandais mais a rempli sa fiche en anglais.

Le système IA génère :
1. **`seo_optimized/fr`** → meta title FR, description FR, FAQ FR, keywords FR + `profileDescription` en français
2. **`seo_optimized/en`** → idem en anglais (+ `originalDescriptionCorrected` en anglais = langue source)
3. **`seo_optimized/ar`** → idem en arabe
4. **`seo_optimized/es`**, **`/de`**, **`/pt`**, **`/ru`**, **`/zh`**, **`/hi`** → idem dans chaque langue

**Les 9 langues du site sont TOUJOURS générées** — mais en plus, le système vérifie les langues parlées par le prestataire (`provider.languages`). Si le prestataire parle une langue qui N'EST PAS dans les 9 langues du site (ex: italien, thaï, néerlandais, turc, japonais, etc.) :

```typescript
// Sous-collection étendue pour les langues hors-site
// sos_profiles/{uid}/seo_optimized/it  (italien)
// sos_profiles/{uid}/seo_optimized/th  (thaïlandais)
{
  locale: "it",
  profileDescription: string,           // Description traduite en italien
  originalDescriptionCorrected: null,    // Pas de correction (description source est en EN, pas IT)
  metaTitle: string,                     // Meta title en italien (pour le SEO si hreflang IT existe un jour)
  metaDescription: string,              // Meta description en italien
  faqs: [...],                          // FAQ en italien
  isExtraLanguage: true,                // Flag : langue hors des 9 langues du site
}
```

**IMPORTANT — Option A retenue** : le système IA génère le contenu SEO **uniquement dans les 9 langues du site** (FR, EN, ES, DE, PT, RU, ZH, AR, HI). Les langues extra du prestataire (italien, thaï, néerlandais, etc.) ne sont **PAS** générées car le site n'a pas de templates d'interface dans ces langues — ça créerait un mélange incohérent (description en néerlandais + boutons en anglais).

Les langues parlées par le prestataire servent uniquement à :
- Afficher un badge "Parle néerlandais / italien / thaï" sur le profil
- Informer le client qu'il peut appeler dans cette langue
- Être mentionnées dans les meta descriptions et FAQ (ex: "Speaks Dutch, Italian and Thai")

Si une nouvelle langue est ajoutée au site à l'avenir (ex: italien comme 10e langue), il suffira de relancer la génération pour ces profils.

### Gestion des corrections de description

**Stratégie : correction automatique + notification admin si score < 50**

| Score qualité | Action |
|---------------|--------|
| 80-100 | Afficher la description corrigée silencieusement (corrections mineures) |
| 50-79 | Afficher la description corrigée + log dans `seo_corrections/{uid}` pour review admin |
| 0-49 | **Alerte admin** via Telegram bot (description de très mauvaise qualité, nécessite intervention humaine) |
| Description vide | Utiliser `profileDescription` générée par l'IA comme fallback |

**Important** : la description corrigée conserve le **sens, le ton et le style** du prestataire. L'IA ne réécrit pas — elle corrige uniquement les erreurs. Le prestataire ne voit pas la différence (sa description est simplement "propre" aux yeux de Google et des visiteurs).

**Option admin** : un bouton dans le dashboard admin pour voir les corrections faites sur chaque profil (`correctionsMade[]`) et valider/rejeter la version corrigée.

---

## PROMPT POUR L'API CLAUDE

### Prompt système (system prompt)

```
Tu es un expert SEO international spécialisé dans l'optimisation de fiches professionnelles pour les moteurs de recherche. Tu génères du contenu SEO pour une plateforme d'assistance juridique et pratique destinée aux personnes à l'étranger (expatriés, vacanciers, digital nomades, étudiants internationaux, voyageurs d'affaires, retraités à l'étranger, familles en relocation).

RÈGLES ABSOLUES :
1. Chaque texte doit être rédigé dans la LANGUE CIBLE de manière native (pas une traduction littérale)
2. Les meta titles font MAXIMUM 60 caractères
3. Les meta descriptions font MAXIMUM 155 caractères
4. Inclure naturellement les mots-clés que les utilisateurs recherchent VRAIMENT dans Google
5. Adapter le vocabulaire au PAYS cible (un français cherche "avocat expatriation", un espagnol cherche "abogado expatriación", un arabe cherche "محامي المغتربين")
6. Mentionner le prix et la disponibilité 24/7 quand pertinent
7. Ne JAMAIS inventer de faux avis, faux chiffres ou fausses qualifications
8. Varier les formulations — ne pas générer le même texte pour tous les prestataires
9. Penser AEO (Answer Engine Optimization) : structurer le contenu pour que les IA (Google AI Overview, ChatGPT, Perplexity) puissent l'utiliser comme source de réponse
10. Les FAQ doivent répondre aux VRAIES questions que les gens se posent pour ce type de service dans ce pays
11. TOUJOURS vérifier et corriger la description originale du prestataire : orthographe, grammaire, ponctuation, syntaxe, cohérence, clarté. Signaler chaque correction faite. Évaluer la qualité globale sur 100.
12. DÉTECTER automatiquement la langue de la description originale (peut être TOUTE langue du monde : turc, japonais, thaï, hébreu, etc.). Corriger dans la MÊME langue que l'original — ne JAMAIS traduire la description.
13. Si la description est dans une langue non supportée par le site (ex: turc, japonais), corriger quand même dans cette langue et générer les éléments SEO normalement dans les 9 langues cibles.
14. ATTENTION PAYS SPÉCIAUX : les territoires d'outre-mer français (GP, MQ, RE, NC, PF) sont des territoires français — adapter le contexte juridique. Pour les zones de conflit actives, se concentrer sur l'assistance d'urgence, pas le tourisme. Pour les pays sous sanctions, mentionner les complexités juridiques. Pour les micro-États (Monaco, Andorre), adapter le vocabulaire.
15. Ne JAMAIS retourner de JSON invalide. Si tu n'es pas sûr d'un champ, mettre une valeur par défaut plutôt que d'omettre le champ.
16. Ne JAMAIS inclure de codes bruts (SCREAMING_SNAKE_CASE comme FAM_SCOLARITE_INTERNATIONALE) ni de codes pays ISO (TN, TH) dans les textes. Toujours utiliser les noms complets traduits.
```

### Prompt utilisateur (user prompt) — template

```
Génère les éléments SEO optimisés pour ce prestataire dans la langue : {LOCALE}

## Données du prestataire
- Type : {TYPE} (lawyer = avocat / expat = expatrié aidant)
- Prénom : {FIRST_NAME}
- Pays d'exercice : {COUNTRY_NAME} ({COUNTRY_CODE})
- Ville : {CITY}
- Langues parlées : {LANGUAGES}
- Spécialités : {SPECIALTIES_LABELS} (labels traduits, pas les codes)
- Années d'expérience : {YEARS}
- Note : {RATING}/5 ({REVIEW_COUNT} avis) — NE PAS MENTIONNER si 0 avis
- Appels réalisés : {TOTAL_CALLS}
- Description originale du prestataire : {ORIGINAL_DESCRIPTION}
- Prix : {PRICE}
- URL du profil : {PROFILE_URL}

## Audience cible
Les personnes qui cherchent ce type de service dans ce pays :
- Expatriés installés dans le pays
- Touristes et vacanciers de passage
- Digital nomades en séjour temporaire
- Étudiants internationaux (Erasmus, échanges)
- Voyageurs d'affaires et travailleurs détachés
- Retraités vivant à l'étranger
- Familles en cours de relocation
- Toutes nationalités, toutes langues

## Ce que tu dois générer (JSON strict)

```json
{
  "// ===== SEO CLASSIQUE =====": "",
  "metaTitle": "Max 60 caractères. Inclure : nom, rôle, pays. Optimisé pour le CTR dans Google.",
  "metaDescription": "Max 155 caractères. Inclure : spécialité principale, pays, langues, prix, disponibilité. Call-to-action implicite.",
  "keywords": ["10-15 mots-clés ciblés. Ex: 'avocat immigration Japon', 'visa travail Tokyo'"],
  "semanticKeywords": ["15-20 mots sémantiquement liés (LSI keywords). Ex: 'consultation juridique', 'droit international', 'expatriation', 'permis séjour'. Ces mots doivent apparaître naturellement dans profileDescriptionLong."],

  "// ===== CONTENU DU PROFIL =====": "",
  "profileDescription": "250-400 caractères. Description engageante, donne envie de consulter. Inclut naturellement 3-4 keywords.",
  "profileDescriptionLong": "600-800 caractères. Description longue enrichie sémantiquement. Inclut naturellement les semanticKeywords. Utilisée dans le structured data et le contenu étendu de la page. Doit être UNIQUE par prestataire.",
  "detectedLanguage": "Code ISO de la langue détectée dans la description originale (ex: 'fr', 'en', 'tr', 'ja').",
  "originalDescriptionCorrected": "Description originale corrigée DANS SA LANGUE D'ORIGINE. Juste corriger orthographe/grammaire/ponctuation — ne PAS réécrire ni traduire. null si vide.",
  "correctionsMade": ["'Orthographe: avoact → avocat'", "'Grammaire: spécialisé dans → spécialisé en'", "ou ['Aucune correction nécessaire']"],
  "qualityScore": "0-100. Critères : orthographe (30pts), grammaire (25pts), clarté (25pts), pertinence (20pts).",

  "// ===== FAQ PERSONNALISÉES =====": "",
  "faqs": [
    {
      "question": "Question que les gens posent VRAIMENT sur Google pour ce type de service dans ce pays. Formulée naturellement, pas comme un robot.",
      "answer": "Réponse complète, utile, 2-3 phrases. Mentionne naturellement le prestataire, le prix, SOS Expat. Structurée pour être reprise par Google AI Overview comme réponse directe.",
      "category": "legal | practical | cost | process | reviews"
    }
  ],

  "// ===== RÉSEAUX SOCIAUX (Open Graph + Twitter) =====": "",
  "ogTitle": "Max 70 caractères. Titre accrocheur pour Facebook/LinkedIn/WhatsApp. Plus conversationnel que metaTitle. Ex: 'Besoin d'un avocat au Japon ? Jean D. vous aide en 5 min'",
  "ogDescription": "Max 200 caractères. Description engageante pour le partage social. Doit donner envie de cliquer. Inclure un bénéfice clair.",
  "twitterTitle": "Max 70 caractères. Similaire à ogTitle, adapté au ton Twitter (plus direct/concis).",
  "twitterDescription": "Max 200 caractères. Similaire à ogDescription.",

  "// ===== AEO — Answer Engine Optimization =====": "",
  "aiSummary": "150-250 caractères. Résumé structuré comme une réponse directe à 'Qui est [nom] ?' ou 'Comment trouver un avocat au [pays] ?'. Pensé pour ChatGPT, Perplexity, Google AI Overview.",
  "aiKeyFacts": ["5-7 faits clés structurés. Ex: 'Avocat français à Tokyo', '8 ans d'expérience', 'Spécialité: immigration', 'Consultation: 49€/20min', 'Note: 4.9/5'"],
  "expertise": "Domaines d'expertise. Ex: 'Immigration Law, Business Law, Japan'",
  "trustworthiness": "Signaux de confiance. Ex: 'verified_lawyer, 8_years_experience, 4.9_rating, 127_reviews'",

  "// ===== STRUCTURED DATA (pour JSON-LD) =====": "",
  "structuredData": {
    "serviceDescription": "Description du SERVICE (pas de la personne). Ex: 'Consultation juridique en immigration et droit des affaires au Japon avec un avocat français expérimenté.'",
    "serviceArea": "Zone de service traduite. Ex: 'Tokyo, Japon' (FR) / 'Tokyo, Japan' (EN)",
    "knowsAbout": ["5-8 sujets d'expertise. Ex: 'Immigration law in Japan', 'Work visa applications', 'Business registration in Tokyo'"],
    "hasOfferCatalog": {
      "name": "Nom du catalogue traduit. Ex: 'Services juridiques' (FR) / 'Legal Services' (EN)",
      "services": ["Spécialités traduites en texte naturel. Ex: 'Immigration et visas', 'Droit des affaires', 'Création d'entreprise'"]
    }
  },

  "// ===== BREADCRUMB =====": "",
  "breadcrumbLabel": "Label court et SEO pour le breadcrumb. Ex: 'Avocat immigration Tokyo' (pas juste 'Jean D.'). Google affiche les breadcrumbs dans les résultats.",

  "// ===== HOWTO SCHEMA =====": "",
  "howTo": {
    "name": "Comment consulter [nom] sur SOS Expat — traduit dans la langue cible",
    "steps": ["4 étapes traduites: visiter le profil → cliquer appeler → payer → être rappelé en 5 min"]
  },

  "// ===== IMAGE & GEO =====": "",
  "imageAltText": "Photo de [nom], [rôle] spécialisé en [spécialité] à [ville], [pays] | SOS Expat — traduit dans la langue cible",
  "geoTargeting": {
    "addressCountry": "Code ISO du pays (ex: JP)",
    "addressLocality": "Ville (ex: Tokyo)",
    "latitude": "Latitude du pays/ville (nombre)",
    "longitude": "Longitude du pays/ville (nombre)"
  },

  "// ===== RECHERCHE VOCALE =====": "",
  "speakable": "1-2 phrases naturelles que Google Assistant/Siri/Alexa peuvent lire à voix haute. Ex: 'Jean Dupont est avocat français à Tokyo, spécialisé en immigration. Consultation à 49 euros sur SOS Expat.'",

  "// ===== LONGUE TRAÎNE =====": "",
  "longTailKeywords": ["5-10 mots-clés de longue traîne très spécifiques. Ex: 'avocat français Tokyo pas cher', 'consultation juridique japon en ligne urgence'"],

  "// ===== MAILLAGE INTERNE =====": "",
  "relatedPages": [
    {"label": "Texte du lien traduit", "pathKey": "Clé de route pour générer l'URL. Ex: 'providers-country-jp' ou 'help-center' ou 'pricing'"}
  ],

  "// ===== AVIS =====": "",
  "reviewSummary": "Si le prestataire a des avis : résumé en 1-2 phrases. Ex: 'Ses clients apprécient sa réactivité et son expertise. Note 4.9/5.' — null si 0 avis.",

  "// ===== FRAÎCHEUR =====": "",
  "nextReviewDate": "Date ISO à laquelle le contenu devrait être régénéré (30 jours après la génération)"
}
```

## Contraintes par type

### Si AVOCAT :
- Mots-clés à cibler : "avocat + [spécialité] + [pays]", "lawyer + [specialty] + [country]", "consultation juridique + [pays]", "aide légale expatrié + [pays]"
- FAQ : questions sur les démarches juridiques dans ce pays, coûts, délais, processus
- Mentionner le prix (49€/20min) et la disponibilité immédiate

### Si EXPATRIÉ AIDANT :
- Mots-clés à cibler : "aide expatrié + [pays]", "conseil expatriation + [pays]", "helper expat + [country]", "vie quotidienne + [pays]"
- FAQ : questions pratiques sur la vie dans ce pays (logement, admin, culture, coût de la vie)
- Mentionner le prix (19€/30min) et l'aspect "expérience vécue" (pas théorique)

## Exemples de bonnes FAQ par pays

### Thaïlande :
- "Comment obtenir un visa de travail en Thaïlande ?"
- "Quel est le coût de la vie pour un expatrié à Bangkok ?"
- "Comment ouvrir un compte bancaire en Thaïlande en tant qu'étranger ?"

### Tunisie :
- "Quelles démarches pour s'installer en Tunisie ?"
- "Comment fonctionne le système fiscal tunisien pour les étrangers ?"

### Allemagne :
- "Brauche ich einen Anwalt für mein Arbeitsvisum in Deutschland?"
- "Wie finde ich eine Wohnung als Expat in Berlin?"

## IMPORTANT : Variété
Ne génère PAS le même texte pour tous les prestataires du même pays. Varie :
- La structure des phrases
- L'angle d'accroche (prix, expertise, disponibilité, langues, rapidité)
- Les questions FAQ
- Les mots-clés de longue traîne
```

---

## IMPLÉMENTATION TECHNIQUE

### Phase 1 — Cloud Function de génération (backend)

Créer une Cloud Function `generateProviderSEO` qui :

1. Reçoit un `uid` de prestataire
2. Lit le profil depuis Firestore (`sos_profiles/{uid}`)
3. Traduit les codes spécialités en labels lisibles via `getLawyerSpecialityLabel` / `getExpatHelpTypeLabel`
4. Traduit le code pays en nom complet via les données pays
5. **Détermine les langues cibles** :
   ```typescript
   const SITE_LANGUAGES = ['fr', 'en', 'es', 'de', 'pt', 'ru', 'zh', 'ar', 'hi'];

   // Mapper les langues parlées vers des codes ISO 2 lettres
   const spokenLanguageCodes = mapSpokenLanguagesToISO(provider.languages);
   // Ex: ["French", "Arabic", "Italian", "Thai"] → ["fr", "ar", "it", "th"]

   // Option A : générer UNIQUEMENT pour les 9 langues du site
   // Les langues extra du prestataire (italien, thaï, etc.) ne sont PAS générées
   // car le site n'a pas de templates d'interface dans ces langues
   const allTargetLanguages = SITE_LANGUAGES;
   // = ["fr", "en", "es", "de", "pt", "ru", "zh", "ar", "hi"]

   // Les langues parlées sont mentionnées dans les meta descriptions et FAQ
   // Ex: "Speaks French, Arabic, Italian and Thai" dans chaque langue cible
   ```
6. Pour chaque langue dans `allTargetLanguages` :
   a. Construit le prompt utilisateur avec les données du prestataire
   b. Appelle l'API Claude (Haiku pour le coût, Sonnet pour la qualité)
   c. Parse la réponse JSON
   d. Valide les contraintes (longueur meta title ≤ 60, meta description ≤ 155)
   e. Si langue hors-site → ajouter flag `isExtraLanguage: true`
   f. Stocke dans `sos_profiles/{uid}/seo_optimized/{locale}`
7. Invalide le cache SSR pour les URLs de ce prestataire
8. Soumet les URLs via IndexNow

### Phase 2 — Triggers automatiques

| Trigger | Collection | Action |
|---------|-----------|--------|
| `onProviderCreated` | `sos_profiles` | Appeler `generateProviderSEO(uid)` |
| `onProviderUpdated` | `sos_profiles` | Comparer le hash des données, régénérer si changement significatif |
| `onReviewCreated` | `reviews` | Régénérer si c'est le 1er, 5e, 10e, 25e avis (paliers) |

### Phase 3 — Script de migration (one-shot)

Script Node.js qui :
1. Liste tous les `sos_profiles` existants (visibles)
2. Pour chaque profil, vérifie si `seo_optimized` existe déjà
3. Si non, appelle `generateProviderSEO(uid)`
4. Rate limit : 5 profils en parallèle, 1 seconde entre chaque batch
5. Log les résultats et erreurs

### Phase 4 — Intégration frontend

Modifier `ProviderProfile.tsx` pour :
1. Charger `seo_optimized/{locale}` depuis Firestore (avec fallback)
2. Utiliser les données IA dans SEOHead et structured data
3. Afficher les FAQ IA dans la section FAQ du profil

### Phase 5 (optionnelle) — Optimisation mensuelle basée sur GSC

Cloud Function mensuelle qui :
1. Lit les données Google Search Console via API
2. Identifie les profils avec beaucoup d'impressions mais peu de clics (CTR < 3%)
3. Régénère les meta titles/descriptions de ces profils spécifiquement
4. Compare avant/après sur le mois suivant

---

## CONFIGURATION API CLAUDE

```typescript
// Modèle recommandé pour la génération de masse
const MODEL = "claude-sonnet-4-6"; // Meilleure qualité ($3/1M input, $15/1M output)

// Configuration de l'appel
const response = await anthropic.messages.create({
  model: MODEL,
  max_tokens: 2000,
  temperature: 0.7,  // Un peu de créativité pour varier les textes
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: userPrompt }],
});
```

## Estimation des coûts

| Scénario | Profils | Langues | Tokens/profil | Coût Haiku | Coût Sonnet |
|----------|---------|---------|---------------|------------|-------------|
| Migration existants | 200 | ×9 = 1800 | ~3000 | **~$2** | ~$20 |
| Nouveau profil | 1 | ×9 = 9 | ~3000 | **$0.01** | $0.10 |
| Mensuel (50 profils) | 50 | ×9 = 450 | ~3000 | **~$0.50** | ~$5 |

---

## PROTECTIONS ANTI-DÉGRADATION

### 1. Détection automatique de la langue source

La description du prestataire peut être dans N'IMPORTE QUELLE LANGUE du monde (pas uniquement les 9 langues du site). Un avocat turc écrit en turc, un japonais en japonais, un brésilien en portugais brésilien.

```typescript
// Ajouter au prompt Claude :
// "Détecte automatiquement la langue de la description originale avant de la corriger.
//  Corrige dans la MÊME LANGUE que l'original. Ne traduis PAS — corrige uniquement."

// Le champ retourné :
{
  "detectedLanguage": "tr",  // Langue détectée de la description originale
  "originalDescriptionCorrected": "...",  // Corrigé dans la même langue
}
```

### 2. Validation stricte côté code (PAS dans le prompt)

Ne JAMAIS faire confiance au prompt pour respecter les contraintes. Valider en code :

```typescript
function validateSEOOutput(output: SEOOptimized): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Meta title : max 60 chars, non vide
  if (!output.metaTitle || output.metaTitle.length === 0) errors.push('metaTitle vide');
  if (output.metaTitle && output.metaTitle.length > 65) {
    // Tolérance 65 (pas 60) — tronquer proprement au dernier mot si > 60
    output.metaTitle = output.metaTitle.substring(0, 60).replace(/\s+\S*$/, '...');
  }

  // Meta description : max 155 chars, non vide
  if (!output.metaDescription || output.metaDescription.length === 0) errors.push('metaDescription vide');
  if (output.metaDescription && output.metaDescription.length > 160) {
    output.metaDescription = output.metaDescription.substring(0, 155).replace(/\s+\S*$/, '...');
  }

  // FAQ : 3-8 items, chaque question et réponse non vides
  if (!output.faqs || output.faqs.length < 3) errors.push('Moins de 3 FAQ');
  if (output.faqs && output.faqs.length > 8) output.faqs = output.faqs.slice(0, 8);
  output.faqs?.forEach((faq, i) => {
    if (!faq.question || !faq.answer) errors.push(`FAQ #${i} vide`);
  });

  // Quality score : 0-100
  if (output.qualityScore < 0 || output.qualityScore > 100) {
    output.qualityScore = Math.max(0, Math.min(100, output.qualityScore));
  }

  // Vérifier qu'aucun code brut SCREAMING_SNAKE_CASE ne s'est glissé dans les textes générés
  const allTexts = [output.metaTitle, output.metaDescription, output.profileDescription];
  allTexts.forEach(text => {
    if (text && /\b[A-Z]{2,}(?:_[A-Z0-9]+){1,}\b/.test(text)) {
      errors.push(`Code brut détecté dans le texte: ${text.match(/\b[A-Z]{2,}(?:_[A-Z0-9]+){1,}\b/)?.[0]}`);
    }
  });

  // Vérifier qu'aucun code pays ISO brut (2 lettres seules) n'apparaît
  allTexts.forEach(text => {
    if (text && /\b(en|in|à|au) [A-Z]{2}\b/.test(text)) {
      errors.push(`Code pays ISO détecté dans le texte`);
    }
  });

  return { valid: errors.length === 0, errors };
}
```

### 3. Descriptions multilingues existantes

Certains profils ont déjà des descriptions en plusieurs langues :
```typescript
description: {
  fr: "Avocat spécialisé en droit de l'immigration...",
  en: "Lawyer specialized in immigration law...",
  ar: "محامي متخصص في قانون الهجرة..."
}
```

Le système doit :
1. Détecter si `description` est un `string` (1 langue) ou un `Record<string, string>` (multilingue)
2. Si multilingue : corriger CHAQUE version linguistique séparément dans sa propre langue
3. Stocker les corrections par langue dans `seo_optimized/{locale}.originalDescriptionCorrected`
4. Ne PAS écraser une description EN existante avec la version FR corrigée

### 4. Système de rollback

```typescript
// Avant chaque génération, sauvegarder la version précédente
// Collection : sos_profiles/{uid}/seo_history/{timestamp}
{
  previousVersion: { ...ancienneDonnéesSEO },
  newVersion: { ...nouvellesDonnéesSEO },
  generatedAt: Timestamp,
  reason: "profile_created" | "profile_updated" | "review_milestone" | "monthly_optimization" | "manual",
}

// Fonction de rollback admin :
async function rollbackSEO(uid: string, timestamp: string) {
  const history = await getDoc(`seo_history/${timestamp}`);
  await setDoc(`seo_optimized/${locale}`, history.previousVersion);
}
```

### 5. Pays rares et cas extrêmes

L'IA doit gérer correctement :
- **Pays rares** (Bhoutan, Érythrée, Timor-Leste, Kiribati) → FAQ génériques mais pertinentes sur l'expatriation dans ce pays
- **Micro-États** (Monaco, Andorre, Liechtenstein, Vatican) → adapter le vocabulaire (pas "expatriation" mais "installation")
- **Territoires d'outre-mer** (Guadeloupe, Réunion, Nouvelle-Calédonie) → attention : ce sont des territoires français, adapter en conséquence
- **Zones de conflit** (Ukraine, Palestine, Syrie) → ne PAS générer de FAQ type "Comment obtenir un visa touristique en Syrie" — adapter au contexte réel
- **Pays sous sanctions** (Corée du Nord, Iran) → FAQ adaptées à la réalité juridique complexe

Ajouter au prompt système :
```
ATTENTION PAYS SPÉCIAUX :
- Territoires d'outre-mer français (GP, MQ, RE, NC, PF, etc.) : ce sont des territoires français, adapter le contexte juridique en conséquence
- Zones de conflit actives : ne pas suggérer de tourisme/vacances, se concentrer sur l'assistance d'urgence et le rapatriement
- Pays sous sanctions internationales : mentionner les complexités juridiques spécifiques
- Micro-États : adapter le vocabulaire (installation plutôt qu'expatriation pour Monaco, Andorre, etc.)
```

### 6. Rate limiting et protection contre les coûts

```typescript
// Limites de sécurité
const DAILY_GENERATION_LIMIT = 100;       // Max 100 profils/jour (évite explosion de coûts)
const MONTHLY_BUDGET_LIMIT_USD = 50;      // Alerte si dépassement $50/mois
const MIN_REGENERATION_INTERVAL_HOURS = 24; // Pas de régénération plus d'1× par 24h par profil

// Compteur quotidien dans Firestore
// Collection : admin_config/seo_generation_stats
{
  dailyCount: number,
  monthlySpend: number,
  lastResetDate: string,
}
```

### 7. Ne JAMAIS dégrader le profil d'un prestataire

Règles de sécurité absolues :

1. **Ne JAMAIS écrire dans `sos_profiles/{uid}` directement** — uniquement dans la sous-collection `seo_optimized/`
2. **Ne JAMAIS modifier** `description`, `bio`, `specialties`, `helpTypes` ou tout autre champ du profil original
3. **Si la génération échoue** (timeout, erreur API, JSON invalide) → ne rien écrire, garder l'existant, logger l'erreur
4. **Si le score qualité est 0** (description complètement vide/absente) → générer `profileDescription` mais ne PAS créer de `originalDescriptionCorrected`
5. **Chaque écriture dans `seo_optimized`** doit être atomique (batch write) — jamais de sous-collection à moitié remplie
6. **Le frontend utilise TOUJOURS un fallback** : si `seo_optimized` n'existe pas ou est corrompu, le profil s'affiche normalement comme avant

### 8. Tests avant déploiement

Avant de lancer sur tous les profils :
1. **Tester sur 5 profils AAA** (différents pays, langues, types)
2. **Vérifier manuellement** les 9 langues pour chaque profil test
3. **Comparer** le rendu avant/après dans Google Rich Results Test
4. **Vérifier** qu'aucune page ne crashe si `seo_optimized` est absent
5. **Tester** le rollback sur un profil test
6. **Simuler** une erreur API Claude pour vérifier le fallback

---

## ÉLÉMENTS SEO/AEO MANQUANTS AJOUTÉS

### 17. Données structurées HowTo (schema.org)
Pour chaque fiche prestataire, l'IA génère aussi un schema `HowTo` traduit :
```json
"howTo": {
  "name": "Comment consulter [nom] sur SOS Expat",
  "steps": [
    "Visitez le profil de [nom] sur SOS Expat",
    "Cliquez sur 'Être appelé maintenant'",
    "Payez en ligne (49€/20min)",
    "[nom] vous rappelle en moins de 5 minutes"
  ]
}
```
→ Augmente les chances d'apparaître en **featured snippet** "Comment faire"

### 18. Schema Review (si avis existants)
Si le prestataire a des avis (`reviewCount > 0`), l'IA génère des descriptions d'avis optimisées :
```json
"reviewSummary": "Résumé des avis en 1-2 phrases pour le structured data. Ex: 'Ses clients apprécient sa réactivité et son expertise en immigration au Japon. Note 4.9/5 sur 127 avis.'"
```

### 19. Image Alt Text optimisé
```json
"imageAltText": "Photo de [nom], avocat spécialisé en immigration à Tokyo, Japon | SOS Expat"
```
→ Optimise le référencement Google Images (souvent négligé mais source de trafic)

### 20. Canonical URL optimisée
```json
"canonicalSlug": "avocat-immigration-tokyo-jean-dupont"
```
→ Slug SEO-friendly au lieu de l'ID technique. Déjà géré par le système de slugs existant mais l'IA peut suggérer des améliorations.

### 21. Internal linking suggestions
```json
"relatedPages": [
  {"label": "Tous nos avocats au Japon", "path": "/fr-fr/avocat/jp"},
  {"label": "Guide expatriation Japon", "path": "/fr-fr/centre-aide/guide-japon"},
  {"label": "Tarifs consultation", "path": "/fr-fr/tarifs"}
]
```
→ Améliore le **maillage interne** (crucial pour le SEO) — liens contextuels vers d'autres pages du site

### 22. Schema SameAs (profils externes)
Si le prestataire a des liens vers ses profils externes (LinkedIn, site web, etc.), les inclure dans le structured data :
```json
"sameAs": ["https://linkedin.com/in/jean-dupont", "https://jean-dupont-avocat.com"]
```

### 23. Geo-targeting signals
```json
"geoTargeting": {
  "addressCountry": "JP",
  "addressLocality": "Tokyo",
  "latitude": 35.6762,
  "longitude": 139.6503
}
```
→ Améliore le positionnement dans les recherches **locales** ("avocat près de moi à Tokyo")

### 24. Speakable (pour les assistants vocaux)
```json
"speakable": {
  "summary": "Jean Dupont est avocat français à Tokyo, spécialisé en immigration. Consultation à 49 euros sur SOS Expat."
}
```
→ Optimise pour **Google Assistant**, **Siri**, **Alexa** (recherche vocale en croissance)

### 25. Multilingual content signals
```json
"availableLanguages": ["fr", "en", "ja"],
"primaryLanguage": "fr",
"translationCompleteness": {
  "fr": 100, "en": 100, "es": 100, "de": 100, "pt": 100,
  "ru": 100, "zh": 100, "ar": 100, "hi": 100
}
```
→ Signal interne pour savoir si toutes les traductions sont complètes

### 26. Competitor keywords (longue traîne)
```json
"longTailKeywords": [
  "avocat français Tokyo pas cher",
  "consultation juridique japon en ligne",
  "aide visa travail japon francophone",
  "problème immigration japon urgence",
  "avocat francophone asie"
]
```
→ 5-10 mots-clés de **longue traîne** (recherches très spécifiques = moins de concurrence = plus facile à ranker)

### 27. Content freshness signal
```json
"lastContentUpdate": "2026-03-23",
"nextReviewDate": "2026-04-23"
```
→ Google favorise le contenu **frais**. Le système régénère automatiquement quand `nextReviewDate` est dépassé.

### 28. Featured Snippet / Position 0 optimization
L'IA génère du contenu **structuré spécifiquement pour la position 0** de Google :
```json
"featuredSnippet": {
  "paragraph": "Réponse directe en 40-60 mots à la question principale. Ex: 'Jean Dupont est un avocat français basé à Tokyo, spécialisé en immigration et droit des affaires au Japon. Avec 8 ans d'expérience, il accompagne expatriés, digital nomades et voyageurs d'affaires. Consultation téléphonique 49€/20min, disponible 24/7 sur SOS Expat.'",
  "list": [
    "Immigration et visas de travail au Japon",
    "Création d'entreprise au Japon",
    "Droit des affaires international",
    "Résolution de litiges commerciaux",
    "Fiscalité des expatriés au Japon"
  ],
  "table": {
    "headers": ["Service", "Prix", "Durée"],
    "rows": [
      ["Consultation juridique", "49€", "20 minutes"],
      ["Suivi de dossier", "Sur devis", "Variable"]
    ]
  },
  "definition": "Un avocat expatrié est un professionnel du droit installé à l'étranger qui accompagne les personnes en mobilité internationale (expatriés, voyageurs, étudiants) dans leurs démarches juridiques."
}
```
→ Google extrait ces formats pour la **position 0** :
- `paragraph` → featured snippet type "paragraphe" (le plus courant)
- `list` → featured snippet type "liste" (pour "quelles sont les spécialités de...")
- `table` → featured snippet type "tableau" (pour les comparaisons de prix)
- `definition` → featured snippet type "définition" (pour "qu'est-ce qu'un avocat expatrié")

### 29. People Also Ask (PAA) optimization
L'IA génère 4-6 questions dans le format exact de "Autres questions posées" de Google :
```json
"peopleAlsoAsk": [
  {
    "question": "Combien coûte un avocat pour expatrié au Japon ?",
    "answer": "Sur SOS Expat, une consultation avec un avocat au Japon coûte 49€ pour 20 minutes par téléphone. C'est accessible 24/7, sans rendez-vous."
  },
  {
    "question": "Comment trouver un avocat français au Japon ?",
    "answer": "SOS Expat propose des avocats francophones au Japon, consultables en ligne en moins de 5 minutes. Vous pouvez filtrer par spécialité et lire les avis avant de réserver."
  },
  {
    "question": "Ai-je besoin d'un avocat pour un visa de travail au Japon ?",
    "answer": "Bien que non obligatoire, un avocat spécialisé en immigration facilite considérablement les démarches de visa au Japon. Il connaît les exigences spécifiques et peut éviter les erreurs coûteuses."
  }
]
```
→ Structurées pour que Google les reprenne dans la section **"Autres questions posées"** (PAA)
→ **Différentes des FAQ** : les PAA ciblent des questions plus larges autour du sujet, pas spécifiques au prestataire

### 30. Knowledge Panel signals
Pour aider Google à construire un **Knowledge Panel** autour de SOS Expat et ses prestataires :
```json
"knowledgePanel": {
  "entityType": "LegalService",
  "entityName": "Jean Dupont — Avocat au Japon",
  "shortBio": "Avocat français spécialisé en immigration, basé à Tokyo depuis 2018. Membre de SOS Expat & Travelers.",
  "keyAttributes": {
    "basedIn": "Tokyo, Japon",
    "yearsActive": "8 ans",
    "specialization": "Immigration, Droit des affaires",
    "languages": "Français, Anglais, Japonais",
    "platform": "SOS Expat & Travelers"
  }
}
```

### 31. Google Discover optimization
Pour apparaître dans **Google Discover** (flux d'actualités mobile) :
```json
"discoverContent": {
  "headline": "Titre accrocheur type presse (max 110 chars). Ex: 'Un avocat français à Tokyo aide les expatriés en urgence — consultation en 5 minutes'",
  "hook": "Phrase d'accroche émotionnelle (1 phrase). Ex: 'Quand un expatrié français à Tokyo a un problème juridique urgent à 3h du matin, Jean Dupont est là.'"
}
```
→ Google Discover privilégie le contenu avec un **angle humain** et une **accroche émotionnelle**

### 32. Video-ready content (pour les futures vidéos)
```json
"videoScript": {
  "title": "Rencontrez Jean Dupont — Votre avocat français à Tokyo",
  "description": "Découvrez comment Jean Dupont accompagne les expatriés au Japon en matière d'immigration et droit des affaires.",
  "duration": "60 secondes",
  "chapters": [
    {"time": "0:00", "title": "Qui est Jean Dupont ?"},
    {"time": "0:15", "title": "Ses spécialités au Japon"},
    {"time": "0:35", "title": "Comment le consulter"},
    {"time": "0:50", "title": "Avis de ses clients"}
  ]
}
```
→ Pré-génère le contenu pour de futures **vidéos de profil** (YouTube SEO, Google Video)
→ Les chapters sont dans le format **Key Moments** de Google

### 33. E-E-A-T signals (Experience, Expertise, Authoritativeness, Trustworthiness)
Signaux critiques pour le ranking Google depuis 2023 :
```json
"eeat": {
  "experience": "8 ans d'exercice au Japon, X dossiers traités, X appels réalisés sur SOS Expat",
  "expertise": "Spécialiste immigration et droit des affaires au Japon. Maîtrise du droit japonais et international.",
  "authoritativeness": "Membre de SOS Expat & Travelers, plateforme d'assistance juridique couvrant 197 pays.",
  "trustworthiness": "Profil vérifié, X avis clients (note Y/5), paiement sécurisé, consultation 100% confidentielle."
}
```
→ Google utilise ces signaux pour classer les pages dans les domaines YMYL (Your Money Your Life = juridique, santé, finance)
→ Les services juridiques sont YMYL = Google est **encore plus strict** sur la confiance

### 34. Schema ItemList (pour les pages de listing par pays)
Pour les pages `/avocats-en/thailande`, l'IA génère un schema `ItemList` optimisé :
```json
"itemListSchema": {
  "name": "Avocats en Thaïlande | SOS Expat",
  "description": "Liste des avocats vérifiés disponibles en Thaïlande sur SOS Expat.",
  "numberOfItems": 12,
  "itemListOrder": "https://schema.org/ItemListOrderDescending"
}
```
→ Aide Google à comprendre que c'est une **page de listing** (pas une page de contenu unique)

### 35. Bing-specific optimization
Bing représente ~10% du trafic mondial et croît avec Copilot :
```json
"bingOptimization": {
  "indexNowKey": "clé IndexNow pour soumission prioritaire à Bing",
  "bingPlaces": true,
  "microsoftClarity": true
}
```
→ Le système soumet via **IndexNow** (priorité Bing) en plus de Google Indexing API

### 36. Yandex optimization (pour le trafic russe)
```json
"yandexOptimization": {
  "turboPages": false,
  "yandexVerification": "meta tag de vérification Yandex Webmaster"
}
```
→ Important pour les prestataires dans les pays russophones (Russie, Kazakhstan, etc.)

### 37. Baidu optimization (pour le trafic chinois)
```json
"baiduOptimization": {
  "baiduSitemap": true,
  "simplifiedChinese": true
}
```
→ Important pour les prestataires en Chine et les expatriés chinois

### 38. Core Web Vitals integration
Le système vérifie que les données générées ne dégradent pas les performances :
```
- profileDescription < 500 chars (pas de long text qui décale le layout = bon CLS)
- Pas d'images lourdes dans les données générées
- JSON-LD < 5KB par page (pas de schema trop volumineux qui ralentit le TTFB)
- FAQ limitées à 6 max (pas de page trop longue qui dégrade le LCP)
```
→ Les **Core Web Vitals** (LCP, FID, CLS) sont un facteur de ranking Google

### 39. Passage Ranking optimization
Google peut indexer des **passages spécifiques** d'une page (pas juste la page entière) :
```json
"keyPassages": [
  "Jean Dupont est avocat français à Tokyo depuis 2018, spécialisé en immigration et droit des affaires au Japon.",
  "Une consultation de 20 minutes avec un avocat au Japon coûte 49€ sur SOS Expat, disponible 24/7 sans rendez-vous.",
  "Les expatriés apprécient particulièrement son expertise en visa de travail et création d'entreprise au Japon, avec une note de 4.9/5."
]
```
→ 3 passages clés optimisés pour être **indexés individuellement** par Google
→ Chaque passage répond à une question implicite différente

### 40. Multi-intent optimization
Chaque fiche doit répondre à **plusieurs intentions de recherche** :
```json
"searchIntents": {
  "informational": "Qui est Jean Dupont ? Quelles sont ses spécialités ?",
  "navigational": "SOS Expat avocat Japon → direct vers cette fiche",
  "transactional": "Réserver consultation avocat Japon → CTA 'Être appelé maintenant'",
  "commercial": "Meilleur avocat français Japon / Comparaison prix avocat Japon → avis + prix"
}
```
→ Google classe les pages différemment selon l'**intention de recherche** de l'utilisateur
→ La fiche doit satisfaire les 4 types d'intention

### 41. Sitelinks optimization
Pour que Google affiche des **sitelinks** sous le résultat principal :
```json
"sitelinksTargets": [
  {"label": "Prendre rendez-vous", "anchor": "#call-to-action"},
  {"label": "Spécialités", "anchor": "#specialties"},
  {"label": "Avis clients", "anchor": "#reviews"},
  {"label": "FAQ", "anchor": "#faq"}
]
```
→ Le système ajoute des ancres `id` dans le HTML correspondant à ces sections
→ Google peut les afficher comme **sitelinks** dans les résultats

### 42. Extraits de produits (Product Snippets) — étoiles dans Google
Pour déclencher les **étoiles ⭐⭐⭐⭐⭐** et le **prix** dans les résultats Google :
```json
"productSnippet": {
  "offerName": "Consultation juridique avec Jean Dupont",
  "offerDescription": "Consultation téléphonique de 20 minutes avec un avocat français au Japon spécialisé en immigration.",
  "price": "49.00",
  "priceCurrency": "EUR",
  "availability": "https://schema.org/InStock",
  "priceValidUntil": "2027-12-31",
  "seller": "SOS Expat & Travelers",
  "ratingValue": 4.9,
  "reviewCount": 127,
  "bestRating": 5,
  "worstRating": 1
}
```
→ Google affiche : ⭐⭐⭐⭐⭐ 4.9 (127 avis) · 49 € · En stock
→ **Augmente le CTR de 20-30%** par rapport aux résultats sans étoiles
→ Ne générer que si `reviewCount > 0` (Google rejette les étoiles sans avis)

### 43. Extraits d'avis (Review Snippets)
Pour afficher des **extraits d'avis** dans Google :
```json
"reviewSnippets": [
  {
    "author": "Prénom du client",
    "rating": 5,
    "body": "Résumé court de l'avis (1-2 phrases). Ex: 'Jean m'a aidé à obtenir mon visa de travail au Japon en un temps record. Très professionnel et réactif.'",
    "datePublished": "2026-03-15"
  }
]
```
→ Google peut afficher ces avis directement dans les résultats
→ Ne générer que si des vrais avis existent (NE JAMAIS inventer d'avis)

### 44. Fil d'Ariane enrichi (Breadcrumb rich result)
```json
"breadcrumbPath": [
  {"name": "SOS Expat", "url": "https://sos-expat.com"},
  {"name": "Avocats", "url": "https://sos-expat.com/fr-fr/prestataires"},
  {"name": "Japon", "url": "https://sos-expat.com/fr-fr/avocats-en/japon"},
  {"name": "Jean D. — Immigration Tokyo", "url": null}
]
```
→ Google affiche : `SOS Expat > Avocats > Japon > Jean D. — Immigration Tokyo`
→ **Traduit dans chaque langue** (Ex EN: `SOS Expat > Lawyers > Japan > Jean D.`)
→ Le dernier élément utilise `breadcrumbLabel` (SEO-friendly, pas juste le nom)

### 45. Site Name & Logo (pour le Knowledge Graph)
```json
"siteIdentity": {
  "siteName": "SOS Expat & Travelers",
  "alternateName": ["SOS Expat", "SOS-Expat"],
  "logo": "https://sos-expat.com/sos-logo.webp",
  "url": "https://sos-expat.com"
}
```
→ Aide Google à construire le **Knowledge Graph** de la marque

### 46. Merchant Listing (pour Google Shopping / Merchant Center)
```json
"merchantListing": {
  "type": "Service",
  "name": "Consultation avec Jean Dupont — Avocat au Japon",
  "description": "Consultation juridique téléphonique de 20 min avec un avocat français au Japon.",
  "price": 49,
  "currency": "EUR",
  "availability": "in_stock",
  "category": "Legal Services > Immigration Law",
  "brand": "SOS Expat"
}
```
→ Rend la consultation visible dans **Google Shopping** et les résultats commerciaux

---

## CRITÈRES DE VALIDATION

Avant de considérer le système comme prêt :

**SEO classique :**
- [ ] Meta titles ≤ 60 caractères pour les 9 langues
- [ ] Meta descriptions ≤ 155 caractères pour les 9 langues
- [ ] OG titles ≤ 70 caractères pour les 9 langues
- [ ] OG descriptions ≤ 200 caractères pour les 9 langues
- [ ] Twitter titles ≤ 70 caractères pour les 9 langues
- [ ] Keywords en 10-15 termes par langue
- [ ] Semantic keywords en 15-20 termes par langue
- [ ] Long tail keywords en 5-10 termes par langue
- [ ] Breadcrumb label SEO-friendly (pas juste le nom)

**Contenu :**
- [ ] profileDescription 250-400 chars pour les 9 langues
- [ ] profileDescriptionLong 600-800 chars pour les 9 langues
- [ ] Contenu UNIQUE entre prestataires du même pays (pas de copié-collé)
- [ ] Aucun code brut (SCREAMING_SNAKE_CASE) dans les textes
- [ ] Aucun code pays ISO (TN, TH) dans les textes

**Structured data :**
- [ ] FAQ en 5-6 questions/réponses pertinentes par langue
- [ ] HowTo schema en 4 étapes par langue
- [ ] serviceDescription traduite par langue
- [ ] knowsAbout en 5-8 sujets par langue
- [ ] imageAltText traduit par langue
- [ ] reviewSummary si avis > 0
- [ ] geoTargeting avec coordonnées GPS du pays/ville

**AEO :**
- [ ] aiSummary structuré comme réponse directe (150-250 chars)
- [ ] aiKeyFacts en 5-7 faits structurés
- [ ] speakable summary pour assistants vocaux
- [ ] expertise et trustworthiness remplis

**Réseaux sociaux :**
- [ ] ogTitle accrocheur et conversationnel
- [ ] ogDescription avec bénéfice clair
- [ ] twitterTitle adapté au ton Twitter
- [ ] twitterDescription engageante

**Position 0 / Featured Snippets :**
- [ ] Paragraphe de réponse directe (40-60 mots)
- [ ] Liste de spécialités structurée (pour snippet liste)
- [ ] Tableau prix/durée (pour snippet tableau)
- [ ] Définition du métier (pour snippet définition)
- [ ] 4-6 questions People Also Ask avec réponses
- [ ] 3 passages clés optimisés pour Passage Ranking
- [ ] 4 types d'intention de recherche couverts (info, nav, transaction, commercial)

**Extraits enrichis Google :**
- [ ] Extraits de produits (étoiles + prix) si avis > 0
- [ ] Extraits d'avis (vrais avis, jamais inventés)
- [ ] Fil d'ariane enrichi traduit × 9 langues
- [ ] Sitelinks anchors (4 sections avec id)
- [ ] HowTo schema (4 étapes)

**E-E-A-T & confiance :**
- [ ] Experience, Expertise, Authoritativeness, Trustworthiness documentés
- [ ] Knowledge Panel signals remplis
- [ ] Signaux E-E-A-T adaptés au domaine YMYL (juridique)

**Moteurs de recherche :**
- [ ] Google : structured data + IndexNow + Indexing API
- [ ] Bing : IndexNow + Bing Places
- [ ] Yandex : soumission sitemap
- [ ] Baidu : sitemap chinois simplifié

**Performance :**
- [ ] JSON-LD < 5KB par page
- [ ] FAQ limitées à 6 max
- [ ] profileDescription < 500 chars (CLS)
- [ ] Core Web Vitals non dégradés

**Système :**
- [ ] Fallback fonctionnel si `seo_optimized` absent/corrompu
- [ ] Cache SSR invalidé après génération
- [ ] URLs soumises via IndexNow après génération
- [ ] Les profils AAA sont traités comme les vrais
- [ ] Le système ne régénère pas si données inchangées (hash)
- [ ] Rollback fonctionnel
- [ ] Rate limiting respecté
- [ ] Temps de génération < 45 secondes par profil × 9 langues

---

## FICHIERS EXISTANTS À CONNAÎTRE

| Fichier | Rôle |
|---------|------|
| `sos/firebase/functions/src/triggers/onProviderCreated.ts` | Trigger création profil |
| `sos/firebase/functions/src/services/providerTranslationService.ts` | Traduction IA existante |
| `sos/firebase/functions/src/seo/autoIndexingTriggers.ts` | Soumission IndexNow/Google |
| `sos/firebase/functions/src/seo/dynamicRender.ts` | Cache SSR + invalidation |
| `sos/src/pages/ProviderProfile.tsx` | Page profil frontend |
| `sos/src/components/layout/SEOHead.tsx` | Meta tags SEO |
| `sos/src/components/seo/FAQPageSchema.tsx` | Schema FAQ |
| `sos/src/hooks/useSnippetGenerator.ts` | Génération FAQ actuelle |
| `sos/src/utils/snippetGenerator.ts` | Templates FAQ (hardcodés en 9 langues) |
| `sos/src/utils/specialtyMapper.ts` | Traduction codes spécialités |
| `sos/src/data/lawyer-specialties.ts` | Labels spécialités avocats (9 langues) |
| `sos/src/data/expat-help-types.ts` | Labels types aide expats (9 langues) |

---

*Commence par la Phase 1 (Cloud Function de génération). Utilise le SDK Anthropic (`@anthropic-ai/sdk`). Stocke la clé API comme Firebase Secret (`ANTHROPIC_API_KEY`). Déploie sur la région `europe-west1` pour la latence optimale avec Firestore.*
