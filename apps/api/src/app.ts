import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import Fastify, { type FastifyBaseLogger, type FastifyInstance, type RouteOptions } from 'fastify';
import type { Kysely } from 'kysely';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { FakeClock, type ClockPort } from './platform/clock/clock.js';
import type { Database } from './platform/db/kysely.js';
import { testClockRoute } from './platform/clock/test-clock.route.js';
import {
  NullSessionResolver,
  registerAuthGuard,
  type SessionResolverPort,
} from './platform/http/auth.js';
import { registerCsrf } from './platform/http/csrf.js';
import { registerErrorHandling } from './platform/http/error-handler.js';
import { healthRoutes, type HealthDeps } from './platform/http/health.routes.js';
import { registerIdempotencyHook } from './platform/idempotency/idempotency.hook.js';
import { API_PREFIX, registerOpenApi } from './platform/http/openapi.js';
import { MULTIPART_LIMITS } from './platform/http/multipart.js';
import { genReqId } from './platform/http/request-id.js';
import { registerUserTx } from './platform/http/user-tx.js';
import { installVietnameseZodMessages } from './platform/http/zod-messages.vi.js';
import './platform/http/route-config.js';

export interface AppDeps extends HealthDeps {
  appOrigin: string;
  /** Origin thêm cho CSRF (máy dev mở bằng IP LAN). */
  extraOrigins?: readonly string[];
  nodeEnv: 'development' | 'test' | 'production';
  clock?: ClockPort;
  /** DB cho `request.withTx` (route có phiên). Không truyền khi chỉ sinh OpenAPI. */
  db?: Kysely<Database>;
  sessionResolver?: SessionResolverPort;
  /** Kiểm Origin + X-CSRF-Token cho method ghi (mặc định bật). Chỉ tắt trong test không liên quan CSRF. */
  csrf?: boolean;
  /** Logger pino (đã cấu hình redact). Không truyền thì tắt log. */
  logger?: FastifyBaseLogger;
  /** Đăng ký thêm route (mô-đun nghiệp vụ, hoặc route chỉ dùng trong test). */
  registerRoutes?: (api: FastifyInstance) => Promise<void> | void;
  /** Route ở gốc, ngoài `/api/v1` (ví dụ `GET /media/*`). */
  registerRootRoutes?: (app: FastifyInstance) => Promise<void> | void;
  /** Nhận mọi route được đăng ký (bộ test IDOR S1-08 dùng để liệt kê route). */
  onRoute?: (route: RouteOptions) => void;
}

const BODY_LIMIT_BYTES = 65_536;

/** Dựng Fastify app, không listen. Dùng chung cho main-api, test và sinh OpenAPI. */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  installVietnameseZodMessages();

  const app = Fastify({
    bodyLimit: BODY_LIMIT_BYTES,
    requestIdHeader: false,
    genReqId,
    trustProxy: false,
    disableRequestLogging: true,
    loggerInstance: deps.logger,
  }).withTypeProvider<ZodTypeProvider>();

  if (deps.onRoute) app.addHook('onRoute', deps.onRoute);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandling(app, deps.appOrigin);
  await app.register(fastifyCookie);
  // Ảnh tải lên (S2-02); chỉ route gọi `req.file()` mới đọc multipart.
  await app.register(fastifyMultipart, { limits: MULTIPART_LIMITS });

  // Chỉ nhận JSON; multipart thêm ở S2-02. Content-type khác → 415.
  app.removeContentTypeParser('text/plain');

  app.addHook('onSend', async (request, reply, payload) => {
    void reply.header('x-request-id', request.id);
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

  // Đúng một dòng log mỗi request; không log body, không log query string (SAD §4.3).
  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url ?? 'not-found',
        status: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
      },
      'request completed',
    );
  });

  const { publicRoutes } = registerAuthGuard(
    app,
    deps.sessionResolver ?? new NullSessionResolver(),
  );
  if (deps.csrf !== false) registerCsrf(app, [deps.appOrigin, ...(deps.extraOrigins ?? [])]);
  registerIdempotencyHook(app);
  registerUserTx(app, deps.db);
  app.addHook('onReady', (done) => {
    app.log.info({ publicRoutes }, 'public routes');
    done();
  });

  await registerOpenApi(app);

  await app.register(
    async (api) => {
      await api.register(healthRoutes, { checkDb: deps.checkDb, lifecycle: deps.lifecycle });
      if (deps.nodeEnv === 'test' && deps.clock instanceof FakeClock) {
        await api.register(testClockRoute, { clock: deps.clock });
      }
      await deps.registerRoutes?.(api);
    },
    { prefix: API_PREFIX },
  );
  await deps.registerRootRoutes?.(app);

  return app;
}
