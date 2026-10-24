import { UnauthenticatedError } from '../../../platform/errors/app-error.js';
import { EMAIL_QUEUE, emailLocale } from '../../../platform/email/jobs.js';
import { newId } from '../../../platform/ids.js';
import { RATE_LIMITS } from '../../../platform/rate-limit/rate-limiter.js';
import { authTokenRepository } from '../adapters/persistence/auth-token-repository.js';
import { userRepository, type UserRow } from '../adapters/persistence/user-repository.js';
import type { IdentityDeps } from '../identity-deps.js';
import { consumeToken, findUsableToken, tokenUsed } from './email-token.js';
import { VERIFY_TOKEN_TTL_MS } from './register-user.js';
import { tokenService } from './token-service.js';

/**
 * Xác minh email (US-002, FR-AUTH-004). Không cần phiên: liên kết có thể mở trên thiết bị chưa
 * đăng nhập. Không tạo phiên.
 */
export async function verifyEmail(deps: IdentityDeps, token: string): Promise<UserRow> {
  const now = deps.clock.now();
  const row = await findUsableToken(deps.db, token, 'VERIFY_EMAIL', now);
  return deps.db.transaction().execute(async (trx) => {
    await consumeToken(trx, row, now);
    const user = await userRepository.markEmailVerified(trx, row.user_id, now);
    if (!user) throw tokenUsed();
    return user;
  });
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
