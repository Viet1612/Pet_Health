// SCR-18 Cài đặt (S6-02): mở từ menu ☰ (phone) hoặc SideRail, đổi múi giờ, sai mật khẩu báo dưới
// trường (không bị đăng xuất), đổi email qua liên kết Mailpit, xóa tài khoản.
import { expect, test, type Page } from '@playwright/test';

import {
  ApiSession,
  newEmail,
  PASSWORD,
  resetClock,
  setClock,
  verificationLink,
  vn,
} from '../support/api';
import { ORIGIN } from '../support/env';

test.afterEach(async () => {
  await resetClock();
});

async function login(page: Page, email: string) {
  await page.goto(`${ORIGIN}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/`);
}

async function openSettings(page: Page) {
  const menu = page.getByRole('button', { name: 'Menu tài khoản' });
  if (await menu.isVisible()) {
    await menu.click();
    await page.getByRole('menuitem', { name: 'Cài đặt' }).click();
  } else {
    await page.getByRole('link', { name: 'Cài đặt' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Cài đặt', level: 1 })).toBeVisible();
}

/** Phone hiện mọi nhóm; ≥ 768 px phải chọn nhóm ở menu bên trái. */
async function section(page: Page, name: string) {
  const nav = page.getByRole('navigation', { name: 'Cài đặt' });
  if (await nav.isVisible()) await nav.getByRole('link', { name }).click();
}

const visible = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`^${name}`) }).filter({ visible: true });

test('Cài đặt: múi giờ, sai mật khẩu, đổi email, xóa tài khoản', async ({ page }) => {
  await setClock(vn('2026-11-14'));
  const s = await ApiSession.register();
  await s.createPet('Mochi');
  await s.dispose();
  await login(page, s.email);
  await openSettings(page);

  // Múi giờ → UTC.
  await section(page, 'Thời gian');
  await visible(page, 'Múi giờ').click();
  await page.getByRole('dialog').getByLabel('Tìm thành phố hoặc múi giờ').fill('utc');
  await page.getByRole('option', { name: /^UTC/ }).click();
  await expect(page.getByText('Đã lưu')).toBeVisible();
  await expect(visible(page, 'Múi giờ')).toContainText('UTC');

  // Đổi mật khẩu sai → lỗi dưới trường, vẫn ở Cài đặt.
  await section(page, 'Bảo mật');
  await visible(page, 'Đổi mật khẩu').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Mật khẩu hiện tại').fill('sai-mat-khau-1');
  await dialog.getByLabel('Mật khẩu mới').fill('mat-khau-moi-123');
  await dialog.getByRole('button', { name: 'Đổi mật khẩu' }).click();
  await expect(dialog.getByText('Mật khẩu không đúng')).toBeVisible();
  await expect(page).toHaveURL(/\/settings/);
  await dialog.getByRole('button', { name: 'Đóng' }).click();

  // Đổi email → "Đang chờ xác minh" → mở liên kết → "Đã cập nhật email tài khoản".
  const target = newEmail();
  await section(page, 'Tài khoản');
  await visible(page, 'Đổi email').click();
  await dialog.getByLabel('Email mới').fill(target);
  await dialog.getByLabel('Mật khẩu hiện tại').fill(PASSWORD);
  await dialog.getByRole('button', { name: 'Gửi liên kết xác minh' }).click();
  await expect(
    page.getByText(`Đang chờ xác minh: ${target}`).filter({ visible: true }),
  ).toBeVisible();
  await page.goto(await verificationLink(target));
  await expect(page.getByRole('heading', { name: 'Đã cập nhật email tài khoản' })).toBeVisible();
  await page.getByRole('link', { name: 'Về Cài đặt' }).click();
  await expect(page.getByText(`${target} · đã xác minh`).filter({ visible: true })).toBeVisible();

  // Xóa tài khoản: nút bị tắt khi chưa nhập mật khẩu.
  await section(page, 'Vùng nguy hiểm');
  await visible(page, 'Xóa tài khoản').click();
  const submit = dialog.getByRole('button', { name: 'Xóa tài khoản' });
  await expect(submit).toBeDisabled();
  await dialog.getByLabel('Nhập mật khẩu để xác nhận').fill(PASSWORD);
  await submit.click();
  await expect(page).toHaveURL(/\/login\?reason=account-deleted/);
  await expect(page.getByText('Tài khoản đã được xóa.')).toBeVisible();
  await page.getByLabel('Email').fill(target);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page.getByText('Email hoặc mật khẩu không đúng')).toBeVisible();
});
