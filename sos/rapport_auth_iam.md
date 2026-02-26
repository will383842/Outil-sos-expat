# RAPPORT D'AUDIT COMPLET — AUTH, IAM & SECRETS
## Projet SOS-Expat (`sos-urgently-ac307`)
### Date : 2026-02-26

---

## SCORE DE SÉCURITÉ GLOBAL : 62/100

| Domaine | Score | Commentaire |
|---------|-------|-------------|
| Firebase Auth | 55/100 | Endpoints HTTP sans auth, pas de vérification email |
| Custom Claims & Rôles | 60/100 | Bonne base mais 3 failles critiques |
| IAM GCP | 65/100 | SA trop permissifs, un seul owner |
| Secrets Management | 72/100 | Bonne centralisation, mais secrets orphelins et fuites partielles |
| Firestore Rules | 75/100 | Bien structurées avec double vérification claims+Firestore |

---

## 1. VULNÉRABILITÉS CRITIQUES (Action immédiate)

### C1 — Endpoints HTTP sans authentification
**Sévérité : CRITIQUE | Impact : Exploitation directe possible**

| Endpoint | Fichier | Risque |
|----------|---------|--------|
| `diagnoseProfiles` | `seo/diagnoseProfiles.ts` L8 | Expose données profils sans aucune auth |
| `clearHelpArticles` | `helpCenter/initHelpArticles.ts` L134 | Supprime TOUS les articles — protection: string magique "DELETE_ALL_ARTICLES" |
| `securityAlertAdminAction` | `securityAlerts/triggers.ts` L213-290 | Vérifie `Bearer` header mais NE DECODE PAS le token — n'importe quelle chaîne passe |
| `createSecurityAlertHttp` | `securityAlerts/triggers.ts` L121-167 | Accepte n'importe quelle API key non-vide |
| `initSingleHelpArticle` | `helpCenter/initHelpArticles.ts` L19 | Insertion articles sans auth |
| `initHelpArticlesBatch` | `helpCenter/initHelpArticles.ts` L63 | Insertion batch sans auth |

**Remédiation** : Ajouter `verifyIdToken()` + vérification admin dans chaque endpoint, ou les convertir en `onCall`.

### C2 — `registerLocalBackup` sans vérification admin
**Sévérité : CRITIQUE | Fichier : `admin/localBackupRegistry.ts` L71-128**

Tout utilisateur authentifié (ou même non-authentifié si pas de check auth) peut enregistrer de faux backups dans `local_backups`.

**Remédiation** : Ajouter `assertAdmin()` au début de la fonction.

### C3 — `adminResetFAQs` vérifie champ inexistant
**Sévérité : CRITIQUE | Fichier : `admin/resetFAQsCallable.ts` L256**

Vérifie `userData?.roles?.includes("admin")` au lieu de `userData?.role === "admin"`. Le champ `roles` (array) n'existe pas dans le schéma `users`. Seul le fallback `userData?.isAdmin` protège cette fonction.

**Remédiation** : Remplacer par `userData?.role === "admin" || claims?.admin === true`.

### C4 — `syncAllCustomClaims` ignore les rôles affiliés
**Sévérité : CRITIQUE | Fichier : `admin/restoreUserRoles.ts` L217**

La requête `where("role", "in", ["client", "lawyer", "expat", "admin"])` exclut chatter, influencer, blogger, groupAdmin. Si utilisé pour resynchroniser après un incident, les affiliés perdraient leurs claims.

**Remédiation** : Ajouter tous les rôles : `["client", "lawyer", "expat", "admin", "chatter", "influencer", "blogger", "groupAdmin"]`

### C5 — Pas de vérification d'email (`sendEmailVerification`)
**Sévérité : CRITIQUE | Fichier : `sos/src/contexts/AuthContext.tsx`**

`sendEmailVerification()` n'est appelé NULLE PART dans le frontend. Un utilisateur peut s'inscrire avec n'importe quel email sans vérification. Les utilisateurs Google OAuth sont OK (emailVerified auto), mais les Email/Password n'ont aucun mécanisme.

