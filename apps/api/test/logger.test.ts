import { describe, expect, it } from 'vitest';

import { memoryLogger } from './helpers.js';

const SECRET = 'giá-trị-nhạy-cảm';

describe('logger redact', () => {
  it('che các trường nhạy cảm ở gốc và lồng một cấp', () => {
    const { logger, lines } = memoryLogger();
    const fields = [
      'password',
      'newPassword',
      'currentPassword',
      'token',
      'email',
      'symptoms',
      'diagnosis',
      'prescription',
      'note',
      'description',
    ];
    const flat = Object.fromEntries(fields.map((f) => [f, SECRET]));
    logger.info(flat, 'flat');
    logger.info({ body: flat }, 'nested');

    const [root, nested] = lines();
    for (const f of fields) {
      expect(root?.[f]).toBe('[REDACTED]');
      expect((nested?.body as Record<string, unknown>)[f]).toBe('[REDACTED]');
    }
    expect(JSON.stringify(lines())).not.toContain(SECRET);
  });

  it('che header cookie, authorization, x-csrf-token và set-cookie', () => {
    const { logger, lines } = memoryLogger();
    logger.info({
      req: {
        headers: { cookie: SECRET, authorization: SECRET, 'x-csrf-token': SECRET, accept: 'json' },
      },
      res: { headers: { 'set-cookie': SECRET } },
    });
    const [line] = lines();
    const req = line?.req as { headers: Record<string, string> };
    const res = line?.res as { headers: Record<string, string> };
    expect(req.headers).toEqual({
      cookie: '[REDACTED]',
      authorization: '[REDACTED]',
      'x-csrf-token': '[REDACTED]',
      accept: 'json',
    });
    expect(res.headers['set-cookie']).toBe('[REDACTED]');
  });
});
