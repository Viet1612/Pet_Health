import type { Selectable, Transaction } from 'kysely';

import type { Pets } from '../../../platform/db/database.types.js';
import type { Database } from '../../../platform/db/kysely.js';
import type { PetInput } from '../domain/pet.js';

export type PetRow = Selectable<Pets>;
export type Trx = Transaction<Database>;

/** Truy cập bảng `pets`. Mọi hàm chạy trong transaction đã đặt `app.user_id` (RLS). */
export interface PetRepository {
  /** Khóa dòng user (`FOR UPDATE`) và trả múi giờ; tuần tự hóa các lần tạo song song (BRU-009). */
  lockOwnerTimezone(trx: Trx, ownerId: string): Promise<string | undefined>;
  ownerTimezone(trx: Trx, ownerId: string): Promise<string | undefined>;
  countByOwner(trx: Trx, ownerId: string): Promise<number>;
  listByOwner(trx: Trx, ownerId: string): Promise<PetRow[]>;
  findById(trx: Trx, ownerId: string, id: string): Promise<PetRow | undefined>;
  insert(trx: Trx, pet: PetInput & { id: string; ownerId: string; now: Date }): Promise<PetRow>;
  update(
    trx: Trx,
    ownerId: string,
    id: string,
    patch: Partial<PetInput>,
    now: Date,
  ): Promise<PetRow | undefined>;
}
