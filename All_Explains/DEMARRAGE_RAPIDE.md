# ⚡ DÉMARRAGE ULTRA-RAPIDE

## 🎯 3 COMMANDES, 5 MINUTES

### 1. COPIER LES FICHIERS (30 secondes)

```bash
# Frontend
cp -r system/src/config votre-projet/src/
cp -r system/src/types/providerActivity.ts votre-projet/src/types/
cp -r system/src/hooks/useProviderActivityTracker.ts votre-projet/src/hooks/
cp -r system/src/hooks/useProviderReminderSystem.ts votre-projet/src/hooks/
cp -r system/src/components/providers votre-projet/src/components/

# Functions
cp system/functions/src/callables/* votre-projet/functions/src/callables/
cp system/functions/src/scheduled/* votre-projet/functions/src/scheduled/
```

### 2. MODIFICATIONS (2 minutes)

Dans `src/types/provider.ts`, ajouter :
```typescript
lastActivity?: Timestamp;
lastActivityCheck?: Timestamp;
autoOfflineEnabled?: boolean;
inactivityTimeoutMinutes?: number;
lastStatusChange?: Timestamp;
```

Dans `src/contexts/types.ts`, ajouter :
```typescript
lastActivity?: Date;
lastActivityCheck?: Date;
autoOfflineEnabled?: boolean;
inactivityTimeoutMinutes?: number;
lastStatusChange?: Date;
```

Dans `src/pages/Dashboard.tsx` :
```typescript
import ProviderOnlineManager from '../components/providers/ProviderOnlineManager';

// Wrapper le return :
return (
  <ProviderOnlineManager>
    {/* votre contenu existant */}
  </ProviderOnlineManager>
);
```

Dans `src/contexts/AuthContext.tsx`, lors de création prestataire :
```typescript
isOnline: false,
availability: 'offline',
autoOfflineEnabled: true,
inactivityTimeoutMinutes: 60,
lastActivity: serverTimestamp(),
```

Dans `functions/src/index.ts` :
```typescript
export { checkProviderInactivity } from './scheduled/checkProviderInactivity';
export { updateProviderActivity } from './callables/updateProviderActivity';
export { setProviderOffline } from './callables/setProviderOffline';
```

### 3. DÉPLOYER (2 minutes)

```bash
cd functions
firebase deploy --only functions
```

## ✅ VÉRIFICATION RAPIDE

1. Créer nouveau compte prestataire
2. Vérifier dans Firestore : `isOnline: false` ✓
3. Se mettre en ligne ✓
4. Vérifier console : "Activity detected" ✓

## 🎉 C'EST PRÊT !

Voir `TESTS_VERIFICATION.md` pour tests complets.
