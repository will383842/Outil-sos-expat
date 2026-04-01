# PROMPT — Refonte UI/UX Pages Prestataires SOS Expat
## World-Class Frontend Developer • Mobile-First • SEO/AEO Excellence • Conversion-First

---

## CONTEXTE & MISSION

Tu es l'un des meilleurs développeurs frontend au monde, spécialisé dans les pages de conversion haute performance pour des plateformes juridiques et d'accompagnement expatrié (type Avvo, Rocket Lawyer, LegalZoom, Expatica, InterNations, Airbnb Experiences). Tu maîtrises à la perfection le design système mobile-first, la psychologie de conversion, le SEO technique, et l'AEO (Answer Engine Optimization pour ChatGPT, Perplexity, Google SGE, Gemini).

Ta mission : **refondre intégralement l'UI/UX du fichier `sos/src/pages/ProviderProfile.tsx`** pour en faire une page d'exception — à la fois landing page de conversion, vitrine professionnelle pour le prestataire, et machine à ranking Google/IA. La page doit donner envie aux prestataires d'avoir leur profil, et donner confiance immédiate aux expatriés/clients pour appeler.

---

## CONTRAINTES ABSOLUES (NE PAS VIOLER)

### RÈGLE N°0 — FRONTEND UNIQUEMENT
**Cette mission est une refonte visuelle (UI/UX) exclusivement.**
Tu touches UNIQUEMENT le JSX et les classes CSS/Tailwind dans `ProviderProfile.tsx`.
Tu ne touches PAS à la logique métier, aux handlers, aux conditions, aux hooks, aux queries.
Si une ligne de code ne concerne pas l'affichage, **tu ne la touches pas.**

### RÈGLE N°1 — Le système de statut prestataire est SACRÉ
Le cœur du produit repose sur 3 états : **en ligne / hors ligne / busy (en communication)**.
Ces états sont gérés par un listener Firestore temps réel déjà en place.
**Tu ne modifies RIEN à cette logique.** Concrètement :
- Tu ne changes pas les conditions `if (availability === ...)` existantes
- Tu ne changes pas ce qui se passe au clic sur le bouton "Appeler" (handlers existants intacts)
- Tu ne changes pas quand le bouton est `disabled` ou non (la logique existante décide)
- Tu ne changes pas les checks `busyReason` — chaque valeur (`in_call`, `break`, `offline`, `manually_disabled`) a un comportement distinct et intentionnel
- Tu ne "simplifies" pas les conditions de statut, même si elles te semblent redondantes
**Tu changes uniquement l'apparence visuelle** de chaque état (couleurs, badges, animations).

### RÈGLE N°2 — Zéro nouvelle fonctionnalité ou dépendance
Utilise UNIQUEMENT ce qui existe déjà dans le codebase. Ne pas inventer de features, d'API, de hooks ou de composants inexistants.

### RÈGLE N°3 — Zéro modification des slugs/URLs
Les pages sont déjà indexées par Google. Le format `/{lang}-{country}/{role-pays}/{prenom-specialite-shortid}` est intouchable. Aucun changement dans `slugGenerator.ts` ou `App.tsx` routing.

### RÈGLE N°4 — Zéro modification backend
Firebase Functions, Firestore queries, données : tout reste en l'état.

### RÈGLE N°5 — Zéro modification des composants SEO
`ProviderSchemaUtils.ts`, `ReviewSchema.tsx`, `SEOHead.tsx` restent fonctionnels et inchangés.

### RÈGLE N°6 — Zéro régression fonctionnelle
Toutes les features existantes doivent continuer à fonctionner parfaitement après la refonte.

---

## STACK TECHNIQUE EXISTANTE (à respecter)

```
- React 18 + TypeScript
- React Router DOM (routing existant)
- react-intl (i18n — 9 langues, 100+ locales)
- react-helmet-async (meta tags via SEOHead)
- Firebase Firestore (temps réel via onSnapshot)
- Tailwind CSS (classes utilitaires)
- lucide-react (icônes uniquement)
- react-hot-toast (toasts)
- GA4 trackEvent() + Meta Pixel trackMetaViewContent() (déjà intégrés)
```

