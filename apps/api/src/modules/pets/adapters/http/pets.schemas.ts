import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { NotFoundError, UnauthenticatedError } from '../../../../platform/errors/app-error.js';
import { zUuid } from '../../../../platform/http/user-tx.js';
import { PET_SEXES } from '../../domain/pet.js';

/** Thú cưng trả về client (SAD §2.4.2). */
export const zPet = z.object({
  id: z.uuid(),
  name: z.string(),
  breed: z.string(),
  sex: z.enum(PET_SEXES),
  birthDate: z.iso.date(),
  ageMonths: z.number().int(),
  ageText: z.string(),
  description: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  avatarThumbUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type PetDto = z.infer<typeof zPet>;

// Kiểu dữ liệu kiểm ở Zod; nội dung (bắt buộc, độ dài, ngày) kiểm ở domain/pet.ts để trả mã lỗi
// riêng (REQUIRED, FUTURE_DATE...).
const petFields = {
  name: z.string().optional(),
  breed: z.string().optional(),
  sex: z.string().optional().describe('MALE | FEMALE'),
  birthDate: z.string().optional().describe('YYYY-MM-DD, không sau hôm nay'),
  description: z.string().nullable().optional(),
};
export const zPetCreate = z.object(petFields);
export const zPetPatch = z.object(petFields).refine((o) => Object.keys(o).length > 0, {
  error: 'Cần ít nhất một trường',
});

// Không dùng zUuid ở params: ID sai định dạng trả 404 như ID không tồn tại (FR-AUTH-013).
export const zPetParams = z.object({ petId: z.string() });

export function ownerOf(req: FastifyRequest): string {
  if (!req.auth) throw new UnauthenticatedError();
  return req.auth.userId;
}

export function petIdOf(raw: string): string {
  if (!zUuid.safeParse(raw).success) throw new NotFoundError();
  return raw;
}
