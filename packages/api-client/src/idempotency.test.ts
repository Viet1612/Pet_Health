import { afterEach, describe, expect, it } from 'vitest';

import { newIdempotencyKey } from './idempotency';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const original = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');

describe('newIdempotencyKey', () => {
  afterEach(() => {
    if (original) Object.defineProperty(crypto, 'randomUUID', original);
    else Reflect.deleteProperty(crypto, 'randomUUID');
  });

  it('trả UUID v4', () => {
    expect(newIdempotencyKey()).toMatch(UUID_V4);
  });

  it('không có crypto.randomUUID (http://IP-LAN) vẫn trả UUID v4 khác nhau', () => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(a).toMatch(UUID_V4);
    expect(b).toMatch(UUID_V4);
    expect(a).not.toBe(b);
  });
});
