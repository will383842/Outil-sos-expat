# Tests Manuels - SOS-Expat Platform

## 1. Tests Stripe

### 1.1 Paiement Standard (Carte)
```
Carte de test: 4242 4242 4242 4242
Date: Toute date future (ex: 12/25)
CVC: Tout code 3 chiffres (ex: 123)
```

**Etapes:**
1. Se connecter en tant que client
2. Selectionner un prestataire et reserver un appel
3. Aller sur la page de paiement (CallCheckout)
4. Entrer les informations de carte test
5. Valider le paiement
6. Verifier:
   - [ ] Le PaymentIntent est cree (Stripe Dashboard)
   - [ ] Le paiement passe au statut "succeeded"
   - [ ] Le document `payments/{id}` est cree dans Firestore
   - [ ] L'appel est confirme (statut "paid")
   - [ ] Le client recoit un email de confirmation

### 1.2 Test 3D Secure (Authentification Forte)
```
Carte de test 3DS: 4000 0025 0000 3155
Date: Toute date future
CVC: Tout code 3 chiffres
```

**Etapes:**
1. Suivre les etapes 1-4 du test 1.1
2. Valider le paiement
3. Une fenetre 3D Secure doit s'ouvrir
4. Cliquer sur "Complete authentication" dans la modal
5. Verifier:
   - [ ] Le paiement est confirme apres 3DS
   - [ ] Le PaymentIntent a nextAction = null apres confirmation
   - [ ] Le statut est "succeeded"

### 1.3 Test Carte Refusee
```
Carte refusee: 4000 0000 0000 0002
```

**Verifier:**
- [ ] Message d'erreur traduit affiche (checkout.err.stripe.card_declined)
- [ ] Le paiement n'est pas cree dans Firestore
- [ ] Le client peut reessayer avec une autre carte

### 1.4 Test Fonds Insuffisants
```
Carte fonds insuffisants: 4000 0000 0000 9995
```

**Verifier:**
- [ ] Message d'erreur "Fonds insuffisants" affiche
- [ ] Cle de traduction: checkout.err.stripe.insufficient_funds

### 1.5 Test Abonnement IA
```
Carte: 4242 4242 4242 4242
```

**Etapes:**
1. Se connecter en tant que prestataire
2. Aller sur /dashboard/subscription/plans
3. Choisir un plan (Basic, Standard, Pro)
4. Completer le checkout Stripe
5. Verifier:
   - [ ] Document `subscriptions/{providerId}` cree
   - [ ] Document `ai_usage/{providerId}` initialise avec quota
   - [ ] Webhook `customer.subscription.created` traite
   - [ ] Email de bienvenue envoye

---

## 2. Tests PayPal

### 2.1 Configuration Sandbox
```
Email sandbox: sb-xxxx@personal.example.com
Mot de passe: (fourni par PayPal Developer)
```

### 2.2 Paiement Standard
**Etapes:**
1. Selectionner PayPal comme methode de paiement
2. Etre redirige vers PayPal sandbox
3. Se connecter avec compte test
4. Confirmer le paiement
5. Verifier:
   - [ ] Retour sur la page de succes
   - [ ] Order capture reussie
   - [ ] Document payment cree avec gateway = "paypal"

### 2.3 Annulation PayPal
**Etapes:**
1. Initier un paiement PayPal
2. Cliquer "Cancel" sur la page PayPal
3. Verifier:
   - [ ] Retour sur la page de paiement
   - [ ] Aucun paiement enregistre
   - [ ] Message d'annulation affiche

---

## 3. Tests Webhooks Stripe

### 3.1 Tester avec Stripe CLI
```bash
# Installation
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks vers local
stripe listen --forward-to localhost:5001/sos-expat-a1bed/europe-west1/stripeWebhook
```

### 3.2 Events a tester

| Event | Verification |
|-------|-------------|
| `customer.subscription.created` | Document subscription cree, ai_usage initialise |
| `customer.subscription.updated` | Status mis a jour, tier modifie si upgrade/downgrade |
| `customer.subscription.deleted` | Status = canceled, aiAccessEnabled = false |
| `invoice.paid` | Quota reset, facture stockee |
| `invoice.payment_failed` | Status = past_due, email urgent envoye |
| `customer.subscription.trial_will_end` | Email rappel envoye |
| `charge.dispute.created` | Document dispute cree, alerte admin |
| `charge.dispute.closed` | Dispute mis a jour, resultat loggue |
| `payout.failed` | Alerte admin creee |
| `refund.failed` | Log d'echec, alerte admin |

