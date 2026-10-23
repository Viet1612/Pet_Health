import { describe, expect, it } from 'vitest';

import { formatLocalDate, initialOf } from './format';
import { avatarFileError, MAX_AVATAR_BYTES } from './upload-avatar';

describe('initialOf', () => {
  it('lấy grapheme đầu, viết hoa, giữ dấu tiếng Việt', () => {
    expect(initialOf('mochi')).toBe('M');
    expect(initialOf('ếch')).toBe('Ế');
    expect(initialOf('  Đậu  ')).toBe('Đ');
    expect(initialOf('🐶 Lu')).toBe('🐶');
  });
});

describe('formatLocalDate', () => {
  it('YYYY-MM-DD → DD/MM/YYYY', () => {
    expect(formatLocalDate('2019-03-15')).toBe('15/03/2019');
  });
});

describe('avatarFileError', () => {
  const file = (name: string, type: string, size = 10) =>
    new File([new Uint8Array(size)], name, { type });

  it('nhận JPG, PNG, HEIC (kể cả HEIC không có MIME)', () => {
    expect(avatarFileError(file('a.jpg', 'image/jpeg'))).toBeNull();
    expect(avatarFileError(file('a.png', 'image/png'))).toBeNull();
    expect(avatarFileError(file('IMG_1.HEIC', ''))).toBeNull();
  });

  it('từ chối > 5 MB và định dạng khác', () => {
    expect(avatarFileError(file('a.jpg', 'image/jpeg', MAX_AVATAR_BYTES + 1))).toBe(
      'Ảnh vượt 5 MB',
    );
    expect(avatarFileError(file('a.gif', 'image/gif'))).toBe(
      'Định dạng không hỗ trợ (chỉ JPG, PNG, HEIC)',
    );
  });
});
