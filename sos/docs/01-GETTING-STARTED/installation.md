# Guide d'Installation - SOS Expat

> Guide complet pour installer et configurer l'environnement de développement SOS Expat

**Temps estimé**: 2-3 heures
**Dernière mise à jour**: 2026-02-16
**Prérequis**: Connaissances de base en Git, npm et Firebase

---

## Table des Matières

1. [Prérequis Système](#1-prérequis-système)
2. [Installation des Outils](#2-installation-des-outils)
3. [Clonage du Projet](#3-clonage-du-projet)
4. [Configuration Firebase](#4-configuration-firebase)
5. [Configuration de l'Environnement](#5-configuration-de-lenvironnement)
6. [Installation des Dépendances](#6-installation-des-dépendances)
7. [Démarrage en Mode Développement](#7-démarrage-en-mode-développement)
8. [Vérification de l'Installation](#8-vérification-de-linstallation)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prérequis Système

### Configuration Matérielle Recommandée

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| **RAM** | 8 GB | 16 GB+ |
| **CPU** | 4 cores | 8 cores+ |
| **Disque** | 20 GB libre | 50 GB+ SSD |
| **OS** | Windows 10, macOS 10.15, Ubuntu 20.04 | Dernière version stable |

### Logiciels Requis

| Logiciel | Version | Téléchargement |
|----------|---------|----------------|
| **Node.js** | 22.x LTS | https://nodejs.org/ |
| **npm** | 10.x+ | Inclus avec Node.js |
| **Git** | 2.30+ | https://git-scm.com/ |
| **VS Code** | Dernière | https://code.visualstudio.com/ (recommandé) |

### Extensions VS Code Recommandées

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "firebase.vscode-firebase-explorer",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

---

## 2. Installation des Outils

### Installation de Node.js

**Windows**:
```bash
# Télécharger depuis https://nodejs.org/
# Installer la version LTS (22.x)
# Vérifier l'installation
node --version  # Devrait afficher v22.x.x
npm --version   # Devrait afficher 10.x.x
```

**macOS**:
```bash
# Avec Homebrew
brew install node@22

# Vérifier
node --version
npm --version
```

**Linux (Ubuntu/Debian)**:
```bash
# Avec NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier
node --version
npm --version
```

### Installation de Git

**Windows**:
```bash
# Télécharger depuis https://git-scm.com/
# Suivre l'installateur (options par défaut OK)

# Configurer Git
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

**macOS**:
```bash
# Avec Homebrew
brew install git

# Configurer
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

**Linux**:
```bash
# Ubuntu/Debian
sudo apt-get install git

# Configurer
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

### Installation de Firebase CLI

```bash
# Installation globale
npm install -g firebase-tools

# Vérifier
firebase --version  # Devrait afficher 13.x.x+

# Connexion (optionnel pour maintenant)
firebase login
```

---

## 3. Clonage du Projet

### Via HTTPS (Recommandé)

```bash
# Naviguer vers votre dossier de projets
cd ~/Documents/Projets  # ou C:\Users\YourName\Documents\Projets sous Windows

# Cloner le repository
git clone https://github.com/will383842/sos-expat-project.git

# Entrer dans le dossier
cd sos-expat-project
```

### Via SSH (Si configuré)

```bash
git clone git@github.com:will383842/sos-expat-project.git
cd sos-expat-project
```

### Vérification

```bash
# Voir la structure
ls -la

# Devrait afficher:
# - sos/
# - Dashboard-multiprestataire/
# - backlink-engine/
# - README.md
# - etc.
```

---

## 4. Configuration Firebase

### Connexion à Firebase

```bash
# Connexion
firebase login

# Si déjà connecté, vérifier
firebase projects:list

# Sélectionner le projet SOS Expat
cd sos
firebase use sos-urgently-ac307

# Vérifier la sélection
firebase projects:list
# Le projet sélectionné devrait avoir (current) à côté
```

### Vérification des Permissions

```bash
# Lister les fonctions (nécessite accès project)
firebase functions:list

# Si erreur "Permission denied", contacter l'admin pour accès
```

---

## 5. Configuration de l'Environnement

### Créer le Fichier .env

```bash
# Naviguer vers /sos
cd sos

# Copier le template
cp .env.example .env

# Éditer le fichier
# Windows: notepad .env
# macOS/Linux: nano .env  # ou vim, code, etc.
```

### Variables d'Environnement Frontend

**Fichier: `/sos/.env`**

```env
# ===========================================
# SOS-EXPAT Environment Variables
# ===========================================

# Firebase Configuration (PRODUCTION)
VITE_FIREBASE_API_KEY=AIzaSyBR5wF_eE0vG5vM9kQ2qB4xN7tL8jP6zXc
VITE_FIREBASE_AUTH_DOMAIN=sos-urgently-ac307.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sos-urgently-ac307
VITE_FIREBASE_STORAGE_BUCKET=sos-urgently-ac307.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=484056890367
VITE_FIREBASE_APP_ID=1:484056890367:web:8a4b5c6d7e8f9g0h1i2j
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Analytics 4 & Tag Manager
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_GTM_ID=GTM-XXXXXXX

# Google Ads Conversion Tracking
VITE_GOOGLE_ADS_CONVERSION_ID=AW-XXXXXXXXXX
VITE_GOOGLE_ADS_PURCHASE_LABEL=XXXXXXXXXXXXXXXXXXX
VITE_GOOGLE_ADS_LEAD_LABEL=XXXXXXXXXXXXXXXXXXX
VITE_GOOGLE_ADS_SIGNUP_LABEL=XXXXXXXXXXXXXXXXXXX
VITE_GOOGLE_ADS_CHECKOUT_LABEL=XXXXXXXXXXXXXXXXXXX

# Firebase Cloud Messaging (Push Notifications)
VITE_FIREBASE_VAPID_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Functions Regions (Multi-Région)
VITE_FUNCTIONS_REGION=europe-west1                  # Core business
VITE_FUNCTIONS_AFFILIATE_REGION=europe-west2        # Affiliate/Marketing
VITE_FUNCTIONS_PAYMENT_REGION=europe-west3          # Payments + Twilio
VITE_FUNCTIONS_TRIGGERS_REGION=europe-west3         # Triggers

# Emulators (DEV ONLY - false en production)
VITE_USE_EMULATORS=false

# Stripe Configuration (TEST pour dev)
VITE_STRIPE_PUBLIC_KEY=pk_test_51XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# PayPal Configuration (SANDBOX pour dev)
VITE_PAYPAL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_PAYPAL_MODE=sandbox

# reCAPTCHA v3 (Anti-bot pour Chatter registration)
VITE_RECAPTCHA_SITE_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Environment
NODE_ENV=development
```

**IMPORTANT**: Contacter l'admin pour obtenir les vraies valeurs (secrets sensibles)

---

## 6. Installation des Dépendances

### Installation Frontend

```bash
# Naviguer vers /sos
cd sos

# Installer les dépendances (peut prendre 5-10 min)
npm install

# Si erreur de peer dependencies
npm install --legacy-peer-deps
```

### Installation Firebase Functions

```bash
# Naviguer vers /sos/firebase/functions
cd firebase/functions

# Installer les dépendances
npm install

# Compiler TypeScript (vérifier que ça compile)
npm run build

# Retourner à la racine
cd ../..
```

### Vérification des Installations

```bash
# Depuis /sos
npm list --depth=0

# Devrait afficher ~100+ packages sans erreurs majeures
```

---

## 7. Démarrage en Mode Développement

### Option 1: Frontend Seul (Recommandé pour débuter)

```bash
# Depuis /sos
npm run dev

# Le serveur démarre sur http://localhost:5174
# Ouvrir dans votre navigateur
```

**Attendu**:
- Page d'accueil SOS Expat s'affiche
- Connexion à Firebase production (attention aux données!)
- Fonctionnalités admin non disponibles (besoin de privilèges)

### Option 2: Frontend + Emulateurs Firebase (Dev complet)

**Prérequis**: Java 11+ installé (pour emulators Firestore)

```bash
# Vérifier Java
java -version  # Devrait afficher 11+

# Démarrer emulateurs + frontend
npm run dev:full

# OU séparément
# Terminal 1 - Emulateurs
firebase emulators:start

# Terminal 2 - Frontend (avec .env VITE_USE_EMULATORS=true)
npm run dev
```

**URLs des Emulateurs**:
- UI: http://localhost:4002
- Auth: http://localhost:9099
- Firestore: http://localhost:8080
- Functions: http://localhost:5001
- Storage: http://localhost:9199

### Option 3: Avec Firebase Functions Locales

```bash
# Terminal 1 - Compiler Functions en watch mode
cd firebase/functions
npm run build:watch

# Terminal 2 - Emulateurs
cd ../..
firebase emulators:start --only functions,firestore,auth

# Terminal 3 - Frontend
npm run dev
```

---

## 8. Vérification de l'Installation

### Checklist Post-Installation

#### Frontend Compile

```bash
cd sos
npm run build

# Devrait produire /dist sans erreurs TypeScript
```

#### Functions Compilent

```bash
cd firebase/functions
npm run build

# Devrait produire /lib sans erreurs TypeScript
```

#### Tests Passent

```bash
# Frontend tests (si configurés)
cd sos
npm run test

# TypeScript check
npm run typecheck

# Linting
npm run lint
```

#### Connexion Firebase OK

```bash
# Liste les fonctions déployées
firebase functions:list

# Devrait afficher 250+ fonctions si accès project
```

### Tests Fonctionnels Manuels

| Test | Action | Résultat Attendu |
|------|--------|------------------|
| **Page d'accueil** | Ouvrir http://localhost:5174 | Landing page SOS Expat affichée |
| **Login** | Cliquer "Se connecter" | Formulaire Firebase Auth affiché |
| **Providers** | Naviguer vers `/providers` | Liste des providers visible |
| **Responsive** | Redimensionner fenêtre | UI s'adapte (mobile/tablet/desktop) |
| **i18n** | Changer langue (FR/EN) | Traductions changent |

---

## 9. Troubleshooting

### Problème: `npm install` échoue

**Erreur**: `ERESOLVE unable to resolve dependency tree`

**Solution**:
```bash
# Option 1: Legacy peer deps
npm install --legacy-peer-deps

# Option 2: Force install
npm install --force

# Option 3: Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

### Problème: Firebase CLI non authentifié

**Erreur**: `Error: Authentication Error`

**Solution**:
```bash
# Déconnexion
firebase logout

# Reconnexion
firebase login

# Vérifier
firebase projects:list
```

---

### Problème: Port 5174 déjà utilisé

**Erreur**: `Port 5174 is already in use`

**Solution**:
```bash
# Option 1: Tuer le processus (Linux/macOS)
lsof -ti:5174 | xargs kill -9

# Option 2: Tuer le processus (Windows)
netstat -ano | findstr :5174
taskkill /PID <PID> /F

# Option 3: Utiliser un autre port
npm run dev -- --port 5175
```

---

### Problème: Emulateurs ne démarrent pas

**Erreur**: `java.lang.RuntimeException` ou `Could not start Firestore Emulator`

**Solution**:
```bash
# Vérifier Java
java -version  # Doit être 11+

# Installer Java si absent
# Ubuntu: sudo apt install openjdk-11-jdk
# macOS: brew install openjdk@11
# Windows: https://adoptium.net/

# Réessayer
firebase emulators:start
```

---

### Problème: TypeScript build errors

**Erreur**: `error TS2307: Cannot find module 'firebase/app'`

**Solution**:
```bash
# Réinstaller Firebase SDK
npm install firebase@latest

# Rebuild
cd firebase/functions
rm -rf lib node_modules
npm install
npm run build
```

---

### Problème: CORS errors dans la console

**Erreur**: `Access to fetch at '...' has been blocked by CORS policy`

**Solution**:
```env
# Vérifier .env
VITE_USE_EMULATORS=false  # Si utilisation production

# OU si emulators
VITE_USE_EMULATORS=true
```

```bash
# Redémarrer le serveur
npm run dev
```

---

### Problème: Firestore rules permission denied

**Erreur**: `Missing or insufficient permissions`

**Cause**: Firestore Rules en production bloquent l'accès

**Solution**:
```bash
# Option 1: Utiliser les emulators (rules disabled)
firebase emulators:start

# Option 2: Se connecter avec un compte admin
# (demander accès à l'équipe)

# Option 3: Modifier temporairement les rules (DANGEREUX)
# Ne JAMAIS faire ça en production!
```

---

## Prochaines Étapes

Après installation réussie:

1. Lire [Quickstart Guide](./quickstart.md) pour un aperçu rapide
2. Lire [Environment Setup](./environment-setup.md) pour configuration avancée
3. Consulter [Architecture Overview](../02-ARCHITECTURE/OVERVIEW.md)
4. Explorer [Development Guide](../07-DEVELOPMENT/coding-standards.md)

---

## Ressources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Vite Documentation](https://vitejs.dev/)
- [React 18 Documentation](https://react.dev/)

---

## Support

- **Documentation**: [/sos/docs/](../00-INDEX/NAVIGATION.md)
- **GitHub Issues**: https://github.com/will383842/sos-expat-project/issues
- **Email Support**: support@sos-expat.com

---

**Document maintenu par l'équipe technique SOS Expat**
**Dernière révision**: 2026-02-16
