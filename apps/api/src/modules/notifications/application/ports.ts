import type { Transaction } from 'kysely';

import type { AnalyticsPort } from '../../../platform/analytics/analytics.port.js';
import type { ClockPort } from '../../../platform/clock/clock.js';
import type { Database } from '../../../platform/db/kysely.js';
import type { PetQueryPort } from '../../pets/index.js';
import type { MilestoneSummary } from '../../scheduling/index.js';

export type Trx = Transaction<Database>;

/** Đọc thông báo hoạt động qua mô-đun `social` (không đọc bảng trực tiếp). */
export interface SocialActivityPort {
  unreadActivityCount(trx: Trx, ownerId: string): Promise<number>;
}

/** Đọc mốc qua `scheduling` (không đọc bảng `milestones` trực tiếp). */
export interface MilestoneQueryPort {
  listPendingDueBy(q: Trx, ownerId: string, dueBy: string): Promise<MilestoneSummary[]>;
  getSummaries(q: Trx, ownerId: string, ids: string[]): Promise<MilestoneSummary[]>;
}

export interface NotificationsAppDeps {
  clock: ClockPort;
  pets: PetQueryPort;
  milestones: MilestoneQueryPort;
  /** Event `notification_created` (S6-05); không có thì bỏ qua. */
  analytics?: AnalyticsPort;
  /** Số thông báo hoạt động chưa xem (bản tin, F-11); không có thì 0. */
  social?: SocialActivityPort;
  /** Chạy `fn` trong một transaction có `app.user_id` của chủ (đồng bộ và đọc tách transaction). */
  withTx: <T>(fn: (trx: Trx) => Promise<T>) => Promise<T>;
}
