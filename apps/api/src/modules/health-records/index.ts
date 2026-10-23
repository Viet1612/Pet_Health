import type { FastifyInstance } from 'fastify';

import type { ClockPort } from '../../platform/clock/clock.js';
import { petQuery } from '../pets/index.js';
import { weightsRoutes } from './adapters/http/weights.routes.js';
import { weightEntriesRepo } from './adapters/persistence/weight-entries.repo.js';

/** Phụ thuộc của mô-đun health-records (cân nặng S3-01; sổ y tế S3-03). */
export interface HealthRecordsDeps {
  clock: ClockPort;
}

/** Route của mô-đun health-records dưới `/api/v1`. */
export async function registerHealthRecordsRoutes(
  api: FastifyInstance,
  deps: HealthRecordsDeps,
): Promise<void> {
  await api.register(weightsRoutes, {
    clock: deps.clock,
    pets: petQuery,
    weights: weightEntriesRepo,
  });
}
