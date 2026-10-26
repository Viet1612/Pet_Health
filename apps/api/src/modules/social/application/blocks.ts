import type { Transaction } from 'kysely';

import type { AnalyticsPort } from '../../../platform/analytics/analytics.port.js';
import type { ClockPort } from '../../../platform/clock/clock.js';
import type { Database } from '../../../platform/db/kysely.js';
import { NotFoundError, ValidationError } from '../../../platform/errors/app-error.js';
import type { RateLimiter } from '../../../platform/rate-limit/rate-limiter.js';
import { thumbKeyOf, type MediaService } from '../../media/index.js';
import { blockRepository } from '../adapters/persistence/block.repository.js';
import { profileRepository } from '../adapters/persistence/profile.repository.js';
import { normalizeUsername } from '../domain/username.js';
import { socialLimit } from './limits.js';

type Trx = Transaction<Database>;

export interface BlocksDeps {
  clock: ClockPort;
  media: MediaService;
  rateLimiter: RateLimiter;
  analytics?: AnalyticsPort;
}

async function targetOf(trx: Trx, rawUsername: string): Promise<string> {
  const profile = await profileRepository.findByUsername(trx, normalizeUsername(rawUsername));
  if (!profile) throw new NotFoundError();
  return profile.user_id;
}

/**
 * `PUT /blocks/{username}`: xóa follow và thông báo hai chiều, ẩn tim / bình luận của người bị chặn
 * trên bài mình; rồi ghi dòng chặn. Sau đó RLS ẩn mọi nội dung hai chiều. Idempotent.
 */
export async function blockUser(
  deps: BlocksDeps,
  trx: Trx,
  viewerId: string,
  rawUsername: string,
): Promise<{ blocked: true }> {
  const target = await targetOf(trx, rawUsername);
  if (target === viewerId) {
    throw new ValidationError([
      { field: 'username', code: 'CANNOT_BLOCK_SELF', message: 'Không thể tự chặn chính mình' },
    ]);
  }
  if (await blockRepository.isBlocking(trx, viewerId, target)) return { blocked: true };
  await socialLimit(deps.rateLimiter, 'block', viewerId);
  await blockRepository.cleanup(trx, viewerId, target);
  await blockRepository.block(trx, viewerId, target, deps.clock.now());
  await deps.analytics?.track(trx, 'user_blocked', {}, viewerId);
  return { blocked: true };
}

/**
 * `DELETE /blocks/{username}`: bỏ chặn. Tim và bình luận của họ trên bài mình hiện lại; theo dõi
 * hai chiều đã gỡ thì không tự khôi phục.
 */
export async function unblockUser(
  trx: Trx,
  viewerId: string,
  rawUsername: string,
): Promise<{ blocked: false }> {
  const target = await targetOf(trx, rawUsername);
  // Xóa dòng chặn trước: lúc đó chủ bài mới thấy (và sửa được) các dòng đang ẩn.
  await blockRepository.unblock(trx, viewerId, target);
  await blockRepository.setHidden(trx, viewerId, target, false);
  return { blocked: false };
}

/** `GET /me/blocks`: người mình đã chặn. */
export async function listBlocked(
  deps: Pick<BlocksDeps, 'media'>,
  trx: Trx,
  viewerId: string,
): Promise<{
  items: { username: string; displayName: string; avatarThumbUrl: string | null }[];
}> {
  const rows = await blockRepository.list(trx, viewerId);
  return {
    items: rows.map((r) => ({
      username: r.username,
      displayName: r.display_name,
      avatarThumbUrl: r.avatar_key ? deps.media.signUrl(thumbKeyOf(r.avatar_key)) : null,
    })),
  };
}
