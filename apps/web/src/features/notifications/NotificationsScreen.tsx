import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { ArrowLeft, BellOff } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { IconButton } from '../../ui/IconButton';
import { Skeleton } from '../../ui/Skeleton';
import { useToast } from '../../ui/toast';
import { groupByDay } from './group-by-day';
import { NotificationItem } from './NotificationItem';
import { listQuery, useMarkRead, type AppNotification } from './queries';
import { track } from '../../api/analytics';
import { cx } from '../../ui/cx';
import { ActivityList } from '../social';
import { SUMMARY_KEY } from './queries';

const t = m.notifications;

export type NotificationsTab = 'reminders' | 'activity';

/** Hai tab "Nhắc lịch" (giữ nguyên S4-05) | "Hoạt động" (F-11). */
function Tabs({ tab, onTab }: { tab: NotificationsTab; onTab: (t: NotificationsTab) => void }) {
  return (
    <div
      role="tablist"
      aria-label={t.title}
      className="bg-surface-2 grid grid-cols-2 gap-1 rounded-full p-1"
    >
      {(['reminders', 'activity'] as const).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          onClick={() => {
            onTab(key);
          }}
          className={cx(
            'text-body min-h-11 rounded-full font-semibold',
            tab === key ? 'bg-surface text-primary-soft-fg shadow-sm' : 'text-text-muted',
          )}
        >
          {t.tabs[key]}
        </button>
      ))}
    </div>
  );
}

/**
 * SCR-17 · Thông báo (8:364). Tab "Nhắc lịch": nhóm theo ngày, mới nhất trước, cuộn tải thêm. Tab
 * "Hoạt động": tim, bình luận, theo dõi (F-11).
 */
export function NotificationsScreen({
  tab = 'reminders',
  onTab = () => undefined,
}: {
  tab?: NotificationsTab;
  onTab?: (t: NotificationsTab) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const markRead = useMarkRead();
  const query = useInfiniteQuery(listQuery);
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const queryClient = useQueryClient();

  useEffect(() => {
    const summary = queryClient.getQueryData<{ unreadCount: number }>(SUMMARY_KEY);
    track('notification_center_opened', { unread_count: summary?.unreadCount ?? 0 });
  }, [queryClient]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const pages = query.data?.pages ?? [];
  const first = pages[0];
  const items = pages.flatMap((p) => p.items);
  const hasUnread = items.some((n) => n.unread);

  const fail = () => {
    toast.show({ kind: 'error', message: m.toast.saveFailed });
  };
  const open = (n: AppNotification) => {
    // Điều hướng vẫn diễn ra; lỗi thì hoàn lại trạng thái chưa xem.
    if (n.unread) markRead({ ids: [n.id] }).catch(fail);
  };

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <div className="flex items-center gap-2">
        <IconButton
          aria-label={t.back}
          icon={<ArrowLeft size={24} />}
          onClick={() => {
            router.history.back();
          }}
        />
        <h1 className="text-h1 flex-1">{t.title}</h1>
        {tab === 'reminders' && hasUnread && first && (
          <Button
            variant="ghost"
            aria-label={t.markAllLabel}
            onClick={() => {
              markRead({ all: true, upTo: first.fetchedAt }).catch(fail);
            }}
          >
            {t.markAll}
          </Button>
        )}
      </div>
      <Tabs tab={tab} onTab={onTab} />

      {tab === 'activity' ? (
        <ActivityList />
      ) : query.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} shape="list-item" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState kind="server" onRetry={() => void query.refetch()} />
      ) : items.length === 0 || !first ? (
        <EmptyState
          icon={<BellOff size={32} />}
          title={t.emptyTitle}
          description={t.emptyDescription}
        />
      ) : (
        <>
          {groupByDay(items, first.today).map((g) => (
            <section key={g.label} className="flex flex-col gap-2">
              <h2 className="text-caption text-text-muted uppercase">{g.label}</h2>
              <ul className="flex flex-col gap-2">
                {g.items.map((n) => (
                  <li key={n.id}>
                    <NotificationItem notification={n} onOpen={open} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {isFetchingNextPage && <Skeleton shape="list-item" />}
          <div ref={sentinel} />
          {hasNextPage && !isFetchingNextPage && (
            <Button variant="secondary" onClick={() => void fetchNextPage()}>
              {t.loadMore}
            </Button>
          )}
          <p className="text-small text-text-muted text-center">{t.footer}</p>
        </>
      )}
    </div>
  );
}
