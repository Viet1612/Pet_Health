import { describe, expect, it } from 'vitest';

import { countChars, dateParts, formatDateTime, formatVisitDate } from './format';

describe('định dạng sổ y tế', () => {
  it('ngày, ô ngày, thời điểm theo múi giờ tài khoản', () => {
    expect(formatVisitDate('2026-09-20')).toBe('20/09/2026');
    expect(dateParts('2026-09-20')).toEqual({ day: '20', monthYear: '09/2026' });
    expect(formatDateTime('2026-09-20T11:40:00Z', 'Asia/Ho_Chi_Minh')).toBe('20/09/2026 18:40');
  });

  it('đếm ký tự theo code point sau NFC (khớp server)', () => {
    expect(countChars('Viêm')).toBe(4);
    expect(countChars('🐶🐶')).toBe(2);
  });
});
