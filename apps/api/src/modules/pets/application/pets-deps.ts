import type { ClockPort } from '../../../platform/clock/clock.js';
import type { PetRepository } from './ports.js';

export interface PetsAppDeps {
  clock: ClockPort;
  pets: PetRepository;
}
