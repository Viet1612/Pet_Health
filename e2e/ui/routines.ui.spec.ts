// SCR-16 qua giao diện (S5-02): tạo 2 việc → tick 1 → reload vẫn xong → sửa giờ → xóa có xác nhận;
// qua 00:00 giờ tài khoản → chưa xong.
import { expect, test } from '@playwright/test';

import { ApiSession, PASSWORD, resetClock, setClock } from '../support/api';
import { ORIGIN } from '../support/env';

test.afterEach(async () => {
  await resetClock();
});

test('việc hằng ngày: tạo, tick, sửa, xóa, qua nửa đêm', async ({ page }) => {
  await setClock('2026-11-14T02:00:00Z'); // 09:00 ngày 14 giờ VN
  const s = await ApiSession.register();
  const petId = await s.createPet('Mochi');
  await s.dispose();

  await page.goto(`${ORIGIN}/login`);
  await page.getByLabel('Email').fill(s.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/`);

  // ?add=1 mở thẳng sheet Thêm việc.
  await page.goto(`${ORIGIN}/pets/${petId}/routines?add=1`);
  const dialog = page.getByRole('dialog');
  for (const [i, [name, time]] of (
    [
      ['Cho ăn sáng', '07:00'],
      ['Dắt đi dạo', '18:00'],
    ] as const
  ).entries()) {
    if (i > 0) await page.getByRole('button', { name: '+ Thêm việc' }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Tên việc *').fill(name);
    await dialog.getByLabel('Giờ *').fill(time);
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  await expect(page.getByText('0/2 xong')).toBeVisible();

  // Tick "Cho ăn sáng" → xong ngay; reload vẫn xong.
  const feed = page.getByRole('checkbox', { name: '07:00 Cho ăn sáng' });
  await feed.click();
  await expect(feed).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('1/2 xong')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '07:00 Cho ăn sáng' })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  // Sửa giờ "Dắt đi dạo" → 17:30.
  await page.getByRole('button', { name: 'Tùy chọn cho Dắt đi dạo' }).click();
  await page.getByRole('menuitem', { name: 'Sửa' }).click();
  await page.getByRole('dialog').getByLabel('Giờ *').fill('17:30');
  await page.getByRole('dialog').getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('checkbox', { name: '17:30 Dắt đi dạo' })).toBeVisible();

  // Qua 00:00 ngày 15 → "Cho ăn sáng" chưa xong.
  await setClock('2026-11-14T17:01:00Z');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '07:00 Cho ăn sáng' })).toHaveAttribute(
    'aria-checked',
    'false',
  );

  // Xóa có xác nhận.
  await page.getByRole('button', { name: 'Tùy chọn cho Dắt đi dạo' }).click();
  await page.getByRole('menuitem', { name: 'Xóa' }).click();
  await expect(page.getByRole('dialog')).toContainText('Xóa việc "Dắt đi dạo"?');
  await page.getByRole('dialog').getByRole('button', { name: 'Xóa', exact: true }).click();
  await expect(page.getByText('Đã xóa việc')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Dắt đi dạo/ })).toHaveCount(0);
});
