import './ui/tokens.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createQueryClient } from './app/query-client';
import { locale } from './i18n';
import { watchConnection } from './lib/online';
import { probeHealth } from './api/health';
import { routeTree } from './routeTree.gen';
import { ToastProvider } from './ui/toast';
import { screenOf, startAnalytics, track } from './api/analytics';

document.documentElement.lang = locale;

const queryClient = createQueryClient();
// Có mạng lại → làm mới dữ liệu đang hiện (ST-01).
watchConnection(
  probeHealth,
  () => void queryClient.invalidateQueries({ type: 'active' }),
  () => {
    track('offline_banner_shown', { screen: screenOf(window.location.pathname) });
  },
);
startAnalytics();

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Loader luôn lấy dữ liệu mới (FR-GEN-008).
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Thiếu #root');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
