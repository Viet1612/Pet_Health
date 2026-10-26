// Tìm người → theo dõi (F-07) → thấy bài của họ trên bản tin (F-08), qua giao diện.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { ApiSession, PASSWORD } from '../support/api';
import { ORIGIN } from '../support/env';

const PHOTO = {
  name: 'photo.jpg',
  mimeType: 'image/jpeg',
  buffer: readFileSync(new URL('../fixtures/photo.jpg', import.meta.url)),
};

test('A tìm B, theo dõi, B đăng bài, A làm mới bản tin thấy bài', async ({ page }) => {
  test.setTimeout(90_000);
  const tag = randomUUID().slice(0, 6);
  const a = await ApiSession.register();
  await a.call('PUT', '/me/profile', { username: `e2e_a_${tag}`, displayName: 'Người A' });
  await a.dispose();
  const b = await ApiSession.register();
  const bUser = `e2e_b_${tag}`;
  await b.call('PUT', '/me/profile', { username: bUser, displayName: `Mèo Bơ ${tag}` });

  await page.goto(`${ORIGIN}/login`);
  await page.getByLabel('Email').fill(a.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/`);

  // Bản tin rỗng → "Tìm người".
  await page.goto(`${ORIGIN}/feed`);
  await page.getByRole('link', { name: 'Tìm người' }).filter({ visible: true }).first().click();
  await page.getByLabel('Tìm theo username hoặc tên').fill(`meo bo ${tag}`);
  await page.getByRole('link', { name: new RegExp(`@${bUser}`) }).click();
  await expect(page).toHaveURL(`${ORIGIN}/u/${bUser}`);
  await page.getByRole('button', { name: 'Theo dõi', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang theo dõi' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Đang theo dõi' })).toBeVisible();

  // B đăng bài → A mở bản tin thấy bài.
  const created = await b.call(
    'POST',
    '/posts',
    { caption: `Bơ ăn sáng ${tag}`, photoCount: 1 },
    { idempotent: true },
  );
  const id = created.body.id as string;
  await b.upload('POST', `/posts/${id}/photos?position=0`, PHOTO);
  await expect
    .poll(async () => (await b.call('GET', `/posts/${id}`)).body.post.status, { timeout: 20_000 })
    .toBe('PUBLISHED');
  await b.dispose();

  await page.goto(`${ORIGIN}/feed`);
  await expect(page.getByText(`Bơ ăn sáng ${tag}`)).toBeVisible();
  await expect(page.getByRole('article', { name: `Bài của Mèo Bơ ${tag}` })).toBeVisible();
});
