import { EMAIL_QUEUE } from '../../../platform/email/jobs.js';
import { newId } from '../../../platform/ids.js';
import { RATE_LIMITS } from '../../../platform/rate-limit/rate-limiter.js';
import { authTokenRepository } from '../adapters/persistence/auth-token-repository.js';
import { sessionRepository } from '../adapters/persistence/session-repository.js';
import { userRepository } from '../adapters/persistence/user-repository.js';
import type { IdentityDeps } from '../identity-deps.js';
import { consumeToken, findUsableToken } from './email-token.js';
import { tokenService } from './token-service.js';

/** Liên kết đặt lại mật khẩu hiệu lực 60 phút, dùng một lần (SD-002). */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Quên mật khẩu (US-004, FR-AUTH-008). Phản hồi luôn giống nhau dù email có tài khoản hay không;
 * rate limit đếm cả khi email không tồn tại. Tài khoản chưa xác minh vẫn được đặt lại.
 */
export async function requestPasswordReset(deps: IdentityDeps, email: string): Promise<void> {
  const limit = RATE_LIMITS.forgotPassword(email);
  await deps.rateLimiter.hit(limit.bucket, limit.limit, limit.windowSec);

  const user = await userRepository.findByEmail(deps.db, email);
  if (!user) return;

  const now = deps.clock.now();
  const { token, hash } = tokenService.generate();
  await deps.db.transaction().execute(async (trx) => {
    await authTokenRepository.replaceActive(trx, {
      id: newId(),
      userId: user.id,
      kind: 'RESET_PASSWORD',
      tokenHash: hash,
      expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
      now,
    });
    await deps.jobQueue.enqueue(trx, EMAIL_QUEUE, {
      template: 'RESET_PASSWORD',
      to: user.email,
      token,
    });
  });
}

/**
 * Đặt lại mật khẩu (FR-AUTH-008/009): tiêu token, đặt mật khẩu mới, mở khóa đăng nhập, xác nhận
 * email và hủy mọi phiên của tài khoản. Không tự đăng nhập.
 */
export async function resetPassword(
  deps: IdentityDeps,
  input: { token: string; newPassword: string },
): Promise<void> {
  const now = deps.clock.now();
  const row = await findUsableToken(deps.db, input.token, 'RESET_PASSWORD', now);
  // Argon2 tốn 50–100 ms: băm trước, không giữ transaction.
  const passwordHash = await deps.hasher.hash(input.newPassword);

  await deps.db.transaction().execute(async (trx) => {
    await consumeToken(trx, row, now);
    await userRepository.resetPassword(trx, row.user_id, passwordHash, now);
    await sessionRepository.deleteAllForUser(trx, row.user_id);
  });
}
