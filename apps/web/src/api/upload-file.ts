import { ApiError, NetworkError, TimeoutError, type Problem } from '@ph/api-client';

import { getCsrfToken, SESSION_EXPIRED_EVENT } from './client';

const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * Gửi một tệp multipart (field `file`) bằng XMLHttpRequest để có tiến trình tải lên (fetch không
 * có `upload.onprogress`). Lỗi ném giống api-client: `ApiError`, `TimeoutError`, `NetworkError`.
 */
export function uploadFile<T>(options: {
  method: 'PUT' | 'POST';
  path: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method, `/api/v1${options.path}`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.withCredentials = true;
    const csrf = getCsrfToken();
    if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) options.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
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
      reject(new NetworkError());
    };
    xhr.ontimeout = () => {
      reject(new TimeoutError());
    };

    const form = new FormData();
    form.append('file', options.file);
    xhr.send(form);
  });
}
