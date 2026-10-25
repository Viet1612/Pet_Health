import { ApiError, NetworkError, TimeoutError } from '@ph/api-client';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { markOffline } from '../lib/online';
import { trackClientError } from '../api/analytics';

/** Lỗi có mã HTTP (api-client ở S0-08 ném lỗi dạng này). */
function httpStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return typeof error.status === 'number' ? error.status : undefined;
  }
  return undefined;
}

/**
 * Dữ liệu server luôn mới (FR-GEN-008, SAD §2.1.2): không cache giữa các lần mở màn hình.
 * Đọc: không retry lỗi 4xx, retry 1 lần lỗi mạng/5xx. Mutation không retry.
 */
export function createQueryClient(): QueryClient {
  // Lỗi mạng (không phải timeout) ở bất kỳ query/mutation nào → hiện banner mất kết nối.
  const onError = (error: unknown) => {
    if (error instanceof NetworkError) {
      markOffline();
      trackClientError('NETWORK');
    } else if (error instanceof TimeoutError) {
      trackClientError('TIMEOUT');
    } else if (error instanceof ApiError && error.status >= 500) {
      trackClientError(error.code);
    }
  };
  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 5 * 60_000,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          const status = httpStatus(error);
          if (status !== undefined && status >= 400 && status < 500) return false;
          return failureCount < 1;
        },
      },
      mutations: { retry: false },
    },
  });
}
