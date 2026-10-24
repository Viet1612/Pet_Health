// G-3 qua giao diện (S4-06 §4), khổ phone 390 px và tablet 834 px. Chỉ dùng getByRole/getByLabel/
// getByText như người dùng thấy. Đồng hồ giả của API quyết định "hôm nay".
import { expect, test, type Page } from '@playwright/test';

import { PASSWORD, newEmail, resetClock, setClock, verificationLink, vn } from '../support/api';
import { ORIGIN } from '../support/env';

test.afterEach(async () => {
  await resetClock();
});

const bell = (page: Page) => page.getByRole('link', { name: /^Thông báo/ });

async function openBellList(page: Page) {
  await bell(page).click();
  await expect(page.getByRole('heading', { name: 'Thông báo', level: 1 })).toBeVisible();
}

test('luồng cốt lõi: tạo mốc → nhắc D7, D1 → đánh dấu (có hoàn tác) → mốc năm sau', async ({
  page,
}) => {
  // IP giả cho giới hạn đăng ký (API E2E tin CF-Connecting-IP).
  await page.setExtraHTTPHeaders({
    'cf-connecting-ip': `10.9.${String(Math.floor(Math.random() * 250))}.${String(Math.floor(Math.random() * 250) + 1)}`,
  });
  await setClock(vn('2026-11-01'));
  const email = newEmail();

  // Đăng ký → xác minh qua liên kết trong Mailpit.
  await page.goto(`${ORIGIN}/register`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng ký' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/`);
  await page.goto(await verificationLink(email));
  await expect(page.getByRole('heading', { name: 'Email đã được xác minh' })).toBeVisible();

  // Thêm thú cưng Mochi.
  await page.goto(`${ORIGIN}/pets/new`);
  await page.getByLabel('Tên *').fill('Mochi');
  await page.getByLabel('Giống *').fill('Poodle');
  await page.getByText('Cái', { exact: true }).click();
  await page.getByLabel('Ngày sinh *').fill('2020-01-15');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Đã thêm Mochi')).toBeVisible();

  // Lịch → + Tạo mốc: Tiêm vaccine, 15/11/2026, "Dại".
  await page.getByRole('link', { name: 'Lịch' }).filter({ visible: true }).click();
  await page.getByRole('button', { name: '+ Tạo mốc', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('Tiêm vaccine', { exact: true }).click();
  await dialog.getByLabel('Ngày đến hạn *').fill('2026-11-15');
  await dialog.getByLabel('Ghi chú').fill('Dại');
  await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Tiêm vaccine · Dại').first()).toBeVisible();

  // 08/11: chuông 1 chưa xem, "còn 7 ngày"; chạm → chi tiết mốc, chuông hết số.
  await setClock(vn('2026-11-08', '00:01:00'));
  await page.reload();
  await expect(bell(page)).toHaveAccessibleName('Thông báo, 1 chưa xem');
  await openBellList(page);
  const item = page.getByRole('link', { name: /Mochi · Tiêm vaccine \(Dại\)/ });
  await expect(item).toContainText('còn 7 ngày');
  await item.click();
  await expect(page).toHaveURL(/\/milestones\/[0-9a-f-]+\?from=notification/);
  await expect(bell(page)).toHaveAccessibleName('Thông báo');

  // 14/11: D1 "ngày mai" → đánh dấu đã thực hiện từ chi tiết mốc.
  await setClock(vn('2026-11-14', '08:00:00'));
  await page.reload();
  await expect(bell(page)).toHaveAccessibleName('Thông báo, 1 chưa xem');
  await openBellList(page);
  // D7 cũ (đã xem) cũng mang nhãn "ngày mai" vì nhãn tính lúc đọc; chọn mục chưa xem (D1).
  const d1 = page.getByRole('link', { name: /Mochi · Tiêm vaccine \(Dại\).*ngày mai.*Chưa xem/ });
  await d1.click();

  const markDone = page.getByRole('button', { name: 'Đánh dấu đã thực hiện', exact: true });
  await markDone.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click();
  await expect(page.getByText('Đã đánh dấu thực hiện')).toBeVisible();
  await expect(page.getByText('Đã tạo lịch tiêm tiếp theo: 14/11/2027')).toBeVisible();

  // Nhánh phụ: Hoàn tác trong 10 s → mốc trở lại chờ thực hiện; đánh dấu lại.
  await page.getByRole('button', { name: 'Hoàn tác' }).click();
  await expect(page.getByText('Đã hoàn tác')).toBeVisible();
  await expect(markDone).toBeVisible();
  await markDone.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click();
  await expect(page.getByText('Đã tạo lịch tiêm tiếp theo: 14/11/2027')).toBeVisible();

  // Thông báo: cả D7 và D1 mờ kèm "Đã thực hiện".
  await openBellList(page);
  await expect(page.getByText('Đã thực hiện', { exact: true })).toHaveCount(2);

  // Lịch → Sắp tới có mốc năm sau.
  await page.getByRole('link', { name: 'Lịch' }).filter({ visible: true }).click();
  await page.getByRole('tab', { name: /^Sắp tới/ }).click();
  await expect(page.getByText('Hạn 14/11/2027 · tự lặp 12 tháng')).toBeVisible();
});
