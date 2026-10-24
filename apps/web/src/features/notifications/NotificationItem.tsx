import { Link } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';

import { m } from '../../i18n';
import { cx } from '../../ui/cx';
import { MilestoneTypeIcon, typeLabel } from '../milestones';
import { formatDate } from './group-by-day';
import type { AppNotification } from './queries';

const t = m.notifications;

/**
 * Một nhắc: cả dòng là liên kết tới chi tiết mốc. Chưa xem → nền primary-soft, chữ đậm, chấm màu.
 * Đã xử lý → mờ 60%, chip trạng thái, không có nhãn ngày.
 */
export function NotificationItem({
  notification: n,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (n: AppNotification) => void;
}) {
  const title = `${n.petName} · ${typeLabel(n.type)}${n.note ? ` (${n.note})` : ''}`;
  const date = formatDate(n.dueOn);
  const resolved = n.resolution !== null;
  return (
    <Link
      to="/milestones/$milestoneId"
      params={{ milestoneId: n.milestoneId }}
      search={{ from: 'notification' }}
      onClick={() => {
        onOpen(n);
      }}
      className={cx(
        'flex min-h-16 items-center gap-3 rounded-lg border p-3',
        n.unread ? 'bg-primary-soft border-primary-soft' : 'bg-surface border-divider',
        resolved && 'opacity-60',
      )}
    >
      <MilestoneTypeIcon type={n.type} />
      <span className="min-w-0 flex-1">
        <span className={cx('text-body block truncate', n.unread && 'font-bold')}>{title}</span>
        <span className="text-small text-text-muted block truncate">
          {n.level === 'OVERDUE' ? t.dueOverdue(date) : t.due(date)}
          {!resolved && n.label ? ` · ${n.label}` : ''}
        </span>
      </span>
      {resolved && n.resolution ? (
        <span
          className={cx(
            'text-caption inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5',
            n.resolution === 'DONE' ? 'bg-success-bg text-success' : 'bg-neutral-bg text-neutral',
          )}
        >
          {n.resolution === 'DONE' && <CheckCircle2 size={14} aria-hidden />}
          {t.resolution[n.resolution]}
        </span>
      ) : (
        n.unread && (
          <span className="bg-primary size-2.5 shrink-0 rounded-full">
            <span className="sr-only">{t.unread}</span>
          </span>
        )
      )}
    </Link>
  );
}
