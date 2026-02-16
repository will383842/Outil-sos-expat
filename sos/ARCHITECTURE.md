# Architecture SOS Expat - Vue d'Ensemble Système

> Documentation complète de l'architecture technique de la plateforme SOS Expat

**Dernière mise à jour** : 2026-02-16
**Version** : 3.0 (Multi-région)

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#-vue-densemble)
2. [Architecture Multi-Région](#-architecture-multi-région)
3. [Stack Technique](#-stack-technique)
4. [Frontend Architecture](#-frontend-architecture)
5. [Backend Architecture](#-backend-architecture)
6. [Base de Données](#-base-de-données-firestore)
7. [Système d'Appels](#-système-dappels-twilio)
8. [Paiements](#-système-de-paiements)
9. [Affiliate System](#-système-affiliate)
10. [Sécurité](#-sécurité)
11. [Déploiement](#-déploiement)
12. [Monitoring](#-monitoring--observabilité)

---

## 🎯 Vue d'Ensemble

### Diagramme Architectural Global

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React SPA)                         │
│                    Cloudflare Pages + Worker                         │
│                     https://www.sosexpats.com                        │
└────────────┬────────────────────────────────────────────────────────┘
             │
             │ HTTPS/WebSocket
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FIREBASE (Multi-Région)                           │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │  europe-west1  │  │  europe-west2  │  │  europe-west3  │       │
│  │   (Belgique)   │  │   (Londres)    │  │   (Belgique)   │       │
│  │                │  │                │  │                │       │
│  │ Core Business  │  │   Affiliate    │  │   PROTÉGÉE     │       │
│  │ 200+ callables │  │ 143 functions  │  │ Payments       │       │
│  │ Admin          │  │ Chatter        │  │ Twilio         │       │
│  │ KYC            │  │ Influencer     │  │ Cloud Tasks    │       │
│  │ Subscriptions  │  │ Blogger        │  │ Triggers       │       │
│  │                │  │ GroupAdmin     │  │                │       │
│  └────────────────┘  └────────────────┘  └───────┬────────┘       │
│                                                   │                 │
└───────────────────────────────────────────────────┼─────────────────┘
                                                    │
        ┌───────────────────────────────────────────┼─────────────────┐
        │                                           │                 │
        ▼                                           ▼                 ▼
┌───────────────┐                         ┌─────────────────────────────┐
│ STRIPE        │                         │ TWILIO                      │
│ Connect       │                         │ • Programmable Voice        │
│ • Payments    │                         │ • IVR (9 langues)          │
│ • KYC Auto    │                         │ • AMD (répondeur)          │
│ • 44 pays     │                         │ • Conférence               │
└───────────────┘                         │ • Recording                │
                                          └─────────────────────────────┘
┌───────────────┐
│ PAYPAL        │                         ┌─────────────────────────────┐
│ • Email-based │                         │ WISE + FLUTTERWAVE          │
│ • 150+ pays   │                         │ • Withdrawals affiliate     │
└───────────────┘                         │ • International transfers   │
                                          └─────────────────────────────┘
```

### Principes de Design

1. **Isolation Multi-Région** - 3 régions pour load balancing et protection
2. **Serverless First** - Firebase Functions pour scalabilité automatique
3. **Real-time** - Firestore listeners pour UI réactive
4. **Multi-Gateway** - Stripe + PayPal pour couverture globale
5. **Microservices** - 250+ fonctions spécialisées
6. **Multi-Tenancy** - Support agency managers (multi-provider)

---

## 🌍 Architecture Multi-Région

### Répartition des Fonctions par Région

#### 🇧🇪 europe-west1 (Belgique) - Core Business & APIs Publiques

**Rôle** : Isolation des APIs frontend pour protéger west3

**Fonctions déployées** :
- ✅ `createAndScheduleCall` (callable) - Appel initié par client
- ✅ 200+ admin callables (admin UI)
- ✅ KYC functions (Stripe onboarding)
- ✅ Backup & restore
- ✅ Subscription checkout & billing portal

**CPU** : 3-5 vCPU
**Trafic** : Variable (pics lors des inscriptions)

#### 🇬🇧 europe-west2 (Londres) - Affiliate/Marketing

**Rôle** : Load balancing - peut saturer sans affecter core business

**Fonctions déployées** :
- ✅ `registerChatter` - Inscription chatter
- ✅ `registerInfluencer` - Inscription influencer
- ✅ `registerBlogger` - Inscription blogger
- ✅ `registerGroupAdmin` - Inscription group admin
- ✅ 143 fonctions affiliate (dashboard, training, withdrawals, resources)

**CPU** : 2-3 vCPU
**Trafic** : Modéré (croissance exponentielle attendue)

#### 🇧🇪 europe-west3 (Belgique) - **PAYMENTS + TWILIO (PROTÉGÉE)**

**Rôle** : Protection MAX - appels Twilio ne doivent JAMAIS être saturés

**Fonctions déployées** :
- ✅ `stripeWebhook` - Webhooks Stripe (payments, subscriptions)
- ✅ `twilioCallWebhook` - IVR DTMF gather
- ✅ `twilioConferenceWebhook` - Événements conférence
- ✅ `executeCallTask` - Cloud Task exécution appels
- ✅ 15+ triggers Firestore (onCreate, onUpdate)
- ✅ 26 scheduled functions (crons)

**CPU** : 2-4 vCPU
**Trafic** : Temps réel critique (latence < 500ms requise)

### Migration & Rollback

> 📖 Voir [docs/02-ARCHITECTURE/multi-region.md](./docs/02-ARCHITECTURE/multi-region.md) pour le guide de migration complet

**Procédure 4 phases** :
1. Préparation (backup complet)
2. Export Firestore
3. Migration progressive
4. Validation + Nettoyage

**Rollback** : Possible dans les 48h avec backup restore

---

## 🛠️ Stack Technique

### Frontend

| Technologie | Version | Utilisation |
|-------------|---------|-------------|
| **React** | 18.3 | UI framework |
| **TypeScript** | 5.9 | Type safety |
| **Vite** | 5.4 | Build tool |
| **React Router** | 6.30 | Routing (40+ pages) |
| **TanStack Query** | 5.60 | Data fetching & caching |
| **Tailwind CSS** | 3.4 | Styling |
| **Framer Motion** | 11.12 | Animations |
| **React Hook Form** | 7.62 | Forms |
| **Zod** | 3.24 | Validation |
| **React Intl** | 6.9 | i18n (9 langues) |

### Backend

| Technologie | Version | Utilisation |
|-------------|---------|-------------|
| **Node.js** | 22 | Runtime |
| **Firebase Functions** | 7.0 | Serverless backend |
| **Firebase Admin SDK** | 12.7 | Backend operations |
| **TypeScript** | 5.9 | Type safety |

### Base de Données

| Service | Type | Utilisation |
|---------|------|-------------|
| **Firestore** | NoSQL | Base principale (75+ collections) |
| **Firebase Auth** | Auth | Authentification (Email + Google + SMS) |
| **Cloud Storage** | Object | Photos profils, documents |

### Services Externes

| Service | Utilisation |
|---------|-------------|
| **Twilio** | Appels vocaux (IVR + conférence) |
| **Stripe** | Paiements (44 pays) |
| **PayPal** | Paiements alternatif (150+ pays) |
| **Wise** | Withdrawals internationaux |
| **Flutterwave** | Mobile Money Afrique |
| **Google Analytics** | Analytics (GA4) |
| **Meta Pixel** | Facebook tracking |
| **Sentry** | Error monitoring |
| **MailWizz** | Email marketing (99 autoresponders) |

---

## 🎨 Frontend Architecture

### Structure Components (31 Catégories)

```
src/components/
├── admin/              # Admin UI (200+ fonctions)
├── auth/               # Login, Register, ProtectedRoute
├── Blogger/            # Système blogueurs
├── Chatter/            # Système chatters (Telegram)
├── checkout/           # Flux de paiement
├── common/             # LoadingSpinner, ErrorBoundary
├── dashboard/          # Dashboard utilisateurs
├── feedback/           # Système feedback
├── forms/              # Formulaires réutilisables
├── GroupAdmin/         # Admin groupes Facebook
├── home/               # Landing page
├── Influencer/         # Système influenceurs
├── layout/             # Layouts (Header, Footer, Sidebar)
├── payment/            # Stripe + PayPal integration
├── profile/            # Profils utilisateurs
├── provider/           # Fiche provider individuelle
├── providers/          # Listing & recherche providers
├── pwa/                # PWA features (install prompt)
├── registration/       # Flows d'inscription (3 rôles)
├── review/             # Système avis (ratings)
├── seo/                # Meta tags, SEO
├── share/              # Partage social
├── shared/             # Composants partagés
├── sos-call/           # Interface appels SOS
├── subscription/       # Gestion subscriptions
├── Telegram/           # Onboarding Telegram
└── ui/                 # Shadcn UI + custom
```

### Hooks Personnalisés (59 hooks)

**Catégories principales** :
- **Business** : useChatter, useInfluencer, useBlogger, useAffiliate
- **Payment** : usePayment, useSubscription, usePaymentGateway
- **Analytics** : useMetaPixel, useGoogleAds, useUnifiedAnalytics
- **UI/UX** : useDeviceDetection, useLazySection, usePWAInstall
- **Admin** : useProviderActions, useValidationQueue

### Routing (40+ Pages)

**Pages publiques** : Home, Providers, Pricing, FAQ, Login, Register
**Pages services** : SOSCall, ExpatCall, BookingRequest, PaymentSuccess
**Dashboards** : Client, Provider, Chatter, Influencer, Blogger, GroupAdmin
**Admin** : 200+ routes admin
**Multi-Provider** : Dashboard séparé (password-protected)

### State Management

| Type | Solution |
|------|----------|
| **Auth state** | AuthContext (Firebase Auth) |
| **Server state** | TanStack Query (queries + mutations) |
| **URL state** | React Router (params + search) |
| **Local state** | useState + useReducer |
| **Form state** | React Hook Form |

### Build Optimizations

- **Code splitting** : 7 chunks (vendor-react, vendor-firebase, vendor-stripe, etc.)
- **Lazy loading** : Pages + below-fold components
- **Tree shaking** : Vite automatic
- **Minification** : Terser (2 passes)
- **Long polling** : Firestore (évite WebSocket bloqués)
- **Cache** : IndexedDB persistant (50MB)

---

## ⚙️ Backend Architecture

### Firebase Functions (250+ fonctions)

#### Callables (~240 fonctions)

**Frontend → Backend** via `httpsCallable()`

**Catégories** :
- Admin (200+)
- Payment (19)
- Affiliate (6)
- Subscription (3)
- Multi-Dashboard (3)
- Provider status (7)

#### Triggers (16 fonctions)

**Firestore events** (onCreate, onUpdate, onDelete)

- `consolidatedOnUserCreated` - Sync Outil, création profil
- `consolidatedOnUserUpdated` - Sync claims, email
- `onProviderCreated` - Stripe account creation
- `consolidatedOnCallCompleted` - Analytics + commissions
- `onInvoiceCreated` - Distributed lock
- `capiTracking` - Meta CAPI
- `syncRoleClaims` - Custom claims sync

#### Scheduled (26 fonctions)

**Cron jobs** (Cloud Scheduler)

- `morningBackup` - 9h Paris (quotidien)
- `crossRegionBackup` - 14h (quotidien)
- `checkProviderInactivity` - Chaque 15 min
- `adminAlertsDigest` - 9h Paris
- `stuckPaymentsRecovery` - Chaque heure
- `processUnclaimedFunds` - Quotidien (180j rule)

#### Cloud Tasks (4 fonctions)

**Asynchronous execution** (HTTP targets)

- `executeCallTask` - Lance appel Twilio
- `setProviderAvailableTask` - Release provider
- `forceEndCallTask` - Force fin appel
- `busySafetyTimeoutTask` - Timeout safety

#### Webhooks (4 fonctions)

**External services** → Firebase

- `twilioWebhooks` - IVR DTMF gather
- `TwilioConferenceWebhook` - Conférence events
- `stripeWebhook` - Stripe events (payments, subscriptions)
- `notifyBacklinkEngine` - Notification backlink engine

### Modules Principaux

```
firebase/functions/src/
├── admin/              # 200+ admin functions
├── affiliate/          # Marketing (4 systèmes)
├── callables/          # 7 core callables
├── chatter/            # Système chatter complet
├── influencer/         # Système influencer
├── blogger/            # Système blogger
├── groupAdmin/         # Système group admin
├── payment/            # Paiements centralisés (Wise + Flutterwave)
├── subscription/       # Stripe subscriptions
├── Webhooks/           # Twilio + Stripe webhooks
├── triggers/           # 16 Firestore triggers
├── scheduled/          # 26 cron jobs
├── runtime/            # 4 Cloud Tasks
├── emailMarketing/     # MailWizz (99 autoresponders)
├── telegram/           # Integration Telegram
├── lib/                # Librairies partagées
└── utils/              # Utilitaires
```

---

## 🗄️ Base de Données (Firestore)

### Collections Principales (75+)

#### Users & Authentication
- `users/{uid}` - Profil utilisateur (role, email, status)
- `sos_profiles/{profileId}` - Profil provider (pricing, languages, isVisible)

#### Calls & Sessions
- `call_sessions/{sessionId}` - Sessions d'appel Twilio
- `call_execution_locks/{lockId}` - Distributed locks

#### Payments & Financial
- `payments/{paymentId}` - Transactions Stripe/PayPal (**Cloud Functions ONLY**)
- `transfers/{transferId}` - Transfers vers providers
- `refunds/{refundId}` - Remboursements
- `invoices/{invoiceId}` - Factures
- `journal_entries/{entryId}` - Comptabilité

#### Subscriptions
- `subscriptions/{providerId}` - Souscriptions actives
- `subscription_plans/{planId}` - Plans disponibles

#### Affiliate
- `chatters/{uid}` - Chatters
- `chatter_commissions/{commissionId}` - Commissions chatter
- `influencers/{uid}` - Influenceurs
- `bloggers/{uid}` - Blogueurs
- `group_admins/{uid}` - Group admins

#### Multi-Provider
- `users/{accountOwnerId}` - Account owner avec `linkedProviderIds`
- `users/{providerId}` - Provider avec dénormalisation

#### Telegram
- `telegram_onboarding_links/{code}` - Deep links (24h expiry)

#### Notifications
- `notifications/{notificationId}` - In-app notifications
- `fcm_tokens/{userId}` - Firebase Cloud Messaging tokens

### Security Rules

**Score audit** : 85/100 (Bon + Excellent Financial Protection)

**Principes** :
- Cloud Functions ONLY pour `payments/`, `refunds/`, `transfers/`
- Owner access pour `users/`, `sos_profiles/`
- Admin override pour toutes collections
- Agency manager access via `hasAgencyAccessToProvider()`

> 📖 Voir [docs/06-OPERATIONS/security-audit.md](./docs/06-OPERATIONS/security-audit.md)

---

## 📞 Système d'Appels Twilio

### Flow Complet

```
Client clique "Appeler"
    ↓
createAndScheduleCall (callable, west1)
    ↓
Enqueue Cloud Task (west3)
    ↓
executeCallTask (HTTP, west3)
    ├→ Appel Client (avec retries)
    │   ├→ AMD detection (répondeur)
    │   └→ Timeout 90s
    ↓
twilioWebhooks (DTMF gather, west3)
    ├→ Client confirme (press 1)
    └→ Appel Provider
        ↓
TwilioConferenceWebhook (west3)
    ├→ Conference start
    ├→ Participants join
    ├→ Recording start
    ├→ Conference end
    └→ Billing + Analytics
```

### Composants

- **IVR** : 9 langues (FR, EN, ES, DE, PT, RU, ZH, HI, AR)
- **AMD** : Answering Machine Detection (machine/human/unknown)
- **Recording** : Rétention 90 jours
- **Retry** : 3 tentatives max (backoff exponentiel)
- **Circuit breaker** : Suspend après 5 échecs consécutifs

> 📖 Voir [docs/03-FEATURES/twilio-calls.md](./docs/03-FEATURES/twilio-calls.md)

---

## 💳 Système de Paiements

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              COUNTRY-BASED GATEWAY SELECTION                │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────────┐       ┌────────────────────┐
│ STRIPE CONNECT    │       │ PAYPAL             │
│ (44 pays)         │       │ (150+ pays)        │
│                   │       │                    │
│ • Express account │       │ • Email-based      │
│ • KYC automatique │       │ • Simple payouts   │
│ • Onboarding link │       │ • No Partner API   │
└───────────────────┘       └────────────────────┘
        │                             │
        └──────────────┬──────────────┘
                       ▼
        ┌──────────────────────────────┐
        │ CENTRALIZED PAYMENT SYSTEM   │
        │                              │
        │ • payment_withdrawals/       │
        │ • Wise (bank transfers)      │
        │ • Flutterwave (Mobile Money) │
        └──────────────────────────────┘
```

### Providers

| Gateway | Coverage | Use Case |
|---------|----------|----------|
| **Stripe** | 44 pays | Providers (lawyers, expats) |
| **PayPal** | 150+ pays | Providers (pays non-Stripe) |
| **Wise** | 150+ pays | Affiliate withdrawals |
| **Flutterwave** | 40+ pays Afrique | Mobile Money (FCFA zones) |

### Workflow KYC

1. Provider registration → `onProviderCreated` trigger
2. Stripe Express account creation (auto)
3. Admin approval → `approveProfile` callable
4. Provider gets onboarding link → Stripe hosted KYC
5. `stripeWebhook` → `account.updated` → Update `kycStatus`
6. Profile `isVisible: true` quand KYC completed

> 📖 Voir [docs/03-FEATURES/payments.md](./docs/03-FEATURES/payments.md)

---

## 🎯 Système Affiliate

### 4 Rôles

| Rôle | Plateforme | Commission Client | Commission Recruitment |
|------|-----------|-------------------|----------------------|
| **Chatter** | Telegram | $10 | $50 @ $200 threshold |
| **Influencer** | Instagram/TikTok | Flexible (rules V2) | Flexible |
| **Blogger** | Blog + SEO | $10 | $5 @ $200 threshold |
| **GroupAdmin** | Facebook Groups | $10 | $50 @ $200 threshold |

### Architecture Commissions

**Lifecycle** :
```
pending (hold period 3-7j)
    ↓
validated (release delay 24h)
    ↓
available (ready for withdrawal)
    ↓
paid (withdrawal completed)
```

**Scheduled functions** :
- `validatePendingCommissions` (hourly)
- `releaseValidatedCommissions` (hourly)
- `monthlyTop3Rewards` (1er du mois)

### Telegram Integration

- **Deep links** : `https://t.me/SOSExpatChatterBot?start={code}`
- **Webhook** : `telegramChatterBotWebhook` (west3)
- **$50 bonus** : Crédité à la liaison, débloqué à $150 earnings
- **Bot unique** : Pour tous les rôles (chatter, influencer, blogger, groupAdmin)

> 📖 Voir [docs/04-AFFILIATE/](./docs/04-AFFILIATE/)

---

## 🔐 Sécurité

### Authentification

- **Firebase Auth** : Email/password + Google OAuth + SMS
- **Custom claims** : `role`, `admin`
- **Multi-factor** : SMS verification (optional)

### Autorisation

- **Firestore Rules** : Role-based access control
- **Cloud Functions** : `assertAdmin()` pattern
- **API verification** : `verifyAdminAuth()` for REST
- **Protected routes** : `ProtectedRoute` component

### Data Protection

- **Encryption at rest** : GCP default (AES-256)
- **Encryption in transit** : HTTPS/TLS 1.3
- **Secrets** : Firebase Secret Manager (30+ secrets)
- **PII masking** : Logs sanitized

### Compliance

- ✅ **GDPR** : Export, delete, consent tracking
- ✅ **PCI DSS** : Stripe + PayPal compliant
- ✅ **SOC 2** : Firebase certified
- ✅ **CCPA** : California Privacy Act compliant

---

## 🚀 Déploiement

### Environnements

| Env | Frontend | Backend | Database |
|-----|----------|---------|----------|
| **Dev** | localhost:5174 | Emulators | Emulator |
| **Staging** | staging.sos-expat.com | Firebase (test) | Firestore (test) |
| **Production** | www.sosexpats.com | Firebase (live) | Firestore (live) |

### CI/CD Pipelines

**Frontend** :
- Push `main` → Cloudflare Pages auto-deploy
- Preview deployments sur feature branches

**Backend** :
- Push `main` dans `firebase/functions/**` → GitHub Actions → Firebase deploy
- Manual deployment : `firebase deploy --only functions`

### Rollback

**Frontend** : Cloudflare Pages rollback (1-click)
**Backend** : Redeploy version précédente
**Database** : Restore from backup (RPO 24h, RTO 4h)

> 📖 Voir [docs/05-DEPLOYMENT/](./docs/05-DEPLOYMENT/)

---

## 📊 Monitoring & Observabilité

### Métriques

- **Firebase Performance** : Page load, API latency
- **Google Analytics** : User behavior, conversions
- **Sentry** : Error tracking (frontend + backend)
- **Custom dashboards** : GCP monitoring

### Alertes

- Budget alerts (GCP costs > threshold)
- Provider inactivity (180 min offline)
- Stuck payments (pending > 24h)
- Pending transfers (> 48h)
- Admin alerts digest (9h Paris)

### Logs

- **Firebase Functions logs** : Cloud Logging
- **Frontend errors** : Sentry
- **Audit logs** : `auditLogs/` collection
- **Financial events** : `financial_events/` collection

---

## 🔗 Ressources

- [README.md](./README.md) - Point d'entrée
- [docs/](./docs/) - Documentation complète
- [Backlink Engine Architecture](../backlink-engine/docs/architecture/README.md)
- [Dashboard Multi-Provider](../Dashboard-multiprestataire/README.md)

---

**Document maintenu par l'équipe technique SOS Expat**
**Dernière révision** : 2026-02-16
