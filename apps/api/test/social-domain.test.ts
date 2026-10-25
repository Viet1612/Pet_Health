import { describe, expect, it } from 'vitest';

import { checkBirthDate } from '../src/modules/identity/application/birth-date.js';
import {
  daysUntilUsernameChange,
  normalizeUsername,
  usernameProblem,
} from '../src/modules/social/domain/username.js';

describe('username (F-02)', () => {
  it('chuẩn hóa và kiểm định dạng', () => {
    expect(normalizeUsername('  Mochi.Mom ')).toBe('mochi.mom');
    expect(usernameProblem('mochi_mom.2')).toBeNull();
    for (const bad of ['ab', 'a'.repeat(31), 'có.dấu', '.mochi', 'mochi.', 'mo..chi', 'mo chi']) {
      expect(usernameProblem(bad), bad).toBe('INVALID');
    }
    expect(usernameProblem('admin')).toBe('RESERVED');
  });

  it('đổi username tối đa 1 lần/14 ngày; lần đầu đổi được ngay', () => {
    expect(daysUntilUsernameChange(null, new Date('2026-10-02T00:00:00Z'))).toBe(0);
    const changed = new Date('2026-10-10T00:00:00Z');
    expect(daysUntilUsernameChange(changed, new Date('2026-10-10T00:00:00Z'))).toBe(14);
    expect(daysUntilUsernameChange(changed, new Date('2026-10-11T00:00:00Z'))).toBe(13);
    expect(daysUntilUsernameChange(changed, new Date('2026-10-24T00:00:00Z'))).toBe(0);
  });
});

describe('ngày sinh người dùng (F-02)', () => {
  const now = new Date('2026-10-25T18:00:00Z'); // 26/10 ở Asia/Ho_Chi_Minh
  it('nhận ngày hợp lệ tới hôm nay theo múi giờ', () => {
    expect(checkBirthDate('1990-05-20', 'Asia/Ho_Chi_Minh', now)).toBe('1990-05-20');
    expect(checkBirthDate('2026-10-26', 'Asia/Ho_Chi_Minh', now)).toBe('2026-10-26');
  });
  it('từ chối ngày tương lai, ngày không có thật, trước 1900', () => {
    expect(() => checkBirthDate('2026-10-26', 'UTC', now)).toThrow();
    expect(() => checkBirthDate('2001-02-30', 'UTC', now)).toThrow();
    expect(() => checkBirthDate('1899-12-31', 'UTC', now)).toThrow();
  });
});
