# Fix Blogger Design - Problèmes de contraste identifiés

## Pages analysées
1. BloggerLanding.tsx ✅ (Dark mode only - OK)
2. BloggerRegister.tsx ✅ (Dark mode only - OK)
3. BloggerDashboard.tsx ⚠️ (Dark/Light - PROBLÈMES)
4. BloggerDashboardLayout.tsx ⚠️ (Dark/Light - PROBLÈMES)
5. BloggerResources.tsx ⚠️ (Dark/Light - PROBLÈMES)
6. BloggerEarnings.tsx ⚠️ (Dark/Light - PROBLÈMES)

## Problèmes critiques détectés

### 1. BloggerDashboard.tsx
- **Ligne 106**: `text-gray-500 dark:text-gray-400` → Label "Solde disponible" INVISIBLE en mode clair
- **Ligne 130**: `text-gray-500 dark:text-gray-400` → Label "Gains ce mois" INVISIBLE
- **Ligne 152**: `text-gray-500 dark:text-gray-400` → Label "Clients référés" INVISIBLE
- **Ligne 174**: `text-gray-500 dark:text-gray-400` → Label "Classement" INVISIBLE
- **Ligne 139**: `text-xs text-gray-500` → Sous-labels INVISIBLES
- **Ligne 199**: `text-sm font-medium text-gray-700 dark:text-gray-300` → Labels liens INVISIBLES
- **Ligne 239**: `text-sm font-medium text-gray-700 dark:text-gray-300` → Labels liens INVISIBLES

### 2. BloggerDashboardLayout.tsx
- **Ligne 90**: `text-xs sm:text-sm text-gray-500 dark:text-gray-400` → Commission info INVISIBLE
- **Ligne 244**: `text-xs text-gray-500` → "/appel" label INVISIBLE
- **Ligne 250**: `text-xs text-gray-500` → "/partenaire" label INVISIBLE

### 3. BloggerResources.tsx
- **Ligne 132**: `text-gray-500 dark:text-gray-400` → Subtitle INVISIBLE
- **Ligne 164**: `text-gray-900 dark:text-white` + border-gray-200 → Input invisible en clair

### 4. BloggerEarnings.tsx
- **Ligne 181**: `text-gray-500 dark:text-gray-400` → Subtitle INVISIBLE
- **Ligne 202**: `text-sm text-gray-500 dark:text-gray-400` → Labels cards INVISIBLES
- **Lignes 347-359**: Headers table `text-gray-500` → INVISIBLES

## Solution : Remplacement systématique

### Règle générale
```
AVANT: text-gray-500 dark:text-gray-400
APRÈS: text-gray-700 dark:text-gray-300

AVANT: text-gray-400
APRÈS: text-gray-600 dark:text-gray-400

AVANT: text-gray-600
APRÈS: text-gray-800 dark:text-gray-200
```

## Fichiers à corriger (par ordre de priorité)
1. ✅ BloggerDashboard.tsx (15+ occurrences)
2. ✅ BloggerEarnings.tsx (10+ occurrences)
3. ✅ BloggerDashboardLayout.tsx (5+ occurrences)
4. ✅ BloggerResources.tsx (5+ occurrences)
5. BloggerReferrals.tsx (à vérifier)
6. BloggerLeaderboard.tsx (à vérifier)
7. BloggerPayments.tsx (à vérifier)
8. BloggerProfile.tsx (à vérifier)
