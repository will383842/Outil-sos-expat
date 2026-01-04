# Procédures de Rollback - SOS Expat Production

> **Version**: 1.0.0
> **Date**: 2026-01-03
> **Environnement**: Production (Digital Ocean)
> **Criticité**: HAUTE - Suivre ces procédures avec précaution

---

## Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Contacts d'Urgence](#2-contacts-durgence)
3. [Rollback Firebase Functions](#3-rollback-firebase-functions)
4. [Rollback Firestore Data](#4-rollback-firestore-data)
5. [Rollback Stripe](#5-rollback-stripe)
6. [Rollback PayPal](#6-rollback-paypal)
7. [Rollback Twilio](#7-rollback-twilio)
8. [Checklist de Vérification](#8-checklist-de-verification)
9. [Post-Rollback](#9-post-rollback)

---

## 1. Vue d'Ensemble

### Quand effectuer un rollback ?

- **P0 (Immédiat)**: Paiements en échec massif (>10% taux d'erreur)
- **P0 (Immédiat)**: Appels non déclenchés après paiement
- **P0 (Immédiat)**: Données corrompues ou perdues
- **P1 (< 1 heure)**: Fonctionnalités critiques cassées
- **P2 (< 24 heures)**: Bugs majeurs affectant l'UX

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION STACK                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend: Firebase Hosting (outils-sos-expat.web.app)      │
│  Backend: Firebase Cloud Functions (europe-west1)           │
│  Database: Firestore (nam5 multi-region)                    │
│  Auth: Firebase Authentication                               │
│  Storage: Firebase Storage + GCS                             │
│  Payments: Stripe + PayPal Commerce Platform                 │
│  Calls: Twilio Programmable Voice                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Contacts d'Urgence

| Rôle | Contact | Responsabilité |
|------|---------|----------------|
| Admin Principal | [À CONFIGURER] | Décision rollback |
| DevOps | [À CONFIGURER] | Exécution rollback |
| Support Stripe | https://support.stripe.com | Problèmes paiement |
| Support PayPal | https://www.paypal.com/support | Problèmes PayPal |
| Support Twilio | https://support.twilio.com | Problèmes appels |
| Support Firebase | https://firebase.google.com/support | Problèmes Firebase |

---

## 3. Rollback Firebase Functions

### 3.1 Identifier la version à restaurer

```bash
# Lister les déploiements récents
firebase functions:log --only <function-name>

# Voir l'historique des déploiements
gcloud functions list --project=sos-expat-production

# Voir les versions disponibles
gcloud functions describe <function-name> --region=europe-west1
```

### 3.2 Rollback via Git

```bash
# Identifier le commit stable
git log --oneline -20

# Revenir au commit stable
git checkout <commit-hash>

# Redéployer les fonctions
cd sos/firebase/functions
npm run build
firebase deploy --only functions
```

### 3.3 Rollback d'une fonction spécifique

```bash
# Désactiver temporairement une fonction
firebase functions:delete <function-name> --region=europe-west1

# Redéployer depuis un commit stable
git checkout <stable-commit> -- sos/firebase/functions/src/<file>.ts
npm run build
firebase deploy --only functions:<function-name>
```

### 3.4 Fonctions critiques (NE PAS SUPPRIMER)

| Fonction | Criticité | Impact si supprimée |
|----------|-----------|---------------------|
| `createPaymentIntent` | P0 | Paiements impossibles |
| `stripeWebhook` | P0 | Paiements non confirmés |
| `paypalWebhook` | P0 | Paiements PayPal bloqués |
| `twilioWebhook` | P0 | Appels non gérés |
| `createAndScheduleCall` | P0 | Appels non planifiés |
| `executeCallTask` | P0 | Appels non exécutés |
| `capturePaymentForSession` | P0 | Revenus non capturés |

---

## 4. Rollback Firestore Data

### 4.1 Localiser les backups

```bash
# Lister les backups disponibles
gsutil ls gs://sos-expat-backups/firestore/

# Backups automatiques (3x/jour)
# - Morning: 06:00 UTC
# - Midday: 12:00 UTC
# - Evening: 18:00 UTC

# Structure:
# gs://sos-expat-backups/firestore/YYYY-MM-DD_HH-MM/
```

### 4.2 Restaurer depuis backup

```bash
# ATTENTION: Cette opération REMPLACE les données actuelles

# 1. Exporter les données actuelles (safety backup)
gcloud firestore export gs://sos-expat-backups/pre-restore-$(date +%Y%m%d_%H%M)

# 2. Importer le backup
gcloud firestore import gs://sos-expat-backups/firestore/2026-01-02_12-00

# 3. Vérifier l'intégrité
firebase functions:call productionHealthCheck
```

### 4.3 Restauration sélective (collection spécifique)

```bash
# Restaurer uniquement une collection
gcloud firestore import gs://sos-expat-backups/firestore/2026-01-02_12-00 \
  --collection-ids=payments,call_sessions
```

### 4.4 Collections critiques

| Collection | Criticité | Données |
|------------|-----------|---------|
| `payments` | P0 | Historique paiements |
| `call_sessions` | P0 | Sessions d'appel |
| `users` | P0 | Comptes utilisateurs |
| `sos_profiles` | P1 | Profils providers |
| `paypal_orders` | P0 | Commandes PayPal |
| `paypal_payouts` | P0 | Transferts providers |
| `disputes` | P1 | Litiges en cours |
| `invoices` | P1 | Factures |

---

## 5. Rollback Stripe

### 5.1 Annuler un PaymentIntent non capturé

```javascript
// Via Dashboard Stripe ou API
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Annuler (si status = requires_capture)
await stripe.paymentIntents.cancel('pi_xxxxx');

// Mettre à jour Firestore
await db.collection('payments').doc('pi_xxxxx').update({
  status: 'canceled',
  canceledAt: FieldValue.serverTimestamp(),
  cancelReason: 'manual_rollback'
});
```

### 5.2 Rembourser un paiement capturé

```javascript
// Remboursement total
await stripe.refunds.create({
  payment_intent: 'pi_xxxxx',
  reason: 'requested_by_customer'
});

// Remboursement partiel
await stripe.refunds.create({
  payment_intent: 'pi_xxxxx',
  amount: 1000, // en centimes
  reason: 'requested_by_customer'
});
```

### 5.3 Vérifier les webhooks

```bash
# Dashboard Stripe > Developers > Webhooks
# Vérifier:
# - Endpoint URL correct
# - Signing secret à jour
# - Events enabled: payment_intent.*, charge.*, account.updated
```

---

## 6. Rollback PayPal

### 6.1 Annuler une commande non capturée

```javascript
// Les commandes PayPal expirent automatiquement après 3 jours
// Pour annulation immédiate via API:
const orderId = 'ORDER_ID';
await fetch(`https://api.paypal.com/v2/checkout/orders/${orderId}/void`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 6.2 Rembourser une capture

```javascript
const captureId = 'CAPTURE_ID';
await fetch(`https://api.paypal.com/v2/payments/captures/${captureId}/refund`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: { value: '49.00', currency_code: 'EUR' },
    note_to_payer: 'Refund for consultation cancellation'
  })
});
```

### 6.3 Annuler un payout en attente

```javascript
// Un payout PENDING peut être annulé
const payoutItemId = 'PAYOUT_ITEM_ID';
await fetch(`https://api.paypal.com/v1/payments/payouts-item/${payoutItemId}/cancel`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

---

## 7. Rollback Twilio

### 7.1 Annuler un appel en cours

```javascript
const client = require('twilio')(accountSid, authToken);

// Terminer un appel
await client.calls('CAxxxxx').update({ status: 'completed' });

// Annuler un appel non démarré
await client.calls('CAxxxxx').update({ status: 'canceled' });
```

### 7.2 Annuler une tâche Cloud Tasks

```javascript
// Si l'appel n'a pas encore été déclenché
const { CloudTasksClient } = require('@google-cloud/tasks');
const client = new CloudTasksClient();

const taskName = `projects/sos-expat/locations/europe-west1/queues/call-scheduler-queue/tasks/${taskId}`;
await client.deleteTask({ name: taskName });
```

### 7.3 Nettoyer une session d'appel

```javascript
// Marquer la session comme annulée
await db.collection('call_sessions').doc(sessionId).update({
  status: 'canceled',
  canceledAt: FieldValue.serverTimestamp(),
  cancelReason: 'manual_rollback'
});

// Si le paiement n'a pas été capturé, il sera automatiquement annulé
```

---

## 8. Checklist de Vérification

### 8.1 Avant le rollback

- [ ] Confirmer l'impact avec l'équipe
- [ ] Créer un backup de l'état actuel
- [ ] Documenter le problème et la décision
- [ ] Prévenir les utilisateurs si nécessaire
- [ ] Mettre en maintenance si critique

### 8.2 Pendant le rollback

- [ ] Suivre les étapes documentées
- [ ] Logger toutes les actions
- [ ] Ne pas interrompre les paiements en cours
- [ ] Vérifier chaque étape avant la suivante

### 8.3 Après le rollback

- [ ] Exécuter `productionHealthCheck`
- [ ] Vérifier les logs d'erreur
- [ ] Tester un paiement complet (Stripe + PayPal)
- [ ] Tester un appel complet
- [ ] Vérifier les métriques de monitoring
- [ ] Documenter le post-mortem

---

## 9. Post-Rollback

### 9.1 Vérifications immédiates

```bash
# Santé générale
firebase functions:call productionHealthCheck

# Tests E2E
firebase functions:call runE2ETests --data '{"skipStripe": false}'

# Logs récents
firebase functions:log --only stripeWebhook,paypalWebhook,createPaymentIntent
```

### 9.2 Métriques à surveiller

| Métrique | Seuil normal | Alerte si |
|----------|-------------|-----------|
| Taux d'erreur paiement | < 2% | > 5% |
| Temps de réponse API | < 2s | > 5s |
| Appels réussis | > 95% | < 90% |
| Capture rate | > 98% | < 95% |

### 9.3 Template Post-Mortem

```markdown
## Post-Mortem: [Titre de l'incident]

**Date**: YYYY-MM-DD
**Durée**: HH:MM
**Impact**: [Description de l'impact]

### Chronologie
- HH:MM - Détection du problème
- HH:MM - Décision de rollback
- HH:MM - Rollback effectué
- HH:MM - Vérification complète

### Cause racine
[Description de la cause]

### Actions correctives
1. [Action 1]
2. [Action 2]

### Leçons apprises
- [Leçon 1]
- [Leçon 2]
```

---

## Annexes

### A. Commandes utiles

```bash
# Status des fonctions
firebase functions:list

# Logs en temps réel
firebase functions:log --only <function> --follow

# Santé Firestore
gcloud firestore operations list

# Status Stripe (via CLI)
stripe events list --limit 10

# Status Twilio
twilio api:core:calls:list --limit 10
```

### B. URLs critiques

| Service | URL |
|---------|-----|
| Firebase Console | https://console.firebase.google.com/project/sos-expat |
| Stripe Dashboard | https://dashboard.stripe.com |
| PayPal Dashboard | https://www.paypal.com/businessmanage |
| Twilio Console | https://console.twilio.com |
| GCP Console | https://console.cloud.google.com/project/sos-expat |

### C. Secrets à vérifier

```bash
# Firebase secrets
firebase functions:secrets:access STRIPE_SECRET_KEY_LIVE
firebase functions:secrets:access PAYPAL_CLIENT_SECRET
firebase functions:secrets:access TWILIO_AUTH_TOKEN
firebase functions:secrets:access ENCRYPTION_KEY
```

---

**Document maintenu par l'équipe SOS Expat**
**Dernière mise à jour**: 2026-01-03
