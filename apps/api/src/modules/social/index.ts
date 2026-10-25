import type { FastifyInstance } from 'fastify';

import type { ClockPort } from '../../platform/clock/clock.js';
import type { RateLimiter } from '../../platform/rate-limit/rate-limiter.js';
import { createMediaService, type MediaDeps, type TargetResolver } from '../media/index.js';
import { postsRoutes } from './adapters/http/posts.routes.js';
import { profilesRoutes } from './adapters/http/profiles.routes.js';
import { postPhotoTargetResolver } from './application/posts.js';
import { userAvatarTargetResolver } from './application/profiles.js';

/** Phụ thuộc của mô-đun social (bản tin, Phase 2); dùng chung clock và rate limiter. */
export interface SocialModuleDeps {
  clock: ClockPort;
  rateLimiter: RateLimiter;
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
}

/** `TargetResolver` cho ảnh đại diện người dùng (đăng ký vào worker ảnh). */
export function socialAvatarTargetResolver(clock: ClockPort): TargetResolver {
  return userAvatarTargetResolver(clock);
}

/** `TargetResolver` cho ảnh bài đăng (F-04). */
export function socialPostPhotoTargetResolver(clock: ClockPort): TargetResolver {
  return postPhotoTargetResolver(clock);
}
