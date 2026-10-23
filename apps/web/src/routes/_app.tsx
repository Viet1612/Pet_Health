import { createFileRoute } from '@tanstack/react-router';

import { AppShell } from '../app/shell/AppShell';

// Route guard (chưa đăng nhập → /login) thêm ở S1-07.
export const Route = createFileRoute('/_app')({
  component: AppShell,
});
