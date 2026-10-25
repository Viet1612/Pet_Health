import type { FastifyInstance } from 'fastify';
import type { Transaction } from 'kysely';

import { subtractCalendarMonths } from '../../platform/calendar/months.js';
import type { LocalDate } from '../../platform/calendar/local-date.js';
import type { Database } from '../../platform/db/kysely.js';

import type { ClockPort } from '../../platform/clock/clock.js';
import {
  createMediaService,
  type MediaDeps,
  type TargetResolver,
  type UploadPresenter,
} from '../media/index.js';
import { petQuery } from '../pets/index.js';
import { visitPhotosRoutes } from './adapters/http/visit-photos.routes.js';
import { visitsRoutes } from './adapters/http/visits.routes.js';
import { visitPhotosRepo } from './adapters/persistence/visit-photos.repo.js';
import { weightsRoutes } from './adapters/http/weights.routes.js';
import { visitsRepo } from './adapters/persistence/visits.repo.js';
import { weightEntriesRepo } from './adapters/persistence/weight-entries.repo.js';
import { formatDelta } from './domain/weight.js';
import {
  visitPhotoTargetResolver,
  visitPhotoUploadPresenter,
} from './application/on-visit-photo-processed.js';

/** Phụ thuộc của mô-đun health-records (cân nặng S3-01; sổ y tế S3-03). */
export interface HealthRecordsDeps {
  clock: ClockPort;
}

/** Route của mô-đun health-records dưới `/api/v1`. */
export async function registerHealthRecordsRoutes(
  api: FastifyInstance,
  deps: HealthRecordsDeps,
  mediaDeps: MediaDeps,
): Promise<void> {
  const routeDeps = {
    clock: deps.clock,
    pets: petQuery,
    weights: weightEntriesRepo,
    visits: visitsRepo,
    visitPhotos: visitPhotosRepo,
    media: createMediaService(mediaDeps),
  };
  await api.register(weightsRoutes, routeDeps);
  await api.register(visitsRoutes, routeDeps);
  await api.register(visitPhotosRoutes, routeDeps);
}

export interface WeightDashboardSummary {
  latest: { measuredOn: string; weightKg: string; delta: string | null } | null;
  /** Số đo trong 6 tháng gần nhất, tăng dần theo ngày. */
  series: { measuredOn: string; weightKg: string }[];
}

/** Tóm tắt cân nặng cho Dashboard (S5-03); dùng lại truy vấn của S3-01. */
export const weightQuery = {
  async summaryForDashboard(
    trx: Transaction<Database>,
    ownerId: string,
    petId: string,
    today: LocalDate,
  ): Promise<WeightDashboardSummary> {
    const [rows, lastTwo] = await Promise.all([
      weightEntriesRepo.listByPet(trx, ownerId, petId, { from: subtractCalendarMonths(today, 6) }),
      weightEntriesRepo.latestTwo(trx, ownerId, petId),
    ]);
    const [latest, previous] = lastTwo;
    return {
      latest: latest
        ? {
            measuredOn: latest.measured_on,
            weightKg: latest.weight_kg,
            delta: previous ? formatDelta(latest.weight_kg, previous.weight_kg) : null,
          }
        : null,
      series: rows.map((r) => ({ measuredOn: r.measured_on, weightKg: r.weight_kg })).reverse(),
    };
  },
};

/** Ảnh khám trong worker `media.process` (S3-04). */
export function visitPhotoResolver(): TargetResolver {
  return visitPhotoTargetResolver(visitPhotosRepo);
}

/** `photo` trong `GET /uploads/{id}` của ảnh khám đã xử lý. */
export function visitPhotoPresenter(mediaDeps: MediaDeps): UploadPresenter {
  return visitPhotoUploadPresenter(visitPhotosRepo, createMediaService(mediaDeps));
}
