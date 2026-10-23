/** Lỗi RFC 9457 từ API (SAD §2.4.3). */
export interface Problem {
  type: string;
  title: string;
  status: number;
  code: string;
  errors?: { field: string; code: string; message: string }[];
  ref?: string;
  retryAfter?: number;
}

/** Phản hồi không 2xx. */
export class ApiError extends Error {
  constructor(readonly problem: Problem) {
    super(problem.title || problem.code);
    this.name = 'ApiError';
  }

  get status(): number {
    return this.problem.status;
  }

  get code(): string {
    return this.problem.code;
  }

  get ref(): string | undefined {
    return this.problem.ref;
  }
}

/** Quá hạn chờ phản hồi (10 s ghi, 15 s đọc). */
export class TimeoutError extends Error {
  constructor() {
    super('Hết thời gian chờ phản hồi');
    this.name = 'TimeoutError';
  }
}

/** Không gửi được request (mất mạng, DNS). */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Lỗi kết nối mạng', { cause });
    this.name = 'NetworkError';
  }
}

/** Đọc phản hồi lỗi thành `Problem`; phản hồi không phải problem+json (ví dụ 502 HTML) → tổng hợp. */
export async function readProblem(response: Response): Promise<Problem> {
  const retryHeader = response.headers.get('retry-after');
  const retryAfter = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : undefined;
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/problem+json')) {
    try {
      const body = (await response.json()) as Problem;
      return retryAfter !== undefined && body.retryAfter === undefined
        ? { ...body, retryAfter }
        : body;
    } catch {
      // Rơi xuống trường hợp tổng hợp.
    }
  }

  return {
    type: 'about:blank',
    title: '',
    status: response.status,
    code: 'UNEXPECTED_RESPONSE',
    ...(retryAfter !== undefined ? { retryAfter } : {}),
  };
}
