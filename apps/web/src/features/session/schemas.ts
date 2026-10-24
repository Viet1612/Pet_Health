import { z } from 'zod';

import { m } from '../../i18n';

const t = m.auth;
const codePoints = (s: string): number => Array.from(s).length;

export const zEmailField = z
  .string()
  .trim()
  .min(1, { error: t.required })
  .pipe(z.email({ error: t.invalidEmail }));

export const zNewPasswordField = z
  .string()
  .min(1, { error: t.required })
  .refine((s) => codePoints(s) >= 8 && codePoints(s) <= 128, { error: t.passwordLength });

export const loginSchema = z.object({
  email: zEmailField,
  password: z.string().min(1, { error: t.required }),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: zEmailField,
  password: zNewPasswordField,
  timezone: z.string().min(1),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({ email: zEmailField });
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetSchema = z.object({ newPassword: zNewPasswordField });
export type ResetValues = z.infer<typeof resetSchema>;
