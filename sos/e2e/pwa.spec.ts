import { test, expect } from '@playwright/test';

test.describe('PWA Features', () => {
  test('app shell loads correctly', async ({ page }) => {
    await page.goto('/fr-fr');
    await expect(page.locator('nav, header').first()).toBeVisible();
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('PWA meta tags are present', async ({ page }) => {
    await page.goto('/fr-fr');
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveCount(1);
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);
  });

  test('homepage loads with critical content', async ({ page }) => {
    await page.goto('/fr-fr');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
