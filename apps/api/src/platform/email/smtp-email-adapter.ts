import nodemailer, { type Transporter } from 'nodemailer';

import type { Config } from '../../config.js';
import { EmailRejectedError, type EmailMessage, type EmailPort } from './email-port.js';

/** Gửi qua SMTP (Mailpit / Gmail, AD-008): 1 kết nối, giữ kết nối, timeout 10 s / 30 s. */
export class SmtpEmailAdapter implements EmailPort {
  private readonly transport: Transporter;

  constructor(
    config: Pick<
      Config,
      'SMTP_HOST' | 'SMTP_PORT' | 'SMTP_SECURE' | 'SMTP_USER' | 'SMTP_PASS' | 'SMTP_FROM'
    >,
  ) {
    this.from = config.SMTP_FROM;
    this.transport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      ...(config.SMTP_USER ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASS } } : {}),
      pool: true,
      maxConnections: 1,
      connectionTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }

  private readonly from: string;

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transport.sendMail({ from: this.from, ...message });
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'responseCode' in error
          ? Number(error.responseCode)
          : undefined;
      if (code !== undefined && code >= 500) throw new EmailRejectedError(code);
      throw error; // 4xx hoặc lỗi mạng → pg-boss thử lại
    }
  }

  close(): void {
    this.transport.close();
  }
}
