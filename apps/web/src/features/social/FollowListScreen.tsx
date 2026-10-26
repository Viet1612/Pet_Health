import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';

import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { ErrorState } from '../../ui/ErrorState';
import { Skeleton } from '../../ui/Skeleton';
import { PeopleList } from './PeopleList';
import { followListQuery } from './queries';

const t = m.social.follow;

/** Danh sách Người theo dõi / Đang theo dõi của một hồ sơ (F-07), 30 người/trang. */
export function FollowListScreen({
  username,
  side,
}: {
  username: string;
  side: 'followers' | 'following';
}) {
  const list = useInfiniteQuery(followListQuery(username, side));
  const title = side === 'followers' ? t.followers : t.followingList;

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link
          to="/u/$username"
          params={{ username }}
          aria-label={`@${username}`}
          className="hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-full"
        >
          <ChevronLeft size={22} aria-hidden />
        </Link>
        <h1 className="text-h1 min-w-0 truncate">{title}</h1>
      </div>
      {list.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState kind="server" onRetry={() => void list.refetch()} />
      ) : list.data.pages[0]?.items.length === 0 ? (
        <p className="text-body text-text-muted py-6 text-center">
          {side === 'followers' ? t.emptyFollowers : t.emptyFollowing}
        </p>
      ) : (
        <section className="bg-surface shadow-card rounded-lg px-4 py-1">
          <PeopleList people={list.data.pages.flatMap((p) => p.items)} />
          {list.hasNextPage && (
            <div className="py-2">
              <Button
                variant="ghost"
                fullWidth
                loading={list.isFetchingNextPage}
                onClick={() => void list.fetchNextPage()}
              >
                {m.social.feed.more}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
