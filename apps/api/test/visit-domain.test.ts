import { describe, expect, it } from 'vitest';

import { buildVisitFields } from '../src/modules/health-records/application/visit-input.js';
import {
  decodeVisitCursor,
  encodeVisitCursor,
  normalizeVisitText,
  summarizeVisitText,
  validateVisitText,
} from '../src/modules/health-records/domain/visit.js';
import type { LocalDate } from '../src/platform/calendar/local-date.js';

const today = '2026-10-25' as LocalDate;
const codesOf = (fn: () => unknown): string[] => {
  try {
    fn();
    return [];
  } catch (error) {
    const errors = (error as { options?: { errors?: { field: string; code: string }[] } }).options
      ?.errors;
    return (errors ?? []).map((e) => `${e.field}:${e.code}`);
  }
};

describe('văn bản bản ghi khám', () => {
  it('NFC + trim, rỗng → null', () => {
    expect(normalizeVisitText('  Viêm da \n')).toBe('Viêm da');
    expect(normalizeVisitText('   ')).toBeNull();
    expect(normalizeVisitText(null)).toBeNull();
    expect(normalizeVisitText('Viêm')).toBe('Viêm');
  });

  it('2000 code point nhận, 2001 từ chối; thiếu cả triệu chứng lẫn chẩn đoán → lỗi 2 trường', () => {
    expect(
      validateVisitText({ symptoms: '🐶'.repeat(2000), diagnosis: null, prescription: null }),
    ).toEqual([]);
    expect(
      validateVisitText({ symptoms: null, diagnosis: 'x', prescription: 'y'.repeat(2001) }).map(
        (e) => `${e.field}:${e.code}`,
      ),
    ).toEqual(['prescription:TOO_LONG']);
    expect(
      validateVisitText({ symptoms: 'x'.repeat(2001), diagnosis: null, prescription: null })[0]
        ?.params,
    ).toEqual({ max: 2000 });
    expect(
      validateVisitText({ symptoms: null, diagnosis: null, prescription: 'thuốc' }).map(
        (e) => e.field,
      ),
    ).toEqual(['symptoms', 'diagnosis']);
  });

  it('rút gọn: xuống dòng → khoảng trắng, 120 code point', () => {
    expect(summarizeVisitText('Dòng 1\n\n  Dòng 2')).toBe('Dòng 1 Dòng 2');
    expect(Array.from(summarizeVisitText('á'.repeat(300)) ?? '')).toHaveLength(120);
  });
});

describe('buildVisitFields', () => {
  it('POST: ngày mặc định hôm nay; ngày tương lai và ngày sai bị từ chối', () => {
    expect(buildVisitFields({ diagnosis: ' Viêm da ' }, null, today)).toEqual({
      visitedOn: today,
      symptoms: null,
      diagnosis: 'Viêm da',
      prescription: null,
    });
    expect(
      codesOf(() => buildVisitFields({ diagnosis: 'x', visitedOn: '2026-10-26' }, null, today)),
    ).toEqual(['visitedOn:DATE_IN_FUTURE']);
    expect(
      codesOf(() => buildVisitFields({ diagnosis: 'x', visitedOn: '26/10' }, null, today)),
    ).toEqual(['visitedOn:REQUIRED']);
    expect(codesOf(() => buildVisitFields({ symptoms: '   ' }, null, today))).toEqual([
      'symptoms:SYMPTOMS_OR_DIAGNOSIS_REQUIRED',
      'diagnosis:SYMPTOMS_OR_DIAGNOSIS_REQUIRED',
    ]);
  });

  it('PATCH: gộp với bản ghi cũ; "" xóa trường; xóa cả hai trường chính → lỗi', () => {
    const current = {
      visitedOn: '2026-09-20',
      symptoms: 'Ngứa',
      diagnosis: 'Viêm da',
      prescription: null,
    };
    expect(buildVisitFields({ diagnosis: '' }, current, today)).toEqual({
      ...current,
      diagnosis: null,
    });
    expect(
      codesOf(() => buildVisitFields({ symptoms: null, diagnosis: '' }, current, today)),
    ).toHaveLength(2);
  });
});

describe('con trỏ phân trang', () => {
  it('mã hóa/giải mã giữ micro giây; con trỏ hỏng → null', () => {
    const cursor = {
      v: '2026-09-20',
      c: '2026-09-20 11:40:12.123456+00',
      i: '01a16ad1-10f9-7aff-9116-1d0779f2ea49',
    };
    expect(decodeVisitCursor(encodeVisitCursor(cursor))).toEqual(cursor);
    expect(decodeVisitCursor('khong-hop-le')).toBeNull();
    expect(decodeVisitCursor(encodeVisitCursor({ ...cursor, i: "x' OR 1=1" }))).toBeNull();
    expect(decodeVisitCursor(encodeVisitCursor({ ...cursor, c: 'now()' }))).toBeNull();
  });
});
