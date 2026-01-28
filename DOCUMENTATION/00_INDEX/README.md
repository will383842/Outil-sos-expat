# DOCUMENTATION SOS EXPAT - INDEX PRINCIPAL

> **Version**: 2.0.0
> **Date**: 27 Janvier 2026
> **Projet**: SOS Expat & Outil IA SOS

---

## Vue d'Ensemble du Projet

**SOS Expat** est une plateforme web mettant en relation des **expatries**, **avocats** et **clients** pour une aide juridique, administrative ou humaine a distance.

### Les Deux Applications

| Application | Description | URL |
|-------------|-------------|-----|
| **SOS Expat** (`sos/`) | Plateforme principale client-facing | sos-expat.com |
| **Outil IA SOS** (`Outil-sos-expat/`) | Console admin + Dashboard prestataires avec IA | outil-sos-expat.com |

### Proposition de Valeur

- Acces a un avocat ou expert local en **moins de 5 minutes**
- Couverture de **197 pays**
- Support de **9 langues** (FR, EN, ES, DE, RU, PT, ZH, AR, HI)
- Paiement securise via **Stripe** et **PayPal**
- **Assistant IA** pour les prestataires

---

## Navigation dans la Documentation

### 01 - Demarrage Rapide
**Pour commencer rapidement**
- [Installation Complete](../01_GETTING_STARTED/INSTALLATION.md)
- [Configuration Environnement](../01_GETTING_STARTED/CONFIGURATION.md)
- [Checklist Pre-Production](../01_GETTING_STARTED/CHECKLIST.md)

### 02 - Architecture
**Comprendre le systeme**
- [Architecture Globale](../02_ARCHITECTURE/OVERVIEW.md)
- [Modele de Donnees Firestore](../02_ARCHITECTURE/FIRESTORE_MODEL.md)
- [Stack Technique](../02_ARCHITECTURE/STACK.md)

### 03 - Frontend (sos/src)
**Application React principale**
- [Structure du Code](../03_FRONTEND/STRUCTURE.md)
- [Composants](../03_FRONTEND/COMPONENTS.md)
- [Systeme Multilingue](../03_FRONTEND/I18N.md)

### 04 - Backend (Cloud Functions)
**Firebase Cloud Functions**
- [Structure des Functions](../04_BACKEND/STRUCTURE.md)
- [API Endpoints](../04_BACKEND/API.md)
- [Triggers et Scheduled](../04_BACKEND/TRIGGERS.md)

### 05 - Systeme de Paiement
**Stripe, PayPal, Transfers**
- [Architecture Paiements](../05_PAYMENTS/OVERVIEW.md)
- [Workflow Complet](../05_PAYMENTS/WORKFLOW.md)
- [Configuration Stripe/PayPal](../05_PAYMENTS/CONFIGURATION.md)

### 06 - Systeme d'Affiliation
**Programme de parrainage**
- [Cahier des Charges](../06_AFFILIATION/CDC.md)
- [Implementation Backend](../06_AFFILIATION/BACKEND.md)
- [Implementation Frontend](../06_AFFILIATION/FRONTEND.md)
- [Integration Wise](../06_AFFILIATION/WISE.md)

### 07 - Securite
**Audit et bonnes pratiques**
- [Regles Firestore](../07_SECURITY/FIRESTORE_RULES.md)
- [Checklist Securite](../07_SECURITY/CHECKLIST.md)
- [Audit Complet](../07_SECURITY/AUDIT.md)

### 08 - Operations
**Backup, DR, Monitoring**
- [Systeme de Backup](../08_OPERATIONS/BACKUP.md)
- [Disaster Recovery](../08_OPERATIONS/DISASTER_RECOVERY.md)
- [Monitoring](../08_OPERATIONS/MONITORING.md)

### 09 - Integrations
**Services tiers**
- [Twilio (Appels)](../09_INTEGRATIONS/TWILIO.md)
- [Stripe Connect](../09_INTEGRATIONS/STRIPE.md)
- [PayPal](../09_INTEGRATIONS/PAYPAL.md)
- [Wise (Virements)](../09_INTEGRATIONS/WISE.md)

### 10 - Rapports d'Audit
**Analyses et recommandations**
- [Audit Global 2026](../10_AUDITS/AUDIT_GLOBAL_2026.md)
- [Audit Affiliation](../10_AUDITS/AUDIT_AFFILIATION.md)
- [Audit Fonctionnel](../10_AUDITS/AUDIT_FONCTIONNEL.md)

### 11 - Archives
**Documentation obsolete (reference)**
- [Fichiers Archives](../11_ARCHIVES/)

---

## Stack Technique

### Frontend (SOS Expat)
| Technologie | Version |
|-------------|---------|
| React | 18.3 |
| TypeScript | 5.x |
| Vite | 5.4 |
| Tailwind CSS | 3.4 |
| React Router | 6.30 |

### Frontend (Outil IA)
| Technologie | Version |
|-------------|---------|
| React | 18.3 |
| TypeScript | 5.x |
| Radix UI / shadcn | Latest |
| React Query | 5.59 |

### Backend
| Service | Usage |
|---------|-------|
| Firebase Firestore | Base de donnees |
| Firebase Auth | Authentification |
| Firebase Storage | Fichiers |
| Cloud Functions | API Backend |

### Services Tiers
| Service | Usage |
|---------|-------|
| Stripe Connect | Paiements |
| PayPal | Paiements alternatif |
| Twilio | Appels telephoniques |
| Wise | Virements internationaux |
| SendGrid | Emails transactionnels |
| OpenAI/Claude | Assistant IA |

---

## Contacts et Support

### Liens Utiles
- Firebase Console: https://console.firebase.google.com
- Google Cloud Console: https://console.cloud.google.com
- Stripe Dashboard: https://dashboard.stripe.com
- Twilio Console: https://console.twilio.com

### Projet Firebase
- Project ID: `sos-urgently-ac307`
- Region: `europe-west1`

---

## Changelog Documentation

| Date | Version | Changements |
|------|---------|-------------|
| 27/01/2026 | 2.0.0 | Reorganisation complete, consolidation |
| 24/01/2026 | 1.0.0 | Documentation initiale |
