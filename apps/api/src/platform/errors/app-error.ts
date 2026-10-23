export type FieldErrorCode = 'REQUIRED' | 'INVALID_FORMAT' | 'OUT_OF_RANGE' | 'TOO_LONG';

export interface FieldError {
  field: string;
  code: FieldErrorCode | (string & {});
  message: string;
}

export interface AppErrorOptions {
  errors?: FieldError[];
  /** Giây; đặt header `Retry-After` và trường `retryAfter`. */
  retryAfter?: number;
  headers?: Record<string, string>;
}

/** Lỗi nghiệp vụ trả về client dạng problem+json (SAD §2.4.3). */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly title: string,
    readonly options: AppErrorOptions = {},
  ) {
    super(title);
    this.name = new.target.name;
  }
}

/** Không tồn tại hoặc không có quyền: cùng một phản hồi (FR-AUTH-013). */
export class NotFoundError extends AppError {
  constructor(title = 'Không tìm thấy') {
    super(404, 'NOT_FOUND', title);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(title = 'Bạn cần đăng nhập') {
    super(401, 'UNAUTHENTICATED', title);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, title: string, options?: AppErrorOptions) {
    super(409, code, title, options);
  }
}

export class ValidationError extends AppError {
  constructor(errors: FieldError[], title = 'Dữ liệu không hợp lệ') {
    super(422, 'VALIDATION_FAILED', title, { errors });
  }
}

export class RateLimitedError extends AppError {
  constructor(retryAfter: number, title = 'Bạn thao tác quá nhiều lần, vui lòng thử lại sau') {
    super(429, 'RATE_LIMITED', title, { retryAfter });
  }
}
