import type { Transaction } from 'kysely';

import type { Database } from '../../../platform/db/kysely.js';
import { AppError } from '../../../platform/errors/app-error.js';
import { thumbKeyOf, type MediaService } from '../../media/index.js';
import { activityRepository } from '../adapters/persistence/engagement.repository.js';
import { encodeCursor } from './engagement.js';

type Trx = Transaction<Database>;

export const ACTIVITY_PAGE = 30;

export interface ActivityView {
  id: string;
  kind: 'LIKE' | 'COMMENT' | 'FOLLOW';
  actors: { username: string; displayName: string; avatarThumbUrl: string | null }[];
  actorCount: number;
  post: { id: string; thumbUrl: string | null } | null;
  commentId: string | null;
  commentExcerpt: string | null;
  unread: boolean;
  createdAt: string;
}

function decodeCursor(raw: string): { at: Date; id: string } {
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {
      at?: unknown;
      id?: unknown;
    };
    if (typeof c.at === 'string' && typeof c.id === 'string' && /^[0-9a-f-]{36}$/i.test(c.id)) {
      const at = new Date(c.at);
      if (!Number.isNaN(at.getTime())) return { at, id: c.id };
    }
  } catch {
    // rơi xuống lỗi bên dưới
  }
  throw new AppError(400, 'INVALID_CURSOR', 'Con trỏ phân trang không hợp lệ');
}

/**
 * `GET /social-notifications` (F-11): tim chưa đọc cùng bài gộp một dòng ("A và 5 người khác"),
 * bình luận và theo dõi mỗi cái một dòng. Mới nhất trước, 30 dòng/trang.
 */
export async function listActivity(
  deps: { media: MediaService },
  trx: Trx,
  ownerId: string,
  cursor: string | undefined,
): Promise<{ items: ActivityView[]; nextCursor: string | null }> {
  const after = cursor === undefined ? null : decodeCursor(cursor);
  const rows = await activityRepository.list(trx, ownerId, after, ACTIVITY_PAGE + 1);
  const hasMore = rows.length > ACTIVITY_PAGE;
  const page = hasMore ? rows.slice(0, ACTIVITY_PAGE) : rows;
  const last = page.at(-1);
  const sign = (key: string | null) => (key ? deps.media.signUrl(key) : null);
  return {
    items: page.map((r) => ({
      id: r.id,
      kind: r.kind,
      actors: r.actors.map((a) => ({
        username: a.username,
        displayName: a.display_name,
        avatarThumbUrl: a.avatar_key ? sign(thumbKeyOf(a.avatar_key)) : null,
      })),
      actorCount: r.actor_count,
      post: r.post_id ? { id: r.post_id, thumbUrl: sign(r.post_thumb_key) } : null,
      commentId: r.comment_id,
      commentExcerpt: r.comment_body,
      unread: r.unread,
      createdAt: new Date(r.created_at).toISOString(),
    })),
    nextCursor: hasMore && last ? encodeCursor(new Date(last.created_at), last.id) : null,
  };
}

/** `POST /social-notifications/read-all`: đánh dấu đã xem mọi thông báo tạo trước `upTo`. */
export function readAllActivity(trx: Trx, ownerId: string, upTo: Date, now: Date): Promise<number> {
  return activityRepository.readAll(trx, ownerId, upTo, now);
}

/** Số hoạt động chưa xem (chuông, F-11). */
export function activityUnreadCount(trx: Trx, ownerId: string): Promise<number> {
  return activityRepository.unreadCount(trx, ownerId);
}
