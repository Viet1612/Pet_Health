import type { FastifyInstance } from 'fastify';

import { noopAnalytics } from '../../platform/analytics/analytics.port.js';
import type { ClockPort } from '../../platform/clock/clock.js';
import type { EventPublisher } from '../../platform/events/sync-event-bus.js';
import { petQuery } from '../pets/index.js';
import { milestonesRoutes } from './adapters/http/milestones.routes.js';
import { milestoneRepository } from './adapters/persistence/milestone.repository.js';
import type { NotificationQueryPort, Q } from './application/ports.js';
import type { MilestoneEvent } from './domain/events.js';

export type { MilestoneEvent } from './domain/events.js';
export type { NotificationQueryPort } from './application/ports.js';

/** Phụ thuộc của mô-đun scheduling, tiêm từ composition root. */
export interface SchedulingDeps {
  clock: ClockPort;
}

/** Route của mô-đun scheduling dưới `/api/v1`. */
export async function registerSchedulingRoutes(
  api: FastifyInstance,
  deps: SchedulingDeps,
  wiring: { events: EventPublisher<MilestoneEvent>; notifications: NotificationQueryPort },
): Promise<void> {
  await api.register(milestonesRoutes, {
    clock: deps.clock,
    pets: petQuery,
    milestones: milestoneRepository,
    events: wiring.events,
    notifications: wiring.notifications,
    analytics: noopAnalytics,
  });
}

export interface MilestoneSummary {
  id: string;
  petId: string;
  type: string;
  note: string | null;
  dueOn: string;
  dueSetOn: string;
  status: string;
}

/** Đọc mốc cho mô-đun khác (notifications S4-03, dashboard S5-03); không đọc bảng trực tiếp. */
export const milestoneQuery = {
  async listPendingDueBy(q: Q, ownerId: string, dueBy: string): Promise<MilestoneSummary[]> {
    return (await milestoneRepository.listPendingDueBy(q, ownerId, dueBy)).map(toSummary);
  },
  async getSummaries(q: Q, ownerId: string, ids: string[]): Promise<MilestoneSummary[]> {
    return (await milestoneRepository.findMany(q, ownerId, ids)).map(toSummary);
  },
};

function toSummary(
  r: Awaited<ReturnType<typeof milestoneRepository.findMany>>[number],
): MilestoneSummary {
  return {
    id: r.id,
    petId: r.pet_id,
    type: r.type,
    note: r.note,
    dueOn: r.due_on,
    dueSetOn: r.due_set_on,
    status: r.status,
  };
}
