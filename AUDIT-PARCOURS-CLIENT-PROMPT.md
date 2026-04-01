# AUDIT COMPLET — Parcours Client Réservation SOS Expat (De A à Z)

## Contexte Projet

SOS Expat est une plateforme React/Firebase/Vite connectant des clients expatriés à des avocats/experts via appels téléphoniques Twilio. Le parcours client complet est :

**Wizard filtres → Affichage prestataires → Profil prestataire → Booking Request → Authentification → Paiement (Stripe/PayPal) → Page succès → Appel téléphonique**

---

## ARCHITECTURE DES 50 AGENTS IA

### Niveau 0 — ORCHESTRATEUR (1 agent)
**Agent #0 : Chef d'orchestre**
- Supervise les 7 directeurs de niveau 1
- Consolide le rapport final avec priorités P0/P1/P2
- Valide la cohérence inter-équipes
- Produit le plan d'action final ordonné par impact business

### Niveau 1 — DIRECTEURS (8 agents)
| Agent | Périmètre | Agents sous supervision |
|-------|-----------|------------------------|
| #1 | Wizard & Filtres | #9, #10, #11, #12, #13 |
| #2 | Booking Request (UX/UI + Backend) | #14, #15, #16, #17, #18, #19 |
| #3 | Authentification & Connexion | #20, #21, #22, #23, #24 |
| #4 | Pages de Paiement (Stripe + PayPal) | #25, #26, #27, #28, #29, #30, #31 |
| #5 | Performance & Vitesse | #32, #33, #34, #35, #36, #37 |
| #6 | Mobile, Tablet & Cross-Browser | #38, #39, #40, #41, #42, #43 |
| #7 | Post-paiement & Appel | #44, #45, #46, #47, #48 |
| #8 | NON-RÉGRESSION, Sécurité & Accessibilité | #49, #50 |

### Niveau 2 — SPÉCIALISTES (41 agents)
Détaillés ci-dessous par équipe.

---

## RÈGLE ABSOLUE — ZONES INTERDITES (NE PAS TOUCHER)

Les agents NE DOIVENT PAS modifier les fichiers/systèmes suivants sauf demande explicite :
- `sos/firebase/functions/src/Webhooks/twilioWebhooks.ts` — Webhooks Twilio en production temps réel
- `sos/firebase/functions/src/Webhooks/TwilioConferenceWebhook.ts` — Conférence bridge critique
- `sos/firebase/functions/src/TwilioCallManager.ts` — Orchestration appels (P0 business)
- `sos/firebase/functions/src/scheduled/` — Tous les crons en production
- `sos/firestore.rules` — Règles de sécurité (modifier = risque de bloquer tous les users)
- Stripe webhooks / PayPal webhooks côté backend
- Toute Cloud Function en `europe-west3` (zone protégée paiements + Twilio)
- Les collections Firestore existantes (schéma) — on AJOUTE des champs optionnels, on ne SUPPRIME JAMAIS un champ côté Firestore

**Principe** : Le frontend peut être modifié librement. Le backend ne doit être modifié QUE si un agent a prouvé que le fallback existe ET que les anciens documents ne cassent pas.

---

## ÉQUIPE 1 — WIZARD & AFFICHAGE PRESTATAIRES

### Fichiers à analyser
- `sos/src/components/sos-call/GuidedFilterWizard.tsx` (661 lignes) — Wizard 3 étapes
- `sos/src/components/sos-call/DesktopFilterBar.tsx` (497 lignes) — Filtres desktop
- `sos/src/pages/SOSCall.tsx` (3900+ lignes) — Page principale prestataires
- `sos/src/contexts/WizardContext.tsx` — État global wizard
- `sos/src/data/countries.ts` — Données pays
- `sos/src/data/languages-spoken.ts` — Données langues

### Agent #9 : Baseline metrics — État actuel AVANT modifications
**Mission** : Mesurer l'état actuel de TOUTES les pages du parcours AVANT toute modification.
- **CRITIQUE** : Sans baseline, on ne pourra pas prouver que les changements améliorent la situation
- Mesurer pour CHAQUE page du parcours (wizard, listing, booking, login, paiement, succès) :
  - FCP, LCP, TTI, CLS, INP, TTFB (via Lighthouse ou WebPageTest)
  - Temps de transition entre chaque page (chrono utilisateur réel)
  - Poids total JS/CSS téléchargé par page
  - Nombre de requêtes réseau par page
- **Conditions de test** :
  - Desktop : Chrome dernière version, WiFi rapide
  - Mobile : Chrome DevTools throttling "Slow 4G" + CPU 4x slowdown
  - Mobile réel : iPhone 13 Safari + Samsung Galaxy S21 Chrome (si possible)
- **Livrable** : Tableau baseline complet par page + screenshots des waterfalls réseau

