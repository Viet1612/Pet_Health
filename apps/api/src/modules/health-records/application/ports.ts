import type { Selectable, Transaction } from 'kysely';

import type { ClockPort } from '../../../platform/clock/clock.js';
import type { WeightEntries } from '../../../platform/db/database.types.js';
import type { Database } from '../../../platform/db/kysely.js';
import type { PetQueryPort } from '../../pets/index.js';

export type Trx = Transaction<Database>;
export type WeightEntryRow = Selectable<WeightEntries>;

/** Bảng `weight_entries`; mọi hàm lọc `owner_id` (RLS chặn thêm một lớp). */
export interface WeightRepository {
  /** `measured_on DESC, created_at DESC`, lọc `from/to` (bao gồm 2 đầu) nếu có. */
  listByPet(
    trx: Trx,
    ownerId: string,
    petId: string,
    range: { from?: string | undefined; to?: string | undefined },
  ): Promise<WeightEntryRow[]>;
  /** 2 số đo mới nhất (cho `latest` và `deltaFromPrevious`). */
  latestTwo(trx: Trx, ownerId: string, petId: string): Promise<WeightEntryRow[]>;
  findById(trx: Trx, ownerId: string, id: string): Promise<WeightEntryRow | undefined>;
  insert(
    trx: Trx,
    entry: {
      id: string;
      ownerId: string;
      petId: string;
      measuredOn: string;
      weightKg: string;
      createdAt: Date;
    },
  ): Promise<WeightEntryRow>;
  update(
    trx: Trx,
    ownerId: string,
    id: string,
    patch: { measuredOn?: string; weightKg?: string },
  ): Promise<WeightEntryRow | undefined>;
  delete(trx: Trx, ownerId: string, id: string): Promise<boolean>;
}

export interface HealthRecordsAppDeps {
  clock: ClockPort;
  pets: PetQueryPort;
  weights: WeightRepository;
}
