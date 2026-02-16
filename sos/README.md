# SOS Expat - Plateforme de Mise en Relation Expats/Prestataires

> Plateforme web connectant les expatriés avec des prestataires spécialisés (avocats, conseillers) via un système d'appels intelligents.

[![Production](https://img.shields.io/badge/production-live-brightgreen)](https://www.sosexpats.com)
[![Firebase](https://img.shields.io/badge/Firebase-Functions-orange)](https://firebase.google.com)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org)

---

## 📋 Vue d'Ensemble

**SOS Expat** est une plateforme SaaS permettant aux expatriés de réserver des consultations avec des professionnels spécialisés dans :
- 🏛️ Droit de l'immigration et visas
- 🏠 Expatriation et installation
- 💼 Services juridiques internationaux
- 📞 Consultations téléphoniques (appels Twilio)

### Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Backend** | Firebase Functions (Node.js 22) |
| **Base de données** | Firestore (multi-région) |
| **Paiements** | Stripe Connect + PayPal |
| **Appels** | Twilio (IVR + conférence) |
| **Déploiement** | Cloudflare Pages + Firebase |
| **Analytics** | GA4, Meta Pixel, Google Ads |

---

## 🚀 Liens Rapides

| Documentation | Description |
|---------------|-------------|
| [📐 Architecture](./ARCHITECTURE.md) | Vue d'ensemble de l'architecture système |
| [📚 Documentation Complète](./docs/) | Documentation technique complète |
| [🔧 Installation](./docs/01-GETTING-STARTED/installation.md) | Guide d'installation développement |
| [🚀 Déploiement](./docs/05-DEPLOYMENT/) | Guides de déploiement production |
| [🔐 Sécurité](./docs/06-OPERATIONS/security-audit.md) | Audit de sécurité |

---

## 📁 Structure du Projet

```
sos/
├── src/                          # Code source frontend
│   ├── components/               # Composants React (31 catégories)
│   ├── pages/                    # Pages (40+ routes)
│   ├── hooks/                    # Custom hooks (59 hooks)
│   ├── contexts/                 # Contextes React (Auth, App, etc.)
│   ├── config/                   # Configuration (Firebase, routes)
│   ├── utils/                    # Utilitaires
│   ├── types/                    # Définitions TypeScript
│   └── locales/                  # Traductions (9 langues)
│
├── firebase/                     # Backend Firebase
│   └── functions/
│       └── src/                  # Cloud Functions (250+ fonctions)
│           ├── callables/        # Fonctions appelables depuis frontend
│           ├── triggers/         # Triggers Firestore
│           ├── scheduled/        # Fonctions planifiées (crons)
│           ├── Webhooks/         # Webhooks Twilio/Stripe
│           ├── affiliate/        # Système affiliate (4 rôles)
│           └── payment/          # Système de paiements centralisé
│
├── docs/                         # Documentation centralisée
│   ├── 00-INDEX/                 # Index de navigation
│   ├── 01-GETTING-STARTED/       # Guides de démarrage
│   ├── 02-ARCHITECTURE/          # Documentation architecture
│   ├── 03-FEATURES/              # Documentation fonctionnalités
│   ├── 04-AFFILIATE/             # Systèmes affiliate
│   ├── 05-DEPLOYMENT/            # Guides de déploiement
│   ├── 06-OPERATIONS/            # Operations & monitoring
│   ├── 07-DEVELOPMENT/           # Guide développeurs
│   ├── 08-API-REFERENCE/         # Référence API
│   └── 09-ARCHIVES/              # Documentation historique
│
├── public/                       # Assets statiques
├── cloudflare-worker/            # Worker Cloudflare (bot detection)
└── scripts/                      # Scripts de build et migration
```

---

## 🏗️ Architecture Multi-Région

Le projet utilise une **architecture 3-régions Firebase** pour l'isolation et la performance :

### 🇧🇪 europe-west1 (Belgique) - Core Business
- API publiques frontend (200+ callables)
- Fonctions admin
- KYC, backups, subscriptions

### 🇬🇧 europe-west2 (Londres) - Affiliate/Marketing
- Chatter, Influencer, Blogger, GroupAdmin (~143 fonctions)
- Load balancing - peut saturer sans affecter le core business

### 🇧🇪 europe-west3 (Belgique) - **PROTÉGÉE**
- Stripe & PayPal webhooks
- Twilio webhooks (temps réel critique)
- Cloud Tasks
- Triggers Firestore

> 📖 Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour plus de détails

---

## 🌍 Internationalisation

Support complet de **9 langues** :
- 🇫🇷 Français
- 🇬🇧 English
- 🇪🇸 Español
- 🇩🇪 Deutsch
- 🇵🇹 Português
- 🇷🇺 Русский
- 🇨🇳 中文
- 🇮🇳 हिन्दी
- 🇸🇦 العربية (RTL)

---

## 💻 Installation & Développement

### Prérequis
- Node.js 22+
- npm ou yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### Installation Rapide

```bash
# 1. Cloner le repo
git clone https://github.com/will383842/sos-expat-project.git
cd sos-expat-project/sos

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditer .env avec tes clés Firebase

# 4. Installer Firebase Functions
cd firebase/functions
npm install
cd ../..

# 5. Démarrer le serveur de développement
npm run dev
```

Le serveur démarre sur **http://localhost:5174**

### Développement avec Emulateurs Firebase

```bash
# Démarrer tout (Frontend + Functions + Emulateurs)
npm run dev:full
```

Emulateurs :
- **Auth** : http://localhost:9099
- **Firestore** : http://localhost:8080
- **Functions** : http://localhost:5001
- **Storage** : http://localhost:9199
- **UI** : http://localhost:4002

---

## 🚀 Déploiement

### Frontend (Cloudflare Pages)
Déploiement automatique via GitHub :
- Push sur `main` → Auto-deploy Cloudflare Pages
- URL : https://www.sosexpats.com

### Backend (Firebase Functions)
Déploiement automatique via GitHub Actions :
- Push sur `main` dans `sos/firebase/functions/**` → Auto-deploy

Déploiement manuel :
```bash
cd firebase/functions
npm run build
firebase deploy --only functions --project sos-urgently-ac307
```

> 📖 Voir [docs/05-DEPLOYMENT/](./docs/05-DEPLOYMENT/) pour les guides complets

---

## 🔑 Fonctionnalités Clés

### 📞 Système d'Appels Twilio
- IVR multilingue (9 langues)
- Détection répondeur (AMD)
- Conférence à 3 (client + provider + enregistrement)
- Retry automatique
- Call recording (90 jours de rétention)

### 💳 Paiements Multi-Gateway
- **Stripe Connect** (44 pays) - KYC automatique
- **PayPal** (150+ pays) - Email-based payouts
- **Wise** - Virements internationaux (affiliates)
- **Flutterwave** - Mobile Money Afrique

### 👥 Multi-Provider System
- Comptes multi-prestataires (agency_manager)
- Synchronisation du statut busy (shareBusyStatus)
- Dashboard séparé : `/Dashboard-multiprestataire`

### 🎯 Système Affiliate (4 Rôles)
1. **Chatter** - Promoteurs Telegram
2. **Influencer** - Influenceurs réseaux sociaux
3. **Blogger** - Blogueurs avec articles SEO
4. **GroupAdmin** - Admins de groupes Facebook

### 🤖 AI Assistant Integration
- Intégration avec Outil-sos-expat (projet séparé)
- Quotas par subscription
- API access control

---

## 📊 Monitoring & Operations

### Backups Automatiques
- **Quotidien** : Firestore + Auth + Storage (9h Paris)
- **Cross-région** : Réplication eur3 (14h)
- **Trimestriel** : Test de restauration

### Monitoring
- Firebase Performance Monitoring
- Sentry (error tracking)
- Google Analytics 4
- Custom dashboards

### Alertes
- Budget alerts (GCP costs)
- Pending transfers monitoring
- Provider inactivity checks (15 min)
- Stuck payments recovery

---

## 🔐 Sécurité

- ✅ Firestore Security Rules (score 85/100)
- ✅ HTTPS forcé (HSTS)
- ✅ CSP headers (Cloudflare)
- ✅ Stripe webhooks signature validation
- ✅ Twilio webhooks secret validation
- ✅ Rate limiting (Firebase App Check)
- ✅ Anti-bot protection (reCAPTCHA v3)
- ✅ GDPR compliant (export, delete, consent tracking)

> 📖 Voir [docs/06-OPERATIONS/security-audit.md](./docs/06-OPERATIONS/security-audit.md)

---

## 🧪 Tests

```bash
# Frontend tests
npm run test

# TypeScript type check
npm run typecheck

# Lint
npm run lint

# Firebase Functions tests
cd firebase/functions
npm run test
```

---

## 📦 Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement (port 5174) |
| `npm run build` | Build production |
| `npm run preview` | Preview du build |
| `npm run dev:full` | Dev + Emulators + Functions |
| `npm run analyze` | Analyse du bundle (visualizer) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint |
| `npm run test` | Tests Vitest |

---

## 🤝 Contributing

1. Fork le projet
2. Crée une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit tes changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvre une Pull Request

---

## 📞 Support

- **Email** : support@sos-expat.com
- **Documentation** : [docs/](./docs/)
- **Issues** : GitHub Issues

---

## 📄 Licence

Propriétaire - SOS Expat © 2024-2026

---

## 🔗 Projets Connexes

- **Outil-sos-expat** - AI Assistant pour providers
- **Dashboard-multiprestataire** - PWA pour agency managers
- **backlink-engine** - Système de backlinks (TypeScript + Fastify + Prisma)
- **Telegram-Engine** - Marketing tool Telegram (Laravel 11)

---

**Made with ❤️ by the SOS Expat Team**
