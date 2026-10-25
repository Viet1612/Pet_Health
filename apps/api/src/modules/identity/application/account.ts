import { DateTime } from 'luxon';

import { isSelectableTimezone } from '../../../platform/calendar/today.js';
import {
  AppError,
  ConflictError,
  UnauthenticatedError,
  ValidationError,
} from '../../../platform/errors/app-error.js';
import { EMAIL_QUEUE, emailLocale } from '../../../platform/email/jobs.js';
import { withUserTx } from '../../../platform/db/with-user-tx.js';
import { newId } from '../../../platform/ids.js';
import { RATE_LIMITS } from '../../../platform/rate-limit/rate-limiter.js';
import { enqueuePurgePrefix, userPrefix } from '../../media/index.js';
import { authTokenRepository } from '../adapters/persistence/auth-token-repository.js';
import { sessionRepository } from '../adapters/persistence/session-repository.js';
import { userRepository, type UserRow } from '../adapters/persistence/user-repository.js';
import type { IdentityDeps } from '../identity-deps.js';
import { tokenService } from './token-service.js';

export const CHANGE_EMAIL_TTL_MS = 60 * 60 * 1000;

const wrongPassword = (): AppError =>
  new AppError(401, 'WRONG_PASSWORD', 'Mật khẩu hiện tại không đúng');

async function requireUser(deps: IdentityDeps, userId: string): Promise<UserRow> {
  const user = await userRepository.findById(deps.db, userId);
  if (!user) throw new UnauthenticatedError();
  return user;
}

/**
 * Kiểm mật khẩu hiện tại cho thao tác nhạy cảm (`/me/*`). Sai → đếm vào `pwcheck:{userId}`
 * (5 lần / 15 phút; lần thứ 6 → 429) rồi `401 WRONG_PASSWORD`.
 */
async function checkPassword(deps: IdentityDeps, user: UserRow, password: string): Promise<void> {
  if (password.length <= 1024 && (await deps.hasher.verify(user.password_hash, password))) return;
  const limit = RATE_LIMITS.passwordCheck(user.id);
  await deps.rateLimiter.hit(limit.bucket, limit.limit, limit.windowSec);
  throw wrongPassword();
}

/** `GET /me`: kèm email mới đang chờ xác nhận (token CHANGE_EMAIL chưa dùng, chưa hết hạn). */
export async function getMe(
  deps: IdentityDeps,
  userId: string,
): Promise<{ user: UserRow; pendingEmail: string | null }> {
  const user = await requireUser(deps, userId);
  const token = await authTokenRepository.findActive(
    deps.db,
    userId,
    'CHANGE_EMAIL',
    deps.clock.now(),
  );
  const payload = token?.payload as { newEmail?: string } | null | undefined;
  return { user, pendingEmail: payload?.newEmail ?? null };
}

/** `PATCH /me { timezone }` (FR-AUTH-011): thông báo cũ giữ nguyên, lần đọc sau đồng bộ lại. */
export async function updateTimezone(
  deps: IdentityDeps,
  userId: string,
  timezone: string,
): Promise<UserRow> {
  if (!isSelectableTimezone(timezone)) {
    throw new ValidationError([
      { field: 'timezone', code: 'INVALID_TIMEZONE', message: 'Múi giờ không hợp lệ' },
    ]);
  }
  const now = deps.clock.now();
  return withUserTx(deps.db, userId, async (trx) => {
    const before = await userRepository.lockForUpdate(trx, userId);
    if (!before) throw new UnauthenticatedError();
    const user = await userRepository.setTimezone(trx, userId, timezone);
    if (!user) throw new UnauthenticatedError();
    // Giờ việc hằng ngày là thời điểm thật: đổi múi giờ thì quy đổi sang múi mới.
    await deps.onTimezoneChanged?.(trx, userId, before.timezone, timezone, now);
    return user;
  });
}

/**
 * `POST /me/password` (FR-AUTH-010): đúng mật khẩu hiện tại → đổi, hủy mọi phiên khác (giữ phiên
 * đang dùng) và vô hiệu liên kết đặt lại mật khẩu đang chờ.
 */
export async function changePassword(
  deps: IdentityDeps,
  userId: string,
  sessionId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const user = await requireUser(deps, userId);
  await checkPassword(deps, user, input.currentPassword);
  const hash = await deps.hasher.hash(input.newPassword);
  const now = deps.clock.now();
  await deps.db.transaction().execute(async (trx) => {
    await userRepository.setPasswordHash(trx, userId, hash);
    await sessionRepository.deleteAllForUser(trx, userId, sessionId);
    await authTokenRepository.useAll(trx, userId, 'RESET_PASSWORD', now);
  });
}

/**
 * `POST /me/email` (FR-AUTH-015): gửi liên kết 60 phút tới email mới; email tài khoản chỉ đổi khi
 * mở liên kết (`POST /auth/verify-email`).
 */
export async function requestEmailChange(
  deps: IdentityDeps,
  userId: string,
  input: { newEmail: string; password: string },
): Promise<void> {
  const user = await requireUser(deps, userId);
  if (input.newEmail === user.email) {
    throw new ValidationError([
      { field: 'newEmail', code: 'SAME_EMAIL', message: 'Email mới trùng email hiện tại' },
    ]);
  }
  const limit = RATE_LIMITS.emailChange(userId);
  await deps.rateLimiter.hit(limit.bucket, limit.limit, limit.windowSec);
  await checkPassword(deps, user, input.password);
  if (await userRepository.findByEmail(deps.db, input.newEmail)) throw emailTaken();

  const now = deps.clock.now();
  const { token, hash } = tokenService.generate();
  await deps.db.transaction().execute(async (trx) => {
    await authTokenRepository.replaceActive(trx, {
      id: newId(),
      userId,
      kind: 'CHANGE_EMAIL',
      tokenHash: hash,
      expiresAt: new Date(now.getTime() + CHANGE_EMAIL_TTL_MS),
      now,
      payload: { newEmail: input.newEmail },
    });
    await deps.jobQueue.enqueue(trx, EMAIL_QUEUE, {
      template: 'CHANGE_EMAIL',
      to: input.newEmail,
      token,
      locale: emailLocale(user.locale),
    });
  });
}

export const emailTaken = (): ConflictError =>
  new ConflictError('EMAIL_TAKEN', 'Email đã được sử dụng', {
    errors: [{ field: 'newEmail', code: 'EMAIL_TAKEN', message: 'Email đã được sử dụng' }],
  });

/** Thời điểm hiển thị trong thư thông báo, theo múi giờ tài khoản. */
export const noticeTime = (now: Date, timezone: string, locale: string): string =>
  DateTime.fromJSDate(now, { zone: timezone }).toFormat(
    locale === 'en' ? 'LLL d, yyyy, h:mm a' : 'dd/MM/yyyy HH:mm',
  );

/**
 * `DELETE /me` (FR-AUTH-016, SAD §3.2.3): xóa user, FK cascade xóa mọi dữ liệu; cùng transaction
 * gửi `media.purge-prefix` cho `u/{userId}/`.
 */
export async function deleteAccount(
  deps: IdentityDeps,
  userId: string,
  password: string,
): Promise<void> {
  const user = await requireUser(deps, userId);
  await checkPassword(deps, user, password);
  await deps.db.transaction().execute(async (trx) => {
    await userRepository.delete(trx, userId);
    await enqueuePurgePrefix(deps.jobQueue, trx, userPrefix(userId));
  });
}
