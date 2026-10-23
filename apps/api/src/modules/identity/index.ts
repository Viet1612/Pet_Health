import type { FastifyInstance } from 'fastify';

import { registerRoute } from './adapters/http/register-route.js';
import { sessionRoutes } from './adapters/http/session-routes.js';
import type { IdentityDeps } from './identity-deps.js';

export type { IdentityDeps } from './identity-deps.js';
export { CookieSessionResolver } from './adapters/http/session-resolver.js';

/** Route của mô-đun identity dưới `/api/v1`. */
export async function registerIdentityRoutes(
  api: FastifyInstance,
  deps: IdentityDeps,
): Promise<void> {
  await api.register(registerRoute, deps);
  await api.register(sessionRoutes, deps);
}
