# AUDIT GOOGLE ANALYTICS & TAG MANAGER — sos-expat.com — Objectif : 100% Remontee de Donnees

> **Version** : 3.0 — 2026-03-18
> **Probleme** : Donnees partielles + donnees ERRONEES (98% Belgique, beaucoup de "not set"/"non assigned")
> **Corrections deja appliquees** : Measurement ID unifie, Geo-Consent, send_page_view:false, GTM noscript, ga4.ts simplifie
> **Nouveaux problemes** : Geolocalisation faussee (98% Belgique), dimension "non assigned", données manquantes par pays
> **Site** : https://sos-expat.com — SPA React 18 + Vite + Cloudflare Pages
> **Stack Analytics** : GA4 + GTM + Google Ads + Meta Pixel + Firebase Analytics

---

## TABLE DES MATIERES

1. [Contexte & Architecture Existante](#1-contexte--architecture-existante)
2. [Probleme Principal : Zero Donnees](#2-probleme-principal--zero-donnees)
3. [ALERTE : Problemes Critiques Deja Identifies](#3-alerte--problemes-critiques-deja-identifies)
4. [Hierarchie des 60 Agents](#4-hierarchie-des-60-agents)
5. [Phase 0 — Protection & Snapshot](#phase-0--protection--snapshot)
6. [Phase 1 — Audit GA4 Core](#phase-1--audit-ga4-core)
7. [Phase 2 — Audit Google Tag Manager](#phase-2--audit-google-tag-manager)
8. [Phase 3 — Audit Consent Mode V2](#phase-3--audit-consent-mode-v2--gdpr)
9. [Phase 4 — Audit Google Ads Conversions](#phase-4--audit-google-ads-conversions)
10. [Phase 5 — Audit Meta Pixel](#phase-5--audit-meta-pixel--facebook)
11. [Phase 6 — Audit Firebase Analytics](#phase-6--audit-firebase-analytics)
12. [Phase 7 — Audit SPA Route Tracking](#phase-7--audit-spa-route-tracking--page-views)
13. [Phase 8 — Audit Events & Conversions](#phase-8--audit-events--conversions-custom)
14. [Phase 9 — Audit CSP, Headers & Blocages Reseau](#phase-9--audit-csp-headers--blocages-reseau)
15. [Phase 10 — Audit Cloudflare & Dynamic Rendering](#phase-10--audit-cloudflare--dynamic-rendering)
16. [Phase 11 — Audit Debug & Diagnostics](#phase-11--audit-debug--diagnostics)
17. [Phase 12 — Cross-Checks & Tests de Validation](#phase-12--cross-checks--tests-de-validation)
18. [Phase 13 — Audit Server-Side & Backend Tracking](#phase-13--audit-server-side--backend-tracking)
19. [Phase 14 — Audit Sentry & Error Tracking](#phase-14--audit-sentry--error-tracking)
20. [Phase 15 — Audit Environnement Dev vs Prod](#phase-15--audit-environnement-dev-vs-prod)
21. [Phase 16 — Cross-Checks & Tests de Validation](#phase-16--cross-checks--tests-de-validation)
22. [Phase 17 — Plan d'Action & Deploiement](#phase-17--plan-daction--deploiement)
23. [Phase 18 — Audit International & Maximisation 197 pays × 9 langues](#phase-18--audit-international--maximisation-des-remontees-197-pays--9-langues)
24. [Phase 19 — Monitoring Analytics Continu](#phase-19--audit-tracking-temps-reel--monitoring)
25. [Phase 20 — Implementation Tracking Manquant](#phase-20--implementation-tracking-manquant)
26. [Phase 21 — Correction Zero Temps Reel (PRIORITE ABSOLUE)](#phase-21--correction-zero-temps-reel-priorite-absolue)
27. [Phase 22 — Audit Donnees Erronees (98% Belgique, Non Assigned)](#phase-22--audit-donnees-erronees-98-belgique-non-assigned)
28. [Phase 23 — Tests E2E Analytics Bout en Bout](#phase-23--tests-e2e-analytics-bout-en-bout)
29. [Regles Absolues](#regles-absolues)

---

## 1. CONTEXTE & ARCHITECTURE EXISTANTE

### Stack Analytics Complet

| Outil | ID | Fichier Config | Role |
|-------|-----|---------------|------|
| GA4 (index.html) | `G-CTVDEL29CP` | `sos/index.html` L95-155 | Tracking principal (hardcode) |
| GA4 (env var) | `G-CTVDEL29CP` | `sos/.env.production` | ID via GTM/code React (UNIFIE) |
| GTM | `GTM-P53H3RLF` | `sos/.env.production` + `sos/src/utils/gtm.ts` | Container Tag Manager |
| Google Ads | `AW-10842996788` | `sos/.env.production` + `sos/src/utils/googleAds.ts` | Conversions publicitaires |
| Meta Pixel | `2204016713738311` | `sos/index.html` L147-204 + `sos/src/utils/metaPixel.ts` | Facebook/Instagram tracking |
| Firebase Analytics | (auto via Firebase project) | `sos/src/config/firebase.ts` L338-359 | Fallback analytics |

### Flux de Donnees Attendu

```
Utilisateur arrive sur le site
    │
    ├─ index.html charge :
    │   ├─ Google Consent Mode V2 (default: TOUT denied sauf security_storage)
    │   ├─ GA4 script async (googletagmanager.com/gtag/js?id=G-CTVDEL29CP)
    │   ├─ gtag('config', 'G-CTVDEL29CP', {anonymize_ip: true, send_page_view: false})
    │   └─ Meta Pixel (differe via requestIdleCallback)
    │
    ├─ React monte :
    │   ├─ GTM initialise (gtm.ts → charge gtm.js?id=GTM-P53H3RLF)
    │   ├─ Firebase Analytics initialise (getAnalytics)
    │   ├─ Google Ads tracking initialise (googleAds.ts)
    │   ├─ CookieBanner s'affiche (si pas de consentement precedent)
    │   └─ MetaPageViewTracker ecoute les changements de route
    │
    ├─ Utilisateur donne son consentement :
    │   ├─ gtag('consent', 'update', {analytics_storage: 'granted', ...})
    │   ├─ updateGA4Consent()
    │   ├─ updateMetaPixelNativeConsent()
    │   └─ updateGoogleAdsConsent()
    │
    └─ Navigation SPA :
        ├─ MetaPageViewTracker → trackMetaPageView()
        ├─ gtag('event', 'page_view', ...) (SI implemente)
        └─ Events custom (trackEvent, logAnalyticsEvent)
```

### Fichiers Cles

| Fichier | Chemin | Role | Lignes |
|---------|--------|------|--------|
| **index.html** | `sos/index.html` | GA4 inline + Consent Mode + Meta Pixel | L95-204 |
| **gtm.ts** | `sos/src/utils/gtm.ts` | GTM init + pushEvent + dataLayer | 278 lignes |
| **ga4.ts** | `sos/src/utils/ga4.ts` | trackEvent + setUserProperties + diagnostic | ~530 lignes |
| **googleAds.ts** | `sos/src/utils/googleAds.ts` | Google Ads conversions + GCLID | ~740 lignes |
| **metaPixel.ts** | `sos/src/utils/metaPixel.ts` | Meta Pixel events (10+ events) | ~630 lignes |
| **firebase.ts** | `sos/src/config/firebase.ts` | Firebase Analytics init | L338-359 |
| **analytics.ts** | `sos/src/services/analytics.ts` | Service custom (Firestore) | Service complet |
| **CookieBanner.tsx** | `sos/src/components/common/CookieBanner.tsx` | Consent UI + update flow | 437 lignes |
| **MetaPageViewTracker.tsx** | `sos/src/components/common/MetaPageViewTracker.tsx` | SPA route tracking Meta | Composant |
| **.env.production** | `sos/.env.production` | IDs GA4/GTM/Ads | L39-48 |
| **_headers** | `sos/public/_headers` | CSP (autorise GA/GTM domains) | Complet |
| **robots.txt** | `sos/public/robots.txt` | Ne bloque PAS les analytics | Verifie |

### Ce qui est DEJA implemente (auditer, pas refaire)

**Consent Mode V2** (index.html L95-140) :
- Default : TOUT denied sauf `security_storage`
- `wait_for_update: 500` (attend 500ms le consentement)
- `url_passthrough: true` (attribution quand cookies bloques)
- `ads_data_redaction: true` (RGPD)
- Restore depuis `localStorage.cookie_preferences` au chargement
- 6 categories : ad_storage, ad_user_data, ad_personalization, analytics_storage, functionality_storage, personalization_storage

**GA4 Config** (index.html L142-145) :
- Script async : `googletagmanager.com/gtag/js?id=G-CTVDEL29CP`
- Config : `anonymize_ip: true`, `send_page_view: false` (CORRIGE — PageViewTracker gere les page_view), `cookie_domain: 'auto'`

**GTM** (gtm.ts) :
- Container : `GTM-P53H3RLF`
- `pushEvent(eventName, params)` → `dataLayer.push()`
- Fallback direct GA4 si GTM ne charge pas

**Cookie Banner** (CookieBanner.tsx) :
- 4 categories : Essential (force), Analytics, Performance, Marketing
- Stocke dans `localStorage` : `cookie_preferences` (JSON) + `cookie_consent` ("accepted")
- Appelle `updateConsentFromPreferences()` → `gtag('consent', 'update', ...)`
- Appelle `updateGA4Consent()`, `updateMetaPixelNativeConsent()`, `updateGoogleAdsConsent()`

**Google Ads** (googleAds.ts) :
- Conversion ID : `AW-10842996788`
- 4 labels : Purchase, Lead, Signup, Checkout
- GCLID capture depuis URL → sessionStorage → cookie `_gcl_aw`
- 8 fonctions de tracking (purchase, lead, checkout, signup, search, viewContent, addPaymentInfo, custom)

**Meta Pixel** (metaPixel.ts) :
- Pixel ID : `2204016713738311`
- 12 fonctions de tracking
- Advanced matching avec SHA256
- **TRACKING SANS CONSENTEMENT** (explicite dans le code)
- Deferred loading dans index.html (requestIdleCallback)
- noscript fallback (img pixel)

**Firebase Analytics** (firebase.ts) :
- `getAnalytics(app)` avec `isSupported()` check
- `logAnalyticsEvent(eventName, params)` export
- Browser-only (SSR-safe)

**Diagnostics** (exposes sur window) :
- `window.ga4Diagnostic()` — statut GA4
- `window.gtmDiagnostic()` — statut GTM
- `window.googleAdsDiagnostic()` — statut Ads

**Analytics Service Custom** (analytics.ts) :
- Ecrit dans Firestore : `analytics_language_mismatches`, `analytics_user_actions`, `analytics_conversions`, `analytics_errors`, `analytics_performance`, `analytics_counters`

**GA4 Page View Tracker SPA** (App.tsx L1063) :
- Composant `PageViewTracker` monte dans `<LocaleRouter>` → ecoute les changements de route
- Appelle `trackEvent('page_view')` a chaque navigation
- **CORRIGE** : `send_page_view: false` dans index.html → PageViewTracker gere seul les page_view (pas de double)

**Meta Page View Tracker SPA** (App.tsx L1065) :
- Composant `MetaPageViewTracker` monte dans `<LocaleRouter>`
- Appelle `trackMetaPageView()` avec deduplication via eventID

**Cookie Banner Mounting** (Layout.tsx L241-246) :
- Monte dans le composant Layout : `{!isWizardOpen && !hideBannersOnRoute && <CookieBanner ... />}`
- CONDITIONNEL : ne s'affiche PAS pendant les wizards ni sur certaines routes
- zIndex: 100, callback `onPreferencesSaved` pour masquer apres acceptation

**Meta Conversions API Server-Side (CAPI)** (`firebase/functions/src/metaConversionsApi.ts`) :
- Tracking server-side : Purchase, Lead, InitiateCheckout, CompleteRegistration
- Advanced Matching avec SHA256
- Deduplication via eventID unique (meme ID que le Pixel cote client)
- Contourne les ad-blockers (server-to-server)

**Sentry Error Tracking** (`sos/src/config/sentry.ts` + `main.tsx L13`) :
- Browser tracing integration
- Session Replay : 10% normal, 100% sur erreurs
- Filtre les erreurs Firebase transitoires
- Prod : 10% trace sampling, Dev : 100%
- `setUserContext()` pour identifier les utilisateurs

**GTM Init dans React** (`main.tsx L17`) :
- GTM initialise dans main.tsx au demarrage de l'app React
- Partage le dataLayer avec GA4 inline

**Google Ads Call Sites** (verifies dans le code) :
- `trackGoogleAdsSignUp` : 8 formulaires d'inscription (Client, Lawyer, Expat, Chatter, Blogger, Influencer, GroupAdmin, RegisterClient)
- `trackGoogleAdsLead` : BookingRequest.tsx (2 endroits)
- `trackGoogleAdsBeginCheckout` : BookingRequest.tsx (2 endroits)
- `trackGoogleAdsPurchase` : PaymentSuccess.tsx

**Meta Pixel Call Sites** (verifies dans le code) :
- `trackMetaLead` : BookingRequest (2), BloggerDashboard, GroupAdminDashboard, InfluencerDashboard, useMetaPixelTracking
- `trackMetaPurchase` : PaymentSuccess, useMetaTracking
- `trackMetaInitiateCheckout` : BookingRequest
- `trackMetaViewContent` : BloggerDashboard, GroupAdminDashboard, InfluencerDashboard

**Cloudflare Worker** (`sos/cloudflare-worker/worker.js` + `wrangler.toml`) :
- Worker de bot detection & SSR redirect
- Observability activee (invocation_logs: true)
- PAS de Cloudflare Web Analytics beacon
- PAS de proxy analytics

**CSP Headers** (_headers) :
- Autorise : `googletagmanager.com`, `google-analytics.com`, `googleads.g.doubleclick.net`, `googleadservices.com`, `connect.facebook.net`, `*.facebook.com`, `*.stripe.com`
- `script-src 'unsafe-inline'` autorise les scripts inline

---

## 2. DIAGNOSTIC CONFIRME & PROBLEMES

### RESOLUTION PARTIELLE EFFECTUEE (2026-03-17)

**Measurement ID corrige** : `.env` et `.env.production` changés de `G-XZTJK0L3RK` → `G-CTVDEL29CP`
- L'ID correct est `G-CTVDEL29CP` (property ID 527471429)
- index.html avait deja le bon ID → seul le code React (GTM, ga4.ts, events) envoyait au mauvais ID

**Resultats attendus apres deploy** :
- Les hits inline (page_view initial) arrivaient deja → c'est pour ca que "quelques infos" etaient visibles
- Les events React (conversions, SPA page views, user properties) allaient au mauvais ID → zero donnees
- Apres correction : TOUT devrait arriver dans la meme property

### DONNEES MANQUANTES DANS GA4 (a investiguer)

Le user rapporte que meme avec quelques donnees, il manque :
- **Pays des visiteurs** → Geolocalisation
- **Donnees demographiques** → Age, genre, interets
- **Donnees de comportement detaillees**

**Causes possibles** :
| Donnee manquante | Cause probable | Solution |
|-----------------|---------------|----------|
| Pays | Consent Mode denied → pas de geolocalisation | Activer modelisation ou obtenir consentement |
| Pays | Google Signals non active | Admin → Data Collection → Google Signals → ON |
| Demographics | Google Signals non active | Admin → Data Collection → Google Signals → ON |
| Demographics | Pas assez de trafic (seuil minimum Google) | Attendre plus de trafic |
| Comportement | analytics_storage denied → sessions anonymes | Activer modelisation consent |
| Events | Mauvais measurement ID (CORRIGE) | Deployer la correction |
| Conversions | Mauvais measurement ID (CORRIGE) | Deployer la correction |
| Pages/session | Double page_view fausse les metriques | Corriger le double-tracking |

### CONFIGURATION GA4 REQUISE (dans la console Google Analytics)

**Ces reglages ne sont PAS dans le code — ils doivent etre faits manuellement dans analytics.google.com :**

| Reglage | Ou | Action |
|---------|-----|--------|
| Google Signals | Admin → Data Collection → Google Signals | **ACTIVER** → donne pays, demographics, cross-device |
| Consent Mode Modeling | Admin → Data Collection → Consent Mode | **ACTIVER** → modelise les donnees des users sans consent |
| Data Retention | Admin → Data Settings → Data Retention | Mettre a **14 mois** (pas 2 mois par defaut) |
| Enhanced Measurement | Admin → Data Streams → Web Stream | **ACTIVER** : scrolls, outbound clicks, site search, video, file downloads |
| Internal Traffic Filter | Admin → Data Settings → Data Filters | Verifier qu'il n'y a PAS un filtre qui exclut tout |
| Reporting Identity | Admin → Data Display → Reporting Identity | Choisir "Blended" pour plus de donnees |
| Currency | Admin → Property Settings | Mettre **EUR** |
| Timezone | Admin → Property Settings | Mettre **Paris (GMT+1/+2)** |
| Attribution | Admin → Attribution Settings | Choisir "Data-driven" |
| Audiences | Admin → Data Display → Audiences | Creer : All Users, Converters, par Pays |
| Conversions | Admin → Events → Mark as conversion | Marquer : purchase, generate_lead, sign_up, begin_checkout |

---

### DIAGNOSTIC CONFIRME : POURQUOI ZERO DONNEES EN TEMPS REEL

**Le probleme est desormais entierement compris. Voici la chaine causale EXACTE :**

```
VISITEUR ARRIVE SUR sos-expat.com
    │
    ├─ index.html L105 : gtag('consent', 'default', { analytics_storage: 'denied' })
    │   → GA4 est en mode BLOQUE par defaut
    │
    ├─ index.html L118-133 : tente de restaurer le consent depuis localStorage
    │   → PREMIERE VISITE : localStorage VIDE → consent reste 'denied'
    │   → VISITE SUIVANTE (si accepte avant) : consent restaure → 'granted' ✅
    │
    ├─ index.html L137-145 : GA4 charge et envoie le premier hit
    │   → MAIS analytics_storage = 'denied' → GA4 envoie un PING cookieless
    │   → Ce ping N'APPARAIT PAS dans les rapports GA4 standard
    │   → Ce ping N'APPARAIT PAS dans le Temps Reel GA4
    │   → SAUF si la modelisation du consentement est activee (elle ne l'est probablement PAS)
    │
    ├─ React monte → CookieBanner s'affiche
    │   → L'utilisateur voit le banner
    │   → S'il ACCEPTE : gtag('consent', 'update', { analytics_storage: 'granted' })
    │       → GA4 commence a envoyer des vrais hits → VISIBLE en Temps Reel ✅
    │   → S'il IGNORE ou REFUSE : analytics_storage reste 'denied'
    │       → ZERO donnees dans GA4 ❌
    │
    └─ RESULTAT :
        - Visiteurs qui acceptent les cookies → VISIBLES en temps reel
        - Visiteurs qui ignorent/refusent → INVISIBLES
        - En Europe : ~60-70% refusent → ~60-70% du trafic INVISIBLE
        - PREMIERE visite sans clic sur le banner → 100% INVISIBLE
```

**CONFIRMATION SUPPLEMENTAIRE :**
- `ga4.ts L72` : `hasAnalyticsConsent()` retourne `false` par defaut → tous les events React sont aussi bloques
- `ga4.ts L85-91` : un warning est emis si le script GA4 n'a pas execute → mais c'est avale par la console
- Le Meta Pixel, LUI, fonctionne SANS consentement (`metaPixel.ts L4 : "TRACKING SANS CONSENTEMENT"`)
- C'est pour ca que Meta Events Manager a peut-etre des donnees mais PAS GA4

**LES 5 RAISONS DU ZERO TEMPS REEL (cumulatives) :**

| # | Raison | Impact | Corrigible ? |
|---|--------|--------|-------------|
| 1 | **Consent Mode denied par defaut** | 100% du trafic premiere visite = invisible | OUI : activer modelisation GA4 |
| 2 | **Measurement ID etait different** dans .env (CORRIGE) | Events React allaient au mauvais ID | ✅ CORRIGE |
| 3 | **Cookie Banner ignore** par les visiteurs | ~60-70% refusent en EU | OUI : geo-consent (grant hors EU) |
| 4 | **Modelisation consentement pas activee** dans GA4 | Pings cookieless sont perdus | OUI : activer dans console GA4 |
| 5 | **ga4.ts double-check consent** dans le code React | Events bloques meme si gtag existe | OUI : laisser Consent Mode gerer |

---

## 2B. PROBLEME INITIAL : ZERO DONNEES (partiellement resolu)

**Symptomes** :
- Google Analytics 4 : aucune donnee remontee
- Google Tag Manager : aucun evenement visible
- Pas de page views, pas d'events, pas de conversions

**Causes possibles (a investiguer dans l'ordre)** :

| # | Cause Possible | Probabilite | Phase |
|---|---------------|-------------|-------|
| 1 | **IDs GA4 differents** entre index.html et .env | **TRES HAUTE** | Phase 1 |
| 2 | **Consent Mode bloque tout** par defaut (denied) et banner jamais affichee ou buguee | **HAUTE** | Phase 3 |
| 3 | **GTM ecrase GA4** ou conflit entre GA4 inline et GTM GA4 | **HAUTE** | Phase 2 |
| 4 | **CSP ou ad-blocker** bloque les requetes reseau | **MOYENNE** | Phase 9 |
| 5 | **SPA routing** ne re-envoie pas les page_view | **MOYENNE** | Phase 7 |
| 6 | **Cloudflare Workers** intercepte/modifie les requetes analytics | **MOYENNE** | Phase 10 |
| 7 | **Erreurs JS** empechent l'execution des scripts analytics | **MOYENNE** | Phase 11 |
| 8 | **Cookie banner** ne s'affiche pas ou ne sauvegarde pas le consentement | **HAUTE** | Phase 3 |
| 9 | **GA4 property mal configuree** dans la console Google Analytics | **MOYENNE** | Phase 1 |
| 10 | **Data stream** non cree ou mal configure dans GA4 | **MOYENNE** | Phase 1 |

---

## 3. ALERTE : PROBLEMES CRITIQUES DEJA IDENTIFIES

### PROBLEME #1 — MEASUREMENT ID MISMATCH — ✅ CORRIGE

```
AVANT : index.html = G-CTVDEL29CP, .env = G-XZTJK0L3RK → SPLIT des donnees
APRES : TOUT unifie sur G-CTVDEL29CP (property 527471429)
```

**Status** : ✅ CORRIGE dans .env et .env.production. A VERIFIER que le deploy a ete fait.

**A VERIFIER** : Le container GTM (GTM-P53H3RLF) utilise-t-il aussi `G-CTVDEL29CP` ? → Checker dans tagmanager.google.com

### PROBLEME #2 — CONSENT MODE — ✅ PARTIELLEMENT CORRIGE (Geo-Consent)

```
AVANT : analytics_storage: 'denied' pour TOUT le monde → zero donnees sans clic
APRES : Geo-Consent implemente — 'granted' par defaut HORS EU/BR (via timezone detection)
```

**Status** : ✅ Geo-Consent implemente dans index.html. A VERIFIER :
- [ ] La modelisation du consentement est-elle activee dans GA4 console ?
- [ ] Google Signals est-il active ?
- [ ] Le Cookie Banner s'affiche-t-il toujours pour les visiteurs EU ?

### PROBLEME #3 — DOUBLE CHARGEMENT GA4 — A VERIFIER

GA4 peut etre charge depuis :
1. **index.html** : `gtag('config', 'G-CTVDEL29CP')` avec `send_page_view: false`
2. **GTM** : Le container GTM-P53H3RLF contient-il AUSSI une balise GA4 Configuration ?
3. **ga4.ts** : `configureGA4()` fait un second `gtag('config', ...)` quand React monte

**A VERIFIER** : Ouvrir GTM Preview et compter les balises GA4 qui fire. Il ne doit y en avoir qu'UNE.

### PROBLEME #4 — DOUBLE PAGE_VIEW — ✅ CORRIGE

```
AVANT : send_page_view: true + PageViewTracker → DOUBLE page_view
APRES : send_page_view: false → seul PageViewTracker envoie les page_view
```

**Status** : ✅ CORRIGE. A VERIFIER : un seul hit page_view dans Network tab au chargement.

### PROBLEME #5 — GTM NOSCRIPT — ✅ CORRIGE

```
AVANT : Absent
APRES : <noscript><iframe src="...GTM-P53H3RLF..."></iframe></noscript> apres <body>
```

### PROBLEME #6 — META PIXEL SANS CONSENTEMENT (RGPD) — A CORRIGER

`metaPixel.ts` ligne 4 : "TRACKING SANS CONSENTEMENT"
Le Meta Pixel envoie des donnees SANS attendre le consentement marketing.

**Impact** : Violation RGPD potentielle en UE (amende jusqu'a 4% du CA mondial).
**Status** : ❌ NON CORRIGE — a traiter dans cet audit.

---

## 4. HIERARCHIE DES 40 AGENTS

### Niveau 0 — Chef d'Orchestre (1 agent)

| # | Agent | Role |
|---|-------|------|
| B0 | **Orchestrateur Analytics** | Coordonne les 6 directeurs, consolide, produit le plan final |

### Niveau 1 — Directeurs de Domaine (6 agents)

| # | Agent | Domaine | Agents supervises |
|---|-------|---------|-------------------|
| B1 | **Directeur GA4 & GTM** | GA4 core, GTM, measurement IDs, data streams | B7-B14 |
| B2 | **Directeur Consent & GDPR** | Consent Mode V2, Cookie Banner, impact sur les donnees | B15-B19 |
| B3 | **Directeur Ads & Conversions** | Google Ads, Meta Pixel, conversions, GCLID | B20-B25 |
| B4 | **Directeur SPA & Events** | Route tracking, page views, events custom, Firebase | B26-B31 |
| B5 | **Directeur Reseau & Securite** | CSP, headers, ad-blockers, Cloudflare, service workers | B32-B37 |
| B6 | **Directeur Debug & Validation** | Diagnostics, tests temps reel, cross-checks | B38-B45 |

### Niveau 2 — Agents Specialises (33 agents)

#### Sous B1 : GA4 & GTM (8 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| B7 | **Audit Measurement IDs** | VERIFIER que le conflit G-CTVDEL29CP vs G-XZTJK0L3RK est bien resolu partout. Verifier DANS LE CONTAINER GTM (tagmanager.google.com) que la balise GA4 utilise G-CTVDEL29CP. Verifier que la property G-XZTJK0L3RK ne recoit plus de hits. Verifier le data stream dans GA4 console |
| B8 | **Audit GA4 Inline (index.html)** | Verifier le script GA4 dans index.html : (a) Le script async charge-t-il correctement ? (b) `gtag('config', 'G-CTVDEL29CP')` est-il execute ? (c) `send_page_view: false` est bien configure (PageViewTracker gere) ? (d) Le Geo-Consent fonctionne-t-il (timezone detection) ? (e) Tester avec Network tab : requete vers `google-analytics.com/g/collect` ? (f) Verifier le parametre `gcs=` dans les hits (G100=denied, G111=granted) |
| B9 | **Audit GA4 Property Console** | Dans la console Google Analytics (analytics.google.com) : (a) La property existe-t-elle ? (b) Le data stream web est-il cree ? (c) L'URL du data stream est-elle `sos-expat.com` (pas localhost ou autre) ? (d) Enhanced measurement est-il active ? (e) Y a-t-il des filtres qui excluent du trafic ? (f) Le fuseau horaire est-il correct ? (g) La retention des donnees est-elle > 2 mois ? |
| B10 | **Audit GTM Container** | Dans Google Tag Manager (tagmanager.google.com) : (a) Le container GTM-P53H3RLF existe-t-il ? (b) Est-il PUBLIE (pas en brouillon) ? (c) Quelles balises contient-il ? (d) Y a-t-il une balise GA4 Configuration ? Avec quel measurement ID ? (e) Y a-t-il des triggers ? (f) Le container a-t-il ete publie recemment ? |
| B11 | **Audit GTM Code (gtm.ts)** | Verifier `sos/src/utils/gtm.ts` : (a) Le script GTM est-il charge dynamiquement ? (b) A quel moment du cycle React ? (c) Est-il conditionne au consentement ? (d) `pushEvent()` ecrit-il dans `dataLayer` ? (e) Le fallback direct GA4 fonctionne-t-il ? (f) Y a-t-il des erreurs JS qui empechent le chargement ? |
| B12 | **Audit Double-Tag GA4** | Verifier s'il y a un CONFLIT entre : (a) GA4 charge inline dans index.html (G-CTVDEL29CP), (b) GA4 charge via GTM (doit aussi etre G-CTVDEL29CP), (c) GA4 configure via ga4.ts (second gtag config). Compter les gtag('config') dans le dataLayer — il ne doit y en avoir qu'UN par page. Si GTM a sa propre balise GA4 Configuration → la configurer pour NE PAS envoyer de page_view (index.html le gere) |
| B13 | **Audit dataLayer** | Verifier `window.dataLayer` : (a) Est-il initialise avant GTM ? (b) Contient-il les bons evenements ? (c) Le consent default est-il pousse en premier ? (d) Y a-t-il des evenements bloques ou perdus ? (e) Tester en temps reel : `console.log(window.dataLayer)` → que contient-il ? |
| B14 | **Audit ga4.ts** | Verifier `sos/src/utils/ga4.ts` : (a) `trackEvent()` appelle-t-il `window.gtag()` ? (b) `window.gtag` est-il defini au moment de l'appel ? (c) `setUserProperties()` fonctionne-t-il ? (d) `setUserId()` fonctionne-t-il ? (e) `ga4Diagnostic()` que retourne-t-il en prod ? |

#### Sous B2 : Consent & GDPR (5 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| B15 | **Audit Consent Default** | Verifier l'initialisation Consent Mode V2 dans index.html L95-135 : (a) Le default est TOUT `denied` sauf `security_storage` — est-ce correct ? (b) `wait_for_update: 500` — GA4 attend-il 500ms le consentement ? (c) Si pas de consentement apres 500ms, que se passe-t-il ? (d) GA4 envoie-t-il des hits en mode "denied" ? (e) Ces hits sont-ils visibles dans GA4 ? → En Consent Mode V2 avec analytics_storage denied, GA4 envoie des pings sans cookies (modelisation) mais ils NE SONT PAS visibles dans les rapports standard sauf si la modelisation est activee |
| B16 | **Audit Cookie Banner** | Verifier `CookieBanner.tsx` : (a) Le composant est-il RENDU dans l'arbre React ? (dans App.tsx ou layout ?) (b) S'affiche-t-il si `cookie_consent` n'est pas dans localStorage ? (c) Le bouton "Accepter" appelle-t-il `savePreferences()` ? (d) `savePreferences()` appelle-t-il `gtag('consent', 'update', ...)` avec `analytics_storage: 'granted'` ? (e) Le consentement est-il PERSISTE dans localStorage ? (f) Au rechargement, le consentement est-il RESTAURE (le script inline dans index.html le fait-il ?) |
| B17 | **Audit Restauration Consentement** | Verifier le script de restauration dans index.html L120-135 : (a) Lit-il `localStorage.cookie_preferences` ? (b) Parse-t-il le JSON correctement ? (c) Appelle-t-il `gtag('consent', 'update', ...)` AVANT le `gtag('config', ...)` ? (d) L'ordre d'execution est-il : consent default → restore → config ? (e) Si le restore echoue (try/catch silencieux), l'utilisateur reste en denied PERMANENT |
| B18 | **Audit Impact Consent sur Donnees** | Verifier le comportement GA4 selon le statut du consentement : (a) analytics_storage = denied : quelles donnees GA4 collecte-t-il ? (cookieless pings, pas de session, pas de user) (b) analytics_storage = granted : donnees completes avec cookies (c) La modelisation du consentement est-elle activee dans GA4 ? (Settings → Data Collection → Consent Mode Modeling) (d) Si pas activee : les hits en mode denied sont PERDUS |
| B19 | **Audit Timing Consent** | Verifier la chronologie precise : (a) Le consent default est-il execute AVANT le chargement du script GA4 ? (OBLIGATOIRE) (b) Le script GA4 async est-il charge APRES le consent ? (c) Le Cookie Banner React est-il rendu AVANT que GA4 envoie le premier hit ? (d) Si le banner est lazy-loaded, le consentement arrive-t-il TROP TARD ? (GA4 a deja envoie un hit en mode denied) |

#### Sous B3 : Ads & Conversions (6 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| B20 | **Audit Google Ads Setup** | Verifier `googleAds.ts` : (a) Le script Google Ads est-il charge ? (b) Comment ? Via GTM ou directement ? (c) Le conversion ID `AW-10842996788` est-il correct (verifier dans Google Ads console) ? (d) Les 4 labels de conversion sont-ils corrects ? (e) Le remarketing tag est-il present ? |
| B21 | **Audit GCLID Tracking** | Verifier la capture GCLID dans `googleAds.ts` : (a) Le parametre `gclid` est-il capture depuis l'URL ? (b) Est-il stocke dans sessionStorage ? (c) Est-il envoye avec les conversions ? (d) La validation 90 jours fonctionne-t-elle ? (e) Le cookie `_gcl_aw` est-il cree ? |
| B22 | **Audit Meta Pixel** | Verifier `metaPixel.ts` + index.html : (a) Le Pixel ID `2204016713738311` est-il correct (verifier dans Meta Events Manager) ? (b) L'init dans index.html fonctionne-t-elle (requestIdleCallback) ? (c) Le noscript fallback est-il present ? (d) `fbq('track', 'PageView')` est-il execute au chargement ? (e) Advanced matching fonctionne-t-il ? |
| B23 | **Audit Meta Pixel Consent** | Le code indique explicitement "TRACKING SANS CONSENTEMENT" : (a) Est-ce un choix volontaire ? (b) Est-ce legal en UE ? (RGPD impose le consentement pour Meta Pixel) (c) Si le consentement est refuse, Meta Pixel continue-t-il ? (d) Proposer : conditionner Meta Pixel au consentement marketing |
| B24 | **Audit Conversions E-commerce** | Verifier le tracking des conversions business : (a) `trackGoogleAdsPurchase()` — est-il appele apres un paiement reussi ? Sur quelle page ? (b) `trackMetaPurchase()` — meme question (c) `trackGoogleAdsLead()` — est-il appele apres une demande de booking ? (d) `trackMetaLead()` — meme question (e) Les valeurs de conversion sont-elles correctes (montant, devise EUR) ? |
| B25 | **Audit Advanced Matching Meta** | Verifier le hashing SHA256 dans metaPixel.ts : (a) Les donnees utilisateur sont-elles hashees avant envoi ? (b) Quelles donnees sont envoyees (email, phone, name) ? (c) Le hash est-il SHA256 standard (pas un custom) ? (d) Les donnees sont-elles envoyees avec chaque evenement ? |

#### Sous B4 : SPA & Events (6 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| B26 | **Audit Page View SPA** | CORRIGE : `send_page_view: false` dans index.html, PageViewTracker (App.tsx L1063) gere les page_view SPA. VERIFIER : (a) PageViewTracker envoie-t-il bien `page_view` a chaque navigation ? (b) Un seul hit page_view par navigation dans Network tab ? (c) Les parametres page_location, page_title sont-ils corrects ? (d) Le Geo-Consent (analytics_storage:granted hors EU) permet-il l'envoi sans clic banner ? (e) GTM n'envoie-t-il PAS un second page_view (trigger History Change) ? |
| B27 | **Audit MetaPageViewTracker** | Verifier `MetaPageViewTracker.tsx` : (a) Ecoute-t-il `location.pathname + location.search` via `useLocation()` ? (b) Se declenche-t-il a chaque changement de route ? (c) Appelle-t-il `trackMetaPageView()` — OK pour Meta (d) Appelle-t-il AUSSI une fonction GA4 pour le page_view ? → Probablement NON → c'est un probleme (e) Y a-t-il un composant equivalent pour GA4 ? |
| B28 | **Audit Events Custom** | Lister TOUS les endroits du code ou `trackEvent()` (ga4.ts) est appele : (a) Quels evenements sont trackes ? (b) Quels parametres sont envoyes ? (c) Les evenements correspondent-ils a des evenements GA4 standard ou custom ? (d) Les evenements sont-ils conditionnes au consentement ? |
| B29 | **Audit Firebase Analytics** | Verifier `firebase.ts` L338-359 : (a) `getAnalytics(app)` s'execute-t-il sans erreur ? (b) `isSupported()` retourne-t-il `true` en prod ? (c) `logAnalyticsEvent()` est-il appele quelque part dans le code ? (d) Firebase Analytics est-il un fallback ou un complement de GA4 ? (e) Les donnees Firebase Analytics apparaissent-elles dans la console Firebase ? |
| B30 | **Audit Analytics Service Custom** | Verifier `sos/src/services/analytics.ts` : (a) Ecrit-il dans Firestore ? (b) Les collections `analytics_*` existent-elles en prod ? (c) Y a-t-il des donnees dedans ? (d) Ce service est-il un remplacant de GA4 ou un complement ? (e) Les erreurs sont-elles loggees ? |
| B31 | **Audit User Properties** | Verifier `setUserProperties()` et `setUserId()` dans ga4.ts : (a) Quand sont-ils appeles ? (Apres login ?) (b) Quelles proprietes sont definies ? (c) `window.gtag` est-il defini au moment de l'appel ? (d) Les user properties apparaissent-elles dans GA4 (User Explorer) ? |

#### Sous B5 : Reseau & Securite (6 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| B32 | **Audit CSP Headers** | Verifier `_headers` : (a) `script-src` autorise-t-il `https://www.googletagmanager.com` ET `https://www.google-analytics.com` ? (b) `connect-src` autorise-t-il `https://*.google-analytics.com` ? (c) `img-src` autorise-t-il `https://www.google-analytics.com` (pour le pixel de suivi) ? (d) `frame-src` autorise-t-il `https://www.googletagmanager.com` ? (e) Y a-t-il un `report-uri` qui pourrait montrer des violations CSP ? |
| B33 | **Audit Requetes Reseau** | Avec les DevTools (Network tab) sur sos-expat.com : (a) Y a-t-il des requetes vers `google-analytics.com/g/collect` ? (b) Y a-t-il des requetes vers `googletagmanager.com/gtm.js` ? (c) Quels sont les codes HTTP retournes ? (200, 204, blocked ?) (d) Les requetes sont-elles envoyees AVEC les parametres attendus (measurement_id, client_id, session_id) ? (e) Y a-t-il des erreurs dans la console ? |
| B34 | **Audit Ad-Blockers** | Les ad-blockers bloquent toutes les requetes GA/GTM : (a) Tester avec uBlock Origin actif : les requetes sont-elles bloquees ? (b) Tester avec Brave browser (bloque par defaut) (c) Quel pourcentage d'utilisateurs utilise un ad-blocker ? (≈30-40% en Europe) (d) Proposer : analytics server-side proxy via Cloudflare Worker (e) Proposer : Firebase Analytics comme fallback (non bloque) |
| B35 | **Audit Cloudflare Workers** | Verifier si un Cloudflare Worker intercepte les requetes : (a) Y a-t-il un Worker configure sur sos-expat.com ? (b) Le Worker de dynamic rendering (renderForBotsV2) intercepte-t-il TOUS les trafics ou seulement les bots ? (c) Si le Worker redirige les humains, les scripts analytics sont-ils preserves ? (d) Le Worker modifie-t-il les headers de reponse ? |
| B36 | **Audit Service Worker PWA** | Verifier `sw.js` et `firebase-messaging-sw.js` : (a) Le SW intercepte-t-il les requetes vers google-analytics.com ? (b) Le SW met-il en cache des reponses analytics (ne devrait pas) ? (c) Le SW a-t-il un fetch handler qui bloque des requetes ? |
| B37 | **Audit CORS & Mixed Content** | Verifier : (a) Pas de mixed content (HTTPS partout) (b) Pas d'erreur CORS sur les requetes analytics (c) Le domaine sos-expat.com est-il bien en HTTPS strict (HSTS) ? (d) Les scripts analytics sont-ils charges via HTTPS ? |

#### Sous B6 : Debug & Validation (8 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| B38 | **Test GA4 Temps Reel** | Ouvrir GA4 → Rapports → Temps Reel : (a) Naviguer sur sos-expat.com dans un navigateur SANS ad-blocker (b) L'utilisateur apparait-il dans le temps reel ? (c) Si NON : le probleme est dans l'envoi des hits (d) Si OUI mais pas dans les rapports : le probleme est dans le traitement GA4 |
| B39 | **Test GA4 DebugView** | Activer le mode debug GA4 : (a) Installer l'extension Chrome "GA4 Debugger" (b) Ou ajouter `#gtm.debug` a l'URL (c) Ouvrir GA4 → Configure → DebugView (d) Les evenements apparaissent-ils ? (e) Y a-t-il des erreurs de validation ? |
| B40 | **Test GTM Preview** | Utiliser GTM Preview Mode : (a) Dans tagmanager.google.com → Preview (b) Entrer l'URL sos-expat.com (c) Quelles balises se declenchent ? (d) Quelles balises ne se declenchent PAS ? (e) Le consent mode est-il correctement detecte ? |
| B41 | **Test Tag Assistant** | Utiliser Google Tag Assistant (Legacy ou Companion) : (a) Scanner sos-expat.com (b) Les tags GA4 sont-ils detectes ? (c) Les tags GTM sont-ils detectes ? (d) Y a-t-il des erreurs ou warnings ? (e) Le measurement ID est-il correct ? |
| B42 | **Test Console Diagnostics** | Executer les diagnostics exposes dans la console : (a) `window.ga4Diagnostic()` → que retourne-t-il ? (b) `window.gtmDiagnostic()` → que retourne-t-il ? (c) `window.googleAdsDiagnostic()` → que retourne-t-il ? (d) `console.log(window.dataLayer)` → contenu ? (e) `console.log(window.gtag)` → defini ou undefined ? |
| B43 | **Test Cross-Browser** | Tester sur : (a) Chrome (sans extensions) (b) Firefox (c) Safari (d) Edge (e) Mobile Chrome (f) Mobile Safari → Sur chaque : les requetes analytics sont-elles envoyees ? |
| B44 | **Test Incognito** | Tester en navigation privee : (a) Chrome Incognito (b) Les cookies tiers sont-ils bloques ? (GA4 utilise des first-party cookies normalement) (c) Le consentement est-il redemande ? (pas de localStorage) (d) Les hits sont-ils envoyes ? |
| B45 | **Validateur Final Analytics** | Consolider tous les rapports. Produire le diagnostic final et le plan de correction |

#### Sous B3 (complement) : Server-Side & Backend (2 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| B46 | **Audit Meta CAPI** | Verifier `metaConversionsApi.ts` : deploy, token, events envoyes, deduplication eventID, call sites. Verifier dans Meta Events Manager → Server Events |
| B47 | **Audit Backend Events** | Verifier si les Cloud Functions (Stripe webhooks, triggers Firestore) envoient des conversions a GA4 (Measurement Protocol) ou Meta (CAPI). Identifier les call sites manquants |

#### Agents Supplementaires (3 agents)

| # | Agent | Mission Precise |
|---|-------|-----------------|
| B48 | **Audit Sentry** | Verifier les erreurs JS liees aux analytics dans Sentry. Chercher : gtag undefined, fbq undefined, TypeError analytics. Verifier Session Replay pour diagnostiquer les problemes |
| B49 | **Audit Dev vs Prod** | Verifier que les analytics ne polluent pas les donnees prod depuis le dev. Verifier les .env vs .env.production. Proposer des gardes `import.meta.env.PROD` |
| B50 | **Audit GTM noscript** | Le noscript GTM iframe MANQUE dans index.html. Verifier l'impact, proposer l'ajout. Verifier aussi si le Cloudflare Worker interfere avec GTM |

### Niveau 3 — Validation

| # | Agent | Mission |
|---|-------|---------|
| B51 | **Validateur Final** | Recoit les rapports de B1-B6. Execute les cross-checks (Phase 16). Produit le plan d'action |

---

### Schema de la Hierarchie

```
                              B0 - Orchestrateur Analytics
                                        |
          ┌──────────┬──────────┬───────┴───────┬──────────┬──────────┐
          |          |          |               |          |          |
     B1 GA4/GTM  B2 Consent  B3 Ads/Conv  B4 SPA/Events B5 Reseau  B6 Debug
          |          |          |               |          |          |
      B7-B14     B15-B19    B20-B25        B26-B31    B32-B37    B38-B45
     (8 agents) (5 agents) (6 agents)     (6 agents) (6 agents) (8 agents)
```

**Total : 1 orchestrateur + 7 directeurs + 51 specialistes + 1 validateur = 60 agents**

### Flux d'Execution

```
ETAPE 1 : B0 lance B1 et B2 en PRIORITE (cause la plus probable)
ETAPE 2 : En parallele, B0 lance B3, B4, B5
ETAPE 3 : B6 (Debug) lance ses tests APRES les resultats de B1 et B2
ETAPE 4 : B45 execute les cross-checks
ETAPE 5 : B0 produit le diagnostic final et le plan d'action
```

---

## PHASE 0 — Protection & Snapshot

### Avant toute modification

- [ ] **Snapshot des IDs** : noter les IDs exacts dans index.html, .env.production, gtm.ts, googleAds.ts, metaPixel.ts
- [ ] **Verifier GA4 Temps Reel** : y a-t-il UN SEUL hit en ce moment ? (si oui, le probleme est partiel, pas total)
- [ ] **Verifier GTM versions** : noter la version publiee actuelle du container GTM
- [ ] **Sauvegarder les fichiers** : copier index.html, gtm.ts, ga4.ts, CookieBanner.tsx, .env.production
- [ ] **Git branch** : creer `fix/analytics` avant toute modification

### Regles Anti-Casse

- [ ] **NE JAMAIS supprimer le Consent Mode V2** — c'est obligatoire RGPD
- [ ] **NE JAMAIS hardcoder un ID** dans plusieurs fichiers — utiliser les env vars
- [ ] **NE JAMAIS desactiver le consentement** pour "faire marcher" analytics — c'est illegal en UE
- [ ] **NE JAMAIS modifier GTM** sans publier une nouvelle version du container
- [ ] **NE JAMAIS charger GA4 DEUX FOIS** avec deux measurement IDs differents
- [ ] **TOUJOURS tester** en navigation privee SANS ad-blocker apres modification
- [ ] **TOUJOURS verifier** le Temps Reel GA4 apres chaque correction

---

## PHASE 1 — Audit GA4 Core

**Agents** : B7, B8, B9, B12, B13, B14
**Superviseur** : B1

### B7 — Resolution du Conflit Measurement IDs (PRIORITE ABSOLUE)

**C'est probablement la cause principale du probleme.**

```
✅ RESOLU — Tous les lieux utilisent maintenant G-CTVDEL29CP :
  LIEU 1 : sos/index.html → G-CTVDEL29CP (inchange)
  LIEU 2 : sos/.env.production → G-CTVDEL29CP (CORRIGE depuis G-XZTJK0L3RK)
  LIEU 3 : sos/.env → G-CTVDEL29CP (CORRIGE depuis G-XZTJK0L3RK)
  LIEU 4 : sos/src/utils/gtm.ts → utilise VITE_GA4_MEASUREMENT_ID → G-CTVDEL29CP ✅
  LIEU 5 : sos/src/utils/ga4.ts → utilise VITE_GA4_MEASUREMENT_ID → G-CTVDEL29CP ✅
```

**A VERIFIER (pas dans le code, dans la console Google)** :
- [ ] Le container GTM (GTM-P53H3RLF) a-t-il une balise GA4 ? Avec quel ID ?
- [ ] Si GTM a encore G-XZTJK0L3RK → le changer dans GTM et PUBLIER le container
- [ ] La property GA4 G-XZTJK0L3RK : existe-t-elle ? A-t-elle des donnees ? → La supprimer ou la garder comme archive

### B8 — Script GA4 dans index.html

Verifier l'execution ligne par ligne :

```html
<!-- ETAPE 1 : Consent Mode (L95-135) -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  gtag('consent', 'default', { ... }); // ← S'execute en premier ?
</script>

<!-- ETAPE 2 : Restauration consentement (L120-135) -->
<!-- ← S'execute AVANT le config ? -->

<!-- ETAPE 3 : Chargement script GA4 (L142) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-CTVDEL29CP"></script>

<!-- ETAPE 4 : Configuration GA4 (L143-145) -->
<script>
  gtag('js', new Date());
  gtag('config', 'G-CTVDEL29CP', { ... });
</script>
```

Verifications :
- [ ] Le `<script async>` GA4 est-il bien charge ? (Network tab → `gtag/js?id=G-CTVDEL29CP` → 200 ?)
- [ ] `window.gtag` est-il defini apres l'execution ? (`typeof window.gtag === 'function'` ?)
- [ ] `window.dataLayer` contient-il les entrees consent + config ?
- [ ] Le `gtag('config', ...)` envoie-t-il un hit reseau ? (chercher `google-analytics.com/g/collect` dans Network)
- [ ] Si `analytics_storage: denied` : le hit est un "ping" minimal (pas un page_view complet)

### B9 — Configuration GA4 dans la Console Google

Se connecter a https://analytics.google.com et verifier :

| Element | Ou trouver | Verification |
|---------|-----------|-------------|
| Property existe | Admin → Property | Le nom correspond a sos-expat ? |
| Data stream | Admin → Data Streams | Stream web avec URL sos-expat.com ? |
| Measurement ID | Data Streams → Web | Correspond au code ? |
| Enhanced Measurement | Data Streams → Events | Page views, scrolls, outbound clicks actifs ? |
| Filtres | Admin → Data Filters | Y a-t-il un filtre "Internal Traffic" qui exclut TOUT ? |
| Referral exclusions | Admin → Data Streams → Configure | Des domaines exclus ? |
| Google Signals | Admin → Data Collection | Active ? (peut affecter les rapports) |
| Data retention | Admin → Data Retention | 2 mois ou 14 mois ? |
| Timezone | Admin → Property Settings | Correct (Paris ?) |
| Currency | Admin → Property Settings | EUR ? |
| Consent Mode Modeling | Admin → Data Collection → Consent Mode | La modelisation est-elle ACTIVEE ? Si non, les hits en mode denied sont PERDUS |

### B12 — Double-Tag GA4

**Probleme** : Si GA4 est charge DEUX FOIS avec deux IDs differents :
- Les hits sont envoyes aux deux properties (ou a aucune si conflit)
- Les sessions sont comptees differemment
- Les evenements peuvent etre dupliques ou perdus

Verifier :
- [ ] Dans le Network tab : combien de requetes vers `google-analytics.com/g/collect` par page_view ?
- [ ] Les requetes contiennent-elles `tid=G-CTVDEL29CP` ou `tid=G-XZTJK0L3RK` ?
- [ ] Y a-t-il des requetes avec les DEUX IDs ? → double-tag confirme
- [ ] GTM charge-t-il SA PROPRE balise GA4 ? (verifier dans GTM Preview)

---

## PHASE 2 — Audit Google Tag Manager

**Agents** : B10, B11
**Superviseur** : B1

### B10 — Container GTM

Dans https://tagmanager.google.com :

- [ ] Container `GTM-P53H3RLF` existe ?
- [ ] Container est PUBLIE ? (pas en mode "Draft" non publie)
- [ ] Version publiee recente ? (date de derniere publication)
- [ ] **Balises (Tags) dans le container** :
  | Tag | Type | Trigger | Measurement ID |
  |-----|------|---------|----------------|
  | ? | GA4 Configuration | ? | ? |
  | ? | GA4 Event | ? | ? |
  | ? | Google Ads Conversion | ? | ? |
  | ? | Custom HTML | ? | ? |
- [ ] Les triggers sont-ils correctement configures ? (All Pages, History Change, Custom Events ?)
- [ ] Y a-t-il des variables de data layer configurees ?
- [ ] Le Consent Mode est-il configure dans GTM ? (Built-in consent checks ?)

**PROBLEME POTENTIEL** : Si GTM contient une balise GA4 avec `G-XZTJK0L3RK` ET que index.html a `G-CTVDEL29CP`, il y a double-tag avec deux IDs differents.

### B11 — Code GTM (gtm.ts)

- [ ] Le script `gtm.js?id=GTM-P53H3RLF` est-il charge dynamiquement ?
- [ ] A quel moment du cycle de vie React ? (useEffect ? componentDidMount ?)
- [ ] Est-il conditionne au consentement ? (Si oui, GTM ne charge JAMAIS tant que l'utilisateur n'accepte pas)
- [ ] Le `<noscript>` GTM est-il present dans index.html ? (iframe fallback)
- [ ] Le fallback direct GA4 : quand se declenche-t-il ? Avec quel measurement ID ?

---

## PHASE 3 — Audit Consent Mode V2 & GDPR

**Agents** : B15, B16, B17, B18, B19
**Superviseur** : B2

### B15 — Consent Default

**LE CONSENT MODE EST PROBABLEMENT LA CAUSE #2 DU PROBLEME**

Avec `analytics_storage: 'denied'` par defaut :
- GA4 envoie des pings "cookieless" (pas de `_ga` cookie, pas de session ID)
- Ces pings sont utilises pour la **modelisation du consentement** (Consent Mode Modeling)
- **MAIS** : la modelisation doit etre ACTIVEE dans GA4 (Admin → Data Collection → Consent Mode)
- **SI PAS ACTIVEE** : les donnees des utilisateurs sans consentement sont simplement **PERDUES**
- En Europe, ~60-70% des utilisateurs ne donnent PAS leur consentement → 60-70% des donnees perdues

Verifications :
- [ ] La modelisation est-elle activee dans GA4 ?
- [ ] Combien d'utilisateurs donnent leur consentement ? (verifier localStorage stats)
- [ ] Les pings cookieless sont-ils envoyes ? (Network tab : `gcs=G100` = denied, `gcs=G111` = granted)

### B16 — Cookie Banner Fonctionnel

**Si le banner ne s'affiche JAMAIS, le consentement reste DENIED → zero donnees**

- [ ] `CookieBanner` est-il dans l'arbre de composants React ? (App.tsx ou layout)
- [ ] S'affiche-t-il au premier visit ? (pas de `cookie_consent` dans localStorage)
- [ ] Est-il visible ? (pas cache par z-index, display:none, ou condition)
- [ ] Le bouton "Accepter tout" fonctionne-t-il ? (cliquer et verifier localStorage)
- [ ] Apres acceptation, `localStorage.cookie_preferences` contient-il `{analytics: true}` ?
- [ ] Apres acceptation, `gtag('consent', 'update', {analytics_storage: 'granted'})` est-il appele ?
- [ ] Apres rechargement, le consentement est-il restaure ? (pas de re-affichage du banner)

### B17 — Chronologie Exacte

L'ORDRE D'EXECUTION EST CRITIQUE :

```
1. ✅ gtag('consent', 'default', { analytics_storage: 'denied' })
2. ✅ Restauration localStorage (si existe)
3. ✅ gtag('js', new Date())
4. ✅ gtag('config', 'G-XXXX', { send_page_view: true })
5. React monte
6. Cookie Banner s'affiche (si pas de consentement)
7. Utilisateur clique "Accepter"
8. gtag('consent', 'update', { analytics_storage: 'granted' })
9. GA4 re-envoie les hits bufferises ← SEULEMENT SI send_page_view etait true
```

- [ ] L'etape 1 est-elle AVANT l'etape 3 ? (OBLIGATOIRE — sinon GA4 ignore le consent)
- [ ] L'etape 2 (restore) est-elle AVANT l'etape 4 ? (sinon le premier hit est en denied)
- [ ] Si l'etape 8 arrive APRES le premier hit : GA4 a-t-il un mecanisme de rattrapage ?
  → OUI : `send_page_view: true` avec consent update re-declenche le page_view
  → MAIS : seulement si le consentement est donne PENDANT la meme session

### B18 — Impact sur les Rapports GA4

| Scenario | analytics_storage | Donnees dans GA4 | Visible dans Rapports |
|----------|-------------------|------------------|----------------------|
| Pas de consentement, pas de modelisation | denied | Pings anonymes | **NON** |
| Pas de consentement, modelisation activee | denied | Pings → modelisation | **OUI (estimees)** |
| Consentement donne | granted | Donnees completes | **OUI** |
| Consentement puis rechargement | granted (restaure) | Donnees completes | **OUI** |
| Consentement expire/efface | denied | Pings anonymes | **NON** (ou modelise) |

**Si la modelisation n'est pas activee ET que la plupart des utilisateurs ne donnent pas leur consentement → les rapports GA4 sont VIDES.**

### B19 — Timing du Cookie Banner React

- [ ] Le composant CookieBanner est-il lazy-loaded (React.lazy) ? → Si oui, il peut ne pas s'afficher avant plusieurs secondes
- [ ] Y a-t-il une condition qui empeche l'affichage ? (ex: seulement sur certaines pages, ou seulement en EU)
- [ ] Le composant crash-t-il silencieusement ? (ErrorBoundary qui l'avale)
- [ ] Sur mobile : le banner est-il visible ? (pas hors ecran)

---

## PHASE 4 — Audit Google Ads Conversions

**Agents** : B20, B21
**Superviseur** : B3

### B20 — Google Ads Setup

- [ ] Le script Google Ads (`AW-10842996788`) est-il charge ?
- [ ] Via GTM ou directement ? (dans googleAds.ts)
- [ ] Dans la console Google Ads : les conversions sont-elles configurees avec les bons labels ?
- [ ] Les conversions sont-elles liees a la bonne property GA4 ?
- [ ] Le remarketing tag est-il present et fonctionnel ?

### B21 — GCLID

- [ ] Une visite avec `?gclid=test123` capture-t-elle le GCLID ?
- [ ] Le GCLID est-il stocke dans sessionStorage (`gclid_data`) ?
- [ ] Est-il envoye avec les conversions ?
- [ ] Auto-tagging est-il active dans Google Ads ? (sinon pas de gclid)

---

## PHASE 5 — Audit Meta Pixel / Facebook

**Agents** : B22, B23, B24, B25
**Superviseur** : B3

### B22 — Meta Pixel Fonctionnel

- [ ] Dans Facebook Events Manager : le Pixel `2204016713738311` recoit-il des evenements ?
- [ ] Utiliser l'extension "Meta Pixel Helper" sur Chrome : le pixel est-il detecte sur sos-expat.com ?
- [ ] Le PageView est-il fire au chargement ?
- [ ] Le noscript img fallback est-il present dans le HTML ?
- [ ] Le requestIdleCallback charge-t-il le script assez tot ?

### B23 — Conformite RGPD Meta Pixel

- [ ] Le code dit "TRACKING SANS CONSENTEMENT" → est-ce intentionnel ?
- [ ] En UE, Meta Pixel REQUIERT le consentement marketing → risque amende RGPD
- [ ] Proposer : conditionner `fbq('init', ...)` au consentement marketing
- [ ] La fonction `updateMetaPixelNativeConsent()` est-elle appelee correctement ?

---

## PHASE 6 — Audit Firebase Analytics

**Agent** : B29
**Superviseur** : B4

- [ ] `getAnalytics(app)` retourne-t-il une instance valide ?
- [ ] `isSupported()` retourne-t-il `true` en production ?
- [ ] Dans la console Firebase → Analytics : y a-t-il des donnees ?
- [ ] Firebase Analytics est-il lie a la property GA4 ? (peut etre un pont automatique)
- [ ] `logAnalyticsEvent()` est-il appele quelque part dans le code ?

---

## PHASE 7 — Audit SPA Route Tracking & Page Views

**Agents** : B26, B27
**Superviseur** : B4

### B26 — Page Views dans un SPA (DOUBLE-TRACKING POTENTIEL)

**CORRECTION** : Un composant `PageViewTracker` EXISTE deja (App.tsx L1063) et appelle `trackEvent('page_view')` a chaque navigation SPA.

**MAIS** : `send_page_view: true` est AUSSI configure dans index.html L144. Cela signifie :
- Au chargement initial : GA4 envoie un page_view automatique (`send_page_view: true`) + le PageViewTracker en envoie un DEUXIEME → **DOUBLE page_view**
- Aux navigations suivantes : seul le PageViewTracker envoie → OK

**Verifications** :
- [ ] Confirmer que le composant `PageViewTracker` est bien monte dans App.tsx
- [ ] Verifier dans le Network tab : combien de hits `page_view` au chargement initial ? (si 2 → double-tracking)
- [ ] **FIX** : soit mettre `send_page_view: false` dans index.html, soit retirer le page_view du PageViewTracker au premier rendu
- [ ] Verifier que le `PageViewTracker` envoie les bons parametres : `page_location`, `page_title`, `page_referrer`
- [ ] Verifier que le PageViewTracker est conditionne au consentement (analytics_storage granted)
- [ ] Verifier dans GA4 Temps Reel : les page views apparaissent-ils correctement ?

### B27 — MetaPageViewTracker + PageViewTracker

**MetaPageViewTracker** (App.tsx L1065) :
- [ ] Le composant est-il monte dans l'arbre React ? → OUI (App.tsx L1065)
- [ ] Il utilise `useLocation()` de React Router
- [ ] Il appelle `trackMetaPageView()` → fbq('track', 'PageView')
- [ ] Deduplication avec `eventID` → fonctionne ?

**PageViewTracker GA4** (App.tsx L1063) :
- [ ] Le composant est-il monte ? → OUI (App.tsx L1063)
- [ ] Appelle-t-il `trackEvent('page_view')` avec les bons params ?
- [ ] Est-il conditionne au consentement ?
- [ ] Cree-t-il un DOUBLE page_view avec `send_page_view: true` de index.html ?

---

## PHASE 8 — Audit Events & Conversions Custom

**Agents** : B28, B30, B31
**Superviseur** : B4

### B28 — Inventaire des Events

Lister chaque appel a `trackEvent()` (ga4.ts) dans tout le code :

| Fichier | Evenement | Parametres | Conditionne au consent ? |
|---------|-----------|-----------|--------------------------|
| ? | ? | ? | ? |

Verifier :
- [ ] Les evenements sont-ils conformes aux noms GA4 recommended ? (`page_view`, `purchase`, `begin_checkout`, `sign_up`, `login`, `generate_lead`)
- [ ] Les parametres utilisent-ils les noms standard GA4 ? (`value`, `currency`, `items`, etc.)
- [ ] Les evenements custom sont-ils declares dans GA4 (Custom Definitions) ?
- [ ] Les conversions marquees dans GA4 correspondent-elles aux evenements envoyes ?

### B30 — Analytics Service Firestore

- [ ] Les collections `analytics_*` en production contiennent-elles des donnees ?
- [ ] Si OUI : les donnees Firestore compensent-elles l'absence de GA4 → les donnees EXISTENT mais pas dans GA4
- [ ] Si NON : le service ne fonctionne pas non plus
- [ ] Ce service double-t-il GA4 ou est-ce un remplacant ?

---

## PHASE 9 — Audit CSP, Headers & Blocages Reseau

**Agents** : B32, B33, B34, B37
**Superviseur** : B5

### B32 — CSP Complete

Le CSP dans `_headers` autorise les domaines analytics. Verifier :

| Directive | Domaine requis | Present dans CSP ? |
|-----------|---------------|-------------------|
| script-src | https://www.googletagmanager.com | |
| script-src | https://www.google-analytics.com | |
| script-src | https://googleads.g.doubleclick.net | |
| script-src | https://www.googleadservices.com | |
| script-src | https://connect.facebook.net | |
| connect-src | https://*.google-analytics.com | |
| connect-src | https://*.analytics.google.com | |
| connect-src | https://*.facebook.com | |
| connect-src | https://region1.google-analytics.com | |
| img-src | https://www.google-analytics.com | |
| img-src | https://www.facebook.com | |
| frame-src | https://www.googletagmanager.com | |
| frame-src | https://www.facebook.com | |

**ATTENTION** : GA4 utilise parfois `region1.google-analytics.com` ou `analytics.google.com` (pas `google-analytics.com`) — verifier que les DEUX sont autorises dans connect-src.

### B33 — Requetes Reseau

Ouvrir sos-expat.com avec DevTools → Network → filtrer par "google-analytics" et "googletagmanager" :

| Requete attendue | URL | Status | Payload |
|-----------------|-----|--------|---------|
| Script GA4 | `www.googletagmanager.com/gtag/js?id=G-XXXX` | 200 ? | JavaScript |
| Script GTM | `www.googletagmanager.com/gtm.js?id=GTM-XXXX` | 200 ? | JavaScript |
| Hit page_view | `google-analytics.com/g/collect?v=2&tid=G-XXXX&...` | 204 ? | Parametres |
| Meta Pixel | `www.facebook.com/tr?id=XXXX&ev=PageView` | 200 ? | Pixel |

- [ ] Si les scripts sont charges (200) mais les hits ne sont PAS envoyes → probleme de consentement ou de code
- [ ] Si les scripts ne sont PAS charges → probleme de CSP, ad-blocker, ou URL incorrecte
- [ ] Si les hits sont envoyes mais retournent une erreur → probleme cote Google (mauvais ID, property supprimee)

### B34 — Ad-Blockers

~30-40% des utilisateurs europeens utilisent un ad-blocker qui bloque GA4/GTM.

- [ ] Tester avec uBlock Origin : les requetes sont bloquees ?
- [ ] Tester avec Brave : les requetes sont bloquees ?
- [ ] Firebase Analytics (fallback) est-il bloque ? → NON normalement (domaine firebaseio.com)
- [ ] Proposer : un proxy Cloudflare Worker pour les analytics (contourne les ad-blockers)

---

## PHASE 10 — Audit Cloudflare & Dynamic Rendering

**Agents** : B35, B36
**Superviseur** : B5

### B35 — Cloudflare

- [ ] Y a-t-il un Cloudflare Worker qui intercepte le trafic ? (Workers → Routes)
- [ ] Le dynamic rendering (renderForBotsV2) affecte-t-il les utilisateurs humains ?
  → Il ne devrait PAS (retourne 302 pour les non-bots)
- [ ] Cloudflare ajoute-t-il des headers qui bloquent les scripts ? (`Content-Security-Policy` supplementaire ?)
- [ ] Cloudflare minifie-t-il le JavaScript ? (Auto Minify → peut casser les scripts analytics)
- [ ] Cloudflare Rocket Loader est-il active ? (peut retarder les scripts analytics)
- [ ] Cloudflare Bot Management bloque-t-il les requetes analytics ? (peu probable mais verifier)

### B36 — Service Worker

- [ ] `sw.js` a-t-il un `fetch` event listener ?
- [ ] Si oui, intercepte-t-il les requetes vers `google-analytics.com` ?
- [ ] Le service worker met-il en cache le script GA4 ? (pourrait servir une version perimee)
- [ ] `firebase-messaging-sw.js` interfere-t-il avec les analytics ?

---

## PHASE 11 — Audit Debug & Diagnostics

**Agents** : B38, B39, B40, B41, B42, B43, B44
**Superviseur** : B6

### B38 — Test Temps Reel GA4

**PREMIER TEST A FAIRE — determine si le probleme est dans l'envoi ou dans GA4**

1. Ouvrir GA4 → Rapports → Temps Reel
2. Dans un navigateur SANS ad-blocker, SANS extensions, en navigation NON privee :
3. Naviguer sur https://sos-expat.com
4. Attendre 30 secondes
5. Regarder le rapport Temps Reel GA4

| Resultat | Diagnostic |
|----------|-----------|
| Utilisateur visible | Les hits arrivent → probleme dans les rapports GA4 (filtres, retention) |
| Rien | Les hits n'arrivent PAS → probleme dans l'envoi (code, consent, reseau) |

### B39 — GA4 DebugView

1. Installer l'extension Chrome "Google Analytics Debugger"
2. Activer l'extension
3. Naviguer sur sos-expat.com
4. Ouvrir GA4 → Configure → DebugView
5. Les evenements apparaissent-ils en temps reel ?

Si les evenements apparaissent en DebugView mais PAS dans les rapports normaux :
→ Probleme de filtre, de retention, ou de delai de traitement (GA4 peut prendre 24-48h)

### B40 — GTM Preview Mode

1. Se connecter a tagmanager.google.com
2. Cliquer "Preview" sur le container GTM-P53H3RLF
3. Entrer l'URL https://sos-expat.com
4. Le Tag Assistant s'ouvre

Verifier :
- [ ] Le container GTM est-il charge ? ("Container Loaded" event)
- [ ] Quelles balises sont en "Tags Fired" ?
- [ ] Quelles balises sont en "Tags Not Fired" ? (et pourquoi ?)
- [ ] Le consent est-il detecte ? (onglet "Consent")
- [ ] Les triggers se declenchent-ils ? (All Pages, History Change, etc.)

### B42 — Diagnostics Console

Ouvrir la console du navigateur sur sos-expat.com et executer :

```javascript
// 1. GA4 existe ?
console.log('gtag:', typeof window.gtag);
console.log('dataLayer:', window.dataLayer);
console.log('dataLayer length:', window.dataLayer?.length);

// 2. Diagnostic GA4 (si expose)
if (window.ga4Diagnostic) window.ga4Diagnostic();

// 3. Diagnostic GTM (si expose)
if (window.gtmDiagnostic) window.gtmDiagnostic();

// 4. Verifier le consentement
console.log('cookie_consent:', localStorage.getItem('cookie_consent'));
console.log('cookie_preferences:', localStorage.getItem('cookie_preferences'));

// 5. Verifier les cookies GA4
console.log('_ga cookie:', document.cookie.match(/_ga=([^;]+)/)?.[1]);
console.log('_ga_XXXX:', document.cookie.match(/_ga_[A-Z0-9]+=([^;]+)/)?.[1]);

// 6. Forcer un evenement test
if (window.gtag) {
  window.gtag('event', 'test_debug', { debug_mode: true });
  console.log('Test event sent!');
}
```

| Resultat | Interpretation |
|----------|---------------|
| `gtag: undefined` | GA4 n'est PAS charge du tout |
| `gtag: function` mais pas de hit reseau | Le consentement bloque ou le measurement ID est invalide |
| `dataLayer: []` (vide) | Rien n'est pousse dans le dataLayer |
| `_ga cookie: undefined` | analytics_storage est denied (pas de cookies) |
| `cookie_preferences: null` | Le banner n'a jamais ete clique |

---

## PHASE 13 — Audit Server-Side & Backend Tracking

**Agents** : Nouveau B46, B47
**Superviseur** : B3

### B46 — Meta Conversions API (CAPI)

**Fichier** : `sos/firebase/functions/src/metaConversionsApi.ts`

Le CAPI envoie des evenements server-to-server a Meta → contourne les ad-blockers.

- [ ] La fonction est-elle deployee et active en production ?
- [ ] Le token d'acces Meta est-il configure (secret Firebase) ?
- [ ] Les evenements envoyes : Purchase, Lead, InitiateCheckout, CompleteRegistration
- [ ] La deduplication eventID fonctionne-t-elle ? (meme ID entre Pixel client et CAPI server)
- [ ] Verifier dans Meta Events Manager → Server Events : des evenements arrivent-ils ?
- [ ] Le hashing SHA256 est-il identique cote client et cote serveur ? (sinon pas de match)
- [ ] Les call sites : quelles Cloud Functions appellent `metaConversionsApi` ?
  - Apres un paiement Stripe reussi (onPaymentSuccess) ?
  - Apres une inscription (onUserCreated) ?
  - Apres un booking (onBookingCreated) ?
- [ ] Si les call sites sont manquants → le CAPI est implemente mais JAMAIS appele → zero donnees

### B47 — Tracking Backend Manquant

Verifier si les Cloud Functions envoient des evenements analytics :

| Evenement Backend | Cloud Function | Envoie a GA4 ? | Envoie a Meta CAPI ? |
|-------------------|---------------|----------------|---------------------|
| Paiement reussi | onPaymentSucceeded (Stripe webhook) | ? | ? |
| Appel termine | onCallCompleted trigger | ? | ? |
| Inscription complete | registerChatter/registerBlogger/etc. | ? | ? |
| Premier appel | Premier call d'un client | ? | ? |

- [ ] Les webhooks Stripe envoient-ils des conversions GA4 Measurement Protocol ?
- [ ] Si NON : les conversions ne sont trackees que cote client → perdues si l'utilisateur ferme la page avant le callback
- [ ] Proposer : GA4 Measurement Protocol server-side pour les conversions critiques (paiements)

---

## PHASE 14 — Audit Sentry & Error Tracking

**Agent** : Nouveau B48

### B48 — Sentry

**Fichier** : `sos/src/config/sentry.ts` + `main.tsx L13`

- [ ] Sentry est-il initialise correctement ? (check DSN, environment, release)
- [ ] Les erreurs JavaScript sont-elles capturees ? (verifier dans sentry.io)
- [ ] Y a-t-il des erreurs JS liees aux scripts analytics dans Sentry ? (TypeError sur gtag, fbq, etc.)
- [ ] Le Session Replay capture-t-il les sessions avec problemes analytics ?
- [ ] Les filtres Sentry excluent-ils des erreurs importantes ? (verifier `beforeSend`)
- [ ] **CORRELATION** : Si Sentry montre des erreurs `gtag is not defined` ou `fbq is not defined` → la cause du probleme analytics est une erreur JS qui empeche le chargement

---

## PHASE 15 — Audit Environnement Dev vs Prod

**Agent** : Nouveau B49

### B49 — Pollution Dev/Prod

**PROBLEME** : Les analytics tournent aussi en developpement (pas de garde `import.meta.env.PROD`).

- [ ] GA4 dans index.html : charge TOUJOURS (pas de condition dev/prod)
- [ ] Meta Pixel dans index.html : charge TOUJOURS
- [ ] GTM dans main.tsx : y a-t-il une condition `if (import.meta.env.PROD)` ?
- [ ] Les hits de dev polluent-ils les donnees de prod ?
- [ ] Si les developpeurs utilisent un ad-blocker : ils ne voient pas les analytics → pensent que ca ne marche pas
- [ ] **Verifier .env vs .env.production** : les IDs sont-ils les memes ? Si .env (dev) a un ID different ou vide → pas de tracking en dev
- [ ] Proposer : conditionner le chargement GA4/Meta/GTM a `import.meta.env.PROD`
- [ ] Alternative : utiliser une property GA4 separee pour le dev (filtrer par hostname dans GA4)

**ATTENTION** : en mode dev Vite (`npm run dev`), les fichiers `.env` sont charges, PAS `.env.production`. Si `VITE_GA4_MEASUREMENT_ID` est seulement dans `.env.production` et pas dans `.env`, le code React qui utilise cette env var aura `undefined` en dev → `gtag('config', undefined)` → erreur silencieuse.

---

## PHASE 16 — Cross-Checks & Tests de Validation

**Agent** : B45 (Validateur Final)

### Cross-Check 1 : Measurement ID Unicite
```
Verifier que LE MEME measurement ID est utilise dans :
- index.html
- .env.production
- gtm.ts (env var)
- ga4.ts (env var)
- GTM container (balise GA4 Configuration)
Si DIFFERENT → source du probleme
```

### Cross-Check 2 : Consent Flow Bout en Bout
```
1. Ouvrir le site en navigation privee (pas de localStorage)
2. Verifier que analytics_storage = denied (Network tab : gcs=G100)
3. Verifier que le Cookie Banner s'affiche
4. Cliquer "Accepter tout"
5. Verifier que analytics_storage = granted (localStorage + gtag update)
6. Verifier qu'un hit page_view est envoye (Network tab : gcs=G111)
7. Recharger la page
8. Verifier que le consentement est restaure (pas de banner, gcs=G111)
```

### Cross-Check 3 : GTM ↔ GA4 Inline Pas de Conflit
```
Verifier que :
- Si GTM charge une balise GA4 → index.html ne doit PAS faire gtag('config')
- OU si index.html fait gtag('config') → GTM ne doit PAS avoir de balise GA4
- UN SEUL des deux doit configurer GA4
```

### Cross-Check 4 : SPA Page Views
```
1. Naviguer sur /fr-fr/ (page d'accueil)
2. Cliquer sur "Tarifs" (/fr-fr/tarifs)
3. Verifier dans Network : un nouveau hit page_view est-il envoye ?
4. Cliquer sur "FAQ" (/fr-fr/faq)
5. Verifier dans Network : un nouveau hit page_view est-il envoye ?
Si NON → les navigations SPA ne sont PAS trackees
```

### Cross-Check 5 : Events Conversions
```
Pour chaque evenement de conversion :
1. Effectuer l'action (booking, paiement, inscription)
2. Verifier dans Network : un hit event est-il envoye ?
3. Verifier dans GA4 Temps Reel : l'evenement apparait-il ?
4. Verifier dans Google Ads : la conversion est-elle comptee ?
5. Verifier dans Meta Events Manager : l'evenement apparait-il ?
```

### Cross-Check 6 : CSP ↔ Scripts Analytics
```
Pour chaque script analytics :
1. Verifier que le domaine est dans la CSP
2. Verifier que la requete n'est PAS bloquee (console errors)
3. Verifier les headers de reponse (pas de X-Frame-Options bloquant)
```

### Cross-Check 7 : Firebase Analytics ↔ GA4
```
Verifier si Firebase Analytics envoie des donnees :
1. Ouvrir la console Firebase → Analytics
2. Y a-t-il des evenements recents ?
3. Si OUI → Firebase fonctionne mais pas GA4 → probleme specifique GA4
4. Si NON → probleme plus general (code, reseau)
```

### Cross-Check 8 : Multi-Browser
```
Tester sur Chrome, Firefox, Safari, Edge, Mobile :
Pour chaque navigateur :
  1. Ouvrir sos-expat.com
  2. Accepter le consentement
  3. Verifier les requetes analytics (Network tab ou Charles Proxy)
  4. Le comportement est-il identique ?
```

### Cross-Check 9 : Ad-Blocker Impact
```
1. Tester SANS ad-blocker → hits envoyes ?
2. Tester AVEC uBlock Origin → hits bloques ?
3. Tester AVEC Brave → hits bloques ?
4. Calculer : quel % d'utilisateurs est potentiellement bloque ?
5. Firebase Analytics fonctionne-t-il dans tous les cas ?
```

### Cross-Check 10 : Donnees Firestore vs GA4
```
Comparer les collections analytics_* en Firestore :
- Si Firestore a des donnees mais pas GA4 → le probleme est specifique a GA4
- Si les deux sont vides → le code de tracking n'est pas execute
- Si les deux ont des donnees mais pas GA4 rapports → probleme cote Google
```

### Cross-Check 11 : Double Page View
```
Au chargement initial de /fr-fr/ :
  1. Ouvrir Network tab, filtrer "collect"
  2. Compter les requetes avec en=page_view
  3. Si 2 requetes → double-tracking (send_page_view:true + PageViewTracker)
  4. Verifier les parametres de chaque hit (page_location, page_title)
```

### Cross-Check 12 : Meta Pixel Client ↔ CAPI Server
```
Pour un evenement Purchase :
  1. Verifier dans Meta Events Manager → Browser Events : l'evenement existe ?
  2. Verifier dans Meta Events Manager → Server Events : le meme evenement existe ?
  3. Verifier que l'eventID est IDENTIQUE (deduplication)
  4. Si seul le client OU seul le serveur envoie → deduplication cassee
```

### Cross-Check 13 : Sentry Erreurs ↔ Analytics
```
Dans Sentry, chercher :
  1. "gtag is not defined" → GA4 pas charge
  2. "fbq is not defined" → Meta Pixel pas charge
  3. "dataLayer is not defined" → GTM pas charge
  4. TypeError sur trackEvent, trackMetaPageView, etc.
  5. Si des erreurs existent → la cause du zero donnees est un crash JS
```

### Cross-Check 14 : GTM Tags ↔ GA4 Inline
```
1. Ouvrir GTM Preview sur sos-expat.com
2. Lister toutes les balises qui fire
3. Y a-t-il une balise GA4 Configuration ? Avec quel ID ?
4. Comparer avec l'ID dans index.html
5. Si DIFFERENTS → double-tag confirme → source du probleme
```

### Cross-Check 15 : Env Vars Dev ↔ Prod (CORRIGE)
```
APRES CORRECTION :
  .env : VITE_GA4_MEASUREMENT_ID = G-CTVDEL29CP ✅
  .env.production : VITE_GA4_MEASUREMENT_ID = G-CTVDEL29CP ✅
  index.html : G-CTVDEL29CP (hardcode) ✅
Verifier que le deploy a bien utilise .env.production (Cloudflare Pages)
```

### Cross-Check 16 : Cookie Banner ↔ Consent ↔ Hits
```
1. Navigation privee (pas de localStorage)
2. Le Cookie Banner s'affiche ?
3. NE PAS cliquer → attendre 10 secondes
4. Verifier Network : des hits GA4 sont-ils envoyes ? (gcs=G100 = denied)
5. Cliquer "Accepter tout"
6. Verifier Network : nouveaux hits avec gcs=G111 = granted ?
7. Verifier localStorage : cookie_preferences contient analytics:true ?
8. Recharger la page → le banner ne reapparait PAS ?
9. Verifier Network : premier hit a gcs=G111 (consent restaure) ?
```

### Cross-Check 17 : Cloudflare Worker ↔ Analytics
```
1. Le Worker (wrangler.toml) redirige-t-il les humains ?
2. Si le Worker sert une reponse cachee → les scripts analytics sont-ils inclus ?
3. Si le Worker modifie le HTML → les scripts GA4/GTM sont-ils preserves ?
4. Tester : acceder au site avec/sans le Worker → meme comportement analytics ?
```

### Script de Test Global

```javascript
// analytics-diagnostic.js
// Coller dans la console du navigateur sur sos-expat.com

(function() {
  console.group('🔍 DIAGNOSTIC ANALYTICS COMPLET');

  // 1. GA4
  console.group('📊 GA4');
  console.log('gtag defined:', typeof window.gtag === 'function');
  console.log('dataLayer:', window.dataLayer);
  console.log('dataLayer entries:', window.dataLayer?.length || 0);

  // Chercher le measurement ID dans le dataLayer
  const configEntries = window.dataLayer?.filter(e =>
    Array.isArray(e) ? e[0] === 'config' : e?.event === 'gtm.js'
  );
  console.log('Config entries:', configEntries);

  // Cookies GA4
  const gaCookie = document.cookie.match(/_ga=([^;]+)/);
  console.log('_ga cookie:', gaCookie ? gaCookie[1] : '❌ ABSENT (analytics_storage denied?)');

  const gaIdCookies = document.cookie.match(/_ga_[A-Z0-9]+=/g);
  console.log('_ga_ID cookies:', gaIdCookies || '❌ ABSENT');
  console.groupEnd();

  // 2. GTM
  console.group('🏷️ GTM');
  const gtmScript = document.querySelector('script[src*="gtm.js"]');
  console.log('GTM script loaded:', !!gtmScript);
  console.log('GTM src:', gtmScript?.src || '❌ NOT FOUND');
  console.groupEnd();

  // 3. Consent
  console.group('🔒 Consent');
  const consent = localStorage.getItem('cookie_consent');
  const prefs = localStorage.getItem('cookie_preferences');
  console.log('cookie_consent:', consent || '❌ NOT SET (banner never clicked)');
  console.log('cookie_preferences:', prefs ? JSON.parse(prefs) : '❌ NOT SET');

  if (prefs) {
    const p = JSON.parse(prefs);
    console.log('  analytics:', p.analytics ? '✅ granted' : '❌ denied');
    console.log('  marketing:', p.marketing ? '✅ granted' : '❌ denied');
    console.log('  performance:', p.performance ? '✅ granted' : '❌ denied');
  }
  console.groupEnd();

  // 4. Meta Pixel
  console.group('📱 Meta Pixel');
  console.log('fbq defined:', typeof window.fbq === 'function');
  console.log('FB Pixel ID:', window.fbq?.getState?.()?.pixels?.[0]?.id || 'unable to read');
  console.groupEnd();

  // 5. Google Ads
  console.group('📢 Google Ads');
  const adsScript = document.querySelector('script[src*="googleadservices"]') ||
                    document.querySelector('script[src*="gtag/js?id=AW-"]');
  console.log('Google Ads script:', !!adsScript);
  const gclid = sessionStorage.getItem('gclid') || sessionStorage.getItem('gclid_data');
  console.log('GCLID stored:', gclid || 'none');
  console.groupEnd();

  // 6. Firebase Analytics
  console.group('🔥 Firebase');
  console.log('Firebase loaded:', typeof window.firebase !== 'undefined' || !!document.querySelector('script[src*="firebase"]'));
  console.groupEnd();

  // 7. Network test
  console.group('🌐 Network');
  console.log('To check network requests:');
  console.log('  1. Open Network tab');
  console.log('  2. Filter: "google-analytics" or "collect"');
  console.log('  3. Look for /g/collect requests');
  console.log('  4. Check status code (should be 204)');
  console.groupEnd();

  // 8. Force test event
  if (window.gtag) {
    window.gtag('event', 'diagnostic_test', {
      debug_mode: true,
      timestamp: new Date().toISOString()
    });
    console.log('✅ Test event sent via gtag!');
  } else {
    console.log('❌ Cannot send test event: gtag not defined');
  }

  // 9. Diagnostics embarques
  console.group('🔧 Built-in Diagnostics');
  if (window.ga4Diagnostic) {
    console.log('ga4Diagnostic available, calling...');
    window.ga4Diagnostic();
  } else {
    console.log('ga4Diagnostic: ❌ not available');
  }
  if (window.gtmDiagnostic) {
    console.log('gtmDiagnostic available, calling...');
    window.gtmDiagnostic();
  } else {
    console.log('gtmDiagnostic: ❌ not available');
  }
  console.groupEnd();

  console.groupEnd();
})();
```

---

## PHASE 17 — Plan d'Action & Deploiement

### Ordre de Correction (du plus probable au moins probable)

**P0 — CRITIQUE (a faire EN PREMIER)** :

| # | Correction | Fichier | Impact |
|---|-----------|---------|--------|
| 1 | **Unifier le Measurement ID GA4** — choisir UN SEUL ID, l'utiliser dans index.html ET .env.production ET GTM | index.html, .env.production | Resout le split de donnees |
| 2 | **Eliminer le double-tag GA4** — soit GA4 inline soit GA4 via GTM, PAS les deux | index.html ou GTM container | Resout les conflits |
| 3 | **Verifier que le Cookie Banner s'affiche et fonctionne** | CookieBanner.tsx, App.tsx | Resout le consent bloque |
| 4 | **Activer la modelisation du consentement dans GA4** | Console GA4 (pas de code) | Recupere ~60% des donnees |

**P1 — IMPORTANT (a faire dans la foulee)** :

| # | Correction | Fichier | Impact |
|---|-----------|---------|--------|
| 5 | **Ajouter le tracking SPA page_view pour GA4** | Nouveau composant ou gtm.ts | Recupere les page views des navigations client |
| 6 | **Verifier/publier le container GTM** | Console GTM (pas de code) | GTM ne fonctionne que si publie |
| 7 | **Verifier le Data Stream GA4** | Console GA4 (pas de code) | Pas de data stream = pas de donnees |
| 8 | **Verifier les filtres GA4** | Console GA4 (pas de code) | Un filtre peut exclure tout le trafic |

**P2 — OPTIMISATION (a faire ensuite)** :

| # | Correction | Fichier | Impact |
|---|-----------|---------|--------|
| 9 | Conditionner Meta Pixel au consentement marketing | metaPixel.ts, index.html | Conformite RGPD |
| 10 | Ajouter Enhanced Measurement dans GA4 | Console GA4 | Scrolls, outbound clicks, search |
| 11 | Configurer les conversions GA4 | Console GA4 | Tracking business |
| 12 | Implementer un proxy server-side analytics | Cloudflare Worker | Contourner ad-blockers |
| 13 | Lier Firebase Analytics a GA4 | Console Firebase/GA4 | Donnees unifiees |
| 14 | Ajouter Offline analytics via Service Worker | sw.js, analytics.ts | Pas de perte hors-ligne |

### Protocole de Deploiement

```
1. AVANT :
   - Sauvegarder tous les fichiers modifies
   - Noter l'etat GA4 Temps Reel (zero ou pas)
   - Creer branche git fix/analytics

2. CORRECTION 1 : Measurement ID
   - Choisir le bon ID
   - Modifier index.html et/ou .env.production
   - Deployer (git push → Cloudflare auto-deploy)
   - Attendre 2 minutes
   - Verifier GA4 Temps Reel : un hit apparait ?

3. CORRECTION 2 : Double-tag
   - Choisir : GA4 inline OU GTM (recommande : tout via GTM)
   - Si tout via GTM : retirer gtag('config', ...) de index.html
   - Deployer et verifier

4. CORRECTION 3 : Consent
   - Verifier le Cookie Banner
   - Tester le flux complet en navigation privee
   - Activer la modelisation dans GA4 console

5. APRES :
   - Verifier GA4 Temps Reel (hits visibles ?)
   - Attendre 24-48h pour les rapports GA4 (delai normal)
   - Verifier les rapports apres 48h
   - Verifier les conversions Google Ads
   - Verifier Meta Events Manager
```

### Checklist Post-Deploy

- [ ] GA4 Temps Reel montre des utilisateurs actifs ?
- [ ] Network tab montre des requetes `/g/collect` avec status 204 ?
- [ ] Le cookie `_ga` est cree apres consentement ?
- [ ] Les navigations SPA generent de nouveaux page_view ?
- [ ] Les conversions sont trackees (tester un faux achat en test) ?
- [ ] GTM Preview montre les balises qui fire ?
- [ ] Meta Events Manager recoit des evenements ?
- [ ] Firebase Analytics console montre des donnees ?

---

## PHASE 18 — Audit International & Maximisation des Remontees (197 pays × 9 langues)

> **Ce site est INTERNATIONAL** : 197 pays, 9 langues, toutes nationalites.
> L'analytics DOIT refleter cette dimension. Chaque visiteur doit etre identifie par pays, langue, continent, device, et parcours de conversion.

### Agents : Nouveau B52-B62 (11 agents)
### Superviseur : Nouveau B1bis — Directeur International Analytics

#### B52 — User Properties Internationales

**PROBLEME** : GA4 ne connait PAS automatiquement la langue ou le pays de navigation de l'utilisateur sur le site. Il connait le pays IP mais PAS la locale choisie (/fr-fr/, /en-us/, etc.).

**User Properties a envoyer a GA4** (dans ga4.ts ou un nouveau composant) :

```javascript
// A appeler au chargement de chaque page et quand la locale change
gtag('set', 'user_properties', {
  user_locale: 'fr-fr',           // Locale de la page visitee
  user_language: 'fr',             // Langue de l'interface
  user_country_site: 'fr',         // Pays dans l'URL (fr de fr-fr)
  user_continent: 'EU',            // Continent detecte
  user_role: 'client',             // client/lawyer/expat/chatter/blogger/etc.
  user_type: 'visitor',            // visitor/registered/subscriber
  site_version: '9-lang',          // Version du site
});
```

- [ ] Ces user properties sont-elles envoyees actuellement ? → Probablement NON
- [ ] `setUserProperties()` dans ga4.ts est-il appele quelque part avec ces valeurs ?
- [ ] Proposer un composant `InternationalTracker` qui detecte la locale depuis l'URL et envoie ces properties
- [ ] Enregistrer ces user properties comme **Custom Dimensions** dans GA4 (Admin → Custom Definitions)

#### B53 — Custom Dimensions GA4 (Configuration Console)

**A creer dans GA4 → Admin → Custom Definitions → Custom Dimensions :**

| Dimension | Scope | Nom d'evenement | Description |
|-----------|-------|-----------------|-------------|
| `user_locale` | User | — | Locale complete (fr-fr, en-us, zh-cn) |
| `user_language` | User | — | Langue (fr, en, es, de, ru, pt, zh, ar, hi) |
| `user_country_site` | User | — | Pays dans l'URL |
| `user_continent` | User | — | Continent (EU, NA, SA, AF, AS, OC) |
| `user_role` | User | — | Role utilisateur |
| `page_locale` | Event | page_view | Locale de la page vue |
| `page_language` | Event | page_view | Langue de la page vue |
| `provider_country` | Event | view_provider | Pays du prestataire consulte |
| `provider_type` | Event | view_provider | Type (lawyer/expat) |
| `provider_language` | Event | view_provider | Langues du prestataire |
| `booking_country` | Event | begin_checkout | Pays du prestataire reserve |
| `call_country` | Event | purchase | Pays de l'appel |
| `registration_type` | Event | sign_up | Type d'inscription |
| `content_group` | Event | page_view | Groupe de contenu (homepage, profile, faq, help, pricing, register, landing) |

- [ ] Ces dimensions existent-elles dans GA4 ? → Probablement NON
- [ ] Les creer dans Admin → Custom Definitions
- [ ] Les envoyer avec chaque evenement correspondant dans le code

#### B54 — Content Groups par Type de Page

**GA4 Content Grouping** : permet de segmenter les rapports par type de page.

```javascript
// A chaque page_view, envoyer le content_group
gtag('event', 'page_view', {
  content_group: detectContentGroup(pathname),
  // ...
});

function detectContentGroup(pathname) {
  if (pathname.match(/^\/(fr|en|es|de|ru|pt|zh|ar|hi)-(fr|us|es|de|ru|pt|cn|sa|in)\/?$/)) return 'homepage';
  if (pathname.includes('/avocat-') || pathname.includes('/lawyer') || pathname.includes('/expat')) return 'provider_profile';
  if (pathname.includes('/tarifs') || pathname.includes('/pricing')) return 'pricing';
  if (pathname.includes('/faq')) return 'faq';
  if (pathname.includes('/centre-aide') || pathname.includes('/help-center')) return 'help_center';
  if (pathname.includes('/inscription') || pathname.includes('/register')) return 'registration';
  if (pathname.includes('/contact')) return 'contact';
  if (pathname.includes('/devenir-') || pathname.includes('/become-')) return 'landing_affiliate';
  if (pathname.includes('/blog')) return 'blog';
  if (pathname.includes('/cgu') || pathname.includes('/terms')) return 'legal';
  return 'other';
}
```

- [ ] Le content grouping est-il implemente ? → Probablement NON
- [ ] Proposer l'implementation dans le PageViewTracker
- [ ] Permet d'analyser : quels types de pages convertissent le mieux PAR PAYS

#### B55 — Events Specifiques Profils Prestataires

**Les profils sont les pages les plus importantes (~2000+ pages). Chaque vue de profil doit etre trackee avec des details.**

```javascript
// Quand un utilisateur visite un profil prestataire
gtag('event', 'view_provider', {
  provider_id: profile.uid,
  provider_type: profile.type,       // lawyer / expat
  provider_country: profile.country,  // Thailande, France, etc.
  provider_languages: profile.languages.join(','),
  provider_rating: profile.rating,
  provider_review_count: profile.reviewCount,
  page_locale: currentLocale,         // fr-fr, en-us, etc.
  visitor_language: detectLanguage(),
});

// Quand un utilisateur clique "Appeler" ou "Reserver"
gtag('event', 'begin_booking', {
  provider_id: profile.uid,
  provider_type: profile.type,
  provider_country: profile.country,
  booking_source_locale: currentLocale,
});
```

- [ ] L'evenement `view_provider` existe-t-il ? → Verifier dans ga4.ts et ProviderProfile.tsx
- [ ] Les parametres provider_country, provider_type sont-ils envoyes ?
- [ ] Permet d'analyser : quels pays/types de prestataires sont les plus consultes, depuis quelles langues

#### B56 — Funnel de Conversion par Pays/Langue

**Chaque etape du funnel doit tracker la locale et le pays :**

```
Etape 1 : Homepage (page_view, locale)
Etape 2 : Recherche/Browse (view_provider_list, locale, country_filter)
Etape 3 : Vue profil (view_provider, provider_country, locale)
Etape 4 : Booking (begin_checkout, provider_country, locale, price)
Etape 5 : Paiement (purchase, provider_country, locale, revenue, currency)
```

- [ ] Le funnel GA4 est-il configure ? (GA4 → Explore → Funnel Analysis)
- [ ] Chaque etape envoie-t-elle les parametres locale et provider_country ?
- [ ] Permet de repondre a : "Les visiteurs FR convertissent-ils plus que les EN ?"
- [ ] Permet de repondre a : "Quel pays de prestataire genere le plus de revenus ?"

#### B57 — E-commerce International

**Les conversions doivent inclure la devise et le contexte international :**

```javascript
gtag('event', 'purchase', {
  transaction_id: orderId,
  value: amount,
  currency: 'EUR',              // TOUJOURS EUR (prix du site)
  items: [{
    item_id: providerId,
    item_name: providerName,
    item_category: providerType, // lawyer / expat
    item_variant: providerCountry,
    price: amount,
    quantity: 1,
  }],
  // Dimensions internationales
  buyer_locale: currentLocale,
  buyer_country_ip: detectedCountry,
  provider_country: providerCountry,
  call_language: callLanguage,
});
```

- [ ] L'evenement `purchase` est-il envoye avec ces parametres ? → Verifier PaymentSuccess.tsx
- [ ] La devise est-elle toujours EUR ? (coherent avec GA4 property currency)
- [ ] Les items sont-ils structures selon le format GA4 e-commerce ?
- [ ] `item_variant` = pays du prestataire → permet l'analyse par pays

#### B58 — Audiences Internationales GA4

**A creer dans GA4 → Admin → Audiences :**

| Audience | Condition | Usage |
|----------|-----------|-------|
| Visiteurs France | user_locale contains "fr-fr" | Remarketing FR |
| Visiteurs Anglais | user_language = "en" | Remarketing EN |
| Visiteurs Afrique | user_continent = "AF" | Analyse regionale |
| Visiteurs Asie | user_continent = "AS" | Analyse regionale |
| Clients ayant reserve | event = purchase | Retention |
| Visiteurs profil avocat | event = view_provider, provider_type = lawyer | Remarketing |
| Visiteurs profil expat | event = view_provider, provider_type = expat | Remarketing |
| Par pays prestataire (top 20) | provider_country = "Thailand", etc. | Analyse par destination |
| Multilingues | sessions in > 1 language | UX insights |
| High intent | visited pricing + provider profile | Remarketing |

- [ ] Ces audiences sont-elles creees ? → Probablement NON
- [ ] Les creer dans GA4 apres avoir envoye les user properties et events
- [ ] Lier a Google Ads pour le remarketing international

#### B59 — Consent par Region (RGPD, CCPA, LGPD)

**Le consentement VARIE selon le pays du visiteur :**

| Region | Loi | Consentement requis | Impact |
|--------|-----|---------------------|--------|
| EU/EEE + UK | RGPD | Opt-in obligatoire | ~60-70% refusent → donnees perdues sans modelisation |
| Californie | CCPA | Opt-out (default: track) | Quasi 100% des donnees |
| Bresil | LGPD | Opt-in | Similaire RGPD |
| Reste du monde | Variable | Souvent pas requis | 100% des donnees |

- [ ] Le Cookie Banner s'affiche-t-il PARTOUT ou seulement en EU ?
- [ ] Si partout : les visiteurs hors-EU refusent aussi → perte inutile de donnees
- [ ] Proposer : **Geo-Consent** — afficher le banner seulement en EU/BR (regions ou c'est requis)
- [ ] Pour le reste du monde : consentement implicite (granted par defaut)
- [ ] Implementation : detecter le pays via timezone ou API GeoIP → conditionner le consent default

```javascript
// Proposition : Geo-aware consent
const isConsentRequired = isEUorBR(detectedCountry);
gtag('consent', 'default', {
  'analytics_storage': isConsentRequired ? 'denied' : 'granted',
  'ad_storage': isConsentRequired ? 'denied' : 'granted',
  // ...
});
```

- [ ] **ATTENTION** : cela doit etre valide juridiquement avec un avocat
- [ ] **Impact** : recuperer les donnees de ~130 pays ou le consent n'est pas requis

#### B60 — GA4 + Search Console Integration

**Lier GA4 et Google Search Console pour voir les requetes de recherche par pays/langue :**

- [ ] GA4 est-il lie a GSC ? (Admin → Product Links → Search Console)
- [ ] Si NON : le lier pour voir les requetes organiques dans GA4
- [ ] Permet de repondre a : "Quels mots-cles amenent du trafic depuis quel pays ?"
- [ ] Lier aussi a Google Ads (Admin → Product Links → Google Ads)
- [ ] Lier aussi a BigQuery si on veut des analyses avancees

#### B61 — BigQuery Export & Tableaux de Bord

**Pour un site international a 2000+ pages, les rapports GA4 standard ne suffisent pas.**

- [ ] Activer l'export BigQuery dans GA4 (Admin → Product Links → BigQuery)
- [ ] C'est GRATUIT (BigQuery free tier = 10 GB/mois)
- [ ] Permet des requetes SQL sur les donnees brutes (pays, langue, device, funnel)
- [ ] Proposer un dashboard Looker Studio avec :
  - Carte du monde des visiteurs
  - Top 20 pays par trafic et conversions
  - Funnel par langue
  - Revenue par pays de prestataire
  - Performance des profils par pays

#### B62 — UTM & Attribution Internationale

**Les campagnes marketing internationales doivent utiliser des UTM structures :**

```
utm_source=google&utm_medium=cpc&utm_campaign=lawyers-thailand&utm_content=fr
utm_source=facebook&utm_medium=paid&utm_campaign=expats-africa&utm_content=en
utm_source=influencer&utm_medium=referral&utm_campaign=chatter-europe&utm_content=fr
```

- [ ] Les liens marketing utilisent-ils des UTM ? → Verifier avec l'equipe
- [ ] Les UTM incluent-ils le pays/langue cible ?
- [ ] L'affiliate system (`?ref=CODE`) est-il tracke dans GA4 ? (le code capture `ref` dans sessionStorage)
- [ ] Proposer : envoyer `ref` comme parametre d'evenement GA4 pour tracker les affilies

---

## PHASE 19 — Audit Tracking Temps Reel & Monitoring

### B63 — Monitoring Analytics Continu

**Pour un site international 24/7, le monitoring analytics doit etre permanent :**

- [ ] Configurer des **alertes GA4** (Admin → Custom Alerts) :
  | Alerte | Condition | Urgence |
  |--------|-----------|---------|
  | Zero trafic | Sessions = 0 pendant 1h | CRITIQUE |
  | Chute trafic | Sessions -50% vs semaine precedente | HAUTE |
  | Zero conversions | Purchases = 0 pendant 24h | HAUTE |
  | Erreur tracking | Event count = 0 pendant 2h | CRITIQUE |
  | Nouveau pays | Premiere visite d'un pays jamais vu | INFO |
  | Spike trafic | Sessions +200% vs moyenne | INFO |

- [ ] Configurer un dashboard Temps Reel GA4 avec :
  - Utilisateurs actifs par pays (carte)
  - Pages vues par langue
  - Events par type
  - Conversions en cours
- [ ] Proposer : un cron Cloud Function qui verifie GA4 Data API toutes les heures et alerte via Telegram si zero hits

---

## PHASE 20 — Implementation Tracking Manquant

### Checklist des Implementations a Faire (Code)

**Composant `InternationalTracker.tsx` a creer :**

```typescript
// sos/src/components/analytics/InternationalTracker.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../../utils/ga4';

const CONTINENT_MAP: Record<string, string> = {
  'fr': 'EU', 'de': 'EU', 'es': 'EU', 'pt': 'EU', 'ru': 'EU',
  'us': 'NA', 'ca': 'NA', 'mx': 'NA',
  'cn': 'AS', 'in': 'AS', 'sa': 'AS',
  // ... completer pour tous les pays
};

export function InternationalTracker() {
  const location = useLocation();

  useEffect(() => {
    const locale = extractLocale(location.pathname); // fr-fr, en-us, etc.
    const [lang, country] = locale.split('-');
    const continent = CONTINENT_MAP[country] || 'OTHER';

    // User properties (persistent pour la session)
    if (window.gtag) {
      window.gtag('set', 'user_properties', {
        user_locale: locale,
        user_language: lang,
        user_country_site: country,
        user_continent: continent,
      });
    }

    // Content group avec chaque page_view
    const contentGroup = detectContentGroup(location.pathname);
    trackEvent('page_view', {
      page_locale: locale,
      page_language: lang,
      content_group: contentGroup,
    });
  }, [location.pathname]);

  return null;
}
```

- [ ] Creer ce composant
- [ ] Le monter dans App.tsx a cote de PageViewTracker et MetaPageViewTracker
- [ ] Verifier qu'il n'interfere pas avec le PageViewTracker existant (eviter triple page_view)

**Enrichir les events existants :**

| Fichier | Event | Parametres a ajouter |
|---------|-------|---------------------|
| ProviderProfile.tsx | view_provider (a creer) | provider_country, provider_type, provider_languages, page_locale |
| BookingRequest.tsx | begin_checkout | provider_country, buyer_locale |
| PaymentSuccess.tsx | purchase | provider_country, buyer_locale, call_language, item_variant |
| *RegisterForm.tsx | sign_up | registration_type, user_locale, user_country |
| CookieBanner.tsx | consent_update (a creer) | consent_analytics, consent_marketing, user_locale |

---

## PHASE 21 — Correction Zero Temps Reel (PRIORITE ABSOLUE)

> **C'est LA phase la plus importante. Sans donnees temps reel, impossible de valider quoi que ce soit.**

### Etape 1 : Activer la Modelisation du Consentement (Console GA4 — 2 min)

**Dans analytics.google.com → Property G-CTVDEL29CP :**
1. Admin → Data Settings → Data Collection
2. "Consent mode" → **ACTIVER la modelisation**
3. Google Signals → **ACTIVER**

**Impact** : GA4 utilisera les pings cookieless (analytics_storage: denied) pour MODELISER le trafic. Meme sans consentement, les donnees apparaitront (estimees).

### Etape 2 : Corriger le Double-Check Consent dans ga4.ts

**Probleme** : `ga4.ts` verifie `hasAnalyticsConsent()` avant CHAQUE event. Mais c'est REDONDANT — Consent Mode V2 gere deja ca au niveau de gtag(). Le code React bloque des events que gtag() aurait acceptes.

```typescript
// AVANT (ga4.ts L72) :
const consentGranted = hasAnalyticsConsent();
actualGtag('config', GA4_MEASUREMENT_ID, {
  analytics_storage: consentGranted ? 'granted' : 'denied', // REDONDANT
});

// APRES (laisser Consent Mode gerer) :
actualGtag('config', GA4_MEASUREMENT_ID, {
  anonymize_ip: true,
  send_page_view: false, // Evite le double page_view avec index.html
  // PAS de analytics_storage ici — Consent Mode le gere dans index.html
});
```

- [ ] Retirer le check `hasAnalyticsConsent()` de `configureGA4()` dans ga4.ts
- [ ] Retirer le `analytics_storage` de la config ga4.ts (deja gere par index.html Consent Mode)
- [ ] Garder `send_page_view: false` pour eviter le double page_view
- [ ] Laisser `trackEvent()` envoyer sans condition — Consent Mode bloquera si necessaire

### Etape 3 : Corriger le Double Page View

**✅ CORRIGE** : `send_page_view: false` dans index.html. PageViewTracker (App.tsx L1063) gere seul les page_view.

- [ ] VERIFIER dans Network tab : UN SEUL hit page_view par navigation (pas 0, pas 2)
- [ ] VERIFIER que PageViewTracker fonctionne bien apres le deploy

### Etape 4 : Geo-Consent (Maximiser les Donnees hors EU)

**Impact ENORME** : ~130 pays sur 197 n'exigent PAS le consentement. Actuellement, TOUS les visiteurs sont traites comme EU → analytics bloquees pour tout le monde.

```html
<!-- index.html : remplacer le consent default -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }

  // Detecter si le pays requiert le consentement
  var requiresConsent = true; // Default: require consent (safe)
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    // Timezones EU/UK/BR qui requierent le consentement
    var consentZones = ['Europe/', 'Atlantic/Reykjavik', 'America/Sao_Paulo',
      'America/Fortaleza', 'America/Recife', 'America/Bahia', 'America/Belem'];
    requiresConsent = consentZones.some(function(z) { return tz.startsWith(z); });
  } catch(e) {}

  gtag('consent', 'default', {
    'ad_storage': requiresConsent ? 'denied' : 'granted',
    'ad_user_data': requiresConsent ? 'denied' : 'granted',
    'ad_personalization': requiresConsent ? 'denied' : 'granted',
    'analytics_storage': requiresConsent ? 'denied' : 'granted',
    'functionality_storage': requiresConsent ? 'denied' : 'granted',
    'personalization_storage': requiresConsent ? 'denied' : 'granted',
    'security_storage': 'granted',
    'wait_for_update': 500
  });
</script>
```

- [ ] Implementer la detection timezone → consent requis ou non
- [ ] Les visiteurs hors EU/BR/UK auront analytics_storage: 'granted' par defaut
- [ ] Le Cookie Banner s'affiche toujours mais NE BLOQUE PAS les analytics hors EU
- [ ] **VERIFIER avec un avocat** que cette approche est legalement valide
- [ ] Impact attendu : recuperer ~50-60% du trafic mondial actuellement perdu

### Etape 5 : Ajouter le GTM noscript

```html
<!-- index.html : ajouter juste apres <body> -->
<noscript>
  <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P53H3RLF"
    height="0" width="0" style="display:none;visibility:hidden"></iframe>
</noscript>
```

- [ ] Ajouter dans index.html apres le `<body>`
- [ ] Le noscript permet a GTM de fonctionner sans JavaScript (bots, crawlers)

### Etape 6 : Verification Temps Reel

**Apres les corrections, tester IMMEDIATEMENT :**

```
1. Deployer (git push → Cloudflare auto-deploy)
2. Attendre 2 minutes
3. Ouvrir sos-expat.com dans un navigateur SANS ad-blocker, SANS extensions
4. Cliquer "Accepter tout" sur le Cookie Banner
5. Naviguer sur 3-4 pages
6. Ouvrir GA4 → Rapports → Temps Reel
7. L'utilisateur et les page views doivent apparaitre dans les 30 secondes

Si ca fonctionne → tester un scenario hors EU :
1. Utiliser un VPN vers les USA ou l'Asie
2. Ouvrir le site en navigation privee (pas de localStorage)
3. NE PAS cliquer sur le banner
4. Si geo-consent est implemente : les hits doivent apparaitre quand meme
```

### Etape 7 : Script de Diagnostic Console (a lancer en prod)

```javascript
// COLLER DANS LA CONSOLE SUR sos-expat.com APRES DEPLOY
(function() {
  console.log('====== DIAGNOSTIC TEMPS REEL GA4 ======');

  // 1. gtag existe ?
  var gtagOk = typeof window.gtag === 'function';
  console.log(gtagOk ? '✅ gtag() defini' : '❌ gtag() ABSENT → GA4 pas charge');

  // 2. dataLayer
  var dl = window.dataLayer || [];
  console.log('📦 dataLayer entries:', dl.length);
  dl.forEach(function(e, i) {
    if (Array.isArray(e) && (e[0] === 'consent' || e[0] === 'config' || e[0] === 'event')) {
      console.log('  [' + i + ']', e[0], e[1], typeof e[2] === 'object' ? JSON.stringify(e[2]).substring(0, 100) : e[2]);
    }
  });

  // 3. Consentement
  var consent = localStorage.getItem('cookie_consent');
  var prefs = localStorage.getItem('cookie_preferences');
  console.log(consent ? '✅ Consent: ' + consent : '❌ Consent: PAS DONNE (banner jamais clique)');
  if (prefs) {
    var p = JSON.parse(prefs);
    console.log('  analytics:', p.analytics ? '✅ granted' : '❌ denied');
    console.log('  marketing:', p.marketing ? '✅ granted' : '❌ denied');
  } else {
    console.log('  ❌ Aucune preference sauvee → TOUT BLOQUE');
  }

  // 4. Cookies GA4
  var ga = document.cookie.match(/_ga=([^;]+)/);
  console.log(ga ? '✅ Cookie _ga: ' + ga[1] : '❌ Cookie _ga ABSENT (analytics_storage denied)');

  // 5. Scripts charges
  var gaScript = document.querySelector('script[src*="gtag/js"]');
  var gtmScript = document.querySelector('script[src*="gtm.js"]');
  console.log(gaScript ? '✅ GA4 script charge: ' + gaScript.src : '❌ GA4 script PAS CHARGE');
  console.log(gtmScript ? '✅ GTM script charge: ' + gtmScript.src : '⚠️ GTM script pas trouve dans DOM (charge dynamiquement ?)');

  // 6. Test envoi
  if (gtagOk) {
    window.gtag('event', 'diagnostic_realtime_test', {
      debug_mode: true,
      test_time: new Date().toISOString()
    });
    console.log('📤 Event test envoye → verifier GA4 Temps Reel dans 30s');
    console.log('   Si VISIBLE → GA4 fonctionne ✅');
    console.log('   Si PAS VISIBLE → consent bloque ou ad-blocker');
  }

  // 7. Verifier requetes reseau
  console.log('');
  console.log('🌐 Pour verifier les requetes :');
  console.log('   1. Ouvrir Network tab');
  console.log('   2. Filtrer "collect" ou "google-analytics"');
  console.log('   3. Chercher /g/collect → doit retourner 204');
  console.log('   4. Dans les params, chercher "gcs=" :');
  console.log('      gcs=G100 = analytics DENIED ❌');
  console.log('      gcs=G110 = analytics GRANTED mais ads DENIED');
  console.log('      gcs=G111 = TOUT GRANTED ✅');

  console.log('====== FIN DIAGNOSTIC ======');
})();
```

---

## PHASE 22 — Audit Donnees Erronees (98% Belgique, Non Assigned)

> **PROBLEME CONSTATE EN PRODUCTION** : GA4 montre 98% du trafic depuis la Belgique.
> C'est IMPOSSIBLE pour un site international 197 pays.
> De plus, beaucoup de dimensions affichent "not set" ou "(non assigned)".

### 22A — Pourquoi 98% Belgique ? (INVESTIGATION CRITIQUE)

**Causes possibles (par ordre de probabilite)** :

| # | Cause | Explication | Verification |
|---|-------|-------------|-------------|
| 1 | **Puppeteer rend depuis la Belgique** | `renderForBotsV2` tourne en `europe-west1` (Belgique). Si GA4 s'execute DANS Puppeteer, les hits viennent de l'IP du serveur Cloud Functions → Belgique | Verifier si le rendu Puppeteer execute les scripts GA4 |
| 2 | **Bots/crawlers comptabilises** | Googlebot, BingBot, etc. passent par le CDN EU → geolocalises en Belgique | Verifier si les bots sont filtres dans GA4 |
| 3 | **Cloudflare Workers** | Si un Worker intercepte les requetes et les re-envoie, l'IP source = IP Cloudflare (EU) | Verifier le Worker worker.js |
| 4 | **Warm cache SSR** | `warm-ssr-cache.js` est execute depuis un serveur → les hits de prechauffage comptent comme Belgique | Verifier si le warm cache declenche GA4 |
| 5 | **GA4 Consent Mode denied** | Sans cookies (_ga), GA4 ne peut PAS determiner le pays → fallback sur l'IP du premier hit (serveur) | Verifier le pourcentage d'utilisateurs avec analytics_storage granted vs denied |
| 6 | **Google Signals pas active** | Sans Google Signals, la geolocalisation est basee UNIQUEMENT sur l'IP → moins precise | Activer Google Signals |

**VERIFICATION IMMEDIATE** :
- [ ] Ouvrir GA4 → Rapports → Temps Reel → cliquer sur "Par pays" dans la carte
- [ ] Les 8 utilisateurs actuels : sont-ils tous en Belgique ? Ou certains sont ailleurs ?
- [ ] Si temps reel montre 8 pays differents mais les rapports montrent 98% Belgique → les rapports incluent les hits Puppeteer/bots

**ACTION #1 : Verifier si Puppeteer execute GA4**
```
Le dynamic renderer (renderForBotsV2) utilise Puppeteer pour rendre les pages.
Si Puppeteer execute le JavaScript GA4 → chaque rendu = un faux "visiteur" depuis la Belgique.

POUR VERIFIER :
  1. Regarder les logs de renderForBotsV2 des dernieres 24h
  2. Compter le nombre de rendus
  3. Comparer avec le nombre de "visiteurs belges" dans GA4
  4. Si les deux chiffres sont proches → Puppeteer EST la cause

FIX : Empecher GA4 de s'executer dans Puppeteer
  Option A : Ajouter ?bot=true dans l'URL Puppeteer → GA4 detecte et skip
  Option B : Puppeteer bloque les requetes vers google-analytics.com (page.setRequestInterception)
  Option C : Ajouter window.__IS_PUPPETEER = true dans Puppeteer → GA4 verifie avant d'envoyer
```

- [ ] Verifier dans `dynamicRender.ts` : Puppeteer bloque-t-il les requetes analytics ?
- [ ] Si NON → CHAQUE rendu Puppeteer genere un faux hit GA4 depuis la Belgique → c'est la cause des 98%
- [ ] **FIX PROPOSE** : dans renderForBotsV2, ajouter `page.setRequestInterception(true)` et bloquer les requetes vers `google-analytics.com`, `googletagmanager.com/gtag`, `facebook.com/tr`

**ACTION #2 : Filtrer le trafic interne/bots dans GA4**
- [ ] GA4 → Admin → Data Streams → Web → Configure tag settings → "Define internal traffic"
- [ ] Ajouter une regle : IP = IP du serveur Cloud Functions europe-west1 → marquer comme "internal"
- [ ] GA4 → Admin → Data Settings → Data Filters → Creer un filtre "Exclude internal traffic"
- [ ] Verifier que le filtre est en mode "Active" (pas "Testing")

**ACTION #3 : Verifier le warm-ssr-cache.js**
- [ ] Le script `warm-ssr-cache.js` pre-chauffe le cache en appelant renderForBotsV2
- [ ] Si Puppeteer execute GA4 pendant le warm → des dizaines de faux hits belges a chaque warm
- [ ] Solution : meme fix que Action #1 (bloquer analytics dans Puppeteer)

### 22B — Pourquoi "Non Assigned" / "Not Set" ?

**"(not set)" et "(not assigned)" dans GA4 signifient que la dimension n'a pas de valeur.**

| Dimension | "not set" signifie | Cause probable | Fix |
|-----------|-------------------|---------------|-----|
| **Pays** | GA4 ne connait pas le pays | Consent denied (pas de cookie) OU IP serveur | Activer Google Signals + Consent Modeling |
| **Source/Medium** | Trafic sans referrer ni UTM | Acces direct OU redirect qui perd le referrer | Verifier les redirections (perdent-elles le referrer ?) |
| **Landing page** | Page d'entree inconnue | Page view pas envoye OU SPA routing | Verifier PageViewTracker envoie page_location |
| **Content group** | Pas de content group defini | Non implemente | Implementer (Phase 18, composant InternationalTracker) |
| **Session source** | Source de la session inconnue | Premier hit en mode denied (pas de session) | Activer url_passthrough (deja fait) |
| **Campaign** | Pas d'UTM | Trafic organique/direct | Normal — ajouter UTM aux liens marketing |
| **User properties** | Pas de proprietes definies | Non envoyes | Implementer setUserProperties (Phase 18) |

**VERIFICATION** :
- [ ] Dans GA4 → Rapports → Acquisition → Vue d'ensemble : quel % est "Direct / (none)" ?
- [ ] Si > 80% est Direct → les redirections perdent le referrer OU pas d'UTM
- [ ] Dans GA4 → Explorer → Libre → Dimension "Pays" → combien de "(not set)" ?
- [ ] Si > 50% est "(not set)" → les hits sont en mode denied (pas de geolocalisation)

**FIX ANTI "NOT SET"** :
1. **Activer Google Signals** (console GA4) → meilleure geolocalisation
2. **Activer Consent Mode Modeling** (console GA4) → modelise les hits denied
3. **Envoyer des user properties** avec chaque hit (locale, langue, pays du site)
4. **Conserver les UTM** dans les redirections (verifier que `_redirects` preserve les query params)
5. **Verifier que le PageViewTracker envoie** `page_location` et `page_referrer`

### 22C — Comprendre Temps Reel GA4 (pour l'utilisateur)

```
GA4 Temps Reel affiche :
  "8 utilisateurs actifs au cours des 30 dernieres minutes"
  "9 vues au cours des 30 dernieres minutes"

SIGNIFICATION :
  - 8 utilisateurs = 8 personnes DISTINCTES (basees sur le client_id du cookie _ga)
  - 9 vues = 9 pages vues au total par ces 8 personnes
  - Donc 1 personne a vu 2 pages, les 7 autres ont vu 1 page chacune

COMMENT VOIR D'OU VIENNENT LES VISITEURS EN TEMPS REEL :
  1. GA4 → Rapports → Temps Reel
  2. Section "Utilisateurs par pays" (carte ou liste)
  3. Cliquer sur un pays pour voir les details
  4. OU : ajouter une dimension "Pays" dans le widget temps reel

ATTENTION : Si 98% temps reel = Belgique → probablement des hits Puppeteer
  Les VRAIS visiteurs devraient etre repartis dans plusieurs pays
```

### 22D — Audit des Redirections et Perte de Referrer

**PROBLEME** : Les redirections 301 dans `_redirects` peuvent perdre le `referrer` HTTP.

```
Scenario :
  1. Google montre sos-expat.com/fr/tarifs dans les resultats
  2. L'utilisateur clique → arrive sur /fr/tarifs
  3. _redirects : /fr/* → /fr-fr/:splat 301
  4. Le navigateur redirige vers /fr-fr/tarifs
  5. Le referrer original (google.com) est PERDU ou CONSERVE ?
     → Depend du navigateur et de la politique Referrer-Policy
  6. Si perdu → GA4 voit "Direct / (none)" au lieu de "google / organic"

VERIFICATION :
  - Verifier le header Referrer-Policy dans _headers
  - Actuel : strict-origin-when-cross-origin → OK (conserve le referrer pour same-origin)
  - MAIS : les redirections cross-origin perdent le path referrer
```

- [ ] Verifier que `_headers` a `Referrer-Policy: strict-origin-when-cross-origin` (pas `no-referrer`)
- [ ] Tester : cliquer un lien Google vers /fr/tarifs → verifier dans GA4 que la source = google/organic (pas direct)
- [ ] Si la source est perdue → changer la politique referrer ou utiliser des UTM

### 22E — Audit Puppeteer & GA4 (CAUSE RACINE PROBABLE du 98% Belgique)

**Fichier** : `sos/firebase/functions/src/seo/dynamicRender.ts`

**QUESTION CRITIQUE** : Puppeteer execute-t-il les scripts GA4 quand il rend une page ?

```
renderForBotsV2 :
  1. Lance Puppeteer (Chromium headless)
  2. Navigue vers l'URL via Cloudflare Pages origin
  3. Attend que React monte (data-provider-loaded, h1, etc.)
  4. Snapshote le HTML
  5. Retourne le HTML au bot (Googlebot, etc.)

PENDANT L'ETAPE 2-3 :
  - Le navigateur Puppeteer charge index.html
  - index.html contient le script GA4 inline
  - SI Puppeteer ne bloque PAS ce script → GA4 s'execute
  - GA4 envoie un hit page_view depuis l'IP du serveur (europe-west1 = Belgique)
  - Ce hit est comptabilise dans GA4 comme un "visiteur belge"

CONSEQUENCE :
  - Chaque rendu Puppeteer = 1 faux visiteur belge
  - 100 rendus/jour = 100 faux visiteurs belges/jour
  - Les vrais visiteurs (20-30/jour ?) sont noyes dans les faux → 98% Belgique
```

- [ ] Verifier dans dynamicRender.ts : y a-t-il un `page.setRequestInterception(true)` ?
- [ ] Si NON → c'est la cause confirmee
- [ ] **FIX** : Ajouter dans renderForBotsV2, AVANT la navigation :

```typescript
// Block analytics scripts in Puppeteer (prevent false hits from server IP)
await page.setRequestInterception(true);
page.on('request', (req) => {
  const url = req.url();
  if (
    url.includes('google-analytics.com') ||
    url.includes('googletagmanager.com/gtag') ||
    url.includes('facebook.com/tr') ||
    url.includes('connect.facebook.net') ||
    url.includes('sentry.io')
  ) {
    req.abort();
  } else {
    req.continue();
  }
});
```

- [ ] Apres le fix : deployer et attendre 48h
- [ ] Verifier que le pourcentage "Belgique" chute drastiquement
- [ ] Les vrais visiteurs devraient apparaitre (repartis dans plusieurs pays)

---

## PHASE 23 — Tests E2E Analytics Bout en Bout

> **Verification REELLE que chaque element analytics fonctionne en production.**

### 23A — Test E2E : GA4 Page Views

```
POUR 10 pages (homepage FR, EN, ES + tarifs FR + profil × 3 + FAQ + landing) :
  1. Ouvrir la page dans Chrome SANS ad-blocker, SANS extensions
  2. Accepter le Cookie Banner (analytics = granted)
  3. Ouvrir Network tab → filtrer "collect"
  4. Verifier qu'un hit page_view est envoye vers google-analytics.com/g/collect

  POUR CHAQUE HIT, verifier les parametres :
    - tid = G-CTVDEL29CP (measurement ID correct)
    - en = page_view (event name)
    - dl = URL complete de la page (page_location)
    - dt = titre de la page (page_title)
    - gcs = G111 (consent granted) — PAS G100 (denied)
    - _ga cookie present (client_id)

  SI UN CHECK ECHOUE → documenter URL + parametre manquant
```

- [ ] Minimum : 5 pages testees
- [ ] Objectif : 100% de hits avec tous les parametres

### 23B — Test E2E : GA4 Navigation SPA

```
1. Ouvrir /fr-fr/ (homepage)
2. Verifier 1 hit page_view dans Network
3. Cliquer "Tarifs" → /fr-fr/tarifs
4. Verifier 1 NOUVEAU hit page_view (dl = /fr-fr/tarifs)
5. Cliquer "FAQ" → /fr-fr/faq
6. Verifier 1 NOUVEAU hit page_view (dl = /fr-fr/faq)
7. Cliquer retour (browser back) → /fr-fr/tarifs
8. Verifier 1 NOUVEAU hit page_view

TOTAL : 4 page_view pour 4 navigations
SI < 4 → PageViewTracker ne fonctionne pas sur toutes les navigations
SI > 4 → Double page_view (bug)
```

### 23C — Test E2E : Consent Mode

```
TEST 1 — Premier visit sans consentement :
  1. Ouvrir en navigation privee (pas de localStorage)
  2. NE PAS cliquer sur le Cookie Banner
  3. Network → chercher /g/collect
  4. Si un hit existe : verifier gcs=G100 (denied) — donnee restreinte
  5. Verifier que le cookie _ga N'EXISTE PAS

TEST 2 — Apres acceptation :
  1. Cliquer "Accepter tout" sur le Cookie Banner
  2. Network → un nouveau hit /g/collect ? gcs=G111 (granted) ?
  3. Le cookie _ga est-il cree ?
  4. localStorage cookie_preferences → analytics: true ?

TEST 3 — Reload apres acceptation :
  1. Recharger la page (F5)
  2. Le Cookie Banner NE reapparait PAS ?
  3. Le premier hit a gcs=G111 (consent restaure depuis localStorage) ?
  4. Le cookie _ga est toujours present ?

TEST 4 — Geo-Consent (hors EU) :
  1. Utiliser un VPN vers les USA ou l'Asie
  2. Ouvrir en navigation privee
  3. NE PAS cliquer sur le banner
  4. Verifier : gcs=G111 ? (consent granted par defaut hors EU)
  5. Le cookie _ga est-il cree SANS clic banner ?
```

### 23D — Test E2E : Geolocalisation

```
POUR 5 pays differents (France, USA, Thailande, Senegal, Bresil) :
  1. Utiliser un VPN vers ce pays
  2. Ouvrir sos-expat.com en navigation privee
  3. Accepter le consentement
  4. Naviguer sur 2-3 pages
  5. Verifier dans GA4 Temps Reel → "Par pays"
  6. Le pays du VPN apparait-il ? (pas Belgique)

SI Belgique apparait malgre VPN USA → Puppeteer pollue les donnees
SI le bon pays apparait → le fix Puppeteer a fonctionne
```

### 23E — Test E2E : Events & Conversions

```
POUR chaque event business :
  1. sign_up : creer un compte test → event sign_up dans GA4 ?
  2. begin_checkout : commencer un booking → event dans GA4 ?
  3. purchase : simuler un paiement test → event dans GA4 + Google Ads + Meta ?
  4. view_provider : visiter un profil → event dans GA4 ?
  5. generate_lead : soumettre un booking → event dans GA4 + Google Ads ?

POUR CHAQUE EVENT, verifier dans Network :
  - en = nom_event
  - Les parametres sont presents (value, currency, items, etc.)
  - L'event apparait dans GA4 → Temps Reel → "Nombre d'evenements par nom"
```

### 23F — Test E2E : GTM

```
1. Se connecter a tagmanager.google.com
2. Cliquer "Preview" → entrer https://sos-expat.com
3. Tag Assistant s'ouvre

VERIFIER :
  a. Container GTM-P53H3RLF charge ? ("Container Loaded")
  b. Balises qui FIRE :
     - GA4 Configuration ? Avec G-CTVDEL29CP ?
     - Google Ads Conversion ?
     - Custom HTML (Meta Pixel ?) ?
  c. Balises qui NE FIRE PAS ? Pourquoi ?
  d. Consent Mode detecte ? (onglet "Consent")
  e. Naviguer vers une autre page → trigger "History Change" fire ?
  f. Pas de DOUBLON avec GA4 inline de index.html
```

### 23G — Test E2E : Meta Pixel

```
1. Installer l'extension Chrome "Meta Pixel Helper"
2. Ouvrir sos-expat.com
3. L'extension montre-t-elle le Pixel actif ?
4. PageView fire au chargement ?
5. Naviguer → nouveau PageView ?
6. Verifier dans Meta Events Manager (business.facebook.com) :
   a. Les events arrivent ?
   b. Le Pixel ID est correct ?
   c. Advanced Matching fonctionne ? (donnees hashees)
   d. Server Events (CAPI) arrivent aussi ?
```

### 23H — Test E2E : User Properties Internationales

```
APRES implementation du composant InternationalTracker (Phase 18) :

1. Ouvrir /fr-fr/tarifs
2. Console : gtag('get', 'G-CTVDEL29CP', 'user_properties', callback)
3. Verifier :
   - user_locale = "fr-fr"
   - user_language = "fr"
   - user_country_site = "fr"
4. Naviguer vers /en-us/pricing
5. Verifier :
   - user_locale = "en-us"
   - user_language = "en"
   - user_country_site = "us"
```

### 23I — Test E2E : Donnees dans GA4 Rapports (48h apres corrections)

```
APRES 48h de donnees post-correction :

1. GA4 → Rapports → Acquisition → Vue d'ensemble :
   - Source/Medium : Google / organic present ? (pas 100% Direct)
   - Sessions > 0 ?
   - % "not set" < 20% ?

2. GA4 → Rapports → Engagement → Pages et ecrans :
   - Les pages apparaissent-elles avec les bonnes URLs ?
   - Pas de doublons (meme page avec 2 URLs differentes) ?

3. GA4 → Rapports → Demographie → Vue d'ensemble :
   - Pays : repartition credible ? (PAS 98% Belgique)
   - Si Google Signals actif : age, genre visibles ?

4. GA4 → Rapports → Engagement → Evenements :
   - page_view present (le plus frequent) ?
   - sign_up, begin_checkout, purchase presents ?
   - Pas de doublons (deux page_view par navigation ?)

5. GA4 → Rapports → Temps Reel :
   - Utilisateurs actifs corresponds au trafic reel ?
   - Pays diversifie (pas 98% Belgique) ?
```

### 23J — Test E2E : Script de Diagnostic Complet (Console)

```javascript
// COLLER DANS LA CONSOLE SUR sos-expat.com
(function() {
  console.log('====== DIAGNOSTIC ANALYTICS COMPLET V3 ======');

  // 1. GA4
  console.log('--- GA4 ---');
  console.log('gtag:', typeof window.gtag === 'function' ? 'OK' : 'ABSENT');
  console.log('Measurement ID attendu: G-CTVDEL29CP');

  // 2. Consent
  console.log('--- Consent ---');
  var prefs = localStorage.getItem('cookie_preferences');
  if (prefs) {
    var p = JSON.parse(prefs);
    console.log('analytics:', p.analytics ? 'GRANTED' : 'DENIED');
    console.log('marketing:', p.marketing ? 'GRANTED' : 'DENIED');
  } else {
    console.log('PAS DE CONSENT (banner jamais clique)');
  }

  // 3. Geo-Consent
  console.log('--- Geo-Consent ---');
  console.log('Requires consent (EU/BR):', window.__requiresConsent);
  console.log('Is local dev:', window.__isLocalDev);

  // 4. Cookies
  console.log('--- Cookies ---');
  var ga = document.cookie.match(/_ga=([^;]+)/);
  console.log('_ga:', ga ? ga[1] : 'ABSENT (consent denied ou ad-blocker)');

  // 5. Network (derniers hits)
  var requests = performance.getEntriesByType('resource');
  var gaHits = requests.filter(r => r.name.includes('google-analytics.com/g/collect'));
  console.log('--- Network ---');
  console.log('GA4 hits envoyes:', gaHits.length);
  gaHits.forEach(function(h, i) {
    // Extract gcs parameter
    var gcsMatch = h.name.match(/gcs=([^&]+)/);
    var gcs = gcsMatch ? gcsMatch[1] : 'N/A';
    console.log('  Hit ' + (i+1) + ': gcs=' + gcs + ' (' +
      (gcs === 'G111' ? 'GRANTED' : gcs === 'G100' ? 'DENIED' : 'PARTIEL') + ')');
  });

  // 6. GTM
  console.log('--- GTM ---');
  var gtmScript = document.querySelector('script[src*="gtm.js"]');
  console.log('GTM script:', gtmScript ? 'CHARGE' : 'NON CHARGE');
  console.log('dataLayer entries:', window.dataLayer?.length || 0);

  // 7. Meta Pixel
  console.log('--- Meta Pixel ---');
  console.log('fbq:', typeof window.fbq === 'function' ? 'OK' : 'ABSENT');

  // 8. PageViewTracker
  var pageViewHits = gaHits.filter(function(h) { return h.name.includes('en=page_view'); });
  console.log('--- Page Views ---');
  console.log('page_view hits:', pageViewHits.length, '(attendu: 1 par page)');

  // 9. Diagnostic embarque
  if (window.ga4Diagnostic) {
    console.log('--- ga4Diagnostic() ---');
    window.ga4Diagnostic();
  }

  console.log('====== FIN DIAGNOSTIC V3 ======');
})();
```

---

## PHASE 24 — Cross-Checks Donnees (Croisements Multi-Systemes)

> **Ces croisements verifient que les donnees GA4 correspondent a la REALITE.**
> Si GA4 dit 10 purchases mais Stripe dit 15 → il y a un probleme.

### Cross-Check A : GA4 purchase ↔ Stripe paiements reels

```
Pour les 30 derniers jours :
  1. GA4 → Rapports → Engagement → Evenements → purchase → compter
  2. Stripe Dashboard → Payments → compter les paiements reussis
  3. Comparer :
     GA4 purchases = Stripe payments ?
     SI GA4 < Stripe → des purchases ne sont PAS trackees (event manquant)
     SI GA4 > Stripe → des faux events (doublons ou tests)
  4. Verifier les montants :
     GA4 total value (purchase) = Stripe total revenue ?
```

### Cross-Check B : GA4 sign_up ↔ Firestore inscriptions

```
Pour les 30 derniers jours :
  1. GA4 → Evenements → sign_up → compter
  2. Firestore → users WHERE createdAt > 30 jours → compter
  3. Comparer :
     GA4 sign_ups = Firestore new users ?
     SI GA4 < Firestore → sign_up event pas envoye dans certains cas
     SI GA4 > Firestore → doublons (signup fire 2x ?)
```

### Cross-Check C : GA4 ↔ Meta Events Manager

```
Pour les 7 derniers jours :
  1. GA4 → purchase count, lead count, page_view count
  2. Meta Events Manager → Purchase count, Lead count, PageView count
  3. Les chiffres doivent etre PROCHES (pas identiques a cause des ad-blockers)
  4. SI GA4 << Meta → GA4 est bloque (consent ou ad-blocker)
  5. SI Meta << GA4 → Meta Pixel est bloque ou mal configure
  6. Ratio attendu : GA4 ≈ 70-80% de Meta (car GA4 respecte le consent, Meta non en dehors EU)
```

### Cross-Check D : Puppeteer rendus ↔ faux visiteurs Belgique

```
AVANT le fix Puppeteer (baseline) :
  1. Cloud Functions logs → compter les invocations renderForBotsV2 des 24h
  2. GA4 → Rapports → Demographie → Pays → Belgique → users 24h
  3. SI rendus ≈ visiteurs Belgique → CONFIRME que Puppeteer = cause du 98%

APRES le fix Puppeteer (48h plus tard) :
  4. Meme comparaison → visiteurs Belgique devrait chuter de ~90%
  5. Les vrais visiteurs (autres pays) deviennent visibles
```

### Cross-Check E : Referral Exclusions

```
GA4 → Rapports → Acquisition → Vue d'ensemble → Source/Medium :
  Verifier que ces sources n'apparaissent PAS :
  - stripe.com / referral (redirect retour paiement)
  - paypal.com / referral
  - checkout.stripe.com / referral
  - accounts.google.com / referral (OAuth redirect)

  SI elles apparaissent → Ajouter en "Referral Exclusions" :
    GA4 → Admin → Data Streams → Web → Configure tag → List unwanted referrals
    Ajouter : stripe.com, paypal.com, checkout.stripe.com, accounts.google.com
```

### Cross-Check F : UTM survie aux redirections 301

```
1. Construire un lien UTM : https://sos-expat.com/fr/tarifs?utm_source=test&utm_medium=audit&utm_campaign=check
2. Ce lien sera redirige par _redirects : /fr/* → /fr-fr/:splat 301
3. Ouvrir le lien dans un navigateur
4. Verifier :
   a. L'URL finale contient-elle les UTM ? /fr-fr/tarifs?utm_source=test&utm_medium=audit&utm_campaign=check
   b. Dans GA4 Temps Reel → Source = "test", Medium = "audit" ?
   c. Si les UTM sont PERDUS → les redirections _redirects ne preservent pas les query params

FIX si perdu :
  Cloudflare Pages _redirects avec :splat preserve les query params par defaut
  MAIS : le script de redirect locale dans index.html les preserve-t-il ? (verifier le code JS)
```

### Cross-Check G : User ID apres login

```
1. Se connecter avec un compte test
2. Console : localStorage.getItem('cookie_preferences') → analytics: true ?
3. Network → chercher un hit /g/collect avec uid= ou user_id=
4. GA4 → Explorer → User Explorer → le user_id apparait-il ?

SI user_id absent :
  Verifier que setUserId() est appele apres login (dans quel composant ?)
  Verifier que le uid Firebase est envoye a GA4
```

### Cross-Check H : Cookie _ga durée de vie et cross-domain

```
1. Apres avoir accepte le consentement :
   Console : document.cookie → chercher _ga
   Verifier l'expiration : doit etre ~2 ans
   Verifier le domaine : .sos-expat.com (avec le point = inclut les sous-domaines)

2. Cross-domain :
   Ouvrir ia.sos-expat.com → le meme _ga cookie est-il present ?
   Ouvrir multi.sos-expat.com → le meme _ga cookie est-il present ?
   SI NON → les utilisateurs sont comptes comme NOUVEAUX sur chaque sous-domaine
   FIX : configurer le cross-domain tracking dans GA4 ou utiliser cookie_domain: 'sos-expat.com'
```

### Cross-Check I : Revenue GA4 = CA reel

```
Pour les 30 derniers jours :
  1. GA4 → Rapports → Monetisation → Vue d'ensemble → Total revenue
  2. Stripe Dashboard → total des paiements captures
  3. Les montants doivent etre IDENTIQUES (meme devise EUR)
  4. SI GA4 revenue = 0 → l'event purchase n'envoie pas la value/currency
  5. SI GA4 revenue < Stripe → certains purchases ne sont pas trackes
  6. Verifier que currency est TOUJOURS 'EUR' (pas un mix EUR/USD qui fausse les totaux)
```

### Cross-Check J : Funnel e-commerce complet

```
GA4 → Explorer → Funnel exploration :
  Etape 1 : page_view (page profil prestataire) → combien ?
  Etape 2 : begin_checkout (page CallCheckout) → combien ?
  Etape 3 : add_payment_info (saisie carte) → combien ?
  Etape 4 : purchase (paiement reussi) → combien ?

  Taux de conversion par etape :
    Etape 1→2 : X% (taux de clic "Reserver")
    Etape 2→3 : X% (taux de saisie carte)
    Etape 3→4 : X% (taux de paiement reussi)

  SI une etape = 0 → l'event correspondant n'est PAS envoye → CORRIGER
  SI le taux 3→4 < 50% → probleme de paiement (echecs Stripe ?)
```

### Cross-Check K : Mobile vs Desktop

```
Tester sur :
  1. Chrome Desktop (sans extensions) → hits envoyes ?
  2. Chrome Mobile (Android) → hits envoyes ?
  3. Safari Mobile (iPhone) → hits envoyes ?
  4. Samsung Internet → hits envoyes ?

Pour CHAQUE :
  - Cookie Banner s'affiche ?
  - Consent fonctionne ?
  - Page views trackes ?
  - Events fires ?

ATTENTION Safari :
  - ITP (Intelligent Tracking Prevention) limite les cookies 1st-party a 7 jours
  - Le cookie _ga est-il renouvele a chaque visite ?
  - GA4 fonctionne-t-il correctement malgre ITP ?
```

### Cross-Check L : GA4 ↔ Google Search Console

```
1. GA4 → Admin → Product Links → Search Console
2. Est-il lie ? → SI NON : le lier maintenant
3. Si lie :
   GA4 → Rapports → Acquisition → Search Console → Queries
   Les requetes de recherche apparaissent-elles ?
   Le CTR et les impressions sont-ils coherents avec GSC direct ?
```

### Cross-Check M : GA4 ↔ Google Ads

```
1. GA4 → Admin → Product Links → Google Ads
2. Est-il lie ? → SI NON : le lier maintenant (avec AW-10842996788)
3. Si lie :
   Les conversions GA4 remontent-elles dans Google Ads ?
   Le ROAS est-il calcule correctement ?
   Les audiences GA4 sont-elles exploitables dans Google Ads ?
```

### Cross-Check N : Data Sampling GA4

```
GA4 → Explorer → Libre → creer un rapport avec 90 jours :
  Verifier le badge en haut :
  - "Unsampled" ✅ → donnees completes
  - "Sampled (based on X%)" ⚠️ → donnees echantillonnees (peut fausser les metriques)

SI echantillonne :
  - Reduire la plage de dates
  - Utiliser BigQuery export pour les donnees brutes (pas d'echantillonnage)
```

---

## PHASE 25 — Verification Analytics 197 Pays

> **Le site est present dans 197 pays. L'analytics doit PROUVER que le trafic est mondial.**

### 25A — Geolocalisation Exacte par Pays

```
APRES correction du bug Puppeteer (Phase 22E) + 7 jours de donnees :

1. GA4 → Rapports → Demographie → Pays :
   - Combien de pays differents apparaissent ?
   - Top 10 pays par sessions
   - Belgique est-elle encore en #1 ? Si oui → fix Puppeteer n'a pas fonctionne

2. Verifier la coherence :
   - Les pays du trafic correspondent-ils aux pays des prestataires ?
   - Les pays des inscriptions correspondent-ils aux pays du trafic ?
   - Si le site a des prestataires en Thailande mais 0 trafic Thailande → probleme de SEO local
```

### 25B — Geo-Consent par Zone

```
Verifier que le Geo-Consent fonctionne correctement par zone :

Zone EU/BR (consent requis) :
  1. VPN → France : analytics_storage = denied par defaut ? Banner affiché ?
  2. VPN → Allemagne : idem
  3. VPN → Bresil : idem

Zone hors EU/BR (consent granted) :
  4. VPN → USA : analytics_storage = granted par defaut ? Pas de banner necessaire ?
  5. VPN → Thailande : idem
  6. VPN → Senegal : idem
  7. VPN → Japon : idem

POUR CHAQUE TEST :
  - Verifier le parametre gcs dans le hit GA4 (G100=denied, G111=granted)
  - Verifier que le cookie _ga est cree (granted) ou absent (denied)
  - Le pays apparait-il correctement dans GA4 Temps Reel ?
```

### 25C — Timezones et Detection Pays

```
Le Geo-Consent utilise Intl.DateTimeFormat().resolvedOptions().timeZone pour detecter le pays.

PROBLEME POTENTIEL : certains timezones couvrent plusieurs pays.
  - "America/New_York" = USA OU Canada OU Bahamas
  - "Asia/Kolkata" = Inde uniquement ✅
  - "Africa/Lagos" = Nigeria OU Benin OU Cameroun

VERIFIER :
  - La detection timezone → pays est-elle assez precise ?
  - Les pays mal detectes recoivent-ils le bon consent default ?
  - Un utilisateur a Dubai (Asia/Dubai, PAS EU) a-t-il consent=granted ? ✅
  - Un utilisateur a Londres (Europe/London, EU) a-t-il consent=denied ? ✅
```

### 25D — Langues RTL (Arabe, Hebrew)

```
Pour les visiteurs arabes (ar-sa) :
  1. Les events GA4 sont-ils envoyes correctement ?
  2. Les user properties (user_locale=ar-sa) sont-elles correctes ?
  3. Le PageViewTracker fonctionne-t-il en RTL ?
  4. Le Cookie Banner s'affiche-t-il correctement en RTL ?
```

### 25E — Pays avec Restrictions Internet

```
Certains pays bloquent Google Analytics (Chine, Iran, etc.) :

  1. Chine : Google est bloque par le Great Firewall
     - Les utilisateurs chinois (zh-cn) n'envoient PAS de hits GA4
     - Firebase Analytics fonctionne-t-il ? (Firebase n'est pas bloque partout)
     - Proposer : un analytics alternatif pour la Chine (Baidu Analytics ?)

  2. Iran : certains services Google bloques
     - Meme probleme que la Chine

  3. Russie : Google Analytics partiellement restreint
     - Verifier si les hits arrivent depuis la Russie (ru-ru)

IMPACT : Si 10% du trafic vient de pays qui bloquent GA4 → 10% du trafic est INVISIBLE
SOLUTION : Firebase Analytics comme fallback (non bloque dans la plupart des pays)
```

### 25F — Multi-Devise et Revenue par Pays

```
Le site facture en EUR et USD :
  - Verifier que GA4 recoit la bonne devise avec chaque purchase event
  - currency = 'EUR' pour les clients en zone euro
  - currency = 'USD' pour les clients hors zone euro
  - GA4 convertit automatiquement si la devise GA4 property = EUR

ATTENTION :
  - Si un purchase envoie value=49 currency=EUR et un autre value=55 currency=USD
  - GA4 property est en EUR → le USD est converti automatiquement
  - Verifier que la conversion est correcte (pas de double comptage)
```

---

## REGLES ABSOLUES

1. **JAMAIS supprimer le Consent Mode V2** — obligatoire legalement en UE
2. **JAMAIS hardcoder** un measurement ID dans plusieurs fichiers — UN SEUL endroit source de verite
3. **JAMAIS desactiver le consentement** pour faire marcher analytics — amende RGPD jusqu'a 4% du CA
4. **JAMAIS charger GA4 DEUX FOIS** avec deux IDs differents — croise les donnees et casse les sessions
5. **TOUJOURS tester** en navigation privee sans ad-blocker apres modification
6. **TOUJOURS verifier** GA4 Temps Reel avant de deployer en production (d'abord en dev si possible)
7. **TOUJOURS publier** le container GTM apres modification (le brouillon ne sert a rien)
8. **JAMAIS envoyer** de donnees personnelles non-hashees dans les events GA4 (email, telephone)
9. **TOUJOURS respecter** l'ordre : consent default → restore → script load → config
10. **JAMAIS modifier** le Meta Pixel sans verifier la conformite RGPD

---

## FICHIERS CLES — REFERENCE RAPIDE

| Fichier | Chemin | Role |
|---------|--------|------|
| **index.html** | `sos/index.html` | GA4 inline (L95-145) + Consent Mode V2 + Meta Pixel (L147-204) |
| **gtm.ts** | `sos/src/utils/gtm.ts` | GTM init + pushEvent + dataLayer (278 lignes) |
| **ga4.ts** | `sos/src/utils/ga4.ts` | trackEvent + setUserProperties + diagnostic (~530 lignes) |
| **googleAds.ts** | `sos/src/utils/googleAds.ts` | Google Ads conversions + GCLID (~740 lignes) |
| **metaPixel.ts** | `sos/src/utils/metaPixel.ts` | Meta Pixel 12 events + Advanced Matching (~630 lignes) |
| **firebase.ts** | `sos/src/config/firebase.ts` | Firebase Analytics init (L338-359) |
| **analytics.ts** | `sos/src/services/analytics.ts` | Analytics service custom (Firestore) |
| **CookieBanner.tsx** | `sos/src/components/common/CookieBanner.tsx` | Consent UI + gtag update (437 lignes) |
| **MetaPageViewTracker.tsx** | `sos/src/components/common/MetaPageViewTracker.tsx` | SPA route tracking Meta (PAS GA4) |
| **.env.production** | `sos/.env.production` | IDs : GA4, GTM, Ads, labels (L39-48) |
| **_headers** | `sos/public/_headers` | CSP autorise GA/GTM/Meta/Ads |
| **App.tsx** | `sos/src/App.tsx` | Arbre React (CookieBanner ? MetaPageViewTracker ?) |

| **Meta CAPI** | `sos/firebase/functions/src/metaConversionsApi.ts` | Conversions server-side Meta |
| **Sentry** | `sos/src/config/sentry.ts` | Error tracking + Session Replay |
| **main.tsx** | `sos/src/main.tsx` | GTM init (L17) + Sentry init (L13) |
| **Layout.tsx** | `sos/src/components/layout/Layout.tsx` | CookieBanner mount (L241-246) |
| **PageViewTracker** | `sos/src/App.tsx` | GA4 SPA page views (L1063) |
| **useMetaTracking** | `sos/src/hooks/useMetaTracking.ts` | Hook Meta Pixel events |
| **useMetaPixelTracking** | `sos/src/hooks/useMetaPixelTracking.ts` | Hook Meta Pixel tracking |
| **Cloudflare Worker** | `sos/cloudflare-worker/worker.js` | Bot detection & SSR redirect |
| **wrangler.toml** | `sos/cloudflare-worker/wrangler.toml` | Config Cloudflare Worker |
| **ErrorBoundary** | `sos/src/components/common/ErrorBoundary.tsx` | Capture erreurs React → Sentry |

### IDs a Unifier

| Outil | ID Actuel (index.html) | ID Actuel (.env) | ID a Garder |
|-------|----------------------|-------------------|-------------|
| GA4 | `G-CTVDEL29CP` | `G-CTVDEL29CP` | ✅ **UNIFIE** (property 527471429) |
| GTM | — | `GTM-P53H3RLF` | GTM-P53H3RLF |
| Google Ads | — | `AW-10842996788` | AW-10842996788 |
| Meta Pixel | `2204016713738311` | — | 2204016713738311 |

---

## SYNTHESE DU DIAGNOSTIC PROBABLE

```
✅ CAUSE RACINE #1 — CORRIGEE :
  Measurement ID unifie sur G-CTVDEL29CP partout
  → .env, .env.production, index.html tous alignes

⚠️ CAUSE RACINE #2 — PARTIELLEMENT CORRIGEE :
  Geo-Consent implemente (granted hors EU/BR)
  MAIS : modelisation consentement doit etre activee dans GA4 console (MANUELLEMENT)
  MAIS : Google Signals doit etre active (MANUELLEMENT)

⚠️ CAUSE RACINE #3 — A VERIFIER :
  Le container GTM (GTM-P53H3RLF) peut encore avoir une balise GA4 avec l'ancien ID
  → Verifier dans tagmanager.google.com et PUBLIER une nouvelle version

✅ CORRECTIONS DEJA APPLIQUEES DANS LE CODE :
  1. .env + .env.production : G-CTVDEL29CP (unifie)
  2. index.html : Geo-Consent (timezone detection EU/BR)
  3. index.html : send_page_view: false (plus de double page_view)
  4. index.html : GTM noscript iframe ajoute
  5. ga4.ts : configureGA4 simplifie (plus de double-check consent redondant)

❌ ACTIONS MANUELLES RESTANTES (console Google, pas dans le code) :
  1. GA4 → Admin → Data Collection → Consent Mode → ACTIVER modelisation
  2. GA4 → Admin → Data Collection → Google Signals → ACTIVER
  3. GA4 → Admin → Data Retention → 14 mois
  4. GA4 → Admin → Data Streams → Enhanced Measurement → TOUT activer
  5. GTM → Container GTM-P53H3RLF → Verifier balise GA4 → ID = G-CTVDEL29CP → PUBLIER
  6. GA4 → Admin → Events → Marquer conversions : purchase, generate_lead, sign_up
```
