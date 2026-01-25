# DOCUMENTATION COMPLETE DU SYSTEME D'APPELS TWILIO - SOS EXPAT

> **Document genere le:** 2026-01-25
> **Analyse par:** 50 agents IA en parallele
> **Version:** 1.0

---

## TABLE DES MATIERES

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Configuration et credentials](#3-configuration-et-credentials)
4. [Flux d'appels complet](#4-flux-dappels-complet)
5. [Cloud Functions Firebase](#5-cloud-functions-firebase)
6. [Webhooks Twilio](#6-webhooks-twilio)
7. [Generation TwiML](#7-generation-twiml)
8. [Gestion des sessions d'appels](#8-gestion-des-sessions-dappels)
9. [Systeme de conference](#9-systeme-de-conference)
10. [Gestion des statuts](#10-gestion-des-statuts)
11. [Detection AMD (Answering Machine)](#11-detection-amd-answering-machine)
12. [Notifications et sonneries](#12-notifications-et-sonneries)
13. [Gestion du paiement](#13-gestion-du-paiement)
14. [Securite](#14-securite)
15. [Monitoring et logs](#15-monitoring-et-logs)
16. [Support multilingue](#16-support-multilingue)
17. [Circuit Breaker](#17-circuit-breaker)
18. [Fichiers cles](#18-fichiers-cles)

---

## 1. VUE D'ENSEMBLE

### 1.1 Description du systeme

SOS Expat utilise **Twilio** comme service de telephonie VoIP pour connecter des clients avec des prestataires (avocats ou expatries). Le systeme permet:

- **Appels sortants automatises** vers le client et le prestataire
- **Conference telephonique** entre les deux participants
- **Facturation a la minute** avec capture de paiement conditionnel
- **Detection de repondeur (AMD)** pour eviter les faux appels
- **Notifications en temps reel** aux prestataires
- **Support multilingue** (18+ langues)

### 1.2 Participants

| Role | Description |
|------|-------------|
| **Client** | Utilisateur qui paie pour un appel avec un expert |
| **Prestataire** | Avocat ou expatrie qui repond aux appels |
| **Plateforme** | SOS Expat qui orchestre les appels via Twilio |

### 1.3 Types de services

```typescript
serviceType: 'lawyer_call' | 'expat_call'
providerType: 'lawyer' | 'expat'
```

---

## 2. ARCHITECTURE TECHNIQUE

### 2.1 Stack technologique

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  - CallCheckout.tsx (paiement + initiation)                     │
│  - useIncomingCallSound.ts (notifications prestataire)          │
│  - IncomingCallNotification.tsx (UI appel entrant)              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE FUNCTIONS                            │
│  - createAndScheduleCallFunction.ts                             │
│  - TwilioCallManager.ts                                         │
│  - callScheduler.ts                                             │
│  - executeCallTask.ts                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       TWILIO API                                 │
│  - Appels PSTN (telephonie classique)                           │
│  - TwiML pour le controle des appels                            │
│  - Conferences                                                   │
│  - AMD (Answering Machine Detection)                            │
└─────────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FIRESTORE                                   │
│  - call_sessions (etat des appels)                              │
│  - payments (paiements Stripe)                                  │
│  - processed_webhook_events (idempotence)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Flux de donnees

```
Client paie (Stripe)
    → createPaymentIntent (Firebase Function)
    → Creation call_session (Firestore)
    → Cloud Task planifie (5 min apres)
    → executeCallTask declenche
    → TwilioCallManager.initiateCallSequence()
    → Twilio appelle CLIENT d'abord
    → Client confirme (DTMF "1")
    → Twilio appelle PRESTATAIRE
    → Prestataire confirme (DTMF "1")
    → Conference active
    → Appel termine
    → Capture paiement (si >= 2 min)
    → Transfert prestataire (85%)
```

---

## 3. CONFIGURATION ET CREDENTIALS

### 3.1 Secrets Firebase

**Fichier:** `sos/firebase/functions/src/lib/secrets.ts`

```typescript
// Secrets Twilio
TWILIO_ACCOUNT_SID    // Identifiant du compte Twilio
TWILIO_AUTH_TOKEN     // Token d'authentification
TWILIO_PHONE_NUMBER   // Numero de telephone Twilio (+33...)

// Autres secrets
TASKS_AUTH_SECRET     // Authentification Cloud Tasks
ENCRYPTION_KEY        // Chiffrement des numeros
STRIPE_SECRET_KEY     // API Stripe
```

### 3.2 Configuration des appels

**Fichier:** `TwilioCallManager.ts` (lignes 166-173)

```typescript
const CALL_CONFIG = {
  MAX_RETRIES: 3,           // 3 tentatives max
  CALL_TIMEOUT: 60,         // 60 secondes timeout
  CONNECTION_WAIT_TIME: 90_000,  // 90s attente connexion
  MIN_CALL_DURATION: 120,   // 2 min minimum pour capture
  MAX_CONCURRENT_CALLS: 200,
  WEBHOOK_VALIDATION: true,
};
```

### 3.3 Region et ressources

```typescript
{
  region: 'europe-west1',
  memory: '256MiB',
  cpu: 0.25,
  maxInstances: 10,
  minInstances: 1,   // Keep warm pour eviter cold starts
  concurrency: 1,    // Eviter race conditions
}
```

---

## 4. FLUX D'APPELS COMPLET

### 4.1 Etape 1: Initiation du paiement

**Fichier:** `sos/src/pages/CallCheckout.tsx`

1. Client selectionne un prestataire et une duree
2. Validation des donnees (numeros, montant)
3. Creation `PaymentIntent` via Stripe
4. Confirmation du paiement (3D Secure si necessaire)

### 4.2 Etape 2: Creation de la session d'appel

**Fichier:** `callScheduler.ts` (fonction `createCallSession`)

```typescript
interface CreateCallParams {
  sessionId?: string;
  providerId: string;
  clientId: string;
  providerPhone: string;      // Chiffre dans Firestore
  clientPhone: string;        // Chiffre dans Firestore
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  paymentIntentId: string;
  amount: number;             // En EUROS (pas centimes)
  clientLanguages?: string[];
  providerLanguages?: string[];
}
```

### 4.3 Etape 3: Planification via Cloud Tasks

L'appel est planifie pour demarrer **5 minutes apres le paiement**:

```typescript
// Cloud Task → executeCallTask → beginOutboundCallForSession
```

### 4.4 Etape 4: Sequence d'appel

**Fichier:** `TwilioCallManager.ts` (methode `initiateCallSequence`)

```
┌────────────────────────────────────────────────────────────┐
│ 1. Appel CLIENT                                            │
│    - TTS: "Bonjour, vous allez etre mis en relation..."   │
│    - Gather DTMF: "Appuyez sur 1 pour confirmer"          │
│    - Si "1" → status = "connected"                         │
│    - Transfert vers conference                             │
└────────────────────────────────────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────────┐
│ 2. Appel PRESTATAIRE                                       │
│    - TTS: "Bonjour, vous allez etre mis en relation..."   │
│    - Gather DTMF: "Appuyez sur 1 pour confirmer"          │
│    - Si "1" → status = "connected"                         │
│    - Transfert vers conference                             │
└────────────────────────────────────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────────┐
│ 3. Conference ACTIVE                                       │
│    - Les deux participants parlent                        │
│    - Duree limitee par maxDuration                        │
│    - Fin automatique ou manuelle                          │
└────────────────────────────────────────────────────────────┘
```

### 4.5 Etape 5: Fin de l'appel et paiement

```typescript
if (billingDuration >= 120) {
  // Capture le paiement
  await stripeManager.capturePayment(paymentIntentId);
  // Transfert 85% au prestataire
  await scheduleProviderTransfer(sessionId);
} else {
  // Remboursement / annulation
  await stripeManager.cancelOrRefund(paymentIntentId);
}
```

---

## 5. CLOUD FUNCTIONS FIREBASE

### 5.1 Liste des fonctions principales

| Fonction | Fichier | Role |
|----------|---------|------|
| `createAndScheduleCallHTTPS` | `createAndScheduleCallFunction.ts` | Creation session + planification |
| `executeCallTask` | `executeCallTask.ts` | Execute l'appel via Cloud Tasks |
| `twilioCallWebhook` | `twilioWebhooks.ts` | Recoit les statuts d'appels |
| `twilioConferenceWebhook` | `TwilioConferenceWebhook.ts` | Recoit les evenements conference |
| `twilioAmdTwiml` | `twilioWebhooks.ts` | Gere la detection AMD |
| `twilioGatherResponse` | `twilioWebhooks.ts` | Gere les reponses DTMF |

### 5.2 createAndScheduleCallHTTPS

**Fichier:** `createAndScheduleCallFunction.ts`

Responsabilites:
- Valider le paiement
- Creer la session d'appel dans Firestore
- Planifier l'execution via Cloud Tasks
- Envoyer notifications SMS au prestataire

### 5.3 executeCallTask

**Fichier:** `executeCallTask.ts`

```typescript
async function runExecuteCallTask(req: Request, res: Response) {
  // 1. Authentification X-Task-Auth
  // 2. Idempotence check (call_execution_locks)
  // 3. Execution via beginOutboundCallForSession
  // 4. Log du resultat
}
```

---

## 6. WEBHOOKS TWILIO

### 6.1 twilioCallWebhook

**Fichier:** `twilioWebhooks.ts` (ligne 76)

Gere les statuts d'appel individuels:

| Statut | Action |
|--------|--------|
| `ringing` | Met a jour `participant.status = "ringing"` |
| `answered` / `in-progress` | Met status a `amd_pending` (attend AMD) |
| `completed` | Met status a `disconnected` + calcul duree |
| `failed` / `busy` / `no-answer` | Gere l'echec de connexion |

### 6.2 twilioConferenceWebhook

**Fichier:** `TwilioConferenceWebhook.ts` (ligne 50)

Gere les evenements de conference:

| Evenement | Action |
|-----------|--------|
| `conference-start` | Met `session.status = "active"` |
| `conference-end` | Calcul `billingDuration` + capture/refund |
| `participant-join` | Met `participant.status = "connected"` |
| `participant-leave` | Met `participant.status = "disconnected"` |
| `participant-mute` | Log l'evenement |
| `participant-hold` | Log l'evenement |

### 6.3 Validation des webhooks

**Fichier:** `lib/twilio.ts` (ligne 331)

```typescript
function validateTwilioWebhookSignature(req, res): boolean {
  // 1. Verifier X-Twilio-Signature header
  // 2. Verifier AccountSid match
  // 3. Verifier IP dans les ranges Twilio (monitoring mode)
}

// Ranges IP Twilio
const TWILIO_IP_RANGES = [
  '54.172.60.0/23',    // US cluster
  '34.203.250.0/23',   // EU cluster
  // ... autres ranges
];
```

### 6.4 Idempotence des webhooks

```typescript
// Chaque webhook est enregistre pour eviter le traitement double
const webhookKey = `twilio_${body.CallSid}_${body.CallStatus}`;
const webhookEventRef = db.collection("processed_webhook_events").doc(webhookKey);

// Transaction atomique
await db.runTransaction(async (transaction) => {
  const existing = await transaction.get(webhookEventRef);
  if (existing.exists) {
    isDuplicate = true;
    return;
  }
  transaction.set(webhookEventRef, { ... });
});
```

---

## 7. GENERATION TwiML

### 7.1 Structure TwiML pour appel sortant

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Message d'intro -->
  <Say language="fr-FR">
    Bonjour, vous allez etre mis en relation avec votre expert S.O.S Expat.
  </Say>

  <!-- Confirmation DTMF -->
  <Gather numDigits="1" action="/twilioGatherResponse" method="POST">
    <Say language="fr-FR">
      Appuyez sur la touche 1 pour etre mis en relation.
    </Say>
  </Gather>

  <!-- Si pas de reponse -->
  <Say language="fr-FR">
    Nous n'avons pas recu de confirmation. L'appel va etre termine.
  </Say>
</Response>
```

### 7.2 TwiML apres confirmation DTMF

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference
      participantLabel="client"
      statusCallback="/twilioConferenceWebhook"
      statusCallbackEvent="start end join leave mute hold"
      waitUrl=""
      beep="false">
      conf_session_abc123
    </Conference>
  </Dial>
</Response>
```

### 7.3 Messages vocaux multilingues

**Fichier:** `content/voicePrompts.json`

18 langues supportees:
- fr, en, pt, es, de, ru, zh, ar, hi, bn, ur, id, ja, tr, it, ko, vi, fa, pl

```json
{
  "client_intro": {
    "fr": "Bonjour, vous allez etre mis en relation avec votre expert S.O.S Expat.",
    "en": "Hello, you will be connected with your S.O.S Expat expert."
    // ...
  },
  "client_confirmation": {
    "fr": "Appuyez sur la touche 1 de votre telephone pour etre mis en relation.",
    "en": "Press 1 on your phone to be connected."
    // ...
  }
}
```

---

## 8. GESTION DES SESSIONS D'APPELS

### 8.1 Structure CallSessionState

**Fichier:** `TwilioCallManager.ts` (ligne 54)

```typescript
interface CallSessionState {
  id: string;
  clientId?: string;
  providerId?: string;
  paymentId?: string;

  status:
    | "pending"
    | "provider_connecting"
    | "client_connecting"
    | "both_connecting"
    | "active"
    | "completed"
    | "failed"
    | "cancelled";

  participants: {
    provider: ParticipantState;
    client: ParticipantState;
  };

  conference: {
    sid?: string;
    name: string;
    startedAt?: Timestamp;
    endedAt?: Timestamp;
    duration?: number;
    billingDuration?: number;
    recordingUrl?: string;
  };

  payment: {
    intentId: string;
    status: "pending" | "authorized" | "captured" | "refunded" | "cancelled" | "failed";
    amount: number;
    // ... autres champs
  };

  metadata: {
    providerId: string;
    clientId: string;
    serviceType: string;
    maxDuration: number;
    clientLanguages?: string[];
    providerLanguages?: string[];
    // ...
  };
}

interface ParticipantState {
  phone: string;                    // Chiffre
  status: "pending" | "calling" | "ringing" | "connected" | "disconnected" | "no_answer" | "amd_pending";
  callSid?: string;
  connectedAt?: Timestamp;
  disconnectedAt?: Timestamp;
  attemptCount: number;
}
```

### 8.2 Collection Firestore

```
call_sessions/
  └── {sessionId}/
      ├── id
      ├── status
      ├── participants
      │   ├── provider
      │   └── client
      ├── conference
      ├── payment
      └── metadata
```

---

## 9. SYSTEME DE CONFERENCE

### 9.1 Nom de conference unique

```typescript
const conferenceName = `conf_${sessionId}`;
// Exemple: conf_call_session_1706234567890_abc123xyz
```

### 9.2 Evenements de conference

| Evenement | Declencheur |
|-----------|-------------|
| `conference-start` | Premier participant rejoint |
| `conference-end` | Dernier participant quitte |
| `participant-join` | Un participant rejoint |
| `participant-leave` | Un participant quitte |

### 9.3 Calcul de billingDuration

**Important:** La duree de facturation est calculee comme le temps ou **LES DEUX** participants sont connectes simultanement:

```typescript
// bothConnectedAt = max(clientConnectedAt, providerConnectedAt)
// firstDisconnectedAt = min(clientDisconnectedAt, providerDisconnectedAt)
// billingDuration = firstDisconnectedAt - bothConnectedAt

if (billingDuration >= 120) {
  // Capture paiement
} else {
  // Remboursement
}
```

---

## 10. GESTION DES STATUTS

### 10.1 Cycle de vie d'un participant

```
pending → calling → ringing → amd_pending → connected → disconnected
                                  ↓
                              no_answer (si machine/pas reponse)
```

### 10.2 Cycle de vie d'une session

```
pending → provider_connecting → client_connecting → both_connecting → active → completed
                    ↓                   ↓                              ↓
                 failed              failed                         failed
                    ↓                   ↓                              ↓
                cancelled            cancelled                      cancelled
```

---

## 11. DETECTION AMD (ANSWERING MACHINE)

### 11.1 Mode AsyncAmd

Twilio utilise la detection AMD asynchrone pour identifier les repondeurs:

```typescript
const callParams = {
  machineDetection: 'DetectMessageEnd',
  asyncAmd: 'true',
  asyncAmdStatusCallback: '/twilioAmdTwiml',
};
```

### 11.2 Statuts AMD

| AnsweredBy | Action |
|------------|--------|
| `human` | Continuer vers conference |
| `machine_start` | Attendre confirmation DTMF |
| `machine_end_beep` | Raccrocher (repondeur confirme) |
| `fax` | Raccrocher |
| `unknown` | Demander confirmation DTMF |

### 11.3 Confirmation DTMF

Pour eviter les faux positifs AMD, le systeme demande **toujours** une confirmation DTMF:

```xml
<Gather numDigits="1" action="/twilioGatherResponse">
  <Say>Appuyez sur 1 pour etre mis en relation.</Say>
</Gather>
```

Si l'utilisateur appuie sur "1" → Humain confirme
Si pas de reponse apres 30s → Probablement repondeur → Raccrocher

---

## 12. NOTIFICATIONS ET SONNERIES

### 12.1 Hook useIncomingCallSound

**Fichier:** `sos/src/hooks/useIncomingCallSound.ts`

```typescript
const INCOMING_CALL_CONFIG = {
  RING_DURATION_MS: 30000,       // 30 secondes
  RING_VOLUME: 0.15,             // 15% volume (tres doux)
  RING_REPEAT_INTERVAL_MS: 5000, // Toutes les 5 secondes
};
```

### 12.2 Generation de sonnerie (Web Audio API)

Deux types de sonneries douces alternees:

**Arpege (accord Do majeur):**
```typescript
const notes = [261.63, 329.63, 392.00, 493.88]; // C4, E4, G4, B4
// Envelope ADSR douce
// Volume: 0.15
```

**Carillon (pentatonique):**
```typescript
const chimeNotes = [
  { freq: 523.25, delay: 0 },     // C5
  { freq: 659.25, delay: 0.3 },   // E5
  { freq: 783.99, delay: 0.6 },   // G5
  { freq: 523.25, delay: 1.2 },   // C5
];
```

### 12.3 Vibration mobile

```typescript
// Pattern doux: 100ms on, 300ms off, 100ms on, 500ms off, 80ms on
safeVibrate([100, 300, 100, 500, 80]);

// Conditions pour vibrer:
// 1. Utilisateur a interagi avec la page
// 2. Page au premier plan
// 3. API Vibration disponible
```

### 12.4 Detection des appels entrants

```typescript
// Ecoute Firestore en temps reel
const callsQuery = query(
  collection(db, 'call_sessions'),
  where('metadata.providerId', '==', userId),
  where('status', 'in', ['pending', 'provider_connecting'])
);
```

### 12.5 Composant IncomingCallNotification

**Fichier:** `sos/src/components/providers/IncomingCallNotification.tsx`

Interface affichee au prestataire:
- Type de service
- Chronometre depuis l'appel
- Boutons toggle son/vibration
- Boutons Repondre/Refuser

---

## 13. GESTION DU PAIEMENT

### 13.1 Flux de paiement

```
1. Client paie (PaymentIntent avec capture_method: 'manual')
2. Paiement autorise (status: 'authorized')
3. Appel execute
4. Si duree >= 2 min:
   - Capture paiement (status: 'captured')
   - Transfert 85% au prestataire
5. Si duree < 2 min:
   - Annulation/remboursement (status: 'cancelled' ou 'refunded')
```

### 13.2 Repartition des revenus

```typescript
const PLATFORM_FEE_PERCENT = 15;  // Commission SOS Expat
const PROVIDER_SHARE = 85;        // Part du prestataire

// Exemple: 50 EUR
// Plateforme: 7.50 EUR
// Prestataire: 42.50 EUR
```

### 13.3 Integration Stripe

**Fichier:** `StripeManager.ts`

```typescript
// Destination Charges pour transfert automatique
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountCents,
  currency: 'eur',
  capture_method: 'manual',
  transfer_data: {
    destination: providerStripeAccountId,
  },
  application_fee_amount: platformFeeCents,
});
```

---

## 14. SECURITE

### 14.1 Validation des webhooks Twilio

```typescript
// Multi-layer validation:
// 1. X-Twilio-Signature header present
// 2. AccountSid correspond au compte
// 3. IP dans les ranges Twilio (monitoring mode)
```

### 14.2 Chiffrement des numeros de telephone

**Fichier:** `utils/encryption.ts`

```typescript
// Numeros chiffres avant stockage Firestore (GDPR)
const encryptedPhone = encryptPhoneNumber(validProviderPhone);
// Dechiffres uniquement quand Twilio doit appeler
const decryptedPhone = decryptPhoneNumber(encryptedPhone);
```

### 14.3 Authentification Cloud Tasks

```typescript
const authHeader = req.get("X-Task-Auth");
const expectedAuth = getTasksAuthSecret();

if (authHeader !== expectedAuth) {
  res.status(401).send("Invalid X-Task-Auth header");
  return;
}
```

### 14.4 Idempotence des operations

```typescript
// Locks pour eviter executions multiples
const lockRef = db.collection('call_execution_locks').doc(callSessionId);
// Webhook events pour eviter traitement double
const webhookEventRef = db.collection("processed_webhook_events").doc(webhookKey);
```

---

## 15. MONITORING ET LOGS

### 15.1 Logs structures

```typescript
await logCallRecord({
  callId: sessionId,
  status: 'conference_started',
  retryCount: 0,
  additionalData: {
    conferenceSid: body.ConferenceSid,
    timestamp: body.Timestamp
  }
});
```

### 15.2 Production Logger

**Fichier:** `utils/productionLogger.ts`

```typescript
prodLogger.info('TWILIO_WEBHOOK_START', `Twilio call webhook received`, {
  requestId,
  method: req.method,
  timestamp: new Date().toISOString()
});
```

### 15.3 Metriques de couts

```typescript
// Stockage des couts dans call_session
{
  'costs.twilio': twilioPrice,
  'costs.twilioUnit': priceUnit,
  'costs.gcp': 0.0035,
  'costs.total': twilioPrice + 0.0035,
}
```

### 15.4 Configuration monitoring

**Fichier:** `src/config/callsConfig.ts`

```typescript
export const CALLS_CONFIG = {
  alerts: {
    stuckCallThreshold: 5 * 60 * 1000,  // 5 min
    maxLatency: 300,                     // 300ms
    maxConcurrentCalls: 30,
  },
  firestore: {
    liveCallsLimit: 50,
  },
  audioQuality: {
    poor: 1,
    fair: 2,
    good: 3,
    excellent: 4,
  },
};
```

---

## 16. SUPPORT MULTILINGUE

### 16.1 Langues supportees

| Code | Langue | Locale TTS |
|------|--------|------------|
| fr | Francais | fr-FR |
| en | English | en-US |
| pt | Portugues | pt-BR |
| es | Espanol | es-ES |
| de | Deutsch | de-DE |
| ru | Russky | ru-RU |
| zh | Zhongwen | zh-CN |
| ar | Arabic | ar-SA |
| hi | Hindi | hi-IN |
| bn | Bengali | bn-IN |
| ur | Urdu | ur-PK |
| id | Indonesian | id-ID |
| ja | Japanese | ja-JP |
| tr | Turkish | tr-TR |
| it | Italiano | it-IT |
| ko | Korean | ko-KR |
| vi | Vietnamese | vi-VN |
| fa | Persian | fa-IR |
| pl | Polski | pl-PL |

### 16.2 Normalisation des codes langues

```typescript
const LANG_CODE_ALIASES: Record<string, string> = {
  'ch': 'zh',
  'chinese': 'zh',
  'french': 'fr',
  'français': 'fr',
  'english': 'en',
  // ... etc
};

function normalizeLangList(langs?: string[]): string[] {
  // Convertit les noms de langues en codes ISO
}
```

### 16.3 Selection de la langue par participant

Chaque participant entend les messages dans **sa propre langue**:

```typescript
// Client: utilise clientLanguages
const clientLangKey = clientLangs.find(l => supportedLangs.has(l)) || "en";

// Prestataire: utilise providerLanguages
const providerLangKey = providerLangs.find(l => supportedLangs.has(l)) || "en";
```

---

## 17. CIRCUIT BREAKER

### 17.1 Configuration

**Fichier:** `lib/twilio.ts` (ligne 46)

```typescript
const CIRCUIT_BREAKER_CONFIG = {
  FAILURE_THRESHOLD: 3,      // Ouvre apres 3 echecs consecutifs
  RESET_TIMEOUT_MS: 15_000,  // Reessaye apres 15 secondes
  HALF_OPEN_MAX_CALLS: 1,    // 1 appel test en mode half-open
};
```

### 17.2 Etats du circuit

```
CLOSED → (3 echecs) → OPEN → (15s) → HALF_OPEN → (succes) → CLOSED
                                       ↓
                                   (echec)
                                       ↓
                                     OPEN
```

### 17.3 Fonctions de gestion

```typescript
isCircuitOpen(): boolean       // Verifie si appels bloques
recordTwilioSuccess(): void    // Enregistre succes → ferme circuit
recordTwilioFailure(error): void  // Enregistre echec → peut ouvrir circuit
getCircuitBreakerStatus(): CircuitBreakerState  // Status pour monitoring
resetCircuitBreaker(): void    // Reset manuel
```

---

## 18. FICHIERS CLES

### 18.1 Backend (Firebase Functions)

| Fichier | Chemin | Role |
|---------|--------|------|
| TwilioCallManager.ts | `functions/src/TwilioCallManager.ts` | Gestionnaire principal des appels |
| twilio.ts | `functions/src/lib/twilio.ts` | Client Twilio + validation |
| callScheduler.ts | `functions/src/callScheduler.ts` | Planification des appels |
| twilioWebhooks.ts | `functions/src/Webhooks/twilioWebhooks.ts` | Webhooks statuts appels |
| TwilioConferenceWebhook.ts | `functions/src/Webhooks/TwilioConferenceWebhook.ts` | Webhooks conference |
| executeCallTask.ts | `functions/src/runtime/executeCallTask.ts` | Execution via Cloud Tasks |
| voicePrompts.json | `functions/src/content/voicePrompts.json` | Messages vocaux multilingues |
| secrets.ts | `functions/src/lib/secrets.ts` | Gestion des secrets |
| encryption.ts | `functions/src/utils/encryption.ts` | Chiffrement numeros |

### 18.2 Frontend (React)

| Fichier | Chemin | Role |
|---------|--------|------|
| CallCheckout.tsx | `src/pages/CallCheckout.tsx` | Page de paiement et initiation |
| useIncomingCallSound.ts | `src/hooks/useIncomingCallSound.ts` | Hook sonneries |
| IncomingCallNotification.tsx | `src/components/providers/IncomingCallNotification.tsx` | UI notification appel |
| ProviderOnlineManager.tsx | `src/components/providers/ProviderOnlineManager.tsx` | Gestion statut prestataire |
| callsConfig.ts | `src/config/callsConfig.ts` | Configuration appels |
| AdminCalls.tsx | `src/pages/admin/AdminCalls.tsx` | Dashboard admin appels |

### 18.3 Configuration

| Fichier | Chemin | Role |
|---------|--------|------|
| firestore.rules | `sos/firestore.rules` | Regles securite Firestore |
| index.ts | `functions/src/index.ts` | Export des Cloud Functions |

---

## RESUME DES POINTS CLES

### Ce qui fonctionne bien

- Architecture robuste avec Cloud Tasks et webhooks
- Detection AMD avec confirmation DTMF
- Support multilingue complet (18 langues)
- Circuit breaker pour resilience
- Idempotence des webhooks
- Chiffrement GDPR des numeros
- Sonneries douces generees par Web Audio API
- Calcul precis de billingDuration

### Points d'attention

- **Pas de mise en attente (hold)** implementee
- **Pas de transfert d'appel** entre prestataires
- **Pas d'enregistrement d'appels** (desactive)
- **Pas de conference a plus de 2 participants**
- Circuit breaker en memoire (reset au redeploy)

### Metriques importantes

| Metrique | Valeur |
|----------|--------|
| Timeout appel | 60 secondes |
| Attente connexion | 90 secondes |
| Duree min facturation | 2 minutes |
| Max retries | 3 |
| Volume sonnerie | 15% |
| Duree sonnerie | 30 secondes |

---

> **Document genere automatiquement par analyse du code source**
> **SOS Expat - Systeme d'appels Twilio**