---

## DONNÉES DISPONIBLES DANS LE COMPOSANT

### Champs Firestore `sos_profiles/{uid}` (tous disponibles)

```typescript
// Identité
uid: string
type: "lawyer" | "expat"
fullName: string
firstName: string
country: string
city?: string
residenceCountry?: string
operatingCountries?: string[]    // Pays d'intervention
languages: string[]              // Langues parlées
specialties: string[]            // Spécialités (SCREAMING_SNAKE_CASE)
helpTypes?: string[]             // Types d'aide (expats)

// Descriptions (multilingues — objet {fr, en, es, de, pt, ru, zh, ar, hi} ou string)
description?: string | LocalizedText
bio?: string | LocalizedText
professionalDescription?: string | LocalizedText
experienceDescription?: string | LocalizedText
motivation?: string | LocalizedText

// Formation (lawyers)
lawSchool?: string | LocalizedText
graduationYear?: number
education?: Education | Education[] | LocalizedText
certifications?: Certification | Certification[] | LocalizedText

// Médias
profilePhoto?: string
photoURL?: string
avatar?: string

// Stats (déjà calculés dans le composant)
rating: number                   // 0-5
reviewCount: number
yearsOfExperience: number
yearsAsExpat?: number
totalCalls?: number
successfulCalls?: number
successRate?: number             // Calculé: ((successful+1)/(total+1))*100
responseTime?: string

// Statut temps réel (Firestore listener actif)
isOnline?: boolean
availability?: 'available' | 'busy' | 'offline'
busyReason?: 'in_call' | 'break' | 'offline' | 'manually_disabled' | null

// Flags
isVerified: boolean
isFeatured?: boolean
isAAA?: boolean
```

### Collection `reviews` (déjà chargée)
```typescript
rating: number        // 1-5 étoiles
comment?: string
authorName?: string
createdAt: Timestamp
helpfulVotes?: number
serviceType?: string
```

### Prix (hook `usePricingConfig()` — déjà intégré)
```typescript
pricePerMinute: number     // Cents EUR/USD
currency: "EUR" | "USD"
promoActive: boolean
promoPrice?: number
```

### Prestataires suggérés/similaires (déjà chargés)
- 3 prestataires du même pays + même type (online-first, triés par rating)
- Disponibles quand le prestataire est offline ou indisponible

### Prestataires similaires en bas de page (déjà chargés)
- 3 à 5 prestataires même pays + même type
- Toujours affichés (maillage interne)

---

## ARCHITECTURE DU DESIGN — SECTIONS OBLIGATOIRES

### SECTION 1 — HERO (Above the fold, critique pour conversion)

**Mobile (< 768px) — priorité absolue :**
- Photo de profil ronde, grande (96px min), avec badge statut en temps réel (vert pulsant si online, gris si offline)
- Nom + type de prestataire (Avocat / Expert Expatrié) + pays
- Étoiles + note (ex: ★★★★★ 4.8) + nombre d'avis cliquable qui scroll vers les avis
- Badge "Vérifié" si `isVerified: true` — badge "Expert Recommandé" si `isFeatured: true`
- **CTA principal "Appeler" : TOUJOURS VISIBLE quelle que soit la disponibilité** — pleine largeur, très visible, couleur primaire. Le bouton ne disparaît jamais.
- Prix affiché sous le CTA (ex: "À partir de 12€/min")
- Variation du CTA selon le statut (même bouton, état visuel différent) :
  - `available` → bouton plein couleur primaire + label "Appeler Maintenant" + indicateur vert pulsant
  - `busy / in_call` → bouton légèrement désaturé + label "Appeler" + badge amber "En communication en ce moment"
  - `offline` → bouton outline (bordure) + label "Appeler" + badge gris "Actuellement hors ligne"
