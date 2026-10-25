import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AlertCircle, Clock, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '../../api/client';
import { m } from '../../i18n';
import { formatDate, formatDayMonth } from '../../lib/format';
import { cx } from '../../ui/cx';
import { IconButton } from '../../ui/IconButton';
import { useToast } from '../../ui/toast';
import { typeLabel } from '../milestones';
import type { DashboardBanner } from './queries';
import { track } from '../../api/analytics';

const t = m.dashboard.banner;
/** Mỗi bộ nhắc chỉ ghi `banner_shown` một lần mỗi lần tải trang. */
const shownBanners = new Set<string>();

/** Câu chính của banner theo mức nhắc khẩn cấp nhất (FR-NTF-009). */
export function bannerText(top: DashboardBanner['top']): string {
  const type = top.note ? `${typeLabel(top.type)} (${top.note})` : typeLabel(top.type);
  const days = top.daysUntilDue ?? 0;
  return top.level === 'OVERDUE'
    ? t.overdue(type, top.petName, -days, formatDayMonth(top.dueOn))
    : t.upcoming(type, top.petName, m.notifications.label(days), formatDate(top.dueOn));
}

/**
 * CMP-06 ReminderBanner: nhắc khẩn cấp nhất + "+N nhắc khác". Quá hạn màu đỏ, D1/D7 màu cam,
 * luôn có chữ. "✕" ẩn ngay rồi đánh dấu đã xem các nhắc banner đang tóm tắt (`reason: BANNER`).
 */
export function ReminderBanner({
  banner,
  onDone,
}: {
  banner: DashboardBanner;
  onDone: (milestoneId: string) => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  // Ẩn lạc quan theo đúng bộ nhắc đang hiện; banner đổi (nhắc khác) thì hiện lại.
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);
  const key = banner.notificationIds.join(',');
  useEffect(() => {
    if (shownBanners.has(key)) return;
    shownBanners.add(key);
    track('banner_shown', {
      level: banner.top.level.toLowerCase(),
      unread_count: banner.moreCount + 1,
    });
  }, [key, banner]);
  if (hiddenFor === key) return null;

  const { top } = banner;
  const overdue = top.level === 'OVERDUE';
  const Icon = overdue ? AlertCircle : Clock;

  const dismiss = async () => {
    setHiddenFor(key);
    track('banner_dismissed', { unread_count: banner.moreCount + 1 });
    try {
      await api.POST('/notifications/read', {
        body: { ids: banner.notificationIds, reason: 'BANNER' },
      });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      setHiddenFor(null);
      toast.show({
        kind: 'error',
        message: m.routines.saveFailed,
        onRetry: () => void dismiss(),
      });
    }
  };

  return (
    <section
      role="region"
      aria-label={t.region}
      className={cx(
        'flex items-start gap-3 rounded-lg border-l-4 p-3',
        overdue ? 'bg-danger-bg border-danger' : 'bg-warning-bg border-warning',
      )}
    >
      <Icon
        size={24}
        aria-hidden
        className={cx('mt-0.5 shrink-0', overdue ? 'text-danger' : 'text-warning')}
      />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{bannerText(top)}</p>
        {banner.moreCount > 0 && (
          <p className="text-small text-text-muted">{t.more(banner.moreCount)}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="text-small bg-surface border-border min-h-11 rounded-md border px-3 font-semibold"
            onClick={() => {
              onDone(top.milestoneId);
            }}
          >
            {t.done}
          </button>
          <Link
            to="/notifications"
            className="text-small text-primary inline-flex min-h-11 items-center px-3 font-semibold"
          >
            {t.view}
          </Link>
        </div>
      </div>
      <IconButton aria-label={t.close} icon={<X size={20} />} onClick={() => void dismiss()} />
    </section>
  );
}
