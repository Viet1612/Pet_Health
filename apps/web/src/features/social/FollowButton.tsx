import { useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { useToast } from '../../ui/toast';
import { useFollow } from './queries';

const t = m.social.follow;

/**
 * Nút Theo dõi (F-07): "Theo dõi" (primary) / "Đang theo dõi" (secondary, chạm → hỏi "Bỏ theo
 * dõi"). Đổi ngay trên giao diện; lỗi thì trả lại trạng thái cũ và báo toast.
 */
export function FollowButton({
  username,
  following,
  fullWidth = false,
  size = 'md',
}: {
  username: string;
  following: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
}) {
  const toast = useToast();
  const mutation = useFollow(username);
  // Hàng trong danh sách không có cache hồ sơ: giữ trạng thái lạc quan tại chỗ.
  const [local, setLocal] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);
  const shown = local ?? following;

  const run = (next: boolean) => {
    setLocal(next);
    mutation.mutate(next, {
      onError: (err) => {
        setLocal(!next);
        const msg = toUserMessage(err);
        toast.show({
          kind: 'error',
          message: 'message' in msg ? msg.message : m.error.serverToast,
        });
      },
    });
  };

  return (
    <>
      <Button
        variant={shown ? 'secondary' : 'primary'}
        fullWidth={fullWidth}
        aria-pressed={shown}
        className={size === 'sm' ? 'shrink-0 px-3' : undefined}
        onClick={() => {
          if (shown) setConfirming(true);
          else run(true);
        }}
      >
        {shown ? t.following : t.follow}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={t.unfollowTitle(username)}
        description={t.unfollowBody}
        confirmLabel={t.unfollow}
        onConfirm={() => {
          setConfirming(false);
          run(false);
        }}
        onClose={() => {
          setConfirming(false);
        }}
      />
    </>
  );
}
