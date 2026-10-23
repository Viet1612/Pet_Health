import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export interface HealthDeps {
  /** Kiểm DB sống (`SELECT 1`). */
  checkDb: () => Promise<void>;
  lifecycle: { shuttingDown: boolean };
}

const READY_TIMEOUT_MS = 2000;

const ok = z.object({ status: z.literal('ok') });
const unavailable = z.object({ status: z.literal('unavailable') });

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout ${String(ms)} ms`));
    }, ms);
    promise.then(resolve, reject).finally(() => {
      clearTimeout(timer);
    });
  });
}

export const healthRoutes: FastifyPluginAsyncZod<HealthDeps> = (app, deps) => {
  app.get(
    '/healthz',
    {
      config: { public: true },
      schema: { tags: ['system'], summary: 'Tiến trình còn sống', response: { 200: ok } },
    },
    () => ({ status: 'ok' as const }),
  );

  app.get(
    '/readyz',
    {
      config: { public: true },
      schema: {
        tags: ['system'],
        summary: 'Sẵn sàng nhận request (kiểm DB)',
        response: { 200: ok, 503: unavailable },
      },
    },
    async (_req, reply) => {
      if (deps.lifecycle.shuttingDown) {
        return reply.code(503).send({ status: 'unavailable' });
      }
      try {
        await withTimeout(deps.checkDb(), READY_TIMEOUT_MS);
        return { status: 'ok' as const };
      } catch {
        return reply.code(503).send({ status: 'unavailable' });
      }
    },
  );

  return Promise.resolve();
};
