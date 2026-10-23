import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { healthRoutes, type HealthDeps } from './platform/http/health.routes.js';
import { API_PREFIX, registerOpenApi } from './platform/http/openapi.js';
import './platform/http/route-config.js';

export interface AppDeps extends HealthDeps {
  logger?: FastifyServerOptions['logger'];
  /** Đăng ký thêm route (mô-đun nghiệp vụ, hoặc route chỉ dùng trong test). */
  registerRoutes?: (api: FastifyInstance) => Promise<void> | void;
}

const BODY_LIMIT_BYTES = 65_536;

/** Dựng Fastify app, không listen. Dùng chung cho main-api, test và sinh OpenAPI. */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    bodyLimit: BODY_LIMIT_BYTES,
    requestIdHeader: false,
    trustProxy: false,
    logger: deps.logger ?? false,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Chỉ nhận JSON; multipart thêm ở S2-02. Content-type khác → 415.
  app.removeContentTypeParser('text/plain');

  app.addHook('onSend', async (request, reply, payload) => {
    // Mọi phản hồi API không được cache (SAD §2.4.1).
    if (request.url.startsWith('/api/')) {
      void reply.header('cache-control', 'no-store');
    }
    // Đang tắt: đóng kết nối sau phản hồi, để keep-alive không giữ app.close() chờ (SAD §4.2.2).
    if (deps.lifecycle.shuttingDown) {
      void reply.header('connection', 'close');
    }
    return payload;
  });

  await registerOpenApi(app);

  await app.register(
    async (api) => {
      await api.register(healthRoutes, { checkDb: deps.checkDb, lifecycle: deps.lifecycle });
      await deps.registerRoutes?.(api);
    },
    { prefix: API_PREFIX },
  );

  return app;
}
