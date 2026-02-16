# Quickstart - SOS Expat

> Démarrage rapide en 5 minutes pour découvrir la plateforme

**Temps estimé**: 5 minutes
**Dernière mise à jour**: 2026-02-16

---

## Prérequis

- Node.js 22+ installé
- Git installé
- Firebase CLI installé (`npm install -g firebase-tools`)

---

## Installation Rapide

```bash
# 1. Cloner le projet
git clone https://github.com/will383842/sos-expat-project.git
cd sos-expat-project/sos

# 2. Installer les dépendances
npm install

# 3. Copier .env.example → .env
cp .env.example .env

# 4. Démarrer le serveur dev
npm run dev
```

Ouvrir http://localhost:5174

---

## Architecture en Bref

```
sos/
├── src/                    # Frontend React 18 + TypeScript
├── firebase/functions/     # Backend Firebase (250+ fonctions)
├── public/                 # Assets statiques
└── docs/                   # Documentation
```

---

## Commandes Essentielles

```bash
# Développement
npm run dev                 # Démarrer frontend (port 5174)
npm run dev:full            # Frontend + Emulateurs Firebase

# Build
npm run build               # Build production
npm run preview             # Preview du build

# Tests
npm run test                # Tests unitaires
npm run typecheck           # Vérification TypeScript
npm run lint                # ESLint

# Firebase Functions
cd firebase/functions
npm run build               # Compiler TypeScript
npm run serve               # Serveur local functions
```

---

## Structure du Projet

### Frontend (src/)

- **src/components/** - 31 catégories de composants
- **src/pages/** - 40+ pages
- **src/hooks/** - 59 hooks personnalisés
- **src/contexts/** - Contextes React (Auth, App)
- **src/config/** - Configuration (Firebase, routes)
- **src/utils/** - Utilitaires
- **src/types/** - Définitions TypeScript
- **src/locales/** - Traductions (9 langues)

### Backend (firebase/functions/src/)

- **callables/** - Fonctions appelables (~240)
- **triggers/** - Triggers Firestore (16)
- **scheduled/** - Cron jobs (26)
- **Webhooks/** - Twilio, Stripe (4)
- **affiliate/** - Système affiliate (4 rôles)
- **payment/** - Paiements centralisés

---

## Architecture Multi-Région

| Région | Rôle | Fonctions |
|--------|------|-----------|
| **europe-west1** | Core Business | 200+ callables, Admin, KYC |
| **europe-west2** | Affiliate/Marketing | Chatter, Influencer, Blogger, GroupAdmin |
| **europe-west3** | **PROTÉGÉE** | Payments, Twilio, Cloud Tasks, Triggers |

---

## Workflow Typique

### Développeur Frontend

```bash
# 1. Créer une branche feature
git checkout -b feature/nouvelle-fonctionnalite

# 2. Développer
npm run dev

# 3. Vérifier
npm run typecheck
npm run lint

# 4. Commit & Push
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite

# 5. Créer PR sur GitHub
```

### Développeur Backend

```bash
# 1. Développer dans firebase/functions/src/
cd firebase/functions

# 2. Compiler en watch mode
npm run build:watch

# 3. Tester localement
npm run serve

# 4. Déployer (après tests)
firebase deploy --only functions
```

---

## Déploiement

### Frontend (Cloudflare Pages)

Push sur `main` → Auto-deploy Cloudflare Pages
URL: https://www.sosexpats.com

### Backend (Firebase Functions)

```bash
cd firebase/functions
npm run build
firebase deploy --only functions --project sos-urgently-ac307
```

OU push sur `main` → GitHub Actions auto-deploy

---

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind |
| **Backend** | Firebase Functions (Node.js 22) |
| **Database** | Firestore (multi-région) |
| **Auth** | Firebase Auth |
| **Payments** | Stripe Connect + PayPal |
| **Calls** | Twilio (IVR + conférence) |
| **Analytics** | GA4, Meta Pixel, Google Ads |

---

## Fonctionnalités Clés

- **IVR multilingue** (9 langues)
- **Paiements multi-gateway** (Stripe, PayPal, Wise, Flutterwave)
- **Multi-provider system** (shareBusyStatus)
- **Système affiliate** (4 rôles: Chatter, Influencer, Blogger, GroupAdmin)
- **Subscriptions** (3 plans)
- **KYC automatique** (Stripe onboarding)
- **Real-time** (Firestore listeners)

---

## Accès Rapide

| Service | URL |
|---------|-----|
| **Production** | https://www.sosexpats.com |
| **Firebase Console** | https://console.firebase.google.com/project/sos-urgently-ac307 |
| **Stripe Dashboard** | https://dashboard.stripe.com |
| **Twilio Console** | https://console.twilio.com |
| **GitHub Repo** | https://github.com/will383842/sos-expat-project |

---

## Prochaines Étapes

1. Lire [Guide d'Installation Complet](./installation.md)
2. Configurer [Environment Setup](./environment-setup.md)
3. Explorer [Architecture](../02-ARCHITECTURE/OVERVIEW.md)
4. Consulter [API Reference](../08-API-REFERENCE/)

---

**Document maintenu par l'équipe technique SOS Expat**
**Dernière révision**: 2026-02-16
