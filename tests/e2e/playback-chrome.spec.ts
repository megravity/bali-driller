import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('./');
  await expect(
    page.getByRole('button', { name: 'Play', exact: true })
  ).toBeEnabled();
}

function formatTime(seconds: number) {
  const cs = Math.round(Math.max(0, seconds) * 100);
  const minutes = String(Math.floor(cs / 6000)).padStart(2, '0');
  const rest = String(Math.floor(cs / 100) % 60).padStart(2, '0');
  const hundredths = String(cs % 100).padStart(2, '0');
  return `${minutes}:${rest}.${hundredths}`;
}

const videoTime = (page: Page) =>
  page
    .locator('video')
    .evaluate((video: HTMLVideoElement) => video.currentTime);

const videoDuration = (page: Page) =>
  page.locator('video').evaluate((video: HTMLVideoElement) => video.duration);

const videoPaused = (page: Page) =>
  page.locator('video').evaluate((video: HTMLVideoElement) => video.paused);

const boundary = async (page: Page, which: 'a' | 'b') =>
  Number(
    await page.locator(`#precision-${which}`).getAttribute('aria-valuenow')
  );

async function openOverview(page: Page) {
  if (!(await page.locator('#timeline').isVisible())) {
    await page.getByText('Browse whole video', { exact: true }).click();
  }
}

async function setRange(page: Page, a: number, b: number) {
  // Reset first: setPoint('a') is rejected while the current end sits before the
  // new start, which would silently keep the previous range.
  await page.locator('#clear-section').click();
  await openOverview(page);
  await page.locator('#timeline').fill(String(a));
  await page.locator('#set-a').click();
  await page.locator('#timeline').fill(String(b));
  await page.locator('#set-b').click();
}

async function saveSection(page: Page, name: string) {
  await page.getByRole('button', { name: 'Save Section…' }).click();
  await page.getByRole('textbox', { name: 'Section name' }).fill(name);
  await page
    .getByRole('dialog', { name: 'Save Section', exact: true })
    .getByRole('button', { name: 'Save', exact: true })
    .click();
}

const editorLabel = (page: Page) => page.locator('#edit-loop span').nth(1);

test('dock shows loop status, playhead time and editor state', async ({
  page
}) => {
  await ready(page);
  await expect(page.locator('#loop-status')).toHaveText(
    'Whole video · loop off'
  );

  await openOverview(page);
  await page.locator('#timeline').fill('2');
  await expect(page.locator('#current-time')).toHaveText(formatTime(2));

  await setRange(page, 2, 4);
  await expect(page.locator('#loop-status')).toHaveText(
    `${formatTime(2)} → ${formatTime(4)}`
  );
  await expect(page.locator('#toggle-loop')).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  const toggle = page.locator('#edit-loop');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(editorLabel(page)).toHaveText('Close editor');
  await expect(page.locator('#loop-editor')).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(editorLabel(page)).toHaveText('Edit loop');
  await expect(page.locator('#loop-editor')).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#loop-editor')).toBeVisible();
});

test('restart returns the playhead to the loop start and resumes playback', async ({
  page
}) => {
  await ready(page);
  await page.getByLabel('Playback speed', { exact: true }).selectOption('0.1');
  await setRange(page, 1, 6);
  // Loop off, so a wrong seek is not silently corrected by the loop guard.
  await page.locator('#toggle-loop').click();
  await expect(page.locator('#toggle-loop')).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  await page.locator('#timeline').fill('5');
  await expect.poll(() => videoTime(page)).toBeGreaterThan(4);

  await page
    .getByRole('button', { name: 'Restart section', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true })
  ).toBeVisible();

  // Pause before reading so the assertion isolates the seek from playback drift.
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect.poll(() => videoPaused(page)).toBe(true);

  const restartTime = await videoTime(page);
  expect(restartTime).toBeGreaterThanOrEqual(0.98);
  expect(restartTime).toBeLessThan(1.3);
});

test('saved sections show numbering, selection state and delete to empty', async ({
  page
}) => {
  await ready(page);
  await setRange(page, 1, 3);
  await saveSection(page, 'Opening');
  await expect.poll(() => boundary(page, 'a')).toBeCloseTo(1, 2);
  await expect.poll(() => boundary(page, 'b')).toBeCloseTo(3, 2);

  await setRange(page, 4, 5.5);
  await expect.poll(() => boundary(page, 'a')).toBeCloseTo(4, 2);
  await expect.poll(() => boundary(page, 'b')).toBeCloseTo(5.5, 2);
  await saveSection(page, 'Turn');

  await expect(page.locator('.saved-section')).toHaveCount(2);
  await expect(page.locator('.section-select strong').first()).toHaveText(
    '01 Opening'
  );
  await expect(page.locator('.section-select strong').nth(1)).toHaveText(
    '02 Turn'
  );

  await page.locator('.section-select').first().click();
  await expect(page.locator('.saved-section.selected')).toHaveCount(1);
  await expect(page.locator('.saved-section.selected')).toContainText(
    'Opening'
  );
  await expect(page.locator('#loop-status')).toHaveText(
    `${formatTime(1)} → ${formatTime(3)}`
  );
  await expect.poll(() => boundary(page, 'a')).toBeCloseTo(1, 2);
  await expect.poll(() => boundary(page, 'b')).toBeCloseTo(3, 2);

  await page
    .getByRole('button', { name: 'Delete section Opening', exact: true })
    .click();
  await expect(page.locator('.saved-section')).toHaveCount(1);
  await expect(page.locator('.saved-section.selected')).toHaveCount(0);

  await page
    .getByRole('button', { name: 'Delete section Turn', exact: true })
    .click();
  await expect(page.locator('.saved-section')).toHaveCount(0);
  await expect(page.locator('.no-sections')).toHaveText('No saved sections.');
  await expect(page.locator('#saved-sections summary span').nth(1)).toHaveText(
    '0'
  );
});

test('whole clip resets the precision zoom and ruler', async ({ page }) => {
  await ready(page);
  const duration = await videoDuration(page);
  await setRange(page, 1, 3);

  await page.locator('#timeline-zoom').click();
  await expect(page.locator('#timeline-zoom')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.locator('.ruler-ticks span').first()).not.toHaveText(
    '0.00 s'
  );

  await page.locator('#timeline-whole').click();
  await expect(page.locator('#timeline-zoom')).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  await expect(page.locator('.ruler-ticks span').first()).toHaveText('0.00 s');
  await expect(page.locator('.ruler-ticks span').last()).toHaveText(
    `${duration.toFixed(2)} s`
  );
});

test('frame stepping moves the playhead one frame in both directions', async ({
  page
}) => {
  await ready(page);
  await openOverview(page);
  await page.locator('#timeline').fill('2');

  const back = page.locator('.frame-steps button').first();
  const forward = page.locator('.frame-steps button').nth(1);

  await forward.click();
  await expect.poll(() => videoTime(page)).toBeCloseTo(2 + 1 / 30, 2);

  await back.click();
  await expect.poll(() => videoTime(page)).toBeCloseTo(2, 2);
});
