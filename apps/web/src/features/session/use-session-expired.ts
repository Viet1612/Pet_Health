import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';

import { SESSION_EXPIRED_EVENT, setCsrfToken } from '../../api/client';
import { SESSION_KEY } from './session-api';

/** Nghe 401 từ API client: xóa phiên trong cache, về /login?next=<hiện tại>&expired=1. */
export function useSessionExpiredRedirect(): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    const onExpired = () => {
      const { pathname, href } = router.state.location;
      setCsrfToken(undefined);
      queryClient.setQueryData(SESSION_KEY, null);
      if (pathname === '/login') return;
      void navigate({ to: '/login', search: { next: href, expired: 1 } });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    };
  }, [queryClient, navigate, router]);
}
