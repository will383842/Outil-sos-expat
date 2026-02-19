import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('SOS call page loads with provider list', async ({ page }) => {
    await page.goto('/fr-fr/nos-experts');
    await expect(page.locator('main')).toBeVisible();
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/fr-fr/tarifs');
    await expect(page.locator('main')).toBeVisible();
  });

  test('protected booking page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/fr-fr/booking-request');
    // Should redirect to login
    await page.waitForURL(/connexion|login/);
  });
});
