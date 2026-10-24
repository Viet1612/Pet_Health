import { describe, expect, it } from 'vitest';

import {
  validateMilestonePatch,
  validateNewMilestone,
} from '../src/modules/scheduling/domain/milestone.js';

const codesOf = (r: { ok: boolean; errors?: { field: string; code: string }[] }) =>
  r.ok ? [] : (r.errors ?? []).map((e) => `${e.field}:${e.code}`);

describe('validateNewMilestone', () => {
  it('nhận vaccine không chu kỳ, ghi chú trim; hạn quá khứ được phép', () => {
    expect(validateNewMilestone({ type: 'VACCINE', dueOn: '2026-11-15', note: '  Dại ' })).toEqual({
      ok: true,
      value: { type: 'VACCINE', dueOn: '2026-11-15', note: 'Dại', cycleMonths: null },
    });
    expect(validateNewMilestone({ type: 'FLEA', dueOn: '2020-01-01', note: '   ' }).ok).toBe(true);
  });

  it('chu kỳ FLEA/DEWORM 1–60; 0, 61, 1,5 bị từ chối; vaccine kèm chu kỳ bị từ chối', () => {
    expect(validateNewMilestone({ type: 'FLEA', dueOn: '2026-11-15', cycleMonths: 1 }).ok).toBe(
      true,
    );
    expect(validateNewMilestone({ type: 'DEWORM', dueOn: '2026-11-15', cycleMonths: 60 }).ok).toBe(
      true,
    );
    for (const bad of [0, 61, 1.5]) {
      expect(
        codesOf(validateNewMilestone({ type: 'FLEA', dueOn: '2026-11-15', cycleMonths: bad })),
      ).toEqual(['cycleMonths:OUT_OF_RANGE']);
    }
    expect(
      codesOf(validateNewMilestone({ type: 'VACCINE', dueOn: '2026-11-15', cycleMonths: 12 })),
    ).toEqual(['cycleMonths:NOT_ALLOWED_FOR_VACCINE']);
  });

  it('loại sai, ngày sai, ghi chú 501 ký tự', () => {
    expect(
      codesOf(validateNewMilestone({ type: 'BATH', dueOn: '2026-02-30', note: 'x'.repeat(501) })),
    ).toEqual(['type:INVALID_ENUM', 'dueOn:INVALID_DATE', 'note:TOO_LONG']);
  });
});

describe('validateMilestonePatch', () => {
  it('chỉ kiểm trường có mặt; cycleMonths null bỏ tự lặp', () => {
    expect(validateMilestonePatch('FLEA', { cycleMonths: null })).toEqual({
      ok: true,
      value: { cycleMonths: null },
    });
    expect(validateMilestonePatch('FLEA', { note: '' })).toEqual({
      ok: true,
      value: { note: null },
    });
    expect(codesOf(validateMilestonePatch('VACCINE', { cycleMonths: 6 }))).toEqual([
      'cycleMonths:NOT_ALLOWED_FOR_VACCINE',
    ]);
  });
});
