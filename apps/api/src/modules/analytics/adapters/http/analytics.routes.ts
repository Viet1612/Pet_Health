import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { newId } from '../../../../platform/ids.js';
import { clientIp } from '../../../../platform/rate-limit/rate-limiter.js';
import { clampOccurredAt, deviceClassOf, sanitizeEvent } from '../../domain/allowlist.js';
import { userIdHash, type AnalyticsDeps } from '../../application/deps.js';

const zBatch = z.object({
  viewportW: z.number().int().min(0).max(10_000),
  events: z
    .array(
      z.object({
        name: z.string().max(64),
        props: z.record(z.string(), z.unknown()).optional(),
        occurredAt: z.string().max(40).optional(),
      }),
    )
    .min(1)
    .max(20),
});

/**
 * `POST /analytics/events` (S6-05): phiên không bắt buộc; có phiên thì cần CSRF và server tự tính
 * `user_id_hash`. Luôn `204` khi body hợp lệ, kể cả khi bỏ event hay lỗi DB.
 */
export const analyticsRoutes: FastifyPluginAsyncZod<AnalyticsDeps> = (app, deps) => {
  app.post(
    '/analytics/events',
    {
      bodyLimit: 16 * 1024,
      config: { public: true, optionalAuth: true },
      schema: {
        tags: ['analytics'],
        summary: 'Ghi event sản phẩm (danh sách trắng, không dữ liệu cá nhân)',
        body: zBatch,
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const ip = clientIp(req, deps.trustCfConnectingIp);
      await deps.rateLimiter.hit(`analytics:${ip}`, 60, 60);

      const now = deps.clock.now();
      const hash = req.auth ? userIdHash(deps.hmacKey, req.auth.userId) : null;
      const rows = req.body.events.flatMap((ev) => {
        const clean = sanitizeEvent(ev.name, ev.props);
        if (!clean) return [];
        return [
          {
            id: newId(),
            name: clean.name,
            user_id_hash: clean.name === 'signup_started' ? null : hash,
            device_class: deviceClassOf(req.body.viewportW),
            viewport_w: req.body.viewportW,
            props: JSON.stringify(clean.props),
            occurred_at: clampOccurredAt(ev.occurredAt, now),
          },
        ];
      });
      if (rows.length > 0) {
        try {
          await deps.db.insertInto('analytics_events').values(rows).execute();
        } catch (err) {
          req.log.warn({ err }, 'analytics insert failed');
        }
      }
      return reply.code(204).send(null);
    },
  );
  return Promise.resolve();
};