- **Dans tous les cas** : le clic sur le bouton suit le flow existant (QuickAuthWizard si non connecté → `/booking-request`) — ne jamais bloquer le clic
- Si offline : afficher en plus, **sous** le CTA, les 3 prestataires similaires disponibles avec leur statut temps réel

**Desktop :**
- Layout 2 colonnes : photo + infos à gauche, CTA sticky à droite (card flottante)
- La card CTA reste visible au scroll (position sticky top: 80px)

**Sticky CTA mobile :**
- Barre fixe en bas de l'écran (bottom: 0) avec mini-photo, nom, prix et bouton "Appeler"
- **Toujours présente** — le bouton "Appeler" est visible en permanence au scroll, quelle que soit la disponibilité du prestataire
- Disparaît uniquement quand le CTA principal hero est visible à l'écran (IntersectionObserver)
- Réapparaît dès que le CTA principal sort du viewport
- Même logique d'état visuel que le CTA principal (couleur pleine si online, outline si offline)

---

### SECTION 2 — TRUST SIGNALS (Sous le hero, preuves sociales immédiates)

Bandeau horizontal de stats clés :

| Stat | Condition d'affichage | Exemple |
|------|----------------------|---------|
| Note moyenne | `reviewCount > 0` | ★ 4.8/5 |
| Nombre d'avis | `reviewCount > 0` | 23 avis vérifiés |
| Taux de réussite | `totalCalls > 5` | 97% de succès |
| Années d'expérience | `yearsOfExperience > 0` | 12 ans d'exp. |
| Appels traités | `totalCalls > 10` | 180+ appels |
| Temps de réponse | `responseTime exists` | Répond en < 5 min |

Design : icônes lucide-react + chiffre bold + label small. Horizontal scroll sur mobile.

---

### SECTION 3 — PRÉSENTATION PROFESSIONNELLE

**Structure H2 > paragraphes :**

```
H2: "À propos de [Prénom]"
```

- Affiche `professionalDescription` ou `description` ou `bio` (priorité dans cet ordre)
- Texte localisé via `useProviderTranslation()` (déjà disponible)
- Si le texte > 300 chars sur mobile : "Voir plus" / "Voir moins" (expand inline, pas de modal)
- Mise en valeur des mots-clés (pays, spécialités) en **gras**

**Spécialités :**
```
H3: "Domaines d'expertise"
```
- Tags/chips colorés pour chaque spécialité (traduite via i18n existant)
- Max 6 tags visibles, bouton "+ X autres" si plus

**Pays d'intervention :**
```
H3: "Pays couverts"
```
- Tags avec drapeau emoji + nom du pays
- Basé sur `operatingCountries` ou `practiceCountries` ou `country`
- Maillage interne : chaque pays est un lien vers `/lawyers/{countrySlug}` ou `/expats/{countrySlug}` selon le type (routes existantes)

**Langues :**
```
H3: "Langues de consultation"
```
- Chaque langue affichée avec son drapeau emoji + nom traduit

---

### SECTION 4 — FORMATION & PARCOURS (Lawyers uniquement)

```
H2: "Formation & Parcours"
```
- Timeline verticale simple (CSS pur, pas de lib externe)
- `education` : institution + diplôme + année
- `certifications` : certifications professionnelles
- `lawSchool` + `graduationYear` si disponibles
- `yearsOfExperience` en badge résumé en haut de section
- Si aucune donnée : ne pas afficher la section

---

### SECTION 5 — AVIS CLIENTS (Section Reviews existante, re-stylée)

```
H2: "Avis clients vérifiés"
```

- Utilise le composant `Reviews` déjà existant (lazy-loaded) — **ne pas le réécrire**
- En-tête de section : note globale en grand + distribution étoiles (histogramme existant)
- Attribut `id="reviews"` sur la section pour que le lien depuis le hero fonctionne
- Schéma JSON-LD reviews déjà généré par `ReviewSchema.tsx` — ne pas toucher

---

