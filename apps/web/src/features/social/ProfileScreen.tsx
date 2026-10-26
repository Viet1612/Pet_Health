import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@ph/api-client';
import { Link } from '@tanstack/react-router';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';

import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { Skeleton } from '../../ui/Skeleton';
import { FollowButton } from './FollowButton';
import { ProfileFormDialog } from './ProfileFormDialog';
import { ProfileGrid } from './ProfileGrid';
import { myProfileQuery, profileQuery, type Profile } from './queries';
import { UserAvatar } from './UserAvatar';

const t = m.social;

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex flex-col items-center">
      <span className="text-h2 font-bold">{value.toLocaleString()}</span>
      <span className="text-caption text-text-muted text-center leading-tight">{label}</span>
    </span>
  );
}

/** Số người theo dõi / đang theo dõi: chạm để xem danh sách (F-07). */
function StatLink({
  value,
  label,
  username,
  side,
}: {
  value: number;
  label: string;
  username: string;
  side: 'followers' | 'following';
}) {
  return (
    <Link
      to={side === 'followers' ? '/u/$username/followers' : '/u/$username/following'}
      params={{ username }}
      className="hover:bg-surface-2 min-h-11 rounded-md px-1"
    >
      <Stat value={value} label={label} />
    </Link>
  );
}

/** Đầu trang hồ sơ (F-02): ảnh, tên, @username, giới thiệu, số bài / theo dõi. */
export function ProfileHeader({ profile, onEdit }: { profile: Profile; onEdit?: () => void }) {
  return (
    <section className="bg-surface shadow-card flex flex-col gap-4 rounded-lg p-4 md:p-6">
      <div className="flex items-center gap-4 md:gap-8">
        <UserAvatar profile={profile} size={96} />
        <div className="flex flex-1 justify-around">
          <Stat value={profile.postCount} label={t.posts} />
          <StatLink
            value={profile.followerCount}
            label={t.followers}
            username={profile.username}
            side="followers"
          />
          <StatLink
            value={profile.followingCount}
            label={t.following}
            username={profile.username}
            side="following"
          />
        </div>
      </div>
      <div>
        <h1 className="text-h2 font-bold">{profile.displayName}</h1>
        <p className="text-small text-text-muted">@{profile.username}</p>
        {profile.bio && <p className="text-body mt-2 whitespace-pre-line">{profile.bio}</p>}
      </div>
      {profile.isMe && onEdit && (
        <Button variant="secondary" fullWidth onClick={onEdit}>
          {t.editProfile}
        </Button>
      )}
      {!profile.isMe && (
        <FollowButton username={profile.username} following={profile.followedByMe} fullWidth />
      )}
    </section>
  );
}

/** SCR hồ sơ công khai `/u/{username}`: đầu hồ sơ + lưới bài 3 cột (F-06). */
export function ProfileScreen({ username }: { username: string }) {
  const profile = useQuery(profileQuery(username));
  const mine = useQuery({ ...myProfileQuery, enabled: profile.data?.isMe === true });
  const [editing, setEditing] = useState(false);

  if (profile.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }
  if (profile.isError) {
    if (profile.error instanceof ApiError && profile.error.status === 404) {
      return <EmptyState icon={<ImageOff size={48} aria-hidden />} title={t.notFound} />;
    }
    return <ErrorState kind="server" onRetry={() => void profile.refetch()} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <ProfileHeader
        profile={profile.data}
        onEdit={() => {
          setEditing(true);
        }}
      />
      <ProfileGrid username={profile.data.username} />
      {editing && mine.data && (
        <ProfileFormDialog
          profile={mine.data}
          onClose={() => {
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