### Agent #10 : Performance transitions Wizard
**Mission** : Mesurer et optimiser le temps entre chaque étape du wizard (s'appuyer sur les baselines de l'Agent #9).
- Temps de transition entre Step 1 (pays) → Step 2 (langue) → Step 3 (type)
- Le délai de 250ms sur la sélection du type prestataire est-il perceptible ? Trop long ?
- Analyser le rendu conditionnel : est-ce que React re-render tout le wizard à chaque étape ?
- Vérifier si `useMemo` est correctement utilisé pour le tri pays/langues
- Impact des images flags depuis `flagcdn.com` : latence réseau, cache, fallback
- **Livrable** : Temps mesuré par transition + recommandations d'optimisation

### Agent #9 : UX/UI Wizard mobile
**Mission** : Auditer l'expérience utilisateur mobile du wizard.
- Touch targets : tous les boutons font-ils au moins 44px (iOS) / 48px (Android) ?
- Scroll : `WebkitOverflowScrolling: 'touch'` est-il suffisant ? Tester sur iOS Safari
- Safe area : les insets `env(safe-area-inset-*)` sont-ils correctement appliqués ?
- Body scroll lock via CSS (`overflow:hidden`) : fonctionne-t-il sur tous les navigateurs mobiles ?
- La barre de progression (3 cercles) est-elle claire visuellement ?
- **Livrable** : Checklist UX mobile avec captures annotées

### Agent #10 : Affichage prestataires — Performance
**Mission** : Auditer la vitesse d'affichage de la liste des prestataires.
- Firestore query : timeout 8 secondes + 50 providers fallback — est-ce optimal ?
- Pagination (PAGE_SIZE = 16) : lazy loading vs pagination classique ?
- Images avatars : `loading="lazy"` + `decoding="async"` + fallback `/default-avatar.webp` — OK ?
- Le composant `ModernProfileCard` est memoized (`React.memo`) — vérifie que les props ne changent pas inutilement
- Filtres en temps réel : chaque changement de filtre re-render-t-il toute la grille ?
- **Livrable** : Métriques de rendering (React Profiler) + optimisations

### Agent #11 : SEO page prestataires
**Mission** : Auditer les 13 schémas JSON-LD sur la page SOSCall.
- Les 13 types de schema (Organization, WebSite, ProfessionalService, FAQ, ItemList, HowTo, etc.) sont-ils tous nécessaires ?
- Impact sur le temps de parsing du HTML (13 scripts JSON-LD inline)
- Est-ce que les schemas FAQ et HowTo sont pertinents sur une page de listing ?
- Hreflang links : correctement générés pour les 9 langues ?
- **Livrable** : Recommandation de simplification SEO + impact performance

### Agent #11b : Micro-interactions & Skeleton Screens — Transitions entre pages
**Mission** : Auditer les animations de transition, les feedback visuels et les squelettes de chargement entre CHAQUE page du parcours.
- **Transitions à vérifier** :
  - Wizard step → step : y a-t-il une animation de slide/fade ou un cut brutal ?
  - Wizard → Listing prestataires : loading state visible ou écran blanc ?
  - Listing → Profil prestataire : skeleton screen ou spinner générique ?
  - Profil → Booking Request : transition fluide ou flash blanc ?
  - Booking Request → Paiement : **C'EST LE PLUS LENT** — que voit l'utilisateur pendant 3-5s ?
  - Paiement → Page succès : feedback visuel du bouton "Payer" pendant le traitement
- **Feedback visuels manquants** :
  - Bouton "Payer" : a-t-il un état loading (spinner dans le bouton) ou juste disabled ?
  - Boutons CTA : animation au clic (`active:scale-98`) sur TOUS les boutons ?
  - Champs de formulaire : animation de focus (border transition) ?
  - Validation temps réel : le compteur de caractères (description) a-t-il une animation de couleur ?
- **Skeleton screens** :
  - `SkeletonCard.tsx` existe — est-il utilisé sur TOUTES les pages avec chargement ?
  - La page paiement a-t-elle un skeleton dédié ou juste `<LoadingSpinner>` générique ?
  - La page profil prestataire : skeleton ou spinner ?
- **Livrable** : Carte des transitions (fluide/brut/manquant) + recommandations d'animations modernes 2026

### Agent #12 : UX Desktop filtres
**Mission** : Auditer le `DesktopFilterBar` (497 lignes).
- Cohérence visuelle avec le reste du site
- Multi-select langues : UX avec checkboxes + badge count — intuitif ?
- Chips de filtres actifs : cliquables pour supprimer ? Responsive ?
- Bouton reset : visible uniquement quand filtres actifs — bon pattern ?
- Recherche avec suggestions dropdown : pertinence des résultats
- **Livrable** : Rapport UX desktop avec recommandations

---

## ÉQUIPE 2 — BOOKING REQUEST (REFONTE UX/UI + BACKEND)

### Fichiers à analyser
- `sos/src/pages/BookingRequest.tsx` (3800+ lignes) — Page desktop
- `sos/src/components/booking-mobile/MobileBookingWizard.tsx` — Wizard mobile 6 étapes
- `sos/src/components/booking-mobile/context/MobileBookingContext.tsx` — État formulaire
- `sos/src/components/booking-mobile/steps/Step1NameScreen.tsx` à `Step6ConfirmScreen.tsx`
- `sos/src/components/booking-mobile/ui/StickyCTA.tsx` — Bouton sticky
- `sos/src/services/booking.ts` — Service création booking
- `sos/firebase/functions/src/createAndScheduleCallFunction.ts` — Backend appel
- `sos/firebase/functions/src/createPaymentIntent.ts` — Backend paiement
- `sos/firestore.rules` — Règles Firestore

### Agent #13 : SUPPRESSION lastName — Impact complet
**Mission** : Analyser l'impact de la suppression du champ `lastName` sur tout le système.
- **Firestore rules** (`firestore.rules`) : Le champ n'est PAS requis (optionnel) → OK
- **Backend createAndScheduleCall** : `lastName` est mappé dans `participants.client.lastName` → fallback à `''` si absent → OK
- **SMS notifications** : Le SMS au prestataire utilise `clientData?.lastName || ''` → OK
- **Outil IA sync** : Le payload inclut `clientLastName` (peut être null) → OK
- **Mobile Wizard Step 1** : `STEP_FIELDS: { 1: ['firstName', 'lastName'] }` — **DOIT ÊTRE MODIFIÉ**
  - Retirer `lastName` de la validation
  - Retirer le champ `lastNameRef` de `Step1NameScreen.tsx`
  - Mettre à jour `hasFirst && hasLast` → `hasFirst` uniquement
- **Desktop BookingRequest.tsx** : Le formulaire legacy a un champ lastName → **SUPPRIMER**
- **PaymentSuccess.tsx** : Affiche `clientFirstName` seulement → OK
- **Stripe metadata** : Ne contient pas lastName → OK
- **Vérifier** : `booking_requests` collection — les anciens docs avec lastName ne cassent rien
- **Livrable** : Liste exhaustive des fichiers à modifier + code de migration

### Agent #14 : SUPPRESSION title — Impact complet
**Mission** : Analyser l'impact de la suppression du champ `title` (titre de la demande).
- **Backend fallback DÉJÀ en place** : `title: bookingTitle || (serviceType === 'lawyer_call' ? 'Consultation avocat' : 'Consultation expat')` → EXCELLENT
- **SMS notifications** : Utilise le fallback title → OK
- **Outil IA sync** : `title: cs?.metadata?.title || cs?.title || "Consultation"` → OK
- **Mobile Wizard Step 3** (`Step3TitleScreen.tsx`) : SUPPRIMER cette étape entière
  - Mettre à jour `MobileBookingWizard.tsx` : passer de 6 à 5 étapes
  - Renuméroter les étapes (Step 4→3, Step 5→4, Step 6→5)
  - Mettre à jour `ProgressBar.tsx` et `STEP_FIELDS` dans context
- **Desktop BookingRequest.tsx** : Supprimer le champ title du formulaire
- **Validation** : Supprimer la validation `min 10 chars` du title
- **Livrable** : Plan de suppression étape par étape + fichiers impactés

### Agent #15 : REFONTE description — Nouveau wording & UX
**Mission** : Transformer le champ "Description détaillée" pour que le client comprenne que c'est POUR L'AVOCAT.
- **Objectif** : Le client doit comprendre que sa description aide l'avocat à PRÉPARER ses recherches AVANT l'appel pour avoir de meilleures réponses
- **Texte actuel** :
  - Label : "Description détaillée" / "Décrivez en détail"
  - Hint : "Contexte, objectif, délais… donnez-nous de la matière 🔎"
  - Placeholder : "Expliquez votre situation : contexte, questions précises, objectifs, délais… (min. 50 caractères)"
- **Nouveau wording proposé** :
  - Label : "Décrivez votre situation à l'expert" / "Aidez votre expert à préparer votre appel"
  - Hint : "Votre expert lira cette description avant de vous rappeler pour mieux vous aider dès la première minute"
  - Placeholder : "Ex : Je suis en Thaïlande depuis 3 mois, mon visa expire dans 2 semaines. Je cherche à savoir quelles options j'ai pour rester légalement..."
  - Sous-texte motivant : "Plus vous êtes précis, plus votre expert sera efficace dès le premier échange"
- **Réduire le minimum** : 50 caractères → 30 caractères (moins de friction)
- **Mettre à jour** : `fr.json`, `en.json` + les 7 autres langues
- **Mettre à jour** : BookingRequest.tsx (desktop) + Step4DescriptionScreen.tsx (mobile, qui deviendra Step3 après suppression du title)
- **Livrable** : Nouveau wording dans les 9 langues + maquette UX

### Agent #16 : REFONTE téléphone — Nouveau message de confiance
**Mission** : Remplacer "Aucun spam — jamais. Seulement pour vous connecter à l'expert. 📵" par un message plus positif et orienté action.
- **Texte actuel** : "Aucun spam — jamais. Seulement pour vous connecter à l'expert. 📵"
  - Problème : le mot "spam" est négatif, crée de l'anxiété même en niant
- **Nouveau texte proposé** : "Votre expert va vous rappeler à ce numéro dans les 5 minutes qui suivent le paiement."
  - Avantage : positif, orienté action, crée l'anticipation, explique le POURQUOI du numéro
- **Alternative** : "C'est à ce numéro que votre expert vous contactera. Appel sous 5 minutes après paiement."
- **Mettre à jour** :
  - `fr.json` : clé `bookingRequest.hints.phone`
  - `en.json` : clé correspondante
  - `BookingRequest.tsx` : l'objet I18N hardcodé (ligne 161)
  - `Step5PhoneScreen.tsx` (mobile, qui deviendra Step4 après suppression du title)
  - Les 7 autres fichiers de langue
- **Livrable** : Nouveau texte dans les 9 langues + validation UX

### Agent #17 : Design Booking Request — Alignement avec le reste du site
**Mission** : Auditer et réaligner le design du formulaire BookingRequest avec le design system du site.
- **Problème identifié** : Le formulaire semble visuellement décalé du reste du site
- **Points à vérifier** :
  - Palette de couleurs : `red-600`, `orange-500`, `gray-*` — cohérent avec le reste ?
  - Typography : tailles de police, font-weight, line-height
  - Espacement : padding/margin entre les champs vs les autres pages
  - Boutons : style des CTA (gradient orange ?) vs boutons du wizard/navigation
  - Cards : `rounded-xl`, `border-2` — même langage que les cards prestataires ?
  - Provider mini-card (Step 6) : `bg-red-50 rounded-xl p-4` — harmonieux ?
  - Desktop vs Mobile : le desktop utilise un "vieux" formulaire multi-champs vs le wizard mobile
- **Comparer avec** :
  - `GuidedFilterWizard.tsx` (wizard filtres)
  - `ModernProfileCard` (cards prestataires)
  - `ProviderProfile.tsx` (page profil)
  - Homepage hero section
- **Livrable** : Rapport d'incohérences design + propositions d'alignement

### Agent #18 : Transition BookingRequest → Paiement (LENTEUR)
**Mission** : Diagnostiquer pourquoi la page met longtemps à afficher la page de paiement après validation du formulaire.
- **Flow actuel** :
  1. User valide le formulaire → `createBookingRequest()` (Firestore write)
  2. Données stockées en sessionStorage
  3. Analytics tracking (Meta Pixel + Google Ads + GA4) — **en parallèle mais bloquant ?**
  4. Navigation vers `/call-checkout/{providerId}`
  5. `CallCheckoutWrapper` (lazy load) charge les données
  6. `CallCheckout.tsx` (4632 lignes !) s'initialise
- **Hypothèses de lenteur** :
  - Le `React.lazy()` de CallCheckoutWrapper déclenche le téléchargement du chunk
  - Le chunk CallCheckout est ÉNORME (4632 lignes + Stripe SDK ~70KB + PayPal SDK ~50KB)
  - Les 5 tentatives de chargement provider (sessionStorage → URL → localStorage → history → fallback)
  - L'initialisation de Stripe `loadStripe()` même si mise en cache globale
  - Le chargement du PayPal SDK (async mais bloquant le rendu)
- **Tests à effectuer** :
  - Mesurer le temps entre le clic "Continuer vers le paiement" et le First Contentful Paint de CallCheckout
  - Identifier le chunk size de CallCheckoutWrapper dans le bundle
  - Vérifier si le preloading du chunk est possible (route-based prefetch)
- **Livrable** : Waterfall détaillé de la transition + bottlenecks identifiés + solutions

---

## ÉQUIPE 3 — AUTHENTIFICATION & CONNEXION

### Fichiers à analyser
- `sos/src/pages/Login.tsx` (1325 lignes)
- `sos/src/components/auth/QuickAuthWizard.tsx` (782 lignes)
- `sos/src/contexts/AuthContext.tsx` (1200+ lignes)
- `sos/src/pages/BookingRequest.tsx` — EmailFirstAuth composant inline (lignes 1479-1834)

### Agent #19 : Performance page Login
**Mission** : Diagnostiquer les lenteurs de la page de connexion.
- SEO/Meta tags lourds : OpenGraph, Twitter Cards, Schema.org, Hreflang, FAQ — nécessaire sur la page login ?
- `fetchSignInMethodsForEmail` en background : latence réseau Firebase Auth
- Google OAuth popup : temps de chargement du popup Google
- Transition login → dashboard : utilisation de `isFullyReady` vs juste `user`
- Flash of unauthenticated content (FOUC) — le spinner `shouldShowSpinner` est-il bien timing ?
- **Livrable** : Temps mesurés + recommandations de suppression SEO inutile sur login

### Agent #20 : QuickAuthWizard dans le flux booking
**Mission** : Auditer le modal d'authentification inline pendant le booking.
- Le polling toutes les 500ms (max 120 tentatives = 60s) est-il perceptible par l'utilisateur ?
- Détection du Google popup : `sessionStorage` flag survit-il au remount ?
- iOS Safari : le `shouldForceRedirectAuth()` fonctionne-t-il correctement ?
- Error recovery : le bouton "retour" permet-il de changer de méthode d'auth ?
- Accessibilité du modal : focus trap, fermeture Escape, ARIA labels
- **Livrable** : Rapport UX auth inline + bugs potentiels

### Agent #21 : Feedback utilisateur lors d'erreurs auth
**Mission** : Auditer la qualité des messages d'erreur d'authentification.
- `auth/user-not-found` → essaye register automatiquement — l'user comprend-il ?
- `auth/email-already-in-use` → "mauvais mot de passe" — confusing ?
- `auth/too-many-requests` → rate limit — message clair ?
- Network errors / popup bloqué → message actionnable ?
- Extension blocking detection (`isExtensionBlockedError()`) → guide l'utilisateur ?
- **Livrable** : Matrice erreurs + messages actuels + messages recommandés

### Agent #22 : Performance Firestore post-auth
**Mission** : Diagnostiquer la lenteur du chargement des données utilisateur après authentification.
- `getDoc()` Firestore peut prendre 5-30 secondes sur mobile
- `getAdaptiveTimeout()` = 60 secondes — trop permissif ?
- Fallback REST API si Firestore lent — est-il implémenté ?
- `DeviceInfo` détection : slow-2g/2g → 'slow', 3g → 'medium' — ajuste-t-il réellement le timeout ?
- Peut-on prefetch le user doc pendant que le popup Google est ouvert ?
- **Livrable** : Temps Firestore par type de connexion + optimisations

### Agent #23 : Inscription inline — Friction
**Mission** : Auditer le flux d'inscription d'un nouveau client dans le contexte booking.
- Le client doit-il VRAIMENT s'inscrire pour réserver ? (conversion killer)
- Auto-register sur nouvel email : UX claire ou confusing ?
- Mot de passe minimum 8 caractères : friction nécessaire ?
- `EmailFirstAuth` (BookingRequest.tsx lignes 1479-1834) vs `QuickAuthWizard` — deux implémentations différentes pour le même besoin ?
- Peut-on simplifier en guest checkout avec email seul ?
- **Livrable** : Analyse de friction + proposition de simplification

---

## ÉQUIPE 4 — PAGES DE PAIEMENT (REFONTE COMPLÈTE)

### Fichiers à analyser
- `sos/src/pages/CallCheckout.tsx` (4632 lignes) — PAGE CRITIQUE
- `sos/src/pages/CallCheckoutWrapper.tsx` (659 lignes)
- `sos/src/components/payment/PayPalPaymentForm.tsx` (858 lignes)
- `sos/src/contexts/PayPalContext.tsx` (90 lignes)
- `sos/vite.config.js` — Configuration bundle/chunks
- `sos/package.json` — react-snap configuration (lignes 151-293)

### Agent #24 : Diagnostic lenteur page paiement — Root cause
**Mission** : Identifier PRÉCISÉMENT pourquoi la page de paiement est extrêmement lente.
- **CallCheckout.tsx = 4632 lignes** dans UN SEUL fichier — c'est le problème #1
- **Hypothèses à vérifier** :
  1. Le chunk JavaScript est-il trop gros ? (Stripe ~70KB + PayPal ~50KB + form libs + tracking)
  2. `react-snap` prérendering : la page de paiement est-elle EXCLUE ? (Vérifier `package.json` lignes 151-293)
  3. Stripe `loadStripe()` : temps de chargement du SDK externe (~1-3s)
  4. PayPal SDK : chargement async avec 15 secondes timeout — visible ?
  5. `react-hook-form` initialisation sur 4632 lignes de composant
  6. Les 20+ icônes Lucide importées en même temps
  7. `libphonenumber-js` (~30KB) importé pour validation téléphone
  8. Le pricing admin config fetch depuis Firestore (latence réseau)
- **VÉRIFICATION CRITIQUE** : Est-ce que `react-snap` essaie de prérender `/call-checkout` malgré l'exclusion ? Ça expliquerait la lenteur extrême
- **Livrable** : Waterfall complet du chargement + identification du bottleneck principal

### Agent #25 : Prerendering & SEO sur pages de paiement — Audit nécessité
**Mission** : Déterminer si le prerendering/SEO est INUTILE sur les pages de paiement.
- `react-snap` (package.json) : La page `/call-checkout` est-elle dans la liste d'exclusion ?
- `react-helmet-async` : AUCUN Helmet sur CallCheckout ni PaymentSuccess — CONFIRMÉ OK
- La page est `protected: true` (requiert auth) → Google ne peut PAS l'indexer
- **Recommandation attendue** :
  - Confirmer que AUCUN prerendering ne s'applique
  - Confirmer que AUCUN SEO meta n'est nécessaire
  - Vérifier que `robots: noindex` est bien configuré pour les pages protégées
  - Si react-snap génère un HTML vide pour ces pages, ça peut causer des problèmes
- **Livrable** : Confirmation que prerendering/SEO est bien désactivé + recommandations

### Agent #26 : REFONTE Stripe Payment — Nouvelle architecture
**Mission** : Redesigner complètement l'interface de paiement Stripe.
- **État actuel** : Formulaire surchargé, bordélique, trop d'informations visibles
- **Problèmes UX** :
  - Trop de champs visibles simultanément (card number, expiry, CVC, ZIP)
  - Informations de recap mélangées avec les champs de paiement
  - Pas de hiérarchie visuelle claire
  - Bouton "Payer" noyé dans le contenu
- **Benchmark 2026** :
  - Apple Pay / Google Pay en premier (PaymentRequestButton) — est-il bien visible ?
  - Card fields dans un bloc encadré avec icône Lock
  - Résumé prix minimaliste (montant + durée seulement)
  - Bouton payer GROS, fixe en bas, couleur contrastée
  - Badges de confiance (Stripe, 256-bit SSL, remboursement) petits et discrets
- **Code splitting** : Séparer CallCheckout.tsx en :
  - `CheckoutSummary.tsx` (recap commande)
  - `StripePaymentForm.tsx` (formulaire Stripe)
  - `PayPalPaymentSection.tsx` (section PayPal)
  - `CheckoutTracking.tsx` (analytics)
- **Livrable** : Maquette fonctionnelle + architecture composants

### Agent #27 : REFONTE PayPal Payment — Nouvelle architecture
**Mission** : Redesigner l'interface de paiement PayPal.
- **PayPalPaymentForm.tsx** (858 lignes) — Analyser la structure
- PayPal Buttons + Card Fields : l'utilisateur comprend-il la différence ?
- Le timeout de 15 secondes du SDK : que voit l'utilisateur pendant ce temps ?
- Détection de blocage par extensions (ad blockers) : message d'erreur clair ?
- Authorization flow (pas de capture immédiate) : l'utilisateur sait-il que ça sera débité plus tard ?
- Race condition `onError` après `onApprove` réussie — protection en place ?
- Enable Venmo + Pay Later : pertinent pour des expats internationaux ?
- **Livrable** : Nouvelle UI PayPal + gestion des edge cases

### Agent #28 : Validation paiement — Lenteur extrême
**Mission** : Diagnostiquer pourquoi la VALIDATION du paiement est si lente.
- **Flow Stripe** :
  1. `createPaymentIntent()` — Cloud Function europe-west3 → latence réseau EU→US (Firestore en Iowa)
  2. Rate limiting check (Firestore read)
  3. Duplicate payment detection (Firestore query)
  4. Commission split calculation
  5. Stripe API call (create PaymentIntent)
  6. `confirmPayment()` — Stripe SDK côté client
  7. Résultat → navigation vers success page
- **Flow PayPal** :
  1. `createPayPalOrder()` — HTTP Firebase Function
  2. Authorize order (PayPal API)
  3. Résultat → navigation
- **Questions** :
  - Le rate limiting Firestore-based est-il performant ? (6 req/10min)
  - La détection de duplicate (fenêtre 3 minutes) est-elle trop agressive ?
  - Le createPaymentIntent est en europe-west3 mais Firestore est en nam7 (Iowa) → ~100ms de latence par read
  - Peut-on pré-créer le PaymentIntent pendant que l'utilisateur remplit le formulaire ?
- **Livrable** : Timeline détaillée de la validation + optimisations

### Agent #29 : Temps de chargement total page paiement
**Mission** : Mesurer le temps total de la page de paiement du premier pixel au bouton "Payer" cliquable.
- Time To Interactive (TTI) de CallCheckout
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS) — les éléments bougent-ils pendant le chargement ?
- First Input Delay (FID) / Interaction to Next Paint (INP)
- Le `Suspense fallback={<LoadingSpinner>}` s'affiche-t-il trop longtemps ?
- Le Stripe `Elements` wrapper : temps de montage du composant
- **Livrable** : Core Web Vitals de la page paiement + plan d'amélioration

