import { useInfiniteQuery } from '@tanstack/react-query';
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

const t = m.notifications;

/** SCR-17 · Thông báo (8:364): nhóm theo ngày, mới nhất trước, cuộn tải thêm. */
export function NotificationsScreen() {
  const router = useRouter();
  const toast = useToast();
  const markRead = useMarkRead();
  const query = useInfiniteQuery(listQuery);
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

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
        {hasUnread && first && (
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

      {query.isPending ? (
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
