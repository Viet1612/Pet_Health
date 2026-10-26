// Chặn qua giao diện (F-12): C chặn A từ hồ sơ → tìm A không ra; bỏ chặn trong Cài đặt → tìm lại được.
import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { ApiSession, PASSWORD } from '../support/api';
import { ORIGIN } from '../support/env';

test('C chặn A, tìm không ra; bỏ chặn ở Cài đặt → tìm lại được', async ({ page }) => {
  const tag = randomUUID().slice(0, 6);
  const a = await ApiSession.register();
  const aUser = `e2e_a_${tag}`;
  await a.call('PUT', '/me/profile', { username: aUser, displayName: `Chủ A ${tag}` });
  await a.dispose();
  const c = await ApiSession.register();
  await c.call('PUT', '/me/profile', { username: `e2e_c_${tag}`, displayName: 'C' });
  await c.dispose();

  await page.goto(`${ORIGIN}/login`);
  await page.getByLabel('Email').fill(c.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/`);

  await page.goto(`${ORIGIN}/u/${aUser}`);
  await page.getByRole('button', { name: 'Tùy chọn' }).click();
  await page.getByRole('menuitem', { name: `Chặn @${aUser}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Chặn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bỏ chặn' })).toBeVisible();

  await page.goto(`${ORIGIN}/search`);
  await page.getByLabel('Tìm theo username hoặc tên').fill(aUser);
  await expect(page.getByText(`Không tìm thấy ai cho "${aUser}"`)).toBeVisible();

  await page.goto(`${ORIGIN}/settings`);
  await page
    .getByRole('button', { name: /^Đã chặn/ })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bỏ chặn' }).click();
  await expect(page.getByText(`Đã bỏ chặn @${aUser}`)).toBeVisible();

  await page.goto(`${ORIGIN}/search`);
  await page.getByLabel('Tìm theo username hoặc tên').fill(aUser);
  await expect(page.getByRole('link', { name: new RegExp(`@${aUser}`) })).toBeVisible();
});
