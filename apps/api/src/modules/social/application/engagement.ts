import type { Transaction } from 'kysely';

import type { AnalyticsPort } from '../../../platform/analytics/analytics.port.js';
import type { ClockPort } from '../../../platform/clock/clock.js';
import type { Database } from '../../../platform/db/kysely.js';
import { AppError, NotFoundError, ValidationError } from '../../../platform/errors/app-error.js';
import {
  runIdempotent,
  type IdempotencyInput,
} from '../../../platform/idempotency/run-idempotent.js';
import { newId } from '../../../platform/ids.js';
import type { RateLimiter } from '../../../platform/rate-limit/rate-limiter.js';
import { thumbKeyOf, type MediaService } from '../../media/index.js';
import {
  activityRepository,
  engagementRepository,
  type CommentRow,
} from '../adapters/persistence/engagement.repository.js';
import { postRepository } from '../adapters/persistence/post.repository.js';
import type { PersonView } from './follows.js';
import { socialLimit } from './limits.js';

type Trx = Transaction<Database>;

export const COMMENT_MAX = 500;
export const COMMENT_PAGE = 20;
export const LIKERS_LIMIT = 100;

export interface EngagementDeps {
  clock: ClockPort;
  media: MediaService;
  rateLimiter: RateLimiter;
  analytics?: AnalyticsPort;
}

export interface CommentView {
  id: string;
  author: { username: string; displayName: string; avatarThumbUrl: string | null };
  body: string;
  createdAt: string;
  canDelete: boolean;
}

const codePoints = (s: string): number => Array.from(s).length;

/** Nội dung bình luận: NFC, trim, 1–500 ký tự. */
export function checkCommentBody(raw: string): string {
  const body = raw.normalize('NFC').trim();
  if (body === '') {
    throw new ValidationError([{ field: 'body', code: 'REQUIRED', message: 'Trường bắt buộc' }]);
  }
  if (codePoints(body) > COMMENT_MAX) {
    throw new ValidationError([
      {
        field: 'body',
        code: 'TOO_LONG',
        message: `Tối đa ${String(COMMENT_MAX)} ký tự`,
        params: { max: COMMENT_MAX },
      },
    ]);
  }
  return body;
}

/** Bài đã đăng mà người gọi thấy được (RLS); không có → 404. */
async function visiblePost(trx: Trx, postId: string) {
  const post = await postRepository.findById(trx, postId);
  if (post?.status !== 'PUBLISHED') throw new NotFoundError();
  return post;
}

/** `PUT /posts/{id}/like` (idempotent): tạo thông báo LIKE cho chủ bài (một lần mỗi người). */
export async function likePost(
  deps: EngagementDeps,
  trx: Trx,
  viewerId: string,
  postId: string,
): Promise<{ liked: true; likeCount: number }> {
  const post = await visiblePost(trx, postId);
  const now = deps.clock.now();
  await socialLimit(deps.rateLimiter, 'like', viewerId);
  if (await engagementRepository.like(trx, postId, viewerId, now)) {
    await activityRepository.add(trx, {
      ownerId: post.owner_id,
      actorId: viewerId,
      kind: 'LIKE',
      postId,
      now,
    });
    await deps.analytics?.track(trx, 'post_liked', {}, viewerId);
    if (post.owner_id !== viewerId) {
      await deps.analytics?.track(trx, 'post_like_received', {}, post.owner_id);
    }
  }
  return { liked: true, likeCount: await engagementRepository.likeCount(trx, postId) };
}

/** `DELETE /posts/{id}/like` (idempotent). Thông báo LIKE giữ nguyên: thích lại không báo lần nữa. */
export async function unlikePost(
  trx: Trx,
  viewerId: string,
  postId: string,
): Promise<{ liked: false; likeCount: number }> {
  await visiblePost(trx, postId);
  await engagementRepository.unlike(trx, postId, viewerId);
  return { liked: false, likeCount: await engagementRepository.likeCount(trx, postId) };
}

const person = (
  deps: Pick<EngagementDeps, 'media'>,
  viewerId: string,
  r: {
    user_id: string;
    username: string;
    display_name: string;
    avatar_key: string | null;
    followed_by_me: boolean;
  },
): PersonView => ({
  username: r.username,
  displayName: r.display_name,
  avatarThumbUrl: r.avatar_key ? deps.media.signUrl(thumbKeyOf(r.avatar_key)) : null,
  followedByMe: r.followed_by_me,
  isMe: r.user_id === viewerId,
});

