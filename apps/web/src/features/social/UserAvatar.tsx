import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { m } from '../../i18n';
import { cx } from '../../ui/cx';
import { initialOf } from '../pets';

export type UserAvatarSize = 32 | 40 | 64 | 96;

const SIZE: Record<UserAvatarSize, string> = {
  32: 'size-8 text-small font-bold',
  40: 'size-10 text-body font-bold',
  64: 'size-16 text-h2',
  96: 'size-24 text-display',
};

/**
 * Ảnh đại diện hồ sơ công khai (F-02): thumbnail đã ký, hoặc chữ cái đầu. URL hết hạn (403) →
 * tải lại dữ liệu mạng xã hội một lần để lấy URL mới.
 */
export function UserAvatar({
  profile,
  size,
  className,
}: {
  profile: { displayName: string; avatarThumbUrl: string | null; avatarUrl?: string | null };
  size: UserAvatarSize;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const refetched = useRef(false);
  const [broken, setBroken] = useState(false);
  const src = size >= 96 ? (profile.avatarUrl ?? profile.avatarThumbUrl) : profile.avatarThumbUrl;

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={m.social.avatarAlt(profile.displayName)}
        className={cx('shrink-0 rounded-full object-cover', SIZE[size], className)}
        onError={() => {
          if (refetched.current) {
            setBroken(true);
            return;
          }
          refetched.current = true;
          void queryClient.invalidateQueries({ queryKey: ['social'] });
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cx(
        'bg-primary-soft text-primary-soft-fg inline-flex shrink-0 items-center justify-center rounded-full',
        SIZE[size],
        className,
      )}
    >
      {initialOf(profile.displayName)}
    </span>
  );
}
