# Architecture Globale - SOS Expat

> **Version**: 2.0
> **Date**: 27 Janvier 2026

---

## Vue d'Ensemble

SOS Expat est compose de **deux applications distinctes** mais interconnectees:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS/UTILISATEURS                      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│       SOS EXPAT (sos/)       │    │  OUTIL IA SOS (Outil-sos-)   │
│   sos-expat.com              │    │  outil-sos-expat.com         │
│                              │    │                              │
│  • Recherche de providers    │    │  • Console Admin             │
│  • Reservation d'appels      │    │  • Dashboard Prestataires    │
│  • Paiements                 │    │  • Assistant IA (GPT/Claude) │
│  • Multi-langue (9 langues)  │    │  • Analytics                 │
└──────────────────────────────┘    └──────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │      FIREBASE BACKEND         │
                    │                               │
                    │  • Firestore (BDD)            │
                    │  • Authentication             │
                    │  • Storage (Fichiers)         │
                    │  • Cloud Functions            │
                    └───────────────────────────────┘
                                    │
        ┌───────────────┬───────────┴───────────┬───────────────┐
        ▼               ▼                       ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   STRIPE      │ │   PAYPAL      │ │   TWILIO      │ │   OPENAI      │
│   (Paiements) │ │   (Paiements) │ │   (Appels)    │ │   (IA)        │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

---

## Structure des Dossiers

```
sos-expat-project/
│
├── sos/                          # Application principale SOS Expat
│   ├── src/                      # Code source React (622 fichiers)
│   │   ├── pages/                # 40+ pages
│   │   ├── components/           # 100+ composants
│   │   ├── hooks/                # 30+ hooks
│   │   ├── contexts/             # Auth, App, PayPal, Wizard
│   │   ├── services/             # 25+ services
│   │   ├── types/                # Types TypeScript
│   │   └── multilingual-system/  # Systeme i18n avance
│   │
│   ├── firebase/                 # Firebase Backend
│   │   └── functions/src/        # 46 modules Cloud Functions
│   │       ├── callables/        # Fonctions appelables
│   │       ├── triggers/         # Triggers Firestore/Auth
│   │       ├── scheduled/        # Taches planifiees
│   │       ├── Webhooks/         # Stripe, PayPal, Twilio
│   │       └── [modules metier]  # accounting, affiliate, etc.
│   │
│   ├── firestore.rules           # Regles securite (1100+ lignes)
│   ├── storage.rules             # Regles Storage
│   └── firestore.indexes.json    # Index Firestore
│
├── Outil-sos-expat/              # Console Admin + Dashboard IA
│   ├── src/                      # Code React (142 fichiers)
│   │   ├── admin/                # Pages admin
│   │   ├── dashboard/            # Dashboard prestataires
│   │   └── components/           # Composants partages
│   │
│   └── functions/src/            # Functions specifiques (59 fichiers)
│       ├── ai/                   # Module IA hybride
│       │   ├── providers/        # Claude, GPT-4o, Perplexity
│       │   └── handlers/         # bookingCreated, chat, etc.
│       └── services/             # Cache Redis, Monitoring
│
├── DOCUMENTATION/                # Documentation reorganisee
└── docs/                         # Guides supplementaires
```

---

## Types d'Utilisateurs

```typescript
type UserRole = 'client' | 'lawyer' | 'expat' | 'admin';
```

| Role | Description | Fonctionnalites |
|------|-------------|-----------------|
| **client** | Personne cherchant de l'aide | Recherche, reservation, paiement |
| **lawyer** | Avocat professionnel | Profil, appels, revenus, IA |
| **expat** | Expatrie expert | Profil, appels, revenus, IA |
| **admin** | Administrateur | Console admin complete |

---

## Workflow Principal: Reservation d'un Appel

```
1. Client visite la page d'accueil
                    │
2. Utilise le wizard de recherche (SOSCall.tsx)
   - Selectionne le pays
   - Selectionne le type de service
   - Selectionne la langue
                    │
3. Affichage des prestataires disponibles
                    │
4. Client selectionne un prestataire
                    │
5. Redirection vers CallCheckout.tsx
   - Choix de la duree
   - Saisie des informations
   - Choix du paiement (Stripe/PayPal)
                    │
6. Paiement securise
                    │
7. Creation de l'appel dans Firestore
   - Status: 'scheduled' ou 'immediate'
                    │
8. Cloud Function programme l'appel via Twilio
                    │
9. Appel telephonique initie
                    │
10. A la fin: rating et review
```

---

## Authentification SSO (Outil IA)

L'Outil IA utilise un systeme SSO avec custom tokens:

```
1. Utilisateur connecte sur sos-expat.com
                    │
2. Clique sur "Acceder a l'assistant IA"
                    │
3. Cloud Function genere un Custom Token
                    │
4. Redirection vers outil-sos-expat.com/auth?token=XXX
                    │
5. signInWithCustomToken(auth, token)
                    │
6. Utilisateur authentifie sur l'Outil
```

---

## Langues Supportees

| Code | Langue | Locales |
|------|--------|---------|
| `fr` | Francais | fr-fr, fr-be, fr-ch, fr-ca, fr-ma |
| `en` | Anglais | en-us, en-gb, en-au, en-ca |
| `es` | Espagnol | es-es, es-mx, es-ar |
| `de` | Allemand | de-de, de-at, de-ch |
| `pt` | Portugais | pt-pt, pt-br |
| `ru` | Russe | ru-ru |
| `zh` | Chinois | zh-cn, zh-tw |
| `ar` | Arabe | ar-sa, ar-ae |
| `hi` | Hindi | hi-in |

---

## Stack Technique Detaille

### Frontend SOS Expat

| Categorie | Technologies |
|-----------|--------------|
| Framework | React 18.3, TypeScript, Vite 5.4 |
| Styling | Tailwind CSS 3.4, MUI 7.2 |
| Routing | React Router DOM 6.30 |
| State | React Context, React Hook Form |
| i18n | react-intl |
| SEO | react-helmet-async |
| PWA | Service Workers, Workbox |

### Frontend Outil IA

| Categorie | Technologies |
|-----------|--------------|
| Framework | React 18.3, TypeScript, Vite 5.4 |
| Styling | Tailwind CSS 3.4, Radix UI, shadcn/ui |
| State | React Query (TanStack) 5.59 |
| i18n | i18next, react-i18next |
| Monitoring | Sentry |

### Backend (Cloud Functions)

| Categorie | Technologies |
|-----------|--------------|
| Runtime | Node.js 20 |
| Framework | Firebase Functions 2nd gen |
| Validation | Zod |
| Cache | Redis (Upstash + Memorystore) |
| Error Tracking | Sentry |

---

## Voir Aussi

- [Modele Firestore](./FIRESTORE_MODEL.md)
- [Stack Technique](./STACK.md)
- [Frontend](../03_FRONTEND/STRUCTURE.md)
- [Backend](../04_BACKEND/STRUCTURE.md)