/** `GET /posts/{id}/likes`: tối đa 100 người thả tim gần nhất. */
export async function listLikers(
  deps: Pick<EngagementDeps, 'media'>,
  trx: Trx,
  viewerId: string,
  postId: string,
): Promise<{ items: PersonView[] }> {
  await visiblePost(trx, postId);
  const rows = await engagementRepository.likers(trx, viewerId, postId, LIKERS_LIMIT);
  return { items: rows.map((r) => person(deps, viewerId, r)) };
}

function toComment(
  deps: Pick<EngagementDeps, 'media'>,
  viewerId: string,
  c: CommentRow,
): CommentView {
  return {
    id: c.id,
    author: {
      username: c.username,
      displayName: c.display_name,
      avatarThumbUrl: c.avatar_key ? deps.media.signUrl(thumbKeyOf(c.avatar_key)) : null,
    },
    body: c.body,
    createdAt: c.created_at.toISOString(),
    canDelete: c.owner_id === viewerId || c.post_owner_id === viewerId,
  };
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

export const encodeCursor = (at: Date, id: string): string =>
  Buffer.from(JSON.stringify({ at: at.toISOString(), id })).toString('base64url');

/** `GET /posts/{id}/comments`: cũ trước (như cuộc trò chuyện), 20/trang. */
export async function listComments(
  deps: Pick<EngagementDeps, 'media'>,
  trx: Trx,
  viewerId: string,
  postId: string,
  cursor: string | undefined,
): Promise<{ items: CommentView[]; nextCursor: string | null }> {
  const after = cursor === undefined ? null : decodeCursor(cursor);
  await visiblePost(trx, postId);
  const rows = await engagementRepository.comments(trx, postId, after, COMMENT_PAGE + 1);
  const hasMore = rows.length > COMMENT_PAGE;
  const page = hasMore ? rows.slice(0, COMMENT_PAGE) : rows;
  const last = page.at(-1);
  return {
    items: page.map((c) => toComment(deps, viewerId, c)),
    nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null,
  };
}

const lengthBucket = (n: number) => (n <= 40 ? 'short' : n <= 200 ? 'medium' : 'long');

/**
 * `POST /posts/{id}/comments` (Idempotency-Key): 30 bình luận/10 phút → 429 COMMENT_RATE_LIMITED.
 * Tạo thông báo COMMENT cho chủ bài (trừ khi tự bình luận bài mình).
 */
export async function addComment(
  deps: EngagementDeps,
  trx: Trx,
  viewerId: string,
  postId: string,
  rawBody: string,
  idem: IdempotencyInput,
  accountCreatedAt?: Date,
) {
  return runIdempotent(trx, idem, async () => {
    const body = checkCommentBody(rawBody);
    const post = await visiblePost(trx, postId);
    await socialLimit(deps.rateLimiter, 'comment', viewerId, {
      accountCreatedAt,
      now: deps.clock.now(),
    });
    const id = newId();
    const now = deps.clock.now();
    await engagementRepository.insertComment(trx, { id, postId, ownerId: viewerId, body, now });
    await activityRepository.add(trx, {
      ownerId: post.owner_id,
      actorId: viewerId,
      kind: 'COMMENT',
      postId,
      commentId: id,
      now,
    });
    await deps.analytics?.track(
      trx,
      'post_commented',
      { length_bucket: lengthBucket(Array.from(body).length) },
      viewerId,
    );
    const row = await engagementRepository.findComment(trx, id);
    if (!row) throw new NotFoundError();
    return { status: 201, body: { comment: toComment(deps, viewerId, row) } };
  });
}

/** `DELETE /comments/{id}`: người viết hoặc chủ bài; người khác → 404. Thông báo xóa theo CASCADE. */
export async function deleteComment(trx: Trx, viewerId: string, commentId: string): Promise<void> {
  const comment = await engagementRepository.findComment(trx, commentId);
  if (!comment || (comment.owner_id !== viewerId && comment.post_owner_id !== viewerId)) {
    throw new NotFoundError();
  }
  if (!(await engagementRepository.deleteComment(trx, commentId))) throw new NotFoundError();
}
