import { createApiClient, type Problem } from '@ph/api-client';

/** CSRF token lấy từ `GET /auth/session` (gán ở S1-07), chỉ giữ trong bộ nhớ. */
let csrfToken: string | undefined;

export function setCsrfToken(token: string | undefined): void {
  csrfToken = token;
}

/** Phát khi API trả 401 (phiên hết hạn); S6-03 lắng nghe để lưu bản nháp và về /login. */
export const SESSION_EXPIRED_EVENT = 'ph:session-expired';

export const api = createApiClient({
  baseUrl: '/api/v1',
  getCsrfToken: () => csrfToken,
  onUnauthorized: (problem: Problem) => {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: problem }));
  },
});
