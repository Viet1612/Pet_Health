import type { FastifyInstance } from 'fastify';

import { registerRoute } from './adapters/http/register-route.js';
import type { IdentityDeps } from './identity-deps.js';

export type { IdentityDeps } from './identity-deps.js';

/** Route của mô-đun identity dưới `/api/v1`. */
export async function registerIdentityRoutes(
  api: FastifyInstance,
  deps: IdentityDeps,
): Promise<void> {
  await api.register(registerRoute, deps);
}
