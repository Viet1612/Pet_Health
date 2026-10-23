import { QueryClient } from '@tanstack/react-query';

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
  return new QueryClient({
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