### Agent #30 : Sécurité paiement
**Mission** : Audit sécurité du flux de paiement.
- Les client secrets sont-ils bien générés côté serveur ?
- Le pricing est-il rechargé côté serveur (pas confiance au frontend) ?
- `metadata.invoicesCreated` set côté browser — peut être spoofé ?
- Le montant est-il re-vérifié par le backend (tolérance ±0.5€) ?
- Les coupons sont-ils validés côté serveur ?
- Le provider Stripe account ID est-il vérifié ?
- **Livrable** : Rapport sécurité + vulnérabilités identifiées

---

## ÉQUIPE 5 — PERFORMANCE & VITESSE

### Fichiers à analyser
- `sos/vite.config.js` — Bundle configuration
- `sos/src/App.tsx` (1190 lignes) — Routing + lazy loading
- `sos/index.html` (714 lignes) — Scripts inline, preconnect, fonts
- `sos/src/utils/performance.ts` (456 lignes) — Monitoring performance
- `sos/src/hooks/useWebVitals.ts` — Web Vitals reporting

### Agent #31 : Bundle analysis global
**Mission** : Analyser la taille des bundles et identifier les optimisations.
- Exécuter `npm run analyze` et analyser le treemap
- Les 13 chunks manuels (vendor-react, vendor-firebase, vendor-stripe, etc.) sont-ils bien dimensionnés ?
- Le chunk `vendor-phone` (libphonenumber-js ~30KB) est-il chargé trop tôt ?
- Le chunk `vendor-icons` (Lucide) : tree-shaking fonctionne-t-il correctement ?
- Le chunk `vendor-stripe` et `vendor-paypal` sont-ils bien isolés (pas chargés sur les autres pages) ?
- **Livrable** : Rapport bundle sizes + recommandations de splitting

