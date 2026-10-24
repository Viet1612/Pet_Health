import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { NotFoundError, UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zUuid } from '../../../../platform/http/user-tx.js';
import { getUpload } from '../../application/get-upload.js';
import type { UploadPresenters } from '../../application/ports.js';
import { kyselyUploadRepository } from '../persistence/kysely-upload-repository.js';

/** `GET /uploads/{uploadId}`: client hỏi lại trạng thái xử lý ảnh (FR-VIS-007). */
export const uploadsRoutes: FastifyPluginAsyncZod<{ presenters: UploadPresenters }> = (
  app,
  { presenters },
) => {
  app.get(
    '/uploads/:uploadId',
    {
      schema: {
        tags: ['media'],
        summary: 'Trạng thái xử lý ảnh',
        params: z.object({ uploadId: z.string() }),
        response: {
          200: z.object({
            status: z.enum(['PROCESSING', 'READY', 'FAILED']),
            reason: z
              .enum(['UNSUPPORTED_FORMAT', 'CORRUPT', 'TOO_MANY_PIXELS', 'PROCESSING_ERROR'])
              .optional(),
            photo: z
              .object({ id: z.uuid(), thumbUrl: z.string(), url: z.string() })
              .optional()
              .describe('Ảnh khám đã xử lý (S3-04)'),
          }),
        },
      },
    },
    async (req) => {
      if (!req.auth) throw new UnauthenticatedError();
      const ownerId = req.auth.userId;
      const { uploadId } = req.params;
      if (!zUuid.safeParse(uploadId).success) throw new NotFoundError();
      return req.withTx((trx) =>
        getUpload({ uploads: kyselyUploadRepository, presenters }, trx, ownerId, uploadId),
      );
    },
  );
  return Promise.resolve();
};
