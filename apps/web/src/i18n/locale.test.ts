import { describe, expect, it } from 'vitest';

import { en } from './en';
import { currentLocale } from './locale';
import { vi } from './vi';

const store = (v: string | null) => ({ getItem: () => v });

describe('currentLocale', () => {
  it('mặc định tiếng Việt: không có storage, chưa chọn, giá trị lạ', () => {
    expect(currentLocale(null)).toBe('vi');
    expect(currentLocale(store(null))).toBe('vi');
    expect(currentLocale(store('fr'))).toBe('vi');
  });

  it('đã chọn en → en', () => {
    expect(currentLocale(store('en'))).toBe('en');
  });

  it('storage lỗi → vi', () => {
    expect(
      currentLocale({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe('vi');
  });
});

describe('từ điển', () => {
  const keys = (o: object, prefix = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) =>
      v && typeof v === 'object' && !Array.isArray(v)
        ? keys(v as object, `${prefix}${k}.`)
        : [`${prefix}${k}`],
    );

  it('en có đúng bộ key của vi', () => {
    expect(keys(en).sort()).toEqual(keys(vi).sort());
  });

  it('tiếng Anh dùng số ít/số nhiều', () => {
    expect(en.visits.photoCount(1)).toBe('1 photo');
    expect(en.visits.photoCount(2)).toBe('2 photos');
    expect(en.milestones.chip.overdue(1)).toBe('1 day overdue');
  });
});
