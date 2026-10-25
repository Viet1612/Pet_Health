import type { FastifyInstance } from 'fastify';
import { sql, type Transaction } from 'kysely';

import type { AnalyticsPort } from '../../platform/analytics/analytics.port.js';
import type { Database } from '../../platform/db/kysely.js';
import { newId } from '../../platform/ids.js';
import { analyticsRoutes } from './adapters/http/analytics.routes.js';
import { userIdHash, type AnalyticsDeps } from './application/deps.js';
import { sanitizeEvent } from './domain/allowlist.js';

export { userIdHash, type AnalyticsDeps } from './application/deps.js';

export async function registerAnalyticsRoutes(
  api: FastifyInstance,
  deps: AnalyticsDeps,
): Promise<void> {
  await api.register(analyticsRoutes, deps);
}

/**
 * Event phía server (FR-ANL-004), `device_class = 'server'`. Ghi trong transaction nghiệp vụ nhưng
 * bọc SAVEPOINT: lỗi analytics không làm hỏng thao tác chính (FR-ANL-005).
 */
export function createAnalyticsPort(deps: Pick<AnalyticsDeps, 'clock' | 'hmacKey'>): AnalyticsPort {
  return {
    async track(trx: Transaction<Database>, event, props = {}, userId) {
      const clean = sanitizeEvent(event, props);
      if (!clean) return;
      await sql`SAVEPOINT analytics`.execute(trx);
      try {
        await trx
          .insertInto('analytics_events')
          .values({
            id: newId(),
            name: clean.name,
            user_id_hash: userId ? userIdHash(deps.hmacKey, userId) : null,
            device_class: 'server',
            props: JSON.stringify(clean.props),
            occurred_at: deps.clock.now(),
          })
          .execute();
        await sql`RELEASE SAVEPOINT analytics`.execute(trx);
      } catch {
        await sql`ROLLBACK TO SAVEPOINT analytics`.execute(trx);
      }
    },
  };
}
