export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailPort {
  send(message: EmailMessage): Promise<void>;
}

/** Máy chủ SMTP từ chối hẳn (mã 5xx, ví dụ địa chỉ không tồn tại): không thử lại. */
export class EmailRejectedError extends Error {
  constructor(readonly responseCode: number) {
    super(`SMTP từ chối thư (mã ${String(responseCode)})`);
    this.name = 'EmailRejectedError';
  }
}
