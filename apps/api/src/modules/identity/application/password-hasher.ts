import { randomBytes } from 'node:crypto';

import { hash, verify, type Algorithm } from '@node-rs/argon2';

// `Algorithm` là const enum (không dùng được với verbatimModuleSyntax): Argon2id = 2.
// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- giá trị Argon2id của thư viện
const ARGON2ID = 2 as Algorithm;

/** Argon2id m = 19 MiB, t = 2, p = 1 (NFR-SEC-001, SAD §4.1.1). */
const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export class PasswordHasher {
  private dummyHash: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  /**
   * Chạy verify trên một hash giả để thời gian phản hồi của "email không tồn tại" bằng "sai mật
   * khẩu" (FR-AUTH-005). Hash giả tạo một lần, lần đầu cần.
   */
  async verifyDummy(password: string): Promise<void> {
    this.dummyHash ??= this.hash(randomBytes(16).toString('hex'));
    await this.verify(await this.dummyHash, password);
  }
}