### Agent #32 : Lazy loading audit
**Mission** : Vérifier que TOUS les composants lourds sont lazy-loaded.
- 70+ pages utilisent `React.lazy()` — y a-t-il des oublis ?
- `PayPalPaymentForm` est-il lazy-loaded DANS CallCheckout ou importé statiquement ?
- Les icônes Lucide (20+ dans CallCheckout) pourraient-elles être lazy-loaded ?
- Le `MultiLanguageSelect` dans BookingRequest est lazy — mais les autres composants ?
- `ErrorBoundary` attrape-t-il les erreurs de lazy loading ?
- **Livrable** : Liste des imports non-lazy qui devraient l'être

### Agent #33 : Fonts & CSS critical path
**Mission** : Optimiser le chargement des fonts et CSS.
- Inter variable font preloaded (`/fonts/inter-var.woff2`) — correct
- Noto Sans Arabic/Devanagari/Chinese déférés via `media="print"` — OK ?
- Critical CSS inline dans `index.html` — suffisant pour éviter FOUC ?
- `index.css` (1187 lignes) : est-il entièrement nécessaire au first paint ?
- Les animations custom (20+ keyframes dans tailwind.config.js) : impact sur le CSS bundle ?
- **Livrable** : Optimisation critical path CSS

### Agent #34 : Scripts tiers — Impact performance
**Mission** : Auditer l'impact des scripts tiers sur la performance.
- GA4 (`gtag.js`) : chargé en async — impact ?
- Meta Pixel : chargé via `requestIdleCallback` — bon pattern mais quel impact réel ?
- Google Consent Mode V2 : le script de géo-détection timezone ralentit-il le FCP ?
- Le script de capture d'affiliation (inline) : exécuté immédiatement — bloquant ?
- Le script de locale redirect (172+ timezones mappées) : temps d'exécution ?
- Module load error recovery : le `MutationObserver` polling impacte-t-il la performance ?
- **Livrable** : Waterfall des scripts tiers + recommandations de déferral

