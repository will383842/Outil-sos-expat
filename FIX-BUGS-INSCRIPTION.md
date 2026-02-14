# Fix Bugs Critiques - Inscriptions
**Date**: 2026-02-14
**Urgence**: 🔴 CRITIQUE - Application ne compile pas

---

## 🔴 Erreurs de compilation identifiées

### Résumé
```
Total: 23 erreurs TypeScript
- 10 erreurs `sanitizeEmail` non défini
- 13 erreurs `functionsWest2` (import incorrect)
```

---

## Fix #1: `sanitizeEmail` non importé (10 erreurs)

### Fichiers concernés
1. `src/components/registration/client/ClientRegisterForm.tsx` (2 erreurs)
2. `src/components/registration/expat/ExpatRegisterForm.tsx` (4 erreurs)
3. `src/components/registration/lawyer/LawyerRegisterForm.tsx` (4 erreurs)

### Solution (Option A - Recommandée)

**Remplacer `sanitizeEmail()` par `sanitizeEmailFinal()` partout** (déjà importé)

#### 1. ClientRegisterForm.tsx
```bash
# Ligne 318
sed -i 's/email: sanitizeEmail(form.email),/email: sanitizeEmailFinal(form.email),/' sos/src/components/registration/client/ClientRegisterForm.tsx

# Ligne 363
sed -i 's/setMetaPixelUserData({ email: sanitizeEmail(form.email),/setMetaPixelUserData({ email: sanitizeEmailFinal(form.email),/' sos/src/components/registration/client/ClientRegisterForm.tsx
```

#### 2. ExpatRegisterForm.tsx
```bash
# Ligne 335
sed -i '335s/email: sanitizeEmail(form.email),/email: sanitizeEmailFinal(form.email),/' sos/src/components/registration/expat/ExpatRegisterForm.tsx

# Ligne 407
sed -i '407s/email: sanitizeEmail(form.email),/email: sanitizeEmailFinal(form.email),/' sos/src/components/registration/expat/ExpatRegisterForm.tsx

# Ligne 416
sed -i '416s/email: sanitizeEmail(form.email),/email: sanitizeEmailFinal(form.email),/' sos/src/components/registration/expat/ExpatRegisterForm.tsx

# Ligne 424
sed -i '424s/setMetaPixelUserData({ email: sanitizeEmail(form.email),/setMetaPixelUserData({ email: sanitizeEmailFinal(form.email),/' sos/src/components/registration/expat/ExpatRegisterForm.tsx
```

#### 3. LawyerRegisterForm.tsx
```bash
# Ligne 333
sed -i '333s/email: sanitizeEmail(form.email),/email: sanitizeEmailFinal(form.email),/' sos/src/components/registration/lawyer/LawyerRegisterForm.tsx

# Ligne 405
sed -i '405s/email: sanitizeEmail(form.email),/email: sanitizeEmailFinal(form.email),/' sos/src/components/registration/lawyer/LawyerRegisterForm.tsx

# Ligne 414
sed -i '414s/email: sanitizeEmail(form.email),/email: sanitizeEmailFinal(form.email),/' sos/src/components/registration/lawyer/LawyerRegisterForm.tsx

# Ligne 422
sed -i '422s/setMetaPixelUserData({ email: sanitizeEmail(form.email),/setMetaPixelUserData({ email: sanitizeEmailFinal(form.email),/' sos/src/components/registration/lawyer/LawyerRegisterForm.tsx
```

### Solution (Option B - Alternative)

**Importer `sanitizeEmail` dans chaque fichier**

#### 1. ClientRegisterForm.tsx
```typescript
// Ligne 10 - AVANT
import { sanitizeString, sanitizeEmailInput, sanitizeEmailFinal } from '../shared/sanitize';

// Ligne 10 - APRÈS
import { sanitizeString, sanitizeEmailInput, sanitizeEmailFinal, sanitizeEmail } from '../shared/sanitize';
```

#### 2. ExpatRegisterForm.tsx
```typescript
// Ligne 14 - AVANT
import { sanitizeString, sanitizeStringFinal, sanitizeEmailInput, sanitizeEmailFinal } from '../shared/sanitize';

// Ligne 14 - APRÈS
import { sanitizeString, sanitizeStringFinal, sanitizeEmailInput, sanitizeEmailFinal, sanitizeEmail } from '../shared/sanitize';
```

#### 3. LawyerRegisterForm.tsx
```typescript
// Ligne 14 - AVANT
import { sanitizeString, sanitizeStringFinal, sanitizeEmailInput, sanitizeEmailFinal } from '../shared/sanitize';

// Ligne 14 - APRÈS
import { sanitizeString, sanitizeStringFinal, sanitizeEmailInput, sanitizeEmailFinal, sanitizeEmail } from '../shared/sanitize';
```

