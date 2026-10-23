import { z } from 'zod';

/** Payload job `email.transactional`. Token nằm trong payload tối đa 1 ngày; không đưa vào log. */
export const emailJobSchema = z.discriminatedUnion('template', [
  z.object({ template: z.literal('VERIFY_EMAIL'), to: z.email(), token: z.string().min(1) }),
  z.object({ template: z.literal('RESET_PASSWORD'), to: z.email(), token: z.string().min(1) }),
]);

export type EmailJob = z.infer<typeof emailJobSchema>;

export const EMAIL_QUEUE = 'email.transactional' as const;

/** Đường dẫn trên SPA mở từ email; token đặt trong fragment để không lọt vào log máy chủ. */
export const EMAIL_LINK_PATH: Record<EmailJob['template'], string> = {
  VERIFY_EMAIL: '/verify-email',
  RESET_PASSWORD: '/reset-password',
};
