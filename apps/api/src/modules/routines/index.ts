import type { FastifyInstance } from 'fastify';
import type { Transaction } from 'kysely';

import type { LocalDate } from '../../platform/calendar/local-date.js';
import { todayIn } from '../../platform/calendar/today.js';
import type { ClockPort } from '../../platform/clock/clock.js';
import type { Database } from '../../platform/db/kysely.js';
import { petQuery } from '../pets/index.js';
import { routinesRoutes } from './adapters/http/routines.routes.js';
import { routineRepository } from './adapters/persistence/routine.repository.js';
import type { Q } from './application/ports.js';
import { toRoutineItem, type RoutineItem } from './application/routine-view.js';
import { convertTimeOfDay, toHHMM } from './domain/routine.js';

export type { RoutineItem } from './application/routine-view.js';

/** Phụ thuộc của mô-đun routines, tiêm từ composition root. */
export interface RoutinesDeps {
  clock: ClockPort;
}

/** Route của mô-đun routines dưới `/api/v1`. */
export async function registerRoutinesRoutes(
  api: FastifyInstance,
  deps: RoutinesDeps,
): Promise<void> {
  await api.register(routinesRoutes, {
    clock: deps.clock,
    pets: petQuery,
    routines: routineRepository,
  });
}

/**
 * Đổi múi giờ tài khoản → quy đổi giờ mọi việc (kể cả đã xóa mềm, để lịch sử nhất quán) sang múi
 * mới. Chạy trong transaction có `app.user_id` của chủ (RLS).
 */
export async function shiftRoutineTimes(
  trx: Transaction<Database>,
  ownerId: string,
  fromTz: string,
  toTz: string,
  now: Date,
): Promise<number> {
  if (fromTz === toTz) return 0;
  const onDate = todayIn(fromTz, now);
  const rows = await trx
    .selectFrom('routine_tasks')
    .select(['id', 'time_of_day'])
    .where('owner_id', '=', ownerId)
    .execute();
  for (const r of rows) {
    const next = convertTimeOfDay(r.time_of_day, fromTz, toTz, onDate);
    if (next === toHHMM(r.time_of_day)) continue;
    await trx
      .updateTable('routine_tasks')
      .set({ time_of_day: next })
      .where('id', '=', r.id)
      .where('owner_id', '=', ownerId)
      .execute();
  }
  return rows.length;
}

/** Checklist hôm nay cho Dashboard (S5-03); không đọc bảng trực tiếp từ mô-đun khác. */
export interface RoutineQueryPort {
  checklistForToday(
    q: Q,
    ownerId: string,
    petIds: string[],
    today: LocalDate,
  ): Promise<RoutineItem[]>;
}

export const routineQuery: RoutineQueryPort = {
  async checklistForToday(q, ownerId, petIds, today) {
    const rows = await routineRepository.listActive(q, ownerId, petIds, today);
    return rows.map((r) => toRoutineItem(r, r.done));
  },
};
