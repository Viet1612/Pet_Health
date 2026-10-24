import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { NotFoundError, UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zUuid } from '../../../../platform/http/user-tx.js';
import { sendIdempotent } from '../../../../platform/idempotency/run-idempotent.js';
import { attachVisitPhoto } from '../../application/attach-visit-photo.js';
import { deleteVisitPhoto } from '../../application/delete-visit-photo.js';
import type { HealthRecordsAppDeps } from '../../application/ports.js';

/** ID sai định dạng → 404 như không tồn tại (FR-AUTH-013). */
function uuidOf(raw: string): string {
  if (!zUuid.safeParse(raw).success) throw new NotFoundError();
  return raw;
}

/** Ảnh lần khám (US-033, 034): `POST /visits/{id}/photos`, `DELETE /photos/{id}`. */
export const visitPhotosRoutes: FastifyPluginAsyncZod<HealthRecordsAppDeps> = (app, deps) => {
  app.post(
    '/visits/:id/photos',
    {
      config: { idempotent: true },
      schema: {
        tags: ['visits'],
        summary: 'Đính ảnh vào lần khám (multipart, field `file`, ≤ 5 MB, tối đa 5 ảnh)',
        description:
          'Bắt buộc Idempotency-Key. Ảnh xử lý nền; hỏi trạng thái ở GET /uploads/{uploadId}.',
        consumes: ['multipart/form-data'],
        params: z.object({ id: z.string() }),
        headers: z.object({ 'idempotency-key': z.string().optional() }),
        response: {
          202: z.object({
            photoId: z.uuid(),
            uploadId: z.uuid(),
            status: z.literal('PROCESSING'),
          }),
        },
      },
    },
    async (req, reply) => {
      if (!req.auth) throw new UnauthenticatedError();
      const ownerId = req.auth.userId;
      const visitId = uuidOf(req.params.id);
      const idem = req.idempotency;
      if (!idem) throw new Error('Thiếu thông tin Idempotency-Key');
      const result = await attachVisitPhoto(
        { ...deps, withTx: (fn) => req.withTx(fn) },
        req,
        ownerId,
        visitId,
        idem,
      );
      return sendIdempotent(reply, result);
    },
  );

  app.delete(
    '/photos/:id',
    {
      schema: {
        tags: ['visits'],
        summary: 'Xóa một ảnh của lần khám',
        params: z.object({ id: z.string() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      if (!req.auth) throw new UnauthenticatedError();
      const ownerId = req.auth.userId;
      const id = uuidOf(req.params.id);
      await req.withTx((trx) => deleteVisitPhoto(deps, trx, ownerId, id));
      return reply.code(204).send(null);
    },
  );

  return Promise.resolve();
};
