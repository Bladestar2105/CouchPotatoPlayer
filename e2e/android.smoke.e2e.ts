import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 412, height: 915 },
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
});

test.describe('Android smoke', () => {
  test('loads welcome provider flow on Android-like viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel('Provider Name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Provider' })).toBeVisible();
  });

  test('keeps provider input usable after keyboard interactions', async ({ page }) => {
    await page.goto('/');
    const providerInput = page.getByLabel('Provider Name');
    await providerInput.focus();
    await page.keyboard.type('Android Provider');
    await expect(providerInput).toHaveValue('Android Provider');
  });
});
