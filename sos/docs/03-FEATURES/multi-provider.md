# Multi-Provider System (shareBusyStatus)

> Système permettant à un account owner de gérer plusieurs prestataires avec synchronisation automatique du statut busy.

**Dernière mise à jour** : 2026-02-16
**Version** : 2.0 (Denormalization fix)

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#-vue-densemble)
2. [Architecture](#-architecture)
3. [Modèle de Données](#-modèle-de-données)
4. [Propagation du Statut Busy](#-propagation-du-statut-busy)
5. [Admin UI](#-admin-ui-gestion)
6. [Bug Fix 2026-02-05](#-bug-fix-dénormalisation-2026-02-05)
7. [Dashboard Multi-Provider](#-dashboard-multi-provider)
8. [API Reference](#-api-reference)
9. [Troubleshooting](#-troubleshooting)

---

## 🎯 Vue d'Ensemble

### Cas d'Usage

Le système multi-provider permet à un **account owner** (ex: agence, cabinet d'avocats) de gérer plusieurs **prestataires** (providers) avec :

✅ **Gestion centralisée** - Un seul compte pour gérer N prestataires
✅ **Synchronisation busy** - Quand un provider est en appel, les autres passent automatiquement en busy
✅ **Dashboard séparé** - Interface dédiée pour agency managers
✅ **Découplage individuel** - Chaque provider peut désactiver le couplage si besoin
✅ **Verrouillage offline** - Un provider peut se mettre offline sans affecter les autres

### Exemple Concret

**Cabinet d'Avocats "LegalExpat"** :
- Account owner : `contact@legalexpat.com` (rôle: `agency_manager`)
- Provider 1 : Maître Dupont (avocate immigration)
- Provider 2 : Maître Martin (avocat fiscal)
- Provider 3 : Maître Bernard (avocate droit du travail)

**Scénario** :
1. Maître Dupont reçoit un appel client → Son statut passe à `busy`
2. Si `shareBusyStatus: true` → Maître Martin & Bernard passent automatiquement en `busy`
3. Les clients ne peuvent pas les appeler pendant que Maître Dupont est occupée
4. Fin d'appel → Tous repassent à `available`

---

## 🏗️ Architecture

### Diagramme Conceptuel

```
┌─────────────────────────────────────────────────────────────┐
│                    ACCOUNT OWNER                             │
│                  users/{accountOwnerId}                      │
│                                                              │
│  • Email: contact@legalexpat.com                            │
│  • Role: agency_manager                                     │
│  • linkedProviderIds: [pid1, pid2, pid3]  ← SOURCE VÉRITÉ  │
│  • shareBusyStatus: true                  ← FLAG SYNC       │
│  • activeProviderId: pid1                                   │
│  • isMultiProvider: true                                    │
└────────────────────┬─────────────────────────────────────────┘
                     │
      ┌──────────────┴──────────────┐
      │                             │
      ▼                             ▼
┌──────────────┐             ┌──────────────┐
│  PROVIDER 1  │             │  PROVIDER 2  │
│ users/{pid1} │             │ users/{pid2} │
│ sos_prof...  │             │ sos_prof...  │
│              │             │              │
│ • DÉNORM:    │             │ • DÉNORM:    │
│   linked...  │             │   linked...  │
│   shareBusy  │             │   shareBusy  │
│ • Status     │             │ • Status     │
│ • Busy info  │             │ • Busy info  │
└──────────────┘             └──────────────┘
        │                             │
        └──────────┬──────────────────┘
                   │
        Synchronisés si shareBusyStatus = true
```

### Hiérarchie des Comptes

**Account Owner (parent)** :
- Stocke `linkedProviderIds[]` (source de vérité)
- Contrôle `shareBusyStatus` (on/off)
- Peut avoir le rôle `agency_manager` ou autre
- Accède au Dashboard Multi-Provider

**Providers (children)** :
- Ont les champs dénormalisés (pour performance)
- Leur statut se synchronise automatiquement
- Peuvent désactiver individuellement le couplage (`receiveBusyFromSiblings: false`)
- Peuvent se verrouiller offline (`lockedOffline: true`)

---

## 🗄️ Modèle de Données

### Account Owner Document

**Collection** : `users/{accountOwnerId}`

```typescript
{
  // Identité
  uid: string;
  email: string;
  role: "agency_manager" | "admin" | other;

  // Multi-Provider (SOURCE DE VÉRITÉ)
  linkedProviderIds: string[];        // Ex: ["pid1", "pid2", "pid3"]
  shareBusyStatus: boolean;           // true = synchronisation active
  activeProviderId?: string;          // Provider actuellement sélectionné
  isMultiProvider: boolean;           // Marqueur compte multi
  telegramChatId?: string;            // Notifications groupe Telegram

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Provider Document (Dénormalisé)

**Collections** : `users/{providerId}` + `sos_profiles/{providerId}`

```typescript
{
  // Identité provider
  uid: string;
  email: string;
  role: "lawyer" | "expat";

  // Dénormalisation (COPIE depuis account owner)
  linkedProviderIds: string[];        // Liste complète des siblings
  shareBusyStatus: boolean;           // Flag synchronisation

  // Status & Availability
  isOnline: boolean;
  availability: "available" | "busy" | "offline";
  busyReason?: "in_call" | "pending_call" | "manual" | "busy_by_sibling";

  // Busy propagation tracking
  busyBySibling?: boolean;            // true si mis busy par un sibling
  busySiblingProviderId?: string;     // ID du sibling qui a causé le busy
  busySiblingProviderName?: string;   // Nom du sibling

  // Contrôles individuels (🆕 2026)
  receiveBusyFromSiblings?: boolean;  // Défaut: true, false = découplage
  lockedOffline?: boolean;            // Défaut: false, true = verrouillé offline

  // Autres champs provider
  // ... (pricing, languages, categories, etc.)
}
```

### Champs Spécifiques

| Champ | Type | Lieu | Description |
|-------|------|------|-------------|
| `linkedProviderIds` | `string[]` | Account + providers | Liste des IDs providers liés |
| `shareBusyStatus` | `boolean` | Account + providers | Activer/désactiver la sync |
| `activeProviderId` | `string` | Account only | Provider actuellement actif/sélectionné |
| `busyBySibling` | `boolean` | Provider only | Mis busy par un autre provider |
| `busySiblingProviderId` | `string` | Provider only | ID du provider qui a causé le busy |
| `receiveBusyFromSiblings` | `boolean` | Provider only | Accepter la propagation (défaut: true) |
| `lockedOffline` | `boolean` | Provider only | Verrouillé offline (défaut: false) |

---

## 🔄 Propagation du Statut Busy

### Flow Complet

```
Provider reçoit un appel
    ↓
setProviderBusy(providerId, callSessionId)
    ↓
Transaction: Lire users/{providerId}
    ├→ linkedProviderIds présent ?
    │   YES → Utiliser directement
    │   NO  → findParentAccountConfig() (array-contains query)
    │         └→ Self-healing: Écrire config au provider doc
    ↓
shareBusyStatus = true ?
    NO  → Stop (pas de propagation)
    YES → Continue
    ↓
propagateBusyToSiblings(providerId, linkedProviderIds)
    ↓
Pour chaque sibling:
    ├→ Vérifier receiveBusyFromSiblings !== false
    ├→ Vérifier lockedOffline !== true
    ├→ Vérifier availability !== "busy"
    ├→ Batch update:
    │   ├─ availability: "busy"
    │   ├─ busyReason: "busy_by_sibling"
    │   ├─ busyBySibling: true
    │   ├─ busySiblingProviderId: {providerId}
    │   ├─ busySiblingProviderName: {name}
    │   └─ updatedAt: serverTimestamp()
    └→ Log audit
```

### Cas d'Usage Spéciaux

#### 1. Provider Offline Avant Appel

**Problème** : Provider était offline, reçoit un appel, ne doit pas passer online automatiquement

**Solution** :
```typescript
const wasOfflineBeforeCall = previousStatus === 'offline' || !userData?.isOnline;
isOnline: wasOfflineBeforeCall ? false : true,
wasOfflineBeforeCall: wasOfflineBeforeCall,  // Pour restauration après appel
```

#### 2. Upgrade pending_call → in_call

**Problème** : Provider en `pending_call`, appel connecté, doit passer à `in_call`

**Solution** : Permettre upgrade si `reason === 'in_call'`
```typescript
if (userData?.busyReason === 'pending_call' && reason === 'in_call') {
  // Continue pour upgrade
}
```

#### 3. Découplage Individuel

**Cas** : Un provider ne veut pas être mis busy automatiquement

**Solution** :
```typescript
// Sur le provider doc
receiveBusyFromSiblings: false

// Dans propagateBusyToSiblings()
if (siblingData?.receiveBusyFromSiblings === false) {
  console.log("Sibling has disabled receiving busy, skipping");
  continue;
}
```

#### 4. Verrouillage Offline

**Cas** : Un provider est en vacances, ne veut pas être mis online

**Solution** :
```typescript
// Sur le provider doc
lockedOffline: true

// Dans propagateBusyToSiblings()
if (siblingData?.lockedOffline === true) {
  console.log("Sibling is locked offline, skipping propagation");
  continue;
}
```

---

## 🎛️ Admin UI (Gestion)

### Interface Admin

**Fichier** : `/sos/src/pages/admin/ia/IaMultiProvidersTab.tsx`

**Fonctionnalités** :

1. **Afficher comptes multi-provider**
   - Liste tous les accounts avec `linkedProviderIds.length > 0`
   - Affiche providers liés avec statuts temps réel

2. **Lier un provider**
   - Ajoute provider à `linkedProviderIds`
   - Dénormalise config vers provider docs (users + sos_profiles)
   - Sync atomique

3. **Délier un provider**
   - Retire de `linkedProviderIds`
   - Nettoie dénormalisation
   - Cleanup de tous les providers restants

4. **Activer/Désactiver shareBusyStatus**
   - Toggle ON/OFF
   - Si ON + provider busy → Propage immédiatement aux siblings
   - Dénormalise vers tous les providers

5. **Forcer statut provider**
   - Admin peut forcer available/busy/offline
   - Utile pour debugging

6. **Détecter conflits**
   - Provider lié à 2+ accounts → Warning
   - Map de conflits affichée

7. **Gérer Telegram chat ID**
   - Pour notifications de groupe

### Code Principal

#### Link Provider

```typescript
const linkProvider = async (accountId: string, providerId: string) => {
  const accountRef = doc(db, 'users', accountId);
  const accountSnap = await getDoc(accountRef);

  const currentLinkedIds = accountSnap.data()?.linkedProviderIds || [];
  const newLinkedIds = [...new Set([...currentLinkedIds, providerId])];

  // Update account
  await updateDoc(accountRef, {
    linkedProviderIds: newLinkedIds,
    updatedAt: serverTimestamp()
  });

  // Denormalize to all providers
  const denormData = {
    linkedProviderIds: newLinkedIds,
    shareBusyStatus: accountSnap.data()?.shareBusyStatus ?? false,
    updatedAt: serverTimestamp()
  };

  for (const pid of newLinkedIds) {
    await Promise.all([
      updateDoc(doc(db, 'users', pid), denormData),
      updateDoc(doc(db, 'sos_profiles', pid), denormData)
    ]);
  }
};
```

#### Toggle shareBusyStatus

```typescript
const toggleShareBusyStatus = async (accountId: string, newValue: boolean) => {
  const accountRef = doc(db, 'users', accountId);

  // Update account
  await updateDoc(accountRef, {
    shareBusyStatus: newValue,
    updatedAt: serverTimestamp()
  });

  // Denormalize to all providers
  const linkedIds = account.linkedProviderIds;
  for (const pid of linkedIds) {
    await Promise.all([
      updateDoc(doc(db, 'users', pid), { shareBusyStatus: newValue }),
      updateDoc(doc(db, 'sos_profiles', pid), { shareBusyStatus: newValue })
    ]);
  }

  // Si activation + provider busy → Propage immédiatement
  if (newValue) {
    const busyProvider = account.providers.find(
      p => p.availability === 'busy' && !p.busyBySibling
    );

    if (busyProvider) {
      const siblingsToUpdate = account.providers.filter(
        p => p.id !== busyProvider.id &&
             p.availability !== 'busy' &&
             p.receiveBusyFromSiblings !== false &&
             p.lockedOffline !== true
      );

      for (const sibling of siblingsToUpdate) {
        await propagateBusyToSibling(sibling.id, busyProvider);
      }
    }
  }
};
```

---

## 🐛 Bug Fix Dénormalisation (2026-02-05)

### Problème Initial

**Avant fix** : `linkedProviderIds` et `shareBusyStatus` étaient UNIQUEMENT sur `users/{accountOwnerId}`, PAS sur les provider docs.

**Impact** :
```typescript
// setProviderBusy(providerId) lisait users/{providerId}
const linkedProviderIds = userData?.linkedProviderIds;  // ❌ undefined!
const shareBusyStatus = userData?.shareBusyStatus;      // ❌ undefined!

// Résultat: PAS DE PROPAGATION BUSY
```

### Solution Implémentée

**3 niveaux de fix** :

#### Niveau 1 : Script de Migration

**Fichier** : `/sos/scripts/migrate-denormalize-multi-provider.cjs`

```bash
node scripts/migrate-denormalize-multi-provider.cjs
```

**Actions** :
1. Lit tous les `users/{accountOwnerId}` avec `linkedProviderIds.length > 0`
2. Pour chaque provider dans la liste :
   - Écrit `linkedProviderIds` + `shareBusyStatus` dans `users/{providerId}`
   - Écrit `linkedProviderIds` + `shareBusyStatus` dans `sos_profiles/{providerId}`
3. Log complet (providers updated, errors)

#### Niveau 2 : Self-Healing Backend

**Fichier** : `/sos/firebase/functions/src/callables/providerStatusManager.ts`

```typescript
// Si linkedProviderIds absent du doc provider
if (!effectiveLinkedProviderIds.length) {
  const parentConfig = await findParentAccountConfig(providerId);

  if (parentConfig) {
    // ✅ SELF-HEALING: Écrire config au provider doc
    const selfHealData = {
      linkedProviderIds: parentConfig.linkedProviderIds,
      shareBusyStatus: parentConfig.shareBusyStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await Promise.all([
      db.collection('users').doc(providerId).update(selfHealData),
      db.collection('sos_profiles').doc(providerId).update(selfHealData)
    ]);
  }
}
```

**Fonction helper** :
```typescript
async function findParentAccountConfig(providerId: string) {
  const usersSnap = await db.collection('users')
    .where('linkedProviderIds', 'array-contains', providerId)
    .limit(1)
    .get();

  if (usersSnap.empty) return null;

  const parentData = usersSnap.docs[0].data();
  return {
    linkedProviderIds: parentData.linkedProviderIds,
    shareBusyStatus: parentData.shareBusyStatus
  };
}
```

#### Niveau 3 : Dénormalisation Admin UI

**Toutes les opérations admin** dénormalisent immédiatement :
- `linkProvider()` - Dénormalise config aux providers
- `unlinkProvider()` - Dénormalise cleanup
- `toggleShareBusyStatus()` - Dénormalise flag
- `deleteAccount()` - Cleanup complet

---

## 📱 Dashboard Multi-Provider

### Projet Séparé

**Location** : `/Dashboard-multiprestataire`

**Stack** : React 18 + TypeScript + Vite + Firebase + TanStack Query

**Rôle requis** : `agency_manager` ou `admin`

### Fonctionnalités

- ✅ Vue temps réel de tous les providers liés
- ✅ Statuts online/offline/busy avec icônes
- ✅ Gestion des KYC (Stripe onboarding links)
- ✅ Tracking des commissions et earnings
- ✅ Dashboard analytics (appels, revenus, etc.)
- ✅ Export CSV

### Configuration Firebase

**Même projet que SOS** : `sos-urgently-ac307`

**Instance Functions** : Utilise `functionsWest1` pour callables

### Access Control

**Firestore Rules** :
```javascript
function hasAgencyAccessToProvider(providerId) {
  return request.auth != null &&
    (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'agency_manager' ||
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin') &&
    providerId in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.linkedProviderIds;
}

// Exemple usage
match /sos_profiles/{profileId} {
  allow read: if hasAgencyAccessToProvider(profileId);
}
```

> 📖 Voir [/Dashboard-multiprestataire/README.md](../../../Dashboard-multiprestataire/README.md)

---

## 📚 API Reference

### Backend Functions

**Fichier** : `/sos/firebase/functions/src/callables/providerStatusManager.ts`

#### setProviderBusy

```typescript
setProviderBusy(
  providerId: string,
  callSessionId: string,
  reason?: "in_call" | "pending_call"
): Promise<void>
```

**Région** : `europe-west3`

**Actions** :
1. Transaction: Lire provider doc
2. Vérifier `linkedProviderIds` (ou lookup parent)
3. Vérifier `shareBusyStatus`
4. Si true → `propagateBusyToSiblings()`
5. Log audit

#### setProviderAvailable

```typescript
setProviderAvailable(
  providerId: string,
  callSessionId?: string
): Promise<void>
```

**Région** : `europe-west3`

**Actions** :
1. Transaction: Lire provider doc
2. Release provider à available
3. Si était busyBySibling → `releaseSiblingsFromBusy()`
4. Log audit

#### releaseSiblingsFromBusy

```typescript
releaseSiblingsFromBusy(
  originalProviderId: string,
  linkedProviderIds: string[]
): Promise<void>
```

**Actions** :
1. Batch: Pour chaque sibling mis busy par ce provider
2. Si pas d'autres siblings busy → Release à available
3. Cleanup `busyBySibling`, `busySiblingProviderId`

---

## 🔧 Troubleshooting

### Problème 1 : Pas de Propagation Busy

**Symptôme** : Provider reçoit un appel, siblings ne passent pas en busy

**Vérifications** :
1. `shareBusyStatus` est-il `true` sur account owner ?
2. Les champs sont-ils dénormalisés sur provider docs ?
3. Siblings ont-ils `receiveBusyFromSiblings: false` ?
4. Siblings sont-ils `lockedOffline: true` ?

**Solution** :
```bash
# Vérifier config
firebase firestore:get users/{accountOwnerId}

# Si pas dénormalisé, lancer migration
node scripts/migrate-denormalize-multi-provider.cjs

# Ou admin UI: Toggle shareBusyStatus OFF → ON (force sync)
```

### Problème 2 : Provider Reste Busy Après Appel

**Symptôme** : Provider reste en busy alors que appel terminé

**Cause** : `busySafetyTimeoutTask` pas déclenché ou échec

**Solution** :
```typescript
// Admin UI: Forcer available
forceProviderStatus(providerId, "available")

// Ou backend
setProviderAvailable(providerId)
```

### Problème 3 : Conflit (Provider Lié à 2+ Accounts)

**Symptôme** : Warning dans admin UI

**Cause** : Provider ajouté à plusieurs accounts par erreur

**Solution** :
1. Admin UI → Voir conflict warnings
2. Décider quel account garde le provider
3. Unlinkprovider des autres accounts

### Problème 4 : Parent Lookup Échoue

**Symptôme** : Logs "No parent account found - provider is standalone"

**Cause** : Provider pas dans `linkedProviderIds` de aucun account

**Solution** :
1. Vérifier si normal (provider standalone)
2. Sinon, admin UI → Link provider à account

---

## 📖 Documentation Complémentaire

- [providerStatusManager.ts](../../firebase/functions/src/callables/providerStatusManager.ts) - Code source complet
- [IaMultiProvidersTab.tsx](../../src/pages/admin/ia/IaMultiProvidersTab.tsx) - Admin UI
- [migrate-denormalize-multi-provider.cjs](../../scripts/migrate-denormalize-multi-provider.cjs) - Script migration

---

**Document maintenu par l'équipe technique SOS Expat**
**Dernière révision** : 2026-02-16
