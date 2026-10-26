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
  // Kích thước giả qua `size` để không cấp phát hàng chục MB trong test.
  const file = (name: string, type: string, size = 10) => {
    const f = new File([new Uint8Array(10)], name, { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  it('nhận JPG, PNG, HEIC (kể cả HEIC không có MIME)', () => {
    expect(avatarFileError(file('a.jpg', 'image/jpeg'))).toBeNull();
    expect(avatarFileError(file('a.png', 'image/png'))).toBeNull();
    expect(avatarFileError(file('IMG_1.HEIC', ''))).toBeNull();
  });

  it('từ chối > 50 MB và định dạng khác; 6 MB vẫn nhận (nén trước khi gửi)', () => {
    expect(avatarFileError(file('a.jpg', 'image/jpeg', 6 * 1024 * 1024))).toBeNull();
    expect(avatarFileError(file('a.jpg', 'image/jpeg', MAX_AVATAR_BYTES + 1))).toBe(
      'Ảnh quá lớn (tối đa 50 MB)',
    );
    expect(avatarFileError(file('a.gif', 'image/gif'))).toBe(
      'Định dạng không hỗ trợ (chỉ JPG, PNG, HEIC)',
    );
  });
});
