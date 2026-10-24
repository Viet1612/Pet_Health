import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import type { IdentityDeps } from '../../identity-deps.js';
import { userRepository } from '../persistence/user-repository.js';
import { zLocale } from './schemas.js';

/** PATCH /me/locale (S4-09): ngôn ngữ giao diện và email của tài khoản. Cần phiên + CSRF. */
export const meRoutes: FastifyPluginAsyncZod<IdentityDeps> = (app, deps) => {
  app.patch(
    '/me/locale',
    {
      schema: {
        tags: ['auth'],
        summary: 'Đổi ngôn ngữ của tài khoản',
        body: z.object({ locale: zLocale }),
        response: { 200: z.object({ locale: zLocale }) },
      },
    },
    async (req) => {
      if (!req.auth) throw new UnauthenticatedError();
      const user = await userRepository.setLocale(deps.db, req.auth.userId, req.body.locale);
      if (!user) throw new UnauthenticatedError();
      return { locale: req.body.locale };
    },
  );
  return Promise.resolve();
};
