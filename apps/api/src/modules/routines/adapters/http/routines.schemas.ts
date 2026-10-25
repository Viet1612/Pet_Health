import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { NotFoundError, UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zUuid } from '../../../../platform/http/user-tx.js';

export const zRoutine = z.object({
  id: z.uuid(),
  petId: z.uuid(),
  name: z.string(),
  timeOfDay: z.string().describe('HH:MM, 24 giờ'),
  done: z.boolean().describe('Đã xong trong ngày hôm nay của tài khoản'),
});

export const zRoutineChecklist = z.object({
  today: z.iso.date(),
  doneCount: z.number().int(),
  totalCount: z.number().int(),
  items: z.array(zRoutine),
});

// Nội dung (tên 1–100 ký tự, giờ HH:MM) kiểm ở domain để trả thông điệp riêng.
export const zRoutineCreate = z.object({
  name: z.string().describe('1–100 ký tự sau khi bỏ khoảng trắng đầu/cuối'),
  timeOfDay: z.string().describe('HH:MM, 24 giờ'),
});

export const zRoutinePatch = z
  .object({
    name: z.string().optional(),
    timeOfDay: z.string().optional(),
  })
  .refine((o) => o.name !== undefined || o.timeOfDay !== undefined, {
    error: 'Cần ít nhất một trường',
  });

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
