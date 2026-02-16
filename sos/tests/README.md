# Guide des Tests E2E - SOS Expat

Ce guide explique comment configurer et exécuter les tests End-to-End (E2E) pour le flux de réservation et de paiement.

## 📋 Table des matières

- [Prérequis](#prérequis)
- [Configuration](#configuration)
- [Exécution des tests](#exécution-des-tests)
- [Structure des tests](#structure-des-tests)
- [Résolution de problèmes](#résolution-de-problèmes)

---

## 🔧 Prérequis

Avant d'exécuter les tests E2E, assurez-vous d'avoir :

1. **Node.js 20.x** installé
2. **Firebase CLI** installé (`npm install -g firebase-tools`)
3. **Un compte Stripe en mode test** (gratuit)
4. **Les dépendances installées** :
   ```bash
   npm install
   ```

---

## ⚙️ Configuration

### 1. Configurer Stripe Test Mode

Les tests nécessitent une clé Stripe en mode TEST pour tester les paiements.

#### Comment obtenir votre clé Stripe de test :

1. Allez sur [Stripe Dashboard](https://dashboard.stripe.com)
2. **Activez le mode TEST** (toggle en haut à gauche)
3. Naviguez vers **Developers → API keys**
4. Copiez la **Secret key** (commence par `sk_test_...`)

#### Configuration de la clé :

1. Copiez le fichier `.env.example` vers `.env.test` :
   ```bash
   cp .env.test.example .env.test
   ```
   (ou utilisez le `.env.test` déjà créé)

2. Éditez `.env.test` et remplacez le placeholder :
   ```bash
   STRIPE_SECRET_KEY_TEST=sk_test_VOTRE_VRAIE_CLE_ICI
   ```

⚠️ **IMPORTANT** :
- N'utilisez JAMAIS une clé de production (`sk_live_...`) pour les tests
- Le fichier `.env.test` est dans `.gitignore` et ne sera pas commité
- Utilisez uniquement des clés de test Stripe

### 2. Démarrer les émulateurs Firebase

Les tests E2E utilisent les émulateurs Firebase pour simuler Firestore, Auth, etc.

```bash
npm run dev:emulators
```

Cela démarre les émulateurs sur les ports par défaut :
- **Firestore** : localhost:8080
- **Auth** : localhost:9099
- **Storage** : localhost:9199
- **Functions** : localhost:5001

**Laisser les émulateurs tourner** dans un terminal séparé pendant l'exécution des tests.

---

## 🚀 Exécution des tests

### Tests E2E complets

```bash
npm run test:e2e
```

Cette commande exécute tous les tests E2E définis dans `tests/e2e/booking-payment-flow.test.ts`.

### Tests E2E en mode watch

Pour exécuter les tests en mode "watch" (re-exécution automatique lors de modifications) :

```bash
npm run test:e2e:watch
```

### Tests unitaires classiques

Pour les tests unitaires du frontend (dans `src/`) :

```bash
npm run test
```

---

## 📦 Structure des tests

### Fichier principal : `tests/e2e/booking-payment-flow.test.ts`

Ce fichier contient **24 tests** organisés en **5 suites** :

#### 1️⃣ **FLUX DE RÉSERVATION** (4 tests)
- ✅ User non connecté → Register email → Booking
- ✅ User connecté → Booking direct
- ❌ Booking avec données manquantes → FAIL (validation)
- ❌ Booking pour un autre user → FAIL (sécurité)

#### 2️⃣ **SYSTÈME DE PAIEMENT** (10 tests)
- Create PaymentIntent EUR/USD (lawyer + expat)
- Confirm payment avec test card (no 3DS)
- Capture payment
- Refund after capture
- Cancel PaymentIntent (before capture)
- **Verify commission splits** (4 scénarios)
  - Lawyer EUR: 49€ = 19€ SOS + 30€ provider
  - Lawyer USD: 55$ = 25$ SOS + 30$ provider
  - Expat EUR: 19€ = 9€ SOS + 10€ provider
  - Expat USD: 25$ = 15$ SOS + 10$ provider

#### 3️⃣ **CALL SESSION & TWILIO** (5 tests)
- Create call session (simulated)
- Provider accepted (DTMF=1)
- Provider rejected (DTMF=2)
- Call completed (duration > 2 min)
- Early disconnect (duration < 2 min, refund)

#### 4️⃣ **SÉCURITÉ** (3 tests)
- ❌ Unauthorized user cannot create payment
- ❌ Client cannot modify payment amount
- ❌ Provider cannot access other provider's data

#### 5️⃣ **TESTS E2E COMPLETS** (2 tests)
- ✅ Full happy path (register → booking → payment → call)
- ✅ Payment succeeds but provider rejects → Refund

---

## 🐛 Résolution de problèmes

### Erreur : `ECONNREFUSED ::1:8080`

**Cause** : Les émulateurs Firebase ne sont pas démarrés.

**Solution** : Démarrez les émulateurs dans un terminal séparé :
```bash
npm run dev:emulators
```

---

### Erreur : `Neither apiKey nor config.authenticator provided`

**Cause** : La clé Stripe de test n'est pas configurée dans `.env.test`.

**Solution** :
1. Vérifiez que le fichier `.env.test` existe
2. Vérifiez qu'il contient `STRIPE_SECRET_KEY_TEST=sk_test_...`
3. Assurez-vous que la clé est valide (testez-la sur Stripe Dashboard)

---

### Erreur : `Port 8080 is not open`

**Cause** : Le port 8080 (Firestore) est déjà utilisé par une autre instance des émulateurs.

**Solution** :
1. Arrêtez les émulateurs existants : `npm run kill-emulators`
2. Redémarrez-les : `npm run dev:emulators`

---

### Erreur : Tests skipped (24 skipped)

**Cause** : Les tests sont marqués comme `.skip` ou il y a une erreur dans le `beforeAll`.

**Solution** :
1. Vérifiez les logs d'erreur avant "24 skipped"
2. Assurez-vous que les émulateurs sont démarrés
3. Assurez-vous que `.env.test` est configuré correctement

---

### Les tests passent mais les paiements échouent

**Cause** : La clé Stripe de test est incorrecte ou expirée.

**Solution** :
1. Vérifiez que vous utilisez une clé de **TEST** mode (pas production)
2. Régénérez une nouvelle clé sur Stripe Dashboard si nécessaire
3. Mettez à jour `.env.test` avec la nouvelle clé

---

## 📚 Ressources

- [Documentation Firebase Emulators](https://firebase.google.com/docs/emulator-suite)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)
- [Vitest Documentation](https://vitest.dev/)
- [Firebase Rules Unit Testing](https://firebase.google.com/docs/rules/unit-tests)

---

## 🎯 Bonnes pratiques

1. **Toujours utiliser le mode TEST** de Stripe pour les tests
2. **Ne jamais commiter** les fichiers `.env.test` (déjà dans `.gitignore`)
3. **Laisser les émulateurs tourner** pendant le développement
4. **Nettoyer les émulateurs** après les tests (`npm run kill-emulators`)
5. **Utiliser les test cards Stripe** pour simuler différents scénarios :
   - `4242 4242 4242 4242` - Succès (no 3DS)
   - `4000 0025 0000 3155` - Succès (requires 3DS)
   - `4000 0000 0000 9995` - Échec (insufficient funds)

---

**Tests créés le** : 2026-02-16
**Dernière mise à jour** : 2026-02-16
