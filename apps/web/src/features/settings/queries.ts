import type { paths } from '@ph/api-client';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { api, setCsrfToken, unwrap } from '../../api/client';

export type Me = paths['/me']['get']['responses'][200]['content']['application/json']['user'];

export const ME_KEY = ['me'] as const;

export const meQuery = queryOptions({
  queryKey: ME_KEY,
  queryFn: async (): Promise<Me> => unwrap(await api.GET('/me')).user,
  staleTime: 0,
});

/** Đổi múi giờ: mọi "hôm nay" đổi theo nên làm mới toàn bộ cache. */
export function useUpdateTimezone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (timezone: string) => unwrap(await api.PATCH('/me', { body: { timezone } })),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: { currentPassword: string; newPassword: string }) => {
      await api.POST('/me/password', { body });
    },
  });
}

export function useChangeEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { newEmail: string; password: string }) => {
      await api.POST('/me/email', { body });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_KEY }),
  });
}

/** Xóa tài khoản: xóa mọi trạng thái phía client (cache, CSRF, lựa chọn, bản nháp). */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      await api.DELETE('/me', { body: { password } });
    },
    onSuccess: () => {
      setCsrfToken(undefined);
      queryClient.clear();
      try {
        localStorage.removeItem('ph.selectedPetId');
        localStorage.removeItem('ph.dashboardFilter');
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith('ph.draft.')) sessionStorage.removeItem(key);
        }
      } catch {
        // Storage bị chặn: không có gì để xóa.
      }
    },
  });
}
