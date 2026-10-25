import type { Insertable, Kysely, Selectable, Transaction, Updateable } from 'kysely';

import type { AnalyticsPort } from '../../../platform/analytics/analytics.port.js';
import type { ClockPort } from '../../../platform/clock/clock.js';
import type { Milestones } from '../../../platform/db/database.types.js';
import type { Database } from '../../../platform/db/kysely.js';
import type { EventPublisher } from '../../../platform/events/sync-event-bus.js';
import type { PetQueryPort } from '../../pets/index.js';
import type { MilestoneEvent } from '../domain/events.js';

export type Trx = Transaction<Database>;
export type Q = Kysely<Database> | Trx;
export type MilestoneRow = Selectable<Milestones>;

/** Bảng `milestones`; mọi hàm lọc `owner_id` (RLS chặn thêm một lớp). */
export interface MilestoneRepository {
  listByPet(trx: Trx, ownerId: string, petId: string): Promise<MilestoneRow[]>;
  findById(q: Q, ownerId: string, id: string): Promise<MilestoneRow | undefined>;
  lock(trx: Trx, ownerId: string, id: string): Promise<MilestoneRow | undefined>;
  insert(trx: Trx, row: Insertable<Milestones>): Promise<MilestoneRow>;
  update(
    trx: Trx,
    ownerId: string,
    id: string,
    set: Updateable<Milestones>,
  ): Promise<MilestoneRow | undefined>;
  /** `status = CANCELLED` nếu còn PENDING; `undefined` nếu không cập nhật được dòng nào. */
  cancelIfPending(
    trx: Trx,
    ownerId: string,
    id: string,
    now: Date,
  ): Promise<MilestoneRow | undefined>;
  /** `status = DONE` nếu còn PENDING (khóa lạc quan, S4-02). */
  completeIfPending(
    trx: Trx,
    ownerId: string,
    id: string,
    doneOn: string,
    now: Date,
  ): Promise<MilestoneRow | undefined>;
  /** Chèn mốc kế tiếp; trùng `previous_id` → `undefined` (FR-MS-011). */
  insertNext(trx: Trx, row: Insertable<Milestones>): Promise<MilestoneRow | undefined>;
  findByPrevious(trx: Trx, ownerId: string, previousId: string): Promise<MilestoneRow | undefined>;
  /** Xóa mốc AUTO còn PENDING sinh từ `previousId`; trả số dòng đã xóa. */
  deleteAutoNext(trx: Trx, ownerId: string, previousId: string): Promise<number>;
  /** Mốc PENDING đến hạn trước `dueBy` (đồng bộ thông báo, S4-03). */
  listPendingDueBy(q: Q, ownerId: string, dueBy: string): Promise<MilestoneRow[]>;
  findMany(q: Q, ownerId: string, ids: string[]): Promise<MilestoneRow[]>;
  /** Tối đa `limit` mốc PENDING hạn ≤ `dueBy` của các thú cưng; quá hạn tự đứng trước (S5-03). */
  upcoming(
    q: Q,
    ownerId: string,
    petIds: string[],
    dueBy: string,
    limit: number,
  ): Promise<MilestoneRow[]>;
}

/** Trạng thái thông báo của một mốc (cho dòng "Nhắc nhở" ở chi tiết), do `notifications` cung cấp. */
export interface NotificationQueryPort {
  byMilestone(
    trx: Trx,
    ownerId: string,
    milestoneId: string,
  ): Promise<
    {
      id: string;
      level: string;
      dueOnSnapshot: string;
      readAt: Date | null;
      resolvedAt: Date | null;
      resolution: string | null;
    }[]
  >;
}

export interface SchedulingAppDeps {
  clock: ClockPort;
  pets: PetQueryPort;
  milestones: MilestoneRepository;
  events: EventPublisher<MilestoneEvent>;
  notifications: NotificationQueryPort;
  analytics: AnalyticsPort;
}
