import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const interactiveDocument = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>测试页面</title>
<style>body{margin:0;padding:24px;background:#eff6ff;font:16px system-ui;color:#182230}button{font:inherit;padding:12px 20px}</style>
</head><body><h1>你好，HTML</h1><button id="count">点击 0</button>
<script>let count=0;document.querySelector('#count').onclick=function(){this.textContent='点击 '+ ++count;};</script></body></html>`;

async function openPreview(page: Page, source = interactiveDocument) {
  await page.getByRole('textbox', { name: 'HTML 代码' }).fill(source);
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.getByRole('button', { name: '返回编辑' })).toBeVisible();
  return page.frameLocator('iframe');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('starts empty and accepts pasted code without showing explanatory copy', async ({
  page,
}) => {
  const input = page.getByRole('textbox', { name: 'HTML 代码' });
  const preview = page.getByRole('button', { name: '预览', exact: true });

  await expect(page.getByRole('heading', { name: 'HTML 预览' })).toBeVisible();
  await expect(input).toHaveValue('');
  await expect(preview).toBeDisabled();
  await input.fill(' \n\t ');
  await expect(preview).toBeDisabled();
  await input.fill('');
  await input.focus();
  await page.keyboard.insertText('<h1>粘贴成功</h1>');
  await expect(preview).toBeEnabled();
  await expect(input).toHaveAttribute('spellcheck', 'false');
  await expect(input).toHaveAttribute('autocapitalize', 'off');
  await preview.click();
  await expect(page.frameLocator('iframe').getByRole('heading')).toHaveText(
    '粘贴成功',
  );
});

test('runs scripts and CSS, retains the source, and reruns a new snapshot', async ({
  page,
}) => {
  const frame = await openPreview(page);
  await expect(frame.getByRole('heading')).toHaveText('你好，HTML');
  await expect(frame.locator('body')).toHaveCSS(
    'background-color',
    'rgb(239, 246, 255)',
  );
  await frame.getByRole('button').click();
  await expect(frame.getByRole('button')).toHaveText('点击 1');
  await page.getByRole('button', { name: '返回编辑' }).click();
  await expect(page.getByRole('textbox')).toHaveValue(interactiveDocument);
  await expect(page.getByRole('textbox')).not.toBeFocused();
  const freshFrame = await openPreview(
    page,
    interactiveDocument.replace('你好，HTML', '已更新'),
  );
  await expect(freshFrame.getByRole('heading')).toHaveText('已更新');
  await expect(freshFrame.getByRole('button')).toHaveText('点击 0');
});

test('supports browser back and forward without storing source in history', async ({
  page,
}) => {
  await openPreview(page);
  const history = await page.evaluate(() =>
    JSON.stringify(window.history.state),
  );
  expect(history).not.toContain('你好');
  await page.goBack();
  await expect(page.getByRole('textbox')).toHaveValue(interactiveDocument);
  await page.goForward();
  await expect(page.frameLocator('iframe').getByRole('heading')).toHaveText(
    '你好，HTML',
  );
  await page.getByRole('button', { name: '返回编辑' }).click();
  await expect(page.getByRole('textbox')).toBeVisible();
  await openPreview(page, '<h1>再次预览</h1>');
  await page.getByRole('button', { name: '返回编辑' }).click();
  await expect(page.getByRole('textbox')).toBeVisible();
});

test('refresh resets the editor without persisting source', async ({
  page,
}) => {
  await openPreview(page);
  await page.reload();
  await expect(page.getByRole('textbox')).toHaveValue('');
  await expect(page.locator('iframe')).toHaveCount(0);
  const storage = await page.evaluate(() => ({
    local: localStorage.length,
    session: sessionStorage.length,
  }));
  expect(storage).toEqual({ local: 0, session: 0 });
});

test('preserves selection and scrolling for large input with long lines', async ({
  page,
}) => {
  const source =
    '<!--\n' +
    'x'.repeat(500) +
    '\n' +
    ('<div>content text '.repeat(5) + '</div>\n').repeat(1000) +
    '--><h1>大段代码</h1>';
  const input = page.getByRole('textbox');
  await input.fill(source);
  const before = await input.evaluate((element: HTMLTextAreaElement) => {
    element.setSelectionRange(80, 120);
    element.scrollTop = 350;
    element.scrollLeft = 120;
    return {
      start: element.selectionStart,
      end: element.selectionEnd,
      top: element.scrollTop,
      left: element.scrollLeft,
    };
  });
  await page.getByRole('button', { name: '预览', exact: true }).click();
  await expect(page.frameLocator('iframe').getByRole('heading')).toHaveText(
    '大段代码',
  );
  await page.getByRole('button', { name: '返回编辑' }).click();
  await expect(input).toBeVisible();
  await expect
    .poll(() =>
      input.evaluate((element: HTMLTextAreaElement) => ({
        start: element.selectionStart,
        end: element.selectionEnd,
        top: element.scrollTop,
        left: element.scrollLeft,
      })),
    )
    .toEqual(before);
  await expect(input).toHaveValue(source);
});

test('returns to editing after navigation inside the preview', async ({
  page,
}) => {
  const frame = await openPreview(
    page,
    '<a href="#section">跳转</a><h1 id="section">页面内容</h1>',
  );
  await frame.getByRole('link', { name: '跳转' }).click();
  await page.getByRole('button', { name: '返回编辑' }).click();
  await expect(page.getByRole('textbox')).toBeVisible();
  await openPreview(page, '<h1>再次预览</h1>');
  await page.getByRole('button', { name: '返回编辑' }).click();
  await expect(page.getByRole('textbox')).toBeVisible();
});

test('loads external HTTPS classic scripts, modules and styles', async ({
  page,
}) => {
  await page.route('https://cdn.example.test/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const assets: Record<string, { contentType: string; body: string }> = {
      '/style.css': {
        contentType: 'text/css',
        body: 'h1 { color: rgb(37, 99, 235); }',
      },
      '/classic.js': {
        contentType: 'application/javascript',
        body: "document.querySelector('h1').textContent = '外部脚本';",
      },
      '/module.js': {
        contentType: 'application/javascript',
        body: "document.querySelector('p').textContent = '模块加载成功';",
      },
    };
    const asset = assets[path];
    if (!asset) return route.abort();
    return route.fulfill({
      ...asset,
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  const frame = await openPreview(
    page,
    '<link rel="stylesheet" href="https://cdn.example.test/style.css"><h1>等待</h1><p></p><script src="https://cdn.example.test/classic.js"></script><script type="module" src="https://cdn.example.test/module.js"></script>',
  );
  await expect(frame.getByRole('heading')).toHaveText('外部脚本');
  await expect(frame.getByRole('heading')).toHaveCSS(
    'color',
    'rgb(37, 99, 235)',
  );
  await expect(frame.locator('p')).toHaveText('模块加载成功');
});

test('isolates scripts from host DOM, storage, popups and top navigation', async ({
  page,
  context,
}) => {
  const source = `<h1>隔离测试</h1><pre id="result"></pre><script>
    const result = {};
    try { parent.document.body.innerHTML = 'HOST OVERWRITTEN'; result.dom = false; } catch { result.dom = true; }
    try { localStorage.setItem('test', 'test'); result.storage = false; } catch { result.storage = true; }
    try { top.location.href = 'https://escape.example.test'; result.navigation = false; } catch { result.navigation = true; }
    result.popup = window.open('about:blank') === null;
    document.querySelector('#result').textContent = JSON.stringify(result);
  </script>`;
  const frame = await openPreview(page, source);
  await expect(frame.locator('#result')).toHaveText(
    '{"dom":true,"storage":true,"navigation":true,"popup":true}',
  );
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect(page.locator('iframe')).toHaveAttribute(
    'sandbox',
    'allow-scripts',
  );
  expect(context.pages()).toHaveLength(1);
  await page.getByRole('button', { name: '返回编辑' }).click();
  await expect(page.getByRole('heading', { name: 'HTML 预览' })).toBeVisible();
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 375, height: 667 },
  { width: 844, height: 390 },
  { width: 1440, height: 1000 },
]) {
  test(`fits ${viewport.width}×${viewport.height} and leaves preview content unscaled`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const input = page.getByRole('textbox');
    await expect(input).toHaveCSS('font-size', '16px');
    const bounds = await page
      .getByRole('button', { name: '预览', exact: true })
      .boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('editor-empty.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await input.fill(interactiveDocument);
    await page.screenshot({
      path: testInfo.outputPath('editor-filled.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: '预览', exact: true }).click();
    const frame = page.frameLocator('iframe');
    await expect(frame.getByRole('heading')).toHaveText('你好，HTML');
    await expect(frame.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      'width=device-width, initial-scale=1',
    );
    const iframeBounds = await page.locator('iframe').boundingBox();
    expect(iframeBounds?.width).toBe(Math.max(1280, viewport.width));
    expect(iframeBounds?.height).toBeGreaterThan(250);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('preview.png'),
      fullPage: true,
      animations: 'disabled',
    });
  });
}

test('supports keyboard focus and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const input = page.getByRole('textbox');
  await input.focus();
  await page.keyboard.insertText('<h1>键盘预览</h1>');
  await page.keyboard.press('Tab');
  const button = page.getByRole('button', { name: '预览', exact: true });
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS('transition-duration', '0s');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '返回编辑' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(input).toBeVisible();
});
