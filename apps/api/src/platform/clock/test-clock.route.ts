import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { FakeClock } from './clock.js';

/**
 * `POST /api/v1/__test/clock` — điều khiển giờ cho E2E (NFR-MNT-005, S4-06). Chỉ được đăng ký khi
 * `NODE_ENV=test`; ẩn khỏi `openapi.yaml`.
 * - `{ now: "2026-11-08T00:01:00+07:00" }` → đặt giờ (chạy tiếp từ đó; `frozen: true` để đứng yên).
 * - `{ advanceMs: 16000 }` → cộng thời gian (cửa sổ hoàn tác).
 * - `{ reset: true }` hoặc `{ now: null }` → về giờ thật.
 * Trả `{ now }` (UTC).
 */
export const testClockRoute: FastifyPluginAsyncZod<{ clock: FakeClock }> = (app, { clock }) => {
  app.post(
    '/__test/clock',
    {
      config: { public: true },
      schema: {
        hide: true,
        body: z.object({
          now: z.iso.datetime({ offset: true }).nullable().optional(),
          frozen: z.boolean().optional(),
          advanceMs: z.number().int().optional(),
          reset: z.boolean().optional(),
        }),
        response: { 200: z.object({ now: z.iso.datetime() }) },
      },
    },
    (req) => {
      const { now, frozen, advanceMs, reset } = req.body;
      if (reset || now === null) clock.reset();
      else if (now !== undefined) clock.set(new Date(now), { frozen: frozen ?? false });
      if (advanceMs !== undefined) clock.advance(advanceMs);
      return Promise.resolve({ now: clock.now().toISOString() });
    },
  );
  return Promise.resolve();
};
