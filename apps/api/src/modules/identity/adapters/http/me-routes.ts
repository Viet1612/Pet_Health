import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import {
  changePassword,
  deleteAccount,
  getMe,
  requestEmailChange,
  updateTimezone,
} from '../../application/account.js';
import { checkBirthDate } from '../../application/birth-date.js';
import type { IdentityDeps } from '../../identity-deps.js';
import { userRepository } from '../persistence/user-repository.js';
import { clearSessionCookie } from './cookies.js';
import {
  toUserDto,
  zBirthDate,
  zEmail,
  zEmpty,
  zLocale,
  zNewPassword,
  zNickname,
  zUser,
} from './schemas.js';

const zMe = zUser.extend({
  pendingEmail: z.string().nullable().describe('Email mới đang chờ xác nhận (liên kết 60 phút)'),
});
const zPassword = z.string({ error: 'Trường bắt buộc' }).min(1, { error: 'Trường bắt buộc' });

function authOf(req: FastifyRequest): { userId: string; sessionId: string } {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth;
}

/**
 * Nhóm `/me` (SAD §2.4.2, S4-09, S6-01): ngôn ngữ, múi giờ, đổi mật khẩu, đổi email, xóa tài khoản.
 * Cần phiên + CSRF; body `strict` nên ID lạ chèn vào bị từ chối.
 */
export const meRoutes: FastifyPluginAsyncZod<IdentityDeps> = (app, deps) => {
  app.get(
    '/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'Thông tin tài khoản',
        response: { 200: z.object({ user: zMe }) },
      },
    },
    async (req) => {
      const { user, pendingEmail } = await getMe(deps, authOf(req).userId);
      return { user: { ...toUserDto(user), pendingEmail } };
    },
  );

  app.patch(
    '/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'Đổi múi giờ, nickname, ngày sinh (ít nhất một trường)',
        body: z
          .strictObject({
            timezone: z.string().optional().describe('IANA, ví dụ Asia/Ho_Chi_Minh'),
            nickname: zNickname.optional(),
            birthDate: zBirthDate.optional(),
          })
          .refine((b) => Object.keys(b).length > 0, {
            error: 'Cần ít nhất một trường',
          }),
        response: { 200: z.object({ user: zUser }) },
      },
    },
    async (req) => {
      const { userId } = authOf(req);
      if (req.body.timezone !== undefined) await updateTimezone(deps, userId, req.body.timezone);
      if (req.body.nickname !== undefined) {
        await userRepository.setNickname(deps.db, userId, req.body.nickname);
      }
      if (req.body.birthDate !== undefined) {
        const { user } = await getMe(deps, userId);
        const birthDate = checkBirthDate(req.body.birthDate, user.timezone, deps.clock.now());
        await userRepository.setBirthDate(deps.db, userId, birthDate);
      }
      const { user } = await getMe(deps, userId);
      return { user: toUserDto(user) };
    },
  );

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
      const user = await userRepository.setLocale(deps.db, authOf(req).userId, req.body.locale);
      if (!user) throw new UnauthenticatedError();
      return { locale: req.body.locale };
    },
  );

  app.post(
    '/me/password',
    {
      schema: {
        tags: ['auth'],
        summary: 'Đổi mật khẩu (giữ phiên hiện tại, hủy phiên khác)',
        body: z.strictObject({ currentPassword: zPassword, newPassword: zNewPassword }),
        response: { 204: zEmpty },
      },
    },
    async (req, reply) => {
      const { userId, sessionId } = authOf(req);
      await changePassword(deps, userId, sessionId, req.body);
      return reply.code(204).send(null);
    },
  );

  app.post(
    '/me/email',
    {
      schema: {
        tags: ['auth'],
        summary: 'Yêu cầu đổi email (gửi liên kết xác nhận tới email mới)',
        body: z.strictObject({ newEmail: zEmail, password: zPassword }),
        response: { 202: zEmpty },
      },
    },
    async (req, reply) => {
      await requestEmailChange(deps, authOf(req).userId, req.body);
      return reply.code(202).send(null);
    },
  );

  app.delete(
    '/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'Xóa tài khoản cùng toàn bộ dữ liệu và ảnh',
        body: z.strictObject({ password: zPassword }),
        response: { 204: zEmpty },
      },
    },
    async (req, reply) => {
      const { userId } = authOf(req);
      await deleteAccount(deps, userId, req.body.password);
      req.log.info({ event: 'identity.account_deleted' }, 'account deleted');
      clearSessionCookie(reply);
      return reply.code(204).send(null);
    },
  );

  return Promise.resolve();
};
