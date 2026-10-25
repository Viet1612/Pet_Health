import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Copy, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { m } from '../../i18n';
import { ErrorState } from '../../ui/ErrorState';
import { profilePostsQuery } from './queries';

const t = m.social;

/** Lưới 3 cột bài đã đăng của hồ sơ (F-06); cuộn tới cuối tự tải trang kế. */
export function ProfileGrid({ username }: { username: string }) {
  const grid = useInfiniteQuery(profilePostsQuery(username));
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = grid;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (grid.isPending) {
    return (
      <div aria-busy="true" className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-surface-2 aspect-square animate-pulse" />
        ))}
      </div>
    );
  }
  if (grid.isError) return <ErrorState kind="server" onRetry={() => void grid.refetch()} />;

  const items = grid.data.pages.flatMap((p) => p.items);
  if (items.length === 0) {
    return <p className="text-body text-text-muted py-8 text-center">{t.noPosts}</p>;
  }
  return (
    <section aria-label={t.post.grid}>
      <ul className="m-0 grid list-none grid-cols-3 gap-0.5 p-0">
        {items.map((item, i) => (
          <li key={item.id} className="bg-surface-2 relative aspect-square overflow-hidden">
            <Link
              to="/p/$postId"
              params={{ postId: item.id }}
              aria-label={t.post.open(i + 1)}
              className="block size-full"
            >
              {item.thumbUrl && (
                <img
                  src={item.thumbUrl}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                  onError={() => void grid.refetch()}
                />
              )}
              {item.photoCount > 1 && (
                <span className="absolute top-1.5 right-1.5 text-white drop-shadow">
                  <Copy size={18} aria-label={t.post.multi} />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <div ref={sentinel} aria-hidden className="flex h-12 items-center justify-center">
        {isFetchingNextPage && <Loader2 size={20} className="text-text-muted animate-spin" />}
      </div>
    </section>
  );
}
