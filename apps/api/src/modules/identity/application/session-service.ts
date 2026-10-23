import { randomBytes } from 'node:crypto';

import type { Kysely, Transaction } from 'kysely';

import type { Database } from '../../../platform/db/kysely.js';
import { newId } from '../../../platform/ids.js';
import { sessionRepository } from '../adapters/persistence/session-repository.js';
import { tokenService } from './token-service.js';

/** Phiên hết hạn sau 30 ngày không hoạt động (FR-AUTH-012, SD-003). */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Gia hạn trượt: cập nhật `last_seen_at` tối đa mỗi 5 phút. */
export const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface CreatedSession {
  sessionId: string;
  /** Token gốc cho cookie; DB chỉ lưu SHA-256. */
  token: string;
  csrfToken: string;
}

export function csrfTokenOf(csrfSecret: Buffer): string {
  return csrfSecret.toString('base64url');
}

/** Tạo phiên web opaque (AD-010): token 256 bit, CSRF secret 256 bit. */
export async function createSession(
  q: Kysely<Database> | Transaction<Database>,
  userId: string,
  now: Date,
): Promise<CreatedSession> {
  const { token, hash } = tokenService.generate();
  const csrfSecret = randomBytes(32);
  const sessionId = newId();
  await sessionRepository.insert(q, {
    id: sessionId,
    userId,
    tokenHash: hash,
    csrfSecret,
    now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  });
  return { sessionId, token, csrfToken: csrfTokenOf(csrfSecret) };
}
