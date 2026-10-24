import type { FastifyInstance } from 'fastify';

import {
  registerHealthRecordsRoutes,
  visitPhotoPresenter,
  visitPhotoResolver,
  type HealthRecordsDeps,
} from './health-records/index.js';
import { registerIdentityRoutes, type IdentityDeps } from './identity/index.js';
import {
  registerMediaApiRoutes,
  registerMediaFileRoutes,
  type MediaDeps,
  type TargetResolvers,
} from './media/index.js';
import { petAvatarTargetResolver, registerPetsRoutes, type PetsDeps } from './pets/index.js';
import type { ClockPort } from '../platform/clock/clock.js';

export interface ModuleDeps {
  identity: IdentityDeps;
  pets: PetsDeps;
  media: MediaDeps;
  healthRecords: HealthRecordsDeps;
}

/** Đăng ký route của mọi mô-đun nghiệp vụ. Dùng chung cho main-api và sinh OpenAPI. */
export async function registerModules(api: FastifyInstance, deps: ModuleDeps): Promise<void> {
  await registerIdentityRoutes(api, deps.identity);
  await registerPetsRoutes(api, deps.pets, deps.media);
  await registerMediaApiRoutes(api, { VISIT_PHOTO: visitPhotoPresenter(deps.media) });
  await registerHealthRecordsRoutes(api, deps.healthRecords, deps.media);
}

/** Nơi lưu và gắn ảnh theo loại mục tiêu; mô-đun sở hữu mục tiêu thêm vào (AVATAR ở S2-03). */
export function mediaTargetResolvers(clock: ClockPort): TargetResolvers {
  return { AVATAR: petAvatarTargetResolver(clock), VISIT_PHOTO: visitPhotoResolver() };
}

/** Route ở gốc (ngoài `/api/v1`) của các mô-đun. */
export async function registerRootModuleRoutes(
  app: FastifyInstance,
  deps: ModuleDeps,
): Promise<void> {
  await registerMediaFileRoutes(app, deps.media);
}
