import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zNotification } from '../../../notifications/index.js';
import { getDashboard, type DashboardPorts } from '../../application/get-dashboard.js';

const zPetName = { petName: z.string() };

const zDashboard = z.object({
  today: z.iso.date(),
  account: z.object({ emailVerified: z.boolean() }),
  notifications: z.object({
    unreadCount: z.number().int().describe('Chưa xem trong phạm vi lọc'),
    banner: z
      .object({
        top: zNotification,
        moreCount: z.number().int(),
        notificationIds: z.array(z.uuid()),
      })
      .nullable(),
  }),
  pets: z.array(
    z.object({ id: z.uuid(), name: z.string(), avatarThumbUrl: z.string().nullable() }),
  ),
  routines: z.object({
    doneCount: z.number().int(),
    totalCount: z.number().int(),
    items: z.array(
      z.object({
        id: z.uuid(),
        petId: z.uuid(),
        name: z.string(),
        timeOfDay: z.string(),
        done: z.boolean(),
        ...zPetName,
      }),
    ),
  }),
  upcomingMilestones: z.array(
    z.object({
      id: z.uuid(),
      petId: z.uuid(),
      type: z.enum(['VACCINE', 'FLEA', 'DEWORM']),
      note: z.string().nullable(),
      dueOn: z.iso.date(),
      displayStatus: z.enum(['UPCOMING', 'OVERDUE']),
      daysUntilDue: z.number().int(),
      ...zPetName,
    }),
  ),
  weight: z
    .object({
      petId: z.uuid(),
      petName: z.string(),
      target: z.string().nullable(),
      latest: z
        .object({ measuredOn: z.iso.date(), weightKg: z.string(), delta: z.string().nullable() })
        .nullable(),
      series: z.array(z.object({ measuredOn: z.iso.date(), weightKg: z.string() })),
    })
    .nullable()
    .describe('Một thú cưng; lọc "Tất cả" → null'),
  weights: z
    .array(
      z.object({
        petId: z.uuid(),
        petName: z.string(),
        measuredOn: z.iso.date().nullable(),
        weightKg: z.string().nullable(),
        target: z.string().nullable(),
      }),
    )
    .nullable()
    .describe('Lọc "Tất cả": cân nặng hiện tại của từng thú cưng'),
});

/** SCR-06 Dashboard trong đúng 1 request (FR-DSH-001→007). */
export const dashboardRoute: FastifyPluginAsyncZod<DashboardPorts> = (app, ports) => {
  app.get(
    '/dashboard',
    {
      schema: {
        tags: ['dashboard'],
        summary: 'Dữ liệu Dashboard: banner, checklist hôm nay, mốc sắp tới, cân nặng',
        querystring: z.object({
          pet: z
            .union([z.literal('all'), z.uuid()])
            .default('all')
            .describe('all hoặc petId'),
        }),
        response: { 200: zDashboard },
      },
    },
    async (req, reply) => {
      const auth = req.auth;
      if (!auth) throw new UnauthenticatedError();
      void reply.header('cache-control', 'no-store');
      return getDashboard(
        ports,
        (fn) => req.withTx(fn),
        auth.userId,
        auth.emailVerified ?? false,
        req.query.pet,
      );
    },
  );
  return Promise.resolve();
};
