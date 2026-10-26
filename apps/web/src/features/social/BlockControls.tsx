import { MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { IconButton } from '../../ui/IconButton';
import { useToast } from '../../ui/toast';
import { useBlock } from './queries';

const t = m.social.block;

/** Hỏi lại rồi chặn (F-12); xong thì báo toast và gọi `onBlocked`. */
export function BlockConfirm({
  username,
  open,
  onClose,
  onBlocked,
}: {
  username: string;
  open: boolean;
  onClose: () => void;
  onBlocked?: () => void;
}) {
  const toast = useToast();
  const block = useBlock(username);
  return (
    <ConfirmDialog
      open={open}
      title={t.confirmTitle(username)}
      description={t.confirmBody}
      confirmLabel={t.confirm}
      loading={block.isPending}
      onConfirm={() => {
        // `mutateAsync`: dữ liệu làm mới có thể gỡ nút khỏi màn trước khi xong; vẫn báo kết quả.
        block.mutateAsync(true).then(
          () => {
            toast.show({ kind: 'success', message: t.blocked(username) });
            onClose();
            onBlocked?.();
          },
          (err: unknown) => {
            const msg = toUserMessage(err);
            toast.show({
              kind: 'error',
              message: 'message' in msg ? msg.message : m.error.serverToast,
            });
            onClose();
          },
        );
      }}
      onClose={onClose}
    />
  );
}

/** Nút "Bỏ chặn" (hồ sơ người mình đã chặn, Cài đặt → Đã chặn). */
export function UnblockButton({
  username,
  fullWidth = false,
}: {
  username: string;
  fullWidth?: boolean;
}) {
  const toast = useToast();
  const block = useBlock(username);
  return (
    <Button
      variant="secondary"
      fullWidth={fullWidth}
      loading={block.isPending}
      onClick={() => {
        // Bỏ chặn xong, danh sách làm mới gỡ nút này khỏi màn: dùng `mutateAsync` để vẫn báo.
        block.mutateAsync(false).then(
          () => {
            toast.show({ kind: 'success', message: t.unblocked(username) });
          },
          (err: unknown) => {
            const msg = toUserMessage(err);
            toast.show({
              kind: 'error',
              message: 'message' in msg ? msg.message : m.error.serverToast,
            });
          },
        );
      }}
    >
      {t.unblock}
    </Button>
  );
}

/** Nút "⋯" có mục "Chặn @username" (hồ sơ, bài của người khác). */
export function UserMenu({ username, onBlocked }: { username: string; onBlocked?: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative shrink-0">
      <IconButton
        aria-label={t.menu}
        aria-haspopup="menu"
        aria-expanded={open}
        icon={<MoreHorizontal size={22} />}
        onClick={() => {
          setOpen((v) => !v);
        }}
      />
      {open && (
        <div
          role="menu"
          className="border-divider bg-surface shadow-overlay absolute top-12 right-0 z-30 min-w-48 rounded-md border py-1"
        >
          <button
            type="button"
            role="menuitem"
            className="text-body text-danger hover:bg-surface-2 flex min-h-11 w-full items-center px-4"
            onClick={() => {
              setOpen(false);
              setConfirming(true);
            }}
          >
            {t.block(username)}
          </button>
        </div>
      )}
      <BlockConfirm
        username={username}
        open={confirming}
        onClose={() => {
          setConfirming(false);
        }}
        {...(onBlocked ? { onBlocked } : {})}
      />
    </div>
  );
}
