import type { AuthContext } from './auth.js';

declare module 'fastify' {
  interface FastifyContextConfig {
    /** Route không cần đăng nhập. Mặc định mọi route yêu cầu phiên (deny-by-default). */
    public?: boolean;
  }
  interface FastifyRequest {
    /** Có khi request đã qua kiểm tra phiên (route không public). */
    auth?: AuthContext;
  }
}

export {};
