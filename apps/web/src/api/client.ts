import { createApiClient, type Problem } from '@ph/api-client';

/** CSRF token lấy từ register/login/`GET /auth/session`, chỉ giữ trong bộ nhớ. */
let csrfToken: string | undefined;

export function setCsrfToken(token: string | undefined): void {
  csrfToken = token;
}

/** Phát khi một request có phiên nhận 401 (phiên hết hạn); root route đưa về /login. */
export const SESSION_EXPIRED_EVENT = 'ph:session-expired';

/** 401 của các lời gọi này là kết quả bình thường, không phải "phiên hết hạn". */
const IGNORE_401 = new Set(['/api/v1/auth/session', '/api/v1/auth/login']);

export const api = createApiClient({
  baseUrl: '/api/v1',
  getCsrfToken: () => csrfToken,
  onUnauthorized: (problem: Problem, request) => {
    if (IGNORE_401.has(request.path)) return;
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: problem }));
  },
});

/** `data` luôn có khi request thành công (client ném lỗi cho mọi phản hồi không 2xx). */
export function unwrap<T>(result: { data?: T }): T {
  if (result.data === undefined) throw new Error('Phản hồi rỗng');
  return result.data;
}
