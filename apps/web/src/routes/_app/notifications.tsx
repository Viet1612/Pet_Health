import { createFileRoute } from '@tanstack/react-router';

import { listQuery, NotificationsScreen } from '../../features/notifications';
import { m } from '../../i18n';

/** SCR-17 · Thông báo. */
export const Route = createFileRoute('/_app/notifications')({
  loader: ({ context }) => context.queryClient.infiniteQuery(listQuery),
  staticData: { title: m.notifications.title },
  component: NotificationsScreen,
});
