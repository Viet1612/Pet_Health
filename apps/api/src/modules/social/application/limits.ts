import { AppError, RateLimitedError } from '../../../platform/errors/app-error.js';
import type { RateLimiter } from '../../../platform/rate-limit/rate-limiter.js';

/**
 * Mọi ngưỡng chống spam của bản tin ở một chỗ (F-12). Vượt → 429 kèm `retryAfter` (client hiện
 * "thử lại sau N phút"). Tài khoản tạo chưa đủ 24 giờ: đăng bài và bình luận còn 1/3.
 */
export const SOCIAL_LIMITS = {
  post: {
    limit: 30,
    windowSec: 86_400,
    code: 'POST_LIMIT_REACHED',
    title: 'Bạn đã đăng tối đa số bài hôm nay',
  },
  comment: {
    limit: 30,
    windowSec: 600,
    code: 'COMMENT_RATE_LIMITED',
    title: 'Bạn bình luận quá nhanh, thử lại sau ít phút',
  },
  like: {
    limit: 300,
    windowSec: 3600,
    code: 'LIKE_RATE_LIMITED',
    title: 'Bạn thao tác quá nhanh, thử lại sau',
  },
  follow: {
    limit: 200,
    windowSec: 86_400,
    code: 'FOLLOW_LIMIT_REACHED',
    title: 'Bạn đã theo dõi quá nhiều người hôm nay',
  },
  block: {
    limit: 50,
    windowSec: 86_400,
    code: 'BLOCK_LIMIT_REACHED',
    title: 'Bạn đã chặn quá nhiều người hôm nay',
  },
  search: {
    limit: 60,
    windowSec: 60,
    code: 'RATE_LIMITED',
    title: 'Bạn tìm quá nhanh, thử lại sau',
  },
} as const;

export type SocialAction = keyof typeof SOCIAL_LIMITS;

const NEW_ACCOUNT_MS = 24 * 3_600_000;
const REDUCED_FOR_NEW: readonly SocialAction[] = ['post', 'comment'];

/** Ngưỡng áp cho tài khoản: tài khoản mới (< 24 h) đăng bài / bình luận còn 1/3. */
export function limitFor(
  action: SocialAction,
  accountCreatedAt: Date | undefined,
  now: Date,
): number {
  const { limit } = SOCIAL_LIMITS[action];
  const isNew =
    accountCreatedAt !== undefined && now.getTime() - accountCreatedAt.getTime() < NEW_ACCOUNT_MS;
  return isNew && REDUCED_FOR_NEW.includes(action) ? Math.max(1, Math.floor(limit / 3)) : limit;
}

/** Tính một lần cho `action` của `userId`; vượt ngưỡng → AppError 429 với mã riêng. */
export async function socialLimit(
  rateLimiter: RateLimiter,
  action: SocialAction,
  userId: string,
  opts: { accountCreatedAt?: Date | undefined; now?: Date } = {},
): Promise<void> {
  const rule = SOCIAL_LIMITS[action];
  const limit = opts.now ? limitFor(action, opts.accountCreatedAt, opts.now) : rule.limit;
  try {
    await rateLimiter.hit(`${action}:${userId}`, limit, rule.windowSec);
  } catch (error) {
    if (!(error instanceof RateLimitedError)) throw error;
    throw new AppError(429, rule.code, rule.title, {
      retryAfter: error.options.retryAfter ?? rule.windowSec,
      params: { max: limit },
    });
  }
}
