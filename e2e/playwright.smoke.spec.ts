import { expect, test } from '@playwright/test';

test('playwright runner works', async ({ page }) => {
  await page.setContent('<main data-testid="app">CouchPotatoPlayer</main>');
  await expect(page.getByTestId('app')).toHaveText('CouchPotatoPlayer');
});
