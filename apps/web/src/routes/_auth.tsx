import { createFileRoute } from '@tanstack/react-router';

import { AuthLayout } from '../app/shell/AppShell';

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
});
