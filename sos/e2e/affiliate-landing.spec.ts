import { test, expect } from '@playwright/test';

test.describe('Affiliate Landing Pages', () => {
  test('chatter landing page loads', async ({ page }) => {
    await page.goto('/fr-fr/chatter');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('a[href*="inscription"], button').first()).toBeVisible();
  });

  test('influencer landing page loads', async ({ page }) => {
    await page.goto('/fr-fr/influencer');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('blogger landing page loads', async ({ page }) => {
    await page.goto('/fr-fr/blogger');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('group admin landing page loads', async ({ page }) => {
    await page.goto('/fr-fr/group-admin');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('chatter registration page loads', async ({ page }) => {
    await page.goto('/fr-fr/chatter/inscription');
    await expect(page.locator('form')).toBeVisible();
  });

  test('influencer registration page loads', async ({ page }) => {
    await page.goto('/fr-fr/influencer/inscription');
    await expect(page.locator('form')).toBeVisible();
  });

  test('blogger registration page loads', async ({ page }) => {
    await page.goto('/fr-fr/blogger/inscription');
    await expect(page.locator('form')).toBeVisible();
  });

  test('group admin registration page loads', async ({ page }) => {
    await page.goto('/fr-fr/group-admin/inscription');
    await expect(page.locator('form')).toBeVisible();
  });
});
