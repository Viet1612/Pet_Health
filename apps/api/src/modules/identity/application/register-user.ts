import { isValidTimezone } from '../../../platform/calendar/today.js';
import { checkBirthDate } from './birth-date.js';
import { ConflictError, ValidationError } from '../../../platform/errors/app-error.js';
import { newId } from '../../../platform/ids.js';
import { EMAIL_QUEUE, emailLocale } from '../../../platform/email/jobs.js';
import { RATE_LIMITS } from '../../../platform/rate-limit/rate-limiter.js';
import { authTokenRepository } from '../adapters/persistence/auth-token-repository.js';
import {
  isEmailTaken,
  userRepository,
  type UserRow,
} from '../adapters/persistence/user-repository.js';
import type { IdentityDeps } from '../identity-deps.js';
import { createSession, type CreatedSession } from './session-service.js';
import { tokenService } from './token-service.js';

export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
/** Liên kết xác minh email hiệu lực 24 giờ (SD-002). */
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export interface RegisterInput {
  email: string;
  password: string;
  timezone?: string | undefined;
  /** F-02: tên gọi khi đăng ký (đã trim, 1–50 ký tự). */
  nickname: string;
  /** F-02: ngày sinh `YYYY-MM-DD` (chưa kiểm). */
  birthDate: string;
  /** Ngôn ngữ web đang dùng lúc đăng ký (S4-09); mặc định `vi`. */
  locale?: 'vi' | 'en' | undefined;
  clientIp: string;
}

/**
 * Đăng ký (US-001, FR-AUTH-001/002): tạo user chưa xác minh, token xác minh 24 h, job email và
 * phiên trong một transaction. Không SELECT kiểm email trước; dựa vào UNIQUE để không có race.
 */
export async function registerUser(
  deps: IdentityDeps,
  input: RegisterInput,
): Promise<{ user: UserRow; session: CreatedSession }> {
  const limit = RATE_LIMITS.register(input.clientIp);
  await deps.rateLimiter.hit(limit.bucket, limit.limit, limit.windowSec);

  const timezone = input.timezone ?? DEFAULT_TIMEZONE;
  if (!isValidTimezone(timezone)) {
    throw new ValidationError([
      { field: 'timezone', code: 'INVALID_TIMEZONE', message: 'Múi giờ không hợp lệ' },
    ]);
  }

  const birthDate = checkBirthDate(input.birthDate, timezone, deps.clock.now());

  // Argon2 tốn 50–100 ms: băm trước, không giữ transaction.
  const passwordHash = await deps.hasher.hash(input.password);
  const now = deps.clock.now();

  try {
    return await deps.db.transaction().execute(async (trx) => {
      const user = await userRepository.insert(trx, {
        id: newId(),
        email: input.email,
        passwordHash,
        timezone,
        nickname: input.nickname,
        birthDate,
        locale: input.locale ?? 'vi',
        createdAt: now,
      });

      const { token, hash } = tokenService.generate();
      await authTokenRepository.replaceActive(trx, {
        id: newId(),
        userId: user.id,
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

      const session = await createSession(trx, user.id, now);
      return { user, session };
    });
  } catch (error) {
    if (isEmailTaken(error)) {
      throw new ConflictError('EMAIL_TAKEN', 'Email đã được sử dụng', {
        errors: [{ field: 'email', code: 'EMAIL_TAKEN', message: 'Email đã được sử dụng' }],
      });
    }
    throw error;
  }
}
