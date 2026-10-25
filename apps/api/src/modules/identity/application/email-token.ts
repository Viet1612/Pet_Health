import type { Kysely, Transaction } from 'kysely';

import type { Database } from '../../../platform/db/kysely.js';
import { AppError } from '../../../platform/errors/app-error.js';
import {
  authTokenRepository,
  type AuthTokenKind,
  type AuthTokenRow,
} from '../adapters/persistence/auth-token-repository.js';
import { TOKEN_PATTERN, tokenService } from './token-service.js';

export const tokenInvalid = (): AppError =>
  new AppError(400, 'TOKEN_INVALID', 'Liên kết không hợp lệ');
export const tokenExpired = (): AppError =>
  new AppError(410, 'TOKEN_EXPIRED', 'Liên kết đã hết hạn');
export const tokenUsed = (): AppError =>
  new AppError(410, 'TOKEN_USED', 'Liên kết đã được sử dụng');

/**
 * Tìm và kiểm token trong liên kết email (S1-05, S1-06). Thứ tự: sai dạng / không có / sai loại →
 * 400 TOKEN_INVALID; đã dùng → 410 TOKEN_USED (trước hết hạn); hết hạn → 410 TOKEN_EXPIRED.
 */
export async function findUsableToken(
  q: Kysely<Database>,
  token: string,
  kind: AuthTokenKind,
  now: Date,
): Promise<AuthTokenRow> {
  if (!TOKEN_PATTERN.test(token)) throw tokenInvalid();
  const row = await authTokenRepository.findByHash(q, tokenService.hashOf(token));
  if (row?.kind !== kind) throw tokenInvalid();
  if (row.used_at) throw tokenUsed();
  if (row.expires_at <= now) throw tokenExpired();
  return row;
}

/** Như `findUsableToken` nhưng nhận một trong nhiều loại (xác minh email + đổi email, S6-01). */
export async function findUsableTokenOf(
  q: Kysely<Database>,
  token: string,
  kinds: readonly AuthTokenKind[],
  now: Date,
): Promise<AuthTokenRow> {
  if (!TOKEN_PATTERN.test(token)) throw tokenInvalid();
  const row = await authTokenRepository.findByHash(q, tokenService.hashOf(token));
  if (!row || !kinds.includes(row.kind as AuthTokenKind)) throw tokenInvalid();
  if (row.used_at) throw tokenUsed();
  if (row.expires_at <= now) throw tokenExpired();
  return row;
}

/** Đánh dấu token đã dùng; bị request song song dùng trước → 410 TOKEN_USED. */
export async function consumeToken(
  trx: Transaction<Database>,
  row: AuthTokenRow,
  now: Date,
): Promise<void> {
  if (!(await authTokenRepository.consume(trx, row.id, now))) throw tokenUsed();
}
