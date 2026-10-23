import { createHmac } from 'node:crypto';

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { login } from '../../application/login.js';
import { csrfTokenOf } from '../../application/session-service.js';
import type { IdentityDeps } from '../../identity-deps.js';
import { sessionRepository } from '../persistence/session-repository.js';
import { userRepository } from '../persistence/user-repository.js';
import { clearSessionCookie, setSessionCookie } from './cookies.js';
import { toUserDto, zAuthResponse, zEmpty, zUser } from './schemas.js';

/** POST /auth/login, POST /auth/logout, GET /auth/session (US-003). */
export const sessionRoutes: FastifyPluginAsyncZod<IdentityDeps> = (app, deps) => {
  app.post(
    '/auth/login',
    {
      config: { public: true },
      schema: {
        tags: ['auth'],
        summary: 'Đăng nhập',
        body: z.object({
          email: z.string({ error: 'Trường bắt buộc' }).trim().toLowerCase().min(1).max(254),
          // Không áp tối thiểu 8 để không lộ quy tắc; quá 128 ký tự xử lý như sai mật khẩu.
          password: z.string({ error: 'Trường bắt buộc' }).min(1),
        }),
        response: { 200: zAuthResponse },
      },
    },
    async (req, reply) => {
      const { user, session } = await login(deps, req.body);
      setSessionCookie(reply, session.token);
      return { user: toUserDto(user), csrfToken: session.csrfToken };
    },
  );

  app.post(
    '/auth/logout',
    { schema: { tags: ['auth'], summary: 'Đăng xuất', response: { 204: zEmpty } } },
    async (req, reply) => {
      if (req.auth) await sessionRepository.deleteById(deps.db, req.auth.sessionId);
      clearSessionCookie(reply);
      return reply.code(204).send(null);
    },
  );

  app.get(
    '/auth/session',
    {
      schema: {
        tags: ['auth'],
        summary: 'Phiên hiện tại và CSRF token',
        response: {
          200: z.object({ user: zUser, csrfToken: z.string(), userIdHash: z.string() }),
        },
      },
    },
    async (req) => {
      const auth = req.auth;
      if (!auth?.csrfSecret) throw new UnauthenticatedError();
      const user = await userRepository.findById(deps.db, auth.userId);
      if (!user) throw new UnauthenticatedError();
      return {
        user: toUserDto(user),
        csrfToken: csrfTokenOf(auth.csrfSecret),
        userIdHash: createHmac('sha256', deps.analyticsHmacKey).update(user.id).digest('hex'),
      };
    },
  );

  return Promise.resolve();
};
