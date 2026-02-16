# Analyse Complète des Dépendances - SOS Expat Project

**Date**: 14 février 2026  
**Dernière mise à jour**: 2026-02-14

## Résumé Exécutif

### Structure du Projet
- **Frontend (Vite + React)**: sos/ (109 dépendances)
- **Backend (Firebase Functions)**: sos/firebase/functions/ (17 dépendances)
- **Architecture**: Monorepo avec dépendances partagées

### État Général
- Node.js: Compatibilité correcte (20.x frontend, 22 functions)
- React: 18.3.1 stable et supporté
- 47+ mises à jour disponibles (patches/minors)
- Stripe/Twilio: Gelés intentionnellement

---

## Dépendances Critiques

### 1. Firebase Ecosystem

#### Frontend: firebase@12.3.0
- Spécifiée: ^12.3.0
- Installée: 12.7.0
- Dernière: 12.9.0
- Statut: À jour minor
- Recommandation: Upgrade à 12.9.0 (safe)

#### Backend: firebase-admin@12.7.0, firebase-functions@7.0.5
- firebase-admin: 12.7.0 → 13.6.1 (majeure)
- firebase-functions: 7.0.5 → 8.10.0 (majeure)
- Statut: Majeure obsolète
- Risque: MOYEN - Planifier upgrade Q2
- Raison: Breaking changes, nécessite tests complets

### 2. React & JSX

- react: 18.3.1 (stable LTS)
- Dernière: 19.2.4 (majeure disponible)
- Recommandation: Rester sur 18 jusqu'à Q3 2026
- Raison: Hooks API changes majeurs

### 3. TypeScript

- typescript: 5.9.2
- Statut: À jour
- Important: Utiliser --skipLibCheck pour build

### 4. Téléphonie: libphonenumber-js

- Installée: 1.12.33
- Dernière: 1.12.36
- Statut: À jour patch
- Recommandation: Upgrade safe

### 5. Stripe Integration - GELÉ

- @stripe/stripe-js: 7.9.0 (dernière: 8.7.0)
- @stripe/react-stripe-js: 3.10.0 (dernière: 5.6.0)
- stripe (backend): 14.25.0 (dernière: 20.3.1)
- Statut: GELÉ intentionnellement
- Raison: Breaking changes à chaque version
- Coût d'upgrade: ~2 semaines (audit + tests)
- Planifié: Q2 2026

### 6. Twilio Integration - GELÉ

- twilio: 4.23.0
- Dernière: 5.12.1 (majeure)
- Statut: GELÉ intentionnellement
- Raison: Conference API, webhook parsing, DTMF affectés
- Risque: Production workflows
- Planifié: Q3 2026

---

## État des Mises à Jour

### Frontend (47 outdated)

**Mises à jour critiques:**
| Package | Current | Latest | Risque |
|---------|---------|--------|--------|
| react | 18.3.1 | 19.2.4 | TRÈS HAUT |
| @stripe/react-stripe-js | 3.10.0 | 5.6.0 | TRÈS HAUT |
| react-intl | 7.1.14 | 8.1.3 | HAUT |
| vite | 5.4.21 | 7.3.1 | HAUT |
| tailwindcss | 3.4.19 | 4.1.18 | HAUT |

**Mises à jour recommandées (safe):**
| Package | Current | Latest | Action |
|---------|---------|--------|--------|
| firebase | 12.7.0 | 12.9.0 | À faire |
| @sentry/react | 10.34.0 | 10.38.0 | URGENT |
| libphonenumber-js | 1.12.33 | 1.12.36 | À faire |

### Backend (7+ outdated)

**Mises à jour bloquées:**
| Package | Current | Latest | Raison |
|---------|---------|--------|--------|
| firebase-admin | 12.7.0 | 13.6.1 | Firestore refactor |
| firebase-functions | 7.0.5 | 8.10.0 | API breaking changes |
| stripe | 14.25.0 | 20.3.1 | Webhooks |
| twilio | 4.23.0 | 5.12.1 | Appels |

---

## Recommandations

### À Faire Cette Semaine (IMMÉDIAT)
```bash
npm update @sentry/react @sentry/node
npm run build
npm run typecheck
npm run test:run
```

### À Faire Prochainement (Février-Mars)
```bash
npm update firebase
npm update libphonenumber-js puppeteer
npm run test:e2e
firebase deploy --only functions
```

### À Planifier en Sprint Dédié (Q1 2026)

Sprint Firebase Upgrade (3-4 jours):
```bash
cd sos/firebase/functions
npm install firebase-admin@13 firebase-functions@8
npm run test
firebase deploy --only functions
```

### NE PAS TOUCHER (Production-Critical)
- stripe@14.25.0 (paiements)
- twilio@4.23.0 (appels)
- @stripe/react-stripe-js@3.10.0
- @stripe/stripe-js@7.9.0

---

## Synthèse

**Santé Globale: Modérée-Bonne**

Points Forts:
- Core React stable
- TypeScript à jour
- Pas de vulnérabilités critiques

Points d'Attention:
- Stripe/Twilio gelés volontairement
- Firebase major version à venir
- Plusieurs majeures disponibles

Actions Prioritaires:
1. Sentry patches (cette semaine)
2. Firebase minor (février)
3. Firebase major (Q2)
4. Stripe/Twilio (Q2/Q3 - audit complet)

---

**Généré**: 2026-02-14 | **Révision**: 1.0
