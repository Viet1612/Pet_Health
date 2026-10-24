// Múi giờ (S4-06 §7, chuẩn bị G-5): "hôm nay" tính theo múi giờ tài khoản, ranh giới nửa đêm đúng.
import { expect, test } from '@playwright/test';

import { ApiSession, resetClock, setClock, vn } from '../support/api';

test.afterEach(async () => {
  await resetClock();
});

const CASES = [
  {
    tz: 'Asia/Ho_Chi_Minh',
    before: '2026-11-07T16:59:59Z', // 07/11 23:59:59 giờ VN
    after: '2026-11-07T17:00:00Z', // 08/11 00:00 giờ VN
  },
  {
    tz: 'America/Los_Angeles',
    before: '2026-11-08T07:59:59Z', // 07/11 23:59:59 giờ LA (UTC−8)
    after: '2026-11-08T08:00:00Z', // 08/11 00:00 giờ LA
  },
];

for (const c of CASES) {
  test(`${c.tz}: D7 xuất hiện đúng 00:00 ngày 08/11 theo giờ tài khoản`, async () => {
    await setClock(vn('2026-11-01'));
    const s = await ApiSession.register({ timezone: c.tz });
    const petId = await s.createPet();
    await s.createMilestone(petId, { type: 'VACCINE', dueOn: '2026-11-15' });

    await setClock(c.before);
    expect((await s.openApp()).items).toHaveLength(0);
    await setClock(c.after);
    const app = await s.openApp();
    expect(app.items.map((i) => i.level)).toEqual(['D7']);
    expect(app.summary.banner.top.label).toBe('còn 7 ngày');
    await s.dispose();
  });
}
