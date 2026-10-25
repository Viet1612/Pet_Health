import type { FastifyInstance } from 'fastify';

import type { LocalDate } from '../../platform/calendar/local-date.js';
import type { ClockPort } from '../../platform/clock/clock.js';
import { petQuery } from '../pets/index.js';
import { routinesRoutes } from './adapters/http/routines.routes.js';
import { routineRepository } from './adapters/persistence/routine.repository.js';
import type { Q } from './application/ports.js';
import { toRoutineItem, type RoutineItem } from './application/routine-view.js';

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
