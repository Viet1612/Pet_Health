import { createFileRoute } from '@tanstack/react-router';

import { ProfileScreen } from '../../../features/social';
import { m } from '../../../i18n';

/** Hồ sơ công khai theo username (F-02). */
function ProfilePage() {
  const { username } = Route.useParams();
  return <ProfileScreen username={username} />;
}

export const Route = createFileRoute('/_app/u/$username')({
  staticData: { title: m.social.profileTitle },
  component: ProfilePage,
});
