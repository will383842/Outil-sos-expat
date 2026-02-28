# RAPPORT D'AUDIT — RACCORDEMENT FRONTEND ↔ BACKEND
**Projet** : SOS-Expat
**Date** : 2026-02-27
**Périmètre** : ~225 appels httpsCallable, ~50 fonctions onRequest, 5 instances Functions

---

## TABLE DES MATIÈRES

1. [Architecture des instances Functions](#1-architecture)
2. [Cartographie frontend → backend](#2-cartographie)
3. [Problèmes P1 — CRITIQUES](#3-p1)
4. [Problèmes P2 — IMPORTANTS](#4-p2)
5. [Problèmes P3 — MINEURS](#5-p3)
6. [CORS](#6-cors)
7. [Variables d'environnement](#7-env)
8. [Points positifs](#8-positifs)

---

## 1. ARCHITECTURE DES INSTANCES FUNCTIONS {#1-architecture}

| Variable Frontend | Région | Rôle |
|---|---|---|
| `functions` | `europe-west1` | Core business & API publiques (~120 appels) |
| `functionsPayment` | `europe-west3` | Payments Stripe/PayPal (2 appels) |
| `functionsWest3` | `europe-west3` | Triggers Twilio/Telegram (4 appels) |
| `functionsWest2` | `us-central1` | Affiliate/Marketing (~100 appels) |
| `outilFunctions` | `europe-west1` | Projet externe outils-sos-expat (7 appels) |

**Cohérence** : ✅ Les 4 régions correspondent à l'architecture 3-régions documentée.

---

## 2. CARTOGRAPHIE FRONTEND → BACKEND {#2-cartographie}

### Résumé

| Catégorie | Nombre |
|---|---|
| Fonctions OK (match parfait) | ~180 |
| Fonctions INEXISTANTES (jamais créées) | 20 |
| Fonctions DÉSACTIVÉES (commentées index.ts) | 12 |
| Fonctions NON EXPORTÉES (existent mais pas déployées) | 15 |
| Fonctions MISMATCH NOM | 3 |
| **TOTAL appels frontend** | **~225** |

---

## 3. PROBLÈMES P1 — CRITIQUES {#3-p1}

### P1-01 — MISMATCH NOMS SUBSCRIPTION (3 fonctions cassées)

Le système d'abonnement est **cassé** — le frontend appelle des noms différents du backend :

| Nom appelé (frontend) | Nom déployé (backend) | Fichier frontend |
|---|---|---|
| `createSubscription` | `subscriptionCreate` | `services/subscription/subscriptionService.ts` |
| `updateSubscription` | `subscriptionUpdate` | `services/subscription/subscriptionService.ts` |
| `createStripePortalSession` | `subscriptionPortal` | `services/subscription/subscriptionService.ts` |

**Impact** : Les utilisateurs ne peuvent pas créer/modifier d'abonnement ni accéder au portail Stripe.

**Correction** : Renommer côté frontend OU côté backend pour aligner les noms.

---

### P1-02 — `verifySubscriptionSession` INEXISTANTE

| Fonction | Fichier frontend | Impact |
|---|---|---|
| `verifySubscriptionSession` | `pages/Dashboard/SubscriptionSuccess.tsx` | Page de succès après paiement cassée |

**Impact** : Après un paiement Stripe réussi, la page de confirmation échoue silencieusement.

---

### P1-03 — Catch silencieux sur opérations financières (ChatterPayments.tsx)

3 opérations critiques échouent sans feedback utilisateur :

```typescript
// Ligne 236-238 : Suppression de méthode de paiement
catch (err) { console.error('Failed to delete method:', err); }

// Ligne 250-252 : Changement de méthode par défaut
catch (err) { console.error('Failed to set default method:', err); }

// Ligne 266-268 : Annulation de retrait
catch (err) { console.error('Failed to cancel withdrawal:', err); }
```

**Impact** : L'utilisateur clique, rien ne se passe. Un retrait qu'il croit annulé ne l'est peut-être pas.

**Correction** : Ajouter `toast.error(t('payment.error.xxx'))` dans chaque catch.

---

### P1-04 — `capturePayment` / `cancelPayment` avalent les erreurs (api.ts)

```typescript
// services/api.ts lignes 169-172
export async function capturePayment(paymentIntentId: string): Promise<boolean> {
  try { ... }
  catch (error) {
    console.error('Error capturing payment:', error);
    return false;  // Erreur silencieuse sur opération financière !
  }
}
```

**Impact** : L'appelant reçoit `false` mais ne distingue pas "pas de capture nécessaire" de "erreur réseau".

---

### P1-05 — onSnapshot sans error callback dans useBlogger

`sos/src/hooks/useBlogger.ts` (lignes 178, 203, 227) — 3 subscriptions Firestore (`blogger_commissions`, `blogger_withdrawals`, `blogger_notifications`) sans callback d'erreur.

**Impact** : Si les règles Firestore refusent l'accès, le blogger voit un spinner infini.

**Correction** : Ajouter `(err) => { console.error(...); setError(err); }` comme 3ème argument.

---

### P1-06 — Secrets hardcodés dans le code source

| Fichier | Ligne | Secret |
|---|---|---|
| `seeds/initCountryConfigs.ts` | 169 | `'sos-expat-seed-2024'` |
| `migrations/migrateLegalDocuments.ts` | 466 | `'sos-expat-migration-2025'` |

**Correction** : Utiliser `defineSecret()` ou Firebase Secret Manager.

---

### P1-07 — `VITE_RECAPTCHA_SITE_KEY` non défini

Anti-bot reCAPTCHA v3 désactivé en production. `useAntiBot.ts` retourne une chaîne vide. Les inscriptions chatter sont sans protection anti-bot.

---

### P1-08 — `VITE_FIREBASE_VAPID_KEY` non défini

Push notifications (FCM) désactivées. `useFCM.ts` ne peut pas générer de token FCM sans VAPID key.

---

## 4. PROBLÈMES P2 — IMPORTANTS {#4-p2}

### P2-01 — 15 fonctions admin NON EXPORTÉES depuis index.ts

Ces fonctions existent dans les sous-modules mais ne sont pas re-exportées depuis `index.ts`, donc non déployées :

**Influencer (4)** :
- `adminUpdateCommissionRules`, `adminUpdateAntiFraudConfig`, `adminExportInfluencers`, `adminGetRateHistory`

**Blogger Resources (4)** :
- `adminSaveBloggerResourceFile`, `adminSaveBloggerResourceText`, `adminDeleteBloggerResourceFile`, `adminDeleteBloggerResourceText`

**Blogger Guide (6)** :
- `adminSaveBloggerGuideTemplate`, `adminSaveBloggerGuideCopyText`, `adminSaveBloggerGuideBestPractice`
- `adminDeleteBloggerGuideTemplate`, `adminDeleteBloggerGuideCopyText`, `adminDeleteBloggerGuideBestPractice`

**Autre** :
- `adminBulkInfluencerAction` — pas trouvé dans le backend

**Impact** : Pages admin non fonctionnelles pour ces actions.

---

### P2-02 — 20 fonctions frontend vers backend INEXISTANT

| Fonction | Fichier frontend | Gravité |
|---|---|---|
| `sendNotification` | `services/notifications/notificationService.ts` | Moyenne |
| `sendPushNotification` | `services/notifications/notificationService.ts` | Moyenne |
| `grantAdminIfToken` | `services/backupService.ts` | Basse |
| `capturePayment` | `services/api.ts` | Haute (si utilisé) |
| `cancelPayment` | `services/api.ts` | Haute (si utilisé) |
| `initiateCall` | `services/api.ts` | Code mort probable |
| `sendSms` | `services/api.ts` | Code mort probable |
| `updateCallStatus` | `services/api.ts` | Code mort probable |
| `sendInvoiceEmail` | `pages/admin/AdminInvoices.tsx` | Moyenne |
| `regenerateInvoice` | `pages/admin/AdminInvoices.tsx` | Moyenne |
| `sendBulkInvoiceEmails` | `pages/admin/AdminInvoices.tsx` | Moyenne |
| `getTwilioUsage` | `services/costMonitoringService.ts` | Basse |
| `acknowledgeCostAlert` | `services/costMonitoringService.ts` | Basse |
| `recalculateCostMetrics` | `services/costMonitoringService.ts` | Basse |
| `updateCostThreshold` | `services/costMonitoringService.ts` | Basse |
| `admin_getAllCampaigns` | `emails/admin/CampaignsPage.tsx` | Basse (marquée "à créer") |
| `admin_getRecipients` | `emails/admin/SendToAll.tsx` | Basse |
| `admin_sendEmail` | `emails/admin/` (4 fichiers) | Basse |
| `admin_logEmail` | `emails/admin/` (4 fichiers) | Basse |

---

### P2-03 — Aucun toast dans les pages utilisateur critiques

Pages qui font des appels httpsCallable sans utiliser `toast` pour informer :

| Page | Fichier | Opérations |
|---|---|---|
| ChatterProfile | `pages/Chatter/ChatterProfile.tsx` | Upload photo, mise à jour profil |
| ChatterRegister | `pages/Chatter/ChatterRegister.tsx` | Inscription complète |
| InfluencerProfile | `pages/Influencer/InfluencerProfile.tsx` | Upload photo |
| GroupAdminPayments | `pages/GroupAdmin/GroupAdminPayments.tsx` | Retrait |
| GroupAdminDashboard | `pages/GroupAdmin/GroupAdminDashboard.tsx` | Chargement dashboard |
| BloggerRegister | `pages/Blogger/BloggerRegister.tsx` | Inscription |
| CallCheckout | `pages/CallCheckout.tsx` | Paiement Stripe |

Ces pages utilisent `setError` — OK si l'erreur est rendue dans le JSX, mais les erreurs transitoires (suppression, annulation) sont invisibles.

---

### P2-04 — CORS inline désynchronisés

4 fichiers définissent manuellement un tableau CORS au lieu d'utiliser `ALLOWED_ORIGINS`, avec des domaines manquants :

| Fichier | Domaines manquants |
|---|---|
| `callables/repairOrphanedUser.ts` (l.37) | `multi.sos-expat.com`, `sosexpats.com`, `www.sosexpats.com` |
| `chatter/callables/telegramOnboarding.ts` (l.370, 478, 990) | idem |
| `multiDashboard/validateDashboardPassword.ts` (l.61) | `ia.sos-expat.com`, `outil-sos-expat.pages.dev` |
| `telegram/withdrawalConfirmation.ts` (l.495) | `multi.sos-expat.com`, `sosexpats.com` |

**Correction** : Remplacer par `cors: ALLOWED_ORIGINS` partout.

---

### P2-05 — `throw new Error()` dans services appelés par callables

37 fichiers de services utilisent `throw new Error()` au lieu de `HttpsError`. Les cas les plus critiques :

| Service | Fichier | Impact |
|---|---|---|
| `paymentService.ts` | 50+ `throw new Error(...)` | Tous les retraits → erreur `internal` générique |
| `TwilioCallManager.ts` | 20+ `throw new Error(...)` | Gestion d'appels |
| `createAndScheduleCallFunction.ts` (l.63) | `assertE164` expose le numéro de téléphone | Fuite PII potentielle |

**Correction** : Créer un pattern d'erreur unifié (ex: `ServiceError` qui mappe vers `HttpsError`).

---

### P2-06 — `VITE_SENTRY_DSN` non défini

Monitoring Sentry complètement désactivé. Aucune erreur frontend n'est capturée. Le code dégrade gracieusement.

---

### P2-07 — Aucun timeout sur les appels httpsCallable côté frontend

Le SDK Firebase Functions a un timeout par défaut de 70 secondes. Si une Cloud Function est lente, l'utilisateur attend 70s sans feedback.

**Correction** : Ajouter un wrapper avec `Promise.race` et timeout 15-30s pour les opérations interactives.

---

### P2-08 — Pas de détection offline globale

La détection `navigator.onLine` n'est implémentée que dans 2 endroits (`PWAProvider.tsx` et `PasswordReset.tsx`). Aucune page critique (CallCheckout, ChatterPayments, registrations) ne vérifie si l'utilisateur est en ligne.

---

### P2-09 — 7 URLs Cloud Run/Cloud Functions en dur dans le frontend

| Fichier | URL en dur |
|---|---|
| `hooks/useMetaTracking.ts:66` | `https://trackcapievent-5tfnuxa2hq-ew.a.run.app` |
| `components/payment/PayPalPaymentForm.tsx:323` | `https://createpaypalorderhttp-5tfnuxa2hq-ey.a.run.app` |
| `components/payment/PayPalPaymentForm.tsx:402` | `https://authorizepaypalorderhttp-5tfnuxa2hq-ey.a.run.app` |
| `pages/ProviderProfile.tsx:1701/1980` | `https://europe-west1-sos-urgently-ac307.cloudfunctions.net/generateOgImage/...` |
| `pages/admin/AdminMetaAnalytics.tsx:365` | `https://testcapiconnection-5tfnuxa2hq-ew.a.run.app` |
| `pages/admin/AdminGoogleAdsAnalytics.tsx:340` | `https://europe-west1-...cloudfunctions.net/testGoogleAdsConnection` |
| `pages/Contact.tsx:719` | `https://createcontactmessage-5tfnuxa2hq-ew.a.run.app` |

**Impact** : Si les fonctions sont redéployées avec un nouveau hash Cloud Run, ces URLs casseront.

**Correction** : Migrer vers `httpsCallable()` ou variables d'env.

---

### P2-10 — `cors: true` (wildcard) sur une fonction admin

`seeds/paypalWelcomeTemplates.ts` (l.1173) utilise `cors: true` au lieu de `ALLOWED_ORIGINS`.

---

### P2-11 — `VITE_PAYPAL_CLIENT_ID` absent de `.env.production`

Fonctionne grâce au fallback `.env` (base), mais fragile. Si le build Cloudflare ne charge pas `.env` base, PayPal sera désactivé silencieusement.

---

## 5. PROBLÈMES P3 — MINEURS {#5-p3}

### P3-01 — 12 fonctions désactivées mais toujours appelées depuis le frontend

| Fonction | Raison désactivation |
|---|---|
| `translateProvider` | "DISABLED 2026-01-31" |
| `updateProviderTranslation` | "DISABLED 2026-01-31" |
| `initializeAffiliateConfig` | "One-time init" |
| `subscriptionInitializePlans` | "One-shot seed" |
| `createMonthlyStripePrices` | "One-shot seed" |
| `createAnnualStripePrices` | "One-shot seed" |
| `subscriptionMigrateTo9Languages` | "One-shot seed" |
| `markCountryAsRegistered` | "DISABLED 2026-01-30" |
| `initializeThresholdTracking` | "DISABLED 2026-01-30" |
| `adminSeedTrainingModules` | "DISABLED 2026-01-30" |
| `adminSeedInfluencerTrainingModules` | "DISABLED 2026-01-30" |
| `createManualBackup` | "Fichier supprimé" |

**Impact** : Pages admin montrent des boutons qui ne fonctionnent pas (erreur `not-found`).

---

### P3-02 — Dead code dans api.ts

`initiateCall`, `sendSms`, `updateCallStatus` appellent des Cloud Functions inexistantes. Code mort à supprimer.

---

### P3-03 — Catch vide dans AdminAaaProfiles

```typescript
// AdminAaaProfiles.tsx ligne 804
} catch (e) {}
```

C'est un catch sur `getLanguageCode()` (non-critique), acceptable avec un commentaire.

---

### P3-04 — Nommage legacy `functionsWest2`

L'export `functionsWest2` dans `firebase.ts` pointe vers `us-central1`. Le nom est un vestige de la migration. Fonctionnellement correct mais confus.

---

### P3-05 — `VITE_FIREBASE_MEASUREMENT_ID` orphelin

Défini dans `.env.example` mais jamais utilisé dans le code. À supprimer.

---

### P3-06 — Variables Google Ads absentes de `.env.production`

`VITE_GOOGLE_ADS_CONVERSION_ID` et les 4 `_LABEL` ne sont définis que dans `.env` base. Tracking conversions fragile.

---

## 6. CORS {#6-cors}

### ✅ Ce qui fonctionne

- **Configuration centralisée** : `ALLOWED_ORIGINS` dans `functionConfigs.ts` avec 8 domaines + 2 localhost
- **Fonctions onCall (~196)** : CORS géré automatiquement par Firebase SDK
- **Fonctions onRequest frontend** : Majorité utilise `ALLOWED_ORIGINS`
- **Webhooks server-to-server** : Correctement sans CORS (Stripe, Twilio, PayPal, email)

### ⚠️ Ce qui pose problème

| Sévérité | Problème | Fichier |
|---|---|---|
| Moyenne | `cors: true` (wildcard) sur fonction admin seed | `paypalWelcomeTemplates.ts` |
| Moyenne | 4 fichiers avec CORS inline désynchronisé | Voir P2-04 |
| Faible | `initializeMessageTemplates` bypass auth si secret non configuré | `chatter/messageTemplates.ts` |
| Faible | `generateOgImage` sans authentification ni rate limiting | `seo/ogImageService.ts` |

---

## 7. VARIABLES D'ENVIRONNEMENT {#7-env}

### Variables critiques manquantes

| Variable | Impact | Fichiers |
|---|---|---|
| `VITE_RECAPTCHA_SITE_KEY` | Anti-bot désactivé | `useAntiBot.ts` |
| `VITE_FIREBASE_VAPID_KEY` | Push notifications désactivées | `useFCM.ts` |
| `VITE_SENTRY_DSN` | Monitoring erreurs désactivé | `sentry.ts` |
| `VITE_PAYPAL_CLIENT_ID` (dans .env.production) | PayPal fragile | `PayPalContext.tsx` |

### Variables en dur dans le code (à externaliser)

- 7 URLs Cloud Run/Cloud Functions (voir P2-09)
- Meta Pixel ID `2204016713738311` dans `metaPixel.ts`
- Secrets de migration (voir P1-06)

### ✅ Ce qui est correct

- Config Firebase 100% via variables d'env avec validation stricte
- Aucune clé secrète exposée côté frontend
- `.gitignore` couvre tous les `.env*` sauf `.env.example`
- Régions Functions cohérentes entre `.env` et `firebase.ts`
- `authDomain` personnalisé en production (`sos-expat.com`)

---

## 8. POINTS POSITIFS {#8-positifs}

- **ErrorBoundary global** avec Sentry, retry, reload, event ID
- **Sentry configuré** : Session replay 100% sur erreur, 10% normalement
- **Cache Firestore persistant** : IndexedDB 50MB, multi-onglets, détection corruption
- **Loading states dans les hooks** : Tous les hooks principaux exposent `isLoading`
- **AuthContext timeout adaptatif** : Ajuste le timeout selon la vitesse de connexion
- **PWAProvider** : Détection online/offline avec event listeners
- **ChatterRegister** : Gestion exemplaire avec cleanup orphelins Firebase Auth
- **CORS centralisé** : `ALLOWED_ORIGINS` dans `functionConfigs.ts`
- **HttpsError structuré** : 165 fichiers backend utilisent correctement les codes d'erreur

---

## PLAN D'ACTION RECOMMANDÉ

### Semaine 1 — P1 Critiques (5 corrections)

1. **Aligner noms subscription** : `createSubscription` → `subscriptionCreate` (3 fonctions)
2. **Créer `verifySubscriptionSession`** ou corriger `SubscriptionSuccess.tsx`
3. **Ajouter toast.error** dans `ChatterPayments.tsx` (3 catch silencieux)
4. **Ajouter error callbacks** dans `useBlogger.ts` (3 onSnapshot)
5. **Définir `VITE_RECAPTCHA_SITE_KEY`** et `VITE_FIREBASE_VAPID_KEY` dans les `.env`

### Semaine 2 — P2 Importants (6 corrections)

6. **Exporter les 15 fonctions manquantes** depuis `index.ts`
7. **Remplacer CORS inline** par `ALLOWED_ORIGINS` (4 fichiers)
8. **Définir `VITE_SENTRY_DSN`** pour activer le monitoring
9. **Ajouter `VITE_PAYPAL_CLIENT_ID`** dans `.env.production`
10. **Ajouter toast** dans les pages utilisateur (GroupAdminPayments, ChatterProfile, etc.)
11. **Migrer secrets hardcodés** vers Firebase Secret Manager

### Semaine 3 — P3 Améliorations (4 corrections)

12. **Supprimer dead code** `api.ts` (initiateCall, sendSms, updateCallStatus)
13. **Supprimer appels frontend** vers fonctions désactivées (12 fonctions)
14. **Externaliser URLs Cloud Run** en dur vers variables d'env
15. **Renommer `functionsWest2`** en `functionsAffiliate`

---

*Rapport généré le 2026-02-27 — Audit automatisé sur ~225 appels frontend, ~50 onRequest, 5 instances Functions*