### SECTION 6 — MAILLAGE INTERNE INTELLIGENT

```
H2: "D'autres experts disponibles"  (ou "Avocats similaires" / "Experts expatriés similaires")
```

**Prestataires similaires (déjà chargés dans le composant) :**
- Cards horizontales scrollables sur mobile
- Affiche : photo, nom, note, disponibilité en temps réel, pays, bouton "Voir le profil"
- Liens vers les pages profils existantes (slugs existants)
- **Important SEO** : liens `<a href>` standards (pas de navigate() React-only) pour que Google les suive

**Liens vers pages listages pays (maillage interne) :**
- Si le prestataire est avocat en Thaïlande : lien "Voir tous les avocats en Thaïlande" → `/fr-fr/avocats/thaïlande` (ou équivalent localisé, route existante)
- Si expat en France : lien "Voir tous les experts expatriés en France"
- Texte d'ancrage optimisé avec le pays traduit dans la langue de la page

---

### SECTION 7 — LIENS EXTERNES (Annuaire & Ressources)

**IMPORTANT — Vérification préalable obligatoire :**
Avant d'implémenter les liens externes, vérifier si l'annuaire est en production en lisant le worker.js et les routes existantes. Si l'annuaire n'est pas encore en prod, **ne pas créer de liens vers des URLs inexistantes**. Insérer uniquement des liens vers des URLs confirmées en production.

Si l'annuaire est en production (ex: `annuaire.sos-expat.com`) :
- Lien contextuel vers la fiche annuaire du prestataire
- `rel="noopener"` mais PAS `rel="nofollow"` (c'est un site interne/partenaire)

Liens externes utiles selon le type de prestataire (toujours `rel="noopener noreferrer"` + `target="_blank"`) :
- Pour les avocats : lien vers le barreau national du pays d'exercice (si URL connue et stable)
- Pour les expats : lien vers les associations d'expatriés du pays (si URL connue et stable)
- **Ne jamais créer de liens vers des URLs inventées ou non vérifiées**

---

## SEO / AEO — SPÉCIFICATIONS TECHNIQUES COMPLÈTES

### 1. Structure H1/H2/H3/H4 (une seule H1 par page)

```
H1: "[Prénom] — [Avocat / Expert Expatrié] à [Pays] | SOS Expat"
   → Visible (pas caché), première chose dans le DOM après la nav
   → Inclure obligatoirement: prénom, rôle traduit, pays

H2: "À propos de [Prénom]"
H2: "Formation & Parcours"   (lawyers seulement)
H2: "Avis clients vérifiés"
H2: "D'autres experts disponibles"

H3: "Domaines d'expertise"
H3: "Pays couverts"
H3: "Langues de consultation"
H3: (Nom de chaque prestataire suggéré dans les cards)

H4: Titres de chaque avis client (si l'avis a un titre)
```

### 2. Meta Title & Meta Description (via SEOHead existant)

Le composant `SEOHead` gère déjà cela. Vérifier que les valeurs passées respectent :

```
Meta Title (50-60 chars):
"[Prénom] [NomFamille] — Avocat [Pays] | SOS Expat"
"[Prénom] — Expert Expatrié [Pays] | SOS Expat"

Meta Description (150-160 chars):
Doit contenir: rôle, pays, spécialité principale, langues, note si dispo.
Ex: "Consultez [Prénom], avocat spécialisé en droit des visas en Thaïlande.
     Parle français et anglais. Note : 4.8/5 (23 avis). Disponible en appel.
     SOS Expat — aide juridique pour expatriés."
```

### 3. Images WebP + Alt optimisés

```typescript
// Photo de profil
<img
  src={convertToWebP(profilePhoto)}    // Utiliser le format WebP si dispo
  alt={`${fullName} — ${roleTranslated} ${country} — SOS Expat`}
  width={96}
  height={96}
  loading="eager"   // Above the fold = eager (pas lazy)
  fetchPriority="high"
/>

// Photos des prestataires similaires
<img
  src={provider.profilePhoto}
  alt={`${provider.fullName} — ${roleTranslated} ${provider.country}`}
  loading="lazy"   // Below the fold = lazy
  width={48}
  height={48}
/>
```

### 4. JSON-LD — NE PAS MODIFIER, VÉRIFIER QUE ÇA RESTE EN PLACE

Les schémas suivants sont gérés par des composants existants — **ne rien toucher** :
- `ProviderSchemaUtils.ts` → `LegalService` ou `ProfessionalService`
- `ReviewSchema.tsx` → `Review` + `AggregateRating`
- `SEOHead.tsx` → BreadcrumbList

**À ajouter manuellement dans le JSX (si pas encore présent) — FAQPage schema :**

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Comment contacter [Prénom] ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Vous pouvez contacter [Prénom] directement via SOS Expat en cliquant sur le bouton 'Appeler'. Une connexion téléphonique sécurisée est établie en quelques secondes."
      }
    },
    {
      "@type": "Question",
      "name": "Dans quels pays [Prénom] intervient-il/elle ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Prénom] intervient en [liste des pays]. Ses consultations sont disponibles en [liste des langues]."
      }
    },
    {
      "@type": "Question",
      "name": "Quel est le tarif de [Prénom] ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Les consultations avec [Prénom] sont facturées [prix]/min via SOS Expat. Aucun abonnement requis."
      }
    }
  ]
}
```

Note : générer ce schema dynamiquement avec les vraies données du prestataire. Ne l'ajouter que si les données nécessaires sont disponibles.

### 5. Breadcrumb (BreadcrumbList) — via SEOHead existant

S'assurer que le fil d'Ariane HTML visible correspond au schema JSON-LD :
```
Accueil > Avocats en Thaïlande > Pierre — Avocat Visa
```
Chaque élément est un lien `<a>` cliquable (pas juste du texte).

### 6. Balises sémantiques HTML5

```html
<article>              <!-- Wrapper principal du profil -->
  <header>             <!-- Section hero avec H1 + CTA -->
  <section>            <!-- Chaque section (présentation, avis, etc.) -->
  <aside>              <!-- Card CTA sticky desktop -->
  <nav aria-label="Breadcrumb">   <!-- Breadcrumb -->
  <footer>             <!-- Liens suggérés + maillage -->
