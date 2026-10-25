import { createFileRoute } from '@tanstack/react-router';

import { DashboardScreen } from '../../features/dashboard';
import { useSession } from '../../features/session';
import { todayIn } from '../../features/weights';
import { m } from '../../i18n';

/**
 * SCR-06 Dashboard: màn hình đầu tiên sau đăng nhập (FR-DSH-001). Không có loader: `useQuery` trong
 * màn hình là nơi duy nhất gọi `GET /dashboard` (1 request), skeleton giữ chỗ trong lúc chờ.
 */
function Home() {
  const { data: session } = useSession();
  return (
    <>
      <h1 className="sr-only">{m.nav.home}</h1>
      <DashboardScreen timezoneToday={todayIn(session?.user.timezone)} />
    </>
  );
}

export const Route = createFileRoute('/_app/')({
  staticData: { title: m.nav.home },
  component: Home,
});
