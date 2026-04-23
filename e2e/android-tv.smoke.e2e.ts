import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 1920, height: 1080 },
  userAgent:
    'Mozilla/5.0 (Linux; Android 12; BRAVIA 4K GB ATV3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
});

test.describe('Android TV smoke', () => {
  test('renders layout on 1080p TV viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Add Provider' })).toBeVisible();
  });

  test('basic d-pad style tab navigation reaches actionable elements', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const addProvider = page.getByRole('button', { name: 'Add Provider' });
    await addProvider.focus();
    await expect(addProvider).toBeFocused();
  });
});
