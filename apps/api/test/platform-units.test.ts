import { describe, expect, it } from 'vitest';

import { FakeClock } from '../src/platform/clock/clock.js';
import { genReqId, REF_PATTERN } from '../src/platform/http/request-id.js';
import { fieldErrorCode } from '../src/platform/http/zod-messages.vi.js';
import { newId } from '../src/platform/ids.js';

describe('genReqId', () => {
  it('8 ký tự Crockford base32, 10.000 lần không trùng', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const ref = genReqId();
      expect(ref).toMatch(REF_PATTERN);
      seen.add(ref);
    }
    expect(seen.size).toBe(10_000);
  });
});

describe('FakeClock', () => {
  const realNow = (): number => base + elapsed;
  let base = Date.parse('2026-10-23T00:00:00Z');
  let elapsed = 0;

  it('set chạy tiếp từ thời điểm đặt (giữ độ lệch)', () => {
    base = Date.parse('2026-10-23T00:00:00Z');
    elapsed = 0;
    const clock = new FakeClock(realNow);
    clock.set(new Date('2026-11-08T00:00:00Z'));
    elapsed = 5000;
    expect(clock.now().toISOString()).toBe('2026-11-08T00:00:05.000Z');
  });

  it('frozen thì đứng yên; advance cộng thêm', () => {
    elapsed = 0;
    const clock = new FakeClock(realNow);
    clock.set(new Date('2026-11-14T00:00:00Z'), { frozen: true });
    elapsed = 60_000;
    expect(clock.now().toISOString()).toBe('2026-11-14T00:00:00.000Z');
    clock.advance(86_400_000);
    expect(clock.now().toISOString()).toBe('2026-11-15T00:00:00.000Z');
  });

  it('advance khi không frozen; reset về giờ thật', () => {
    elapsed = 0;
    const clock = new FakeClock(realNow);
    clock.advance(1000);
    expect(clock.now().getTime()).toBe(base + 1000);
    clock.reset();
    expect(clock.now().getTime()).toBe(base);
  });
});

describe('fieldErrorCode', () => {
  it.each([
    [{ code: 'invalid_type', input: undefined }, 'REQUIRED'],
    [{ code: 'invalid_type', input: 5 }, 'INVALID_FORMAT'],
    [{ code: 'too_small', origin: 'string', minimum: 1 }, 'REQUIRED'],
    [{ code: 'too_small', origin: 'string', minimum: 8 }, 'INVALID_FORMAT'],
    [{ code: 'too_small', origin: 'number', minimum: 0.1 }, 'OUT_OF_RANGE'],
    [{ code: 'too_big', origin: 'string' }, 'TOO_LONG'],
    [{ code: 'too_big', origin: 'number' }, 'OUT_OF_RANGE'],
    [{ code: 'invalid_format' }, 'INVALID_FORMAT'],
  ])('%o → %s', (issue, expected) => {
    expect(fieldErrorCode(issue)).toBe(expected);
  });
});

describe('newId', () => {
  it('UUIDv7, tăng dần theo thời gian', () => {
    const a = newId();
    const b = newId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(b > a).toBe(true);
  });
});
