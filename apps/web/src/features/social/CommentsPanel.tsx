import { newIdempotencyKey } from '@ph/api-client';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AlertCircle, MoreHorizontal, Send } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { toUserMessage } from '../../api/to-user-message';
import { m } from '../../i18n';
import { formatRelative } from '../../lib/format';
import { useOnline } from '../../lib/online';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { cx } from '../../ui/cx';
import { ErrorState } from '../../ui/ErrorState';
import { IconButton } from '../../ui/IconButton';
import { Skeleton } from '../../ui/Skeleton';
import { useToast } from '../../ui/toast';
import { useSession } from '../session';
import {
  afterCommentsChanged,
  commentsQuery,
  deleteComment,
  myProfileQuery,
  postComment,
  type Comment,
} from './queries';
import { UserAvatar } from './UserAvatar';

const t = m.social.comments;
const MAX = 500;

/** Bình luận đang gửi (lạc quan): mờ tới khi có phản hồi; lỗi → đỏ + "Thử lại". */
interface Pending {
  key: string;
  body: string;
  failed: boolean;
}

function CommentRow({
  comment,
  onDelete,
  className,
  children,
}: {
  comment: Pick<Comment, 'author' | 'body' | 'createdAt'> & { canDelete?: boolean };
  onDelete?: () => void;
  className?: string | false;
  children?: ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <li className={cx('flex flex-wrap gap-x-3 py-2', className)}>
      <Link to="/u/$username" params={{ username: comment.author.username }} className="shrink-0">
        <UserAvatar profile={comment.author} size={32} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-body break-words whitespace-pre-line">
          <Link
            to="/u/$username"
            params={{ username: comment.author.username }}
            className="mr-1 font-semibold"
          >
            {comment.author.username}
          </Link>
          {comment.body}
        </p>
        <time dateTime={comment.createdAt} className="text-caption text-text-muted">
          {formatRelative(comment.createdAt)}
        </time>
      </div>
      {comment.canDelete && onDelete && (
        <div className="relative shrink-0">
          <IconButton
            aria-label={t.menu(comment.author.username)}
            aria-haspopup="menu"
            aria-expanded={menu}
            icon={<MoreHorizontal size={18} />}
            onClick={() => {
              setMenu((v) => !v);
            }}
          />
          {menu && (
            <div
              role="menu"
              className="border-divider bg-surface shadow-overlay absolute top-11 right-0 z-30 min-w-40 rounded-md border py-1"
            >
              <button
                type="button"
                role="menuitem"
                className="text-body text-danger hover:bg-surface-2 flex min-h-11 w-full items-center px-4"
                onClick={() => {
                  setMenu(false);
                  onDelete();
                }}
              >
                {t.delete}
              </button>
            </div>
          )}
        </div>
      )}
      {children}
    </li>
  );
}

/**
 * Khối bình luận (F-10): cũ trước, "Xem thêm" tải tiếp; ô nhập dưới cùng — Enter gửi, Shift+Enter
 * xuống dòng, đếm ký tự khi còn ≤ 50. Mất mạng → nút gửi tắt, nội dung giữ nguyên.
 */
