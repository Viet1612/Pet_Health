import { UnauthenticatedError } from '../../../platform/errors/app-error.js';
import { EMAIL_QUEUE, emailLocale, maskEmail } from '../../../platform/email/jobs.js';
import { newId } from '../../../platform/ids.js';
import { RATE_LIMITS } from '../../../platform/rate-limit/rate-limiter.js';
import { authTokenRepository } from '../adapters/persistence/auth-token-repository.js';
import { userRepository, type UserRow } from '../adapters/persistence/user-repository.js';
import type { IdentityDeps } from '../identity-deps.js';
import { emailTaken, noticeTime } from './account.js';
import { consumeToken, findUsableTokenOf, tokenUsed } from './email-token.js';
import { VERIFY_TOKEN_TTL_MS } from './register-user.js';
import { tokenService } from './token-service.js';

/** Lỗi unique của PostgreSQL (email đã có user khác). */
const isUniqueViolation = (error: unknown): boolean =>
  (error as { code?: string } | null)?.code === '23505';

/**
 * Xác minh email (US-002, FR-AUTH-004) hoặc xác nhận email mới (FR-AUTH-015). Không cần phiên:
 * liên kết có thể mở trên thiết bị chưa đăng nhập. Không tạo phiên.
 */
export async function verifyEmail(
  deps: IdentityDeps,
  token: string,
): Promise<{ user: UserRow; purpose: 'VERIFY_EMAIL' | 'CHANGE_EMAIL' }> {
  const now = deps.clock.now();
  const row = await findUsableTokenOf(deps.db, token, ['VERIFY_EMAIL', 'CHANGE_EMAIL'], now);
  if (row.kind === 'VERIFY_EMAIL') {
    return deps.db.transaction().execute(async (trx) => {
      await consumeToken(trx, row, now);
      const user = await userRepository.markEmailVerified(trx, row.user_id, now);
      if (!user) throw tokenUsed();
      await deps.analytics?.track(
        trx,
        'email_verified',
        {
          hours_since_signup: Math.max(
            0,
            Math.floor((now.getTime() - user.created_at.getTime()) / 3_600_000),
          ),
        },
        user.id,
      );
      return { user, purpose: 'VERIFY_EMAIL' as const };
    });
  }

  const newEmail = (row.payload as { newEmail?: string } | null)?.newEmail;
  if (!newEmail) throw tokenUsed();
  try {
    return await deps.db.transaction().execute(async (trx) => {
      await consumeToken(trx, row, now);
      const before = await userRepository.lockForUpdate(trx, row.user_id);
      if (!before) throw tokenUsed();
      const taken = await userRepository.findByEmail(trx, newEmail);
      if (taken && taken.id !== before.id) throw emailTaken();
      const user = await userRepository.setVerifiedEmail(trx, row.user_id, newEmail, now);
      if (!user) throw tokenUsed();
      // Thư tới email cũ: lớp phát hiện khi người khác đổi email (không xác nhận lại email cũ).
      await deps.jobQueue.enqueue(trx, EMAIL_QUEUE, {
        template: 'EMAIL_CHANGED_NOTICE',
        to: before.email,
        maskedNewEmail: maskEmail(newEmail),
        at: noticeTime(now, before.timezone, before.locale),
        locale: emailLocale(before.locale),
      });
      return { user, purpose: 'CHANGE_EMAIL' as const };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw emailTaken();
    throw error;
  }
}

/**
 * Gửi lại email xác minh (FR-AUTH-003): tối đa 5 lần/giờ; token cũ bị thay nên liên kết cũ hết
 * hiệu lực. Đã xác minh thì không làm gì (giao diện không phân biệt).
 */
export async function resendVerification(deps: IdentityDeps, userId: string): Promise<void> {
  const limit = RATE_LIMITS.verifyResend(userId);
  await deps.rateLimiter.hit(limit.bucket, limit.limit, limit.windowSec);

  const user = await userRepository.findById(deps.db, userId);
  if (!user) throw new UnauthenticatedError();
  if (user.email_verified_at) return;

  const now = deps.clock.now();
  const { token, hash } = tokenService.generate();
  await deps.db.transaction().execute(async (trx) => {
    await authTokenRepository.replaceActive(trx, {
      id: newId(),
      userId,
      kind: 'VERIFY_EMAIL',
      tokenHash: hash,
      expiresAt: new Date(now.getTime() + VERIFY_TOKEN_TTL_MS),
      now,
    });
    await deps.jobQueue.enqueue(trx, EMAIL_QUEUE, {
      template: 'VERIFY_EMAIL',
      to: user.email,
      token,
      locale: emailLocale(user.locale),
    });
  });
}
