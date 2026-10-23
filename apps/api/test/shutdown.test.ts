import type { AddressInfo } from 'node:net';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildApp } from '../src/app.js';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('tắt êm', () => {
  it('request đang chạy (2 s) vẫn trả 200; request đến sau khi đóng bị từ chối', async () => {
    const lifecycle = { shuttingDown: false };
    const app = await buildApp({
      checkDb: () => Promise.resolve(),
      lifecycle,
      registerRoutes: (api) => {
        api.get(
          '/__slow',
          { schema: { response: { 200: z.object({ done: z.boolean() }) } } },
          async () => {
            await sleep(2000);
            return { done: true };
          },
        );
      },
    });
    await app.listen({ host: '127.0.0.1', port: 0 });
    const { port } = app.server.address() as AddressInfo;
    const base = `http://127.0.0.1:${String(port)}/api/v1`;

    const slow = fetch(`${base}/__slow`);
    await sleep(200); // request chậm đã vào server

    lifecycle.shuttingDown = true;
    const closing = app.close();
    await sleep(100);

    const late = await fetch(`${base}/healthz`).then(
      (res) => res.status,
      () => 'refused' as const,
    );
    expect(late === 'refused' || late === 503).toBe(true);

    const res = await slow;
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ done: true });
    await closing;
  }, 10_000);
});
