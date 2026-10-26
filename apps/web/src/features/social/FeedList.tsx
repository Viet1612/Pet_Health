import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowUp, Loader2, Newspaper, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { m } from '../../i18n';
import { Button, buttonClassName } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { Skeleton } from '../../ui/Skeleton';
import { PostCard } from './PostCard';
import { FEED_KEY, feedNewCount, feedQuery } from './queries';

const t = m.social.feed;
const POLL_MS = 60_000;
const PULL_PX = 72;

/** Hỏi "có bài mới?" mỗi 60 s khi tab đang mở (không làm khi tab ẩn). */
function useNewPostCount(since: string | undefined): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!since) return;
    let cancelled = false;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      feedNewCount(since).then(
        (n) => {
          if (!cancelled) setCount(n);
        },
        () => undefined,
      );
    };
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      setCount(0);
    };
  }, [since]);
  return count;
}

/**
 * Kéo xuống ở đầu trang để làm mới (phone). Trả khoảng đã kéo để vẽ chỉ báo; ≥ 72 px khi thả thì
 * gọi `onRefresh`.
 */
function usePullToRefresh(onRefresh: () => void): number {
  const [pull, setPull] = useState(0);
  const start = useRef<number | null>(null);
  const refreshRef = useRef(onRefresh);
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);
  useEffect(() => {
    let distance = 0;
    const down = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 ? (e.touches[0]?.clientY ?? null) : null;
      distance = 0;
    };
    const move = (e: TouchEvent) => {
      if (start.current === null) return;
      distance = Math.max(0, (e.touches[0]?.clientY ?? 0) - start.current);
      setPull(Math.min(distance, PULL_PX * 1.5));
    };
    const up = () => {
      if (start.current !== null && distance >= PULL_PX) refreshRef.current();
      start.current = null;
      setPull(0);
    };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, []);
  return pull;
}

/**
 * Danh sách bản tin (F-08): bài của mình và người đang theo dõi, mới nhất trước, cuộn vô hạn (tải
 * trang kế khi còn khoảng 3 bài). Kéo xuống / nút "Làm mới"; nút nổi "Có bài mới".
 */
export function FeedList() {
  const queryClient = useQueryClient();
  const feed = useInfiniteQuery(feedQuery);
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const newCount = useNewPostCount(items[0]?.createdAt);

  const refresh = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    void queryClient.resetQueries({ queryKey: FEED_KEY });
  };
  const pull = usePullToRefresh(refresh);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      // Khoảng 3 thẻ bài phía trước.
      { rootMargin: '1800px 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (feed.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }
  if (feed.isError) return <ErrorState kind="server" onRetry={() => void feed.refetch()} />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Newspaper size={32} />}
        title={t.emptyTitle}
        description={t.emptyBody}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/search" className={buttonClassName('primary')}>
              {t.findPeople}
            </Link>
            <Link to="/feed/new" className={buttonClassName('secondary')}>
              {t.firstPost}
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {pull > 0 && (
        <div
          aria-hidden
          className="text-text-muted flex items-center justify-center gap-2"
          style={{ height: pull }}
        >
          <RefreshCw
            size={20}
            className={pull >= PULL_PX ? 'text-primary' : undefined}
            style={{ transform: `rotate(${String(pull * 3)}deg)` }}
          />
          {pull >= PULL_PX && <span className="text-small">{t.pullToRefresh}</span>}
        </div>
      )}
      {newCount > 0 && (
        <div className="sticky top-20 z-30 flex justify-center">
          <Button icon={<ArrowUp size={18} />} onClick={refresh} className="shadow-overlay">
            {t.newPosts}
          </Button>
        </div>
      )}
      {feed.isRefetching && !feed.isFetchingNextPage && (
        <div className="flex justify-center">
          <Loader2 size={20} aria-hidden className="text-text-muted animate-spin" />
        </div>
      )}
      {items.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <div ref={sentinel} className="flex min-h-12 items-center justify-center">
        {isFetchingNextPage ? (
          <Loader2 size={20} aria-hidden className="text-text-muted animate-spin" />
        ) : (
          !hasNextPage && <p className="text-small text-text-muted">{t.end}</p>
        )}
      </div>
    </div>
  );
}
