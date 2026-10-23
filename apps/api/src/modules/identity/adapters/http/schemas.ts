import { z } from 'zod';

import type { UserRow } from '../persistence/user-repository.js';

/** Email: bỏ khoảng trắng, chữ thường, đúng định dạng, ≤ 254 ký tự (FR-AUTH-001). */
export const zEmail = z
  .string({ error: 'Trường bắt buộc' })
  .trim()
  .toLowerCase()
  .min(1, { error: 'Trường bắt buộc' })
  .pipe(z.email({ error: 'Email không đúng định dạng' }).max(254));

const codePoints = (s: string): number => Array.from(s).length;

/** Mật khẩu mới: 8–128 ký tự theo code point, không trim (SD-001). */
export const zNewPassword = z
  .string({ error: 'Trường bắt buộc' })
  .refine((s) => codePoints(s) >= 8 && codePoints(s) <= 128, {
    error: 'Mật khẩu cần 8–128 ký tự',
  });

/** Token trong liên kết email: base64url 43 ký tự. */
export const zToken = z.string({ error: 'Liên kết không hợp lệ' });

export const zUser = z.object({
  id: z.uuid(),
  email: z.string(),
  emailVerified: z.boolean(),
  timezone: z.string(),
  createdAt: z.iso.datetime(),
});
export type UserDto = z.infer<typeof zUser>;

export function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified_at !== null,
    timezone: row.timezone,
    createdAt: row.created_at.toISOString(),
  };
}

export const zAuthResponse = z.object({ user: zUser, csrfToken: z.string() });

/** Phản hồi không có body (202, 204). */
export const zEmpty = z.null();
