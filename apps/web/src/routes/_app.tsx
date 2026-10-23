import { createFileRoute, redirect } from '@tanstack/react-router';

import { AppShell } from '../app/shell/AppShell';
import { sessionQuery } from '../features/session';

/**
 * Trang chủ nuôi: chưa có phiên thì về `/login?next=...` trước khi render hay gọi API dữ liệu nào
 * (US-006 AC 1, FR-AUTH-014).
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.query({ ...sessionQuery, staleTime: 'static' });
    if (!session) {
      redirect({ to: '/login', search: { next: location.href }, throw: true });
    }
    return { session };
  },
  component: AppShell,
});
