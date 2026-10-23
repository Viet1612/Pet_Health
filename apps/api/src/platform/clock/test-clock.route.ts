import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { FakeClock } from './clock.js';

/**
 * `POST /api/v1/__test/clock` — đặt giờ cho E2E (NFR-MNT-005). Chỉ được đăng ký khi
 * `NODE_ENV=test`; ẩn khỏi `openapi.yaml`.
 */
export const testClockRoute: FastifyPluginAsyncZod<{ clock: FakeClock }> = (app, { clock }) => {
  app.post(
    '/__test/clock',
    {
      config: { public: true },
      schema: {
        hide: true,
        body: z.object({
          now: z.iso.datetime().nullable(),
          frozen: z.boolean().optional(),
        }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const { now, frozen } = req.body;
      if (now === null) clock.reset();
      else clock.set(new Date(now), { frozen: frozen ?? false });
      return reply.code(204).send(null);
    },
  );
  return Promise.resolve();
};
