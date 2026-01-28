# Workflow Complet : Du Paiement à la Fin de l'Appel Twilio

> **Document technique** - SOS Expat Project
> **Dernière mise à jour** : 2 janvier 2026
> **Version** : 1.0

---

## Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Diagramme de flux](#diagramme-de-flux)
3. [Étape 1 : Interface de paiement (Frontend)](#étape-1--interface-de-paiement-frontend)
4. [Étape 2 : Création du PaymentIntent](#étape-2--création-du-paymentintent)
5. [Étape 3 : Création de la session d'appel](#étape-3--création-de-la-session-dappel)
6. [Étape 4 : Planification via Cloud Tasks](#étape-4--planification-via-cloud-tasks)
7. [Étape 5 : Exécution de la tâche d'appel](#étape-5--exécution-de-la-tâche-dappel)
8. [Étape 6 : Gestion des appels Twilio](#étape-6--gestion-des-appels-twilio)
9. [Étape 7 : Webhooks Twilio](#étape-7--webhooks-twilio)
10. [Étape 8 : Capture du paiement](#étape-8--capture-du-paiement)
11. [Étape 9 : Génération des factures](#étape-9--génération-des-factures)
12. [Gestion des erreurs](#gestion-des-erreurs)
13. [Collections Firestore](#collections-firestore)
14. [Secrets et configuration](#secrets-et-configuration)

---

## Vue d'ensemble

Le système SOS Expat permet aux clients de réserver des consultations téléphoniques avec des avocats ou des experts expatriés. Le flux complet comprend :

1. **Paiement** : Le client paie via Stripe (paiement autorisé mais non capturé)
2. **Planification** : Un appel est planifié 4 minutes après le paiement
3. **Appel** : Twilio appelle les deux participants et les connecte en conférence
4. **Capture** : Après l'appel réussi, le paiement est capturé
5. **Facturation** : Deux factures sont générées (plateforme + prestataire)

### Pourquoi `capture_method: manual` ?

Le paiement utilise la capture manuelle pour :
- **Sécurité** : Ne capturer que si l'appel a lieu
- **Remboursement facile** : Annuler sans frais si l'appel échoue
- **Conformité** : Le client n'est débité que pour un service rendu

---

## Diagramme de flux

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUX PAIEMENT → APPEL                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   FRONTEND   │     │  CLOUD FUNCTION  │     │    CLOUD TASKS      │
│              │     │                  │     │                     │
│ CallCheckout │────▶│createPaymentIntent│    │                     │
│     .tsx     │     │       .ts        │     │                     │
│              │◀────│                  │     │                     │
│              │     │ {clientSecret}   │     │                     │
│              │     └──────────────────┘     │                     │
│              │                              │                     │
│   Stripe     │     ┌──────────────────┐     │                     │
│   Payment    │────▶│createAndSchedule │     │                     │
│              │     │   CallHTTPS.ts   │────▶│ scheduleCallTask()  │
│              │     │                  │     │   (+240 secondes)   │
│              │     │ Crée session     │     │                     │
└──────────────┘     └──────────────────┘     └─────────┬───────────┘
                                                        │
                                                        │ 4 minutes
                                                        ▼
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│    TWILIO    │     │  CLOUD FUNCTION  │     │  CLOUD FUNCTION     │
│              │     │                  │     │                     │
│   Appelle    │◀────│ TwilioCallManager│◀────│ executeCallTask.ts  │
│  Provider    │     │       .ts        │     │                     │
│              │     │                  │     │ Vérifie session     │
│   Appelle    │◀────│ Crée conférence  │     │ Lance appel         │
│   Client     │     │                  │     │                     │
│              │     └──────────────────┘     └─────────────────────┘
│   CONFÉRENCE │
│   ACTIVE     │
└──────┬───────┘
       │
       │ Webhooks (ringing, answered, completed)
       ▼
┌──────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ twilioWebhooks   │     │  StripeManager   │     │ invoiceGenerator│
│      .ts         │────▶│      .ts         │────▶│      .ts        │
│                  │     │                  │     │                 │
│ handleCompleted()│     │ capturePayment() │     │ Génère PDFs     │
│                  │     │                  │     │ Stocke factures │
└──────────────────┘     └──────────────────┘     └─────────────────┘

                         ┌──────────────────┐
                         │   FIN DU FLUX    │
                         │                  │
                         │ ✅ Paiement capturé │
                         │ ✅ Factures créées  │
                         │ ✅ Session fermée   │
                         └──────────────────┘
```

---

## Étape 1 : Interface de paiement (Frontend)

### Fichiers
- `sos/src/pages/CallCheckout.tsx`
- `sos/src/pages/BookingRequest.tsx`

### Déclencheur
L'utilisateur clique sur "Réserver" après avoir sélectionné un prestataire.

### Processus

1. **Collecte des informations**
   ```typescript
   const paymentData = {
     providerId: "DfDbWASB...",
     clientId: "3sKwEFPe...",
     providerPhone: "+33612345678",
     clientPhone: "+33698765432",
     serviceType: "lawyer_call",  // ou "expat_call"
     providerType: "lawyer",      // ou "expat"
     amount: 49,                  // en euros
     currency: "eur"
   };
   ```

2. **Appel à `createPaymentIntent`**
   ```typescript
   const createPI = httpsCallable(functions, "createPaymentIntent");
   const result = await createPI(paymentData);
   // result.data.clientSecret = "pi_xxx_secret_xxx"
   ```

3. **Affichage du formulaire Stripe**
   - Utilise `@stripe/react-stripe-js`
   - Formulaire de carte bancaire sécurisé

4. **Confirmation du paiement**
   ```typescript
   const { error, paymentIntent } = await stripe.confirmCardPayment(
     clientSecret,
     { payment_method: { card: cardElement } }
   );
   ```

5. **Création de la session d'appel**
   ```typescript
   const createCall = httpsCallable(functions, "createAndScheduleCall");
   const callResult = await createCall({
     ...paymentData,
     paymentIntentId: paymentIntent.id
   });
   ```

6. **Redirection vers la page de succès**
   ```typescript
   navigate(`/paiement-reussi?callId=${callResult.data.sessionId}`);
   ```

### Sortie
- PaymentIntent créé en statut `requires_capture`
- Session d'appel créée
- Cloud Task planifiée

---

## Étape 2 : Création du PaymentIntent

### Fichier
`sos/firebase/functions/src/createPaymentIntent.ts`

### Fonction
`createPaymentIntent` (Firebase Callable Function)

### Configuration
```typescript
{
  region: "europe-west1",
  memory: "256MiB",
  timeoutSeconds: 60,
  secrets: [STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE]
}
```

### Processus détaillé

```typescript
// 1. Authentification
if (!request.auth) throw new HttpsError('unauthenticated');

// 2. Validation des entrées
const { amount, currency, serviceType, providerId, clientId } = request.data;
if (!amount || amount < 0.50) throw new HttpsError('invalid-argument');
if (amount > 500) throw new HttpsError('invalid-argument');

// 3. Rate limiting (6 requêtes / 10 min / utilisateur)
const recentPayments = await checkRateLimit(userId);
if (recentPayments >= 6) throw new HttpsError('resource-exhausted');

// 4. Vérification du prestataire
const provider = await getProvider(providerId);
if (provider.status === 'suspended') throw new HttpsError('failed-precondition');
if (!provider.isOnline) throw new HttpsError('failed-precondition');

// 5. Vérification des doublons (15 min)
const existingPI = await checkDuplicatePayment(clientId, providerId, amount);
if (existingPI) throw new HttpsError('already-exists');

// 6. Application des coupons
let finalAmount = amount;
if (couponCode) {
  const discount = await applyCoupon(couponCode, amount);
  finalAmount = amount - discount;
}

// 7. Création du PaymentIntent
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(finalAmount * 100), // en centimes
  currency: currency,
  capture_method: 'manual', // IMPORTANT: capture différée
  metadata: {
    clientId,
    providerId,
    serviceType,
    callSessionId,
    providerStripeAccountId,
    commissionAmountEuros,
    providerAmountEuros
  }
});
```

### Réponse
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 4900,
  "currency": "eur",
  "status": "requires_payment_method",
  "expiresAt": "2026-01-02T22:30:00Z"
}
```

---

## Étape 3 : Création de la session d'appel

### Fichiers
- `sos/firebase/functions/src/createAndScheduleCallFunction.ts`
- `sos/firebase/functions/src/callScheduler.ts`

### Fonction
`createAndScheduleCallHTTPS` (Firebase Callable Function)

### Configuration
```typescript
{
  region: "europe-west1",
  memory: "256MiB",
  cpu: 0.25,
  timeoutSeconds: 60,
  maxInstances: 3,
  secrets: [ENCRYPTION_KEY, STRIPE_SECRET_KEY_TEST, STRIPE_SECRET_KEY_LIVE, TASKS_AUTH_SECRET]
}
```

### Processus détaillé

```typescript
// 1. Validation des données
const requiredFields = ['providerId', 'clientId', 'providerPhone',
                        'clientPhone', 'serviceType', 'providerType',
                        'paymentIntentId', 'amount'];
for (const field of requiredFields) {
  if (!request.data[field]) throw new HttpsError('invalid-argument');
}

// 2. Validation des numéros de téléphone (format E.164)
assertE164(providerPhone, 'provider'); // +33612345678
assertE164(clientPhone, 'client');
if (providerPhone === clientPhone) throw new HttpsError('invalid-argument');

// 3. Création de la session d'appel
const callSession = await createCallSession({
  providerId,
  clientId,
  providerPhone,        // Chiffré avec ENCRYPTION_KEY
  clientPhone,          // Chiffré avec ENCRYPTION_KEY
  serviceType,
  providerType,
  paymentIntentId,
  amount,
  clientLanguages: ['fr'],
  providerLanguages: ['fr']
});
// Génère ID: call_session_1767390225214_qdb3l

// 4. Lien avec la collection payments
await db.collection('payments').doc(paymentIntentId).set({
  callSessionId: callSession.id,
  status: 'call_session_created',
  updatedAt: serverTimestamp()
}, { merge: true });

// 5. Planification de l'appel via Cloud Tasks
const CALL_DELAY_SECONDS = 240; // 4 minutes
const taskId = await scheduleCallTask(callSession.id, CALL_DELAY_SECONDS);
console.log(`✅ Cloud Task créée: ${taskId}`);
```

### Structure de la session d'appel (Firestore)

```javascript
// Collection: call_sessions
// Document ID: call_session_1767390225214_qdb3l
{
  id: "call_session_1767390225214_qdb3l",
  status: "pending", // pending → provider_connecting → client_connecting → active → completed

  participants: {
    provider: {
      id: "DfDbWASB...",
      phone: "ENCRYPTED_PHONE", // Chiffré AES-256
      status: "pending",        // pending → ringing → connected → disconnected
      callSid: null,            // Rempli par Twilio
      connectedAt: null,
      disconnectedAt: null,
      attempts: 0
    },
    client: {
      id: "3sKwEFPe...",
      phone: "ENCRYPTED_PHONE",
      status: "pending",
      callSid: null,
      connectedAt: null,
      disconnectedAt: null,
      attempts: 0
    }
  },

  conference: {
    name: "conf_call_session_xxx_1767390225214",
    sid: null,           // Rempli par Twilio
    recordingUrl: null,
    duration: 0
  },

  payment: {
    intentId: "pi_xxx",
    status: "authorized",  // authorized → captured | refunded | cancelled
    amount: 49,
    capturedAt: null,
    refundedAt: null,
    transferId: null
  },

  metadata: {
    providerId: "DfDbWASB...",
    clientId: "3sKwEFPe...",
    serviceType: "lawyer_call",
    providerType: "lawyer",
    maxDuration: 1320,     // 22 min pour avocat, 32 min pour expat
    clientLanguages: ["fr"],
    providerLanguages: ["fr"],
    selectedLanguage: "fr",
    createdAt: Timestamp,
    updatedAt: Timestamp,
    scheduledAt: Timestamp
  }
}
```

---

## Étape 4 : Planification via Cloud Tasks

### Fichier
`sos/firebase/functions/src/lib/tasks.ts`

### Fonction
`scheduleCallTask(callSessionId, delaySeconds)`

### Processus

```typescript
// 1. Configuration
const config = {
  projectId: "sos-urgently-ac307",
  location: "europe-west1",
  queueName: "call-scheduler-queue",
  callbackUrl: "https://europe-west1-sos-urgently-ac307.cloudfunctions.net/executeCallTask"
};

// 2. Création du payload
const payload = {
  callSessionId: "call_session_xxx",
  scheduledAt: new Date().toISOString(),
  taskId: `call-call_session_xxx-${Date.now()}`
};

// 3. Configuration de la tâche
const task = {
  name: `${queuePath}/tasks/${taskId}`,
  scheduleTime: {
    seconds: Math.floor((Date.now() + delaySeconds * 1000) / 1000)
  },
  httpRequest: {
    httpMethod: "POST",
    url: config.callbackUrl,
    headers: {
      "Content-Type": "application/json",
      "X-Task-Auth": TASKS_AUTH_SECRET.value() // Authentification
    },
    body: Buffer.from(JSON.stringify(payload))
  }
};

// 4. Création de la tâche
const [response] = await tasksClient.createTask({ parent: queuePath, task });
console.log(`✅ Tâche créée: ${response.name}`);
```

### Pourquoi 4 minutes de délai ?

1. **Permettre au paiement de se finaliser** : Certains paiements (3D Secure) prennent du temps
2. **Laisser le temps aux webhooks** : Stripe envoie des webhooks qui mettent à jour l'état
3. **Buffer de sécurité** : Éviter les conditions de course

---

## Étape 5 : Exécution de la tâche d'appel

### Fichiers
- `sos/firebase/functions/src/runtime/executeCallTask.ts`
- `sos/firebase/functions/src/services/twilioCallManagerAdapter.ts`

### Déclencheur
Google Cloud Tasks appelle le webhook après le délai de 4 minutes.

### Processus

```typescript
// executeCallTask.ts
export async function runExecuteCallTask(req, res) {
  // 1. Vérification de l'authentification
  const authHeader = req.get("X-Task-Auth");
  if (authHeader !== TASKS_AUTH_SECRET.value()) {
    return res.status(401).send("Unauthorized");
  }

  // 2. Extraction du payload
  const { callSessionId } = req.body;

  // 3. Log initial
  await logCallRecord({
    callId: callSessionId,
    status: 'cloud_task_received'
  });

  // 4. Exécution de l'appel
  const result = await beginOutboundCallForSession(callSessionId);

  // 5. Réponse
  res.status(200).json({ success: true, callSessionId, result });
}
```

```typescript
// twilioCallManagerAdapter.ts
export async function beginOutboundCallForSession(callSessionId) {
  // 1. Récupération de la session
  const sessionDoc = await db.collection("call_sessions").doc(callSessionId).get();
  if (!sessionDoc.exists) throw new Error("Session introuvable");

  // 2. Vérification du paiement
  const paymentStatus = sessionData.payment?.status;
  if (paymentStatus !== "authorized") {
    throw new Error(`Paiement non autorisé: ${paymentStatus}`);
  }

  // 3. Correction des langues manquantes
  if (!sessionData.metadata?.clientLanguages) {
    await sessionDoc.ref.update({
      'metadata.clientLanguages': ['en'],
      'metadata.providerLanguages': ['en']
    });
  }

  // 4. Lancement de l'appel
  const { TwilioCallManager } = await import("../TwilioCallManager");
  return await TwilioCallManager.startOutboundCall({
    sessionId: callSessionId,
    delayMinutes: 0  // Immédiat (déjà retardé par Cloud Tasks)
  });
}
```

---

## Étape 6 : Gestion des appels Twilio

### Fichier
`sos/firebase/functions/src/TwilioCallManager.ts`

### Classe
`TwilioCallManager` (Singleton)

### Processus d'appel

```typescript
class TwilioCallManager {

  async initiateCallSequence(sessionId, delayMinutes = 0) {
    // 1. Récupération de la session
    const callSession = await this.getCallSession(sessionId);

    // 2. Validation du paiement
    const paymentValid = await this.validatePaymentStatus(callSession.payment.intentId);
    if (!paymentValid) {
      await this.handleCallFailure(sessionId, "payment_invalid");
      return;
    }

    // 3. Sélection de la langue
    const langKey = pickSessionLanguage(
      callSession.metadata.clientLanguages,
      callSession.metadata.providerLanguages
    );
    const ttsLocale = localeFor(langKey); // fr-FR, en-US, etc.

    // 4. Mise à jour du statut
    await this.updateCallSessionStatus(sessionId, "client_connecting");

    // 5. Déchiffrement des numéros
    const clientPhone = decryptPhoneNumber(callSession.participants.client.phone);
    const providerPhone = decryptPhoneNumber(callSession.participants.provider.phone);

    // 6. Appel du CLIENT en premier
    console.log(`📞 Appel client: ${sessionId}`);
    const clientConnected = await this.callParticipantWithRetries(
      sessionId, "client", clientPhone,
      callSession.conference.name,
      callSession.metadata.maxDuration,
      ttsLocale, langKey
    );

    if (!clientConnected) {
      await this.handleCallFailure(sessionId, "client_no_answer");
      return;
    }

    // 7. Appel du PRESTATAIRE
    await this.updateCallSessionStatus(sessionId, "provider_connecting");
    console.log(`📞 Appel prestataire: ${sessionId}`);
    const providerConnected = await this.callParticipantWithRetries(
      sessionId, "provider", providerPhone,
      callSession.conference.name,
      callSession.metadata.maxDuration,
      ttsLocale, langKey
    );

    if (!providerConnected) {
      await this.handleCallFailure(sessionId, "provider_no_answer");
      return;
    }

    // 8. Les deux sont connectés
    await this.updateCallSessionStatus(sessionId, "both_connecting");
    console.log(`✅ Séquence d'appel complétée: ${sessionId}`);
  }

  async callParticipantWithRetries(sessionId, participantType, phone, ...) {
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`📞 Tentative ${attempt}/${MAX_RETRIES} → ${participantType}`);

        // Création de l'appel Twilio
        const call = await this.twilioClient.calls.create({
          to: phone,
          from: TWILIO_PHONE_NUMBER,
          url: `${WEBHOOK_BASE_URL}/twiml/${sessionId}/${participantType}`,
          statusCallback: `${WEBHOOK_BASE_URL}/twilioCallWebhook`,
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          timeout: 30  // secondes avant abandon
        });

        // Mise à jour de la session
        await this.db.collection("call_sessions").doc(sessionId).update({
          [`participants.${participantType}.callSid`]: call.sid,
          [`participants.${participantType}.status`]: "ringing"
        });

        return true;  // Succès

      } catch (error) {
        if (attempt === MAX_RETRIES) return false;
        await this.delay(5000 * attempt);  // Backoff
      }
    }
    return false;
  }
}
```

### TwiML généré pour chaque participant

```xml
<!-- Pour le CLIENT -->
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="alice">
    Bonjour, vous allez être mis en relation avec votre avocat.
    Veuillez patienter.
  </Say>
  <Dial>
    <Conference
      startConferenceOnEnter="false"
      endConferenceOnExit="false"
      beep="false"
      waitUrl="https://api.twilio.com/cowbell.mp3"
      maxParticipants="2"
      timeLimit="1320">
      conf_call_session_xxx_1767390225214
    </Conference>
  </Dial>
</Response>

<!-- Pour le PRESTATAIRE -->
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="alice">
    Bonjour, un client SOS Expat souhaite vous consulter.
    Vous allez être mis en relation.
  </Say>
  <Dial>
    <Conference
      startConferenceOnEnter="true"
      endConferenceOnExit="true"
      beep="true"
      record="record-from-start"
      maxParticipants="2"
      timeLimit="1320">
      conf_call_session_xxx_1767390225214
    </Conference>
  </Dial>
</Response>
```

---

## Étape 7 : Webhooks Twilio

### Fichier
`sos/firebase/functions/src/Webhooks/twilioWebhooks.ts`

### Fonction
`twilioCallWebhook` (HTTP Webhook)

### Événements gérés

| Événement | Description | Action |
|-----------|-------------|--------|
| `ringing` | Le téléphone sonne | Mise à jour du statut participant |
| `answered` / `in-progress` | L'appel est décroché | Activation de la conférence |
| `completed` | L'appel est terminé | Déclenchement capture + factures |
| `failed` / `busy` / `no-answer` | Échec de l'appel | Retry ou annulation |

### Processus

```typescript
export const twilioCallWebhook = onRequest(
  { region: "europe-west1", secrets: [...] },
  async (req, res) => {
    // 1. Validation de la signature Twilio
    const isValid = twilio.validateRequest(
      TWILIO_AUTH_TOKEN,
      req.headers['x-twilio-signature'],
      webhookUrl,
      req.body
    );
    if (!isValid) return res.status(401).send("Invalid signature");

    // 2. Extraction des données
    const { CallSid, CallStatus, To, From, CallDuration } = req.body;

    // 3. Sanitization GDPR (masquer les numéros)
    const sanitizedTo = sanitizePhoneForLogs(To); // +33****5678

    // 4. Vérification d'idempotence
    const eventKey = `twilio_${CallSid}_${CallStatus}`;
    const existing = await db.collection('processed_webhook_events').doc(eventKey).get();
    if (existing.exists) {
      console.log(`⚠️ Événement déjà traité: ${eventKey}`);
      return res.status(200).send("Already processed");
    }

    // Marquer comme traité
    await db.collection('processed_webhook_events').doc(eventKey).set({
      processedAt: serverTimestamp(),
      callSid: CallSid,
      status: CallStatus
    });

    // 5. Trouver la session d'appel
    const session = await TwilioCallManager.findSessionByCallSid(CallSid);
    const participantType = session.participants.client.callSid === CallSid
      ? 'client' : 'provider';

    // 6. Traitement selon le statut
    switch (CallStatus) {
      case 'ringing':
        await handleCallRinging(session.id, participantType);
        break;

      case 'answered':
      case 'in-progress':
        await handleCallAnswered(session.id, participantType);
        break;

      case 'completed':
        await handleCallCompleted(session.id, participantType, CallDuration);
        break;

      case 'failed':
      case 'busy':
      case 'no-answer':
        await handleCallFailed(session.id, participantType, CallStatus);
        break;
    }

    res.status(200).send("OK");
  }
);
```

### Handler : handleCallCompleted

```typescript
async function handleCallCompleted(sessionId, participantType, duration) {
  // 1. Mise à jour du statut participant
  await db.collection('call_sessions').doc(sessionId).update({
    [`participants.${participantType}.status`]: 'disconnected',
    [`participants.${participantType}.disconnectedAt`]: serverTimestamp()
  });

  // 2. Vérifier si les DEUX participants ont raccroché
  const session = await db.collection('call_sessions').doc(sessionId).get();
  const data = session.data();

  const clientDone = data.participants.client.status === 'disconnected';
  const providerDone = data.participants.provider.status === 'disconnected';

  if (clientDone && providerDone) {
    // 3. Marquer la session comme terminée
    await db.collection('call_sessions').doc(sessionId).update({
      status: 'completed',
      'conference.duration': parseInt(duration) || 0,
      'metadata.completedAt': serverTimestamp()
    });

    // 4. Capturer le paiement
    const captureResult = await capturePaymentForSession(sessionId);

    // 5. Générer les factures
    if (captureResult.success) {
      await generateInvoicesForSession(sessionId);
    }

    // 6. Libérer le statut "busy" du prestataire
    await setProviderAvailable(data.metadata.providerId);
  }
}
```

---

## Étape 8 : Capture du paiement

### Fichier
`sos/firebase/functions/src/StripeManager.ts`

### Fonction
`StripeManager.capturePayment(paymentIntentId, sessionId)`

### Processus

```typescript
class StripeManager {

  async capturePayment(paymentIntentId, sessionId) {
    try {
      // 1. Récupérer le PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      // 2. Vérifier le statut
      if (paymentIntent.status !== 'requires_capture') {
        return { success: false, error: `Statut invalide: ${paymentIntent.status}` };
      }

      // 3. Vérification KYC du prestataire (P1 Security)
      const providerId = paymentIntent.metadata.providerId;
      const provider = await db.collection('users').doc(providerId).get();
      const kycStatus = provider.data()?.kycStatus;

      if (kycStatus !== 'completed' && kycStatus !== 'verified') {
        console.warn(`⚠️ KYC non vérifié pour ${providerId}`);
        await this.createAdminAlert({
          type: 'kyc_not_verified_at_capture',
          providerId,
          paymentIntentId,
          severity: 'high'
        });
        // Continue malgré tout (peut être configuré pour bloquer)
      }

      // 4. Capture avec idempotence
      const captured = await this.stripe.paymentIntents.capture(
        paymentIntentId,
        {},
        { idempotencyKey: `capture_${paymentIntentId}` }
      );

      // 5. Récupérer l'ID du transfert (Direct Charges)
      let transferId = captured.transfer;
      if (!transferId && captured.latest_charge) {
        const charge = await this.stripe.charges.retrieve(captured.latest_charge);
        transferId = charge.transfer;
      }

      // 6. Mise à jour Firestore
      await db.collection('payments').doc(paymentIntentId).update({
        status: 'captured',
        capturedAt: serverTimestamp(),
        capturedAmount: captured.amount_received,
        transferId: transferId || null
      });

      await db.collection('call_sessions').doc(sessionId).update({
        'payment.status': 'captured',
        'payment.capturedAt': serverTimestamp(),
        'payment.transferId': transferId || null
      });

      // 7. Créer un enregistrement de transfert
      if (transferId) {
        await db.collection('transfers').doc(transferId).set({
          transferId,
          paymentIntentId,
          providerId,
          amount: captured.amount_received,
          currency: captured.currency,
          sessionId,
          type: 'destination_charge_auto',
          createdAt: serverTimestamp()
        });
      }

      return {
        success: true,
        paymentIntentId,
        capturedAmount: captured.amount_received,
        transferId
      };

    } catch (error) {
      console.error('❌ Erreur capture:', error);
      return { success: false, error: error.message };
    }
  }
}
```

### Direct Charges vs Transfer

| Méthode | Description | Quand utilisé |
|---------|-------------|---------------|
| **Direct Charges** | Stripe transfère automatiquement au prestataire | Si `providerStripeAccountId` présent et KYC complet |
| **Manual Transfer** | Transfert manuel requis après capture | Si pas de compte Stripe prestataire |

---

## Étape 9 : Génération des factures

### Fichiers
- Frontend : `sos/src/services/invoiceGenerator.ts`
- Backend : `sos/firebase/functions/src/utils/generateInvoice.ts`

### Fonction
`generateBothInvoices(callRecord, payment, userId, options)`

### Processus

```typescript
export async function generateBothInvoices(
  callRecord: CallRecord,
  payment: PaymentData,
  userId: string,
  options: InvoiceOptions
) {
  // 1. Générer les numéros de facture uniques
  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
  const random = generateRandomString(6);

  const platformInvoiceNumber = `ULX-${timestamp}-${random}`;
  const providerInvoiceNumber = `PRV-${timestamp}-${random}`;

  // 2. Charger jsPDF dynamiquement
  const { jsPDF } = await import('jspdf');

  // 3. Générer la facture PLATEFORME (commission SOS Expat)
  const platformPdf = new jsPDF();
  await generatePdfContent(platformPdf, {
    invoiceNumber: platformInvoiceNumber,
    type: 'platform',
    issuer: PLATFORM_COMPANY_INFO,
    amount: payment.commissionAmount,
    currency: payment.currency,
    locale: options.locale,
    callRecord
  });

  // 4. Générer la facture PRESTATAIRE
  const providerPdf = new jsPDF();
  await generatePdfContent(providerPdf, {
    invoiceNumber: providerInvoiceNumber,
    type: 'provider',
    issuer: callRecord.providerInfo,
    amount: payment.providerAmount,
    currency: payment.currency,
    locale: options.locale,
    callRecord
  });

  // 5. Sauvegarder dans Firebase Storage
  const year = format(new Date(), 'yyyy');
  const month = format(new Date(), 'MM');

  const platformPath = `invoices/platform/${year}/${month}/${platformInvoiceNumber}.pdf`;
  const providerPath = `invoices/provider/${year}/${month}/${providerInvoiceNumber}.pdf`;

  await storage.bucket().file(platformPath).save(platformPdf.output('arraybuffer'));
  await storage.bucket().file(providerPath).save(providerPdf.output('arraybuffer'));

  // 6. Créer les enregistrements Firestore

  // Collection: invoices (pour le client/prestataire)
  await db.collection('invoices').add({
    invoiceNumber: platformInvoiceNumber,
    type: 'platform',
    callId: callRecord.id,
    clientId: callRecord.clientId,
    providerId: callRecord.providerId,
    amount: payment.commissionAmount,
    currency: payment.currency,
    downloadUrl: await getSignedUrl(platformPath),
    status: 'issued',
    createdAt: serverTimestamp()
  });

  // Collection: invoice_index (lookup rapide)
  await db.collection('invoice_index').doc(callRecord.id).set({
    platformInvoiceNumber,
    providerInvoiceNumber,
    createdAt: serverTimestamp()
  });

  // Collection: admin_invoices (dashboard admin)
  await db.collection('admin_invoices').add({
    callId: callRecord.id,
    clientName: callRecord.clientName,
    providerName: callRecord.providerName,
    totalAmount: payment.amount,
    commissionAmount: payment.commissionAmount,
    providerAmount: payment.providerAmount,
    platformInvoiceUrl: platformPath,
    providerInvoiceUrl: providerPath,
    status: 'generated',
    createdAt: serverTimestamp()
  });

  // Collection: audit_logs (conformité)
  await db.collection('audit_logs').add({
    action: 'invoice_generated',
    entityType: 'call_session',
    entityId: callRecord.id,
    details: {
      platformInvoiceNumber,
      providerInvoiceNumber,
      totalAmount: payment.amount
    },
    performedBy: 'system',
    createdAt: serverTimestamp()
  });

  return {
    platformInvoiceUrl: await getSignedUrl(platformPath),
    providerInvoiceUrl: await getSignedUrl(providerPath),
    invoiceNumbers: {
      platform: platformInvoiceNumber,
      provider: providerInvoiceNumber
    }
  };
}
```

### Structure d'une facture PDF

```
┌─────────────────────────────────────────────────────┐
│  [LOGO]    SOS EXPAT & TRAVELERS                    │
│            sos-expat.com                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  FACTURE                                            │
│  N° ULX-20260102-223045-A1B2C3                     │
│                                                     │
│  Date: 02/01/2026                                   │
│  Échéance: 02/02/2026                              │
│                                                     │
├─────────────────────────────────────────────────────┤
│  ÉMETTEUR:                    DESTINATAIRE:         │
│  SOS Expat SARL               Jean Dupont           │
│  123 Avenue Example           456 Rue Client        │
│  75001 Paris, France          69001 Lyon, France    │
│  SIRET: 123 456 789 00012     Email: jean@email.com │
├─────────────────────────────────────────────────────┤
│                                                     │
│  DESCRIPTION           QTÉ    PRIX     MONTANT     │
│  ─────────────────────────────────────────────────  │
│  Consultation avocat    1     49,00€    49,00€     │
│  (20 min - 02/01/2026)                             │
│                                                     │
├─────────────────────────────────────────────────────┤
│                         Sous-total:      49,00€     │
│                         TVA (0%):         0,00€     │
│                         ─────────────────────────   │
│                         TOTAL:           49,00€     │
├─────────────────────────────────────────────────────┤
│  Conditions: Paiement à réception                   │
│  Mode: Carte bancaire                               │
├─────────────────────────────────────────────────────┤
│  Contact: contact@sos-expat.com | +33 1 23 45 67 89│
└─────────────────────────────────────────────────────┘
```

---

## Gestion des erreurs

### Échec du paiement

```typescript
// createPaymentIntent.ts
try {
  const paymentIntent = await stripe.paymentIntents.create({...});
} catch (error) {
  if (error.type === 'StripeCardError') {
    throw new HttpsError('failed-precondition', 'Carte refusée');
  }
  if (error.type === 'StripeRateLimitError') {
    throw new HttpsError('resource-exhausted', 'Trop de requêtes');
  }
  throw new HttpsError('internal', 'Erreur de paiement');
}
```

### Échec de la création de session

```typescript
// createAndScheduleCallFunction.ts
try {
  const callSession = await createCallSession({...});
} catch (error) {
  // Annuler automatiquement le paiement
  await stripeManager.cancelPayment(
    paymentIntentId,
    `Échec création session: ${error.message}`
  );
  throw new HttpsError('internal', 'Impossible de créer la session');
}
```

### Échec de l'appel Twilio

```typescript
// TwilioCallManager.ts
async handleCallFailure(sessionId, reason) {
  // 1. Mettre à jour le statut
  await this.updateCallSessionStatus(sessionId, 'failed');

  // 2. Déterminer l'action
  const callSession = await this.getCallSession(sessionId);
  const paymentStatus = callSession.payment.status;

  if (paymentStatus === 'authorized') {
    // Paiement non capturé → Annuler (pas de frais)
    await stripeManager.cancelPayment(
      callSession.payment.intentId,
      `Appel échoué: ${reason}`
    );
  } else if (paymentStatus === 'captured') {
    // Paiement capturé → Rembourser
    await stripeManager.refundPayment(
      callSession.payment.intentId,
      `Appel échoué: ${reason}`
    );
  }

  // 3. Notifier les participants
  await sendFailureNotification(sessionId, reason);

  // 4. Libérer le prestataire
  await setProviderAvailable(callSession.metadata.providerId);
}
```

### Tableau des raisons d'échec

| Raison | Description | Action |
|--------|-------------|--------|
| `client_no_answer` | Client n'a pas répondu (3 tentatives) | Annulation paiement |
| `provider_no_answer` | Prestataire n'a pas répondu | Annulation paiement |
| `payment_invalid` | Paiement non autorisé | Aucun (déjà échoué) |
| `system_error` | Erreur technique | Annulation + alerte admin |
| `call_too_short` | Appel < 2 minutes | Remboursement |

---

## Collections Firestore

### Vue d'ensemble

```
firestore/
├── call_sessions/          # Sessions d'appel
├── payments/               # Paiements Stripe
├── users/                  # Utilisateurs (clients + prestataires)
├── sos_profiles/           # Profils prestataires
├── invoices/               # Factures
├── invoice_records/        # Détails factures
├── invoice_index/          # Index par callId
├── admin_invoices/         # Factures pour admin
├── transfers/              # Transferts Stripe
├── refunds/                # Remboursements
├── processed_webhook_events/  # Idempotence webhooks
├── call_records/           # Logs d'appels
├── error_logs/             # Erreurs
└── audit_logs/             # Piste d'audit
```

### Règles de sécurité importantes

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Sessions d'appel: lecture/écriture par participants
    match /call_sessions/{sessionId} {
      allow read: if request.auth.uid == resource.data.metadata.clientId
                  || request.auth.uid == resource.data.metadata.providerId;
      allow write: if false; // Uniquement via Cloud Functions
    }

    // Factures: création par client, lecture par propriétaire
    match /invoice_records/{invoiceId} {
      allow read: if request.auth.uid == resource.data.clientId
                  || request.auth.uid == resource.data.providerId;
      allow create: if request.auth.uid == request.resource.data.clientId;
      allow update, delete: if false;
    }

    // Paiements: lecture seule par propriétaire
    match /payments/{paymentId} {
      allow read: if request.auth.uid == resource.data.clientId
                  || request.auth.uid == resource.data.providerId;
      allow write: if false;
    }
  }
}
```

---

## Secrets et configuration

### Firebase Secrets (Secret Manager)

| Secret | Description | Utilisé par |
|--------|-------------|-------------|
| `STRIPE_SECRET_KEY_TEST` | Clé API Stripe (test) | createPaymentIntent, StripeManager |
| `STRIPE_SECRET_KEY_LIVE` | Clé API Stripe (prod) | createPaymentIntent, StripeManager |
| `STRIPE_WEBHOOK_SECRET_TEST` | Secret webhook (test) | stripeWebhook |
| `STRIPE_WEBHOOK_SECRET_LIVE` | Secret webhook (prod) | stripeWebhook |
| `TWILIO_ACCOUNT_SID` | SID compte Twilio | TwilioCallManager |
| `TWILIO_AUTH_TOKEN` | Token auth Twilio | TwilioCallManager, webhooks |
| `TWILIO_PHONE_NUMBER` | Numéro Twilio (+33...) | TwilioCallManager |
| `ENCRYPTION_KEY` | Clé AES-256 (GDPR) | Chiffrement téléphones |
| `TASKS_AUTH_SECRET` | Auth Cloud Tasks | scheduleCallTask, executeCallTask |

### Variables d'environnement

```bash
# .env (functions)
STRIPE_MODE=live          # 'test' ou 'live'
GCLOUD_PROJECT=sos-urgently-ac307
CLOUD_TASKS_LOCATION=europe-west1
CLOUD_TASKS_QUEUE=call-scheduler-queue
```

### Configuration dynamique (Firestore)

```javascript
// Collection: admin_config
// Document: pricing
{
  lawyer: {
    eur: { totalAmount: 49, providerAmount: 45, connectionFeeAmount: 4 },
    usd: { totalAmount: 55, providerAmount: 50, connectionFeeAmount: 5 }
  },
  expat: {
    eur: { totalAmount: 19, providerAmount: 17, connectionFeeAmount: 2 },
    usd: { totalAmount: 22, providerAmount: 20, connectionFeeAmount: 2 }
  }
}
```

---

## Résumé du flux temporel

```
T+0s      : Client confirme paiement
T+1s      : PaymentIntent créé (requires_capture)
T+2s      : Session d'appel créée (pending)
T+3s      : Cloud Task planifiée (+240s)
T+4s      : Client redirigé vers /paiement-reussi

T+240s    : Cloud Task s'exécute
T+241s    : executeCallTask démarre
T+242s    : TwilioCallManager.initiateCallSequence()
T+243s    : Appel client initié
T+245s    : Client répond → statut "connected"
T+247s    : Appel prestataire initié
T+250s    : Prestataire répond → conférence active

T+250s-T+1570s : Appel en cours (max 22 min avocat)

T+1570s   : Fin de l'appel
T+1571s   : Webhook Twilio "completed"
T+1572s   : StripeManager.capturePayment()
T+1573s   : Paiement capturé
T+1574s   : generateBothInvoices()
T+1575s   : Factures générées et stockées

T+1576s   : WORKFLOW TERMINÉ ✅
```

---

## Contacts et support

- **Développeur** : Claude Code
- **Repository** : github.com/will383842/sos-expat-project
- **Email support** : contact@sos-expat.com
