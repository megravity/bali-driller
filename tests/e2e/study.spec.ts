declare global {
  interface Window {
    restoreStorage: () => void;
  }
}

import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('./');
  await expect(
    page.getByRole('button', { name: 'Play', exact: true })
  ).toBeEnabled();
}

test('playback, saved sections and properties persist after reloading', async ({
  page
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await ready(page);
  await page.getByLabel('Playback speed', { exact: true }).selectOption('0.5');
  await page.getByLabel('Video view settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Mirror video', exact: true }).click();
  await page.getByLabel('Video view settings', { exact: true }).click();
  await page.getByText('Browse whole video', { exact: true }).click();
  await page.locator('#timeline').fill('1');
  await page.locator('#set-a').click();
  await page.locator('#timeline').fill('3');
  await page.locator('#set-b').click();
  await page.getByRole('button', { name: 'Save Section…' }).click();
  await page
    .getByRole('textbox', { name: 'Section name' })
    .fill('Practice opening');
  await page
    .getByRole('dialog', { name: 'Save Section', exact: true })
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(page.locator('.section-select')).toContainText(
    'Practice opening'
  );
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('button', { name: 'Edit video details' }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Renamed study');
  await page
    .getByRole('textbox', { name: 'Creator', exact: true })
    .fill('A friend');
  await page
    .getByRole('textbox', { name: 'Tags', exact: true })
    .fill('practice, slow');
  await page
    .getByRole('dialog', { name: 'Video Properties' })
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved in this browser' })
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Play', exact: true })
  ).toBeEnabled();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Renamed study'
  );
  await expect(page.getByLabel('Playback speed', { exact: true })).toHaveValue(
    '0.5'
  );
  await page.getByLabel('Video view settings', { exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Mirror video', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Video view settings', { exact: true }).click();
  await page.locator('.section-select').click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true })
  ).toBeVisible();
  await expect(page.locator('#toggle-loop')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await page.waitForTimeout(4500);
  expect(
    await page
      .locator('video')
      .evaluate((video: HTMLVideoElement) => video.currentTime)
  ).toBeLessThanOrEqual(3.1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const before = await page
    .locator('video')
    .evaluate((video: HTMLVideoElement) => video.currentTime);
  await page.getByText('Browse whole video', { exact: true }).click();
  await page.getByRole('button', { name: 'Frame +', exact: true }).click();
  const after = await page
    .locator('video')
    .evaluate((video: HTMLVideoElement) => video.currentTime);
  expect(after - before).toBeCloseTo(1 / 30, 2);
  expect(errors).toEqual([]);
});

test('imports an actual video file, restores its blob and removes its library copy', async ({
  page
}) => {
  await ready(page);
  await page.locator('input[type=file]').setInputFiles('static/media/demo.mp4');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('demo');
  await expect(
    page.getByRole('button', { name: 'Play', exact: true })
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Play', exact: true })
  ).toBeEnabled();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('demo');
  expect(await page.locator('video').getAttribute('src')).toMatch(/^blob:/);
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('button', { name: 'Edit video details' }).click();
  await page.getByRole('button', { name: 'Remove video', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Remove Video' })
    .getByRole('button', { name: 'Remove', exact: true })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'First motion study'
  );
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Open demo', exact: true })
  ).toHaveCount(0);
});

test('mobile layout fits the viewport and library remains accessible', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Open First motion study' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Open First motion study' }).click();
  await expect(page.locator('#library-panel')).toBeHidden();
});

test('storage unavailable is visible and does not imply saved data', async ({
  page
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new Error('Storage blocked');
      }
    })
  );
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText(
    'The local library could not open'
  );
  await expect(
    page.getByRole('button', { name: 'Play', exact: true })
  ).toBeDisabled();
});

