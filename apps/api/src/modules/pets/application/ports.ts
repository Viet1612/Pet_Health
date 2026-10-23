import type { Kysely, Selectable, Transaction } from 'kysely';

import type { Pets } from '../../../platform/db/database.types.js';
import type { Database } from '../../../platform/db/kysely.js';
import type { PetInput } from '../domain/pet.js';

export type PetRow = Selectable<Pets>;
export type Trx = Transaction<Database>;
export type Q = Kysely<Database> | Trx;

/**
 * Truy cập bảng `pets`. Route chạy trong transaction đã đặt `app.user_id` (RLS); worker ảnh dùng
 * kết nối app_worker nên mọi hàm vẫn lọc `owner_id`.
 */
export interface PetRepository {
  /** Khóa dòng user (`FOR UPDATE`) và trả múi giờ; tuần tự hóa các lần tạo song song (BRU-009). */
  lockOwnerTimezone(trx: Trx, ownerId: string): Promise<string | undefined>;
  ownerTimezone(trx: Trx, ownerId: string): Promise<string | undefined>;
  countByOwner(trx: Trx, ownerId: string): Promise<number>;
  listByOwner(trx: Trx, ownerId: string): Promise<PetRow[]>;
  findById(q: Q, ownerId: string, id: string): Promise<PetRow | undefined>;
  insert(trx: Trx, pet: PetInput & { id: string; ownerId: string; now: Date }): Promise<PetRow>;
  update(
    trx: Trx,
    ownerId: string,
    id: string,
    patch: Partial<PetInput>,
    now: Date,
  ): Promise<PetRow | undefined>;
  /** Đặt/xóa `weight_target_kg`; `false` nếu không có thú cưng. */
  setWeightTarget(
    trx: Trx,
    ownerId: string,
    id: string,
    kg: string | null,
    now: Date,
  ): Promise<boolean>;
  /** Khóa dòng thú cưng trước khi xóa; `undefined` nếu không có. */
  lockForDelete(trx: Trx, ownerId: string, id: string): Promise<{ name: string } | undefined>;
  delete(trx: Trx, ownerId: string, id: string): Promise<void>;
  /** Khóa dòng thú cưng và trả `avatar_key` hiện tại; `undefined` nếu không còn. */
  lockAvatarKey(
    trx: Trx,
    ownerId: string,
    id: string,
  ): Promise<{ avatarKey: string | null } | undefined>;
  /** Đặt `avatar_key`, trả khóa cũ; `undefined` nếu không có thú cưng. */
  setAvatarKey(
    trx: Trx,
    ownerId: string,
    id: string,
    key: string | null,
    now: Date,
  ): Promise<{ oldKey: string | null } | undefined>;
}
