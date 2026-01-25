# Dashboard Multi-Provider - Documentation Complète

> **Version**: 1.1.0
> **Dernière mise à jour**: 24 janvier 2025
> **Statut**: Production

---

## Accès Rapide

| Information | Valeur |
|-------------|--------|
| **URL** | https://sos-expat.com/multi-dashboard |
| **Mot de passe** | `MJMJsblanc19522008/*%` |
| **Session** | 24 heures (reconnexion automatique si cookie valide) |

---

## Table des Matières

**PARTIE 1 - GUIDE UTILISATEUR**
1. [Guide d'utilisation](#1-guide-dutilisation)

**PARTIE 2 - DOCUMENTATION TECHNIQUE**
2. [Vue d'ensemble technique](#2-vue-densemble-technique)
3. [Architecture technique](#3-architecture-technique)
4. [Authentification](#4-authentification)
5. [Chargement des données](#5-chargement-des-données)
6. [Interface utilisateur](#6-interface-utilisateur)
7. [Système de Chat Inline](#7-système-de-chat-inline)
8. [Génération automatique IA](#8-génération-automatique-ia)
9. [Accès SSO à l'Outil IA](#9-accès-sso-à-loutil-ia)
10. [Cloud Functions - Détails complets](#10-cloud-functions---détails-complets)
11. [Structure des données Firestore](#11-structure-des-données-firestore)
12. [Flux de données complet](#12-flux-de-données-complet)
13. [Sécurité](#13-sécurité)
14. [Déploiement](#14-déploiement)
15. [Troubleshooting](#15-troubleshooting)

---

# PARTIE 1 - GUIDE UTILISATEUR

---

## 1. Guide d'utilisation

### 1.1 Accès au Dashboard

**Étape 1**: Ouvrir l'URL dans un navigateur
```
https://sos-expat.com/multi-dashboard
```

**Étape 2**: Saisir le mot de passe
```
MJMJsblanc19522008/*%
```

**Étape 3**: Cliquer sur "Connexion"

> La session reste active pendant **24 heures**. Pas besoin de se reconnecter si le navigateur garde les cookies.

---

### 1.2 Navigation dans le Dashboard

#### Vue principale

Après connexion, vous voyez :

```
┌────────────────────────────────────────────────────────────────────┐
│  1. BARRE DE STATISTIQUES (en haut)                                 │
│     → Nombre de comptes, prestataires, demandes, etc.               │
│                                                                     │
│  2. LISTE DES COMPTES MULTI-PRESTATAIRES                           │
│     → Chaque carte représente UN compte qui gère plusieurs presta.  │
│                                                                     │
│     Pour chaque compte :                                            │
│     ├── Nom + Email du gestionnaire                                 │
│     ├── Liste des prestataires liés (avocats/aidants)               │
│     └── Liste des demandes récentes (booking requests)              │
└────────────────────────────────────────────────────────────────────┘
```

#### Comment identifier une nouvelle demande ?

Les **nouvelles demandes** (moins de 5 minutes) sont clairement visibles :

1. **Badge vert "NOUVEAU"** qui clignote
2. **Bordure verte** autour de la carte
3. **Compteur "En attente"** en haut qui pulse en orange

---

### 1.3 Actions disponibles sur chaque demande

Pour chaque booking request, vous avez **2 boutons** :

| Bouton | Couleur | Action |
|--------|---------|--------|
| **"Ouvrir le Chat"** | Vert | Ouvre le chat IA **directement dans le dashboard** (recommandé) |
| **"Outil IA"** | Gris | Ouvre l'outil IA complet dans un **nouvel onglet** |

---

### 1.4 Utiliser le Chat Inline

#### Ouvrir le chat

1. Trouvez la demande qui vous intéresse
2. Cliquez sur le bouton vert **"Ouvrir le Chat"**
3. Une fenêtre modale s'ouvre avec :
   - La **réponse IA auto-générée** (message initial)
   - L'historique des conversations précédentes (si existant)
   - Un champ pour écrire votre message

#### Envoyer un message

1. Tapez votre message dans le champ en bas
2. Appuyez sur **Entrée** pour envoyer
3. Pour un retour à la ligne : **Shift + Entrée**

#### Fermer le chat

Cliquez sur la croix **X** en haut à droite ou cliquez en dehors de la fenêtre.

---

### 1.5 Comprendre les réponses IA auto-générées

Quand une nouvelle demande arrive :

1. Le système **détecte automatiquement** que le prestataire fait partie d'un compte multi
2. **Claude 3.5 Sonnet** génère une réponse de bienvenue personnalisée
3. La réponse apparaît dans la carte avec :
   - Le **contenu** de la réponse
   - Le **modèle** utilisé (`claude-3-5-sonnet`)
   - Le **nombre de tokens** consommés

> **Note**: Cette réponse est générée automatiquement, vous n'avez rien à faire.

---

### 1.6 Rafraîchir les données

Pour voir les nouvelles demandes :

1. Cliquez sur le bouton **"Rafraîchir"** en haut à droite
2. Ou rechargez la page (F5)

> Les données ne se mettent **pas à jour automatiquement** en temps réel. Il faut rafraîchir manuellement.

---

### 1.7 Se déconnecter

Cliquez sur le bouton **"Déconnexion"** en haut à droite.

Vous serez redirigé vers l'écran de connexion.

---

### 1.8 Workflow typique quotidien

```
MATIN
├── 1. Ouvrir https://sos-expat.com/multi-dashboard
├── 2. Se connecter (si session expirée)
├── 3. Vérifier le compteur "En attente"
└── 4. Pour chaque nouvelle demande :
        ├── Lire les infos client
        ├── Lire la réponse IA auto-générée
        └── Cliquer "Ouvrir le Chat" si besoin de répondre

DURANT LA JOURNÉE
├── Rafraîchir régulièrement (bouton ou F5)
└── Traiter les nouvelles demandes au fur et à mesure

SOIR
└── Se déconnecter (optionnel, session expire après 24h)
```

---

### 1.9 FAQ Utilisateur

**Q: Je ne vois pas les nouvelles demandes ?**
> Cliquez sur "Rafraîchir" ou rechargez la page.

**Q: Le mot de passe ne fonctionne pas ?**
> Vérifiez qu'il n'y a pas d'espace avant/après. Le mot de passe est : `MJMJsblanc19522008/*%`

**Q: Comment savoir quel prestataire a reçu la demande ?**
> Le nom du prestataire est affiché sur chaque carte de demande avec une icône (balance = avocat, globe = aidant).

**Q: Puis-je voir les demandes de tous les prestataires d'un coup ?**
> Oui, toutes les demandes de tous les prestataires liés à un compte sont regroupées sous ce compte.

**Q: La réponse IA n'est pas apparue ?**
> Attendez 10-30 secondes et rafraîchissez. Si toujours rien, vérifiez dans les logs Firebase (section Troubleshooting).

**Q: Comment accéder à l'historique complet d'un prestataire ?**
> Cliquez sur "Outil IA" pour ouvrir ia.sos-expat.com avec l'accès complet.

---

# PARTIE 2 - DOCUMENTATION TECHNIQUE

---

## 2. Vue d'ensemble technique

### Qu'est-ce que le Dashboard Multi-Provider ?

Le Dashboard Multi-Provider est une interface d'administration permettant de gérer **plusieurs comptes prestataires depuis un seul endroit**. Il est conçu pour les gestionnaires qui supervisent plusieurs avocats et/ou aidants expatriés sur la plateforme SOS-Expat.

### URL d'accès
```
https://sos-expat.com/multi-dashboard
```

### Mot de passe actuel
```
MJMJsblanc19522008/*%
```

### Fonctionnalités principales

| Fonctionnalité | Description |
|----------------|-------------|
| **Vue centralisée** | Affichage de tous les comptes ayant `linkedProviderIds` non vide |
| **Booking requests** | Visualisation des demandes avec tri par date décroissante |
| **Réponses IA auto-générées** | Génération automatique via **Claude 3.5 Sonnet** |
| **Chat inline** | Conversation IA directement dans le dashboard (pas de nouvel onglet) |
| **Statistiques** | Compteurs temps réel (comptes, prestataires, demandes, etc.) |
| **Accès SSO à l'outil IA** | Connexion directe à ia.sos-expat.com via Custom Token Firebase |

---

## 3. Architecture technique

### Projets Firebase impliqués

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE GLOBALE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────┐      ┌──────────────────────────┐     │
│  │  sos-urgently-ac307      │      │  outils-sos-expat        │     │
│  │  (Projet Firebase #1)    │      │  (Projet Firebase #2)    │     │
│  │                          │      │                          │     │
│  │  Collections:            │      │  Collections:            │     │
│  │  - users                 │◄────►│  - providers             │     │
│  │  - sos_profiles          │      │  - bookings              │     │
│  │  - booking_requests      │      │  - conversations         │     │
│  │                          │      │  - auditLogs             │     │
│  │                          │      │  - admin_config          │     │
│  │                          │      │                          │     │
│  │                          │      │  Cloud Functions:        │     │
│  │                          │      │  - validateDashboardPwd  │     │
│  │                          │      │  - getMultiDashboardData │     │
│  │                          │      │  - onBookingCreatedAi    │     │
│  │                          │      │  - generateOutilToken    │     │
│  │                          │      │  - getProviderConversations│   │
│  │                          │      │  - sendMultiDashboardMsg │     │
│  └──────────────────────────┘      └──────────────────────────┘     │
│              ▲                                  ▲                    │
│              │                                  │                    │
│              │                                  │                    │
│  ┌───────────┴──────────────────────────────────┴───────────────┐   │
│  │                     sos-expat.com                             │   │
│  │                     (Frontend React)                          │   │
│  │                                                               │   │
│  │  Route: /multi-dashboard                                      │   │
│  │  Hébergement: Cloudflare Pages                                │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Stack technique détaillé

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Frontend | React + TypeScript | 18.x |
| Build tool | Vite | 5.4.x |
| Styling | Tailwind CSS | 3.x |
| Backend | Firebase Cloud Functions v2 | Node 20 |
| Base de données | Firestore | - |
| IA | Anthropic Claude | claude-3-5-sonnet-20241022 |
| Hébergement frontend | Cloudflare Pages | - |
| Région Firebase | europe-west1 | - |
| Secret Manager | Google Cloud Secret Manager | - |

### Arborescence des fichiers

```
sos-expat-project/
│
├── sos/                                         # Frontend React
│   └── src/
│       ├── hooks/
│       │   └── useMultiProviderDashboard.ts     # Hook principal (547 lignes)
│       │
│       └── pages/
│           └── MultiProviderDashboard/
│               ├── index.tsx                     # Page principale
│               ├── PasswordGate.tsx              # Écran de login
│               ├── AccountCard.tsx               # Carte compte
│               ├── BookingRequestCard.tsx        # Carte booking
│               ├── ProviderBadge.tsx             # Badge prestataire
│               ├── AiResponseDisplay.tsx         # Affichage réponse IA
│               └── ChatPanel.tsx                 # Panneau de chat inline
│
└── Outil-sos-expat/                             # Cloud Functions
    └── functions/src/
        └── multiDashboard/
            ├── index.ts                          # Exports du module
            ├── validateDashboardPassword.ts      # Auth (155 lignes)
            ├── getMultiDashboardData.ts          # Données (236 lignes)
            ├── onBookingCreatedGenerateAi.ts     # Trigger IA (278 lignes)
            ├── generateMultiDashboardOutilToken.ts  # SSO (173 lignes)
            └── getProviderConversations.ts       # Chat (324 lignes)
```

---

## 4. Authentification

### Mécanisme exact

L'authentification utilise un **mot de passe stocké dans Google Cloud Secret Manager**, comparé en texte clair (pas de hash bcrypt actuellement).

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUX D'AUTHENTIFICATION DÉTAILLÉ                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [Utilisateur]                                                       │
│       │                                                              │
│       │ Saisit mot de passe                                          │
│       ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Frontend: useMultiProviderDashboard.ts                       │    │
│  │                                                              │    │
│  │ 1. Appelle httpsCallable(outilsFunctions,                    │    │
│  │    'validateDashboardPassword')                              │    │
│  │                                                              │    │
│  │ Note: outilsFunctions pointe vers le projet                  │    │
│  │       outils-sos-expat (app Firebase secondaire)             │    │
│  └────────────────────────┬────────────────────────────────────┘    │
│                           │                                          │
│                           ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Cloud Function: validateDashboardPassword                    │    │
│  │ Fichier: validateDashboardPassword.ts                        │    │
│  │                                                              │    │
│  │ 1. Valide input (password doit être string non vide)         │    │
│  │                                                              │    │
│  │ 2. Vérifie si dashboard enabled:                             │    │
│  │    db.doc("admin_config/multi_dashboard").get()              │    │
│  │    → config.enabled doit être true                           │    │
│  │                                                              │    │
│  │ 3. Récupère le secret:                                       │    │
│  │    MULTI_DASHBOARD_PASSWORD.value().trim()                   │    │
│  │    (depuis Google Cloud Secret Manager)                      │    │
│  │                                                              │    │
│  │ 4. Compare en texte clair:                                   │    │
│  │    if (password !== storedPassword) → échec                  │    │
│  │                                                              │    │
│  │ 5. Si succès, génère token:                                  │    │
│  │    token = `mds_${Date.now()}_${Math.random()...}`           │    │
│  │    Format: mds_1706123456789_abc123def456                    │    │
│  │                                                              │    │
│  │ 6. Log audit dans Firestore:                                 │    │
│  │    auditLogs.add({ action: "multi_dashboard_auth_success" }) │    │
│  │                                                              │    │
│  │ 7. Retourne: { success: true, token, expiresAt }             │    │
│  └────────────────────────┬────────────────────────────────────┘    │
│                           │                                          │
│                           ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Frontend: Stockage session                                   │    │
│  │                                                              │    │
│  │ localStorage.setItem('multi_dashboard_session', JSON.stringify({│  │
│  │   authenticated: true,                                       │    │
│  │   expiresAt: Date.now() + 24h,                               │    │
│  │   token: "mds_xxx..."                                        │    │
│  │ }))                                                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Secret Google Cloud

```bash
# Nom du secret
MULTI_DASHBOARD_PASSWORD

# Valeur actuelle
MJMJsblanc19522008/*%

# Accès via defineSecret dans Cloud Function
const MULTI_DASHBOARD_PASSWORD = defineSecret("MULTI_DASHBOARD_PASSWORD");
```

### Durée de session

```typescript
// Défaut: 24 heures
const sessionDuration = (config.sessionDurationHours || 24) * 60 * 60 * 1000;

// Peut être configuré dans Firestore:
// admin_config/multi_dashboard { sessionDurationHours: 48 }
```

### Format du token de session

```
mds_<timestamp>_<random>

Exemple: mds_1706123456789_k4m9xp2qr8
         │    │              │
         │    │              └── 13 caractères aléatoires (base36)
         │    └── Timestamp en millisecondes
         └── Préfixe fixe (Multi Dashboard Session)
```

### Validation du token dans les autres fonctions

```typescript
// Toutes les Cloud Functions vérifient ce pattern:
if (!sessionToken ||
    typeof sessionToken !== "string" ||
    !sessionToken.startsWith("mds_")) {
  throw new HttpsError("unauthenticated", "Invalid session token");
}
```

---

## 5. Chargement des données

### Cloud Function: getMultiDashboardData

**Fichier**: `getMultiDashboardData.ts` (236 lignes)

### Algorithme exact

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ALGORITHME DE CHARGEMENT                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. VALIDATION TOKEN                                                 │
│     └── Vérifie format "mds_*"                                       │
│                                                                      │
│  2. CHARGEMENT DES USERS                                             │
│     └── db.collection("users").get()                                 │
│         → Charge TOUS les documents (pas de filtre)                  │
│                                                                      │
│  3. POUR CHAQUE USER:                                                │
│     │                                                                │
│     ├── a. Extraire linkedProviderIds[]                              │
│     │      const linkedIds = userData.linkedProviderIds || []        │
│     │                                                                │
│     ├── b. SKIP si linkedIds.length === 0                            │
│     │      → Seuls les comptes multi-prestataires sont inclus        │
│     │                                                                │
│     ├── c. POUR CHAQUE providerId dans linkedIds:                    │
│     │      │                                                         │
│     │      └── Charger le profil:                                    │
│     │          db.collection("sos_profiles").doc(pid).get()          │
│     │          │                                                     │
│     │          └── Construire objet Provider:                        │
│     │              {                                                 │
│     │                id: pid,                                        │
│     │                name: displayName || firstName || "N/A",        │
│     │                email: email || "",                             │
│     │                type: type || "lawyer",                         │
│     │                isActive: userData.activeProviderId === pid,    │
│     │                isOnline: isOnline === true,                    │
│     │                availability: availability || "offline",        │
│     │                country: country,                               │
│     │                avatar: photoURL || avatar                      │
│     │              }                                                 │
│     │                                                                │
│     └── d. POUR CHAQUE provider:                                     │
│            │                                                         │
│            └── Charger les booking_requests:                         │
│                db.collection("booking_requests")                     │
│                  .where("providerId", "==", provider.id)             │
│                  .orderBy("createdAt", "desc")                       │
│                  .limit(50)                                          │
│                  .get()                                              │
│                                                                      │
│  4. TRI FINAL                                                        │
│     └── accounts.sort((a, b) => b.providers.length - a.providers.length)│
│         → Comptes avec le plus de prestataires en premier            │
│                                                                      │
│  5. RETOUR                                                           │
│     └── { success: true, accounts: [...] }                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Collections Firestore accédées

| Collection | Projet | Utilisation |
|------------|--------|-------------|
| `users` | outils-sos-expat | Liste des comptes avec `linkedProviderIds` |
| `sos_profiles` | outils-sos-expat | Détails des prestataires |
| `booking_requests` | outils-sos-expat | Demandes de service |

### Structure de données retournée

```typescript
interface GetDataResponse {
  success: boolean;
  accounts?: MultiProviderAccount[];
  error?: string;
}

interface MultiProviderAccount {
  userId: string;           // ID du document users
  email: string;            // userData.email
  displayName: string;      // userData.displayName ou firstName + lastName
  shareBusyStatus: boolean; // userData.shareBusyStatus === true
  providers: Provider[];    // Détails de chaque prestataire lié
  bookingRequests: BookingRequest[];  // Toutes les demandes (triées par date)
  activeProviderId?: string;  // userData.activeProviderId
}

interface Provider {
  id: string;
  name: string;
  email: string;
  type: 'lawyer' | 'expat';
  isActive: boolean;        // true si c'est le provider actif
  isOnline: boolean;
  availability: string;     // "available" | "busy" | "offline"
  country?: string;
  avatar?: string;
}

interface BookingRequest {
  id: string;
  providerId: string;
  providerName?: string;
  providerType?: string;
  clientId: string;
  clientName: string;       // Construit: clientName || firstName + lastName || "Client"
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
  description: string;
  status: string;           // "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"
  createdAt: string;        // ISO 8601
  updatedAt?: string;       // ISO 8601
  aiResponse?: {
    content: string;
    generatedAt: string;    // ISO 8601
    model: string;          // Ex: "claude-3-5-sonnet-20241022"
    tokensUsed?: number;
    source: string;         // "multi_dashboard_auto" | "manual"
  };
  aiProcessedAt?: string;   // ISO 8601
}
```

---

## 6. Interface utilisateur

### Maquette ASCII complète

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER (sticky top-0 z-50)                                              │
│  ┌──────┐  Dashboard Multi-Prestataires       [Rafraîchir] [Déconnexion] │
│  │ Logo │  SOS-Expat Administration                                      │
│  │Users │                                                                │
│  └──────┘                                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STATISTIQUES (grid grid-cols-2 lg:grid-cols-5)                         │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │ ┌───┐     │ │ ┌───┐     │ │ ┌───┐     │ │ ┌───┐     │ │ ┌───┐     │ │
│  │ │ 👥│  2  │ │ │ 📈│  5  │ │ │ 💬│ 12  │ │ │ ⏰│  3  │ │ │ 🤖│ 10  │ │
│  │ └───┘     │ │ └───┘     │ │ └───┘     │ │ └───┘     │ │ └───┘     │ │
│  │ Comptes   │ │Prestataires│ │ Demandes │ │En attente │ │Réponses IA│ │
│  │   blue    │ │  purple    │ │   gray   │ │amber+pulse│ │   green   │ │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ACCOUNTS (space-y-6)                                                    │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ ACCOUNT CARD (bg-white rounded-2xl)                                │  │
│  │                                                                    │  │
│  │ ┌──────┐  Jean-Michel Dupont      [3 👥] [2 ⏰ pulse] [5 ⏱]  [▼] │  │
│  │ │Avatar│  jm.dupont@email.com     │presta│ │attente │  │total│     │  │
│  │ │ red  │  [🔗 Sync]               └──────┘ └────────┘  └─────┘     │  │
│  │ └──────┘                                                           │  │
│  │                                                                    │  │
│  │ ┌─────────────────────────────────────────────────────────────┐   │  │
│  │ │ PROVIDERS SECTION (bg-gray-50)                               │   │  │
│  │ │ 👥 Prestataires liés                                         │   │  │
│  │ │                                                              │   │  │
│  │ │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │   │  │
│  │ │ │ PROVIDER BADGE  │ │ PROVIDER BADGE  │ │ PROVIDER BADGE  │ │   │  │
│  │ │ │ ┌────┐          │ │ ┌────┐          │ │ ┌────┐          │ │   │  │
│  │ │ │ │ JM │ Me Martin│ │ │ PD │ Me Durand│ │ │ SL │ S. Leblanc│ │   │  │
│  │ │ │ └────┘ ⚖ Avocat │ │ └────┘ ⚖ Avocat │ │ └────┘ 🌍 Aidant │ │   │  │
│  │ │ │ France          │ │ Belgique        │ │ Canada          │ │   │  │
│  │ │ │ [🟢 Disponible] │ │ [🟠 Occupé]     │ │ [⚫ Hors ligne] │ │   │  │
│  │ │ └─────────────────┘ └─────────────────┘ └─────────────────┘ │   │  │
│  │ └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                    │  │
│  │ ┌─────────────────────────────────────────────────────────────┐   │  │
│  │ │ BOOKINGS SECTION (p-6)                                       │   │  │
│  │ │ 💬 Demandes récentes  [2 en attente]                         │   │  │
│  │ │                                                              │   │  │
│  │ │ ┌─────────────────────────────────────────────────────────┐ │   │  │
│  │ │ │ BOOKING REQUEST CARD                                     │ │   │  │
│  │ │ │ (border-green-300 ring-2 ring-green-200 si < 5min)      │ │   │  │
│  │ │ │                                                          │ │   │  │
│  │ │ │ ┌────┐ Jean Dupont [NOUVEAU]           [🟡 En attente]  │ │   │  │
│  │ │ │ │User│ 📍 France | 📱 +33 6 12 34 56      ⏰ Il y a 5 min │ │   │  │
│  │ │ │ └────┘                                                   │ │   │  │
│  │ │ │                                                          │ │   │  │
│  │ │ │ [📄 Appel Avocat] [⚖ Me Martin] [🗣 FR, EN]              │ │   │  │
│  │ │ │                                                          │ │   │  │
│  │ │ │ Besoin d'aide pour un visa de travail en Allemagne...    │ │   │  │
│  │ │ │                                                          │ │   │  │
│  │ │ │ ┌────────────────────────────────────────────────────┐  │ │   │  │
│  │ │ │ │ AI RESPONSE (gradient blue/indigo)                  │  │ │   │  │
│  │ │ │ │                                                     │  │ │   │  │
│  │ │ │ │ ✨ Réponse IA                                       │  │ │   │  │
│  │ │ │ │                                                     │  │ │   │  │
│  │ │ │ │ Bonjour Jean, je suis ravi de recevoir votre        │  │ │   │  │
│  │ │ │ │ demande. Je comprends l'importance de votre         │  │ │   │  │
│  │ │ │ │ projet de visa...                                   │  │ │   │  │
│  │ │ │ │                                                     │  │ │   │  │
│  │ │ │ │ claude-3-5-sonnet • 245 tokens         [▼ Voir +]  │  │ │   │  │
│  │ │ │ └────────────────────────────────────────────────────┘  │ │   │  │
│  │ │ │                                                          │ │   │  │
│  │ │ │ ┌─────────────────────────┐ ┌───────────────────────┐   │ │   │  │
│  │ │ │ │ 💬 Ouvrir le Chat      │ │ ↗ Outil IA            │   │ │   │  │
│  │ │ │ │    (green gradient)     │ │   (gray secondary)    │   │ │   │  │
│  │ │ │ └─────────────────────────┘ └───────────────────────┘   │ │   │  │
│  │ │ │                                                          │ │   │  │
│  │ │ │ [▼ Voir tous les détails]                                │ │   │  │
│  │ │ └─────────────────────────────────────────────────────────┘ │   │  │
│  │ │                                                              │   │  │
│  │ │ [Voir toutes les demandes (12)]                              │   │  │
│  │ └─────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Couleurs des statuts

| Statut | Badge | Point |
|--------|-------|-------|
| `pending` | bg-amber-100 text-amber-700 | bg-amber-500 |
| `confirmed` | bg-blue-100 text-blue-700 | bg-blue-500 |
| `in_progress` | bg-purple-100 text-purple-700 | bg-purple-500 |
| `completed` | bg-green-100 text-green-700 | bg-green-500 |
| `cancelled` | bg-red-100 text-red-700 | bg-red-500 |

### Indicateurs visuels spéciaux

```typescript
// Badge "NOUVEAU" - apparaît si demande < 5 minutes
const isNew = Date.now() - booking.createdAt.getTime() < 5 * 60 * 1000;

// Si nouveau:
// - Badge vert animé "NOUVEAU" avec animate-pulse
// - Bordure verte: border-green-300 ring-2 ring-green-200

// Statut "En attente" dans stats:
// - Animation pulse sur toute la carte
```

---

## 7. Système de Chat Inline

### Vue du ChatPanel

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CHAT PANEL (Modal - fixed inset-0 z-50)                                 │
│  Backdrop: bg-black/50 backdrop-blur-sm                                  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Container: max-w-2xl h-[80vh] rounded-2xl                          │  │
│  │                                                                    │  │
│  │ ┌─────────────────────────────────────────────────────────────┐   │  │
│  │ │ HEADER (gradient from-blue-600 to-indigo-600)                │   │  │
│  │ │                                                              │   │  │
│  │ │ ┌────┐  Chat IA - Me Martin  [Avocat]              [X]      │   │  │
│  │ │ │ 🤖 │  3 conversations                                      │   │  │
│  │ │ └────┘                                                       │   │  │
│  │ └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                    │  │
│  │ ┌─────────────────────────────────────────────────────────────┐   │  │
│  │ │ CONVERSATION SELECTOR (si > 1 conversation)                  │   │  │
│  │ │ bg-gray-50                                                   │   │  │
│  │ │                                                              │   │  │
│  │ │ [Conv. 1 (5 msg)] [Conv. 2 (3 msg)] [Conv. 3 (8 msg)]       │   │  │
│  │ │   ↑ active                                                   │   │  │
│  │ │   blue-100                                                   │   │  │
│  │ └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                    │  │
│  │ ┌─────────────────────────────────────────────────────────────┐   │  │
│  │ │ MESSAGES AREA (flex-1 overflow-y-auto p-4 space-y-4)         │   │  │
│  │ │                                                              │   │  │
│  │ │  ┌────────────────────────────────────────────────────────┐ │   │  │
│  │ │  │ Initial AI Message (si initialMessage fourni)          │ │   │  │
│  │ │  │                                                        │ │   │  │
│  │ │  │ ┌────┐ Bonjour Jean, je suis ravi de recevoir...       │ │   │  │
│  │ │  │ │ ✨ │                                                  │ │   │  │
│  │ │  │ └────┘ [✨ Réponse auto-générée]                       │ │   │  │
│  │ │  │        bg-gradient blue-50 to indigo-50                │ │   │  │
│  │ │  │        border-blue-200                                 │ │   │  │
│  │ │  └────────────────────────────────────────────────────────┘ │   │  │
│  │ │                                                              │   │  │
│  │ │  ┌────────────────────────────────────────────────────────┐ │   │  │
│  │ │  │ User Message (flex-row-reverse)                        │ │   │  │
│  │ │  │                                                        │ │   │  │
│  │ │  │        Pouvez-vous me donner plus de détails ? ┌────┐ │ │   │  │
│  │ │  │                                                 │ 👤 │ │ │   │  │
│  │ │  │        ⏰ Il y a 2 min                          └────┘ │ │   │  │
│  │ │  │        bg-blue-600 text-white rounded-tr-sm            │ │   │  │
│  │ │  └────────────────────────────────────────────────────────┘ │   │  │
│  │ │                                                              │   │  │
│  │ │  ┌────────────────────────────────────────────────────────┐ │   │  │
│  │ │  │ Assistant Message                                      │ │   │  │
│  │ │  │                                                        │ │   │  │
│  │ │  │ ┌────┐ Bien sûr, pour un visa de travail...           │ │   │  │
│  │ │  │ │ 🤖 │                                                  │ │   │  │
│  │ │  │ └────┘ ⏰ Il y a 1 min • claude-3-5-sonnet             │ │   │  │
│  │ │  │        bg-gray-100 rounded-tl-sm                       │ │   │  │
│  │ │  └────────────────────────────────────────────────────────┘ │   │  │
│  │ │                                                              │   │  │
│  │ │  <div ref={messagesEndRef} /> ← auto-scroll here            │   │  │
│  │ └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                    │  │
│  │ ┌─────────────────────────────────────────────────────────────┐   │  │
│  │ │ INPUT AREA (bg-gray-50)                                      │   │  │
│  │ │                                                              │   │  │
│  │ │ ┌─────────────────────────────────────────────────┐ ┌────┐  │   │  │
│  │ │ │ Écrivez votre message...                        │ │ ➤  │  │   │  │
│  │ │ │ (textarea rows=1 maxHeight=120px)               │ │    │  │   │  │
│  │ │ └─────────────────────────────────────────────────┘ └────┘  │   │  │
│  │ │                                                              │   │  │
│  │ │ Entrée pour envoyer, Shift+Entrée pour nouvelle ligne       │   │  │
│  │ └─────────────────────────────────────────────────────────────┘   │  │
│  │                                                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cloud Functions du Chat

#### getProviderConversations

```typescript
// Fichier: getProviderConversations.ts

// Requête
interface GetConversationsRequest {
  sessionToken: string;     // Doit commencer par "mds_"
  providerId: string;       // ID du prestataire
  bookingRequestId?: string; // Optionnel: filtrer par booking
  limit?: number;           // Défaut: 20
}

// Réponse
interface GetConversationsResponse {
  success: boolean;
  conversations?: Conversation[];
  error?: string;
}

// Requête Firestore:
db.collection("conversations")
  .where("providerId", "==", providerId)
  .orderBy("updatedAt", "desc")
  .limit(limit)

// Pour chaque conversation, charge les messages:
doc.ref.collection("messages")
  .orderBy("createdAt", "asc")
  .limit(50)
```

#### sendMultiDashboardMessage

```typescript
// Fichier: getProviderConversations.ts (même fichier)

// Requête
interface SendMessageRequest {
  sessionToken: string;
  providerId: string;
  conversationId?: string;   // Si absent, crée nouvelle conversation
  message: string;
  bookingRequestId?: string;
}

// Réponse
interface SendMessageResponse {
  success: boolean;
  conversationId?: string;
  aiResponse?: string;  // Non implémenté actuellement
  model?: string;
  error?: string;
}

// Actions:
// 1. Si pas de conversationId: crée nouvelle conversation
// 2. Ajoute le message user dans la sous-collection messages
// 3. Met à jour updatedAt et messagesCount
// 4. Note: PAS de génération de réponse IA automatique (future feature)
```

### Gestion d'état du chat (Frontend)

```typescript
// Dans index.tsx

interface ChatState {
  isOpen: boolean;
  providerId: string;
  providerName: string;
  providerType?: 'lawyer' | 'expat';
  bookingRequestId?: string;
  initialMessage?: string;   // Réponse IA auto-générée du booking
}

// Hook returns:
const {
  conversations,       // ChatConversation[]
  chatLoading,         // boolean
  loadConversations,   // (providerId: string) => Promise<void>
  sendMessage,         // (providerId, message, conversationId?, bookingRequestId?) => Promise<void>
  clearConversations,  // () => void
} = useMultiProviderDashboard();
```

---

## 8. Génération automatique IA

### Trigger Firestore: onBookingRequestCreatedGenerateAi

**Fichier**: `onBookingCreatedGenerateAi.ts` (278 lignes)

### Modèle IA utilisé

```
Claude 3.5 Sonnet
Model ID: claude-3-5-sonnet-20241022
API: Anthropic API (api.anthropic.com)
```

> **ATTENTION**: Le document initial mentionnait GPT-4o-mini, mais le code utilise réellement **Claude 3.5 Sonnet** via l'API Anthropic.

### Flux de déclenchement

```
┌─────────────────────────────────────────────────────────────────────────┐
│              TRIGGER onBookingRequestCreatedGenerateAi                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  DÉCLENCHEUR                                                             │
│  └── onDocumentCreated("booking_requests/{bookingId}")                   │
│                                                                          │
│  CONDITIONS DE SKIP (retour immédiat si):                                │
│  1. booking.aiResponse existe déjà                                       │
│  2. booking.aiProcessedAt existe déjà                                    │
│  3. Le provider n'est PAS dans un compte multi-provider                  │
│                                                                          │
│  VÉRIFICATION MULTI-PROVIDER:                                            │
│  └── db.collection("users")                                              │
│        .where("linkedProviderIds", "array-contains", providerId)         │
│        .limit(1)                                                         │
│        .get()                                                            │
│      → Si résultat vide = pas un multi-provider = SKIP                   │
│                                                                          │
│  GÉNÉRATION IA:                                                          │
│  └── Appel API Anthropic avec le prompt suivant                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Prompt EXACT utilisé

```typescript
const prompt = `Tu es un assistant pour SOS-Expat, une plateforme qui met en relation des expatriés avec des avocats et aidants.

Un nouveau client vient de faire une demande de service. Génère une première réponse professionnelle et chaleureuse.

Contexte:
- Nom client: ${context.clientName}
- Pays actuel: ${context.clientCountry || "Non spécifié"}
- Type de service: ${context.serviceType || "Consultation"}
- Type de prestataire: ${providerRole}
${context.title ? `- Sujet: ${context.title}` : ""}

Instructions:
1. Salue le client par son nom
2. Confirme la réception de sa demande
3. Explique brièvement les prochaines étapes
4. Rassure sur la confidentialité
5. ${languageInstruction}

Format: Réponse directe, professionnelle, 3-4 phrases maximum. Pas de formatage markdown.`;
```

### Variables du prompt

```typescript
// Type de prestataire
const providerRole = context.providerType === "lawyer"
  ? "un avocat spécialisé"
  : "un aidant expatrié expérimenté";

// Langue de réponse (basée sur clientLanguages[0])
const languageInstruction = primaryLanguage.startsWith("en")
  ? "Respond in English."
  : primaryLanguage.startsWith("es")
    ? "Respond in Spanish."
    : primaryLanguage.startsWith("de")
      ? "Respond in German."
      : "Respond in French.";
```

### Configuration de l'appel API

```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,              // ANTHROPIC_API_KEY secret
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 500,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  }),
});
```

### Stockage de la réponse

```typescript
// Mise à jour du document booking_request
await snap.ref.update({
  aiResponse: {
    content: aiResult.text,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    model: aiResult.model,        // "claude-3-5-sonnet-20241022"
    tokensUsed: aiResult.tokensUsed,
    source: "multi_dashboard_auto",
  },
  aiProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

### Gestion des erreurs

```typescript
// En cas d'erreur, marque le booking comme échoué sans bloquer
await snap.ref.update({
  aiError: errorMessage,
  aiErrorAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

---

## 9. Accès SSO à l'Outil IA

### Cloud Function: generateMultiDashboardOutilToken

**Fichier**: `generateMultiDashboardOutilToken.ts` (173 lignes)

### Mécanisme SSO

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       FLUX SSO VERS OUTIL IA                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. CLICK "Outil IA" dans le dashboard                                   │
│     │                                                                    │
│     ▼                                                                    │
│  2. Appel Cloud Function: generateMultiDashboardOutilToken               │
│     │                                                                    │
│     │ Paramètres:                                                        │
│     │ - sessionToken: "mds_xxx..."                                       │
│     │ - providerId: "abc123"                                             │
│     │                                                                    │
│     ▼                                                                    │
│  3. VÉRIFICATIONS:                                                       │
│     │                                                                    │
│     ├── a. Token session valide (format mds_*)                           │
│     │                                                                    │
│     ├── b. Provider existe dans sos_profiles                             │
│     │      db.collection("sos_profiles").doc(providerId).get()           │
│     │                                                                    │
│     └── c. Provider lié à un compte multi-provider                       │
│            db.collection("users")                                        │
│              .where("linkedProviderIds", "array-contains", providerId)   │
│                                                                          │
│     ▼                                                                    │
│  4. GÉNÉRATION CUSTOM TOKEN Firebase                                     │
│     │                                                                    │
│     │ const customToken = await auth.createCustomToken(providerId, {     │
│     │   provider: true,                                                  │
│     │   providerType: "lawyer" | "expat",                                │
│     │   subscriptionTier: "unlimited",                                   │
│     │   subscriptionStatus: "active",                                    │
│     │   forcedAccess: true,                                              │
│     │   multiDashboardAccess: true,                                      │
│     │   email: "provider@email.com",                                     │
│     │   tokenGeneratedAt: Date.now()                                     │
│     │ });                                                                │
│     │                                                                    │
│     ▼                                                                    │
│  5. CONSTRUCTION URL SSO                                                 │
│     │                                                                    │
│     │ const ssoUrl = `https://ia.sos-expat.com/auth?token=${token}`;     │
│     │                                                                    │
│     ▼                                                                    │
│  6. RETOUR AU FRONTEND                                                   │
│     │                                                                    │
│     │ { success: true, token, ssoUrl, expiresIn: 3600 }                  │
│     │                                                                    │
│     ▼                                                                    │
│  7. OUVERTURE NOUVEL ONGLET                                              │
│     │                                                                    │
│     │ window.open(ssoUrl, '_blank', 'noopener,noreferrer')               │
│     │                                                                    │
│     ▼                                                                    │
│  8. ia.sos-expat.com/auth                                                │
│     │                                                                    │
│     └── signInWithCustomToken(auth, token)                               │
│         → Utilisateur connecté comme le prestataire                      │
│         → Claims donnent accès illimité                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Custom Claims accordés

| Claim | Valeur | Description |
|-------|--------|-------------|
| `provider` | `true` | Identifie comme prestataire |
| `providerType` | `"lawyer"` ou `"expat"` | Type de prestataire |
| `subscriptionTier` | `"unlimited"` | Niveau d'abonnement |
| `subscriptionStatus` | `"active"` | Statut actif |
| `forcedAccess` | `true` | Bypass des vérifications d'abonnement |
| `multiDashboardAccess` | `true` | Accès via multi-dashboard |
| `email` | Email du provider | Pour affichage |
| `tokenGeneratedAt` | Timestamp | Pour tracking |

---

## 10. Cloud Functions - Détails complets

### Configuration commune

```typescript
{
  region: "europe-west1",
  cors: [
    "https://sos-expat.com",
    "https://www.sos-expat.com",
    "http://localhost:3000",
    "http://localhost:5173",
  ],
}
```

### Tableau récapitulatif

| Fonction | Type | Fichier | Lignes | Timeout | Memory | MaxInst |
|----------|------|---------|--------|---------|--------|---------|
| `validateDashboardPassword` | Callable | validateDashboardPassword.ts | 155 | 30s | default | 10 |
| `getMultiDashboardData` | Callable | getMultiDashboardData.ts | 236 | 60s | default | 10 |
| `onBookingRequestCreatedGenerateAi` | Trigger | onBookingCreatedGenerateAi.ts | 278 | 60s | 512MiB | 10 |
| `generateMultiDashboardOutilToken` | Callable | generateMultiDashboardOutilToken.ts | 173 | 30s | default | 10 |
| `getProviderConversations` | Callable | getProviderConversations.ts | 173 | 30s | default | 10 |
| `sendMultiDashboardMessage` | Callable | getProviderConversations.ts | 129 | 60s | default | 20 |

### Secrets utilisés

| Secret | Fonction(s) | Service |
|--------|-------------|---------|
| `MULTI_DASHBOARD_PASSWORD` | validateDashboardPassword | Google Cloud Secret Manager |
| `ANTHROPIC_API_KEY` | onBookingRequestCreatedGenerateAi | Google Cloud Secret Manager |

---

## 11. Structure des données Firestore

### Projet: outils-sos-expat

#### Collection: admin_config

```typescript
// Document: multi_dashboard
{
  enabled: boolean;           // true = dashboard actif
  sessionDurationHours?: number;  // Défaut: 24
}
```

#### Collection: users

```typescript
// Document: {userId}
{
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;

  // CRITIQUE pour multi-provider
  linkedProviderIds: string[];    // Array des IDs de prestataires liés
  activeProviderId?: string;      // ID du prestataire actuellement actif
  shareBusyStatus?: boolean;      // true = sync statut occupé entre providers

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Collection: sos_profiles

```typescript
// Document: {providerId}
{
  email: string;
  displayName?: string;
  firstName?: string;
  type: "lawyer" | "expat" | "client";

  // Statut
  isOnline: boolean;
  availability: "available" | "busy" | "offline";

  // Metadata
  country?: string;
  photoURL?: string;
  avatar?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Collection: booking_requests

```typescript
// Document: {bookingId}
{
  // Client
  clientId: string;
  clientName?: string;
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientCurrentCountry?: string;
  clientNationality?: string;
  clientLanguages?: string[];

  // Demande
  serviceType: string;
  title?: string;
  description?: string;

  // Provider
  providerId: string;
  providerName?: string;
  providerType?: "lawyer" | "expat";

  // Status
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

  // IA Auto-générée
  aiResponse?: {
    content: string;
    generatedAt: Timestamp;
    model: string;                    // "claude-3-5-sonnet-20241022"
    tokensUsed: number;
    source: "multi_dashboard_auto";
  };
  aiProcessedAt?: Timestamp;

  // En cas d'erreur IA
  aiError?: string;
  aiErrorAt?: Timestamp;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Collection: conversations

```typescript
// Document: {conversationId}
{
  providerId: string;
  providerType?: string;
  userId: string;               // Pour multi-dashboard = providerId

  status: "active" | "closed";
  source: "multi_dashboard";

  // Contexte booking (optionnel)
  bookingRequestId?: string;
  bookingContext?: {
    clientName?: string;
    country?: string;
    category?: string;
  };

  // Compteurs
  messagesCount: number;
  lastMessageAt: Timestamp;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Sous-collection: conversations/{id}/messages

```typescript
// Document: {messageId}
{
  role: "user" | "assistant";
  content: string;
  source: "multi_dashboard_admin";  // Source du message
  model?: string;                   // Pour assistant: "claude-3-5-sonnet-20241022"

  createdAt: Timestamp;
}
```

#### Collection: auditLogs

```typescript
// Document: auto-generated
{
  action: string;
  // Actions possibles:
  // - "multi_dashboard_auth_success"
  // - "multi_dashboard_auth_failed"
  // - "multi_dashboard_outil_token"

  ip?: string;
  providerId?: string;
  providerEmail?: string;
  ownerUserId?: string;
  sessionTokenPrefix?: string;    // "mds_xxxxx..."
  token?: string;                 // Partial token for logging
  expiresAt?: Date;

  timestamp: Timestamp;
}
```

---

## 12. Flux de données complet

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUX COMPLET END-TO-END                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 1: CRÉATION BOOKING                                         │   │
│  │                                                                   │   │
│  │  [Client sur sos-expat.com]                                       │   │
│  │         │                                                         │   │
│  │         │ Remplit formulaire de demande                           │   │
│  │         ▼                                                         │   │
│  │  [Laravel Backend]                                                │   │
│  │         │                                                         │   │
│  │         │ POST /api/webhook (ingestBooking)                       │   │
│  │         │ Headers: x-api-key: SOS_PLATFORM_API_KEY                │   │
│  │         ▼                                                         │   │
│  │  [Cloud Function: ingestBooking]                                  │   │
│  │         │                                                         │   │
│  │         │ Crée document dans booking_requests                     │   │
│  │         ▼                                                         │   │
│  │  [Firestore: booking_requests/{id}]                               │   │
│  │         │                                                         │   │
│  │         │ Document créé → déclenche trigger                       │   │
│  │         ▼                                                         │   │
│  │  [Trigger: onBookingRequestCreatedGenerateAi]                     │   │
│  │         │                                                         │   │
│  │         ├── 1. Vérifie: provider dans compte multi?               │   │
│  │         │      users.where("linkedProviderIds", "array-contains") │   │
│  │         │                                                         │   │
│  │         ├── 2. Si oui: appel API Anthropic (Claude 3.5 Sonnet)    │   │
│  │         │                                                         │   │
│  │         └── 3. Stocke réponse dans booking_requests/{id}.aiResponse│  │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 2: ACCÈS AU DASHBOARD                                       │   │
│  │                                                                   │   │
│  │  [Admin sur sos-expat.com/multi-dashboard]                        │   │
│  │         │                                                         │   │
│  │         │ Saisit mot de passe                                     │   │
│  │         ▼                                                         │   │
│  │  [Cloud Function: validateDashboardPassword]                      │   │
│  │         │                                                         │   │
│  │         ├── Compare avec secret MULTI_DASHBOARD_PASSWORD          │   │
│  │         │                                                         │   │
│  │         └── Retourne token: "mds_1706xxx_abc123"                  │   │
│  │                                                                   │   │
│  │  [Frontend: localStorage]                                         │   │
│  │         │                                                         │   │
│  │         │ Stocke session (token + expiration 24h)                 │   │
│  │         ▼                                                         │   │
│  │  [Cloud Function: getMultiDashboardData]                          │   │
│  │         │                                                         │   │
│  │         ├── 1. Charge tous users avec linkedProviderIds[]         │   │
│  │         │                                                         │   │
│  │         ├── 2. Pour chaque: charge sos_profiles des providers     │   │
│  │         │                                                         │   │
│  │         ├── 3. Pour chaque provider: charge booking_requests      │   │
│  │         │                                                         │   │
│  │         └── 4. Retourne accounts[] avec tout                      │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ PHASE 3: ACTIONS UTILISATEUR                                      │   │
│  │                                                                   │   │
│  │  [Click "Ouvrir le Chat"]                                         │   │
│  │         │                                                         │   │
│  │         ▼                                                         │   │
│  │  [ChatPanel s'ouvre]                                              │   │
│  │         │                                                         │   │
│  │         │ Appelle getProviderConversations(providerId)            │   │
│  │         │                                                         │   │
│  │         │ Affiche conversations + messages                        │   │
│  │         │                                                         │   │
│  │         │ Peut envoyer messages via sendMultiDashboardMessage     │   │
│  │         │                                                         │   │
│  │  ─────────────────────────────────────────────────────────────── │   │
│  │                                                                   │   │
│  │  [Click "Outil IA"]                                               │   │
│  │         │                                                         │   │
│  │         ▼                                                         │   │
│  │  [Cloud Function: generateMultiDashboardOutilToken]               │   │
│  │         │                                                         │   │
│  │         ├── Crée Custom Token Firebase avec claims                │   │
│  │         │                                                         │   │
│  │         └── Retourne URL: ia.sos-expat.com/auth?token=xxx         │   │
│  │                                                                   │   │
│  │  [window.open(ssoUrl)]                                            │   │
│  │         │                                                         │   │
│  │         └── Nouvel onglet → connexion automatique à l'outil IA    │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Sécurité

### Authentification

| Aspect | Implémentation | Niveau |
|--------|----------------|--------|
| Stockage mot de passe | Google Cloud Secret Manager | Élevé |
| Comparaison mot de passe | Texte clair (pas de hash) | Moyen |
| Token session | Format propriétaire `mds_*` | Moyen |
| Expiration | 24 heures (configurable) | OK |
| Audit | Logs dans auditLogs collection | Élevé |

### Validation des tokens

```typescript
// Pattern appliqué dans TOUTES les Cloud Functions protégées:

if (!sessionToken ||
    typeof sessionToken !== "string" ||
    !sessionToken.startsWith("mds_")) {
  throw new HttpsError("unauthenticated", "Invalid session token");
}

// Note: Le token n'est PAS vérifié côté serveur (pas de stockage)
// Seul le format est validé
// Amélioration possible: stocker les tokens dans Firestore avec expiration
```

### CORS

```typescript
cors: [
  "https://sos-expat.com",
  "https://www.sos-expat.com",
  "http://localhost:3000",    // Dev Vite
  "http://localhost:5173",    // Dev Vite alternative
]
```

### Audit Trail

Tous les événements importants sont loggés dans `auditLogs`:

| Action | Données loggées |
|--------|-----------------|
| `multi_dashboard_auth_success` | IP, token partial, expiration |
| `multi_dashboard_auth_failed` | IP |
| `multi_dashboard_outil_token` | providerId, providerEmail, ownerUserId |

---

## 14. Déploiement

### Frontend (Cloudflare Pages)

```bash
cd sos

# Build
npm run build

# Deploy
npx wrangler pages deploy dist --project-name=sos-expat

# Vérification
# URL: https://sos-expat.com/multi-dashboard
```

### Cloud Functions (Firebase)

```bash
cd Outil-sos-expat/functions

# Build TypeScript
npm run build

# Deploy toutes les fonctions multi-dashboard
firebase deploy --only functions:validateDashboardPassword,functions:getMultiDashboardData,functions:onBookingRequestCreatedGenerateAi,functions:generateMultiDashboardOutilToken,functions:getProviderConversations,functions:sendMultiDashboardMessage

# Ou deploy tout
firebase deploy --only functions
```

### Secrets à configurer

```bash
# Définir le mot de passe
firebase functions:secrets:set MULTI_DASHBOARD_PASSWORD

# Définir la clé Anthropic
firebase functions:secrets:set ANTHROPIC_API_KEY

# Vérifier
firebase functions:secrets:access MULTI_DASHBOARD_PASSWORD
```

### Configuration Firestore requise

```javascript
// Créer admin_config/multi_dashboard
{
  enabled: true,
  sessionDurationHours: 24
}
```

---

## 15. Troubleshooting

### Erreur: "Dashboard is disabled"

```
Cause: admin_config/multi_dashboard.enabled === false
Solution: Firestore → admin_config → multi_dashboard → enabled = true
```

### Erreur: "Invalid session token"

```
Causes possibles:
1. Token expiré (> 24h)
2. Token mal formé (ne commence pas par "mds_")
3. localStorage corrompu

Solution: Se déconnecter et reconnecter
```

### Erreur: "Provider not found"

```
Cause: providerId n'existe pas dans sos_profiles
Vérification: Firestore → sos_profiles → chercher le document
```

### Pas de réponse IA auto-générée

```
Causes possibles:
1. Provider pas dans un compte multi (linkedProviderIds)
2. ANTHROPIC_API_KEY non configuré
3. Erreur API Anthropic

Vérifications:
1. users → document avec linkedProviderIds contenant le providerId
2. Firebase Console → Functions → Logs → onBookingRequestCreatedGenerateAi
3. booking_requests/{id} → champ aiError si présent
```

### Chat ne charge pas les conversations

```
Causes:
1. Pas de conversations pour ce providerId
2. Token session expiré

Vérifications:
1. Firestore → conversations → where providerId == xxx
2. Console browser → localStorage → multi_dashboard_session
```

### Logs Firebase

```bash
# Logs en temps réel
firebase functions:log

# Logs d'une fonction spécifique
firebase functions:log --only onBookingRequestCreatedGenerateAi

# Avec filtre
firebase functions:log --only getMultiDashboardData | grep "Error"
```

---

## Changelog

| Date | Version | Changements |
|------|---------|-------------|
| 2025-01-24 | 1.0.0 | Version initiale du dashboard |
| 2025-01-24 | 1.1.0 | Ajout chat inline (ChatPanel + Cloud Functions) |
| 2025-01-24 | 1.1.1 | Documentation précise avec code réel |

---

*Documentation générée le 24 janvier 2025*
*Basée sur le code source réel - Dernière vérification: 24/01/2025*
*Projet: SOS-Expat Multi-Provider Dashboard*
