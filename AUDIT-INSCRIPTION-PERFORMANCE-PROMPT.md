# AUDIT COMPLET — Performance des pages d'inscription (tous rôles)

## CONTEXTE DU PROBLÈME

Toutes les pages d'inscription sont **extrêmement longues à se valider et à rediriger vers le dashboard** des utilisateurs. Le problème affecte TOUS les rôles : Client, Avocat, Expatrié, Chatter, GroupAdmin, Bloggeur, Influenceur.

**Symptômes signalés :**
- Temps excessif entre le clic "Créer un compte" et l'arrivée sur le dashboard
- Spinner de chargement qui dure trop longtemps
- Impression que l'inscription n'a pas fonctionné (l'utilisateur re-clique)
- Pages blanches entre l'inscription et le dashboard
- L'utilisateur voit brièvement le formulaire de login avant d'être redirigé

**Hors périmètre :** Le flux de réservation de prestataire (booking flow) n'est PAS inclus dans cet audit.

---

## STACK TECHNIQUE

- **Frontend** : React 18 + TypeScript + Vite (SPA)
- **Firebase SDK** : `firebase ^12.3.0` (frontend), `firebase-admin ^12.7.0`, `firebase-functions ^7.0.5`
- **Auth** : Firebase Authentication (modular SDK v12)
- **Backend** : Firebase Cloud Functions — 3 régions :
  - `europe-west1` (Belgique) — APIs publiques, `createUserDocument` callable
  - `europe-west3` (Francfort) — Payments, Twilio, triggers Firestore (`consolidatedOnUserCreated`)
  - `us-central1` (Iowa) — Affiliés (registerChatter, registerBlogger, registerInfluencer, registerGroupAdmin)
- **Firestore** : nam7 (Iowa), cache IndexedDB persistant 50MB, Long Polling forcé
- **Hosting** : Cloudflare Pages
- **Domaine** : `sos-expat.com`

---

## LES 7 FLOWS D'INSCRIPTION À AUDITER

### FLOW 1 — Client (email/password)
```
RegisterClient.tsx → ClientRegisterForm.tsx (760 lignes)
→ AuthContext.register() [createUserWithEmailAndPassword + createUserDocumentInFirestore]
→ Token refresh + 500ms delay
→ Firestore document creation (users/{uid})
→ consolidatedOnUserCreated trigger (9 handlers en parallèle)
→ onAuthStateChanged détecte le user
→ Firestore listener charge le document (4 fallbacks: onSnapshot → getDoc 5s → REST 10s → fatal 30s)
→ isFullyReady = true
→ Login.tsx redirect useEffect → navigate("/dashboard")
```
**Dashboard cible** : `Dashboard.tsx` (3929 lignes)

### FLOW 2 — Avocat (Lawyer)
```
RegisterLawyer.tsx (287 lignes) → LawyerRegisterForm.tsx (1068 lignes, wizard multi-step)
→ AuthContext.register() [même flow que client]
→ Création users/{uid} + sos_profiles/{uid} + lawyers/{uid}
→ consolidatedOnUserCreated trigger
→ onProviderCreated trigger (europe-west3) :
  - Création compte Stripe Express
  - setCustomUserClaims({ role: 'lawyer' })
  - Génération slugs SEO
→ Token refresh pour obtenir le custom claim 'lawyer'
→ isFullyReady = true
→ navigate("/dashboard")
```
**Dashboard cible** : `Dashboard.tsx` (partagé client/provider)
**Spécificité** : isVisible=false, isApproved=false (pending admin approval)

### FLOW 3 — Expatrié (Expat)
```
RegisterExpat.tsx (287 lignes) → ExpatRegisterForm.tsx (1067 lignes, wizard multi-step)
→ IDENTIQUE au flow Avocat sauf :
  - role: 'expat' au lieu de 'lawyer'
  - sos_profiles/{uid} avec type: 'expat'
  - expats/{uid} au lieu de lawyers/{uid}
```

### FLOW 4 — Chatter
```
ChatterRegister.tsx (538 lignes) → ChatterRegisterForm.tsx (1199 lignes)
→ Step 1: AuthContext.register() [crée Firebase Auth user + document users/{uid}]
→ Step 2: registerChatter Cloud Function (us-central1, 806 lignes)
  - Crée chatters/{uid} avec status: "active"
  - Génère affiliateCodeClient + affiliateCodeRecruitment + affiliateCodeProvider
  - Set custom claim { role: 'chatter' }
→ onChatterCreated trigger (europe-west3) :
  - Welcome notification + email
  - Calcul parrainN2Id
  - Init challenge score
→ refreshUser() [force rechargement du user Firestore]
→ setSuccess(true) → showWhatsApp → WhatsAppGroupScreen
→ handleWhatsAppContinue → navigate("/chatter/tableau-de-bord")
```
**Dashboard cible** : `ChatterDashboard.tsx` (385 lignes)
**Spécificité** : Écran WhatsApp intermédiaire, immédiatement actif (pas d'approbation)

### FLOW 5 — Influenceur
```
InfluencerRegister.tsx (306 lignes) → InfluencerRegisterForm.tsx (1293 lignes)
→ Step 1: AuthContext.register()
→ Step 2: registerInfluencer Cloud Function (us-central1, 638 lignes)
→ onInfluencerCreated trigger (europe-west3)
→ refreshUser() → success → WhatsApp → navigate("/influencer/tableau-de-bord")
```
**Dashboard cible** : `InfluencerDashboard.tsx` (723 lignes)

### FLOW 6 — Bloggeur
```
BloggerRegister.tsx (1149 lignes) → pas de form séparé (form inline dans la page)
→ Step 1: AuthContext.register()
→ Step 2: registerBlogger Cloud Function (us-central1, 669 lignes)
→ onBloggerCreated trigger (europe-west3)
→ refreshUser() → success → WhatsApp → navigate("/blogger/tableau-de-bord")
```
**Dashboard cible** : `BloggerDashboard.tsx` (371 lignes)
**Spécificité** : La page d'inscription est la PLUS longue (1149 lignes) — form embedded

### FLOW 7 — GroupAdmin
```
GroupAdminRegister.tsx (451 lignes) → GroupAdminRegisterForm.tsx (1181 lignes)
→ Step 1: AuthContext.register()
→ Step 2: registerGroupAdmin Cloud Function (us-central1, 657 lignes)
→ onGroupAdminCreated trigger (europe-west3)
→ refreshUser() → success → WhatsApp → navigate("/group-admin/tableau-de-bord")
```
**Dashboard cible** : `GroupAdminDashboard.tsx` (413 lignes)

---

## FICHIERS CLÉS À AUDITER

### Core Auth (goulot d'étranglement principal)
| Fichier | Lignes | Rôle | Points de lenteur potentiels |
|---------|--------|------|------------------------------|
| `sos/src/contexts/AuthContext.tsx` | 2919 | **register()** L.2204-2360, **onAuthStateChanged** L.953+, **Firestore listener** L.1176+ | Token refresh 500ms, createUserDocumentInFirestore, 4 fallbacks Firestore (onSnapshot→getDoc 5s→REST 10s→30s fatal) |
| `sos/src/components/auth/ProtectedRoute.tsx` | 410 | Garde des routes dashboard | MIN_WAIT 150ms, MAX_WAIT 20s, ban check avec timeout 8s, `isFullyReady` gate |
| `sos/src/config/firebase.ts` | 676 | Init Firebase, Long Polling, cache IndexedDB | Long Polling + diagnostic Firestore au boot (requête test sos_profiles) |

### Pages d'inscription
| Fichier | Lignes | Rôle |
|---------|--------|------|
| `sos/src/pages/Register.tsx` | 773 | Sélection de rôle |
| `sos/src/pages/RegisterClient.tsx` | 456 | Page inscription client |
| `sos/src/pages/RegisterLawyer.tsx` | 287 | Page inscription avocat |
| `sos/src/pages/RegisterExpat.tsx` | 287 | Page inscription expat |
| `sos/src/pages/Chatter/ChatterRegister.tsx` | 538 | Page inscription chatter |
| `sos/src/pages/Influencer/InfluencerRegister.tsx` | 306 | Page inscription influenceur |
| `sos/src/pages/Blogger/BloggerRegister.tsx` | 1149 | Page inscription bloggeur |
| `sos/src/pages/GroupAdmin/GroupAdminRegister.tsx` | 451 | Page inscription group admin |

### Formulaires d'inscription
| Fichier | Lignes | Rôle |
|---------|--------|------|
| `sos/src/components/registration/client/ClientRegisterForm.tsx` | 760 | Form client (wizard multi-step) |
| `sos/src/components/registration/lawyer/LawyerRegisterForm.tsx` | 1068 | Form avocat (wizard multi-step) |
| `sos/src/components/registration/expat/ExpatRegisterForm.tsx` | 1067 | Form expat (wizard multi-step) |
| `sos/src/components/Chatter/Forms/ChatterRegisterForm.tsx` | 1199 | Form chatter |
| `sos/src/components/Influencer/Forms/InfluencerRegisterForm.tsx` | 1293 | Form influenceur |
| `sos/src/components/GroupAdmin/Forms/GroupAdminRegisterForm.tsx` | 1181 | Form group admin |
| `sos/src/components/registration/shared/RegistrationWizard.tsx` | 262 | Wizard multi-step (client, avocat, expat) |

### Cloud Functions Backend (inscription)
| Fichier | Lignes | Région | Rôle |
|---------|--------|--------|------|
| `sos/firebase/functions/src/index.ts` L.2614-2850+ | ~250 | europe-west1 | `createUserDocument` callable (clients, timeout 30s) |
| `sos/firebase/functions/src/chatter/callables/registerChatter.ts` | 806 | us-central1 | Inscription chatter |
| `sos/firebase/functions/src/influencer/callables/registerInfluencer.ts` | 638 | us-central1 | Inscription influenceur |
| `sos/firebase/functions/src/blogger/callables/registerBlogger.ts` | 669 | us-central1 | Inscription bloggeur |
| `sos/firebase/functions/src/groupAdmin/callables/registerGroupAdmin.ts` | 657 | us-central1 | Inscription group admin |

### Triggers post-inscription
| Fichier | Région | Rôle |
|---------|--------|------|
| `sos/firebase/functions/src/triggers/consolidatedOnUserCreated.ts` | europe-west3 | 9 handlers en 4 waves (Telegram, Claims, Affiliate, Marketing, Commission) |
| `sos/firebase/functions/src/chatter/triggers/onChatterCreated.ts` (259 lignes) | europe-west3 | Welcome notif, email, parrain N2 |
| `sos/firebase/functions/src/influencer/triggers/onInfluencerCreated.ts` (211 lignes) | europe-west3 | Init affiliate data |
| `sos/firebase/functions/src/blogger/triggers/onBloggerCreated.ts` (193 lignes) | europe-west3 | Init affiliate data |
| `sos/firebase/functions/src/groupAdmin/triggers/onGroupAdminCreated.ts` (238 lignes) | europe-west3 | Init affiliate data |

### Dashboards (pages de destination)
| Fichier | Lignes | Rôle |
|---------|--------|------|
| `sos/src/pages/Dashboard.tsx` | 3929 | Dashboard client/provider (le PLUS lourd) |
| `sos/src/pages/Chatter/ChatterDashboard.tsx` | 385 | Dashboard chatter |
| `sos/src/pages/Influencer/InfluencerDashboard.tsx` | 723 | Dashboard influenceur |
| `sos/src/pages/Blogger/BloggerDashboard.tsx` | 371 | Dashboard bloggeur |
| `sos/src/pages/GroupAdmin/GroupAdminDashboard.tsx` | 413 | Dashboard group admin |

### Écrans intermédiaires post-inscription
| Fichier | Lignes | Rôle |
|---------|--------|------|
| `sos/src/components/Telegram/TelegramOnboarding.tsx` | 401 | Onboarding Telegram (affiliés) |
| WhatsAppGroupScreen (import from `@/whatsapp-groups`) | ? | Écran WhatsApp post-inscription affiliés |

### Routing
| Fichier | Lignes | Rôle |
|---------|--------|------|
| `sos/src/App.tsx` | 1189 | **Toutes les routes** — ProtectedRoute avec allowedRoles par route |

---

## ANATOMIE DES GOULOTS D'ÉTRANGLEMENT

### Chronologie type d'une inscription (ex: Chatter, ~15-30s total)

```
T+0ms     : User clique "Créer un compte"
T+0ms     : setLoading(true), registeringRef = true
T+100ms   : createUserWithEmailAndPassword(auth, email, password)
T+500ms   : Firebase Auth user créé (UID reçu)
T+500ms   : getIdToken(true) — force token refresh
T+1000ms  : Token refreshed
T+1000ms  : await new Promise(resolve => setTimeout(resolve, 500)) ← DELAY ARBITRAIRE 500ms
T+1500ms  : createUserDocumentInFirestore() commence
            - setDoc users/{uid}
            - setDoc sos_profiles/{uid} (si provider)
            - setDoc lawyers/{uid} ou expats/{uid} (si provider)
T+2000ms  : Document users/{uid} créé → consolidatedOnUserCreated trigger lancé (europe-west3)
T+2000ms  : ✅ AuthContext.register() retourne (setIsLoading(false))

---- POUR AFFILIÉS (Chatter/Influencer/Blogger/GroupAdmin) ----
T+2000ms  : registerChatter Cloud Function appelée (us-central1)
            - Cold start possible : +2-5s si la fonction n'est pas warm
            - Crée chatters/{uid} + codes + custom claims
T+4000ms  : registerChatter retourne (si warm) ou T+7000ms (si cold start)
T+4000ms  : onChatterCreated trigger lancé (europe-west3)
T+4000ms  : refreshUser() → force rechargement du user Firestore
T+4500ms  : showWhatsApp = true → WhatsAppGroupScreen affiché
T+???ms   : User clique "Continuer" sur WhatsApp screen
T+???ms   : navigate("/chatter/tableau-de-bord")

---- APRÈS NAVIGATION VERS DASHBOARD ----
T+???ms   : ProtectedRoute mount
            - MIN_AUTH_WAIT_MS = 150ms (attente minimum)
            - Vérifie isFullyReady
T+???ms   : getUserBanInfo(user.id) — check ban avec timeout 8s
T+???ms   : checkUserRole(user, allowedRoles)
T+???ms   : authState = 'authorized' → dashboard affiché
```

### Les 12 sources de lenteur identifiées

| # | Source | Délai | Fichier | Ligne |
|---|--------|-------|---------|-------|
| 1 | `createUserWithEmailAndPassword` | 200-500ms | AuthContext.tsx | 2242 |
| 2 | `getIdToken(true)` — token refresh | 200-500ms | AuthContext.tsx | 2248 |
| 3 | **`await setTimeout(500ms)`** — délai arbitraire | **500ms fixe** | AuthContext.tsx | 2251 |
| 4 | `createUserDocumentInFirestore` (1 à 3 docs) | 500-2000ms | AuthContext.tsx | 2284 |
| 5 | `processProfilePhoto` (si image base64) | 500-3000ms | AuthContext.tsx | 2255 |
| 6 | `registerChatter/Influencer/etc.` Cloud Function | 1000-5000ms (cold start !) | ChatterRegister.tsx | 206 |
| 7 | `refreshUser()` — force reload Firestore | 500-2000ms | ChatterRegister.tsx | 247 |
| 8 | `consolidatedOnUserCreated` trigger (9 handlers) | 2000-10000ms | triggers/ | async |
| 9 | `onProviderCreated` trigger (Stripe + claims) | 2000-5000ms | triggers/ | async |
| 10 | **Firestore listener fallback chain** (si onSnapshot bloqué) | **5000-30000ms** | AuthContext.tsx | 1176+ |
| 11 | **ProtectedRoute ban check** | **jusqu'à 8000ms** | ProtectedRoute.tsx | 162 |
| 12 | **ProtectedRoute MAX_AUTH_WAIT_MS** | **jusqu'à 20000ms** | ProtectedRoute.tsx | 65 |

### Le problème fondamental

```
AuthContext.register() fait SÉQUENTIELLEMENT :
1. createUserWithEmailAndPassword     → 200-500ms
2. getIdToken(true)                    → 200-500ms
3. HARDCODED DELAY 500ms              → 500ms !!!
4. processProfilePhoto (si base64)     → 500-3000ms
5. createUserDocumentInFirestore       → 500-2000ms
6. updateProfile                       → 100-500ms

PUIS pour les affiliés :
7. registerRole Cloud Function         → 1000-5000ms (cold start!)
8. refreshUser()                       → 500-2000ms

TOTAL MINIMUM : ~3.5s (warm) à ~14s (cold start + photo + réseau lent)
```

---

## INSTRUCTIONS POUR LES 50 AGENTS IA

Chaque agent doit :
1. **Lire INTÉGRALEMENT** les fichiers assignés
2. **Mesurer/estimer le temps** de chaque opération dans le flow
3. **Identifier les opérations qui pourraient être parallélisées** au lieu de séquentielles
4. **Identifier les délais arbitraires** qui pourraient être réduits ou supprimés
5. **Proposer des corrections concrètes** avec le code exact
6. **Classer chaque finding** : P0 (bloquant UX), P1 (majeur), P2 (mineur), P3 (amélioration)

### RÉPARTITION DES AGENTS PAR DOMAINE

#### GROUPE A — AuthContext.register() Deep Dive (10 agents)
**Agents A1-A10** : Audit de la fonction `register()` (L.2204-2360)
- A1-A2 : Le `setTimeout(500ms)` à L.2251 — est-il vraiment nécessaire ? Peut-on le supprimer ou le réduire ?
- A3-A4 : `createUserDocumentInFirestore` — pourquoi ne pas utiliser `createUserDocumentViaCloudFunction` (comme pour Google login) ? Comparer les 2 approches
- A5-A6 : `processProfilePhoto` — est-ce bloquant ? Peut-on le différer (upload en background) ?
- A7-A8 : `getIdToken(true)` — le token refresh est-il vraiment nécessaire immédiatement ? Firestore rules autorisent-elles la création sans custom claims ?
- A9-A10 : Le `registeringRef` flag — empêche-t-il `onAuthStateChanged` de set `isLoading=true` pendant TOUTE la durée ? Y a-t-il une race condition ?

#### GROUPE B — Flow Affiliés (Chatter/Influencer/Blogger/GroupAdmin) (10 agents)
**Agents B1-B10** : Audit du double-step registration des affiliés
- B1-B2 : **ChatterRegister.tsx** — Le flow `register()` + `registerChatter()` est SÉQUENTIEL. Peut-on fusionner en 1 seul appel ?
- B3-B4 : **InfluencerRegister.tsx** — Même pattern. L'appel Cloud Function cold start ajoute 2-5s. Comment le mitiger ?
- B5-B6 : **BloggerRegister.tsx** — 1149 lignes de page, form inline. Performance du rendu React ?
- B7-B8 : **GroupAdminRegister.tsx** — Même pattern affilié. Auditer `refreshUser()` — est-ce vraiment nécessaire si on vient de register ?
- B9-B10 : **Cloud Functions `registerChatter/registerInfluencer/registerBlogger/registerGroupAdmin`** — Combien de temps prennent-elles ? Cold start impact ? Peuvent-elles être optimisées ?

#### GROUPE C — Flow Provider (Avocat/Expat) (6 agents)
**Agents C1-C6** : Audit du flow provider
- C1-C2 : **LawyerRegisterForm.tsx** (1068 lignes) — Wizard multi-step. Combien d'étapes ? Validation bloquante entre étapes ? Impact du `RegistrationWizard.tsx` sur la perf ?
- C3-C4 : **ExpatRegisterForm.tsx** (1067 lignes) — Même structure. `createUserDocumentInFirestore` crée 3 documents (users + sos_profiles + lawyers/expats) — est-ce nécessaire de les faire séquentiellement ?
- C5-C6 : **`onProviderCreated` trigger** — Création Stripe Express, `setCustomUserClaims`. Le token refresh côté frontend pour obtenir le custom claim est-il fait au bon moment ? Le dashboard attend-il les claims ?

#### GROUPE D — Firestore Listener & isFullyReady (6 agents)
**Agents D1-D6** : Le goulot le plus critique post-inscription
- D1-D2 : **Firestore user document listener** (AuthContext.tsx:1176+) — Les 4 niveaux de fallback (onSnapshot → getDoc 5s → REST 10s → 30s fatal). Pourquoi le listener ne trouve-t-il pas le document immédiatement après `register()` qui vient de le créer ?
- D3-D4 : **`isFullyReady` computation** — Comment est-il calculé ? Quand passe-t-il à `true` après register ? Y a-t-il un gap entre register() qui termine et isFullyReady qui devient true ?
- D5-D6 : **Le polling du document** — "polling with exponential backoff (300ms→1500ms) if document doesn't exist". Pourquoi le document créé par register() ne serait-il pas visible par le listener ? Cache Firestore stale ? Latence réseau ? Race condition avec le trigger `consolidatedOnUserCreated` qui met à jour le même document ?

#### GROUPE E — ProtectedRoute & Navigation (6 agents)
**Agents E1-E6** : Audit du garde de routes et de la navigation
- E1-E2 : **ProtectedRoute.tsx** — Le `getUserBanInfo()` avec timeout 8s. Est-ce vraiment nécessaire à CHAQUE navigation vers un dashboard ? Peut-on cacher le résultat ?
- E3-E4 : **La navigation post-inscription** — Comment l'inscription redirige-t-elle vers le dashboard ? Via `navigate()`, `window.location.href`, ou indirectement via un useEffect dans Login.tsx ?
- E5-E6 : **App.tsx routing** — Les ProtectedRoute avec `allowedRoles` pour chaque dashboard. Le role check est-il instantané ou attend-il que les custom claims soient propagés ?

#### GROUPE F — Cloud Functions Performance (4 agents)
**Agents F1-F4** : Audit des performances backend
- F1 : **`createUserDocument` callable** (index.ts:2614+) — Timeout 30s, région europe-west1. Performance avec Firestore en Iowa (nam7) ?
- F2 : **`consolidatedOnUserCreated` trigger** — 9 handlers en 4 waves. Quels handlers modifient le document `users/{uid}` et pourraient interférer avec le listener frontend ?
- F3 : **`registerChatter` et les 3 autres callables affiliés** — Mesurent-ils le temps d'exécution ? Cold start : sont-ils configurés avec `minInstances` ?
- F4 : **`onChatterCreated` / `onInfluencerCreated` / etc.** — Ces triggers sont-ils rapides ? Bloquent-ils quelque chose côté frontend ?

#### GROUPE G — Formulaires & UX (4 agents)
**Agents G1-G4** : Audit de l'UX d'inscription
- G1 : **RegistrationWizard.tsx** — Le wizard avec animations Framer Motion. Les animations (`slideVariants`, 300ms) ajoutent-elles de la latence perçue ?
- G2 : **Validation côté client** — Chaque form fait-il de la validation async (ex: vérification email en temps réel) qui retarde le submit ?
- G3 : **Taille des bundles** — Les pages d'inscription chargent-elles des dépendances lourdes (Stripe, analytics, etc.) qui ralentissent le premier rendu ?
- G4 : **Écrans intermédiaires** — Le `WhatsAppGroupScreen` et `SuccessFallbackRedirect` (3s timer). Sont-ils vraiment nécessaires ? Peuvent-ils être optionnels ?

#### GROUPE H — Comparaison & Optimisations (4 agents)
**Agents H1-H4** : Recherche de solutions
- H1 : **Optimistic UI** — Peut-on afficher le dashboard IMMÉDIATEMENT après `createUserWithEmailAndPassword` et créer le document Firestore en background ?
- H2 : **Fusion des appels** — Pour les affiliés, peut-on fusionner `register()` + `registerChatter()` en une SEULE Cloud Function qui fait tout d'un coup ?
- H3 : **Cache et warm-up** — Les Cloud Functions affiliés ont-elles `minInstances: 1` pour éviter le cold start ? Sinon, quel est le gain potentiel ?
- H4 : **Parallélisation** — Quelles opérations dans `register()` sont séquentielles mais pourraient être parallèles ? (ex: processProfilePhoto en parallèle de createUserDocument)

---

## HYPOTHÈSES DE BOTTLENECKS PRIORITAIRES

### HYPOTHÈSE 1 — Délai arbitraire 500ms dans register()
**Sévérité : P0**
```typescript
// AuthContext.tsx:2249-2251
await cred.user.getIdToken(true);
// ✅ OPTIMISÉ: getIdToken(true) force le refresh token, 500ms de marge pour réseaux lents (3G/4G)
await new Promise(resolve => setTimeout(resolve, 500));
```
- Ce `setTimeout(500ms)` est ajouté APRÈS le token refresh
- **Question** : Le `getIdToken(true)` ne suffit-il pas ? Le delay ajoute 500ms à CHAQUE inscription

### HYPOTHÈSE 2 — Double inscription séquentielle pour les affiliés
**Sévérité : P0**
```typescript
// ChatterRegister.tsx:179-226
await register({ email, firstName, lastName, role: 'chatter', ... }, password);  // ~2s
const registerChatterFn = httpsCallable(functionsAffiliate, 'registerChatter');
await registerChatterFn({ ... });  // ~1-5s (cold start!)
await refreshUser();  // ~0.5-2s
```
- L'inscription fait 2 appels séquentiels : `register()` (frontend) PUIS `registerChatter()` (Cloud Function)
- TOTAL : 3.5s minimum à 9s avec cold start
- **Solution potentielle** : Une seule Cloud Function qui fait les 2 étapes

### HYPOTHÈSE 3 — Firestore listener ne voit pas le document immédiatement
**Sévérité : P0**
- `register()` crée le document via `setDoc` direct
- Le `onSnapshot` listener dans AuthContext devrait le voir immédiatement
- **MAIS** : `consolidatedOnUserCreated` trigger (9 handlers) MET À JOUR le même document `users/{uid}` → cela peut déclencher des re-renders et des états intermédiaires
- Le listener reçoit d'abord le document SANS custom claims, puis WITH claims après le trigger → 2 renders minimum

### HYPOTHÈSE 4 — Cold start des Cloud Functions affiliés
**Sévérité : P1**
- `registerChatter/Influencer/Blogger/GroupAdmin` sont dans `us-central1`
- Si elles n'ont pas été appelées récemment, cold start = 2-5s supplémentaires
- **Question** : Ont-elles `minInstances: 1` configuré ?

### HYPOTHÈSE 5 — Ban check dans ProtectedRoute à chaque navigation
**Sévérité : P1**
```typescript
// ProtectedRoute.tsx:162-165
const banResult = await Promise.race([
  getUserBanInfo(user.id),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Authorization timeout')), 8000)),
]);
```
- `getUserBanInfo` fait un `getDoc(doc(db, 'users', userId))` à CHAQUE montage de ProtectedRoute
- Même pour un user qui vient de s'inscrire (impossible d'être banni)
- Timeout de 8s possible sur réseau lent

### HYPOTHÈSE 6 — processProfilePhoto bloquant
**Sévérité : P1**
```typescript
// AuthContext.tsx:2254-2258
if (userData.profilePhoto?.startsWith('data:image')) {
  finalProfilePhotoURL = await processProfilePhoto(userData.profilePhoto, cred.user.uid, 'manual');
}
```
- `processProfilePhoto` : optimise l'image, la convertit en WebP, l'upload sur Firebase Storage
- Peut prendre 500ms-3s selon la taille de l'image
- **C'est BLOQUANT** — tout le flow attend

### HYPOTHÈSE 7 — createUserDocumentInFirestore crée 3 docs séquentiellement (providers)
**Sévérité : P1**
- Pour les providers (lawyer/expat), la fonction crée :
  1. `users/{uid}`
  2. `sos_profiles/{uid}`
  3. `lawyers/{uid}` ou `expats/{uid}`
- **Question** : Ces 3 `setDoc` sont-ils séquentiels ou parallèles ? Si séquentiels, c'est 3x la latence Firestore

### HYPOTHÈSE 8 — Dashboard.tsx trop lourd (3929 lignes)
**Sévérité : P2**
- Le dashboard client/provider fait 3929 lignes
- Chargement initial probablement lourd (multiples requêtes Firestore, composants, etc.)
- **Question** : Le dashboard fait-il des requêtes Firestore au mount qui ajoutent du temps de chargement visible ?

### HYPOTHÈSE 9 — refreshUser() redondant
**Sévérité : P2**
```typescript
// ChatterRegister.tsx:247
await refreshUser();
```
- Appelé APRÈS `registerChatter` qui a déjà set les custom claims
- Mais `onAuthStateChanged` est déjà en train de listener — le user sera mis à jour automatiquement
- **Question** : `refreshUser()` est-il vraiment nécessaire ou est-ce une duplication ?

### HYPOTHÈSE 10 — SuccessFallbackRedirect timer 3s
**Sévérité : P2**
```typescript
// ChatterRegister.tsx:36
const timer = setTimeout(() => navigate(dashboardRoute, { replace: true }), 3000);
```
- Si le `WhatsAppGroupScreen` n'est pas affiché, un spinner reste 3s avant la redirection
- **3 secondes de rien** ajoutées au flow

---

## FORMAT DE SORTIE ATTENDU

```markdown
## Agent [ID] — [Domaine]

### Findings

#### [P0/P1/P2/P3] — [Titre du problème]
- **Fichier** : `chemin/fichier.ts:ligne`
- **Temps ajouté** : Estimation en ms
- **Description** : Description précise du bottleneck
- **Code actuel** : Code exact problématique (copier-coller)
- **Solution proposée** : Code corrigé exact avec commentaires
- **Gain estimé** : Temps économisé en ms
- **Risques** : Effets de bord possibles de la correction

### Recommandations (ordonnées par impact)
1. [P0] Quick win — gain estimé : Xms
2. [P0] Refactoring — gain estimé : Xms
3. ...
```

---

## CHECKLIST FINALE DE L'AUDIT

- [ ] Le `setTimeout(500ms)` dans register() est justifié ou supprimable
- [ ] Les 3 documents provider sont créés en parallèle (pas séquentiel)
- [ ] Le processProfilePhoto est non-bloquant (background upload)
- [ ] Les Cloud Functions affiliés ont `minInstances` pour éviter cold start
- [ ] Le double-step (register + registerRole) peut être fusionné
- [ ] `refreshUser()` est nécessaire ou redondant
- [ ] Le Firestore listener détecte le document dès la création (pas de polling inutile)
- [ ] `consolidatedOnUserCreated` ne bloque PAS le flow frontend
- [ ] ProtectedRoute.getUserBanInfo ne rallonge pas inutilement le chargement
- [ ] Le SuccessFallbackRedirect 3s est justifié
- [ ] Le WhatsAppGroupScreen est optionnel et non bloquant
- [ ] `isFullyReady` passe à true rapidement après register()
- [ ] Le Dashboard.tsx ne charge pas de données inutiles au premier render
- [ ] Les animations Framer Motion du wizard n'ajoutent pas de latence perçue
- [ ] Les bundles des pages d'inscription sont optimisés (code splitting, lazy loading)
- [ ] Le flow complet (tap → dashboard visible) prend moins de 5 secondes sur 4G
- [ ] Le flow complet prend moins de 10 secondes sur 3G
- [ ] Aucune opération bloquante n'est dupliquée entre frontend et backend
- [ ] Les analytics (Meta Pixel, Google Ads, Firebase) ne bloquent PAS le flow

---

## OBJECTIF CIBLE

**Avant audit** : ~10-30 secondes entre le clic "Créer un compte" et le dashboard visible
**Après optimisations** : **< 5 secondes** sur 4G, **< 10 secondes** sur 3G

**Stratégie recommandée** :
1. **Optimistic UI** : Afficher le dashboard dès que Firebase Auth est créé, charger Firestore en background
2. **Parallélisation** : Token refresh + document creation + photo upload en parallèle
3. **Fusion** : Un seul appel Cloud Function pour les affiliés (register + registerRole)
4. **Suppression delays** : Retirer les `setTimeout` arbitraires
5. **Cache ban check** : Ne pas vérifier le ban pour un user qui vient de s'inscrire
