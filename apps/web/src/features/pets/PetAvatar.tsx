import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { vi } from '../../i18n/vi';
import { cx } from '../../ui/cx';
import { initialOf } from './format';
import { PETS_KEY } from './queries';

export type PetAvatarSize = 24 | 32 | 64 | 96 | 112;

const SIZE: Record<PetAvatarSize, string> = {
  24: 'size-6 text-caption',
  32: 'size-8 text-small font-bold',
  64: 'size-16 text-h2',
  96: 'size-24 text-display',
  112: 'size-28 text-display',
};

/**
 * Ảnh đại diện thú cưng: thumbnail đã ký, hoặc chữ cái đầu trên nền primary-soft. URL hết hạn
 * (403) → tải lại danh sách một lần để lấy URL mới.
 */
export function PetAvatar({
  pet,
  size,
  className,
}: {
  pet: { name: string; avatarThumbUrl: string | null; avatarUrl?: string | null };
  size: PetAvatarSize;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const refetched = useRef(false);
  const [broken, setBroken] = useState(false);
  const src = size >= 96 ? (pet.avatarUrl ?? pet.avatarThumbUrl) : pet.avatarThumbUrl;

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={vi.pets.avatarAlt(pet.name)}
        className={cx('shrink-0 rounded-full object-cover', SIZE[size], className)}
        onError={() => {
          if (refetched.current) {
            setBroken(true);
            return;
          }
          refetched.current = true;
          void queryClient.invalidateQueries({ queryKey: PETS_KEY });
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
      {initialOf(pet.name)}
    </span>
  );
}
