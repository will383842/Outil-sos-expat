# Guide de Tests E2E avec Playwright
**Projet**: SOS Expat
**Date**: 2026-02-14

---

## 📦 Installation Playwright

### Étape 1: Installer Playwright
```bash
cd sos
npm install -D @playwright/test
npx playwright install
```

### Étape 2: Configuration Playwright
Créer `sos/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 🧪 Tests d'inscription

### Test 1: Inscription Client - Parcours nominal

Créer `sos/tests/e2e/register-client.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Inscription Client', () => {
  const timestamp = Date.now();
  const testEmail = `test-client-${timestamp}@example.com`;

  test('Parcours nominal complet', async ({ page }) => {
    // 1. Navigation vers la page d'inscription
    await page.goto('/register-client');

    // 2. Vérifier que la page est chargée
    await expect(page.locator('h1')).toContainText('Créer un compte');

    // 3. Remplir le formulaire
    await page.fill('input[name="firstName"]', 'Jean');
    await page.fill('input[name="lastName"]', 'Dupont');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'MonMotDePasse123!');

    // 4. Téléphone avec PhoneInput (react-phone-number-input)
    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.click();
    await phoneInput.fill('+33612345678');
    await phoneInput.blur();

    // 5. Langues parlées (MultiLanguageSelect - react-select)
    const languagesSelect = page.locator('#languagesSpoken');
    await languagesSelect.click();
    await page.locator('text=Français').first().click();
    await languagesSelect.click();
    await page.locator('text=English').first().click();
    await page.keyboard.press('Escape');

    // 6. Accepter les CGU
    await page.check('input[type="checkbox"][name="acceptTerms"]');

    // 7. Vérifier que le bouton de soumission est activé
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();

    // 8. Soumettre le formulaire
    await submitButton.click();

    // 9. Attendre la redirection vers le dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // 10. Vérifier le message de succès
    await expect(page.locator('text=Inscription réussie')).toBeVisible({ timeout: 5000 });

    // 11. Vérifier que l'utilisateur est connecté
    const userMenu = page.locator('[data-testid="user-menu"]').or(page.locator('text=Jean Dupont'));
    await expect(userMenu).toBeVisible({ timeout: 5000 });
  });

  test('Validation email - Format invalide', async ({ page }) => {
    await page.goto('/register-client');

    await page.fill('input[name="firstName"]', 'Jean');
    await page.fill('input[name="lastName"]', 'Dupont');
    await page.fill('input[name="email"]', 'email-invalide'); // ❌ Pas de @
    await page.fill('input[name="password"]', 'MonMotDePasse123!');

    // Blur pour déclencher la validation
    await page.locator('input[name="email"]').blur();

    // Vérifier le message d'erreur
    await expect(page.locator('text=Email invalide')).toBeVisible();

    // Le bouton submit doit être désactivé
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('Validation mot de passe - Trop court', async ({ page }) => {
    await page.goto('/register-client');

    await page.fill('input[name="password"]', '123'); // ❌ < 8 chars

    await page.locator('input[name="password"]').blur();

    // Vérifier le message d'erreur
    await expect(page.locator('text=au moins 8 caractères')).toBeVisible();

    // Vérifier l'indicateur de force (rouge)
    const strengthIndicator = page.locator('[data-testid="password-strength"]');
    await expect(strengthIndicator).toHaveClass(/bg-red/);
  });

  test('Validation téléphone - Format invalide', async ({ page }) => {
    await page.goto('/register-client');

    const phoneInput = page.locator('input[type="tel"]');
    await phoneInput.click();
    await phoneInput.fill('123'); // ❌ Trop court
    await phoneInput.blur();

    // Vérifier le message d'erreur
    await expect(page.locator('text=téléphone invalide')).toBeVisible();
  });

  test('Erreur - Email déjà existant', async ({ page }) => {
    // Créer d'abord un compte
    const existingEmail = `existing-${Date.now()}@example.com`;

    // ... inscription réussie (code omis pour brièveté)

    // Déconnexion
    await page.goto('/logout');

    // Tentative d'inscription avec le même email
    await page.goto('/register-client');
    await page.fill('input[name="firstName"]', 'Pierre');
    await page.fill('input[name="lastName"]', 'Martin');
    await page.fill('input[name="email"]', existingEmail); // ❌ Déjà utilisé
    await page.fill('input[name="password"]', 'AutreMotDePasse123!');
    await page.fill('input[type="tel"]', '+33698765432');

    const languagesSelect = page.locator('#languagesSpoken');
    await languagesSelect.click();
    await page.locator('text=Français').first().click();
    await page.keyboard.press('Escape');

    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');

    // Vérifier le message d'erreur
    await expect(page.locator('text=Cet email est déjà associé')).toBeVisible({ timeout: 5000 });

    // L'utilisateur doit rester sur la page d'inscription
    await expect(page).toHaveURL(/\/register-client/);
  });

  test('Google Sign-In - Affichage popup', async ({ page, context }) => {
    await page.goto('/register-client');

    // Intercepter la popup Google
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.click('button:has-text("S\'inscrire avec Google")'),
    ]);

    // Vérifier que la popup Google OAuth est bien ouverte
    await expect(popup).toHaveURL(/accounts\.google\.com/);
  });
});
```

---

### Test 2: Inscription Avocat - Wizard complet

Créer `sos/tests/e2e/register-lawyer.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Inscription Avocat', () => {
  const timestamp = Date.now();
  const testEmail = `lawyer-${timestamp}@example.com`;

  test('Wizard complet - 5 étapes', async ({ page }) => {
    await page.goto('/register-lawyer');

    // ========== ÉTAPE 1: IDENTITÉ ==========
    await expect(page.locator('h2:has-text("Identité")')).toBeVisible();

    await page.fill('input[name="firstName"]', 'Marie');
    await page.fill('input[name="lastName"]', 'Martin');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'LawyerPass123!');
    await page.fill('input[type="tel"]', '+33698765432');

    // Attendre que la validation soit OK
    await expect(page.locator('.field-success:has-text("Email valide")')).toBeVisible();

    // Cliquer "Suivant"
    await page.click('button:has-text("Suivant")');

    // ========== ÉTAPE 2: LOCALISATION ==========
    await expect(page.locator('h2:has-text("Localisation")')).toBeVisible();

    // Pays de résidence
    await page.selectOption('select[name="currentCountry"]', { label: 'France' });

    // Pays d'exercice (multi-select)
    const practiceSelect = page.locator('#practiceCountries');
    await practiceSelect.click();
    await page.locator('text=France').first().click();
    await practiceSelect.click();
    await page.locator('text=Belgique').first().click();
    await page.keyboard.press('Escape');

    // Langue préférée
    await page.selectOption('select[name="preferredLanguage"]', { value: 'fr' });

    await page.click('button:has-text("Suivant")');

    // ========== ÉTAPE 3: EXPERTISE ==========
    await expect(page.locator('h2:has-text("Expertise")')).toBeVisible();

    // Spécialités
    const specialtiesSelect = page.locator('#specialties');
    await specialtiesSelect.click();
    await page.locator('text=Droit de l\'immigration').first().click();
    await specialtiesSelect.click();
    await page.locator('text=Droit des affaires').first().click();
    await page.keyboard.press('Escape');

    // Formation
    await page.fill('input[id="education-0"]', 'Université Paris 1 Panthéon-Sorbonne');

    // Ajouter une deuxième formation
    await page.click('button:has-text("Ajouter une formation")');
    await page.fill('input[id="education-1"]', 'Master 2 Droit International');

    // Année de diplôme
    await page.fill('input[name="graduationYear"]', '2014');

    // Années d'expérience
    await page.fill('input[name="yearsOfExperience"]', '10');

    await page.click('button:has-text("Suivant")');

    // ========== ÉTAPE 4: PROFIL ==========
    await expect(page.locator('h2:has-text("Profil")')).toBeVisible();

    // Bio (minimum 100 caractères)
    const bioText = 'Avocat spécialisé en droit de l\'immigration et droit des affaires internationaux. ' +
                    'Fort de 10 années d\'expérience, je conseille et défends mes clients dans leurs démarches ' +
                    'administratives et juridiques. Parfaitement bilingue français-anglais.';
    await page.fill('textarea[name="bio"]', bioText);

    // Vérifier le compteur de caractères
    await expect(page.locator(`text=${bioText.length}`)).toBeVisible();

    // Upload photo de profil
    const fileInput = page.locator('input[type="file"]');
    const photoPath = path.resolve(__dirname, '../fixtures/profile-photo.jpg');
    await fileInput.setInputFiles(photoPath);

    // Attendre la fin de l'upload
    await expect(page.locator('img[alt="Profile photo"]')).toBeVisible({ timeout: 10000 });

    // Langues parlées
    const languagesSelect = page.locator('#languages');
    await languagesSelect.click();
    await page.locator('text=Français').first().click();
    await languagesSelect.click();
    await page.locator('text=English').first().click();
    await page.keyboard.press('Escape');

    await page.click('button:has-text("Suivant")');

    // ========== ÉTAPE 5: VALIDATION ==========
    await expect(page.locator('h2:has-text("Finalisez votre inscription")')).toBeVisible();

    // Vérifier le récapitulatif
    await expect(page.locator('text=Marie Martin')).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    await expect(page.locator('text=France')).toBeVisible();

    // Accepter les CGU
    await page.check('input[type="checkbox"]');

    // Soumettre
    await page.click('button:has-text("Finaliser")');

    // ========== VÉRIFICATIONS FINALES ==========
    // Attendre la création du compte + Stripe (peut prendre 3-5s)
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Vérifier le message de succès
    await expect(page.locator('text=Inscription réussie')).toBeVisible({ timeout: 5000 });

    // Vérifier que l'utilisateur voit son dashboard avocat
    await expect(page.locator('text=Dashboard Avocat').or(page.locator('text=Mes consultations'))).toBeVisible();
  });

  test('Navigation wizard - Bouton Précédent', async ({ page }) => {
    await page.goto('/register-lawyer');

    // Remplir étape 1
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', `back-test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[type="tel"]', '+33612345678');
    await page.click('button:has-text("Suivant")');

    // Étape 2
    await expect(page.locator('h2:has-text("Localisation")')).toBeVisible();

    // Cliquer "Précédent"
    await page.click('button:has-text("Précédent")');

    // Vérifier retour à l'étape 1
    await expect(page.locator('h2:has-text("Identité")')).toBeVisible();

    // Vérifier que les données sont conservées
    await expect(page.locator('input[name="firstName"]')).toHaveValue('Test');
    await expect(page.locator('input[name="lastName"]')).toHaveValue('User');
  });

  test('Validation étape par étape - Bloquage si incomplet', async ({ page }) => {
    await page.goto('/register-lawyer');

    // Essayer de passer à l'étape 2 sans remplir
    await page.click('button:has-text("Suivant")');

    // Doit rester sur l'étape 1
    await expect(page.locator('h2:has-text("Identité")')).toBeVisible();

    // Vérifier les messages d'erreur
    await expect(page.locator('text=Prénom requis').or(page.locator('text=Ce champ est requis'))).toBeVisible();
  });

  test('Upload photo - Fichier trop volumineux', async ({ page }) => {
    await page.goto('/register-lawyer');

    // Naviguer jusqu'à l'étape 4 (code de remplissage étapes 1-3 omis)
    // ...

    // Créer un fichier de 6MB (> 5MB limite)
    const largeBuf = Buffer.alloc(6 * 1024 * 1024, 'x');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-photo.jpg',
      mimeType: 'image/jpeg',
      buffer: largeBuf,
    });

    // Vérifier le message d'erreur
    await expect(page.locator('text=File too large').or(page.locator('text=Fichier trop volumineux'))).toBeVisible();
  });
});
```

---

### Test 3: Inscription Expatrié - Domaines d'aide personnalisés

Créer `sos/tests/e2e/register-expat.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Inscription Expatrié', () => {
  test('Ajout domaine d\'aide personnalisé', async ({ page }) => {
    await page.goto('/register-expat');

    // Naviguer jusqu'à l'étape 3 (Services)
    // ... remplir étapes 1-2 (code omis)

    // Sélectionner "Autre (préciser)"
    const helpTypesSelect = page.locator('#helpTypes');
    await helpTypesSelect.click();
    await page.locator('text=Autre (préciser)').first().click();

    // L'input custom doit apparaître
    await expect(page.locator('input[placeholder*="Précisez"]')).toBeVisible();

    // Saisir un domaine personnalisé
    await page.fill('input[placeholder*="Précisez"]', 'Aide à la recherche d\'emploi');

    // Appuyer sur Entrée ou cliquer OK
    await page.press('input[placeholder*="Précisez"]', 'Enter');

    // Vérifier que le tag apparaît
    await expect(page.locator('text=Aide à la recherche d\'emploi')).toBeVisible();

    // L'input custom doit disparaître
    await expect(page.locator('input[placeholder*="Précisez"]')).not.toBeVisible();
  });

  test('Auto-remplissage pays d\'intervention', async ({ page }) => {
    await page.goto('/register-expat');

    // Remplir étape 1
    await page.fill('input[name="firstName"]', 'Sophie');
    await page.fill('input[name="lastName"]', 'Leroy');
    await page.fill('input[name="email"]', `expat-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'ExpatPass123!');
    await page.fill('input[type="tel"]', '+33687654321');
    await page.click('button:has-text("Suivant")');

    // Étape 2: Sélectionner pays d'origine
    await page.selectOption('select[name="currentCountry"]', { label: 'France' });

    // Vérifier que le pays de résidence est auto-rempli
    const presenceCountrySelect = page.locator('select[name="currentPresenceCountry"]');
    await expect(presenceCountrySelect).toHaveValue('France');

    // Vérifier que le pays d'intervention contient la France
    await expect(page.locator('#interventionCountries:has-text("France")')).toBeVisible();
  });

  test('Validation années d\'expatriation - Minimum requis', async ({ page }) => {
    await page.goto('/register-expat');

    // Naviguer jusqu'à l'étape 3
    // ...

    // Essayer de mettre 0 an
    await page.fill('input[name="yearsAsExpat"]', '0');
    await page.click('button:has-text("Suivant")');

    // Vérifier le message d'erreur
    await expect(page.locator('text=au moins 1 an').or(page.locator('text=minimum'))).toBeVisible();

    // Doit rester sur l'étape 3
    await expect(page.locator('h2:has-text("Services")')).toBeVisible();
  });
});
```

---

## 🔍 Tests de régression

### Test 4: Erreurs courantes

Créer `sos/tests/e2e/registration-errors.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Gestion d\'erreurs inscription', () => {
  test('Réseau hors ligne - Affichage erreur', async ({ page, context }) => {
    await page.goto('/register-client');

    // Remplir le formulaire
    await page.fill('input[name="firstName"]', 'Jean');
    await page.fill('input[name="lastName"]', 'Offline');
    await page.fill('input[name="email"]', `offline-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[type="tel"]', '+33612345678');

    const languagesSelect = page.locator('#languagesSpoken');
    await languagesSelect.click();
    await page.locator('text=Français').first().click();
    await page.keyboard.press('Escape');

    await page.check('input[type="checkbox"]');

    // Simuler perte de connexion
    await context.setOffline(true);

    // Soumettre
    await page.click('button[type="submit"]');

    // Vérifier le message d'erreur réseau
    await expect(page.locator('text=Erreur réseau').or(page.locator('text=connexion'))).toBeVisible({ timeout: 5000 });

    // L'utilisateur doit rester sur la page
    await expect(page).toHaveURL(/\/register-client/);

    // Rétablir la connexion
    await context.setOffline(false);
  });

  test('Firebase timeout - Message approprié', async ({ page }) => {
    // Difficile à simuler sans mock backend
    // Alternative: Tester avec un délai artificiel

    await page.route('**/identitytoolkit.googleapis.com/**', route => {
      setTimeout(() => route.abort(), 10000); // Timeout après 10s
    });

    await page.goto('/register-client');

    // Remplir et soumettre
    // ...

    await expect(page.locator('text=Service temporairement indisponible')).toBeVisible({ timeout: 15000 });
  });

  test('Validation front-end vs back-end', async ({ page }) => {
    // Test: Soumettre un email invalide malgré la validation front

    // Désactiver la validation HTML5
    await page.goto('/register-client');
    await page.evaluate(() => {
      document.querySelectorAll('input[type="email"]').forEach((input: any) => {
        input.removeAttribute('type');
        input.setAttribute('type', 'text');
      });
    });

    // Remplir avec email invalide
    await page.fill('input[name="email"]', 'email-sans-arobase');
    // ... remplir autres champs

    await page.click('button[type="submit"]');

    // Le back-end doit rejeter
    await expect(page.locator('text=Email invalide').or(page.locator('text=invalid email'))).toBeVisible();
  });
});
```

---

## 📊 Tests de performance

### Test 5: Temps de chargement et réactivité

Créer `sos/tests/e2e/registration-performance.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Performance inscription', () => {
  test('Temps de chargement page < 2s', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/register-client');

    // Attendre que la page soit interactive
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    console.log(`⏱️ Temps de chargement: ${loadTime}ms`);

    // Assertion
    expect(loadTime).toBeLessThan(2000);
  });

  test('Temps de création compte < 3s', async ({ page }) => {
    await page.goto('/register-client');

    // Remplir le formulaire
    const testEmail = `perf-${Date.now()}@example.com`;
    await page.fill('input[name="firstName"]', 'Speed');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[type="tel"]', '+33612345678');

    const languagesSelect = page.locator('#languagesSpoken');
    await languagesSelect.click();
    await page.locator('text=Français').first().click();
    await page.keyboard.press('Escape');

    await page.check('input[type="checkbox"]');

    // Mesurer le temps de soumission
    const submitStart = Date.now();

    await page.click('button[type="submit"]');

    // Attendre la redirection
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });

    const submitTime = Date.now() - submitStart;

    console.log(`⏱️ Temps de création compte: ${submitTime}ms`);

    // Assertion (avec marge pour Stripe)
    expect(submitTime).toBeLessThan(3000);
  });

  test('Upload photo < 5s', async ({ page }) => {
    // Test sur formulaire avocat
    await page.goto('/register-lawyer');

    // Naviguer jusqu'à l'étape 4 (code omis)
    // ...

    const uploadStart = Date.now();

    // Upload fichier 1MB
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(1 * 1024 * 1024, 'x'),
    });

    // Attendre l'affichage de la preview
    await page.waitForSelector('img[alt="Profile photo"]', { timeout: 10000 });

    const uploadTime = Date.now() - uploadStart;

    console.log(`⏱️ Temps upload photo: ${uploadTime}ms`);

    expect(uploadTime).toBeLessThan(5000);
  });
});
```

---

## 🚀 Lancer les tests

### Commandes

```bash
# Lancer tous les tests
npm run test:e2e

