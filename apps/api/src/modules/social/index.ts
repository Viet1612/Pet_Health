import type { FastifyInstance } from 'fastify';

import type { ClockPort } from '../../platform/clock/clock.js';
import type { RateLimiter } from '../../platform/rate-limit/rate-limiter.js';
import { createMediaService, type MediaDeps, type TargetResolver } from '../media/index.js';
import type { Transaction } from 'kysely';

import type { AnalyticsPort } from '../../platform/analytics/analytics.port.js';
import type { Database } from '../../platform/db/kysely.js';
import { engagementRoutes } from './adapters/http/engagement.routes.js';
import { followsRoutes } from './adapters/http/follows.routes.js';
import { activityUnreadCount } from './application/activity.js';
import { postsRoutes } from './adapters/http/posts.routes.js';
import { profilesRoutes } from './adapters/http/profiles.routes.js';
import { postPhotoTargetResolver } from './application/posts.js';
import { userAvatarTargetResolver } from './application/profiles.js';

/** Phụ thuộc của mô-đun social (bản tin, Phase 2); dùng chung clock và rate limiter. */
export interface SocialModuleDeps {
  clock: ClockPort;
  rateLimiter: RateLimiter;
  analytics?: AnalyticsPort;
}

/** Route của mô-đun social dưới `/api/v1`. */
export async function registerSocialRoutes(
  api: FastifyInstance,
  deps: SocialModuleDeps,
  mediaDeps: MediaDeps,
): Promise<void> {
  const routeDeps = { ...deps, media: createMediaService(mediaDeps) };
  await api.register(profilesRoutes, routeDeps);
  await api.register(postsRoutes, routeDeps);
  await api.register(followsRoutes, routeDeps);
  await api.register(engagementRoutes, routeDeps);
}

/** `TargetResolver` cho ảnh đại diện người dùng (đăng ký vào worker ảnh). */
export function socialAvatarTargetResolver(clock: ClockPort): TargetResolver {
  return userAvatarTargetResolver(clock);
}

/** `TargetResolver` cho ảnh bài đăng (F-04). */
export function socialPostPhotoTargetResolver(clock: ClockPort): TargetResolver {
  return postPhotoTargetResolver(clock);
}

/** Đọc cho mô-đun khác (chuông thông báo, F-11); không đọc bảng `social_*` trực tiếp. */
export const socialQuery = {
  /** Số thông báo hoạt động chưa xem. */
  unreadActivityCount: (trx: Transaction<Database>, ownerId: string): Promise<number> =>
    activityUnreadCount(trx, ownerId),
};
