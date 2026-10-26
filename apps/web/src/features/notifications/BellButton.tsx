import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Bell } from 'lucide-react';

import { m } from '../../i18n';
import { summaryQuery } from './queries';

/**
 * CMP-07: chuông 44 × 44 kèm badge số chưa xem = nhắc lịch + hoạt động (F-11); ẩn khi 0, "9+" khi
 * > 9; bấm → Thông báo.
 */
export function BellButton() {
  const { data } = useQuery(summaryQuery);
  const reminders = data?.unreadCount ?? 0;
  const activity = data?.socialUnreadCount ?? 0;
  const n = reminders + activity;
  return (
    <Link
      to="/notifications"
      // Chỉ có hoạt động mới → mở thẳng tab "Hoạt động".
      search={reminders === 0 && activity > 0 ? { tab: 'activity' } : {}}
      aria-label={
        activity > 0
          ? m.notifications.bellBoth(reminders, activity)
          : n > 0
            ? m.notifications.bellUnread(n)
            : m.notifications.bell
      }
      className="text-text hover:bg-surface-2 duration-fast relative inline-flex size-11 items-center justify-center rounded-full transition-colors"
    >
      <Bell size={24} aria-hidden />
      {n > 0 && (
        <span
          aria-hidden
          className="bg-primary text-on-primary text-caption absolute top-1 right-1 inline-flex min-w-5 items-center justify-center rounded-full px-1"
        >
          {n > 9 ? '9+' : String(n)}
        </span>
      )}
    </Link>
  );
}
