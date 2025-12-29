# ANALYSE COMPLETE - SYSTEME DE PAIEMENT SOS-EXPAT
## Rapport genere par une equipe de 10 agents IA specialises
## Version 2.0 - CORRIGEE selon specifications
## Date: 28 decembre 2024

---

# TABLE DES MATIERES

1. [Synthese Executive](#1-synthese-executive)
2. [Corrections Terminologiques Obligatoires](#2-corrections-terminologiques-obligatoires)
3. [Architecture Actuelle](#3-architecture-actuelle)
4. [Systeme Stripe Connect](#4-systeme-stripe-connect)
5. [Integration Twilio](#5-integration-twilio)
6. [Flux de Paiement et Split Immediat](#6-flux-de-paiement-et-split-immediat)
7. [Systeme de Remboursement](#7-systeme-de-remboursement)
8. [Configuration Tarifaire Corrigee](#8-configuration-tarifaire-corrigee)
9. [Architecture 197 Pays](#9-architecture-197-pays)
10. [Comptes Shell](#10-comptes-shell)
11. [Fonds Non Reclames PayPal](#11-fonds-non-reclames-paypal)
12. [Gestion des Disputes](#12-gestion-des-disputes)
13. [Structure Firestore Corrigee](#13-structure-firestore-corrigee)
14. [Webhooks Existants et Manquants](#14-webhooks-existants-et-manquants)
15. [Ecarts Identifies](#15-ecarts-identifies)
16. [Fichiers a Creer/Modifier](#16-fichiers-a-creer-modifier)
17. [CGU/CGV Clauses Obligatoires](#17-cgu-cgv-clauses-obligatoires)
18. [Conformite GDPR](#18-conformite-gdpr)
19. [Recommandations Prioritaires](#19-recommandations-prioritaires)
20. [Checklist Finale](#20-checklist-finale)

---

# 1. SYNTHESE EXECUTIVE

## 1.1 Etat Actuel

Le systeme SOS-Expat utilise actuellement **Stripe Connect uniquement** avec un modele de **Destination Charges** pour le split automatique des paiements. L'integration avec **Twilio** gere les appels telephoniques/video avec facturation conditionnelle basee sur la duree d'appel (minimum 2 minutes).

## 1.2 Ecart Majeur

| Aspect | Actuel | Plan Ideal |
|--------|--------|------------|
| **Couverture geographique** | ~46 pays (Stripe Connect) | 197 pays (Stripe + PayPal) |
| **Gateway de paiement** | Stripe uniquement | Stripe + PayPal Commerce Platform |

## 1.3 Points Forts Actuels (NE PAS MODIFIER)

- Split automatique via Destination Charges (FONCTIONNE)
- Integration Twilio complete avec retries (FONCTIONNE)
- Regle des 2 minutes bien implementee (FONCTIONNE)
- Remboursements avec reverse_transfer (FONCTIONNE)
- Generation factures automatique (FONCTIONNE)

## 1.4 Ecarts Critiques (6 ecarts)

| # | Ecart | Impact | Priorite |
|---|-------|--------|----------|
| 1 | Absence PayPal Commerce Platform | 151 pays exclus | P1 |
| 2 | Pas de comptes shell (KYC requis) | Friction inscription | P2 |
| 3 | Pas de systeme de relances | Risque perte fonds | P3 |
| 4 | Dashboard prestataire basique | Mauvaise UX | P4 |
| 5 | Pas de gestion fonds non reclames | Non-conformite PayPal | P5 |
| 6 | Pas de gestion des disputes | Risque chargebacks | P6 |

---

# 2. CORRECTIONS TERMINOLOGIQUES OBLIGATOIRES

## 2.1 Frais de Connexion -> Frais de Service

**OBLIGATOIRE** : Remplacer dans TOUT le code et la documentation :

| Terme Actuel (INCORRECT) | Terme Correct | Raison |
|--------------------------|---------------|--------|
| `connectionFeeAmount` | `serviceFeeAmount` | Frais de service de mise en relation |
| `connectionFee` | `serviceFee` | Conformite fiscale et legale |
| "Frais de connexion" | "Frais de service" | Terminologie juridique correcte |
| `platformFeeAmount` | Acceptable aussi | Alternative claire |

## 2.2 RGPD -> GDPR

Utiliser **GDPR** (General Data Protection Regulation) pour la coherence internationale avec les 197 pays.

## 2.3 Fichiers a Modifier pour Terminologie

```
sos/firebase/functions/src/services/pricingService.ts
sos/firebase/functions/src/StripeManager.ts
sos/firebase/functions/src/createPaymentIntent.ts
sos/src/types/pricing.ts
admin_config/pricing (Firestore)
```

---

# 3. ARCHITECTURE ACTUELLE

## 3.1 Stack Technique

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
|      ├── StripeManager.ts           <- Gestionnaire paiements (~1073L)  |
|      ├── TwilioCallManager.ts       <- Gestionnaire appels (~2161L)     |
|      ├── createPaymentIntent.ts     <- Creation PaymentIntent (~762L)   |
|      ├── stripeAutomaticKyc.ts      <- KYC Stripe Connect (~208L)       |
|      ├── Webhooks/                  <- Webhooks Stripe + Twilio         |
|      └── services/pricingService.ts <- Configuration tarifs (~195L)     |
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

## 3.2 Secrets Firebase Existants

```bash
# Stripe (EXISTANTS)
STRIPE_SECRET_KEY_TEST=sk_test_xxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_test_xxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_live_xxx
STRIPE_MODE=test|live

# Twilio (EXISTANTS)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+33xxx
```

## 3.3 Secrets Firebase a Ajouter

```bash
# PayPal (A AJOUTER)
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_PARTNER_ID=xxx
PAYPAL_BN_CODE=SOS_Expat_MP
PAYPAL_MODE=sandbox|live
PAYPAL_WEBHOOK_ID=xxx
```

---

# 4. SYSTEME STRIPE CONNECT

## 4.1 Type de Compte Actuel : Custom (A MIGRER)

```typescript
// ACTUEL (stripeAutomaticKyc.ts) - A MIGRER
const account = await stripe.accounts.create({
  type: "custom",              // <-- PROBLEME : Custom
  country: country || "FR",
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

## 4.2 Type de Compte Cible : Express

```typescript
// CIBLE - A IMPLEMENTER
const account = await stripe.accounts.create({
  type: "express",             // <-- EXPRESS pour comptes shell
  country: country,
  email: email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  // PAS de tos_acceptance requis pour Express
  // KYC differe - le prestataire le complete quand il veut retirer
});
```

## 4.3 Pays Supportes par Stripe Connect (46 pays)

```
Europe (31) : AT, BE, BG, CH, CY, CZ, DE, DK, EE, ES, FI, FR, GB,
              GI, GR, HR, HU, IE, IS, IT, LI, LT, LU, LV, MT, NL,
              NO, PL, PT, RO, SE, SI, SK

Asie-Pacifique (7) : AU, HK, JP, MY, NZ, SG, TH

Moyen-Orient (1) : AE

Ameriques (4) : US, CA, BR, MX

Preview (3) : IN, ID, PH
```

---

# 5. INTEGRATION TWILIO

## 5.1 Systeme Existant (NE PAS MODIFIER)

Le systeme Twilio est **FONCTIONNEL** et ne necessite **PAS de modification**.

**Fichier Principal** : `TwilioCallManager.ts` (~2161 lignes)

## 5.2 Regle des 2 Minutes (FONCTIONNE)

```typescript
// TwilioCallManager.ts:1317-1383
shouldCapturePayment(session: CallSessionState, duration?: number): boolean {
  // Calcule la duree reelle avec fallbacks multiples
  let actualDuration = duration || session.conference.duration || 0;

  // CRITERE 1 : Duree minimum 120 secondes (2 minutes)
  if (actualDuration < 120) return false;

  // CRITERE 2 : Payment status doit etre 'authorized'
  if (session.payment.status !== 'authorized') return false;

  return true; // CAPTURE!
}
```

## 5.3 Systeme de Retries (FONCTIONNE)

```
- 3 tentatives maximum
- Delai entre tentatives : 20s, 25s, puis fin
- Si prestataire ne repond pas apres 3 tentatives -> Mis OFFLINE automatiquement
```

## 5.4 Conditions de Facturation

| Condition | Resultat | Action |
|-----------|----------|--------|
| Appel >= 120 secondes | CAPTURE | Split automatique |
| Appel < 120 secondes | REFUND | Remboursement total |
| Client ne repond pas (3x) | CANCEL | Annulation |
| Provider ne repond pas (3x) | CANCEL | Annulation + offline |

---

# 6. FLUX DE PAIEMENT ET SPLIT IMMEDIAT

## 6.1 POINT CRITIQUE : Split Immediat et Atomique

```
+-------------------------------------------------------------------------+
|                    A LA CAPTURE (fin de prestation >= 2 min)            |
+-------------------------------------------------------------------------+
|                                                                         |
|   Client a paye 49E (exemple avocat EUR)                                |
|                                                                         |
|   AU MEME INSTANT (capture) :                                           |
|   +-- 19E --> SOS-Expat      <-- IMMEDIAT (pas en differe, pas batch)   |
|   +-- 30E --> Prestataire    <-- IMMEDIAT (sur son compte Stripe/PayPal)|
|                                                                         |
|   REGLES ABSOLUES :                                                     |
|   - Les frais de service SOS-Expat (19E) arrivent IMMEDIATEMENT         |
|   - La part prestataire (30E) va DIRECTEMENT sur son compte             |
|   - L'argent du prestataire NE TRANSITE JAMAIS par SOS-Expat            |
|   - Le split est ATOMIQUE (les deux mouvements simultanes)              |
|                                                                         |
+-------------------------------------------------------------------------+
```

## 6.2 Implementation Actuelle (Destination Charges)

```typescript
// StripeManager.ts - Creation PaymentIntent avec Destination Charges
const paymentIntentParams = {
  amount: amountCents,
  currency: currency,
  capture_method: 'manual',  // Capture apres appel >= 2 min

  // DESTINATION CHARGES - Split automatique
  transfer_data: {
    destination: destinationAccountId,  // Compte Stripe prestataire
    amount: providerAmountCents,        // 30E = 3000 centimes
  },
  on_behalf_of: destinationAccountId,
};

// A la capture, Stripe execute automatiquement :
// - 19E (ou equivalent) reste sur compte SOS-Expat
// - 30E (ou equivalent) transfere sur compte prestataire
// TOUT EST IMMEDIAT ET ATOMIQUE
```

## 6.3 Flux Complet

```
CLIENT                    SOS-EXPAT                   PRESTATAIRE
   |                          |                            |
   |  (1) CreatePaymentIntent |                            |
   |------------------------->|                            |
   |  (capture_method:manual) |                            |
   |  (transfer_data->acct_)  |                            |
   |                          |                            |
   |  client_secret retourne  |                            |
   |<-------------------------|                            |
   |                          |                            |
   |  (2) Paiement CB         |                            |
   |  Status: requires_capture|                            |
   |                          |                            |
   |  ========== APPEL TWILIO (>= 2 min) ================  |
   |                          |                            |
   |               (3) CAPTURE IMMEDIATE                   |
   |                          |                            |
   |              +-----------+-----------+                |
   |              |    SPLIT ATOMIQUE     |                |
   |              V                       V                |
   |     +---------------+       +---------------+         |
   |     | SOS-EXPAT     |       | PRESTATAIRE   |         |
   |     | recoit 19E    |       | recoit 30E    |         |
   |     | IMMEDIAT      |       | IMMEDIAT      |         |
   |     | (sur compte   |       | (sur son      |         |
   |     |  plateforme)  |       |  compte)      |         |
   |     +---------------+       +---------------+         |
   |                                                       |
   |     L'argent prestataire NE TRANSITE JAMAIS           |
   |     par le compte SOS-Expat                           |
```

---

# 7. SYSTEME DE REMBOURSEMENT

## 7.1 Fonction refundPayment() (FONCTIONNE)

```typescript
// StripeManager.ts:573-696
async refundPayment(paymentIntentId, reason, sessionId, amount, secretKey) {
  // Verifier si Destination Charges etait utilise
  const usedDestinationCharges = paymentDoc.data()?.useDestinationCharges;

  const refundData = {
    payment_intent: paymentIntentId,
    reason: normalizedReason,
  };

  // CRITIQUE : Inverser le transfert au prestataire
  if (usedDestinationCharges) {
    refundData.reverse_transfer = true;  // <-- IMPORTANT!
  }

  const refund = await this.stripe.refunds.create(refundData);

  // Mise a jour Firestore...
}
```

## 7.2 Webhook transfer.reversed (FONCTIONNE)

Le webhook `transfer.reversed` est deja implemente et met a jour :
- `payments[id].status = 'refunded'`
- `transfers[id].status = 'reversed'`
- `call_sessions[id].payment.transferReversed = true`
- `invoice_records[id].status = 'refunded'`

---

# 8. CONFIGURATION TARIFAIRE CORRIGEE

## 8.1 Montants Confirmes en Production

| Service | Devise | Client paie | SOS-Expat (serviceFee) | Prestataire | Duree max |
|---------|--------|-------------|------------------------|-------------|-----------|
| Avocat | EUR | 49E | 19E | 30E | 25 min |
| Avocat | USD | $55 | $25 | $30 | 25 min |
| Expat | EUR | 19E | 9E | 10E | 35 min |
| Expat | USD | $25 | $15 | $10 | 35 min |

## 8.2 Validation Mathematique Obligatoire

```
totalAmount = serviceFeeAmount + providerAmount

Exemples :
- Avocat EUR : 49 = 19 + 30 ✓
- Avocat USD : 55 = 25 + 30 ✓
- Expat EUR : 19 = 9 + 10 ✓
- Expat USD : 25 = 15 + 10 ✓
```

## 8.3 Configuration admin_config/pricing (CORRIGEE)

```javascript
// admin_config/pricing - STRUCTURE CORRIGEE
{
  lawyer: {
    eur: {
      totalAmount: 4900,           // 49E en centimes
      serviceFeeAmount: 1900,      // 19E (PAS connectionFee!)
      providerAmount: 3000,        // 30E
      duration: 25,
      currency: 'eur'
    },
    usd: {
      totalAmount: 5500,           // $55
      serviceFeeAmount: 2500,      // $25 (PAS connectionFee!)
      providerAmount: 3000,        // $30
      duration: 25,
      currency: 'usd'
    }
  },

  expat: {
    eur: {
      totalAmount: 1900,           // 19E
      serviceFeeAmount: 900,       // 9E
      providerAmount: 1000,        // 10E
      duration: 35,
      currency: 'eur'
    },
    usd: {
      totalAmount: 2500,           // $25
      serviceFeeAmount: 1500,      // $15
      providerAmount: 1000,        // $10
      duration: 35,
      currency: 'usd'
    }
  },

  // Autres types de prestataires (expert, consultant, notaire)
  // A definir selon besoins...

  // Overrides / promotions
  overrides: {
    settings: { stackableDefault: true },
    lawyer: {
      eur: {
        enabled: false,
        startsAt: null,
        endsAt: null,
        totalAmount: null,
        serviceFeeAmount: null,
        providerAmount: null,
        label: null
      }
    }
  },

  updatedAt: Timestamp,
  updatedBy: 'admin_id'
}
```

---

# 9. ARCHITECTURE 197 PAYS

## 9.1 Repartition des Gateways

```
+-------------------------------------------------------------------------+
|                         COUVERTURE MONDIALE                             |
+-------------------------------------------------------------------------+
|                                                                         |
|   STRIPE CONNECT (46 pays)                                              |
|   ------------------------                                              |
|   - Europe (31) : AT, BE, BG, CH, CY, CZ, DE, DK, EE, ES, FI, FR, GB,  |
|                   GI, GR, HR, HU, IE, IS, IT, LI, LT, LU, LV, MT, NL,  |
|                   NO, PL, PT, RO, SE, SI, SK                           |
|   - Asie-Pacifique (7) : AU, HK, JP, MY, NZ, SG, TH                    |
|   - Moyen-Orient (1) : AE                                              |
|   - Ameriques (4) : US, CA, BR, MX                                     |
|   - Preview (3) : IN, ID, PH                                           |
|                                                                         |
|   PAYPAL COMMERCE PLATFORM (151 pays)                                   |
|   -----------------------------------                                   |
|   - Afrique : Tous les pays                                            |
|   - Amerique Latine : Hors BR et MX                                    |
|   - Asie : Hors pays Stripe                                            |
|   - Europe de l'Est : Hors pays Stripe                                 |
|   - Moyen-Orient : Hors AE                                             |
|   - Oceanie : Hors AU et NZ                                            |
|                                                                         |
+-------------------------------------------------------------------------+
```

## 9.2 Flux Identique Quelle Que Soit la Gateway

```
                         CLIENT PAIE (EUR ou USD)
                                   |
                   +---------------+---------------+
                   V                               V
        +---------------------+         +---------------------+
        | Prestataire dans    |         | Prestataire dans    |
        | pays Stripe (46)    |         | pays PayPal (151)   |
        +----------+----------+         +----------+----------+
                   |                               |
                   V                               V
        +---------------------+         +---------------------+
        | STRIPE CONNECT      |         | PAYPAL COMMERCE     |
        | Destination Charges |         | PLATFORM            |
        +----------+----------+         +----------+----------+
                   |                               |
                   |         CAPTURE               |
                   |      (fin prestation)         |
                   |                               |
                   V                               V
        +-----------------------------------------------------+
        |              SPLIT IMMEDIAT IDENTIQUE               |
        |                                                     |
        |   19E/25$ --> SOS-Expat (IMMEDIAT)                  |
        |   30E/30$ --> Prestataire (IMMEDIAT, sur son compte)|
        |                                                     |
        |   L'argent prestataire NE TRANSITE PAS              |
        |   par SOS-Expat                                     |
        +-----------------------------------------------------+
```

## 9.3 Logique de Routage Gateway

```typescript
// PaymentGatewayRouter.ts - A CREER
const STRIPE_COUNTRIES = [
  'AT', 'AU', 'BE', 'BG', 'BR', 'CA', 'CH', 'CY', 'CZ',
  'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GI', 'GR',
  'HK', 'HR', 'HU', 'IE', 'IN', 'ID', 'IS', 'IT', 'JP',
  'LI', 'LT', 'LU', 'LV', 'MT', 'MX', 'MY', 'NL', 'NO',
  'NZ', 'PH', 'PL', 'PT', 'RO', 'SE', 'SG', 'SI', 'SK', 'TH', 'US'
];

export const getGatewayForCountry = (country: string): 'stripe' | 'paypal' => {
  return STRIPE_COUNTRIES.includes(country.toUpperCase()) ? 'stripe' : 'paypal';
};
```

## 9.4 Gestion Multi-Devises

```
+-------------------------------------------------------------------------+
|                         DEVISES SUPPORTEES                              |
+-------------------------------------------------------------------------+
|                                                                         |
|   DEVISE PRINCIPALE : EUR                                               |
|   DEVISE SECONDAIRE : USD                                               |
|                                                                         |
|   REGLE DE SELECTION :                                                  |
|   - Client dans zone EUR --> Paiement en EUR                            |
|   - Client hors zone EUR --> Paiement en USD                            |
|   - OU : Selon preference client (selection manuelle)                   |
|                                                                         |
|   CONVERSION :                                                          |
|   - Stripe/PayPal gerent les conversions automatiquement                |
|   - Le prestataire recoit dans la devise du paiement                    |
|   - Pas de conversion intermediaire par SOS-Expat                       |
|                                                                         |
|   PRESTATAIRE - RETRAIT :                                               |
|   - Stripe : Conversion automatique vers devise locale                  |
|   - PayPal : Conversion automatique ou garde en EUR/USD                 |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

# 10. COMPTES SHELL

## 10.1 Principe : Creation Automatique a l'Inscription

```
+-------------------------------------------------------------------------+
|                    COMPTE SHELL - PRINCIPE                              |
+-------------------------------------------------------------------------+
|                                                                         |
|   INSCRIPTION PRESTATAIRE                                               |
|           |                                                             |
|           V                                                             |
|   +-----------------------------------------------+                     |
|   |  Creation AUTOMATIQUE du compte               |                     |
|   |  Stripe Express ou PayPal Merchant            |                     |
|   |                                               |                     |
|   |  Donnees requises :                           |                     |
|   |  - Email                                      |                     |
|   |  - Pays de residence                          |                     |
|   |  - C'est TOUT                                 |                     |
|   +-----------------------------------------------+                     |
|           |                                                             |
|           V                                                             |
|   +-----------------------------------------------+                     |
|   |  RESULTAT IMMEDIAT                            |                     |
|   |                                               |                     |
|   |  OK  Peut recevoir des paiements              |                     |
|   |  NON Ne peut PAS retirer (KYC non fait)       |                     |
|   |                                               |                     |
|   |  L'argent s'accumule sur son compte           |                     |
|   |  Stripe/PayPal (PAS chez SOS-Expat)           |                     |
|   +-----------------------------------------------+                     |
|           |                                                             |
|           V                                                             |
|   +-----------------------------------------------+                     |
|   |  QUAND IL VEUT RETIRER                        |                     |
|   |                                               |                     |
|   |  --> Redirection vers KYC Stripe/PayPal       |                     |
|   |  --> Verification identite                    |                     |
|   |  --> Ajout compte bancaire                    |                     |
|   |  --> Retrait possible                         |                     |
|   +-----------------------------------------------+                     |
|                                                                         |
+-------------------------------------------------------------------------+
```

## 10.2 Duree de Retention Sans KYC

| Gateway | Duree max sans KYC | Consequence si depasse |
|---------|-------------------|------------------------|
| **Stripe** | ILLIMITEE | Aucune - l'argent reste indefiniment |
| **PayPal** | **180 jours** | Risque remboursement auto au client |

## 10.3 Implementation Stripe Express

```typescript
// ProviderAccountManager.ts - A CREER
export const createShellAccount = async (
  email: string,
  country: string
): Promise<{ accountId: string; gateway: 'stripe' | 'paypal' }> => {

  const gateway = getGatewayForCountry(country);

  if (gateway === 'stripe') {
    const account = await stripe.accounts.create({
      type: 'express',           // EXPRESS pour compte shell
      country: country,
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      // Pas de tos_acceptance - KYC differe
    });

    return { accountId: account.id, gateway: 'stripe' };

  } else {
    // PayPal Commerce Platform - Partner Referral
    const partnerReferral = await paypal.partnerReferrals.create({
      email: email,
      tracking_id: `provider_${Date.now()}`,
      operations: [{
        operation: 'API_INTEGRATION',
        api_integration_preference: {
          rest_api_integration: {
            integration_method: 'PAYPAL',
            integration_type: 'THIRD_PARTY',
          }
        }
      }],
      products: ['EXPRESS_CHECKOUT'],
      legal_consents: [{
        type: 'SHARE_DATA_CONSENT',
        granted: true
      }]
    });

    return {
      accountId: partnerReferral.links[0].href, // URL onboarding
      gateway: 'paypal'
    };
  }
};
```

---

# 11. FONDS NON RECLAMES PAYPAL

## 11.1 Applicable UNIQUEMENT a PayPal

```
+-------------------------------------------------------------------------+
|              FONDS NON RECLAMES - PAYPAL UNIQUEMENT                     |
+-------------------------------------------------------------------------+
|                                                                         |
|   STRIPE : Pas concerne (duree illimitee)                               |
|   PAYPAL : Limite 180 jours                                             |
|                                                                         |
+-------------------------------------------------------------------------+
```

## 11.2 Calendrier de Relances

| Jour | Type | Canaux | Message |
|------|------|--------|---------|
| J+0 | Information | Email + Dashboard | "Configurez votre compte pour recevoir vos gains" |
| J+3 | Rappel doux | Email | "N'oubliez pas de configurer vos paiements" |
| J+7 | Rappel | Email | "X EUR vous attendent" |
| J+15 | Rappel | Email + SMS | "Configurez votre compte PayPal" |
| J+30 | Important | Email | "Vous avez X EUR en attente depuis 30 jours" |
| J+60 | Urgent | Email + SMS | "Recuperez vos gains" |
| J+90 | Alerte | Email + SMS + Dashboard | "Action requise - 90 jours restants" |
| J+120 | Avertissement | Email + SMS | "Plus que 60 jours pour recuperer vos fonds" |
| J+150 | Mise en demeure | Email + SMS + Dashboard | "URGENT : 30 jours restants" |
| J+165 | Dernier rappel | Email + SMS + Appel auto | "DERNIER RAPPEL : 15 jours" |
| J+180 | Expiration | - | Traitement automatique |

## 11.3 Repartition a l'Expiration (J+180)

```
+-------------------------------------------------------------------------+
|                    EXPIRATION J+180 - REPARTITION                       |
+-------------------------------------------------------------------------+
|                                                                         |
|   Montant du au prestataire : 30E (ou 30$)                              |
|                                                                         |
|   REPARTITION AUTOMATIQUE :                                             |
|   +-------------------------------------------------------------+      |
|   |                                                             |      |
|   |   20E (ou 20$) ----------> SOS-EXPAT                        |      |
|   |                            (frais de gestion du dossier)    |      |
|   |                                                             |      |
|   |   10E (ou 10$) ----------> ONG PARTENAIRE                   |      |
|   |                            (don automatique)                |      |
|   |                                                             |      |
|   +-------------------------------------------------------------+      |
|                                                                         |
|   Ces montants sont CONFIGURABLES dans l'admin console.                 |
|                                                                         |
+-------------------------------------------------------------------------+
```

## 11.4 Reclamation Tardive (J+180 a J+545)

```
+-------------------------------------------------------------------------+
|                    RECLAMATION TARDIVE                                  |
+-------------------------------------------------------------------------+
|                                                                         |
|   PERIODE : 12 mois apres expiration (J+180 a J+545)                    |
|                                                                         |
|   CONDITION : Le prestataire contacte le support                        |
|                                                                         |
|   PROCESSUS :                                                           |
|   1. Verification de l'identite du prestataire                          |
|   2. Verification du dossier (session, paiement original)               |
|   3. Calcul du remboursement :                                          |
|                                                                         |
|      Montant original : 30E                                             |
|      - Frais de gestion : 20E                                           |
|      --------------------------                                         |
|      = Remboursement : 10E                                              |
|                                                                         |
|   4. Virement manuel vers le prestataire                                |
|   5. Annulation du don ONG (si pas encore verse)                        |
|                                                                         |
|   APRES J+545 : Aucune reclamation possible                             |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

# 12. GESTION DES DISPUTES

## 12.1 Webhooks Manquants (A IMPLEMENTER)

| Event | Action |
|-------|--------|
| `charge.dispute.created` | Notifier admin + prestataire, creer document disputes |
| `charge.dispute.updated` | Mettre a jour statut |
| `charge.dispute.closed` | Traiter resultat (won/lost) |

## 12.2 Workflow Disputes

```
+-------------------------------------------------------------------------+
|                    WORKFLOW DISPUTES                                    |
+-------------------------------------------------------------------------+
|                                                                         |
|   Client ouvre un litige (chargeback)                                   |
|           |                                                             |
|           V                                                             |
|   Webhook charge.dispute.created                                        |
|           |                                                             |
|           V                                                             |
|   +-----------------------------------------------+                     |
|   |  NOTIFICATION AUTOMATIQUE                     |                     |
|   |  - Admin notifie (email + dashboard)          |                     |
|   |  - Prestataire notifie (email)                |                     |
|   |  - Session marquee "disputed"                 |                     |
|   +-----------------------------------------------+                     |
|           |                                                             |
|           V                                                             |
|   Admin soumet preuves via Dashboard                                    |
|   - Enregistrement appel (Twilio recording)                             |
|   - Logs de la session                                                  |
|   - Confirmation du prestataire                                         |
|           |                                                             |
|           V                                                             |
|   Webhook charge.dispute.closed                                         |
|           |                                                             |
|           +---> WON : Paiement conserve                                 |
|           |           - Mettre a jour statut                            |
|           |           - Notifier admin + prestataire                    |
|           |                                                             |
|           +---> LOST : Remboursement auto + frais Stripe (~15E)         |
|                       - Mettre a jour statut                            |
|                       - Logger la perte                                 |
|                       - Notifier admin + prestataire                    |
|                                                                         |
+-------------------------------------------------------------------------+
```

## 12.3 Collection disputes (A CREER)

```javascript
// Collection disputes
{
  id: string,

  // Reference
  disputeId: string,              // dp_xxx (Stripe)
  paymentIntentId: string,
  chargeId: string,
  sessionId: string,

  // Parties
  providerId: string,
  clientId: string,

  // Montants
  amount: number,                 // En centimes
  currency: 'eur' | 'usd',

  // Statut
  status: 'warning_needs_response' | 'warning_under_review' |
          'warning_closed' | 'needs_response' | 'under_review' |
          'charge_refunded' | 'won' | 'lost',

  reason: 'duplicate' | 'fraudulent' | 'subscription_canceled' |
          'product_unacceptable' | 'product_not_received' |
          'unrecognized' | 'credit_not_processed' | 'general',

  // Preuves
  evidenceSubmitted: boolean,
  evidenceDueBy: Timestamp,

  // Resolution
  resolvedAt: Timestamp | null,
  outcome: 'won' | 'lost' | null,
  netImpact: number | null,       // Montant perdu si lost (+ frais ~15E)

  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

# 13. STRUCTURE FIRESTORE CORRIGEE

## 13.1 Collection sos_profiles (MISE A JOUR)

```javascript
// sos_profiles - STRUCTURE COMPLETE CORRIGEE
{
  // === IDENTITE ===
  id: string,
  email: string,
  displayName: string,
  type: 'lawyer' | 'expert' | 'consultant' | 'notaire',

  // === LOCALISATION ===
  residenceCountry: string,        // Code ISO (ex: "FR", "SN", "US")
  preferredCurrency: 'eur' | 'usd',

  // === GATEWAY PRINCIPALE ===
  primaryPaymentMethod: 'stripe' | 'paypal',  // Determine auto par pays

  // === STRIPE CONNECT (si pays Stripe) ===
  stripe: {
    accountId: string,             // acct_xxx
    accountType: 'express',        // Toujours Express (pas Custom)
    status: 'pending' | 'verified' | 'restricted',
    chargesEnabled: boolean,       // Peut recevoir des paiements
    payoutsEnabled: boolean,       // Peut retirer (KYC complet)
    requirements: object,          // Exigences Stripe restantes
    createdAt: Timestamp,
    verifiedAt: Timestamp | null
  },

  // === PAYPAL COMMERCE (si pays non-Stripe) ===
  paypal: {
    merchantId: string,            // ID marchand PayPal
    email: string,                 // Email PayPal
    status: 'pending' | 'verified' | 'restricted',
    paymentsReceivable: boolean,   // Peut recevoir des paiements
    canWithdraw: boolean,          // Peut retirer (verifie)
    trackingId: string,            // Pour Partner Referral
    createdAt: Timestamp,
    verifiedAt: Timestamp | null
  },

  // === FLAGS GLOBAUX ===
  canReceivePayments: boolean,     // true si Stripe OU PayPal OK
  canWithdraw: boolean,            // true si KYC complet
  paymentSetupComplete: boolean,   // true si tout est configure

  // === STATISTIQUES ===
  totalEarnings: number,           // Total gagne (en centimes)
  pendingBalance: number,          // En attente de retrait (en centimes)
  currency: 'eur' | 'usd',

  // === AUTRES CHAMPS EXISTANTS ===
  isOnline: boolean,
  status: 'active' | 'pending' | 'suspended' | 'blocked',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 13.2 Collection admin_config/payment_settings (A CREER)

```javascript
// admin_config/payment_settings - STRUCTURE COMPLETE
{
  // === TARIFICATION PAR TYPE ===
  pricing: {
    lawyer: {
      eur: {
        totalAmount: 4900,         // 49E (en centimes)
        serviceFeeAmount: 1900,    // 19E pour SOS-Expat
        providerAmount: 3000,      // 30E pour prestataire
        duration: 25               // Minutes max
      },
      usd: {
        totalAmount: 5500,         // $55
        serviceFeeAmount: 2500,    // $25 pour SOS-Expat
        providerAmount: 3000,      // $30 pour prestataire
        duration: 25
      }
    },
    expat: {
      eur: {
        totalAmount: 1900,
        serviceFeeAmount: 900,
        providerAmount: 1000,
        duration: 35
      },
      usd: {
        totalAmount: 2500,
        serviceFeeAmount: 1500,
        providerAmount: 1000,
        duration: 35
      }
    }
    // ... autres types
  },

  // === GATEWAYS ===
  gateways: {
    stripe: {
      enabled: true,
      mode: 'live',                // 'live' ou 'test'
      accountType: 'express',      // Migration Custom -> Express
      supportedCountries: [        // 46 pays
        'AT', 'AU', 'BE', 'BG', 'BR', 'CA', 'CH', 'CY', 'CZ',
        'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GI', 'GR',
        'HK', 'HR', 'HU', 'IE', 'IN', 'ID', 'IS', 'IT', 'JP',
        'LI', 'LT', 'LU', 'LV', 'MT', 'MX', 'MY', 'NL', 'NO',
        'NZ', 'PH', 'PL', 'PT', 'RO', 'SE', 'SG', 'SI', 'SK', 'TH', 'US'
      ]
    },
    paypal: {
      enabled: true,
      mode: 'live',                // 'live' ou 'sandbox'
      partnerId: 'XXXX',           // Partner ID SOS-Expat
      bnCode: 'SOS_Expat_MP'       // Build Notation Code
      // Tous les autres pays (151)
    }
  },

  // === REGLES DE FACTURATION ===
  billing: {
    minimumCallDuration: 120,      // 2 minutes minimum pour capturer
    maxRetries: 3,                 // Tentatives d'appel avant annulation
    captureDelay: 0                // Capture immediate a la fin (0 = immediat)
  }
}
```

## 13.3 Collection admin_config/unclaimed_funds_settings (A CREER)

```javascript
// admin_config/unclaimed_funds_settings
{
  // Applicable PayPal uniquement
  expirationDays: 180,             // Jours avant expiration
  lateClaimPeriodDays: 365,        // Jours supplementaires pour reclamation

  distribution: {
    sosExpatAmount: 2000,          // 20E (en centimes) pour SOS-Expat
    charityAmount: 1000            // 10E (en centimes) pour ONG
  },

  charityPartner: {
    name: 'Medecins Sans Frontieres',
    id: 'msf',
    paypalEmail: 'donations@msf.org'
  },

  reminders: {
    enabled: true,
    schedule: [3, 7, 15, 30, 60, 90, 120, 150, 165]  // Jours
  },

  allowLateClaims: true,
  deductFeesFromLateClaims: true   // 30E - 20E frais = 10E rembourse
}
```

## 13.4 Collection unclaimed_funds (A CREER)

```javascript
// unclaimed_funds - Pour tracking PayPal uniquement
{
  id: string,

  // === REFERENCE ===
  sessionId: string,
  paypalOrderId: string,

  // === PRESTATAIRE ===
  providerId: string,
  providerEmail: string,
  providerName: string,
  providerCountry: string,

  // === CLIENT (pour info) ===
  clientId: string,
  clientEmail: string,

  // === MONTANTS ===
  amount: number,                  // 3000 (30E en centimes)
  currency: 'eur' | 'usd',

  // === DATES ===
  paymentDate: Timestamp,          // Date du paiement original
  createdAt: Timestamp,            // Date creation de ce record
  expiresAt: Timestamp,            // J+180
  lateClaimDeadline: Timestamp,    // J+180+365

  // === RELANCES ===
  reminders: [
    {
      day: 3,
      type: 'email',
      sentAt: Timestamp,
      messageId: string
    },
    // ...
  ],

  // === STATUT ===
  status: 'pending' | 'warning_sent' | 'final_warning' |
          'expired' | 'processed' | 'claimed' | 'claimed_late',

  // === RESOLUTION (si expire) ===
  resolution: {
    type: 'expired' | 'claimed' | 'claimed_late',
    processedAt: Timestamp,

    // Si expire
    distribution: {
      platformFee: 2000,           // 20E
      charityAmount: 1000,         // 10E
      charityName: 'Medecins Sans Frontieres'
    },

    // Si reclamation tardive
    lateClaimRefund: 1000,         // 10E (30E - 20E frais)
    refundMethod: 'paypal' | 'bank_transfer',
    refundReference: string
  }
}
```

---

# 14. WEBHOOKS EXISTANTS ET MANQUANTS

## 14.1 Webhooks Stripe EXISTANTS (OK - Ne pas modifier)

| Event | Statut | Handler |
|-------|--------|---------|
| `payment_intent.succeeded` | OK | `handlePaymentIntentSucceeded` |
| `payment_intent.payment_failed` | OK | `handlePaymentIntentFailed` |
| `payment_intent.canceled` | OK | `handlePaymentIntentCanceled` |
| `charge.refunded` | OK | `handleChargeRefunded` |
| `transfer.created` | OK | `handleTransferCreated` |
| `transfer.reversed` | OK | `handleTransferReversed` |
| `transfer.failed` | OK | `handleTransferFailed` |

## 14.2 Webhooks Stripe MANQUANTS (A implementer)

| Event | Action requise | Priorite |
|-------|----------------|----------|
| `account.updated` | Mettre a jour statut KYC prestataire | P2 |
| `account.application.deauthorized` | Desactiver compte prestataire | P2 |
| `charge.dispute.created` | Notifier admin + prestataire | P6 |
| `charge.dispute.updated` | Mettre a jour statut | P6 |
| `charge.dispute.closed` | Traiter resultat (won/lost) | P6 |

## 14.3 Webhooks PayPal (A creer entierement)

| Event | Action | Priorite |
|-------|--------|----------|
| `PAYMENT.CAPTURE.COMPLETED` | Logger succes, update session | P1 |
| `PAYMENT.CAPTURE.DENIED` | Notifier client, logger erreur | P1 |
| `PAYMENT.CAPTURE.REFUNDED` | Update session, notifier | P1 |
| `MERCHANT.ONBOARDING.COMPLETED` | Update statut prestataire | P1 |
| `MERCHANT.PARTNER-CONSENT.REVOKED` | Desactiver compte | P1 |

---

# 15. ECARTS IDENTIFIES

## 15.1 Liste Complete des 6 Ecarts

| # | Ecart | Impact | Priorite | Effort |
|---|-------|--------|----------|--------|
| 1 | Absence PayPal Commerce Platform | 151 pays exclus | P1 | ~800 lignes |
| 2 | Pas de comptes shell (KYC requis) | Friction inscription | P2 | ~400 lignes |
| 3 | Pas de systeme de relances | Risque perte fonds | P3 | ~300 lignes + templates |
| 4 | Dashboard prestataire basique | Mauvaise UX | P4 | ~400 lignes |
| 5 | Pas de gestion fonds non reclames | Non-conformite PayPal | P5 | ~600 lignes |
| 6 | Pas de gestion des disputes | Risque chargebacks | P6 | ~400 lignes |

## 15.2 Detail Ecart 1 : PayPal Commerce Platform

**Impact** : 151 pays non couverts

**Fichiers a creer** :
- `PayPalCommerceManager.ts` (~400 lignes)
- `PaymentGatewayRouter.ts` (~200 lignes)
- Webhooks PayPal dans `index.ts` (~200 lignes)

## 15.3 Detail Ecart 2 : Comptes Shell

**Impact** : Friction majeure a l'inscription

**Actions** :
- Migrer de Custom vers Express accounts
- Modifier `stripeAutomaticKyc.ts`
- Creer `ProviderAccountManager.ts`

## 15.4 Detail Ecart 6 : Gestion des Disputes

**Impact** : Risque chargebacks non geres

**Fichiers a creer** :
- `disputeHandler.ts` (Backend)
- `AdminDisputes.tsx` (Frontend)
- Collection `disputes` (Firestore)

---

# 16. FICHIERS A CREER/MODIFIER

## 16.1 Backend (Firebase Functions)

| Fichier | Action | Priorite | Description |
|---------|--------|----------|-------------|
| `PayPalCommerceManager.ts` | CREER | P1 | Gestion PayPal Commerce Platform |
| `PaymentGatewayRouter.ts` | CREER | P1 | Router Stripe vs PayPal |
| `ProviderAccountManager.ts` | CREER | P2 | Creation comptes shell |
| `reminderScheduler.ts` | CREER | P3 | Cron relances KYC |
| `UnclaimedFundsManager.ts` | CREER | P5 | Gestion fonds non reclames |
| `disputeHandler.ts` | CREER | P6 | Gestion disputes Stripe |
| `StripeManager.ts` | MODIFIER | P2 | Support Express accounts |
| `stripeAutomaticKyc.ts` | MODIFIER | P2 | Support comptes shell |
| `createPaymentIntent.ts` | MODIFIER | P1 | Router vers bonne gateway |
| `pricingService.ts` | MODIFIER | P1 | Renommer connectionFee -> serviceFee |
| `index.ts` | MODIFIER | P1 | Webhooks PayPal + disputes + account.updated |

## 16.2 Frontend

| Fichier | Action | Priorite | Description |
|---------|--------|----------|-------------|
| `PayPalOnboarding.tsx` | CREER | P1 | Onboarding Commerce Platform |
| `PaymentMethodSetup.tsx` | CREER | P2 | Config paiement prestataire |
| `ProviderEarnings.tsx` | CREER | P4 | Dashboard gains prestataire |
| `AdminUnclaimedFunds.tsx` | CREER | P5 | Gestion fonds non reclames |
| `AdminDisputes.tsx` | CREER | P6 | Gestion disputes |
| `PaymentForm.tsx` | MODIFIER | P1 | Support Stripe + PayPal |
| `RegisterLawyer.tsx` | MODIFIER | P2 | Compte shell auto a l'inscription |

## 16.3 Collections Firestore

| Collection | Action | Description |
|------------|--------|-------------|
| `admin_config/payment_settings` | CREER | Config gateways et tarifs |
| `admin_config/unclaimed_funds_settings` | CREER | Config fonds non reclames |
| `unclaimed_funds` | CREER | Tracking fonds en attente PayPal |
| `payment_reminders` | CREER | Historique relances |
| `disputes` | CREER | Tracking disputes |
| `sos_profiles` | MODIFIER | Ajouter champs PayPal + flags |
| `call_sessions` | MODIFIER | Ajouter champ gateway |
| `admin_config/pricing` | MODIFIER | Renommer connectionFee -> serviceFee |

---

# 17. CGU/CGV CLAUSES OBLIGATOIRES

## 17.1 Nouvelles Clauses a Ajouter

```
ARTICLE X - CONDITIONS DE PAIEMENT DES PRESTATAIRES

X.1 - Frais de service
SOS-Expat percoit des frais de service pour la mise en relation
entre le Client et le Prestataire. Ces frais sont preleves
automatiquement au moment de la validation de la prestation
(appel d'une duree minimale de 2 minutes).

X.2 - Creation du compte de paiement
Lors de son inscription, un compte de paiement (Stripe ou PayPal selon
le pays de residence) est automatiquement cree pour le Prestataire.
Ce compte permet de recevoir des paiements immediatement.

X.3 - Verification d'identite
Pour proceder au retrait des fonds, le Prestataire doit completer la
verification d'identite requise par le prestataire de paiement
(Stripe ou PayPal).

X.4 - Delai de configuration (PayPal uniquement)
Le Prestataire utilisant PayPal dispose d'un delai de 180 jours a
compter de la premiere transaction pour verifier son compte.
SOS-Expat s'engage a envoyer un minimum de 9 relances pendant cette
periode.

X.5 - Fonds non reclames (PayPal uniquement)
A l'expiration du delai de 180 jours sans verification du compte :
  a) Les fonds seront consideres comme non reclames
  b) Des frais de gestion de 20 EUR seront preleves
  c) Le solde (10 EUR) sera reverse a une association caritative partenaire

X.6 - Reclamation tardive
Le Prestataire conserve le droit de reclamer ses fonds pendant une
periode supplementaire de 12 mois apres expiration, sous reserve de
justifier son identite. Le montant rembourse sera diminue des frais
de gestion (20 EUR).

X.7 - Litiges (Disputes)
En cas de litige initie par un Client, SOS-Expat se reserve le droit
de bloquer temporairement les fonds concernes jusqu'a resolution du
litige.
```

---

# 18. CONFORMITE GDPR

## 18.1 Points de Conformite

| Aspect | Mesure |
|--------|--------|
| Donnees minimales | Seuls email + pays requis pour creer compte shell |
| Pas de stockage CB | Stripe/PayPal gerent les donnees de paiement |
| Droit a l'effacement | Possible sauf obligations legales (factures) |
| Consentement | Explicite a l'inscription |
| Transferts hors UE | PayPal et Stripe sont certifies |
| DPO | A definir si >250 employes ou traitement sensible |

## 18.2 Donnees Stockees par SOS-Expat

```
- Email prestataire
- Pays de residence
- Identifiants comptes (stripeAccountId, paypalMerchantId)
- Historique transactions (montants, dates)
- Statuts KYC
- Logs d'appels

PAS STOCKE par SOS-Expat :
- Numeros de carte bancaire
- Codes CVV
- Donnees bancaires detaillees
- Documents d'identite (geres par Stripe/PayPal)
```

---

# 19. RECOMMANDATIONS PRIORITAIRES

## 19.1 Priorite 1 : PayPal Commerce Platform

**Raison** : Sans PayPal, 151 pays ne peuvent pas utiliser la plateforme.

**Actions** :
1. Creer compte PayPal Business
2. Activer PayPal Commerce Platform (Partner Referral)
3. Creer `PayPalCommerceManager.ts`
4. Creer `PaymentGatewayRouter.ts`
5. Configurer webhooks PayPal
6. Tester en sandbox

**Effort estime** : ~800 lignes de code

## 19.2 Priorite 2 : Comptes Shell (KYC Differe)

**Raison** : Friction majeure a l'inscription des prestataires.

**Actions** :
1. Migrer de Custom vers Express accounts
2. Modifier `stripeAutomaticKyc.ts`
3. Creer `ProviderAccountManager.ts`
4. Permettre paiements avant KYC complet

**Effort estime** : ~400 lignes de code

## 19.3 Priorite 3 : Systeme de Relances

**Raison** : Risque de perte de fonds PayPal apres 180 jours.

**Actions** :
1. Creer `reminderScheduler.ts`
2. Configurer scheduled functions
3. Creer templates emails/SMS (15 templates x 9 langues)

**Effort estime** : ~300 lignes + templates

## 19.4 Priorite 4 : Dashboard Prestataire

**Raison** : Transparence sur les gains et statut KYC.

**Actions** :
1. Creer `ProviderEarnings.tsx`
2. Afficher historique des transactions
3. Afficher statut KYC et progression

**Effort estime** : ~400 lignes de code

## 19.5 Priorite 5 : Gestion Fonds Non Reclames

**Raison** : Conformite et eviter perte apres expiration PayPal.

**Actions** :
1. Creer `UnclaimedFundsManager.ts`
2. Creer collection `unclaimed_funds`
3. Implementer flux J+180 avec redistribution

**Effort estime** : ~600 lignes de code

## 19.6 Priorite 6 : Gestion des Disputes

**Raison** : Conformite et protection contre les litiges.

**Actions** :
1. Ajouter webhooks `charge.dispute.*`
2. Creer `disputeHandler.ts`
3. Creer `AdminDisputes.tsx`

**Effort estime** : ~400 lignes de code

---

# 20. CHECKLIST FINALE

## 20.1 Validation Avant Implementation

| # | Verification | Statut |
|---|--------------|--------|
| 1 | Terminologie "serviceFee" utilisee partout (pas connectionFee) | [ ] |
| 2 | Split IMMEDIAT a la capture (pas differe, pas batch) | [ ] |
| 3 | Argent prestataire ne transite JAMAIS par SOS-Expat | [ ] |
| 4 | 46 pays Stripe + 151 pays PayPal = 197 pays | [ ] |
| 5 | Support EUR et USD (montants confirmes) | [ ] |
| 6 | Comptes shell crees a l'inscription | [ ] |
| 7 | Migration Stripe Custom -> Express | [ ] |
| 8 | Duree illimitee Stripe, 180j PayPal | [ ] |
| 9 | Repartition J+180 : 20 EUR SOS + 10 EUR ONG | [ ] |
| 10 | Reclamation tardive 12 mois (- 20 EUR frais) | [ ] |
| 11 | Gestion des disputes implementee | [ ] |
| 12 | Webhooks account.updated + disputes | [ ] |
| 13 | CGU/CGV mises a jour | [ ] |
| 14 | Conformite GDPR | [ ] |
| 15 | Systeme Twilio inchange (fonctionne) | [ ] |
| 16 | ONG partenaire definie | [ ] |

## 20.2 Questions a Clarifier Avant Implementation

1. **Montants actuels en production** : 49 EUR total (19 EUR SOS + 30 EUR prestataire) pour les avocats - CONFIRME ?

2. **Comptes Stripe existants** : Y a-t-il des prestataires avec des comptes Custom a migrer vers Express ?

3. **ONG partenaire** : Quelle association choisir pour les dons automatiques ?

4. **Devises supplementaires** : Faut-il prevoir d'autres devises que EUR et USD a terme ?

5. **SMS international** : Quel provider pour les SMS de relance (Twilio deja en place) ?

---

# CONCLUSION

Le systeme de paiement actuel de SOS-Expat est **solide techniquement** mais **limite geographiquement**.

## Points Forts (NE PAS MODIFIER)

- Split automatique via Destination Charges (FONCTIONNE)
- Integration Twilio complete avec retries (FONCTIONNE)
- Regle des 2 minutes bien implementee (FONCTIONNE)
- Remboursements avec reverse_transfer (FONCTIONNE)
- Generation factures automatique (FONCTIONNE)

## Corrections Obligatoires

- Terminologie : connectionFee -> serviceFee
- RGPD -> GDPR

## Manques Critiques (6 ecarts)

1. PayPal absent (151 pays exclus) - P1
2. Pas de comptes shell (friction inscription) - P2
3. Pas de relances automatiques - P3
4. Dashboard prestataire basique - P4
5. Pas de gestion fonds non reclames - P5
6. Pas de gestion disputes - P6

## Prochaines Etapes

1. Implementer PayPal Commerce Platform
2. Migrer vers comptes shell (Express accounts)
3. Ajouter systeme de relances
4. Implementer gestion fonds non reclames
5. Ajouter gestion disputes
6. Mettre a jour CGU/CGV

---

**Rapport genere le** : 28 decembre 2024
**Version** : 2.0 - CORRIGEE
**Equipe d'analyse** : 10 agents IA specialises
**Fichiers analyses** : ~50 fichiers sources
**Lignes de code analysees** : ~15,000+

---

# FIN DU RAPPORT V2