export function CommentsPanel({
  postId,
  autoFocus = false,
}: {
  postId: string;
  autoFocus?: boolean;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const comments = useInfiniteQuery(commentsQuery(postId));
  const me = useQuery(myProfileQuery);
  const { data: session } = useSession();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [deleting, setDeleting] = useState<Comment | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const send = async (item: Pending) => {
    setPending((list) => list.map((p) => (p.key === item.key ? { ...p, failed: false } : p)));
    try {
      await postComment(postId, item.body, item.key);
      afterCommentsChanged(queryClient, postId, 1);
      await queryClient.refetchQueries({ queryKey: commentsQuery(postId).queryKey });
      setPending((list) => list.filter((p) => p.key !== item.key));
    } catch (err) {
      setPending((list) => list.map((p) => (p.key === item.key ? { ...p, failed: true } : p)));
      const msg = toUserMessage(err);
      if (msg.kind !== 'retryable') {
        toast.show({
          kind: 'error',
          message: msg.kind === 'fields' ? Object.values(msg.fields).join(' · ') : msg.message,
        });
      }
    }
  };

  const submit = () => {
    const body = text.trim();
    if (!body || Array.from(body).length > MAX || !online) return;
    const item = { key: newIdempotencyKey(), body, failed: false };
    setPending((list) => [...list, item]);
    setText('');
    void send(item);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteComment(deleting.id);
      afterCommentsChanged(queryClient, postId, -1);
      toast.show({ kind: 'success', message: t.deleted });
    } catch (err) {
      const msg = toUserMessage(err);
      toast.show({ kind: 'error', message: 'message' in msg ? msg.message : m.error.serverToast });
    } finally {
      setDeleting(null);
    }
  };

  const items = comments.data?.pages.flatMap((p) => p.items) ?? [];
  const left = MAX - Array.from(text).length;
  const meAuthor = {
    username: me.data?.username ?? '',
    displayName: me.data?.displayName ?? session?.user.nickname ?? '',
    avatarThumbUrl: me.data?.avatarThumbUrl ?? null,
  };

  return (
    <section id="comments" aria-label={t.title} className="flex scroll-mt-20 flex-col gap-2">
      {comments.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : comments.isError ? (
        <ErrorState kind="server" onRetry={() => void comments.refetch()} />
      ) : items.length === 0 && pending.length === 0 ? (
        <p className="text-small text-text-muted py-2">{t.empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              onDelete={() => {
                setDeleting(c);
              }}
            />
          ))}
          {pending.map((p) => (
            <CommentRow
              key={p.key}
              className={!p.failed && 'opacity-60'}
              comment={{ author: meAuthor, body: p.body, createdAt: new Date().toISOString() }}
            >
              {p.failed && (
                <p
                  role="alert"
                  className="text-small text-danger ml-11 flex w-full items-center gap-2"
                >
                  <AlertCircle size={16} aria-hidden />
                  {t.failed}
                  <button
                    type="button"
                    className="text-primary min-h-11 font-semibold"
                    onClick={() => void send(p)}
                  >
                    {t.retry}
                  </button>
                </p>
              )}
            </CommentRow>
          ))}
        </ul>
      )}
      {comments.hasNextPage && (
        <Button
          variant="ghost"
          loading={comments.isFetchingNextPage}
          onClick={() => void comments.fetchNextPage()}
        >
          {t.more}
        </Button>
      )}

      <div className="border-divider flex items-end gap-2 border-t pt-2">
        <label htmlFor={inputId} className="sr-only">
          {t.label}
        </label>
        <textarea
          ref={inputRef}
          id={inputId}
          rows={1}
          value={text}
          placeholder={t.placeholder}
          aria-describedby={left <= 50 ? `${inputId}-left` : undefined}
          onChange={(e) => {
            setText(e.target.value);
          }}
          onKeyDown={onKeyDown}
          className="bg-surface text-body border-border max-h-32 min-h-11 flex-1 resize-none rounded-md border px-3 py-2.5"
        />
        <Button
          type="submit"
          icon={<Send size={18} />}
          aria-label={t.send}
          disabled={!text.trim() || left < 0}
          onClick={submit}
          className="shrink-0 px-3"
        />
      </div>
      {left <= 50 && (
        <p
          id={`${inputId}-left`}
          aria-live="polite"
          className={cx('text-caption', left < 0 ? 'text-danger' : 'text-text-muted')}
        >
          {t.left(left)}
        </p>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title={t.deleteTitle}
        confirmLabel={t.delete}
        onConfirm={() => void confirmDelete()}
        onClose={() => {
          setDeleting(null);
        }}
      />
    </section>
  );
}
