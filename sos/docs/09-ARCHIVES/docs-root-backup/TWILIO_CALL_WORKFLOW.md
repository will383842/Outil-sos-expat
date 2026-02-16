# Workflow Complet des Appels Twilio - SOS Expat

## Vue d'ensemble

Le système d'appel SOS Expat utilise Twilio pour connecter les clients avec les prestataires via une conférence téléphonique. Le flux inclut la détection automatique de répondeur (AMD) pour éviter de laisser des messages sur les répondeurs.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Client      │     │    Twilio       │     │    Provider     │
│   (Téléphone)   │     │   (Conférence)  │     │   (Téléphone)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │◄──────────────────────│                       │
         │  1. Appel sortant     │                       │
         │                       │                       │
         │──────────────────────►│                       │
         │  2. Réponse + AMD     │                       │
         │                       │                       │
         │  3. Join conférence   │                       │
         │◄─────────────────────►│                       │
         │                       │                       │
         │                       │──────────────────────►│
         │                       │  4. Appel sortant     │
         │                       │                       │
         │                       │◄──────────────────────│
         │                       │  5. Réponse + AMD     │
         │                       │                       │
         │                       │  6. Join conférence   │
         │◄─────────────────────►│◄─────────────────────►│
         │       CONVERSATION    │                       │
```

## Fichiers Principaux

| Fichier | Rôle |
|---------|------|
| `TwilioCallManager.ts` | Orchestration des appels, retries, gestion d'état |
| `twilioWebhooks.ts` | Réception des webhooks Twilio (ringing, answered, completed, failed) |
| `TwilioConferenceWebhook.ts` | Gestion des événements de conférence (join, leave, end) |

## États des Participants

```
┌─────────┐
│ pending │ ← État initial
└────┬────┘
     │ callParticipantWithRetries()
     ▼
┌─────────┐
│ calling │ ← Appel Twilio placé
└────┬────┘
     │ Webhook: ringing
     ▼
┌─────────┐
│ ringing │ ← Téléphone sonne
└────┬────┘
     │ Webhook: answered
     ▼
┌─────────────┐
│ amd_pending │ ← AMD analyse (max 30s)
└─────┬───────┘
      │
      ├──────────────────────────────────┐
      │ AMD callback: human             │ AMD callback: machine/unknown
      ▼                                  ▼
┌───────────┐                     ┌───────────┐
│ connected │                     │ no_answer │ → Retry si < 3 attempts
└─────┬─────┘                     └───────────┘
      │ Webhook: completed
      ▼
