import { addDays } from '../../../platform/calendar/local-date.js';
import { AppError } from '../../../platform/errors/app-error.js';
import { notificationRepository } from '../adapters/persistence/notification.repository.js';
import { LEVEL_RANK, toNotificationViews, type NotificationView } from './notification-view.js';
import type { NotificationsAppDeps } from './ports.js';
import { syncNotifications } from './sync-notifications.js';

/** Giữ thông báo 90 ngày (FR-NTF-011). */
const KEEP_DAYS = 90;

interface Cursor {
  appearOn: string;
  rank: number;
  id: string;
}

const encode = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');

function decode(raw: string): Cursor {
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<Cursor>;
    if (
      typeof c.appearOn === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(c.appearOn) &&
      typeof c.rank === 'number' &&
      [1, 2, 3].includes(c.rank) &&
      typeof c.id === 'string' &&
      /^[0-9a-f-]{36}$/i.test(c.id)
    ) {
      return { appearOn: c.appearOn, rank: c.rank, id: c.id };
    }
  } catch {
    // rơi xuống lỗi bên dưới
  }
  throw new AppError(400, 'INVALID_CURSOR', 'Con trỏ phân trang không hợp lệ');
}

/** `GET /notifications` (FR-NTF-008): mới nhất trước, 90 ngày, phân trang keyset. */
export async function listNotifications(
  deps: NotificationsAppDeps,
  ownerId: string,
  page: { limit: number; cursor?: string | undefined },
): Promise<{
  today: string;
  fetchedAt: string;
  items: NotificationView[];
  nextCursor: string | null;
  unreadCount: number;
}> {
  const after = page.cursor === undefined ? null : decode(page.cursor);
  const today = await syncNotifications(deps, ownerId);
  const fetchedAt = deps.clock.now();
  return deps.withTx(async (trx) => {
    const repo = notificationRepository;
    const rows = await repo.list(trx, ownerId, addDays(today, -KEEP_DAYS), after, page.limit + 1);
    const hasMore = rows.length > page.limit;
    const pageRows = hasMore ? rows.slice(0, page.limit) : rows;
    const last = pageRows.at(-1);
    return {
      today,
      fetchedAt: fetchedAt.toISOString(),
      items: await toNotificationViews(deps, trx, ownerId, pageRows, today),
      nextCursor:
        hasMore && last
          ? encode({ appearOn: last.appear_on, rank: LEVEL_RANK[last.level] ?? 1, id: last.id })
          : null,
      unreadCount: await repo.countUnread(trx, ownerId),
    };
  });
}
