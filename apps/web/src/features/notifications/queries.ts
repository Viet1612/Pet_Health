import type { paths } from '@ph/api-client';
import {
  infiniteQueryOptions,
  queryOptions,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import { api, unwrap } from '../../api/client';

export type NotificationSummary =
  paths['/notifications/summary']['get']['responses'][200]['content']['application/json'];
export type NotificationPage =
  paths['/notifications']['get']['responses'][200]['content']['application/json'];
export type AppNotification = NotificationPage['items'][number];

export const SUMMARY_KEY = ['notifications', 'summary'] as const;
export const LIST_KEY = ['notifications', 'list'] as const;

/** Chuông (CMP-07): lấy khi mở app, đổi route, quay lại tab, sau mỗi thao tác. Không polling. */
export const summaryQuery = queryOptions({
  queryKey: SUMMARY_KEY,
  queryFn: async (): Promise<NotificationSummary> =>
    unwrap(await api.GET('/notifications/summary', { params: { query: { pet: 'all' } } })),
  staleTime: 0,
  refetchOnWindowFocus: true,
});

export const listQuery = infiniteQueryOptions({
  queryKey: LIST_KEY,
  queryFn: async ({ pageParam }): Promise<NotificationPage> =>
    unwrap(
      await api.GET('/notifications', {
        params: { query: { limit: 20, ...(pageParam ? { cursor: pageParam } : {}) } },
      }),
    ),
  initialPageParam: null as string | null,
  getNextPageParam: (last) => last.nextCursor,
  staleTime: 0,
});

type ListData = InfiniteData<NotificationPage, string | null>;

/**
 * Đánh dấu đã xem với cập nhật lạc quan: tắt `unread` trong danh sách và giảm số trên chuông,
 * lỗi thì hoàn lại. `ids = 'all'` → read-all theo `fetchedAt` của trang đầu.
 */
export function useMarkRead() {
  const queryClient = useQueryClient();

  return async (target: { ids: string[] } | { all: true; upTo: string }): Promise<void> => {
    const prevList = queryClient.getQueryData<ListData>(LIST_KEY);
    const prevSummary = queryClient.getQueryData<NotificationSummary>(SUMMARY_KEY);
    const affected = 'all' in target ? null : new Set(target.ids);
    let cleared = 0;
    if (prevList) {
      queryClient.setQueryData<ListData>(LIST_KEY, {
        ...prevList,
        pages: prevList.pages.map((p) => ({
          ...p,
          items: p.items.map((n) => {
            if (!n.unread || (affected && !affected.has(n.id))) return n;
            cleared += 1;
            return { ...n, unread: false };
          }),
        })),
      });
    }
    if (prevSummary) {
      queryClient.setQueryData<NotificationSummary>(SUMMARY_KEY, {
        unreadCount: affected ? Math.max(0, prevSummary.unreadCount - cleared) : 0,
      });
    }
    try {
      const { unreadCount } = unwrap(
        'all' in target
          ? await api.POST('/notifications/read-all', { body: { upTo: target.upTo } })
          : await api.POST('/notifications/read', { body: { ids: target.ids, reason: 'USER' } }),
      );
      queryClient.setQueryData<NotificationSummary>(SUMMARY_KEY, (s) =>
        s ? { ...s, unreadCount } : { unreadCount },
      );
    } catch (err) {
      if (prevList) queryClient.setQueryData(LIST_KEY, prevList);
      if (prevSummary) queryClient.setQueryData(SUMMARY_KEY, prevSummary);
      throw err;
    }
  };
}
