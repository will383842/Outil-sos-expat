import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
  test('login page loads with form fields', async ({ page }) => {
    await page.goto('/fr-fr/connexion');
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('#email, input[type="email"]').first()).toBeVisible();
    await expect(page.locator('#password, input[type="password"]').first()).toBeVisible();
  });

  test('client registration page loads', async ({ page }) => {
    await page.goto('/fr-fr/inscription/client');
    await expect(page.locator('form')).toBeVisible();
  });

  test('lawyer registration page loads', async ({ page }) => {
    await page.goto('/fr-fr/inscription/avocat');
    await expect(page.locator('form')).toBeVisible();
  });

  test('expat registration page loads', async ({ page }) => {
    await page.goto('/fr-fr/inscription/expatrie');
    await expect(page.locator('form')).toBeVisible();
  });
});
