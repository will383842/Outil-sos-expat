# DOCUMENTATION TECHNIQUE COMPLETE - SOS EXPAT & OUTIL IA SOS

> **Version**: 1.0.0
> **Date**: 24 Janvier 2026
> **Objectif**: Documentation exhaustive pour tout developpeur souhaitant comprendre l'architecture, les fonctionnalites et l'organisation des plateformes SOS Expat.

---

## TABLE DES MATIERES

1. [VUE D'ENSEMBLE DU PROJET](#1-vue-densemble-du-projet)
2. [ARCHITECTURE GLOBALE](#2-architecture-globale)
3. [APPLICATION SOS EXPAT (sos/)](#3-application-sos-expat-sos)
4. [APPLICATION OUTIL IA SOS (Outil-sos-expat/)](#4-application-outil-ia-sos-outil-sos-expat)
5. [RELATION ENTRE LES APPLICATIONS](#5-relation-entre-les-applications)
6. [BASE DE DONNEES FIREBASE](#6-base-de-donnees-firebase)
7. [FIREBASE CLOUD FUNCTIONS](#7-firebase-cloud-functions)
8. [SYSTEME DE PAIEMENT](#8-systeme-de-paiement)
9. [SYSTEME D'AUTHENTIFICATION](#9-systeme-dauthentification)
10. [INTERNATIONALISATION (i18n)](#10-internationalisation-i18n)
11. [SYSTEME DE NOTIFICATIONS](#11-systeme-de-notifications)
12. [FONCTIONNALITES DETAILLEES](#12-fonctionnalites-detaillees)
13. [API ET ENDPOINTS](#13-api-et-endpoints)
14. [COMPOSANTS UI](#14-composants-ui)
15. [DEPLOIEMENT](#15-deploiement)
16. [GUIDES DE DEVELOPPEMENT](#16-guides-de-developpement)

---

## 1. VUE D'ENSEMBLE DU PROJET

### 1.1 Description du Projet

**SOS Expat** est une plateforme web destinee a mettre en relation des **expatries**, **avocats** et **clients** pour une aide juridique, administrative ou humaine a distance, par appel telephonique ou video.

Le projet se compose de **deux applications distinctes** mais interconnectees:

| Application | Nom Technique | Description |
|-------------|---------------|-------------|
| **SOS Expat** | `sos/` | Plateforme principale client-facing - permet aux clients de trouver et contacter des avocats/expatries experts |
| **Outil IA SOS** | `Outil-sos-expat/` | Console d'administration et dashboard prestataires avec assistant IA integre |

### 1.2 Probleme Resolu

- **Expatries/Voyageurs**: Besoin d'aide juridique ou administrative rapide dans un pays etranger
- **Avocats/Experts**: Possibilite d'offrir leurs services a l'international
- **Urgences**: Consultation rapide (< 5 minutes) avec un expert parlant la meme langue

### 1.3 Proposition de Valeur

- Acces a un avocat ou expert local en **moins de 5 minutes**
- Couverture de **197 pays**
- Support de **9 langues** (FR, EN, ES, DE, RU, PT, ZH, AR, HI)
- Paiement securise via **Stripe** et **PayPal**
- **Assistant IA** pour les prestataires (ChatGPT integre)

---

## 2. ARCHITECTURE GLOBALE

### 2.1 Structure des Dossiers

```
sos-expat-project/
├── sos/                          # Application principale SOS Expat
│   ├── src/                      # Code source React
│   ├── firebase/                 # Firebase Functions
│   ├── public/                   # Assets statiques
│   ├── cloudflare-worker/        # Worker Cloudflare
│   └── dist/                     # Build de production
│
├── Outil-sos-expat/              # Console Admin + Dashboard Prestataires
│   ├── src/                      # Code source React
│   ├── functions/                # Firebase Functions specifiques
│   └── dist/                     # Build de production
│
├── All_Explains/                 # Documentation
├── docs/                         # Documentation supplementaire
├── scripts/                      # Scripts utilitaires
└── package.json                  # Dependances racine (Firebase Admin)
```

### 2.2 Stack Technique

#### Application SOS Expat (`sos/`)

| Categorie | Technologies |
|-----------|--------------|
| **Frontend** | React 18.3, TypeScript, Vite 5.4 |
| **Styling** | Tailwind CSS 3.4, MUI 7.2, Emotion |
| **Routing** | React Router DOM 6.30 |
| **State** | React Context, React Hook Form |
| **Backend** | Firebase (Firestore, Auth, Storage, Functions) |
| **Paiements** | Stripe Connect, PayPal |
| **Communication** | Twilio (appels), SendGrid (emails) |
| **i18n** | react-intl |
| **SEO** | react-helmet-async, react-snap |
| **Analytics** | Google Analytics 4, Meta Pixel |
| **PWA** | Service Workers, Workbox |

#### Application Outil IA SOS (`Outil-sos-expat/`)

| Categorie | Technologies |
|-----------|--------------|
| **Frontend** | React 18.3, TypeScript, Vite 5.4 |
| **Styling** | Tailwind CSS 3.4, Radix UI, shadcn/ui |
| **Routing** | React Router DOM 6.28 |
| **State** | React Query (TanStack Query) 5.59 |
| **Backend** | Firebase (Firestore, Auth, Functions) |
| **i18n** | i18next, react-i18next |
| **IA** | OpenAI GPT Integration |
| **PWA** | vite-plugin-pwa, Workbox |
| **Monitoring** | Sentry |

### 2.3 Diagramme d'Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS/UTILISATEURS                       │
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
│  • Paiements                 │    │  • Assistant IA (ChatGPT)    │
│  • Dashboard utilisateur     │    │  • Analytics                 │
│  • Multi-langue (9 langues)  │    │  • Gestion des conversations │
└──────────────────────────────┘    └──────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │      FIREBASE BACKEND         │
                    │                               │
                    │  • Firestore (Base de donnees)│
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

## 3. APPLICATION SOS EXPAT (sos/)

### 3.1 Vue d'Ensemble

L'application principale est une **Single Page Application (SPA)** React qui permet:
- Aux **clients** de trouver et contacter des prestataires
- Aux **prestataires** (avocats/expatries) de gerer leur profil et appels
- Aux **administrateurs** de gerer la plateforme

### 3.2 Structure du Code Source (`sos/src/`)

```
sos/src/
├── api/                # Configuration des appels API
├── components/         # Composants React reutilisables
│   ├── admin/          # Composants d'administration
│   ├── auth/           # Authentification (Login, Register, ProtectedRoute)
│   ├── booking/        # Reservation d'appels
│   ├── call/           # Interface d'appel
│   ├── common/         # Composants partages (Button, Modal, Spinner...)
│   ├── dashboard/      # Dashboard utilisateur
│   ├── feedback/       # Systeme de feedback
│   ├── forms/          # Formulaires reutilisables
│   ├── home/           # Page d'accueil
│   ├── layout/         # Header, Footer, Navigation
│   ├── map/            # Carte interactive (Leaflet)
│   ├── payment/        # Composants de paiement
│   ├── profile/        # Profil utilisateur
│   ├── providers/      # Listing et profils des prestataires
│   ├── pwa/            # PWA Provider
│   ├── search/         # Recherche et filtres
│   ├── subscription/   # Abonnements
│   └── wizard/         # Assistant de reservation step-by-step
│
├── config/             # Configuration (Firebase, Stripe, etc.)
├── constants/          # Constantes de l'application
├── contexts/           # React Contexts
│   ├── AppContext.tsx          # Contexte global de l'app
│   ├── AuthContext.tsx         # Authentification
│   ├── PayPalContext.tsx       # PayPal
│   └── WizardContext.tsx       # Wizard de reservation
│
├── data/               # Donnees statiques (pays, langues, categories)
├── features/           # Fonctionnalites isolees
├── firebase/           # Configuration Firebase client
├── helper/             # Fichiers de traduction JSON
├── hooks/              # Custom React Hooks
├── i18n/               # Configuration i18n
├── lib/                # Bibliotheques et utilitaires
├── locales/            # Fichiers de localisation
├── multilingual-system/# Systeme multilingue avance
├── notifications/      # Systeme de notifications
├── pages/              # Pages de l'application (voir 3.3)
├── services/           # Services metier
├── styles/             # Styles globaux
├── types/              # Types TypeScript
├── utils/              # Fonctions utilitaires
└── validation/         # Schemas de validation (Zod)
```

### 3.3 Pages de l'Application

#### Pages Publiques

| Page | Route | Fichier | Description |
|------|-------|---------|-------------|
| **Accueil** | `/` | `Home.tsx` | Landing page avec recherche de prestataires |
| **Connexion** | `/login` | `Login.tsx` | Formulaire de connexion |
| **Inscription** | `/register` | `Register.tsx` | Choix du type d'inscription |
| **Inscription Client** | `/register/client` | `RegisterClient.tsx` | Formulaire client |
| **Inscription Avocat** | `/register/lawyer` | `RegisterLawyer.tsx` | Formulaire avocat |
| **Inscription Expatrie** | `/register/expat` | `RegisterExpat.tsx` | Formulaire expatrie |
| **Tarifs** | `/pricing`, `/tarifs` | `Pricing.tsx` | Grille tarifaire |
| **FAQ** | `/faq` | `FAQ.tsx` | Questions frequentes |
| **Contact** | `/contact` | `Contact.tsx` | Formulaire de contact |
| **Comment ca marche** | `/how-it-works` | `HowItWorks.tsx` | Explication du service |
| **Temoignages** | `/testimonials` | `Testimonials.tsx` | Avis clients |
| **Centre d'aide** | `/centre-aide` | `HelpCenter.tsx` | Articles d'aide |
| **CGU Clients** | `/terms-clients` | `TermsClients.tsx` | Conditions clients |
| **CGU Avocats** | `/terms-lawyers` | `TermsLawyers.tsx` | Conditions avocats |
| **CGU Expatries** | `/terms-expats` | `TermsExpats.tsx` | Conditions expatries |
| **Politique Confidentialite** | `/privacy-policy` | `PrivacyPolicy.tsx` | Donnees personnelles |
| **Cookies** | `/cookies` | `Cookies.tsx` | Politique cookies |
| **Profil Prestataire** | `/provider/:id` | `ProviderProfile.tsx` | Profil public d'un prestataire |
| **SOS Appel** | `/sos-appel` | `SOSCall.tsx` | Wizard de reservation d'appel urgent |

#### Pages Protegees (Utilisateur Connecte)

| Page | Route | Fichier | Description |
|------|-------|---------|-------------|
| **Dashboard** | `/dashboard` | `Dashboard.tsx` | Tableau de bord principal |
| **Messages** | `/dashboard/messages` | `DashboardMessages.tsx` | Messagerie interne |
| **Assistant IA** | `/dashboard/ai-assistant` | `AiAssistant/Index.tsx` | Chatbot IA pour prestataires |
| **Abonnement** | `/dashboard/subscription` | `Subscription/Index.tsx` | Gestion abonnement |
| **Plans** | `/dashboard/subscription/plans` | `Subscription/Plans.tsx` | Choix des plans |
| **Conversations** | `/dashboard/conversations` | `Conversations/History.tsx` | Historique IA |
| **Modifier Profil** | `/profile/edit` | `ProfileEdit.tsx` | Edition du profil |
| **Checkout Appel** | `/call-checkout` | `CallCheckout.tsx` | Paiement d'un appel |
| **Demande Reservation** | `/booking-request` | `BookingRequest.tsx` | Formulaire de reservation |
| **Paiement Reussi** | `/payment-success` | `PaymentSuccess.tsx` | Confirmation de paiement |
| **KYC Return** | `/dashboard/kyc` | `KycReturn.tsx` | Retour onboarding Stripe |

#### Pages Admin (`/admin/*`)

| Page | Route | Description |
|------|-------|-------------|
| **Dashboard Admin** | `/admin/dashboard` | Vue d'ensemble |
| **Utilisateurs** | `/admin/users` | Gestion des utilisateurs |
| **Prestataires** | `/admin/providers` | Gestion des prestataires |
| **Appels** | `/admin/calls` | Historique des appels |
| **Paiements** | `/admin/payments` | Transactions financieres |
| **Litiges** | `/admin/disputes` | Gestion des litiges |
| **Marketing** | `/admin/marketing/*` | Outils marketing |
| **Configuration** | `/admin/config/*` | Parametres systeme |
| **SEO** | `/admin/seo` | Outils SEO |
| **Analytics** | `/admin/analytics` | Statistiques |

### 3.4 Types d'Utilisateurs

```typescript
type UserRole = 'client' | 'lawyer' | 'expat' | 'admin';
```

| Role | Description | Fonctionnalites |
|------|-------------|-----------------|
| **client** | Personne cherchant de l'aide | Recherche, reservation, paiement, reviews |
| **lawyer** | Avocat professionnel | Profil, appels, revenus, assistant IA |
| **expat** | Expatrie expert | Profil, appels, revenus, assistant IA |
| **admin** | Administrateur | Acces complet a la console admin |

### 3.5 Workflow Principal: Reservation d'un Appel

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
   - Saisie des informations de contact
   - Choix du mode de paiement (Stripe/PayPal)
                    │
6. Paiement securise
                    │
7. Creation de l'appel dans Firestore
   - Status: 'scheduled' ou 'immediate'
                    │
8. Firebase Function programme l'appel via Twilio
                    │
9. Appel telephonique initie
                    │
10. A la fin: rating et review
```

### 3.6 Composants Cles

#### 3.6.1 WizardContext et Wizard de Reservation

Le wizard guide l'utilisateur a travers les etapes de reservation:

```typescript
// contexts/WizardContext.tsx
interface WizardState {
  step: number;
  country: string | null;
  language: string | null;
  serviceType: string | null;
  provider: Provider | null;
  duration: number;
  urgency: 'immediate' | 'scheduled';
  scheduledDate: Date | null;
}
```

**Etapes du Wizard:**
1. Selection du pays
2. Selection de la langue
3. Selection du type de service (juridique, administratif, etc.)
4. Affichage et selection du prestataire
5. Configuration de l'appel
6. Paiement

#### 3.6.2 ProtectedRoute

Protege les routes necessitant une authentification:

```typescript
// components/auth/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole | UserRole[];
}
```

#### 3.6.3 Systeme Multilingue

Le systeme multilingue supporte des URLs traduites:

```typescript
// multilingual-system/index.ts
type RouteKey =
  | 'login'
  | 'register'
  | 'pricing'
  | 'dashboard'
  | 'help-center'
  // ... etc.

// Exemple: /fr-fr/tarifs, /en-us/pricing, /es-es/precios
```

**Langues Supportees:**

| Code | Langue | Locale |
|------|--------|--------|
| `fr` | Francais | `fr-fr`, `fr-be`, `fr-ch`, `fr-ca`, `fr-ma` |
| `en` | Anglais | `en-us`, `en-gb`, `en-au`, `en-ca` |
| `es` | Espagnol | `es-es`, `es-mx`, `es-ar` |
| `de` | Allemand | `de-de`, `de-at`, `de-ch` |
| `pt` | Portugais | `pt-pt`, `pt-br` |
| `ru` | Russe | `ru-ru` |
| `zh` | Chinois | `zh-cn`, `zh-tw` |
| `ar` | Arabe | `ar-sa`, `ar-ae` |
| `hi` | Hindi | `hi-in` |

### 3.7 Custom Hooks (`sos/src/hooks/`)

| Hook | Description |
|------|-------------|
| `useAuth()` | Acces au contexte d'authentification |
| `useDeviceDetection()` | Detection mobile/desktop |
| `useProviders()` | Liste et filtrage des prestataires |
| `useCall()` | Gestion d'un appel en cours |
| `usePayment()` | Logique de paiement |
| `useMessages()` | Messagerie |
| `useNotifications()` | Notifications utilisateur |
| `useOnlineStatus()` | Statut en ligne des prestataires |
| `useSearch()` | Recherche avec filtres |
| `useTranslation()` | Traductions |

---

## 4. APPLICATION OUTIL IA SOS (Outil-sos-expat/)

### 4.1 Vue d'Ensemble

L'**Outil IA SOS** est une application separee qui sert de:
- **Console d'Administration** pour les administrateurs SOS Expat
- **Dashboard Prestataire** pour les avocats et expatries abonnes
- **Assistant IA** integrant ChatGPT pour aider les prestataires

### 4.2 Points d'Entree

```
Routes de l'application:

/auth          → Page SSO (recoit token depuis sos-expat.com)
/auth?token=x  → Connexion automatique avec Custom Token
/login         → Page de connexion directe (tests/admins)
/admin/*       → Console Admin (reservee aux administrateurs)
/dashboard/*   → Espace Prestataire (pour les prestataires abonnes)
/*             → Redirige vers /auth
```

### 4.3 Structure du Code Source (`Outil-sos-expat/src/`)

```
Outil-sos-expat/src/
├── admin/                # Console Administration
│   ├── AppAdmin.tsx      # Point d'entree admin
│   ├── components/       # Composants admin
│   ├── pages/            # Pages admin
│   └── layouts/          # Layouts admin
│
├── dashboard/            # Dashboard Prestataire
│   ├── AppDashboard.tsx  # Point d'entree dashboard
│   ├── components/       # Composants dashboard
│   └── pages/            # Pages dashboard
│
├── components/           # Composants partages
│   ├── ProtectedRoute.tsx
│   ├── ui/               # Composants UI (shadcn)
│   └── ...
│
├── contexts/             # React Contexts
│   └── UnifiedUserContext.tsx  # Contexte utilisateur unifie
│
├── hooks/                # Custom Hooks
│   └── useSiblingStatusNotifications.ts
│
├── lib/                  # Bibliotheques
│   └── queryClient.ts    # React Query client
│
├── pages/                # Pages racine
│   ├── AuthSSO.tsx       # Page SSO
│   └── Login.tsx         # Page Login
│
├── services/             # Services
│   └── init/             # Services d'initialisation
│       ├── monitoring.ts
│       ├── theme.ts
│       └── pwa.ts
│
├── i18n/                 # Internationalisation
├── data/                 # Donnees statiques
├── types/                # Types TypeScript
└── utils/                # Utilitaires
```

### 4.4 Authentification SSO

L'utilisateur ne peut PAS se connecter directement sur l'Outil IA SOS.
Il doit passer par **sos-expat.com** qui genere un **Custom Token Firebase**:

```
1. Utilisateur connecte sur sos-expat.com
                    │
2. Clique sur "Acceder a l'assistant IA" ou "Console Admin"
                    │
3. Firebase Function genere un Custom Token
                    │
4. Redirection vers outil-sos-expat.com/auth?token=XXX
                    │
5. AuthSSO.tsx recoit le token
                    │
6. signInWithCustomToken(auth, token)
                    │
7. Utilisateur authentifie sur l'Outil
```

### 4.5 Console Admin (`/admin/*`)

Accessible uniquement aux utilisateurs avec `role === 'admin'`.

**Fonctionnalites:**
- Dashboard analytique
- Gestion des prestataires (validation, KYC, suspensions)
- Configuration de l'IA (prompts, limites, parametres)
- Monitoring des conversations IA
- Gestion des abonnements
- Rapports financiers
- Configuration systeme

### 4.6 Dashboard Prestataire (`/dashboard/*`)

Accessible aux prestataires (`role === 'lawyer'` ou `role === 'expat'`) avec un abonnement actif.

**Fonctionnalites:**

| Fonctionnalite | Description |
|----------------|-------------|
| **Assistant IA** | Chat avec GPT pour aide a la redaction, conseils juridiques, recherches |
| **Historique Conversations** | Toutes les conversations IA sauvegardees |
| **Profil** | Modification des informations |
| **Statistiques** | Appels, revenus, evaluations |
| **Notifications** | Alertes et messages systeme |

### 4.7 Integration ChatGPT

L'assistant IA utilise l'API OpenAI:

```typescript
// Configuration typique
interface AIConfig {
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}
```

**Fonctionnalites IA:**
- Aide a la redaction de documents juridiques
- Recherche d'informations par pays
- Traduction de documents
- Resume de conversations
- Suggestions de reponses

---

## 5. RELATION ENTRE LES APPLICATIONS

### 5.1 Vue d'Ensemble

```
┌────────────────────────────────────────────────────────────────────┐
│                         SOS EXPAT (sos/)                          │
│                                                                    │
│  • Clients: recherche, reservation, paiement                      │
│  • Prestataires: profil de base, gestion appels                   │
│  • Dashboard utilisateur standard                                  │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ SSO Token
                              │ (Custom Firebase Token)
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    OUTIL IA SOS (Outil-sos-expat/)                │
│                                                                    │
│  • Console Admin: gestion complete de la plateforme               │
│  • Dashboard Prestataire Avance: assistant IA, analytics          │
│  • Fonctionnalites premium pour abonnes                           │
└────────────────────────────────────────────────────────────────────┘
```

### 5.2 Donnees Partagees

Les deux applications partagent la **meme base de donnees Firebase**:

| Collection | Utilisee par | Description |
|------------|--------------|-------------|
| `users` | Les deux | Profils utilisateurs |
| `providers` | Les deux | Profils publics prestataires |
| `calls` | Les deux | Historique des appels |
| `conversations` | Outil IA | Conversations IA |
| `subscriptions` | Les deux | Abonnements |
| `payments` | Les deux | Transactions |
| `messages` | Les deux | Messages internes |
| `reviews` | Les deux | Avis et evaluations |
| `notifications` | Les deux | Notifications |

### 5.3 Flux Utilisateur: Prestataire

```
1. Prestataire s'inscrit sur sos-expat.com (RegisterLawyer/RegisterExpat)
                    │
2. Complete son profil et passe le KYC (Stripe Connect)
                    │
3. Peut recevoir des appels et gagner des revenus
                    │
4. Souscrit a un abonnement premium
                    │
5. Acces a l'Outil IA SOS avec SSO
                    │
6. Utilise l'assistant IA pour ses consultations
```

### 5.4 Systeme Multi-Dashboard

Pour les prestataires avec plusieurs profils (ex: avocat dans plusieurs pays):

```typescript
// Accessible via /multi-dashboard sur sos-expat.com
// Permet de gerer plusieurs comptes prestataires depuis une seule interface
interface MultiProviderDashboard {
  linkedAccounts: ProviderId[];
  currentAccount: ProviderId;
  switchAccount: (id: ProviderId) => void;
}
```

---

## 6. BASE DE DONNEES FIREBASE

### 6.1 Collections Principales

#### 6.1.1 Collection `users`

```typescript
interface User {
  uid: string;                    // ID Firebase Auth
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone?: string;
  phoneNumber?: string;
  role: 'client' | 'lawyer' | 'expat' | 'admin';
  country?: string;
  currentCountry?: string;
  language: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  emailVerified: boolean;
  photoURL?: string;

  // Pour prestataires
  isProvider: boolean;
  providerProfile?: {
    specialty: string[];
    languages: string[];
    countries: string[];
    bio: string;
    hourlyRate: number;
    currency: string;
    availability: AvailabilitySchedule;
    stripeAccountId?: string;
    kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
    isOnline: boolean;
  };

  // Abonnement
  subscription?: {
    status: 'active' | 'inactive' | 'cancelled';
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    stripeSubscriptionId?: string;
    currentPeriodEnd: Timestamp;
  };
}
```

#### 6.1.2 Collection `providers`

Profils publics des prestataires (pour la recherche et l'affichage):

```typescript
interface Provider {
  id: string;
  userId: string;                 // Reference vers users
  type: 'lawyer' | 'expat';
  slug: string;                   // URL-friendly identifier

  // Informations publiques
  displayName: string;
  firstName: string;
  photoURL: string;
  bio: string;

  // Expertise
  specialty: string[];            // ['visa', 'immobilier', 'fiscal', ...]
  languages: LanguageCode[];      // ['fr', 'en', 'es', ...]
  countries: CountryCode[];       // ['TH', 'FR', 'US', ...]

  // Tarification
  hourlyRate: number;
  currency: 'EUR' | 'USD' | 'GBP';

  // Disponibilite
  isOnline: boolean;
  lastOnline: Timestamp;
  availability: AvailabilitySchedule;

  // Stats
  totalCalls: number;
  totalDuration: number;          // en minutes
  averageRating: number;
  reviewCount: number;

  // Status
  isVerified: boolean;
  isActive: boolean;
  kycStatus: 'pending' | 'verified' | 'rejected';

  // SEO
  seoTitle?: string;
  seoDescription?: string;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 6.1.3 Collection `calls`

```typescript
interface Call {
  id: string;
  clientId: string;
  providerId: string;

  // Type d'appel
  type: 'sos' | 'scheduled' | 'callback';
  urgency: 'immediate' | 'scheduled';

  // Planification
  scheduledAt?: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  duration: number;               // en minutes

  // Status
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'failed' | 'no_show';

  // Communication
  twilioCallSid?: string;
  clientPhone: string;
  providerPhone: string;

  // Paiement
  paymentId: string;
  amount: number;
  currency: string;
  providerEarnings: number;
  platformFee: number;

  // Service
  serviceType: string;
  language: string;
  country: string;

  // Notes
  clientNotes?: string;
  providerNotes?: string;

  // Review
  clientRating?: number;
  clientReview?: string;
  providerRating?: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 6.1.4 Collection `payments`

```typescript
interface Payment {
  id: string;
  userId: string;
  callId?: string;
  subscriptionId?: string;

  // Montants
  amount: number;
  currency: string;
  platformFee: number;
  providerPayout?: number;

  // Methode
  method: 'stripe' | 'paypal';
  stripePaymentIntentId?: string;
  paypalOrderId?: string;

  // Status
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

  // Transfert vers prestataire
  transferStatus?: 'pending' | 'scheduled' | 'completed' | 'failed';
  transferredAt?: Timestamp;

  // Metadata
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 6.1.5 Collection `subscriptions`

```typescript
interface Subscription {
  id: string;
  userId: string;

  // Plan
  plan: 'free' | 'basic' | 'premium' | 'enterprise';

  // Stripe
  stripeSubscriptionId?: string;
  stripeCustomerId: string;
  stripePriceId: string;

  // Periode
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'unpaid';
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;

  // Limites
  aiMessagesLimit: number;
  aiMessagesUsed: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 6.1.6 Collection `conversations` (IA)

```typescript
interface Conversation {
  id: string;
  userId: string;

  // Metadata
  title: string;
  model: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';

  // Messages
  messages: ConversationMessage[];

  // Stats
  totalTokens: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens?: number;
  createdAt: Timestamp;
}
```

#### 6.1.7 Collection `reviews`

```typescript
interface Review {
  id: string;
  callId: string;
  authorId: string;
  targetId: string;

  // Contenu
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;

  // Type
  type: 'client_to_provider' | 'provider_to_client';

  // Moderation
  isApproved: boolean;
  isFlagged: boolean;
  moderatedAt?: Timestamp;

  // Metadata
  language: string;
  country: string;
  serviceType: string;
  createdAt: Timestamp;
}
```

### 6.2 Index Firestore Recommandes

```javascript
// Index composites pour les requetes frequentes

// Recherche de prestataires
providers: [isActive, isOnline, countries, languages]
providers: [type, countries, isActive]
providers: [specialty, languages, isOnline]

// Appels utilisateur
calls: [clientId, createdAt]
calls: [providerId, status, scheduledAt]

// Paiements
payments: [userId, createdAt]
payments: [status, transferStatus]

// Reviews
reviews: [targetId, isApproved, createdAt]
```

---

## 7. FIREBASE CLOUD FUNCTIONS

### 7.1 Vue d'Ensemble

Les Cloud Functions sont situees dans `sos/firebase/functions/src/`.
Elles gerent la logique metier backend.

### 7.2 Structure des Functions

```
sos/firebase/functions/src/
├── index.ts                      # Point d'entree - exporte toutes les functions
│
├── accounting/                   # Comptabilite et rapports financiers
├── admin/                        # Functions admin
├── adminApi.ts                   # API admin
├── agents/                       # Agents automatises
├── ai/                           # Integration OpenAI
├── analytics/                    # Analytics et tracking
├── auth/                         # Authentification et SSO
├── callables/                    # Callable functions
├── callScheduler.ts              # Planification des appels
├── config/                       # Configuration
├── contact/                      # Formulaire de contact
├── content/                      # Gestion du contenu
├── createPaymentIntent.ts        # Creation d'intention de paiement Stripe
├── createStripeAccount.ts        # Creation compte Stripe Connect
├── DisputeManager.ts             # Gestion des litiges
├── emailMarketing/               # Marketing email
├── feedback/                     # Systeme de feedback
├── gdpr/                         # Conformite RGPD
├── googleAdsConversionsApi.ts    # Tracking Google Ads
├── helpCenter/                   # Articles centre d'aide
├── KYCReminderManager.ts         # Rappels KYC
├── lib/                          # Bibliotheques partagees
├── messaging/                    # Messagerie
├── metaConversionsApi.ts         # Tracking Meta/Facebook
├── migrations/                   # Migrations de donnees
├── monitoring/                   # Monitoring et alertes
├── multiDashboard/               # Multi-dashboard
├── notificationPipeline/         # Pipeline de notifications
├── notifications/                # Envoi de notifications
├── paypal/                       # Integration PayPal
├── PayPalManager.ts              # Gestion PayPal
├── PendingTransferProcessor.ts   # Traitement des transferts
├── ProviderEarningsService.ts    # Calcul des revenus prestataires
├── scheduled/                    # Taches planifiees (cron)
├── securityAlerts/               # Alertes de securite
├── seeds/                        # Donnees de seed
├── seo/                          # Fonctions SEO
├── services/                     # Services metier
├── sitemap/                      # Generation sitemap
├── StripeManager.ts              # Gestion Stripe complete
├── subscription/                 # Gestion des abonnements
├── tax/                          # Calculs fiscaux
├── tracking/                     # Tracking evenements
├── translation/                  # Services de traduction
├── triggers/                     # Triggers Firestore
├── TwilioCallManager.ts          # Gestion des appels Twilio
├── UnclaimedFundsManager.ts      # Fonds non reclames
├── utils/                        # Utilitaires
└── Webhooks/                     # Webhooks (Stripe, PayPal, Twilio)
```

### 7.3 Functions Principales

#### 7.3.1 Gestion des Appels

| Function | Type | Description |
|----------|------|-------------|
| `createAndScheduleCall` | Callable | Cree et planifie un appel |
| `initiateCall` | HTTP | Lance un appel Twilio |
| `handleCallStatus` | Webhook | Gere les callbacks Twilio |
| `processScheduledCalls` | Scheduled | Verifie les appels planifies |
| `sendCallReminder` | Scheduled | Envoie rappels avant appel |

#### 7.3.2 Gestion des Paiements

| Function | Type | Description |
|----------|------|-------------|
| `createPaymentIntent` | Callable | Cree une intention Stripe |
| `stripeWebhook` | Webhook | Recoit les evenements Stripe |
| `processPayPalOrder` | Callable | Traite une commande PayPal |
| `paypalWebhook` | Webhook | Recoit les evenements PayPal |
| `processScheduledTransfers` | Scheduled | Execute les transferts vers prestataires |
| `calculateProviderEarnings` | Trigger | Calcule les revenus |

#### 7.3.3 Gestion des Utilisateurs

| Function | Type | Description |
|----------|------|-------------|
| `onUserCreate` | Trigger | A la creation d'un utilisateur |
| `onUserUpdate` | Trigger | A la mise a jour d'un utilisateur |
| `generateCustomToken` | Callable | Genere un token SSO |
| `processKYC` | Callable | Traite les documents KYC |
| `sendKYCReminder` | Scheduled | Rappels KYC |

#### 7.3.4 Abonnements et IA

| Function | Type | Description |
|----------|------|-------------|
| `createSubscription` | Callable | Cree un abonnement |
| `cancelSubscription` | Callable | Annule un abonnement |
| `subscriptionWebhook` | Webhook | Evenements abonnement |
| `processAIMessage` | Callable | Envoie message a OpenAI |
| `checkAIUsage` | Trigger | Verifie limites IA |

#### 7.3.5 Notifications

| Function | Type | Description |
|----------|------|-------------|
| `sendEmail` | Callable | Envoie email via SendGrid |
| `sendPushNotification` | Callable | Notification push |
| `sendSMS` | Callable | SMS via Twilio |
| `processNotificationQueue` | Scheduled | Traite la file de notifications |

#### 7.3.6 Taches Planifiees (Cron)

| Function | Schedule | Description |
|----------|----------|-------------|
| `dailyBackup` | 0 3 * * * | Backup quotidien |
| `cleanupOldSessions` | 0 4 * * * | Nettoyage sessions |
| `generateDailyReports` | 0 6 * * * | Rapports quotidiens |
| `checkStaleProviders` | 0 * * * * | Verifie prestataires inactifs |
| `processScheduledTransfers` | 0 9 * * * | Transferts vers prestataires |
| `updateProviderStats` | 0 0 * * * | Mise a jour stats |

### 7.4 Exemple de Function

```typescript
// createPaymentIntent.ts (simplifie)
import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import { db } from './lib/firebase';

export const createPaymentIntent = functions.https.onCall(
  async (data, context) => {
    // Verification authentification
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { callId, amount, currency, providerId } = data;

    // Validation
    if (!callId || !amount || !providerId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });

    // Recuperation du provider pour Stripe Connect
    const providerDoc = await db.collection('providers').doc(providerId).get();
    const provider = providerDoc.data();

    // Calcul des frais
    const platformFee = Math.round(amount * 0.15); // 15% commission
    const providerAmount = amount - platformFee;

    // Creation du PaymentIntent avec transfert automatique
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        callId,
        userId: context.auth.uid,
        providerId,
      },
      transfer_data: {
        destination: provider?.stripeAccountId,
        amount: providerAmount,
      },
    });

    // Sauvegarde en base
    await db.collection('payments').doc(paymentIntent.id).set({
      stripePaymentIntentId: paymentIntent.id,
      callId,
      userId: context.auth.uid,
      providerId,
      amount,
      currency,
      platformFee,
      providerPayout: providerAmount,
      status: 'pending',
      createdAt: new Date(),
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }
);
```

---

## 8. SYSTEME DE PAIEMENT

### 8.1 Vue d'Ensemble

Le systeme de paiement supporte **deux methodes**:
1. **Stripe** (methode principale) - Cartes bancaires + Stripe Connect
2. **PayPal** (alternative) - Pour les utilisateurs sans carte

### 8.2 Stripe Integration

#### 8.2.1 Architecture Stripe Connect

```
┌─────────────┐         ┌─────────────────┐         ┌───────────────┐
│   CLIENT    │────────▶│  SOS EXPAT      │────────▶│    STRIPE     │
│             │ Paiement │  (Platform)     │ Connect │               │
└─────────────┘         └─────────────────┘         └───────────────┘
                                │                           │
                                │ 85%                       │ 15%
                                ▼                           ▼
                        ┌───────────────┐           ┌───────────────┐
                        │  PRESTATAIRE  │           │   PLATFORM    │
                        │  (Connected)  │           │   (Commission)│
                        └───────────────┘           └───────────────┘
```

#### 8.2.2 Onboarding Prestataire (KYC)

```
1. Prestataire demande a recevoir des paiements
                    │
2. createStripeAccount() cree un compte Connect
                    │
3. getAccountSession() genere un lien d'onboarding
                    │
4. Prestataire complete le KYC sur Stripe
                    │
5. Webhook stripe.account.updated
                    │
6. checkStripeAccountStatus() met a jour kycStatus
```

#### 8.2.3 Flux de Paiement Stripe

```typescript
// Frontend: CallCheckout.tsx
const handleStripePayment = async () => {
  // 1. Creer PaymentIntent via Cloud Function
  const { clientSecret } = await createPaymentIntent({
    callId,
    amount: totalAmount,
    currency: 'eur',
    providerId,
  });

  // 2. Confirmer le paiement avec Stripe Elements
  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    clientSecret,
    confirmParams: {
      return_url: `${window.location.origin}/payment-success`,
    },
  });

  if (error) {
    // Gerer l'erreur
  }
};
```

### 8.3 PayPal Integration

#### 8.3.1 Architecture PayPal

```
┌─────────────┐         ┌─────────────────┐         ┌───────────────┐
│   CLIENT    │────────▶│  SOS EXPAT      │────────▶│    PAYPAL     │
│             │         │                 │         │               │
└─────────────┘         └─────────────────┘         └───────────────┘
                                │
                                │ Payout manuel
                                ▼
                        ┌───────────────┐
                        │  PRESTATAIRE  │
                        │  (PayPal)     │
                        └───────────────┘
```

#### 8.3.2 Flux PayPal

```typescript
// PayPalManager.ts
class PayPalManager {
  async createOrder(callId: string, amount: number): Promise<string>;
  async captureOrder(orderId: string): Promise<PayPalCapture>;
  async processProviderPayout(providerId: string, amount: number): Promise<void>;
  async handleWebhook(event: PayPalWebhookEvent): Promise<void>;
}
```

### 8.4 Transferts vers Prestataires

Les transferts sont **differes** pour gerer les litiges:

```
Paiement Client
       │
       ▼
Fonds bloques (7 jours)
       │
       ▼
processScheduledTransfers() ─── Si pas de litige ───▶ Transfert
       │
       └── Si litige ───▶ En attente de resolution
```

### 8.5 Commission Platform

| Element | Pourcentage |
|---------|-------------|
| Prestataire | 85% |
| Plateforme SOS | 15% |

### 8.6 Gestion des Litiges

```typescript
// DisputeManager.ts
class DisputeManager {
  async createDispute(callId: string, reason: string): Promise<Dispute>;
  async resolveDispute(disputeId: string, resolution: 'refund' | 'reject' | 'partial'): Promise<void>;
  async processRefund(disputeId: string, amount?: number): Promise<void>;
}
```

---

## 9. SYSTEME D'AUTHENTIFICATION

### 9.1 Firebase Authentication

Les deux applications utilisent **Firebase Authentication**:

```typescript
// Methodes supportees
const authMethods = [
  'email/password',     // Principal
  'google',             // OAuth Google
  'phone',              // SMS (pour clients)
  'custom-token',       // SSO entre apps
];
```

### 9.2 Contexte d'Authentification (SOS Expat)

```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;

  // Helpers
  hasRole: (role: UserRole) => boolean;
  isProvider: () => boolean;
  isAdmin: () => boolean;
}
```

### 9.3 SSO entre Applications

```typescript
// Flux SSO: SOS Expat → Outil IA SOS

// 1. Sur SOS Expat: generation du token
const generateSSOToken = httpsCallable(functions, 'generateCustomToken');
const { data } = await generateSSOToken();
const token = data.token;

// 2. Redirection vers Outil IA SOS
window.open(`https://outil-sos-expat.com/auth?token=${token}`, '_blank');

// 3. Sur Outil IA SOS: AuthSSO.tsx
const { token } = useSearchParams();
await signInWithCustomToken(auth, token);
```

### 9.4 Protection des Routes

```typescript
// ProtectedRoute.tsx
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: UserRole | UserRole[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRequiredRole(user, allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
```

### 9.5 Verification Email

Les prestataires doivent verifier leur email avant d'etre actifs:

```typescript
// Workflow
1. Inscription ─▶ Email de verification envoye
2. Clic sur lien ─▶ emailVerified = true
3. Profil active ─▶ isActive = true
```

---

## 10. INTERNATIONALISATION (i18n)

### 10.1 SOS Expat: react-intl

```typescript
// Configuration: src/App.tsx
const messages = {
  fr: frMessages,   // helper/fr.json
  en: enMessages,   // helper/en.json
  es: esMessages,   // helper/es.json
  de: deMessages,   // helper/de.json
  ru: ruMessages,   // helper/ru.json
  pt: ptMessages,   // helper/pt.json
  zh: chMessages,   // helper/ch.json
  hi: hiMessages,   // helper/hi.json
  ar: arMessages,   // helper/ar.json
};

// Usage
import { FormattedMessage, useIntl } from 'react-intl';

// Dans le JSX
<FormattedMessage id="home.title" defaultMessage="Bienvenue" />

// Dans le code
const intl = useIntl();
const text = intl.formatMessage({ id: 'home.title' });
```

### 10.2 Systeme d'URLs Multilingues

```typescript
// multilingual-system/index.ts

// Routes avec slugs traduits
const routeSlugs: Record<RouteKey, Record<LanguageCode, string>> = {
  'pricing': {
    fr: 'tarifs',
    en: 'pricing',
    es: 'precios',
    de: 'preise',
    // ...
  },
  'help-center': {
    fr: 'centre-aide',
    en: 'help-center',
    es: 'centro-ayuda',
    // ...
  },
};

// Resultat:
// /fr-fr/tarifs
// /en-us/pricing
// /es-es/precios
```

### 10.3 Outil IA SOS: i18next

```typescript
// Configuration: src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: frTranslation },
      en: { translation: enTranslation },
    },
    fallbackLng: 'fr',
  });

// Usage
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
const text = t('dashboard.title');
```

### 10.4 Fichiers de Traduction

```
sos/src/helper/
├── fr.json          # Francais
├── en.json          # Anglais
├── es.json          # Espagnol
├── de.json          # Allemand
├── ru.json          # Russe
├── pt.json          # Portugais
├── ch.json          # Chinois
├── hi.json          # Hindi
└── ar.json          # Arabe

sos/src/locales/
├── fr-fr/           # Traductions specifiques France
├── en-us/           # Traductions specifiques US
├── es-es/           # Traductions specifiques Espagne
└── ...
```

---

## 11. SYSTEME DE NOTIFICATIONS

### 11.1 Types de Notifications

| Type | Canal | Declencheur |
|------|-------|-------------|
| **Email** | SendGrid | Inscription, rappels, paiements |
| **Push** | FCM | Nouveaux messages, appels |
| **SMS** | Twilio | Rappels d'appel, OTP |
| **In-App** | Firestore | Toutes les notifications |

### 11.2 Pipeline de Notifications

```typescript
// notificationPipeline/index.ts

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  channels: ('email' | 'push' | 'sms' | 'inapp')[];
  status: 'pending' | 'sent' | 'failed';
  createdAt: Timestamp;
  sentAt?: Timestamp;
}

// Envoi multi-canal
async function sendNotification(notification: Notification) {
  for (const channel of notification.channels) {
    switch (channel) {
      case 'email':
        await sendEmail(notification);
        break;
      case 'push':
        await sendPush(notification);
        break;
      case 'sms':
        await sendSMS(notification);
        break;
      case 'inapp':
        await saveInApp(notification);
        break;
    }
  }
}
```

### 11.3 Templates Email

```typescript
// Templates disponibles
const emailTemplates = {
  'welcome-client': { subject: 'Bienvenue sur SOS Expat!' },
  'welcome-provider': { subject: 'Bienvenue chez SOS Expat!' },
  'call-scheduled': { subject: 'Votre appel est confirme' },
  'call-reminder': { subject: 'Rappel: votre appel dans 15 minutes' },
  'payment-received': { subject: 'Paiement recu' },
  'payout-sent': { subject: 'Virement effectue' },
  'kyc-approved': { subject: 'Votre compte est verifie' },
  'kyc-rejected': { subject: 'Verification incomplete' },
  'review-received': { subject: 'Vous avez recu un avis' },
};
```

---

## 12. FONCTIONNALITES DETAILLEES

### 12.1 Pour les Clients

| Fonctionnalite | Description |
|----------------|-------------|
| **Recherche de Prestataires** | Par pays, langue, specialite |
| **Filtres Avances** | Prix, disponibilite, avis |
| **Profils Detailles** | Bio, specialites, avis, tarifs |
| **Reservation d'Appel** | Immediat ou planifie |
| **Paiement Securise** | Stripe ou PayPal |
| **Historique des Appels** | Dashboard personnel |
| **Messagerie** | Communication avec prestataires |
| **Systeme d'Avis** | Notation et commentaires |
| **Centre d'Aide** | FAQ et articles |
| **Multi-langue** | 9 langues supportees |

### 12.2 Pour les Prestataires

| Fonctionnalite | Description |
|----------------|-------------|
| **Profil Public** | Page personnalisee SEO-friendly |
| **Gestion Disponibilites** | Calendrier et horaires |
| **Statut En Ligne** | Indicateur temps reel |
| **Reception d'Appels** | Via Twilio |
| **Dashboard Revenus** | Statistiques et graphiques |
| **Historique Appels** | Clients, durees, gains |
| **Messagerie** | Communication avec clients |
| **KYC Stripe** | Onboarding pour paiements |
| **Assistant IA** | ChatGPT integre (abonnement) |
| **Conversations IA** | Historique sauvegarde |

### 12.3 Pour les Administrateurs

| Fonctionnalite | Description |
|----------------|-------------|
| **Dashboard Global** | Vue d'ensemble plateforme |
| **Gestion Utilisateurs** | CRUD complet |
| **Validation Prestataires** | Approbation profils |
| **Suivi KYC** | Status et rappels |
| **Gestion Litiges** | Resolution conflits |
| **Rapports Financiers** | Revenus, commissions |
| **Analytics** | GA4 + metriques internes |
| **Configuration IA** | Prompts, limites |
| **Marketing** | Emails, promotions |
| **SEO** | Sitemaps, meta tags |

### 12.4 Assistant IA (Premium)

| Fonctionnalite | Description |
|----------------|-------------|
| **Chat GPT-4** | Conversations illimitees (selon plan) |
| **Aide Redaction** | Documents juridiques |
| **Recherche Infos** | Par pays et sujet |
| **Traduction** | Multi-langue |
| **Resume** | Synthesis de documents |
| **Historique** | Toutes conversations sauvegardees |
| **Export** | PDF des conversations |

### 12.5 Integration IA Detaillee

#### Architecture Multi-Modele

| Provider | Modele | Cas d'usage | Temp | Max Tokens |
|----------|--------|-------------|------|------------|
| **Anthropic** | Claude 3.5 Sonnet | Avocats (expertise juridique) | 0.25 | 4000 |
| **OpenAI** | GPT-4o | Expatries (conseils pratiques) | 0.30 | 4000 |
| **Perplexity** | Sonar Pro | Recherche web (infos factuelles) | 0.20 | 2500 |

#### Configuration IA

```typescript
// Outil-sos-expat/functions/src/ai/core/config.ts
{
  apiTimeout: 25000,      // 25s pour recherches complexes
  maxRetries: 2,          // Avec backoff exponentiel
  maxHistory: 100,        // Messages max par conversation
  summaryThreshold: 80,   // Seuil pour resume automatique
  preserveFirst: 3        // Conserver contexte initial
}
```

#### Quotas IA par Tier

| Tier | Appels/mois | Periode Essai |
|------|-------------|---------------|
| trial | 3 total | 30 jours |
| basic | 50 | - |
| standard | 150 | - |
| pro | 500 | - |
| unlimited | Illimite | - |

#### Hook useAiQuota

```typescript
interface AiQuotaReturn {
  currentUsage: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number;
  canMakeAiCall: boolean;
  isQuotaExhausted: boolean;
  blockReason: string;  // Pour messages i18n
}
```

#### Streaming Chat (SSE)

**Fichier:** `Outil-sos-expat/src/hooks/useStreamingChat.ts`

**Evenements SSE:**
- `start`: Conversation initialisee
- `chunk`: Morceau de texte recu
- `done`: Reponse terminee
- `progress`: Etape de traitement
- `warning`: Avertissement moderation
- `error`: Message d'erreur

**Etapes de progression:**
1. initializing → validating → searching → analyzing → generating → finalizing

#### Authentification SSO IA

**Flux d'acces a l'Outil IA:**

```
1. User clique "Acceder a l'outil IA" dans Dashboard SOS
           │
2. Appel Cloud Function `generateOutilToken`
           │
3. Validations:
   - Utilisateur authentifie
   - Est prestataire (lawyer/expat_aidant)
   - Abonnement actif OU acces force admin
   - Quota non epuise
           │
4. Generation token Firebase signe par projet OUTIL
           │
5. Ouverture: https://ia.sos-expat.com/auth?token=xxx
           │
6. Connexion automatique sur Outil IA
```

#### Configuration Admin IA

**Fichier:** `Outil-sos-expat/src/admin/pages/AIConfig.tsx`

**Controles Admin:**
- Activer/desactiver assistant IA globalement
- Auto-reponse a la creation de booking
- Auto-reponse aux messages utilisateur
- Edition des prompts systeme (avocats/expatries)
- Reset aux prompts par defaut
- Audit log des modifications

#### Prompts Systeme

**Avocat** - Conseiller juridique senior pour:
- Immigration et visas
- Droit du travail international
- Droit de la famille
- Fiscalite des non-residents
- Droit des successions
- Protection consulaire

**Expatrie** - Conseiller pratique pour:
- Logement et relocalisation
- Procedures administratives
- Sante et assurance
- Education
- Vie quotidienne
- Assistance d'urgence

#### Onglets Admin Monitoring IA

1. **IaDashboardTab** - Statistiques generales
2. **IaQuotasTab** - Quotas providers, resets, limites
3. **IaAccessTab** - Controle acces, acces forces
4. **IaPricingTab** - Configuration tarifs par tier
5. **IaTrialConfigTab** - Duree essai et limites appels
6. **IaSubscriptionsTab** - Abonnements actifs
7. **IaAnalyticsTab** - Patterns d'utilisation
8. **IaLogsTab** - Logs detailles
9. **IaAlertsEventsTab** - Alertes et notifications
10. **CountryCoverageTab** - Distribution geographique
11. **IaMultiProvidersTab** - Comptes multi-prestataires

#### Securite IA

- **Sanitisation input**: Protection XSS, prevention injection prompt
- **Sanitisation output**: Suppression scripts, HTML dangereux
- **Rate limiting**: Throttling par utilisateur
- **Moderation contenu**: Flagging input/output
- **Quota enforcement**: Prevention sur-utilisation
- **Audit admin**: Toutes modifications loguees
- **Isolation multi-projet**: SOS et Outil = projets Firebase separes
- **SSO cross-projet**: Authentification par token securise

---

## 13. API ET ENDPOINTS

### 13.1 Cloud Functions Callables

```typescript
// Appels depuis le frontend
import { httpsCallable } from 'firebase/functions';

// Paiements
const createPaymentIntent = httpsCallable(functions, 'createPaymentIntent');
const processPayPalOrder = httpsCallable(functions, 'processPayPalOrder');

// Appels
const createAndScheduleCall = httpsCallable(functions, 'createAndScheduleCall');
const cancelCall = httpsCallable(functions, 'cancelCall');

// Utilisateur
const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
const generateCustomToken = httpsCallable(functions, 'generateCustomToken');

// Prestataire
const updateProviderAvailability = httpsCallable(functions, 'updateProviderAvailability');
const updateOnlineStatus = httpsCallable(functions, 'updateOnlineStatus');

// Abonnements
const createSubscription = httpsCallable(functions, 'createSubscription');
const cancelSubscription = httpsCallable(functions, 'cancelSubscription');

// IA
const processAIMessage = httpsCallable(functions, 'processAIMessage');
```

### 13.2 Webhooks

| Endpoint | Source | Description |
|----------|--------|-------------|
| `/webhook/stripe` | Stripe | Evenements paiements |
| `/webhook/paypal` | PayPal | Evenements PayPal |
| `/webhook/twilio` | Twilio | Status appels |
| `/webhook/sendgrid` | SendGrid | Delivery status |

### 13.3 API HTTP (Admin)

```typescript
// adminApi.ts - API REST pour l'admin

// GET /api/admin/users
// GET /api/admin/users/:id
// PUT /api/admin/users/:id
// DELETE /api/admin/users/:id

// GET /api/admin/providers
// PUT /api/admin/providers/:id/approve
// PUT /api/admin/providers/:id/suspend

// GET /api/admin/calls
// GET /api/admin/payments
// GET /api/admin/disputes
```

---

## 14. COMPOSANTS UI

### 14.1 Vue d'Ensemble

Le repertoire `src/components` contient **122 composants React/TypeScript** organises par fonctionnalite.

### 14.2 Composants Common (Reutilisables)

| Composant | Props Principales | Description |
|-----------|-------------------|-------------|
| **Button.tsx** | variant, size, loading, disabled | Bouton universel avec 4 variantes |
| **Modal.tsx** | isOpen, onClose, title, size | Dialog accessible avec focus trap |
| **LoadingSpinner.tsx** | size, color, text | Spinner SVG anime |
| **ErrorBoundary.tsx** | fallback, onError, resetKeys | Capture erreurs React + Sentry |
| **ImageUploader.tsx** | onImageUploaded, aspectRatio, cropShape | Upload avec camera, crop, compression |
| **ImageCropModal.tsx** | imageUrl, aspectRatio, outputSize | Interface de recadrage interactive |
| **ShareButton.tsx** | data, variant, onShareSuccess | Partage natif + fallback clipboard |
| **InstallBanner.tsx** | forceShow | Prompt installation PWA cross-platform |
| **ScrollToTopButton.tsx** | - | Bouton flottant retour en haut |

### 14.3 Composants Formulaire

| Composant | Integration | Description |
|-----------|-------------|-------------|
| **PhoneField.tsx** | React Hook Form | Input telephone E.164 |
| **CountrySelect.tsx** | React Hook Form | Selecteur pays |
| **MultiLanguageSelect.tsx** | React Hook Form | Selection multi-langues |
| **WhatsAppInput.tsx** | React Hook Form | Input WhatsApp valide |

### 14.4 Composants Abonnement

| Composant | Props Principales | Description |
|-----------|-------------------|-------------|
| **SubscriptionCard.tsx** | subscription, plan, onManageBilling | Carte statut abonnement |
| **PricingTable.tsx** | plans, currentTier, currency | Grille tarifs mensuel/annuel |
| **QuotaUsageBar.tsx** | current, limit | Barre progression quota |

### 14.5 Composants SEO (Schema.org)

```
sos/src/components/seo/
├── BreadcrumbSchema.tsx     # Schema fil d'Ariane
├── ProfessionalServiceSchema.tsx
├── OrganizationSchema.tsx
├── ReviewSchema.tsx
├── LocalBusinessSchema.tsx
├── ArticleSchema.tsx
├── ServiceSchema.tsx
└── FAQPageSchema.tsx
```

### 14.6 Composants Admin Finance

```
sos/src/components/admin/finance/
├── KPICard.tsx              # Indicateur performance
├── StatusBadge.tsx          # Badge statut transaction
├── CurrencyAmount.tsx       # Montant formate
├── TransactionRow.tsx       # Ligne tableau transactions
├── DateRangeQuickSelect.tsx # Selection rapide dates
├── CostAlertCard.tsx        # Alertes couts
├── UsageChart.tsx           # Graphique utilisation
└── BudgetConfigModal.tsx    # Configuration budget
```

### 14.7 Patterns Architecturaux Composants

#### Internationalisation (i18n)
```typescript
// Utilisation react-intl
const intl = useIntl();
const label = intl.formatMessage({ id: 'button.submit' });

// 9 langues: FR, EN, ES, DE, RU, HI, PT, CH, AR
```

#### Integration React Hook Form
```typescript
<Controller
  name="phone"
  control={control}
  rules={{ required: true, validate: validatePhone }}
  render={({ field, fieldState }) => (
    <PhoneInput {...field} error={fieldState.error} />
  )}
/>
```

#### Accessibilite
- Labels ARIA sur tous les elements interactifs
- Navigation clavier (Escape, Enter, Tab)
- Focus trap dans les modals
- Classes `sr-only` pour lecteurs d'ecran
- Support mode contraste eleve

#### Optimisations Performance
- `React.memo` pour composants purs
- `useMemo` / `useCallback` pour calculs couteux
- Lazy loading des images
- Compression automatique images (WebP/JPEG)

#### Patterns Props Communs
```typescript
// Etats de chargement
isLoading?: boolean;

// Callbacks
onSuccess?: (result?) => void;
onError?: (error: Error) => void;
onCancel?: () => void;

// Style
className?: string;
variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
size?: 'small' | 'medium' | 'large';
```

### 14.8 Caracteristiques Notables

- **Mobile-First**: Tous composants optimises mobile avec breakpoints responsive
- **Touch-Optimized**: Cibles tactiles minimum 44px
- **Accessibilite WCAG 2.1 AA**: Conformite niveau AA
- **Multi-langue**: 9 langues avec fallbacks
- **Dark Mode**: Support la ou applicable
- **Camera Integration**: Capture camera avec selection appareil
- **Image Optimization**: Compression auto, conversion format, support HEIC
- **Error Tracking**: Integration Sentry en production

### 14.2 Composants Specifiques

```
sos/src/components/
├── providers/
│   ├── ProviderCard.tsx        # Carte prestataire
│   ├── ProviderList.tsx        # Liste prestataires
│   ├── ProviderFilters.tsx     # Filtres de recherche
│   └── ProviderOnlineManager.tsx # Gestion statut en ligne
│
├── booking/
│   ├── BookingForm.tsx         # Formulaire reservation
│   ├── TimeSlotPicker.tsx      # Selection horaire
│   └── DurationSelector.tsx    # Selection duree
│
├── payment/
│   ├── StripePaymentForm.tsx   # Formulaire Stripe
│   ├── PayPalButton.tsx        # Bouton PayPal
│   └── PaymentSummary.tsx      # Resume paiement
│
├── dashboard/
│   ├── DashboardStats.tsx      # Statistiques
│   ├── CallHistory.tsx         # Historique appels
│   ├── EarningsChart.tsx       # Graphique revenus
│   └── DashboardMessages.tsx   # Messagerie
│
└── wizard/
    ├── WizardContainer.tsx     # Container wizard
    ├── CountryStep.tsx         # Etape pays
    ├── LanguageStep.tsx        # Etape langue
    ├── ServiceStep.tsx         # Etape service
    └── ProviderStep.tsx        # Etape selection
```

### 14.3 Composants UI (Outil IA SOS)

Utilise **shadcn/ui** et **Radix UI**:

```
Outil-sos-expat/src/components/ui/
├── button.tsx
├── card.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── input.tsx
├── select.tsx
├── tabs.tsx
├── toast.tsx
├── avatar.tsx
├── badge.tsx
├── separator.tsx
├── tooltip.tsx
└── alert-dialog.tsx
```

---

## 15. DEPLOIEMENT

### 15.1 Environnements

| Environnement | URL | Firebase Project |
|---------------|-----|------------------|
| **Production** | sos-expat.com | sos-expat-prod |
| **Staging** | staging.sos-expat.com | sos-expat-staging |
| **Development** | localhost:5173 | Emulateurs locaux |

### 15.2 Scripts de Build

```bash
# SOS Expat (sos/)
npm run dev              # Developpement local
npm run build            # Build production
npm run preview          # Preview du build
npm run typecheck        # Verification TypeScript
npm run lint             # ESLint
npm run test             # Tests Vitest

# Firebase Functions
cd firebase/functions
npm run build            # Compile TypeScript
npm run deploy           # Deploy functions

# Outil IA SOS
npm run dev              # Developpement local
npm run build            # Build production
npm run build:functions  # Build functions
npm run deploy:functions # Deploy functions
```

### 15.3 Configuration Firebase

```javascript
// firebase.json (simplifie)
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "functions": {
    "source": "firebase/functions",
    "runtime": "nodejs20"
  },
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### 15.4 Variables d'Environnement

```bash
# .env.example

# Firebase
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_xxx

# PayPal
VITE_PAYPAL_CLIENT_ID=xxx

# Google Analytics
VITE_GA4_MEASUREMENT_ID=G-xxx

# Meta Pixel
VITE_META_PIXEL_ID=xxx
```

### 15.5 Secrets Firebase Functions

```bash
# Configures via Firebase CLI
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set PAYPAL_CLIENT_SECRET
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set OPENAI_API_KEY
```

---

## 16. GUIDES DE DEVELOPPEMENT

### 16.1 Setup Local

```bash
# 1. Cloner le repository
git clone <repo-url>
cd sos-expat-project

# 2. Installer les dependances
cd sos && npm install
cd ../Outil-sos-expat && npm install

# 3. Configurer les variables d'environnement
cp sos/.env.example sos/.env.local
cp Outil-sos-expat/.env.example Outil-sos-expat/.env.local

# 4. Lancer les emulateurs Firebase
cd sos
npm run dev:emulators

# 5. Dans un autre terminal, lancer le frontend
npm run dev
```

### 16.2 Structure d'un Nouveau Composant

```typescript
// src/components/example/ExampleComponent.tsx
import React from 'react';
import { useIntl } from 'react-intl';

interface ExampleComponentProps {
  title: string;
  onClick?: () => void;
}

export const ExampleComponent: React.FC<ExampleComponentProps> = ({
  title,
  onClick,
}) => {
  const intl = useIntl();

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold">{title}</h2>
      <button
        onClick={onClick}
        className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
      >
        {intl.formatMessage({ id: 'example.button' })}
      </button>
    </div>
  );
};
```

### 16.3 Ajouter une Nouvelle Page

1. Creer le fichier dans `src/pages/NewPage.tsx`
2. Ajouter la route dans `App.tsx`:

```typescript
// Lazy loading
const NewPage = lazy(() => import('./pages/NewPage'));

// Dans routeConfigs
{ path: "/new-page", component: NewPage, translated: "new-page" },
```

3. Ajouter les traductions dans `helper/*.json`
4. Ajouter le slug traduit dans `multilingual-system/`

### 16.4 Ajouter une Nouvelle Cloud Function

1. Creer le fichier dans `firebase/functions/src/`
2. Exporter dans `index.ts`:

```typescript
// index.ts
export { myNewFunction } from './myNewFunction';
```

3. Deployer:

```bash
firebase deploy --only functions:myNewFunction
```

### 16.5 Tests

```bash
# Tests unitaires
npm run test

# Tests avec couverture
npm run test:coverage

# Tests specifiques
npm run test -- --grep "PaymentService"
```

### 16.6 Conventions de Code

- **Nommage**: camelCase pour variables/fonctions, PascalCase pour composants
- **Fichiers**: kebab-case pour fichiers non-composants
- **Imports**: Absolus avec `@/` alias
- **Types**: Toujours typer les props et retours
- **Comments**: JSDoc pour fonctions publiques
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)

---

## ANNEXES

### A. Glossaire

| Terme | Definition |
|-------|------------|
| **Provider** | Prestataire (avocat ou expatrie) |
| **Client** | Utilisateur cherchant de l'aide |
| **Call** | Session d'appel telephonique |
| **KYC** | Know Your Customer - verification d'identite |
| **SSO** | Single Sign-On - authentification unique |
| **PWA** | Progressive Web App |

### B. Liens Utiles

- [Firebase Documentation](https://firebase.google.com/docs)
- [Stripe Connect](https://stripe.com/docs/connect)
- [Twilio Voice](https://www.twilio.com/docs/voice)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)

### C. Contacts

- **Support Technique**: tech@sos-expat.com
- **Support Client**: support@sos-expat.com

---

*Document genere le 24 Janvier 2026*
*Version 1.0.0*

---

## 17. SYSTEME D'ABONNEMENT DETAILLE

### 17.1 Tiers d'Abonnement

#### Trial (Essai Gratuit)
- **Duree**: 30 jours (configurable)
- **Appels IA**: 3 maximum
- **Prix**: Gratuit

#### Basic
| Type | EUR/mois | EUR/an | USD/mois | USD/an | Appels IA |
|------|----------|--------|----------|--------|-----------|
| Avocat | 14€ | 134.40€ | 19$ | 182.40$ | 5/mois |
| Expatrie | 9€ | 86.40€ | 9$ | 86.40$ | 5/mois |

#### Standard
| Type | EUR/mois | EUR/an | USD/mois | USD/an | Appels IA |
|------|----------|--------|----------|--------|-----------|
| Avocat | 39€ | 374.40€ | 49$ | 470.40$ | 15/mois |
| Expatrie | 14€ | 134.40€ | 17$ | 163.20$ | 15/mois |

#### Pro
| Type | EUR/mois | EUR/an | USD/mois | USD/an | Appels IA |
|------|----------|--------|----------|--------|-----------|
| Avocat | 69€ | 662.40€ | 79$ | 758.40$ | 30/mois |
| Expatrie | 24€ | 230.40€ | 29$ | 278.40$ | 30/mois |

#### Unlimited
| Type | EUR/mois | EUR/an | USD/mois | USD/an | Appels IA |
|------|----------|--------|----------|--------|-----------|
| Avocat | 119€ | 1,142.40€ | 139$ | 1,334.40$ | Illimite (500 fair use) |
| Expatrie | 39€ | 374.40€ | 49$ | 470.40$ | Illimite (500 fair use) |

**Remise annuelle**: 20% par defaut

### 17.2 Collections Firestore Abonnements

```typescript
// subscription_plans/{planId}
interface SubscriptionPlan {
  id: string;
  tier: 'trial' | 'basic' | 'standard' | 'pro' | 'unlimited';
  providerType: 'lawyer' | 'expat_aidant';
  name: Record<LanguageCode, string>;        // 9 langues
  description: Record<LanguageCode, string>;
  pricing: { EUR: number; USD: number };
  annualPricing?: { EUR: number; USD: number };
  annualDiscountPercent?: number;
  aiCallsLimit: number;                      // -1 = illimite
  features: PlanFeature[];
  stripePriceId: { EUR: string; USD: string };
  stripePriceIdAnnual?: { EUR: string; USD: string };
  stripeProductId?: string;
  isActive: boolean;
  sortOrder: number;
}

// subscriptions/{providerId}
interface Subscription {
  providerId: string;
  providerType: 'lawyer' | 'expat_aidant';
  planId: string;
  tier: SubscriptionTier;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'paused' | 'suspended';

  // Stripe
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;

  // Dates
  trialStartedAt: Timestamp | null;
  trialEndsAt: Timestamp | null;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  canceledAt: Timestamp | null;
  cancelAtPeriodEnd: boolean;

  // Facturation
  currency: 'EUR' | 'USD';
  billingPeriod: 'monthly' | 'yearly';
  currentPeriodAmount: number;
}

// ai_usage/{providerId}
interface AiUsage {
  providerId: string;
  subscriptionId: string;
  currentPeriodCalls: number;
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  trialCallsUsed: number;
  totalCallsAllTime: number;
  lastCallAt: Timestamp | null;
}
```

### 17.3 Cycle de Vie des Statuts

```
TRIALING (30 jours, 3 appels)
    │
    │ upgrade / auto-convert
    ▼
ACTIVE (Abonnement paye)
    │
    │ echec paiement
    ▼
PAST_DUE (Grace 7 jours, acces maintenu)
    │
    │ toujours pas de paiement
    ▼
SUSPENDED (Acces coupe)

CANCELED (Annule mais acces jusqu'a fin periode)
    │
    │ fin de periode
    ▼
EXPIRED (Plus d'acces)

PAUSED (Facturation en pause, pas d'acces)
```

### 17.4 Controle d'Acces IA

**Acces AUTORISE:**
- `trialing` (periode essai valide)
- `active` (abonnement actif)
- `past_due` (grace de 7 jours)

**Acces BLOQUE:**
- `canceled`, `expired`, `suspended`, `paused`
- Essai expire (> 30 jours)
- Appels essai epuises (> 3)
- Quota mensuel epuise
- Paiement echoue (apres grace)

**Declenchement upgrade:** A 80% du quota

### 17.5 Fonctions Admin Abonnements

| Fonction | Description |
|----------|-------------|
| `adminForceAiAccess` | Accorder/revoquer acces IA gratuit |
| `adminResetQuota` | Reinitialiser quota a 0 |
| `adminChangePlan` | Changer de plan (immediat ou fin periode) |
| `adminCancelSubscription` | Annuler avec option remboursement |
| `adminPauseSubscription` | Mettre en pause |
| `adminResumeSubscription` | Reprendre |
| `adminGetSubscriptionStats` | Statistiques (MRR, ARR, churn) |
| `adminSyncStripePrices` | Synchroniser plans avec Stripe |

### 17.6 Detection Automatique Devise

```typescript
// Pays zone Euro → EUR
const EUROZONE_COUNTRIES = [
  'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT',
  'SK', 'SI', 'ES', 'HR'
];
// Reste du monde → USD
```

---

## 18. SERVICES DETAILLES

### 18.1 PricingService (`sos/src/services/pricingService.ts`)

Service de gestion des prix en temps reel avec cache intelligent.

```typescript
// Types principaux
interface ServiceConfig {
  totalAmount: number;        // Prix total client
  connectionFeeAmount: number; // Frais de plateforme
  providerAmount: number;     // Montant prestataire
  duration: number;           // Duree en minutes
  currency: string;           // EUR ou USD
}

interface PricingConfig {
  lawyer: { eur: ServiceConfig; usd: ServiceConfig };
  expat: { eur: ServiceConfig; usd: ServiceConfig };
  overrides?: {
    lawyer?: Partial<Record<Currency, PriceOverride>>;
    expat?: Partial<Record<Currency, PriceOverride>>;
  };
}
```

**Fonctionnalites:**
- Cache memoire 24h (30s pour fallback)
- Listener temps reel Firestore (`subscribeToPricing`)
- Support des overrides promotionnels
- Detection automatique de la devise utilisateur
- Simulation de prix avec coupons

**Prix par defaut:**

| Service | EUR | USD | Duree |
|---------|-----|-----|-------|
| Avocat | 49€ (19€ frais + 30€ provider) | 55$ (25$ + 30$) | 20 min |
| Expatrie | 19€ (9€ frais + 10€ provider) | 25$ (15$ + 10$) | 30 min |

### 18.2 Systeme de Promotions

**Structure Override Promotionnel:**

```typescript
interface PriceOverride {
  enabled: boolean;
  totalAmount: number;
  connectionFeeAmount: number;
  label?: string;              // Ex: "Promo Rentree"
  startsAt?: Timestamp;        // Date debut
  endsAt?: Timestamp;          // Date fin
  strikeTargets?: "provider" | "default" | "both";
  stackableWithCoupons?: boolean;
}
```

**Fonctionnalites:**
- Promotions limitees dans le temps
- Configuration stackable par promo ou globalement
- Labels marketing pour l'affichage UI
- Detection automatique si promo active

### 18.3 Systeme de Coupons

**Fichier:** `sos/src/utils/coupon.ts`

```typescript
interface CouponData {
  code: string;
  type: "fixed" | "percentage";
  amount: number;
  active: boolean;
  services: string[];           // ["expat_call", "lawyer_call"]
  valid_from: Timestamp;
  valid_until: Timestamp;
  min_order_amount: number;
  max_uses_total: number;
  max_uses_per_user: number;
  maxDiscount?: number;         // Plafond pour % coupons
}
```

**Processus de Validation:**
1. Sanitisation code (majuscules, alphanumerique, max 50 chars)
2. Verification cache (TTL 5 min)
3. Verification statut actif
4. Validation plage de dates
5. Matching type de service
6. Verification montant minimum
7. Verification limites globales
8. Verification limites par utilisateur
9. Calcul remise (avec plafonds)

**Tracking Utilisation:**
- Mapping code/user/order
- Montants original et remise
- Timestamps et logging
- Enregistrement atomique anti-double-usage
- Capacite de revert pour commandes annulees

### 18.4 Generation de Factures

**Fichier:** `sos/src/services/invoiceGenerator.ts`

```typescript
interface InvoiceRecord {
  invoiceNumber: string;
  type: 'platform' | 'provider';
  callId: string;
  clientId: string;
  providerId: string;
  amount: number;
  currency: string;
  downloadUrl: string;
  status: 'issued' | 'sent' | 'paid' | 'cancelled';
  createdAt: Timestamp;
}
```

**Fonctionnalites:**
- Dual factures: plateforme + prestataire
- jsPDF charge dynamiquement (lazy-loaded)
- Stockage PDF dans Firebase Storage
- Numerotation et tracking
- Multi-devises (EUR, USD, GBP, CHF)
- Format nom prestataire respectueux vie privee ("Prenom L.")

### 17.2 InvoiceGenerator (`sos/src/services/invoiceGenerator.ts`)

Generateur de factures PDF pour les appels et abonnements.

**Fonctionnalites:**
- Generation automatique apres paiement
- Templates multilingues
- Export PDF via jsPDF
- Stockage Firebase Storage
- Envoi automatique par email

### 17.3 CostMonitoringService (`sos/src/services/costMonitoringService.ts`)

Surveillance des couts des services externes.

**Services surveilles:**
- Firebase (Firestore reads/writes, Storage, Functions)
- Stripe (transactions, fees)
- Twilio (appels, SMS)
- SendGrid (emails)
- OpenAI (tokens IA)

### 17.4 TaxFilingService (`sos/src/services/taxFilingService.ts`)

Gestion des informations fiscales pour les prestataires.

**Fonctionnalites:**
- Collecte des informations fiscales
- Generation des documents fiscaux annuels
- Conformite TVA europeenne
- Export pour declarations

### 17.5 OfflineStorage (`sos/src/services/offlineStorage.ts`)

Stockage local pour fonctionnement hors ligne.

**Fonctionnalites:**
- IndexedDB pour donnees structurees
- Synchronisation automatique au retour en ligne
- Queue d'actions hors ligne
- Cache des donnees critiques

---

## 18. HOOKS DETAILLES

### 18.1 useSubscription

Hook complet de gestion des abonnements avec pattern SWR-like.

```typescript
interface UseSubscriptionReturn {
  // Etat
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: Error | null;

  // Derives
  isActive: boolean;        // Abonnement actif
  isTrialing: boolean;      // Periode d'essai
  isPastDue: boolean;       // Paiement en retard
  isCanceled: boolean;      // Annule
  cancelAtPeriodEnd: boolean;
  daysUntilRenewal: number;

  // Actions
  cancelSubscription: (reason?: string) => Promise<void>;
  reactivateSubscription: () => Promise<void>;
  openBillingPortal: () => Promise<void>;
  initializeTrial: () => Promise<void>;
  refresh: () => Promise<void>;
}
```

**Caracteristiques:**
- Ecoute temps reel Firestore
- Cache automatique 5 minutes
- Calcul automatique des jours jusqu'au renouvellement
- Support des periodes d'essai
- Integration Stripe Billing Portal

### 18.2 useMultiProviderDashboard

Hook pour le dashboard multi-prestataires (gestion de plusieurs comptes).

```typescript
interface UseMultiProviderDashboardReturn {
  // Data
  accounts: MultiProviderAccount[];
  stats: DashboardStats;

  // State
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Auth (protege par mot de passe)
  authenticate: (password: string) => Promise<boolean>;
  logout: () => void;

  // Actions
  refresh: () => Promise<void>;
  openAiTool: (providerId: string, bookingId?: string) => Promise<void>;

  // Chat integre
  conversations: ChatConversation[];
  chatLoading: boolean;
  loadConversations: (providerId: string) => Promise<void>;
  sendMessage: (providerId: string, message: string) => Promise<void>;
}
```

**Fonctionnalites:**
- Authentification par mot de passe securise
- Session persistante 24h avec localStorage
- Acces a l'Outil IA via SSO
- Chat integre avec les providers
- Statistiques agregees multi-comptes

### 18.3 useDisputes (`sos/src/hooks/useDisputes.ts`)

Gestion des litiges et remboursements.

```typescript
interface UseDisputesReturn {
  disputes: Dispute[];
  isLoading: boolean;
  error: Error | null;
  createDispute: (callId: string, reason: string) => Promise<void>;
  resolveDispute: (id: string, resolution: Resolution) => Promise<void>;
  getDisputeById: (id: string) => Dispute | undefined;
}
```

### 18.4 useAiToolAccess (`sos/src/hooks/useAiToolAccess.ts`)

Gestion de l'acces a l'Outil IA SOS.

```typescript
interface UseAiToolAccessReturn {
  hasAccess: boolean;
  isLoading: boolean;
  openAiTool: () => Promise<void>;
  generateSSOToken: () => Promise<string>;
}
```

**Fonctionnalites:**
- Verification du role (lawyer/expat/admin)
- Verification de l'abonnement actif
- Generation de token SSO
- Ouverture dans nouvel onglet

### 18.5 useProviderActivityTracker

Suivi de l'activite des prestataires en temps reel.

```typescript
interface UseProviderActivityTrackerReturn {
  isOnline: boolean;
  lastActivity: Date | null;
  setOnline: () => void;
  setOffline: () => void;
  updateActivity: () => void;
}
```

### 18.6 Autres Hooks Importants

| Hook | Description |
|------|-------------|
| `useFinanceData` | Donnees financieres et revenus |
| `useCostMonitoring` | Surveillance des couts |
| `useValidationQueue` | File d'attente de validation admin |
| `useServiceAlerts` | Alertes systeme et notifications |
| `useGoogleAdsAnalytics` | Tracking Google Ads conversions |
| `useMetaAnalytics` | Tracking Meta/Facebook Pixel |
| `useIncomingCallSound` | Son d'appel entrant |
| `useConnectionLogs` | Logs de connexion |

---

## 19. FIREBASE FUNCTIONS DETAILLEES

### 19.1 DisputeManager

Gestionnaire des litiges Stripe avec architecture Direct Charges.

```typescript
class DisputeManager {
  // Gestion des evenements Stripe
  handleDisputeCreated(dispute: Stripe.Dispute): Promise<void>;
  handleDisputeUpdated(dispute: Stripe.Dispute): Promise<void>;
  handleDisputeClosed(dispute: Stripe.Dispute): Promise<void>;

  // Actions internes
  notifyProviderOfDispute(providerId: string, dispute: DisputeRecord): Promise<void>;
  updateCallSessionDispute(callSessionId: string, disputeId: string): Promise<void>;
  createDisputeAlert(dispute: DisputeRecord): Promise<void>;
}
```

**Important:** Avec Direct Charges, les disputes sont gerees directement par Stripe sur le compte du provider. Le DisputeManager ne fait que:
- Recevoir les webhooks de disputes (informatif)
- Notifier le provider
- Logger les evenements pour suivi

### 19.2 PayPalManager

Gestionnaire complet de l'integration PayPal.

**Fonctionnalites:**
- Creation de commandes
- Capture de paiements
- Gestion des remboursements
- Webhooks PayPal
- Payout aux prestataires

### 19.3 TwilioCallManager

Gestionnaire des appels telephoniques via Twilio.

**Fonctionnalites:**
- Initiation d'appels
- Callbacks de statut
- Enregistrement des appels (si autorise)
- Gestion des echecs d'appel
- Facturation a la minute

### 19.4 ProviderEarningsService

Calcul et gestion des revenus prestataires.

```typescript
class ProviderEarningsService {
  calculateEarnings(callId: string): Promise<EarningsBreakdown>;
  scheduleTransfer(providerId: string, amount: number): Promise<void>;
  getMonthlyReport(providerId: string, month: Date): Promise<Report>;
}
```

### 19.5 KYCReminderManager

Gestion des rappels pour la verification KYC.

**Workflow:**
1. Rappel J+1 apres inscription
2. Rappel J+3 si non complete
3. Rappel J+7 avec avertissement
4. Suspension J+14 si toujours incomplet

### 19.6 PendingTransferProcessor

Traitement des transferts differes vers prestataires.

**Logique:**
- Retention de 7 jours (protection litiges)
- Verification absence de dispute
- Execution via Stripe Connect Transfer
- Notification du prestataire

---

## 20. CONTEXTE D'AUTHENTIFICATION DETAILLE

### 20.1 AuthContext (`sos/src/contexts/AuthContext.tsx`)

Contexte complet de gestion de l'authentification.

```typescript
interface AuthContextType {
  // Etat
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AppError | null;

  // Actions principales
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;

  // Gestion du profil
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;

  // Recuperation
  sendPasswordReset: (email: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;

  // Helpers
  hasRole: (role: UserRole | UserRole[]) => boolean;
  isProvider: () => boolean;
  isAdmin: () => boolean;
}
```

### 20.2 Detection d'Environnement

Le contexte detecte automatiquement:
- Type d'appareil (mobile/tablet/desktop)
- Systeme d'exploitation
- Navigateur
- Vitesse de connexion
- WebView in-app (Instagram, Facebook, TikTok, etc.)

### 20.3 Authentification Google Adaptative

```typescript
// Detection automatique du meilleur mode
const shouldForceRedirectAuth = (): boolean => {
  // iOS WebViews (Chrome iOS, Firefox iOS) → Redirect
  // Safari iOS natif → Popup (meilleur car pas de problemes ITP)
  // Android WebViews → Redirect
  // Desktop → Popup
};
```

### 20.4 Metriques d'Authentification

```typescript
interface AuthMetrics {
  loginAttempts: number;
  lastAttempt: Date;
  successfulLogins: number;
  failedLogins: number;
  googleAttempts: number;
  roleRestrictionBlocks: number;
  passwordResetRequests: number;
}
```

---

## 21. SYSTEME DE CATEGORIES DE SERVICES

### 21.1 Categories Principales

| Categorie | Description | Prestataires |
|-----------|-------------|--------------|
| `visa` | Visas et permis de sejour | Avocats, Expatries |
| `immobilier` | Achat, location, investissement | Avocats, Expatries |
| `fiscal` | Fiscalite internationale | Avocats |
| `travail` | Droit du travail, contrats | Avocats |
| `famille` | Droit familial, successions | Avocats |
| `administratif` | Demarches administratives | Expatries |
| `installation` | Aide a l'installation | Expatries |
| `sante` | Systeme de sante local | Expatries |
| `education` | Ecoles, universites | Expatries |
| `banque` | Ouverture compte, credit | Expatries |

### 21.2 Structure des Donnees

```typescript
interface ServiceCategory {
  id: string;
  name: Record<LanguageCode, string>;
  description: Record<LanguageCode, string>;
  icon: string;
  providerTypes: ('lawyer' | 'expat')[];
  isActive: boolean;
  sortOrder: number;
}
```

---

## 22. SYSTEME DE RECHERCHE ET FILTRES

### 22.1 Filtres de Recherche Prestataires

```typescript
interface ProviderSearchFilters {
  country?: string;           // Pays d'expertise
  language?: string;          // Langue parlee
  serviceType?: string;       // Type de service
  providerType?: 'lawyer' | 'expat';
  isOnline?: boolean;         // Disponible maintenant
  minRating?: number;         // Note minimale
  maxPrice?: number;          // Prix max
  sortBy?: 'rating' | 'price' | 'experience' | 'availability';
}
```

### 22.2 Algorithme de Tri

1. **Prestataires en ligne** en premier
2. **Note moyenne** (ponderee par nombre d'avis)
3. **Nombre d'appels completes**
4. **Anciennete sur la plateforme**

---

## 23. SYSTEME D'ANALYTICS COMPLET

### 23.1 Architecture Multi-Plateforme

Le systeme analytics comprend **5 integrations publicitaires**:
1. Google Analytics 4 (GA4)
2. Google Tag Manager (GTM)
3. Meta Pixel (Facebook/Instagram)
4. Meta Conversions API (CAPI)
5. Google Ads Conversions

### 23.2 Service Analytics Principal

**Fichier:** `sos/src/services/analytics.ts`

**Types d'evenements:**
- **Language Mismatch**: Incompatibilites langue client/provider
- **User Actions**: Categorises par user, provider, call, payment, search, navigation
- **Conversions**: booking_started, booking_completed, payment_successful, call_completed
- **Errors**: JS errors, API errors, payment errors avec niveaux de severite
- **Performance**: Page load, temps de reponse API, metriques interaction

**Collections Firestore:**
- `analytics_language_mismatches`
- `analytics_user_actions`
- `analytics_conversions`
- `analytics_errors`
- `analytics_performance`
- `analytics_counters`

### 23.3 Google Analytics 4

**Fichier:** `sos/src/utils/ga4.ts`

```typescript
// Configuration
{
  measurement_id: process.env.VITE_GA4_MEASUREMENT_ID,
  anonymize_ip: true,  // Conformite RGPD
  send_page_view: false, // Controle manuel
}
```

**Fonctionnalites:**
- Chargement dynamique base sur consentement cookies
- Consent Mode v2 avec permissions granulaires
- Detection des bloqueurs de publicite
- Tracking user ID

### 23.4 Meta Pixel + Conversions API

**Fichier:** `sos/src/utils/metaPixel.ts`

**Evenements Standard:**
- PageView, Lead, Purchase, InitiateCheckout
- Contact, CompleteRegistration, StartRegistration
- Search, ViewContent, AddToCart, AddPaymentInfo

**Advanced Matching:**
- Email (normalise)
- Telephone (format E.164)
- Prenom, Nom, Ville, Pays, Code postal
- External ID (Firebase UID)
- Identifiants FBP/FBC (cookies)

**Score Qualite Donnees:**

| Donnee | Points |
|--------|--------|
| Email | 30 |
| Telephone | 25 |
| Prenom | 15 |
| Nom | 10 |
| Pays | 10 |
| FBP | 5 |
| FBC | 5 |

**Pixel ID:** 2204016713738311

### 23.5 Meta CAPI Backend

**Fichier:** `sos/firebase/functions/src/tracking/capiEvents.ts`

- Rate limiting: 30 events/min par IP
- Enrichissement serveur (IP, User-Agent, UTM)
- Deduplication avec Event ID partage
- Stockage dans `capi_events` pour dashboard

### 23.6 Hook useMetaTracking

**Fichier:** `sos/src/hooks/useMetaTracking.ts`

```typescript
// Tracking unifie Pixel + CAPI
{
  trackPageView: () => void,        // Pixel only
  trackLead: () => void,            // Pixel + CAPI
  trackPurchase: () => void,        // Pixel (CAPI via Stripe webhook)
  trackInitiateCheckout: () => void, // Pixel + CAPI
  trackContact: () => void,          // Pixel + CAPI
  trackRegistration: () => void,     // Pixel (CAPI via Firestore trigger)
  trackSearch: () => void,           // Pixel + CAPI
  trackViewContent: () => void,      // Pixel + CAPI
}
```

### 23.7 Analytics Unifies Backend

**Fichier:** `sos/firebase/functions/src/analytics/unifiedAnalytics.ts`

**Metriques Utilisateurs:**
- DAU, WAU, MAU (Daily/Weekly/Monthly Active Users)
- Nouvelles inscriptions (clients & providers)
- Taux de churn (seuil 90 jours d'inactivite)

**Metriques Appels:**
- Appels inities, completes, echoues, annules
- Duree moyenne et totale
- Taux de succes
- Analyse heures de pointe

**Metriques Revenus:**
- Revenus quotidien, hebdomadaire, mensuel
- Frais plateforme, paiements providers
- Revenus par pays et type de service

**Funnels de Conversion:**

| Funnel Client | Funnel Provider |
|---------------|-----------------|
| Visiteurs | Inscrits |
| Inscrits | KYC Complete |
| Premier Appel | Premier Appel |
| Client Recurrent | Actif (5+ appels/30j) |

### 23.8 Dashboards Admin

- **AdminMetaAnalytics.tsx**: KPIs, distribution evenements, tendances, qualite
- **AdminGoogleAdsAnalytics.tsx**: Conversions Google Ads
- **AdminUnifiedAnalytics.tsx**: Vue agregee toutes plateformes

### 23.9 Alertes Qualite

**Seuils d'alerte:**

| Metrique | Seuil Minimum |
|----------|---------------|
| Score qualite | 40% |
| Taux email | 30% |
| Taux FBP | 50% |
| Taux anonyme max | 70% |

### 23.10 Conformite RGPD

- Consent Mode v2 implemente
- Opt-in explicite pour cookies analytics
- Masquage donnees sensibles dans logs
- IP anonymisee dans GA4
- Possibilite suppression donnees sur logout
- Retention: 2 ans max (nettoyage automatique)

---

## 24. SYSTEME DE BOOKING ET CALENDRIER

### 24.1 Types de Reservation

| Type | Description | Delai |
|------|-------------|-------|
| `immediate` | Appel SOS urgent | < 5 min |
| `scheduled` | Appel planifie | > 1h |
| `callback` | Demande de rappel | Variable |

### 24.2 Gestion des Disponibilites

```typescript
interface AvailabilitySchedule {
  timezone: string;
  slots: {
    dayOfWeek: 0-6;
    startTime: string;  // "09:00"
    endTime: string;    // "18:00"
  }[];
  exceptions: {
    date: string;       // "2024-01-15"
    available: boolean;
    slots?: { startTime: string; endTime: string }[];
  }[];
}
```

---

## 25. GESTION DES ERREURS

### 25.1 Codes d'Erreur Personnalises

```typescript
const ErrorCodes = {
  // Auth
  'auth/invalid-credentials': 'Email ou mot de passe incorrect',
  'auth/email-already-in-use': 'Cet email est deja utilise',
  'auth/weak-password': 'Le mot de passe est trop faible',

  // Payment
  'payment/card-declined': 'Carte refusee',
  'payment/insufficient-funds': 'Fonds insuffisants',
  'payment/stripe-error': 'Erreur de paiement',

  // Call
  'call/provider-unavailable': 'Prestataire non disponible',
  'call/twilio-error': 'Erreur de telephonie',
  'call/timeout': 'Appel expire',

  // General
  'network/offline': 'Vous etes hors ligne',
  'permission/denied': 'Permission refusee',
};
```

### 25.2 ErrorBoundary Global

```typescript
// Capture des erreurs React non gerees
class GlobalErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log vers Sentry (si configure)
    // Affichage page d'erreur user-friendly
  }
}
```

---

## 26. SECURITE

### 26.1 Regles Firestore

```javascript
// firestore.rules (resume)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Utilisateurs: lecture/ecriture de son propre profil
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Providers: lecture publique, ecriture proprietaire
    match /providers/{providerId} {
      allow read: if true;
      allow write: if request.auth.uid == resource.data.userId;
    }

    // Appels: acces client ou provider concerne
    match /calls/{callId} {
      allow read: if request.auth.uid == resource.data.clientId
                  || request.auth.uid == resource.data.providerId;
    }

    // Admin: acces restreint
    match /admin_config/{doc} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}
```

### 26.2 Variables Sensibles

Toutes les cles API sont stockees dans:
- **Frontend**: Variables d'environnement Vite (`VITE_*`)
- **Backend**: Firebase Secrets (`firebase functions:secrets:set`)

### 26.3 Protection CSRF/XSS

- Tokens CSRF sur les formulaires
- Sanitization des inputs
- Content Security Policy headers
- HttpOnly cookies pour sessions sensibles

---

---

## 27. STRATEGIES DE CACHE ET PERFORMANCE

### 27.1 Cache Client-Side (localStorage)

**Fichier:** `sos/src/utils/firestoreCache.ts`

| Type de donnees | TTL | Utilisation |
|-----------------|-----|-------------|
| SUBSCRIPTION_PLANS | 24h | Plans d'abonnement |
| COUNTRIES | 7 jours | Liste des pays |
| HELP_CATEGORIES | 1h | Categories d'aide |
| TRIAL_CONFIG | 1h | Configuration essai |

**Fonctionnalites:**
- Invalidation par version (incrementer `CACHE_VERSION`)
- Nettoyage automatique des caches corrompus
- Reduction de 30-50% des lectures Firestore

### 27.2 IndexedDB Offline Storage

**Fichier:** `sos/src/services/offlineStorage.ts`

**Stores:**
- `USER_PROFILE`: Profil utilisateur
- `MESSAGES`: Conversations avec index (conversationId, timestamp, synced)
- `FAVORITES`: Favoris prestataires
- `PROVIDERS`: Cache prestataires avec expiration
- `PENDING_ACTIONS`: File d'attente hors ligne
- `SETTINGS`: Parametres de l'application

**Fonctionnalites:**
- Synchronisation background avec Service Worker
- Nettoyage automatique des entrees expirees
- Estimation quota stockage

### 27.3 TanStack Query (React Query)

**Fichier:** `Outil-sos-expat/src/lib/queryClient.ts`

```typescript
{
  staleTime: 5 * 60 * 1000,  // 5 minutes - donnees fraiches
  gcTime: 30 * 60 * 1000,    // 30 minutes - conservation cache
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 2
}
```

**Hierarchie des cles de requete:**
- `users`: all, detail(id), byEmail
- `providers`: all, detail(id), byType, stats
- `bookings`: all, list, detail(id), byProvider, byStatus
- `conversations`: all, detail(id), messages

### 27.4 Redis Server-Side Cache

**Fichier:** `Outil-sos-expat/functions/src/services/cache/`

**Modes (par priorite):**
1. **ioredis** - Cloud Memorystore (GCP production)
2. **Upstash** - Redis Serverless (API REST)
3. **Memory Cache** - Fallback en memoire

**Configuration TTL:**

| Type | TTL | Utilisation |
|------|-----|-------------|
| AI_CHAT | 1h | Reponses IA chat |
| AI_BOOKING | 30min | Reponses IA booking |
| AI_PROVIDER | 24h | Donnees provider IA |
| MODERATION | 7 jours | Cache moderation |
| QUOTA | 24h | Quotas utilisateurs |
| RATE_LIMIT | 60s | Limitation de debit |
| CIRCUIT_BREAKER | 5min | Protection services |

### 27.5 Rate Limiting

**Limites par tier:**

| Action | Free | Premium | Enterprise |
|--------|------|---------|------------|
| AI_CHAT | 20/h | 50/h | 200/h |
| AI_CHAT_PROVIDER | 100/h | 200/h | 500/h |
| BOOKING_CREATE | 10/h | 20/h | 50/h |
| MESSAGE_SEND | 50/h | 100/h | 500/h |
| API_GENERAL | 200/h | 500/h | 2000/h |
| AUTH_LOGIN | 10/5min | - | - |
| WEBHOOK_INGEST | 100/min | - | - |

**Headers de reponse:**
- `X-RateLimit-Limit`: Total autorise
- `X-RateLimit-Remaining`: Restant
- `X-RateLimit-Reset`: Timestamp reset
- `Retry-After`: Secondes avant retry

### 27.6 Firestore TTL (Nettoyage automatique)

**Fichier:** `sos/firebase/functions/src/utils/firestoreTTL.ts`

| Collection | TTL | But |
|------------|-----|-----|
| error_logs | 30 jours | Tracking erreurs |
| agent_tasks | 7 jours | Taches terminees |
| system_logs | 14 jours | Evenements systeme |
| notifications | 30 jours | Notifications lues |
| user_sessions | 7 jours | Sessions |
| rate_limits | 1 jour | Tracking rate limit |
| cache | 1 jour | Cache temporaire |
| connection_logs | 90 jours | Conformite RGPD |
| ultra_debug_logs | 7 jours | Debug (~20€/mois economises) |

### 27.7 Optimisations Performance

**Fichier:** `sos/src/utils/performance.ts`

**Preloading adaptatif:**
- Detection format WebP
- Ressources differenciees mobile/desktop
- Support dark mode

**Lazy loading images:**
- IntersectionObserver avec marge 50px
- Attributs data-src/data-srcset
- Transitions CSS automatiques

**Chargement adaptatif:**
- Detection API Connection (slow-2g, 2g, 3g, 4g)
- Detection appareils bas de gamme (≤2 cores)
- Mode save-data
- Qualite image reduite (q=60) sur connexions lentes

**Metriques Web Vitals:**
- LCP (Largest Contentful Paint)
- FID/INP (First Input Delay / Interaction to Next Paint)
- CLS (Cumulative Layout Shift)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)

### 27.8 Resume des Couches de Cache

| Couche | Technologie | TTL | Invalidation | Cas d'usage |
|--------|-------------|-----|--------------|-------------|
| Client (localStorage) | Natif | 1h-7j | Manuel/TTL | Donnees statiques |
| Client (IndexedDB) | IndexedDB | Variable | TTL/Manuel | Offline, messages |
| Client (Query) | TanStack Query | 5m/30m | Auto/Manuel | Requetes API |
| Serveur (Redis) | ioredis/Upstash | 60s-7j | Pattern deletion | IA, quotas, rate limit |
| Serveur (Firestore) | TTL natif | 1j-90j | Auto deletion | Logs, sessions |

---

## 28. SYSTEME DE TYPES TYPESCRIPT

### 28.1 Vue d'Ensemble

Le projet dispose d'un système de typage complet avec **240+ types et interfaces** organisés par domaine.

**Localisation des fichiers types:**

| Application | Chemin | Description |
|-------------|--------|-------------|
| Outil IA SOS | `Outil-sos-expat/src/types/` | Types dashboard interne |
| SOS Expat | `sos/src/types/` | Types plateforme principale |

### 28.2 Types par Domaine

#### Dashboard Interne (`Outil-sos-expat/src/types/index.ts`)

**Types Utilisateur:**
- `User` - Staff avec rôles (user, admin, superadmin)
- `UserPermission` - Contrôle d'accès granulaire

**Gestion des Demandes:**
- `ClientRequest` - Demande client/booking
  - Status: pending, in_progress, completed, cancelled
  - Priority: low, medium, high, urgent
  - expertRole: avocat, expatrie, fiscal, immobilier, visa

**Suivi IA:**
- `GPTResponse` - Enregistrement réponse IA
  - chatHistory, tokensUsed, cost, confidence
  - Modèles: GPT-4, GPT-4-turbo

**Chat:**
- `ChatMessage` - Message conversation
  - Role: user, assistant, system
  - Metadata: model, temperature, responseTime

**Prompts:**
- `GPTPrompt` - Templates de prompts
  - Tons: formal, empathetic, professional, technical, friendly

**Analytics:**
- `AppStats` - Métriques dashboard complètes

**Configuration:**
- `SystemConfig` - Paramètres plateforme
- `AuditLog` - Tracking actions
- `Notification` - Notifications système
- `APIResponse<T>` - Wrapper réponse API générique

#### Modèle Firestore (`Outil-sos-expat/src/types/firestore.ts`)

**Alias de Base:**
```typescript
type UserRole = 'user' | 'provider' | 'admin' | 'superadmin';
type ProviderType = 'lawyer' | 'expat';
type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'unpaid' | 'paused';
type BookingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
type LLMProvider = 'claude' | 'gpt' | 'perplexity';
```

**Documents Principaux:**

| Document | Description | Champs Clés |
|----------|-------------|-------------|
| `UserDocument` | Profil utilisateur complet | subscription, activeProviderId, notifications |
| `ProviderDocument` | Profil prestataire | languages, specialties, aiQuotas, verification |
| `BookingDocument` | Réservation service | client/provider info, status history, AI flags |
| `ConversationDocument` | Conversation multi-messages | bookingContext, summary, status |
| `MessageDocument` | Message individuel | role, source, LLM metadata, tokens |
| `SubscriptionDocument` | Abonnement utilisateur | plan, features, Stripe integration |

**Helpers:**
```typescript
type WithId<T> = T & { id: string };
type WithDates<T> = /* Timestamp to Date conversion */;
type ForWrite<T> = /* Data for Firestore writes */;
```

#### Provider Domain (`sos/src/types/provider.ts`)

**Types de Prestataires:**
```typescript
type ProviderType = 'lawyer' | 'expat' | 'accountant' | 'notary' |
  'tax_consultant' | 'real_estate' | 'translator' | 'hr_consultant' |
  'financial_advisor' | 'insurance_broker';

type ValidationStatus = 'pending' | 'in_review' | 'approved' |
  'rejected' | 'changes_requested';
```

**Interface Provider:**
- Champs de base: id, name, type, country, languages, specialties
- Paiements: Stripe Connect, PayPal Commerce, KYC status
- Disponibilité: availability, currentCallSessionId, busySince
- Profils AAA: isAAA, consolidatedPayoutAccount
- Suspension: isSuspended, suspendedAt, suspendReason
- Validation: validationStatus, requestedChanges

**Fonctions Helper:**
- `normalizeProvider()` - Standardiser données
- `validateProvider()` - Type guard
- `createDefaultProvider()` - Factory function

#### Système d'Abonnement (`sos/src/types/subscription.ts`)

**Tiers d'Abonnement:**
```typescript
type SubscriptionTier = 'trial' | 'basic' | 'standard' | 'pro' | 'unlimited';
type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' |
  'expired' | 'paused' | 'suspended';
type QuotaBlockReason = 'trial_expired' | 'trial_calls_exhausted' |
  'quota_exhausted' | /* etc */;
```

**Configuration Plan:**
- `SubscriptionPlan` - Définition complète du plan
  - Noms/descriptions multilingues
  - Prix mensuel/annuel avec réductions
  - Limite appels IA (-1 = illimité)
  - Price IDs Stripe par devise/période

**Suivi Usage:**
- `AiUsage` - Usage période courante
- `AiCallLog` - Log individuel appel API
  - Type: chat, stream, suggestion, translation
  - Provider: claude, gpt, perplexity
  - Tokens: input, output, total

**Constantes:**
```typescript
const UNLIMITED_FAIR_USE_LIMIT = 500;
const DEFAULT_AI_CALLS_LIMIT = { trial: 3, basic: 50, standard: 150, pro: 500 };
```

#### Pricing Service (`sos/src/types/pricing.ts`)

**Structure Tarification:**
```typescript
interface PricingNode {
  connectionFeeAmount: number;  // Frais plateforme
  providerAmount: number;       // Gain prestataire
  totalAmount: number;          // Prix client
  currency: 'eur' | 'usd';
  duration: number;             // Minutes
}

interface PricingOverrideNode {
  enabled: boolean;
  startsAt?: number;            // Début promo
  endsAt?: number;              // Fin promo
  stackableWithCoupons: boolean;
  strikeTargets: 'provider' | 'default' | 'both';
}
```

#### Finance Administration (`sos/src/types/finance.ts`)

**Statuts Paiement:**
```typescript
type PaymentStatus = 'pending' | 'processing' | 'paid' | 'captured' |
  'failed' | 'refunded' | 'partially_refunded' | 'disputed' | 'cancelled';
type PaymentMethod = 'stripe' | 'paypal' | 'card' | 'sepa' | 'bank_transfer';
type TransactionType = 'call_payment' | 'subscription' | 'refund' |
  'payout' | 'adjustment' | 'dispute';
```

**Records Admin:**
- `AdminPaymentRecord` - Transaction paiement complète
- `AdminSubscriptionRecord` - Abonnement vue admin
- `AdminRefundRecord` - Enregistrement remboursement
- `AdminDisputeRecord` - Chargeback/litige
- `AdminPayoutRecord` - Versement prestataire

**KPIs Finance:**
```typescript
interface FinanceKPIs {
  revenueByPeriod: Record<string, number>;
  transactionsByStatus: Record<PaymentStatus, number>;
  transactionsByMethod: Record<PaymentMethod, number>;
  refundRate: number;
  disputeRate: number;
  subscriptionMRR: number;
  topCountries: Array<{ country: string; revenue: number }>;
}
```

#### Sécurité (`sos/src/types/security.ts`)

**Types d'Alertes (15+):**
```typescript
type SecurityAlertType =
  'brute_force_detected' | 'suspicious_payment' | 'unusual_login_location' |
  'multiple_failed_payments' | 'account_takeover_attempt' | /* etc */;

type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
type AlertStatus = 'pending' | 'acknowledged' | 'investigating' |
  'resolved' | 'escalated' | 'false_positive';
```

**Interface SecurityAlert:**
- Type, severity, status
- Context (IP, country, user, amount)
- Aggregation (count, first/last occurrence)
- Actions automatiques (block_ip, suspend_user)
- Résolution tracking

#### Comptabilité Internationale (`sos/src/types/accounting.ts`) - 1906 lignes

**Systèmes Fiscaux:**
```typescript
type TaxSystemType = 'VAT' | 'GST' | 'SALES_TAX' | 'NONE';
type LegalSystemType = 'COMMON_LAW' | 'CIVIL_LAW' | 'MIXED' | 'OTHER';
type FilingFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
type FilingFormat = 'XML' | 'CSV' | 'PDF' | 'JSON' | 'SAF-T';
```

**Configuration Pays:**
- `CountryTaxConfig` - Configuration fiscale complète
  - Codes ISO, devise, timezone
  - Taux TVA et seuils
  - Règles B2B et validation TVA
  - Services taxables par catégorie

**Calcul Taxes:**
- `TaxCalculationInput` - Entrée calcul
- `TaxCalculationResult` - Résultat avec ventilation

**Comptabilité Double Entrée:**
- `JournalEntry` - Écriture comptable
- `JournalEntryLine` - Ligne débit/crédit
- `Account` - Plan comptable
- `AccountingPeriod` - Période comptable

**Déclarations Fiscales:**
- `TaxFiling` - Déclaration complète
  - Types: VAT_RETURN, EC_SALES_LIST, INTRASTAT, OSS_RETURN

### 28.3 Patterns de Conception

| Pattern | Description | Exemple |
|---------|-------------|---------|
| **Suffix Document** | Structure Firestore complète | `UserDocument`, `BookingDocument` |
| **Suffix Input** | Données création | `CreateSubscriptionInput` |
| **Suffix Update** | Données mise à jour partielle | `UpdateProviderRequest` |
| **Support Multilingue** | 9 langues supportées | `MultilingualText`, `LocalizedName` |
| **Abstraction Paiement** | Stripe vs PayPal unifié | `paymentGateway` field |
| **Conversion Devise** | Display ↔ Stripe | `toDisplayCurrency()`, `toStripeCurrency()` |
| **Type Guards** | Validation runtime | `isPaymentStatus()`, `validateProvider()` |
| **Dénormalisation** | Stats embarquées | `ProviderStats` dans `ProviderDocument` |
| **Types Admin** | Champs sensibles séparés | `ProviderAdmin` extends `Provider` |
| **Audit Trail** | Historique changements | `AuditLogDocument` |

### 28.4 Statistiques Types

| Domaine | Fichier | Types | Interfaces | Fonctions Helper |
|---------|---------|-------|------------|------------------|
| Dashboard Interne | index.ts | 16 | 16 | 0 |
| Modèle Firestore | firestore.ts | 35+ | 25 | 6 |
| Provider | provider.ts | 5 | 4 | 6 |
| Subscription | subscription.ts | 20 | 15 | 3 |
| Pricing | pricing.ts | 3 | 3 | 0 |
| Finance | finance.ts | 30+ | 20 | 8 |
| Security | security.ts | 25+ | 20 | 3 |
| Accounting | accounting.ts | 80+ | 60+ | 20+ |
| Contexts | contexts/types.ts | 20+ | 18 | 0 |
| **TOTAL** | - | **240+** | **180+** | **46+** |

### 28.5 Intégrations

**Firebase/Firestore:**
- Gestion Timestamp intégrée
- Helpers `WithId<T>`, `ForWrite<T>`
- Constantes de collection

**Paiements:**
- Champs Stripe Connect et KYC
- Intégration PayPal Commerce
- Gestion webhooks

**Services IA:**
- Support multi-provider (Claude, GPT, Perplexity)
- Tracking tokens et coûts
- Gestion quotas

**Internationalisation:**
- 9 langues supportées
- Contenu localisé dans tous les types majeurs
- Configurations spécifiques par pays

**Conformité Multi-Pays:**
- Support VAT/GST/Sales Tax
- Stratégies de prix par pays
- Suivi seuils d'enregistrement

---

## 29. SYSTEME D'AVIS ET NOTATIONS

### 29.1 Soumission des Avis

**Composant:** `sos/src/components/review/ReviewForm.tsx`

**Formulaire d'Avis:**
- Sélecteur d'étoiles 1-5 avec feedback visuel
- Zone de texte commentaire (obligatoire)
- Validation: commentaire non-vide, utilisateur authentifié, note ≥ 1
- Protection: un seul avis par appel par utilisateur

**Flux de Soumission:**
1. Utilisateur remplit le formulaire
2. Appel à `createReviewRecord()` (`sos/src/utils/firestore.ts`)
3. Vérification anti-doublon via transaction
4. Publication automatique immédiate

**Données Capturées:**
```typescript
{
  clientId: string;           // ID utilisateur
  clientName: string;         // Nom complet
  clientCountry: string;      // Pays actuel
  providerId: string;         // ID prestataire
  callId: string;             // ID appel associé
  rating: 1-5;                // Note étoiles
  comment: string;            // Commentaire texte
  serviceType: 'lawyer_call' | 'expat_call';
  helpfulVotes: 0;            // Votes utiles (initial)
  reportedCount: 0;           // Signalements (initial)
}
```

### 29.2 Calcul des Notes

**Hook:** `useAggregateRating` (`sos/src/hooks/useAggregateRating.ts`)

**Structure des Données:**
```typescript
interface AggregateRatingData {
  ratingValue: number;        // Moyenne (1-5), arrondi 1 décimale
  ratingCount: number;        // Nombre total de notes
  reviewCount: number;        // Avis avec commentaires
  bestRating: 5;
  worstRating: 1;
  distribution: {             // Répartition par niveau
    1: number; 2: number; 3: number; 4: number; 5: number;
  };
  recentReviews: Array<...>;  // 10 derniers avis pour schema
}
```

**Logique de Calcul:**
1. Récupérer tous les avis publiés (status='published', isPublic=true)
2. Sommer les notes et compter les avis
3. Formule: `moyenne = totalNotes / nombreAvis` (arrondi 1 décimale)
4. Par défaut: 5.0 si aucun avis

**Cache:**
- TTL: 5 minutes
- Invalidation: manuelle via `refetch()` ou automatique avec listener temps réel

### 29.3 Auto-Publication

**Fichier:** `sos/src/utils/firestore.ts:836`

**Comportement:**
- Tous les avis sont publiés immédiatement
- Pas de modération préalable (status='published', isPublic=true)

**Mise à Jour Statistiques Prestataire:**
```javascript
// Recalcul de la moyenne glissante
newRating = (currentRating * currentCount + newReview.rating) / (currentCount + 1)
```

**Collections mises à jour:**
- `sos_profiles` - Profil prestataire
- `users` - Document utilisateur

### 29.4 Affichage des Avis

**Composant:** `sos/src/components/review/Reviews.tsx`

**Mode Résumé (mode="summary"):**
- Note moyenne avec étoiles
- Nombre total d'avis
- Barres de distribution
- Pourcentages par niveau

**Mode Liste (mode="list"):**
- Carte par avis avec:
  - Nom client + badge "Early Beta User"
  - Type de service (Lawyer/Expat)
  - Étoiles avec support demi-étoiles
  - Pays client avec icône
  - Date formatée par locale
  - Texte commentaire complet
  - Boutons: "Utile" + "Signaler"

**Couleurs Distribution:**
| Étoiles | Couleur |
|---------|---------|
| 1★ | Rouge (#E45756) |
| 2★ | Orange (#F58518) |
| 3★ | Jaune (#EECA3B) |
| 4★ | Vert (#54A24B) |
| 5★ | Bleu (#4C78A8) |

### 29.5 Dashboard Prestataire

**Composant:** `sos/src/pages/DashboardReviews.tsx`

- Polling toutes les 90 secondes (économie coûts)
- Affiche tous les avis publiés du prestataire connecté
- Tri par date décroissante
- Query: `providerId == user.id AND status == "published"`

### 29.6 Administration des Avis

**Composant:** `sos/src/pages/admin/AdminReviews.tsx`

**Statuts Possibles:**
| Status | Description |
|--------|-------------|
| `pending` | En attente d'approbation |
| `published` | Visible publiquement |
| `hidden` | Masqué (modération) |
| `rejected` | Rejeté par admin |

**Actions Admin:**
- Approuver/Rejeter
- Basculer visibilité
- Supprimer définitivement
- Opérations en masse
- Gestion signalements

**Filtres Avancés:**
- Type de service
- Pays client
- Plage de notes (min/max)
- Avis signalés uniquement
- Votes utiles minimum
- Recherche ID prestataire/client

**Analytics Dashboard:**
- KPIs: total, moyenne, publiés/en attente/masqués
- Tendance multi-années
- Histogramme distribution
- Répartition mensuelle
- Top pays par volume
- Top prestataires par nombre d'avis
- Alertes qualité (pics de 1★)

### 29.7 Système de Votes Utiles

**Fichier:** `sos/src/utils/firestore.ts:943-947`

```typescript
export const incrementReviewHelpfulCount = async (reviewId: string) => {
  await updateDoc(reviewRef, { helpfulVotes: increment(1) });
};
```

- Affichage: "Utile (15)"
- Comptage atomique via `increment()`
- Disponible avec `showControls=true`

### 29.8 Système de Signalement

**Fichier:** `sos/src/utils/firestore.ts:949-964`

**Flux de Signalement:**
1. Incrémenter `reportedCount` sur l'avis
2. Créer document dans `review_reports`

```typescript
{
  reviewId: string;
  reason: string;
  reporterId?: string;
  status: "pending";
  createdAt: serverTimestamp();
}
```

### 29.9 Outils de Maintenance

**Scripts Disponibles:**

| Script | Description |
|--------|-------------|
| `syncReviewCounts.ts` | Synchronise `reviewCount` entre collections |
| `generateMissingReviews.ts` | Génère avis synthétiques pour tests |
| `fix-aaa-reviews.js` | Corrige profils de test AAA |

**Génération Synthétique:**
- Distribution réaliste (50% 5★, 30% 4★, etc.)
- Noms clients aléatoires par pays
- Dates chronologiques depuis création profil
- Commentaires multilingues

### 29.10 Fichiers du Système

| Composant | Chemin |
|-----------|--------|
| Formulaire Avis | `sos/src/components/review/ReviewForm.tsx` |
| Affichage Avis | `sos/src/components/review/Reviews.tsx` |
| Opérations CRUD | `sos/src/utils/firestore.ts` (lignes 836-1137) |
| Hook Agrégation | `sos/src/hooks/useAggregateRating.ts` |
| Admin Avis | `sos/src/pages/admin/AdminReviews.tsx` |
| Dashboard Avis | `sos/src/pages/DashboardReviews.tsx` |
| Témoignages | `sos/src/pages/Testimonials.tsx` |
| Widget Témoignages | `sos/src/components/home/TestimonialsSection.tsx` |

### 29.11 Points Clés

1. **Auto-Publication**: Tous les avis publiés immédiatement (pas d'approbation manuelle)
2. **Mise à Jour Atomique**: Moyennes recalculées en transaction
3. **Double Mise à Jour**: `sos_profiles` et `users` synchronisés
4. **Filtres Cohérents**: Toutes les requêtes utilisent `status='published' AND isPublic=true`
5. **Optimisation Performance**: Cache 5min, polling 90s au lieu de temps réel
6. **Anti-Fraude**: Un avis par utilisateur par appel (vérifié en transaction)
7. **Support Multilingue**: Formatage dates selon locale

---

## 30. SYSTEME DE NAVIGATION

### 30.1 Vue d'Ensemble

Le projet utilise deux systèmes de navigation distincts:

| Application | Type | Description |
|-------------|------|-------------|
| SOS Expat (`/sos`) | Plateforme publique | Navigation client-facing responsive |
| Outil IA SOS (`/Outil-sos-expat`) | Portail admin/prestataire | Dashboard avec sidebar |

### 30.2 Composants SOS Expat

#### Header (`sos/src/components/layout/Header.tsx`)

**Type:** Navigation fixe en haut (z-50)

**Architecture:**
- Responsive: Desktop (hidden lg+) et Mobile (lg:hidden)
- Style glassmorphism avec backdrop blur
- Support 9 langues

**Éléments de Navigation:**

| Position | Éléments |
|----------|----------|
| Gauche | Home 🏠, View Profiles 👥, Testimonials 💬 |
| Centre | Bouton SOS Call (rouge gradient, proéminent) |
| Droite | How It Works ⚡, Pricing 💎 |

**Système Auth:**
- Déconnecté: Boutons Login/Register
- Connecté: Menu utilisateur avec dropdown
- Photo profil ou avatar fallback
- Rôles: admin, lawyer, expat, client

**Language Dropdown:**
- 9 composants drapeaux personnalisés (pas emojis)
- Langue actuelle avec point rouge
- Desktop: dropdown aligné droite
- Mobile: modal plein écran

**Toggle Disponibilité (Prestataires):**
- Statut Online/Offline (vert/rouge)
- État verrouillé si approbation en attente
- Messages d'erreur auto-dismiss (5 sec)
- Sync: `sos_profiles` et `users`

#### Footer (`sos/src/components/layout/Footer.tsx`)

**Type:** Footer contenu avec liens légaux

**Fonctionnalités:**
- Chargement dynamique documents légaux depuis Firestore
- Cache 6 heures avec versioning localStorage
- Grid 3 colonnes (desktop), 1 colonne (mobile)
- Sections contact et réseaux sociaux

**Sections:**
- Services: SOS Call, Pricing, Experts, Testimonials
- Support: FAQ, Contact, Help Center, Service Status
- Liens légaux dynamiques
- Bouton scroll-to-top

#### Dashboard Layout (`sos/src/components/layout/DashboardLayout.tsx`)

**Type:** Layout wrapper pour pages authentifiées

**Desktop:**
- Sidebar gauche (sticky, 1 colonne):
  - En-tête profil avec photo/gradient
  - Navigation principale (6 items)
  - Widget quota IA (lawyers/expats)
  - Toggle disponibilité
- Contenu droite (3 colonnes)

**Mobile:**
- Navigation bottom bar (fixe)
- Drawer latéral (slide-in gauche)
- 4-5 items principaux + menu overflow
- Widget quota IA mini dans drawer

**Items Menu:**
1. Profile 👤
2. Calls 📱
3. Invoices 📄
4. Reviews ⭐
5. Messages 💬
6. Favorites 🔖
7. AI Assistant 🤖 (Prestataires)
8. Subscription 💳 (Prestataires)

#### Mobile Bottom Nav (`sos/src/components/dashboard/MobileBottomNav.tsx`)

**Type:** Navigation fixe en bas (lg:hidden)

**Style:** Glassmorphism avec accent rouge

**Fonctionnalités:**
- 5-6 items avec icône + label
- Indicateur actif: fond rouge + point bas
- Support badges (messages non lus)
- Tabs internes via query params
- Accès direct outil IA
- Touch-friendly (44px min)
- Safe area pour iOS notch

#### Mobile Side Drawer (`sos/src/components/dashboard/MobileSideDrawer.tsx`)

**Type:** Menu slide-in depuis droite (lg:hidden)

**Fonctionnalités:**
- En-tête info utilisateur avec avatar
- 6 items menu principal
- Section items IA (2 items)
- Lien admin
- Bouton logout
- Widget progression quota IA
- Fermeture: Escape, backdrop click
- Prévention scroll body

### 30.3 Composants Outil IA SOS

#### Bottom Navigation (`Outil-sos-expat/src/components/navigation/BottomNavigation.tsx`)

**Type:** Navigation mobile fixe (lg:hidden)

**Items par défaut:**
```
/admin → Dashboard
/admin/dossiers → Dossiers
/admin/messages → Messages (avec badge)
/admin/profil → Profile
```

**Fonctionnalités:**
- Système de badges (compteur notifications)
- Haptic feedback (si supporté)
- Matching route exact optionnel
- Respect `prefers-reduced-motion`
- Safe area iOS
- Targets touch 44px min

#### Mobile Drawer (`Outil-sos-expat/src/components/navigation/MobileDrawer.tsx`)

**Type:** Drawer slide-in depuis gauche (lg:hidden)
**Largeur:** 300px / 85vw

**Contenu:**
- Section profil utilisateur
- Provider switcher intégré
- Language selector intégré
- Toggle mode preview (admin)
- 6 items menu principal
- 7 items admin-only
- Bouton logout

**Items Admin-Only:**
```
Providers, Access Management, Team, Countries, Settings, Audit, Test AI
```

#### Admin Sidebar (`Outil-sos-expat/src/admin/components/AdminSidebar.tsx`)

**Type:** Sidebar gauche persistante (desktop only)
**Largeur:** 256px (étendu) / 72px (replié)

**Sections Navigation:**

| Section | Items |
|---------|-------|
| Overview | Dashboard, Analytics |
| Management | Providers, Multi-Providers, Dossiers, Team |
| Configuration | Countries, AI Settings, Settings |
| Security | Audit Logs |

**Fonctionnalités:**
- Thème sombre (slate-900)
- Repliable avec chevron toggle
- Language selector
- Info utilisateur
- Support badges
- Indicateur état actif

### 30.4 Patterns et Standards

#### Système de Routing

- **Routes multilingues:** `/{locale}/{route-traduit}`
- **9 langues:** FR, EN, ES, DE, RU, PT, CH, HI, AR
- **Hook:** `useLocaleNavigate` pour navigation traduite
- **Query params:** Tabs internes

#### Détection État Actif

| Plateforme | Indicateur |
|------------|------------|
| Desktop | Gradient highlight + barre accent gauche |
| Mobile | Fond rouge + point indicateur bas |

**Méthodes:** `aria-current="page"`, path matching, flag exact

#### Accessibilité

- **ARIA Labels:** Tous items navigation
- **HTML Sémantique:** `<nav>`, `<aside>`, `role="navigation"`
- **Clavier:** Escape, Tab, focus visible (outline rouge)
- **Screen Reader:** aria-label, aria-expanded
- **Touch Mobile:** Min 44px × 44px targets

#### Breakpoints Responsive

| Breakpoint | Valeur | Usage |
|------------|--------|-------|
| lg | 1024px | Switch desktop/mobile principal |
| md | 768px | Layouts grid |
| sm | 640px | Petits écrans |
| Default | - | Mobile-first |

#### Animations

- **Transitions:** 300ms (respect prefers-reduced-motion)
- **Animations:** Fade-in, scale, slide-in
- **États Actifs:** Transitions couleur smooth, scale icône

#### Thèmes par Rôle

| Rôle | Gradient Header |
|------|-----------------|
| Admin | Slate |
| Lawyer | Rouge-orange |
| Expat | Bleu-indigo |
| Client | Violet-rose |

### 30.5 Hiérarchie Composants

**Plateforme Principale (/sos):**
```
Layout
├── Header (fixe haut)
│   ├── Logo + Branding
│   ├── Navigation Items
│   ├── SOS Call CTA
│   ├── LanguageDropdown
│   ├── AvailabilityToggle
│   └── UserMenu
├── Page Content
├── MobileBottomNav (mobile)
├── MobileSideDrawer (mobile)
└── Footer
```

**Dashboard (/Outil-sos-expat):**
```
AdminLayout
├── AdminSidebar (desktop)
├── BottomNavigation (mobile)
├── MobileDrawer (mobile)
├── Page Content
└── Language Selector
```

### 30.6 Fonctionnalités Spéciales

#### Accès Outil IA
- Accès direct depuis menu header
- Vérification abonnement requis
- Intégration drawer mobile
- Raccourci bottom nav
- Gestion état loading

#### Toggle Statut Prestataire
- Toggle online/offline dans header
- Vérification approbation requise
- Feedback visuel état verrouillé
- Messages erreur auto-dismiss
- Sync Firestore (`sos_profiles`)

#### Gestion Abonnement
- Widget quota mini dans sidebar
- Barre progression avec couleurs
- Badge statut trial
- Affichage jours restants
- Bouton CTA upgrade

### 30.7 Optimisations Performance

| Technique | Description |
|-----------|-------------|
| Lazy Loading | Images avec `loading="lazy"` |
| Caching | Documents légaux footer (6h) |
| Memoization | Composants avec `memo()` |
| Code Splitting | Splitting par route via lazy imports |
| Scroll | Event listeners passifs |
| Debouncing | Dropdown langue |

### 30.8 Fichiers Clés

| Composant | Fichier | Type |
|-----------|---------|------|
| Header | `sos/src/components/layout/Header.tsx` | Fixe haut |
| Footer | `sos/src/components/layout/Footer.tsx` | Footer contenu |
| Dashboard Layout | `sos/src/components/layout/DashboardLayout.tsx` | Layout grid |
| Mobile Bottom Nav | `sos/src/components/dashboard/MobileBottomNav.tsx` | Nav mobile |
| Mobile Drawer SOS | `sos/src/components/dashboard/MobileSideDrawer.tsx` | Menu mobile |
| Bottom Navigation | `Outil-sos-expat/src/components/navigation/BottomNavigation.tsx` | Nav mobile |
| Mobile Drawer Outil | `Outil-sos-expat/src/components/navigation/MobileDrawer.tsx` | Menu mobile |
| Admin Sidebar | `Outil-sos-expat/src/admin/components/AdminSidebar.tsx` | Sidebar desktop |

---

## 31. HOOKS REACT PERSONNALISES

### 31.1 Vue d'Ensemble

Le projet contient **25+ hooks personnalisés** répartis entre les deux applications.

**Emplacements:**
- SOS Expat: `sos/src/hooks/`
- Multilingual: `sos/src/multilingual-system/hooks/`
- Outil IA SOS: `Outil-sos-expat/src/hooks/`

### 31.2 Hooks SOS Expat - Détection & Device

#### useDeviceDetection
**Fichier:** `sos/src/hooks/useDeviceDetection.ts`

**Purpose:** Détection complète device/viewport avec breakpoints

**Retourne:**
```typescript
{
  // État device
  isMobile, isTablet, isDesktop, screenWidth, screenHeight, orientation,
  // Détections statiques
  isTouchDevice, isIOS, isAndroid, isSafari, isChrome, supportsHover, pixelRatio,
  // Props calculées
  isSmallMobile, isLargeMobile, isSmallTablet, isLargeTablet, isSmallDesktop,
  // Utilitaires
  matchesMedia(), debugInfo
}
```

**Features:** Mobile-first, SSR-safe, resize debounced

#### useMediaQuery
**Fichier:** `sos/src/pages/Dashboard/AiAssistant/hooks/useMediaQuery.ts`

**Purpose:** Détection media queries simple pour UI responsive

### 31.3 Hooks SOS Expat - Navigation & i18n

#### useLocalizedRedirect
**Fichier:** `sos/src/hooks/useLocalizedRedirect.ts`

**Retourne:** `{ redirect, redirectToSosCall, lang }`

**Usage:** Redirection vers routes localisées

#### useLocaleNavigate
**Fichier:** `sos/src/multilingual-system/hooks/useLocaleNavigate.ts`

**Purpose:** Navigation locale-aware avec préfixe automatique

**Features:** Exemption routes admin/marketing, préservation query string

**Hooks liés:** `useCurrentLocale()`, `useLocalePath()`

### 31.4 Hooks SOS Expat - Abonnements & Quotas

#### useSubscription
**Fichier:** `sos/src/hooks/useSubscription.ts`

**Retourne:**
```typescript
{
  subscription, plan, plans,
  isActive, isTrialing, isPastDue, isCanceled,
  daysUntilRenewal, cancelAtPeriodEnd,
  cancelSubscription(), reactivateSubscription(),
  openBillingPortal(), initializeTrial(), refresh()
}
```

**Features:** Firestore listeners, cache plans, intégration Stripe

#### useSubscriptionPlans
**Fichier:** `sos/src/hooks/useSubscriptionPlans.ts`

**Paramètres:** `providerType: 'lawyer' | 'expat_aidant'`

**Retourne:** `{ plans, isLoading, error, getPlanById(), getPlanByTier(), getRecommendedPlan() }`

#### useQuota
**Fichier:** `sos/src/hooks/useQuota.ts`

**Retourne:**
```typescript
{
  currentUsage, limit, remaining, percentUsed,
  isUnlimited, isExhausted, isNearLimit, // >= 80%
  checkAccess(), incrementUsage(), refresh()
}
```

#### useAiQuota
**Fichier:** `sos/src/hooks/useAiQuota.ts`

**Retourne:**
```typescript
{
  usage, quotaCheck, trialConfig,
  currentUsage, limit, remaining, usagePercentage, isUnlimited,
  isInTrial, trialDaysRemaining, trialCallsRemaining, trialProgress,
  canMakeAiCall, isQuotaExhausted, isNearQuotaLimit,
  blockReason, // Clés i18n pour messages
  refreshQuota(), checkCanMakeCall()
}
```

### 31.5 Hooks SOS Expat - Accès & Auth

#### useAiToolAccess
**Fichier:** `sos/src/hooks/useAiToolAccess.ts`

**Retourne:**
```typescript
{
  hasAccess, isLoading, isAccessing, error, hasForcedAccess,
  accessAiTool(),           // Ouvre outil IA avec SSO
  redirectToSubscription(), // Redirige vers plans
  handleAiToolClick()       // Action smart (accès ou redirect)
}
```

**Features:** Override accès forcé, gestion popup blocker, SSO

#### useFCM
**Fichier:** `sos/src/hooks/useFCM.ts`

**Purpose:** Firebase Cloud Messaging (push notifications)

**Effets:** Demande permission, stocke token FCM dans Firestore

### 31.6 Hooks SOS Expat - SEO & Analytics

#### useSnippetGenerator
**Fichier:** `sos/src/hooks/useSnippetGenerator.ts`

**Paramètres:** `provider, locale`

**Retourne:** `{ snippets, jsonLD }` pour Google Rich Snippets

#### useAggregateRating
**Fichier:** `sos/src/hooks/useAggregateRating.ts`

**Options:** `realtime`, `maxRecentReviews`, `serviceType`, `cacheTTL`

**Retourne:**
```typescript
{
  data: { ratingValue, ratingCount, distribution, recentReviews },
  loading, error, refetch()
}
```

#### usePriceTracing
**Fichier:** `sos/src/hooks/usePriceTracing.ts`

**Retourne:** `getTraceAttributes(serviceType, currency, providerOverride)`

**Usage:** Attributs data-* pour tracking analytics prix

#### useMetaPixelTracking
**Fichier:** `sos/src/hooks/useMetaPixelTracking.ts`

**Retourne:**
```typescript
{
  trackLead(), trackCheckoutStart(), trackViewContent(),
  trackContact(), trackRegistration(), trackCustom(),
  isPixelAvailable
}
```

### 31.7 Hooks SOS Expat - Finance & Monitoring

#### useFinanceData
**Fichier:** `sos/src/hooks/useFinanceData.ts`

**Sub-hooks:** `useFinanceData`, `useFinanceKPIs`, `useSubscriptions`, `useRefunds`, `useDisputes`

**Features:** Queries Firestore, filtres debounced, KPIs calculés

#### useCostMonitoring
**Fichier:** `sos/src/hooks/useCostMonitoring.ts`

**Sub-hooks:** `useCostMonitoring`, `useCostAlerts`, `useRateLimitStats`

**Retourne:**
```typescript
{
  metrics, alerts, rateLimits,
  totalCost, criticalAlertsCount, blockedEndpointsCount,
  globalRejectionRate, fetchMetrics(), refresh(), clearCache()
}
```

### 31.8 Hooks SOS Expat - PWA & Partage

#### usePWAInstall
**Fichier:** `sos/src/hooks/usePWAInstall.ts`

**Retourne:**
```typescript
{
  canPrompt, shouldShowBanner, installed,
  install(),       // Déclenche prompt install
  closeForAWhile() // Masque 24h
}
```

#### useWebShare
**Fichier:** `sos/src/hooks/useWebShare.ts`

**Retourne:**
```typescript
{
  isSupported, canShareFiles,
  share(data),         // Partage via native ou clipboard
  copyToClipboard(),
  shareProvider(),     // Partage profil prestataire
  shareApp(referral)   // Partage app pour parrainage
}
```

### 31.9 Hooks SOS Expat - Multi-Provider

#### useMultiProviderDashboard
**Fichier:** `sos/src/hooks/useMultiProviderDashboard.ts`

**Retourne:**
```typescript
{
  accounts, stats,
  isLoading, isAuthenticated, error,
  authenticate(password), logout(),
  refresh(), openAiTool(providerId, bookingId),
  // Chat
  conversations, chatLoading,
  loadConversations(), sendMessage(), clearConversations()
}
```

**Features:** App Firebase secondaire, tokens session, validation password

### 31.10 Hooks Outil IA SOS - Data Fetching

#### useFirestoreQuery
**Fichier:** `Outil-sos-expat/src/hooks/useFirestoreQuery.ts`

**Sub-hooks:**
```typescript
useFirestoreDocument<T>(collection, docId, options)  // Document unique
useFirestoreCollection<T>(collection, constraints)   // Collection avec filtres
useFirestoreRealtime<T>(collection, docId)           // Listener temps réel
useCreateDocument(), useUpdateDocument(), useDeleteDocument() // CRUD
// Domain-specific
useProviderBookings(), useAllBookings(), useBooking(),
useProviders(), useProvider(),
useBookingConversations(), useConversationMessages()
```

**Features:** Intégration TanStack Query, conversion timestamps, invalidation cache

#### useSearch
**Fichier:** `Outil-sos-expat/src/hooks/useSearch.ts`

**Paramètres:** `data: T[]`, `options: { searchFields, debounceMs, caseInsensitive }`

**Retourne:**
```typescript
{
  searchTerm, debouncedSearchTerm, setSearchTerm(), clearSearch(),
  filteredData, isSearching
}
```

### 31.11 Hooks Outil IA SOS - Chat IA

#### useStreamingChat
**Fichier:** `Outil-sos-expat/src/hooks/useStreamingChat.ts`

**Sub-hooks:** `useStreamingChat()`, `useStreamingText()` (animation curseur)

**Retourne:**
```typescript
{
  messages, sendMessage(text), streaming, error,
  progress, // { step, total, stepName }
  clearError(), clearMessages()
}
```

**Callbacks:** `onStart`, `onChunk`, `onDone`, `onError`, `onProgress`

**Features:** Server-Sent Events, tracking progression, fallback endpoint classique

### 31.12 Hooks Outil IA SOS - Responsive

#### useMediaQuery (Outil version)
**Fichier:** `Outil-sos-expat/src/hooks/useMediaQuery.ts`

**Exports:**
```typescript
useMediaQuery()
useBreakpoint()
useIsMobile()
useIsTabletOrBelow()
usePrefersReducedMotion()
usePrefersDarkMode()
usePrefersHighContrast()
useOrientation()
```

**Features:** SSR-safe, resize debounced, détection préférences utilisateur

### 31.13 Tableau Récapitulatif

| Hook | Catégorie | Purpose | App |
|------|-----------|---------|-----|
| useDeviceDetection | Device | Viewport & device detection | SOS |
| usePriceTracing | Analytics | Attributs données prix | SOS |
| useLocalizedRedirect | Navigation | Redirections localisées | SOS |
| useSnippetGenerator | SEO | JSON-LD snippets | SOS |
| useWebShare | Sharing | API Web Share native | SOS |
| useSubscriptionPlans | Subscription | Gestion plans | SOS |
| useQuota | Quota | Tracking usage IA | SOS |
| usePWAInstall | PWA | Prompt installation | SOS |
| useAggregateRating | SEO | Agrégation ratings | SOS |
| useFinanceData | Finance | Données paiement & KPI | SOS |
| useCostMonitoring | Monitoring | Coûts & rate limits | SOS |
| useMetaPixelTracking | Analytics | Tracking Facebook | SOS |
| useSubscription | Subscription | Abonnement utilisateur | SOS |
| useAiQuota | Quota | Gestion quota IA | SOS |
| useAiToolAccess | Access Control | SSO outil IA | SOS |
| useFCM | Notifications | Push notifications | SOS |
| useMultiProviderDashboard | Dashboard | Gestion multi-provider | SOS |
| useLocaleNavigate | Navigation | Routing multilingue | SOS |
| useFirestoreQuery | Data | Firestore + TanStack Query | Outil |
| useStreamingChat | Chat | Chat SSE | Outil |
| useMediaQuery | Responsive | Media queries | Outil |
| useSearch | Search | Recherche debounced | Outil |

### 31.14 Bonnes Pratiques

Tous les hooks suivent:
- **Cleanup proper:** useEffect avec return cleanup
- **TypeScript:** Typage complet des paramètres et retours
- **Memoization:** useMemo/useCallback pour optimisation
- **Error handling:** Gestion erreurs avec états dédiés
- **SSR-safe:** Vérification window/document avant accès

---

## 32. TAXONOMIE DES SERVICES

### 32.1 Types de Prestataires

Le système reconnaît **deux types principaux** de prestataires:

| Type | Description | Durée défaut | Prix défaut |
|------|-------------|--------------|-------------|
| **LAWYER** | Professionnels juridiques | 20 minutes | 49 EUR |
| **EXPAT** | Conseillers expatriés | 30 minutes | 19 EUR |

**Types étendus** (définis mais non actifs):
```typescript
type ProviderType = 'lawyer' | 'expat' | 'accountant' | 'notary' |
  'tax_consultant' | 'real_estate' | 'translator' | 'hr_consultant' |
  'financial_advisor' | 'insurance_broker';
```

### 32.2 Spécialités Avocats - Taxonomie Hiérarchique

**Fichier:** `sos/src/data/lawyer-specialties.ts`

**24 catégories principales**, chacune avec **3-7 sous-spécialités**:

| Code | Catégorie | Sous-spécialités |
|------|-----------|------------------|
| **URG** | Urgences | Assistance pénale, Accidents, Rapatriement |
| **CUR** | Services Courants | Traductions, Litiges mineurs, Démarches admin |
| **IMMI** | Immigration & Travail | Visas, Permis séjour, Naturalisation, Golden Visa, Nomade digital |
| **TRAV** | Droit du Travail International | Droits expatriés, Licenciement, Sécurité sociale, Retraite |
| **IMMO** | Immobilier | Achat/vente étranger, Location, Litiges |
| **FISC** | Fiscalité | Déclarations internationales, Double imposition, Optimisation |
| **FAM** | Famille | Mariage/divorce international, Garde transfrontalière, Scolarité |
| **PATR** | Patrimoine | Successions internationales, Gestion patrimoine, Testaments |
| **ENTR** | Entreprise | Création entreprise, Investissements, Import/export |
| **ASSU** | Assurances & Protection | Assurances internationales, Protection données, Contentieux |
| **CONS** | Consommation & Services | Achats défectueux, Services non conformes, E-commerce |
| **BANK** | Banque & Finance | Comptes bancaires, Virements, Services financiers |
| **ARGT** | Problèmes d'Argent | Salaires impayés, Arnaques, Surendettement, Frais abusifs |
| **RELA** | Problèmes Relationnels | Voisinage, Conflits travail, Médiation, Diffamation |
| **TRAN** | Transport | Problèmes aériens, Bagages, Accidents |
| **SANT** | Santé | Erreurs médicales, Remboursements, Droit médical |
| **NUM** | Numérique | Cybercriminalité, Contrats en ligne, Protection numérique |
| **VIO** | Violences & Discriminations | Harcèlement, Violences domestiques, Discriminations |
| **IP** | Propriété Intellectuelle | Contrefaçons, Brevets/marques, Droits d'auteur |
| **ENV** | Environnement | Nuisances, Permis construire, Urbanisme |
| **COMP** | Droit Comparé International | Charia, Common Law, Droit asiatique/africain |
| **EDUC** | Éducation & Reconnaissance | Diplômes, Équivalences, Qualifications |
| **RET** | Retour au Pays | Rapatriement biens, Réintégration fiscale, Transfert patrimoine |
| **OTH** | Autre | Préciser besoin |

### 32.3 Types d'Aide Expatriés - Taxonomie Plate

**Fichier:** `sos/src/data/expat-help-types.ts`

**40+ catégories** (structure plate, sans sous-catégories):

**Services Core Expatrié (25 items):**
- S'installer, Démarches administratives, Recherche logement
- Compte bancaire, Système santé, Éducation/écoles
- Transport, Recherche emploi, Création entreprise
- Fiscalité locale, Culture/intégration, Visa/immigration
- Assurances, Téléphone/internet, Alimentation
- Loisirs, Sports, Sécurité, Urgences
- Problèmes argent, Problèmes relationnels, Problèmes divers
- Déménagement international, Animaux, Permis conduire
- Communauté expatriés, Soutien psychologique

**Voyageurs & Touristes (6 items):**
- Arnaque/vol, Perte documents, Assistance consulaire
- Hébergement urgence, Traduction, Problèmes voyage

**Nomades Digitaux (3 items):**
- Travail distance/Freelance, Coworking/coliving, Fiscalité nomade

**Étudiants Internationaux (4 items):**
- Études étranger, Logement étudiant, Bourses, Stages

**Retraités Expatriés (3 items):**
- Retraite étranger, Santé seniors, Pension internationale

**Familles Expatriées (3 items):**
- Scolarité enfants, Garde enfants, Activités enfants

### 32.4 Système de Filtrage Multi-Dimensionnel

**Dimensions de Filtrage:**

| Dimension | Options | Description |
|-----------|---------|-------------|
| Type Prestataire | All, Lawyer, Expat | Catégorie principale |
| Pays | 195+ pays | Pays d'intervention |
| Langues | 100+ langues | Multi-sélection |
| Disponibilité | Available, Busy, Offline | Statut temps réel |
| Spécialité | 24 catégories | Pour avocats |
| Type d'Aide | 40+ catégories | Pour expatriés |
| Expertise | Années, Avis, Rating | Filtres avancés |

### 32.5 Parcours Découverte Services

**Fichier:** `sos/src/pages/SOSCall.tsx`

**Mode A: Wizard Guidé (Mobile-First)**
```
Étape 1: Type prestataire (Lawyer / Expat / All)
     ↓
Étape 2: Sélection pays
     ↓
Étape 3: Sélection langues
```
- Indicateur de progression 3 étapes
- Navigation précédent/suivant

**Mode B: Barre Filtres (Desktop)**
- Recherche temps réel avec suggestions
- Dropdowns: Type, Pays, Langues (multi), Statut
- Bouton reset filtres
- Compteur filtres actifs

### 32.6 Affichage Carte Prestataire

**Éléments affichés:**
- Nom prestataire
- Badge type avec icône (⚖️ avocat, 🌍 expat)
- Avatar avec indicateur disponibilité
- Rating et nombre d'avis
- Années d'expérience
- Tags langues parlées
- Spécialités/Types d'aide
- Prix par session
- Durée appel
- Boutons: Voir profil / Appeler

### 32.7 Structure Données Firestore

**Collection:** `sos_profiles`

```typescript
interface Provider {
  id: string;
  name: string;
  type: 'lawyer' | 'expat';
  country: string;                    // Pays origine
  interventionCountries?: string[];   // Pays d'intervention
  languages: string[];                // Codes langues
  specialties: string[];              // Codes catégories (URG, CUR, etc.)
  rating: number;                     // 0-5
  reviewCount: number;
  yearsOfExperience: number;
  isOnline: boolean;
  availability?: 'available' | 'busy' | 'offline';
  avatar: string;
  description: string;
  price: number;
  duration?: number;
  isVisible: boolean;
  isApproved: boolean;
  isBanned: boolean;
  isActive: boolean;
}
```

### 32.8 Localisation Taxonomie

**9 langues interface supportées:**
FR, EN, ES, DE, PT, RU, ZH, AR, HI

**Pattern traduction:**
```typescript
{
  code: "IMMI",
  labelFr: "Immigration et Travail",
  labelEn: "Immigration & Work",
  labelEs: "Inmigración y Trabajo",
  labelDe: "Einwanderung & Arbeit",
  // ... autres langues
}
```

### 32.9 Algorithmes de Matching

**Matching Pays:**
1. Vérifie `interventionCountries` en premier
2. Fallback sur champ `country` origine
3. Support matching partiel avec normalisation accents
4. Résolution noms pays multi-langue

**Matching Langues:**
- Prestataire doit avoir au moins une langue sélectionnée
- Support multi-sélection (union matching)

**Matching Spécialités:**
- Avocats: compare spécialités sélectionnées vs array prestataire
- Expatriés: compare types aide vs array prestataire

### 32.10 Fichiers Données Clés

| Fichier | Contenu | Enregistrements |
|---------|---------|-----------------|
| `src/types/provider.ts` | Définition interface Provider | - |
| `src/data/lawyer-specialties.ts` | Taxonomie spécialités juridiques | 24 catégories, 90+ items |
| `src/data/expat-help-types.ts` | Catégories aide expatriés | 40+ items |
| `src/data/languages-spoken.ts` | Données langues référence | 100+ langues |
| `src/data/countries.ts` | Données pays référence | 195+ pays |
| `src/pages/SOSCall.tsx` | Page principale navigation | - |
| `src/components/sos-call/DesktopFilterBar.tsx` | UI filtres desktop | - |
| `src/components/sos-call/GuidedFilterWizard.tsx` | Wizard filtres mobile | - |

### 32.11 Résumé

**Taxonomie multi-dimensionnelle:**
- **2 types prestataires** principaux (Lawyer, Expat)
- **24 catégories juridiques** avec ~90 sous-spécialités (hiérarchique)
- **40+ catégories aide expatrié** (structure plate)
- **195+ pays** d'intervention
- **100+ langues** parlées
- **Filtrage multi-dimensionnel** (type, pays, langue, disponibilité, expertise)
- **Localisation 9 langues** pour tous éléments taxonomie
- **Recherche intelligente** multi-langue, insensible aux accents

---

## 33. FONCTIONNALITES SOCIALES

### 33.1 Composants de Partage Social

**Emplacement:** `sos/src/components/share/` et `sos/src/components/provider/`

#### ProviderSocialShare.tsx (Mobile-First)

**Plateformes supportées:**
- WhatsApp, Facebook Messenger, Facebook, Twitter/X
- Pinterest, Instagram, TikTok
- Email, Copie lien, API Web Share native

**Fonctionnalités:**
- Bottom sheet mobile avec geste drag-to-close
- Row icônes desktop avec tooltips et dropdown "plus"
- Support 9 langues (FR, EN, ES, DE, PT, RU, AR, HI, ZH)
- Messages partage adaptés culturellement avec ratings
- Haptic feedback sur mobile
- Fallback API Web Share vers bottom sheet

#### SocialShare.tsx (Enterprise)

**Plateformes supportées (12+):**
- WhatsApp, Facebook, Messenger, X/Twitter
- LinkedIn, Telegram, Pinterest
- Instagram, TikTok
- Email, SMS, Copie lien, QR Code

**Variantes:** `compact`, `full`, `inline`

**Fonctionnalités:**
- Modal bottom sheet avec catégorisation plateformes
- Messages personnalisables (limite 280 car)
- Carte preview profil prestataire
- Génération et téléchargement QR code
- Swipe-to-dismiss mobile
- Groupement par catégorie (Messaging, Social, Professional, Utility)
- Paramètres UTM tracking automatiques

#### ShareButton.tsx (Utilitaire)

**Variantes:** primary, secondary, ghost, icon
**Tailles:** sm, md, lg
**États feedback:** idle, shared, copied, error

**Helpers:**
- `ShareProviderButton` - Partage profils prestataires
- `ShareAppButton` - Partage app avec codes parrainage

### 33.2 Authentification Sociale

**Fichiers:** `sos/src/contexts/AuthContext.tsx`, `sos/src/utils/auth.ts`

#### Google OAuth

- Firebase Authentication avec Google Provider
- Méthodes: `signInWithRedirect` et `signInWithPopup`
- Tracking tentatives dans métriques
- Fallback redirect si popup bloqué

**Méthodes Auth Supportées:**
| Méthode | Description |
|---------|-------------|
| Email/Password | Standard |
| Google OAuth | Login social principal |
| Phone Number | Vérification SMS avec reCAPTCHA |
| Firebase Anonymous | Utilisateurs trial |

**Note:** Pas de Facebook Login OAuth implémenté (uniquement tracking Pixel)

### 33.3 Intégrations Réseaux Sociaux

#### Meta Pixel (Facebook)

**Fichier:** `sos/src/utils/metaPixel.ts`
**Pixel ID:** 2204016713738311

**Événements Trackés:**
- PageView, Lead, Purchase, InitiateCheckout
- Contact, CompleteRegistration, StartRegistration
- Search, ViewContent, AddToCart, AddPaymentInfo
- Événements custom

**Advanced Matching:**
- Normalisation email et téléphone (E.164)
- Données utilisateur normalisées (nom, ville, pays, zip)
- ID externe (Firebase UID)
- Capture cookies FBP/FBC pour attribution

**Consentement:** Tracking SANS consentement explicite requis

#### Google Ads

**Fichier:** `sos/src/utils/googleAds.ts`
**Config:** `VITE_GOOGLE_ADS_CONVERSION_ID`

**Conversion Tracking:**
- Achats avec labels conversion
- Génération leads, SignUp
- Checkout initiation, Payment info
- Search, View content, Custom events

**Enhanced Conversions:**
- Hashing SHA256 données utilisateur
- Capture GCLID depuis URL
- Respect Consent Mode v2 (consentement marketing requis)

**Intégration GA4:**
- purchase, generate_lead, sign_up
- begin_checkout, search, view_item

### 33.4 Analytics Partage

**Fichier:** `sos/src/hooks/useShareAnalytics.ts`

**Événements Trackés:**
- Plateforme de partage utilisée
- Provider ID et type
- User agent et referrer
- Timestamps tous événements
- Intégration Firebase Analytics

**Événements Custom:**
- Ouverture sheet partage
- Édition message partage
- Vue/téléchargement QR code
- Usage API Web Share native
- Analytics par plateforme

### 33.5 Hook Web Share API

**Fichier:** `sos/src/hooks/useWebShare.ts`

**Fonctions:**
```typescript
{
  isSupported: boolean;       // Détection API native
  canShareFiles: boolean;     // Capacité partage fichiers
  shareProvider();            // Partage profils prestataires
  shareApp(referralCode);     // Partage app avec parrainage
  copyToClipboard();          // Fallback clipboard
}
```

### 33.6 Gestion Consentement

- Intégration cookie banner
- Tracking consentement marketing
- Meta Pixel: track toujours (consentement optionnel)
- Google Ads: respect Consent Mode v2

### 33.7 Détails Implémentation

**Gestion Plateformes Spécifiques:**

| Plateforme | Méthode |
|------------|---------|
| Instagram/TikTok | Copie clipboard (pas de liens directs) |
| WhatsApp | Messages pré-remplis avec info prestataire |
| Email | mailto: avec sujet et corps |
| SMS | Protocole sms: avec message |

**Génération QR Code:**
- API externe: qrserver.com
- Génération dynamique

**Déduplication Événements:**
- Prévention double tracking achat via sessionStorage

**Paramètres UTM:**
- Ajout automatique aux URLs partagées

### 33.8 Structure Fichiers

```
sos/src/
├── components/
│   ├── share/
│   │   └── ProviderSocialShare.tsx  # Mobile-first
│   ├── provider/
│   │   └── SocialShare.tsx          # Enterprise
│   └── common/
│       └── ShareButton.tsx          # Utilitaire
├── hooks/
│   ├── useWebShare.ts               # API Web Share
│   └── useShareAnalytics.ts         # Analytics
├── utils/
│   ├── metaPixel.ts                 # Facebook Pixel
│   ├── googleAds.ts                 # Google Ads
│   └── auth.ts                      # Auth utils
└── contexts/
    └── AuthContext.tsx              # Firebase + Google OAuth
```

### 33.9 Résumé

**Écosystème partage social robuste:**
- 2 bibliothèques composants partage (simplifié + enterprise)
- Intégrations complètes (Meta Pixel, Google Ads)
- Authentification Google OAuth (principale méthode sociale)
- Approche analytics-driven avec tracking détaillé
- UX optimisée mobile avec API share native
- Support 9 langues toutes fonctionnalités partage

**Absent:** Facebook Login OAuth, LinkedIn Login, autres authentifications sociales

---

## 34. DESIGN RESPONSIVE MOBILE

### 34.1 Breakpoints Tailwind CSS

**Approche Mobile-First:** Styles par défaut pour mobile, progressivement améliorés.

| Breakpoint | Pixels | Usage |
|------------|--------|-------|
| xs | 0px | Mobile base |
| sm | 640px | Grands phones, petites tablettes |
| md | 768px | Tablettes |
| lg | 1024px | Laptops, desktops |
| xl | 1280px | Grands desktops |
| 2xl | 1536px | Ultra-wide |

### 34.2 Configuration Viewport & PWA

**Fichier:** `index.html`

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0,
  viewport-fit=cover, user-scalable=yes, minimum-scale=1.0, maximum-scale=5.0" />
```

**Features:**
- `viewport-fit=cover` - Support appareils notch (iPhone X+)
- `user-scalable=yes` - Zoom pour accessibilité
- `maximum-scale=5.0` - Limite zoom raisonnable

**PWA Support:**
- Apple touch icons (76px, 120px, 152px, 180px)
- `apple-mobile-web-app-capable: yes`
- Theme color adaptif light/dark

### 34.3 Hook Détection Breakpoints

**Fichier:** `Outil-sos-expat/src/hooks/useMediaQuery.ts`

```typescript
// Hooks principaux
useMediaQuery(query)        // Détection media query générique
useBreakpoint()             // Info breakpoint détaillée
useIsMobile()               // Check simple mobile (< 768px)
useIsTabletOrBelow()        // Tablette ou moins (< 1024px)

// Détection préférences
usePrefersReducedMotion()   // Préférences accessibilité
usePrefersDarkMode()        // Mode sombre
usePrefersHighContrast()    // Contraste élevé
useOrientation()            // Portrait ou paysage

// Retour BreakpointResult
{
  isMobile: boolean,        // < 640px
  isSmallTablet: boolean,   // 640-768px
  isTablet: boolean,        // 768-1024px
  isDesktop: boolean,       // >= 1024px
  isLargeDesktop: boolean,  // >= 1280px
  isUltraWide: boolean,     // >= 1536px
  current: Breakpoint,
  width: number,
  isTouchDevice: boolean    // (pointer: coarse)
}
```

**Optimisations:** SSR-safe, resize debounced (100ms), détection touch

### 34.4 Composants Mobile-Spécifiques

#### Bottom Navigation
- Fixe en bas, caché sur lg+ (`lg:hidden`)
- Touch targets: min 44px (Apple HIG)
- Badges animés, indicateur actif
- Haptic feedback (`navigator.vibrate`)
- Safe area support (`env(safe-area-inset-bottom)`)
- Respect `prefers-reduced-motion`

#### Mobile Drawer
- Slide-in depuis gauche
- Backdrop click to close
- Gestion touche Escape
- Focus trap
- Prévention scroll body
- Provider switcher intégré
- Largeur: `w-[300px] max-w-[85vw]`

### 34.5 Design Tokens Responsives

**Fichier:** `Outil-sos-expat/src/styles/design-tokens.css`

```css
/* Tokens composants */
--header-height: 56px;      /* Mobile */
--header-height: 64px;      /* Desktop (lg+) */
--bottom-nav-height: 64px;
--sidebar-width: 280px;
--sidebar-width-collapsed: 72px;

/* Touch targets */
--touch-target-min: 44px;        /* Apple HIG minimum */
--touch-target-comfortable: 48px;
--touch-target-large: 56px;

/* Safe areas */
--safe-area-top: env(safe-area-inset-top, 0px);
--safe-area-bottom: env(safe-area-inset-bottom, 0px);
--safe-area-left: env(safe-area-inset-left, 0px);
--safe-area-right: env(safe-area-inset-right, 0px);
```

### 34.6 Composants Container Responsifs

**Fichier:** `Outil-sos-expat/src/components/ui/responsive-container.tsx`

#### ResponsiveContainer
```typescript
<ResponsiveContainer
  maxWidth="lg"         // max-width: 1024px
  padding="md"          // px-4 sm:px-6 md:px-8
  safeArea="all"        // Insets safe area
/>
```

#### ResponsiveGrid
```typescript
<ResponsiveGrid
  cols={1}              // Mobile: 1 colonne
  colsSm={2}            // 640px+: 2 colonnes
  colsMd={3}            // 768px+: 3 colonnes
  colsLg={4}            // 1024px+: 4 colonnes
  gap="md"
/>
```

#### ResponsiveStack
```typescript
<ResponsiveStack
  direction="vertical"  // Direction base
  switchAt="md"         // Switch à horizontal à 768px
/>
```

### 34.7 Patterns Grid Dashboard

**StatsGrid:**
```html
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- 2 colonnes mobile, 4 desktop -->
</div>
```

**QuickActions:**
```typescript
const gridColsClass = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
}[columns];
```

### 34.8 Support Safe Area & Notch

**Classes CSS:**
```css
.safe-area-top     { padding-top: env(safe-area-inset-top); }
.safe-area-bottom  { padding-bottom: env(safe-area-inset-bottom); }
.safe-area-x       { padding-left/right: env(...); }
.safe-area-all     { tous insets; }
.pb-safe-area      { PWA bottom padding; }
.min-h-screen-safe { Height avec safe areas; }
```

### 34.9 Accessibilité Touch Targets

```css
.touch-target       { min-width/height: 44px; }  /* Apple HIG */
.touch-target-sm    { 36px; }
.touch-target-md    { 44px; }
.touch-target-lg    { 48px; }
.touch-target-xl    { 56px; }

@media (pointer: coarse) {
  .touch-target-auto { min-width/height: 44px; }
  .touch-expand::after { /* Expand click area */ }
}
```

### 34.10 Préférences Motion & Animation

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

.touch-scale-down:active { transform: scale(0.97); }
.touch-opacity:active { opacity: 0.8; }

@media (hover: hover) {
  .hover-lift:hover { transform: translateY(-2px); }
}
```

### 34.11 Typographie & Espacement Responsifs

```css
/* Typographie responsive */
.text-responsive { font-size: 0.875rem; }  /* 14px mobile */
@media (min-width: 640px) {
  .text-responsive { font-size: 1rem; }    /* 16px tablet+ */
}

/* Espacement responsive */
.gap-responsive { gap: 0.75rem; }          /* Mobile */
@media (min-width: 640px) { gap: 1rem; }   /* sm+ */
@media (min-width: 768px) { gap: 1.5rem; } /* md+ */

/* Padding responsive */
.p-responsive { padding: 1rem; }           /* Mobile */
@media (min-width: 640px) { padding: 1.5rem; }
@media (min-width: 768px) { padding: 2rem; }
```

### 34.12 Support RTL (Right-to-Left)

```css
[dir="rtl"] { text-align: right; }
[dir="rtl"] .flex-row { flex-direction: row-reverse; }
[dir="rtl"] .rtl-flip { transform: scaleX(-1); }
[dir="rtl"] .left-0 { left: auto; right: 0; }
[dir="rtl"] .ml-4 { margin-left: 0; margin-right: 1rem; }
```

### 34.13 Polices Multilingues

```css
/* Chinois */
[lang="zh"] { font-family: 'Noto Sans SC', Inter, sans-serif; }

/* Hindi */
[lang="hi"] {
  font-family: 'Noto Sans Devanagari', Inter, sans-serif;
  line-height: 1.8;  /* Scripts complexes */
}

/* Arabe */
[lang="ar"] { font-family: 'Noto Sans Arabic', Inter, sans-serif; }

/* Russe */
[lang="ru"] { font-family: Inter, Roboto, sans-serif; }
```

### 34.14 Hauteur Viewport Dynamique

```css
#root {
  min-height: 100vh;   /* Fallback */
  min-height: 100dvh;  /* Dynamic viewport height (mobile) */
}
```

Empêche la navigation bottom d'être cachée par l'UI navigateur mobile.

### 34.15 Résumé Fonctionnalités Mobile

| Fonctionnalité | Implémentation | Breakpoint |
|----------------|----------------|------------|
| Bottom Navigation | Fixe, slide-in | Hidden lg+ |
| Mobile Drawer | Sidebar slide-in | Hidden lg+ |
| Touch Targets | Min 44x44px | All sizes |
| Safe Areas | CSS env() | iOS/Android |
| Grid Layout | 1 col → 4 cols | xs → lg |
| Text Responsive | 14px → 16px+ | sm |
| Spacing Responsive | Progressive | sm/md/lg |
| RTL Support | Auto-flip | dir="rtl" |
| Dark Mode | CSS variables | prefers-color-scheme |
| Reduced Motion | Respect a11y | prefers-reduced-motion |
| Touch Feedback | Scale/opacity | (pointer: coarse) |
| Vibration | Haptic nav | navigator.vibrate |
| Viewport Fit | Notch support | viewport-fit=cover |
| Multilingual | Polices langue | [lang] attribute |

---

## 35. ACCESSIBILITE (A11Y)

### 35.1 Infrastructure Accessibilité Dédiée

**Emplacement:** `sos/src/pages/Dashboard/AiAssistant/components/a11y/`

#### Composants A11Y

**VisuallyHidden.tsx:**
- Texte screen reader only
- Composant polymorphique
- Mode focusable pour skip links
- CSS WCAG 2.1 AA (clip-path)

**SkipLink.tsx (WCAG 2.4.1):**
- Variantes: default, dark, high contrast
- Smooth scroll support
- Multi-langue (en, fr, es, de)
- Préconfiguré: SkipToMainContent, SkipToNavigation, SkipToSearch

**LiveRegion.tsx:**
- Modes: polite vs assertive
- Rôles: status, alert, log, timer, progressbar
- Annonces atomiques
- Debounce et auto-clear

### 35.2 Utilitaires A11Y

**Fichier:** `sos/src/pages/Dashboard/AiAssistant/accessibility/index.ts` (600+ lignes)

#### Navigation Clavier
```typescript
useFocusTrap()         // Piège focus avec Escape
useFocusRestore()      // Restauration focus après modal
useSkipLink()          // Navigation skip links
useListNavigation()    // Flèches avec type-ahead
useRovingTabIndex()    // Pattern roving tab index
```

#### Support Lecteur Écran
```typescript
useAnnouncer()              // Annonces polite/assertive
useLoadingAnnouncement()    // États loading
announce()                  // Annonces directes live region
```

#### Helpers ARIA
```typescript
getModalAriaProps()         // role, aria-modal, aria-labelledby
getPopupTriggerAriaProps()  // aria-haspopup, aria-expanded
getMenuAriaProps()          // Attributs conteneur menu
getMenuItemAriaProps()      // aria-selected, aria-disabled
getLiveRegionAriaProps()    // aria-live, aria-atomic
getLoadingAriaProps()       // aria-busy, aria-describedby
```

#### Validation Contraste
```typescript
getContrastRatio()              // Calcul contraste WCAG
meetsContrastRequirement()      // Vérification AA/AAA
```

### 35.3 Navigation Clavier

**Header Component:**
- Touch targets min 44x44px (Apple HIG)
- Indicateurs focus tous éléments interactifs
- Dropdowns accessibles clavier
- aria-expanded pour état menu
- Support Enter et Space

**Button Component:**
- Focus ring avec indicateurs visibles
- Support touch-manipulation
- aria-busy pour états loading
- aria-disabled pour boutons désactivés

**Modal Component:**
- Focus trap à l'ouverture
- Escape pour fermer
- Restauration focus à fermeture
- aria-modal="true"
- Gestion TabIndex

### 35.4 Labels & Descriptions ARIA

**Implémentation Complète:**
| Attribut | Usage |
|----------|-------|
| `aria-label` | Labels descriptifs boutons icône |
| `aria-labelledby` | Association éléments à headings |
| `aria-describedby` | Descriptions additionnelles inputs |
| `aria-hidden="true"` | SVGs décoratifs, icônes, emojis |
| `aria-pressed` | États boutons toggle |
| `aria-expanded` | États dropdowns/menus |
| `aria-haspopup` | Indicateurs trigger menu |
| `aria-disabled` | État désactivé boutons |
| `aria-busy` | Indicateurs état loading |
| `role` | Rôles sémantiques explicites |

### 35.5 Support Lecteur Écran

**Texte Screen Reader Only:**
```css
.sr-only {
  width: 1px;
  height: 1px;
  clip-path: inset(50%);
  position: absolute;
}
```

**Live Regions Contenu Dynamique:**
- Status updates annoncés politely
- Erreurs annoncées assertively (role="alert")
- Messages chat (role="log")
- Updates progression (role="progressbar")

**HTML Sémantique:**
- Hiérarchie headings correcte
- Labels formulaire associés
- Landmarks navigation
- Zone contenu principal identifiée

### 35.6 Touch Targets

**Composant TouchTarget:** `Outil-sos-expat/src/components/ui/touch-target.tsx`

| Taille | Dimension | Usage |
|--------|-----------|-------|
| Small | min-h-[36px] | Éléments secondaires |
| Medium | min-h-[44px] | Standard (Apple HIG) |
| Large | min-h-[52px] | CTAs principaux |

**Features:**
- TouchTarget wrapper component
- TouchTargetExpand pour expansion invisible
- useTouchTarget hook pour styles

### 35.7 Contraste Couleur & Accessibilité Visuelle

**Indicateurs Focus:**
- Tous boutons: ring 2px avec offset
- États focus haute visibilité
- Couleurs ring adaptées background

**Vérification Contraste:**
- Calculateur ratio contraste intégré
- Support niveaux WCAG AA et AAA
- Différenciation texte grand/normal

**Usage Couleurs:**
| Contexte | Couleur |
|----------|---------|
| Primary | #DC2626 (Rouge) |
| Focus rings | Indigo, Black, White |
| High contrast | Support mode HC |

### 35.8 Accessibilité Mobile

**Optimisation Touch:**
- `touch-action: manipulation` tous éléments interactifs
- Suppression délai tap
- `-webkit-tap-highlight-color: transparent`

**Menu Mobile:**
- Overlay pleine hauteur
- Escape pour fermer
- Gestion focus dans menu
- aria-expanded
- role="dialog"

### 35.9 Internationalisation & RTL

**Support RTL (Layout.tsx):**
- Attribut dir HTML dynamique
- Classes CSS RTL
- Annonces accessibilité localisées
- Labels skip links multilingues

**Accessibilité Multilingue:**
- Tous labels ARIA traduits (9 langues)
- Sélecteur langue navigation clavier
- Attribut lang sur élément HTML

### 35.10 Accessibilité Formulaires

**PhoneInput Component:**
- Sélection pays via composant select accessible
- Validation numéro téléphone
- Associations label claires
- Support état disabled

**Éléments Formulaire:**
- Tous inputs avec labels associés (htmlFor)
- Indicateurs champs requis
- Messages erreur annoncés
- Types input appropriés (email, tel, password)

### 35.11 Animations & Préférences Motion

**Hook Préférence Motion:**
```typescript
usePrefersReducedMotion() // Respect 'prefers-reduced-motion: reduce'
```

**Smooth Scrolling:**
- Skip links avec smooth scroll
- scroll-behavior: smooth CSS
- RequestAnimationFrame performance

### 35.12 Gestion Erreurs & Feedback

**États Erreur:**
- role="alert" pour messages erreur
- aria-live="assertive" annonces immédiates
- Descriptions erreur claires
- Instructions récupération

**États Loading:**
- aria-busy="true" pendant requêtes
- Spinner visuel avec alternative texte
- Annonces lecteur écran
- Prévention soumissions multiples

**Feedback Succès:**
- Annonces live region
- Confirmation visuelle
- Gestion focus après action réussie

### 35.13 Conformité WCAG 2.1

**Niveau Cible:** AA (avec nombreuses features AAA)

**Standards Implémentés:**

| Critère | Niveau | Description |
|---------|--------|-------------|
| 2.1.1 | A | Clavier - Navigation complète |
| 2.1.2 | A | Pas de piège clavier |
| 2.4.1 | A | Bypass Blocks - Skip links |
| 2.4.3 | A | Ordre focus logique |
| 2.4.7 | AA | Focus visible clair |
| 3.2.1 | A | Pas changement focus inattendu |
| 3.2.2 | A | Exigences input claires |
| 4.1.2 | A | Nom, Rôle, Valeur - ARIA |
| 4.1.3 | AA | Messages statut - Live regions |

### 35.14 Fichiers Clés Accessibilité

| Fichier | Purpose | Features |
|---------|---------|----------|
| `accessibility/index.ts` | Utilitaires core a11y | 600+ lignes hooks/helpers |
| `VisuallyHidden.tsx` | Texte screen reader | Polymorphique, focusable |
| `SkipLink.tsx` | Skip navigation | Multi-langue, variantes |
| `LiveRegion.tsx` | Annonces dynamiques | Polite/assertive, debounced |
| `Button.tsx` | Boutons accessibles | Focus rings, aria-busy |
| `Modal.tsx` | Sémantique dialog | Focus trap, aria-modal |
| `touch-target.tsx` | Taille touch | 44px minimum, wrapper |

### 35.15 Résumé Accessibilité

**Implémentation Complète:**
- ✅ Bibliothèque composants A11Y dédiée (800+ lignes)
- ✅ Navigation clavier complète
- ✅ Attributs ARIA partout
- ✅ Optimisation lecteur écran avec live regions
- ✅ Taille touch targets (44x44px minimum)
- ✅ Outils validation contraste couleur
- ✅ Gestion et piège focus
- ✅ Accessibilité multilingue (9 langues)
- ✅ Support langues RTL
- ✅ Respect préférences motion
- ✅ Conformité WCAG 2.1 AA

---

## 36. SYSTEME PARTENAIRES/PRESTATAIRES

### 36.1 Vue d'Ensemble

**Types de Prestataires:**
- **Lawyers** - Professionnels juridiques (type: 'lawyer')
- **Expat Aidants** - Conseillers expatriés (type: 'expat')

**Cycle de vie:** Inscription → Vérification → Approbation → Configuration paiement → Gestion services

### 36.2 Flux d'Inscription

**Fichiers:** `sos/src/pages/RegisterLawyer.tsx`, `RegisterClient.tsx`

**Sécurité Anti-Bot:**
- reCAPTCHA v3 + honeypot
- Temps minimum remplissage (15 secondes)
- Tracking mouvement souris
- Comptage frappes clavier
- Fingerprinting

**Champs Formulaire:**

| Catégorie | Champs |
|-----------|--------|
| Personnel | Nom, Email, Téléphone, Date naissance, Nationalité, Pays |
| Professionnel | Photo, Bio, Années expérience, Spécialités, Langues |
| Avocats | Numéro barreau, Année diplôme, Certifications |
| Expatriés | Années expatrié, Types d'aide, Motivation |

### 36.3 Initialisation Profil (Trigger)

**Fichier:** `sos/firebase/functions/src/triggers/onProviderCreated.ts`

**Actions Automatiques:**

1. **Custom Claims Firebase Auth:**
```typescript
await admin.auth().setCustomUserClaims(uid, { role: providerType })
```

2. **Génération Slugs SEO (9 langues):**
```typescript
slugs: {
  fr: "fr-fr/avocat-france/prenom-specialite-shortid",
  en: "en-us/lawyer-france/prenom-specialite-shortid",
  // ... 7 autres langues
}
```

3. **Migration Photo Profil:**
- `registration_temp/` → `profilePhotos/{userId}/`

4. **Tracking Meta CAPI:**
- Événement "Lead" pour signup prestataire

### 36.4 Sélection Gateway Paiement

**Fichier:** `sos/firebase/functions/src/lib/paymentCountries.ts`

**Logique:**
```
Pays Prestataire
    ↓
Dans STRIPE_SUPPORTED_COUNTRIES? (44 pays)
    ↓
  OUI: Stripe Express Account
  NON: PayPal Commerce Platform
```

**Pays Stripe (44):** Australie, Autriche, Belgique, France, Allemagne, UK, USA, Canada, Japon, etc.

**Pays PayPal (150+):** Afrique, Asie, Amérique Latine, Europe Est, Moyen-Orient, Océanie

### 36.5 Configuration Compte Paiement

#### Stripe (Automatique)
```typescript
const account = await stripe.accounts.create({
  type: "express",
  country: countryCode,
  capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
  settings: { payouts: { schedule: { interval: "manual" } } }
});

// Stocké dans Firestore
{
  stripeAccountId: "acct_xxx",
  stripeAccountStatus: "pending_verification",
  paymentGateway: "stripe",
  kycStatus: "not_started",
  isVisible: false  // Caché jusqu'à approbation admin
}
```

#### PayPal (Manuel)
```typescript
{
  paymentGateway: "paypal",
  paypalAccountStatus: "not_connected",
  paypalOnboardingUrl: "https://sos-expat.com/dashboard/paypal-connect?uid={uid}",
  isVisible: false
}
// Actions: Email bienvenue + notification + rappels programmés
```

### 36.6 Vérification KYC

**Fichier:** `sos/firebase/functions/src/checkStripeAccountStatus.ts`

**Statuts KYC:**
| Statut | Description |
|--------|-------------|
| `not_started` | Compte créé, pas d'onboarding |
| `pending` | Onboarding en cours |
| `completed` | Toutes exigences satisfaites |
| `verified` | Alias pour completed |
| `error` | Problème détecté |

**Vérification Stripe:**
```typescript
// Vérifie:
details_submitted === true
charges_enabled === true
requirements.currently_due.length === 0
```

### 36.7 Visibilité & Approbation

**Interface Admin:** `sos/src/pages/admin/AdminApprovals.tsx`

**États Profil:**
```
Pending (Nouvelle inscription)
    ↓ [Admin révise]
    ├→ Approved (isApproved: true, isVisible: true)
    ├→ Rejected (isApproved: false)
    └→ Changes Requested (validationStatus: 'changes_requested')
```

**Règles Visibilité:**
```
Prestataire VISIBLE quand:
isApproved === true
AND isVisible === true
AND isBanned !== true
AND isSuspended !== true
AND validationStatus === 'approved'
```

### 36.8 Gestion Profil

**Fichier:** `sos/src/pages/ProfileEdit.tsx`

**Champs Modifiables:**
- Photo profil (re-upload avec compression)
- Email (avec re-vérification)
- Mot de passe
- Téléphone & WhatsApp
- Bio / Description professionnelle
- Spécialités, Années expérience
- Pays d'intervention, Langues

**Mise à jour automatique:** `sos_profiles`, collection type-spécifique, `users`

**Regénération Slugs:** Si nom/spécialité/pays change

### 36.9 Dashboard Prestataire

**Fichier:** `sos/src/pages/Dashboard.tsx`

**Sections:**
1. **Statut Profil** - KYC, paiement, approbation
2. **Gestion Disponibilité** - Toggle online/offline
3. **Revenus & Versements** - Balance, transactions
4. **Statistiques Appels** - Total, taux réponse, durée moyenne
5. **Notifications** - Demandes booking, messages
6. **Actions Rapides** - Édition, disponibilité, revenus

### 36.10 Dashboard Multi-Prestataires

**Fichier:** `sos/src/pages/MultiProviderDashboard/index.tsx`

**Features:**
- Accès protégé par mot de passe unique
- Gestion comptes multiples
- Booking requests temps réel
- Réponses auto IA
- Chat inline par prestataire
- Filtrage statut
- Optimisé mobile

### 36.11 Traitement Paiements

**Stripe (Direct Charges):**
```
Client crée booking
    ↓
createPaymentIntent()
    ├── Prélèvement carte client
    ├── Split: paiement → compte prestataire
    └── Commission → compte plateforme
    ↓
Earnings enregistrés dans provider_earnings
```

**PayPal (Marketplace):**
```
createPayPalOrder()
    ├── Création ordre split payments
    ├── Prestataire reçoit %
    └── Plateforme garde commission
```

### 36.12 Suspension & Modération

**Fichier:** `sos/firebase/functions/src/admin/providerActions.ts`

**Actions Disponibles:**
| Action | Description |
|--------|-------------|
| HIDE/UNHIDE | Contrôle visibilité recherche |
| BLOCK/UNBLOCK | Ban permanent plateforme |
| SUSPEND/UNSUSPEND | Restriction temporaire |
| SOFT DELETE | Marqué supprimé (réactivable) |
| HARD DELETE (RGPD) | Purge permanente (540s timeout) |

**Logging:** Toutes actions dans `provider_action_logs`

### 36.13 Système Abonnements

**Tiers:**
| Tier | Prix | AI Calls/mois |
|------|------|---------------|
| Trial | Gratuit | 3 (30 jours) |
| Basic | $9-15 | 20 |
| Standard | $29 | 100 |
| Pro | $59 | 500 |
| Unlimited | $99 | Illimité |

**Statuts Abonnement:**
`trialing` → `active` → `past_due` (7j) → `suspended` → `canceled` → `expired`

### 36.14 Système Affiliation

**Commission Referral:**
```
Taux Referrer (capturé à inscription): 50-75%
Commission par transaction
Règle Lifetime: Taux JAMAIS modifié une fois capturé
```

**Piggy Bank (Wallet Gains):**
- Total gagné, Retiré, Disponible
- Retrait via Wise (minimum €30)

### 36.15 Collections Firestore

| Collection | Contenu |
|------------|---------|
| `sos_profiles/{uid}` | Profil principal prestataire (source vérité) |
| `lawyers/{uid}` | Copie type-spécifique avocats |
| `expats/{uid}` | Copie type-spécifique expatriés |
| `users/{uid}` | Compatibilité legacy |
| `provider_earnings/{docId}` | Revenus prestataires |
| `kyc_documents/{docId}` | Documents vérification |
| `affiliates/{uid}` | Données affiliation |

### 36.16 Workflow Complet Partenaire

```
1. INSCRIPTION
   └── Formulaire anti-bot, email vérifié, profil créé

2. AUTO-INITIALISATION
   └── Claims, slugs SEO, migration photo, tracking CAPI

3. GATEWAY PAIEMENT
   ├── STRIPE: Compte Express auto, isVisible: false
   └── PAYPAL: URL onboarding, emails/rappels

4. VÉRIFICATION KYC
   └── Onboarding Stripe, documents, checkStripeAccountStatus()

5. APPROBATION ADMIN
   └── Révision, Approve/Reject/Changes Requested

6. MISE EN LIGNE
   └── Visible recherche, reçoit bookings, paiements traités

7. GESTION CONTINUE
   └── Profil, disponibilité, revenus, abonnement IA, notifications

8. MONITORING ADMIN
   └── Temps réel, statuts, actions, logs audit
```

---

## 37. SCHEMA BASE DE DONNEES DETAILLE

### 37.1 Architecture

**Type:** Firestore (NoSQL Document Database + Firebase Authentication)
**Pas de Prisma** - Données définies via interfaces TypeScript correspondant aux collections Firestore.

### 37.2 Collections Principales

#### users - Comptes Utilisateurs
**Path:** `users/{userId}`

| Champ | Type | Description |
|-------|------|-------------|
| `id`, `uid` | string | Identifiant Firebase UID |
| `email` | string | Adresse email |
| `role` | string | `client`, `lawyer`, `expat`, `admin` |
| `firstName`, `lastName`, `fullName` | string | Nom complet |
| `phone`, `phoneCountryCode` | string | Téléphone avec préfixe |
| `currentCountry` | string | Pays de résidence |
| `preferredLanguage` | string | `fr`, `en` (défaut: "fr") |
| `languages` | array | Langues parlées |
| `profilePhoto` | string | URL photo profil |
| `isActive`, `isApproved`, `isVerified` | boolean | États compte |
| `isBanned`, `isOnline`, `isVisible` | boolean | Statuts |
| `createdAt`, `updatedAt`, `lastLoginAt` | timestamp | Dates |
| `specialties`, `helpTypes` | array | Spécialités (lawyers/expats) |
| `yearsOfExperience`, `yearsAsExpat` | number | Expérience |

**Index:** role, isApproved, createdAt, country, isTestProfile

#### sos_profiles - Profils Prestataires Étendus
**Path:** `sos_profiles/{profileId}`

| Champ | Type | Description |
|-------|------|-------------|
| `uid` | string | Référence users.id |
| `type` | string | `lawyer`, `expat` |
| `availability` | string | `available`, `busy`, `offline` |
| `rating` | number | Note moyenne (0-5) |
| `reviewCount` | number | Nombre d'avis |
| `price` | number | Prix consultation |
| `duration` | number | Durée appel (minutes) |
| `responseTime` | string | Temps réponse typique |
| `successRate` | number | Taux de succès |
| `featured` | boolean | Profil mis en avant |

**Index:** type, isVisible, isApproved, country, languages, isOnline, featured

#### calls - Enregistrements Appels
**Path:** `calls/{callId}`

| Champ | Type | Description |
|-------|------|-------------|
| `clientId`, `providerId` | string | IDs participants |
| `serviceType` | string | `lawyer_call`, `expat_call` |
| `status` | string | `pending`, `in_progress`, `completed`, `failed`, `refunded` |
| `duration` | number | Durée programmée (minutes) |
| `callDuration` | number | Durée réelle (secondes) |
| `price`, `platformFee`, `providerAmount` | number | Montants |
| `startedAt`, `endedAt` | timestamp | Horodatages appel |
| `callSessionId` | string | ID session Twilio |

#### payments - Enregistrements Paiements
**Path:** `payments/{paymentId}`

| Champ | Type | Description |
|-------|------|-------------|
| `callId` | string | ID appel associé |
| `amount`, `platformFee`, `providerAmount` | number | Montants |
| `status` | string | `pending`, `authorized`, `captured`, `failed`, `refunded` |
| `currency` | string | Code devise (défaut: "eur") |
| `stripePaymentIntentId`, `stripeChargeId` | string | IDs Stripe |
| `capturedAt`, `refundedAt` | timestamp | Dates opérations |

#### reviews - Avis Clients
**Path:** `reviews/{reviewId}`

| Champ | Type | Description |
|-------|------|-------------|
| `callId`, `clientId`, `providerId` | string | Références |
| `rating` | number | Note étoiles (1-5) |
| `comment` | string | Texte avis |
| `status` | string | `pending`, `published`, `hidden` |
| `helpfulVotes` | number | Compteur votes utiles |
| `reportedCount` | number | Compteur signalements |
| `verified` | boolean | Achat vérifié |

#### documents - Documents Uploadés
**Path:** `documents/{docId}`

| Champ | Type | Description |
|-------|------|-------------|
| `userId` | string | ID propriétaire |
| `type` | string | `identity`, `diploma`, `certificate`, `residence_proof` |
| `url` | string | URL Firebase Storage |
| `status` | string | `pending`, `approved`, `rejected` |
| `verifiedBy` | string | ID admin vérificateur |

### 37.3 Collections Avancées

#### subscriptions - Abonnements IA
**Path:** `subscriptions/{subscriptionId}`

| Champ | Type | Description |
|-------|------|-------------|
| `providerId`, `providerType` | string | Prestataire |
| `tier` | string | `trial`, `basic`, `standard`, `pro`, `unlimited` |
| `status` | string | `trialing`, `active`, `past_due`, `canceled`, `expired` |
| `stripeCustomerId`, `stripeSubscriptionId` | string | IDs Stripe |
| `trialStartedAt`, `trialEndsAt` | timestamp | Période trial |
| `currentPeriodStart`, `currentPeriodEnd` | timestamp | Période facturation |
| `billingPeriod` | string | `monthly`, `yearly` |
| `currency` | string | `EUR`, `USD` |

#### threshold_tracking - Seuils Fiscaux Internationaux
**Path:** `threshold_tracking/{countryCode}`

| Champ | Type | Description |
|-------|------|-------------|
| `countryCode` | string | Code ISO ou zone (OSS_EU, GB, CH) |
| `thresholdAmount` | number | Seuil enregistrement |
| `currentAmount`, `currentAmountEUR` | number | Revenus accumulés |
| `percentageUsed` | number | Pourcentage seuil |
| `status` | string | `SAFE`, `WARNING_70`, `WARNING_90`, `EXCEEDED` |
| `isRegistered` | boolean | Enregistré fiscalement |
| `registrationNumber` | string | Numéro TVA |

**Juridictions Surveillées:**
- OSS EU: €10,000/an
- UK: £0 (enregistrement immédiat)
- Suisse: CHF 100,000/an
- Australie: AUD 75,000 (12 mois glissants)

#### tax_filings - Déclarations Fiscales
**Path:** `tax_filings/{filingId}`

| Champ | Type | Description |
|-------|------|-------------|
| `type` | string | `VAT_EE`, `OSS`, `DES`, `UK_VAT`, `CH_VAT` |
| `period` | string | Identifiant période (2024-01, 2024-Q1) |
| `frequency` | string | `MONTHLY`, `QUARTERLY`, `ANNUAL` |
| `status` | string | `DRAFT`, `PENDING_REVIEW`, `SUBMITTED`, `ACCEPTED`, `PAID` |
| `summary` | object | TaxFilingSummary (totalSales, totalTaxDue) |
| `generatedFiles` | object | URLs PDF, CSV, XML |
| `confirmationNumber` | string | Confirmation autorité fiscale |

#### journal_entries - Comptabilité Double Entrée
**Path:** `journal_entries/{entryId}`

Enregistrements transactions avec débits/crédits.

#### cost_metrics - Métriques Coûts
**Path:** `cost_metrics/{date}`

Tracking usage et coûts: Twilio, Firestore, Cloud Functions, Storage, Hosting, Auth.

### 37.4 Configuration Pricing

**Path:** `admin_config/pricing`

```typescript
{
  expat: { eur: PricingNode, usd: PricingNode },
  lawyer: { eur: PricingNode, usd: PricingNode },
  overrides: {
    expat: { eur: PricingOverrideNode, usd: PricingOverrideNode },
    lawyer: { eur: PricingOverrideNode, usd: PricingOverrideNode }
  }
}
```

**PricingNode:**
- `connectionFeeAmount`: Frais plateforme
- `providerAmount`: Montant prestataire
- `totalAmount`: Total facturé client
- `duration`: Minutes

**PricingOverrideNode (Promotions):**
- `enabled`, `startsAt`, `endsAt`
- `stackableWithCoupons`
- `strikeTargets`: Prix à barrer

### 37.5 Gestion Prestataires Étendue

**Gestion Disponibilité:**
- `availability`: `available`, `busy`, `offline`
- `currentCallSessionId`: Session appel active
- `busyReason`: `in_call`, `break`, `offline`

**Comptes Paiement:**
- `paymentGateway`: `stripe`, `paypal`
- `stripeAccountId`, `stripeAccountStatus`
- `chargesEnabled`, `payoutsEnabled`, `kycStatus`
- `paypalMerchantId`, `paypalAccountStatus`

**Profils AAA (Gérés SOS-Expat):**
- `isAAA`: Profil interne
- `aaaPayoutAccountId`: Compte payout consolidé
- `kycDelegated`: KYC géré par SOS

**Workflow Validation:**
- `validationStatus`: `pending`, `in_review`, `approved`, `rejected`, `changes_requested`
- `lastValidationDecision`: { status, by, at, reason }
- `requestedChanges`: Liste modifications requises

### 37.6 Relations Données

```
users (UID)
├── sos_profiles (via uid)
├── calls (as clientId ou providerId)
├── payments (as clientId ou providerId)
├── reviews (as clientId ou providerId)
├── documents (via userId)
├── subscriptions (as providerId)
└── tax_filings (as admin créateur)

calls ──→ payments (via callId)
       ──→ reviews (via callId)

sos_profiles ──→ reviews (as providerId)
              ──→ subscriptions (as providerId)

threshold_tracking ──→ threshold_alerts
tax_filings ──→ journal_entries
subscriptions ──→ invoices, ai_call_logs
```

### 37.7 Sécurité & Permissions

| Collection | Lecture | Écriture |
|------------|---------|----------|
| users | Owner + Admin | Owner (limité) + Admin |
| sos_profiles | Public (approuvés) | Owner + Admin |
| calls | Participants + Admin | Participants + Admin |
| payments | Participants + Admin | Admin only |
| reviews | Public (publiés) | Owner + Admin modération |
| documents | Owner + Admin | Owner + Admin |
| subscriptions | Owner + Admin | Cloud Functions |
| journal_entries | Admin | Admin |
| tax_filings | Admin + Créateur | Admin |
| threshold_tracking | Admin | Admin |

### 37.8 Tableau Récapitulatif Collections

| Collection | Purpose | Clés Primaires | Accès |
|------------|---------|----------------|-------|
| users | Comptes utilisateurs | uid (Firebase) | Owner + Admin |
| sos_profiles | Marketplace prestataires | uid | Public + Owner |
| calls | Enregistrements appels | clientId, providerId | Participants |
| payments | Transactions paiement | clientId, providerId | Participants |
| reviews | Notes prestataires | providerId | Public + Admin |
| documents | Fichiers uploadés | userId | Owner + Admin |
| subscriptions | Abonnements IA | providerId | Owner + Admin |
| journal_entries | Écritures comptables | account codes | Admin |
| tax_filings | Déclarations fiscales | type, period | Admin |
| threshold_tracking | Seuils fiscaux | countryCode | Admin |
| cost_metrics | Coûts services | date | Admin |

---

## 38. SYSTEME PROFIL UTILISATEUR

### 38.1 Architecture Double Collection

**Profils stockés dans deux collections Firestore:**
1. **`users/{userId}`** - Authentification et infos core
2. **`sos_profiles/{userId}`** - Profils prestataires étendus (lawyers/expats)

### 38.2 Données Profil

#### Informations Personnelles (Tous Rôles)
| Catégorie | Champs |
|-----------|--------|
| Identification | firstName, lastName, fullName, displayName, email |
| Contact | phone, phoneNumber, phoneCountryCode |
| Localisation | country, currentCountry, residenceCountry |
| Langues | languages, languagesSpoken, preferredLanguage |
| Média | photoURL, profilePhoto, avatar |
| Bio | description, bio, motivation |

#### Informations Spécifiques par Rôle

**Avocats:**
- `barNumber` - Numéro barreau
- `yearsOfExperience` - Expérience professionnelle
- `specialties` - Domaines de pratique
- `diplomaYear`, `lawSchool` - Formation
- `practiceCountries`, `interventionCountries` - Pays

**Expatriés:**
- `yearsAsExpat` - Années à l'étranger
- `helpTypes` - Catégories d'aide
- `whyHelp`, `motivation` - Motivation
- `operatingCountries` - Pays d'opération

#### Statuts Approbation et Visibilité
```typescript
isApproved: boolean           // Approuvé par admin
approvalStatus: 'pending' | 'approved' | 'rejected'
isActive: boolean             // Compte actif
isVisible: boolean            // Visible dans recherches
isVisibleOnMap: boolean       // Visible sur carte
isBanned: boolean             // Compte banni
isSuspended: boolean          // Compte suspendu
```

#### Performance et Notes
- `rating` / `averageRating` - Note (0-5 étoiles)
- `reviewCount` - Nombre d'avis
- `totalCalls`, `successfulCalls` - Statistiques appels
- `responseTime`, `successRate` - Métriques

#### Disponibilité
- `availability`: `'available'` | `'busy'` | `'offline'`
- `isOnline` - Statut en ligne actuel
- `busyReason`: `'in_call'` | `'break'` | `'offline'`

### 38.3 Édition Profil

**Interface:** `ProfileEdit.tsx` (`/profile/edit`)

**Qui Peut Éditer:**
- Utilisateurs: leur propre profil uniquement (protection IDOR)
- Admins: tous profils via fonctions backend

**Champs Éditables par Rôle:**

| Rôle | Champs Éditables |
|------|------------------|
| Tous | Email (ré-auth requise), Password, Téléphone, Photo (5MB max) |
| Avocats | Pays, Numéro barreau, Expérience, Description, Spécialités, Langues |
| Expatriés | Pays, Années expat, Description, Motivation, Types aide, Langues |
| Clients | Pays résidence, Statut, Préférence langue |

**Flux Édition:**
1. Charger données depuis `users/{uid}`
2. Validation côté client
3. Upload photo → Firebase Storage → WebP optimisé
4. Mise à jour Firebase Auth (email/password)
5. Sync vers Firestore `users/{uid}`
6. Sync vers `sos_profiles/{uid}` (prestataires)
7. Génération slugs multilingues SEO

**Champs Protégés (Non Modifiables par Utilisateurs):**
```typescript
// users/{uid}:
role, isApproved, approvalStatus, isBanned
forcedAiAccess, freeTrialUntil, stripeCustomerId, isAAA

// sos_profiles/{uid}:
stripeAccountId, paypalMerchantId
totalEarnings, pendingBalance, reservedBalance
payoutMode, aaaPayoutMode
```

### 38.4 Visibilité Public vs Privé

#### Profil Public (ProviderProfile.tsx)

**Visible Publiquement** (si `isVisible && isApproved`):
- Nom formaté ("Prénom L." - initiale nom uniquement)
- Photo professionnelle
- Description/bio
- Langues parlées
- Pays d'opération
- Années d'expérience
- Note et nombre d'avis
- Spécialités/Types aide
- Statut disponibilité

**NON Visible Publiquement:**
- Téléphone personnel
- Adresse email
- Nom complet
- Informations paiement
- Revenus et données financières
- Numéro barreau
- Localisation exacte
- Statut vérification compte

#### Accès Privé/Authentifié

**Dashboard Prestataire:**
- Tous champs éditables
- Informations contact complètes
- Données financières
- Statut gateway paiement et KYC
- Historique appels et analytics
- Gestion avis
- Paramètres disponibilité

**Dashboard Admin:**
- Toutes données utilisateur (non restreint)
- Statut et historique approbation
- Détails vérification paiement
- Enregistrements suspension
- Transactions financières

### 38.5 Workflow Approbation

**États Validation:**
```typescript
approvalStatus: 'pending' | 'approved' | 'rejected'
validationStatus: 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested'
```

**Flux Pending:**
1. Inscription Lawyer/Expat → `approvalStatus = 'pending'`
2. `isApproved = false`, `isVisible = false`
3. Admin révise dans ProfileValidation
4. Admin approuve ou rejette

**Approuvé:**
- `isApproved = true`, `isVisible = true`
- `isVisibleOnMap = true`, `isActive = true`
- Profil searchable et visible

**Rejeté:**
- `isApproved = false`, `isVisible = false`
- `rejectionReason` stocké
- Profil caché des recherches

### 38.6 Contrôles Confidentialité & Sécurité

#### Règles Firestore

**Collection sos_profiles:**
```javascript
// Lecture: Profils visibles OU propriétaire OU admin
allow read: if resource.data.isVisible == true
            || isOwner(profileId) || isAdmin()

// Écriture: Propriétaire peut modifier SAUF champs sensibles
allow update: if isOwner(profileId) &&
              !affectedKeys().hasAny([
                'stripeAccountId', 'paypalMerchantId',
                'totalEarnings', 'pendingBalance',
                'payoutMode', 'isAAA'
              ])
```

**Protection Email/Password:**
- Changement email requiert ré-authentification
- Changement password requiert password actuel
- Firebase Auth enforce politiques password fortes

**Sécurité Storage Photos:**
- Images stockées dans `profilePhotos/{userId}/{timestamp}`
- Auto-optimisation format WebP
- Règles Storage restreintes au propriétaire

**Ségrégation Données:**
- Données publiques dans `sos_profiles` (queryable)
- Données sensibles dans `users` (auth/paiement)
- Données financières jamais exposées au SDK client

### 38.7 Fonctionnalités par Rôle

| Fonctionnalité | Lawyers | Expats | Clients | Admins |
|----------------|---------|--------|---------|--------|
| Édition profil complète | ✅ | ✅ | Limitée | ✅ |
| Spécialités/Types aide | ✅ | ✅ | ❌ | ✅ |
| Toggle statut en ligne | ✅ | ✅ | ❌ | ✅ |
| Config gateway paiement | ✅ | ✅ | ❌ | ✅ |
| Gestion avis | ✅ | ✅ | Écriture | ✅ |
| Analytics appels | ✅ | ✅ | Historique | ✅ |
| Workflow approbation | ❌ | ❌ | ❌ | ✅ |
| Contrôle suspension | ❌ | ❌ | ❌ | ✅ |

### 38.8 Fichiers Clés

| Fichier | Purpose |
|---------|---------|
| `ProfileEdit.tsx` | Interface édition profil |
| `ProviderProfile.tsx` | Vue profil public prestataire |
| `firestore.rules` | Règles sécurité données profil |
| `provider.ts` | Interface TypeScript provider |
| `ProfileValidation.tsx` | Composant approbation admin |
| `DashboardStats.tsx` | Stats dashboard prestataire |

### 38.9 Résumé

**Architecture double-collection avec frontières sécurité strictes:**
1. **Données publiques searchable** dans `sos_profiles` (contrôle visibilité)
2. **Données sensibles privées** dans `users` (auth/paiement restreint)
3. **Édition basée rôles** avec protection niveau champ
4. **Approbation multi-étapes** pour prestataires professionnels
5. **Protection IDOR** assurant édition profil propre uniquement
6. **Confidentialité par défaut** - profils cachés jusqu'à approbation explicite

---

## 39. CONFIGURATION TESTS

### 39.1 Vue d'Ensemble

**Monorepo avec 3 applications, configurations de test différentes:**
1. **sos** - Application web principale (React + TypeScript)
2. **Outil-sos-expat** - Dashboard admin (React + TypeScript)
3. **sos/firebase/functions** - Backend Cloud Functions

### 39.2 Frameworks de Test

| Framework | Application | Version | Environnement |
|-----------|-------------|---------|---------------|
| **Vitest** | sos, Outil-sos-expat, functions | ^4.0.17, ^2.1.3 | jsdom, node |
| **Jest** | sos/firebase/functions | ^29.7.0 | node |

**Bibliothèques Testing:**
- `@testing-library/react`: ^16.3.1
- `@testing-library/jest-dom`: ^6.9.1
- `@testing-library/user-event`: ^14.6.1
- `@testing-library/dom`: ^10.4.1

### 39.3 Fichiers Configuration

#### SOS Main App (`sos/vitest.config.ts`)
```typescript
{
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/__tests__/setup.ts',
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  coverage: { provider: 'v8', reporter: ['text', 'json', 'html'] }
}
```

#### Outil-sos-expat (`Outil-sos-expat/vitest.config.ts`)
```typescript
{
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  coverage: { provider: 'v8', reporter: ['text', 'json', 'html'] }
}
```

#### Firebase Functions (`sos/firebase/functions/jest.config.js`)
```typescript
{
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 10000
}
```

### 39.4 Fichiers Setup

**SOS Main App (`sos/src/__tests__/setup.ts`):**
- Mocks Firebase: firestore, auth, storage, functions
- Mocks Browser APIs: IntersectionObserver, ResizeObserver, matchMedia
- Mocks React Router: useNavigate, useLocation, useParams
- Suppression console.error/warn

**Outil-sos-expat (`Outil-sos-expat/src/test/setup.ts`):**
- Mocks React Router complets
- Mocks Observer APIs
- Mocks Window APIs: matchMedia
- Mocks Element: scrollIntoView

### 39.5 Modules de Test Backend

**5 Modules Core (Outil-sos-expat/functions):**

| Module | Tests | Couverture |
|--------|-------|------------|
| `validation.test.ts` | Schémas Zod, payloads valides/invalides | IngestBooking, Message, AIChat, SyncProvider |
| `security.test.ts` | Headers sécurité, validation contenu, PII | setSecurityHeaders, hashPII, maskEmail |
| `rateLimiter.test.ts` | Config limites, buckets, headers | AI_CHAT, WEBHOOK_INGEST, AUTH_LOGIN |
| `monitoring.test.ts` | Logging structuré, performance tracking | logStructured, createPerformanceTracker |
| `subscription.test.ts` | Statuts abonnement | isSubscriptionActive (tous états) |

### 39.6 Tests Frontend

**Outil-sos-expat:**
- `ProtectedRoute.test.tsx` - Protection routes avec auth context
- `GPTChatBox.test.tsx` - Composant chat IA
- `BlockedScreen.test.tsx` - UI utilisateur bloqué
- `formatDate.test.ts` - Formatage dates
- `useFirestoreQuery.test.tsx` - Hooks Firestore

**SOS Main App:**
- `phone.test.ts` - Normalisation numéros téléphone (30+ pays)
- `phone-cis.test.ts` - Téléphones pays CIS spécifiques
- `amountValidator.test.ts` - Validation devises/montants
- `localeFormatters.test.ts` - Formatage spécifique locale

### 39.7 Tests Backend Firebase

**Jest Configuration (sos/firebase/functions):**

| Test | Couverture |
|------|------------|
| `StripeManager.test.ts` | PaymentIntent, Destination Charges, refunds |
| `vatValidation.test.ts` | Format numéros TVA par pays |
| `ProviderEarningsService.test.ts` | Calcul et tracking revenus |
| `accessControl.test.ts` | Contrôle accès basé abonnement |
| `scheduledTasks.test.ts` | Tâches programmées abonnements |
| `webhooks.test.ts` | Gestion webhooks |

### 39.8 Patterns de Test

**Stratégie Mocking:**
```typescript
// Vitest
vi.mock('../config/firebase', () => ({ ... }))

// Jest
jest.mock('firebase-admin', () => ({ ... }))
```

**Mocks Request/Response:**
```typescript
function createMockRequest(overrides: Partial<Request>): Request { ... }
function createMockResponse(): Response { ... }
```

**Structure Tests:**
```typescript
describe('Feature Name', () => {
  describe('Sub-feature', () => {
    it('should do X with valid input', () => {
      // Arrange → Act → Assert
    })
  })
})
```

**Tests Zod:**
```typescript
const result = schema.safeParse(payload)
expect(result.success).toBe(true)
if (result.success) { expect(result.data).toEqual(...) }
```

### 39.9 Scripts NPM

**SOS Main App:**
```bash
npm run test           # Watch mode
npm run test:run       # Single run
npm run test:coverage  # Avec rapport couverture
```

**Outil-sos-expat:**
```bash
npm run test           # Watch mode
npm run test:run       # Single run
npm run test:coverage  # Avec couverture
npm run test:ui        # Dashboard Vitest UI
```

**Firebase Functions:**
```bash
npm run test           # Jest watch mode
npm run test:coverage  # Avec couverture
```

### 39.10 Fonctionnalités Clés

| Feature | Description |
|---------|-------------|
| **Type Safety** | Support TypeScript complet, types dans mocks |
| **Security Testing** | Hashing PII, validation payload, injection SQL |
| **i18n Testing** | Normalisation téléphone 30+ pays, formatage locale |
| **Business Logic** | Validation abonnement, rate limiting, paiements Stripe |
| **Error Handling** | Rejet entrées invalides, formatage erreurs Zod |
| **Timeout** | 10 secondes par défaut |

### 39.11 Exclusions Couverture

**Exclus du calcul couverture:**
- Fichiers test (`**/*.test.ts`, `**/*.spec.ts`)
- Définitions types (`**/*.d.ts`)
- Fichiers configuration
- Fichiers locale/traduction
- Points d'entrée (main.tsx, index.ts)
- node_modules

### 39.12 Résumé

**Configuration test complète et bien structurée:**
- ✅ Dual frameworks (Vitest moderne + Jest Firebase)
- ✅ Types tests multiples (unit, integration, component)
- ✅ Tests sécurité et validation forts
- ✅ Support international/multi-locale
- ✅ Infrastructure mock Firebase, routing, browser APIs
- ✅ Organisation claire avec `__tests__/` et `setup.ts`
- ✅ Tracking couverture tous packages
- ✅ Tests type-safe TypeScript

---

## 40. Système de Réservation (Booking System)

### 40.1 Vue d'ensemble

Le système de booking gère le flux complet depuis la demande client jusqu'à la génération automatique de réponse IA, avec synchronisation entre SOS et Outil-sos-expat.

**Architecture du flux:**
```
Client SOS → booking_requests → Payment Validation → Sync to Outil → AI Response
```

### 40.2 Création de Booking (SOS)

**Fichier:** `sos/src/services/booking.ts`

**Types minimaux requis:**
```typescript
type BookingRequestMinimal = {
  providerId: string;
  serviceType: string; // "lawyer_call" | "expat_call"
  status?: "pending";
};
```

**Champs optionnels disponibles:**
| Champ | Type | Description |
|-------|------|-------------|
| `title` | string | Titre de la demande |
| `description` | string | Description détaillée |
| `clientPhone` | string | Téléphone client |
| `clientWhatsapp` | string | WhatsApp client |
| `price` | number | Prix payé |
| `duration` | number | Durée en minutes |
| `clientLanguages` | string[] | Langues parlées |
| `providerName` | string | Nom du prestataire |
| `providerType` | string | "lawyer" ou "expat" |
| `providerCountry` | string | Pays du prestataire |
| `clientNationality` | string | Nationalité client |
| `clientCurrentCountry` | string | Pays actuel client |
| `metaEventId` | string | ID Meta CAPI |
| `fbp`/`fbc` | string | Cookies Facebook |

**Fonction de création:**
```typescript
async function createBookingRequest(data: BookingRequestCreate) {
  const u = auth.currentUser;
  if (!u) throw new Error("SESSION_EXPIRED");

  // Timeout 30 secondes pour connexions lentes
  await withTimeout(
    addDoc(collection(db, "booking_requests"), payload),
    30000,
    "NETWORK_TIMEOUT"
  );
}
```

### 40.3 Synchronisation vers Outil-sos-expat

**Fichier:** `sos/firebase/functions/src/triggers/syncBookingsToOutil.ts`

**Important:** Le sync se fait APRÈS paiement validé (pas à la création).

**Endpoint cible:** `https://europe-west1-outils-sos-expat.cloudfunctions.net/ingestBooking`

**Payload OutilBookingPayload:**
```typescript
interface OutilBookingPayload {
  // Client
  clientFirstName?: string;
  clientLastName?: string;
  clientName?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];

  // Request
  title?: string;
  description?: string;
  serviceType?: string;
  priority?: string;

  // Provider
  providerId: string;
  providerType?: string;
  providerName?: string;

  // Metadata
  source: "sos-expat-app";
  externalId: string;
  metadata?: Record<string, unknown>;
}
```

### 40.4 Mécanisme de Retry

**Collection:** `outil_sync_retry_queue`

**Configuration:**
- Max retries: 3
- Backoff exponentiel: 5, 10, 20 minutes
- Schedule: 1×/jour à 8h Paris

**Statuts retry:**
| Statut | Description |
|--------|-------------|
| `pending` | En attente de retry |
| `completed` | Sync réussie |
| `failed` | Max retries atteint |

### 40.5 Génération IA Multi-Provider

**Fichier:** `Outil-sos-expat/functions/src/multiDashboard/onBookingCreatedGenerateAi.ts`

**Trigger:** `booking_requests/{bookingId}` (onCreate)

**Conditions d'exécution:**
1. Booking non encore traité (`!aiResponse && !aiProcessedAt`)
2. Provider appartient à un compte multi-provider (linkedProviderIds)

**Génération réponse bienvenue:**
```typescript
async function generateWelcomeResponse(context: {
  clientName: string;
  clientCountry?: string;
  serviceType?: string;
  clientLanguages?: string[];
  providerType?: "lawyer" | "expat";
  title?: string;
}): Promise<{ text: string; tokensUsed: number; model: string }>
```

**Modèle utilisé:** Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)

**Détection langue automatique:**
- `en*` → English
- `es*` → Spanish
- `de*` → German
- Default → French

### 40.6 Génération IA Booking Principal

**Fichier:** `Outil-sos-expat/functions/src/ai/handlers/bookingCreated.ts`

**Trigger:** `bookings/{bookingId}` (onCreate)

**Configuration Cloud Function:**
```typescript
{
  region: "europe-west1",
  memory: "512MiB",
  timeoutSeconds: 120,
  maxInstances: 20,
  minInstances: 0, // Cold start ~3-10s
}
```

**Flux en 11 étapes:**
1. Trigger fired - validation snapshot
2. Booking data received - extraction données
3. Check AI settings - enabled + replyOnBookingCreated
4. Check providerId - validation présence
5. Check provider AI status - accès + quota
6. Access check - hasAccess validation
7. Quota check - hasQuota validation
8. Build AI context - providerType, language, country
9. Call AI service - Claude (lawyers) / GPT-4o (expats)
10. Create conversation - save to Firestore
11. Success - mark as processed

### 40.7 Vérifications Accès IA

**Conditions d'accès provider:**
```typescript
interface AIStatus {
  hasAccess: boolean;
  accessReason: string;
  hasQuota: boolean;
  quotaUsed: number;
  quotaLimit: number;
  quotaRemaining: number;
}
```

**Sources d'accès:**
1. `forcedAIAccess=true` sur le provider
2. `freeTrialUntil` date future
3. `subscriptionStatus="active"`

### 40.8 Structure Conversation Générée

**Collection:** `conversations/{conversationId}`

```typescript
{
  bookingId: string;
  providerId: string;
  providerType: "lawyer" | "expat";
  status: "active";
  clientName: string;
  clientFirstName?: string;
  title: string;
  subject: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt: Timestamp;
  messagesCount: 2;
  bookingContext: {
    clientName: string;
    country: string;
    nationality?: string;
    title?: string;
    description?: string;
    category?: string;
    urgency?: string;
    specialties?: string[];
  };
}
```

**Sous-collection messages:**
```typescript
// Message 1: Contexte utilisateur (order: 1)
{
  role: "user";
  source: "system";
  content: string; // Contexte booking formaté
  createdAt: Timestamp;
  order: 1;
}

// Message 2: Réponse IA (order: 2)
{
  role: "assistant";
  source: "claude" | "gpt";
  content: string;
  model: string;
  provider: string;
  searchPerformed: boolean;
  citations?: string[];
  fallbackUsed: boolean;
  createdAt: Timestamp;
  order: 2;
}
```

### 40.9 Stockage Réponse IA (Multi-Dashboard)

**Directement dans booking_request:**
```typescript
{
  aiResponse: {
    content: string;
    generatedAt: Timestamp;
    model: string;
    tokensUsed: number;
    source: "multi_dashboard_auto";
  };
  aiProcessedAt: Timestamp;
}
```

**En cas d'erreur:**
```typescript
{
  aiError: string;
  aiErrorAt: Timestamp;
}
```

### 40.10 Notifications Provider

**Types de notification:**
| Type | Message |
|------|---------|
| `quota_exceeded` | Quota IA épuisé (X/Y) |
| `ai_error` | Assistant IA n'a pas pu analyser |

### 40.11 Email Confirmation Booking

**Template:** `sos/src/emails/templates/bookingConfirmation.ts`

**Contenu:**
- Confirmation de la réservation
- Détails du prestataire
- Instructions prochaines étapes
- Coordonnées contact

### 40.12 Composants UI Booking

**Outil-sos-expat:**
| Composant | Fichier | Description |
|-----------|---------|-------------|
| `BookingCard` | `bookings/BookingCard.tsx` | Carte booking individuelle |
| `BookingFilters` | `bookings/BookingFilters.tsx` | Filtres liste bookings |
| `BookingStats` | `bookings/BookingStats.tsx` | Statistiques bookings |
| `RecentBookings` | `dashboard/RecentBookings.tsx` | Widget derniers bookings |
| `BookingCardSkeleton` | `skeletons/` | Skeleton loading |

**SOS:**
| Composant | Fichier | Description |
|-----------|---------|-------------|
| `BookingRequest` | `pages/BookingRequest.tsx` | Page création booking |
| `BookingRequestCard` | `MultiProviderDashboard/` | Carte booking multi-dashboard |

### 40.13 Sécurité

**Firestore Rules:**
- `clientId == auth.uid` obligatoire
- `status == "pending"` à la création
- Validation `providerId` et `serviceType` non vides

**API Key Sync:**
- Secret: `OUTIL_SYNC_API_KEY`
- Header: `x-api-key`
- Trim automatique (fix CRLF)

### 40.14 Résumé Workflow Complet

```
1. CLIENT: Crée booking_request sur SOS
   ↓
2. PAYMENT: Validation paiement Stripe/PayPal
   ↓
3. SYNC: sendPaymentNotifications() → syncCallSessionToOutil()
   ↓
4. INGEST: Outil reçoit via ingestBooking endpoint
   ↓
5. TRIGGER: aiOnBookingCreated déclenché
   ↓
6. CHECK: Settings AI + Accès provider + Quota
   ↓
7. GENERATE: Claude (lawyers) / GPT-4o (expats)
   ↓
8. SAVE: Conversation + Messages dans Firestore
   ↓
9. NOTIFY: Provider reçoit notification
   ↓
10. DISPLAY: Dashboard affiche booking + réponse IA
```

---

## 41. Synthèse Architecturale

### 41.1 Récapitulatif des Applications

| Application | URL | Projet Firebase | Rôle |
|-------------|-----|-----------------|------|
| **SOS Expat** | sos-expat.com | sos-urgently-ac307 | Plateforme client principale |
| **Outil IA SOS** | ia.sos-expat.com | outils-sos-expat | Dashboard prestataires + IA |

### 41.2 Technologies Principales

| Catégorie | Technologies |
|-----------|--------------|
| **Frontend** | Next.js 14, React 18, TypeScript 5.x |
| **Styling** | Tailwind CSS, Headless UI, Framer Motion |
| **Backend** | Firebase Functions (60+), Node.js 20 |
| **Database** | Firestore (11 collections principales) |
| **Auth** | Firebase Auth, Custom SSO tokens |
| **Payments** | Stripe Connect (85/15), PayPal |
| **AI** | Claude 3.5 Sonnet, GPT-4o, Perplexity Sonar Pro |
| **Email** | Resend API |
| **i18n** | next-intl (9 langues) |
| **Testing** | Vitest (frontend), Jest (backend) |

### 41.3 Flux Inter-Applications

```
SOS Expat ←→ Firebase Firestore ←→ Outil IA SOS
    ↓                                    ↓
Stripe/PayPal                     Claude/GPT/Perplexity
    ↓                                    ↓
Email (Resend)                    Conversations IA
```

### 41.4 Statistiques Codebase

| Métrique | Valeur |
|----------|--------|
| Composants React | 200+ |
| Cloud Functions | 60+ |
| Types TypeScript | 240+ |
| Hooks personnalisés | 25+ |
| Pages/Routes | 50+ |
| Langues supportées | 9 |
| Tests unitaires | 100+ |

---

## 42. Système de Notifications (Notification System)

### 42.1 Architecture Multi-Canal

```
┌─────────────────────────────────────────────────────────────┐
│           CLIENT-SIDE (In-App Notifications)                │
├─────────────────────────────────────────────────────────────┤
│ • Toast Notifications (react-hot-toast)                      │
│ • In-app Notification Badges & Dots                          │
│ • Push Notification Registration (FCM)                       │
│ • Notification Preferences Management                        │
│ • App Icon Badging (PWA)                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│       FIREBASE FUNCTIONS (Notification Pipeline)             │
├─────────────────────────────────────────────────────────────┤
│ • Message Events Trigger (Firestore-based)                   │
│ • Template Resolution (Multi-language)                       │
│ • Routing Configuration                                      │
│ • Channel Selection (Email, SMS, Push, In-App)               │
│ • Delivery Logging & Retry Mechanism                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│      NOTIFICATION PROVIDERS (Multi-Channel Delivery)         │
├─────────────────────────────────────────────────────────────┤
│ • Email: Zoho SMTP                                           │
│ • SMS: Twilio (Rate-Limited & Allowlist-Based)               │
│ • Push: Firebase Cloud Messaging (FCM)                       │
│ • In-App: Firestore-Based Notifications                      │
│ • Slack: Webhooks (Security Alerts Only)                     │
└─────────────────────────────────────────────────────────────┘
```

### 42.2 Client-Side Notifications

**Service Toast:** `src/services/notifications/notificationService.ts`

| Type | Style | Usage |
|------|-------|-------|
| `success` | Vert | Confirmation positive |
| `error` | Rouge | Erreurs |
| `warning` | Ambre | Alertes |
| `info` | Bleu | Information |
| `sos` | Rouge + emoji | Urgence maximale |

**Composants UI Notification:**
| Composant | Description |
|-----------|-------------|
| `NotificationBadge` | Badge compteur avec animation pulse |
| `NotificationDot` | Indicateur point petit |
| `NotificationDotWrapper` | Dot avec effet ping |
| `UrgentIndicator` | Triangle warning avec glow |
| `InlineAlert` | Alerte dismissible avec actions |
| `AnimatedBadge` | Badge animé au changement |

### 42.3 Push Notifications (FCM)

**Hook:** `useFCM()` (`src/hooks/useFCM.ts`)
- Permission navigateur
- Génération/stockage tokens FCM
- Réception messages foreground
- Métadonnées: uid, role, updatedAt

**Service Worker:** `public/firebase-messaging-sw.js`
- Messages background
- Notifications système custom
- Actions click (Open/Close)

### 42.4 App Icon Badging (PWA)

**Hook:** `useBadging()` (`src/hooks/useBadging.ts`)

**Support navigateurs:**
- Chrome 81+ (desktop & Android)
- Edge 81+
- Safari 17+ (iOS 17+)

```typescript
const { setBadge, clearBadge, updateBadge, isSupported } = useBadging();
await setBadge(5);    // "5" sur icône app
await clearBadge();   // Efface badge
```

### 42.5 Pipeline Backend

**Trigger:** Document créé dans `message_events`

```typescript
{
  eventId: "booking_paid_provider",
  locale: "en",
  uid: "user123",
  to: { email, phone, fcmToken },
  context: { user, clientName, amount },
  channels: ["email", "sms", "push"]
}
```

**Worker:** `notificationPipeline/worker.ts`
1. Analyse payload event
2. Résolution langue (fallback français)
3. Chargement template
4. Configuration routing
5. Vérification rate limit
6. Sélection canaux
7. Envoi parallèle/fallback
8. Logging livraison

**Configuration:**
- Region: `europe-west1`
- Memory: `512MiB`
- Timeout: `120 seconds`

### 42.6 Templates Multi-Langues

**Location:** `message_templates/{locale}/items/{eventId}`

```typescript
{
  email: { enabled, subject, html, text },
  sms: { enabled, text },
  push: { enabled, title, body, deeplink },
  inapp: { enabled, title, body }
}
```

**Langues supportées:** en, fr, es, de, pt, ru, ar, hi, zh

### 42.7 Configuration Routing

**Location:** `message_routing/config`

```typescript
{
  strategy: "parallel" | "fallback",
  order: ["email", "push", "sms"],
  channels: {
    email: { enabled: true, provider: "zoho", rateLimitH: 0 },
    sms: { enabled: false, provider: "twilio" }, // DISABLED pour coûts
    push: { enabled: true, provider: "fcm" },
    inapp: { enabled: true, provider: "firestore" }
  }
}
```

### 42.8 Providers de Notification

| Canal | Provider | Configuration |
|-------|----------|---------------|
| **Email** | Zoho SMTP | `smtp.zoho.eu:465` SSL |
| **SMS** | Twilio | Rate limited, allowlist |
| **Push** | FCM | Firebase Cloud Messaging |
| **In-App** | Firestore | Collection `inapp_notifications` |
| **Slack** | Webhooks | Alertes sécurité uniquement |

### 42.9 Contrôle Coûts SMS

**Allowlist stricte:**
```typescript
const SMS_ALLOWED_EVENTS = [
  "booking_paid_provider",
  "call.cancelled.client_no_answer"
];
```

**Rate Limiting:**
```typescript
const SMS_RATE_LIMIT = {
  PER_NUMBER_MAX: 10,   // 10 SMS/numéro/heure
  GLOBAL_MAX: 100,      // 100 SMS/heure global
  WINDOW_MS: 3600000    // 1 heure
};
```

**Smart Sender:**
- Alphanumérique "SOS-Expat" (plupart pays)
- Numéro UK +447427874305 (USA/Canada/Chine)

### 42.10 Mécanisme Retry

**Scheduler:** `scheduled/notificationRetry.ts` (toutes 4h)

```typescript
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BACKOFF_MULTIPLIER: 2,      // 5min, 10min, 20min
  INITIAL_DELAY_MINUTES: 5,
  MAX_AGE_HOURS: 24,
  BATCH_SIZE: 50
};
```

**Dead Letter Queue:** `notification_dlq`
- Notifications échouées définitivement
- Tracking par canal et type event

### 42.11 Alertes Sécurité

**Fichier:** `securityAlerts/notifier.ts`

**Types d'alertes (15+):**
- Attaques brute force
- Connexions lieu inhabituel
- Paiements suspects
- Création comptes masse
- Abus API
- Tentatives breach données
- Injection SQL/XSS

**Routing par sévérité:**
| Sévérité | Email | Push | In-App | Slack |
|----------|-------|------|--------|-------|
| `info` | ❌ | ❌ | ✅ | ❌ |
| `warning` | ✅ | ✅ | ✅ | ✅ |
| `critical` | ✅ | ✅ | ✅ | ✅ |
| `emergency` | ✅ | ✅ | ✅ | ✅ |

### 42.12 Collections Firestore

| Collection | Usage | Rétention |
|------------|-------|-----------|
| `message_events` | Triggers notifications | Variable |
| `message_deliveries` | Logs livraison | 24h retry |
| `message_templates` | Templates multi-langue | Long-terme |
| `message_routing` | Config canaux | Long-terme |
| `inapp_notifications` | Messages in-app | User-managed |
| `notification_dlq` | Dead Letter Queue | Analyse |
| `fcm_tokens` | Tokens push | Auto-update |

### 42.13 Incoming Call Notification

**Composant:** `src/components/providers/IncomingCallNotification.tsx`

**Fonctionnalités:**
- Modal plein écran
- Infos client affichées
- Header animé gradient
- Contrôles son/vibration
- Boutons Answer/Decline
- Compteur temps écoulé
- Countdown auto-dismiss
- Animations: bounce-in, ring effect

### 42.14 Provider Reminder System

**Préférences:** `NotificationSettings.tsx`

```typescript
interface NotificationPreferences {
  enableSound: boolean;   // Rappel audio (5 min)
  enableVoice: boolean;   // Message vocal (10 min)
  enableModal: boolean;   // Popup modal
}
```

Visible uniquement lawyers/expats (pas clients).

### 42.15 Admin Dashboard

**Page:** `src/pages/admin/AdminNotifications.tsx`

**Fonctionnalités:**
1. Statistiques notifications (total, succès, échecs, taux)
2. Historique avec détails (destinataire, type, canaux, status)
3. Test notifications (modal envoi test)
4. Contrôles admin (refresh, retry manuel, stats DLQ)

### 42.16 Structure Fichiers

```
sos/src/
├── services/notifications/notificationService.ts
├── notifications/notificationsDashboardProviders/
│   ├── NotificationSettings.tsx
│   └── preferencesProviders.ts
├── hooks/
│   ├── useFCM.ts
│   ├── useBadging.ts
│   └── useServiceAlerts.ts
├── components/providers/IncomingCallNotification.tsx
└── pages/admin/AdminNotifications.tsx

sos/firebase/functions/src/
├── notificationPipeline/
│   ├── worker.ts
│   ├── types.ts
│   ├── routing.ts
│   ├── templates.ts
│   └── providers/{email,sms,push,inapp}/
├── notifications/notifyAfterPayment.ts
├── scheduled/notificationRetry.ts
└── securityAlerts/notifier.ts

sos/public/
└── firebase-messaging-sw.js
```

### 42.17 Résumé

**Système notification complet et optimisé:**
- ✅ 5 canaux (Email, SMS, Push, In-App, Slack)
- ✅ 9 langues supportées
- ✅ Retry intelligent avec backoff exponentiel
- ✅ Contrôle coûts SMS (allowlist + rate limit)
- ✅ Dashboard admin monitoring temps réel
- ✅ Alertes sécurité par sévérité
- ✅ PWA app icon badging
- ✅ Service worker background handling
- ✅ Logging complet livraisons
- ✅ Dead Letter Queue notifications échouées

---

## 43. Gestion des Erreurs et États de Chargement

### 43.1 Error Boundary Global

**Fichier:** `Outil-sos-expat/src/App.tsx`

Composant classe React qui capture toutes les erreurs non gérées:

```typescript
class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => window.location.href = '/auth';
  handleReload = () => window.location.reload();
}
```

**Rendu erreur:**
- UI conviviale avec icône, titre, description
- Détails techniques visibles en dev uniquement
- Boutons: "Recharger la page" / "Retour à l'accueil"
- Background gradient gray-50 → gray-100

### 43.2 Loading Spinner Component

**Fichier:** `Outil-sos-expat/src/components/ui/loading-spinner.tsx`

```typescript
interface LoadingSpinnerProps {
  size: "sm" | "md" | "lg" | "xl";
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

// Tailles
sm: h-4 w-4
md: h-6 w-6 (default)
lg: h-8 w-8
xl: h-12 w-12

// Mode fullScreen
fixed inset-0 z-50 bg-background/80 backdrop-blur-sm
```

### 43.3 Skeleton Loaders

**Base:** `components/ui/skeleton.tsx`
```css
div.animate-pulse.bg-muted.rounded-md
```

**Skeletons composés:**

| Composant | Fichier | Éléments |
|-----------|---------|----------|
| `DashboardSkeleton` | `skeletons/DashboardSkeleton.tsx` | StatsGrid, RecentBookings, Chart, QuickActions |
| `StatCardSkeleton` | `skeletons/StatCardSkeleton.tsx` | Label, value, trend, icon |
| `BookingCardSkeleton` | `skeletons/BookingCardSkeleton.tsx` | Header, title, status, meta, footer |

**Accessibilité skeletons:**
```html
<div role="status" aria-busy="true" aria-label="Loading dashboard">
  <div aria-hidden="true"><!-- placeholders --></div>
</div>
```

### 43.4 Toast Notifications

**Fichier:** `Outil-sos-expat/src/lib/toast.ts`

**Types de toast:**
| Type | Couleur | Durée |
|------|---------|-------|
| `success` | Vert | 3000ms |
| `error` | Rouge | 5000ms |
| `loading` | - | Pas auto-dismiss |
| `info` | Bleu | 4000ms |

**Messages pré-définis:**
```typescript
// AUTH
AUTH_SUCCESS, AUTH_ERROR, AUTH_EXPIRED, LOGOUT_SUCCESS

// SUBSCRIPTION
SUBSCRIPTION_REQUIRED, SUBSCRIPTION_EXPIRED, QUOTA_EXCEEDED

// AI
AI_LOADING, AI_SUCCESS, AI_ERROR, AI_TIMEOUT, AI_UNAVAILABLE

// DATA
SAVE_SUCCESS, SAVE_ERROR, DELETE_SUCCESS, DELETE_ERROR, LOAD_ERROR

// NETWORK
NETWORK_ERROR, OFFLINE, ONLINE

// FORMS
VALIDATION_ERROR, REQUIRED_FIELDS

// PERMISSIONS
PERMISSION_DENIED, ACCESS_DENIED
```

**Fonctions:**
```typescript
showSuccess(message, options?)
showError(message, options?)
showLoading(message, options?)
showInfo(message, options?)
dismissToast(id)
dismissAllToasts()
promiseToast<T>(promise, { loading, success, error })

// Raccourcis
notify.authSuccess()
notify.aiError()
notify.quotaExceeded()
```

**Configuration Toaster:**
```typescript
<Toaster
  position="bottom-center"
  toastOptions={{
    duration: 4000,
    borderRadius: '12px',
    padding: '16px',
    fontSize: '14px'
  }}
  containerStyle={{ bottom: 80 }} // Au-dessus nav mobile
/>
```

### 43.5 Sentry Integration

**Fichier:** `Outil-sos-expat/src/lib/sentry.ts`

**Configuration optimisée (free tier 5K/mois):**
```typescript
{
  sampleRate: 0.3,           // 30% erreurs
  tracesSampleRate: 0.05,    // 5% performance
  replaysOnErrorSampleRate: 0.1  // 10% replays
}
```

**Erreurs ignorées:**
- Network: `Failed to fetch`, `Network Error`, `AbortError`
- ResizeObserver: `loop limit exceeded`
- Firebase Auth: `popup-closed-by-user`, `network-request-failed`
- Navigation: `Navigation cancelled`
- Extensions: `chrome-extension://`, `moz-extension://`
- Third-party: `google-analytics.com`, `facebook.net`, `hotjar.com`

**beforeSend Hook:**
1. Filtre erreurs extensions browser
2. Filtre erreurs scripts tiers
3. Déduplication: max 10 erreurs identiques/session
4. Auto-enrichissement: `device_type`, `browser_lang`
5. Reset compteur toutes 5 minutes

**Helpers:**
```typescript
captureError(error, context?, tags?)
captureMessage(message, level?, context?)
setUserContext(user)
addBreadcrumb(message, category?, data?)
startTransaction(name, op)
```

### 43.6 Protected Route Error States

**Fichier:** `Outil-sos-expat/src/components/ProtectedRoute.tsx`

**États de chargement:**
| État | Message | Action |
|------|---------|--------|
| `authLoading` | "guards.loading" | Spinner |
| `subLoading` | "guards.verifyingAccess" | Spinner |

**Écrans bloqués (BlockedScreen):**

| Condition | Icône | Action primaire |
|-----------|-------|-----------------|
| `error` (account not found) | user | Register sur sos-expat.com |
| `!hasAllowedRole` | shield | Devenir provider |
| `!hasActiveSubscription` | lock | Gérer abonnement |

**BlockedScreen styling:**
```css
min-h-screen flex items-center justify-center
bg-gradient-to-br from-gray-50 to-gray-100
max-w-md card white shadow-xl

Icon colors:
- lock: bg-amber-100, text-amber-600
- shield: bg-red-100, text-red-600
- user: bg-gray-100, text-gray-600
```

### 43.7 React Query Error Handling

**Fichier:** `Outil-sos-expat/src/lib/queryClient.ts`

```typescript
defaultOptions: {
  queries: {
    staleTime: 5 * 60 * 1000,    // 5 minutes
    gcTime: 30 * 60 * 1000,      // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Max 2 retries
      // Skip retry sur 4xx (sauf 429)
      // Retry automatique sur 429 (rate limit)
    }
  },
  mutations: {
    retry: 1
  }
}
```

### 43.8 Firestore Query Hooks

**Fichier:** `Outil-sos-expat/src/hooks/useFirestoreQuery.ts`

```typescript
useFirestoreDocument<T>(collectionName, documentId, options)
useFirestoreCollection<T>(collectionName, constraints[], options)
useFirestoreRealtime<T>(collectionName, documentId, options)
useCreateDocument, useUpdateDocument, useDeleteDocument

// Retour commun
{ data, isLoading, error, isError, isFetching }

// Error callback realtime
onSnapshot(ref, onSuccess, (error) => {
  if (DEV) console.error(`[Firestore Realtime] Error:`, error);
});
```

### 43.9 Chat Box Error Display

**Fichier:** `Outil-sos-expat/src/components/Chat/GPTChatBox.tsx`

```html
<!-- ErrorMessage Component -->
<div role="alert" aria-live="assertive">
  <AlertCircle icon />
  <span class="text-red-600">{error}</span>
</div>

<!-- Loading Indicator -->
<TypingIndicator
  role="status"
  aria-busy="true"
  aria-label="AI is typing..."
/>
```

**Actions messages:**
- Copy: clipboard API avec try-catch
- Retry: handleRetry avec callback optionnel
- Feedback succès: CheckCircle 2 secondes

### 43.10 Unified User Context

**Fichier:** `Outil-sos-expat/src/contexts/UnifiedUserContext.tsx`

```typescript
interface State {
  loading: boolean;  // Auth state loading
  error: string | null;  // Subscription/role error
}

// Scénarios erreur:
// 1. Account not found → error set
// 2. User fetch failures → error state
// 3. Provider profile failures → graceful handling

// Recovery:
refreshUser()  // Manual refresh
// Auto-retry via TanStack Query config
```

### 43.11 Performance Monitoring

**Fichier:** `Outil-sos-expat/src/services/init/monitoring.ts`

```typescript
initPerformanceMonitoring()
  // Memory usage (dev only)
  // Connection effective type
  // Page load time (production)

initKeyboardShortcuts()
  // Ctrl+K, Ctrl+/ events

initOfflineHandling()
  // app:online, app:offline events

initAllMonitoring()
  // Called after render (non-blocking)
```

### 43.12 Patterns Résumé

**Pattern affichage erreurs:**
```
1. Try-Catch → Toast notification
2. TanStack Query error → error state hook
3. Component error → ErrorBoundary
4. Async operation → Spinner → Success/Error toast
5. API failure → Retry logic → Toast on final failure
```

**Pattern chargement:**
```
1. Page transition → Suspense → GlobalLoader
2. Data fetch → Spinner ou Skeleton
3. Form submission → Disabled state + spinner
4. Realtime updates → Skeleton optionnel
5. Chat generation → TypingIndicator
```

**Pattern accessibilité:**
```
1. Loading states → role="status", aria-busy="true"
2. Error messages → role="alert", aria-live="assertive"
3. Chat logs → role="log", aria-live="polite"
4. All spinners → aria-label descriptif
5. All skeletons → aria-hidden="true" éléments
```

### 43.13 Fichiers Clés

**Core Error Handling:**
```
Outil-sos-expat/src/
├── App.tsx                    # ErrorBoundary
├── lib/sentry.ts              # Sentry config
├── lib/toast.ts               # Toast system
└── lib/queryClient.ts         # React Query

Loading States:
├── components/ui/loading-spinner.tsx
├── components/ui/skeleton.tsx
└── components/skeletons/
    ├── DashboardSkeleton.tsx
    ├── StatCardSkeleton.tsx
    └── BookingCardSkeleton.tsx

Route Protection:
├── components/ProtectedRoute.tsx
└── components/guards/BlockedScreen.tsx
```

### 43.14 Best Practices Implémentées

- ✅ Error Boundary global (React unhandled errors)
- ✅ Sentry intégration (production monitoring)
- ✅ Toast notifications (feedback utilisateur)
- ✅ Skeleton loaders (placeholders fetch)
- ✅ Query retry logic (automatic backoff)
- ✅ Accessibilité (ARIA sur tous états)
- ✅ Error filtering (ignore non-actionable)
- ✅ Context error states (unified handling)
- ✅ Component-level errors (chat display)
- ✅ Performance non-blocking (init after render)

---

## 44. Fonctionnalités Admin Complètes

### 44.1 Vue d'ensemble

L'application dispose de **75+ pages admin** organisées sous le préfixe `/admin`:
- **Layout:** `src/components/admin/AdminLayout.tsx`
- **Routes:** `src/components/admin/AdminRoutesV2.tsx`
- **Menu Config:** `src/config/adminMenu.ts`

### 44.2 Pages Admin par Catégorie

#### A. Dashboard & Home
| Route | Description |
|-------|-------------|
| `/admin/dashboard` | Hub central, KPIs, statut système |

#### B. Gestion Utilisateurs (`/admin/users/*`)
| Route | Description |
|-------|-------------|
| `/admin/users/all` | Tous les utilisateurs |
| `/admin/users/clients` | Gestion clients |
| `/admin/users/providers/lawyers` | Gestion avocats |
| `/admin/users/providers/expats` | Gestion expats |
| `/admin/aaaprofiles` | Profils test auth |
| `/admin/approvals/lawyers` | Validation avocats |
| `/admin/kyc/providers` | Vérification KYC |
| `/admin/reviews` | Avis et évaluations |
| `/admin/validation` | Validation profils |

#### C. Gestion Appels (`/admin/calls/*`)
| Route | Description |
|-------|-------------|
| `/admin/calls` | Monitoring temps réel (LIVE) |
| `/admin/calls/sessions` | Sessions historiques |
| `/admin/calls/received` | Logs appels entrants |

#### D. Finance & Paiements (`/admin/finance/*`)
| Route | Description |
|-------|-------------|
| `/admin/finance/dashboard` | Vue financière |
| `/admin/finance/transactions` | Toutes transactions |
| `/admin/finance/payments` | Paiements appels |
| `/admin/finance/subscriptions` | Abonnements |
| `/admin/finance/refunds` | Remboursements |
| `/admin/finance/disputes` | Litiges/chargebacks |
| `/admin/finance/invoices` | Factures |
| `/admin/finance/payouts` | Reversements prestataires |
| `/admin/finance/escrow` | Fonds séquestre |
| `/admin/finance/taxes` | Configuration taxes |
| `/admin/finance/filings` | Déclarations fiscales |
| `/admin/finance/thresholds` | Seuils déclaration |
| `/admin/finance/reconciliation` | Rapprochement comptes |
| `/admin/finance/ledger` | Grand livre |
| `/admin/finance/balance-sheet` | Bilan comptable |
| `/admin/finance/profit-loss` | Compte de résultat |
| `/admin/finance/cash-flow` | Flux de trésorerie |
| `/admin/finance/exports` | Exports données |
| `/admin/finance/costs` | Suivi coûts cloud |
| `/admin/finance/gcp-costs` | Coûts Google Cloud |

#### E. Marketing & Communications
| Route | Description |
|-------|-------------|
| `/admin/coupons` | Codes promo |
| `/admin/marketing/trustpilot` | Intégration Trustpilot |
| `/admin/marketing/ads-analytics` | Analytics publicité |
| `/admin/marketing/meta-analytics` | Facebook/Instagram |
| `/admin/marketing/google-ads-analytics` | Google Ads |
| `/admin/comms/notifications` | Notifications push |
| `/admin/contact-messages` | Messages contact |
| `/admin/feedback` | Retours utilisateurs |

#### F. Analytics & Reporting
| Route | Description |
|-------|-------------|
| `/admin/analytics/unified` | Dashboard unifié |
| `/admin/reports/country-stats` | Stats par pays |
| `/admin/reports/error-logs` | Logs erreurs |
| `/admin/security/alerts` | Alertes sécurité |

#### G. Administration Système
| Route | Description |
|-------|-------------|
| `/admin/pricing` | Configuration prix |
| `/admin/countries` | Gestion pays |
| `/admin/help-center` | FAQ et aide |
| `/admin/settings` | Configuration plateforme |
| `/admin/system-health` | Santé système |
| `/admin/backups` | Sauvegardes |
| `/admin/logs` | Logs connexion |

### 44.3 API Admin (Cloud Functions)

#### Financial Stats API
```
POST /admin/financial-stats
Auth: Bearer Firebase ID Token
Returns: Revenue mensuel, commissions, transactions actives, taux conversion
```

#### Last Modifications API
```
POST /admin/last-modifications
Returns: Timestamps dernières mises à jour (pricing, paiements, analytics)
```

#### System Status API
```
POST /admin/system-status
Returns: Statut API, santé BDD, cache, latence
```

### 44.4 Callable Functions Admin

#### Gestion Abonnements (`subscription/adminFunctions.ts`)

| Fonction | Description |
|----------|-------------|
| `adminForceAiAccess` | Accorder/révoquer accès IA gratuit |
| `adminResetQuota` | Réinitialiser quota appels IA |
| `adminChangePlan` | Changer plan abonnement |
| `adminCancelSubscription` | Annuler abonnement |
| `adminGetSubscriptionStats` | Stats globales (MRR, ARR, churn) |
| `adminSyncStripePrices` | Sync Firestore ↔ Stripe |
| `adminGetProviderSubscriptionHistory` | Historique complet provider |
| `adminPauseSubscription` | Pause sans annulation |
| `adminResumeSubscription` | Reprise abonnement |

#### Gestion Déclarations Fiscales (`taxFilings/adminCallables.ts`)

| Fonction | Description |
|----------|-------------|
| `updateFilingStatus` | Changer statut (DRAFT → SUBMITTED → PAID) |
| `deleteFilingDraft` | Supprimer brouillons uniquement |
| `updateFilingAmounts` | Ajuster montants déductibles |

#### Nettoyage Sessions & Providers

| Fonction | Description |
|----------|-------------|
| `adminCleanupOrphanedSessions` | Nettoyer sessions bloquées |
| `adminGetOrphanedSessionsStats` | Stats sessions orphelines |
| `adminCleanupOrphanedProviders` | Fix linkedProviderIds orphelins |
| `adminGetOrphanedProvidersStats` | Stats providers orphelins |

#### Gestion Templates (`admin/callables.ts`)

| Fonction | Description |
|----------|-------------|
| `admin_templates_list` | Liste templates email/SMS/push |
| `admin_templates_get` | Obtenir template spécifique |
| `admin_templates_upsert` | Créer/modifier templates |
| `admin_templates_seed` | Initialiser templates par défaut |
| `admin_routing_get` | Config routage messages |
| `admin_routing_upsert` | Configurer canaux et délais |
| `admin_testSend` | Test envoi template |

#### Actions Providers (`admin/providerActions.ts`)

| Fonction | Description |
|----------|-------------|
| `adminHideProvider` | Masquer des résultats |
| `adminUnhideProvider` | Rendre visible |
| `adminBlockProvider` | Bannir de la plateforme |
| `adminUnblockProvider` | Débloquer |
| `adminSuspendProvider` | Suspension temporaire |
| `adminUnsuspendProvider` | Fin suspension |
| `adminSoftDeleteProvider` | Suppression récupérable |
| `adminHardDeleteProvider` | Purge RGPD (permanent) |
| `adminBulkHideProviders` | Masquer en masse |
| `adminBulkBlockProviders` | Bannir en masse |

#### Backup & Recovery

| Fonction | Description |
|----------|-------------|
| `backupRestoreAdmin` | Backup/restore BDD complet |
| `enableStorageVersioning` | Activer versioning Storage |
| `restoreCollection` | Restaurer collection spécifique |
| `restoreFirebaseAuth` | Restaurer données auth |
| `restoreUserRoles` | Restaurer rôles utilisateurs |

### 44.5 Authentification Admin

**Modèle permissions:**
```typescript
// Vérification custom claims
if (decodedToken.role !== 'admin' && decodedToken.admin !== true) {
  // Accès refusé
}

// Fallback Firestore
const userDoc = await db.collection('users').doc(uid).get();
if (userDoc.data()?.role !== 'admin') {
  // Accès refusé
}
```

**Sécurité session:**
- Bearer token auth pour endpoints API
- Vérification Firebase ID token
- Logging actions admin avec userId et timestamp

### 44.6 Audit Trail

**Collections de logs:**
| Collection | Contenu |
|------------|---------|
| `admin_actions` | Toutes actions admin |
| `provider_action_logs` | Actions sur providers |
| `subscription_logs` | Changements abonnements |
| `system_logs` | Événements système |

**Opérations monitorées:**
- Changements rôles utilisateurs
- Bans/suspensions/suppressions providers
- Remboursements et litiges
- Changements plans abonnement
- Modifications configuration
- Modifications templates
- Opérations nettoyage

### 44.7 Services Admin Frontend

**Finance Service (`adminFinanceService.ts`):**
- KPIs: revenue total, frais plateforme, reversements
- Totaux remboursements, comptage litiges
- Abonnements actifs, MRR, taux conversion
- Filtres: statut, date, montant, pays
- Cache 5 minutes TTL

### 44.8 Résumé Fonctionnalités

| Catégorie | Capacité | Protégé |
|-----------|----------|---------|
| **Utilisateurs** | Créer, modifier, bannir, supprimer | ✅ |
| **Providers** | Masquer, bloquer, suspendre, supprimer | ✅ |
| **Paiements** | Rembourser, ajuster, gérer litiges | ✅ |
| **Abonnements** | Changer plan, pause, reprise, annulation | ✅ |
| **Déclarations fiscales** | Statuts, montants, suppression | ✅ |
| **Analytics** | KPIs, stats financières, métriques appels | ✅ |
| **Pricing** | Configurer prix et codes promo | ✅ |
| **Templates** | Gestion email/SMS/push | ✅ |
| **Nettoyage** | Sessions et providers orphelins | ✅ |
| **Backup** | Sauvegarde et restauration BDD | ✅ |
| **Reports** | Export données financières et analytics | ✅ |

### 44.9 Fichiers Clés

```
Frontend:
sos/src/
├── pages/admin/           # 75+ pages admin
├── components/admin/
│   ├── AdminLayout.tsx    # Layout principal
│   └── AdminRoutesV2.tsx  # Routes
├── config/adminMenu.ts    # Structure menu
└── services/finance/adminFinanceService.ts

Backend:
sos/firebase/functions/src/
├── adminApi.ts                    # Routes REST API
├── subscription/adminFunctions.ts # Fonctions abonnement
├── taxFilings/adminCallables.ts   # Fonctions fiscales
├── admin/                         # 10+ fichiers admin
│   ├── callables.ts
│   ├── providerActions.ts
│   └── ...
└── callables/                     # Cleanup callables
```

---

## 45. Flux d'Onboarding Utilisateur

### 45.1 Points d'Entrée Inscription

**Trois rôles distincts:**
| Rôle | Route | Fichier |
|------|-------|---------|
| **Client** | `/register/client` | `RegisterClient.tsx` (73KB) |
| **Avocat** | `/register/lawyer` | `RegisterLawyer.tsx` (109KB) |
| **Expat** | `/register/expat` | `RegisterExpat.tsx` (91KB) |

### 45.2 Flux Inscription Client

#### Étapes du formulaire:
1. **Tracking initial:** `trackMetaStartRegistration()` au montage
2. **Validation formulaire:**
   - Prénom/Nom (requis, 2-50 chars)
   - Email (requis, format validé, sanitizé)
   - Mot de passe (8-128 chars, indicateur force)
   - Langues parlées (requis, multi-select)
   - Téléphone (format international)
   - Acceptation CGU (checkbox requis)

3. **Sanitization sécurité:**
   - Suppression tags HTML `<>`
   - Blocage patterns XSS (`javascript:`, `on*=`)
   - Nettoyage email (espaces, caractères zero-width)

4. **Méthodes inscription:**
   - **Google Auth:** Redirect (pas popup, évite erreurs COOP)
   - **Email/Password:** Formulaire classique

5. **Post-succès:**
   - User créé Firebase Auth
   - Document Firestore créé
   - `trackMetaCompleteRegistration()` + `trackAdRegistration()`
   - Redirection Dashboard

### 45.3 Document Utilisateur Firestore

**Client (auto-approuvé):**
```typescript
{
  uid, email, firstName, lastName, fullName,
  languagesSpoken[], phone,
  role: "client",
  isApproved: true,
  approvalStatus: "approved",
  verificationStatus: "approved",
  status: "active",
  isActive: true, isBanned: false, isVerified: true,
  affiliateCode: "SOS-{6chars}",
  notificationPreferences: { email: true, push: true, sms: false },
  createdAt, lastLoginAt
}
```

**Provider (nécessite approbation):**
```typescript
// Collection sos_profiles
{
  type: "lawyer" | "expat",
  isApproved: false,
  approvalStatus: "pending",
  isVerified: false, isVisible: false,
  availability: "offline",
  rating: 5.0, reviewCount: 0,
  price: 49 (lawyer) / 19 (expat),
  duration: 20 (lawyer) / 30 (expat)
}
```

### 45.4 Post-Inscription: Authentification

**AuthContext.tsx gère:**
1. Firebase Auth State
2. Persistence locale browser
3. Redirection automatique → `/dashboard`
4. Mise à jour context global
5. Détection device (type, OS, browser, vitesse)
6. Tracking session (user agent, viewport)

### 45.5 Dashboard Landing

#### Pour Clients:
- Stats dashboard rapides
- Actions rapides (browse, book, profile)
- Activité récente, messages, paramètres

#### Pour Providers:
- **Alert statut profil** (pending/approved/rejected)
- **KYC Banner** (Stripe Connect, PayPal, approbation)
- **Toggle disponibilité** (online/offline)
- **Dashboard revenus, historique appels, notifications**

### 45.6 Onboarding Provider Spécifique

#### Étape 1: Approbation Profil
- Statut "pending" dans `approvalStatus`
- Admin review manuel
- Banner pending sur dashboard

#### Étape 2: Onboarding Paiement (KYC)

**Option A: Stripe Connect**
```
1. Formulaire embarqué Stripe
2. Vérification identité (document)
3. Informations business
4. Coordonnées bancaires
5. Revue & soumission
→ Webhook Stripe update status
→ Polling fallback 60s si webhook échoue
```

**Option B: PayPal**
```
1. Composant onboarding PayPal
2. Liaison compte PayPal
3. Vérification email
→ paypalMerchantId + paypalEmailVerified
```

#### Étape 3: Visibilité Profil
Une fois approuvé ET paiement connecté:
- `isVisible: true`
- Apparaît dans listings
- Peut recevoir bookings
- Toggle disponibilité fonctionnel

### 45.7 Flux par Rôle

**CLIENT:**
```
Register → Dashboard (accès immédiat) → Profil → Browse → Book → Pay → Communicate
```

**PROVIDER:**
```
Register → Dashboard (pending) → Profile details → KYC setup → Admin approval → Go live → Accept bookings
```

### 45.8 Sécurité & Validation

**RegisterClient:**
- Sanitization: `sanitizeString()`, `sanitizeEmail()`
- Regex email: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Validation téléphone: libphonenumber-js
- Honeypot field (anti-bot) - RegisterExpat
- reCAPTCHA v3 (invisible) - RegisterExpat
- Temps minimum remplissage: 15 secondes
- Tracking comportemental: mouvements souris, frappes

**Firestore Rules protègent:**
- `isApproved`, `approvalStatus`
- `isAdmin`, `isBanned`
- `stripeAccountId`, `paypalMerchantId`
- Champs earnings

### 45.9 Analytics & Tracking

**Meta Pixel (`metaPixel.ts`):**
- `trackMetaStartRegistration()` - Visite page inscription
- `trackMetaCompleteRegistration()` - Inscription réussie
- Déduplication via IDs uniques
- Hashing données: email, phone

**Ad Attribution (`adAttributionService.ts`):**
- `trackAdRegistration()` - Log Firestore admin
- Source trafic, device info
- Analyse ROI campagnes

### 45.10 Gestion Erreurs UX

**Validation temps réel:**
- Email validity, password strength pendant frappe
- Validations au blur
- Messages inline avec icônes
- Bordures: rouge erreur, vert valide

**Erreurs courantes:**
| Code Firebase | Message affiché |
|---------------|-----------------|
| `email-already-in-use` | Message user-friendly |
| `weak-password` | Suggestion renforcement |
| `invalid-email` | Feedback format |
| `network-error` | Option retry |
| `popup-closed-by-user` | Silencieux |

### 45.11 Optimisation Mobile

- **Design responsive:** Mobile-first CSS
- **Touch-friendly:** Inputs 44px+ hauteur
- **Auth mobile:** Détection WebView (Facebook, Instagram, TikTok)
  - WebView → redirect (pas popup)
  - iOS Safari → popup (meilleur ITP)
  - Android WebView → redirect
- **Progressive enhancement:** Timeout 60s connexions lentes

### 45.12 Internationalisation

**9 langues supportées:** FR, EN, ES, DE, PT, RU, HI, ZH, AR

**100% traduit:**
- Labels formulaire, erreurs, aide
- JSON-LD données structurées (SEO)
- Meta tags, Open Graph, Twitter Cards
- Hreflang tags multilingue

### 45.13 SEO Pages Inscription

**RegisterClient inclut:**
- Title, meta description, keywords
- Open Graph + Twitter Cards
- JSON-LD schemas:
  - WebPage, Organization
  - FAQPage (8 Q&A)
  - Service
- URLs canoniques
- Hreflang toutes langues
- Meta app mobile

### 45.14 Éléments Première Expérience

**Section FAQ (sous formulaire):**
- 8 questions fréquentes
- Réponses expandables
- Optimisé Featured Snippets Google

**Badges de confiance:**
- "Vérification Sécurisée" (shield)
- "Support 24/7" (clock)
- "Multiples Pays" (globe)
- "Utilisateurs Vérifiés" (people)

### 45.15 Timeline Post-Inscription

| Moment | Action |
|--------|--------|
| **< 1 seconde** | User Firebase + Firestore créés, token, login |
| **< 5 secondes** | Meta Pixel, attribution, redirect dashboard |
| **Premier load dashboard** | Clients: accès complet / Providers: banners pending+KYC |
| **24-48 heures** | Admin review provider, notification statut |
| **Post-approbation** | Provider complète Stripe/PayPal |
| **Go live** | Profil visible, bookings actifs, disponibilité toggle |

### 45.16 Métriques Trackées

**Pendant inscription:**
- StartRegistration, CompleteRegistration events
- Google auth success/failure
- Erreurs validation champs
- Temps completion

**Post-inscription:**
- Timestamps login
- Device info (OS, browser, type)
- Vitesse réseau, user agent
- Viewport/screen, localisation
- Source trafic (UTM, fbclid)

### 45.17 Fichiers Clés

```
Inscription:
sos/src/pages/
├── RegisterClient.tsx (73KB)
├── RegisterExpat.tsx (91KB)
├── RegisterLawyer.tsx (109KB)
└── Register.tsx (sélection rôle)

Auth:
├── contexts/AuthContext.tsx (400+ lignes)
└── utils/auth.ts (registerUser, loginUser)

Dashboard:
├── pages/Dashboard.tsx (175KB)
├── components/dashboard/KYCBannerCompact.tsx
└── components/StripeKyc.tsx

Analytics:
├── utils/metaPixel.ts
└── services/adAttributionService.ts
```

### 45.18 Résumé Onboarding

| Aspect | Détail |
|--------|--------|
| **Temps inscription** | 2-3 min clients, 5-10 min providers |
| **Friction** | Auto-approbation clients |
| **Sécurité** | XSS prevention, sanitization, reCAPTCHA |
| **Analytics** | Full funnel tracking |
| **Portée globale** | 9 langues, téléphone international |
| **Confiance** | Badges sécurité, FAQ, exigences transparentes |
| **Différenciation rôles** | Parcours post-inscription complètement différents |

---

## 46. Fonctions Utilitaires et Helpers

### 46.1 Utilitaires Core

#### utils.ts (lib/)
```typescript
cn(...classes) // Concaténation classnames, filtre valeurs falsy
```

#### errors.ts
```typescript
getErrorMessage(error)  // Extraction sécurisée message erreur
getErrorCode(error)     // Extraction code erreur
interface AppError      // Type Error étendu avec code et details
```

### 46.2 Authentication & User Management

#### auth.ts
```typescript
initRecaptcha(elementId)       // Init reCAPTCHA invisible
registerUser(userData, password) // Création user Firebase + Firestore
verificationSmsConfig          // Messages SMS i18n (FR/EN)
```

### 46.3 Database & Firestore

#### firestore.ts (55KB)
```typescript
// Helpers type-safe
asDict(), getStr(), getBool(), getNum(), getArr(), toDate()

// Pagination
fetchAllDocsPaginated()    // Batches de 500 docs
PAGINATION_BATCH_SIZE = 500

// User data, call records, payments, reviews
// Real-time listeners avec onSnapshot
```

#### firestoreCache.ts
**Réduction 30-50% lectures Firestore:**
```typescript
getCached<T>(cacheKey, subKey)     // Récupère avec validation TTL
setCache<T>(cacheKey, data)        // Stocke localStorage
clearCache() / clearAllCaches()
fetchWithCache<T>(cacheKey, subKey, fetchFn)

// TTL configurations:
SUBSCRIPTION_PLANS: 24 heures
COUNTRIES: 7 jours
HELP_CATEGORIES: 1 heure
TRIAL_CONFIG: 1 heure
```

### 46.4 Logging & Debugging

#### logging.ts
```typescript
LoggingService           // Singleton logging
sanitizeData()           // Prévention injection, limites taille
// Retry: 3 tentatives, backoff exponentiel
// Max: 1000 chars string, 50 items array, 20 props object
```

#### correlationId.ts
```typescript
generateCorrelationId(prefix)   // {prefix}-{timestamp}-{random}
getSessionCorrelationId()       // ID niveau session
getCurrentCorrelationId()       // ID niveau requête
getCorrelationContext()         // Contexte complet
withCorrelationId(headers)      // HOF header X-Correlation-ID
withCorrelation<T>(action)      // Wrapper async
createCorrelationScope()        // Hook-friendly
```

### 46.5 Analytics & Tracking

#### ga4.ts
```typescript
isGA4Enabled()          // GA4 configuré?
hasAnalyticsConsent()   // Préférences cookies localStorage
configureGA4()          // Setup avec paramètres privacy
// Consent mode v2, RGPD
```

#### metaPixel.ts (28KB)
```typescript
PIXEL_ID = '2204016713738311'
isValidEmail(email)              // Regex validation
isValidPhone(phone)              // 10-15 digits
normalizePhoneForMeta(phone, countryCode)
// Event tracking conversions, purchases, leads
// Advanced matching avec hashed PII
```

#### googleAds.ts (27KB)
```typescript
GOOGLE_ADS_CONVERSION_ID         // Env variables
CONVERSION_LABELS                // purchase, lead, signup, checkout
normalizePhoneForGoogle(phone)   // Format E.164 (+33...)
// Enhanced conversions, consent mode v2
```

#### trafficSource.ts
```typescript
interface TrafficSource          // UTM, fbclid, gclid, ttclid, referrer
TIMEZONE_TO_COUNTRY              // 100+ timezones → ISO codes
detectUserCountry()              // Auto-détection timezone/geoloc
captureTrafficSource()           // sessionStorage
// Support: Facebook, Instagram, TikTok, YouTube, Google Ads
```

#### fbpCookie.ts
```typescript
getMetaIdentifiers()             // FBP et FBC cookies
captureAndStoreMetaIdentifiers() // Stockage Meta cookies
// Cross-domain tracking, CAPI
```

#### sharedEventId.ts
```typescript
generateSharedEventId()          // IDs uniques cross-platform
// Déduplication GA4, Meta, Google Ads
```

### 46.6 Performance Monitoring

#### performance.ts (17.5KB)
```typescript
registerSW()                     // Service Worker registration

// Navigation Timing
DNS, TCP, SSL, TTFB, download, DOM parsing

// Web Vitals
LCP, FID, CLS, FCP, TTFB, INP

// JS Heap Size
used, total, limit

// Connection Info
effectiveType, downlink, RTT, saveData
```

### 46.7 Phone Number Handling

#### phone.ts (202 lignes)
```typescript
smartNormalizePhone(input, selectedCountry)
// Handles: national (0612345678), international (+33), prefixes (00)
// Trunk prefix: 0 FR/UK, 8 RU
// Returns: {ok, e164, reason, country, nationalNumber}

toE164(input, defaultCountry)           // Legacy wrapper
normalizePhoneForInput(input, countryCode)
isValidPhone(phone, country)
getNationalNumber(e164)
getCountryFromPhone(e164)
// Support 197 pays
```

### 46.8 Localization & Internationalization

#### formatters.ts (12KB)
```typescript
getCountryName(countryCode, langCode)
// 10 langues: FR, EN, ES, DE, PT, ZH, AR, RU, IT, NL

getCountryNames(countryCodes, langCode)  // Batch
getLanguageLabel(langCode)
localeFormatters                         // Number, date, currency
```

#### countryUtils.ts
```typescript
getCountryCodeFromName(countryName)      // Nom → ISO-2
normalizeCountryToCode(country)          // Code ou nom → ISO
isValidCountryCode(code)
getCountryData(countryCodeOrName)
// Recherche 10 langues
```

#### localeRoutes.ts
```typescript
getLocaleString(lang, country)           // "en-us"
parseLocaleFromPath(pathname)
hasLocalePrefix(pathname)
getLocaleFromPath(pathname, defaultLang)
getSupportedLocales()
// Geolocation + timezone detection
```

### 46.9 Data Transformation & Generation

#### slugGenerator.ts (64KB)
```typescript
// Format: /{lang}/{role-country}/{firstname-specialty-shortid}
// Exemple: /fr/avocat-thailande/julien-visa-k7m2p9

generateShortId(firebaseUid)   // 6 chars déterministe
// Chars: 23456789abcdefghjkmnpqrstuvwxyz (pas ambigus)

extractShortIdFromSlug(slug)
VALID_LOCALES                  // Toutes combinaisons lang-country
// Max 50-60 chars (vs 85+ avant)
// 197 pays, toutes langues majeures
```

#### specialtyMapper.ts (23KB)
```typescript
// Maps spécialités → traductions
// 10+ langues
// Liens spécialités → slug components
```

#### snippetGenerator.ts (45KB)
```typescript
// Schema.org structured data
// OpenGraph meta tags
// Twitter Cards
// Rich snippet templates
```

### 46.10 Pricing & Payment

#### coupon.ts (12KB)
```typescript
validateCoupon(params)         // Valide: code, user, amount, service
recordCouponUsage(params)      // Log usage
// Types: Fixed ou percentage
// Cache 5 min TTL
// Validation: 50 chars max, 0.01-10000 amount
// Checks: active, dates, min order, max uses/user
```

#### amountValidator.ts
```typescript
validateAmounts(amounts)       // total = commission + provider
// Lawyer: ~39% commission (19€ de 49€)
// Expat: ~47% commission (9€ de 19€)
// Min 0.50€, max 500€
```

### 46.11 URL & Network Handling

#### urlUtils.ts
```typescript
isUrlExpired(url)              // Signed URL expiré?
getUrlExpiration(url)          // Timestamp expiration ms
// Buffer 1 minute clock skew
```

#### networkResilience.ts (287 lignes)
```typescript
isAbortError(error)            // Détecte AbortError
isExtensionBlockedError(error) // Confirme blocage extension
resilientFetch(input, init, maxRetries)
// 3 retries, backoff exponentiel (300ms * attempt)

installNetworkResilience()     // Intercepteur fetch global
suppressExtensionErrors()      // Filtre spam erreurs extension
detectBlockingExtensions()     // Test blocage Firebase
getExtensionBlockedMessage(language)  // Message aide FR/EN/ES/DE
```

### 46.12 Validation Schemas (Zod)

#### pricing.schema.ts
```typescript
// Validation plan
// Validation structure prix
```

#### subscription.schema.ts (14KB)
```typescript
// Validation plan abonnement
// Validation subscription utilisateur
// Structures imbriquées complexes
```

### 46.13 Résumé par Catégorie

| Catégorie | Nombre | Fichiers clés |
|-----------|--------|---------------|
| **Authentication** | 2 | auth.ts, authDiagnostics.ts |
| **Database** | 2 | firestore.ts, firestoreCache.ts |
| **Logging** | 4 | logging.ts, correlationId.ts, debugLogger.ts |
| **Analytics** | 7 | ga4.ts, metaPixel.ts, googleAds.ts, trafficSource.ts |
| **Performance** | 3 | performance.ts, debugAdmin.ts |
| **Phone/Locale** | 5 | phone.ts, formatters.ts, countryUtils.ts, localeRoutes.ts |
| **Data Generation** | 4 | slugGenerator.ts, specialtyMapper.ts, snippetGenerator.ts |
| **Payment** | 3 | coupon.ts, amountValidator.ts, pricingMigration.ts |
| **Network/URL** | 2 | urlUtils.ts, networkResilience.ts |
| **Validation** | 2 | pricing.schema.ts, subscription.schema.ts |
| **Misc** | 3 | errors.ts, cn.ts, ts.ts |

**Total: 45+ fichiers utilitaires**

---

## 47. Pages Landing et Marketing

### 47.1 Structure Homepage (`Home.tsx`)

**Sections de la page d'accueil:**

#### 1. Hero Section
- Thème sombre gradient (gray-950 → gray-900)
- Texte animé gradient: "SOS Expat" (blanc) + "Emergency Legal Assistance" (red-orange)
- **Double CTA:**
  - Primary: "Call Now" (red-orange, icône téléphone, animation pulse)
  - Secondary: "See Experts" (bordure blanche, icône play)
- **Grille 3 colonnes statistiques:**
  - Users/Expatriés (gradient blue-cyan)
  - Pays couverts (gradient green-emerald)
  - Support 24/7 (gradient orange-red)
- Effets visuels: blobs gradient animés (red, orange, blue, purple)

#### 2. Experts Section
- Background blanc teinté rose
- **ProfileCarousel Component:** Profils professionnels rotatifs
- Titre: "Meet Our Verified Experts"

#### 3. Pricing Section
- Thème sombre (gray-950 → gray-900)
- **Sélecteur devise:** Toggle EUR/USD
- **Deux cartes offre:**
  - **Appel Expat:** €19 / $25 - 30 minutes (gradient bleu)
  - **Appel Avocat:** €49 / $55 - 20 minutes (gradient rouge)
- Section exemples avec checkmarks
- Rangée garanties: Confidentialité, Pays couverts, Accès instantané

#### 4. Why Choose Us Section
- Thème clair (white → gray-50)
- **3 cartes avantages:**
  1. Speed Worldwide (red-orange)
  2. Coffee Break Fast (yellow-red)
  3. Multilingual (blue-purple)
- Effets hover: scale, shadow transitions

#### 5. Join Us Section
- Thème sombre (gray-900 → gray-950)
- **Deux cartes:**
  - Devenir Avocat (gradient red-orange, 6 bénéfices)
  - Devenir Expat Helper (gradient blue-indigo, 8 bénéfices)
- Liens vers pages inscription respectives

#### 6. Reviews/Testimonials Section
- Background clair
- **ReviewsSlider Component:**
  - Carousel 6 profils avis
  - Avatar (Unsplash), nom, ville, 5 étoiles
  - Badge type avis (Lawyer/Expat)
  - Auto-rotation (4.5s), pause au hover
  - Support swipe tactile mobile
  - Dots pagination

#### 7. Final CTA Section
- Gradient background (red-600 → orange-500)
- Titre: "Don't Face Expatriation Alone"
- **Trust Badges:** Secured, Under 5 minutes, Worldwide
- **Double CTA:** "Start Free Now" + "Urgent Call Now"

### 47.2 SEO & Metadata

**JSON-LD Schemas (7 types):**
1. Organization avec AggregateRating (Google Stars)
2. WebSite schema
3. Service schema avec reviews
4. FAQ schema
5. BreadcrumbList schema
6. WebPage avec Speakable specification
7. HowTo schema

**Hreflang tags:** 9 langues (FR, EN, ES, DE, PT, RU, ZH, AR, HI)
**Canonical URLs:** Construction dynamique avec langue

### 47.3 Liste Complète Pages Marketing (39 pages)

#### Pages Publiques Principales
| Page | Fichier | Description |
|------|---------|-------------|
| Home | `Home.tsx` | Landing page |
| How It Works | `HowItWorks.tsx` | Guide processus 3 étapes |
| Pricing | `Pricing.tsx` | Prix avec promos |
| Testimonials | `Testimonials.tsx` | Galerie avis (2347+) |
| Providers | `Providers.tsx` | Annuaire experts avec carte |
| FAQ | `FAQ.tsx` | FAQ recherchable par catégories |
| Contact | `Contact.tsx` | Formulaire contact multilingue |
| Help Center | `HelpCenter.tsx` | Documentation ressources |

#### Pages Légales
| Page | Fichier | Description |
|------|---------|-------------|
| Privacy Policy | `PrivacyPolicy.tsx` | Politique confidentialité |
| Cookies | `Cookies.tsx` | Politique cookies |
| Terms Clients | `TermsClients.tsx` | CGU utilisateurs |
| Terms Expats | `TermsExpats.tsx` | CGU helpers expat |
| Terms Lawyers | `TermsLawyers.tsx` | CGU avocats |
| Consumers | `Consumers.tsx` | Droits consommateurs |

#### Pages Booking/Payment
| Page | Fichier | Description |
|------|---------|-------------|
| Booking Request | `BookingRequest.tsx` | Interface réservation |
| SOSCall | `SOSCall.tsx` | Page appel urgence |
| Call Checkout | `CallCheckout.tsx` | Paiement |
| Payment Success | `PaymentSuccess.tsx` | Confirmation |

#### Pages Authentification
| Page | Fichier | Description |
|------|---------|-------------|
| Register | `Register.tsx` | Création compte générique |
| Register Client | `RegisterClient.tsx` | Inscription client |
| Register Expat | `RegisterExpat.tsx` | Inscription expat helper |
| Register Lawyer | `RegisterLawyer.tsx` | Inscription avocat |
| Login | `Login.tsx` | Connexion |
| Password Reset | `PasswordReset.tsx` | Récupération mdp |

### 47.4 Composants Homepage

**Location:** `src/components/home/`

| Composant | Description |
|-----------|-------------|
| `ProfileCarousel.tsx` | Carousel profils experts avec filtrage |
| `ModernProfileCard.tsx` | Carte profil individuelle |
| `ReviewsSlider.tsx` | Carousel avis auto-rotation |
| `HeroSection.tsx` | Bannière hero |
| `HowItWorksSection.tsx` | Section étapes processus |
| `ServicesSection.tsx` | Offres services |
| `TestimonialsSection.tsx` | Section avis |
| `CTASection.tsx` | Section call-to-action |

### 47.5 Fonctionnalités Marketing

#### Support Multilingue
- 9 langues complètes
- Hreflang tags SEO
- Sélecteur langue composants
- Slugs routes traduits

#### Intégration Pricing
- Prix dynamiques depuis Firestore admin
- Toggle EUR/USD
- Système validation codes promo
- Calcul prix effectifs avec overrides

#### Gestion Avis
- Système notation agrégée (4.5+ moyenne)
- Avis vérifiés avec avatars
- Filtrage type service (Lawyer/Expat)
- 2,347+ avis dans 150+ pays

#### Annuaire Experts
- Filtrage carte géographique
- Recherche et tri (rating, prix, expérience)
- Système vérification providers
- Toggle visibilité profil

### 47.6 Design System

#### Palette Couleurs
**Gradients Primaires:**
- Red-Orange: `from-red-600 to-orange-500` (CTAs, services avocat)
- Blue-Indigo: `from-blue-600 to-indigo-600` (services expat)
- Neon/Accent: Emerald, Teal, Purple, Yellow, Pink

**Backgrounds:**
- Dark: `bg-gray-950`, `bg-gray-900` (hero, pricing, join)
- Light: `bg-white`, `bg-gray-50` (features, reviews)

#### Typographie
- Headings: **font-black**, 6xl-8xl desktop
- Body: **leading-relaxed** pour lisibilité
- CTA: **font-bold** ou **font-black**

#### Éléments Interactifs
- Boutons: rounded-full, rounded-3xl
- Hover: scale-105, scale-110, shadow-2xl
- Animations: pulse badges, gradient text
- Accessibilité: ARIA labels, rôles, HTML sémantique

### 47.7 Routing Marketing

**Routes base:**
| Route | Page |
|-------|------|
| `/` | Home |
| `/how-it-works` | Process guide |
| `/tarifs` (FR) `/pricing` (EN) | Pricing |
| `/experts` | Provider directory |
| `/avis` `/testimonials` | Reviews |
| `/faq` | FAQ |
| `/contact` | Contact |
| `/terms-*` | Légal |
| `/privacy` | Privacy |
| `/cookies` | Cookies |

**Routing multilingue:** Préfixe langue (`/fr/`, `/en/`, `/es/`, etc.)

### 47.8 Intégrations Externes

| Service | Usage |
|---------|-------|
| Firebase Firestore | Contenu (FAQs, avis, config pricing) |
| Stripe/PayPal | Traitement paiements |
| Meta Pixel | Tracking conversions Facebook |
| Google Tag Manager | Analytics |
| Unsplash | Avatars et images |
| Schema.org | Données structurées |

### 47.9 Pricing Affiché

| Service | EUR | USD | Durée |
|---------|-----|-----|-------|
| **Expat Helper Call** | €19 | $25 | 30 min |
| **Lawyer Call** | €49 | $55 | 20 min |

- Pas de frais cachés (frais connexion inclus)
- Remboursement automatique après 3 tentatives échouées

### 47.10 Résumé

**Site marketing production-grade avec:**
- ✅ Support 9 langues complet
- ✅ Architecture SEO optimisée (7 schemas JSON-LD)
- ✅ Design conversion-focused (CTAs multiples, transparence prix)
- ✅ Structure composants haute performance (lazy loading)
- ✅ Conformité accessibilité (ARIA, HTML sémantique)
- ✅ Gestion contenu dynamique via Firestore admin
- ✅ Design mobile-responsive (interactions touch-friendly)
- ✅ Analytics-driven (intégrations tracking multiples)

---

## 48. Système Contact et Support

### 48.1 Formulaire Contact (`/contact`)

**Fichier:** `sos/src/pages/Contact.tsx`

**Champs collectés:**
- Prénom, nom, email
- Téléphone (avec sélecteur code pays - 249+ codes)
- Pays origine, pays intervention
- Nationalités, langues parlées (194 options)
- Catégorie demande, sujet, message détaillé

**Protection anti-spam:**
- Champ honeypot (anti-bot caché)
- Temps minimum remplissage (3 secondes)
- Rate limiting (max 3 messages/IP/heure - côté serveur)

**Validation:**
- Format email validé
- Format téléphone validé
- Code pays doit commencer par +
- Message minimum 10 caractères
- Acceptation CGU requise
- Sélection catégorie requise

**Flux soumission:**
1. Validation frontend locale
2. Envoi Cloud Function `createContactMessage`
3. Validation serveur + rate limiting
4. Stockage Firestore `contact_messages`
5. Tracking Meta Conversions API (CAPI)
6. Réponse succès avec quota rate limit restant

### 48.2 Gestion Messages Admin (`/admin/contact-messages`)

**Fichier:** `sos/src/pages/admin/AdminContactMessages.tsx`

**Fonctionnalités:**
- **Statut lu/non lu:** Marquage messages lus
- **Système réponse:**
  - Composition réponse email directe
  - Email HTML formaté avec message original + réponse admin
  - Mise à jour Firestore (réponse, timestamp, statut)
  - Log toutes communications email
- **Affichage messages:**
  - Nom expéditeur, email, timestamp
  - Contenu message complet
  - Statut réponse si déjà répondu
  - Ordre chronologique (récents en premier)

**Structure Firestore (`contact_messages`):**
```typescript
{
  id: string,
  name: string,
  email: string,
  message: string,
  isRead: boolean,
  reply?: string,
  createdAt: Timestamp,
  repliedAt?: Timestamp,
  responded?: boolean,
  status: "unread" | "success",
  source: "contact_form",
  clientIp: string,
  metadata: { userAgent, referer },
  capiTracking?: { leadEventId, trackedAt }
}
```

### 48.3 Système Feedback

**Fichier:** `sos/src/services/feedback.ts`

**Types feedback:**
| Type | Description |
|------|-------------|
| `bug` | Problèmes techniques |
| `ux_friction` | Problèmes expérience utilisateur |
| `suggestion` | Demandes fonctionnalités |
| `other` | Divers |

**Priorités:**
| Priorité | Description |
|----------|-------------|
| `blocking` | Critique, empêche utilisation |
| `annoying` | Non critique mais frustrant |
| `minor` | Impact faible |

**Fonctionnalités:**
- Upload screenshot (max 5MB, images uniquement)
- Détection device (mobile/tablet/desktop, OS, browser)
- Capture contexte page (URL, nom page)
- Tracking résolution écran, locale, type connexion
- Intégration auth utilisateur optionnelle
- Stockage Firestore avec gestion statuts admin

### 48.4 Composants UI Feedback

#### FeedbackButton (FAB)
- Position: bottom-right ou bottom-left (configurable)
- Mobile: FAB 12-14px, animation pulse 30s
- Desktop: Bouton avec label "Un problème?" + option minimiser
- Design gradient rouge (from-red-600 to-red-700)
- Accessibilité: ARIA labels, gestion focus

#### FeedbackForm
- Input email (prérempli si connecté)
- Sélecteur type feedback (4 options avec icônes)
- Sélecteur priorité (blocking/annoying/minor)
- Textarea description (min 10 chars)
- Upload screenshot avec preview
- Validation fichier (max 5MB, images)
- États succès/erreur
- Toggle options avancées
- Affichage info device (lecture seule)

#### FeedbackModal
- Dialog modal accessible
- Focus trap et restauration
- Escape pour fermer
- Click outside pour fermer (desktop)
- Slide-in bottom mobile

### 48.5 Admin Feedback (`/admin/feedback`)

**Fichier:** `sos/src/pages/admin/AdminFeedback.tsx`

**Filtres:**
- Par statut (new/in_progress/resolved/wont_fix/duplicate)
- Par type feedback
- Par priorité
- Par rôle utilisateur (client/lawyer/expat/visitor/admin)
- Par type device
- Par email utilisateur

**Gestion:**
- Pagination 20 items avec lazy loading
- Changement statut
- Assignation admin
- Notes admin
- Résolution avec détails
- Preview screenshot
- Recherche multi-champs

### 48.6 Help Center (`/centre-aide`)

**Fichier:** `sos/src/pages/HelpCenter.tsx`

**Fonctionnalités:**
- Support multi-langues (articles dynamiques par langue)
- Catégories hiérarchiques (main + sous-catégories)
- Icônes catégories, comptage articles
- Recherche temps réel articles
- Métadonnées articles: titre, extrait, contenu, tags, temps lecture
- Slugs pour routing
- Items FAQ avec support Schema.org
- Système traduction (fallback langue disponible)

### 48.7 FAQ Page (`/faq`)

**Fichier:** `sos/src/pages/FAQ.tsx`

**Fonctionnalités:**
- Liste FAQ interactive expandable
- Filtrage par catégorie
- Recherche
- Icônes catégories (phone, mail, book, users, credit-card, help-circle, globe, briefcase)
- Contenu dynamique Firestore (`faqs` collection)
- Filtre `isActive: true`
- Tags par item FAQ
- Chaîne fallback langue (current → fr → en)
- Support Schema.org FAQPage

### 48.8 Cloud Functions Support

#### createContactMessage (HTTP, public)
```typescript
// Sécurité
- Rate limiting: max 3 messages/IP/heure
- Validation email (min 5 chars, contient @)
- Validation message (min 10, max 5000 chars)
- Sanitization données
- Logging IP partiel (privacy)

// Intégrations
- Meta Conversions API (Lead events)
- Extraction données user (email, phone, name)
- Cookies FBP/FBC si disponibles
```

#### sendContactReply (callable, admin)
```typescript
// Sécurité
- Admin-only (vérification rôle)

// Fonctionnalités
- Email HTML formaté
- Template avec branding SOS Expat
- Message original + réponse admin
- Logging Firestore toutes emails
- Envoi via Zoho SMTP
```

### 48.9 Routing Support

| Route | Page | Type |
|-------|------|------|
| `/contact` | Formulaire contact | Public |
| `/faq` | Liste FAQ | Public |
| `/faq/:slug` | Détail FAQ | Public |
| `/centre-aide` | Help Center | Public |
| `/admin/contact-messages` | Gestion messages | Admin |
| `/admin/feedback` | Gestion feedback | Admin |

**Support multilingue:** Préfixe locale (ex: `/en/contact`, `/fr/contact`)

### 48.10 Firestore Security Rules

| Collection | Create | Read | Update | Delete |
|------------|--------|------|--------|--------|
| `contact_messages` | Public | Admin | Admin | Admin |
| `user_feedback` | Public | Admin | Admin | - |
| `email_logs` | - | Admin | - | - |
| `help_categories` | Admin | Public | Admin | Admin |
| `help_articles` | Admin | Public | Admin | Admin |

### 48.11 Flux Données Support

```
User Contact/Feedback
    ↓
Frontend Form Validation
    ↓
Cloud Function (Rate Limit + Validation)
    ↓
Firestore (contact_messages/user_feedback)
    ↓
Admin Dashboard
    ↓
Admin Reply → Email Function → Zoho SMTP → User Email
    ↓
Email Log (tracking)
```

### 48.12 Résumé Fonctionnalités

| Fonctionnalité | Statut | Type |
|----------------|--------|------|
| Formulaire contact | ✅ | Public |
| Stockage messages | ✅ | Firestore |
| Réponses admin | ✅ | Admin |
| Notifications email | ✅ | Function |
| Soumission feedback | ✅ | Service |
| Upload screenshot | ✅ | Component |
| Panel admin feedback | ✅ | Admin |
| Help Center | ✅ | Public |
| FAQ Page | ✅ | Public |
| Rate limiting | ✅ | Function |
| Anti-spam | ✅ | Frontend |
| Meta tracking | ✅ | Integration |
| Multi-langue | ✅ | System |

**Engagement support:**
- Temps réponse: < 24 heures typiquement
- Disponibilité: 24/7
- Multilingue: Français + autres langues

---

## 49. Configuration Environnement

### 49.1 Structure Fichiers Environnement

#### SOS Platform (sos/)
| Fichier | Usage |
|---------|-------|
| `.env.example` | Template variables disponibles |
| `.env.development` | Config développement |
| `.env.local` | Overrides locaux |
| `.env.production` | Production (non commité) |
| `firebase/functions/.env` | Config backend |

#### Outil-sos-expat
| Fichier | Usage |
|---------|-------|
| `.env.example` | Template config |
| `.env.production.example` | Template production |
| `.env.local` | Overrides locaux |
| `functions/.env` | Config backend |

### 49.2 Variables Frontend (Vite)

#### Configuration Firebase
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

**Projets:**
- SOS: `sos-urgently-ac307`
- Outil: `outils-sos-expat`

#### Configuration Stripe
```
VITE_STRIPE_PUBLIC_KEY        # pk_test_... ou pk_live_...
```

#### Configuration Cloud Functions
```
VITE_FUNCTIONS_REGION         # europe-west1
VITE_FUNCTIONS_REGION_DEV
VITE_FUNCTIONS_URL
VITE_FUNCTIONS_BASE_URL
VITE_SOS_BASE_URL
VITE_OUTIL_BASE_URL
```

#### Analytics & Marketing
```
VITE_GA4_MEASUREMENT_ID
VITE_GTM_ID
VITE_GOOGLE_ADS_CONVERSION_ID
VITE_GOOGLE_ADS_PURCHASE_LABEL
VITE_GOOGLE_ADS_LEAD_LABEL
VITE_GOOGLE_ADS_SIGNUP_LABEL
VITE_GOOGLE_ADS_CHECKOUT_LABEL
```

#### Push Notifications
```
VITE_FIREBASE_VAPID_KEY       # FCM public key
```

#### Emulators (Dev uniquement)
```
VITE_USE_EMULATORS            # true/false
VITE_EMULATOR_HOST            # 127.0.0.1
VITE_EMULATOR_PORT_AUTH       # 9099
VITE_EMULATOR_PORT_FIRESTORE  # 8080
VITE_EMULATOR_PORT_FUNCTIONS  # 5001
VITE_EMULATOR_PORT_STORAGE    # 9199
```

#### Configuration Pricing
```
VITE_PRICE_LAWYER_MONTHLY     # 49
VITE_PRICE_LAWYER_ANNUAL      # 470
VITE_PRICE_EXPAT_MONTHLY      # 29
VITE_PRICE_EXPAT_ANNUAL       # 280
VITE_SUBSCRIBE_URL
```

#### Monitoring
```
VITE_SENTRY_DSN
VITE_APP_VERSION
```

### 49.3 Variables Backend (Firebase Functions)

#### Stripe (Secrets)
```
STRIPE_MODE                   # test ou live
STRIPE_SECRET_KEY_TEST
STRIPE_SECRET_KEY_LIVE
STRIPE_WEBHOOK_SECRET_TEST
STRIPE_WEBHOOK_SECRET_LIVE
STRIPE_CONNECT_WEBHOOK_SECRET_TEST
STRIPE_CONNECT_WEBHOOK_SECRET_LIVE
```

#### PayPal (Secrets)
```
PAYPAL_MODE                   # sandbox ou live
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET
PAYPAL_WEBHOOK_ID
PAYPAL_PARTNER_ID
PAYPAL_PLATFORM_MERCHANT_ID
```

#### Twilio (Secrets)
```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
TWILIO_CALL_WEBHOOK_URL
TWILIO_CONFERENCE_WEBHOOK_URL
TWILIO_AMD_TWIML_URL
TWILIO_GATHER_RESPONSE_URL
PROVIDER_NO_ANSWER_TWIML_URL
FORCE_END_CALL_TASK_URL
```

#### Email
```
EMAIL_USER
EMAIL_PASS
```

#### MailWizz
```
MAILWIZZ_API_URL              # https://app.mail-ulixai.com/api/index.php
MAILWIZZ_API_KEY
MAILWIZZ_WEBHOOK_SECRET
MAILWIZZ_LIST_UID             # yl089ehqpgb96
MAILWIZZ_CUSTOMER_ID          # 2
```

#### Cloud Tasks
```
CLOUD_TASKS_QUEUE             # call-scheduler-queue
CLOUD_TASKS_LOCATION          # europe-west1
CLOUD_TASKS_PAYOUT_QUEUE
EXECUTE_CALL_TASK_URL
SET_PROVIDER_AVAILABLE_TASK_URL
```

#### APIs Externes
```
OUTIL_API_KEY
OUTIL_SYNC_API_KEY
```

#### Sécurité
```
ENCRYPTION_KEY                # RGPD compliance
TASKS_AUTH_SECRET             # Auth tâches planifiées
```

#### Rétention Données
```
RECORDING_RETENTION_DAYS      # 90 jours
```

### 49.4 Configuration Firebase

#### firebase.json
```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

#### .firebaserc
```json
// Outil-sos-expat
{ "projects": { "default": "outils-sos-expat" } }

// SOS Platform
{ "projects": { "default": "sos-urgently-ac307" } }
```

### 49.5 Configuration Vite

**Fonctionnalités clés:**
- PWA manifest configuration
- Runtime caching strategies (offline)
- Service Worker workbox
- Code splitting optimisé:
  - `vendor`: React, React Router
  - `firebase`: Firebase libraries
  - `ui`: Lucide, Date-fns
  - `query`: TanStack React Query

**Server:**
- Dev: Port 5173 (host: true)
- Preview: Port 4173
- ESBuild target: ES2022

### 49.6 Configuration IA (`functions/src/ai/core/config.ts`)

```typescript
AI_CONFIG = {
  API_TIMEOUT_MS: 25000,
  MAX_RETRIES: 2,
  RETRY_BACKOFF_MULTIPLIER: 1.5,

  OPENAI: {
    MODEL: "gpt-4o",
    TEMPERATURE: 0.3,
    MAX_TOKENS: 4000
  },

  CLAUDE: {
    MODEL: "claude-3-5-sonnet-20241022",
    TEMPERATURE: 0.25,
    MAX_TOKENS: 4000
  },

  PERPLEXITY: {
    MODEL: "sonar-pro",
    TEMPERATURE: 0.2,
    MAX_TOKENS: 2500
  }
}
```

### 49.7 Gestion Secrets (`firebase/functions/src/lib/secrets.ts`)

- Firebase Secret Manager pour production
- Fallback `process.env` pour emulators
- Centralisation `defineSecret()` calls

**Catégories secrets:**
- TWILIO_SECRETS
- STRIPE_SECRETS (+ webhooks)
- PAYPAL_SECRETS
- EMAIL_SECRETS
- ENCRYPTION_KEY
- TASKS_AUTH_SECRET

### 49.8 Optimisations Firestore (`src/config/firebase.ts`)

```typescript
{
  experimentalForceLongPolling: true,  // Bypass WebSocket issues
  useFetchStreams: false,               // Évite blocage extensions
  localCache: persistentLocalCache(),   // 50MB IndexedDB
  multipleTabManager: true
}
```

### 49.9 Workflows par Environnement

#### Développement Local
1. Copy `.env.example` → `.env.local`
2. Configure credentials `sos-urgently-ac307`
3. `VITE_USE_EMULATORS=false`
4. `npm run dev` + `firebase emulators:start`

#### Production (GCP)
1. Secrets via Firebase Secret Manager
2. Credentials production Firebase
3. Cloud Functions sur Cloud Run v2
4. Stripe/PayPal mode `live`

#### Multi-Projet
- SOS: `sos-urgently-ac307` (plateforme principale)
- Outil: `outils-sos-expat` (outil IA, SSO custom token)
- Communication cross-projet via `OUTIL_API_KEY`

### 49.10 Résumé Configuration

| Catégorie | Fichiers | Type | Chargement |
|-----------|----------|------|------------|
| Firebase Frontend | .env.* | Public | `import.meta.env.VITE_*` |
| Stripe | .env + Secrets | Mixed | Public key .env, Secret dans SM |
| Twilio | .env + Secrets | Secret | `defineSecret()` |
| PayPal | .env + Secrets | Secret | `defineSecret()` |
| Email | .env + Secrets | Secret | `defineSecret()` |
| MailWizz | .env + Secrets | Mixed | `defineString()` + `defineSecret()` |
| Encryption | Secrets only | Secret | `defineSecret()` |
| Analytics | .env.* | Public | `import.meta.env.VITE_*` |
| Pricing | .env.* | Public | `import.meta.env.VITE_PRICE_*` |

### 49.11 Checklist Déploiement Production

1. ☑️ `STRIPE_MODE=live`
2. ☑️ `PAYPAL_MODE=live`
3. ☑️ Configurer tous Firebase secrets
4. ☑️ Vérifier webhooks Stripe/PayPal
5. ☑️ Configurer URLs webhooks Twilio
6. ☑️ `RECORDING_RETENTION_DAYS` pour RGPD
7. ☑️ Vérifier config MailWizz
8. ☑️ Tester communication cross-projet

### 49.12 Fichiers Sensibles (Ne Jamais Commiter)

- `.env.production`
- `.env.local` (si contient vraies clés)
- Tout fichier avec clés API hardcodées
- `.firebaserc` avec credentials production publics

---

## 50. Système SEO Complet

### 50.1 Meta Tags & Head Management

**Fichier:** `src/components/layout/SEOHead.tsx`

**Meta Tags dynamiques:**
- Title, description (max 160 chars), keywords, author
- Content-type, reading time, expertise level
- Trustworthiness, content quality, last reviewed date
- Citations pour crédibilité

**Contrôle robots:**
```
Default: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
```

**Open Graph:**
- og:title, og:description, og:type, og:site_name
- og:image (1200x630px) avec dimensions
- og:locale (9 langues)
- article:published_time, article:modified_time, article:author

**Twitter Cards:**
- Type: summary_large_image
- Site et creator handles
- Image specification

**Optimisation AI/LLM:**
```
ai:summary                    # Compréhension modèles IA
estimatedReadingTime
expertise, trustworthiness, contentQuality
dateReviewed
ai-crawlable: "true"
```

### 50.2 Données Structurées (JSON-LD)

**Répertoire:** `src/components/seo/`

| Schema | Fichier | Usage |
|--------|---------|-------|
| **Article** | `ArticleSchema.tsx` | Articles, posts |
| **Service** | `ServiceSchema.tsx` | Services avec pricing |
| **FAQPage** | `FAQPageSchema.tsx` | Rich Results FAQ |
| **Breadcrumb** | `BreadcrumbSchema.tsx` | Navigation hiérarchique |
| **Organization** | `OrganizationSchema.tsx` | Entreprise + AggregateRating |
| **Review** | `ReviewSchema.tsx` | Avis individuels |
| **ProfessionalService** | `ProfessionalServiceSchema.tsx` | Profils providers |
| **LocalBusiness** | `LocalBusinessSchema.tsx` | Business local |

#### OrganizationSchema (Complet)
- `@graph` support
- **AggregateRating** pour étoiles Google
- Nom légal, description, logo (512x512px)
- Profils sociaux (Facebook, Twitter, LinkedIn, Instagram)
- Points contact avec langues
- Horaires (24/7)
- WebSite schema avec SearchAction (sitelinks search box)

### 50.3 Internationalisation SEO

**HrefLang Support (9 langues):**
| Code | Langue | Tag |
|------|--------|-----|
| fr | Français | fr-FR |
| en | English | en-US |
| es | Español | es-ES |
| de | Deutsch | de-DE |
| pt | Português | pt-BR |
| ru | Русский | ru-RU |
| zh | 中文 | zh-CN |
| ar | العربية | ar-SA |
| hi | हिन्दी | hi-IN |

- x-default pointe vers FR
- Conversion codes ISO automatique (ch → zh-Hans)

**Hook useSEOTranslations:**
- Meta titles/descriptions par page
- Fichiers JSON localisés
- Fallback English si traduction manquante

### 50.4 Configuration Robots.txt

**Règles générales:**
```
Allow: /
Allow: /llms.txt
Allow: /.well-known/
Disallow: /dashboard, /profile/edit, /call-checkout, /admin, /api/
```

**Moteurs recherche:**
| Bot | Crawl Delay |
|-----|-------------|
| Googlebot | Aucun |
| Bingbot | 1s |
| Yandex | 2s |
| DuckDuckBot | 1s |
| Baiduspider | 2s |

**Bots sociaux (tous autorisés):**
Twitterbot, LinkedInBot, Slackbot, WhatsApp, TelegramBot, Discordbot, Pinterestbot, Redditbot

**Bots IA (autorisés, 2s delay):**
| Provider | Bots |
|----------|------|
| OpenAI | GPTBot, ChatGPT-User, OAI-SearchBot |
| Anthropic | ClaudeBot, Claude-Web, anthropic-ai |
| Perplexity | PerplexityBot |
| Google | Google-Extended |
| Meta | FacebookBot, meta-externalagent |
| Apple | Applebot, Applebot-Extended |
| Mistral | MistralBot |

**Bots bloqués (scrapers agressifs):**
Bytespider, PetalBot, SemrushBot, AhrefsBot, MJ12bot, DotBot

### 50.5 Sitemaps

**Structure:**
```
sitemap.xml (Master Index)
├── sitemap-static.xml        # Pages statiques
├── sitemapProfiles          # Profils providers (dynamique)
├── sitemapHelp              # Articles help center
├── sitemapFaq               # Items FAQ
└── sitemapLanding           # Landing pages
```

**Priorités pages statiques:**
| Page | Priority | Changefreq |
|------|----------|------------|
| Home | 1.0 | daily |
| FAQ | 0.8 | weekly |
| Contact, Register | 0.9 | weekly |
| Terms, Privacy | 0.4 | monthly |
| Blog | 0.8 | daily |
| Testimonials | 0.7 | weekly |

**Hreflang dans sitemaps:**
- Alternate links 9 langues
- x-default → version française

### 50.6 PWA Manifest (SEO)

**Fichier:** `public/manifest.json`

```json
{
  "name": "SOS Expat - Assistance Urgente Expatriés",
  "short_name": "SOS Expat",
  "description": "Assistance juridique et expatriation en urgence...",
  "lang": "fr-FR",
  "categories": ["business", "productivity", "utilities", "lifestyle"],
  "start_url": "/?utm_source=pwa"
}
```

**App Shortcuts:**
- Urgence Juridique
- Demander consultation
- Accéder documents

**Protocol Handlers:**
- mailto: → contact form
- tel: → emergency services

### 50.7 LLMs.txt & Humans.txt

**llms.txt (Documentation IA):**
- Identité et mission entreprise
- Description services principaux
- Couverture géographique (197 pays)
- Langues (9 + langues providers)
- How it works (clients et providers)
- Structure pricing
- FAQs structurées
- URLs pages importantes
- Spécifications techniques

**humans.txt:**
- Info équipe et contact
- Descriptions services
- Stack technique
- Conformité standards (WCAG, RGPD)

### 50.8 Implémentation Application

**App.tsx:**
- DefaultHelmet: titles/descriptions par page
- Attribut lang sur HTML
- Meta viewport, theme-color
- `<HreflangLinks>` sur chaque page

**Tracking:**
- GA4 via `PageViewTracker`
- Meta Pixel avec Advanced Matching
- User data signals (email, phone, name, country)
- Capture source trafic (UTM, click IDs)

### 50.9 Résumé Fonctionnalités SEO

| Fonctionnalité | Implémentation | Statut |
|----------------|----------------|--------|
| Meta Tags | SEOHead.tsx | ✅ Complet |
| Open Graph | Tags OG + image | ✅ |
| Twitter Cards | Support Twitter Card | ✅ |
| Données structurées | 8 types JSON-LD | ✅ Complet |
| Robots.txt | Config complète + bots IA | ✅ Production |
| Sitemaps | 5 sitemaps + hreflang | ✅ Dynamique |
| Hreflang | 9 langues + x-default | ✅ |
| Internationalisation | useSEOTranslations hook | ✅ 9 langues |
| PWA Manifest | Manifest optimisé SEO | ✅ |
| LLMs.txt | Documentation IA | ✅ |
| Google Analytics | GA4 integration | ✅ |
| Meta Pixel | Advanced Matching | ✅ |
| Review Schema | AggregateRating | ✅ |

### 50.10 Fichiers Clés SEO

```
src/components/
├── layout/SEOHead.tsx
└── seo/
    ├── ArticleSchema.tsx
    ├── ServiceSchema.tsx
    ├── FAQPageSchema.tsx
    ├── BreadcrumbSchema.tsx
    ├── OrganizationSchema.tsx
    ├── ReviewSchema.tsx
    ├── ProfessionalServiceSchema.tsx
    ├── LocalBusinessSchema.tsx
    └── index.ts

src/multilingual-system/components/HrefLang/HreflangLinks.tsx
src/hooks/useSEOTranslations.ts

public/
├── robots.txt
├── sitemap.xml
├── sitemap-static.xml
├── manifest.json
├── llms.txt
└── humans.txt
```

---

## 51. SYSTÈME DE CALENDRIER ET PLANIFICATION

### 51.1 Vue d'Ensemble

Le système de planification SOS Expat **n'utilise pas de calendrier visuel traditionnel**. Au lieu de cela, il repose sur un système de **disponibilité en temps réel** avec gestion automatique des états des prestataires.

### 51.2 Gestion de Disponibilité des Prestataires

**Système à 3 États:**

| État | Description | Comportement |
|------|-------------|--------------|
| `available` | Prestataire prêt à recevoir des appels | Visible et sélectionnable |
| `busy` | En cours d'appel/consultation | Non sélectionnable, reste visible |
| `offline` | Hors ligne ou indisponible | Masqué des résultats de recherche |

**Collection Firestore:** `providers`
```typescript
interface ProviderAvailability {
  availability: 'available' | 'busy' | 'offline';
  isOnline: boolean;
  lastActivity: Timestamp;
  lastOnlineAt?: Timestamp;
  autoOfflineAt?: Timestamp;
  shareBusyStatus?: boolean; // Multi-dashboard sync
}
```

### 51.3 Flux de Planification d'Appel

**Processus en 4 Étapes:**

1. **Booking Request Créé**
   - Client sélectionne prestataire disponible
   - `booking_requests` document créé avec status `pending`
   - Notification push envoyée au prestataire

2. **Délai Cloud Tasks (4 minutes)**
   - Cloud Tasks attend 4 minutes avant exécution
   - Permet au prestataire de répondre manuellement
   - Si pas de réponse → traitement automatique

3. **Traitement Automatique**
   - `onBookingRequestCreated` génère réponse IA
   - Email/SMS envoyé au client avec lien de paiement
   - Prestataire notifié de la nouvelle demande

4. **Confirmation et Appel**
   - Après paiement, status → `confirmed`
   - Synchronisation disponibilité prestataire
   - Ouverture canal de communication

### 51.4 Cloud Functions Planifiées

**5 Fonctions avec Cloud Scheduler:**

| Fonction | Schedule | Description |
|----------|----------|-------------|
| `resetDailyQuotas` | `0 0 * * *` (minuit) | Reset quotas IA journaliers |
| `sendPaymentReminders` | `0 9 * * *` (9h) | Rappels paiements en attente |
| `cleanupExpiredTrials` | `0 2 * * *` (2h) | Nettoyage essais expirés |
| `sendProviderReminders` | `*/30 * * * *` (30min) | Rappels inactivité prestataires |
| `updateProviderStats` | `0 3 * * *` (3h) | Mise à jour statistiques |

### 51.5 Système de Rappels Inactivité

**Paliers de Rappels:**

| Durée Inactivité | Action |
|------------------|--------|
| 30 minutes | Premier rappel notification |
| 60 minutes | Deuxième rappel + email |
| 90 minutes | Auto-passage en `offline` |

**Implémentation:**
```typescript
// sendProviderInactivityReminders.ts
async function checkProviderInactivity(provider: Provider) {
  const inactiveMinutes = getMinutesSince(provider.lastActivity);

  if (inactiveMinutes >= 90) {
    await setProviderOffline(provider.id);
    await sendOfflineNotification(provider);
  } else if (inactiveMinutes >= 60) {
    await sendSecondReminder(provider);
  } else if (inactiveMinutes >= 30) {
    await sendFirstReminder(provider);
  }
}
```

### 51.6 Tracking d'Activité

**Événements Trackés:**
- Connexion/Déconnexion
- Réponse à une demande
- Envoi de message
- Mise à jour profil
- Consultation dashboard

**Auto-Mise à Jour:**
```typescript
// Chaque action met à jour lastActivity
await updateDoc(providerRef, {
  lastActivity: serverTimestamp(),
  isOnline: true,
});
```

### 51.7 Synchronisation Multi-Dashboard

Pour les comptes multi-prestataires (`linkedProviderIds`):

- `shareBusyStatus: true` → Tous les prestataires liés partagent le même état
- Changement d'état propagé automatiquement
- Dashboard central affiche statut agrégé

### 51.8 Gestion des Créneaux

**Approche Sans Calendrier:**

Au lieu de créneaux prédéfinis, le système utilise:
1. **Disponibilité Instantanée** - Le prestataire est disponible maintenant
2. **File d'Attente Virtuelle** - Demandes en attente gérées par ordre
3. **Estimation Temps Réponse** - Basée sur historique prestataire

### 51.9 Intégration avec Booking

**Collection `booking_requests`:**
```typescript
{
  providerId: string;
  clientId: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  scheduledFor?: Timestamp;  // Optionnel - si planifié
  estimatedDuration: number; // En minutes
}
```

### 51.10 Fichiers Clés Planification

```
Outil-sos-expat/functions/src/
├── scheduled/
│   ├── resetDailyQuotas.ts
│   ├── sendPaymentReminders.ts
│   ├── cleanupExpiredTrials.ts
│   ├── sendProviderReminders.ts
│   └── updateProviderStats.ts
├── providers/
│   ├── updateAvailability.ts
│   └── trackActivity.ts
└── cloudTasks/
    └── processBookingAfterDelay.ts

sos/src/
├── hooks/
│   ├── useProviderAvailability.ts
│   └── useBookingScheduler.ts
└── services/
    └── availabilityService.ts
```

---

## 52. SYSTÈME DE DASHBOARDS COMPLET

### 52.1 Architecture Multi-Dashboard

Le système SOS Expat implémente **4 dashboards distincts** selon le rôle utilisateur:

| Dashboard | Route | Accès | Fichier Principal |
|-----------|-------|-------|-------------------|
| User Dashboard | `/dashboard` | Tous utilisateurs auth | `pages/Dashboard.tsx` |
| Admin Dashboard | `/admin/dashboard` | Admin uniquement | `pages/admin/AdminDashboard.tsx` |
| Multi-Provider | `/multi-dashboard` | Mot de passe | `pages/MultiProviderDashboard/index.tsx` |
| AI Assistant | `/dashboard/ai-assistant` | Lawyers, Expats, Admins | `pages/Dashboard/AiAssistant/` |

### 52.2 Dashboard Client

**Route:** `/dashboard` | **Rôle:** `client`

**Fonctionnalités:**
- **Quick Actions:** Trouver avocat/expat, Messages, Favoris
- **Statistiques:** Consultations totales, Temps passé, Argent dépensé, Avis donnés
- **Sections:** Profil, Historique appels, Factures, Messages, Favoris, Paramètres

**Permissions Client:**
- Lecture propre profil et données
- Envoi/réception messages
- Gestion favoris
- Modification paramètres

### 52.3 Dashboard Lawyer/Expat

**Route:** `/dashboard` | **Rôles:** `lawyer`, `expat`

**Fonctionnalités Prestataires:**
- **Quick Actions:** AI Assistant (badge NEW), Messages, Mes Appels, Abonnement
- **Statistiques Provider:** Appels complétés, Revenus (+ en attente), Rating, Durée moyenne
- **Sections Professionnelles:**
  - `AvailabilityToggle.tsx` - Status available/busy/offline
  - `ProviderEarnings.tsx` - Suivi revenus et paiements
  - `KYCBannerCompact.tsx` - Vérification Stripe/PayPal
  - Gestion factures, messages, appels, profil, langues

**Permissions Prestataires:**
- Définir statut disponibilité
- Voir revenus et solde en attente
- Gérer comptes paiement (Stripe/PayPal)
- Accéder AI assistant
- Gérer abonnement
- Générer factures
- Gérer certifications et tarifs

### 52.4 Dashboard AI Assistant

**Route:** `/dashboard/ai-assistant` | **Rôles:** `lawyer`, `expat`, `admin`

**Composants:**
- `AiAssistantPageV2.tsx` - Page principale conversations IA
- `ProviderSelector.tsx` - Sélection multi-compte
- `QuotaVisualization.tsx` - Affichage quotas API
- `SubscriptionCard.tsx` - Info abonnement actuel
- `MobileLayout.tsx` - Version mobile responsive

### 52.5 Dashboard Subscription

**Route:** `/dashboard/subscription`

**Pages:**
- `Plans.tsx` - Sélection plan (Trial, Basic, Standard, Pro, Unlimited)
- `MySubscription.tsx` - Gestion abonnement actuel
- `Success.tsx` - Confirmation après changement

### 52.6 Dashboard Admin Complet

**Route:** `/admin/dashboard` | **Rôle:** `admin` (OBLIGATOIRE)

**Header Actions:**
- Integrity Check - Validation cohérence Firestore
- Clean Data - Nettoyage données obsolètes
- Restore Roles - Sync rôles Firebase Auth

**Modules Admin (75+ pages):**

| Module | Route | Fonctions |
|--------|-------|-----------|
| **Finance** | `/admin/finance/*` | Dashboard, Transactions, Payouts, Invoices, Refunds, Disputes, Ledger, P&L, Cash Flow, Escrow, Tax, GCP Costs |
| **Users** | `/admin/users/*` | All Users, Clients, Lawyers, Expats, AAA Profiles, KYC, Reviews, Approvals |
| **Calls** | `/admin/calls/*` | All Calls, Sessions, Received Calls |
| **Communications** | `/admin/comms/*` | Campaigns, Automations, Templates, A/B Tests, Segments, Suppression, Deliverability |
| **Content** | `/admin/*` | FAQs, Help Center, Documents, Legal, Feedback |
| **Analytics** | `/admin/reports/*` | Country Stats, Unified Analytics, Google Ads, Meta Pixel, Trustpilot |
| **System** | `/admin/*` | IA Dashboard, Security Alerts, Logs, System Health, Backups |
| **Config** | `/admin/*` | Settings, Pricing, Promo Codes, Countries, Commissions |
| **B2B** | `/admin/b2b/*` | Accounts, Billing, Members, Pricing, Invoices |

**IA Dashboard Tab (IaDashboardTab.tsx):**
- Métriques abonnements (total providers, actifs, essais, payants)
- MRR en EUR et USD
- Distribution par tier (Trial/Basic/Standard/Pro/Unlimited)
- Taux conversion essai → payant
- Taux churn (30 derniers jours)
- Charts Recharts (LineChart croissance, PieChart distribution, BarChart usage)

### 52.7 Multi-Provider Dashboard

**Route:** `/multi-dashboard` | **Auth:** Mot de passe (Cloud Function)

**Fonctionnalités:**
- `PasswordGate.tsx` - Authentification par mot de passe
- Session token 24h (localStorage: `multi_dashboard_session`)
- Validation sécurisée via Cloud Function

**Statistiques Affichées:**
- Comptes (total multi-provider)
- Prestataires (total across accounts)
- Demandes (booking requests)
- En attente (badge pulsant)
- Réponses IA (auto-générées)

**Composants:**
- `AccountCard.tsx` - Info compte et providers liés
- `BookingRequestCard.tsx` - Demandes clients avec status
- `ChatPanel.tsx` - Messagerie in-dashboard
- `AiResponseDisplay.tsx` - Réponses IA générées

**Cloud Functions Utilisées:**
1. `validateDashboardPassword` - Validation mot de passe
2. `getMultiDashboardData` - Fetch données comptes
3. `generateMultiDashboardOutilToken` - SSO pour outil IA
4. `getProviderConversations` - Conversations provider
5. `sendProviderMessage` - Envoi message

### 52.8 Composants Dashboard Communs

| Composant | Fichier | Usage |
|-----------|---------|-------|
| AvailabilityToggle | `dashboard/AvailabilityToggle.tsx` | Toggle status prestataire |
| DashboardMessages | `dashboard/DashboardMessages.tsx` | Inbox messages |
| DashboardStats | `dashboard/DashboardStats.tsx` | Cartes statistiques |
| KYCBannerCompact | `dashboard/KYCBannerCompact.tsx` | Status KYC |
| MobileBottomNav | `dashboard/MobileBottomNav.tsx` | Nav mobile bas |
| MobileSideDrawer | `dashboard/MobileSideDrawer.tsx` | Menu latéral mobile |
| ProviderEarnings | `dashboard/ProviderEarnings.tsx` | Affichage revenus |
| QuickActions | `dashboard/QuickActions.tsx` | Actions rapides |
| UserInvoices | `dashboard/UserInvoices.tsx` | Gestion factures |

### 52.9 Permissions par Rôle

| Fonctionnalité | Client | Lawyer | Expat | Admin |
|----------------|--------|--------|-------|-------|
| Voir Profil | ✅ | ✅ | ✅ | ✅ |
| Voir Revenus | ❌ | ✅ | ✅ | ✅ |
| Définir Disponibilité | ❌ | ✅ | ✅ | ❌ |
| AI Assistant | ❌ | ✅ | ✅ | ✅ |
| Gestion Abonnement | ❌ | ✅ | ✅ | ✅ |
| Config Paiement | ❌ | ✅ | ✅ | ❌ |
| KYC Vérification | ❌ | ✅ | ✅ | ✅ |
| Admin Access | ❌ | ❌ | ❌ | ✅ |
| User Management | ❌ | ❌ | ❌ | ✅ |
| Rapports Finance | ❌ | ❌ | ❌ | ✅ |

### 52.10 Routes Protégées

```typescript
// Routes User (authentification requise)
/dashboard                    - Tous users
/dashboard/ai-assistant       - ['lawyer', 'expat', 'admin']
/dashboard/subscription       - ['lawyer', 'expat', 'admin']
/dashboard/kyc               - ['lawyer', 'expat']
/dashboard/conversations     - ['lawyer', 'expat', 'admin']

// Routes Admin (rôle admin obligatoire)
/admin/dashboard             - Admin seulement
/admin/users/*               - Admin seulement
/admin/finance/*             - Admin seulement
/admin/reports/*             - Admin seulement
```

### 52.11 Structure Fichiers Dashboard

```
sos/src/
├── pages/
│   ├── Dashboard.tsx
│   ├── Dashboard/
│   │   ├── AiAssistant/
│   │   │   ├── AiAssistantPageV2.tsx
│   │   │   └── components/
│   │   ├── Subscription/
│   │   │   ├── Index.tsx
│   │   │   ├── Plans.tsx
│   │   │   └── Success.tsx
│   │   └── Conversations/
│   ├── MultiProviderDashboard/
│   │   ├── index.tsx
│   │   ├── PasswordGate.tsx
│   │   ├── AccountCard.tsx
│   │   ├── BookingRequestCard.tsx
│   │   └── ChatPanel.tsx
│   └── admin/
│       ├── AdminDashboard.tsx
│       ├── ia/IaDashboardTab.tsx
│       ├── Finance/
│       └── [50+ pages admin]
├── components/
│   ├── dashboard/
│   │   ├── AvailabilityToggle.tsx
│   │   ├── DashboardStats.tsx
│   │   ├── MobileBottomNav.tsx
│   │   └── [autres composants]
│   └── admin/
│       ├── AdminLayout.tsx
│       ├── AdminRoutesV2.tsx
│       └── DashboardCharts.tsx
└── hooks/
    └── useMultiProviderDashboard.ts
```

---

## 53. SYSTÈME DE MESSAGERIE ET CHAT IA

### 53.1 Vue d'Ensemble Architecture

Le système de messagerie SOS Expat connecte les utilisateurs (expatriés) avec les prestataires (avocats/consultants) via un chat en temps réel alimenté par l'IA.

**Stack Technique:**
- **Frontend:** React + Firestore listeners temps réel
- **Backend:** Cloud Functions (HTTP + Firestore triggers)
- **Transport:** Server-Sent Events (SSE) pour streaming
- **Storage:** Firestore pour conversations et messages

### 53.2 Modèle de Données Firestore

**Collection `conversations/`:**
```typescript
{
  id: string;                    // Document ID
  userId: string;                // ID client
  providerId: string;            // ID prestataire
  providerType: 'lawyer' | 'expat';
  bookingId: string;             // Booking lié
  status: 'active' | 'archived' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt: Timestamp;
  messagesCount: number;
  bookingContext: {              // Contexte persistant
    clientName: string;
    country: string;
    category: string;
    urgency?: string;
  };
  conversationSummary?: string;  // Auto-généré pour 100+ messages
  hasUnreadMessages: boolean;    // Badge notification
  hasFlaggedContent: boolean;    // Flag modération
}
```

**Sous-collection `conversations/{id}/messages/`:**
```typescript
{
  id: string;
  role: 'user' | 'assistant' | 'system' | 'provider';
  source: 'user' | 'gpt' | 'claude' | 'perplexity' | 'system';
  content: string;
  createdAt: Timestamp;
  model?: string;                // ex: "gpt-4o", "claude-3-5-sonnet"
  provider?: string;             // "gpt" | "claude"
  citations?: string[];          // Sources Perplexity
  processed: boolean;            // Réponse IA générée
  processing: boolean;           // En cours de traitement
  moderation?: {
    flagged: boolean;
    categories: string[];
    flaggedAt: Timestamp;
    reviewed: boolean;
  };
}
```

**Sous-collection `conversations/{id}/thinking_logs/`:**
```typescript
{
  step: 'analyzing_question' | 'searching_web' | 'generating_response';
  message: string;               // ex: "🔍 Recherche: visa travail France"
  details?: string;
  timestamp: Timestamp;
  order: number;
}
```

### 53.3 Workflow Envoi Message (Frontend)

**Composant ChatInput.tsx:**
```
User tape message →
├─ Desktop: Enter pour envoyer | Mobile: Bouton click
├─ Validation input (trim, vérif vide)
├─ Auto-resize textarea selon contenu
├─ Raccourcis clavier (Enter=envoi, Shift+Enter=newline desktop)
└─ Submit via onSendMessage callback
```

**Hook useStreamingChat.ts:**
```
sendMessage(text) →
├─ Ajout message user immédiat (UI optimiste)
├─ Création placeholder réponse IA
├─ POST /aiChatStream avec Bearer token
│  Body: { message, conversationId }
│
├─ Écoute Server-Sent Events (SSE):
│  ├─ start → Récupère conversationId
│  ├─ progress → Affiche étapes (validating, analyzing, generating)
│  ├─ chunk → Append texte au message streaming
│  ├─ warning → Affiche warnings modération
│  ├─ done → Finalise message (model, provider info)
│  └─ error → Gère erreurs, fallback non-streaming
│
└─ Update state local: messages array
```

### 53.4 Endpoints Backend Chat

**POST /aiChat (Non-Streaming):**
```
Fichier: functions/src/ai/handlers/chat.ts

Étapes:
1. AUTH → Vérifie token Firebase
2. RATE LIMIT → Vérifie taux requêtes
3. MODERATION INPUT → Scan message violations
4. SUBSCRIPTION → Vérifie plan actif
5. CONVERSATION → Get ou create conversation
6. HISTORY → Construit historique intelligent:
   - Préserve premiers N messages (contexte booking)
   - Insert notice troncation si long
   - Ajoute messages récents
   - Injecte rappel contexte booking
7. QUOTA CHECK → Vérifie accès IA + quota provider
8. LLM CALL → Envoie à GPT-4o ou Claude
9. MODERATION OUTPUT → Vérifie réponse IA
10. SAVE → Batch write messages + metadata
11. QUOTA → Incrémente usage provider
12. RETURN → JSON avec content + metadata
```

**POST /aiChatStream (Streaming SSE):**
```
Fichier: functions/src/ai/handlers/chatStream.ts

Response: text/event-stream (HTTP 200 streaming)

Événements séquentiels:
1. progress { step: "validating", message: "Vérifications..." }
2. progress { step: "initializing", message: "Préparation..." }
3. progress { step: "analyzing", message: "Analyse juridique..." }
4. start { conversationId: "..." }
5. chunk { text: "Voici" }
6. chunk { text: " la " }
7. chunk { text: "réponse..." }
8. warning { type: "content_warning", categories: [...] }
9. done { conversationId, messageId, model, processingTimeMs }

Heartbeat: ": keepalive\n\n" toutes les 15s (évite timeout proxy)
```

### 53.5 Trigger Firestore - Réponse IA Automatique

**Trigger: aiOnProviderMessage**
```
Fichier: functions/src/ai/handlers/providerMessage.ts
Event: onCreate conversations/{conversationId}/messages/{messageId}

Étapes:
1. CHECK → Skip si déjà traité, message IA, ou système
2. ATOMIC LOCK → Mark "processing: true" (évite race conditions)
3. SETTINGS → Vérifie feature IA activée
4. CONVERSATION → Charge document conversation
5. EXPIRATION → Vérifie fenêtre temps:
   - Lawyers: 25 min depuis aiProcessedAt
   - Expats: 35 min depuis aiProcessedAt
   - Si expiré → Archive + message système
6. ACCESS CHECK → Vérifie accès IA provider
7. QUOTA CHECK → Vérifie quota restant
8. HISTORY → Construit historique intelligent
9. THINKING LOGS → Updates temps réel:
   - Supprime anciens logs
   - Écrit chaque étape live
10. LLM CALL → Envoie à GPT/Claude avec langue provider
11. SAVE RESPONSE → Batch write réponse + metadata
12. CLEANUP → Supprime thinking logs
13. QUOTA INCREMENT → Incrémente usage
14. ERROR HANDLING → Notifie provider si échec
```

### 53.6 Gestion Historique Conversation

**Fonction buildConversationHistory():**
```
Objectif: Sélection intelligente pour conversations longues (100+ messages)

Algorithme:
1. COUNT total messages
2. SI messages ≤ maxMessages (default 20):
   → Retourne tous messages chronologiques
3. SINON (conversation longue):
   → Garde PREMIERS N messages (3 par défaut)
     └─ Préserve contexte booking initial
   → Insert message système:
     "[... X messages omis pour concision ...]"
   → Garde DERNIERS N messages récents (16 par défaut)
     └─ Maintient continuité conversation
4. INJECT CONTEXT:
   → Prepend rappel contexte booking
5. INJECT SUMMARY:
   → Si conversation > 100 messages ET summary existe:
     "[RÉSUMÉ CONVERSATION PRÉCÉDENTE] ..."
6. RETURN LLMMessage[] formaté pour API

Bénéfices:
- Réduit usage tokens
- Évite overflow context window
- Maintient cohérence conversation
```

### 53.7 Composants Chat Frontend

**Hiérarchie Composants:**
```
AIChat (Container)
├─ Header
│  ├─ Title + Subtitle
│  ├─ Bouton Expand/Minimize
│  └─ Icône IA
│
├─ Messages Area
│  ├─ Empty State (première fois) OU
│  ├─ ChatMessage × N
│  │  ├─ Icône rôle (Bot/User)
│  │  ├─ Contenu formaté (Markdown)
│  │  ├─ Timestamp
│  │  └─ Bouton copie
│  └─ Loading Indicator (dots animés)
│
├─ Input Area
│  ├─ ChatInput (textarea + bouton envoi)
│  │  ├─ Auto-resize contenu
│  │  ├─ Raccourcis clavier
│  │  ├─ iOS enterkeyhint="send"
│  │  └─ État disabled + spinner
│  └─ OU État Disabled (conversation expirée)
│
└─ Auto-scroll vers dernier message
```

**ChatMessage.tsx - Affichage:**
```
Styling par rôle:
├─ User: Background violet, aligné droite
├─ Assistant: Background blanc, aligné gauche
├─ System/Error: Style warning rouge

Rendering Markdown:
├─ **bold**, *italic*
├─ [links](url)
├─ `inline code`

Features:
├─ Timestamp (HH:MM)
├─ Bouton copie (44px touch target mobile)
└─ Icône source (masque noms techniques)
```

### 53.8 Hooks Temps Réel

**useUnreadMessages():**
```typescript
// Query conversations avec hasUnreadMessages == true
// Listener onSnapshot temps réel
// Usage: Badge navigation
```

**useNewAIResponses():**
```typescript
// Query bookings avec aiProcessed == true
// Filtre: conversations non-expirées (25-35 min)
```

**useFirestoreRealtime():**
```typescript
// Listen changements document avec onSnapshot
// Update cache TanStack Query automatiquement
// Optimistic updates sur mutations
// Conversion Timestamp → Date
```

### 53.9 Sécurité et Validation

**Sanitization Input:**
- Supprime HTML/script tags
- Escape caractères spéciaux
- Limite longueur message
- Protection XSS via DOMPurify

**Sanitization Output:**
- Supprime script tags réponse IA
- Désactive event handlers
- Escape protocoles javascript:
- Cap longueur réponse 50KB

**Pipeline Modération:**
- OpenAI Moderation API
- Catégories: hate, harassment, violence, self-harm, sexual
- Flag violations temps réel
- Queue review admin

**Rate Limiting:**
- Limite par user (ex: 20 req/heure)
- Limite par provider (système quota)
- Headers X-RateLimit-*
- Exponential backoff retry

### 53.10 Cycle de Vie Conversation

```
Timeline:
1. Booking créé → aiOnBookingCreated trigger (message initial optionnel)
2. User/Provider pose question → HTTP endpoint ou trigger
3. Message sauvé Firestore
4. IA traite:
   - Pour users: /aiChat ou /aiChatStream endpoint
   - Pour providers: aiOnProviderMessage trigger
5. Réponse streamée/sauvée
6. Timer conversation démarre (fenêtre 25-35 min)
7. Après expiration → Conversation archivée, plus de réponses IA
8. Messages persistent historique, visibles aux deux parties

Transitions status:
pending → in_progress → completed/archived
```

### 53.11 Optimisations Performance

**Frontend:**
- Mémorisation composants (React.memo)
- Cache TanStack Query
- Opérations batch Firestore
- Auto-scroll seulement sur changement message
- Lazy loading anciens messages
- Virtualisation messages (100+ messages)

**Backend:**
- Batch writes (réduit opérations)
- Trimming historique intelligent
- Cache quota (TTL 5 min)
- SSE keepalive (évite déconnexions)
- Limites concurrence Cloud Functions (max 20)
- Queries Firestore indexées

### 53.12 Fichiers Clés Messagerie

```
Frontend:
src/components/Chat/
├─ AIChat.tsx              # Container principal
├─ ChatMessage.tsx         # Affichage message
├─ ChatInput.tsx           # Input auto-resize
└─ GPTChatBox.tsx          # Variante legacy

src/hooks/
├─ useStreamingChat.ts     # Listener SSE + messages
├─ useUnreadMessages.ts    # Compteur non-lus
└─ useFirestoreQuery.ts    # CRUD Firestore + temps réel

Backend:
functions/src/ai/handlers/
├─ chat.ts                 # Endpoint non-streaming
├─ chatStream.ts           # Endpoint SSE streaming
└─ providerMessage.ts      # Trigger auto-reply

functions/src/ai/services/
└─ utils.ts                # History builder, quota

functions/src/
├─ rateLimiter.ts          # Rate limiting
└─ moderation.ts           # Modération contenu
```

---

## 54. SYSTÈME PAYS ET LOCALISATION

### 54.1 Structure de Données Pays

**Fichier:** `sos/src/data/countries.ts`

- **195 pays** avec 1 séparateur visuel
- **10 langues** pour les noms de pays

```typescript
interface CountryData {
  code: string;        // Code ISO-2 (FR, US, etc.)
  nameFr: string;      // Français
  nameEn: string;      // English
  nameEs: string;      // Español
  nameDe: string;      // Deutsch
  namePt: string;      // Português
  nameZh: string;      // 中文
  nameAr: string;      // العربية
  nameRu: string;      // Русский
  nameIt: string;      // Italiano
  nameNl: string;      // Nederlands
  flag: string;        // Emoji drapeau
  phoneCode: string;   // Code téléphone international
  region: string;      // Région géographique
  priority?: number;   // Priorité UI (1 = top 6 pays)
  disabled?: boolean;  // Désactiver pays
}
```

**Système Priorité:** 6 pays prioritaires (FR, GB, DE, ES, RU, CN) en premier dans dropdowns.

**Régions Définies:**
- Europe, Asia, Africa, Caribbean, Central America, South America, North America, Oceania, Middle East

### 54.2 Fonctions Utilitaires Pays

**Fichier:** `sos/src/utils/countryUtils.ts`

| Fonction | Description |
|----------|-------------|
| `getCountryCodeFromName()` | Convertit nom (toute langue) → code ISO-2 |
| `normalizeCountryToCode()` | Normalisation robuste codes et noms |
| `isValidCountryCode()` | Validation code pays |
| `getCountryData()` | Obtient objet pays complet |
| `getCountryByCode()` | Lookup direct par code |
| `getCountriesByRegion()` | Filtre par région |
| `getRegions()` | Liste toutes les régions uniques |
| `searchCountries()` | Recherche avec support langue |
| `getSortedCountries()` | Liste triée par langue |

### 54.3 Configuration Fiscale par Pays

**Collections Firestore:**
- `country_fiscal_configs` - 197 pays configurés
- `country_subdivisions` - 51 états USA + 13 provinces Canada
- `country_settings` - Paramètres admin par pays

```typescript
interface CountryFiscalConfig {
  countryCode: string;
  countryName: { en: string; fr: string };
  region: Region;                    // EU, EEA, NORTH_AMERICA, etc.
  currency: string;
  currencySymbol: string;

  // Configuration taxe
  taxType: 'VAT' | 'GST' | 'SALES_TAX' | 'CONSUMPTION_TAX' | 'NONE';
  standardVatRate: number;
  reducedVatRates?: number[];
  vatEnabled: boolean;
  vatRegistrationThreshold?: number;
  vatRegistrationRequired: boolean;

  // Règles services numériques (critique pour SOS-Expat)
  digitalServicesRules: {
    applicable: boolean;
    rate?: number;
    threshold?: number;
    requiresRegistration: boolean;
    regime?: 'OSS' | 'VOEC' | 'OVR' | 'LOCAL' | 'NONE';
    notes?: string;
  };

  // Méthodes paiement
  paymentMethods: 'STRIPE' | 'PAYPAL' | 'BOTH' | 'NONE';
  stripeSupported: boolean;
  paypalSupported: boolean;

  // Exigences légales
  requiresLocalEntity: boolean;
  requiresFiscalRepresentative: boolean;
  invoiceRequirements?: string[];

  timezone: string;
  languages: string[];
  flag: string;
  isActive: boolean;
}
```

### 54.4 Régions Fiscales

| Région | Pays | Particularités |
|--------|------|----------------|
| **EU** | 27 pays | OSS, TVA harmonisée |
| **EEA** | 3 (Islande, Liechtenstein, Norvège) | Règles similaires EU |
| **EUROPE_OTHER** | 15 (UK, Suisse, Ukraine...) | Règles locales |
| **NORTH_AMERICA** | 3 (US, Canada, Mexique) | Sales tax/GST variés |
| **ASIA_PACIFIC** | 20+ pays | Règles très variées |
| **LATIN_AMERICA** | Multiple | IVA différents |
| **MIDDLE_EAST** | Multiple | Souvent 0% TVA |
| **AFRICA** | Multiple | Règles locales |

### 54.5 Support Méthodes Paiement par Région

| Support | Pays/Régions |
|---------|--------------|
| **STRIPE** | EU, EEA, UK, Suisse, Amérique du Nord, Australie, NZ, Asie majeure |
| **PAYPAL ONLY** | Russie, Ukraine, Serbie, Albanie, Moldavie, Turquie, Géorgie, Chine, Indonésie, Philippines, Vietnam |
| **BOTH** | Marchés majeurs |
| **NONE** | Bélarus, Russie (sanctions), Myanmar |

### 54.6 Configuration États USA (51)

**Fichier:** `functions/src/seeds/seedSubdivisionConfigs.ts`

```typescript
interface SubdivisionConfig {
  id: string;                    // US_CA, CA_QC
  countryCode: string;           // US ou CA
  subdivisionCode: string;       // CA, TX, QC, ON
  subdivisionName: { en, fr };
  subdivisionType: 'STATE' | 'PROVINCE' | 'TERRITORY';
  timezone: string;
  taxes: SubdivisionTaxConfig[];
  combinedTaxRate: number;
  professionalServicesExempt: boolean;  // CRITIQUE pour SOS-Expat
  digitalServicesRules: { applicable, rate, notes };
  isActive: boolean;
}
```

**États USA avec Taxation Services Professionnels:**
| État | Taxe | Taux |
|------|------|------|
| Hawaii (HI) | General Excise Tax | 4% |
| New Mexico (NM) | Gross Receipts Tax | 5.125% |
| South Dakota (SD) | Sales Tax | 4.5% |
| West Virginia (WV) | Services taxables | 6% |

**États USA SANS Sales Tax:**
- Alaska (AK), Delaware (DE), Montana (MT), New Hampshire (NH), Oregon (OR)

**47+ états:** Services professionnels EXEMPTÉS de sales tax

### 54.7 Configuration Provinces Canada (13)

**HST (Harmonized Sales Tax - 13-15%):**
- Ontario (ON): 13%
- Nouveau-Brunswick, Nouvelle-Écosse, Terre-Neuve, Î.-P.-É.: 15%

**GST + PST:**
- Colombie-Britannique, Saskatchewan, Manitoba

**Systèmes Spéciaux:**
- Québec: 5% GST + QST
- Alberta: 5% GST seulement
- Territoires: 5% GST seulement

**Note:** Services professionnels généralement TAXÉS au Canada (HST/GST)

### 54.8 Service Configuration Pays (Cache)

**Fichier:** `functions/src/services/CountryConfigService.ts`

**Caractéristiques:**
- Cache mémoire avec TTL 10 minutes
- Pattern Singleton
- Minimise lectures Firestore

**Méthodes Clés:**
| Méthode | Description |
|---------|-------------|
| `getCountry(code)` | Config par code pays |
| `getAllActiveCountries()` | Tous pays actifs |
| `getCountriesByRegion(region)` | Filtre par région |
| `getStripeCountries()` | Pays supportant Stripe |
| `getPayPalCountries()` | Pays supportant PayPal |
| `getVatRate(code)` | Taux TVA |
| `getDigitalServicesTaxRate(code)` | Taxe services numériques |
| `getSubdivision(id)` | Config état/province |
| `getUSAState(stateCode)` | État USA |
| `getCanadaProvince(provinceCode)` | Province Canada |
| `getApplicableTaxRate()` | Calcul complexe taxe applicable |
| `warmCache()` | Pré-chargement données |
| `clearCache()` | Invalidation cache |

### 54.9 Gestion Numéros Téléphone

**Fichier:** `sos/src/utils/phone.ts`
**Librairie:** `libphonenumber-js`

**70+ pays supportés:**
- Tous pays EU
- Amérique du Nord (US, CA, MX)
- Asie-Pacifique (JP, KR, CN, IN, TH, VN, ID, MY, SG, PH, AU, NZ)
- Moyen-Orient (Israël, Arabie Saoudite, UAE, Qatar, Koweït...)
- Afrique (Kenya, Tanzania, Nigeria, Ghana, Sénégal, Afrique du Sud...)
- Amérique Latine (Brésil, Argentine, Chili, Colombie, Pérou...)
- Régions spéciales (Hong Kong, Macao, Taiwan)

**Normalisation Intelligente:**
- Accepte formats nationaux, international avec +, préfixe 00
- Gère préfixes trunk (0 pour FR/UK/DE, 8 pour RU)
- Retourne format E.164 (+33612345678)
- Extrait code pays du numéro

### 54.10 Pages Admin Gestion Pays

**AdminCountries.tsx:**
- Liste tous pays avec statut (actif/inactif)
- Filtre par région, recherche par nom
- Affichage multi-langue (défaut français)
- Activer/désactiver pays
- Tracking modifications avec attribution user

**CountryCoverageTab.tsx:**
- Monitoring couverture avocats francophones par pays
- Identification pays non couverts
- Création profils avocats complets pour pays sous-desservis
- Métriques couverture par région

### 54.11 Composants UI Sélection Pays

**CountrySelect.tsx:**
- Dropdown multi-select
- Aware de la langue (affiche noms dans langue user)
- Capacité recherche et filtre
- Highlight pays partagés entre providers
- Styling responsive

**PhoneField.tsx:**
- Input téléphone international avec sélection pays
- Intégré avec système pays

### 54.12 Analytics Basés Localisation

**Tracking:**
- Abonnements par pays
- Couverture providers par pays
- Analytics localisation users
- Distribution conversations par pays
- Métriques performance régionales

**Pages Admin Liées:**
- AdminCountryStats.tsx
- AdminCountries.tsx
- AdminUnifiedAnalytics.tsx
- WorldMapSubscriptions.tsx (représentation visuelle)

### 54.13 Scripts Seed

**Fichiers:** `functions/src/seeds/`

| Script | Description |
|--------|-------------|
| `seedCountryConfigs.ts` | Peuple 197 pays dans Firestore |
| `seedSubdivisionConfigs.ts` | Peuple états USA et provinces Canada |
| `initCountryConfigs.ts` | Initialise configuration pays |

### 54.14 Hiérarchie Régions

```
Global
├── Europe (EU, EEA, Autre Européen)
├── Amérique du Nord (US, CA, MX)
├── Amérique Latine
├── Asie-Pacifique
├── Moyen-Orient
├── Afrique
├── Caraïbes
└── Océanie
```

Chaque région a des règles fiscales, support paiement et exigences conformité spécifiques.

### 54.15 Résumé Système Pays

| Fonctionnalité | Détails |
|----------------|---------|
| Pays | 195 pays en 10 langues |
| Configuration Fiscale | TVA/GST par pays avec règles spécifiques |
| Subdivisions | 51 états USA + 13 provinces Canada |
| Exemptions Services Pro | Tracking par juridiction |
| Régimes Services Numériques | OSS, VOEC, OVR, LOCAL |
| Méthodes Paiement | Stripe vs PayPal par pays |
| UI Multilingue | Noms localisés et recherche |
| Téléphone | 70+ pays normalisés |
| Admin | Gestion et tracking couverture |
| Cache | Optimisation lectures Firestore |
| Analytics Régionales | Business intelligence |

---

## 55. SYSTÈME EMAIL ET NOTIFICATIONS

### 55.1 Infrastructure Envoi Email

**Deux Fournisseurs Email:**

| Fournisseur | Usage | Configuration |
|-------------|-------|---------------|
| **Zoho SMTP** | Notification pipeline, Cloud Functions | Host: smtp.zoho.eu, Port: 465 (SSL) |
| **MailWizz API** | Email marketing, Campagnes | URL: app.mail-ulixai.com/api |

**Zoho SMTP:**
```typescript
// zohoSmtp.ts
function sendZoho(to: string, subject: string, html: string, text?: string)
// Auth via: EMAIL_USER, EMAIL_PASS (env variables)
// Sender: "SOS Expats" <email@sos-expat.com>
```

**MailWizz API:**
- List UID: yl089ehqpgb96
- Customer ID: 2
- Gestion abonnés, templates transactionnels, autoresponders
- 61 champs custom mappés

### 55.2 Système de Templates

**Structure Template:**
```typescript
type TemplatesByEvent = {
  _meta?: { updatedAt?: string; updatedBy?: string };
  email?: { enabled: boolean; subject: string; html?: string; text?: string };
  push?: { enabled: boolean; title: string; body: string; deeplink?: string };
  inapp?: { enabled: boolean; title: string; body: string };
  sms?: { enabled: boolean; text: string };
};
```

**Stockage:** `message_templates/{language}/events/{eventId}`

**Langues supportées:** FR, EN, DE, ES, PT, RU, ZH, AR, HI

**Template Base (baseTemplate.ts):**
- Design responsive, mobile-first
- Support dark mode
- Pixel tracking GA4
- Paramètres UTM
- Bouton partage WhatsApp
- Accessibilité (contraste élevé, reduced motion)

### 55.3 Templates Spécialisés

**Templates Dunning (Recouvrement Paiement):**
| Type | Timing | Description |
|------|--------|-------------|
| Payment Failed | J+1 | Notification échec initial |
| Action Required | J+3 | Avertissement suspension |
| Final Attempt | J+5 | Dernière tentative |
| Account Suspended | J+7 | Confirmation suspension |

**Convention Nommage MailWizz:** `TR_{ROLE}_{event}_{lang}`
- Rôles: CLI (client), PRO (provider)
- Events: welcome, call-completed, trustpilot-invite, payment-receipt, payment-failed, payout-requested, payout-sent, re-engagement, review-thank-you

### 55.4 Pipeline de Notification

**Fichier:** `functions/src/notificationPipeline/worker.ts`
**Trigger:** Document créé dans collection `message_events`

**Flux Envoi:**
```
1. Événement reçu (eventId, locale, to, context, vars)
2. Résolution langue (user preference ou event locale)
3. Chargement template Firestore
4. Lookup config routing (parallel/fallback)
5. Vérification rate limiting
6. Sélection canal (email, SMS, push, in-app)
7. Rendu avec substitution variables
8. Livraison via Zoho SMTP
9. Logging dans message_deliveries
```

**Types Variables Supportées:**
- Simple: `{{variableName}}`
- Monétaire: `{{money amount currency}}`
- Date: `{{date isoString}}`

### 55.5 Handlers Cycle de Vie

**User Registration Handler:**
- Trigger: Document créé dans `users/{userId}`
- Actions: Créé abonné MailWizz, envoie welcome email, log GA4

**Call Completion Handler:**
- Trigger: Status → "completed" dans `calls/{callId}`
- Actions: Update stats MailWizz, emails client et provider
- Templates: `TR_CLI_call-completed_*`, `TR_PRO_call-completed_*`

**Review/Rating Handler:**
- Trigger: Document créé dans `reviews/{reviewId}`
- Ratings ≥4: Invitation Trustpilot + notif positive provider
- Ratings <4: Email remerciement + alerte support si ≤2

**Payment Handlers:**
- Payment Received: Receipt avec invoice URL
- Payment Failed: Notification avec retry options

**Payout Handlers:**
- Payout Requested: Notifie provider
- Payout Sent: Confirme envoi

**Inactive User Re-engagement:**
- Schedule: Toutes les 24h
- Cible: Users inactifs 30+ jours
- Skip si re-engagement envoyé dans 7 derniers jours

### 55.6 Intégration MailWizz

**Classe MailwizzAPI:**
| Méthode | Description |
|---------|-------------|
| `createSubscriber(data)` | Enregistre user dans liste |
| `updateSubscriber(userId, updates)` | Met à jour champs custom |
| `sendTransactional(config)` | Envoie via template MailWizz |
| `unsubscribeSubscriber(userId)` | Désabonne de liste |
| `deleteSubscriber(userId)` | Supprime abonné |
| `sendOneTimeEmail(config)` | Email non-template |
| `stopAutoresponders(userId, reason?)` | Pause séquences auto |

**61 Champs Custom Mappés:**

| Catégorie | Champs |
|-----------|--------|
| User Info (20) | ROLE, PAYMENT_METHOD, ACTIVITY_STATUS, KYC_STATUS, IS_ONLINE, LANGUAGE, PROFILE_STATUS, VIP_STATUS, COUNTRY... |
| URLs (9) | AFFILIATE_LINK, PROFILE_URL, DASHBOARD_URL, TRUSTPILOT_URL, KYC_URL, INVOICE_URL... |
| Statistics (10) | TOTAL_CALLS, TOTAL_EARNINGS, AVG_RATING, MISSED_CALLS, WEEKLY_CALLS, MONTHLY_EARNINGS... |
| Dynamic (14) | EXPERT_NAME, CLIENT_NAME, AMOUNT, DURATION, RATING, COMMENT, SERVICE, CATEGORY... |
| Gamification (3) | MILESTONE_TYPE, MILESTONE_VALUE, BADGE_NAME |
| Referral (2) | REFERRAL_NAME, BONUS_AMOUNT |

### 55.7 Collections Firestore Email

| Collection | Usage |
|------------|-------|
| `message_events` | Triggers événements email |
| `message_templates/{lang}/events/{id}` | Templates par langue |
| `message_routing/config` | Config routing canaux |
| `message_deliveries` | Logs livraison |
| `email_logs` | Historique envoi |
| `contact_messages` | Soumissions formulaire contact |
| `negative_reviews` | Ratings bas pour suivi (TTL: 90j) |
| `support_alerts` | Problèmes prioritaires (TTL: 30j) |

### 55.8 Interface Admin Email

**AdminEmails.tsx - Onglets:**
1. **Scheduled Campaigns** - Gestion campagnes planifiées
2. **Email Templates** - Éditeur MJML/HTML
3. **Contact Replies** - Répondre messages contact
4. **Individual Send** - Envoi à user spécifique
5. **Role-based Send** - Envoi par rôle
6. **Targeted Send** - Sélection manuelle destinataires
7. **Send History** - Logs envoi
8. **Email Preview** - Prévisualisation HTML/MJML

### 55.9 Services Email

| Service | Fichier | Description |
|---------|---------|-------------|
| emailSender | serveremails/services/ | Envoi Zoho SMTP |
| emailClient | serveremails/services/ | Config Nodemailer |
| emailLogger | serveremails/services/ | Logging Firestore |
| emailScheduler | serveremails/services/ | Planification différée |
| templateRenderer | serveremails/services/ | Rendu variables `{{var}}` |
| recipientSelector | serveremails/services/ | Query users par critères |
| campaignManager | serveremails/services/ | Gestion campagnes |

### 55.10 Analytics et Tracking

**Événements GA4 Trackés:**
- user_registered
- call_completed
- trustpilot_invite_sent
- negative_review_detected
- payment_received / payment_failed
- payout_requested / payout_sent
- re_engagement_email_sent

**Tracking Email:**
- Pixels GA4 dans templates
- Paramètres UTM pour campagnes
- Tracking campaign ID et user ID
- Détection ouverture via pixel

### 55.11 Sécurité Email

**Authentification:**
- Fonction contact reply requiert rôle admin
- Tokens Firebase Auth pour Cloud Functions
- Vérification claims rôle Firestore

**Protection Données:**
- Secrets dans Firebase Secret Manager
- Variables env pour API keys
- SMS restreints aux événements allowlistés (contrôle coûts)
- Rate limiting par user/event

**Gestion Erreurs:**
- Échecs email non-bloquants (inscription continue)
- Logging erreurs complet Firestore
- Stratégie fallback canaux
- Tracking erreurs GA4

### 55.12 Fichiers Clés Email

```
serveremails/
├── services/
│   ├── emailSender.ts
│   ├── emailClient.ts
│   ├── emailLogger.ts
│   ├── emailScheduler.ts
│   ├── templateRenderer.ts
│   ├── recipientSelector.ts
│   └── campaignManager.ts
├── templates/
│   ├── baseTemplate.ts
│   └── contactReply.ts
└── server.ts

functions/src/
├── notificationPipeline/
│   ├── worker.ts
│   ├── routing.ts
│   ├── render.ts
│   ├── templates.ts
│   └── providers/email/zohoSmtp.ts
├── emailMarketing/
│   ├── config.ts
│   ├── functions/
│   │   ├── userLifecycle.ts
│   │   ├── transactions.ts
│   │   └── inactiveUsers.ts
│   └── utils/
│       ├── mailwizz.ts
│       ├── fieldMapper.ts
│       └── analytics.ts
├── subscriptions/
│   └── dunning-email-templates.ts
└── sendContactReplyFunction.ts

src/pages/admin/
└── AdminEmails.tsx
```

### 55.13 Résumé Système Email

| Fonctionnalité | Détails |
|----------------|---------|
| Providers | Zoho SMTP + MailWizz API |
| Templates | Multi-canal (email, SMS, push, in-app) |
| Langues | 9 langues supportées |
| Pipeline | Temps réel avec routing et fallback |
| Lifecycle | Welcome, transactions, reviews, payments |
| Marketing | Campagnes, re-engagement, Trustpilot |
| Admin | 8 onglets gestion complète |
| Analytics | GA4 + pixel tracking |
| Champs MailWizz | 61 champs custom mappés |
| Sécurité | Secrets Manager, rate limiting |

---

## 56. SYSTÈME DE GESTION D'ÉTAT

### 56.1 Vue d'Ensemble Architecture

Le système utilise **React Context API** pour l'état global, **hooks personnalisés** pour l'état spécifique aux fonctionnalités, **listeners Firestore** pour les données temps réel, et **cache intelligent** pour minimiser les lectures base de données.

### 56.2 Context Providers Principaux

**AuthContext (~2,100 lignes):**
```typescript
// contexts/AuthContext.tsx
// Gestion authentification et informations utilisateur

Fonctionnalités:
- Firebase auth (email/password, Google OAuth)
- Données profil user (role, permissions, verification)
- Tracking info appareil (type, OS, navigateur, vitesse connexion)
- Métriques auth (tentatives login, resets password)
- Synchronisation cross-tab via localStorage events
- Système fallback storage: sessionStorage → localStorage → memory
- Auth mobile adaptative (popup vs redirect selon navigateur)
- Détection navigateur in-app (WebViews réseaux sociaux)

Exports: useAuth() hook, AuthProvider, User, DeviceInfo, AuthMetrics types
```

**AppContext (~335 lignes):**
```typescript
// contexts/AppContext.tsx
// Paramètres application et localisation

Fonctionnalités:
- Support multi-langue (9 langues: fr, en, es, de, ru, pt, ch, hi, ar)
- Détection langue RTL (Arabe)
- Système notifications in-app
- Configuration services (lawyer calls, expat calls)
- Disponibilité pays
- Gestion paramètres (pricing, durée appels, features)
- Persistance préférence langue
- Valeurs par défaut (évite écrans blancs)

Exports: useApp() hook, AppProvider, isRTLLanguage(), Service, AppSettings types
```

**PayPalContext (~85 lignes):**
- Initialisation SDK PayPal
- Détection environnement (sandbox/live)
- Fallback gracieux si PayPal non configuré

**WizardContext (~50 lignes):**
- État modal/wizard (GuidedFilterWizard)
- Contrôle visibilité
- Évite conflits popup (cookie banner, PWA install)

### 56.3 Hooks Personnalisés Gestion État

**useSubscription (504 lignes):**
```typescript
// hooks/useSubscription.ts
Pattern: Listener Firestore temps réel + état local

Features:
- Tracking status abonnement (active, trialing, past_due, canceled)
- Info plan avec cache TTL (5 minutes)
- États dérivés: isActive, isTrialing, isPastDue, isCanceled, daysUntilRenewal
- Actions: cancel, reactivate, openBillingPortal
- Prévention race conditions via useRef
- Auto-cleanup au unmount
```

**useAiQuota (299 lignes):**
```typescript
// hooks/useAiQuota.ts
Pattern: Listeners Firestore temps réel pour tracking quota

Features:
- Monitoring usage IA (current, limit, remaining)
- Tracking config trial
- Status quota: canMakeAiCall, isQuotaExhausted, isNearQuotaLimit
- Calcul progression trial
- Mapping clés traduction i18n pour messages erreur
- Actions: refreshQuota(), checkCanMakeCall()
```

**Autres Hooks Spécialisés:**
| Hook | Usage |
|------|-------|
| `useFinanceData` | Paiements avec pagination, filtrage, temps réel |
| `useCostMonitoring` | Tracking coûts temps réel avec alertes budget |
| `useMetaAnalytics` | Tracking Meta Pixel et analytics |
| `useMultiProviderDashboard` | Booking multi-provider et réponses IA |
| `useDisputes` | Tracking et gestion litiges |
| `useProviderActivityTracker` | Status online et activité provider |
| `useAiToolAccess` | Contrôle accès outil IA et vérification quota |
| `useSubscriptionPlans` | Plans abonnement disponibles |

### 56.4 Clés localStorage (Persistantes)

| Clé | Usage | TTL |
|-----|-------|-----|
| `preferredCurrency` | Devise préférée user | Persistant |
| `admin-language` | Langue panel admin | Persistant |
| `admin-sidebar-open` | État sidebar admin | Persistant |
| `sos_lang` | Préférence langue user | Persistant |
| `sos_cache_subscription_plans` | Cache plans abonnement | 24 heures |
| `sos_cache_countries` | Cache liste pays | 7 jours |
| `sos_cache_help_categories` | Cache catégories aide | 1 heure |
| `sos_cache_trial_config` | Cache config trial | 1 heure |
| `sos_login_event` | Signal login cross-tab | ~100ms |
| `sos_logout_event` | Signal logout cross-tab | ~100ms |
| `savedEmail` | Email login précédent | Jusqu'au logout |
| `rememberMe` | État checkbox remember me | Contrôlé user |

### 56.5 Clés sessionStorage (Session Only)

| Clé | Usage |
|-----|-------|
| `selectedProvider` | Sélection provider courante |
| `serviceData` | Données service courant |
| `selectedCurrency` | Devise session |
| `AUTH_ATTEMPTED_KEY` | Flag popup Google Auth |
| Clés status KYC | État flux Stripe KYC |

### 56.6 Communication Cross-Tab

```typescript
// Synchronisation login entre onglets
localStorage.setItem('sos_login_event', Date.now().toString());
setTimeout(() => localStorage.removeItem('sos_login_event'), 100);

// Synchronisation logout entre onglets
localStorage.setItem('sos_logout_event', Date.now().toString());
setTimeout(() => localStorage.removeItem('sos_logout_event'), 100);
```

### 56.7 Utilitaire Cache Firestore

**Fichier:** `utils/firestoreCache.ts` (186 lignes)

**Fonctionnalités:**
- Cache intelligent données Firestore statiques
- TTL configurable par collection
- Invalidation cache basée version
- Nettoyage automatique expiration
- Optimisation coûts: 30-50% réduction lectures Firestore

**API:**
```typescript
getCached<T>(cacheKey, subKey?): T | null
setCache<T>(cacheKey, data, subKey?): void
clearCache(cacheKey, subKey?): void
clearAllCaches(): void
getCacheStats(): Record<string, { exists, age?, size? }>
fetchWithCache<T>(cacheKey, subKey, fetchFn): Promise<T>
```

### 56.8 Déduplication Listeners Subscription

**Fichier:** `services/subscription/subscriptionService.ts`

**Pattern:** Déduplication listeners avec état partagé
```typescript
function subscribeWithDeduplication<T>(
  cacheKey: string,
  createListener: (callback: (data: T | null) => void) => () => void,
  callback: (data: T | null) => void
): () => void
```

**Bénéfices:**
- Évite listeners Firestore dupliqués
- Plusieurs composants partageant même listener = 1 lecture Firestore
- ~80% réduction lectures Firestore pour données abonnement

### 56.9 Hiérarchie Providers (main.tsx)

```
<HelmetProvider>
  <AuthProvider>
    <AppProvider>
      <BrowserRouter>
        <App>
          <IntlProvider>
            <HelmetAsync>
              <PayPalProvider>
                <WizardProvider>
                  <PWAProvider>
                    <ProviderOnlineManager>
                      {routes}
                    </ProviderOnlineManager>
                  </PWAProvider>
                </WizardProvider>
              </PayPalProvider>
            </HelmetAsync>
          </IntlProvider>
        </App>
      </BrowserRouter>
    </AppProvider>
  </AuthProvider>
</HelmetProvider>
```

### 56.10 Patterns Gestion État

**Pattern 1: Listeners Firestore Temps Réel avec Déduplication**
- Listener singleton par source données
- Plusieurs composants partagent un listener
- Cleanup automatique au dernier désabonnement

**Pattern 2: SWR-like (Stale-While-Revalidate)**
```typescript
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const unsubscribe = onSnapshot(..., (doc) => setData(doc));
  return unsubscribe;
}, [userId]);
```

**Pattern 3: Cache + Refresh**
- Try cache first → retour immédiat
- Fetch en background → update cache
- Invalidation basée TTL

**Pattern 4: Chaîne Fallback Storage**
```typescript
const safeStorage = {
  setItem: (key, value) => {
    try { sessionStorage.setItem(key, value); }
    catch {
      try { localStorage.setItem(key, value); }
      catch { _memoryStorage[key] = value; }
    }
  },
  getItem: (key) => {
    try { return sessionStorage.getItem(key) || localStorage.getItem(key); }
    catch { return _memoryStorage[key] || null; }
  }
};
```

### 56.11 État Niveau Composant

| Hook | Usage |
|------|-------|
| `useState` | Inputs forms, visibilité modals, états loading, filtres, pagination |
| `useCallback` | Handlers action mémorisés, callbacks filtres |
| `useMemo` | États abonnement dérivés, calculs KPI, pourcentages usage |
| `useRef` | Flag isMounted, tracking dernier plan chargé, flags init |

### 56.12 Types et Interfaces

**Fichier:** `contexts/types.ts`

```typescript
// User & Auth
User, UserRole, DeviceInfo, AuthMetrics, AuthError

// Services
Service, ServiceType, ServiceData, PaymentData

// Subscriptions
Subscription, SubscriptionPlan, SubscriptionStatus, AiUsage

// Booking
BookingRequest, Provider

// App Settings
AppSettings, EnhancedSettings, Notification

// Finance
AdminPaymentRecord, FinanceFilters, FinanceKPIs

// Utilities
SelectOption, LanguageOption, FormErrors, LoadingState, LogEvent
```

### 56.13 Optimisations Performance

| Optimisation | Impact |
|--------------|--------|
| Déduplication Listeners | ~80% réduction lectures Firestore |
| Cache localStorage | Cache TTL données statiques (24h, 7j) |
| Mémorisation | useCallback, useMemo évitent recalculs |
| Code Splitting | Composants routes lazy-loaded |
| Prévention Race Conditions | Refs isMounted, cleanup async |
| Sync Cross-Tab | Événements localStorage pour état auth |

### 56.14 Cycle de Vie État

```
Interaction Utilisateur
       ↓
État Composant Local (useState)
       ↓
Context (AppContext/AuthContext)
       ↓
Hooks Custom (useSubscription, useAiQuota, etc.)
       ↓
Listeners Firestore Temps Réel
       ↓
Cache localStorage (firestoreCache.ts)
       ↓
sessionStorage (Auth, flux KYC)
       ↓
Mémoire (Fallback)
```

### 56.15 Fichiers Clés État

| Fichier | Lignes | Usage |
|---------|--------|-------|
| AuthContext.tsx | ~2,100 | Authentification & état user |
| AppContext.tsx | 335 | Paramètres app & localisation |
| useSubscription.ts | 504 | Gestion abonnement |
| useAiQuota.ts | 299 | Tracking quota IA |
| firestoreCache.ts | 186 | Cache données Firestore |
| subscriptionService.ts | 100+ | Layer service avec déduplication |
| PayPalContext.tsx | 85 | Configuration PayPal |
| WizardContext.tsx | 50 | État wizard |

---

## 57. SYSTÈME D'INTERNATIONALISATION (I18N)

### 57.1 Langues Supportées (9 Langues)

| Code | Langue | Nom Natif | Drapeau | RTL |
|------|--------|-----------|---------|-----|
| FR | Français | Français | 🇫🇷 | Non |
| EN | Anglais | English | 🇬🇧 | Non |
| DE | Allemand | Deutsch | 🇩🇪 | Non |
| RU | Russe | Русский | 🇷🇺 | Non |
| ZH | Chinois | 中文 | 🇨🇳 | Non |
| ES | Espagnol | Español | 🇪🇸 | Non |
| PT | Portugais | Português | 🇵🇹 | Non |
| AR | Arabe | العربية | 🇸🇦 | **Oui** |
| HI | Hindi | हिन्दी | 🇮🇳 | Non |

### 57.2 Architecture Double Framework

| Application | Framework | Config |
|-------------|-----------|--------|
| **SOS (app principale)** | react-intl | Locale par défaut: FR |
| **Outil-sos-expat** | react-i18next | Détection auto, fallback FR |

### 57.3 Structure Fichiers Traduction

**Outil-sos-expat (36 fichiers JSON):**
```
src/i18n/locales/
├── fr/
│   ├── common.json      (200 clés partagées)
│   ├── admin.json       (529 clés console admin)
│   ├── provider.json    (337 clés dashboard provider)
│   └── chat.json        (27 clés chat/IA)
├── en/
├── de/
├── ru/
├── zh/
├── es/
├── pt/
├── ar/
└── hi/
```

**SOS App Principale:**
```
src/
├── helper/
│   ├── en.json, fr.json, de.json, es.json
│   ├── ar.json, ch.json, hi.json, pt.json, ru.json
├── locales/
│   ├── fr-fr/admin.json
│   └── en/admin.json
└── i18n/locales/
    └── subscription.json (multi-langue)
```

### 57.4 Configuration i18next (Outil-sos-expat)

```typescript
// src/i18n/index.ts
{
  detection: localStorage → navigator.language → fallback FR,
  storageKey: "i18nextLng",
  defaultLanguage: "fr",
  namespaces: ["common", "admin", "provider", "chat"],
  fallbackLanguage: "fr"
}
```

### 57.5 Hook useLanguage

**Fichier:** `Outil-sos-expat/src/hooks/useLanguage.ts`

```typescript
interface UseLanguageReturn {
  t: TFunction;                    // Fonction traduction
  i18n: i18nInstance;             // Instance i18n
  currentLanguage: string;         // Code langue actuelle
  currentLocale: string;           // Alias currentLanguage
  currentLanguageInfo: LanguageInfo;
  changeLanguage: (lang: string) => Promise<void>;
  availableLanguages: string[];
  availableLanguagesInfo: LanguageInfo[];
  isRTL: boolean;                 // Langue RTL active?
  dateLocale: string;             // Code locale date-fns
  getDateLocale: () => string;
}
```

### 57.6 Composants Sélecteur de Langue

**LanguageSelector.tsx (Provider):**
- Deux modes: "compact" (dropdown header), "full" (grille mobile)
- Aware du mode (admin: 2 langues, provider: 9 langues)
- Positionnement RTL-aware (ltr:right-0 rtl:left-0)
- Drapeaux emoji pour identification visuelle
- Support clavier (Escape pour fermer)
- Accessibilité: ARIA labels, role="listbox"

**Usage:**
```tsx
<LanguageSelector mode="provider" variant="compact" />
<LanguageSelector mode="admin" variant="full" />
```

### 57.7 Formatage Localisé

**Fichier:** `sos/src/utils/localeFormatters.ts`

**Utilitaires Date:**
```typescript
formatDate(date, { language, userCountry, format })
formatTime(date, { language, userCountry })
formatDateTime(date, { language, userCountry })
formatRelativeTime(date, { language })
```

**Utilitaires Nombre:**
```typescript
formatNumber(value, { language, style, currency })
formatCurrency(amount, currency, { language })
```

**Support:**
- Formats date spécifiques pays (DD/MM/YYYY vs MM/DD/YYYY)
- Détection format heure 12h/24h
- Mapping locale date-fns pour 9 langues
- Support Firestore timestamps

### 57.8 Support RTL (Right-to-Left)

**Langues RTL:** Arabe (AR), Hébreu (HE), Persan (FA), Ourdou (UR)

**Implémentation:**
```typescript
// i18n/index.ts
export const RTL_LANGUAGES = ["ar", "he", "fa", "ur"] as const;

function applyLanguageStyles(lang?: string) {
  document.documentElement.dir = isRTL(currentLang) ? "rtl" : "ltr";
  document.documentElement.classList.add("rtl");
}
```

**CSS Support:**
```css
/* Positionnement adaptatif */
.selector { ltr:right-0 rtl:left-0 }
```

### 57.9 Polices Spéciales par Langue

| Langue | Police |
|--------|--------|
| Chinois (ZH) | "Noto Sans SC", Inter |
| Hindi (HI) | "Noto Sans Devanagari", Inter |
| Arabe (AR) | "Noto Sans Arabic", Inter |
| Défaut | Inter, system-ui, sans-serif |

### 57.10 Contenu Namespaces

| Namespace | Clés | Contenu |
|-----------|------|---------|
| **common** | ~200 | Navigation, actions, status, erreurs, succès |
| **admin** | ~529 | Paramètres plateforme, gestion providers, audit |
| **provider** | ~337 | Dashboard, dossiers, messages, profil, abonnement |
| **chat** | ~27 | Assistant IA, UI chat, tags juridiques |
| **subscription** | Multi | Plans, trial, facturation, features, quotas |

### 57.11 Détection et Persistance Langue

**Priorité Détection:**
1. Paramètre URL: `?lang=fr`
2. localStorage: Clé `i18nextLng`
3. Navigator: `navigator.language` ou `navigator.languages[0]`
4. Fallback: Français (FR)

**Persistance:**
- Sauvegarde automatique localStorage
- Sync entre onglets (storage event listener)
- Restauration au reload app
- Set via `setLang(language)`

### 57.12 Limites par Mode

| Mode | Langues Disponibles |
|------|---------------------|
| **Admin (Console)** | FR, EN (2 langues) |
| **Provider (Dashboard)** | FR, EN, DE, RU, ZH, ES, PT, AR, HI (9 langues) |

### 57.13 Mapping Pays-Locale

**90+ pays mappés:**
```typescript
CN → 'zh-CN'
IN → 'hi-IN'
SA → 'ar-SA'
FR → 'fr-FR'
DE → 'de-DE'
BR → 'pt-BR'
RU → 'ru-RU'
US → 'en-US'
// ... etc
```

### 57.14 Scripts Sync Traductions

| Script | Description |
|--------|-------------|
| `sync-all-translations.cjs` | Sync locales → helper files, tri alphabétique |
| `merge-i18n-to-react-intl.cjs` | Merge structures nested → flat react-intl |
| `migrate-plans-9-languages.cjs` | Migration plans abonnement 9 langues Firestore |

### 57.15 Fichiers Clés i18n

```
Outil-sos-expat/
├── src/i18n/index.ts              # Config i18next
├── src/hooks/useLanguage.ts       # Hook gestion langue
├── src/components/LanguageSelector.tsx
└── src/i18n/locales/[lang]/[namespace].json (36 fichiers)

sos/
├── src/i18n/index.ts              # Système custom léger
├── src/i18n/lang.ts               # Utilitaires langue
├── src/i18n/constants/locales.ts  # Locales supportées
├── src/helper/[lang].json         # Messages (9 fichiers)
├── src/utils/localeFormatters.ts  # Formatage date/nombre
└── src/locales/languageMap.ts     # Métadonnées langues
```

### 57.16 Résumé Fonctionnalités i18n

| Fonctionnalité | Statut |
|----------------|--------|
| 9 langues supportées | ✅ |
| Détection automatique navigateur | ✅ |
| Persistance localStorage | ✅ |
| Support RTL (Arabe) | ✅ |
| Polices spéciales (Asie, Moyen-Orient) | ✅ |
| Formatage locale-aware (dates, nombres, devises) | ✅ |
| Conventions spécifiques pays | ✅ |
| Deux frameworks parallèles | ✅ |
| Restrictions par mode | ✅ |
| Organisation namespaces | ✅ |
| Accessibilité (ARIA, clavier) | ✅ |

---

## 58. SYSTÈME DE GESTION DES FORMULAIRES

### 58.1 Architecture Vue d'Ensemble

Le système de formulaires suit une **approche component-driven, validation-first** avec schémas Zod, hooks React personnalisés, et composants réutilisables.

### 58.2 Composants Inputs Formulaires

**Répertoire:** `src/components/forms-data/`

| Composant | Description | Basé sur |
|-----------|-------------|----------|
| `IntlPhoneInput.tsx` | Input téléphone international | react-phone-input-2 |
| `MultiLanguageSelect.tsx` | Sélection multi-langue | react-select |
| `CountrySelect.tsx` | Sélection pays | react-select |
| `SpecialtySelect.tsx` | Spécialités avocat groupées | react-select |
| `PhoneInput.tsx` | Code pays + numéro | Custom |
| `WhatsAppInput.tsx` | Input WhatsApp | Custom |
| `NationalitySelect.tsx` | Sélection nationalité | react-select |
| `ExpatHelpSelect.tsx` | Types aide expat | react-select |

**IntlPhoneInput - Fonctionnalités:**
- Support 9 locales (fr, en, es, de, pt, ru, ch, hi, ar)
- Gestion automatique préfixe trunk (0) pour 40+ pays
- Normalisation smart au blur
- Standardisation format E.164
- Gestion événements clavier

**MultiLanguageSelect - Fonctionnalités:**
- Multi-sélection avec highlight options compatibles
- Recherche temps réel avec normalisation
- Positionnement portal pour z-index
- Tags style pills responsive

### 58.3 Utilitaires Partagés (shared.ts)

```typescript
// Fonctionnalités
- Détection et gestion locale
- Normalisation texte (NFD, suppression accents)
- Placeholders localisés (9 langues)
- Messages "aucun résultat" avec contexte
- makeAdaptiveStyles(): Factory styling react-select
- getLocalizedLabel(): Récupération label avec fallbacks
```

### 58.4 Schémas Validation Zod

**subscription.schema.ts:**

```typescript
// Création Checkout
createCheckoutSchema = z.object({
  planId: regex validation (provider_tier format),
  billingPeriod: enum ('monthly' | 'yearly'),
  successUrl: validation URL safe redirect,
  cancelUrl: validation URL safe redirect,
  promoCode: max 50 chars, protection XSS,
  currency: enum ('EUR' | 'USD')
})

// Plans Abonnement
subscriptionPlanSchema = z.object({
  id: identifiant plan,
  tier: enum (trial | basic | standard | pro | unlimited),
  providerType: enum (lawyer | expat_aidant),
  aiCallsLimit: integer (-1 = illimité),
  pricing: { EUR, USD },
  stripePriceId: identifiants prix Stripe,
  features: array strings,
  isActive: boolean,
  displayOrder: integer
})
```

**Opérations Admin:**
- `adminForceAccessSchema`: Accorder accès IA (1-365 jours)
- `adminChangePlanSchema`: Modifications plan admin
- `adminCancelSubscriptionSchema`: Annulations forcées avec options remboursement
- `adminResetQuotaSchema`: Reset quotas avec audit trail

**pricing.schema.ts:**

```typescript
// Noeud Pricing
pricingNodeSchema = z.object({
  connectionFeeAmount: nombre non-négatif,
  providerAmount: nombre non-négatif,
  totalAmount: nombre non-négatif,
  currency: enum ('eur' | 'usd'),
  duration: integer >= 1
})
// Validation: total === connectionFee + provider (±0.01 tolérance)

// Override Pricing
- Gestion overrides basés dates
- Validation: startsAt < endsAt
- Stackable avec coupons optionnel
```

### 58.5 Fonctions Validation

```typescript
// Pattern validation Zod
const result = schema.safeParse(input);
if (result.success) {
  return { success: true, data: result.data };
} else {
  return {
    success: false,
    errors: result.error.issues.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }))
  };
}

// Fonctions exportées
validateCreateCheckout()
validateCancelSubscription()
validateAdminForceAccess()
validateAdminChangePlan()
formatValidationErrors()
```

### 58.6 Validateur Montants (amountValidator.ts)

**Règles:**
- Total = commission + provider (±0.01 tolérance)
- Min: 0.50 EUR, Max: 500 EUR
- Commission ne peut être négative ou >= total
- Montant provider ne peut être négatif

### 58.7 Système Formulaire Feedback

**FeedbackForm.tsx:**

```typescript
interface FormData {
  email: string (required, validé)
  feedbackType: 'bug' | 'ux_friction' | 'suggestion' | 'other'
  description: string (min 10 chars, max 2000)
  priority?: 'blocking' | 'annoying' | 'minor'
  screenshot?: File (optionnel, max 5MB, images uniquement)
}
```

**Collection Info Appareil:**
- Type appareil (mobile | tablet | desktop)
- Détection OS (iOS, Android, Desktop)
- Détection navigateur (Safari, Chrome, Other)
- Résolution écran
- Type connexion

**États Formulaire:**
- idle: État initial
- submitting: Écriture Firebase en cours
- success: Soumission réussie (auto-close 2s)
- error: Échec avec message erreur

### 58.8 Hook useFeedback

```typescript
interface UseFeedbackReturn {
  submitFeedback: (data, screenshot?) => Promise<string>;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
}

// Flux
1. Set état loading
2. Upload screenshot (si présent) → Firebase Storage
3. Submit données feedback → Firestore
4. Return ID document feedback
5. Gestion erreurs avec logging détaillé
```

### 58.9 Service Feedback (feedback.ts)

**Fonctions:**

| Fonction | Description |
|----------|-------------|
| `uploadFeedbackScreenshot()` | Validation type/taille, upload Storage |
| `submitUserFeedback()` | Sanitization, construction doc, écriture Firestore |
| `getUserFeedbacks()` | Historique feedbacks user avec pagination |
| `sanitizeFeedbackData()` | Nettoyage données (trim, limites, lowercase) |

### 58.10 Formulaire Paiement PayPal

**PayPalPaymentForm.tsx:**

**Méthodes Paiement:**
- Boutons PayPal (flux standard)
- Card Fields (Visa, Mastercard, Amex)

**Codes Erreur i18n:**
```typescript
INSTRUMENT_DECLINED
INSUFFICIENT_FUNDS
CARD_EXPIRED
INVALID_CARD_NUMBER
INVALID_CVV
PAYER_ACTION_REQUIRED
NETWORK_ERROR
PROVIDER_NOT_CONFIGURED
// ... 10+ codes erreur
```

**Détection Erreurs:**
- Erreurs réseau (AbortError, ERR_BLOCKED_BY_CLIENT)
- Identification bloqueurs extensions
- Messages spécifiques réseau vs carte

### 58.11 Sources Données Formulaires

**Répertoire:** `src/data/`

| Fichier | Contenu |
|---------|---------|
| `languages-spoken.ts` | 50+ langues, labels multilingues |
| `phone-codes.ts` | 195+ pays, codes dial, préfixes trunk |
| `lawyer-specialties.ts` | Spécialités groupées (10+ catégories) |
| `expat-help-types.ts` | Catégories services expat |
| `countries.ts` | Codes, noms, drapeaux pays |

### 58.12 Patterns Sécurité

**Sanitization Input:**
- Transforms Zod: `.transform((val) => val.trim().replace(/[<>]/g, ''))`
- Normalisation email: `.toLowerCase()`
- Limites longueur: `.max(length)` sur tous champs texte
- Validation regex: Plan IDs, UIDs, patterns email
- Whitelist URL redirect: Domaines autorisés uniquement
- Pas undefined Firestore: Gestion null explicite

**Sécurité Upload Fichiers:**
- Validation MIME type: `file.type.startsWith('image/')`
- Validation taille: Max 5MB
- Sanitization filename: Email + timestamp + random ID
- Organisation path Storage

### 58.13 Patterns et Bonnes Pratiques

| Pattern | Usage |
|---------|-------|
| Mémorisation | `useMemo()` pour options selects |
| Dépendances Callback | `useCallback()` avec deps explicites |
| Détection Locale | Langue navigateur avec fallback |
| Accessibilité | Attributs ARIA sur tous inputs |
| Opérations Async | Promise-based avec try/catch |
| Logging | Console logging extensif pour debug |
| Intégration i18n | react-intl pour tout texte user |
| Type Safety | TypeScript complet |
| Récupération Erreur | Messages user-friendly avec i18n |
| Performance | Search debounced, lazy loading, portals |

### 58.14 Structure Répertoires Formulaires

```
src/
├── components/forms-data/       # Inputs réutilisables
│   ├── IntlPhoneInput.tsx
│   ├── MultiLanguageSelect.tsx
│   ├── CountrySelect.tsx
│   ├── SpecialtySelect.tsx
│   ├── shared.ts
│   └── index.ts
├── components/feedback/
│   └── FeedbackForm.tsx
├── components/payment/
│   └── PayPalPaymentForm.tsx
├── validation/                  # Schémas
│   ├── subscription.schema.ts
│   └── pricing.schema.ts
├── hooks/
│   └── useFeedback.ts
├── services/
│   └── feedback.ts
├── utils/
│   ├── amountValidator.ts
│   └── phone.ts
├── data/                        # Sources données
│   ├── languages-spoken.ts
│   ├── phone-codes.ts
│   └── lawyer-specialties.ts
└── pages/
    ├── Contact.tsx
    └── Register.tsx
```

---

## 59. SYSTÈME DE STYLING (TAILWIND CSS)

### 59.1 Vue d'Ensemble Architecture

Le système de styling utilise **Tailwind CSS** avec CSS custom properties (design tokens), organisé sur les deux applications.

### 59.2 Configuration Tailwind

**Outil-sos-expat (`tailwind.config.js`):**
```javascript
{
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  plugins: ['@tailwindcss/forms', 'tailwindcss-animate']
}
```

**Extensions thème:**
- Couleurs: SOS brand red (#DC2626), sémantiques, provider-specific
- Typographie: Inter font, tailles custom (xs-4xl)
- Espacements: Defaults + custom (18, 88, 112, 128)
- Border radius: Variables CSS avec variants lg/md/sm + 4xl
- Animations: fade-in/out, slide-up/down, accordion
- Shadows: soft, card, card-hover

### 59.3 Configuration PostCSS

```javascript
// Plugins (ordre):
1. postcss-import       // Résolution @import CSS
2. tailwindcss/nesting  // Syntaxe CSS imbriquée
3. tailwindcss          // Traitement directives
4. autoprefixer         // Préfixes vendor
```

### 59.4 Design Tokens CSS

**Fichier:** `Outil-sos-expat/src/styles/design-tokens.css`

| Catégorie | Tokens |
|-----------|--------|
| **Couleurs** | Brand, sémantiques, neutres (50-900), provider types, status |
| **Espacements** | 0-4xl (0px à 64px) |
| **Typographie** | Tailles (xs-4xl), weights, line heights |
| **Shadows** | sm-2xl, inner, glow |
| **Border Radius** | none-full (0-9999px) |
| **Transitions** | Durées (fast-slower), easing |
| **Z-Index** | Layers organisés |
| **Composants** | Header height, bottom nav, sidebar, touch targets |
| **Safe Areas** | env(safe-area-inset-*) avec fallbacks |

**Support Dark Mode:** Inversion couleurs complète avec grays ajustés

### 59.5 Design Tokens TypeScript

**Fichier:** `Outil-sos-expat/src/styles/design-tokens.ts`

```typescript
// Exports
colors: Brand, semantic, neutral, provider, status
spacing: 0-4xl avec commentaires descriptifs
typography: Font families, sizes, weights, line heights
breakpoints: xs-2xl (0-1536px) avec helpers media query
mediaQueries: Min-width, max-width, feature queries
shadows: Valeurs shadow nommées
borderRadius: Valeurs radius prédéfinies
transitions: Presets durée et easing
zIndex: Layering organisé (behind-max)
touchTargets: Minimum/comfortable/large sizes
safeAreas: Device safe area insets
components: Header, bottom nav, sidebar, cards, buttons, inputs, modals

// Types exportés
ColorKey, SpacingKey, BreakpointKey, etc.
```

### 59.6 Système d'Animations

**Fichier:** `Outil-sos-expat/src/styles/animations.css`

**Keyframes:**
- Fade in/up/down (avec transforms)
- Slide in left/right/bottom
- Scale in (zoom)
- Bounce subtle
- Pulse et shake
- Spin et shimmer
- Dot bounce (indicateur typing)

**Classes Utilitaires:**
```css
.animate-fade-in-*
.animate-slide-in-*
.animate-scale-in
.animate-bounce-subtle
.animate-pulse, .animate-shake, .animate-spin
.animate-shimmer (skeleton loading)
.animate-dot-1/2/3 (typing dots)
```

**Transitions:**
```css
.transition-fast, .transition-default, .transition-slow
.transition-transform, .transition-opacity
```

**Interactions Touch:**
```css
.touch-scale-down  /* Active state scale */
.touch-opacity     /* Active state opacity */
.tap-highlight     /* Pseudo-element feedback */
```

**Accessibilité:** Respect `prefers-reduced-motion`

### 59.7 Styles Globaux (index.css)

**Outil-sos-expat:**
- Import design tokens et animations
- Directives Tailwind (base, components, utilities)
- Variables CSS shadcn/ui (HSL-based)
- Accessibilité mobile (touch targets 36-56px)
- Safe area utilities pour devices avec notch
- Support RTL/LTR pour Arabe
- Containers responsive mobile-first
- Polices spécifiques langues:
  - Chinois: Noto Sans SC
  - Hindi: Noto Sans Devanagari
  - Arabe: Noto Sans Arabic
  - Russe: Roboto Cyrillic

**SOS App:**
- Best practices mobile 2026
- Classes layer composants (.btn-primary, .input-field, .card)
- Stabilité layout dashboard
- Fixes intégration PayPal
- Skeleton loading avec shimmer
- Support safe areas
- Styles impression

### 59.8 Styling Spécifique Composants

**AI Assistant Dashboard:**
```
pages/Dashboard/AiAssistant/styles/
├── tokens.css    # Design tokens AI dashboard
└── mobile.css    # Composants mobile AI dashboard
```

**tokens.css:**
- Gradients couleur primaire/secondaire
- Variables glassmorphism (bg, blur, border)
- Gradients (primary, shine, shimmer)
- Animations (shimmer, pulse-glow, float, fade-in-up)

**mobile.css:**
- Touch targets et mobile padding
- Safe area insets via `env()`
- Composants: `.ai-assistant-container`, `.touch-btn`, `.touch-card`
- `.fab-container` et `.fab-button` avec animation pulse
- `.bottom-sheet-*` (peek/half/full heights)
- `.pull-refresh-indicator` avec spinner

### 59.9 Overrides Third-Party

**Phone Input (`intl-phone-input.css`):**
- Override complet react-tel-input
- Style cohérent forms (48px height, 16px font)
- Dropdown optimisé mobile
- État focus/erreur rouge
- Scrollbar customisé

**Language Select (`multi-language-select.css`):**
- Variables couleur custom
- Support dark mode
- Focus styling (#dc2626)
- Couleurs chip et success state

### 59.10 Architecture Mobile-First

**Principes Clés:**

| Aspect | Implémentation |
|--------|----------------|
| **Safe Areas** | Notches iPhone, bottom nav |
| **Touch Targets** | Min 44px (iOS), comfortable 48px (Android) |
| **Font Sizes** | Base 14px, inputs 16px min (évite zoom iOS) |
| **Overflow** | `max-width: 100%`, `overflow-x: hidden` global |
| **Performance** | GPU acceleration, will-change, contain layout |

**Breakpoints:**
| Nom | Taille | Usage |
|-----|--------|-------|
| xs | 0px | Mobile |
| sm | 640px | Paysage phone |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Wide desktop |

### 59.11 Implémentation Dark Mode

**Méthodes Activation:**
1. Approche variables CSS (HSL shadcn/ui)
2. Sélecteur classe (`.dark` sur root)
3. Attribut data (`[data-theme="dark"]`)
4. Préférence système (`prefers-color-scheme: dark`)

**Inversions Couleur:**
- Tous grays flip: 50 ↔ 900
- Couleurs sémantiques maintenues avec nuances ajustées
- Backgrounds status darkened pour contraste
- Shadows intensifiées (opacity plus haute)

### 59.12 Fonctionnalités Accessibilité

**Conformité WCAG 2.1:**

| Fonctionnalité | Implémentation |
|----------------|----------------|
| Touch targets | Minimum 44×44px (Apple HIG) |
| Font sizes | 16px minimum inputs (évite zoom) |
| Color contrast | Couleurs sémantiques avec contraste suffisant |
| Focus management | Focus-visible rings sur éléments interactifs |
| Motion reduction | Respect `prefers-reduced-motion` |
| High contrast | Support `prefers-contrast: more` |
| RTL support | Complet pour Arabe et langues RTL |
| Language fonts | Typographie appropriée pour scripts complexes |

### 59.13 Organisation Fichiers CSS

```
src/
├── index.css                    # Styles globaux + directives Tailwind
├── App.css                      # Styles app-specific
├── styles/
│   ├── design-tokens.css        # Propriétés custom CSS
│   ├── design-tokens.ts         # Tokens TypeScript
│   ├── animations.css           # Keyframes + utilitaires animation
│   ├── intl-phone-input.css     # Overrides phone input
│   └── multi-language-select.css
└── pages/Dashboard/AiAssistant/styles/
    ├── tokens.css               # Tokens AI dashboard
    └── mobile.css               # Composants mobile AI
```

### 59.14 Dépendances Styling

| Package | Version | Usage |
|---------|---------|-------|
| tailwindcss | ^3.4.1-3.4.14 | Framework CSS utility-first |
| @tailwindcss/forms | ^0.5.9 | Plugin forms |
| tailwindcss-animate | ^1.0.7 | Plugin animations |
| postcss | ^8.4.35-8.4.47 | Processeur CSS |
| autoprefixer | ^10.4.18-10.4.20 | Préfixes vendor |
| class-variance-authority | - | Gestion variants composants |
| clsx / tailwind-merge | - | Utilitaires class names |
| lucide-react | - | Icônes SVG (dark mode support) |

### 59.15 Optimisation Production

**Considérations Performance:**
1. CSS purging automatique Tailwind (styles non utilisés)
2. Optimisation font Inter variable avec `font-display: swap`
3. Hardware acceleration avec will-change et transform
4. CSS containment sur grandes sections
5. Scroll anchoring (évite layout shifts)

**Process Build:**
- PostCSS traite CSS nested et imports
- Tailwind génère classes utility
- Autoprefixer ajoute préfixes vendor
- CSS final minifié et tree-shaken

### 59.16 Résumé Système Styling

| Fonctionnalité | Statut |
|----------------|--------|
| Design mobile-first | ✅ |
| Touch targets appropriés | ✅ |
| Safe areas devices | ✅ |
| Accessibilité WCAG 2.1 | ✅ |
| Design tokens centralisés | ✅ |
| Performance Tailwind optimisée | ✅ |
| Support RTL complet | ✅ |
| Polices spécifiques langues | ✅ |
| Dark mode complet | ✅ |
| Type safety tokens TS | ✅ |
| Breakpoints sémantiques | ✅ |
| Composants réutilisables | ✅ |

---

## 60. CONSTANTES ET CONFIGURATION

### 60.1 Variables d'Environnement (.env)

**Configuration Firebase:**
| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Clé API Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domaine authentification |
| `VITE_FIREBASE_PROJECT_ID` | ID projet |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket Cloud Storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID sender messaging |
| `VITE_FIREBASE_APP_ID` | ID app Firebase |
| `VITE_FIREBASE_MEASUREMENT_ID` | ID mesure GA4 |
| `VITE_FIREBASE_VAPID_KEY` | Clé VAPID push notifications |

**Configuration Analytics:**
| Variable | Description |
|----------|-------------|
| `VITE_GA4_MEASUREMENT_ID` | ID mesure Google Analytics 4 |
| `VITE_GTM_ID` | ID container Google Tag Manager |
| `VITE_GOOGLE_ADS_CONVERSION_ID` | ID conversion Google Ads |
| `VITE_GOOGLE_ADS_PURCHASE_LABEL` | Label conversion achat |
| `VITE_GOOGLE_ADS_LEAD_LABEL` | Label conversion lead |
| `VITE_GOOGLE_ADS_SIGNUP_LABEL` | Label conversion signup |

**Configuration Paiement:**
| Variable | Description |
|----------|-------------|
| `VITE_STRIPE_PUBLIC_KEY` | Clé publique Stripe |
| `VITE_PAYPAL_CLIENT_ID` | Client ID PayPal |
| `VITE_PAYPAL_MODE` | Environnement PayPal (sandbox/live) |

**Cloud Functions:**
- `VITE_FUNCTIONS_REGION`: Default `europe-west1`
- `VITE_USE_EMULATORS`: Activer émulateurs Firebase

### 60.2 Constantes Localisation

**Fichier:** `src/i18n/constants/locales.ts`

```typescript
SUPPORTED_LOCALES = ['fr', 'en', 'de', 'ru', 'ch', 'es', 'pt', 'ar', 'hi']
DEFAULT_LOCALE = 'fr'
```

### 60.3 Types Abonnement

**Fichier:** `src/types/subscription.ts`

| Type | Valeurs |
|------|---------|
| **Tiers** | `trial`, `basic`, `standard`, `pro`, `unlimited` |
| **Status** | `trialing`, `active`, `past_due`, `canceled`, `expired`, `paused`, `suspended` |
| **Billing Periods** | `monthly`, `yearly` |
| **Provider Types** | `lawyer`, `expat_aidant` |
| **Currencies** | `EUR`, `USD` |

### 60.4 Configuration Monitoring Appels

**Fichier:** `src/config/callsConfig.ts`

```typescript
CALLS_CONFIG = {
  alerts: {
    stuckCallThreshold: 5 * 60 * 1000,  // 5 minutes
    maxLatency: 300,                    // 300ms
    maxConcurrentCalls: 30,
  },
  refresh: {
    systemHealthInterval: 30000,        // 30 secondes
  },
  firestore: {
    liveCallsLimit: 50,
    maxAlerts: 10,
  },
  audioQuality: { poor: 1, fair: 2, good: 3, excellent: 4 }
}
```

### 60.5 Configuration Activité Provider

**Fichier:** `src/config/providerActivityConfig.ts`

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| `FIRST_REMINDER_MINUTES` | 30 | Premier rappel informatif |
| `SECOND_REMINDER_MINUTES` | 60 | Deuxième rappel avec warning |
| `INACTIVITY_AUTO_OFFLINE_MINUTES` | 90 | Passage offline forcé |
| `POPUP_AUTO_OFFLINE_TIMEOUT_MINUTES` | 10 | Auto offline après popup |
| `ACTIVITY_UPDATE_INTERVAL_MINUTES` | 3 | Fréquence mise à jour activité |
| `EVENT_DEBOUNCE_MS` | 2000 | Debounce événements |

### 60.6 Types Sécurité

**Fichier:** `src/types/security.ts`

| Type | Valeurs |
|------|---------|
| **Severity** | `info`, `warning`, `critical`, `emergency` |
| **Alert Status** | `pending`, `acknowledged`, `investigating`, `resolved`, `escalated`, `false_positive` |
| **Threat Categories** | `intrusion`, `fraud`, `api_abuse`, `system`, `data_exfil` |
| **Threat Levels** | `normal`, `low`, `moderate`, `elevated`, `critical` |

**15 Types Alertes Sécurité:**
- `security.brute_force_detected`
- `security.unusual_location`
- `security.suspicious_payment`
- `security.mass_account_creation`
- `security.api_abuse`
- `security.impossible_travel`
- `security.card_testing`
- `security.sql_injection`
- `security.xss_attempt`
- Et plus...

### 60.7 Types Finance et Paiement

**Fichier:** `src/types/finance.ts`

| Type | Valeurs |
|------|---------|
| **Payment Status** | `pending`, `processing`, `paid`, `captured`, `failed`, `refunded`, `partially_refunded`, `disputed`, `cancelled` |
| **Payment Methods** | `stripe`, `paypal`, `card`, `sepa`, `bank_transfer` |
| **Transaction Types** | `call_payment`, `subscription`, `refund`, `payout`, `adjustment`, `dispute` |
| **Dispute Status** | `open`, `under_review`, `won`, `lost`, `closed`, `accepted` |
| **Payout Status** | `pending`, `processing`, `completed`, `failed`, `cancelled` |

**Devises Finance:** EUR, USD, GBP, CHF, CAD, AUD, JPY, CNY, INR, BRL

### 60.8 Types Comptabilité et Taxes

**Fichier:** `src/types/accounting.ts`

| Type | Valeurs |
|------|---------|
| **Tax System** | `VAT`, `GST`, `SALES_TAX`, `NONE` |
| **Legal System** | `COMMON_LAW`, `CIVIL_LAW`, `MIXED`, `OTHER` |
| **VAT Validation APIs** | `VIES`, `HMRC`, `GST_INDIA`, `ATO`, `OTHER` |
| **Filing Frequency** | `MONTHLY`, `QUARTERLY`, `SEMI_ANNUAL`, `ANNUAL` |
| **Journal Entry Types** | `STANDARD`, `ADJUSTING`, `CLOSING`, `REVERSING`, `OPENING`, `CORRECTION` |
| **Account Types** | `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`, `CONTRA_*` |

### 60.9 Types Provider

**Fichier:** `src/types/provider.ts`

| Type | Valeurs |
|------|---------|
| **Provider Types** | `lawyer`, `expat`, `accountant`, `notary`, `tax_consultant`, `real_estate`, `translator`, `hr_consultant`, `financial_advisor`, `insurance_broker` |
| **Validation Status** | `pending`, `in_review`, `approved`, `rejected`, `changes_requested` |
| **Availability** | `available`, `busy`, `offline` |
| **Stripe Account Status** | `pending_verification`, `verified`, `restricted`, `error` |
| **PayPal Account Status** | `not_connected`, `pending`, `connected`, `restricted`, `error` |
| **KYC Status** | `not_started`, `pending`, `completed`, `verified`, `error` |

### 60.10 Données Géographiques

**Fichier:** `src/data/countries.ts`

- **Total Pays:** 195 pays
- **Pays Prioritaires (Priority 1):** GB, FR, DE, ES, RU, CN
- **Support Langues par Pays:** 10 langues (FR, EN, ES, DE, PT, ZH, AR, RU, IT, NL)

**Fichier:** `src/data/languages-spoken.ts`

- **Total Langues:** 100+ langues
- **Top Langues:** Chinois (1300M), Anglais (1500M), Hindi (600M), Espagnol (550M)

### 60.11 Types Aide Expat

**Fichier:** `src/data/expat-help-types.ts`

**15 Catégories d'Aide:**
- `INSTALLATION` - Installation
- `DEMARCHES_ADMINISTRATIVES` - Procédures administratives
- `RECHERCHE_LOGEMENT` - Recherche logement
- `OUVERTURE_COMPTE_BANCAIRE` - Ouverture compte bancaire
- `SYSTEME_SANTE` - Système de santé
- `EDUCATION_ECOLES` - Éducation et écoles
- `TRANSPORT` - Transport
- `RECHERCHE_EMPLOI` - Recherche emploi
- `CREATION_ENTREPRISE` - Création entreprise
- `FISCALITE_LOCALE` - Fiscalité locale
- `CULTURE_INTEGRATION` - Culture et intégration

### 60.12 Plan Comptable TVA OSS

**Fichier:** `src/data/chartOfAccounts.ts`

**Entité:** SOS-Expat OU (Estonie)
**Devise Comptable:** EUR
**Commission Standard:** 15%
**Frais Stripe:** ~2.9% + 0.25 EUR

**Taux TVA OSS (26 pays UE):**
| Pays | Taux |
|------|------|
| Estonie | 22% |
| France | 20% |
| Allemagne | 19% |
| Belgique | 21% |
| Pays-Bas | 21% |
| Italie | 22% |
| Espagne | 21% |
| Portugal | 23% |
| Autriche | 20% |
| Pologne | 23% |

### 60.13 Configuration Menu Admin

**Fichier:** `src/config/adminMenu.ts`

**8 Sections Principales:**
1. **Dashboard** - Vue d'ensemble (Priorité 1)
2. **Users & Providers** - Gestion utilisateurs (Priorité 2)
3. **Calls** - Monitoring appels (Priorité 3)
4. **Finance** - Gestion financière (Priorité 4)
5. **Marketing & Communications** (Priorité 5)
6. **Analytics & Reports** (Priorité 7)
7. **System Administration** (Priorité 8)
8. **Business & Partnerships**

**Total Items Menu:** 50+

### 60.14 Configuration Firebase

**Fichier:** `src/config/firebase.ts`

**Paramètres Clés:**
- **Long Polling:** Activé (HTTP au lieu WebSocket)
- **Fetch Streams:** Désactivé (évite blocage extensions)
- **Cache Persistant:** 50 MB IndexedDB avec multi-tab
- **Log Level:** Error only

**Fonctions Diagnostic (window):**
- `window.resetFirestoreCache()` - Clear IndexedDB
- `window.enableFirestoreCache()` - Réactiver cache
- `window.diagnoseUserDocument()` - Test accès Firestore

### 60.15 Routes Exclusions Banner

**Fichier:** `src/constants/excludedBannerRoutes.ts`

Routes désactivant Cookie Banner et PWA Install Banner:
- Pages appels SOS (toutes langues)
- Pages appels expat (toutes langues)
- Profils providers
- Pages booking & paiement
- Dashboard messages

### 60.16 Statistiques Constantes

| Catégorie | Quantité |
|-----------|----------|
| Langues UI supportées | 9 |
| Langues parlées | 100+ |
| Pays | 195 |
| Tiers abonnement | 5 |
| Types status paiement | 9 |
| Types alertes sécurité | 15 |
| Items menu admin | 50+ |
| Taux TVA OSS | 26 pays UE |
| Catégories aide expat | 15+ |
| Types provider | 10 |
| Types transaction finance | 6 |
| Devises supportées | 10+ |

---

## 61. SYSTÈME D'AUTHENTIFICATION COMPLET

### 61.1 Architecture Authentification

**Stack Technologique:**
- Firebase Authentication (Email/Password + Google OAuth)
- Custom Claims pour les rôles et permissions
- Tokens SSO inter-applications (SOS ↔ Outil IA)
- Firestore pour la persistance des profils utilisateur

**Fichiers Principaux:**
| Fichier | Lignes | Description |
|---------|--------|-------------|
| `AuthContext.tsx` | 2500+ | Contexte React principal |
| `AuthContextBase.ts` | ~200 | Types et interfaces de base |
| `types.ts` | ~505 | Types utilisateur complets |
| `generateOutilToken.ts` | ~712 | SSO vers Outil IA |
| `setAdminClaims.ts` | ~243 | Gestion claims admin |

### 61.2 Rôles Utilisateur

**Types de Rôles:**
```typescript
export type UserRole = "client" | "lawyer" | "expat" | "admin";
```

**Permissions par Rôle:**
| Rôle | Description | Accès Dashboard | Accès Outil IA |
|------|-------------|-----------------|----------------|
| client | Utilisateur standard | User Dashboard | Non |
| lawyer | Avocat prestataire | Provider Dashboard | Oui (abonnement) |
| expat | Aidant expatrié | Provider Dashboard | Oui (abonnement) |
| admin | Administrateur | Admin Dashboard | Oui (illimité) |

### 61.3 AuthContext - Fonctionnalités

**État Géré:**
```typescript
interface AuthContextState {
  user: User | null;
  authUser: FirebaseUser | null;
  isLoading: boolean;
  authInitialized: boolean;
  isFullyReady: boolean;
  error: string | null;
  authMetrics: AuthMetrics;
  deviceInfo: DeviceInfo;
}
```

**Métriques d'Authentification:**
```typescript
interface AuthMetrics {
  loginAttempts: number;
  lastAttempt: Date;
  successfulLogins: number;
  failedLogins: number;
  googleAttempts: number;
  roleRestrictionBlocks: number;
  passwordResetRequests: number;
  emailUpdateAttempts: number;
  profileUpdateAttempts: number;
}
```

### 61.4 Détection Appareil et Réseau

**Information Appareil:**
```typescript
interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;        // android, ios, windows, mac, linux
  browser: string;   // chrome, firefox, safari, edge
  isOnline: boolean;
  connectionSpeed: 'slow' | 'medium' | 'fast';
}
```

**Détection WebView In-App:**
- Facebook, Instagram, TikTok, Twitter, WhatsApp
- LinkedIn, Pinterest, Telegram, WeChat
- Mode redirect forcé pour compatibilité

### 61.5 Authentification Google OAuth

**Stratégie Popup vs Redirect:**
```typescript
// iOS Safari standard → POPUP (meilleur pour ITP)
// iOS WebViews (Chrome, Firefox) → REDIRECT
// Android WebViews → REDIRECT
// Samsung Browser → REDIRECT
// Navigateurs alternatifs → REDIRECT
```

**Gestion Storage Sécurisé:**
```typescript
const safeStorage = {
  _memoryStorage: {},    // Fallback mémoire
  setItem: (key, value) => {
    // 1. sessionStorage
    // 2. localStorage
    // 3. memoryStorage (fallback)
  },
  getItem: (key) => {...},
  removeItem: (key) => {...}
};
```

### 61.6 Création Utilisateur

**Cloud Function createUserDocument:**
- Création document `users/{uid}`
- Création `sos_profiles/{uid}` si lawyer/expat
- Retry avec backoff exponentiel (3 tentatives)
- Délais: 1s → 2s → 4s

**Champs Profil SOS:**
| Catégorie | Champs |
|-----------|--------|
| Identité | uid, email, firstName, lastName, fullName |
| Photo | profilePhoto, photoURL, avatar |
| Contact | phone, phoneNumber, phoneCountryCode |
| Localisation | country, currentCountry, practiceCountries |
| Langues | languages, languagesSpoken |
| Expertise | specialties, yearsOfExperience |
| Disponibilité | isOnline, availability, isActive |
| Approbation | isApproved, approvalStatus, isVisible |

### 61.7 SSO - Authentification Inter-Applications

**Flux generateOutilToken:**
```
1. Prestataire clique "Assistant IA" dans SOS
2. SOS appelle generateOutilToken avec l'UID
3. Vérification: isProvider, hasSubscription, quota
4. Génération Custom Token (signé par outils-sos-expat)
5. Redirection vers /auth?token=xxx
6. signInWithCustomToken() dans l'Outil IA
```

**Vérifications d'Accès:**
1. **isProvider** - Vérifie users.role ou collection providers
2. **checkForcedAccess** - Accès admin forcé (forcedAIAccess: true)
3. **freeTrialUntil** - Essai gratuit manuel
4. **getSubscription** - Abonnement actif
5. **Quota IA** - Limite mensuelle par tier

**Custom Claims Token:**
```typescript
{
  provider: true,
  subscriptionTier: "standard",
  subscriptionStatus: "active",
  email: "user@example.com",
  tokenGeneratedAt: Date.now(),
  // Si multi-provider switch:
  actingAsProvider: true,
  originalUserId: "caller_uid",
  originalUserEmail: "caller@email.com"
}
```

### 61.8 Gestion Admin Claims

**Cloud Functions Admin:**
| Fonction | Description |
|----------|-------------|
| `setAdminClaims` | Définir claims admin après login |
| `bootstrapFirstAdmin` | Initialiser premier admin |
| `initializeAdminClaims` | Ajouter nouvel admin (requiert admin existant) |

**Whitelist Admin:**
```typescript
const ADMIN_EMAILS = [
  'williamsjullin@gmail.com',
  'williamjullin@gmail.com',
  'julienvalentine1@gmail.com'
];
```

**Sécurité P0:**
- `initializeAdminClaims` requiert caller déjà admin
- Audit log pour chaque action admin
- Vérification double: whitelist + claims existants

### 61.9 Collections Firestore Authentification

**Collection `users`:**
| Champ | Type | Description |
|-------|------|-------------|
| uid | string | Identifiant Firebase |
| email | string | Email utilisateur |
| emailLower | string | Email en minuscules |
| role | UserRole | Rôle utilisateur |
| isAdmin | boolean | Flag admin |
| isApproved | boolean | Statut approbation |
| approvalStatus | string | pending/approved/rejected |
| isActive | boolean | Compte actif |
| isOnline | boolean | En ligne actuellement |
| lastLoginAt | timestamp | Dernière connexion |

**Collection `sos_profiles`:**
- Profils prestataires (lawyers/expats)
- Source de vérité pour disponibilité
- Synchronisé avec `users` pour certains champs

**Collection `ssoLogs`:**
| Champ | Type | Description |
|-------|------|-------------|
| userId | string | UID utilisateur |
| email | string | Email |
| action | string | generate_outil_token |
| timestamp | Date | Horodatage |
| success | boolean | Résultat |
| subscriptionTier | string | Tier abonnement |
| accessType | string | Type d'accès |

### 61.10 Interface User Complète

**Types KYC Stripe:**
```typescript
kycStatus:
  | "not_started"
  | "in_progress"
  | "incomplete"
  | "under_review"
  | "verified"
  | "disconnected"
```

**Types KYC PayPal:**
```typescript
paymentGateway: 'stripe' | 'paypal';
paypalAccountStatus: 'not_connected' | 'pending' | 'active' | 'connected' | 'restricted' | 'error';
```

**Champs Utilisateur Principaux:**
| Catégorie | Champs Clés |
|-----------|-------------|
| Identité | id, uid, email, firstName, lastName, fullName |
| Contact | phone, phoneCountryCode |
| Localisation | country, currentCountry, practiceCountries |
| Langues | preferredLanguage, languages, languagesSpoken |
| Professionnel | specialties, yearsOfExperience, barNumber |
| Métriques | rating, reviewCount, totalCalls, totalEarnings |
| Tarification | hourlyRate, price, duration |
| Statuts | isApproved, isActive, isOnline, isBanned |

### 61.11 Synchronisation Multi-Provider

**Fonction syncLinkedProvidersToOutil:**
```typescript
// 1. Récupère linkedProviderIds depuis SOS
// 2. Récupère données de chaque provider
// 3. Écrit dans Firestore de l'Outil IA:
//    - users/{callerUid}: linkedProviderIds, activeProviderId
//    - providers/{providerId}: name, email, type, country
```

**Support Multi-Provider:**
- Un compte peut avoir plusieurs prestataires liés
- Switch de contexte via `asProviderId`
- Vérification permission: `linkedProviderIds.includes(asProviderId)`

### 61.12 Limites et Quotas IA

**Limites par Tier:**
| Tier | Appels/Mois |
|------|-------------|
| trial | 10 |
| basic | 50 |
| standard | 150 |
| pro | 500 |
| unlimited | -1 (illimité) |

**Collections Usage:**
- `aiUsage/{uid}` - Format monthlyUsage[YYYY-MM]
- `ai_usage/{uid}` - Format currentPeriodCalls

### 61.13 Gestion Présence Temps Réel

**Mise à Jour Présence:**
```typescript
const writeSosPresence = async (userId, role, isOnline) => {
  await updateDoc(sosRef, {
    isOnline,
    availability: isOnline ? 'available' : 'unavailable',
    lastStatusChange: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};
```

**Timeout Adaptatif:**
- 60 secondes par défaut (évite faux positifs)
- Adaptation selon connectionSpeed
- Support mode hors ligne

### 61.14 Logging et Audit

**Événements Loggés:**
```typescript
await addDoc(collection(db, 'logs'), {
  type: 'auth_event_type',
  category: 'authentication',
  timestamp: serverTimestamp(),
  userAgent: navigator.userAgent.substring(0, 120),
  viewport: `${window.innerWidth}x${window.innerHeight}`,
  screenSize: `${window.screen?.width}x${window.screen?.height}`,
  device: getDeviceInfo(),
  ...eventData,
});
```

**Collection admin_audit_logs:**
- Actions admin bootstrap
- Création nouveaux admins
- Modifications claims

### 61.15 Statistiques Authentification

| Métrique | Valeur |
|----------|--------|
| Rôles utilisateur | 4 |
| Cloud Functions auth | 4 |
| Méthodes connexion | 2 (Email + Google) |
| Tiers abonnement | 5 |
| Collections auth | 4 (users, sos_profiles, ssoLogs, admin_audit_logs) |
| Champs User interface | 90+ |
| Timeout adaptatif max | 60s |
| Retry max Cloud Function | 3 |

---

## 62. SYSTÈME DE GESTION DOCUMENTAIRE

### 62.1 Architecture Stockage Documents

**Firebase Storage Buckets:**
| Bucket | Description |
|--------|-------------|
| `sos-urgently-ac307.firebasestorage.app` | Bucket principal |
| `sos-expat-backup-dr` | Bucket Disaster Recovery |

**Structure Répertoires Storage:**
```
├── profilePhotos/          # Photos profil actives
├── profile_photos/         # Format alternatif photos
├── temp_profiles/          # Photos temporaires (nettoyées après 7 jours)
├── registration_temp/      # Fichiers temp inscription (7 jours)
├── documents/              # Documents KYC et vérification
├── invoices/               # Factures générées
│   ├── {type}/            # Type (platform, provider)
│   ├── {YYYY}/            # Année
│   ├── {MM}/              # Mois
│   └── {invoiceNumber}.html
├── auth_backups/           # Exports backup Auth Firebase
└── scheduled-backups/      # Backups Firestore automatiques
    ├── morning/
    ├── midday/
    └── evening/
```

### 62.2 Types de Documents et Uploads

**Types de Documents:**
| Type | Location | Utilisation | Rétention |
|------|----------|-------------|-----------|
| Photos Profil | `profilePhotos/` | Images utilisateurs | Permanent |
| Documents KYC | `documents/` | Vérification identité | 10 ans (légal) |
| Factures | `invoices/` | Records financiers | 10 ans (légal) |
| Tax Filings | Tax exports | Documentation TVA | Indéfinie |
| Auth Backups | `auth_backups/` | Backup authentification | 30 jours |

**Flux Upload Photo Profil:**
1. Upload initial vers `registration_temp/` ou `temp_profiles/`
2. Recadrage via `ImageCropModal.tsx`
3. Migration vers `profilePhotos/{userId}` via trigger `onProviderCreated`
4. Nettoyage automatique fichiers temp après 7 jours

### 62.3 Composants Upload Frontend

**ImageCropModal.tsx:**
```typescript
// Fonctionnalités:
- Support multi-langue (9 langues)
- Recadrage carré ou rond
- Taille sortie personnalisable (défaut 512px)
- Retour image en Blob
```

**StripeKyc.tsx:**
- Vérification KYC pour prestataires
- Intégration Stripe Connect Onboarding
- Suivi statut complétion KYC
- Mécanismes retry échecs upload

### 62.4 Fonctions Backend Documents

**generateInvoice():**
```typescript
// sos/firebase/functions/src/utils/generateInvoice.ts
- Génération contenu HTML facture
- Sauvegarde Firebase Storage
- Création URLs signées (expiration 1 an)
- Enregistrement métadonnées Firestore
```

**onProviderCreated():**
```typescript
// Trigger sur création sos_profiles/{uid}
- Migration photo temp vers profilePhotos/{userId}
- Génération slugs SEO pour profils
- Configuration gateway paiement (Stripe/PayPal)
```

### 62.5 Politiques Rétention et Nettoyage

**Nettoyage Automatique:**
- **Fichier:** `cleanupTempStorageFiles.ts`
- **Fréquence:** Quotidien à 3h (Paris)
- **Action:** Supprime fichiers `registration_temp/` et `temp_profiles/` > 7 jours
- **Vérification:** Fichiers non référencés dans Firestore
- **Économie:** ~300€/mois en coûts stockage
- **Log:** Collection `storage_cleanup_logs`

**Tiers de Rétention:**
| Type Données | Rétention | Politique |
|--------------|-----------|-----------|
| Backups Standard | 30 jours | Nettoyage auto après 30 jours |
| Données Financières | 10 ans | Jamais supprimées auto (conformité légale) |
| Fichiers Temp | 7 jours | Auto-supprimés si non référencés |
| URLs Signées Factures | 1 an | Expiration URL |
| Backups Auth | 30 jours | Rétention standard |

### 62.6 Système Backup et Disaster Recovery

**Stratégie Backup Multi-Fréquence:**

**Backups Firestore:** 3 fois par jour
| Heure (Paris) | Type |
|---------------|------|
| 3h | Morning backup |
| 11h | Midday backup |
| 19h | Evening backup |

**Backups Storage:** Hebdomadaire vers DR
- Copie préfixes critiques (profilePhotos, documents, invoices)
- Exclusion fichiers temporaires
- Vérification timestamps avant écrasement
- Calcul checksums intégrité

**Métadonnées Backup:**
```firestore
backups collection:
├── type: 'automatic' | 'manual'
├── backupType: 'morning' | 'midday' | 'evening'
├── status: 'completed' | 'in_progress' | 'failed'
├── operationName: string
├── bucketPath: string
├── checksum: SHA256 hash
├── collectionCounts: Record<string, number>
├── totalDocuments: number
├── retentionDays: number
└── containsFinancialData: boolean
```

### 62.7 Contrôle d'Accès Documents

**Règles Storage Security:**
- Validation authentification utilisateur
- Enforcement propriété utilisateur fichiers personnels
- Support accès admin
- Accès basé sur rôle (admin, provider, user)

**Sécurité Firestore:**
- Écritures batch atomiques
- Actions admin-only pour purge documents
- Logging audit trail tous accès
- Tracking conformité GDPR

### 62.8 Documents Légaux

**Collection:** `legal_documents`

**Structure Document:**
```firestore
├── title: string
├── content: string (markdown)
├── type: 'terms' | 'privacy' | 'cookies'
├── language: 'fr' | 'en' | 'es' | 'de' | 'ru' | 'hi' | 'pt' | 'zh' | 'ar'
├── isActive: boolean
├── version: string
├── createdAt: Timestamp
├── updatedAt: Timestamp
└── publishedAt: Timestamp | null
```

**Fonctionnalités:**
- 9+ langues supportées
- Versioning pour conformité
- Statut publication (draft/published)

### 62.9 Système Export Tax Filings

**Fonction exportFilingToFormat():**

**Formats Supportés:**
| Format | Description | Usage |
|--------|-------------|-------|
| CSV | Format tabulaire | Logiciels comptabilité |
| XML OSS | Schema OSS EU | Déclaration TVA UE |
| XML DES | Déclaration Européenne Services | Services transfrontaliers |
| XML VAT_EE | Retours TVA Estonie | Autorité fiscale estonienne |
| PDF | Génération HTML→PDF | Présentation professionnelle |

**Chemin Storage Exports:**
```
taxfilings/{filingId}/{format}/export_{timestamp}.{ext}
```

### 62.10 Conformité GDPR et Audit

**Système Audit Trail:**
```typescript
// sos/firebase/functions/src/gdpr/auditTrail.ts
AuditEventTypes:
- DATA_ACCESS         // Consultation document
- DATA_MODIFICATION   // Mise à jour document
- DATA_DELETION       // Suppression document
- DATA_EXPORT         // Export document
- CONSENT_UPDATE      // Mise à jour consentement
- ADMIN_ACCESS        // Accès administrateur
```

**Rétention Audit Trail:** 3 ans (exigence légale GDPR)
**Collection:** `gdpr_audit_logs`

**Requêtes Export Données:**
| Champ | Description |
|-------|-------------|
| Collection | `gdpr_data_requests` |
| Types | export, deletion, rectification, access |
| Status | pending → processing → completed |
| Download | Liens avec dates expiration |

### 62.11 Opérations Admin Documents

**Actions Bulk Prestataires:**

**Hard Delete (Purge GDPR):**
- Supprime tous documents: `documents/{providerId}/`
- Anonymise références collections liées
- Collections affectées: call_sessions, payments, reviews, disputes, messages
- Log action: `provider_action_logs`
- Timeout: 9 minutes (540 secondes)

**Soft Delete:**
- Marque prestataire comme supprimé
- Préserve documents (audit/légal)
- Cache des recherches publiques

**Fonctions Backup/Restore:**
```typescript
adminListBackups()              // Liste backups disponibles
adminGetRestoreConfirmationCode() // Obtient code confirmation
adminRestoreFromBackup()        // Restaure backup spécifique
```

### 62.12 Optimisation Performance et Coûts

**Optimisation Stockage:**
| Mesure | Économie |
|--------|----------|
| Nettoyage fichiers temp | ~300€/mois |
| Backups hebdo (vs quotidien) | ~8€/mois |
| Optimisation images (crop/resize) | Variable |
| URLs signées vs publiques | Sécurité + coûts |

**Optimisation Base de Données:**
- Écritures batch atomiques
- Champs TTL sur données temporaires
- Nettoyage niveau collection basé expiration
- Tracking comptage documents monitoring

### 62.13 Statistiques Gestion Documentaire

| Métrique | Valeur |
|----------|--------|
| Buckets Storage | 2 (Principal + DR) |
| Répertoires principaux | 7 |
| Types documents | 5 |
| Formats export tax | 5 (CSV, XML OSS, XML DES, XML VAT_EE, PDF) |
| Langues documents légaux | 9 |
| Rétention données financières | 10 ans |
| Rétention audit GDPR | 3 ans |
| Fréquence backup Firestore | 3x/jour |
| Fréquence backup Storage DR | Hebdomadaire |
| Économie nettoyage auto | ~300€/mois |

---

## 63. SYSTÈME GESTION IMAGES ET MÉDIAS

### 63.1 Utilitaire Optimisation Images

**Fichier:** `sos/src/utils/imageOptimizer.ts`

**Fonctionnalités Principales:**
- Standardisation photos profil à 512x512px
- Conversion WebP pour compression optimale
- Traitement Canvas API HTML5
- Validation taille (max 10MB configurable)
- Métriques compression (ratio original/optimisé)

**Fonctions Clés:**
```typescript
optimizeProfileImage()  // Fonction principale optimisation
supportsWebP()          // Détection capacité navigateur
getOptimalFormat()      // Force WebP pour tous uploads
getFileExtension()      // Retourne extension appropriée
```

**Options d'Optimisation:**
| Option | Valeur Défaut |
|--------|---------------|
| targetSize | 512px |
| quality | 0.85 (WebP) |
| maxInputSize | 10MB |
| format | 'webp' ou 'jpeg' |

### 63.2 Composant ImageUploader

**Fichier:** `sos/src/components/common/ImageUploader.tsx`

**Méthodes d'Input:**
- Click pour upload
- Drag-and-drop
- Capture caméra (desktop et mobile)
- Sélection galerie fichiers

**Formats Supportés:**
| Catégorie | Formats |
|-----------|---------|
| Extensions | JPG, JPEG, PNG, GIF, WEBP, HEIC, HEIF, BMP, TIFF, TIF, AVIF, APNG, ICO |
| MIME types | image/jpeg, image/png, image/gif, image/webp, image/heic, image/heif, image/bmp, image/tiff, image/avif |

**Intégration Caméra:**
- Changement caméra avant/arrière
- Accès caméra web mobile (getUserMedia API)
- Capture photo via Canvas
- Compatibilité cross-device

**Intégration Firebase Storage:**
- Uploads résumables (uploadBytesResumable)
- Suivi progression (0-100%)
- Génération URL automatique (getDownloadURL)
- Gestion métadonnées (contentType)
- Suppression ancienne image avant nouvelle

**Conversion Formats Legacy:**
- HEIC/HEIF → JPEG (automatique)
- TIFF/BMP → JPEG (automatique)
- Redimensionnement Canvas pour conversion

**Chemins Upload:**
| Context | Chemin |
|---------|--------|
| Inscription | `registration_temp/` (temporaire, anonyme) |
| Édition profil | `temp_profiles/` (temporaire) |
| Normal | Via prop `uploadPath` |

### 63.3 Modal Recadrage Image

**Fichier:** `sos/src/components/common/ImageCropModal.tsx`

**Fonctionnalités:**
| Feature | Description |
|---------|-------------|
| Ratio aspect | Carré (1:1), 16:9, personnalisé |
| Zoom | Slider 0.2x - 3x |
| Rotation | Bouton 90° |
| Grille | Overlay règle des tiers |
| Preview | Génération temps réel avec downsampling |
| Output | JPEG qualité 0.9 |
| Touch | Support complet événements tactiles |
| Clavier | Escape pour annuler |

**Support Multi-Langue:**
9 langues: FR, EN, ES, DE, RU, HI, PT, CH, AR

### 63.4 Composant Image Optimisée

**Fichier:** `sos/src/components/common/OptimizedImage.tsx`

**Features Performance:**
| Feature | Description |
|---------|-------------|
| Lazy Loading | Chargement paresseux natif |
| srcset Responsive | Livraison multi-résolution (1x, 2x, 3x) |
| Formats Modernes | Élément picture pour WebP, AVIF fallbacks |
| aspect-ratio CSS | Prévient CLS (Cumulative Layout Shift) |
| fetchPriority | High priority pour images LCP |
| Placeholder | SVG avec animation pulse |
| Error Handling | Fallback automatique sur échec |
| Async Decoding | Décodage image non-bloquant |

**Hook Images Responsive:**
```typescript
useResponsiveImageSources(basePath, widths)
// Génère srcset pour widths: [320, 640, 960, 1280]
// Retourne: { srcSet, sizes }
```

### 63.5 Règles Sécurité Storage

**Fichier:** `sos/storage.rules`

**Chemins et Permissions:**
| Chemin | Lecture | Écriture | Max | Types |
|--------|---------|----------|-----|-------|
| `profilePhotos/{userId}/` | Public | Owner/Admin | 15MB | jpeg, png, webp |
| `registration_temp/` | Public | Anonymous | 5MB | Images |
| `temp_profiles/` | Public | Anonymous | 5MB | Images |
| `profile_photos/{userId}/` | Public | Owner/Admin | 15MB | Images |
| `documents/{userId}/` | Owner/Admin | Owner | 15MB | Images, PDF, DOC |
| `invoices/{type}/{year}/{month}/` | Authenticated | Authenticated | 5MB | PDF |
| `disputes/{id}/evidence/` | Admin | Authenticated | 15MB | Images |
| `feedback_screenshots/` | Admin | Anonymous | 5MB | Images |

### 63.6 Stockage Offline (IndexedDB)

**Fichier:** `sos/src/services/offlineStorage.ts`

**Données Médias Stockées:**
- Profil utilisateur avec champ `photoURL`
- Prestataires favoris avec `providerPhoto`
- Cache données profil avec images pour accès offline
- TTL 24 heures pour caches prestataires

**Monitoring Stockage:**
- Suivi quota stockage
- Requête stockage persistant

### 63.7 Workflow Upload Photo Profil

**Fichier:** `sos/src/pages/ProfileEdit.tsx`

**Étapes Upload:**
1. Configuration: 5MB max, JPEG/PNG/WEBP acceptés
2. Optimisation via `optimizeProfileImage()`
3. Conversion format WebP
4. Stockage `profilePhotos/{userId}/{timestamp}`
5. Mise à jour `photoURL` dans Firebase Auth
6. Mise à jour document Firestore utilisateur
7. Suppression ancienne photo du storage
8. Support sérialisation Firestore Timestamp

### 63.8 Données Photos Profil

**Fichier:** `sos/src/data/profile-photos.ts`

**Métadonnées Photos IA:**
```typescript
{
  role: 'lawyer' | 'expat',
  gender: 'male' | 'female',
  countries: string[],     // Ciblage pays optionnel
  weight: number           // Pondération sélection
}
```

### 63.9 Formats Images

**Formats Upload:**
| Format | Support |
|--------|---------|
| JPEG/JPG | Complet |
| PNG | Complet |
| WebP | Complet |
| GIF | Supporté |
| HEIC/HEIF | Auto-converti JPEG |
| BMP | Auto-converti JPEG |
| TIFF | Auto-converti JPEG |
| AVIF | Supporté |
| APNG | Supporté |

**Format Output:**
- WebP (standard, forcé pour photos profil)
- JPEG (fallback navigateurs legacy)

### 63.10 Limites et Contraintes

| Feature | Limite |
|---------|--------|
| Upload Photo Profil | 5-10MB input → ~100-200KB output |
| Registration Temp | 5MB max |
| Documents Généraux | 15MB max |
| Factures | 5MB max |
| Image Output | 512x512px (profil), configurable |
| Qualité WebP | 0.85 |
| Qualité JPEG Crop | 0.9 |

### 63.11 Sécurité Images

**Protections:**
- Protection IDOR dans ProfileEdit
- Vérification propriété pour écritures
- Opérations admin-only pour chemins sensibles
- Validation type fichier (MIME + extension)
- Validation taille avant traitement
- Restrictions upload anonyme
- Nettoyage automatique anciennes photos
- URLs signées pour sécurité téléchargement

### 63.12 Gestion Erreurs

**Erreurs Upload:**
- Détection format non supporté
- Validation fichier trop large
- Erreurs permission upload
- Gestion réseau/quota dépassé
- Gestion échec optimisation
- Gestion refus accès caméra

**Messages Utilisateur:**
- Messages erreur localisés (9 langues)
- Codes erreur spécifiques par scénario
- Messages erreur fallback
- Logging console debugging

### 63.13 Optimisations Performance

**Côté Client:**
- Optimisation Canvas (pas de serveur nécessaire)
- Uploads résumables
- Suivi progression
- Lazy loading images

**Côté Serveur:**
- Caching CDN Firebase
- Format WebP (fichiers plus petits)
- CSS aspect-ratio (prévient layout shift)
- Décodage image asynchrone

**Stockage:**
- Compression via format WebP
- Réduction taille fichier automatique (3-10x typique)
- Pricing efficace Firebase Storage

### 63.14 Statistiques Système Images

| Métrique | Valeur |
|----------|--------|
| Formats upload supportés | 12 |
| Formats output | 2 (WebP, JPEG) |
| Taille max upload | 15MB |
| Taille output optimisée | ~100-200KB |
| Ratio compression typique | 3-10x |
| Langues messages erreur | 9 |
| Chemins storage sécurisés | 8 |
| Qualité WebP | 85% |
| Taille cible profil | 512x512px |
| Zoom crop min/max | 0.2x - 3x |

---

## 64. DÉPLOIEMENT ET CI/CD

### 64.1 Pipeline GitHub Actions

**Fichier:** `sos/.github/workflows/ci.yml`

**Configuration Pipeline:**
| Paramètre | Valeur |
|-----------|--------|
| Trigger | Push main/master/feature/*/fix/* + PRs |
| Node Version | 20.x |
| Concurrency | Annule runs précédents sur nouveaux commits |

**Jobs Pipeline:**
| Job | Dépendances | Description |
|-----|-------------|-------------|
| `lint-and-typecheck` | - | ESLint + TypeScript check |
| `test` | lint-and-typecheck | Exécute tests + coverage |
| `build-frontend` | lint-and-typecheck, test | Build Vite + artifacts |
| `build-functions` | - | Build Functions TypeScript |
| `security-audit` | - | npm audit (non-bloquant) |
| `ci-success` | Tous | Confirmation finale |

**Artifacts:**
- Coverage reports: 7 jours rétention
- Build `/dist`: 7 jours rétention

### 64.2 Configuration Firebase

**Projet SOS Platform:**
```json
{
  "project": "sos-urgently-ac307",
  "region": "europe-west1",
  "runtime": "nodejs20"
}
```

**Projet Outil SOS:**
```json
{
  "project": "outils-sos-expat",
  "region": "europe-west1",
  "runtime": "nodejs20"
}
```

**Emulators Ports:**
| Service | Port |
|---------|------|
| Auth | 9099 |
| Functions | 5001 |
| Firestore | 8080 |
| Storage | 9199 |
| UI | 4002 |

### 64.3 Scripts Build NPM

**SOS Platform Scripts:**
```bash
npm run dev              # Vite dev server (port 5174)
npm run build            # Full build pipeline
npm run build:force      # Skip prebuild scripts
npm run analyze          # Bundle size analysis
npm run dev:full         # Dev + emulators + functions
npm run dev:emulators    # Firebase emulators only
npm run typecheck        # TypeScript validation
npm run lint             # ESLint validation
npm run test:run         # Unit tests (Vitest)
npm run test:coverage    # Tests avec coverage
```

**Outil SOS Scripts:**
```bash
npm run dev              # Dev server (port 5173)
npm run build            # Build pages + functions
npm run build:strict     # TypeCheck + build + lint
npm run deploy:functions # Deploy functions only
```

### 64.4 Configuration Vite

**SOS Platform (vite.config.js):**
| Option | Valeur |
|--------|--------|
| Port | 5174 (strict) |
| Target | ES2019 |
| Minification | Terser 2-pass |

**Code Splitting Strategy:**
```javascript
manualChunks: {
  'vendor-react': // React ecosystem
  'vendor-firebase': // Firebase SDK
  'vendor-maps': // Leaflet/maps
  'vendor-stripe': // Stripe payment
  'vendor-mui': // Material UI
  'vendor-pdf': // jsPDF, html2canvas
  'vendor-phone': // Phone parsing
  'vendor-d3': // D3 charts
  'vendor-icons': // Lucide icons
  'vendor-date': // Date-fns
}
```

**Outil SOS (vite.config.ts):**
| Option | Valeur |
|--------|--------|
| Port | 5173 (flexible) |
| Target | ES2022 |
| PWA | Workbox Service Worker |

**PWA Caching Strategies:**
| Strategy | Assets | Expiration |
|----------|--------|------------|
| CacheFirst | Static, images, fonts | 7-30 jours |
| NetworkFirst | Firestore API, Google APIs | 5 min - 1 heure |

### 64.5 Build Firebase Functions

**Scripts Functions:**
```bash
npm run build            # TypeScript compilation
npm run build:esbuild    # Bundling optimisé
npm run deploy           # Deploy toutes functions
npm run deploy:fast      # Build puis deploy
npm run deploy:batched   # Deploy par batches
```

**Configuration esbuild:**
| Option | Valeur |
|--------|--------|
| Platform | Node 20 |
| Format | CommonJS |
| Bundle | True |
| Minification | Production only |
| External | firebase-admin, googleapis, @google-cloud/* |

**Optimisation Bundle:**
- Avant: 445MB
- Après esbuild: 10-20MB

**Déploiement Batché:**
```bash
BATCH_SIZE=20              # Functions par batch
DELAY_BETWEEN_BATCHES=30s  # Délai entre batches
```
Prévient erreurs "CPU quota exceeded".

### 64.6 Scripts Développement Local

**start-dev.bat:**
```batch
1. Outil IA        (port 5173)
2. SOS Expat       (port 5174) + Firebase emulators
```

**build-functions.bat:**
- Build SOS Functions
- Build Outil Functions

### 64.7 Variables d'Environnement

**Fichier:** `sos/.env.example`

**Variables Requises:**
| Catégorie | Variables |
|-----------|-----------|
| Firebase | VITE_FIREBASE_API_KEY, PROJECT_ID, AUTH_DOMAIN, etc. |
| Analytics | VITE_GA4_MEASUREMENT_ID, VITE_GTM_ID |
| Ads | VITE_GOOGLE_ADS_CONVERSION_ID |
| Payment | VITE_STRIPE_PUBLIC_KEY, VITE_PAYPAL_CLIENT_ID |
| Functions | VITE_FUNCTIONS_REGION=europe-west1 |
| Development | VITE_USE_EMULATORS=false, NODE_ENV |

### 64.8 Cloudflare Worker

**Fichier:** `sos/cloudflare-worker/wrangler.toml`

**Configuration:**
| Paramètre | Valeur |
|-----------|--------|
| Account ID | fe7c0b2676e091898d565b8eba1544ad |
| Domains | sos-expat.com, www.sos-expat.com |
| CPU Limit | 50ms/request |
| SSR Function | renderForBotsV2 (europe-west1) |

**Fonctionnalités:**
- Détection bots (moteurs recherche, crawlers social)
- Routage vers Cloud Function pour SSR
- Cache résultats SSR dans KV store

### 64.9 Scripts Pre-Build

**gen-firebase-config.cjs:**
- Charge config Firebase depuis .env
- Génère `public/firebase-config.js`
- Valide champs requis

**postbuild.cjs:**
- Copie sitemaps vers dist
- Exécute react-snap pour pre-rendering
- Gère gracieusement échecs

**copy-sitemaps-to-dist.js:**
- Copie sitemaps pré-générés pour SEO

### 64.10 Optimisation Build

**Techniques Optimisation:**
| Technique | Description |
|-----------|-------------|
| Code Splitting | Chunks séparés par vendor |
| Tree Shaking | Élimination code mort |
| Minification | Terser 2-pass compression |
| Sourcemaps | Désactivés production |
| esbuild | Bundle functions 445MB → 10-20MB |
| PWA Caching | Multi-tier avec expiration |

**Répertoires Output:**
| Type | Chemin |
|------|--------|
| Frontend | `/dist` |
| Functions | `/firebase/functions/lib` |
| Cache Build | `/.vite` |

### 64.11 Cibles Déploiement

| Composant | Provider | Région | URL |
|-----------|----------|--------|-----|
| Frontend | Google Cloud / Cloudflare Pages | europe-west1 | sos-expat.com |
| Cloud Functions | Google Cloud | europe-west1 | cloudfunctions.net |
| Firestore | Firebase | europe-west1 | firestore.googleapis.com |
| Storage | Firebase | europe-west1 | firebasestorage.googleapis.com |
| Worker | Cloudflare | Global | CF edge network |

### 64.12 Sécurité et Tests

**Vérifications Pre-Déploiement:**
| Check | Type |
|-------|------|
| ESLint | Non-bloquant |
| TypeScript | Bloquant |
| Unit Tests | Bloquant |
| npm audit | Non-bloquant |

**Fichiers Ignorés (Functions):**
- node_modules/
- .git/
- Fichiers test (*.test.*, *.spec.*)
- Source TS (src/)
- Logs et fichiers temporaires

### 64.13 Commandes Déploiement

**Frontend:**
```bash
npm run build                      # Full build
npm run build:force                # Skip prebuild
firebase deploy --only hosting     # Deploy hosting
```

**Functions:**
```bash
# SOS Platform
cd sos/firebase/functions
npm run deploy                     # Standard
npm run deploy:batched             # Recommandé

# Outil Platform
firebase deploy --only functions
```

**Complet:**
```bash
firebase deploy                    # Hosting + Functions
firebase deploy --only hosting,functions
```

### 64.14 Test et Preview Local

**Emulators:**
```bash
npm run dev:emulators              # Start emulators
npm run dev:full                   # Dev + emulators + functions
firebase emulators:start --only firestore,functions,auth,storage
```

**Preview Production:**
```bash
npm run build
npm run preview                    # Preview build local
npm run analyze                    # Bundle visualization
```

### 64.15 Statistiques CI/CD

| Métrique | Valeur |
|----------|--------|
| Jobs CI pipeline | 6 |
| Projets Firebase | 2 |
| Emulators ports | 5 |
| Chunks vendor | 10 |
| Réduction bundle functions | 445MB → 10-20MB |
| Batch size déploiement | 20 functions |
| Rétention artifacts | 7 jours |
| Environnements | 3 (dev, staging, prod) |
| Variables env requises | 15+ |
| Target build frontend | ES2019/ES2022 |

---

## 65. MIDDLEWARE ET PROTECTION API

### 65.1 Protection Routes Client (ProtectedRoute)

**Fichier:** `sos/src/components/auth/ProtectedRoute.tsx`

**Fonctions Middleware:**
| Fonction | Description |
|----------|-------------|
| `isValidLocalRedirect()` | Prévient vulnérabilités open redirect |
| `sanitizeRedirectUrl()` | Assainit URLs redirect |
| `checkAuthorization()` | Vérification autorisation avec timeout 8s |

**Validation Redirect:**
- Rejette URLs avec protocols (http:, https:, javascript:)
- Rejette URLs relatives protocol (//)
- Rejette URLs avec symbole @
- Valide chemins locaux uniquement (doit commencer par /)
- Rejette traversées path (backslashes)

**États Authentification:**
| État | Description |
|------|-------------|
| `loading` | Initialisation auth |
| `checking` | Vérification permissions |
| `authorized` | Permissions accordées |
| `unauthorized` | Permissions refusées |
| `banned` | Compte suspendu |
| `error` | Erreur autorisation |

**Sécurité:**
- Prévient unmounting pendant rechecks (préserve données formulaire)
- Attente minimum 150ms avant redirects
- Track état autorisation séparément du loading

### 65.2 Admin Claims Middleware

**Fichier:** `sos/firebase/functions/src/auth/setAdminClaims.ts`

**Fonctions:**
| Fonction | Description |
|----------|-------------|
| `setAdminClaims()` | Définit claims admin après login |
| `bootstrapFirstAdmin()` | Crée premier admin |
| `initializeAdminClaims()` | Ajoute nouvel admin (P0 Security Fix) |

**Whitelist Admin:**
```typescript
ADMIN_EMAILS = [
  'williamsjullin@gmail.com',
  'williamjullin@gmail.com',
  'julienvalentine1@gmail.com'
]
```

**Vérifications Sécurité:**
- Authentification Firebase requise
- Validation whitelist email
- Claims admin définis dans Firebase Auth
- Mise à jour document Firestore
- Logging audit tentatives échouées

**P0 Security Fix (initializeAdminClaims):**
- Caller doit être admin existant
- Vérifie `request.auth.token.admin === true`
- Prévient escalade privilèges non autorisée
- Log tentatives non autorisées

### 65.3 Contrôle Accès IA

**Fichier:** `sos/firebase/functions/src/subscription/accessControl.ts`

**Fonctions:**
| Fonction | Description |
|----------|-------------|
| `checkAiAccess()` | Vérifie statut subscription + quota |
| `checkForcedAccess()` | Vérifie accès admin forcé |
| `incrementAiUsage()` | Enregistre usage API IA |
| `checkAndIncrementAiUsageAtomic()` | P0 Fix - Transaction atomique |

**Arbre Décision Accès:**
```
1. Forced Access (admin/freeTrialUntil) → Autoriser (illimité)
2. Pas d'abonnement → Refuser (suggérer upgrade)
3. Statut Trial:
   - Non expiré ET appels disponibles → Autoriser
   - Expiré OU appels épuisés → Refuser
4. Statut Active:
   - Dans quota → Autoriser
   - Quota épuisé → Refuser
5. Statut Past Due:
   - Dans période grâce (7 jours) → Autoriser
   - Au-delà période grâce → Refuser
6. Statut Canceled/Suspended → Refuser
```

**Limites Quota:**
| Paramètre | Valeur |
|-----------|--------|
| Trial | `DEFAULT_TRIAL_CONFIG.maxAiCalls` |
| Grace Period | 7 jours |
| Warning Threshold | 80% |
| Fair Use Limit | Constant pour plans illimités |

### 65.4 Protection Admin Provider

**Fichier:** `sos/firebase/functions/src/admin/providerActions.ts`

**Assertion Admin:**
```typescript
function assertAdmin(ctx: any): string {
  if (!ctx?.auth?.uid) {
    throw new HttpsError("unauthenticated", "Auth required");
  }
  if (!ctx?.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "Admin required");
  }
  return ctx.auth.uid;
}
```

**Actions Admin Protégées:**
| Action | Description |
|--------|-------------|
| `hideProvider()` | Cache des résultats recherche |
| `unhideProvider()` | Affiche dans recherche |
| `blockProvider()` | Bannit de plateforme |
| `unblockProvider()` | Restaure accès |
| `suspendProvider()` | Restriction temporaire |
| `unsuspendProvider()` | Lève suspension |
| `softDeleteProvider()` | Marque supprimé |
| `hardDeleteProvider()` | Purge GDPR |

**Logging:**
- Toutes actions loggées dans `provider_action_logs`
- Inclut: admin UID, type action, raison, timestamp
- Notifications envoyées aux prestataires affectés

### 65.5 Validation Webhook Twilio

**Fichier:** `sos/firebase/functions/src/lib/twilio.ts`

**Validation Multi-Couches:**
| Couche | Vérification |
|--------|--------------|
| 1 | Header `X-Twilio-Signature` |
| 2 | AccountSid correspondant |
| 3 | Plages IP Twilio (mode monitoring) |

**Plages IP Twilio:**
- US cluster (us1): 54.172.60.0/23, 54.244.51.0/24
- EU/Ireland: 34.203.250.0/23, 168.86.128.0/18
- Ashburn: 34.226.36.32/27, 54.152.60.64/27

**Mode Emulateur:**
- Skip validation en développement local
- `FUNCTIONS_EMULATOR === "true"`

### 65.6 Idempotence Webhook

**Fichier:** `sos/firebase/functions/src/Webhooks/twilioWebhooks.ts`

**Check Idempotence (P1-3 Fix):**
```typescript
const webhookKey = `twilio_${body.CallSid}_${body.CallStatus}`;
const webhookEventRef = db.collection("processed_webhook_events").doc(webhookKey);

await db.runTransaction(async (transaction) => {
  const existingEvent = await transaction.get(webhookEventRef);

  if (existingEvent.exists) {
    isDuplicate = true;
    return; // Duplicata détecté
  }

  transaction.set(webhookEventRef, {
    eventKey: webhookKey,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});
```

**Comportement:**
- Prévient race conditions
- Atomicité transactionnelle
- Retourne 200 pour duplicatas (acquitté mais non retraité)
- Retourne 500 pour erreurs transaction (déclenche retry Twilio)

### 65.7 Protection Mot de Passe Dashboard

**Fichier:** `sos/firebase/functions/src/multiDashboard/validateDashboardPassword.ts`

**Configuration:**
```typescript
onCall({
  region: "europe-west1",
  secrets: [MULTI_DASHBOARD_PASSWORD],
  cors: [
    "https://sos-expat.com",
    "https://www.sos-expat.com",
    "http://localhost:3000",
    "http://localhost:5173",
  ],
})
```

**Flux Validation:**
1. Valider input (password requis)
2. Vérifier dashboard activé (admin_config/multi_dashboard)
3. Comparer avec secret (Secret Manager)
4. Logger tentative (succès ou échec)
5. Générer token session avec expiration

**Token Session:**
```typescript
const token = `mds_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
const sessionDuration = (config.sessionDurationHours || 24) * 60 * 60 * 1000;
```

### 65.8 Circuit Breaker (API Twilio)

**Fichier:** `sos/firebase/functions/src/lib/twilio.ts`

**États Circuit:**
| État | Description |
|------|-------------|
| CLOSED | Opération normale |
| OPEN | Service down, bloque appels |
| HALF_OPEN | Test récupération |

**Configuration:**
```typescript
CIRCUIT_BREAKER_CONFIG = {
  FAILURE_THRESHOLD: 3,       // Ouvre après 3 échecs consécutifs
  RESET_TIMEOUT_MS: 15_000,   // Réessaie après 15 secondes
  HALF_OPEN_MAX_CALLS: 1,     // 1 appel test autorisé
}
```

**Fonctions:**
| Fonction | Description |
|----------|-------------|
| `isCircuitOpen()` | Vérifie si circuit ouvert |
| `recordTwilioSuccess()` | Enregistre succès, ferme circuit |
| `recordTwilioFailure()` | Enregistre échec, transition états |
| `getCircuitBreakerStatus()` | Monitoring statut |
| `resetCircuitBreaker()` | Reset manuel debugging |

### 65.9 Utilitaires Auth Frontend

**Fichier:** `sos/src/utils/auth.ts`

**Fonctions:**
| Fonction | Description |
|----------|-------------|
| `checkUserRole(user, roles)` | Valide rôle utilisateur |
| `isUserBanned(userId)` | Vérifie isBanned (timeout 3s) |
| `isUserApproved(userId)` | Vérifie isApproved |
| `isUserAdmin(userId)` | Vérifie role === "admin" |
| `refreshAdminClaims()` | Rafraîchit claims admin |

**Approche Fail-Safe:**
- Timeouts assument accès refusé
- Ban check timeout = non banni (autoriser)
- Validation IP en mode monitoring (log mais ne bloque pas)

### 65.10 Modèle Sécurité Oignon

**Couches Protection:**
```
1. Authentification (doit être connecté)
   ↓
2. Autorisation (doit avoir rôle/permission correct)
   ↓
3. Logique Métier (doit avoir subscription/quota valide)
   ↓
4. Audit Logging (toutes actions enregistrées)
```

### 65.11 Opérations Atomiques

**Pattern Transaction:**
- Transactions Firestore pour opérations critiques
- Prévient race conditions sur requêtes concurrentes
- Exemple: incrément usage IA + check quota en transaction unique

### 65.12 Secrets Management

**Google Cloud Secret Manager:**
| Secret | Usage |
|--------|-------|
| `MULTI_DASHBOARD_PASSWORD` | Mot de passe dashboard |
| `TWILIO_AUTH_TOKEN` | Auth API Twilio |
| `TWILIO_ACCOUNT_SID` | Identifiant compte Twilio |
| `TASKS_AUTH_SECRET` | Auth Cloud Tasks |

**Centralisé:** `sos/firebase/functions/src/lib/secrets.ts`

### 65.13 Tableau Récapitulatif Sécurité

| Couche Protection | Mécanisme | Méthode Auth |
|-------------------|-----------|--------------|
| Route Protection | ProtectedRoute | Firebase Auth + Role Check |
| Admin Claims | Custom claims middleware | Email whitelist + Auth |
| AI Access Control | Subscription quota checks | onCall avec contexte auth |
| Webhook Auth | Validation signature multi-couches | Header + AccountSid + IP |
| Webhook Dedup | Idempotence check atomique | Transaction Firestore |
| Dashboard Password | Secret Manager + token session | Comparaison secret |
| Provider Actions | Admin assertion middleware | `request.auth.token.admin` |
| API Resilience | Pattern circuit breaker | Comptage échecs + machine état |

### 65.14 Statistiques Middleware

| Métrique | Valeur |
|----------|--------|
| États authentification | 6 |
| Emails whitelist admin | 3 |
| Couches validation webhook | 3 |
| États circuit breaker | 3 |
| Timeout check ban | 3s |
| Timeout autorisation | 8s |
| Threshold circuit breaker | 3 échecs |
| Reset circuit breaker | 15s |
| Grace period subscription | 7 jours |
| Warning quota IA | 80% |

---

## 66. SYSTÈME GESTION CONTENU (HELP CENTER & FAQ)

### 66.1 Architecture Système Contenu

**Deux Systèmes Principaux:**
| Système | Description |
|---------|-------------|
| Help Center | Base de connaissances hiérarchique |
| FAQ System | Questions fréquentes par catégories |

**Pas de Blog Traditionnel** - Contenu organisé par centre d'aide et FAQ.

**Collections Firestore:**
- `help_categories` - Catégories articles aide
- `help_articles` - Articles centre d'aide
- `faqs` - Questions fréquentes
- `faq_translations_cache` - Cache traductions (TTL 30 jours)

### 66.2 Système Help Center

**Routes Frontend:**
| Route | Composant | Description |
|-------|-----------|-------------|
| `/centre-aide` | HelpCenter.tsx | Liste articles |
| `/centre-aide/:slug` | HelpArticle.tsx | Détail article |
| `/admin/help-center` | AdminHelpCenter.tsx | Admin gestion |

**Catégories Hiérarchiques (5 principales):**
```
├── Pour les Clients Expatriés
├── Pour les Prestataires Avocats
├── Pour les Prestataires Expat Aidant
├── Comprendre SOS-Expat
└── Guides par Situation
    └── Sous-catégories multiples
```

**Structure Article:**
| Champ | Type | Description |
|-------|------|-------------|
| title | Record<lang, string> | Titre multilingue |
| slug | Record<lang, string> | URL slug multilingue |
| excerpt | Record<lang, string> | Résumé multilingue |
| content | Record<lang, string> | Contenu markdown |
| tags | Record<lang, string[]> | Tags multilingues |
| readTime | number | Temps lecture (minutes) |
| order | number | Ordre affichage |
| isPublished | boolean | Statut publication |
| faqs | Array | FAQs embarquées |

### 66.3 Service Help Center

**Fichier:** `sos/src/services/helpCenter.ts`

**Fonctions:**
| Fonction | Description |
|----------|-------------|
| `listHelpCategories()` | Liste toutes catégories |
| `listHelpArticles()` | Liste articles (filtres) |
| `createHelpCategory()` | Crée catégorie |
| `updateHelpCategory()` | Met à jour catégorie |
| `deleteHelpCategory()` | Supprime catégorie |
| `createHelpArticle()` | Crée article |
| `updateHelpArticle()` | Met à jour article |
| `deleteHelpArticle()` | Supprime article |
| `deleteAllHelpCenterData()` | Suppression batch |

### 66.4 Système FAQ

**Routes Frontend:**
| Route | Composant | Description |
|-------|-----------|-------------|
| `/faq` | FAQ.tsx | Liste FAQs |
| `/faq/:slug` | FAQDetail.tsx | Détail FAQ |
| `/admin/faqs` | AdminFAQs.tsx | Admin gestion |

**Catégories FAQ (6):**
| ID | Nom |
|----|-----|
| discover | Découvrir SOS-Expat |
| clients | J'ai besoin d'aide |
| providers | Je suis prestataire |
| payments | Paiements & Tarifs |
| account | Compte & Inscription |
| technical | Technique & Sécurité |

**Structure FAQ:**
```typescript
interface FAQ {
  id: string;
  question: Record<string, string>;  // Multilingue
  answer: Record<string, string>;    // Multilingue
  slug: Record<string, string>;      // Multilingue
  category: FAQCategoryId;
  tags: string[];
  order: number;
  isActive: boolean;
  isFooter?: boolean;                // Affichage footer
  views?: number;                    // Compteur vues
}
```

### 66.5 Service FAQ

**Fichier:** `sos/src/services/faq.ts`

**Fonctions:**
| Fonction | Description |
|----------|-------------|
| `listFAQs()` | Liste FAQs (filtres) |
| `getFAQById()` | Récupère FAQ par ID |
| `getFAQBySlug()` | Récupère FAQ par slug |
| `createFAQ()` | Crée FAQ |
| `updateFAQ()` | Met à jour FAQ |
| `deleteFAQ()` | Supprime FAQ |
| `incrementFAQViews()` | Incrémente compteur vues |
| `translateFAQToAllLanguages()` | Traduit vers 9 langues |
| `generateSlug()` | Génère slug Unicode |
| `detectLanguage()` | Détecte langue source |
| `translateText()` | Traduit avec cache |

### 66.6 Traduction Automatique

**Pipeline Traduction:**
1. Détection langue (auto ou manuelle)
2. API MyMemory Translation (primaire)
3. API Google Translate (fallback)
4. Stockage cache Firestore (TTL 30 jours)
5. Prévention traductions dupliquées

**Translittération Supportée:**
| Script | Conversion |
|--------|------------|
| Cyrillique (Russe) | → ASCII |
| Arabe | → ASCII |
| Chinois | → Pinyin |
| Hindi (Devanagari) | → ASCII |

**Langues non-latines:** Utilisent préfixe slug anglais pour URLs propres.

### 66.7 Support Markdown

**Éléments Supportés:**
- Headers (H1, H2, H3)
- Texte gras
- Listes (ordonnées et non-ordonnées)
- Formatage paragraphes
- **Sécurité:** Échappement HTML contre XSS

### 66.8 Cloud Functions Contenu

**Fichier:** `firebase/functions/src/helpCenter/initHelpArticles.ts`

**Endpoints:**
| Endpoint | Description |
|----------|-------------|
| `POST /initSingleHelpArticle` | Initialise article avec traduction |
| `POST /initHelpArticlesBatch` | Batch initialisation articles |
| `GET /checkHelpCategories` | Vérifie existence catégories |
| `POST /clearHelpArticles` | Supprime tous articles |

**Features:**
- Mode dry-run pour tests
- Rapport progression
- Tracking et rapport erreurs
- Configuration CORS dev/prod

### 66.9 Initialisation Contenu

**Fichiers Articles Prédéfinis:**
| Fichier | Contenu |
|---------|---------|
| `helpArticlesClients.ts` | Articles clients |
| `helpArticlesLawyers.ts` | Articles avocats |
| `helpArticlesHelpers.ts` | Articles aidants |
| `helpArticlesUnderstand.ts` | Articles compréhension |
| `helpArticlesSituations.ts` | Guides situations |

**Initialisation FAQ (`faqInit.ts`):**
- Sets FAQ prédéfinis par catégorie
- Auto-traduction vers toutes langues
- Génération slug avec translittération

### 66.10 SEO Structured Data

**Schemas Schema.org:**
| Type | Usage |
|------|-------|
| FAQPage | Markup FAQ |
| Article | Markup articles aide |
| BreadcrumbList | Navigation fil d'Ariane |

**Composants SEO:**
- `ArticleSchema.tsx` - Génère schema Article
- `FAQPageSchema.tsx` - Génère schema FAQPage
- `BreadcrumbSchema.tsx` - Génère schema Breadcrumb

**Champs SEO:**
- Meta titles et descriptions
- URLs canoniques
- Keywords/tags
- Temps lecture estimé
- Hreflang pour versions multilingues

### 66.11 Admin Features

**Gestion Help Center:**
- Créer/éditer/supprimer catégories et articles
- Sélecteur langue pour édition multilingue
- Traduction avec cache
- Initialisation bulk depuis templates JSON
- Reset/réinitialisation catégories
- Comptage articles temps réel par catégorie
- Recherche et filtrage

**Gestion FAQ:**
- Créer/éditer/supprimer FAQs
- Détection auto langue source
- Auto-traduction 9 langues
- Initialisation bulk FAQs prédéfinies
- Compteur vues par FAQ
- Organisation par catégories
- Gestion tags
- Toggle affichage footer

### 66.12 Schéma Base de Données

**Collection help_categories:**
```typescript
{
  id: string;
  name: Record<string, string>;
  slug: Record<string, string>;
  order: number;
  isPublished: boolean;
  locale: string;
  icon?: string;
  parentSlug?: string;  // Pour sous-catégories
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Collection help_articles:**
```typescript
{
  id: string;
  title: Record<string, string>;
  slug: Record<string, string>;
  categoryId: string;
  excerpt: Record<string, string>;
  content: Record<string, string>;  // Markdown
  tags: Record<string, string[]>;
  faqs?: Array<{
    question: Record<string, string>;
    answer: Record<string, string>;
    order: number;
  }>;
  readTime: number;
  order: number;
  isPublished: boolean;
  locale: string;
}
```

**Collection faqs:**
```typescript
{
  id: string;
  question: Record<string, string>;
  answer: Record<string, string>;
  slug: Record<string, string>;
  category: string;
  tags: string[];
  order: number;
  isActive: boolean;
  isFooter?: boolean;
  views?: number;
}
```

### 66.13 Langues Supportées

**9 Langues:**
| Code | Langue |
|------|--------|
| fr | Français |
| en | Anglais |
| es | Espagnol |
| de | Allemand |
| pt | Portugais |
| ru | Russe |
| hi | Hindi |
| ar | Arabe |
| ch | Chinois |

### 66.14 Fonctionnalités Uniques

| Fonctionnalité | Description |
|----------------|-------------|
| Hiérarchie catégories | Catégories principales avec sous-catégories |
| Traduction intégrée | Auto-traduction 9 langues avec cache |
| Tracking vues | Compteur vues FAQ pour analytics |
| Markdown riche | Articles avec formatage texte |
| Contenu prédéfini | Initialisation bulk depuis templates |
| Dashboard admin | Interface gestion complète |
| Publication multi-étapes | États brouillon et publié |
| FAQs footer | FAQs spéciales pour footer |

### 66.15 Statistiques Système Contenu

| Métrique | Valeur |
|----------|--------|
| Catégories principales Help Center | 5 |
| Catégories FAQ | 6 |
| Langues supportées | 9 |
| Collections Firestore | 4 |
| Schemas SEO | 3 |
| Routes frontend | 6 |
| Pages admin | 2 |
| TTL cache traduction | 30 jours |
| Scripts alphabet supportés | 5 (Latin, Cyrillique, Arabe, Chinois, Hindi) |

---

## 67. INTÉGRATION OUTIL IA SOS EXTERNE

### 67.1 Architecture Deux Applications

**Applications Séparées:**
| Application | URL | Projet Firebase |
|-------------|-----|-----------------|
| Main App | sos-expat.com | sos-urgently-ac307 |
| AI Tool | ia.sos-expat.com | outils-sos-expat |

**Communication:** Via Firebase Cloud Functions HTTP/Callable

### 67.2 Webhook ingestBooking

**Endpoint:**
```
POST https://europe-west1-outils-sos-expat.cloudfunctions.net/ingestBooking
```

**Authentification:**
- Header: `x-api-key: SOS_PLATFORM_API_KEY`
- Secret géré dans Google Cloud Secret Manager

**Payload:**
```json
{
  "title": "Titre demande",
  "description": "Description détaillée...",
  "clientFirstName": "Jean",
  "clientLastName": "Dupont",
  "clientEmail": "jean@example.com",
  "clientPhone": "+33612345678",
  "clientCurrentCountry": "Thaïlande",
  "clientNationality": "Française",
  "clientLanguages": ["fr", "en"],
  "providerId": "abc123",
  "providerName": "Maître Martin",
  "providerType": "lawyer",
  "serviceType": "lawyer_call"
}
```

### 67.3 Génération IA Automatique

**Trigger:** `onBookingRequestCreatedGenerateAi`
- **Type:** Trigger Firestore
- **Collection:** `booking_requests`
- **IA:** Anthropic Claude API
- **Modèle:** `claude-3-5-sonnet-20241022`

**Processus:**
1. Vérifie si provider dans compte multi-provider
2. Génère prompt contextuel dans langue client
3. Appelle API Anthropic (max 500 tokens, temp 0.7)
4. Stocke réponse dans document booking

**Stockage Réponse:**
```typescript
aiResponse: {
  content: string;           // Message généré
  generatedAt: Timestamp;
  model: "claude-3-5-sonnet-20241022";
  tokensUsed: number;
  source: "multi_dashboard_auto";
}
```

### 67.4 SSO vers Outil IA

**Cloud Function:** `generateMultiDashboardOutilToken`

**Flux SSO:**
1. Admin clique bouton "Outil IA" dans multi-dashboard
2. Frontend appelle Cloud Function avec sessionToken + providerId
3. Function valide et crée custom Firebase token
4. Retourne URL SSO: `https://ia.sos-expat.com/auth?token={customToken}`
5. Ouvre nouvel onglet → login automatique

**Claims Token:**
```typescript
{
  provider: true,
  providerType: "lawyer" | "expat",
  subscriptionTier: "unlimited",
  subscriptionStatus: "active",
  forcedAccess: true,
  multiDashboardAccess: true,
  email: "provider@email.com",
  tokenGeneratedAt: Date.now()
}
```

### 67.5 Synchronisation Abonnements

**Endpoint:**
```
POST https://europe-west1-outils-sos-expat.cloudfunctions.net/syncSubscription
```

**Données Synchronisées:**
- Statut abonnement (active, trialing, past_due, canceled)
- Nom plan et tarification
- Périodes abonnement
- Données intégration Stripe/paiement

### 67.6 Synchronisation Providers

**Endpoint:**
```
POST https://europe-west1-outils-sos-expat.cloudfunctions.net/syncProvider
```

**Données Synchronisées:**
- Informations contact
- Langues et spécialités
- Pays d'intervention
- Statut vérification

### 67.7 Flux Données Complet

```
┌────────────────────────────────────┐
│  SOS-EXPAT.COM                     │
│  Client crée booking request       │
└─────────────┬──────────────────────┘
              │ POST /ingestBooking
              │ x-api-key header
              ▼
┌────────────────────────────────────┐
│  FIREBASE CLOUD FUNCTIONS          │
│  (Projet outils-sos-expat)         │
│                                    │
│  1. ingestBooking endpoint         │
│     - Valide API key               │
│     - Crée document booking        │
└─────────────┬──────────────────────┘
              │ (Trigger Firestore)
              ▼
┌────────────────────────────────────┐
│  onBookingRequestCreatedGenerateAi │
│                                    │
│  1. Check multi-provider account   │
│  2. Appelle Anthropic Claude API   │
│  3. Stocke aiResponse              │
└─────────────┬──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│  IA.SOS-EXPAT.COM                  │
│  Affiche réponse auto-générée      │
│  Admin peut éditer                 │
└────────────────────────────────────┘
```

### 67.8 Configuration CORS

```typescript
cors: [
  "https://sos-expat.com",
  "https://www.sos-expat.com",
  "http://localhost:3000",
  "http://localhost:5173"
]
```

### 67.9 Cloud Functions Déployées

| Function | Type | But | Timeout |
|----------|------|-----|---------|
| `ingestBooking` | HTTP | Réception bookings | 30s |
| `onBookingRequestCreatedGenerateAi` | Trigger | Génération IA auto | 60s |
| `generateMultiDashboardOutilToken` | Callable | Tokens SSO | 30s |
| `syncSubscription` | HTTP | Sync abonnements | 30s |
| `syncProvider` | HTTP | Sync providers | 30s |
| `getMultiDashboardData` | Callable | Données dashboard | 60s |
| `getProviderConversations` | Callable | Conversations provider | 30s |
| `sendMultiDashboardMessage` | Callable | Envoi/réception messages | 60s |

### 67.10 Collections Firestore Outil IA

| Collection | Description |
|------------|-------------|
| `booking_requests` | Bookings depuis app principale |
| `conversations` | Discussions chat liées bookings |
| `messages` | Messages avec métadonnées IA |
| `sos_profiles` | Profils providers |
| `users` | Comptes avec liens multi-provider |
| `settings` | Config IA globale |
| `countryConfigs` | Configs légales par pays |

### 67.11 Intégration IA

**Modèles Utilisés:**
| Modèle | Provider | Usage |
|--------|----------|-------|
| Claude 3.5 Sonnet | Anthropic | Génération réponses auto |
| Perplexity | Perplexity | Recherches factuelles |

**Configuration IA:**
| Paramètre | Valeur |
|-----------|--------|
| Model | claude-3-5-sonnet-20241022 |
| Max tokens | 500 |
| Temperature | 0.7 |

**Structure Prompt:**
```
Tu es un assistant pour SOS-Expat...
Contexte:
- Nom client: [clientName]
- Pays actuel: [clientCountry]
- Type de service: [serviceType]
- Type de prestataire: [avocatOrAidant]
- Sujet: [title]

Instructions:
1. Salue le client par son nom
2. Confirme réception de sa demande
3. Explique les prochaines étapes
4. Rassure sur confidentialité
5. Réponds en [clientLanguage]
```

### 67.12 Secrets Requis

```bash
# AI Tool (Firebase Functions)
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set SOS_PLATFORM_API_KEY
firebase functions:secrets:set MULTI_DASHBOARD_PASSWORD
```

### 67.13 Configuration Environnement

| Paramètre | Valeur |
|-----------|--------|
| Firebase Project | outils-sos-expat |
| Region | europe-west1 |
| Hosting | ia.sos-expat.com |
| Functions URL | europe-west1-outils-sos-expat.cloudfunctions.net |

### 67.14 Fichiers Documentation

**Documentation:**
| Fichier | Contenu |
|---------|---------|
| `SETUP.md` | Guide setup complet |
| `README_GPT_SETUP.md` | Configuration IA |
| `INTEGRATION_LARAVEL.md` | Intégration app principale |
| `DEPLOIEMENT.md` | Checklist déploiement |
| `Dashboard_Multiprovider.md` | Architecture complète |
| `FIRESTORE_DATA_MODEL.md` | Schéma database |

### 67.15 Statistiques Intégration

| Métrique | Valeur |
|----------|--------|
| Cloud Functions | 8 |
| Collections Firestore Outil | 7 |
| Modèles IA | 2 |
| Endpoints HTTP | 4 |
| Endpoints Callable | 4 |
| Durée token SSO | 1 heure |
| Max tokens réponse | 500 |
| Temperature IA | 0.7 |

---

## 68. FONCTIONNALITÉS TEMPS RÉEL

### 68.1 Architecture Temps Réel Hybride

**Pas de WebSockets** - L'application utilise HTTP Long Polling via Firestore:
```typescript
// firebase.ts - Configuration
db = initializeFirestore(app, {
  experimentalForceLongPolling: true,        // Force HTTP au lieu WebSocket
  experimentalAutoDetectLongPolling: false,  // Désactive auto-détection
  useFetchStreams: false,                    // Désactive Fetch Streams
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: 50 * 1024 * 1024,        // 50MB cache
  }),
});
```

**Rationale:**
- Évite problèmes WebSocket avec proxies/antivirus/extensions
- Cache IndexedDB persistant réduit reads de 30-50%
- Support synchronisation multi-onglets

### 68.2 Déduplication Listeners

**Fichier:** `sos/src/services/subscription/subscriptionService.ts`

**Pattern:**
```typescript
interface CachedListener<T> {
  data: T | null;
  callbacks: Set<(data: T | null) => void>;
  unsubscribe: (() => void) | null;
  lastUpdate: number;
}

const listenerCache: Record<string, CachedListener<any>> = {};
```

**Avantages:**
- Composants multiples partagent UN listener
- Réduction reads Firestore ~80%
- Nettoyage automatique au unmount

### 68.3 Listeners Temps Réel Implémentés

| Listener | Fonction | Description |
|----------|----------|-------------|
| Subscription | `subscribeToSubscription()` | Changements statut abonnement |
| Plans | `subscribeToPlans()` | Mises à jour plans (partagé) |
| Trial Config | `subscribeToTrialConfig()` | Config essai global |
| AI Usage | `subscribeToAiUsage()` | Tracking quota IA temps réel |

### 68.4 Stratégie Polling (Optimisation Coûts)

**Polling au lieu de onSnapshot pour données non-critiques:**

| Composant | Intervalle | Économie |
|-----------|------------|----------|
| OnlineProvidersWidget | 30s | ~95% reads |
| DashboardMessages | 60s | Significative |
| Profile Cards | 60s | Coût optimisé |
| Finance Data | 60s | Coût optimisé |
| Tax Filing | 90s | Coût optimisé |
| IaAlertsEventsTab | 30s | Coût optimisé |
| DashboardReviews | 90s | Coût optimisé |

### 68.5 Hooks Temps Réel

**useSubscription:**
- Listener temps réel statut abonnement
- Chargement auto plans quand subscription change
- Cache plans TTL 5 minutes
- États: `isActive`, `isTrialing`, `isPastDue`, `isCanceled`

**useQuota:**
- Monitoring quota IA temps réel
- Refresh auto quand usage change
- Pattern déduplication listeners
- États: `currentUsage`, `limit`, `remaining`, `percentUsed`, `isExhausted`

**useAggregateRating:**
- Updates temps réel optionnels via onSnapshot
- Approche cache-first (TTL 5 min)
- Calcul distribution ratings

**useAutoSuspendRealtime:**
- **Suspension auto listeners après inactivité**
- Délai inactivité: 5 minutes
- Détection activité throttlée (max 1 appel/sec)
- Triggers: mousedown, mousemove, keydown, scroll, touchstart, click
- Support Document Visibility API
- **Économie: ~90% reads quand onglet ouvert mais inactif**

### 68.6 Push Notifications (FCM)

**Multi-Channel Notification System:**
| Canal | Provider | Usage |
|-------|----------|-------|
| Email | Zoho SMTP | Notifications formelles |
| SMS | Twilio | Alertes urgentes |
| Push | FCM | Notifications app |
| In-App | Firestore | Messages internes |

**Architecture Worker:**
```typescript
const channels: Channel[] = ["email", "sms", "push", "inapp"];
// Stratégie routage: parallèle ou fallback
```

### 68.7 Service Worker Notifications

**Fichier:** `sos/public/firebase-messaging-sw.js`

**Background Notifications:**
```javascript
messaging.onBackgroundMessage((payload) => {
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: payload.data?.tag || 'sos-notification',
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ]
  };
  return self.registration.showNotification(title, notificationOptions);
});
```

### 68.8 Service Worker Principal

**Fichier:** `sos/public/sw.js`

**Configuration Cache:**
```javascript
NETWORK_TIMEOUTS = {
  mobile: 5000,    // 5s mobile
  desktop: 6000,   // 6s desktop
  images: 10000,   // 10s images
  api: 8000        // 8s Firebase APIs
};

CACHE_CONFIG = {
  static: { maxAge: 7 jours, maxEntries: 30 },
  dynamic: { maxAge: 24 heures, maxEntries: 20 },
  images: { maxAge: 3 jours, maxEntries: 50 },
  api: { maxAge: 1 heure, maxEntries: 15 }
};
```

### 68.9 Cloud Functions Triggers

**Accounting Triggers:**
| Trigger | Événement | Action |
|---------|-----------|--------|
| `onPaymentCompleted` | Payment captured/succeeded/paid | Génère écritures comptables |
| `onRefundCreated` | Remboursement créé | Écriture comptable auto |

**Security Alerts Triggers:**
| Trigger | Événement | Action |
|---------|-----------|--------|
| `onSecurityAlertCreated` | Alerte créée | Notifications + escalade |
| `onSecurityAlertUpdated` | Alerte résolue | Annule escalade |

### 68.10 Service Notifications Frontend

**Fichier:** `sos/src/services/notifications/notificationService.ts`

```typescript
class NotificationService {
  showToast(notification: ToastNotification): string
  sendPushNotification(data: PushNotificationPayload): Promise<boolean>
  sendMultiChannelNotification(data: MultiChannelNotification): Promise<boolean>
  subscribe(listener: (notifications: NotificationData[]) => void): () => void
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  autoClose?: boolean;
}
```

### 68.11 Préférences Notifications

**Fonctionnalités:**
- **Notifications sonores** - Intervalles configurables
- **Notifications vocales** - Rappels vocaux périodiques
- **Rappels modal** - Popups quand idle
- **Config activité provider** - Timing centralisé

### 68.12 Stratégies Optimisation Coûts

| Stratégie | Réduction | Description |
|-----------|-----------|-------------|
| Déduplication Listeners | ~80% | Partage listeners entre composants |
| Polling Stratégique | Variable | Polling pour données non-critiques |
| Cache IndexedDB | 30-50% | Cache persistant 50MB |
| Cache Mémoire Plans | Variable | TTL 5 minutes |
| Cache LocalStorage | Variable | TTL 1 heure trial config |
| Suspension Inactivité | ~90% | Stop listeners quand inactif |
| Rate Limiting | Variable | Limites par utilisateur |
| Opérations Batch | Variable | writeBatch pour updates multiples |

### 68.13 Tableau Récapitulatif Temps Réel

| Feature | Type | Intervalle/Trigger | Stratégie Coût |
|---------|------|-------------------|----------------|
| Subscription Updates | onSnapshot | Temps réel | Déduplication |
| Plan Updates | onSnapshot | Temps réel | Déduplication |
| AI Quota Usage | onSnapshot | Temps réel | Déduplication |
| Online Providers | Polling | 30s | Polling |
| Messages | Polling | 60s | Polling |
| Ratings | onSnapshot optionnel | Temps réel | Cache + Optionnel |
| Security Alerts | Trigger Firestore | Event-driven | Automatique |
| Accounting Events | Trigger Firestore | Event-driven | Automatique |
| Push Notifications | FCM Background | Event-driven | FCM dedup |
| Inactivity Suspension | Hook | 5min idle | 90% réduction |

### 68.14 Statistiques Temps Réel

| Métrique | Valeur |
|----------|--------|
| Canaux notifications | 4 (email, sms, push, inapp) |
| Listeners temps réel | 4 |
| Composants polling | 7 |
| Timeout réseau mobile | 5s |
| Timeout réseau desktop | 6s |
| Cache IndexedDB | 50MB |
| TTL cache plans | 5 minutes |
| Délai suspension inactivité | 5 minutes |
| Réduction reads déduplication | ~80% |
| Réduction reads inactivité | ~90% |

---

## 69. SYSTÈME QUOTE/BOOKING REQUEST COMPLET

### 69.1 Vue d'Ensemble

Le système de Quote/Booking Request permet aux clients de demander des consultations avec des avocats ou aidants expatriés. Le flux complet implique les deux applications (SOS Expat et Outil IA SOS) avec synchronisation et génération automatique de réponses IA.

### 69.2 Architecture du Flux

```
CLIENT (SOS Expat)                    BACKEND (SOS)                    OUTIL IA SOS
     │                                     │                                 │
     │  1. Remplir formulaire              │                                 │
     ├────────────────────────────────────►│                                 │
     │                                     │                                 │
     │  2. Créer booking_request           │                                 │
     │     → Firestore                     │                                 │
     │                                     │                                 │
     │  3. Paiement Stripe                 │                                 │
     ├────────────────────────────────────►│                                 │
     │                                     │                                 │
     │                                     │  4. sendPaymentNotifications()  │
     │                                     │     → syncCallSessionToOutil()  │
     │                                     ├────────────────────────────────►│
     │                                     │     webhook: ingestBooking      │
     │                                     │                                 │
     │                                     │                                 │  5. Créer booking
     │                                     │                                 │     dans Firestore
     │                                     │                                 │
     │                                     │                                 │  6. aiOnBookingCreated
     │                                     │                                 │     → Claude/GPT-4o
     │                                     │                                 │
     │                                     │                                 │  7. Créer conversation
     │                                     │                                 │     + messages
     │                                     │                                 │
     │  8. Provider reçoit notification    │                                 │
     │     et accède à l'outil IA          │                                 │
     │◄───────────────────────────────────────────────────────────────────────┤
```

### 69.3 Formulaire Client (BookingRequest.tsx)

**Fichier:** `sos/src/pages/BookingRequest.tsx` (~1800 lignes)

**Caractéristiques:**
- **Multi-step wizard** - 4 étapes sur mobile, formulaire continu sur desktop
- **Validation React Hook Form** - Validation en temps réel
- **Multi-langue** - 9 langues supportées (fr, en, es, de, ar, ch, pt, it, hi)
- **Prix dynamiques** - Chargement depuis pricingService

**Étapes du Wizard Mobile:**
1. **Personal** - Prénom, nom, nationalité, pays d'intervention
2. **Request** - Titre (min 10 chars), description (min 50 chars)
3. **Languages** - Sélection langues communes avec provider
4. **Contact** - Téléphone, WhatsApp (optionnel), CGU

**Interface FormValues:**
```typescript
interface BookingRequestData {
  clientPhone: string;
  clientFirstName: string;
  clientLastName: string;
  clientNationality: string;
  clientCurrentCountry: string;
  providerId: string;
  providerName: string;
  providerType: "lawyer" | "expat";
  providerCountry: string;
  providerAvatar: string;
  providerRating?: number;
  providerReviewCount?: number;
  providerLanguages?: string[];
  providerSpecialties?: string[];
  title: string;
  description: string;
  languages: MultiLanguageOption[];
  clientWhatsapp?: string;
  accept: boolean;
  otherCountry?: string;
}
```

**Validation Rules:**
- firstName: requis
- lastName: requis
- title: minimum 10 caractères
- description: minimum 50 caractères
- nationality: requis
- currentCountry: requis
- languages: au moins 1 langue en commun avec provider
- phone: validation internationale libphonenumber-js
- accept: CGU obligatoire

### 69.4 Service Booking (booking.ts)

**Fichier:** `sos/src/services/booking.ts`

```typescript
export type BookingRequestMinimal = {
  providerId: string;
  serviceType: string;  // "lawyer_call" | "expat_call"
  status?: "pending";
};

export type BookingRequestOptional = {
  title?: string;
  description?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  price?: number;
  duration?: number;
  clientLanguages?: string[];
  clientLanguagesDetails?: Array<{ code: string; name: string }>;
  providerName?: string;
  providerType?: string;
  providerCountry?: string;
  providerAvatar?: string;
  providerRating?: number;
  providerReviewCount?: number;
  providerLanguages?: string[];
  providerSpecialties?: string[];
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientNationality?: string;
  clientCurrentCountry?: string;
  ip?: string;
  userAgent?: string;
  providerEmail?: string;
  providerPhone?: string;
  // Meta CAPI tracking
  metaEventId?: string;
  fbp?: string;
  fbc?: string;
  clientEmail?: string;
};

export async function createBookingRequest(data: BookingRequestCreate) {
  // Validation utilisateur connecté
  const u = auth.currentUser;
  if (!u) throw new Error("SESSION_EXPIRED");

  // Validation champs requis
  if (!providerId || !serviceType) throw new Error("INVALID_DATA");

  // Payload avec clientId = auth.uid, status = "pending"
  const payload = { clientId: u.uid, status: "pending", ...data };

  // Timeout 30 secondes pour éviter blocage
  await withTimeout(
    addDoc(collection(db, "booking_requests"), payload),
    30000,
    "NETWORK_TIMEOUT"
  );
}
```

### 69.5 Synchronisation vers Outil (syncBookingsToOutil.ts)

**Fichier:** `sos/firebase/functions/src/triggers/syncBookingsToOutil.ts`

**Important:** Le sync se fait APRÈS paiement validé (pas à la création)

**Endpoint cible:** `https://europe-west1-outils-sos-expat.cloudfunctions.net/ingestBooking`

**Payload OutilBookingPayload:**
```typescript
interface OutilBookingPayload {
  // Client
  clientFirstName?: string;
  clientLastName?: string;
  clientName?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];

  // Request
  title?: string;
  description?: string;
  serviceType?: string;
  priority?: string;

  // Provider
  providerId: string;
  providerType?: string;
  providerName?: string;
  providerCountry?: string;

  // Source tracking
  source: "sos-expat-app";
  externalId: string;  // booking_request ID
  metadata?: Record<string, unknown>;
}
```

**Retry Mechanism:**
- **Max retries:** 3
- **Backoff exponentiel:** 5, 10, 20 minutes
- **Scheduled job:** 1×/jour à 8h Paris
- **Collection retry:** `outil_sync_retry_queue`

### 69.6 Webhook ingestBooking (Outil)

**Fichier:** `Outil-sos-expat/functions/src/index.ts`

**Configuration:**
```typescript
export const ingestBooking = onRequest({
  region: "europe-west1",
  cors: CORS_CONFIG,
  secrets: [SOS_PLATFORM_API_KEY],
  timeoutSeconds: 60,
  memory: "512MiB",
  maxInstances: 20,
});
```

**Validations:**
1. Security checks (headers, content-type, payload size)
2. Méthode POST uniquement
3. API Key via header `x-api-key`
4. Rate limiting par IP
5. Validation payload avec Zod schema
6. Vérification abonnement provider

**Réponse:**
```json
{
  "ok": true,
  "bookingId": "abc123xyz"
}
```

### 69.7 Trigger AI (aiOnBookingCreated)

**Fichier:** `Outil-sos-expat/functions/src/ai/handlers/bookingCreated.ts`

**Configuration:**
```typescript
export const aiOnBookingCreated = onDocumentCreated({
  document: "bookings/{bookingId}",
  region: "europe-west1",
  secrets: AI_SECRETS,
  memory: "512MiB",
  timeoutSeconds: 120,
  maxInstances: 20,
  minInstances: 0,  // Cold start ~3-10s
});
```

**Étapes de Traitement (11 steps):**

1. **Trigger fired** - Détection nouveau document
2. **Booking data received** - Extraction données
3. **Check AI settings** - Vérification enabled + replyOnBookingCreated
4. **Check providerId** - Validation présence
5. **Check provider AI status** - Accès + quota
6. **Access check** - forcedAIAccess, freeTrialUntil, subscriptionStatus
7. **Quota check** - aiCallsUsed vs aiCallsLimit
8. **Build AI context** - providerType, language, country, clientName
9. **Call AI service** - Claude (lawyers) ou GPT-4o (expats)
10. **Create conversation** - Batch write Firestore
11. **SUCCESS** - Booking marqué aiProcessed: true

**Structure Conversation Créée:**
```typescript
// Conversation document
{
  bookingId: string;
  providerId: string;
  providerType: string;
  status: "active";
  clientName: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessageAt: Timestamp;
  messagesCount: 2;
  bookingContext: {
    clientName: string;
    country: string;
    nationality?: string;
    title?: string;
    description?: string;
    category?: string;
    urgency?: string;
    specialties?: string[];
  };
}

// Messages subcollection
// Message 1: User (booking context)
{
  role: "user";
  source: "system";
  content: string;  // buildBookingMessage()
  createdAt: Timestamp;
  order: 1;
}

// Message 2: Assistant (AI response)
{
  role: "assistant";
  source: "claude" | "gpt";
  content: string;
  model: string;
  provider: string;
  searchPerformed: boolean;
  citations?: string[];
  fallbackUsed: boolean;
  createdAt: Timestamp;
  order: 2;
}
```

### 69.8 Trigger AI Multi-Provider (onBookingRequestCreatedGenerateAi)

**Fichier:** `Outil-sos-expat/functions/src/multiDashboard/onBookingCreatedGenerateAi.ts`

**Spécificité:** Génère une réponse "welcome" pour les multi-provider accounts

```typescript
export const onBookingRequestCreatedGenerateAi = onDocumentCreated({
  document: "booking_requests/{bookingId}",
  region: "europe-west1",
  secrets: [ANTHROPIC_API_KEY],
  memory: "512MiB",
  timeoutSeconds: 60,
  maxInstances: 10,
});
```

**Check Multi-Provider:**
```typescript
async function checkIfMultiProvider(providerId: string): Promise<boolean> {
  const usersQuery = await db
    .collection("users")
    .where("linkedProviderIds", "array-contains", providerId)
    .limit(1)
    .get();
  return !usersQuery.empty;
}
```

**Prompt Welcome Response:**
- Salue le client par son nom
- Confirme réception de la demande
- Explique les prochaines étapes
- Rassure sur la confidentialité
- Langue adaptée aux clientLanguages

### 69.9 BookingRequestCard (Multi-Provider Dashboard)

**Fichier:** `sos/src/pages/MultiProviderDashboard/BookingRequestCard.tsx`

**Fonctionnalités:**
- Affiche détails booking avec réponse IA
- Badge "NOUVEAU" pour < 5 minutes
- Status badges (pending, confirmed, in_progress, completed, cancelled)
- Temps relatif formaté
- Bouton "Ouvrir la Conversation" → Outil IA SSO
- Bouton "Chat" → Chat inline rapide
- Section expandable pour tous les détails

**Interface BookingRequestWithAI:**
```typescript
interface BookingRequestWithAI {
  id: string;
  providerId: string;
  providerName?: string;
  providerType?: 'lawyer' | 'expat';
  clientId: string;
  clientName: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];
  serviceType: string;
  title?: string;
  description?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt?: Date;
  aiResponse?: AiResponse;
  aiProcessedAt?: Date;
  aiError?: string;
}

interface AiResponse {
  content: string;
  generatedAt: Date;
  model: string;
  tokensUsed?: number;
  source: 'multi_dashboard_auto' | 'manual';
}
```

### 69.10 Tracking Analytics

**Meta CAPI Tracking:**
```typescript
// Dans BookingRequest.tsx
trackMetaLead(metaEventId, { email, phone, firstName, lastName });
trackMetaInitiateCheckout(metaEventId, { value, currency, providerId });

// Identifiants CAPI
const { metaEventId, fbp, fbc } = getMetaIdentifiers();
```

**Google Ads Tracking:**
```typescript
trackGoogleAdsLead(eventId, { value, currency });
trackGoogleAdsBeginCheckout(eventId, { value, currency });
```

**Attribution Service:**
```typescript
trackAdLead(providerId, serviceType);
trackAdInitiateCheckout(providerId, serviceType, price);
```

### 69.11 Gestion Erreurs

**Erreurs Client (booking.ts):**
- `SESSION_EXPIRED` - Utilisateur non connecté
- `INVALID_DATA` - providerId ou serviceType manquant
- `NETWORK_TIMEOUT` - Timeout 30 secondes

**Erreurs Sync (syncBookingsToOutil.ts):**
- API key non configurée → retry queue
- HTTP errors → retry queue avec backoff
- Max retries atteint → status "failed"

**Erreurs AI (aiOnBookingCreated):**
- AI disabled → booking non traité
- No access → aiSkipped: true, aiSkippedReason
- Quota exceeded → notification provider
- AI error → aiError stored, notification provider

### 69.12 Tableau Récapitulatif Collections

| Collection | Application | Description |
|------------|-------------|-------------|
| booking_requests | SOS | Demandes initiales clients |
| bookings | Outil | Bookings synchronisés |
| conversations | Outil | Conversations IA générées |
| messages | Outil | Messages dans conversations |
| outil_sync_retry_queue | SOS | Queue retry sync échoués |

### 69.13 Statistiques Système Quote/Booking

| Métrique | Valeur |
|----------|--------|
| Langues formulaire | 9 |
| Étapes wizard mobile | 4 |
| Timeout création booking | 30s |
| Timeout AI trigger | 120s |
| Max instances ingestBooking | 20 |
| Max instances AI trigger | 20 |
| Retry max sync | 3 |
| Schedule retry | 1×/jour 8h |
| Min chars titre | 10 |
| Min chars description | 50 |

---

## 70. RÉFÉRENTIEL COMPLET DES API ROUTES

### 70.1 Vue d'Ensemble

Le système comprend **145+ endpoints** répartis entre Cloud Functions (Firebase), webhooks HTTP, et fonctions scheduled. Les APIs sont organisées en catégories fonctionnelles avec une architecture microservices.

**Structure:**
- **Frontend Client API:** `sos/src/api/` (wrappers client)
- **Backend Functions:** `sos/firebase/functions/src/` (Cloud Functions)
- **Région principale:** europe-west1

### 70.2 Endpoints de Gestion des Appels

| Fonction | Type | Config | Purpose |
|----------|------|--------|---------|
| executeCallTask | onRequest | 512MiB, 540s, 10 inst | Exécute tâches d'appel planifiées |
| setProviderAvailableTask | onRequest | 256MiB, 30s | Remet provider disponible après cooldown |
| createAndScheduleCall | onCall | - | Crée et planifie session d'appel |
| forceEndCallTask | onCall | - | Force fin d'appel actif |

**createAndScheduleCall Input:**
```typescript
{
  providerId: string;
  clientId: string;
  providerPhone: string;
  clientPhone: string;
  serviceType: 'lawyer_call' | 'expat_call';
  providerType: 'lawyer' | 'expat';
  paymentIntentId: string;
  amount: number;
  currency: 'EUR' | 'USD';
  clientLanguages: string[];
  providerLanguages: string[];
  clientWhatsapp?: string;
  bookingTitle: string;
  bookingDescription: string;
  clientCurrentCountry: string;
  clientFirstName: string;
  clientNationality: string;
}
```

### 70.3 Endpoints de Paiement Stripe

| Fonction | Type | Config | Purpose |
|----------|------|--------|---------|
| createPaymentIntent | onCall | - | Crée PaymentIntent Stripe |
| stripeWebhook | onRequest | 512MiB, 60s, minInst:1 | Traite webhooks Stripe |

**createPaymentIntent Limits:**
- MIN_EUR: 0.50 / MAX_EUR: 500 / MAX_DAILY_EUR: 2000
- MIN_USD: 0.50 / MAX_USD: 600 / MAX_DAILY_USD: 2400
- Rate limit: 6 requests / 10 minutes
- Duplicate check: 3 minutes window

**stripeWebhook Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.*`
- `transfer.created` / `transfer.paid`
- `payout.paid`

### 70.4 Endpoints Express Account (KYC)

| Fonction | Type | Purpose |
|----------|------|---------|
| createExpressAccount | onCall | Crée compte Stripe Express |
| getOnboardingLink | onCall | Génère lien onboarding |
| checkKycStatus | onCall | Vérifie statut KYC |
| createLawyerStripeAccount | onCall | Crée compte avocat |
| completeLawyerOnboarding | onCall | Complète onboarding avocat |
| createStripeAccount | onCall | Crée compte standard |
| getStripeAccountSession | onCall | Session compte Connect |
| checkStripeAccountStatus | onCall | Vérifie statut compliance |

### 70.5 Endpoints PayPal

| Fonction | Type | Purpose |
|----------|------|---------|
| createPayPalOnboardingLink | onCall | Lien onboarding marchand |
| checkPayPalMerchantStatus | onCall | Statut compte marchand |
| createPayPalOrderHttp | onRequest | Crée commande PayPal (HTTP) |
| capturePayPalOrderHttp | onRequest | Capture commande PayPal |
| paypalWebhook | onRequest | Webhooks PayPal |
| createPayPalPayout | onCall | Payout vers provider |
| checkPayPalPayoutStatus | onCall | Statut payout |
| sendPayPalVerificationCode | onCall | Code vérification email |
| verifyPayPalCode | onCall | Vérifie code PayPal |
| resendPayPalVerificationCode | onCall | Renvoie code |
| getRecommendedPaymentGateway | onCall | Recommande Stripe ou PayPal |

### 70.6 Endpoints Payout & Transfer

| Fonction | Type | Purpose |
|----------|------|---------|
| executePayoutRetryTask | Task | Retry payouts échoués |
| retryFailedPayout | onCall | Retry manuel payout |
| executeStripeTransferRetry | Task | Retry transfers Stripe |
| processPendingTransfersForProvider | onCall | Traite transfers différés |
| getPendingTransfersStats | onCall | Stats transfers pending |
| retryFailedTransfersForProvider | onCall | Retry transfers provider |
| processScheduledTransfers | Scheduled | Traitement planifié |

### 70.7 Endpoints Admin

| Fonction | Type | Purpose |
|----------|------|---------|
| adminUpdateStatus | onCall | Update statut user |
| adminSoftDeleteUser | onCall | Soft delete user |
| adminBulkUpdateStatus | onCall | Bulk update statuts |
| adminAddDisputeNote | onCall | Note interne dispute |
| adminAcknowledgeDispute | onCall | Accusé réception dispute |
| adminAssignDispute | onCall | Assigne dispute à admin |
| adminGetDisputeDetails | onCall | Détails dispute |

**Backup/Restore Admin:**

| Fonction | Purpose |
|----------|---------|
| adminCreateManualBackup | Backup manuel Firestore/Auth |
| adminListBackups | Liste backups disponibles |
| adminPreviewRestore | Preview restore |
| adminRestoreFirestore | Restore Firestore (+ code confirm) |
| adminRestoreAuth | Restore Auth (+ code confirm) |
| adminCheckRestoreStatus | Statut restore en cours |
| adminDeleteBackup | Supprime vieux backup |
| adminListGcpBackups | Liste backups GCP |
| adminGetRestoreConfirmationCode | Génère code confirmation |

### 70.8 Endpoints Subscription

| Fonction | Purpose |
|----------|---------|
| createSubscription | Crée abonnement |
| updateSubscription | Modifie abonnement |
| createStripePortalSession | Session portail Stripe |
| checkAiQuota | Vérifie quota IA |
| recordAiCall | Enregistre appel IA |
| processAiCall | Traite appel IA + charge |
| updateTrialConfig | Config période essai (admin) |
| updatePlanPricing | Prix plans (admin) |
| initializeSubscriptionPlans | Seed plans Firestore |
| setFreeAiAccess | Accès IA gratuit (admin) |
| createAnnualStripePrices | Prix annuels Stripe |
| createMonthlyStripePrices | Prix mensuels Stripe |
| migrateSubscriptionPlansTo9Languages | Migration 9 langues |

### 70.9 Endpoints Provider Earnings

| Fonction | Purpose |
|----------|---------|
| getProviderEarningsSummary | Résumé revenus |
| getProviderTransactions | Historique transactions |
| getProviderMonthlyStats | Stats mensuelles |
| getProviderPayoutHistory | Historique payouts |
| getProviderDashboard | Dashboard complet |
| adminGetProviderEarnings | Revenus provider (admin) |

### 70.10 Endpoints Tax & Compliance

| Fonction | Purpose |
|----------|---------|
| calculateTaxCallable | Calcul TVA/taxe |
| calculateTaxForTransaction | Taxe transaction |
| getTaxThresholdStatus | Statut seuil OSS |
| validateVat | Validation numéro TVA (VIES/HMRC) |
| checkReverseCharge | Éligibilité reverse charge |
| cleanupVatCache | Nettoyage cache TVA |

**Règles TVA:**
- EU OSS (One-Stop Shop) compliant
- VIES validation pour UE
- HMRC validation pour UK

### 70.11 Endpoints Provider Status

| Fonction | Purpose |
|----------|---------|
| setProviderOffline | Met provider offline |
| updateProviderActivity | Update activité |
| providerStatusManager | Gestion transitions statut |
| adminCleanupOrphanedProviders | Cleanup providers orphelins |
| adminCleanupOrphanedSessions | Cleanup sessions orphelines |

### 70.12 Fonctions Scheduled

| Fonction | Schedule | Purpose |
|----------|----------|---------|
| scheduledCleanup | Regular | Nettoyage général |
| scheduledKYCReminders | Configurable | Rappels KYC (D+1,7,30,90) |
| scheduledPayPalReminders | Configurable | Rappels PayPal |
| escrowMonitoringDaily | Daily | Monitoring escrow > 1000€ |
| scheduledProcessUnclaimedFunds | Configurable | Forfait 180 jours (CGV 8.6-8.9) |
| paymentDataCleanup | Regular | Cleanup locks, orders |
| stuckPaymentsRecovery | Regular | Recovery paiements bloqués |
| notificationRetry | Regular | Retry notifications |
| checkBudgetAlertsScheduled | Regular | Alertes budget (80%, 100%) |
| morningBackup | Daily | Backup Firestore |
| cleanupOldBackups | Regular | Suppression vieux backups |
| dailyCrossRegionBackup | Daily | DR cross-region |
| quarterlyRestoreTest | Quarterly | Test procédures restore |
| backupStorageToDR | Regular | Backup Storage vers DR |

### 70.13 Webhooks Twilio

| Fonction | Type | Purpose |
|----------|------|---------|
| unifiedWebhook | onRequest | Router principal Twilio |
| twilioCallWebhook | Handler | Events appel |
| twilioRecordingWebhook | Handler | Completion recording (GDPR disabled) |
| twilioConferenceWebhook | Handler | Events conférence |
| providerNoAnswerTwiML | HTTP | TwiML no-answer |

### 70.14 Triggers Firestore

| Fonction | Trigger | Purpose |
|----------|---------|---------|
| syncRoleClaims | Document write | Sync claims Firestore → Auth |
| userCleanupTrigger | Auth delete | Cleanup data user |
| onInvoiceRecordCreated | Document create | Traitement facture + lock |
| handleDisputeCreated | Stripe webhook | Création dispute |
| handleDisputeUpdated | Stripe webhook | Update dispute |
| handleDisputeClosed | Stripe webhook | Fermeture dispute |

### 70.15 Endpoints Debugging

| Fonction | Purpose |
|----------|---------|
| generateSystemDebugReport | Rapport santé système |
| getSystemHealthStatus | Statut santé actuel |
| getUltraDebugLogs | Logs debug détaillés |
| testCloudTasksConnection | Test connectivité Tasks |
| getCloudTasksQueueStats | Stats queue Cloud Tasks |
| manuallyTriggerCallExecution | Trigger manuel (test) |
| testWebhook | Endpoint test webhook |

### 70.16 Configuration Mémoire & Instances

| Config | Memory | Timeout | Min/Max Inst | Use Case |
|--------|--------|---------|--------------|----------|
| Emergency | 256MiB | - | 0/3 | La plupart des fonctions |
| Standard | 256-512MiB | - | 0/5-10 | Fonctions moyennes |
| Heavy | 512MiB + 1vCPU | 540s | 0/10 | executeCallTask |
| Webhook | 512MiB | 60s | 1/5 | stripeWebhook (warm) |

### 70.17 Authentification & Autorisation

**Admin Whitelist:**
- williamsjullin@gmail.com
- williamjullin@gmail.com
- julienvalentine1@gmail.com

**Vérification Admin:**
1. Custom claims Firebase Auth
2. Email whitelist
3. Fallback Firestore

**Secrets Management:**
- Firebase Secret Manager
- Aucun hardcoding
- Rotation supportée

### 70.18 Intégrations Externes

| Service | Usage |
|---------|-------|
| Stripe | Paiements, Express, disputes, transfers |
| PayPal | Commerce Platform, payouts, onboarding |
| Twilio | Appels, conférence, TwiML, webhooks |
| Firebase | Firestore, Auth, Functions, Tasks, Storage |
| Meta CAPI | Facebook Ads conversion tracking |
| VIES | Validation TVA EU |
| HMRC | Validation TVA UK |
| Google Cloud | Tasks, Backup, IAM |
| Outil-sos-expat | Sync sessions appel |
| Mailwizz | Email marketing |

### 70.19 Statistiques API Routes

| Métrique | Valeur |
|----------|--------|
| Total endpoints | 145+ |
| Callable Functions (onCall) | ~85 |
| HTTP Endpoints (onRequest) | ~15 |
| Scheduled Functions | ~25 |
| Trigger Functions | ~10 |
| Webhook Handlers | 5 |
| Admin Functions | 20+ |
| Payment Functions | 30+ |
| Subscription Functions | 15+ |
| Région déploiement | europe-west1 |

---

## 71. SYSTÈME D'INSCRIPTION ET ONBOARDING PARTENAIRES

### 71.1 Types de Partenaires

| Type | Tarif | Durée | Exigences |
|------|-------|-------|-----------|
| Lawyers (Avocats) | 49€ | 20 min | Année diplôme, numéro barreau, credentials |
| Expat Helpers | 25-30€ | 30 min | Preuve résidence 2+ ans |

### 71.2 Flux d'Inscription (RegisterLawyer.tsx)

**Route:** `/register/lawyer` ou `/register/expat`

**Informations Requises:**

```
IDENTITÉ DE BASE:
├── First Name (2-50 chars, Unicode)
├── Last Name (2-50 chars)
├── Email (format valide, unique)
├── Password (8-128 chars, min 6 Firebase)
└── Phone (format international libphonenumber-js)

DÉTAILS PROFESSIONNELS:
├── Current Country (Stripe-compatible ou PayPal-only)
├── Practice Countries (multi-select)
├── Specialties (multi-select)
├── Years of Experience (0-60)
├── Graduation Year (1980 - année courante)
├── Languages Spoken (multi-select)
└── Professional Bio (50-500 caractères)

MÉDIA:
├── Profile Photo (via ImageUploader)
└── Education/Credentials (multi-select)

PARAMÈTRES:
├── Preferred Language (9 langues)
└── Availability Status (available, busy, offline)

CONFORMITÉ:
├── Accept Terms & Conditions
└── Accept Payment Terms
```

### 71.3 Protection Anti-Bot

| Mesure | Description |
|--------|-------------|
| reCAPTCHA v3 | Invisible, score-based |
| Honeypot field | Champ piège détection bot |
| Time validation | Minimum 15 secondes pour remplir |
| Behavior tracking | Mouse movements, keystrokes |
| Browser fingerprinting | Metadata sécurité |

### 71.4 Validation des Entrées

```typescript
// Sanitization functions
sanitizeStringFinal()  // Trim + XSS removal
sanitizeEmail()        // Lowercase + trim
sanitizeName()         // Preserve accents, allow spaces

// Validation rules
Email: RFC-compliant regex
Names: Unicode regex (tous alphabets)
Phone: International format checking
Password: 8-128 character range
```

### 71.5 Structure Données Utilisateur

```typescript
{
  role: "lawyer" | "expat",
  type: "lawyer" | "expat",
  email: string,
  fullName: string,
  firstName: string,
  lastName: string,
  phone: string,
  currentCountry: string,
  practiceCountries: string[],
  profilePhoto: string,
  languages: string[],
  specialties: string[],
  education: string,           // comma-separated
  yearsOfExperience: number,   // 0-60
  graduationYear: number,      // 1980-current
  bio: string,
  availability: "available" | "busy" | "offline",

  // Status flags
  isOnline: false,
  isApproved: false,
  isVisible: false,
  isActive: true,
  approvalStatus: "pending",
  verificationStatus: "pending",
  status: "pending",
  rating: 4.5,
  reviewCount: 0,

  // Security metadata
  _securityMeta: {
    recaptchaToken: string,
    formFillTime: number,
    mouseMovements: number,
    keystrokes: number,
    userAgent: string,
    timestamp: number
  },

  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 71.6 Détection Payment Gateway par Pays

**Stripe Supported (44 pays):**
- US, CA
- 32 pays européens (FR, DE, UK, IT, ES, etc.)
- AU, NZ, SG, HK, JP, IN, BR, MX

**PayPal Only (151 pays):**
- Afrique (54 pays)
- Asie (35 pays hors Stripe)
- Amérique Centrale/Sud (25 pays)
- Europe Est & Balkans (14 pays)
- Îles Pacifique (15 pays)

### 71.7 Configuration Stripe Connect

**Fichier:** `firebase/functions/src/createStripeAccount.ts`

```typescript
// Trigger: After Firebase auth registration

async function createStripeAccount(data) {
  // 1. Validate country support
  if (!STRIPE_SUPPORTED_COUNTRIES.includes(country)) {
    throw new Error("PayPal-only country");
  }

  // 2. Create Stripe Express account
  const account = await stripe.accounts.create({
    type: "express",
    country: countryCode,
    email: partnerEmail,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    }
  });

  // 3. Update Firestore collections
  // lawyers, expats, sos_profiles, users
  await updateAllCollections({
    stripeAccountId: account.id,
    stripeMode: "test" | "live",
    kycStatus: "not_started",
    stripeOnboardingComplete: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    paymentGateway: "stripe"
  });
}
```

### 71.8 Onboarding PayPal

**Fichier:** `sos/src/components/provider/PayPalOnboarding.tsx`

**Phase 1: Email Entry**
- Validation format email
- Minimum 60 secondes entre requêtes
- Maximum 5 codes par heure

**Phase 2: Code Generation**
```typescript
// Cloud Function: sendPayPalVerificationCode
{
  code: "6-digit",
  validity: "10 minutes",
  delivery: "nodemailer/Zoho SMTP",
  templates: "FR, EN, ES multi-langue"
}
```

**Phase 3: Code Verification**
- Auto-focus champ suivant
- Auto-submit quand complet
- Maximum 3 tentatives
- Messages erreur détaillés

**On Success:**
```typescript
{
  paypalEmail: string,
  paypalEmailVerified: true,
  paypalEmailVerifiedAt: Timestamp,
  paypalAccountStatus: "active",
  paypalOnboardingComplete: true,
  paypalPaymentsReceivable: true,
  isVisible: true  // Auto-visible pour PayPal
}
```

### 71.9 Rate Limiting PayPal

| Limite | Valeur |
|--------|--------|
| Cooldown entre envois | 60 secondes |
| Max codes par heure | 5 |
| Max tentatives par code | 3 |
| Validité code | 10 minutes |

### 71.10 Flux d'Approbation

**Statut Initial (après inscription):**
```
isApproved: false
isVisible: false
approvalStatus: "pending"
verificationStatus: "pending"
status: "pending"
```

**Après KYC Stripe:**
```
kycStatus: "verified"
chargesEnabled: true
payoutsEnabled: true
// Manual approval still needed
```

**Après Vérification PayPal:**
```
paypalEmailVerified: true
paypalOnboardingComplete: true
isVisible: true  // Automatiquement visible
// Manual approval may still be needed
```

### 71.11 Interface Admin KYC

**Page:** `/admin/kyc/providers`

**Filtres:**
- KYC Status (pending, approved, rejected, incomplete)
- Service Type (lawyer, expat)
- Country
- Date Range
- Document Type

**Documents Vérifiés:**
- Identity document
- Proof of address
- Professional document (diplômes, barreau)
- Bank statement (si applicable)

**Actions Admin:**
- Approve → isApproved=true, isVisible=true
- Reject → avec raison
- Request changes → champs spécifiques
- Add notes

### 71.12 Checklist Approbation

**Avant Visibilité:**
- ☐ Email vérifié (Firebase)
- ☐ Tous champs requis complétés
- ☐ Photo profil acceptable
- ☐ Bio acceptable (50-500 chars)
- ☐ Payment gateway configuré
- ☐ Terms acceptés

**Pour Activation Complète:**
- ☐ Stripe: KYC completed, charges/payouts enabled
- ☐ OU PayPal: Email verified

**Pour Visibilité Marketplace:**
- ☐ Admin approval (manual)
- ☐ isApproved: true
- ☐ isVisible: true
- ☐ Aucune suspension

### 71.13 Collections Firestore

```
/lawyers/{userId}
├── Profile complet partenaire avocat
├── Payment gateway info
├── KYC status
└── Visibility flags

/expats/{userId}
└── Structure similaire lawyers

/sos_profiles/{userId}
├── Données profil agrégées
├── Payment gateway info
└── KYC status

/users/{userId}
├── Auth metadata
├── Basic profile info
└── Account status

/paypal_verification_codes/{codeId}
├── userId, email
├── code, attempts
├── verified, expiresAt
└── createdAt, verifiedAt, invalidatedAt

/paypal_verification_logs/{logId}
├── userId, email
├── action, success, reason
└── timestamp
```

### 71.14 Fichiers Principaux

| Fichier | Rôle |
|---------|------|
| RegisterLawyer.tsx | Inscription avocats (31KB) |
| RegisterExpat.tsx | Inscription aidants |
| PayPalOnboarding.tsx | Flux PayPal |
| KYCReturn.tsx | Handler retour Stripe |
| AdminKYCProviders.tsx | Review admin KYC |
| createStripeAccount.ts | Setup Stripe |
| checkStripeAccountStatus.ts | Statut Stripe |
| emailVerification.ts | Vérification PayPal |
| PayPalManager.ts | Gestion PayPal |

### 71.15 Sécurité & Conformité

| Aspect | Implémentation |
|--------|----------------|
| Passwords | Firebase Auth (bcrypt) |
| Email verification | 6-digit, 10-min expiry |
| Anti-bot | reCAPTCHA v3 + behavior |
| XSS prevention | Input sanitization |
| Rate limiting | Per-user, per-IP |
| Audit logging | All KYC actions logged |
| PII masking | Email masked in logs |
| GDPR | Deletable via admin |

### 71.16 Statistiques Onboarding

| Métrique | Valeur |
|----------|--------|
| Pays Stripe supportés | 44 |
| Pays PayPal only | 151 |
| Langues formulaire | 9 |
| Champs profil | 147 (interface Provider) |
| Min bio | 50 caractères |
| Max bio | 500 caractères |
| Experience max | 60 ans |
| Graduation year min | 1980 |
| Code PayPal digits | 6 |
| Code validity | 10 minutes |

---

## 72. BIBLIOTHÈQUE COMPOSANTS UI COMPLÈTE

### 72.1 Vue d'Ensemble

La bibliothèque comprend **122 fichiers composants** utilisant:
- **Tailwind CSS** pour le styling
- **Lucide React** pour les icônes
- **React Intl** pour l'internationalisation
- **React Select** pour les selects avancés
- **TypeScript** pour la sécurité des types

### 72.2 Composants Core Common

#### Button Component

**Fichier:** `components/common/Button.tsx`

**Variants:**
| Variant | Style |
|---------|-------|
| primary | Red background (#dc2626), white text |
| secondary | Gray background, white text |
| outline | Transparent with red border |
| ghost | Transparent, red text |

**Sizes:**
| Size | Mobile | Desktop |
|------|--------|---------|
| small | 36px | 32px |
| medium | 44px | 40px (DEFAULT) |
| large | 52px | 48px |

**Props:**
- `loading?: boolean` - Spinner with loading state
- `fullWidth?: boolean` - 100% width
- `disabled?: boolean` - Disabled state
- Accessibility: `aria-label`, `aria-describedby`, `aria-busy`

#### Modal Component

**Fichier:** `components/common/Modal.tsx`

**Sizes:**
- `small` - max-width: 448px
- `medium` - max-width: 672px (DEFAULT)
- `large` - max-width: 896px

**Features:**
- Focus trap and restoration
- Escape key handling
- Click-outside-to-close
- Prevents body scroll
- Max height 90vh scrollable

#### Loading Spinner

**Sizes:** small (16px), medium (32px), large (48px)
**Colors:** red, blue, green, white, gray

### 72.3 Composants Banner & Alert

| Component | Purpose |
|-----------|---------|
| TopAnnouncementBanner | Red gradient, quick actions, dismissible 30 days |
| ProfileStatusAlert | Pending (orange), Rejected (red), Approved (null) |
| ExtensionBlockedAlert | Dark gradient, 4-step guide, dismissible |
| CookieBanner | GDPR compliant, 4 categories, 9 langues |

**Cookie Categories:**
- `essential` - Toujours activé (GDPR)
- `analytics` - GA4, GTM consent
- `performance` - Performance tracking
- `marketing` - Meta Pixel, Google Ads

### 72.4 Composants Image & Media

#### ImageUploader

**Features:**
- Drag-and-drop + click upload
- Progress indicator (%)
- Camera/mobile support
- Formats: JPG, PNG, WEBP, GIF, HEIC, BMP, TIFF, AVIF
- Max file size validation
- Firebase Storage integration
- Preview before upload
- I18n (9 langues)

#### ImageCropModal

**Features:**
- Drag to reposition
- Zoom controls
- 90° rotation
- Live preview
- Quality/size indicator
- 9 langues support

#### OptimizedImage

**Props:**
- `loading?: 'lazy' | 'eager'`
- `fetchPriority?: 'high' | 'low' | 'auto'`
- `aspectRatio?: string` - CLS prevention
- `sources?: ImageSource[]` - WebP, AVIF
- `srcSet?: string` - Responsive
- `fallbackSrc?: string`

### 72.5 Composants Form & Input

#### IntlPhoneInput

**Features:**
- International phone support
- Country code detection
- libphonenumber-js validation
- Preferred countries: FR, US, GB, DE, ES, IT, BE, CH, CA, AU
- Multi-language country names

#### MultiLanguageSelect

**Features:**
- React-Select based
- Multi-select with custom styling
- Searchable language list
- Highlight shared languages
- Keyboard navigation

#### Autres Form Components

| Component | Purpose |
|-----------|---------|
| CountrySelect | Multi-select with flags |
| SpecialtySelect | Professional specialties |
| NationalitySelect | Countries as nationalities |
| ExpatHelpSelect | Help categories |
| WhatsAppInput | WhatsApp-specific validation |

### 72.6 Composants Dashboard

| Component | Purpose |
|-----------|---------|
| DashboardStats | Stat cards with trends, gradients, counters |
| DashboardMessages | Inbox/list view, status indicators |
| QuickActions | Action button grid |
| RecentActivity | Activity timeline |
| UserInvoices | Invoice list, download, filters |
| ProviderEarnings | Earnings summary, graphs |
| KYCBannerCompact | KYC status compact |
| AvailabilityToggle | Provider on/off toggle |

**StatCard Props:**
```typescript
{
  icon: ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  gradient: string;
  iconBg: string;
  loading?: boolean;
}
```

### 72.7 Composants Admin Finance

#### KPICard

**Color Themes:** blue, green, red, purple, amber, cyan, default

**Props:**
- `title`, `value`, `icon`
- `percentChange` - YoY/period change
- `currency`, `isCurrency`, `suffix`
- `isLoading` - Skeleton state
- `onClick` - Drill-down handler

#### StatusBadge

**Status Types:**
| Status | Color |
|--------|-------|
| success / paid / active | Green |
| warning / pending | Amber / Gray |
| error / failed | Red |
| info / refunded | Blue |
| processing / live | Blue/Red with pulse |
| cancelled / inactive | Gray |

**Sizes:** sm (8px), md (10px), lg (12px)

#### CurrencyAmount

**Display Styles:** symbol, code, name
**Features:** Color coding (green positive, red negative), localization

#### PaymentMethodIcon

**Methods:** stripe, paypal, visa, mastercard, amex, card, bank_transfer, sepa, unknown
**Sizes:** sm (16px), md (20px), lg (24px)

#### TransactionRow

**Features:**
- Expandable row
- Selection checkbox
- Actions dropdown menu
- Amount, status, payment method display
- Loading skeleton

### 72.8 Composants Subscription

#### SubscriptionCard

**Tiers:**
| Tier | Icon | Gradient |
|------|------|----------|
| trial | Sparkles | gray |
| basic | Zap | blue |
| standard | Zap | indigo |
| pro | Crown | purple |
| unlimited | Infinity | amber-orange |

**Status:** trialing (blue), active (green), past_due (red), canceled (gray), expired (gray), paused (yellow)

#### QuotaUsageBar

**States:**
| State | Condition | Color |
|-------|-----------|-------|
| available | < 80% | Green |
| nearLimit | ≥ 80% | Orange |
| exhausted | 100% | Red |
| unlimited | -1 limit | Amber |

**Features:** Animated progress bar, percentage calculation, upgrade prompt

### 72.9 Composants Feedback

| Component | Features |
|-----------|----------|
| FeedbackModal | Mobile slide-up, desktop centered, device detection |
| FeedbackForm | Issue type, priority, description, screenshot |
| FeedbackButton | Floating action, opens modal |

### 72.10 Composants Layout

| Component | Features |
|-----------|----------|
| DashboardLayout | Sidebar, top nav, mobile bottom nav, breadcrumbs |
| Header | Logo, nav menu, language selector, user menu |
| Footer | Links, language selector, social, copyright |
| Layout | Header + Content + Footer wrapper |
| MobileBottomNav | Fixed bottom, 4-5 items, 44px touch |
| MobileSideDrawer | Sliding drawer, overlay backdrop |

### 72.11 UI Primitives (Headless)

#### Card Component

**Subcomponents:**
- `Card` - Main container
- `CardHeader` - Header with border
- `CardTitle` - Semantic h1-h4
- `CardDescription` - Secondary text
- `CardContent` - Main content
- `CardFooter` - Footer with border

#### Badge Component

**Variants:** default (gray), outline (border), destructive (red)

#### Tabs Component

**Features:** Stateful, keyboard navigation (arrow keys), role="tab"/"tabpanel"

### 72.12 Composants Home Page

| Component | Purpose |
|-----------|---------|
| HeroSection | Full-width banner, CTA, headline |
| CTASection | Call-to-action emphasis |
| ServicesSection | Service grid/cards |
| HowItWorksSection | Step-by-step process |
| TestimonialsSection | Testimonials, ratings, carousel |
| ModernProfileCard | Provider showcase, badges |
| ProfileCarousel | Multiple profiles, touch/swipe |

### 72.13 Composants PWA

#### InstallBanner

**Features:**
- Android: beforeinstallprompt handling
- iOS: Manual install instructions
- Desktop: PWA prompt
- Smart timing: 3 page views or 30s engagement
- Dismissal tracking (7 days, "not now" 30 days)
- Safe area support for notched devices

### 72.14 Design System Constants

**Color Palette:**
| Role | Color |
|------|-------|
| Primary | Red #dc2626, #991b1b |
| Success | Green #22c55e, #16a34a |
| Warning | Amber #f59e0b, #d97706 |
| Error | Red #ef4444, #dc2626 |
| Info | Blue #3b82f6, #2563eb |

**Responsive Breakpoints:**
| Breakpoint | Width |
|------------|-------|
| Mobile (default) | < 640px |
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |

**Accessibility:**
- ARIA labels throughout
- Keyboard navigation
- Focus rings/indicators
- Color contrast compliance
- Semantic HTML

### 72.15 Organisation des Composants

| Catégorie | Fichiers | Description |
|-----------|----------|-------------|
| Common | 16 | Button, Modal, Spinner, Alerts |
| Forms Data | 11 | Phone, Country, Language selects |
| Dashboard | 10 | Stats, Messages, Activity |
| Admin Finance | 14 | KPI, Status, Currency, Transactions |
| Subscription | 3 | Plans, Pricing, Quota |
| Feedback | 4 | Modal, Form, Button |
| Layout | 5 | Header, Footer, Dashboard |
| Home | 7 | Sections, Cards, Carousel |
| UI Primitives | 5 | Card, Badge, Button, Tabs |
| Auth | 3 | Forms, Protected routes |
| Payment | 3 | Payment forms, Gateways |
| Provider | 2 | Provider-specific |
| Admin | 36 | Dashboard, Modals, Widgets |

### 72.16 Statistiques UI Library

| Métrique | Valeur |
|----------|--------|
| Total fichiers composants | 122 |
| Composants Common | 16 |
| Composants Admin | 36 |
| Composants Forms | 11 |
| Langues supportées | 9 |
| Touch target minimum | 44px |
| Breakpoints responsive | 5 |

---

## 73. PATTERNS DE FETCHING DE DONNÉES

### 73.1 Vue d'Ensemble Architecture

L'application utilise une **architecture client-heavy React + Firebase** sans Server-Side Rendering (SSR). Toutes les pages sont des composants client avec fetching dans les hooks React.

| Aspect | Implémentation |
|--------|----------------|
| Architecture | Client-heavy React + Firebase |
| Base de données | Firestore avec cache persistant |
| Backend | Cloud Functions (Node.js) |
| Real-time | onSnapshot avec déduplication |
| Authentification | Firebase Auth + custom claims |
| Paiements | Stripe + PayPal via Cloud Functions |
| Caching | Multi-layer (IndexedDB + localStorage + mémoire) |
| Offline | Firestore persistent cache (offline-first) |

### 73.2 Configuration Firestore

**Fichier:** `src/config/firebase.ts`

```typescript
export const db: Firestore = initializeFirestore(app, {
  // Long Polling pour bypass antivirus/extensions
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  useFetchStreams: false,

  // Cache persistant IndexedDB
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: 50 * 1024 * 1024,  // 50MB
  }),
});
```

**Caractéristiques:**
- Long Polling HTTP (bypass WebSocket blocks)
- Cache IndexedDB 50MB
- Multi-tab support
- Réduction reads 15-20%
- Recovery auto corruption cache

### 73.3 Pattern Real-time Listeners (onSnapshot)

**Use Cases:**
- User Subscriptions (`useSubscription.ts`)
- Profiles & Availability (`useMultiProviderDashboard.ts`)
- Booking Requests (real-time updates)
- Chat Conversations (messaging)

**Listener Deduplication Pattern:**
```typescript
interface CachedListener<T> {
  data: T | null;
  callbacks: Set<(data: T | null) => void>;
  unsubscribe: (() => void) | null;
  lastUpdate: number;
}

function subscribeWithDeduplication<T>(
  cacheKey: string,
  createListener: (callback) => () => void,
  callback: (data: T | null) => void
): () => void {
  // Shared listener across components
  // Reduces Firestore reads by ~80%
}
```

### 73.4 Pattern One-time Reads (getDocs/getDoc)

**Pagination Pattern:**
```typescript
const PAGINATION_BATCH_SIZE = 500;

const fetchAllDocsPaginated = async (
  collectionRef,
  constraints: QueryConstraint[] = []
) => {
  let lastDoc = null;
  let hasMore = true;

  while (hasMore) {
    const currentQuery = lastDoc
      ? query(collectionRef, ...constraints, startAfter(lastDoc))
      : query(collectionRef, ...constraints);

    const snapshot = await getDocs(currentQuery);
    allDocs.push(...snapshot.docs);
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    hasMore = snapshot.docs.length === PAGINATION_BATCH_SIZE;
  }
};
```

### 73.5 Cloud Functions (Backend Pattern)

**HTTP Callable Functions:**
```typescript
// Type-safe callable wrapper
export function call<TPayload, TReturn = unknown>(name: string) {
  return httpsCallable<TPayload, TReturn>(functions, name);
}

// Usage
const result = await validatePassword({ password });
```

**Primary Functions:**
| Function | Purpose |
|----------|---------|
| createPaymentIntent | Stripe payment init |
| capturePayment | Payment capture |
| initiateCall | Twilio call setup |
| sendContactReply | Email notifications |
| validateDashboardPassword | Multi-dashboard auth |
| getMultiDashboardData | Secure data aggregation |
| subscriptionCreate/Cancel/Reactivate | Subscription management |

**Why Cloud Functions:**
1. Secure payment processing (secrets never exposed)
2. External service integration (Twilio, PayPal, OpenAI)
3. Custom business logic and validation
4. Role-based access control
5. Audit logging and compliance

### 73.6 Webhook Handlers (Server Pattern)

| Webhook | Events |
|---------|--------|
| Stripe | Payment success/failure, subscriptions, disputes, refunds |
| Twilio | Call status, conference, transcription |
| PayPal | Payout completion, subscriptions |
| Meta CAPI | Facebook Ads attribution |

### 73.7 Data Fetching Hooks

#### useSubscription Hook

```typescript
export function useSubscription(): UseSubscriptionReturn {
  // Real-time listener for subscription
  useEffect(() => {
    const unsubscribe = subscribeToSubscription(user.uid, (sub) => {
      setSubscription(sub);
      if (sub?.planId && sub.planId !== lastPlanId.current) {
        loadPlan(sub.planId);
      }
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Real-time listener for plans
  useEffect(() => {
    const unsubscribePlans = subscribeToPlans(providerType, (plans) => {
      setPlans(plans.filter(p => p.isActive && p.tier !== 'trial'));
    });
    return () => unsubscribePlans();
  }, [user?.uid, providerType]);
}
```

**Features:**
- Plan caching (5-min TTL)
- Memoized derived values
- Race condition prevention (isMounted ref)
- Async action handling

#### useMultiProviderDashboard Hook

```typescript
// Session-based authentication (24h tokens)
interface Session {
  authenticated: boolean;
  expiresAt: number;
  token: string;
}

// Multi-project setup for secure function access
const outilsFunctions = getFunctions(outilsApp, 'europe-west1');

// Data fetching with session token
const getMultiDashboardData = httpsCallable<
  { sessionToken: string },
  { success: boolean; accounts?: MultiProviderAccount[] }
>(outilsFunctions, 'getMultiDashboardData');
```

#### Autres Hooks Real-time

| Hook | Purpose |
|------|---------|
| useAiQuota | AI usage tracking |
| useExternalServicesBalance | Service balance (Twilio, SendGrid) |
| useCostMonitoring | GCP billing costs |
| useValidationQueue | Profile validation workflow |
| useConnectionLogs | API connection logging |
| useUnifiedAnalytics | Dashboard analytics |

### 73.8 Stratégies de Caching

#### localStorage Cache (firestoreCache.ts)

**TTL Configuration:**
| Cache Key | TTL |
|-----------|-----|
| SUBSCRIPTION_PLANS | 24 heures |
| COUNTRIES | 7 jours |
| HELP_CATEGORIES | 1 heure |
| TRIAL_CONFIG | 1 heure |

```typescript
export async function fetchWithCache<T>(
  cacheKey: CacheKey,
  subKey: string | undefined,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = getCached<T>(cacheKey, subKey);
  if (cached !== null) {
    console.log(`[FirestoreCache] Cache HIT`);
    return cached;
  }

  const data = await fetchFn();
  setCache(cacheKey, data, subKey);
  return data;
}
```

#### In-Memory Cache (Finance Service)

```typescript
// 5-minute cache for finance queries
const CACHE_DURATION_MS = 5 * 60 * 1000;
const cache: Map<string, CacheEntry<unknown>> = new Map();
```

### 73.9 REST API Fallback

**Fichier:** `src/utils/firestoreRestApi.ts`

**Purpose:** Fallback quand SDK échoue

```typescript
export async function getDocumentRest<T>(
  collectionPath: string,
  documentId: string,
  timeoutMs = 5000
): Promise<{ exists: boolean; data: T | null; id: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${BASE_URL}/${collectionPath}/${documentId}`;
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    const doc = await response.json();
    const converted = convertFirestoreDocument(doc);
    return { exists: true, data: converted.data as T, id: converted.id };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error('REST API timeout');
    }
    throw error;
  }
}
```

**Endpoints:**
- `getDocumentRest()` - Single document (5s timeout)
- `getCollectionRest()` - Collection with pagination
- `runQueryRest()` - Structured queries via REST

### 73.10 Authentication Data Flow

**Fichier:** `src/contexts/AuthContext.tsx`

**Features:**
- Multi-auth: Email/Password, Google, WebView fallbacks
- Device detection: Mobile, tablet, desktop
- Connection speed awareness: Slow, medium, fast
- Auth metrics tracking

```typescript
// Real-time auth state listener
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUser(normalizeUserData(userDoc.data(), firebaseUser.uid));
      }
    } else {
      setUser(null);
    }
  });
  return () => unsubscribe();
}, []);
```

### 73.11 Data Flow Diagrams

**User Authentication:**
```
Browser → Firebase Auth → AuthContext → User Document (Firestore) → App State
```

**Call Payment:**
```
Client → Cloud Function (capturePayment) → Stripe API → Firestore → Real-time Listener
```

**Subscription Management:**
```
useSubscription → Real-time Listener → Cloud Function (cancel/reactivate) → Stripe → Firestore → Hook Update
```

**Multi-Dashboard Access:**
```
Dashboard → validateDashboardPassword → Session Token → getMultiDashboardData → Secure Data Aggregation
```

### 73.12 Optimisations Coûts

| Technique | Réduction |
|-----------|-----------|
| Listener deduplication | ~80% reads |
| Persistent cache | 15-20% reads |
| Plan caching TTL | Variable (24h static) |
| In-memory cache | 5-min finance queries |
| Batch operations | Pagination 500 docs |

### 73.13 Résilience Réseau

| Mesure | Description |
|--------|-------------|
| Long polling mode | Bypass WebSocket blocks |
| REST API fallback | SDK failure recovery |
| Cache corruption recovery | Auto-recovery |
| 24h cache cycle | Auto-recovery corruption |

### 73.14 Statistiques Data Fetching

| Métrique | Valeur |
|----------|--------|
| Cache IndexedDB | 50MB |
| Cache plans TTL | 24 heures |
| Cache countries TTL | 7 jours |
| In-memory cache TTL | 5 minutes |
| Pagination batch size | 500 docs |
| REST API timeout | 5 secondes |
| Session token validity | 24 heures |
| Listener deduplication gain | ~80% |

---

## 74. Catalogue Complet des Cloud Functions Firebase

### 74.1 Vue d'Ensemble

**Deux projets Firebase distincts:**
- **SOS Expat** (`sos-expat-plateform`) - ~150+ Cloud Functions
- **Outil IA SOS** (`outils-sos-expat`) - ~30+ Cloud Functions

**Région:** `europe-west1` (Belgique) pour les deux projets

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    SOS EXPAT CLOUD FUNCTIONS                      │
├─────────────────────────────────────────────────────────────────┤
│ Payment & Stripe    │ Calls & Scheduling  │ Notifications       │
│ • stripeWebhook     │ • executeCallTask   │ • notifyAfterPayment│
│ • createPaymentIntent│• createAndScheduleCall│• notificationRetry │
│ • processScheduledTransfers              │• sendContactReply    │
├─────────────────────────────────────────────────────────────────┤
│ Backup & DR         │ Admin & Monitoring  │ KYC & Accounts      │
│ • morningBackup     │ • adminSoftDeleteUser│• createStripeAccount│
│ • dailyCrossRegionBackup│• adminUpdateStatus│• checkStripeAccountStatus│
│ • quarterlyRestoreTest│• generateSystemDebugReport│• completeLawyerOnboarding│
├─────────────────────────────────────────────────────────────────┤
│ Subscriptions       │ Triggers            │ SEO & Marketing     │
│ • createSubscriptionCheckout│• onUserDeleted│• generateSitemaps   │
│ • cancelSubscription│• onBookingRequestCreated│• translateProvider │
│ • handleStripeWebhook│• onProviderCreated │• handleUserRegistration│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  OUTIL IA SOS CLOUD FUNCTIONS                     │
├─────────────────────────────────────────────────────────────────┤
│ AI Handlers         │ Multi-Dashboard     │ Sync & Auth         │
│ • aiOnBookingCreated│ • validateDashboardPassword│ • syncProvider │
│ • aiOnProviderMessage│• getMultiDashboardData│• onProviderUpdated│
│ • aiChat            │ • generateMultiDashboardOutilToken        │
│ • aiChatStream      │ • sendMultiDashboardMessage               │
├─────────────────────────────────────────────────────────────────┤
│ Webhooks            │ Scheduled Tasks     │ Subscriptions       │
│ • ingestBooking     │ • cleanupOldConversations│• syncSubscription│
│ • updateBookingStatus│• weeklyForcedAccessAudit│• checkSubscription│
│ • health            │ • dailyCleanup      │ • monthlyQuotaReset │
└─────────────────────────────────────────────────────────────────┘
```

### 74.2 SOS Expat - Fonctions Paiement & Stripe

**Fichiers:** `sos/firebase/functions/src/index.ts`, `subscription/*`, `Webhooks/*`

#### stripeWebhook
```typescript
export const stripeWebhook = onRequest({
  region: "europe-west1",
  maxInstances: 50,
  timeoutSeconds: 120,
}, async (req, res) => {
  // Handles 20+ Stripe event types
  // payment_intent.*, charge.*, checkout.session.*
  // customer.subscription.*, invoice.*, dispute.*
  // account.updated (Connect), transfer.*, payout.*
});
```

**Événements gérés (20+):**
| Événement | Handler | Description |
|-----------|---------|-------------|
| `payment_intent.succeeded` | `handlePaymentSuccess` | Capture paiement, démarre appel |
| `payment_intent.payment_failed` | `handlePaymentFailed` | Rollback, notification |
| `charge.refunded` | `handleRefund` | Mise à jour statut |
| `customer.subscription.created` | `handleSubscriptionCreated` | Création abonnement |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | Mise à jour plan |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | Annulation |
| `invoice.paid` | `handleInvoicePaid` | Paiement facture |
| `invoice.payment_failed` | `handleInvoicePaymentFailed` | Échec paiement |
| `dispute.created` | `handleDisputeCreated` | Litige ouvert |
| `account.updated` | `handleAccountUpdated` | KYC Connect |
| `transfer.created` | `handleTransferCreated` | Transfert provider |
| `payout.failed` | `handlePayoutFailed` | Échec versement |

#### createPaymentIntent
```typescript
export { createPaymentIntent } from "./createPaymentIntent";
// Creates Stripe PaymentIntent with:
// - automatic_payment_methods: true
// - on_behalf_of: provider Stripe account (Connect)
// - application_fee_amount: platform commission
// - transfer_data: { destination: providerStripeId }
// - metadata: { callSessionId, providerId, clientId, duration }
```

#### processScheduledTransfers
```typescript
export { processScheduledTransfers } from "./processScheduledTransfers";
// Processes delayed transfers to providers
// - Transfers held in escrow for 48h (CGV protection)
// - Checks provider KYC status before transfer
// - Handles transfer failures with retry logic
```

### 74.3 SOS Expat - Fonctions Appels & Planification

**Fichiers:** `callScheduler.ts`, `createAndScheduleCallFunction.ts`, `Webhooks/twilio*`

#### executeCallTask
```typescript
export const executeCallTask = onRequest({
  region: "europe-west1",
  memory: "512MiB",
  timeoutSeconds: 300,
  secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN],
}, async (req, res) => {
  // Triggered by Cloud Tasks at scheduled time
  // 1. Retrieves call_session from Firestore
  // 2. Creates Twilio conference call
  // 3. Calls both provider and client
  // 4. Handles AMD (Answering Machine Detection)
  // 5. Updates call status in real-time
});
```

#### createAndScheduleCallHTTPS
```typescript
export { createAndScheduleCallHTTPS } from "./createAndScheduleCallFunction";
// Called after payment success
// 1. Creates call_session in Firestore
// 2. Schedules Cloud Task for exact time
// 3. Notifies provider and client
// 4. Creates booking in Outil IA SOS (AI response)
```

#### Twilio Webhooks
```typescript
export { twilioCallWebhook } from "./Webhooks/twilioWebhooks";
// POST /twilioCallWebhook - Receives Twilio status callbacks
// StatusCallback: initiated, ringing, answered, completed, failed

export { twilioConferenceWebhook } from "./Webhooks/TwilioConferenceWebhook";
// Handles conference events: participant-join, participant-leave

export { twilioGatherResponse } from "./Webhooks/twilioWebhooks";
// DTMF input handling for IVR
```

### 74.4 SOS Expat - Fonctions Backup & Disaster Recovery

**Fichiers:** `scheduled/multiFrequencyBackup.ts`, `scheduled/crossRegionBackup.ts`, `admin/backupRestoreAdmin.ts`

#### Multi-Frequency Backup
```typescript
export { morningBackup } from "./scheduled/multiFrequencyBackup";
// Daily at 03:00 Europe/Paris
// - Full Firestore export to GCS
// - Compressed JSON format
// - 30-day retention

export { cleanupOldBackups } from "./scheduled/multiFrequencyBackup";
// Removes backups older than retention period
```

#### Cross-Region DR
```typescript
export { dailyCrossRegionBackup } from "./scheduled/crossRegionBackup";
// Daily at 04:00 Europe/Paris
// - Copies backup to secondary region (us-central1)
// - Ensures geographic redundancy
// - 90-day DR retention

export { backupStorageToDR } from "./scheduled/backupStorageToDR";
// Backs up Storage files (photos, documents, invoices)
// to DR bucket
```

#### Quarterly Restore Test
```typescript
export { quarterlyRestoreTest } from "./scheduled/quarterlyRestoreTest";
// Quarterly automated restore verification
// 1. Selects random backup
// 2. Restores to test collection
// 3. Validates data integrity
// 4. Generates compliance report
// 5. Sends report to admin
```

#### Admin Restore Functions
```typescript
export {
  adminListBackups,        // List available backups with metadata
  adminPreviewRestore,     // Preview what will be restored
  adminRestoreFirestore,   // Restore Firestore collections
  adminRestoreAuth,        // Restore Firebase Auth users
  adminCheckRestoreStatus, // Check ongoing restore status
  adminCreateManualBackup, // Trigger manual backup
  adminDeleteBackup,       // Delete specific backup
  adminListGcpBackups,     // List GCP-level backups
} from "./admin/backupRestoreAdmin";
```

### 74.5 SOS Expat - Fonctions KYC & Comptes Stripe

**Fichiers:** `createStripeAccount.ts`, `createLawyerAccount.ts`, `KYCReminderManager.ts`

#### createStripeAccount
```typescript
export { createStripeAccount } from "./createStripeAccount";
// Creates Stripe Connect Express account
// - Determines country from provider profile
// - Sets capabilities: card_payments, transfers
// - Creates account onboarding link
// - Stores stripeAccountId in Firestore
```

#### KYC Reminder System
```typescript
export {
  scheduledKYCReminders,  // Daily at 10:00
  triggerKYCReminders,    // Manual trigger
  getKYCReminderStatus,   // Check reminder status
} from "./KYCReminderManager";
// Sends KYC completion reminders:
// D+1: First reminder email
// D+7: Second reminder with urgency
// D+30: Third reminder with consequences
// D+90: Final reminder, funds at risk
```

### 74.6 SOS Expat - Fonctions Escrow & Fonds Non-Réclamés

**Fichiers:** `scheduled/escrowMonitoring.ts`, `scheduled/unclaimedFundsProcessing.ts`

```typescript
export { escrowMonitoringDaily } from "./scheduled/escrowMonitoring";
// Daily at 11:00 Europe/Paris
// - Checks pending_transfers balance
// - Alerts if escrow > 1000€
// - Verifies failed_payouts status
// - Monitors Stripe balance

export {
  scheduledProcessUnclaimedFunds,
  processUnclaimedFundsManual,
  getUnclaimedFundsReport,
} from "./scheduled/unclaimedFundsProcessing";
// After 180 days without KYC (CGV Article 8.6-8.9):
// 1. Identifies funds to forfeit
// 2. Sends final warning email
// 3. Transfers to platform if no action
// 4. Creates accounting entry
// 5. Notifies admin
```

### 74.7 SOS Expat - Fonctions Notifications

**Fichiers:** `notifications/*`, `notificationPipeline/*`, `messaging/*`

```typescript
export { notifyAfterPayment } from "./notifications/notifyAfterPayment";
// Triggered after successful payment
// - Email to client (confirmation)
// - Email to provider (new booking)
// - SMS/WhatsApp notifications
// - Push notification (FCM)

export {
  notificationRetry,
  triggerNotificationRetry,
  retrySpecificDelivery,
  getDLQStats,
} from "./scheduled/notificationRetry";
// Retries failed notifications from DLQ
// - Max 3 retry attempts
// - Exponential backoff
// - Final failure → admin alert

export { enqueueMessageEvent } from "./messaging/enqueueMessageEvent";
// Enqueues message for async processing
// - Chat messages
// - System notifications
// - Broadcast messages
```

### 74.8 SOS Expat - Fonctions Admin & Monitoring

**Fichiers:** `admin/*`, `monitoring/*`, `index.ts`

#### Admin Callables
```typescript
export const adminUpdateStatus = onCall({
  enforceAppCheck: true,
}, async (request) => {
  // Updates user status (admin only)
  // Verifies admin role from custom claims
});

export const adminSoftDeleteUser = onCall({
  enforceAppCheck: true,
}, async (request) => {
  // Soft-deletes user (GDPR compliant)
  // - Sets user.deleted = true
  // - Anonymizes PII after 30 days
  // - Retains for legal compliance
});

export const adminBulkUpdateStatus = onCall({
  enforceAppCheck: true,
}, async (request) => {
  // Bulk status update for multiple users
});
```

#### Monitoring Functions
```typescript
export { getCostMetrics } from "./monitoring/getCostMetrics";
// Aggregates all cost metrics (Stripe, Twilio, Firebase, AI)

export { getFirebaseUsage } from "./monitoring/getFirebaseUsage";
// Firestore reads/writes, Storage, Functions invocations

export { getGcpBillingCosts } from "./monitoring/getGcpBillingCosts";
// GCP billing data from BigQuery export

export { getOpenAIUsage } from "./monitoring/getOpenAIUsage";
export { getAnthropicUsage } from "./monitoring/getAnthropicUsage";
export { getPerplexityUsage } from "./monitoring/getPerplexityUsage";
// AI API usage and costs

export { getTwilioBalance } from "./monitoring/getTwilioBalance";
export { getStripeBalance } from "./monitoring/getStripeBalance";
// External service balances
```

#### System Debug
```typescript
export const generateSystemDebugReport = onCall({
  enforceAppCheck: true,
}, async (request) => {
  // Generates comprehensive debug report
  // - Active calls, pending payments
  // - Failed notifications, stuck tasks
  // - Memory/CPU usage, error rates
});

export const getSystemHealthStatus = onCall(async () => {
  // Quick health check
  // - Firestore connectivity
  // - Stripe API status
  // - Twilio API status
  // Returns: healthy | degraded | unhealthy
});
```

### 74.9 SOS Expat - Fonctions Subscriptions

**Fichiers:** `subscription/*`

```typescript
export { createSubscriptionCheckout } from './subscription/checkout';
// Creates Stripe Checkout session for subscription
// - price_id from subscription plan
// - success_url, cancel_url
// - customer from userId

export { cancelSubscription, reactivateSubscription } from './subscription/cancelSubscription';
// Cancel at period end / Reactivate cancelled

export { getBillingPortalUrl } from './subscription/billingPortal';
// Returns Stripe customer portal URL

// Webhook handlers (called by stripeWebhook)
export {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleSubscriptionPaused,
  handleSubscriptionResumed,
  handleTrialWillEnd,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from "./subscription/webhooks";
```

### 74.10 SOS Expat - Fonctions Triggers

**Fichiers:** `triggers/*`

```typescript
export { onUserDeleted, cleanupOrphanedProfiles } from './triggers/userCleanupTrigger';
// Triggered when Firebase Auth user is deleted
// - Cleans up Firestore profile
// - Removes from providers/lawyers/expatAidants
// - Archives messages

export { onBookingRequestCreated, retryOutilSync } from './triggers/syncBookingsToOutil';
// Triggered on new booking_requests document
// - Syncs to Outil IA SOS for AI response
// - Retries on failure

export { onProviderCreated } from './triggers/onProviderCreated';
// New provider created
// - Sends welcome email
// - Creates Stripe account
// - Initializes default settings

export { onUserEmailUpdated } from './triggers/syncUserEmailToSosProfiles';
// Email change propagation across collections

export { onUserAccessUpdated } from './triggers/syncAccessToOutil';
// Access changes sync to Outil IA SOS
```

### 74.11 SOS Expat - Fonctions SEO & Marketing

**Fichiers:** `sitemap.ts`, `seo.ts`, `translation/*`, `emailMarketing/*`

```typescript
export { generateSitemaps, onProviderChange, scheduledSitemapGeneration } from './sitemap';
// Generates XML sitemaps for:
// - Provider pages (lawyers, expat helpers)
// - Category pages
// - Country pages
// - Blog articles

export { providerCatalogFeed, generateProviderFeed } from './providerCatalogFeed';
// Google Merchant Center feed for providers

export * from './translation/translateProvider';
// Auto-translates provider profiles to 9 languages

export { handleUserRegistration } from './emailMarketing/functions/userLifecycle';
// Triggers email marketing sequences:
// - Welcome email
// - Onboarding sequence
// - Inactivity reminders

export { detectInactiveUsers } from './emailMarketing/functions/inactiveUsers';
// Detects users inactive for 30+ days
// - Triggers re-engagement campaign
```

### 74.12 Outil IA SOS - Fonctions IA

**Fichiers:** `Outil-sos-expat/functions/src/ai/*`

```typescript
export { aiOnBookingCreated } from "./ai";
// Firestore trigger on new booking
// 1. Validates provider has AI access
// 2. Builds context (client info, provider expertise)
// 3. Generates AI response (Claude 3.5 Sonnet)
// 4. Saves to aiResponses subcollection
// 5. Updates booking.aiProcessed = true

export { aiOnProviderMessage } from "./ai";
// Triggered when provider sends message
// - Continues conversation context
// - Generates follow-up response

export { aiChat } from "./ai";
// Direct chat endpoint (non-streaming)
// - Callable function
// - Returns complete response

export { aiChatStream } from "./ai";
// Streaming chat endpoint
// - HTTP endpoint with SSE
// - Real-time token streaming
```

**AI Provider Configuration:**
```typescript
// ai/providers/claude.ts
const CLAUDE_CONFIG = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
  temperature: 0.7,
};

// ai/providers/perplexity.ts (for research)
const PERPLEXITY_CONFIG = {
  model: "llama-3.1-sonar-large-128k-online",
  maxTokens: 2048,
};
```

### 74.13 Outil IA SOS - Fonctions Multi-Dashboard

**Fichiers:** `Outil-sos-expat/functions/src/multiDashboard/*`

```typescript
export { validateDashboardPassword } from "./multiDashboard";
// Authenticates multi-provider dashboard access
// - Validates password against hashed secret
// - Generates 24h session token
// - Returns token for subsequent requests

export { getMultiDashboardData } from "./multiDashboard";
// Fetches all data for authenticated dashboard
// - All linked providers for account
// - All booking requests with AI responses
// - Provider availability status

export { generateMultiDashboardOutilToken } from "./multiDashboard";
// SSO token for Outil IA SOS access
// - Creates custom Firebase token
// - Includes provider context
// - 1h expiration

export { getProviderConversations } from "./multiDashboard";
// Fetches chat conversations for provider
// - Last 20 conversations
// - Includes message history

export { sendMultiDashboardMessage } from "./multiDashboard";
// Sends message from dashboard
// - Creates/continues conversation
// - Triggers AI response
```

### 74.14 Outil IA SOS - Webhooks & API

**Fichiers:** `Outil-sos-expat/functions/src/index.ts`

```typescript
export const ingestBooking = onRequest({
  region: "europe-west1",
  cors: CORS_CONFIG,
  secrets: [SOS_PLATFORM_API_KEY],
  timeoutSeconds: 60,
  maxInstances: 20,
}, async (req, res) => {
  // POST /ingestBooking
  // Receives booking from SOS Expat
  // 1. Validates API key
  // 2. Rate limiting check
  // 3. Validates payload (Zod schema)
  // 4. Creates/updates provider if needed
  // 5. Creates booking document
  // 6. Triggers aiOnBookingCreated
});

export const updateBookingStatus = onRequest({
  region: "europe-west1",
}, async (req, res) => {
  // PATCH /updateBookingStatus
  // Updates booking status from SOS Expat
  // - pending → confirmed → in_progress → completed/cancelled
});

export const health = onRequest({
  region: "europe-west1",
}, async (req, res) => {
  // GET /health
  // Health check endpoint
  // Returns: { ok: true, status: "healthy", version: "5.1.0" }
});
```

### 74.15 Outil IA SOS - Fonctions Planifiées

**Fichiers:** `Outil-sos-expat/functions/src/scheduled.ts`, `index.ts`

```typescript
export const dailyCleanup = onSchedule({
  schedule: "0 3 * * *",
  timeZone: "Europe/Paris",
}, async () => {
  // Daily at 03:00
  // - Cleans rate limit buckets
  // - Expires overdue subscriptions
});

export const monthlyQuotaReset = onSchedule({
  schedule: "5 0 1 * *",
  timeZone: "Europe/Paris",
}, async () => {
  // 1st of month at 00:05
  // - Resets aiCallsUsed to 0 for all providers
  // - Stores previous month usage
  // - Logs audit entry
});

export { cleanupOldConversations } from "./scheduled";
// Archives conversations older than 90 days

export { weeklyForcedAccessAudit } from "./scheduled";
// Weekly audit of forcedAIAccess grants
// - Verifies still valid
// - Logs any changes

export { cleanupStuckMessages } from "./scheduled";
// Cleans messages stuck in processing state

export { archiveExpiredConversations } from "./scheduled";
// Archives completed conversations
```

### 74.16 Outil IA SOS - Fonctions Sync

**Fichiers:** `Outil-sos-expat/functions/src/syncProvider*.ts`

```typescript
export { syncProvider, syncProvidersBulk } from "./syncProvider";
// Syncs provider data from SOS Expat
// - Profile updates
// - Subscription status
// - Access permissions

export { onProviderUpdated } from "./syncProvidersToSos";
// Reverse sync: Outil → SOS
// Triggered on provider document update
// - Syncs AI usage stats
// - Conversation counts
```

### 74.17 Statistiques Cloud Functions

| Catégorie | SOS Expat | Outil IA SOS | Total |
|-----------|-----------|--------------|-------|
| Payment/Stripe | 25+ | 0 | 25+ |
| Calls/Twilio | 15+ | 0 | 15+ |
| Backup/DR | 12 | 0 | 12 |
| KYC/Accounts | 8 | 0 | 8 |
| Notifications | 10+ | 0 | 10+ |
| Admin/Monitoring | 30+ | 3 | 33+ |
| Subscriptions | 15+ | 3 | 18+ |
| Triggers | 15+ | 1 | 16+ |
| SEO/Marketing | 10+ | 0 | 10+ |
| AI Handlers | 0 | 5 | 5 |
| Multi-Dashboard | 1 | 6 | 7 |
| Webhooks | 8 | 3 | 11 |
| Scheduled | 15+ | 5 | 20+ |
| Sync | 5 | 3 | 8 |
| **TOTAL** | **~150+** | **~30+** | **~180+** |

### 74.18 Configuration & Secrets

**Secrets (Firebase Secret Manager):**
```typescript
// SOS Expat secrets (lib/secrets.ts)
defineSecret("EMAIL_USER");
defineSecret("EMAIL_PASS");
defineSecret("TWILIO_ACCOUNT_SID");
defineSecret("TWILIO_AUTH_TOKEN");
defineSecret("TWILIO_PHONE_NUMBER");
defineSecret("STRIPE_SECRET_KEY_TEST");
defineSecret("STRIPE_SECRET_KEY_LIVE");
defineSecret("STRIPE_WEBHOOK_SECRET");
defineSecret("STRIPE_CONNECT_WEBHOOK_SECRET");
defineSecret("ENCRYPTION_KEY");
defineSecret("TASKS_AUTH_SECRET");
defineSecret("OUTIL_API_KEY");
defineSecret("OUTIL_SYNC_API_KEY");
defineSecret("META_CAPI_TOKEN");
defineSecret("SENTRY_DSN");

// Outil IA SOS secrets
defineSecret("SOS_PLATFORM_API_KEY");
defineSecret("ANTHROPIC_API_KEY");
defineSecret("OPENAI_API_KEY");
defineSecret("PERPLEXITY_API_KEY");
defineSecret("MULTI_DASHBOARD_PASSWORD_HASH");
```

**CPU/Memory Configurations:**
```typescript
// Emergency config (low resource)
const emergencyConfig = {
  memory: "256MiB",
  cpu: 0.25,
  maxInstances: 3,
};

// Standard config
const standardConfig = {
  memory: "512MiB",
  cpu: 1,
  maxInstances: 20,
};

// Heavy processing config
const heavyConfig = {
  memory: "1GiB",
  cpu: 2,
  maxInstances: 50,
  timeoutSeconds: 540, // 9 minutes
};
```

---

## 75. Système Favoris et Bookmarks

### 75.1 Vue d'Ensemble

Le système de favoris permet aux utilisateurs (principalement les clients) de sauvegarder et gérer leurs prestataires préférés (avocats et aidants expatriés) pour un accès rapide.

**Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTÈME FAVORIS                               │
├─────────────────────────────────────────────────────────────────┤
│ Interface Utilisateur                                           │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│ │ Dashboard Tab   │  │ Quick Actions   │  │ Mobile Drawer   │  │
│ │ "Mes Favoris"   │  │ Accès rapide    │  │ Menu mobile     │  │
│ └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│          └────────────────────┼────────────────────┘            │
│                               ▼                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │              Firestore: users/{userId}/favorites             │ │
│ │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │ │
│ │  │ providerId  │  │ providerName│  │ createdAt   │          │ │
│ │  │ type        │  │ photo       │  │ country     │          │ │
│ │  └─────────────┘  └─────────────┘  └─────────────┘          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                               ▼                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │              IndexedDB: Offline Storage                      │ │
│ │              Store: STORES.FAVORITES                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 75.2 Structure de Données Firestore

**Collection:** `users/{userId}/favorites`

```typescript
interface FavoriteProvider {
  id: string;                    // Document ID
  providerId: string;            // Référence au provider
  providerName: string;          // Nom d'affichage
  providerType: string;          // "lawyer" | "expat"
  providerPhoto?: string;        // URL photo profil
  country?: string;              // Pays du provider
  createdAt: Timestamp;          // Date d'ajout (tri)
}
```

**Index Firestore:**
- `providerId` - Index unique (un favori par provider par user)
- `createdAt` - Pour tri par date (plus récent en premier)

### 75.3 Composant Dashboard Favoris

**Fichier:** `src/pages/Dashboard.tsx` (lignes 3593-3653)

```typescript
// État des favoris
const [favorites, setFavorites] = useState<Array<{
  id: string;
  type: "lawyer" | "expat";
  name: string;
  country?: string;
  photo?: string;
}>>([]);

// Chargement depuis Firestore
useEffect(() => {
  if (!user?.id) return;

  const q = query(
    collection(db, "users", user.id, "favorites"),
    orderBy("createdAt", "desc"),
    limit(20)  // Maximum 20 favoris affichés
  );

  const snap = await getDocs(q);
  const items = snap.docs.map(doc => ({
    id: doc.id,
    type: doc.data().type,
    name: doc.data().name,
    country: doc.data().country,
    photo: doc.data().photo,
  }));

  setFavorites(items);
}, [user?.id]);
```

**Affichage:**
```tsx
{/* Onglet Favoris dans Dashboard */}
<TabsContent value="favorites">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {favorites.length === 0 ? (
      <p className="text-gray-500">{t("dashboard.noFavorites")}</p>
    ) : (
      favorites.map((fav) => (
        <div
          key={fav.id}
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
        >
          <img
            src={fav.photo || "/default-avatar.png"}
            alt={fav.name}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <p className="font-medium">{fav.name}</p>
            <p className="text-sm text-gray-500">
              {fav.type === "lawyer" ? "Avocat" : "Aidant"}
              {fav.country && ` • ${fav.country}`}
            </p>
          </div>
        </div>
      ))
    )}
  </div>
</TabsContent>
```

### 75.4 Navigation et Accès

#### Mobile Side Drawer
**Fichier:** `src/components/dashboard/MobileSideDrawer.tsx`

```typescript
// Icône Bookmark dans le menu mobile
{
  icon: Bookmark,
  label: t("dashboard.myFavorites"),
  tabKey: "favorites",
  action: () => setSearchParams({ tab: "favorites" })
}
```

#### Quick Actions (Clients)
**Fichier:** `src/components/dashboard/QuickActions.tsx`

```typescript
// Action rapide pour accéder aux favoris (clients uniquement)
{
  icon: Users,
  label: t("quickActions.favorites"),
  description: t("quickActions.favorites.desc"),
  action: () => onTabChange("favorites")
}
```

#### Dashboard Layout
**Fichier:** `src/components/layout/DashboardLayout.tsx`

```typescript
// Routes dashboard incluant favoris
const routes = {
  dashboardFavorites: '/{dashboardSlug}?tab=favorites',
  // ... autres routes
};

// Icône Bookmark dans sidebar
<SidebarItem
  icon={Bookmark}
  label={t("dashboard.myFavorites")}
  tab="favorites"
/>
```

### 75.5 Stockage Hors-Ligne (IndexedDB)

**Fichier:** `src/services/offlineStorage.ts`

```typescript
// Interface stockage hors-ligne
export interface FavoriteProvider {
  id: string;
  providerId: string;
  providerName: string;
  providerType: string;
  providerPhoto?: string;
  addedAt: number;  // Timestamp
}

// Store IndexedDB
const STORES = {
  FAVORITES: 'favorites',
  // ... autres stores
};

// API de stockage hors-ligne
export async function saveFavorite(favorite: FavoriteProvider): Promise<void> {
  const db = await getDB();
  await db.put(STORES.FAVORITES, favorite);
}

export async function getFavorites(): Promise<FavoriteProvider[]> {
  const db = await getDB();
  return await db.getAll(STORES.FAVORITES);
}

export async function removeFavorite(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORES.FAVORITES, id);
}
```

**Caractéristiques:**
- Index unique sur `providerId`
- Support sync en arrière-plan via Service Worker
- File d'attente actions en attente pour opérations hors-ligne

### 75.6 Support Multilingue

**Clés de traduction (9 langues):**

| Clé | EN | FR | ES | DE |
|-----|----|----|----|----|
| `dashboard.myFavorites` | My favorites | Mes favoris | Mis favoritos | Meine Favoriten |
| `dashboard.noFavorites` | No favorites yet. | Aucun favori. | Ningún favorito. | Noch keine Favoriten. |
| `quickActions.favorites` | My Favorites | Mes Favoris | Mis Favoritos | Meine Favoriten |
| `quickActions.favorites.desc` | Saved providers | Prestataires sauvés | Proveedores guardados | Gespeicherte Anbieter |

**Langues supportées:** EN, FR, ES, DE, RU, PT, CH, HI, AR

### 75.7 Gestion des Photos

```typescript
// Cache-busting pour éviter images obsolètes
const photoUrl = fav.photo
  ? `${fav.photo}?v=${Date.now()}`
  : "/default-avatar.png";

// Affichage avec fallback
<img
  src={photoUrl}
  onError={(e) => {
    e.currentTarget.src = "/default-avatar.png";
  }}
  alt={fav.name}
  className="w-12 h-12 rounded-full object-cover"
/>
```

### 75.8 Règles de Sécurité Firestore

**Fichier:** `firestore.rules`

```javascript
match /users/{userId}/favorites/{favoriteId} {
  // Lecture: uniquement propriétaire
  allow read: if request.auth != null && request.auth.uid == userId;

  // Écriture: uniquement propriétaire
  allow write: if request.auth != null && request.auth.uid == userId;

  // Validation données
  allow create: if request.resource.data.keys().hasAll(['providerId', 'providerName', 'createdAt']);
}
```

### 75.9 Caractéristiques UX

| Caractéristique | Détail |
|-----------------|--------|
| Layout | Grille responsive (1 col mobile, 2 cols desktop) |
| Limite affichage | 20 favoris maximum |
| Tri | Plus récent en premier |
| État vide | Message amical "Aucun favori" |
| Hover | Changement couleur fond |
| Accessibilité | Labels ARIA, navigation clavier |

### 75.10 Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `src/pages/Dashboard.tsx` | Onglet principal et chargement données |
| `src/components/dashboard/MobileSideDrawer.tsx` | Navigation mobile |
| `src/components/dashboard/QuickActions.tsx` | Actions rapides clients |
| `src/components/layout/DashboardLayout.tsx` | Layout et routing |
| `src/services/offlineStorage.ts` | Persistance hors-ligne |
| `src/helper/*.json` | Traductions multilingues |
| `firestore.rules` | Règles de sécurité |

### 75.11 Statistiques Système Favoris

| Métrique | Valeur |
|----------|--------|
| Maximum favoris affichés | 20 |
| Langues supportées | 9 |
| Points d'accès UI | 3 (Tab, Quick Actions, Mobile) |
| Stockage principal | Firestore subcollection |
| Stockage offline | IndexedDB |
| Tri par défaut | createdAt DESC |

---

## 76. Fonctionnalités de Sécurité Complètes

### 76.1 Vue d'Ensemble Architecture Sécurité

**Approche Defense-in-Depth avec 17 couches de protection:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE SÉCURITÉ                         │
├─────────────────────────────────────────────────────────────────┤
│ TRANSPORT          │ HTTPS forcé, HSTS preload, TLS 1.3        │
├─────────────────────────────────────────────────────────────────┤
│ HEADERS            │ CSP, X-Frame-Options, X-XSS-Protection    │
│                    │ X-Content-Type-Options, Referrer-Policy   │
├─────────────────────────────────────────────────────────────────┤
│ AUTHENTIFICATION   │ Firebase Auth, Custom Claims, RBAC        │
├─────────────────────────────────────────────────────────────────┤
│ AUTORISATION       │ Firestore Rules, Storage Rules, Admin API │
├─────────────────────────────────────────────────────────────────┤
│ VALIDATION         │ Zod schemas, Content-Type, Payload size   │
├─────────────────────────────────────────────────────────────────┤
│ RATE LIMITING      │ Per-IP limits, In-memory cache, DLQ       │
├─────────────────────────────────────────────────────────────────┤
│ SANITISATION       │ DOMPurify, Input escaping, PII hashing    │
├─────────────────────────────────────────────────────────────────┤
│ CHIFFREMENT        │ AES-256-GCM, Secret Manager, ENCRYPTION_KEY│
├─────────────────────────────────────────────────────────────────┤
│ WEBHOOKS           │ Stripe HMAC, MailWizz secret verification │
├─────────────────────────────────────────────────────────────────┤
│ MONITORING         │ Critical alerts, Sentry, Audit logs       │
└─────────────────────────────────────────────────────────────────┘
```

### 76.2 Protection XSS (Cross-Site Scripting)

#### DOMPurify Integration
**Package:** `dompurify@3.3.1`

```typescript
import DOMPurify from 'dompurify';

// Sanitization avant rendu HTML
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }}
```

**Utilisé dans:**
- `src/emails/admin/AdminEmails/TemplatesManager.tsx`
- `src/emails/admin/AdminEmails/EmailPreviewModal.tsx`
- `src/pages/TermsExpats.tsx`, `src/pages/TermsLawyers.tsx`

#### Content Security Policy (CSP)
**Fichier:** `.htaccess`

```apache
Header set Content-Security-Policy "
  default-src 'self';
  script-src 'self' https://js.stripe.com https://www.paypal.com
             https://www.googletagmanager.com https://connect.facebook.net;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
"
```

### 76.3 Protection CSRF et CORS

**Fichier:** `cors.json`

```json
[{
  "origin": [
    "http://localhost:*",
    "https://sos-expat.com",
    "https://www.sos-expat.com",
    "https://admin.sos-expat.com"
  ],
  "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
  "responseHeader": ["Content-Type", "Authorization"],
  "maxAgeSeconds": 3600
}]
```

**Protection:**
- Firebase Auth avec tokens ID (pas de sessions cookies)
- Header `Authorization: Bearer <token>` pour toutes les requêtes API
- CORS whitelist stricte en production

### 76.4 Validation des Entrées

#### Backend Validation
**Fichier:** `firebase/functions/src/contact/createContactMessage.ts`

```typescript
function validateContactData(data: unknown): { valid: boolean; error?: string } {
  // Email: required, min 5 chars, doit contenir @
  if (!body.email.includes("@")) return { valid: false };

  // Message: 10-5000 caractères
  if (body.message.length < 10 || body.message.length > 5000) {
    return { valid: false };
  }

  // Phone: format validé
  // Name: trim et validation longueur
}
```

#### Content-Type & Payload Size
**Fichier:** `firebase/functions/src/utils/security.ts`

```typescript
export function validateContentType(req: Request, res: Response): boolean {
  const contentType = req.header("content-type");
  if (!contentType?.toLowerCase().includes("application/json")) {
    res.status(415).json({ error: "Unsupported Media Type" });
    return false;
  }
  return true;
}

const MAX_PAYLOAD_SIZE = 1024 * 1024;           // 1MB default
const MAX_PAYLOAD_SIZE_BULK = 5 * 1024 * 1024; // 5MB bulk ops

export function validatePayloadSize(req: Request, res: Response, maxSize): boolean {
  if (req.body && JSON.stringify(req.body).length > maxSize) {
    res.status(413).json({ error: "Payload Too Large" });
    return false;
  }
  return true;
}
```

#### Validation Zod (Schémas)
**Dépendances:** `zod@4.1.5` (frontend), `zod@4.2.1` (backend)

```typescript
import { z } from 'zod';

const ContactSchema = z.object({
  email: z.string().email().min(5),
  message: z.string().min(10).max(5000),
  name: z.string().min(2).max(100),
  phone: z.string().optional(),
});
```

### 76.5 Rate Limiting

#### Contact Form Rate Limiting
**Fichier:** `firebase/functions/src/contact/createContactMessage.ts`

```typescript
const RATE_LIMIT = {
  MAX_MESSAGES: 3,
  WINDOW_MS: 60 * 60 * 1000,  // 1 heure
};

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const rateLimitRef = db.collection("rate_limits").doc(`contact_${ip}`);
  const doc = await rateLimitRef.get();

  if (doc.exists) {
    const data = doc.data();
    const windowStart = data.windowStart.toMillis();

    if (Date.now() - windowStart < RATE_LIMIT.WINDOW_MS) {
      if (data.count >= RATE_LIMIT.MAX_MESSAGES) {
        return { allowed: false, remaining: 0 };
      }
      await rateLimitRef.update({ count: data.count + 1 });
      return { allowed: true, remaining: RATE_LIMIT.MAX_MESSAGES - data.count - 1 };
    }
  }

  await rateLimitRef.set({ count: 1, windowStart: new Date() });
  return { allowed: true, remaining: RATE_LIMIT.MAX_MESSAGES - 1 };
}
```

#### Subscription Rate Limiting (In-Memory)
```typescript
const rateLimitCache = new Map<string, { count: number; windowStart: number }>();
const CACHE_TTL = { RATE_LIMIT: 60 * 1000 }; // 1 minute
```

### 76.6 Authentification & Autorisation

#### Firebase Authentication avec Custom Claims
**Fichier:** `firebase/functions/src/auth/setAdminClaims.ts`

```typescript
// Rôles: admin, lawyer, expat, client, dev
await getAuth().setCustomUserClaims(uid, { role: "admin", admin: true });

// Whitelist admin
const ADMIN_EMAILS = [
  'williamsjullin@gmail.com',
  'williamjullin@gmail.com',
  'julienvalentine1@gmail.com'
];

// Vérification avant ajout admin
if (callerRole !== "admin" && !callerIsAdmin) {
  throw new HttpsError("permission-denied", "Only administrators can add admins");
}
```

#### Admin API Authentication
**Fichier:** `firebase/functions/src/adminApi.ts`

```typescript
async function verifyAdminAuth(req: Request): Promise<admin.auth.DecodedIdToken | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const idToken = authHeader.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(idToken);

  // Vérification rôle admin dans custom claims
  if (decodedToken.role !== 'admin' && decodedToken.admin !== true) {
    return null;
  }
  return decodedToken;
}
```

### 76.7 Firestore Security Rules

**Fichier:** `firestore.rules`

#### Protection Escalade de Privilèges
```javascript
match /users/{userId} {
  allow update: if (isOwner(userId) &&
    !request.resource.data.diff(resource.data).affectedKeys()
      .hasAny(['role', 'isApproved', 'approvalStatus', 'isBanned',
               'bannedAt', 'bannedReason', 'forcedAiAccess',
               'freeTrialUntil', 'stripeCustomerId',
               'payoutMode', 'aaaPayoutMode', 'isAAA']))
       || isAdmin();
}
```

#### Protection Données Financières
```javascript
allow update: if (isOwner(profileId) &&
  !request.resource.data.diff(resource.data).affectedKeys()
    .hasAny(['stripeAccountId', 'paypalMerchantId', 'stripeCustomerId',
             'totalEarnings', 'pendingBalance', 'reservedBalance',
             'paypalEmailVerified', 'payoutMode']))
     || isAdmin();
```

#### Prévention Path Traversal
```javascript
function isValidDatePath() {
  return year.matches('^[0-9]{4}$') &&
         month.matches('^(0[1-9]|1[0-2])$');
}

match /invoices/{invoiceType}/{year}/{month}/{fileName} {
  allow create: if isValidInvoiceType() &&
                   isValidDatePath() &&
                   request.resource.contentType == 'application/pdf';
}
```

### 76.8 Storage Security Rules

**Fichier:** `storage.rules`

```javascript
function isImage() {
  return request.resource.contentType.matches('image/.*');
}

function isValidDocumentType() {
  return request.resource.contentType in [
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'application/msword'
  ];
}

function isValidFileSize() {
  return request.resource.size < 15 * 1024 * 1024; // 15MB
}

// Uploads anonymes limités
match /registration_temp/{fileName} {
  allow write: if isImage() &&
               request.resource.size < 5 * 1024 * 1024; // 5MB
}
```

### 76.9 Chiffrement AES-256-GCM

**Fichier:** `firebase/functions/src/utils/encryption.ts`

```typescript
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;    // GCM standard
const KEY_LENGTH = 32;   // 256 bits
const ENCRYPTED_PREFIX = 'enc:';

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // Format: enc:<iv>:<authTag>:<ciphertext>
  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  if (!isEncrypted(ciphertext)) return ciphertext;

  const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(':');
  const [ivB64, authTagB64, encryptedB64] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

#### Chiffrement Numéros de Téléphone
```typescript
export function encryptPhoneNumber(phoneNumber: string): string {
  const normalized = phoneNumber.replace(/[^\d+]/g, '');
  return encrypt(normalized);
}

export function maskPhoneNumber(phoneNumber: string): string {
  const decrypted = isEncrypted(phoneNumber) ? decrypt(phoneNumber) : phoneNumber;
  const prefix = decrypted.substring(0, 4);
  const suffix = decrypted.substring(decrypted.length - 4);
  return prefix + '****' + suffix;
}
```

### 76.10 PII Hashing pour Logs

**Fichier:** `firebase/functions/src/utils/security.ts`

```typescript
// Hash PII avec SHA-256 (tronqué 16 chars)
export function hashPII(value: string | null | undefined): string {
  if (!value) return "empty";
  return crypto.createHash("sha256")
    .update(value)
    .digest("hex")
    .substring(0, 16);
}

// Masquage email: john.doe@example.com → joh***@example.com
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  const maskedLocal = local.length > 3 ? local.substring(0, 3) + "***" : "***";
  return `${maskedLocal}@${domain}`;
}

// Masquage téléphone: +33612345678 → +336****5678
export function maskPhone(phone: string): string {
  return phone.substring(0, 4) + "****" + phone.substring(phone.length - 4);
}
```

### 76.11 Sécurité Webhooks

#### Vérification Signature Stripe
```typescript
try {
  event = getStripe().webhooks.constructEvent(
    req.rawBody,
    sig,  // x-stripe-signature header
    webhookSecret
  );
} catch (err: any) {
  console.error('Webhook signature verification failed:', err.message);
  res.status(400).send('Webhook signature verification failed');
  return;
}
```

#### Vérification Secret MailWizz
```typescript
function verifyWebhookSecret(req: any): boolean {
  const receivedSecret = req.headers["x-webhook-secret"] as string;
  const expectedSecret = getMailWizzWebhookSecret();

  if (receivedSecret !== expectedSecret) {
    console.warn("⚠️ Webhook secret mismatch");
    return false;
  }
  return true;
}
```

### 76.12 Gestion Centralisée des Secrets

**Fichier:** `firebase/functions/src/lib/secrets.ts`

```typescript
// P0 CRITICAL: Single source of truth for Firebase secrets
// NEVER call defineSecret() in any other file!

// Twilio
export const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
export const TWILIO_AUTH_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
export const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");

// Stripe (multiple modes)
export const STRIPE_SECRET_KEY_LIVE = defineSecret("STRIPE_SECRET_KEY_LIVE");
export const STRIPE_SECRET_KEY_TEST = defineSecret("STRIPE_SECRET_KEY_TEST");
export const STRIPE_WEBHOOK_SECRET_LIVE = defineSecret("STRIPE_WEBHOOK_SECRET_LIVE");

// Encryption (GDPR)
export const ENCRYPTION_KEY = defineSecret("ENCRYPTION_KEY");

// Tasks authentication
export const TASKS_AUTH_SECRET = defineSecret("TASKS_AUTH_SECRET");

// Groupes par fonction
export const TWILIO_SECRETS = [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER];
export const STRIPE_SECRETS = [STRIPE_SECRET_KEY_LIVE, STRIPE_SECRET_KEY_TEST, ...];
```

### 76.13 Headers de Sécurité

**Fichier:** `firebase/functions/src/utils/security.ts`

```typescript
export function setSecurityHeaders(res: Response): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
}

export function applySecurityChecks(req: Request, res: Response, options = {}): boolean {
  setSecurityHeaders(res);
  if (!validateContentType(req, res)) return false;
  if (!validatePayloadSize(req, res, options.maxPayloadSize)) return false;
  return true;
}
```

### 76.14 Système d'Alertes Critiques

**Fichier:** `firebase/functions/src/monitoring/criticalAlerts.ts`

```typescript
// Catégories d'alertes
type AlertCategory = 'webhook' | 'backup' | 'payment' | 'security' | 'system';

// Niveaux de sévérité
type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';

// Seuils
const THRESHOLDS = {
  DLQ_PENDING_CRITICAL: 10,       // > 10 événements pending
  DLQ_FAILED_CRITICAL: 5,         // > 5 événements en échec permanent
  ERROR_RATE_PERCENT: 5,          // > 5% taux d'erreur
  BACKUP_AGE_HOURS: 48,           // > 48h sans backup
  DISPUTE_AMOUNT_EUR: 100         // > 100€ litige
};
```

#### Types d'Alertes Sécurité (15+)
```typescript
type SecurityAlertType =
  | 'security.brute_force_detected'
  | 'security.unusual_location'
  | 'security.suspicious_payment'
  | 'security.mass_account_creation'
  | 'security.api_abuse'
  | 'security.data_breach_attempt'
  | 'security.impossible_travel'
  | 'security.multiple_sessions'
  | 'security.card_testing'
  | 'security.promo_abuse'
  | 'security.sql_injection'
  | 'security.xss_attempt'
  | 'security.rate_limit_exceeded';
```

#### Actions Automatiques
```typescript
type AutomaticAction =
  | 'block_ip'
  | 'suspend_user'
  | 'rate_limit'
  | 'captcha_required'
  | 'mfa_required'
  | 'session_terminated'
  | 'notify_admin';
```

### 76.15 Audit Script Automatisé

**Fichier:** `security-audit/security-check.js`

**Vérifications automatisées:**
1. Disponibilité gcloud CLI
2. Énumération et analyse membres IAM
3. Découverte service accounts et rotation clés
4. Scan fichiers .env pour secrets exposés
5. Audit configuration Firebase Functions
6. Findings sécurité avec niveaux de sévérité
7. Recommandations de remédiation

### 76.16 HTTPS & Transport Security

**Fichier:** `.htaccess`

```apache
# Redirection HTTP → HTTPS (301)
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301,QSA]

# HSTS avec preload
Header set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
```

### 76.17 Security Policy Document

**Fichier:** `public/.well-known/security.txt`

```
# RFC 5589 compliant security policy
Contact: mailto:contact@sos-expat.com
Preferred-Languages: en, fr, es, de, pt, ru, zh, ar, hi
Policy: https://sos-expat.com/security-policy
Expires: 2030-12-31T23:59:59.000Z
```

### 76.18 Tableau Récapitulatif Contrôles Sécurité

| Catégorie | Statut | Fonctionnalités Clés |
|-----------|--------|----------------------|
| **CSRF** | ✅ Token-based | Firebase Auth tokens, CORS whitelist |
| **XSS** | ✅ Complet | DOMPurify, CSP headers, sanitization |
| **Validation Input** | ✅ Multi-couche | Content-Type, payload size, Zod schemas |
| **Rate Limiting** | ✅ Implémenté | Per-IP (3/h contact), in-memory cache |
| **Authentification** | ✅ Enterprise | Firebase Auth, custom claims, whitelist |
| **Autorisation** | ✅ RBAC | Firestore rules, prévention escalade |
| **Middleware** | ✅ Complet | Security headers, HSTS, CSP |
| **Firestore Rules** | ✅ Avancé | Protection champs financiers, path traversal |
| **Storage Rules** | ✅ Complet | Validation types fichiers, ownership, taille |
| **Chiffrement** | ✅ AES-256-GCM | Téléphones, PII hashing logs |
| **Webhooks** | ✅ Vérifié | Stripe HMAC, MailWizz secret |
| **Secrets** | ✅ Centralisé | Firebase Secret Manager, single source |
| **Monitoring** | ✅ Avancé | Alertes critiques, Slack/email, auto-actions |
| **Audit** | ✅ Automatisé | Script audit, IAM checking |
| **HTTPS/TLS** | ✅ Forcé | HTTP→HTTPS, HSTS preload |
| **Security Policy** | ✅ Publié | RFC 5589 .well-known/security.txt |

---

## CONCLUSION

Cette documentation couvre l'intégralité des **76 sections** des applications **SOS Expat** et **Outil IA SOS**, incluant:

- Architecture et structure projet
- Systèmes d'authentification et autorisation
- Gestion base de données Firestore
- 180+ Cloud Functions Firebase (détaillées)
- Intégrations paiement (Stripe Connect, PayPal)
- Système IA multi-modèles (Claude, GPT-4o, Perplexity)
- Notifications multi-canal
- Booking et synchronisation inter-applications
- Administration complète (75+ pages admin)
- Support multi-langue (9 langues)
- SEO optimisé pour moteurs et IA
- Système de planification temps réel
- Architecture multi-dashboard complète
- Système messagerie et chat IA complet
- Système pays et localisation complet
- Système email et notifications complet
- Système gestion état complet
- Système internationalisation complet
- Système gestion formulaires complet
- Système styling Tailwind CSS complet
- Constantes et configuration complètes
- Système d'authentification complet (SSO, Claims, Multi-provider)
- Système gestion documentaire complet (Storage, Backup, GDPR)
- Système gestion images et médias complet (Optimisation, Upload, Crop)
- Système déploiement et CI/CD complet (GitHub Actions, Firebase, Cloudflare)
- Middleware et protection API complet (Webhook, Circuit Breaker, Auth)
- Système gestion contenu complet (Help Center, FAQ, Traduction auto)
- Intégration Outil IA SOS externe (Webhook, SSO, Sync, Claude API)
- Fonctionnalités temps réel complètes (Listeners, FCM, Service Workers)
- Système Quote/Booking Request complet (Formulaire, Sync, AI Trigger, Dashboard)
- Référentiel complet API Routes (145+ endpoints, Stripe, PayPal, Twilio, Admin)
- Système inscription et onboarding partenaires (Stripe Connect, PayPal, KYC)
- Bibliothèque composants UI complète (122 composants, Design System, Accessibility)
- Patterns de fetching de données (Firestore, Cloud Functions, Caching, REST fallback)
- Catalogue complet Cloud Functions Firebase (180+ fonctions, 18 catégories, 2 projets)
- Système favoris et bookmarks (Dashboard, Offline Storage, Multilingue)
- **Fonctionnalités sécurité complètes (XSS, CSRF, AES-256, RBAC, Audit)**

**Statistiques finales:**
- 76 sections documentées
- 18145+ lignes de documentation
- 180+ Cloud Functions documentées
- 145+ API endpoints documentés
- 122 composants UI documentés
- Couverture complète des deux applications
- Guide complet pour tout développeur

---

*Document finalisé le 24 Janvier 2026*
*Version 7.6.0 - DOCUMENTATION COMPLETE FINALE - 76 Sections*
