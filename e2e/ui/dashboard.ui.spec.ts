// SCR-06 Dashboard (S5-04): sau đăng nhập về `/`, 1 request `GET /dashboard`, banner đỏ "+1 nhắc
// khác" → ✕ → reload không còn banner nhưng Thông báo vẫn có 2 mục, lọc "Tất cả" ↔ từng thú cưng,
// không cuộn ngang.
import { expect, test, type Page } from '@playwright/test';

import { ApiSession, PASSWORD, resetClock, setClock, vn } from '../support/api';
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

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => (document.scrollingElement?.scrollWidth ?? 0) <= window.innerWidth);

test('Dashboard: banner, ✕, lọc thú cưng, 1 request', async ({ page }) => {
  await setClock(vn('2026-11-01'));
  const s = await ApiSession.register();
  const mochi = await s.createPet('Mochi');
  const bo = await s.createPet('Bơ');
  await s.createMilestone(bo, { type: 'DEWORM', dueOn: '2026-11-10' }); // quá hạn ngày 14
  await s.createMilestone(mochi, { type: 'VACCINE', dueOn: '2026-11-15', note: 'Dại' }); // D1
  await s.call(
    'POST',
    `/pets/${mochi}/routines`,
    { name: 'Cho ăn sáng', timeOfDay: '07:00' },
    { idempotent: true },
  );
  await s.dispose();
  await setClock(vn('2026-11-14'));

  const dashboardCalls: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/v1/dashboard')) dashboardCalls.push(r.url());
  });
  await login(page, s.email);

  // Mặc định lọc theo thú cưng đang chọn (con đầu tiên) → chuyển sang "Tất cả".
  await page.getByRole('button', { name: /^Thú cưng đang chọn/ }).click();
  await page.getByRole('option', { name: 'Tất cả' }).click();
  const banner = page.getByRole('region', { name: 'Nhắc nhở' });
  await expect(banner).toContainText('Tẩy giun của Bơ đã quá hạn 4 ngày (10/11)');
  await expect(banner).toContainText('+1 nhắc khác');
  await expect(page.getByRole('checkbox', { name: '07:00 Cho ăn sáng' })).toBeVisible();
  await expect(page.getByText('Mốc sắp tới · Tất cả')).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);

  // Lọc Mochi: banner chỉ còn nhắc D1 của Mochi, không "+N".
  await page.getByRole('button', { name: /^Thú cưng đang chọn/ }).click();
  await page.getByRole('option', { name: /Mochi/ }).click();
  await expect(banner).toContainText('Tiêm vaccine (Dại) của Mochi — ngày mai');
  await expect(banner).not.toContainText('nhắc khác');

  // Về "Tất cả", ✕ → reload không còn banner; Thông báo vẫn còn 2 mục.
  await page.getByRole('button', { name: /^Thú cưng đang chọn/ }).click();
  await page.getByRole('option', { name: 'Tất cả' }).click();
  await expect(banner).toContainText('+1 nhắc khác');
  // ✕ ẩn ngay, rồi gửi `read` và làm mới dashboard: chờ xong trước khi đếm request.
  const refreshed = page.waitForResponse((r) => r.url().includes('/api/v1/dashboard'));
  await banner.getByRole('button', { name: 'Đóng nhắc nhở' }).click();
  await expect(banner).toBeHidden();
  await refreshed;
  dashboardCalls.length = 0;
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '07:00 Cho ăn sáng' })).toBeVisible();
  await expect(banner).toBeHidden();
  expect(dashboardCalls).toHaveLength(1);
  await page.goto(`${ORIGIN}/notifications`);
  await expect(page.getByRole('link', { name: /Mochi · Tiêm vaccine|Bơ · Tẩy giun/ })).toHaveCount(
    2,
  );
});

test('Dashboard tài khoản mới: empty state, không có "+"', async ({ page }) => {
  await setClock(vn('2026-11-14'));
  const s = await ApiSession.register();
  await s.dispose();
  await login(page, s.email);
  await expect(
    page.getByRole('heading', { name: 'Thêm thú cưng đầu tiên để bắt đầu' }),
  ).toBeVisible();
  await expect(page.getByText('3 bước để được nhắc lịch')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thêm nhanh' })).toHaveCount(0);
  await expect(page.getByText('Xác minh email để có thể lấy lại mật khẩu khi quên')).toBeVisible();
});
