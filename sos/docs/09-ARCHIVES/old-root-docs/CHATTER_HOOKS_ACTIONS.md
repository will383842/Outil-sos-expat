# Plan d'Action - Audit Hooks Chatter

## Résumé Exécutif
- **7 hooks Chatter trouvés**
- **4 hooks actifs** ✅
- **2 hooks deprecated** ❌
- **1 hook orphelin** ❌

---

## Actions Immédates

### 1. Supprimer Hooks Deprecated/Orphelins

```bash
# Hooks à supprimer
rm src/hooks/useChatterWithdrawal.ts
rm src/hooks/useChatterQuiz.ts
rm src/hooks/useChatterPromotion.ts
```

**Raisons:**
- `useChatterWithdrawal`: Doublon exact avec `useChatter.requestWithdrawal()`
- `useChatterQuiz`: Route `/chatter/quiz` supprimée du flux
- `useChatterPromotion`: Jamais utilisé, `allPromotions` vide, non reactive

**Après suppression:** Supprimer exports de `src/hooks/index.ts`

```typescript
// SUPPRIMER ces lignes:
export { useChatterWithdrawal } from './useChatterWithdrawal';
export { useChatterQuiz } from './useChatterQuiz';
export { useChatterPromotion } from './useChatterPromotion';
```

### 2. Vérifier Cloud Functions Region (useChatterTraining)

**Problème identifié:**
```typescript
// useChatterTraining.ts (ACTUEL - import différent)
import { functions } from '@/config/firebase';
const result = await httpsCallable(functions, 'getChatterTrainingModules')();

// Autres hooks (pattern standard)
const functions = getFunctions(undefined, "europe-west1");
const result = await httpsCallable(functions, 'getChatterDashboard')();
```

**À vérifier:**
1. `src/config/firebase.ts` - région par défaut pour `functions`?
2. Est-ce la même que `europe-west1`?

**Action:**
```typescript
// Option 1: Harmoniser si c'est la même région
import { getFunctions, httpsCallable } from "firebase/functions";
const functions = getFunctions(undefined, "europe-west1");

// Option 2: Laisser direct si c'est intentionnel (vérifier doc)
import { functions } from '@/config/firebase';  // Documenter région
```

---

## Problèmes Mineurs

### 3. Rendre useChatterPromotion Reactive (SI maintenu)

**Current:** `promotionEndsIn` calculé une fois au return
**Fixed:**

```typescript
// Ajouter avant return
const [timeDisplay, setTimeDisplay] = useState<string | null>(null);

useEffect(() => {
  const updateTime = () => {
    setTimeDisplay(getTimeRemaining());
  };

  const interval = setInterval(updateTime, 60000); // Update chaque minute
  updateTime(); // Initial call

  return () => clearInterval(interval);
}, [activePromotion?.endsAt]);

return {
  // ...
  promotionEndsIn: timeDisplay,
};
```

### 4. Standardiser localStorage Keys

**Current (hardcoded):**
```typescript
const CHATTER_CODE_KEY = "sos_chatter_code";
const CHATTER_CODE_TYPE_KEY = "sos_chatter_code_type";

const getLocalStorageKey = (date: string) => `chatter_missions_${date}`;
```

**Proposed (centralized):**

Créer `src/constants/storageKeys.ts`:
```typescript
export const STORAGE_KEYS = {
  chatter: {
    referralCode: "sos_chatter_code",
    referralCodeType: "sos_chatter_code_type",
    dailyMissions: (date: string) => `chatter_missions_${date}`,
  },
  // ... autres modules
} as const;
```

Puis utiliser dans les hooks:
```typescript
import { STORAGE_KEYS } from '@/constants/storageKeys';

localStorage.setItem(STORAGE_KEYS.chatter.referralCode, code);
localStorage.setItem(STORAGE_KEYS.chatter.referralCodeType, type);
const key = STORAGE_KEYS.chatter.dailyMissions(date);
```

---

## Tests à Ajouter

### 5. Test Daily Missions Reset

**Fichier:** `src/hooks/__tests__/useChatterMissions.test.ts`

```typescript
describe('useChatterMissions', () => {
  it('should reset missions at midnight', () => {
    // Setup: Load progress for date X
    // Fast-forward to midnight
    // Assert: Progress reset with new date
  });

  it('should sync between localStorage and Firestore', async () => {
    // Setup: Store in localStorage
    // Action: Call updateProgress
    // Assert: Both localStorage and Firestore updated
  });

  it('should auto-track login once per session', () => {
    // Setup: Mount hook
    // Assert: loggedInToday = true
    // Setup: Mount hook again (same session)
    // Assert: Not tracked twice
  });
});
```

### 6. Test Cloud Functions Error Handling

```typescript
describe('useChatter error handling', () => {
  it('should handle "not found" error gracefully', async () => {
    // Mock getChatterDashboard to throw "not found"
    // Assert: dashboardData = null, not error
  });

  it('should show retry wait error from quiz', async () => {
    // Simulate cool-down error
    // Assert: error message contains wait time
  });
});
```

---

## Code Quality

### 7. Add TypeScript Strict Mode Check

