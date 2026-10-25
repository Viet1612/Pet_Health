import { describe, expect, it } from 'vitest';

import { addPhotos, movePhoto, togglePet } from './composer';

const jpg = (name: string, size = 1000) =>
  new File([new Uint8Array(size)], name, { type: 'image/jpeg' });
let n = 0;
const id = () => String((n += 1));

describe('soạn bài (F-05)', () => {
  it('chọn 6 ảnh → nhận 5, báo vượt giới hạn', () => {
    const files = Array.from({ length: 6 }, (_, i) => jpg(`${String(i)}.jpg`));
    const r = addPhotos([], files, id);
    expect(r.photos).toHaveLength(5);
    expect(r.overLimit).toBe(true);
  });

  it('bỏ tệp sai định dạng hoặc quá 5 MB, giữ tệp hợp lệ', () => {
    const r = addPhotos(
      [],
      [new File(['x'], 'a.gif', { type: 'image/gif' }), jpg('big.jpg', 6_000_000), jpg('ok.jpg')],
      id,
    );
    expect(r.photos.map((p) => p.file.name)).toEqual(['ok.jpg']);
    expect(r.error).not.toBeNull();
    expect(r.overLimit).toBe(false);
  });

  it('đổi thứ tự ảnh; ra ngoài biên giữ nguyên', () => {
    expect(movePhoto(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(movePhoto(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(movePhoto(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(movePhoto(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });

  it('gắn tối đa 5 bé; bấm lại thì bỏ gắn', () => {
    const five = ['1', '2', '3', '4', '5'];
    expect(togglePet(five, '6')).toEqual(five);
    expect(togglePet(five, '3')).toEqual(['1', '2', '4', '5']);
    expect(togglePet([], '1')).toEqual(['1']);
  });
});
