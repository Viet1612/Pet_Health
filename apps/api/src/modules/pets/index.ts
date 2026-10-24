import type { FastifyInstance } from 'fastify';

import type { ClockPort } from '../../platform/clock/clock.js';
import { createMediaService, type MediaDeps, type TargetResolver } from '../media/index.js';
import { petAvatarRoutes } from './adapters/http/pet-avatar.routes.js';
import { petsRoutes } from './adapters/http/pets.routes.js';
import { weightTargetRoutes } from './adapters/http/weight-target.routes.js';
import { kyselyPetRepository } from './adapters/persistence/kysely-pet-repository.js';
import { avatarTargetResolver } from './application/avatar-target-resolver.js';
import type { Trx } from './application/ports.js';

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
  await api.register(weightTargetRoutes, routeDeps);
}

/**
 * Truy vấn thú cưng cho mô-đun khác (health-records, scheduling…): không đọc bảng `pets` trực
 * tiếp (SAD §2.2.2). Chạy trong transaction có `app.user_id` của chủ.
 */
export interface PetQueryPort {
  /** Thú cưng của chủ; `null` nếu không có hoặc của người khác. */
  getOwnedPet(
    trx: Trx,
    ownerId: string,
    petId: string,
  ): Promise<{ id: string; name: string; weightTargetKg: string | null } | null>;
  /** Múi giờ IANA của tài khoản (tính "hôm nay"). */
  ownerTimezone(trx: Trx, ownerId: string): Promise<string | undefined>;
  /** Tên thú cưng theo id (thông báo, dashboard). */
  getNames(trx: Trx, ownerId: string, ids: string[]): Promise<Map<string, string>>;
}

export const petQuery: PetQueryPort = {
  async getOwnedPet(trx, ownerId, petId) {
    const row = await kyselyPetRepository.findById(trx, ownerId, petId);
    return row ? { id: row.id, name: row.name, weightTargetKg: row.weight_target_kg } : null;
  },
  ownerTimezone: (trx, ownerId) => kyselyPetRepository.ownerTimezone(trx, ownerId),
  async getNames(trx, ownerId, ids) {
    if (ids.length === 0) return new Map();
    const rows = await trx
      .selectFrom('pets')
      .select(['id', 'name'])
      .where('owner_id', '=', ownerId)
      .where('id', 'in', ids)
      .execute();
    return new Map(rows.map((r) => [r.id, r.name]));
  },
};

/** `TargetResolver` cho ảnh đại diện (đăng ký vào worker ảnh). */
export function petAvatarTargetResolver(clock: ClockPort): TargetResolver {
  return avatarTargetResolver({ pets: kyselyPetRepository, clock });
}
