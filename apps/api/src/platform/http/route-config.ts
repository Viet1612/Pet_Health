declare module 'fastify' {
  interface FastifyContextConfig {
    /** Route không cần đăng nhập. Mặc định mọi route yêu cầu phiên (deny-by-default, S0-04). */
    public?: boolean;
  }
}

export {};
