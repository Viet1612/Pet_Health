import { createFileRoute } from '@tanstack/react-router';

import { PostDetailScreen } from '../../../features/social';
import { m } from '../../../i18n';

/** Chi tiết bài (F-06). */
function PostPage() {
  const { postId } = Route.useParams();
  return <PostDetailScreen postId={postId} />;
}

export const Route = createFileRoute('/_app/p/$postId')({
  staticData: { title: m.social.feedTitle },
  component: PostPage,
});
