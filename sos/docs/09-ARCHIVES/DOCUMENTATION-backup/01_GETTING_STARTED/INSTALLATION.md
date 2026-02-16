# Guide d'Installation Complete - SOS Expat

> **Temps estime**: 2-4 heures
> **Derniere mise a jour**: 27 Janvier 2026

---

## Table des Matieres

1. [Pre-requis Systeme](#1-pre-requis-systeme)
2. [Recuperation du Code Source](#2-recuperation-du-code-source)
3. [Configuration Firebase](#3-configuration-firebase)
4. [Variables d'Environnement](#4-variables-denvironnement)
5. [Installation des Dependances](#5-installation-des-dependances)
6. [Deploiement](#6-deploiement)
7. [Verification](#7-verification)
8. [Depannage](#8-depannage)

---

## 1. Pre-requis Systeme

### Logiciels Requis

| Logiciel | Version | Installation |
|----------|---------|--------------|
| **Node.js** | 20.x LTS | https://nodejs.org/ |
| **npm** | 10.x+ | Inclus avec Node.js |
| **Git** | 2.30+ | https://git-scm.com/ |
| **Firebase CLI** | 13.x+ | `npm install -g firebase-tools` |
| **Google Cloud SDK** | Latest | https://cloud.google.com/sdk |

### Verification des Installations

```bash
# Verifier Node.js
node --version    # Attendu: v20.x.x

# Verifier npm
npm --version     # Attendu: 10.x.x

# Verifier Git
git --version     # Attendu: 2.30+

# Verifier Firebase CLI
firebase --version  # Attendu: 13.x.x+

# Verifier gcloud
gcloud --version
```

### Comptes Requis

| Service | URL | Informations |
|---------|-----|--------------|
| GitHub | github.com | Acces au repo |
| Firebase | console.firebase.google.com | Projet `sos-urgently-ac307` |
| Stripe | dashboard.stripe.com | Cles API |
| Twilio | console.twilio.com | Account SID |
| SendGrid | app.sendgrid.com | Cle API |

---

## 2. Recuperation du Code Source

### Cloner le Depot

```bash
# HTTPS (recommande)
git clone https://github.com/VOTRE-USERNAME/sos-expat-project.git

# Se deplacer dans le dossier
cd sos-expat-project

# Verifier la branche
git checkout main
git pull origin main
```

### Structure du Projet

```
sos-expat-project/
├── sos/                      # Application principale
│   ├── src/                  # Code source React
│   ├── firebase/functions/   # Cloud Functions
│   ├── firestore.rules       # Regles Firestore
│   └── storage.rules         # Regles Storage
├── Outil-sos-expat/          # Outil IA
│   └── functions/            # Functions outil IA
├── DOCUMENTATION/            # Cette documentation
└── docs/                     # Guides supplementaires
```

---

## 3. Configuration Firebase

### Installation Firebase CLI

```bash
npm install -g firebase-tools
firebase --version
```

### Authentification

```bash
# Connexion
firebase login

# Verifier le projet
firebase projects:list

# Selectionner le projet
firebase use sos-urgently-ac307
```

### Google Cloud SDK

```bash
# Authentification
gcloud auth login
gcloud auth application-default login

# Configurer le projet
gcloud config set project sos-urgently-ac307
```

---

## 4. Variables d'Environnement

### Frontend (sos/.env.local)

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
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXX

# === ENVIRONMENT ===
VITE_APP_ENV=production
```

### Secrets Firebase Functions

```bash
# Lister les secrets
firebase functions:secrets:get

# Configurer un secret
firebase functions:secrets:set STRIPE_SECRET_KEY

# Secrets requis:
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
# - TWILIO_AUTH_TOKEN
# - SENDGRID_API_KEY
# - ADMIN_API_KEY
```

---

## 5. Installation des Dependances

### Frontend

```bash
cd sos
npm install

# Si erreurs
npm install --legacy-peer-deps
```

### Cloud Functions

```bash
cd sos/firebase/functions
npm install
npm run build
```

### Outil IA (optionnel)

```bash
cd Outil-sos-expat/functions
npm install
npm run build
```

---

## 6. Deploiement

### Deploiement Complet

```bash
cd sos
firebase deploy
```

### Deploiement Selectif

```bash
# Regles Firestore
firebase deploy --only firestore:rules

# Regles Storage
firebase deploy --only storage:rules

# Cloud Functions
firebase deploy --only functions

# Hosting
firebase deploy --only hosting
```

### Verification

```bash
# Lister les functions
firebase functions:list

# Voir les logs
firebase functions:log
```

---

## 7. Verification

### Checklist Post-Installation

```bash
# 1. Frontend compile
cd sos && npm run build

# 2. Functions compilent
cd firebase/functions && npm run build

# 3. Test local
cd sos && npm run dev

# 4. Verifier Firebase
firebase functions:list
```

### Tests Fonctionnels

| Test | URL | Resultat |
|------|-----|----------|
| Accueil | sos-expat.com | Page affichee |
| Login | /login | Formulaire OK |
| Admin | /admin | Redirection |
| Paiement | Test Stripe | Transaction OK |

---

## 8. Depannage

### Erreurs Courantes

#### "Firebase CLI not authenticated"
```bash
firebase logout
firebase login
```

#### "Permission denied" Firestore
```bash
firebase deploy --only firestore:rules
```

#### "npm install" echoue
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Logs et Debug

```bash
# Logs Functions
firebase functions:log --only scheduledBackup

# Logs en temps reel
firebase functions:log --follow
```

---

## Ports Utilises (Dev Local)

| Service | Port |
|---------|------|
| Frontend (Vite) | 5173 |
| Firebase Emulator UI | 4000 |
| Firestore Emulator | 8080 |
| Functions Emulator | 5001 |
| Auth Emulator | 9099 |

---

## Voir Aussi

- [Configuration Detaillee](./CONFIGURATION.md)
- [Checklist Pre-Production](./CHECKLIST.md)
- [Architecture](../02_ARCHITECTURE/OVERVIEW.md)
