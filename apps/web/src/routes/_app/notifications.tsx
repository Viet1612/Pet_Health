import { createFileRoute } from '@tanstack/react-router';

import { listQuery, NotificationsScreen } from '../../features/notifications';
import { vi } from '../../i18n/vi';

/** SCR-17 · Thông báo. */
export const Route = createFileRoute('/_app/notifications')({
  loader: ({ context }) => context.queryClient.infiniteQuery(listQuery),
  staticData: { title: vi.notifications.title },
  component: NotificationsScreen,
});
