import { createFileRoute, redirect } from '@tanstack/react-router';

import { AuthLayout } from '../app/shell/AuthLayout';
import { sessionQuery } from '../features/session';

/** Trang khách: đã có phiên thì về Tổng quan. `/verify-email` mở cho mọi người. */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    if (location.pathname === '/verify-email') return;
    const session = await context.queryClient.query({ ...sessionQuery, staleTime: 'static' });
    if (session) redirect({ to: '/', throw: true });
  },
  component: AuthLayout,
});
