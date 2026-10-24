import { notificationRepository } from '../adapters/persistence/notification.repository.js';
import type { NotificationsAppDeps } from './ports.js';

/**
 * `POST /notifications/read` (FR-NTF-010): ID không tồn tại hoặc của người khác bị bỏ qua âm thầm.
 * `reason = BANNER` khi đóng banner.
 */
export function markRead(
  deps: NotificationsAppDeps,
  ownerId: string,
  ids: string[],
  reason: 'USER' | 'BANNER',
): Promise<{ unreadCount: number }> {
  return deps.withTx(async (trx) => {
    await notificationRepository.markRead(trx, ownerId, ids, reason, deps.clock.now());
    return { unreadCount: await notificationRepository.countUnread(trx, ownerId) };
  });
}

/** `POST /notifications/read-all`: chỉ thông báo tạo trước `upTo` (thời điểm client đã tải). */
export function markAllRead(
  deps: NotificationsAppDeps,
  ownerId: string,
  upTo: Date,
): Promise<{ unreadCount: number }> {
  return deps.withTx(async (trx) => {
    await notificationRepository.markAllRead(trx, ownerId, upTo, deps.clock.now());
    return { unreadCount: await notificationRepository.countUnread(trx, ownerId) };
  });
}
