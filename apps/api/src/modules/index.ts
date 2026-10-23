import type { FastifyInstance } from 'fastify';

import { registerIdentityRoutes, type IdentityDeps } from './identity/index.js';

export interface ModuleDeps {
  identity: IdentityDeps;
}

/** Đăng ký route của mọi mô-đun nghiệp vụ. Dùng chung cho main-api và sinh OpenAPI. */
export async function registerModules(api: FastifyInstance, deps: ModuleDeps): Promise<void> {
  await registerIdentityRoutes(api, deps.identity);
}
