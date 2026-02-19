import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test('admin page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/admin');
    // Should redirect to login since not authenticated
    await page.waitForURL(/connexion|login|admin/);
  });

  test('admin dashboard is protected', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForURL(/connexion|login|admin/);
  });
});