┌──────────────┐
│ disconnected │ → handleEarlyDisconnection ou handleCallCompletion
└──────────────┘
```

## Workflow Détaillé

### PHASE 1: Initiation de la Session

```
1. createPaymentIntent() → Crée call_session avec status="pending"
2. Payment Intent confirmé
3. initiateCallSequence(sessionId) est appelé
4. executeCallSequence() démarre
```

### PHASE 2: Appel du Client (3 tentatives max)

```
Pour chaque tentative (1 à 3):
│
├── 1. Vérifier session.status != "failed"/"cancelled"
│
├── 2. Vérifier si participant déjà "connected"
│       └── Si oui → return true (succès)
│
├── 3. Si tentative > 1:
│       ├── Vérifier l'état de l'appel précédent
│       ├── Si "in-progress" + "amd_pending" → Attendre AMD callback
│       ├── Si "in-progress" + autre status → Forcer "connected" (recovery)
│       └── Si "ringing"/"queued" → Raccrocher et retry
│
├── 4. Créer appel Twilio:
│       ├── machineDetection: "Enable"
│       ├── asyncAmd: "true"
│       ├── url: twilioAmdTwiml (pour TwiML initial)
│       └── asyncAmdStatusCallback: twilioAmdTwiml (pour résultat AMD)
│
├── 5. Sauvegarder callSid dans Firestore
│
├── 6. waitForConnection() - Poll pendant 90s max:
│       ├── Vérifie status toutes les 3s
│       ├── Si "connected" → return true
│       ├── Si "disconnected"/"no_answer" → return false
│       └── Si "amd_pending" > 40s → return false (AMD timeout)
│
├── 7. Si succès → Passer à Phase 3
│
└── 8. Si échec + tentative < 3 → Backoff (15-25s) puis retry
```

### PHASE 3: Appel du Provider (3 tentatives max)

```
Même logique que Phase 2, avec:
- Délai initial de 15s (pour permettre au client d'entendre le message)
- Si le provider ne répond pas → handleCallFailure("provider_no_answer")
```

### PHASE 4: Conférence Active

```
Les deux participants sont dans la conférence:
│
├── session.status = "active"
├── client.status = "connected"
├── provider.status = "connected"
│
└── La conversation peut durer jusqu'à maxDuration (défaut: 20 min)
```

### PHASE 5: Fin de l'Appel

```
Quand un participant raccroche:
│
├── 1. Webhook "completed" ou "participant-leave"
│
├── 2. Calculer billingDuration (depuis que les DEUX sont connectés)
│
├── 3. Si billingDuration >= 120s:
│       └── handleCallCompletion() → Capturer le paiement
│
└── 4. Si billingDuration < 120s:
        └── handleEarlyDisconnection() → Logique de retry/refund
```

## Scénarios d'Appel

### Scénario 1: Appel Réussi (Happy Path)

```
1. Client appelé → répond → AMD: human → status: connected
2. Provider appelé → répond → AMD: human → status: connected
3. Conversation de 5 minutes
4. Client raccroche → billingDuration = 300s (>120s)
5. Paiement capturé → session.status = "completed"
```

### Scénario 2: Client ne Répond Pas

```
1. Client appelé → timeout (30s) → status: no_answer
2. Retry 1 → timeout → status: no_answer
3. Retry 2 → timeout → status: no_answer
4. 3 tentatives épuisées → handleCallFailure("client_no_answer")
5. Provider notifié, paiement remboursé
```

### Scénario 3: Client = Répondeur

```
1. Client appelé → répond → AMD: machine_start
2. Appel raccroché immédiatement (pas de message laissé)
3. status: no_answer (permet retry)
4. Retry 1 → même résultat ou humain
```

### Scénario 4: Provider ne Répond Pas (Client Connecté)

```
1. Client appelé → répond → AMD: human → status: connected
2. Client dans la conférence (musique d'attente)
3. Provider appelé → timeout → status: no_answer
4. Retry 1 → timeout
5. Retry 2 → timeout
6. 3 tentatives épuisées → handleCallFailure("provider_no_answer")
7. Provider mis OFFLINE, client redirigé vers message d'excuse
8. Paiement remboursé
```

### Scénario 5: Déconnexion Précoce (<2 min) - Client Raccroche

```
1. Client connecté, Provider connecté
2. Client raccroche après 45 secondes
3. billingDuration = 45s (<120s)
4. handleEarlyDisconnection():
   - bothWereConnected = true (les deux avaient connectedAt)
   - → handleCallFailure("early_disconnect_client")
5. Paiement remboursé
```

### Scénario 6: Déconnexion Précoce - Provider Pas Encore Connecté

```
1. Client connecté (dans conférence)
2. Provider en cours d'appel (attempt 1)
3. Client raccroche après 30 secondes
4. handleEarlyDisconnection():
   - bothWereConnected = false (provider.connectedAt = undefined)
   - retriesExhausted = false (attemptCount < 3)
   - → NE PAS appeler handleCallFailure
   - → Les retries du provider peuvent continuer
5. Mais conférence terminée car client parti...
```

### Scénario 7: AMD Timeout (Callback Jamais Reçu)

```
1. Client appelé → répond → status: amd_pending
2. AMD callback jamais reçu (erreur réseau?)
3. waitForConnection() poll pendant 40s
4. AMD timeout atteint → return false
5. Retry 1 (nouvel appel)
6. Si AMD callback arrive maintenant pour l'ancien appel:
   - Stale check détecte callSid différent → ignoré
```

### Scénario 8: Webhook Stale (Ancien Appel)

```
1. Provider attempt 1 → timeout
2. Provider attempt 2 → provider répond
3. Webhook "completed" de attempt 1 arrive tardivement
4. handleCallCompleted() vérifie:
   - currentCallSid = CA_attempt2
   - body.CallSid = CA_attempt1
   - currentCallSid !== body.CallSid → STALE!
5. Webhook ignoré, appel continue normalement
```

## Gestion des Erreurs

### Circuit Breaker

```typescript
// Si > 5 échecs Twilio en 1 minute
if (isCircuitOpen()) {
  throw new Error("Twilio service temporarily unavailable");
}
```

### Idempotence

```typescript
// handleEarlyDisconnection ne s'exécute qu'une fois
if (session.metadata?.earlyDisconnectProcessed) {
  return; // Déjà traité
}
```

### Stale Webhooks

```typescript
// Vérifie que le webhook est pour l'appel actuel
if (currentCallSid !== body.CallSid) {
  return; // Ignorer l'ancien webhook
}
```

## Logs Importants à Surveiller

```
[WORKFLOW] ÉTAPE 1: APPEL CLIENT     → Début de l'appel client
[WORKFLOW] CLIENT RESULT: ✅         → Client connecté
[WORKFLOW] ÉTAPE 2: APPEL PROVIDER   → Début de l'appel provider
[WORKFLOW] PROVIDER RESULT: ✅       → Provider connecté

[AMD WAIT] Call in-progress but AMD PENDING    → Attente AMD
[AMD WAIT] ✅ AMD callback confirmed HUMAN     → Humain confirmé
[AMD WAIT] ❌ AMD callback indicated MACHINE   → Machine détectée

[handleEarlyDisconnection] RETRY DECISION ANALYSIS
  bothWereConnected: true/false      → Les deux étaient connectés?
  retriesExhausted: true/false       → Plus de tentatives?
  🔴 DECISION: CALL handleCallFailure → Échec final
  🟢 DECISION: SKIP handleCallFailure → Retries continuent

⚠️ STALE WEBHOOK DETECTED!           → Ancien webhook ignoré
```

## Configuration

```typescript
const CALL_CONFIG = {
  MAX_RETRIES: 3,           // Nombre max de tentatives
  CALL_TIMEOUT: 60,         // Timeout d'appel Twilio (secondes)
  CONNECTION_WAIT_TIME: 90, // Timeout de waitForConnection (secondes)
  MIN_CALL_DURATION: 120,   // Durée min pour capture (2 minutes)
};
```

## Fixes Appliqués (2026-01-16)

### Fix 1: handleEarlyDisconnection Logic

**Problème**: Vérifiait `anyParticipantConnected` basé sur le status actuel, mais le participant était déjà "disconnected" au moment du check.

**Solution**: Utiliser `connectedAt` timestamps qui persistent après déconnexion:
```typescript
const bothWereConnected =
  session.participants.client.connectedAt !== undefined &&
  session.participants.provider.connectedAt !== undefined;
```

### Fix 2: AMD Pending Double Call

**Problème**: Quand AMD était "pending" et l'appel "in-progress", le code créait un nouvel appel au lieu d'attendre.

**Solution**: Attendre le callback AMD avant de créer un nouvel appel:
```typescript
if (participant.status === "amd_pending") {
  const amdResult = await this.waitForConnection(...);
  if (amdResult) return true;
  continue; // Retry si timeout
}
```

---

*Document généré le 2026-01-16*
