import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Newspaper, UserRound } from 'lucide-react';
import { useState } from 'react';

import { m } from '../../i18n';
import { Button, buttonClassName } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { Skeleton } from '../../ui/Skeleton';
import { useSession } from '../session';
import { ProfileFormDialog } from './ProfileFormDialog';
import { myProfileQuery } from './queries';

const t = m.social;

/**
 * Bản tin `/feed`. Chưa có hồ sơ công khai → mời tạo (F-02). Danh sách bài có ở F-06; tạm thời
 * chỉ có lối vào hồ sơ của mình.
 */
export function FeedScreen() {
  const navigate = useNavigate();
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
    <EmptyState
      icon={<Newspaper size={32} />}
      title={t.feedTitle}
      description={t.feedSoon}
      action={
        <Link
          to="/u/$username"
          params={{ username: profile.data.username }}
          className={buttonClassName('secondary')}
        >
          {t.toMyProfile}
        </Link>
      }
    />
  );
}
