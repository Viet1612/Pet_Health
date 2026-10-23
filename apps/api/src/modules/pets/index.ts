import type { FastifyInstance } from 'fastify';

import type { ClockPort } from '../../platform/clock/clock.js';
import { createMediaService, type MediaDeps, type TargetResolver } from '../media/index.js';
import { petAvatarRoutes } from './adapters/http/pet-avatar.routes.js';
import { petsRoutes } from './adapters/http/pets.routes.js';
import { kyselyPetRepository } from './adapters/persistence/kysely-pet-repository.js';
import { avatarTargetResolver } from './application/avatar-target-resolver.js';

/** Phụ thuộc của mô-đun pets, tiêm từ composition root. */
export interface PetsDeps {
  clock: ClockPort;
}

/** Route của mô-đun pets dưới `/api/v1`; dùng dịch vụ ảnh của mô-đun media. */
export async function registerPetsRoutes(
  api: FastifyInstance,
  deps: PetsDeps,
  mediaDeps: MediaDeps,
): Promise<void> {
  const routeDeps = {
    clock: deps.clock,
    media: createMediaService(mediaDeps),
    pets: kyselyPetRepository,
  };
  await api.register(petsRoutes, routeDeps);
  await api.register(petAvatarRoutes, routeDeps);
}

/** `TargetResolver` cho ảnh đại diện (đăng ký vào worker ảnh). */
export function petAvatarTargetResolver(clock: ClockPort): TargetResolver {
  return avatarTargetResolver({ pets: kyselyPetRepository, clock });
}