**Remédiation** : Ajouter `sendEmailVerification(user)` après chaque `createUserWithEmailAndPassword()`. Bloquer l'accès aux fonctions critiques tant que l'email n'est pas vérifié.

---

## 2. VULNÉRABILITÉS ÉLEVÉES (Corriger rapidement)

### E1 — Pas de `revokeRefreshTokens` dans tout le projet
**Fichier : Tout le projet**

Aucun appel à `revokeRefreshTokens` n'a été trouvé. Un utilisateur banni conserve ses tokens jusqu'à 1h après le bannissement.

**Remédiation** : Appeler `revokeRefreshTokens(uid)` dans les flux de suspension/bannissement (`providerActions.ts` L577, L1192) et après chaque changement de claims dans `syncRoleClaims.ts`.

### E2 — Pas de vérification de suspension client avant appels
**Fichier : `createAndScheduleCallFunction.ts` L164**

`createAndScheduleCallHTTPS` vérifie `request.auth` mais ne vérifie pas si le client est suspendu dans Firestore. Un client suspendu avec un token valide peut initier des appels.

**Remédiation** : Ajouter une vérification `isSuspended`/`isBlocked` du caller avant de scheduler l'appel.

### E3 — Pas de rate limiting applicatif sur les fonctions `onCall`
**Fichier : Tous les callables**

Seule la protection native Firebase s'applique. Un attaquant authentifié pourrait appeler en boucle des fonctions coûteuses.

**Remédiation** : Implémenter un rate limiter applicatif pour les fonctions critiques (appels, paiements).

### E4 — Claims non révoqués quand un affilié est banni/suspendu
**Fichier : `triggers/syncRoleClaims.ts`**

Si un chatter est banni dans la collection `chatters`, son claim `role: "chatter"` persiste. Le trigger ne détecte que les changements sur `users/{uid}.role`, pas sur `chatters/{uid}.status`.

**Remédiation** : Ajouter des triggers sur les collections affiliées pour mettre à jour/révoquer les claims.

### E5 — `TEST_BYPASS_VALIDATIONS` accessible en production
**Fichier : `TwilioCallManager.ts` L499, L751**

Ce flag dans Secret Manager permet de contourner les validations d'appels Twilio en production.

**Remédiation** : Restreindre à l'émulateur uniquement (`if (isEmulator() && process.env.TEST_BYPASS_VALIDATIONS === "1")`).

### E6 — Fuite partielle de secrets dans les logs
**Fichier : `lib/tasks.ts` L253, `lib/secrets.ts` L334,364**

Les 8 premiers caractères du `TASKS_AUTH_SECRET` et les 10 premiers des clés Stripe sont loggés.

**Remédiation** : Remplacer par `hasValue: true/false` sans préfixe.

### E7 — Service Account Default Compute avec privilèges excessifs
**IAM Policy**

`268195823113-compute@developer.gserviceaccount.com` a : `firebase.admin`, `datastore.owner`, `cloudfunctions.admin`, `cloudscheduler.admin`, `storagetransfer.admin`, `run.invoker`, `iam.serviceAccountTokenCreator`, `iam.serviceAccountUser`, `secretmanager.secretAccessor`.

**Remédiation** : Créer des SA dédiés par domaine fonctionnel avec rôles minimaux.

### E8 — Tous les SA ont accès à TOUS les secrets
**IAM Policy**

Les 3 service accounts ont `secretmanager.secretAccessor`. Pas de segmentation. Une fonction compromise donne accès à tous les secrets.

**Remédiation** : Implémenter des IAM bindings par secret, limitant l'accès aux seuls SA qui en ont besoin.

### E9 — Clé de migration hardcodée prévisible
**Fichier : `seo/migrateProfileSlugs.ts` L210**

Clé `sos-expat-migrate-2024` hardcodée et prévisible.

**Remédiation** : Remplacer par un secret Firebase (`defineSecret`).

