import { createFileRoute, useNavigate } from '@tanstack/react-router';

import {
  listQuery,
  NotificationsScreen,
  type NotificationsTab,
} from '../../features/notifications';
import { m } from '../../i18n';

/** SCR-17 · Thông báo: `?tab=activity` mở tab "Hoạt động" (F-11). */
function NotificationsPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <NotificationsScreen
      tab={tab ?? 'reminders'}
      onTab={(next) =>
        void navigate({
          to: '/notifications',
          search: next === 'activity' ? { tab: next } : {},
          replace: true,
        })
      }
    />
  );
}

export const Route = createFileRoute('/_app/notifications')({
  validateSearch: (search: Record<string, unknown>): { tab?: NotificationsTab } =>
    search.tab === 'activity' ? { tab: 'activity' } : {},
  loader: ({ context }) => context.queryClient.infiniteQuery(listQuery),
  staticData: { title: m.notifications.title },
  component: NotificationsPage,
});
