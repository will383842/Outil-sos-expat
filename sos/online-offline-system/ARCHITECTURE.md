# 🏗️ ARCHITECTURE DU SYSTÈME

## 📐 VUE D'ENSEMBLE

```
┌─────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                              │
│                    (Prestataire en ligne)                        │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ Interagit avec
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DASHBOARD                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │          ProviderOnlineManager (Wrapper)                  │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │     useProviderActivityTracker                      │ │ │
│  │  │  • Détecte : clics, scroll, touches                 │ │ │
│  │  │  • Update Firebase toutes les 3 min                 │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │     useProviderReminderSystem                       │ │ │
│  │  │  • Vérifie inactivité toutes les 1 min             │ │ │
│  │  │  • Joue son/voix après 15 min                       │ │ │
│  │  │  • Affiche popup après 15 min                       │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────────┬───────────────┘
               │                                  │
               │ Appelle                          │ Lit
               ▼                                  ▼
┌─────────────────────────────┐    ┌──────────────────────────────┐
│   FIREBASE FUNCTIONS         │    │    FIRESTORE                 │
├─────────────────────────────┤    ├──────────────────────────────┤
│ 1. updateProviderActivity   │◄───┤  users/                      │
│    • Callable (frontend)    │    │    └─ {uid}/                 │
│    • Update lastActivity    │───►│       • isOnline             │
│                             │    │       • lastActivity         │
│ 2. setProviderOffline       │◄───┤       • availability         │
│    • Callable (popup)       │    │                              │
│    • Met isOnline: false    │───►│  sos_profiles/               │
│                             │    │    └─ {uid}/                 │
│ 3. checkProviderInactivity  │    │       • isOnline             │
│    • Scheduled (10 min)     │───►│       • lastActivity         │
│    • Déconnecte si >60 min  │    │       • availability         │
└─────────────────────────────┘    └──────────────────────────────┘
```

## 🔄 FLUX D'ACTIVITÉ

### 1. PRESTATAIRE SE MET EN LIGNE
```
Prestataire clique Toggle "En ligne"
    │
    ▼
Header/Dashboard met à jour Firestore
    │
    ├─► users/{uid}/isOnline = true
    └─► sos_profiles/{uid}/isOnline = true
    │
    ▼
ProviderOnlineManager s'active
    │
    ├─► useProviderActivityTracker démarre
    └─► useProviderReminderSystem démarre
```

### 2. TRACKING D'ACTIVITÉ
```
Prestataire clique/scroll/tape
    │
    ▼
useProviderActivityTracker détecte
    │
    ├─► lastActivityRef.current = now
    └─► (debounce 2 sec)
    │
    ▼
Toutes les 3 minutes
    │
    ▼
updateProviderActivity() appelée
    │
    ▼
Firestore mis à jour
    ├─► users/{uid}/lastActivity = now
    └─► sos_profiles/{uid}/lastActivity = now
```

### 3. RAPPEL D'INACTIVITÉ
```
Prestataire inactif 15+ minutes
    │
    ▼
useProviderReminderSystem détecte
    │
    ├─► Son joué (toutes les 30 min)
    ├─► Voix jouée (toutes les 60 min)
    └─► Popup affiché (toutes les 15 min)
    │
    ▼
Prestataire choisit :
    │
    ├─► "Rester en ligne" → Popup fermé, reset timers
    ├─► "Passer hors ligne" → setProviderOffline()
    └─► "Ne plus rappeler" → localStorage, pas de popup jusqu'à minuit
```

### 4. DÉCONNEXION AUTOMATIQUE
```
Toutes les 10 minutes
    │
    ▼
checkProviderInactivity (scheduled) s'exécute
    │
    ▼
Cherche prestataires avec :
    • isOnline = true
    • lastActivity < now - 60 min
    │
    ▼
Si trouvés :
    │
    ├─► Batch update Firestore
    │   ├─► users/{uid}/isOnline = false
    │   └─► sos_profiles/{uid}/isOnline = false
    └─► (Optionnel) Email de notification
```

## 🎯 POINTS D'INTÉGRATION

### 1. Dashboard.tsx
```typescript
<ProviderOnlineManager>
  {/* Tout le contenu du dashboard */}
</ProviderOnlineManager>
```
**Rôle** : Active le système pour les prestataires en ligne

### 2. AuthContext.tsx
```typescript
// À la création d'un nouveau prestataire
{
  isOnline: false,           // ← HORS LIGNE PAR DÉFAUT
  availability: 'offline',
  autoOfflineEnabled: true,
  inactivityTimeoutMinutes: 60,
  lastActivity: serverTimestamp()
}
```
**Rôle** : Garantit que nouveaux prestataires sont hors ligne

### 3. Header / Toggle existant
```typescript
// Votre toggle existant continue de fonctionner
// Il met à jour isOnline dans Firestore
// ProviderOnlineManager réagit automatiquement
```
**Rôle** : Contrôle manuel en ligne/hors ligne

## 🔐 SÉCURITÉ

### Règles Firestore recommandées
```javascript
match /users/{userId} {
  allow read: if request.auth != null;
  allow update: if request.auth.uid == userId;
}

match /sos_profiles/{userId} {
  allow read: if request.auth != null;
  allow update: if request.auth.uid == userId;
}
```

### Firebase Functions
- `updateProviderActivity` : Vérifie auth + role prestataire
- `setProviderOffline` : Vérifie auth + role prestataire
- `checkProviderInactivity` : Scheduled, exécution admin

## 📊 PERFORMANCES

### Impacts minimaux
- **Frontend** : Event listeners passifs, debounce 2s
- **Firestore** : 1 update toutes les 3 min (prestataire actif)
- **Functions** : 
  - Callable : ~100ms
  - Scheduled : S'exécute 10 min, scan uniquement prestataires en ligne

### Optimisations
- Listeners retirés si prestataire hors ligne
- Batch updates pour économiser quota
- Debounce sur événements UI
- Index Firestore recommandé : `sos_profiles` sur `isOnline` + `type`

## 🎨 EXTENSIBILITÉ

Le système est conçu pour être étendu :

1. **Ajouter de nouveaux événements** : Modifier `useProviderActivityTracker`
2. **Changer les délais** : Modifier `providerActivityConfig.ts`
3. **Ajouter notifications** : Modifier `useProviderReminderSystem`
4. **Personnaliser rappels** : Modifier `ReminderModal.tsx`

## 🔍 MONITORING

### Métriques importantes
- Nombre de prestataires en ligne (Firestore count)
- Fréquence des rappels (Function logs)
- Taux de déconnexion auto (Function logs)
- Latence des updates (Function execution time)

### Logs clés
```
Frontend : "Activity detected: click"
Frontend : "Activity updated in Firebase"
Function : "Set X providers offline due to inactivity"
```
