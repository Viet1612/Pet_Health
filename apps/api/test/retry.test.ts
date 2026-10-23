import { describe, expect, it, vi } from 'vitest';

import { withRetryOnConflict } from '../src/platform/db/retry.js';

const pgError = (code: string): Error => Object.assign(new Error(code), { code });

describe('withRetryOnConflict', () => {
  it.each(['40001', '40P01'])('thử lại đúng 1 lần khi lỗi %s', async (code) => {
    const fn = vi.fn().mockRejectedValueOnce(pgError(code)).mockResolvedValueOnce('ok');
    await expect(withRetryOnConflict(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('lần thử lại cũng lỗi thì ném lỗi, không thử lần 3', async () => {
    const fn = vi.fn().mockRejectedValue(pgError('40001'));
    await expect(withRetryOnConflict(fn)).rejects.toThrow('40001');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('không thử lại lỗi khác', async () => {
    const fn = vi.fn().mockRejectedValue(pgError('23505'));
    await expect(withRetryOnConflict(fn)).rejects.toThrow('23505');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
