import type { Transaction } from 'kysely';

import type { Database } from '../db/kysely.js';

/**
 * Sự kiện phân tích sản phẩm (S6-05 làm adapter thật). Ghi trong transaction của command để
 * rollback thì không có sự kiện.
 */
export interface AnalyticsPort {
  track(
    trx: Transaction<Database>,
    event: string,
    props?: Record<string, string | number | boolean | null>,
    /** Chủ tài khoản; lưu dạng `user_id_hash`. */
    userId?: string,
  ): Promise<void>;
}

/** Không làm gì, dùng tới khi có S6-05. */
export const noopAnalytics: AnalyticsPort = {
  track: () => Promise.resolve(),
};
