import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearDraft, readDraft, saveDraft } from './draft';

const at = { pathname: '/pets/p1/visits/new', search: '' };

// Môi trường test là Node: giả lập sessionStorage tối thiểu.
class MemoryStorage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
  dump() {
    return JSON.stringify([...this.data]);
  }
}
const sessionStorage = new MemoryStorage();
vi.stubGlobal('sessionStorage', sessionStorage);

describe('bản nháp (FLW-06)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('lưu rồi đọc đúng form; bỏ mật khẩu và giá trị không phải chuỗi/số/boolean', () => {
    saveDraft(
      'visit-create',
      { symptoms: 'Ho', currentPassword: 'bí-mật', count: 2, file: new Blob(['x']) },
      at,
    );
    expect(sessionStorage.dump()).not.toContain('bí-mật');
    expect(readDraft('visit-create', at)).toEqual({ symptoms: 'Ho', count: 2 });
    clearDraft(at);
    expect(readDraft('visit-create', at)).toBeNull();
  });

  it('sai formId hoặc JSON hỏng → null và xóa khóa', () => {
    saveDraft('visit-create', { symptoms: 'Ho' }, at);
    expect(readDraft('visit-edit', at)).toBeNull();
    expect(sessionStorage.length).toBe(0);
    sessionStorage.setItem('ph.draft./pets/p1/visits/new', '{hỏng');
    expect(readDraft('visit-create', at)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
});
