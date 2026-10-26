import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { PawPrint } from 'lucide-react';
import { useState } from 'react';

import { m } from '../../i18n';
import { formatRelative } from '../../lib/format';
import { cx } from '../../ui/cx';
import { ResponsiveDialog } from '../../ui/ResponsiveDialog';
import { CommentsPanel } from './CommentsPanel';
import { LikeBar, useLikeAction } from './LikeBar';
import { PhotoCarousel } from './PhotoCarousel';
import { Caption } from './PostDetailScreen';
import { FEED_KEY, type Post } from './queries';
import { UserAvatar } from './UserAvatar';

const t = m.social.feed;

/**
 * Thẻ bài trên bản tin (F-08): đầu bài, ảnh vuốt (khung vuông cố định, không giật), chip thú cưng,
 * chú thích rút gọn 2 dòng + "xem thêm"; ♥ / nhấn đúp ảnh để thích, 💬 mở sheet bình luận (F-10).
 */
export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const like = useLikeAction(post);
  const [expanded, setExpanded] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const openComments = () => {
    setCommenting(true);
  };
  const long = (post.caption?.length ?? 0) > 120 || (post.caption?.split('\n').length ?? 0) > 2;

  return (
    <article
      aria-label={m.social.post.titleOf(post.author.displayName)}
      className="bg-surface shadow-card overflow-hidden rounded-lg"
    >
      <div className="flex items-center gap-3 p-3">
        <Link
          to="/u/$username"
          params={{ username: post.author.username }}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3"
        >
          <UserAvatar profile={post.author} size={40} />
          <span className="min-w-0">
            <span className="text-body block truncate font-semibold">
              {post.author.displayName}
            </span>
            <span className="text-small text-text-muted block truncate">
              @{post.author.username} ·{' '}
              <time dateTime={post.createdAt}>{formatRelative(post.createdAt)}</time>
            </span>
          </span>
        </Link>
      </div>
      <PhotoCarousel
        photos={post.photos}
        onImageError={() => void queryClient.invalidateQueries({ queryKey: FEED_KEY })}
        onDoubleTap={() => {
          if (!post.likedByMe) like(true);
        }}
      />
      <div className="flex flex-col gap-2 px-3 pt-1 pb-3">
        <LikeBar post={post} onComment={openComments} />
        {post.pets.length > 0 && (
          <ul aria-label={m.social.post.pets} className="m-0 flex list-none flex-wrap gap-2 p-0">
            {post.pets.map((pet) => (
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
        {post.caption && (
          <div>
            <div className={cx(!expanded && long && 'line-clamp-2')}>
              <Caption text={post.caption} />
            </div>
            {long && !expanded && (
              <button
                type="button"
                className="text-small text-text-muted min-h-11 font-semibold"
                onClick={() => {
                  setExpanded(true);
                }}
              >
                {t.more}
              </button>
            )}
          </div>
        )}
        {post.commentCount > 0 && (
          <button
            type="button"
            onClick={openComments}
            className="text-small text-text-muted inline-flex min-h-11 items-center self-start"
          >
            {t.comments(post.commentCount)}
          </button>
        )}
      </div>
      {commenting && (
        <ResponsiveDialog
          open
          onClose={() => {
            setCommenting(false);
          }}
          title={m.social.comments.title}
        >
          <CommentsPanel postId={post.id} autoFocus />
        </ResponsiveDialog>
      )}
    </article>
  );
}
