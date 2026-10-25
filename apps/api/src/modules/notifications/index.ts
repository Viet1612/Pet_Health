import type { FastifyInstance } from 'fastify';
import type { Transaction } from 'kysely';

import type { AnalyticsPort } from '../../platform/analytics/analytics.port.js';
import type { ClockPort } from '../../platform/clock/clock.js';
import type { Database } from '../../platform/db/kysely.js';
import { petQuery } from '../pets/index.js';
import { milestoneQuery } from '../scheduling/index.js';
import { notificationsRoutes } from './adapters/http/notifications.routes.js';
import { notificationRepository } from './adapters/persistence/notification.repository.js';
import { getNotificationSummary } from './application/get-summary.js';

export { onMilestoneEvent, type MilestoneEventInput } from './application/on-milestone-event.js';
export { getNotificationSummary } from './application/get-summary.js';
export type { NotificationsAppDeps } from './application/ports.js';
export { zNotification } from './adapters/http/notifications.routes.js';
export type { NotificationSummary } from './application/get-summary.js';

/** Phụ thuộc của mô-đun notifications, tiêm từ composition root. */
export interface NotificationsDeps {
  clock: ClockPort;
  analytics?: AnalyticsPort;
}

/** Route của mô-đun notifications dưới `/api/v1`. */
export async function registerNotificationsRoutes(
  api: FastifyInstance,
  deps: NotificationsDeps,
): Promise<void> {
  await api.register(notificationsRoutes, {
    clock: deps.clock,
    pets: petQuery,
    milestones: milestoneQuery,
    ...(deps.analytics ? { analytics: deps.analytics } : {}),
  });
}

/**
 * Đồng bộ rồi đọc chuông + banner trong phạm vi `pet` (Dashboard, S5-03); cùng hàm của
 * `GET /notifications/summary`.
 */
export function notificationSummaryFor(
  deps: NotificationsDeps,
  withTx: <T>(fn: (trx: Transaction<Database>) => Promise<T>) => Promise<T>,
  ownerId: string,
  pet: string,
) {
  return getNotificationSummary(
    {
      clock: deps.clock,
      pets: petQuery,
      milestones: milestoneQuery,
      withTx,
      ...(deps.analytics ? { analytics: deps.analytics } : {}),
    },
    ownerId,
    pet,
  );
}

/** Trạng thái thông báo của một mốc, cho chi tiết mốc (`scheduling`). */
export const notificationQuery = {
  async byMilestone(trx: Transaction<Database>, ownerId: string, milestoneId: string) {
    const rows = await notificationRepository.byMilestone(trx, ownerId, milestoneId);
    return rows.map((r) => ({
      id: r.id,
      level: r.level,
      dueOnSnapshot: r.due_on_snapshot,
      readAt: r.read_at,
      resolvedAt: r.resolved_at,
      resolution: r.resolution,
    }));
  },
};
