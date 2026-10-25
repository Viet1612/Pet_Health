// Trạng thái hệ thống (S6-03): mất mạng khi đang nhập, hết phiên giữ bản nháp, đồng bộ 2 thiết bị.
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

test('mất mạng: banner, nút Lưu tắt, nội dung giữ nguyên; có mạng lại thì bật', async ({
  page,
  context,
}) => {
  await setClock(vn('2026-11-14'));
  const s = await ApiSession.register();
  const petId = await s.createPet('Mochi');
  await s.dispose();
  await login(page, s.email);
  await page.goto(`${ORIGIN}/pets/${petId}/visits/new`);
  await page.getByLabel('Triệu chứng').fill('Ho nhẹ');

  await context.setOffline(true);
  await expect(page.getByText('Mất kết nối — thay đổi chưa được lưu')).toBeVisible({
    timeout: 2_000,
  });
  const save = page.getByRole('button', { name: 'Lưu', exact: true });
  await expect(save).toBeDisabled();
  await expect(page.getByLabel('Triệu chứng')).toHaveValue('Ho nhẹ');

  await context.setOffline(false);
  await expect(page.getByText('Mất kết nối — thay đổi chưa được lưu')).toBeHidden({
    timeout: 10_000,
  });
  await expect(save).toBeEnabled();
});

test('hết phiên khi lưu lần khám: về /login, đăng nhập lại thì form được điền lại', async ({
  page,
  context,
}) => {
  await setClock(vn('2026-11-14'));
  const s = await ApiSession.register();
  const petId = await s.createPet('Mochi');
  await s.dispose();
  await login(page, s.email);
  await page.goto(`${ORIGIN}/pets/${petId}/visits/new`);
  await page.getByLabel('Triệu chứng').fill('Bỏ ăn hai ngày');
  await page.getByLabel('Chẩn đoán').fill('Viêm dạ dày');

  await context.clearCookies();
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByText(/nội dung đang nhập vẫn được giữ/)).toBeVisible();
  await expect(page.getByText(/Sau khi đăng nhập sẽ quay lại:/)).toBeVisible();

  await page.getByLabel('Email').fill(s.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(new RegExp(`/pets/${petId}/visits/new`));
  await expect(page.getByText('Đã khôi phục nội dung đang nhập')).toBeVisible();
  await expect(page.getByLabel('Triệu chứng')).toHaveValue('Bỏ ăn hai ngày');
  await expect(page.getByLabel('Chẩn đoán')).toHaveValue('Viêm dạ dày');
  // Bản nháp đã bị xóa.
  expect(
    await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('ph.draft.'))),
  ).toEqual([]);
});

test('2 thiết bị: số đo lưu ở A hiện ở B sau khi tải lại; sửa sau thắng', async ({ browser }) => {
  await setClock(vn('2026-11-14'));
  const s = await ApiSession.register();
  const petId = await s.createPet('Mochi');

  const tablet = await browser.newContext({ viewport: { width: 834, height: 1112 } });
  const b = await tablet.newPage();
  await login(b, s.email);
  await b.goto(`${ORIGIN}/pets/${petId}/health/weight`);

  // Thiết bị A (API) ghi 9.4 kg.
  const added = await s.call(
    'POST',
    `/pets/${petId}/weights`,
    { weightKg: '9.4', measuredOn: '2026-11-14' },
    { idempotent: true },
  );
  expect(added.status).toBe(201);
  await b.reload();
  await expect(b.getByText('9,4 kg').first()).toBeVisible();

  // Last-write-wins: A sửa 9.5, rồi "B" sửa 9.6 → 9.6.
  const id = added.body.id as string;
  await s.call('PATCH', `/weights/${id}`, { weightKg: '9.5' });
  await s.call('PATCH', `/weights/${id}`, { weightKg: '9.6' });
  await b.reload();
  await expect(b.getByText('9,6 kg').first()).toBeVisible();
  await tablet.close();
  await s.dispose();
});
