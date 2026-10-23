import { AppError } from '../../../platform/errors/app-error.js';
import { userRepository, type UserRow } from '../adapters/persistence/user-repository.js';
import type { IdentityDeps } from '../identity-deps.js';
import { createSession, type CreatedSession } from './session-service.js';

/** FR-AUTH-006: 5 lần sai liên tiếp trong 15 phút → khóa 15 phút. */
export const MAX_FAILED_LOGINS = 5;
export const FAILED_WINDOW_MS = 15 * 60 * 1000;
export const LOCK_MS = 15 * 60 * 1000;
const MAX_PASSWORD_LENGTH = 128;

export const invalidCredentials = (): AppError =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');

/** Trạng thái đếm sai sau một lần đăng nhập sai (hàm thuần, dễ test). */
export function nextFailedState(
  user: Pick<UserRow, 'failed_login_count' | 'failed_login_window_start'>,
  now: Date,
): { failedLoginCount: number; failedLoginWindowStart: Date | null; lockedUntil: Date | null } {
  const windowStart = user.failed_login_window_start;
  const freshWindow = !windowStart || now.getTime() - windowStart.getTime() >= FAILED_WINDOW_MS;
  const count = freshWindow ? 1 : user.failed_login_count + 1;
  if (count >= MAX_FAILED_LOGINS) {
    return {
      failedLoginCount: 0,
      failedLoginWindowStart: null,
      lockedUntil: new Date(now.getTime() + LOCK_MS),
    };
  }
  return {
    failedLoginCount: count,
    failedLoginWindowStart: freshWindow ? now : windowStart,
    lockedUntil: null,
  };
}

/**
 * Đăng nhập (US-003, FR-AUTH-005/006). Mọi nhánh đều chạy Argon2 để thời gian phản hồi như nhau;
 * một thông điệp chung cho sai email và sai mật khẩu.
 */
export async function login(
  deps: IdentityDeps,
  input: { email: string; password: string },
): Promise<{ user: UserRow; session: CreatedSession }> {
  const now = deps.clock.now();
  const user = await userRepository.findByEmail(deps.db, input.email);
  const tooLong = Array.from(input.password).length > MAX_PASSWORD_LENGTH;

  if (!user) {
    await deps.hasher.verifyDummy(tooLong ? '' : input.password);
    throw invalidCredentials();
  }

  if (user.locked_until && user.locked_until > now) {
    await deps.hasher.verifyDummy(tooLong ? '' : input.password);
    const retryAfter = Math.ceil((user.locked_until.getTime() - now.getTime()) / 1000);
    throw new AppError(423, 'ACCOUNT_LOCKED', 'Tài khoản tạm khóa do đăng nhập sai nhiều lần', {
      retryAfter,
    });
  }

  const ok = !tooLong && (await deps.hasher.verify(user.password_hash, input.password));

  if (!ok) {
    await deps.db.transaction().execute(async (trx) => {
      const locked = await userRepository.lockForUpdate(trx, user.id);
      if (!locked) return;
      await userRepository.updateLoginState(trx, user.id, nextFailedState(locked, now));
    });
    throw invalidCredentials();
  }

  return deps.db.transaction().execute(async (trx) => {
    await userRepository.updateLoginState(trx, user.id, {
      failedLoginCount: 0,
      failedLoginWindowStart: null,
      lockedUntil: null,
    });
    const session = await createSession(trx, user.id, now);
    return { user, session };
  });
}
