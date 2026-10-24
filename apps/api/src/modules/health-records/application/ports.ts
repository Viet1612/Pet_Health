import type { Kysely, Selectable, Transaction } from 'kysely';

import type { ClockPort } from '../../../platform/clock/clock.js';
import type { VisitPhotos, Visits, WeightEntries } from '../../../platform/db/database.types.js';
import type { Database } from '../../../platform/db/kysely.js';
import type { MediaService } from '../../media/index.js';
import type { PetQueryPort } from '../../pets/index.js';
import type { VisitCursor } from '../domain/visit.js';

export type Trx = Transaction<Database>;
export type WeightEntryRow = Selectable<WeightEntries>;
export type VisitRow = Selectable<Visits>;
export type VisitPhotoRow = Selectable<VisitPhotos>;

/** Dòng danh sách bản ghi khám (phân trang keyset). */
export interface VisitListRow {
  id: string;
  visitedOn: string;
  /** `created_at::text`, giữ micro giây cho con trỏ. */
  createdAtText: string;
  symptoms: string | null;
  diagnosis: string | null;
  photoCount: number;
}

export interface VisitFields {
  visitedOn: string;
  symptoms: string | null;
  diagnosis: string | null;
  prescription: string | null;
}

/** Bảng `visits`; mọi hàm lọc `owner_id` (RLS chặn thêm một lớp). */
export interface VisitRepository {
  /** `visited_on DESC, created_at DESC, id DESC`, sau con trỏ nếu có; lấy `limit` dòng. */
  list(
    trx: Trx,
    ownerId: string,
    petId: string,
    after: VisitCursor | null,
    limit: number,
  ): Promise<VisitListRow[]>;
  count(trx: Trx, ownerId: string, petId: string): Promise<number>;
  findById(trx: Trx, ownerId: string, id: string): Promise<VisitRow | undefined>;
  /** Khóa dòng (`FOR UPDATE`); xóa bản ghi và thêm ảnh tuần tự hóa qua đây. */
  lock(trx: Trx, ownerId: string, id: string): Promise<VisitRow | undefined>;
  insert(
    trx: Trx,
    visit: VisitFields & { id: string; ownerId: string; petId: string; now: Date },
  ): Promise<VisitRow>;
  update(
    trx: Trx,
    ownerId: string,
    id: string,
    fields: VisitFields,
    now: Date,
  ): Promise<VisitRow | undefined>;
  delete(trx: Trx, ownerId: string, id: string): Promise<void>;
}

export type Q = Kysely<Database> | Trx;

/**
 * Bảng `visit_photos`. Route chạy trong transaction có `app.user_id`; worker ảnh dùng kết nối
 * app_worker nên mọi hàm vẫn lọc `owner_id`.
 */
export interface VisitPhotoRepository {
  /** Số ảnh chưa `FAILED` của lần khám (giới hạn 5). */
  countActive(trx: Trx, ownerId: string, visitId: string): Promise<number>;
  insert(
    trx: Trx,
    photo: { id: string; ownerId: string; visitId: string; storageKey: string; thumbKey: string },
  ): Promise<void>;
  /** Ảnh chưa `FAILED`, cũ nhất trước. */
  listForVisit(trx: Trx, ownerId: string, visitId: string): Promise<VisitPhotoRow[]>;
  findById(q: Q, ownerId: string, id: string): Promise<VisitPhotoRow | undefined>;
  lock(trx: Trx, ownerId: string, id: string): Promise<VisitPhotoRow | undefined>;
  delete(trx: Trx, ownerId: string, id: string): Promise<void>;
  /** `false` nếu ảnh (hoặc lần khám) đã bị xóa. */
  markReady(trx: Trx, ownerId: string, id: string, sizeBytes: number): Promise<boolean>;
  markFailed(q: Q, ownerId: string, id: string, reason: string): Promise<void>;
}

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
  visits: VisitRepository;
  visitPhotos: VisitPhotoRepository;
  media: MediaService;
}