# Lancer un test spécifique
npx playwright test tests/e2e/register-client.spec.ts

# Lancer en mode debug
npx playwright test --debug

# Lancer en mode headed (voir le navigateur)
npx playwright test --headed

# Lancer avec un navigateur spécifique
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Générer un rapport HTML
npx playwright show-report
```

### Scripts package.json

Ajouter dans `sos/package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  }
}
```

---

## 📸 Screenshots et traces

### Configuration automatique

Les screenshots et traces sont capturés automatiquement en cas d'échec (voir `playwright.config.ts`).

### Localisation des artéfacts
- Screenshots: `sos/test-results/<test-name>/screenshot.png`
- Traces: `sos/test-results/<test-name>/trace.zip`

### Visualiser une trace
```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

---

## 🎭 Fixtures personnalisées

### Créer des helpers réutilisables

Créer `sos/tests/e2e/fixtures/auth.ts`:

```typescript
import { test as base } from '@playwright/test';

export const test = base.extend({
  // Helper pour inscription rapide
  quickRegisterClient: async ({ page }, use) => {
    const register = async (overrides: Partial<{ email: string; firstName: string }> = {}) => {
      const timestamp = Date.now();
      const email = overrides.email || `test-${timestamp}@example.com`;
      const firstName = overrides.firstName || 'Test';

      await page.goto('/register-client');
      await page.fill('input[name="firstName"]', firstName);
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'Password123!');
      await page.fill('input[type="tel"]', '+33612345678');

      const languagesSelect = page.locator('#languagesSpoken');
      await languagesSelect.click();
      await page.locator('text=Français').first().click();
      await page.keyboard.press('Escape');

      await page.check('input[type="checkbox"]');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      return { email, firstName };
    };

    await use(register);
  },
});

export { expect } from '@playwright/test';
```

### Utilisation

```typescript
import { test, expect } from './fixtures/auth';

test('Dashboard - Accès après inscription', async ({ page, quickRegisterClient }) => {
  // Inscription en 1 ligne
  const { email, firstName } = await quickRegisterClient({ firstName: 'Jean' });

  // Vérifications
  await expect(page.locator(`text=${firstName}`)).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard/);
});
```

---

## ✅ Checklist avant déploiement

- [ ] Tous les tests passent en local
- [ ] Tests passent sur Chrome, Firefox et Safari
- [ ] Temps de chargement < 2s
- [ ] Temps de création compte < 3s
- [ ] Upload photo < 5s
- [ ] Gestion d'erreurs validée (email existant, réseau offline)
- [ ] Validation formulaires fonctionne
- [ ] Wizard avocat/expatrié navigation OK
- [ ] Google Sign-In testé
- [ ] Messages i18n affichés correctement

---

**Guide créé le**: 2026-02-14
**Mainteneur**: Équipe SOS Expat
