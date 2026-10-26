// Đăng bài qua giao diện (F-05) và xem lưới hồ sơ, chi tiết bài (F-06), trên phone và tablet.
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { expect, test, type Browser, type Page } from '@playwright/test';

import { ApiSession, PASSWORD } from '../support/api';
import { ORIGIN } from '../support/env';

const PHOTO = fileURLToPath(new URL('../fixtures/photo.jpg', import.meta.url));

async function account(withPet: boolean) {
  const s = await ApiSession.register();
  const username = `e2e_${randomUUID().slice(0, 8)}`;
  await s.call('PUT', '/me/profile', { username, displayName: `Chủ ${username}` });
  if (withPet) await s.createPet('Mochi');
  await s.dispose();
  return { email: s.email, username };
}

async function login(page: Page, email: string) {
  await page.goto(`${ORIGIN}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/`);
}

/** Soạn và đăng một bài; phone có bước "Tiếp". */
async function compose(page: Page, files: string[], caption: string, pet?: string) {
  await page.goto(`${ORIGIN}/feed/new`);
  await page.locator('input[type="file"]').setInputFiles(files);
  await expect(page.getByRole('button', { name: /^Bỏ ảnh/ })).toHaveCount(files.length);
  const next = page.getByRole('button', { name: 'Tiếp' });
  if (await next.isVisible()) await next.click();
  await page.getByLabel('Chú thích').fill(caption);
  if (pet) await page.getByRole('button', { name: pet, exact: true }).click();
  await page.getByRole('button', { name: 'Đăng', exact: true }).filter({ visible: true }).click();
  await expect(page.getByText('Đã đăng')).toBeVisible({ timeout: 30_000 });
}

async function newPage(browser: Browser, email: string): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: test.info().project.use.viewport ?? null,
  });
  const page = await ctx.newPage();
  await login(page, email);
  return page;
}

test('đăng 2 bài (có / không gắn bé) → lưới hồ sơ; người khác mở bài, vuốt ảnh, thấy chú thích đã sửa', async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const a = await account(true);
  const b = await account(false);
  await login(page, a.email);

  await compose(page, [PHOTO, PHOTO], 'Mochi đi dạo', 'Mochi');
  await expect(page).toHaveURL(`${ORIGIN}/u/${a.username}`);
  await compose(page, [PHOTO], 'Chỉ một ảnh');
  await expect(page.getByRole('link', { name: /^Mở bài/ })).toHaveCount(2);

  // Bài mới nhất (1 ảnh, không gắn bé) đứng đầu lưới.
  await page.getByRole('link', { name: 'Mở bài 1' }).click();
  await expect(page.getByText('Chỉ một ảnh')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Thú cưng trong bài' })).toHaveCount(0);

  // B mở hồ sơ A → bài 2 ảnh: có chip Mochi, chuyển ảnh bằng phím →.
  const pageB = await newPage(browser, b.email);
  await pageB.goto(`${ORIGIN}/u/${a.username}`);
  await pageB.getByRole('link', { name: 'Mở bài 2' }).click();
  await expect(pageB.getByText('Mochi đi dạo')).toBeVisible();
  await expect(pageB.getByRole('list', { name: 'Thú cưng trong bài' })).toHaveText('Mochi');
  await expect(pageB.getByRole('button', { name: 'Tùy chọn bài' })).toHaveCount(0);
  const carousel = pageB.getByRole('region', { name: 'Ảnh 1/2' });
  await carousel.locator('[tabindex="0"]').press('ArrowRight');
  await expect(pageB.getByRole('region', { name: 'Ảnh 2/2' })).toBeVisible();
  const postUrl = pageB.url();

  // A sửa chú thích → B tải lại thấy chú thích mới.
  await page.goto(postUrl);
  await page.getByRole('button', { name: 'Tùy chọn bài' }).click();
  await page.getByRole('menuitem', { name: 'Sửa bài' }).click();
  await page.getByRole('dialog').getByLabel('Chú thích').fill('Mochi đi dạo công viên');
  await page.getByRole('dialog').getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('Đã lưu')).toBeVisible();
  await expect(page.getByText('Mochi đi dạo công viên')).toBeVisible();
  await expect(async () => {
    await pageB.reload();
    await expect(pageB.getByText('Mochi đi dạo công viên')).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 10_000 });

  // A xóa bài → về hồ sơ, còn 1 bài; B mở lại bài → "Bài này không còn".
  await page.getByRole('button', { name: 'Tùy chọn bài' }).click();
  await page.getByRole('menuitem', { name: 'Xóa bài' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa bài' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/u/${a.username}`);
  await expect(page.getByRole('link', { name: /^Mở bài/ })).toHaveCount(1);
  await pageB.reload();
  await expect(pageB.getByText('Bài này không còn')).toBeVisible();
  await pageB.context().close();
});
