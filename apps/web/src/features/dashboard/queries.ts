import type { paths } from '@ph/api-client';
import { queryOptions } from '@tanstack/react-query';

import { api, unwrap } from '../../api/client';
import type { DashboardFilter } from '../../lib/dashboard-filter';

export type DashboardData =
  paths['/dashboard']['get']['responses'][200]['content']['application/json'];
export type DashboardBanner = NonNullable<DashboardData['notifications']['banner']>;
export type DashboardMilestone = DashboardData['upcomingMilestones'][number];
export type DashboardWeight = NonNullable<DashboardData['weight']>;
export type DashboardWeightRow = NonNullable<DashboardData['weights']>[number];

export const dashboardKey = (filter: DashboardFilter) => ['dashboard', filter] as const;

/**
 * Toàn bộ SCR-06 trong 1 request (FR-DSH-001). Lấy mới khi mở màn hình hoặc quay lại tab;
 * `staleTime` 5 s để sự kiện focus ngay lúc tải trang không gọi thêm lần nữa. Thao tác ghi
 * invalidate `['dashboard']` nên không phải chờ hết 5 s.
 */
export const dashboardQuery = (filter: DashboardFilter) =>
  queryOptions({
    queryKey: dashboardKey(filter),
    queryFn: async (): Promise<DashboardData> =>
      unwrap(await api.GET('/dashboard', { params: { query: { pet: filter } } })),
    staleTime: 5_000,
    // Giữ dữ liệu từng bộ lọc 10 phút: quay lại thú cưng vừa xem hiện ngay rồi làm mới ngầm.
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
  });
