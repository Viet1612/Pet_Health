import { ApiError } from '@ph/api-client';
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { api, setCsrfToken, unwrap } from '../../api/client';
import { locale } from '../../i18n';
import { adoptAccountLocale, setLocale, type Locale } from '../../i18n/locale';

export interface SessionUser {
  id: string;
  email: string;
  emailVerified: boolean;
  timezone: string;
  locale: Locale;
  createdAt: string;
}

export interface Session {
  user: SessionUser;
  csrfToken: string;
}

export const SESSION_KEY = ['session'] as const;

/** Phiên hiện tại; `null` khi chưa đăng nhập (401). */
export const sessionQuery = queryOptions({
  queryKey: SESSION_KEY,
  queryFn: async (): Promise<Session | null> => {
    try {
      const data = unwrap(await api.GET('/auth/session'));
      setCsrfToken(data.csrfToken);
      adoptAccountLocale(data.user.locale, locale);
      return { user: data.user, csrfToken: data.csrfToken };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setCsrfToken(undefined);
        return null;
      }
      throw error;
    }
  },
  retry: false,
  staleTime: 30_000,
});

export function useSession() {
  return useQuery(sessionQuery);
}

/** Lưu phiên mới vào bộ nhớ của api/ và cache. */
function storeSession(queryClient: QueryClient, session: Session): void {
  setCsrfToken(session.csrfToken);
  queryClient.setQueryData(SESSION_KEY, session);
  adoptAccountLocale(session.user.locale, locale);
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) =>
      unwrap(await api.POST('/auth/login', { body })),
    onSuccess: (session) => {
      storeSession(queryClient, session);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    // Gửi ngôn ngữ đang dùng để email xác minh đúng ngôn ngữ (S4-09).
    mutationFn: async (body: { email: string; password: string; timezone: string }) =>
      unwrap(await api.POST('/auth/register', { body: { ...body, locale } })),
    onSuccess: (session) => {
      storeSession(queryClient, session);
    },
  });
}

/** Lưu ngôn ngữ vào tài khoản rồi áp dụng trên thiết bị này (tải lại trang). */
export function useChangeLocale() {
  return useMutation({
    mutationFn: async (next: Locale) =>
      unwrap(await api.PATCH('/me/locale', { body: { locale: next } })),
    onSuccess: ({ locale: saved }) => {
      setLocale(saved);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.POST('/auth/logout');
    },
    onSettled: () => {
      setCsrfToken(undefined);
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (body: { email: string }) => {
      await api.POST('/auth/password/forgot', { body });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (body: { token: string; newPassword: string }) => {
      await api.POST('/auth/password/reset', { body });
    },
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) =>
      unwrap(await api.POST('/auth/verify-email', { body: { token } })),
    onSuccess: ({ user }) => {
      queryClient.setQueryData<Session | null>(SESSION_KEY, (old) =>
        old ? { ...old, user: { ...old.user, emailVerified: user.emailVerified } } : old,
      );
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async () => {
      await api.POST('/auth/verify-email/resend');
    },
  });
}
