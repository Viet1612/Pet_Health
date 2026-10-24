import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { clientIp } from '../../../../platform/rate-limit/rate-limiter.js';
import { registerUser } from '../../application/register-user.js';
import type { IdentityDeps } from '../../identity-deps.js';
import { setSessionCookie } from './cookies.js';
import { toUserDto, zAuthResponse, zEmail, zLocale, zNewPassword } from './schemas.js';

/** POST /auth/register (US-001). Công khai; chống trùng bằng UNIQUE(email), không cần Idempotency-Key. */
export const registerRoute: FastifyPluginAsyncZod<IdentityDeps> = (app, deps) => {
  app.post(
    '/auth/register',
    {
      config: { public: true },
      schema: {
        tags: ['auth'],
        summary: 'Đăng ký tài khoản',
        body: z.object({
          email: zEmail,
          password: zNewPassword,
          timezone: z.string().optional(),
          locale: zLocale.optional(),
        }),
        response: { 201: zAuthResponse },
      },
    },
    async (req, reply) => {
      const { user, session } = await registerUser(deps, {
        ...req.body,
        clientIp: clientIp(req, deps.trustCfConnectingIp),
      });
      setSessionCookie(reply, session.token);
      return reply.code(201).send({ user: toUserDto(user), csrfToken: session.csrfToken });
    },
  );
  return Promise.resolve();
};
