import type { Transaction } from 'kysely';

import type { AnalyticsPort } from '../../../platform/analytics/analytics.port.js';
import type { ClockPort } from '../../../platform/clock/clock.js';
import type { Database } from '../../../platform/db/kysely.js';
import { AppError, NotFoundError, ValidationError } from '../../../platform/errors/app-error.js';
import type { RateLimiter } from '../../../platform/rate-limit/rate-limiter.js';
import { thumbKeyOf, type MediaService } from '../../media/index.js';
import { activityRepository } from '../adapters/persistence/engagement.repository.js';
import { followRepository, type PersonRow } from '../adapters/persistence/follow.repository.js';
import { profileRepository } from '../adapters/persistence/profile.repository.js';
import { normalizeUsername } from '../domain/username.js';
import { socialLimit } from './limits.js';

type Trx = Transaction<Database>;

export const FOLLOW_PAGE = 30;
export const SEARCH_LIMIT = 20;
export const SEARCH_MAX = 30;

export interface FollowsDeps {
  clock: ClockPort;
  media: MediaService;
  analytics?: AnalyticsPort;
  rateLimiter: RateLimiter;
}

export interface PersonView {
  username: string;
  displayName: string;
  avatarThumbUrl: string | null;
  followedByMe: boolean;
  isMe: boolean;
}

function toPerson(deps: Pick<FollowsDeps, 'media'>, viewerId: string, r: PersonRow): PersonView {
  return {
    username: r.username,
    displayName: r.display_name,
    avatarThumbUrl: r.avatar_key ? deps.media.signUrl(thumbKeyOf(r.avatar_key)) : null,
    followedByMe: r.followed_by_me,
    isMe: r.user_id === viewerId,
  };
}

/** Hồ sơ theo username dưới RLS: không có hoặc đã chặn nhau → 404. */
async function targetOf(trx: Trx, rawUsername: string): Promise<string> {
  const profile = await profileRepository.findByUsername(trx, normalizeUsername(rawUsername));
  if (!profile) throw new NotFoundError();
  return profile.user_id;
}

/**
 * `PUT /follows/{username}`: theo dõi ngay, không cần duyệt (idempotent). Tự theo dõi → 422; quá
 * 200 lần theo dõi mới mỗi ngày → 429 FOLLOW_LIMIT_REACHED.
 */
export async function follow(
  deps: FollowsDeps,
  trx: Trx,
  viewerId: string,
  rawUsername: string,
): Promise<{ following: true; followerCount: number }> {
  const target = await targetOf(trx, rawUsername);
  if (target === viewerId) {
    throw new ValidationError([
      {
        field: 'username',
        code: 'CANNOT_FOLLOW_SELF',
        message: 'Không thể tự theo dõi chính mình',
      },
    ]);
  }
  if (!(await profileRepository.isFollowing(trx, viewerId, target))) {
    await socialLimit(deps.rateLimiter, 'follow', viewerId);
    const now = deps.clock.now();
    if (await followRepository.follow(trx, viewerId, target, now)) {
      await activityRepository.add(trx, {
        ownerId: target,
        actorId: viewerId,
        kind: 'FOLLOW',
        now,
      });
      await deps.analytics?.track(trx, 'user_followed', {}, viewerId);
    }
  }
  return { following: true, followerCount: await followRepository.followerCount(trx, target) };
}

/** `DELETE /follows/{username}`: bỏ theo dõi (idempotent). */
export async function unfollow(
  trx: Trx,
  viewerId: string,
  rawUsername: string,
): Promise<{ following: false; followerCount: number }> {
  const target = await targetOf(trx, rawUsername);
  if (await followRepository.unfollow(trx, viewerId, target)) {
    await activityRepository.removeUnreadFollow(trx, viewerId, target);
  }
  return { following: false, followerCount: await followRepository.followerCount(trx, target) };
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

/** `GET /profiles/{username}/followers|following`: 30 người/trang, mới nhất trước. */
export async function listFollows(
  deps: Pick<FollowsDeps, 'media'>,
  trx: Trx,
  viewerId: string,
  rawUsername: string,
  side: 'followers' | 'following',
  cursor: string | undefined,
): Promise<{ items: PersonView[]; nextCursor: string | null }> {
  const after = cursor === undefined ? null : decodeCursor(cursor);
  const target = await targetOf(trx, rawUsername);
  const rows = await followRepository.list(trx, viewerId, target, side, after, FOLLOW_PAGE + 1);
  const hasMore = rows.length > FOLLOW_PAGE;
  const page = hasMore ? rows.slice(0, FOLLOW_PAGE) : rows;
  const last = page.at(-1);
  return {
    items: page.map((r) => toPerson(deps, viewerId, r)),
    nextCursor:
      hasMore && last
        ? Buffer.from(
            JSON.stringify({ at: last.followed_at.toISOString(), id: last.user_id }),
          ).toString('base64url')
        : null,
  };
}

/** `GET /search/profiles?q=`: 1–30 ký tự, tối đa 20 kết quả; email không bao giờ được tìm. */
export async function searchProfiles(
  deps: FollowsDeps,
  trx: Trx,
  viewerId: string,
  raw: string,
): Promise<{ items: PersonView[] }> {
  const q = raw.normalize('NFC').trim().replace(/^@/, '');
  if (q.length === 0 || Array.from(q).length > SEARCH_MAX) {
    throw new ValidationError([
      {
        field: 'q',
        code: 'OUT_OF_RANGE',
        message: `Từ khóa 1–${String(SEARCH_MAX)} ký tự`,
        params: { min: 1, max: SEARCH_MAX },
      },
    ]);
  }
  await socialLimit(deps.rateLimiter, 'search', viewerId);
  const rows = await followRepository.search(trx, viewerId, q, SEARCH_LIMIT);
  return { items: rows.map((r) => toPerson(deps, viewerId, r)) };
}
