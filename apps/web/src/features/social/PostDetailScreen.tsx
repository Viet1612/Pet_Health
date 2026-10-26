import { ApiError } from '@ph/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ImageOff, MoreHorizontal, PawPrint, Pencil, Trash2 } from 'lucide-react';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { formatRelative } from '../../lib/format';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { IconButton } from '../../ui/IconButton';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { Skeleton } from '../../ui/Skeleton';
import { TextAreaCounter } from '../../ui/TextAreaCounter';
import { useToast } from '../../ui/toast';
import { petsQuery } from '../pets';
import { CAPTION_MAX } from './composer';
import { PetChips } from './PetChips';
import { CommentsPanel } from './CommentsPanel';
import { LikeBar, useLikeAction } from './LikeBar';
import { PhotoCarousel } from './PhotoCarousel';
import { POST_KEY, postQuery, useDeletePost, useUpdatePost, type Post } from './queries';
import { UserAvatar } from './UserAvatar';

const t = m.social.post;

/** Chú thích: `@username` thành link tới hồ sơ. */
export function Caption({ text }: { text: string }) {
  const parts: ReactNode[] = text.split(/(@[a-z0-9._]{3,30})/gi).map((part, i) =>
    /^@[a-z0-9._]{3,30}$/i.test(part) ? (
      <Link
        key={i}
        to="/u/$username"
        params={{ username: part.slice(1).toLowerCase() }}
        className="text-primary font-semibold"
      >
        {part}
      </Link>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
  return <p className="text-body break-words whitespace-pre-line">{parts}</p>;
}

function EditPostDialog({ post, onClose }: { post: Post; onClose: () => void }) {
  const toast = useToast();
  const pets = useQuery(petsQuery);
  const update = useUpdatePost(post.id);
  const [caption, setCaption] = useState(post.caption ?? '');
  const [petIds, setPetIds] = useState(post.pets.map((p) => p.id));

  const save = async () => {
    try {
      await update.mutateAsync({ caption: caption.trim() || null, petIds });
      toast.show({ kind: 'success', message: t.saved });
      onClose();
    } catch (err) {
      const msg = toUserMessage(err);
      toast.show({
        kind: 'error',
        message: msg.kind === 'fields' ? Object.values(msg.fields).join(' · ') : msg.message,
      });
    }
  };

  return (
    <ResponsiveDialog open onClose={onClose} title={t.edit}>
      <div className="flex flex-col gap-4">
        <TextAreaCounter
          label={m.social.composer.caption}
          max={CAPTION_MAX}
          rows={5}
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
          }}
        />
        <PetChips pets={pets.data ?? []} value={petIds} onChange={setPetIds} />
        <Button fullWidth loading={update.isPending} onClick={() => void save()}>
          {t.save}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

function OwnerMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
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
  const item = 'text-body hover:bg-surface-2 flex min-h-11 w-full items-center gap-3 px-4';
  return (
    <div ref={ref} className="relative">
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
          className="border-divider bg-surface shadow-overlay absolute top-12 right-0 z-30 min-w-44 rounded-md border py-1"
        >
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Pencil size={18} aria-hidden />
            {t.edit}
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${item} text-danger`}
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 size={18} aria-hidden />
            {t.delete}
          </button>
        </div>
      )}
    </div>
  );
}

/** Chi tiết bài `/p/{postId}` (F-06): đầu bài, ảnh vuốt, chú thích, chip thú cưng; chủ bài sửa/xóa. */
export function PostDetailScreen({ postId }: { postId: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const post = useQuery(postQuery(postId));
  const remove = useDeletePost(postId);
  const like = useLikeAction({ id: postId });
  const side = useRef<HTMLDivElement>(null);
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null);

  if (post.isPending) {
    return (
      <div aria-busy="true" className="mx-auto flex w-full max-w-[935px] flex-col gap-3">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="aspect-square rounded-lg" />
      </div>
    );
  }
  if (post.isError) {
    if (post.error instanceof ApiError && post.error.status === 404) {
      return <EmptyState icon={<ImageOff size={32} />} title={t.notFound} />;
    }
    return <ErrorState kind="server" onRetry={() => void post.refetch()} />;
  }
  const p = post.data;

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync();
      toast.show({ kind: 'success', message: t.deleted });
      void navigate({ to: '/u/$username', params: { username: p.author.username }, replace: true });
    } catch (err) {
      const msg = toUserMessage(err);
      toast.show({ kind: 'error', message: 'message' in msg ? msg.message : m.error.serverToast });
    }
  };

  const header = (
    <div className="flex items-center gap-3">
      <Link
        to="/u/$username"
        params={{ username: p.author.username }}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <UserAvatar profile={p.author} size={40} />
        <span className="min-w-0">
          <span className="text-body block truncate font-semibold">{p.author.displayName}</span>
          <span className="text-small text-text-muted block truncate">
            @{p.author.username} · <time dateTime={p.createdAt}>{formatRelative(p.createdAt)}</time>
          </span>
        </span>
      </Link>
      {p.isMine && (
        <OwnerMenu
          onEdit={() => {
            setDialog('edit');
          }}
          onDelete={() => {
            setDialog('delete');
          }}
        />
      )}
    </div>
  );

  return (
    <article className="bg-surface shadow-card mx-auto w-full max-w-[935px] overflow-hidden rounded-lg lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
      <h1 className="sr-only">{t.titleOf(p.author.displayName)}</h1>
      <div className="p-3 lg:hidden">{header}</div>
      <PhotoCarousel
        photos={p.photos}
        onImageError={() => void queryClient.invalidateQueries({ queryKey: [...POST_KEY, postId] })}
        onDoubleTap={() => {
          if (!p.likedByMe) like(true);
        }}
      />
      <div ref={side} className="flex flex-col gap-3 p-4">
        <div className="hidden lg:block">{header}</div>
        <LikeBar
          post={p}
          onComment={() => {
            side.current?.querySelector('textarea')?.focus();
          }}
        />
        {p.pets.length > 0 && (
          <ul aria-label={t.pets} className="m-0 flex list-none flex-wrap gap-2 p-0">
            {p.pets.map((pet) => (
              <li
                key={pet.id}
                className="bg-primary-soft text-primary-soft-fg text-small inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold"
              >
                <PawPrint size={14} aria-hidden />
                {pet.name}
              </li>
            ))}
          </ul>
        )}
        {p.caption && <Caption text={p.caption} />}
        <CommentsPanel postId={p.id} />
      </div>

      {dialog === 'edit' && (
        <EditPostDialog
          post={p}
          onClose={() => {
            setDialog(null);
          }}
        />
      )}
      <ConfirmDialog
        open={dialog === 'delete'}
        title={t.deleteTitle}
        description={t.deleteBody}
        confirmLabel={t.delete}
        loading={remove.isPending}
        onConfirm={() => void confirmDelete()}
        onClose={() => {
          setDialog(null);
        }}
      />
    </article>
  );
}
