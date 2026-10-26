import { useQuery } from '@tanstack/react-query';
import { Heart, MessageCircle } from 'lucide-react';
import { useState } from 'react';

import { m } from '../../i18n';
import { cx } from '../../ui/cx';
import { ErrorState } from '../../ui/ErrorState';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { Skeleton } from '../../ui/Skeleton';
import { useToast } from '../../ui/toast';
import { PeopleList } from './PeopleList';
import { likersQuery, useToggleLike, type Post } from './queries';

const t = m.social;

function LikersDialog({ postId, onClose }: { postId: string; onClose: () => void }) {
  const likers = useQuery(likersQuery(postId));
  return (
    <ResponsiveDialog open onClose={onClose} title={t.like.likers}>
      {likers.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : likers.isError ? (
        <ErrorState kind="server" onRetry={() => void likers.refetch()} />
      ) : (
        <PeopleList people={likers.data} />
      )}
    </ResponsiveDialog>
  );
}

/** Thả tim lạc quan; lỗi → toast "Không lưu được" (cache đã được hoàn lại trong hook). */
export function useLikeAction(post: Pick<Post, 'id'>) {
  const toast = useToast();
  const toggle = useToggleLike(post.id);
  return (like: boolean) => {
    toggle.mutate(like, {
      onError: () => {
        toast.show({ kind: 'error', message: t.like.failed });
      },
    });
  };
}

/**
 * Hàng ♥ 💬 dưới ảnh (F-10): ♥ có `aria-pressed` và nhãn "Thích, 12 lượt thích"; số tim chạm được →
 * danh sách người thích; 💬 mở bình luận.
 */
export function LikeBar({ post, onComment }: { post: Post; onComment: () => void }) {
  const like = useLikeAction(post);
  const [showLikers, setShowLikers] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <div className="-ml-2 flex items-center">
        <button
          type="button"
          aria-pressed={post.likedByMe}
          aria-label={t.like.label(post.likedByMe, post.likeCount)}
          onClick={() => {
            like(!post.likedByMe);
          }}
          className="hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-full"
        >
          <Heart
            size={26}
            aria-hidden
            className={cx(
              'motion-safe:transition-transform',
              post.likedByMe ? 'fill-danger text-danger motion-safe:scale-110' : 'text-text',
            )}
          />
        </button>
        <button
          type="button"
          aria-label={t.comments.open}
          onClick={onComment}
          className="hover:bg-surface-2 inline-flex size-11 items-center justify-center rounded-full"
        >
          <MessageCircle size={26} aria-hidden />
        </button>
      </div>
      {post.likeCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setShowLikers(true);
          }}
          className="text-small min-h-11 self-start font-semibold"
        >
          {t.feed.likes(post.likeCount)}
        </button>
      )}
      {showLikers && (
        <LikersDialog
          postId={post.id}
          onClose={() => {
            setShowLikers(false);
          }}
        />
      )}
    </div>
  );
}
