import { createHash } from 'node:crypto';

import type { FastifyRequest } from 'fastify';
import type { Kysely } from 'kysely';

import type { ClockPort } from '../clock/clock.js';
import type { Database } from '../db/kysely.js';
import { RateLimitedError } from '../errors/app-error.js';

/** Bucket chuẩn dùng ở S1 (SAD §4.2.3). Email luôn băm, không lưu dạng rõ. */
export const RATE_LIMITS = {
  register: (ip: string) => ({ bucket: `register:ip:${ip}`, limit: 10, windowSec: 3600 }),
  forgotPassword: (email: string) => ({
    bucket: `forgot:email:${createHash('sha256').update(email.toLowerCase()).digest('hex')}`,
    limit: 5,
    windowSec: 3600,
  }),
  verifyResend: (userId: string) => ({
    bucket: `verify-resend:user:${userId}`,
    limit: 5,
    windowSec: 3600,
  }),
} as const;

/** Đầu cửa sổ cố định chứa `nowMs` và số giây còn lại tới hết cửa sổ (làm tròn lên). */
export function fixedWindow(nowMs: number, windowSec: number): { start: Date; retryAfter: number } {
  const windowMs = windowSec * 1000;
  const startMs = Math.floor(nowMs / windowMs) * windowMs;
  return { start: new Date(startMs), retryAfter: Math.ceil((startMs + windowMs - nowMs) / 1000) };
}

/** Giới hạn tần suất fixed window lưu ở PostgreSQL (AD-013). */
export class RateLimiter {
  constructor(
    private readonly db: Kysely<Database>,
    private readonly clock: ClockPort,
  ) {}

  /**
   * Đếm một lần cho `bucket`; vượt `limit` thì ném `RateLimitedError` (429, Retry-After).
   * Chạy ngoài transaction nghiệp vụ để request lỗi vẫn được đếm.
   */
  async hit(bucket: string, limit: number, windowSec: number): Promise<void> {
    const { start, retryAfter } = fixedWindow(this.clock.now().getTime(), windowSec);
    const row = await this.db
      .insertInto('rate_limits')
      .values({ bucket, window_start: start, count: 1 })
      .onConflict((oc) =>
        oc.columns(['bucket', 'window_start']).doUpdateSet((eb) => ({
          count: eb('rate_limits.count', '+', 1),
        })),
      )
      .returning('count')
      .executeTakeFirstOrThrow();
    if (row.count > limit) throw new RateLimitedError(retryAfter);
  }
}

/** IP thật của client: sau cloudflared lấy `CF-Connecting-IP` (SAD §4.2.3). */
export function clientIp(request: FastifyRequest, trustCfConnectingIp: boolean): string {
  if (trustCfConnectingIp) {
    const header = request.headers['cf-connecting-ip'];
    const ip = Array.isArray(header) ? header[0] : header;
    if (ip) return ip;
  }
  return request.ip;
}
