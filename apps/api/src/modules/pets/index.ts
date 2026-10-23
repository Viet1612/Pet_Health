import type { FastifyInstance } from 'fastify';

import type { ClockPort } from '../../platform/clock/clock.js';
import { petsRoutes } from './adapters/http/pets.routes.js';
import { kyselyPetRepository } from './adapters/persistence/kysely-pet-repository.js';

/** Phụ thuộc của mô-đun pets, tiêm từ composition root. */
export interface PetsDeps {
  clock: ClockPort;
}

/** Route của mô-đun pets dưới `/api/v1`. */
export async function registerPetsRoutes(api: FastifyInstance, deps: PetsDeps): Promise<void> {
  await api.register(petsRoutes, { clock: deps.clock, pets: kyselyPetRepository });
}