### 3.3 Test Trigger Manuel
```bash
# Trigger un event specifique
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
stripe trigger charge.dispute.created
```

---

## 4. Tests Firestore Rules

### 4.1 Outils de Test
1. **Firebase Emulator** (recommande):
```bash
cd sos
firebase emulators:start --only firestore
```

2. **Console Firebase** > Firestore > Rules > Rules Playground

### 4.2 Tests de Securite

#### 4.2.1 Collection `payments`
```javascript
// Test: Client ne peut pas modifier le status manuellement
// Attendu: DENIED
const testPath = 'payments/test123';
const testData = { status: 'succeeded' };
// Auth: { uid: 'client123' }
```

#### 4.2.2 Collection `subscriptions`
```javascript
// Test: Prestataire peut lire son abonnement
// Attendu: ALLOWED
// Path: subscriptions/provider123
// Auth: { uid: 'provider123' }

// Test: Prestataire ne peut pas modifier stripeSubscriptionId
// Attendu: DENIED
// Data: { stripeSubscriptionId: 'sub_fake' }
```

#### 4.2.3 Collection `sos_profiles`
```javascript
// Test: Utilisateur ne peut pas modifier stripeCustomerId
// Attendu: DENIED

// Test: Utilisateur ne peut pas modifier paypalMerchantId
// Attendu: DENIED
```

### 4.3 Commandes de Test
```bash
# Deployer les rules en mode test
firebase deploy --only firestore:rules

# Verifier les rules actives
firebase firestore:rules:get
```

---

## 5. Tests d'Integration E2E

### 5.1 Parcours Client Complet
1. [ ] Inscription client
2. [ ] Recherche prestataire
3. [ ] Selection et reservation
4. [ ] Paiement (Stripe ou PayPal)
5. [ ] Confirmation appel
6. [ ] Reception email confirmation
7. [ ] Appel Twilio (si configure)
8. [ ] Review post-appel

### 5.2 Parcours Prestataire Complet
1. [ ] Inscription prestataire
2. [ ] Souscription plan IA
3. [ ] Configuration profil
4. [ ] Reception demandes
5. [ ] Gestion calendrier
6. [ ] Consultation earnings
7. [ ] Demande payout

### 5.3 Parcours Admin
1. [ ] Connexion admin
2. [ ] Dashboard paiements
3. [ ] Gestion disputes
4. [ ] Consultation logs
5. [ ] Configuration plans

---

## 6. Checklist Pre-Production

### 6.1 Configuration
- [ ] STRIPE_SECRET_KEY en production (sk_live_...)
- [ ] STRIPE_WEBHOOK_SECRET en production (whsec_...)
- [ ] PAYPAL_CLIENT_ID en production
- [ ] PAYPAL_CLIENT_SECRET en production
- [ ] Mode sandbox PayPal desactive

### 6.2 Webhooks
- [ ] Endpoints enregistres dans Stripe Dashboard
- [ ] Events necessaires actives:
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - customer.subscription.trial_will_end
  - customer.subscription.paused
  - customer.subscription.resumed
  - invoice.created
  - invoice.paid
  - invoice.payment_failed
  - payment_method.attached
  - payment_method.updated
  - payout.failed
  - refund.failed
  - payment_intent.payment_failed
  - charge.dispute.created
  - charge.dispute.closed

### 6.3 Firestore
- [ ] Indexes deployes
- [ ] Rules deployes
- [ ] Backup configure

### 6.4 Monitoring
- [ ] Alertes Cloud Monitoring configurees
- [ ] Logs structures actifs
- [ ] Dashboard erreurs disponible

---

## 7. Cartes de Test Stripe Supplementaires

| Scenario | Numero de carte |
|----------|----------------|
| Succes | 4242 4242 4242 4242 |
| Authentification requise | 4000 0025 0000 3155 |
| Carte refusee | 4000 0000 0000 0002 |
| Fonds insuffisants | 4000 0000 0000 9995 |
| CVC incorrect | 4000 0000 0000 0127 |
| Carte expiree | 4000 0000 0000 0069 |
| Erreur de traitement | 4000 0000 0000 0119 |
| Rate limit | 4000 0000 0000 6975 |

---

## 8. URLs de Test

### Development
- Frontend: http://localhost:5173
- Functions: http://localhost:5001/sos-expat-a1bed/europe-west1/
- Firestore Emulator: http://localhost:8080

### Staging
- https://sos-expat-staging.web.app

### Production
- https://sos-expat.com
- https://outils-sos-expat.web.app (admin)

---

*Derniere mise a jour: 29 Decembre 2025*