</article>
```

### 7. AEO — Answer Engine Optimization (ChatGPT, Perplexity, Google SGE)

Pour que les moteurs IA citent cette page comme source :

- **Réponses directes en texte visible** : mettre les infos clés en phrases complètes, pas seulement en données structurées. Ex: "Pierre est avocat spécialisé en droit des visas et de l'immigration, basé en Thaïlande. Il intervient également en France et au Maroc. Il parle français, anglais et espagnol."
- **Paragraphes courts** (2-3 phrases max) : les LLMs préfèrent les blocs digestes
- **Questions/réponses explicites** dans la section FAQ (schema FAQPage ci-dessus)
- **Données factuelles en texte** : ne pas mettre les stats uniquement dans des attributs `data-*` ou dans le JS — elles doivent être dans le HTML rendu
- **Mentions contextuelles** : le nom du prestataire doit apparaître naturellement plusieurs fois dans le texte (au moins 3-4 fois), avec ses attributs (pays, spécialité, langue)

### 8. Canonical & Hreflang — via SEOHead existant (NE PAS MODIFIER)

- `SEOHead` gère déjà le canonical normalisé et les hreflang
- Vérifier que le composant reçoit bien les bons props depuis `ProviderProfile.tsx`

### 9. Performance & Core Web Vitals

- **LCP** (Largest Contentful Paint) : la photo de profil doit avoir `loading="eager"` + `fetchPriority="high"`
- **CLS** (Cumulative Layout Shift) : réserver l'espace pour la photo avec width/height fixes avant chargement
- **FID/INP** : le CTA principal doit être interactif immédiatement (pas derrière un lazy load)
- **Tailwind purge** : ne pas utiliser de classes dynamiques non-purgeable (ex: `text-${color}`) — utiliser des classes statiques ou safelist

---

## DESIGN SYSTEM & IDENTITÉ VISUELLE

### Principes directeurs
- **Confiance avant tout** : bleu professionnel, blanc, accents verts (online/success)
- **Premium sans être froid** : photos grandes, espaces généreux, typographie claire
- **Urgence sans panique** : le CTA "Appeler" doit être désirable, pas anxiogène
- **Mobile-first absolu** : concevoir d'abord sur 375px, ensuite adapter desktop

### Couleurs (utiliser les classes Tailwind existantes du projet)
- CTA principal : couleur primaire existante (vérifier dans `tailwind.config.js`)
- Online badge : `bg-green-500` avec animation `animate-pulse`
- Busy badge : `bg-amber-500`
- Offline : `bg-gray-400`
- Stars : `text-amber-400`
- Verified badge : bleu ou gold selon l'existant

### Typographie
- **H1** : text-2xl font-bold (mobile) / text-3xl font-bold (desktop)
- **H2** : text-xl font-semibold
- **H3** : text-base font-semibold
- **Body** : text-sm (mobile) / text-base (desktop), line-height generous
- **Stats** : text-2xl font-bold + text-xs label

### Spacing mobile-first
- Padding page : `px-4 py-6` (mobile) → `px-8 py-10` (desktop)
- Gap entre sections : `space-y-8` (mobile) → `space-y-12` (desktop)
- Cards : `rounded-2xl shadow-sm border border-gray-100`

---

## COMPORTEMENTS DYNAMIQUES

### Statut en temps réel (Firestore listener déjà actif — NE PAS TOUCHER)

```
LOGIQUE EXISTANTE À CONSERVER TELLE QUELLE :
- Le listener Firestore sur sos_profiles/{uid} est déjà en place
- Les variables isOnline, availability, busyReason sont déjà dans le state
- Les conditions if/else qui décident de l'état du bouton sont déjà écrites
- Le handler onClick du bouton "Appeler" est déjà écrit

