import { Writable } from 'node:stream';

import type { Logger } from 'pino';

import type { AppDeps } from '../src/app.js';
import { createLogger } from '../src/platform/logging/logger.js';

export const TEST_ORIGIN = 'https://app.pethealth.example';

/** Deps tối thiểu cho buildApp trong test; ghi đè bằng `overrides`. */
export function testDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    appOrigin: TEST_ORIGIN,
    nodeEnv: 'test',
    // Test của S0 không gửi Origin/X-CSRF-Token; CSRF được kiểm ở test của S1.
    csrf: false,
    checkDb: () => Promise.resolve(),
    lifecycle: { shuttingDown: false },
    ...overrides,
  };
}

/** Logger ghi vào bộ nhớ để kiểm nội dung log. */
export function memoryLogger(level = 'info'): {
  logger: Logger;
  lines: () => Record<string, unknown>[];
} {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
  });
  const logger = createLogger({ level }, stream);
  return {
    logger,
    lines: () =>
      chunks
        .join('')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Record<string, unknown>),
  };
}
