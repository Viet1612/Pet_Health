import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { ClockPort } from '../../../../platform/clock/clock.js';
import { NotFoundError, UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zUuid } from '../../../../platform/http/user-tx.js';
import { getNotificationSummary } from '../../application/get-summary.js';
import { listNotifications } from '../../application/list-notifications.js';
import { markAllRead, markRead } from '../../application/mark-read.js';
import type { MilestoneQueryPort, NotificationsAppDeps } from '../../application/ports.js';
import type { PetQueryPort } from '../../../pets/index.js';

const zNotification = z.object({
  id: z.uuid(),
  level: z.enum(['D7', 'D1', 'OVERDUE']),
  label: z.string().nullable(),
  daysUntilDue: z.number().int().nullable(),
  milestoneId: z.uuid(),
  petId: z.uuid(),
  petName: z.string(),
  type: z.enum(['VACCINE', 'FLEA', 'DEWORM']),
  note: z.string().nullable(),
  dueOn: z.iso.date(),
  appearOn: z.iso.date(),
  unread: z.boolean(),
  resolution: z.enum(['DONE', 'CANCELLED', 'RESCHEDULED']).nullable(),
  createdAt: z.iso.datetime(),
});

const zUnread = z.object({ unreadCount: z.number().int() });

export interface NotificationsRouteDeps {
  clock: ClockPort;
  pets: PetQueryPort;
  milestones: MilestoneQueryPort;
}

function ownerOf(req: FastifyRequest): string {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.userId;
}

/** Thông báo trong ứng dụng (US-041, 048, 049). Mọi `GET` đồng bộ trước khi đọc. */
export const notificationsRoutes: FastifyPluginAsyncZod<NotificationsRouteDeps> = (app, base) => {
  const depsFor = (req: FastifyRequest): NotificationsAppDeps => ({
    ...base,
    withTx: (fn) => req.withTx(fn),
  });

  app.get(
    '/notifications/summary',
    {
      schema: {
        tags: ['notifications'],
        summary: 'Số chưa xem (chuông) và banner nhắc theo thú cưng',
        querystring: z.object({ pet: z.string().default('all').describe('all hoặc petId') }),
        response: {
          200: zUnread.extend({
            banner: z
              .object({
                top: zNotification,
                moreCount: z.number().int(),
                notificationIds: z.array(z.uuid()),
              })
              .optional(),
          }),
        },
      },
    },
    async (req) => {
      const ownerId = ownerOf(req);
      const { pet } = req.query;
      if (pet !== 'all' && !zUuid.safeParse(pet).success) throw new NotFoundError();
      return getNotificationSummary(depsFor(req), ownerId, pet);
    },
  );

  app.get(
    '/notifications',
    {
      schema: {
        tags: ['notifications'],
        summary: 'Danh sách thông báo 90 ngày, mới nhất trước',
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(50).default(20),
          cursor: z.string().optional(),
        }),
        response: {
          200: z.object({
            today: z.iso.date(),
            fetchedAt: z.iso.datetime(),
            items: z.array(zNotification),
            nextCursor: z.string().nullable(),
            unreadCount: z.number().int(),
          }),
        },
      },
    },
    async (req) => listNotifications(depsFor(req), ownerOf(req), req.query),
  );

  app.post(
    '/notifications/read',
    {
      schema: {
        tags: ['notifications'],
        summary: 'Đánh dấu đã xem (ID lạ hoặc của người khác bị bỏ qua)',
        body: z.object({
          ids: z.array(z.uuid()).min(1).max(50),
          reason: z.enum(['USER', 'BANNER']).default('USER'),
        }),
        response: { 200: zUnread },
      },
    },
    async (req) => markRead(depsFor(req), ownerOf(req), req.body.ids, req.body.reason),
  );

  app.post(
    '/notifications/read-all',
    {
      schema: {
        tags: ['notifications'],
        summary: 'Đánh dấu đã xem mọi thông báo tạo trước `upTo`',
        body: z.object({ upTo: z.iso.datetime().describe('`fetchedAt` của lần tải danh sách') }),
        response: { 200: zUnread },
      },
    },
    async (req) => markAllRead(depsFor(req), ownerOf(req), new Date(req.body.upTo)),
  );

  return Promise.resolve();
};
