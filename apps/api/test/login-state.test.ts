import { describe, expect, it } from 'vitest';

import { nextFailedState } from '../src/modules/identity/application/login.js';

const T0 = new Date('2026-11-01T00:00:00Z');
const plus = (min: number): Date => new Date(T0.getTime() + min * 60_000);

describe('nextFailedState (FR-AUTH-006)', () => {
  it('lần sai đầu tiên mở cửa sổ mới', () => {
    expect(nextFailedState({ failed_login_count: 0, failed_login_window_start: null }, T0)).toEqual(
      {
        failedLoginCount: 1,
        failedLoginWindowStart: T0,
        lockedUntil: null,
      },
    );
  });

  it('lần sai thứ 5 trong 15 phút → khóa 15 phút, đếm về 0', () => {
    expect(
      nextFailedState({ failed_login_count: 4, failed_login_window_start: T0 }, plus(10)),
    ).toEqual({
      failedLoginCount: 0,
      failedLoginWindowStart: null,
      lockedUntil: plus(25),
    });
  });

  it('lần sai thứ 4 vẫn chưa khóa, giữ đầu cửa sổ', () => {
    expect(
      nextFailedState({ failed_login_count: 3, failed_login_window_start: T0 }, plus(14)),
    ).toEqual({
      failedLoginCount: 4,
      failedLoginWindowStart: T0,
      lockedUntil: null,
    });
  });

  it('quá 15 phút kể từ đầu cửa sổ → cửa sổ mới, đếm lại từ 1', () => {
    expect(
      nextFailedState({ failed_login_count: 4, failed_login_window_start: T0 }, plus(15)),
    ).toEqual({
      failedLoginCount: 1,
      failedLoginWindowStart: plus(15),
      lockedUntil: null,
    });
  });
});
