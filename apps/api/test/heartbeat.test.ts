import { mkdtemp, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isHeartbeatFresh, writeHeartbeat } from '../src/platform/heartbeat.js';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'ph-heartbeat-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('heartbeat', () => {
  it('tệp mới ghi thì còn khỏe', async () => {
    const file = path.join(dir, 'nested', 'alive');
    await writeHeartbeat(file);
    await expect(isHeartbeatFresh(file)).resolves.toBe(true);
  });

  it('tệp cũ hơn 90 s thì không khỏe', async () => {
    const file = path.join(dir, 'alive');
    await writeHeartbeat(file);
    const old = new Date(Date.now() - 91_000);
    await utimes(file, old, old);
    await expect(isHeartbeatFresh(file)).resolves.toBe(false);
  });

  it('không có tệp thì không khỏe', async () => {
    await expect(isHeartbeatFresh(path.join(dir, 'missing'))).resolves.toBe(false);
  });
});