TON RÔLE = améliorer uniquement l'apparence visuelle de chaque état :
- État "available"     → badge vert animé, texte valorisant, CTA prominent
- État "busy/in_call"  → badge amber animé, message rassurant ("Actuellement en appel")
- État "offline"       → indicateur gris, prestataires alternatifs mis en valeur visuellement

NE PAS :
- Réécrire les conditions qui déterminent l'état
- Changer le comportement du clic
- Modifier ce qui est disabled ou non
- Fusionner des cas de busyReason distincts
```

### Scroll behavior
- Clic sur "N avis" dans le hero → scroll fluide vers `#reviews`
- Clic sur "Voir tous les avocats en [Pays]" → navigation normale `<a href>`
- Sticky CTA mobile : `IntersectionObserver` sur le CTA principal

### Partage (boutons existants à conserver)
- Facebook, Twitter/X, LinkedIn, WhatsApp, Email, Telegram, Copier lien
- Utiliser les handlers existants dans `ProviderProfile.tsx`

---

## CE QUI NE DOIT PAS CHANGER (liste exhaustive)

1. `slugGenerator.ts` — aucune modification
2. `App.tsx` routes — aucune modification
3. `SEOHead.tsx` — aucune modification
4. `ProviderSchemaUtils.ts` — aucune modification
5. `ReviewSchema.tsx` — aucune modification
6. `Reviews.tsx` (composant) — aucune modification (juste re-stylé via classes Tailwind dans le parent)
7. Firebase queries dans `ProviderProfile.tsx` — aucune modification
8. Hooks existants (`usePricingConfig`, `useProviderTranslation`, `useMetaTracking`) — aucune modification
9. `trackEvent()` et `trackMetaViewContent()` appels — conserver exactement
10. `QuickAuthWizard` — conserver exactement
11. Logique de redirect UID→ShortId — conserver exactement
12. `busyReason` checks granulaires — NE PAS simplifier (voir feedback mémoire)

