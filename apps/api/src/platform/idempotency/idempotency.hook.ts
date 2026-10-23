import type { FastifyInstance } from 'fastify';

import { AppError } from '../errors/app-error.js';
import { requestHash } from './canonical-json.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Route có `config.idempotent = true` bắt buộc header `Idempotency-Key` (SAD §2.4.1).
 * Đăng ký sau auth guard để request chưa đăng nhập nhận 401 trước.
 */
export function registerIdempotencyHook(app: FastifyInstance): void {
  app.addHook('preHandler', (request, _reply, done) => {
    if (request.routeOptions.config.idempotent !== true) {
      done();
      return;
    }

    const header = request.headers['idempotency-key'];
    const key = Array.isArray(header) ? header[0] : header;
    if (!key) {
      done(new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Thiếu header Idempotency-Key'));
      return;
    }
    if (!UUID.test(key)) {
      done(new AppError(400, 'IDEMPOTENCY_KEY_INVALID', 'Idempotency-Key phải là UUID'));
      return;
    }

    const path = request.url.split('?')[0] ?? request.url;
    request.idempotency = {
      key: key.toLowerCase(),
      requestHash: requestHash(request.method, path, request.body),
    };
    done();
  });
}
