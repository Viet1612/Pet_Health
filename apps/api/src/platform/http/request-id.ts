import { randomBytes } from 'node:crypto';

/** Crockford base32 (bỏ I, L, O, U). */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const REF_PATTERN = /^[0-9A-HJKMNP-TV-Z]{8}$/;

/** Mã `ref` 8 ký tự từ 40 bit ngẫu nhiên, ví dụ `7KQ2M9XD` (SAD §2.4.3). */
export function genReqId(): string {
  const bytes = randomBytes(5);
  let bits = 0n;
  for (const byte of bytes) bits = (bits << 8n) | BigInt(byte);
  let ref = '';
  for (let i = 7; i >= 0; i--) {
    ref += ALPHABET.charAt(Number((bits >> BigInt(i * 5)) & 31n));
  }
  return ref;
}
