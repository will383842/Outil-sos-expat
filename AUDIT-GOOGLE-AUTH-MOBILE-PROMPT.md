# AUDIT COMPLET — Google Authentication ne fonctionne pas sur Mobile (iOS / Android)

## CONTEXTE DU PROBLÈME

L'inscription et la connexion via Google Authentication (Firebase Auth + Google Sign-In) ne fonctionnent pas correctement sur les appareils mobiles (iOS Safari, Chrome iOS, Android Chrome, Samsung Internet, navigateurs in-app, PWA standalone). Le système fonctionne sur desktop (popup Google).

**Stack technique :**
- Frontend : React 18 + TypeScript + Vite (SPA)
- **Firebase SDK** : `firebase ^12.3.0` (frontend), `firebase-admin ^12.7.0` + `firebase-functions ^7.0.5` (backend)
- Auth : Firebase Authentication (modular SDK v12)
- Backend : Firebase Cloud Functions (3 régions : europe-west1, europe-west3, us-central1)
- Hosting : **Cloudflare Pages** (PAS Firebase Hosting — aucun `_routes.json`, uniquement `_redirects` + `_headers`)
- Cloudflare Worker : `sos-expat-bot-ssr` — uniquement pour bot detection/SSR, NE touche PAS les routes auth
- Domaine : `sos-expat.com` / `www.sos-expat.com`
- Auth Domain Firebase : `sos-urgently-ac307.firebaseapp.com` (domaine par défaut Firebase, **PAS** de custom authDomain)
- **Firebase Project ID** : `sos-urgently-ac307`
- **Firebase API Key** : `AIzaSyCLp02v_ywBw67d4VD7rQ2tCQUdKp83CT8`
- Firestore : nam7 (Iowa, US), cache IndexedDB persistant 50MB + Long Polling forcé (`experimentalForceLongPolling: true`)
- PWA : manifest.json (`display: standalone`) + Service Workers explicitement désactivés (unregister au boot dans index.html)

**Valeurs .env.production confirmées :**
```
VITE_FIREBASE_API_KEY=AIzaSyCLp02v_ywBw67d4VD7rQ2tCQUdKp83CT8
VITE_FIREBASE_AUTH_DOMAIN=sos-urgently-ac307.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sos-urgently-ac307
VITE_FIREBASE_STORAGE_BUCKET=sos-urgently-ac307.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=268195823113
VITE_FIREBASE_APP_ID=1:268195823113:web:10bf2e5bacdc1816f182d8
VITE_FUNCTIONS_REGION=europe-west1
VITE_FUNCTIONS_AFFILIATE_REGION=us-central1
VITE_FUNCTIONS_PAYMENT_REGION=europe-west3
```

---

## ARCHITECTURE AUTH ACTUELLE

### Flux Google Sign-In (2 stratégies selon device)

**Desktop :** `signInWithPopup(auth, provider)` → popup Google → retour immédiat avec `UserCredential`

**Mobile (iOS, Samsung, WebView, in-app browsers) :** `signInWithRedirect(auth, provider)` → redirection Google → retour sur l'app → `getRedirectResult(auth)` récupère le résultat

### Détection mobile → redirect forcé

```typescript
// AuthContext.tsx:206-227
const shouldForceRedirectAuth = (): boolean => {
  const ua = navigator.userAgent;
  // iOS → TOUJOURS redirect
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // WebView Android, Samsung Internet, UC Browser, Opera Mini → redirect
  return isInAppBrowser() || /wv/.test(ua) && /Android/i.test(ua) || /SamsungBrowser/i.test(ua) || /UCBrowser|Opera Mini|OPR/i.test(ua);
};
```

### WebViews in-app → BLOQUÉS