### Agent #35 : Firestore queries performance
**Mission** : Optimiser les requêtes Firestore dans le parcours client.
- Query prestataires : `where('isVisible', '==', true)` + `where('isApproved', '==', true)` — index composite ?
- Timeout 8s + fallback 50 providers — optimal ?
- `onSnapshot` real-time listener : nécessaire pour le listing ou un `getDocs` suffit ?
- `admin_config/pricing` fetch : mis en cache ? TTL ?
- Post-auth `getDoc()` user : 5-30s sur mobile — peut-on utiliser un cache local ?
- **Livrable** : Requêtes Firestore identifiées + plans d'optimisation

### Agent #36 : Service Worker & caching strategy
**Mission** : Évaluer la stratégie de cache et Service Worker.
- SW principal désactivé (conflits avec FCM) — perte de cache offline ?
- FCM SW (`firebase-messaging-sw.js`) : fait-il du caching ?
- `BUILD_TIMESTAMP` injection : force-t-il un reload complet à chaque deploy ?
- Les assets statiques (fonts, images, JS chunks) ont-ils des headers cache corrects ?
- Cloudflare Pages : quels headers de cache sont définis ?
- **Livrable** : Stratégie de cache recommandée

---

## ÉQUIPE 6 — MOBILE, TABLET & CROSS-BROWSER

### Agent #37 : Tablet (iPad / Android tablet) — Le trou du breakpoint
**Mission** : Auditer le parcours complet sur tablette (768px-1024px).
- **Problème** : Le breakpoint mobile est 767px. À 768px, le desktop form s'affiche → mauvaise UX sur iPad ?
- Le wizard mobile (one-field-per-screen) ne s'affiche PAS sur iPad (>767px) → l'utilisateur voit le vieux formulaire multi-champs
- L'iPad en mode portrait (810px) et paysage (1080px) : quelle expérience ?
- Les cards prestataires : layout grille adapté ou trop petit/trop grand ?
- La page de paiement : formulaire Stripe/PayPal lisible et bien dimensionné ?
- **Livrable** : Rapport tablet + recommandation de breakpoint ajusté

