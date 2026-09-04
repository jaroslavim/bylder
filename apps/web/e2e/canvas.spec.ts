import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function openCanvas(page: Page) {
  await page.goto('/heating/canvas');
  await expect(page.getByRole('application', { name: 'Heating layout canvas' })).toBeVisible();
}

test('selects and drags a heating zone onto the 100mm grid', async ({ page }) => {
  await openCanvas(page);
  const zone = page.locator('[data-component-id="zone-1"]');
  await zone.click();
  await expect(zone).toHaveClass(/is-selected/);
  const box = await zone.boundingBox();
  if (!box) throw new Error('zone is not measurable');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 57, box.y + box.height / 2 + 41);
  await page.mouse.up();
  await expect(zone).toHaveAttribute('transform', /translate\(400 300\)/);
});

test('rotates the selected component', async ({ page }) => {
  await openCanvas(page);
  const zone = page.locator('[data-component-id="zone-2"]');
  await zone.click();
  await page.getByRole('button', { name: 'Rotate selected component' }).click();
  await expect(zone).toHaveAttribute('transform', /rotate\(90\)/);
});

test('resizes the starter room and snaps its bounds', async ({ page }) => {
  await openCanvas(page);
  const handle = page.locator('[data-resize-handle="0"]');
  const box = await handle.boundingBox();
  if (!box) throw new Error('resize handle is not measurable');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 73, box.y + 61);
  await page.mouse.up();
  await expect(page.locator('rect.room-shape[data-room-id="0"]')).toHaveAttribute('width', '900');
  await expect(page.locator('rect.room-shape[data-room-id="0"]')).toHaveAttribute('height', '500');
});

test('places a manifold and zooms the canvas', async ({ page }) => {
  await openCanvas(page);
  await page.getByRole('button', { name: '+ Manifold' }).click();
  await expect(page.locator('[data-component-id="manifold-5"]')).toBeVisible();
  await page.locator('svg[aria-label="Heating layout canvas"]').hover();
  await page.mouse.wheel(0, -200);
  await expect(page.locator('.zoom-readout')).toHaveText('110%');
  await expect(page.locator('.heating-loop')).toHaveCount(3);
});
