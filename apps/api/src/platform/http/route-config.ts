import type { AuthContext } from './auth.js';

declare module 'fastify' {
  interface FastifyContextConfig {
    /** Route không cần đăng nhập. Mặc định mọi route yêu cầu phiên (deny-by-default). */
    public?: boolean;
    /** Bắt buộc header Idempotency-Key (POST tạo mới, FR-GEN-005). */
    idempotent?: boolean;
  }
  interface FastifyRequest {
    /** Có khi request đã qua kiểm tra phiên (route không public). */
    auth?: AuthContext;
    /** Có khi route `idempotent: true` đã qua kiểm header. */
    idempotency?: { key: string; requestHash: Buffer };
  }
}

export {};
