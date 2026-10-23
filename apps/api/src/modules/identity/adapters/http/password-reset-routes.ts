import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { requestPasswordReset, resetPassword } from '../../application/password-reset.js';
import type { IdentityDeps } from '../../identity-deps.js';
import { clearSessionCookie } from './cookies.js';
import { zEmail, zEmpty, zNewPassword, zToken } from './schemas.js';

/** POST /auth/password/forgot, POST /auth/password/reset (US-004). */
export const passwordResetRoutes: FastifyPluginAsyncZod<IdentityDeps> = (app, deps) => {
  app.post(
    '/auth/password/forgot',
    {
      config: { public: true },
      schema: {
        tags: ['auth'],
        summary: 'Gửi liên kết đặt lại mật khẩu',
        body: z.object({ email: zEmail }),
        response: { 202: zEmpty },
      },
    },
    async (req, reply) => {
      await requestPasswordReset(deps, req.body.email);
      return reply.code(202).send(null);
    },
  );

  app.post(
    '/auth/password/reset',
    {
      config: { public: true },
      schema: {
        tags: ['auth'],
        summary: 'Đặt mật khẩu mới bằng token trong liên kết',
        body: z.object({ token: zToken, newPassword: zNewPassword }),
        response: { 204: zEmpty },
      },
    },
    async (req, reply) => {
      await resetPassword(deps, req.body);
      // Phòng khi trình duyệt đang giữ phiên của chính tài khoản này (mọi phiên đã bị hủy).
      clearSessionCookie(reply);
      return reply.code(204).send(null);
    },
  );

  return Promise.resolve();
};
