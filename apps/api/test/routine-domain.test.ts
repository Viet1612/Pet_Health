import { describe, expect, it } from 'vitest';

import {
  toHHMM,
  validateNewRoutine,
  validateRoutinePatch,
} from '../src/modules/routines/domain/routine.js';

const codesOf = (raw: { name: string; timeOfDay: string }) => {
  const r = validateNewRoutine(raw);
  return r.ok ? [] : r.errors.map((e) => `${e.field}:${e.code}`);
};

describe('validateNewRoutine', () => {
  it('tên: rỗng, khoảng trắng, 1, 100, 101 ký tự', () => {
    expect(codesOf({ name: '', timeOfDay: '07:00' })).toEqual(['name:REQUIRED']);
    expect(codesOf({ name: '   ', timeOfDay: '07:00' })).toEqual(['name:REQUIRED']);
    expect(codesOf({ name: 'a', timeOfDay: '07:00' })).toEqual([]);
    expect(codesOf({ name: '🐶'.repeat(100), timeOfDay: '07:00' })).toEqual([]);
    expect(codesOf({ name: 'a'.repeat(101), timeOfDay: '07:00' })).toEqual(['name:TOO_LONG']);
  });

  it('giờ: 00:00, 23:59 nhận; 24:00, 7:00, 07:60, 07:00:00 từ chối', () => {
    for (const ok of ['00:00', '23:59']) expect(codesOf({ name: 'x', timeOfDay: ok })).toEqual([]);
    for (const bad of ['24:00', '7:00', '07:60', '07:00:00']) {
      expect(codesOf({ name: 'x', timeOfDay: bad })).toEqual(['timeOfDay:INVALID_FORMAT']);
    }
  });

  it('trim tên và báo cả hai lỗi một lúc', () => {
    expect(validateNewRoutine({ name: '  Cho ăn  ', timeOfDay: '07:00' })).toEqual({
      ok: true,
      value: { name: 'Cho ăn', timeOfDay: '07:00' },
    });
    expect(codesOf({ name: '', timeOfDay: '7h' })).toEqual([
      'name:REQUIRED',
      'timeOfDay:INVALID_FORMAT',
    ]);
  });
});

describe('validateRoutinePatch', () => {
  it('chỉ kiểm trường có mặt', () => {
    expect(validateRoutinePatch({ timeOfDay: '18:30' })).toEqual({
      ok: true,
      value: { timeOfDay: '18:30' },
    });
    expect(validateRoutinePatch({ name: ' ' }).ok).toBe(false);
  });
});

it('toHHMM cắt giây của kiểu time', () => {
  expect(toHHMM('07:05:00')).toBe('07:05');
});
