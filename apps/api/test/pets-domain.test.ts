import { describe, expect, it } from 'vitest';

import { createPet } from '../src/modules/pets/application/create-pet.js';
import type { PetRepository, PetRow } from '../src/modules/pets/application/ports.js';
import { matchesConfirmName } from '../src/modules/pets/domain/confirm-name.js';
import { validatePetInput } from '../src/modules/pets/domain/pet.js';
import type { LocalDate } from '../src/platform/calendar/local-date.js';
import { FakeClock } from '../src/platform/clock/clock.js';
import { AppError } from '../src/platform/errors/app-error.js';

const TODAY = '2026-10-22' as LocalDate;
const valid = { name: 'Mochi', breed: 'Poodle', sex: 'FEMALE', birthDate: '2019-03-15' };
const codesOf = (
  raw: Parameters<typeof validatePetInput>[0],
  mode: 'create' | 'patch' = 'create',
) => {
  const r =
    mode === 'create'
      ? validatePetInput(raw, TODAY, 'create')
      : validatePetInput(raw, TODAY, 'patch');
  return r.ok ? [] : r.errors.map((e) => `${e.field}:${e.code}`);
};

describe('validatePetInput', () => {
  it('nhận dữ liệu hợp lệ, trim tên, mô tả rỗng thành null', () => {
    const r = validatePetInput(
      { ...valid, name: '  Mochi  ', description: '   ' },
      TODAY,
      'create',
    );
    expect(r).toEqual({
      ok: true,
      value: { ...valid, name: 'Mochi', description: null },
    });
  });

  it('thiếu trường bắt buộc khi tạo', () => {
    expect(codesOf({})).toEqual([
      'name:REQUIRED',
      'breed:REQUIRED',
      'sex:REQUIRED',
      'birthDate:REQUIRED',
    ]);
  });

  it('độ dài tên theo code point: 1 và 50 nhận, 0/"   "/51 từ chối, emoji 50 nhận', () => {
    expect(codesOf({ ...valid, name: 'a' })).toEqual([]);
    expect(codesOf({ ...valid, name: 'a'.repeat(50) })).toEqual([]);
    expect(codesOf({ ...valid, name: '🐶'.repeat(50) })).toEqual([]);
    expect(codesOf({ ...valid, name: '' })).toEqual(['name:REQUIRED']);
    expect(codesOf({ ...valid, name: '   ' })).toEqual(['name:REQUIRED']);
    expect(codesOf({ ...valid, name: 'a'.repeat(51) })).toEqual(['name:TOO_LONG']);
  });

  it('sex và ngày sinh', () => {
    expect(codesOf({ ...valid, sex: 'OTHER' })).toEqual(['sex:INVALID_ENUM']);
    expect(codesOf({ ...valid, birthDate: TODAY })).toEqual([]);
    expect(codesOf({ ...valid, birthDate: '2026-10-23' })).toEqual(['birthDate:FUTURE_DATE']);
    expect(codesOf({ ...valid, birthDate: '2026-02-30' })).toEqual(['birthDate:INVALID_DATE']);
    expect(codesOf({ ...valid, birthDate: '15/03/2019' })).toEqual(['birthDate:INVALID_DATE']);
  });

  it('mô tả 2000 nhận, 2001 từ chối', () => {
    expect(codesOf({ ...valid, description: 'x'.repeat(2000) })).toEqual([]);
    expect(codesOf({ ...valid, description: 'x'.repeat(2001) })).toEqual(['description:TOO_LONG']);
  });

  it('patch chỉ kiểm trường có mặt', () => {
    expect(codesOf({ breed: 'Corgi' }, 'patch')).toEqual([]);
    expect(codesOf({ name: '  ' }, 'patch')).toEqual(['name:REQUIRED']);
  });
});

describe('createPet theo múi giờ tài khoản', () => {
  // 2026-10-22T17:30Z = 00:30 ngày 23/10 giờ Việt Nam.
  const now = new Date('2026-10-22T17:30:00Z');

  function deps(timezone: string, count = 0) {
    const clock = new FakeClock();
    clock.set(now, { frozen: true });
    const pets: PetRepository = {
      lockOwnerTimezone: () => Promise.resolve(timezone),
      ownerTimezone: () => Promise.resolve(timezone),
      countByOwner: () => Promise.resolve(count),
      listByOwner: () => Promise.resolve([]),
      findById: () => Promise.resolve(undefined),
      insert: (_trx, p) =>
        Promise.resolve({
          id: p.id,
          owner_id: p.ownerId,
          name: p.name,
          breed: p.breed,
          sex: p.sex,
          birth_date: p.birthDate,
          description: p.description,
          avatar_key: null,
          weight_target_kg: null,
          created_at: p.now,
          updated_at: p.now,
        } satisfies PetRow),
      update: () => Promise.resolve(undefined),
      lockAvatarKey: () => Promise.resolve(undefined),
      setAvatarKey: () => Promise.resolve(undefined),
      lockForDelete: () => Promise.resolve(undefined),
      setWeightTarget: () => Promise.resolve(false),
      delete: () => Promise.resolve(),
    };
    return { clock, pets };
  }
  const trx = {} as never;
  const input = { ...valid, birthDate: '2026-10-23' };

  it('Asia/Ho_Chi_Minh: ngày 23/10 là hôm nay → nhận, tuổi 0 tháng', async () => {
    const pet = await createPet(deps('Asia/Ho_Chi_Minh'), trx, 'u1', input);
    expect(pet.ageText).toBe('0 tháng');
  });

  it('UTC: ngày 23/10 ở tương lai → FUTURE_DATE', async () => {
    await expect(createPet(deps('UTC'), trx, 'u1', input)).rejects.toMatchObject({
      status: 422,
      options: { errors: [{ field: 'birthDate', code: 'FUTURE_DATE' }] },
    });
  });

  it('đã có 10 con → 409 PET_LIMIT_REACHED', async () => {
    const err: unknown = await createPet(deps('UTC', 10), trx, 'u1', valid).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ status: 409, code: 'PET_LIMIT_REACHED' });
  });
});

describe('matchesConfirmName', () => {
  it('bỏ khoảng trắng đầu/cuối, không phân biệt hoa thường, giữ dấu', () => {
    expect(matchesConfirmName('  mochi ', 'Mochi')).toBe(true);
    expect(matchesConfirmName('MÍT', 'mít')).toBe(true);
    expect(matchesConfirmName('mit', 'Mít')).toBe(false);
    // NFD (dấu tách rời) vẫn khớp NFC.
    expect(matchesConfirmName('Mít', 'Mít')).toBe(true);
    expect(matchesConfirmName('Mochi 2', 'Mochi')).toBe(false);
  });
});
