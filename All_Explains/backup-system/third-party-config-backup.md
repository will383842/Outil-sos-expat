# BACKUP DES CONFIGURATIONS SERVICES TIERS - SOS EXPAT

**Date:** 2026-02-03
**Projet:** sos-urgently-ac307
**Version:** 1.0

---

## OBJECTIF

Ce document décrit comment sauvegarder et restaurer les configurations des services tiers utilisés par SOS Expat. Ces configurations ne sont PAS automatiquement sauvegardées par Firebase et doivent être documentées manuellement.

---

## 1. STRIPE CONFIGURATION

### Dashboard URL
https://dashboard.stripe.com

### Éléments à Sauvegarder

#### 1.1 Clés API
```
Location: Developers > API Keys
À sauvegarder:
- Secret Key (sk_live_...)
- Publishable Key (pk_live_...)
- Restricted Keys (si créées)

IMPORTANT: Ne jamais committer les clés. Les stocker dans:
- Firebase Secret Manager (STRIPE_SECRET_KEY)
- Gestionnaire de mots de passe sécurisé
```

#### 1.2 Webhooks
```
Location: Developers > Webhooks

Endpoint Production:
- URL: https://us-central1-sos-urgently-ac307.cloudfunctions.net/stripeWebhookHandler
- Events écoutés:
  * checkout.session.completed
  * checkout.session.expired
  * payment_intent.succeeded
  * payment_intent.payment_failed
  * customer.subscription.created
  * customer.subscription.updated
  * customer.subscription.deleted
  * invoice.paid
  * invoice.payment_failed
  * account.updated (Connect)
  * transfer.created (Connect)
  * payout.paid (Connect)
  * payout.failed (Connect)

Webhook Secret: Stocker dans STRIPE_WEBHOOK_SECRET
```

#### 1.3 Products & Prices
```
Location: Products > Catalog

Products SOS Expat:
1. Abonnement IA Premium
   - Price ID: price_xxx
   - Montant: [À documenter]
   - Récurrence: Mensuel

2. Crédits d'appel
   - Price ID: price_xxx
   - Montant: Variable

EXPORT: Stripe CLI
stripe products list --limit 100 > stripe_products_backup.json
stripe prices list --limit 100 > stripe_prices_backup.json
```

#### 1.4 Connect Settings
```
Location: Connect > Settings

Configuration:
- Platform Country: [FR/BE]
- Connected Account Types: Express
- Payout Schedule: [Configurer selon pays]
- Transfer Schedule: Automatic
```

### Script d'Export Stripe
```bash
#!/bin/bash
# stripe-config-export.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="./stripe_backup_$DATE"

mkdir -p $BACKUP_DIR

# Exporter les produits
stripe products list --limit 100 > "$BACKUP_DIR/products.json"

# Exporter les prix
stripe prices list --limit 100 > "$BACKUP_DIR/prices.json"

# Exporter les webhooks
stripe webhooks endpoints list > "$BACKUP_DIR/webhooks.json"

# Exporter les customers (attention GDPR)
# stripe customers list --limit 100 > "$BACKUP_DIR/customers.json"

echo "Backup Stripe terminé dans $BACKUP_DIR"
```

---

## 2. PAYPAL CONFIGURATION

### Dashboard URL
https://developer.paypal.com/dashboard

### Éléments à Sauvegarder

#### 2.1 API Credentials
```
Location: My Apps & Credentials

Production App: SOS Expat Production
- Client ID: [À documenter]
- Secret: [Stocker dans gestionnaire sécurisé]

Sandbox App: SOS Expat Sandbox
- Client ID: [Pour tests]
- Secret: [Pour tests]
```

#### 2.2 Webhooks
```
Location: My Apps > [App Name] > Webhooks

Endpoint Production:
- URL: https://us-central1-sos-urgently-ac307.cloudfunctions.net/paypalWebhookHandler
- Events:
  * CHECKOUT.ORDER.APPROVED
  * CHECKOUT.ORDER.COMPLETED
  * PAYMENT.CAPTURE.COMPLETED
  * PAYMENT.CAPTURE.DENIED
  * PAYMENT.CAPTURE.REFUNDED

Webhook ID: [À documenter]
```

#### 2.3 Business Account Settings
```
Location: PayPal Business Account

À documenter:
- Email du compte business
- Pays/Devise
- Limites de réception
- Préférences de notification
```

---

## 3. TWILIO CONFIGURATION

### Dashboard URL
https://console.twilio.com

### Éléments à Sauvegarder

#### 3.1 Credentials
```
Location: Console Dashboard

Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Auth Token: [Stocker dans TWILIO_AUTH_TOKEN]

API Keys (si créées):
- Key SID: SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
- Secret: [Stocker de manière sécurisée]
```

#### 3.2 Phone Numbers
```
Location: Phone Numbers > Manage > Active Numbers

Numéros SOS Expat:
1. Numéro Principal France
   - Number: +33xxxxxxxxx
   - Capabilities: Voice, SMS
   - Voice Webhook: [URL Cloud Run]
   - SMS Webhook: [Si configuré]

2. Numéro Principal Belgique
   - Number: +32xxxxxxxxx
   - Capabilities: Voice
   - Voice Webhook: [URL]

IMPORTANT: Documenter TOUS les numéros et leurs configurations
```

