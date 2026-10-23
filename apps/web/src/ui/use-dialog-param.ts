import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback } from 'react';

/**
 * Đồng bộ trạng thái mở dialog với `?dialog=<name>` để nút Back của trình duyệt đóng dialog.
 */
export function useDialogParam(name: string): {
  open: boolean;
  show: () => void;
  close: () => void;
} {
  const dialog = useSearch({
    strict: false,
    select: (s: Record<string, unknown>) => s.dialog,
  });
  const navigate = useNavigate();
  const open = dialog === name;

  const show = useCallback(() => {
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({ ...prev, dialog: name }),
    } as never);
  }, [name, navigate]);

  const close = useCallback(() => {
    // Mở bằng show() thì lùi lịch sử; mở thẳng từ URL thì bỏ tham số.
    if (window.history.length > 1) window.history.back();
    else
      void navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => ({ ...prev, dialog: undefined }),
        replace: true,
      } as never);
  }, [navigate]);

  return { open, show, close };
}
