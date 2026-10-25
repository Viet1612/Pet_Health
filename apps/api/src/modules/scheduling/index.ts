import type { FastifyInstance } from 'fastify';

import { addDays, type LocalDate } from '../../platform/calendar/local-date.js';

import { noopAnalytics } from '../../platform/analytics/analytics.port.js';
import type { ClockPort } from '../../platform/clock/clock.js';
import type { EventPublisher } from '../../platform/events/sync-event-bus.js';
import { petQuery } from '../pets/index.js';
import { milestonesRoutes } from './adapters/http/milestones.routes.js';
import { milestoneRepository } from './adapters/persistence/milestone.repository.js';
import type { NotificationQueryPort, Q } from './application/ports.js';
import { daysUntilDue, displayStatus } from './domain/display-status.js';
import type { MilestoneEvent } from './domain/events.js';
import type { MilestoneType } from './domain/milestone.js';

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
  /** Dashboard (FR-DSH-003): tối đa `limit` mốc quá hạn hoặc hạn trong 30 ngày tới. */
  async upcomingForDashboard(
    q: Q,
    ownerId: string,
    petIds: string[],
    today: LocalDate,
    limit = 5,
  ): Promise<UpcomingMilestone[]> {
    const rows = await milestoneRepository.upcoming(q, ownerId, petIds, addDays(today, 30), limit);
    return rows.map((r) => {
      const dueOn = r.due_on as LocalDate;
      return {
        id: r.id,
        petId: r.pet_id,
        type: r.type as MilestoneType,
        note: r.note,
        dueOn: r.due_on,
        displayStatus: displayStatus({ status: 'PENDING', dueOn }, today) as 'UPCOMING' | 'OVERDUE',
        daysUntilDue: daysUntilDue(dueOn, today),
      };
    });
  },
};

export interface UpcomingMilestone {
  id: string;
  petId: string;
  type: MilestoneType;
  note: string | null;
  dueOn: string;
  displayStatus: 'UPCOMING' | 'OVERDUE';
  daysUntilDue: number;
}

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
