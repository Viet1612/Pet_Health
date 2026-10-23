import { createHash, randomBytes } from 'node:crypto';

/** Token 256 bit dạng base64url (43 ký tự); DB chỉ lưu SHA-256 (SAD §4.1.1). */
export const tokenService = {
  generate(): { token: string; hash: Buffer } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hashOf(token) };
  },

  hashOf(token: string): Buffer {
    return createHash('sha256').update(token).digest();
  },
};

/** Dạng token hợp lệ: base64url 43 ký tự. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
