import { readFile } from 'node:fs/promises';
import { devices, expect, test } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';

const desktopDocument = await readFile(
  new URL('../fixtures/desktop-page.html', import.meta.url),
  'utf8',
);

async function openDesktopPreview(page: Page) {
  await page.goto('/');
  await page.getByRole('textbox').fill(desktopDocument);
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.getByRole('button', { name: '返回编辑' })).toBeVisible();
  return page.frameLocator('iframe');
}

async function swipe(
  page: Page,
  session: CDPSession,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  // Dispatch each contact movement: synthesizeScrollGesture can omit touchmove
  // in headless Chromium on Windows, even for an ordinary host scroll container.
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [from],
  });
  for (let step = 1; step <= 12; step++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * step) / 12,
          y: from.y + ((to.y - from.y) * step) / 12,
        },
      ],
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
}

test('uses a readable desktop layout inside the phone viewport', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const frame = await openDesktopPreview(page);
  await expect(frame.getByRole('heading', { name: '桌面布局' })).toBeVisible();
  expect(await frame.locator('html').evaluate(() => innerWidth)).toBe(1280);
  await expect(frame.locator('pre')).toHaveCSS('font-size', '16px');
  for (const label of ['响应内容', '响应头', '实际请求参数', '请求头']) {
    const button = frame.getByRole('button', { name: label, exact: true });
    expect((await button.boundingBox())?.height).toBeLessThanOrEqual(48);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: testInfo.outputPath('desktop-on-phone-left.png'),
    animations: 'disabled',
  });
});

test('reaches right-side controls and the page bottom while keeping the host toolbar fixed', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const frame = await openDesktopPreview(page);
  const viewport = page.getByRole('region', { name: '网页预览' });
  const back = page.getByRole('button', { name: '返回编辑' });
  const toolbarBefore = await back.boundingBox();

  await viewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBe(890);
  const counter = frame.getByRole('button', { name: '执行 0' });
  const rightBounds = await counter.boundingBox();
  expect(rightBounds?.x).toBeGreaterThanOrEqual(0);
  expect((rightBounds?.x ?? 0) + (rightBounds?.width ?? 0)).toBeLessThanOrEqual(
    390,
  );
  await counter.click();
  await expect(frame.getByRole('button', { name: '执行 1' })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('desktop-on-phone-right.png'),
    animations: 'disabled',
  });

  await frame
    .locator('body')
    .evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const bottom = frame.getByRole('button', { name: '页底操作' });
  const bottomBounds = await bottom.boundingBox();
  expect(
    (bottomBounds?.y ?? 0) + (bottomBounds?.height ?? 0),
  ).toBeLessThanOrEqual(844);
  await bottom.click();
  await expect(frame.getByRole('button', { name: '操作完成' })).toBeVisible();
  expect(
    await frame.locator('body').evaluate(() => window.scrollY),
  ).toBeGreaterThan(1000);
  expect(await viewport.evaluate((element) => element.scrollTop)).toBe(0);
  expect(await back.boundingBox()).toEqual(toolbarBefore);
  expect(
    await page.evaluate(() => ({
      x: scrollX,
      y: scrollY,
      width: document.documentElement.scrollWidth,
    })),
  ).toEqual({ x: 0, y: 0, width: 390 });
  await page.screenshot({
    path: testInfo.outputPath('desktop-on-phone-bottom.png'),
    animations: 'disabled',
  });
});

test('preserves the running document during rotation and resets a new preview', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const frame = await openDesktopPreview(page);
  const viewport = page.getByRole('region', { name: '网页预览' });
  await frame.getByRole('button', { name: '执行 0' }).click();
  await viewport.evaluate((element) => {
    element.scrollLeft = 250;
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(frame.getByRole('button', { name: '执行 1' })).toBeVisible();
  expect(await frame.locator('html').evaluate(() => innerWidth)).toBe(1280);
  expect(await viewport.evaluate((element) => element.scrollLeft)).toBe(250);
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(await frame.locator('html').evaluate(() => innerWidth)).toBe(1440);
  await expect(frame.getByRole('button', { name: '执行 1' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await viewport.evaluate((element) => {
    element.scrollLeft = 600;
  });
  await frame.locator('body').evaluate(() => window.scrollTo(0, 800));
  await page.getByRole('button', { name: '返回编辑' }).click();
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(frame.getByRole('heading', { name: '桌面布局' })).toBeVisible();
  expect(await viewport.evaluate((element) => element.scrollLeft)).toBe(0);
  expect(await frame.locator('body').evaluate(() => window.scrollY)).toBe(0);
  await expect(frame.getByRole('button', { name: '执行 0' })).toBeAttached();
});

test('chains native touch swipes from the iframe to the horizontal viewport', async ({
  browser,
  browserName,
  baseURL,
}) => {
  test.skip(
    browserName !== 'chromium',
    'CDP touch injection is Chromium-only; iPhone touch needs device verification.',
  );
  const context = await browser.newContext({
    ...devices['iPhone 14'],
    baseURL,
  });
  try {
    const page = await context.newPage();
    const frame = await openDesktopPreview(page);
    const viewport = page.getByRole('region', { name: '网页预览' });
    const session = await context.newCDPSession(page);
    await swipe(page, session, { x: 320, y: 300 }, { x: 80, y: 300 });
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(100);
    await swipe(page, session, { x: 200, y: 600 }, { x: 200, y: 250 });
    await expect
      .poll(() => frame.locator('body').evaluate(() => window.scrollY))
      .toBeGreaterThan(100);
    await expect(
      page.getByRole('button', { name: '返回编辑' }),
    ).toBeInViewport();
  } finally {
    await context.close();
  }
});
