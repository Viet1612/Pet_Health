import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { ClockPort } from '../../../../platform/clock/clock.js';
import { AppError, NotFoundError } from '../../../../platform/errors/app-error.js';
import type { ObjectStoragePort } from '../../../../platform/storage/object-storage.port.js';
import { isMediaKey } from '../../domain/media-key.js';
import { verifyMediaSignature } from '../../domain/signed-url.js';

export interface MediaFileRouteDeps {
  storage: ObjectStoragePort;
  clock: ClockPort;
  signingKey: string;
}

/**
 * `GET /media/{key}?exp=&sig=` (SAD §3.2.2). Công khai: bảo vệ bằng chữ ký HMAC hết hạn sau
 * ≤ 15 phút, không bằng phiên. Đăng ký ở gốc (ngoài `/api/v1`).
 */
export const mediaFileRoutes: FastifyPluginAsyncZod<MediaFileRouteDeps> = (app, deps) => {
  app.get(
    '/media/*',
    {
      config: { public: true },
      schema: {
        hide: true,
        params: z.object({ '*': z.string() }),
        querystring: z.object({ exp: z.string().optional(), sig: z.string().optional() }),
      },
    },
    async (req, reply) => {
      const key = req.params['*'];
      if (!isMediaKey(key)) throw new NotFoundError();
      const check = verifyMediaSignature(
        deps.signingKey,
        key,
        req.query.exp,
        req.query.sig,
        deps.clock.now(),
      );
      if (check !== 'OK') {
        throw new AppError(403, 'MEDIA_URL_INVALID', 'Liên kết ảnh không hợp lệ hoặc đã hết hạn');
      }
      const stream = await deps.storage.readStream(key);
      if (!stream) throw new NotFoundError();
      return reply
        .header('content-type', 'image/jpeg')
        .header('cache-control', 'private, max-age=900')
        .header('x-content-type-options', 'nosniff')
        .send(stream);
    },
  );
  return Promise.resolve();
};
