# 📚 Documentation SOS Expat - Navigation Principale

> **Bienvenue dans la documentation complète du projet SOS Expat !**
> Cette page centralise tous les guides, références techniques et ressources du projet.

---

## 🚀 Démarrage Rapide

**Nouveau sur le projet ?** Commencez par ici :

1. 📖 [**README Principal**](../../README.md) - Vue d'ensemble du projet
2. 📐 [**Architecture Système**](../../ARCHITECTURE.md) - Comprendre l'architecture
3. 🔧 [**Guide d'Installation**](../01-GETTING-STARTED/installation.md) - Installer l'environnement de développement
4. 🎯 [**Premiers Pas**](../01-GETTING-STARTED/quickstart.md) - Créer votre premier feature

---

## 📁 Organisation de la Documentation

La documentation est organisée en **9 sections principales** :

### [00-INDEX](./INDEX.md) - 📑 Index & Navigation
- Navigation principale (ce fichier)
- Index alphabétique
- Glossaire des termes
- FAQ

### [01-GETTING-STARTED](../01-GETTING-STARTED/INDEX.md) - 🚀 Guide de Démarrage
- Installation de l'environnement
- Configuration Firebase
- Premier lancement
- Tutoriels débutants

### [02-ARCHITECTURE](../02-ARCHITECTURE/INDEX.md) - 📐 Architecture
- Architecture multi-région (europe-west1, west2, west3)
- Stack technique complète
- Diagrammes de flux
- Décisions d'architecture (ADR)

### [03-FEATURES](../03-FEATURES/INDEX.md) - 🎯 Fonctionnalités
- Système d'appels Twilio (IVR, conférence)
- Système de paiements (Stripe, PayPal)
- Multi-Provider (shareBusyStatus)
- Abonnements & quotas
- Internationalisation (i18n)

### [04-AFFILIATE](../04-AFFILIATE/INDEX.md) - 💰 Système Affiliate
- **Chatter** - Promoteurs Telegram
- **Influencer** - Influenceurs réseaux sociaux
- **Blogger** - Blogueurs SEO
- **GroupAdmin** - Admins de groupes Facebook
- Commissions & payouts

### [05-DEPLOYMENT](../05-DEPLOYMENT/INDEX.md) - 🚀 Déploiement
- Frontend (Cloudflare Pages)
- Backend (Firebase Functions)
- GitHub Actions CI/CD
- Monitoring production

### [06-OPERATIONS](../06-OPERATIONS/INDEX.md) - ⚙️ Opérations
- Backups automatiques
- Monitoring & alertes
- Sécurité & audit
- Incident response

### [07-DEVELOPMENT](../07-DEVELOPMENT/INDEX.md) - 👨‍💻 Guide Développeur
- Standards de code
- Workflow Git
- Testing (unit, e2e)
- Code review process

### [08-API-REFERENCE](../08-API-REFERENCE/INDEX.md) - 📚 Référence API
- Schéma Firestore (75+ collections)
- Cloud Functions (250+ fonctions)
- REST API endpoints
- WebHooks (Twilio, Stripe)

---

## 🔍 Recherche Par Sujet

### Authentification & Sécurité
- [Auth & Rôles](../02-ARCHITECTURE/auth-roles.md)
- [Firestore Security Rules](../06-OPERATIONS/security-audit.md)
- [KYC Providers](../03-FEATURES/kyc-system.md)

### Paiements
- [Stripe Connect](../03-FEATURES/stripe-integration.md)
- [PayPal Payouts](../03-FEATURES/paypal-integration.md)
- [Wise Transfers](../04-AFFILIATE/wise-payouts.md)
- [Flutterwave (Afrique)](../03-FEATURES/flutterwave-integration.md)

### Appels Twilio
- [Architecture des Appels](../../ARCHITECTURE.md#système-dappels-twilio)
- [IVR Multilingue](../03-FEATURES/twilio-ivr.md)
- [Conférence 3-Way](../03-FEATURES/twilio-conference.md)
- [Call Recording](../03-FEATURES/call-recording.md)

### Multi-Provider
- [Système Multi-Provider](../03-FEATURES/multi-provider.md)
- [Dashboard Multi-Prestataire](../../../Dashboard-multiprestataire/README.md)
- [Synchronisation Busy Status](../03-FEATURES/multi-provider.md#propagation-des-statuts)

### Telegram
- [Intégration Telegram Bot](../04-AFFILIATE/telegram-integration.md)
- [Chatter Onboarding](../04-AFFILIATE/chatter-telegram.md)
- [Deep Links](../04-AFFILIATE/telegram-deep-links.md)

### Déploiement
- [Cloudflare Pages](../05-DEPLOYMENT/cloudflare-pages.md)
- [Firebase Functions](../05-DEPLOYMENT/firebase-functions.md)
- [GitHub Actions](../05-DEPLOYMENT/github-actions.md)

---

## 🗺️ Diagrammes & Schémas

| Diagramme | Description | Lien |
|-----------|-------------|------|
| **Architecture Multi-Région** | Vue d'ensemble des 3 régions Firebase | [ARCHITECTURE.md](../../ARCHITECTURE.md#architecture-multi-région) |
| **Call Flow Twilio** | Flux complet d'un appel (IVR → Conférence) | [ARCHITECTURE.md](../../ARCHITECTURE.md#flux-dun-appel) |
| **Payment System** | Architecture des paiements Stripe/PayPal | [ARCHITECTURE.md](../../ARCHITECTURE.md#système-de-paiements) |
| **Multi-Provider Data Model** | Modèle de données multi-prestataires | [multi-provider.md](../03-FEATURES/multi-provider.md#modèle-de-données) |
| **Affiliate Commission Flow** | Flux des commissions affiliate | [04-AFFILIATE/INDEX.md](../04-AFFILIATE/INDEX.md) |

---

## 🎓 Tutoriels & Guides

### Pour les Développeurs Frontend
1. [Créer un Nouveau Composant](../07-DEVELOPMENT/create-component.md)
2. [Ajouter une Route](../07-DEVELOPMENT/add-route.md)
3. [Utiliser TanStack Query](../07-DEVELOPMENT/react-query-guide.md)
4. [Ajouter une Traduction](../07-DEVELOPMENT/i18n-guide.md)

### Pour les Développeurs Backend
1. [Créer une Cloud Function](../07-DEVELOPMENT/create-function.md)
2. [Écrire une Security Rule](../07-DEVELOPMENT/security-rules-guide.md)
3. [Créer un Trigger Firestore](../07-DEVELOPMENT/firestore-triggers.md)
4. [Implémenter un WebHook](../07-DEVELOPMENT/webhooks-guide.md)

### Pour les DevOps
1. [Déployer en Production](../05-DEPLOYMENT/production-deploy.md)
2. [Configurer GitHub Actions](../05-DEPLOYMENT/github-actions-setup.md)
3. [Monitorer les Performances](../06-OPERATIONS/monitoring-guide.md)
4. [Restaurer un Backup](../06-OPERATIONS/backup-restore.md)

---

## 📦 Projets Connexes

| Projet | Description | Documentation |
|--------|-------------|---------------|
| **sos/** | Application principale SOS Expat | [README.md](../../README.md) |
| **Dashboard-multiprestataire/** | PWA pour gestionnaires d'agence | [README.md](../../../Dashboard-multiprestataire/README.md) |
| **Outil-sos-expat/** | AI Assistant pour providers | [README.md](../../../Outil-sos-expat/README.md) |
| **backlink-engine/** | Système de backlinks SEO | [README.md](../../../backlink-engine/README.md) |
| **Telegram-Engine/** | Marketing tool Telegram (Laravel) | [README.md](../../../Telegram-Engine/README.md) |

---

## 🔗 Liens Externes Importants

| Service | URL | Description |
|---------|-----|-------------|
| **Firebase Console** | [console.firebase.google.com](https://console.firebase.google.com/project/sos-urgently-ac307) | Projet Firebase principal |
| **Cloudflare Pages** | [dash.cloudflare.com](https://dash.cloudflare.com) | Déploiement frontend |
| **Stripe Dashboard** | [dashboard.stripe.com](https://dashboard.stripe.com) | Gestion paiements Stripe |
| **Twilio Console** | [console.twilio.com](https://console.twilio.com) | Configuration appels Twilio |
| **Google Analytics** | [analytics.google.com](https://analytics.google.com) | Analytics GA4 |

---

## 📞 Support & Contribution

- **Email** : support@sos-expat.com
- **Issues** : GitHub Issues
- **Contributing** : [CONTRIBUTING.md](../../CONTRIBUTING.md)
- **Code of Conduct** : [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md)

---

## 📝 Historique & Archives

- [**Archives**](../09-ARCHIVES/old-root-docs/) - Anciens documents de travail
- [**Rapports de Migration**](../09-ARCHIVES/migration-reports/) - Historique des migrations
- [**CHANGELOG**](../../CHANGELOG.md) - Historique des versions

---

## 🔄 Dernière Mise à Jour

**Date** : 16 février 2026
**Version** : 2.0 (Réorganisation complète de la documentation)
**Par** : SOS Expat Team avec Claude Code

---

**📚 Documentation maintenue avec ❤️ par l'équipe SOS Expat**
