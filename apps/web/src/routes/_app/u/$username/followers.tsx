import { createFileRoute } from '@tanstack/react-router';

import { FollowListScreen } from '../../../../features/social';
import { m } from '../../../../i18n';

/** Danh sách theo dõi của hồ sơ (F-07). */
function Page() {
  const { username } = Route.useParams();
  return <FollowListScreen username={username} side="followers" />;
}

export const Route = createFileRoute('/_app/u/$username/followers')({
  staticData: { title: m.social.follow.followers },
  component: Page,
});
