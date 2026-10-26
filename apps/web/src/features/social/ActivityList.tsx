import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { m } from '../../i18n';
import { formatRelative } from '../../lib/format';
import { Button } from '../../ui/Button';
import { cx } from '../../ui/cx';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { Skeleton } from '../../ui/Skeleton';
import { activityQuery, readAllActivity, type Activity } from './queries';
import { UserAvatar } from './UserAvatar';

const t = m.social.activity;

function sentence(a: Activity): string {
  const who = a.actors[0]?.username ?? '';
  if (a.kind === 'LIKE') return t.liked(who, Math.max(0, a.actorCount - 1));
  if (a.kind === 'COMMENT') return t.commented(who);
  return t.followed(who);
}

function ActivityRow({ item }: { item: Activity }) {
  const first = item.actors[0];
  const body = (
    <>
      {first ? (
        <UserAvatar profile={first} size={40} />
      ) : (
        <span className="bg-surface-2 size-10 shrink-0 rounded-full" />
      )}
      <span className="min-w-0 flex-1">
        <span className="text-body block">
          {sentence(item)}
          {item.commentExcerpt && <span className="text-text-muted"> “{item.commentExcerpt}”</span>}
        </span>
        <time dateTime={item.createdAt} className="text-caption text-text-muted">
          {formatRelative(item.createdAt)}
          {item.unread && <span className="text-primary ml-2 font-semibold">· {t.unread}</span>}
        </time>
      </span>
      {item.post?.thumbUrl && (
        <img src={item.post.thumbUrl} alt="" className="size-12 shrink-0 rounded object-cover" />
      )}
    </>
  );
  const className = cx(
    'hover:bg-surface-2 flex min-h-14 items-center gap-3 rounded-md px-3 py-2',
    item.unread && 'bg-primary-soft/40',
  );
  if (item.kind === 'FOLLOW' || !item.post) {
    return first ? (
      <Link to="/u/$username" params={{ username: first.username }} className={className}>
        {body}
      </Link>
    ) : (
      <div className={className}>{body}</div>
    );
  }
  return (
    <Link
      to="/p/$postId"
      params={{ postId: item.post.id }}
      hash={item.kind === 'COMMENT' ? 'comments' : undefined}
      className={className}
    >
      {body}
    </Link>
  );
}

/**
 * Tab "Hoạt động" (F-11): tim (gộp theo bài), bình luận, theo dõi. Mở tab → đánh dấu đã xem tới
 * thời điểm mới nhất đang hiện (vẫn tô "Mới" cho lần xem này).
 */
export function ActivityList() {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery(activityQuery);
  const marked = useRef(false);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const newest = items[0]?.createdAt;
  const hasUnread = items.some((i) => i.unread);

  useEffect(() => {
    if (!newest || !hasUnread || marked.current) return;
    marked.current = true;
    readAllActivity(newest).then(
      () => queryClient.invalidateQueries({ queryKey: ['notifications', 'summary'] }),
      () => undefined,
    );
  }, [newest, hasUnread, queryClient]);

  if (query.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} shape="list-item" />
        ))}
      </div>
    );
  }
  if (query.isError) return <ErrorState kind="server" onRetry={() => void query.refetch()} />;
  if (items.length === 0) {
    return <EmptyState icon={<Heart size={32} />} title={t.emptyTitle} description={t.emptyBody} />;
  }
  return (
    <div className="flex flex-col gap-2">
      <ul className="bg-surface shadow-card m-0 flex list-none flex-col gap-1 rounded-lg p-2">
        {items.map((item) => (
          <li key={item.id}>
            <ActivityRow item={item} />
          </li>
        ))}
      </ul>
      {query.hasNextPage && (
        <Button
          variant="secondary"
          loading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {m.notifications.loadMore}
        </Button>
      )}
    </div>
  );
}
