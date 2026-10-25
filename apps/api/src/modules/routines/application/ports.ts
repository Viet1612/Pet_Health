import type { Insertable, Kysely, Selectable, Transaction } from 'kysely';

import type { ClockPort } from '../../../platform/clock/clock.js';
import type { RoutineTasks } from '../../../platform/db/database.types.js';
import type { Database } from '../../../platform/db/kysely.js';
import type { PetQueryPort } from '../../pets/index.js';

export type Trx = Transaction<Database>;
export type Q = Kysely<Database> | Trx;
export type RoutineTaskRow = Selectable<RoutineTasks>;

/** Việc còn hiệu lực kèm trạng thái của một ngày. */
export type RoutineWithDone = RoutineTaskRow & { done: boolean };

/** Bảng `routine_tasks`, `routine_completions`; mọi hàm lọc `owner_id` (RLS chặn thêm một lớp). */
export interface RoutineRepository {
  /** Việc chưa xóa của các thú cưng, `done` theo `localDate`; xong xuống cuối, rồi theo giờ. */
  listActive(
    q: Q,
    ownerId: string,
    petIds: string[],
    localDate: string,
  ): Promise<RoutineWithDone[]>;
  countActive(trx: Trx, ownerId: string, petId: string): Promise<number>;
  insert(trx: Trx, row: Insertable<RoutineTasks>): Promise<RoutineTaskRow>;
  findActive(q: Q, ownerId: string, id: string): Promise<RoutineTaskRow | undefined>;
  update(
    trx: Trx,
    ownerId: string,
    id: string,
    set: { name?: string; time_of_day?: string },
  ): Promise<RoutineTaskRow | undefined>;
  softDelete(trx: Trx, ownerId: string, id: string, now: Date): Promise<boolean>;
  isDone(q: Q, taskId: string, localDate: string): Promise<boolean>;
  markDone(trx: Trx, ownerId: string, taskId: string, localDate: string, now: Date): Promise<void>;
  unmarkDone(trx: Trx, taskId: string, localDate: string): Promise<void>;
}

export interface RoutinesAppDeps {
  clock: ClockPort;
  pets: PetQueryPort;
  routines: RoutineRepository;
}