```typescript
// AuthContext.tsx:1552-1564
if (isInAppBrowser()) {
  setError(`La connexion Google n'est pas supportée depuis ${browserName}. Ouvrez dans Safari ou Chrome.`);
  return;
}
```

### Handler de redirect result

```typescript
// AuthContext.tsx:1822-2026
useEffect(() => {
  (async () => {
    if (redirectHandledRef.current) return;
    const result = await Promise.race([getRedirectResult(auth), timeoutPromise(60000)]);
    if (!result?.user) return;
    redirectHandledRef.current = true;
    // ... traitement user, création doc Firestore, redirect vers savedRedirect
  })();
}, [deviceInfo]);
```

---

## FICHIERS CLÉS À AUDITER

### Frontend Auth Core (App principale `sos/`)
| Fichier | Rôle | Lignes critiques |
|---------|------|-----------------|
| `sos/src/contexts/AuthContext.tsx` (~2700 lignes) | **FICHIER CENTRAL** — loginWithGoogle, getRedirectResult handler, onAuthStateChanged, shouldForceRedirectAuth, isInAppBrowser, safeStorage, createUserDocumentViaCloudFunction, createUserDocumentInFirestore | L.166-227 (mobile helpers), L.443-517 (createUserDocumentViaCloudFunction), L.523-850 (createUserDocumentInFirestore DEPRECATED), L.953+ (onAuthStateChanged — timeout 3s sécurité), L.1176+ (Firestore user listener — fallback 4 niveaux : onSnapshot → getDoc 5s → REST API 10s → fatal 30s), L.1548-1780 (loginWithGoogle), L.1822-2026 (redirect handler) |
| `sos/src/contexts/AuthContextBase.ts` | Types TypeScript pour AuthContextType | Interface AuthContextType |
| `sos/src/contexts/useAuth.ts` | Hook useAuth() | Simple re-export |
| `sos/src/pages/Login.tsx` (~1325 lignes) | Page de connexion — bouton Google, handleGoogleLogin, redirect après login | L.935-986 (handleGoogleLogin), L.728-876 (redirect useEffect) |
| `sos/src/components/auth/QuickAuthWizard.tsx` (~783 lignes) | Modal auth rapide (booking flow) — Google login + email/password | L.415-464 (handleGoogleLogin), L.183-231 (auth detection) |
| `sos/src/utils/auth.ts` (577 lignes) | Fonctions utilitaires auth (registerUser, loginUser, loginWithGoogle DEPRECATED) | L.273-289 (loginWithGoogle legacy via redirect) |
| `sos/src/config/firebase.ts` (~676 lignes) | Config Firebase, authDomain, Long Polling, cache IndexedDB, diagnostics | L.47-54 (config), L.95-109 (Firestore init), L.159-162 (authDiagnostics) |
| `sos/src/utils/authDiagnostics.ts` | Fonctions de diagnostic auth (window.diagnoseFirebaseAuth) | Tout le fichier |
| `sos/src/utils/networkResilience.ts` | Détection extensions bloquantes, protection réseau | Tout le fichier |
| `sos/src/components/auth/ProtectedRoute.tsx` | Guard de routes — vérifie auth + rôle, timeout 10s | MIN_AUTH_WAIT_MS, MAX_AUTH_WAIT_MS |
| `sos/src/components/auth/AuthForm.tsx` | Composant formulaire auth réutilisable | Tout le fichier |

### Configuration & Sécurité
| Fichier | Rôle |
|---------|------|
| `sos/public/_headers` | Headers Cloudflare Pages — CSP, COOP, COEP, frame-src, connect-src |
| `sos/public/_redirects` | Redirects Cloudflare — SPA fallback `/* /index.html 200` |
| `sos/public/manifest.json` | PWA manifest — display: standalone, start_url |
| `sos/index.html` | Meta tags mobile, SW unregister, Telegram WebView fix, locale redirect |
| `sos/.env` / `sos/.env.production` | Variables VITE_FIREBASE_* (authDomain, apiKey, etc.) |
| `sos/vite.config.js` | Config Vite — SPA fallback middleware, pas de VitePWA |

### Backend Auth (Firebase Functions)
| Fichier | Rôle | Détails critiques |
|---------|------|-------------------|
| `sos/firebase/functions/src/index.ts` (L.2614-2850+) | **Cloud Function `createUserDocument`** — callable qui crée le document `users/{uid}` | **Région : europe-west1, Timeout : 30s**, vérifie `request.auth`, empêche l'impersonation UID, auto-approve clients, lawyers/expats pending |
| `sos/firebase/functions/src/triggers/consolidatedOnUserCreated.ts` | **Trigger `onDocumentCreated` sur `users/{userId}`** — exécuté automatiquement après création du document user | **Région : europe-west3**, 9 handlers en parallel waves : Wave 1 (Telegram, Claims, Affiliate, Partner Engine), Wave 2 (Chatter, Influencer, Blogger, GroupAdmin legacy), Wave 3 (Email marketing, Google Ads, Meta CAPI), Wave 4 (Commission calculation). Chaque handler isolé par try/catch |
| `sos/firebase/functions/src/auth/generateOutilToken.ts` | Cross-project auth tokens (Outil ↔ SOS) | Custom tokens pour le projet Firebase `outils-sos-expat` |
| `sos/firebase/functions/src/auth/setAdminClaims.ts` | Custom claims (role: "admin") via `admin.auth().setCustomUserClaims()` | Vérification whitelist admin dans Firestore |
| `sos/firebase/functions/src/auth/passwordReset.ts` | Reset password handler | Standard |
| `sos/firestore.rules` (L.75-108) | **Règles Firestore collection `users`** | Read: authenticated. Create: owner + role in [client,lawyer,expat,chatter,blogger,influencer,groupAdmin] OU admin. Update: owner SAUF champs protégés (role, isApproved, isBanned, balances, affiliateCode, etc.) OU admin |

**IMPORTANT — Pas de `auth.user().onCreate` trigger** : Le projet utilise un callable (`createUserDocument`) + un Firestore trigger (`consolidatedOnUserCreated`) au lieu d'un Auth trigger. C'est un choix architectural délibéré.

### Inscription (Registration Forms)
| Fichier | Rôle |
|---------|------|
| `sos/src/pages/Register.tsx` | Page d'inscription générique |
| `sos/src/pages/RegisterClient.tsx` | Inscription client |
| `sos/src/components/registration/client/ClientRegisterForm.tsx` | Formulaire inscription client |
| `sos/src/components/registration/lawyer/LawyerRegisterForm.tsx` | Formulaire inscription avocat |
| `sos/src/components/registration/expat/ExpatRegisterForm.tsx` | Formulaire inscription expat |

### Autres apps (même Firebase project)
| Fichier | Rôle |
|---------|------|
| `Outil-sos-expat/src/lib/firebase.ts` | Firebase init Outil — authDomain, IndexedDB persistence |
| `Outil-sos-expat/src/contexts/UnifiedUserContext.tsx` | Auth context Outil — signInWithPopup uniquement |
| `Outil-sos-expat/src/pages/Login.tsx` | Login Outil |
| `Outil-sos-expat/src/pages/AuthSSO.tsx` | SSO entre apps |
| `Dashboard-multiprestataire/src/config/firebase.ts` | Firebase init Dashboard |
| `Dashboard-multiprestataire/src/contexts/AuthContext.tsx` | Auth Dashboard — email/password uniquement |

---

## FLOW POST-AUTH COMPLET (critique pour mobile)

### Étape 1 — `onAuthStateChanged` (AuthContext.tsx:953+)
- Déclenché quand Firebase Auth détecte un changement d'état (login, logout, token refresh)
- **Timeout de sécurité de 3 secondes** : si l'état ne change pas après 3s, `authInitialized` est forcé à `true` pour éviter les écrans blancs
- Set `authUser` (Firebase User) et lance le chargement du document Firestore

### Étape 2 — Firestore User Document Listener (AuthContext.tsx:1176+)
**4 niveaux de fallback (critique pour réseaux mobiles lents) :**
1. **onSnapshot** (temps réel) — tente un listener Firestore immédiat
2. **getDoc après 5s** — si onSnapshot ne répond pas (bloqué par réseau, extensions, etc.)
3. **REST API après 10s** — si tout le SDK Firestore est bloqué (appel HTTP direct)
4. **Fatal timeout après 30s** — abandon, affiche erreur

- **Polling avec backoff exponentiel** (300ms → 1500ms) si le document n'existe pas encore (cas Google login : le document est créé par Cloud Function en parallèle)
- `isFullyReady` = `authInitialized` AND `!isLoading` — c'est CE flag que les pages vérifient pour naviguer

### Étape 3 — Navigation post-login
- `Login.tsx` : `useEffect` surveille `isFullyReady && user` → `navigate(finalUrl, { replace: true })`
- `QuickAuthWizard.tsx` : Détecte la transition `null → truthy` du user OU le flag `AUTH_ATTEMPTED_KEY` dans sessionStorage → appelle `onSuccess()`

### Impact mobile
- Sur réseau lent (3G/2G), les étapes 1-2-3 peuvent prendre 10-30s
- Si le timeout de 3s de `onAuthStateChanged` se déclenche AVANT que `getRedirectResult` ait fini, `authInitialized` est true mais PAS d'user → la page Login.tsx ne redirige pas → **l'user voit le formulaire de login au lieu d'être redirigé**
- Le `redirectHandledRef` empêche le double traitement, mais si le composant est remonté (navigation React, HMR), le ref est perdu

---

## OUTIL DE DIAGNOSTIC EXISTANT

**Fichier** : `sos/src/utils/authDiagnostics.ts`
**Usage** : `window.diagnoseFirebaseAuth()` dans la console navigateur

**Vérifie :**
- Config Firebase (apiKey, authDomain, projectId)
- User Agent (détecte iOS, Android, Safari, Chrome)
- Support popup (`window.open`)
- localStorage et sessionStorage disponibles
- Cookies activés
- CSP actuelle
- État Firebase Auth (`auth.currentUser`)
- Connectivité réseau vers :
  - `accounts.google.com`
  - `apis.google.com`
  - `securetoken.googleapis.com`
  - `identitytoolkit.googleapis.com`

**Les agents doivent utiliser cet outil comme référence** pour savoir quels endpoints tester.

---

## POINTS D'ATTENTION SPÉCIFIQUES AU MOBILE

### 1. Problème authDomain
- **Actuellement** : `sos-urgently-ac307.firebaseapp.com` (domaine Firebase par défaut)
- **Impact sur mobile** : Le redirect OAuth passe par `firebaseapp.com` → Safari ITP (Intelligent Tracking Prevention) peut bloquer les cookies tiers
- **Question** : Faut-il configurer un custom authDomain sur `auth.sos-expat.com` ?
- **Commentaire dans le code** : "Avec le custom authDomain (www.sosexpats.com), le redirect OAuth reste sur le même domaine" — **MAIS le code utilise toujours `sos-urgently-ac307.firebaseapp.com`**. Incohérence entre le commentaire et l'implémentation.

### 2. Cross-Origin-Opener-Policy
- Header actuel : `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- **Impact** : Bloque les popups cross-origin sauf si `same-origin-allow-popups`
- **Question** : Est-ce suffisant pour Safari mobile ? Le redirect passe-t-il par un popup ou un full redirect ?

### 3. Service Worker interference
- `index.html` désactive explicitement tous les Service Workers au boot
- **Question** : Le SW est-il correctement nettoyé sur TOUS les appareils ? Un SW résiduel pourrait intercepter le redirect OAuth callback

### 4. Content Security Policy
- CSP autorise : `frame-src https://accounts.google.com https://*.firebaseapp.com`
- CSP connect-src : `https://accounts.google.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com`
- **Question** : Toutes les URLs nécessaires sont-elles autorisées pour le flow redirect sur mobile ?

### 5. Cloudflare Pages SPA Fallback
- `/* /index.html 200` — toutes les URLs sont routées vers index.html
- **Question** : Le callback OAuth `/__/auth/handler` (utilisé par Firebase Auth redirect) est-il intercepté par Cloudflare ? Sur Firebase Hosting, ce chemin est géré nativement. Sur Cloudflare Pages, il DOIT être proxifié vers `firebaseapp.com`.

### 6. setPersistence + geste utilisateur (Safari)
```typescript
// AuthContext.tsx:1590-1593
// FIX iOS Safari: setPersistence SANS await pour ne pas casser le lien
// avec le geste utilisateur (tap). Safari bloque les popups si un await
// asynchrone s'intercale entre le tap et le window.open() interne.
setPersistence(auth, persistenceType).catch(...); // fire-and-forget
```
- **Question** : Ce fix est-il suffisant ? Y a-t-il d'autres `await` entre le tap et `signInWithRedirect` ?

### 7. sessionStorage / localStorage en Safari Private
- Safari Private bloque souvent l'écriture dans sessionStorage/localStorage
- Le code a un `safeStorage` avec fallback mémoire
- **Question** : Le `googleAuthRedirect` est sauvé via `safeStorage` — si le fallback mémoire est utilisé, il est **perdu au redirect** (page refresh = mémoire effacée)

### 8. getRedirectResult timing
- Le handler tourne dans un `useEffect(() => {...}, [deviceInfo])`
- **Question** : `deviceInfo` change-t-il après le premier render ? Si oui, le handler pourrait tourner plusieurs fois ou pas au bon moment

### 9. redirectHandledRef
- Un `ref` empêche le double traitement du redirect
- **Question** : Si le composant est démonté/remonté (React StrictMode, navigation), le ref est reset → le redirect result pourrait être perdu

### 10. Création document Firestore après Google login
- Le code crée le document `users/{uid}` via Cloud Function (`createUserDocumentViaCloudFunction`)
- Retry 3x avec backoff exponentiel, puis fallback direct Firestore
- **Question** : La Cloud Function est dans quelle région ? Le timeout est-il suffisant pour les réseaux mobiles lents ?

### 11. Token propagation delay
```typescript
// AuthContext.tsx:1626-1629
const tokenPropagationDelay = deviceInfo.connectionSpeed === 'slow' ? 1500 : deviceInfo.connectionSpeed === 'fast' ? 500 : 1000;
await new Promise(resolve => setTimeout(resolve, tokenPropagationDelay));
```
- **Question** : Ce délai arbitraire est-il fiable ? Sur mobile avec connexion fluctuante, le token pourrait ne pas être propagé à temps

### 12. PWA Standalone mode
- `manifest.json` → `"display": "standalone"`
- En mode standalone (ajouté à l'écran d'accueil), le comportement OAuth change drastiquement
- **Question** : Le redirect revient-il dans le PWA ou ouvre-t-il Safari/Chrome externe ?

---

## INSTRUCTIONS POUR LES 50 AGENTS IA

Chaque agent doit :
1. **Lire INTÉGRALEMENT** les fichiers qui lui sont assignés (pas de résumé, lecture ligne par ligne)
2. **Tracer le flux complet** de l'authentification Google sur mobile du tap utilisateur jusqu'au redirect final
3. **Identifier les bugs, race conditions, erreurs de logique** spécifiques au mobile
4. **Proposer des corrections concrètes** avec le code exact à modifier
5. **Classer chaque finding** par sévérité : P0 (bloquant), P1 (majeur), P2 (mineur), P3 (amélioration)

### RÉPARTITION DES AGENTS PAR DOMAINE

#### GROUPE A — Flow Google Auth Mobile (10 agents)
**Agents A1-A10** : Tracer le flux complet du tap "Se connecter avec Google" sur mobile
- A1-A2 : Flow `signInWithRedirect` sur iOS Safari (tap → redirect Google → retour app → getRedirectResult)
- A3-A4 : Flow `signInWithRedirect` sur Android Chrome
- A5-A6 : Flow dans les navigateurs in-app (Instagram, Facebook, TikTok, Telegram)
- A7-A8 : Flow dans Samsung Internet et UC Browser
- A9-A10 : Flow en mode PWA standalone (iOS + Android)

**Questions à répondre pour chaque flow :**
- Le `signInWithRedirect` est-il appelé correctement ?
- Le callback URL `/__/auth/handler` est-il accessible ?
- Le `getRedirectResult` récupère-t-il bien le résultat ?
- La session/persistence est-elle maintenue après le redirect ?
- Le document Firestore est-il créé correctement ?
- La redirection finale fonctionne-t-elle ?

#### GROUPE B — AuthContext Deep Dive (8 agents)
**Agents B1-B8** : Audit ligne par ligne de `AuthContext.tsx`
- B1-B2 : Fonction `loginWithGoogle()` (L.1548-1780) — logique popup vs redirect, error handling
- B3-B4 : Handler `getRedirectResult` useEffect (L.1822-2026) — timing, race conditions, cleanup
- B5-B6 : `shouldForceRedirectAuth()` + `isInAppBrowser()` (L.171-227) — exhaustivité détection
- B7-B8 : `safeStorage`, `createUserDocumentViaCloudFunction`, `createUserDocumentInFirestore` — fiabilité mobile

#### GROUPE C — Configuration & Headers (6 agents)
**Agents C1-C6** : Audit configuration
- C1 : `_headers` (CSP, COOP, COEP) — compatibilité Google Auth redirect sur mobile
- C2 : `_redirects` — le callback `/__/auth/handler` est-il intercepté par le SPA fallback ?
- C3 : `firebase.ts` config — authDomain, Long Polling, cache IndexedDB impact sur auth
- C4 : `index.html` — SW unregister, meta tags mobile, locale redirect impact sur OAuth callback
- C5 : `.env` / `.env.production` — authDomain configuré, authorized domains Firebase Console
- C6 : `manifest.json` + Vite config — PWA standalone OAuth comportement

#### GROUPE D — Pages Login & Registration (6 agents)
**Agents D1-D6** : Audit des pages d'auth
- D1-D2 : `Login.tsx` — handleGoogleLogin, redirect après login, interaction avec AuthContext
- D3-D4 : `QuickAuthWizard.tsx` — Google login dans le modal booking, polling, sessionStorage
- D5 : `Register.tsx` + `RegisterClient.tsx` — flow inscription via Google
- D6 : `AuthForm.tsx` + `ProtectedRoute.tsx` — garde de routes, timing auth

#### GROUPE E — Backend & Security Rules (6 agents)
**Agents E1-E6** : Audit backend
- E1-E2 : `createUserDocumentViaCloudFunction` (chercher la Cloud Function dans `firebase/functions/`) — performances, timeout, région
- E3 : `firestore.rules` — permissions pour créer un document `users/` après Google login
- E4 : `setAdminClaims.ts` + custom claims — impact sur le flow Google login
- E5 : `generateOutilToken.ts` + SSO cross-project — interaction avec Google Auth
- E6 : Auditer `consolidatedOnUserCreated.ts` — les 9 handlers (surtout Wave 1: Claims sync), timing, impact si un handler échoue

#### GROUPE F — Cross-Browser & Device Testing (6 agents)
**Agents F1-F6** : Audit compatibilité navigateurs
- F1 : Safari iOS 15+ (ITP, cookie restrictions, popup blocker)
- F2 : Chrome iOS (restrictions imposées par WebKit)
- F3 : Chrome Android (popup vs redirect, intent handling)
- F4 : Samsung Internet (spécificités Auth API)
- F5 : Firefox mobile (iOS + Android)
- F6 : PWA mode standalone (comportement OAuth, external browser opening)

#### GROUPE G — Network & Resilience (4 agents)
**Agents G1-G4** : Audit réseau et résilience
- G1 : `networkResilience.ts` — impact sur les requêtes auth
- G2 : Long Polling + cache IndexedDB — impact sur `getRedirectResult`
- G3 : Timeout adaptatif (60s) — suffisant pour 3G/2G ?
- G4 : Offline/online transitions — que se passe-t-il si le réseau coupe pendant le redirect ?

#### GROUPE H — Comparaison & Best Practices (4 agents)
**Agents H1-H4** : Recherche et comparaison
- H1 : Comparer avec la doc officielle Firebase Auth Web v12 (dernière version) — qu'est-ce qui manque ? Spécifiquement le guide "Authenticate Using Google Sign-In" pour mobile
- H2 : Comparer avec les known issues Firebase SDK `^12.3.0` sur mobile (GitHub issues `firebase/firebase-js-sdk`) — bugs `getRedirectResult`, `experimentalForceLongPolling`, `persistentLocalCache`
- H3 : Auditer l'implémentation Auth de `Outil-sos-expat/` et `Dashboard-multiprestataire/` — différences avec `sos/` (Outil utilise `signInWithPopup` uniquement, pourquoi ça marche là-bas ?)
- H4 : Vérifier les solutions alternatives : `signInWithCredential`, `auth.useDeviceLanguage()`, **custom authDomain setup** (la vraie solution pour Safari ITP), `signInWithPopup` avec fallback au lieu de `signInWithRedirect` par défaut

---

## HYPOTHÈSES DE BUGS PRIORITAIRES À VÉRIFIER

### HYPOTHÈSE 1 — `/__/auth/handler` bloqué par Cloudflare Pages
**Sévérité : P0 (probablement le bug principal)**
- Firebase Auth redirect utilise `authDomain/__/auth/handler` comme callback
- Le authDomain est `sos-urgently-ac307.firebaseapp.com` → le callback passe par Firebase
- **MAIS** : si le authDomain est configuré sur un custom domain (ex: `auth.sos-expat.com`), le chemin `/__/auth/handler` doit être servi par Firebase, pas par Cloudflare
- Vérifier dans Firebase Console → Authentication → Settings → Authorized domains
- Vérifier si `www.sos-expat.com` et `sos-expat.com` sont dans la liste des authorized domains

### HYPOTHÈSE 2 — Safari ITP bloque les cookies Firebase
**Sévérité : P0**
- Safari ITP (Intelligent Tracking Prevention) bloque les cookies tiers
- Le redirect passe par `firebaseapp.com` (domaine tiers par rapport à `sos-expat.com`)
- Les cookies de session Firebase pourraient être bloqués au retour
- **Solution potentielle** : Configurer un custom authDomain sur un sous-domaine de `sos-expat.com`

### HYPOTHÈSE 3 — sessionStorage perdu après redirect
**Sévérité : P1**
- `googleAuthRedirect` est sauvé dans `safeStorage` (sessionStorage → localStorage → mémoire)
- Après le redirect Google, la page est rechargée = si sessionStorage est inaccessible (Safari Private), l'URL de redirect est perdue
- Le user atterrit sur `/dashboard` au lieu de la page d'origine

### HYPOTHÈSE 4 — Race condition dans getRedirectResult
**Sévérité : P1**
- Le `useEffect` avec `[deviceInfo]` comme dépendance pourrait ne pas tourner au bon moment
- Si `deviceInfo` change après le premier render, le handler tourne 2 fois
- `getRedirectResult` ne peut être appelé qu'une seule fois — le deuxième appel retourne `null`

### HYPOTHÈSE 5 — Document Firestore non créé (Cloud Function timeout)
**Sévérité : P1**
- Après Google login, le code crée le document `users/` via Cloud Function
- Sur réseau mobile lent, la Cloud Function peut timeout
- Le fallback direct Firestore peut échouer si les security rules bloquent l'écriture

### HYPOTHÈSE 6 — PWA standalone redirect ne revient pas dans l'app
**Sévérité : P1**
- En mode PWA standalone (ajouté à l'écran d'accueil), le redirect OAuth ouvre Safari/Chrome externe
- Le callback ne revient pas dans le PWA → l'user est bloqué dans le navigateur externe
- **Vérification** : Tester le comportement exact en mode standalone sur iOS et Android

### HYPOTHÈSE 7 — COOP header empêche le popup Google
**Sévérité : P2**
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` devrait permettre les popups
- Mais sur certains navigateurs mobiles, ce header peut interférer avec `signInWithRedirect`
- Le redirect n'est pas un popup — le COOP ne devrait pas poser problème, mais à vérifier

### HYPOTHÈSE 8 — Commentaire vs code : authDomain incohérence
**Sévérité : P2**
- Le commentaire L.199-201 mentionne "custom authDomain (www.sosexpats.com)"
- Mais `.env.production` confirme : `VITE_FIREBASE_AUTH_DOMAIN=sos-urgently-ac307.firebaseapp.com`
- **Le commentaire est FAUX** — le custom authDomain n'a JAMAIS été configuré
- Impact : le code qui dit "pas de problème ITP grâce au custom authDomain" est basé sur une hypothèse fausse

### HYPOTHÈSE 9 — Race condition onAuthStateChanged vs getRedirectResult
**Sévérité : P0**
- `onAuthStateChanged` a un timeout de sécurité de 3s qui set `authInitialized = true`
- `getRedirectResult` a un timeout de 60s
- **Scénario critique** : Sur mobile lent, `onAuthStateChanged` timeout à 3s (pas encore de user) → `authInitialized = true` → `Login.tsx` voit `isFullyReady && !user` → affiche le formulaire de login → PUIS `getRedirectResult` retourne le user à 5s → mais `Login.tsx` ne re-check pas car l'user était déjà absent au moment du premier render
- **Ce scénario est le bug le plus probable sur mobile**

### HYPOTHÈSE 10 — consolidatedOnUserCreated trigger timeout/échec
**Sévérité : P1**
- Après création du document `users/`, le trigger `consolidatedOnUserCreated` lance 9 handlers en parallèle (Telegram, Claims, Affiliate, etc.)
- Si ce trigger échoue ou prend trop de temps, les custom claims ne sont pas set → les Firestore rules peuvent bloquer les lectures suivantes
- **Vérifier** : Le `setCustomClaims` est-il dans Wave 1 ? Est-il bloquant pour le flow ?

### HYPOTHÈSE 11 — Firebase SDK v12 bugs connus avec getRedirectResult
**Sévérité : P1**
- Firebase SDK `^12.3.0` est relativement récent
- Vérifier les GitHub issues `firebase/firebase-js-sdk` pour des bugs connus avec `getRedirectResult` dans cette version
- Notamment : bugs avec `experimentalForceLongPolling`, bugs avec `persistentLocalCache` + auth redirect

### HYPOTHÈSE 12 — Firestore security rules bloquent la création directe (fallback)
**Sévérité : P1**
- Les rules autorisent `create` si `request.auth.uid == userId` ET `role` est dans la liste autorisée
- **MAIS** : Après Google login, avant la création du document, le user n'a PAS de custom claims (`role` n'est pas dans le token)
- Le fallback `createUserDocumentInFirestore` (direct Firestore write) pourrait échouer si les rules vérifient `request.auth.token.role`
- Vérifier exactement quelles rules s'appliquent au `create` de `users/{userId}`

---

## FORMAT DE SORTIE ATTENDU

Chaque agent doit produire un rapport structuré :

```markdown
## Agent [ID] — [Domaine]

### Findings

#### [P0/P1/P2/P3] — [Titre du bug/problème]
- **Fichier** : `chemin/fichier.ts:ligne`
- **Description** : Description précise du problème
- **Impact mobile** : Comment ce bug affecte spécifiquement le mobile
- **Preuve** : Code exact problématique (copier-coller)
- **Solution proposée** : Code corrigé exact
- **Tests à faire** : Comment vérifier que le fix fonctionne

### Recommandations
- Liste ordonnée par priorité des actions à entreprendre
```

---

## CHECKLIST FINALE DE L'AUDIT

À la fin de l'audit, vérifier que TOUS ces points sont couverts :

- [ ] Le `authDomain` est correctement configuré pour le mobile
- [ ] Le callback `/__/auth/handler` est accessible depuis Cloudflare Pages
- [ ] Les `Authorized domains` dans Firebase Console incluent tous les domaines
- [ ] Safari ITP ne bloque pas les cookies auth
- [ ] `signInWithRedirect` fonctionne sur iOS Safari, Chrome iOS, Android Chrome
- [ ] `getRedirectResult` récupère correctement le résultat au retour
- [ ] La session est persistée après le redirect (persistence type correct)
- [ ] Le document Firestore `users/` est créé sans erreur
- [ ] La redirection finale fonctionne (pas de boucle, pas de page blanche)
- [ ] Le flow fonctionne en mode PWA standalone
- [ ] Le flow fonctionne avec réseau lent (3G)
- [ ] Le flow fonctionne en navigation privée Safari
- [ ] Les headers CSP/COOP/COEP ne bloquent rien
- [ ] Pas de race condition dans le handler de redirect
- [ ] Le QuickAuthWizard (modal booking) gère correctement Google Auth mobile
- [ ] Les navigateurs in-app affichent un message d'erreur clair
- [ ] Les erreurs sont logguées pour le debugging (logs Firebase, console)
- [ ] Pas d'orphan users (user Firebase Auth sans document Firestore)
- [ ] Le trigger `consolidatedOnUserCreated` ne bloque pas le flow (custom claims set rapidement)
- [ ] Pas de race condition entre `onAuthStateChanged` (3s timeout) et `getRedirectResult` (60s timeout)
- [ ] Le fallback `createUserDocumentInFirestore` fonctionne avec les Firestore rules actuelles
- [ ] Firebase SDK v12.3.0 n'a pas de bugs connus avec `getRedirectResult` + Long Polling
- [ ] Le `authDiagnostics.ts` détecte correctement les problèmes mobile (tester sur device réel)
- [ ] Les 4 niveaux de fallback du Firestore listener fonctionnent sur mobile lent
- [ ] Le locale redirect dans `index.html` ne casse pas le retour OAuth (query params préservés)
- [ ] Le Cloudflare Worker `sos-expat-bot-ssr` n'intercepte pas les routes auth

---

## NOTES ADDITIONNELLES

- **Firebase SDK version EXACTE** : `firebase ^12.3.0` (frontend), `firebase-admin ^12.7.0`, `firebase-functions ^7.0.5` (backend) — vérifier les changelogs pour bugs connus v12
- **Cloudflare Pages** : Pas de server-side logic, pas de `_routes.json` — uniquement `_redirects` + `_headers`. Le `/__/auth/handler` N'EST PAS sur ce domaine (il est sur `firebaseapp.com`)
- **Cloudflare Worker** : `sos-expat-bot-ssr` dans `sos/cloudflare-worker/` — routes `sos-expat.com/*` et `www.sos-expat.com/*` — UNIQUEMENT pour bot detection/SSR redirect vers `renderForBotsV2` Cloud Function. **Ne doit PAS interférer avec auth**, mais à vérifier
- **3 apps partagent le même Firebase project** : `sos-urgently-ac307` — les authorized domains doivent couvrir tous les domaines
- **Google Auth est réservé aux clients** : Les prestataires (lawyer, expat) ne peuvent PAS se connecter via Google — le code bloque et sign out si le rôle n'est pas `client`
- **Email Enumeration Protection** : Activée sur Firebase — `fetchSignInMethodsForEmail` retourne toujours `[]`
- **Pas de `auth.user().onCreate` trigger** : Architecture basée sur callable + Firestore trigger — le document `users/` est créé par le frontend via Cloud Function, puis le trigger Firestore lance les side-effects
- **Custom claims** : Le `consolidatedOnUserCreated` trigger (Wave 1) contient un handler "Claims sync" — vérifier que c'est bien `setCustomUserClaims({ role: 'client' })` et que c'est exécuté rapidement
- **Commentaire trompeur dans le code** : AuthContext.tsx L.199-201 dit "custom authDomain (www.sosexpats.com)" mais `.env.production` confirme `sos-urgently-ac307.firebaseapp.com` — le custom authDomain n'a JAMAIS été implémenté. Tout le raisonnement ITP basé sur ce commentaire est FAUX.

---

## SCHÉMA DU FLOW COMPLET (pour les agents)

```
USER TAP "Se connecter avec Google"
│
├─ shouldForceRedirectAuth() → true (iOS/Samsung/WebView)
│   │
│   ├─ safeStorage.setItem('googleAuthRedirect', currentURL)
│   ├─ setPersistence(auth, persistence) [fire-and-forget]
│   └─ signInWithRedirect(auth, provider) → REDIRECT vers Google
│       │
│       ├─ Google consent screen
│       └─ REDIRECT retour vers authDomain/__/auth/handler
│           │
│           ├─ authDomain = sos-urgently-ac307.firebaseapp.com
│           ├─ Firebase handler process le token
│           └─ REDIRECT final vers sos-expat.com (origin)
│               │
│               ├─ PAGE RELOAD COMPLET (SPA re-init)
│               │
│               ├─ index.html execute:
│               │   ├─ SW unregister
│               │   ├─ Telegram WebView error suppress
│               │   ├─ Affiliate ?ref= capture
│               │   └─ Locale redirect (si nécessaire)
│               │
│               ├─ React app boot:
│               │   ├─ Firebase init (firebase.ts)
│               │   ├─ AuthContext mount
│               │   │   ├─ onAuthStateChanged listener (3s safety timeout)
│               │   │   └─ getRedirectResult(auth) [60s timeout]
│               │   │       │
│               │   │       ├─ ⚠️ RACE CONDITION ICI ⚠️
│               │   │       │   onAuthStateChanged peut timeout à 3s
│               │   │       │   AVANT que getRedirectResult ne finisse
│               │   │       │
│               │   │       ├─ result.user trouvé:
│               │   │       │   ├─ Token refresh (getIdToken(true))
│               │   │       │   ├─ Delay propagation (500-1500ms)
│               │   │       │   ├─ Check users/{uid} doc exists?
│               │   │       │   │   ├─ OUI → updateDoc (lastLoginAt)
│               │   │       │   │   └─ NON → createUserDocumentViaCloudFunction
│               │   │       │   │       ├─ Retry 3x (backoff: 1s, 2s, 4s)
│               │   │       │   │       └─ Fallback: createUserDocumentInFirestore
│               │   │       │   │
│               │   │       │   └─ savedRedirect = safeStorage.getItem('googleAuthRedirect')
│               │   │       │       ├─ OUI → window.location.href = savedRedirect
│               │   │       │       └─ NON → (React re-render avec user authentifié)
│               │   │       │
│               │   │       └─ result null (timeout ou pas de redirect):
│               │   │           └─ Affiche Login page normalement
│               │   │
│               │   └─ Firestore user listener mount (4 fallbacks)
│               │       ├─ onSnapshot → getDoc 5s → REST 10s → fatal 30s
│               │       └─ isFullyReady = true quand user data loaded
│               │
│               └─ Login.tsx useEffect:
│                   └─ isFullyReady && user → navigate(finalUrl)
│
├─ shouldForceRedirectAuth() → false (Desktop)
│   └─ signInWithPopup(auth, provider) → popup Google → retour immédiat
│       └─ (même flow de création doc, mais SANS page reload)
│
└─ isInAppBrowser() → true (Instagram, Facebook, TikTok...)
    └─ BLOQUÉ avec message d'erreur
```
