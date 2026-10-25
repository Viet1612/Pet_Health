import type { FastifyInstance } from 'fastify';

import type { AnalyticsPort } from '../../platform/analytics/analytics.port.js';
import type { ClockPort } from '../../platform/clock/clock.js';
import { latestWeightsForPets, weightQuery } from '../health-records/index.js';
import type { MediaDeps } from '../media/index.js';
import { notificationSummaryFor } from '../notifications/index.js';
import { createPetListQuery, petQuery } from '../pets/index.js';
import { routineQuery } from '../routines/index.js';
import { milestoneQuery } from '../scheduling/index.js';
import { dashboardRoute } from './adapters/http/dashboard.route.js';

export interface DashboardDeps {
  clock: ClockPort;
  analytics?: AnalyticsPort;
}

/** Route `GET /dashboard` dưới `/api/v1`; ghép query port của các mô-đun khác. */
export async function registerDashboardRoutes(
  api: FastifyInstance,
  deps: DashboardDeps,
  mediaDeps: MediaDeps,
): Promise<void> {
  const pets = createPetListQuery(mediaDeps);
  await api.register(dashboardRoute, {
    clock: deps.clock,
    ownerTimezone: (trx, ownerId) => petQuery.ownerTimezone(trx, ownerId),
    listPets: (trx, ownerId) => pets.listForOwner(trx, ownerId),
    notificationSummary: (withTx, ownerId, pet) =>
      notificationSummaryFor(deps, withTx, ownerId, pet),
    checklistForToday: (trx, ownerId, petIds, today) =>
      routineQuery.checklistForToday(trx, ownerId, petIds, today),
    upcomingMilestones: (trx, ownerId, petIds, today) =>
      milestoneQuery.upcomingForDashboard(trx, ownerId, petIds, today),
    weightSummary: (trx, ownerId, petId, today) =>
      weightQuery.summaryForDashboard(trx, ownerId, petId, today),
    latestWeights: (trx, ownerId, petIds) => latestWeightsForPets(trx, ownerId, petIds),
  });
}
