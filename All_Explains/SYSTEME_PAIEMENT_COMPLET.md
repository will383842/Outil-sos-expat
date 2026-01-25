# DOCUMENTATION COMPLETE DU SYSTEME DE PAIEMENT SOS-EXPAT

> **Document genere le:** 24 Janvier 2026
> **Version:** 1.0
> **Projet:** SOS-Expat
> **Analyse par:** 16 agents IA specialises

---

## TABLE DES MATIERES

1. [Vue d'Ensemble de l'Architecture](#1-vue-densemble-de-larchitecture)
2. [Configuration Stripe](#2-configuration-stripe)
3. [Webhooks Stripe](#3-webhooks-stripe)
4. [Integration PayPal](#4-integration-paypal)
5. [Systeme d'Abonnements](#5-systeme-dabonnements)
6. [Processus de Checkout](#6-processus-de-checkout)
7. [Cloud Functions Paiement](#7-cloud-functions-paiement)
8. [Systeme de Taxes](#8-systeme-de-taxes)
9. [KYC et Stripe Connect](#9-kyc-et-stripe-connect)
10. [Transferts et Payouts](#10-transferts-et-payouts)
11. [Remboursements et Litiges](#11-remboursements-et-litiges)
12. [Modeles de Donnees Firestore](#12-modeles-de-donnees-firestore)
13. [Securite des Paiements](#13-securite-des-paiements)
14. [Hooks React et Listeners](#14-hooks-react-et-listeners)
15. [Notifications de Paiement](#15-notifications-de-paiement)
16. [Analytics et Monitoring](#16-analytics-et-monitoring)
17. [Gestion des Erreurs](#17-gestion-des-erreurs)
18. [Annexes](#18-annexes)

---

## 1. VUE D'ENSEMBLE DE L'ARCHITECTURE

### 1.1 Architecture Globale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE PAIEMENT SOS-EXPAT                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │   FRONTEND   │────▶│  CLOUD FUNCTIONS │────▶│  STRIPE/PAYPAL   │    │
│  │   (React)    │◀────│    (Firebase)    │◀────│      APIs        │    │
│  └──────────────┘     └──────────────────┘     └──────────────────┘    │
│         │                      │                        │               │
│         │                      ▼                        │               │
│         │              ┌──────────────┐                 │               │
│         └─────────────▶│   FIRESTORE  │◀────────────────┘               │
│                        │   (Database) │                                 │
│                        └──────────────┘                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Passerelles de Paiement

| Passerelle | Usage | Pays Supportes |
|------------|-------|----------------|
| **Stripe** | Principal (44 pays) | EU, US, CA, AU, JP, etc. |
| **PayPal** | Fallback (150+ pays) | Afrique, Asie, Amerique Latine |

### 1.3 Types de Paiements

1. **Paiements d'Appels** - Clients payant pour des consultations
2. **Abonnements IA** - Providers souscrivant a des plans mensuels/annuels
3. **Transferts/Payouts** - Versements aux prestataires

### 1.4 Flux Monetaire Principal

```
CLIENT (49€) ──▶ PLATEFORME ──▶ COMMISSION (19€) + PROVIDER (30€)
                    │
                    ├── Stripe Direct Charges (KYC OK)
                    │   └── Split automatique
                    │
                    └── Platform Escrow (KYC Pending)
                        └── Transfert apres KYC
```

---

## 2. CONFIGURATION STRIPE

### 2.1 Gestion des Secrets

**Fichier Central:** `/sos/firebase/functions/src/lib/secrets.ts`

```typescript
// TOUS les secrets sont definis ICI UNIQUEMENT (P0 CRITICAL FIX)
export const STRIPE_SECRET_KEY_LIVE = defineSecret('STRIPE_SECRET_KEY_LIVE');
export const STRIPE_SECRET_KEY_TEST = defineSecret('STRIPE_SECRET_KEY_TEST');
export const STRIPE_WEBHOOK_SECRET_LIVE = defineSecret('STRIPE_WEBHOOK_SECRET_LIVE');
export const STRIPE_WEBHOOK_SECRET_TEST = defineSecret('STRIPE_WEBHOOK_SECRET_TEST');
export const STRIPE_CONNECT_WEBHOOK_SECRET_LIVE = defineSecret('STRIPE_CONNECT_WEBHOOK_SECRET_LIVE');
export const STRIPE_CONNECT_WEBHOOK_SECRET_TEST = defineSecret('STRIPE_CONNECT_WEBHOOK_SECRET_TEST');
export const STRIPE_MODE = defineString('STRIPE_MODE', { default: 'test' });
```

### 2.2 Detection du Mode (Test vs Live)

```typescript
function getStripeSecretKey(): string {
  const mode = secretKey?.startsWith('sk_live_') ? 'live' : 'test';

  // Validation en production
  if (isProduction() && mode !== 'live') {
    throw new Error('P0 SECURITY ERROR: Test mode not allowed in production');
  }
  return secretKey;
}
```

### 2.3 Variables d'Environnement

**Frontend (.env):**
```
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx   # ou pk_live_xxxxx
```

**Backend (Firebase Secrets):**
```
STRIPE_SECRET_KEY_LIVE
STRIPE_SECRET_KEY_TEST
STRIPE_WEBHOOK_SECRET_LIVE
STRIPE_WEBHOOK_SECRET_TEST
STRIPE_CONNECT_WEBHOOK_SECRET_LIVE
STRIPE_CONNECT_WEBHOOK_SECRET_TEST
STRIPE_MODE                 # default: "test"
```

### 2.4 Stripe Connect Express

Configuration pour les comptes des prestataires:

```typescript
stripe.accounts.create({
  type: "express",
  country: countryCode,
  email: user.email,
  business_type: "individual",
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true }
  }
});
```

---

## 3. WEBHOOKS STRIPE

### 3.1 Configuration du Webhook Principal

**Fichier:** `/sos/firebase/functions/src/index.ts`

```typescript
export const stripeWebhook = onRequest({
  region: "europe-west1",
  memory: "512MiB",
  secrets: [
    STRIPE_SECRET_KEY_TEST,
    STRIPE_SECRET_KEY_LIVE,
    STRIPE_WEBHOOK_SECRET_TEST,
    STRIPE_WEBHOOK_SECRET_LIVE,
    STRIPE_CONNECT_WEBHOOK_SECRET_TEST,
    STRIPE_CONNECT_WEBHOOK_SECRET_LIVE,
  ],
  concurrency: 1,
  timeoutSeconds: 60,
  minInstances: 1,   // Instance chaude pour eviter cold starts
  maxInstances: 5
});
```

### 3.2 Evenements Geres (27 types)

#### A. Evenements Payment Intent
| Evenement | Action |
|-----------|--------|
| `payment_intent.created` | Logging |
| `payment_intent.processing` | Logging |
| `payment_intent.requires_action` | Gestion 3D Secure |
| `payment_intent.succeeded` | Capture + notification |
| `payment_intent.payment_failed` | Enregistre l'echec |
| `payment_intent.canceled` | Gere l'annulation |

#### B. Evenements Abonnements
| Evenement | Action |
|-----------|--------|
| `customer.subscription.created` | Cree subscription + initialise quota IA |
| `customer.subscription.updated` | Gere upgrade/downgrade |
| `customer.subscription.deleted` | Annule subscription |
| `customer.subscription.paused` | Pause la subscription |
| `customer.subscription.resumed` | Reprend la subscription |
| `customer.subscription.trial_will_end` | Rappel 3 jours avant fin essai |

#### C. Evenements Factures
| Evenement | Action |
|-----------|--------|
| `invoice.created` | Stocke facture draft |
| `invoice.paid` | Confirme paiement + reset quota |
| `invoice.payment_failed` | Marque past_due + relance |
| `invoice.payment_action_required` | Gere 3D Secure |

#### D. Evenements Disputes
| Evenement | Action |
|-----------|--------|
| `charge.dispute.created` | Cree record dispute |
| `charge.dispute.updated` | Met a jour statut |
| `charge.dispute.closed` | Finalise dispute |

#### E. Evenements Transferts
| Evenement | Action |
|-----------|--------|
| `transfer.created` | Enregistre payout provider |
| `transfer.reversed` | Reversal de transfert |
| `transfer.failed` | Gere l'echec + retry |

#### F. Evenements Compte Connect
| Evenement | Action |
|-----------|--------|
| `account.updated` | Sync KYC + process pending transfers |
| `account.application.deauthorized` | Desactive provider |

### 3.3 Systeme de Cache Webhook

```typescript
// TTL: 30 minutes (les plans changent rarement)
const WEBHOOK_CACHE_TTL = 30 * 60 * 1000;

// Economie: 90% de reductions en reads Firestore
// Sans cache: 4 reads par webhook
// Avec cache: 0-1 read par webhook
```

### 3.4 Idempotence

```typescript
// Collection: processed_webhook_events
// Document ID = event.id (Stripe)
// TTL: 30 jours
// Previent les doublons de webhook redeliveries
```

---

## 4. INTEGRATION PAYPAL

### 4.1 Configuration

**Fichier:** `/sos/firebase/functions/src/lib/secrets.ts`

```typescript
export const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
export const PAYPAL_CLIENT_SECRET = defineSecret("PAYPAL_CLIENT_SECRET");
export const PAYPAL_WEBHOOK_ID = defineSecret("PAYPAL_WEBHOOK_ID");
export const PAYPAL_PARTNER_ID = defineSecret("PAYPAL_PARTNER_ID");
export const PAYPAL_PLATFORM_MERCHANT_ID = defineSecret("PAYPAL_PLATFORM_MERCHANT_ID");
export const PAYPAL_MODE = defineString("PAYPAL_MODE", { default: "sandbox" });
```

### 4.2 Pays PayPal-Only (150+ pays)

- **Afrique:** 54 pays
- **Asie:** 38 pays (Inde, Chine, Vietnam, Pakistan, etc.)
- **Amerique Latine:** 27 pays
- **Europe de l'Est:** 14 pays (Russie, Ukraine, etc.)
- **Oceanie:** 15 pays
- **Moyen-Orient:** 7 pays

### 4.3 Flux de Paiement PayPal

```
1. Client clique "Payer par PayPal"
   ↓
2. createPayPalOrderHTTP() - Cree order PayPal
   ↓
3. Redirection vers PayPal pour approbation
   ↓
4. capturePayPalOrderHTTP() - Capture le paiement
   ↓
5. Webhook PAYMENT.CAPTURE.COMPLETED
   ↓
6. Update call_sessions + Meta CAPI tracking
```

### 4.4 Webhooks PayPal

| Evenement | Action |
|-----------|--------|
| `CHECKOUT.ORDER.APPROVED` | Mark order APPROVED |
| `PAYMENT.CAPTURE.COMPLETED` | Update payment status |
| `PAYMENT.CAPTURE.REFUNDED` | Debit provider balance |
| `MERCHANT.ONBOARDING.COMPLETED` | Update KYC + relance payouts |
| `CUSTOMER.DISPUTE.CREATED` | Create dispute record |
| `PAYOUT.ITEM.SUCCEEDED` | Update payout status |
| `PAYOUT.ITEM.FAILED` | Handle failure + alert admin |

### 4.5 Verification Email PayPal (Providers)

```typescript
// Configuration
const VERIFICATION_CONFIG = {
  CODE_LENGTH: 6,
  CODE_EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 3,
  MAX_CODES_PER_HOUR: 5,
  COOLDOWN_SECONDS: 60,
};

// Flux:
// 1. Provider entre email PayPal
// 2. Code 6 chiffres envoye par email
// 3. Provider verifie le code
// 4. Email marque comme verifie
// 5. Provider devient visible sur la plateforme
```

### 4.6 Rappels PayPal (Providers non configures)

```typescript
// Intervalles de rappels
INTERVALS_HOURS = [24, 72, 168, 336, 720]  // 1j, 3j, 7j, 14j, 30j

// Apres 5 rappels: provider marque comme "inactive"
MAX_REMINDERS = 5
```

---

## 5. SYSTEME D'ABONNEMENTS

### 5.1 Types d'Abonnements

```typescript
type SubscriptionTier = 'trial' | 'basic' | 'standard' | 'pro' | 'unlimited';
```

### 5.2 Statuts d'Abonnement

```typescript
type SubscriptionStatus =
  | 'trialing'      // En periode d'essai
  | 'active'        // Abonnement paye et actif
  | 'past_due'      // Paiement en retard (7 jours de grace)
  | 'canceled'      // Annule mais acces jusqu'a fin de periode
  | 'expired'       // Expire (plus d'acces)
  | 'paused'        // Mis en pause
  | 'suspended';    // Suspendu (apres 7j past_due)
```

### 5.3 Tarification par Defaut

#### Avocats (Lawyers)
| Plan | Prix EUR | Prix USD | Appels IA/mois |
|------|----------|----------|----------------|
| Basic | 14€ | $19 | 5 |
| Standard | 39€ | $49 | 15 |
| Pro | 69€ | $79 | 30 |
| Unlimited | 119€ | $139 | Illimite |

#### Expat Aidant
| Plan | Prix EUR | Prix USD | Appels IA/mois |
|------|----------|----------|----------------|
| Basic | 9€ | $9 | 5 |
| Standard | 14€ | $17 | 15 |
| Pro | 24€ | $29 | 30 |
| Unlimited | 39€ | $49 | Illimite |

**Remise annuelle:** 20%

### 5.4 Configuration Essai Gratuit

```typescript
DEFAULT_TRIAL_CONFIG = {
  durationDays: 30,   // 30 jours
  maxAiCalls: 3,      // 3 appels IA max
  isEnabled: true
}
```

### 5.5 Cycle de Vie Abonnement

```
1. SIGNUP → startTrial()
   ↓
2. Essai 30 jours OU 3 appels IA
   ↓
3a. UPGRADE → createSubscription()
    ↓
    Stripe Checkout → Paiement → subscription.created webhook
    ↓
    Status: 'active'

3b. ESSAI EXPIRE
    ↓
    Status: 'expired'
    ↓
    Email "Trial Expired" + lien upgrade
```

### 5.6 Gestion Past Due (Dunning)

```
J+0: Paiement echoue → Status: 'past_due'
J+1: Email "Probleme de paiement" + Retry auto
J+3: Email "Action requise" + Retry auto
J+5: Email "Derniere tentative" + Retry auto
J+7: Suspension → Status: 'suspended' → Acces IA coupe
```

---

## 6. PROCESSUS DE CHECKOUT

### 6.1 Creation PaymentIntent

**Fichier:** `/sos/firebase/functions/src/createPaymentIntent.ts`

```typescript
const LIMITS = {
  AMOUNT_LIMITS: {
    MIN_EUR: 0.50,      // Minimum Stripe
    MAX_EUR: 500,
    MAX_DAILY_EUR: 2000,
    MIN_USD: 0.50,
    MAX_USD: 600,
    MAX_DAILY_USD: 2400,
  },
  RATE_LIMIT: {
    WINDOW_MS: 10 * 60 * 1000,  // 10 minutes
    MAX_REQUESTS: 6
  },
  VALIDATION: {
    AMOUNT_COHERENCE_TOLERANCE: 0.05  // 5 centimes
  }
};
```

### 6.2 Flux de Paiement Complet

```
1. Client selectionne provider
   ↓
2. Frontend → createPaymentIntent()
   ├─ Authentification (UID Firebase)
   ├─ Rate limiting (6 req/10min)
   ├─ Validation montants (min/max/quotidien)
   ├─ Validation provider (disponible, pas suspendu)
   ├─ Anti-doublons (lock atomique 3min)
   ├─ Application coupons
   ├─ Validation stricte montants (±0.05€)
   └─ Appel Stripe API
   ↓
3. Stripe retourne clientSecret
   ↓
4. Frontend → stripe.confirmCardPayment(clientSecret)
   ↓
5. Webhook charge.succeeded → Update payment status
   ↓
6. Navigation vers PaymentSuccess
```

### 6.3 Modeles de Paiement

#### A. Direct Charges (KYC Complet)

```typescript
// Charge creee SUR le compte du provider
const paymentIntent = await stripe.paymentIntents.create(
  paymentParams,
  { stripeAccount: providerStripeAccountId }
);

// Split automatique:
// - application_fee_amount (commission) → SOS-Expat
// - Reste → Provider
```

#### B. Platform Escrow (KYC Incomplet)

```typescript
// Charge sur compte plateforme
const paymentIntent = await stripe.paymentIntents.create(paymentParams);

// Transfert differe apres KYC
await db.collection('pending_transfers').add({
  paymentIntentId,
  providerId,
  amount,
  status: 'pending_kyc'
});
```

### 6.4 Anti-Doublons

```typescript
async function checkAndLockDuplicatePayments() {
  const lockKey = `${clientId}_${providerId}_${amount}_${currency}`;

  return await db.runTransaction(async (transaction) => {
    // Verifier si lock recent existe
    // Si paiement actif → bloquer (isDuplicate = true)
    // Si echoue → autoriser retry
    // Sinon creer nouveau lock
  });
}

// Statuts bloquants
const activePaymentStatuses = [
  'requires_confirmation', 'requires_capture',
  'processing', 'succeeded', 'captured'
];

// Statuts autorisant retry
const failedPaymentStatuses = [
  'requires_payment_method', 'canceled',
  'failed', 'error', 'expired'
];
```

---

## 7. CLOUD FUNCTIONS PAIEMENT

### 7.1 Fonctions Callable (onCall)

| Fonction | Description |
|----------|-------------|
| `createPaymentIntent` | Cree PaymentIntent Stripe |
| `createStripeAccount` | Cree compte Express (KYC) |
| `checkStripeAccountStatus` | Verifie statut KYC |
| `getStripeAccountSession` | Session pour onboarding |
| `createSubscriptionCheckout` | Session Checkout abonnement |
| `cancelSubscription` | Annule abonnement |
| `reactivateSubscription` | Reactive abonnement |
| `createBillingPortalSession` | Portail facturation Stripe |
| `getProviderEarningsSummary` | Resume revenus provider |
| `getStripeBalance` | Balance plateforme (admin) |

### 7.2 Fonctions HTTP (Webhooks)

| Fonction | Description |
|----------|-------------|
| `stripeWebhook` | Endpoint webhook Stripe |
| `paypalWebhook` | Endpoint webhook PayPal |
| `createPayPalOrderHTTP` | Cree order PayPal |
| `capturePayPalOrderHTTP` | Capture order PayPal |

### 7.3 Fonctions Trigger (Firestore)

| Fonction | Collection | Description |
|----------|------------|-------------|
| `onPaymentCompleted` | payments | Genere ecriture comptable |
| `onRefundCreated` | refunds | Ecriture comptable remboursement |
| `onInvoiceCreated` | invoices | Ecriture comptable facture |

### 7.4 Fonctions Scheduled

| Fonction | Schedule | Description |
|----------|----------|-------------|
| `runPaymentHealthCheck` | Toutes les 4h | Surveillance sante paiements |
| `collectDailyPaymentMetrics` | 6h quotidien | Collecte metriques |
| `cleanupOldPaymentAlerts` | Dimanche 3h | Nettoyage alertes |
| `checkPastDueSubscriptions` | 9h quotidien | Suspension apres 7j |
| `sendQuotaAlerts` | 10h quotidien | Alertes quota 80%/100% |
| `resetBillingCycleQuotas` | 1h quotidien | Reset quotas mensuels |
| `scheduledPayPalReminders` | 10h quotidien | Rappels PayPal providers |

---

## 8. SYSTEME DE TAXES

### 8.1 Configuration Vendeur

```
Entite vendeur: SOS-Expat OU
Pays: Estonie (EE)
N° TVA: EE102318877
TVA Estonie: 22%
```

### 8.2 Cas de Taxation

#### CASE 1: Acheteur en Estonie
```
TVA: 22% (locale)
Declaration: VAT_EE
```

#### CASE 2: Acheteur UE - B2B avec TVA valide
```
TVA: 0% (Reverse Charge - Art. 196)
Declaration: DES
Mention: "Autoliquidation de la TVA"
```

#### CASE 3: Acheteur UE - B2C
```
TVA: Taux du pays destination (OSS)
Seuil OSS: 10,000€/an
Declaration: OSS
```

#### CASE 4: Acheteur UK
```
B2B: 0% (hors champ)
B2C: 20% (enregistrement UK requis)
Declaration: UK_VAT
```

#### CASE 5: Acheteur Suisse
```
Seuil: CHF 100,000/an
Si sous seuil: 0%
Si au-dessus: 8.1%
```

#### CASE 6: Acheteur USA
```
Services professionnels: EXEMPT
TVA: 0%
```

### 8.3 Taux TVA par Pays EU

```
AT: 20%, BE: 21%, BG: 20%, HR: 25%, CY: 19%, CZ: 21%
DK: 25%, EE: 22%, FI: 24%, FR: 20%, DE: 19%, GR: 24%
HU: 27%, IE: 23%, IT: 22%, LV: 21%, LT: 21%, LU: 17%
MT: 18%, NL: 21%, PL: 23%, PT: 23%, RO: 19%, SK: 20%
SI: 22%, ES: 21%, SE: 25%
```

### 8.4 Validation TVA

**Services utilises:**
- **VIES** (EU): `https://ec.europa.eu/taxation_customs/vies/`
- **HMRC** (UK): `https://api.service.hmrc.gov.uk/`

**Cache:** 30 jours TTL dans Firestore

---

## 9. KYC ET STRIPE CONNECT

### 9.1 Flux KYC Complet

```
1. Provider accede page KYC
   ↓
2. createStripeAccount() - Cree compte Express
   ↓
3. getStripeAccountSession() - Obtient client secret
   ↓
4. ConnectAccountOnboarding (Composant Stripe)
   ↓
5. Provider complete verification
   ↓
6. Webhook account.updated
   ↓
7. checkStripeAccountStatus() - Met a jour Firestore
   ↓
8. Si chargesEnabled: Process pending transfers
```

### 9.2 Statuts KYC

```typescript
type KYCStatus =
  | 'not_started'    // Compte cree mais pas de KYC
  | 'in_progress'    // Details submitted, en attente
  | 'completed'      // charges_enabled + payouts_enabled
  | 'incomplete';    // Documents manquants
```

### 9.3 Requirements Stripe Courants

```
Identite:
- individual.first_name
- individual.last_name
- individual.dob.day/month/year
- individual.email

Adresse:
- individual.address.line1
- individual.address.city
- individual.address.postal_code

Compte bancaire:
- external_account (IBAN/BIC)

Business:
- business_profile.mcc
- business_profile.url
```

### 9.4 Rappels KYC

```typescript
INTERVALS_HOURS = [24, 72, 168, 336, 720]  // 1j, 3j, 7j, 14j, 30j
MAX_REMINDERS = 5
MIN_INTERVAL_HOURS = 20
```

### 9.5 Composants Frontend

| Composant | Role |
|-----------|------|
| `StripeKyc.tsx` | Formulaire KYC principal |
| `KYCBannerCompact.tsx` | Banner sur Dashboard |
| `KycReturn.tsx` | Page retour apres Stripe |

---

## 10. TRANSFERTS ET PAYOUTS

### 10.1 Modeles de Transfert

#### A. Direct Charges (KYC OK)

```
PaymentIntent cree SUR compte provider
├─ Commission (application_fee_amount) → SOS-Expat
└─ Net → Provider (immediat)
```

#### B. Platform Escrow (KYC Pending)

```
PaymentIntent sur compte SOS-Expat
├─ Montant en escrow
├─ pending_transfers document cree
└─ Apres KYC: Transfer vers provider
```

### 10.2 Retry Logic (Transferts)

```typescript
const TRANSFER_RETRY_CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_DELAY: 5 * 60,      // 5 minutes
  BACKOFF_MULTIPLIER: 2
};

// Timeline: 5min → 10min → 20min → 40min → 80min (~2h30 total)
```

### 10.3 PayPal Payouts

Pour les providers PayPal-only:

```typescript
await paypalManager.createPayout({
  providerId,
  providerPayPalEmail,
  amount: 30,           // Apres commission
  currency: 'EUR',
  referenceId: paymentIntentId
});
```

### 10.4 Provider Earnings Service

```typescript
interface ProviderEarnings {
  totalEarnings: number;       // Total gagne
  pendingEarnings: number;     // En attente
  availableBalance: number;    // Disponible
  totalPayouts: number;        // Deja verse
  reservedAmount: number;      // Bloque (disputes)
  totalCalls: number;
  successfulCalls: number;
  averageEarningPerCall: number;
}
```

---

## 11. REMBOURSEMENTS ET LITIGES

### 11.1 Statuts de Remboursement

```typescript
type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed';

type RefundReason =
  | 'customer_request'
  | 'service_not_delivered'
  | 'technical_issue'
  | 'duplicate_payment'
  | 'fraud'
  | 'other';
```

### 11.2 Workflow Remboursement

```
1. Admin recherche paiement
2. Cree demande remboursement (status: pending)
3. Specifie montant (complet ou partiel)
4. Approuve la demande
5. Status → completed
6. Paiement lie → refunded
```

### 11.3 Gestion des Litiges (Disputes)

#### Statuts
```typescript
type DisputeStatus =
  | 'open'           // Nouveau
  | 'under_review'   // En examen
  | 'won'            // Gagne
  | 'lost'           // Perdu
  | 'closed'         // Ferme
  | 'accepted';      // Accepte
```

#### Impact Direct Charges
```
Avec Direct Charges:
- Disputes → Compte provider
- Provider responsable des chargebacks
- Plateforme = suivi informatif
```

#### Workflow Dispute

```
1. Client emet chargeback
   ↓
2. Webhook charge.dispute.created
   ↓
3. DisputeRecord cree dans Firestore
   ↓
4. Provider notifie
   ↓
5. Provider soumet preuves via Stripe
   ↓
6. Webhook charge.dispute.updated → under_review
   ↓
7. Banque rend verdict
   ↓
8. Webhook charge.dispute.closed → won/lost
```

#### Systeme d'Urgence

```
URGENT: < 48h avant deadline → Alerte rouge
MEDIUM: < 7 jours → Orange
NORMAL: > 7 jours → Vert
```

---

## 12. MODELES DE DONNEES FIRESTORE

### 12.1 Collection `payments`

```typescript
interface Payment {
  id: string;
  stripePaymentIntentId: string;
  clientId: string;
  providerId: string;
  amount: number;              // cents
  commissionAmount: number;    // cents
  providerAmount: number;      // cents
  currency: 'EUR' | 'USD';
  status: PaymentStatus;
  paymentMethod: 'stripe' | 'paypal';
  serviceType: 'lawyer_call' | 'expat_call';
  callSessionId: string;

  // Stripe Connect
  providerStripeAccountId?: string;
  useDirectCharges?: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 12.2 Collection `subscriptions`

```typescript
interface Subscription {
  id: string;                    // = providerId
  providerId: string;
  providerType: 'lawyer' | 'expat_aidant';
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;

  // Stripe
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;

  // Dates
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
  cancelAtPeriodEnd: boolean;

  // Billing
  currency: 'EUR' | 'USD';
  billingPeriod: 'monthly' | 'yearly';
  currentPeriodAmount: number;

  createdAt: Date;
  updatedAt: Date;
}
```

### 12.3 Collection `ai_usage`

```typescript
interface AiUsage {
  providerId: string;
  subscriptionId: string;
  currentPeriodCalls: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialCallsUsed: number;
  totalCallsAllTime: number;
  lastCallAt?: Date;
  updatedAt: Date;
}
```

### 12.4 Collection `pending_transfers`

```typescript
interface PendingTransfer {
  paymentIntentId: string;
  providerId: string;
  amount: number;              // total cents
  providerAmount: number;      // provider cents
  commissionAmount: number;
  currency: 'EUR' | 'USD';
  status: 'pending_kyc' | 'processing' | 'succeeded' | 'failed';
  reason: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 12.5 Collection `disputes`

```typescript
interface Dispute {
  id: string;
  stripeDisputeId: string;
  chargeId: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason: string;
  status: DisputeStatus;

  callSessionId?: string;
  clientId: string;
  providerId: string;

  evidenceDueBy?: Date;
  closedAt?: Date;
  outcome?: 'won' | 'lost' | 'withdrawn';

  evidence: DisputeEvidence[];
  notes: DisputeNote[];
  timeline: DisputeEvent[];
  statusHistory: StatusHistoryEntry[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 12.6 Firestore Rules (Securite)

```firestore
// PAYMENTS - Cloud Functions ONLY
match /payments/{paymentId} {
  allow read: if isAuthenticated() && (
    resource.data.clientId == request.auth.uid ||
    resource.data.providerId == request.auth.uid ||
    isAdmin()
  );
  allow create: if false;   // Cloud Functions only
  allow update: if false;   // Cloud Functions only
  allow delete: if isAdmin();
}

// COUPONS - Bloquer enumeration
match /coupons/{couponId} {
  allow read: if isAdmin();   // Validation via Cloud Functions
  allow write: if isAdmin();
}
```

---

## 13. SECURITE DES PAIEMENTS

### 13.1 Validations Serveur

| Validation | Description |
|------------|-------------|
| Authentification | UID Firebase requis |
| Rate Limiting | 6 req / 10 min (Firestore-based) |
| Montants | Min/Max + Quota quotidien |
| Provider | Disponible + pas suspendu |
| Anti-doublons | Lock atomique 3 min |
| Coherence | total = commission + provider (±0.05€) |

### 13.2 Gestion des Secrets

```typescript
// P0 CRITICAL: Single source of truth
// Fichier: /lib/secrets.ts

// JAMAIS appeler defineSecret() ailleurs!
// Binding unique = evite credential loading failures
```

### 13.3 Webhook Security

```typescript
// Verification signature HMAC-SHA256
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
);

// Si invalide → HttpsError 401
```

### 13.4 Protection Fraude

| Detection | Action |
|-----------|--------|
| Deviation >50% prix standard | Alert + log |
| Micro-transactions repetees | Block + alert |
| Changement geo impossible | Alert |
| Taux refus anormal | Alert |
| Pattern chargebacks | Escalade |

### 13.5 P0/P1 Security Fixes

| Fix | Description |
|-----|-------------|
| P0-2 | Rate limit persistant (Firestore) |
| P0-3 | Centralisation secrets |
| P0-7 | Creation paiement Cloud Functions only |
| P1-3 | Liberation locks en cas d'erreur |
| P1-7 | Protection enumeration coupons |
| P1-14 | Validation stricte TOUS environnements |

---

## 14. HOOKS REACT ET LISTENERS

### 14.1 Hooks Principaux

#### useSubscription
```typescript
const {
  subscription,
  plan,
  isActive,
  isTrialing,
  daysUntilRenewal,
  cancelSubscription,
  refresh
} = useSubscription();
```

#### usePaymentGateway
```typescript
const {
  gateway,        // "stripe" | "paypal"
  isPayPalOnly,
  isLoading
} = usePaymentGateway(countryCode);
```

#### useAiQuota
```typescript
const {
  currentUsage,
  limit,
  remaining,
  canMakeAiCall,
  isQuotaExhausted,
  refreshQuota
} = useAiQuota();
```

#### useFinanceData (Admin)
```typescript
const {
  payments,
  kpis,
  isLoading,
  loadMore,
  refresh
} = useFinanceData({ filters, pageSize: 25 });
```

### 14.2 Deduplication des Listeners

```typescript
// Pattern: UN listener pour N composants
// Economie: ~80% reduction reads Firestore

const listenerCache: Record<string, CachedListener<any>> = {};

function subscribeWithDeduplication<T>(
  cacheKey: string,
  createListener: Function,
  callback: Function
): () => void
```

### 14.3 Context Providers

#### PayPalProvider
```typescript
<PayPalProvider>
  {/* Initialise PayPalScriptProvider */}
  {/* Currency: EUR, Intent: capture */}
  {children}
</PayPalProvider>
```

---

## 15. NOTIFICATIONS DE PAIEMENT

### 15.1 Canaux Disponibles

| Canal | Provider | Usage |
|-------|----------|-------|
| Email | Zoho SMTP | Principal |
| Push | FCM | Abonnements + alertes |
| In-app | Firestore | Alertes + notifications |
| SMS | Twilio | Restrictif (2 events) |
| Slack | Webhook | Alertes securite admin |

### 15.2 Evenements Notification

| Evenement | Canaux |
|-----------|--------|
| subscription.welcome | Email + Push |
| subscription.renewed | Email |
| subscription.payment_failed | Email (HIGH priority) |
| subscription.quota_80 | Email |
| subscription.quota_exhausted | Email (HIGH) |
| subscription.trial_ending | Email (HIGH) |
| subscription.expired | Email |
| subscription.canceled | Email |

### 15.3 Systeme de Dunning (Emails)

```
J+1: "Probleme avec votre paiement"
J+3: "Action requise - Mise a jour paiement"
J+5: "Derniere tentative de paiement"
J+7: "Votre compte a ete suspendu"
```

### 15.4 Retry Notifications

```typescript
// Frequence: Toutes les 4 heures
// Max retries: 3
// Backoff: Exponentiel (5min → 10min → 20min)
// Max age: 24h

// Apres 3 echecs → Dead Letter Queue
```

---

## 16. ANALYTICS ET MONITORING

### 16.1 Metriques Suivies

#### User Metrics
- DAU, WAU, MAU
- Nouveaux clients/providers
- Churn rate

#### Call Metrics
- Appels inities/completes/echecs
- Duree moyenne
- Taux de succes
- Peak hours

#### Revenue Metrics
- Daily/Weekly/Monthly revenue
- Platform fees vs Provider payouts
- Average transaction value
- Revenue by country/service type

### 16.2 Unified Analytics

**Fichier:** `/sos/firebase/functions/src/analytics/unifiedAnalytics.ts`

```typescript
// Agregation quotidienne a 01:00 UTC
// Stockage: analytics_daily
// Cleanup: > 2 ans
```

### 16.3 Stripe Balance Monitoring

```typescript
interface StripeBalanceResponse {
  available: BalanceAmount[];      // Disponible
  pending: BalanceAmount[];        // En attente
  connectReserved: BalanceAmount[]; // Reserve Connect
  timestamp: Date;
}
```

### 16.4 Seuils d'Alerte

```typescript
STRIPE_FAILED_PAYMENTS_HOUR: 3      // > 3 echecs/heure
STRIPE_UNCAPTURED_AGE_HOURS: 6      // Non capture > 6h
PAYPAL_PENDING_PAYOUT_AGE_HOURS: 24 // Payout pending > 24h
FAILED_CALLS_HOUR: 5                // > 5 echecs appels/heure
```

---

## 17. GESTION DES ERREURS

### 17.1 Categories d'Erreurs Stripe

| Categorie | Retryable | Severite |
|-----------|-----------|----------|
| card_error | Non | Basse |
| authentication_error | Oui | Basse |
| rate_limit_error | Oui (60s) | Moyenne |
| validation_error | Non | Moyenne |
| api_error | Oui (10s) | Haute |
| connection_error | Oui (5s) | Moyenne |

### 17.2 Codes de Refus Courants

| Code | Message Utilisateur |
|------|---------------------|
| card_declined | Votre carte a ete refusee |
| insufficient_funds | Fonds insuffisants |
| expired_card | Votre carte a expire |
| incorrect_cvc | Le code CVC est incorrect |
| authentication_required | 3D Secure requis |
| do_not_honor | Votre banque a refuse |

### 17.3 Messages i18n

```json
{
  "checkout.err.stripe.card_declined": "Votre carte a ete refusee...",
  "checkout.err.stripe.insufficient_funds": "Fonds insuffisants...",
  "checkout.err.stripe.3ds_required": "Authentification 3D Secure requise...",
  "checkout.err.stripe.api_error": "Erreur du service de paiement...",
  "checkout.err.stripe.network_error": "Probleme de connexion..."
}
```

### 17.4 Retry Strategy

```typescript
// Par type d'erreur
switch (category) {
  case 'rate_limit_error':
    retryAfterMs = 60000;    // 1 minute
    break;
  case 'api_error':
    retryAfterMs = 10000;    // 10 secondes
    break;
  default:
    retryAfterMs = 5000;     // 5 secondes
}
```

### 17.5 Fallback Mechanisms

1. **Idempotence**: Recuperation PaymentIntent existant
2. **Direct Charges**: Fallback Platform Mode si KYC fail
3. **Rate Limiting**: Cache local 5s + Firestore persistant
4. **Lock Release**: Nettoyage automatique en cas d'erreur

---

## 18. ANNEXES

### 18.1 Fichiers Cles

| Fichier | Description | Lignes |
|---------|-------------|--------|
| `createPaymentIntent.ts` | Creation paiements | 1200+ |
| `StripeManager.ts` | Manager Stripe | 500+ |
| `PayPalManager.ts` | Manager PayPal | 3500+ |
| `subscription/webhooks.ts` | Webhooks abonnements | 2000+ |
| `subscription/index.ts` | Cloud Functions abonnements | 100,000+ |
| `lib/secrets.ts` | Gestion secrets | 150+ |
| `firestore.rules` | Regles securite | 1700+ |

### 18.2 Collections Firestore

| Collection | Description |
|------------|-------------|
| payments | Paiements directs |
| subscriptions | Abonnements |
| subscription_plans | Plans disponibles |
| ai_usage | Usage IA |
| invoices | Factures |
| refunds | Remboursements |
| disputes | Litiges |
| pending_transfers | Transferts en attente |
| payment_locks | Anti-doublons |
| paypal_orders | Commandes PayPal |
| paypal_payouts | Versements PayPal |

### 18.3 Checklist Deploiement

```bash
# 1. Configurer secrets Firebase
firebase functions:secrets:set STRIPE_SECRET_KEY_LIVE
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET_LIVE
firebase functions:secrets:set PAYPAL_CLIENT_ID
firebase functions:secrets:set PAYPAL_CLIENT_SECRET

# 2. Configurer mode
firebase functions:params:set STRIPE_MODE="live"
firebase functions:params:set PAYPAL_MODE="live"

# 3. Deployer rules
firebase deploy --only firestore:rules

# 4. Deployer functions
firebase deploy --only functions

# 5. Configurer webhooks Stripe Dashboard
# - Payment Intent events
# - Subscription events
# - Connect events

# 6. Configurer webhooks PayPal Dashboard
# - Checkout events
# - Capture events
# - Dispute events
```

### 18.4 URLs Importantes

- Stripe Dashboard: https://dashboard.stripe.com
- PayPal Developer: https://developer.paypal.com
- Firebase Console: https://console.firebase.google.com

### 18.5 Contacts Support

- Stripe Support: https://support.stripe.com
- PayPal Support: https://www.paypal.com/support

---

## RESUME EXECUTIF

Le systeme de paiement SOS-Expat est une **architecture enterprise-grade** comprenant:

- **Double passerelle**: Stripe (44 pays) + PayPal (150+ pays)
- **Abonnements IA**: 4 plans + essai gratuit 30 jours
- **KYC automatise**: Stripe Connect Express
- **Split automatique**: Direct Charges avec commission 20%
- **Securite multi-couches**: Rate limiting, anti-doublons, validation stricte
- **Monitoring temps reel**: Alertes, metriques, dashboards
- **Retry intelligent**: Backoff exponentiel, Dead Letter Queue
- **Conformite fiscale**: TVA automatique, OSS, VIES

**Economie Firestore estimee**: ~100€/mois grace a:
- Deduplication listeners (~80% reduction)
- Cache webhook (90% reduction)
- Polling vs onSnapshot pour admin

---

*Document genere automatiquement par analyse IA approfondie du codebase SOS-Expat*