---

## Fix #2: `functionsWest2` import incorrect (13 erreurs)

### Fichiers concernés
1. `src/hooks/useGroupAdmin.ts` (5 erreurs)
2. `src/hooks/useGroupAdminPosts.ts` (5 erreurs)
3. `src/hooks/useGroupAdminResources.ts` (3 erreurs estimées)

### Erreur détectée
```typescript
// ❌ AVANT - Import inexistant
import { httpsCallable } from 'firebase/functionsWest2';
import { functionsWest2West2 } from '@/config/firebase'; // Typo double "West2"
```

### Solution

#### 1. useGroupAdmin.ts
```typescript
// Ligne 8 - AVANT
import { httpsCallable } from 'firebase/functionsWest2';

// Ligne 8 - APRÈS
import { httpsCallable } from 'firebase/functions';

// Ligne 9 - AVANT
import { functionsWest2West2 } from '@/config/firebase';

// Ligne 9 - APRÈS
import { functionsWest2 } from '@/config/firebase';
```

#### 2. useGroupAdminPosts.ts
```typescript
// Ligne 6 - AVANT
import { httpsCallable } from 'firebase/functionsWest2';

// Ligne 6 - APRÈS
import { httpsCallable } from 'firebase/functions';

// Ligne 7 - AVANT
import { functionsWest2West2 } from '@/config/firebase';

// Ligne 7 - APRÈS
import { functionsWest2 } from '@/config/firebase';
```

#### 3. useGroupAdminResources.ts
```typescript
// Ligne 6 - AVANT
import { httpsCallable } from 'firebase/functionsWest2';

// Ligne 6 - APRÈS
import { httpsCallable } from 'firebase/functions';

// Supposé ligne 7 - AVANT
import { functionsWest2West2 } from '@/config/firebase';

// Supposé ligne 7 - APRÈS
import { functionsWest2 } from '@/config/firebase';
```

---

## 🚀 Script de correction automatique

Créer `sos/scripts/fix-registration-bugs.sh`:

```bash
#!/bin/bash

echo "🔧 Fixing registration bugs..."

# Fix #1: sanitizeEmail → sanitizeEmailFinal
echo "📝 Fix #1: Replacing sanitizeEmail() with sanitizeEmailFinal()..."

# ClientRegisterForm.tsx
sed -i 's/sanitizeEmail(form\.email)/sanitizeEmailFinal(form.email)/g' \
  src/components/registration/client/ClientRegisterForm.tsx

# ExpatRegisterForm.tsx
sed -i 's/sanitizeEmail(form\.email)/sanitizeEmailFinal(form.email)/g' \
  src/components/registration/expat/ExpatRegisterForm.tsx

# LawyerRegisterForm.tsx
sed -i 's/sanitizeEmail(form\.email)/sanitizeEmailFinal(form.email)/g' \
  src/components/registration/lawyer/LawyerRegisterForm.tsx

echo "✅ Fix #1 done: sanitizeEmail replaced in 3 files"

# Fix #2: functionsWest2 imports
echo "📝 Fix #2: Fixing functionsWest2 imports..."

# useGroupAdmin.ts
sed -i "s/from 'firebase\/functionsWest2'/from 'firebase\/functions'/" \
  src/hooks/useGroupAdmin.ts
sed -i 's/functionsWest2West2/functionsWest2/g' \
  src/hooks/useGroupAdmin.ts

# useGroupAdminPosts.ts
sed -i "s/from 'firebase\/functionsWest2'/from 'firebase\/functions'/" \
  src/hooks/useGroupAdminPosts.ts
sed -i 's/functionsWest2West2/functionsWest2/g' \
  src/hooks/useGroupAdminPosts.ts

# useGroupAdminResources.ts
sed -i "s/from 'firebase\/functionsWest2'/from 'firebase\/functions'/" \
  src/hooks/useGroupAdminResources.ts
sed -i 's/functionsWest2West2/functionsWest2/g' \
  src/hooks/useGroupAdminResources.ts

echo "✅ Fix #2 done: functionsWest2 imports fixed in 3 files"

echo ""
echo "🎉 All fixes applied!"
echo "📝 Modified files:"
echo "   - src/components/registration/client/ClientRegisterForm.tsx"
echo "   - src/components/registration/expat/ExpatRegisterForm.tsx"
echo "   - src/components/registration/lawyer/LawyerRegisterForm.tsx"
echo "   - src/hooks/useGroupAdmin.ts"
echo "   - src/hooks/useGroupAdminPosts.ts"
echo "   - src/hooks/useGroupAdminResources.ts"
echo ""
echo "🧪 Testing build..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed. Check errors above."
  exit 1
fi
```

