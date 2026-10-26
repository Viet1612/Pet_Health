import { describe, expect, it } from 'vitest';

import { dismissUpload, enqueuePhotos, getUploads, photoFileError } from './upload-store';

describe('kho tải ảnh', () => {
  // Kích thước giả qua `size` để không cấp phát hàng chục MB trong test.
  const file = (name: string, type: string, size = 10) => {
    const f = new File([new Uint8Array(10)], name, { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  it('kiểm định dạng và dung lượng', () => {
    expect(photoFileError(file('a.jpg', 'image/jpeg'))).toBeNull();
    expect(photoFileError(file('IMG.HEIC', ''))).toBeNull();
    expect(photoFileError(file('a.pdf', 'application/pdf'))).toBe(
      'Định dạng không hỗ trợ (chỉ JPG, PNG, HEIC)',
    );
    // Trên 5 MB vẫn nhận (nén trước khi gửi); trên 50 MB thì từ chối.
    expect(photoFileError(file('a.jpg', 'image/jpeg', 8_000_000))).toBeNull();
    expect(photoFileError(file('a.jpg', 'image/jpeg', 52_428_801))).toBe(
      'Ảnh quá lớn (tối đa 50 MB)',
    );
  });

  it('tệp sai và tệp vượt 5 ảnh bị từ chối riêng, tệp hợp lệ vẫn vào hàng đợi', () => {
    // Đã có 3 ảnh trên server → chỉ còn 2 chỗ.
    enqueuePhotos(
      'visit-1',
      [file('1.heic', ''), file('x.gif', 'image/gif'), file('2.heic', ''), file('3.heic', '')],
      3,
    );
    const items = getUploads().filter((i) => i.visitId === 'visit-1');
    expect(items.map((i) => [i.file.name, i.state === 'rejected' ? i.error : 'ok'])).toEqual([
      ['1.heic', 'ok'],
      ['x.gif', 'Định dạng không hỗ trợ (chỉ JPG, PNG, HEIC)'],
      ['2.heic', 'ok'],
      ['3.heic', 'Tối đa 5 ảnh mỗi lần khám'],
    ]);
    for (const i of items) dismissUpload(i.localId);
  });
});
