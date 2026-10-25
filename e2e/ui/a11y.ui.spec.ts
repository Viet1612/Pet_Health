// Trợ năng (S6-04): axe-core (WCAG 2.1 A/AA) không có lỗi serious/critical trên các màn chính;
// trên phone mọi phần tử tương tác ≥ 44 × 44 px. Chỉ giao diện sáng (dark mode chưa bật).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { ApiSession, PASSWORD, resetClock, setClock, vn } from '../support/api';
import { ORIGIN } from '../support/env';

test.afterEach(async () => {
  await resetClock();
});

async function axeViolations(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

/** Phần tử tương tác nhìn thấy mà nhỏ hơn 44 × 44 px (bỏ qua link nằm trong đoạn văn). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const els = document.querySelectorAll<HTMLElement>(
      'button, a[href], [role=checkbox], [role=menuitem], [role=option], input:not([type=hidden]), select, textarea',
    );
    for (const el of els) {
      const r = el.getBoundingClientRect();
      // Phần tử ẩn trực quan (sr-only, skip link chưa focus, radio ẩn trong nhãn) không tính.
      if (r.width <= 1 || r.height <= 1 || el.closest('.sr-only')) continue;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      // Ô radio/checkbox gốc nằm trong <label> lớn: vùng chạm là cả nhãn.
      const target = el.closest('label') ?? el;
      const box = target.getBoundingClientRect();
      if (el.tagName === 'A' && el.closest('p')) continue;
      if (box.width < 44 || box.height < 44) {
        out.push(
          [
            String(el.tagName).toLowerCase(),
            `"${String(el.getAttribute('aria-label') ?? el.textContent ?? '')
              .trim()
              .slice(0, 30)}"`,
            `${String(Math.round(box.width))}×${String(Math.round(box.height))}`,
          ].join(' '),
        );
      }
    }
    return out;
  });
}

test('axe + vùng chạm trên các màn chính', async ({ page }) => {
  await setClock(vn('2026-11-01'));
  const s = await ApiSession.register();
  const petId = await s.createPet('Mochi');
  const milestone = await s.createMilestone(petId, { type: 'VACCINE', dueOn: '2026-11-15' });
  await s.call(
    'POST',
    `/pets/${petId}/weights`,
    { weightKg: '9.1', measuredOn: '2026-10-01' },
    { idempotent: true },
  );
  await s.call(
    'POST',
    `/pets/${petId}/weights`,
    { weightKg: '9.3', measuredOn: '2026-11-01' },
    { idempotent: true },
  );
  await s.call(
    'POST',
    `/pets/${petId}/routines`,
    { name: 'Cho ăn sáng', timeOfDay: '07:00' },
    { idempotent: true },
  );
  await s.dispose();
  await setClock(vn('2026-11-14'));

  const problems: string[] = [];
  const check = async (path: string, ready: () => Promise<void>) => {
    await page.goto(`${ORIGIN}${path}`);
    await ready();
    for (const v of await axeViolations(page)) problems.push(`[axe ${path}] ${v}`);
    if ((page.viewportSize()?.width ?? 0) < 768) {
      for (const t of await smallTargets(page)) problems.push(`[44px ${path}] ${t}`);
    }
  };

  const heading = (name: string | RegExp) => () =>
    expect(page.getByRole('heading', { name, level: 1 })).toBeVisible({ timeout: 15_000 });

  await check('/login', heading('Đăng nhập'));
  await check('/register', heading('Tạo tài khoản'));

  await page.goto(`${ORIGIN}/login`);
  await page.getByLabel('Email').fill(s.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/`);

  const visible = (text: string | RegExp) => () =>
    expect(page.getByText(text).first()).toBeVisible({ timeout: 15_000 });
  await check('/', visible('Cho ăn sáng'));
  await check('/pets', heading('Thú cưng'));
  await check(`/pets/${petId}`, heading('Hồ sơ thú cưng'));
  await check(`/pets/${petId}/health/weight`, visible('9,3 kg'));
  await check(`/pets/${petId}/health/visits`, heading(/Sức khỏe/));
  await check(`/pets/${petId}/milestones`, visible('Tiêm vaccine'));
  await check(`/milestones/${milestone.id as string}`, visible('Tiêm vaccine'));
  await check(`/pets/${petId}/routines`, visible('Cho ăn sáng'));
  await check('/notifications', heading('Thông báo'));
  await check('/settings', heading('Cài đặt'));
  await check('/pets/new', heading('Thêm thú cưng'));
  await check(`/pets/${petId}/visits/new`, visible('Triệu chứng'));

  expect(problems, problems.join('\n')).toEqual([]);
});
