import { expect, test } from '@playwright/test';

test('loads the web application shell', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Bylder')).toBeVisible();
});