### Agent #38 : iOS Safari — Bugs spécifiques
**Mission** : Tester le parcours complet sur iOS Safari.
- `overflow-x: clip` au lieu de `hidden` (fix 2026-03-10) — résout-il TOUS les cas ?
- Input focus : le zoom automatique sur les champs <16px est-il bien évité ?
- OAuth popup : `shouldForceRedirectAuth()` force redirect sur iOS — fonctionne ?
- ITP (Intelligent Tracking Prevention) : le custom authDomain résout-il les cookies ?
- `position: fixed` bottom buttons : comportement avec le clavier iOS ?
- PWA mode standalone : le parcours fonctionne-t-il entièrement ?
- Safe area insets : notch iPhone X+ et Dynamic Island correctement gérés ?
- **Livrable** : Liste de bugs iOS + fixes

### Agent #38 : Android Chrome — Bugs spécifiques
**Mission** : Tester le parcours complet sur Android Chrome.
- Touch targets 48px (Material Design) : tous les éléments interactifs sont-ils conformes ?
- Clavier virtuel : `window.visualViewport` détection fonctionne-t-elle ?
- Samsung Browser, UC Browser : le `shouldForceRedirectAuth()` les couvre-t-il ?
- WebView (Instagram, Facebook, WhatsApp in-app browser) : auth fonctionne-t-elle ?
- Back button Android : navigation cohérente dans le wizard ?
- **Livrable** : Liste de bugs Android + fixes

### Agent #39 : Responsive Booking Request mobile
**Mission** : Auditer le formulaire BookingRequest sur mobile.
- Le wizard mobile (767px breakpoint) fonctionne-t-il bien sur tous les mobiles ?
- Le desktop fallback (>767px) sur les tablettes : UX acceptable ?
- `StickyCTA` avec détection clavier (`visualViewport < 75%`) : masque-t-il correctement ?
- `pb-24` (bottom padding) : suffisant avec et sans clavier ?
- La progress bar est-elle lisible sur petit écran (320px) ?
- **Livrable** : Rapport responsive mobile

### Agent #40 : Responsive paiement mobile
**Mission** : Auditer les pages de paiement sur mobile.
- CallCheckout (4632 lignes) : le responsive est-il géré dans ce fichier monstre ?
- Stripe Card Elements : s'adaptent-ils correctement aux petits écrans ?
- PayPal Buttons : responsive natif ou override CSS nécessaire ?
- Le résumé de commande : lisible sur 320px ?
- Le bouton "Payer" : fixe en bas ? Visible avec le clavier ?
- Les badges de confiance : pas de débordement horizontal ?
- **Livrable** : Captures mobile + problèmes identifiés

### Agent #41 : Responsive page succès mobile
**Mission** : Auditer la page PaymentSuccess sur mobile.
- Le countdown circulaire : taille adaptée sur petit écran ?
- Les animations (bouncing phone icon) : fluides sur mobile ?
- Le timer d'appel en cours : lisible et non-masqué par le clavier ?
- Le modal de review : s'ouvre-t-il correctement sur mobile ?
- Les liens "Choisir un autre expert" / "Dashboard" : accessibles ?
- **Livrable** : Rapport UX mobile page succès

### Agent #42 : Performance mobile globale
**Mission** : Mesurer les Core Web Vitals sur mobile.
- LCP, FCP, CLS, INP, TTFB sur mobile (3G lent simulé)
- `adaptiveLoading()` détecte-t-il correctement les connexions lentes ?
- Les images sont-elles optimisées pour mobile (WebP, tailles appropriées) ?
- Le JavaScript total téléchargé sur le parcours complet (wizard → paiement)
- Comparaison 4G vs WiFi : différence de temps de chargement
- **Livrable** : Métriques mobile + plan d'optimisation

### Agent #43 : États d'erreur & résilience réseau (toutes pages, tous devices)
**Mission** : Tester le comportement de CHAQUE page quand les choses tournent mal.
- **Réseau instable** :
  - Que se passe-t-il si le réseau coupe pendant le paiement Stripe ? (bouton disabled, message, retry ?)
  - Que se passe-t-il si le réseau coupe entre booking → checkout ? (sessionStorage intact ?)
  - Firestore timeout : le fallback 50 providers fonctionne-t-il vraiment ?
- **SessionStorage** :
  - Safari mode privé : sessionStorage bloqué ? Le `safeStorage` fallback fonctionne-t-il ?
  - SessionStorage plein (5MB limit) : gestion d'erreur ?
  - Utilisateur ouvre 2 onglets : conflit de données ?
- **Erreurs Stripe/PayPal** :
  - Carte refusée : message clair et retry possible ?
  - 3D Secure échoue : retour propre au formulaire ?
  - PayPal popup fermé par l'utilisateur : state proprement nettoyé ?
- **Livrable** : Matrice erreurs par page (erreur × page × device) avec comportement actuel vs attendu

---

## ÉQUIPE 7 — POST-PAIEMENT & APPEL

### Fichiers à analyser
- `sos/src/pages/PaymentSuccess.tsx` (1843 lignes)
- `sos/firebase/functions/src/createAndScheduleCallFunction.ts`
- `sos/firebase/functions/src/runtime/executeCallTask.ts`
- `sos/firebase/functions/src/TwilioCallManager.ts`
- `sos/firebase/functions/src/Webhooks/twilioWebhooks.ts`
- `sos/firebase/functions/src/Webhooks/TwilioConferenceWebhook.ts`

### Agent #43 : Page succès — UX & Design
**Mission** : Auditer l'UX de la page PaymentSuccess.
- Le countdown 4 minutes : anxiogène ou rassurant ?
- Les transitions d'états (connecting → ready_to_ring → in_progress → completed) : fluides ?
- Le message "Presque là !" est-il adapté culturellement (9 langues) ?
- L'état "failed" avec raisons détaillées : l'utilisateur comprend-il quoi faire ?
- Le review modal après 5 minutes d'appel : timing et UX du prompt
- **Livrable** : Rapport UX page succès + améliorations

### Agent #44 : Fiabilité données post-paiement
**Mission** : Auditer la fiabilité du passage de données vers la page succès.
- SessionStorage comme source primaire — que se passe-t-il sur F5/refresh ?
- L'expiration de 10 minutes sur sessionStorage — est-ce suffisant ?
- Le fallback URL params pour les anciens liens — fonctionne-t-il ?
- L'exponential backoff retry (300ms → 1.5s, max 12 retries) — assez robuste ?
- La génération d'invoice côté client : fiable ? Le flag `invoicesCreated` est-il sûr ?
- **Livrable** : Matrice de robustesse des données

### Agent #45 : Tracking analytics post-paiement
**Mission** : Vérifier la fiabilité du tracking de conversion.
- Meta Pixel Purchase event : dédupliqué via `metaEventId` → OK ?
- Google Ads conversion : Enhanced Conversions bien configurés ?
- GA4 e-commerce : transaction_id unique ?
- Tracking en sessionStorage anti-doublon sur F5 : fonctionne ?
- Le tracking est-il déclenché AVANT ou APRÈS la confirmation visuelle ?
- **Livrable** : Audit tracking conversions

