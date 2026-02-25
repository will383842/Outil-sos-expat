# SOS Expat — High Level Design (HLD)

> **Version**: 1.0
> **Date**: 25 février 2026
> **Projet**: SOS Expat — Plateforme d'assistance juridique et expatriation
> **Statut**: Production

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture globale](#2-architecture-globale)
3. [Composants principaux](#3-composants-principaux)
4. [Architecture multi-région GCP](#4-architecture-multi-région-gcp)
5. [Flux d'appel Twilio (Core Business)](#5-flux-dappel-twilio-core-business)
6. [Système de paiement](#6-système-de-paiement)
7. [Système d'affiliation](#7-système-daffiliation)
8. [Modèle de données Firestore](#8-modèle-de-données-firestore)
9. [Services externes](#9-services-externes)
10. [Sécurité & Authentification](#10-sécurité--authentification)
11. [Jobs planifiés (Crons)](#11-jobs-planifiés-crons)
12. [Triggers Firestore](#12-triggers-firestore)
13. [Projets satellites](#13-projets-satellites)
14. [Infrastructure & Déploiement](#14-infrastructure--déploiement)
15. [Diagrammes d'architecture](#15-diagrammes-darchitecture)

---

## 1. Vue d'ensemble

### 1.1 Description du produit

SOS Expat est une plateforme de mise en relation téléphonique en temps réel entre des **clients expatriés** et des **prestataires** (avocats, experts expatriation). Le client paie, un appel Twilio est orchestré via IVR/conférence, et les prestataires sont rémunérés après l'appel.

### 1.2 Écosystème applicatif

| Application | Rôle | Stack | Déploiement |
|---|---|---|---|
| **SOS Frontend** | App client/provider/admin | React 18 + Vite + Tailwind | Cloudflare Pages |
| **SOS Backend** | ~688 Cloud Functions | TypeScript + Firebase Functions v7 | GCP Cloud Run (3 régions) |
| **Outil-sos-expat** | Assistant IA prestataires | React 18 + Firebase Functions | Firebase Hosting |
| **Dashboard-multiprestataire** | Dashboard agences | React 18 + Vite (PWA) | Cloudflare Pages |
| **Backlink Engine** | SEO & outreach automatisé | Fastify + Prisma + BullMQ | Docker sur Hetzner VPS |

### 1.3 Chiffres clés

- **~688 Cloud Functions** réparties sur 3 régions
- **~130+ collections Firestore**
- **18 services externes** intégrés
- **9 langues** supportées (FR, EN, ES, DE, PT, RU, ZH, HI, AR)
- **44 pays Stripe** + **150+ pays PayPal**
- **4 types d'affiliés** (Chatter, Influencer, Blogger, GroupAdmin)

---

## 2. Architecture globale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTS (Navigateurs / PWA)                   │
├──────────┬──────────┬────────────────┬──────────────────────────────────┤
│ SOS App  │ Outil IA │ Dashboard Multi │ Backlink Engine UI              │
│ (React)  │ (React)  │ (React PWA)    │ (React)                         │
└────┬─────┴────┬─────┴──────┬─────────┴───────────┬─────────────────────┘
     │          │            │                      │
     ▼          ▼            ▼                      ▼
┌─────────────────────────────────────┐  ┌─────────────────────────────┐
│     FIREBASE / GCP                   │  │   HETZNER VPS               │
│                                      │  │                             │
│  ┌────────────────────────────────┐  │  │  ┌───────────────────────┐  │
│  │      Firebase Auth             │  │  │  │  Fastify API          │  │
│  │   (Email + Google OAuth)       │  │  │  │  + BullMQ Workers     │  │
│  └────────────────────────────────┘  │  │  └───────────┬───────────┘  │
│                                      │  │              │              │
│  ┌────────────────────────────────┐  │  │  ┌───────────┴───────────┐  │
│  │     Cloud Functions v2         │  │  │  │  PostgreSQL + Redis   │  │
│  │  (Cloud Run - 3 régions)       │  │  │  └───────────────────────┘  │
│  │                                │  │  │                             │
│  │  west1: Core API (~200 fn)     │  │  └─────────────────────────────┘
│  │  west2: Affiliate (~143 fn)    │  │
│  │  west3: Payments+Twilio (~120) │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │       Cloud Firestore          │  │
│  │    (130+ collections)          │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Cloud Storage + Cloud Tasks   │  │
│  └────────────────────────────────┘  │
│                                      │
└─────────────────────────────────────┘

         SERVICES EXTERNES
┌──────────┬──────────┬──────────┐
│  Twilio  │  Stripe  │  PayPal  │
│ (Appels) │(Paiement)│(Paiement)│
├──────────┼──────────┼──────────┤
│  Wise    │Flutterwave│ Zoho    │
│(Virement)│(Mob.Money)│ (Email) │
├──────────┼──────────┼──────────┤
│ Telegram │ Meta CAPI│Google Ads│
│  (Bot)   │(Tracking)│(Tracking)│
├──────────┼──────────┼──────────┤
│ MailWizz │ OpenAI   │ Sentry   │
│(Outreach)│  (LLM)   │(Errors)  │
└──────────┴──────────┴──────────┘
```

---

## 3. Composants principaux

### 3.1 SOS Frontend

| Aspect | Détail |
|---|---|
| **Framework** | React 18.3 + TypeScript 5.9 + Vite 5.4 |
| **Styling** | Tailwind CSS 3.4 + MUI v7 (composants complexes) |
| **State** | TanStack Query v5 + Context API (Auth, App, PayPal) |
| **Routing** | React Router v6 (~370 routes : publiques, protégées, affiliés, admin) |
| **i18n** | React Intl v7 (9 langues, RTL arabe) |
| **PWA** | Workbox (Service Worker, IndexedDB 50MB, offline) |
| **Auth** | Firebase Auth (Email + Google OAuth, custom claims JWT) |
| **Paiement** | Stripe Elements + PayPal React SDK |
| **Analytics** | GA4, GTM, Meta Pixel, Sentry v10 |
| **Deploy** | Cloudflare Pages (auto-deploy push main) |

**Connexion multi-région aux Cloud Functions :**
```
functions       → europe-west1 (API publiques, admin, KYC)
functionsWest2  → europe-west2 (Chatter, Influencer, Blogger, GroupAdmin)
functionsWest3  → europe-west3 (Twilio, Triggers)
functionsPayment→ europe-west3 (Stripe, PayPal callables)
```

### 3.2 SOS Backend (Firebase Functions)

| Aspect | Détail |
|---|---|
| **Runtime** | Node.js 22 |
| **Framework** | Firebase Functions v7 (2nd gen = Cloud Run) |
| **Build** | esbuild (bundle ~10-20MB, externals natifs) |
| **TypeScript** | 5.9.3 strict |
| **Validation** | Zod v4 |
| **Total fonctions** | ~688 (déployées sur 3 régions) |
| **Concurrency** | 1 (requis car CPU = 0.083 vCPU) |

**Configurations de ressources (par type) :**

| Config | Mémoire | CPU | Max Instances | Usage |
|---|---|---|---|---|
| emergencyConfig | 256 MiB | 0.083 | 3 | Admin rarement utilisé |
| adminConfig | 512 MiB | 0.083 | 5 | Opérations admin |
| userConfig | 512 MiB | 0.083 | 20 | Dashboards utilisateur |
| highTrafficConfig | 512 MiB | 0.083 | 50 | Opérations fréquentes |
| webhookConfig | 512 MiB | 0.083 | 30 | Webhooks Stripe/Twilio |
| scheduledConfig | 512 MiB | 0.083 | 1 | Crons |
| triggerConfig | 256 MiB | 0.083 | 10 | Triggers Firestore |
| heavyProcessingConfig | 1 GiB | 0.25 | 5 | PDF, backups, exports |

---

## 4. Architecture multi-région GCP

```
┌───────────────────────────────────────────────────────────────────┐
│                     GCP — Projet: sos-urgently-ac307              │
├───────────────────┬──────────────────┬────────────────────────────┤
│  EUROPE-WEST1     │  EUROPE-WEST2    │  EUROPE-WEST3              │
│  Belgique         │  Londres         │  Francfort                 │
│  🟢 Core API      │  🟡 Affiliate    │  🔴 PROTÉGÉE               │
├───────────────────┼──────────────────┼────────────────────────────┤
│                   │                  │                            │
│ createAndSchedule │ registerChatter  │ stripeWebhook              │
│   Call (callable) │ registerInfluencer│ twilioCallWebhook         │
│                   │ registerBlogger  │ twilioConferenceWebhook    │
│ 200+ admin        │ registerGroupAdmin│                           │
│   callables       │                  │ executeCallTask            │
│                   │ getDashboard     │ setProviderAvailableTask   │
│ Stripe KYC        │ getLeaderboard   │ busySafetyTimeoutTask      │
│ (onboarding link) │ requestWithdrawal│                            │
│                   │                  │ createPaymentIntent        │
│ Backups (daily)   │ Training modules │ requestWithdrawal          │
│ DR cross-region   │ Resources/Guides │ savePaymentMethod          │
│                   │                  │                            │
│ GDPR exports      │ Telegram bot     │ Firestore triggers (all)   │
│ Accounting        │   webhook        │ Scheduled crons (all)      │
│ Tax/VAT           │                  │                            │
│                   │ ~143 fonctions   │ Cloud Tasks queue          │
│ SEO/Sitemaps      │                  │   (call-scheduler-queue)   │
│ Analytics         │ Admin affiliate  │                            │
│ Monitoring        │   management     │ minInstances: 1 (webhooks) │
│                   │                  │                            │
│ ~200 fonctions    │                  │ ~120+ fonctions            │
├───────────────────┼──────────────────┼────────────────────────────┤
│ Client-facing     │ Peut saturer     │ JAMAIS saturée             │
│ APIs publiques    │ sans impact core │ Twilio temps réel critique │
└───────────────────┴──────────────────┴────────────────────────────┘
```

**Pourquoi 3 régions ?**
- **west1** : Isole les APIs publiques frontend du trafic critique
- **west2** : Le marketing/affiliate peut générer des pics sans impacter les appels
- **west3** : Les webhooks Twilio sont temps réel — un cold start = appel raté

---

## 5. Flux d'appel Twilio (Core Business)

### 5.1 Séquence complète

```
T+0s    CLIENT (Frontend)
        │
        ▼
        createAndScheduleCallHTTPS (west1)
        ├── Validation auth + données
        ├── Création call_sessions/{id} (Firestore)
        ├── Écriture payments/{id}
        ├── setProviderBusy() ← Réservation immédiate
        └── scheduleCallTask() → Cloud Tasks (west3, délai 240s)
        │
T+240s  CLOUD TASKS
        │
        ▼
        executeCallTask (west3)
        ├── Validation X-Task-Auth
        ├── Idempotence check (call_execution_locks)
        ├── Vérif provider toujours disponible
        └── TwilioCallManager.executeCallSequence()
            │
            ├── 1. APPEL CLIENT (Twilio SDK)
            │   ├── Twilio.calls.create({to: clientPhone})
            │   ├── IVR multilingue + DTMF confirmation
            │   ├── AMD asynchrone (détection répondeur)
            │   └── Max 3 tentatives, timeout 90s/tentative
            │
            ├── 2. APPEL PROVIDER (15s après client connecté)
            │   ├── Twilio.calls.create({to: providerPhone})
            │   ├── IVR + DTMF confirmation
            │   └── Max 3 tentatives
            │
            └── 3. CONFÉRENCE (les deux connectés)
                └── Twilio Conference Room
                    │
                    ▼
        WEBHOOKS TWILIO → west3 (temps réel)
        │
        ├── twilioCallWebhook
        │   ├── ringing → mise à jour statut
        │   ├── answered → amd_pending (attente DTMF)
        │   ├── completed → calcul billingDuration
        │   └── failed/no-answer → retry ou échec
        │
        └── twilioConferenceWebhook
            ├── conference-start → status "active"
            ├── participant-join → connectedAt timestamp
            ├── participant-leave → disconnectedAt
            └── conference-end → DÉCISION PAIEMENT
                │
                ▼
        DÉCISION FACTURATION
        │
        ├── billingDuration ≥ 60s → CAPTURE paiement
        │   ├── Stripe capture() ou PayPal confirmCapture()
        │   ├── Création factures (client + provider)
        │   ├── Schedule transfert provider
        │   └── Trigger: commissions affiliés
        │
        └── billingDuration < 60s → REMBOURSEMENT
            ├── Void authorization (si pas encore capturé)
            └── Refund (si déjà capturé)
```

### 5.2 Points critiques

| Aspect | Détail |
|---|---|
| **billingDuration** | Temps depuis que les DEUX participants sont connectés (pas depuis début appel) |
| **AMD** | Détection voicemail asynchrone + confirmation DTMF (jamais confiance au AnsweredBy Twilio) |
| **CallSid validation** | Chaque webhook vérifie que le CallSid correspond à la tentative courante (ignore stale) |
| **Idempotence** | `call_execution_locks` (Cloud Tasks) + `processed_webhook_events` (webhooks) |
| **Provider réservation** | Immédiate à T+0 (avant même l'appel) pour éviter double-booking |
| **Safety timeout** | busySafetyTimeoutTask libère le provider après 10 min si stuck en "busy" |

---

## 6. Système de paiement

### 6.1 Architecture des paiements

```
┌──────────────────────────────────────────────────────────────────┐
│                    PAIEMENT CLIENT (Appel)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Client → Stripe PaymentIntent (requires_capture)                │
│        → OU PayPal Order (AUTHORIZED)                            │
│                                                                   │
│  Appel complété (≥60s) → CAPTURE automatique                    │
│  Appel échoué (<60s)   → VOID / REFUND automatique              │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                  VERSEMENT PRESTATAIRE                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  44 pays Stripe  → Stripe Express (Connect)                     │
│                    ├── Compte créé auto à l'inscription          │
│                    ├── KYC hébergé par Stripe                    │
│                    └── Transfert destination charges              │
│                                                                   │
│  150+ pays PayPal → Email-based payouts                          │
│                     └── paypalEmail stocké (Payouts API)         │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│               RETRAIT AFFILIÉS (Chatter/Influencer/etc)          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Virement bancaire → Wise Transfer API                           │
│  Mobile Money      → Flutterwave Payouts API                    │
│    (Afrique)         (Orange Money, MTN, M-Pesa...)              │
│                                                                   │
│  Flux: requestWithdrawal → Admin approval → Processing           │
│        → Wise/Flutterwave API → Webhook confirmation             │
│                                                                   │
│  Config: Min $10, Max $5000/retrait, $20000/mois                │
│  Hold: 48h (24h validation + 24h release)                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 6.2 Stripe Webhooks (west3)

Événements gérés : `payment_intent.*`, `checkout.session.completed`, `charge.refunded`, `charge.dispute.*`, `customer.subscription.*`, `invoice.*`, `transfer.*`, `account.updated`

### 6.3 Sécurité paiements

- **Données sensibles** (IBAN, numéro compte) chiffrées avant stockage
- **Payments collection** : `allow create: false` (Cloud Functions seulement)
- **Circuit breaker** sur API Stripe (3 échecs → circuit OPEN, reset 15s)
- **Atomic batch writes** pour cohérence Firestore
- **Fraud detection** : dual-layer (query rapide + vérification transactionnelle)

---

## 7. Système d'affiliation

### 7.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                   SYSTÈME D'AFFILIATION (west2)                  │
├────────────┬────────────┬──────────────┬────────────────────────┤
│  CHATTER   │ INFLUENCER │   BLOGGER    │    GROUPADMIN          │
│ Ambassador │  Réseaux   │  Blog/SEO    │  Facebook/Telegram     │
├────────────┼────────────┼──────────────┼────────────────────────┤
│            │            │              │                        │
│ $10/appel  │ $10/appel  │ $10/appel    │ $10/appel client      │
│   client   │   client   │   client     │                        │
│            │            │              │ $1/appel provider      │
│ $1/appel   │            │ $5/appel     │   recruté (6 mois)    │
│   N1       │            │  provider    │                        │
│            │            │  recruté     │ $50/GroupAdmin         │
│ $0.50/appel│            │  (6 mois)    │   recruté (seuil)     │
│   N2       │            │              │                        │
│            │            │              │                        │
│ $5 bonus   │            │              │                        │
│ activation │            │              │                        │
├────────────┴────────────┴──────────────┴────────────────────────┤
│                                                                  │
│  FLUX COMMISSION:                                                │
│  pending (24h) → validated → available → withdrawn → paid       │
│                                                                  │
│  RETRAIT: Min $10, via Wise (bank) ou Flutterwave (mobile)     │
│  TELEGRAM: Obligatoire pour confirmation retrait                │
│  ANTI-FRAUDE: Min 120s d'appel, IP/device fingerprint          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Gamification (Chatter)

- **Weekly Challenges** : rotation recruiter → caller → team (3 semaines)
  - Prix : $50 / $25 / $10 (top 3)
- **Monthly Top 3** : multiplicateurs commissions (2x / 1.5x / 1.15x)
- **Niveaux** : 1-5 avec progression par revenus
- **Tirelire** : $50 bonus Telegram, débloqué à $150 de commissions

### 7.3 Ressources & Formation

| Module | Chatter | Influencer | Blogger | GroupAdmin |
|---|---|---|---|---|
| Training (slides + quiz) | Oui | Oui | Non | Non |
| Resources (logos, banners) | Non | Oui | Oui | Oui |
| Guide d'intégration | Non | Non | Oui | Non |
| Posts prêts à publier | Non | Non | Non | Oui |
| Telegram onboarding | Oui | Oui | Oui | Oui |

---

## 8. Modèle de données Firestore

### 8.1 Collections principales

```
AUTHENTIFICATION & UTILISATEURS
├── users/{userId}                    # Document maître (rôle, balance, affiliate)
├── fcmTokens/{userId}               # Tokens push notification
└── sos_profiles/{profileId}          # Profil prestataire (statut, tarifs, KYC)
    └── reviews/{reviewId}            # Avis clients

APPELS & SESSIONS
├── call_sessions/{sessionId}         # Session d'appel (metadata, paiement, participants)
├── call_execution_locks/{lockId}     # Idempotence Cloud Tasks
└── call_recordings/{recordingId}     # Enregistrements (admin)

PAIEMENTS
├── payments/{paymentId}              # Transactions (IMMUTABLE, CF only)
├── payment_withdrawals/{id}          # Demandes de retrait
├── payment_methods/{methodId}        # Méthodes sauvegardées (chiffrées)
├── pending_transfers/{id}            # Transferts en attente KYC
├── refunds/{refundId}                # Remboursements
├── payouts/{payoutId}                # Versements Stripe
├── invoices/{invoiceId}              # Factures
└── disputes/{disputeId}              # Litiges/chargebacks

AFFILIÉS
├── chatters/{chatterId}              # Profils chatters
├── influencers/{influencerId}        # Profils influenceurs
├── bloggers/{bloggerId}              # Profils blogueurs
├── group_admins/{groupAdminId}       # Profils group admins
├── chatter_commissions/{id}          # Commissions chatter
├── influencer_commissions/{id}       # Commissions influencer
├── blogger_commissions/{id}          # Commissions blogger
├── group_admin_commissions/{id}      # Commissions group admin
└── affiliate_commissions/{id}        # Commissions générales

CONFIGURATION
├── admin_config/{docId}              # Config système (pricing, payout, etc.)
├── subscription_plans/{planId}       # Plans d'abonnement IA
├── country_settings/{countryId}      # Pays activés
├── coupons/{couponId}                # Coupons de réduction (admin only)
└── payment_config/payment_config     # Config paiement (seuils, limites)

NOTIFICATIONS
├── notifications/{id}                # Notifications utilisateur
├── inapp_notifications/{id}          # Notifications in-app (CF only)
├── admin_notifications/{id}          # Alertes admin
└── notification_dlq/{id}             # Dead Letter Queue

AUDIT & MONITORING
├── audit_logs/{logId}                # Audit facturation (immutable)
├── admin_audit_logs/{logId}          # Actions admin
├── security_alerts/{alertId}         # Alertes sécurité
├── technical_alerts/{alertId}        # Alertes techniques
├── cost_metrics/{docId}              # Métriques coûts GCP
└── analytics_events/{id}             # Événements analytics
```

### 8.2 Relations clés

```
users/{uid} ──1:1──► sos_profiles/{uid}        (prestataire)
users/{uid} ──1:1──► chatters/{uid}            (si rôle chatter)
users/{uid} ──1:N──► call_sessions/{id}        (via clientId/providerId)
users/{uid} ──1:N──► payment_withdrawals/{id}  (via userId)
users/{uid} ──M:N──► users/{uid}               (linkedProviderIds = multi-provider)

call_sessions/{id} ──1:1──► payments/{id}      (via paymentIntentId)
call_sessions/{id} ──1:N──► *_commissions/{id} (triggers post-appel)
```

---

## 9. Services externes

### 9.1 Carte des intégrations

| Service | Usage | Région | Protocole |
|---|---|---|---|
| **Twilio** | Appels vocaux, IVR, conférence | west3 | REST API + Webhooks |
| **Stripe** | Paiements clients, Express accounts, Connect | west3 | SDK + Webhooks |
| **PayPal** | Paiements (150+ pays) | west3 | REST API |
| **Wise** | Virements bancaires affiliés | west3 | REST API + Webhooks |
| **Flutterwave** | Mobile Money Afrique | west3 | REST API + Webhooks |
| **Zoho Mail** | Emails transactionnels | west1 | SMTP (Nodemailer) |
| **Telegram** | Bot notifications (admins + affiliés) | west3 | Bot API (Fetch) |
| **Firebase Cloud Messaging** | Push notifications mobiles | - | Firebase Admin SDK |
| **Meta Conversions API** | Attribution Facebook Ads | west3 | Graph API |
| **Google Ads** | Suivi conversions | west3 | REST API |
| **MailWizz** | Email marketing affiliés | west1 | REST API |
| **OpenAI** | IA prestataires (Outil) | west1 | REST API |
| **Anthropic Claude** | IA juridique (Outil) | west1 | REST API |
| **Perplexity** | Recherche web IA (Outil) | west1 | REST API |
| **Sentry** | Error tracking | Frontend | SDK |
| **VIES** | Validation TVA européenne | west1 | SOAP API |
| **Google Safe Browsing** | Détection malware (Backlink) | Hetzner | REST API |
| **Cloud Tasks** | File d'attente appels | west3 | GCP SDK |

### 9.2 Secrets centralisés

Tous les secrets sont définis dans un **fichier unique** `lib/secrets.ts` via `defineSecret()`.
**Jamais** de `defineSecret()` dans d'autres fichiers (causerait des conflits).

Accès : `firebase functions:secrets:set SECRET_NAME`

---

## 10. Sécurité & Authentification

### 10.1 Couches de sécurité

```
┌─────────────────────────────────────────────────────┐
│  1. FIREBASE AUTH                                    │
│     ├── Email + mot de passe                        │
│     ├── Google OAuth (popup/redirect selon device)  │
│     └── Custom Claims JWT (role, isAdmin, isAAA)    │
├─────────────────────────────────────────────────────┤
│  2. FIRESTORE RULES (3000+ lignes)                  │
│     ├── isAuthenticated(), isAdmin(), isOwner()     │
│     ├── Champs protégés (role, balance, stripe...)  │
│     ├── payments: create/update = false (CF only)   │
│     └── Multi-provider: hasAgencyAccessToProvider() │
├─────────────────────────────────────────────────────┤
│  3. CLOUD FUNCTIONS                                  │
│     ├── Auth check obligatoire (request.auth)       │
│     ├── Role check (admin, provider, client)        │
│     ├── CORS whitelist (ALLOWED_ORIGINS)            │
│     └── Rate limiting implicite (maxInstances)      │
├─────────────────────────────────────────────────────┤
│  4. WEBHOOKS                                         │
│     ├── Twilio: Signature + AccountSid + IP check   │
│     ├── Stripe: Signature HMAC-SHA256               │
│     ├── Cloud Tasks: X-Task-Auth header             │
│     └── Idempotence: processed_webhook_events       │
├─────────────────────────────────────────────────────┤
│  5. STORAGE RULES                                    │
│     ├── Taille max: 15 MB (auth) / 5 MB (anon)     │
│     ├── Types: images + PDF + Word uniquement       │
│     └── Cleanup auto fichiers temporaires (24h)     │
└─────────────────────────────────────────────────────┘
```

### 10.2 Rôles et permissions

| Rôle | Scope | Claims JWT |
|---|---|---|
| `client` | Passer des appels, laisser des avis | `role: "client"` |
| `lawyer` | Recevoir des appels, KYC Stripe | `role: "lawyer"` |
| `expat` | Recevoir des appels, KYC Stripe | `role: "expat"` |
| `chatter` | Recruter, toucher commissions | `role: "chatter"` |
| `influencer` | Partager liens, commissions | `role: "influencer"` |
| `blogger` | Widget/articles, commissions | `role: "blogger"` |
| `groupAdmin` | Posts groupes, commissions | `role: "groupAdmin"` |
| `agency_manager` | Dashboard multi-prestataire | `role: "agency_manager"` |
| `admin` | Accès total | `role: "admin"` |

### 10.3 Admin whitelist

Stockée dans `settings/admin_whitelist` (Firestore) + fallback hardcodé. Un admin existant est **requis** pour ajouter un nouvel admin (protection escalade de privilèges).

---

## 11. Jobs planifiés (Crons)

### 11.1 Résumé des fréquences

| Fréquence | Fonction | Région | Description |
|---|---|---|---|
| **Toutes les 15 min** | `checkProviderInactivity` | west3 | Met hors ligne les providers inactifs 180 min |
| **Toutes les 30 min** | `stuckPaymentsRecovery` | west3 | Récupère paiements bloqués (capture/refund) |
| **Toutes les heures H+00** | `consolidatedValidateCommissions` | west3 | Valide commissions pending → validated |
| **Toutes les heures H+30** | `consolidatedReleaseCommissions` | west3 | Release commissions validated → available |
| **Toutes les heures** | `aggregateProviderStats` | west3 | Agrège stats performance prestataires |
| **Toutes les heures** | `chatterUpdateChallengeLeaderboard` | west3 | MAJ classement challenge hebdo |
| **Toutes les 6 heures** | `paymentDataCleanup` | west3 | Nettoie locks, orders expirés, archive 90j |
| **Quotidien 03:00** | `backupFirebaseAuth` | west3 | Backup Auth → Cloud Storage (90j retention) |
| **Quotidien 09:00** | `adminAlertsDigestDaily` | west3 | Digest email alertes admin |
| **Quotidien 19:00 UTC** | `telegramDailyReport` | west3 | Rapport Telegram (CA, inscriptions, appels) |
| **Hebdo Lundi 00:05** | `chatterCreateWeeklyChallenge` | west3 | Crée nouveau challenge (rotation 3 types) |
| **Hebdo Dimanche 23:55** | `chatterEndWeeklyChallenge` | west3 | Distribue prix top 3 |
| **Mensuel 1er 00:30** | `chatterMonthlyTop3Rewards` | west3 | Multiplicateurs commissions top 3 |
| **Mensuel 1er 04:00** | `cleanupOldAuthBackups` | west3 | Supprime backups > 90 jours |

---

## 12. Triggers Firestore

### 12.1 Triggers consolidés (mega-dispatchers)

| Trigger | Collection | Événement | Handlers |
|---|---|---|---|
| `consolidatedOnCallCompleted` | `call_sessions/{id}` | onUpdate (status=completed+isPaid) | 5 modules : Chatter, Influencer, Blogger, GroupAdmin, Affiliate |
| `consolidatedOnUserCreated` | `users/{id}` | onCreate | 10 handlers : Affiliate init, recruitment tracking, MailWizz, claims, Telegram, Meta CAPI, Google Ads |
| `consolidatedOnUserUpdated` | `users/{id}` | onUpdate | 9 handlers : Profile sync, KYC, PayPal, claims, Outil sync, email sync |

### 12.2 Autres triggers

| Trigger | Collection | Événement | Purpose |
|---|---|---|---|
| `onProviderCreated` | `sos_profiles/{uid}` | onCreate | Création auto compte Stripe/PayPal |
| `onInvoiceRecordCreated` | `invoice_records/{id}` | onCreate | Crée admin_invoice + email multilingue |
| `onPaymentError` | `payment_records/{id}` | onCreate/onUpdate | Alertes paiements échoués temps réel |
| `syncRoleClaims` | `users/{uid}` | onCreate/onUpdate | Sync rôle → Firebase Auth custom claims |
| `syncSosProfilesToOutil` | `sos_profiles/{uid}` | onCreate/onUpdate | Sync profil → Outil-sos-expat API |
| `onWithdrawalStatusChanged` | `payment_withdrawals/{id}` | onUpdate | Email Zoho + Telegram DM si échec |
| `onPaymentCompleted` | `payments/{id}` | onUpdate | Écriture comptable automatique |
| `onSecurityAlertCreated` | `security_alerts/{id}` | onCreate | Notification + escalade |

---

## 13. Projets satellites

### 13.1 Outil-sos-expat (Assistant IA)

| Aspect | Détail |
|---|---|
| **But** | Assistant IA pour prestataires (analyse dossiers, réponses juridiques) |
| **Frontend** | React 18 + TypeScript + Vite + Tailwind + Radix UI |
| **Backend** | Firebase Functions (projet `outils-sos-expat`) |
| **IA** | Claude 3.5 Sonnet (avocats) + GPT-4o (experts) + Perplexity (recherche) |
| **Auth** | SSO via Custom Token Firebase (généré par SOS) |
| **Sync** | Webhooks bidirectionnels (SOS ↔ Outil) pour bookings et profils |
| **Quotas** | 100 appels IA/mois (configurable, reset mensuel auto) |
| **Deploy** | Firebase Hosting + Cloud Functions |

### 13.2 Dashboard-multiprestataire

| Aspect | Détail |
|---|---|
| **But** | Dashboard temps réel pour agences (cabinets d'avocats multi-provider) |
| **Frontend** | React 18 + Vite + Tailwind (PWA complète) |
| **Firebase** | Même projet (`sos-urgently-ac307`) |
| **Données** | `sos_profiles` (onSnapshot temps réel), `booking_requests`, `provider_stats` |
| **Auth** | Firebase Auth, rôle `agency_manager` ou `admin` |
| **Pages** | Dashboard, Team, Requests (3 onglets), Stats (charts Recharts), Billing |
| **PWA** | Notifications browser, beep audio, installation multi-plateforme |
| **i18n** | 9 langues (FR default) |
| **Deploy** | Cloudflare Pages |

### 13.3 Backlink Engine

| Aspect | Détail |
|---|---|
| **But** | Automatisation acquisition backlinks pour SEO |
| **Stack** | TypeScript + Fastify 5 + Prisma 6 + PostgreSQL 16 + Redis 7 + BullMQ |
| **Features** | Email scraping, contact form detection, language/country detection, outreach MailWizz, reply categorization IA, backlink verification |
| **Workers** | 6 workers BullMQ (enrichment, auto-enrollment, outreach, reply, verification, reporting) |
| **API** | 87 endpoints REST (JWT auth) |
| **Frontend** | React 18 + Vite + TanStack Query (17 pages) |
| **Deploy** | Docker Compose sur Hetzner VPS (89.167.26.169) |
| **URL** | https://backlinks.life-expat.com |

---

## 14. Infrastructure & Déploiement

### 14.1 Pipeline CI/CD

```
┌──────────────────────────────────────────────────────────┐
│                   PUSH → main (GitHub)                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────┐                     │
│  │  CI Pipeline (.github/ci.yml)   │                     │
│  │  ├── Lint + TypeCheck           │                     │
│  │  ├── Tests (Vitest)             │                     │
│  │  ├── Build Frontend (Vite)      │                     │
│  │  ├── Build Functions (esbuild)  │                     │
│  │  └── Security Audit             │                     │
│  └─────────────────────────────────┘                     │
│                                                           │
│  ┌─────────────────────────────────┐                     │
│  │  Deploy Frontend                │                     │
│  │  └── Cloudflare Pages (auto)    │──► sos-expat.com    │
│  └─────────────────────────────────┘                     │
│                                                           │
│  ┌─────────────────────────────────┐                     │
│  │  Deploy Functions               │                     │
│  │  ├── esbuild → lib/index.js    │                     │
│  │  ├── firebase deploy            │──► 3 régions GCP    │
│  │  └── Retry anti-quota 429       │                     │
│  │      (4 tentatives, 120s wait)  │                     │
│  └─────────────────────────────────┘                     │
│                                                           │
│  ┌─────────────────────────────────┐                     │
│  │  Deploy Backlink Engine         │                     │
│  │  ├── SSH → Hetzner VPS         │                     │
│  │  ├── git pull                   │──► Docker rebuild    │
│  │  └── docker compose up --build  │                     │
│  └─────────────────────────────────┘                     │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### 14.2 Scripts de déploiement manuels

| Script | Stratégie |
|---|---|
| `deploy_batch.sh` | Lots de 10 fonctions, 30s entre lots, retry auto quota 429 |
| `deploy_batches.sh` | 25 fonctions/lot, multi-région, progress file JSON |
| `deploy_safe.sh` | Déploiement avec vérifications supplémentaires |
| `deploy_necessary.sh` | Uniquement les fonctions modifiées |

### 14.3 Environnements

| Env | Frontend | Functions | Firestore |
|---|---|---|---|
| **Production** | Cloudflare Pages (main) | GCP Cloud Run (3 régions) | sos-urgently-ac307 |
| **Local Dev** | Vite localhost:5173 | Firebase Emulators (5001) | Emulator (8080) |

### 14.4 Domaines

| Domaine | Service |
|---|---|
| `sos-expat.com` / `www.sos-expat.com` | Frontend (Cloudflare Pages) |
| `sosexpats.com` / `www.sosexpats.com` | Alias frontend |
| `ia.sos-expat.com` | Outil-sos-expat |
| `multi.sos-expat.com` | Dashboard-multiprestataire |
| `backlinks.life-expat.com` | Backlink Engine |
| `mail.life-expat.com` | MailWizz (email marketing) |

---

## 15. Diagrammes d'architecture

### 15.1 Flux utilisateur principal (appel client)

```
 CLIENT                    SOS FRONTEND                CLOUD FUNCTIONS              TWILIO
   │                           │                            │                         │
   │  1. Recherche provider    │                            │                         │
   │─────────────────────────►│                            │                         │
   │                           │  2. Paiement Stripe        │                         │
   │                           │───────────────────────────►│                         │
   │                           │                            │  3. PaymentIntent       │
   │                           │                            │  (requires_capture)     │
   │                           │  4. createAndScheduleCall  │                         │
   │                           │───────────────────────────►│                         │
   │                           │                            │  5. Cloud Task (240s)   │
   │                           │                            │─────────┐               │
   │                           │                            │         │ T+4min        │
   │                           │                            │◄────────┘               │
   │                           │                            │  6. Twilio call client  │
   │                           │                            │────────────────────────►│
   │  7. Téléphone sonne       │                            │                         │
   │◄─────────────────────────────────────────────────────────────────────────────────│
   │  8. Client confirme DTMF  │                            │                         │
   │─────────────────────────────────────────────────────────────────────────────────►│
   │                           │                            │  9. Twilio call provider│
   │                           │                            │────────────────────────►│
   │                           │                            │  10. Conférence active  │
   │◄═══════════════════════════════════════ APPEL EN COURS ═════════════════════════►│
   │                           │                            │  11. Fin conférence     │
   │                           │                            │◄────────────────────────│
   │                           │                            │  12. Capture paiement   │
   │                           │                            │  13. Factures           │
   │                           │                            │  14. Commissions affilié│
   │                           │                            │  15. Transfert provider │
```

### 15.2 Flux commission affilié

```
 APPEL COMPLÉTÉ              TRIGGER (west3)             SCHEDULED (west3)
      │                           │                           │
      │  consolidatedOn           │                           │
      │  CallCompleted            │                           │
      │──────────────────────────►│                           │
      │                           │  Crée commission          │
      │                           │  status: "pending"        │
      │                           │                           │
      │                           │          ┌────────────────┤
      │                           │          │ H+00 validate  │
      │                           │          │ (hourly cron)  │
      │                           │          │                │
      │                           │          │ pending →      │
      │                           │          │   validated    │
      │                           │          │                │
      │                           │          │ H+30 release   │
      │                           │          │ (hourly cron)  │
      │                           │          │                │
      │                           │          │ validated →    │
      │                           │          │   available    │
      │                           │          └────────────────┤
      │                           │                           │
      │  USER: requestWithdrawal  │                           │
      │──────────────────────────►│                           │
      │                           │  available → withdrawn    │
      │                           │                           │
      │  ADMIN: processWithdrawal │                           │
      │──────────────────────────►│                           │
      │                           │  Wise/Flutterwave API     │
      │                           │  withdrawn → paid         │
```

---

> **Document généré le 25 février 2026**
> **Projet Firebase**: `sos-urgently-ac307`
> **Contact technique**: williamsjullin@gmail.com
