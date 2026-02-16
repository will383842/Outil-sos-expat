# Dashboard Multi-Prestataire - SOS Expat

> Application PWA (Progressive Web App) pour la gestion centralisée de plusieurs prestataires (multi-provider) par les gestionnaires d'agence.

[![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC)](https://tailwindcss.com)

---

## 📋 Vue d'Ensemble

Le **Dashboard Multi-Prestataire** est une **PWA** (Progressive Web App) dédiée aux **gestionnaires d'agence** (`agency_manager` role) qui supervisent plusieurs prestataires liés via le système **multi-provider** de SOS Expat.

### Cas d'Usage Principal
Un cabinet d'avocats avec 5 avocats utilise SOS Expat :
- 1 compte principal (account owner) avec `linkedProviderIds: [id1, id2, id3, id4, id5]`
- Le gestionnaire d'agence peut superviser tous les prestataires en temps réel depuis ce dashboard
- Synchronisation automatique du statut **busy/available** entre prestataires si `shareBusyStatus: true`

---

## 🚀 Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Framework** | React 18.3 + TypeScript 5.7 |
| **Build Tool** | Vite 6.0 |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui |
| **Routing** | React Router v7 |
| **State Management** | TanStack Query v5 (React Query) |
| **Backend** | Firebase (Auth + Firestore) |
| **Charts** | Recharts |
| **Notifications** | react-hot-toast |
| **Date Handling** | date-fns |
| **PWA** | VitePWA (Workbox) |

---

## 📁 Structure du Projet

```
Dashboard-multiprestataire/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── ProtectedRoute.tsx
│   │   ├── AppLayout.tsx
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useAgencyProviders.ts  # Real-time Firestore onSnapshot
│   │   └── useAuth.ts
│   ├── lib/
│   │   ├── firebase.ts      # Firebase config
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   └── NotFound.tsx
│   ├── types/
│   │   └── index.ts
│   └── App.tsx
├── public/
│   ├── manifest.json        # PWA manifest
│   └── icons/               # PWA icons (192x192, 512x512)
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## 🔐 Authentification & Autorisation

### Rôles Autorisés
Seuls 2 rôles peuvent accéder au dashboard :
- **`agency_manager`** : Gestionnaires d'agence (rôle principal)
- **`admin`** : Administrateurs SOS Expat (accès total)

### Vérification des Permissions
```typescript
// ProtectedRoute.tsx
const allowedRoles = ['agency_manager', 'admin'];
if (!allowedRoles.includes(userData.role)) {
  navigate('/login');
}
```

---

## 🔥 Intégration Firebase

### Configuration
Le dashboard utilise le **même projet Firebase** que l'application principale SOS Expat :
- **Project ID** : `sos-urgently-ac307`
- **Auth** : Firebase Authentication
- **Database** : Firestore (collections `users`, `sos_profiles`)

### Collections Firestore Utilisées

#### 1. `users/{userId}`
```typescript
{
  uid: string;
  email: string;
  role: 'agency_manager' | 'admin' | 'provider';
  linkedProviderIds: string[];      // IDs des prestataires liés
  shareBusyStatus: boolean;         // Sync flag
  isMultiProvider: boolean;
  activeProviderId?: string;        // ID du provider actif
}
```

#### 2. `sos_profiles/{providerId}`
```typescript
{
  uid: string;
  displayName: string;
  status: 'available' | 'busy' | 'offline';
  busyBySibling?: boolean;
  busySiblingProviderId?: string;
  linkedProviderIds: string[];      // Copie dénormalisée
  shareBusyStatus: boolean;         // Copie dénormalisée
  specialties: string[];
  phoneNumber: string;
  rating: number;
  totalCalls: number;
  totalRevenue: number;
  lastActiveAt: Timestamp;
}
```

---

## 📊 Fonctionnalités Clés

### 1. **Tableau de Bord Temps Réel**
- Affichage en temps réel de tous les prestataires liés
- Statuts visuels : 🟢 Available / 🔴 Busy / ⚫ Offline
- Indicateur `busyBySibling` : 🔒 Verrouillé par un autre prestataire

### 2. **Synchronisation Automatique**
- Utilise Firestore `onSnapshot` pour les updates temps réel
- Pas besoin de polling ou de rafraîchissement manuel
- Mise à jour instantanée des statuts

### 3. **Export CSV**
- Export des données de tous les prestataires
- Format compatible Excel avec BOM UTF-8 (`\uFEFF`)
- Inclut : nom, statut, spécialités, appels, revenus

### 4. **Statistiques Globales**
- Total des prestataires liés
- Prestataires disponibles / occupés / hors ligne
- Revenus totaux de l'agence
- Nombre total d'appels traités

### 5. **Graphiques & Analyses**
- Graphiques de performance (Recharts)
- Distribution des appels par prestataire
- Évolution des revenus
- Taux de disponibilité

---

## 🎯 Architecture React

### Structure de Layout Imbriquée
```
App.tsx
└── BrowserRouter
    ├── ProtectedRoute (vérifie auth + role)
    │   └── Outlet
    │       └── AppLayout (navigation + header)
    │           └── Outlet
    │               ├── Dashboard.tsx
    │               └── [autres pages]
    └── Login.tsx (public)
```

### Pattern Outlet (React Router v7)
- **ProtectedRoute** : Wrapper d'authentification
- **AppLayout** : Layout global avec navigation
- **Outlet** : Injection des pages enfants

---

## 🪝 Custom Hooks

### `useAgencyProviders`
Hook principal pour récupérer les prestataires en temps réel :

```typescript
const {
  providers,       // Provider[]
  loading,         // boolean
  error           // Error | null
} = useAgencyProviders();
```

**Fonctionnalités** :
- Firestore `onSnapshot` sur `sos_profiles` collection
- Filtre automatique avec `array-contains` sur `linkedProviderIds`
- Tri client-side (évite les index composites Firestore)
- Gestion d'erreur intégrée

### `useAuth`
Hook d'authentification :
```typescript
const {
  user,            // User | null
  userData,        // UserData | null
  loading,         // boolean
  signOut         // () => Promise<void>
} = useAuth();
```

---

## 🎨 UI/UX Best Practices

### 1. **Notifications**
- **Jamais** utiliser `alert()` ❌
- **Toujours** utiliser `toast()` de `react-hot-toast` ✅

```typescript
import { toast } from 'react-hot-toast';

// Success
toast.success('Opération réussie !');

// Error
toast.error('Une erreur est survenue');

// Loading
const loadingToast = toast.loading('Chargement...');
toast.dismiss(loadingToast);
```

### 2. **ErrorBoundary**
- Class component qui wrap toute l'app
- Capture les erreurs React non gérées
- Affiche une UI de fallback élégante

### 3. **Responsive Design**
- Mobile-first avec Tailwind
- Breakpoints : `sm:` `md:` `lg:` `xl:`
- Grid responsive pour les cartes de prestataires

---

## 🚀 Installation & Développement

### Prérequis
- Node.js 18+
- npm ou yarn

### Installation

```bash
# 1. Cloner le repo (si pas déjà fait)
cd Dashboard-multiprestataire

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditer .env avec les clés Firebase

# 4. Démarrer le serveur de développement
npm run dev
```

Le serveur démarre sur **http://localhost:5173**

### Scripts Disponibles

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run preview` | Preview du build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |

---

## 📦 Build & Déploiement

### Build Production

```bash
npm run build
```

Génère le dossier `dist/` optimisé pour la production.

### Déploiement

**Option 1 : Firebase Hosting**
```bash
firebase deploy --only hosting:dashboard
```

**Option 2 : Cloudflare Pages**
- Push sur `main` → Auto-deploy via GitHub
- Build settings :
  - Build command : `npm run build`
  - Output directory : `dist`

**Option 3 : Netlify / Vercel**
- Connecter le repo GitHub
- Configurer les variables d'environnement
- Deploy automatique

---

## 🔧 Configuration PWA

### Manifest (`public/manifest.json`)
```json
{
  "name": "Dashboard Multi-Prestataire - SOS Expat",
  "short_name": "SOS Dashboard",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker (VitePWA)
Configuré dans `vite.config.ts` :
- Stratégie : `NetworkFirst` pour les API calls
- Cache : Assets statiques (JS, CSS, fonts)
- Offline fallback

---

## 🔍 Troubleshooting

### Problème : "Aucun prestataire trouvé"
**Cause** : L'utilisateur n'a pas de `linkedProviderIds` dans Firestore
**Solution** : Vérifier que le compte a bien le rôle `agency_manager` et des prestataires liés

### Problème : "Les statuts ne se mettent pas à jour"
**Cause** : `onSnapshot` non actif ou erreur Firestore
**Solution** : Vérifier la console pour les erreurs, vérifier les règles Firestore

### Problème : "Export CSV avec caractères mal encodés"
**Cause** : Excel n'a pas détecté l'UTF-8
**Solution** : Le BOM (`\uFEFF`) est déjà ajouté automatiquement dans le code

---

## 📚 Documentation Connexe

- [📐 Architecture SOS Expat](../sos/ARCHITECTURE.md)
- [👥 Système Multi-Provider](../sos/docs/03-FEATURES/multi-provider.md)
- [🔐 Authentification & Rôles](../sos/docs/02-ARCHITECTURE/auth-roles.md)
- [🔥 Firestore Collections](../sos/docs/08-API-REFERENCE/firestore-schema.md)

---

## 🤝 Support

- **Email** : support@sos-expat.com
- **Documentation** : [../sos/docs/](../sos/docs/)
- **Issues** : GitHub Issues

---

## 📄 Licence

Propriétaire - SOS Expat © 2024-2026

---

**Made with ❤️ by the SOS Expat Team**
