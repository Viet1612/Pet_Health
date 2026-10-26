import { createFileRoute, redirect } from '@tanstack/react-router';

import { myProfileQuery, ProfileScreen } from '../../../features/social';
import { m } from '../../../i18n';

/** Hồ sơ công khai theo username (F-02). */
function ProfilePage() {
  const { username } = Route.useParams();
  return <ProfileScreen username={username} />;
}

export const Route = createFileRoute('/_app/u/$username')({
  // `/u/me` (mục "Hồ sơ" trên thanh điều hướng): về hồ sơ của mình, chưa có thì sang Bản tin để
  // tạo. "me" là username cấm nên không trùng người dùng thật.
  beforeLoad: async ({ params, context }) => {
    if (params.username !== 'me') return;
    const mine = await context.queryClient.query(myProfileQuery);
    if (!mine) return redirect({ to: '/feed', replace: true, throw: true });
    redirect({
      to: '/u/$username',
      params: { username: mine.username },
      replace: true,
      throw: true,
    });
  },
  staticData: { title: m.social.profileTitle },
  component: ProfilePage,
});
