import { ApiError, NetworkError, TimeoutError, type Problem } from '@ph/api-client';

import { getCsrfToken, SESSION_EXPIRED_EVENT } from './client';

const UPLOAD_TIMEOUT_MS = 120_000;
/** Không có sự kiện tiến trình trong 10 s → hủy (mạng treo). */
const STALL_MS = 10_000;

/**
 * Gửi một tệp multipart (field `file`) bằng XMLHttpRequest để có tiến trình tải lên (fetch không
 * có `upload.onprogress`). Lỗi ném giống api-client: `ApiError`, `TimeoutError`, `NetworkError`.
 */
export function uploadFile<T>(options: {
  method: 'PUT' | 'POST';
  path: string;
  file: File;
  onProgress?: (percent: number) => void;
  headers?: Record<string, string>;
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method, `/api/v1${options.path}`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.withCredentials = true;
    const csrf = getCsrfToken();
    if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf);
    for (const [name, value] of Object.entries(options.headers ?? {})) {
      xhr.setRequestHeader(name, value);
    }

    let stalled = false;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    const armStall = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        stalled = true;
        xhr.abort();
      }, STALL_MS);
    };
    xhr.upload.onloadend = () => {
      // Đã gửi xong body: chờ phản hồi theo `xhr.timeout`, không theo tiến trình nữa.
      clearTimeout(stallTimer);
    };
    xhr.onabort = () => {
      clearTimeout(stallTimer);
      reject(stalled ? new TimeoutError() : new NetworkError());
    };

    xhr.upload.onprogress = (e) => {
      armStall();
      if (e.lengthComputable) options.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      clearTimeout(stallTimer);
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T);
        return;
      }
      const problem: Problem =
        body && typeof body === 'object' && 'code' in body
          ? (body as Problem)
          : {
              type: 'about:blank',
              title: xhr.statusText,
              status: xhr.status,
              code: 'UNEXPECTED_RESPONSE',
            };
      if (xhr.status === 401) {
        window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: problem }));
      }
      reject(new ApiError(problem));
    };
    xhr.onerror = () => {
      clearTimeout(stallTimer);
      reject(new NetworkError());
    };
    xhr.ontimeout = () => {
      reject(new TimeoutError());
    };

    const form = new FormData();
    form.append('file', options.file);
    armStall();
    xhr.send(form);
  });
}
