// Thích + bình luận qua giao diện (F-10), thông báo tab "Hoạt động" (F-11).
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

import { ApiSession, PASSWORD } from '../support/api';
import { ORIGIN } from '../support/env';

const PHOTO = {
  name: 'photo.jpg',
  mimeType: 'image/jpeg',
  buffer: readFileSync(new URL('../fixtures/photo.jpg', import.meta.url)),
};

async function login(page: Page, email: string) {
  await page.goto(`${ORIGIN}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/`);
}

test('A thích + bình luận bài B; B thấy số tim, bình luận, thông báo; B xóa bình luận của A', async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const tag = randomUUID().slice(0, 6);
  const b = await ApiSession.register();
  const bUser = `e2e_b_${tag}`;
  await b.call('PUT', '/me/profile', { username: bUser, displayName: 'Chủ bài B' });
  const created = await b.call(
    'POST',
    '/posts',
    { caption: `Bài ${tag}`, photoCount: 1 },
    { idempotent: true },
  );
  const postId = created.body.id as string;
  await b.upload('POST', `/posts/${postId}/photos?position=0`, PHOTO);
  await expect
    .poll(async () => (await b.call('GET', `/posts/${postId}`)).body.post.status, {
      timeout: 20_000,
    })
    .toBe('PUBLISHED');
  await b.dispose();

  const a = await ApiSession.register();
  const aUser = `e2e_a_${tag}`;
  await a.call('PUT', '/me/profile', { username: aUser, displayName: 'Người A' });
  await a.dispose();

  // A mở bài: nhấn đúp ảnh → thích; nhấn đúp lần nữa không bỏ thích.
  await login(page, a.email);
  await page.goto(`${ORIGIN}/p/${postId}`);
  const carousel = page.getByRole('region', { name: 'Ảnh 1/1' }).locator('[tabindex="0"]');
  await carousel.dblclick();
  const heart = page.getByRole('button', { name: /^Bỏ thích, 1 lượt thích/ });
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await carousel.dblclick();
  await expect(heart).toBeVisible();

  // Bình luận: Enter gửi.
  const input = page.getByLabel('Viết bình luận');
  await input.fill(`Bé xinh quá ${tag}`);
  await input.press('Enter');
  await expect(page.getByText(`Bé xinh quá ${tag}`)).toBeVisible();
  await expect(input).toHaveValue('');

  // B: chuông có hoạt động → tab Hoạt động có thông báo; mở bài thấy tim + bình luận, xóa bình luận.
  const ctx = await browser.newContext({ viewport: test.info().project.use.viewport ?? null });
  const pageB = await ctx.newPage();
  await login(pageB, b.email);
  await pageB.goto(`${ORIGIN}/notifications?tab=activity`);
  await expect(pageB.getByText(`${aUser} đã thích bài của bạn`)).toBeVisible();
  await expect(pageB.getByText(`${aUser} đã bình luận:`)).toBeVisible();

  await pageB.goto(`${ORIGIN}/p/${postId}`);
  await expect(pageB.getByRole('button', { name: /^Thích, 1 lượt thích/ })).toBeVisible();
  await pageB.getByRole('button', { name: `Tùy chọn bình luận của ${aUser}` }).click();
  await pageB.getByRole('menuitem', { name: 'Xóa bình luận' }).click();
  await pageB.getByRole('dialog').getByRole('button', { name: 'Xóa bình luận' }).click();
  await expect(pageB.getByText(`Bé xinh quá ${tag}`)).toHaveCount(0);
  await ctx.close();
});
