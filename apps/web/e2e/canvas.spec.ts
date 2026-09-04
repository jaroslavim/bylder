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

test('toggles snapping and changes the rendered grid size', async ({ page }) => {
  await openCanvas(page);
  await expect(page.getByText('Grid 100 mm')).toBeVisible();
  await page.getByRole('button', { name: 'Snap: on' }).click();
  await expect(page.getByRole('button', { name: 'Snap: off' })).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Grid size' }).fill('50');
  await expect(page.getByText('Grid 50 mm')).toBeVisible();
  await expect(page.locator('#canvas-grid')).toHaveAttribute('width', '50');
});

test('adds a room vertex and exposes geometry-derived wall dimensions', async ({ page }) => {
  await openCanvas(page);
  await page.getByRole('button', { name: 'Draw room' }).click();
  await page.getByRole('button', { name: 'Add vertex' }).click();
  await expect(page.locator('[data-vertex^="room-1-"]')).toHaveCount(5);
  await expect(page.locator('[data-wall-id^="room-1-"] text')).toHaveCount(5);
  const vertex = page.locator('[data-vertex="room-1-1"]');
  const box = await vertex.boundingBox();
  if (!box) throw new Error('vertex is not measurable');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 37, box.y + 21);
  await page.mouse.up();
  await expect(page.locator('[data-wall-id="room-1-0"] text')).toHaveText(/\d+ mm/);
});

test('sets a room label and floor fill color', async ({ page }) => {
  await openCanvas(page);
  await page.getByRole('button', { name: 'Draw room' }).click();
  await page.getByRole('textbox', { name: 'Room label' }).fill('Utility room');
  await page.getByRole('textbox', { name: 'Floor color' }).fill('#DDEEFF');
  await expect(page.locator('[data-room-id="room-1"] .room-label')).toHaveText('Utility room');
  await expect(page.locator('[data-room-model-id="room-1"]')).toHaveAttribute('fill', '#ddeeff');
});

test('selects walls, changes thickness together, copies, and deletes', async ({ page }) => {
  await openCanvas(page);
  const wall = page.locator('[data-wall-id="room-0-0"]');
  const secondWall = page.locator('[data-wall-id="room-0-1"]');
  await wall.click();
  await secondWall.click({ modifiers: ['Shift'] });
  await expect(page.getByText('2 walls')).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Wall thickness' }).fill('150');
  await expect(page.locator('[data-wall-id="room-0-0"] line')).toHaveAttribute('stroke-width', '12.5');
  await page.getByRole('button', { name: 'Copy selected' }).click();
  await expect(page.locator('.copied-wall')).toHaveCount(2);
  await page.getByRole('button', { name: 'Delete selected' }).click();
  await expect(page.locator('[data-wall-id^="room-0-"]')).toHaveCount(2);
});

test('marquee-selects the room walls', async ({ page }) => {
  await openCanvas(page);
  const svg = page.locator('svg[aria-label="Heating layout canvas"]');
  const box = await svg.boundingBox();
  if (!box) throw new Error('canvas is not measurable');
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 10, box.y + box.height - 10);
  await page.mouse.up();
  await expect(page.getByText('4 walls', { exact: true })).toBeVisible();
  await expect(page.locator('.wall.is-selected')).toHaveCount(4);
});