#### 3.3 TwiML Applications
```
Location: Voice > TwiML Apps

Applications configurées:
1. SOS Voice App
   - SID: APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   - Voice Request URL: https://twiliocallwebhook-268195823113.europe-west1.run.app
   - Status Callback URL: https://twilioconferencewebhook-268195823113.europe-west1.run.app

2. [Autres apps si existantes]
```

#### 3.4 Webhook URLs Cloud Run
```
Services Cloud Run utilisés:
- twiliocallwebhook-268195823113.europe-west1.run.app
- twilioconferencewebhook-268195823113.europe-west1.run.app

À vérifier:
- Configuration des services dans GCP Console
- Variables d'environnement
- Permissions IAM
```

### Script d'Export Twilio (via API)
```javascript
// twilio-config-export.js
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function exportTwilioConfig() {
  const backup = {
    exportDate: new Date().toISOString(),
    phoneNumbers: [],
    twimlApps: [],
    accountInfo: {}
  };

  // Exporter les numéros
  const numbers = await client.incomingPhoneNumbers.list();
  backup.phoneNumbers = numbers.map(n => ({
    sid: n.sid,
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    voiceUrl: n.voiceUrl,
    smsUrl: n.smsUrl,
    capabilities: n.capabilities
  }));

  // Exporter les TwiML Apps
  const apps = await client.applications.list();
  backup.twimlApps = apps.map(a => ({
    sid: a.sid,
    friendlyName: a.friendlyName,
    voiceUrl: a.voiceUrl,
    statusCallback: a.statusCallback
  }));

  console.log(JSON.stringify(backup, null, 2));
}

exportTwilioConfig();
```

---

## 4. FIREBASE CONFIGURATION

### Console URL
https://console.firebase.google.com/project/sos-urgently-ac307

### Éléments à Sauvegarder

#### 4.1 Project Settings
```
Location: Project Settings

Project ID: sos-urgently-ac307
Project Number: 268195823113
Web API Key: [Public - dans .env.production]
```

#### 4.2 Service Account Keys
```
Location: Project Settings > Service Accounts

Clé Admin SDK:
- Fichier: serviceAccountKey.json
- CRITIQUE: Ne JAMAIS committer dans Git
- Stocker dans gestionnaire de secrets sécurisé
- Rotation recommandée: Annuelle
```

#### 4.3 Authentication Providers
```
Location: Authentication > Sign-in method

Providers activés:
1. Email/Password: ✓ Enabled
2. Google: ✓ Enabled
   - Client ID: [Dans OAuth consent screen]
3. Phone: ✓ Enabled
   - Test numbers: [Si configurés]
```

#### 4.4 Security Rules
```
Location: Versionnées dans Git

Fichiers:
- sos/firestore.rules (1537 lignes)
- sos/storage.rules (177 lignes)
- sos/firebase/firestore.indexes.json

BACKUP: Ces fichiers sont versionnés dans Git
```

---

## 5. PROCÉDURE DE SAUVEGARDE MANUELLE

### Fréquence Recommandée
- **Mensuelle**: Export complet de toutes les configurations
- **Après chaque modification**: Export incrémental

### Checklist de Sauvegarde

```markdown
## Checklist Mensuelle - Backup Configs Tiers

Date: _______________
Effectué par: _______________

### Stripe
- [ ] Capture d'écran des webhooks configurés
- [ ] Export stripe products list
- [ ] Export stripe prices list
- [ ] Vérification clé API active

### PayPal
- [ ] Capture d'écran config app
- [ ] Vérification webhooks actifs
- [ ] Documentation credentials (sans valeurs)

### Twilio
- [ ] Liste des numéros actifs
- [ ] Config TwiML Apps
- [ ] URLs webhook documentées

### Firebase
- [ ] Backup rules (git commit)
- [ ] Vérification service account
- [ ] Config auth providers

### Stockage
- [ ] Fichiers stockés dans: _______________
- [ ] Chiffrement appliqué: [ ] Oui [ ] Non
```

---

## 6. PROCÉDURE DE RESTAURATION

### En cas de perte de configuration Stripe
1. Se connecter à dashboard.stripe.com
2. Recréer les webhooks avec les URLs documentées
3. Configurer les events listés ci-dessus
4. Récupérer le nouveau webhook secret
5. Mettre à jour STRIPE_WEBHOOK_SECRET dans Firebase Secret Manager
6. Redéployer les functions

### En cas de perte de configuration Twilio
1. Se connecter à console.twilio.com
2. Vérifier les numéros de téléphone actifs
3. Reconfigurer les TwiML Apps avec les URLs documentées
4. Mettre à jour les variables d'environnement si nécessaire
5. Tester un appel

### En cas de perte de configuration PayPal
1. Se connecter à developer.paypal.com
2. Recréer l'application si nécessaire
3. Configurer les webhooks
4. Mettre à jour les credentials dans Firebase

---

## 7. CONTACTS SUPPORT

| Service | URL Support | Temps de Réponse |
|---------|-------------|------------------|
| Stripe | support.stripe.com | 24-48h |
| PayPal | developer.paypal.com/support | 24-72h |
| Twilio | support.twilio.com | 24h (Premium) |
| Firebase | firebase.google.com/support | Variable |

---

## 8. HISTORIQUE DES MODIFICATIONS

| Date | Auteur | Modification |
|------|--------|--------------|
| 2026-02-03 | Claude Code | Création initiale |

---

**Ce document doit être mis à jour après chaque modification de configuration.**