**Current:** Quelques `any` types

```bash
# Vérifier strict types
npx tsc --noImplicitAny src/hooks/useChatter*.ts
```

### 8. Export All Hooks in index.ts

**Current:** `src/hooks/index.ts`

```typescript
// Ajouter si manquant
export { useChatter, useChatterReferralCapture, getStoredChatterCode, clearStoredChatterCode } from './useChatter';
export { useChatterMissions } from './useChatterMissions';
export { useChatterReferrals } from './useChatterReferrals';
export { useChatterTraining } from './useChatterTraining';
```

---

## Documentation

### 9. Add JSDoc to Major Types

```typescript
/**
 * Chatter dashboard data with balance info
 * @property {ChatterStatus} status - active|suspended
 * @property {string} affiliateCodeClient - Referral code for clients
 * @property {string} affiliateCodeRecruitment - Referral code for recruitment
 * @property {number} availableBalance - Available for withdrawal (cents)
 * @property {number} pendingBalance - Earned but waiting validation (cents)
 * @property {number} validatedBalance - Ready for next payout (cents)
 */
export interface ChatterDashboardData {
  chatter: {
    status: 'active' | 'suspended';
    affiliateCodeClient: string;
    affiliateCodeRecruitment: string;
    availableBalance: number;  // cents
    pendingBalance: number;    // cents
    validatedBalance: number;  // cents
    pendingWithdrawalId?: string;
  };
  config: {
    minimumWithdrawalAmount: number;  // cents = 2500
  };
  unreadNotifications: number;
}
```

---

## Checklist d'Exécution

### Phase 1: Cleanup (1-2 heures)
- [ ] Backup ancien code
- [ ] Supprimer 3 hooks deprecated
- [ ] Supprimer exports de index.ts
- [ ] Tester build sans erreurs
- [ ] Commit: "chore: remove deprecated chatter hooks"

### Phase 2: Vérification (30 min)
- [ ] Vérifier région Cloud Functions (training)
- [ ] Vérifier aucun import de hooks supprimés
- [ ] Tester pages Chatter chargent
- [ ] Commit: "fix: verify training cloud functions region"

### Phase 3: Améliorations (2-3 heures)
- [ ] Créer STORAGE_KEYS centralisé
- [ ] Ajouter JSDoc types
- [ ] Ajouter tests unitaires
- [ ] Commit: "docs: add chatter hooks documentation + tests"

### Phase 4: Review Final
- [ ] Vérifier tous imports
- [ ] Lancer tests complets
- [ ] Vérifier déploiement Firebase Functions
- [ ] Tester UI Chatter en staging

---

## Fichiers Concernés

### À Supprimer
```
src/hooks/useChatterWithdrawal.ts
src/hooks/useChatterQuiz.ts
src/hooks/useChatterPromotion.ts
```

### À Modifier
```
src/hooks/index.ts                    # Supprimer 3 exports
src/hooks/useChatterTraining.ts       # Vérifier région (optionnel)
src/constants/storageKeys.ts          # Créer (optionnel)
```

### À Tester
```
src/pages/Chatter/ChatterDashboard.tsx
src/pages/Chatter/ChatterPayments.tsx
src/pages/Chatter/ChatterReferrals.tsx
src/components/Chatter/Cards/DailyMissionsCard.tsx
src/components/Chatter/Cards/TeamMessagesCard.tsx
```

---

## Commandes Git

```bash
# 1. Vérifier status
git status

# 2. Supprimer les 3 hooks
git rm src/hooks/useChatterWithdrawal.ts
git rm src/hooks/useChatterQuiz.ts
git rm src/hooks/useChatterPromotion.ts

# 3. Modifier index.ts
# (Manual edit to remove exports)

# 4. Commit
git add -A
git commit -m "chore: remove deprecated chatter hooks (withdrawal, quiz, promotion)

- useChatterWithdrawal: duplicate of useChatter.requestWithdrawal()
- useChatterQuiz: route /chatter/quiz removed from flow
- useChatterPromotion: unused, incomplete implementation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# 5. Build test
npm run build

# 6. Push (optionnel)
git push origin main
```

---

## Références

**Documents créés:**
- `CHATTER_HOOKS_AUDIT.md` - Audit détaillé (9 sections)
- `CHATTER_HOOKS_SUMMARY.json` - Résumé JSON structuré
- `CHATTER_HOOKS_ACTIONS.md` - Ce fichier

**Hooks Actifs à Documenter:**
1. `useChatter` - Dashboard principal
2. `useChatterMissions` - Gamification
3. `useChatterReferrals` - Système parrainage
4. `useChatterTraining` - Formation (en construction)

---

## Questions à Clarifier

1. **Région Cloud Functions Training?** - Vérifier `getFunctions(undefined, "europe-west1")`
2. **useChatterPromotion gardé?** - Si non, supprimer; si oui, la rendre reactive
3. **ChatterTraining page?** - Quand sera-t-elle implémentée?
4. **Télégram Bonus?** - Où est géré le bonus $50 de télégram?

---

**Generated:** 2026-02-13 by Claude Code
**Duration:** Full audit + 3 summary files