---

## 3. VULNÉRABILITÉS MOYENNES

| # | Description | Fichier | Remédiation |
|---|-------------|---------|-------------|
| M1 | Schéma de suspension inconsistant (`isSuspended` vs `suspended`) | `providerActions.ts` vs `securityAlerts/triggers.ts` | Unifier sur un seul champ |
| M2 | Un seul owner du projet GCP (risque lock-out) | IAM Policy | Ajouter un 2e owner de confiance |
| M3 | App Engine SA avec `roles/editor` | IAM Policy | Examiner si nécessaire |
| M4 | 15 `defineSecret()` hors de `lib/secrets.ts` | 7 fichiers dispersés | Centraliser dans `lib/secrets.ts` |
| M5 | 19+ secrets orphelins dans Secret Manager | Secret Manager | Auditer et supprimer |
| M6 | Aucune rotation automatique des secrets | Secret Manager | Configurer rotation via Cloud Scheduler |
| M7 | Anciennes versions de secrets restent `enabled` | Secret Manager | Désactiver les versions antérieures |
| M8 | Notification `role_changed` créée mais jamais traitée côté frontend | `triggers/syncRoleClaims.ts` L142-155 | Ajouter listener frontend |
| M9 | 4 patterns différents de vérification admin | Multiples fichiers admin | Standardiser sur `assertAdmin()` |
| M10 | Rôle `dev` référencé mais jamais défini dans les claims | `backupRestoreAdmin.ts` L135 | Supprimer références au rôle `dev` |
| M11 | Multi-rôles non supporté (role = string unique) | Architecture | Documenter la limitation |
| M12 | Getters secrets retournent `""` au lieu de throw | `lib/secrets.ts` | Lever erreur en production |
| M13 | Clé API Firebase d'un autre projet en dur dans le frontend | `useMultiProviderDashboard.ts` L38 | Migrer vers variable VITE_ |

---

## 4. VULNÉRABILITÉS FAIBLES

| # | Description |
|---|-------------|
| F1 | Nettoyage profils orphelins non automatisé |
| F2 | Admin emails hardcodés en fallback dans `auth/setAdminClaims.ts` L15-19 |
| F3 | `checkHelpCategories` en lecture seule sans auth |
| F4 | `TWILIO_WHATSAPP_NUMBER` orphelin dans Secret Manager |
| F5 | `STRIPE_PUBLISHABLE_KEY_LIVE` (clé publique) stockée comme secret |
| F6 | `.env.production` commité dans git (uniquement clés publiques) |
| F7 | `SENTRY_DSN_BACKEND` lu via `process.env` sans `defineSecret` |
| F8 | Stubs `sk_live_XXX`/`sk_test_XXX` dans `index.minimal.ts` |

---

## 5. CARTOGRAPHIE DES CLAIMS PAR RÔLE

| Rôle | Claim `role` | Claim `admin` | Collection Firestore | Vérification Rules |
|------|-------------|---------------|---------------------|-------------------|
| **client** | `"client"` | — | `users` | `isClient()` via claims |
| **lawyer** | `"lawyer"` | — | `users` + `sos_profiles` | `isProvider()` via claims |
| **expat** (helper) | `"expat"` | — | `users` + `sos_profiles` | `isProvider()` via claims |
| **chatter** | `"chatter"` | — | `users` + `chatters` | `isActiveChatter()` via Firestore lookup |
| **influencer** | `"influencer"` | — | `users` + `influencers` | `isActiveInfluencer()` via Firestore lookup |
| **blogger** | `"blogger"` | — | `users` + `bloggers` | `isActiveBlogger()` via Firestore lookup |
| **groupAdmin** | `"groupAdmin"` | — | `users` + `group_admins` | `isActiveGroupAdmin()` via Firestore lookup |
| **admin** | `"admin"` | `true` | `users` | `isAdmin()` claims + Firestore fallback |
| **agency_manager** | AUCUN claim | — | `users` | `isAgencyManager()` via Firestore only |

