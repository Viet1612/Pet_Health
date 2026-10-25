// Analytics (S6-05): lọc danh sách trắng, user_id_hash do server tính, event phía server
// (`milestone_created`, `notification_created` không trùng), batch > 20 → 400.
import { expect, request, test } from '@playwright/test';
import pg from 'pg';

import { ApiSession, resetClock, setClock, vn } from '../support/api';
import { API_ENV, API_URL, ORIGIN } from '../support/env';

test.afterEach(async () => {
  await resetClock();
});

/** Đọc bằng ph_owner (app chỉ có quyền INSERT). */
async function rows(sql: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: API_ENV.MIGRATION_DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as Record<string, unknown>[];
  } finally {
    await client.end();
  }
}

test('không phiên: lọc tên lạ và khóa lạ, signup_started không có hash; batch 21 → 422', async () => {
  const ctx = await request.newContext({ extraHTTPHeaders: { origin: ORIGIN } });
  const marker = `m${String(Date.now())}`;
  const res = await ctx.post(`${API_URL}/analytics/events`, {
    data: {
      viewportW: 390,
      events: [
        { name: 'signup_started', props: { source: 'direct', email: `${marker}@x.vn` } },
        { name: 'hack_event', props: { a: 1 } },
        {
          name: 'web_vitals',
          props: { metric: 'LCP', value: 1234.5, rating: 'good', petName: marker },
        },
      ],
    },
  });
  expect(res.status()).toBe(204);
  const big = await ctx.post(`${API_URL}/analytics/events`, {
    data: { viewportW: 390, events: Array.from({ length: 21 }, () => ({ name: 'login' })) },
  });
  // Lỗi kiểm dữ liệu của API luôn là 422 VALIDATION_FAILED (quy ước chung).
  expect(big.status()).toBe(422);
  await ctx.dispose();

  const found = await rows(
    `SELECT name, user_id_hash, device_class, props FROM analytics_events
     WHERE received_at > now() - interval '1 minute' AND name IN ('signup_started','web_vitals','hack_event')
     ORDER BY received_at DESC LIMIT 5`,
  );
  expect(found.some((r) => r.name === 'hack_event')).toBe(false);
  const signup = found.find((r) => r.name === 'signup_started');
  expect(signup).toMatchObject({
    user_id_hash: null,
    device_class: 'phone',
    props: { source: 'direct' },
  });
  expect(JSON.stringify(found)).not.toContain(marker);
});

test('có phiên: hash do server tính; event server milestone_created, notification_created không trùng', async () => {
  await setClock(vn('2026-11-01'));
  const s = await ApiSession.register();
  const ok = await s.call('POST', '/analytics/events', {
    viewportW: 1024,
    events: [{ name: 'app_opened', props: { device_class: 'tablet', orientation: 'landscape' } }],
  });
  expect(ok.status).toBe(204);
  const petId = await s.createPet();
  await s.createMilestone(petId, { type: 'VACCINE', dueOn: '2026-11-15' });
  await setClock(vn('2026-11-08'));
  await s.call('GET', '/notifications/summary');
  await s.call('GET', '/notifications/summary');

  const hash = (
    await rows(
      `SELECT user_id_hash FROM analytics_events WHERE name = 'app_opened' AND device_class = 'tablet'
       ORDER BY received_at DESC LIMIT 1`,
    )
  )[0]?.user_id_hash as string;
  expect(hash).toMatch(/^[0-9a-f]{64}$/);
  const mine = await rows(
    `SELECT name, device_class, props FROM analytics_events WHERE user_id_hash = $1 ORDER BY occurred_at`,
    [hash],
  );
  expect(mine.map((r) => r.name)).toEqual([
    'app_opened',
    'milestone_created',
    'notification_created',
  ]);
  expect(mine[1]).toMatchObject({
    device_class: 'server',
    props: { type: 'vaccine', days_until_due: 14, auto_generated: false },
  });
  expect(mine[2]?.props).toMatchObject({ level: 'd7', type: 'vaccine', days_until_due: 7 });
  await s.dispose();
});