### Agent #46 : Scheduling appel — Fiabilité
**Mission** : Auditer la robustesse du scheduling d'appel.
- Cloud Task programmé exactement 240 secondes (4 min) après paiement — fiable ?
- `scheduleCallTaskWithIdempotence()` — protège-t-il contre les doubles appels ?
- La réservation atomique du provider (`setProviderBusy`) — race condition possible ?
- L'auto-release du provider après 15 min (cron `checkProviderInactivity`) — gap possible ?
- Que se passe-t-il si le Cloud Task échoue ? Recovery automatique ?
- **Livrable** : Diagramme de fiabilité + points de failure

### Agent #47 : Twilio call quality
**Mission** : Auditer la qualité de l'appel Twilio.
- IVR provider : la voix est-elle claire, le DTMF gathering fonctionne-t-il ?
- AMD (Answering Machine Detection) : le status `amd_pending` est-il bien géré ?
- Le timeout de 60 secondes par participant : suffisant ?
- La conférence bridge : qualité audio, recording, billing duration
- Le comportement si un participant raccroche pendant la connexion
- **Livrable** : Rapport qualité appel

### Agent #48 : Notifications & SMS
**Mission** : Auditer les notifications envoyées pendant le flux.
- Client notification in-app : visible ? Timing correct ?
- Provider SMS : contient-il toutes les infos nécessaires (nom, pays, montant) ?
- Le sync vers Outil IA : fiable ? Retry queue en place ?
- Le Telegram Engine forward (`forwardEventToEngine()`) : latence ?
- **Livrable** : Audit notifications

