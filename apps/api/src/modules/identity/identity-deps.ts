import type { Kysely } from 'kysely';

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
}
