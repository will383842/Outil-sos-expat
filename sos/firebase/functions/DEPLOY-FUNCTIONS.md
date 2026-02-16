# 🚀 GUIDE DÉPLOIEMENT FIREBASE FUNCTIONS

## ⚠️ Problème Actuel : Timeout Deployment Analysis

**Erreur** :
```
Error: User code failed to load. Cannot determine backend specification.
Timeout after 10000ms.
```

**Cause** :
- Trop de fonctions (~250+ services)
- Firebase CLI timeout pendant l'analyse du code
- Problème connu avec Firebase Functions v2

---

## ✅ SOLUTIONS DE DÉPLOIEMENT

### Solution 1 : Déploiement depuis Cloud Shell (RECOMMANDÉ)

```bash
# 1. Ouvrir Google Cloud Console
https://console.cloud.google.com

# 2. Activer Cloud Shell (icône terminal en haut à droite)

# 3. Cloner le repo
git clone https://github.com/will383842/sos-expat-project.git
cd sos-expat-project/sos/firebase/functions

# 4. Installer dépendances
npm install

# 5. Build
npm run build

# 6. Déployer (Cloud Shell a des timeouts plus longs)
firebase deploy --only functions --project sos-urgently-ac307

# ✅ Devrait fonctionner sans timeout
```

---

### Solution 2 : Déploiement par Groupe de Fonctions

Au lieu de déployer toutes les fonctions d'un coup, déployer par région :

```bash
# Groupe 1 : Payments (europe-west3)
firebase deploy --only functions:createPaymentIntent,functions:stripeWebhook,functions:createSubscriptionCheckout --project sos-urgently-ac307

# Groupe 2 : Twilio (europe-west3)
firebase deploy --only functions:twilioCallWebhook,functions:twilioConferenceWebhook,functions:twilioGatherResponse,functions:twilioAmdTwiml --project sos-urgently-ac307

# Groupe 3 : Affiliate (europe-west2)
firebase deploy --only functions:registerChatter,functions:registerInfluencer,functions:registerBlogger,functions:registerGroupAdmin --project sos-urgently-ac307

# etc.
```

**Avantage** : Déploiements plus rapides, moins de timeout

---

### Solution 3 : Augmenter Timeout (Temporaire)

Modifier `firebase.json` :

```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log"
      ],
      "predeploy": [
        "npm --prefix \"$RESOURCE_DIR\" run build"
      ],
      "runtime": "nodejs22"
    }
  ]
}
```

Puis définir variable d'environnement :
```bash
export FIREBASE_FUNCTIONS_TIMEOUT=60000  # 60 secondes au lieu de 10
firebase deploy --only functions --project sos-urgently-ac307
```

---

### Solution 4 : GitHub Actions (CI/CD)

Créer `.github/workflows/deploy-functions.yml` :

```yaml
name: Deploy Firebase Functions

on:
  push:
    branches:
      - main
    paths:
      - 'sos/firebase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        working-directory: sos/firebase/functions
        run: npm ci

      - name: Build
        working-directory: sos/firebase/functions
        run: npm run build

      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions --project sos-urgently-ac307
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

**Avantage** : Auto-deploy sur chaque push

---

## 🎯 FONCTIONS À DÉPLOYER (URGENT)

### 2 Fonctions Migrées (2026-02-16)

1. **stripeWebhook** : `europe-west1` → `europe-west3`
2. **createSubscriptionCheckout** : `europe-west1` → `europe-west3`

**Commande ciblée** :
```bash
firebase deploy --only functions:stripeWebhook,functions:createSubscriptionCheckout --project sos-urgently-ac307 --force
```

**Pourquoi c'est important** :
- Cohérence avec `createPaymentIntent` (déjà en west3)
- Tous les payments doivent être en west3
- Isolation correcte des systèmes critiques

---

## ✅ VÉRIFICATION POST-DÉPLOIEMENT

Après déploiement réussi, vérifier :

```bash
# 1. Lister les fonctions déployées
firebase functions:list --project sos-urgently-ac307 | grep -E "stripeWebhook|createSubscriptionCheckout"

# ✅ Attendu :
# stripeWebhook                   v2  https  europe-west3  512  nodejs22
# createSubscriptionCheckout      v2  callable  europe-west3  256  nodejs22

# 2. Tester stripeWebhook
curl -X POST https://europe-west3-sos-urgently-ac307.cloudfunctions.net/stripeWebhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# ✅ Attendu : "Missing signature" (normal, c'est sécurisé)

# 3. Vérifier logs
gcloud functions logs read stripeWebhook --project sos-urgently-ac307 --limit 10
```

---

## 📊 STATUS ACTUEL

**Code** : ✅ Modifié et commité (87036a4e)
**Git** : ✅ Pushé vers GitHub
**Cloudflare** : ✅ Déploiement auto-trigger
**Firebase Functions** : ⚠️ Timeout deployment analysis

**Next step** : Utiliser **Solution 1 (Cloud Shell)** ou **Solution 2 (Groupes)**

---

## 🔍 DEBUGGING

Si problème persiste :

```bash
# 1. Vérifier syntax errors
cd sos/firebase/functions
npm run build
# ✅ Doit compiler sans erreur

# 2. Tester en local (emulateurs)
firebase emulators:start --only functions
# Ouvrir http://localhost:4000

# 3. Vérifier quota déploiement
gcloud compute project-info describe --project sos-urgently-ac307 | grep quota

# 4. Enable verbose logging
firebase deploy --only functions --debug --project sos-urgently-ac307 2>&1 | tee deploy.log
```

---

## 💡 RECOMMANDATION FINALE

**Option RAPIDE (5 min)** :
```bash
# Via Google Cloud Shell
git clone https://github.com/will383842/sos-expat-project.git
cd sos-expat-project/sos/firebase/functions
npm install && npm run build
firebase deploy --only functions:stripeWebhook,functions:createSubscriptionCheckout --project sos-urgently-ac307
```

**Option PROPRE (setup CI/CD)** :
- Setup GitHub Actions (30 min)
- Auto-deploy sur chaque push
- Pas de timeout locaux

---

**Date** : 2026-02-16
**Status** : Code prêt, déploiement en attente
