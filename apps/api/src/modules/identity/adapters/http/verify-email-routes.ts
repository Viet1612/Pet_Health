import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { resendVerification, verifyEmail } from '../../application/verify-email.js';
import type { IdentityDeps } from '../../identity-deps.js';
import { toUserDto, zEmpty, zToken, zUser } from './schemas.js';

/** POST /auth/verify-email, POST /auth/verify-email/resend (US-002). */
export const verifyEmailRoutes: FastifyPluginAsyncZod<IdentityDeps> = (app, deps) => {
  app.post(
    '/auth/verify-email',
    {
      config: { public: true },
      schema: {
        tags: ['auth'],
        summary: 'Xác minh email bằng token trong liên kết',
        body: z.object({ token: zToken }),
        response: { 200: z.object({ user: zUser }) },
      },
    },
    async (req) => ({ user: toUserDto(await verifyEmail(deps, req.body.token)) }),
  );

  app.post(
    '/auth/verify-email/resend',
    {
      schema: {
        tags: ['auth'],
        summary: 'Gửi lại email xác minh',
        response: { 202: zEmpty },
      },
    },
    async (req, reply) => {
      if (!req.auth) throw new UnauthenticatedError();
      await resendVerification(deps, req.auth.userId);
      return reply.code(202).send(null);
    },
  );

  return Promise.resolve();
};
