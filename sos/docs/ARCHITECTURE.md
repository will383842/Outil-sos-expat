# Architecture Technique - SOS Expat

> Document de reference technique. Derniere mise a jour : 2026-02-19.

---

## Table des matieres

1. [Vue d'ensemble](#1-vue-densemble)
2. [Projets et Sous-projets](#2-projets-et-sous-projets)
3. [Architecture Multi-Region Firebase](#3-architecture-multi-region-firebase)
4. [Stack Technique](#4-stack-technique)
5. [Flux Critiques](#5-flux-critiques)
6. [Modules Backend](#6-modules-backend)
7. [Collections Firestore principales](#7-collections-firestore-principales)
8. [Securite](#8-securite)

---

## 1. Vue d'ensemble

**SOS Expat** est une plateforme d'assistance aux expatries mettant en relation des clients avec des prestataires (avocats, expatries experimentes) via un systeme d'appels telephoniques en temps reel.

Le coeur de la plateforme repose sur :
- Un systeme d'appels Twilio avec IVR (serveur vocal interactif), DTMF, et conference
- Un moteur de paiement multi-passerelle (Stripe, PayPal, Wise, Flutterwave)
- Un programme d'affiliation a 4 niveaux (Chatter, Influencer, Blogger, GroupAdmin)
- Une comptabilite automatisee (journal entries, TVA OSS depuis l'Estonie)
- Un frontend multilingue en 9 langues

**Entite juridique** : SOS-Expat OU (Estonie, EE) - Enregistree OSS pour la TVA.

**Projet Firebase** : `sos-urgently-ac307`

---

## 2. Projets et Sous-projets

### 2.1 `sos/` -- Application principale

Le monorepo principal contenant le frontend et le backend.

```
sos/
  firebase/
    functions/        # Firebase Functions (backend TypeScript)
      src/            # Code source (~300+ fichiers)
      package.json    # Node 22, firebase-functions v7
  src/                # Frontend React (Vite)
    pages/            # ~50+ pages (admin, affiliate, dashboard, etc.)
    locales/          # 9 langues (fr-fr, en, es-es, de-de, pt-pt, ru-ru, zh-cn, ar-sa, hi-in)
    components/       # Composants reutilisables
    hooks/            # Custom React hooks
    services/         # Services Firebase (auth, firestore, storage)
  firestore.rules     # 2920 lignes de regles de securite
  storage.rules       # Regles Firebase Storage
  firebase.json       # Configuration multi-codebase, emulateurs
```

### 2.2 `Outil-sos-expat/` -- Outil IA prestataire

Projet Firebase separe fournissant un assistant IA aux prestataires pour gerer leurs reservations et dossiers clients. L'application SOS synchronise les sessions d'appel vers Outil via une API REST apres validation du paiement (`syncCallSessionToOutil`).

### 2.3 `Dashboard-multiprestataire/` -- Dashboard multi-prestataire (PWA)

Application PWA independante pour les gestionnaires d'agences (`agency_manager`).

- **Stack** : React 18 + TypeScript + Vite + Tailwind + VitePWA
- **Auth** : Firebase Auth (meme projet `sos-urgently-ac307`)
- **Donnees** : TanStack Query v5, Recharts, react-hot-toast, date-fns
- **Temps reel** : `onSnapshot` dans `useAgencyProviders` pour les statuts prestataires
- **Export** : CSV avec BOM (`\uFEFF`) pour compatibilite Excel UTF-8

### 2.4 `backlink-engine/` -- Moteur de backlinks interne

Outil interne de prospection SEO pour l'acquisition de backlinks.

- **Stack** : TypeScript + Fastify + Prisma + PostgreSQL + Redis + BullMQ
- **Deploiement** : Docker Compose sur Hetzner VPS (`89.167.26.169`)
- **URL** : `https://backlinks.life-expat.com`
- **Runtime** : `tsx` (execution TypeScript directe, non compile)
- **Fonctionnalites** : Scraping emails, detection formulaires contact, templates messages multilingues (FR/EN), enrichissement asynchrone via BullMQ

---

## 3. Architecture Multi-Region Firebase

L'architecture Firebase utilise 3 regions distinctes pour l'isolation des charges et la protection des fonctions critiques.

### 3.1 Vue schematique

```
+---------------------------+    +---------------------------+    +---------------------------+
|   europe-west1 (BE)       |    |   europe-west2 (UK)       |    |   europe-west3 (DE)       |
|   Core Business & Admin   |    |   Affiliate / Marketing   |    |   Payments + Twilio       |
+---------------------------+    +---------------------------+    +---------------------------+
|                           |    |                           |    |                           |
| - createAndScheduleCall   |    | - registerChatter         |    | - stripeWebhook           |
| - 200+ admin callables    |    | - registerInfluencer      |    | - paypalWebhook           |
| - KYC (Stripe Express)    |    | - registerBlogger         |    | - twilioCallWebhook       |
| - Backups & DR            |    | - registerGroupAdmin      |    | - twilioConferenceWebhook |
| - Subscriptions           |    | - Dashboards affiliate    |    | - executeCallTask         |
| - Contact, Feedback       |    | - Leaderboards            |    | - createPaymentIntent     |
| - Monitoring & Alerts     |    | - Withdrawals affiliate   |    | - Triggers Firestore      |
| - Security alerts         |    | - Training modules        |    | - Scheduled functions     |
| - Tax & Accounting        |    | - Resources & Guides      |    | - Payment callables       |
| - Email marketing         |    | - ~143 fonctions total    |    | - Cloud Tasks endpoints   |
| - Templates admin         |    |                           |    |                           |
+---------------------------+    +---------------------------+    +---------------------------+
```

### 3.2 europe-west1 (Belgique) -- Core Business & APIs publiques

**Region par defaut** (`setGlobalOptions({ region: "europe-west1" })`).

**Raison** : Isole les APIs publiques du frontend pour proteger la region west3 (paiements/appels) de la saturation. Heberge le gros du code metier et les fonctions admin.

**Fonctions cles** :
- `createAndScheduleCall` (callable, appele par le frontend clients)
- 200+ fonctions admin (templates, profils, users, KYC, disputes)
- Sauvegardes (multi-frequence, cross-region DR, restore tests)
- Monitoring (cout, alertes budget, Stripe/Twilio balances)
- Securite (threat scoring, detectors, escalation)
- Comptabilite (journal entries, declarations TVA OSS)
- Fiscalite (calcul TVA, validation VIES/HMRC)

### 3.3 europe-west2 (Londres) -- Affiliate & Marketing

**Raison** : Le programme d'affiliation genere un trafic important et potentiellement impredictible (landings virales, campagnes marketing). Isoler ces fonctions empeche une saturation d'affecter le core business ou les appels temps reel.

**Modules** :
- **Chatter** (~40 fonctions) : inscription, quiz, dashboard, leaderboard, commissions, formations, posts, groupes, Telegram onboarding
- **Influencer** (~30 fonctions) : inscription, dashboard, ressources, formations, commissions
- **Blogger** (~30 fonctions) : inscription, dashboard, articles, guide integration, ressources, recrutement
- **GroupAdmin** (~30 fonctions) : inscription, dashboard, posts, ressources, recrutement prestataires & admins
- **Commun** : withdrawals, badges, monthly rankings, notifications, fraud alerts

**Frontend** : Les fichiers `.env` et `firebase.ts` utilisent `functionsWest2` pour tous les hooks/pages affiliate.

### 3.4 europe-west3 (Francfort) -- Payments + Twilio (PROTEGEE)

**Raison** : Protection maximale. Les webhooks Twilio et Stripe sont temps-reel et critiques. Un appel telephonique en cours ne doit JAMAIS etre perturbe par un pic de charge ailleurs. Les URLs des webhooks Twilio et la queue Cloud Tasks (`call-scheduler-queue`) sont configurees sur cette region.

**Fonctions cles** :
- **Stripe** : `stripeWebhook` (signature verification, idempotency, dual secret Connect)
- **PayPal** : `paypalWebhook`, `createPayPalOrderHttp`, `authorizePayPalOrderHttp`, `capturePayPalOrderHttp`
- **Twilio** : `twilioCallWebhook`, `twilioConferenceWebhook`, `twilioAmdTwiml`, `twilioGatherResponse`, `providerNoAnswerTwiML`
- **Cloud Tasks** : `executeCallTask`, `setProviderAvailableTask`, `busySafetyTimeoutTask`, `forceEndCallTask`
- **Payment callables** : `createPaymentIntent`, `requestWithdrawal`, `getPaymentMethods`, `savePaymentMethod`, etc.
- **Triggers Firestore** : `onPaymentCompleted`, `onRefundCreated`, `onInvoiceRecordCreated`, etc.
- **Scheduled** : `stuckPaymentsRecovery`, `paymentDataCleanup`, `escrowMonitoringDaily`, `pendingTransfersMonitor`

**Configuration** (depuis `configs/callRegion.ts`) :
```typescript
export const CALL_FUNCTIONS_REGION = "europe-west3" as const;
export const PAYMENT_FUNCTIONS_REGION = "europe-west3" as const;
export const DEFAULT_REGION = "europe-west1" as const;
```

---

## 4. Stack Technique

### 4.1 Backend

| Composant | Technologie | Version |
|-----------|------------|---------|
| Runtime | Node.js | 22 |
| Framework | Firebase Functions v2 | `firebase-functions` v7.0.5 |
| Langage | TypeScript | 5.9.3 |
| Base de donnees | Cloud Firestore | - |
| Stockage | Firebase Storage / GCS | - |
| Admin SDK | `firebase-admin` | 12.7.0 |
| Paiements Stripe | `stripe` | 14.25.0 |
| Telephonie | `twilio` | 4.23.0 |
| Validation | `zod` | 4.2.1 |
| Email | `nodemailer` | 6.9.8 |
| Cloud Tasks | `@google-cloud/tasks` | 6.2.0 |
| PDF Generation | `puppeteer-core` + `@sparticuz/chromium` | 23.6.0 / 131.0.1 |
| Monitoring | `@sentry/node` | 10.32.1 |
| API Google | `googleapis` | 144.0.0 |
| HTTP | `axios` | 1.6.0 |

### 4.2 Frontend

| Composant | Technologie | Version |
|-----------|------------|---------|
| Framework | React | 18.3.1 |
| Langage | TypeScript | 5.9.2 |
| Bundler | Vite | 5.4.2 |
| CSS | Tailwind CSS | 3.4.1 |
| UI Components | MUI Material, Headless UI, Radix | 7.2.0 / 2.2.7 / 1.2.3 |
| State | TanStack Query | 5.60.0 |
| Routing | React Router DOM | 6.30.1 |
| Formulaires | React Hook Form | 7.62.0 |
| i18n | react-intl | 7.1.11 (9 langues) |
| Animations | Framer Motion | 11.12.0 |
| Graphiques | Recharts | 3.1.2 |
| Firebase SDK | firebase | 12.3.0 |
| Stripe Elements | @stripe/react-stripe-js | 3.10.0 |
| PayPal | @paypal/react-paypal-js | 8.9.2 |
| Cartes | Leaflet + react-leaflet-cluster | - |
| PDF | jsPDF + jspdf-autotable | 3.0.1 / 5.0.2 |
| Tests | Vitest + Testing Library | 4.0.17 |

### 4.3 Langues supportees (i18n)

| Code | Langue | Drapeau |
|------|--------|---------|
| `fr-fr` | Francais | FR |
| `en` (en-us) | Anglais | US |
| `es-es` | Espagnol | ES |
| `de-de` | Allemand | DE |
| `pt-pt` | Portugais | PT |
| `ru-ru` | Russe | RU |
| `zh-cn` | Chinois simplifie | CN |
| `ar-sa` | Arabe | SA |
| `hi-in` | Hindi | IN |

### 4.4 Passerelles de paiement

| Passerelle | Usage | Region |
|-----------|-------|--------|
| **Stripe** | Paiement principal (44 pays Stripe) - Express accounts pour prestataires | europe-west3 |
| **PayPal** | Paiement alternatif (150+ pays) - Email verification, Payouts API | europe-west3 |
| **Wise** | Virements internationaux (pays non couverts par Stripe/PayPal) | europe-west3 |
| **Flutterwave** | Paiements Afrique (Nigeria, Ghana, Kenya, etc.) | europe-west3 |

Selection automatique via `getRecommendedPaymentGateway` basee sur le pays du client (`lib/paymentCountries.ts`).

### 4.5 Deploiement

| Composant | Plateforme | Methode |
|-----------|-----------|---------|
| **Frontend** | Cloudflare Pages | Auto-deploy via GitHub push sur `main` |
| **Backend (Functions)** | Firebase / Cloud Run | Deploy manuel : `rm -rf lib && npm run build && firebase deploy --only functions` |
| **Backend (batch)** | Firebase | Script `deploy-by-batch.js` ou `deploy-batched.ps1` pour deploiements par lots |
| **Firestore Rules** | Firebase | `firebase deploy --only firestore:rules` |
| **Storage Rules** | Firebase | `firebase deploy --only storage` |

> **IMPORTANT** : Le frontend n'est PAS sur Firebase Hosting. C'est Cloudflare Pages exclusivement.

---

## 5. Flux Critiques

### 5.1 Flux d'appel (Call Flow)

```
Client (Frontend)
  |
  v
createAndScheduleCall (europe-west1, callable)
  |-- Valide les donnees client
  |-- Cree un document call_sessions/{id}
  |-- Cree un PaymentIntent Stripe (capture_method: 'manual')
  |-- Retourne clientSecret au frontend
  |
  v
Frontend: Stripe Elements confirme le paiement
  |
  v
stripeWebhook (europe-west3, onRequest)
  |-- Verifie la signature Stripe (dual secret: regular + Connect)
  |-- Idempotency check via processed_webhook_events/{eventId}
  |-- payment_intent.amount_capturable_updated:
  |     |-- Met a jour call_sessions: status='scheduled'
  |     |-- Planifie Cloud Task: executeCallTask (+delaySeconds)
  |     |-- Envoie notifications (message_events)
  |     |-- Sync vers Outil-sos-expat (syncCallSessionToOutil)
  |
  v
executeCallTask (europe-west3, Cloud Task endpoint)
  |-- Authentifie via TASKS_AUTH_SECRET
  |-- Importe TwilioCallManager dynamiquement (lazy loading)
  |-- Boucle de retry sur les prestataires disponibles
  |-- Pour chaque prestataire:
  |     |-- Twilio: initiate call vers le prestataire
  |     |-- twilioCallWebhook recoit les evenements d'appel
  |     |-- Gather DTMF (prestataire accepte/refuse via clavier)
  |     |-- Si accepte: twilioConferenceWebhook cree la conference
  |     |-- Si refuse/timeout: providerNoAnswerTwiML, retry suivant
  |
  v
twilioConferenceWebhook (europe-west3)
  |-- Gere les evenements de conference (participant-join, participant-leave, end)
  |-- Calcule la duree de l'appel
  |-- Declenche la facturation (capture du PaymentIntent)
  |-- Transfert vers le prestataire (Stripe Connect)
  |
  v
Post-appel:
  |-- onCallCompleted trigger: commissions affilies
  |-- setProviderAvailableTask: remet le prestataire disponible apres cooldown
  |-- busySafetyTimeoutTask: securite si prestataire reste bloque en "busy"
```

### 5.2 Flux de paiement (Payment Flow)

```
createPaymentIntent (europe-west3)
  |-- Determine la passerelle recommandee (Stripe/PayPal/Wise/Flutterwave)
  |-- Calcule la TVA via calculateTax (OSS Estonie)
  |-- Cree le PaymentIntent en capture_method: 'manual'
  |
  v
Stripe: payment_intent.amount_capturable_updated
  |-- Fonds autorises mais non captures
  |-- Status call_session = 'scheduled'
  |
  v
Apres appel reussi:
  |-- Capture du PaymentIntent (montant au prorata de la duree)
  |-- Stripe Connect: transfert automatique vers le prestataire
  |-- Journal entry comptable automatique (accounting engine)
  |-- Distribution commissions affilies (si applicable)
  |
  v
En cas d'echec/annulation:
  |-- RefundManager: remboursement automatique
  |-- stuckPaymentsRecovery (cron): recupere les paiements bloques > 10min
  |-- paymentDataCleanup (cron): nettoie locks expires, ordres abandonnes
```

### 5.3 Flux d'inscription

#### Client
```
RegisterClient.tsx --> Firebase Auth (email/password) --> Trigger onUserCreated
  |-- Cree le document users/{uid} avec role='client'
  |-- Sync custom claims (role)
```

#### Prestataire (avocat/expatrie)
```
RegisterLawyer.tsx / RegisterExpat.tsx --> Firebase Auth --> Trigger onUserCreated
  |-- Cree users/{uid} avec role='lawyer'|'expat'
  |-- Trigger onProviderCreated:
  |     |-- Cree un Stripe Express Account (pre-rempli avec les donnees d'inscription)
  |     |-- Cree le document sos_profiles/{uid}
  |     |-- isVisible: false (mise a true par admin via approveProfile)
  |-- Sync custom claims
```

#### Affiliate (Chatter/Influencer/Blogger/GroupAdmin)
```
Landing page --> Inscription (europe-west2)
  |-- registerChatter / registerInfluencer / registerBlogger / registerGroupAdmin
  |-- Genere les codes affiliate (affiliateCodeClient + affiliateCodeRecruitment)
  |-- Activation immediate (status='active')
  |-- Redirection vers Telegram Onboarding (optionnel):
  |     |-- generateTelegramLink: deep link + collection telegram_onboarding_links/{code}
  |     |-- telegramChatterBotWebhook: capture le telegram_id reel
  |     |-- Bonus $50 credite a la tirelire (verrouille jusqu'a $150 de commissions)
  |-- Redirection vers le Dashboard affiliate
```

---

## 6. Modules Backend

Tous les chemins sont relatifs a `sos/firebase/functions/src/`.

### 6.1 Core -- Appels & Telephonie

| Fichier | Description |
|---------|-------------|
| `createAndScheduleCallFunction.ts` | Callable principal : validation, creation session, PaymentIntent |
| `TwilioCallManager.ts` | Orchestration des appels : retry prestataires, gestion conference |
| `Webhooks/twilioWebhooks.ts` | Webhooks Twilio : `twilioCallWebhook`, `twilioAmdTwiml`, `twilioGatherResponse` |
| `Webhooks/TwilioConferenceWebhook.ts` | Evenements conference : join, leave, end, facturation |
| `Webhooks/providerNoAnswerTwiML.ts` | TwiML de reponse quand le prestataire ne repond pas |
| `callScheduler.ts` | Planification des appels via Cloud Tasks |
| `runtime/executeCallTask.ts` | Endpoint Cloud Task : execute l'appel |
| `runtime/setProviderAvailableTask.ts` | Endpoint Cloud Task : remet le prestataire disponible |
| `runtime/busySafetyTimeoutTask.ts` | Endpoint Cloud Task : timeout securite prestataire bloque |
| `runtime/forceEndCallTask.ts` | Endpoint Cloud Task : termine un appel de force |
| `callables/providerStatusManager.ts` | Gestion statuts busy/available, propagation multi-prestataire |
| `lib/twilio.ts` | Configuration et helpers Twilio |
| `lib/tasks.ts` | Helpers Cloud Tasks (scheduleCallTask, etc.) |
| `configs/callRegion.ts` | Constantes de regions (CALL_FUNCTIONS_REGION, etc.) |

### 6.2 Core -- Paiements

| Fichier / Dossier | Description |
|--------------------|-------------|
| `createPaymentIntent.ts` | Creation du PaymentIntent Stripe |
| `StripeManager.ts` | Helpers Stripe (transferts, captures, remboursements) |
| `PayPalManager.ts` | Commerce Platform : onboarding, orders, webhooks, payouts |
| `paypal/emailVerification.ts` | Verification email PayPal par code |
| `payment/` | Module paiement unifie |
| `payment/services/paymentRouter.ts` | Routeur multi-passerelle |
| `payment/services/paymentService.ts` | Service de paiement abstrait |
| `payment/providers/wiseProvider.ts` | Integration Wise (virements internationaux) |
| `payment/providers/flutterwaveProvider.ts` | Integration Flutterwave (Afrique) |
| `payment/callables/` | Callables : withdrawal, payment methods, history |
| `PendingTransferProcessor.ts` | Traitement des transferts differes (post-KYC) |
| `UnclaimedFundsManager.ts` | Gestion fonds non reclames (180j, CGV Art. 8.6-8.9) |
| `ProviderEarningsService.ts` | Dashboard gains prestataire |
| `DisputeManager.ts` | Gestion des litiges Stripe |
| `lib/paymentCountries.ts` | Selection pays : 44 Stripe, 150+ PayPal |
| `lib/stripe.ts` | Configuration Stripe |
| `lib/payoutRetryTasks.ts` | Retry automatique payouts echoues |
| `lib/stripeTransferRetryTasks.ts` | Retry automatique transferts Stripe |
| `lib/circuitBreaker.ts` | Circuit breaker pour appels externes |

### 6.3 Core -- KYC & Onboarding

| Fichier | Description |
|---------|-------------|
| `stripeAutomaticKyc.ts` | `createExpressAccount`, `getOnboardingLink`, `checkKycStatus` |
| `createStripeAccount.ts` | Creation compte Stripe (legacy) |
| `createLawyerAccount.ts` | Creation compte avocat |
| `KYCReminderManager.ts` | Rappels KYC planifies (D+1, D+7, D+30, D+90) |
| `PayPalReminderManager.ts` | Rappels onboarding PayPal |
| `lawyerOnboarding.ts` | Finalisation onboarding avocat |

### 6.4 Admin -- Fonctions administrateur (200+)

| Fichier / Dossier | Description |
|--------------------|-------------|
| `adminApi.ts` | API admin REST (Express router) |
| `admin/callables.ts` | Templates, routage, tests envoi, unclaimed funds, refunds (~15 fonctions) |
| `admin/providerActions.ts` | hide/unhide, block/unblock, suspend/unsuspend, soft/hard delete, bulk ops (~17 fonctions) |
| `admin/backupRestoreAdmin.ts` | Liste, preview, restore Firestore/Auth, manual backup (~8 fonctions) |
| `admin/localBackupRegistry.ts` | Registre backups locaux PC |
| `admin/profileValidation.ts` | Validation profils prestataires |
| `admin/restoreConfirmationCode.ts` | Code de confirmation restauration |
| `auth/setAdminClaims.ts` | Gestion custom claims admin |

### 6.5 Affiliate -- Chatter

| Dossier | Description |
|---------|-------------|
| `chatter/callables/registerChatter.ts` | Inscription, generation codes, activation immediate |
| `chatter/callables/getChatterDashboard.ts` | Dashboard (stats, commissions, classement) |
| `chatter/callables/getChatterLeaderboard.ts` | Classement top chatters |
| `chatter/callables/requestWithdrawal.ts` | Demande de retrait |
| `chatter/callables/telegramOnboarding.ts` | Deep link Telegram, webhook bot, bonus $50 |
| `chatter/callables/training.ts` | Modules de formation |
| `chatter/callables/posts.ts` | Gestion des posts |
| `chatter/callables/groups.ts` | Gestion des groupes |
| `chatter/callables/zoom.ts` | Reunions Zoom |
| `chatter/triggers/` | onChatterCreated, onCallCompleted, onProviderRegistered, etc. |
| `chatter/scheduled/` | Commissions consolidees, classements mensuels |
| `chatter/services/` | Service commissions, anti-fraude |
| `chatter/antiFraud.ts` | Detection fraude referrals |
| `chatter/types.ts` | Types et constantes (UNLOCK_THRESHOLD: 15000 = $150) |

### 6.6 Affiliate -- Influencer

| Dossier | Description |
|---------|-------------|
| `influencer/callables/registerInfluencer.ts` | Inscription influenceur |
| `influencer/callables/getInfluencerDashboard.ts` | Dashboard |
| `influencer/callables/training.ts` | Modules formation |
| `influencer/callables/resources.ts` | Widget, banniere, textes prets |
| `influencer/triggers/` | onInfluencerCreated, onCallCompleted, onProviderRegistered |
| `influencer/scheduled/` | Classements mensuels |
| `influencer/services/` | Service commissions |
| `influencer/types.ts` | Types et constantes |

### 6.7 Affiliate -- Blogger

| Dossier | Description |
|---------|-------------|
| `blogger/callables/registerBlogger.ts` | Inscription blogueur |
| `blogger/callables/getBloggerDashboard.ts` | Dashboard |
| `blogger/callables/articles.ts` | Gestion articles |
| `blogger/callables/guide.ts` | Guide integration (templates, textes, bonnes pratiques) |
| `blogger/callables/resources.ts` | Ressources (widget, logos, bannieres) |
| `blogger/triggers/` | onBloggerCreated, onCallCompleted |
| `blogger/services/` | Service commissions ($10 client, $5 recrutement) |
| `blogger/types.ts` | Types et constantes |

### 6.8 Affiliate -- GroupAdmin

| Dossier | Description |
|---------|-------------|
| `groupAdmin/callables/registerGroupAdmin.ts` | Inscription admin de groupe |
| `groupAdmin/callables/getGroupAdminDashboard.ts` | Dashboard |
| `groupAdmin/callables/posts.ts` | Gestion posts (textes prets a poster) |
| `groupAdmin/callables/resources.ts` | Ressources |
| `groupAdmin/triggers/` | onGroupAdminCreated, onCallCompleted, onProviderRegistered |
| `groupAdmin/scheduled/` | Classements mensuels |
| `groupAdmin/services/` | Service commissions |
| `groupAdmin/groupAdminConfig.ts` | Configuration module |
| `groupAdmin/types.ts` | Types et constantes |

### 6.9 Monitoring & Alertes

| Fichier | Description |
|---------|-------------|
| `monitoring/criticalAlerts.ts` | Alertes critiques systeme |
| `monitoring/functionalMonitoring.ts` | Monitoring fonctionnel (sante services) |
| `monitoring/serviceAlerts.ts` | Alertes sur services tiers |
| `monitoring/paymentMonitoring.ts` | Monitoring des paiements |
| `monitoring/connectionLogs.ts` | Logs de connexion |
| `monitoring/getCostMetrics.ts` | Metriques de cout |
| `monitoring/getFirebaseUsage.ts` | Usage Firebase |
| `monitoring/getStripeBalance.ts` | Solde Stripe |
| `monitoring/getTwilioBalance.ts` | Solde Twilio |
| `monitoring/getOpenAIUsage.ts` | Usage OpenAI |
| `monitoring/getAnthropicUsage.ts` | Usage Anthropic |
| `monitoring/getPerplexityUsage.ts` | Usage Perplexity |
| `monitoring/getGcpBillingCosts.ts` | Couts GCP |
| `monitoring/getAgentMetrics.ts` | Metriques agents IA |

### 6.10 Securite

| Fichier | Description |
|---------|-------------|
| `securityAlerts/index.ts` | Module principal securite |
| `securityAlerts/detectors.ts` | 8 detecteurs : brute force, localisation, fraude paiement, card testing, creation massive, abus API, injection, sessions multiples |
| `securityAlerts/ThreatScoreService.ts` | Service de scoring de menace |
| `securityAlerts/triggers.ts` | Triggers et scheduled functions securite |
| `securityAlerts/notifier.ts` | Notifications multilingues |
| `securityAlerts/escalation.ts` | Escalade automatique |
| `securityAlerts/rateLimiter.ts` | Rate limiting |
| `securityAlerts/aggregator.ts` | Agregation d'evenements |
| `securityAlerts/types.ts` | Types securite |

### 6.11 Fiscalite & Comptabilite

| Fichier / Dossier | Description |
|--------------------|-------------|
| `tax/calculateTax.ts` | Moteur TVA/GST : OSS Estonie, taux EU, seuils par pays |
| `tax/vatValidation.ts` | Validation TVA : VIES (EU) + HMRC (UK), cache Firestore |
| `tax/vatCallables.ts` | Callables : validateVat, checkReverseCharge, cleanupVatCache |
| `tax/viesService.ts` | Service VIES (validation TVA intracommunautaire) |
| `tax/hmrcService.ts` | Service HMRC (validation TVA UK) |
| `taxFilings/` | Declarations fiscales automatiques |
| `taxFilings/generateTaxFiling.ts` | Generation declarations |
| `taxFilings/exportFilingToFormat.ts` | Export multi-format |
| `taxFilings/filingReminders.ts` | Rappels echeances |
| `taxFilings/adminCallables.ts` | Fonctions admin fiscalite |
| `accounting/` | Moteur comptable |
| `accounting/triggers.ts` | Triggers : onPaymentCompleted, onRefundCreated, onPayoutCompleted |
| `accounting/generateJournalEntry.ts` | Generation ecritures comptables |
| `accounting/accountingService.ts` | Service comptable (OSS VAT, balances) |
| `accounting/types.ts` | Plan comptable, types |

### 6.12 Notifications & Messaging

| Fichier / Dossier | Description |
|--------------------|-------------|
| `notificationPipeline/worker.ts` | Worker de traitement des message_events |
| `notificationPipeline/templates.ts` | Gestion templates (email, SMS, push) |
| `notificationPipeline/routing.ts` | Routage multi-canal |
| `notificationPipeline/i18n.ts` | Internationalisation notifications |
| `notificationPipeline/providers/` | Fournisseurs (email, SMS, push) |
| `messaging/enqueueMessageEvent.ts` | Ajout evenement dans la file |
| `notifications/notifyAfterPayment.ts` | Notification post-paiement |
| `telegram/` | Module Telegram complet |
| `telegram/TelegramNotificationService.ts` | Service notifications Telegram |
| `telegram/callables/` | Callables Telegram |
| `telegram/providers/` | Fournisseurs Telegram |
| `telegram/queue/` | File d'attente messages |
| `emailMarketing/` | Email marketing (autoresponders, campagnes) |

### 6.13 Sauvegardes & DR

| Fichier | Description |
|---------|-------------|
| `scheduled/multiFrequencyBackup.ts` | Backup quotidien (morningBackup, cleanupOldBackups) |
| `scheduled/crossRegionBackup.ts` | Backup cross-region DR |
| `scheduled/quarterlyRestoreTest.ts` | Test restauration trimestriel |
| `scheduled/backupStorageToDR.ts` | Backup Storage (photos, documents, factures) |
| `scheduled/backupAuth.ts` | Backup Firebase Auth |
| `scheduled/backupSecretsAndConfig.ts` | Backup secrets et config |

### 6.14 Scheduled (Crons)

| Fichier | Description |
|---------|-------------|
| `scheduled/checkProviderInactivity.ts` | Cron 15min : verifie inactivite prestataires (AAA exempt) |
| `scheduled/stuckPaymentsRecovery.ts` | Recuperation paiements bloques (requires_capture > 10min) |
| `scheduled/paymentDataCleanup.ts` | Nettoyage locks, ordres expires, archivage |
| `scheduled/escrowMonitoring.ts` | Monitoring escrow quotidien (alertes > 1000EUR, KYC reminders) |
| `scheduled/pendingTransfersMonitor.ts` | Monitoring transferts en attente (toutes les 6h) |
| `scheduled/adminAlertsDigest.ts` | Digest quotidien alertes admin (9h Paris) |
| `scheduled/budgetAlertNotifications.ts` | Alertes budget (80%, 100%) |
| `scheduled/processUnclaimedFunds.ts` | Forfait fonds non reclames (180j) |
| `scheduled/notificationRetry.ts` | Retry notifications echouees |
| `scheduled/consolidatedCommissions.ts` | Consolidation commissions affilies |
| `scheduled/aggregateCostMetrics.ts` | Agregation metriques cout |
| `scheduled/aggregateProviderStats.ts` | Agregation stats prestataires |
| `scheduled/cleanupOrphanedSessions.ts` | Nettoyage sessions orphelines |
| `scheduled/cleanupOrphanedAgentTasks.ts` | Nettoyage taches agents orphelines |
| `scheduled/cleanupTempStorageFiles.ts` | Nettoyage fichiers temporaires Storage |
| `scheduled/checkLowProviderAvailability.ts` | Alerte faible disponibilite prestataires |

### 6.15 Triggers Firestore

| Fichier | Description |
|---------|-------------|
| `triggers/consolidatedOnUserCreated.ts` | onCreate users : claims sync, profil, Stripe account |
| `triggers/consolidatedOnUserUpdated.ts` | onUpdate users : sync profils, claims |
| `triggers/consolidatedOnCallCompleted.ts` | onUpdate call_sessions (status=completed) : commissions, stats |
| `triggers/onProviderCreated.ts` | onCreate sos_profiles : Stripe Express, init prestataire |
| `triggers/onInvoiceCreated.ts` | onCreate invoice_records : generation facture |
| `triggers/onInvoiceCreatedSendEmail.ts` | onCreate invoice_records : envoi email facture |
| `triggers/onPaymentError.ts` | onCreate/onUpdate payments : alertes erreurs |
| `triggers/syncRoleClaims.ts` | Sync claims role vers Firebase Auth |
| `triggers/syncAccessToOutil.ts` | Sync acces IA vers Outil |
| `triggers/syncSosProfilesToOutil.ts` | Sync profils SOS vers Outil |
| `triggers/syncBookingsToOutil.ts` | Sync reservations vers Outil |
| `triggers/syncUserEmailToSosProfiles.ts` | Sync email vers sos_profiles |
| `triggers/userCleanupTrigger.ts` | Cascade suppression users -> sos_profiles |
| `triggers/capiTracking.ts` | Meta Conversions API tracking |
| `triggers/googleAdsTracking.ts` | Google Ads conversion tracking |

### 6.16 Autres Modules

| Fichier / Dossier | Description |
|--------------------|-------------|
| `subscription/` | Abonnements Stripe (checkout, webhooks, billing portal, cancel, DLQ) |
| `contact/createContactMessage.ts` | Formulaire contact avec rate limiting |
| `feedback/` | Collecte retours utilisateurs |
| `gdpr/auditTrail.ts` | Trail audit RGPD |
| `seo/domainAuthority.ts` | SEO Domain Authority (API Review Tools) |
| `sitemap/` | Generation sitemap |
| `content/` | Gestion contenu |
| `helpCenter/` | Centre d'aide |
| `services/pricingService.ts` | Service tarification |
| `services/couponService.ts` | Service coupons |
| `services/helpArticles/` | Articles d'aide |
| `analytics/` | Analytics unifie |
| `tracking/` | Meta CAPI, Google Ads tracking |
| `metaConversionsApi.ts` | Facebook Conversions API (server-side tracking) |
| `googleAdsConversionsApi.ts` | Google Ads conversions server-side |
| `multiDashboard/` | Dashboard multi-prestataire (auth, AI generation) |
| `config/sentry.ts` | Configuration Sentry |
| `lib/secrets.ts` | Gestion centralisee des secrets Firebase |
| `lib/requestTracing.ts` | Tracing des requetes |

---

## 7. Collections Firestore principales

Le projet compte plus de 150 collections. Voici les 30 plus importantes :

### 7.1 Core Business

| Collection | Description |
|-----------|-------------|
| `users` | Comptes utilisateurs (clients, prestataires, admins, agency_managers) |
| `sos_profiles` | Profils prestataires publics (bio, specialites, tarifs, visibilite) |
| `call_sessions` | Sessions d'appel (de la creation au paiement final) |
| `payments` | Historique des paiements (Stripe, PayPal) |
| `orders` | Commandes liees aux sessions d'appel |
| `refunds` | Remboursements |
| `transfers` | Transferts Stripe Connect vers prestataires |
| `pending_transfers` | Transferts en attente de KYC |
| `invoice_records` | Factures generees |
| `disputes` | Litiges Stripe |

### 7.2 Notifications & Messaging

| Collection | Description |
|-----------|-------------|
| `message_events` | File d'evenements de notification (pipeline multicanal) |
| `message_deliveries` | Delivrances de messages (statut, retry) |
| `message_templates/{locale}/items` | Templates de messages par langue |
| `inapp_notifications` | Notifications in-app |
| `notifications` | Notifications push |
| `fcm_tokens` | Tokens Firebase Cloud Messaging |
| `notification_dlq` | Dead letter queue notifications |

### 7.3 Affiliate

| Collection | Description |
|-----------|-------------|
| `chatters` | Profils chatters |
| `chatter_commissions` | Commissions chatters |
| `chatter_withdrawals` | Retraits chatters |
| `influencers` | Profils influenceurs |
| `influencer_commissions` | Commissions influenceurs |
| `bloggers` | Profils blogueurs |
| `blogger_commissions` | Commissions blogueurs |
| `group_admins` | Profils admins de groupe |
| `group_admin_commissions` | Commissions admins de groupe |
| `affiliate_config` | Configuration globale affilies |
| `telegram_onboarding_links` | Liens Telegram deep-link pour onboarding |

### 7.4 Securite & Audit

| Collection | Description |
|-----------|-------------|
| `security_alerts` | Alertes de securite (detections automatiques) |
| `threat_scores` | Scores de menace par entite |
| `blocked_entities` | Entites bloquees |
| `admin_alerts` | Alertes admin (paiements, KYC, systeme) |
| `processed_webhook_events` | Idempotency webhooks Stripe (30j TTL) |
| `adminLogs` | Logs actions admin |
| `provider_action_logs` | Logs actions sur prestataires |

### 7.5 Comptabilite & Fiscalite

| Collection | Description |
|-----------|-------------|
| `journal_entries` | Ecritures comptables automatiques |
| `chart_of_accounts` | Plan comptable |
| `tax_filings` | Declarations fiscales |
| `country_tax_configs` | Configuration fiscale par pays |
| `vat_validations` | Cache validation TVA (VIES/HMRC) |

---

## 8. Securite

### 8.1 Firestore Rules

Le fichier `firestore.rules` (2920 lignes) definit des regles granulaires pour chaque collection.

**Fonctions helper** :
- `isAuthenticated()` : verifie `request.auth != null`
- `isAdmin()` : custom claims (`request.auth.token.role == 'admin'`) OU document Firestore (`users/{uid}.role == 'admin'`)
- `isOwner(userId)` : `request.auth.uid == userId`
- `isProvider()` : role `lawyer` ou `expat`
- `isClient()` : role `client`
- `isAgencyManager()` : role `agency_manager` dans Firestore
- `hasAgencyAccessToProvider(providerId)` : verifie `linkedProviderIds` du manager
- `isDev()` : **TOUJOURS false en production** (desactive)

**Principes** :
- Lecture publique pour les profils publics (`sos_profiles` avec `isVisible: true`)
- Ecriture restreinte au proprietaire ou admin
- Collections sensibles (payments, transfers, security_alerts) : admin uniquement
- Collections affiliate : lecture par le proprietaire (`chatterId == request.auth.uid`)

### 8.2 Authentification & Claims

| Claim | Role | Description |
|-------|------|-------------|
| `role: 'admin'` | Administrateur | Acces total, custom claims Firebase Auth |
| `role: 'lawyer'` | Avocat | Prestataire juridique |
| `role: 'expat'` | Expatrie | Prestataire d'experience |
| `role: 'client'` | Client | Demandeur d'assistance |
| `role: 'agency_manager'` | Gestionnaire agence | Dashboard multi-prestataire |

**Verification admin backend** (triple fallback dans `checkAdminAccess`) :
1. Custom claims : `request.auth.token.role === 'admin'`
2. Email whitelist : liste codee en dur des emails admin
3. Firestore fallback : `users/{uid}.role === 'admin'`

### 8.3 Rate Limiting

- **Contact form** : `createContactMessage` avec rate limiting integre
- **Firestore Rules** : collection `rate_limits` et `dashboard_rate_limits`
- **Security detectors** : `detectApiAbuse` surveille les taux de requetes anormaux
- **Webhook idempotency** : `processed_webhook_events` empeche le traitement en double

### 8.4 Systeme Anti-Fraude

**8 detecteurs actifs** (`securityAlerts/detectors.ts`) :
1. `detectBruteForce` : tentatives de connexion repetees
2. `detectUnusualLocation` : connexion depuis localisation inhabituelle
3. `detectPaymentFraud` : patterns de paiement suspects
4. `detectCardTesting` : tests de cartes (petits montants multiples)
5. `detectMassAccountCreation` : creation massive de comptes
6. `detectApiAbuse` : abus d'API (taux anormal)
7. `detectInjectionAttempt` : tentatives d'injection (SQL, XSS)
8. `detectMultipleSessions` : sessions multiples simultanees

**Scoring de menace** (`ThreatScoreService.ts`) :
- Score cumule par entite (user, IP, device)
- Escalade automatique selon les seuils
- Blocage automatique au-dela du seuil critique

**Affiliate anti-fraude** (`chatter/antiFraud.ts`) :
- Detection auto-referrals
- Verification IP registry (`chatter_ip_registry`)
- Alertes fraude (`chatter_referral_fraud_alerts`)

### 8.5 Chiffrement

- Numeros de telephone chiffres en base (`enc:` prefix) via `ENCRYPTION_KEY`
- Dechiffrement a la volee dans les webhooks et notifications (`decryptPhoneNumber`)
- Secrets geres via Firebase Secret Manager (defineSecret)

### 8.6 Secrets Management

Tous les secrets sont centralises dans `lib/secrets.ts` et declares via `defineSecret()` :

| Secret | Usage |
|--------|-------|
| `EMAIL_USER` / `EMAIL_PASS` | Envoi emails (nodemailer) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | Telephonie Twilio |
| `STRIPE_SECRET_KEY_TEST` / `STRIPE_SECRET_KEY_LIVE` | API Stripe |
| `STRIPE_WEBHOOK_SECRET_*` | Verification signature webhooks |
| `STRIPE_CONNECT_WEBHOOK_SECRET_*` | Verification signature webhooks Connect |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | API PayPal |
| `ENCRYPTION_KEY` | Chiffrement numeros de telephone |
| `TASKS_AUTH_SECRET` | Authentification Cloud Tasks |
| `OUTIL_API_KEY` / `OUTIL_SYNC_API_KEY` | Communication avec Outil-sos-expat |
| `META_CAPI_TOKEN` | Facebook Conversions API |

---

## Annexes

### A. Profils AAA (Test/Demo)

Les comptes AAA (`uid.startsWith('aaa_')` ou `isAAA: true`) sont des comptes de test/demo.

**Exempts de** : punition offline (`no_answer`), verification inactivite (cron 15min).
**NON exempts de** : propagation statut busy (fonctionne identiquement aux comptes reels).

### B. Multi-Provider (shareBusyStatus)

- Le document `users/{accountOwnerId}` contient `linkedProviderIds` et `shareBusyStatus`
- Quand `shareBusyStatus: true`, le statut busy d'un prestataire se propage aux autres prestataires lies
- Admin UI : `sos/src/pages/admin/ia/IaMultiProvidersTab.tsx`
- Denormalisation : les champs sont ecrits sur chaque document prestataire pour performance

### C. Commandes utiles

```bash
# Build backend
cd sos/firebase/functions && rm -rf lib && npm run build

# Deploy toutes les fonctions
firebase deploy --only functions

# Deploy par batch (evite les timeouts)
npm run deploy:batched

# Deploy rules Firestore
firebase deploy --only firestore:rules

# Lancer le frontend en dev
cd sos && npm run dev

# Lancer les emulateurs complets
cd sos && npm run dev:full

# Typecheck backend
cd sos/firebase/functions && npm run typecheck
```
