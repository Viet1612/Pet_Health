import type { FastifyInstance } from 'fastify';

import { registerIdentityRoutes, type IdentityDeps } from './identity/index.js';
import {
  registerMediaApiRoutes,
  registerMediaFileRoutes,
  type MediaDeps,
  type TargetResolvers,
} from './media/index.js';
import { registerPetsRoutes, type PetsDeps } from './pets/index.js';

export interface ModuleDeps {
  identity: IdentityDeps;
  pets: PetsDeps;
  media: MediaDeps;
}

/** Đăng ký route của mọi mô-đun nghiệp vụ. Dùng chung cho main-api và sinh OpenAPI. */
export async function registerModules(api: FastifyInstance, deps: ModuleDeps): Promise<void> {
  await registerIdentityRoutes(api, deps.identity);
  await registerPetsRoutes(api, deps.pets);
  await registerMediaApiRoutes(api);
}

/** Nơi lưu và gắn ảnh theo loại mục tiêu; mô-đun sở hữu mục tiêu thêm vào (AVATAR ở S2-03). */
export function mediaTargetResolvers(): TargetResolvers {
  return {};
}

/** Route ở gốc (ngoài `/api/v1`) của các mô-đun. */
export async function registerRootModuleRoutes(
  app: FastifyInstance,
  deps: ModuleDeps,
): Promise<void> {
  await registerMediaFileRoutes(app, deps.media);
}
