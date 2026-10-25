import { describe, expect, it } from 'vitest';

import {
  clampOccurredAt,
  deviceClassOf,
  sanitizeEvent,
} from '../src/modules/analytics/domain/allowlist.js';
import { userIdHash } from '../src/modules/analytics/index.js';

describe('analytics allowlist (S6-05)', () => {
  it('tên lạ → null; bỏ khóa lạ, sai kiểu, chuỗi tự do', () => {
    expect(sanitizeEvent('hack', {})).toBeNull();
    expect(
      sanitizeEvent('pet_created', {
        pet_count_after: 3,
        has_photo: 'yes',
        petName: 'Mochi',
        email: 'a@b.vn',
      }),
    ).toEqual({ name: 'pet_created', props: { pet_count_after: 3 } });
    expect(sanitizeEvent('pet_created', { pet_count_after: 11 })?.props).toEqual({});
    expect(sanitizeEvent('weight_logged', { days_since_last_log: null })?.props).toEqual({
      days_since_last_log: null,
    });
    expect(sanitizeEvent('client_error', { code: 'TIMEOUT', screen: 'weight' })?.props).toEqual({
      code: 'TIMEOUT',
      screen: 'weight',
    });
    expect(sanitizeEvent('client_error', { code: 'lỗi gì đó' })?.props).toEqual({});
  });

  it('device_class: biên 767/768/1279/1280', () => {
    expect([767, 768, 1279, 1280].map(deviceClassOf)).toEqual([
      'phone',
      'tablet',
      'tablet',
      'desktop',
    ]);
  });

  it('occurredAt ngoài [now − 24 h, now + 5 phút] → now', () => {
    const now = new Date('2026-11-14T00:00:00Z');
    expect(clampOccurredAt('2026-11-13T23:00:00Z', now).toISOString()).toBe(
      '2026-11-13T23:00:00.000Z',
    );
    expect(clampOccurredAt('2026-11-12T00:00:00Z', now)).toBe(now);
    expect(clampOccurredAt('2026-11-14T00:10:00Z', now)).toBe(now);
    expect(clampOccurredAt('rác', now)).toBe(now);
  });

  it('HMAC ổn định với cùng key, khác key thì khác', () => {
    expect(userIdHash('k1', 'u')).toBe(userIdHash('k1', 'u'));
    expect(userIdHash('k1', 'u')).not.toBe(userIdHash('k2', 'u'));
  });
});
