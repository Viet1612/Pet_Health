import { NotFoundError } from '../../../platform/errors/app-error.js';
import { notificationRepository } from '../adapters/persistence/notification.repository.js';
import { LEVEL_RANK, toNotificationViews, type NotificationView } from './notification-view.js';
import type { NotificationsAppDeps } from './ports.js';
import { syncNotifications } from './sync-notifications.js';

const BANNER_IDS_MAX = 50;

export interface NotificationSummary {
  /** Số chưa xem của cả tài khoản (chuông), không phụ thuộc `pet`. */
  unreadCount: number;
  banner?: { top: NotificationView; moreCount: number; notificationIds: string[] };
}

/**
 * `GET /notifications/summary?pet=all|{petId}` (FR-NTF-009): chuông + banner. Banner gồm thông báo
 * chưa xem (chưa resolve) trong phạm vi `pet`, sắp OVERDUE > D1 > D7 → hạn sớm trước → xuất hiện
 * muộn trước → id. Dùng lại ở Dashboard (S5-03).
 */
export async function getNotificationSummary(
  deps: NotificationsAppDeps,
  ownerId: string,
  /** `'all'` hoặc petId. */
  pet: string,
): Promise<NotificationSummary> {
  const today = await syncNotifications(deps, ownerId);
  return deps.withTx(async (trx) => {
    if (pet !== 'all' && !(await deps.pets.getOwnedPet(trx, ownerId, pet))) {
      throw new NotFoundError();
    }
    const unread = await notificationRepository.listUnread(trx, ownerId);
    const views = (await toNotificationViews(deps, trx, ownerId, unread, today))
      .filter((n) => n.resolution === null && (pet === 'all' || n.petId === pet))
      .sort(
        (a, b) =>
          (LEVEL_RANK[b.level] ?? 0) - (LEVEL_RANK[a.level] ?? 0) ||
          a.dueOn.localeCompare(b.dueOn) ||
          b.appearOn.localeCompare(a.appearOn) ||
          a.id.localeCompare(b.id),
      );
    const [top] = views;
    return {
      unreadCount: unread.length,
      ...(top
        ? {
            banner: {
              top,
              moreCount: views.length - 1,
              notificationIds: views.slice(0, BANNER_IDS_MAX).map((v) => v.id),
            },
          }
        : {}),
    };
  });
}
