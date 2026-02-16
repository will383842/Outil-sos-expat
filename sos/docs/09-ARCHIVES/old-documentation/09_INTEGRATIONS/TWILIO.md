# Integration Twilio - SOS Expat

> **Version**: 2.0
> **Date**: 27 Janvier 2026

---

## Vue d'Ensemble

Twilio est utilise pour gerer les appels telephoniques entre clients et prestataires.

### Services Utilises

| Service | Usage |
|---------|-------|
| **Programmable Voice** | Appels entrants/sortants |
| **AMD (Answering Machine Detection)** | Detection repondeurs |
| **Call Recording** | Enregistrement (optionnel) |
| **TwiML Bins** | Scripts d'appel |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                  │
│                    (Clique "Appeler")                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUD FUNCTION                               │
│                   initiateCall                                  │
│                                                                 │
│  1. Verification paiement                                       │
│  2. Verification disponibilite provider                         │
│  3. Creation call_session Firestore                             │
│  4. Appel Twilio API                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      TWILIO                                     │
│                                                                 │
│  1. Appel CLIENT (numero fourni)                                │
│  2. AMD: Detection humain/repondeur                             │
│  3. Si humain: Pont vers PROVIDER                               │
│  4. Webhooks status vers Cloud Functions                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOKS                                     │
│                                                                 │
│  /twilioVoice     → TwiML pour l'appel                          │
│  /twilioStatus    → MAJ statut (ringing, answered, completed)   │
│  /twilioAMD       → Resultat detection repondeur                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Variables d'Environnement

