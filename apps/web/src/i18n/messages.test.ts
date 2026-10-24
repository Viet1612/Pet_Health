import { ApiError } from '@ph/api-client';
import { describe, expect, it } from 'vitest';

import { fieldErrorText, problemText, toUserMessage } from '../api/to-user-message';
import { en } from './en';
import { vi } from './vi';

describe('tuổi và nhãn nhắc (S4-08)', () => {
  it('m.pets.age cả 2 ngôn ngữ', () => {
    expect([0, 1, 12, 13, 91].map(vi.pets.age)).toEqual([
      '0 tháng',
      '1 tháng',
      '1 năm 0 tháng',
      '1 năm 1 tháng',
      '7 năm 7 tháng',
    ]);
    expect([0, 1, 12, 13, 91].map(en.pets.age)).toEqual([
      '0 months',
      '1 month',
      '1 year',
      '1 year 1 month',
      '7 years 7 months',
    ]);
  });

  it('m.notifications.label cả 2 ngôn ngữ', () => {
    expect([-3, -1, 0, 1, 7].map(vi.notifications.label)).toEqual([
      'quá hạn 3 ngày',
      'quá hạn 1 ngày',
      'hôm nay',
      'ngày mai',
      'còn 7 ngày',
    ]);
    expect([-3, -1, 0, 1, 7].map(en.notifications.label)).toEqual([
      '3 days overdue',
      '1 day overdue',
      'today',
      'tomorrow',
      'in 7 days',
    ]);
  });
});

describe('lỗi API theo mã', () => {
  it('en dịch theo mã + params', () => {
    expect(en.apiErrors.field('TOO_LONG', 'note', { max: 2000 })).toBe('At most 2,000 characters');
    expect(en.apiErrors.field('FUTURE_DATE', 'birthDate')).toBe(
      'Date of birth cannot be in the future',
    );
    expect(en.apiErrors.field('OUT_OF_RANGE', 'weightKg', { min: 0.1, max: 150 })).toMatch(
      /^Weight must be 0\.1 to 150 kg/,
    );
    expect(en.apiErrors.field('SOMETHING_NEW', 'x')).toBeNull();
    expect(en.apiErrors.problem.PET_LIMIT_REACHED).toBe('You have reached the limit of 10 pets');
  });

  it('vi (đang dùng trong test) giữ thông điệp server; mã lạ cũng dùng thông điệp server', () => {
    const problem = {
      type: 't',
      title: 'Đã đạt tối đa 10 thú cưng',
      status: 409,
      code: 'PET_LIMIT_REACHED',
    };
    expect(problemText(problem)).toBe('Đã đạt tối đa 10 thú cưng');
    expect(
      fieldErrorText({
        field: 'note',
        code: 'TOO_LONG',
        message: 'Tối đa 500 ký tự',
        params: { max: 500 },
      }),
    ).toBe('Tối đa 500 ký tự');
    const fields = toUserMessage(
      new ApiError({
        type: 't',
        title: 'Dữ liệu không hợp lệ',
        status: 422,
        code: 'VALIDATION_FAILED',
        errors: [{ field: 'x', code: 'NEW_CODE', message: 'Thông điệp server' }],
      }),
    );
    expect(fields).toEqual({ kind: 'fields', fields: { x: 'Thông điệp server' } });
  });
});
