# 🚀 INSTALLATION RAPIDE - Système En Ligne/Hors Ligne

## 📦 STRUCTURE DES FICHIERS

```
system/
├── src/
│   ├── config/
│   │   └── providerActivityConfig.ts        [NOUVEAU]
│   ├── types/
│   │   └── providerActivity.ts              [NOUVEAU]
│   ├── hooks/
│   │   ├── useProviderActivityTracker.ts    [NOUVEAU]
│   │   └── useProviderReminderSystem.ts     [NOUVEAU]
│   └── components/
│       └── providers/
│           └── ProviderOnlineManager.tsx     [NOUVEAU]
├── functions/
│   └── src/
│       ├── callables/
│       │   ├── updateProviderActivity.ts     [NOUVEAU]
│       │   └── setProviderOffline.ts         [NOUVEAU]
│       └── scheduled/
│           └── checkProviderInactivity.ts    [NOUVEAU]
└── MODIFICATIONS_*.txt                       [INSTRUCTIONS]
```

## ⚡ INSTALLATION EN 3 ÉTAPES

### ÉTAPE 1 : COPIER LES NOUVEAUX FICHIERS

```bash
# Frontend
cp -r system/src/* votre-projet/src/

# Firebase Functions
cp -r system/functions/src/* votre-projet/functions/src/
```

### ÉTAPE 2 : APPLIQUER LES MODIFICATIONS

Ouvrir et suivre les instructions dans :
- `MODIFICATIONS_provider.ts.txt`
- `MODIFICATIONS_types.ts.txt`
- `MODIFICATIONS_AuthContext.tsx.txt`
- `MODIFICATIONS_Dashboard.tsx.txt`
- `MODIFICATIONS_functions_index.ts.txt`

### ÉTAPE 3 : DÉPLOYER LES FUNCTIONS

```bash
cd votre-projet/functions
npm install
firebase deploy --only functions
```

## 🔧 VÉRIFICATION

1. **Compiler TypeScript** : `npm run build`
2. **Créer un compte prestataire** → Vérifier que `isOnline: false`
3. **Se mettre en ligne** → Vérifier le tracking d'activité
4. **Attendre 15 min inactif** → Popup doit s'afficher

## 📋 STRUCTURES FIREBASE

### Collection `sos_profiles`
```typescript
{
  uid: string,
  isOnline: boolean,              // false par défaut
  availability: string,           // 'offline' par défaut
  lastActivity: Timestamp,
  lastActivityCheck: Timestamp,
  autoOfflineEnabled: boolean,     // true par défaut
  inactivityTimeoutMinutes: number, // 60 par défaut
  lastStatusChange: Timestamp,
  // ... autres champs existants
}
```

### Collection `users`
```typescript
{
  uid: string,
  isOnline: boolean,
  availability: string,
  lastActivity: Date,
  lastActivityCheck: Date,
  autoOfflineEnabled: boolean,
  inactivityTimeoutMinutes: number,
  lastStatusChange: Date,
  // ... autres champs existants
}
```

## 🎯 FONCTIONNALITÉS ACTIVÉES

✅ Inscription hors ligne par défaut
✅ Tracking automatique de l'activité
✅ Rappels après 15 min d'inactivité (son + voix + popup)
✅ Déconnexion auto après 60 min d'inactivité
✅ Synchronisation temps réel entre appareils
✅ Option "ne plus rappeler aujourd'hui"
✅ Respect des préférences utilisateur

## 🔗 DÉPENDANCES REQUISES

Le système utilise vos fichiers existants :
- `config/firebase.ts` → Configuration Firebase
- `contexts/useAuth.ts` → Hook d'authentification
- `notificationsonline/ReminderModal.tsx` → Modal de rappel
- `notificationsonline/playAvailabilityReminder.ts` → Audio

## 📞 SUPPORT

Si problème, vérifier :
1. Firebase Functions déployées : `firebase functions:list`
2. Collections Firestore : `sos_profiles` et `users`
3. Console navigateur pour erreurs
