import createClient, { type Client } from 'openapi-fetch';

import { ApiError, NetworkError, readProblem, TimeoutError, type Problem } from './errors';
import type { paths } from './schema';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** SAD §4.2.3: ghi 10 s (FR-GEN-004), đọc 15 s. */
export const WRITE_TIMEOUT_MS = 10_000;
export const READ_TIMEOUT_MS = 15_000;

export interface ApiClientOptions {
  baseUrl?: string;
  getCsrfToken: () => string | undefined;
  /** Gọi khi API trả 401; nhận thêm method và đường dẫn để bỏ qua lời gọi kiểm phiên. */
  onUnauthorized?: (problem: Problem, request: { method: string; path: string }) => void;
  fetch?: typeof fetch;
}

export type ApiClient = Client<paths>;

/**
 * Client có type sinh từ `openapi.yaml`. Mọi phản hồi không 2xx bị ném thành `ApiError`, nên
 * `data` của lời gọi thành công luôn có giá trị. Quá hạn → `TimeoutError`; mất mạng → `NetworkError`.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseFetch = options.fetch ?? globalThis.fetch.bind(globalThis);

  const wrappedFetch = async (input: Request): Promise<Response> => {
    const isWrite = WRITE_METHODS.has(input.method.toUpperCase());

    const headers = new Headers(input.headers);
    headers.set('Accept', 'application/json');
    const csrf = isWrite ? options.getCsrfToken() : undefined;
    if (csrf) headers.set('X-CSRF-Token', csrf);

    const timeout = AbortSignal.timeout(isWrite ? WRITE_TIMEOUT_MS : READ_TIMEOUT_MS);
    const signal = AbortSignal.any([input.signal, timeout]);

    let response: Response;
    try {
      response = await baseFetch(new Request(input, { headers, signal }));
    } catch (error) {
      if (timeout.aborted) throw new TimeoutError();
      if (input.signal.aborted) throw error; // người gọi tự hủy (TanStack Query)
      throw new NetworkError(error);
    }

    if (!response.ok) {
      const problem = await readProblem(response);
      if (problem.status === 401) {
        options.onUnauthorized?.(problem, {
          method: input.method.toUpperCase(),
          path: new URL(input.url).pathname,
        });
      }
      throw new ApiError(problem);
    }
    return response;
  };

  return createClient<paths>({
    baseUrl: options.baseUrl ?? '/api/v1',
    credentials: 'same-origin',
    fetch: wrappedFetch,
  });
}