### Lancer le script
```bash
cd sos
chmod +x scripts/fix-registration-bugs.sh
./scripts/fix-registration-bugs.sh
```

---

## ✅ Vérification post-fix

### 1. Vérifier les modifications
```bash
# Voir les changements
git diff src/components/registration/client/ClientRegisterForm.tsx
git diff src/components/registration/expat/ExpatRegisterForm.tsx
git diff src/components/registration/lawyer/LawyerRegisterForm.tsx
git diff src/hooks/useGroupAdmin.ts
git diff src/hooks/useGroupAdminPosts.ts
git diff src/hooks/useGroupAdminResources.ts
```

### 2. Compiler pour vérifier
```bash
cd sos
npm run build
```

**Résultat attendu**: ✅ 0 erreur TypeScript

### 3. Tests manuels
```bash
# Démarrer le serveur de dev
npm run dev

# Tester les 3 parcours d'inscription
# 1. http://localhost:5173/register-client
# 2. http://localhost:5173/register-lawyer
# 3. http://localhost:5173/register-expat
```

---

## 📝 Checklist de déploiement

- [ ] Script de fix exécuté avec succès
- [ ] Build TypeScript passe sans erreur
- [ ] Tests manuels des 3 parcours OK
- [ ] Git diff vérifié (seulement les lignes attendues modifiées)
- [ ] Commit avec message explicite
- [ ] Push vers main → Auto-déploiement Cloudflare Pages

### Message de commit suggéré
```bash
git add src/components/registration/*/*.tsx src/hooks/useGroupAdmin*.ts
git commit -m "fix(registration): correct sanitizeEmail and functionsWest2 imports

- Replace sanitizeEmail() with sanitizeEmailFinal() (already imported)
- Fix firebase/functionsWest2 → firebase/functions
- Fix functionsWest2West2 → functionsWest2 typo

Fixes 23 TypeScript compilation errors blocking production build.

Files changed:
- ClientRegisterForm.tsx (2 fixes)
- ExpatRegisterForm.tsx (4 fixes)
- LawyerRegisterForm.tsx (4 fixes)
- useGroupAdmin.ts (5 fixes)
- useGroupAdminPosts.ts (5 fixes)
- useGroupAdminResources.ts (3 fixes)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

---

## 🔍 Analyse root cause

### Pourquoi ces erreurs sont apparues ?

#### 1. `sanitizeEmail` vs `sanitizeEmailFinal`

**Historique probable**:
```typescript
// sanitize.ts - Version initiale
export const sanitizeEmail = (email: string) => {
  return email.trim().toLowerCase();
};

// sanitize.ts - Refactoring pour meilleure UX (éviter toLowerCase en onChange)
export const sanitizeEmailInput = (email: string) => {
  return email.replace(/\s/g, ''); // Remove spaces only
};

export const sanitizeEmailFinal = (email: string) => {
  return email.trim().toLowerCase(); // Final version for submission
};

export const sanitizeEmail = sanitizeEmailFinal; // ✅ Alias créé

// Mais dans les imports...
// ❌ OUBLIÉ d'importer sanitizeEmail, seulement sanitizeEmailFinal
import { ..., sanitizeEmailFinal } from '../shared/sanitize';
// ... mais utilisation de sanitizeEmail() dans le code
```

**Leçon**: Toujours vérifier les imports après un refactoring

#### 2. `functionsWest2West2` typo

**Probable**: Copier-coller avec double typo
```typescript
// Copié depuis useChatter.ts (correct)
import { functionsWest2 } from '@/config/firebase';

// Collé dans useGroupAdmin.ts avec typo
import { functionsWest2West2 } from '@/config/firebase'; // ❌ Double "West2"

// Et mauvais import Firebase
import { httpsCallable } from 'firebase/functionsWest2'; // ❌ Module inexistant
```

**Leçon**: Activer ESLint auto-import suggestions

---

## 🛡️ Prévention future

### 1. Pre-commit hook TypeScript
Ajouter dans `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running TypeScript type check..."
cd sos && npm run type-check

if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found. Commit aborted."
  exit 1
fi
```

Ajouter script dans `package.json`:
```json
{
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

### 2. ESLint règle import check
Dans `.eslintrc.cjs`:
```javascript
module.exports = {
  rules: {
    'import/no-unresolved': 'error',
    'import/named': 'error',
  },
};
```

### 3. CI/CD check
GitHub Actions (si utilisé):
```yaml
name: Type Check
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run type-check
```

---

**Document créé le**: 2026-02-14
**Temps estimé de fix**: 5-10 minutes
**Criticité**: 🔴 P0 - Bloque production
