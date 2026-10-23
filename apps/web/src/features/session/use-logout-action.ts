import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';

import { useLogout } from './session-api';

/** Đăng xuất rồi về /login; lỗi mạng vẫn xóa phiên phía client (useLogout.onSettled). */
export function useLogoutAction() {
  const logout = useLogout();
  const navigate = useNavigate();
  const run = useCallback(async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // Cookie phía server sẽ hết hạn; client đã bị xóa trạng thái.
    }
    await navigate({ to: '/login' });
  }, [logout, navigate]);
  return { run, isPending: logout.isPending };
}
