import { expect, test } from '@playwright/test';

test.describe('Welcome provider form UI', () => {
  test('shows provider fields with compact sizing', async ({ page }) => {
    await page.goto('/');

    const providerNameInput = page.getByLabel('Provider Name');
    await expect(providerNameInput).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Provider' })).toBeVisible();

    const box = await providerNameInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThan(70);

    const styles = await providerNameInput.evaluate((node) => {
      const computed = window.getComputedStyle(node as HTMLElement);
      return {
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
      };
    });

    expect(styles.backgroundColor).not.toBe('rgb(169, 169, 169)');
    expect(parseFloat(styles.fontSize)).toBeLessThanOrEqual(18);
  });
});
