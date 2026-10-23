import { EmailRejectedError, type EmailMessage, type EmailPort } from './email-port.js';

/** Adapter giả cho test: lưu thư vào `outbox`, giả lập lỗi 4xx/5xx khi cần. */
export class FakeEmailAdapter implements EmailPort {
  readonly outbox: EmailMessage[] = [];
  failWith: number | null = null;

  send(message: EmailMessage): Promise<void> {
    if (this.failWith !== null) {
      if (this.failWith >= 500) return Promise.reject(new EmailRejectedError(this.failWith));
      return Promise.reject(
        Object.assign(new Error('SMTP tạm lỗi'), { responseCode: this.failWith }),
      );
    }
    this.outbox.push(message);
    return Promise.resolve();
  }
}
