import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Bell } from 'lucide-react';

import { vi } from '../../i18n/vi';
import { summaryQuery } from './queries';

/** CMP-07: chuông 44 × 44 kèm badge số chưa xem (ẩn khi 0, "9+" khi > 9); bấm → Thông báo. */
export function BellButton() {
  const { data } = useQuery(summaryQuery);
  const n = data?.unreadCount ?? 0;
  return (
    <Link
      to="/notifications"
      aria-label={n > 0 ? vi.notifications.bellUnread(n) : vi.notifications.bell}
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
