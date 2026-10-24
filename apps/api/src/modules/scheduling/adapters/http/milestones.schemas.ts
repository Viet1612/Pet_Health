import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { NotFoundError, UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zUuid } from '../../../../platform/http/user-tx.js';
import { MILESTONE_TYPES } from '../../domain/milestone.js';

export const zMilestone = z.object({
  id: z.uuid(),
  petId: z.uuid(),
  type: z.enum(MILESTONE_TYPES),
  dueOn: z.iso.date(),
  dueSetOn: z.iso.date(),
  note: z.string().nullable(),
  cycleMonths: z.number().int().nullable(),
  status: z.enum(['PENDING', 'DONE', 'CANCELLED']),
  displayStatus: z.enum(['UPCOMING', 'OVERDUE', 'DONE', 'CANCELLED']),
  daysUntilDue: z.number().int().nullable(),
  doneOn: z.iso.date().nullable(),
  origin: z.enum(['MANUAL', 'AUTO']),
  previousId: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
});

export const zMilestoneGroups = z.object({
  today: z.iso.date(),
  upcoming: z.array(zMilestone),
  overdue: z.array(zMilestone),
  done: z.array(zMilestone),
  cancelled: z.array(zMilestone),
});

export const zMilestoneDetail = z.object({
  today: z.iso.date(),
  milestone: zMilestone,
  petName: z.string(),
  previousDoneOn: z.iso.date().nullable(),
  reminders: z.array(
    z.object({
      level: z.enum(['D7', 'D1', 'OVERDUE']),
      appearOn: z.iso.date(),
      state: z.enum(['PLANNED', 'UNREAD', 'READ', 'RESOLVED']),
    }),
  ),
});

// Nội dung (ngày hợp lệ, chu kỳ 1–60, vaccine không chu kỳ…) kiểm ở domain để trả mã lỗi riêng.
export const zMilestoneCreate = z.object({
  type: z.string().describe('VACCINE | FLEA | DEWORM'),
  dueOn: z.string().describe('YYYY-MM-DD, cho phép quá khứ'),
  note: z.string().nullable().optional().describe('≤ 500 ký tự'),
  cycleMonths: z.number().nullable().optional().describe('FLEA/DEWORM: số tháng nguyên 1–60'),
});

export const zMilestonePatch = z
  .object({
    // Có mặt → 422 TYPE_IMMUTABLE (không đổi loại sau khi tạo).
    type: z.unknown().optional(),
    dueOn: z.string().optional(),
    note: z.string().nullable().optional(),
    cycleMonths: z.number().nullable().optional().describe('null = bỏ tự lặp'),
  })
  .refine((o) => Object.keys(o).length > 0, { error: 'Cần ít nhất một trường' });

export const zIdParams = z.object({ id: z.string() });
export const zPetParams = z.object({ petId: z.string() });

export function ownerOf(req: FastifyRequest): string {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.userId;
}

/** ID sai định dạng → 404 như không tồn tại (FR-AUTH-013). */
export function uuidOf(raw: string): string {
  if (!zUuid.safeParse(raw).success) throw new NotFoundError();
  return raw;
}