---

## LIVRABLES ATTENDUS

### Fichier principal à modifier
- `sos/src/pages/ProviderProfile.tsx` — refonte complète du JSX/rendu
- Possibilité de créer des sous-composants dans `sos/src/components/provider/` si la taille le justifie (ex: `ProviderHero.tsx`, `ProviderStats.tsx`, `ProviderCTACard.tsx`)

### Checklist de validation avant PR

**Fonctionnel :**
- [ ] **Diff review obligatoire** : aucune ligne de logique métier modifiée (uniquement JSX + classes CSS)
- [ ] CTA "Appeler" fonctionne exactement comme avant (même handler, même flow)
- [ ] Statut online/offline/busy change en temps réel (listener Firestore intact)
- [ ] Chaque valeur de busyReason produit un affichage distinct (non fusionnés)
- [ ] Les avis s'affichent correctement (composant Reviews lazy-loaded)
- [ ] Les prestataires similaires s'affichent et leurs liens fonctionnent
- [ ] Le partage (tous les réseaux) fonctionne
- [ ] Le fil d'Ariane est cliquable
- [ ] Le redirect URL ancienne → nouvelle URL fonctionne
- [ ] Le composant fonctionne pour les 2 types : "lawyer" et "expat"
- [ ] `busyReason` affiche bien des états différents pour chaque valeur

**SEO :**
- [ ] Une seule H1 par page
- [ ] H2, H3, H4 dans le bon ordre (pas de saut de niveau)
- [ ] `alt` sur toutes les images, optimisé
- [ ] `loading="eager"` sur la photo hero, `loading="lazy"` sur le reste
- [ ] Schema FAQPage présent dans le DOM (si données dispo)
- [ ] Liens vers pages listage pays présents et fonctionnels
- [ ] Liens vers prestataires similaires en `<a href>` standard
- [ ] Breadcrumb HTML visible correspondant au schema JSON-LD

**Mobile :**
- [ ] Rendu parfait à 375px (iPhone SE)
- [ ] Sticky CTA barre en bas (mobile uniquement)
- [ ] Sticky CTA card à droite (desktop uniquement)
- [ ] Aucun overflow horizontal
- [ ] Touch targets ≥ 44px pour tous les boutons

**Performance :**
- [ ] Aucun import de nouvelle dépendance
- [ ] Aucune classe Tailwind dynamique non-purgeable
- [ ] `Reviews` reste lazy-loaded
- [ ] Pas de re-render inutile (mémoïser les sections statiques avec `useMemo` si nécessaire)

---

## INSPIRATION & RÉFÉRENCES DESIGN (pour l'esprit, pas la copie)

- **Airbnb Experiences** : hero photo + badge confiance + CTA sticky
- **Avvo.com** : profil avocat avec trust signals + avis vérifiés
- **Doctolib** : disponibilité temps réel + CTA ultra-clear
- **Trustpilot profils** : rating prominent + distribution étoiles
- **Malt.fr** : card prestataire freelance avec stats + disponibilité
- **LegalZoom** : landing page juridique avec urgence contrôlée

---

## NOTE FINALE SUR LES SLUGS DÉJÀ INDEXÉS

Les URLs des pages prestataires sont déjà indexées dans Google Search Console sous le format :
```
/fr-fr/avocat-thailande/pierre-visa-k7m2p9
/en-us/lawyer-thailand/julien-immigration-a3b5c7
```
**Ne jamais modifier ce format.** Toute modification provoquerait des erreurs 404, une perte de positionnement et une dépréciation dans Google Search Console. Le système de slugs (`slugGenerator.ts`) et le routing (`App.tsx`) sont en dehors du périmètre de cette refonte.

---

*Prompt généré le 2026-03-31 — SOS Expat Project*
*Stack: React 18 + TypeScript + Tailwind + Firebase + react-intl*
*Fichier cible: `sos/src/pages/ProviderProfile.tsx`*
