# 📑 INDEX COMPLET DES FICHIERS

## 📄 GUIDES D'INSTALLATION

### 1. DEMARRAGE_RAPIDE.md ⚡
Guide express en 3 étapes, 5 minutes
**Commencer par ici si pressé**

### 2. README_INSTALLATION.md 📚
Guide complet détaillé avec structure et vérifications

### 3. TESTS_VERIFICATION.md 🧪
11 tests pour valider que tout fonctionne

## 🆕 NOUVEAUX FICHIERS À COPIER

### Frontend (src/)

#### Config
- `src/config/providerActivityConfig.ts`
  → Tous les délais et intervalles (15min, 60min, etc.)

#### Types
- `src/types/providerActivity.ts`
  → Interfaces TypeScript pour le système

#### Hooks
- `src/hooks/useProviderActivityTracker.ts`
  → Détecte et enregistre l'activité (clics, scroll, etc.)
  
- `src/hooks/useProviderReminderSystem.ts`
  → Gère les rappels périodiques (son, voix, popup)

#### Composants
- `src/components/providers/ProviderOnlineManager.tsx`
  → Orchestrateur principal, wrapper pour Dashboard

### Backend (functions/)

#### Callables
- `functions/src/callables/updateProviderActivity.ts`
  → Met à jour lastActivity dans Firestore
  
- `functions/src/callables/setProviderOffline.ts`
  → Passe le prestataire hors ligne

#### Scheduled
- `functions/src/scheduled/checkProviderInactivity.ts`
  → S'exécute toutes les 10 min, déconnecte les inactifs

## 📝 FICHIERS DE MODIFICATIONS

### 1. MODIFICATIONS_provider.ts.txt
Instructions pour `src/types/provider.ts`
→ Ajouter 5 champs : lastActivity, lastActivityCheck, etc.

### 2. MODIFICATIONS_types.ts.txt
Instructions pour `src/contexts/types.ts`
→ Ajouter les mêmes 5 champs dans User

### 3. MODIFICATIONS_AuthContext.tsx.txt
Instructions pour `src/contexts/AuthContext.tsx`
→ Nouveaux prestataires hors ligne par défaut

### 4. MODIFICATIONS_Dashboard.tsx.txt
Instructions pour `src/pages/Dashboard.tsx`
→ Wrapper avec ProviderOnlineManager

### 5. MODIFICATIONS_functions_index.ts.txt
Instructions pour `functions/src/index.ts`
→ Exporter les 3 nouvelles functions

## 🔧 OUTILS SUPPLÉMENTAIRES

### migrate-providers.ts
Script one-shot pour mettre à jour les prestataires existants
→ Ajoute les nouveaux champs aux comptes déjà créés

## 📊 RÉCAPITULATIF

| Type | Nombre | Localisation |
|------|--------|--------------|
| Nouveaux fichiers frontend | 5 | `src/` |
| Nouveaux fichiers backend | 3 | `functions/src/` |
| Fichiers à modifier | 5 | Instructions fournies |
| Guides | 3 | Racine |
| Scripts | 1 | `migrate-providers.ts` |
| **TOTAL** | **17 fichiers** | |

## 🎯 ORDRE D'UTILISATION RECOMMANDÉ

1. Lire `DEMARRAGE_RAPIDE.md` (5 min)
2. Copier nouveaux fichiers (30 sec)
3. Appliquer modifications via fichiers `MODIFICATIONS_*.txt` (2 min)
4. Déployer functions (2 min)
5. Tester avec `TESTS_VERIFICATION.md` (5-10 min)
6. (Optionnel) Exécuter `migrate-providers.ts` pour comptes existants

## ⏱️ TEMPS TOTAL D'INSTALLATION

- **Mode Express** : ~5 minutes
- **Mode Complet + Tests** : ~15 minutes
- **Avec migration données** : +5 minutes

## 💡 SUPPORT TECHNIQUE

En cas de problème :
1. Vérifier compilation TypeScript
2. Vérifier déploiement Functions : `firebase functions:list`
3. Consulter `TESTS_VERIFICATION.md` section Debug
4. Vérifier console navigateur et Firebase logs

## 🔗 DÉPENDANCES

Le système s'intègre avec vos fichiers existants :
- `config/firebase.ts`
- `contexts/useAuth.ts`
- `notificationsonline/ReminderModal.tsx`
- `notificationsonline/playAvailabilityReminder.ts`

Aucune installation npm supplémentaire requise ✅
