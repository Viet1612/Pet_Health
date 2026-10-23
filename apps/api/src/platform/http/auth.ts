import type { FastifyInstance, FastifyRequest } from 'fastify';

import { UnauthenticatedError } from '../errors/app-error.js';

export interface AuthContext {
  userId: string;
  sessionId: string;
}

/** Tìm phiên từ request. Bản thật đọc cookie/bearer ở S1-04. */
export interface SessionResolverPort {
  resolve(request: FastifyRequest): Promise<AuthContext | null>;
}

/** Bản S0: chưa có phiên nào, mọi route không public đều trả 401. */
export class NullSessionResolver implements SessionResolverPort {
  resolve(): Promise<AuthContext | null> {
    return Promise.resolve(null);
  }
}

/**
 * Deny-by-default (SAD P6, §4.1.2): route cần đăng nhập trừ khi khai báo `config.public = true`.
 * Trả danh sách route public đã đăng ký để log khi khởi động.
 */
export function registerAuthGuard(
  app: FastifyInstance,
  resolver: SessionResolverPort,
): { publicRoutes: string[] } {
  const publicRoutes: string[] = [];

  app.addHook('onRoute', (route) => {
    if (route.config?.public === true) {
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      for (const method of methods) {
        if (method !== 'HEAD') publicRoutes.push(`${method} ${route.url}`);
      }
    }
  });

  app.addHook('preHandler', async (request) => {
    // Đường dẫn không tồn tại: để not-found handler trả 404.
    if (request.is404 || request.routeOptions.config.public === true) return;
    const auth = await resolver.resolve(request);
    if (!auth) throw new UnauthenticatedError();
    request.auth = auth;
  });

  return { publicRoutes };
}
