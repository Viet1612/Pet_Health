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
  })
  .refine((s) => s.trim() !== '', { error: 'Mật khẩu không được chỉ có khoảng trắng' });

/** Token trong liên kết email: base64url 43 ký tự. */
export const zToken = z.string({ error: 'Liên kết không hợp lệ' });

/** Ngôn ngữ giao diện và email (S4-09). */
export const LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const zLocale = z.enum(LOCALES);

const toLocale = (v: string): Locale => (v === 'en' ? 'en' : 'vi');

/** Nickname (F-02): 1–50 ký tự sau trim, bắt buộc khi đăng ký. */
export const zNickname = z
  .string({ error: 'Nhập nickname' })
  .trim()
  .min(1, { error: 'Nhập nickname' })
  .max(50, { error: 'Nickname tối đa 50 ký tự' });

/** Ngày sinh (F-02): `YYYY-MM-DD`; khoảng hợp lệ kiểm ở application theo múi giờ. */
export const zBirthDate = z
  .string({ error: 'Nhập ngày sinh' })
  .min(1, { error: 'Nhập ngày sinh' })
  .describe('YYYY-MM-DD, từ 1900-01-01 tới hôm nay');

export const zUser = z.object({
  id: z.uuid(),
  email: z.string(),
  nickname: z.string().nullable().describe('null: tài khoản cũ chưa đặt nickname'),
  birthDate: z.iso.date().nullable().describe('null: tài khoản cũ chưa nhập ngày sinh'),
  emailVerified: z.boolean(),
  timezone: z.string(),
  locale: zLocale,
  createdAt: z.iso.datetime(),
});
export type UserDto = z.infer<typeof zUser>;

export function toUserDto(row: UserRow): UserDto {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    birthDate: row.birth_date,
    emailVerified: row.email_verified_at !== null,
    timezone: row.timezone,
    locale: toLocale(row.locale),
    createdAt: row.created_at.toISOString(),
  };
}

export const zAuthResponse = z.object({ user: zUser, csrfToken: z.string() });

/** Phản hồi không có body (202, 204). */
export const zEmpty = z.null();
