# ANALYSE COMPLETE - SYSTEME DE PAIEMENT SOS-EXPAT
## Rapport genere par une equipe de 10 agents IA specialises
## Date: 28 decembre 2024

---

# TABLE DES MATIERES

1. [Synthese Executive](#1-synthese-executive)
2. [Architecture Actuelle](#2-architecture-actuelle)
3. [Systeme Stripe Connect](#3-systeme-stripe-connect)
4. [Integration Twilio](#4-integration-twilio)
5. [Flux de Paiement](#5-flux-de-paiement)
6. [Systeme de Remboursement](#6-systeme-de-remboursement)
7. [Configuration Tarifaire](#7-configuration-tarifaire)
8. [Structure des Donnees Firestore](#8-structure-des-donnees-firestore)
9. [Webhooks et Callbacks](#9-webhooks-et-callbacks)
10. [Comparaison avec le Plan Ideal](#10-comparaison-avec-le-plan-ideal)
11. [Ecarts Identifies](#11-ecarts-identifies)
12. [Fichiers a Creer/Modifier](#12-fichiers-a-creer-modifier)
13. [Recommandations Prioritaires](#13-recommandations-prioritaires)
14. [Annexes Techniques](#14-annexes-techniques)

---

# 1. SYNTHESE EXECUTIVE

## 1.1 Etat Actuel

Le systeme SOS-Expat utilise actuellement **Stripe Connect uniquement** avec un modele de **Destination Charges** pour le split automatique des paiements. L'integration avec **Twilio** gere les appels telephoniques/video avec facturation conditionnelle basee sur la duree d'appel (minimum 2 minutes).

## 1.2 Ecart Majeur

| Aspect | Actuel | Plan Ideal |
|--------|--------|------------|
| **Couverture geographique** | ~46 pays (Stripe Connect) | 197 pays (Stripe + PayPal) |
| **Gateway de paiement** | Stripe uniquement | Stripe + PayPal Commerce Platform |

## 1.3 Points Forts Actuels

- Split automatique via Destination Charges
- Integration Twilio complete avec retries
- Regle des 2 minutes bien implementee
- Configuration tarifaire flexible via admin
- Remboursements avec reverse_transfer

## 1.4 Manques Critiques

- Pas de PayPal (151 pays exclus)
- Pas de comptes "shell" (KYC requis avant paiements)
- Pas de systeme de relances automatiques
- Pas de gestion des fonds non reclames

---

# 2. ARCHITECTURE ACTUELLE

## 2.1 Stack Technique

```
+-------------------------------------------------------------------------+
|                        ARCHITECTURE ACTUELLE                            |
+-------------------------------------------------------------------------+
|                                                                         |
|  Frontend (React/Vite)                                                  |
|  └── sos/src/                                                           |
|      ├── pages/checkout/                                                |
|      ├── components/payment/                                            |
|      └── services/stripe/                                               |
|                                                                         |
|  Backend (Firebase Cloud Functions)                                     |
|  └── sos/firebase/functions/src/                                        |
|      ├── StripeManager.ts           <- Gestionnaire paiements           |
|      ├── TwilioCallManager.ts       <- Gestionnaire appels              |
|      ├── createPaymentIntent.ts     <- Creation PaymentIntent           |
|      ├── stripeAutomaticKyc.ts      <- KYC Stripe Connect               |
|      ├── Webhooks/                  <- Webhooks Stripe + Twilio         |
|      └── services/pricingService.ts <- Configuration tarifs             |
|                                                                         |
|  Database (Firestore)                                                   |
|      ├── payments/                  <- Historique paiements             |
|      ├── call_sessions/             <- Sessions d'appel                 |
|      ├── sos_profiles/              <- Profils prestataires             |
|      ├── invoice_records/           <- Factures generees                |
|      ├── transfers/                 <- Transferts Stripe                |
|      └── admin_config/pricing       <- Configuration tarifs             |
|                                                                         |
+-------------------------------------------------------------------------+
```

## 2.2 Fichiers Cles Identifies

| Fichier | Lignes | Role |
|---------|--------|------|
| `StripeManager.ts` | ~1073 | Creation/capture/remboursement PaymentIntent |
| `TwilioCallManager.ts` | ~2161 | Orchestration complete des appels |
| `pricingService.ts` | ~195 | Configuration des tarifs |
| `stripeAutomaticKyc.ts` | ~208 | Onboarding Stripe Connect |
| `twilioWebhooks.ts` | ~300 | Webhooks appels Twilio |
| `createPaymentIntent.ts` | ~762 | Creation PaymentIntent avec validation |
| `index.ts` | ~2500+ | Export des Cloud Functions + Webhooks |

## 2.3 Dependances Principales

```json
{
  "stripe": "^14.x",
  "twilio": "^4.x",
  "firebase-admin": "^12.x",
  "firebase-functions": "^5.x"
}
```

---

# 3. SYSTEME STRIPE CONNECT

## 3.1 Type de Compte Actuel

Le systeme utilise **Stripe Connect Custom Accounts** :

```typescript
// Fichier: stripeAutomaticKyc.ts
const account = await stripe.accounts.create({
  type: "custom",              // Type Custom (pas Express)
  country: country || "FR",    // France par defaut
  business_type: "individual",
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  tos_acceptance: {
    date: Math.floor(Date.now() / 1000),
    ip: request.rawRequest.ip
  }
});
```

## 3.2 Flux d'Onboarding Prestataire

```
1. createCustomAccount()
   └── Cree compte Stripe Custom
   └── Stocke stripeAccountId dans sos_profiles

2. submitKycData()
   └── Soumet donnees d'identite
   └── Adresse, date de naissance, numero d'ID

3. addBankAccount()
   └── Ajoute IBAN/compte bancaire
   └── Permet les payouts

4. checkKycStatus()
   └── Verifie chargesEnabled et payoutsEnabled
   └── Met a jour kycStatus dans Firestore
```

## 3.3 Champs Stockes dans sos_profiles (Actuel)

```typescript
{
  stripeAccountId?: string;           // acct_xxx
  kycStatus?: 'pending' | 'verified' | 'restricted';
  kycSubmitted?: boolean;
  bankAccountAdded?: boolean;
  bankAccountId?: string;
  verificationStatus?: {
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirements: object;
  };
}
```

## 3.4 Pays Supportes par Stripe Connect

**46 pays** dont:
- Europe (31): France, Allemagne, Espagne, Italie, Belgique, Pays-Bas, etc.
- Asie-Pacifique (7): Australie, Japon, Singapour, Hong Kong, etc.
- Ameriques (4): USA, Canada, Bresil, Mexique
- Moyen-Orient (1): Emirats Arabes Unis
- Preview (3): Inde, Indonesie, Thailande

---

# 4. INTEGRATION TWILIO

## 4.1 Architecture Twilio

```
+-------------------------------------------------------------------------+
|                         FLUX TWILIO                                     |
+-------------------------------------------------------------------------+
|                                                                         |
|  Frontend                    Cloud Functions              Twilio        |
|      |                            |                          |          |
|      |  createAndScheduleCall     |                          |          |
|      |--------------------------->|                          |          |
|      |                            |                          |          |
|      |                            |  twilioClient.calls.create()        |
|      |                            |------------------------->|          |
|      |                            |                          |          |
|      |                            |  Webhook: ringing        |          |
|      |                            |<-------------------------|          |
|      |                            |                          |          |
|      |                            |  Webhook: answered       |          |
|      |                            |<-------------------------|          |
|      |                            |                          |          |
|      |                            |  Webhook: completed      |          |
|      |                            |<-------------------------|          |
|      |                            |                          |          |
|      |                            |  handleCallCompletion()  |          |
|      |                            |  (capture ou refund)     |          |
|                                                                         |
+-------------------------------------------------------------------------+
```

## 4.2 Fichier Principal: TwilioCallManager.ts

**Classe**: `TwilioCallManager` (~2161 lignes)

**Methodes Cles**:

| Methode | Fonction |
|---------|----------|
| `startOutboundCall()` | Demarre un appel (client ET prestataire) |
| `initiateCallSequence()` | Cree la sequence d'appel avec delai |
| `executeCallSequence()` | Lance les appels avec retries (3 tentatives) |
| `callParticipantWithRetries()` | Appelle un participant avec 3 retries |
| `handleCallCompletion()` | Traite la fin d'appel reussie |
| `handleCallFailure()` | Traite les echecs (no-answer, busy, etc.) |
| `capturePaymentForSession()` | Capture le paiement apres appel >= 2min |
| `shouldCapturePayment()` | Decide si on capture ou rembourse |
| `createInvoices()` | Genere les factures plateforme + prestataire |

## 4.3 Etats d'une Session d'Appel

```typescript
CallSessionState {
  id: string;
  status: 'pending' | 'provider_connecting' | 'client_connecting' |
          'both_connecting' | 'active' | 'completed' | 'failed' | 'cancelled';

  participants: {
    provider: { phone, status, callSid, connectedAt, disconnectedAt, attemptCount }
    client: { phone, status, callSid, connectedAt, disconnectedAt, attemptCount }
  };

  conference: {
    sid, name, startedAt, endedAt, duration,
    recordingUrl, recordingSid
  };

  payment: {
    intentId, status, amount, capturedAt, refundedAt,
    transferId, transferAmount, transferStatus
  };

  metadata: {
    providerId, clientId, serviceType,
    maxDuration, createdAt, invoicesCreated
  };
}
```

## 4.4 Conditions de Facturation

| Condition | Resultat | Action |
|-----------|----------|--------|
| Appel >= 120 secondes | CAPTURE | Paiement capture, split automatique |
| Appel < 120 secondes | REFUND | Remboursement total client |
| Client ne repond pas (3 tentatives) | CANCEL | Annulation PaymentIntent |
| Provider ne repond pas (3 tentatives) | CANCEL | Annulation + provider mis offline |
| Erreur systeme | CANCEL/REFUND | Selon statut du PaymentIntent |

## 4.5 Code Critique: Regle des 2 Minutes

```typescript
// TwilioCallManager.ts:1317-1383
shouldCapturePayment(session: CallSessionState, duration?: number): boolean {
  // Calcule la duree reelle avec fallbacks multiples
  let actualDuration = duration || session.conference.duration || 0;

  // Fallback 1: Calcul a partir des timestamps de conference
  if (actualDuration === 0 && session.conference.startedAt && session.conference.endedAt) {
    actualDuration = Math.floor((endTime - startTime) / 1000);
  }

  // Fallback 2: Calcul a partir des timestamps des participants
  if (actualDuration === 0) {
    const clientConnected = client.connectedAt?.toDate().getTime();
    const providerConnected = provider.connectedAt?.toDate().getTime();
    const startTime = Math.min(clientConnected, providerConnected);

    const clientDisconnected = client.disconnectedAt?.toDate().getTime();
    const providerDisconnected = provider.disconnectedAt?.toDate().getTime();
    const endTime = Math.max(clientDisconnected, providerDisconnected);

    actualDuration = Math.floor((endTime - startTime) / 1000);
  }

  // CRITERE 1 : Duree minimum 120 secondes (2 minutes)
  if (actualDuration < 120) return false;

  // CRITERE 2 : Payment status doit etre 'authorized' (requires_capture)
  if (session.payment.status !== 'authorized') return false;

  return true; // CAPTURE!
}
```

## 4.6 Systeme de Retries

```typescript
// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [20000, 25000, 0]; // 20s, 25s, puis fin

async callParticipantWithRetries(sessionId, participantType, phoneNumber) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Verifier si session deja failed/cancelled
    const sessionCheck = await this.getCallSession(sessionId);
    if (sessionCheck?.status === 'failed' || sessionCheck?.status === 'cancelled') {
      return false;
    }

    // Incrementer attempt count
    await this.incrementAttemptCount(sessionId, participantType);

    // Creer l'appel Twilio
    const call = await twilioClient.calls.create({
      to: phoneNumber,
      from: TWILIO_PHONE_NUMBER,
      twiml: twiml,
      statusCallback: `${base}/twilioCallWebhook`,
      statusCallbackEvent: ['ringing', 'answered', 'completed', 'failed', 'busy', 'no-answer'],
      timeout: 60,
      machineDetection: 'Enable'
    });

    // Attendre la connexion (90 secondes)
    const connected = await this.waitForConnection(sessionId, participantType, attempt);

    if (connected) return true;

    // Attendre avant retry
    if (attempt < MAX_RETRIES) {
      await this.delay(RETRY_DELAYS[attempt - 1]);
    }
  }

  return false; // Echec apres 3 tentatives
}
```

---

# 5. FLUX DE PAIEMENT

## 5.1 Flux Principal (Destination Charges)

```
+-------------------------------------------------------------------------+
|                     FLUX PAIEMENT ACTUEL                                |
+-------------------------------------------------------------------------+

CLIENT                    SOS-EXPAT                   PRESTATAIRE
   |                          |                            |
   |  Selection prestataire   |                            |
   |------------------------->|                            |
   |                          |                            |
   |  (1) CreatePaymentIntent |                            |
   |------------------------->|                            |
   |  (capture_method:manual) |                            |
   |  (transfer_data -> acct_)|                            |
   |                          |                            |
   |  client_secret retourne  |                            |
   |<-------------------------|                            |
   |                          |                            |
   |  (2) Stripe Elements     |                            |
   |  (paiement CB)           |                            |
   |------------------------->|                            |
   |                          |                            |
   |  Status: requires_capture|                            |
   |                          |                            |
   |  ============ APPEL TWILIO (>= 2 min requis) =========|
   |                          |                            |
   |               (3) Capture automatique                 |
   |                    (si duree >= 120s)                 |
   |                          |                            |
   |              +-----------+-----------+                |
   |              V                       V                |
   |     +---------------+       +---------------+         |
   |     | SOS-EXPAT     |       | PRESTATAIRE   |         |
   |     | recoit 19E    |       | recoit 30E    |         |
   |     | (frais de     |       | (via transfer_|         |
   |     |  connexion)   |       |  data auto)   |         |
   |     +---------------+       +---------------+         |
   |                                                       |
```

## 5.2 Creation du PaymentIntent

```typescript
// Fichier: StripeManager.ts:251-438
async createPaymentIntent(data: StripePaymentData, secretKey?: string): Promise<PaymentResult> {
  // 1. Validation de la configuration
  this.validateConfiguration(secretKey);

  // 2. Anti-doublons
  const existingPayment = await this.findExistingPayment(data.clientId, data.providerId, data.callSessionId);
  if (existingPayment) {
    throw new HttpsError('failed-precondition', 'Paiement deja existe');
  }

  // 3. Validation des donnees
  this.validatePaymentData(data);
  await this.validateUsers(data.clientId, data.providerId);

  // 4. Conversion en centimes
  const amountCents = toCents(data.amount);
  const commissionAmountCents = toCents(commissionEuros);
  const providerAmountCents = toCents(data.providerAmount);

  // 5. Verification du compte Connect (si Destination Charges)
  const useDestinationCharges = Boolean(data.destinationAccountId);

  if (useDestinationCharges) {
    const connectedAccount = await this.stripe.accounts.retrieve(data.destinationAccountId);

    if (!connectedAccount.charges_enabled) {
      throw new HttpsError('failed-precondition',
        'Le compte Stripe du prestataire ne peut pas recevoir de paiements');
    }
  }

  // 6. Construction des parametres
  const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
    amount: amountCents,
    currency: currency,
    capture_method: 'manual',  // IMPORTANT: Capture apres appel >= 2 min
    automatic_payment_methods: { enabled: true },
    metadata: {
      clientId: data.clientId,
      providerId: data.providerId,
      serviceType: data.serviceType,
      callSessionId: data.callSessionId,
      useDestinationCharges: String(useDestinationCharges),
      // ...
    },
    description: `Service ${data.serviceType} - ${data.amount} ${currency}`,
    statement_descriptor_suffix: 'SOS EXPAT',
    receipt_email: await this.getClientEmail(data.clientId),
  };

  // 7. Ajout de transfer_data pour Destination Charges
  if (useDestinationCharges && data.destinationAccountId) {
    paymentIntentParams.transfer_data = {
      destination: data.destinationAccountId,
      amount: providerAmountCents,  // Montant pour le prestataire
    };
    paymentIntentParams.on_behalf_of = data.destinationAccountId;
  }

  // 8. Creation chez Stripe
  const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);

  // 9. Sauvegarde en Firestore
  await this.savePaymentRecord(paymentIntent, data, cents);

  return {
    success: true,
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
  };
}
```

## 5.3 Capture du Paiement

```typescript
// Fichier: StripeManager.ts:441-571
async capturePayment(paymentIntentId: string, sessionId?: string, secretKey?: string): Promise<PaymentResult> {
  // 1. Verification du statut
  const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== 'requires_capture') {
    throw new HttpsError('failed-precondition',
      `Impossible de capturer un paiement au statut: ${paymentIntent.status}`);
  }

  // 2. Capture le paiement
  // Avec Destination Charges, le transfert est cree automatiquement
  const captured = await this.stripe.paymentIntents.capture(paymentIntentId);

  // 3. Recuperer l'ID du transfert auto-cree
  let transferId: string | undefined;

  // Methode 1: Directement sur le PaymentIntent
  if (captured.transfer) {
    transferId = typeof captured.transfer === 'string'
      ? captured.transfer
      : captured.transfer.id;
  }

  // Methode 2: Via latest_charge
  if (!transferId && captured.latest_charge) {
    const charge = await this.stripe.charges.retrieve(chargeId, {
      expand: ['transfer'],
    });
    if (charge.transfer) {
      transferId = typeof charge.transfer === 'string'
        ? charge.transfer
        : charge.transfer.id;
    }
  }

  // 4. Mise a jour Firestore
  await this.db.collection('payments').doc(paymentIntentId).update({
    status: captured.status,
    capturedAt: serverTimestamp(),
    capturedAmount: captured.amount_received,
    transferId: transferId,
  });

  // 5. Enregistrer le transfert
  if (transferId) {
    await this.db.collection('transfers').add({
      transferId: transferId,
      paymentIntentId: paymentIntentId,
      providerId: captured.metadata?.providerId,
      amount: captured.amount_received,
      type: 'destination_charge_auto',
      createdAt: serverTimestamp(),
    });
  }

  return {
    success: true,
    paymentIntentId: captured.id,
    capturedAmount: captured.amount_received,
    transferId: transferId,
  };
}
```

## 5.4 Limites et Validations

```typescript
// Rate Limiting
RATE_LIMIT: {
  WINDOW_MS: 10 * 60 * 1000,  // 10 minutes
  MAX_REQUESTS: 6              // 6 requetes max
}

// Montants
AMOUNT_LIMITS: {
  EUR: { MIN: 1, MAX: 500, MAX_DAILY: 2000 },
  USD: { MIN: 1, MAX: 600, MAX_DAILY: 2400 }
}

// Validation des montants
if (amount < 5) throw new HttpsError('failed-precondition', 'Montant minimum de 5E requis');
if (amount > 2000) throw new HttpsError('failed-precondition', 'Montant maximum de 2000E depasse');

// Coherence des montants
const calculatedTotal = commission + providerAmount;
const delta = Math.abs(calculatedTotal - amount);
if (delta > 1) {
  throw new HttpsError('failed-precondition', `Incoherence montants: ${amount}E != ${calculatedTotal}E`);
}
```

---

# 6. SYSTEME DE REMBOURSEMENT

## 6.1 Fonction refundPayment()

```typescript
// Fichier: StripeManager.ts:573-696
async refundPayment(
  paymentIntentId: string,
  reason: string,
  sessionId?: string,
  amount?: number,  // Optionnel pour remboursement partiel
  secretKey?: string
): Promise<PaymentResult> {
  // 1. Verifier si Destination Charges etait utilise
  const paymentDoc = await this.db.collection('payments').doc(paymentIntentId).get();
  const usedDestinationCharges = paymentDoc.data()?.useDestinationCharges === true;
  const wasTransferred = !!paymentDoc.data()?.transferId;

  // 2. Normaliser la raison
  const allowedReasons = ['duplicate', 'fraudulent', 'requested_by_customer'];
  const normalizedReason = allowedReasons.includes(reason) ? reason : undefined;

  // 3. Construire les parametres de remboursement
  const refundData: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
    reason: normalizedReason,
    metadata: {
      sessionId: sessionId || '',
      refundReason: reason,
      usedDestinationCharges: String(usedDestinationCharges),
    },
  };

  // 4. CRITIQUE: Inverser le transfert au prestataire
  if (usedDestinationCharges || wasTransferred) {
    refundData.reverse_transfer = true;  // <-- IMPORTANT!
  }

  // 5. Montant partiel (optionnel)
  if (amount !== undefined) {
    refundData.amount = toCents(amount);
  }

  // 6. Creer le remboursement
  const refund = await this.stripe.refunds.create(refundData);

  // 7. Mise a jour Firestore
  await this.db.collection('payments').doc(paymentIntentId).update({
    status: 'refunded',
    refundId: refund.id,
    refundReason: reason,
    refundedAt: serverTimestamp(),
    transferReversed: usedDestinationCharges || wasTransferred,
  });

  // 8. Mettre a jour les factures associees
  if (sessionId) {
    const invoicesQuery = await this.db.collection('invoice_records')
      .where('callId', '==', sessionId)
      .get();

    invoicesQuery.docs.forEach((invoiceDoc) => {
      invoiceDoc.ref.update({
        status: 'refunded',
        refundedAt: serverTimestamp(),
        refundReason: reason,
        refundId: refund.id,
      });
    });
  }

  return { success: true, paymentIntentId };
}
```

## 6.2 Fonction cancelPayment()

```typescript
// Fichier: StripeManager.ts:800-854
async cancelPayment(
  paymentIntentId: string,
  reason: string,
  sessionId?: string,
  secretKey?: string
): Promise<PaymentResult> {
  const allowedReasons = ['duplicate', 'fraudulent', 'requested_by_customer', 'abandoned'];
  const normalized = allowedReasons.includes(reason) ? reason : undefined;

  const canceled = await this.stripe.paymentIntents.cancel(paymentIntentId, {
    cancellation_reason: normalized,
  });

  await this.db.collection('payments').doc(paymentIntentId).update({
    status: canceled.status,
    cancelReason: reason,
    canceledAt: serverTimestamp(),
    sessionId: sessionId || null,
  });

  return { success: true, paymentIntentId: canceled.id };
}
```

## 6.3 Webhook transfer.reversed

```typescript
// Fichier: index.ts:2013-2110
const handleTransferReversed = async (
  transfer: Stripe.Transfer,
  database: admin.firestore.Firestore
) => {
  // 1. Recuperer le callSessionId
  const transferDoc = await database.collection('transfers').doc(transfer.id).get();
  let callSessionId = transferDoc.data()?.callSessionId;

  // Fallback via metadata
  if (!callSessionId) {
    callSessionId = transfer.metadata?.callSessionId;
  }

  // Fallback via payment
  if (!callSessionId && transfer.source_transaction) {
    const paymentQuery = await database
      .collection('payments')
      .where('stripePaymentIntentId', '==', transfer.source_transaction)
      .limit(1)
      .get();
    callSessionId = paymentQuery.docs[0].data().callSessionId;
  }

  // 2. Mettre a jour call_sessions
  if (callSessionId) {
    const isFullyReversed = transfer.reversed;
    const newStatus = isFullyReversed ? 'reversed' : 'partially_reversed';

    await database.collection('call_sessions').doc(callSessionId).update({
      'payment.transferStatus': newStatus,
      'payment.transferAmountReversed': transfer.amount_reversed,
      'payment.transferReversedAt': serverTimestamp(),
      'payment.transferFullyReversed': isFullyReversed,
    });
  }

  // 3. Mettre a jour transfers collection
  await database.collection('transfers').doc(transfer.id).update({
    status: transfer.reversed ? 'reversed' : 'partially_reversed',
    reversed: transfer.reversed,
    amountReversed: transfer.amount_reversed,
    reversedAt: serverTimestamp(),
  });
};
```

## 6.4 Scenarios de Remboursement

### Scenario 1: Remboursement Integral Post-Paiement

```
1. Admin appelle refundPayment(paymentIntentId, 'requested_by_customer')
2. Stripe cree refund avec reverse_transfer=true
3. Webhook transfer.reversed declenche
4. Firestore mis a jour:
   - payments[id].status = 'refunded'
   - transfers[id].status = 'reversed'
   - call_sessions[id].payment.transferReversed = true
5. Client rembourse (4-5 jours ouvrables)
6. Prestataire: montant recupere de son compte Stripe
```

### Scenario 2: Appel < 2 Minutes

```
1. Appel se termine a 90 secondes
2. shouldCapturePayment() retourne false
3. processRefund() appele automatiquement
4. PaymentIntent annule (si requires_capture) ou rembourse (si captured)
5. Factures creees avec status 'refunded'
```

### Scenario 3: Provider No-Answer

```
1. 3 tentatives d'appel echouent
2. handleCallFailure() declenche
3. Session status -> 'failed'
4. cancelPayment() appele
5. Provider mis offline automatiquement
```

---

# 7. CONFIGURATION TARIFAIRE

## 7.1 Configuration par Defaut

```typescript
// Fichier: pricingService.ts
const DEFAULT_PRICING_CONFIG: PricingConfig = {
  lawyer: {
    eur: {
      totalAmount: 49,           // Client paie
      connectionFeeAmount: 19,   // SOS-Expat recoit
      providerAmount: 30,        // Avocat recoit
      duration: 25,              // Duree max (min)
      currency: 'eur'
    },
    usd: {
      totalAmount: 55,
      connectionFeeAmount: 25,
      providerAmount: 30,
      duration: 25,
      currency: 'usd'
    }
  },
  expat: {
    eur: {
      totalAmount: 19,           // Client paie
      connectionFeeAmount: 9,    // SOS-Expat recoit
      providerAmount: 10,        // Expat recoit
      duration: 35,              // Duree max (min)
      currency: 'eur'
    },
    usd: {
      totalAmount: 25,
      connectionFeeAmount: 15,
      providerAmount: 10,
      duration: 35,
      currency: 'usd'
    }
  }
};
```

## 7.2 Configuration Firestore

**Collection**: `admin_config/pricing`

```typescript
interface PricingDoc {
  // Prix de base par service/devise
  expat?: {
    eur?: PricingNode;
    usd?: PricingNode;
  };
  lawyer?: {
    eur?: PricingNode;
    usd?: PricingNode;
  };

  // Overrides / promotions
  overrides?: {
    settings?: { stackableDefault?: boolean };
    expat?: {
      eur?: PricingOverrideNode;
      usd?: PricingOverrideNode;
    };
    lawyer?: {
      eur?: PricingOverrideNode;
      usd?: PricingOverrideNode;
    };
  };

  // Metadonnees d'audit
  updatedAt?: Timestamp;
  updatedBy?: string;
}

interface PricingNode {
  connectionFeeAmount: number;  // Frais plateforme
  providerAmount: number;       // Part prestataire
  totalAmount: number;          // Total client
  currency: 'eur' | 'usd';
  duration: number;             // Duree en minutes
}

interface PricingOverrideNode {
  enabled?: boolean;
  startsAt?: Timestamp;
  endsAt?: Timestamp;
  connectionFeeAmount?: number;
  providerAmount?: number;
  totalAmount?: number;
  stackableWithCoupons?: boolean;
  label?: string;               // Ex: "Promo rentree"
}
```

## 7.3 Systeme de Cache

```typescript
class PricingConfigCache {
  private cache: PricingConfig | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async get(): Promise<PricingConfig> {
    const now = Date.now();

    if (this.cache && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cache;
    }

    this.cache = await getPricingConfig();
    this.lastFetch = now;
    return this.cache;
  }
}
```

## 7.4 Frais Stripe Reels

| Service | Client paie | Frais Stripe (~2%) | Plateforme recoit | Commission nette |
|---------|-------------|-------------------|-------------------|------------------|
| Avocat EUR | 49 EUR | ~0.99 EUR | ~48.01 EUR | ~29 EUR |
| Avocat USD | 55 USD | ~1.10 USD | ~53.90 USD | ~29 USD |
| Expat EUR | 19 EUR | ~0.40 EUR | ~18.60 EUR | ~9.60 EUR |
| Expat USD | 25 USD | ~0.50 USD | ~24.50 USD | ~14.50 USD |

---

# 8. STRUCTURE DES DONNEES FIRESTORE

## 8.1 Collection: payments

```typescript
interface PaymentDoc {
  stripePaymentIntentId: string;
  clientId: string;
  providerId: string;

  // Montants en centimes
  amount: number;
  commissionAmount: number;
  providerAmount: number;

  // Montants en euros (lecture facile)
  amountInEuros: number;
  commissionAmountEuros: number;
  providerAmountEuros: number;

  currency: 'eur' | 'usd';
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  status: string;  // Stripe PaymentIntent status
  clientSecret?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  capturedAt?: Timestamp;
  refundedAt?: Timestamp;
  canceledAt?: Timestamp;

  // Metadata
  metadata?: Record<string, unknown>;
  environment: 'development' | 'production';
  mode: 'live' | 'test';
  callSessionId?: string;

  // Destination Charges
  useDestinationCharges: boolean;
  destinationAccountId?: string;
  transferAmountCents?: number;
  transferId?: string;
  transferReversed?: boolean;

  // Refund
  refundId?: string;
  refundReason?: string;
}
```

## 8.2 Collection: call_sessions

```typescript
interface CallSession {
  id: string;
  status: 'pending' | 'provider_connecting' | 'client_connecting' |
          'both_connecting' | 'active' | 'completed' | 'failed' | 'cancelled';

  participants: {
    provider: {
      phone: string;
      status: 'pending' | 'calling' | 'connected' | 'disconnected' | 'failed';
      callSid?: string;
      connectedAt?: Timestamp;
      disconnectedAt?: Timestamp;
      attemptCount: number;
    };
    client: {
      phone: string;
      status: 'pending' | 'calling' | 'connected' | 'disconnected' | 'failed';
      callSid?: string;
      connectedAt?: Timestamp;
      disconnectedAt?: Timestamp;
      attemptCount: number;
    };
  };

  conference: {
    sid?: string;
    name: string;
    startedAt?: Timestamp;
    endedAt?: Timestamp;
    duration?: number;  // secondes
    recordingSid?: string;
    recordingUrl?: string;
  };

  payment: {
    intentId: string;
    status: 'pending' | 'authorized' | 'captured' | 'refunded' | 'cancelled';
    amount: number;
    capturedAt?: Timestamp;
    refundedAt?: Timestamp;
    transferId?: string;
    transferAmount?: number;
    transferStatus?: string;
    transferReversed?: boolean;
  };

  metadata: {
    providerId: string;
    clientId: string;
    serviceType: 'lawyer_call' | 'expat_call';
    providerType: 'lawyer' | 'expat';
    maxDuration: number;  // secondes
    createdAt: Timestamp;
    invoicesCreated?: boolean;
  };
}
```

## 8.3 Collection: sos_profiles

```typescript
interface SosProfile {
  userId: string;
  userType: 'lawyer' | 'expat';

  // Informations personnelles
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Stripe Connect (ACTUEL)
  stripeAccountId?: string;      // acct_xxx
  kycStatus?: 'pending' | 'verified' | 'restricted';
  kycSubmitted?: boolean;
  bankAccountAdded?: boolean;
  bankAccountId?: string;
  verificationStatus?: {
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirements: object;
  };

  // Statut
  isOnline: boolean;
  status: 'active' | 'pending' | 'suspended' | 'blocked';

  // Localisation
  residenceCountry?: string;
  practiceCountries?: string[];

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 8.4 Collection: transfers

```typescript
interface TransferDoc {
  transferId: string;          // Stripe tr_xxx
  paymentIntentId: string;
  providerId: string;
  stripeAccountId: string;     // acct_xxx destination

  amount: number;              // EUR montant
  amountCents: number;
  currency: string;

  sessionId: string;
  type: 'destination_charge_auto' | 'manual';
  status: 'created' | 'completed' | 'reversed' | 'partially_reversed' | 'failed';

  reversed?: boolean;
  amountReversed?: number;
  reversedAt?: Timestamp;

  createdAt: Timestamp;
  metadata?: object;
  environment: 'development' | 'production';
}
```

## 8.5 Collection: invoice_records

```typescript
interface InvoiceRecord {
  invoiceNumber: string;        // PLT-xxx ou PRV-xxx
  type: 'platform' | 'provider';
  callId: string;               // Session ID

  amount: number;
  currency: 'EUR' | 'USD';
  status: 'issued' | 'refunded';

  clientId: string;
  providerId: string;

  createdAt: Date;
  refundedAt?: Timestamp;
  refundReason?: string;
  refundId?: string;
}
```

## 8.6 Collection: admin_config

```typescript
// Document: admin_config/pricing
// Voir section 7.2

// Document: admin_config/payment_settings (A CREER)
interface PaymentSettings {
  gateways: {
    stripe: {
      enabled: boolean;
      mode: 'test' | 'live';
      countries: string[];  // 46 pays
    };
    paypal: {
      enabled: boolean;
      mode: 'sandbox' | 'live';
      countries: string[];  // 151 pays
    };
  };

  priority: ['stripe', 'paypal'];  // Ordre de preference
}

// Document: admin_config/unclaimed_funds_settings (A CREER)
interface UnclaimedFundsSettings {
  expirationDays: number;           // 180 jours (PayPal)
  lateClaimDays: number;            // 365 jours supplementaires

  reminderDays: number[];           // [3, 7, 15, 30, 60, 90, 120, 150, 165]

  distribution: {
    sosExpatAmount: number;         // 20 EUR
    ongAmount: number;              // 10 EUR
    ongName: string;                // "Medecins Sans Frontieres"
    ongPaypalEmail: string;
  };

  allowLateClaims: boolean;
  deductFeesFromLateClaims: boolean;
}
```

---

# 9. WEBHOOKS ET CALLBACKS

## 9.1 Webhooks Stripe Geres

| Event | Gere | Handler | Action |
|-------|------|---------|--------|
| `payment_intent.succeeded` | OUI | `handlePaymentIntentSucceeded` | Update status, log |
| `payment_intent.payment_failed` | OUI | `handlePaymentIntentFailed` | Update status, cancel call |
| `payment_intent.canceled` | OUI | `handlePaymentIntentCanceled` | Update status |
| `charge.refunded` | OUI | `handleChargeRefunded` | Update status |
| `transfer.created` | OUI | `handleTransferCreated` | Log transfer |
| `transfer.reversed` | OUI | `handleTransferReversed` | Update session, transfers |
| `transfer.failed` | OUI | `handleTransferFailed` | Alert admin |
| `account.updated` | NON | - | **A IMPLEMENTER** |
| `account.application.deauthorized` | NON | - | **A IMPLEMENTER** |
| `charge.dispute.created` | NON | - | **A IMPLEMENTER** |
| `charge.dispute.updated` | NON | - | **A IMPLEMENTER** |
| `charge.dispute.closed` | NON | - | **A IMPLEMENTER** |

## 9.2 Webhooks Twilio Geres

| Event | Gere | Handler | Action |
|-------|------|---------|--------|
| `ringing` | OUI | `handleCallRinging` | Update participant status |
| `answered` | OUI | `handleCallAnswered` | Update participant status, connectedAt |
| `completed` | OUI | `handleCallCompleted` | handleCallCompletion() |
| `failed` | OUI | `handleCallFailed` | handleCallFailure() |
| `busy` | OUI | `handleCallFailed` | handleCallFailure() |
| `no-answer` | OUI | `handleCallFailed` | handleCallFailure() + provider offline |
| `conference-start` | OUI | `handleConferenceStart` | Update conference |
| `conference-end` | OUI | `handleConferenceEnd` | handleCallCompletion() |
| `participant-join` | OUI | `handleParticipantJoin` | Update participant |
| `participant-leave` | OUI | `handleParticipantLeave` | Update participant |
| `recording-completed` | OUI | `handleRecordingCompleted` | Store recording URL |

## 9.3 Webhooks PayPal (A IMPLEMENTER)

| Event | Action |
|-------|--------|
| `PAYMENT.CAPTURE.COMPLETED` | Logger succes, update session |
| `PAYMENT.CAPTURE.DENIED` | Notifier client, logger erreur |
| `PAYMENT.CAPTURE.REFUNDED` | Update session, notifier |
| `MERCHANT.ONBOARDING.COMPLETED` | Update statut prestataire |
| `MERCHANT.PARTNER-CONSENT.REVOKED` | Desactiver compte |

---

# 10. COMPARAISON AVEC LE PLAN IDEAL

## 10.1 Tableau Comparatif Global

| Aspect | Systeme Actuel | Plan Ideal | Ecart |
|--------|----------------|------------|-------|
| **Gateway principale** | Stripe uniquement | Stripe + PayPal | **PayPal absent** |
| **Couverture pays** | ~46 pays | 197 pays | **151 pays manquants** |
| **Type compte Stripe** | Custom | Express | A migrer |
| **Split paiement** | Destination Charges | Destination Charges | OK |
| **Compte "shell"** | Non | Oui | **A implementer** |
| **KYC differe** | Non | Oui | **A implementer** |
| **Fonds non reclames** | Non | Oui (J+180 PayPal) | **A implementer** |
| **Relances automatiques** | Non | Oui (J+3 a J+165) | **A implementer** |
| **Config admin frais** | Oui (partiel) | Oui (complet) | A enrichir |
| **Dashboard prestataire** | Basique | Complet avec gains | A ameliorer |
| **Gestion disputes** | Non | Oui | **A implementer** |

## 10.2 Architecture Cible

```
+-------------------------------------------------------------------------+
|                         GATEWAY PRINCIPALE                              |
+-------------------------------------------------------------------------+
|                                                                         |
|   STRIPE CONNECT                      PAYPAL COMMERCE PLATFORM          |
|   (46 pays)                           (151 pays)                        |
|                                                                         |
|   - Europe (31)                       - Afrique                         |
|   - Asie-Pacifique (7)                - Amerique Latine (hors BR/MX)    |
|   - Moyen-Orient (1)                  - Asie (hors pays Stripe)         |
|   - Ameriques (4)                     - Europe de l'Est                 |
|   - Preview (3)                       - Oceanie                         |
|                                                                         |
+-------------------------------------------------------------------------+
```

## 10.3 Principe du Split Instantane (Plan Ideal)

```
CLIENT PAIE 100E
       |
       V
+------------------------------------------+
|  AU MOMENT DE LA CAPTURE                 |
|  (fin de la prestation)                  |
|                                          |
|  70E -------------> SOS-EXPAT            |  <- IMMEDIAT
|                     (ton compte)         |
|                                          |
|  30E -------------> PRESTATAIRE          |  <- IMMEDIAT (sur son compte
|                     (son compte)         |     Stripe/PayPal, meme non verifie)
+------------------------------------------+
```

---

# 11. ECARTS IDENTIFIES

## 11.1 ECART 1: Absence de PayPal Commerce Platform

**Impact**: 151 pays non couverts (Afrique, Amerique Latine, Asie, Europe de l'Est)

**Solution**: Creer `PayPalCommerceManager.ts` et `PaymentGatewayRouter.ts`

```typescript
// Logique de routage a implementer
const getGatewayForCountry = (country: string): 'stripe' | 'paypal' => {
  const STRIPE_COUNTRIES = ['FR', 'DE', 'ES', 'IT', 'BE', 'NL', ...]; // 46 pays
  return STRIPE_COUNTRIES.includes(country) ? 'stripe' : 'paypal';
};
```

## 11.2 ECART 2: Absence de Comptes "Shell" (Paiement Avant KYC)

**Situation actuelle**: Un prestataire DOIT completer son KYC Stripe AVANT de recevoir des paiements.

**Plan ideal**: Le prestataire peut recevoir des paiements immediatement, mais ne peut pas retirer tant que le KYC n'est pas fait.

**Avantages**:
- Pas de friction a l'inscription
- L'argent est sur le compte (Stripe/PayPal), pas chez SOS-Expat
- Prestataire motive a completer KYC pour acceder a ses fonds

**Implementation requise**: Migrer de Custom vers Express accounts

```typescript
// Dans StripeManager.ts - Modification de createCustomAccount
const account = await stripe.accounts.create({
  type: "express",  // Changement Custom -> Express
  country: country,
  email: email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  // PAS de tos_acceptance ni de KYC complet
});

// Le compte est charges_enabled: false par defaut
// Mais transfer_data fonctionne quand meme (l'argent va sur le compte bloque)
```

## 11.3 ECART 3: Absence de Gestion des Fonds Non Reclames

**Specifique PayPal**: Limite de 180 jours pour les fonds non verifies

**Collection a creer**: `unclaimed_funds`

```typescript
interface UnclaimedFund {
  sessionId: string;
  providerId: string;
  providerEmail: string;
  totalAmount: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;          // J+180
  lateClaimDeadline: Timestamp;  // J+180+365
  remindersSent: string[];
  status: 'pending' | 'warning' | 'expired' | 'processed' | 'claimed_late';
  resolution?: {
    type: 'claimed' | 'expired';
    sosExpatAmount: number;
    ongAmount: number;
    ongName: string;
  };
}
```

## 11.4 ECART 4: Absence de Systeme de Relances

**Calendrier prevu**:

| Jour | Type | Canal |
|------|------|-------|
| J+0 | Info | Email + Dashboard |
| J+3 | Rappel doux | Email |
| J+7 | Rappel | Email |
| J+15 | Rappel | Email + SMS |
| J+30 | Important | Email |
| J+60 | Urgent | Email + SMS |
| J+90 | Alerte | Email + SMS + Dashboard |
| J+120 | Avertissement (PayPal) | Email + SMS |
| J+150 | Mise en demeure | Email + SMS + Dashboard |
| J+165 | Dernier rappel | Email + SMS + Appel auto |
| J+180 | Expiration | Traitement fonds |

**A implementer**: Scheduled Cloud Functions + collection `payment_reminders`

## 11.5 ECART 5: Champs Manquants dans sos_profiles

**Champs a ajouter (Plan Ideal)**:

```typescript
{
  // Gateway principale
  primaryPaymentMethod: 'stripe' | 'paypal';

  // Stripe Connect
  stripeAccountId?: string;
  stripeStatus?: 'pending' | 'verified' | 'restricted';
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;

  // PayPal Commerce Platform
  paypalMerchantId?: string;
  paypalEmail?: string;
  paypalStatus?: 'pending' | 'verified' | 'restricted';
  paymentsReceivable?: boolean;

  // Flags globaux
  canReceivePayments: boolean;  // Peut travailler
  canWithdraw: boolean;         // Peut retirer (KYC complet)

  // Pays et devise
  residenceCountry: string;
  preferredCurrency: 'eur' | 'usd';
}
```

## 11.6 ECART 6: Gestion des Disputes Absente

**Webhooks manquants**:
- `charge.dispute.created`
- `charge.dispute.updated`
- `charge.dispute.closed`

**Workflow a implementer**:
```
Stripe Dispute Ouvert
    |
    V
charge.dispute.created (webhook)
    |
    V
Notification Admin + Prestataire
    |
    V
Evidence Upload via Dashboard
    |
    V
charge.dispute.closed (won/lost)
    |
    V
Si lost: Refund automatique
```

---

# 12. FICHIERS A CREER/MODIFIER

## 12.1 Backend (Firebase Functions)

| Fichier | Action | Description |
|---------|--------|-------------|
| `PayPalCommerceManager.ts` | CREER | Gestion PayPal Commerce Platform |
| `PaymentGatewayRouter.ts` | CREER | Router Stripe vs PayPal |
| `UnclaimedFundsManager.ts` | CREER | Gestion fonds non reclames |
| `ProviderAccountManager.ts` | CREER | Creation comptes shell |
| `reminderScheduler.ts` | CREER | Cron relances KYC |
| `disputeHandler.ts` | CREER | Gestion disputes Stripe |
| `StripeManager.ts` | MODIFIER | Ajouter support Express accounts |
| `createPaymentIntent.ts` | MODIFIER | Router vers bonne gateway |
| `stripeAutomaticKyc.ts` | MODIFIER | Support comptes shell |
| `index.ts` | MODIFIER | Exporter nouvelles fonctions + webhooks |

## 12.2 Frontend

| Fichier | Action | Description |
|---------|--------|-------------|
| `PayPalOnboarding.tsx` | CREER | Onboarding Commerce Platform |
| `PaymentMethodSetup.tsx` | CREER | Config paiement prestataire |
| `ProviderEarnings.tsx` | CREER | Dashboard gains prestataire |
| `AdminPaymentSettings.tsx` | CREER | Config frais admin |
| `AdminUnclaimedFunds.tsx` | CREER | Gestion fonds non reclames |
| `AdminDisputes.tsx` | CREER | Gestion disputes |
| `PaymentForm.tsx` | MODIFIER | Support Stripe + PayPal |
| `RegisterLawyer.tsx` | MODIFIER | Integrer creation compte shell |

## 12.3 Collections Firestore

| Collection | Action | Description |
|------------|--------|-------------|
| `admin_config/payment_settings` | CREER | Config gateways |
| `admin_config/unclaimed_funds_settings` | CREER | Config fonds non reclames |
| `unclaimed_funds` | CREER | Tracking fonds en attente |
| `payment_reminders` | CREER | Historique relances |
| `disputes` | CREER | Tracking disputes |
| `sos_profiles` | MODIFIER | Ajouter champs PayPal |
| `call_sessions` | MODIFIER | Ajouter champ gateway |

## 12.4 Traductions

| Fichier | Cles a ajouter |
|---------|----------------|
| `*/provider.json` | Messages onboarding PayPal |
| `*/payment.json` | Messages paiement multi-gateway |
| `*/emails.json` | Templates relances fonds non reclames |

---

# 13. RECOMMANDATIONS PRIORITAIRES

## 13.1 Priorite 1: PayPal Commerce Platform

**Raison**: Sans PayPal, 151 pays ne peuvent pas utiliser la plateforme.

**Actions**:
1. Creer compte PayPal Business
2. Activer PayPal Commerce Platform (Partner Referral)
3. Creer `PayPalCommerceManager.ts`
4. Creer `PaymentGatewayRouter.ts`
5. Configurer webhooks PayPal
6. Tester en sandbox

**Effort estime**: ~800 lignes de code

## 13.2 Priorite 2: Comptes Shell (KYC Differe)

**Raison**: Friction majeure a l'inscription des prestataires.

**Actions**:
1. Migrer de Custom vers Express accounts
2. Modifier `stripeAutomaticKyc.ts`
3. Creer `ProviderAccountManager.ts`
4. Permettre paiements avant KYC complet
5. Ajouter UI de verification differee

**Effort estime**: ~400 lignes de code

## 13.3 Priorite 3: Systeme de Relances

**Raison**: Risque de perte de fonds PayPal apres 180 jours.

**Actions**:
1. Creer `reminderScheduler.ts`
2. Configurer scheduled functions
3. Creer templates emails/SMS
4. Ajouter UI dashboard pour statut relances

**Effort estime**: ~300 lignes + 15 templates x 9 langues

## 13.4 Priorite 4: Dashboard Prestataire Ameliore

**Raison**: Transparence sur les gains et statut KYC.

**Actions**:
1. Creer `ProviderEarnings.tsx`
2. Afficher historique des transactions
3. Afficher statut KYC et progression
4. Afficher gains en attente de retrait

**Effort estime**: ~400 lignes de code

## 13.5 Priorite 5: Gestion Fonds Non Reclames

**Raison**: Conformite et eviter perte apres expiration PayPal.

**Actions**:
1. Creer `UnclaimedFundsManager.ts`
2. Creer collection `unclaimed_funds`
3. Implementer flux J+180 avec redistribution
4. Creer `AdminUnclaimedFunds.tsx`

**Effort estime**: ~600 lignes de code

## 13.6 Priorite 6: Gestion des Disputes

**Raison**: Conformite et protection contre les litiges.

**Actions**:
1. Ajouter webhooks `charge.dispute.*`
2. Creer `disputeHandler.ts`
3. Creer `AdminDisputes.tsx`
4. Notifier admin et prestataire

**Effort estime**: ~400 lignes de code

---

# 14. ANNEXES TECHNIQUES

## 14.1 Configuration Secrets Firebase

```bash
# Stripe
STRIPE_SECRET_KEY_TEST=sk_test_xxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_test_xxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_live_xxx
STRIPE_MODE=test|live

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+33xxx

# PayPal (A AJOUTER)
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_PARTNER_ID=xxx
PAYPAL_MODE=sandbox|live
```

## 14.2 Commandes de Deploiement

```bash
# Deployer les fonctions
cd sos/firebase/functions
npm run build
firebase deploy --only functions

# Deployer les regles Firestore
firebase deploy --only firestore:rules

# Deployer les indexes Firestore
firebase deploy --only firestore:indexes
```

## 14.3 Tests Recommandes

1. **Test Paiement Stripe**:
   - Creer PaymentIntent
   - Capturer apres 2min
   - Verifier transfer_data

2. **Test Remboursement**:
   - Rembourser avec reverse_transfer=true
   - Verifier webhook transfer.reversed
   - Verifier mise a jour Firestore

3. **Test Appel Twilio**:
   - 3 retries si no-answer
   - Capture si >= 120s
   - Refund si < 120s

4. **Test PayPal** (a implementer):
   - Creer Order
   - Capturer
   - Verifier disbursement

## 14.4 Monitoring Recommande

- **Stripe Dashboard**: Surveiller paiements, disputes, transfers
- **Firebase Console**: Surveiller Cloud Functions, errors
- **Firestore**: Surveiller collections payments, transfers
- **Twilio Console**: Surveiller appels, recordings

---

# CONCLUSION

Le systeme de paiement actuel de SOS-Expat est **solide techniquement** mais **limite geographiquement**.

## Points Forts
- Split automatique via Destination Charges
- Integration Twilio complete avec retries
- Regle des 2 minutes bien implementee
- Remboursements avec reverse_transfer

## Manques Critiques
- PayPal absent (151 pays exclus)
- Pas de comptes shell (friction inscription)
- Pas de relances automatiques
- Pas de gestion fonds non reclames

## Prochaines Etapes
1. Implementer PayPal Commerce Platform
2. Migrer vers comptes shell (Express accounts)
3. Ajouter systeme de relances
4. Implementer gestion fonds non reclames
5. Ajouter gestion disputes

---

**Rapport genere le**: 28 decembre 2024
**Equipe d'analyse**: 10 agents IA specialises
**Fichiers analyses**: ~50 fichiers sources
**Lignes de code analysees**: ~15,000+

---

# FIN DU RAPPORT
