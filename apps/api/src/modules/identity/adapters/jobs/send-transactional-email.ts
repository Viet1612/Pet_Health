import { renderEmail } from '@ph/email-templates';
import type { Kysely } from 'kysely';
import type { Logger } from 'pino';

import type { ClockPort } from '../../../../platform/clock/clock.js';
import type { Database } from '../../../../platform/db/kysely.js';
import { EmailRejectedError, type EmailPort } from '../../../../platform/email/email-port.js';
import { EMAIL_LINK_PATH, emailJobSchema } from '../../../../platform/email/jobs.js';
import { fixedWindow, incrementCounter } from '../../../../platform/rate-limit/rate-limiter.js';

const DAY_SEC = 86_400;
const WARN_RATIO = 0.8;

export interface SendEmailDeps {
  db: Kysely<Database>;
  email: EmailPort;
  clock: ClockPort;
  logger: Logger;
  appOrigin: string;
  dailyLimit: number;
}

/**
 * Handler job `email.transactional` (S1-02). Ném lỗi → pg-boss thử lại; trả về bình thường → job
 * kết thúc (kể cả khi bỏ qua thư vì hạn mức hoặc SMTP từ chối 5xx). Không log địa chỉ, token, link.
 */
export function createSendTransactionalEmail(deps: SendEmailDeps) {
  return async (data: unknown): Promise<void> => {
    const started = deps.clock.now().getTime();
    const parsed = emailJobSchema.safeParse(data);
    if (!parsed.success) {
      deps.logger.error({ job: 'email.transactional' }, 'invalid email job payload');
      return;
    }
    const job = parsed.data;

    // Hạn mức gửi trong ngày (UTC). Thư bị bỏ qua vẫn được đếm (chấp nhận lệch nhỏ).
    const { start } = fixedWindow(deps.clock.now().getTime(), DAY_SEC);
    const count = await incrementCounter(deps.db, 'smtp:daily', start);
    const limit = deps.dailyLimit;
    if (count > limit) {
      deps.logger.error(
        { job: 'email.transactional', template: job.template, count },
        'smtp_daily_limit_reached',
      );
      return;
    }
    if (count > WARN_RATIO * limit) {
      deps.logger.warn(
        { job: 'email.transactional', template: job.template, count },
        'smtp_daily_limit_80',
      );
      // Gần hết hạn mức: chỉ còn gửi thư đặt lại mật khẩu.
      if (job.template !== 'RESET_PASSWORD') return;
    }

    const link = `${deps.appOrigin}${EMAIL_LINK_PATH[job.template]}#token=${job.token}`;
    const rendered = await renderEmail(job.template, link);

    try {
      await deps.email.send({ to: job.to, ...rendered });
    } catch (error) {
      if (error instanceof EmailRejectedError) {
        deps.logger.warn(
          { job: 'email.transactional', template: job.template, responseCode: error.responseCode },
          'email rejected',
        );
        return;
      }
      throw error;
    }

    deps.logger.info(
      {
        job: 'email.transactional',
        template: job.template,
        durationMs: deps.clock.now().getTime() - started,
      },
      'email sent',
    );
  };
}
