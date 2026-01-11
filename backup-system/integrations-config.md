# CONFIGURATION DES INTEGRATIONS EXTERNES - SOS EXPAT

**Date:** 2026-01-11
**Projet:** sos-urgently-ac307
**CONFIDENTIEL** - Ne pas partager publiquement

---

## 1. STRIPE

### Credentials
| Element | Valeur | Stockage |
|---------|--------|----------|
| Publishable Key (Live) | `pk_live_...` | Firebase Config / .env |
| Secret Key (Live) | `sk_live_...` | Firebase Config |
| Webhook Secret | `whsec_...` | Firebase Config |
| Connect Client ID | `ca_...` | Firebase Config |

### Webhooks Configures
| Endpoint | Events |
|----------|--------|
| `https://us-central1-sos-urgently-ac307.cloudfunctions.net/stripeWebhook` | payment_intent.succeeded, payment_intent.failed, customer.subscription.*, charge.dispute.*, etc. |

### Produits et Prix
> Exporter via: `stripe products list --limit 100 > stripe-products.json`

| Produit | Prix ID | Description |
|---------|---------|-------------|
| Appel SOS 15min | `price_...` | Tarif de base |
| Appel SOS 30min | `price_...` | Tarif etendu |
| Abonnement IA Basic | `price_...` | Mensuel |
| Abonnement IA Pro | `price_...` | Mensuel |

### Configuration Connect
- Type: Express accounts
- Payout schedule: Daily automatic
- Country: Multi (EU, US, etc.)

---

## 2. PAYPAL

### Credentials
| Element | Valeur | Stockage |
|---------|--------|----------|
| Client ID (Live) | `...` | Firebase Config |
| Client Secret (Live) | `...` | Firebase Config |
| Partner ID | `...` | Firebase Config |
| BN Code | `...` | Firebase Config |

### Webhooks
| Endpoint | Events |
|----------|--------|
| `https://us-central1-sos-urgently-ac307.cloudfunctions.net/paypalWebhook` | PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, MERCHANT.ONBOARDING.COMPLETED |

### Configuration Partenaire
- Type: Partner referrals (merchant onboarding)
- Payout: Via PayPal Payouts API
- Countries: Global

---

## 3. TWILIO

### Credentials
| Element | Valeur | Stockage |
|---------|--------|----------|
| Account SID | `AC...` | Firebase Config |
| Auth Token | `...` | Firebase Config |
| API Key SID | `SK...` | Firebase Config |
| API Key Secret | `...` | Firebase Config |

### Numeros de Telephone
> Exporter via: `twilio phone-numbers:list -o json`

| Numero | Type | Usage |
|--------|------|-------|
| +33... | Voice | Appels France |
| +1... | Voice | Appels US |

### TwiML Applications
| App Name | SID | Voice URL |
|----------|-----|-----------|
| SOS-Expat Voice | `AP...` | `https://us-central1-sos-urgently-ac307.cloudfunctions.net/twilioVoice` |

### Configuration SIP (si applicable)
- Domain: `sos-expat.sip.twilio.com`
- Credential List: `CL...`

---

## 4. FIREBASE

### Configuration Projet
| Element | Valeur |
|---------|--------|
| Project ID | `sos-urgently-ac307` |
| Region | `europe-west1` |
| Storage Bucket | `sos-urgently-ac307.firebasestorage.app` |
| DR Bucket | `sos-expat-backup-dr` |

### Service Accounts
| Account | Usage | Cle |
|---------|-------|-----|
| `sos-urgently-ac307@appspot.gserviceaccount.com` | Default Functions | Auto-geree |
| `firebase-adminsdk-xxx@sos-urgently-ac307.iam.gserviceaccount.com` | Admin SDK | JSON key |

---

## 5. AUTRES SERVICES

### Google Maps
| Element | Valeur | Stockage |
|---------|--------|----------|
| API Key | `AIza...` | Frontend .env |
| Restrictions | HTTP referrers, APIs limitees | Console GCP |

### reCAPTCHA
| Element | Valeur | Stockage |
|---------|--------|----------|
| Site Key (v3) | `6L...` | Frontend .env |
| Secret Key | `6L...` | Firebase Config |

### SMTP (Zoho)
| Element | Valeur | Stockage |
|---------|--------|----------|
| Host | `smtp.zoho.eu` | Firebase Config |
| Port | `465` | Firebase Config |
| User | `contact@sos-expat.com` | Firebase Config |
| Password | `...` | Firebase Config |

### Meta (Facebook/Instagram)
| Element | Valeur | Stockage |
|---------|--------|----------|
| Pixel ID | `...` | Frontend code |
| Access Token (CAPI) | `...` | Firebase Config |

---

## 6. PROCEDURES DE RESTAURATION

### En cas de perte des credentials Stripe
1. Acceder au dashboard Stripe
2. Regenerer les cles API
3. Mettre a jour Firebase Config: `firebase functions:config:set stripe.secret_key="sk_live_..."`
4. Redeployer les functions: `firebase deploy --only functions`

### En cas de perte des credentials PayPal
1. Acceder au dashboard PayPal Developer
2. Regenerer les credentials de l'app
3. Mettre a jour Firebase Config
4. Redeployer les functions

### En cas de perte des credentials Twilio
1. Acceder a la console Twilio
2. Regenerer l'Auth Token
3. Verifier les numeros de telephone
4. Mettre a jour Firebase Config
5. Redeployer les functions

---

## 7. CHECKLIST DE VERIFICATION

### Hebdomadaire
- [ ] Verifier que les webhooks repondent (logs Firebase)
- [ ] Verifier les alertes Stripe/PayPal
- [ ] Verifier le solde Twilio

### Mensuel
- [ ] Exporter les produits/prix Stripe
- [ ] Verifier la configuration Connect
- [ ] Audit des numeros Twilio

### Trimestriel
- [ ] Rotation des cles API si necessaire
- [ ] Mise a jour de ce document
- [ ] Test de restauration des credentials

---

**Derniere mise a jour:** 2026-01-11
**Responsable:** [Nom]
