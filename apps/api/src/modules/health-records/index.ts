import type { FastifyInstance } from 'fastify';

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

/** Ảnh khám trong worker `media.process` (S3-04). */
export function visitPhotoResolver(): TargetResolver {
  return visitPhotoTargetResolver(visitPhotosRepo);
}

/** `photo` trong `GET /uploads/{id}` của ảnh khám đã xử lý. */
export function visitPhotoPresenter(mediaDeps: MediaDeps): UploadPresenter {
  return visitPhotoUploadPresenter(visitPhotosRepo, createMediaService(mediaDeps));
}
