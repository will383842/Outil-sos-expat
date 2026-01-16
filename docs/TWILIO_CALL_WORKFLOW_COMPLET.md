# Workflow Complet des Appels Twilio - SOS Expat

## Table des matières
1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [États et transitions](#3-états-et-transitions)
4. [Workflow principal pas à pas](#4-workflow-principal-pas-à-pas)
5. [Tous les scénarios possibles](#5-tous-les-scénarios-possibles)
6. [Gestion des erreurs](#6-gestion-des-erreurs)
7. [Configuration](#7-configuration)
8. [Logs à surveiller](#8-logs-à-surveiller)

---

## 1. Vue d'ensemble

### Principe général
```
CLIENT paie → Système appelle CLIENT → CLIENT répond → Système appelle PROVIDER → PROVIDER répond → CONFÉRENCE → Fin d'appel → Capture/Remboursement
```

### Règles de facturation
- **Appel < 2 minutes** → Remboursement automatique
- **Appel >= 2 minutes** → Paiement capturé
- La durée est calculée depuis que **LES DEUX** sont connectés (pas depuis que le premier a répondu)

---

## 2. Architecture technique

### Fichiers impliqués

| Fichier | Rôle | URL Cloud Run |
|---------|------|---------------|
| `TwilioCallManager.ts` | Orchestration des appels, retries, état | N/A (appelé en interne) |
| `twilioWebhooks.ts` | Webhooks d'appel (ringing, answered, completed) | `twiliocallwebhook-*.run.app` |
| `twilioWebhooks.ts` (twilioAmdTwiml) | AMD callback + TwiML | `twilioamdtwiml-*.run.app` |
| `TwilioConferenceWebhook.ts` | Webhooks conférence (join, leave, end) | `twilioconferencewebhook-*.run.app` |
| `executeCallTask.ts` | Point d'entrée (Cloud Task) | `executecalltask-*.run.app` |

### Flux de données

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FIRESTORE                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ call_sessions/{sessionId}                                            │   │
│  │   - status: pending|client_connecting|provider_connecting|active|... │   │
│  │   - participants.client.status: pending|calling|ringing|amd_pending|...│  │
│  │   - participants.provider.status: ...                                │   │
│  │   - participants.client.connectedAt: Timestamp                       │   │
│  │   - participants.provider.connectedAt: Timestamp                     │   │
│  │   - payment.intentId, payment.status                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
        ▲                    ▲                    ▲
        │                    │                    │
        │ Lecture/Écriture   │                    │
        │                    │                    │
┌───────┴────────┐  ┌────────┴───────┐  ┌────────┴───────┐
│ TwilioCall     │  │ twilioWebhooks │  │ Conference     │
│ Manager        │  │ (call status)  │  │ Webhook        │
└───────┬────────┘  └────────┬───────┘  └────────┬───────┘
        │                    │                    │
        │                    │                    │
        ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TWILIO API                                      │
│                                                                              │
│  calls.create() ─────────────► Appel sortant                                │
│                                     │                                        │
│                     ┌───────────────┼───────────────┐                       │
│                     ▼               ▼               ▼                       │
│               [ringing]        [answered]      [completed]                  │
│                     │               │               │                       │
│                     └───────────────┴───────────────┘                       │
│                                     │                                        │
│                                     ▼                                        │
│                              CONFÉRENCE                                      │
│                     ┌───────────────┬───────────────┐                       │
│                     ▼               ▼               ▼                       │
│              [participant-join] [participant-leave] [conference-end]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. États et transitions

### États de la Session (`call_sessions.status`)

```
┌─────────┐
│ pending │ ← Création après paiement
└────┬────┘
     │ executeCallSequence()
     ▼
┌──────────────────┐
│ client_connecting│ ← Appel du client en cours
└────────┬─────────┘
         │ Client connecté
         ▼
┌────────────────────┐
│ provider_connecting│ ← Appel du provider en cours
└────────┬───────────┘
         │ Provider connecté
         ▼
┌────────────────┐
│ both_connecting│ ← Les deux en cours de connexion
└────────┬───────┘
         │ Les deux dans la conférence
         ▼
┌────────┐
│ active │ ← Conversation en cours
└────┬───┘
     │
     ├─────────────────────────────────┐
     │ Appel >= 2min                   │ Appel < 2min ou échec
     ▼                                 ▼
┌───────────┐                    ┌────────┐
│ completed │                    │ failed │
└───────────┘                    └────────┘
```

### États d'un Participant (`participants.client.status` ou `participants.provider.status`)

```
┌─────────┐
│ pending │ ← État initial
└────┬────┘
     │ Appel Twilio placé
     ▼
┌─────────┐
│ calling │ ← Appel en cours (pas encore de sonnerie)
└────┬────┘
     │ Webhook: ringing
     ▼
┌─────────┐
│ ringing │ ← Téléphone sonne
└────┬────┘
     │ Webhook: answered (mais AMD pas encore fini)
     ▼
┌─────────────┐
│ amd_pending │ ← AMD analyse si humain ou répondeur (max 30s)
└──────┬──────┘
       │
       ├─────────────────────────────────┐
       │ AMD: human ou unknown           │ AMD: machine/fax
       ▼                                 ▼
┌───────────┐                      ┌───────────┐
│ connected │                      │ no_answer │ ← Permet retry
└─────┬─────┘                      └───────────┘
      │ Webhook: completed ou leave
      ▼
┌──────────────┐
│ disconnected │
└──────────────┘
```

### Diagramme de transition détaillé

```
                                    ┌─────────────────┐
                                    │     pending     │
                                    └────────┬────────┘
                                             │
                          twilioClient.calls.create()
                                             │
                                             ▼
                                    ┌─────────────────┐
                    ┌───────────────│     calling     │───────────────┐
                    │               └────────┬────────┘               │
                    │                        │                        │
              Webhook: failed          Webhook: ringing         Timeout 60s
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
           │    no_answer    │      │     ringing     │      │    no_answer    │
           └─────────────────┘      └────────┬────────┘      └─────────────────┘
                                             │
                                       Webhook: answered
                                    (asyncAmd = true)
                                             │
                                             ▼
                                    ┌─────────────────┐
                    ┌───────────────│   amd_pending   │───────────────┐
                    │               └────────┬────────┘               │
                    │                        │                        │
              AMD: machine              AMD: human               AMD timeout
              AMD: fax                  AMD: unknown                (40s)
                    │                        │                        │
                    ▼                        ▼                        ▼
           ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
           │    no_answer    │      │    connected    │      │    no_answer    │
           │  (call hangup)  │      │                 │      │   (retry)       │
           └─────────────────┘      └────────┬────────┘      └─────────────────┘
                                             │
                                    Webhook: completed
                                    ou participant-leave
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  disconnected   │
                                    └─────────────────┘
```

---

## 4. Workflow principal pas à pas

### Phase 0: Pré-appel (Paiement)

```
1. Client sélectionne un provider et paie
2. createPaymentIntent() crée un PaymentIntent Stripe (capture manuelle)
3. PaymentIntent confirmé → status = "requires_capture"
4. Création de call_sessions/{sessionId} avec:
   - status: "pending"
   - participants.client.status: "pending"
   - participants.provider.status: "pending"
   - payment.intentId: "pi_xxx"
   - payment.status: "authorized"
5. Cloud Task planifié pour exécuter l'appel
```

### Phase 1: Démarrage de la séquence d'appel

```
executeCallTask() est appelé par Cloud Tasks
      │
      ▼
executeCallSequence(sessionId)
      │
      ├── 1. Vérifier que session existe
      ├── 2. Vérifier session.status != "failed" ou "cancelled"
      ├── 3. Vérifier paiement valide (PaymentIntent status)
      ├── 4. Configurer les langues (client et provider)
      ├── 5. Mettre session.status = "client_connecting"
      │
      ▼
   PHASE 2
```

### Phase 2: Appel du Client (avec retries)

```
callParticipantWithRetries(sessionId, "client", phone, ...)
      │
      │  ┌─────────────────────────────────────────────────────────────┐
      │  │                    BOUCLE DE RETRY                          │
      │  │                    (max 3 tentatives)                       │
      │  └─────────────────────────────────────────────────────────────┘
      │
      ▼
Pour attempt = 1, 2, 3:
      │
      ├── 1. Vérifier session.status != "failed"/"cancelled"
      │      └── Si oui → return false (arrêter)
      │
      ├── 2. Vérifier si déjà "connected"
      │      └── Si oui → return true (succès)
      │
      ├── 3. Si attempt > 1: Vérifier l'appel précédent
      │      ├── Si "in-progress" + "amd_pending":
      │      │      └── Ré-exécuter waitForConnection() (FIX 2026-01-16)
      │      │          └── Si succès → return true
      │      │          └── Si échec → continue (prochain attempt)
      │      │
      │      ├── Si "in-progress" + autre status:
      │      │      └── Forcer "connected" (recovery)
      │      │          └── return true
      │      │
      │      └── Si "ringing"/"queued":
      │             └── Raccrocher l'ancien appel
      │
      ├── 4. Vérifier circuit breaker
      │      └── Si ouvert → throw Error
      │
      ├── 5. Créer l'appel Twilio:
      │      twilioClient.calls.create({
      │        to: phoneNumber,
      │        from: twilioNumber,
      │        url: twilioAmdTwiml (pour le TwiML initial),
      │        statusCallback: twilioCallWebhook,
      │        statusCallbackEvent: [ringing, answered, completed, failed, ...],
      │        machineDetection: "Enable",
      │        asyncAmd: "true",
      │        asyncAmdStatusCallback: twilioAmdTwiml (pour résultat AMD)
      │      })
      │
      ├── 6. Sauvegarder callSid dans Firestore
      │      └── participant.callSid = call.sid
      │      └── participant.status = "calling"
      │
      ├── 7. waitForConnection() - Attendre jusqu'à 90s
      │      │
      │      │  ┌─────────────────────────────────────────────────────┐
      │      │  │              BOUCLE DE POLLING                      │
      │      │  │              (toutes les 3 secondes)                │
      │      │  └─────────────────────────────────────────────────────┘
      │      │
      │      ├── Lire participant.status depuis Firestore
      │      │
      │      ├── Si "connected" → return true ✓
      │      ├── Si "disconnected" → return false ✗
      │      ├── Si "no_answer" → return false ✗
      │      │
      │      ├── Si "amd_pending" et > 40s:
      │      │      └── return false (AMD timeout)
      │      │
      │      ├── Si session.status == "failed"/"cancelled":
      │      │      └── return false
      │      │
      │      └── Sinon: attendre 3s et recommencer
      │
      ├── 8. Si waitForConnection() == true:
      │      └── return true (succès!)
      │
      ├── 9. Si waitForConnection() == false et attempt < 3:
      │      └── Attendre backoff (15s + attempt*5s)
      │      └── Recommencer la boucle
      │
      └── 10. Si 3 tentatives échouées:
             └── return false

Si clientConnected == false:
      └── handleCallFailure(sessionId, "client_no_answer")
      └── FIN (provider jamais appelé)

Si clientConnected == true:
      └── Passer à PHASE 3
```

### Phase 3: Appel du Provider (avec retries)

```
session.status = "provider_connecting"
      │
      ▼
callParticipantWithRetries(sessionId, "provider", phone, ..., 15000)
      │
      │  (Même logique que Phase 2, mais avec délai initial de 15s)
      │
      ▼
Si providerConnected == false:
      └── handleCallFailure(sessionId, "provider_no_answer")
      └── Provider mis OFFLINE
      └── Client redirigé vers message d'excuse
      └── Remboursement

Si providerConnected == true:
      └── session.status = "both_connecting"
      └── Passer à PHASE 4
```

### Phase 4: Conférence Active

```
Les deux participants sont dans la conférence
      │
      ├── handleParticipantJoin() pour chaque participant
      │      └── Si AMD pas pending: status = "connected"
      │      └── Si les deux "connected": session.status = "active"
      │
      ▼
CONVERSATION EN COURS
      │
      │  Le client et le provider peuvent parler
      │  Durée max: metadata.maxDuration (défaut 20 min)
      │
      ▼
Un participant raccroche ou timeout
      │
      └── Passer à PHASE 5
```

### Phase 5: Fin d'appel et facturation

```
Webhook "completed" ou "participant-leave"
      │
      ▼
handleCallCompleted() ou handleParticipantLeave()
      │
      ├── 1. Mettre participant.status = "disconnected"
      │
      ├── 2. Calculer billingDuration:
      │      │
      │      │  Si client.connectedAt ET provider.connectedAt existent:
      │      │      bothConnectedAt = max(client.connectedAt, provider.connectedAt)
      │      │      billingDuration = now - bothConnectedAt
      │      │
      │      │  Sinon:
      │      │      billingDuration = 0
      │
      ├── 3. Décision de facturation:
      │      │
      │      ├── Si billingDuration >= 120 secondes:
      │      │      └── handleCallCompletion()
      │      │          └── Capturer le paiement Stripe
      │      │          └── session.status = "completed"
      │      │          └── Créer les factures
      │      │
      │      └── Si billingDuration < 120 secondes:
      │             └── handleEarlyDisconnection()
      │                  │
      │                  ├── Si BOTH connectedAt existent (appel réel):
      │                  │      └── handleCallFailure()
      │                  │      └── Remboursement
      │                  │
      │                  ├── Si retries épuisées:
      │                  │      └── handleCallFailure()
      │                  │      └── Remboursement
      │                  │
      │                  └── Sinon (retries restantes):
      │                         └── Ne rien faire
      │                         └── Laisser le retry continuer
      │
      └── FIN
```

---

## 5. Tous les scénarios possibles

### SCÉNARIO 1: Appel Réussi (Happy Path)

```
Conditions: Client répond, Provider répond, Appel > 2 min

Séquence:
1. [CLIENT] Appel placé → status: calling
2. [CLIENT] Téléphone sonne → status: ringing
3. [CLIENT] Répond → status: amd_pending
4. [CLIENT] AMD: human → status: connected ✓
5. [CLIENT] Rejoint conférence (musique d'attente)
6. [PROVIDER] Appel placé (après 15s) → status: calling
7. [PROVIDER] Téléphone sonne → status: ringing
8. [PROVIDER] Répond → status: amd_pending
9. [PROVIDER] AMD: human → status: connected ✓
10. [PROVIDER] Rejoint conférence
11. [SESSION] status: active
12. [CONVERSATION] 5 minutes de discussion
13. [CLIENT] Raccroche
14. billingDuration = 300s (> 120s)
15. Paiement CAPTURÉ ✓
16. [SESSION] status: completed

Résultat: SUCCÈS - Paiement capturé
```

### SCÉNARIO 2: Client ne répond pas (3 tentatives)

```
Conditions: Client ne décroche jamais

Séquence:
1. [CLIENT] Attempt 1: Appel → sonne 60s → timeout
2. [CLIENT] status: no_answer
3. Backoff 20s
4. [CLIENT] Attempt 2: Appel → sonne 60s → timeout
5. [CLIENT] status: no_answer
6. Backoff 25s
7. [CLIENT] Attempt 3: Appel → sonne 60s → timeout
8. [CLIENT] status: no_answer
9. 3 tentatives épuisées
10. handleCallFailure("client_no_answer")
11. Paiement REMBOURSÉ
12. [SESSION] status: failed
13. Provider JAMAIS appelé

Résultat: ÉCHEC - Remboursement, Provider jamais dérangé
```

### SCÉNARIO 3: Client = Répondeur (détecté par AMD)

```
Conditions: Répondeur du client

Séquence:
1. [CLIENT] Attempt 1: Appel → répondeur décroche
2. [CLIENT] status: amd_pending
3. AMD analyse le son...
4. AMD: machine_start (répondeur détecté!)
5. [CLIENT] status: no_answer
6. Appel raccroché IMMÉDIATEMENT (pas de message laissé)
7. Backoff 20s
8. [CLIENT] Attempt 2: même chose OU humain répond
9. ...

Résultat: Retry automatique, pas de message sur répondeur
```

### SCÉNARIO 4: Client répond, Provider ne répond pas

```
Conditions: Client OK, Provider ne décroche jamais

Séquence:
1. [CLIENT] Appel → répond → AMD: human → connected ✓
2. [CLIENT] Dans conférence (musique d'attente)
3. [PROVIDER] Attempt 1: Appel → sonne 60s → timeout
4. [PROVIDER] status: no_answer
5. Backoff
6. [PROVIDER] Attempt 2: timeout
7. [PROVIDER] Attempt 3: timeout
8. 3 tentatives épuisées
9. handleCallFailure("provider_no_answer")
10. [PROVIDER] Mis OFFLINE automatiquement
11. [CLIENT] Redirigé vers message d'excuse vocal
12. Paiement REMBOURSÉ
13. [SESSION] status: failed
14. Notification envoyée au provider

Résultat: ÉCHEC - Remboursement, Provider mis offline
```

### SCÉNARIO 5: Les deux connectés, Client raccroche < 2 min

```
Conditions: Appel établi mais < 2 minutes

Séquence:
1. [CLIENT] connected à T+0
2. [PROVIDER] connected à T+20s
3. bothConnectedAt = T+20s
4. [CLIENT] Raccroche à T+80s
5. billingDuration = 80s - 20s = 60s (< 120s)
6. handleEarlyDisconnection()
7. bothWereConnected = true (les deux ont connectedAt)
8. → handleCallFailure("early_disconnect_client")
9. Paiement REMBOURSÉ
10. [SESSION] status: failed

Résultat: ÉCHEC - Remboursement (appel trop court)
```

### SCÉNARIO 6: Les deux connectés, Provider raccroche < 2 min

```
Conditions: Provider raccroche avant 2 minutes

Séquence:
1. [CLIENT] connected
2. [PROVIDER] connected
3. bothConnectedAt défini
4. [PROVIDER] Raccroche après 45s de conversation
5. billingDuration = 45s (< 120s)
6. handleEarlyDisconnection()
7. bothWereConnected = true
8. → handleCallFailure("early_disconnect_provider")
9. Paiement REMBOURSÉ
10. [SESSION] status: failed

Résultat: ÉCHEC - Remboursement
```

### SCÉNARIO 7: Client connecté, Provider en cours, Client raccroche

```
Conditions: Client raccroche pendant que provider est appelé

Séquence:
1. [CLIENT] connected ✓ (dans conférence)
2. [PROVIDER] Attempt 1 en cours (sonne...)
3. [CLIENT] Raccroche après 30s d'attente
4. handleEarlyDisconnection()
5. clientWasConnected = true
6. providerWasConnected = false (jamais connecté!)
7. bothWereConnected = FALSE
8. retriesExhausted = false (provider attempt 1)
9. → NE PAS appeler handleCallFailure
10. Provider retries peuvent continuer...
11. MAIS conférence terminée (client parti)
12. [PROVIDER] Si répond → conférence vide

Résultat: COMPLEXE - Le provider retry continue mais ne sert à rien
Note: C'est un edge case, la conférence est terminée
```

### SCÉNARIO 8: AMD retourne "unknown"

```
Conditions: AMD ne peut pas déterminer humain/machine

Séquence:
1. [CLIENT] Appel → répond
2. [CLIENT] status: amd_pending
3. AMD analyse pendant 30s...
4. AMD: unknown (impossible à déterminer)
5. Traitement: "unknown" = HUMAIN (fix appliqué)
6. [CLIENT] status: connected ✓
7. Suite normale...

Résultat: Traité comme humain, appel continue
```

### SCÉNARIO 9: AMD callback jamais reçu (timeout)

```
Conditions: Problème réseau, AMD callback perdu

Séquence:
1. [CLIENT] Appel → répond
2. [CLIENT] status: amd_pending
3. waitForConnection() poll toutes les 3s...
4. AMD callback n'arrive jamais
5. Après 40s: AMD timeout détecté
6. waitForConnection() return false
7. Retry logic:
   - Check si appel "in-progress"
   - OUI + status "amd_pending"
   - → Ré-exécuter waitForConnection() (FIX 2026-01-16)
   - Si toujours pas de callback → attempt suivant

Résultat: Retry automatique, robuste aux pertes de callback
```

### SCÉNARIO 10: Webhook "completed" arrive en retard (stale)

```
Conditions: Webhook d'un ancien appel arrive pendant un retry

Séquence:
1. [PROVIDER] Attempt 1: callSid = CA_111 → timeout
2. [PROVIDER] Attempt 2: callSid = CA_222 → en cours
3. Webhook "completed" pour CA_111 arrive (en retard!)
4. handleCallCompleted() vérifie:
   - currentCallSid (Firestore) = CA_222
   - body.CallSid (webhook) = CA_111
   - CA_222 != CA_111 → STALE WEBHOOK!
5. Webhook ignoré
6. [PROVIDER] Attempt 2 continue normalement

Résultat: Webhook stale détecté et ignoré, pas de perturbation
```

### SCÉNARIO 11: Perte de connexion réseau pendant l'appel

```
Conditions: Connexion perdue pendant la conversation

Séquence:
1. [CLIENT] connected, [PROVIDER] connected
2. session.status: active
3. Connexion réseau perdue (client ou provider)
4. Twilio détecte la déconnexion
5. Webhook "completed" envoyé
6. handleCallCompleted()
7. Calcul billingDuration depuis bothConnectedAt
8. Si >= 120s → CAPTURÉ
9. Si < 120s → REMBOURSÉ

Résultat: Traité comme fin d'appel normale
```

### SCÉNARIO 12: Provider répond sur répondeur (faux positif AMD rare)

```
Conditions: AMD ne détecte pas le répondeur du provider

Séquence:
1. [CLIENT] connected ✓
2. [PROVIDER] Appel → répondeur répond
3. AMD: human (faux positif - rare)
4. [PROVIDER] status: connected
5. [PROVIDER] "Rejoint" la conférence
6. Message TTS joué sur le répondeur...
7. Répondeur raccroche après son bip
8. handleCallCompleted()
9. billingDuration probablement < 120s
10. Remboursement

Résultat: Remboursé car appel trop court
```

### SCÉNARIO 13: Double appel simultané au même provider

```
Conditions: Deux clients essaient d'appeler le même provider

Séquence:
1. [SESSION A] Appelle provider X
2. [SESSION B] Appelle provider X
3. Provider X est marqué BUSY par Session A
4. Session B voit provider BUSY...

Note: Ce scénario dépend de la logique métier de sélection
des providers, pas directement du système d'appel.

Résultat: Dépend de l'implémentation de la file d'attente
```

### SCÉNARIO 14: Appel annulé avant que ça sonne

```
Conditions: Annulation très rapide

Séquence:
1. [CLIENT] Appel placé → status: calling
2. Avant que ça sonne, session annulée
3. session.status = "cancelled"
4. waitForConnection() voit "cancelled"
5. return false
6. callParticipantWithRetries voit "cancelled"
7. return false (pas de retry)

Résultat: Arrêt propre, pas de facturation
```

### SCÉNARIO 15: Circuit breaker ouvert (trop d'échecs Twilio)

```
Conditions: > 5 échecs Twilio en 1 minute

Séquence:
1. Plusieurs appels échouent (problème Twilio)
2. Circuit breaker s'ouvre
3. Nouvel appel arrive
4. isCircuitOpen() = true
5. throw Error("Circuit breaker open")
6. Appel non placé
7. Après 1 minute, circuit se referme

Résultat: Protection contre les cascades d'échecs
```

---

## 6. Gestion des erreurs

### Idempotence

```typescript
// Chaque webhook vérifie s'il a déjà été traité
const idempotencyKey = `${callSid}_${callStatus}`;
if (alreadyProcessed(idempotencyKey)) {
  return; // Ignorer le doublon
}
```

### Stale Webhook Detection

```typescript
// Vérifier que le webhook est pour l'appel actuel
const currentCallSid = participant.callSid;
if (currentCallSid !== body.CallSid) {
  console.log("STALE WEBHOOK - ignoring");
  return;
}
```

### Early Disconnection Logic (FIX 2026-01-16)

```typescript
// Utiliser connectedAt au lieu de status actuel
const bothWereConnected =
  session.participants.client.connectedAt !== undefined &&
  session.participants.provider.connectedAt !== undefined;

if (bothWereConnected || retriesExhausted) {
  await handleCallFailure(...);
} else {
  // Laisser les retries continuer
}
```

### AMD Pending Recovery (FIX 2026-01-16)

```typescript
// Si AMD pending et appel in-progress, attendre au lieu de créer nouvel appel
if (participant.status === "amd_pending") {
  const amdResult = await this.waitForConnection(...);
  if (amdResult) return true;
  continue; // Retry si timeout
}
```

---

## 7. Configuration

```typescript
const CALL_CONFIG = {
  MAX_RETRIES: 3,              // Nombre max de tentatives par participant
  CALL_TIMEOUT: 60,            // Timeout d'appel Twilio (secondes)
  CONNECTION_WAIT_TIME: 90000, // Timeout waitForConnection (ms)
  MIN_CALL_DURATION: 120,      // Durée min pour capture (secondes)
  AMD_MAX_WAIT_SECONDS: 40,    // Timeout AMD callback (secondes)
};

// Backoff entre retries
const backoffMs = 15000 + (attempt * 5000);
// Attempt 1 → 2: 20s
// Attempt 2 → 3: 25s
```

---

## 8. Logs à surveiller

### Logs de succès
```
📞 [WORKFLOW] ÉTAPE 1: APPEL CLIENT
📞 [WORKFLOW] CLIENT RESULT: ✅ CONNECTÉ
📞 [WORKFLOW] ÉTAPE 2: APPEL PROVIDER
📞 [WORKFLOW] PROVIDER RESULT: ✅ CONNECTÉ
🎯 AMD returned "human" - Setting status to "connected"
👋 BOTH CONNECTED! Setting session status to "active"
🏁 billingDuration >= 120s → handleCallCompletion (capture payment)
```

### Logs d'alerte
```
⚠️ STALE WEBHOOK DETECTED!
⚠️ AMD pending for Xs > 40s limit
⚠️ AMD returned "unknown" - treating as HUMAN
❌ CIRCUIT BREAKER OPEN
```

### Logs d'échec
```
📞 [WORKFLOW] CLIENT RESULT: ❌ NON CONNECTÉ
🔥 handleCallFailure CALLED - reason: client_no_answer
🔥 handleCallFailure CALLED - reason: provider_no_answer
📄 EARLY DISCONNECT DETECTED
📄 🔴 DECISION: CALL handleCallFailure
```

### Logs de décision retry
```
📄 [handleEarlyDisconnection] 🔍 RETRY DECISION ANALYSIS
📄   bothWereConnected (ACTUAL CALL): false
📄   retriesExhausted: false
📄   🟢 DECISION: SKIP handleCallFailure
```

---

## Annexe: Commande pour voir les logs en temps réel

```bash
gcloud logging read "resource.type=cloud_run_revision AND (resource.labels.service_name=twilioamdtwiml OR resource.labels.service_name=twiliocallwebhook OR resource.labels.service_name=twilioconferencewebhook OR resource.labels.service_name=executecalltask)" --project=sos-urgently-ac307 --limit=100 --format="value(textPayload)"
```

---

*Document généré le 2026-01-16 - Version complète avec tous les scénarios*