```bash
# Firebase Secrets
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_API_KEY_SID=SKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_API_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Numeros de Telephone

| Pays | Numero | Usage |
|------|--------|-------|
| France | +33 X XX XX XX XX | Appels EU |
| USA | +1 XXX XXX XXXX | Appels NA |

---

## Workflow d'Appel

### 1. Initiation de l'Appel

```typescript
// Cloud Function: initiateCall
export const initiateCall = onCall(async (request) => {
  const { callSessionId, clientPhone, providerPhone } = request.data;

  // Verification
  const session = await getCallSession(callSessionId);
  if (session.status !== 'paid') {
    throw new Error('Session non payee');
  }

  // Creer l'appel Twilio
  const call = await twilioClient.calls.create({
    to: clientPhone,
    from: TWILIO_NUMBER,
    url: `${BASE_URL}/twilioVoice?sessionId=${callSessionId}`,
    statusCallback: `${BASE_URL}/twilioStatus?sessionId=${callSessionId}`,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    machineDetection: 'Enable',
    machineDetectionTimeout: 5,
    asyncAmd: true,
    asyncAmdStatusCallback: `${BASE_URL}/twilioAMD?sessionId=${callSessionId}`
  });

  // MAJ session
  await updateCallSession(callSessionId, {
    twilioCallSid: call.sid,
    status: 'calling_client'
  });

  return { callSid: call.sid };
});
```

### 2. TwiML Voice Handler

```typescript
// HTTP Function: twilioVoice
export const twilioVoice = onRequest(async (req, res) => {
  const { sessionId } = req.query;
  const session = await getCallSession(sessionId);

  const twiml = new VoiceResponse();

  // Message d'accueil
  twiml.say({
    voice: 'Polly.Lea',
    language: 'fr-FR'
  }, 'Connexion en cours avec votre conseiller...');

  // Pont vers le provider
  const dial = twiml.dial({
    callerId: TWILIO_NUMBER,
    timeout: 30,
    action: `${BASE_URL}/twilioDialStatus?sessionId=${sessionId}`
  });

  dial.number({
    statusCallback: `${BASE_URL}/twilioStatus?sessionId=${sessionId}`
  }, session.providerPhone);

  res.type('text/xml');
  res.send(twiml.toString());
});
```

### 3. AMD (Answering Machine Detection)

```typescript
// HTTP Function: twilioAMD
export const twilioAMD = onRequest(async (req, res) => {
  const { sessionId } = req.query;
  const { AnsweredBy, CallSid } = req.body;

  if (AnsweredBy === 'machine_start' || AnsweredBy === 'machine_end_beep') {
    // Repondeur detecte - terminer l'appel
    await twilioClient.calls(CallSid).update({ status: 'completed' });

    await updateCallSession(sessionId, {
      status: 'failed',
      failureReason: 'answering_machine'
    });

    // Notifier le client
    await sendNotification(session.clientId, {
      type: 'CALL_FAILED_VOICEMAIL',
      message: 'Le conseiller n\'a pas repondu. Vous serez rembourse.'
    });
  }

  res.sendStatus(200);
});
```

### 4. Status Callback

```typescript
// HTTP Function: twilioStatus
export const twilioStatus = onRequest(async (req, res) => {
  const { sessionId } = req.query;
  const { CallStatus, CallDuration, CallSid } = req.body;

  switch (CallStatus) {
    case 'ringing':
      await updateCallSession(sessionId, { status: 'ringing' });
      break;

    case 'in-progress':
      await updateCallSession(sessionId, {
        status: 'in_progress',
        startedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      break;

    case 'completed':
      const duration = parseInt(CallDuration);
      await updateCallSession(sessionId, {
        status: 'completed',
        duration,
        endedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Verification duree minimum (2 min)
      if (duration < 120) {
        await processRefund(sessionId);
      } else {
        await processCommission(sessionId);
      }
      break;

    case 'failed':
    case 'busy':
    case 'no-answer':
      await updateCallSession(sessionId, {
        status: 'failed',
        failureReason: CallStatus
      });
      await processRefund(sessionId);
      break;
  }

  res.sendStatus(200);
});
```

---

## Scenarios d'Appel

### Happy Path

```
1. Client paie → status: paid
2. Initiation appel client → status: calling_client
3. Client repond (humain) → status: connecting_provider
4. Provider repond → status: in_progress
5. Conversation terminee → status: completed
6. Duree >= 2 min → Commission generee
```

### Client = Repondeur

```
1. AMD detecte "machine_start"
2. Appel termine automatiquement
3. Status: failed (answering_machine)
4. Remboursement automatique
```

### Provider ne Repond Pas

```
1. Timeout 30 secondes
2. 3 tentatives (avec delai)
3. Si echec total: failed (no_answer)
4. Remboursement automatique
```

### Appel < 2 Minutes

```
1. Appel termine normalement
2. Duree < 120 secondes
3. Status: completed
4. Remboursement automatique
5. Pas de commission
```

---

## Retry Logic

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  delayBetweenAttempts: 30, // secondes
  reasons: ['no-answer', 'busy']
};

async function handleCallFailure(sessionId: string, reason: string) {
  const session = await getCallSession(sessionId);

  if (
    RETRY_CONFIG.reasons.includes(reason) &&
    session.attemptCount < RETRY_CONFIG.maxAttempts
  ) {
    // Programmer un retry
    await scheduleRetry(sessionId, RETRY_CONFIG.delayBetweenAttempts);
  } else {
    // Echec definitif
    await finalizeFailedCall(sessionId);
  }
}
```

---

## Enregistrement des Appels

### Configuration (Optionnel)

```typescript
// Activer l'enregistrement
const call = await twilioClient.calls.create({
  // ... autres params
  record: true,
  recordingStatusCallback: `${BASE_URL}/twilioRecording`,
  recordingStatusCallbackEvent: ['completed']
});
```

### Stockage des Enregistrements

```typescript
// HTTP Function: twilioRecording
export const twilioRecording = onRequest(async (req, res) => {
  const { RecordingUrl, RecordingSid, CallSid } = req.body;

  // Telecharger et stocker dans Firebase Storage
  const recording = await downloadRecording(RecordingUrl);
  const storagePath = `recordings/${CallSid}/${RecordingSid}.mp3`;
  await storage.bucket().file(storagePath).save(recording);

  // MAJ session
  await updateCallSession(sessionId, {
    recordingUrl: storagePath
  });

  // Supprimer de Twilio (GDPR)
  await twilioClient.recordings(RecordingSid).remove();

  res.sendStatus(200);
});
```

---

## Securite

### Validation des Webhooks

```typescript
import { validateRequest } from 'twilio';

function validateTwilioWebhook(req: Request): boolean {
  const signature = req.headers['x-twilio-signature'];
  const url = `https://${req.headers.host}${req.originalUrl}`;

  return validateRequest(
    TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body
  );
}
```

### Protection Rate Limiting

```typescript
const CALL_LIMITS = {
  perUser: { limit: 5, window: 3600 },      // 5 appels/heure/user
  perProvider: { limit: 20, window: 3600 }, // 20 appels/heure/provider
  global: { limit: 100, window: 60 }        // 100 appels/minute global
};
```

---

## Monitoring

### Metriques Suivies

| Metrique | Seuil Alerte |
|----------|--------------|
| Taux de succes | < 80% |
| Duree moyenne | > 30 min |
| Taux AMD | > 20% |
| Temps connexion | > 45 sec |

### Dashboard Admin

- Nombre d'appels par jour/semaine/mois
- Duree moyenne des appels
- Taux de succes par provider
- Repartition des echecs
- Couts Twilio

---

## Couts

| Element | Prix |
|---------|------|
| Appel sortant France | ~0.02 EUR/min |
| Appel sortant International | ~0.05-0.15 EUR/min |
| Numero francais | ~1 EUR/mois |
| AMD | Inclus |

---

## Voir Aussi

- [Workflow Paiement](../05_PAYMENTS/WORKFLOW.md)
- [Architecture](../02_ARCHITECTURE/OVERVIEW.md)
- [Monitoring](../08_OPERATIONS/MONITORING.md)
