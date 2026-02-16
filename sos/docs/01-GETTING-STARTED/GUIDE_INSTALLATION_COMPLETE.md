# GUIDE D'INSTALLATION TECHNIQUE COMPLETE - SOS EXPAT

## Vue d'ensemble

Ce guide permet de réinstaller entièrement la plateforme SOS Expat à partir de zéro en cas de perte totale du serveur ou de l'environnement de développement.

**Temps estimé** : 2-4 heures
**Pré-requis** : Accès au dépôt GitHub et aux comptes des services tiers

---

## Table des matières

1. [Pré-requis système](#1-pré-requis-système)
2. [Récupération du code source](#2-récupération-du-code-source)
3. [Installation de l'environnement Node.js](#3-installation-de-lenvironnement-nodejs)
4. [Configuration Firebase](#4-configuration-firebase)
5. [Configuration des variables d'environnement](#5-configuration-des-variables-denvironnement)
6. [Installation des dépendances](#6-installation-des-dépendances)
7. [Déploiement Firebase](#7-déploiement-firebase)
8. [Restauration des données](#8-restauration-des-données)
9. [Configuration des services tiers](#9-configuration-des-services-tiers)
10. [Vérification post-installation](#10-vérification-post-installation)
11. [Dépannage](#11-dépannage)

---

## 1. Pré-requis système

### Logiciels requis

| Logiciel | Version minimale | Installation |
|----------|-----------------|--------------|
| **Node.js** | 18.x LTS ou 20.x LTS | https://nodejs.org/ |
| **npm** | 9.x+ | Inclus avec Node.js |
| **Git** | 2.30+ | https://git-scm.com/ |
| **Firebase CLI** | 13.x+ | `npm install -g firebase-tools` |
| **Google Cloud SDK** | Latest | https://cloud.google.com/sdk/docs/install |

### Vérification des installations

```bash
# Vérifier Node.js
node --version
# Attendu: v18.x.x ou v20.x.x

# Vérifier npm
npm --version
# Attendu: 9.x.x ou plus

# Vérifier Git
git --version
# Attendu: 2.30+

# Vérifier Firebase CLI
firebase --version
# Attendu: 13.x.x ou plus

# Vérifier gcloud
gcloud --version
```

### Comptes requis

| Service | URL | Informations nécessaires |
|---------|-----|-------------------------|
| **GitHub** | github.com | Accès au repo `sos-expat-project` |
| **Firebase** | console.firebase.google.com | Projet `sos-urgently-ac307` |
| **Google Cloud** | console.cloud.google.com | Même projet que Firebase |
| **Stripe** | dashboard.stripe.com | Clés API live et test |
| **Twilio** | console.twilio.com | Account SID, Auth Token |
| **SendGrid** | app.sendgrid.com | Clé API |

---

## 2. Récupération du code source

### 2.1 Cloner le dépôt

```bash
# Option 1 : HTTPS (recommandé)
git clone https://github.com/VOTRE-USERNAME/sos-expat-project.git

# Option 2 : SSH (si clé SSH configurée)
git clone git@github.com:VOTRE-USERNAME/sos-expat-project.git

# Se déplacer dans le dossier
cd sos-expat-project
```

### 2.2 Vérifier la branche

```bash
# Vérifier la branche actuelle
git branch

# Passer sur main si nécessaire
git checkout main

# Récupérer les dernières modifications
git pull origin main
```

### 2.3 Structure du projet

```
sos-expat-project/
├── sos/                      # Application principale (Frontend React)
│   ├── src/                  # Code source
│   ├── public/               # Assets statiques
│   ├── firebase/             # Backend Firebase
│   │   └── functions/        # Cloud Functions
│   ├── firestore.rules       # Règles Firestore
│   ├── storage.rules         # Règles Storage
│   └── package.json          # Dépendances frontend
├── Outil-sos-expat/          # Outil IA (optionnel)
│   └── functions/            # Functions outil IA
├── docs/                     # Documentation
├── scripts/                  # Scripts utilitaires
└── package.json              # Dépendances racine
```

---

## 3. Installation de l'environnement Node.js

### 3.1 Windows

```powershell
# Télécharger et installer Node.js LTS depuis nodejs.org
# OU utiliser winget
winget install OpenJS.NodeJS.LTS

# Redémarrer le terminal puis vérifier
node --version
npm --version
```

### 3.2 macOS

```bash
# Avec Homebrew (recommandé)
brew install node@20
brew link node@20

# Vérifier
node --version
npm --version
```

### 3.3 Linux (Ubuntu/Debian)

```bash
# Installer Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier
node --version
npm --version
```

---

## 4. Configuration Firebase

### 4.1 Installation Firebase CLI

```bash
# Installation globale
npm install -g firebase-tools

# Vérification
firebase --version
```

### 4.2 Authentification

```bash
# Se connecter à Firebase
firebase login

# Vérifier le projet
firebase projects:list

# Sélectionner le projet SOS Expat
firebase use sos-urgently-ac307
```

### 4.3 Configuration Google Cloud SDK

```bash
# Windows : Télécharger depuis https://cloud.google.com/sdk/docs/install
# macOS : brew install --cask google-cloud-sdk
# Linux : curl https://sdk.cloud.google.com | bash

# Authentification
gcloud auth login
gcloud auth application-default login

# Configurer le projet
gcloud config set project sos-urgently-ac307
```

---

## 5. Configuration des variables d'environnement

### 5.1 Variables Frontend (sos/.env.local)

Créer le fichier `sos/.env.local` :

```env
# === FIREBASE CONFIG ===
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=sos-urgently-ac307.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sos-urgently-ac307
VITE_FIREBASE_STORAGE_BUCKET=sos-urgently-ac307.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=XXXXXXXXXXXX
VITE_FIREBASE_APP_ID=1:XXXXXXXXXXXX:web:XXXXXXXXXXXX
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# === STRIPE ===
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# === TWILIO ===
VITE_TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# === GOOGLE MAPS ===
VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX

# === ENVIRONMENT ===
VITE_APP_ENV=production
```

### 5.2 Secrets Firebase Functions

Les secrets sont gérés via Firebase Secrets Manager :

```bash
# Lister les secrets existants
firebase functions:secrets:get

# Configurer un secret (exemple)
firebase functions:secrets:set STRIPE_SECRET_KEY

# Secrets requis :
# - STRIPE_SECRET_KEY (Clé secrète Stripe live)
# - STRIPE_WEBHOOK_SECRET (Secret webhook Stripe)
# - TWILIO_AUTH_TOKEN (Token Twilio)
# - SENDGRID_API_KEY (Clé SendGrid)
# - ADMIN_API_KEY (Clé admin interne)
# - SOS_PLATFORM_API_KEY (Clé plateforme)
```

### 5.3 Variables Backend (sos/firebase/functions/.env)

Pour le développement local uniquement :

```env
# Ne pas committer ce fichier !
STRIPE_SECRET_KEY=sk_test_XXXXXXXX
TWILIO_ACCOUNT_SID=ACXXXXXXXX
TWILIO_AUTH_TOKEN=XXXXXXXX
SENDGRID_API_KEY=SG.XXXXXXXX
```

---

## 6. Installation des dépendances

### 6.1 Dépendances Frontend

```bash
cd sos

# Installation des packages
npm install

# Si erreurs de dépendances
npm install --legacy-peer-deps
```

### 6.2 Dépendances Cloud Functions

```bash
cd sos/firebase/functions

# Installation des packages
npm install

# Compiler TypeScript
npm run build
```

### 6.3 Dépendances Outil IA (optionnel)

```bash
cd Outil-sos-expat/functions

npm install
npm run build
```

---

## 7. Déploiement Firebase

### 7.1 Déploiement complet

```bash
# Depuis le dossier sos/
cd sos

# Déployer tout (règles + functions + hosting)
firebase deploy

# OU déployer séparément :

# Règles Firestore uniquement
firebase deploy --only firestore:rules

# Règles Storage uniquement
firebase deploy --only storage:rules

# Cloud Functions uniquement
firebase deploy --only functions

# Hosting uniquement (si utilisé)
firebase deploy --only hosting
```

### 7.2 Vérification du déploiement

```bash
# Lister les functions déployées
firebase functions:list

# Vérifier les logs
firebase functions:log
```

### 7.3 Configuration du Storage Versioning

```bash
# Activer le versioning sur le bucket principal
gcloud storage buckets update gs://sos-urgently-ac307.firebasestorage.app --versioning

# Créer le bucket DR (si nécessaire)
gcloud storage buckets create gs://sos-expat-backup-dr --location=EUROPE-WEST3

# Activer le versioning sur le bucket DR
gcloud storage buckets update gs://sos-expat-backup-dr --versioning
```

---

## 8. Restauration des données

### 8.1 Via la Console Admin

1. Accéder à `https://sos-expat.com/admin/backups`
2. Se connecter avec un compte admin
3. Sélectionner le backup à restaurer
4. Cliquer sur "Restaurer"
5. Choisir les éléments à restaurer (Firestore, Storage, Auth)

### 8.2 Via les scripts

```bash
# Restauration Firestore depuis GCS
gcloud firestore import gs://sos-urgently-ac307.firebasestorage.app/scheduled-backups/YYYY-MM-DD/HHMMSS/

# OU via Cloud Function
firebase functions:call restoreFromBackup --data '{"prefix":"2024-01-15/030000","restoreFirestore":true,"restoreAuth":true}'
```

### 8.3 Restauration Firebase Auth

```bash
# Les utilisateurs Auth sont sauvegardés dans auth_backups/
# Utiliser la fonction restoreFirebaseAuth via l'admin console
```

---

## 9. Configuration des services tiers

### 9.1 Stripe

1. **Dashboard** : https://dashboard.stripe.com
2. **Webhooks** : Configurer l'endpoint `https://us-central1-sos-urgently-ac307.cloudfunctions.net/stripeWebhook`
3. **Événements requis** :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

### 9.2 Twilio

1. **Console** : https://console.twilio.com
2. **Numéros** : Configurer les numéros de téléphone
3. **TwiML Apps** : Configurer l'app pour les appels
4. **Webhooks** :
   - Voice URL : `https://us-central1-sos-urgently-ac307.cloudfunctions.net/twilioVoice`
   - Status Callback : `https://us-central1-sos-urgently-ac307.cloudfunctions.net/twilioStatus`

### 9.3 SendGrid

1. **Dashboard** : https://app.sendgrid.com
2. **API Keys** : Créer une clé avec permissions d'envoi
3. **Sender Authentication** : Vérifier le domaine d'envoi
4. **Templates** : Importer les templates d'emails

### 9.4 Google Maps

1. **Console** : https://console.cloud.google.com/google/maps-apis
2. **APIs à activer** :
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. **Restrictions** : Configurer les restrictions HTTP referrer

---

## 10. Vérification post-installation

### 10.1 Checklist de vérification

```bash
# 1. Vérifier que le frontend compile
cd sos
npm run build

# 2. Vérifier les functions
cd firebase/functions
npm run build

# 3. Tester en local
cd sos
npm run dev

# 4. Vérifier Firebase
firebase functions:list
firebase firestore:rules

# 5. Tester les endpoints
curl https://us-central1-sos-urgently-ac307.cloudfunctions.net/healthCheck
```

### 10.2 Tests fonctionnels

| Test | URL/Action | Résultat attendu |
|------|------------|------------------|
| Page d'accueil | sos-expat.com | Page s'affiche |
| Login | /login | Formulaire fonctionnel |
| Admin | /admin | Redirection login admin |
| Stripe | Paiement test | Transaction réussie |
| Twilio | Appel test | Connexion établie |
| Emails | Inscription | Email reçu |

### 10.3 Monitoring

1. **Firebase Console** : https://console.firebase.google.com
2. **Google Cloud Console** : https://console.cloud.google.com
3. **Stripe Dashboard** : https://dashboard.stripe.com
4. **Twilio Console** : https://console.twilio.com

---

## 11. Dépannage

### 11.1 Erreurs courantes

#### "Firebase CLI not authenticated"
```bash
firebase logout
firebase login
```

#### "Permission denied" sur Firestore
```bash
# Vérifier et redéployer les règles
firebase deploy --only firestore:rules
```

#### "Function deployment failed"
```bash
# Vérifier les logs
firebase functions:log

# Augmenter la mémoire si nécessaire
# Dans functions/src/index.ts, ajouter :
# { memory: "512MB", timeoutSeconds: 120 }
```

#### "npm install" échoue
```bash
# Nettoyer le cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### "gcloud: command not found"
```bash
# Windows : Redémarrer le terminal après installation
# macOS/Linux : source ~/.bashrc ou ~/.zshrc
```

### 11.2 Logs et debugging

```bash
# Logs Firebase Functions
firebase functions:log --only scheduledBackup

# Logs Google Cloud
gcloud functions logs read --limit 50

# Logs en temps réel
firebase functions:log --follow
```

### 11.3 Contacts support

| Service | Contact |
|---------|---------|
| Firebase | https://firebase.google.com/support |
| Stripe | https://support.stripe.com |
| Twilio | https://support.twilio.com |
| SendGrid | https://support.sendgrid.com |

---

## Annexes

### A. Commandes utiles

```bash
# Démarrer en développement
cd sos && npm run dev

# Build production
cd sos && npm run build

# Déployer tout
cd sos && firebase deploy

# Voir les secrets
firebase functions:secrets:get

# Logs en temps réel
firebase functions:log --follow

# Tester une function localement
firebase emulators:start --only functions
```

### B. Fichiers de configuration importants

| Fichier | Description |
|---------|-------------|
| `sos/firebase.json` | Configuration Firebase |
| `sos/firestore.rules` | Règles sécurité Firestore |
| `sos/storage.rules` | Règles sécurité Storage |
| `sos/firestore.indexes.json` | Index Firestore |
| `sos/.env.local` | Variables d'environnement frontend |
| `sos/firebase/functions/.env` | Variables backend (dev) |

### C. Ports utilisés

| Service | Port |
|---------|------|
| Frontend (Vite) | 5173 |
| Firebase Emulator UI | 4000 |
| Firestore Emulator | 8080 |
| Functions Emulator | 5001 |
| Auth Emulator | 9099 |
| Storage Emulator | 9199 |

---

**Document créé le** : $(date)
**Dernière mise à jour** : 2024-12-31
**Version** : 1.0
