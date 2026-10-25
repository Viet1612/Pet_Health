import type { Kysely, Transaction } from 'kysely';

import type { AnalyticsPort } from '../../platform/analytics/analytics.port.js';
import type { ClockPort } from '../../platform/clock/clock.js';
import type { Database } from '../../platform/db/kysely.js';
import type { JobQueuePort } from '../../platform/queue/job-queue.port.js';
import type { RateLimiter } from '../../platform/rate-limit/rate-limiter.js';
import type { PasswordHasher } from './application/password-hasher.js';

/** Phụ thuộc của mô-đun identity, tiêm từ composition root. */
export interface IdentityDeps {
  db: Kysely<Database>;
  clock: ClockPort;
  jobQueue: JobQueuePort;
  rateLimiter: RateLimiter;
  hasher: PasswordHasher;
  trustCfConnectingIp: boolean;
  /** Khóa HMAC cho `userIdHash` (analytics). */
  analyticsHmacKey: string;
  /** Mô-đun khác cập nhật dữ liệu theo múi giờ mới (quy đổi giờ việc hằng ngày); gắn ở `registerModules`. */
  onTimezoneChanged?: (
    trx: Transaction<Database>,
    userId: string,
    fromTz: string,
    toTz: string,
    now: Date,
  ) => Promise<unknown>;
  /** Event phía server (`email_verified`, S6-05); gắn ở `registerModules`. */
  analytics?: AnalyticsPort;
}
