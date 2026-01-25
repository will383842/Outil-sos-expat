# DOCUMENTATION COMPLETE - SYSTEME DE NOTIFICATIONS ET EMAILS SOS EXPAT

> **Document genere le:** 25 janvier 2026
> **Version:** 1.0
> **Projet:** SOS Expat (sos + Outil-sos-expat)

---

## TABLE DES MATIERES

1. [Vue d'Ensemble de l'Architecture](#1-vue-densemble-de-larchitecture)
2. [Templates Email](#2-templates-email)
3. [Fonctions d'Envoi d'Emails](#3-fonctions-denvoi-demails)
4. [Systeme de Notifications](#4-systeme-de-notifications)
5. [Pipeline de Notification](#5-pipeline-de-notification)
6. [Workflows et Triggers](#6-workflows-et-triggers)
7. [Systeme d'Internationalisation (i18n)](#7-systeme-dinternationalisation-i18n)
8. [Collections Firestore](#8-collections-firestore)
9. [Console d'Administration](#9-console-dadministration)
10. [Configuration et Secrets](#10-configuration-et-secrets)
11. [Fournisseurs de Services](#11-fournisseurs-de-services)
12. [Annexes](#12-annexes)

---

## 1. VUE D'ENSEMBLE DE L'ARCHITECTURE

### 1.1 Schema Global

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EVENEMENT DECLENCHEUR                             │
│  (User Action / Firestore Trigger / Scheduled Task / Webhook)           │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     MESSAGE EVENT (Firestore)                            │
│  Collection: message_events/{id}                                         │
│  - eventId: string (ex: "subscription.welcome")                          │
│  - locale: string (ex: "fr", "en", "es")                                 │
│  - to: { email, phone, pushToken, uid }                                  │
│  - context: { user data, variables }                                     │
│  - channels: ['email', 'sms', 'push', 'inapp']                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION WORKER                                   │
│  Fichier: notificationPipeline/worker.ts                                 │
│  - Charge le template depuis message_templates/{locale}/items/{eventId} │
│  - Applique la configuration de routage                                  │
│  - Verifie le rate limiting                                             │
│  - Selectionne les canaux disponibles                                   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   EMAIL         │  │   PUSH (FCM)    │  │   SMS (Twilio)  │
│   (Zoho SMTP)   │  │                 │  │                 │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    DELIVERY LOG (Firestore)                              │
│  Collection: message_deliveries/{id}                                     │
│  - eventId, channel, status, error, sentAt                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Canaux de Communication Supportes

| Canal | Provider | Statut | Limitations |
|-------|----------|--------|-------------|
| **Email** | Zoho SMTP | ✅ Actif | Aucune |
| **Push** | Firebase Cloud Messaging | ✅ Actif | Requiert permission navigateur |
| **SMS** | Twilio | ⚠️ Limite | Seulement 2 events autorises (cout) |
| **In-App** | Firestore | ✅ Actif | Aucune |
| **WhatsApp** | Templates predefinis | 🔜 Planifie | Non implemente |

### 1.3 Langues Supportees (9 langues)

| Code | Langue | Statut Templates |
|------|--------|------------------|
| `fr` | Francais | ✅ Complet |
| `en` | Anglais | ✅ Complet (fallback) |
| `es` | Espagnol | ✅ Complet |
| `pt` | Portugais | ✅ Complet |
| `de` | Allemand | ⚠️ Partiel (~8 templates) |
| `ru` | Russe | ✅ Complet |
| `ar` | Arabe | ✅ Complet (RTL) |
| `hi` | Hindi | ✅ Complet |
| `ch` | Chinois | ✅ Complet |

---

## 2. TEMPLATES EMAIL

### 2.1 Localisation des Templates

#### A. Templates TypeScript (Code Source)

**Chemin Frontend:** `sos/src/emails/templates/`

| Fichier | Description | Variables |
|---------|-------------|-----------|
| `baseTemplate.ts` | Template HTML maitre avec branding SOS Expat | lang, content, cta |
| `bookingConfirmation.ts` | Confirmation de reservation | firstName, date, providerName, serviceTitle |
| `contactReply.ts` | Reponse admin a un message contact | firstName, userMessage, adminReply |
| `newsletter.ts` | Newsletter generique | greeting, content |
| `promoCode.ts` | Distribution de codes promo | firstName, code, discount, expiration |
| `reminderOnline.ts` | Rappel provider en ligne | firstName, time |

**Chemin Serveur:** `sos/serveremails/templates/`
- Copie identique des templates frontend pour le rendu cote serveur

#### B. Templates Firebase Functions (Inline)

**Chemin:** `sos/firebase/functions/src/`

| Fichier | Templates | Langues |
|---------|-----------|---------|
| `auth/passwordReset.ts` | Reset mot de passe (HTML + texte) | FR, EN |
| `sendContactReplyFunction.ts` | Reponse contact admin | FR, EN |
| `paypal/emailVerification.ts` | Code verification 6 chiffres | FR, EN, ES |
| `subscriptions/dunning-email-templates.ts` | 4 templates dunning | FR, EN uniquement |
| `seeds/paypalWelcomeTemplates.ts` | Welcome PayPal onboarding | 9 langues |
| `utils/generateInvoice.ts` | Generation facture HTML/PDF | FR |
| `securityAlerts/notifier.ts` | Alertes securite | 9 langues |
| `monitoring/criticalAlerts.ts` | Alertes systeme critiques | FR, EN |

#### C. Templates JSON (Assets)

**Chemin:** `sos/firebase/functions/src/assets/`

| Fichier | Contenu |
|---------|---------|
| `sos-expat-message-templates-fr.json` | ~35+ templates FR |
| `sos-expat-message-templates-en.json` | ~35+ templates EN |
| `sos-expat-message-templates-es.json` | Templates ES |
| `sos-expat-message-templates-pt.json` | Templates PT |
| `sos-expat-message-templates-de.json` | ~8 templates DE |
| `sos-expat-message-templates-ru.json` | Templates RU |
| `sos-expat-message-templates-ar.json` | Templates AR |
| `sos-expat-message-templates-hi.json` | Templates HI |
| `sos-expat-message-templates-ch.json` | Templates CH |

### 2.2 Structure d'un Template

```typescript
// Structure complete d'un template multi-canal
interface MessageTemplate {
  _meta?: {
    updatedAt?: string;
    updatedBy?: string;
  };

  email?: {
    enabled: boolean;
    subject: string;        // "Nouvelle reservation de {{client.firstName}}"
    html?: string;          // HTML complet avec variables
    text?: string;          // Version texte brut
  };

  sms?: {
    enabled: boolean;
    text: string;           // "SOS Expat: {{message}}"
  };

  push?: {
    enabled: boolean;
    title: string;          // "Nouvelle reservation"
    body: string;           // "{{client.firstName}} vous attend"
    deeplink?: string;      // "/provider/calls"
  };

  inapp?: {
    enabled: boolean;
    title: string;
    body: string;
  };

  whatsapp?: {
    enabled: boolean;
    templateName: string;
    params?: string[];
  };
}
```

### 2.3 Variables de Template Supportees

**Syntaxe de base:**
```
{{variableName}}              → Remplacement simple
{{money amount currency}}     → Formatage monetaire localise
{{date dateField}}            → Formatage date localise
```

**Variables communes:**
- `{{firstName}}` - Prenom utilisateur
- `{{lastName}}` - Nom utilisateur
- `{{email}}` - Email utilisateur
- `{{providerName}}` - Nom du provider
- `{{client.firstName}}` - Prenom client
- `{{amount}}` - Montant
- `{{currency}}` - Devise
- `{{dashboardUrl}}` - URL dashboard
- `{{supportUrl}}` - URL support

### 2.4 Templates Specifiques par Fonctionnalite

#### Templates Abonnement (Subscription)

| Template ID | Description | Canaux |
|-------------|-------------|--------|
| `subscription.welcome` | Bienvenue nouvel abonnement | Email |
| `subscription.renewed` | Renouvellement confirme | Email |
| `subscription.quota_80` | Alerte 80% quota | Email, Push |
| `subscription.quota_exhausted` | Quota 100% atteint | Email, Push |
| `subscription.payment_failed` | Echec paiement | Email |
| `subscription.payment_failed_final` | Dernier essai paiement | Email |
| `subscription.canceled` | Annulation confirmee | Email |
| `subscription.trial_ending` | Fin essai dans 3 jours | Email |
| `subscription.expired` | Abonnement expire | Email |
| `subscription.upgraded` | Plan ameliore | Email |
| `subscription.downgrade_scheduled` | Downgrade programme | Email |
| `subscription.reactivated` | Reactivation confirmee | Email |
| `subscription.account_suspended` | Compte suspendu | Email |

#### Templates Dunning (Relance Paiement)

| Template | Moment | Langues Disponibles |
|----------|--------|---------------------|
| `PAYMENT_FAILED_TEMPLATE` | J+1 | FR, EN |
| `ACTION_REQUIRED_TEMPLATE` | J+3 | FR, EN |
| `FINAL_ATTEMPT_TEMPLATE` | J+5 | FR, EN |
| `ACCOUNT_SUSPENDED_TEMPLATE` | J+7 | FR, EN |

⚠️ **ATTENTION:** Les templates dunning ne sont disponibles qu'en 2 langues (FR, EN). Les 7 autres langues sont MANQUANTES.

#### Templates KYC/Onboarding

| Template ID | Description | Intervalle |
|-------------|-------------|------------|
| `kyc.reminder.first` | 1er rappel KYC | J+1 |
| `kyc.reminder.followup` | Rappels 2-3 | J+3, J+7 |
| `kyc.reminder.urgent` | Rappels urgents | J+14, J+30 |
| `paypal.reminder.*` | Rappels connexion PayPal | J+1 a J+30 |

#### Templates Alertes Securite

| Type Alerte | Canaux | Gravite |
|-------------|--------|---------|
| Brute Force | Email, Push, In-app, Slack | Critical |
| Localisation inhabituelle | Email, Push, In-app | Warning |
| Paiement suspect | Email, Push, In-app, Slack | Critical |
| Multiple echecs connexion | Email, In-app | Warning |

---

## 3. FONCTIONS D'ENVOI D'EMAILS

### 3.1 Architecture des Providers

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROVIDERS EMAIL                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   ZOHO SMTP     │  │    MAILWIZZ     │  │     BREVO       │ │
│  │  (Transactionnel)│  │   (Marketing)   │  │   (Optional)    │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │          │
│           ▼                    ▼                    ▼          │
│  • Password Reset      • Welcome Sequences   • Backup provider │
│  • Contact Reply       • Re-engagement       • Non implemente  │
│  • Verification Code   • Autoresponders                        │
│  • Notifications       • Bulk campaigns                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Zoho SMTP (Email Transactionnel)

**Configuration:**
```typescript
// sos/firebase/functions/src/notificationPipeline/providers/email/zohoSmtp.ts
const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.eu',
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,    // Secret Firebase
    pass: EMAIL_PASS     // Secret Firebase
  }
});
```

**Fonctions utilisant Zoho:**

| Fonction | Fichier | Description |
|----------|---------|-------------|
| `sendZoho()` | `zohoSmtp.ts` | Envoi generique |
| `sendVerificationEmail()` | `paypal/emailVerification.ts` | Code 6 chiffres |
| `sendPasswordResetEmail()` | `auth/passwordReset.ts` | Reset mot de passe |
| `sendContactReplyHandler()` | `serveremails/sendContactReply.ts` | Reponse contact |

### 3.3 MailWizz (Email Marketing)

**Configuration:**
```typescript
// sos/firebase/functions/src/emailMarketing/config.ts
const MAILWIZZ_CONFIG = {
  API_URL: 'https://app.mail-ulixai.com/api/index.php',
  LIST_UID: 'yl089ehqpgb96',
  CUSTOMER_ID: '2'
};
```

**Classe MailwizzAPI:**

| Methode | Description |
|---------|-------------|
| `createSubscriber(data)` | Ajoute un abonne a la liste |
| `sendTransactional(config)` | Envoi avec template MailWizz |
| `sendOneTimeEmail(config)` | Envoi ponctuel |
| `updateSubscriber(userId, updates)` | MAJ donnees abonne |
| `unsubscribeSubscriber(userId)` | Desabonnement |
| `deleteSubscriber(userId)` | Suppression complete |
| `stopAutoresponders(userId, reason)` | Arret sequences auto |

**Autoresponders MailWizz (99 sequences):**

| Type | Description | Declencheur |
|------|-------------|-------------|
| `nurture-profile` | Guide completion profil | Apres inscription |
| `nurture-no-calls` | Encourage optimisation profil | 14j sans reservation |
| `nurture-login-clients` | Encourage 1ere connexion client | Inscription sans login |
| `nurture-login-providers` | Encourage 1ere connexion provider | Inscription sans login |
| `nurture-kyc` | Complete verification identite | KYC non valide |
| `nurture-offline` | Reactive disponibilite | Provider offline |
| `nurture-paypal` | Configure compte PayPal | PayPal non configure |
| `nurture-action` | Action requise | Action en attente |
| `reactivation-clients` | Reactivation client | 30j+ inactif |
| `reactivation-providers` | Reactivation provider | 30j+ inactif |
| `request-review` | Demande avis | Appel termine |

**Total: 11 types × 9 langues = 99 autoresponders**

### 3.4 Cloud Functions Email

#### Liste Complete des Fonctions

**Triggers Firestore:**

| Fonction | Collection | Evenement | Action |
|----------|------------|-----------|--------|
| `handleUserRegistration` | `users/{userId}` | onCreate | Welcome email |
| `handleProfileCompleted` | `users/{userId}` | onUpdate | Email completion |
| `handleUserLogin` | `users/{userId}` | onUpdate | Email 1er login |
| `handleCallCompleted` | `calls/{callId}` | onUpdate (status=completed) | Emails client+provider |

**Fonctions Callables:**

| Fonction | Description | Auth |
|----------|-------------|------|
| `sendPasswordResetEmail` | Reset mot de passe | Utilisateur connecte |
| `sendPayPalVerificationCode` | Code verification PayPal | Utilisateur connecte |
| `verifyPayPalCode` | Verification du code | Utilisateur connecte |
| `resendPayPalVerificationCode` | Renvoi du code | Utilisateur connecte |
| `sendContactReply` | Reponse admin contact | Admin only |
| `enqueueMessageEvent` | Ajoute message a la queue | Admin only |

**Fonctions Schedulees:**

| Fonction | Frequence | Action |
|----------|-----------|--------|
| `detectInactiveUsers` | Quotidien minuit | Emails re-engagement |
| `scheduledKYCReminders` | Quotidien 10:00 UTC | Rappels KYC |
| `scheduledPayPalReminders` | Quotidien | Rappels PayPal |
| `checkBudgetAlertsScheduled` | Toutes les 6h | Alertes budget |
| `sendQuotaAlerts` | Quotidien 10:00 UTC | Alertes quota |
| `notificationRetry` | Horaire | Retry echecs |

---

## 4. SYSTEME DE NOTIFICATIONS

### 4.1 Architecture Multi-Canal

```
┌─────────────────────────────────────────────────────────────────┐
│                 NOTIFICATION CHANNELS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │   EMAIL   │  │   PUSH    │  │    SMS    │  │  IN-APP   │   │
│  │   Zoho    │  │    FCM    │  │  Twilio   │  │ Firestore │   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘   │
│        │              │              │              │          │
│        │              │              │              │          │
│  Toutes les     Permissions    LIMITE a 2      Stockage       │
│  notifications  navigateur     events:         Firestore      │
│                 requises       - booking_paid  inapp_notif    │
│                               - call.cancelled               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Push Notifications (FCM)

**Hook Client:** `sos/src/hooks/useFCM.ts`

```typescript
// Fonctionnement:
// 1. Demande permission au navigateur
// 2. Obtient le token FCM
// 3. Stocke le token dans Firestore
// 4. Ecoute les messages entrants

// Collection: fcm_tokens/{userId}
{
  uid: string,
  token: string,
  updatedAt: Timestamp,
  role: string  // 'client' | 'provider'
}
```

**Service Worker:** `sos/public/firebase-messaging-sw.js`
- Gere les messages en arriere-plan
- Affiche les notifications systeme
- Gere les clics sur notifications
- Navigation vers l'URL specifiee

### 4.3 SMS (Twilio)

**Fichier:** `sos/firebase/functions/src/notificationPipeline/providers/sms/twilioSms.ts`

⚠️ **RESTRICTION IMPORTANTE:** SMS active UNIQUEMENT pour:
1. `booking_paid_provider` ✅
2. `call.cancelled.client_no_answer` ✅
3. **Tous les autres events sont BLOQUES** (controle des couts)

**Strategie Expediteur:**
- **Alphanumerique** (`SOS-Expat`): Pour pays internationaux
- **Numero de telephone** (+44 UK): Pour USA, Canada, Chine

**Rate Limiting:**
- 10 SMS par numero par heure
- 100 SMS global par heure
- Applique via transaction Firestore

### 4.4 In-App Notifications

**Collection:** `inapp_notifications`

```typescript
{
  uid: string,
  eventId?: string,
  title: string,
  body: string,
  action?: string,
  data?: Record<string, any>,
  createdAt: Timestamp,
  readAt?: Timestamp,
  read: boolean
}
```

**Affichage Client:**
- Centre de notifications dans l'app
- Notifications toast
- Panneau AI Assistant

### 4.5 Preferences Utilisateur

**Stockage Client (localStorage):**
```typescript
interface NotificationPreferences {
  enableSound: boolean;    // Alerte sonore
  enableVoice: boolean;    // Message vocal
  enableModal: boolean;    // Popup modal
}
```

**Stockage Serveur (Document utilisateur):**
```typescript
{
  notificationPreferences?: {
    email?: boolean,
    subscriptionEmails?: boolean
  },
  language?: string,
  preferredLanguage?: string
}
```

---

## 5. PIPELINE DE NOTIFICATION

### 5.1 Flux de Traitement

```
1. CREATION EVENEMENT
   └─► Document cree dans message_events

2. WORKER TRIGGERED
   └─► onDocumentCreated('message_events/{id}')

3. RESOLUTION LANGUE
   └─► evt.locale → context.user.preferredLanguage → 'en'

4. CHARGEMENT TEMPLATE
   └─► message_templates/{locale}/items/{eventId}
   └─► Fallback vers 'en' si non trouve

5. CONFIGURATION ROUTAGE
   └─► message_routing/config
   └─► Determine strategie: 'parallel' ou 'fallback'

6. VERIFICATION RATE LIMIT
   └─► Cooldown par user/event
   └─► Skip si deja envoye dans la periode

7. SELECTION CANAUX
   └─► Filtre par: enabled, template available, contact info

8. ENVOI MULTI-CANAL
   └─► Parallel: Tous en meme temps
   └─► Fallback: Un par un jusqu'au succes

9. LOGGING DELIVERY
   └─► Document dans message_deliveries
   └─► Status: sent | failed
```

### 5.2 Configuration du Routage

**Collection:** `message_routing/config`

```typescript
{
  routing: {
    [eventId: string]: {
      strategy: 'parallel' | 'fallback',
      order?: Channel[],  // Pour strategie fallback
      channels: {
        email: {
          enabled: boolean,
          provider: 'zoho',
          rateLimitH: number,    // Limite par heure
          retries: number,
          delaySec: number
        },
        push: {
          enabled: boolean,
          provider: 'fcm',
          rateLimitH: number,
          retries: number,
          delaySec: number
        },
        sms: {
          enabled: boolean,
          provider: 'twilio',
          rateLimitH: number,
          retries: number,
          delaySec: number
        },
        inapp: {
          enabled: boolean,
          provider: 'firestore',
          rateLimitH: number,
          retries: number,
          delaySec: number
        }
      }
    }
  }
}
```

### 5.3 Retry et Dead Letter Queue

**Fonction:** `notificationRetry` (schedulee horaire)

```typescript
// Recupere les echecs de message_deliveries
// Retry avec backoff exponentiel
// Max retries: configurable par event
// DLQ: notification_dlq pour echecs permanents
```

**Statistiques DLQ:**
- `getDLQStats()` - Stats globales
- `adminForceRetryDLQEvent()` - Retry manuel
- `cleanupWebhookDLQ()` - Nettoyage ancien DLQ

### 5.4 Rendering des Templates

**Fichier:** `sos/firebase/functions/src/notificationPipeline/render.ts`

**Syntaxe supportee:**
```
{{variable}}                    → Remplacement simple
{{money amountField currency}}  → Format monetaire localise
{{date dateField}}              → Format date localise (fr-FR ou en-US)
{{nested.object.value}}         → Acces proprietes imbriquees
```

---

## 6. WORKFLOWS ET TRIGGERS

### 6.1 Emails Cycle de Vie Utilisateur

| Etape | Trigger | Template | Canaux |
|-------|---------|----------|--------|
| Inscription | `users/{userId}` onCreate | `TR_CLI_welcome_{lang}` / `TR_PRO_welcome_{lang}` | Email |
| Profil complete | `users/{userId}` onUpdate | `TR_*_profile-completed_{lang}` | Email |
| 1ere connexion | `users/{userId}` onUpdate | Transactionnel | Email |
| Inactivite 30j+ | Schedule quotidien | `TR_*_re-engagement_{lang}` | Email |

### 6.2 Emails Transactions

| Evenement | Trigger | Template | Recipients |
|-----------|---------|----------|------------|
| Appel complete | `calls/{callId}` onUpdate | `TR_*_call-completed_{lang}` | Client + Provider |
| Facture creee | `invoice_records/{id}` onCreate | Invoice template | Client |
| Paiement reussi | Stripe webhook | Payment success | Client |
| Paiement echoue | Stripe webhook | Dunning templates | Client |

### 6.3 Emails Abonnement

| Evenement | Trigger | Template |
|-----------|---------|----------|
| Nouvel abonnement | Stripe webhook | `subscription.welcome` |
| Renouvellement | Stripe webhook | `subscription.renewed` |
| Quota 80% | Schedule quotidien | `subscription.quota_80` |
| Quota 100% | Schedule quotidien | `subscription.quota_exhausted` |
| Essai termine | Schedule quotidien | `subscription.trial_ending` |
| Annulation | User action | `subscription.canceled` |
| Expiration | Schedule quotidien | `subscription.expired` |
| Suspension | Dunning J+7 | `subscription.account_suspended` |

### 6.4 Workflow Dunning (Relance Paiement)

```
Jour 0: Paiement echoue
    │
    ├─► J+1: PAYMENT_FAILED_TEMPLATE + Retry automatique
    │
    ├─► J+3: ACTION_REQUIRED_TEMPLATE + Retry automatique
    │
    ├─► J+5: FINAL_ATTEMPT_TEMPLATE + Retry automatique
    │
    └─► J+7: ACCOUNT_SUSPENDED_TEMPLATE + Suspension compte
```

### 6.5 Rappels KYC

```
Inscription Provider
    │
    ├─► J+1:  kyc.reminder.first (1er rappel)
    │
    ├─► J+3:  kyc.reminder.followup (2e rappel)
    │
    ├─► J+7:  kyc.reminder.followup (3e rappel)
    │
    ├─► J+14: kyc.reminder.urgent (4e rappel)
    │
    └─► J+30: kyc.reminder.urgent (dernier rappel)
```

### 6.6 Rappels PayPal

```
Provider dans pays PayPal-only sans compte connecte
    │
    ├─► J+1:   Rappel PayPal (24h)
    │
    ├─► J+3:   Rappel PayPal (72h)
    │
    ├─► J+7:   Rappel PayPal (168h)
    │
    ├─► J+14:  Rappel PayPal (336h)
    │
    └─► J+30:  Rappel PayPal (720h) - FINAL
```

### 6.7 Alertes Securite

| Alerte | Gravite | Canaux |
|--------|---------|--------|
| Brute force | Critical | Email, Push, In-app, Slack |
| Localisation inhabituelle | Warning | Email, Push, In-app |
| Paiement suspect | Critical | Email, Push, In-app, Slack |
| Echecs multiples connexion | Warning | Email, In-app |

---

## 7. SYSTEME D'INTERNATIONALISATION (i18n)

### 7.1 Langues Supportees

```typescript
// sos/src/i18n/index.ts (ligne 9-11)
// sos/firebase/functions/src/notificationPipeline/i18n.ts (ligne 2)

const SUPPORTED_LANGUAGES = ['fr', 'en', 'de', 'es', 'pt', 'ru', 'ar', 'hi', 'ch'];
```

| Code | Langue | Fichier Templates | Statut |
|------|--------|-------------------|--------|
| `fr` | Francais | `sos-expat-message-templates-fr.json` | ✅ Complet (~35 templates) |
| `en` | Anglais | `sos-expat-message-templates-en.json` | ✅ Complet (~35 templates) |
| `es` | Espagnol | `sos-expat-message-templates-es.json` | ✅ Complet |
| `pt` | Portugais | `sos-expat-message-templates-pt.json` | ✅ Complet |
| `de` | Allemand | `sos-expat-message-templates-de.json` | ⚠️ Partiel (~8 templates) |
| `ru` | Russe | `sos-expat-message-templates-ru.json` | ✅ Complet |
| `ar` | Arabe | `sos-expat-message-templates-ar.json` | ✅ Complet |
| `hi` | Hindi | `sos-expat-message-templates-hi.json` | ✅ Complet |
| `ch` | Chinois | `sos-expat-message-templates-ch.json` | ✅ Complet |

### 7.2 Resolution de la Langue

**Frontend (SOS Platform):**
```typescript
// Priorite:
1. Parametre URL: ?lang=fr|en|de|es|pt|ru|ar|hi|ch
2. LocalStorage: app:lang
3. Navigator language (navigateur)
4. Fallback: Francais (fr)
```

**Backend (Notification Pipeline):**
```typescript
// sos/firebase/functions/src/notificationPipeline/i18n.ts

function resolveLang(evt: MessageEvent): string {
  // Priorite:
  1. evt.locale                              // Explicite dans l'event
  2. evt.context.user.preferredLanguage      // Preference utilisateur
  3. Normalisation avec matching prefix       // fr-CA → fr
  4. Fallback: 'en'                          // Anglais par defaut
}
```

**Emails Abonnement (Limite):**
```typescript
// sos/firebase/functions/src/subscription/emailNotifications.ts

type Lang = 'fr-FR' | 'en';  // SEULEMENT 2 langues!

// Priorite:
1. provider.language
2. provider.preferredLanguage
3. provider.lang
4. Fallback: 'en'
```

### 7.3 Normalisation des Codes Langue

| Variante | Normalise vers |
|----------|----------------|
| `fr`, `fr-FR`, `fr-CA`, `fr-BE`, `fr-CH` | `fr` |
| `en`, `en-US`, `en-GB`, `en-AU` | `en` |
| `de`, `de-DE`, `de-AT`, `de-CH` | `de` |
| `es`, `es-ES`, `es-MX`, `es-AR` | `es` |
| `pt`, `pt-PT`, `pt-BR` | `pt` |
| `ru`, `ru-RU` | `ru` |
| `ar`, `ar-SA`, `ar-AE`, `ar-EG` | `ar` |
| `hi`, `hi-IN` | `hi` |
| `ch`, `zh`, `zh-CN`, `zh-TW`, `zh-HK` | `ch` |

### 7.4 Couverture des Traductions (Mise a jour 25/01/2026)

| Composant | FR | EN | ES | PT | DE | RU | AR | HI | CH |
|-----------|----|----|----|----|----|----|----|----|-----|
| UI Frontend | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Templates Generaux | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| Templates Dunning | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Password Reset | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PayPal Verification | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alertes Securite | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SMS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 7.5 CORRECTIONS APPORTEES (25 janvier 2026)

#### ✅ Templates Dunning - CORRIGE (9 langues completes)

**Fichier:** `sos/firebase/functions/src/subscriptions/dunning-email-templates.ts`

Les 4 templates suivants sont maintenant disponibles dans les 9 langues:
- `PAYMENT_FAILED_TEMPLATE` ✅
- `ACTION_REQUIRED_TEMPLATE` ✅
- `FINAL_ATTEMPT_TEMPLATE` ✅
- `ACCOUNT_SUSPENDED_TEMPLATE` ✅

**Langues ajoutees:** ES, PT, DE, RU, AR, HI, CH

#### ✅ Password Reset - CORRIGE (9 langues completes)

**Fichier:** `sos/firebase/functions/src/auth/passwordReset.ts`

Templates HTML complets avec branding SOS Expat pour les 9 langues:
- FR, EN (existants)
- ES, PT, DE, RU, AR, HI, CH (nouveaux)

Support RTL pour l'arabe inclus.

#### ✅ Verification Email PayPal - CORRIGE (9 langues completes)

**Fichier:** `sos/firebase/functions/src/paypal/emailVerification.ts`

Templates de verification du code 6 chiffres dans les 9 langues:
- FR, EN, ES (existants)
- PT, DE, RU, AR, HI, CH (nouveaux)

#### ⚠️ Templates Allemand (DE) - Couverture partielle (a completer)

Les templates JSON dans `assets/sos-expat-message-templates-de.json` n'ont que ~8 templates sur ~35.
A completer manuellement dans les fichiers JSON.

#### ⚠️ Incoherence Fallback (a harmoniser)

- Frontend: Fallback vers `fr` (Francais)
- Backend: Fallback vers `en` (Anglais)

Recommandation: Harmoniser vers `en` (standard international).

---

## 8. COLLECTIONS FIRESTORE

### 8.1 Collections Principales

#### message_events (Queue Messages)

```typescript
// Collection: message_events/{id}
{
  eventId: string,           // 'subscription.welcome'
  templateId?: string,
  locale?: string,           // 'fr', 'en', etc.
  to?: {
    email?: string,
    phone?: string,
    pushToken?: string,
    fcmToken?: string,
    uid?: string
  },
  context?: {
    user?: {
      uid?: string,
      email?: string,
      phoneNumber?: string,
      fcmTokens?: string[],
      preferredLanguage?: string
    },
    [key: string]: unknown
  },
  vars?: Record<string, any>,
  channels?: Channel[],
  dedupeKey?: string,
  priority?: 'high' | 'normal',
  source?: string,
  createdAt: Timestamp
}
```

#### message_deliveries (Logs Livraison)

```typescript
// Collection: message_deliveries/{docId}
// Index: userId, eventId, createdAt, status
{
  eventId: string,
  uid: string | null,
  channel: 'email' | 'push' | 'inapp' | 'sms',
  provider: 'zoho' | 'fcm' | 'twilio' | 'firestore',
  to: string | null,
  status: 'sent' | 'failed' | 'queued' | 'delivered',
  providerMessageId?: string,
  error?: string,
  sentAt?: Timestamp,
  failedAt?: Timestamp,
  updatedAt: Timestamp
}
```

#### message_templates (Templates)

```typescript
// Collection: message_templates/{locale}/items/{eventId}
// OU: message_templates/{eventId} (legacy)
{
  _meta?: {
    updatedAt?: string,
    updatedBy?: string
  },
  email?: {
    enabled: boolean,
    subject: string,
    html?: string,
    text?: string
  },
  sms?: {
    enabled: boolean,
    text: string
  },
  push?: {
    enabled: boolean,
    title: string,
    body: string,
    deeplink?: string
  },
  inapp?: {
    enabled: boolean,
    title: string,
    body: string
  }
}
```

#### message_routing (Configuration Routage)

```typescript
// Document: message_routing/config
{
  routing: {
    [eventId: string]: {
      strategy: 'parallel' | 'fallback',
      order?: Channel[],
      channels: {
        email: ChannelConfig,
        push: ChannelConfig,
        sms: ChannelConfig,
        inapp: ChannelConfig
      }
    }
  }
}

type ChannelConfig = {
  enabled: boolean,
  provider: string,
  rateLimitH: number,
  retries: number,
  delaySec: number
}
```

### 8.2 Collections Auxiliaires

| Collection | Usage |
|------------|-------|
| `email_logs` | Historique emails envoyes |
| `notification_logs` | Logs activite notifications |
| `notification_dlq` | Dead Letter Queue |
| `fcm_tokens` | Tokens FCM par utilisateur |
| `inapp_notifications` | Notifications in-app |
| `admin_notifications` | Alertes pour admins |
| `admin_alerts` | Alertes systeme |
| `alert_cooldowns` | Cooldown alertes (anti-spam) |

### 8.3 Collections Utilisateur

| Collection | Champs Notification |
|------------|---------------------|
| `users/{uid}` | `notificationPreferences`, `language`, `preferredLanguage` |
| `providers/{id}` | `notificationPreferences`, `language` |
| `sos_profiles/{id}` | `language`, `preferredLanguage` |

### 8.4 Collections Specifiques

| Collection | Usage |
|------------|-------|
| `paypal_reminder_queue` | Queue rappels PayPal |
| `kyc_reminders_log` | Historique rappels KYC |
| `contact_messages` | Messages contact + reponses |
| `dunning_records` | Suivi relances paiement |
| `subscription_plans` | Plans abonnement (pour emails) |
| `ai_usage` | Usage quota (alertes) |

---

## 9. CONSOLE D'ADMINISTRATION

### 9.1 Structure Navigation

```
/admin
├── /comms (Communications)
│   ├── /notifications     → Logs et tests notifications
│   ├── /templates         → Editeur templates multi-canal
│   ├── /automations       → Configuration routage
│   ├── /campaigns         → Gestion campagnes (placeholder)
│   ├── /segments          → Segments audience (placeholder)
│   ├── /deliverability    → Monitoring delivrabilite (placeholder)
│   ├── /suppression       → Listes suppression (placeholder)
│   └── /ab                → A/B Testing (placeholder)
│
├── /emails
│   ├── Campaigns          → Campagnes planifiees
│   ├── Templates          → Preview templates
│   ├── Contact Replies    → Reponses contact
│   ├── Individual         → Envoi individuel
│   ├── By Role            → Envoi par role
│   ├── Manual             → Envoi selection manuelle
│   └── Logs               → Historique envois
│
├── /marketing
│   ├── /ads-analytics     → Analytics pub
│   ├── /templates-emails  → Templates marketing
│   ├── /notifications     → Routage temps reel
│   ├── /delivrabilite     → Logs delivrabilite
│   ├── /meta-analytics    → Analytics Meta
│   └── /google-ads        → Analytics Google Ads
│
└── /settings              → Parametres globaux
```

### 9.2 Fonctionnalites Existantes

#### A. Gestion Notifications (`/admin/comms/notifications`)

**Fichier:** `sos/src/pages/admin/AdminNotifications.tsx`

| Fonctionnalite | Statut |
|----------------|--------|
| Visualisation logs (30 derniers) | ✅ Implemente |
| Statistiques (total, succes, echecs) | ✅ Implemente |
| Test envoi notification | ✅ Implemente |
| Suivi multi-canal | ✅ Implemente |
| Filtrage par type | ✅ Implemente |

#### B. Editeur Templates (`/admin/comms/templates`)

**Fichier:** `sos/src/pages/admin/AdminCommsTemplates.tsx`

| Fonctionnalite | Statut |
|----------------|--------|
| Selection locale (fr-FR, en) | ✅ Implemente |
| Edition par canal (email, sms, push) | ✅ Implemente |
| Preview template | ✅ Implemente |
| Test envoi | ✅ Implemente |
| Enable/disable canaux | ✅ Implemente |

#### C. Configuration Routage (`/admin/comms/automations`)

**Fichier:** `sos/src/pages/admin/AdminCommsAutomations.tsx`

| Fonctionnalite | Statut |
|----------------|--------|
| Configuration canaux par event | ✅ Implemente |
| Rate limiting | ✅ Implemente |
| Delai par canal | ✅ Implemente |
| Sauvegarde configuration | ✅ Implemente |

#### D. Gestion Emails (`/admin/emails`)

**Fichier:** `sos/src/pages/admin/AdminEmails.tsx`

| Fonctionnalite | Statut |
|----------------|--------|
| Preview templates (5 types) | ✅ Implemente |
| Envoi individuel | ✅ Implemente |
| Envoi par role | ✅ Implemente |
| Envoi selection | ✅ Implemente |
| Historique envois | ✅ Implemente |
| Reponse contact | ✅ Implemente |

### 9.3 Fonctionnalites Manquantes (Placeholders)

| Page | Fonctionnalite | Statut |
|------|----------------|--------|
| `/admin/comms/campaigns` | Gestion campagnes multi-canal | 🔜 UI only |
| `/admin/comms/campaign-editor` | Editeur visuel campagnes | 🔜 UI only |
| `/admin/comms/segments` | Segments audience dynamiques | 🔜 UI only |
| `/admin/comms/deliverability` | Monitoring taux livraison | 🔜 UI only |
| `/admin/comms/suppression` | Listes blocage/desabonnement | 🔜 UI only |
| `/admin/comms/ab` | A/B Testing | 🔜 UI only |

### 9.4 Parametres Notifications (`/admin/settings`)

**Fichier:** `sos/src/pages/admin/AdminSettings.tsx`

```typescript
// Configuration disponible:
{
  notifications: {
    emailEnabled: boolean,      // Activer emails
    smsEnabled: boolean,        // Activer SMS
    whatsappEnabled: boolean,   // Activer WhatsApp
    pushEnabled: boolean        // Activer Push
  },
  twilio: {
    maxCallAttempts: number,    // Max tentatives appel
    callTimeout: number         // Timeout en secondes
  }
}
```

---

## 10. CONFIGURATION ET SECRETS

### 10.1 Variables d'Environnement

**Fichier:** `sos/firebase/functions/.env`

```bash
# Stripe
STRIPE_MODE=live
FUNCTIONS_REGION=europe-west1
FUNCTIONS_URL=https://europe-west1-sos-urgently-ac307.cloudfunctions.net

# Twilio
TWILIO_CALL_WEBHOOK_URL=https://twiliocallwebhook-xxx.europe-west1.run.app
TWILIO_CONFERENCE_WEBHOOK_URL=https://twilioconferencewebhook-xxx.europe-west1.run.app

# MailWizz
MAILWIZZ_API_URL=https://app.mail-ulixai.com/api/index.php
MAILWIZZ_LIST_UID=yl089ehqpgb96
MAILWIZZ_CUSTOMER_ID=2

# GDPR
RECORDING_RETENTION_DAYS=90
FRONTEND_URL=https://www.sosexpats.com
```

### 10.2 Firebase Secrets

**Commande:** `firebase functions:secrets:set <SECRET_NAME>`

| Secret | Usage |
|--------|-------|
| `EMAIL_USER` | Compte Zoho SMTP |
| `EMAIL_PASS` | Mot de passe Zoho |
| `MAILWIZZ_API_KEY` | Cle API MailWizz |
| `MAILWIZZ_WEBHOOK_SECRET` | Secret webhook MailWizz |
| `TWILIO_ACCOUNT_SID` | SID compte Twilio |
| `TWILIO_AUTH_TOKEN` | Token auth Twilio |
| `TWILIO_PHONE_NUMBER` | Numero Twilio |
| `STRIPE_SECRET_KEY_LIVE` | Cle Stripe Live |
| `STRIPE_WEBHOOK_SECRET_LIVE` | Secret webhook Stripe |
| `ENCRYPTION_KEY` | Cle chiffrement telephones |

### 10.3 Configuration Zoho SMTP

```typescript
// sos/firebase/functions/src/notificationPipeline/providers/email/zohoSmtp.ts

const config = {
  host: 'smtp.zoho.eu',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};
```

### 10.4 Configuration MailWizz

```typescript
// sos/firebase/functions/src/emailMarketing/config.ts

const MAILWIZZ_CONFIG = {
  API_URL: process.env.MAILWIZZ_API_URL,
  LIST_UID: process.env.MAILWIZZ_LIST_UID,
  CUSTOMER_ID: process.env.MAILWIZZ_CUSTOMER_ID,
  API_KEY: process.env.MAILWIZZ_API_KEY  // Header: X-MW-PUBLIC-KEY
};
```

---

## 11. FOURNISSEURS DE SERVICES

### 11.1 Tableau Comparatif

| Service | Provider | Usage | Region |
|---------|----------|-------|--------|
| Email Transactionnel | Zoho SMTP | Reset password, verifications, notifications | EU (smtp.zoho.eu) |
| Email Marketing | MailWizz | Autoresponders, campagnes, sequences | EU (mail-ulixai.com) |
| SMS | Twilio | Notifications critiques (2 events) | Global |
| Push | Firebase Cloud Messaging | Notifications temps reel | Global |
| Voice | Twilio | Appels telephoniques | Global |

### 11.2 Limites et Quotas

| Service | Limite | Action si depasse |
|---------|--------|-------------------|
| SMS Twilio | 10/numero/heure, 100 global/heure | Bloque |
| Email rate limit | Configurable par event | Skip avec log |
| FCM | Illimite (quotas Google) | N/A |
| MailWizz | Selon abonnement | Erreur API |

### 11.3 Fallback Strategy

```
Email: Zoho SMTP (principal) → MailWizz (sequences) → [Brevo non implemente]
Push: FCM (seul provider)
SMS: Twilio (seul provider, limite a 2 events)
In-App: Firestore (seul provider)
```

---

## 12. ANNEXES

### 12.1 Liste Complete des Event IDs

#### Abonnement (Subscription)
- `subscription.welcome`
- `subscription.renewed`
- `subscription.quota_80`
- `subscription.quota_exhausted`
- `subscription.payment_failed`
- `subscription.payment_failed_final`
- `subscription.canceled`
- `subscription.trial_ending`
- `subscription.expired`
- `subscription.upgraded`
- `subscription.downgrade_scheduled`
- `subscription.reactivated`
- `subscription.account_suspended`

#### KYC
- `kyc.reminder.first`
- `kyc.reminder.followup`
- `kyc.reminder.urgent`

#### PayPal
- `paypal.reminder.1`
- `paypal.reminder.2`
- `paypal.reminder.3`
- `paypal.reminder.4`
- `paypal.reminder.5`

#### Booking/Calls
- `booking_paid_provider`
- `request.created.provider`
- `request.created.client`
- `request.approved.client`
- `call.scheduled.provider`
- `call.scheduled.client`
- `call.cancelled.client_no_answer`

#### Budget
- `budget.alert.warning`
- `budget.alert.critical`

#### Securite
- `security.brute_force`
- `security.unusual_location`
- `security.suspicious_payment`

### 12.2 Fichiers Cles du Systeme

| Fichier | Description |
|---------|-------------|
| `firebase/functions/src/notificationPipeline/worker.ts` | Worker principal notifications |
| `firebase/functions/src/notificationPipeline/templates.ts` | Chargement templates |
| `firebase/functions/src/notificationPipeline/routing.ts` | Configuration routage |
| `firebase/functions/src/notificationPipeline/render.ts` | Rendu templates |
| `firebase/functions/src/notificationPipeline/i18n.ts` | Resolution langue |
| `firebase/functions/src/notificationPipeline/providers/email/zohoSmtp.ts` | Provider Zoho |
| `firebase/functions/src/notificationPipeline/providers/push/fcm.ts` | Provider FCM |
| `firebase/functions/src/notificationPipeline/providers/sms/twilioSms.ts` | Provider Twilio |
| `firebase/functions/src/subscription/emailNotifications.ts` | Emails abonnement |
| `firebase/functions/src/subscriptions/dunning-email-templates.ts` | Templates dunning |
| `firebase/functions/src/emailMarketing/functions/*.ts` | Fonctions MailWizz |
| `src/pages/admin/AdminNotifications.tsx` | Admin notifications |
| `src/pages/admin/AdminCommsTemplates.tsx` | Admin templates |
| `src/pages/admin/AdminEmails.tsx` | Admin emails |

### 12.3 Index Firestore Requis

```
// message_deliveries
(userId, eventId, createdAt)
(status, createdAt)

// notifications
(userId, read, createdAt)
(userId, isRead, createdAt)

// admin_alerts
(read, createdAt)
(type, createdAt)

// fcm_tokens
(uid)
```

### 12.4 Diagramme de Flux Complet

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           USER ACTIONS                                    │
│  Inscription │ Booking │ Appel │ Paiement │ Abonnement │ Profil         │
└───────┬──────────┬────────┬────────┬──────────┬──────────┬───────────────┘
        │          │        │        │          │          │
        ▼          ▼        ▼        ▼          ▼          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      FIRESTORE TRIGGERS / WEBHOOKS                        │
│  onDocumentCreated │ onDocumentUpdated │ Stripe Webhook │ Schedule       │
└───────┬──────────────────┬──────────────────┬──────────────┬─────────────┘
        │                  │                  │              │
        └──────────────────┴──────────────────┴──────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        MESSAGE_EVENTS                                     │
│  { eventId, locale, to, context, vars, channels, priority }              │
└──────────────────────────────────┬───────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION WORKER                                    │
│  1. Resolve Language (i18n.ts)                                           │
│  2. Load Template (templates.ts)                                         │
│  3. Get Routing Config (routing.ts)                                      │
│  4. Check Rate Limits                                                     │
│  5. Select Available Channels                                            │
│  6. Render Variables (render.ts)                                         │
└───────┬──────────┬──────────┬──────────┬─────────────────────────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    EMAIL    │ │    PUSH     │ │     SMS     │ │   IN-APP    │
│  Zoho SMTP  │ │     FCM     │ │   Twilio    │ │  Firestore  │
│             │ │             │ │  (Limite!)  │ │             │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │               │
       └───────────────┴───────────────┴───────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    MESSAGE_DELIVERIES                                     │
│  { eventId, channel, status, provider, error, sentAt }                   │
└──────────────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │ SUCCESS  │    │  FAILED  │    │   DLQ    │
        │  Logged  │    │  Retry   │    │ Archive  │
        └──────────┘    └──────────┘    └──────────┘
```

---

## RESUME EXECUTIF

### Points Forts du Systeme
- ✅ Architecture multi-canal robuste (Email, Push, SMS, In-App)
- ✅ Support 9 langues COMPLET pour tous les templates critiques
- ✅ Pipeline de notification avec retry automatique
- ✅ Rate limiting et deduplication
- ✅ Console admin fonctionnelle pour gestion de base
- ✅ Logging complet des deliveries
- ✅ Autoresponders MailWizz (99 sequences)

### Corrections Apportees (25/01/2026)
- ✅ Templates Dunning: **9 langues completes** (etait 2)
- ✅ Password Reset: **9 langues completes** (etait 2)
- ✅ PayPal Verification: **9 langues completes** (etait 3)

### Points d'Amelioration Restants
- ⚠️ Templates Allemand JSON: couverture partielle (~8/35) dans les fichiers assets
- ⚠️ Console Admin: campagnes, A/B testing, segments non implementes
- ⚠️ Incoherence fallback langue (FR frontend vs EN backend)
- ⚠️ Pas d'editeur visuel de templates
- ⚠️ SMS limite a 2 events (controle couts)

### Metriques Systeme
- **Total Templates:** ~35 par langue
- **Total Event IDs:** ~50+
- **Total Autoresponders:** 99 (11 × 9 langues)
- **Cloud Functions Email:** 20+
- **Canaux:** 4 actifs (Email, Push, SMS, In-App)
- **Langues:** 9 supportees (couverture complete)

---

*Document genere automatiquement par analyse exhaustive du codebase SOS Expat*
*Mis a jour le 25 janvier 2026 avec corrections des traductions manquantes*
