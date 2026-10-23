import { useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';

import { vi } from '../i18n/vi';

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /** Tiêu đề màn hình: "<title> · Pet Health". */
    title?: string;
  }
}

/** Đổi route: cập nhật `document.title` và chuyển focus tới `h1` của màn hình (NFR-USA). */
export function useRouteTitleAndFocus(): void {
  const { title, pathname } = useRouterState({
    select: (s) => ({
      title: [...s.matches].reverse().find((m) => m.staticData.title)?.staticData.title,
      pathname: s.location.pathname,
    }),
  });

  useEffect(() => {
    document.title = title ? `${title} · ${vi.appName}` : vi.appName;
  }, [title]);

  useEffect(() => {
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (!h1) return;
    if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
    h1.focus({ preventScroll: true });
  }, [pathname]);
}
