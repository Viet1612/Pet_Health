import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Plus, RefreshCw, Search, UserRound } from 'lucide-react';
import { useState } from 'react';

import { m } from '../../i18n';
import { Button, buttonClassName } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { cx } from '../../ui/cx';
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
      {/* Tiêu đề đã có ở TopBar (≥ 768 px) và nút điều hướng: chỉ giữ cho trình đọc màn hình. */}
      <h1 className="sr-only">{t.feedTitle}</h1>
      <div className="flex items-center gap-2">
        <Link
          to="/search"
          className="border-border bg-surface text-text-muted hover:bg-surface-2 text-body flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-full border px-4"
        >
          <Search size={18} aria-hidden className="shrink-0" />
          <span className="truncate">{t.search.placeholder}…</span>
        </Link>
        <Button
          variant="ghost"
          icon={<RefreshCw size={18} />}
          className="max-md:hidden"
          onClick={() => {
            window.scrollTo({ top: 0 });
            void queryClient.resetQueries({ queryKey: FEED_KEY });
          }}
        >
          {t.feed.refresh}
        </Button>
        <Link
          to="/feed/new"
          aria-label={t.composer.newPost}
          className="bg-primary text-on-primary inline-flex size-11 shrink-0 items-center justify-center rounded-full shadow-sm hover:opacity-90 md:hidden"
        >
          <Plus size={24} aria-hidden />
        </Link>
        <Link to="/feed/new" className={cx(buttonClassName('primary'), 'max-md:hidden')}>
          <Plus size={20} aria-hidden />
          {t.composer.newPost}
        </Link>
      </div>
      <FeedList />
    </div>
  );
}