**Note** : Le rôle `expatHelper` n'existe PAS dans le code. Le rôle équivalent est `expat`.

---

## 6. INVENTAIRE DES SECRETS (76 secrets)

### Par catégorie

| Catégorie | Nombre | Exemples |
|-----------|--------|----------|
| Stripe | 13 | `STRIPE_SECRET_KEY_LIVE`, webhooks, connect |
| PayPal | 9 | Client IDs, secrets, webhooks |
| Google Ads | 7 | Tokens, conversion IDs |
| Twilio | 4 | SID, Auth Token, Phone, WhatsApp |
| Wise | 3 | API Token, Profile ID, Webhook |
| Flutterwave | 3 | Secret Key, Public Key, Webhook |
| IA/LLM | 3 | OpenAI, Anthropic, Perplexity |
| Email | 3 | User, Pass, From |
| Telegram | 2 | Bot Token, Webhook Secret |
| Monitoring | 2 | Sentry DSN × 2 |
| Redis/Cache | 4 | Host, Port, Upstash × 2 |
| Interne | 18 | API keys, encryption, tasks, backup |
| Autre | 5 | META_CAPI, GA4, Backlink Engine, etc. |

### Secrets orphelins (dans Secret Manager mais non référencés dans le code)

`ADMIN_API_KEY`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `SOS_PLATFORM_API_KEY`, `SYNC_PROVIDER_API_KEY`, `BACKUP_CRON_TOKEN`, `PHONE_ENCRYPTION_KEY`, `REDIS_HOST`, `REDIS_PORT`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL`, `PAYPAL_CLIENT_ID_LIVE`, `PAYPAL_CLIENT_SECRET_LIVE`, `STRIPE_SECRET_KEY_TEST_V1`, `STRIPE_WEBHOOK_SECRET_TEST_V1`, `STRIPE_WEBHOOK_SECRET_CONNECT_LIVE`, `STRIPE_PUBLISHABLE_KEY_LIVE`, `TWILIO_WHATSAPP_NUMBER`, `PAYPAL_PAYOUT_WEBHOOK_ID`, `FUNCTIONS_CONFIG_EXPORT`

---

## 7. IAM — RÉSUMÉ

### Service Accounts

| SA | Rôles principaux | Risque |
|----|-------------------|--------|
| `268195823113-compute@developer.gserviceaccount.com` | firebase.admin, datastore.owner, cloudfunctions.admin, secretmanager.secretAccessor | **ÉLEVÉ** — Trop de privilèges |
| `sos-urgently-ac307@appspot.gserviceaccount.com` | editor, firebaseauth.admin, secretmanager.secretAccessor | **MOYEN** — roles/editor par défaut |
| `firebase-adminsdk-fbsvc@...` | cloudfunctions.admin, storage.admin, secretmanager.secretAccessor | **MOYEN** |

### Owner unique
`williamsjullin@gmail.com` — seul owner. Risque de lock-out.

### Logs d'audit (7 derniers jours)
- Aucune erreur auth en production (`auth/invalid-credential`, `auth/too-many-requests`, `auth/user-disabled`)
- Aucun accès suspect aux secrets (Secret Manager severity >= WARNING)

---

## 8. POINTS POSITIFS

1. **Toutes les fonctions `onCall` vérifient `request.auth`** — > 100 occurrences correctes
2. **Custom Claims bien implémentés** pour les admins avec whitelist Firestore
3. **RGPD bien géré** — anonymisation, suppression Stripe, audit trail 3 ans
4. **Détection de fraude** dans les inscriptions affiliés
5. **Système d'alertes de sécurité élaboré** — 14 types, escalade auto, rate limiting
6. **Centralisation des secrets** dans `lib/secrets.ts` — bonne architecture
7. **Aucune vraie credential en dur** dans le code source
8. **Comparaison timing-safe** pour Cloud Tasks (`crypto.timingSafeEqual`)
9. **`.gitignore` complet** — bonne couverture des fichiers sensibles
10. **Webhooks externes** (Stripe/Twilio/PayPal) correctement publics avec vérification de signatures
11. **`createUserDocument` vérifie l'identité** — `auth.uid === uid`
12. **Auto-approbation uniquement pour clients** — providers restent en `pending`
13. **Masquage des données sensibles** dans les logs (`maskSensitiveData.ts`)

---

## 9. PLAN D'ACTION PRIORISÉ

### Phase 1 — URGENTE (semaine 1)

| # | Action | Effort | Fichier(s) |
|---|--------|--------|------------|
| 1 | Sécuriser les 6 endpoints HTTP sans auth (C1) | 2h | `securityAlerts/triggers.ts`, `helpCenter/initHelpArticles.ts`, `seo/diagnoseProfiles.ts` |
| 2 | Ajouter `assertAdmin()` dans `registerLocalBackup` (C2) | 15min | `admin/localBackupRegistry.ts` L71 |
| 3 | Corriger `roles` → `role` dans `adminResetFAQs` (C3) | 15min | `admin/resetFAQsCallable.ts` L256 |
| 4 | Étendre `syncAllCustomClaims` avec tous les rôles (C4) | 30min | `admin/restoreUserRoles.ts` L217 |
| 5 | Restreindre `TEST_BYPASS_VALIDATIONS` à l'émulateur (E5) | 30min | `TwilioCallManager.ts` L499, L751 |

### Phase 2 — IMPORTANTE (semaine 2)

| # | Action | Effort | Fichier(s) |
|---|--------|--------|------------|
| 6 | Ajouter `sendEmailVerification()` après inscription (C5) | 1h | `AuthContext.tsx`, `auth.ts` |
| 7 | Ajouter `revokeRefreshTokens()` dans suspension/ban (E1) | 1h | `providerActions.ts`, `syncRoleClaims.ts` |
| 8 | Vérifier suspension client avant `createAndScheduleCall` (E2) | 30min | `createAndScheduleCallFunction.ts` |
| 9 | Corriger fuite partielle de secrets dans logs (E6) | 30min | `lib/tasks.ts`, `lib/secrets.ts` |
| 10 | Remplacer clé migration hardcodée par secret (E9) | 30min | `seo/migrateProfileSlugs.ts` |

### Phase 3 — AMÉLIORATION (semaine 3-4)

| # | Action | Effort |
|---|--------|--------|
| 11 | Centraliser les 15 `defineSecret()` dispersés | 2h |
| 12 | Nettoyer les 19+ secrets orphelins | 1h |
| 13 | Standardiser vérification admin (un seul helper) | 2h |
| 14 | Ajouter rate limiting applicatif sur callables critiques | 3h |
| 15 | Supprimer références au rôle `dev` | 30min |

### Phase 4 — INFRASTRUCTURE (planifiée)

| # | Action | Effort |
|---|--------|--------|
| 16 | Créer SA dédiés par domaine (IAM least privilege) | 4h |
| 17 | Configurer rotation automatique des secrets | 3h |
| 18 | Désactiver anciennes versions de secrets | 1h |
| 19 | Ajouter listener frontend pour `role_changed` | 2h |
| 20 | Ajouter un 2e owner GCP | 15min |

---

## 10. SYNTHÈSE PAR SÉVÉRITÉ

| Sévérité | Nombre | Résumé |
|----------|--------|--------|
| **CRITIQUE** | 5 | Endpoints sans auth, claim check erroné, sync incomplet, pas de vérif email |
| **ÉLEVÉ** | 9 | Pas de token revocation, bypass validations, SA trop permissifs, fuites logs |
| **MOYEN** | 13 | Secrets orphelins, patterns inconsistants, rotation manuelle, un seul owner |
| **FAIBLE** | 8 | Clés publiques en dur, secrets inutiles, stubs de test |

**Total : 35 findings**

---

*Rapport généré le 2026-02-26 — Phase 1 : Analyse uniquement, ZÉRO modification.*
*Toute correction nécessite validation explicite.*
