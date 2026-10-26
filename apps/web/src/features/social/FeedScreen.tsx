import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Plus, RefreshCw, Search, UserRound } from 'lucide-react';
import { useState } from 'react';

import { m } from '../../i18n';
import { Button, buttonClassName } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { Skeleton } from '../../ui/Skeleton';
import { useSession } from '../session';
import { FeedList } from './FeedList';
import { ProfileFormDialog } from './ProfileFormDialog';
import { FEED_KEY, myProfileQuery } from './queries';

const t = m.social;

/**
 * Bản tin `/feed`. Chưa có hồ sơ công khai → mời tạo (F-02); có rồi → danh sách bài của mình và
 * người đang theo dõi (F-08), nút Tìm người, Đăng bài.
 */
export function FeedScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const profile = useQuery(myProfileQuery);
  const [creating, setCreating] = useState(false);

  if (profile.isPending) return <Skeleton className="h-48 rounded-lg" />;
  if (profile.isError) return <ErrorState kind="server" onRetry={() => void profile.refetch()} />;

  if (!profile.data) {
    return (
      <>
        <EmptyState
          icon={<UserRound size={32} />}
          title={t.createTitle}
          description={t.createLead}
          action={
            <Button
              onClick={() => {
                setCreating(true);
              }}
            >
              {t.createSubmit}
            </Button>
          }
        />
        {creating && (
          <ProfileFormDialog
            profile={null}
            suggestedName={session?.user.nickname}
            onClose={() => {
              setCreating(false);
            }}
            onSaved={(p) => void navigate({ to: '/u/$username', params: { username: p.username } })}
          />
        )}
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-h1 min-w-0 flex-1">{t.feedTitle}</h1>
        <Button
          variant="ghost"
          icon={<RefreshCw size={18} />}
          className="hidden md:inline-flex"
          onClick={() => {
            window.scrollTo({ top: 0 });
            void queryClient.resetQueries({ queryKey: FEED_KEY });
          }}
        >
          {t.feed.refresh}
        </Button>
        <Link
          to="/search"
          aria-label={t.search.open}
          className="hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-full"
        >
          <Search size={22} aria-hidden />
        </Link>
        <Link to="/feed/new" className={buttonClassName('primary')}>
          <Plus size={20} aria-hidden />
          {t.composer.newPost}
        </Link>
      </div>
      <FeedList />
    </div>
  );
}
