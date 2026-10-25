import { createHmac } from 'node:crypto';

import type { Kysely } from 'kysely';

import type { ClockPort } from '../../../platform/clock/clock.js';
import type { Database } from '../../../platform/db/kysely.js';
import type { RateLimiter } from '../../../platform/rate-limit/rate-limiter.js';

export interface AnalyticsDeps {
  db: Kysely<Database>;
  clock: ClockPort;
  rateLimiter: RateLimiter;
  hmacKey: string;
  trustCfConnectingIp: boolean;
}

/** HMAC-SHA256 của userId: không đảo ngược được, ổn định với cùng key (FR-ANL-002). */
export const userIdHash = (key: string, userId: string): string =>
  createHmac('sha256', key).update(userId).digest('hex');
