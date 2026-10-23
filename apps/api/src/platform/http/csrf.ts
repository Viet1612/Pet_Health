import { timingSafeEqual } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

import { AppError } from '../errors/app-error.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const csrfInvalid = (): AppError =>
  new AppError(403, 'CSRF_INVALID', 'Yêu cầu không hợp lệ. Tải lại trang rồi thử lại.');

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Chống CSRF cho method ghi (NFR-SEC-002, SAD §4.1.1):
 * - Header `Origin` phải là `APP_ORIGIN` (hoặc `EXTRA_ORIGINS` ở máy dev), kể cả route `public`.
 * - Route có phiên: `X-CSRF-Token` phải bằng token của phiên (synchronizer token).
 * Đăng ký sau auth guard để request chưa đăng nhập nhận 401 trước.
 */
export function registerCsrf(app: FastifyInstance, allowedOrigins: readonly string[]): void {
  const allowed = new Set(allowedOrigins);
  app.addHook('preHandler', (request, _reply, done) => {
    if (request.is404 || !WRITE_METHODS.has(request.method)) {
      done();
      return;
    }

    if (!request.headers.origin || !allowed.has(request.headers.origin)) {
      done(csrfInvalid());
      return;
    }

    const auth = request.auth;
    if (auth) {
      const header = request.headers['x-csrf-token'];
      const token = Array.isArray(header) ? header[0] : header;
      const expected = auth.csrfSecret?.toString('base64url');
      if (!token || !expected || !safeEqual(token, expected)) {
        done(csrfInvalid());
        return;
      }
    }
    done();
  });
}
