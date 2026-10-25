import { z } from 'zod';

/** Payload job `email.transactional`. Token nằm trong payload tối đa 1 ngày; không đưa vào log. */
/** Job cũ (trước S4-09) không có `locale` → `vi`. */
const zEmailLocale = z.enum(['vi', 'en']).optional();

export const emailJobSchema = z.discriminatedUnion('template', [
  z.object({
    template: z.literal('VERIFY_EMAIL'),
    to: z.email(),
    token: z.string().min(1),
    locale: zEmailLocale,
  }),
  z.object({
    template: z.literal('RESET_PASSWORD'),
    to: z.email(),
    token: z.string().min(1),
    locale: zEmailLocale,
  }),
  // S6-01: liên kết xác nhận gửi tới email mới.
  z.object({
    template: z.literal('CHANGE_EMAIL'),
    to: z.email(),
    token: z.string().min(1),
    locale: zEmailLocale,
  }),
  // S6-01: thông báo tới email cũ; chỉ có email mới đã che và thời điểm (không token).
  z.object({
    template: z.literal('EMAIL_CHANGED_NOTICE'),
    to: z.email(),
    maskedNewEmail: z.string(),
    at: z.string(),
    locale: zEmailLocale,
  }),
]);

/** Thư vẫn gửi khi hạn mức SMTP vượt 80% (SAD §2.2.4). */
export const PRIORITY_TEMPLATES: ReadonlySet<EmailJob['template']> = new Set([
  'RESET_PASSWORD',
  'EMAIL_CHANGED_NOTICE',
]);

/** `users.locale` → ngôn ngữ email; giá trị lạ → `vi`. */
export const emailLocale = (locale: string): 'vi' | 'en' => (locale === 'en' ? 'en' : 'vi');

export type EmailJob = z.infer<typeof emailJobSchema>;

export const EMAIL_QUEUE = 'email.transactional' as const;

/** Đường dẫn trên SPA mở từ email; token đặt trong fragment để không lọt vào log máy chủ. */
export const EMAIL_LINK_PATH = {
  VERIFY_EMAIL: '/verify-email',
  RESET_PASSWORD: '/reset-password',
  CHANGE_EMAIL: '/verify-email',
} as const;

/** `vi.nguyen@example.com` → `vi***@example.com` (thư thông báo đổi email). */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}