test('a failed metadata save remains visible and can be retried', async ({
  page
}) => {
  await ready(page);
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved in this browser' })
  ).toBeVisible();
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args) {
      const transaction = original.apply(this, args);
      if (args[1] === 'readwrite') queueMicrotask(() => transaction.abort());
      return transaction;
    };
    window.restoreStorage = () =>
      (IDBDatabase.prototype.transaction = original);
  });
  await page.getByLabel('Playback speed', { exact: true }).selectOption('0.5');
  await expect(page.getByRole('alert')).toContainText('Could not save changes');
  await page.evaluate(() => window.restoreStorage());
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved in this browser' })
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Playback speed', { exact: true })).toHaveValue(
    '0.5'
  );
});

async function dragBoundary(page: Page, boundary: 'a' | 'b', time: number) {
  const handle = page.locator('#precision-' + boundary);
  const box = (await handle.boundingBox())!;
  const track = (await page.locator('.precision-track').boundingBox())!;
  const duration = await page
    .locator('video')
    .evaluate((v: HTMLVideoElement) => v.duration);
  const current = Number(await handle.getAttribute('aria-valuenow'));
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + ((time - current) / duration) * track.width,
    box.y + box.height / 2,
    { steps: 10 }
  );
  await page.mouse.up();
}

test('precision edits preview boundaries, clamp ranges and enter large practice mode without saving', async ({
  page
}) => {
  await ready(page);
  await dragBoundary(page, 'a', 1.25);
  await expect(page.locator('#toggle-loop')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect
    .poll(() =>
      page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)
    )
    .toBeCloseTo(1.25, 1);
  const startBefore = await page
    .locator('#precision-a')
    .getAttribute('aria-valuenow');
  await dragBoundary(page, 'b', 3);
  await expect(page.locator('#precision-a')).toHaveAttribute(
    'aria-valuenow',
    startBefore!
  );
  await page.locator('#timeline-zoom').click();
  await page.locator('#precision-b').press('ArrowLeft');
  expect(
    Number(await page.locator('#precision-b').getAttribute('aria-valuenow'))
  ).toBeCloseTo(2.95, 1);
  await expect(page.locator('#boundary-input')).toHaveCount(0);
  await expect(page.locator('.endpoints')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Practise loop', exact: true })
    .click();
  await expect(page.locator('#loop-editor')).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true })
  ).toBeVisible();
  await expect(page.locator('.section-select')).toHaveCount(0);
});

test('mobile starts with a large practice view and accessible editor', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(page.locator('#loop-editor')).toBeHidden();
  const stage = await page.locator('.stage').boundingBox();
  expect(stage!.height).toBeGreaterThan(550);
  await page.getByRole('button', { name: 'Edit loop', exact: true }).click();
  await expect(
    page.getByRole('slider', { name: 'Loop start A' })
  ).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Loop end B' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(390);
});

test('saved-video retry restores position and loop after a load error', async ({
  page
}) => {
  await ready(page);
  await page.locator('input[type=file]').setInputFiles('static/media/demo.mp4');
  await expect(
    page.getByRole('button', { name: 'Play', exact: true })
  ).toBeEnabled();
  await dragBoundary(page, 'a', 1);
  const startBefore = await page
    .locator('#precision-a')
    .getAttribute('aria-valuenow');
  await dragBoundary(page, 'b', 3);
  await expect(page.locator('#precision-a')).toHaveAttribute(
    'aria-valuenow',
    startBefore!
  );
  const oldSource = await page.locator('video').getAttribute('src');
  await page
    .locator('video')
    .evaluate((v) => v.dispatchEvent(new Event('error')));
  await page.getByRole('button', { name: 'Retry saved video' }).click();
  await expect(
    page.getByRole('button', { name: 'Play', exact: true })
  ).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Retry saved video' })
  ).toHaveCount(0);
  expect(await page.locator('video').getAttribute('src')).not.toBe(oldSource);
  expect(
    Number(await page.locator('#precision-b').getAttribute('aria-valuenow'))
  ).toBeCloseTo(3, 1);
  await expect(page.locator('#toggle-loop')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect
    .poll(() =>
      page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)
    )
    .toBeCloseTo(3, 1);
});