### Agent #49 : Remboursement automatique
**Mission** : Auditer le flux de remboursement automatique.
- Appel <60 secondes → remboursement automatique — fiable ?
- Provider ne répond pas → remboursement — délai ?
- Client ne répond pas → pas de remboursement — communiqué clairement ?
- PayPal authorization vs capture (2+ min d'appel pour capturer) : edge cases ?
- Le status "failed" dans PaymentSuccess : le message de remboursement est-il clair ?
- **Livrable** : Matrice remboursement + edge cases

---

## ÉQUIPE 8 — NON-RÉGRESSION, SÉCURITÉ & ACCESSIBILITÉ

### Agent #49 : NON-RÉGRESSION — Checklist avant/après modifications
**Mission** : Créer et exécuter une checklist de non-régression COMPLÈTE après chaque modification.
- **CRITIQUE** : Cet agent doit valider que RIEN n'est cassé après les changements des autres équipes
- **Checklist obligatoire** :
  1. Le wizard filtres fonctionne (3 étapes → affichage prestataires) ✅/❌
  2. Les prestataires s'affichent avec le bon statut (online/busy/offline) ✅/❌
  3. Le clic sur un prestataire ouvre le profil ✅/❌
  4. Le bouton "Réserver" mène au BookingRequest ✅/❌
  5. Le formulaire BookingRequest se soumet (SANS lastName, SANS title) ✅/❌
  6. La transition BookingRequest → CallCheckout fonctionne ✅/❌
  7. Le paiement Stripe fonctionne (carte test `4242 4242 4242 4242`) ✅/❌
  8. Le paiement PayPal fonctionne (sandbox) ✅/❌
  9. La page PaymentSuccess affiche le countdown ✅/❌
  10. Les notifications SMS sont envoyées au provider ✅/❌
  11. L'Outil IA reçoit le sync (même sans title/description) ✅/❌
  12. Les anciens `booking_requests` (avec lastName+title) restent lisibles ✅/❌
  13. L'authentification Google fonctionne (popup + redirect) ✅/❌
  14. Le parcours complet mobile fonctionne (320px → 428px) ✅/❌
  15. Le parcours complet desktop fonctionne (1280px → 1920px) ✅/❌
  16. Les 9 langues affichent les bons textes (surtout FR et EN) ✅/❌
  17. Le `npm run build` compile sans erreur TypeScript ✅/❌
  18. Les Firestore rules ne bloquent pas les nouveaux formulaires ✅/❌
- **Plan de rollback** :
  - Si un P0 est détecté post-merge : `git revert` immédiat
  - Les changements doivent être dans des commits atomiques (1 changement = 1 commit)
  - Le backend NE DOIT PAS être modifié dans le même PR que le frontend
- **Livrable** : Checklist validée + rapport de non-régression

### Agent #50 : Accessibilité (a11y/WCAG) & RTL
**Mission** : Auditer l'accessibilité et le support RTL sur tout le parcours.
- **WCAG 2.2 Level AA** :
  - Contraste des couleurs : `red-600` sur `white` (ratio 4.5:1 minimum pour texte normal)
  - Contraste des boutons CTA (gradient orange sur blanc)
  - `focus-visible` sur TOUS les éléments interactifs (pas juste `:focus`)
  - Navigation clavier complète : Tab/Shift-Tab à travers le wizard, formulaire, paiement
  - Screen reader (VoiceOver iOS, TalkBack Android) : les étapes du wizard sont-elles annoncées ?
  - ARIA labels sur les champs de formulaire, les boutons, les modals
  - `role="alert"` sur les messages d'erreur (pour les screen readers)
  - Les icônes Lucide ont-elles un `aria-label` ou sont-elles décoratives (`aria-hidden`) ?
- **RTL (Arabe)** :
  - La langue arabe (AR) est supportée — le layout se retourne-t-il correctement ?
  - `dir="rtl"` est-il appliqué sur `<html>` quand la langue est arabe ?
  - Les icônes directionnelles (flèches, chevrons) se retournent-elles ?
  - Les padding/margin sont-ils en logical properties (`ps/pe` au lieu de `pl/pr`) ?
  - Le wizard steps progress bar : les étapes vont-elles de droite à gauche en RTL ?
  - La page de paiement Stripe : supporte-t-elle le RTL nativement ?
  - **Test simple** : Changer la langue en arabe et naviguer tout le parcours
- **Browser autofill** :
  - Les champs email ont-ils `autocomplete="email"` ?
  - Les champs téléphone ont-ils `autocomplete="tel"` ?
  - Les champs prénom ont-ils `autocomplete="given-name"` ?
  - Les champs carte Stripe : le `autocomplete` est-il géré par Stripe Elements ?
  - Chrome/Safari autofill : les champs se remplissent-ils correctement ?
  - L'autofill ne casse-t-il pas le style des inputs (background jaune Chrome) ?
- **Livrable** : Rapport a11y WCAG + rapport RTL + rapport autofill

---

## LIVRABLES ATTENDUS PAR ÉQUIPE

### Chaque Directeur (Niveau 1) doit produire :
1. **Rapport de synthèse** avec priorités P0 (bloquant), P1 (important), P2 (nice-to-have)
2. **Liste des fichiers à modifier** avec lignes précises
3. **Estimation d'effort** (S/M/L) pour chaque recommandation
4. **Dépendances inter-équipes** identifiées

### L'Orchestrateur (Agent #0) doit produire :
1. **Rapport final consolidé** — Top 10 des actions à impact maximal
2. **Plan d'action séquentiel** — Ordre d'exécution optimal (dépendances croisées)
3. **Quick wins** — Changements <30 min à haut impact
4. **Refactoring majeur** — Plan pour découper CallCheckout.tsx (4632 lignes)
5. **Chiffrage performance** — Baseline actuelle (Agent #9) vs cibles par page
6. **Rapport non-régression** — Checklist validée par Agent #49 (BLOQUANT pour livraison)
7. **Plan de rollback** — Procédure de retour arrière si un P0 est détecté en production
8. **Matrice de risque** — Pour chaque modification, probabilité de casser × gravité × facilité de rollback

---

## MÉTRIQUES CIBLES (Best Practices 2026)

### Core Web Vitals par page
| Page | LCP cible | TTI cible | CLS cible | FCP cible |
|------|-----------|-----------|-----------|-----------|
| Wizard filtres | <1.5s | <2s | <0.05 | <1s |
| Liste prestataires | <2s | <3s | <0.1 | <1.5s |
| Booking Request | <1.5s | <2s | <0.05 | <1s |
| Page paiement | <2s | <3s | <0.05 | <1.5s |
| Page succès | <1s | <1.5s | <0 | <0.8s |
| Login/Register | <1.5s | <2s | <0.05 | <1s |

### Temps de transition entre pages (PERÇU par l'utilisateur)
| Transition | Cible | Acceptable | Inacceptable |
|------------|-------|------------|--------------|
| Wizard step → step | <100ms | <300ms | >500ms |
| Wizard → Listing prestataires | <500ms | <1s | >2s |
| Clic prestataire → Profil | <300ms | <800ms | >1.5s |
| Profil → Booking Request | <300ms | <800ms | >1.5s |
| Booking → Page paiement | <800ms | <1.5s | **>3s (actuel !)** |
| Clic "Payer" → Page succès | <2s | <4s | >6s |
| Login Google → Redirection | <1.5s | <3s | >5s |

### Accessibilité
| Critère | Cible |
|---------|-------|
| WCAG Level | AA minimum |
| Contraste texte | 4.5:1 minimum |
| Contraste gros texte/boutons | 3:1 minimum |
| Touch targets | 44px min (iOS) / 48px min (Android) |
| Navigation clavier | 100% du parcours |
| Screen reader | Toutes les étapes annoncées |

---

## MODIFICATIONS BACKEND REQUISES (Validation préalable)

### Suppression lastName :
- [ ] `Step1NameScreen.tsx` : retirer champ lastName
- [ ] `MobileBookingContext.tsx` : retirer lastName de STEP_FIELDS et validation
- [ ] `BookingRequest.tsx` : retirer champ lastName du formulaire desktop
- [ ] Vérifier `createAndScheduleCallFunction.ts` : utilise `lastName` avec fallback `''` → OK
- [ ] Vérifier `paymentNotifications.ts` : fallback en place → OK
- [ ] Vérifier `firestore.rules` : lastName non requis → OK

### Suppression title :
- [ ] Supprimer `Step3TitleScreen.tsx` entièrement
- [ ] Renuméroter les étapes dans `MobileBookingWizard.tsx` (6→5 étapes)
- [ ] Retirer title du formulaire desktop `BookingRequest.tsx`
- [ ] Vérifier backend fallback : `title || 'Consultation avocat/expat'` → DÉJÀ EN PLACE
- [ ] Mettre à jour `ProgressBar.tsx` (5 étapes au lieu de 6)
- [ ] Mettre à jour `MobileBookingContext.tsx` (STEP_FIELDS)

### Refonte description :
- [ ] Nouveau wording dans les 9 fichiers i18n (`fr.json`, `en.json`, etc.)
- [ ] Réduire validation minimum 50→30 caractères dans `MobileBookingContext.tsx`
- [ ] Réduire validation dans `BookingRequest.tsx` (desktop)
- [ ] Nouveau placeholder dans `Step4DescriptionScreen.tsx` (devenu Step3)

### Refonte message téléphone :
- [ ] Nouveau texte dans les 9 fichiers i18n
- [ ] Mettre à jour l'objet I18N hardcodé dans `BookingRequest.tsx` (ligne 161)
- [ ] Mettre à jour `Step5PhoneScreen.tsx` (devenu Step4)

---

## INSTRUCTIONS D'EXÉCUTION

### Phase 1 — Baseline (AVANT toute modification)
1. **Agent #9** mesure les métriques actuelles de CHAQUE page (FCP, LCP, TTI, CLS, INP, TTFB)
2. Les baselines sont partagées avec TOUS les autres agents comme référence

### Phase 2 — Audit parallèle
3. **Lancer les 8 directeurs en parallèle**, chacun supervisant ses agents spécialistes
4. **Chaque agent spécialiste** lit les fichiers indiqués et produit son livrable
5. **Les directeurs** consolident les livrables de leur équipe

### Phase 3 — Consolidation & Priorisation
6. **L'orchestrateur** consolide avec le plan d'action priorisé
7. **Agent #49** prépare la checklist de non-régression

### Phase 4 — Validation post-modifications
8. **Agent #9** re-mesure les métriques APRÈS modifications (comparaison baseline)
9. **Agent #49** exécute la checklist de non-régression complète
10. **Agent #50** valide l'accessibilité et le RTL
11. **L'orchestrateur** valide que TOUTES les métriques sont améliorées ou stables (jamais dégradées)

### Format de sortie
- Markdown structuré avec sections P0/P1/P2 par équipe
- Chaque modification DOIT inclure : fichiers touchés, risque de régression, plan de rollback

---

## CONTRAINTES IMPORTANTES

- **Langue** : Toujours communiquer en français
- **Frontend** : Cloudflare Pages (auto-deploy sur push main), PAS Firebase Hosting
- **Backend** : 3 régions Firebase (europe-west1, us-central1, europe-west3)
- **Firestore** : nam7 (Iowa, US) — latence ~100ms depuis EU
- **Design system** : Tailwind CSS, Lucide React icons, rouge/orange palette
- **i18n** : 9 langues (FR/EN/ES/DE/PT/RU/ZH/AR/HI) via react-intl
- **Pas de breaking changes** sur les documents Firestore existants
- **Autofill** : Tous les champs doivent avoir les bons attributs `autocomplete` (email, tel, given-name)
- **RTL** : L'arabe est une langue supportée → le layout DOIT fonctionner en RTL
- **Rollback** : Chaque modification doit être réversible en <5 minutes (commits atomiques)
- **Tests** : Le `npm run build` DOIT compiler sans erreur après chaque modification
- **Ordre des modifications** : Frontend d'abord (sans risque), backend seulement si nécessaire et validé par Agent #49
