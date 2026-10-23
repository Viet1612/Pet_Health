import type { FastifyInstance } from 'fastify';

import { registerRoute } from './adapters/http/register-route.js';
import { passwordResetRoutes } from './adapters/http/password-reset-routes.js';
import { sessionRoutes } from './adapters/http/session-routes.js';
import { verifyEmailRoutes } from './adapters/http/verify-email-routes.js';
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
  await api.register(verifyEmailRoutes, deps);
  await api.register(passwordResetRoutes, deps);
}
